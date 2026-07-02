'use client';

import { useState, useEffect, useCallback } from 'react';
import { assessmentApi } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { Sparkles, Brain, Loader2, CheckCircle2, XCircle, BarChart3, Target, TrendingUp } from 'lucide-react';

// 诊断题类型
interface Question {
  id: string;
  domain: string;
  difficulty: number;
  question: string;
  options: string[];
  timeLimit?: number;
}

// 诊断结果
interface AssessmentResult {
  summary: {
    level: string;
    overallScore: number;
    theta: number;
    confidence: string;
  };
  dimensions: {
    name: string;
    score: number;
    level: string;
  }[];
  stats: {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
  };
  suggestedPath: {
    level: string;
    focus: string;
    goal: string;
  } | null;
}

const domainNames: Record<string, string> = {
  programming_fundamentals: '编程基础',
  data_structures: '数据结构',
  algorithms: '算法',
  web_development: 'Web 开发',
  database: '数据库',
  system_design: '系统设计',
  prompt_engineering: 'Prompt 工程',
  vibe_abstraction: '氛围抽象',
};

const domainIcons: Record<string, string> = {
  programming_fundamentals: '💻',
  data_structures: '📊',
  algorithms: '🧮',
  web_development: '🌐',
  database: '🗄️',
  system_design: '🏗️',
  prompt_engineering: '📝',
  vibe_abstraction: '🎨',
};

