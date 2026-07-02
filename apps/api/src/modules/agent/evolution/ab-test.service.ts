// A/B 测试引擎 — 灰度发布 + 统计分析（持久化版本）

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbExperimentEntity } from '../../../entities/ab-experiment.entity';

// ===== 实验状态 =====
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'promoted' | 'rolled_back' | 'failed';

// ===== 灰度阶段 =====
export const GRAY_STAGES = [0.01, 0.05, 0.20, 0.50, 1.00] as const;  // 1% → 5% → 20% → 50% → 100%

// ===== A/B 实验 =====
export interface AbExperiment {
  id: string;
  name: string;
  description: string;
  dimension: EvolutionDimension;
  /** 对照组策略 ID */
  controlId: string;
  /** 实验组策略 ID */
  variantId: string;
  status: ExperimentStatus;
  /** 当前灰度比例 0-1 */
  trafficPercent: number;
  /** 当前灰度阶段索引 */
  grayStageIndex: number;
  /** 实验开始时间 */
  startedAt?: number;
  /** 各阶段的统计数据 */
  stageResults: GrayStageResult[];
  /** 统计显著性 */
  significance?: number;  // p-value
  /** 效应量 Cohen's d */
  effectSize?: number;
  createdAt: number;
  updatedAt: number;
}

// ===== 灰度阶段结果 =====
export interface GrayStageResult {
  stageIndex: number;
  trafficPercent: number;
  controlMetrics: ExperimentMetrics;
  variantMetrics: ExperimentMetrics;
  startedAt: number;
  completedAt?: number;
  /** 该阶段是否通过 */
  passed: boolean;
  durationMs: number;
}

// ===== 实验指标 =====
export interface ExperimentMetrics {
  sampleSize: number;
  mean: number;
  stdDev: number;
  confidenceInterval: [number, number];  // 95% CI
  metrics: Record<string, number>;       // 具体指标
}

// ===== 进化维度 =====
export type EvolutionDimension =
  | 'prompt_strategy'
  | 'routing_strategy'
  | 'evaluation_standard'
  | 'path_algorithm'
  | 'content_recommendation'
  | 'interaction_style';

// ===== 进化维度配置 =====
export const EVOLUTION_DIMENSIONS: Record<EvolutionDimension, {
  name: string;
  description: string;
  evaluationMetric: string;
  minSampleSize: number;
  minEffectSize: number;
}> = {
  prompt_strategy: {
    name: 'Prompt 策略',
    description: '提升辅导质量',
    evaluationMetric: 'user_satisfaction',
    minSampleSize: 100,
    minEffectSize: 0.2,
  },
  routing_strategy: {
    name: '路由策略',
    description: '提升意图识别准确率',
    evaluationMetric: 'intent_accuracy',
    minSampleSize: 200,
    minEffectSize: 0.15,
  },
  evaluation_standard: {
    name: '评估标准',
    description: '提升评估准确度',
    evaluationMetric: 'evaluation_accuracy',
    minSampleSize: 150,
    minEffectSize: 0.1,
  },
  path_algorithm: {
    name: '路径算法',
    description: '提升学习路径完成率',
    evaluationMetric: 'path_completion_rate',
    minSampleSize: 100,
    minEffectSize: 0.2,
  },
  content_recommendation: {
    name: '内容推荐',
    description: '提升推荐精准度',
    evaluationMetric: 'recommendation_click_rate',
    minSampleSize: 300,
    minEffectSize: 0.1,
  },
  interaction_style: {
    name: '交互风格',
    description: '提升用户体验',
    evaluationMetric: 'user_satisfaction',
    minSampleSize: 200,
    minEffectSize: 0.15,
  },
};

@Injectable()
export class AbTestService {
  private readonly logger = new Logger(AbTestService.name);
  private readonly MIN_DURATION_MS = 24 * 60 * 60 * 1000;  // 最少运行 24 小时

  constructor(
    @InjectRepository(AbExperimentEntity)
    private readonly experimentRepo: Repository<AbExperimentEntity>,
  ) {}

