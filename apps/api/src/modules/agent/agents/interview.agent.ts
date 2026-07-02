import { LlmGateway } from '../llm/llm.gateway';

// 面试题
export interface InterviewQuestion {
  id: string;
  type: 'concept' | 'coding' | 'system_design' | 'behavioral' | 'scenario';
  difficulty: 1 | 2 | 3 | 4 | 5;
  question: string;
  expectedAnswer?: string;
  hints?: string[];
  timeLimit?: number;  // 分钟
}

// 模拟面试会话
export interface InterviewSession {
  id: string;
  role: string;
  questions: InterviewQuestion[];
  currentIndex: number;
  answers: { questionId: string; answer: string; score: number; feedback: string }[];
  overallScore?: number;
  weakPoints: string[];
}

// 面试评估
export interface InterviewEvaluation {
  overallScore: number;
  dimensionScores: {
    technicalDepth: number;
    problemSolving: number;
    communication: number;
    codeQuality: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendedTopics: string[];
}

export class InterviewAgent {
  constructor(private readonly llm: LlmGateway) {}

  private fallbackQuestions(role: string, count: number, focusAreas?: string[]): InterviewQuestion[] {
    const roleLabel = role || 'frontend';
    const focus = focusAreas?.length ? `，重点结合 ${focusAreas.join('、')}` : '';
    const bank: InterviewQuestion[] = [
      {
        id: 'q-concept-react-state',
        type: 'concept',
        difficulty: 3,
        question: `请解释 ${roleLabel} 岗位中状态管理、组件边界和数据流设计的关系${focus}。`,
        expectedAnswer: '应说明服务端状态与客户端状态的边界、组件拆分原则、单向数据流、缓存/同步策略，以及如何避免过度全局状态。',
        hints: ['先讲状态分类', '再讲组件边界', '最后给一个项目例子'],
        timeLimit: 6,
      },
      {
        id: 'q-coding-debounce',
        type: 'coding',
        difficulty: 3,
        question: '请实现一个带取消能力的 debounce 函数，并说明它在搜索输入场景中的边界处理。',
        expectedAnswer: '应包含闭包保存 timer、返回包装函数、clearTimeout、延迟执行、cancel 方法，并提到卸载清理和连续输入。',
        hints: ['用闭包保存 timer', '返回函数上挂 cancel', '说明 React useEffect 清理'],
        timeLimit: 10,
      },
      {
        id: 'q-scenario-ai-debug',
        type: 'scenario',
        difficulty: 4,
        question: '如果 AI 生成的页面能运行但交互不符合预期，你会如何定位和修复？',
        expectedAnswer: '应提到复现、检查事件/状态/DOM、缩小问题、让 AI 解释代码、写最小验证、补充测试和约束 prompt。',
        hints: ['不要只说重新生成', '强调验证和最小复现', '说明如何改 prompt'],
        timeLimit: 8,
      },
      {
        id: 'q-system-design-learning-platform',
        type: 'system_design',
        difficulty: 4,
        question: '请设计一个在线编程学习平台的核心架构，包含课程、练习、AI 辅导和进度统计。',
        expectedAnswer: '应覆盖前端路由、后端模块、数据库模型、鉴权、练习运行沙箱、AI 服务、异步任务和观测指标。',
        hints: ['先画模块', '再讲数据模型', '最后讲扩展与安全'],
        timeLimit: 15,
      },
      {
        id: 'q-behavioral-review',
        type: 'behavioral',
        difficulty: 2,
        question: '请描述一次你推动代码质量提升的经历，你做了什么、遇到什么阻力、结果如何？',
        expectedAnswer: '应使用 STAR 结构，讲清背景、行动、协作、量化结果和复盘。',
        hints: ['用 STAR', '说具体行动', '给结果指标'],
        timeLimit: 5,
      },
      {
        id: 'q-concept-performance',
        type: 'concept',
        difficulty: 3,
        question: '请说明你会如何分析一个页面首屏加载慢的问题，并给出优化优先级。',
        expectedAnswer: '应覆盖性能指标、资源体积、网络瀑布、渲染阻塞、缓存策略、代码分割、图片优化和监控验证。',
        hints: ['先定义指标', '再定位瓶颈', '最后说明上线验证'],
        timeLimit: 8,
      },
      {
        id: 'q-coding-data-transform',
        type: 'coding',
        difficulty: 3,
        question: '给定一组扁平菜单数据，请描述或实现如何转换成树结构，并说明异常数据如何处理。',
        expectedAnswer: '应提到 map 索引、父子挂载、根节点收集、缺失 parentId、循环引用、重复 id 和复杂度。',
        hints: ['先建立 id 映射', '再挂载 children', '考虑异常数据'],
        timeLimit: 10,
      },
      {
        id: 'q-scenario-production-incident',
        type: 'scenario',
        difficulty: 4,
        question: '线上发布后出现接口错误率升高，你会如何止损、定位、修复并复盘？',
        expectedAnswer: '应包含监控告警、回滚/降级、日志链路、影响面确认、根因分析、修复验证、复盘和预防措施。',
        hints: ['先止损再定位', '说明协作沟通', '补充复盘动作'],
        timeLimit: 10,
      },
    ];
    return bank.slice(0, Math.max(1, Math.min(count, bank.length)));
  }

