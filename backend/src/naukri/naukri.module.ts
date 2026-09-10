import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { NaukriController } from './naukri.controller';
import { NaukriService } from './naukri.service';
import { EncryptionService } from './encryption.service';
import { BrowserManager } from '../automation/playwright/browser.manager';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [NaukriController],

  providers: [
    NaukriService,
    EncryptionService,
    BrowserManager,
    PrismaService,
  ],

  exports: [NaukriService],
})
export class NaukriModule {}
