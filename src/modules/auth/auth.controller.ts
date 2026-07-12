import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { UserDocument } from '../../schemas/user.schema';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Req } from '@nestjs/common';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private setSessionCookie(res: Response, token: string) {
    const isProd =
      this.configService.get<string>('NODE_ENV') === 'production' ||
      this.configService.get<string>('environment') === 'production';
    // Default 7 days
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    res.cookie('tolink_session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: maxAgeMs,
    });
  }

  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({
    status: 201,
    description: 'User signed up successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiBody({ type: RegisterDto })
  async signup(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const result = await this.authService.register(registerDto);
    this.setSessionCookie(res, result.accessToken);
    return result.user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const result = await this.authService.login(loginDto);
    this.setSessionCookie(res, result.accessToken);
    return result.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@Res({ passthrough: true }) res: Response): Promise<void> {
    const isProd =
      this.configService.get<string>('NODE_ENV') === 'production' ||
      this.configService.get<string>('environment') === 'production';
    res.cookie('tolink_session', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Current user retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getProfile(@GetUser() user: UserDocument): Promise<UserResponseDto> {
    return this.authService.getProfile(user._id as string);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(
    @GetUser() user: UserDocument,
    @Body() updateData: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateProfile(user._id as string, updateData);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or incorrect current password',
  })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @GetUser() user: UserDocument,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      user._id as string,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 202,
    description: 'Password reset request accepted (always non-enumerating)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    },
  })
  async forgotPassword(@Body() dto: { email: string }): Promise<void> {
    await this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        newPassword: { type: 'string', minLength: 8, maxLength: 128 },
      },
      required: ['token', 'newPassword'],
    },
  })
  async resetPassword(
    @Body() dto: { token: string; newPassword: string },
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Login with Google',
    description: 'Redirects to Google OAuth login page',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth',
  })
  async googleAuth() {
    // Guard handles the redirect
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth callback',
    description: 'Handles callback from Google OAuth',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated with Google',
    type: UserResponseDto,
  })
  async googleAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user as any;
    
    // Find or create user with Google info
    const { accessToken, user: userData } = await this.authService.googleLogin(user);
    
    // Set session cookie
    this.setSessionCookie(res, accessToken);
    
    // Redirect to frontend dashboard
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard`);
  }
}
