import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';

export class ClickSeriesDataPointDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2024-01-15',
  })
  date: string;

  @ApiProperty({ description: 'Number of clicks for this date', example: 12 })
  clicks: number;
}

export class ClicksSeriesDto {
  @ApiProperty({
    description: 'Time series data',
    type: [ClickSeriesDataPointDto],
  })
  series: ClickSeriesDataPointDto[];
}

export class ClicksSeriesQueryDto {
  @ApiPropertyOptional({
    description: 'Analytics scope',
    enum: ['user', 'link'],
    example: 'user',
    default: 'user',
  })
  @IsOptional()
  @IsEnum(['user', 'link'])
  scope?: string;

  @ApiPropertyOptional({
    description: 'Link ID (required when scope=link)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  linkId?: string;

  @ApiPropertyOptional({
    description: 'Data granularity',
    enum: ['day'],
    example: 'day',
    default: 'day',
  })
  @IsOptional()
  @IsEnum(['day'])
  granularity?: string;

  @ApiPropertyOptional({
    description: 'Time range',
    enum: ['7d', '30d', '90d', 'all'],
    example: '30d',
    default: '30d',
  })
  @IsOptional()
  @IsEnum(['7d', '30d', '90d', 'all'])
  range?: string;
}
