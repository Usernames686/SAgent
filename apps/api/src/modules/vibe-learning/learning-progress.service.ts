// learning-progress.service.ts
// Step 36：学习进度数据模型与存储 — 服务层
// 负责学习进度的 CRUD、状态转移、统计查询

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { LearningProgress } from '../../entities/learning-progress.entity';

/** 进度更新参数 */
export interface ProgressUpdateDto {
  status?: 'locked' | 'learning' | 'passed' | 'mastered';
  masteryScore?: number;
  quizScore?: number;
  exerciseScore?: number;
  attemptsIncrement?: number;
  hintIncrement?: number;
  errorPatterns?: string[];
  /** SM-2 参数 */
  easeFactor?: number;
  interval?: number;
  nextReviewAt?: Date;
}

/** 学习进度统计 */
export interface ProgressStats {
  total: number;
  locked: number;
  learning: number;
  passed: number;
  mastered: number;
  averageMastery: number;
  totalStudyTime: number; // 估算（基于 attempts × 15 分钟）
}

/** 模块进度统计 */
export interface ModuleProgress {
  module: string;
  total: number;
  completed: number;
  avgMastery: number;
}

/** 热力图单个知识点数据 */
export interface HeatmapNodeItem {
  nodeId: string;
  status: 'locked' | 'learning' | 'passed' | 'mastered';
  masteryScore: number;
}

/** 热力图模块数据 */
export interface HeatmapModuleData {
  moduleId: string;
  moduleName: string;
  nodes: HeatmapNodeItem[];
}

/** 热力图完整数据 */
export interface HeatmapData {
  modules: HeatmapModuleData[];
  overallStats: ProgressStats;
}

/** Step 41: 增强仪表盘 — 阶段进度 */
export interface PhaseProgressItem {
  phaseId: string;
  phaseName: string;
  priority: string; // P0, P1, P2, P3
  total: number;
  completed: number;
  mastered: number;
  learning: number;
  locked: number;
  progress: number; // 0-100
  avgMastery: number;
}

/** Step 41: 增强仪表盘数据 */
export interface EnhancedDashboardData {
  stats: ProgressStats;
  /** 预估剩余学习时间（分钟） */
  estimatedRemainingMinutes: number;
  /** 连续学习天数 */
  streakDays: number;
  /** 今日待复习数量 */
  dueReviewCount: number;
  /** 未回顾错题数量 */
  unreviewedErrorCount: number;
  /** 每阶段进度 */
  phaseProgress: PhaseProgressItem[];
}

@Injectable()
export class LearningProgressService {
  private readonly logger = new Logger(LearningProgressService.name);

  constructor(
    @InjectRepository(LearningProgress)
    private readonly progressRepo: Repository<LearningProgress>,
  ) {}

  // ===== 基础 CRUD =====

  /** 获取用户对某个知识点的进度 */
  async getProgress(userId: string, nodeId: string): Promise<LearningProgress | null> {
    return this.progressRepo.findOne({ where: { userId, nodeId } });
  }

  /** 获取用户所有学习进度 */
  async getAllProgress(userId: string): Promise<LearningProgress[]> {
    return this.progressRepo.find({ where: { userId } });
  }

  /** 获取用户在指定状态的知识点进度 */
  async getByStatus(userId: string, status: LearningProgress['status']): Promise<LearningProgress[]> {
    return this.progressRepo.find({ where: { userId, status } });
  }

  /** 获取用户已解锁（非 locked）的知识点列表 */
  async getUnlockedNodeIds(userId: string): Promise<string[]> {
    const records = await this.progressRepo.find({
      where: { userId },
      select: ['nodeId'],
    });
    return records.map(r => r.nodeId);
  }

  // ===== 创建 / 初始化 =====

  /** 初始化知识点的学习进度（首次访问时调用） */
  async initProgress(userId: string, nodeId: string, status: LearningProgress['status'] = 'learning'): Promise<LearningProgress> {
    const existing = await this.getProgress(userId, nodeId);
    if (existing) return existing;

    const progress = this.progressRepo.create({
      userId,
      nodeId,
      status,
      masteryScore: 0,
      quizScore: 0,
      exerciseScore: 0,
      attemptsCount: 0,
      hintUsageCount: 0,
      lastStudiedAt: new Date(),
      nextReviewAt: undefined,
      easeFactor: 2.5,
      interval: 1,
      errorPatterns: [],
    });
    return this.progressRepo.save(progress) as Promise<LearningProgress>;
  }

  // ===== 更新 =====

