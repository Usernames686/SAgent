'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2, ArrowRight, Clock, Star, Zap,
  Trophy, Target, Sparkles, ChevronRight,
} from 'lucide-react';

// ── Types ──

interface NodeCompletionCardProps {
  /** 完成的知识点名称 */
  completedNodeName: string;
  /** 完成的知识点ID */
  completedNodeId: string;
  /** 得分 0-1 */
  score: number;
  /** 学习时长（分钟） */
  studyMinutes?: number;
  /** 掌握度 0-1 */
  mastery?: number;
  /** 下一个知识点名称 */
  nextNodeName?: string;
  /** 下一个知识点ID */
  nextNodeId?: string;
  /** 累计完成知识点数 */
  totalCompleted?: number;
  /** 总知识点数 */
  totalNodes?: number;
  /** 连续学习天数 */
  streakDays?: number;
  /** 回调：继续学习 */
  onContinue: () => void;
  /** 回调：查看进度 */
  onViewProgress?: () => void;
}

// ── 星级计算 ──

function getStarCount(score: number): number {
  if (score >= 0.95) return 5;
  if (score >= 0.9) return 4;
  if (score >= 0.8) return 3;
  if (score >= 0.7) return 2;
  return 1;
}

function getStarLabel(score: number): string {
  if (score >= 0.95) return '完美掌握！';
  if (score >= 0.9) return '优秀！';
  if (score >= 0.8) return '良好';
  if (score >= 0.7) return '通过';
  return '及格';
}

function getScoreColor(score: number): string {
  if (score >= 0.9) return 'text-emerald-400';
  if (score >= 0.7) return 'text-blue-400';
  if (score >= 0.6) return 'text-yellow-400';
  return 'text-orange-400';
}

function getScoreGradient(score: number): string {
  if (score >= 0.9) return 'from-emerald-500/20 to-teal-500/10';
  if (score >= 0.7) return 'from-blue-500/20 to-indigo-500/10';
  return 'from-orange-500/20 to-yellow-500/10';
}

// ── Component ──

