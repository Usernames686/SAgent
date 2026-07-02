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
import { BookmarkService } from './bookmark.service';

@ApiTags('收藏')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Get()
  @ApiOperation({ summary: '我的收藏列表' })
  async list(
    @Request() req: { user: { userId: string } },
    @Query('type') type?: string,
  ) {
    return this.bookmarkService.findByUser(req.user.userId, type);
  }

  @Post()
  @ApiOperation({ summary: '添加收藏' })
  async add(
    @Request() req: { user: { userId: string } },
    @Body() body: { targetId: string; targetType: string; title?: string; note?: string },
  ) {
    return this.bookmarkService.create(req.user.userId, body);
  }

  @Delete()
  @ApiOperation({ summary: '取消收藏' })
  async remove(
    @Request() req: { user: { userId: string } },
    @Body() body: { targetId: string; targetType: string },
  ) {
    return this.bookmarkService.remove(req.user.userId, body.targetId, body.targetType);
  }
}
