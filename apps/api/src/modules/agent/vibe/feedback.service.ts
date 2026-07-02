// 实时反馈服务 — 8 种反馈机制

// ===== 反馈类型 =====
export type FeedbackType =
  | 'syntax_error'       // 语法错误
  | 'lint'               // Lint 提示
  | 'run_result'         // 运行结果
  | 'test_result'        // 测试结果
  | 'ai_analysis'        // AI 分析
  | 'smart_completion'   // 智能补全
  | 'vibe_match'         // 氛围匹配度
  | 'hallucination';     // 幻觉预警

// ===== 反馈条目 =====
export interface FeedbackItem {
  type: FeedbackType;
  severity: 'error' | 'warning' | 'info' | 'success';
  message: string;
  code?: string;             // 关联代码
  line?: number;             // 行号
  column?: number;           // 列号
  suggestion?: string;       // 修复建议
  timestamp: number;         // 毫秒时间戳
  latencyMs: number;         // 响应延迟
}

// ===== Lint 规则 =====
interface LintRule {
  id: string;
  pattern: RegExp;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
}

// 内置 Lint 规则
const LINT_RULES: LintRule[] = [
  { id: 'no-debugger', pattern: /debugger;?/, severity: 'error', message: '代码中包含 debugger 语句', suggestion: '移除 debugger 语句' },
  { id: 'no-console-log', pattern: /console\.(log|debug|info)\(/, severity: 'warning', message: '生产代码中不应保留 console.log', suggestion: '使用专门的日志库替代' },
  { id: 'no-var', pattern: /\bvar\s+/, severity: 'warning', message: '建议使用 const/let 替代 var', suggestion: '将 var 改为 const 或 let' },
  { id: 'max-line-length', pattern: /^.{121,}$/, severity: 'warning', message: '行过长（超过 120 字符）', suggestion: '将长行拆分为多行' },
  { id: 'no-empty-catch', pattern: /catch\s*\([^)]*\)\s*\{\s*\}/, severity: 'warning', message: '空的 catch 块会静默吞掉错误', suggestion: '至少记录错误日志' },
  { id: 'no-duplicate-keys', pattern: /(\w+):\s*[^,]+,\s*\n.*\1:/, severity: 'error', message: '对象中存在重复键', suggestion: '删除重复的键' },
  { id: 'no-hardcoded-url', pattern: /(https?:\/\/[^"')\s]+)/, severity: 'info', message: '发现硬编码的 URL', suggestion: '将 URL 移到配置文件' },
];

export class FeedbackService {
  /**
   * 语法错误检查
   */
  checkSyntax(code: string): FeedbackItem[] {
    const feedbacks: FeedbackItem[] = [];
    const lines = code.split('\n');

    // 检查基本的语法模式
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // 括号不匹配
      const openBrackets = (line.match(/\{/g) || []).length;
      const closeBrackets = (line.match(/\}/g) || []).length;
      if (openBrackets !== closeBrackets && line.includes('{') && line.includes('}')) {
        feedbacks.push({
          type: 'syntax_error',
          severity: 'error',
          message: `第 ${lineNum} 行大括号数量不匹配（开 ${openBrackets} 闭 ${closeBrackets}）`,
          line: lineNum,
          column: 1,
          timestamp: Date.now(),
          latencyMs: 0,
        });
      }

      // 字符串未闭合
      const stringMatches = line.match(/['"]/g);
      if (stringMatches && stringMatches.length % 2 !== 0 && !line.includes('//')) {
        feedbacks.push({
          type: 'syntax_error',
          severity: 'error',
          message: `第 ${lineNum} 行字符串引号未闭合`,
          line: lineNum,
          column: line.lastIndexOf(line.match(/['"]/)![0]) + 1,
          timestamp: Date.now(),
          latencyMs: 0,
        });
      }
    }

    return feedbacks;
  }

  /**
   * Lint 提示
   */
  lint(code: string): FeedbackItem[] {
    const feedbacks: FeedbackItem[] = [];
    const lines = code.split('\n');

    for (const rule of LINT_RULES) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(rule.pattern);
        if (match) {
          feedbacks.push({
            type: 'lint',
            severity: rule.severity,
            message: `${rule.message}（${rule.id}）`,
            line: i + 1,
            column: (match.index || 0) + 1,
            suggestion: rule.suggestion,
            timestamp: Date.now(),
            latencyMs: 0,
          });
        }
      }
    }

    return feedbacks;
  }

  /**
   * 代码智能补全建议
   */
  suggestCompletion(code: string, cursorLine: number, cursorColumn: number): FeedbackItem[] {
    const lines = code.split('\n');
    const currentLine = lines[cursorLine - 1] || '';
    const beforeCursor = currentLine.substring(0, cursorColumn - 1);

    const context = this.getContextWord(beforeCursor);
    if (!context) return [];

    const completions: Record<string, string[]> = {
      'use': ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback'],
      'import': ['import React from', 'import { useState } from', 'import { useEffect } from'],
      'func': ['function', 'function Component()', 'function App()'],
      'const': ['const [', 'const {', 'const '],
      'return': ['return (', 'return <>', 'return null'],
      'className': ['className="', 'className={`', 'className={'],
    };

    const matches = completions[context] || [];
    if (matches.length === 0) return [];

    return [{
      type: 'smart_completion',
      severity: 'info',
      message: `建议补全：${matches.slice(0, 3).join('、')}`,
      line: cursorLine,
      column: cursorColumn,
      suggestion: matches[0],
      timestamp: Date.now(),
      latencyMs: 50,
    }];
  }

  /**
   * 幻觉预警检查
   */
  detectHallucination(code: string): FeedbackItem[] {
    const feedbacks: FeedbackItem[] = [];
    const lines = code.split('\n');

    // 检查常见幻觉模式
    const hallucinationPatterns = [
      { pattern: /from\s+['"]\.\.\/[^'"]+(?!\.(ts|tsx|js|jsx))['"]/, message: '导入路径可能不正确（缺少文件扩展名）' },
      { pattern: /new\s+\w+\([^)]*\)\s*{\s*[^}]*\s*}/, message: '构造函数语法可能不正确' },
      { pattern: /\.map\([^)]*\)\s*;\s*$/, message: '.map() 的结果未使用，可能应为 React 渲染' },
      { pattern: /fetch\(['"][^'"]*['"]\)\s*\.then\(.*\)\s*;/, message: 'fetch 请求缺少错误处理（.catch）' },
    ];

    for (const hp of hallucinationPatterns) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(hp.pattern)) {
          feedbacks.push({
            type: 'hallucination',
            severity: 'warning',
            message: `⚠️ ${hp.message}`,
            line: i + 1,
            column: 1,
            suggestion: '请验证此代码的准确性',
            timestamp: Date.now(),
            latencyMs: 0,
          });
        }
      }
    }

    return feedbacks;
  }

  /**
   * 获取完整反馈（语法 + Lint + 幻觉预警）
   */
  getFullFeedback(code: string): FeedbackItem[] {
    return [
      ...this.checkSyntax(code),
      ...this.lint(code),
      ...this.detectHallucination(code),
    ];
  }

  /**
   * 获取光标前的上下文词
   */
  private getContextWord(text: string): string | null {
    const words = text.split(/[\s(){}[\]<>;=,.]/).filter(Boolean);
    return words[words.length - 1]?.toLowerCase() || null;
  }
}
