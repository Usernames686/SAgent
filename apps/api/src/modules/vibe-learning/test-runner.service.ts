// test-runner.service.ts
// Phase 3 Step 21: 单元测试运行器服务
// 在沙箱环境中模拟 vitest/jest 的 describe/it/expect 并运行测试

import { Injectable, Logger } from '@nestjs/common';
import { CodeSandboxService } from './code-sandbox.service';
import { TestRunResult, TestResultItem } from './types/exercise-checks';

@Injectable()
export class TestRunnerService {
  private readonly logger = new Logger(TestRunnerService.name);

  constructor(private readonly sandboxService: CodeSandboxService) {}

  /**
   * 运行单元测试
   * - 将学生代码和测试文件合并
   * - 在沙箱中模拟 describe/it/expect
   * - 返回通过/失败详情
   */
  async runTests(code: string, testFile: string, framework: 'vitest' | 'jest' = 'vitest'): Promise<TestRunResult> {
    const startTime = Date.now();

    // 构建测试运行器代码
    const testRunnerCode = this.buildTestRunnerCode(code, testFile);

    const result = await this.sandboxService.runCode(testRunnerCode);

    if (!result.success && !result.stdout) {
      // 沙箱执行完全失败（语法错误等）
      return {
        total: 0,
        passed: 0,
        failed: 0,
        results: [],
        executionTime: Date.now() - startTime,
      };
    }

    // 从 stdout 中解析测试结果
    const testResults = this.parseTestResults(result.stdout);

    return {
      total: testResults.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length,
      results: testResults,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 构建合并后的测试运行代码
   * 在沙箱中模拟 describe/it/expect API
   */
  private buildTestRunnerCode(studentCode: string, testFile: string): string {
    // 测试框架模拟层
    const testFrameworkMock = `
// === 测试框架模拟层 ===
const __testResults = [];
const __currentDescribe = '';

function describe(name, fn) {
  const prevDescribe = __currentDescribe;
  __currentDescribe = name;
  try { fn(); } catch (e) {
    __testResults.push({
      name: name + ' (suite error)',
      passed: false,
      error: e.message || String(e)
    });
  }
  __currentDescribe = prevDescribe;
}

function it(name, fn) {
  const fullName = __currentDescribe ? __currentDescribe + ' > ' + name : name;
  try {
    fn();
    __testResults.push({ name: fullName, passed: true });
  } catch (e) {
    __testResults.push({
      name: fullName,
      passed: false,
      error: e.message || String(e)
    });
  }
}

function test(name, fn) { it(name, fn); }

// expect 链式断言
function expect(received) {
  return {
    toBe(expected) {
      if (received !== expected) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but received ' + JSON.stringify(received));
      }
    },
    toEqual(expected) {
      const r = JSON.stringify(received);
      const e = JSON.stringify(expected);
      if (r !== e) {
        throw new Error('Expected ' + e + ' but received ' + r);
      }
    },
    toBeTruthy() {
      if (!received) {
        throw new Error('Expected value to be truthy but received ' + JSON.stringify(received));
      }
    },
    toBeFalsy() {
      if (received) {
        throw new Error('Expected value to be falsy but received ' + JSON.stringify(received));
      }
    },
    toContain(expected) {
      if (typeof received === 'string') {
        if (!received.includes(expected)) {
          throw new Error('Expected string to contain ' + JSON.stringify(expected));
        }
      } else if (Array.isArray(received)) {
        if (!received.includes(expected)) {
          throw new Error('Expected array to contain ' + JSON.stringify(expected));
        }
      } else {
        throw new Error('toContain only works with strings and arrays');
      }
    },
    toHaveLength(expected) {
      if (received.length !== expected) {
        throw new Error('Expected length ' + expected + ' but received ' + received.length);
      }
    },
    toThrow() {
      if (typeof received !== 'function') {
        throw new Error('toThrow only works with functions');
      }
      try {
        received();
        throw new Error('Expected function to throw but it did not');
      } catch (e) {
        if (e.message === 'Expected function to throw but it did not') throw e;
        // 函数确实抛出了异常，测试通过
      }
    },
    toBeGreaterThan(expected) {
      if (received <= expected) {
        throw new Error('Expected ' + received + ' to be greater than ' + expected);
      }
    },
    toBeLessThan(expected) {
      if (received >= expected) {
        throw new Error('Expected ' + received + ' to be less than ' + expected);
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(received - expected);
      const threshold = Math.pow(10, -precision) / 2;
      if (diff >= threshold) {
        throw new Error('Expected ' + received + ' to be close to ' + expected + ' (precision: ' + precision + ')');
      }
    },
    not: null // 简化：暂不实现 not 链
  };
}

// beforeEach / afterEach 简化实现
let __beforeEachFn = null;
let __afterEachFn = null;
function beforeEach(fn) { __beforeEachFn = fn; }
function afterEach(fn) { __afterEachFn = fn; }
`;

    // 输出结果收集代码
    const resultCollector = `
// === 输出测试结果 ===
console.log('__TEST_RESULTS_START__');
console.log(JSON.stringify(__testResults));
console.log('__TEST_RESULTS_END__');
`;

    return `
${testFrameworkMock}

// === 学生代码 ===
${studentCode}

// === 测试文件 ===
${testFile}

${resultCollector}
`;
  }

  /**
   * 从沙箱输出中解析测试结果
   */
  private parseTestResults(stdout: string): TestResultItem[] {
    try {
      const startMarker = '__TEST_RESULTS_START__';
      const endMarker = '__TEST_RESULTS_END__';
      const startIndex = stdout.indexOf(startMarker);
      const endIndex = stdout.indexOf(endMarker);

      if (startIndex === -1 || endIndex === -1) {
        this.logger.warn('Test result markers not found in output');
        return [];
      }

      const jsonStr = stdout.substring(startIndex + startMarker.length, endIndex).trim();
      const results = JSON.parse(jsonStr);

      if (!Array.isArray(results)) {
        this.logger.warn('Test results is not an array');
        return [];
      }

      return results.map((r: { name?: string; passed?: boolean; error?: string }) => ({
        testName: r.name || 'unnamed test',
        passed: r.passed ?? false,
        error: r.error,
      }));
    } catch (error) {
      this.logger.warn('Failed to parse test results: ' + (error as Error).message);
      return [];
    }
  }

  /**
   * 验证测试文件语法是否正确
   */
  async validateTestFile(testFile: string): Promise<{ valid: boolean; error?: string }> {
    const result = await this.sandboxService.runCode(`
      ${testFile}
      console.log('syntax ok');
    `);

    if (result.success) {
      return { valid: true };
    }
    return { valid: false, error: result.stderr };
  }
}
