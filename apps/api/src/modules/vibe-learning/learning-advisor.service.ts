// learning-advisor.service.ts
// Step 40：学习建议推荐引擎 — 服务层
// 综合考虑：当前进度、错题模式、间隔重复、知识点依赖
// 生成个性化学习建议

import { Injectable, Logger } from '@nestjs/common';
import { LearningProgressService, ProgressStats } from './learning-progress.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { ErrorReviewService } from './error-review.service';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

/** 学习建议类型 */
export type AdviceType = 'review' | 'prerequisite' | 'error-review' | 'continue' | 'streak' | 'new-start';

/** 优先级 */
export type AdvicePriority = 'high' | 'medium' | 'low';

/** 单条学习建议 */
export interface LearningAdvice {
  /** 建议类型 */
  type: AdviceType;
  /** 优先级 */
  priority: AdvicePriority;
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 相关知识点 ID 列表 */
  items: string[];
  /** 建议动作（前端可据此路由到对应模式） */
  action: string;
  /** 图标 emoji */
  emoji: string;
}

/** 学习建议完整响应 */
export interface LearningAdviceResponse {
  /** 建议列表 */
  advice: LearningAdvice[];
  /** 生成时间 */
  generatedAt: string;
  /** 用户学习概览 */
  summary: LearningSummary;
}

/** 用户学习概览 */
export interface LearningSummary {
  /** 总体统计 */
  stats: ProgressStats;
  /** 今日待复习 */
  dueReviewCount: number;
  /** 未回顾错题 */
  unreviewedErrorCount: number;
  /** 当前阶段 */
  currentPhase: string;
  /** 学习连续天数（简化：有进度的不同天数） */
  streakDays: number;
  /** 下一个推荐学习的知识点 */
  nextRecommendedNode: string | null;
}

@Injectable()
export class LearningAdvisorService {
  private readonly logger = new Logger(LearningAdvisorService.name);

  constructor(
    private readonly progressService: LearningProgressService,
    private readonly spacedRepetition: SpacedRepetitionService,
    private readonly errorReview: ErrorReviewService,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
  ) {}

  // ===================================================================
  // 核心：生成个性化学习建议
  // ===================================================================

