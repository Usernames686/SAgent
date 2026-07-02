// BKT（贝叶斯知识追踪）+ RL（强化学习）混合路径推荐算法

// ===== BKT 参数 =====
export interface BktParams {
  /** 初始掌握概率 P(L₀) */
  priorMastery: number;
  /** 学习迁移概率 P(T) — 一次学习后从未知到已知的概率 */
  transitProb: number;
  /** 猜测概率 P(G) — 未知状态下猜对的概率 */
  guessProb: number;
  /** 失误概率 P(S) — 已知状态下答错的概率 */
  slipProb: number;
  /** 遗忘概率 P(F) — 随时间遗忘的概率 */
  forgetProb: number;
}

// ===== 知识点掌握状态 =====
export interface KnowledgeMastery {
  kpId: string;
  /** 掌握概率 P(L) */
  masteryProb: number;
  /** 学习次数 */
  attemptCount: number;
  /** 平均耗时（秒） */
  avgTimeSpent: number;
  /** 上次学习时间戳 */
  lastLearnedAt?: number;
  /** 遗忘计数器 */
  forgetCount: number;
}

// ===== RL 经验 =====
export interface RlExperience {
  kpId: string;
  recommendedOrder: number;
  outcomeScore: number;      // 学习成果 0-100
  timeSpent: number;         // 学习耗时（秒）
  frustrationLevel: number;  // 挫败感 0-1
  timestamp: number;
}

// ===== 推荐结果 =====
export interface PathRecommendation {
  kpId: string;
  name: string;
  score: number;             // 综合推荐分
  expectedGain: number;      // 预期收益
  difficultyGap: number;     // 难度差距
  continuityBonus: number;   // 连贯性奖励
  reason: string;
}

// ===== 默认 BKT 参数（经调优的经验值） =====
const DEFAULT_BKT_PARAMS: BktParams = {
  priorMastery: 0.15,
  transitProb: 0.20,
  guessProb: 0.15,
  slipProb: 0.10,
  forgetProb: 0.05,
};

export class BktRlAlgorithm {
  private bktParams: BktParams;
  /** RL 经验池 */
  private experiencePool: Map<string, RlExperience[]> = new Map();

  constructor(params?: Partial<BktParams>) {
    this.bktParams = { ...DEFAULT_BKT_PARAMS, ...params };
  }

  // ============================
  //  BKT 核心算法
  // ============================

  /**
   * BKT 更新步骤：
   * 1. 先验：P(Lₙ) = P(Lₙ₋₁) + (1 - P(Lₙ₋₁)) × P(T)
   * 2. 后验：P(Lₙ|evidence) = P(evidence|Lₙ) × P(Lₙ) / P(evidence)
   * 3. 考虑遗忘：P(Lₙ) = P(Lₙ) × (1 - P(F))^Δt
   */
  updateMastery(
    current: KnowledgeMastery,
    isCorrect: boolean,
    timeSpent: number,
  ): KnowledgeMastery {
    const { transitProb, guessProb, slipProb } = this.bktParams;
    let prob = current.masteryProb;

    // Step 1: 学习迁移 — 这次学习可能带来理解
    prob = prob + (1 - prob) * transitProb;

    // Step 2: 贝叶斯更新
    if (isCorrect) {
      // 回答正确：P(L|correct) = P(L) × (1-P(S)) / [P(L) × (1-P(S)) + (1-P(L)) × P(G)]
      prob = (prob * (1 - slipProb)) / (prob * (1 - slipProb) + (1 - prob) * guessProb);
    } else {
      // 回答错误：P(L|wrong) = P(L) × P(S) / [P(L) × P(S) + (1-P(L)) × (1-P(G))]
      prob = (prob * slipProb) / (prob * slipProb + (1 - prob) * (1 - guessProb));
    }

    // Step 3: 防溢出
    prob = Math.max(0.01, Math.min(0.99, prob));

    return {
      kpId: current.kpId,
      masteryProb: Math.round(prob * 10000) / 10000,
      attemptCount: current.attemptCount + 1,
      avgTimeSpent: current.attemptCount > 0
        ? (current.avgTimeSpent * current.attemptCount + timeSpent) / (current.attemptCount + 1)
        : timeSpent,
      lastLearnedAt: Date.now(),
      forgetCount: isCorrect ? 0 : current.forgetCount + 1,
    };
  }

  /**
   * 遗忘衰减：P(L) = P(L) × (1 - P(F))^(Δt / 24h)
   */
  applyForgetDecay(mastery: KnowledgeMastery): KnowledgeMastery {
    if (!mastery.lastLearnedAt) return mastery;

    const hoursSinceLastLearn = (Date.now() - mastery.lastLearnedAt) / (1000 * 60 * 60);
    if (hoursSinceLastLearn < 24) return mastery;  // 24 小时内不衰减

    const decayDays = Math.floor(hoursSinceLastLearn / 24);
    const decayFactor = Math.pow(1 - this.bktParams.forgetProb, decayDays);
    const newProb = mastery.masteryProb * decayFactor;

    return {
      ...mastery,
      masteryProb: Math.max(0.01, Math.round(newProb * 10000) / 10000),
    };
  }

  // ============================
  //  RL 强化学习层
  // ============================

