import { ApiProperty } from '@nestjs/swagger';

export class UrlResponseDto {
  @ApiProperty({
    description: 'The generated short code',
    example: '0000001',
  })
  shortCode: string;

  @ApiProperty({
    description: 'The original URL',
    example: 'https://www.example.com/very/long/url',
  })
  originalUrl: string;

  @ApiProperty({
    description: 'The complete short URL',
    example: 'http://localhost:8080/0000001',
  })
  shortUrl: string;

  @ApiProperty({
    description: 'Custom alias if provided',
    example: 'my-custom-link',
    required: false,
  })
  customAlias?: string;

  @ApiProperty({
    description: 'Optional name/title for the link',
    example: 'My Google Homepage Link',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Number of times the URL has been clicked',
    example: 0,
  })
  clickCount: number;

  @ApiProperty({
    description: 'When the URL was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
