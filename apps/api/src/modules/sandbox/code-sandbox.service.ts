// 代码执行沙箱服务
// 支持多语言代码在隔离环境中安全执行
// 开发模式：child_process 执行（仅 JS/TS）
// 生产模式：Docker 容器隔离执行

import { Injectable, Logger } from '@nestjs/common';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuid } from 'uuid';

// ===== 执行结果 =====
export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  memoryKb: number;
}

// ===== 执行请求 =====
export interface SandboxRequest {
  code: string;
  language: string;
  input?: string;
  timeoutMs?: number;
  maxMemoryKb?: number;
}

// ===== 沙箱配置 =====
export interface SandboxConfig {
  mode: 'docker' | 'child_process' | 'auto';
  dockerImage: string;
  defaultTimeoutMs: number;
  defaultMaxMemoryKb: number;
  tempDir: string;
}

// ===== 支持的语言运行时 =====
interface LanguageRuntime {
  image: string;
  extension: string;
  compileCmd?: string;
  runCmd: string;
  filename: string;
}

const LANGUAGE_RUNTIMES: Record<string, LanguageRuntime> = {
  javascript: {
    image: 'node:18-alpine',
    extension: '.js',
    runCmd: 'node',
    filename: 'script.js',
  },
  typescript: {
    image: 'node:18-alpine',
    extension: '.ts',
    runCmd: 'npx tsx',
    filename: 'script.ts',
  },
  python: {
    image: 'python:3.11-alpine',
    extension: '.py',
    runCmd: 'python',
    filename: 'script.py',
  },
  java: {
    image: 'openjdk:17-slim',
    extension: '.java',
    compileCmd: 'javac',
    runCmd: 'java',
    filename: 'Main.java',
  },
  go: {
    image: 'golang:1.21-alpine',
    extension: '.go',
    runCmd: 'go run',
    filename: 'main.go',
  },
  rust: {
    image: 'rust:1.75-slim',
    extension: '.rs',
    compileCmd: 'rustc',
    runCmd: './script',
    filename: 'script.rs',
  },
  cpp: {
    image: 'gcc:12-bookworm',
    extension: '.cpp',
    compileCmd: 'g++ -o /tmp/script',
    runCmd: '/tmp/script',
    filename: 'script.cpp',
  },
  sql: {
    image: 'nouchka/sqlite3:latest',
    extension: '.sql',
    runCmd: 'sqlite3 :memory:',
    filename: 'script.sql',
  },
  bash: {
    image: 'alpine:latest',
    extension: '.sh',
    runCmd: 'sh',
    filename: 'script.sh',
  },
};

@Injectable()
export class CodeSandboxService {
  private readonly logger = new Logger(CodeSandboxService.name);
  private config: SandboxConfig;

  constructor() {
    this.config = {
      mode: (process.env.SANDBOX_MODE as SandboxConfig['mode']) || 'auto',
      dockerImage: process.env.SANDBOX_DOCKER_IMAGE || 'node:18-alpine',
      defaultTimeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS || '10000', 10),
      defaultMaxMemoryKb: parseInt(process.env.SANDBOX_MAX_MEMORY_KB || '262144', 10), // 256MB
      tempDir: process.env.SANDBOX_TEMP_DIR || path.join(os.tmpdir(), 'sagent-sandbox'),
    };

