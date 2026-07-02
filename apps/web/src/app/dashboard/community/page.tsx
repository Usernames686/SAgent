'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { communityApi } from '@/lib/api';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Clock,
  Eye,
  Flame,
  Heart,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

interface Post {
  id: string;
  userId?: string;
  type: string;
  title: string;
  content: string;
  author?: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isPinned?: boolean;
  status?: string;
  createdAt: string;
}

interface CommentItem {
  id: string;
  userId?: string;
  content: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  discussion: '讨论',
  question: '求助',
  share: '分享',
  showcase: '展示',
};

const TYPE_COLORS: Record<string, string> = {
  discussion: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  question: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  share: 'bg-green-500/10 text-green-400 border-green-500/20',
  showcase: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const CATEGORIES = [
  { key: null, label: '全部' },
  { key: 'discussion', label: '讨论' },
  { key: 'question', label: '求助' },
  { key: 'share', label: '分享' },
  { key: 'showcase', label: '展示' },
];

const FALLBACK_POSTS: Post[] = [
  {
    id: 'fallback-1',
    type: 'share',
    title: '分享：用 Vibe Coding 一周完成一个 SaaS 后台',
    content:
      '全程用 AI 辅助编码，从需求拆解、组件搭建、接口联调到部署上线只用了 5 个工作日。AI 负责生成初稿，我负责架构边界、代码审查和体验打磨，效率提升很明显。',
    author: '独立开发者小李',
    tags: ['Vibe Coding', 'AI编程', 'SaaS', '效率'],
    likeCount: 215,
    commentCount: 89,
    viewCount: 5120,
    isPinned: true,
    createdAt: '2026-07-01T14:00:00Z',
  },
  {
    id: 'fallback-2',
    type: 'discussion',
    title: 'React Server Components 在实际项目中的落地经验',
    content:
      '从传统 SSR 迁移后首屏性能提升明显，但 Server/Client 组件边界、状态序列化和 Suspense 组织方式都需要重新设计。想和大家讨论中大型项目的拆分策略。',
    author: '前端架构师',
    tags: ['React', 'Server Components', '性能优化'],
    likeCount: 128,
    commentCount: 47,
    viewCount: 2340,
    createdAt: '2026-07-02T08:30:00Z',
  },
  {
    id: 'fallback-3',
    type: 'question',
    title: 'TypeScript 类型推断导致编译变慢，有人遇到过吗？',
    content:
      '项目升级后编译时间从 12 秒涨到 45 秒，排查发现复杂泛型工具类型触发了大量推断开销。skipLibCheck 和 incremental 效果有限，想听听大家的优化经验。',
    author: '类型体操爱好者',
    tags: ['TypeScript', '编译优化', '工程化'],
    likeCount: 64,
    commentCount: 32,
    viewCount: 1580,
    createdAt: '2026-07-02T06:15:00Z',
  },
  {
    id: 'fallback-4',
    type: 'showcase',
    title: '开源项目展示：Rust + WebAssembly 图像处理库',
    content:
      '支持裁剪、滤镜、水印等常用操作，在浏览器端处理大图比纯 JS 方案快很多。项目已发布到 npm，欢迎大家试用和贡献代码。',
    author: 'Rust布道者',
    tags: ['Rust', 'WebAssembly', '开源', '图像处理'],
    likeCount: 189,
    commentCount: 56,
    viewCount: 4200,
    createdAt: '2026-07-01T10:30:00Z',
  },
  {
    id: 'fallback-5',
    type: 'discussion',
    title: 'Monorepo 实践对比：Turborepo、Nx 和 pnpm workspaces',
    content:
      'Turborepo 的构建缓存和任务编排很轻，Nx 的依赖图和增量构建更强，pnpm workspaces 最透明。团队选型时需要根据项目规模和治理需求取舍。',
    author: 'DevOps工程师',
    tags: ['Monorepo', 'Turborepo', 'Nx', '工程化'],
    likeCount: 145,
    commentCount: 52,
    viewCount: 3100,
    createdAt: '2026-06-29T08:30:00Z',
  },
  {
    id: 'fallback-6',
    type: 'share',
    title: '5 个提升氛围编程效率的 VS Code 插件',
    content:
      'AI 补全、行内错误高亮、代码溯源、TS 错误美化和 API 调试工具组合使用，可以让“描述意图 -> 生成 -> 验证 -> 修正”的循环更顺滑。',
    author: '效率工具控',
    tags: ['VS Code', '工具', 'Vibe Coding', '插件'],
    likeCount: 203,
    commentCount: 74,
    viewCount: 5600,
    createdAt: '2026-06-28T13:15:00Z',
  },
];

const getAuthor = (post: Post) => post.author || (post.userId === 'system' ? 'SAgent 官方' : '社区用户');

function normalizePost(post: Partial<Post>): Post {
  return {
    id: String(post.id || crypto.randomUUID()),
    userId: post.userId,
    type: post.type || 'discussion',
    title: post.title || '未命名帖子',
    content: post.content || '',
    author: post.author,
    tags: Array.isArray(post.tags) ? post.tags : [],
    likeCount: Number(post.likeCount || 0),
    commentCount: Number(post.commentCount || 0),
    viewCount: Number(post.viewCount || 0),
    isPinned: Boolean(post.isPinned),
    status: post.status,
    createdAt: String(post.createdAt || new Date().toISOString()),
  };
}

function timeAgo(dateStr: string): string {
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

export default function CommunityPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newType, setNewType] = useState('discussion');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentItem[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await communityApi.listPosts({ limit: 50 }, accessToken || undefined);
      const list = res as { items?: Partial<Post>[] };
      const nextPosts = (list.items || []).map(normalizePost);
      setPosts(nextPosts.length > 0 ? nextPosts : FALLBACK_POSTS);
      if (nextPosts.length === 0) setError('本地数据库暂时没有社区内容，已展示示例内容。');
    } catch (err: unknown) {
      setPosts(FALLBACK_POSTS);
      setError(err instanceof Error ? `接口暂不可用，已展示示例内容：${err.message}` : '接口暂不可用，已展示示例内容。');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) fetchPosts();
  }, [hydrated, isAuthenticated, fetchPosts]);

  const filteredPosts = useMemo(() => {
    if (!categoryFilter) return posts;
    return posts.filter((p) => p.type === categoryFilter);
  }, [posts, categoryFilter]);

  const hotPosts = useMemo(
    () => [...posts].sort((a, b) => b.likeCount + b.commentCount * 2 - (a.likeCount + a.commentCount * 2)).slice(0, 5),
    [posts],
  );

  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => post.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [posts]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: posts.length,
      todayNew: posts.filter((p) => new Date(p.createdAt).toISOString().slice(0, 10) === today).length,
      activeUsers: new Set(posts.map(getAuthor)).size,
      weeklyHot: hotPosts[0]?.likeCount ?? 0,
    };
  }, [posts, hotPosts]);

  const handleCreatePost = useCallback(async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const tags = newTags.split(/[,\s，]+/).map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
    setSubmitting(true);
    try {
      const created = await communityApi.createPost(
        { type: newType, title: newTitle.trim(), content: newContent.trim(), tags },
        accessToken || undefined,
      );
      setPosts((prev) => [normalizePost(created as Partial<Post>), ...prev.filter((p) => !p.id.startsWith('fallback-'))]);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setShowNewPost(false);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, newContent, newTags, newTitle, newType]);

  const handleLike = useCallback(async (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likeCount: p.likeCount + 1 } : p)));
    if (postId.startsWith('fallback-')) return;
    try {
      await communityApi.like(postId, accessToken || undefined);
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount - 1) } : p)));
    }
  }, [accessToken]);

  const openComments = useCallback(async (postId: string) => {
    setExpandedPostId((prev) => (prev === postId ? null : postId));
    if (postId.startsWith('fallback-') || commentsByPost[postId]) return;
    try {
      const res = await communityApi.getComments(postId, 1, accessToken || undefined);
      const list = res as { items?: CommentItem[] };
      setCommentsByPost((prev) => ({ ...prev, [postId]: list.items || [] }));
    } catch {
      setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
    }
  }, [accessToken, commentsByPost]);

  const addComment = useCallback(async (postId: string) => {
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;
    if (postId.startsWith('fallback-')) {
      const localComment: CommentItem = { id: crypto.randomUUID(), userId: 'local', content, createdAt: new Date().toISOString() };
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), localComment] }));
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      return;
    }
    try {
      const created = await communityApi.addComment(postId, { content }, accessToken || undefined);
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), created as CommentItem] }));
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '评论发布失败');
    }
  }, [accessToken, commentDrafts]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Users className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">社区</h1>
            <p className="text-sm text-white/65">分享经验、互助学习、共同成长</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPosts} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] text-white/60 border border-white/[0.06] text-sm hover:bg-white/[0.08] transition-all">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button onClick={() => setShowNewPost((v) => !v)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-xl text-sm font-medium hover:bg-orange-500/30 transition-all">
            <Plus className="w-4 h-4" />
            发帖
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: '总帖子数', value: stats.total, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { icon: CalendarDays, label: '今日新增', value: stats.todayNew, color: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: UserCheck, label: '活跃作者', value: stats.activeUsers, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Flame, label: '最高热度', value: stats.weeklyHot, color: 'text-red-400', bg: 'bg-red-500/10' },
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key ?? 'all'}
            onClick={() => setCategoryFilter(cat.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              categoryFilter === cat.key
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {showNewPost && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['discussion', 'question', 'share', 'showcase'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${newType === t ? TYPE_COLORS[t] : 'bg-white/5 text-white/65 border-transparent'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="帖子标题" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 placeholder:text-white/30 focus:border-orange-500/30 focus:outline-none" />
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="分享你的想法..." rows={4} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 placeholder:text-white/30 focus:border-orange-500/30 focus:outline-none resize-none" />
          <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="标签，用空格或逗号分隔，例如 Vibe Coding, React" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 placeholder:text-white/30 focus:border-orange-500/30 focus:outline-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewPost(false)} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors">取消</button>
            <button onClick={handleCreatePost} disabled={submitting || !newTitle.trim() || !newContent.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/30 disabled:opacity-40 transition-all">
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              发布
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_18rem] gap-6">
          <div className="space-y-4 min-w-0">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 text-white/40">该分类下暂无帖子</div>
            ) : (
              filteredPosts.map((post) => {
                const author = getAuthor(post);
                const comments = commentsByPost[post.id] || [];
                return (
                  <div key={post.id} className="glass rounded-2xl p-5 hover:border-orange-500/20 transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${TYPE_COLORS[post.type] || 'bg-white/5 text-white/65 border-white/10'}`}>
                        {TYPE_LABELS[post.type] || post.type}
                      </span>
                      {post.isPinned && <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-300 border border-orange-500/20">置顶</span>}
                      <span className="text-[11px] text-white/40 ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-white mb-2 group-hover:text-orange-300 transition-colors">{post.title}</h3>
                    <p className="text-sm text-white/55 mb-3 line-clamp-3 leading-relaxed whitespace-pre-line">{post.content}</p>

                    {post.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        {post.tags.map((tag) => (
                          <button key={tag} onClick={() => setCategoryFilter(null)} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] text-white/50 border border-white/[0.06]">
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-white/[0.04] pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-600/30 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-orange-300">{author[0]}</span>
                        </div>
                        <span className="text-xs text-white/50">{author}</span>
                      </div>
                      <div className="flex items-center gap-4 text-white/40">
                        <button onClick={() => handleLike(post.id)} className="flex items-center gap-1 hover:text-red-400 transition-colors">
                          <Heart className="w-3.5 h-3.5" />
                          <span className="text-xs">{post.likeCount}</span>
                        </button>
                        <button onClick={() => openComments(post.id)} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-xs">{post.commentCount}</span>
                        </button>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs">{post.viewCount}</span>
                        </span>
                      </div>
                    </div>

                    {expandedPostId === post.id && (
                      <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-3 space-y-3">
                        <div className="space-y-2">
                          {comments.length === 0 ? (
                            <p className="text-xs text-white/35">暂无评论，来补充一个观点吧。</p>
                          ) : (
                            comments.map((comment) => (
                              <div key={comment.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                                <p className="text-xs text-white/70 whitespace-pre-line">{comment.content}</p>
                                <p className="mt-1 text-[10px] text-white/30">{timeAgo(comment.createdAt)}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={commentDrafts[post.id] || ''}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="写评论..."
                            className="min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-white/75 placeholder:text-white/30 focus:border-orange-500/30 focus:outline-none"
                          />
                          <button onClick={() => addComment(post.id)} className="rounded-lg bg-orange-500/20 px-3 py-2 text-xs font-medium text-orange-300 hover:bg-orange-500/30">
                            发送
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-4 min-w-0">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white">热门帖子</h3>
              </div>
              <div className="space-y-3">
                {hotPosts.map((post, idx) => (
                  <button key={post.id} onClick={() => openComments(post.id)} className="w-full flex gap-3 text-left group">
                    <span className={`text-sm font-bold w-5 shrink-0 ${idx === 0 ? 'text-red-400' : idx === 1 ? 'text-orange-400' : 'text-white/30'}`}>{idx + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-white/70 font-medium truncate group-hover:text-orange-300 transition-colors">{post.title}</span>
                      <span className="mt-1 flex items-center gap-2 text-[10px] text-white/35">
                        <Heart className="w-2.5 h-2.5" />{post.likeCount}
                        <Eye className="w-2.5 h-2.5" />{post.viewCount}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">热门标签</h3>
              </div>
              <div className="space-y-2">
                {trendingTags.map((tag) => (
                  <div key={tag.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-3 h-3 text-white/30 shrink-0" />
                      <span className="text-xs text-white/60 truncate">{tag.name}</span>
                    </div>
                    <span className="text-[10px] text-white/25 shrink-0 ml-2">{tag.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
