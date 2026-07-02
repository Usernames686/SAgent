'use client';

import { useState, useEffect, useCallback } from 'react';
import { vibeLearningApi } from '@/lib/api';

/** 错题记录类型 */
interface ErrorReviewItem {
  id: string;
  nodeId: string;
  questionId: string;
  questionContent: string | null;
  userAnswer: string;
  correctAnswer: string;
  errorType: 'concept' | 'logic' | 'syntax' | 'careless';
  explanation: string | null;
  reviewed: boolean;
  reviewCount: number;
  reviewPassed: boolean | null;
  sourceType: 'quiz' | 'exercise' | 'assessment';
  originalScore: number;
  createdAt: string;
}

/** 错题统计类型 */
interface ErrorStats {
  totalErrors: number;
  reviewed: number;
  unreviewed: number;
  passedOnReview: number;
  failedOnReview: number;
  byErrorType: Record<string, number>;
  topWeakNodes: string[];
}

/** 错误类型中文映射 */
const ERROR_TYPE_MAP: Record<string, { label: string; color: string }> = {
  concept: { label: '概念错误', color: 'text-red-400' },
  logic: { label: '逻辑错误', color: 'text-orange-400' },
  syntax: { label: '语法错误', color: 'text-yellow-400' },
  careless: { label: '粗心错误', color: 'text-purple-400' },
};

/** 来源类型中文映射 */
const SOURCE_TYPE_MAP: Record<string, string> = {
  quiz: '测验',
  exercise: '练习',
  assessment: '诊断',
};

