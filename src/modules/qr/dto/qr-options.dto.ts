import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QRCodeOptionsDto {
  @ApiPropertyOptional({
    description: 'QR Code size in pixels',
    example: 300,
    minimum: 100,
    maximum: 1000,
    default: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(1000)
  size?: number;

  @ApiPropertyOptional({
    description: 'Output format',
    enum: ['png', 'svg'],
    example: 'png',
    default: 'png',
  })
  @IsOptional()
  @IsEnum(['png', 'svg'])
  format?: 'png' | 'svg';

  @ApiPropertyOptional({
    description: 'Error correction level',
    enum: ['L', 'M', 'Q', 'H'],
    example: 'M',
    default: 'M',
  })
  @IsOptional()
  @IsEnum(['L', 'M', 'Q', 'H'])
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  @ApiPropertyOptional({
    description: 'Margin around QR code',
    example: 4,
    minimum: 0,
    maximum: 10,
    default: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  margin?: number;

  @ApiPropertyOptional({
    description: 'Dark color (hex)',
    example: '#000000',
    default: '#000000',
  })
  @IsOptional()
  @IsString()
  darkColor?: string;

  @ApiPropertyOptional({
    description: 'Light color (hex)',
    example: '#ffffff',
    default: '#ffffff',
  })
  @IsOptional()
  @IsString()
  lightColor?: string;
}

