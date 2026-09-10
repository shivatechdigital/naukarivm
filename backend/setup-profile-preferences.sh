#!/bin/bash

set -e

echo "=============================================="
echo " Job Auto Apply"
echo " Profile + Job Preferences API Setup"
echo " NestJS 12 + Prisma 6 + JWT"
echo "=============================================="

cd "$(dirname "$0")"

echo ""
echo "📦 Installing required dependency..."

npm install @nestjs/mapped-types@2 class-validator class-transformer

echo ""
echo "📁 Creating directories..."

mkdir -p src/profiles/dto
mkdir -p src/preferences/dto

echo ""
echo "👤 Creating Profile DTO..."

cat > src/profiles/dto/create-profile.dto.ts <<'TS'
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsUrl,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NoticePeriod } from '@prisma/client';

export class EducationDto {
  @IsString()
  degree!: string;

  @IsString()
  university!: string;

  @IsNumber()
  @Min(1990)
  @Max(2030)
  year!: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;
}

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  currentCompany?: string;

  @IsOptional()
  @IsString()
  currentTitle?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentCTC?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedCTC?: number;

  @IsOptional()
  @IsEnum(NoticePeriod)
  noticePeriod?: NoticePeriod;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsString()
  currentCity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCities?: string[];

  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @IsOptional()
  @IsUrl()
  resumeUrl?: string;

  @IsOptional()
  @IsString()
  resumeText?: string;

  @IsOptional()
  @IsUrl()
  naukriProfileUrl?: string;
}
TS

echo "📝 Creating Update Profile DTO..."

cat > src/profiles/dto/update-profile.dto.ts <<'TS'
import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileDto } from './create-profile.dto';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
TS

echo "⚙️ Creating ProfilesService..."

cat > src/profiles/profiles.service.ts <<'TS'
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
          currentCTC: dto.currentCTC,
          experienceYears: dto.experienceYears,
          expectedCTC: dto.expectedCTC,
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
      throw new NotFoundException(
        'Profile nahi mila. Pehle create karo.',
      );
    }

    const profile =
      await this.prisma.profile.update({
        where: { userId },
        data: {
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth
            ? new Date(dto.dateOfBirth)
            : undefined,
          gender: dto.gender,
          currentCompany: dto.currentCompany,
          currentTitle: dto.currentTitle,
          currentCTC: dto.currentCTC,
          experienceYears: dto.experienceYears,
          expectedCTC: dto.expectedCTC,
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
      currentCompany: !!profile.currentCompany,
      currentTitle: !!profile.currentTitle,
      currentCTC: profile.currentCTC !== null,
      experienceYears:
        profile.experienceYears !== null,
      expectedCTC: profile.expectedCTC !== null,
      noticePeriod: !!profile.noticePeriod,
      skills:
        Array.isArray(profile.skills) &&
        profile.skills.length > 0,
      education: !!profile.education,
      currentCity: !!profile.currentCity,
      preferredCities:
        Array.isArray(profile.preferredCities) &&
        profile.preferredCities.length > 0,
      resumeUrl: !!profile.resumeUrl,
    };

    const totalFields =
      Object.keys(fields).length;

    const filledFields =
      Object.values(fields).filter(Boolean).length;

    const completion = Math.round(
      (filledFields / totalFields) * 100,
    );

    const missing =
      Object.entries(fields)
        .filter(([, filled]) => !filled)
        .map(([field]) => field);

    return {
      completion,
      filled: filledFields,
      total: totalFields,
      missing,
    };
  }

  private sanitizeProfile(profile: any) {
    const {
      id,
      userId,
      ...rest
    } = profile;

    return {
      id,
      ...rest,
    };
  }
}
TS

echo "🎮 Creating ProfilesController..."

cat > src/profiles/profiles.controller.ts <<'TS'
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
  ) {}

  @Post()
  async create(
    @Request() req: any,
    @Body() dto: CreateProfileDto,
  ) {
    return this.profilesService.create(
      req.user.userId,
      dto,
    );
  }

  @Get('me')
  async getMyProfile(
    @Request() req: any,
  ) {
    return this.profilesService.findOne(
      req.user.userId,
    );
  }

  @Put('me')
  async updateMyProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.update(
      req.user.userId,
      dto,
    );
  }

  @Get('completion')
  async getCompletion(
    @Request() req: any,
  ) {
    return this.profilesService.getCompletion(
      req.user.userId,
    );
  }
}
TS

echo "📦 Creating ProfilesModule..."

cat > src/profiles/profiles.module.ts <<'TS'
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
TS

echo ""
echo "🎯 Creating Preference DTO..."

cat > src/preferences/dto/create-preference.dto.ts <<'TS'
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreatePreferenceDto {
  @IsArray()
  @IsString({ each: true })
  jobTitles!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsArray()
  @IsString({ each: true })
  locations!: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companySizes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedCompanies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blacklistJobIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxApplicationsPerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  matchScoreThreshold?: number;

  @IsOptional()
  @IsString()
  @Matches(
    /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/,
    {
      message:
        'Valid cron expression daalo (e.g., "0 */2 * * *")',
    },
  )
  cronExpression?: string;
}
TS

echo "📝 Creating Update Preference DTO..."

