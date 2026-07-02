'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { badgeApi } from '@/lib/api';
import {
  AlertCircle,
  Award,
  Calendar,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
} from 'lucide-react';

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xpReward: number;
  isActive?: boolean;
}

interface UserBadgeItem {
  id: string;
  badgeId: string;
  earnedReason?: string;
  earnedAt: string;
  badge?: BadgeItem | null;
}

interface BadgeProgress {
  earned: number;
  total: number;
  percent: number;
}

type DisplayRarity = '普通' | '稀有' | '史诗' | '传说';
type DisplayCategory = '全部' | '学习' | '编码' | '社区' | '挑战' | '进化' | '氛围编程' | '综合';

const RARITY_LABELS: Record<string, DisplayRarity> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

const RARITY_STYLE: Record<DisplayRarity, string> = {
  普通: 'text-gray-300 border-gray-500/30 bg-gray-500/15',
  稀有: 'text-blue-300 border-blue-500/30 bg-blue-500/15',
  史诗: 'text-purple-300 border-purple-500/30 bg-purple-500/15',
  传说: 'text-amber-300 border-amber-500/30 bg-amber-500/15',
};

const CATEGORY_LABELS: Record<string, DisplayCategory> = {
  onboarding: '学习',
  study: '学习',
  knowledge: '学习',
  exercise: '编码',
  coding: '编码',
  community: '社区',
  challenge: '挑战',
  evolution: '进化',
  vibe: '氛围编程',
  achievement: '综合',
  general: '综合',
};

const CATEGORY_ICONS: Record<DisplayCategory, string> = {
  全部: '🏆',
  学习: '📚',
  编码: '💻',
  社区: '👥',
  挑战: '⚡',
  进化: '🧬',
  氛围编程: '🎨',
  综合: '✨',
};

const CATEGORY_TABS: DisplayCategory[] = ['全部', '学习', '编码', '社区', '挑战', '进化', '氛围编程', '综合'];

const FALLBACK_BADGES: BadgeItem[] = [
  { id: 'fallback-l1', icon: '🌱', name: '初学者之路', description: '完成第一个学习课程', rarity: 'common', category: 'study', xpReward: 50 },
  { id: 'fallback-l2', icon: '📖', name: '持续学习者', description: '连续 7 天登录学习', rarity: 'rare', category: 'study', xpReward: 150 },
  { id: 'fallback-c1', icon: '👋', name: 'Hello World', description: '编写并运行第一行代码', rarity: 'common', category: 'coding', xpReward: 30 },
  { id: 'fallback-c2', icon: '🔎', name: '代码审查专家', description: '审查 20 个 Pull Request', rarity: 'epic', category: 'coding', xpReward: 200 },
  { id: 'fallback-s1', icon: '🤝', name: '热心助人', description: '回答 10 个社区问题', rarity: 'common', category: 'community', xpReward: 80 },
  { id: 'fallback-t1', icon: '⚡', name: '挑战先锋', description: '完成第一个编程挑战', rarity: 'common', category: 'challenge', xpReward: 50 },
  { id: 'fallback-e1', icon: '🧬', name: '自适应学习者', description: '完成自适应学习路径', rarity: 'epic', category: 'evolution', xpReward: 300 },
  { id: 'fallback-v1', icon: '🎨', name: '氛围大师', description: '完成 100 次氛围编程', rarity: 'epic', category: 'vibe', xpReward: 200 },
];

function displayRarity(rarity: string): DisplayRarity {
  return RARITY_LABELS[rarity] || (['普通', '稀有', '史诗', '传说'].includes(rarity) ? rarity as DisplayRarity : '普通');
}

function displayCategory(category: string): DisplayCategory {
  return CATEGORY_LABELS[category] || (CATEGORY_TABS.includes(category as DisplayCategory) ? category as DisplayCategory : '综合');
}

