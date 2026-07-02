/**
 * 自适应学习引擎 — BKT + IRT 双模型融合
 *
 * 设计理念：
 * 1. BKT（贝叶斯知识追踪）— 追踪每个知识点的掌握概率 P(L)
 * 2. IRT（项目反应理论）— 根据学生能力选择合适难度的题目和练习
 * 3. 自适应节奏 — 连续高分加速，连续低分减速并增加辅助
 * 4. 知识衰减 — 长时间不复习的知识点掌握度会衰减
 *
 * 三种学生画像适配：
 * - 零基础新手：从最基础开始，更多提示和示例
 * - 有基础转行：跳过已掌握的基础，聚焦新技术栈
 * - 有经验提升：挑战高级题目，项目实战为主
 */

import { Injectable, Logger } from '@nestjs/common';

// ===== BKT 模型参数 =====

export interface BKTParams {
  /** 先验掌握概率 P(L0) */
  priorMastery: number;
  /** 学习转移概率 P(T) — 从未掌握到掌握 */
  transitProb: number;
  /** 猜对概率 P(G) */
  guessProb: number;
  /** 失误概率 P(S) — 掌握但答错 */
  slipProb: number;
  /** 遗忘概率 P(F) */
  forgetProb: number;
}

/** 默认 BKT 参数 */
const DEFAULT_BKT: BKTParams = {
  priorMastery: 0.15,
  transitProb: 0.2,
  guessProb: 0.15,
  slipProb: 0.1,
  forgetProb: 0.05,
};

/** 保守参数（零基础新手）— 慢热、低猜测、高失误容忍 */
const CONSERVATIVE_BKT: BKTParams = {
  priorMastery: 0.08,
  transitProb: 0.12,
  guessProb: 0.1,
  slipProb: 0.15,
  forgetProb: 0.08,
};

/** 激进参数（有经验者）— 快速判定、低失误 */
const AGGRESSIVE_BKT: BKTParams = {
  priorMastery: 0.3,
  transitProb: 0.3,
  guessProb: 0.2,
  slipProb: 0.05,
  forgetProb: 0.03,
};

// ===== IRT 模型参数 =====

export interface IRTParams {
  /** 学生能力值 θ — 初始值基于画像 */
  theta: number;
  /** 区分度 a — 题目对能力的区分程度 */
  discrimination: number;
  /** 难度 b — 题目难度 */
  difficulty: number;
}

// ===== 学习者状态 =====

export interface LearnerState {
  /** 用户ID */
  userId: string;
  /** 学生画像类型 */
  profileType: StudentProfileType;
  /** 各知识点的 BKT 状态 { nodeId: masteryProb } */
  knowledgeMastery: Record<string, number>;
  /** IRT 能力值 θ（全局，会随学习动态调整） */
  abilityTheta: number;
  /** 学习节奏分数（0-1，0=需要减速，1=可以加速） */
  paceScore: number;
  /** 连续答对/答错计数 */
  streakCorrect: number;
  streakWrong: number;
  /** 总练习次数 */
  totalPractices: number;
  /** 总答对次数 */
  totalCorrect: number;
  /** 上次学习时间（用于衰减计算） */
  lastStudyTime: number;
  /** 学习历史 { nodeId: { attempts, correct, lastTime, difficulty } } */
  nodeHistory: Record<string, {
    attempts: number;
    correct: number;
    lastTime: number;
    avgDifficulty: number;
  }>;
}

export type StudentProfileType = 'beginner' | 'transition' | 'advanced';

// ===== 自适应决策结果 =====

export interface AdaptiveDecision {
  /** 推荐的知识点 ID */
  recommendedNodeId: string;
  /** 推荐的学习模式 */
  recommendedMode: 'reading' | 'quiz' | 'coding' | 'chat' | 'project' | 'review';
  /** 推荐的难度等级 (1-5) */
  recommendedDifficulty: number;
  /** 预计掌握概率 */
  masteryProbability: number;
  /** 是否需要复习 */
  needsReview: boolean;
  /** 自适应提示 */
  hints: string[];
  /** 学习节奏建议 */
  paceAdvice: 'accelerate' | 'maintain' | 'slow_down' | 'take_break';
  /** 决策理由 */
  reason: string;
  /** IRT 预测正确率 */
  predictedAccuracy: number;
}

// ===== 知识衰减配置 =====

