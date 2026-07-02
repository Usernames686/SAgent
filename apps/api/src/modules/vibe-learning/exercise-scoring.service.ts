// exercise-scoring.service.ts
// Phase 3 Step 23: 4级验证评分算法
// Level 1: 正则模式匹配 → Level 2: 代码运行 → Level 3: 单元测试 → Level 4: AI 评审
// 权重按难度自适应：初级偏重 L1/L2，高级偏重 L3/L4

import { Injectable, Logger } from '@nestjs/common';
import { CodeSandboxService } from './code-sandbox.service';
import { TestRunnerService } from './test-runner.service';
import { AiReviewEngine } from './ai-review.engine';
import { getExerciseData } from './exercise-data';
import {
  ExerciseScore,
  ExerciseCheckConfig,
  AIReviewReport,
} from './types/exercise-checks';

/** 难度级别 */
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** 难度对应的4级权重 [L1, L2, L3, L4] */
const DIFFICULTY_WEIGHTS: Record<Difficulty, [number, number, number, number]> = {
  beginner:     [0.4, 0.35, 0.15, 0.1],   // 初级：重模式匹配和运行
  intermediate: [0.25, 0.3, 0.25, 0.2],    // 中级：均匀分布
  advanced:     [0.1, 0.2, 0.35, 0.35],    // 高级：重测试和 AI 评审
};

/** 根据 nodeId 前缀推断难度 */
function inferDifficulty(nodeId: string): Difficulty {
  const prefix = nodeId.split('-')[0].toUpperCase();
  const beginnerPrefixes = ['JS', 'HTML', 'CSS'];
  const advancedPrefixes = ['NODE', 'PROJ', 'ENG', 'AI'];
  if (beginnerPrefixes.includes(prefix)) return 'beginner';
  if (advancedPrefixes.includes(prefix)) return 'advanced';
  return 'intermediate';
}

@Injectable()
export class ExerciseScoringService {
  private readonly logger = new Logger(ExerciseScoringService.name);

  constructor(
    private readonly sandboxService: CodeSandboxService,
    private readonly testRunnerService: TestRunnerService,
    private readonly aiReviewEngine: AiReviewEngine,
  ) {}

