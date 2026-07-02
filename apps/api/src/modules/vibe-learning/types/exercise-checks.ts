// types/exercise-checks.ts
// Phase 3 Step 19: 4级验证体系类型定义

/** Level 1: 正则模式匹配（现有） */
export interface PatternCheck {
  type: 'pattern';
  pattern: string;  // 正则字符串（便于序列化）
  name: string;
  weight: number;
}

/** Level 2: 代码运行验证 */
export interface RuntimeCheck {
  type: 'runtime';
  testCases: Array<{
    input?: string;
    expectedOutput: string;
    description: string;
  }>;
  timeout: number; // ms
}

/** Level 3: 单元测试验证 */
export interface UnitTestCheck {
  type: 'unittest';
  testFile: string;    // Vitest 格式测试文件
  framework: 'vitest' | 'jest';
}

/** Level 4: AI 智能评审 */
export interface AIReviewCheck {
  type: 'ai_review';
  dimensions: Array<'correctness' | 'readability' | 'performance' | 'security' | 'best_practice'>;
  rubric: string;
}

/** 综合检查类型联合 */
export type ExerciseCheck = PatternCheck | RuntimeCheck | UnitTestCheck | AIReviewCheck;

/** 练习验证配置（附加在 exercise-data 中） */
export interface ExerciseCheckConfig {
  /** Level 1: 正则模式匹配列表 */
  patternChecks?: PatternCheck[];
  /** Level 2: 代码运行验证 */
  runtimeChecks?: RuntimeCheck;
  /** Level 3: 单元测试 */
  unitTests?: UnitTestCheck;
  /** Level 4: AI 评审 */
  aiReview?: AIReviewCheck;
}

/** 沙箱运行结果 */
export interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  executionTime: number; // ms
}

/** 单个测试结果 */
export interface TestResultItem {
  testName: string;
  passed: boolean;
  error?: string;
}

/** 测试运行结果 */
export interface TestRunResult {
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
  executionTime: number;
}

/** AI 评审报告 */
export interface AIReviewReport {
  scores: Record<string, number>;  // dimension → score (0-100)
  suggestions: string[];
  overallComment: string;
}

/** 综合评分结果 */
export interface ExerciseScore {
  level1Score: number;  // 0-100, 权重由难度决定
  level2Score: number;  // 0-100
  level3Score: number;  // 0-100
  level4Score: number;  // 0-100
  totalScore: number;   // 加权总分 0-100
  details: {
    patternResults: Array<{ name: string; passed: boolean; weight: number }>;
    runtimeResults: Array<{ description: string; passed: boolean; actual: string }>;
    testResults: Array<{ testName: string; passed: boolean; error?: string }>;
    aiReview?: AIReviewReport;
  };
  hintPenalty: number;  // 使用提示的扣分 (0-1, 乘以100)
  weights: [number, number, number, number]; // 使用的权重
}

/** 逐步提示配置 */
export interface HintConfig {
  hints: Array<{
    level: number;       // 1=轻微提示, 2=中等提示, 3=接近答案
    text: string;
    codeSnippet?: string; // 可选的代码片段
  }>;
  penaltyPerLevel: number; // 每级扣分 (0-1)
}

/** 代码提交请求 */
export interface CodeSubmitRequest {
  nodeId: string;
  code: string;
  hintsUsed: number;     // 已使用提示级别数
}

/** 代码提交响应 */
export interface CodeSubmitResponse {
  score: ExerciseScore;
  feedback: string;
  nextStep: 'retry' | 'pass' | 'perfect';
  hintAvailable: boolean;
}
