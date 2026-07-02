import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningAdvisorService } from './learning-advisor.service';
import { ProgressStats } from './learning-progress.service';

// ── Mock 工厂 ──

function createMockProgressService() {
  return {
    getAllProgress: vi.fn(async () => [] as any[]),
    getStats: vi.fn(async () => ({
      total: 0, locked: 0, learning: 0, passed: 0, mastered: 0,
      averageMastery: 0, totalStudyTime: 0,
    } as ProgressStats)),
  };
}

function createMockSpacedRepetitionService() {
  return {
    getDueReviews: vi.fn(async () => [] as any[]),
  };
}

function createMockErrorReviewService() {
  return {
    getErrorStats: vi.fn(async () => ({
      totalErrors: 0, reviewed: 0, unreviewed: 0,
      passedOnReview: 0, failedOnReview: 0,
      byErrorType: {} as Record<string, number>, topWeakNodes: [] as string[],
    })),
  };
}

function createMockKpRepo() {
  const store: any[] = [];
  return {
    store,
    find: vi.fn(async () => store),
  };
}

/** 构造 LearningProgress-like 对象 */
function makeProgress(overrides: Partial<{
  nodeId: string;
  status: 'locked' | 'learning' | 'passed' | 'mastered';
  mastery: number;
  attemptsCount: number;
  lastStudiedAt: Date | null;
}> = {}) {
  return {
    nodeId: overrides.nodeId || 'JS-001',
    status: overrides.status || 'learning',
    mastery: overrides.mastery ?? 50,
    attemptsCount: overrides.attemptsCount ?? 1,
    lastStudiedAt: overrides.lastStudiedAt !== undefined ? overrides.lastStudiedAt : new Date(),
  };
}

// ── 测试主体 ──