const DECAY_CONFIG = {
  /** 半衰期（毫秒）— 7天 */
  halfLifeMs: 7 * 24 * 60 * 60 * 1000,
  /** 衰减后触发复习的阈值 */
  reviewThreshold: 0.5,
  /** 最大衰减量（不会衰减到0） */
  minMastery: 0.1,
};

@Injectable()
export class AdaptiveLearningEngine {
  private readonly logger = new Logger(AdaptiveLearningEngine.name);

  // ===== 核心 BKT 计算 =====

  /**
   * BKT 正向更新：学生答对后的掌握概率
   * P(L|correct) = P(L) * (1 - P(S)) / [P(L) * (1 - P(S)) + (1 - P(L)) * P(G)]
   */
  bktUpdateOnCorrect(currentMastery: number, params: BKTParams): number {
    const pL = currentMastery;
    const pS = params.slipProb;
    const pG = params.guessProb;

    const pCorrectGivenL = pL * (1 - pS);
    const pCorrectGivenNotL = (1 - pL) * pG;
    const pCorrect = pCorrectGivenL + pCorrectGivenNotL;

    if (pCorrect === 0) return pL;

    const pLAfterCorrect = pCorrectGivenL / pCorrect;

    // 加入学习转移概率
    return pLAfterCorrect + (1 - pLAfterCorrect) * params.transitProb;
  }

  /**
   * BKT 更新：学生答错后的掌握概率
   * P(L|incorrect) = P(L) * P(S) / [P(L) * P(S) + (1 - P(L)) * (1 - P(G))]
   */
  bktUpdateOnIncorrect(currentMastery: number, params: BKTParams): number {
    const pL = currentMastery;
    const pS = params.slipProb;
    const pG = params.guessProb;

    const pIncorrectGivenL = pL * pS;
    const pIncorrectGivenNotL = (1 - pL) * (1 - pG);
    const pIncorrect = pIncorrectGivenL + pIncorrectGivenNotL;

    if (pIncorrect === 0) return pL;

    const pLAfterIncorrect = pIncorrectGivenL / pIncorrect;

    // 加入学习转移概率（即使答错也有学习效果）
    return pLAfterIncorrect + (1 - pLAfterIncorrect) * params.transitProb * 0.3;
  }

  /**
   * 知识衰减：长时间不复习的掌握度衰减
   * 使用指数衰减模型：P(L_t) = P(L_0) * e^(-λt)
   */
  applyDecay(mastery: number, elapsedMs: number): number {
    if (elapsedMs <= 0) return mastery;
    const lambda = Math.log(2) / DECAY_CONFIG.halfLifeMs;
    const decayed = mastery * Math.exp(-lambda * elapsedMs);
    return Math.max(decayed, DECAY_CONFIG.minMastery);
  }

  // ===== IRT 难度匹配 =====

  /**
   * IRT 三参数逻辑斯蒂模型 — 预测正确率
   * P(θ) = c + (1 - c) / (1 + e^(-a*(θ - b)))
   * 
   * 简化为二参数：
   * P(θ) = 1 / (1 + e^(-a*(θ - b)))
   */
  irtPredictAccuracy(theta: number, difficulty: number, discrimination: number = 1.2): number {
    const exponent = -discrimination * (theta - difficulty);
    return 1 / (1 + Math.exp(exponent));
  }

  /**
   * IRT 能力值更新 — 基于答题结果
   * 答对：θ += k * P(θ) * (1 - P(θ))
   * 答错：θ -= k * P(θ) * (1 - P(θ))
   */
  irtUpdateTheta(
    currentTheta: number,
    difficulty: number,
    isCorrect: boolean,
    learningRate: number = 0.3,
  ): number {
    const predicted = this.irtPredictAccuracy(currentTheta, difficulty);
    const info = predicted * (1 - predicted); // Fisher 信息量

    if (isCorrect) {
      return currentTheta + learningRate * (1 - predicted) * info;
    } else {
      return currentTheta - learningRate * predicted * info;
    }
  }

  /**
   * 选择最佳难度 — 使预测正确率接近目标（0.7 = 70%）
   * 在 IRT 中，最佳测试难度接近学生能力 θ
   */
  selectOptimalDifficulty(theta: number, targetAccuracy: number = 0.7): number {
    // P = 0.7 → θ - b ≈ 0.85 (for a=1.2)
    // b ≈ θ - 0.85/a
    const a = 1.2;
    const logit = Math.log(targetAccuracy / (1 - targetAccuracy));
    return theta - logit / a;
  }

