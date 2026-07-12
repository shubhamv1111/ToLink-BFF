import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User full name',
    minLength: 1,
    maxLength: 80,
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @Length(1, 80, { message: 'Name must be between 1 and 80 characters' })
  name?: string;
}
