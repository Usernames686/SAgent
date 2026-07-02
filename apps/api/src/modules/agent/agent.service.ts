import { Injectable, Logger } from '@nestjs/common';
import { LlmGateway } from './llm/llm.gateway';
import { OrchestratorAgent, AgentRequest } from './agents/orchestrator.agent';
import { TutorAgent } from './agents/tutor.agent';
import { EvaluatorAgent } from './agents/evaluator.agent';
import { DebugAgent } from './agents/debug.agent';
import { CodeReviewAgent } from './agents/code-review.agent';
import { KnowledgeGraphAgent } from './agents/knowledge-graph.agent';
import { InterviewAgent } from './agents/interview.agent';
import { MentorAgent } from './agents/mentor.agent';
import { AgentOrchestrator, CollaborationTask, AgentResult, Conflict } from './acp/agent-orchestrator';
import { VibeCodingService, VibeCodingRequest } from './vibe/vibe-coding.service';
import { FeedbackService } from './vibe/feedback.service';
import { v4 as uuid } from 'uuid';

/**
 * 意图到协作配置的映射
 * 根据设计文档 3.12-3.14 节，定义串行/并行/条件/降级协作模式
 */
interface CollaborationConfig {
  mode: 'serial' | 'parallel' | 'conditional';
  agents: string[];
  condition?: CollaborationTask['condition'];
}

