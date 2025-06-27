import {
  Controller,
  Get,
  Param,
  Res,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QrService } from './qr.service';

@ApiTags('QR Codes')
@Controller('api/qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get(':shortCode')
  @ApiOperation({ summary: 'Generate QR code for short URL' })
  @ApiParam({
    name: 'shortCode',
    description: 'The short code of the URL',
    example: '0000001',
  })
  @ApiQuery({
    name: 'size',
    description: 'Size of the QR code in pixels (default: 200)',
    example: 200,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
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
  async generateQrCode(
    @Param('shortCode') shortCode: string,
    @Query('size', new ParseIntPipe({ optional: true })) size: number = 200,
    @Res() res: Response,
  ) {
    const qrCodeBuffer = await this.qrService.generateQrCode(shortCode, size);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', qrCodeBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    return res.send(qrCodeBuffer);
  }

  @Get(':shortCode/data-url')
  @ApiOperation({ summary: 'Get QR code as data URL' })
  @ApiParam({
    name: 'shortCode',
    description: 'The short code of the URL',
    example: '0000001',
  })
  @ApiQuery({
    name: 'size',
    description: 'Size of the QR code in pixels (default: 200)',
    example: 200,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'QR code data URL generated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Short URL not found',
  })
  async generateQrCodeDataUrl(
    @Param('shortCode') shortCode: string,
    @Query('size', new ParseIntPipe({ optional: true })) size: number = 200,
  ) {
    const qrCodeDataUrl = await this.qrService.generateQrCodeDataUrl(
      shortCode,
      size,
    );

    return {
      shortCode,
      qrDataUrl: qrCodeDataUrl,
      size,
    };
  }
}
