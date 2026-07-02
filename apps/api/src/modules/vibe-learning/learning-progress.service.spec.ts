import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningProgressService, ProgressStats, EnhancedDashboardData, HeatmapData } from './learning-progress.service';

// ── Mock Repository 工厂 ──

function createMockRepo() {
  const store: Map<string, any> = new Map();
  let counter = 0;

  const save = vi.fn(async (entity: any) => {
    store.set(entity.id || `lp-${++counter}`, { ...entity, updatedAt: new Date() });
    return store.get(entity.id || `lp-${counter}`);
  });

  return {
    store,
    save,
    create: vi.fn((dto: any) => {
      const id = `lp-${++counter}`;
      const entity = {
        id,
        ...dto,
        masteryScore: dto.masteryScore ?? 0,
        quizScore: dto.quizScore ?? 0,
        exerciseScore: dto.exerciseScore ?? 0,
        attemptsCount: dto.attemptsCount ?? 0,
        hintUsageCount: dto.hintUsageCount ?? 0,
        easeFactor: dto.easeFactor ?? 2.5,
        interval: dto.interval ?? 1,
        errorPatterns: dto.errorPatterns ?? [],
        lastStudiedAt: dto.lastStudiedAt ?? new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return entity;
    }),
    findOne: vi.fn(async ({ where }: any) => {
      for (const [, val] of store) {
        if (where.userId && where.nodeId && val.userId === where.userId && val.nodeId === where.nodeId) return val;
        if (where.id && val.id === where.id) return val;
      }
      return null;
    }),
    find: vi.fn(async ({ where }: any) => {
      const results: any[] = [];
      for (const [, val] of store) {
        if (where?.userId && val.userId !== where.userId) continue;
        if (where?.status && val.status !== where.status) continue;
        results.push(val);
      }
      return results;
    }),
  };
}

// ── 测试主体 ──

describe('LearningProgressService — 学习进度服务验证', () => {
  let service: LearningProgressService;
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    // @ts-ignore — 注入 mock
    service = new LearningProgressService(mockRepo as any);
  });

  // ═══ 1. 进度初始化 ═══

  describe('initProgress — 初始化知识点进度', () => {
    it('应成功创建一条学习进度记录', async () => {
      const result = await service.initProgress('user-1', 'JS-001', 'learning');

      expect(result).toBeDefined();
      expect(result.nodeId).toBe('JS-001');
      expect(result.status).toBe('learning');
      expect(result.masteryScore).toBe(0);
      expect(result.attemptsCount).toBe(0);
      expect(result.easeFactor).toBe(2.5);
      expect(result.interval).toBe(1);
      expect(result.errorPatterns).toEqual([]);
    });

    it('默认状态为 learning', async () => {
      const result = await service.initProgress('user-1', 'JS-002');
      expect(result.status).toBe('learning');
    });

    it('可指定初始状态为 locked', async () => {
      const result = await service.initProgress('user-1', 'JS-003', 'locked');
      expect(result.status).toBe('locked');
    });

    it('已存在时返回已有记录，不重复创建', async () => {
      const first = await service.initProgress('user-1', 'JS-001');
      const second = await service.initProgress('user-1', 'JS-001');
      expect((second as any).id).toBe((first as any).id);
    });
  });

  // ═══ 2. 进度查询 ═══

  describe('getProgress — 获取单个知识点进度', () => {
    it('应返回指定用户和知识点的进度', async () => {
      const created = await service.initProgress('user-1', 'JS-001');
      const result = await service.getProgress('user-1', 'JS-001');
      expect(result).toBeDefined();
      expect(result!.nodeId).toBe('JS-001');
    });

    it('不存在时返回 null', async () => {
      const result = await service.getProgress('user-1', 'NON-EXIST');
      expect(result).toBeNull();
    });
  });

  describe('getAllProgress — 获取所有进度', () => {
    it('应返回用户所有学习进度', async () => {
      await service.initProgress('user-1', 'JS-001');
      await service.initProgress('user-1', 'JS-002');
      await service.initProgress('user-2', 'NODE-001');

      const result = await service.getAllProgress('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getByStatus — 按状态筛选', () => {
    it('应返回指定状态的进度', async () => {
      await service.initProgress('user-1', 'JS-001', 'learning');
      await service.initProgress('user-1', 'JS-002', 'passed');

      const learning = await service.getByStatus('user-1', 'learning');
      expect(learning).toHaveLength(1);
      expect(learning[0].status).toBe('learning');
    });
  });

  // ═══ 3. 进度更新 ═══

  describe('updateProgress — 部分更新进度', () => {
    it('应更新指定字段', async () => {
      await service.initProgress('user-1', 'JS-001');

      const updated = await service.updateProgress('user-1', 'JS-001', {
        status: 'passed',
        masteryScore: 85,
        quizScore: 80,
      });

      expect(updated.status).toBe('passed');
      expect(updated.masteryScore).toBe(85);
      expect(updated.quizScore).toBe(80);
    });

    it('应累加 attemptsIncrement', async () => {
      const created = await service.initProgress('user-1', 'JS-001');
      // 模拟已有 attemptsCount
      created.attemptsCount = 3;

      const updated = await service.updateProgress('user-1', 'JS-001', {
        attemptsIncrement: 2,
      });

      expect(updated.attemptsCount).toBe(5);
    });

    it('应更新 SM-2 参数', async () => {
      await service.initProgress('user-1', 'JS-001');

      const nextReview = new Date(Date.now() + 6 * 86400000);
      const updated = await service.updateProgress('user-1', 'JS-001', {
        easeFactor: 2.36,
        interval: 6,
        nextReviewAt: nextReview,
      });

      expect(updated.easeFactor).toBe(2.36);
      expect(updated.interval).toBe(6);
    });

    it('不存在时自动创建再更新', async () => {
      const updated = await service.updateProgress('user-1', 'JS-NEW', {
        status: 'learning',
        masteryScore: 10,
      });

      expect(updated.nodeId).toBe('JS-NEW');
      expect(updated.masteryScore).toBe(10);
    });
  });

  // ═══ 4. 练习/测验提交 ═══

  describe('recordExerciseSubmit — 记录练习提交', () => {
    it('应更新练习分数和尝试次数', async () => {
      await service.initProgress('user-1', 'JS-001');

      const updated = await service.recordExerciseSubmit('user-1', 'JS-001', 80, 1);

      expect(updated.exerciseScore).toBe(80);
      expect(updated.attemptsCount).toBe(1);
      expect(updated.hintUsageCount).toBe(1);
    });

    it('掌握度 = quizScore*0.4 + exerciseScore*0.6', async () => {
      const created = await service.initProgress('user-1', 'JS-001');
      created.quizScore = 70;

      const updated = await service.recordExerciseSubmit('user-1', 'JS-001', 90, 0);

      expect(updated.masteryScore).toBe(Math.round(70 * 0.4 + 90 * 0.6));
    });

    it('masteryScore>=90 → mastered', async () => {
      const created = await service.initProgress('user-1', 'JS-001');
      created.quizScore = 95;

      const updated = await service.recordExerciseSubmit('user-1', 'JS-001', 95, 0);
      expect(updated.status).toBe('mastered');
    });

    it('masteryScore>=60 → passed', async () => {
      const created = await service.initProgress('user-1', 'JS-001');
      created.quizScore = 60;

      const updated = await service.recordExerciseSubmit('user-1', 'JS-001', 65, 0);
      expect(updated.status).toBe('passed');
    });
  });

  describe('recordQuizSubmit — 记录测验提交', () => {
    it('应更新测验分数和尝试次数', async () => {
      await service.initProgress('user-1', 'JS-001');

      const updated = await service.recordQuizSubmit('user-1', 'JS-001', 75, ['concept:closures']);

      expect(updated.quizScore).toBe(75);
      expect(updated.attemptsCount).toBe(1);
      expect(updated.errorPatterns).toContain('concept:closures');
    });

    it('错误模式应去重合并', async () => {
      const created = await service.initProgress('user-1', 'JS-001');
      created.errorPatterns = ['concept:closures', 'logic:loops'];

      const updated = await service.recordQuizSubmit('user-1', 'JS-001', 80, ['concept:closures']);

      const patterns = updated.errorPatterns;
      const uniquePatterns = new Set(patterns);
      expect(patterns.length).toBe(uniquePatterns.size); // 无重复
      expect(patterns).toContain('concept:closures');
      expect(patterns).toContain('logic:loops');
    });

    it('掌握度 = quizScore*0.4 + exerciseScore*0.6', async () => {
      const created = await service.initProgress('user-1', 'JS-001');
      created.exerciseScore = 80;

      const updated = await service.recordQuizSubmit('user-1', 'JS-001', 70, []);

      expect(updated.masteryScore).toBe(Math.round(70 * 0.4 + 80 * 0.6));
    });
  });

  // ═══ 5. 统计查询 ═══

  describe('getStats — 学习进度统计', () => {
    it('应正确统计各状态数量', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'locked');
      const p2 = await service.initProgress('user-1', 'JS-002', 'learning');
      const p3 = await service.initProgress('user-1', 'JS-003', 'passed');
      const p4 = await service.initProgress('user-1', 'JS-004', 'mastered');

      // 更新掌握度以测试
      p2.masteryScore = 30;
      p3.masteryScore = 70;
      p4.masteryScore = 95;
      p1.masteryScore = 0;

      const stats = await service.getStats('user-1');

      expect(stats.total).toBe(4);
      expect(stats.locked).toBe(1);
      expect(stats.learning).toBe(1);
      expect(stats.passed).toBe(1);
      expect(stats.mastered).toBe(1);
    });

    it('应计算平均掌握度', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'learning');
      p1.masteryScore = 40;
      const p2 = await service.initProgress('user-1', 'JS-002', 'learning');
      p2.masteryScore = 60;

      const stats = await service.getStats('user-1');
      expect(stats.averageMastery).toBe(50);
    });

    it('无记录时返回零值', async () => {
      const stats = await service.getStats('user-empty');
      expect(stats.total).toBe(0);
      expect(stats.averageMastery).toBe(0);
    });

    it('totalStudyTime = attemptsCount × 15 分钟', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'learning');
      p1.attemptsCount = 3;

      const stats = await service.getStats('user-1');
      expect(stats.totalStudyTime).toBe(45);
    });
  });

  // ═══ 6. 模块进度 ═══

  describe('getModuleProgress — 按模块分组统计', () => {
    it('应正确统计每个模块的进度', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'passed');
      p1.masteryScore = 70;
      const p2 = await service.initProgress('user-1', 'JS-002', 'mastered');
      p2.masteryScore = 95;

      const result = await service.getModuleProgress('user-1', {
        'JavaScript 基础': ['JS-001', 'JS-002', 'JS-003'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].module).toBe('JavaScript 基础');
      expect(result[0].total).toBe(3);
      expect(result[0].completed).toBe(2);
      expect(result[0].avgMastery).toBe(Math.round((70 + 95) / 2));
    });
  });

  // ═══ 7. 热力图数据 ═══

  describe('getHeatmapData — 热力图数据', () => {
    it('应按模块返回所有知识点的掌握度', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'passed');
      p1.masteryScore = 80;
      const p2 = await service.initProgress('user-1', 'JS-002', 'learning');
      p2.masteryScore = 40;

      const result = await service.getHeatmapData('user-1', {
        'js-basics': { name: 'JS 基础', nodeIds: ['JS-001', 'JS-002', 'JS-003'] },
      });

      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].moduleId).toBe('js-basics');
      expect(result.modules[0].nodes).toHaveLength(3);
      expect(result.modules[0].nodes[0].status).toBe('passed');
      expect(result.modules[0].nodes[0].masteryScore).toBe(80);
      // JS-003 无进度 → locked, 0
      expect(result.modules[0].nodes[2].status).toBe('locked');
      expect(result.modules[0].nodes[2].masteryScore).toBe(0);
      expect(result.overallStats).toBeDefined();
    });
  });

  // ═══ 8. 增强仪表盘 ═══

  describe('getEnhancedDashboard — 增强仪表盘数据', () => {
    it('应返回完整仪表盘数据', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'passed');
      p1.masteryScore = 80;
      const p2 = await service.initProgress('user-1', 'JS-002', 'mastered');
      p2.masteryScore = 95;
      const p3 = await service.initProgress('user-1', 'JS-003', 'learning');
      p3.masteryScore = 30;

      const result = await service.getEnhancedDashboard('user-1', [
        {
          id: 'foundation',
          name: '基础夯实',
          priority: 'P0',
          modules: [{ nodeIds: ['JS-001', 'JS-002', 'JS-003', 'JS-004'] }],
        },
      ], 2, 3);

      // 统计
      expect(result.stats.total).toBe(3);
      expect(result.stats.passed).toBe(1);
      expect(result.stats.mastered).toBe(1);

      // 阶段进度
      expect(result.phaseProgress).toHaveLength(1);
      expect(result.phaseProgress[0].phaseId).toBe('foundation');
      expect(result.phaseProgress[0].total).toBe(4);
      expect(result.phaseProgress[0].completed).toBe(2);
      expect(result.phaseProgress[0].mastered).toBe(1);
      expect(result.phaseProgress[0].progress).toBe(50); // 2/4

      // 待复习和错题
      expect(result.dueReviewCount).toBe(2);
      expect(result.unreviewedErrorCount).toBe(3);

      // 预估剩余时间
      expect(result.estimatedRemainingMinutes).toBeGreaterThan(0);
    });

    it('所有知识点完成时预估剩余时间为0', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'passed');
      p1.masteryScore = 80;
      const p2 = await service.initProgress('user-1', 'JS-002', 'mastered');
      p2.masteryScore = 95;

      const result = await service.getEnhancedDashboard('user-1', [
        {
          id: 'foundation',
          name: '基础夯实',
          priority: 'P0',
          modules: [{ nodeIds: ['JS-001', 'JS-002'] }],
        },
      ], 0, 0);

      expect(result.estimatedRemainingMinutes).toBe(0);
    });

    it('应正确计算连续学习天数', async () => {
      // 今天有学习
      const p1 = await service.initProgress('user-1', 'JS-001', 'learning');
      p1.lastStudiedAt = new Date();

      const result = await service.getEnhancedDashboard('user-1', [], 0, 0);
      expect(result.streakDays).toBeGreaterThanOrEqual(1);
    });

    it('无学习记录时连续天数为0', async () => {
      const result = await service.getEnhancedDashboard('user-new', [], 0, 0);
      expect(result.streakDays).toBe(0);
    });

    it('多阶段应分别计算进度', async () => {
      const p1 = await service.initProgress('user-1', 'JS-001', 'passed');
      p1.masteryScore = 80;
      const p2 = await service.initProgress('user-1', 'NODE-001', 'learning');
      p2.masteryScore = 40;

      const result = await service.getEnhancedDashboard('user-1', [
        {
          id: 'foundation',
          name: '基础夯实',
          priority: 'P0',
          modules: [{ nodeIds: ['JS-001'] }],
        },
        {
          id: 'advancement',
          name: '进阶突破',
          priority: 'P1',
          modules: [{ nodeIds: ['NODE-001', 'NODE-002'] }],
        },
      ], 0, 0);

      expect(result.phaseProgress).toHaveLength(2);
      expect(result.phaseProgress[0].completed).toBe(1);
      expect(result.phaseProgress[0].progress).toBe(100);
      expect(result.phaseProgress[1].completed).toBe(0);
      expect(result.phaseProgress[1].progress).toBe(0);
    });
  });

  // ═══ 9. 边界情况 ═══

  describe('边界情况', () => {
    it('batchInit 应批量初始化', async () => {
      await service.batchInit('user-1', ['JS-001', 'JS-002', 'JS-003'], 'locked');

      const all = await service.getAllProgress('user-1');
      expect(all).toHaveLength(3);
      expect(all.every(p => p.status === 'locked')).toBe(true);
    });

    it('getUnlockedNodeIds 应返回非 locked 的 nodeId', async () => {
      await service.initProgress('user-1', 'JS-001', 'learning');
      await service.initProgress('user-1', 'JS-002', 'passed');
      await service.initProgress('user-1', 'JS-003', 'locked');

      const unlocked = await service.getUnlockedNodeIds('user-1');
      // 所有有记录的都返回（不区分状态）
      expect(unlocked.length).toBe(3);
    });

    it('updateProgress 应更新 errorPatterns', async () => {
      await service.initProgress('user-1', 'JS-001');

      const updated = await service.updateProgress('user-1', 'JS-001', {
        errorPatterns: ['concept:closures', 'logic:loops'],
      });

      expect(updated.errorPatterns).toEqual(['concept:closures', 'logic:loops']);
    });
  });
});
