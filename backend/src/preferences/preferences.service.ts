import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Injectable()
export class PreferencesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    userId: string,
    dto: CreatePreferenceDto,
  ) {
    const existing =
      await this.prisma.jobPreference.findUnique({
        where: { userId },
      });

    if (existing) {
      throw new ConflictException(
        'Preferences pehle se set hain. Update karo.',
      );
    }

    const preference =
      await this.prisma.jobPreference.create({
        data: {
          userId,
          ...dto,
        },
      });

    return {
      message:
        'Job preferences set ho gayi! 🎯',
      preference:
        this.formatPreference(preference),
    };
  }

  async findOne(userId: string) {
    const preference =
      await this.prisma.jobPreference.findUnique({
        where: { userId },
      });

    if (!preference) {
      throw new NotFoundException(
        'Preferences nahi mili. Pehle set karo.',
      );
    }

    return {
      preference:
        this.formatPreference(preference),
    };
  }

  async update(
    userId: string,
    dto: UpdatePreferenceDto,
  ) {
    const existing =
      await this.prisma.jobPreference.findUnique({
        where: { userId },
      });

    if (!existing) {
      throw new NotFoundException(
        'Preferences nahi mili. Pehle create karo.',
      );
    }

    const preference =
      await this.prisma.jobPreference.update({
        where: { userId },
        data: {
          ...dto,
        },
      });

    return {
      message:
        'Preferences update ho gayi! ✅',
      preference:
        this.formatPreference(preference),
    };
  }

  async toggleAutomation(userId: string) {
    const existing =
      await this.prisma.jobPreference.findUnique({
        where: { userId },
      });

    if (!existing) {
      throw new NotFoundException(
        'Preferences nahi mili.',
      );
    }

    const preference =
      await this.prisma.jobPreference.update({
        where: { userId },
        data: {
          isActive: !existing.isActive,
        },
      });

    const status =
      preference.isActive
        ? 'ACTIVE 🟢'
        : 'PAUSED 🔴';

    return {
      message:
        `Automation ${status} ho gaya`,
      isActive: preference.isActive,
    };
  }

  private formatPreference(pref: any) {
    return {
      ...pref,
      salaryDisplay: {
        min:
          pref.salaryMin !== null &&
          pref.salaryMin !== undefined
            ? `${(
                pref.salaryMin / 100000
              ).toFixed(1)} LPA`
            : 'Not set',

        max:
          pref.salaryMax !== null &&
          pref.salaryMax !== undefined
            ? `${(
                pref.salaryMax / 100000
              ).toFixed(1)} LPA`
            : 'Not set',
      },
    };
  }
}
