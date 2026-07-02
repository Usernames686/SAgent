import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectPracticeService } from './project-practice.service';

interface AuthRequest {
  user: { userId: string };
}

@ApiTags('项目实战')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectPracticeController {
  constructor(private readonly projectPracticeService: ProjectPracticeService) {}

  @Get()
  @ApiOperation({ summary: '项目实战列表' })
  findAll(@Request() req: AuthRequest) {
    return this.projectPracticeService.findAll(req.user.userId);
  }

  @Get('open-source/catalog')
  @ApiOperation({ summary: '开源项目功能参考库' })
  listOpenSourceReferences(@Query('nodeId') nodeId?: string) {
    return this.projectPracticeService.listOpenSourceReferences(nodeId);
  }

  @Get(':nodeId')
  @ApiOperation({ summary: '项目实战详情' })
  findOne(@Request() req: AuthRequest, @Param('nodeId') nodeId: string) {
    return this.projectPracticeService.findOne(req.user.userId, nodeId);
  }

  @Get(':nodeId/submissions')
  @ApiOperation({ summary: '项目提交记录' })
  listSubmissions(@Request() req: AuthRequest, @Param('nodeId') nodeId: string) {
    return this.projectPracticeService.listSubmissions(req.user.userId, nodeId);
  }

  @Post(':nodeId/submit')
  @ApiOperation({ summary: '提交项目作品' })
  submit(
    @Request() req: AuthRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: { repositoryUrl?: string; previewUrl?: string; notes?: string; checklist?: string[] },
  ) {
    return this.projectPracticeService.submit(req.user.userId, nodeId, body);
  }
}
