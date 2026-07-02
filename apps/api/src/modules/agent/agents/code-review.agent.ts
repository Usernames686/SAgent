import { LlmGateway } from '../llm/llm.gateway';

// 代码问题
export interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  rule?: string;
  suggestion?: string;
}

// 审查报告
export interface ReviewReport {
  summary: string;
  overallScore: number;
  issues: CodeIssue[];
  metrics: {
    totalLines: number;
    complexity: 'low' | 'medium' | 'high';
    maintainability: number;  // 0-100
    security: number;         // 0-100
    performance: number;      // 0-100
  };
  suggestions: string[];
  bestPractices: string[];
}

export class CodeReviewAgent {
  constructor(private readonly llm: LlmGateway) {}

  /**
   * 对代码进行全面审查
   */
  async review(code: string, language: string, context?: string): Promise<ReviewReport> {
    // 1. 静态规则检查
    const staticIssues = this.staticAnalysis(code, language);

    // 2. LLM 深度审查
    const llmReview = await this.llmReview(code, language, context);

    // 3. 合并结果
    return this.mergeResults(staticIssues, llmReview, code);
  }

  /**
   * 静态规则分析（不依赖 LLM）
   */
  private staticAnalysis(code: string, language: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];

      // 检查过长的行
      if (line.length > 120) {
        issues.push({
          severity: 'warning',
          line: lineNum,
          column: 80,
          message: '行过长（超过 120 字符），建议换行',
          rule: 'max-line-length',
          suggestion: '将长行拆分为多行以提高可读性',
        });
      }

      // 检查 TODO/FIXME
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
        issues.push({
          severity: 'info',
          line: lineNum,
          column: line.indexOf('TODO') + 1,
          message: `存在待办标记: ${line.trim()}`,
          rule: 'no-todo',
        });
      }

      // 检查 console.log（非 Node.js）
      if (language !== 'javascript' && line.includes('console.log')) {
        issues.push({
          severity: 'warning',
          line: lineNum,
          column: line.indexOf('console.log') + 1,
          message: '调试日志（console.log）不应出现在生产代码中',
          rule: 'no-console',
          suggestion: '使用专门的日志库替换 console.log',
        });
      }

      // 检查空 catch 块
      if (line.includes('catch') && lines[i + 1]?.trim() === '{}') {
        issues.push({
          severity: 'error',
          line: lineNum,
          column: 1,
          message: '空的 catch 块会静默吞掉错误',
          rule: 'no-empty-catch',
          suggestion: '至少记录错误日志或重新抛出',
        });
      }

      // 检查硬编码的敏感信息
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/i,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
        /secret\s*[:=]\s*['"][^'"]+['"]/i,
        /token\s*[:=]\s*['"][^'"]+['"]/i,
      ];
      for (const pattern of secretPatterns) {
        const match = line.match(pattern);
        if (match) {
          issues.push({
            severity: 'error',
            line: lineNum,
            column: line.indexOf(match[0]) + 1,
            message: `可能包含敏感信息: ${match[0].substring(0, 30)}...`,
            rule: 'no-hardcoded-secrets',
            suggestion: '将敏感信息移到环境变量中',
          });
        }
      }
    }

    return issues;
  }

  /**
   * LLM 深度代码审查
   */
  private async llmReview(code: string, language: string, context?: string): Promise<{
    issues: CodeIssue[];
    suggestions: string[];
    bestPractices: string[];
    metrics: ReviewReport['metrics'];
  }> {
    const systemPrompt = `你是一位资深的代码审查专家。请对以下 ${language} 代码进行深度审查。

审查维度：
1. **架构设计**：代码组织是否合理，是否有设计问题
2. **安全性**：SQL 注入、XSS、CSRF、敏感信息泄露等
3. **性能**：潜在的性能瓶颈、不必要的计算
4. **可维护性**：代码可读性、命名规范、注释质量
5. **最佳实践**：是否符合该语言/框架的最佳实践

请以 JSON 格式返回审查结果：
{
  "issues": [{ "severity": "error|warning|info", "line": 0, "column": 0, "message": "...", "rule": "...", "suggestion": "..." }],
  "suggestions": ["改进建议1", "改进建议2"],
  "bestPractices": ["最佳实践1", "最佳实践2"],
  "metrics": {
    "complexity": "low|medium|high",
    "maintainability": 0-100,
    "security": 0-100,
    "performance": 0-100
  }
}`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `语言: ${language}\n${context ? `上下文: ${context}\n` : ''}\n代码:\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      temperature: 0.3,
      maxTokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '{}';
    try {
      return JSON.parse(content);
    } catch {
      return {
        issues: [],
        suggestions: ['LLM 审查解析失败'],
        bestPractices: [],
        metrics: { totalLines: code.split('\n').length, complexity: 'medium', maintainability: 50, security: 50, performance: 50 },
      };
    }
  }

  /**
   * 合并静态分析和 LLM 审查结果
   */
  private mergeResults(
    staticIssues: CodeIssue[],
    llmResult: {
      issues: CodeIssue[];
      suggestions: string[];
      bestPractices: string[];
      metrics: ReviewReport['metrics'];
    },
    code: string,
  ): ReviewReport {
    const allIssues = [...staticIssues, ...(llmResult.issues || [])];
    const totalLines = code.split('\n').length;

    // 计算总体评分
    const errorCount = allIssues.filter(i => i.severity === 'error').length;
    const warningCount = allIssues.filter(i => i.severity === 'warning').length;
    const baseScore = 100;
    const score = Math.max(0, baseScore - errorCount * 15 - warningCount * 5);

    return {
      summary: `共发现 ${allIssues.length} 个问题（${errorCount} 个错误，${warningCount} 个警告）`,
      overallScore: score,
      issues: allIssues.sort((a, b) => {
        const order = { error: 0, warning: 1, info: 2 };
        return (order[a.severity] || 0) - (order[b.severity] || 0);
      }),
      metrics: {
        ...llmResult.metrics,
        totalLines,
      },
      suggestions: llmResult.suggestions || [],
      bestPractices: llmResult.bestPractices || [],
    };
  }
}
