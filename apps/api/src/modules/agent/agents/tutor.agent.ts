import { LlmGateway } from '../llm/llm.gateway';
import { AgentRequest, AgentResponse } from './orchestrator.agent';

export class TutorAgent {
  constructor(private readonly llm: LlmGateway) {}

  async explain(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(request.userLevel, request.knowledgeState);

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.message },
      ],
      temperature: 0.7,
      maxTokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokens = response.usage?.total_tokens || 0;
    const latencyMs = Date.now() - startTime;

    return {
      content,
      tokens,
      latencyMs,
      confidence: 0.85,
    };
  }

  async vibeCoding(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();

    const systemPrompt = `你是一个 Vibe Coding 专家。用户描述氛围和功能，你需要生成 React + Tailwind CSS 组件代码。

技术要求：
- 必须使用 React 函数组件（Function Component）
- 必须使用 Tailwind CSS 类名实现样式
- 组件名必须是 "Component" 或 "App"
- 使用 useState, useEffect 等 React hooks
- 代码要美观、现代、有设计感

响应格式：
1. 简要说明设计方案
2. 在 \`\`\`jsx 代码块中提供完整组件代码
3. 给出使用说明

示例代码结构：
\`\`\`jsx
function Component() {
  return (
    <div className="...">
      {/* 内容 */}
    </div>
  );
}
\`\`\`

用户水平：${request.userLevel}
${request.currentCode ? `当前代码：\n${request.currentCode}` : ''}`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.message },
      ],
      temperature: 0.8,
      maxTokens: 4096,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokens = response.usage?.total_tokens || 0;
    const latencyMs = Date.now() - startTime;

    return { content, tokens, latencyMs, confidence: 0.8 };
  }

  private buildSystemPrompt(
    userLevel: string,
    knowledgeState?: Record<string, number>,
  ): string {
    const levelInstructions: Record<string, string> = {
      beginner: '使用简单易懂的语言，多用类比和例子，避免专业术语。',
      intermediate: '可以使用一定专业术语，但仍需解释清楚概念。',
      advanced: '使用专业术语，提供深入的技术细节。',
    };

    const instruction = levelInstructions[userLevel] || levelInstructions.beginner;

    let contextInfo = '';
    if (knowledgeState) {
      const weakPoints = Object.entries(knowledgeState)
        .filter(([, v]) => v < 0.5)
        .map(([k]) => k);
      if (weakPoints.length > 0) {
        contextInfo = `\n用户薄弱知识点：${weakPoints.join(', ')}，在讲解时可适当加强这些方面。`;
      }
    }

    return `你是 sAgent 平台的智能辅导 Tutor。你的职责是帮助用户理解编程概念和解决问题。

教学原则：
1. 苏格拉底式引导：先提问引导思考，再给出答案
2. 代码示范：用具体代码示例说明概念
3. 个性化适配：${instruction}
4. 鼓励式反馈：肯定用户的进步，温和指出错误${contextInfo}`;
  }
}
