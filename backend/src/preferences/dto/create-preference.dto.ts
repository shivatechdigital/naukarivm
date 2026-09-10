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
        'Valid cron expression daalo',
    },
  )
  cronExpression?: string;
}
