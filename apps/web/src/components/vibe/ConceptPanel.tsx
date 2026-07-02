'use client';

import { useState } from 'react';
import {
  BookOpen, Code2, Brain, ArrowRight, Sparkles,
  Lightbulb, MessageCircle, Eye, EyeOff, CheckCircle2,
  XCircle, HelpCircle, Zap, ChevronRight, Layers,
} from 'lucide-react';
import {
  LOOP_STEPS, type LearningLoopStep,
} from './phase-config';

// ── Types ──

interface LectureConcept {
  title: string;
  content: string;
  svgDiagram?: SvgDiagram;
}

interface SvgDiagram {
  type: 'flowchart' | 'comparison' | 'structure' | 'state' | 'relation' | 'animation';
  title: string;
  src: string;
  caption: string;
}

interface CodeExample {
  title: string;
  code: string;
  explanation: string;
}

interface ComparisonCard {
  title: string;
  leftLabel: string;
  leftItems: string[];
  rightLabel: string;
  rightItems: string[];
  verdict?: string;
  /** ★ 详细讲解页面路径，点击后在新 Tab 打开 */
  detailHref?: string;
}

interface TypeCard {
  name: string;
  icon: string;
  color: string;
  typeofResult: string;
  example: string;
  note?: string;
}

interface TypeCheckCase {
  expression: string;
  answer: string;
  hint?: string;
}

interface QuickRefRow {
  syntax: string;
  meaning: string;
  example: string;
}

interface RichMediaContent {
  comparisons?: ComparisonCard[];
  typeCards?: TypeCard[];
  /** ★ 类型图鉴详细讲解页面路径 */
  typeCardsDetailHref?: string;
  typeCheckLab?: TypeCheckCase[];
  quickRef?: { title: string; rows: QuickRefRow[] };
  analogy?: { title: string; image: string; explanation: string };
  relationMap?: {
    nodes: { id: string; label: string }[];
    edges: { from: string; to: string; label: string }[];
  };
  mnemonic?: string;
}

interface LectureContentData {
  nodeId: string;
  motivation: string;
  concepts: LectureConcept[];
  codeExamples: CodeExample[];
  summary: string;
  tips: string[];
  thinkQuestions: string[];
  /** ★ 详细讲解页面路径 */
  detailHref?: string;
  richMedia?: RichMediaContent;
}

interface ConceptPanelProps {
  nodeId: string;
  nodeName: string;
  stage: string;
  lectureContent: LectureContentData | null;
  content?: string;
  onStartPractice: () => void;
  onStartQuiz: () => void;
}

// ── Concept card accent colors ──

const CONCEPT_ACCENTS = [
  { border: 'border-blue-500/25', badge: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-500' },
  { border: 'border-violet-500/25', badge: 'bg-violet-500/15 text-violet-400', dot: 'bg-violet-500' },
  { border: 'border-cyan-500/25', badge: 'bg-cyan-500/15 text-cyan-400', dot: 'bg-cyan-500' },
  { border: 'border-emerald-500/25', badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-500' },
];

// ── Type card color map ──

const TYPE_COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   glow: 'shadow-blue-500/5' },
  green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  glow: 'shadow-green-500/5' },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  glow: 'shadow-amber-500/5' },
  gray:   { bg: 'bg-gray-500/10',   border: 'border-gray-500/20',   text: 'text-gray-300',   glow: 'shadow-gray-500/5' },
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    glow: 'shadow-red-500/5' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/5' },
  teal:   { bg: 'bg-teal-500/10',   border: 'border-teal-500/20',   text: 'text-teal-400',   glow: 'shadow-teal-500/5' },
};

// ── Sub-components ──