export default function BadgesPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadgeItem[]>([]);
  const [progress, setProgress] = useState<BadgeProgress | null>(null);
  const [activeCategory, setActiveCategory] = useState<DisplayCategory>('全部');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [badgesRes, userBadgesRes, progressRes] = await Promise.all([
        badgeApi.list(undefined, accessToken || undefined),
        badgeApi.getMyBadges(accessToken || undefined),
        badgeApi.getProgress(accessToken || undefined).catch(() => null),
      ]);
      const nextBadges = Array.isArray(badgesRes) ? badgesRes as BadgeItem[] : [];
      setBadges(nextBadges.length > 0 ? nextBadges : FALLBACK_BADGES);
      setUserBadges(Array.isArray(userBadgesRes) ? userBadgesRes as UserBadgeItem[] : []);
      setProgress(progressRes as BadgeProgress | null);
      if (nextBadges.length === 0) setError('本地数据库暂时没有成就数据，已展示示例成就。');
    } catch (err: unknown) {
      setBadges(FALLBACK_BADGES);
      setUserBadges([]);
      setProgress(null);
      setError(err instanceof Error ? `接口暂不可用，已展示示例成就：${err.message}` : '接口暂不可用，已展示示例成就。');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) fetchData();
  }, [hydrated, isAuthenticated, fetchData]);

  const earnedByBadgeId = useMemo(() => new Map(userBadges.map((ub) => [ub.badgeId, ub])), [userBadges]);
  const earnedCount = progress?.earned ?? userBadges.length;
  const totalCount = progress?.total ?? badges.length;
  const percent = progress?.percent ?? (badges.length > 0 ? Math.round((earnedCount / badges.length) * 100) : 0);
  const totalXp = userBadges.reduce((sum, ub) => sum + (ub.badge?.xpReward || badges.find((b) => b.id === ub.badgeId)?.xpReward || 0), 0);

  const filteredBadges = useMemo(() => {
    if (activeCategory === '全部') return badges;
    return badges.filter((badge) => displayCategory(badge.category) === activeCategory);
  }, [activeCategory, badges]);

  const recentAchievements = useMemo(
    () => userBadges.filter((ub) => ub.badge).slice(0, 5),
    [userBadges],
  );

  const syncAchievements = useCallback(async () => {
    setSyncing(true);
    setError('');
    try {
      await badgeApi.seed(accessToken || undefined);
      await badgeApi.checkAndAward(
        {
          knowledgeCompleted: 1,
          exercisePassed: 1,
          streakDays: 1,
          vibeCount: 1,
          communityPosts: 1,
        },
        accessToken || undefined,
      ).catch(() => null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '同步成就失败');
    } finally {
      setSyncing(false);
    }
  }, [accessToken, fetchData]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">成就殿堂</h1>
            <p className="text-sm text-white/65">学习、编码、社区与氛围编程成长记录</p>
          </div>
        </div>
        <button onClick={syncAchievements} disabled={syncing} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 text-amber-300 rounded-xl text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 transition-all">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          同步成就
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: '已获得成就', value: earnedCount, icon: <Award className="w-5 h-5 text-emerald-400" /> },
          { label: '总成就数', value: totalCount, icon: <Star className="w-5 h-5 text-blue-400" /> },
          { label: '累计 XP', value: totalXp.toLocaleString(), icon: <Sparkles className="w-5 h-5 text-amber-400" /> },
          { label: '成就进度', value: `${percent}%`, icon: <TrendingUp className="w-5 h-5 text-purple-400" /> },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">{s.icon}</div>
            <div>
              <p className="text-xs text-white/50">{s.label}</p>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-white/55">整体解锁进度</span>
          <span className="text-sm text-amber-300">{earnedCount}/{totalCount}</span>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-700" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
            }`}
          >
            <span className="mr-1">{CATEGORY_ICONS[cat]}</span>
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_20rem] gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBadges.map((badge) => {
              const earned = earnedByBadgeId.get(badge.id);
              const rarity = displayRarity(badge.rarity);
              const category = displayCategory(badge.category);
              return (
                <div
                  key={badge.id}
                  className={`relative glass rounded-2xl p-5 border transition-all hover:bg-white/[0.07] ${
                    earned
                      ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'border-white/10 opacity-70 grayscale'
                  }`}
                >
                  {!earned && <Lock className="absolute right-4 top-4 h-4 w-4 text-white/30" />}
                  <div className="text-4xl mb-3">{badge.icon}</div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`font-bold text-base ${earned ? 'text-white' : 'text-white/55'}`}>{badge.name}</h3>
                      <p className="mt-1 text-sm text-white/45 leading-relaxed">{badge.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-lg border ${RARITY_STYLE[rarity]}`}>{rarity}</span>
                      <span className="text-xs px-2 py-1 rounded-lg bg-white/[0.04] text-white/45 border border-white/[0.06]">{CATEGORY_ICONS[category]} {category}</span>
                    </div>
                    <span className="text-xs text-amber-300 font-medium flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3 h-3" />+{badge.xpReward} XP
                    </span>
                  </div>
                  {earned ? (
                    <p className="text-xs text-emerald-300 mt-3 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(earned.earnedAt).toLocaleDateString('zh-CN')} 获得
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 mt-3">继续完成学习、编码或社区任务即可解锁。</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-300" />
                最近获得
              </h2>
              {recentAchievements.length === 0 ? (
                <p className="text-sm text-white/40">还没有获得成就，点一下“同步成就”可以检查当前进度。</p>
              ) : (
                <div className="space-y-4">
                  {recentAchievements.map((achievement, index) => (
                    <div key={achievement.id} className="flex items-center gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">
                          {achievement.badge?.icon}
                        </div>
                        {index < recentAchievements.length - 1 && <div className="w-px h-6 bg-white/10 mt-1" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{achievement.badge?.name}</p>
                        <p className="text-xs text-white/40">{new Date(achievement.earnedAt).toLocaleDateString('zh-CN')}</p>
                      </div>
                      <span className="text-xs text-amber-300 font-medium">+{achievement.badge?.xpReward || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">分类概览</h2>
              <div className="space-y-3">
                {CATEGORY_TABS.filter((cat) => cat !== '全部').map((cat) => {
                  const categoryBadges = badges.filter((badge) => displayCategory(badge.category) === cat);
                  if (categoryBadges.length === 0) return null;
                  const categoryEarned = categoryBadges.filter((badge) => earnedByBadgeId.has(badge.id)).length;
                  const categoryPercent = Math.round((categoryEarned / categoryBadges.length) * 100);
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className="w-full text-left">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-white/60">{CATEGORY_ICONS[cat]} {cat}</span>
                        <span className="text-white/35">{categoryEarned}/{categoryBadges.length}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${categoryPercent}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
