import { Module } from '@nestjs/common';

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { NaukriApplyService } from './naukri-apply.service';

import { PrismaService } from '../prisma.service';
import { NaukriModule } from '../naukri/naukri.module';
import { AuthModule } from '../auth/auth.module';
import { BrowserManager } from '../automation/playwright/browser.manager';

@Module({
  imports: [
    AuthModule,
    NaukriModule,
  ],
  controllers: [
    ApplicationsController,
  ],
  providers: [
    PrismaService,
    ApplicationsService,
    NaukriApplyService,
    BrowserManager,
  ],
  exports: [
    ApplicationsService,
    NaukriApplyService,
    BrowserManager,
  ],
})
export class ApplicationsModule {}
