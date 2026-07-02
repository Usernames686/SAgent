// 进化引擎 — 完整的自我进化管线（持久化版本）

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbTestService, AbExperiment, EvolutionDimension, EVOLUTION_DIMENSIONS } from './ab-test.service';
import { EvolutionEventEntity } from '../../../entities/evolution-event.entity';
import { StrategyVariantEntity } from '../../../entities/strategy-variant.entity';

// ===== 进化事件 =====
export interface EvolutionEvent {
  id: string;
  type: 'experiment_started' | 'stage_progressed' | 'promoted' | 'rolled_back' | 'manual_review' | 'param_update';
  experimentId: string;
  description: string;
  details: Record<string, unknown>;
  timestamp: number;
  requiresManualReview: boolean;
  reviewed?: boolean;
  reviewedBy?: string;
}

// ===== 进化策略变体 =====
export interface StrategyVariant {
  id: string;
  dimension: EvolutionDimension;
  name: string;
  description: string;
  /** 变体参数（与基线的差异） */
  params: Record<string, unknown>;
  /** 基线版本 ID */
  baselineId: string;
  createdAt: number;
}

// ===== BKT 参数变体 =====
const BKT_VARIANTS: Record<string, Partial<{ priorMastery: number; transitProb: number; guessProb: number; slipProb: number; forgetProb: number }>> = {
  'bkt-conservative': { priorMastery: 0.1, transitProb: 0.15, guessProb: 0.1, slipProb: 0.15, forgetProb: 0.08 },
  'bkt-aggressive': { priorMastery: 0.2, transitProb: 0.3, guessProb: 0.2, slipProb: 0.05, forgetProb: 0.03 },
  'bkt-balanced': { priorMastery: 0.15, transitProb: 0.2, guessProb: 0.15, slipProb: 0.1, forgetProb: 0.05 },
};

@Injectable()
export class EvolutionEngineService {
  private readonly logger = new Logger(EvolutionEngineService.name);

  constructor(
    private readonly abTestService: AbTestService,
    @InjectRepository(EvolutionEventEntity)
    private readonly eventRepo: Repository<EvolutionEventEntity>,
    @InjectRepository(StrategyVariantEntity)
    private readonly variantRepo: Repository<StrategyVariantEntity>,
  ) {}

  /**
   * 初始化默认策略变体（幂等 — 仅在表为空时创建）
   */
  async ensureDefaultVariants(): Promise<void> {
    const count = await this.variantRepo.count();
    if (count > 0) return;

    for (const [id, params] of Object.entries(BKT_VARIANTS)) {
      const entity = this.variantRepo.create({
        dimension: 'path_algorithm',
        name: `BKT ${id.split('-')[1]} 策略`,
        description: `${id.split('-')[1]}型贝叶斯知识追踪参数`,
        params: params as Record<string, unknown>,
        baselineId: 'bkt-balanced',
        createdAt: Date.now(),
      });
      await this.variantRepo.save(entity);
    }
  }

  /**
   * 触发进化：创建并启动 A/B 实验
   */
  async triggerEvolution(params: {
    name: string;
    description: string;
    dimension: EvolutionDimension;
    variantId: string;
  }): Promise<AbExperiment> {
    // 查找变体
    const variantEntity = await this.variantRepo.findOne({ where: { id: params.variantId } });
    if (!variantEntity) throw new Error(`变体 ${params.variantId} 不存在`);
    const variant = this.entityToVariant(variantEntity);

    // 创建实验
    const experiment = await this.abTestService.createExperiment({
      name: params.name,
      description: params.description,
      dimension: params.dimension,
      controlId: variant.baselineId,
      variantId: variant.id,
    });

    // 记录进化事件
    await this.recordEvent({
      type: 'experiment_started',
      experimentId: experiment.id,
      description: `在维度 "${EVOLUTION_DIMENSIONS[params.dimension].name}" 启动进化实验`,
      details: { dimension: params.dimension, variantId: params.variantId },
      requiresManualReview: false,
    });

    // 启动实验（1% 灰度）
    return this.abTestService.startExperiment(experiment.id);
  }