describe('LearningAdvisorService — 学习顾问验证', () => {
  let service: LearningAdvisorService;
  let mockProgress: ReturnType<typeof createMockProgressService>;
  let mockSR: ReturnType<typeof createMockSpacedRepetitionService>;
  let mockER: ReturnType<typeof createMockErrorReviewService>;
  let mockKpRepo: ReturnType<typeof createMockKpRepo>;

  beforeEach(() => {
    mockProgress = createMockProgressService();
    mockSR = createMockSpacedRepetitionService();
    mockER = createMockErrorReviewService();
    mockKpRepo = createMockKpRepo();
    // @ts-ignore — 注入 mock
    service = new LearningAdvisorService(
      mockProgress as any,
      mockSR as any,
      mockER as any,
      mockKpRepo as any,
    );
  });

  // ═══ 1. 新手引导 ═══

  describe('新手引导 — 无任何学习记录', () => {
    it('应生成 new-start 建议引导用户从 JS-001 开始', async () => {
      const result = await service.generateAdvice('user-new');

      // 新手至少应有 new-start 建议（可能还有 continue 建议）
      const newStart = result.advice.find(a => a.type === 'new-start');
      expect(newStart).toBeDefined();
      expect(newStart!.priority).toBe('high');
      expect(newStart!.items).toContain('JS-001');
      expect(newStart!.action).toBe('start-learning');
      expect(newStart!.emoji).toBe('🚀');
    });

    it('summary 中 nextRecommendedNode 应为 JS-001', async () => {
      const result = await service.generateAdvice('user-new');

      expect(result.summary.nextRecommendedNode).toBe('JS-001');
      expect(result.summary.currentPhase).toBe('基础夯实');
      expect(result.summary.streakDays).toBe(0);
    });
  });

  // ═══ 2. 间隔重复提醒 ═══

  describe('间隔重复提醒 — 有待复习知识点', () => {
    it('应生成 review 建议，优先级为 high', async () => {
      mockSR.getDueReviews.mockResolvedValueOnce([
        { nodeId: 'JS-001' },
        { nodeId: 'JS-003' },
        { nodeId: 'NODE-005' },
      ]);

      const result = await service.generateAdvice('user-1');

      const reviewAdvice = result.advice.find(a => a.type === 'review');
      expect(reviewAdvice).toBeDefined();
      expect(reviewAdvice!.priority).toBe('high');
      expect(reviewAdvice!.items).toHaveLength(3);
      expect(reviewAdvice!.action).toBe('spaced-repetition');
      expect(reviewAdvice!.title).toContain('3');
    });

    it('无待复习时不应生成 review 建议', async () => {
      mockSR.getDueReviews.mockResolvedValueOnce([]);
      const result = await service.generateAdvice('user-1');
      expect(result.advice.find(a => a.type === 'review')).toBeUndefined();
    });
  });

  // ═══ 3. 错题回顾建议 ═══

  describe('错题回顾建议 — 有薄弱知识点', () => {
    it('应生成 error-review 建议，优先级为 medium', async () => {
      mockER.getErrorStats.mockResolvedValueOnce({
        totalErrors: 5,
        reviewed: 2,
        unreviewed: 3,
        passedOnReview: 1,
        failedOnReview: 1,
        byErrorType: { concept: 3, logic: 2 },
        topWeakNodes: ['JS-005', 'NODE-010'],
      });

      const result = await service.generateAdvice('user-1');

      const errAdvice = result.advice.find(a => a.type === 'error-review');
      expect(errAdvice).toBeDefined();
      expect(errAdvice!.priority).toBe('medium');
      expect(errAdvice!.items).toContain('JS-005');
      expect(errAdvice!.items).toContain('NODE-010');
      expect(errAdvice!.action).toBe('error-review');
    });

    it('summary 应包含 unreviewedErrorCount', async () => {
      mockER.getErrorStats.mockResolvedValueOnce({
        totalErrors: 5, reviewed: 2, unreviewed: 3,
        passedOnReview: 1, failedOnReview: 1,
        byErrorType: {}, topWeakNodes: ['JS-005'],
      });

      const result = await service.generateAdvice('user-1');
      expect(result.summary.unreviewedErrorCount).toBe(3);
    });

    it('无错题时不应生成 error-review 建议', async () => {
      mockER.getErrorStats.mockResolvedValueOnce({
        totalErrors: 0, reviewed: 0, unreviewed: 0,
        passedOnReview: 0, failedOnReview: 0,
        byErrorType: {}, topWeakNodes: [],
      });

      const result = await service.generateAdvice('user-1');
      expect(result.advice.find(a => a.type === 'error-review')).toBeUndefined();
    });
  });

  // ═══ 4. 继续学习建议 ═══

  describe('继续学习建议 — 找到当前模块', () => {
    it('应生成 continue 建议推荐下一个知识点', async () => {
      // 已完成 JS-001、JS-002，下一个是 JS-003
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'JS-001', status: 'passed' }),
        makeProgress({ nodeId: 'JS-002', status: 'passed' }),
      ]);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 2, locked: 0, learning: 0, passed: 2, mastered: 0,
        averageMastery: 80, totalStudyTime: 30,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');

      const continueAdvice = result.advice.find(a => a.type === 'continue');
      expect(continueAdvice).toBeDefined();
      expect(continueAdvice!.items).toContain('JS-003');
      expect(continueAdvice!.action).toBe('continue-learning');
      expect(continueAdvice!.title).toContain('JavaScript 核心基础');
    });

    it('已通过第一个模块所有节点 → 进入下一模块', async () => {
      // JS-001~JS-014 全部通过
      const jsNodes = Array.from({ length: 14 }, (_, i) =>
        makeProgress({ nodeId: `JS-${String(i + 1).padStart(3, '0')}`, status: 'passed' })
      );
      mockProgress.getAllProgress.mockResolvedValueOnce(jsNodes);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 14, locked: 0, learning: 0, passed: 14, mastered: 0,
        averageMastery: 85, totalStudyTime: 210,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');

      const continueAdvice = result.advice.find(a => a.type === 'continue');
      expect(continueAdvice).toBeDefined();
      expect(continueAdvice!.title).toContain('Node.js');
    });
  });

  // ═══ 5. 连续学习鼓励 ═══

  describe('连续学习鼓励 — 连续3天以上', () => {
    it('连续3天学习应生成 streak 建议', async () => {
      const now = new Date();
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'JS-001', status: 'learning', lastStudiedAt: now }),                       // 今天
        makeProgress({ nodeId: 'JS-002', status: 'learning', lastStudiedAt: new Date(now.getTime() - 86400000) }),  // 昨天
        makeProgress({ nodeId: 'JS-003', status: 'learning', lastStudiedAt: new Date(now.getTime() - 2 * 86400000) }), // 前天
      ]);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 3, locked: 0, learning: 3, passed: 0, mastered: 0,
        averageMastery: 30, totalStudyTime: 45,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');

      const streakAdvice = result.advice.find(a => a.type === 'streak');
      expect(streakAdvice).toBeDefined();
      expect(streakAdvice!.priority).toBe('low');
      expect(streakAdvice!.title).toContain('3');
      expect(streakAdvice!.emoji).toBe('🔥');
    });

    it('连续不足3天不应生成 streak 建议', async () => {
      const now = new Date();
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'JS-001', status: 'learning', lastStudiedAt: now }),
      ]);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 1, locked: 0, learning: 1, passed: 0, mastered: 0,
        averageMastery: 20, totalStudyTime: 15,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');
      expect(result.advice.find(a => a.type === 'streak')).toBeUndefined();
    });
  });

  // ═══ 6. 前置知识建议 ═══

  describe('前置知识建议 — 有未完成前置依赖', () => {
    it('应生成 prerequisite 建议列出未完成前置', async () => {
      // NODE-001 依赖 JS-001，但 JS-001 未完成
      mockKpRepo.store.push({
        nodeId: 'NODE-001',
        prerequisites: ['JS-001', 'JS-002'],
      });
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'NODE-001', status: 'learning' }),
      ]);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 1, locked: 0, learning: 1, passed: 0, mastered: 0,
        averageMastery: 10, totalStudyTime: 15,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');

      const prereqAdvice = result.advice.find(a => a.type === 'prerequisite');
      expect(prereqAdvice).toBeDefined();
      expect(prereqAdvice!.priority).toBe('high');
      expect(prereqAdvice!.action).toBe('learn-prerequisite');
      // 应包含 JS-001、JS-002 作为需要先学习的前置
      expect(prereqAdvice!.items).toContain('JS-001');
      expect(prereqAdvice!.items).toContain('JS-002');
    });

    it('前置已全部完成不应生成 prerequisite 建议', async () => {
      mockKpRepo.store.push({
        nodeId: 'NODE-001',
        prerequisites: ['JS-001'],
      });
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'JS-001', status: 'passed' }),
        makeProgress({ nodeId: 'NODE-001', status: 'passed' }),
      ]);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 2, locked: 0, learning: 0, passed: 2, mastered: 0,
        averageMastery: 80, totalStudyTime: 30,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');
      expect(result.advice.find(a => a.type === 'prerequisite')).toBeUndefined();
    });
  });

  // ═══ 7. 建议排序 ═══

  describe('建议按优先级排序', () => {
    it('high 应排在 medium 前面，medium 应排在 low 前面', async () => {
      // 同时触发多个建议
      mockSR.getDueReviews.mockResolvedValueOnce([
        { nodeId: 'JS-001' },
      ]); // → review (high)
      mockER.getErrorStats.mockResolvedValueOnce({
        totalErrors: 3, reviewed: 0, unreviewed: 3,
        passedOnReview: 0, failedOnReview: 0,
        byErrorType: { concept: 3 }, topWeakNodes: ['JS-005'],
      }); // → error-review (medium)

      const now = new Date();
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'JS-001', status: 'learning', lastStudiedAt: now }),
        makeProgress({ nodeId: 'JS-002', status: 'learning', lastStudiedAt: new Date(now.getTime() - 86400000) }),
        makeProgress({ nodeId: 'JS-003', status: 'learning', lastStudiedAt: new Date(now.getTime() - 2 * 86400000) }),
      ]); // → streak (low) if 3 days
      mockProgress.getStats.mockResolvedValueOnce({
        total: 3, locked: 0, learning: 3, passed: 0, mastered: 0,
        averageMastery: 30, totalStudyTime: 45,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');

      // 找到各类型在 advice 数组中的位置
      const types = result.advice.map(a => a.type);
      const reviewIdx = types.indexOf('review');
      const errorIdx = types.indexOf('error-review');
      const streakIdx = types.indexOf('streak');

      if (reviewIdx >= 0 && errorIdx >= 0) {
        expect(reviewIdx).toBeLessThan(errorIdx);
      }
      if (errorIdx >= 0 && streakIdx >= 0) {
        expect(errorIdx).toBeLessThan(streakIdx);
      }
    });
  });

  // ═══ 8. 概览数据完整性 ═══

  describe('LearningSummary — 概览数据完整性', () => {
    it('应包含所有必要字段', async () => {
      mockSR.getDueReviews.mockResolvedValueOnce([{ nodeId: 'JS-001' }]);
      mockER.getErrorStats.mockResolvedValueOnce({
        totalErrors: 2, reviewed: 1, unreviewed: 1,
        passedOnReview: 0, failedOnReview: 1,
        byErrorType: { logic: 2 }, topWeakNodes: ['JS-005'],
      });

      const result = await service.generateAdvice('user-1');

      const summary = result.summary;
      expect(summary).toHaveProperty('stats');
      expect(summary).toHaveProperty('dueReviewCount');
      expect(summary).toHaveProperty('unreviewedErrorCount');
      expect(summary).toHaveProperty('currentPhase');
      expect(summary).toHaveProperty('streakDays');
      expect(summary).toHaveProperty('nextRecommendedNode');

      expect(summary.dueReviewCount).toBe(1);
      expect(summary.unreviewedErrorCount).toBe(1);
      expect(typeof summary.currentPhase).toBe('string');
      expect(typeof summary.streakDays).toBe('number');
    });

    it('generatedAt 应为 ISO 日期格式', async () => {
      const result = await service.generateAdvice('user-1');
      expect(result.generatedAt).toBeTruthy();
      expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
    });
  });

  // ═══ 9. 当前阶段判断 ═══

  describe('当前学习阶段判断', () => {
    it('未完成 JS 基础 → 基础夯实', async () => {
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'JS-001', status: 'passed' }),
      ]);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 1, locked: 0, learning: 0, passed: 1, mastered: 0,
        averageMastery: 80, totalStudyTime: 15,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');
      expect(result.summary.currentPhase).toBe('基础夯实');
    });

    it('JS 全完成，NODE/FE 未完成 → 进阶突破', async () => {
      const jsNodes = Array.from({ length: 14 }, (_, i) =>
        makeProgress({ nodeId: `JS-${String(i + 1).padStart(3, '0')}`, status: 'passed' })
      );
      mockProgress.getAllProgress.mockResolvedValueOnce(jsNodes);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 14, locked: 0, learning: 0, passed: 14, mastered: 0,
        averageMastery: 85, totalStudyTime: 210,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');
      expect(result.summary.currentPhase).toBe('进阶突破');
    });

    it('全部完成 → 已毕业', async () => {
      // 构造全部完成的记录（JS 14 + NODE 23 + FE 8 + REACT 18 + ENG 3 + AI 3 = 69）
      const allNodeIds = [
        ...Array.from({ length: 14 }, (_, i) => `JS-${String(i + 1).padStart(3, '0')}`),
        ...Array.from({ length: 23 }, (_, i) => `NODE-${String(i + 1).padStart(3, '0')}`),
        ...Array.from({ length: 8 }, (_, i) => `FE-${String(i + 1).padStart(3, '0')}`),
        ...Array.from({ length: 18 }, (_, i) => `REACT-${String(i + 1).padStart(3, '0')}`),
        ...Array.from({ length: 3 }, (_, i) => `ENG-${String(i + 1).padStart(3, '0')}`),
        ...Array.from({ length: 3 }, (_, i) => `AI-${String(i + 1).padStart(3, '0')}`),
      ];
      mockProgress.getAllProgress.mockResolvedValueOnce(
        allNodeIds.map(id => makeProgress({ nodeId: id, status: 'mastered' }))
      );
      mockProgress.getStats.mockResolvedValueOnce({
        total: 69, locked: 0, learning: 0, passed: 0, mastered: 69,
        averageMastery: 95, totalStudyTime: 1035,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');
      expect(result.summary.currentPhase).toBe('已毕业');
    });
  });

  // ═══ 10. 综合场景 ═══

  describe('综合场景 — 多建议并存', () => {
    it('多种条件同时满足应生成多条建议', async () => {
      // 间隔复习 + 错题 + 当前模块 + 连续学习
      mockSR.getDueReviews.mockResolvedValueOnce([
        { nodeId: 'JS-001' }, { nodeId: 'JS-003' },
      ]);
      mockER.getErrorStats.mockResolvedValueOnce({
        totalErrors: 5, reviewed: 2, unreviewed: 3,
        passedOnReview: 1, failedOnReview: 1,
        byErrorType: { concept: 3, logic: 2 },
        topWeakNodes: ['JS-005', 'NODE-010'],
      });

      const now = new Date();
      mockProgress.getAllProgress.mockResolvedValueOnce([
        makeProgress({ nodeId: 'JS-001', status: 'passed', lastStudiedAt: now }),
        makeProgress({ nodeId: 'JS-002', status: 'passed', lastStudiedAt: new Date(now.getTime() - 86400000) }),
        makeProgress({ nodeId: 'JS-003', status: 'passed', lastStudiedAt: new Date(now.getTime() - 2 * 86400000) }),
        makeProgress({ nodeId: 'JS-004', status: 'learning', lastStudiedAt: new Date(now.getTime() - 3 * 86400000) }),
      ]);
      mockProgress.getStats.mockResolvedValueOnce({
        total: 4, locked: 0, learning: 1, passed: 3, mastered: 0,
        averageMastery: 60, totalStudyTime: 60,
      } as ProgressStats);

      const result = await service.generateAdvice('user-1');

      // 至少应有 review, error-review, continue, streak
      const types = result.advice.map(a => a.type);
      expect(types).toContain('review');
      expect(types).toContain('error-review');
      expect(types).toContain('continue');
      expect(types).toContain('streak');
    });
  });
});
