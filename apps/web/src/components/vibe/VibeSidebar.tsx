'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, CheckCircle2, Circle,
  Lock, Flame, Clock, BookOpen, Sparkles,
} from 'lucide-react';
import {
  LEARNING_PHASES, NODE_PHASE_MAP, NODE_NAMES,
  NODE_PREREQUISITES, PHASE_MAP,
  getPhaseLectureCount, isNodeUnlocked, PASS_THRESHOLD,
  LOOP_STEPS,
  type PhaseConfig, type ModuleConfig, type LearningLoopStep,
} from './phase-config';

// ── Props ──

interface VibeSidebarProps {
  currentNodeId: string | null;
  completedNodes: Set<string>;
  knowledgeState: Record<string, number>;
  onSelectNode: (nodeId: string) => void;
  overallProgress: number;
  completedCount: number;
  totalCount: number;
  /** 当前学习闭环步骤 */
  currentLoopStep?: LearningLoopStep;
}

// ── Component ──

export default function VibeSidebar({
  currentNodeId,
  completedNodes,
  knowledgeState,
  onSelectNode,
  overallProgress,
  completedCount,
  totalCount,
  currentLoopStep = 'concept',
}: VibeSidebarProps) {
  // 默认展开所有阶段，让用户一览全局
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(LEARNING_PHASES.map(p => p.id))
  );

  // 追踪已完成的节点，用于触发动画
  const prevCompletedRef = useRef<Set<string>>(completedNodes);
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 检测新完成的节点
    const newCompleted = new Set<string>();
    completedNodes.forEach(id => {
      if (!prevCompletedRef.current.has(id)) newCompleted.add(id);
    });

    // 检测新解锁的节点
    const newUnlocked = new Set<string>();
    if (newCompleted.size > 0) {
      LEARNING_PHASES.forEach(phase => {
        phase.modules.forEach(mod => {
          mod.nodeIds.forEach(nodeId => {
            if (!completedNodes.has(nodeId) && isNodeUnlocked(nodeId, completedNodes)) {
              if (!isNodeUnlocked(nodeId, prevCompletedRef.current)) {
                newUnlocked.add(nodeId);
              }
            }
          });
        });
      });
    }

    if (newCompleted.size > 0) {
      setJustCompleted(newCompleted);
      setTimeout(() => setJustCompleted(new Set()), 2000);
    }
    if (newUnlocked.size > 0) {
      setJustUnlocked(newUnlocked);
      setTimeout(() => setJustUnlocked(new Set()), 2000);
    }

    prevCompletedRef.current = completedNodes;
  }, [completedNodes]);

  useEffect(() => {
    if (currentNodeId) {
      const phaseId = NODE_PHASE_MAP[currentNodeId];
      if (phaseId && !expandedPhases.has(phaseId)) {
        setExpandedPhases(prev => new Set([...prev, phaseId]));
      }
    }
  }, [currentNodeId]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // ── Node status based on dependency graph ──
  // 'preview-locked': 可见但前置未满足（可浏览但需先学前置）
  const getNodeStatus = (nodeId: string): 'completed' | 'current' | 'available' | 'preview-locked' => {
    if (nodeId === currentNodeId) return 'current';
    if (completedNodes.has(nodeId)) return 'completed';
    // 所有知识点均开放访问
    return 'available';
  };

  // ── Phase status ──

  const getPhaseStatus = (phase: PhaseConfig): 'completed' | 'active' | 'available' | 'locked' => {
    const allNodeIds = phase.modules.flatMap(m => m.nodeIds);
    const completedInPhase = allNodeIds.filter(id => completedNodes.has(id)).length;

    // 全部完成
    if (completedInPhase === allNodeIds.length) return 'completed';
    // 包含当前学习节点 或 已有完成节点
    if (allNodeIds.some(id => id === currentNodeId) || completedInPhase > 0) return 'active';
    // 第一阶段始终可访问
    if (phase.index === 1) return 'active';
    // 所有阶段都可见（取消锁定，允许浏览）
    return 'available';
  };

  // ── Phase progress ──

  const getPhaseProgress = (phase: PhaseConfig): number => {
    const allNodeIds = phase.modules.flatMap(m => m.nodeIds);
    if (allNodeIds.length === 0) return 0;
    const completed = allNodeIds.filter(id => completedNodes.has(id)).length;
    return (completed / allNodeIds.length) * 100;
  };

  const getModuleProgress = (mod: ModuleConfig): number => {
    if (mod.nodeIds.length === 0) return 0;
    const completed = mod.nodeIds.filter(id => completedNodes.has(id)).length;
    return (completed / mod.nodeIds.length) * 100;
  };

  // ── Mastery color helper ──

  const getMasteryStyle = (mastery: number): { bg: string; text: string; border: string } => {
    if (mastery >= PASS_THRESHOLD) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    if (mastery >= 0.6) return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' };
    if (mastery >= 0.3) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' };
    return { bg: 'bg-white/5', text: 'text-white/55', border: 'border-white/[0.06]' };
  };

  // ── Loop step index ──

  const currentStepIndex = LOOP_STEPS.findIndex(s => s.key === currentLoopStep);

  // ── Render ──

  return (
    <aside className="w-[280px] shrink-0 h-full flex flex-col border-r border-white/[0.06] overflow-hidden"
      style={{ background: 'rgba(8,6,20,0.85)', backdropFilter: 'blur(20px)' }}>

      {/* ── Logo ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h1 className="text-base font-extrabold bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Vibe Learning
            </h1>
          </div>
        </div>
      </div>

      {/* ── Overall Progress ── */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-white/50 tracking-wide">总进度</span>
          <span className="text-xs font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 transition-all duration-700"
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-white/50 flex items-center gap-1">
            {completedCount}/{totalCount} 知识点
          </span>
          <span className="text-[10px] text-white/70">
            还需 {totalCount - completedCount} 个
          </span>
        </div>
      </div>

      {/* ── Learning Loop Step Indicator ── */}
      {currentNodeId && (
        <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-orange-400/60" />
            <span className="text-[9px] text-white/50 tracking-wide">学习闭环</span>
          </div>
          <div className="flex items-center gap-1">
            {LOOP_STEPS.map((step, i) => {
              const isActive = i === currentStepIndex;
              const isDone = i < currentStepIndex;
              return (
                <div key={step.key} className="flex items-center gap-1">
                  {i > 0 && (
                    <div className={`w-3 h-px ${isDone ? 'bg-emerald-500/40' : 'bg-white/[0.06]'}`} />
                  )}
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-all ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                      : isDone
                        ? 'bg-emerald-500/10 text-emerald-400/60'
                        : 'text-white/50'
                  }`}>
                    <span>{step.emoji}</span>
                    <span>{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Phase List ── */}
      <div className="flex-1 overflow-auto px-3 pb-4 space-y-1 sidebar-scroll">
        {LEARNING_PHASES.map((phase) => {
          const phaseStatus = getPhaseStatus(phase);
          const isExpanded = expandedPhases.has(phase.id);
          const lectureCount = getPhaseLectureCount(phase);
          const completedInPhase = phase.modules
            .flatMap(m => m.nodeIds)
            .filter(id => completedNodes.has(id)).length;
          const phaseProgress = getPhaseProgress(phase);

          return (
            <div key={phase.id}>
              {/* ── Phase Header ── */}
              <button
                onClick={() => {
                    togglePhase(phase.id);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 ${
                  phaseStatus === 'locked'
                    ? 'opacity-50 hover:opacity-70'
                    : isExpanded
                      ? `bg-gradient-to-r ${phase.color}/10 ${phase.colorTo}/5`
                      : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Phase Number Badge */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${
                  phaseStatus === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : phaseStatus === 'active'
                      ? `bg-gradient-to-br ${phase.color} ${phase.colorTo} text-white shadow-lg`
                      : phaseStatus === 'available'
                        ? 'bg-white/[0.06] text-white/65'
                        : 'bg-white/[0.03] text-white/70'
                }`}>
                  {phaseStatus === 'completed' ? '✓' : `P${phase.index}`}
                </div>

                {/* Phase Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${
                      phaseStatus === 'locked' ? 'text-white/50' : 'text-white/70'
                    }`}>
                      {phase.emoji} {phase.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Phase progress bar (mini) */}
                    <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          phaseProgress === 100
                            ? 'bg-emerald-500'
                            : `bg-gradient-to-r ${phase.color} ${phase.colorTo}`
                        }`}
                        style={{ width: `${phaseProgress}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/50 tabular-nums shrink-0">
                      {completedInPhase}/{lectureCount}
                    </span>
                  </div>
                </div>

                {/* Expand/Collapse Arrow */}
                <ChevronDown
                  className="w-3.5 h-3.5 text-white/50 shrink-0 transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
              </button>

              {/* ── Expanded Modules & Nodes ── */}
              {isExpanded && (
                <div className="ml-3 mt-1.5 mb-2 space-y-3 animate-fade-in">
                  {phase.modules.map((mod, modIdx) => {
                    const modProgress = getModuleProgress(mod);
                    return (
                      <div key={mod.id}>
                        {/* Module sub-header */}
                        <div className="flex items-center justify-between px-2 py-2 mb-1 border-b border-white/[0.04]">
                          <span className="text-[10px] font-semibold text-white/60 tracking-wide uppercase">
                            {mod.emoji} {mod.name}
                          </span>
                          <span className="text-[9px] text-white/70 tabular-nums">
                            {Math.round(modProgress)}%
                          </span>
                        </div>

                        {/* Node items */}
                        <div className="space-y-1.5 py-1">
                          {mod.nodeIds.map((nodeId, nodeIdx) => {
                            const status = getNodeStatus(nodeId);
                            const isCurrent = nodeId === currentNodeId;
                            const mastery = knowledgeState[nodeId];
                            const nodeName = NODE_NAMES[nodeId] || nodeId;
                            const prereqs = NODE_PREREQUISITES[nodeId] || [];
                            const isJustCompleted = justCompleted.has(nodeId);
                            const isJustUnlocked = justUnlocked.has(nodeId);

                            const isPreviewLocked = status === 'preview-locked';

                            return (
                              <button
                                key={nodeId}
                                onClick={() => {
                                  if (!isPreviewLocked) onSelectNode(nodeId);
                                }}
                                className={`group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                                  isJustCompleted
                                    ? 'animate-unlock-glow bg-emerald-500/10 border border-emerald-500/20'
                                    : isJustUnlocked
                                      ? 'animate-unlock-glow border border-orange-500/15'
                                      : isCurrent
                                        ? 'bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/15 shadow-sm shadow-orange-500/5'
                                        : status === 'completed'
                                          ? 'bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.06]'
                                          : isPreviewLocked
                                            ? 'opacity-60 hover:opacity-80 border border-transparent'
                                            : 'bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.06]'
                                }`}
                              >
                                {/* Status indicator */}
                                <div className={`relative w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] ${
                                  isCurrent
                                    ? 'bg-gradient-to-br from-orange-500/25 to-pink-500/25 text-orange-400 animate-pulse-dot shadow-sm shadow-orange-500/10'
                                    : status === 'completed'
                                      ? `bg-emerald-500/15 text-emerald-400 ${isJustCompleted ? 'animate-scale-in' : ''}`
                                      : isPreviewLocked
                                        ? 'bg-white/[0.04] text-white/50'
                                        : `bg-white/[0.05] text-white/50 group-hover:text-white/55 group-hover:bg-white/[0.08] ${isJustUnlocked ? 'animate-scale-in' : ''}`
                                }`}>
                                  {status === 'completed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : isCurrent ? (
                                    <span className="font-bold">{nodeIdx + 1}</span>
                                  ) : isPreviewLocked ? (
                                    <Lock className="w-3 h-3" />
                                  ) : (
                                    <Circle className="w-3 h-3" />
                                  )}
                                  {/* 解锁闪光效果 */}
                                  {isJustUnlocked && (
                                    <div className="absolute inset-0 rounded-lg bg-orange-400/20 animate-ping-slow" />
                                  )}
                                </div>

                                {/* Node name with ID label */}
                                <div className="flex-1 min-w-0">
                                  <span className={`text-[11px] truncate block leading-snug ${
                                    isJustCompleted
                                      ? 'text-emerald-400 font-semibold'
                                      : isJustUnlocked
                                        ? 'text-orange-300 font-semibold'
                                        : isCurrent
                                          ? 'text-white font-semibold'
                                          : status === 'completed'
                                            ? 'text-white/70'
                                            : isPreviewLocked
                                              ? 'text-white/45'
                                              : 'text-white/55 group-hover:text-white/70'
                                  }`}>
                                    {nodeName}
                                    {isJustCompleted && ' ✓'}
                                    {isJustUnlocked && ' 🔓'}
                                  </span>
                                  <span className={`text-[8px] font-mono mt-0.5 block ${
                                    isJustCompleted ? 'text-emerald-400/40' : isJustUnlocked ? 'text-orange-400/40' : isCurrent ? 'text-orange-400/40' : 'text-white/35'
                                  }`}>
                                    {nodeId}
                                  </span>
                                </div>

                                {/* Mastery badge with % */}
                                {mastery !== undefined && mastery > 0 && (
                                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border ${
                                    getMasteryStyle(mastery).bg
                                  } ${getMasteryStyle(mastery).text} ${getMasteryStyle(mastery).border}`}>
                                    {Math.round(mastery * 100)}%
                                  </span>
                                )}

                                {/* Preview-locked hint: 显示需要几个前置 */}
                                {isPreviewLocked && prereqs.length > 0 && (
                                  <span className="text-[8px] text-white/70 truncate max-w-[60px] group-hover:text-white/55">
                                    🔒需{prereqs.length}前置
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Stats Footer ── */}
      <div className="px-4 py-3 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/50 flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" /> 连续学习中
          </span>
          <span className="text-[10px] text-white/50 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 今日学习
          </span>
        </div>
      </div>
    </aside>
  );
}
