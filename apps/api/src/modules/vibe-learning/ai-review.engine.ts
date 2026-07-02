// ai-review.engine.ts
// Phase 3 Step 22: AI 代码评审引擎
// 利用 LLM 对学生代码进行多维度智能评审

import { Injectable, Logger } from '@nestjs/common';
import { LlmGateway } from '../agent/llm/llm.gateway';
import { AIReviewCheck, AIReviewReport } from './types/exercise-checks';

/** 评审维度说明映射 */
const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  correctness: '代码正确性：逻辑是否正确，是否满足题目要求',
  readability: '代码可读性：命名是否清晰，结构是否合理，是否有适当注释',
  performance: '代码性能：是否有明显性能问题，时间/空间复杂度是否合理',
  security: '代码安全性：是否存在安全隐患（XSS、注入、信息泄露等）',
  best_practice: '最佳实践：是否遵循语言/框架的最佳实践和惯用法',
};

@Injectable()
export class AiReviewEngine {
  private readonly logger = new Logger(AiReviewEngine.name);

  constructor(private readonly llmGateway: LlmGateway) {}

  /**
   * 对学生代码执行 AI 评审
   * @param code 学生提交的代码
   * @param check 评审配置
   * @param exerciseContext 题目上下文（题目描述、参考答案等）
   */
  async review(
    code: string,
    check: AIReviewCheck,
    exerciseContext?: { title?: string; description?: string; reference?: string },
  ): Promise<AIReviewReport> {
    const dimensionsList = check.dimensions
      .map(d => `- ${d}: ${DIMENSION_DESCRIPTIONS[d] || d}`)
      .join('\n');

    const systemPrompt = `你是一个专业的代码评审专家，负责评审编程学习者的代码。
你需要从以下维度进行评审，并为每个维度打分（0-100分）：

${dimensionsList}

评审标准：
- 90-100: 优秀，几乎无可挑剔
- 70-89: 良好，有少量可改进点
- 50-69: 及格，有明显改进空间
- 30-49: 不及格，存在较多问题
- 0-29: 严重问题，需要重新学习

评审要求：
1. 严格按照 JSON 格式输出
2. 每个维度给出具体分数和改进建议
3. 总体评语需要具体、有建设性
4. 建议应该针对学生水平，循序渐进`;

    const userPrompt = this.buildUserPrompt(code, check, exerciseContext);

    try {
      const response = await this.llmGateway.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // 低温度以获得更一致的评审
        maxTokens: 1024,
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseAIResponse(content, check.dimensions);
    } catch (error) {
      this.logger.error('AI review failed: ' + (error as Error).message);
      // 返回降级评审结果
      return this.getFallbackReport(check.dimensions);
    }
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(
    code: string,
    check: AIReviewCheck,
    context?: { title?: string; description?: string; reference?: string },
  ): string {
    let prompt = '';

    if (context?.title) {
      prompt += `题目：${context.title}\n`;
    }
    if (context?.description) {
      prompt += `题目描述：${context.description}\n`;
    }

    prompt += `\n学生代码：\n\`\`\`\n${code}\n\`\`\`\n`;

    if (context?.reference) {
      prompt += `\n参考答案（仅供评审参考，不要直接暴露给学生）：\n\`\`\`\n${context.reference}\n\`\`\`\n`;
    }

    if (check.rubric) {
      prompt += `\n评分标准：${check.rubric}\n`;
    }

    prompt += `
请对以上代码进行评审，严格按照以下 JSON 格式输出（不要添加任何其他文字）：

{
  "scores": {
${check.dimensions.map(d => `    "${d}": <0-100的分数>`).join(',\n')}
  },
  "suggestions": [
    "<具体的改进建议1>",
    "<具体的改进建议2>",
    "<具体的改进建议3>"
  ],
  "overallComment": "<总体评语，总结代码的优缺点>"
}`;

    return prompt;
  }

  /**
   * 解析 AI 返回的 JSON 评审结果
   */
  private parseAIResponse(content: string, dimensions: string[]): AIReviewReport {
    try {
      // 尝试提取 JSON（AI 可能在 JSON 外添加 markdown 标记）
      let jsonStr = content.trim();

      // 去除 markdown 代码块标记
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // 尝试直接找到 JSON 对象
      const braceStart = jsonStr.indexOf('{');
      const braceEnd = jsonStr.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd !== -1) {
        jsonStr = jsonStr.substring(braceStart, braceEnd + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // 验证并规范化 scores
      const scores: Record<string, number> = {};
      for (const dim of dimensions) {
        const score = parsed.scores?.[dim];
        if (typeof score === 'number' && score >= 0 && score <= 100) {
          scores[dim] = score;
        } else {
          scores[dim] = 50; // 默认分数
        }
      }

      return {
        scores,
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 5)
          : [],
        overallComment: typeof parsed.overallComment === 'string'
          ? parsed.overallComment
          : '评审完成，详见各维度评分。',
      };
    } catch (error) {
      this.logger.warn('Failed to parse AI review response: ' + (error as Error).message);
      return this.getFallbackReport(dimensions);
    }
  }

  /**
   * 降级评审报告（当 AI 调用失败时使用）
   */
  private getFallbackReport(dimensions: string[]): AIReviewReport {
    const scores: Record<string, number> = {};
    for (const dim of dimensions) {
      scores[dim] = 50;
    }
    return {
      scores,
      suggestions: ['AI 评审暂不可用，请稍后重试'],
      overallComment: 'AI 评审服务暂时不可用，已给出默认评分。建议稍后重新评审获取详细反馈。',
    };
  }
}
