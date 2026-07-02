'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { historyApi } from '@/lib/api';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Code2,
  ExternalLink,
  Eye,
  History as HistoryIcon,
  Loader2,
  MessageSquare,
  Palette,
  RefreshCw,
  Route,
  Search,
  Trash2,
} from 'lucide-react';

interface HistoryItem {
  id: string;
  targetId: string;
  targetType: string;
  title: string;
  visitCount: number;
  lastVisitedAt: string;
  createdAt: string;
}

const DEMO_HISTORY: HistoryItem[] = [
  { id: 'demo-h-1', targetId: 'vibe/JS-008', targetType: 'vibe', title: '氛围编程 - 闭包与作用域（Phase 1）', visitCount: 12, lastVisitedAt: new Date(Date.now() - 600000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 'demo-h-2', targetId: 'kp/JS-008', targetType: 'knowledge_point', title: '闭包与作用域链 - 词法作用域与闭包陷阱', visitCount: 8, lastVisitedAt: new Date(Date.now() - 1200000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 'demo-h-3', targetId: 'chat/session-1', targetType: 'chat', title: 'AI 辅导 - 闭包的 for 循环陷阱如何解决？', visitCount: 3, lastVisitedAt: new Date(Date.now() - 1500000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'demo-h-4', targetId: 'exercises/1', targetType: 'exercise', title: 'React 组件基础 - JSX 语法与 Props 传参练习', visitCount: 5, lastVisitedAt: new Date(Date.now() - 1800000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'demo-h-5', targetId: 'kp/JS-011', targetType: 'knowledge_point', title: 'Promise 与 async/await - 异步编程全面掌握', visitCount: 6, lastVisitedAt: new Date(Date.now() - 2700000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 'demo-h-6', targetId: 'vibe/FE-005', targetType: 'vibe', title: '氛围编程 - Flexbox 布局（Phase 2）', visitCount: 6, lastVisitedAt: new Date(Date.now() - 5400000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 18).toISOString() },
  { id: 'demo-h-7', targetId: 'article/nextjs15-turbopack', targetType: 'article', title: 'Next.js 15 + Turbopack 实战：零配置高性能开发体验', visitCount: 3, lastVisitedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: 'demo-h-8', targetId: 'path/frontend-vibe', targetType: 'path', title: '前端氛围编程学习路径', visitCount: 4, lastVisitedAt: new Date(Date.now() - 86400000 * 2).toISOString(), createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: 'demo-h-9', targetId: 'article/vibe-coding-paradigm', targetType: 'article', title: 'Vibe Coding：AI 时代的新型编程范式与学习路径', visitCount: 4, lastVisitedAt: new Date(Date.now() - 86400000 * 3).toISOString(), createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
];

const TYPE_LABELS: Record<string, string> = {
  exercise: '编程练习',
  knowledge_point: '知识点',
  article: '文章',
  vibe: '氛围编程',
  chat: 'AI 辅导',
  path: '学习路径',
};

const TYPE_STYLES: Record<string, { color: string; bg: string; border: string; icon: typeof Code2 }> = {
  exercise: { color: 'text-green-400', bg: 'bg-green-500/[0.08]', border: 'border-green-500/15', icon: Code2 },
  knowledge_point: { color: 'text-blue-400', bg: 'bg-blue-500/[0.08]', border: 'border-blue-500/15', icon: BarChart3 },
  article: { color: 'text-purple-400', bg: 'bg-purple-500/[0.08]', border: 'border-purple-500/15', icon: Palette },
  vibe: { color: 'text-pink-400', bg: 'bg-pink-500/[0.08]', border: 'border-pink-500/15', icon: Palette },
  chat: { color: 'text-cyan-400', bg: 'bg-cyan-500/[0.08]', border: 'border-cyan-500/15', icon: MessageSquare },
  path: { color: 'text-orange-400', bg: 'bg-orange-500/[0.08]', border: 'border-orange-500/15', icon: Route },
};

const FILTERS = [null, 'vibe', 'knowledge_point', 'exercise', 'article', 'chat', 'path'] as const;

function getTargetHref(item: HistoryItem) {
  if (item.targetType === 'exercise') return '/dashboard/exercises';
  if (item.targetType === 'knowledge_point') return '/dashboard/knowledge';
  if (item.targetType === 'article') return '/dashboard/research';
  if (item.targetType === 'vibe') return '/dashboard/vibe';
  if (item.targetType === 'chat') return '/dashboard/chat';
  if (item.targetType === 'path') return '/dashboard/learn';
  return '/dashboard';
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function HistoryPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await historyApi.list({ limit: 100 }, accessToken || undefined);
      const list = res as { items?: HistoryItem[] };
      const items = list.items || [];
      setHistory(items.length > 0 ? items : DEMO_HISTORY);
      setUsingDemo(items.length === 0);
    } catch (err: unknown) {
      setHistory(DEMO_HISTORY);
      setUsingDemo(true);
      setError(err instanceof Error ? `接口暂不可用，已展示示例历史：${err.message}` : '接口暂不可用，已展示示例历史。');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) fetchHistory();
  }, [hydrated, isAuthenticated, fetchHistory]);

  const filteredHistory = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return history.filter((item) => {
      const matchType = !typeFilter || item.targetType === typeFilter;
      const matchKeyword = !keyword || `${item.title} ${item.targetId}`.toLowerCase().includes(keyword);
      return matchType && matchKeyword;
    });
  }, [history, query, typeFilter]);

  const stats = useMemo(() => {
    const totalVisits = history.reduce((sum, item) => sum + item.visitCount, 0);
    const today = new Date().toISOString().slice(0, 10);
    return {
      records: history.length,
      totalVisits,
      today: history.filter((item) => new Date(item.lastVisitedAt).toISOString().slice(0, 10) === today).length,
      vibe: history.filter((item) => item.targetType === 'vibe').length,
    };
  }, [history]);

  const handleClear = useCallback(async () => {
    setError('');
    if (usingDemo) {
      setHistory([]);
      setUsingDemo(false);
      return;
    }
    try {
      await historyApi.clear(typeFilter || undefined, accessToken || undefined);
      setHistory((prev) => prev.filter((item) => typeFilter && item.targetType !== typeFilter));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '清除历史失败');
    }
  }, [accessToken, typeFilter, usingDemo]);

  const importDemo = useCallback(async () => {
    setImporting(true);
    setError('');
    try {
      await Promise.all(DEMO_HISTORY.map((item) => historyApi.record({
        targetId: item.targetId,
        targetType: item.targetType,
        title: item.title,
      }, accessToken || undefined)));
      await fetchHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导入示例历史失败');
    } finally {
      setImporting(false);
    }
  }, [accessToken, fetchHistory]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10"><HistoryIcon className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">浏览历史</h1>
            <p className="text-sm text-white/65">按时间线回到最近学习、练习、AI 辅导和氛围编程内容</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchHistory} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] text-white/60 border border-white/[0.06] text-sm hover:bg-white/[0.08] transition-all">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          {usingDemo && (
            <button onClick={importDemo} disabled={importing} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-300 text-sm font-medium hover:bg-orange-500/30 disabled:opacity-50 transition-all">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <HistoryIcon className="w-4 h-4" />}
              导入示例
            </button>
          )}
          {history.length > 0 && (
            <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-300 text-sm hover:bg-red-500/20 transition-all">
              <Trash2 className="w-4 h-4" />
              {typeFilter ? `清除${TYPE_LABELS[typeFilter] || typeFilter}` : '清除历史'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: '历史记录', value: stats.records, icon: HistoryIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: '累计访问', value: stats.totalVisits, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '今日回看', value: stats.today, icon: Calendar, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: '氛围编程', value: stats.vibe, icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-white/50">{s.label}</p>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((t) => (
            <button
              key={t ?? 'all'}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                typeFilter === t
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              {t === null ? '全部' : TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题或目标 ID"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white/80 placeholder:text-white/30 focus:border-orange-500/30 focus:outline-none"
          />
        </div>
      </div>

      {usingDemo && !error && (
        <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          本地数据库还没有浏览记录，当前展示示例时间线；点击“导入示例”可写入本地数据库。
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
      ) : filteredHistory.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <HistoryIcon className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">没有匹配的历史记录</h3>
          <p className="text-sm text-white/55">换一个分类或搜索词试试。</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-4">
          <div className="space-y-1">
            {filteredHistory.map((item, index) => {
              const style = TYPE_STYLES[item.targetType] || { color: 'text-white/65', bg: 'bg-white/[0.05]', border: 'border-white/[0.08]', icon: HistoryIcon };
              const Icon = style.icon;
              return (
                <div key={item.id} className="relative flex gap-4 rounded-xl p-3 hover:bg-white/[0.035] transition-all group">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-11 h-11 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${style.color}`} />
                    </div>
                    {index < filteredHistory.length - 1 && <div className="mt-2 h-8 w-px bg-white/[0.08]" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`badge text-[10px] ${style.bg} ${style.color} border ${style.border}`}>{TYPE_LABELS[item.targetType] || item.targetType}</span>
                      <span className="text-[10px] text-white/35">{timeAgo(item.lastVisitedAt)}</span>
                    </div>
                    <h3 className="font-medium text-white group-hover:text-orange-300 transition-colors line-clamp-2">{item.title || item.targetId}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-white/45">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.visitCount} 次访问</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.lastVisitedAt).toLocaleDateString('zh-CN')}</span>
                      <span className="truncate text-white/25">{item.targetId}</span>
                    </div>
                  </div>
                  <a href={getTargetHref(item)} className="self-start p-2 rounded-lg bg-white/[0.04] hover:bg-orange-500/10 text-white/55 hover:text-orange-300 transition-all" title="打开">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
