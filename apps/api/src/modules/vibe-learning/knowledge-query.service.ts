import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { LearningSessionService, LearningSessionData } from '../vibe-learning/learning-session.service';

/** 知识点推荐结果 */
export interface KnowledgeRecommendation {
  nodeId: string;
  name: string;
  module: string;
  moduleName: string;
  difficulty: number;
  reason: string;
  score: number;
  prerequisitesMet: boolean;
}

/** 领域知识点概览 */
export interface DomainOverview {
  domain: string;
  modules: {
    module: string;
    moduleName: string;
    knowledgePoints: {
      nodeId: string;
      name: string;
      difficulty: number;
      estimatedMinutes: number;
    }[];
  }[];
}

@Injectable()
export class KnowledgeQueryService {
  private readonly logger = new Logger(KnowledgeQueryService.name);

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
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly sessionService: LearningSessionService,
  ) {}

  /** 按领域获取知识点概览 */
  async getDomainOverview(domain?: string): Promise<DomainOverview[]> {
    const where: Record<string, unknown> = { status: 'published' };
    if (domain) where.domain = domain;

    const allKps = await this.kpRepo.find({ where, order: { difficulty: 'ASC' } });

    // 按 domain -> module 分组
    const domainMap = new Map<string, Map<string, KnowledgePoint[]>>();
    for (const kp of allKps) {
      if (!domainMap.has(kp.domain)) domainMap.set(kp.domain, new Map());
      const moduleMap = domainMap.get(kp.domain)!;
      if (!moduleMap.has(kp.module)) moduleMap.set(kp.module, []);
      moduleMap.get(kp.module)!.push(kp);
    }

    const result: DomainOverview[] = [];
    for (const [dom, moduleMap] of domainMap) {
      result.push({
        domain: dom,
        modules: Array.from(moduleMap.entries()).map(([mod, kps]) => ({
          module: mod,
          moduleName: this.MODULE_NAMES[mod] || mod,
          knowledgePoints: kps.map(kp => ({
            nodeId: kp.nodeId,
            name: kp.name,
            difficulty: kp.difficulty,
            estimatedMinutes: kp.estimatedMinutes,
          })),
        })),
      });
    }
    return result;
  }

  /** 获取知识点练习题（含 quiz 和 coding） */
  async getExercises(nodeId: string): Promise<{
    nodeId: string;
    name: string;
    quizCount: number;
    codingTemplate: string | null;
    skills: string[];
    assessmentCriteria: { basic: string; intermediate: string; advanced: string };
  }> {
    const kp = await this.kpRepo.findOne({ where: { nodeId } });
    if (!kp) {
      return {
        nodeId,
        name: '',
        quizCount: 0,
        codingTemplate: null,
        skills: [],
        assessmentCriteria: { basic: '', intermediate: '', advanced: '' },
      };
    }

    // 从 exercise-data 获取编码练习
    const { getExerciseData } = await import('../vibe-learning/exercise-data');
    const exerciseData = getExerciseData(kp);

    return {
      nodeId: kp.nodeId,
      name: kp.name,
      quizCount: 2, // 默认每个知识点2道quiz
      codingTemplate: exerciseData.template,
      skills: kp.skills,
      assessmentCriteria: kp.assessmentCriteria,
    };
  }

  /** 智能推荐下一个知识点 */
  async recommendNext(
    userId: string,
    limit: number = 5,
  ): Promise<KnowledgeRecommendation[]> {
    const session = await this.sessionService.getLatestSession(userId);
    const completedIds = session?.completedNodeIds || [];
    const knowledgeState = session?.knowledgeState || {};

    const allKps = await this.kpRepo.find({
      where: { status: 'published' },
      order: { difficulty: 'ASC' },
    });

    const candidates: KnowledgeRecommendation[] = [];

    for (const kp of allKps) {
      // 跳过已掌握的
      if (completedIds.includes(kp.nodeId) && (knowledgeState[kp.nodeId] || 0) >= 0.8) continue;

      // 检查前置条件
      const prerequisitesMet = kp.prerequisites.length === 0 ||
        kp.prerequisites.every(p => completedIds.includes(p) || (knowledgeState[p] || 0) >= 0.5);

      if (!prerequisitesMet) continue;

      // 计算推荐分数
      const mastery = knowledgeState[kp.nodeId] || 0;
      const difficultyBonus = kp.difficulty <= 2 ? 0.2 : kp.difficulty <= 3 ? 0.1 : 0;
      const moduleIndex = this.MODULE_ORDER.indexOf(kp.module);
      const currentModuleIndex = this.MODULE_ORDER.indexOf(session?.currentNodeId?.split('-')[0]?.toLowerCase() || 'javascript-basics');
      const proximityBonus = Math.abs(moduleIndex - currentModuleIndex) <= 1 ? 0.15 : 0;
      const unlearnedBonus = mastery === 0 ? 0.3 : 0.1;

      const score = difficultyBonus + proximityBonus + unlearnedBonus;

      candidates.push({
        nodeId: kp.nodeId,
        name: kp.name,
        module: kp.module,
        moduleName: this.MODULE_NAMES[kp.module] || kp.module,
        difficulty: kp.difficulty,
        reason: mastery > 0
          ? `复习巩固：当前掌握 ${(mastery * 100).toFixed(0)}%`
          : completedIds.length === 0
            ? '推荐从这里开始学习'
            : `前置知识已满足，推荐学习`,
        score,
        prerequisitesMet,
      });
    }

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** 获取用户学习进度详情 */
  async getUserKnowledgeState(userId: string): Promise<{
    completedIds: string[];
    knowledgeState: Record<string, number>;
    totalMastered: number;
    totalInProgress: number;
    totalNotStarted: number;
    moduleBreakdown: {
      module: string;
      moduleName: string;
      total: number;
      mastered: number;
      inProgress: number;
      notStarted: number;
    }[];
  }> {
    const session = await this.sessionService.getLatestSession(userId);
    const completedIds = session?.completedNodeIds || [];
    const knowledgeState = session?.knowledgeState || {};

    const allKps = await this.kpRepo.find({ where: { status: 'published' } });

    let totalMastered = 0;
    let totalInProgress = 0;
    let totalNotStarted = 0;

    const moduleMap = new Map<string, { total: number; mastered: number; inProgress: number; notStarted: number }>();
    for (const mod of this.MODULE_ORDER) {
      moduleMap.set(mod, { total: 0, mastered: 0, inProgress: 0, notStarted: 0 });
    }

    for (const kp of allKps) {
      const stat = moduleMap.get(kp.module) || { total: 0, mastered: 0, inProgress: 0, notStarted: 0 };
      stat.total++;
      const mastery = knowledgeState[kp.nodeId] || 0;
      if (completedIds.includes(kp.nodeId) || mastery >= 0.8) {
        stat.mastered++;
        totalMastered++;
      } else if (mastery > 0) {
        stat.inProgress++;
        totalInProgress++;
      } else {
        stat.notStarted++;
        totalNotStarted++;
      }
      moduleMap.set(kp.module, stat);
    }

    return {
      completedIds,
      knowledgeState,
      totalMastered,
      totalInProgress,
      totalNotStarted,
      moduleBreakdown: Array.from(moduleMap.entries()).map(([mod, stat]) => ({
        module: mod,
        moduleName: this.MODULE_NAMES[mod] || mod,
        ...stat,
      })).filter(m => m.total > 0),
    };
  }
}
