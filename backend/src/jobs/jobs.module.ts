import { Module } from '@nestjs/common';

import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { NaukriScraperService } from './naukri-scraper.service';
import { MatchingService } from './matching.service';

import { NaukriModule } from '../naukri/naukri.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { BrowserManager } from '../automation/playwright/browser.manager';

@Module({
  imports: [
    AuthModule,
    NaukriModule,
  ],
  controllers: [
    JobsController,
  ],
  providers: [
    PrismaService,
    BrowserManager,
    JobsService,
    NaukriScraperService,
    MatchingService,
  ],
  exports: [
    JobsService,
    NaukriScraperService,
    MatchingService,
  ],
})
export class JobsModule {}
