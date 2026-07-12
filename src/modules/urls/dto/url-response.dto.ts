import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UrlResponseDto {
  @ApiProperty({
    description: 'The link ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'The original URL',
    example: 'https://www.example.com/very/long/url',
  })
  originalUrl: string;

  @ApiProperty({
    description: 'The generated short code',
    example: 'aB3xY7z',
  })
  shortCode: string;

  @ApiProperty({
    description: 'The complete short URL',
    example: 'http://localhost:8080/r/aB3xY7z',
  })
  shortUrl: string;

  @ApiProperty({
    description: 'Number of clicks',
    example: 123,
  })
  clicks: number;

  @ApiProperty({
    description: 'When the link was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'When the link was last clicked',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastClicked?: string;

  @ApiProperty({
    description: 'Whether the link is private',
    example: false,
  })
  isPrivate: boolean;

  @ApiProperty({
    description: 'Whether the link has password protection',
    example: false,
  })
  hasPassword: boolean;

  @ApiPropertyOptional({
    description: 'Optional name/title for the link',
    example: 'My Important Link',
  })
  urlName?: string;

  @ApiPropertyOptional({
    description: 'When the link becomes active',
    example: '2025-01-18T13:00:00.000Z',
  })
  activationAt?: string;

  @ApiPropertyOptional({
    description: 'When the link expires',
    example: '2025-02-01T00:00:00.000Z',
  })
  expiresAt?: string;

  @ApiProperty({
    description: 'Whether the link is enabled',
    example: true,
  })
  enabled: boolean;
}
