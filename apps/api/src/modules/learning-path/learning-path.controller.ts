import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';

@ApiTags('学习路径')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning-paths')
export class LearningPathController {
  constructor(private readonly pathService: LearningPathService) {}

  @Get('me')
  @ApiOperation({ summary: '我的学习路径' })
  async getMyPaths(@Request() req: { user: { userId: string } }) {
    return this.pathService.findByUser(req.user.userId);
  }

  @Post('generate')
  @ApiOperation({ summary: '生成学习路径' })
  async generate(
    @Request() req: { user: { userId: string } },
    @Body() body: { goal: string; timeline: string; commitment: string },
  ) {
    return this.pathService.generate(
      req.user.userId,
      body.goal,
      body.timeline,
      body.commitment,
    );
  }

  @Put(':id/adjust')
  @ApiOperation({ summary: '调整学习路径' })
  async adjust(
    @Param('id') id: string,
    @Body() body: { reason: string; preferences?: Record<string, unknown> },
  ) {
    return this.pathService.adjust(id, body.reason, body.preferences);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: '路径进度' })
  async getProgress(@Param('id') id: string) {
    return this.pathService.getProgress(id);
  }
}
