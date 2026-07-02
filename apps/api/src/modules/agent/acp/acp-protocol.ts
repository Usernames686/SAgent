// ACP/1.0 — Agent Communication Protocol
// 智能体间通信协议实现

import { v4 as uuid } from 'uuid';

// ===== 协议消息类型 =====
export type AcpMessageType = 'request' | 'response' | 'event' | 'error';
export type AcpPriority = 'high' | 'medium' | 'low';

export interface AcpMessage {
  protocol: 'ACP/1.0';
  message: {
    id: string;
    from: string;
    to: string;
    type: AcpMessageType;
    timestamp: string;
    correlationId: string;
    payload: AcpPayload;
    metadata: AcpMetadata;
  };
}

export interface AcpPayload {
  action: string;
  parameters: Record<string, unknown>;
  context: AcpContext;
}

export interface AcpContext {
  userId: string;
  sessionId: string;
  userLevel: string;
  currentCode?: string;
  knowledgeState?: Record<string, number>;
  parentMessageId?: string;  // 用于追踪调用链
}

export interface AcpMetadata {
  priority: AcpPriority;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface AcpResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    tokens: number;
    latencyMs: number;
    confidence: number;
  };
}

// ===== 消息构建器 =====
export class AcpMessageBuilder {
  static createRequest(params: {
    from: string;
    to: string;
    action: string;
    parameters: Record<string, unknown>;
    context: AcpContext;
    priority?: AcpPriority;
    timeout?: number;
    correlationId?: string;
  }): AcpMessage {
    return {
      protocol: 'ACP/1.0',
      message: {
        id: uuid(),
        from: params.from,
        to: params.to,
        type: 'request',
        timestamp: new Date().toISOString(),
        correlationId: params.correlationId || uuid(),
        payload: {
          action: params.action,
          parameters: params.parameters,
          context: params.context,
        },
        metadata: {
          priority: params.priority || 'medium',
          timeout: params.timeout || 30000,
          retryPolicy: {
            maxRetries: 2,
            backoffMs: 1000,
          },
        },
      },
    };
  }

  static createResponse(params: {
    from: string;
    to: string;
    correlationId: string;
    success: boolean;
    data?: unknown;
    error?: { code: string; message: string };
    metadata: { tokens: number; latencyMs: number; confidence: number };
  }): AcpMessage {
    return {
      protocol: 'ACP/1.0',
      message: {
        id: uuid(),
        from: params.from,
        to: params.to,
        type: 'response',
        timestamp: new Date().toISOString(),
        correlationId: params.correlationId,
        payload: {
          action: 'response',
          parameters: {},
          context: { userId: '', sessionId: '', userLevel: '' },
        },
        metadata: {
          priority: 'medium',
          timeout: 30000,
          retryPolicy: { maxRetries: 0, backoffMs: 0 },
        },
      },
    };
  }

  static createError(params: {
    from: string;
    to: string;
    correlationId: string;
    code: string;
    message: string;
  }): AcpMessage {
    return {
      protocol: 'ACP/1.0',
      message: {
        id: uuid(),
        from: params.from,
        to: params.to,
        type: 'error',
        timestamp: new Date().toISOString(),
        correlationId: params.correlationId,
        payload: {
          action: 'error',
          parameters: { code: params.code, message: params.message },
          context: { userId: '', sessionId: '', userLevel: '' },
        },
        metadata: {
          priority: 'high',
          timeout: 5000,
          retryPolicy: { maxRetries: 0, backoffMs: 0 },
        },
      },
    };
  }
}

// ===== ACP 路由器 =====
export type AcpHandler = (message: AcpMessage) => Promise<AcpResponse>;

export class AcpRouter {
  private handlers = new Map<string, AcpHandler>();
  private pendingRequests = new Map<string, {
    resolve: (response: AcpResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  /**
   * 注册 Agent 消息处理器
   */
  register(agentName: string, handler: AcpHandler): void {
    this.handlers.set(agentName, handler);
  }

  /**
   * 发送消息并等待响应（同步 RPC）
   */
  async sendAndWait(message: AcpMessage, timeoutMs?: number): Promise<AcpResponse> {
    const timeout = timeoutMs || message.message.metadata.timeout;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(message.message.id);
        reject(new Error(`ACP timeout: ${message.message.to} 未在 ${timeout}ms 内响应`));
      }, timeout);

      this.pendingRequests.set(message.message.id, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      // 分发消息
      this.dispatch(message).catch(err => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.message.id);
        reject(err);
      });
    });
  }

  /**
   * 分发消息到目标 Agent
   */
  async dispatch(message: AcpMessage): Promise<void> {
    const target = message.message.to;
    const handler = this.handlers.get(target);

    if (!handler) {
      // Agent 不存在
      if (message.message.type === 'request') {
        const pending = this.pendingRequests.get(message.message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.message.id);
          pending.resolve({
            success: false,
            error: { code: 'AGENT_NOT_FOUND', message: `Agent '${target}' 未注册` },
            metadata: { tokens: 0, latencyMs: 0, confidence: 0 },
          });
        }
      }
      return;
    }

    try {
      const response = await handler(message);
      
      // 如果是 request 类型，将响应返回给调用方
      if (message.message.type === 'request') {
        const pending = this.pendingRequests.get(message.message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.message.id);
          pending.resolve(response);
        }
      }
    } catch (err) {
      const pending = this.pendingRequests.get(message.message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.message.id);
        pending.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * 广播事件到所有 Agent
   */
  async broadcast(event: string, data: unknown): Promise<void> {
    const message = AcpMessageBuilder.createRequest({
      from: 'system',
      to: '*',
      action: event,
      parameters: { data },
      context: { userId: '', sessionId: '', userLevel: '' },
      priority: 'low',
    });

    for (const [name, handler] of this.handlers) {
      if (name !== 'system') {
        try {
          await handler(message);
        } catch {
          // 广播失败不影响其他 Agent
        }
      }
    }
  }
}
