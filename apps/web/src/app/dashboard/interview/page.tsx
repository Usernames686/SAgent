'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { interviewApi } from '@/lib/api';
import { Loader2, GraduationCap, Clock, CheckCircle, XCircle, RotateCcw, ChevronRight, Star, Target, Zap, Trophy, Lightbulb, BookOpen, AlertCircle, Brain, TrendingUp, Sparkles } from 'lucide-react';

interface InterviewQuestion {
  id: string;
  type: 'concept' | 'coding' | 'system_design' | 'behavioral' | 'scenario';
  difficulty: 1 | 2 | 3 | 4 | 5;
  question: string;
  expectedAnswer?: string;
  hints?: string[];
  timeLimit?: number;
}

interface AnswerRecord {
  questionId: string;
  answer: string;
  score?: number;
  feedback?: string;
  improvements?: string[];
}

interface InterviewEvaluation {
  overallScore: number;
  dimensionScores: {
    technicalDepth: number;
    problemSolving: number;
    communication: number;
    codeQuality: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendedTopics: string[];
  answerReviews?: AnswerRecord[];
}

const ROLES = [
  { id: 'frontend', label: '前端开发', icon: '🎨' },
  { id: 'backend', label: '后端开发', icon: '⚙️' },
  { id: 'fullstack', label: '全栈工程师', icon: '🚀' },
  { id: 'ai_engineer', label: 'AI 工程师', icon: '🤖' },
  { id: 'algorithm', label: '算法工程师', icon: '🧮' },
  { id: 'devops', label: 'DevOps', icon: '📦' },
];

const FOCUS_AREAS = [
  { id: 'react', label: 'React' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'performance', label: '性能优化' },
  { id: 'system-design', label: '系统设计' },
  { id: 'ai-vibe', label: '氛围编程' },
  { id: 'debugging', label: '调试排错' },
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  concept: '概念题',
  coding: '编码题',
  system_design: '系统设计',
  behavioral: '行为面',
  scenario: '场景题',
};

const DIFFICULTY_MAP: Record<number, { label: string; color: string; xp: number }> = {
  1: { label: '入门', color: 'bg-green-500/10 text-green-400', xp: 50 },
  2: { label: '简单', color: 'bg-blue-500/10 text-blue-400', xp: 100 },
  3: { label: '中等', color: 'bg-orange-500/10 text-orange-400', xp: 200 },
  4: { label: '困难', color: 'bg-red-500/10 text-red-400', xp: 400 },
  5: { label: '专家', color: 'bg-purple-500/10 text-purple-400', xp: 800 },
};

type Phase = 'select' | 'loading_questions' | 'answering' | 'evaluating' | 'result';

export default function InterviewPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('select');
  const [role, setRole] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [focusAreas, setFocusAreas] = useState<Set<string>>(new Set(['react', 'typescript', 'ai-vibe']));
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [draftAnswer, setDraftAnswer] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const startInterview = useCallback(async (selectedRole: string) => {
    setRole(selectedRole);
    setPhase('loading_questions');
    setError('');
    try {
      const res = await interviewApi.generateQuestions(
        { role: selectedRole, count: questionCount, focusAreas: Array.from(focusAreas) },
        accessToken || undefined,
      );
      const qs = (Array.isArray(res) ? res : []) as InterviewQuestion[];
      if (qs.length === 0) throw new Error('未生成任何题目');
      setQuestions(qs);
      setCurrentQ(0);
      setAnswers([]);
      setAnswerDrafts({});
      setDraftAnswer('');
      setShowHints(false);
      setPhase('answering');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成面试题失败');
      setPhase('select');
    }
  }, [accessToken, focusAreas, questionCount]);

