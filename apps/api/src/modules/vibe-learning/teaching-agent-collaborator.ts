/**
 * 多 Agent 协作教学策略引擎
 *
 * 设计理念：
 * 1. 基于学习者状态和自适应决策，智能选择和编排多个教学 Agent
 * 2. 整合现有 AgentOrchestrator 的 ACP 协议和协作模式
 * 3. 定义教学场景 → Agent 协作流程的映射
 * 4. 根据学生画像、学习阶段、情绪状态动态调整教学策略
 *
 * 核心能力：
 * - 教学 Flow 编排：将学习步骤翻译为 Agent 协作任务
 * - 策略选择：根据学生画像选择不同教学策略组合
 * - 情绪感知：集成 MentorAgent 的情绪检测，动态调整策略
 * - 冲突解决：当多个 Agent 给出矛盾建议时进行调和
 * - 上下文传递：Agent 之间共享学习者上下文，避免重复询问
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AgentOrchestrator,
  CollaborationTask,
  CollaborationMode,
  AgentResult,
  Conflict,
} from '../agent/acp/agent-orchestrator';
import { AgentRequest } from '../agent/agents/orchestrator.agent';
import {
  AdaptiveLearningEngine,
  LearnerState,
  AdaptiveDecision,
  StudentProfileType,
} from './adaptive-learning.engine';
import { EmotionalState } from '../agent/agents/mentor.agent';

// ===== 教学场景类型 =====

export type TeachingScenario =
  | 'concept_introduction'    // 概念引入 — 新知识点首次学习
  | 'concept_reinforcement'   // 概念巩固 — 通过练习加深理解
  | 'debugging_assistance'    // 调试帮助 — 代码出错需要指导
  | 'code_evaluation'         // 代码评估 — 提交代码需要反馈
  | 'knowledge_review'        // 知识复习 — 衰减后重新巩固
  | 'interview_preparation'   // 面试准备 — 综合能力检测
  | 'project_guidance'        // 项目指导 — 综合项目实战
  | 'emotion_support'         // 情绪支持 — 挫败感强需要鼓励
  | 'free_chat';              // 自由聊天 — 开放式学习

// ===== 教学策略 =====

export interface TeachingStrategy {
  /** 策略ID */
  id: string;
  /** 策略名称 */
  name: string;
  /** 适用场景 */
  scenario: TeachingScenario;
  /** 适用画像 */
  applicableProfiles: StudentProfileType[];
  /** Agent 协作流程（按顺序执行） */
  agentFlow: AgentFlowStep[];
  /** 协作模式 */
  collaborationMode: CollaborationMode;
  /** 策略描述 */
  description: string;
  /** 期望学习效果 */
  expectedOutcome: string;
}

// ===== Agent 流程步骤 =====

export interface AgentFlowStep {
  /** Agent 名称 */
  agent: string;
  /** 调用的动作 */
  action: string;
  /** 输入参数模板（支持变量插值） */
  parameterTemplate: Record<string, string>;
  /** 期望输出字段 */
  expectedOutput: string[];
  /** 条件：是否执行此步骤（变量插值） */
  condition?: string;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
}

// ===== 教学会话上下文 =====

export interface TeachingContext {
  /** 用户ID */
  userId: string;
  /** 会话ID */
  sessionId: string;
  /** 学习者状态 */
  learnerState: LearnerState;
  /** 自适应决策 */
  adaptiveDecision: AdaptiveDecision;
  /** 当前教学场景 */
  scenario: TeachingScenario;
  /** 情绪状态（可选） */
  emotionalState?: EmotionalState;
  /** 当前知识点 ID */
  currentNodeId: string;
  /** 当前知识点名称 */
  currentNodeName: string;
  /** 用户消息/代码 */
  userMessage: string;
  /** 上下文变量（Agent 之间共享） */
  sharedVariables: Record<string, unknown>;
  /** 历史交互（用于情绪分析和上下文理解） */
  recentInteractions: { timestamp: Date; content: string; role: 'user' | 'assistant' }[];
}

// ===== 教学结果 =====

