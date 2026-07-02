import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../../../entities/submission.entity';
import { KnowledgePoint } from '../../../entities/knowledge-point.entity';
import { EvolutionEngineService } from './evolution-engine.service';
import { BehaviorTrackingService } from '../../behavior/behavior-tracking.service';

export interface KnowledgePointMetrics {
  nodeId: string;
  name: string;
  totalAttempts: number;
  passRate: number;
  avgTimeMs: number;
  errorRate: number;
  needsAttention: boolean;
  reason: string;
}

export interface EvolutionInsight {
  dimension: string;
  findings: string[];
  action: string;
  autoTriggered: boolean;
}

@Injectable()
export class EvolutionDataCollector {
  private readonly logger = new Logger(EvolutionDataCollector.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly engine: EvolutionEngineService,
    private readonly behaviorTracking: BehaviorTrackingService,
  ) {}

  /** 收集所有知识点的学习指标 — 优先使用行为数据补充 */
  async collectMetrics(): Promise<KnowledgePointMetrics[]> {
    const points = await this.kpRepo.find();
    const metrics: KnowledgePointMetrics[] = [];

    // 先从行为数据中聚合各知识点的交互次数
    const behaviorByNode: Record<string, number> = {};
    try {
      const codingEvents = await this.behaviorTracking.getEventsByType('coding', undefined, 5000);
      for (const e of codingEvents) {
        const payload = JSON.parse(e.payload || '{}') as Record<string, unknown>;
        const nodeId = String(payload.nodeId || payload.exerciseId || '');
        if (nodeId) behaviorByNode[nodeId] = (behaviorByNode[nodeId] || 0) + 1;
      }
    } catch (err) {
      this.logger.warn(`行为数据聚合失败，回退到 Submission 统计: ${(err as Error).message}`);
    }

    for (const kp of points) {
      const submissions = await this.submissionRepo.find({ where: { exerciseId: kp.nodeId } as any });
      const total = submissions.length + (behaviorByNode[kp.nodeId] || 0);
      const passed = submissions.filter((s: any) => s.status === 'passed' || s.score >= 60).length;
      const passRate = total > 0 ? (passed / total) * 100 : 0;
      const avgTimeMs = submissions.length > 0
        ? submissions.reduce((sum: number, s: any) => sum + (s.timeSpentMs || 0), 0) / submissions.length
        : 0;
      const errors = submissions.filter((s: any) => s.status === 'failed' || s.score < 60).length;
      const errorRate = total > 0 ? (errors / total) * 100 : 0;

      let needsAttention = false;
      let reason = '';
      if (passRate < 50 && total >= 3) { needsAttention = true; reason = `通过率仅 ${passRate.toFixed(0)}%，需增加讲解/提示`; }
      else if (avgTimeMs > 300000 && total >= 3) { needsAttention = true; reason = `平均耗时 ${Math.round(avgTimeMs / 60000)} 分钟，难度偏高`; }
      else if (errorRate > 70 && total >= 3) { needsAttention = true; reason = `错误率 ${errorRate.toFixed(0)}%，需补充练习`; }

      metrics.push({ nodeId: kp.nodeId, name: kp.name, totalAttempts: total, passRate, avgTimeMs, errorRate, needsAttention, reason });
    }

    return metrics.sort((a, b) => a.passRate - b.passRate);
  }

  /** 基于数据自动触发进化（薄弱点 > 3 个时触发） */
  async autoEvolve(): Promise<EvolutionInsight> {
    const metrics = await this.collectMetrics();
    const weakPoints = metrics.filter(m => m.needsAttention);
    const findings: string[] = [];
    let action = '无需操作';
    let autoTriggered = false;

    if (weakPoints.length >= 3) {
      findings.push(`发现 ${weakPoints.length} 个薄弱知识点`);
      weakPoints.forEach(w => findings.push(`  - ${w.name}: ${w.reason}`));
      action = '建议启动教学策略 A/B 测试（代码优先 vs 概念优先）';
      autoTriggered = true;

      try {
        await this.engine.ensureDefaultVariants();
        const variants = await this.engine.getVariants();
        if (variants.length > 0) {
          await this.engine.triggerEvolution({
            name: `自动进化-${new Date().toISOString().slice(0, 10)}`,
            description: `基于 ${weakPoints.length} 个薄弱点自动触发策略优化`,
            dimension: 'prompt_strategy' as any,
            variantId: variants[0].id,
          });
          action = '已自动启动 A/B 实验，灰度 1%';
          this.logger.log(`自动触发进化实验，${weakPoints.length} 个薄弱点`);
        }
      } catch (e) {
        this.logger.warn(`自动进化触发失败: ${(e as Error).message}`);
        action = `触发失败: ${(e as Error).message}`;
        autoTriggered = false;
      }
    } else if (weakPoints.length > 0) {
      findings.push(`发现 ${weakPoints.length} 个待改进点（未达自动触发阈值）`);
      weakPoints.forEach(w => findings.push(`  - ${w.name}: ${w.reason}`));
      action = '数据积累中，暂不触发';
    } else {
      findings.push('所有知识点表现良好');
    }

    return { dimension: 'auto', findings, action, autoTriggered };
  }

  /** 生成每周进化报告 — 增补行为数据概览 */
  async weeklyReport(): Promise<{ metrics: KnowledgePointMetrics[]; insight: EvolutionInsight; summary: string; behaviorOverview?: unknown }> {
    const metrics = await this.collectMetrics();
    const insight = await this.autoEvolve();
    const report = await this.engine.getEvolutionReport();

    // 补充行为数据概览（采集体系已就绪）
    let behaviorOverview: unknown = null;
    try {
      behaviorOverview = await this.behaviorTracking.getMetrics(new Date(Date.now() - 7 * 86400000));
    } catch (e) {
      this.logger.warn(`行为指标聚合失败: ${(e as Error).message}`);
    }

    const weak = metrics.filter(m => m.needsAttention).length;
    const healthy = metrics.filter(m => !m.needsAttention).length;
    const summary = [
      `📊 周进化报告`,
      `知识点: ${metrics.length} 个 (健康 ${healthy} / 待改进 ${weak})`,
      `A/B 实验: ${report.totalExperiments} 个 (运行 ${report.activeExperiments} / 已发布 ${report.promotedCount} / 已回滚 ${report.rolledBackCount})`,
      insight.autoTriggered ? `🧬 已自动触发新实验` : `⏳ ${insight.action}`,
    ].join('\n');

    return { metrics, insight, summary, behaviorOverview };
  }
}
