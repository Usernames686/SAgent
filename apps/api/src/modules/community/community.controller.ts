import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';

@ApiTags('社区')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts')
  @ApiOperation({ summary: '帖子列表' })
  async listPosts(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.findPosts({
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('posts/:id')
  @ApiOperation({ summary: '帖子详情' })
  async getPost(@Param('id') id: string) {
    return this.communityService.findPostById(id);
  }

  @Post('posts')
  @ApiOperation({ summary: '发布帖子' })
  async createPost(
    @Request() req: { user: { userId: string } },
    @Body() body: { type?: string; title: string; content: string; tags?: string[] },
  ) {
    return this.communityService.createPost(req.user.userId, body);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: '帖子评论' })
  async getComments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getComments(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: '发表评论' })
  async addComment(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.communityService.addComment(req.user.userId, id, body.content, body.parentId);
  }

  @Post('posts/:id/like')
  @ApiOperation({ summary: '点赞' })
  async likePost(@Param('id') id: string) {
    return this.communityService.likePost(id);
  }
}
