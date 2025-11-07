import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { Url, UrlDocument } from '../../schemas/url.schema';

export interface QRCodeOptions {
  size?: number;
  format?: 'png' | 'svg';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

@Injectable()
export class QrService {
  constructor(
    @InjectModel(Url.name) private urlModel: Model<UrlDocument>,
    private configService: ConfigService,
  ) {}

  async generateQRCode(
    shortCode: string,
    options: QRCodeOptions = {},
  ): Promise<string> {
    // Verify the short code exists
    const url = await this.urlModel.findOne({ shortCode }).exec();
    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:8080';
    const fullUrl = `${baseUrl}/r/${shortCode}`;

    const {
      size = 300,
      format = 'png',
      errorCorrectionLevel = 'M',
      margin = 4,
      color = { dark: '#000000', light: '#ffffff' },
    } = options;

    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel,
      type: 'image/png',
      quality: 0.92,
      margin,
      color: {
        dark: color.dark || '#000000',
        light: color.light || '#ffffff',
      },
      width: size,
    };

    try {
      if (format === 'svg') {
        // Generate SVG
        const svgString = await QRCode.toString(fullUrl, {
          type: 'svg',
          errorCorrectionLevel,
          margin,
          color: {
            dark: color.dark || '#000000',
            light: color.light || '#ffffff',
          },
          width: size,
        });
        return svgString;
      } else {
        // Generate PNG as data URL
        const dataUrl = await QRCode.toDataURL(fullUrl, qrOptions);
        return dataUrl;
      }
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  async generateQRCodeBuffer(
    shortCode: string,
    options: QRCodeOptions = {},
  ): Promise<Buffer> {
    // Verify the short code exists
    const url = await this.urlModel.findOne({ shortCode }).exec();
    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:8080';
    const fullUrl = `${baseUrl}/r/${shortCode}`;

    const {
      size = 300,
      errorCorrectionLevel = 'M',
      margin = 4,
      color = { dark: '#000000', light: '#ffffff' },
    } = options;

    try {
      const buffer = await QRCode.toBuffer(fullUrl, {
        errorCorrectionLevel,
        margin,
        color: {
          dark: color.dark || '#000000',
          light: color.light || '#ffffff',
        },
        width: size,
      });
      return buffer;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }
}