  // ===== 综合自适应决策 =====

  /**
   * 基于学习者状态做出自适应决策
   * 这是整个引擎的核心入口
   */
  makeAdaptiveDecision(
    learnerState: LearnerState,
    candidateNodes: {
      nodeId: string;
      difficulty: number;
      prerequisites: string[];
      dependents: string[];
      mastery: number;
    }[],
  ): AdaptiveDecision {
    const { profileType, abilityTheta, paceScore, streakCorrect, streakWrong, knowledgeMastery, lastStudyTime } = learnerState;
    const bktParams = this.getBKTParams(profileType);

    // 1. 检查是否有需要复习的知识点（衰减低于阈值）
    const needsReview = this.findNodesNeedingReview(knowledgeMastery, lastStudyTime);

    if (needsReview.length > 0) {
      const reviewNode = needsReview[0];
      return {
        recommendedNodeId: reviewNode.nodeId,
        recommendedMode: 'review',
        recommendedDifficulty: reviewNode.originalDifficulty,
        masteryProbability: reviewNode.decayedMastery,
        needsReview: true,
        hints: [`这个知识点有一段时间没复习了（掌握度已降至 ${(reviewNode.decayedMastery * 100).toFixed(0)}%），建议先复习一下`],
        paceAdvice: 'maintain',
        reason: `知识点 "${reviewNode.nodeId}" 掌握度衰减至 ${(reviewNode.decayedMastery * 100).toFixed(0)}%，需要复习巩固`,
        predictedAccuracy: this.irtPredictAccuracy(abilityTheta, reviewNode.originalDifficulty),
      };
    }

    // 2. 筛选候选知识点（前置条件满足 + 未掌握）
    const eligibleNodes = candidateNodes.filter(n => {
      if (n.mastery >= 0.85) return false; // 已掌握
      const prereqsMet = n.prerequisites.length === 0 ||
        n.prerequisites.every(p => (knowledgeMastery[p] || 0) >= 0.5);
      return prereqsMet;
    });

    if (eligibleNodes.length === 0) {
      // 全部掌握，推荐项目实战
      return {
        recommendedNodeId: candidateNodes[0]?.nodeId || 'FS-004',
        recommendedMode: 'project',
        recommendedDifficulty: 5,
        masteryProbability: 1,
        needsReview: false,
        hints: ['你已经掌握了大部分知识点，建议通过项目实战巩固！'],
        paceAdvice: 'accelerate',
        reason: '知识点已基本掌握，进入项目实战阶段',
        predictedAccuracy: 0.9,
      };
    }

    // 3. 根据学生画像和能力选择最佳知识点
    const selected = this.selectBestNode(eligibleNodes, abilityTheta, profileType, streakCorrect, streakWrong);

    // 4. 推荐学习模式和难度
    const mode = this.recommendMode(selected, profileType, streakCorrect, streakWrong);
    const difficulty = this.recommendDifficulty(selected.difficulty, abilityTheta, streakCorrect, streakWrong);

    // 5. 生成提示
    const hints = this.generateHints(selected, profileType, streakCorrect, streakWrong, knowledgeMastery);

    // 6. 学习节奏建议
    const paceAdvice = this.determinePace(paceScore, streakCorrect, streakWrong);

    // 7. 计算预测正确率
    const predictedAccuracy = this.irtPredictAccuracy(abilityTheta, difficulty);

    return {
      recommendedNodeId: selected.nodeId,
      recommendedMode: mode,
      recommendedDifficulty: difficulty,
      masteryProbability: selected.mastery,
      needsReview: false,
      hints,
      paceAdvice,
      reason: this.buildDecisionReason(selected, mode, profileType, streakCorrect, streakWrong),
      predictedAccuracy,
    };
  }