  /** 更新学习进度（部分更新） */
  async updateProgress(userId: string, nodeId: string, dto: ProgressUpdateDto): Promise<LearningProgress> {
    let progress = await this.getProgress(userId, nodeId);
    if (!progress) {
      progress = await this.initProgress(userId, nodeId, dto.status || 'learning');
    }

    // 应用更新
    if (dto.status !== undefined) progress.status = dto.status;
    if (dto.masteryScore !== undefined) progress.masteryScore = dto.masteryScore;
    if (dto.quizScore !== undefined) progress.quizScore = dto.quizScore;
    if (dto.exerciseScore !== undefined) progress.exerciseScore = dto.exerciseScore;
    if (dto.attemptsIncrement !== undefined) progress.attemptsCount += dto.attemptsIncrement;
    if (dto.hintIncrement !== undefined) progress.hintUsageCount += dto.hintIncrement;
    if (dto.errorPatterns !== undefined) progress.errorPatterns = dto.errorPatterns;
    if (dto.easeFactor !== undefined) progress.easeFactor = dto.easeFactor;
    if (dto.interval !== undefined) progress.interval = dto.interval;
    if (dto.nextReviewAt !== undefined) progress.nextReviewAt = dto.nextReviewAt;

    progress.lastStudiedAt = new Date();

    return this.progressRepo.save(progress);
  }

  /** 记录练习提交，更新进度和掌握度 */
  async recordExerciseSubmit(
    userId: string,
    nodeId: string,
    exerciseScore: number,
    hintsUsed: number,
  ): Promise<LearningProgress> {
    const progress = await this.getProgress(userId, nodeId)
      .then(p => p || this.initProgress(userId, nodeId));

    // 更新练习分数和尝试次数
    progress.exerciseScore = exerciseScore;
    progress.attemptsCount += 1;
    progress.hintUsageCount += hintsUsed;
    progress.lastStudiedAt = new Date();

    // 重新计算综合掌握度：Quiz 40% + Exercise 60%
    progress.masteryScore = Math.round(
      progress.quizScore * 0.4 + exerciseScore * 0.6,
    );

    // 状态转移
    if (progress.masteryScore >= 90) {
      progress.status = 'mastered';
    } else if (progress.masteryScore >= 60) {
      progress.status = 'passed';
    } else if (progress.status === 'locked') {
      progress.status = 'learning';
    }

    return this.progressRepo.save(progress);
  }

  /** 记录 Quiz 提交，更新进度 */
  async recordQuizSubmit(
    userId: string,
    nodeId: string,
    quizScore: number,
    wrongPatterns: string[] = [],
  ): Promise<LearningProgress> {
    const progress = await this.getProgress(userId, nodeId)
      .then(p => p || this.initProgress(userId, nodeId));

    progress.quizScore = quizScore;
    progress.attemptsCount += 1;
    progress.lastStudiedAt = new Date();

    // 合并错误模式（去重）
    const existingErrors = new Set(progress.errorPatterns);
    for (const err of wrongPatterns) {
      existingErrors.add(err);
    }
    progress.errorPatterns = Array.from(existingErrors);

    // 重新计算综合掌握度
    progress.masteryScore = Math.round(
      quizScore * 0.4 + progress.exerciseScore * 0.6,
    );

    // 状态转移
    if (progress.masteryScore >= 90) {
      progress.status = 'mastered';
    } else if (progress.masteryScore >= 60) {
      progress.status = 'passed';
    } else if (progress.status === 'locked') {
      progress.status = 'learning';
    }

    return this.progressRepo.save(progress);
  }

  // ===== 统计 =====

  /** 获取用户学习进度统计 */
  async getStats(userId: string): Promise<ProgressStats> {
    const allProgress = await this.getAllProgress(userId);

    const locked = allProgress.filter(p => p.status === 'locked').length;
    const learning = allProgress.filter(p => p.status === 'learning').length;
    const passed = allProgress.filter(p => p.status === 'passed').length;
    const mastered = allProgress.filter(p => p.status === 'mastered').length;

    const avgMastery = allProgress.length > 0
      ? Math.round(allProgress.reduce((sum, p) => sum + p.masteryScore, 0) / allProgress.length)
      : 0;

    return {
      total: allProgress.length,
      locked,
      learning,
      passed,
      mastered,
      averageMastery: avgMastery,
      totalStudyTime: allProgress.reduce((sum, p) => sum + p.attemptsCount, 0) * 15,
    };
  }

  /** 获取按模块分组的进度统计 */
  async getModuleProgress(userId: string, moduleNodeIds: Record<string, string[]>): Promise<ModuleProgress[]> {
    const allProgress = await this.getAllProgress(userId);
    const progressMap = new Map(allProgress.map(p => [p.nodeId, p]));

    const results: ModuleProgress[] = [];
    for (const [moduleName, nodeIds] of Object.entries(moduleNodeIds)) {
      const moduleProgressList = nodeIds
        .map(id => progressMap.get(id))
        .filter((p): p is LearningProgress => p !== undefined && p !== null);

      const completed = moduleProgressList.filter(p => p.status === 'passed' || p.status === 'mastered').length;
      const avgMastery = moduleProgressList.length > 0
        ? Math.round(moduleProgressList.reduce((sum, p) => sum + p.masteryScore, 0) / moduleProgressList.length)
        : 0;

      results.push({
        module: moduleName,
        total: nodeIds.length,
        completed,
        avgMastery,
      });
    }

    return results;
  }

  // ===== 间隔重复查询 =====

