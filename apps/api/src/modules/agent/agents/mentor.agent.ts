import { LlmGateway } from '../llm/llm.gateway';

// 学生情绪状态
export interface EmotionalState {
  frustrationLevel: number;   // 0-1
  confidenceLevel: number;    // 0-1
  engagementLevel: number;    // 0-1
  boredomLevel: number;       // 0-1
  lastUpdated: Date;
}

// 学习策略建议
export interface StrategySuggestion {
  type: 'motivation' | 'time_management' | 'habit_building' | 'emotion_regulation' | 'learning_method';
  title: string;
  description: string;
  actions: string[];
  priority: 'high' | 'medium' | 'low';
}

// 学习习惯
export interface LearningHabit {
  id: string;
  name: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  isActive: boolean;
}

// 时间管理建议
export interface TimeManagementAdvice {
  idealStudyTimes: string[];
  sessionDuration: number;      // 建议时长（分钟）
  breakInterval: number;        // 休息间隔（分钟）
  weeklyTarget: number;         // 每周目标（小时）
  focusTechnique: 'pomodoro' | 'time_blocking' | 'deep_work';
}

export class MentorAgent {
  constructor(private readonly llm: LlmGateway) {}

  /**
   * 检测情绪状态并给出建议
   */
  async analyzeEmotion(
    recentInteractions: { timestamp: Date; content: string; sentiment?: number }[],
  ): Promise<{ state: EmotionalState; suggestion: string }> {
    // 基于最近交互的情绪分析
    const frustrationSignals = recentInteractions.filter(i =>
      i.content.includes('?') || i.content.includes('难') || i.content.includes('不懂') || i.content.includes('help')
    ).length;

    const frustrationLevel = Math.min(1, frustrationSignals / Math.max(1, recentInteractions.length) * 2);
    const confidenceLevel = Math.max(0, 1 - frustrationLevel * 1.5);

    const state: EmotionalState = {
      frustrationLevel: Math.round(frustrationLevel * 100) / 100,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      engagementLevel: 0.7,
      boredomLevel: 0.2,
      lastUpdated: new Date(),
    };

    // 生成鼓励建议
    let suggestion: string;
    if (frustrationLevel > 0.6) {
      suggestion = '看起来你遇到了困难。建议暂时休息一下，或者换一个更简单的练习来建立信心。记住，编程学习是一个循序渐进的过程。';
    } else if (confidenceLevel < 0.4) {
      suggestion = '你做得很好！编程中的每个错误都是学习的机会。建议回顾一下之前成功完成的练习，给自己一些信心。';
    } else {
      suggestion = '保持这个节奏很好！建议定期回顾已学知识，加深理解。';
    }

    return { state, suggestion };
  }

  /**
   * 生成学习策略建议
   */
  async suggestStrategy(
    emotionalState: EmotionalState,
    learningHabits: LearningHabit[],
  ): Promise<StrategySuggestion[]> {
    const suggestions: StrategySuggestion[] = [];

    // 情绪调节建议
    if (emotionalState.frustrationLevel > 0.5) {
      suggestions.push({
        type: 'emotion_regulation',
        title: '情绪调节',
        description: '当前挫败感较高，建议调整学习节奏',
        actions: [
          '暂时休息 15 分钟，做点轻松的事情',
          '切换到已经掌握的知识点做复习，重建信心',
          '尝试换个学习方式，比如看视频而不是写代码',
        ],
        priority: 'high',
      });
    }

    // 习惯养成建议
    const activeHabits = learningHabits.filter(h => h.isActive);
    if (activeHabits.length === 0) {
      suggestions.push({
        type: 'habit_building',
        title: '建立学习习惯',
        description: '持续的学习习惯比单次长时间学习更有效',
        actions: [
          '每天固定时间学习 30 分钟',
          '使用番茄工作法：25 分钟学习 + 5 分钟休息',
          '记录每天的学习日志，追踪进度',
        ],
        priority: 'high',
      });
    }

    // 时间管理建议
    suggestions.push({
      type: 'time_management',
      title: '优化学习时间',
      description: '根据你的学习模式，建议优化时间安排',
      actions: [
        '建议每次学习 45-60 分钟，效率最高',
        '每学习 25 分钟休息 5 分钟',
        '每周至少安排 5 小时学习时间',
      ],
      priority: 'medium',
    });

    // 动机激励
    if (emotionalState.engagementLevel < 0.5) {
      suggestions.push({
        type: 'motivation',
        title: '保持学习动力',
        description: '试试这些方法保持学习热情',
        actions: [
          '设定一个本周可达成的具体目标',
          '加入学习社区，和其他人一起学习',
          '做一个自己感兴趣的小项目',
        ],
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * 生成时间管理方案
   */
  generateTimeManagement(
    weeklyFrequency: number,
    preferredTimeSlots: string[],
  ): TimeManagementAdvice {
    const idealSlots = preferredTimeSlots.length > 0
      ? preferredTimeSlots
      : ['09:00-11:00', '14:00-16:00', '20:00-22:00'];

    return {
      idealStudyTimes: idealSlots,
      sessionDuration: 45,
      breakInterval: 25,
      weeklyTarget: Math.max(5, weeklyFrequency * 0.75),
      focusTechnique: 'pomodoro',
    };
  }

  /**
   * 生成周学习总结
   */
  async generateWeeklySummary(
    completedExercises: number,
    learningMinutes: number,
    masteredKps: number,
    emotionalTrend: EmotionalState[],
  ): Promise<string> {
    const systemPrompt = `你是一位富有同理心的编程学习导师。请根据以下数据生成一段周学习总结。

数据：
- 完成练习: ${completedExercises} 题
- 学习时长: ${learningMinutes} 分钟
- 掌握知识点: ${masteredKps} 个
- 情绪趋势: ${emotionalTrend.length} 次记录

要求：
1. 肯定进步和努力
2. 给出具体的数据亮点
3. 提供下周的学习建议
4. 保持鼓励和积极的语气`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请生成周总结' },
      ],
      temperature: 0.7,
      maxTokens: 512,
    });

    return response.choices[0]?.message?.content || '继续保持学习节奏！';
  }
}