  /**
   * 更新学习者状态 — 在答题/练习后调用
   */
  updateLearnerState(
    currentState: LearnerState,
    nodeId: string,
    isCorrect: boolean,
    difficulty: number,
    score: number, // 0-1
  ): LearnerState {
    const bktParams = this.getBKTParams(currentState.profileType);
    const currentMastery = currentState.knowledgeMastery[nodeId] || bktParams.priorMastery;

    // BKT 更新掌握概率
    let newMastery: number;
    if (isCorrect) {
      newMastery = this.bktUpdateOnCorrect(currentMastery, bktParams);
    } else {
      newMastery = this.bktUpdateOnIncorrect(currentMastery, bktParams);
    }

    // IRT 更新能力值
    const newTheta = this.irtUpdateTheta(currentState.abilityTheta, difficulty, isCorrect);

    // 更新连续答对/答错
    let streakCorrect = currentState.streakCorrect;
    let streakWrong = currentState.streakWrong;
    if (isCorrect) {
      streakCorrect++;
      streakWrong = 0;
    } else {
      streakWrong++;
      streakCorrect = 0;
    }

    // 更新节奏分数（指数移动平均）
    const paceScore = currentState.paceScore * 0.7 + (isCorrect ? 1 : 0) * 0.3;

    // 更新节点历史
    const nodeHistory = { ...currentState.nodeHistory };
    const existing = nodeHistory[nodeId] || { attempts: 0, correct: 0, lastTime: 0, avgDifficulty: difficulty };
    nodeHistory[nodeId] = {
      attempts: existing.attempts + 1,
      correct: existing.correct + (isCorrect ? 1 : 0),
      lastTime: Date.now(),
      avgDifficulty: (existing.avgDifficulty * existing.attempts + difficulty) / (existing.attempts + 1),
    };

    // 更新掌握状态（应用所有节点的历史衰减）
    const knowledgeMastery = { ...currentState.knowledgeMastery };
    const now = Date.now();
    for (const [nid, mastery] of Object.entries(knowledgeMastery)) {
      if (nid !== nodeId) {
        const hist = nodeHistory[nid];
        const elapsed = hist ? now - hist.lastTime : now - currentState.lastStudyTime;
        if (elapsed > DECAY_CONFIG.halfLifeMs * 0.5) { // 超过3.5天开始衰减
          knowledgeMastery[nid] = this.applyDecay(mastery, elapsed);
        }
      }
    }
    knowledgeMastery[nodeId] = newMastery;

    return {
      ...currentState,
      knowledgeMastery,
      abilityTheta: newTheta,
      paceScore,
      streakCorrect,
      streakWrong,
      totalPractices: currentState.totalPractices + 1,
      totalCorrect: currentState.totalCorrect + (isCorrect ? 1 : 0),
      lastStudyTime: now,
      nodeHistory,
    };
  }

  /**
   * 初始化学习者状态 — 基于学生画像
   */
  initializeLearnerState(userId: string, profileType: StudentProfileType): LearnerState {
    const initialTheta = {
      beginner: -0.5,
      transition: 0.5,
      advanced: 1.5,
    }[profileType];

    return {
      userId,
      profileType,
      knowledgeMastery: {},
      abilityTheta: initialTheta,
      paceScore: 0.5,
      streakCorrect: 0,
      streakWrong: 0,
      totalPractices: 0,
      totalCorrect: 0,
      lastStudyTime: Date.now(),
      nodeHistory: {},
    };
  }

  /**
   * 基于画像评估初始能力 — 检测已有知识
   * 有基础的转行者可以通过简单测试跳过已掌握的知识点
   */
  async assessInitialLevel(
    userId: string,
    profileType: StudentProfileType,
    selfReportedSkills: string[],
  ): Promise<LearnerState> {
    const state = this.initializeLearnerState(userId, profileType);

    // 基于自报技能预置掌握度
    for (const skill of selfReportedSkills) {
      const relatedNodes = this.getNodesForSkill(skill);
      for (const nodeId of relatedNodes) {
        state.knowledgeMastery[nodeId] = profileType === 'advanced' ? 0.7 : 0.5;
      }
    }

    // 有经验者初始能力更高
    if (profileType === 'transition') {
      state.abilityTheta = 0.3 + selfReportedSkills.length * 0.1;
    } else if (profileType === 'advanced') {
      state.abilityTheta = 1.0 + selfReportedSkills.length * 0.15;
    }

    return state;
  }

  // ===== 私有辅助方法 =====

  private getBKTParams(profileType: StudentProfileType): BKTParams {
    switch (profileType) {
      case 'beginner': return CONSERVATIVE_BKT;
      case 'advanced': return AGGRESSIVE_BKT;
      default: return DEFAULT_BKT;
    }
  }

