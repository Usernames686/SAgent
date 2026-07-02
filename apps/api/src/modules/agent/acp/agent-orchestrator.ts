// Agent 编排器 — 协作模式 + 冲突解决
import { LlmGateway } from '../llm/llm.gateway';
import { OrchestratorAgent, AgentRequest } from '../agents/orchestrator.agent';
import { TutorAgent } from '../agents/tutor.agent';
import { EvaluatorAgent } from '../agents/evaluator.agent';
import { DebugAgent } from '../agents/debug.agent';
import { CodeReviewAgent, ReviewReport } from '../agents/code-review.agent';
import { AcpRouter, AcpMessageBuilder } from './acp-protocol';

// ===== 协作模式 =====
export type CollaborationMode = 'serial' | 'parallel' | 'conditional' | 'recursive';

// ===== 协作任务 =====
export interface CollaborationTask {
  id: string;
  mode: CollaborationMode;
  agents: string[];           // Agent 执行顺序
  request: AgentRequest;
  context: {
    userId: string;
    sessionId: string;
  };
  condition?: {
    field: string;            // 判断字段
    operator: 'eq' | 'gt' | 'lt' | 'contains';
    value: unknown;
    trueBranch: string[];     // 条件为真时执行
    falseBranch: string[];    // 条件为假时执行
  };
}

// ===== Agent 执行结果 =====
export interface AgentResult {
  agentName: string;
  content: unknown;
  confidence: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

// ===== 冲突解决策略 =====
export type ConflictResolutionStrategy = 'weighted_vote' | 'priority' | 'latest' | 'combine';

// ===== 冲突 =====
export interface Conflict {
  type: 'evaluation_conflict' | 'suggestion_conflict' | 'path_conflict' | 'resource_contention';
  agents: string[];
  details: string;
  resolution: string;
}

export class AgentOrchestrator {
  private readonly acpRouter: AcpRouter;

  constructor(
    private readonly llm: LlmGateway,
    private readonly intentAgent: OrchestratorAgent,
    private readonly tutorAgent: TutorAgent,
    private readonly evaluatorAgent: EvaluatorAgent,
    private readonly debugAgent: DebugAgent,
    private readonly codeReviewAgent: CodeReviewAgent,
  ) {
    this.acpRouter = new AcpRouter();
    this.registerAgents();
  }

  /**
   * 注册 Agent 到 ACP 路由器
   */
  private registerAgents(): void {
    this.acpRouter.register('tutor', async (msg) => {
      const req = this.acpRequestToAgentRequest(msg);
      const result = await this.tutorAgent.explain(req);
      return { success: true, data: result.content, metadata: { tokens: result.tokens, latencyMs: result.latencyMs, confidence: result.confidence } };
    });

    this.acpRouter.register('evaluator', async (msg) => {
      const req = this.acpRequestToAgentRequest(msg);
      const code = msg.message.payload.parameters.code as string || req.message;
      const result = await this.evaluatorAgent.evaluate(req, code);
      return { success: true, data: result.content, metadata: { tokens: result.tokens, latencyMs: result.latencyMs, confidence: result.confidence } };
    });

    this.acpRouter.register('debug', async (msg) => {
      const req = this.acpRequestToAgentRequest(msg);
      const errorInfo = msg.message.payload.parameters.error as string || '';
      const result = await this.debugAgent.debug(req, errorInfo);
      return { success: true, data: result.content, metadata: { tokens: result.tokens, latencyMs: result.latencyMs, confidence: result.confidence } };
    });

    this.acpRouter.register('code_review', async (msg) => {
      const code = msg.message.payload.parameters.code as string || '';
      const language = msg.message.payload.parameters.language as string || 'typescript';
      const result = await this.codeReviewAgent.review(code, language);
      return { success: true, data: result, metadata: { tokens: 0, latencyMs: 0, confidence: 0.8 } };
    });
  }

  /**
   * 将 ACP 消息转换为 AgentRequest
   */
  private acpRequestToAgentRequest(msg: import('../acp/acp-protocol').AcpMessage): AgentRequest {
    const ctx = msg.message.payload.context;
    return {
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      userLevel: ctx.userLevel,
      currentCode: ctx.currentCode,
      knowledgeState: ctx.knowledgeState,
      message: (msg.message.payload.parameters.message as string) || '',
    };
  }

  /**
   * 执行协作任务
   */
  async executeTask(task: CollaborationTask): Promise<{
    results: AgentResult[];
    conflicts: Conflict[];
  }> {
    switch (task.mode) {
      case 'serial':
        return this.executeSerial(task);
      case 'parallel':
        return this.executeParallel(task);
      case 'conditional':
        return this.executeConditional(task);
      case 'recursive':
        return this.executeRecursive(task);
      default:
        return this.executeSerial(task);
    }
  }

