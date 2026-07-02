'use client';

import { Sparkles, TrendingUp, MessageSquare, Loader2 } from 'lucide-react';

/** AI 评审报告 */
interface AIReviewReport {
  scores: Record<string, number>;
  suggestions: string[];
  overallComment: string;
}

interface AIReviewPanelProps {
  report: AIReviewReport | null;
  loading: boolean;
}

/** 维度中文映射 */
const DIMENSION_LABELS: Record<string, string> = {
  correctness: '正确性',
  readability: '可读性',
  performance: '性能',
  security: '安全性',
  best_practice: '最佳实践',
};

/** 分数对应颜色 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 50) return 'bg-yellow-500';
  if (score >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function AIReviewPanel({ report, loading }: AIReviewPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white/80">AI 智能评审</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/5 border border-purple-500/10 rounded-xl">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-xs text-purple-400/70">AI 正在评审你的代码...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const avgScore = Object.values(report.scores).length > 0
    ? Math.round(Object.values(report.scores).reduce((a, b) => a + b, 0) / Object.values(report.scores).length)
    : 0;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white/80">AI 智能评审</span>
        </div>
        <span className={`text-lg font-bold ${getScoreColor(avgScore)}`}>
          {avgScore}
        </span>
      </div>

      {/* Dimension scores */}
      <div className="space-y-2">
        {Object.entries(report.scores).map(([dim, score]) => (
          <div key={dim} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">
                {DIMENSION_LABELS[dim] || dim}
              </span>
              <span className={`text-xs font-medium ${getScoreColor(score)}`}>
                {score}
              </span>
            </div>
            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Overall comment */}
      {report.overallComment && (
        <div className="px-3 py-2 bg-purple-500/5 border border-purple-500/10 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-purple-400/70 uppercase tracking-wider">总体评语</span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">{report.overallComment}</p>
        </div>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400/70 uppercase tracking-wider">改进建议</span>
          </div>
          {report.suggestions.map((suggestion, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-1.5 bg-white/[0.02] rounded-lg"
            >
              <span className="text-[10px] text-white/50 mt-0.5">{i + 1}</span>
              <p className="text-xs text-white/50 leading-relaxed">{suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