  private extractJson<T>(content: string, fallback: T): T {
    const text = (content || '').trim();
    if (!text) return fallback;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || text;
    const start = candidate.search(/[[{]/);
    const endArray = candidate.lastIndexOf(']');
    const endObject = candidate.lastIndexOf('}');
    const end = Math.max(endArray, endObject);
    const jsonText = start >= 0 && end >= start ? candidate.slice(start, end + 1) : candidate;
    try {
      return JSON.parse(jsonText) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * 生成面试题
   */
  async generateQuestions(
    role: string,
    count: number = 5,
    focusAreas?: string[],
  ): Promise<InterviewQuestion[]> {
    const systemPrompt = `你是一位资深技术面试官。请为 "${role}" 岗位生成 ${count} 道面试题。

题目类型分布：
- 概念题 1-2 道：考察基础知识理解
- 编码题 1-2 道：考察编程能力
- 系统设计 0-1 道：考察架构能力（高级岗位）${focusAreas ? `\n重点考察领域：${focusAreas.join(', ')}` : ''}

请以 JSON 数组格式返回：
[{ "id": "q1", "type": "concept", "difficulty": 3, "question": "题目...", "expectedAnswer": "参考答案...", "hints": ["提示1"], "timeLimit": 5 }]`;

    try {
      const response = await this.llm.chat({
        messages: [
          { role: 'system', content: `${systemPrompt}\n\n只返回 JSON 数组，不要 Markdown、解释或思考过程。` },
          { role: 'user', content: `岗位: ${role}，题数: ${count}` },
        ],
        temperature: 0.5,
        maxTokens: 3072,
        disableThinking: true,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const parsed = this.extractJson<InterviewQuestion[]>(content, []);
      return parsed.length > 0 ? parsed.slice(0, count) : this.fallbackQuestions(role, count, focusAreas);
    } catch {
      return this.fallbackQuestions(role, count, focusAreas);
    }
  }

  /**
   * 评估面试答案
   */
  async evaluateAnswer(
    question: InterviewQuestion,
    answer: string,
  ): Promise<{ score: number; feedback: string; improvements: string[] }> {
    const systemPrompt = `你是一位严格的面试评估专家。请评估面试者的答案。

题目：${question.question}
类型：${question.type}
难度：${question.difficulty}/5

评估维度：
1. 准确性（40%）：答案是否正确
2. 完整性（30%）：是否覆盖关键要点
3. 深度（20%）：是否有深入理解
4. 表达（10%）：是否清晰有条理

请返回 JSON：
{ "score": 0-100, "feedback": "详细评语", "improvements": ["改进点1", "改进点2"] }`;

    const localFallback = this.evaluateAnswerLocally(question, answer);
    try {
      const response = await this.llm.chat({
        messages: [
          { role: 'system', content: `${systemPrompt}\n\n只返回 JSON 对象，不要 Markdown、解释或思考过程。` },
          { role: 'user', content: `面试者的回答：\n${answer}` },
        ],
        temperature: 0.2,
        maxTokens: 1536,
        disableThinking: true,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return this.extractJson(content, localFallback);
    } catch {
      return localFallback;
    }
  }

  private evaluateAnswerLocally(
    question: InterviewQuestion,
    answer: string,
  ): { score: number; feedback: string; improvements: string[] } {
    const text = answer.trim();
    const expected = question.expectedAnswer || '';
    const keywords = expected
      .split(/[，。、；;,. \n]/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2)
      .slice(0, 12);
    const hitCount = keywords.filter((word) => text.includes(word)).length;
    const lengthScore = Math.min(35, Math.floor(text.length / 12));
    const keywordScore = keywords.length > 0 ? Math.round((hitCount / keywords.length) * 45) : 25;
    const structureScore = /第一|第二|首先|其次|最后|因为|所以|例如|比如|总结/.test(text) ? 15 : 5;
    const score = Math.max(20, Math.min(88, lengthScore + keywordScore + structureScore));
    return {
      score,
      feedback: score >= 75
        ? '回答覆盖了较多关键点，表达相对完整，可以继续补充具体项目案例和权衡理由。'
        : '回答还不够完整，建议补充概念解释、关键步骤、边界情况和真实项目例子。',
      improvements: [
        '用“定义 -> 原理 -> 项目例子 -> 权衡”组织答案。',
        '补充边界情况、失败场景和取舍理由。',
        '尽量使用具体技术名词和可验证结果。',
      ],
    };
  }

  /**
   * 生成完整面试评估报告
   */
  generateReport(session: InterviewSession): InterviewEvaluation {
    const scores = session.answers.map(a => a.score);
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // 分析薄弱点
    const weakPoints = session.answers
      .filter(a => a.score < 60)
      .map(a => {
        const q = session.questions.find(q => q.id === a.questionId);
        return q ? q.question.substring(0, 50) : 'unknown';
      });

    const suggestions = weakPoints.length > 0
      ? weakPoints.map(w => `建议重点复习 ${w} 相关知识点`)
      : [
        '继续补充更具体的项目案例，让答案从“知道”升级为“做过并复盘过”。',
        '回答技术题时固定使用“概念 -> 原理 -> 场景 -> 权衡 -> 验证”的结构。',
      ];
    const recommendedTopics = weakPoints.length > 0
      ? weakPoints
      : ['项目复盘表达', '系统设计权衡', '性能与稳定性验证'];

    return {
      overallScore,
      dimensionScores: {
        technicalDepth: Math.max(0, overallScore - 10),
        problemSolving: Math.max(0, overallScore - 5),
        communication: Math.min(100, overallScore + 5),
        codeQuality: overallScore,
      },
      strengths: session.answers
        .filter(a => a.score >= 80)
        .map(a => `在 "${session.questions.find(q => q.id === a.questionId)?.question?.substring(0, 30)}..." 表现优秀`),
      weaknesses: weakPoints.map(w => `在 "${w}" 需要加强`),
      suggestions,
      recommendedTopics,
    };
  }
}
