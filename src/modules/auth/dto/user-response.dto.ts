import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User profile photo URL',
    example: 'https://example.com/photo.jpg',
  })
  profilePhoto?: string | null;

  @ApiProperty({
    description: 'User role',
    example: 'user',
    enum: ['user', 'admin'],
  })
  role: string;

  @ApiProperty({
    description: 'Email verification status',
    example: false,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last login date',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  lastLogin?: Date;

  @ApiProperty({
    description: 'Whether the account was created via Google OAuth',
    example: false,
  })
  isGoogleAccount: boolean;

  @ApiProperty({
    description: 'Whether the account has a password set (Google users may not)',
    example: true,
  })
  hasPassword: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;
}
