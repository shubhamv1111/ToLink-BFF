import { UAParser } from 'ua-parser-js';
import * as geoip from 'geoip-lite';
import { Request } from 'express';

export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  os?: string;
  browser?: string;
}

export interface LocationInfo {
  country?: string;
  city?: string;
  ip: string;
}

export class AnalyticsUtil {
  /**
   * Extract device information from User-Agent string
   */
  static parseDeviceInfo(userAgent: string): DeviceInfo {
    if (!userAgent) {
      return {
        deviceType: 'unknown',
      };
    }

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Determine device type
    let deviceType: DeviceInfo['deviceType'] = 'unknown';

    if (result.device.type === 'mobile') {
      deviceType = 'mobile';
    } else if (result.device.type === 'tablet') {
      deviceType = 'tablet';
    } else if (result.cpu.architecture || result.os.name) {
      deviceType = 'desktop';
    } else if (this.isBotUserAgent(userAgent)) {
      deviceType = 'bot';
    } else {
      deviceType = 'unknown';
    }

    return {
      deviceType,
      os: result.os.name,
      browser: result.browser.name,
    };
  }

  /**
   * Extract location information from IP address
   */
  static parseLocationInfo(req: Request): LocationInfo {
    // Get IP address from request
    let ip =
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      'unknown';

    // Clean IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // Don't geolocate localhost/private IPs
    if (
      ip === 'unknown' ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return { ip };
    }

    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        return {
          ip,
          country: geo.country,
          city: geo.city,
        };
      }
    } catch (error) {
      console.error('GeoIP lookup failed:', error);
    }

    return { ip };
  }

  /**
   * Extract referrer information
   */
  static parseReferrer(referer?: string): string {
    if (!referer || referer === '') {
      return 'Direct';
    }

    try {
      const url = new URL(referer);
      const hostname = url.hostname.toLowerCase();

      // Common referrer mapping
      if (hostname.includes('google.')) return 'Google';
      if (hostname.includes('facebook.')) return 'Facebook';
      if (hostname.includes('twitter.') || hostname.includes('t.co'))
        return 'Twitter';
      if (hostname.includes('linkedin.')) return 'LinkedIn';
      if (hostname.includes('instagram.')) return 'Instagram';
      if (hostname.includes('youtube.')) return 'YouTube';
      if (hostname.includes('reddit.')) return 'Reddit';
      if (hostname.includes('pinterest.')) return 'Pinterest';
      if (hostname.includes('tiktok.')) return 'TikTok';
      if (hostname.includes('whatsapp.')) return 'WhatsApp';
      if (hostname.includes('telegram.')) return 'Telegram';

      // Search engines
      if (hostname.includes('bing.')) return 'Bing';
      if (hostname.includes('duckduckgo.')) return 'DuckDuckGo';
      if (hostname.includes('yahoo.')) return 'Yahoo';

      // Return hostname for others
      return hostname;
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Check if user agent is from a bot/crawler
   */
  private static isBotUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /googlebot/i,
      /bingbot/i,
      /slurp/i,
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i,
      /whatsapp/i,
      /telegram/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /go-http/i,
    ];

    return botPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Generate date string in YYYY-MM-DD format
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get date range for analytics queries
   */
  static getDateRange(range: string): { start: Date; end: Date } {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    switch (range) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case 'all':
        start.setFullYear(2020); // Far back enough
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);

    return { start, end };
  }
}