  /**
   * 对学生代码执行4级验证评分
   * @param nodeId 知识点 ID
   * @param code 学生提交的代码
   * @param hintsUsed 已使用的提示级别数
   */
  async scoreExercise(
    nodeId: string,
    code: string,
    hintsUsed: number = 0,
  ): Promise<ExerciseScore> {
    const exDef = getExerciseData({ nodeId } as any);
    const difficulty = inferDifficulty(nodeId);
    const weights = DIFFICULTY_WEIGHTS[difficulty];

    // 计算提示扣分
    const hintPenalty = Math.min(hintsUsed * 0.1, 0.5); // 最多扣 50%

    // ===== Level 1: 正则模式匹配 =====
    const patternResults = exDef.checks.map(check => ({
      name: check.name,
      passed: check.pattern.test(code),
      weight: check.weight,
    }));
    const l1TotalWeight = patternResults.reduce((s, r) => s + r.weight, 0);
    const l1PassedWeight = patternResults
      .filter(r => r.passed)
      .reduce((s, r) => s + r.weight, 0);
    const level1Score = l1TotalWeight > 0
      ? Math.round((l1PassedWeight / l1TotalWeight) * 100)
      : 0;

    // ===== Level 2: 代码运行验证 =====
    let level2Score = 0;
    const runtimeResults: Array<{ description: string; passed: boolean; actual: string }> = [];

    if (exDef.runtimeChecks?.testCases?.length) {
      const runResult = await this.sandboxService.runCode(code);

      if (runResult.success) {
        for (const tc of exDef.runtimeChecks.testCases) {
          const passed = runResult.stdout.includes(tc.expectedOutput);
          runtimeResults.push({
            description: tc.description,
            passed,
            actual: passed ? tc.expectedOutput : runResult.stdout.substring(0, 200),
          });
        }
        const passedCount = runtimeResults.filter(r => r.passed).length;
        level2Score = Math.round((passedCount / runtimeResults.length) * 100);
      } else {
        // 运行失败，所有测试用例标记为失败
        for (const tc of exDef.runtimeChecks.testCases) {
          runtimeResults.push({
            description: tc.description,
            passed: false,
            actual: runResult.stderr.substring(0, 200),
          });
        }
        level2Score = 0;
      }
    } else {
      // 没有运行测试，L2 权重转移到 L1
      weights[0] += weights[1];
      weights[1] = 0;
      level2Score = 100; // 无测试默认满分（权重为0不影响总分）
    }

    // ===== Level 3: 单元测试 =====
    let level3Score = 0;
    const testResults: Array<{ testName: string; passed: boolean; error?: string }> = [];

    // 当前 exercise-data 中没有 unitTests 字段，暂时跳过
    // 未来可通过 ExerciseCheckConfig 扩展
    const hasUnitTests = false; // TODO: 从扩展配置中获取

    if (hasUnitTests) {
      // const testRun = await this.testRunnerService.runTests(code, testFile, framework);
      // testResults = testRun.results.map(r => ({ testName: r.testName, passed: r.passed, error: r.error }));
      // level3Score = testRun.total > 0 ? Math.round((testRun.passed / testRun.total) * 100) : 0;
      level3Score = 0;
    } else {
      // 没有单元测试，L3 权重按比例分配给 L1 和 L2
      const redistribute = weights[2];
      weights[0] += redistribute * (weights[0] / (weights[0] + weights[1] || 1));
      weights[1] += redistribute * (weights[1] / (weights[0] + weights[1] || 1));
      weights[2] = 0;
      level3Score = 100; // 无测试默认满分
    }

    // ===== Level 4: AI 评审 =====
    let level4Score = 0;
    let aiReview: AIReviewReport | undefined;

    // AI 评审仅在有参考答案且代码至少通过 L1 时触发
    const shouldRunAIReview = exDef.reference && level1Score >= 30;

    if (shouldRunAIReview) {
      try {
        aiReview = await this.aiReviewEngine.review(
          code,
          {
            type: 'ai_review',
            dimensions: ['correctness', 'readability', 'best_practice'],
            rubric: '',
          },
          {
            title: nodeId,
            reference: exDef.reference,
          },
        );
        // AI 评审得分 = 各维度平均分
        const scores = Object.values(aiReview.scores);
        level4Score = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 50;
      } catch (error) {
        this.logger.warn('AI review failed for ' + nodeId + ': ' + (error as Error).message);
        level4Score = 50; // 降级分数
      }
    } else {
      // 无需 AI 评审，L4 权重分配给其他级别
      const redistribute = weights[3];
      const totalRemaining = weights[0] + weights[1] + weights[2] || 1;
      weights[0] += redistribute * (weights[0] / totalRemaining);
      weights[1] += redistribute * (weights[1] / totalRemaining);
      weights[2] += redistribute * (weights[2] / totalRemaining);
      weights[3] = 0;
      level4Score = 100; // 无评审默认满分
    }

    // ===== 计算加权总分 =====
    const rawTotal =
      level1Score * weights[0] +
      level2Score * weights[1] +
      level3Score * weights[2] +
      level4Score * weights[3];

    // 应用提示扣分
    const totalScore = Math.round(rawTotal * (1 - hintPenalty));

    // ===== 生成反馈 =====
    return {
      level1Score,
      level2Score,
      level3Score,
      level4Score,
      totalScore: Math.max(0, Math.min(100, totalScore)),
      details: {
        patternResults,
        runtimeResults,
        testResults,
        aiReview,
      },
      hintPenalty,
      weights,
    };
  }

  /**
   * 获取练习的逐步提示
   * @param nodeId 知识点 ID
   * @param currentLevel 当前已使用的提示级别 (0=未使用)
   */
  getHint(nodeId: string, currentLevel: number = 0): {
    hint: string | null;
    codeSnippet?: string;
    nextLevel: number;
    penalty: number;
  } {
    const exDef = getExerciseData({ nodeId } as any);
    if (!exDef.hints?.length) {
      return { hint: null, nextLevel: currentLevel, penalty: 0 };
    }

    // 返回下一个级别的提示
    const nextLevel = currentLevel + 1;
    const hintItem = exDef.hints.find(h => h.level === nextLevel);

    if (!hintItem) {
      return { hint: null, nextLevel: currentLevel, penalty: 0 };
    }

    return {
      hint: hintItem.content,
      codeSnippet: undefined, // exercise-data 中的 hints 没有 codeSnippet 字段
      nextLevel,
      penalty: hintItem.penalty,
    };
  }

  /**
   * 根据评分结果判断下一步建议
   */
  getNextStepAdvice(score: ExerciseScore): 'retry' | 'pass' | 'perfect' {
    if (score.totalScore >= 90) return 'perfect';
    if (score.totalScore >= 60) return 'pass';
    return 'retry';
  }
}