const INTENT_COLLABORATION_MAP: Record<string, CollaborationConfig> = {
  // 代码提交：Evaluator + Code Review 并行评估
  code_submit: {
    mode: 'parallel',
    agents: ['evaluator', 'code_review'],
  },
  // 代码出错：Debug 先定位，再由 Tutor 解释
  code_error: {
    mode: 'serial',
    agents: ['debug', 'tutor'],
  },
  // 概念提问：Tutor 单 Agent
  concept_question: {
    mode: 'serial',
    agents: ['tutor'],
  },
  // 路径请求：Tutor 单 Agent
  path_request: {
    mode: 'serial',
    agents: ['tutor'],
  },
  // 面试准备：Tutor 单 Agent
  interview_prep: {
    mode: 'serial',
    agents: ['tutor'],
  },
  // 氛围描述：Tutor 单 Agent
  vibe_describe: {
    mode: 'serial',
    agents: ['tutor'],
  },
  // Prompt 优化：Tutor 单 Agent
  prompt_optimize: {
    mode: 'serial',
    agents: ['tutor'],
  },
  // 闲聊：Tutor 单 Agent
  chat: {
    mode: 'serial',
    agents: ['tutor'],
  },
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly llm: LlmGateway;
  private readonly orchestratorAgent: OrchestratorAgent;
  private readonly tutorAgent: TutorAgent;
  private readonly evaluatorAgent: EvaluatorAgent;
  private readonly debugAgent: DebugAgent;
  private readonly codeReviewAgent: CodeReviewAgent;
  private readonly knowledgeGraphAgent: KnowledgeGraphAgent;
  private readonly interviewAgent: InterviewAgent;
  private readonly mentorAgent: MentorAgent;
  private readonly agentOrchestrator: AgentOrchestrator;
  private readonly vibeService: VibeCodingService;
  private readonly feedbackService: FeedbackService;

  constructor() {
    this.llm = new LlmGateway();
    this.orchestratorAgent = new OrchestratorAgent(this.llm);
    this.tutorAgent = new TutorAgent(this.llm);
    this.evaluatorAgent = new EvaluatorAgent(this.llm);
    this.debugAgent = new DebugAgent(this.llm);
    this.codeReviewAgent = new CodeReviewAgent(this.llm);
    this.knowledgeGraphAgent = new KnowledgeGraphAgent();
    this.interviewAgent = new InterviewAgent(this.llm);
    this.mentorAgent = new MentorAgent(this.llm);
    this.vibeService = new VibeCodingService(this.llm);
    this.feedbackService = new FeedbackService();

    // 初始化 AgentOrchestrator（ACP 路由器 + 协作编排）
    this.agentOrchestrator = new AgentOrchestrator(
      this.llm,
      this.orchestratorAgent,
      this.tutorAgent,
      this.evaluatorAgent,
      this.debugAgent,
      this.codeReviewAgent,
    );
  }

  getLlmStatus() {
    return this.llm.getStatus();
  }

  // 对话上下文缓存（sessionId → 最近5轮消息）
  private readonly contextCache = new Map<string, { role: 'user' | 'assistant'; content: string }[]>();
  private readonly MAX_CONTEXT_TURNS = 5;

  /**
   * AI 对话 — 通过 OrchestratorAgent 路由意图，再由 AgentOrchestrator 执行协作
   * 支持对话上下文管理（最近5轮）+ 知识点上下文注入
   */
  async chat(params: {
    userId: string;
    sessionId: string;
    message: string;
    userLevel?: string;
    currentCode?: string;
    knowledgeState?: Record<string, number>;
  }) {
    // 维护对话上下文
    const sid = params.sessionId || uuid();
    const history = this.contextCache.get(sid) || [];
    history.push({ role: 'user', content: params.message });
    if (history.length > this.MAX_CONTEXT_TURNS * 2) {
      history.splice(0, history.length - this.MAX_CONTEXT_TURNS * 2);
    }

    const request: AgentRequest = {
      userId: params.userId,
      sessionId: sid,
      userLevel: params.userLevel || 'beginner',
      currentCode: params.currentCode,
      knowledgeState: params.knowledgeState,
      message: params.message,
    };

    // 1. 通过 OrchestratorAgent 识别意图
    const route = await this.orchestratorAgent.route(request);

    // 2. 根据意图获取协作配置
    const collaboration = INTENT_COLLABORATION_MAP[route.agentType] || INTENT_COLLABORATION_MAP.chat;

    // 3. 构建 ACP 协作任务
    const task: CollaborationTask = {
      id: uuid(),
      mode: collaboration.mode,
      agents: collaboration.agents,
      request,
      context: {
        userId: params.userId,
        sessionId: params.sessionId,
      },
      condition: collaboration.condition,
    };

    // 4. 通过 AgentOrchestrator 执行协作
    const { results, conflicts } = await this.agentOrchestrator.executeTask(task);

    // 5. 聚合结果
    const successfulResults = results.filter(r => r.success);
    const primaryResult = successfulResults.length > 0 ? successfulResults[0] : results[0];

    // 如果有冲突，通过置信度裁决
    let resolvedContent = primaryResult?.content;
    if (conflicts.length > 0 && successfulResults.length > 1) {
      const resolved = this.agentOrchestrator.resolveSuggestionConflict(successfulResults);
      resolvedContent = resolved.chosen.content;
      this.logger.log(`协作冲突已解决: ${resolved.reason}`);
    }

    // 串行模式下，取最后一个 Agent 的输出
    if (collaboration.mode === 'serial' && successfulResults.length > 1) {
      resolvedContent = successfulResults[successfulResults.length - 1].content;
    }

    // 保存 AI 回复到上下文缓存
    const replyText = typeof resolvedContent === 'string' ? resolvedContent : JSON.stringify(resolvedContent);
    if (replyText) {
      history.push({ role: 'assistant', content: replyText });
      this.contextCache.set(sid, history);
    }

    return {
      agentType: route.agentType,
      confidence: route.confidence,
      collaborationMode: collaboration.mode,
      agents: collaboration.agents,
      content: typeof resolvedContent === 'object' ? JSON.stringify(resolvedContent) : (resolvedContent || ''),
      tokens: results.reduce((sum, r) => sum + (r.content ? String(r.content).length : 0), 0),
      latencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0),
      conflicts: conflicts.length > 0 ? conflicts.map(c => ({ type: c.type, resolution: c.resolution })) : undefined,
    };
  }

  /**
   * 代码评估 — Evaluator + Code Review 并行协作
   */
  async evaluate(params: {
    userId: string;
    code: string;
    exerciseDescription: string;
    knowledgeState?: Record<string, number>;
  }) {
    const request: AgentRequest = {
      userId: params.userId,
      sessionId: '',
      userLevel: 'intermediate',
      knowledgeState: params.knowledgeState,
      message: params.code,
    };

    // 使用并行协作模式：Evaluator + Code Review 同时评估
    const task: CollaborationTask = {
      id: uuid(),
      mode: 'parallel',
      agents: ['evaluator', 'code_review'],
      request,
      context: {
        userId: params.userId,
        sessionId: '',
      },
    };

    const { results, conflicts } = await this.agentOrchestrator.executeTask(task);

    // 聚合结果：评估结果 + 代码审查
    const evalResult = results.find(r => r.agentName === 'evaluator' && r.success);
    const reviewResult = results.find(r => r.agentName === 'code_review' && r.success);

    return {
      evaluation: evalResult?.content || null,
      codeReview: reviewResult?.content || null,
      conflicts: conflicts.length > 0 ? conflicts.map(c => ({ type: c.type, resolution: c.resolution })) : undefined,
      latencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0),
    };
  }

  /**
   * 调试辅助 — Debug + Tutor 串行协作
   */
  async debug(params: {
    userId: string;
    code: string;
    error: string;
    logs?: string;
  }) {
    const request: AgentRequest = {
      userId: params.userId,
      sessionId: '',
      userLevel: 'intermediate',
      message: `${params.error}\n${params.logs || ''}`,
      currentCode: params.code,
    };

    // 串行协作：先 Debug 定位问题，再 Tutor 解释
    const task: CollaborationTask = {
      id: uuid(),
      mode: 'serial',
      agents: ['debug', 'tutor'],
      request,
      context: {
        userId: params.userId,
        sessionId: '',
      },
    };

    const { results } = await this.agentOrchestrator.executeTask(task);

    // 串行模式：取最后一个 Agent 的输出作为最终解释
    const lastSuccess = [...results].reverse().find(r => r.success);

    return {
      debugResult: results.find(r => r.agentName === 'debug')?.content || null,
      explanation: lastSuccess?.content || null,
      latencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0),
    };
  }

  /**
   * 代码审查 — 直接调用 Code Review Agent
   */
  async review(params: { code: string; language: string; context?: string }) {
    return this.codeReviewAgent.review(params.code, params.language, params.context);
  }

  /**
   * 面试题生成 — 直接调用 Interview Agent
   */
  async generateInterviewQuestions(params: { role: string; count: number; focusAreas?: string[] }) {
    return this.interviewAgent.generateQuestions(params.role, params.count, params.focusAreas);
  }

  /**
   * 面试答案评估 — 直接调用 Interview Agent
   */
  async evaluateInterviewAnswer(params: {
    role: string;
    questions: Array<{ id: string; type: string; difficulty: number; question: string; expectedAnswer?: string; hints?: string[]; timeLimit?: number }>;
    answers: Array<{ questionId: string; answer: string; score?: number; feedback?: string }>;
  }) {
    const questionsTyped = params.questions.map(q => ({
      id: q.id,
      type: (q.type || 'concept') as 'concept' | 'coding' | 'system_design' | 'behavioral' | 'scenario',
      difficulty: (q.difficulty || 3) as 1 | 2 | 3 | 4 | 5,
      question: q.question,
      expectedAnswer: q.expectedAnswer,
      hints: q.hints,
      timeLimit: q.timeLimit,
    }));
    const answersTyped = await Promise.all(params.answers.map(async (answer) => {
      const question = questionsTyped.find(q => q.id === answer.questionId);
      if (!question) {
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          score: answer.score || 0,
          feedback: answer.feedback || '未找到对应题目',
        };
      }
      const evaluated = answer.score
        ? { score: answer.score, feedback: answer.feedback || '已评分', improvements: [] }
        : await this.interviewAgent.evaluateAnswer(question, answer.answer);
      return {
        questionId: answer.questionId,
        answer: answer.answer,
        score: evaluated.score,
        feedback: evaluated.feedback,
        improvements: evaluated.improvements,
      };
    }));
    const session = {
      id: `interview-${Date.now()}`,
      role: params.role,
      questions: questionsTyped,
      currentIndex: questionsTyped.length - 1,
      answers: answersTyped,
      weakPoints: [],
    };
    return {
      ...this.interviewAgent.generateReport(session as any),
      answerReviews: answersTyped,
    };
  }

  /**
   * 氛围编程 — 描述式生成
   */
  async vibeCoding(params: {
    userId: string;
    sessionId: string;
    vibe: string;
    requirements: string;
    constraints?: string;
    userLevel?: string;
  }) {
    return this.vibeService.execute({
      mode: 'vibe_describe',
      userId: params.userId,
      sessionId: params.sessionId,
      vibeKeywords: params.vibe,
      functionDescription: params.requirements,
      technicalConstraints: params.constraints,
    });
  }

  /**
   * 氛围编程 — 交互
   */
  async vibeInteract(params: VibeCodingRequest) {
    return this.vibeService.execute(params);
  }

  /**
   * 实时代码反馈
   */
  async getCodeFeedback(code: string, language?: string, cursorLine?: number, cursorColumn?: number) {
    const feedbacks = this.feedbackService.getFullFeedback(code);

    if (cursorLine && cursorColumn) {
      const completions = this.feedbackService.suggestCompletion(code, cursorLine, cursorColumn);
      feedbacks.push(...completions);
    }

    return {
      feedbacks: feedbacks.sort((a, b) => {
        const order = { error: 0, warning: 1, info: 2, success: 3 };
        return (order[a.severity] || 0) - (order[b.severity] || 0);
      }),
      summary: {
        total: feedbacks.length,
        errors: feedbacks.filter(f => f.severity === 'error').length,
        warnings: feedbacks.filter(f => f.severity === 'warning').length,
        infos: feedbacks.filter(f => f.severity === 'info').length,
      },
    };
  }

  /**
   * 氛围匹配度评估
   */
  async evaluateVibeMatch(code: string, expectedStyle: string, expectedKeywords: string[]) {
    return this.vibeService.evaluateVibeMatch(code, expectedStyle, expectedKeywords);
  }
}
