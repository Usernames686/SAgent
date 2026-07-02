// 氛围编程（Vibe Coding）完整交互模式实现

import { LlmGateway } from '../llm/llm.gateway';

// ===== 交互模式枚举 =====
export type VibeInteractionMode =
  | 'vibe_describe'     // 氛围描述式
  | 'prompt_iterate'    // Prompt 迭代
  | 'pair_programming'  // 配对编程
  | 'vibe_quiz'         // 氛围竞猜
  | 'code_review';      // 代码审查训练

// ===== 氛围编程请求 =====
export interface VibeCodingRequest {
  mode: VibeInteractionMode;
  userId: string;
  sessionId: string;

  // 氛围描述式
  vibeKeywords?: string;        // 氛围关键词（如"毛玻璃、暗色、科技感"）
  functionDescription?: string;  // 功能描述
  technicalConstraints?: string; // 技术约束

  // Prompt 迭代
  currentPrompt?: string;       // 当前 Prompt
  iterationRound?: number;      // 迭代轮次
  previousFeedback?: string;    // 上一轮反馈

  // 配对编程
  userDirection?: string;       // 用户方向
  codeContext?: string;         // 当前代码上下文

  // 氛围竞猜
  targetDescription?: string;   // 目标界面描述
  userGuessKeywords?: string;   // 用户猜测的关键词

  // 代码审查
  codeToReview?: string;        // 待审查代码
  reviewChecklist?: string[];   // 审查清单
}

// ===== 氛围编程响应 =====
export interface VibeCodingResponse {
  mode: VibeInteractionMode;
  content: string;              // AI 回复内容
  code?: string;                // 生成的代码
  matchScore?: number;          // 氛围匹配度（氛围竞猜用）
  suggestions?: string[];       // 改进建议
  nextStep?: string;            // 下一步建议
  iterationInfo?: {             // 迭代信息
    round: number;
    totalRounds: number;
    improvement: string;
  };
  metadata: {
    tokens: number;
    latencyMs: number;
  };
}

export class VibeCodingService {
  constructor(private readonly llm: LlmGateway) {}

  /**
   * 主入口：根据模式执行对应的交互
   */
  async execute(request: VibeCodingRequest): Promise<VibeCodingResponse> {
    try {
      switch (request.mode) {
        case 'vibe_describe':
          return await this.vibeDescribe(request);
        case 'prompt_iterate':
          return await this.promptIterate(request);
        case 'pair_programming':
          return await this.pairProgramming(request);
        case 'vibe_quiz':
          return await this.vibeQuiz(request);
        case 'code_review':
          return await this.codeReviewTraining(request);
        default:
          return await this.vibeDescribe(request);
      }
    } catch (err) {
      // 任何错误都返回预设示例，确保前端不报错
      return this.fallbackResponse(request, (err as Error).message);
    }
  }