/** 对比卡片组件 */
function ComparisonView({ card }: { card: ComparisonCard }) {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.03) 0%, rgba(139,92,246,0.03) 100%)' }}>
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-blue-400" />
        <h4 className="text-xs font-semibold text-white/80">{card.title}</h4>
        {card.detailHref && (
          <a
            href={card.detailHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-gradient-to-r from-orange-500/10 to-pink-500/10 text-orange-400 border border-orange-500/15 hover:from-orange-500/20 hover:to-pink-500/20 hover:border-orange-500/25 transition-all"
          >
            <BookOpen className="w-3 h-3" />
            详细讲解
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/[0.04]">
        {/* Left */}
        <div className="p-3.5">
          <p className="text-[10px] font-semibold text-red-400/70 mb-2">{card.leftLabel}</p>
          <ul className="space-y-1.5">
            {card.leftItems.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <XCircle className="w-3 h-3 text-red-400/40 mt-0.5 shrink-0" />
                <span className="text-[11px] text-white/65 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Right */}
        <div className="p-3.5">
          <p className="text-[10px] font-semibold text-emerald-400/70 mb-2">{card.rightLabel}</p>
          <ul className="space-y-1.5">
            {card.rightItems.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400/40 mt-0.5 shrink-0" />
                <span className="text-[11px] text-white/70 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {card.verdict && (
        <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01]">
          <p className="text-[10px] text-amber-400/70 font-medium">{card.verdict}</p>
        </div>
      )}
    </div>
  );
}

