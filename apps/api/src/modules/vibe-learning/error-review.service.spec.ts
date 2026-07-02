import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorReviewService } from './error-review.service';
import { CreateErrorReviewDto } from './error-review.service';

// ── 模拟 Repository 和 LearningProgressService ──

function createMockRepo() {
  const store: Map<string, any> = new Map();
  let counter = 0;

  return {
    store,
    create: vi.fn((dto: any) => {
      const id = `err-${++counter}`;
      const entity = {
        id,
        ...dto,
        reviewed: dto.reviewed ?? false,
        reviewCount: dto.reviewCount ?? 0,
        reviewPassed: dto.reviewPassed ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(id, entity);
      return entity;
    }),
    save: vi.fn(async (entity: any) => {
      store.set(entity.id, { ...entity, updatedAt: new Date() });
      return store.get(entity.id);
    }),
    findOne: vi.fn(async ({ where }: any) => {
      // 支持 { id, userId } 查询
      for (const [, val] of store) {
        if (where.id && val.id === where.id && val.userId === where.userId) return val;
        if (where.id && val.id === where.id && !where.userId) return val;
      }
      return null;
    }),
    find: vi.fn(async ({ where }: any) => {
      const results: any[] = [];
      for (const [, val] of store) {
        if (where?.userId && val.userId !== where.userId) continue;
        results.push(val);
      }
      return results;
    }),
    update: vi.fn(async (cond: any, dto: any) => {
      let affected = 0;
      for (const [, val] of store) {
        let match = true;
        if (cond.userId && val.userId !== cond.userId) match = false;
        if (cond.nodeId && val.nodeId !== cond.nodeId) match = false;
        if (cond.reviewed !== undefined && val.reviewed !== cond.reviewed) match = false;
        if (match) {
          Object.assign(val, dto, { updatedAt: new Date() });
          affected++;
        }
      }
      return { affected };
    }),
    createQueryBuilder: vi.fn(() => {
      // 简化版 QueryBuilder，返回 store 里所有匹配 userId 的记录
      const state: any = { conditions: [], limitVal: null, offsetVal: null, orderVal: null };
      const qb: any = {
        where: vi.fn((clause: string, params: any) => { state.conditions.push({ clause, params }); return qb; }),
        andWhere: vi.fn((clause: string, params: any) => { state.conditions.push({ clause, params }); return qb; }),
        orderBy: vi.fn((col: string, dir: string) => { state.orderVal = { col, dir }; return qb; }),
        limit: vi.fn((n: number) => { state.limitVal = n; return qb; }),
        offset: vi.fn((n: number) => { state.offsetVal = n; return qb; }),
        getCount: vi.fn(async () => {
          let results = filterStore(store, state.conditions);
          return results.length;
        }),
        getMany: vi.fn(async () => {
          let results = filterStore(store, state.conditions);
          if (state.orderVal) {
            results.sort((a: any, b: any) => {
              const aVal = a[state.orderVal.col];
              const bVal = b[state.orderVal.col];
              return state.orderVal.dir === 'DESC' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
            });
          }
          if (state.offsetVal) results = results.slice(state.offsetVal);
          if (state.limitVal) results = results.slice(0, state.limitVal);
          return results;
        }),
      };
      return qb;
    }),
  };
}

function filterStore(store: Map<string, any>, conditions: any[]) {
  let results = Array.from(store.values());
  for (const c of conditions) {
    const p = c.params;
    if (p.userId) results = results.filter(r => r.userId === p.userId);
    if (p.nodeId) results = results.filter(r => r.nodeId === p.nodeId);
    if (p.errorType) results = results.filter(r => r.errorType === p.errorType);
    if (p.reviewed !== undefined) results = results.filter(r => r.reviewed === p.reviewed);
  }
  return results;
}

function createMockProgressService() {
  return {
    getProgress: vi.fn(async () => null),
    updateProgress: vi.fn(async () => ({})),
  };
}

// ── 测试主体 ──

describe('ErrorReviewService — 错题回顾系统验证', () => {
  let service: ErrorReviewService;
  let mockRepo: ReturnType<typeof createMockRepo>;
  let mockProgress: ReturnType<typeof createMockProgressService>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    mockProgress = createMockProgressService();
    // @ts-ignore — 注入 mock
    service = new ErrorReviewService(mockRepo as any, mockProgress as any);
  });

  // ═══ 1. 错题记录创建 ═══

  describe('recordError — 创建错题记录', () => {
    it('应成功创建一条错题记录', async () => {
      const dto: CreateErrorReviewDto = {
        nodeId: 'node-1',
        questionId: 'q-1',
        questionContent: '什么是闭包？',
        userAnswer: '函数内部的函数',
        correctAnswer: '函数与其词法环境的组合',
        errorType: 'concept',
        explanation: '缺少词法环境的概念',
        sourceType: 'quiz',
        originalScore: 40,
      };

      const result = await service.recordError('user-1', dto);

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.userId).toBe('user-1');
      expect(result.nodeId).toBe('node-1');
      expect(result.questionId).toBe('q-1');
      expect(result.errorType).toBe('concept');
      expect(result.reviewed).toBe(false);
      expect(result.reviewCount).toBe(0);
      expect(result.reviewPassed).toBeNull();
      expect(result.sourceType).toBe('quiz');
      expect(result.originalScore).toBe(40);
    });

    it('未指定 errorType 时默认为 concept', async () => {
      const dto: CreateErrorReviewDto = {
        nodeId: 'node-2',
        questionId: 'q-2',
        userAnswer: 'wrong',
        correctAnswer: 'right',
      };

      const result = await service.recordError('user-1', dto);
      expect(result.errorType).toBe('concept');
    });

    it('未指定 sourceType 时默认为 quiz', async () => {
      const dto: CreateErrorReviewDto = {
        nodeId: 'node-3',
        questionId: 'q-3',
        userAnswer: 'x',
        correctAnswer: 'y',
      };

      const result = await service.recordError('user-1', dto);
      expect(result.sourceType).toBe('quiz');
    });

    it('应尝试同步更新学习进度的 errorPatterns', async () => {
      mockProgress.getProgress.mockResolvedValueOnce({
        nodeId: 'node-1',
        errorPatterns: ['concept:old-q'],
      } as any);
      mockProgress.updateProgress.mockResolvedValueOnce({});

      const dto: CreateErrorReviewDto = {
        nodeId: 'node-1',
        questionId: 'q-new',
        userAnswer: 'wrong',
        correctAnswer: 'right',
        errorType: 'logic',
      };

      await service.recordError('user-1', dto);

      expect(mockProgress.getProgress).toHaveBeenCalledWith('user-1', 'node-1');
      expect(mockProgress.updateProgress).toHaveBeenCalledWith('user-1', 'node-1', {
        errorPatterns: ['concept:old-q', 'logic:q-new'],
      });
    });

    it('进度同步失败不应阻塞错题创建', async () => {
      mockProgress.getProgress.mockRejectedValueOnce(new Error('DB error'));

      const dto: CreateErrorReviewDto = {
        nodeId: 'node-1',
        questionId: 'q-1',
        userAnswer: 'wrong',
        correctAnswer: 'right',
      };

      // 不应抛出
      const result = await service.recordError('user-1', dto);
      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
    });
  });

  // ═══ 2. 批量记录 ═══

  describe('batchRecordErrors — 批量记录错题', () => {
    it('应批量创建多条错题记录', async () => {
      const dtos: CreateErrorReviewDto[] = [
        { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b', errorType: 'concept' },
        { nodeId: 'node-1', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd', errorType: 'logic' },
        { nodeId: 'node-2', questionId: 'q-3', userAnswer: 'e', correctAnswer: 'f', errorType: 'syntax' },
      ];

      const results = await service.batchRecordErrors('user-1', dtos);
      expect(results).toHaveLength(3);
      expect(results[0].errorType).toBe('concept');
      expect(results[1].errorType).toBe('logic');
      expect(results[2].errorType).toBe('syntax');
    });
  });

  // ═══ 3. 错题查询 ═══

  describe('getErrorList — 获取错题列表（支持筛选）', () => {
    beforeEach(async () => {
      // 预置数据
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b', errorType: 'concept' });
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd', errorType: 'logic' });
      await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-3', userAnswer: 'e', correctAnswer: 'f', errorType: 'syntax' });
      await service.recordError('user-2', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'x', correctAnswer: 'y', errorType: 'careless' });
    });

    it('应返回用户所有错题', async () => {
      const { items, total } = await service.getErrorList('user-1');
      expect(total).toBe(3);
      expect(items).toHaveLength(3);
    });

    it('应按 nodeId 筛选', async () => {
      const { items, total } = await service.getErrorList('user-1', { nodeId: 'node-1' });
      expect(total).toBe(2);
      expect(items.every(i => i.nodeId === 'node-1')).toBe(true);
    });

    it('应按 errorType 筛选', async () => {
      const { items, total } = await service.getErrorList('user-1', { errorType: 'logic' });
      expect(total).toBe(1);
      expect(items[0].errorType).toBe('logic');
    });

    it('应支持分页', async () => {
      const { items, total } = await service.getErrorList('user-1', { limit: 2, offset: 1 });
      expect(total).toBe(3);
      expect(items).toHaveLength(2);
    });
  });

  describe('getUnreviewedErrors — 获取未回顾错题', () => {
    it('应只返回未回顾的错题', async () => {
      const err1 = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });
      const err2 = await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd' });

      // 标记 err1 已回顾
      await service.markReviewed(err1.id, 'user-1', true);

      const unreviewed = await service.getUnreviewedErrors('user-1');
      expect(unreviewed).toHaveLength(1);
      expect(unreviewed[0].id).toBe(err2.id);
    });
  });

  // ═══ 4. 错题分析 ═══

  describe('getErrorsByNode — 按知识点聚合', () => {
    it('应按知识点分组并统计错误类型', async () => {
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b', errorType: 'concept' });
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd', errorType: 'logic' });
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-3', userAnswer: 'e', correctAnswer: 'f', errorType: 'concept' });
      await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-4', userAnswer: 'g', correctAnswer: 'h', errorType: 'syntax' });

      const result = await service.getErrorsByNode('user-1');

      expect(result).toHaveLength(2);
      // node-1 有 3 条错误，应排第一
      expect(result[0].nodeId).toBe('node-1');
      expect(result[0].count).toBe(3);
      expect(result[0].errorTypeBreakdown.concept).toBe(2);
      expect(result[0].errorTypeBreakdown.logic).toBe(1);
      // node-2 有 1 条
      expect(result[1].nodeId).toBe('node-2');
      expect(result[1].count).toBe(1);
    });
  });

  describe('getErrorStats — 错题统计概览', () => {
    it('应返回完整统计数据', async () => {
      const err1 = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b', errorType: 'concept' });
      const err2 = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd', errorType: 'logic' });
      const err3 = await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-3', userAnswer: 'e', correctAnswer: 'f', errorType: 'syntax' });

      // 标记 err1 已回顾通过
      await service.markReviewed(err1.id, 'user-1', true);
      // 标记 err2 已回顾未通过
      await service.markReviewed(err2.id, 'user-1', false);

      const stats = await service.getErrorStats('user-1');

      expect(stats.totalErrors).toBe(3);
      expect(stats.reviewed).toBe(2);
      expect(stats.unreviewed).toBe(1);
      expect(stats.passedOnReview).toBe(1);
      expect(stats.failedOnReview).toBe(1);
      expect(stats.byErrorType.concept).toBe(1);
      expect(stats.byErrorType.logic).toBe(1);
      expect(stats.byErrorType.syntax).toBe(1);
      // node-1 有2条错误 >= 2，应出现在 topWeakNodes
      expect(stats.topWeakNodes).toContain('node-1');
    });

    it('错误数<2的知识点不出现在 topWeakNodes', async () => {
      await service.recordError('user-1', { nodeId: 'node-solo', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });

      const stats = await service.getErrorStats('user-1');
      expect(stats.topWeakNodes).not.toContain('node-solo');
    });
  });

  // ═══ 5. 错题回顾流程 ═══

  describe('markReviewed — 标记已回顾', () => {
    it('应标记错题为已回顾并记录通过', async () => {
      const err = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });

      const reviewed = await service.markReviewed(err.id, 'user-1', true);

      expect(reviewed.reviewed).toBe(true);
      expect(reviewed.reviewCount).toBe(1);
      expect(reviewed.reviewPassed).toBe(true);
    });

    it('应标记错题为已回顾并记录未通过', async () => {
      const err = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });

      const reviewed = await service.markReviewed(err.id, 'user-1', false);

      expect(reviewed.reviewed).toBe(true);
      expect(reviewed.reviewCount).toBe(1);
      expect(reviewed.reviewPassed).toBe(false);
    });

    it('不存在的错题应抛出错误', async () => {
      await expect(service.markReviewed('non-existent', 'user-1', true))
        .rejects.toThrow('错题记录不存在');
    });

    it('多次回顾应累加 reviewCount', async () => {
      const err = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });

      await service.markReviewed(err.id, 'user-1', false);
      // 先重置再回顾
      await service.resetForRePractice(err.id, 'user-1');
      await service.markReviewed(err.id, 'user-1', true);

      const final = mockRepo.store.get(err.id);
      expect(final.reviewCount).toBe(2);
    });
  });

  describe('resetForRePractice — 重置为未回顾', () => {
    it('应将已回顾的错题重置为未回顾', async () => {
      const err = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });
      await service.markReviewed(err.id, 'user-1', true);

      const reset = await service.resetForRePractice(err.id, 'user-1');

      expect(reset.reviewed).toBe(false);
      expect(reset.reviewPassed).toBeNull();
    });

    it('不存在的错题应抛出错误', async () => {
      await expect(service.resetForRePractice('non-existent', 'user-1'))
        .rejects.toThrow('错题记录不存在');
    });
  });

  describe('resetNodeErrors — 批量重置知识点下错题', () => {
    it('应将知识点下所有已回顾错题重置为未回顾', async () => {
      const err1 = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });
      const err2 = await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd' });
      const err3 = await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-3', userAnswer: 'e', correctAnswer: 'f' });

      await service.markReviewed(err1.id, 'user-1', true);
      await service.markReviewed(err2.id, 'user-1', false);
      await service.markReviewed(err3.id, 'user-1', true);

      const count = await service.resetNodeErrors('user-1', 'node-1');

      expect(count).toBe(2); // node-1 下2条已回顾的错题
      expect(mockRepo.store.get(err1.id).reviewed).toBe(false);
      expect(mockRepo.store.get(err2.id).reviewed).toBe(false);
      expect(mockRepo.store.get(err3.id).reviewed).toBe(true); // node-2 的不受影响
    });
  });

  // ═══ 6. 薄弱知识点推荐 ═══

  describe('recommendWeakNodes — 推荐薄弱知识点', () => {
    it('应返回错误数>=2的知识点', async () => {
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd' });
      await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-3', userAnswer: 'e', correctAnswer: 'f' });

      const weak = await service.recommendWeakNodes('user-1');
      expect(weak).toContain('node-1');
      expect(weak).not.toContain('node-2');
    });

    it('应支持 limit 参数', async () => {
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-1', userAnswer: 'a', correctAnswer: 'b' });
      await service.recordError('user-1', { nodeId: 'node-1', questionId: 'q-2', userAnswer: 'c', correctAnswer: 'd' });
      await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-3', userAnswer: 'e', correctAnswer: 'f' });
      await service.recordError('user-1', { nodeId: 'node-2', questionId: 'q-4', userAnswer: 'g', correctAnswer: 'h' });

      const weak = await service.recommendWeakNodes('user-1', 1);
      expect(weak).toHaveLength(1);
    });
  });

  // ═══ 7. 完整回顾流程验证 ═══

  describe('完整错题回顾流程', () => {
    it('答题失败 → 自动记录 → 回顾通过 → 不再出现在未回顾列表', async () => {
      // 1. 模拟答题失败
      const err = await service.recordError('user-1', {
        nodeId: 'node-1',
        questionId: 'quiz-1',
        questionContent: 'JS闭包是什么？',
        userAnswer: '函数中的函数',
        correctAnswer: '函数与其词法环境的组合',
        errorType: 'concept',
        sourceType: 'quiz',
        originalScore: 30,
      });

      // 2. 验证已记录且未回顾
      expect(err.reviewed).toBe(false);
      const unreviewed1 = await service.getUnreviewedErrors('user-1');
      expect(unreviewed1).toHaveLength(1);

      // 3. 用户回顾后标记通过
      const reviewed = await service.markReviewed(err.id, 'user-1', true);
      expect(reviewed.reviewed).toBe(true);
      expect(reviewed.reviewPassed).toBe(true);

      // 4. 不再出现在未回顾列表
      const unreviewed2 = await service.getUnreviewedErrors('user-1');
      expect(unreviewed2).toHaveLength(0);

      // 5. 统计中应有1条已通过回顾
      const stats = await service.getErrorStats('user-1');
      expect(stats.passedOnReview).toBe(1);
    });

    it('答题失败 → 自动记录 → 回顾未通过 → 重新练习 → 再次回顾通过', async () => {
      // 1. 答题失败
      const err = await service.recordError('user-1', {
        nodeId: 'node-1',
        questionId: 'quiz-2',
        userAnswer: 'wrong',
        correctAnswer: 'right',
        errorType: 'logic',
      });

      // 2. 首次回顾未通过
      await service.markReviewed(err.id, 'user-1', false);

      // 3. 重新练习 — 重置
      const reset = await service.resetForRePractice(err.id, 'user-1');
      expect(reset.reviewed).toBe(false);
      expect(reset.reviewPassed).toBeNull();

      // 4. 再次出现在未回顾列表
      const unreviewed = await service.getUnreviewedErrors('user-1');
      expect(unreviewed).toHaveLength(1);

      // 5. 再次回顾通过
      const reviewed = await service.markReviewed(err.id, 'user-1', true);
      expect(reviewed.reviewCount).toBe(2); // 两次回顾
      expect(reviewed.reviewPassed).toBe(true);
    });

    it('submitQuiz 自动记录错题（概念错误）', async () => {
      // 模拟 submitQuiz 中的自动记录逻辑
      const dto: CreateErrorReviewDto = {
        nodeId: 'node-closure',
        questionId: 'quiz-closure-1',
        questionContent: '什么是闭包？',
        userAnswer: '函数内部的函数',
        correctAnswer: '函数与其词法环境的组合',
        errorType: 'concept',
        explanation: '缺少词法环境概念',
        sourceType: 'quiz',
        originalScore: 30,
      };

      const result = await service.recordError('user-1', dto);
      expect(result.errorType).toBe('concept');
      expect(result.sourceType).toBe('quiz');
      expect(result.originalScore).toBe(30);
    });

    it('submitCoding 自动记录错题（逻辑/语法错误）', async () => {
      // 模拟 submitCoding 中的自动记录逻辑
      const dto: CreateErrorReviewDto = {
        nodeId: 'node-async',
        questionId: 'practice-node-async',
        questionContent: '编码练习：异步编程',
        userAnswer: 'async function test() { return await }',
        correctAnswer: 'async function test() { return await Promise.resolve(1); }',
        errorType: 'syntax',
        explanation: '缺少 Promise.resolve',
        sourceType: 'exercise',
        originalScore: 40,
      };

      const result = await service.recordError('user-1', dto);
      expect(result.errorType).toBe('syntax');
      expect(result.sourceType).toBe('exercise');
    });
  });
});
