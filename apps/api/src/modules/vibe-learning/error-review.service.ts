// error-review.service.ts
// Step 38：错题回顾系统 — 服务层
// 负责错题数据收集、分析、聚合、回顾

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ErrorReview } from '../../entities/error-review.entity';
import { LearningProgressService } from './learning-progress.service';

/** 创建错题记录参数 */
export interface CreateErrorReviewDto {
  nodeId: string;
  questionId: string;
  questionContent?: string;
  userAnswer: string;
  correctAnswer: string;
  errorType?: 'concept' | 'logic' | 'syntax' | 'careless';
  explanation?: string;
  sourceType?: 'quiz' | 'exercise' | 'assessment';
  originalScore?: number;
}

/** 错题按知识点聚合结果 */
export interface ErrorByNode {
  nodeId: string;
  count: number;
  recentErrors: ErrorReview[];
  errorTypeBreakdown: Record<string, number>;
}

/** 错题统计概览 */
export interface ErrorReviewStats {
  totalErrors: number;
  reviewed: number;
  unreviewed: number;
  passedOnReview: number;
  failedOnReview: number;
  byErrorType: Record<string, number>;
  topWeakNodes: string[];
}

@Injectable()
export class ErrorReviewService {
  private readonly logger = new Logger(ErrorReviewService.name);

  constructor(
    @InjectRepository(ErrorReview)
    private readonly errorRepo: Repository<ErrorReview>,
    private readonly progressService: LearningProgressService,
  ) {}

  // ===== 错题数据收集 =====

  /** 记录一道错题 */
  async recordError(userId: string, dto: CreateErrorReviewDto): Promise<ErrorReview> {
    const error = this.errorRepo.create({
      userId,
      nodeId: dto.nodeId,
      questionId: dto.questionId,
      questionContent: dto.questionContent || undefined,
      userAnswer: dto.userAnswer,
      correctAnswer: dto.correctAnswer,
      errorType: dto.errorType || 'concept',
      explanation: dto.explanation || undefined,
      sourceType: dto.sourceType || 'quiz',
      originalScore: dto.originalScore || 0,
      reviewed: false,
      reviewCount: 0,
      reviewPassed: null as unknown as boolean | null,
    });

    const saved = await this.errorRepo.save(error) as ErrorReview;

    // 同步更新学习进度的 errorPatterns
    try {
      const progress = await this.progressService.getProgress(userId, dto.nodeId);
      if (progress) {
        const patterns = [...(progress.errorPatterns || [])];
        const errorTag = `${dto.errorType || 'concept'}:${dto.questionId}`;
        if (!patterns.includes(errorTag)) {
          patterns.push(errorTag);
        }
        await this.progressService.updateProgress(userId, dto.nodeId, {
          errorPatterns: patterns.slice(-20), // 保留最近 20 条
        });
      }
    } catch (e) {
      this.logger.warn(`更新 errorPatterns 失败: ${(e as Error).message}`);
    }

    return saved;
  }

  /** 批量记录错题 */
  async batchRecordErrors(userId: string, dtos: CreateErrorReviewDto[]): Promise<ErrorReview[]> {
    const results: ErrorReview[] = [];
    for (const dto of dtos) {
      const saved = await this.recordError(userId, dto);
      results.push(saved);
    }
    return results as ErrorReview[];
  }

  // ===== 错题查询 =====

