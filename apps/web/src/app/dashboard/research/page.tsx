'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { bookmarkApi, historyApi, researchApi } from '@/lib/api';
import {
  AlertCircle,
  Bookmark,
  BookOpen,
  Clock,
  Eye,
  Heart,
  Loader2,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';

interface ResearchArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  level: string;
  author: string;
  views: number;
  likes: number;
  desc: string;
  tags: string[];
  content?: string;
  publishedAt: string;
}

interface ResearchListResponse {
  items: ResearchArticle[];
  total: number;
  categories: string[];
}

function levelClass(level: string) {
  if (level === '入门') return 'bg-green-500/10 text-green-400';
  if (level === '中级') return 'bg-blue-500/10 text-blue-400';
  if (level === '高级') return 'bg-purple-500/10 text-purple-400';
  return 'bg-orange-500/10 text-orange-400';
}

function formatDate(value: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function ResearchPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [articles, setArticles] = useState<ResearchArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ResearchArticle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const loadBookmarks = useCallback(async () => {
    try {
      const res = await bookmarkApi.list('research', accessToken || undefined);
      const items = Array.isArray(res)
        ? res as Array<{ targetId: string }>
        : (res as { items?: Array<{ targetId: string }> })?.items || [];
      setBookmarkedIds(new Set(items.map((item) => item.targetId)));
    } catch {
      setBookmarkedIds(new Set());
    }
  }, [accessToken]);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await researchApi.list(
        { category: categoryFilter, search: search.trim() || undefined },
        accessToken || undefined,
      ) as ResearchListResponse;
      setArticles(res.items || []);
      setCategories(res.categories || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载研究文章失败');
      setArticles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, categoryFilter, search]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    loadBookmarks();
  }, [hydrated, isAuthenticated, loadBookmarks]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    loadArticles();
  }, [hydrated, isAuthenticated, loadArticles]);

  const categoryOptions = useMemo(() => ['all', ...categories], [categories]);

  const toggleBookmark = async (article: ResearchArticle) => {
    if (bookmarkingId !== null) return;
    setBookmarkingId(article.id);
    const next = new Set(bookmarkedIds);
    try {
      if (bookmarkedIds.has(article.id)) {
        await bookmarkApi.remove({ targetId: article.id, targetType: 'research' }, accessToken || undefined);
        next.delete(article.id);
      } else {
        await bookmarkApi.add(
          { targetId: article.id, targetType: 'research', title: article.title, note: article.desc },
          accessToken || undefined,
        );
        next.add(article.id);
      }
      setBookmarkedIds(next);
    } finally {
      setBookmarkingId(null);
    }
  };

  const openDetail = async (article: ResearchArticle) => {
    setSelectedArticle(article);
    setDetailLoading(true);
    historyApi.record(
      { targetId: article.id, targetType: 'research', title: article.title },
      accessToken || undefined,
    ).catch(() => {});
    try {
      const detail = await researchApi.get(article.id, accessToken || undefined) as ResearchArticle;
      setSelectedArticle(detail);
    } catch {
      setSelectedArticle(article);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="p-6 pt-2 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">深度研究</h1>
        <p className="text-gray-300 text-sm">技术文章与深度解析 · 来自后端内容接口</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center gap-3 px-4 py-2.5 glass rounded-xl">
          <Search className="w-4 h-4 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索技术文章..."
            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
          {categoryOptions.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${categoryFilter === c ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              {c === 'all' ? '全部' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 text-sm text-gray-300">
        <span>共 {total} 篇文章</span>
        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />真实接口</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : error ? (
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">加载失败：{error}</span>
          <button onClick={loadArticles} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">重试</button>
        </div>
      ) : articles.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <BookOpen className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">没有匹配的研究文章</h3>
          <p className="text-sm text-white/55">换个关键词或分类试试。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map(article => (
            <button
              type="button"
              key={article.id}
              onClick={() => openDetail(article)}
              className="glass rounded-xl p-5 hover:bg-white/[0.05] transition-all cursor-pointer group text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="badge bg-white/10 text-gray-300">{article.category}</span>
                  <span className={`badge ${levelClass(article.level)}`}>{article.level}</span>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleBookmark(article);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleBookmark(article);
                    }
                  }}
                  aria-disabled={bookmarkingId === article.id}
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${bookmarkedIds.has(article.id) ? 'text-orange-400' : 'text-gray-300 hover:text-orange-400'} ${bookmarkingId === article.id ? 'opacity-50 pointer-events-none' : ''}`}
                  title={bookmarkedIds.has(article.id) ? '取消收藏' : '收藏文章'}
                >
                  <Bookmark className="w-4 h-4" fill={bookmarkedIds.has(article.id) ? 'currentColor' : 'none'} />
                </span>
              </div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">{article.title}</h3>
              <p className="text-xs text-gray-300 mb-3 line-clamp-2">{article.desc}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {article.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-300">{tag}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-300 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                  <span className="truncate">{article.author}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.views.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-red-400"><Heart className="w-3 h-3" />{article.likes}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[82vh] overflow-auto glass rounded-2xl border border-white/[0.08]">
            <div className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge bg-white/10 text-gray-300">{selectedArticle.category}</span>
                  <span className={`badge ${levelClass(selectedArticle.level)}`}>{selectedArticle.level}</span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedArticle.title}</h2>
                <p className="text-xs text-white/50 mt-1">
                  {selectedArticle.author} · {selectedArticle.readTime} · {formatDate(selectedArticle.publishedAt)}
                </p>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {detailLoading ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
              ) : (
                <>
                  <p className="text-sm text-white/65 mb-5">{selectedArticle.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {selectedArticle.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 bg-white/5 rounded-lg text-[11px] text-white/60">{tag}</span>
                    ))}
                  </div>
                  <article className="space-y-4 text-sm leading-7 text-white/75">
                    {(selectedArticle.content || '暂无正文内容。').split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </article>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
