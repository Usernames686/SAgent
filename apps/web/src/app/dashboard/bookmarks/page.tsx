'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { bookmarkApi } from '@/lib/api';
import {
  AlertCircle,
  Bookmark as BookmarkIcon,
  Code2,
  ExternalLink,
  FileText,
  Heart,
  Loader2,
  Palette,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from 'lucide-react';

interface BookmarkItem {
  id: string;
  targetId: string;
  targetType: string;
  title: string;
  note: string;
  createdAt: string;
}

const DEMO_BOOKMARKS: BookmarkItem[] = [
  { id: 'demo-bm-1', targetId: 'exercises/1', targetType: 'exercise', title: 'React 组件基础 - JSX 语法与 Props 传参练习', note: '入门必做，适合配合组件章节复习。', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'demo-bm-2', targetId: 'exercises/3', targetType: 'exercise', title: 'JavaScript 闭包 - 计数器函数实现', note: '面试高频，建议多写几遍。', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'demo-bm-3', targetId: 'kp/JS-008', targetType: 'knowledge_point', title: '闭包与作用域链 - 词法作用域深入理解', note: '配合闭包练习一起看。', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'demo-bm-4', targetId: 'kp/JS-011', targetType: 'knowledge_point', title: 'Promise 与 async/await 异步编程模型', note: '异步编程必读。', createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'demo-bm-5', targetId: 'article/react-server-components', targetType: 'article', title: 'React Server Components 深度解析', note: '理解新一代前端架构。', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'demo-bm-6', targetId: 'article/vibe-coding-paradigm', targetType: 'article', title: 'Vibe Coding：AI 时代的新型编程范式', note: '氛围编程重点资料。', createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 'demo-bm-7', targetId: 'vibe/JS-008', targetType: 'vibe', title: '氛围编程 - 闭包与作用域练习', note: '用自然语言驱动代码生成与调试。', createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: 'demo-bm-8', targetId: 'projects/portfolio-ai', targetType: 'project', title: 'AI 个人作品集项目实战', note: '适合做完整交付演练。', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
];

const TYPE_LABELS: Record<string, string> = {
  exercise: '练习',
  knowledge_point: '知识点',
  article: '文章',
  vibe: '氛围编程',
  project: '项目',
};

const TYPE_STYLES: Record<string, { color: string; bg: string; border: string; icon: typeof FileText }> = {
  exercise: { color: 'text-green-400', bg: 'bg-green-500/[0.08]', border: 'border-green-500/15', icon: Code2 },
  knowledge_point: { color: 'text-blue-400', bg: 'bg-blue-500/[0.08]', border: 'border-blue-500/15', icon: FileText },
  article: { color: 'text-purple-400', bg: 'bg-purple-500/[0.08]', border: 'border-purple-500/15', icon: FileText },
  vibe: { color: 'text-pink-400', bg: 'bg-pink-500/[0.08]', border: 'border-pink-500/15', icon: Palette },
  project: { color: 'text-orange-400', bg: 'bg-orange-500/[0.08]', border: 'border-orange-500/15', icon: Star },
};

const FILTERS = [null, 'exercise', 'knowledge_point', 'article', 'vibe', 'project'] as const;

function getTargetHref(item: BookmarkItem) {
  if (item.targetType === 'exercise') return '/dashboard/exercises';
  if (item.targetType === 'knowledge_point') return '/dashboard/knowledge';
  if (item.targetType === 'article') return '/dashboard/research';
  if (item.targetType === 'vibe') return '/dashboard/vibe';
  if (item.targetType === 'project') return '/dashboard/projects';
  return '/dashboard';
}

export default function BookmarksPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookmarkApi.list(undefined, accessToken || undefined);
      const items = Array.isArray(res) ? (res as BookmarkItem[]) : [];
      setBookmarks(items.length > 0 ? items : DEMO_BOOKMARKS);
      setUsingDemo(items.length === 0);
    } catch (err: unknown) {
      setBookmarks(DEMO_BOOKMARKS);
      setUsingDemo(true);
      setError(err instanceof Error ? `接口暂不可用，已展示示例收藏：${err.message}` : '接口暂不可用，已展示示例收藏。');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) fetchBookmarks();
  }, [hydrated, isAuthenticated, fetchBookmarks]);

  const filteredBookmarks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return bookmarks.filter((item) => {
      const matchType = !typeFilter || item.targetType === typeFilter;
      const matchKeyword = !keyword || `${item.title} ${item.note} ${item.targetId}`.toLowerCase().includes(keyword);
      return matchType && matchKeyword;
    });
  }, [bookmarks, query, typeFilter]);

  const stats = useMemo(() => {
    const byType = bookmarks.reduce<Record<string, number>>((acc, item) => {
      acc[item.targetType] = (acc[item.targetType] || 0) + 1;
      return acc;
    }, {});
    return {
      total: bookmarks.length,
      knowledge: byType.knowledge_point || 0,
      exercises: byType.exercise || 0,
      ai: (byType.vibe || 0) + (byType.article || 0),
    };
  }, [bookmarks]);

  const handleRemove = useCallback(async (item: BookmarkItem) => {
    setBookmarks((prev) => prev.filter((bm) => bm.id !== item.id));
    if (usingDemo) return;
    try {
      await bookmarkApi.remove({ targetId: item.targetId, targetType: item.targetType }, accessToken || undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除收藏失败');
      fetchBookmarks();
    }
  }, [accessToken, fetchBookmarks, usingDemo]);

  const importDemo = useCallback(async () => {
    setImporting(true);
    setError('');
    try {
      await Promise.all(DEMO_BOOKMARKS.map((item) => bookmarkApi.add({
        targetId: item.targetId,
        targetType: item.targetType,
        title: item.title,
        note: item.note,
      }, accessToken || undefined)));
      await fetchBookmarks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导入示例收藏失败');
    } finally {
      setImporting(false);
    }
  }, [accessToken, fetchBookmarks]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-500/10"><BookmarkIcon className="w-5 h-5 text-pink-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">我的收藏</h1>
            <p className="text-sm text-white/65">统一管理练习、知识点、文章、氛围编程和项目资料</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchBookmarks} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] text-white/60 border border-white/[0.06] text-sm hover:bg-white/[0.08] transition-all">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          {usingDemo && (
            <button onClick={importDemo} disabled={importing} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-300 text-sm font-medium hover:bg-orange-500/30 disabled:opacity-50 transition-all">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
              导入示例
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: '全部收藏', value: stats.total, icon: BookmarkIcon, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: '知识点', value: stats.knowledge, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '练习题', value: stats.exercises, icon: Code2, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'AI 资料', value: stats.ai, icon: Palette, color: 'text-purple-400', bg: 'bg-purple-500/10' },
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
            placeholder="搜索标题、备注或目标 ID"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white/80 placeholder:text-white/30 focus:border-orange-500/30 focus:outline-none"
          />
        </div>
      </div>

      {usingDemo && !error && (
        <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          本地数据库还没有收藏，当前展示示例内容；点击“导入示例”可写入本地数据库。
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
      ) : filteredBookmarks.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <BookmarkIcon className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">没有匹配的收藏</h3>
          <p className="text-sm text-white/55">换一个分类或搜索词试试。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredBookmarks.map((bm) => {
            const style = TYPE_STYLES[bm.targetType] || { color: 'text-white/65', bg: 'bg-white/[0.05]', border: 'border-white/[0.08]', icon: FileText };
            const Icon = style.icon;
            return (
              <div key={bm.id} className="glass rounded-2xl p-4 flex items-start gap-4 group hover:border-orange-500/20 transition-all">
                <div className={`w-11 h-11 rounded-xl ${style.bg} flex items-center justify-center shrink-0 border ${style.border}`}>
                  <Icon className={`w-5 h-5 ${style.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`badge text-[10px] ${style.bg} ${style.color} border ${style.border}`}>{TYPE_LABELS[bm.targetType] || bm.targetType}</span>
                    <span className="text-[10px] text-white/35">{new Date(bm.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <h3 className="font-medium text-white group-hover:text-orange-300 transition-colors mb-1 line-clamp-2">{bm.title || bm.targetId}</h3>
                  {bm.note && <p className="text-xs text-white/55 leading-relaxed line-clamp-2">{bm.note}</p>}
                  <p className="mt-2 text-[10px] text-white/25 truncate">{bm.targetId}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <a href={getTargetHref(bm)} className="p-2 rounded-lg bg-white/[0.04] hover:bg-orange-500/10 text-white/55 hover:text-orange-300 transition-all" title="打开">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-white/55 hover:text-red-400 transition-all" onClick={() => handleRemove(bm)} title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
