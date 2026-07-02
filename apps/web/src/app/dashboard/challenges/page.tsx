'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { exerciseApi } from '@/lib/api';
import { Loader2, Swords, Timer, Trophy, Zap, Lock, CheckCircle, Star, Flame, Target, AlertCircle } from 'lucide-react';

interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  language: string;
  tags?: string[];
  testCases?: unknown[];
  status?: string;
  createdAt: string;
}

const DIFFICULTY_MAP: Record<number, { label: string; color: string; xp: number }> = {
  1: { label: '简单', color: 'bg-green-500/10 text-green-400 border-green-500/20', xp: 50 },
  2: { label: '中等', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', xp: 100 },
  3: { label: '困难', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', xp: 200 },
  4: { label: '专家', color: 'bg-red-500/10 text-red-400 border-red-500/20', xp: 400 },
};

const LANG_COLORS: Record<string, string> = {
  javascript: 'bg-yellow-500/10 text-yellow-400',
  typescript: 'bg-blue-500/10 text-blue-400',
  css: 'bg-pink-500/10 text-pink-400',
  html: 'bg-orange-500/10 text-orange-400',
  python: 'bg-green-500/10 text-green-400',
};

export default function ChallengesPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null);

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await exerciseApi.list(
        { page, limit: 20, difficulty: difficultyFilter || undefined },
        accessToken || undefined,
      );
      const list = res as { items?: Exercise[]; total?: number };
      setExercises(list.items || []);
      setTotal(list.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, difficultyFilter, accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) fetchExercises();
  }, [hydrated, isAuthenticated, fetchExercises]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10"><Swords className="w-5 h-5 text-red-400" /></div>
        <div>
          <h1 className="text-xl font-bold text-white">编程挑战</h1>
          <p className="text-sm text-white/65">从简单到专家，逐级挑战</p>
        </div>
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2">
        {[null, 1, 2, 3, 4].map((d) => (
          <button
            key={d ?? 'all'}
            onClick={() => { setDifficultyFilter(d); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              difficultyFilter === d
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08]'
            }`}
          >
            {d === null ? '全部' : DIFFICULTY_MAP[d]?.label || `${d}星`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400"><AlertCircle className="w-4 h-4" />{error}</div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 text-white/55">暂无挑战题目</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises.map((ex) => {
            const diff = DIFFICULTY_MAP[ex.difficulty] || DIFFICULTY_MAP[1];
            return (
              <div key={ex.id} className="glass rounded-2xl p-5 hover:border-orange-500/20 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors">{ex.title}</h3>
                  <span className={`badge text-[10px] border ${diff.color}`}>{diff.label}</span>
                </div>
                <p className="text-xs text-white/65 mb-3 line-clamp-2">{ex.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge text-[10px] ${LANG_COLORS[ex.language] || 'bg-white/5 text-white/65'}`}>{ex.language}</span>
                  {ex.tags?.map((t, i) => (
                    <span key={i} className="badge bg-white/5 text-white/55 text-[10px]">{t}</span>
                  ))}
                  <span className="ml-auto text-[10px] text-orange-400/60 flex items-center gap-1"><Star className="w-3 h-3" />{diff.xp} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed">上一页</button>
          <span className="text-sm text-white/65">{page} / {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed">下一页</button>
        </div>
      )}
    </div>
  );
}
