import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { PrismaService } from '../prisma.service';
import type { AutomationJobData } from './automation.processor';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('automation')
    private automationQueue: Queue<AutomationJobData>,
  ) {}

  async triggerManualCycle(userId: string) {
    const naukriSession =
      await this.prisma.naukriSession.findUnique({
        where: { userId },
      });

    if (!naukriSession || !naukriSession.isValid) {
      throw new BadRequestException(
        'Pehle Naukri connect karo, session valid nahi hai.',
      );
    }

    const job = await this.automationQueue.add(
      'run-automation-cycle',
      {
        userId,
        triggeredBy: 'MANUAL',
      },
      {
        attempts: 1,
        removeOnComplete: 10,
      },
    );

    this.logger.log(
      `Manual automation job enqueued for user ${userId}. Bull Job ID: ${job.id}`,
    );

    return {
      message:
        'Automation cycle background queue me add ho gaya! 🚀',
      queueJobId: job.id,
      status: 'QUEUED',
    };
  }

  async getUserLogs(
    userId: string,
    limit: number = 10,
  ) {
    return this.prisma.automationLog.findMany({
      where: { userId },
      take: limit,
      orderBy: {
        startedAt: 'desc',
      },
    });
  }
}
