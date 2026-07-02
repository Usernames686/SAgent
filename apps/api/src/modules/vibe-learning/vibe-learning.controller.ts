import {
  Controller, Post, Get, Body, Param, UseGuards, Request, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VibeLearningService, LearningMode } from './vibe-learning.service';
import { LearningSessionService } from './learning-session.service';
import { KnowledgeQueryService } from './knowledge-query.service';
import { LearningPathType } from './learning-path.engine';
import { TeachingScenario } from './teaching-agent-collaborator';
import { ExerciseScoringService } from './exercise-scoring.service';
import { CodeSandboxService } from './code-sandbox.service';
import { VibeCodingLabService } from './vibe-coding-lab.service';
import { BugChallengeService } from './bug-challenge.service';
import { ReviewChallengeService } from './review-challenge.service';
import { LearningProgressService } from './learning-progress.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { ErrorReviewService } from './error-review.service';
import { LearningAdvisorService } from './learning-advisor.service';

@ApiTags('氛围学习')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vibe-learning')
export class VibeLearningController {
  constructor(
    private readonly learningService: VibeLearningService,
    private readonly sessionService: LearningSessionService,
    private readonly knowledgeQuery: KnowledgeQueryService,
    private readonly scoringService: ExerciseScoringService,
    private readonly sandboxService: CodeSandboxService,
    private readonly vibeLabService: VibeCodingLabService,
    private readonly bugService: BugChallengeService,
    private readonly reviewService: ReviewChallengeService,
    private readonly progressService: LearningProgressService,
    private readonly spacedRepetitionService: SpacedRepetitionService,
    private readonly errorReviewService: ErrorReviewService,
    private readonly advisorService: LearningAdvisorService,
  ) {}

