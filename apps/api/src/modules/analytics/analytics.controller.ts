import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('统计')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '个人统计仪表盘' })
  async getDashboard(@Request() req: { user: { userId: string } }) {
    return this.analyticsService.getUserDashboard(req.user.userId);
  }

  @Get('global')
  @ApiOperation({ summary: '全局统计' })
  async getGlobalStats() {
    return this.analyticsService.getGlobalStats();
  }

  @Get('behavior')
  @ApiOperation({ summary: '行为数据深度指标（进化引擎数据源）' })
  async getBehaviorMetrics(
    @Request() req: { user: { userId: string } },
    @Query('since') since?: string,
  ) {
    return this.analyticsService.getBehaviorMetrics(
      req.user.userId,
      since ? new Date(since) : undefined,
    );
  }
}
