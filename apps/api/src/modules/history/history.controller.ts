import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HistoryService } from './history.service';

@ApiTags('浏览历史')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: '浏览历史' })
  async list(
    @Request() req: { user: { userId: string } },
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.historyService.findByUser(
      req.user.userId,
      type,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  @ApiOperation({ summary: '记录浏览' })
  async record(
    @Request() req: { user: { userId: string } },
    @Body() body: { targetId: string; targetType: string; title?: string },
  ) {
    return this.historyService.record(req.user.userId, body);
  }

  @Delete()
  @ApiOperation({ summary: '清除历史' })
  async clear(
    @Request() req: { user: { userId: string } },
    @Body() body?: { targetType?: string },
  ) {
    return this.historyService.clearByUser(req.user.userId, body?.targetType);
  }
}
