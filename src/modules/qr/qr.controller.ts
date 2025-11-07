import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Header,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { QrService } from './qr.service';
import { QRCodeOptionsDto } from './dto/qr-options.dto';

@ApiTags('QR Code')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get(':shortCode')
  @ApiOperation({
    summary: 'Generate QR code for a short URL',
    description: `
    Generates a QR code for the given short URL.
    Returns the QR code as a data URL (PNG) or SVG string.
    
    **Options:**
    - size: QR code size in pixels (100-1000, default: 300)
    - format: Output format - 'png' or 'svg' (default: 'png')
    - errorCorrectionLevel: Error correction level - 'L', 'M', 'Q', 'H' (default: 'M')
    - margin: Margin around QR code (0-10, default: 4)
    - darkColor: Dark color in hex (default: #000000)
    - lightColor: Light color in hex (default: #ffffff)
    `,
  })
  @ApiParam({
    name: 'shortCode',
    description: 'Short code to generate QR for',
    example: 'abc123',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'QR code size',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['png', 'svg'],
    description: 'Output format',
  })
  @ApiQuery({
    name: 'errorCorrectionLevel',
    required: false,
    enum: ['L', 'M', 'Q', 'H'],
    description: 'Error correction level',
  })
  @ApiQuery({
    name: 'margin',
    required: false,
    type: Number,
    description: 'Margin size',
  })
  @ApiQuery({
    name: 'darkColor',
    required: false,
    type: String,
    description: 'Dark color (hex)',
  })
  @ApiQuery({
    name: 'lightColor',
    required: false,
    type: String,
    description: 'Light color (hex)',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
    schema: {
      type: 'object',
      properties: {
        qrCode: {
          type: 'string',
          description: 'QR code as data URL (PNG) or SVG string',
        },
        shortUrl: { type: 'string', example: 'http://localhost:8080/r/abc123' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Short URL not found',
  })
  async generateQR(
    @Param('shortCode') shortCode: string,
    @Query() options: QRCodeOptionsDto,
  ): Promise<{ qrCode: string; shortUrl: string }> {
    const qrCode = await this.qrService.generateQRCode(shortCode, {
      size: options.size,
      format: options.format,
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: options.margin,
      color: {
        dark: options.darkColor,
        light: options.lightColor,
      },
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
    return {
      qrCode,
      shortUrl: `${baseUrl}/r/${shortCode}`,
    };
  }

  @Get(':shortCode/download')
  @ApiOperation({
    summary: 'Download QR code as PNG image',
    description: `
    Downloads the QR code for the given short URL as a PNG image file.
    The file will be named 'qr-{shortCode}.png'.
    `,
  })
  @ApiParam({
    name: 'shortCode',
    description: 'Short code to generate QR for',
    example: 'abc123',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'QR code size',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code PNG image',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Short URL not found',
  })
  @Header('Content-Type', 'image/png')
  async downloadQR(
    @Param('shortCode') shortCode: string,
    @Query() options: QRCodeOptionsDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.qrService.generateQRCodeBuffer(shortCode, {
      size: options.size,
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: options.margin,
      color: {
        dark: options.darkColor,
        light: options.lightColor,
      },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qr-${shortCode}.png"`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }
}

