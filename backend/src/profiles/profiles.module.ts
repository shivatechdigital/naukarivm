import { Module } from '@nestjs/common';

import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    PrismaService,
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
