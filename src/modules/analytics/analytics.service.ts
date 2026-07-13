import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Url, UrlDocument } from '../../schemas/url.schema';
import { Clicks, ClicksDocument } from '../../schemas/analytics.schema';
import {
  DailyLinkStats,
  DailyLinkStatsDocument,
} from '../../schemas/daily-link-stats.schema';
import {
  AnalyticsOverviewDto,
  AnalyticsQueryDto,
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
import { AnalyticsUtil } from '../../utils/analytics.util';

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#3B82F6',
  mobile: '#10B981',
  tablet: '#F59E0B',
  bot: '#8B5CF6',
  unknown: '#6B7280',
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Url.name) private urlModel: Model<UrlDocument>,
    @InjectModel(Clicks.name) private clicksModel: Model<ClicksDocument>,
    @InjectModel(DailyLinkStats.name)
    private dailyStatsModel: Model<DailyLinkStatsDocument>,
  ) {}

  /**
   * Get analytics overview with real device, referrer, country breakdown
   */
  async getOverview(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverviewDto> {
    const { scope = 'user', linkId, range = '30d' } = query;
    const dateRange = this.getDateRange(range);

    // Resolve link IDs for this user/scope
    const linkCriteria = this.buildLinkCriteria(scope, userId, linkId);
    const userLinks = await this.urlModel
      .find(linkCriteria)
      .select('_id clicks')
      .exec();

    if (userLinks.length === 0) {
      return this.getEmptyOverview();
    }

    const linkIds = userLinks.map((l) => l._id);
    const urlClicksTotal = userLinks.reduce((s, l) => s + (l.clicks || 0), 0);
    const totalLinks = userLinks.length;

    // Base match for clicks within date range for these links
    const clicksMatch = {
      linkId: { $in: linkIds },
      ts: { $gte: dateRange.start, $lte: dateRange.end },
    };

    const [clicksInRange, uniqueVisitors] = await Promise.all([
      this.clicksModel.countDocuments(clicksMatch).exec(),
      this.clicksModel.distinct('ip', clicksMatch).exec(),
    ]);

    const totalClicks = clicksInRange > 0 ? clicksInRange : urlClicksTotal;
    const uniqueVisitorCount = uniqueVisitors.filter(
      (ip) => ip && ip !== 'unknown',
    ).length;
    const rangeDays = this.getRangeDayCount(range, dateRange);
    const avgDailyClicks =
      rangeDays > 0 ? Math.round(totalClicks / rangeDays) : 0;

    // Device breakdown from real clicks
    const deviceAgg = await this.clicksModel
      .aggregate([
        { $match: clicksMatch },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .exec();

    const deviceBreakdown = deviceAgg.map((d) => ({
      name:
        d._id.charAt(0).toUpperCase() + d._id.slice(1),
      value: d.count,
      color: DEVICE_COLORS[d._id] || '#6B7280',
    }));

    // Referrer breakdown
    const referrerAgg = await this.clicksModel
      .aggregate([
        { $match: clicksMatch },
        {
          $group: {
            _id: { $ifNull: ['$referrer', 'Direct'] },
            clicks: { $sum: 1 },
          },
        },
        { $sort: { clicks: -1 } },
        { $limit: 10 },
      ])
      .exec();

    const referrers = referrerAgg.map((r) => ({
      source: r._id || 'Direct',
      clicks: r.clicks,
    }));

    // Country breakdown with cities
    const countryAgg = await this.clicksModel
      .aggregate([
        { $match: { ...clicksMatch, country: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: { country: '$country', city: { $ifNull: ['$city', 'Unknown'] } },
            clicks: { $sum: 1 },
          },
        },
        { $sort: { clicks: -1 } },
      ])
      .exec();

    // Roll up country totals and nested cities
    const countryMap = new Map<
      string,
      { clicks: number; cities: Map<string, number> }
    >();
    for (const row of countryAgg) {
      const countryCode = row._id.country as string;
      const country = AnalyticsUtil.getCountryName(countryCode) ?? countryCode;
      const city = row._id.city as string;
      if (!countryMap.has(country)) {
        countryMap.set(country, { clicks: 0, cities: new Map() });
      }
      const entry = countryMap.get(country)!;
      entry.clicks += row.clicks;
      entry.cities.set(city, (entry.cities.get(city) || 0) + row.clicks);
    }

    const totalCountryClicks = Array.from(countryMap.values()).reduce(
      (s, c) => s + c.clicks,
      0,
    );

    const countries = Array.from(countryMap.entries())
      .sort((a, b) => b[1].clicks - a[1].clicks)
      .slice(0, 10)
      .map(([country, data]) => ({
        country,
        clicks: data.clicks,
        percentage:
          totalCountryClicks > 0
            ? Math.round((data.clicks / totalCountryClicks) * 100)
            : 0,
        cities: Array.from(data.cities.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, clicks]) => ({ city, clicks })),
      }));

    // Period-over-period change for total clicks
    const halfRange = this.getHalfDateRange(range);
    const prevMatch = {
      linkId: { $in: linkIds },
      ts: { $gte: halfRange.prevStart, $lte: halfRange.prevEnd },
    };
    const currMatch = {
      linkId: { $in: linkIds },
      ts: { $gte: halfRange.currStart, $lte: halfRange.currEnd },
    };

    const [prevCount, currCount] = await Promise.all([
      this.clicksModel.countDocuments(prevMatch).exec(),
      this.clicksModel.countDocuments(currMatch).exec(),
    ]);

    const clickTrend = this.computeTrend(prevCount, currCount);
    const uniqueTrend = this.computeTrend(
      Math.max(1, Math.round(prevCount * 0.75)),
      uniqueVisitorCount,
    );

    return {
      deviceBreakdown,
      referrers: referrers.length > 0 ? referrers : [{ source: 'Direct', clicks: 0 }],
      countries,
      stats: {
        totalClicks,
        uniqueVisitors: uniqueVisitorCount,
        avgDailyClicks,
        clickRate:
          totalLinks > 0 ? `${(totalClicks / totalLinks).toFixed(1)}` : '0',
        uniqueVisitorsRatio:
          totalClicks > 0 ? uniqueVisitorCount / totalClicks : 0,
        changes: {
          totalClicks: clickTrend.label,
          totalClicksTrend: clickTrend.direction,
          uniqueVisitors: uniqueTrend.label,
          uniqueVisitorsTrend: uniqueTrend.direction,
          clickRate: clickTrend.label,
          clickRateTrend: clickTrend.direction,
          avgDailyClicks: clickTrend.label,
          avgDailyClicksTrend: clickTrend.direction,
        },
      },
    };
  }

  /**
   * Get clicks time series data
   */
  async getClicksSeries(
    userId: string,
    query: ClicksSeriesQueryDto,
  ): Promise<ClicksSeriesDto> {
    const { scope = 'user', linkId, range = '30d' } = query;
    const dateRange = this.getDateRange(range);

    if (scope === 'link' && linkId) {
      const series = await this.getLinkClicksSeries(linkId, dateRange);
      return { series };
    } else {
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
    const dateRange = this.getDateRange(range);

    const userLinks = await this.urlModel.find({ userId }).select('_id').exec();
    const perUrl: Record<string, ClickSeriesDataPointDto[]> = {};

    for (const link of userLinks) {
      const linkId = (link._id as any).toString();
      perUrl[linkId] = await this.getLinkClicksSeries(linkId, dateRange);
    }

    return { perUrl };
  }

  /**
   * Get clicks series for a single link from daily_link_stats
   */
  private async getLinkClicksSeries(
    linkId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<ClickSeriesDataPointDto[]> {
    try {
      const objectId = new Types.ObjectId(linkId);
      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];

      const stats = await this.dailyStatsModel
        .find({ linkId: objectId, date: { $gte: startStr, $lte: endStr } })
        .sort({ date: 1 })
        .exec();

      if (stats.length > 0) {
        return stats.map((s) => ({ date: s.date, clicks: s.clicks }));
      }

      const clickSeries = await this.clicksModel
        .aggregate([
          {
            $match: {
              linkId: objectId,
              ts: { $gte: dateRange.start, $lte: dateRange.end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$ts' },
              },
              clicks: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec();

      if (clickSeries.length > 0) {
        return clickSeries.map((s) => ({ date: s._id, clicks: s.clicks }));
      }
    } catch (error) {
      console.error('Error fetching click series:', error);
    }

    return [];
  }

  /**
   * Get aggregated clicks series for all user links
   */
  private async getUserClicksSeries(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<ClickSeriesDataPointDto[]> {
    const userLinks = await this.urlModel
      .find({ userId })
      .select('_id')
      .exec();
    const linkIds = userLinks.map((l) => l._id);

    if (linkIds.length === 0) return [];

    try {
      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];

      const stats = await this.dailyStatsModel
        .aggregate([
          {
            $match: {
              linkId: { $in: linkIds },
              date: { $gte: startStr, $lte: endStr },
            },
          },
          { $group: { _id: '$date', clicks: { $sum: '$clicks' } } },
          { $sort: { _id: 1 } },
        ])
        .exec();

      if (stats.length > 0) {
        return stats.map((s) => ({ date: s._id, clicks: s.clicks }));
      }

      const clickSeries = await this.clicksModel
        .aggregate([
          {
            $match: {
              linkId: { $in: linkIds },
              ts: { $gte: dateRange.start, $lte: dateRange.end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$ts' },
              },
              clicks: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec();

      if (clickSeries.length > 0) {
        return clickSeries.map((s) => ({ date: s._id, clicks: s.clicks }));
      }
    } catch (error) {
      console.error('Error aggregating user stats:', error);
    }

    return [];
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildLinkCriteria(
    scope: string,
    userId: string,
    linkId?: string,
  ): any {
    if (scope === 'link' && linkId) return { _id: linkId, userId };
    return { userId };
  }

  private getRangeDayCount(
    range: string,
    dateRange: { start: Date; end: Date },
  ): number {
    switch (range) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case 'all':
        return Math.max(
          1,
          Math.ceil(
            (dateRange.end.getTime() - dateRange.start.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
      default:
        return 30;
    }
  }

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
        start.setFullYear(2000);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  /** Split the range into two halves for period-over-period comparison */
  private getHalfDateRange(range: string): {
    prevStart: Date;
    prevEnd: Date;
    currStart: Date;
    currEnd: Date;
  } {
    const days =
      range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 30;
    const now = new Date();
    const currEnd = new Date(now);
    const currStart = new Date(now);
    currStart.setDate(currStart.getDate() - days);
    const prevEnd = new Date(currStart);
    const prevStart = new Date(currStart);
    prevStart.setDate(prevStart.getDate() - days);
    return { prevStart, prevEnd, currStart, currEnd };
  }

  private computeTrend(
    prev: number,
    curr: number,
  ): { label: string; direction: 'up' | 'down' | 'neutral' } {
    if (prev === 0 && curr === 0) return { label: '0%', direction: 'neutral' };
    if (prev === 0) return { label: `+${curr * 100}%`, direction: 'up' };
    const pct = Math.round(((curr - prev) / prev) * 100);
    return {
      label: pct >= 0 ? `+${pct}%` : `${pct}%`,
      direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
    };
  }

  private getEmptyOverview(): AnalyticsOverviewDto {
    return {
      deviceBreakdown: [],
      referrers: [],
      countries: [],
      stats: {
        totalClicks: 0,
        uniqueVisitors: 0,
        avgDailyClicks: 0,
        clickRate: '0',
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
}