cat > src/preferences/dto/update-preference.dto.ts <<'TS'
import { PartialType } from '@nestjs/mapped-types';
import { CreatePreferenceDto } from './create-preference.dto';

export class UpdatePreferenceDto extends PartialType(
  CreatePreferenceDto,
) {}
TS

echo "⚙️ Creating PreferencesService..."

cat > src/preferences/preferences.service.ts <<'TS'
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
          jobTitles: dto.jobTitles,
          keywords: dto.keywords,
          locations: dto.locations,
          experienceMin: dto.experienceMin,
          experienceMax: dto.experienceMax,
          salaryMin: dto.salaryMin,
          salaryMax: dto.salaryMax,
          jobTypes: dto.jobTypes,
          industries: dto.industries,
          companySizes: dto.companySizes,
          excludedCompanies:
            dto.excludedCompanies,
          excludedKeywords:
            dto.excludedKeywords,
          blacklistJobIds:
            dto.blacklistJobIds,
          isActive: dto.isActive,
          maxApplicationsPerDay:
            dto.maxApplicationsPerDay,
          matchScoreThreshold:
            dto.matchScoreThreshold,
          cronExpression:
            dto.cronExpression,
        },
      });

    return {
      message: 'Job preferences set ho gayi! 🎯',
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
          jobTitles: dto.jobTitles,
          keywords: dto.keywords,
          locations: dto.locations,
          experienceMin: dto.experienceMin,
          experienceMax: dto.experienceMax,
          salaryMin: dto.salaryMin,
          salaryMax: dto.salaryMax,
          jobTypes: dto.jobTypes,
          industries: dto.industries,
          companySizes: dto.companySizes,
          excludedCompanies:
            dto.excludedCompanies,
          excludedKeywords:
            dto.excludedKeywords,
          blacklistJobIds:
            dto.blacklistJobIds,
          isActive: dto.isActive,
          maxApplicationsPerDay:
            dto.maxApplicationsPerDay,
          matchScoreThreshold:
            dto.matchScoreThreshold,
          cronExpression:
            dto.cronExpression,
        },
      });

    return {
      message: 'Preferences update ho gayi! ✅',
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

    const status = preference.isActive
      ? 'ACTIVE 🟢'
      : 'PAUSED 🔴';

    return {
      message: `Automation ${status} ho gaya`,
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
TS

echo "🎮 Creating PreferencesController..."

cat > src/preferences/preferences.controller.ts <<'TS'
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PreferencesService } from './preferences.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
  ) {}

  @Post()
  async create(
    @Request() req: any,
    @Body() dto: CreatePreferenceDto,
  ) {
    return this.preferencesService.create(
      req.user.userId,
      dto,
    );
  }

  @Get('me')
  async getMyPreferences(
    @Request() req: any,
  ) {
    return this.preferencesService.findOne(
      req.user.userId,
    );
  }

  @Put('me')
  async updateMyPreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.preferencesService.update(
      req.user.userId,
      dto,
    );
  }

  @Patch('toggle')
  async toggleAutomation(
    @Request() req: any,
  ) {
    return this.preferencesService.toggleAutomation(
      req.user.userId,
    );
  }
}
TS

echo "📦 Creating PreferencesModule..."

cat > src/preferences/preferences.module.ts <<'TS'
import { Module } from '@nestjs/common';

import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PreferencesController],
  providers: [
    PreferencesService,
    PrismaService,
  ],
  exports: [PreferencesService],
})
export class PreferencesModule {}
TS

echo ""
echo "🔧 Updating AppModule..."

cat > src/app.module.ts <<'TS'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PreferencesModule } from './preferences/preferences.module';

export const {
  ObserveModule,
  ObserveInstrument,
} = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ObserveModule.forRoot({
      appKey:
        process.env.OBSERVE_APP_KEY ||
        'YOUR_APP_KEY',

      appSecret:
        process.env.OBSERVE_APP_SECRET ||
        'YOUR_APP_SECRET',

      serviceId: 'backend',
    }),

    UsersModule,
    AuthModule,
    ProfilesModule,
    PreferencesModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
TS

echo ""
echo "🔧 Updating main.ts..."

cat > src/main.ts <<'TS'
import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
} from '@nestjs/common';

import {
  AppModule,
  ObserveInstrument,
} from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    {
      instrument: ObserveInstrument,
    },
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port =
    Number(process.env.PORT) || 3001;

  await app.listen(
    port,
    '0.0.0.0',
  );

  console.log(
    `🚀 Backend running on http://localhost:${port}`,
  );
}

bootstrap();
TS

echo ""
echo "🔄 Generating Prisma Client..."

npx prisma generate

echo ""
echo "🧪 Building backend..."

npm run build

echo ""
echo "=============================================="
echo "✅ PROFILE + PREFERENCES SETUP COMPLETE"
echo "=============================================="
echo ""
echo "APIs:"
echo ""
echo "POST   /api/profiles"
echo "GET    /api/profiles/me"
echo "PUT    /api/profiles/me"
echo "GET    /api/profiles/completion"
echo ""
echo "POST   /api/preferences"
echo "GET    /api/preferences/me"
echo "PUT    /api/preferences/me"
echo "PATCH  /api/preferences/toggle"
echo ""
echo "Start backend:"
echo "cd ~/job-auto-apply/backend"
echo "npm run start:dev"
echo ""