export default function ErrorReview() {
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [errors, setErrors] = useState<ErrorReviewItem[]>([]);
  const [errorsByNode, setErrorsByNode] = useState<Array<{
    nodeId: string;
    count: number;
    errorTypeBreakdown: Record<string, number>;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unreviewed' | 'all' | 'by-node'>('unreviewed');
  const [selectedError, setSelectedError] = useState<ErrorReviewItem | null>(null);
  const [reviewResult, setReviewResult] = useState<'pass' | 'fail' | null>(null);
  const [filterNodeType, setFilterNodeType] = useState<string>('');

  const loadStats = useCallback(async () => {
    try {
      const data = await vibeLearningApi.getErrorStats() as ErrorStats;
      setStats(data);
    } catch (e) {
      console.error('加载错题统计失败:', e);
    }
  }, []);

  const loadUnreviewed = useCallback(async () => {
    try {
      const data = await vibeLearningApi.getUnreviewedErrors(50) as ErrorReviewItem[];
      setErrors(data);
    } catch (e) {
      console.error('加载未回顾错题失败:', e);
    }
  }, []);

  const loadAllErrors = useCallback(async () => {
    try {
      const data = await vibeLearningApi.getErrorList({
        nodeId: filterNodeType || undefined,
        limit: 50,
      }) as { items: ErrorReviewItem[]; total: number };
      setErrors(data.items || []);
    } catch (e) {
      console.error('加载错题列表失败:', e);
    }
  }, [filterNodeType]);

  const loadErrorsByNode = useCallback(async () => {
    try {
      const data = await vibeLearningApi.getErrorsByNode() as Array<{
        nodeId: string;
        count: number;
        errorTypeBreakdown: Record<string, number>;
      }>;
      setErrorsByNode(data);
    } catch (e) {
      console.error('加载知识点错题聚合失败:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await loadStats();
    if (activeTab === 'unreviewed') {
      await loadUnreviewed();
    } else if (activeTab === 'all') {
      await loadAllErrors();
    } else {
      await loadErrorsByNode();
    }
    setLoading(false);
  }, [activeTab, loadStats, loadUnreviewed, loadAllErrors, loadErrorsByNode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** 标记错题已回顾 */
  const handleMarkReviewed = async (errorId: string, passed: boolean) => {
    try {
      await vibeLearningApi.markErrorReviewed(errorId, { passed });
      setReviewResult(passed ? 'pass' : 'fail');
      setTimeout(() => {
        setSelectedError(null);
        setReviewResult(null);
        loadData();
      }, 1500);
    } catch (e) {
      console.error('标记回顾失败:', e);
    }
  };

  /** 重新练习 */
  const handleRePractice = async (errorId: string) => {
    try {
      await vibeLearningApi.resetErrorForRePractice(errorId);
      setSelectedError(null);
      loadData();
    } catch (e) {
      console.error('重置错题失败:', e);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">📝</span>
        <div>
          <h2 className="text-xl font-bold text-white">错题回顾</h2>
          <p className="text-sm text-gray-300">复习做错的题目，巩固薄弱知识点</p>
        </div>
      </div>

      {/* 统计栏 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-2xl font-bold text-white">{stats.totalErrors}</div>
            <div className="text-xs text-gray-300 mt-1">总错题数</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-orange-500/20">
            <div className="text-2xl font-bold text-orange-400">{stats.unreviewed}</div>
            <div className="text-xs text-gray-300 mt-1">待回顾</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-green-500/20">
            <div className="text-2xl font-bold text-green-400">{stats.passedOnReview}</div>
            <div className="text-xs text-gray-300 mt-1">回顾通过</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-red-500/20">
            <div className="text-2xl font-bold text-red-400">{stats.failedOnReview}</div>
            <div className="text-xs text-gray-300 mt-1">回顾未通过</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-2xl font-bold text-gray-300">{stats.reviewed}</div>
            <div className="text-xs text-gray-300 mt-1">已回顾</div>
          </div>
        </div>
      )}

      {/* 错误类型分布 */}
      {stats && Object.keys(stats.byErrorType).length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h3 className="text-sm font-medium text-gray-300 mb-3">错误类型分布</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byErrorType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={`text-sm font-medium ${ERROR_TYPE_MAP[type]?.color || 'text-gray-300'}`}>
                  {ERROR_TYPE_MAP[type]?.label || type}
                </span>
                <span className="bg-gray-700/50 px-2 py-0.5 rounded text-xs text-gray-300">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-2">
        {[
          { key: 'unreviewed' as const, label: '📋 待回顾' },
          { key: 'all' as const, label: '📊 全部错题' },
          { key: 'by-node' as const, label: '🔍 按知识点' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 筛选栏（全部错题时） */}
      {activeTab === 'all' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-300">按知识点筛选：</label>
          <input
            type="text"
            value={filterNodeType}
            onChange={(e) => setFilterNodeType(e.target.value)}
            placeholder="输入 nodeId，如 JS-001"
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>
      )}

      {/* 错题详情弹窗 */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedError(null); setReviewResult(null); }}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-gray-700/50 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">错题详情</h3>
              <button onClick={() => { setSelectedError(null); setReviewResult(null); }} className="text-gray-300 hover:text-white">✕</button>
            </div>

            {reviewResult ? (
              <div className={`text-center py-8 ${reviewResult === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                <div className="text-5xl mb-3">{reviewResult === 'pass' ? '✅' : '❌'}</div>
                <div className="text-xl font-bold">{reviewResult === 'pass' ? '回顾通过！' : '还需继续努力'}</div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ERROR_TYPE_MAP[selectedError.errorType]?.color || 'text-gray-300'
                    } bg-gray-800`}>
                      {ERROR_TYPE_MAP[selectedError.errorType]?.label || selectedError.errorType}
                    </span>
                    <span className="text-xs text-gray-300">{selectedError.nodeId}</span>
                    <span className="text-xs text-gray-600">来源: {SOURCE_TYPE_MAP[selectedError.sourceType] || selectedError.sourceType}</span>
                  </div>

                  {selectedError.questionContent && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-xs text-gray-300 mb-1">题目</div>
                      <div className="text-sm text-gray-200 whitespace-pre-wrap">{selectedError.questionContent}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="text-xs text-red-400 mb-1">❌ 我的答案</div>
                      <div className="text-sm text-red-300">{selectedError.userAnswer}</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <div className="text-xs text-green-400 mb-1">✅ 正确答案</div>
                      <div className="text-sm text-green-300">{selectedError.correctAnswer}</div>
                    </div>
                  </div>

                  {selectedError.explanation && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <div className="text-xs text-blue-400 mb-1">💡 解析</div>
                      <div className="text-sm text-blue-300 whitespace-pre-wrap">{selectedError.explanation}</div>
                    </div>
                  )}

                  <div className="text-xs text-gray-300">
                    做错时间: {new Date(selectedError.createdAt).toLocaleString('zh-CN')}
                    {selectedError.reviewCount > 0 && ` · 已回顾 ${selectedError.reviewCount} 次`}
                  </div>
                </div>

                {/* 回顾操作按钮 */}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => handleMarkReviewed(selectedError.id, true)}
                    className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                  >
                    ✅ 这次答对了
                  </button>
                  <button
                    onClick={() => handleMarkReviewed(selectedError.id, false)}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                  >
                    ❌ 还是不会
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 内容区域 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
        </div>
      ) : activeTab === 'by-node' ? (
        /* 按知识点聚合视图 */
        <div className="space-y-3">
          {errorsByNode.length === 0 ? (
            <div className="text-center py-12 text-gray-300">暂无错题数据</div>
          ) : (
            errorsByNode.map(node => (
              <div key={node.nodeId} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-violet-400">{node.nodeId}</span>
                    <span className="text-xs text-gray-300">
                      错误 {node.count} 次
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await vibeLearningApi.resetNodeErrors({ nodeId: node.nodeId });
                        loadData();
                      } catch (e) {
                        console.error('重置失败:', e);
                      }
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    🔄 全部重做
                  </button>
                </div>
                <div className="flex gap-2">
                  {Object.entries(node.errorTypeBreakdown).map(([type, count]) => (
                    <span key={type} className={`text-xs px-2 py-0.5 rounded bg-gray-700/50 ${ERROR_TYPE_MAP[type]?.color || 'text-gray-300'}`}>
                      {ERROR_TYPE_MAP[type]?.label || type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* 错题列表视图 */
        <div className="space-y-3">
          {errors.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              {activeTab === 'unreviewed' ? '🎉 没有待回顾的错题！' : '暂无错题数据'}
            </div>
          ) : (
            errors.map(error => (
              <div
                key={error.id}
                className={`bg-gray-800/50 rounded-xl p-4 border cursor-pointer transition-all hover:bg-gray-800/80 ${
                  error.reviewed
                    ? 'border-gray-700/30 opacity-70'
                    : 'border-orange-500/20 hover:border-orange-500/40'
                }`}
                onClick={() => setSelectedError(error)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      ERROR_TYPE_MAP[error.errorType]?.color || 'text-gray-300'
                    } bg-gray-700/50`}>
                      {ERROR_TYPE_MAP[error.errorType]?.label || error.errorType}
                    </span>
                    <span className="text-sm font-mono text-gray-300">{error.nodeId}</span>
                    <span className="text-xs text-gray-600">Q: {error.questionId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {error.reviewed && (
                      <span className={`text-xs ${error.reviewPassed ? 'text-green-400' : 'text-red-400'}`}>
                        {error.reviewPassed ? '✅ 已通过' : '❌ 未通过'}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {SOURCE_TYPE_MAP[error.sourceType] || error.sourceType}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <div className="text-xs text-red-400/70">我的: {error.userAnswer.substring(0, 40)}{error.userAnswer.length > 40 ? '...' : ''}</div>
                  <div className="text-xs text-green-400/70">正确: {error.correctAnswer.substring(0, 40)}{error.correctAnswer.length > 40 ? '...' : ''}</div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-gray-600">{new Date(error.createdAt).toLocaleDateString('zh-CN')}</span>
                  {!error.reviewed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRePractice(error.id); }}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      🔄 重新练习
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 薄弱知识点推荐 */}
      {stats && stats.topWeakNodes.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl p-4 border border-red-500/20">
          <h3 className="text-sm font-medium text-red-400 mb-2">🎯 薄弱知识点推荐</h3>
          <p className="text-xs text-gray-300 mb-3">以下知识点错误率较高，建议重点复习</p>
          <div className="flex flex-wrap gap-2">
            {stats.topWeakNodes.map(nodeId => (
              <span
                key={nodeId}
                className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300 font-mono"
              >
                {nodeId}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
