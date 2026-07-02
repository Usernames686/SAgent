// spaced-repetition.service.ts
// Step 37：间隔重复算法实现 — 基于 SM-2 (SuperMemo 2) 算法
// 核心功能：
//   1. calculateNextReview — 纯算法：根据回忆质量计算下次复习参数
//   2. processReviewResult  — 持久化：更新 LearningProgress 的 SM-2 字段
//   3. getDueReviews        — 查询：获取今日到期复习项
//   4. getReviewStats       — 统计：复习队列概览

import { Injectable, Logger } from '@nestjs/common';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { LearningProgressService } from './learning-progress.service';

/** SM-2 算法计算结果 */
export interface SM2Result {
  /** 下次复习间隔（天） */
  nextInterval: number;
  /** 更新后的难度因子（≥1.3） */
  nextEaseFactor: number;
  /** 下次复习日期 */
  nextReviewAt: Date;
  /** 是否需要从1天重新开始（quality < 3 时） */
  reset: boolean;
}

/** 复习队列统计 */
export interface ReviewQueueStats {
  /** 今日到期待复习 */
  dueToday: number;
  /** 明日到期 */
  dueTomorrow: number;
  /** 本周到期 */
  dueThisWeek: number;
  /** 已掌握（无需复习） */
  mastered: number;
  /** 即将到期列表（前 10 个） */
  upcoming: Array<{
    nodeId: string;
    nextReviewAt: string;
    interval: number;
    easeFactor: number;
  }>;
}

/** 回忆质量映射：将分数/掌握度转为 SM-2 quality (0-5) */
export function scoreToQuality(score: number): number {
  if (score >= 95) return 5; // 完美回忆
  if (score >= 85) return 4; // 轻松回忆
  if (score >= 70) return 3; // 勉强回忆（通过）
  if (score >= 50) return 2; // 回忆困难
  if (score >= 30) return 1; // 几乎忘记
  return 0;                   // 完全忘记
}

@Injectable()
export class SpacedRepetitionService {
  private readonly logger = new Logger(SpacedRepetitionService.name);

  constructor(
    private readonly progressService: LearningProgressService,
  ) {}

  // ===================================================================
  // 核心 SM-2 算法（纯函数，无副作用）
  // ===================================================================

  /**
   * SM-2 算法 — 计算下次复习参数
   *
   * @param quality   回忆质量 0-5（0=完全忘记，5=完美回忆）
   * @param easeFactor 当前难度因子（默认 2.5）
   * @param interval  当前间隔天数（默认 1）
   * @returns SM2Result
   *
   * 算法规则：
   * - quality < 3：间隔重置为1天，难度因子不变或降低
   * - quality >= 3 & interval=1：下次间隔6天
   * - quality >= 3 & interval>1：下次间隔 = 当前间隔 × 难度因子
   * - 难度因子每次调整：EF' = EF + (0.1 - (5-q)×(0.08+(5-q)×0.02))
   * - 难度因子下限 1.3
   */
  calculateNextReview(
    quality: number,
    easeFactor: number = 2.5,
    interval: number = 1,
  ): SM2Result {
    // 限制 quality 范围
    const q = Math.max(0, Math.min(5, Math.round(quality)));

    // SM-2 难度因子调整公式
    let newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor); // 下限 1.3

    let newInterval: number;
    let reset = false;

    if (q < 3) {
      // 回忆失败：重置为1天
      newInterval = 1;
      reset = true;
    } else if (interval === 1) {
      // 第一次通过：间隔跳到6天
      newInterval = 6;
    } else {
      // 正常递增：间隔 × 难度因子
      newInterval = Math.round(interval * newEaseFactor);
    }

    // 计算下次复习日期
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
    // 重置到当天开始（00:00:00）
    nextReviewAt.setHours(0, 0, 0, 0);

