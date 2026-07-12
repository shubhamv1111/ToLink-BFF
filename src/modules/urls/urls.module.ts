import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UrlsController, RedirectController } from './urls.controller';
import { UrlsService } from './urls.service';
import { Url, UrlSchema } from '../../schemas/url.schema';
import { Clicks, ClicksSchema } from '../../schemas/analytics.schema';
import {
  DailyLinkStats,
  DailyLinkStatsSchema,
} from '../../schemas/daily-link-stats.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Url.name, schema: UrlSchema },
      { name: Clicks.name, schema: ClicksSchema },
      { name: DailyLinkStats.name, schema: DailyLinkStatsSchema },
    ]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [UrlsController, RedirectController],
  providers: [UrlsService],
  exports: [UrlsService],
})
export class UrlsModule {}
