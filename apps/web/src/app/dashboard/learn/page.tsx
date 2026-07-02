'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { vibeLearningApi } from '@/lib/api';
import { LEARNING_PHASES, getPhaseProgress, getNodeName } from '@/components/vibe/phase-config';
import { AlertCircle, ArrowRight, BookOpen, CheckCircle, Clock, Loader2, Lock, Play, Route, Star, Target, Trophy, Zap } from 'lucide-react';

interface VibeProgress {
  completedCount?: number;
  totalCount?: number;
  overallProgress?: number;
  knowledgeState?: Record<string, number>;
  completedNodeIds?: string[];
}

export default function LearnPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [selectedStage, setSelectedStage] = useState<string | null>(LEARNING_PHASES[0]?.id || null);
  const [progress, setProgress] = useState<VibeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await vibeLearningApi.getProgress(accessToken || undefined) as VibeProgress;
      setProgress(res || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载学习路径失败');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) loadProgress();
  }, [hydrated, isAuthenticated, loadProgress]);

  const completedNodes = useMemo(() => new Set(progress?.completedNodeIds || []), [progress]);
  const knowledgeState = progress?.knowledgeState || {};
  const totalNodes = LEARNING_PHASES.reduce((sum, phase) => sum + phase.modules.reduce((s, module) => s + module.nodeIds.length, 0), 0);
  const completedCount = progress?.completedCount ?? completedNodes.size;
  const totalProgress = totalNodes > 0 ? (completedCount / totalNodes) * 100 : 0;
  const totalMinutes = LEARNING_PHASES.reduce((sum, phase) => sum + phase.modules.reduce((s, module) => s + module.nodeIds.length * 40, 0), 0);

  const phaseStats = LEARNING_PHASES.map((phase) => {
    const stat = getPhaseProgress(phase.id, completedNodes, knowledgeState);
    const firstNodeId = phase.modules[0]?.nodeIds[0] || '';
    const firstIncomplete = phase.modules.flatMap((module) => module.nodeIds).find((nodeId) => !completedNodes.has(nodeId)) || firstNodeId;
    return { phase, ...stat, firstNodeId, firstIncomplete };
  });

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">加载失败：{error}</span>
          <button onClick={loadProgress} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-2 max-w-5xl mx-auto animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl p-8 mb-6" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(236,72,153,0.1) 50%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Route className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">学习路径</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">Vibe Coding 全栈工程师</h1>
              <p className="text-sm text-white/65">{LEARNING_PHASES.length} 个阶段 · {totalNodes} 个知识点 · 由氛围学习进度实时计算</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-white mb-1">{totalProgress.toFixed(0)}%</div>
              <p className="text-xs text-white/55">总进度</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${totalProgress}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/50">
              <span>开始</span>
              <span>{completedCount}/{totalNodes} 知识点 · 约 {Math.round(totalMinutes / 60)} 小时</span>
              <span>完成</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { icon: Target, label: '已完成', value: `${phaseStats.filter(s => s.completed === s.total && s.total > 0).length}/${phaseStats.length}`, color: 'text-green-400', bg: 'bg-green-500/[0.08]' },
          { icon: Clock, label: '预计时长', value: `${Math.round(totalMinutes / 60)}h`, color: 'text-blue-400', bg: 'bg-blue-500/[0.08]' },
          { icon: Zap, label: '已掌握', value: completedCount, color: 'text-yellow-400', bg: 'bg-yellow-500/[0.08]' },
          { icon: Trophy, label: '阶段数', value: LEARNING_PHASES.length, color: 'text-purple-400', bg: 'bg-purple-500/[0.08]' },
          { icon: Star, label: '平均掌握', value: `${Math.round((Object.values(knowledgeState).reduce((a, b) => a + b, 0) / Math.max(Object.values(knowledgeState).length, 1)) * 100)}%`, color: 'text-orange-400', bg: 'bg-orange-500/[0.08]' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-3 text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} />
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/55">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {phaseStats.map(({ phase, completed, total, progress: phaseProgress, avgMastery, firstIncomplete }, i) => {
          const isExpanded = selectedStage === phase.id;
          const isCompleted = completed === total && total > 0;
          const isCurrent = completed > 0 && !isCompleted;
          const prev = phaseStats[i - 1];
          const isLocked = i > 0 && prev && prev.completed === 0 && completed === 0;

          return (
            <div key={phase.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <button
                onClick={() => !isLocked && setSelectedStage(isExpanded ? null : phase.id)}
                className={`w-full glass rounded-2xl p-5 text-left transition-all duration-300 ${isCurrent ? 'ring-1 ring-orange-500/30' : ''} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.04]'} ${isExpanded ? 'bg-white/[0.04]' : ''}`}
                disabled={isLocked}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${phase.color} ${phase.colorTo} flex items-center justify-center text-2xl shadow-lg shrink-0`}>
                    {isCompleted ? '✓' : isLocked ? <Lock className="w-6 h-6 text-white" /> : phase.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">阶段 {phase.index}</span>
                      {isCompleted && <span className="badge bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">已完成</span>}
                      {isCurrent && <span className="badge bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">进行中</span>}
                      {isLocked && <span className="badge bg-white/[0.04] text-white/50 border border-white/[0.06] text-[10px]">未解锁</span>}
                    </div>
                    <h3 className="font-semibold text-white text-lg">{phase.title}</h3>
                    <p className="text-xs text-white/55 mt-0.5">{phase.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-white mb-1">{Math.round(phaseProgress * 100)}%</div>
                    <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${phase.color} ${phase.colorTo} rounded-full`} style={{ width: `${phaseProgress * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/50 justify-end">
                      <span>{completed}/{total}</span>
                      <span>·</span>
                      <span>{Math.round(avgMastery * 100)}%</span>
                    </div>
                  </div>
                  {!isLocked && <ArrowRight className={`w-5 h-5 text-white/70 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />}
                </div>
              </button>

              {isExpanded && !isLocked && (
                <div className="mt-3 glass rounded-2xl p-5 animate-slide-down">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="text-xs font-semibold text-white/65 uppercase tracking-wider mb-3">模块清单</h4>
                      <div className="space-y-2">
                        {phase.modules.map((module) => {
                          const moduleCompleted = module.nodeIds.filter((nodeId) => completedNodes.has(nodeId)).length;
                          const moduleProgress = module.nodeIds.length > 0 ? moduleCompleted / module.nodeIds.length : 0;
                          return (
                            <div key={module.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <span className="text-sm text-white/80">{module.emoji} {module.name}</span>
                                <span className="text-[10px] text-white/50">{moduleCompleted}/{module.nodeIds.length}</span>
                              </div>
                              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div className={`h-full bg-gradient-to-r ${phase.color} ${phase.colorTo}`} style={{ width: `${moduleProgress * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white/65 uppercase tracking-wider mb-3">下一步</h4>
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                        <div className="flex items-start gap-3">
                          <BookOpen className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-white/80 mb-1">{getNodeName(firstIncomplete)}</p>
                            <p className="text-xs text-white/50 mb-4">{phase.goal}，目标是：{phase.outcome}</p>
                            <Link href={`/dashboard/vibe?nodeId=${firstIncomplete}`} className="btn-primary px-4 py-2 text-xs inline-flex">
                              <Play className="w-3.5 h-3.5" /> {isCompleted ? '复习此阶段' : '继续学习'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-3 border-t border-white/[0.04]">
                    <Link href={`/dashboard/vibe?nodeId=${firstIncomplete}`} className="btn-primary px-5 py-2 text-sm">
                      <Play className="w-4 h-4" /> {isCompleted ? '复习此阶段' : '继续学习'}
                    </Link>
                    <Link href="/dashboard/exercises" className="btn-secondary px-5 py-2 text-sm">查看练习</Link>
                    <Link href="/dashboard/knowledge" className="btn-secondary px-5 py-2 text-sm">知识图谱</Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
