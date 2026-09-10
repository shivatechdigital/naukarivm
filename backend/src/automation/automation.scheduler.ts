import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { PrismaService } from '../prisma.service';
import type { AutomationJobData } from './automation.processor';

@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('automation')
    private automationQueue: Queue<AutomationJobData>,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleScheduledAutomation() {
    this.logger.log(
      '⏰ Cron Scheduler triggered: Checking active users for automation...',
    );

    const activeUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        preferences: {
          isActive: true,
        },
        naukriSession: {
          isValid: true,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    this.logger.log(
      `Found ${activeUsers.length} active users for scheduled background run.`,
    );

    for (const user of activeUsers) {
      await this.automationQueue.add(
        'run-automation-cycle',
        {
          userId: user.id,
          triggeredBy: 'CRON',
        },
        {
          attempts: 2,
          backoff: 60000,
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      );

      this.logger.log(
        `Enqueued background job for user: ${user.email}`,
      );
    }
  }
}
