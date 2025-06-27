import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { UrlsModule } from '../urls/urls.module';

@Module({
  imports: [ConfigModule, UrlsModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