  /**
   * 串行协作：Agent 按序执行，前一个输出作为后一个输入
   */
  private async executeSerial(task: CollaborationTask): Promise<{
    results: AgentResult[];
    conflicts: Conflict[];
  }> {
    const results: AgentResult[] = [];
    let currentRequest = { ...task.request };

    for (const agentName of task.agents) {
      const startTime = Date.now();
      try {
        const message = AcpMessageBuilder.createRequest({
          from: 'orchestrator',
          to: agentName,
          action: 'execute',
          parameters: { ...currentRequest, message: currentRequest.message },
          context: {
            userId: task.context.userId,
            sessionId: task.context.sessionId,
            userLevel: currentRequest.userLevel || 'beginner',
            currentCode: currentRequest.currentCode,
            knowledgeState: currentRequest.knowledgeState,
          },
        });

        const response = await this.acpRouter.sendAndWait(message, 30000);
        const latencyMs = Date.now() - startTime;

        results.push({
          agentName,
          content: response.data,
          confidence: response.metadata.confidence,
          latencyMs,
          success: response.success,
          error: response.error?.message,
        });

        // 串行模式下，将前一个 Agent 的输出作为下一个的输入
        if (response.data && typeof response.data === 'string') {
          currentRequest = { ...currentRequest, message: response.data };
        }
      } catch (err) {
        results.push({
          agentName,
          content: null,
          confidence: 0,
          latencyMs: Date.now() - startTime,
          success: false,
          error: (err as Error).message,
        });
      }
    }

    return { results, conflicts: [] };
  }

  /**
   * 并行协作：多个 Agent 同时执行，结果由 Orchestrator 聚合
   */
  private async executeParallel(task: CollaborationTask): Promise<{
    results: AgentResult[];
    conflicts: Conflict[];
  }> {
    const startTime = Date.now();
    const promises = task.agents.map(async (agentName) => {
      try {
        const message = AcpMessageBuilder.createRequest({
          from: 'orchestrator',
          to: agentName,
          action: 'execute',
          parameters: { message: task.request.message },
          context: {
            userId: task.context.userId,
            sessionId: task.context.sessionId,
            userLevel: task.request.userLevel || 'beginner',
          },
        });

        const response = await this.acpRouter.sendAndWait(message, 30000);
        return {
          agentName,
          content: response.data,
          confidence: response.metadata.confidence,
          latencyMs: Date.now() - startTime,
          success: response.success,
          error: response.error?.message,
        } as AgentResult;
      } catch (err) {
        return {
          agentName,
          content: null,
          confidence: 0,
          latencyMs: Date.now() - startTime,
          success: false,
          error: (err as Error).message,
        } as AgentResult;
      }
    });

    const results = await Promise.all(promises);

    // 检测并解决冲突
    const conflicts = this.detectConflicts(results);

    return { results, conflicts };
  }

  /**
   * 条件协作：根据条件动态选择协作路径
   */
  private async executeConditional(task: CollaborationTask): Promise<{
    results: AgentResult[];
    conflicts: Conflict[];
  }> {
    if (!task.condition) {
      return this.executeSerial(task);
    }

    // 判断条件
    const conditionMet = this.evaluateCondition(task.condition, task.request);
    const agents = conditionMet ? task.condition.trueBranch : task.condition.falseBranch;

    const subTask: CollaborationTask = {
      ...task,
      mode: 'serial',
      agents,
    };

    return this.executeSerial(subTask);
  }

