import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';

@ApiTags('能力诊断')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Get('questions')
  @ApiOperation({ summary: '获取初始诊断试题' })
  async getInitialQuestions(
    @Request() req: { user: { userId: string } },
  ) {
    return this.assessmentService.getInitialQuestions(req.user.userId);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '提交答案并获取下一题' })
  async submitAnswer(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      sessionId: string;
      questionId: string;
      answerIndex: number;
    },
  ) {
    return this.assessmentService.submitAnswer(
      req.user.userId,
      body.sessionId,
      body.questionId,
      body.answerIndex,
    );
  }

  @Get('result')
  @ApiOperation({ summary: '获取最近一次诊断结果' })
  async getResult(
    @Request() req: { user: { userId: string } },
  ) {
    return this.assessmentService.getResult(req.user.userId);
  }
}
