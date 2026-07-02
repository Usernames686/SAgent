'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { analyticsApi } from '@/lib/api';
import dynamic from 'next/dynamic';
import {
  Flame, Star, Trophy, Target, TrendingUp, Clock, Brain, Zap, Award, ArrowUpRight, ChevronRight, Rocket, Loader2, AlertCircle,
} from 'lucide-react';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false });
const AiChatPanel = dynamic(() => import('@/components/AiChatPanel'), { ssr: false });

interface DashboardData {
  overview: {
    totalStudyMinutes: number;
    totalExercises: number;
    streak: number;
    level: number;
    xp: number;
    badgesEarned: number;
    pagesVisited: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    passed: boolean;
    createdAt: string;
  }>;
  weeklyGoal: {
    target: number;
    current: number;
  };
}

const ACTIVITY_ICONS: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  submission: { icon: Zap, color: 'text-green-400', bg: 'bg-green-500/[0.08]' },
  exercise: { icon: Zap, color: 'text-green-400', bg: 'bg-green-500/[0.08]' },
  chat: { icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/[0.08]' },
  vibe: { icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/[0.08]' },
  badge: { icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-500/[0.08]' },
  default: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/[0.08]' },
};

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

export default function DashboardPage() {
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'editor'>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getDashboard(accessToken || undefined);
      setData(res as DashboardData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'overview') fetchDashboard();
  }, [activeTab, fetchDashboard]);

  const overview = data?.overview;
  const recentActivity = data?.recentActivity || [];
  const weeklyGoal = data?.weeklyGoal || { target: 7, current: 0 };

  const stats = overview ? [
    { label: '连续学习', value: `${overview.streak} 天`, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: '完成题目', value: String(overview.totalExercises), icon: Target, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: '编码时长', value: formatMinutes(overview.totalStudyMinutes), icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: '获得徽章', value: String(overview.badgesEarned), icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ] : [];

  const heroStats = overview ? [
    { icon: Flame, value: `${overview.streak}`, label: '连续天数', color: 'text-orange-400', bg: 'bg-orange-500/[0.08]' },
    { icon: Award, value: String(overview.badgesEarned), label: '徽章', color: 'text-purple-400', bg: 'bg-purple-500/[0.08]' },
    { icon: Star, value: overview.xp.toLocaleString(), label: 'XP', color: 'text-pink-400', bg: 'bg-pink-500/[0.08]' },
    { icon: TrendingUp, value: `Lv.${overview.level}`, label: '等级', color: 'text-blue-400', bg: 'bg-blue-500/[0.08]' },
  ] : [];

  return (
    <>
      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0" style={{ background: 'rgba(2, 6, 14, 0.4)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-white text-[15px]">{activeTab === 'overview' ? '学习概览' : '代码编辑器'}</h2>
          {activeTab === 'overview' && overview && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/[0.08] border border-orange-500/10">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-medium text-orange-400">{overview.streak} 天</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/[0.08] border border-green-500/10">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] font-medium text-green-400">周目标 {weeklyGoal.current}/{weeklyGoal.target}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-xl p-1 border border-white/[0.04]">
          <button onClick={() => setActiveTab('overview')} className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'overview' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/55 hover:text-white/60'}`}>概览</button>
          <button onClick={() => setActiveTab('editor')} className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === 'editor' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/55 hover:text-white/60'}`}>编辑器</button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' ? (
          <div className="p-6 space-y-6">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
              </div>
            )}
            {error && (
              <div className="glass rounded-2xl p-6 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">加载失败：{error}</span>
                <button onClick={fetchDashboard} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">重试</button>
              </div>
            )}
            {!loading && !error && (
              <>
            {/* Welcome banner */}
            <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(236,72,153,0.08) 50%, rgba(139,92,246,0.12) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px]" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">欢迎回来，{String(user?.nickname || '同学')}！</h2>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-medium border border-green-500/20">在线</span>
                  </div>
                  <p className="text-white/65 mb-4">{overview ? `你已经连续学习 ${overview.streak} 天，继续保持！` : '今天准备好学习新知识了吗？'}</p>
                  <div className="flex gap-3">
                    <a href="/dashboard/exercises" className="btn-primary px-5 py-2.5 text-sm">继续学习</a>
                    <a href="/dashboard/vibe" className="btn-secondary px-5 py-2.5 text-sm">氛围编程</a>
                    <a href="/dashboard/chat" className="btn-secondary px-5 py-2.5 text-sm">问 AI</a>
                  </div>
                </div>
                <div className="hidden xl:flex items-center gap-8">
                  {heroStats.map((item, i) => (
                    <div key={i} className="text-center group cursor-pointer">
                      <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div className="text-lg font-bold text-white">{item.value}</div>
                      <div className="text-[10px] text-white/55">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="glass rounded-2xl p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-[11px] text-white/55">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Learning + Today Tasks + Progress Ring */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Continue Learning — 最近动态来源 */}
              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-5"><Rocket className="w-4 h-4 text-green-400" /> 最近学习</h3>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((item) => (
                      <a key={item.id} href="/dashboard/history" className="block p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors truncate">{item.title}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-white/50 shrink-0" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] ${item.passed ? 'text-green-400' : 'text-orange-400'}`}>{item.passed ? '已通过' : '进行中'}</span>
                          <span className="text-[10px] text-white/50">·</span>
                          <span className="text-[10px] text-white/50">{formatTimeAgo(item.createdAt)}</span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-white/40 mb-3">还没有学习记录</p>
                      <a href="/dashboard/exercises" className="btn-primary px-4 py-2 text-xs inline-block">开始第一道练习</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Today Tasks — 周目标 + 快速入口 */}
              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-5"><Target className="w-4 h-4 text-orange-400" /> 本周目标</h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">本周已学习</span>
                    <span className="text-sm font-medium text-orange-400">{weeklyGoal.current} / {weeklyGoal.target} 天</span>
                  </div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: weeklyGoal.target }).map((_, i) => (
                      <div key={i} className={`flex-1 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium transition-all ${
                        i < weeklyGoal.current ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white' : 'bg-white/[0.04] text-white/40'
                      }`}>{i < weeklyGoal.current ? '✓' : i + 1}</div>
                    ))}
                  </div>
                </div>
                {/* 为你推荐 */}
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <h4 className="text-xs font-medium text-accent-400 mb-2">✨ 快速继续</h4>
                  <div className="space-y-1.5">
                    {[{ name: '编程练习', href: '/dashboard/exercises' }, { name: '氛围编程', href: '/dashboard/vibe' }, { name: 'AI 辅导', href: '/dashboard/chat' }].map((r, i) => (
                      <a key={i} href={r.href} className="block text-[12px] text-white/60 hover:text-white/80 transition-colors py-1">→ {r.name}</a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Ring — 周目标完成度 */}
              <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-4 self-start"><Brain className="w-4 h-4 text-purple-400" /> 周目标进度</h3>
                {(() => {
                  const ratio = weeklyGoal.target > 0 ? Math.min(weeklyGoal.current / weeklyGoal.target, 1) : 0;
                  const circumference = 2 * Math.PI * 50;
                  return (
                    <>
                      <div className="relative w-32 h-32 mb-3">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke="url(#progressGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${ratio * circumference} ${circumference}`} />
                          <defs><linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white">{Math.round(ratio * 100)}%</span>
                          <span className="text-[10px] text-white/50">本周完成率</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/50 text-center">已坚持 {weeklyGoal.current} / {weeklyGoal.target} 天</p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> 最近动态</h3>
                  <a href="/dashboard/history" className="text-[11px] text-white/55 hover:text-white/60 flex items-center gap-1 transition-colors">查看全部 <ChevronRight className="w-3 h-3" /></a>
                </div>
                <div className="space-y-2">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => {
                      const cfg = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.default;
                      const Icon = cfg.icon;
                      return (
                        <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer group">
                          <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0"><p className="text-[13px] text-white/70 truncate">{activity.title}</p></div>
                          <span className="text-[11px] text-white/50 shrink-0">{formatTimeAgo(activity.createdAt)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-sm text-white/40">暂无最近动态</div>
                  )}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-5"><Rocket className="w-4 h-4 text-orange-400" /> 快速开始</h3>
                <div className="space-y-2">
                  {[{ icon: '💻', label: '编程练习', desc: '开始今天的练习', href: '/dashboard/exercises', color: 'from-green-500/[0.12] to-emerald-500/[0.12]' }, { icon: '🎨', label: '氛围编程', desc: '用 AI 生成组件', href: '/dashboard/vibe', color: 'from-purple-500/[0.12] to-pink-500/[0.12]' }, { icon: '💬', label: 'AI 辅导', desc: '获取学习帮助', href: '/dashboard/chat', color: 'from-blue-500/[0.12] to-cyan-500/[0.12]' }, { icon: '🗺️', label: '学习路径', desc: '查看学习计划', href: '/dashboard/learn', color: 'from-orange-500/[0.12] to-amber-500/[0.12]' }].map((action, i) => (
                    <a key={i} href={action.href} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-lg group-hover:scale-110 transition-transform duration-300`}>{action.icon}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-white/80 block">{action.label}</span>
                        <span className="text-[11px] text-white/50">{action.desc}</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-white/70 group-hover:text-white/65 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex h-full">
            <div className="flex-1 flex flex-col border-r border-white/[0.06] min-w-0"><CodeEditor /></div>
            <div className="w-80 xl:w-96 flex flex-col shrink-0"><AiChatPanel /></div>
          </div>
        )}
      </div>
    </>
  );
}