  /**
   * 生成个性化学习建议
   * 综合考虑：当前进度、错题模式、间隔重复、知识点依赖
   */
  async generateAdvice(userId: string): Promise<LearningAdviceResponse> {
    const advice: LearningAdvice[] = [];

    // 并行获取所有需要的数据
    const [allProgress, stats, dueReviews, errorStats] = await Promise.all([
      this.progressService.getAllProgress(userId),
      this.progressService.getStats(userId),
      this.spacedRepetition.getDueReviews(userId),
      this.errorReview.getErrorStats(userId),
    ]);

    const progressMap = new Map(allProgress.map(p => [p.nodeId, p]));
    const completedNodeIds = new Set(
      allProgress
        .filter(p => p.status === 'passed' || p.status === 'mastered')
        .map(p => p.nodeId),
    );

    // ── 1. 间隔重复提醒 ──
    if (dueReviews.length > 0) {
      advice.push({
        type: 'review',
        priority: 'high',
        title: `有 ${dueReviews.length} 个知识点需要复习`,
        description: '根据间隔重复算法，这些知识点已到复习时间，及时复习可以巩固记忆',
        items: dueReviews.slice(0, 10).map(r => r.nodeId),
        action: 'spaced-repetition',
        emoji: '🧠',
      });
    }

    // ── 2. 前置知识未完成 → 建议先学前置 ──
    const blockedPoints = await this.findBlockedKnowledge(userId, progressMap, completedNodeIds);
    if (blockedPoints.length > 0) {
      advice.push({
        type: 'prerequisite',
        priority: 'high',
        title: '先完成前置知识，解锁更多内容',
        description: '以下知识点的前置条件未满足，建议先学习前置知识',
        items: blockedPoints.slice(0, 5),
        action: 'learn-prerequisite',
        emoji: '🔓',
      });
    }

    // ── 3. 错题较多 → 建议回顾 ──
    const weakNodes = errorStats.topWeakNodes;
    if (weakNodes.length > 0) {
      advice.push({
        type: 'error-review',
        priority: 'medium',
        title: '这些知识点错误率较高，建议回顾',
        description: `共有 ${errorStats.unreviewed} 道错题待回顾，巩固薄弱环节可以提升整体掌握度`,
        items: weakNodes.slice(0, 5),
        action: 'error-review',
        emoji: '📝',
      });
    }

    // ── 4. 学习连续性 → 建议继续当前模块 ──
    const currentModule = await this.findCurrentModule(userId, allProgress, completedNodeIds);
    if (currentModule) {
      advice.push({
        type: 'continue',
        priority: 'medium',
        title: `继续学习 ${currentModule.moduleName}`,
        description: `你已经完成了 ${currentModule.completedCount} 个知识点，继续学习下一个吧`,
        items: [currentModule.nextNodeId],
        action: 'continue-learning',
        emoji: '📚',
      });
    }

    // ── 5. 学习连续性 → 连续学习鼓励 ──
    const streakDays = this.calculateStreakDays(allProgress);
    if (streakDays >= 3) {
      advice.push({
        type: 'streak',
        priority: 'low',
        title: `已连续学习 ${streakDays} 天，继续保持！`,
        description: '坚持学习是最有效的进步方式，每天一点积累终将质变',
        items: [],
        action: 'continue-learning',
        emoji: '🔥',
      });
    }

    // ── 6. 新手引导 → 建议从第一个知识点开始 ──
    if (allProgress.length === 0) {
      advice.push({
        type: 'new-start',
        priority: 'high',
        title: '开始你的学习之旅',
        description: '从 JavaScript 变量与数据类型开始，逐步掌握全栈开发技能',
        items: ['JS-001'],
        action: 'start-learning',
        emoji: '🚀',
      });
    }

    // 按优先级排序
    const sorted = advice.sort(
      (a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority),
    );

    // 生成概览
    const summary: LearningSummary = {
      stats,
      dueReviewCount: dueReviews.length,
      unreviewedErrorCount: errorStats.unreviewed,
      currentPhase: this.determineCurrentPhase(completedNodeIds),
      streakDays,
      nextRecommendedNode: currentModule?.nextNodeId || (allProgress.length === 0 ? 'JS-001' : null),
    };

    return {
      advice: sorted,
      generatedAt: new Date().toISOString(),
      summary,
    };
  }

  // ===================================================================
  // 辅助方法
  // ===================================================================

  /** 优先级权重 */
  private priorityWeight(priority: AdvicePriority): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  /**
   * 查找被前置知识阻塞的知识点
   * 返回需要先学习的知识点 ID 列表
   */
  private async findBlockedKnowledge(
    userId: string,
    progressMap: Map<string, LearningProgress>,
    completedNodeIds: Set<string>,
  ): Promise<string[]> {
    // 获取所有有前置依赖的知识点
    const knowledgePoints = await this.kpRepo.find();

    const blockedPrerequisites: string[] = [];

    for (const kp of knowledgePoints) {
      const prerequisites = (kp.prerequisites as string[]) || [];
      if (prerequisites.length === 0) continue;

      // 知识点本身未完成
      const progress = progressMap.get(kp.nodeId);
      if (progress && (progress.status === 'passed' || progress.status === 'mastered')) continue;

      // 检查前置是否都完成
      const unmetPrereqs = prerequisites.filter(p => !completedNodeIds.has(p));
      for (const prereq of unmetPrereqs) {
        if (!blockedPrerequisites.includes(prereq)) {
          blockedPrerequisites.push(prereq);
        }
      }
    }

    return blockedPrerequisites.slice(0, 10);
  }

