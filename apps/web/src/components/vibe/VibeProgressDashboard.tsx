'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target, Flame, Trophy, Clock, BookOpen,
  CheckCircle2, TrendingUp, BarChart3, Zap,
  Calendar, AlertCircle, Lightbulb, RefreshCw,
  Map, ChevronRight, Lock,
} from 'lucide-react';
import { vibeLearningApi } from '@/lib/api';
import { useAuthStore } from '@/stores';
import {
  LEARNING_PHASES, LOOP_STEPS, PASS_THRESHOLD,
  NODE_PHASE_MAP, NODE_NAMES,
  getPhaseLectureCount, isNodeUnlocked, getNodeName,
  type PhaseConfig, type ModuleConfig,
} from './phase-config';

// ── Enhanced Dashboard Types ──

interface RecentActivity {
  nodeName: string;
  mode: string;
  score: number;
  timestamp: string;
}

interface ModuleProgressItem {
  module: string;
  moduleName: string;
  completed: number;
  total: number;
  progress: number;
}

interface PhaseProgressItem {
  phaseId: string;
  phaseName: string;
  priority: string;
  total: number;
  completed: number;
  mastered: number;
  learning: number;
  locked: number;
  progress: number;
  avgMastery: number;
}

interface EnhancedDashboardData {
  stats: {
    total: number;
    locked: number;
    learning: number;
    passed: number;
    mastered: number;
    averageMastery: number;
    totalStudyTime: number;
  };
  estimatedRemainingMinutes: number;
  streakDays: number;
  dueReviewCount: number;
  unreviewedErrorCount: number;
  phaseProgress: PhaseProgressItem[];
}

interface VibeProgressDashboardProps {
  completedNodes: Set<string>;
  knowledgeState: Record<string, number>;
  currentNodeId: string | null;
  totalNodes: number;
  sessionCount: number;
  totalStudyMinutes: number;
  recentActivity?: RecentActivity[];
  moduleProgress?: ModuleProgressItem[];
  averageScore?: number;
  completedCount?: number;
}

// ── §4.1 五阶段色彩体系 ──

const PHASE_COLORS: Record<string, {
  from: string; to: string; accent: string;
  barFrom: string; barTo: string;
  dotCompleted: string; dotLearning: string;
}> = {
  foundation: {
    from: 'from-blue-500', to: 'to-indigo-500', accent: 'text-blue-400',
    barFrom: '#3b82f6', barTo: '#6366f1',
    dotCompleted: 'bg-blue-400', dotLearning: 'bg-blue-400/40',
  },
  advancement: {
    from: 'from-violet-500', to: 'to-purple-500', accent: 'text-violet-400',
    barFrom: '#8b5cf6', barTo: '#a855f7',
    dotCompleted: 'bg-violet-400', dotLearning: 'bg-violet-400/40',
  },
  framework: {
    from: 'from-orange-500', to: 'to-pink-500', accent: 'text-orange-400',
    barFrom: '#f97316', barTo: '#ec4899',
    dotCompleted: 'bg-orange-400', dotLearning: 'bg-orange-400/40',
  },
  engineering: {
    from: 'from-emerald-500', to: 'to-teal-500', accent: 'text-emerald-400',
    barFrom: '#10b981', barTo: '#14b8a6',
    dotCompleted: 'bg-emerald-400', dotLearning: 'bg-emerald-400/40',
  },
  mastery: {
    from: 'from-amber-500', to: 'to-yellow-500', accent: 'text-amber-400',
    barFrom: '#f59e0b', barTo: '#eab308',
    dotCompleted: 'bg-amber-400', dotLearning: 'bg-amber-400/40',
  },
};

// ── Priority → Badge ──
const PRIORITY_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  P0: { label: 'P0', bg: 'bg-red-500/15', text: 'text-red-400' },
  P1: { label: 'P1', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  P2: { label: 'P2', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  P3: { label: 'P3', bg: 'bg-gray-500/15', text: 'text-gray-300' },
};

// ── Mini Heatmap Color ──
function getMiniHeatColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score > 0) return '#f97316';
  return '#374151';
}

// ── Progress Ring SVG (§7.4.3 + §4.1 gradient) ──

function ProgressRing({ progress, size = 100 }: { progress: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#ringGrad)" strokeWidth="6"
          strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="75%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black bg-gradient-to-r from-blue-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
          {Math.round(progress)}%
        </span>
        <span className="text-[9px] text-white/50">总进度</span>
      </div>
    </div>
  );
}

