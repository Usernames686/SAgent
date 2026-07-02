'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { analyticsApi } from '@/lib/api';
import { Loader2, BarChart3, TrendingUp, Clock, Target, Brain, Zap, Calendar, ArrowUpRight, Activity, Award, Flame, BookOpen, Code2, MessageSquare, Palette, AlertCircle } from 'lucide-react';

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

export default function AnalyticsPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getDashboard(accessToken || undefined);
      const d = res;
      setData(d as DashboardData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) fetchData();
  }, [hydrated, isAuthenticated, fetchData]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  if (error) return <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400"><AlertCircle className="w-4 h-4" />{error}</div>;

  const overview = data?.overview || { totalStudyMinutes: 0, totalExercises: 0, streak: 0, level: 1, xp: 0, badgesEarned: 0, pagesVisited: 0 };
  const recent = data?.recentActivity || [];
  const weekly = data?.weeklyGoal || { target: 7, current: 0 };

  const statCards = [
    { label: '学习时长', value: `${Math.round(overview.totalStudyMinutes / 60)}h`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: '完成练习', value: overview.totalExercises, icon: Code2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: '连续天数', value: `${overview.streak}天`, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: '当前等级', value: `Lv.${overview.level}`, icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: '经验值', value: overview.xp, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: '获得徽章', value: overview.badgesEarned, icon: Award, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: '浏览页面', value: overview.pagesVisited, icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: '周目标', value: `${weekly.current}/${weekly.target}`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10"><BarChart3 className="w-5 h-5 text-blue-400" /></div>
        <div>
          <h1 className="text-xl font-bold text-white">学习统计</h1>
          <p className="text-sm text-white/65">追踪你的学习进度和成就</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/65">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2"><Activity className="w-4 h-4" />最近活动</h2>
        {recent.length === 0 ? (
          <p className="text-center text-white/50 py-8">暂无活动记录</p>
        ) : (
          <div className="space-y-2">
            {recent.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  item.type === 'submission' ? 'bg-green-500/[0.08]' : 'bg-blue-500/[0.08]'
                }`}>
                  {item.type === 'submission' ? <Code2 className="w-4 h-4 text-green-400" /> : <MessageSquare className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate group-hover:text-white/90 transition-colors">{item.title}</p>
                  <p className="text-[10px] text-white/50">{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                {item.type === 'submission' && (
                  <span className={`badge text-[10px] border ${item.passed ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {item.passed ? '通过' : '未通过'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
