import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UrlsController, RedirectController } from './urls.controller';
import { UrlsService } from './urls.service';
import { Url, UrlSchema } from '../../schemas/url.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Url.name, schema: UrlSchema }]),
    ConfigModule,
  ],
  controllers: [UrlsController, RedirectController],
  providers: [UrlsService],
  exports: [UrlsService],
})
export class UrlsModule {}
