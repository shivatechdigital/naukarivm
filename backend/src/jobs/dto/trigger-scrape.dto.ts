import { IsOptional, IsArray, IsString, IsInt, Min, Max } from 'class-validator';

export class TriggerScrapeDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customLocations?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxPagesPerQuery: number = 2; // Default 2 pages scrape karega per query
}
