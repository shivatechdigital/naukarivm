import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

import { PrismaService } from '../prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { MatchingService } from '../jobs/matching.service';
import { ApplicationsService } from '../applications/applications.service';

export interface AutomationJobData {
  userId: string;
  triggeredBy: 'CRON' | 'MANUAL';
}

@Processor('automation')
export class AutomationProcessor {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
    private matchingService: MatchingService,
    private applicationsService: ApplicationsService,
  ) {}

  @Process('run-automation-cycle')
  async handleAutomationCycle(job: Job<AutomationJobData>) {
    const { userId, triggeredBy } = job.data;
    const startTime = new Date();

    this.logger.log(
      `🚀 [Worker Job ${job.id}] Starting full automation cycle for user ${userId} (Trigger: ${triggeredBy})`,
    );

    const log = await this.prisma.automationLog.create({
      data: {
        userId,
        action: 'FULL_CYCLE',
        status: 'ACTIVE',
        message: `Automation cycle started (${triggeredBy})`,
        startedAt: startTime,
      },
    });

    try {
      this.logger.log(
        `[Worker Job ${job.id}] Step 1/3: Scraping fresh jobs...`,
      );

      const scrapeRes = await this.jobsService.scrapeForUser(userId, {
        maxPagesPerQuery: 1,
      });

      this.logger.log(
        `[Worker Job ${job.id}] Step 2/3: Calculating match scores...`,
      );

      const matchRes =
        await this.matchingService.evaluateJobsForUser(userId);

      this.logger.log(
        `[Worker Job ${job.id}] Step 3/3: Auto-applying to top matched jobs...`,
      );

      const applyRes =
        await this.applicationsService.processPendingApplications(
          userId,
          5,
        );

      const completedAt = new Date();
      const durationMs =
        completedAt.getTime() - startTime.getTime();

      const summaryMessage = `Cycle complete in ${Math.round(
        durationMs / 1000,
      )}s! Scraped: ${scrapeRes.jobsFound}, Matched: ${
        matchRes.matchedCount
      }, Applied: ${applyRes.appliedCount}, Skipped: ${
        applyRes.skippedCount
      }, Failed: ${applyRes.failedCount}`;

      await this.prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'ACTIVE',
          message: summaryMessage,
          jobsFound: scrapeRes.jobsFound,
          jobsMatched: matchRes.matchedCount,
          jobsApplied: applyRes.appliedCount,
          jobsSkipped: applyRes.skippedCount,
          jobsFailed: applyRes.failedCount,
          completedAt,
          durationMs,
        },
      });

      this.logger.log(
        `✅ [Worker Job ${job.id}] ${summaryMessage}`,
      );

      return {
        success: true,
        durationMs,
        scrapeRes,
        matchRes,
        applyRes,
      };
    } catch (err: any) {
      const completedAt = new Date();
      const durationMs =
        completedAt.getTime() - startTime.getTime();

      this.logger.error(
        `❌ [Worker Job ${job.id}] Automation cycle failed: ${
          err?.message || err
        }`,
      );

      await this.prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'STOPPED',
          message: `Cycle failed: ${err?.message || err}`,
          completedAt,
          durationMs,
        },
      });

      throw err;
    }
  }
}