    return {
      nextInterval: newInterval,
      nextEaseFactor: newEaseFactor,
      nextReviewAt,
      reset,
    };
  }

  /**
   * 批量模拟 SM-2 算法（用于验证/可视化）
   * 给定连续的 quality 序列，计算间隔增长曲线
   */
  simulateSM2(
    qualities: number[],
    initialEaseFactor: number = 2.5,
    initialInterval: number = 1,
  ): Array<{ quality: number; interval: number; easeFactor: number; nextReviewAt: Date }> {
    const result: Array<{ quality: number; interval: number; easeFactor: number; nextReviewAt: Date }> = [];
    let ef = initialEaseFactor;
    let iv = initialInterval;

    for (const q of qualities) {
      const sm2 = this.calculateNextReview(q, ef, iv);
      result.push({
        quality: q,
        interval: sm2.nextInterval,
        easeFactor: sm2.nextEaseFactor,
        nextReviewAt: sm2.nextReviewAt,
      });
      ef = sm2.nextEaseFactor;
      iv = sm2.nextInterval;
    }

    return result;
  }

  // ===================================================================
  // 持久化操作：将复习结果写入 LearningProgress
  // ===================================================================

  /**
   * 处理复习结果 — 更新 SM-2 参数并保存
   *
   * @param userId  用户 ID
   * @param nodeId  知识点 ID
   * @param quality 回忆质量 0-5
   * @returns 更新后的 LearningProgress
   */
  async processReviewResult(
    userId: string,
    nodeId: string,
    quality: number,
  ): Promise<LearningProgress> {
    // 获取当前进度
    let progress = await this.progressService.getProgress(userId, nodeId);
    if (!progress) {
      // 尚无进度记录，先初始化
      progress = await this.progressService.initProgress(userId, nodeId, 'passed');
    }

    // 计算 SM-2 结果
    const sm2 = this.calculateNextReview(
      quality,
      progress.easeFactor,
      progress.interval,
    );

    // 根据回忆质量调整状态
    let newStatus = progress.status;
    if (quality < 3) {
      // 回忆失败，降级为 learning
      newStatus = 'learning';
    } else if (quality >= 4 && progress.masteryScore >= 90) {
      newStatus = 'mastered';
    } else if (quality >= 3) {
      newStatus = 'passed';
    }

    // 更新进度
    const updated = await this.progressService.updateProgress(userId, nodeId, {
      status: newStatus,
      easeFactor: sm2.nextEaseFactor,
      interval: sm2.nextInterval,
      nextReviewAt: sm2.nextReviewAt,
      attemptsIncrement: 1,
    });

    this.logger.log(
      `SM-2 review: user=${userId} node=${nodeId} q=${quality} ` +
      `interval=${progress.interval}→${sm2.nextInterval} ` +
      `EF=${progress.easeFactor.toFixed(2)}→${sm2.nextEaseFactor.toFixed(2)} ` +
      `reset=${sm2.reset}`,
    );

    return updated;
  }

  /**
   * 基于分数自动处理复习结果
   * 将 0-100 分数转换为 SM-2 quality 再处理
   */
  async processReviewByScore(
    userId: string,
    nodeId: string,
    score: number, // 0-100
  ): Promise<LearningProgress> {
    const quality = scoreToQuality(score);
    return this.processReviewResult(userId, nodeId, quality);
  }

  // ===================================================================
  // 查询：复习队列
  // ===================================================================

  /**
   * 获取今日需要复习的知识点
   */
  async getDueReviews(userId: string): Promise<LearningProgress[]> {
    return this.progressService.getDueReviews(userId);
  }

  /**
   * 获取复习队列统计
   */
  async getReviewQueueStats(userId: string): Promise<ReviewQueueStats> {
    const allProgress = await this.progressService.getAllProgress(userId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let dueToday = 0;
    let dueTomorrow = 0;
    let dueThisWeek = 0;
    let mastered = 0;

    const upcoming: ReviewQueueStats['upcoming'] = [];

    for (const p of allProgress) {
      // 只统计已通过/已掌握且有复习日期的
      if (p.status !== 'passed' && p.status !== 'mastered') continue;
      if (!p.nextReviewAt) {
        mastered++;
        continue;
      }

      const reviewDate = new Date(p.nextReviewAt);
      reviewDate.setHours(0, 0, 0, 0);

      if (reviewDate <= now) {
        dueToday++;
        dueThisWeek++;
      } else if (reviewDate.getTime() === tomorrow.getTime()) {
        dueTomorrow++;
        dueThisWeek++;
      } else if (reviewDate <= weekEnd) {
        dueThisWeek++;
      }

      if (p.status === 'mastered' && (!p.nextReviewAt || new Date(p.nextReviewAt) > weekEnd)) {
        mastered++;
      }
    }

    // 获取即将到期的列表（按 nextReviewAt 排序，最多10个）
    const sortedUpcoming = allProgress
      .filter(p => (p.status === 'passed' || p.status === 'mastered') && p.nextReviewAt)
      .sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime())
      .slice(0, 10)
      .map(p => ({
        nodeId: p.nodeId,
        nextReviewAt: p.nextReviewAt!.toISOString(),
        interval: p.interval,
        easeFactor: p.easeFactor,
      }));

    return {
      dueToday,
      dueTomorrow,
      dueThisWeek,
      mastered,
      upcoming: sortedUpcoming,
    };
  }

  // ===================================================================
  // 初始化复习计划
  // ===================================================================

  /**
   * 为新通过的知识点设置首次复习时间
   * 默认：1天后首次复习
   */
  async scheduleFirstReview(
    userId: string,
    nodeId: string,
  ): Promise<LearningProgress> {
    const sm2 = this.calculateNextReview(3, 2.5, 1); // quality=3 (通过), 初始间隔1天
    return this.progressService.updateProgress(userId, nodeId, {
      status: 'passed',
      easeFactor: sm2.nextEaseFactor,
      interval: sm2.nextInterval,
      nextReviewAt: sm2.nextReviewAt,
    });
  }

  /**
   * 批量安排首次复习（用于学习路径初始化）
   */
  async batchScheduleFirstReview(
    userId: string,
    nodeIds: string[],
  ): Promise<void> {
    for (const nodeId of nodeIds) {
      await this.scheduleFirstReview(userId, nodeId);
    }
  }
}