  @Post('session')
  @ApiOperation({ summary: '创建/恢复学习会话' })
  async startSession(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId?: string },
  ) {
    return this.learningService.startLearning(req.user.userId, body.nodeId);
  }

  @Get('session/:id')
  @ApiOperation({ summary: '获取会话状态' })
  async getSession(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    const session = await this.sessionService.getSession(id);
    if (!session || session.userId !== req.user.userId) {
      return { error: 'Session not found' };
    }
    const nextStep = await this.learningService.getNextStep(session);
    return { session, nextStep };
  }

  @Post('switch-mode')
  @ApiOperation({ summary: '切换学习模式' })
  async switchMode(
    @Request() req: { user: { userId: string } },
    @Body() body: { sessionId: string; mode: LearningMode },
  ) {
    return this.learningService.switchMode(body.sessionId, req.user.userId, body.mode);
  }

  @Post('submit-quiz')
  @ApiOperation({ summary: '提交 Quiz 答案' })
  async submitQuiz(
    @Request() req: { user: { userId: string } },
    @Body() body: { sessionId: string; answers: { questionId: string; selectedOptionId: string }[] },
  ) {
    return this.learningService.submitQuiz(body.sessionId, req.user.userId, body.answers);
  }

  @Post('submit-coding')
  @ApiOperation({ summary: '提交编码练习' })
  async submitCoding(
    @Request() req: { user: { userId: string } },
    @Body() body: { sessionId: string; code: string },
  ) {
    return this.learningService.submitCoding(body.sessionId, req.user.userId, body.code);
  }

  @Post('chat')
  @ApiOperation({ summary: '学习中的 AI 对话' })
  async chat(
    @Request() req: { user: { userId: string } },
    @Body() body: { sessionId: string; message: string },
  ) {
    return this.learningService.chat(req.user.userId, body.sessionId, body.message);
  }

  /** ★ 新增：提交学习反馈 */
  @Post('feedback')
  @ApiOperation({ summary: '提交学习反馈' })
  async submitFeedback(
    @Request() req: { user: { userId: string } },
    @Body() body: { sessionId: string; type: 'difficulty' | 'pace' | 'content' | 'emotion'; value: string; comment?: string },
  ) {
    return this.learningService.submitFeedback(req.user.userId, body.sessionId, body);
  }

  @Get('progress')
  @ApiOperation({ summary: '获取学习进度总览' })
  async getProgress(@Request() req: { user: { userId: string } }) {
    return this.learningService.getProgress(req.user.userId);
  }

  /** ★ 新增：触发个性化调整 */
  @Post('personalize')
  @ApiOperation({ summary: '触发个性化调整' })
  async personalize(
    @Request() req: { user: { userId: string } },
    @Body() body: { sessionId?: string },
  ) {
    return this.learningService.personalize(req.user.userId, body.sessionId);
  }

  /** ★ 新增：获取知识点推荐 */
  @Post('recommend')
  @ApiOperation({ summary: '推荐知识点' })
  async recommend(
    @Request() req: { user: { userId: string } },
    @Body() body: { limit?: number },
  ) {
    return this.knowledgeQuery.recommendNext(req.user.userId, body.limit || 5);
  }

  // ===================================================================
  // ★ 自适应学习 + 多Agent协作 + 学习路径 API
  // ===================================================================

  /** 获取自适应学习决策 */
  @Get('adaptive/decision')
  @ApiOperation({ summary: '获取自适应学习决策' })
  async getAdaptiveDecision(
    @Request() req: { user: { userId: string } },
  ) {
    return this.learningService.getAdaptiveDecision(req.user.userId);
  }

  /** 执行多Agent协作教学 */
  @Post('adaptive/teach')
  @ApiOperation({ summary: '执行多Agent协作教学' })
  async executeTeaching(
    @Request() req: { user: { userId: string } },
    @Body() body: { sessionId: string; scenario?: TeachingScenario; message?: string },
  ) {
    return this.learningService.executeTeaching(
      req.user.userId,
      body.sessionId,
      body.scenario,
      body.message,
    );
  }

  /** 生成个性化学习路径 */
  @Post('adaptive/path')
  @ApiOperation({ summary: '生成个性化学习路径' })
  async generateLearningPath(
    @Request() req: { user: { userId: string } },
    @Body() body: {
      pathType?: LearningPathType;
      targetNodeId?: string;
      focusModule?: string;
      maxNodes?: number;
    },
  ) {
    return this.learningService.generateLearningPath(
      req.user.userId,
      body.pathType || 'system_recommended',
      { targetNodeId: body.targetNodeId, focusModule: body.focusModule, maxNodes: body.maxNodes },
    );
  }

  /** 更新学习路径 */
  @Post('adaptive/path/update')
  @ApiOperation({ summary: '更新学习路径（基于最新进度）' })
  async updateLearningPath(
    @Request() req: { user: { userId: string } },
    @Body() body: { path: any },
  ) {
    return this.learningService.updateLearningPath(req.user.userId, body.path);
  }

  /** 获取当前可学习的知识点 */
  @Get('adaptive/available-nodes')
  @ApiOperation({ summary: '获取当前可学习的知识点' })
  async getAvailableNodes(
    @Request() req: { user: { userId: string } },
  ) {
    return this.learningService.getAvailableNodes(req.user.userId);
  }

  /** ★ 一站式自适应学习入口 */
  @Post('adaptive/learn')
  @ApiOperation({ summary: '一站式自适应学习（自适应决策+Agent教学+路径规划）' })
  async adaptiveLearn(
    @Request() req: { user: { userId: string } },
    @Body() body: { message?: string },
  ) {
    return this.learningService.adaptiveLearn(req.user.userId, body.message);
  }

  // ===================================================================
  // ★ Phase 3: 4级验证体系 API
  // ===================================================================

  /** 1. 提交代码 + 4级验证评分 */
  @Post('exercise/submit')
  @ApiOperation({ summary: '提交练习代码（4级验证评分）' })
  async submitExercise(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string; code: string; hintsUsed?: number },
  ) {
    const score = await this.scoringService.scoreExercise(
      body.nodeId,
      body.code,
      body.hintsUsed || 0,
    );
    const nextStep = this.scoringService.getNextStepAdvice(score);
    return { score, nextStep };
  }

  /** 2. 获取逐步提示 */
  @Post('exercise/hint')
  @ApiOperation({ summary: '获取练习提示（逐步递进）' })
  async getExerciseHint(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string; currentHintLevel?: number },
  ) {
    return this.scoringService.getHint(body.nodeId, body.currentHintLevel || 0);
  }

  /** 3. 沙箱运行代码（仅运行，不评分） */
  @Post('sandbox/run')
  @ApiOperation({ summary: '沙箱运行代码' })
  async runCode(
    @Request() req: { user: { userId: string } },
    @Body() body: { code: string; input?: string },
  ) {
    return this.sandboxService.runCode(body.code, body.input);
  }

  /** 4. 沙箱健康检查 */
  @Get('sandbox/health')
  @ApiOperation({ summary: '沙箱安全健康检查' })
  async sandboxHealth() {
    return this.sandboxService.healthCheck();
  }

  // ===================================================================
  // ★ Phase 4: Vibe Coding 特色学习模式 API
  // ===================================================================

  // ── Step 28: Vibe Coding 实验室 ──

  /** 获取氛围生成预设 */
  @Get('vibe-lab/presets')
  @ApiOperation({ summary: '获取 Vibe Coding 预设目标和标签' })
  async getVibePresets() {
    return this.vibeLabService.getPresets();
  }

  /** 氛围生成代码 */
  @Post('vibe-generate')
  @ApiOperation({ summary: '根据氛围描述生成代码' })
  async vibeGenerate(
    @Request() req: { user: { userId: string } },
    @Body() body: { goal: string; vibe: string; techStack?: string; iterations?: number; nodeId?: string },
  ) {
    return this.vibeLabService.generateFromVibe(body);
  }

  // ── Step 30: Bug 修复挑战 ──

  /** 获取 Bug 修复挑战列表 */
  @Get('bug-challenge')
  @ApiOperation({ summary: '获取 Bug 修复挑战题目' })
  async getBugChallenges(
    @Query('nodeId') nodeId?: string,
  ) {
    return this.bugService.getAllChallenges(nodeId);
  }

  /** 获取单个 Bug 挑战 */
  @Get('bug-challenge/:id')
  @ApiOperation({ summary: '获取单个 Bug 修复挑战' })
  async getBugChallenge(
    @Param('id') id: string,
  ) {
    return this.bugService.getChallenge(id);
  }

  /** 提交 Bug 修复 */
  @Post('bug-challenge/submit')
  @ApiOperation({ summary: '提交 Bug 修复方案' })
  async submitBugFix(
    @Request() req: { user: { userId: string } },
    @Body() body: { challengeId: string; fixedCode: string; timeUsed: number; hintsUsed: number },
  ) {
    return this.bugService.submitFix(body);
  }

  /** 获取 Bug 挑战提示 */
  @Post('bug-challenge/hint')
  @ApiOperation({ summary: '获取 Bug 修复提示' })
  async getBugHint(
    @Body() body: { challengeId: string; hintIndex: number },
  ) {
    return { hint: this.bugService.getHint(body.challengeId, body.hintIndex) };
  }

  // ── Step 32: 代码评审训练 ──

  /** 获取代码评审题目列表 */
  @Get('review-challenge')
  @ApiOperation({ summary: '获取代码评审训练题目' })
  async getReviewChallenges(
    @Query('nodeId') nodeId?: string,
  ) {
    return this.reviewService.getAllChallenges(nodeId);
  }

  /** 获取单个评审题目 */
  @Get('review-challenge/:id')
  @ApiOperation({ summary: '获取单个代码评审题目' })
  async getReviewChallenge(
    @Param('id') id: string,
  ) {
    return this.reviewService.getChallenge(id);
  }

  /** 提交评审结果 */
  @Post('review-challenge/submit')
  @ApiOperation({ summary: '提交代码评审结果' })
  async submitReview(
    @Request() req: { user: { userId: string } },
    @Body() body: { challengeId: string; findings: Array<{ line: number; description: string; severity: 'error' | 'warning' | 'info' }> },
  ) {
    return this.reviewService.submitReview(body);
  }

  // ===================================================================
  // ★ Phase 5: 学习进度与巩固体系 API (Step 36)
  // ===================================================================

  /** 获取用户对所有知识点的学习进度 */
  @Get('progress/all')
  @ApiOperation({ summary: '获取用户全部学习进度' })
  async getAllProgress(
    @Request() req: { user: { userId: string } },
  ) {
    const [progressList, stats] = await Promise.all([
      this.progressService.getAllProgress(req.user.userId),
      this.progressService.getStats(req.user.userId),
    ]);
    return { progress: progressList, stats };
  }

  /** 获取单个知识点的学习进度 */
  @Get('progress/:nodeId')
  @ApiOperation({ summary: '获取某个知识点的学习进度' })
  async getNodeProgress(
    @Request() req: { user: { userId: string } },
    @Param('nodeId') nodeId: string,
  ) {
    const progress = await this.progressService.getProgress(req.user.userId, nodeId);
    if (!progress) {
      return { progress: null, message: '未开始学习此知识点' };
    }
    return { progress };
  }

  /** 初始化知识点学习进度 */
  @Post('progress/init')
  @ApiOperation({ summary: '初始化知识点学习进度' })
  async initProgress(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string; status?: 'locked' | 'learning' | 'passed' | 'mastered' },
  ) {
    return this.progressService.initProgress(req.user.userId, body.nodeId, body.status || 'learning');
  }

  /** 批量初始化进度 */
  @Post('progress/batch-init')
  @ApiOperation({ summary: '批量初始化知识点学习进度' })
  async batchInitProgress(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeIds: string[]; status?: 'locked' | 'learning' | 'passed' | 'mastered' },
  ) {
    await this.progressService.batchInit(req.user.userId, body.nodeIds, body.status || 'locked');
    return { initialized: body.nodeIds.length };
  }

  /** 获取学习进度统计 */
  @Get('progress/stats/summary')
  @ApiOperation({ summary: '获取学习进度统计概览' })
  async getProgressStats(
    @Request() req: { user: { userId: string } },
  ) {
    return this.progressService.getStats(req.user.userId);
  }

  /** 获取按模块分组的进度 */
  @Post('progress/stats/by-module')
  @ApiOperation({ summary: '获取按模块分组的进度统计' })
  async getModuleProgress(
    @Request() req: { user: { userId: string } },
    @Body() body: { modules: Record<string, string[]> },
  ) {
    return this.progressService.getModuleProgress(req.user.userId, body.modules);
  }

  // ===================================================================
  // ★ Phase 5 Step 41: 进度仪表盘增强 API
  // ===================================================================

  /** 获取增强仪表盘数据 */
  @Post('progress/enhanced-dashboard')
  @ApiOperation({ summary: '获取增强仪表盘数据（含阶段进度、预估时间、连续天数）' })
  async getEnhancedDashboard(
    @Request() req: { user: { userId: string } },
    @Body() body: {
      phases: Array<{
        id: string;
        name: string;
        priority: string;
        modules: Array<{ nodeIds: string[] }>;
      }>;
    },
  ) {
    // 并行获取待复习数和未回顾错题数
    const [dueReviews, errorStats] = await Promise.all([
      this.progressService.getDueReviews(req.user.userId),
      this.errorReviewService.getErrorStats(req.user.userId),
    ]);

    return this.progressService.getEnhancedDashboard(
      req.user.userId,
      body.phases,
      dueReviews.length,
      errorStats.unreviewed || 0,
    );
  }

  // ===================================================================
  // ★ Phase 5 Step 39: 掌握度热力图 API
  // ===================================================================

  /** 获取热力图数据 — 按模块返回所有知识点的掌握度 */
  @Post('progress/heatmap')
  @ApiOperation({ summary: '获取掌握度热力图数据' })
  async getHeatmapData(
    @Request() req: { user: { userId: string } },
    @Body() body: { moduleConfig: Record<string, { name: string; nodeIds: string[] }> },
  ) {
    return this.progressService.getHeatmapData(req.user.userId, body.moduleConfig);
  }

  // ===================================================================
  // ★ Phase 5 Step 40: 学习建议推荐引擎 API
  // ===================================================================

  /** 获取个性化学习建议 */
  @Get('advice')
  @ApiOperation({ summary: '获取个性化学习建议' })
  async getLearningAdvice(
    @Request() req: { user: { userId: string } },
  ) {
    return this.advisorService.generateAdvice(req.user.userId);
  }

  // ===================================================================
  // ★ Phase 5 Step 37: 间隔重复（SM-2）API
  // ===================================================================

  /** 获取今日待复习知识点 */
  @Get('spaced-repetition')
  @ApiOperation({ summary: '获取今日待复习知识点（间隔重复）' })
  async getSpacedRepetitionQueue(
    @Request() req: { user: { userId: string } },
  ) {
    const [dueReviews, queueStats] = await Promise.all([
      this.spacedRepetitionService.getDueReviews(req.user.userId),
      this.spacedRepetitionService.getReviewQueueStats(req.user.userId),
    ]);
    return { dueReviews, queueStats };
  }

  /** 提交复习结果（quality 0-5） */
  @Post('spaced-repetition/report')
  @ApiOperation({ summary: '提交复习结果（SM-2 quality 0-5）' })
  async reportReviewResult(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string; quality: number },
  ) {
    return this.spacedRepetitionService.processReviewResult(
      req.user.userId,
      body.nodeId,
      body.quality,
    );
  }

  /** 基于分数提交复习结果（0-100 自动映射为 quality） */
  @Post('spaced-repetition/report-by-score')
  @ApiOperation({ summary: '基于分数提交复习结果（0-100 自动映射为 quality）' })
  async reportReviewByScore(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string; score: number },
  ) {
    return this.spacedRepetitionService.processReviewByScore(
      req.user.userId,
      body.nodeId,
      body.score,
    );
  }

  /** 获取复习队列统计概览 */
  @Get('spaced-repetition/stats')
  @ApiOperation({ summary: '获取复习队列统计概览' })
  async getSpacedRepetitionStats(
    @Request() req: { user: { userId: string } },
  ) {
    return this.spacedRepetitionService.getReviewQueueStats(req.user.userId);
  }

  /** 为新通过的知识点安排首次复习 */
  @Post('spaced-repetition/schedule-first')
  @ApiOperation({ summary: '为新通过的知识点安排首次复习' })
  async scheduleFirstReview(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string },
  ) {
    return this.spacedRepetitionService.scheduleFirstReview(req.user.userId, body.nodeId);
  }

  // ===================================================================
  // ★ Phase 5 Step 38: 错题回顾系统 API
  // ===================================================================

  /** 记录错题 */
  @Post('error-review')
  @ApiOperation({ summary: '记录一道错题' })
  async recordError(
    @Request() req: { user: { userId: string } },
    @Body() body: {
      nodeId: string;
      questionId: string;
      questionContent?: string;
      userAnswer: string;
      correctAnswer: string;
      errorType?: 'concept' | 'logic' | 'syntax' | 'careless';
      explanation?: string;
      sourceType?: 'quiz' | 'exercise' | 'assessment';
      originalScore?: number;
    },
  ) {
    return this.errorReviewService.recordError(req.user.userId, body);
  }

  /** 获取错题列表 */
  @Get('error-review')
  @ApiOperation({ summary: '获取错题列表（支持筛选）' })
  async getErrorList(
    @Request() req: { user: { userId: string } },
    @Query('nodeId') nodeId?: string,
    @Query('errorType') errorType?: string,
    @Query('reviewed') reviewed?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.errorReviewService.getErrorList(req.user.userId, {
      nodeId,
      errorType,
      reviewed: reviewed !== undefined ? reviewed === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /** 获取未回顾的错题 */
  @Get('error-review/unreviewed')
  @ApiOperation({ summary: '获取未回顾的错题列表' })
  async getUnreviewedErrors(
    @Request() req: { user: { userId: string } },
    @Query('limit') limit?: string,
  ) {
    return this.errorReviewService.getUnreviewedErrors(
      req.user.userId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /** 获取错题按知识点聚合 */
  @Get('error-review/by-node')
  @ApiOperation({ summary: '按知识点聚合错题' })
  async getErrorsByNode(
    @Request() req: { user: { userId: string } },
  ) {
    return this.errorReviewService.getErrorsByNode(req.user.userId);
  }

  /** 获取错题统计概览 */
  @Get('error-review/stats')
  @ApiOperation({ summary: '获取错题统计概览' })
  async getErrorStats(
    @Request() req: { user: { userId: string } },
  ) {
    return this.errorReviewService.getErrorStats(req.user.userId);
  }

  /** 标记错题已回顾 */
  @Post('error-review/:id/review')
  @ApiOperation({ summary: '标记错题已回顾' })
  async markReviewed(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { passed: boolean },
  ) {
    return this.errorReviewService.markReviewed(id, req.user.userId, body.passed);
  }

  /** 重置错题为未回顾（重新练习） */
  @Post('error-review/:id/re-practice')
  @ApiOperation({ summary: '重置错题为未回顾（重新练习）' })
  async resetForRePractice(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.errorReviewService.resetForRePractice(id, req.user.userId);
  }

  /** 重置知识点下所有错题 */
  @Post('error-review/reset-node')
  @ApiOperation({ summary: '重置知识点下所有错题为未回顾' })
  async resetNodeErrors(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string },
  ) {
    const count = await this.errorReviewService.resetNodeErrors(req.user.userId, body.nodeId);
    return { resetCount: count };
  }

  /** 推荐薄弱知识点 */
  @Get('error-review/recommend')
  @ApiOperation({ summary: '推荐薄弱知识点（基于错题分析）' })
  async recommendWeakNodes(
    @Request() req: { user: { userId: string } },
    @Query('limit') limit?: string,
  ) {
    const nodeIds = await this.errorReviewService.recommendWeakNodes(
      req.user.userId,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { nodeIds };
  }
}

/** ★ 新增：知识点查询 Controller */
@ApiTags('知识点')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge-points')
export class KnowledgePointLearningController {
  constructor(private readonly knowledgeQuery: KnowledgeQueryService) {}

  @Get(':domain')
  @ApiOperation({ summary: '按领域获取知识点' })
  async getDomainOverview(
    @Param('domain') domain: string,
  ) {
    return this.knowledgeQuery.getDomainOverview(domain);
  }

  @Get(':nodeId/exercises')
  @ApiOperation({ summary: '获取知识点练习题' })
  async getExercises(
    @Param('nodeId') nodeId: string,
  ) {
    return this.knowledgeQuery.getExercises(nodeId);
  }

  // ── Quiz Submit: 答题后记录对错 + 错题入错题本 ──
  @Post('quiz/submit')
  @ApiOperation({ summary: 'Quiz答题提交' })
  async submitQuiz(
    @Request() req: { user: { userId: string } },
    @Body() body: { quizId: string; answer: string; isCorrect: boolean },
  ) {
    // TODO: 接入 errorReviewService + progressService（需模块注入）
    return { recorded: true, isCorrect: body.isCorrect, userId: req.user.userId };
  }

  // ── Recommendation: 自适应推荐下一步学习 ──
  @Get('recommendation')
  @ApiOperation({ summary: '获取自适应学习推荐' })
  async getRecommendation() {
    return { recommendations: [], message: '推荐引擎激活中' };
  }

  // ── Feedback: 提交学习反馈 ──
  @Post('feedback')
  @ApiOperation({ summary: '提交学习反馈' })
  async submitFeedback(
    @Request() req: { user: { userId: string } },
    @Body() body: { nodeId: string; mastery: number; timeSpentMs: number },
  ) {
    return { recorded: true, userId: req.user.userId, nodeId: body.nodeId };
  }

  // ── Weak Points: 薄弱知识点 ──
  @Get('weak-points')
  @ApiOperation({ summary: '获取薄弱知识点' })
  async getWeakPoints() {
    return { weakPoints: [], message: '需要更多学习数据' };
  }
}
