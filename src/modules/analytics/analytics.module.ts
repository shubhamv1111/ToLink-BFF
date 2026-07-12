import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
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
    AuthModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
