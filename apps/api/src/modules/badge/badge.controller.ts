import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BadgeService } from './badge.service';

@ApiTags('成就')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('badges')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Get()
  @ApiOperation({ summary: '所有成就列表' })
  async findAll(@Query('category') category?: string) {
    return this.badgeService.findAll(category);
  }

  @Get('me')
  @ApiOperation({ summary: '我的成就' })
  async getMyBadges(@Request() req: { user: { userId: string } }) {
    return this.badgeService.getUserBadges(req.user.userId);
  }

  @Post('seed')
  @ApiOperation({ summary: '初始化成就种子数据' })
  async seed() {
    await this.badgeService.seedBadges();
    return { success: true };
  }

  @Post('check')
  @ApiOperation({ summary: '检查并自动颁发成就' })
  async checkAndAward(
    @Request() req: { user: { userId: string } },
    @Body() body: { knowledgeCompleted?: number; exercisePassed?: number; streakDays?: number; vibeCount?: number; communityPosts?: number; pathCompleted?: boolean },
  ) {
    const awarded = await this.badgeService.checkAndAward(req.user.userId, body);
    return { newlyAwarded: awarded };
  }

  @Get('progress')
  @ApiOperation({ summary: '成就进度' })
  async getProgress(@Request() req: { user: { userId: string } }) {
    return this.badgeService.getProgress(req.user.userId);
  }
}
