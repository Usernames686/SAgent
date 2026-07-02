// VibeCodingLabPage.tsx
// Vibe Coding 实验室：目标 + 氛围 + 技术栈 → 可预览代码

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { vibeLearningApi } from '@/lib/api';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  Palette,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';

interface VibeGoal {
  id: string;
  label: string;
  description: string;
}

interface VibeTag {
  id: string;
  label: string;
  emoji: string;
}

interface VibeGenerateResult {
  generatedCode: string;
  previewHtml?: string;
  vibePrompt: string;
  generationSource?: 'cloud' | 'local-template';
  generationNotice?: string;
  elapsedMs?: number;
  reviewReport: {
    scores: Record<string, number>;
    suggestions: string[];
    overallComment: string;
  } | null;
  suggestions: string[];
  iteration: number;
}

type ResultTab = 'preview' | 'code' | 'review' | 'prompt';

const FALLBACK_GOALS: VibeGoal[] = [
  { id: 'login-page', label: '登录页面', description: '含表单、品牌区、状态提示' },
  { id: 'dashboard', label: '数据仪表盘', description: '指标卡片、趋势和操作入口' },
  { id: 'todo-app', label: '待办应用', description: '任务列表、筛选、完成状态' },
  { id: 'weather-card', label: '天气卡片', description: '天气、温度、城市和动效' },
  { id: 'music-player', label: '音乐播放器', description: '封面、播放控制和进度条' },
  { id: 'profile-card', label: '个人名片', description: '头像、简介、社交链接' },
  { id: 'pricing-table', label: '价格表', description: '套餐、权益、推荐标记' },
  { id: 'landing-hero', label: '首页英雄区', description: '主视觉、卖点、行动按钮' },
];

const FALLBACK_TAGS: VibeTag[] = [
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
];

const TECH_STACKS = [
  'HTML + CSS + JavaScript',
  'React + Tailwind CSS',
  'Vue 3 + CSS',
  '纯 CSS 动画',
];

function getScoreColor(score: number) {
  if (score >= 85) return 'text-emerald-300';
  if (score >= 70) return 'text-yellow-300';
  return 'text-orange-300';
}

