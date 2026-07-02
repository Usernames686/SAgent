import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPath } from '../../entities/learning-path.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { KnowledgeGraphAgent } from '../agent/agents/knowledge-graph.agent';
import { BktRlAlgorithm, KnowledgeMastery } from '../agent/evolution/bkt-rl-algorithm';
import { PathStateMachine, LearningPathStatus, StateTransitionContext } from './path-state-machine';

@Injectable()
export class LearningPathService {
  private bktRl = new BktRlAlgorithm();

  constructor(
    @InjectRepository(LearningPath)
    private readonly pathRepo: Repository<LearningPath>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly knowledgeGraphAgent: KnowledgeGraphAgent,
  ) {}

  async findByUser(userId: string): Promise<LearningPath[]> {
    return this.pathRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<LearningPath> {
    const path = await this.pathRepo.findOne({ where: { id } });
    if (!path) throw new NotFoundException('学习路径不存在');
    return path;
  }

  async generate(
    userId: string,
    goal: string,
    timeline: string,
    commitment: string,
  ): Promise<LearningPath> {
    // 使用知识图谱 Agent 获取推荐序列
    const domain = this.detectDomain(goal);
    const recommended = await this.knowledgeGraphAgent.getRecommendedSequence(domain, 20);

    // 构建阶段
    const stages = this.buildStagesFromKps(recommended);

    const knowledgeState: Record<string, number> = {};
    for (const kp of recommended) {
      if (kp.nodeId) knowledgeState[kp.nodeId] = 0;
    }

    const path = this.pathRepo.create({
      userId,
      name: `${goal} 学习路径`,
      goal,
      stages,
      currentStageIndex: 0,
      progress: 0,
      knowledgeState,
      status: 'active',
      generatedBy: 'ai',
    });

    return this.pathRepo.save(path);
  }

  async adjust(
    id: string,
    reason: string,
    preferences?: Record<string, unknown>,
  ): Promise<LearningPath> {
    const path = await this.findById(id);

    // 基于 BKT+RL 重新计算路径
    const masteryMap = this.buildMasteryMap(path.knowledgeState);
    const recommendations = this.generateRecommendations(masteryMap, path);

    // 更新路径
    path.stages = this.restructureStages(path, recommendations, reason);
    path.updatedAt = new Date();
    return this.pathRepo.save(path);
  }

  async getProgress(id: string) {
    const path = await this.findById(id);
    const totalKps = path.stages.reduce(
      (sum, stage) => sum + stage.knowledgePointIds.length,
      0,
    );
    const masteredKps = Object.values(path.knowledgeState).filter(
      (v) => v >= 0.8,
    ).length;
    const progress = totalKps > 0 ? masteredKps / totalKps : 0;

    return {
      pathId: path.id,
      status: path.status,
      totalKnowledgePoints: totalKps,
      masteredKnowledgePoints: masteredKps,
      progress: Math.round(progress * 10000) / 10000,
      currentStage: path.stages[path.currentStageIndex],
      knowledgeState: path.knowledgeState,
    };
  }

  /**
   * 更新知识点掌握状态（被练习提交时调用）
   */
  async updateKnowledge(
    pathId: string,
    kpId: string,
    isCorrect: boolean,
    timeSpent: number,
  ): Promise<LearningPath> {
    const path = await this.findById(pathId);

    // 构建当前掌握状态
    const currentMastery: KnowledgeMastery = {
      kpId,
      masteryProb: (path.knowledgeState[kpId] as number) || 0.15,
      attemptCount: 0,
      avgTimeSpent: timeSpent,
      lastLearnedAt: Date.now(),
      forgetCount: 0,
    };

    // BKT 更新
    const updated = this.bktRl.updateMastery(currentMastery, isCorrect, timeSpent);
    path.knowledgeState[kpId] = updated.masteryProb;

    // RL 记录
    this.bktRl.recordExperience({
      kpId,
      recommendedOrder: 0,
      outcomeScore: isCorrect ? 80 : 30,
      timeSpent,
      frustrationLevel: isCorrect ? 0.1 : 0.6,
      timestamp: Date.now(),
    });

    // 遗忘衰减
    for (const key of Object.keys(path.knowledgeState)) {
      const state = path.knowledgeState[key] as number;
      if (key !== kpId && state > 0.01) {
        const decayed = this.bktRl.applyForgetDecay({
          kpId: key,
          masteryProb: state,
          attemptCount: 0,
          avgTimeSpent: 0,
          lastLearnedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          forgetCount: 0,
        });
        path.knowledgeState[key] = decayed.masteryProb;
      }
    }

    // 自动检测状态转换
    const totalKps = path.stages.reduce((s, st) => s + st.knowledgePointIds.length, 0);
    const masteredKps = Object.values(path.knowledgeState).filter(v => (v as number) >= 0.8).length;
    const allKpsMastered = totalKps > 0 && masteredKps >= totalKps;

    const ctx: StateTransitionContext = {
      allKpsMastered,
      progress: totalKps > 0 ? masteredKps / totalKps : 0,
    };

    const transition = PathStateMachine.detectTransition(
      path.status as LearningPathStatus,
      ctx,
    );

    if (transition) {
      const result = PathStateMachine.transition(
        path.status as LearningPathStatus,
        transition.to,
        ctx,
      );
      path.status = result.newStatus;
    }

    // 更新进度
    path.progress = ctx.progress;
    path.updatedAt = new Date();

    return this.pathRepo.save(path);
  }

  /**
   * 手动切换路径状态
   */
  async changeStatus(
    id: string,
    newStatus: LearningPathStatus,
    reason?: string,
  ): Promise<LearningPath> {
    const path = await this.findById(id);
    const ctx: StateTransitionContext = {
      userRequestedPause: newStatus === 'paused',
      daysSinceLastActive: 0,
      progress: path.progress,
    };

    const result = PathStateMachine.transition(
      path.status as LearningPathStatus,
      newStatus,
      ctx,
    );

    path.status = result.newStatus;
    return this.pathRepo.save(path);
  }

  /**
   * 获取路径推荐
   */
  async getRecommendations(
    pathId: string,
    limit: number = 5,
  ) {
    const path = await this.findById(pathId);
    const masteryMap = this.buildMasteryMap(path.knowledgeState);
    const recommendations = this.generateRecommendations(masteryMap, path);
    return recommendations.slice(0, limit);
  }

  /**
   * 构建掌握状态映射
   */
  private buildMasteryMap(
    knowledgeState: Record<string, number>,
  ): Map<string, KnowledgeMastery> {
    const map = new Map<string, KnowledgeMastery>();
    for (const [kpId, prob] of Object.entries(knowledgeState)) {
      map.set(kpId, {
        kpId,
        masteryProb: prob as number,
        attemptCount: 0,
        avgTimeSpent: 0,
        forgetCount: 0,
      });
    }
    return map;
  }

  /**
   * 生成推荐列表
   */
  private generateRecommendations(
    masteryMap: Map<string, KnowledgeMastery>,
    path: LearningPath,
  ) {
    const currentStage = path.stages[path.currentStageIndex];
    const currentStageKps = new Set(currentStage?.knowledgePointIds || []);

    const recommendations = Array.from(masteryMap.entries()).map(([kpId, mastery]) => {
      const isInCurrentStage = currentStageKps.has(kpId);
      const prerequisitesMet = true; // 简化处理
      const kpName = kpId; // 实际从数据库查询

      return this.bktRl.computeRecommendationScore(
        mastery,
        kpName,
        isInCurrentStage,
        prerequisitesMet,
      );
    });

    return recommendations
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 从知识点构建阶段
   */
  private buildStagesFromKps(kps: Partial<KnowledgePoint>[]) {
    // 按 module 分组
    const moduleGroups = new Map<string, Partial<KnowledgePoint>[]>();
    for (const kp of kps) {
      const module = kp.module || 'general';
      if (!moduleGroups.has(module)) moduleGroups.set(module, []);
      moduleGroups.get(module)!.push(kp);
    }

    const stageNames: Record<string, string> = {
      cognition: '认知与思维',
      tools: '工具链',
      prompt: '提示词工程',
      code: '代码阅读理解',
      fullstack: '全栈工程能力',
      advanced: 'AI 高级能力',
      quality: '质量安全避坑',
      project: '实战项目',
    };

    return Array.from(moduleGroups.entries()).map(([module, kps]) => ({
      name: stageNames[module] || module,
      knowledgePointIds: kps.map(k => k.nodeId || '').filter(Boolean),
      estimatedHours: kps.length * 5,
    }));
  }

  /**
   * 重新构建阶段
   */
  private restructureStages(
    path: LearningPath,
    recommendations: any[],
    reason: string,
  ) {
    // 按推荐分数重新排序知识点
    const reorderedIds = recommendations.map(r => r.kpId);
    const currentIds = path.stages.flatMap(s => s.knowledgePointIds);

    // 保持阶段结构，但调整知识点顺序
    return path.stages.map(stage => ({
      ...stage,
      knowledgePointIds: stage.knowledgePointIds.sort(
        (a, b) => reorderedIds.indexOf(a) - reorderedIds.indexOf(b),
      ),
    }));
  }

  /**
   * 从目标检测领域
   */
  private detectDomain(goal: string): string {
    const lower = goal.toLowerCase();
    if (lower.includes('vibe') || lower.includes('氛围')) return 'vibe_coding';
    if (lower.includes('frontend') || lower.includes('前端') || lower.includes('react')) return 'frontend';
    if (lower.includes('python') || lower.includes('数据')) return 'python';
    if (lower.includes('ai') || lower.includes('人工智能')) return 'ai';
    return 'vibe_coding';
  }
}
