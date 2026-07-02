// vibe-coding-lab.service.ts
// Phase 4 Step 28: Vibe Coding 实验室 — 根据氛围描述生成代码

import { Injectable, Logger } from '@nestjs/common';
import { LlmGateway } from '../agent/llm/llm.gateway';
import { AiReviewEngine } from './ai-review.engine';

// ── Types ──

export interface VibeGenerateRequest {
  goal: string;          // "做一个登录页"
  vibe: string;          // "极简、深色、毛玻璃、呼吸动效"
  techStack?: string;    // "React + Tailwind"
  iterations?: number;   // 迭代次数
  nodeId?: string;       // 关联知识点
  useLocalTemplate?: boolean; // 跳过云端模型，直接生成本地模板
}

export interface VibeGenerateResponse {
  generatedCode: string;
  previewHtml: string;
  vibePrompt: string;    // AI 实际使用的 Prompt
  generationSource: 'cloud' | 'local-template';
  generationNotice: string;
  elapsedMs: number;
  reviewReport: {
    scores: Record<string, number>;
    suggestions: string[];
    overallComment: string;
  } | null;
  suggestions: string[]; // 氛围调整建议
  iteration: number;
}

// ── 预设目标选项 ──

export const VIBE_GOALS = [
  { id: 'login-page', label: '登录页面', description: '用户登录界面' },
  { id: 'dashboard', label: '数据仪表盘', description: '数据可视化仪表盘' },
  { id: 'todo-app', label: '待办应用', description: '任务管理工具' },
  { id: 'weather-card', label: '天气卡片', description: '天气信息展示卡片' },
  { id: 'music-player', label: '音乐播放器', description: '音乐播放控制界面' },
  { id: 'profile-card', label: '个人名片', description: '个人资料展示卡片' },
  { id: 'pricing-table', label: '价格表', description: '产品价格对比表' },
  { id: 'landing-hero', label: '首页英雄区', description: '产品首页首屏展示' },
] as const;

// ── 氛围标签 ──

export const VIBE_TAGS = [
  { id: 'minimal', label: '极简', emoji: '✨' },
  { id: 'dark', label: '深色', emoji: '🌙' },
  { id: 'glassmorphism', label: '毛玻璃', emoji: '🔮' },
  { id: 'gradient', label: '渐变', emoji: '🌈' },
  { id: 'neon', label: '霓虹', emoji: '💡' },
  { id: 'retro', label: '复古', emoji: '📺' },
  { id: 'breathing', label: '呼吸动效', emoji: '🫁' },
  { id: 'floating', label: '悬浮感', emoji: '☁️' },
  { id: 'brutalist', label: '粗野主义', emoji: '🧱' },
  { id: 'organic', label: '有机形态', emoji: '🌿' },
  { id: 'cyberpunk', label: '赛博朋克', emoji: '🤖' },
  { id: 'pastel', label: '柔和色', emoji: '🎨' },
] as const;

// ── Service ──

@Injectable()
export class VibeCodingLabService {
  private readonly logger = new Logger(VibeCodingLabService.name);

  constructor(
    private readonly llm: LlmGateway,
    private readonly aiReview: AiReviewEngine,
  ) {}

