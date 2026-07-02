import { LlmGateway } from '../llm/llm.gateway';
import { AgentRequest, AgentResponse } from './orchestrator.agent';

export class EvaluatorAgent {
  constructor(private readonly llm: LlmGateway) {}

  async evaluate(
    request: AgentRequest,
    exerciseDescription: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    const systemPrompt = `你是 sAgent 平台的代码评估专家。你需要对用户提交的代码进行全面评估。

评估维度：
1. 正确性 (40%)：代码是否正确解决问题
2. 代码风格 (20%)：命名规范、代码组织、注释
3. 性能 (15%)：时间复杂度、空间复杂度
4. 安全性 (15%)：是否有安全隐患
5. 可维护性 (10%)：代码可读性、模块化

返回 JSON 格式：
{
  "overallScore": 0-100,
  "correctness": 0-100,
  "style": 0-100,
  "performance": 0-100,
  "security": 0-100,
  "maintainability": 0-100,
  "suggestions": ["建议1", "建议2"],
  "detailedFeedback": "详细反馈"
}`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `题目要求：${exerciseDescription}\n\n用户代码：\n${request.message}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokens = response.usage?.total_tokens || 0;
    const latencyMs = Date.now() - startTime;

    return { content, tokens, latencyMs, confidence: 0.85 };
  }
}
