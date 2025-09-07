import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UrlResponseDto } from './url-response.dto';

export class LinkListResponseDto {
  @ApiProperty({
    description: 'Array of links',
    type: [UrlResponseDto],
  })
  items: UrlResponseDto[];

  @ApiProperty({
    description: 'Total number of links',
    example: 150,
  })
  total: number;
}

export class LinkListQueryDto {
  @ApiPropertyOptional({
    description: 'Search term (matches originalUrl, shortCode, urlName)',
    example: 'example.com',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter links by status',
    enum: ['all', 'active', 'expired', 'password-protected'],
    example: 'all',
  })
  filter?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    default: 0,
  })
  offset?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['createdAt', '-createdAt', 'clicks', '-clicks'],
    example: '-createdAt',
  })
  sort?: string;
}