  // ============================
  //  模式1: 氛围描述式
  // ============================
  private async vibeDescribe(request: VibeCodingRequest): Promise<VibeCodingResponse> {
    const startTime = Date.now();
    const systemPrompt = `你是一位 Vibe Coding 专家。用户会描述想要的氛围和功能，你需要生成符合氛围的代码。

氛围关键词：${request.vibeKeywords || '未指定'}
功能需求：${request.functionDescription || '未指定'}
${request.technicalConstraints ? `技术约束：${request.technicalConstraints}` : ''}

要求：
1. 代码必须匹配用户描述的氛围风格
2. 使用 React + Tailwind CSS 实现
3. 组件命名为 Component
4. 在 \`\`\`jsx 代码块中提供完整代码
5. 解释你的设计思路：为什么这样设计符合该氛围

先简要分析氛围关键词的含义，然后给出代码实现。`;

    try {
      const response = await this.llm.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `氛围：${request.vibeKeywords}\n功能：${request.functionDescription}` },
        ],
        temperature: 0.8,
        maxTokens: 2048,
      });

      const content = response.choices[0]?.message?.content || '';
      const code = this.extractCodeBlock(content);
      const latencyMs = Date.now() - startTime;

      return {
        mode: 'vibe_describe',
        content,
        code,
        nextStep: '你可以要求我调整氛围细节、修改功能，或者生成另一个风格的版本',
        metadata: { tokens: response.usage?.total_tokens || 0, latencyMs },
      };
    } catch (err) {
      // LLM 超时或失败时返回预设示例
      const fallbackCode = `function Component() {
  return (
    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl max-w-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">U</div>
        <div>
          <h2 className="text-lg font-bold">统计概览</h2>
          <p className="text-gray-400 text-sm">${request.vibeKeywords || '极简科技风'} · 实时数据</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">1,234</div>
          <div className="text-gray-400 text-xs mt-1">总用户</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">89%</div>
          <div className="text-gray-400 text-xs mt-1">活跃率</div>
        </div>
      </div>
      <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
        查看详情
      </button>
    </div>
  );
}`;

      return {
        mode: 'vibe_describe',
        content: `## ${request.vibeKeywords} 风格卡片组件

${request.functionDescription}

\`\`\`jsx
${fallbackCode}
\`\`\`

> ⚠️ LLM 响应超时，已返回预设示例组件。`,
        code: fallbackCode,
        nextStep: '你可以要求我调整氛围细节、修改功能，或者生成另一个风格的版本',
        metadata: { tokens: 0, latencyMs: Date.now() - startTime },
      };
    }
  }

  // ============================
  //  模式2: Prompt 迭代
  // ============================
  private async promptIterate(request: VibeCodingRequest): Promise<VibeCodingResponse> {
    const startTime = Date.now();
    const round = request.iterationRound || 1;

    const systemPrompt = round === 1
      ? `你是一位 Prompt 工程专家。用户会提供一个初始 Prompt，你需要：
1. 分析该 Prompt 的优点和不足
2. 给出优化后的版本
3. 解释为什么优化后的版本更好

评估维度：清晰度、具体性、约束条件、输出格式、上下文提供`
      : `你是一位 Prompt 工程专家。这是第 ${round} 轮迭代。
用户上一轮的 Prompt 是：${request.currentPrompt}
上一轮反馈：${request.previousFeedback || '无'}

请根据反馈进一步优化 Prompt：
1. 分析上一轮优化是否有效
2. 给出本轮优化版本
3. 说明改进点`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.currentPrompt || '请提供需要优化的 Prompt' },
      ],
      temperature: 0.5,
      maxTokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      mode: 'prompt_iterate',
      content,
      suggestions: this.extractSuggestions(content),
      iterationInfo: {
        round,
        totalRounds: 5,
        improvement: `第 ${round} 轮 Prompt 优化完成`,
      },
      nextStep: round < 5 ? '可以继续迭代优化，或者用优化后的 Prompt 生成代码' : '已达到建议迭代次数上限',
      metadata: { tokens: response.usage?.total_tokens || 0, latencyMs },
    };
  }

  // ============================
  //  模式3: 配对编程
  // ============================
  private async pairProgramming(request: VibeCodingRequest): Promise<VibeCodingResponse> {
    const startTime = Date.now();

    const systemPrompt = `你是一位配对编程伙伴。用户会描述方向和当前代码，你需要：
1. 理解用户意图
2. 给出实现建议
3. 提供代码示例
4. 解释你的思路

记住这是协作，不要替用户做所有决策 — 提供选项和建议，让用户选择方向。

当前代码上下文：
${request.codeContext || '无'}

用户方向：${request.userDirection || '未明确说明'}

回复格式：
- 🤝 理解确认
- 💡 建议方案（列出 2-3 个选项）
- 📝 代码示例
- ❓ 需要用户确认的问题`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `方向：${request.userDirection}\n当前代码：${request.codeContext || '尚无代码'}` },
      ],
      temperature: 0.7,
      maxTokens: 3072,
    });

    const content = response.choices[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      mode: 'pair_programming',
      content,
      nextStep: '请选择上面的某个方案，我会继续配合你实现',
      metadata: { tokens: response.usage?.total_tokens || 0, latencyMs },
    };
  }

  // ============================
  //  模式4: 氛围竞猜
  // ============================
  private async vibeQuiz(request: VibeCodingRequest): Promise<VibeCodingResponse> {
    const startTime = Date.now();

    const systemPrompt = `你是一个 Vibe Coding 氛围竞猜游戏主持人。

规则：
1. 用户描述了一个界面的视觉效果
2. 用户猜测这个界面应该用什么氛围关键词来描述
3. 你需要评估用户的猜测是否准确
4. 给出评分（0-100）和改进建议

评估维度：
- 氛围关键词匹配度（40%）：是否抓住了核心氛围
- 技术描述准确性（30%）：是否能准确描述实现方式
- 完整性（30%）：是否覆盖了主要视觉元素

用户描述的界面：${request.targetDescription || '未描述'}
用户猜测的氛围关键词：${request.userGuessKeywords || '未提供'}

请返回 JSON 格式（不要其他内容）：
{
  "score": 0-100,
  "dimensionScores": { "keywordMatch": 0-100, "technicalAccuracy": 0-100, "completeness": 0-100 },
  "feedback": "评语",
  "expectedKeywords": ["预期关键词1", "预期关键词2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "examplePrompt": "一个更好的氛围描述示例"
}`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `界面描述：${request.targetDescription}\n我的猜测：${request.userGuessKeywords}` },
      ],
      temperature: 0.4,
      maxTokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const latencyMs = Date.now() - startTime;

    let score = 50;
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(content);
      score = parsed.score || 50;
      suggestions = parsed.suggestions || [];
    } catch {
      // 解析失败使用默认值
    }

    return {
      mode: 'vibe_quiz',
      content,
      matchScore: score,
      suggestions,
      nextStep: '可以再试一次，或者看看参考答案',
      metadata: { tokens: response.usage?.total_tokens || 0, latencyMs },
    };
  }

  // ============================
  //  模式5: 代码审查训练
  // ============================
  private async codeReviewTraining(request: VibeCodingRequest): Promise<VibeCodingResponse> {
    const startTime = Date.now();

    const checklistStr = request.reviewChecklist?.join('\n') || '无指定清单';
    const systemPrompt = `你是一个代码审查训练助手。用户会提交一段代码供审查，你需要：

1. **先让用户自己评审**：引导用户先说出自己发现的问题
2. **然后给出你的审查结果**：代码问题 + 改进建议
3. **对比分析**：对比用户的发现和你的发现，帮助用户提高审查能力

审查维度：
- 代码质量（命名、结构、注释）
- 安全性（注入、敏感信息）
- 性能（不必要的计算、内存泄漏）
- 最佳实践（是否符合框架规范）

用户指定的审查清单：
${checklistStr}

回复格式：
### 你的审查结果
[用户自己分析]

### AI 审查结果
[问题列表 + 建议]

### 学习要点
[你需要掌握的关键点]`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请审查以下代码：\n\`\`\`\n${request.codeToReview || '无代码提供'}\n\`\`\`` },
      ],
      temperature: 0.5,
      maxTokens: 3072,
    });

    const content = response.choices[0]?.message?.content || '';
    const code = this.extractCodeBlock(content);
    const latencyMs = Date.now() - startTime;

    return {
      mode: 'code_review',
      content,
      code: code || request.codeToReview,
      suggestions: this.extractSuggestions(content),
      nextStep: '根据审查结果修改代码后，可以再次提交审查',
      metadata: { tokens: response.usage?.total_tokens || 0, latencyMs },
    };
  }

  // ============================
  //  工具方法
  // ============================

  /**
   * LLM 失败时的预设示例
   */
  private fallbackResponse(request: VibeCodingRequest, errorMsg: string): VibeCodingResponse {
    const code = `function Component() {
  return (
    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl max-w-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">U</div>
        <div>
          <h2 className="text-lg font-bold">统计概览</h2>
          <p className="text-gray-400 text-sm">${request.vibeKeywords || '极简科技风'} · 实时数据</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">1,234</div>
          <div className="text-gray-400 text-xs mt-1">总用户</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">89%</div>
          <div className="text-gray-400 text-xs mt-1">活跃率</div>
        </div>
      </div>
      <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
        查看详情
      </button>
    </div>
  );
}`;

    return {
      mode: request.mode,
      content: `## ${request.vibeKeywords || '预设'} 风格卡片组件

${request.functionDescription || ''}

\`\`\`jsx
${code}
\`\`\`

> ⚠️ AI 暂时无法响应（${errorMsg}），已返回预设示例组件。`,
      code,
      nextStep: '你可以要求我调整氛围细节、修改功能，或者生成另一个风格的版本',
      metadata: { tokens: 0, latencyMs: 0 },
    };
  }

  /**
   * 从文本中提取代码块
   */
  private extractCodeBlock(text: string): string | undefined {
    const match = text.match(/```[\w]*\n([\s\S]*?)```/);
    return match?.[1]?.trim();
  }

  /**
   * 从文本中提取建议列表
   */
  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*]\s/) || trimmed.match(/^\d+\.\s/)) {
        suggestions.push(trimmed.replace(/^[-*\d]+\.\s*/, ''));
      }
    }
    return suggestions.slice(0, 10);
  }

  /**
   * 生成氛围匹配度评分
   */
  async evaluateVibeMatch(
    code: string,
    expectedStyle: string,
    expectedKeywords: string[],
  ): Promise<{ score: number; feedback: string; details: Record<string, number> }> {
    const systemPrompt = `你是一个氛围匹配度评估专家。请评估代码与目标氛围的匹配程度。

目标风格：${expectedStyle}
预期关键词：${expectedKeywords.join(', ')}

评估维度：
1. 视觉匹配度（40%）：颜色、布局、视觉效果是否符合风格
2. 技术实现（30%）：实现方式是否恰当
3. 关键词覆盖（30%）：是否体现了预期关键词

返回 JSON：
{ "score": 0-100, "feedback": "评语", "details": { "visualMatch": 0-100, "technicalMatch": 0-100, "keywordCoverage": 0-100 } }`;

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `代码：\n\`\`\`jsx\n${code}\n\`\`\`` },
      ],
      temperature: 0.3,
      maxTokens: 512,
    });

    const content = response.choices[0]?.message?.content || '{}';
    try {
      return JSON.parse(content);
    } catch {
      return { score: 50, feedback: '评估失败', details: { visualMatch: 50, technicalMatch: 50, keywordCoverage: 50 } };
    }
  }
}
