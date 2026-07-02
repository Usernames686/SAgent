import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { Exercise } from '../../entities/exercise.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { KnowledgePointService } from '../knowledge-point/knowledge-point.service';
import { LearningSessionService, LearningSessionData } from './learning-session.service';
import { getExerciseData } from './exercise-data';
import { AdaptiveLearningEngine, LearnerState, StudentProfileType, AdaptiveDecision } from './adaptive-learning.engine';
import { TeachingAgentCollaborator, TeachingContext, TeachingResult, TeachingScenario } from './teaching-agent-collaborator';
import { LearningPathEngine, LearningPathResult, PathPlanningRequest, LearningPathType } from './learning-path.engine';
import { getLectureContent, getLecturesByModule, LectureContent } from './lecture-content.data';
import { getQuizForNode, getMultiTypeQuizForNode, QuizItem, QuizType, CodeReviewIssue, OrderingItem } from './quiz-bank.data';
import { ErrorReviewService, CreateErrorReviewDto } from './error-review.service';

/** 学习模式 — 三步闭环：概念理解 → 动手实践 → 评估测验 */
export type LearningMode = 'lecture' | 'practice' | 'exam' | 'chat' | 'project'
  | 'concept' | 'code' | 'quiz';

/** 三阶段中文标签映射 */
export const STAGE_LABELS: Record<LearningMode, string> = {
  lecture: '📚 讲授',
  practice: '💻 练习',
  exam: '📝 考试',
  chat: '💬 讨论',
  project: '🏗️ 项目',
  concept: '📖 概念理解',
  code: '💻 动手实践',
  quiz: '📝 评估测验',
};

/** 单题考试结果（含正确答案和解析） */
export interface QuestionResult {
  questionId: string;
  questionText: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  explanation?: string;
}

/** Quiz 题目 */
export interface QuizQuestion {
  questionId: string;
  questionText: string;
  /** 题型 */
  type: QuizType;
  /** 选择题选项 */
  options?: { id: string; text: string; isCorrect: boolean }[];
  /** 填空题答案 */
  blankAnswer?: string;
  blankAlternatives?: string[];
  /** 代码补全 */
  codeTemplate?: string;
  codeAnswer?: string;
  codeValidatePattern?: string;
  /** 代码评审 */
  codeSnippet?: string;
  reviewIssues?: CodeReviewIssue[];
  /** 排序题 */
  orderingItems?: OrderingItem[];
  /** 题目解析（含正确答案说明） */
  explanation?: string;
  /** 难度等级 */
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}

/** 下一步学习建议 */
export interface NextLearningStep {
  nodeId: string;
  nodeName: string;
  mode: LearningMode;
  stage: string;
  title: string;
  description: string;
  /** 当前模式的内容（讲授阶段的纯文本） */
  content?: string;
  /** 讲授内容结构化数据（讲授阶段） */
  lectureContent?: LectureContent;
  /** Quiz 题目列表（考试阶段） */
  quizQuestions?: QuizQuestion[];
  /** 编码练习模板（练习阶段） */
  codeTemplate?: string;
  /** 编码练习参考解法（练习阶段） */
  referenceSolution?: string;
  /** 可用学习模式列表 */
  availableModes: { mode: LearningMode; label: string; description: string }[];
}

/** 学习进度总览 */
export interface LearningProgress {
  overallProgress: number;
  completedCount: number;
  totalCount: number;
  totalScore: number;
  totalAttempts: number;
  averageScore: number;
  currentModule: string;
  knowledgeState: Record<string, number>;
  completedNodeIds: string[];
  recentActivity: {
    nodeName: string;
    mode: string;
    score: number;
    timestamp: Date;
  }[];
  moduleProgress: {
    module: string;
    moduleName: string;
    completed: number;
    total: number;
    progress: number;
  }[];
}

@Injectable()
export class VibeLearningService {
  private readonly logger = new Logger(VibeLearningService.name);

  /** 模块显示名映射 */
  private readonly MODULE_NAMES: Record<string, string> = {
    'javascript-basics': 'JavaScript 核心基础',
    'nodejs-basics': 'Node.js 基础',
    'frontend-basics': '前端三件套',
    'react-basics': 'React 基础',
    'react-advanced': 'React 进阶',
    fullstack: '全栈开发',
    engineering: '工程化与部署',
    'ai-modern': 'AI + 现代开发',
  };

  /** 模块排序 */
  private readonly MODULE_ORDER = [
    'javascript-basics', 'nodejs-basics', 'frontend-basics',
    'react-basics', 'react-advanced', 'fullstack', 'engineering', 'ai-modern',
  ];

