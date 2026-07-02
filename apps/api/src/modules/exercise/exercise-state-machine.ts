// 练习提交状态机

export type SubmissionStatus =
  | 'pending'        // 待评测
  | 'running'        // 运行中
  | 'evaluating'     // 评估中
  | 'reviewing'      // 审查中
  | 'completed'      // 已完成
  | 'failed'         // 执行失败
  | 'timed_out'      // 超时
  | 'error';         // 系统错误

export type SubmissionEvent =
  | 'start_run'      // 开始执行
  | 'run_complete'   // 执行完成
  | 'run_failed'     // 执行失败
  | 'timeout'         // 超时
  | 'evaluate'       // 开始评估
  | 'evaluate_done'  // 评估完成
  | 'review'         // 开始审查
  | 'review_done'    // 审查完成
  | 'complete'       // 完成
  | 'error';         // 系统错误

// 状态转换定义
const TRANSITION_MAP: Record<SubmissionStatus, Partial<Record<SubmissionEvent, SubmissionStatus>>> = {
  pending: {
    start_run: 'running',
    error: 'error',
  },
  running: {
    run_complete: 'evaluating',
    run_failed: 'failed',
    timeout: 'timed_out',
    error: 'error',
  },
  evaluating: {
    evaluate_done: 'reviewing',
    run_failed: 'failed',
    error: 'error',
  },
  reviewing: {
    review_done: 'completed',
    error: 'error',
  },
  completed: {},
  failed: {
    start_run: 'running',  // 可以重试
  },
  timed_out: {
    start_run: 'running',  // 可以重试
  },
  error: {
    start_run: 'running',  // 修复后重试
  },
};

// 状态时间限制（毫秒）
const STATE_TIME_LIMITS: Partial<Record<SubmissionStatus, number>> = {
  pending: 5 * 60 * 1000,       // 5 分钟
  running: 30 * 1000,            // 30 秒
  evaluating: 10 * 1000,         // 10 秒
  reviewing: 30 * 1000,          // 30 秒
};

export interface StateTransition {
  from: SubmissionStatus;
  to: SubmissionStatus;
  event: SubmissionEvent;
  timestamp: number;
}

export class ExerciseSubmissionStateMachine {
  private transitions: StateTransition[] = [];
  private currentStatus: SubmissionStatus;
  private enteredAt: number;

  constructor() {
    this.currentStatus = 'pending';
    this.enteredAt = Date.now();
  }

  /**
   * 执行状态转换
   */
  transition(event: SubmissionEvent): {
    from: SubmissionStatus;
    to: SubmissionStatus;
    allowed: boolean;
    reason?: string;
  } {
    const from = this.currentStatus;
    const allowedNext = TRANSITION_MAP[from]?.[event];

    if (!allowedNext) {
      return {
        from,
        to: from,
        allowed: false,
        reason: `不允许在 ${from} 状态下触发 ${event} 事件`,
      };
    }

    // 检查时间限制
    if (STATE_TIME_LIMITS[from]) {
      const elapsed = Date.now() - this.enteredAt;
      if (elapsed > STATE_TIME_LIMITS[from]!) {
        // 超时，自动转换为超时状态
        if (from === 'running') {
          return this.transition('timeout');
        }
      }
    }

    this.transitions.push({
      from,
      to: allowedNext,
      event,
      timestamp: Date.now(),
    });

    this.currentStatus = allowedNext;
    this.enteredAt = Date.now();

    return { from, to: allowedNext, allowed: true };
  }

  /**
   * 获取当前状态
   */
  getStatus(): SubmissionStatus {
    return this.currentStatus;
  }

  /**
   * 获取状态统计
   */
  getStats(): {
    status: SubmissionStatus;
    elapsedMs: number;
    totalTransitions: number;
    isTerminal: boolean;
    canRetry: boolean;
  } {
    const terminalStates: SubmissionStatus[] = ['completed', 'error'];
    const retryableStates: SubmissionStatus[] = ['failed', 'timed_out', 'error'];

    return {
      status: this.currentStatus,
      elapsedMs: Date.now() - this.enteredAt,
      totalTransitions: this.transitions.length,
      isTerminal: terminalStates.includes(this.currentStatus),
      canRetry: retryableStates.includes(this.currentStatus),
    };
  }

  /**
   * 获取完整转换历史
   */
  getTransitionHistory(): StateTransition[] {
    return [...this.transitions];
  }

  /**
   * 重置状态机
   */
  reset(): void {
    this.currentStatus = 'pending';
    this.enteredAt = Date.now();
    this.transitions = [];
  }
}