export interface TeachingResult {
  /** 场景类型 */
  scenario: TeachingScenario;
  /** 使用的策略 */
  strategyId: string;
  /** 各 Agent 执行结果 */
  agentResults: AgentResult[];
  /** 合成后的教学内容 */
  synthesizedContent: string;
  /** 推荐的下一步动作 */
  recommendedNextAction: {
    type: 'continue' | 'switch_mode' | 'review' | 'take_break' | 'advance';
    targetNodeId?: string;
    targetMode?: string;
    reason: string;
  };
  /** 学习者状态更新 */
  learnerStateUpdate: Partial<LearnerState>;
  /** 冲突（如有） */
  conflicts: Conflict[];
  /** 教学反思 — 对本次教学效果的自我评估 */
  reflection: string;
}

@Injectable()
export class TeachingAgentCollaborator {
  private readonly logger = new Logger(TeachingAgentCollaborator.name);

  // 预定义的教学策略库
  private readonly strategies: TeachingStrategy[];

  constructor(
    private readonly orchestrator: AgentOrchestrator,
    private readonly adaptiveEngine: AdaptiveLearningEngine,
  ) {
    this.strategies = this.buildStrategyLibrary();
  }

  // ===== 核心入口：执行教学 =====

  /**
   * 根据教学上下文选择并执行最佳教学策略
   */
  async executeTeaching(context: TeachingContext): Promise<TeachingResult> {
    const { scenario, learnerState, adaptiveDecision } = context;

    // 1. 选择最佳策略
    const strategy = this.selectStrategy(scenario, learnerState.profileType, context);
    this.logger.log(`为用户 ${context.userId} 选择策略: ${strategy.name} (${strategy.id})`);

    // 2. 构建 Agent 协作任务
    const task = this.buildCollaborationTask(strategy, context);

    // 3. 通过 AgentOrchestrator 执行
    const { results, conflicts } = await this.orchestrator.executeTask(task);

    // 4. 合成教学内容
    const synthesizedContent = this.synthesizeContent(results, strategy, context);

    // 5. 推荐下一步动作
    const recommendedNextAction = this.recommendNextAction(results, adaptiveDecision, learnerState);

    // 6. 更新学习者状态
    const learnerStateUpdate = this.computeLearnerStateUpdate(results, context);

    // 7. 生成教学反思
    const reflection = this.generateReflection(results, conflicts, strategy, context);

    return {
      scenario,
      strategyId: strategy.id,
      agentResults: results,
      synthesizedContent,
      recommendedNextAction,
      learnerStateUpdate,
      conflicts,
      reflection,
    };
  }

  /**
   * 识别教学场景 — 基于用户行为和上下文
   */
  identifyScenario(context: Partial<TeachingContext>): TeachingScenario {
    const { learnerState, adaptiveDecision, emotionalState, userMessage } = context;

    // 情绪优先：如果挫败感很高，先提供情绪支持
    if (emotionalState && emotionalState.frustrationLevel > 0.7) {
      return 'emotion_support';
    }

    // 基于自适应决策的模式
    if (adaptiveDecision) {
      switch (adaptiveDecision.recommendedMode) {
        case 'review':
          return 'knowledge_review';
        case 'project':
          return 'project_guidance';
        case 'reading':
          return 'concept_introduction';
        case 'quiz':
          return 'concept_reinforcement';
        case 'coding':
          // 区分是首次编码还是提交评估
          if (userMessage && this.looksLikeCode(userMessage)) {
            return 'code_evaluation';
          }
          return 'concept_reinforcement';
        case 'chat':
          return 'free_chat';
      }
    }

    // 基于消息内容判断
    if (userMessage) {
      if (this.containsErrorKeywords(userMessage)) return 'debugging_assistance';
      if (this.containsInterviewKeywords(userMessage)) return 'interview_preparation';
      if (this.looksLikeCode(userMessage)) return 'code_evaluation';
    }

    // 默认：概念引入
    return 'concept_introduction';
  }

