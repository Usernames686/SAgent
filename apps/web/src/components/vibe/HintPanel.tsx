'use client';

import { useState } from 'react';
import { Lightbulb, Lock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

/** 提示级别 */
interface HintLevel {
  level: number;
  content: string;
  penalty: number; // 0-1 扣分比例
}

interface HintPanelProps {
  hints: HintLevel[];
  revealedLevels: number; // 已揭示到第几级
  onReveal: (level: number) => void;
  disabled?: boolean;
}

const HINT_ICONS = ['💡', '🔍', '🎯'];
const HINT_LABELS = ['方向提示', '关键线索', '详细指引'];

export default function HintPanel({ hints, revealedLevels, onReveal, disabled }: HintPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (hints.length === 0) return null;

  const totalPenalty = hints
    .filter((_, i) => i < revealedLevels)
    .reduce((sum, h) => sum + h.penalty, 0);

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          逐步提示
          {revealedLevels > 0 && (
            <span className="text-[10px] text-amber-400/60 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
              已用 {revealedLevels}/{hints.length} · 扣分 {Math.round(totalPenalty * 100)}%
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/50" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/50" />
        )}
      </button>

      {/* Hint levels */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {hints.map((hint, i) => {
            const isRevealed = i < revealedLevels;
            const isNext = i === revealedLevels;
            const isLocked = i > revealedLevels;

            return (
              <div
                key={i}
                className={`rounded-xl border transition-all ${
                  isRevealed
                    ? 'bg-amber-500/5 border-amber-500/15'
                    : isNext
                    ? 'bg-white/[0.02] border-white/[0.06]'
                    : 'bg-white/[0.01] border-white/[0.03] opacity-50'
                }`}
              >
                {isRevealed ? (
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{HINT_ICONS[i % 3]}</span>
                      <span className="text-xs font-medium text-amber-400/80">
                        Level {hint.level} · {HINT_LABELS[i % 3]}
                      </span>
                      <span className="ml-auto text-[10px] text-amber-400/50">
                        扣 {Math.round(hint.penalty * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">{hint.content}</p>
                  </div>
                ) : isNext ? (
                  <button
                    onClick={() => onReveal(hint.level)}
                    disabled={disabled}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white/50">
                        Level {hint.level} · {HINT_LABELS[i % 3]}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400/60 shrink-0">
                      扣 {Math.round(hint.penalty * 100)}%
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Lock className="w-3.5 h-3.5 text-white/70" />
                    <span className="text-xs text-white/50">
                      Level {hint.level} · {HINT_LABELS[i % 3]}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