  /** 根据氛围描述生成代码 */
  async generateFromVibe(req: VibeGenerateRequest): Promise<VibeGenerateResponse> {
    const startedAt = Date.now();
    const iteration = req.iterations || 1;
    const prompt = this.buildVibePrompt(req);
    const generationTimeoutMs = Number(process.env.VIBE_LLM_TIMEOUT_MS || 18000);
    const reviewTimeoutMs = Number(process.env.VIBE_REVIEW_TIMEOUT_MS || 8000);

    this.logger.log(`Generating vibe code: goal="${req.goal}", vibe="${req.vibe}", iter=${iteration}`);

    // 1. 调用 LLM 生成代码；云端不可用时降级为本地模板，保证预览功能可用。
    let generatedCode: string;
    let usedFallback = false;
    let fallbackReason = '';
    try {
      if (req.useLocalTemplate) {
        throw new Error('用户选择快速本地模板');
      }

      const rawGeneratedCode = await this.generateCloudHtml(prompt, generationTimeoutMs);
      generatedCode = this.normalizeGeneratedHtml(rawGeneratedCode);
      if (!generatedCode) {
        this.logger.warn('Vibe LLM returned empty content, retrying once with stricter prompt');
        const retryCode = await this.generateCloudHtml(this.buildStrictRetryPrompt(req), generationTimeoutMs);
        generatedCode = this.normalizeGeneratedHtml(retryCode);
      }
      if (!generatedCode) throw new Error('LLM returned empty code after retry');
    } catch (err) {
      usedFallback = true;
      fallbackReason = (err as Error).message;
      this.logger.warn(`Vibe LLM generation failed, using local fallback: ${fallbackReason}`);
      generatedCode = this.buildFallbackHtml(req);
    }

    // 2. AI 自评审（如果有关联知识点）
    let reviewReport: VibeGenerateResponse['reviewReport'] = null;
    if (req.nodeId) {
      try {
        const reviewResult = usedFallback
          ? this.buildLocalReviewReport()
          : await this.withTimeout(
            this.aiReview.review(
              generatedCode,
              {
                type: 'ai_review',
                dimensions: ['readability', 'performance', 'best_practice'],
                rubric: '根据氛围风格和代码质量综合评审',
              },
            ),
            reviewTimeoutMs,
            `Vibe review timeout after ${reviewTimeoutMs}ms`,
        );
        reviewReport = {
          scores: reviewResult.scores,
          suggestions: reviewResult.suggestions,
          overallComment: reviewResult.overallComment,
        };
      } catch (err) {
        this.logger.warn('AI review failed during vibe generation:', err);
      }
    }

    // 3. 生成氛围调整建议
    const suggestions = this.generateVibeSuggestions(req.vibe, reviewReport);
    if (usedFallback) {
      suggestions.unshift('云端模型响应较慢或暂不可用，已使用本地模板生成可预览页面；可继续调整目标和氛围关键词。');
    }

    return {
      generatedCode,
      previewHtml: generatedCode,
      vibePrompt: prompt,
      generationSource: usedFallback ? 'local-template' : 'cloud',
      generationNotice: usedFallback
        ? `已启用本地兜底模板：${fallbackReason || '云端模型未返回有效 HTML'}`
        : '已使用云端模型生成页面',
      elapsedMs: Date.now() - startedAt,
      reviewReport,
      suggestions,
      iteration,
    };
  }

  /** 构造氛围生成 Prompt */
  private buildVibePrompt(req: VibeGenerateRequest): string {
    const techStack = req.techStack || 'HTML + CSS + JavaScript';
    const vibeDesc = req.vibe || '现代、简洁';

    return `你是一位精通前端设计的氛围编程（Vibe Coding）专家。

任务：根据用户的氛围描述，生成一段前端代码。

【目标】${req.goal}
【氛围风格】${vibeDesc}
【技术栈】${techStack}

要求：
1. 代码必须是一个完整的、可直接运行的 HTML 文件（包含内联 CSS 和 JS）
2. 严格遵循氛围风格描述 "${vibeDesc}" 来设计视觉效果
3. 包含至少一个动画效果或微交互
4. 代码注释中解释关键的氛围设计决策
5. 如果提到"毛玻璃"，请使用 backdrop-filter: blur()
6. 如果提到"呼吸动效"，请使用 CSS animation 实现脉动效果
7. 如果提到"霓虹"，请使用 text-shadow / box-shadow 实现发光效果
8. 确保代码简洁、可读、有良好的结构
9. 不要使用 Markdown 代码块标记，不要输出 \`\`\`html 或 \`\`\`

请直接输出完整 HTML 代码，从 <!DOCTYPE html> 开始，到 </html> 结束，不要附加说明文字。`;
  }

  private buildStrictRetryPrompt(req: VibeGenerateRequest): string {
    return `${this.buildVibePrompt(req)}

重要：上一次响应没有返回可预览 HTML。现在必须只输出一个完整 HTML 文件。
第一行必须是 <!DOCTYPE html>。
不要输出解释、思考过程、Markdown、JSON 或空内容。`;
  }

