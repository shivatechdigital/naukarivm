import { Module } from '@nestjs/common';

import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    PrismaService,
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
