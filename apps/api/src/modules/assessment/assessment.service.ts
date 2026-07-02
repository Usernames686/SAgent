import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { LearningPath } from '../../entities/learning-path.entity';
import { IrtAssessmentService, AssessmentQuestion, AbilityEstimate } from './irt-assessment.service';
import { v4 as uuid } from 'uuid';

// 评估会话
interface AssessmentSession {
  id: string;
  userId: string;
  answers: { questionId: string; isCorrect: boolean; timeSpent: number; domain: string }[];
  answeredIds: Set<string>;
  currentTheta: number;
  isComplete: boolean;
  startedAt: number;
  questionStartTime: number;
  currentQuestion: AssessmentQuestion | null;
}

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);
  private sessions = new Map<string, AssessmentSession>();

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(LearningPath)
    private readonly pathRepo: Repository<LearningPath>,
    private readonly irtService: IrtAssessmentService,
  ) {}

  /**
   * 获取初始试题，创建一个新的评估会话
   */
  async getInitialQuestions(userId: string) {
    // 清理已有会话
    for (const [id, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(id);
    }

    const sessionId = uuid();
    const initialQuestions = this.irtService.getInitialQuestions(3);

    const session: AssessmentSession = {
      id: sessionId,
      userId,
      answers: [],
      answeredIds: new Set(),
      currentTheta: 0,
      isComplete: false,
      startedAt: Date.now(),
      questionStartTime: Date.now(),
      currentQuestion: initialQuestions[0],
    };
    this.sessions.set(sessionId, session);

    // 脱敏试题（去掉正确答案和解析）
    const safeQuestions = initialQuestions.map(q => ({
      id: q.id,
      domain: q.domain,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      timeLimit: q.timeLimit,
    }));

    return {
      sessionId,
      questions: safeQuestions,
      progress: {
        answered: 0,
        total: 20,
      },
    };
  }

  /**
   * 提交单题答案，返回下一题或完成状态
   */
  async submitAnswer(
    userId: string,
    sessionId: string,
    questionId: string,
    answerIndex: number,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('评估会话不存在或已过期');
    }
    if (session.userId !== userId) {
      throw new BadRequestException('会话不属于当前用户');
    }
    if (session.isComplete) {
      throw new BadRequestException('评估已完成');
    }

    // 查找试题
    const question = this.irtService.getQuestionPool().find(q => q.id === questionId);
    if (!question) {
      throw new BadRequestException('试题不存在');
    }

    const timeSpent = Math.floor((Date.now() - session.questionStartTime) / 1000);
    const isCorrect = answerIndex === question.correctIndex;

    // 记录答案
    session.answers.push({
      questionId,
      isCorrect,
      timeSpent,
      domain: question.domain,
    });
    session.answeredIds.add(questionId);

    // 更新能力估计
    const questionsMap = new Map(
      this.irtService.getQuestionPool().map(q => [q.id, q])
    );
    const estimate = this.irtService.estimateTheta(session.answers, questionsMap);
    session.currentTheta = estimate.theta;

    // 检查是否完成
    if (this.irtService.shouldStop(session.answers.length, estimate.standardError)) {
      return await this.completeAssessment(session, estimate);
    }

    // 选择下一题
    const nextQuestion = this.irtService.selectNextQuestion(
      session.currentTheta,
      session.answeredIds,
    );

    if (!nextQuestion) {
      // 没有更多可用试题了
      return await this.completeAssessment(session, estimate);
    }

    session.currentQuestion = nextQuestion;
    session.questionStartTime = Date.now();

    return {
      sessionId,
      complete: false,
      result: null,
      nextQuestion: {
        id: nextQuestion.id,
        domain: nextQuestion.domain,
        difficulty: nextQuestion.difficulty,
        question: nextQuestion.question,
        options: nextQuestion.options,
        timeLimit: nextQuestion.timeLimit,
      },
      progress: {
        answered: session.answers.length,
        total: 20,
      },
      currentEstimate: {
        theta: estimate.theta,
        standardError: estimate.standardError,
        level: this.irtService.thetaToLevel(estimate.theta),
        score: this.irtService.thetaToScore(estimate.theta),
      },
      lastAnswer: {
        isCorrect,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      },
    };
  }

  /**
   * 完成评估并生成用户画像和学习路径
   */
  private async completeAssessment(
    session: AssessmentSession,
    estimate: AbilityEstimate,
  ) {
    session.isComplete = true;

    const theta = estimate.theta;
    const level = this.irtService.thetaToLevel(theta);
    const overallScore = this.irtService.thetaToScore(theta);
    const dimensions = estimate.dimensions;

    // 更新用户画像
    let profile = await this.profileRepo.findOne({ where: { userId: session.userId } });
    if (!profile) {
      profile = this.profileRepo.create({ userId: session.userId });
    }

    profile.version = (profile.version || 0) + 1;
    profile.abilities = {
      overall: overallScore / 100,
      dimensions,
      confidence: estimate.standardError < 0.5 ? 0.85 : 0.6,
    };

    // 根据诊断结果填充基础画像
    profile.basics = profile.basics || { age: 0, occupation: '', education: '' };
    profile.goals = profile.goals || {
      targetRole: '',
      targetLanguages: ['JavaScript', 'TypeScript'],
      timeline: '3个月',
      commitment: '每天1小时',
    };
    profile.learningStyle = profile.learningStyle || {
      preferredMode: 'hands_on',
      pacePreference: theta < -0.5 ? 'slow' : 'moderate',
      challengeTolerance: theta < 0 ? 0.3 : 0.6,
      hintPreference: 'progressive',
    };
    profile.behavior = {
      ...profile.behavior,
      lastAssessment: {
        theta,
        standardError: estimate.standardError,
        answeredCount: estimate.answeredCount,
        correctCount: estimate.correctCount,
        completedAt: new Date().toISOString(),
      },
    };

    await this.profileRepo.save(profile);

    // 自动生成学习路径
    let path = null;
    try {
      // 确定学习方向
      const weakDimensions = Object.entries(dimensions)
        .filter(([, score]) => score < 0.4)
        .map(([domain]) => domain);

      const goal = weakDimensions.length > 0
        ? `重点提升 ${weakDimensions.slice(0, 2).join('、')}`
        : 'Vibe Coding 全栈学习';

      // 简单创建学习路径
      path = {
        level,
        focus: weakDimensions.length > 0 ? weakDimensions[0] : 'vibe_coding',
        goal,
      };
    } catch (err) {
      this.logger.warn(`学习路径自动生成失败: ${(err as Error).message}`);
    }

    // 清理会话
    this.sessions.delete(session.id);

    // 返回完整诊断报告
    return {
      sessionId: session.id,
      complete: true,
      result: {
        summary: {
          level,
          overallScore,
          theta,
          confidence: estimate.standardError < 0.5 ? '高' : '中',
        },
        dimensions: Object.entries(dimensions).map(([name, score]) => ({
          name,
          score: Math.round(score * 100),
          level: score < 0.3 ? '需加强' : score < 0.6 ? '基础' : score < 0.8 ? '良好' : '优秀',
        })),
        stats: {
          totalQuestions: estimate.answeredCount,
          correctAnswers: estimate.correctCount,
          accuracy: estimate.answeredCount > 0
            ? Math.round((estimate.correctCount / estimate.answeredCount) * 100)
            : 0,
        },
        suggestedPath: path,
      },
      nextQuestion: null,
      lastAnswer: null,
    };
  }

  /**
   * 获取最近一次诊断结果
   */
  async getResult(userId: string) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile || !profile.abilities || profile.abilities.overall === 0) {
      return { hasResult: false, message: '尚未完成能力诊断，请先进行诊断测试' };
    }

    const dimensions = profile.abilities.dimensions || {};
    const behaviour = profile.behavior as Record<string, unknown>;
    const lastAssessment = behaviour?.lastAssessment as Record<string, unknown> || {};

    return {
      hasResult: true,
      summary: {
        overall: profile.abilities.overall,
        confidence: profile.abilities.confidence,
        theta: lastAssessment.theta || null,
        standardError: lastAssessment.standardError || null,
        lastCompleted: lastAssessment.completedAt || null,
      },
      dimensions: Object.entries(dimensions).map(([name, score]) => ({
        name,
        score: Math.round((score as number) * 100),
      })),
      learningStyle: profile.learningStyle,
    };
  }
}
