'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { evolutionApi } from '@/lib/api';
import { Activity, AlertCircle, Brain, CheckCircle, GitBranch, Loader2, Target, TrendingUp, Zap } from 'lucide-react';

interface TeachingStrategy {
  id: string;
  name: string;
  type: string;
  description: string;
  bestFor?: string[];
  bestForLevel?: string[];
  prompt?: string;
}

interface StrategyStat {
  strategyId: string;
  name: string;
  avgScore: number;
  bestFor: string;
}

interface EvolutionReport {
  totalVariants?: number;
  activeExperiments?: number;
  stableVariants?: number;
  recentLogs?: unknown[];
}

export default function EvolutionPage() {
  const router = useRouter();
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [strategies, setStrategies] = useState<TeachingStrategy[]>([]);
  const [stats, setStats] = useState<StrategyStat[]>([]);
  const [report, setReport] = useState<EvolutionReport | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [strategyRes, statRes, reportRes] = await Promise.all([
        evolutionApi.getStrategies(accessToken || undefined),
        evolutionApi.getStats(accessToken || undefined).catch(() => []),
        evolutionApi.getReport(accessToken || undefined).catch(() => null),
      ]);
      setStrategies((strategyRes as TeachingStrategy[]) || []);
      setStats((statRes as StrategyStat[]) || []);
      setReport((reportRes as EvolutionReport) || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载进化引擎失败');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [hydrated, isAuthenticated, router, loadData]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  const statById = new Map(stats.map((item) => [item.strategyId, item]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10"><Brain className="w-5 h-5 text-purple-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Evolution Agent</h1>
            <p className="text-sm text-white/65">系统自我进化 · 教学策略优化 · A/B 测试管理</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-secondary px-4 py-2 text-xs">刷新</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Brain, label: '教学策略', value: strategies.length, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { icon: TrendingUp, label: '平均分', value: stats.length ? Math.round(stats.reduce((sum, s) => sum + s.avgScore, 0) / stats.length) : 0, color: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: Target, label: '实验数', value: report?.activeExperiments ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Zap, label: '策略变体', value: report?.totalVariants ?? report?.stableVariants ?? 0, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        ].map((item) => (
          <div key={item.label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-sm text-gray-300">{item.label}</span>
            </div>
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="glass rounded-xl p-4 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="glass rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">教学策略</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : strategies.length === 0 ? (
          <p className="text-center text-white/50 py-8">暂无策略数据</p>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy) => {
              const strategyStat = statById.get(strategy.id);
              const expanded = selectedStrategy === strategy.id;
              return (
                <button
                  key={strategy.id}
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    expanded
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => setSelectedStrategy(expanded ? null : strategy.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-orange-400 bg-orange-500/10">{strategy.type}</span>
                        <span className="text-[10px] text-white/40">{strategy.id}</span>
                      </div>
                      <h3 className="font-medium text-white">{strategy.name}</h3>
                      <p className="text-sm text-gray-300 mt-1">{strategy.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-gray-300">平均分</div>
                      <div className="font-medium text-green-400">{strategyStat?.avgScore ?? 0}</div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg bg-white/5 p-3">
                        <div className="text-[10px] text-white/40 mb-1">适合风格</div>
                        <div className="text-xs text-white/70">{strategy.bestFor?.join(', ') || strategyStat?.bestFor || '-'}</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3">
                        <div className="text-[10px] text-white/40 mb-1">适合水平</div>
                        <div className="text-xs text-white/70">{strategy.bestForLevel?.join(', ') || '-'}</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3">
                        <div className="text-[10px] text-white/40 mb-1">提示词样例</div>
                        <div className="text-xs text-white/70 line-clamp-3">{strategy.prompt || '-'}</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">进化洞察</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="font-medium text-white">策略数据来自后端 Evolution Agent</p>
              <p className="text-sm text-gray-300">当前页面不再使用硬编码 localhost 请求。</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <Activity className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="font-medium text-white">A/B 实验管线已保留</p>
              <p className="text-sm text-gray-300">实验创建、审核、回滚仍由后端权限控制。</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <GitBranch className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-white">演示页已与主功能区分</p>
              <p className="text-sm text-gray-300">交互测验和测试页应作为开发演示入口，不承担正式业务闭环。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
