'use client';

import { useState } from 'react';
import {
  Shield, Send, RotateCcw, Lightbulb, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Sparkles, Play, Beaker,
} from 'lucide-react';
import { vibeLearningApi } from '@/lib/api';
import RuntimeOutputPanel from './RuntimeOutputPanel';
import UnitTestPanel from './UnitTestPanel';
import AIReviewPanel from './AIReviewPanel';

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

interface ExerciseScoringPanelProps {
  nodeId: string;
  nodeName: string;
  codeTemplate: string;
  referenceSolution?: string;
  onScored?: (score: ExerciseScore) => void;
}

/** 分数对应颜色 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-orange-400';
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-green-500/10 border-green-500/20';
  if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-orange-500/10 border-orange-500/20';
}

export default function ExerciseScoringPanel({
  nodeId,
  nodeName,
  codeTemplate,
  referenceSolution,
  onScored,
}: ExerciseScoringPanelProps) {
  const [code, setCode] = useState(codeTemplate);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [hintPenalty, setHintPenalty] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<ExerciseScore | null>(null);
  const [nextStepAdvice, setNextStepAdvice] = useState<'retry' | 'pass' | 'perfect' | null>(null);
  const [showReference, setShowReference] = useState(false);

  // 沙箱运行状态
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ success: boolean; stdout: string; stderr: string; executionTime: number } | null>(null);

  /** 提交代码进行4级验证评分 */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await vibeLearningApi.submitExercise({
        nodeId,
        code,
        hintsUsed,
      }) as { score: ExerciseScore; nextStep: 'retry' | 'pass' | 'perfect' };
      const scoreData = result.score;
      setScore(scoreData);
      setNextStepAdvice(result.nextStep);
      onScored?.(scoreData);
    } catch (error) {
      console.error('Submit exercise failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  /** 运行代码（仅沙箱运行，不评分） */
  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await vibeLearningApi.runSandbox({ code }) as { success: boolean; stdout: string; stderr: string; executionTime: number };
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
  const handleHint = async () => {
    try {
      const result = await vibeLearningApi.getExerciseHint({
        nodeId,
        currentHintLevel: hintsUsed,
      }) as { hint: string | null; nextLevel: number; penalty: number };
      if (result.hint) {
        setCurrentHint(result.hint);
        setHintsUsed(result.nextLevel);
        setHintPenalty(prev => prev + (result.penalty || 0));
      }
    } catch (error) {
      console.error('Get hint failed:', error);
    }
  };

  /** 重试 */
  const handleRetry = () => {
    setScore(null);
    setNextStepAdvice(null);
    setRunResult(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">4级验证练习</h3>
          <p className="text-xs text-white/55">{nodeName} — 模式匹配 → 运行验证 → 单元测试 → AI 评审</p>
        </div>
      </div>

      {/* Code Editor */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="h-8 bg-white/[0.03] border-b border-white/[0.06] flex items-center px-3 justify-between">
          <span className="text-[10px] text-white/55">JavaScript</span>
          {hintsUsed > 0 && (
            <span className="text-[10px] text-amber-400/60">提示扣分：{Math.round(hintPenalty * 100)}%</span>
          )}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64 bg-transparent p-4 font-mono text-sm text-white/80 resize-none focus:outline-none"
          placeholder="在此编写代码..."
          spellCheck={false}
          disabled={submitting}
        />
      </div>

      {/* Hint area */}
      {currentHint && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400/80 leading-relaxed">{currentHint}</p>
        </div>
      )}

      {/* Run button + result */}
      <RuntimeOutputPanel result={runResult} running={running} onRun={handleRun} />

      {/* Score results (after submission) */}
      {score && (
        <div className="space-y-4">
          {/* Total score */}
          <div className={`glass rounded-2xl p-5 border ${getScoreBg(score.totalScore)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-white/80">综合评分</span>
              </div>
              <span className={`text-2xl font-bold ${getScoreColor(score.totalScore)}`}>
                {score.totalScore}
              </span>
            </div>

            {/* 4-level score breakdown */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className={`text-lg font-bold ${getScoreColor(score.level1Score)}`}>{score.level1Score}</div>
                <div className="text-[10px] text-white/55">L1 模式匹配</div>
                <div className="text-[10px] text-white/50">权重 {Math.round(score.weights[0] * 100)}%</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${getScoreColor(score.level2Score)}`}>{score.level2Score}</div>
                <div className="text-[10px] text-white/55">L2 运行验证</div>
                <div className="text-[10px] text-white/50">权重 {Math.round(score.weights[1] * 100)}%</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${getScoreColor(score.level3Score)}`}>{score.level3Score}</div>
                <div className="text-[10px] text-white/55">L3 单元测试</div>
                <div className="text-[10px] text-white/50">权重 {Math.round(score.weights[2] * 100)}%</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${getScoreColor(score.level4Score)}`}>{score.level4Score}</div>
                <div className="text-[10px] text-white/55">L4 AI 评审</div>
                <div className="text-[10px] text-white/50">权重 {Math.round(score.weights[3] * 100)}%</div>
              </div>
            </div>

            {/* Next step advice */}
            {nextStepAdvice && (
              <div className={`mt-3 flex items-center gap-2 text-xs ${
                nextStepAdvice === 'perfect' ? 'text-green-400' :
                nextStepAdvice === 'pass' ? 'text-emerald-400' : 'text-orange-400'
              }`}>
                {nextStepAdvice === 'perfect' && <><CheckCircle2 className="w-4 h-4" /> 完美通过！继续下一课</>}
                {nextStepAdvice === 'pass' && <><CheckCircle2 className="w-4 h-4" /> 通过！可以继续下一课</>}
                {nextStepAdvice === 'retry' && <><XCircle className="w-4 h-4" /> 未通过，建议修改后重新提交</>}
              </div>
            )}
          </div>

          {/* L1: Pattern check details */}
          {score.details.patternResults.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white/80">L1 模式匹配详情</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {score.details.patternResults.map((r, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
                      r.passed
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {r.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* L2: Runtime check details */}
          {score.details.runtimeResults.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Play className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white/80">L2 运行验证详情</span>
              </div>
              <div className="space-y-1.5">
                {score.details.runtimeResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                      r.passed ? 'bg-green-500/5 text-green-400/80' : 'bg-red-500/5 text-red-400/80'
                    }`}
                  >
                    {r.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{r.description}</span>
                    {!r.passed && <span className="ml-auto text-white/55 truncate max-w-32">实际: {r.actual}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* L3: Unit test details */}
          {score.details.testResults.length > 0 && (
            <UnitTestPanel
              results={score.details.testResults}
              running={false}
              totalPassed={score.details.testResults.filter(r => r.passed).length}
              totalTests={score.details.testResults.length}
            />
          )}

          {/* L4: AI Review */}
          {score.details.aiReview && (
            <AIReviewPanel report={score.details.aiReview} loading={false} />
          )}
        </div>
      )}

      {/* Reference solution toggle */}
      {referenceSolution && score && score.totalScore < 90 && (
        <div>
          <button
            onClick={() => setShowReference(!showReference)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showReference ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showReference ? '隐藏参考答案' : '查看参考答案'}
          </button>
          {showReference && (
            <div className="mt-2 glass rounded-xl p-3 border border-blue-500/10">
              <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap overflow-auto max-h-48">{referenceSolution}</pre>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!score || score.totalScore < 60 ? (
          <>
            <button
              onClick={handleSubmit}
              disabled={submitting || !code.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-all"
            >
              {submitting ? '4级验证中...' : <><Send className="w-4 h-4" /> 提交评分</>}
            </button>
            <button
              onClick={handleHint}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/20 rounded-xl text-sm text-amber-400 transition-all disabled:opacity-50"
            >
              <Lightbulb className="w-4 h-4" /> 提示 ({3 - hintsUsed} 剩余)
            </button>
          </>
        ) : null}
        {score && score.totalScore < 60 && (
          <button
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-sm font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" /> 重试
          </button>
        )}
      </div>
    </div>
  );
}
