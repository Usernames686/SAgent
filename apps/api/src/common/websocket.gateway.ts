// WebSocket 消息协议 — 标准化消息格式

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// ===== 标准消息格式 =====
export interface WsMessage<T = unknown> {
  type: 'message' | 'stream_start' | 'stream_chunk' | 'stream_end' | 'error' | 'event' | 'ack';
  data: T;
  meta?: {
    sessionId?: string;
    timestamp?: string;
    sequence?: number;
  };
}

// ===== 客户端发送的消息结构 =====
export interface ClientMessage {
  type: 'message';
  data: {
    content: string;
    context?: {
      currentCode?: string;
      exerciseId?: string;
      cursorLine?: number;
      cursorColumn?: number;
    };
  };
}

// ===== 服务端发送的流式消息 =====
export interface StreamStartData {
  sessionId: string;
  agent: string;
  expectedLength?: number;
}

export interface StreamChunkData {
  content: string;
  index: number;
  done?: boolean;
}

export interface StreamEndData {
  sessionId: string;
  totalTokens: number;
  latencyMs: number;
  agentType: string;
}

// ===== 错误消息 =====
export interface WsErrorData {
  code: string;
  message: string;
  details?: unknown;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);
  private connectedClients = new Map<string, { userId: string; socketId: string; joinedAt: Date }>();
  private sequenceCounters = new Map<string, number>();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * 连接时 JWT 认证
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        client.emit('error', this.formatError('UNAUTHORIZED', '未提供认证 Token'));
        client.disconnect();
        return;
      }

      // JWT 验证
      let decoded: { sub: string; email: string; role?: string };
      try {
        decoded = this.jwtService.verify(token);
      } catch {
        client.emit('error', this.formatError('TOKEN_INVALID', 'Token 无效或已过期'));
        client.disconnect();
        return;
      }

      const userId = decoded.sub;

      this.connectedClients.set(client.id, {
        userId,
        socketId: client.id,
        joinedAt: new Date(),
      });

      client.emit('message', this.formatMessage('event', {
        type: 'connected',
        message: 'WebSocket 连接已建立',
        userId,
      }));

      this.logger.log(`用户 ${userId} 已连接 (${client.id})`);
    } catch {
      client.emit('error', this.formatError('AUTH_FAILED', '认证失败'));
      client.disconnect();
    }
  }

  /**
   * 断开连接
   */
  handleDisconnect(client: Socket): void {
    const info = this.connectedClients.get(client.id);
    if (info) {
      this.logger.log(`用户 ${info.userId} 已断开 (${client.id})`);
      this.connectedClients.delete(client.id);
      this.sequenceCounters.delete(client.id);
    }
  }

  /**
   * 处理客户端消息 — 真实 LLM 流式输出
   */
  @SubscribeMessage('message')
  async handleMessage(client: Socket, payload: ClientMessage): Promise<void> {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) throw new WsException('未认证的连接');

    const sessionId = `session-${Date.now()}`;
    let seq = this.getNextSequence(client.id);
    const startTime = Date.now();

    try {
      // 1. 发送 stream_start
      client.emit('message', this.formatMessage('stream_start', {
        sessionId,
        agent: 'tutor',
      }, { sessionId, sequence: seq++ }));

      // 2. 调用 LlmGateway 流式输出
      const { LlmGateway } = await import('../modules/agent/llm/llm.gateway');
      const llm = new LlmGateway();
      let totalContent = '';
      let chunkIndex = 0;

      const systemPrompt = '你是 sAgent 平台的 AI 编程导师，专注于氛围编程(Vibe Coding)和编程学习辅导。请用简洁、友好的方式回答问题。';
      const userMessage = payload.data?.content || '';

      for await (const chunk of llm.chatStream({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      })) {
        totalContent += chunk;
        client.emit('message', this.formatMessage('stream_chunk', {
          content: chunk,
          index: chunkIndex++,
        }, { sessionId, sequence: seq++ }));
      }

      // 3. 发送 stream_end
      client.emit('message', this.formatMessage('stream_end', {
        sessionId,
        totalTokens: totalContent.length,
        latencyMs: Date.now() - startTime,
        agentType: 'tutor',
      }, { sessionId, sequence: seq }));
    } catch (err) {
      client.emit('message', this.formatError('STREAM_ERROR', '流式输出失败', err));
    }
  }

  /**
   * 处理 AI 反馈（设计文档 9.8 节）
   */
  @SubscribeMessage('feedback')
  handleFeedback(client: Socket, payload: { sessionId: string; rating: number; comment?: string }): void {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) throw new WsException('未认证的连接');

    this.logger.log(`收到反馈: session=${payload.sessionId}, rating=${payload.rating}, user=${clientInfo.userId}`);

    client.emit('message', this.formatMessage('ack', {
      sessionId: payload.sessionId,
      received: true,
    }));
  }

  /**
   * 处理加入会话房间
   */
  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: { sessionId: string }): void {
    client.join(payload.sessionId);
    client.emit('message', this.formatMessage('event', {
      type: 'joined',
      sessionId: payload.sessionId,
      message: `已加入会话 ${payload.sessionId}`,
    }));
  }

  /**
   * 处理离开会话房间
   */
  @SubscribeMessage('leave')
  handleLeave(client: Socket, payload: { sessionId: string }): void {
    client.leave(payload.sessionId);
  }

  /**
   * 发送 AI 分析完成事件（由 AgentService 调用）
   */
  sendAnalysisComplete(userId: string, data: {
    sessionId: string;
    analysis: string;
    suggestions: string[];
  }): void {
    this.sendToUser(userId, 'message', this.formatMessage('event', {
      type: 'analysis_complete',
      ...data,
    }));
  }

  /**
   * 广播氛围匹配度结果
   */
  sendVibeMatchResult(userId: string, data: {
    score: number;
    feedback: string;
  }): void {
    this.sendToUser(userId, 'message', this.formatMessage('event', {
      type: 'vibe_match',
      ...data,
    }));
  }

  /**
   * 发送给指定用户
   */
  private sendToUser(userId: string, event: string, data: WsMessage): void {
    for (const [, info] of this.connectedClients) {
      if (info.userId === userId) {
        this.server.to(info.socketId).emit(event, data);
      }
    }
  }

  /**
   * 格式化标准消息
   */
  private formatMessage<T>(type: WsMessage['type'], data: T, meta?: WsMessage['meta']): WsMessage<T> {
    return {
      type,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * 格式化错误消息
   */
  private formatError(code: string, message: string, details?: unknown): WsMessage<WsErrorData> {
    return this.formatMessage('error', { code, message, details });
  }

  /**
   * 获取下一个序列号
   */
  private getNextSequence(clientId: string): number {
    const current = this.sequenceCounters.get(clientId) || 0;
    this.sequenceCounters.set(clientId, current + 1);
    return current;
  }

  /**
   * 获取在线用户数
   */
  getOnlineCount(): number {
    return this.connectedClients.size;
  }

  /**
   * 获取用户在线的会话 ID
   */
  getUserSocketId(userId: string): string | undefined {
    for (const [, info] of this.connectedClients) {
      if (info.userId === userId) return info.socketId;
    }
    return undefined;
  }
}
