import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { UpdateUserDto, UpdatePhotoDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Update user profile information
   */
  async updateProfile(
    userId: string,
    updateDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const { name, email } = updateDto;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await this.userModel
        .findOne({
          email: email.toLowerCase(),
          _id: { $ne: userId },
        })
        .exec();

      if (existingUser) {
        throw new ConflictException(
          'Email is already in use by another account',
        );
      }
    }

    // Update user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          ...(name && { name }),
          ...(email && { email: email.toLowerCase() }),
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.transformUserToDto(updatedUser);
  }

  /**
   * Update user profile photo
   */
  async updatePhoto(
    userId: string,
    updateDto: UpdatePhotoDto,
  ): Promise<UserResponseDto> {
    const { photoUrl } = updateDto;

    // Validate photo URL if provided
    if (photoUrl && !this.isValidUrl(photoUrl)) {
      throw new ConflictException('Invalid photo URL provided');
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          profilePhoto: photoUrl || null,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.transformUserToDto(updatedUser);
  }

  /**
   * Get user by ID
   */
  async findById(userId: string): Promise<UserResponseDto | null> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return null;
    }
    return this.transformUserToDto(user);
  }

  /**
   * Transform user document to DTO
   */
  private transformUserToDto(user: UserDocument): UserResponseDto {
    return {
      id: user._id as string,
      name: user.name,
      email: user.email,
      profilePhoto: user.profilePhoto || null,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }
}
