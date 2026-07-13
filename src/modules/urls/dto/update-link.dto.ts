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
import { ApiPropertyOptional } from '@nestjs/swagger';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class UpdateLinkDto {
  @ApiPropertyOptional({
    description: 'Update the original URL',
    example: 'https://www.example.com/updated-url',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid URL' })
  originalUrl?: string;

  @ApiPropertyOptional({
    description: 'Update the link name/title',
    example: 'Updated Link Name',
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
      'Update custom alias (3-32 chars, alphanumeric and hyphens only)',
    example: 'new-custom-alias',
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
    description: 'Update whether the link has password protection',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasPassword?: boolean;

  @ApiPropertyOptional({
    description:
      'Update password for the link (required if hasPassword is true)',
    example: 'newPassword123',
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
    description: 'Update whether the link is private',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Update when the link becomes active (ISO date string)',
    example: '2025-01-20T13:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  activationAt?: string;

  @ApiPropertyOptional({
    description: 'Update when the link expires (ISO date string)',
    example: '2025-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Enable or disable the link',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Clear activation schedule conflicts when enabling (force activate)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  forceActivate?: boolean;

  @ApiPropertyOptional({
    description: 'Clear activation date',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  clearActivationAt?: boolean;

  @ApiPropertyOptional({
    description: 'Clear expiration date',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  clearExpiresAt?: boolean;
}
