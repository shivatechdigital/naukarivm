import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Job, Profile, JobPreference } from '@prisma/client';

export interface EvaluationResult {
  jobId: string;
  matchScore: number;
  matchReasons: string[];
  isEligible: boolean;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════
  // EVALUATE ALL UNPROCESSED JOBS FOR A USER
  // ══════════════════════════════════════════════════
  async evaluateJobsForUser(userId: string) {
    this.logger.log(`Starting job matching evaluation for user: ${userId}`);

    // 1. Fetch User Profile and Preferences
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    const preferences = await this.prisma.jobPreference.findUnique({
      where: { userId },
    });

    if (!preferences && !profile) {
      this.logger.warn(`User ${userId} has no profile or preferences set.`);
      return { message: 'Pehle profile aur preferences setup karo', evaluatedCount: 0, matchedCount: 0 };
    }

    const threshold = preferences?.matchScoreThreshold ?? 60;

    // 2. Fetch un-applied jobs
    const existingApps = await this.prisma.application.findMany({
      where: { userId },
      select: { jobId: true },
    });

    const appliedJobIds = new Set(existingApps.map((a: { jobId: string }) => a.jobId));

    const jobs = await this.prisma.job.findMany({
      where: {
        isExpired: false,
        id: { notIn: Array.from(appliedJobIds) },
      },
      take: 100, // Evaluate latest 100 un-applied jobs
      orderBy: { scrapedAt: 'desc' },
    });

    this.logger.log(`Evaluating ${jobs.length} candidate jobs for user ${userId}`);

    let matchedCount = 0;
    const results: EvaluationResult[] = [];

    for (const job of jobs) {
      const evaluation = this.calculateMatchScore(job, profile, preferences, threshold);
      results.push(evaluation);

      // Create Application record if eligible
      if (evaluation.isEligible) {
        matchedCount++;
        await this.prisma.application.upsert({
          where: {
            userId_jobId: { userId, jobId: job.id },
          },
          update: {
            matchScore: evaluation.matchScore,
            matchReasons: evaluation.matchReasons,
          },
          create: {
            userId,
            jobId: job.id,
            status: "PENDING",
            matchScore: evaluation.matchScore,
            matchReasons: evaluation.matchReasons,
          },
        });
      }
    }

    this.logger.log(`Evaluation finished: ${matchedCount} jobs qualified above threshold (${threshold}%)`);

    return {
      message: `Matching complete! ${matchedCount} eligible jobs found. 🎉`,
      threshold,
      evaluatedCount: jobs.length,
      matchedCount,
      topMatches: results
        .filter((r) => r.isEligible)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10),
    };
  }

  // ══════════════════════════════════════════════════
  // SCORING ALGORITHM LOGIC
  // ══════════════════════════════════════════════════
  calculateMatchScore(
    job: Job,
    profile: Profile | null,
    preferences: JobPreference | null,
    threshold: number,
  ): EvaluationResult {
    let score = 0;
    const reasons: string[] = [];

    // ─── 1. SKILLS MATCH (40 Points) ───
    const userSkills = new Set(
      (profile?.skills || []).map((s) => s.toLowerCase().trim()),
    );
    const jobSkills = (job.skills || []).map((s) => s.toLowerCase().trim());

    if (userSkills.size > 0 && jobSkills.length > 0) {
      let matchedSkillCount = 0;
      const matchedSkillNames: string[] = [];

      for (const skill of jobSkills) {
        if (userSkills.has(skill) || Array.from(userSkills).some((us) => skill.includes(us) || us.includes(skill))) {
          matchedSkillCount++;
          matchedSkillNames.push(skill);
        }
      }

      const matchRatio = matchedSkillCount / Math.min(jobSkills.length, 8);
      const skillScore = Math.min(40, Math.round(matchRatio * 40));
      score += skillScore;

      if (skillScore > 0) {
        reasons.push(`Skills match: ${matchedSkillNames.slice(0, 4).join(', ')} (+${skillScore} pts)`);
      }
    } else {
      // Default baseline skill points if job has no tag array
      score += 20;
      reasons.push('General technical match (+20 pts)');
    }

    // ─── 2. EXPERIENCE MATCH (20 Points) ───
    const userExp = profile?.experienceYears ?? preferences?.experienceMin ?? 3;
    const jobExpMin = job.experienceMin ?? 0;
    const jobExpMax = job.experienceMax ?? 10;

    if (userExp >= jobExpMin && userExp <= jobExpMax + 1) {
      score += 20;
      reasons.push(`Experience suitable: ${userExp} yrs fits (${job.experience || 'range'}) (+20 pts)`);
    } else if (userExp >= jobExpMin - 1) {
      score += 10;
      reasons.push(`Experience close match (+10 pts)`);
    }

    // ─── 3. SALARY MATCH (15 Points) ───
    const expectedSalary = profile?.expectedCtc ?? preferences?.salaryMin;
    const jobSalMax = job.salaryMax;

    if (!jobSalMax || job.salary?.toLowerCase().includes('not disclosed')) {
      score += 10; // Don't penalize undisclosed salary
      reasons.push('Salary not disclosed (+10 pts)');
    } else if (expectedSalary && jobSalMax >= expectedSalary) {
      score += 15;
      reasons.push(`Salary fits expectation (+15 pts)`);
    } else {
      score += 5;
    }

    // ─── 4. LOCATION MATCH (10 Points) ───
    const preferredCities = (profile?.preferredCities || preferences?.locations || ['remote'])
      .map((c) => c.toLowerCase().trim());

    const jobLocation = (job.location || '').toLowerCase();

    const isLocationMatched =
      jobLocation.includes('remote') ||
      preferredCities.some((city) => city && (jobLocation.includes(city) || city.includes(jobLocation)));

    if (isLocationMatched) {
      score += 10;
      reasons.push(`Location matched: ${job.location} (+10 pts)`);
    } else {
      score += 5; // Default for India
    }

    // ─── 5. TITLE / KEYWORD MATCH (15 Points) ───
    const targetTitles = (preferences?.jobTitles || ['devops', 'engineer', 'developer'])
      .map((t) => t.toLowerCase().trim());

    const jobTitle = job.title.toLowerCase();

    const isTitleMatch = targetTitles.some((t) => t && jobTitle.includes(t));

    if (isTitleMatch) {
      score += 15;
      reasons.push(`Job title matches preferences (+15 pts)`);
    } else {
      score += 5;
    }

    // Cap score at 100
    const finalScore = Math.min(100, Math.max(0, score));

    return {
      jobId: job.id,
      matchScore: finalScore,
      matchReasons: reasons,
      isEligible: finalScore >= threshold,
    };
  }
}