  /**
   * 检查实验状态并推进
   */
  async checkExperiment(experimentId: string): Promise<{
    experiment: AbExperiment;
    action: 'continue' | 'promote' | 'rollback' | 'review';
    analysis: string;
  }> {
    const result = await this.abTestService.checkAndProgress(experimentId);
    const experiment = (await this.abTestService.getExperiment(experimentId))!;

    if (result.shouldRollback) {
      await this.recordEvent({
        type: 'rolled_back',
        experimentId,
        description: `实验回滚：${result.analysis}`,
        details: { effectSize: experiment.effectSize },
        requiresManualReview: experiment.grayStageIndex >= 2,
      });
      return { experiment, action: 'rollback', analysis: result.analysis };
    }

    if (result.shouldProgress && experiment.status === 'promoted') {
      const needsReview = experiment.grayStageIndex >= 3;
      await this.recordEvent({
        type: 'promoted',
        experimentId,
        description: '实验完成全量发布',
        details: { finalEffectSize: experiment.effectSize },
        requiresManualReview: needsReview,
      });

      if (needsReview) {
        return { experiment, action: 'review', analysis: '全量发布已完成，需要人工审核确认' };
      }
      return { experiment, action: 'promote', analysis: result.analysis };
    }

    if (result.shouldProgress) {
      await this.recordEvent({
        type: 'stage_progressed',
        experimentId,
        description: result.analysis,
        details: { stage: experiment.grayStageIndex, traffic: experiment.trafficPercent },
        requiresManualReview: false,
      });
    }

    return { experiment, action: 'continue', analysis: result.analysis };
  }

  /**
   * 人工审核确认
   */
  async approveExperiment(experimentId: string, reviewer: string): Promise<AbExperiment> {
    // 标记该实验下所有待审核事件为已审核
    await this.eventRepo.update(
      { experimentId, requiresManualReview: true, reviewed: false },
      { reviewed: true, reviewedBy: reviewer },
    );
    return (await this.abTestService.getExperiment(experimentId))!;
  }

  /**
   * 一键回滚到稳定版本
   */
  async rollbackToStable(experimentId: string): Promise<AbExperiment> {
    this.logger.warn(`一键回滚实验 ${experimentId}`);
    return this.abTestService.rollback(experimentId);
  }

  /**
   * 记录进化事件（持久化）
   */
  private async recordEvent(params: {
    type: EvolutionEvent['type'];
    experimentId: string;
    description: string;
    details: Record<string, unknown>;
    requiresManualReview: boolean;
  }): Promise<void> {
    const id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const entity = this.eventRepo.create({
      id,
      type: params.type,
      experimentId: params.experimentId,
      description: params.description,
      details: params.details,
      timestamp: Date.now(),
      requiresManualReview: params.requiresManualReview,
      reviewed: false,
      reviewedBy: null,
    });
    await this.eventRepo.save(entity);
    this.logger.log(`进化事件: [${params.type}] ${params.description}`);
  }

  /**
   * 获取进化日志
   */
  async getEvolutionLog(experimentId?: string): Promise<EvolutionEvent[]> {
    const entities = experimentId
      ? await this.eventRepo.find({ where: { experimentId }, order: { timestamp: 'DESC' } })
      : await this.eventRepo.find({ order: { timestamp: 'DESC' } });

    // 限制最近 1000 条
    return entities.slice(0, 1000).map(this.entityToEvent);
  }

  /**
   * 获取进化状态报告
   */
  async getEvolutionReport(): Promise<{
    activeExperiments: number;
    totalExperiments: number;
    promotedCount: number;
    rolledBackCount: number;
    pendingReview: number;
    overview: string;
  }> {
    const all = await this.abTestService.getExperiments();
    const pendingReview = await this.eventRepo.count({
      where: { requiresManualReview: true, reviewed: false },
    });

    return {
      activeExperiments: all.filter(e => e.status === 'running').length,
      totalExperiments: all.length,
      promotedCount: all.filter(e => e.status === 'promoted').length,
      rolledBackCount: all.filter(e => e.status === 'rolled_back').length,
      pendingReview,
      overview: [
        `📊 进化引擎状态报告`,
        `总实验数: ${all.length}`,
        `运行中: ${all.filter(e => e.status === 'running').length}`,
        `已发布: ${all.filter(e => e.status === 'promoted').length}`,
        `已回滚: ${all.filter(e => e.status === 'rolled_back').length}`,
        `待审核: ${pendingReview}`,
      ].join('\n'),
    };
  }

  /**
   * 获取所有可用策略变体
   */
  async getVariants(): Promise<StrategyVariant[]> {
    const entities = await this.variantRepo.find();
    return entities.map(this.entityToVariant);
  }

  /**
   * 获取 A/B 测试服务（供外部使用）
   */
  getAbTestService(): AbTestService {
    return this.abTestService;
  }

  // ===== 转换辅助 =====

  private entityToEvent(entity: EvolutionEventEntity): EvolutionEvent {
    return {
      id: entity.id,
      type: entity.type as EvolutionEvent['type'],
      experimentId: entity.experimentId,
      description: entity.description,
      details: entity.details,
      timestamp: entity.timestamp,
      requiresManualReview: entity.requiresManualReview,
      reviewed: entity.reviewed,
      reviewedBy: entity.reviewedBy || undefined,
    };
  }

  private entityToVariant(entity: StrategyVariantEntity): StrategyVariant {
    return {
      id: entity.id,
      dimension: entity.dimension as EvolutionDimension,
      name: entity.name,
      description: entity.description,
      params: entity.params,
      baselineId: entity.baselineId,
      createdAt: entity.createdAt,
    };
  }
}