  /** 获取用户的错题列表 */
  async getErrorList(
    userId: string,
    options?: {
      nodeId?: string;
      errorType?: string;
      reviewed?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: ErrorReview[]; total: number }> {
    const qb = this.errorRepo.createQueryBuilder('e')
      .where('e.userId = :userId', { userId });

    if (options?.nodeId) {
      qb.andWhere('e.nodeId = :nodeId', { nodeId: options.nodeId });
    }
    if (options?.errorType) {
      qb.andWhere('e.errorType = :errorType', { errorType: options.errorType });
    }
    if (options?.reviewed !== undefined) {
      qb.andWhere('e.reviewed = :reviewed', { reviewed: options.reviewed });
    }

    const total = await qb.getCount();

    qb.orderBy('e.createdAt', 'DESC');

    if (options?.limit) {
      qb.limit(options.limit);
    }
    if (options?.offset) {
      qb.offset(options.offset);
    }

    const items = await qb.getMany();
    return { items, total };
  }

  /** 获取未回顾的错题列表（按错误率排序） */
  async getUnreviewedErrors(userId: string, limit?: number): Promise<ErrorReview[]> {
    const qb = this.errorRepo.createQueryBuilder('e')
      .where('e.userId = :userId', { userId })
      .andWhere('e.reviewed = :reviewed', { reviewed: false })
      .orderBy('e.createdAt', 'ASC');

    if (limit) {
      qb.limit(limit);
    }

    return qb.getMany();
  }

  // ===== 错题分析 =====

  /** 按知识点聚合错误率 */
  async getErrorsByNode(userId: string): Promise<ErrorByNode[]> {
    const errors = await this.errorRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 按知识点分组
    const nodeMap = new Map<string, ErrorReview[]>();
    for (const e of errors) {
      const list = nodeMap.get(e.nodeId) || [];
      list.push(e);
      nodeMap.set(e.nodeId, list);
    }

    // 构建聚合结果（按错误数量降序）
    const results: ErrorByNode[] = [];
    for (const [nodeId, nodeErrors] of nodeMap.entries()) {
      const errorTypeBreakdown: Record<string, number> = {};
      for (const e of nodeErrors) {
        errorTypeBreakdown[e.errorType] = (errorTypeBreakdown[e.errorType] || 0) + 1;
      }

      results.push({
        nodeId,
        count: nodeErrors.length,
        recentErrors: nodeErrors.slice(0, 5),
        errorTypeBreakdown,
      });
    }

    results.sort((a, b) => b.count - a.count);
    return results;
  }

  /** 获取错题统计概览 */
  async getErrorStats(userId: string): Promise<ErrorReviewStats> {
    const allErrors = await this.errorRepo.find({ where: { userId } });

    const reviewed = allErrors.filter(e => e.reviewed);
    const unreviewed = allErrors.filter(e => !e.reviewed);
    const passedOnReview = reviewed.filter(e => e.reviewPassed === true);
    const failedOnReview = reviewed.filter(e => e.reviewPassed === false);

    // 按错误类型统计
    const byErrorType: Record<string, number> = {};
    for (const e of allErrors) {
      byErrorType[e.errorType] = (byErrorType[e.errorType] || 0) + 1;
    }

    // 高频薄弱知识点（错误数 ≥ 2 的知识点）
    const nodeCounts = new Map<string, number>();
    for (const e of allErrors) {
      nodeCounts.set(e.nodeId, (nodeCounts.get(e.nodeId) || 0) + 1);
    }
    const topWeakNodes = Array.from(nodeCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nodeId]) => nodeId);

    return {
      totalErrors: allErrors.length,
      reviewed: reviewed.length,
      unreviewed: unreviewed.length,
      passedOnReview: passedOnReview.length,
      failedOnReview: failedOnReview.length,
      byErrorType,
      topWeakNodes,
    };
  }

  // ===== 错题回顾 =====

  /** 标记错题已回顾 */
  async markReviewed(
    errorId: string,
    userId: string,
    passed: boolean,
  ): Promise<ErrorReview> {
    const error = await this.errorRepo.findOne({
      where: { id: errorId, userId },
    });

    if (!error) {
      throw new Error(`错题记录不存在: ${errorId}`);
    }

    error.reviewed = true;
    error.reviewCount += 1;
    error.reviewPassed = passed;

    return this.errorRepo.save(error);
  }

  /** 重新练习错题 — 重置为未回顾状态 */
  async resetForRePractice(errorId: string, userId: string): Promise<ErrorReview> {
    const error = await this.errorRepo.findOne({
      where: { id: errorId, userId },
    });

    if (!error) {
      throw new Error(`错题记录不存在: ${errorId}`);
    }

    error.reviewed = false;
    error.reviewPassed = null;

    return this.errorRepo.save(error);
  }

  /** 批量重置知识点下所有错题为未回顾 */
  async resetNodeErrors(userId: string, nodeId: string): Promise<number> {
    const result = await this.errorRepo.update(
      { userId, nodeId, reviewed: true },
      { reviewed: false, reviewPassed: null as any },
    );
    return result.affected || 0;
  }

  /** 推荐需要重新学习的知识点（基于错题分析） */
  async recommendWeakNodes(userId: string, limit?: number): Promise<string[]> {
    const stats = await this.getErrorStats(userId);
    return stats.topWeakNodes.slice(0, limit || 5);
  }
}