  /**
   * 创建新实验
   */
  async createExperiment(params: {
    name: string;
    description: string;
    dimension: EvolutionDimension;
    controlId: string;
    variantId: string;
  }): Promise<AbExperiment> {
    const now = Date.now();
    const id = `exp-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const entity = this.experimentRepo.create({
      id,
      name: params.name,
      description: params.description,
      dimension: params.dimension,
      controlId: params.controlId,
      variantId: params.variantId,
      status: 'draft',
      trafficPercent: 0,
      grayStageIndex: 0,
      stageResults: [],
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.experimentRepo.save(entity);
    return this.entityToExperiment(saved);
  }

  /**
   * 启动实验（1% 灰度）
   */
  async startExperiment(experimentId: string): Promise<AbExperiment> {
    const entity = await this.experimentRepo.findOne({ where: { id: experimentId } });
    if (!entity) throw new Error(`实验 ${experimentId} 不存在`);

    const exp = this.entityToExperiment(entity);
    exp.status = 'running';
    exp.trafficPercent = GRAY_STAGES[0];  // 1%
    exp.grayStageIndex = 0;
    exp.startedAt = Date.now();
    exp.updatedAt = Date.now();

    this.startNewStage(exp);

    await this.saveExperiment(exp);
    return exp;
  }

  /**
   * 记录实验数据点
   */
  async recordDataPoint(
    experimentId: string,
    isVariant: boolean,
    metrics: Record<string, number>,
  ): Promise<void> {
    const entity = await this.experimentRepo.findOne({ where: { id: experimentId } });
    if (!entity || entity.status !== 'running') return;

    const exp = this.entityToExperiment(entity);
    const currentStage = exp.stageResults[exp.grayStageIndex];
    if (!currentStage) return;

    const targetMetrics = isVariant ? currentStage.variantMetrics : currentStage.controlMetrics;
    targetMetrics.sampleSize++;

    // 更新均值（增量式）
    for (const [key, value] of Object.entries(metrics)) {
      const oldMean = targetMetrics.metrics[key] || 0;
      targetMetrics.metrics[key] = oldMean + (value - oldMean) / targetMetrics.sampleSize;
    }

    // 更新主指标均值
    const mainMetric = EVOLUTION_DIMENSIONS[exp.dimension as EvolutionDimension].evaluationMetric;
    const mainValue = metrics[mainMetric] || 0;
    const oldMean = targetMetrics.mean;
    targetMetrics.mean = oldMean + (mainValue - oldMean) / targetMetrics.sampleSize;

    // 更新标准差（Welford 在线算法）
    if (targetMetrics.sampleSize > 1) {
      const delta = mainValue - oldMean;
      targetMetrics.stdDev = Math.sqrt(
        (Math.pow(targetMetrics.stdDev, 2) * (targetMetrics.sampleSize - 2) +
          Math.pow(delta, 2)) / (targetMetrics.sampleSize - 1)
      );
    }

    exp.updatedAt = Date.now();
    await this.saveExperiment(exp);
  }

  /**
   * 检查并推进实验阶段
   */
  async checkAndProgress(experimentId: string): Promise<{
    shouldProgress: boolean;
    shouldRollback: boolean;
    analysis: string;
  }> {
    const entity = await this.experimentRepo.findOne({ where: { id: experimentId } });
    if (!entity) return { shouldProgress: false, shouldRollback: false, analysis: '实验不存在' };

    const exp = this.entityToExperiment(entity);
    const currentStage = exp.stageResults[exp.grayStageIndex];
    if (!currentStage) return { shouldProgress: false, shouldRollback: false, analysis: '无运行阶段' };

    const elapsed = Date.now() - currentStage.startedAt;
    const dimConfig = EVOLUTION_DIMENSIONS[exp.dimension as EvolutionDimension];

    // 检查最小样本量和持续时间
    if (currentStage.controlMetrics.sampleSize < dimConfig.minSampleSize ||
        currentStage.variantMetrics.sampleSize < dimConfig.minSampleSize ||
        elapsed < this.MIN_DURATION_MS) {
      return {
        shouldProgress: false,
        shouldRollback: false,
        analysis: `采集数据中（对照组: ${currentStage.controlMetrics.sampleSize}, 实验组: ${currentStage.variantMetrics.sampleSize}）`,
      };
    }

    // 统计分析
    const analysis = this.statisticalAnalysis(currentStage);
    currentStage.completedAt = Date.now();
    currentStage.durationMs = elapsed;

    // 检查效果
    const effectSize = this.calculateEffectSize(currentStage);
    exp.effectSize = effectSize;

    if (effectSize >= dimConfig.minEffectSize && analysis.isSignificant) {
      // 效果显著 → 推送到下一阶段
      exp.grayStageIndex++;
      exp.significance = analysis.pValue;

      if (exp.grayStageIndex >= GRAY_STAGES.length) {
        // 全量发布
        exp.status = 'promoted';
        exp.trafficPercent = 1.0;
        currentStage.passed = true;
        await this.saveExperiment(exp);
        return {
          shouldProgress: true,
          shouldRollback: false,
          analysis: `✅ 全量发布！效应量 d=${effectSize.toFixed(3)}, p=${analysis.pValue.toFixed(4)}`,
        };
      }

      // 进入下一灰度阶段
      exp.trafficPercent = GRAY_STAGES[exp.grayStageIndex];
      currentStage.passed = true;
      this.startNewStage(exp);
      await this.saveExperiment(exp);

      return {
        shouldProgress: true,
        shouldRollback: false,
        analysis: `📈 阶段 ${exp.grayStageIndex}/${GRAY_STAGES.length}：灰度 ${(exp.trafficPercent * 100).toFixed(0)}%`,
      };
    }

    // 效果不显著或负面
    if (effectSize < 0) {
      // 负面效果 → 回滚
      exp.status = 'rolled_back';
      exp.trafficPercent = 0;
      currentStage.passed = false;
      await this.saveExperiment(exp);
      return {
        shouldProgress: false,
        shouldRollback: true,
        analysis: `🔴 负面效果（d=${effectSize.toFixed(3)}），已回滚`,
      };
    }

    // 效果不够显著 → 继续收集数据
    return {
      shouldProgress: false,
      shouldRollback: false,
      analysis: `⏳ 效果不够显著（d=${effectSize.toFixed(3)}, p=${analysis.pValue.toFixed(4)}），继续收集数据`,
    };
  }

  /**
   * 手动回滚实验
   */
  async rollback(experimentId: string): Promise<AbExperiment> {
    const entity = await this.experimentRepo.findOne({ where: { id: experimentId } });
    if (!entity) throw new Error(`实验 ${experimentId} 不存在`);

    const exp = this.entityToExperiment(entity);
    exp.status = 'rolled_back';
    exp.trafficPercent = 0;
    exp.updatedAt = Date.now();
    await this.saveExperiment(exp);
    return exp;
  }

  /**
   * 获取实验列表
   */
  async getExperiments(): Promise<AbExperiment[]> {
    const entities = await this.experimentRepo.find({ order: { createdAt: 'DESC' } });
    return entities.map(e => this.entityToExperiment(e));
  }

  /**
   * 获取单个实验
   */
  async getExperiment(id: string): Promise<AbExperiment | undefined> {
    const entity = await this.experimentRepo.findOne({ where: { id } });
    return entity ? this.entityToExperiment(entity) : undefined;
  }

  // ===== 私有方法 =====

  private startNewStage(exp: AbExperiment): void {
    const stage: GrayStageResult = {
      stageIndex: exp.grayStageIndex,
      trafficPercent: exp.trafficPercent,
      controlMetrics: this.emptyMetrics(),
      variantMetrics: this.emptyMetrics(),
      startedAt: Date.now(),
      passed: false,
      durationMs: 0,
    };
    exp.stageResults.push(stage);
  }

  private emptyMetrics(): ExperimentMetrics {
    return {
      sampleSize: 0,
      mean: 0,
      stdDev: 0,
      confidenceInterval: [0, 0],
      metrics: {},
    };
  }

  private statisticalAnalysis(stage: GrayStageResult): {
    tStatistic: number;
    pValue: number;
    isSignificant: boolean;
  } {
    const { controlMetrics: c, variantMetrics: v } = stage;
    if (c.sampleSize < 2 || v.sampleSize < 2) {
      return { tStatistic: 0, pValue: 1, isSignificant: false };
    }

    const se = Math.sqrt(
      Math.pow(c.stdDev, 2) / c.sampleSize +
      Math.pow(v.stdDev, 2) / v.sampleSize
    );

    if (se === 0) return { tStatistic: 0, pValue: 1, isSignificant: false };

    const t = (v.mean - c.mean) / se;

    const df = Math.floor(
      Math.pow(
        Math.pow(c.stdDev, 2) / c.sampleSize + Math.pow(v.stdDev, 2) / v.sampleSize,
        2
      ) / (
        Math.pow(Math.pow(c.stdDev, 2) / c.sampleSize, 2) / (c.sampleSize - 1) +
        Math.pow(Math.pow(v.stdDev, 2) / v.sampleSize, 2) / (v.sampleSize - 1)
      )
    );

    const pValue = this.approxPValue(t, df);
    const isSignificant = pValue < 0.05;

    const criticalValue = 1.96;
    const margin = criticalValue * se;
    c.confidenceInterval = [c.mean - margin, c.mean + margin];
    v.confidenceInterval = [v.mean - margin, v.mean + margin];

    return { tStatistic: t, pValue, isSignificant };
  }

  private calculateEffectSize(stage: GrayStageResult): number {
    const { controlMetrics: c, variantMetrics: v } = stage;
    if (c.stdDev === 0 && v.stdDev === 0) return 0;

    const pooledStdDev = Math.sqrt(
      (Math.pow(c.stdDev, 2) + Math.pow(v.stdDev, 2)) / 2
    );

    return pooledStdDev > 0 ? (v.mean - c.mean) / pooledStdDev : 0;
  }

  private approxPValue(t: number, _df: number): number {
    const z = Math.abs(t);
    const b0 = 0.2316419;
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;

    const x = 1 / (1 + b0 * z);
    const phi = 1 / Math.sqrt(2 * Math.PI) * Math.exp(-z * z / 2);
    const p = phi * (b1 * x + b2 * Math.pow(x, 2) + b3 * Math.pow(x, 3) + b4 * Math.pow(x, 4) + b5 * Math.pow(x, 5));

    return Math.min(1, 2 * (1 - p));
  }

  private async saveExperiment(exp: AbExperiment): Promise<void> {
    await this.experimentRepo.save(this.experimentToEntity(exp));
  }

  private entityToExperiment(entity: AbExperimentEntity): AbExperiment {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      dimension: entity.dimension as EvolutionDimension,
      controlId: entity.controlId,
      variantId: entity.variantId,
      status: entity.status as ExperimentStatus,
      trafficPercent: entity.trafficPercent,
      grayStageIndex: entity.grayStageIndex,
      startedAt: entity.startedAt || undefined,
      stageResults: entity.stageResults as GrayStageResult[] || [],
      significance: entity.significance ?? undefined,
      effectSize: entity.effectSize ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private experimentToEntity(exp: AbExperiment): Partial<AbExperimentEntity> {
    return {
      id: exp.id,
      name: exp.name,
      description: exp.description,
      dimension: exp.dimension,
      controlId: exp.controlId,
      variantId: exp.variantId,
      status: exp.status,
      trafficPercent: exp.trafficPercent,
      grayStageIndex: exp.grayStageIndex,
      startedAt: exp.startedAt ?? null,
      stageResults: exp.stageResults,
      significance: exp.significance ?? null,
      effectSize: exp.effectSize ?? null,
      createdAt: exp.createdAt,
      updatedAt: exp.updatedAt,
    };
  }
}
