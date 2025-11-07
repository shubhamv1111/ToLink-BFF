import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { ClickSeriesDataPointDto } from './clicks-series.dto';

export class ClicksPerUrlDto {
  @ApiProperty({
    description: 'Per-URL click data mapped by link ID',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/ClickSeriesDataPointDto' },
    },
    example: {
      '507f1f77bcf86cd799439011': [
        { date: '2024-01-15', clicks: 12 },
        { date: '2024-01-16', clicks: 8 },
      ],
      '507f1f77bcf86cd799439012': [
        { date: '2024-01-15', clicks: 5 },
        { date: '2024-01-16', clicks: 15 },
      ],
    },
  })
  perUrl: Record<string, ClickSeriesDataPointDto[]>;
}

export class ClicksPerUrlQueryDto {
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
