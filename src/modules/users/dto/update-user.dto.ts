import { IsString, IsEmail, IsOptional, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @Length(1, 80, {
    message: 'Name must be between 1 and 80 characters',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdatePhotoDto {
  @ApiPropertyOptional({
    description: 'Profile photo URL',
    example: 'https://example.com/profile-photo.jpg',
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