/** 类型图鉴卡片网格 */
function TypeCardsView({ cards }: { cards: TypeCard[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
      {cards.map((tc, i) => {
        const cm = TYPE_COLOR_MAP[tc.color] || TYPE_COLOR_MAP.blue;
        return (
          <div key={i}
            className={`rounded-xl p-3 border ${cm.border} ${cm.bg} ${cm.glow} shadow-sm transition-all hover:scale-[1.02] hover:shadow-md`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{tc.icon}</span>
              <span className={`text-xs font-bold ${cm.text}`}>{tc.name}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-white/50 font-mono">typeof →</span>
                <code className={`text-[10px] ${cm.text} font-mono bg-black/20 px-1.5 py-0.5 rounded`}>
                  {tc.typeofResult}
                </code>
              </div>
              <p className="text-[10px] text-white/60 font-mono leading-relaxed">{tc.example}</p>
              {tc.note && (
                <p className="text-[9px] text-white/50 italic leading-relaxed mt-0.5">{tc.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 互动类型检测台 */
function TypeCheckLab({ cases }: { cases: TypeCheckCase[] }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});

  const toggleReveal = (i: number) => setRevealed(prev => ({ ...prev, [i]: !prev[i] }));
  const toggleHint = (i: number) => setShowHint(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="rounded-xl border border-emerald-500/10 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(59,130,246,0.03) 100%)' }}>
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
        <h4 className="text-xs font-semibold text-emerald-400">🔬 互动检测台 — 猜猜 typeof 返回什么？</h4>
      </div>
      <div className="divide-y divide-white/[0.03]">
        {cases.map((tc, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center gap-3 group hover:bg-white/[0.01] transition-colors">
            <code className="text-[11px] font-mono text-white/70 bg-black/30 px-2 py-1 rounded min-w-[140px]">
              {tc.expression}
            </code>
            <span className="text-white/70">→</span>
            {revealed[i] ? (
              <code className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded animate-fade-in">
                {tc.answer}
              </code>
            ) : (
              <button
                onClick={() => toggleReveal(i)}
                className="text-[10px] text-white/55 hover:text-white/50 border border-white/[0.06] hover:border-white/[0.12] px-3 py-1 rounded transition-all flex items-center gap-1">
                <Eye className="w-3 h-3" /> 揭晓答案
              </button>
            )}
            {tc.hint && !revealed[i] && (
              <button
                onClick={() => toggleHint(i)}
                className="ml-auto text-[9px] text-amber-400/30 hover:text-amber-400/50 flex items-center gap-0.5">
                <HelpCircle className="w-2.5 h-2.5" />
                {showHint[i] ? tc.hint : '提示'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01]">
        <button
          onClick={() => {
            const allRevealed = cases.every((_, i) => revealed[i]);
            const newState: Record<number, boolean> = {};
            cases.forEach((_, i) => { newState[i] = !allRevealed; });
            setRevealed(newState);
          }}
          className="text-[10px] text-white/50 hover:text-white/65 transition-colors flex items-center gap-1">
          {cases.every((_, i) => revealed[i]) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {cases.every((_, i) => revealed[i]) ? '收起全部' : '揭晓全部'}
        </button>
      </div>
    </div>
  );
}

/** 速查表 */
function QuickRefView({ data }: { data: { title: string; rows: QuickRefRow[] } }) {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-violet-400" />
        <h4 className="text-xs font-semibold text-violet-400">📋 {data.title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-white/50 border-b border-white/[0.04]">
              <th className="px-4 py-2 text-left font-medium">语法</th>
              <th className="px-4 py-2 text-left font-medium">含义</th>
              <th className="px-4 py-2 text-left font-medium">示例</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                <td className="px-4 py-2"><code className="font-mono text-cyan-400/70 bg-cyan-500/5 px-1.5 py-0.5 rounded">{row.syntax}</code></td>
                <td className="px-4 py-2 text-white/65">{row.meaning}</td>
                <td className="px-4 py-2"><code className="font-mono text-white/55 bg-black/20 px-1.5 py-0.5 rounded">{row.example}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 视觉比喻卡片 */
function AnalogyView({ analogy }: { analogy: { title: string; image: string; explanation: string } }) {
  return (
    <div className="rounded-xl border border-amber-500/10 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(249,115,22,0.04) 100%)' }}>
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
        <h4 className="text-xs font-semibold text-amber-400">💡 形象比喻</h4>
      </div>
      <div className="p-4 flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-3xl shrink-0">
          {analogy.image}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/60 mb-1.5">{analogy.title}</p>
          <p className="text-[11px] text-white/65 leading-relaxed">{analogy.explanation}</p>
        </div>
      </div>
    </div>
  );
}

/** 关系图（简易节点连线图） */
function RelationMapView({ data }: { data: { nodes: { id: string; label: string }[]; edges: { from: string; to: string; label: string }[] } }) {
  const nodeMap = Object.fromEntries(data.nodes.map(n => [n.id, n.label]));
  // Group edges by source
  const edgesBySource = data.edges.reduce<Record<string, { to: string; label: string }[]>>((acc, e) => {
    if (!acc[e.from]) acc[e.from] = [];
    acc[e.from].push(e);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(168,85,247,0.03) 100%)' }}>
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-indigo-400" />
        <h4 className="text-xs font-semibold text-indigo-400">🕸️ 知识关系图</h4>
      </div>
      <div className="p-4 space-y-3">
        {data.nodes.filter(n => edgesBySource[n.id]).map(node => (
          <div key={node.id} className="flex items-start gap-3">
            {/* Source node */}
            <div className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${
              node.id === 'var'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {node.label}
            </div>
            {/* Edges */}
            <div className="flex flex-col gap-1 pt-0.5">
              {edgesBySource[node.id].map((edge, ei) => (
                <div key={ei} className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-white/70" />
                  <span className="text-[9px] text-white/50 font-mono bg-white/[0.03] px-1.5 py-0.5 rounded">
                    {edge.label}
                  </span>
                  <ChevronRight className="w-3 h-3 text-white/70" />
                  <span className="text-[10px] text-indigo-400/60 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                    {nodeMap[edge.to] || edge.to}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 记忆口诀卡片 */
function MnemonicView({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-pink-500/10 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.05) 0%, rgba(249,115,22,0.04) 100%)' }}>
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
        <h4 className="text-xs font-semibold text-pink-400">🎶 记忆口诀</h4>
      </div>
      <div className="p-4">
        <p className="text-sm text-white/60 leading-loose whitespace-pre-line font-medium tracking-wide">
          {text}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function ConceptPanel({
  nodeId,
  nodeName,
  stage,
  lectureContent,
  content,
  onStartPractice,
  onStartQuiz,
}: ConceptPanelProps) {
  const [activeExampleTab, setActiveExampleTab] = useState(0);
  const rich = lectureContent?.richMedia;

  // ── Fallback (no structured content) ──

  if (!lectureContent) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="glass rounded-2xl p-6">
          <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
            {content || '暂无内容'}
          </div>
        </div>
        <div className="flex justify-center gap-3">
          <button onClick={onStartPractice} className="btn-primary px-6 py-2.5 text-sm">
            <Code2 className="w-4 h-4" /> 开始实践
          </button>
          <button onClick={onStartQuiz} className="btn-secondary px-5 py-2.5 text-sm">
            <Brain className="w-4 h-4" /> 直接测试
          </button>
        </div>
      </div>
    );
  }

  // ── Parse summary into bullet items ──

  const summaryLines = lectureContent.summary
    .split(/\n|•|–|—|-/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div className="animate-fade-in space-y-5">
      {/* ── Loop Step Indicator ── */}
      <div className="flex items-center gap-2">
        {LOOP_STEPS.map((step, i) => {
          const isActive = step.key === 'concept';
          const isDone = false;
          return (
            <div key={step.key} className="flex items-center gap-1.5">
              {i > 0 && <div className="w-4 h-px bg-white/[0.06]" />}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : isDone
                    ? 'bg-emerald-500/10 text-emerald-400/60'
                    : 'text-white/50'
              }`}>
                <span>{step.emoji}</span>
                <span>{step.label}</span>
                {isActive && <span className="ml-0.5 text-blue-400/50">← 你在这里</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Motivation Card ── */}
      <div className="rounded-2xl p-5 border border-orange-500/10"
        style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(236,72,153,0.04) 100%)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-orange-400/80 tracking-wide mb-1">🌟 为什么学这个？</p>
            <p className="text-sm text-white/60 leading-relaxed">{lectureContent.motivation}</p>
            {stage && (
              <p className="text-[11px] text-white/50 mt-2">
                📍 {stage} · <span className="font-mono text-white/70">{nodeId}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ★ 图文并茂区域 — 有 richMedia 时优先展示多媒体内容 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {rich && (
        <div className="space-y-4">
          {/* ── 视觉比喻（类比） ── */}
          {rich.analogy && <AnalogyView analogy={rich.analogy} />}

          {/* ── 对比卡片 ── */}
          {rich.comparisons && rich.comparisons.length > 0 && (
            <div className="space-y-3">
              {rich.comparisons.map((card, i) => (
                <ComparisonView key={i} card={card} />
              ))}
            </div>
          )}

          {/* ── 类型图鉴 ── */}
          {rich.typeCards && rich.typeCards.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 tracking-wide mb-3">
                <Layers className="w-3.5 h-3.5" /> 🏷️ 类型图鉴
                <span className="text-[9px] text-white/70 ml-1">七种原始类型一览</span>
                {rich.typeCardsDetailHref && (
                  <a
                    href={rich.typeCardsDetailHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/15 hover:from-cyan-500/20 hover:to-blue-500/20 hover:border-cyan-500/25 transition-all"
                  >
                    <BookOpen className="w-3 h-3" />
                    详细讲解
                  </a>
                )}
              </h3>
              <TypeCardsView cards={rich.typeCards} />
            </div>
          )}

          {/* ── 互动检测台 ── */}
          {rich.typeCheckLab && rich.typeCheckLab.length > 0 && (
            <TypeCheckLab cases={rich.typeCheckLab} />
          )}

          {/* ── 关系图 ── */}
          {rich.relationMap && <RelationMapView data={rich.relationMap} />}

          {/* ── 速查表 ── */}
          {rich.quickRef && <QuickRefView data={rich.quickRef} />}

          {/* ── 记忆口诀 ── */}
          {rich.mnemonic && <MnemonicView text={rich.mnemonic} />}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 核心概念（原有内容，richMedia 存在时折叠展示） */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {lectureContent.concepts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 tracking-wide mb-3">
            <BookOpen className="w-3.5 h-3.5" /> 📚 核心概念
            <span className="text-[9px] text-white/70 ml-1">渐进深入</span>
          </h3>
          <div className="space-y-3">
            {lectureContent.concepts.map((concept, i) => {
              const accent = CONCEPT_ACCENTS[i % CONCEPT_ACCENTS.length];
              return (
                <details key={i} className="group" open={!rich || !!concept.svgDiagram}>
                  <summary className={`glass rounded-xl p-4 border-l-2 ${accent.border} cursor-pointer transition-all hover:bg-white/[0.02] list-none`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md ${accent.badge} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                        {i + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-white flex-1">{concept.title}</h4>
                      <ChevronRight className="w-3.5 h-3.5 text-white/50 transition-transform group-open:rotate-90" />
                    </div>
                  </summary>
                  <div className="pl-7 pr-4 pb-3 pt-1 space-y-2.5">
                    {/* ★ SVG 教学图 */}
                    {concept.svgDiagram && (
                      <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-[#0d1b2a]">
                        <img
                          src={concept.svgDiagram.src}
                          alt={concept.svgDiagram.title}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                        <p className="text-[10px] text-white/55 px-3 py-1.5 bg-white/[0.02] border-t border-white/[0.04]">
                          📌 {concept.svgDiagram.caption}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-white/70 leading-relaxed">{concept.content}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Code Examples ── */}
      {lectureContent.codeExamples.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-pink-400" />
            <h3 className="text-xs font-semibold text-pink-400">💻 代码示例</h3>
          </div>
          {lectureContent.codeExamples.length > 1 && (
            <div className="flex border-b border-white/[0.04]">
              {lectureContent.codeExamples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setActiveExampleTab(i)}
                  className={`px-4 py-2 text-[11px] font-medium transition-all ${
                    i === activeExampleTab
                      ? 'text-pink-400 border-b-2 border-pink-400/50 bg-pink-500/5'
                      : 'text-white/55 hover:text-white/50'
                  }`}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          )}
          {lectureContent.codeExamples[activeExampleTab] && (
            <div className="p-5 space-y-3">
              <pre className="text-[11px] leading-relaxed text-emerald-400/80 bg-black/30 rounded-lg p-4 overflow-x-auto font-mono">
                {lectureContent.codeExamples[activeExampleTab].code}
              </pre>
              <p className="text-[11px] text-white/65 leading-relaxed">
                💬 {lectureContent.codeExamples[activeExampleTab].explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Summary ── */}
      <div className="glass rounded-2xl p-5 border-l-2 border-purple-500/20">
        <h3 className="text-xs font-semibold text-purple-400 mb-3">📋 要点总结</h3>
        {summaryLines.length > 1 ? (
          <div className="space-y-1.5">
            {summaryLines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 mt-1.5 shrink-0" />
                <p className="text-xs text-white/50 leading-relaxed">{line}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{lectureContent.summary}</p>
        )}
      </div>

      {/* ── Think Questions + Tips ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lectureContent.thinkQuestions.length > 0 && (
          <div className="glass rounded-2xl p-5 border-l-2 border-cyan-500/20">
            <h3 className="text-xs font-semibold text-cyan-400 mb-3">🤔 思考题</h3>
            <div className="space-y-2.5">
              {lectureContent.thinkQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-white/70 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/70 mt-3 italic">不计分，引导深层理解</p>
          </div>
        )}

        {lectureContent.tips.length > 0 && (
          <div className="glass rounded-2xl p-5 border-l-2 border-yellow-500/20">
            <h3 className="text-xs font-semibold text-yellow-400 mb-3">💡 学习贴士</h3>
            <div className="space-y-2">
              {lectureContent.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-yellow-400/40 text-[10px] mt-0.5 shrink-0">⚠️</span>
                  <p className="text-xs text-white/70 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/70 mt-3 italic">避免踩坑</p>
          </div>
        )}
      </div>

      {/* ── CTA: Next Steps (closed loop) ── */}
      <div className="rounded-xl p-4 border border-white/[0.04]"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, rgba(139,92,246,0.04) 100%)' }}>
        <p className="text-[11px] text-white/55 mb-3 text-center">
          已理解概念？进入下一步动手实践
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {lectureContent?.detailHref && (
            <a
              href={lectureContent.detailHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm rounded-lg font-medium bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 border border-amber-500/20 hover:from-amber-500/25 hover:to-orange-500/25 hover:border-amber-500/30 transition-all"
            >
              <Layers className="w-4 h-4" /> 详细讲解
            </a>
          )}
          <button onClick={onStartPractice} className="btn-primary px-6 py-2.5 text-sm">
            <Code2 className="w-4 h-4" /> 开始实践
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={onStartQuiz} className="btn-secondary px-5 py-2.5 text-sm">
            <Brain className="w-4 h-4" /> 直接测试
          </button>
        </div>
      </div>
    </div>
  );
}
