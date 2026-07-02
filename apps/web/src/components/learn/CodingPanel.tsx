'use client';

import { useState } from 'react';
import { Code2, Play, Send, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

interface CodingPanelProps {
  template: string;
  nodeName: string;
  onSubmit: (code: string) => void;
  onRetry: () => void;
  feedback: {
    score: number;
    feedback: string;
    analysis?: { correct: string[]; missing: string[]; suggestions: string[] };
    referenceSolution?: string;
    nodeCompleted: boolean;
  } | null;
  submitting: boolean;
}

export default function CodingPanel({
  template,
  nodeName,
  onSubmit,
  onRetry,
  feedback,
  submitting,
}: CodingPanelProps) {
  const [code, setCode] = useState(template);
  const [showReference, setShowReference] = useState(false);
  const passed = feedback && feedback.score >= 0.9;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">编码练习</h3>
          <p className="text-xs text-white/55">{nodeName} - 在编辑器中编写代码</p>
        </div>
      </div>

      {/* Code Editor */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="h-8 bg-white/[0.03] border-b border-white/[0.06] flex items-center px-3">
          <span className="text-[10px] text-white/55">JavaScript</span>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64 bg-transparent p-4 font-mono text-sm text-white/80 resize-none focus:outline-none"
          placeholder="在此编写代码..."
          spellCheck={false}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`glass rounded-2xl p-5 ${passed ? 'border border-green-500/20' : 'border border-orange-500/20'}`}>
          {/* Score */}
          <div className="flex items-center gap-2 mb-3">
            {passed ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-orange-400" />
            )}
            <span className={`font-medium ${passed ? 'text-green-400' : 'text-orange-400'}`}>
              得分：{(feedback.score * 100).toFixed(0)}% {passed ? '✅ 通过！' : '❌ 未通过（需90%以上）'}
            </span>
          </div>

          {/* Analysis */}
          {feedback.analysis && (
            <div className="space-y-2 mb-3">
              {feedback.analysis.correct.length > 0 && (
                <div>
                  <span className="text-xs text-green-400/70">✅ 已实现：</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {feedback.analysis.correct.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {feedback.analysis.missing.length > 0 && (
                <div>
                  <span className="text-xs text-red-400/70">❌ 未实现：</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {feedback.analysis.missing.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {feedback.analysis.suggestions.length > 0 && (
                <div>
                  <span className="text-xs text-yellow-400/70 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> 改进建议：</span>
                  <ul className="mt-1 space-y-0.5">
                    {feedback.analysis.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-white/50">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-white/60 whitespace-pre-wrap">{feedback.feedback}</p>

          {/* Reference Solution Toggle */}
          {feedback.referenceSolution && !passed && (
            <div className="mt-3">
              <button
                onClick={() => setShowReference(!showReference)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showReference ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showReference ? '隐藏参考答案' : '查看参考答案'}
              </button>
              {showReference && (
                <div className="mt-2 glass rounded-xl p-3 border border-blue-500/10">
                  <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap overflow-auto max-h-48">{feedback.referenceSolution}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!feedback || !passed ? (
          <button
            onClick={() => onSubmit(code)}
            disabled={submitting || !code.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-all"
          >
            {submitting ? '评估中...' : <><Send className="w-4 h-4" /> 提交代码</>}
          </button>
        ) : null}
        {feedback && !passed && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-sm font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" /> 重试
          </button>
        )}
      </div>
    </div>
  );
}