  constructor(
    private readonly kpService: KnowledgePointService,
    private readonly sessionService: LearningSessionService,
    private readonly adaptiveEngine: AdaptiveLearningEngine,
    private readonly teachingCollaborator: TeachingAgentCollaborator,
    private readonly pathEngine: LearningPathEngine,
    private readonly errorReviewService: ErrorReviewService,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  /** 创建/恢复学习会话 */
  async startLearning(userId: string, nodeId?: string) {
    // 如果没有指定知识点，推荐第一个未完成的知识点
    if (!nodeId) {
      nodeId = await this.recommendNextNode(userId);
    }
    const session = await this.sessionService.getOrCreateSession(userId, nodeId);
    const nextStep = await this.getNextStep(session);
    return { session, nextStep };
  }

  /** 获取下一步学习内容 — 三阶段：讲授 → 练习 → 考试 */
  async getNextStep(session: LearningSessionData): Promise<NextLearningStep> {
    const kp = await this.kpService.findById(session.currentNodeId);
    if (!kp) {
      return this.buildFallbackStep(session);
    }

    // 兼容旧会话：将旧的 stage 映射到新的三阶段
    const currentStage = this.normalizeStage(session.currentStage);

    // 三步闭环：概念理解 → 动手实践 → 评估测验
    const stages: { mode: LearningMode; stage: string }[] = [
      { mode: 'lecture', stage: '📖 概念理解' },
      { mode: 'practice', stage: '💻 动手实践' },
      { mode: 'exam', stage: '📝 评估测验' },
    ];

    // 根据当前阶段决定下一步
    const currentIndex = stages.findIndex(s => s.mode === currentStage);
    const nextMode = currentIndex < stages.length - 1 ? stages[currentIndex + 1].mode : currentStage;

    // 构建可用模式列表
    const availableModes = stages.map(s => ({
      mode: s.mode as LearningMode,
      label: s.stage,
      description: this.getModeDescription(s.mode as LearningMode, kp),
    }));

    // 根据当前模式生成内容
    let content: string | undefined;
    let lectureContent: LectureContent | undefined;
    let quizQuestions: QuizQuestion[] | undefined;
    let codeTemplate: string | undefined;
    let referenceSolution: string | undefined;

    if (currentStage === 'lecture') {
      // 讲授阶段：优先使用结构化讲授内容，降级为旧的阅读内容
      lectureContent = getLectureContent(kp.nodeId);
      content = lectureContent
        ? this.formatLectureAsMarkdown(lectureContent)
        : await this.generateReadingContent(kp, session);
    } else if (currentStage === 'practice') {
      // 练习阶段：提供编码练习
      const ex = getExerciseData(kp);
      codeTemplate = ex.template;
      referenceSolution = ex.reference;
    } else if (currentStage === 'exam') {
      // 考试阶段：提供 Quiz 测试
      quizQuestions = await this.generateQuizQuestions(kp);
    }

    return {
      nodeId: kp.nodeId,
      nodeName: kp.name,
      mode: currentStage,
      stage: stages.find(s => s.mode === currentStage)?.stage || '📖 概念理解',
      title: kp.name,
      description: kp.description,
      content,
      lectureContent,
      quizQuestions,
      codeTemplate,
      referenceSolution,
      availableModes,
    };
  }

  /** 将旧的 stage 名称映射到新的三阶段名称 */
  private normalizeStage(stage: LearningSessionData['currentStage']): LearningMode {
    const mapping: Record<string, LearningMode> = {
      'reading': 'lecture',
      'quiz': 'exam',
      'coding': 'practice',
      'lecture': 'lecture',
      'practice': 'practice',
      'exam': 'exam',
      'chat': 'chat',
      'project': 'project',
      // 三步闭环新模式名
      'concept': 'lecture',
      'code': 'practice',
    };
    return mapping[stage] || 'lecture';
  }

  /** 切换学习模式 — 支持三步闭环新模式名 (concept/code/quiz) */
  async switchMode(sessionId: string, userId: string, mode: LearningMode): Promise<NextLearningStep> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    // 将前端新模式名映射回内部阶段名
    const normalizedMode = this.normalizeStage(mode as LearningSessionData['currentStage']);
    session.currentStage = normalizedMode;
    await this.sessionService.updateProgress(sessionId, { currentStage: normalizedMode });
    return this.getNextStep(session);
  }

  /** 提交 Quiz 答案并评估 */
  async submitQuiz(
    sessionId: string, userId: string,
    quizAnswers: { questionId: string; selectedOptionId: string }[],
  ): Promise<{ correct: boolean; score: number; feedback: string; nextStep: NextLearningStep; questionResults: QuestionResult[]; nodeCompleted: boolean }> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const kp = await this.kpService.findById(session.currentNodeId);
    if (!kp) throw new Error('Knowledge point not found');

    // 重新生成题目以获取正确答案
    const questions = await this.generateQuizQuestions(kp);