  /**
   * 获取当前可用的教学策略列表（用于展示给前端）
   */
  getAvailableStrategies(profileType: StudentProfileType): TeachingStrategy[] {
    return this.strategies.filter(s =>
      s.applicableProfiles.includes(profileType) || s.applicableProfiles.length === 0
    );
  }

  /**
   * 快速教学 — 不经过 AgentOrchestrator，直接调用单个 Agent
   * 适用于简单场景，减少延迟
   */
  async quickTeach(
    agentName: string,
    context: TeachingContext,
    action: string = 'execute',
  ): Promise<AgentResult> {
    const request: AgentRequest = {
      userId: context.userId,
      sessionId: context.sessionId,
      userLevel: context.learnerState.profileType,
      currentCode: context.userMessage,
      knowledgeState: context.learnerState.knowledgeMastery,
      message: context.userMessage,
    };

    const task: CollaborationTask = {
      id: `quick-${Date.now()}`,
      mode: 'serial',
      agents: [agentName],
      request,
      context: {
        userId: context.userId,
        sessionId: context.sessionId,
      },
    };

    const { results } = await this.orchestrator.executeTask(task);
    return results[0] || {
      agentName,
      content: '暂时无法响应，请稍后再试',
      confidence: 0,
      latencyMs: 0,
      success: false,
    };
  }

  // ===== 策略库构建 =====