function downloadHtml(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sagent-vibe-${Date.now()}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatElapsed(ms?: number) {
  if (!ms) return '';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function buildPreviewHtml(html: string) {
  if (!html) return '';

  const previewStyle = `
<style id="sagent-preview-scroll-fix">
  html, body {
    min-height: 100%;
    overflow: auto !important;
    overscroll-behavior: contain;
  }
  body {
    overflow-x: hidden !important;
  }
  .stage, .shell, main, section {
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  body > * {
    max-height: none !important;
  }
</style>`;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${previewStyle}\n</head>`);
  }
  return `${previewStyle}\n${html}`;
}

export default function VibeCodingLabPage({ nodeId }: { nodeId?: string }) {
  const { accessToken } = useAuthStore();
  const token = accessToken || undefined;
  const [goals, setGoals] = useState<VibeGoal[]>(FALLBACK_GOALS);
  const [tags, setTags] = useState<VibeTag[]>(FALLBACK_TAGS);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('login-page');
  const [customGoal, setCustomGoal] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['dark', 'glassmorphism', 'breathing']);
  const [customVibe, setCustomVibe] = useState('');
  const [techStack, setTechStack] = useState(TECH_STACKS[0]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<VibeGenerateResult | null>(null);
  const [iterations, setIterations] = useState<VibeGenerateResult[]>([]);
  const [activeTab, setActiveTab] = useState<ResultTab>('preview');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingSeconds, setGeneratingSeconds] = useState(0);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewInteractive, setPreviewInteractive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPresetsLoading(true);
    vibeLearningApi.getVibePresets(token)
      .then((data: any) => {
        if (cancelled) return;
        if (Array.isArray(data?.goals) && data.goals.length > 0) setGoals(data.goals);
        if (Array.isArray(data?.tags) && data.tags.length > 0) setTags(data.tags);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(`预设加载失败，已使用本地预设：${err instanceof Error ? err.message : '未知错误'}`);
        }
      })
      .finally(() => {
        if (!cancelled) setPresetsLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!generating) {
      setGeneratingSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setGeneratingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [generating]);

  const selectedGoalItem = goals.find((goal) => goal.id === selectedGoal);

  const goalText = useMemo(() => (
    customGoal.trim() || selectedGoalItem?.label || ''
  ), [customGoal, selectedGoalItem?.label]);

  const vibeText = useMemo(() => {
    const tagLabels = selectedTags
      .map((id) => tags.find((tag) => tag.id === id)?.label)
      .filter(Boolean);
    return [...tagLabels, customVibe.trim()].filter(Boolean).join('、');
  }, [customVibe, selectedTags, tags]);

  const canGenerate = Boolean(goalText && vibeText && !generating);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId],
    );
  };

  const handleGenerate = async (useLocalTemplate = false) => {
    if (!goalText || !vibeText) {
      setError('请先选择目标，并至少选择一个氛围关键词。');
      return;
    }

    setError('');
    setGenerating(true);
    setGeneratingSeconds(0);
    try {
      const res = await vibeLearningApi.vibeGenerate({
        goal: goalText,
        vibe: vibeText,
        techStack,
        iterations: iterations.length + 1,
        nodeId,
        useLocalTemplate,
      }, token) as VibeGenerateResult;
      setResult(res);
      setIterations((prev) => [...prev, res]);
      setActiveTab('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后再试。');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = useCallback(() => {
    if (!result?.generatedCode) return;
    navigator.clipboard.writeText(result.generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [result?.generatedCode]);

  const previewHtml = result?.previewHtml || result?.generatedCode || '';
  const scrollablePreviewHtml = useMemo(() => buildPreviewHtml(previewHtml), [previewHtml]);

  return (
    <div className="w-full max-w-none space-y-5">
      <div className="rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.10] via-white/[0.03] to-pink-500/[0.08] p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[11px] text-purple-200 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Vibe Coding Lab
            </div>
            <h1 className="text-2xl font-bold text-white">氛围编程实验室</h1>
            <p className="text-sm text-white/55 mt-1">把目标、气质和技术栈合成一个可运行、可预览、可迭代的前端页面。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-0 xl:min-w-[360px]">
            {[
              { label: '目标', value: goalText || '未选' },
              { label: '氛围', value: selectedTags.length + (customVibe.trim() ? 1 : 0) },
              { label: '迭代', value: iterations.length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-black/15 p-3 text-center">
                <p className="text-sm font-semibold text-white truncate">{item.value}</p>
                <p className="text-[10px] text-white/40 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-orange-200/70 hover:text-orange-100">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-[440px_minmax(0,1fr)] gap-5">
        <section className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-white/[0.07] bg-slate-950/55 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-300" />
                1. 选择目标
              </h2>
              {presetsLoading && <Loader2 className="w-4 h-4 text-white/35 animate-spin" />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => { setSelectedGoal(goal.id); setCustomGoal(''); }}
                  className={`min-h-[74px] rounded-xl border p-3 text-left transition-colors ${
                    selectedGoal === goal.id && !customGoal
                      ? 'border-purple-400/45 bg-purple-500/15'
                      : 'border-white/[0.06] bg-white/[0.035] hover:bg-white/[0.06]'
                  }`}
                >
                  <p className="text-sm font-semibold text-white/85">{goal.label}</p>
                  <p className="text-[11px] leading-relaxed text-white/42 mt-1">{goal.description}</p>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customGoal}
              onChange={(event) => { setCustomGoal(event.target.value); setSelectedGoal(''); }}
              placeholder="自定义目标，例如：一个粒子动画欢迎页"
              className="mt-3 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white/85 placeholder-white/30 focus:outline-none focus:border-purple-400/45"
            />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-slate-950/55 p-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-pink-300" />
              2. 描述氛围
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'border-pink-400/45 bg-pink-500/15 text-pink-100'
                      : 'border-white/[0.06] bg-white/[0.035] text-white/55 hover:bg-white/[0.07]'
                  }`}
                >
                  {tag.emoji} {tag.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customVibe}
              onChange={(event) => setCustomVibe(event.target.value)}
              placeholder="补充氛围关键词，例如：纸张颗粒、慢速漂浮、微光边框"
              className="mt-3 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white/85 placeholder-white/30 focus:outline-none focus:border-pink-400/45"
            />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-slate-950/55 p-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-cyan-300" />
              3. 技术栈
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TECH_STACKS.map((stack) => (
                <button
                  key={stack}
                  onClick={() => setTechStack(stack)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                    techStack === stack
                      ? 'border-cyan-400/45 bg-cyan-500/15 text-cyan-100'
                      : 'border-white/[0.06] bg-white/[0.035] text-white/55 hover:bg-white/[0.07]'
                  }`}
                >
                  {stack}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-slate-950/55 p-4">
            <h2 className="text-sm font-semibold text-white mb-3">生成摘要</h2>
            <div className="space-y-2 text-xs text-white/55">
              <p><span className="text-white/35">目标：</span>{goalText || '未选择'}</p>
              <p><span className="text-white/35">氛围：</span>{vibeText || '未选择'}</p>
              <p><span className="text-white/35">技术栈：</span>{techStack}</p>
            </div>
            <button
              onClick={() => handleGenerate(false)}
              disabled={!canGenerate}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? `正在生成页面...${generatingSeconds > 0 ? ` ${generatingSeconds}s` : ''}` : iterations.length > 0 ? '继续迭代生成' : '生成可预览页面'}
            </button>
            <button
              onClick={() => handleGenerate(true)}
              disabled={!canGenerate}
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.07] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              快速本地模板
            </button>
            {generating && (
              <p className="mt-3 text-[11px] leading-relaxed text-white/38">
                {generatingSeconds >= 10
                  ? '云端模型响应偏慢，系统会自动切换到本地模板，确保预览先出来。'
                  : '正在请求云端模型并准备实时预览，生成较慢时会自动兜底。'}
              </p>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-white/[0.07] bg-slate-950/55 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'preview', label: '预览', icon: Eye },
                { key: 'code', label: '代码', icon: Code2 },
                { key: 'review', label: '评审', icon: CheckCircle2 },
                { key: 'prompt', label: 'Prompt', icon: Clipboard },
              ] as Array<{ key: ResultTab; label: string; icon: typeof Eye }>).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    activeTab === tab.key
                      ? 'bg-purple-500/18 text-purple-100'
                      : 'bg-white/[0.035] text-white/45 hover:bg-white/[0.07]'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
            {result && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  result.generationSource === 'local-template'
                    ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
                    : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                }`}>
                  {result.generationSource === 'local-template' ? '本地模板' : '云端模型'}
                  {result.elapsedMs ? ` · ${formatElapsed(result.elapsedMs)}` : ''}
                </span>
                <button onClick={handleCopy} className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/55 hover:bg-white/[0.08]">
                  {copied ? '已复制' : '复制代码'}
                </button>
                <button onClick={() => downloadHtml(previewHtml)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/55 hover:bg-white/[0.08]">
                  <Download className="w-3.5 h-3.5" />
                  下载 HTML
                </button>
                <button
                  onClick={() => setPreviewExpanded(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/55 hover:bg-white/[0.08]"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  放大预览
                </button>
                <button
                  onClick={() => setPreviewInteractive((prev) => !prev)}
                  className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/55 hover:bg-white/[0.08]"
                >
                  {previewInteractive ? '滚动浏览' : '启用交互'}
                </button>
              </div>
            )}
          </div>

          {!result ? (
            <div className="min-h-[620px] grid place-items-center p-6 text-center">
              <div className="max-w-md">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-purple-500/12 border border-purple-500/15">
                  {generating ? <Loader2 className="w-7 h-7 text-purple-300 animate-spin" /> : <Wand2 className="w-7 h-7 text-purple-300" />}
                </div>
                <h3 className="text-lg font-semibold text-white">{generating ? '正在生成预览' : '等待生成'}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  {generating
                    ? (generatingSeconds >= 10 ? '云端模型还在响应，超过等待上限后会自动返回本地模板预览。' : '正在根据目标、氛围和技术栈生成完整 HTML 页面。')
                    : '选择一个目标和几组氛围关键词后，这里会展示可运行页面、源码、Prompt 和评审建议。'}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-[620px]">
              {result.generationNotice && (
                <div className={`mx-4 mt-4 rounded-xl border px-4 py-3 text-xs ${
                  result.generationSource === 'local-template'
                    ? 'border-amber-400/20 bg-amber-500/10 text-amber-100/80'
                    : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100/80'
                }`}>
                  {result.generationNotice}
                </div>
              )}
              {activeTab === 'preview' && (
                <div className="p-4">
                  <div className="h-[min(78vh,920px)] min-h-[620px] overflow-auto rounded-xl border border-white/[0.08] bg-white">
                    <iframe
                      srcDoc={scrollablePreviewHtml}
                      className={`h-[1100px] min-h-full w-full border-0 bg-white ${previewInteractive ? '' : 'pointer-events-none'}`}
                      title="Vibe Preview"
                      sandbox="allow-scripts"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-white/35">
                    默认是滚动浏览模式，滚轮可查看完整页面；需要点击预览里的按钮时启用交互。
                  </p>
                </div>
              )}

              {activeTab === 'code' && (
                <div className="p-4">
                  <pre className="max-h-[620px] overflow-auto rounded-xl border border-white/[0.06] bg-black/35 p-4 text-xs leading-relaxed text-emerald-200 whitespace-pre-wrap font-mono">
                    {result.generatedCode}
                  </pre>
                </div>
              )}

              {activeTab === 'review' && (
                <div className="p-4 space-y-4">
                  {result.reviewReport ? (
                    <>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <p className="text-sm leading-relaxed text-white/70">{result.reviewReport.overallComment}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {Object.entries(result.reviewReport.scores).map(([dimension, score]) => (
                          <div key={dimension} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                            <p className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</p>
                            <p className="mt-1 text-[11px] text-white/40">{dimension}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/50">
                      当前没有评审报告。已保留生成代码和预览，可继续迭代。
                    </div>
                  )}

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <h3 className="text-sm font-semibold text-white/80 mb-3">改进建议</h3>
                    <div className="space-y-2">
                      {[...(result.reviewReport?.suggestions || []), ...(result.suggestions || [])].map((suggestion, index) => (
                        <p key={`${suggestion}-${index}`} className="text-sm leading-relaxed text-white/55">• {suggestion}</p>
                      ))}
                    </div>
                  </div>

                  {iterations.length > 0 && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="w-4 h-4 text-white/45" />
                        <h3 className="text-sm font-semibold text-white/80">迭代历史</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {iterations.map((item, index) => (
                          <button
                            key={`${item.iteration}-${index}`}
                            onClick={() => { setResult(item); setActiveTab('preview'); }}
                            className={`rounded-full px-3 py-1.5 text-xs ${
                              item === result ? 'bg-purple-500/20 text-purple-100' : 'bg-white/[0.04] text-white/45 hover:bg-white/[0.08]'
                            }`}
                          >
                            第 {index + 1} 轮
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'prompt' && (
                <div className="p-4">
                  <pre className="max-h-[620px] overflow-auto rounded-xl border border-white/[0.06] bg-black/35 p-4 text-xs leading-relaxed text-white/62 whitespace-pre-wrap">
                    {result.vibePrompt}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {previewExpanded && result && (
        <div className="fixed inset-0 z-50 bg-black/82 backdrop-blur-md p-3 sm:p-5">
          <div className="h-full rounded-2xl border border-white/[0.10] bg-slate-950 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">放大预览</p>
                <p className="text-[11px] text-white/40">完整页面视口，默认滚动浏览；启用交互后可点击预览内控件。</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewInteractive((prev) => !prev)}
                  className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white/65 hover:bg-white/[0.10]"
                >
                  {previewInteractive ? '滚动浏览' : '启用交互'}
                </button>
                <button
                  onClick={() => setPreviewExpanded(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white/65 hover:bg-white/[0.10]"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  关闭
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <iframe
                srcDoc={scrollablePreviewHtml}
                className={`h-[1200px] min-h-full w-full border-0 bg-white ${previewInteractive ? '' : 'pointer-events-none'}`}
                title="Vibe Preview Expanded"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
