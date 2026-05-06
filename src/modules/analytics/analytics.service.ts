import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Url, UrlDocument } from '../../schemas/url.schema';
import { Clicks, ClicksDocument } from '../../schemas/analytics.schema';
import {
  DailyLinkStats,
  DailyLinkStatsDocument,
} from '../../schemas/daily-link-stats.schema';
import {
  AnalyticsOverviewDto,
  AnalyticsQueryDto,
  DeviceBreakdownDto,
  ReferrerDto,
  CountryDto,
  StatsDto,
} from './dto/analytics-overview.dto';
import {
  ClicksSeriesDto,
  ClicksSeriesQueryDto,
  ClickSeriesDataPointDto,
} from './dto/clicks-series.dto';
import {
  ClicksPerUrlDto,
  ClicksPerUrlQueryDto,
} from './dto/clicks-per-url.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Url.name) private urlModel: Model<UrlDocument>,
    @InjectModel(Clicks.name) private clicksModel: Model<ClicksDocument>,
    @InjectModel(DailyLinkStats.name)
    private dailyStatsModel: Model<DailyLinkStatsDocument>,
  ) {}

  /**
   * Get analytics overview with device, referrer, country breakdown and stats
   */
  async getOverview(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverviewDto> {
    const { scope = 'user', linkId, range = '30d' } = query;

    // Build date range
    const dateRange = this.getDateRange(range);

    // Build link criteria
    const linkCriteria = this.buildLinkCriteria(scope, userId, linkId);

    // Get user's link IDs for the scope
    const userLinks = await this.urlModel
      .find(linkCriteria)
      .select('_id clicks')
      .exec();
    const linkIds = userLinks.map((link) => link._id);

    if (linkIds.length === 0) {
      return this.getEmptyOverview();
    }

    // Calculate real stats from user's links
    const totalClicks = userLinks.reduce(
      (sum, link) => sum + (link.clicks || 0),
      0,
    );
    const totalLinks = userLinks.length;

    // TODO: When clicks collection is populated, query real analytics data:
    // const deviceBreakdown = await this.getDeviceBreakdown(linkIds, dateRange);
    // const referrers = await this.getReferrerStats(linkIds, dateRange);
    // const countries = await this.getCountryStats(linkIds, dateRange);

    // For now, return enhanced mock data based on actual link counts
    return this.getEnhancedMockData(totalClicks, totalLinks);
  }

  /**
   * Get clicks time series data
   */
  async getClicksSeries(
    userId: string,
    query: ClicksSeriesQueryDto,
  ): Promise<ClicksSeriesDto> {
    const {
      scope = 'user',
      linkId,
      granularity = 'day',
      range = '30d',
    } = query;

    // Build date range
    const dateRange = this.getDateRange(range);

    // Build link criteria
    const linkCriteria = this.buildLinkCriteria(scope, userId, linkId);

    if (scope === 'link' && linkId) {
      // Get single link series
      const series = await this.getLinkClicksSeries(linkId, dateRange);
      return { series };
    } else {
      // Get user aggregate series
      const series = await this.getUserClicksSeries(userId, dateRange);
      return { series };
    }
  }

  /**
   * Get per-URL clicks series for computing deltas
   */
  async getClicksPerUrl(
    userId: string,
    query: ClicksPerUrlQueryDto,
  ): Promise<ClicksPerUrlDto> {
    const { range = '30d' } = query;

    // Build date range
    const dateRange = this.getDateRange(range);

    // Get user's links
    const userLinks = await this.urlModel.find({ userId }).select('_id').exec();
    const perUrl: Record<string, ClickSeriesDataPointDto[]> = {};

    // Get series for each link
    for (const link of userLinks) {
      const linkId = (link._id as any).toString();
      const series = await this.getLinkClicksSeries(linkId, dateRange);
      perUrl[linkId] = series;
    }

    return { perUrl };
  }

  /**
   * Get clicks series for a single link
   */
  private async getLinkClicksSeries(
    linkId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<ClickSeriesDataPointDto[]> {
    // Try to get real data from daily stats
    try {
      const stats = await this.dailyStatsModel
        .find({
          linkId,
          date: { $gte: dateRange.start, $lte: dateRange.end },
        })
        .sort({ date: 1 })
        .exec();

      if (stats && stats.length > 0) {
        return stats.map((stat) => ({
          date: stat.date,
          clicks: stat.clicks,
        }));
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }

    // Fall back to mock data if no real data exists
    return this.generateMockSeries(dateRange);
  }

  /**
   * Get aggregated clicks series for all user links
   */
  private async getUserClicksSeries(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<ClickSeriesDataPointDto[]> {
    // Get all user links
    const userLinks = await this.urlModel
      .find({ userId })
      .select('_id')
      .exec();
    const linkIds = userLinks.map((link) => link._id);

    if (linkIds.length === 0) {
      return [];
    }

    try {
      // Aggregate daily stats across all user links
      const stats = await this.dailyStatsModel
        .aggregate([
          {
            $match: {
              linkId: { $in: linkIds },
              date: { $gte: dateRange.start, $lte: dateRange.end },
            },
          },
          {
            $group: {
              _id: '$date',
              clicks: { $sum: '$clicks' },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ])
        .exec();

      if (stats && stats.length > 0) {
        return stats.map((stat) => ({
          date: new Date(stat._id).toISOString().split('T')[0],
          clicks: stat.clicks,
        }));
      }
    } catch (error) {
      console.error('Error aggregating user stats:', error);
    }

    // Fall back to mock data if no real data exists
    return this.generateMockSeries(dateRange);
  }

  /**
   * Build link criteria based on scope
   */
  private buildLinkCriteria(
    scope: string,
    userId: string,
    linkId?: string,
  ): any {
    if (scope === 'link' && linkId) {
      return { _id: linkId, userId };
    }
    return { userId };
  }

  /**
   * Get date range based on range parameter
   */
  private getDateRange(range: string): { start: Date; end: Date } {
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

  /**
   * Generate mock series data for testing
   */
  private generateMockSeries(dateRange: {
    start: Date;
    end: Date;
  }): ClickSeriesDataPointDto[] {
    const series: ClickSeriesDataPointDto[] = [];
    const currentDate = new Date(dateRange.start);

    while (currentDate <= dateRange.end) {
      series.push({
        date: currentDate.toISOString().split('T')[0],
        clicks: Math.floor(Math.random() * 50) + 1, // Random clicks 1-50
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return series;
  }

  /**
   * Get empty overview for when no data exists
   */
  private getEmptyOverview(): AnalyticsOverviewDto {
    return {
      deviceBreakdown: [],
      referrers: [{ source: 'Direct', clicks: 0 }],
      countries: [],
      stats: {
        clickRate: '0.0%',
        uniqueVisitorsRatio: 0,
        changes: {
          totalClicks: '0%',
          totalClicksTrend: 'neutral',
          uniqueVisitors: '0%',
          uniqueVisitorsTrend: 'neutral',
          clickRate: '0%',
          clickRateTrend: 'neutral',
          avgDailyClicks: '0%',
          avgDailyClicksTrend: 'neutral',
        },
      },
    };
  }

  /**
   * Get enhanced mock data based on actual user stats
   */
  private getEnhancedMockData(
    totalClicks: number,
    totalLinks: number,
  ): AnalyticsOverviewDto {
    // Scale mock data based on actual clicks
    const scaleFactor = Math.max(1, totalClicks / 100);
    const desktopClicks = Math.round(45 * scaleFactor);
    const mobileClicks = Math.round(35 * scaleFactor);
    const tabletClicks = Math.round(20 * scaleFactor);

    return {
      deviceBreakdown: [
        { name: 'Desktop', value: desktopClicks, color: '#3B82F6' },
        { name: 'Mobile', value: mobileClicks, color: '#10B981' },
        { name: 'Tablet', value: tabletClicks, color: '#F59E0B' },
      ],
      referrers: [
        { source: 'Direct', clicks: Math.round(180 * scaleFactor) },
        { source: 'Google', clicks: Math.round(120 * scaleFactor) },
        { source: 'Social Media', clicks: Math.round(85 * scaleFactor) },
        { source: 'Email', clicks: Math.round(45 * scaleFactor) },
      ],
      countries: [
        {
          country: 'United States',
          clicks: Math.round(234 * scaleFactor),
          percentage: 45,
          cities: [
            { city: 'New York', clicks: Math.round(120 * scaleFactor) },
            { city: 'Los Angeles', clicks: Math.round(78 * scaleFactor) },
            { city: 'Chicago', clicks: Math.round(36 * scaleFactor) },
          ],
        },
        {
          country: 'United Kingdom',
          clicks: Math.round(156 * scaleFactor),
          percentage: 30,
          cities: [
            { city: 'London', clicks: Math.round(98 * scaleFactor) },
            { city: 'Manchester', clicks: Math.round(35 * scaleFactor) },
            { city: 'Birmingham', clicks: Math.round(23 * scaleFactor) },
          ],
        },
      ],
      stats: {
        clickRate:
          totalLinks > 0
            ? `${((totalClicks / totalLinks) * 100).toFixed(1)}%`
            : '0%',
        uniqueVisitorsRatio: 0.75,
        changes: {
          totalClicks: totalClicks > 50 ? '+12%' : '+5%',
          totalClicksTrend: 'up',
          uniqueVisitors: '+8%',
          uniqueVisitorsTrend: 'up',
          clickRate: totalClicks > 100 ? '+15%' : '-2%',
          clickRateTrend: totalClicks > 100 ? 'up' : 'down',
          avgDailyClicks: '+15%',
          avgDailyClicksTrend: 'up',
        },
      },
    };
  }

  /**
   * Get mock overview data for testing (fallback)
   */
  private getMockOverviewData(): AnalyticsOverviewDto {
    return this.getEnhancedMockData(100, 5);
  }
}
