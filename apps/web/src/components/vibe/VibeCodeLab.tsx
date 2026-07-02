'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-white/40">编辑器加载中...</div> }) as any;
import {
  Code2, Send, RotateCcw, CheckCircle2, XCircle,
  Lightbulb, ChevronDown, ChevronUp, Sparkles, Terminal,
  BookOpen, Brain, Play, Shield, Beaker,
} from 'lucide-react';
import { LOOP_STEPS, PASS_THRESHOLD } from './phase-config';
import { vibeLearningApi } from '@/lib/api';
import RuntimeOutputPanel from './RuntimeOutputPanel';
import UnitTestPanel from './UnitTestPanel';
import AIReviewPanel from './AIReviewPanel';
import HintPanel from './HintPanel';

// ── Types ──

interface CodeAnalysis {
  correct: string[];
  missing: string[];
  suggestions: string[];
}

interface CodeFeedback {
  score: number;
  feedback: string;
  analysis?: CodeAnalysis;
  referenceSolution?: string;
  nodeCompleted: boolean;
}

/** 4级验证评分结果 */
interface ExerciseScore {
  level1Score: number;
  level2Score: number;
  level3Score: number;
  level4Score: number;
  totalScore: number;
  details: {
    patternResults: Array<{ name: string; passed: boolean; weight: number }>;
    runtimeResults: Array<{ description: string; passed: boolean; actual: string }>;
    testResults: Array<{ testName: string; passed: boolean; error?: string }>;
    aiReview?: {
      scores: Record<string, number>;
      suggestions: string[];
      overallComment: string;
    };
  };
  hintPenalty: number;
  weights: [number, number, number, number];
}

interface VibeCodeLabProps {
  template: string;
  nodeName: string;
  nodeId: string;
  onSubmit: (code: string) => void;
  onRetry: () => void;
  /** 闭环：回到概念理解 */
  onBackToConcept?: () => void;
  /** 闭环：进入评估测验 */
  onStartQuiz?: () => void;
  feedback: CodeFeedback | null;
  submitting: boolean;
}