// ── Component ──

export default function VibeProgressDashboard({
  completedNodes,
  knowledgeState,
  currentNodeId,
  totalNodes,
  sessionCount,
  totalStudyMinutes,
  recentActivity,
  averageScore,
  completedCount: apiCompletedCount,
}: VibeProgressDashboardProps) {
  const { accessToken } = useAuthStore();
  const token = accessToken || undefined;

  const [enhancedData, setEnhancedData] = useState<EnhancedDashboardData | null>(null);

  const completedCount = apiCompletedCount ?? completedNodes.size;
  const overallProgress = totalNodes > 0 ? (completedCount / totalNodes) * 100 : 0;

  // ── 掌握度分布 ──
  const masteryLevels = Object.values(knowledgeState);
  const expertCount = masteryLevels.filter(m => m >= PASS_THRESHOLD).length;
  const proficientCount = masteryLevels.filter(m => m >= 0.6 && m < PASS_THRESHOLD).length;
  const learningCount = masteryLevels.filter(m => m > 0 && m < 0.6).length;
  const notStartedCount = Math.max(0, totalNodes - expertCount - proficientCount - learningCount);

  // ── 每阶段统计（对齐§4.1色彩体系） ──
  const phaseStats = LEARNING_PHASES.map((phase) => {
    const allNodeIds = phase.modules.flatMap(m => m.nodeIds);
    const completed = allNodeIds.filter(id => completedNodes.has(id)).length;
    const total = allNodeIds.length;
    const avgMastery = allNodeIds
      .filter(id => knowledgeState[id] !== undefined)
      .reduce((sum, id) => sum + (knowledgeState[id] || 0), 0) / (total || 1);
    const colors = PHASE_COLORS[phase.id] || PHASE_COLORS.foundation;
    return { phase, completed, total, avgMastery, progress: total > 0 ? (completed / total) * 100 : 0, colors };
  });

  const hours = Math.floor(totalStudyMinutes / 60);
  const mins = totalStudyMinutes % 60;

  // ── 加载增强仪表盘数据 ──
  const loadEnhancedDashboard = useCallback(async () => {
    try {
      const phases = LEARNING_PHASES.map(p => ({
        id: p.id,
        name: p.title,
        priority: p.modules.length > 0 ? 'P0' : 'P1',
        modules: p.modules.map(m => ({ nodeIds: m.nodeIds })),
      }));
      const data = await vibeLearningApi.getEnhancedDashboard(phases, token) as EnhancedDashboardData;
      setEnhancedData(data);
    } catch (e) {
      console.error('加载增强仪表盘数据失败:', e);
    }
  }, [token]);

  useEffect(() => {
    loadEnhancedDashboard();
  }, [loadEnhancedDashboard]);

  // 增强数据
  const streakDays = enhancedData?.streakDays ?? 0;
  const estimatedRemainingMinutes = enhancedData?.estimatedRemainingMinutes ?? 0;
  const dueReviewCount = enhancedData?.dueReviewCount ?? 0;
  const unreviewedErrorCount = enhancedData?.unreviewedErrorCount ?? 0;
  const phaseProgress = enhancedData?.phaseProgress ?? [];

  const estHours = Math.floor(estimatedRemainingMinutes / 60);
  const estMins = estimatedRemainingMinutes % 60;

  // 模式标签映射
  const modeLabel: Record<string, { emoji: string; label: string }> = {
    lecture: { emoji: '📖', label: '概念理解' },
    practice: { emoji: '💻', label: '动手实践' },
    exam: { emoji: '📝', label: '评估测验' },
    chat: { emoji: '💬', label: 'AI 对话' },
    concept: { emoji: '📖', label: '概念理解' },
    code: { emoji: '💻', label: '动手实践' },
    quiz: { emoji: '📝', label: '评估测验' },
  };

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── 1. 顶部统计卡 + 进度环 ── */}
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Target className="w-4 h-4 text-orange-400" />}
            label="总进度"
            value={`${Math.round(overallProgress)}%`}
            sub={`${completedCount}/${totalNodes} 知识点`}
            color="orange"
          />
          <StatCard
            icon={<Flame className="w-4 h-4 text-red-400" />}
            label="连续学习"
            value={`${streakDays} 天`}
            sub={streakDays >= 7 ? '🔥 坚持中！' : streakDays > 0 ? '继续保持！' : '开始学习吧'}
            color="red"
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            label="预估剩余"
            value={estimatedRemainingMinutes > 0 ? (estHours > 0 ? `${estHours}h${estMins}m` : `${estMins}m`) : '--'}
            sub={estimatedRemainingMinutes > 0 ? `还需完成 ${totalNodes - completedCount} 个` : '已全部完成 🎉'}
            color="blue"
          />
          <StatCard
            icon={<Trophy className="w-4 h-4 text-yellow-400" />}
            label="精通数"
            value={`${expertCount}`}
            sub={`熟练 ${proficientCount} · 学习中 ${learningCount}`}
            color="yellow"
          />
        </div>
        <div className="hidden lg:flex items-center justify-center">
          <ProgressRing progress={overallProgress} size={100} />
        </div>
      </div>

      {/* ── 2. 总体进度条 + 预估剩余时间 ── */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white/50 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" /> 总体学习进度
          </span>
          <div className="flex items-center gap-3">
            {estimatedRemainingMinutes > 0 && (
              <span className="text-[10px] text-blue-400/80 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 预估剩余 {estHours > 0 ? `${estHours}h` : ''}{estMins}m
              </span>
            )}
            <span className="text-xs font-bold bg-gradient-to-r from-blue-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              {Math.round(overallProgress)}%
            </span>
          </div>
        </div>
        {/* 分段进度条 — 每个阶段一段，对齐§4.1色彩 */}
        <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden flex">
          {phaseStats.map(({ completed, total, colors }) => {
            const width = totalNodes > 0 ? (completed / totalNodes) * 100 : 0;
            return (
              <div
                key={colors.from}
                className="h-full transition-all duration-1000 first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${colors.barFrom}, ${colors.barTo})`,
                  minWidth: completed > 0 ? '4px' : '0',
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-white/50">0%</span>
          <span className="text-[10px] text-white/50">
            还需 {totalNodes - completedCount} 个知识点到达 100%
          </span>
          <span className="text-[10px] text-white/50">100%</span>
        </div>
      </div>

      {/* ── 2b. 复习提醒条 ── */}
      {(dueReviewCount > 0 || unreviewedErrorCount > 0) && (
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          {dueReviewCount > 0 && (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/60">今日待复习</p>
                <p className="text-sm font-bold text-violet-400">{dueReviewCount} 个知识点</p>
              </div>
            </div>
          )}
          {dueReviewCount > 0 && unreviewedErrorCount > 0 && (
            <div className="w-px h-8 bg-white/[0.06]" />
          )}
          {unreviewedErrorCount > 0 && (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/60">未回顾错题</p>
                <p className="text-sm font-bold text-orange-400">{unreviewedErrorCount} 道错题</p>
              </div>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />
        </div>
      )}

      {/* ── 3. 阶段进度 + 学习建议 并排布局 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左：阶段进度 */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <h3 className="text-xs font-semibold text-white/50 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-violet-400" /> 阶段进度
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {phaseProgress.length > 0 ? phaseProgress.map((pp) => {
              const phaseColors = PHASE_COLORS[pp.phaseId] || PHASE_COLORS.foundation;
              const priorityBadge = PRIORITY_BADGE[pp.priority] || PRIORITY_BADGE.P1;
              const isComplete = pp.completed === pp.total && pp.total > 0;
              return (
                <div key={pp.phaseId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                        isComplete
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : pp.completed > 0
                            ? `bg-gradient-to-br ${phaseColors.from} ${phaseColors.to} text-white`
                            : 'bg-white/[0.04] text-white/55'
                      }`}>
                        {isComplete ? <CheckCircle2 className="w-3 h-3" /> : pp.phaseId === 'foundation' ? '1' : pp.phaseId === 'advancement' ? '2' : pp.phaseId === 'framework' ? '3' : pp.phaseId === 'engineering' ? '4' : '5'}
                      </span>
                      <span className={`text-xs font-medium ${pp.completed > 0 ? 'text-white/70' : 'text-white/60'}`}>
                        {pp.phaseName}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${priorityBadge.bg} ${priorityBadge.text}`}>
                        {priorityBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pp.avgMastery > 0 && (
                        <span className={`text-[9px] font-mono ${phaseColors.accent}`}>
                          均 {pp.avgMastery}%
                        </span>
                      )}
                      <span className="text-[10px] text-white/50">{pp.completed}/{pp.total}</span>
                      <span className="text-[10px] font-semibold text-white/65">{pp.progress}%</span>
                    </div>
                  </div>
                  {/* 进度条 */}
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pp.progress}%`,
                        background: isComplete
                          ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                          : `linear-gradient(90deg, ${phaseColors.barFrom}, ${phaseColors.barTo})`,
                        opacity: pp.completed > 0 || isComplete ? 1 : 0.3,
                      }}
                    />
                  </div>
                  {/* 4种状态统计 */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[8px] text-gray-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 精通 {pp.mastered}
                    </span>
                    <span className="text-[8px] text-gray-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> 已通过 {pp.completed - pp.mastered}
                    </span>
                    <span className="text-[8px] text-gray-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> 学习中 {pp.learning}
                    </span>
                    <span className="text-[8px] text-gray-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> 锁定 {pp.locked}
                    </span>
                  </div>
                </div>
              );
            }) : (
              /* 降级：使用本地数据 */
              phaseStats.map(({ phase, completed, total, avgMastery, progress, colors }) => {
                const isActive = phase.modules.some(m => m.nodeIds.includes(currentNodeId || ''));
                const isComplete = completed === total;
                return (
                  <div key={phase.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                          isActive
                            ? `bg-gradient-to-br ${colors.from} ${colors.to} text-white`
                            : isComplete
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/[0.04] text-white/55'
                        }`}>
                          {isComplete ? <CheckCircle2 className="w-3 h-3" /> : phase.index}
                        </span>
                        <span className={`text-xs font-medium ${isActive ? 'text-white/80' : 'text-white/65'}`}>
                          {phase.emoji} {phase.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {avgMastery > 0 && (
                          <span className={`text-[9px] font-mono ${colors.accent}`}>
                            均 {Math.round(avgMastery * 100)}%
                          </span>
                        )}
                        <span className="text-[10px] text-white/50">{completed}/{total}</span>
                        <span className="text-[10px] font-semibold text-white/65">{Math.round(progress)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${progress}%`,
                          background: isComplete
                            ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                            : `linear-gradient(90deg, ${colors.barFrom}, ${colors.barTo})`,
                          opacity: isActive || isComplete ? 1 : 0.4,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右：学习建议（来自 Step 40） */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <h3 className="text-xs font-semibold text-white/50 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> 学习建议
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {dueReviewCount > 0 && (
              <AdviceItem
                emoji="🔴"
                text={`${dueReviewCount} 个知识点需要复习`}
                sub="间隔复习有助于长期记忆"
                color="text-red-400"
                bgColor="bg-red-500/10"
              />
            )}
            {unreviewedErrorCount > 0 && (
              <AdviceItem
                emoji="🟠"
                text={`${unreviewedErrorCount} 道错题待回顾`}
                sub="回顾错题可避免重复犯错"
                color="text-orange-400"
                bgColor="bg-orange-500/10"
              />
            )}
            {learningCount > 0 && (
              <AdviceItem
                emoji="🟡"
                text={`${learningCount} 个知识点正在学习中`}
                sub="坚持完成当前知识点，解锁后续内容"
                color="text-yellow-400"
                bgColor="bg-yellow-500/10"
              />
            )}
            {proficientCount > 0 && (
              <AdviceItem
                emoji="🔵"
                text={`${proficientCount} 个知识点已熟练`}
                sub="继续练习可提升至精通水平"
                color="text-blue-400"
                bgColor="bg-blue-500/10"
              />
            )}
            {expertCount > 0 && (
              <AdviceItem
                emoji="🟢"
                text={`${expertCount} 个知识点已精通`}
                sub="太棒了！保持学习节奏"
                color="text-emerald-400"
                bgColor="bg-emerald-500/10"
              />
            )}
            {streakDays >= 7 && (
              <AdviceItem
                emoji="🔥"
                text={`连续学习 ${streakDays} 天！`}
                sub="你的坚持令人钦佩"
                color="text-amber-400"
                bgColor="bg-amber-500/10"
              />
            )}
            {dueReviewCount === 0 && unreviewedErrorCount === 0 && learningCount === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-white/55">暂无建议</p>
                <p className="text-[10px] text-white/70 mt-1">开始学习后将为你生成个性化建议</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. 迷你掌握度热力图（嵌入 Step 39 的数据） ── */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <h3 className="text-xs font-semibold text-white/50 flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-emerald-400" /> 掌握度热力图
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {LEARNING_PHASES.map(phase => {
            const allNodeIds = phase.modules.flatMap(m => m.nodeIds);
            const colors = PHASE_COLORS[phase.id] || PHASE_COLORS.foundation;
            return (
              <div key={phase.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium ${colors.accent}`}>{phase.emoji} {phase.title}</span>
                  <span className="text-[9px] text-white/50">{allNodeIds.length} 个知识点</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {allNodeIds.map(nId => {
                    const score = knowledgeState[nId] !== undefined ? Math.round(knowledgeState[nId] * 100) : 0;
                    const isCompleted = completedNodes.has(nId);
                    const finalScore = isCompleted && score === 0 ? 100 : score;
                    const color = getMiniHeatColor(finalScore);
                    return (
                      <div
                        key={nId}
                        className="w-4 h-4 rounded-sm transition-all duration-300 hover:scale-125 cursor-default"
                        style={{ backgroundColor: color }}
                        title={`${getNodeName(nId)} · ${finalScore}%`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* 热力图图例 */}
          <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04]">
            <span className="text-[9px] text-white/50">图例：</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#374151' }} />
              <span className="text-[9px] text-white/50">未学习</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
              <span className="text-[9px] text-white/50">学习中</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#eab308' }} />
              <span className="text-[9px] text-white/50">已通过</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-[9px] text-white/50">精通</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. 学习闭环概览 ── */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-white/50 mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> 学习闭环概览
        </h3>
        <div className="flex items-center gap-3">
          {LOOP_STEPS.map((loopStep) => {
            const stepMasteryThreshold = loopStep.key === 'concept' ? 0.1 : loopStep.key === 'code' ? 0.6 : PASS_THRESHOLD;
            const nodesAtStep = masteryLevels.filter(m => m >= stepMasteryThreshold).length;
            const stepPercent = totalNodes > 0 ? Math.round((nodesAtStep / totalNodes) * 100) : 0;

            return (
              <div key={loopStep.key} className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{loopStep.emoji}</span>
                  <span className="text-[11px] text-white/50 font-medium">{loopStep.label}</span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      loopStep.key === 'concept' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                      loopStep.key === 'code' ? 'bg-gradient-to-r from-orange-500 to-pink-500' :
                      'bg-gradient-to-r from-violet-500 to-purple-500'
                    }`}
                    style={{ width: `${stepPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50">{nodesAtStep} 知识点</span>
                  <span className="text-[9px] text-white/55">{stepPercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. 分阶段进度（对齐§4.1五阶段色彩） ── */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <h3 className="text-xs font-semibold text-white/50 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-violet-400" /> 分阶段进度
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {phaseStats.map(({ phase, completed, total, progress, avgMastery, colors }) => {
            const isActive = phase.modules.some(m => m.nodeIds.includes(currentNodeId || ''));
            const isComplete = completed === total;
            return (
              <div key={phase.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                      isActive
                        ? `bg-gradient-to-br ${colors.from} ${colors.to} text-white`
                        : isComplete
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/[0.04] text-white/55'
                    }`}>
                      {isComplete ? <CheckCircle2 className="w-3 h-3" /> : phase.index}
                    </span>
                    <span className={`text-xs font-medium ${isActive ? 'text-white/80' : 'text-white/65'}`}>
                      {phase.emoji} {phase.title}
                    </span>
                    {isActive && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${colors.accent} bg-white/[0.06]`}>
                        当前
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {avgMastery > 0 && (
                      <span className={`text-[9px] font-mono ${colors.accent}`}>
                        均 {Math.round(avgMastery * 100)}%
                      </span>
                    )}
                    <span className="text-[10px] text-white/50">{completed}/{total}</span>
                    <span className="text-[10px] font-semibold text-white/65">{Math.round(progress)}%</span>
                  </div>
                </div>
                {/* 进度条 — 使用§4.1阶段渐变色 */}
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: isComplete
                        ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                        : `linear-gradient(90deg, ${colors.barFrom}, ${colors.barTo})`,
                      opacity: isActive || isComplete ? 1 : 0.4,
                    }}
                  />
                </div>
                {/* 模块级知识点圆点 — 使用阶段色彩 */}
                <div className="flex gap-1 mt-1.5">
                  {phase.modules.map(mod =>
                    mod.nodeIds.map(nId => {
                      const isNodeCompleted = completedNodes.has(nId);
                      const nodeMastery = knowledgeState[nId];
                      const isLearning = nodeMastery !== undefined && nodeMastery > 0 && !isNodeCompleted;
                      return (
                        <div
                          key={nId}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                            isNodeCompleted
                              ? colors.dotCompleted
                              : isLearning
                                ? colors.dotLearning
                                : 'bg-white/[0.06]'
                          }`}
                          title={`${NODE_NAMES[nId] || nId}${isNodeCompleted ? ' ✓' : isLearning ? ` ${Math.round((nodeMastery || 0) * 100)}%` : ''}`}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 7. 掌握度分布柱状图 ── */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-white/50 mb-3 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> 掌握度分布
        </h3>
        <div className="flex gap-2">
          <MasteryBar label="精通" count={expertCount} from="#10b981" to="#14b8a6" textColor="text-emerald-400" total={totalNodes} />
          <MasteryBar label="熟练" count={proficientCount} from="#3b82f6" to="#6366f1" textColor="text-blue-400" total={totalNodes} />
          <MasteryBar label="学习中" count={learningCount} from="#f97316" to="#ec4899" textColor="text-orange-400" total={totalNodes} />
          <MasteryBar label="未开始" count={notStartedCount} from="#4b5563" to="#6b7280" textColor="text-white/50" total={totalNodes} />
        </div>
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/[0.04]">
          <span className="text-[9px] text-white/50">精通 ≥90%</span>
          <span className="text-[9px] text-white/50">熟练 60-89%</span>
          <span className="text-[9px] text-white/50">学习中 1-59%</span>
          <span className="text-[9px] text-white/50">未开始</span>
        </div>
      </div>

      {/* ── 8. 最近学习活动 ── */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <h3 className="text-xs font-semibold text-white/50 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> 最近学习活动
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {recentActivity.slice(0, 8).map((activity, i) => {
              const mInfo = modeLabel[activity.mode] || { emoji: '📋', label: activity.mode };
              const passed = activity.score >= PASS_THRESHOLD;
              // 用阶段色彩标注活动
              const nodeId = Object.entries(NODE_NAMES).find(([, name]) => name === activity.nodeName)?.[0];
              const phaseId = nodeId ? NODE_PHASE_MAP[nodeId] : null;
              const activityColors = phaseId ? PHASE_COLORS[phaseId] : null;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                    passed ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
                  }`}>
                    {mInfo.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${activityColors ? activityColors.accent : 'text-white/50'}`}>
                      {activity.nodeName}
                    </p>
                    <p className="text-[9px] text-white/50">{mInfo.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-bold ${passed ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {Math.round(activity.score * 100)}分
                    </span>
                    <p className="text-[9px] text-white/70">
                      {activity.timestamp
                        ? new Date(activity.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] text-white/55">{label}</span>
      </div>
      <div className={`text-xl font-black ${
        color === 'orange' ? 'text-orange-400' :
        color === 'red' ? 'text-red-400' :
        color === 'blue' ? 'text-blue-400' :
        'text-yellow-400'
      }`}>
        {value}
      </div>
      <p className="text-[9px] text-white/50 mt-0.5">{sub}</p>
    </div>
  );
}

function MasteryBar({
  label, count, from, to, textColor, total,
}: {
  label: string;
  count: number;
  from: string;
  to: string;
  textColor: string;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex-1 text-center">
      <div className="h-16 bg-white/[0.02] rounded-lg relative overflow-hidden flex items-end">
        <div
          className="w-full rounded-t-sm transition-all duration-700"
          style={{
            height: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
            background: `linear-gradient(180deg, ${from}, ${to})`,
          }}
        />
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textColor}`}>
          {count}
        </span>
      </div>
      <span className="text-[9px] text-white/50 mt-1 block">{label}</span>
    </div>
  );
}

/** 学习建议条目 */
function AdviceItem({
  emoji, text, sub, color, bgColor,
}: {
  emoji: string;
  text: string;
  sub: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${bgColor} border border-white/[0.04]`}>
      <span className="text-lg shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${color}`}>{text}</p>
        <p className="text-[9px] text-white/50 mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-white/70 shrink-0" />
    </div>
  );
}
