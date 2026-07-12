import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldPassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newSecurePass456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
