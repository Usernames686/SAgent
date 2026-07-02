'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore, useEditorStore } from '@/stores';
import { exerciseApi } from '@/lib/api';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Code2, Loader2, RefreshCw, XCircle } from 'lucide-react';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false });

interface Exercise {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: number;
  language?: string;
  template?: string;
  testCases?: Array<{ input: string; expectedOutput: string; isHidden?: boolean }>;
  hints?: string[];
  knowledgePointIds?: string[];
}

interface Submission {
  id: string;
  isPassed: boolean;
  passRate: number | string;
  attemptNumber: number;
  language: string;
  createdAt: string;
}

interface SubmissionResponse {
  items?: Submission[];
  total?: number;
}

const DIFFICULTY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '入门', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  2: { label: '简单', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  3: { label: '中等', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  4: { label: '困难', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  5: { label: '专家', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function normalizeLanguage(language?: string) {
  return (language || 'javascript').toLowerCase();
}

function asPercent(value: number | string | undefined) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!n) return '0%';
  return `${Math.round(n * 100)}%`;
}

export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const token = useAuthStore((s) => s.accessToken);
  const { setExerciseId, setCode, setLanguage } = useEditorStore();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSubmissions = useCallback(async () => {
    if (!id) return;
    setSubmissionsLoading(true);
    try {
      const res = await exerciseApi.submissions(id, { page: 1, limit: 8 }, token || undefined) as SubmissionResponse;
      setSubmissions(res.items || []);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [id, token]);

  const loadExercise = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await exerciseApi.getById(id, token || undefined) as Exercise;
      setExercise(data);
      setExerciseId(data.id);
      setLanguage(normalizeLanguage(data.language));
      setCode(data.template || '// 在此编写代码\n');
      await loadSubmissions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载练习失败');
    } finally {
      setLoading(false);
    }
  }, [id, token, setCode, setExerciseId, setLanguage, loadSubmissions]);

  useEffect(() => {
    loadExercise();
    return () => setExerciseId(null);
  }, [loadExercise, setExerciseId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  if (error || !exercise) {
    return (
      <div className="p-6">
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">加载失败：{error || '练习不存在'}</span>
          <Link href="/dashboard/exercises" className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">返回列表</Link>
        </div>
      </div>
    );
  }

  const diff = DIFFICULTY_MAP[exercise.difficulty] || DIFFICULTY_MAP[1];

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 flex flex-col border-r border-white/[0.06] min-w-0">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/dashboard/exercises" className="inline-flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/70 mb-1">
              <ArrowLeft className="w-3 h-3" /> 返回练习列表
            </Link>
            <h2 className="font-semibold text-white truncate">{exercise.title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`badge border ${diff.color}`}>{diff.label}</span>
            <span className="badge bg-white/10 text-gray-300">{normalizeLanguage(exercise.language)}</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <CodeEditor />
        </div>
      </div>

      <aside className="w-[360px] flex flex-col shrink-0 min-h-0">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><Code2 className="w-4 h-4 text-orange-400" /> 题目说明</h3>
          <p className="text-sm text-white/65 leading-relaxed whitespace-pre-wrap">{exercise.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(exercise.knowledgePointIds || []).map((kp) => (
              <span key={kp} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-300">{kp}</span>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="font-semibold text-white mb-3 text-sm">公开测试用例</h3>
          <div className="space-y-2 max-h-56 overflow-auto">
            {(exercise.testCases || []).filter((tc) => !tc.isHidden).length === 0 ? (
              <p className="text-xs text-white/45">暂无公开测试用例，提交时会执行后端测试。</p>
            ) : (
              (exercise.testCases || []).filter((tc) => !tc.isHidden).map((tc, i) => (
                <div key={i} className="rounded-lg bg-black/20 border border-white/[0.06] p-3">
                  <div className="text-[10px] text-white/45 mb-1">测试 {i + 1}</div>
                  <pre className="text-[11px] text-white/60 whitespace-pre-wrap">输入: {tc.input || '(空)'}</pre>
                  <pre className="text-[11px] text-green-400/75 whitespace-pre-wrap mt-1">期望: {tc.expectedOutput}</pre>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm">提交历史</h3>
            <button onClick={loadSubmissions} className="p-1.5 rounded-lg hover:bg-white/5 text-white/55 hover:text-white/70" title="刷新提交历史">
              {submissionsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-white/45 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              还没有提交记录
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((s) => (
                <div key={s.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex items-center gap-3">
                  {s.isPassed ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white/75">第 {s.attemptNumber} 次提交</span>
                      <span className={s.isPassed ? 'text-green-400 text-xs' : 'text-orange-400 text-xs'}>{asPercent(s.passRate)}</span>
                    </div>
                    <p className="text-[10px] text-white/45 truncate">{new Date(s.createdAt).toLocaleString('zh-CN')} · {s.language}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
