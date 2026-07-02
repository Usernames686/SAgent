// 学习路径状态机

export type LearningPathStatus = 'active' | 'paused' | 'completed' | 'abandoned';

// 允许的状态转换
const VALID_TRANSITIONS: Record<LearningPathStatus, LearningPathStatus[]> = {
  active: ['paused', 'completed', 'abandoned'],
  paused: ['active', 'abandoned'],
  completed: [],
  abandoned: [],
};

// 状态转换条件
export interface StateTransitionContext {
  allKpsMastered?: boolean;    // 全部知识点是否掌握
  userRequestedPause?: boolean;  // 用户请求暂停
  daysSinceLastActive?: number;  // 最近活跃天数
  progress: number;             // 当前进度 0-1
}

export class PathStateMachine {
  /**
   * 验证状态转换是否合法
   */
  static canTransition(from: LearningPathStatus, to: LearningPathStatus): { valid: boolean; reason?: string } {
    if (from === to) {
      return { valid: true };
    }

    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) {
      return { valid: false, reason: `状态 '${from}' 不允许任何转换` };
    }

    if (!allowed.includes(to)) {
      return {
        valid: false,
        reason: `不允许从 '${from}' 转换到 '${to}'。允许的目标: ${allowed.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * 执行状态转换
   */
  static transition(
    from: LearningPathStatus,
    to: LearningPathStatus,
    context: StateTransitionContext,
  ): { newStatus: LearningPathStatus; event: string; description: string } {
    // 先验证
    const check = PathStateMachine.canTransition(from, to);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    // 根据转换类型生成事件
    const events: Record<string, { event: string; description: string }> = {
      'active->paused': {
        event: 'path.paused',
        description: '用户暂停了学习路径',
      },
      'paused->active': {
        event: 'path.resumed',
        description: '用户恢复学习路径',
      },
      'active->completed': {
        event: 'path.completed',
        description: `全部知识点掌握，学习路径完成（进度 ${Math.round(context.progress * 100)}%）`,
      },
      'active->abandoned': {
        event: 'path.abandoned',
        description: `用户放弃了学习路径（${context.daysSinceLastActive ? `已 ${context.daysSinceLastActive} 天未学习` : '用户主动放弃'}）`,
      },
      'paused->abandoned': {
        event: 'path.abandoned',
        description: '暂停期间用户决定放弃',
      },
    };

    const key = `${from}->${to}`;
    const result = events[key] || {
      event: `path.${to}`,
      description: `状态从 ${from} 变更为 ${to}`,
    };

    return { newStatus: to, ...result };
  }

  /**
   * 自动检测应执行的状态转换
   */
  static detectTransition(
    currentStatus: LearningPathStatus,
    context: StateTransitionContext,
  ): { to: LearningPathStatus; reason: string } | null {
    switch (currentStatus) {
      case 'active':
        // 全部掌握 → 完成
        if (context.allKpsMastered) {
          return { to: 'completed', reason: '全部知识点已掌握' };
        }
        // 长时间未学习 → 自动暂停
        if (context.daysSinceLastActive && context.daysSinceLastActive > 7) {
          return { to: 'paused', reason: `${context.daysSinceLastActive} 天未学习，自动暂停` };
        }
        // 用户主动暂停
        if (context.userRequestedPause) {
          return { to: 'paused', reason: '用户请求暂停' };
        }
        break;

      case 'paused':
        // 用户恢复
        if (!context.userRequestedPause && context.daysSinceLastActive && context.daysSinceLastActive < 3) {
          return { to: 'active', reason: '用户重新开始学习' };
        }
        // 暂停超过 30 天 → 放弃
        if (context.daysSinceLastActive && context.daysSinceLastActive > 30) {
          return { to: 'abandoned', reason: `暂停已 ${context.daysSinceLastActive} 天，自动标记为放弃` };
        }
        break;

      case 'completed':
      case 'abandoned':
        // 终态，无自动转换
        break;
    }

    return null;
  }
}
