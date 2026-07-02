import { Injectable, Logger } from '@nestjs/common';

// 学生学习风格类型
export type LearningStyle = 'visual' | 'hands_on' | 'theoretical' | 'mixed';
export type StudentLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

// 学生档案
export interface StudentProfile {
  id: string;
  level: StudentLevel;
  style: LearningStyle;
  history: { strategyId: string; score: number }[];
}

// 教学策略
export interface TeachingStrategy {
  id: string;
  name: string;
  type: string;
  description: string;
  bestFor: LearningStyle[];  // 适合的学习风格
  bestForLevel: StudentLevel[];  // 适合的学生水平
  prompt: string;
}

// 策略-学生匹配结果
export interface StrategyMatch {
  strategyId: string;
  studentStyle: LearningStyle;
  expectedScore: number;
  confidence: number;
}

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);

  // 所有可用策略
  private strategies: TeachingStrategy[] = [
    {
      id: 'socratic',
      name: '苏格拉底式引导',
      type: '引导式',
      description: '通过提问引导学生主动思考，适合理解型学习',
      bestFor: ['theoretical', 'mixed'],
      bestForLevel: ['beginner', 'elementary'],
      prompt: '你想创建毛玻璃效果的卡片，你会考虑哪些方面？\n1. 视觉效果？\n2. 技术实现？\n3. 性能优化？',
    },
    {
      id: 'case_compare',
      name: '案例对比法',
      type: '归纳式',
      description: '通过对比案例让学生发现规律，适合视觉型学习',
      bestFor: ['visual'],
      bestForLevel: ['elementary', 'intermediate'],
      prompt: '分析以下代码：\n1. div { background: white } （无效果）\n2. div { backdrop-filter: blur(20px); background: rgba(255,255,255,0.1) } （毛玻璃）\n哪个更好？为什么？',
    },
    {
      id: 'direct_practice',
      name: '直接实践法',
      type: '实践式',
      description: '让学生直接动手实践，适合动手型学习',
      bestFor: ['hands_on'],
      bestForLevel: ['elementary', 'intermediate', 'advanced'],
      prompt: '请直接用 CSS 实现一个毛玻璃效果的卡片组件。',
    },
    {
      id: 'direct_lecture',
      name: '直接讲授法',
      type: '演绎式',
      description: '直接给出公式和定义，适合快速入门',
      bestFor: ['mixed'],
      bestForLevel: ['beginner'],
      prompt: '毛玻璃效果 = backdrop-filter: blur() + 半透明背景 + 细微边框。请记住这个公式。',
    },
  ];

  // 策略-学生风格匹配的历史数据
  private matchHistory: Map<string, { style: LearningStyle; score: number }[]> = new Map();

  /**
   * 根据学生档案选择最优策略
   */
  selectBestStrategy(student: StudentProfile): TeachingStrategy {
    // 1. 如果学生有历史数据，优先使用历史最优策略
    const historicalBest = this.getHistoricalBestStrategy(student);
    if (historicalBest) {
      return historicalBest;
    }

    // 2. 混合型学生：根据水平选择策略
    if (student.style === 'mixed') {
      return this.getStrategyForMixedLearner(student.level);
    }

    // 3. 根据学生学习风格匹配策略
    const styleMatch = this.strategies.find(s => 
      s.bestFor.includes(student.style) && s.bestForLevel.includes(student.level)
    );
    if (styleMatch) {
      return styleMatch;
    }

    // 4. 根据学生水平匹配策略
    const levelMatch = this.strategies.find(s => 
      s.bestForLevel.includes(student.level)
    );
    if (levelMatch) {
      return levelMatch;
    }

    // 5. 默认使用苏格拉底式引导
    return this.strategies[0];
  }

  /**
   * 为混合型学生选择策略
   * 混合型学生没有明确的学习风格偏好，需要根据水平选择
   */
  private getStrategyForMixedLearner(level: StudentLevel): TeachingStrategy {
    switch (level) {
      case 'beginner':
        // 初学者：需要快速入门，直接讲授法最合适
        return this.strategies.find(s => s.id === 'direct_lecture')!;
      case 'elementary':
        // 入门者：需要理解规律，案例对比法最合适
        return this.strategies.find(s => s.id === 'case_compare')!;
      case 'intermediate':
        // 中级：需要深度思考，苏格拉底式引导最合适
        return this.strategies.find(s => s.id === 'socratic')!;
      case 'advanced':
        // 高级：需要动手实践，直接实践法最合适
        return this.strategies.find(s => s.id === 'direct_practice')!;
      default:
        return this.strategies[0];
    }
  }

  /**
   * 获取历史最优策略
   */
  private getHistoricalBestStrategy(student: StudentProfile): TeachingStrategy | null {
    if (student.history.length < 3) {
      return null; // 数据不足，不使用历史策略
    }

    // 统计每种策略的平均分
    const strategyScores: Map<string, number[]> = new Map();
    for (const record of student.history) {
      if (!strategyScores.has(record.strategyId)) {
        strategyScores.set(record.strategyId, []);
      }
      strategyScores.get(record.strategyId)!.push(record.score);
    }

    // 找到平均分最高的策略
    let bestStrategyId = '';
    let bestAvgScore = 0;
    for (const [strategyId, scores] of strategyScores) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore > bestAvgScore) {
        bestAvgScore = avgScore;
        bestStrategyId = strategyId;
      }
    }

    if (bestAvgScore > 70) {
      return this.strategies.find(s => s.id === bestStrategyId) || null;
    }

    return null;
  }

  /**
   * 记录学习结果，更新匹配数据
   */
  recordResult(student: StudentProfile, strategyId: string, score: number): void {
    // 记录到学生历史
    student.history.push({ strategyId, score });

    // 更新全局匹配数据
    const key = `${student.style}_${strategyId}`;
    if (!this.matchHistory.has(key)) {
      this.matchHistory.set(key, []);
    }
    this.matchHistory.get(key)!.push({ style: student.style, score });
  }

  /**
   * 获取策略推荐报告
   */
  getRecommendationReport(student: StudentProfile): {
    recommended: TeachingStrategy;
    alternatives: TeachingStrategy[];
    reason: string;
    matchScore: number;
  } {
    const recommended = this.selectBestStrategy(student);
    const alternatives = this.strategies
      .filter(s => s.id !== recommended.id)
      .slice(0, 2);

    let reason = '';
    const historicalBest = this.getHistoricalBestStrategy(student);
    if (historicalBest) {
      reason = `基于你的学习历史，${historicalBest.name} 对你效果最好`;
    } else {
      reason = `根据你的学习风格"${student.style}"，${recommended.name}最适合你`;
    }

    return {
      recommended,
      alternatives,
      reason,
      matchScore: 0.85,
    };
  }

  /**
   * 获取所有策略
   */
  getStrategies(): TeachingStrategy[] {
    return this.strategies;
  }

  /**
   * 获取策略统计
   */
  getStrategyStats(): { strategyId: string; name: string; avgScore: number; bestFor: string }[] {
    return this.strategies.map(s => {
      const matches = this.matchHistory.get(s.id) || [];
      const avgScore = matches.length > 0 
        ? matches.reduce((a, b) => a + b.score, 0) / matches.length 
        : 0;
      return {
        strategyId: s.id,
        name: s.name,
        avgScore: Math.round(avgScore),
        bestFor: s.bestFor.join(', '),
      };
    });
  }
}
