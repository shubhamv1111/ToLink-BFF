import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UrlsService } from './urls.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlResponseDto } from './dto/url-response.dto';

// Swagger response examples
class HealthStatsDto {
  @ApiProperty({
    example: 150,
    description: 'Total number of URLs shortened',
  })
  totalUrls: number;

  @ApiProperty({
    example: 2847,
    description: 'Total number of redirections/clicks',
  })
  totalClicks: number;

  @ApiProperty({
    example: 25,
    description: 'Number of URLs cached in memory',
  })
  cacheSize: number;

  @ApiProperty({
    example: {
      totalPossible: '3521614606208',
      humanReadable: '3.5T',
    },
    description: 'Base62 encoding capacity statistics',
  })
  base62Stats: {
    totalPossible: string;
    humanReadable: string;
  };
}

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
@Controller('api')
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post('shorten')
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
          shortUrl: 'http://localhost:8080/aB3xY7z',
          clickCount: 0,
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      },
      'Custom alias example': {
        summary: 'Custom alias result',
        value: {
          shortCode: 'nestjs',
          originalUrl: 'https://github.com/nestjs/nest',
          shortUrl: 'http://localhost:8080/nestjs',
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
  ): Promise<UrlResponseDto> {
    return this.urlsService.shortenUrl(createUrlDto);
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
          shortUrl: 'http://localhost:8080/aB3xY7z',
          clickCount: 1247,
          createdAt: '2024-01-10T08:15:30.000Z',
        },
      },
      'New URL stats': {
        summary: 'Recently created URL',
        value: {
          shortCode: 'xYz123A',
          originalUrl: 'https://docs.example.com/guide',
          shortUrl: 'http://localhost:8080/xYz123A',
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

  @Get('health')
  @ApiOperation({
    summary: 'Get system health and statistics',
    description: `
    Provides comprehensive system health information including:
    
    **Database Statistics:**
    - Total number of URLs shortened
    - Total number of redirections (clicks)
    
    **Performance Metrics:**
    - Current cache size and hit ratio
    - System capacity information
    
    **Base62 Encoding Stats:**
    - Total possible combinations with current encoding length
    - Human-readable capacity information
    
    This endpoint is useful for monitoring system performance and capacity planning.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'System health statistics',
    type: HealthStatsDto,
    examples: {
      'Healthy system': {
        summary: 'System with moderate usage',
        value: {
          totalUrls: 1543,
          totalClicks: 28794,
          cacheSize: 127,
          base62Stats: {
            totalPossible: '3521614606208',
            humanReadable: '3.5T',
          },
        },
      },
      'New system': {
        summary: 'Recently deployed system',
        value: {
          totalUrls: 12,
          totalClicks: 45,
          cacheSize: 8,
          base62Stats: {
            totalPossible: '3521614606208',
            humanReadable: '3.5T',
          },
        },
      },
    },
  })
  async getHealth(): Promise<HealthStatsDto> {
    return this.urlsService.getHealthStats();
  }
}

@Controller()
export class RedirectController {
  constructor(private readonly urlsService: UrlsService) {}

  @Get(':shortCode')
  @ApiTags('Redirection')
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
  ): Promise<void> {
    try {
      const originalUrl =
        await this.urlsService.redirectToOriginalUrl(shortCode);
      // HTTP 301 Moved Permanently - indicates the redirect is permanent
      res.status(HttpStatus.MOVED_PERMANENTLY).redirect(originalUrl);
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: error.message,
          error: 'Bad Request',
        });
      } else if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: error.message,
          error: 'Not Found',
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
        });
      }
    }
  }
}
