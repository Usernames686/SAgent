import OpenAI from 'openai';
import { ServiceUnavailableException } from '@nestjs/common';

export class LlmGateway {
  private client: OpenAI | null;
  private readonly maxTokens: number;
  private readonly apiKey?: string;
  private readonly baseURL: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor() {
    this.timeout = Number(process.env.LLM_TIMEOUT_MS || 30000);
    this.maxTokens = Number(process.env.LLM_MAX_TOKENS || 4096);
    this.apiKey = process.env.LLM_API_KEY?.trim();
    this.baseURL = process.env.LLM_BASE_URL?.trim() || 'https://api.openai.com/v1';
    this.model = process.env.LLM_MODEL?.trim() || 'gpt-4o-mini';
    this.client = this.apiKey
      ? new OpenAI({
          apiKey: this.apiKey,
          baseURL: this.baseURL,
          timeout: this.timeout,
          maxRetries: 0,
        })
      : null;
  }

  getStatus() {
    return {
      configured: Boolean(this.client),
      provider: 'openai-compatible-cloud',
      baseURL: this.baseURL,
      model: this.model,
      timeoutMs: this.timeout,
      maxTokens: this.maxTokens,
      message: this.client
        ? '云端模型已配置'
        : '未配置 LLM_API_KEY，AI 对话/生成会返回配置错误',
    };
  }

  private getClient() {
    if (!this.client) {
      throw new ServiceUnavailableException('未配置 LLM_API_KEY，请在 apps/api/.env 或根 .env 中配置云端模型密钥');
    }
    return this.client;
  }

  async chat(params: {
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    timeoutMs?: number;
    disableThinking?: boolean;
  }) {
    const body: Record<string, unknown> = {
      model: params.model || this.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: Math.min(params.maxTokens ?? 2048, this.maxTokens),
      stream: false,
    };

    if (params.disableThinking) {
      const thinking = { type: 'disabled' };
      body.thinking = thinking;
      body.extra_body = { thinking };
    }

    const response = await this.getClient().chat.completions.create(body as never, {
      timeout: params.timeoutMs ?? this.timeout,
    });
    return response as OpenAI.ChatCompletion;
  }

  async *chatStream(params: {
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    const stream = await this.getClient().chat.completions.create({
      model: params.model || this.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: Math.min(params.maxTokens ?? 2048, this.maxTokens),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
