import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    userId: string,
    dto: CreateProfileDto,
  ) {
    const existing =
      await this.prisma.profile.findUnique({
        where: { userId },
      });

    if (existing) {
      throw new ConflictException(
        'Profile pehle se bana hua hai. Update karo instead.',
      );
    }

    const profile =
      await this.prisma.profile.create({
        data: {
          userId,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth
            ? new Date(dto.dateOfBirth)
            : undefined,
          gender: dto.gender,
          currentCompany: dto.currentCompany,
          currentTitle: dto.currentTitle,
          currentCtc: dto.currentCtc,
          experienceYears: dto.experienceYears,
          expectedCtc: dto.expectedCtc,
          noticePeriod: dto.noticePeriod,
          skills: dto.skills,
          education: dto.education as any,
          certifications: dto.certifications,
          currentCity: dto.currentCity,
          preferredCities: dto.preferredCities,
          willingToRelocate: dto.willingToRelocate,
          resumeUrl: dto.resumeUrl,
          resumeText: dto.resumeText,
          naukriProfileUrl: dto.naukriProfileUrl,
        },
      });

    return {
      message: 'Profile successfully ban gaya! 🎉',
      profile: this.sanitizeProfile(profile),
    };
  }

  async findOne(userId: string) {
    const profile =
      await this.prisma.profile.findUnique({
        where: { userId },
      });

    if (!profile) {
      throw new NotFoundException(
        'Profile nahi mila. Pehle profile banao.',
      );
    }

    return {
      profile: this.sanitizeProfile(profile),
    };
  }

  async update(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const existing =
      await this.prisma.profile.findUnique({
        where: { userId },
      });

    if (!existing) {
      const created = await this.create(userId, dto as CreateProfileDto);
      return {
        message: 'Profile update ho gaya! ✅',
        profile: created.profile,
      };
    }

    const data: any = {};

    if (dto.phone !== undefined)
      data.phone = dto.phone;

    if (dto.dateOfBirth !== undefined)
      data.dateOfBirth = new Date(
        dto.dateOfBirth,
      );

    if (dto.gender !== undefined)
      data.gender = dto.gender;

    if (dto.currentCompany !== undefined)
      data.currentCompany = dto.currentCompany;

    if (dto.currentTitle !== undefined)
      data.currentTitle = dto.currentTitle;

    if (dto.currentCtc !== undefined)
      data.currentCtc = dto.currentCtc;

    if (dto.experienceYears !== undefined)
      data.experienceYears =
        dto.experienceYears;

    if (dto.expectedCtc !== undefined)
      data.expectedCtc = dto.expectedCtc;

    if (dto.noticePeriod !== undefined)
      data.noticePeriod = dto.noticePeriod;

    if (dto.skills !== undefined)
      data.skills = dto.skills;

    if (dto.education !== undefined)
      data.education = dto.education as any;

    if (dto.certifications !== undefined)
      data.certifications =
        dto.certifications;

    if (dto.currentCity !== undefined)
      data.currentCity = dto.currentCity;

    if (dto.preferredCities !== undefined)
      data.preferredCities =
        dto.preferredCities;

    if (dto.willingToRelocate !== undefined)
      data.willingToRelocate =
        dto.willingToRelocate;

    if (dto.resumeUrl !== undefined)
      data.resumeUrl = dto.resumeUrl;

    if (dto.resumeText !== undefined)
      data.resumeText = dto.resumeText;

    if (dto.naukriProfileUrl !== undefined)
      data.naukriProfileUrl =
        dto.naukriProfileUrl;

    const profile =
      await this.prisma.profile.update({
        where: { userId },
        data,
      });

    return {
      message: 'Profile update ho gaya! ✅',
      profile: this.sanitizeProfile(profile),
    };
  }

  async getCompletion(userId: string) {
    const profile =
      await this.prisma.profile.findUnique({
        where: { userId },
      });

    if (!profile) {
      return {
        completion: 0,
        missing: ['profile_not_created'],
      };
    }

    const fields = {
      phone: !!profile.phone,
      currentCompany:
        !!profile.currentCompany,
      currentTitle:
        !!profile.currentTitle,
      currentCtc:
        profile.currentCtc !== null,
      experienceYears:
        profile.experienceYears !== null,
      expectedCtc:
        profile.expectedCtc !== null,
      noticePeriod:
        !!profile.noticePeriod,
      skills:
        Array.isArray(profile.skills) &&
        profile.skills.length > 0,
      education:
        !!profile.education,
      currentCity:
        !!profile.currentCity,
      preferredCities:
        Array.isArray(
          profile.preferredCities,
        ) &&
        profile.preferredCities.length > 0,
    };

    const total =
      Object.keys(fields).length;

    const filled =
      Object.values(fields)
        .filter(Boolean).length;

    return {
      completion: Math.round(
        (filled / total) * 100,
      ),
      filled,
      total,
      missing:
        Object.entries(fields)
          .filter(([, value]) => !value)
          .map(([field]) => field),
    };
  }

  private sanitizeProfile(profile: any) {
    const {
      userId,
      ...safeProfile
    } = profile;

    return safeProfile;
  }
}