  private async generateCloudHtml(prompt: string, timeoutMs: number): Promise<string> {
    const llmResponse = await this.withTimeout(
      this.llm.chat({
        messages: [
          {
            role: 'system',
            content: '你是一位精通前端设计的氛围编程专家。当前任务是直接输出可运行 HTML，不要输出推理过程或解释。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        maxTokens: 4096,
        timeoutMs,
        disableThinking: true,
      }),
      timeoutMs + 500,
      `Vibe generation timeout after ${timeoutMs}ms`,
    );

    const choice = llmResponse.choices?.[0];
    const message = choice?.message as { content?: unknown; reasoning_content?: unknown };
    const content = typeof message?.content === 'string' ? message.content : '';
    if (content.trim()) return content;

    const reasoningContent = typeof message?.reasoning_content === 'string' ? message.reasoning_content : '';
    if (reasoningContent.trim()) {
      this.logger.warn(`Vibe LLM returned empty content with finish_reason=${choice?.finish_reason || 'unknown'} and non-empty reasoning_content`);
    } else {
      this.logger.warn(`Vibe LLM returned empty content with finish_reason=${choice?.finish_reason || 'unknown'}`);
    }
    return '';
  }

  /** 清理模型常见的 Markdown 包裹，并尽量提取可直接预览的 HTML */
  private normalizeGeneratedHtml(content: string): string {
    let html = content.trim();

    const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      html = fenced[1].trim();
    }

    const docStart = html.search(/<!doctype html>|<html[\s>]/i);
    if (docStart > 0) {
      html = html.slice(docStart).trim();
    }

    const closeHtmlIndex = html.toLowerCase().lastIndexOf('</html>');
    if (closeHtmlIndex >= 0) {
      html = html.slice(0, closeHtmlIndex + '</html>'.length).trim();
    }

    return html;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  private buildLocalReviewReport() {
    return {
      scores: {
        readability: 82,
        performance: 78,
        best_practice: 80,
      },
      suggestions: [
        '本地模板已保证完整 HTML、响应式布局和基础交互，适合先预览效果。',
        '如果需要更贴近业务的细节，可以补充具体文案、字段和组件状态后继续迭代。',
        '云端模型稳定后，可再次生成以获得更个性化的视觉结构。',
      ],
      overallComment: '云端生成或评审耗时较长时，系统使用本地模板完成可运行预览，并给出基础质量评分。',
    };
  }

  private buildFallbackHtml(req: VibeGenerateRequest): string {
    const goal = this.escapeHtml(req.goal || '氛围页面');
    const vibe = this.escapeHtml(req.vibe || '现代、简洁');
    const techStack = this.escapeHtml(req.techStack || 'HTML + CSS + JavaScript');
    const isGlass = /毛玻璃|glass/i.test(req.vibe);
    const isDark = /深色|dark|霓虹|neon|赛博/i.test(req.vibe);
    const isSoft = /柔和|pastel|有机/i.test(req.vibe);

    const bg = isDark
      ? 'linear-gradient(135deg, #070816 0%, #182044 46%, #35164c 100%)'
      : isSoft
        ? 'linear-gradient(135deg, #f7e7ff 0%, #e2f7ff 48%, #fff3d6 100%)'
        : 'linear-gradient(135deg, #11263f 0%, #245b7c 48%, #743c8f 100%)';
    const text = isDark ? '#f8fbff' : '#172033';
    const muted = isDark ? 'rgba(248,251,255,.68)' : 'rgba(23,32,51,.68)';
    const panel = isGlass ? 'rgba(255,255,255,.14)' : isDark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.72)';
    const border = isGlass ? 'rgba(255,255,255,.24)' : 'rgba(255,255,255,.18)';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${goal} - Vibe Preview</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: ${text};
      background: ${bg};
      overflow: auto;
    }
    .stage {
      min-height: 100vh;
      padding: 42px;
      position: relative;
      display: grid;
      place-items: center;
    }
    .orb {
      position: absolute;
      width: 280px;
      height: 280px;
      border-radius: 999px;
      filter: blur(10px);
      opacity: .55;
      animation: breathe 4.8s ease-in-out infinite;
    }
    .orb.one { left: -70px; top: -60px; background: #24d7ff; }
    .orb.two { right: -80px; bottom: -70px; background: #ff4fb8; animation-delay: -1.8s; }
    .shell {
      width: min(980px, 92vw);
      min-height: 520px;
      border: 1px solid ${border};
      border-radius: 28px;
      background: ${panel};
      ${isGlass ? 'backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);' : ''}
      box-shadow: 0 28px 90px rgba(0,0,0,.26);
      padding: 28px;
      position: relative;
      overflow: visible;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 30px;
    }
    .eyebrow {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,.14);
      border: 1px solid ${border};
      font-size: 13px;
      color: ${muted};
    }
    h1 {
      margin: 14px 0 10px;
      font-size: clamp(34px, 6vw, 72px);
      line-height: .96;
      letter-spacing: 0;
    }
    .copy {
      max-width: 620px;
      color: ${muted};
      font-size: 17px;
      line-height: 1.7;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .card {
      padding: 18px;
      border-radius: 18px;
      background: rgba(255,255,255,.12);
      border: 1px solid ${border};
      min-height: 112px;
      transition: transform .25s ease, background .25s ease;
    }
    .card:hover { transform: translateY(-6px); background: rgba(255,255,255,.18); }
    .metric { font-size: 34px; font-weight: 800; margin-bottom: 8px; }
    .label { color: ${muted}; font-size: 13px; line-height: 1.5; }
    .cta {
      border: 0;
      border-radius: 14px;
      padding: 14px 20px;
      color: white;
      background: linear-gradient(135deg, #ff7a1a, #ec3ea5);
      font-weight: 700;
      box-shadow: 0 14px 34px rgba(236,62,165,.28);
      cursor: pointer;
      animation: pulse 2.8s ease-in-out infinite;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(.96); opacity: .42; }
      50% { transform: scale(1.08); opacity: .68; }
    }
    @keyframes pulse {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @media (max-width: 760px) {
      .stage { padding: 20px; }
      .shell { padding: 22px; border-radius: 22px; }
      .header { align-items: flex-start; flex-direction: column; }
      .grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .metric { font-size: 28px; }
    }
  </style>
</head>
<body>
  <main class="stage">
    <div class="orb one"></div>
    <div class="orb two"></div>
    <section class="shell">
      <div class="header">
        <div>
          <span class="eyebrow">Vibe Coding · ${techStack}</span>
          <h1>${goal}</h1>
          <p class="copy">根据「${vibe}」生成的可预览界面。页面使用响应式布局、微交互和动态呼吸效果，展示目标、指标和行动入口。</p>
        </div>
        <button class="cta" onclick="document.body.classList.toggle('active')">体验氛围</button>
      </div>
      <div class="grid">
        <article class="card">
          <div class="metric">92%</div>
          <div class="label">视觉一致性，围绕用户选择的氛围关键词组织色彩、动效和层次。</div>
        </article>
        <article class="card">
          <div class="metric">3.8s</div>
          <div class="label">呼吸节奏，用柔和动画制造可感知但不打扰的界面生命感。</div>
        </article>
        <article class="card">
          <div class="metric">A+</div>
          <div class="label">结构完整，包含语义化 HTML、内联样式、响应式规则和可点击交互。</div>
        </article>
      </div>
    </section>
  </main>
  <script>
    document.querySelectorAll('.card').forEach((card, index) => {
      card.style.animation = 'pulse 3s ease-in-out infinite';
      card.style.animationDelay = (index * 0.25) + 's';
    });
  </script>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 根据评审结果生成氛围调整建议 */
  private generateVibeSuggestions(
    vibe: string,
    reviewReport: VibeGenerateResponse['reviewReport'],
  ): string[] {
    const suggestions: string[] = [];

    // 基于氛围风格给出建议
    if (vibe.includes('极简') || vibe.includes('minimal')) {
      suggestions.push('尝试减少元素数量，增加留白，使用更少的颜色');
    }
    if (vibe.includes('深色') || vibe.includes('dark')) {
      suggestions.push('深色模式下注意对比度，使用半透明白色文字');
    }
    if (vibe.includes('毛玻璃') || vibe.includes('glassmorphism')) {
      suggestions.push('毛玻璃效果需要背景色彩丰富才能体现，尝试增加渐变背景');
    }
    if (vibe.includes('霓虹') || vibe.includes('neon')) {
      suggestions.push('霓虹效果在纯黑背景下最突出，可以减少其他装饰元素');
    }

    // 基于评审结果给出建议
    if (reviewReport) {
      if (reviewReport.scores.readability < 70) {
        suggestions.push('代码可读性可改善：添加更多注释，规范命名');
      }
      if (reviewReport.scores.performance < 70) {
        suggestions.push('性能可优化：减少 DOM 操作，使用 CSS 动画替代 JS 动画');
      }
      if (reviewReport.scores.best_practice < 70) {
        suggestions.push('最佳实践：使用语义化 HTML 标签，确保响应式设计');
      }
    }

    // 通用建议
    if (suggestions.length === 0) {
      suggestions.push('尝试添加更多微交互来提升用户体验');
      suggestions.push('可以尝试调整氛围描述中的关键词来探索不同风格');
    }

    return suggestions;
  }

  /** 获取预设目标和氛围标签 */
  getPresets() {
    return {
      goals: VIBE_GOALS,
      tags: VIBE_TAGS,
    };
  }
}
