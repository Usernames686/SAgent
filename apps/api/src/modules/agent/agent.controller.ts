import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, from, map } from 'rxjs';
import { AgentService } from './agent.service';

@ApiTags('AI Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('health')
  @ApiOperation({ summary: 'AI 模型配置状态' })
  health() {
    return this.agentService.getLlmStatus();
  }

  @Post('chat')
  @ApiOperation({ summary: 'AI 对话' })
  async chat(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      message: string;
      sessionId?: string;
      context?: {
        currentCode?: string;
        exerciseId?: string;
      };
    },
  ) {
    return this.agentService.chat({
      userId: req.user.userId,
      sessionId: body.sessionId || '',
      message: body.message,
      currentCode: body.context?.currentCode,
    });
  }

  @Sse('chat/stream')
  @ApiOperation({ summary: 'AI 对话（流式）' })
  chatStream(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      message: string;
      sessionId?: string;
      context?: {
        currentCode?: string;
      };
    },
  ): Observable<MessageEvent> {
    const userId = req.user.userId;
    const message = body.message;
    const currentCode = body.context?.currentCode;

    return from(
      this.agentService.chat({
        userId,
        sessionId: body.sessionId || '',
        message,
        currentCode,
      }),
    ).pipe(
      map((response) => ({
        data: {
          type: 'response',
          content: response.content,
          agentType: response.agentType,
          tokens: response.tokens,
          latencyMs: response.latencyMs,
        },
      })),
    );
  }

  @Post('evaluate')
  @ApiOperation({ summary: '代码评估' })
  async evaluate(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      code: string;
      exerciseId?: string;
      exerciseDescription?: string;
    },
  ) {
    return this.agentService.evaluate({
      userId: req.user.userId,
      code: body.code,
      exerciseDescription: body.exerciseDescription || '',
    });
  }

  @Post('debug')
  @ApiOperation({ summary: '调试辅助' })
  async debug(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      code: string;
      error: string;
      logs?: string;
    },
  ) {
    return this.agentService.debug({
      userId: req.user.userId,
      code: body.code,
      error: body.error,
      logs: body.logs,
    });
  }

  @Post('vibe')
  @ApiOperation({ summary: '氛围编程 - 描述式生成' })
  async vibe(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      vibe: string;
      requirements: string;
      constraints?: string;
    },
  ) {
    return this.agentService.vibeCoding({
      userId: req.user.userId,
      sessionId: '',
      vibe: body.vibe,
      requirements: body.requirements,
      constraints: body.constraints,
    });
  }

  @Post('vibe/interact')
  @ApiOperation({ summary: '氛围编程 - 多模式交互' })
  async vibeInteract(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      mode: 'vibe_describe' | 'prompt_iterate' | 'pair_programming' | 'vibe_quiz' | 'code_review';
      vibeKeywords?: string;
      functionDescription?: string;
      technicalConstraints?: string;
      currentPrompt?: string;
      iterationRound?: number;
      previousFeedback?: string;
      userDirection?: string;
      codeContext?: string;
      targetDescription?: string;
      userGuessKeywords?: string;
      codeToReview?: string;
      reviewChecklist?: string[];
    },
  ) {
    return this.agentService.vibeInteract({
      userId: req.user.userId,
      sessionId: '',
      mode: body.mode,
      vibeKeywords: body.vibeKeywords,
      functionDescription: body.functionDescription,
      technicalConstraints: body.technicalConstraints,
      currentPrompt: body.currentPrompt,
      iterationRound: body.iterationRound,
      previousFeedback: body.previousFeedback,
      userDirection: body.userDirection,
      codeContext: body.codeContext,
      targetDescription: body.targetDescription,
      userGuessKeywords: body.userGuessKeywords,
      codeToReview: body.codeToReview,
      reviewChecklist: body.reviewChecklist,
    });
  }

  @Post('vibe/feedback')
  @ApiOperation({ summary: '氛围编程 - 代码实时反馈' })
  async vibeFeedback(
    @Body() body: { code: string; language?: string; cursorLine?: number; cursorColumn?: number },
  ) {
    return this.agentService.getCodeFeedback(body.code, body.language, body.cursorLine, body.cursorColumn);
  }

  @Post('vibe/match')
  @ApiOperation({ summary: '氛围编程 - 氛围匹配度评估' })
  async vibeMatch(
    @Body() body: { code: string; expectedStyle: string; expectedKeywords: string[] },
  ) {
    return this.agentService.evaluateVibeMatch(body.code, body.expectedStyle, body.expectedKeywords);
  }

  @Post('review')
  @ApiOperation({ summary: '代码审查' })
  async review(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      code: string;
      context?: string;
    },
  ) {
    return this.agentService.evaluate({
      userId: req.user.userId,
      code: body.code,
      exerciseDescription: body.context || '代码审查',
    });
  }

  @Post('interview/questions')
  @ApiOperation({ summary: '生成面试题' })
  async interviewQuestions(
    @Body() body: { role: string; count?: number; focusAreas?: string[] },
  ) {
    return this.agentService.generateInterviewQuestions({
      role: body.role,
      count: body.count || 5,
      focusAreas: body.focusAreas,
    });
  }

  @Post('interview/evaluate')
  @ApiOperation({ summary: '评估面试答案并生成报告' })
  async interviewEvaluate(
    @Body() body: {
      role: string;
      questions: Array<{ id: string; type: string; difficulty: number; question: string; expectedAnswer?: string; hints?: string[]; timeLimit?: number }>;
      answers: Array<{ questionId: string; answer: string; score?: number; feedback?: string }>;
    },
  ) {
    return this.agentService.evaluateInterviewAnswer({
      role: body.role,
      questions: body.questions,
      answers: body.answers,
    });
  }

  @Post('feedback')
  @ApiOperation({ summary: '提交 AI 反馈' })
  async feedback(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      sessionId: string;
      rating: number;
      comment?: string;
    },
  ) {
    // 记录反馈到 AI 会话
    return {
      success: true,
      sessionId: body.sessionId,
      rating: body.rating,
      comment: body.comment,
    };
  }
}