  /**
   * 记录 RL 经验
   */
  recordExperience(exp: RlExperience): void {
    const list = this.experiencePool.get(exp.kpId) || [];
    list.push(exp);
    // 只保留最近 50 条
    if (list.length > 50) list.shift();
    this.experiencePool.set(exp.kpId, list);
  }

  /**
   * RL Q 值更新：根据历史经验调整推荐权重
   * Q(s,a) = Q(s,a) + α × [R + γ × maxQ(s',a') - Q(s,a)]
   */
  private computeQValue(kpId: string): number {
    const experiences = this.experiencePool.get(kpId) || [];
    if (experiences.length === 0) return 0.5;

    const alpha = 0.3;  // 学习率
    const gamma = 0.7;  // 折扣因子

    // 计算平均回报
    const avgReward = experiences.reduce((sum, e) => {
      const reward = e.outcomeScore / 100 - e.frustrationLevel * 0.5;
      return sum + reward;
    }, 0) / experiences.length;

    // Q 值 = 当前估计 + 学习率 × (平均回报 - 当前估计)
    const currentQ = 0.5;
    const qValue = currentQ + alpha * (avgReward - currentQ);

    return Math.max(0, Math.min(1, qValue));
  }

  /**
   * 多臂老虎机（Upper Confidence Bound）探索
   * UCB = Q(s,a) + C × √(ln(N_total) / N_a)
   */
  private ucbScore(kpId: string): number {
    const qValue = this.computeQValue(kpId);
    const experiences = this.experiencePool.get(kpId) || [];
    const nA = experiences.length;          // 该知识点被推荐的次数
    const totalExperiences = this.experiencePool.size;
    const NTotal = Array.from(this.experiencePool.values())
      .reduce((sum, list) => sum + list.length, 0);
    const C = 0.5;  // 探索系数

    if (nA === 0) return qValue + C * Math.sqrt(Math.log(NTotal + 1) / 1);

    const exploration = C * Math.sqrt(Math.log(NTotal + 1) / nA);
    return qValue + exploration;
  }

  // ============================
  //  综合推荐计算
  // ============================

  /**
   * 计算推荐分数
   *
   * 推荐分数 = BKT收益 × 权重_BKT + RL_Q值 × 权重_RL + UCB探索 + 连贯性奖励
   */
  computeRecommendationScore(
    mastery: KnowledgeMastery | undefined,
    kpName: string,
    isInCurrentStage: boolean,
    prerequisitesMet: boolean,
  ): PathRecommendation {
    if (!prerequisitesMet) {
      return {
        kpId: mastery?.kpId || 'unknown',
        name: kpName,
        score: -1,
        expectedGain: 0,
        difficultyGap: 0,
        continuityBonus: 0,
        reason: '前置知识未掌握，暂不推荐',
      };
    }

    const currentMastery = mastery?.masteryProb ?? this.bktParams.priorMastery;

    // 已掌握超过 90% 不推荐
    if (currentMastery >= 0.9) {
      return {
        kpId: mastery!.kpId,
        name: kpName,
        score: -1,
        expectedGain: 0,
        difficultyGap: 0,
        continuityBonus: 0,
        reason: '已掌握',
      };
    }

    // BKT 预期收益：掌握差距越大，收益越高
    const bktGain = (0.9 - currentMastery) * 1.2;

    // RL Q 值
    const rlQValue = mastery ? this.computeQValue(mastery.kpId) : 0.5;

    // UCB 探索分数
    const ucbScore = mastery ? this.ucbScore(mastery.kpId) : 0.5;

    // 挫折惩罚：连续失败时降低分数
    const frustrationPenalty = (mastery?.forgetCount ?? 0) > 2 ? 0.3 : 0;

    // 连贯性奖励：当前阶段知识点加分
    const continuityBonus = isInCurrentStage ? 0.25 : 0;
    const continuityLabel = isInCurrentStage ? '+0.25（当前阶段）' : '0';

    // 综合分数
    const totalScore = bktGain * 0.4 + rlQValue * 0.3 + ucbScore * 0.1 - frustrationPenalty + continuityBonus;

    let reason: string;
    if (isInCurrentStage) {
      reason = `掌握度 ${Math.round(currentMastery * 100)}%，当前阶段优先推荐`;
    } else if (currentMastery < 0.3) {
      reason = `掌握度较低（${Math.round(currentMastery * 100)}%），建议优先学习`;
    } else {
      reason = `RL 推荐（Q=${rlQValue.toFixed(2)}, UCB=${ucbScore.toFixed(2)}）`;
    }

    return {
      kpId: mastery?.kpId || 'unknown',
      name: kpName,
      score: Math.round(totalScore * 100) / 100,
      expectedGain: Math.round(bktGain * 100) / 100,
      difficultyGap: 0,
      continuityBonus,
      reason,
    };
  }

  /**
   * 更新 BKT 参数（进化引擎调用）
   */
  updateBktParams(params: Partial<BktParams>): void {
    this.bktParams = { ...this.bktParams, ...params };
  }

  /**
   * 获取当前 BKT 参数
   */
  getBktParams(): BktParams {
    return { ...this.bktParams };
  }

  /**
   * 重置 RL 经验
   */
  resetExperience(): void {
    this.experiencePool.clear();
  }
}
