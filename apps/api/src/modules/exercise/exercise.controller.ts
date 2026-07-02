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
import { ExerciseService } from './exercise.service';

@ApiTags('练习')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get()
  @ApiOperation({ summary: '练习列表' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('difficulty') difficulty?: string,
    @Query('language') language?: string,
  ) {
    return this.exerciseService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      difficulty: difficulty ? parseInt(difficulty) : undefined,
      language,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '练习详情' })
  async findOne(@Param('id') id: string) {
    return this.exerciseService.findById(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交代码' })
  async submit(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() body: { code: string; language: string },
  ) {
    return this.exerciseService.submit(id, req.user.userId, body.code, body.language);
  }

  @Post(':id/run')
  @ApiOperation({ summary: '运行代码' })
  async run(
    @Param('id') id: string,
    @Body() body: { code: string; language: string; input: string },
  ) {
    return this.exerciseService.runCode(id, body.code, body.language, body.input);
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: '提交历史' })
  async getSubmissions(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.exerciseService.getSubmissions(
      id,
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