  /**
   * 找到当前正在学习的模块，返回下一个应该学习的知识点
   */
  private async findCurrentModule(
    userId: string,
    allProgress: LearningProgress[],
    completedNodeIds: Set<string>,
  ): Promise<{ moduleName: string; completedCount: number; nextNodeId: string } | null> {
    // 模块定义（与前端 phase-config 对齐）
    const modules: { id: string; name: string; nodeIds: string[] }[] = [
      { id: 'javascript-basics', name: 'JavaScript 核心基础', nodeIds: ['JS-001','JS-002','JS-003','JS-004','JS-005','JS-006','JS-007','JS-008','JS-009','JS-010','JS-011','JS-012','JS-013','JS-014'] },
      { id: 'nodejs-basics', name: 'Node.js 服务端开发', nodeIds: ['NODE-001','NODE-002','NODE-003','NODE-004','NODE-005','NODE-006','NODE-007','NODE-008','NODE-009','NODE-010','NODE-011','NODE-012','NODE-013','NODE-014','NODE-015','NODE-016','NODE-017','NODE-018','NODE-019','NODE-020','NODE-021','NODE-022','NODE-023'] },
      { id: 'frontend-basics', name: '前端三件套', nodeIds: ['FE-001','FE-002','FE-003','FE-004','FE-005','FE-006','FE-007','FE-008'] },
      { id: 'react-basics', name: 'React 基础', nodeIds: ['REACT-001','REACT-002','REACT-003','REACT-004','REACT-005','REACT-006','REACT-007','REACT-008','REACT-009','REACT-010','REACT-011','REACT-012','REACT-013','REACT-014','REACT-015','REACT-016','REACT-017','REACT-018'] },
      { id: 'engineering', name: '工程化与部署', nodeIds: ['ENG-001','ENG-002','ENG-003'] },
      { id: 'ai-modern', name: 'AI + 现代开发', nodeIds: ['AI-001','AI-002','AI-003'] },
    ];

    // 找到第一个未完成的模块
    for (const mod of modules) {
      const completedInModule = mod.nodeIds.filter(id => completedNodeIds.has(id)).length;
      const nextNode = mod.nodeIds.find(id => !completedNodeIds.has(id));

      if (nextNode) {
        return {
          moduleName: mod.name,
          completedCount: completedInModule,
          nextNodeId: nextNode,
        };
      }
    }

    return null; // 全部完成
  }

  /**
   * 简化计算学习连续天数
   * 基于有 lastStudiedAt 记录的不同日期数
   */
  private calculateStreakDays(allProgress: LearningProgress[]): number {
    const studyDates = new Set<string>();
    const today = new Date();

    for (const p of allProgress) {
      if (p.lastStudiedAt) {
        const date = new Date(p.lastStudiedAt);
        const diffDays = Math.floor(
          (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
        );
        // 只计算最近 30 天内的
        if (diffDays >= 0 && diffDays < 30) {
          studyDates.add(diffDays.toString());
        }
      }
    }

    // 从今天开始连续检查
    let streak = 0;
    for (let d = 0; d < 30; d++) {
      if (studyDates.has(d.toString())) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 判断当前学习阶段
   */
  private determineCurrentPhase(completedNodeIds: Set<string>): string {
    const phases: { id: string; nodeIds: string[]; label: string }[] = [
      { id: 'foundation', nodeIds: ['JS-001','JS-002','JS-003','JS-004','JS-005','JS-006','JS-007','JS-008','JS-009','JS-010','JS-011','JS-012','JS-013','JS-014'], label: '基础夯实' },
      { id: 'advancement', nodeIds: ['NODE-001','NODE-002','NODE-003','NODE-004','NODE-005','NODE-006','NODE-007','NODE-008','NODE-009','NODE-010','NODE-011','NODE-012','NODE-013','NODE-014','NODE-015','NODE-016','NODE-017','NODE-018','NODE-019','NODE-020','NODE-021','NODE-022','NODE-023','FE-001','FE-002','FE-003','FE-004','FE-005','FE-006','FE-007','FE-008'], label: '进阶突破' },
      { id: 'framework', nodeIds: ['REACT-001','REACT-002','REACT-003','REACT-004','REACT-005','REACT-006','REACT-007','REACT-008','REACT-009','REACT-010','REACT-011','REACT-012','REACT-013','REACT-014','REACT-015','REACT-016','REACT-017','REACT-018'], label: '框架实战' },
      { id: 'engineering', nodeIds: ['ENG-001','ENG-002','ENG-003'], label: '工程规范' },
      { id: 'mastery', nodeIds: ['AI-001','AI-002','AI-003'], label: '精通掌握' },
    ];

    for (const phase of phases) {
      const completed = phase.nodeIds.filter(id => completedNodeIds.has(id)).length;
      if (completed < phase.nodeIds.length) {
        return phase.label;
      }
    }

    return '已毕业';
  }
}
