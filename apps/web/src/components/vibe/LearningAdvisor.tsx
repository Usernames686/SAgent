'use client';

import { useState, useEffect, useCallback } from 'react';
import { vibeLearningApi } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { NODE_NAMES, getNodeName } from './phase-config';

/** 单条学习建议 */
interface LearningAdvice {
  type: 'review' | 'prerequisite' | 'error-review' | 'continue' | 'streak' | 'new-start';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  items: string[];
  action: string;
  emoji: string;
}

/** 用户学习概览 */
interface LearningSummary {
  stats: {
    total: number;
    locked: number;
    learning: number;
    passed: number;
    mastered: number;
    averageMastery: number;
    totalStudyTime: number;
  };
  dueReviewCount: number;
  unreviewedErrorCount: number;
  currentPhase: string;
  streakDays: number;
  nextRecommendedNode: string | null;
}

/** 建议响应 */
interface AdviceResponse {
  advice: LearningAdvice[];
  generatedAt: string;
  summary: LearningSummary;
}

/** 优先级 → 颜色 */
function getPriorityStyle(priority: string): { bg: string; border: string; text: string; dot: string } {
  switch (priority) {
    case 'high': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' };
    case 'medium': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' };
    default: return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-500' };
  }
}

/** 建议类型 → 标签 */
function getTypeLabel(type: string): string {
  switch (type) {
    case 'review': return '间隔复习';
    case 'prerequisite': return '前置知识';
    case 'error-review': return '错题回顾';
    case 'continue': return '继续学习';
    case 'streak': return '连续学习';
    case 'new-start': return '开始学习';
    default: return type;
  }
}

/** 建议类型 → 颜色 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'review': return 'bg-violet-500/20 text-violet-300';
    case 'prerequisite': return 'bg-blue-500/20 text-blue-300';
    case 'error-review': return 'bg-orange-500/20 text-orange-300';
    case 'continue': return 'bg-emerald-500/20 text-emerald-300';
    case 'streak': return 'bg-amber-500/20 text-amber-300';
    case 'new-start': return 'bg-pink-500/20 text-pink-300';
    default: return 'bg-gray-500/20 text-gray-300';
  }
}

export default function LearningAdvisor() {
  const { accessToken } = useAuthStore();
  const token = accessToken || undefined;

  const [data, setData] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAdvice, setExpandedAdvice] = useState<number | null>(null);

  const loadAdvice = useCallback(async () => {
    setLoading(true);
    try {
      const result = await vibeLearningApi.getLearningAdvice(token) as AdviceResponse;
      setData(result);
    } catch (e) {
      console.error('加载学习建议失败:', e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadAdvice();
  }, [loadAdvice]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  const summary = data?.summary;
  const stats = summary?.stats;

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">🎯</span>
        <div>
          <h2 className="text-xl font-bold text-white">学习建议</h2>
          <p className="text-sm text-gray-300">基于你的学习数据，为你推荐最合适的学习路径</p>
        </div>
      </div>

      {/* 学习概览 */}
      {summary && stats && (
        <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/5 rounded-xl p-5 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📊</span>
            <h3 className="text-base font-semibold text-white">学习概览</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-gray-800/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-[10px] text-gray-300">已学习</div>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">{stats.mastered}</div>
              <div className="text-[10px] text-gray-300">精通</div>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{stats.passed}</div>
              <div className="text-[10px] text-gray-300">已通过</div>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-orange-400">{stats.learning}</div>
              <div className="text-[10px] text-gray-300">学习中</div>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-violet-400">{Math.round(stats.averageMastery)}%</div>
              <div className="text-[10px] text-gray-300">平均掌握</div>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-400">{summary.dueReviewCount}</div>
              <div className="text-[10px] text-gray-300">待复习</div>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-amber-400">{summary.streakDays}</div>
              <div className="text-[10px] text-gray-300">连续天数</div>
            </div>
          </div>

          {/* 当前阶段 + 下一步 */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/40">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300">当前阶段</span>
              <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-xs font-medium">
                {summary.currentPhase}
              </span>
            </div>
            {summary.nextRecommendedNode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">推荐下一步</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                  {getNodeName(summary.nextRecommendedNode)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 建议列表 */}
      {data && data.advice.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">为你推荐</span>
            <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-medium">
              {data.advice.length} 条建议
            </span>
          </div>

          {data.advice.map((advice, idx) => {
            const priorityStyle = getPriorityStyle(advice.priority);
            const isExpanded = expandedAdvice === idx;

            return (
              <div
                key={idx}
                className={`
                  rounded-xl border transition-all duration-200
                  ${priorityStyle.bg} ${priorityStyle.border}
                  ${isExpanded ? 'ring-1 ring-white/10' : ''}
                `}
              >
                {/* 建议头部 */}
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpandedAdvice(isExpanded ? null : idx)}
                >
                  <span className="text-2xl">{advice.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{advice.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTypeColor(advice.type)}`}>
                        {getTypeLabel(advice.type)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 truncate">{advice.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${priorityStyle.dot}`} title={advice.priority === 'high' ? '高优先' : advice.priority === 'medium' ? '中优先' : '低优先'} />
                    <svg
                      className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* 展开详情 — 知识点列表 */}
                {isExpanded && advice.items.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="bg-gray-800/40 rounded-lg p-3 space-y-2">
                      <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-2">相关知识点</div>
                      {advice.items.map(nodeId => (
                        <div key={nodeId} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                          <span className="text-xs text-gray-300 font-mono">{nodeId}</span>
                          <span className="text-xs text-gray-300">—</span>
                          <span className="text-xs text-white">{getNodeName(nodeId)}</span>
                        </div>
                      ))}
                    </div>

                    {/* 快速操作 */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] text-gray-300">快速操作</span>
                      <span className="px-2 py-1 rounded-lg bg-violet-600/20 text-violet-300 text-xs cursor-pointer hover:bg-violet-600/30 transition-colors">
                        {advice.action === 'spaced-repetition' && '去复习 →'}
                        {advice.action === 'error-review' && '去看错题 →'}
                        {advice.action === 'learn-prerequisite' && '学前置知识 →'}
                        {advice.action === 'continue-learning' && '继续学习 →'}
                        {advice.action === 'start-learning' && '开始学习 →'}
                        {!['spaced-repetition','error-review','learn-prerequisite','continue-learning','start-learning'].includes(advice.action) && '去学习 →'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 无知识点的建议（如连续学习鼓励） */}
                {isExpanded && advice.items.length === 0 && (
                  <div className="px-4 pb-4">
                    <div className="bg-gray-800/40 rounded-lg p-3 text-center">
                      <span className="text-sm text-gray-300">{advice.description}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-gray-300">暂无学习建议，你可能已经全部掌握了！</div>
        </div>
      )}

      {/* 生成时间 */}
      {data && (
        <div className="text-center text-[10px] text-gray-600">
          建议生成于 {new Date(data.generatedAt).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  );
}