    // 逐题评分，构建详细结果（支持多题型）
    let correctCount = 0;
    const questionResults: QuestionResult[] = questions.map(q => {
      const answer = quizAnswers.find(a => a.questionId === q.questionId);

      // 根据题型评分
      let isCorrect = false;
      let correctOptionId = '';
      let selectedOptionId = answer?.selectedOptionId ?? null;

      if (q.type === 'choice' && q.options) {
        // 选择题评分
        const selectedOption = answer
          ? q.options.find(o => o.id === answer.selectedOptionId)
          : null;
        const correctOption = q.options.find(o => o.isCorrect);
        isCorrect = selectedOption?.isCorrect === true;
        correctOptionId = correctOption?.id ?? '';
      } else if (q.type === 'fill_blank') {
        // 填空题评分：精确匹配 + 可选替代答案
        const userAnswer = answer?.selectedOptionId?.trim() || '';
        const mainAnswer = q.blankAnswer || '';
        const alternatives = q.blankAlternatives || [];
        isCorrect = userAnswer === mainAnswer || alternatives.some(alt => userAnswer === alt.trim());
        correctOptionId = mainAnswer;
      } else if (q.type === 'code_completion') {
        // 代码补全评分：简单正则模式匹配（降级为部分匹配）
        const userCode = answer?.selectedOptionId || '';
        const pattern = q.codeValidatePattern || '';
        if (pattern) {
          try {
            isCorrect = new RegExp(pattern, 's').test(userCode);
          } catch {
            isCorrect = userCode.includes(pattern);
          }
        } else {
          isCorrect = userCode.length > 10; // 降级：提交了代码即算部分正确
        }
        correctOptionId = 'code_match';
      } else if (q.type === 'ordering') {
        // 排序题评分：检查用户排列顺序
        const userOrder = (answer?.selectedOptionId || '').split(',').filter(Boolean);
        const items = q.orderingItems || [];
        const correctOrder = items
          .sort((a, b) => a.correctOrder - b.correctOrder)
          .map(item => item.id)
          .join(',');
        isCorrect = userOrder.join(',') === correctOrder;
        correctOptionId = correctOrder;
      } else if (q.type === 'code_review') {
        // 代码评审：提交即视为完成（主观评分由前端处理）
        isCorrect = true;
        correctOptionId = 'review_completed';
      } else {
        // 未知题型降级
        isCorrect = false;
        correctOptionId = '';
      }

      if (isCorrect) correctCount++;
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        selectedOptionId,
        correctOptionId,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const totalQuestions = Math.max(questions.length, 1);
    const score = correctCount / totalQuestions;
    const passed = score >= 0.9; // 三步闭环通过线：90%

    // 更新知识状态
    const newState = { ...session.knowledgeState };
    newState[kp.nodeId] = Math.max(newState[kp.nodeId] || 0, score);

    const newAttempts = session.totalAttempts + 1;
    const newScore = session.totalScore + (passed ? 10 : 2);

    // 三步闭环：提交后不自动跳阶段，由前端通过 switchMode 控制闭环决策
    // 仍需更新 currentStage 使 session 反映当前状态（供下次 getNextStep 使用）
    let nextNodeId = session.currentNodeId;
    let nextStage: LearningSessionData['currentStage'] = 'exam'; // 保持在当前考试阶段

    if (passed) {
      // 标记知识点完成（加入 completedNodeIds），但不自动切换到下一知识点
      // 前端收到 nodeCompleted 后展示完成过渡页，用户点"下一知识点"才切换
      const newCompletedIds = [...session.completedNodeIds];
      if (!newCompletedIds.includes(kp.nodeId)) {
        newCompletedIds.push(kp.nodeId);
      }
      await this.sessionService.updateProgress(sessionId, {
        completedNodeIds: newCompletedIds,
      });
    }

    await this.sessionService.updateProgress(sessionId, {
      currentNodeId: nextNodeId,
      knowledgeState: newState,
      currentStage: nextStage,
      modeEntry: { nodeId: kp.nodeId, mode: 'exam', score },
      totalAttempts: newAttempts,
      totalScore: newScore,
      contextMessage: {
        role: 'user',
        content: `[考试提交] 知识点:${kp.name}, 得分:${(score * 100).toFixed(0)}%, ${passed ? '通过' : '未通过'}`,
      },
    });

    // 重新获取 session，确保 getNextStep 反映最新状态
    const updatedSession = await this.sessionService.getSession(sessionId);
    const nextStep = await this.getNextStep(updatedSession || session);

    // 构建反馈 — 未通过时引用讲授内容关键点 + 复习提示
    let feedback: string;
    if (passed) {
      feedback = `🎉 考试通过！你掌握了 "${kp.name}" 的核心概念，得分 ${(score * 100).toFixed(0)}%。即将进入下一个知识点的讲授。`;
    } else {
      // 获取讲授内容中的关键概念作为复习指引
      const lecture = getLectureContent(kp.nodeId);
      const wrongCount = totalQuestions - correctCount;
      const reviewHints = lecture
        ? lecture.concepts.slice(0, 2).map(c => `• ${c.title}`).join('\n')
        : `• ${kp.assessmentCriteria.basic}`;
      feedback = [
        `📖 得分 ${(score * 100).toFixed(0)}%，未达到通过线 (60%)。答错 ${wrongCount}/${totalQuestions} 题。`,
        '',
        `📚 复习建议 — 回到讲授阶段重点理解：`,
        reviewHints,
        '',
        `💡 切换到「讲授」模式可查看完整讲解与代码示例。`,
      ].join('\n');
    }

    // 自动记录错题到 ErrorReview（不阻塞主流程）
    const wrongResults = questionResults.filter(r => !r.isCorrect);
    if (wrongResults.length > 0) {
      const errorDtos: CreateErrorReviewDto[] = wrongResults.map(r => {
        // 根据题型推断错误类型
        const q = questions.find(qq => qq.questionId === r.questionId);
        let errorType: CreateErrorReviewDto['errorType'] = 'concept';
        if (q?.type === 'code_completion' || q?.type === 'code_review') {
          errorType = 'syntax';
        } else if (q?.type === 'ordering' || q?.type === 'fill_blank') {
          errorType = 'logic';
        }
        return {
          nodeId: kp.nodeId,
          questionId: r.questionId,
          questionContent: r.questionText,
          userAnswer: r.selectedOptionId || '',
          correctAnswer: r.correctOptionId,
          errorType,
          explanation: r.explanation,
          sourceType: 'quiz' as const,
          originalScore: Math.round(score * 100),
        };
      });
      // 异步批量记录，不阻塞主流程
      this.errorReviewService.batchRecordErrors(userId, errorDtos).catch(err => {
        this.logger.warn(`记录错题失败: ${(err as Error).message}`);
      });
    }

    return { correct: passed, score, feedback, nextStep, questionResults, nodeCompleted: passed };
  }

  /** 提交编码练习评估 — 三阶段：练习通过 → 进入考试 */
  async submitCoding(
    sessionId: string, userId: string,
    code: string,
  ): Promise<{ score: number; feedback: string; analysis: { correct: string[]; missing: string[]; suggestions: string[] }; referenceSolution: string; nextStep: NextLearningStep; nodeCompleted: boolean }> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const kp = await this.kpService.findById(session.currentNodeId);
    if (!kp) throw new Error('Knowledge point not found');

    // 详细代码评估（含参考解法对比）
    const { score, analysis, referenceSolution } = this.evaluateCode(code, kp);
    const passed = score >= 0.9; // 90% 通过线

    const newState = { ...session.knowledgeState };
    newState[kp.nodeId] = Math.max(newState[kp.nodeId] || 0, score);

    let completedNodeIds = [...session.completedNodeIds];
    let nodeCompleted = false;

    if (passed && !completedNodeIds.includes(kp.nodeId)) {
      completedNodeIds.push(kp.nodeId);
      nodeCompleted = true;
    }

    const newAttempts = session.totalAttempts + 1;
    const newScore = session.totalScore + (passed ? 20 : 5);

    // 三步闭环：练习提交后不自动跳阶段，由前端通过 switchMode 控制闭环决策
    let nextNodeId = session.currentNodeId;
    let nextStage: LearningSessionData['currentStage'] = 'practice'; // 保持在当前练习阶段

    await this.sessionService.updateProgress(sessionId, {
      currentNodeId: nextNodeId,
      completedNodeIds,
      knowledgeState: newState,
      currentStage: nextStage,
      modeEntry: { nodeId: kp.nodeId, mode: 'practice', score },
      totalAttempts: newAttempts,
      totalScore: newScore,
      contextMessage: {
        role: 'user',
        content: `[练习提交] 知识点:${kp.name}, 得分:${(score * 100).toFixed(0)}%, ${passed ? '通过' : '未通过'}`,
      },
    });

    // 重新获取 session，确保 getNextStep 使用更新后的状态
    const updatedSession = await this.sessionService.getSession(sessionId);
    const nextStep = await this.getNextStep(updatedSession || session);

    // 自动记录练习错题到 ErrorReview（不阻塞主流程）
    if (!passed && analysis.missing.length > 0) {
      this.errorReviewService.recordError(userId, {
        nodeId: kp.nodeId,
        questionId: `practice-${kp.nodeId}`,
        questionContent: `编码练习：${kp.name}`,
        userAnswer: code.substring(0, 200),
        correctAnswer: referenceSolution.substring(0, 200),
        errorType: analysis.missing.some(m => /syntax|语法/i.test(m)) ? 'syntax' : 'logic',
        explanation: analysis.missing.slice(0, 3).join('; '),
        sourceType: 'exercise',
        originalScore: Math.round(score * 100),
      }).catch(err => {
        this.logger.warn(`记录练习错题失败: ${(err as Error).message}`);
      });
    }

    return {
      score,
      feedback: this.buildCodingFeedback(score, kp, analysis, passed),
      analysis,
      referenceSolution,
      nextStep,
      nodeCompleted,
    };
  }

