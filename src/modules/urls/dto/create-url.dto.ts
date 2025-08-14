import { IsUrl, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The original URL to be shortened',
    example: 'https://www.example.com/very/long/url/that/needs/to/be/shortened',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  originalUrl: string;

  @ApiPropertyOptional({
    description: 'Custom alias for the short URL (optional)',
    example: 'my-custom-link',
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(3, 50, {
    message: 'Custom alias must be between 3 and 50 characters',
  })
  customAlias?: string;

  @ApiPropertyOptional({
    description: 'Optional name/title for the link to help remember it',
    example: 'My Google Homepage Link',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Name must be between 1 and 100 characters',
  })
  name?: string;
}
