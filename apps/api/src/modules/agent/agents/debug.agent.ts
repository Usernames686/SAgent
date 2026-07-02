import { LlmGateway } from '../llm/llm.gateway';
import { AgentRequest, AgentResponse } from './orchestrator.agent';

export class DebugAgent {
  constructor(private readonly llm: LlmGateway) {}

  async debug(
    request: AgentRequest,
    errorInfo: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    const systemPrompt = `你是 sAgent 平台的调试专家。你的职责是帮助用户定位和修复代码错误。

教学原则：
1. 引导式排查：不要直接给出答案，引导用户自己发现错误
2. 错误分析：解释错误原因和含义
3. 修复建议：提供修复方向和示例
4. 预防性提示：教用户如何避免类似错误

返回格式：
1. 错误分析
2. 排查步骤（引导式）
3. 修复建议
4. 预防措施`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `代码：\n${request.message}\n\n错误信息：\n${errorInfo}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokens = response.usage?.total_tokens || 0;
    const latencyMs = Date.now() - startTime;

    return { content, tokens, latencyMs, confidence: 0.8 };
  }
}
