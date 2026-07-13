import {
  IsUrl,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateUrlDto {
  @ApiProperty({
    description: 'The original URL to be shortened',
    example: 'https://www.example.com/very/long/url/that/needs/to/be/shortened',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  originalUrl: string;

  @ApiPropertyOptional({
    description: 'Optional name/title for the link',
    example: 'My Important Link',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  @Length(1, 100, {
    message: 'URL name must be between 1 and 100 characters',
  })
  urlName?: string;

  @ApiPropertyOptional({
    description:
      'Custom alias for the short URL (3-32 chars, alphanumeric and hyphens only)',
    example: 'my-custom-link',
    minLength: 3,
    maxLength: 32,
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  @Length(3, 32, {
    message: 'Custom alias must be between 3 and 32 characters',
  })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Custom alias can only contain lowercase letters, numbers, and hyphens',
  })
  customAlias?: string;

  @ApiPropertyOptional({
    description:
      'Whether the link is private (requires authentication to access)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the link has password protection',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasPassword?: boolean;

  @ApiPropertyOptional({
    description: 'Password for the link (required if hasPassword is true)',
    example: 'demo123',
    minLength: 4,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @Length(4, 128, {
    message: 'Password must be between 4 and 128 characters',
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'When the link becomes active (ISO date string)',
    example: '2025-01-18T13:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  activationAt?: string;

  @ApiPropertyOptional({
    description: 'When the link expires (ISO date string)',
    example: '2025-02-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
