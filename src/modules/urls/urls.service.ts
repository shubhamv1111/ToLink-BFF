import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Url, UrlDocument } from '../../schemas/url.schema';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlResponseDto } from './dto/url-response.dto';
import { Base62Util } from '../../utils/base62.util';
import { InMemoryCache } from '../../utils/cache.util';

@Injectable()
export class UrlsService {
  private cache = new InMemoryCache<UrlResponseDto>();

  // Configuration for short code generation
  private readonly SHORT_CODE_LENGTH = 7;
  private readonly MAX_COLLISION_RETRIES = 10;

  constructor(@InjectModel(Url.name) private urlModel: Model<Url>) {}

  /**
   * Shorten a long URL with collision detection and retry logic
   */
  async shortenUrl(
    createUrlDto: CreateUrlDto,
    userId?: string,
  ): Promise<UrlResponseDto> {
    const { originalUrl, customAlias, name } = createUrlDto;

    // Validate URL format
    if (!this.isValidUrl(originalUrl)) {
      throw new BadRequestException('Invalid URL format');
    }

    let shortCode: string;

    // Handle custom alias
    if (customAlias) {
      // Validate custom alias format (alphanumeric and hyphens allowed)
      if (!/^[a-zA-Z0-9-]+$/.test(customAlias)) {
        throw new BadRequestException(
          'Custom alias must contain only alphanumeric characters and hyphens (0-9, A-Z, a-z, -)',
        );
      }

      // Check if custom alias already exists
      const existingUrl = await this.findByShortCode(customAlias);
      if (existingUrl) {
        throw new BadRequestException('Custom alias already exists');
      }

      shortCode = customAlias;
    } else {
      // Generate random short code with collision detection
      shortCode = await this.generateUniqueShortCode();
    }

    // Check if URL already exists (optional deduplication)
    const existingUrl = await this.urlModel.findOne({ originalUrl }).exec();
    if (existingUrl) {
      // Return existing short code for the same URL
      const response: UrlResponseDto = {
        shortCode: existingUrl.shortCode,
        originalUrl: existingUrl.originalUrl,
        shortUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/r/${existingUrl.shortCode}`,
        customAlias: existingUrl.customAlias,
        name: existingUrl.name,
        clickCount: existingUrl.clickCount,
        createdAt: existingUrl.createdAt,
      };

      // Cache the result
      this.cache.set(existingUrl.shortCode, response);
      return response;
    }

    // Create new URL record
    const urlDoc = new this.urlModel({
      shortCode,
      originalUrl,
      customAlias: customAlias || null,
      name: name || null,
      userId: userId || null,
      clickCount: 0,
    });

    const savedUrl = await urlDoc.save();

    const response: UrlResponseDto = {
      shortCode: savedUrl.shortCode,
      originalUrl: savedUrl.originalUrl,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/r/${savedUrl.shortCode}`,
      customAlias: savedUrl.customAlias,
      name: savedUrl.name,
      clickCount: savedUrl.clickCount,
      createdAt: savedUrl.createdAt,
    };

    // Cache the result
    this.cache.set(shortCode, response);

    return response;
  }

  /**
   * Generate a unique short code with collision detection
   */
  private async generateUniqueShortCode(): Promise<string> {
    let attempts = 0;

    while (attempts < this.MAX_COLLISION_RETRIES) {
      // Generate cryptographically secure random short code
      const shortCode = Base62Util.generateSecureRandomShortCode(
        this.SHORT_CODE_LENGTH,
      );

      // Check for collision in database
      const existingUrl = await this.urlModel.findOne({ shortCode }).exec();

      if (!existingUrl) {
        // No collision, return the unique short code
        return shortCode;
      }

      attempts++;
    }

    // If we've exhausted retries, throw an error
    throw new Error(
      'Unable to generate unique short code after maximum retries',
    );
  }

  /**
   * Find URL by short code with caching
   */
  async findByShortCode(shortCode: string): Promise<Url | null> {
    // Check cache first
    const cached = this.cache.get(shortCode);
    if (cached) {
      // We know it exists, so we just need to return the basic structure
      // We'll still query the database for full data
      const url = await this.urlModel.findOne({ shortCode }).exec();
      return url;
    }

    // Query database
    const url = await this.urlModel.findOne({ shortCode }).exec();

    if (url) {
      // Cache the result
      const cacheData: UrlResponseDto = {
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        shortUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/r/${url.shortCode}`,
        customAlias: url.customAlias,
        name: url.name,
        clickCount: url.clickCount,
        createdAt: url.createdAt,
      };
      this.cache.set(shortCode, cacheData);
    }

    return url;
  }

  /**
   * Redirect to original URL and increment click count
   */
  async redirectToOriginalUrl(shortCode: string): Promise<string> {
    // Allow alphanumeric characters and hyphens for short codes and custom aliases
    if (!/^[a-zA-Z0-9-]+$/.test(shortCode)) {
      throw new BadRequestException('Invalid short code format');
    }

    const url = await this.findByShortCode(shortCode);

    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    // Increment click count asynchronously (don't wait for it)
    this.incrementClickCount(shortCode).catch((error) => {
      console.error('Failed to increment click count:', error);
    });

    return url.originalUrl;
  }

  /**
   * Increment click count for analytics
   */
  private async incrementClickCount(shortCode: string): Promise<void> {
    try {
      await this.urlModel
        .updateOne(
          { shortCode },
          { $inc: { clickCount: 1 }, $set: { updatedAt: new Date() } },
        )
        .exec();

      // Update cache if exists
      const cached = this.cache.get(shortCode);
      if (cached) {
        cached.clickCount += 1;
        this.cache.set(shortCode, cached);
      }
    } catch (error) {
      console.error('Error incrementing click count:', error);
    }
  }

  /**
   * Get URL statistics
   */
  async getUrlStats(shortCode: string): Promise<UrlResponseDto> {
    // Allow alphanumeric characters and hyphens for short codes and custom aliases
    if (!/^[a-zA-Z0-9-]+$/.test(shortCode)) {
      throw new BadRequestException('Invalid short code format');
    }

    const url = await this.findByShortCode(shortCode);

    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    // Get fresh data from database for accurate stats
    const freshUrl = await this.urlModel.findOne({ shortCode }).exec();

    if (!freshUrl) {
      throw new NotFoundException('Short URL not found in database');
    }

    const response: UrlResponseDto = {
      shortCode: freshUrl.shortCode,
      originalUrl: freshUrl.originalUrl,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/r/${freshUrl.shortCode}`,
      customAlias: freshUrl.customAlias,
      name: freshUrl.name,
      clickCount: freshUrl.clickCount,
      createdAt: freshUrl.createdAt,
    };

    // Update cache with fresh data
    this.cache.set(shortCode, response);

    return response;
  }

  /**
   * Get system health statistics
   */
  async getHealthStats(): Promise<{
    totalUrls: number;
    totalClicks: number;
    cacheSize: number;
    base62Stats: {
      totalPossible: string;
      humanReadable: string;
    };
  }> {
    try {
      const totalUrls = await this.urlModel.countDocuments().exec();
      const clickStats = await this.urlModel
        .aggregate([
          { $group: { _id: null, totalClicks: { $sum: '$clickCount' } } },
        ])
        .exec();

      const totalClicks = clickStats.length > 0 ? clickStats[0].totalClicks : 0;
      const cacheSize = this.cache.size();

      // Calculate Base62 encoding capacity (62^7 possible combinations)
      const totalPossible = BigInt(Math.pow(62, this.SHORT_CODE_LENGTH));

      // Format large numbers in human-readable format
      const formatNumber = (num: bigint): string => {
        const trillion = BigInt(1000000000000);
        const billion = BigInt(1000000000);
        const million = BigInt(1000000);

        if (num >= trillion) {
          return `${(Number(num) / 1000000000000).toFixed(1)}T`;
        } else if (num >= billion) {
          return `${(Number(num) / 1000000000).toFixed(1)}B`;
        } else if (num >= million) {
          return `${(Number(num) / 1000000).toFixed(1)}M`;
        } else {
          return num.toString();
        }
      };

      return {
        totalUrls,
        totalClicks,
        cacheSize,
        base62Stats: {
          totalPossible: totalPossible.toString(),
          humanReadable: formatNumber(totalPossible),
        },
      };
    } catch (error) {
      console.error('Error getting health stats:', error);
      // Return default stats if there's an error
      return {
        totalUrls: 0,
        totalClicks: 0,
        cacheSize: 0,
        base62Stats: {
          totalPossible: '3521614606208',
          humanReadable: '3.5T',
        },
      };
    }
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

  /**
   * Clear cache (for testing or maintenance)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; capacity: number } {
    return {
      size: this.cache.size(),
      capacity: 10000, // Default capacity from CacheUtil
    };
  }
}