  private findNodesNeedingReview(
    knowledgeMastery: Record<string, number>,
    lastStudyTime: number,
  ): { nodeId: string; decayedMastery: number; originalDifficulty: number }[] {
    const now = Date.now();
    const reviewNodes: { nodeId: string; decayedMastery: number; originalDifficulty: number }[] = [];

    for (const [nodeId, mastery] of Object.entries(knowledgeMastery)) {
      // 估算距上次学习的时间
      const elapsed = now - lastStudyTime;
      if (elapsed > DECAY_CONFIG.halfLifeMs * 0.5 && mastery > 0.3) {
        const decayed = this.applyDecay(mastery, elapsed);
        if (decayed < DECAY_CONFIG.reviewThreshold) {
          reviewNodes.push({
            nodeId,
            decayedMastery: decayed,
            originalDifficulty: 2, // 默认中等难度
          });
        }
      }
    }

    return reviewNodes;
  }

  private selectBestNode(
    eligibleNodes: { nodeId: string; difficulty: number; mastery: number; dependents: string[] }[],
    theta: number,
    profileType: StudentProfileType,
    streakCorrect: number,
    streakWrong: number,
  ): typeof eligibleNodes[0] {
    // 评分函数：综合考虑多个因素
    const scored = eligibleNodes.map(node => {
      // 1. IRT 匹配度 — 难度接近能力时分数最高
      const optimalDiff = this.selectOptimalDifficulty(theta);
      const irtMatch = 1 - Math.abs(node.difficulty - optimalDiff) / 5;

      // 2. 依赖性 — 后续依赖多的知识点优先
      const dependencyScore = Math.min(node.dependents.length / 3, 1);

      // 3. 已有进度 — 已经开始学但没完成的优先
      const progressScore = node.mastery > 0 && node.mastery < 0.85 ? 0.3 : 0;

      // 4. 连续答对时允许跳到更高难度
      const streakBonus = streakCorrect >= 3 ? (node.difficulty > optimalDiff ? 0.2 : 0) : 0;

      // 5. 连续答错时优先低难度
      const streakPenalty = streakWrong >= 2 ? (node.difficulty < optimalDiff ? 0.2 : -0.1) : 0;

      // 6. 画像调整 — 新手偏向低难度，有经验者偏向高难度
      const profileAdjust = {
        beginner: -0.1 * node.difficulty,
        transition: 0,
        advanced: 0.1 * node.difficulty,
      }[profileType];

      const totalScore = irtMatch * 0.4 + dependencyScore * 0.25 + progressScore * 0.15 +
        streakBonus + streakPenalty + profileAdjust;

      return { node, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.node || eligibleNodes[0];
  }

  private recommendMode(
    node: { mastery: number; difficulty: number },
    profileType: StudentProfileType,
    streakCorrect: number,
    streakWrong: number,
  ): AdaptiveDecision['recommendedMode'] {
    // 连续答错 → 回到阅读模式
    if (streakWrong >= 3) return 'reading';

    // 连续答对 → 跳到编码练习
    if (streakCorrect >= 3 && node.mastery > 0.5) return 'coding';

    // 未开始 → 阅读模式
    if (node.mastery < 0.1) return 'reading';

    // 有一定基础 → Quiz 测试
    if (node.mastery < 0.5) return 'quiz';

    // 掌握度较高但未完成 → 编码练习
    if (node.mastery < 0.85) return 'coding';

    // 高级学习者 → 项目实战
    if (profileType === 'advanced' && node.mastery >= 0.85) return 'project';

    return 'coding';
  }

  private recommendDifficulty(
    baseDifficulty: number,
    theta: number,
    streakCorrect: number,
    streakWrong: number,
  ): number {
    let difficulty = baseDifficulty;

    // 连续答对 → 适当提升难度
    if (streakCorrect >= 3) difficulty += 0.5;
    if (streakCorrect >= 5) difficulty += 0.5;

    // 连续答错 → 降低难度
    if (streakWrong >= 2) difficulty -= 0.5;
    if (streakWrong >= 4) difficulty -= 0.5;

    // 限制在 1-5 范围内
    return Math.max(1, Math.min(5, Math.round(difficulty)));
  }

  private generateHints(
    node: { nodeId: string; difficulty: number; mastery: number },
    profileType: StudentProfileType,
    streakCorrect: number,
    streakWrong: number,
    knowledgeMastery: Record<string, number>,
  ): string[] {
    const hints: string[] = [];

    if (profileType === 'beginner') {
      hints.push('💡 不用急，仔细理解每个概念');
      if (node.difficulty >= 3) {
        hints.push('📖 这个知识点有一定难度，建议先回顾前置知识');
      }
    } else if (profileType === 'transition') {
      hints.push('🔄 类比你已知的语言来理解新概念');
    } else {
      hints.push('🚀 试着从底层原理理解，而不只是用法');
    }

    if (streakWrong >= 2) {
      hints.push('⏸️ 看起来有点困难，建议切换到阅读模式重新理解');
    }

    if (streakCorrect >= 3) {
      hints.push('⚡ 进展顺利！可以尝试更有挑战性的练习');
    }

    if (node.mastery > 0.6 && node.mastery < 0.85) {
      hints.push('🎯 你已经掌握了基础，现在需要更多练习巩固');
    }

    return hints;
  }

  private determinePace(
    paceScore: number,
    streakCorrect: number,
    streakWrong: number,
  ): AdaptiveDecision['paceAdvice'] {
    if (streakWrong >= 4) return 'take_break';
    if (streakWrong >= 2 || paceScore < 0.3) return 'slow_down';
    if (streakCorrect >= 3 && paceScore > 0.7) return 'accelerate';
    return 'maintain';
  }

  private buildDecisionReason(
    node: { nodeId: string; difficulty: number; mastery: number; dependents: string[] },
    mode: string,
    profileType: StudentProfileType,
    streakCorrect: number,
    streakWrong: number,
  ): string {
    const parts: string[] = [];

    parts.push(`推荐学习 ${node.nodeId}（难度 ${node.difficulty}）`);

    if (node.mastery > 0) {
      parts.push(`当前掌握度 ${(node.mastery * 100).toFixed(0)}%`);
    }

    parts.push(`推荐模式：${mode}`);

    if (node.dependents.length > 0) {
      parts.push(`${node.dependents.length} 个后续知识点依赖于此`);
    }

    if (streakCorrect >= 3) parts.push('连续答对，适当提升难度');
    if (streakWrong >= 2) parts.push('连续答错，建议复习巩固');

    return parts.join('；');
  }

  /**
   * 技能到知识点映射（用于初始评估）
   */
  private getNodesForSkill(skill: string): string[] {
    const skillMap: Record<string, string[]> = {
      'javascript': ['JS-001', 'JS-002', 'JS-003', 'JS-004'],
      'html': ['FE-001'],
      'css': ['FE-002', 'FE-003'],
      'react': ['REACT-001', 'REACT-002'],
      'nodejs': ['NODE-001', 'NODE-002'],
      'python': [], // Python 经验对 JS 学习有一定帮助
      'java': ['JS-009'], // Java 的 OOP 经验对 JS 类有帮助
      'typescript': ['REACT-013'],
      'git': ['ENG-001'],
      'sql': ['NODE-006'],
    };
    return skillMap[skill.toLowerCase()] || [];
  }

  /**
   * 获取学习者状态摘要（用于调试和展示）
   */
  getLearnerStateSummary(state: LearnerState): {
    profileType: string;
    abilityLevel: string;
    masteryDistribution: { mastered: number; inProgress: number; notStarted: number };
    overallAccuracy: number;
    paceScore: number;
    currentStreak: string;
  } {
    const mastery = Object.values(state.knowledgeMastery);
    const mastered = mastery.filter(m => m >= 0.85).length;
    const inProgress = mastery.filter(m => m > 0 && m < 0.85).length;
    const notStarted = Math.max(0, 80 - mastered - inProgress); // 80+ 知识点

    const abilityLevel = state.abilityTheta < -0.5 ? '入门' :
      state.abilityTheta < 0.5 ? '进阶' :
      state.abilityTheta < 1.5 ? '熟练' : '精通';

    const accuracy = state.totalPractices > 0
      ? state.totalCorrect / state.totalPractices
      : 0;

    return {
      profileType: state.profileType,
      abilityLevel,
      masteryDistribution: { mastered, inProgress, notStarted },
      overallAccuracy: accuracy,
      paceScore: state.paceScore,
      currentStreak: state.streakCorrect > 0 ? `✅ ${state.streakCorrect} 连对` :
        state.streakWrong > 0 ? `❌ ${state.streakWrong} 连错` : '—',
    };
  }
}
