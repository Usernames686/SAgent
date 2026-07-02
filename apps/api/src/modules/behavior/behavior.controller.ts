import { Controller, Post, Get, Body, UseGuards, Request, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BehaviorTrackingService, TrackEventInput } from './behavior-tracking.service';

@ApiTags('行为采集')
@Controller('behavior')
export class BehaviorController {
  constructor(private readonly trackingService: BehaviorTrackingService) {}

  /** 前端 SDK 上报事件 — 需登录（关联 userId） */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '上报单条行为事件' })
  async track(
    @Request() req: { user: { userId: string } },
    @Body() body: Omit<TrackEventInput, 'userId'>,
  ): Promise<void> {
    this.trackingService.track({ ...body, userId: req.user.userId });
  }

  /** 批量上报 — 适用于前端聚合后一次性提交 */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('track/batch')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '批量上报行为事件' })
  async trackBatch(
    @Request() req: { user: { userId: string } },
    @Body() body: { events: Array<Omit<TrackEventInput, 'userId'>> },
  ): Promise<void> {
    for (const evt of body.events || []) {
      this.trackingService.track({ ...evt, userId: req.user.userId });
    }
  }

  /** 个人行为查询 */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: '获取我的行为事件' })
  async getMyEvents(
    @Request() req: { user: { userId: string } },
    @Query('limit') limit?: number,
  ) {
    return this.trackingService.getUserEvents(req.user.userId, limit ? Number(limit) : 100);
  }

  /** 全局行为指标（管理端/进化引擎用） */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('metrics')
  @ApiOperation({ summary: '获取全局行为指标聚合' })
  async getMetrics(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : undefined;
    return this.trackingService.getMetrics(sinceDate);
  }
}
