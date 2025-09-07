import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { UrlsService } from './urls.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlResponseDto } from './dto/url-response.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinkListResponseDto, LinkListQueryDto } from './dto/link-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserDocument } from '../../schemas/user.schema';

// Swagger response examples

class RedirectResponseDto {
  @ApiProperty({
    example: 'https://www.google.com',
    description: 'Original URL that the short code redirects to',
  })
  originalUrl: string;
}

class ErrorResponseDto {
  @ApiProperty({
    example: 400,
    description: 'HTTP status code',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Invalid URL format',
    description: 'Error message',
  })
  message: string;

  @ApiProperty({
    example: 'Bad Request',
    description: 'HTTP status text',
  })
  error: string;
}

@ApiTags('URLs')
@Controller('links')
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post()
  @ApiOperation({
    summary: 'Shorten a long URL',
    description: `
    Creates a shortened URL from a long URL. The system generates a cryptographically secure,
    random 7-character Base62 code that maps to the original URL. Supports custom aliases
    and includes collision detection for guaranteed uniqueness.
    
    **Security Features:**
    - Non-predictable random short codes
    - Cryptographically secure random generation
    - Collision detection with automatic retry
    - Base62 encoding (0-9, A-Z, a-z) for URL-safe characters
    
    **Deduplication:**
    If the same long URL is shortened multiple times, the system returns the existing short code.
    `,
  })
  @ApiBody({
    type: CreateUrlDto,
    examples: {
      'Basic URL shortening': {
        summary: 'Shorten a long URL',
        description: 'Basic URL shortening without custom alias',
        value: {
          originalUrl:
            'https://www.example.com/very/long/path/to/some/resource?param1=value1&param2=value2',
        },
      },
      'Custom alias': {
        summary: 'Shorten with custom alias',
        description: 'Create a short URL with a custom memorable alias',
        value: {
          originalUrl: 'https://github.com/nestjs/nest',
          customAlias: 'nestjs',
        },
      },
      'Social media URL': {
        summary: 'Shorten social media URL',
        description: 'Example with a typical social media URL',
        value: {
          originalUrl:
            'https://www.linkedin.com/in/john-doe-software-engineer-12345/',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'URL successfully shortened',
    type: UrlResponseDto,
    examples: {
      'Successfully shortened': {
        summary: 'Successful URL shortening',
        value: {
          shortCode: 'aB3xY7z',
          originalUrl:
            'https://www.example.com/very/long/path/to/some/resource?param1=value1&param2=value2',
          shortUrl: 'http://localhost:8080/r/aB3xY7z',
          clickCount: 0,
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      },
      'Custom alias example': {
        summary: 'Custom alias result',
        value: {
          shortCode: 'nestjs',
          originalUrl: 'https://github.com/nestjs/nest',
          shortUrl: 'http://localhost:8080/r/nestjs',
          clickCount: 0,
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid URL format or custom alias already exists',
    type: ErrorResponseDto,
    examples: {
      'Invalid URL': {
        summary: 'Invalid URL format',
        value: {
          statusCode: 400,
          message: 'Invalid URL format',
          error: 'Bad Request',
        },
      },
      'Alias exists': {
        summary: 'Custom alias already taken',
        value: {
          statusCode: 400,
          message: 'Custom alias already exists',
          error: 'Bad Request',
        },
      },
      'Invalid alias': {
        summary: 'Invalid custom alias format',
        value: {
          statusCode: 400,
          message:
            'Custom alias must contain only alphanumeric characters and hyphens (0-9, A-Z, a-z, -)',
          error: 'Bad Request',
        },
      },
    },
  })
  async shortenUrl(
    @Body() createUrlDto: CreateUrlDto,
    @Req() req: Request,
  ): Promise<UrlResponseDto> {
    // Check if user is authenticated (optional)
    const user = req.user as UserDocument | undefined;
    const userId = user?._id as string | undefined;

    return this.urlsService.shortenUrl(createUrlDto, userId);
  }

  @Get('stats/:shortCode')
  @ApiOperation({
    summary: 'Get URL analytics and statistics',
    description: `
    Retrieves detailed analytics for a shortened URL including click count,
    creation date, and other metadata. This endpoint provides real-time statistics
    directly from the database.
    
    **Analytics included:**
    - Total click count (redirections)
    - Creation timestamp
    - Original URL
    - Short URL details
    `,
  })
  @ApiParam({
    name: 'shortCode',
    description:
      'The short code to get statistics for (7-character Base62 string)',
    example: 'aB3xY7z',
    schema: {
      type: 'string',
      pattern: '^[0-9A-Za-z]{1,20}$',
      minLength: 1,
      maxLength: 20,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'URL statistics retrieved successfully',
    type: UrlResponseDto,
    examples: {
      'Popular URL stats': {
        summary: 'Well-used shortened URL',
        value: {
          shortCode: 'aB3xY7z',
          originalUrl: 'https://www.example.com/popular-page',
          shortUrl: 'http://localhost:8080/r/aB3xY7z',
          clickCount: 1247,
          createdAt: '2024-01-10T08:15:30.000Z',
        },
      },
      'New URL stats': {
        summary: 'Recently created URL',
        value: {
          shortCode: 'xYz123A',
          originalUrl: 'https://docs.example.com/guide',
          shortUrl: 'http://localhost:8080/r/xYz123A',
          clickCount: 5,
          createdAt: '2024-01-15T14:22:10.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid short code format',
    type: ErrorResponseDto,
    examples: {
      'Invalid format': {
        summary: 'Invalid short code format',
        value: {
          statusCode: 400,
          message: 'Invalid short code format',
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Short URL not found',
    type: ErrorResponseDto,
    examples: {
      'Not found': {
        summary: 'Short code does not exist',
        value: {
          statusCode: 404,
          message: 'Short URL not found',
          error: 'Not Found',
        },
      },
    },
  })
  async getUrlStats(
    @Param('shortCode') shortCode: string,
  ): Promise<UrlResponseDto> {
    return this.urlsService.getUrlStats(shortCode);
  }

  // CRUD Operations for authenticated users

  @Get('alias-availability')
  @ApiOperation({
    summary: 'Check alias availability',
    description:
      'Check if a custom alias is available and get suggestions if not',
  })
  @ApiQuery({ name: 'alias', required: true, description: 'Alias to check' })
  @ApiResponse({
    status: 200,
    description: 'Alias availability checked',
    schema: {
      type: 'object',
      properties: {
        alias: { type: 'string', example: 'my-custom-link' },
        available: { type: 'boolean', example: true },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          example: ['my-custom-link-1', 'my-custom-link-2'],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid alias format',
  })
  async checkAliasAvailability(
    @Query('alias') alias: string,
  ): Promise<{ alias: string; available: boolean; suggestions: string[] }> {
    return this.urlsService.checkAliasAvailability(alias);
  }

  @Get('suggest-code')
  @ApiOperation({
    summary: 'Suggest a short code',
    description: 'Generate a suggested short code for URL shortening',
  })
  @ApiQuery({
    name: 'length',
    required: false,
    type: Number,
    description: 'Code length (5-12, default: 7)',
  })
  @ApiQuery({
    name: 'seed',
    required: false,
    description: 'Optional seed for generation',
  })
  @ApiResponse({
    status: 200,
    description: 'Short code suggested',
    schema: {
      type: 'object',
      properties: {
        shortCode: { type: 'string', example: 'aB3xY7z' },
      },
    },
  })
  async suggestCode(
    @Query('length') length?: number,
    @Query('seed') seed?: string,
  ): Promise<{ shortCode: string }> {
    return this.urlsService.suggestShortCode(length, seed);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @ApiOperation({
    summary: 'List user links',
    description:
      'Get a paginated list of links owned by the current user with search and filtering options',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: ['all', 'active', 'expired', 'password-protected'],
    description: 'Filter links',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Items to skip (default: 0)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['createdAt', '-createdAt', 'clicks', '-clicks'],
    description: 'Sort order',
  })
  @ApiResponse({
    status: 200,
    description: 'Links retrieved successfully',
    type: LinkListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getLinks(
    @GetUser() user: UserDocument,
    @Query() query: LinkListQueryDto,
  ): Promise<LinkListResponseDto> {
    return this.urlsService.getUserLinks(user._id as string, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @ApiOperation({
    summary: 'Get a user link by ID',
    description: 'Retrieve a specific link owned by the current user',
  })
  @ApiParam({ name: 'id', description: 'Link ID' })
  @ApiResponse({
    status: 200,
    description: 'Link retrieved successfully',
    type: UrlResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found or not owned by user',
  })
  async getLink(
    @GetUser() user: UserDocument,
    @Param('id') id: string,
  ): Promise<UrlResponseDto> {
    return this.urlsService.getUserLink(user._id as string, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @ApiOperation({
    summary: 'Update a user link',
    description: 'Update properties of a link owned by the current user',
  })
  @ApiParam({ name: 'id', description: 'Link ID' })
  @ApiBody({ type: UpdateLinkDto })
  @ApiResponse({
    status: 200,
    description: 'Link updated successfully',
    type: UrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or schedule conflicts',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found or not owned by user',
  })
  @ApiResponse({
    status: 409,
    description: 'Alias already taken',
  })
  async updateLink(
    @GetUser() user: UserDocument,
    @Param('id') id: string,
    @Body() updateDto: UpdateLinkDto,
  ): Promise<UrlResponseDto> {
    return this.urlsService.updateUserLink(user._id as string, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('tolink_session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user link',
    description: 'Delete a link owned by the current user',
  })
  @ApiParam({ name: 'id', description: 'Link ID' })
  @ApiResponse({
    status: 204,
    description: 'Link deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found or not owned by user',
  })
  async deleteLink(
    @GetUser() user: UserDocument,
    @Param('id') id: string,
  ): Promise<void> {
    await this.urlsService.deleteUserLink(user._id as string, id);
  }

  // Public link access endpoints

  @Get(':shortCode/public-meta')
  @ApiOperation({
    summary: 'Get public link metadata',
    description:
      'Get public metadata for a link without exposing the destination URL. Used to drive UI states.',
  })
  @ApiParam({
    name: 'shortCode',
    description: 'Short code to get metadata for',
  })
  @ApiResponse({
    status: 200,
    description: 'Link metadata retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        shortCode: { type: 'string', example: 'abc123' },
        status: {
          type: 'string',
          enum: [
            'active',
            'not_activated',
            'expired',
            'disabled',
            'password_required',
            'auth_required',
            'not_found',
          ],
          example: 'active',
        },
        hasPassword: { type: 'boolean', example: false },
        isPrivate: { type: 'boolean', example: false },
        activationAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: null,
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: null,
        },
        urlName: { type: 'string', nullable: true, example: 'My Link' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found',
  })
  async getPublicMeta(@Param('shortCode') shortCode: string): Promise<any> {
    return this.urlsService.getPublicMeta(shortCode);
  }

  @Post(':shortCode/access')
  @ApiOperation({
    summary: 'Verify access and get redirect token',
    description:
      'Verify password/auth for a link and get a short-lived redirect token',
  })
  @ApiParam({ name: 'shortCode', description: 'Short code to access' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        password: { type: 'string', description: 'Password if required' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Access granted, redirect token provided',
    schema: {
      type: 'object',
      properties: {
        redirectToken: { type: 'string', example: 'jwt-token' },
        redirectUrl: {
          type: 'string',
          example: '/v1/links/abc123/redirect?token=jwt-token',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Wrong or missing password',
  })
  @ApiResponse({
    status: 403,
    description: 'Authentication required for private link',
  })
  @ApiResponse({
    status: 409,
    description: 'Link not active (not_activated/expired/disabled)',
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found',
  })
  async verifyAccess(
    @Param('shortCode') shortCode: string,
    @Body() body: { password?: string },
    @Req() req: Request,
  ): Promise<{ redirectToken: string; redirectUrl: string }> {
    // Extract user from JWT if present (for private links)
    let userId: string | undefined;
    try {
      const token = req.cookies?.tolink_session;
      if (token) {
        // TODO: Decode JWT to get user ID for private link access
        // userId = await this.authService.getUserIdFromToken(token);
      }
    } catch (error) {
      // Ignore JWT errors for non-private links
    }

    return this.urlsService.verifyLinkAccess(shortCode, body.password, userId);
  }

  @Get(':shortCode/redirect')
  @ApiOperation({
    summary: 'Redirect with token validation',
    description:
      'Validate redirect token and perform 302 redirect to destination',
  })
  @ApiParam({ name: 'shortCode', description: 'Short code to redirect' })
  @ApiQuery({
    name: 'token',
    description: 'Redirect token from access endpoint',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to original URL',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found',
  })
  async redirectWithToken(
    @Param('shortCode') shortCode: string,
    @Query('token') token: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    const redirectUrl = await this.urlsService.validateTokenAndRedirect(
      shortCode,
      token,
      req,
    );
    res.redirect(302, redirectUrl);
  }
}

@ApiTags('Redirection')
@Controller('r')
export class RedirectController {
  constructor(private readonly urlsService: UrlsService) {}

  @Get(':shortCode')
  @ApiOperation({
    summary: 'Redirect to original URL',
    description: `
    Redirects the user to the original long URL associated with the short code.
    This endpoint performs the core URL shortening service function.
    
    **Process:**
    1. Validates the short code format
    2. Looks up the original URL (cache-first, then database)
    3. Increments click count for analytics (asynchronous)
    4. Performs HTTP 301 (permanent) redirect to original URL
    
    **Performance Features:**
    - Cache-first lookup for sub-millisecond response times
    - Asynchronous analytics to minimize redirect latency
    - Optimized database queries
    
    **Note:** This endpoint returns an HTTP redirect response, not JSON data.
    `,
  })
  @ApiParam({
    name: 'shortCode',
    description: 'The short code to redirect (Base62 encoded string)',
    example: 'aB3xY7z',
    schema: {
      type: 'string',
      pattern: '^[0-9A-Za-z]{1,20}$',
      minLength: 1,
      maxLength: 20,
    },
  })
  @ApiResponse({
    status: 301,
    description: 'Redirect to original URL (HTTP 301 Moved Permanently)',
    headers: {
      Location: {
        description: 'The original URL to redirect to',
        schema: {
          type: 'string',
          example: 'https://www.example.com/original-page',
        },
      },
    },
    examples: {
      'Successful redirect': {
        summary: 'Successful redirection',
        value: 'Redirecting to https://www.example.com/original-page...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid short code format',
    type: ErrorResponseDto,
    examples: {
      'Invalid format': {
        summary: 'Invalid short code characters',
        value: {
          statusCode: 400,
          message: 'Invalid short code format',
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Short URL not found',
    type: ErrorResponseDto,
    examples: {
      'Not found': {
        summary: 'Short code does not exist in database',
        value: {
          statusCode: 404,
          message: 'Short URL not found',
          error: 'Not Found',
        },
      },
    },
  })
  async redirect(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    try {
      // First check link metadata to determine status
      const metadata = await this.urlsService.getPublicMeta(shortCode);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Handle different link states with appropriate redirects
      switch (metadata.status) {
        case 'active':
          // Link is active and accessible - proceed with redirect
          const originalUrl = await this.urlsService.redirectToOriginalUrl(
            shortCode,
            req,
          );
          res.status(HttpStatus.MOVED_PERMANENTLY).redirect(originalUrl);
          break;

        case 'password_required':
          // Redirect to password entry page
          res
            .status(HttpStatus.FOUND)
            .redirect(
              `${frontendUrl}/link/${shortCode}?status=password_required`,
            );
          break;

        case 'auth_required':
          // Redirect to login/authentication page
          res
            .status(HttpStatus.FOUND)
            .redirect(
              `${frontendUrl}/login?redirect=/r/${shortCode}&status=auth_required`,
            );
          break;

        case 'not_activated':
          // Redirect to info page showing activation time
          res
            .status(HttpStatus.FOUND)
            .redirect(
              `${frontendUrl}/link/${shortCode}?status=not_activated&activationAt=${metadata.activationAt}`,
            );
          break;

        case 'expired':
          // Redirect to info page showing expiration
          res
            .status(HttpStatus.FOUND)
            .redirect(
              `${frontendUrl}/link/${shortCode}?status=expired&expiredAt=${metadata.expiresAt}`,
            );
          break;

        case 'disabled':
          // Redirect to info page showing link is disabled
          res
            .status(HttpStatus.FOUND)
            .redirect(`${frontendUrl}/link/${shortCode}?status=disabled`);
          break;

        case 'not_found':
        default:
          // Redirect to 404 page
          res.status(HttpStatus.FOUND).redirect(`${frontendUrl}/404?type=link`);
          break;
      }
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (error instanceof BadRequestException) {
        res
          .status(HttpStatus.FOUND)
          .redirect(
            `${frontendUrl}/error?code=400&message=${encodeURIComponent(error.message)}`,
          );
      } else if (error instanceof NotFoundException) {
        res.status(HttpStatus.FOUND).redirect(`${frontendUrl}/404?type=link`);
      } else {
        console.error('Redirect error:', error);
        res
          .status(HttpStatus.FOUND)
          .redirect(
            `${frontendUrl}/error?code=500&message=${encodeURIComponent('Internal server error')}`,
          );
      }
    }
  }
}
