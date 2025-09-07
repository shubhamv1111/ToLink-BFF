import { Controller, Patch, Put, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserDocument } from '../../schemas/user.schema';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { UpdateUserDto, UpdatePhotoDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('tolink_session')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      "Update the current user's profile information (name and/or email)",
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use by another account',
  })
  async updateProfile(
    @GetUser() user: UserDocument,
    @Body() updateDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user._id as string, updateDto);
  }

  @Put('me/photo')
  @ApiOperation({
    summary: 'Update user profile photo',
    description:
      "Update the current user's profile photo by providing a photo URL",
  })
  @ApiBody({ type: UpdatePhotoDto })
  @ApiResponse({
    status: 200,
    description: 'Profile photo updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid photo URL',
  })
  async updatePhoto(
    @GetUser() user: UserDocument,
    @Body() updateDto: UpdatePhotoDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updatePhoto(user._id as string, updateDto);
  }
}