export default function AssessmentPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanation: string;
  } | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [progress, setProgress] = useState({ answered: 0, total: 20 });
  const [currentEstimate, setCurrentEstimate] = useState<{
    theta: number;
    standardError: number;
    level: string;
    score: number;
  } | null>(null);

  // 获取初始试题
  const startAssessment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await assessmentApi.getInitialQuestions(accessToken || undefined);
      const body = res as {
        sessionId: string;
        questions: Question[];
        progress: { answered: number; total: number };
      };
      setSessionId(body.sessionId);
      setQuestions(body.questions);
      setProgress(body.progress);
      setCurrentQuestionIndex(0);
      setSelectedIndex(null);
      setLastResult(null);
    } catch (err) {
      setError((err as Error).message || '获取诊断试题失败');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    startAssessment();
  }, [isAuthenticated, router, startAssessment]);

  // 提交答案
  const handleSubmit = async () => {
    if (selectedIndex === null || !sessionId || !questions[currentQuestionIndex]) return;

    setSubmitting(true);
    try {
      const res = await assessmentApi.submitAnswer(
        {
          sessionId,
          questionId: questions[currentQuestionIndex].id,
          answerIndex: selectedIndex,
        },
        accessToken || undefined,
      );
      const body = res as Record<string, unknown>;

      if (body.complete) {
        // 诊断完成
        setResult(body.result as AssessmentResult);
      } else {
        // 下一题
        const next = body.nextQuestion as Question;
        const last = body.lastAnswer as {
          isCorrect: boolean;
          correctIndex: number;
          explanation: string;
        };
        const est = body.currentEstimate as {
          theta: number;
          standardError: number;
          level: string;
          score: number;
        };
        const prog = body.progress as { answered: number; total: number };

        setLastResult(last);
        setCurrentEstimate(est);
        setProgress(prog);

        // 短暂显示反馈后进入下一题
        setTimeout(() => {
          if (next) {
            setQuestions([next]);
            setCurrentQuestionIndex(0);
          }
          setSelectedIndex(null);
          setLastResult(null);
          setSubmitting(false);
        }, 1500);
      }
    } catch (err) {
      setError((err as Error).message || '提交答案失败');
      setSubmitting(false);
    }
  };

  // 完成，去仪表盘
  const goToDashboard = () => {
    router.push('/dashboard');
  };

  // 加载中
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/25 mb-6">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">能力诊断准备中</h2>
          <p className="text-gray-300 mb-4">正在智能出题...</p>
          <Loader2 className="w-6 h-6 animate-spin text-accent-400 mx-auto" />
        </div>
      </main>
    );
  }

  // 显示结果
  if (result) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <div className="max-w-3xl mx-auto animate-fade-in">
          {/* 结果头部 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/25 mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">诊断完成！</h1>
            <p className="text-gray-300 mt-1">已为你建立个性化学习画像</p>
          </div>

          {/* 总体评分 */}
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-300">综合能力评分</p>
                <p className="text-3xl font-bold">{result.stats.accuracy}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300">当前等级</p>
                <p className="text-xl font-semibold text-accent-400 capitalize">
                  {result.summary.level === 'beginner' ? '入门' :
                   result.summary.level === 'elementary' ? '初级' :
                   result.summary.level === 'intermediate' ? '中级' :
                   result.summary.level === 'advanced' ? '高级' : '专家'}
                </p>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-gray-300">
              <span>答题: {result.stats.totalQuestions} 题</span>
              <span>正确: {result.stats.correctAnswers} 题</span>
              <span>正确率: {result.stats.accuracy}%</span>
            </div>
          </div>

          {/* 各维度评分 */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent-400" />
              各维度能力评估
            </h3>
            <div className="space-y-4">
              {result.dimensions.map((dim) => (
                <div key={dim.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{domainIcons[dim.name] || '📌'} {domainNames[dim.name] || dim.name}</span>
                    <span className={dim.score >= 70 ? 'text-green-400' : dim.score >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                      {dim.score}% - {dim.level}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        dim.score >= 70 ? 'bg-green-500' : dim.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 推荐路径 */}
          {result.suggestedPath && (
            <div className="glass rounded-2xl p-6 mb-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-400" />
                推荐学习方向
              </h3>
              <p className="text-gray-300">{result.suggestedPath.goal}</p>
              <p className="text-sm text-gray-300 mt-2">
                从 {result.suggestedPath.level} 级别开始，专注 {domainNames[result.suggestedPath.focus] || result.suggestedPath.focus} 领域
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button onClick={goToDashboard} className="btn-primary flex-1 py-3">
              <Sparkles className="w-4 h-4" />
              开始学习
            </button>
            <button onClick={startAssessment} className="btn-secondary py-3">
              <TrendingUp className="w-4 h-4" />
              重新诊断
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 答题界面
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* 顶部信息 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent-400" />
            <span className="font-semibold">能力诊断</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {currentEstimate && (
              <span className="text-gray-300">
                当前评估: {currentEstimate.score}分 ({currentEstimate.level})
              </span>
            )}
            <span className="text-gray-300">
              已答 {progress.answered}/{progress.total} 题
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="h-1.5 bg-gray-700 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-400 to-accent-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (progress.answered / 20) * 100)}%` }}
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {currentQuestion && (
          <div className="glass rounded-2xl p-6 sm:p-8">
            {/* 题目元信息 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded-full bg-accent-500/20 text-accent-400">
                {domainNames[currentQuestion.domain] || currentQuestion.domain}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                currentQuestion.difficulty <= -1 ? 'bg-green-500/20 text-green-400' :
                currentQuestion.difficulty <= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {currentQuestion.difficulty <= -1 ? '简单' :
                 currentQuestion.difficulty <= 0.5 ? '中等' : '困难'}
              </span>
            </div>

            {/* 题目 */}
            <h2 className="text-lg font-semibold mb-6 whitespace-pre-line">{currentQuestion.question}</h2>

            {/* 选项 */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedIndex === idx;
                const showCorrect = lastResult && lastResult.correctIndex === idx;
                const showWrong = lastResult && selectedIndex === idx && !lastResult.isCorrect;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!lastResult) setSelectedIndex(idx);
                    }}
                    disabled={!!lastResult}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-accent-500 bg-accent-500/10'
                        : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
                    } ${
                      showCorrect ? '!border-green-500 !bg-green-500/10' : ''
                    } ${
                      showWrong ? '!border-red-500 !bg-red-500/10' : ''
                    } ${lastResult ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="font-mono text-gray-300 mr-3">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {/* 反馈 */}
            {lastResult && (
              <div className={`p-4 rounded-xl mb-4 ${
                lastResult.isCorrect
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {lastResult.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`font-medium ${lastResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {lastResult.isCorrect ? '回答正确！' : '回答错误'}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {lastResult.explanation}
                </p>
              </div>
            )}

            {/* 提交按钮 */}
            {!lastResult && (
              <button
                onClick={handleSubmit}
                disabled={selectedIndex === null || submitting}
                className="btn-primary w-full py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '提交答案'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