  /** AI 学习对话 */
  async chat(userId: string, sessionId: string, message: string): Promise<{ reply: string; updatedContext: any[] }> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const kp = await this.kpService.findById(session.currentNodeId);

    // 将消息加入上下文
    await this.sessionService.updateProgress(sessionId, {
      contextMessage: { role: 'user', content: message },
    });

    // 更新后的上下文
    const updatedSession = await this.sessionService.getSession(sessionId);
    const context = updatedSession?.context || session.context;

    // 构建回复上下文
    const contextInfo = kp
      ? `当前学习知识点：${kp.name}（${kp.description}）\n你在这个知识点上的掌握程度：${session.knowledgeState[kp.nodeId] ? (session.knowledgeState[kp.nodeId] * 100).toFixed(0) + '%' : '尚未评估'}`
      : '当前没有特定知识点。';

    return {
      reply: `📚 **${kp?.name || '学习助手'}**\n\n${contextInfo}\n\n---\n\n你好！我是你的 AI 学习助手。关于 "${kp?.name || '编程学习'}" 有什么想问的吗？\n\n*小提示：你可以问「解释一下这个概念」「给个例子」「我哪里理解错了」等*`,
      updatedContext: [...context, { role: 'assistant', content: 'AI reply generated' }],
    };
  }

  /** 获取学习进度总览 */
  async getProgress(userId: string): Promise<LearningProgress> {
    const allKps = await this.kpRepo.find({ where: { status: 'published' }, order: { difficulty: 'ASC' } });
    const session = await this.sessionService.getLatestSession(userId);
    const profile = await this.profileRepo.findOne({ where: { userId } });

    const knowledgeState = session?.knowledgeState || {};
    const completedIds = session?.completedNodeIds || [];
    const completedCount = completedIds.length;
    const totalCount = allKps.length;
    const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // 按模块统计
    const moduleMap = new Map<string, { completed: number; total: number }>();
    for (const kp of allKps) {
      const m = kp.module || 'other';
      if (!moduleMap.has(m)) moduleMap.set(m, { completed: 0, total: 0 });
      const entry = moduleMap.get(m)!;
      entry.total++;
      if (completedIds.includes(kp.nodeId)) entry.completed++;
    }

    const moduleProgress: LearningProgress['moduleProgress'] = this.MODULE_ORDER
      .filter(m => moduleMap.has(m))
      .map(m => {
        const entry = moduleMap.get(m)!;
        return {
          module: m,
          moduleName: this.MODULE_NAMES[m] || m,
          completed: entry.completed,
          total: entry.total,
          progress: entry.total > 0 ? (entry.completed / entry.total) * 100 : 0,
        };
      });

    // 补充不在排序中的模块
    for (const [m, entry] of moduleMap) {
      if (!this.MODULE_ORDER.includes(m)) {
        moduleProgress.push({
          module: m,
          moduleName: this.MODULE_NAMES[m] || m,
          completed: entry.completed,
          total: entry.total,
          progress: entry.total > 0 ? (entry.completed / entry.total) * 100 : 0,
        });
      }
    }

    // 确定当前模块
    let currentModule = 'javascript-basics';
    if (session?.currentNodeId) {
      const currentKp = allKps.find(k => k.nodeId === session.currentNodeId);
      if (currentKp) currentModule = currentKp.module || 'javascript-basics';
    }

    return {
      overallProgress,
      completedCount,
      totalCount,
      totalScore: session?.totalScore || 0,
      totalAttempts: session?.totalAttempts || 0,
      averageScore: (session?.totalAttempts || 0) > 0
        ? Math.round(((session?.totalScore || 0) / (session?.totalAttempts || 1)) * 10) / 10
        : 0,
      currentModule: this.MODULE_NAMES[currentModule] || currentModule,
      knowledgeState,
      completedNodeIds: completedIds,
      recentActivity: (session?.modeHistory || []).slice(-10).reverse().map(h => ({
        nodeName: allKps.find(k => k.nodeId === h.nodeId)?.name || h.nodeId,
        mode: h.mode,
        score: h.score,
        timestamp: h.timestamp,
      })),
      moduleProgress,
    };
  }

  /** 推荐下一个要学习的知识点 */
  private async recommendNextNode(userId: string): Promise<string> {
    const allKps = await this.kpRepo.find({
      where: { status: 'published' },
      order: { difficulty: 'ASC' },
    });
    const session = await this.sessionService.getLatestSession(userId);
    const completedIds = session?.completedNodeIds || [];
    const knowledgeState = session?.knowledgeState || {};

    // 按模块顺序寻找第一个未完成且前置条件满足的知识点
    for (const moduleName of this.MODULE_ORDER) {
      const moduleKps = allKps.filter(k => k.module === moduleName);
      for (const kp of moduleKps) {
        if (completedIds.includes(kp.nodeId)) continue;
        // 检查前置条件
        const prerequisitesMet = kp.prerequisites.length === 0 ||
          kp.prerequisites.every(p => completedIds.includes(p) || (knowledgeState[p] || 0) >= 0.5);
        if (prerequisitesMet) return kp.nodeId;
      }
    }
    return allKps[0]?.nodeId || 'JS-001';
  }

  /** 获取下一个知识点 ID */
  private async getNextNodeId(
    currentKp: KnowledgePoint,
    completedIds: string[],
    knowledgeState: Record<string, number>,
    userId: string,
  ): Promise<string> {
    // 优先推荐当前模块的下一个知识点
    const moduleKps = await this.kpRepo.find({
      where: { module: currentKp.module, status: 'published' },
      order: { difficulty: 'ASC' },
    });

    const currentIdx = moduleKps.findIndex(k => k.nodeId === currentKp.nodeId);
    if (currentIdx >= 0 && currentIdx < moduleKps.length - 1) {
      return moduleKps[currentIdx + 1].nodeId;
    }

    // 当前模块已完成，进入下一个模块
    const currentModIdx = this.MODULE_ORDER.indexOf(currentKp.module || '');
    if (currentModIdx >= 0 && currentModIdx < this.MODULE_ORDER.length - 1) {
      const nextModule = this.MODULE_ORDER[currentModIdx + 1];
      const nextKps = await this.kpRepo.find({
        where: { module: nextModule, status: 'published' },
        order: { difficulty: 'ASC' },
      });
      if (nextKps.length > 0) return nextKps[0].nodeId;
    }

    // 兜底：推荐第一个未完成的知识点
    return this.recommendNextNode(userId);
  }

  /** 生成阅读内容 */
  private async generateReadingContent(kp: KnowledgePoint, session: LearningSessionData): Promise<string> {
    const mastery = session.knowledgeState[kp.nodeId] || 0;
    const difficultyLabel = ['🔵 入门', '🟡 进阶', '🔴 高级'][kp.difficulty - 1] || '🔵 入门';

    let prerequisitesSection = '';
    if (kp.prerequisites.length > 0) {
      const prereqKps = await Promise.all(
        kp.prerequisites.map(id => this.kpService.findById(id)),
      );
      const prereqNames = prereqKps.filter(Boolean).map(p => p!.name);
      if (prereqNames.length > 0) {
        prerequisitesSection = `\n\n**前置知识：** ${prereqNames.join('、')}`;
      }
    }

    const skillsList = kp.skills.map(s => `- \`${s}\``).join('\n');

    const assessmentRows = [
      `- **入门：** ${kp.assessmentCriteria.basic}`,
      `- **进阶：** ${kp.assessmentCriteria.intermediate}`,
      `- **高级：** ${kp.assessmentCriteria.advanced}`,
    ].join('\n');

    return [
      `# ${kp.name}`,
      ``,
      `${difficultyLabel} · 预计 ${kp.estimatedMinutes} 分钟`,
      `${prerequisitesSection}`,
      ``,
      `## 📖 概述`,
      `${kp.description}`,
      ``,
      `## 🎯 学习目标`,
      `${assessmentRows}`,
      ``,
      `## 🔧 核心技能`,
      `${skillsList}`,
      ``,
      mastery > 0 ? `\n**当前掌握程度：${(mastery * 100).toFixed(0)}%**` : '',
      ``,
      `> 💡 *阅读完成后，进入 Quiz 测试检验你的理解！*`,
    ].join('\n');
  }

  /** 将结构化讲授内容格式化为 Markdown */
  private formatLectureAsMarkdown(lecture: LectureContent): string {
    const sections: string[] = [];

    // 标题
    sections.push(`# ${lecture.nodeId} — ${lecture.motivation.split('—')[0].trim()}`);
    sections.push('');

    // 动机（为什么学这个）
    sections.push('## 🎯 为什么要学这个？');
    sections.push(lecture.motivation);
    sections.push('');

    // 核心概念
    if (lecture.concepts && lecture.concepts.length > 0) {
      sections.push('## 📖 核心概念');
      for (const concept of lecture.concepts) {
        sections.push(`### ${concept.title}`);
        sections.push(concept.content);
        sections.push('');
      }
    }

    // 代码示例
    if (lecture.codeExamples && lecture.codeExamples.length > 0) {
      sections.push('## 💻 代码示例');
      for (const example of lecture.codeExamples) {
        sections.push(`### ${example.title}`);
        if (example.explanation) {
          sections.push(example.explanation);
        }
        sections.push('```javascript');
        sections.push(example.code);
        sections.push('```');
        sections.push('');
      }
    }

    // 常见坑点与最佳实践
    if (lecture.tips && lecture.tips.length > 0) {
      sections.push('## ⚠️ 常见坑点与最佳实践');
      for (const tip of lecture.tips) {
        sections.push(`- ${tip}`);
      }
      sections.push('');
    }

    // 总结
    if (lecture.summary) {
      sections.push('## 📝 要点总结');
      sections.push(lecture.summary);
      sections.push('');
    }

    // 思考题
    if (lecture.thinkQuestions && lecture.thinkQuestions.length > 0) {
      sections.push('## 🤔 思考题');
      for (let i = 0; i < lecture.thinkQuestions.length; i++) {
        sections.push(`${i + 1}. ${lecture.thinkQuestions[i]}`);
      }
      sections.push('');
    }

    sections.push('> 💡 *讲授完成！接下来进入 💻 练习 环节进行实践编码。*');

    return sections.join('\n');
  }

  /** 生成 Quiz 选项 — 优先使用 quiz-bank.data.ts 丰富题库（含多题型） */
  private async generateQuizQuestions(kp: KnowledgePoint): Promise<QuizQuestion[]> {
    // 优先从结构化题库获取（选择题 + 多题型混合）
    const multiTypeItems = getMultiTypeQuizForNode(kp.nodeId);
    if (multiTypeItems.length > 0) {
      return multiTypeItems.map(item => ({
        questionId: item.questionId,
        questionText: item.questionText,
        type: item.type,
        options: item.options,
        blankAnswer: item.blankAnswer,
        blankAlternatives: item.blankAlternatives,
        codeTemplate: item.codeTemplate,
        codeAnswer: item.codeAnswer,
        codeValidatePattern: item.codeValidatePattern,
        codeSnippet: item.codeSnippet,
        reviewIssues: item.reviewIssues,
        orderingItems: item.orderingItems,
        explanation: item.explanation,
        difficulty: item.difficulty,
      }));
    }

    // 降级：没有题库的知识点，生成 2 题兜底
    return [
      {
        questionId: `q-0-${kp.nodeId}`,
        questionText: `关于 "${kp.name}" 的理解，以下哪个是正确的？`,
        type: 'choice' as const,
        options: [
          { id: 'q-0-opt-0', text: kp.assessmentCriteria.basic, isCorrect: true },
          { id: 'q-0-opt-1', text: '这个概念不需要理解', isCorrect: false },
          { id: 'q-0-opt-2', text: '这个概念已经被淘汰了', isCorrect: false },
          { id: 'q-0-opt-3', text: '这个概念只能通过实践掌握', isCorrect: false },
        ],
        explanation: `${kp.name}的核心要点：${kp.assessmentCriteria.basic}`,
        difficulty: 'basic' as const,
      },
      {
        questionId: `q-1-${kp.nodeId}`,
        questionText: `以下关于 "${kp.name}" 的说法，哪个是错误的？`,
        type: 'choice' as const,
        options: [
          { id: 'q-1-opt-0', text: '这个概念在现代开发中很重要', isCorrect: false },
          { id: 'q-1-opt-1', text: '这个概念可以忽略不计', isCorrect: true },
          { id: 'q-1-opt-2', text: `掌握${kp.name}有助于理解后续内容`, isCorrect: false },
          { id: 'q-1-opt-3', text: `这个概念有明确的使用场景`, isCorrect: false },
        ],
        explanation: `${kp.name}是重要概念，不能忽略。${kp.assessmentCriteria.basic}`,
        difficulty: 'intermediate' as const,
      },
    ];
  }

  /** 生成编码练习模板 */
  private async generateCodeTemplate(kp: KnowledgePoint): Promise<string> {
    return getExerciseData(kp).template;
  }

  /** 评估代码质量 - 基于 exercise-data 的参考解法对比 */
  private evaluateCode(code: string, kp: KnowledgePoint): { score: number; analysis: { correct: string[]; missing: string[]; suggestions: string[] }; referenceSolution: string } {
    const ex = getExerciseData(kp);
    const refCode = ex.reference;

    let totalScore = 0;
    const correctItems: string[] = [];
    const missingItems: string[] = [];

    for (const check of ex.checks) {
      if (check.pattern.test(code)) {
        totalScore += check.weight;
        correctItems.push(check.name);
      } else {
        missingItems.push(check.name);
      }
    }

    const finalScore = Math.min(totalScore, 1.0);

    // 生成改进建议
    const suggestions: string[] = [];
    if (finalScore < 0.9) {
      if (missingItems.length > 0) {
        suggestions.push(`缺失功能：${missingItems.slice(0, 3).join('、')}`);
      }
      if (code.length < 50) {
        suggestions.push('代码过短，请补充完整实现');
      }
      if (code.length < refCode.length * 0.4) {
        suggestions.push('请参考下方的参考答案，补充缺失的关键代码');
      }
    }

    return { score: finalScore, analysis: { correct: correctItems, missing: missingItems, suggestions }, referenceSolution: refCode };
  }

  /** 构建编码练习反馈 */
  private buildCodingFeedback(score: number, kp: KnowledgePoint, analysis: { correct: string[]; missing: string[]; suggestions: string[] }, passed: boolean): string {
    const scoreLine = `**得分：${(score * 100).toFixed(0)}%${passed ? ' ✅ 通过！' : ' ❌ 未通过（需 90% 以上）'}**\n`;
    const correctLine = analysis.correct.length > 0 ? `\n✅ 已实现：\n${analysis.correct.map(c => `  • ${c}`).join('\n')}\n` : '';
    const missingLine = analysis.missing.length > 0 ? `\n❌ 未实现：\n${analysis.missing.map(m => `  • ${m}`).join('\n')}\n` : '';
    const suggestLine = analysis.suggestions.length > 0 ? `\n💡 改进建议：\n${analysis.suggestions.map(s => `  • ${s}`).join('\n')}\n` : '';

    if (passed) {
      return `${scoreLine}\n🎉 所有关键检查项均已通过！即将进入考试阶段验证掌握程度。\n${correctLine}\n${kp.assessmentCriteria.advanced ? `**进阶挑战：** ${kp.assessmentCriteria.advanced}` : ''}`;
    }
    return `${scoreLine}${missingLine}${suggestLine}\n📖 请对照下方的参考答案修改你的代码，修改后重新提交。练习通过后将进入考试阶段。`;
  }

  /** 获取模式描述 — 三步闭环：概念理解 → 动手实践 → 评估测验 */
  private getModeDescription(mode: LearningMode, kp: KnowledgePoint): string {
    const desc: Record<LearningMode, string> = {
      lecture: `📖 概念理解：阅读 "${kp.name}" 的知识讲解、代码示例和要点总结`,
      practice: `💻 动手实践：在编辑器中编写代码实践 "${kp.name}" 的核心概念`,
      exam: `📝 评估测验：通过选择题测试你对 "${kp.name}" 的掌握程度，通过后进入下一知识点`,
      chat: '💬 讨论：与 AI 助手讨论和提问',
      project: '🏗️ 项目：完成综合项目练习',
      concept: `📖 概念理解：阅读 "${kp.name}" 的知识讲解、代码示例和要点总结`,
      code: `💻 动手实践：在编辑器中编写代码实践 "${kp.name}" 的核心概念`,
      quiz: `📝 评估测验：通过选择题测试你对 "${kp.name}" 的掌握程度，通过后进入下一知识点`,
    };
    return desc[mode] || '';
  }

  /** ★ 新增：提交学习反馈 */
  async submitFeedback(
    userId: string,
    sessionId: string,
    feedback: { type: 'difficulty' | 'pace' | 'content' | 'emotion'; value: string; comment?: string },
  ): Promise<{ acknowledged: boolean; adjustment?: string }> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    // 记录反馈到会话上下文
    await this.sessionService.updateProgress(sessionId, {
      contextMessage: {
        role: 'system',
        content: `[学习反馈] 类型:${feedback.type}, 值:${feedback.value}${feedback.comment ? `, 备注:${feedback.comment}` : ''}`,
      },
    });

    // 根据反馈类型调整学习策略
    let adjustment = '';
    const kp = await this.kpService.findById(session.currentNodeId);

    switch (feedback.type) {
      case 'difficulty':
        if (feedback.value === 'too_hard' && kp) {
          adjustment = `已降低难度：将增加 "${kp.name}" 的阅读辅导内容，减少练习要求`;
        } else if (feedback.value === 'too_easy' && kp) {
          adjustment = `已提升难度：将跳过部分基础知识，增加进阶练习`;
        }
        break;
      case 'pace':
        if (feedback.value === 'too_fast') {
          adjustment = '已调整学习节奏：将增加复习环节和提示';
        } else if (feedback.value === 'too_slow') {
          adjustment = '已加快学习节奏：将减少重复内容';
        }
        break;
      case 'emotion':
        if (feedback.value === 'frustrated') {
          adjustment = '检测到挫败感：建议休息一下，或切换到 AI 对话模式获得更多帮助';
        } else if (feedback.value === 'bored') {
          adjustment = '检测到倦怠：将增加更有趣的练习和挑战';
        }
        break;
      case 'content':
        adjustment = '感谢反馈！我们将改进内容质量';
        break;
    }

    // 更新用户画像
    try {
      const profile = await this.profileRepo.findOne({ where: { userId } });
      if (profile) {
        const behavior = { ...(profile.behavior as Record<string, unknown> || {}) };
        const feedbackHistory = (behavior.feedbackHistory as any[]) || [];
        feedbackHistory.push({ ...feedback, timestamp: new Date().toISOString() });
        behavior.feedbackHistory = feedbackHistory;
        profile.behavior = behavior;
        await this.profileRepo.save(profile);
      }
    } catch (err) {
      this.logger.warn(`Failed to update user profile with feedback: ${err}`);
    }

    return { acknowledged: true, adjustment };
  }

  /** ★ 新增：触发个性化调整 */
  async personalize(
    userId: string,
    sessionId?: string,
  ): Promise<{
    profile: {
      preferredMode: string;
      pacePreference: string;
      challengeTolerance: number;
      hintPreference: string;
    };
    emotional: {
      frustrationLevel: number;
      confidenceLevel: number;
      engagementLevel: number;
    };
    adjustments: string[];
  }> {
    // 获取用户画像
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const defaultLearningStyle = {
      preferredMode: 'hands_on',
      pacePreference: 'moderate',
      challengeTolerance: 0.6,
      hintPreference: 'progressive',
    };
    const defaultEmotional = {
      frustrationLevel: 0.2,
      confidenceLevel: 0.5,
      engagementLevel: 0.7,
    };

    const learningStyle = profile?.learningStyle || defaultLearningStyle;
    const emotional = (profile?.emotional as Record<string, number>) || defaultEmotional;

    // 获取学习会话数据
    let session: LearningSessionData | null = null;
    if (sessionId) {
      session = await this.sessionService.getSession(sessionId);
    }
    if (!session) {
      session = await this.sessionService.getLatestSession(userId);
    }

    // 基于学习数据计算个性化调整
    const adjustments: string[] = [];

    if (session) {
      const recentHistory = session.modeHistory.slice(-10);
      const recentScores = recentHistory.map(h => h.score);
      const avgScore = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0.5;

      if (avgScore < 0.4) {
        adjustments.push('近期得分偏低，已降低难度并增加提示');
        adjustments.push('建议切换到阅读模式重新学习');
      } else if (avgScore > 0.9) {
        adjustments.push('表现优秀！已提升挑战难度');
      }

      // 检测学习偏好
      const modeCounts: Record<string, number> = {};
      for (const h of recentHistory) {
        modeCounts[h.mode] = (modeCounts[h.mode] || 0) + 1;
      }
      const dominantMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0];
      if (dominantMode && dominantMode[1] > 5) {
        adjustments.push(`检测到你偏好 ${dominantMode[0]} 模式，将优先推荐`);
      }

      // 更新用户画像中的情绪状态
      const newEmotional = { ...defaultEmotional, ...emotional };
      if (avgScore < 0.3) newEmotional.frustrationLevel = Math.min(1, (newEmotional.frustrationLevel || 0) + 0.1);
      if (avgScore > 0.8) newEmotional.confidenceLevel = Math.min(1, (newEmotional.confidenceLevel || 0) + 0.1);

      try {
        if (profile) {
          profile.emotional = newEmotional;
          await this.profileRepo.save(profile);
        }
      } catch (err) {
        this.logger.warn(`Failed to update emotional state: ${err}`);
      }
    }

    return {
      profile: learningStyle,
      emotional: emotional as any,
      adjustments,
    };
  }

  // ===================================================================
  // ★ 集成新引擎：自适应学习 + 多Agent协作 + 学习路径
  // ===================================================================

  /**
   * 获取自适应学习决策
   * 根据学习者当前状态，推荐下一步学什么、怎么学、多难
   */
  async getAdaptiveDecision(userId: string): Promise<AdaptiveDecision> {
    const session = await this.sessionService.getLatestSession(userId);
    const profile = await this.profileRepo.findOne({ where: { userId } });

    // 初始化或恢复学习者状态
    const learnerState = this.buildLearnerState(userId, session, profile);
    const candidateNodes = await this.getCandidateNodes(learnerState);

    return this.adaptiveEngine.makeAdaptiveDecision(learnerState, candidateNodes);
  }

  /**
   * 执行多Agent协作教学
   * 根据场景自动编排 Tutor/Debug/Evaluator/Mentor 等 Agent 协作
   */
  async executeTeaching(
    userId: string,
    sessionId: string,
    scenario?: TeachingScenario,
    userMessage?: string,
  ): Promise<TeachingResult> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const profile = await this.profileRepo.findOne({ where: { userId } });
    const learnerState = this.buildLearnerState(userId, session, profile);
    const candidateNodes = await this.getCandidateNodes(learnerState);
    const adaptiveDecision = this.adaptiveEngine.makeAdaptiveDecision(learnerState, candidateNodes);

    const kp = await this.kpService.findById(session.currentNodeId);

    // 构建教学上下文
    const context: TeachingContext = {
      userId,
      sessionId,
      learnerState,
      adaptiveDecision,
      scenario: scenario || 'concept_introduction',
      currentNodeId: session.currentNodeId,
      currentNodeName: kp?.name || session.currentNodeId,
      userMessage: userMessage || '',
      emotionalState: (profile?.emotional as any) || undefined,
      sharedVariables: {},
      recentInteractions: [],
    };

    // 如果没有指定场景，自动识别
    if (!scenario) {
      scenario = this.teachingCollaborator.identifyScenario(context);
    }

    return this.teachingCollaborator.executeTeaching({
      ...context,
      scenario,
    });
  }

  /**
   * 生成个性化学习路径
   * 支持多种路径类型：系统推荐、目标驱动、弱项强化、模块聚焦、面试冲刺
   */
  async generateLearningPath(
    userId: string,
    pathType: LearningPathType = 'system_recommended',
    options?: { targetNodeId?: string; focusModule?: string; maxNodes?: number },
  ): Promise<LearningPathResult> {
    const session = await this.sessionService.getLatestSession(userId);
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const learnerState = this.buildLearnerState(userId, session, profile);

    const request: PathPlanningRequest = {
      userId,
      learnerState,
      pathType,
      targetNodeId: options?.targetNodeId,
      focusModule: options?.focusModule,
      maxNodes: options?.maxNodes,
    };

    return this.pathEngine.generatePath(request);
  }

  /**
   * 更新学习路径（基于最新进度）
   */
  async updateLearningPath(
    userId: string,
    existingPath: LearningPathResult,
  ): Promise<LearningPathResult> {
    const session = await this.sessionService.getLatestSession(userId);
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const learnerState = this.buildLearnerState(userId, session, profile);

    return this.pathEngine.updatePath(existingPath, learnerState);
  }

  /**
   * 获取当前可学习的知识点（前置条件已满足）
   */
  async getAvailableNodes(userId: string) {
    const session = await this.sessionService.getLatestSession(userId);
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const learnerState = this.buildLearnerState(userId, session, profile);

    return this.pathEngine.getAvailableNodes(learnerState);
  }

  /**
   * ★ 核心集成：自适应 + Agent 协作 + 路径 一站式学习入口
   * 
   * 流程：
   * 1. 自适应引擎分析学习者状态 → 推荐决策
   * 2. 学习路径引擎提供可学节点
   * 3. 多 Agent 协作引擎执行教学
   * 4. 返回综合结果
   */
  async adaptiveLearn(
    userId: string,
    userMessage?: string,
  ): Promise<{
    decision: AdaptiveDecision;
    teaching: TeachingResult;
    availableNodes: import('./learning-path.engine').PathNode[];
    path: LearningPathResult;
  }> {
    const session = await this.sessionService.getLatestSession(userId);
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const learnerState = this.buildLearnerState(userId, session, profile);

    // 1. 自适应决策
    const candidateNodes = await this.getCandidateNodes(learnerState);
    const decision = this.adaptiveEngine.makeAdaptiveDecision(learnerState, candidateNodes);

    // 2. 可学节点
    const availableNodes = await this.pathEngine.getAvailableNodes(learnerState);

    // 3. 学习路径
    const path = await this.pathEngine.generatePath({
      userId,
      learnerState,
      pathType: 'system_recommended',
    });

    // 4. 如果有会话，执行教学
    let teaching: TeachingResult;
    if (session) {
      const kp = session.currentNodeId
        ? await this.kpService.findById(session.currentNodeId)
        : null;

      const context: TeachingContext = {
        userId,
        sessionId: session.id,
        learnerState,
        adaptiveDecision: decision,
        scenario: 'concept_introduction',
        currentNodeId: session.currentNodeId,
        currentNodeName: kp?.name || '',
        userMessage: userMessage || '',
        emotionalState: (profile?.emotional as any) || undefined,
        sharedVariables: {},
        recentInteractions: [],
      };

      const scenario = this.teachingCollaborator.identifyScenario(context);
      teaching = await this.teachingCollaborator.executeTeaching({ ...context, scenario });
    } else {
      // 无会话时的默认教学结果
      teaching = {
        scenario: 'concept_introduction',
        strategyId: 'default',
        agentResults: [],
        synthesizedContent: '欢迎使用 sAgent 氛围编程学习系统！请选择一个知识点开始学习。',
        recommendedNextAction: {
          type: 'continue',
          reason: '新用户首次进入系统',
        },
        learnerStateUpdate: {},
        conflicts: [],
        reflection: '新用户首次进入系统',
      };
    }

    return { decision, teaching, availableNodes, path };
  }

  /**
   * 获取候选知识点列表（供自适应引擎使用）
   */
  private async getCandidateNodes(learnerState: LearnerState) {
    const allKPs = await this.kpRepo.find({ where: { status: 'published' } });
    return allKPs.map(kp => ({
      nodeId: kp.nodeId,
      difficulty: kp.difficulty || 1,
      prerequisites: (kp.prerequisites as string[]) || [],
      dependents: (kp.dependents as string[]) || [],
      mastery: learnerState.knowledgeMastery[kp.nodeId] || 0,
    }));
  }

  /**
   * 从会话和画像数据构建 LearnerState
   */
  private buildLearnerState(
    userId: string,
    session: LearningSessionData | null,
    profile: UserProfile | null,
  ): LearnerState {
    const profileType: StudentProfileType =
      (profile?.learningStyle as any)?.profileType ||
      ((profile?.abilities?.overall || 0) >= 0.7 ? 'advanced' :
       (profile?.abilities?.overall || 0) >= 0.4 ? 'transition' : 'beginner');

    const knowledgeMastery: Record<string, number> = session?.knowledgeState || {};

    // 计算连续正确/错误
    const recentHistory = session?.modeHistory || [];
    let streakCorrect = 0;
    let streakWrong = 0;
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      if (recentHistory[i].score >= 0.9) streakCorrect++;
      else break;
    }
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      if (recentHistory[i].score < 0.9) streakWrong++;
      else break;
    }

    // 计算 IRT theta（基于平均掌握度估算）
    const masteryValues = Object.values(knowledgeMastery);
    const avgMastery = masteryValues.length > 0
      ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length
      : 0;
    const theta = -2 + avgMastery * 4; // 映射 [0,1] → [-2, 2]

    // 计算总练习数和正确数
    const totalPractices = recentHistory.length;
    const totalCorrect = recentHistory.filter(h => h.score >= 0.9).length;

    // 计算节奏分数
    const paceScore = session?.totalScore || 50;

    return {
      userId,
      profileType,
      knowledgeMastery,
      abilityTheta: theta,
      paceScore,
      streakCorrect,
      streakWrong,
      totalPractices,
      totalCorrect,
      lastStudyTime: session?.lastActiveAt ? session.lastActiveAt.getTime() : Date.now(),
      nodeHistory: recentHistory.reduce((acc, h) => {
        if (!acc[h.nodeId]) {
          acc[h.nodeId] = { attempts: 0, correct: 0, lastTime: 0, avgDifficulty: 3 };
        }
        acc[h.nodeId].attempts++;
        if (h.score >= 0.9) acc[h.nodeId].correct++;
        acc[h.nodeId].lastTime = new Date(h.timestamp).getTime();
        return acc;
      }, {} as Record<string, { attempts: number; correct: number; lastTime: number; avgDifficulty: number }>),
    };
  }

  /** 兜底步骤 */
  private buildFallbackStep(session: LearningSessionData): NextLearningStep {
    return {
      nodeId: 'JS-001',
      nodeName: '变量与数据类型',
      mode: 'lecture',
      stage: '📖 概念理解',
      title: '开始学习',
      description: '选择知识点开始你的学习之旅',
      content: '欢迎来到 sAgent 氛围编程学习系统！从这里开始你的 Node.js + React 全栈学习之旅。',
      availableModes: [
        { mode: 'lecture', label: '📖 概念理解', description: '理解核心概念' },
        { mode: 'practice', label: '💻 动手实践', description: '编码练习' },
        { mode: 'exam', label: '📝 评估测验', description: '测试掌握程度' },
      ],
    };
  }
}
