import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserDocument } from '../../schemas/user.schema';
import {
  AnalyticsOverviewDto,
  AnalyticsQueryDto,
} from './dto/analytics-overview.dto';
import { ClicksSeriesDto, ClicksSeriesQueryDto } from './dto/clicks-series.dto';
import {
  ClicksPerUrlDto,
  ClicksPerUrlQueryDto,
} from './dto/clicks-per-url.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('tolink_session')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get analytics overview',
    description:
      'Get device breakdown, referrers, countries, and stats overview for user or specific link',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['user', 'link'],
    description: 'Analytics scope (default: user)',
  })
  @ApiQuery({
    name: 'linkId',
    required: false,
    description: 'Link ID (required when scope=link)',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', 'all'],
    description: 'Time range (default: 30d)',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics overview retrieved successfully',
    type: AnalyticsOverviewDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters (e.g., linkId required when scope=link)',
  })
  async getOverview(
    @GetUser() user: UserDocument,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverviewDto> {
    // Validate linkId requirement when scope is link
    if (query.scope === 'link' && !query.linkId) {
      throw new Error('linkId is required when scope is link');
    }

    return this.analyticsService.getOverview(user._id as string, query);
  }

  @Get('clicks/series')
  @ApiOperation({
    summary: 'Get clicks time series',
    description:
      'Get time-series clicks data for user or specific link with specified granularity',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['user', 'link'],
    description: 'Analytics scope (default: user)',
  })
  @ApiQuery({
    name: 'linkId',
    required: false,
    description: 'Link ID (required when scope=link)',
  })
  @ApiQuery({
    name: 'granularity',
    required: false,
    enum: ['day'],
    description: 'Data granularity (default: day)',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', 'all'],
    description: 'Time range (default: 30d)',
  })
  @ApiResponse({
    status: 200,
    description: 'Clicks series retrieved successfully',
    type: ClicksSeriesDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters',
  })
  async getClicksSeries(
    @GetUser() user: UserDocument,
    @Query() query: ClicksSeriesQueryDto,
  ): Promise<ClicksSeriesDto> {
    // Validate linkId requirement when scope is link
    if (query.scope === 'link' && !query.linkId) {
      throw new Error('linkId is required when scope is link');
    }

    return this.analyticsService.getClicksSeries(user._id as string, query);
  }

  @Get('clicks/per-url')
  @ApiOperation({
    summary: 'Get per-URL clicks series',
    description:
      "Get clicks series data for each of the user's links, used for computing deltas",
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', 'all'],
    description: 'Time range (default: 30d)',
  })
  @ApiResponse({
    status: 200,
    description: 'Per-URL clicks retrieved successfully',
    type: ClicksPerUrlDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getClicksPerUrl(
    @GetUser() user: UserDocument,
    @Query() query: ClicksPerUrlQueryDto,
  ): Promise<ClicksPerUrlDto> {
    return this.analyticsService.getClicksPerUrl(user._id as string, query);
  }
}
