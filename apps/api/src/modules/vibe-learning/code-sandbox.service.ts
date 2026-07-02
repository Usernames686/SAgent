// code-sandbox.service.ts
// Phase 3 Step 20: 代码运行沙箱服务
// 安全方案：使用 Node.js vm 模块 + 严格上下文隔离
// 生产环境建议迁移到 isolated-vm 或 Docker 容器

import { Injectable, Logger } from '@nestjs/common';
import { RunResult } from './types/exercise-checks';

/** 沙箱安全配置 */
const SANDBOX_CONFIG = {
  memoryLimitMB: 128,
  timeoutMs: 5000,
  maxOutputLength: 10000,
  maxConsoleCalls: 100,
};

@Injectable()
export class CodeSandboxService {
  private readonly logger = new Logger(CodeSandboxService.name);

  /**
   * 在隔离环境中运行学生代码
   * 安全约束：
   * - 超时 5s
   * - 禁止 process/require/fs/net 访问
   * - 输出长度限制
   * - 返回 stdout + stderr
   */
  async runCode(code: string, input?: string): Promise<RunResult> {
    const startTime = Date.now();

    return new Promise<RunResult>((resolve) => {
      // 收集 console 输出
      const outputs: string[] = [];
      let consoleCallCount = 0;

      // 构建安全的 console 代理
      const safeConsole = {
        log: (...args: unknown[]) => {
          consoleCallCount++;
          if (consoleCallCount > SANDBOX_CONFIG.maxConsoleCalls) {
            throw new Error('Console output limit exceeded');
          }
          const line = args.map(a => {
            if (typeof a === 'object') {
              try { return JSON.stringify(a); } catch { return String(a); }
            }
            return String(a);
          }).join(' ');
          outputs.push(line);
        },
        error: (...args: unknown[]) => {
          consoleCallCount++;
          const line = args.map(a => String(a)).join(' ');
          outputs.push(`[ERROR] ${line}`);
        },
        warn: (...args: unknown[]) => {
          consoleCallCount++;
          const line = args.map(a => String(a)).join(' ');
          outputs.push(`[WARN] ${line}`);
        },
        info: (...args: unknown[]) => {
          consoleCallCount++;
          const line = args.map(a => String(a)).join(' ');
          outputs.push(line);
        },
      };

      // 构建安全的全局上下文
      const sandbox: Record<string, unknown> = {
        console: safeConsole,
        Math: Math,
        JSON: JSON,
        Date: Date,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        RegExp: RegExp,
        Map: Map,
        Set: Set,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
        encodeURIComponent: encodeURIComponent,
        decodeURIComponent: decodeURIComponent,
        encodeURI: encodeURI,
        decodeURI: decodeURI,
        Promise: Promise,
        Symbol: Symbol,
        Error: Error,
        TypeError: TypeError,
        RangeError: RangeError,
        // 安全的 setTimeout（受限）
        setTimeout: (fn: (...args: unknown[]) => void, ms: number) => {
          if (ms > 3000) throw new Error('setTimeout delay too long');
          return setTimeout(fn, ms);
        },
        clearTimeout: clearTimeout,
      };

      // 注入 stdin（如果提供）
      if (input) {
        sandbox.__stdin = input;
      }

      // 设置超时定时器
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          stdout: this.truncateOutput(outputs.join('\n')),
          stderr: 'Execution timed out after ' + SANDBOX_CONFIG.timeoutMs + 'ms',
          executionTime: SANDBOX_CONFIG.timeoutMs,
        });
      }, SANDBOX_CONFIG.timeoutMs);

      try {
        // 使用 vm 模块在受限上下文中执行
        const vm = require('vm');
        const context = vm.createContext(sandbox);

        // 包装代码：捕获最后表达式的值
        const wrappedCode = `
          "use strict";
          ${code}
        `;

        vm.runInContext(wrappedCode, context, {
          timeout: SANDBOX_CONFIG.timeoutMs,
          filename: 'sandbox.js',
        });

        clearTimeout(timeoutId);

        const stdout = this.truncateOutput(outputs.join('\n'));
        resolve({
          success: true,
          stdout,
          stderr: '',
          executionTime: Date.now() - startTime,
        });
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const err = error as Error;
        const stdout = this.truncateOutput(outputs.join('\n'));

        // 区分超时错误和其他错误
        const isTimeout = err.message?.includes('timed out') ||
          err.message?.includes('Script execution timed out');

        resolve({
          success: false,
          stdout,
          stderr: isTimeout
            ? 'Execution timed out after ' + SANDBOX_CONFIG.timeoutMs + 'ms'
            : err.message || 'Unknown execution error',
          executionTime: Date.now() - startTime,
        });
      }
    });
  }

  /**
   * 运行代码并捕获返回值（用于测试断言）
   */
  async runCodeWithReturn(code: string, input?: string): Promise<RunResult & { returnValue?: unknown }> {
    const startTime = Date.now();
    const outputs: string[] = [];

    const baseResult = await this.runCode(code, input);

    // 尝试提取返回值
    try {
      const vm = require('vm');
      const sandbox: Record<string, unknown> = {
        console: { log: (...args: unknown[]) => outputs.push(args.map(String).join(' ')) },
        Math, JSON, Date, Array, Object, String, Number, Boolean,
        RegExp, Map, Set, parseInt, parseFloat, isNaN, isFinite,
        Promise, Symbol, Error,
      };
      if (input) sandbox.__stdin = input;

      const context = vm.createContext(sandbox);
      const wrappedCode = `"use strict";\n(function() {\n${code}\n})()`;
      const returnValue = vm.runInContext(wrappedCode, context, {
        timeout: SANDBOX_CONFIG.timeoutMs,
        filename: 'sandbox-return.js',
      });

      return { ...baseResult, returnValue };
    } catch {
      return baseResult;
    }
  }

  /** 截断过长输出 */
  private truncateOutput(output: string): string {
    if (output.length <= SANDBOX_CONFIG.maxOutputLength) {
      return output;
    }
    return output.substring(0, SANDBOX_CONFIG.maxOutputLength) + '\n... [output truncated]';
  }

  /** 健康检查：验证沙箱安全性 */
  async healthCheck(): Promise<{ safe: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 测试1: 禁止访问 process
    try {
      const result = await this.runCode('const p = process; console.log(p.pid)');
      if (result.success && !result.stderr) {
        issues.push('process access not blocked');
      }
    } catch {
      // 预期行为
    }

    // 测试2: 禁止访问 require
    try {
      const result = await this.runCode('const fs = require("fs"); console.log("ok")');
      if (result.success && result.stdout.includes('ok')) {
        issues.push('require access not blocked');
      }
    } catch {
      // 预期行为
    }

    // 测试3: 超时终止
    try {
      const result = await this.runCode('while(true) {}');
      if (result.success) {
        issues.push('infinite loop not terminated');
      }
    } catch {
      // 预期行为
    }

    // 测试4: 正常代码可运行
    try {
      const result = await this.runCode('console.log("hello sandbox")');
      if (!result.success || !result.stdout.includes('hello sandbox')) {
        issues.push('normal code execution failed');
      }
    } catch {
      issues.push('normal code execution threw');
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }
}
