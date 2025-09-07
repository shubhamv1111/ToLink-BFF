import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Url, UrlDocument } from '../../schemas/url.schema';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlResponseDto } from './dto/url-response.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinkListResponseDto, LinkListQueryDto } from './dto/link-list.dto';
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
    const {
      originalUrl,
      customAlias,
      urlName,
      isPrivate,
      hasPassword,
      password,
      activationAt,
      expiresAt,
    } = createUrlDto;

    // Validate and sanitize URL
    if (!this.isValidUrl(originalUrl)) {
      throw new BadRequestException('Invalid URL format');
    }

    const sanitizedUrl = this.sanitizeUrl(originalUrl);

    // Validate private link requires authentication
    if (isPrivate && !userId) {
      throw new BadRequestException(
        'Private links require user authentication',
      );
    }

    // Validate password requirements
    if (hasPassword && !password) {
      throw new BadRequestException(
        'Password is required when hasPassword is true',
      );
    }

    let shortCode: string;

    // Handle custom alias
    if (customAlias) {
      // Validate custom alias format (alphanumeric and hyphens allowed)
      if (!/^[a-z0-9-]+$/.test(customAlias)) {
        throw new BadRequestException(
          'Custom alias must contain only lowercase letters, numbers, and hyphens',
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

    // Validate scheduling
    if (activationAt && expiresAt) {
      const activationDate = new Date(activationAt);
      const expirationDate = new Date(expiresAt);
      if (activationDate >= expirationDate) {
        throw new BadRequestException(
          'Activation date must be before expiration date',
        );
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (hasPassword && password) {
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Create new URL record
    const urlDoc = new this.urlModel({
      shortCode,
      originalUrl: sanitizedUrl,
      urlName: urlName || null,
      userId: userId || null,
      isPrivate: isPrivate || false,
      hasPassword: hasPassword || false,
      passwordHash,
      activationAt: activationAt ? new Date(activationAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      // Set TTL for anonymous links (30 days)
      deleteAt: !userId
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : undefined,
      clicks: 0,
    });

    const savedUrl = await urlDoc.save();

    return this.transformToUrlResponse(savedUrl);
  }

  /**
   * Generate a unique short code with collision detection
   */
  private async generateUniqueShortCode(length: number = 7): Promise<string> {
    for (let attempt = 0; attempt < this.MAX_COLLISION_RETRIES; attempt++) {
      const shortCode = Base62Util.generateRandomShortCode(length);

      const existing = await this.urlModel.findOne({ shortCode }).exec();
      if (!existing) {
        return shortCode;
      }
    }

    // If still colliding, try with longer length
    const longerCode = Base62Util.generateRandomShortCode(length + 1);
    const existing = await this.urlModel
      .findOne({ shortCode: longerCode })
      .exec();
    if (!existing) {
      return longerCode;
    }

    throw new ConflictException(
      'Unable to generate unique short code after multiple attempts',
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
      const cacheData = this.transformToUrlResponse(url);
      this.cache.set(shortCode, cacheData);
    }

    return url;
  }

  /**
   * Redirect to original URL and increment click count
   */
  async redirectToOriginalUrl(shortCode: string, req?: any): Promise<string> {
    // Allow alphanumeric characters and hyphens for short codes and custom aliases
    if (!/^[a-zA-Z0-9-]+$/.test(shortCode)) {
      throw new BadRequestException('Invalid short code format');
    }

    const url = await this.findByShortCode(shortCode);

    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    // Record analytics if request is provided (don't await to minimize redirect latency)
    if (req) {
      this.recordClick(url, req).catch((error) =>
        console.error('Error recording click analytics:', error),
      );
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
          { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
        )
        .exec();

      // Update cache if exists
      const cached = this.cache.get(shortCode);
      if (cached) {
        cached.clicks += 1;
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

    return this.transformToUrlResponse(freshUrl);
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
          { $group: { _id: null, totalClicks: { $sum: '$clicks' } } },
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
   * Validate URL format with comprehensive security checks
   */
  private isValidUrl(url: string): boolean {
    try {
      // Basic format validation
      if (!url || typeof url !== 'string' || url.length > 2048) {
        return false;
      }

      // Remove leading/trailing whitespace
      url = url.trim();

      // Check if URL starts with valid protocol
      if (!url.match(/^https?:\/\//i)) {
        return false;
      }

      const parsedUrl = new URL(url);

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol.toLowerCase())) {
        return false;
      }

      // Block localhost and private IP ranges for security
      const hostname = parsedUrl.hostname.toLowerCase();

      // Block localhost variants
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('127.') ||
        hostname === '::1'
      ) {
        return false;
      }

      // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
      if (
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        hostname.match(/^192\.168\./)
      ) {
        return false;
      }

      // Block suspicious TLDs and domains
      const suspiciousTlds = ['.bit', '.onion', '.i2p', '.exit'];
      if (suspiciousTlds.some((tld) => hostname.endsWith(tld))) {
        return false;
      }

      // Check for valid hostname format
      if (
        !/^[a-zA-Z0-9.-]+$/.test(hostname) ||
        hostname.startsWith('.') ||
        hostname.endsWith('.')
      ) {
        return false;
      }

      // Additional validation for fragment and query length
      if (parsedUrl.hash.length > 1000 || parsedUrl.search.length > 1000) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize and normalize URL
   */
  private sanitizeUrl(url: string): string {
    try {
      // Basic sanitization
      url = url.trim();

      // Parse and reconstruct URL to normalize it
      const parsedUrl = new URL(url);

      // Force HTTPS for common domains (optional security enhancement)
      const httpsOnlyDomains = [
        'facebook.com',
        'twitter.com',
        'linkedin.com',
        'instagram.com',
      ];
      if (
        parsedUrl.protocol === 'http:' &&
        httpsOnlyDomains.some((domain) => parsedUrl.hostname.endsWith(domain))
      ) {
        parsedUrl.protocol = 'https:';
      }

      return parsedUrl.toString();
    } catch {
      return url;
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

  // CRUD Operations for authenticated users

  /**
   * Get paginated list of user links with search and filtering
   */
  async getUserLinks(
    userId: string,
    query: LinkListQueryDto,
  ): Promise<LinkListResponseDto> {
    const {
      search = '',
      filter = 'all',
      limit = 20,
      offset = 0,
      sort = '-createdAt',
    } = query;

    // Build search criteria
    const searchCriteria: any = { userId };

    // Add text search if provided
    if (search) {
      searchCriteria.$or = [
        { originalUrl: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } },
        { urlName: { $regex: search, $options: 'i' } },
      ];
    }

    // Add filter criteria
    const now = new Date();
    switch (filter) {
      case 'active':
        searchCriteria.enabled = true;
        searchCriteria.$or = [
          { activationAt: { $exists: false } },
          { activationAt: { $lte: now } },
        ];
        searchCriteria.$and = [
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: now } },
            ],
          },
        ];
        break;
      case 'expired':
        searchCriteria.expiresAt = { $exists: true, $lt: now };
        break;
      case 'password-protected':
        searchCriteria.hasPassword = true;
        break;
    }

    // Build sort criteria
    const sortCriteria: any = {};
    if (sort.startsWith('-')) {
      sortCriteria[sort.substring(1)] = -1;
    } else {
      sortCriteria[sort] = 1;
    }

    // Execute queries
    const [items, total] = await Promise.all([
      this.urlModel
        .find(searchCriteria)
        .sort(sortCriteria)
        .skip(offset)
        .limit(limit)
        .exec(),
      this.urlModel.countDocuments(searchCriteria).exec(),
    ]);

    return {
      items: items.map((url) => this.transformToUrlResponse(url)),
      total,
    };
  }

  /**
   * Get a specific user link by ID
   */
  async getUserLink(userId: string, linkId: string): Promise<UrlResponseDto> {
    const url = await this.urlModel.findOne({ _id: linkId, userId }).exec();
    if (!url) {
      throw new NotFoundException('Link not found or not owned by user');
    }
    return this.transformToUrlResponse(url);
  }

  /**
   * Update a user link
   */
  async updateUserLink(
    userId: string,
    linkId: string,
    updateDto: UpdateLinkDto,
  ): Promise<UrlResponseDto> {
    const url = await this.urlModel.findOne({ _id: linkId, userId }).exec();
    if (!url) {
      throw new NotFoundException('Link not found or not owned by user');
    }

    // Validate scheduling if provided
    if (updateDto.activationAt && updateDto.expiresAt) {
      const activationDate = new Date(updateDto.activationAt);
      const expirationDate = new Date(updateDto.expiresAt);
      if (activationDate >= expirationDate) {
        throw new BadRequestException(
          'Activation date must be before expiration date',
        );
      }
    }

    // Handle custom alias update
    if (updateDto.customAlias && updateDto.customAlias !== url.shortCode) {
      const existingUrl = await this.urlModel
        .findOne({ shortCode: updateDto.customAlias })
        .exec();
      if (existingUrl) {
        throw new ConflictException('Alias already taken');
      }
      url.shortCode = updateDto.customAlias;
    }

    // Handle password update
    if (updateDto.hasPassword && updateDto.password) {
      const saltRounds = 12;
      url.passwordHash = await bcrypt.hash(updateDto.password, saltRounds);
    } else if (updateDto.hasPassword === false) {
      url.passwordHash = undefined;
    }

    // Handle force activation
    if (updateDto.forceActivate && updateDto.enabled) {
      const now = new Date();
      if (url.activationAt && url.activationAt > now) {
        url.activationAt = undefined;
      }
      if (url.expiresAt && url.expiresAt < now) {
        url.expiresAt = undefined;
      }
    }

    // Handle clear flags
    if (updateDto.clearActivationAt) {
      url.activationAt = undefined;
    }
    if (updateDto.clearExpiresAt) {
      url.expiresAt = undefined;
    }

    // Validate and sanitize originalUrl if provided
    if (updateDto.originalUrl) {
      if (!this.isValidUrl(updateDto.originalUrl)) {
        throw new BadRequestException('Invalid URL format');
      }
      updateDto.originalUrl = this.sanitizeUrl(updateDto.originalUrl);
    }

    // Update other fields
    Object.assign(url, {
      ...updateDto,
      updatedAt: new Date(),
    });

    await url.save();

    // Clear cache for this URL
    this.cache.delete(url.shortCode);

    return this.transformToUrlResponse(url);
  }

  /**
   * Delete a user link
   */
  async deleteUserLink(userId: string, linkId: string): Promise<void> {
    const url = await this.urlModel.findOne({ _id: linkId, userId }).exec();
    if (!url) {
      throw new NotFoundException('Link not found or not owned by user');
    }

    // Clear cache
    this.cache.delete(url.shortCode);

    // Delete the link
    await this.urlModel.deleteOne({ _id: linkId, userId }).exec();
  }

  /**
   * Check alias availability and provide suggestions
   */
  async checkAliasAvailability(
    alias: string,
  ): Promise<{ alias: string; available: boolean; suggestions: string[] }> {
    // Validate alias format
    if (!/^[a-z0-9-]+$/.test(alias)) {
      throw new BadRequestException(
        'Invalid alias format. Only lowercase letters, numbers, and hyphens are allowed.',
      );
    }

    if (alias.length < 3 || alias.length > 32) {
      throw new BadRequestException(
        'Alias must be between 3 and 32 characters',
      );
    }

    // Check against reserved aliases
    const reservedAliases = [
      'about',
      'access',
      'analytics',
      'coming-soon',
      'contact',
      'dashboard',
      'expired',
      'features',
      'forgot-password',
      'login',
      'not-activated',
      'profile',
      'qr-code',
      'signup',
      'api',
      'r',
      'v1',
      'robots',
      'favicon',
      'sitemap',
      'admin',
      'auth',
      'static',
      'assets',
      'health',
    ];

    if (reservedAliases.includes(alias.toLowerCase())) {
      return {
        alias,
        available: false,
        suggestions: this.generateAliasSuggestions(alias),
      };
    }

    // Check database
    const existingUrl = await this.urlModel
      .findOne({ shortCode: alias })
      .exec();
    const available = !existingUrl;

    return {
      alias,
      available,
      suggestions: available ? [] : this.generateAliasSuggestions(alias),
    };
  }

  /**
   * Suggest a short code
   */
  async suggestShortCode(
    length?: number,
    seed?: string,
  ): Promise<{ shortCode: string }> {
    const codeLength = Math.max(5, Math.min(12, length || 7));
    let shortCode: string;

    if (seed) {
      // Generate based on seed (not guaranteed to be deterministic)
      shortCode = Base62Util.generateHashBasedShortCode(
        seed + Date.now().toString(),
        codeLength,
      );
    } else {
      shortCode = await this.generateUniqueShortCode(codeLength);
    }

    return { shortCode };
  }

  /**
   * Transform Url document to response DTO
   */
  private transformToUrlResponse(url: UrlDocument): UrlResponseDto {
    return {
      id: url._id as string,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/r/${url.shortCode}`,
      clicks: url.clicks || 0,
      createdAt: url.createdAt.toISOString(),
      lastClicked: url.lastClicked?.toISOString(),
      isPrivate: url.isPrivate || false,
      hasPassword: url.hasPassword || false,
      urlName: url.urlName,
      activationAt: url.activationAt?.toISOString(),
      expiresAt: url.expiresAt?.toISOString(),
      enabled: url.enabled !== false,
    };
  }

  /**
   * Generate alias suggestions
   */
  private generateAliasSuggestions(alias: string): string[] {
    const suggestions: string[] = [];
    const timestamp = Date.now().toString(36).slice(-4);

    for (let i = 1; i <= 3; i++) {
      suggestions.push(`${alias}-${i}`);
    }
    suggestions.push(`${alias}-${timestamp}`);

    return suggestions;
  }

  // Public Link Access Methods

  /**
   * Get public metadata for a link (no destination URL exposed)
   */
  async getPublicMeta(shortCode: string): Promise<any> {
    const url = await this.urlModel.findOne({ shortCode }).exec();
    if (!url) {
      throw new NotFoundException('Link not found');
    }

    const now = new Date();
    let status = 'active';

    // Check if disabled
    if (url.enabled === false) {
      status = 'disabled';
    }
    // Check activation
    else if (url.activationAt && url.activationAt > now) {
      status = 'not_activated';
    }
    // Check expiration
    else if (url.expiresAt && url.expiresAt < now) {
      status = 'expired';
    }
    // Check if password required
    else if (url.hasPassword) {
      status = 'password_required';
    }
    // Check if private (requires auth)
    else if (url.isPrivate) {
      status = 'auth_required';
    }

    return {
      shortCode: url.shortCode,
      status,
      hasPassword: url.hasPassword || false,
      isPrivate: url.isPrivate || false,
      activationAt: url.activationAt?.toISOString() || null,
      expiresAt: url.expiresAt?.toISOString() || null,
      urlName: url.urlName || null,
    };
  }

  /**
   * Verify link access and return redirect token
   */
  async verifyLinkAccess(
    shortCode: string,
    password?: string,
    userId?: string,
  ): Promise<{ redirectToken: string; redirectUrl: string }> {
    const url = await this.urlModel.findOne({ shortCode }).exec();
    if (!url) {
      throw new NotFoundException('Link not found');
    }

    const now = new Date();

    // Check if disabled
    if (url.enabled === false) {
      throw new ConflictException('Link is disabled');
    }

    // Check activation
    if (url.activationAt && url.activationAt > now) {
      throw new ConflictException('Link is not yet activated');
    }

    // Check expiration
    if (url.expiresAt && url.expiresAt < now) {
      throw new ConflictException('Link has expired');
    }

    // Check if private link requires authentication
    if (url.isPrivate && !userId) {
      throw new UnauthorizedException(
        'Authentication required for private link',
      );
    }

    // Check password if required
    if (url.hasPassword && url.passwordHash) {
      if (!password) {
        throw new UnauthorizedException('Password required');
      }

      const isPasswordValid = await bcrypt.compare(password, url.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    // Generate short-lived redirect token (60 seconds)
    const redirectToken = this.generateRedirectToken(url._id.toString());
    const redirectUrl = `/v1/links/${shortCode}/redirect?token=${redirectToken}`;

    return {
      redirectToken,
      redirectUrl,
    };
  }

  /**
   * Validate redirect token and return destination URL
   */
  async validateTokenAndRedirect(
    shortCode: string,
    token: string,
    req: any,
  ): Promise<string> {
    if (!token) {
      throw new BadRequestException('Redirect token required');
    }

    // Validate and decode token
    const linkId = this.validateRedirectToken(token);

    const url = await this.urlModel.findOne({ _id: linkId, shortCode }).exec();
    if (!url) {
      throw new NotFoundException('Link not found');
    }

    // Re-check link status (security measure)
    const now = new Date();
    if (
      url.enabled === false ||
      (url.activationAt && url.activationAt > now) ||
      (url.expiresAt && url.expiresAt < now)
    ) {
      throw new ConflictException('Link is no longer accessible');
    }

    // Record click analytics
    await this.recordClick(url, req);

    // Increment click count
    await this.urlModel
      .updateOne(
        { _id: url._id },
        {
          $inc: { clicks: 1 },
          $set: {
            lastClicked: new Date(),
            updatedAt: new Date(),
          },
        },
      )
      .exec();

    return url.originalUrl;
  }

  /**
   * Generate a short-lived redirect token (JWT)
   */
  private generateRedirectToken(linkId: string): string {
    // Simple base64 encoding with timestamp for basic security
    // In production, use proper JWT with secret
    const payload = {
      linkId,
      exp: Date.now() + 60 * 1000, // 60 seconds
      nonce: Math.random().toString(36).substring(7),
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Validate redirect token and extract link ID
   */
  private validateRedirectToken(token: string): string {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString());

      // Check expiration
      if (Date.now() > payload.exp) {
        throw new BadRequestException('Redirect token has expired');
      }

      return payload.linkId;
    } catch (error) {
      throw new BadRequestException('Invalid redirect token');
    }
  }

  /**
   * Record detailed click analytics
   */
  private async recordClick(url: any, req: any): Promise<void> {
    try {
      // Import analytics utilities dynamically to avoid circular dependencies
      const { AnalyticsUtil } = await import('../../utils/analytics.util');

      // Extract device and location information
      const userAgent = req.headers['user-agent'] || '';
      const deviceInfo = AnalyticsUtil.parseDeviceInfo(userAgent);
      const locationInfo = AnalyticsUtil.parseLocationInfo(req);
      const referrer = AnalyticsUtil.parseReferrer(
        req.headers.referer as string,
      );

      // Create comprehensive click record
      const clickData = {
        linkId: url._id,
        ts: new Date(),
        ip: locationInfo.ip,
        country: locationInfo.country,
        city: locationInfo.city,
        referrer,
        deviceType: deviceInfo.deviceType,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
      };

      console.log(`📊 Click analytics for ${url.shortCode}:`, {
        device: deviceInfo.deviceType,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        country: locationInfo.country,
        city: locationInfo.city,
        referrer,
        ip: locationInfo.ip,
      });

      // TODO: In full implementation, save to clicks collection:
      // await this.clicksModel.create(clickData);

      // TODO: Update daily aggregates:
      // await this.updateDailyStats(url._id, new Date());
    } catch (error) {
      console.error('❌ Error recording click analytics:', error);
      // Continue execution - analytics failure shouldn't break redirect
    }
  }
}
