import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceBreakdownDto {
  @ApiProperty({ description: 'Device name', example: 'Desktop' })
  name: string;

  @ApiProperty({ description: 'Number of clicks', example: 45 })
  value: number;

  @ApiProperty({ description: 'Chart color', example: '#3B82F6' })
  color: string;
}

export class ReferrerDto {
  @ApiProperty({ description: 'Traffic source', example: 'Direct' })
  source: string;

  @ApiProperty({ description: 'Number of clicks', example: 180 })
  clicks: number;
}

export class CityDto {
  @ApiProperty({ description: 'City name', example: 'New York' })
  city: string;

  @ApiProperty({ description: 'Number of clicks', example: 120 })
  clicks: number;
}

export class CountryDto {
  @ApiProperty({ description: 'Country name', example: 'United States' })
  country: string;

  @ApiProperty({ description: 'Number of clicks', example: 234 })
  clicks: number;

  @ApiProperty({ description: 'Percentage of total', example: 45 })
  percentage: number;

  @ApiProperty({ description: 'Top cities in this country', type: [CityDto] })
  cities: CityDto[];
}

export class StatsChangesDto {
  @ApiProperty({ description: 'Total clicks change', example: '+12%' })
  totalClicks: string;

  @ApiProperty({
    description: 'Total clicks trend',
    example: 'up',
    enum: ['up', 'down', 'neutral'],
  })
  totalClicksTrend: string;

  @ApiProperty({ description: 'Unique visitors change', example: '+8%' })
  uniqueVisitors: string;

  @ApiProperty({
    description: 'Unique visitors trend',
    example: 'up',
    enum: ['up', 'down', 'neutral'],
  })
  uniqueVisitorsTrend: string;

  @ApiProperty({ description: 'Click rate change', example: '-2%' })
  clickRate: string;

  @ApiProperty({
    description: 'Click rate trend',
    example: 'down',
    enum: ['up', 'down', 'neutral'],
  })
  clickRateTrend: string;

  @ApiProperty({ description: 'Average daily clicks change', example: '+15%' })
  avgDailyClicks: string;

  @ApiProperty({
    description: 'Average daily clicks trend',
    example: 'up',
    enum: ['up', 'down', 'neutral'],
  })
  avgDailyClicksTrend: string;
}

export class StatsDto {
  @ApiProperty({ description: 'Click rate percentage', example: '3.0%' })
  clickRate: string;

  @ApiProperty({ description: 'Unique visitors ratio', example: 0.75 })
  uniqueVisitorsRatio: number;

  @ApiProperty({
    description: 'Changes compared to previous period',
    type: StatsChangesDto,
  })
  changes: StatsChangesDto;
}

export class AnalyticsOverviewDto {
  @ApiProperty({ description: 'Device breakdown', type: [DeviceBreakdownDto] })
  deviceBreakdown: DeviceBreakdownDto[];

  @ApiProperty({ description: 'Top referrers', type: [ReferrerDto] })
  referrers: ReferrerDto[];

  @ApiProperty({ description: 'Countries breakdown', type: [CountryDto] })
  countries: CountryDto[];

  @ApiProperty({ description: 'Statistics overview', type: StatsDto })
  stats: StatsDto;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Analytics scope',
    enum: ['user', 'link'],
    example: 'user',
    default: 'user',
  })
  scope?: string;

  @ApiPropertyOptional({
    description: 'Link ID (required when scope=link)',
    example: '507f1f77bcf86cd799439011',
  })
  linkId?: string;

  @ApiPropertyOptional({
    description: 'Time range',
    enum: ['7d', '30d', '90d', 'all'],
    example: '30d',
    default: '30d',
  })
  range?: string;
}
