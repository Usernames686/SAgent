'use client';

import { useState } from 'react';
import { Brain, CheckCircle2, XCircle, ArrowRight, RotateCcw, Code2, ListOrdered, FileEdit, AlertTriangle } from 'lucide-react';

/** Quiz 题型 */
type QuizType = 'choice' | 'fill_blank' | 'code_completion' | 'code_review' | 'ordering';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface CodeReviewIssue {
  line: number;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

interface OrderingItem {
  id: string;
  text: string;
  correctOrder: number;
}

interface QuizQuestion {
  questionId: string;
  questionText: string;
  type: QuizType;
  options?: QuizOption[];
  blankAnswer?: string;
  blankAlternatives?: string[];
  codeTemplate?: string;
  codeAnswer?: string;
  codeSnippet?: string;
  reviewIssues?: CodeReviewIssue[];
  orderingItems?: OrderingItem[];
  explanation?: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}

interface QuizPanelProps {
  questions: QuizQuestion[];
  onSubmit: (answers: { questionId: string; selectedOptionId: string }[]) => void;
  onRetry: () => void;
  feedback: { correct: boolean; score: number; feedback: string } | null;
  submitting: boolean;
}

/** 题型标签 */
function QuizTypeBadge({ type }: { type: QuizType }) {
  const config: Record<QuizType, { label: string; color: string; icon: React.ReactNode }> = {
    choice: { label: '选择题', color: 'bg-violet-500/15 text-violet-400', icon: <Brain className="w-3 h-3" /> },
    fill_blank: { label: '填空题', color: 'bg-blue-500/15 text-blue-400', icon: <FileEdit className="w-3 h-3" /> },
    code_completion: { label: '代码补全', color: 'bg-emerald-500/15 text-emerald-400', icon: <Code2 className="w-3 h-3" /> },
    code_review: { label: '代码评审', color: 'bg-amber-500/15 text-amber-400', icon: <AlertTriangle className="w-3 h-3" /> },
    ordering: { label: '排序题', color: 'bg-pink-500/15 text-pink-400', icon: <ListOrdered className="w-3 h-3" /> },
  };
  const { label, color, icon } = config[type] || config.choice;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${color}`}>
      {icon} {label}
    </span>
  );
}

export default function QuizPanel({
  questions,
  onSubmit,
  onRetry,
  feedback,
  submitting,
}: QuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [orderingAnswers, setOrderingAnswers] = useState<Record<string, string[]>>({});

  const allAnswered = questions.every(q => {
    if (q.type === 'choice') return answers[q.questionId];
    if (q.type === 'fill_blank') return answers[q.questionId]?.trim();
    if (q.type === 'code_completion') return answers[q.questionId]?.trim();
    if (q.type === 'code_review') return true; // 代码评审无需"答题"
    if (q.type === 'ordering') return (orderingAnswers[q.questionId]?.length || 0) === (q.orderingItems?.length || 0);
    return true;
  });

  const handleSubmit = () => {
    if (!allAnswered) return;
    const formattedAnswers = Object.entries(answers).map(([qId, optId]) => ({
      questionId: qId,
      selectedOptionId: optId,
    }));
    onSubmit(formattedAnswers);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Quiz 测试</h3>
          <p className="text-xs text-white/55">回答以下问题来检验你的理解</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={q.questionId} className="glass rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center text-sm font-medium shrink-0">
                {qi + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <QuizTypeBadge type={q.type || 'choice'} />
                  {q.difficulty && (
                    <span className="text-xs text-white/55">
                      {q.difficulty === 'basic' ? '⭐' : q.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{q.questionText}</p>
              </div>
            </div>

            {/* 选择题 */}
            {q.type === 'choice' && q.options && (
              <div className="space-y-2 ml-10">
                {q.options.map((opt) => {
                  const isSelected = answers[q.questionId] === opt.id;
                  const showCorrect = feedback && opt.isCorrect;
                  const showWrong = feedback && isSelected && !opt.isCorrect;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => !feedback && setAnswers(prev => ({ ...prev, [q.questionId]: opt.id }))}
                      disabled={!!feedback}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                        showCorrect
                          ? 'bg-green-500/15 border-green-500/30 text-green-400'
                          : showWrong
                            ? 'bg-red-500/15 border-red-500/30 text-red-400'
                            : isSelected
                              ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {showCorrect && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        {showWrong && <XCircle className="w-4 h-4 shrink-0" />}
                        <span>{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 填空题 */}
            {q.type === 'fill_blank' && (
              <div className="ml-10">
                <input
                  type="text"
                  value={answers[q.questionId] || ''}
                  onChange={(e) => !feedback && setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                  disabled={!!feedback}
                  placeholder="输入你的答案..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/30 focus:bg-white/[0.06] transition-all disabled:opacity-60"
                />
                {feedback && q.blankAnswer && (
                  <p className="mt-2 text-sm text-green-400/80">
                    正确答案：<code className="bg-green-500/10 px-1.5 py-0.5 rounded">{q.blankAnswer}</code>
                  </p>
                )}
              </div>
            )}

            {/* 代码补全 */}
            {q.type === 'code_completion' && q.codeTemplate && (
              <div className="ml-10 space-y-2">
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs text-white/60 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{q.codeTemplate}</pre>
                </div>
                <textarea
                  value={answers[q.questionId] || ''}
                  onChange={(e) => !feedback && setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                  disabled={!!feedback}
                  placeholder="补全代码..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-mono bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/30 focus:bg-white/[0.06] transition-all disabled:opacity-60 resize-y"
                />
                {feedback && q.codeAnswer && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 font-mono text-xs text-green-400/80 overflow-x-auto">
                    <p className="text-xs text-green-400/60 mb-2 font-sans">参考答案：</p>
                    <pre className="whitespace-pre-wrap">{q.codeAnswer}</pre>
                  </div>
                )}
              </div>
            )}

            {/* 代码评审 */}
            {q.type === 'code_review' && q.codeSnippet && (
              <div className="ml-10 space-y-2">
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs text-white/60 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{q.codeSnippet}</pre>
                </div>
                {feedback && q.reviewIssues && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-amber-400/80 font-medium">代码问题：</p>
                    {q.reviewIssues.map((issue, i) => (
                      <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                        issue.severity === 'error' ? 'bg-red-500/10 text-red-400/80' :
                        issue.severity === 'warning' ? 'bg-amber-500/10 text-amber-400/80' :
                        'bg-blue-500/10 text-blue-400/80'
                      }`}>
                        <span className="font-mono text-white/65 shrink-0">L{issue.line}</span>
                        <span>{issue.description}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!feedback && (
                  <p className="text-xs text-white/55 italic">提交后将展示代码问题分析</p>
                )}
              </div>
            )}

            {/* 排序题 */}
            {q.type === 'ordering' && q.orderingItems && (
              <div className="ml-10 space-y-2">
                {!feedback ? (
                  <div className="space-y-1.5">
                    {q.orderingItems
                      .slice()
                      .sort(() => Math.random() - 0.5) // 打乱顺序
                      .map((item) => {
                        const currentOrder = orderingAnswers[q.questionId] || [];
                        const isSelected = currentOrder.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setOrderingAnswers(prev => {
                                const current = prev[q.questionId] || [];
                                const newOrder = isSelected
                                  ? current.filter(id => id !== item.id)
                                  : [...current, item.id];
                                return { ...prev, [q.questionId]: newOrder };
                              });
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                              isSelected
                                ? `bg-pink-500/15 border-pink-500/30 text-pink-400 ${currentOrder.indexOf(item.id) === 0 ? 'order-first' : ''}`
                                : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0">
                                  {(orderingAnswers[q.questionId]?.indexOf(item.id) ?? -1) + 1}
                                </span>
                              )}
                              <span>{item.text}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {q.orderingItems
                      .sort((a, b) => a.correctOrder - b.correctOrder)
                      .map((item) => (
                        <div key={item.id} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-green-500/10 border border-green-500/20 text-green-400/80">
                          <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {item.correctOrder}
                          </span>
                          <span>{item.text}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 解析 */}
            {feedback && q.explanation && (
              <div className="mt-3 ml-10 text-xs text-white/65 border-t border-white/[0.06] pt-2">
                📖 {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`glass rounded-2xl p-5 ${feedback.correct ? 'border border-green-500/20' : 'border border-orange-500/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            {feedback.correct ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-orange-400" />
            )}
            <span className={`font-medium ${feedback.correct ? 'text-green-400' : 'text-orange-400'}`}>
              得分：{(feedback.score * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{feedback.feedback}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!feedback ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-all"
          >
            {submitting ? '提交中...' : <><ArrowRight className="w-4 h-4" /> 提交答案</>}
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-sm font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" /> 重新测验
          </button>
        )}
      </div>
    </div>
  );
}