// ── Score Ring SVG (§7.4.3) ──

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * 100 / 100) * circumference;
  const passed = score >= PASS_THRESHOLD;
  const color = passed ? '#22c55e' : score >= 0.6 ? '#eab308' : '#ef4444';

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
          strokeDasharray={`${score * circumference} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-black ${passed ? 'text-green-400' : score >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
          {Math.round(score * 100)}
        </span>
      </div>
    </div>
  );
}

function getLevelScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-orange-400';
}

// ── Component ──

export default function VibeCodeLab({
  template,
  nodeName,
  nodeId,
  onSubmit,
  onRetry,
  onBackToConcept,
  onStartQuiz,
  feedback,
  submitting,
}: VibeCodeLabProps) {
  const [code, setCode] = useState(template);
  const [showReference, setShowReference] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const passed = feedback && feedback.score >= PASS_THRESHOLD;

  // ── Phase 3: 4级验证状态 ──
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [exerciseScore, setExerciseScore] = useState<ExerciseScore | null>(null);
  const [exerciseSubmitting, setExerciseSubmitting] = useState(false);
  const [nextStepAdvice, setNextStepAdvice] = useState<'retry' | 'pass' | 'perfect' | null>(null);

  // 沙箱运行状态
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    success: boolean;
    stdout: string;
    stderr: string;
    executionTime: number;
  } | null>(null);

  // 提示状态
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintData, setHintData] = useState<Array<{ level: number; content: string; penalty: number }>>([]);
  const [hintPenalty, setHintPenalty] = useState(0);

  const handleEditorMount = useCallback((editor: any) => {
    editor.focus();
  }, []);

  /** 4级验证提交 */
  const handleAdvancedSubmit = async () => {
    setExerciseSubmitting(true);
    try {
      const result = await vibeLearningApi.submitExercise({
        nodeId,
        code,
        hintsUsed,
      }) as { score: ExerciseScore; nextStep: 'retry' | 'pass' | 'perfect' };
      setExerciseScore(result.score);
      setNextStepAdvice(result.nextStep);
    } catch (error) {
      console.error('Submit exercise failed:', error);
    } finally {
      setExerciseSubmitting(false);
    }
  };

  /** 运行代码（沙箱） */
  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await vibeLearningApi.runSandbox({ code }) as {
        success: boolean; stdout: string; stderr: string; executionTime: number;
      };
      setRunResult(result);
    } catch (error) {
      setRunResult({
        success: false,
        stdout: '',
        stderr: (error as Error).message || '运行失败',
        executionTime: 0,
      });
    } finally {
      setRunning(false);
    }
  };

  /** 获取提示 */
  const handleRevealHint = async (level: number) => {
    try {
      const result = await vibeLearningApi.getExerciseHint({
        nodeId,
        currentHintLevel: hintsUsed,
      }) as { hint: string | null; nextLevel: number; penalty: number };
      if (result.hint) {
        setHintData(prev => [...prev, { level, content: result.hint!, penalty: result.penalty }]);
        setHintsUsed(result.nextLevel);
        setHintPenalty(prev => prev + (result.penalty || 0));
      }
    } catch (error) {
      console.error('Get hint failed:', error);
    }
  };

  /** 重试4级验证 */
  const handleAdvancedRetry = () => {
    setExerciseScore(null);
    setNextStepAdvice(null);
    setRunResult(null);
    setHintsUsed(0);
    setHintData([]);
    setHintPenalty(0);
  };

  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* Header + Mode Toggle */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white">编码实验室</h3>
          <p className="text-[11px] text-white/55">{nodeName}</p>
        </div>
        {/* Mode toggle: 简单模式 / 4级验证模式 */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.05]">
          <button
            onClick={() => setMode('simple')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
              mode === 'simple'
                ? 'bg-pink-500/15 text-pink-400'
                : 'text-white/55 hover:text-white/50'
            }`}
          >
            简单模式
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${
              mode === 'advanced'
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-white/55 hover:text-white/50'
            }`}
          >
            <Shield className="w-3 h-3" /> 4级验证
          </button>
        </div>
      </div>

      {/* Loop Step Indicator */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        {LOOP_STEPS.map((step, i) => {
          const isActive = step.key === 'code';
          return (
            <div key={step.key} className="flex items-center gap-1.5">
              {i > 0 && <div className="w-4 h-px bg-white/[0.06]" />}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20'
                  : 'text-white/50'
              }`}>
                <span>{step.emoji}</span>
                <span>{step.label}</span>
                {isActive && <span className="ml-0.5 text-pink-400/50">← 你在这里</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor + Result Split */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
        {/* Code Editor */}
        <div className="flex-1 min-h-0 glass rounded-2xl overflow-hidden flex flex-col">
          {/* Editor Toolbar */}
          <div className="h-9 bg-white/[0.02] border-b border-white/[0.05] flex items-center px-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
            </div>
            <span className="ml-3 text-[10px] text-white/50 font-mono">main.js</span>
            {mode === 'advanced' && hintsUsed > 0 && (
              <span className="ml-auto text-[10px] text-amber-400/60">
                💡 提示扣分：{Math.round(hintPenalty * 100)}%
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={(v: any) => setCode(v || '')}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{ fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                padding: { top: 12 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: 'on',
                renderLineHighlight: 'gutter',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                suggest: { showKeywords: true },
                wordWrap: 'on',
              } as any}
            />
          </div>
        </div>

        {/* ── Result Panel ── */}
        <div className="lg:w-[380px] shrink-0 flex flex-col gap-3 overflow-auto">
          {mode === 'simple' ? (
            /* ── Simple Mode: Original Feedback ── */
            feedback && (
              <>
                {/* Score Card with SVG Ring */}
                <div className={`rounded-2xl p-4 border ${
                  passed ? 'border-green-500/15 bg-green-500/[0.03]' : 'border-orange-500/15 bg-orange-500/[0.03]'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {passed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-orange-400" />
                    )}
                    <span className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-orange-400'}`}>
                      {passed ? '✅ 通过！' : '❌ 未通过（需 ≥90%）'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <ScoreRing score={feedback.score} size={72} />
                    <p className="text-xs text-white/65 leading-relaxed flex-1">{feedback.feedback}</p>
                  </div>
                </div>

                {/* Analysis Section */}
                {feedback.analysis && (
                  <div className="glass rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" /> AI 分析
                      </span>
                      {showAnalysis ? <ChevronUp className="w-3.5 h-3.5 text-white/50" /> : <ChevronDown className="w-3.5 h-3.5 text-white/50" />}
                    </button>
                    {showAnalysis && (
                      <div className="px-4 pb-4 space-y-3">
                        {feedback.analysis.correct.length > 0 && (
                          <div>
                            <span className="text-[10px] text-green-400/70 font-semibold">✅ 已实现</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {feedback.analysis.correct.map((c, i) => (
                                <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px]">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {feedback.analysis.missing.length > 0 && (
                          <div>
                            <span className="text-[10px] text-red-400/70 font-semibold">❌ 未实现</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {feedback.analysis.missing.map((m, i) => (
                                <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px]">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {feedback.analysis.suggestions.length > 0 && (
                          <div>
                            <span className="text-[10px] text-yellow-400/70 font-semibold flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> 改进建议
                            </span>
                            <ul className="mt-1 space-y-0.5">
                              {feedback.analysis.suggestions.map((s, i) => (
                                <li key={i} className="text-[10px] text-white/65">• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Reference Solution */}
                {feedback.referenceSolution && !passed && (
                  <div className="glass rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowReference(!showReference)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xs font-semibold text-blue-400/70 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" /> 参考答案
                      </span>
                      {showReference ? <ChevronUp className="w-3.5 h-3.5 text-white/50" /> : <ChevronDown className="w-3.5 h-3.5 text-white/50" />}
                    </button>
                    {showReference && (
                      <div className="px-4 pb-4">
                        <pre className="p-3 rounded-xl bg-[#0a0a0f] text-[11px] font-mono text-white/50 whitespace-pre-wrap overflow-auto max-h-48 border border-white/[0.04]">
                          {feedback.referenceSolution}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          ) : (
            /* ── Advanced Mode: 4-Level Verification ── */
            <>
              {/* Run sandbox button */}
              <RuntimeOutputPanel result={runResult} running={running} onRun={handleRun} />

              {/* Hint panel */}
              <HintPanel
                hints={hintData}
                revealedLevels={hintsUsed}
                onReveal={handleRevealHint}
                disabled={exerciseSubmitting}
              />

              {/* 4-level score result */}
              {exerciseScore && (
                <>
                  {/* Total score card */}
                  <div className="glass rounded-2xl p-4 border border-blue-500/15">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-white/80">综合评分</span>
                      </div>
                      <span className={`text-xl font-bold ${getLevelScoreColor(exerciseScore.totalScore)}`}>
                        {exerciseScore.totalScore}
                      </span>
                    </div>

                    {/* 4-level breakdown */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div className="text-center">
                        <div className={`text-base font-bold ${getLevelScoreColor(exerciseScore.level1Score)}`}>{exerciseScore.level1Score}</div>
                        <div className="text-[9px] text-white/55">L1 模式</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-base font-bold ${getLevelScoreColor(exerciseScore.level2Score)}`}>{exerciseScore.level2Score}</div>
                        <div className="text-[9px] text-white/55">L2 运行</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-base font-bold ${getLevelScoreColor(exerciseScore.level3Score)}`}>{exerciseScore.level3Score}</div>
                        <div className="text-[9px] text-white/55">L3 测试</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-base font-bold ${getLevelScoreColor(exerciseScore.level4Score)}`}>{exerciseScore.level4Score}</div>
                        <div className="text-[9px] text-white/55">L4 AI</div>
                      </div>
                    </div>

                    {/* Next step advice */}
                    {nextStepAdvice && (
                      <div className={`flex items-center gap-1.5 text-[11px] ${
                        nextStepAdvice === 'perfect' ? 'text-green-400' :
                        nextStepAdvice === 'pass' ? 'text-emerald-400' : 'text-orange-400'
                      }`}>
                        {nextStepAdvice === 'perfect' && <><CheckCircle2 className="w-3.5 h-3.5" /> 完美通过！</>}
                        {nextStepAdvice === 'pass' && <><CheckCircle2 className="w-3.5 h-3.5" /> 通过！</>}
                        {nextStepAdvice === 'retry' && <><XCircle className="w-3.5 h-3.5" /> 未通过</>}
                      </div>
                    )}
                  </div>

                  {/* L1: Pattern check details */}
                  {exerciseScore.details.patternResults.length > 0 && (
                    <div className="glass rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-medium text-white/70">L1 模式匹配</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {exerciseScore.details.patternResults.map((r, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${
                              r.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {r.passed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* L2: Runtime check details */}
                  {exerciseScore.details.runtimeResults.length > 0 && (
                    <div className="glass rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-medium text-white/70">L2 运行验证</span>
                      </div>
                      <div className="space-y-1">
                        {exerciseScore.details.runtimeResults.map((r, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] ${
                              r.passed ? 'bg-green-500/5 text-green-400/80' : 'bg-red-500/5 text-red-400/80'
                            }`}
                          >
                            {r.passed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            <span>{r.description}</span>
                            {!r.passed && <span className="ml-auto text-white/55 truncate max-w-28">实际: {r.actual}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* L3: Unit test details */}
                  {exerciseScore.details.testResults.length > 0 && (
                    <UnitTestPanel
                      results={exerciseScore.details.testResults}
                      running={false}
                      totalPassed={exerciseScore.details.testResults.filter(r => r.passed).length}
                      totalTests={exerciseScore.details.testResults.length}
                    />
                  )}

                  {/* L4: AI Review */}
                  {exerciseScore.details.aiReview && (
                    <AIReviewPanel report={exerciseScore.details.aiReview} loading={false} />
                  )}
                </>
              )}

              {/* No score yet placeholder */}
              {!exerciseScore && !runResult && (
                <div className="text-center py-8 text-white/70 text-xs">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-white/65" />
                  4级验证：模式匹配 → 运行验证 → 单元测试 → AI 评审
                  <br />
                  <span className="text-white/65">先运行代码查看输出，然后提交评分</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Bar — with closed-loop decision */}
      <div className="flex items-center gap-3 mt-3 shrink-0">
        {mode === 'simple' ? (
          /* ── Simple Mode Actions ── */
          <>
            {!feedback || !passed ? (
              <button
                onClick={() => onSubmit(code)}
                disabled={submitting || !code.trim()}
                className="btn-primary flex-1 py-3 text-sm"
              >
                {submitting ? (
                  <><span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> 评估中...</>
                ) : (
                  <><Send className="w-4 h-4" /> 提交代码</>
                )}
              </button>
            ) : null}

            {feedback && passed && onStartQuiz && (
              <button onClick={onStartQuiz} className="btn-primary flex-1 py-3 text-sm">
                <Brain className="w-4 h-4" /> 进入评估测验
              </button>
            )}

            {feedback && !passed && (
              <>
                <button onClick={onRetry} className="btn-secondary px-5 py-3 text-sm">
                  <RotateCcw className="w-4 h-4" /> 重试
                </button>
                {onBackToConcept && (
                  <button onClick={onBackToConcept} className="btn-secondary px-5 py-3 text-sm">
                    <BookOpen className="w-4 h-4" /> 回到概念理解
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          /* ── Advanced Mode Actions ── */
          <>
            {!exerciseScore || exerciseScore.totalScore < 60 ? (
              <>
                <button
                  onClick={handleAdvancedSubmit}
                  disabled={exerciseSubmitting || !code.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-all"
                >
                  {exerciseSubmitting ? '4级验证中...' : <><Shield className="w-4 h-4" /> 4级验证提交</>}
                </button>
                <button
                  onClick={handleRun}
                  disabled={running || !code.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 transition-all disabled:opacity-50"
                >
                  {running ? <><span className="inline-block w-4 h-4 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" /> 运行中</> : <><Play className="w-4 h-4" /> 运行</>}
                </button>
              </>
            ) : null}

            {exerciseScore && exerciseScore.totalScore >= 60 && exerciseScore.totalScore < 90 && (
              <>
                <button onClick={handleAdvancedRetry} className="btn-secondary px-5 py-3 text-sm">
                  <RotateCcw className="w-4 h-4" /> 重试
                </button>
                {onBackToConcept && (
                  <button onClick={onBackToConcept} className="btn-secondary px-5 py-3 text-sm">
                    <BookOpen className="w-4 h-4" /> 回到概念理解
                  </button>
                )}
              </>
            )}

            {exerciseScore && exerciseScore.totalScore >= 90 && onStartQuiz && (
              <button onClick={onStartQuiz} className="btn-primary flex-1 py-3 text-sm">
                <Brain className="w-4 h-4" /> 进入评估测验
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
