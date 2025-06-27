import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { UrlsService } from '../urls/urls.service';

@Injectable()
export class QrService {
  constructor(private readonly urlsService: UrlsService) {}

  /**
   * Generate QR code as PNG buffer for a short code
   */
  async generateQrCode(shortCode: string, size: number = 200): Promise<Buffer> {
    // Verify that the short URL exists
    const url = await this.urlsService.findByShortCode(shortCode);
    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    const shortUrl = `${process.env.BASE_URL || 'http://localhost:8080'}/${shortCode}`;

    try {
      // Generate QR code as PNG buffer
      const qrCodeBuffer = await QRCode.toBuffer(shortUrl, {
        type: 'png',
        width: size,
        margin: 2,
        color: {
          dark: '#000000', // Black dots
          light: '#FFFFFF', // White background
        },
      });

      return qrCodeBuffer;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code as data URL for a short code
   */
  async generateQrCodeDataUrl(
    shortCode: string,
    size: number = 200,
  ): Promise<string> {
    // Verify that the short URL exists
    const url = await this.urlsService.findByShortCode(shortCode);
    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    const shortUrl = `${process.env.BASE_URL || 'http://localhost:8080'}/${shortCode}`;

    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(shortUrl, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000', // Black dots
          light: '#FFFFFF', // White background
        },
      });

      return qrCodeDataUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }
}