  /**
   * 递归协作：Agent 可调用其他 Agent 完成子任务
   */
  private async executeRecursive(task: CollaborationTask): Promise<{
    results: AgentResult[];
    conflicts: Conflict[];
  }> {
    const results: AgentResult[] = [];

    for (const agentName of task.agents) {
      const startTime = Date.now();
      try {
        const message = AcpMessageBuilder.createRequest({
          from: 'orchestrator',
          to: agentName,
          action: 'execute_recursive',
          parameters: { message: task.request.message, recursive: true },
          context: {
            userId: task.context.userId,
            sessionId: task.context.sessionId,
            userLevel: task.request.userLevel || 'beginner',
          },
          timeout: 60000,
        });

        const response = await this.acpRouter.sendAndWait(message, 60000);
        results.push({
          agentName,
          content: response.data,
          confidence: response.metadata.confidence,
          latencyMs: Date.now() - startTime,
          success: response.success,
          error: response.error?.message,
        });
      } catch (err) {
        results.push({
          agentName,
          content: null,
          confidence: 0,
          latencyMs: Date.now() - startTime,
          success: false,
          error: (err as Error).message,
        });
      }
    }

    return { results, conflicts: [] };
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(
    condition: NonNullable<CollaborationTask['condition']>,
    request: AgentRequest,
  ): boolean {
    const req = request as unknown as Record<string, unknown>;
    const value = req[condition.field];

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'gt':
        return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
      case 'lt':
        return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
      case 'contains':
        return typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * 检测结果冲突
   */
  private detectConflicts(results: AgentResult[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // 评估结果冲突：相同任务但评分差异大
    const scores = results
      .filter(r => typeof r.content === 'object' && r.content !== null)
      .map(r => ({
        agentName: r.agentName,
        score: this.extractScore(r.content),
      }));

    if (scores.length >= 2) {
      const maxScore = Math.max(...scores.map(s => s.score));
      const minScore = Math.min(...scores.map(s => s.score));
      const scoreDiff = maxScore - minScore;

      if (scoreDiff > 20) {
        conflicts.push({
          type: 'evaluation_conflict',
          agents: scores.map(s => s.agentName),
          details: `评分差异过大（${minScore} - ${maxScore}），差异 ${scoreDiff} 分`,
          resolution: this.resolveConflict(scores),
        });
      }
    }

    // 建议矛盾冲突
    const suggestions = results
      .filter(r => r.success && r.content)
      .map(r => ({ agentName: r.agentName, content: r.content }));

    if (suggestions.length >= 2) {
      conflicts.push({
        type: 'suggestion_conflict',
        agents: suggestions.map(s => s.agentName),
        details: '多个 Agent 给出不同建议',
        resolution: '优先级排序：置信度高的 Agent 优先',
      });
    }

    return conflicts;
  }

  /**
   * 从 Agent 结果中提取评分
   */
  private extractScore(content: unknown): number {
    if (typeof content === 'number') return content;
    if (typeof content === 'string') {
      const num = parseFloat(content);
      return isNaN(num) ? 50 : num;
    }
    if (typeof content === 'object' && content !== null) {
      const obj = content as Record<string, unknown>;
      return (obj.score as number) || (obj.overallScore as number) || 50;
    }
    return 50;
  }

  /**
   * 加权投票冲突解决
   */
  private resolveConflict(scores: { agentName: string; score: number }[]): string {
    // 按置信度权重（信任 evaluator 和 code_review 更高）
    const weights: Record<string, number> = {
      evaluator: 1.2,
      code_review: 1.1,
      tutor: 0.9,
      debug: 0.8,
    };

    const weighted = scores.map(s => ({
      agentName: s.agentName,
      weightedScore: s.score * (weights[s.agentName] || 1.0),
    }));

    const best = weighted.sort((a, b) => b.weightedScore - a.weightedScore)[0];
    return `加权投票：${best.agentName}（加权分 ${best.weightedScore.toFixed(0)}）优先`;
  }

  /**
   * 根据用户画像裁决建议冲突
   */
  resolveSuggestionConflict(
    results: AgentResult[],
    userLearningStyle?: string,
  ): { chosen: AgentResult; reason: string } {
    // 优先级：与用户学习风格匹配的 > 置信度 > 最新
    const prioritized = results.sort((a, b) => {
      const aMatch = userLearningStyle ? this.styleMatchScore(a.agentName, userLearningStyle) : 0;
      const bMatch = userLearningStyle ? this.styleMatchScore(b.agentName, userLearningStyle) : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.confidence - a.confidence;
    });

    return {
      chosen: prioritized[0],
      reason: `基于${userLearningStyle ? '学习风格匹配和' : ''}置信度排序后选择`,
    };
  }

  /**
   * 计算 Agent 与学习风格的匹配度
   */
  private styleMatchScore(agentName: string, style: string): number {
    const styleMap: Record<string, Record<string, number>> = {
      tutor: { visual: 0.8, hands_on: 0.7, theoretical: 0.9 },
      evaluator: { visual: 0.6, hands_on: 0.8, theoretical: 0.7 },
      code_review: { visual: 0.7, hands_on: 0.9, theoretical: 0.6 },
      debug: { visual: 0.6, hands_on: 0.8, theoretical: 0.7 },
    };
    return styleMap[agentName]?.[style] || 0.5;
  }

  /**
   * 获取 ACP 路由器（外部使用）
   */
  getRouter(): AcpRouter {
    return this.acpRouter;
  }
}