  /** 获取今日需要复习的知识点 */
  async getDueReviews(userId: string): Promise<LearningProgress[]> {
    return this.progressRepo.find({
      where: {
        userId,
        nextReviewAt: LessThanOrEqual(new Date()),
        status: In(['passed', 'mastered'] as LearningProgress['status'][]),
      },
      order: { nextReviewAt: 'ASC' },
    });
  }

  /** 批量初始化多个知识点的进度 */
  async batchInit(userId: string, nodeIds: string[], status: LearningProgress['status'] = 'locked'): Promise<void> {
    for (const nodeId of nodeIds) {
      await this.initProgress(userId, nodeId, status);
    }
  }

  // ===== 热力图数据 =====

  /**
   * 获取热力图数据 — 按模块返回所有知识点的掌握度
   * @param userId 用户 ID
   * @param moduleConfig 模块配置 { moduleId: { name, nodeIds } }
   */
  async getHeatmapData(
    userId: string,
    moduleConfig: Record<string, { name: string; nodeIds: string[] }>,
  ): Promise<HeatmapData> {
    const allProgress = await this.getAllProgress(userId);
    const progressMap = new Map(allProgress.map(p => [p.nodeId, p]));

    const modules: HeatmapModuleData[] = [];
    for (const [moduleId, config] of Object.entries(moduleConfig)) {
      const nodes: HeatmapNodeItem[] = config.nodeIds.map(nodeId => {
        const progress = progressMap.get(nodeId);
        return {
          nodeId,
          status: progress ? progress.status : 'locked',
          masteryScore: progress ? progress.masteryScore : 0,
        };
      });
      modules.push({
        moduleId,
        moduleName: config.name,
        nodes,
      });
    }

    const overallStats = await this.getStats(userId);

    return { modules, overallStats };
  }

  // ===== Step 41: 增强仪表盘 =====

  /**
   * 获取增强仪表盘数据
   * 包含：总体统计、预估剩余时间、连续学习天数、阶段进度、待复习/错题数
   */
  async getEnhancedDashboard(
    userId: string,
    phaseConfig: Array<{
      id: string;
      name: string;
      priority: string;
      modules: Array<{ nodeIds: string[] }>;
    }>,
    dueReviewCount: number,
    unreviewedErrorCount: number,
  ): Promise<EnhancedDashboardData> {
    const allProgress = await this.getAllProgress(userId);
    const progressMap = new Map(allProgress.map(p => [p.nodeId, p]));
    const stats = await this.getStats(userId);

    // 1. 阶段进度
    const phaseProgress: PhaseProgressItem[] = phaseConfig.map(phase => {
      const allNodeIds = phase.modules.flatMap(m => m.nodeIds);
      const total = allNodeIds.length;
      const phaseProgressItems = allNodeIds.map(id => progressMap.get(id));

      const completed = phaseProgressItems.filter(p => p && (p.status === 'passed' || p.status === 'mastered')).length;
      const mastered = phaseProgressItems.filter(p => p && p.status === 'mastered').length;
      const learning = phaseProgressItems.filter(p => p && p.status === 'learning').length;
      const locked = total - completed - learning;
      const avgMastery = phaseProgressItems.filter((p): p is LearningProgress => !!p).length > 0
        ? Math.round(phaseProgressItems.filter((p): p is LearningProgress => !!p).reduce((sum, p) => sum + p.masteryScore, 0) / phaseProgressItems.filter((p): p is LearningProgress => !!p).length)
        : 0;

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        priority: phase.priority,
        total,
        completed,
        mastered,
        learning,
        locked,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        avgMastery,
      };
    });

    // 2. 预估剩余时间（未完成的节点 × 平均每节点30分钟）
    const remainingNodes = stats.total - stats.passed - stats.mastered;
    const estimatedRemainingMinutes = Math.max(0, remainingNodes) * 30;

    // 3. 连续学习天数（简化：统计有 lastStudiedAt 的不同日期数）
    const studyDates = new Set<string>();
    for (const p of allProgress) {
      if (p.lastStudiedAt) {
        const dateStr = new Date(p.lastStudiedAt).toISOString().slice(0, 10);
        studyDates.add(dateStr);
      }
    }
    // 计算从最近一天往前的连续天数
    const sortedDates = Array.from(studyDates).sort().reverse();
    let streakDays = 0;
    if (sortedDates.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      // 如果今天或昨天有学习，开始计算连续天数
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        streakDays = 1;
        let expectedDate = new Date(sortedDates[0]);
        for (let i = 1; i < sortedDates.length; i++) {
          expectedDate = new Date(expectedDate.getTime() - 86400000);
          const expectedStr = expectedDate.toISOString().slice(0, 10);
          if (sortedDates[i] === expectedStr) {
            streakDays++;
          } else {
            break;
          }
        }
      }
    }

    return {
      stats,
      estimatedRemainingMinutes,
      streakDays,
      dueReviewCount,
      unreviewedErrorCount,
      phaseProgress,
    };
  }
}
