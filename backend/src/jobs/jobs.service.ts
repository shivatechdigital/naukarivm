import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NaukriScraperService, ScrapedJobItem } from './naukri-scraper.service';
import { FilterJobsDto } from './dto/filter-jobs.dto';
import { TriggerScrapeDto } from './dto/trigger-scrape.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private scraper: NaukriScraperService,
  ) {}

  // ══════════════════════════════════════════════════
  // TRIGGER SCRAPE FOR SIMPLE KEYWORD ("devops")
  // ══════════════════════════════════════════════════
  async scrapeForUser(userId: string, dto?: TriggerScrapeDto) {
    const preferences = await this.prisma.jobPreference.findUnique({
      where: { userId },
    });

    // Simple keyword setup: Agar custom handle bheja toh wahi, nahi toh preference ka pehla, otherwise "devops"
    const keywords =
      dto?.customKeywords && dto.customKeywords.length > 0
        ? dto.customKeywords
        : preferences?.jobTitles && preferences.jobTitles.length > 0
        ? preferences.jobTitles
        : ['devops'];

    // Location koi compulsory nahi: Agar empty pass kiya toh poora India search karega
    const locations =
      dto?.customLocations && dto.customLocations.length > 0
        ? dto.customLocations
        : preferences?.locations && preferences.locations.length > 0
        ? preferences.locations
        : [''];

    const maxPages = dto?.maxPagesPerQuery || 1;
    const startTime = new Date();

    let totalScraped = 0;
    let totalSaved = 0;

    const log = await this.prisma.automationLog.create({
      data: {
        userId,
        action: 'SCRAPE',
        message: `Scraping started for keyword: ${keywords.join(', ')}`,
        startedAt: startTime,
      },
    });

    try {
      for (const keyword of keywords) {
        for (const loc of locations) {
          const scrapedItems = await this.scraper.scrapeByQuery(
            userId,
            keyword,
            loc,
            preferences?.experienceMin,
            maxPages,
          );

          totalScraped += scrapedItems.length;

          // Exclusions check
          const preferenceFilteredItems = scrapedItems.filter((item) => {
            const min = item.experienceMin ?? 0;
            const max = item.experienceMax ?? Number.POSITIVE_INFINITY;
            const matchesExperience =
              (preferences?.experienceMin === null || preferences?.experienceMin === undefined || max >= preferences.experienceMin) &&
              (preferences?.experienceMax === null || preferences?.experienceMax === undefined || min <= preferences.experienceMax);
            const matchesLocation =
              !preferences?.locations?.length ||
              preferences.locations.some((location) =>
                (item.location || '').toLowerCase().includes(location.toLowerCase()),
              );
            return matchesExperience && matchesLocation;
          });

          const filteredItems = this.applyExclusions(
            preferenceFilteredItems,
            preferences?.excludedCompanies || [],
            preferences?.excludedKeywords || [],
          );

          const savedCount = await this.saveScrapedJobs(filteredItems, userId);
          totalSaved += savedCount;
        }
      }

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startTime.getTime();

      await this.prisma.automationLog.update({
        where: { id: log.id },
        data: {
          jobsFound: totalScraped,
          jobsMatched: totalSaved,
          completedAt,
          durationMs,
          message: `Scrape completed: ${totalScraped} jobs found, ${totalSaved} saved`,
        },
      });

      return {
        message: 'DevOps Jobs Scraping complete! 🚀',
        jobsFound: totalScraped,
        jobsSaved: totalSaved,
        durationSeconds: Math.round(durationMs / 1000),
      };
    } catch (err: any) {
      await this.prisma.automationLog.update({
        where: { id: log.id },
        data: {
          completedAt: new Date(),
          jobsFailed: 1,
          message: `Scraping failed: ${err.message}`,
        },
      });
      throw err;
    }
  }

  private async saveScrapedJobs(items: ScrapedJobItem[], userId?: string): Promise<number> {
    let saved = 0;

    for (const item of items) {
      if (!item.url && !item.naukriJobId) continue;

      try {
        await this.prisma.job.upsert({
          where: item.naukriJobId
            ? { naukriJobId: item.naukriJobId }
            : { url: item.url },
          update: {
            title: item.title,
            company: item.company,
            companyRating: item.companyRating,
            companyReviews: item.companyReviews,
            location: item.location,
            experience: item.experience,
            experienceMin: item.experienceMin,
            experienceMax: item.experienceMax,
            salary: item.salary,
            salaryMin: item.salaryMin,
            salaryMax: item.salaryMax,
            description: item.description,
            skills: item.skills,
            isEasyApply: item.isEasyApply,
            scrapedAt: new Date(),
            userId,
          },
          create: {
            naukriJobId: item.naukriJobId || undefined,
            title: item.title,
            company: item.company,
            companyRating: item.companyRating,
            companyReviews: item.companyReviews,
            location: item.location,
            experience: item.experience,
            experienceMin: item.experienceMin,
            experienceMax: item.experienceMax,
            salary: item.salary,
            salaryMin: item.salaryMin,
            salaryMax: item.salaryMax,
            description: item.description,
            skills: item.skills,
            url: item.url,
            isEasyApply: item.isEasyApply,
            postedDate: item.postedDate,
            userId,
          },
        });
        saved++;
      } catch (e) {
        // Skip on duplicate key collision
      }
    }

    return saved;
  }

  private applyExclusions(
    jobs: ScrapedJobItem[],
    excludedCompanies: string[],
    excludedKeywords: string[],
  ): ScrapedJobItem[] {
    const lowExCompanies = excludedCompanies.map((c) => c.toLowerCase().trim());
    const lowExKeywords = excludedKeywords.map((k) => k.toLowerCase().trim());

    return jobs.filter((job) => {
      const compLower = job.company.toLowerCase();
      const titleLower = job.title.toLowerCase();

      if (lowExCompanies.some((c) => c && compLower.includes(c))) return false;
      if (lowExKeywords.some((k) => k && titleLower.includes(k))) return false;

      return true;
    });
  }

  async findAll(userId: string, dto: FilterJobsDto) {
    const { page, limit, search, location } = dto;
    const skip = (page - 1) * limit;
    const preferences = await this.prisma.jobPreference.findUnique({
      where: { userId },
    });

    // Hide only successfully processed jobs so failed/skipped jobs remain retryable.
    const processedApplications = await this.prisma.application.findMany({
      where: {
        userId,
        status: {
          in: ['APPLIED', 'ALREADY_APPLIED'],
        },
      },
      select: {
        jobId: true,
      },
    });

    const processedJobIds = processedApplications.map(
      (application) => application.jobId,
    );

    const where: any = {
      userId,
      isExpired: false,
      ...(processedJobIds.length > 0
        ? { id: { notIn: processedJobIds } }
        : {}),
    };

    where.AND = [];
    if (preferences?.experienceMin !== null && preferences?.experienceMin !== undefined) {
      where.AND.push({ experienceMax: { gte: preferences.experienceMin } });
    }
    if (preferences?.experienceMax !== null && preferences?.experienceMax !== undefined) {
      where.AND.push({ experienceMin: { lte: preferences.experienceMax } });
    }
    if (preferences?.locations?.length) {
      where.AND.push({
        OR: preferences.locations.map((preferredLocation) => ({
          location: { contains: preferredLocation, mode: 'insensitive' },
        })),
      });
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { skills: { hasSome: [search] } },
      ];
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),

      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { postedDate: 'desc' },
          { scrapedAt: 'desc' },
        ],
      }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) throw new NotFoundException('Job nahi mila');
    return job;
  }
}