export default function NodeCompletionCard({
  completedNodeName,
  completedNodeId,
  score,
  studyMinutes = 0,
  mastery = 0,
  nextNodeName,
  nextNodeId,
  totalCompleted = 0,
  totalNodes = 0,
  streakDays = 0,
  onContinue,
  onViewProgress,
}: NodeCompletionCardProps) {
  const [visible, setVisible] = useState(false);
  const [starsVisible, setStarsVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [nextVisible, setNextVisible] = useState(false);

  const starCount = getStarCount(score);
  const starLabel = getStarLabel(score);
  const scoreColor = getScoreColor(score);
  const scoreGradient = getScoreGradient(score);
  const scorePercent = Math.round(score * 100);
  const isPerfect = score >= 0.95;

  // ── 入场动画序列 ──
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setStarsVisible(true), 400);
    const t3 = setTimeout(() => setStatsVisible(true), 700);
    const t4 = setTimeout(() => setNextVisible(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const studyHours = Math.floor(studyMinutes / 60);
  const studyMins = studyMinutes % 60;
  const progressPercent = totalNodes > 0 ? Math.round((totalCompleted / totalNodes) * 100) : 0;

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden shrink-0">
      {/* 背景层 */}
      <div
        className={`relative transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{
          background: `linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,2,16,0.95) 40%, ${isPerfect ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.06)'} 100%)`,
        }}
      >
        {/* 顶部光条动画 */}
        <div className="h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer" />

        {/* 庆祝粒子效果（仅完美得分） */}
        {isPerfect && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-amber-400/60 animate-float-up"
                style={{
                  left: `${15 + i * 15}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '2.5s',
                }}
              />
            ))}
          </div>
        )}

        <div className="p-6 border border-emerald-500/10 rounded-2xl">
          {/* ── 主标题区 ── */}
          <div className="flex items-center gap-4 mb-5">
            {/* 完成图标 - 带脉冲动画 */}
            <div className="relative w-16 h-16 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/15 animate-ping-slow" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2">
                🎉 已通过！
              </h2>
              <p className="text-base font-semibold text-white/80 mt-0.5 truncate">
                {completedNodeName}
              </p>
            </div>
          </div>

          {/* ── 星级评分 + 得分 ── */}
          <div className={`transition-all duration-500 ${starsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            <div className={`glass rounded-xl p-4 bg-gradient-to-r ${scoreGradient}`}>
              <div className="flex items-center justify-between mb-3">
                {/* 星级 */}
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 transition-all duration-300 ${
                        i < starCount
                          ? 'fill-amber-400 text-amber-400 drop-shadow-glow-amber'
                          : 'text-white/65'
                      }`}
                      style={{
                        transitionDelay: `${i * 100}ms`,
                        opacity: starsVisible ? 1 : 0,
                        transform: starsVisible ? 'scale(1)' : 'scale(0)',
                      }}
                    />
                  ))}
                  <span className="ml-2 text-xs font-medium text-white/65">
                    {starLabel}
                  </span>
                </div>
                {/* 得分 */}
                <div className="text-right">
                  <span className={`text-2xl font-black font-mono ${scoreColor}`}>
                    {scorePercent}
                  </span>
                  <span className="text-sm text-white/55 font-mono">%</span>
                </div>
              </div>

              {/* 得分进度条 */}
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${scorePercent}%`,
                    background: score >= 0.9
                      ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                      : score >= 0.7
                        ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                        : 'linear-gradient(90deg, #f97316, #eab308)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── 能力统计 ── */}
          <div className={`mt-4 grid grid-cols-3 gap-3 transition-all duration-500 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            {/* 学习时长 */}
            <div className="glass rounded-xl p-3 text-center">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-sm font-bold text-white/70">
                {studyHours > 0 ? `${studyHours}h${studyMins}m` : `${studyMins > 0 ? studyMins : '<1'}m`}
              </p>
              <p className="text-[9px] text-white/50">学习时长</p>
            </div>

            {/* 掌握度 */}
            <div className="glass rounded-xl p-3 text-center">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center mx-auto mb-1.5">
                <Target className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <p className="text-sm font-bold text-white/70">
                {Math.round(mastery * 100)}%
              </p>
              <p className="text-[9px] text-white/50">掌握度</p>
            </div>

            {/* 连续学习 */}
            <div className="glass rounded-xl p-3 text-center">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center mx-auto mb-1.5">
                <Zap className="w-3.5 h-3.5 text-red-400" />
              </div>
              <p className="text-sm font-bold text-white/70">
                {streakDays} 天
              </p>
              <p className="text-[9px] text-white/50">连续学习</p>
            </div>
          </div>

          {/* ── 总进度条 ── */}
          <div className={`mt-4 transition-all duration-500 ${statsVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/55 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400/60" /> 学习总进度
              </span>
              <span className="text-[10px] text-white/55">
                {totalCompleted}/{totalNodes} · {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* ── 下一个知识点推荐 ── */}
          {nextNodeName && (
            <div className={`mt-5 transition-all duration-500 ${nextVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="glass rounded-xl p-4 border border-orange-500/10 bg-gradient-to-r from-orange-500/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/15 flex items-center justify-center shrink-0 border border-orange-500/15">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/55 mb-0.5">下一个知识点</p>
                    <p className="text-sm font-semibold text-white/70 truncate">
                      {nextNodeName}
                    </p>
                  </div>
                  <button
                    onClick={onContinue}
                    className="btn-primary px-4 py-2.5 text-xs whitespace-nowrap flex items-center gap-1.5 group"
                    style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(16,185,129,0.2))', borderColor: 'rgba(249,115,22,0.3)' }}
                  >
                    继续学习
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 底部操作 ── */}
          <div className={`mt-4 flex items-center justify-between transition-all duration-500 ${nextVisible ? 'opacity-100' : 'opacity-0'}`}>
            {onViewProgress && (
              <button
                onClick={onViewProgress}
                className="text-[10px] text-white/50 hover:text-white/65 flex items-center gap-1 transition-colors"
              >
                <ChevronRight className="w-3 h-3" /> 查看学习进度
              </button>
            )}
            {!nextNodeName && (
              <button
                onClick={onContinue}
                className="btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5 ml-auto"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))', borderColor: 'rgba(16,185,129,0.3)' }}
              >
                完成 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
