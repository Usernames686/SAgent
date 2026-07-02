'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { exerciseApi } from '@/lib/api';
import { AlertCircle, ArrowRight, CheckCircle, Clock, Code2, Filter, Loader2 } from 'lucide-react';

interface Exercise {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: number;
  language?: string;
  knowledgePointIds?: string[];
  testCases?: unknown[];
  stats?: Record<string, unknown>;
}

interface ExerciseListResponse {
  items?: Exercise[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const DIFFICULTY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '入门', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  2: { label: '简单', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  3: { label: '中等', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  4: { label: '困难', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  5: { label: '专家', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function getDifficulty(difficulty: number) {
  return DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP[1];
}

function normalizeLanguage(language?: string) {
  if (!language) return 'JavaScript';
  if (language.toLowerCase() === 'javascript') return 'JavaScript';
  if (language.toLowerCase() === 'typescript') return 'TypeScript';
  return language;
}

export default function ExercisesPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(0);
  const [langFilter, setLangFilter] = useState('all');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await exerciseApi.list(
        {
          page: 1,
          limit: 100,
          difficulty: filter > 0 ? filter : undefined,
          language: langFilter !== 'all' ? langFilter.toLowerCase() : undefined,
        },
        accessToken || undefined,
      ) as ExerciseListResponse;
      setExercises(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载练习失败');
      setExercises([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, langFilter]);

  useEffect(() => {
    if (hydrated && isAuthenticated) fetchExercises();
  }, [hydrated, isAuthenticated, fetchExercises]);

  const availableLanguages = useMemo(() => {
    const langs = new Set(exercises.map((ex) => normalizeLanguage(ex.language)));
    return ['all', ...Array.from(langs).sort()];
  }, [exercises]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="p-6 pt-2 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">编程练习</h1>
          <p className="text-gray-300 text-sm">从后端题库选择练习，运行并提交代码验证</p>
        </div>
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-orange-400" />
          <span className="text-sm text-gray-300">{total} 道题目</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
          <Filter className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-xs text-gray-300">难度:</span>
        </div>
        {[0, 1, 2, 3, 4, 5].map(d => (
          <button key={d} onClick={() => setFilter(d)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === d ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            {d === 0 ? '全部' : getDifficulty(d).label}
          </button>
        ))}
        <div className="w-px h-6 bg-white/10 mx-1" />
        <span className="text-xs text-gray-300 self-center">语言:</span>
        {availableLanguages.map(l => (
          <button key={l} onClick={() => setLangFilter(l)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${langFilter === l ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            {l === 'all' ? '全部' : l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : error ? (
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">加载失败：{error}</span>
          <button onClick={fetchExercises} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">重试</button>
        </div>
      ) : exercises.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Code2 className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">题库暂无可用练习</h3>
          <p className="text-sm text-white/55">后端没有 published 状态的题目时，这里会保持空状态。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises.map(ex => {
            const diff = getDifficulty(ex.difficulty);
            const stats = ex.stats || {};
            const attempts = Number(stats.attempts || stats.submissions || 0);
            const passRate = Number(stats.passRate || 0);
            return (
              <Link key={ex.id} href={`/dashboard/exercises/${ex.id}`} className="glass rounded-xl p-5 hover:bg-white/[0.05] transition-all group block">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`badge border ${diff.color}`}>{diff.label}</span>
                    <span className="badge bg-white/10 text-gray-300">{normalizeLanguage(ex.language)}</span>
                  </div>
                  <span className="badge bg-accent-500/10 text-accent-400">{ex.type}</span>
                </div>
                <h3 className="font-semibold text-white mb-2 group-hover:text-accent-400 transition-colors">{ex.title}</h3>
                <p className="text-sm text-gray-300 mb-3 line-clamp-2">{ex.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(ex.knowledgePointIds || []).slice(0, 4).map((kp) => (
                    <span key={kp} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-300">{kp}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ex.testCases?.length || 0} 测试</span>
                    <span>{attempts} 次提交</span>
                    {passRate > 0 && <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{Math.round(passRate * 100)}% 通过</span>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
