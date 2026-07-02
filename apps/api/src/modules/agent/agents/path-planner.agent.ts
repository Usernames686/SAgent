import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgePoint } from '../../../entities/knowledge-point.entity';
import { LearningPath } from '../../../entities/learning-path.entity';

// 学生能力状态
export interface StudentKnowledgeState {
  [knowledgePointId: string]: {
    /** 掌握概率 P(known) — BKT 核心 */
    masteryProb: number;
    /** 学习次数 */
    attemptCount: number;
    /** 连续正确次数 */
    consecutiveCorrect: number;
    /** 连续错误次数 */
    consecutiveWrong: number;
    /** 上次学习时间 */
    lastLearnedAt?: Date;
    /** 平均耗时（秒） */
    avgTimeSpent: number;
  };
}

// 路径调整建议
export interface PathAdjustment {
  type: 'slow_down' | 'speed_up' | 'go_back' | 'add_review' | 'mentor_intervene';
  reason: string;
  targetKnowledgePoints?: string[];
  priority: 'high' | 'medium' | 'low';
}

// 推荐结果
export interface Recommendation {
  knowledgePointId: string;
  name: string;
  score: number;
  reason: string;
}

@Injectable()
export class PathPlannerAgent {
  private readonly logger = new Logger(PathPlannerAgent.name);

  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(LearningPath)
    private readonly pathRepo: Repository<LearningPath>,
  ) {}

  /**
   * BKT 贝叶斯知识追踪：更新知识掌握概率
   * P(Lₙ|evidence) = P(Lₙ₋₁) × P(correct|known) / [P(Lₙ₋₁) × P(correct|known) + (1-P(Lₙ₋₁)) × P(guess)]
   */
  updateKnowledgeState(
    currentState: StudentKnowledgeState,
    kpId: string,
    isCorrect: boolean,
    timeSpent: number,
  ): StudentKnowledgeState {
    const state = { ...currentState };
    const kp = state[kpId] || {
      masteryProb: 0.1,  // 初始掌握概率 10%
      attemptCount: 0,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      lastLearnedAt: undefined,
      avgTimeSpent: 0,
    };

    // BKT 参数
    const P_TRANSIT = 0.15;    // 学习迁移概率
    const P_GUESS = 0.2;       // 猜对的概率
    const P_SLIP = 0.1;        // 失误的概率

    // 先验概率
    const prior = kp.masteryProb;

    // 似然计算
    let posterior: number;
    if (isCorrect) {
      // 回答正确：可能在已知状态下正确，也可能在未知状态下猜对
      posterior = (prior * (1 - P_SLIP)) / (prior * (1 - P_SLIP) + (1 - prior) * P_GUESS);
    } else {
      // 回答错误：可能在已知状态下失误，也可能在未知状态下错误
      posterior = (prior * P_SLIP) / (prior * P_SLIP + (1 - prior) * (1 - P_GUESS));
    }

    // 学习迁移：回答后可能从未知状态迁移到已知状态
    const finalProb = posterior + (1 - posterior) * P_TRANSIT;

    state[kpId] = {
      masteryProb: Math.round(finalProb * 1000) / 1000,
      attemptCount: kp.attemptCount + 1,
      consecutiveCorrect: isCorrect ? kp.consecutiveCorrect + 1 : 0,
      consecutiveWrong: isCorrect ? 0 : kp.consecutiveWrong + 1,
      lastLearnedAt: new Date(),
      avgTimeSpent: kp.attemptCount > 0
        ? (kp.avgTimeSpent * kp.attemptCount + timeSpent) / (kp.attemptCount + 1)
        : timeSpent,
    };

    return state;
  }

  /**
   * 检测路径调整触发条件
   */
  detectAdjustments(
    knowledgeState: StudentKnowledgeState,
    learningPath: LearningPath,
  ): PathAdjustment[] {
    const adjustments: PathAdjustment[] = [];

    for (const [kpId, state] of Object.entries(knowledgeState)) {
      // 条件1: 连续 3 题失败 → 回退到前置知识点巩固
      if (state.consecutiveWrong >= 3) {
        adjustments.push({
          type: 'go_back',
          reason: `知识点 ${kpId} 连续 ${state.consecutiveWrong} 次失败，建议回退到前置知识点巩固`,
          targetKnowledgePoints: this.getPrerequisites(kpId),
          priority: 'high',
        });
      }

      // 条件2: 单题耗时 > 3 倍平均 → 降低难度
      if (state.avgTimeSpent > 0 && state.lastLearnedAt) {
        const threshold = state.avgTimeSpent * 3;
        if (threshold > 600) { // 超过 10 分钟
          adjustments.push({
            type: 'slow_down',
            reason: `知识点 ${kpId} 耗时过长，建议降低难度或提供更多提示`,
            priority: 'medium',
          });
        }
      }

      // 条件3: 连续 5 题通过 → 加速推进
      if (state.consecutiveCorrect >= 5 && state.masteryProb > 0.8) {
        adjustments.push({
          type: 'speed_up',
          reason: `知识点 ${kpId} 连续 ${state.consecutiveCorrect} 次通过，掌握度 ${Math.round(state.masteryProb * 100)}%，建议加速推进`,
          priority: 'medium',
        });
      }

      // 条件4: 知识掌握率 < 60%
      if (state.attemptCount >= 3 && state.masteryProb < 0.6) {
        adjustments.push({
          type: 'add_review',
          reason: `知识点 ${kpId} 掌握率仅 ${Math.round(state.masteryProb * 100)}%，需要补充练习`,
          targetKnowledgePoints: [kpId],
          priority: 'high',
        });
      }
    }

    // 条件5: 学习停滞 > 3 天
    const now = Date.now();
    for (const [kpId, state] of Object.entries(knowledgeState)) {
      if (state.lastLearnedAt) {
        const daysSinceLastLearn = (now - state.lastLearnedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastLearn > 3) {
          adjustments.push({
            type: 'mentor_intervene',
            reason: `知识点 ${kpId} 已 ${Math.floor(daysSinceLastLearn)} 天未学习，建议 Mentor Agent 介入`,
            priority: 'low',
          });
        }
      }
    }

    return adjustments;
  }

  /**
   * 学习路径推荐算法
   * 推荐知识点 = argmax(P(掌握|推荐) × 学习收益 - P(挫败|推荐) × 挫折惩罚 + 路径连贯性奖励)
   */
  async recommendNext(
    userId: string,
    pathId: string,
    knowledgeState: StudentKnowledgeState,
    limit: number = 5,
  ): Promise<Recommendation[]> {
    const path = await this.pathRepo.findOne({ where: { id: pathId, userId } });
    if (!path) return [];

    // 获取当前阶段的所有知识点
    const allKpIds = path.stages.flatMap(s => s.knowledgePointIds);
    const knowledgePoints = await this.kpRepo.findByIds(allKpIds);

    const candidates: Recommendation[] = [];

    for (const kp of knowledgePoints) {
      const state = knowledgeState[kp.nodeId];

      // 已掌握的知识点跳过
      if (state?.masteryProb && state.masteryProb >= 0.9) continue;

      // 前置知识未掌握跳过
      const prereqsNotMet = kp.prerequisites.filter(preId => {
        const preState = knowledgeState[preId];
        return !preState || preState.masteryProb < 0.6;
      });
      if (prereqsNotMet.length > 0) continue;

      // 计算推荐分数
      const mastery = state?.masteryProb || 0;

      // 学习收益：未掌握的知识点收益更高
      const learningGain = (1 - mastery) * 0.8;

      // 挫折惩罚：太难的知识点有挫折风险
      const frustrationPenalty = (state?.consecutiveWrong || 0) > 2 ? 0.3 : 0;

      // 路径连贯性：优先推荐当前阶段的知识点
      const currentStage = path.stages[path.currentStageIndex];
      const isInCurrentStage = currentStage?.knowledgePointIds.includes(kp.nodeId);
      const continuityReward = isInCurrentStage ? 0.2 : 0;

      // 推荐分数 = 学习收益 - 挫折惩罚 + 连贯性奖励
      const score = learningGain - frustrationPenalty + continuityReward;

      if (score > 0) {
        const reason = isInCurrentStage
          ? `${kp.name} — 当前阶段知识点，建议优先学习`
          : `${kp.name} — 下一个推荐知识点，掌握度 ${Math.round(mastery * 100)}%`;

        candidates.push({
          knowledgePointId: kp.nodeId,
          name: kp.name,
          score: Math.round(score * 100) / 100,
          reason,
        });
      }
    }

    // 按分数降序排列
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 获取前置知识点
   */
  private getPrerequisites(kpId: string): string[] | undefined {
    // 实际实现从数据库查询
    return undefined;
  }
}
