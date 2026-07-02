'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { vibeLearningApi } from '@/lib/api';
import {
  Loader2, RefreshCw, Clock, Brain, CheckCircle2,
  XCircle, Minus, ChevronRight, Calendar, TrendingUp,
  Zap, BookOpen,
} from 'lucide-react';

// ── Types ──

interface DueReviewItem {
  id: string;
  userId: string;
  nodeId: string;
  status: 'learning' | 'passed' | 'mastered';
  masteryScore: number;
  quizScore: number;
  exerciseScore: number;
  attemptsCount: number;
  lastStudiedAt: string;
  nextReviewAt: string;
  easeFactor: number;
  interval: number;
}

interface QueueStats {
  dueToday: number;
  dueTomorrow: number;
  dueThisWeek: number;
  mastered: number;
  upcoming: Array<{
    nodeId: string;
    nextReviewAt: string;
    interval: number;
    easeFactor: number;
  }>;
}

// Quality 按钮配置
const QUALITY_OPTIONS = [
  { value: 0, label: '完全忘记', icon: XCircle, color: 'text-red-400', bg: 'from-red-500/20 to-red-600/10', border: 'border-red-500/20' },
  { value: 1, label: '几乎忘记', icon: XCircle, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/20' },
  { value: 2, label: '回忆困难', icon: Minus, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/20' },
  { value: 3, label: '勉强通过', icon: CheckCircle2, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
  { value: 4, label: '轻松回忆', icon: CheckCircle2, color: 'text-green-400', bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/20' },
  { value: 5, label: '完美回忆', icon: Zap, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
] as const;

// ── Helper ──

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays <= 7) return `${diffDays} 天后`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatLastStudied(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return '刚刚';
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ── Component ──

export default function SpacedRepetitionReview() {
  const { accessToken } = useAuthStore();
  const token = accessToken || undefined;

  const [dueReviews, setDueReviews] = useState<DueReviewItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [reviewingNodeId, setReviewingNodeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewResult, setReviewResult] = useState<{
    nodeId: string;
    quality: number;
    nextInterval: number;
    nextEaseFactor: number;
  } | null>(null);

  // 加载复习队列
  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vibeLearningApi.getSpacedRepetitionQueue(token) as any;
      setDueReviews(res.dueReviews || []);
      setQueueStats(res.queueStats || null);
      setCurrentReviewIndex(0);
      setReviewResult(null);
    } catch (err) {
      setError(`加载复习队列失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // 提交复习评分
  const handleReportQuality = async (nodeId: string, quality: number) => {
    setSubmitting(true);
    try {
      const res = await vibeLearningApi.reportReviewResult({ nodeId, quality }, token) as any;
      setReviewResult({
        nodeId,
        quality,
        nextInterval: res.interval,
        nextEaseFactor: res.easeFactor,
      });
    } catch (err) {
      setError(`提交复习结果失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 下一个复习项
  const handleNextReview = () => {
    setReviewResult(null);
    setReviewingNodeId(null);
    setCurrentReviewIndex(prev => prev + 1);
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <span className="ml-3 text-white/50">加载复习队列...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
        <button
          onClick={loadQueue}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/60 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> 重试
        </button>
      </div>
    );
  }

  const currentReview = dueReviews[currentReviewIndex];

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white/90">间隔重复复习</h2>
            <p className="text-xs text-white/65">基于 SM-2 算法的科学复习计划</p>
          </div>
        </div>
        <button
          onClick={loadQueue}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </button>
      </div>

      {/* ── Stats Bar ── */}
      {queueStats && (
        <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-white/[0.06]">
          <div className="text-center">
            <div className="text-lg font-bold text-violet-400">{queueStats.dueToday}</div>
            <div className="text-[10px] text-white/55">今日到期</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{queueStats.dueTomorrow}</div>
            <div className="text-[10px] text-white/55">明日到期</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-cyan-400">{queueStats.dueThisWeek}</div>
            <div className="text-[10px] text-white/55">本周到期</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{queueStats.mastered}</div>
            <div className="text-[10px] text-white/55">已掌握</div>
          </div>
        </div>
      )}

      {/* ── Review List / Review Flow ── */}
      <div className="flex-1 overflow-auto p-5">
        {dueReviews.length === 0 ? (
          // 无待复习项
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white/80 mb-1">今日复习已完成！</h3>
            <p className="text-sm text-white/65 mb-4">继续保持，按间隔计划复习效果更佳</p>
            {queueStats && queueStats.dueTomorrow > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-blue-400">
                <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                明日还有 {queueStats.dueTomorrow} 个知识点待复习
              </div>
            )}
          </div>
        ) : !reviewingNodeId ? (
          // 待复习列表
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/50">
                待复习 · {dueReviews.length} 个知识点
              </span>
              <span className="text-xs text-white/55">
                {currentReviewIndex > 0 ? `已完成 ${currentReviewIndex}/${dueReviews.length}` : ''}
              </span>
            </div>

            {dueReviews.map((item, idx) => (
              <button
                key={item.id || item.nodeId}
                onClick={() => {
                  setReviewingNodeId(item.nodeId);
                  setCurrentReviewIndex(idx);
                  setReviewResult(null);
                }}
                className="w-full text-left group p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-violet-500/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-white/80 truncate">
                        {item.nodeId}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.status === 'mastered' ? 'bg-emerald-500/15 text-emerald-400' :
                        item.status === 'passed' ? 'bg-blue-500/15 text-blue-400' :
                        'bg-yellow-500/15 text-yellow-400'
                      }`}>
                        {item.status === 'mastered' ? '已掌握' : item.status === 'passed' ? '已通过' : '学习中'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/55">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        间隔 {item.interval} 天
                      </span>
                      <span>EF {item.easeFactor.toFixed(2)}</span>
                      <span>
                        {item.lastStudiedAt ? `上次 ${formatLastStudied(item.lastStudiedAt)}` : ''}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-violet-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          // 复习评分流程
          <div className="space-y-5">
            {currentReview && !reviewResult && (
              <>
                <div className="text-center py-6">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-1">
                    {currentReview.nodeId}
                  </h3>
                  <div className="flex items-center justify-center gap-3 text-xs text-white/65">
                    <span>掌握度 {currentReview.masteryScore}%</span>
                    <span>·</span>
                    <span>当前间隔 {currentReview.interval} 天</span>
                    <span>·</span>
                    <span>EF {currentReview.easeFactor.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-sm text-white/50 text-center mb-1">回忆这个知识点的内容，然后选择你的记忆程度</p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {QUALITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      disabled={submitting}
                      onClick={() => handleReportQuality(reviewingNodeId, opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-br ${opt.bg} border ${opt.border} hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <opt.icon className={`w-5 h-5 ${opt.color}`} />
                      <span className={`text-xs font-medium ${opt.color}`}>{opt.label}</span>
                      <span className="text-[10px] text-white/50">Q={opt.value}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 复习结果 */}
            {reviewResult && currentReview && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 ${
                    reviewResult.quality >= 3
                      ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20'
                      : 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20'
                  }`}>
                    {reviewResult.quality >= 3
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      : <XCircle className="w-6 h-6 text-orange-400" />
                    }
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-1">
                    {reviewResult.quality >= 3 ? '复习通过！' : '需要加强'}
                  </h3>
                  <p className="text-sm text-white/65">
                    {reviewResult.quality >= 3
                      ? '下次复习间隔已增长'
                      : '间隔已重置为 1 天，明天继续加油'
                    }
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/65">评分</span>
                    <span className="text-white/70">{QUALITY_OPTIONS[reviewResult.quality].label} (Q={reviewResult.quality})</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/65">下次间隔</span>
                    <span className="flex items-center gap-1 text-white/70">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                      {reviewResult.nextInterval} 天
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/65">难度因子</span>
                    <span className="text-white/70">{reviewResult.nextEaseFactor.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleNextReview}
                    disabled={currentReviewIndex >= dueReviews.length - 1}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    下一个
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setReviewingNodeId(null);
                      setReviewResult(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
                  >
                    返回列表
                  </button>
                </div>
              </div>
            )}

            {submitting && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                <span className="ml-2 text-sm text-white/65">提交中...</span>
              </div>
            )}
          </div>
        )}

        {/* ── Upcoming Section ── */}
        {queueStats && queueStats.upcoming.length > 0 && !reviewingNodeId && (
          <div className="mt-6">
            <h4 className="text-xs font-medium text-white/55 mb-3 uppercase tracking-wider">即将到期</h4>
            <div className="space-y-1.5">
              {queueStats.upcoming.map(item => (
                <div
                  key={item.nodeId}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] text-xs"
                >
                  <span className="text-white/50">{item.nodeId}</span>
                  <div className="flex items-center gap-3 text-white/55">
                    <span>{item.interval}天</span>
                    <span>EF {item.easeFactor.toFixed(2)}</span>
                    <span>{formatRelativeDate(item.nextReviewAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
