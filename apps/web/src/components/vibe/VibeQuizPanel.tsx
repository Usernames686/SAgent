'use client';

import { useState } from 'react';
import {
  Brain, CheckCircle2, XCircle, ArrowRight, RotateCcw,
  Sparkles, Trophy, Target, BookOpen, Code2,
} from 'lucide-react';
import { LOOP_STEPS, PASS_THRESHOLD } from './phase-config';

// ── Types ──

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  questionId: string;
  questionText: string;
  options: QuizOption[];
}

interface QuizFeedback {
  correct: boolean;
  score: number;
  feedback: string;
}

interface VibeQuizPanelProps {
  questions: QuizQuestion[];
  onSubmit: (answers: { questionId: string; selectedOptionId: string }[]) => void;
  onRetry: () => void;
  /** 闭环：回到概念理解 */
  onBackToConcept?: () => void;
  /** 闭环：回到动手实践 */
  onBackToPractice?: () => void;
  feedback: QuizFeedback | null;
  submitting: boolean;
}

// ── Score Ring SVG ──

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = score >= PASS_THRESHOLD * 100 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-black ${score >= PASS_THRESHOLD * 100 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

// ── Component ──

export default function VibeQuizPanel({
  questions,
  onSubmit,
  onRetry,
  onBackToConcept,
  onBackToPractice,
  feedback,
  submitting,
}: VibeQuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const allAnswered = questions.every(q => answers[q.questionId]);

  const handleSubmit = () => {
    if (!allAnswered) return;
    const formattedAnswers = Object.entries(answers).map(([qId, optId]) => ({
      questionId: qId,
      selectedOptionId: optId,
    }));
    onSubmit(formattedAnswers);
  };

  const progressPercent = questions.length > 0
    ? Math.round((Object.keys(answers).length / questions.length) * 100)
    : 0;

  const passed = feedback && feedback.score >= PASS_THRESHOLD * 100;

  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white">知识检验</h3>
          <p className="text-[11px] text-white/55">
            {feedback ? '测验结果' : `共 ${questions.length} 题 · 已答 ${Object.keys(answers).length} 题`}
          </p>
        </div>
        {!feedback && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50">{progressPercent}%</span>
            <div className="w-20 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loop Step Indicator */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        {LOOP_STEPS.map((step, i) => {
          const isActive = step.key === 'quiz';
          return (
            <div key={step.key} className="flex items-center gap-1.5">
              {i > 0 && <div className="w-4 h-px bg-white/[0.06]" />}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                  : 'text-white/50'
              }`}>
                <span>{step.emoji}</span>
                <span>{step.label}</span>
                {isActive && <span className="ml-0.5 text-violet-400/50">← 你在这里</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Result Card (when feedback) */}
      {feedback && (
        <div className={`rounded-2xl p-6 mb-4 border text-center shrink-0 ${
          passed
            ? 'border-green-500/15 bg-green-500/[0.03]'
            : 'border-orange-500/15 bg-orange-500/[0.03]'
        }`}>
          {/* Score Ring */}
          <div className="flex justify-center mb-3">
            <ScoreRing score={feedback.score} size={80} />
          </div>
          <div className={`text-xl font-black mb-1 ${
            passed ? 'text-green-400' : 'text-orange-400'
          }`}>
            {passed ? '🎉 评估通过！' : '💪 未通过'}
          </div>
          <p className="text-xs text-white/65 mb-1">
            得分 {Math.round(feedback.score)}分 / 通过线 {Math.round(PASS_THRESHOLD * 100)}分
          </p>
          <p className="text-xs text-white/55">{feedback.feedback}</p>
        </div>
      )}

      {/* Questions / Review */}
      <div className="flex-1 min-h-0 overflow-auto space-y-3">
        {!feedback ? (
          // ── Answering mode: accordion questions ──
          questions.map((q, idx) => {
            const isOpen = idx === currentQ;
            return (
              <div key={q.questionId} className={`glass rounded-xl overflow-hidden transition-all ${isOpen ? 'ring-1 ring-violet-500/20' : ''}`}>
                <button
                  onClick={() => setCurrentQ(idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    answers[q.questionId]
                      ? 'bg-violet-500/15 text-violet-400'
                      : 'bg-white/[0.04] text-white/50'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-xs text-white/50 flex-1 truncate">{q.questionText}</span>
                  <span className="text-[9px] text-white/70 shrink-0">
                    {answers[q.questionId] ? '✓' : '未答'}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    <p className="text-sm text-white/60 mb-2">{q.questionText}</p>
                    {q.options.map((opt) => {
                      const isSelected = answers[q.questionId] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.questionId]: opt.id }))}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                              : 'bg-white/[0.02] text-white/65 hover:bg-white/[0.04] border border-transparent'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-violet-400 bg-violet-400/20' : 'border-white/15'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setCurrentQ(Math.max(0, idx - 1))}
                        disabled={idx === 0}
                        className="text-[10px] text-white/50 hover:text-white/65 disabled:opacity-30"
                      >
                        ← 上一题
                      </button>
                      {idx < questions.length - 1 && (
                        <button
                          onClick={() => setCurrentQ(idx + 1)}
                          className="text-[10px] text-white/50 hover:text-white/65"
                        >
                          下一题 →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // ── Review mode: show correct/incorrect ──
          questions.map((q, idx) => {
            const selectedId = answers[q.questionId];
            const selectedOpt = q.options.find(o => o.id === selectedId);
            const correctOpt = q.options.find(o => o.isCorrect);
            const isCorrect = selectedOpt?.isCorrect;

            return (
              <div key={q.questionId} className={`glass rounded-xl p-4 border-l-2 ${isCorrect ? 'border-l-green-500/40' : 'border-l-red-500/40'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className="text-xs text-white/60 leading-relaxed">{q.questionText}</p>
                </div>
                <div className="ml-7 space-y-1.5">
                  {q.options.map((opt) => {
                    const isSelected = selectedId === opt.id;
                    const isThisCorrect = opt.isCorrect;
                    return (
                      <div key={opt.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] ${
                        isThisCorrect
                          ? 'bg-green-500/10 text-green-400'
                          : isSelected && !isThisCorrect
                            ? 'bg-red-500/10 text-red-400 line-through opacity-60'
                            : 'text-white/50'
                      }`}>
                        {isThisCorrect ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : isSelected ? <XCircle className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5" />}
                        <span>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Bar — closed-loop decision */}
      <div className="flex items-center gap-3 mt-4 shrink-0">
        {!feedback ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="btn-primary flex-1 py-3 text-sm"
          >
            {submitting ? (
              <><span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> 提交中...</>
            ) : (
              <><ArrowRight className="w-4 h-4" /> 提交答案 ({Object.keys(answers).length}/{questions.length})</>
            )}
          </button>
        ) : !passed ? (
          // 未通过 → 重试 / 回到概念理解 / 回到动手实践
          <>
            <button onClick={onRetry} className="btn-secondary flex-1 py-3 text-sm">
              <RotateCcw className="w-4 h-4" /> 重新测验
            </button>
            {onBackToPractice && (
              <button onClick={onBackToPractice} className="btn-secondary px-4 py-3 text-sm">
                <Code2 className="w-4 h-4" /> 回到实践
              </button>
            )}
            {onBackToConcept && (
              <button onClick={onBackToConcept} className="btn-secondary px-4 py-3 text-sm">
                <BookOpen className="w-4 h-4" /> 回到概念
              </button>
            )}
          </>
        ) : passed ? (
          // 通过 → 由 page.tsx 的完成过渡页处理，此处显示简短确认
          <div className="flex-1 py-3 text-sm text-center text-emerald-400 font-medium animate-fade-in">
            🎉 评估通过！请查看上方完成提示
          </div>
        ) : null}
      </div>
    </div>
  );
}