    // 确保临时目录存在
    if (!fs.existsSync(this.config.tempDir)) {
      fs.mkdirSync(this.config.tempDir, { recursive: true });
    }
  }

  /**
   * 执行用户代码
   */
  async execute(request: SandboxRequest): Promise<SandboxResult> {
    const runtime = this.getRuntime(request.language);
    const timeoutMs = request.timeoutMs || this.config.defaultTimeoutMs;
    const startTime = Date.now();

    const mode = this.resolveMode();

    if (mode === 'docker') {
      return this.executeInDocker(request, runtime, timeoutMs, startTime);
    }

    // Child process 模式（仅适用 JS/TS/Node 生态）
    return this.executeInChildProcess(request, runtime, timeoutMs, startTime);
  }

  /**
   * 获取运行时配置
   */
  private getRuntime(language: string): LanguageRuntime {
    const runtime = LANGUAGE_RUNTIMES[language];
    if (!runtime) {
      // 默认使用 JavaScript 运行时
      this.logger.warn(`不支持的编程语言: ${language}，回退到 JavaScript`);
      return LANGUAGE_RUNTIMES.javascript;
    }
    return runtime;
  }

  /**
   * 解析执行模式
   */
  private resolveMode(): 'docker' | 'child_process' {
    if (this.config.mode === 'docker') return 'docker';
    if (this.config.mode === 'child_process') return 'child_process';

    // auto 模式：优先 Docker，不可用时退 child_process
    try {
      execSync('docker info', { stdio: 'ignore', timeout: 3000 });
      return 'docker';
    } catch {
      this.logger.warn('Docker 不可用，回退到 child_process 执行模式（仅支持 JS/TS）');
      return 'child_process';
    }
  }

  /**
   * 在 Docker 容器中执行代码
   */
  private async executeInDocker(
    request: SandboxRequest,
    runtime: LanguageRuntime,
    timeoutMs: number,
    startTime: number,
  ): Promise<SandboxResult> {
    const jobId = uuid().substring(0, 8);
    const workDir = path.join(this.config.tempDir, jobId);
    const startTimeMs = Date.now();

    try {
      // 创建临时工作目录
      fs.mkdirSync(workDir, { recursive: true });

      // 写入源代码文件
      const sourceFile = path.join(workDir, runtime.filename);
      fs.writeFileSync(sourceFile, request.code, 'utf-8');

      // 写入输入文件（如果有）
      let inputFile = '';
      if (request.input) {
        inputFile = path.join(workDir, 'input.txt');
        fs.writeFileSync(inputFile, request.input, 'utf-8');
      }

      const containerName = `sagent-sandbox-${jobId}`;
      const imageName = runtime.image;

      // 构建 Docker 运行命令
      let cmd: string;
      const memoryLimitKb = request.maxMemoryKb || this.config.defaultMaxMemoryKb;

      if (runtime.compileCmd) {
        // 需要编译的语言（Java, Rust, C++）
        const compileStep = `${runtime.compileCmd} /work/${runtime.filename}`;
        const runStep = `${runtime.runCmd}`;
        const fullCmd = inputFile
          ? `${compileStep} && ${runStep} < /work/input.txt`
          : `${compileStep} && ${runStep}`;

        cmd = `docker run --rm --name ${containerName} ` +
          `--memory=${memoryLimitKb}k --memory-swap=${memoryLimitKb}k ` +
          `--cpus=1 --network=none ` +
          `--pids-limit=50 --read-only ` +
          `-v "${workDir}:/work:ro" -w /work ` +
          `${imageName} sh -c "${fullCmd}"`;
      } else {
        // 解释型语言（JS, Python, Go, Bash）
        const fullCmd = inputFile
          ? `${runtime.runCmd} /work/${runtime.filename} < /work/input.txt`
          : `${runtime.runCmd} /work/${runtime.filename}`;

        cmd = `docker run --rm --name ${containerName} ` +
          `--memory=${memoryLimitKb}k --memory-swap=${memoryLimitKb}k ` +
          `--cpus=1 --network=none ` +
          `--pids-limit=50 --read-only ` +
          `-v "${workDir}:/work:ro" -w /work ` +
          `${imageName} sh -c "${fullCmd}"`;
      }

      // 执行（带超时）
      const output = execSync(cmd, {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024, // 1MB
        windowsHide: true,
        stdio: 'pipe',
      });

      const durationMs = Date.now() - startTimeMs;

      return {
        success: true,
        stdout: output.toString() || '',
        stderr: '',
        exitCode: 0,
        durationMs,
        timedOut: false,
        memoryKb: 0, // 无法精确获取
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startTimeMs;
      const execError = error as {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
        killed?: boolean;
        signal?: string;
        status?: number;
        message?: string;
      };

      const isTimeout = execError.killed || execError.signal === 'SIGTERM';

      return {
        success: false,
        stdout: (execError.stdout?.toString() || ''),
        stderr: (execError.stderr?.toString() || execError.message || ''),
        exitCode: execError.status ?? -1,
        durationMs,
        timedOut: isTimeout,
        memoryKb: 0,
      };
    } finally {
      // 清理临时文件
      this.cleanupDir(workDir);
    }
  }

  /**
   * 在子进程中执行代码（开发模式，仅支持 JS/TS）
   */
  private async executeInChildProcess(
    request: SandboxRequest,
    runtime: LanguageRuntime,
    timeoutMs: number,
    startTime: number,
  ): Promise<SandboxResult> {
    const jobId = uuid().substring(0, 8);
    const workDir = path.join(this.config.tempDir, jobId);

    try {
      // 创建临时工作目录
      fs.mkdirSync(workDir, { recursive: true });

      // 写入源代码
      const sourceFile = path.join(workDir, runtime.filename);
      fs.writeFileSync(sourceFile, request.code, 'utf-8');

      // 返回一个 Promise 包装的子进程执行
      return await new Promise<SandboxResult>((resolve) => {
        const childProcess = spawn(runtime.runCmd, [sourceFile], {
          cwd: workDir,
          timeout: timeoutMs,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'sandbox' },
          windowsHide: true,
        }) as import('child_process').ChildProcess & {
          stdin: import('stream').Writable;
          stdout: import('stream').Readable;
          stderr: import('stream').Readable;
        };

        let stdout = '';
        let stderr = '';
        let isResolved = false;

        // 写入标准输入
        if (request.input) {
          childProcess.stdin.write(request.input);
          childProcess.stdin.end();
        } else {
          childProcess.stdin.end();
        }

        childProcess.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        childProcess.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        // 超时处理
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            childProcess.kill('SIGTERM');
            resolve({
              success: false,
              stdout,
              stderr: stderr + '\n[超时] 代码执行超过限制时间',
              exitCode: null,
              durationMs: Date.now() - startTime,
              timedOut: true,
              memoryKb: 0,
            });
          }
        }, timeoutMs);

        childProcess.on('close', (code: number | null) => {
          clearTimeout(timeoutId);
          if (!isResolved) {
            isResolved = true;
            // 尝试读取内存使用（非精确）
            let memoryKb = 0;
            try {
              const usage = process.memoryUsage();
              memoryKb = Math.round(usage.rss / 1024);
            } catch {}

            resolve({
              success: code === 0,
              stdout,
              stderr,
              exitCode: code,
              durationMs: Date.now() - startTime,
              timedOut: false,
              memoryKb,
            });
          }
        });

        childProcess.on('error', (err: Error) => {
          clearTimeout(timeoutId);
          if (!isResolved) {
            isResolved = true;
            resolve({
              success: false,
              stdout,
              stderr: stderr + `\n[错误] ${err.message}`,
              exitCode: -1,
              durationMs: Date.now() - startTime,
              timedOut: false,
              memoryKb: 0,
            });
          }
        });
      });
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        stdout: '',
        stderr: (error as Error).message,
        exitCode: -1,
        durationMs,
        timedOut: false,
        memoryKb: 0,
      };
    } finally {
      // 清理临时文件
      this.cleanupDir(workDir);
    }
  }

  /**
   * 检查语言是否支持
   */
  isLanguageSupported(language: string): boolean {
    return language in LANGUAGE_RUNTIMES;
  }

  /**
   * 获取所有支持的语言
   */
  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_RUNTIMES);
  }

  /**
   * 清理临时目录
   */
  private cleanupDir(dir: string): void {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    docker: boolean;
    supportedLanguages: string[];
    mode: string;
  }> {
    let dockerAvailable = false;
    try {
      execSync('docker info', { stdio: 'ignore', timeout: 3000 });
      dockerAvailable = true;
    } catch {}

    return {
      docker: dockerAvailable,
      supportedLanguages: this.getSupportedLanguages(),
      mode: this.resolveMode(),
    };
  }
}
