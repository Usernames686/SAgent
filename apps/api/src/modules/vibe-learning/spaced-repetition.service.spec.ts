import { describe, it, expect } from 'vitest';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { scoreToQuality } from './spaced-repetition.service';

// ── 纯算法测试：不需要依赖注入，直接实例化 ──

describe('SpacedRepetitionService — SM-2 算法验证', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new SpacedRepetitionService(null as any);

  describe('scoreToQuality — 分数→质量映射', () => {
    it('95+ → 5 (完美回忆)', () => {
      expect(scoreToQuality(95)).toBe(5);
      expect(scoreToQuality(100)).toBe(5);
      expect(scoreToQuality(99)).toBe(5);
    });

    it('85-94 → 4 (轻松回忆)', () => {
      expect(scoreToQuality(85)).toBe(4);
      expect(scoreToQuality(90)).toBe(4);
      expect(scoreToQuality(94)).toBe(4);
    });

    it('70-84 → 3 (勉强回忆/通过)', () => {
      expect(scoreToQuality(70)).toBe(3);
      expect(scoreToQuality(75)).toBe(3);
      expect(scoreToQuality(84)).toBe(3);
    });

    it('50-69 → 2 (回忆困难)', () => {
      expect(scoreToQuality(50)).toBe(2);
      expect(scoreToQuality(60)).toBe(2);
    });

    it('30-49 → 1 (几乎忘记)', () => {
      expect(scoreToQuality(30)).toBe(1);
      expect(scoreToQuality(40)).toBe(1);
    });

    it('0-29 → 0 (完全忘记)', () => {
      expect(scoreToQuality(0)).toBe(0);
      expect(scoreToQuality(20)).toBe(0);
    });
  });

  describe('calculateNextReview — 核心 SM-2 算法', () => {
    it('首次通过 (q=3, interval=1) → 间隔跳到6天', () => {
      const result = service.calculateNextReview(3, 2.5, 1);
      expect(result.nextInterval).toBe(6);
      expect(result.reset).toBe(false);
      expect(result.nextEaseFactor).toBeGreaterThan(1.3);
    });

    it('完美回忆 (q=5) → 间隔大幅增长', () => {
      const result = service.calculateNextReview(5, 2.5, 6);
      expect(result.nextInterval).toBe(16); // 6 × (2.5+0.1) = 15.6 → round = 16
      expect(result.reset).toBe(false);
    });

    it('回忆失败 (q<3) → 间隔重置为1天', () => {
      const result = service.calculateNextReview(2, 2.5, 15);
      expect(result.nextInterval).toBe(1);
      expect(result.reset).toBe(true);
    });

    it('完全忘记 (q=0) → 间隔重置为1天', () => {
      const result = service.calculateNextReview(0, 2.5, 30);
      expect(result.nextInterval).toBe(1);
      expect(result.reset).toBe(true);
    });

    it('难度因子下限 1.3', () => {
      // 多次回忆失败后 EF 应不低于 1.3
      const result = service.calculateNextReview(0, 1.3, 1);
      expect(result.nextEaseFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('难度因子随低质量回忆降低', () => {
      const result = service.calculateNextReview(1, 2.5, 6);
      expect(result.nextEaseFactor).toBeLessThan(2.5);
    });

    it('难度因子随高质量回忆升高', () => {
      const result = service.calculateNextReview(5, 2.5, 6);
      expect(result.nextEaseFactor).toBeGreaterThan(2.5);
    });

    it('下次复习日期为未来', () => {
      const result = service.calculateNextReview(3, 2.5, 1);
      expect(result.nextReviewAt.getTime()).toBeGreaterThan(Date.now() - 86400000);
    });
  });

  describe('simulateSM2 — 模拟间隔增长曲线', () => {
    it('持续完美回忆 → 间隔指数增长', () => {
      const curve = service.simulateSM2([5, 5, 5, 5, 5]);
      // 间隔序列应该是递增的
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].interval).toBeGreaterThan(curve[i - 1].interval);
      }
    });

    it('中间一次失败 → 间隔重置后重新增长', () => {
      const curve = service.simulateSM2([5, 5, 1, 3, 5, 5]);
      // 第3次失败，间隔应重置为1
      expect(curve[2].interval).toBe(1);
      // 之后重新增长
      expect(curve[3].interval).toBe(6); // 重新通过的首次间隔
      expect(curve[4].interval).toBeGreaterThan(curve[3].interval);
    });

    it('全失败 → 间隔始终为1', () => {
      const curve = service.simulateSM2([0, 0, 0, 0]);
      for (const point of curve) {
        expect(point.interval).toBe(1);
      }
    });
  });

  describe('SM-2 典型学习路径验证', () => {
    it('新知识点 → 通过 → 复习增长路径', () => {
      // 模拟一个典型学习路径
      const curve = service.simulateSM2([3, 4, 4, 5, 5]); // 通过→轻松→轻松→完美→完美
      
      // 验证间隔递增
      expect(curve[0].interval).toBe(6);   // 首次通过: 1→6
      expect(curve[1].interval).toBeGreaterThan(6);  // 持续增长
      expect(curve[2].interval).toBeGreaterThan(curve[1].interval);
      expect(curve[3].interval).toBeGreaterThan(curve[2].interval);
      expect(curve[4].interval).toBeGreaterThan(curve[3].interval);
    });

    it('间隔增长应符合 SM-2 预期', () => {
      // 手动计算验证
      // q=3, EF=2.5, interval=1: EF'=2.5+(0.1-(5-3)*(0.08+(5-3)*0.02))=2.5+0.1-2*0.12=2.36, interval=6
      const r1 = service.calculateNextReview(3, 2.5, 1);
      expect(r1.nextInterval).toBe(6);
      expect(r1.nextEaseFactor).toBeCloseTo(2.36, 1);

      // q=4, EF=2.36, interval=6: EF'=2.36+(0.1-1*(0.08+0.02))=2.36+0=2.36, interval=round(6*2.36)=14
      const r2 = service.calculateNextReview(4, r1.nextEaseFactor, r1.nextInterval);
      expect(r2.nextInterval).toBe(14);
      expect(r2.nextEaseFactor).toBeCloseTo(2.36, 1);
    });
  });
});