  private buildStrategyLibrary(): TeachingStrategy[] {
    return [
      // ===== 策略 1: 概念引入（苏格拉底式）=====
      {
        id: 'strategy-concept-intro-socratic',
        name: '苏格拉底式概念引入',
        scenario: 'concept_introduction',
        applicableProfiles: ['beginner', 'transition'],
        collaborationMode: 'serial',
        description: '通过提问引导思考，再用 Tutor 深入讲解，最后 Quiz 验证',
        expectedOutcome: '理解基本概念，能回答简单问题',
        agentFlow: [
          {
            agent: 'tutor',
            action: 'explain',
            parameterTemplate: {
              message: '请以苏格拉底式引导的方式讲解：{{currentNodeName}}。先提问引导思考，再给出详细解释和代码示例。',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'tutor',
            action: 'quiz_hint',
            parameterTemplate: {
              message: '为刚才讲解的 {{currentNodeName}} 生成一道简单的理解测试题，检验学生是否理解了核心概念。',
            },
            expectedOutput: ['content'],
            condition: '{{streakCorrect}} < 1',
          },
        ],
      },

      // ===== 策略 2: 概念引入（直接讲解式）=====
      {
        id: 'strategy-concept-intro-direct',
        name: '直接讲解式概念引入',
        scenario: 'concept_introduction',
        applicableProfiles: ['advanced'],
        collaborationMode: 'serial',
        description: '有经验者直接给出精炼讲解 + 底层原理',
        expectedOutcome: '快速理解概念本质，跳过基础部分',
        agentFlow: [
          {
            agent: 'tutor',
            action: 'explain',
            parameterTemplate: {
              message: '请简洁深入地讲解：{{currentNodeName}}。聚焦底层原理和设计思想，不需要过于基础的解释。可以与 Java/Python 等语言做对比。',
            },
            expectedOutput: ['content'],
          },
        ],
      },

      // ===== 策略 3: 概念巩固（Quiz + 编码练习）=====
      {
        id: 'strategy-reinforcement-quiz-code',
        name: 'Quiz + 编码巩固',
        scenario: 'concept_reinforcement',
        applicableProfiles: ['beginner', 'transition', 'advanced'],
        collaborationMode: 'serial',
        description: '先 Quiz 测试理解，再编码练习巩固',
        expectedOutcome: '能够应用概念解决实际问题',
        agentFlow: [
          {
            agent: 'tutor',
            action: 'quiz',
            parameterTemplate: {
              message: '请为 {{currentNodeName}} 生成 2-3 道练习题（包含选择题和简答题），难度等级 {{recommendedDifficulty}}。',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'tutor',
            action: 'exercise',
            parameterTemplate: {
              message: '请为 {{currentNodeName}} 设计一道编码练习，难度 {{recommendedDifficulty}}。提供代码模板和提示。',
            },
            expectedOutput: ['content'],
          },
        ],
      },

      // ===== 策略 4: 调试帮助（Debug + Tutor 协作）=====
      {
        id: 'strategy-debug-guide',
        name: '引导式调试',
        scenario: 'debugging_assistance',
        applicableProfiles: ['beginner', 'transition', 'advanced'],
        collaborationMode: 'serial',
        description: 'Debug Agent 定位问题，Tutor Agent 教学式讲解修复方法',
        expectedOutcome: '理解错误原因，能独立修复并预防类似错误',
        agentFlow: [
          {
            agent: 'debug',
            action: 'debug',
            parameterTemplate: {
              message: '{{userMessage}}',
              errorInfo: '{{errorInfo}}',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'tutor',
            action: 'explain_fix',
            parameterTemplate: {
              message: '刚才 Debug Agent 发现了以下问题：{{debug_result}}。请用教学的方式解释为什么会出错，以及如何避免类似错误。不要直接给答案，引导学生思考。',
            },
            expectedOutput: ['content'],
            condition: '{{profileType}} != "advanced"',
          },
        ],
      },

      // ===== 策略 5: 代码评估（Evaluator + CodeReview + Tutor）=====
      {
        id: 'strategy-code-eval-full',
        name: '全面代码评估',
        scenario: 'code_evaluation',
        applicableProfiles: ['beginner', 'transition', 'advanced'],
        collaborationMode: 'parallel',
        description: '同时评估正确性和代码质量，合并反馈',
        expectedOutcome: '全面了解代码优缺点，获得具体改进建议',
        agentFlow: [
          {
            agent: 'evaluator',
            action: 'evaluate',
            parameterTemplate: {
              message: '{{userMessage}}',
              code: '{{userMessage}}',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'code_review',
            action: 'review',
            parameterTemplate: {
              message: '{{userMessage}}',
            },
            expectedOutput: ['content'],
          },
        ],
      },

      // ===== 策略 6: 知识复习（间隔重复）=====
      {
        id: 'strategy-review-spaced',
        name: '间隔重复复习',
        scenario: 'knowledge_review',
        applicableProfiles: ['beginner', 'transition', 'advanced'],
        collaborationMode: 'serial',
        description: '提供精简回顾 + Quiz 验证 + 关联知识强化',
        expectedOutcome: '恢复知识掌握度，加深记忆',
        agentFlow: [
          {
            agent: 'tutor',
            action: 'review',
            parameterTemplate: {
              message: '请用简洁的方式回顾 {{currentNodeName}} 的核心要点（3-5 条）。这是复习，不需要从头讲解。',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'tutor',
            action: 'quiz',
            parameterTemplate: {
              message: '请为复习的 {{currentNodeName}} 生成 2 道应用题，难度比上次略高（{{recommendedDifficulty}}），测试是否真正理解。',
            },
            expectedOutput: ['content'],
          },
        ],
      },

      // ===== 策略 7: 面试准备 =====
      {
        id: 'strategy-interview-prep',
        name: '面试强化训练',
        scenario: 'interview_preparation',
        applicableProfiles: ['transition', 'advanced'],
        collaborationMode: 'serial',
        description: 'Interview Agent 出题 → 用户回答 → 评估 → 补充讲解',
        expectedOutcome: '提升面试表现，发现薄弱环节',
        agentFlow: [
          {
            agent: 'interview',
            action: 'generate_questions',
            parameterTemplate: {
              message: '请为前端/全栈开发岗位生成面试题，聚焦 {{currentNodeName}} 相关领域。',
            },
            expectedOutput: ['content'],
          },
        ],
      },

      // ===== 策略 8: 项目指导 =====
      {
        id: 'strategy-project-guide',
        name: '项目实战指导',
        scenario: 'project_guidance',
        applicableProfiles: ['transition', 'advanced'],
        collaborationMode: 'conditional',
        description: '根据项目进度提供架构建议和代码指导',
        expectedOutcome: '完成项目功能，提升综合能力',
        agentFlow: [
          {
            agent: 'tutor',
            action: 'project_architecture',
            parameterTemplate: {
              message: '请根据当前学习进度，建议一个合适的实战项目或项目下一步功能。已掌握知识点：{{masteredNodes}}。',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'code_review',
            action: 'review',
            parameterTemplate: {
              message: '{{userMessage}}',
            },
            expectedOutput: ['content'],
            condition: '{{hasCode}} == true',
          },
        ],
      },

      // ===== 策略 9: 情绪支持 =====
      {
        id: 'strategy-emotion-support',
        name: '情绪支持 + 学习调整',
        scenario: 'emotion_support',
        applicableProfiles: ['beginner', 'transition', 'advanced'],
        collaborationMode: 'serial',
        description: '先鼓励，再调整学习节奏，推荐更简单的内容',
        expectedOutcome: '降低挫败感，恢复学习信心',
        agentFlow: [
          {
            agent: 'mentor',
            action: 'encourage',
            parameterTemplate: {
              message: '学生感到挫败。连续答错 {{streakWrong}} 次，掌握度 {{masteryProbability}}。请给出鼓励性反馈和学习建议。',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'tutor',
            action: 'simplify',
            parameterTemplate: {
              message: '请用更简单的方式重新讲解 {{currentNodeName}}，使用更多类比和生活化示例。降低到难度 1-2。',
            },
            expectedOutput: ['content'],
          },
        ],
      },

      // ===== 策略 10: 自由聊天（Tutor + Knowledge Graph）=====
      {
        id: 'strategy-free-chat',
        name: '开放式学习对话',
        scenario: 'free_chat',
        applicableProfiles: ['beginner', 'transition', 'advanced'],
        collaborationMode: 'serial',
        description: 'Tutor 回答问题，Knowledge Graph 推荐相关知识点',
        expectedOutcome: '解答疑问，引导到系统化学习',
        agentFlow: [
          {
            agent: 'tutor',
            action: 'explain',
            parameterTemplate: {
              message: '{{userMessage}}',
            },
            expectedOutput: ['content'],
          },
        ],
      },

      // ===== 策略 11: 新手特制 — 手把手教学 =====
      {
        id: 'strategy-beginner-handhold',
        name: '新手手把手教学',
        scenario: 'concept_introduction',
        applicableProfiles: ['beginner'],
        collaborationMode: 'serial',
        description: '零基础友好：极慢节奏，大量示例，每步确认理解',
        expectedOutcome: '即使零基础也能理解核心概念',
        agentFlow: [
          {
            agent: 'tutor',
            action: 'explain',
            parameterTemplate: {
              message: '请用最简单的方式讲解 {{currentNodeName}}，假设学生完全没有编程经验。使用生活化的类比，每讲一个概念就给一个小示例。最后用一道超简单的选择题确认理解。',
            },
            expectedOutput: ['content'],
          },
          {
            agent: 'mentor',
            action: 'encourage',
            parameterTemplate: {
              message: '学生刚开始学习 {{currentNodeName}}，请给一段简短的鼓励，让他们感觉编程并不难。',
            },
            expectedOutput: ['content'],
          },
        ],
      },
    ];
  }

  // ===== 策略选择 =====

  private selectStrategy(
    scenario: TeachingScenario,
    profileType: StudentProfileType,
    context: TeachingContext,
  ): TeachingStrategy {
    // 筛选匹配场景和画像的策略
    const candidates = this.strategies.filter(s =>
      s.scenario === scenario &&
      (s.applicableProfiles.includes(profileType) || s.applicableProfiles.length === 0)
    );

    if (candidates.length === 0) {
      // 降级到默认策略
      this.logger.warn(`未找到匹配的策略: scenario=${scenario}, profile=${profileType}，使用默认策略`);
      return this.getDefaultStrategy(scenario);
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // 多个候选策略时，根据上下文进一步筛选
    return this.rankStrategies(candidates, context);
  }

  private rankStrategies(candidates: TeachingStrategy[], context: TeachingContext): TeachingStrategy {
    const { learnerState, emotionalState } = context;

    // 打分排序
    const scored = candidates.map(strategy => {
      let score = 0;

      // 情绪因素：挫败感高时优先选择有 Mentor 的策略
      if (emotionalState && emotionalState.frustrationLevel > 0.5) {
        const hasMentor = strategy.agentFlow.some(step => step.agent === 'mentor');
        if (hasMentor) score += 2;
      }

      // 连续答错时优先简单的策略
      if (learnerState.streakWrong >= 3) {
        score -= strategy.agentFlow.length * 0.5; // 步骤少 = 更简单
      }

      // 连续答对时可以选择更丰富的策略
      if (learnerState.streakCorrect >= 3) {
        score += strategy.agentFlow.length * 0.3; // 步骤多 = 更丰富
      }

      // 新手画像偏向有 Mentor 的策略
      if (learnerState.profileType === 'beginner') {
        const hasMentor = strategy.agentFlow.some(step => step.agent === 'mentor');
        if (hasMentor) score += 1;
      }

      return { strategy, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].strategy;
  }

  private getDefaultStrategy(scenario: TeachingScenario): TeachingStrategy {
    // 兜底策略：只用 Tutor
    return {
      id: 'strategy-default',
      name: '默认教学策略',
      scenario,
      applicableProfiles: ['beginner', 'transition', 'advanced'],
      collaborationMode: 'serial',
      description: '简单的 Tutor 讲解',
      expectedOutcome: '理解基本概念',
      agentFlow: [
        {
          agent: 'tutor',
          action: 'explain',
          parameterTemplate: {
            message: '{{userMessage}}',
          },
          expectedOutput: ['content'],
        },
      ],
    };
  }

  // ===== 构建 Agent 协作任务 =====

  private buildCollaborationTask(strategy: TeachingStrategy, context: TeachingContext): CollaborationTask {
    // 过滤满足条件的 Agent 步骤
    const activeSteps = strategy.agentFlow.filter(step => {
      if (!step.condition) return true;
      return this.evaluateCondition(step.condition, context);
    });

    const agentNames = activeSteps.map(step => step.agent);

    // 构建参数化的消息
    const parameterizedMessage = this.buildParameterizedMessage(activeSteps, context);

    const request: AgentRequest = {
      userId: context.userId,
      sessionId: context.sessionId,
      userLevel: context.learnerState.profileType,
      currentCode: context.userMessage,
      knowledgeState: context.learnerState.knowledgeMastery,
      message: parameterizedMessage,
    };

    return {
      id: `teach-${context.userId}-${Date.now()}`,
      mode: strategy.collaborationMode,
      agents: agentNames,
      request,
      context: {
        userId: context.userId,
        sessionId: context.sessionId,
      },
    };
  }

  /**
   * 参数插值 — 将 {{variable}} 替换为上下文中的实际值
   */
  private buildParameterizedMessage(steps: AgentFlowStep[], context: TeachingContext): string {
    // 如果只有一个步骤，直接使用其参数模板中的 message
    if (steps.length === 1 && steps[0].parameterTemplate.message) {
      return this.interpolate(steps[0].parameterTemplate.message, context);
    }

    // 多步骤时，组合所有参数作为主消息
    const parts = steps.map(step => {
      const params = Object.entries(step.parameterTemplate)
        .map(([key, value]) => `${key}: ${this.interpolate(value, context)}`)
        .join('\n');
      return `[${step.agent}.${step.action}]\n${params}`;
    });

    return parts.join('\n\n');
  }

  private interpolate(template: string, context: TeachingContext): string {
    const vars: Record<string, string> = {
      currentNodeId: context.currentNodeId,
      currentNodeName: context.currentNodeName,
      userId: context.userId,
      userMessage: context.userMessage,
      profileType: context.learnerState.profileType,
      streakCorrect: String(context.learnerState.streakCorrect),
      streakWrong: String(context.learnerState.streakWrong),
      masteryProbability: String(context.adaptiveDecision.masteryProbability.toFixed(2)),
      recommendedDifficulty: String(context.adaptiveDecision.recommendedDifficulty),
      hasCode: String(this.looksLikeCode(context.userMessage)),
      masteredNodes: Object.entries(context.learnerState.knowledgeMastery)
        .filter(([, v]) => v >= 0.85)
        .map(([k]) => k)
        .join(', '),
      errorInfo: context.sharedVariables.errorInfo as string || '',
      debug_result: context.sharedVariables.debug_result as string || '',
    };

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }

  private evaluateCondition(condition: string, context: TeachingContext): boolean {
    // 简单条件解析：{{variable}} == "value" 或 {{variable}} != "value"
    const interpolated = this.interpolate(condition, context);

    const equalMatch = interpolated.match(/^(.+?)\s*==\s*"?(\w+)"?$/);
    if (equalMatch) {
      return equalMatch[1].trim() === equalMatch[2].trim();
    }

    const notEqualMatch = interpolated.match(/^(.+?)\s*!=\s*"?(\w+)"?$/);
    if (notEqualMatch) {
      return notEqualMatch[1].trim() !== notEqualMatch[2].trim();
    }

    // 数值比较
    const gtMatch = interpolated.match(/^(.+?)\s*>\s*(\d+)$/);
    if (gtMatch) {
      return Number(gtMatch[1].trim()) > Number(gtMatch[2].trim());
    }

    const ltMatch = interpolated.match(/^(.+?)\s*<\s*(\d+)$/);
    if (ltMatch) {
      return Number(ltMatch[1].trim()) < Number(ltMatch[2].trim());
    }

    // 默认为 true
    return true;
  }

  // ===== 内容合成 =====

  private synthesizeContent(
    results: AgentResult[],
    strategy: TeachingStrategy,
    context: TeachingContext,
  ): string {
    if (results.length === 0) {
      return '暂时无法生成教学内容，请稍后再试。';
    }

    if (results.length === 1) {
      return String(results[0].content || '');
    }

    // 多个 Agent 结果合成
    const sections: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result.success || !result.content) continue;

      const step = strategy.agentFlow[i];
      const agentLabel = this.getAgentLabel(step?.agent || result.agentName);

      // 根据策略类型决定是否添加标签
      if (strategy.collaborationMode === 'parallel') {
        // 并行模式：合并不同维度的评估
        sections.push(`### ${agentLabel}\n${result.content}`);
      } else {
        // 串行模式：自然衔接
        sections.push(String(result.content));
      }
    }

    // 如果是情绪支持场景，把鼓励放在最前面
    if (strategy.scenario === 'emotion_support' && sections.length > 1) {
      // 鼓励 + 简化讲解
      return sections.join('\n\n---\n\n');
    }

    return sections.join('\n\n');
  }

  private getAgentLabel(agentName: string): string {
    const labels: Record<string, string> = {
      tutor: '📖 知识讲解',
      evaluator: '✅ 代码评估',
      debug: '🔍 调试分析',
      code_review: '📋 代码审查',
      mentor: '💪 学习建议',
      interview: '🎯 面试训练',
    };
    return labels[agentName] || agentName;
  }

  // ===== 推荐下一步动作 =====

  private recommendNextAction(
    results: AgentResult[],
    decision: AdaptiveDecision,
    state: LearnerState,
  ): TeachingResult['recommendedNextAction'] {
    // 基于自适应决策的节奏建议
    switch (decision.paceAdvice) {
      case 'take_break':
        return {
          type: 'take_break',
          reason: '已经学习了一段时间，建议休息一下再继续',
        };
      case 'slow_down':
        return {
          type: 'review',
          targetNodeId: decision.recommendedNodeId,
          targetMode: 'reading',
          reason: '建议放慢节奏，先巩固当前知识点',
        };
      case 'accelerate':
        return {
          type: 'advance',
          targetNodeId: decision.recommendedNodeId,
          targetMode: decision.recommendedMode,
          reason: '进展顺利，可以进入下一个知识点',
        };
      default:
        return {
          type: 'continue',
          targetNodeId: decision.recommendedNodeId,
          targetMode: decision.recommendedMode,
          reason: decision.reason,
        };
    }
  }

  // ===== 学习者状态更新 =====

  private computeLearnerStateUpdate(
    results: AgentResult[],
    context: TeachingContext,
  ): Partial<LearnerState> {
    // 基于整体 Agent 执行结果推断学习效果
    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0;

    const allSuccess = results.every(r => r.success);

    // 如果有评估结果，提取分数
    const evaluatorResult = results.find(r => r.agentName === 'evaluator');
    let score = 0.5; // 默认中等
    if (evaluatorResult && evaluatorResult.content) {
      try {
        const parsed = JSON.parse(String(evaluatorResult.content));
        score = (parsed.overallScore || 50) / 100;
      } catch {
        // 无法解析，使用默认分数
      }
    }

    // 使用自适应引擎更新学习者状态
    const isCorrect = score >= 0.9 || (allSuccess && avgConfidence > 0.7);
    const updatedState = this.adaptiveEngine.updateLearnerState(
      context.learnerState,
      context.currentNodeId,
      isCorrect,
      context.adaptiveDecision.recommendedDifficulty,
      score,
    );

    return {
      knowledgeMastery: updatedState.knowledgeMastery,
      abilityTheta: updatedState.abilityTheta,
      paceScore: updatedState.paceScore,
      streakCorrect: updatedState.streakCorrect,
      streakWrong: updatedState.streakWrong,
      totalPractices: updatedState.totalPractices,
      totalCorrect: updatedState.totalCorrect,
      lastStudyTime: updatedState.lastStudyTime,
      nodeHistory: updatedState.nodeHistory,
    };
  }

  // ===== 教学反思 =====

  private generateReflection(
    results: AgentResult[],
    conflicts: Conflict[],
    strategy: TeachingStrategy,
    context: TeachingContext,
  ): string {
    const parts: string[] = [];

    // 策略执行情况
    const successCount = results.filter(r => r.success).length;
    parts.push(`策略 "${strategy.name}" 执行完成：${successCount}/${results.length} 个 Agent 成功`);

    // 冲突情况
    if (conflicts.length > 0) {
      parts.push(`检测到 ${conflicts.length} 个 Agent 意见冲突，已自动解决`);
    }

    // 平均置信度
    const avgConfidence = results.length > 0
      ? (results.reduce((sum, r) => sum + r.confidence, 0) / results.length * 100).toFixed(0)
      : '0';
    parts.push(`平均置信度：${avgConfidence}%`);

    // 学生画像建议
    if (context.learnerState.profileType === 'beginner' && context.learnerState.streakWrong >= 2) {
      parts.push('建议：新手连续答错，下次可考虑降低难度或增加提示');
    } else if (context.learnerState.profileType === 'advanced' && context.learnerState.streakCorrect >= 3) {
      parts.push('建议：高阶学生进展顺利，下次可提供更有挑战性的内容');
    }

    return parts.join('；');
  }

  // ===== 工具方法 =====

  private containsErrorKeywords(message: string): boolean {
    const keywords = ['error', '错误', '报错', 'undefined', 'null', 'exception', 'TypeError', 'ReferenceError', 'SyntaxError', 'bug', '不工作', '不行', 'failed'];
    const lower = message.toLowerCase();
    return keywords.some(kw => lower.includes(kw.toLowerCase()));
  }

  private containsInterviewKeywords(message: string): boolean {
    const keywords = ['面试', 'interview', '笔试', '面试题', '面经', '八股文'];
    return keywords.some(kw => message.includes(kw));
  }

  private looksLikeCode(message: string): boolean {
    if (!message) return false;
    // 简单启发式：包含函数定义、花括号、分号等
    const codeIndicators = [
      /function\s+\w+/,        // function foo
      /const\s+\w+\s*=/,       // const x =
      /=>\s*{/,                 // => {
      /import\s+.+from/,       // import x from
      /class\s+\w+/,           // class Foo
      /\{$/,                    // 行尾花括号
      /console\.log/,          // console.log
      /return\s+/,             // return
    ];
    return codeIndicators.some(pattern => pattern.test(message));
  }
}
