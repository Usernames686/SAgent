import { Controller, Get, Put, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getMe(@Request() req: { user: { userId: string } }) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) return null;
    const { passwordHash, ...rest } = user as unknown as Record<string, unknown>;
    return rest;
  }

  @Put('me')
  @ApiOperation({ summary: '更新用户信息' })
  async updateMe(
    @Request() req: { user: { userId: string } },
    @Body() body: { nickname?: string; avatarUrl?: string },
  ) {
    const user = await this.userService.updateProfile(req.user.userId, body);
    const { passwordHash, ...rest } = user as unknown as Record<string, unknown>;
    return rest;
  }

  @Get('me/profile')
  @ApiOperation({ summary: '获取用户画像' })
  async getProfile(@Request() req: { user: { userId: string } }) {
    return this.userService.getProfile(req.user.userId);
  }

  @Post('me/assessment')
  @ApiOperation({ summary: '提交能力诊断' })
  async submitAssessment(
    @Request() req: { user: { userId: string } },
    @Body() body: { answers: Record<string, unknown>[] },
  ) {
    return this.userService.evaluateAssessment(req.user.userId, body.answers);
  }

  @Get('me/dashboard')
  @ApiOperation({ summary: '学习仪表盘' })
  async getDashboard(@Request() req: { user: { userId: string } }) {
    const user = await this.userService.findById(req.user.userId);
    return {
      stats: user?.stats || {},
      paths: [],
      recommendations: [],
    };
  }
}