  const toggleFocusArea = useCallback((id: string) => {
    setFocusAreas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const submitAnswer = useCallback(async () => {
    if (!draftAnswer.trim() || currentQ >= questions.length) return;
    const q = questions[currentQ];
    const newAnswer = { questionId: q.id, answer: draftAnswer.trim() };
    const existingIndex = answers.findIndex((answer) => answer.questionId === q.id);
    const newAnswers = existingIndex >= 0
      ? answers.map((answer, index) => index === existingIndex ? newAnswer : answer)
      : [...answers, newAnswer];
    setAnswers(newAnswers);
    setAnswerDrafts((prev) => ({ ...prev, [q.id]: draftAnswer.trim() }));
    setDraftAnswer('');
    setShowHints(false);

    if (currentQ + 1 < questions.length) {
      const nextQuestion = questions[currentQ + 1];
      const nextAnswer = newAnswers.find((answer) => answer.questionId === nextQuestion.id);
      setCurrentQ(currentQ + 1);
      setDraftAnswer(answerDrafts[nextQuestion.id] || nextAnswer?.answer || '');
    } else {
      // 全部答完，请求评估
      setPhase('evaluating');
      try {
        const res = await interviewApi.evaluateAnswers(
          { role, questions, answers: newAnswers },
          accessToken || undefined,
        );
        setEvaluation(res as InterviewEvaluation);
        setPhase('result');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '评估失败');
        setPhase('answering');
      }
    }
  }, [draftAnswer, currentQ, questions, answers, answerDrafts, role, accessToken]);

  const resetInterview = useCallback(() => {
    setPhase('select');
    setRole('');
    setQuestions([]);
    setCurrentQ(0);
    setAnswers([]);
    setAnswerDrafts({});
    setDraftAnswer('');
    setShowHints(false);
    setEvaluation(null);
    setError('');
  }, []);

  const updateDraft = useCallback((value: string) => {
    setDraftAnswer(value);
    const q = questions[currentQ];
    if (q) setAnswerDrafts((prev) => ({ ...prev, [q.id]: value }));
  }, [currentQ, questions]);

  const goToQuestion = useCallback((index: number) => {
    const target = questions[index];
    if (!target) return;
    const current = questions[currentQ];
    if (current) {
      setAnswerDrafts((prev) => ({ ...prev, [current.id]: draftAnswer }));
    }
    const savedAnswer = answers.find((answer) => answer.questionId === target.id);
    setCurrentQ(index);
    setDraftAnswer(answerDrafts[target.id] || savedAnswer?.answer || '');
    setShowHints(false);
  }, [answerDrafts, answers, currentQ, draftAnswer, questions]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  // ===== Phase: 选择岗位 =====
  if (phase === 'select') {
    return (
      <div className="p-6 pt-2 max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6 text-orange-400" /> 模拟面试</h1>
          <p className="text-gray-300 text-sm mt-1">AI 智能体将根据岗位动态生成面试题并评估你的表现</p>
        </div>

        {error && (
          <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3 text-red-400 border border-red-500/15">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-medium text-white/65 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" /> 选择目标岗位
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => startInterview(r.id)}
                disabled={phase !== 'select'}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-orange-500/20 transition-all text-left group disabled:opacity-50"
              >
                <div className="text-2xl mb-2">{r.icon}</div>
                <div className="text-sm font-medium text-white/80 group-hover:text-white">{r.label}</div>
                <div className="text-[10px] text-white/40 mt-1">{questionCount} 道题 · 约 {Math.max(15, questionCount * 6)} 分钟</div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-medium text-white/65 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-400" /> 面试配置
          </h3>
          <div className="mb-4">
            <p className="text-xs text-white/45 mb-2">题目数量</p>
            <div className="flex gap-2">
              {[3, 5, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all ${questionCount === count ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-white/[0.03] text-white/55 border-white/[0.06] hover:bg-white/[0.06]'}`}
                >
                  {count} 题
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/45 mb-2">重点考察领域</p>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => toggleFocusArea(area.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${focusAreas.has(area.id) ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:bg-white/[0.06]'}`}
                >
                  {area.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div className="text-xs text-white/55 leading-relaxed">
            <p className="mb-1 text-white/70 font-medium">面试流程</p>
            选择岗位 → AI 按当前配置生成 {questionCount} 道面试题 → 逐题作答 → AI 评估答案 → 生成评估报告与逐题复盘
          </div>
        </div>
      </div>
    );
  }

  // ===== Phase: 加载题目 =====
  if (phase === 'loading_questions') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        <p className="text-sm text-white/60">AI 正在为「{ROLES.find(r => r.id === role)?.label || role}」岗位生成面试题...</p>
      </div>
    );
  }

  // ===== Phase: 评估中 =====
  if (phase === 'evaluating') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        <p className="text-sm text-white/60">AI 评估专家正在分析你的答案...</p>
      </div>
    );
  }

  // ===== Phase: 评估报告 =====
  if (phase === 'result' && evaluation) {
    const dims = [
      { label: '技术深度', value: evaluation.dimensionScores.technicalDepth, icon: Brain, color: 'text-blue-400' },
      { label: '问题解决', value: evaluation.dimensionScores.problemSolving, icon: Target, color: 'text-orange-400' },
      { label: '表达能力', value: evaluation.dimensionScores.communication, icon: Zap, color: 'text-green-400' },
      { label: '代码质量', value: evaluation.dimensionScores.codeQuality, icon: Star, color: 'text-purple-400' },
    ];
    return (
      <div className="p-6 pt-2 max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-400" /> 面试评估报告</h1>
            <p className="text-gray-300 text-sm mt-1">岗位：{ROLES.find(r => r.id === role)?.label || role}</p>
          </div>
          <button onClick={resetInterview} className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> 重新面试
          </button>
        </div>

        {error && (
          <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3 text-red-400 border border-red-500/15">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 总分 */}
        <div className="glass rounded-2xl p-6 mb-6 flex items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#scoreGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(evaluation.overallScore / 100) * 314} 314`} />
              <defs><linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{evaluation.overallScore}</span>
              <span className="text-[10px] text-white/50">总分</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-3">维度评分</h3>
            <div className="grid grid-cols-2 gap-3">
              {dims.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <d.icon className={`w-4 h-4 ${d.color}`} />
                  <span className="text-xs text-white/60 flex-1">{d.label}</span>
                  <span className={`text-sm font-bold ${d.color}`}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 优势 */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><CheckCircle className="w-4 h-4 text-green-400" /> 优势</h3>
            {evaluation.strengths.length > 0 ? (
              <ul className="space-y-2">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-white/40">暂无明显优势数据</p>}
          </div>

          {/* 弱项 */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><XCircle className="w-4 h-4 text-red-400" /> 待改进</h3>
            {evaluation.weaknesses.length > 0 ? (
              <ul className="space-y-2">
                {evaluation.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✗</span><span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-white/40">表现均衡，无明显短板</p>}
          </div>

          {/* 改进建议 */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-yellow-400" /> 改进建议</h3>
            {evaluation.suggestions.length > 0 ? (
              <ul className="space-y-2">
                {evaluation.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">💡</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-white/40">暂无建议</p>}
          </div>

          {/* 推荐复习 */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-orange-400" /> 推荐复习</h3>
            {evaluation.recommendedTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {evaluation.recommendedTopics.map((t, i) => (
                  <span key={i} className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-xs border border-orange-500/15">{t}</span>
                ))}
              </div>
            ) : <p className="text-sm text-white/40">暂无推荐</p>}
          </div>
        </div>

        {evaluation.answerReviews && evaluation.answerReviews.length > 0 && (
          <div className="glass rounded-2xl p-6 mt-6">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4 text-orange-400" /> 逐题复盘</h3>
            <div className="space-y-3">
              {evaluation.answerReviews.map((review, index) => {
                const q = questions.find((item) => item.id === review.questionId);
                return (
                  <div key={review.questionId} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="badge bg-white/[0.04] text-white/55 border border-white/[0.06]">第 {index + 1} 题</span>
                      <span className="badge bg-orange-500/10 text-orange-300 border border-orange-500/20">{review.score ?? 0} 分</span>
                      {q?.type && <span className="badge bg-blue-500/10 text-blue-300 border border-blue-500/20">{QUESTION_TYPE_LABELS[q.type] || q.type}</span>}
                    </div>
                    <p className="text-sm font-medium text-white/80 mb-2">{q?.question}</p>
                    <p className="text-xs text-white/55 leading-relaxed mb-2">{review.feedback}</p>
                    {review.improvements && review.improvements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {review.improvements.map((item) => (
                          <span key={item} className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-300 text-[10px] border border-yellow-500/15">{item}</span>
                        ))}
                      </div>
                    )}
                    {q?.expectedAnswer && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-orange-300">查看参考要点</summary>
                        <p className="mt-2 text-xs text-white/50 leading-relaxed">{q.expectedAnswer}</p>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== Phase: 答题中 =====
  const question = questions[currentQ];
  const answeredCount = answers.length;
  const accuracy = answeredCount > 0 ? Math.round((answers.filter(a => (a.score || 0) >= 60).length / answeredCount) * 100) : 0;

  return (
    <div className="p-6 pt-2 max-w-5xl mx-auto animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { icon: Target, label: '进度', value: `${currentQ + 1}/${questions.length}`, color: 'text-blue-400', bg: 'bg-blue-500/[0.08]' },
          { icon: CheckCircle, label: '已答', value: answeredCount, color: 'text-green-400', bg: 'bg-green-500/[0.08]' },
          { icon: Clock, label: '建议时长', value: `${question?.timeLimit || 10}min`, color: 'text-orange-400', bg: 'bg-orange-500/[0.08]' },
          { icon: Zap, label: '正确率', value: `${accuracy}%`, color: 'text-yellow-400', bg: 'bg-yellow-500/[0.08]' },
          { icon: Trophy, label: 'XP', value: answeredCount * 50, color: 'text-pink-400', bg: 'bg-pink-500/[0.08]' },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-xl p-3 text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} />
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/55">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="glass rounded-xl p-3 mb-6">
        <div className="flex items-center gap-1.5">
          {questions.map((q, i) => (
            <div key={q.id || i} className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              i === currentQ ? 'bg-orange-500 ring-2 ring-orange-500/30' :
              i < currentQ ? 'bg-green-500' : 'bg-white/[0.06]'
            }`} />
          ))}
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3 text-red-400 border border-red-500/15">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Card */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">{QUESTION_TYPE_LABELS[question?.type || 'concept'] || question?.type || '概念题'}</span>
              {question?.difficulty && (
                <span className={`badge ${DIFFICULTY_MAP[question.difficulty]?.color || DIFFICULTY_MAP[3].color}`}>{DIFFICULTY_MAP[question.difficulty]?.label || '中等'}</span>
              )}
              <span className="badge bg-white/[0.04] text-white/50 border border-white/[0.06] flex items-center gap-1"><Clock className="w-3 h-3" />{question?.timeLimit || 10}min</span>
              <span className="badge bg-white/[0.04] text-white/50 border border-white/[0.06]">第 {currentQ + 1} 题</span>
            </div>

            <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">{question?.question || '加载中...'}</h2>

            {/* Hints */}
            {showHints && question?.hints && question.hints.length > 0 && (
              <div className="mb-4 p-4 rounded-xl bg-orange-500/[0.06] border border-orange-500/10 animate-slide-down">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-400">解题提示</span>
                </div>
                <ul className="space-y-1">
                  {question.hints.map((h, i) => (
                    <li key={i} className="text-sm text-white/60">• {h}</li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              value={draftAnswer}
              onChange={(e) => updateDraft(e.target.value)}
              placeholder="在这里输入你的回答..."
              className="w-full h-36 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/80 text-sm focus:outline-none focus:border-orange-500/50 resize-none placeholder:text-white/50"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => goToQuestion(currentQ - 1)}
                disabled={currentQ === 0}
                className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一题
              </button>
              {question?.hints && question.hints.length > 0 && (
                <button onClick={() => setShowHints(!showHints)} className="flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/[0.05] transition-all">
                  <Lightbulb className="w-4 h-4" /> {showHints ? '隐藏提示' : '提示'}
                </button>
              )}
              <button
                onClick={submitAnswer}
                disabled={!draftAnswer.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {currentQ + 1 < questions.length ? (
                  <><ChevronRight className="w-4 h-4" /> 下一题</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> 提交并评估</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Question List */}
          <div className="glass rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-white/65 uppercase tracking-wider mb-3 px-1">题目列表</h4>
            <div className="space-y-1.5">
              {questions.map((q, i) => {
                const ans = answers.find(a => a.questionId === q.id);
                return (
                  <button
                    key={q.id || i}
                    onClick={() => goToQuestion(i)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center gap-2 ${
                      i === currentQ ? 'bg-orange-500/[0.08] text-orange-400 border border-orange-500/15' :
                      ans ? 'text-green-400 bg-green-500/[0.04]' :
                      'text-white/65 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 bg-white/[0.06]">
                      {ans ? '✓' : i + 1}
                    </span>
                    <span className="truncate flex-1">{QUESTION_TYPE_LABELS[q.type] || q.type}</span>
                    <span className="text-[10px] text-white/50">{DIFFICULTY_MAP[q.difficulty]?.label || '中等'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {answers.find(a => a.questionId === question?.id) && question?.expectedAnswer && (
            <div className="glass rounded-2xl p-4">
              <h4 className="text-xs font-semibold text-white/65 uppercase tracking-wider mb-3 px-1">参考要点</h4>
              <p className="text-xs text-white/55 leading-relaxed">{question.expectedAnswer}</p>
            </div>
          )}

          {/* Stats Summary */}
          <div className="glass rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-white/65 uppercase tracking-wider mb-3 px-1">答题统计</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-white/50">已答</span><span className="text-green-400 font-medium">{answeredCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/50">剩余</span><span className="text-orange-400 font-medium">{questions.length - answeredCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/50">正确率</span><span className="text-yellow-400 font-medium">{accuracy}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/50">获得 XP</span><span className="text-pink-400 font-medium">{answeredCount * 50}</span></div>
            </div>
          </div>

          {/* 退出 */}
          <button onClick={resetInterview} className="w-full btn-secondary py-2.5 text-xs flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> 退出并重选岗位
          </button>
        </div>
      </div>
    </div>
  );
}
