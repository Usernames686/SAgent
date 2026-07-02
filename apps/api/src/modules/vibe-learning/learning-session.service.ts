import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSession } from '../../entities/ai-session.entity';

/** 学习会话的状态 */
export interface LearningSessionData {
  id: string;
  userId: string;
  /** 当前学习的知识点 nodeId */
  currentNodeId: string;
  /** 已完成的知识点 nodeId[] */
  completedNodeIds: string[];
  /** 知识点掌握程度 { nodeId: mastery (0-1) } */
  knowledgeState: Record<string, number>;
  /** 学习模式历史 */
  modeHistory: { nodeId: string; mode: string; timestamp: Date; score: number }[];
  /** 当前学习模式的阶段 — 三步闭环：lecture → practice → exam (前端可用 concept/code/quiz) */
  currentStage: 'lecture' | 'practice' | 'exam' | 'quiz' | 'coding' | 'reading' | 'project' | 'chat' | 'concept' | 'code';
  /** 会话上下文消息 */
  context: { role: 'user' | 'assistant' | 'system'; content: string }[];
  /** 总练习次数 */
  totalAttempts: number;
  /** 累计得分 */
  totalScore: number;
  /** 最后活跃时间 */
  lastActiveAt: Date;
}

@Injectable()
export class LearningSessionService {
  constructor(
    @InjectRepository(AiSession)
    private readonly sessionRepo: Repository<AiSession>,
  ) {}

  /** 创建新的学习会话 */
  async createSession(userId: string, currentNodeId: string): Promise<LearningSessionData> {
    const session = await this.sessionRepo.save({
      userId,
      type: 'vibe_learning',
      agentsUsed: ['orchestrator', 'tutor'],
      context: {
        currentNodeId,
        completedNodeIds: [],
        knowledgeState: {},
        modeHistory: [],
        currentStage: 'lecture',
        messages: [],
        totalAttempts: 0,
        totalScore: 0,
      },
    });

    return this.toSessionData(session);
  }

  /** 恢复或创建学习会话 */
  async getOrCreateSession(userId: string, currentNodeId?: string): Promise<LearningSessionData> {
    const existing = await this.sessionRepo.findOne({
      where: { userId, type: 'vibe_learning' },
      order: { createdAt: 'DESC' },
    });

    if (existing) {
      const data = this.toSessionData(existing);
      if (currentNodeId && data.currentNodeId !== currentNodeId) {
        data.currentNodeId = currentNodeId;
        data.currentStage = 'lecture';
        await this.saveContext(existing.id, data);
      }
      return data;
    }

    return this.createSession(userId, currentNodeId || 'JS-001');
  }

  /** 更新学习进度 */
  async updateProgress(
    sessionId: string,
    data: {
      currentNodeId?: string;
      completedNodeIds?: string[];
      knowledgeState?: Record<string, number>;
      currentStage?: LearningSessionData['currentStage'];
      modeEntry?: { nodeId: string; mode: string; score: number };
      contextMessage?: { role: 'user' | 'assistant' | 'system'; content: string };
      totalAttempts?: number;
      totalScore?: number;
    },
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return;

    const ctx = session.context as Record<string, unknown>;
    const sessionData = this.toSessionData(session);

    if (data.currentNodeId) sessionData.currentNodeId = data.currentNodeId;
    if (data.completedNodeIds) sessionData.completedNodeIds = data.completedNodeIds;
    if (data.knowledgeState) {
      Object.assign(sessionData.knowledgeState, data.knowledgeState);
    }
    if (data.currentStage) sessionData.currentStage = data.currentStage;
    if (data.modeEntry) {
      sessionData.modeHistory.push({
        ...data.modeEntry,
        timestamp: new Date(),
      });
    }
    if (data.contextMessage) {
      sessionData.context.push(data.contextMessage);
      // 保持上下文在合理大小内
      if (sessionData.context.length > 50) {
        sessionData.context = sessionData.context.slice(-50);
      }
    }
    if (data.totalAttempts !== undefined) sessionData.totalAttempts = data.totalAttempts;
    if (data.totalScore !== undefined) sessionData.totalScore = data.totalScore;

    sessionData.lastActiveAt = new Date();
    await this.saveContext(sessionId, sessionData);
  }

  /** 获取学习会话 */
  async getSession(sessionId: string): Promise<LearningSessionData | null> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    return session ? this.toSessionData(session) : null;
  }

  /** 获取用户最新的学习会话 */
  async getLatestSession(userId: string): Promise<LearningSessionData | null> {
    const session = await this.sessionRepo.findOne({
      where: { userId, type: 'vibe_learning' },
      order: { createdAt: 'DESC' },
    });
    return session ? this.toSessionData(session) : null;
  }

  /** 结束学习会话 */
  async endSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { endedAt: new Date() });
  }

  private async saveContext(sessionId: string, data: LearningSessionData): Promise<void> {
    const ctxData: Record<string, unknown> = {
      currentNodeId: data.currentNodeId,
      completedNodeIds: data.completedNodeIds,
      knowledgeState: data.knowledgeState,
      modeHistory: data.modeHistory,
      currentStage: data.currentStage,
      messages: data.context,
      totalAttempts: data.totalAttempts,
      totalScore: data.totalScore,
    };
    const sessionEntity = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (sessionEntity) {
      sessionEntity.context = ctxData;
      await this.sessionRepo.save(sessionEntity);
    }
  }

  private toSessionData(session: AiSession): LearningSessionData {
    const ctx = session.context as Record<string, unknown>;
    return {
      id: session.id,
      userId: session.userId,
      currentNodeId: (ctx.currentNodeId as string) || 'JS-001',
      completedNodeIds: (ctx.completedNodeIds as string[]) || [],
      knowledgeState: (ctx.knowledgeState as Record<string, number>) || {},
      modeHistory: (ctx.modeHistory as any[]) || [],
      currentStage: (ctx.currentStage as LearningSessionData['currentStage']) || 'lecture',
      context: (ctx.messages as LearningSessionData['context']) || [],
      totalAttempts: (ctx.totalAttempts as number) || 0,
      totalScore: (ctx.totalScore as number) || 0,
      lastActiveAt: session.createdAt,
    };
  }
}
