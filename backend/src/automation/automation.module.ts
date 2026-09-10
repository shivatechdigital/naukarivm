import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AutomationScheduler } from './automation.scheduler';
import { AutomationProcessor } from './automation.processor';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { JobsModule } from '../jobs/jobs.module';
import { ApplicationsModule } from '../applications/applications.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'automation',
    }),
    JobsModule,
    ApplicationsModule,
    AuthModule,
  ],
  controllers: [AutomationController],
  providers: [PrismaService, AutomationScheduler, AutomationProcessor, AutomationService],

  exports: [AutomationService],
})
export class AutomationModule {}
