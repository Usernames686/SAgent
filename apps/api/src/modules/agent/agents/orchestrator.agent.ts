import { LlmGateway } from '../llm/llm.gateway';

export interface AgentRequest {
  userId: string;
  sessionId: string;
  userLevel: string;
  currentCode?: string;
  knowledgeState?: Record<string, number>;
  message: string;
}

export interface AgentResponse {
  content: string;
  tokens: number;
  latencyMs: number;
  confidence: number;
}

export class OrchestratorAgent {
  constructor(private readonly llm: LlmGateway) {}

  async route(request: AgentRequest): Promise<{
    agentType: string;
    confidence: number;
    parameters: Record<string, unknown>;
  }> {
    const startTime = Date.now();

    const response = await this.llm.chat({
      messages: [
        {
          role: 'system',
          content: `你是 sAgent 平台的意图识别引擎。根据用户输入判断意图类别并返回 JSON。

可选意图类别：
- concept_question: 概念提问（"什么是..."、"怎么理解..."、"解释一下"）
- code_error: 代码出错（运行报错、错误日志）
- code_submit: 代码提交（提交评测、运行测试）
- path_request: 路径请求（"推荐学习"、"下一步学什么"）
- interview_prep: 面试准备（"面试题"、"模拟面试"）
- vibe_describe: 氛围描述（视觉风格、交互效果）
- prompt_optimize: Prompt 优化（"帮我写 Prompt"）
- chat: 闲聊/问候

返回格式：{"intent": "类别", "confidence": 0.0-1.0, "parameters": {}}
仅返回 JSON，不要其他内容。`,
        },
        {
          role: 'user',
          content: request.message,
        },
      ],
      temperature: 0.1,
      maxTokens: 200,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const latencyMs = Date.now() - startTime;

    try {
      const parsed = JSON.parse(content);
      return {
        agentType: this.mapIntentToAgent(parsed.intent),
        confidence: parsed.confidence || 0.7,
        parameters: parsed.parameters || {},
      };
    } catch {
      return {
        agentType: 'tutor',
        confidence: 0.5,
        parameters: {},
      };
    }
  }

  private mapIntentToAgent(intent: string): string {
    const mapping: Record<string, string> = {
      concept_question: 'tutor',
      code_error: 'debug',
      code_submit: 'evaluator',
      path_request: 'path_planner',
      interview_prep: 'interview',
      vibe_describe: 'tutor',
      prompt_optimize: 'tutor',
      chat: 'tutor',
    };
    return mapping[intent] || 'tutor';
  }
}
