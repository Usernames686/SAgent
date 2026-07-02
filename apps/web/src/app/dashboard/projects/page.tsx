'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { projectApi } from '@/lib/api';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  Clipboard,
  Clock,
  ExternalLink,
  GitBranch,
  GitFork,
  History,
  Loader2,
  Percent,
  Rocket,
  Send,
  Star,
  Target,
  Users,
} from 'lucide-react';

interface ProjectTask {
  id: string;
  title: string;
  description: string;
  acceptance: string[];
}

interface ProjectSubmission {
  id: string;
  nodeId: string;
  repositoryUrl?: string | null;
  previewUrl?: string | null;
  notes?: string | null;
  checklist: string[];
  score: number;
  status: 'submitted' | 'accepted';
  createdAt: string;
}

interface ProjectItem {
  nodeId: string;
  name: string;
  module: string;
  description: string;
  difficulty: number;
  estimatedMinutes: number;
  skills?: string[];
  prerequisites?: string[];
  theme: string;
  deliverables: string[];
  tasks: ProjectTask[];
  submissionCount: number;
  latestSubmission: ProjectSubmission | null;
  projectStatus: 'not_started' | 'submitted' | 'accepted';
  masteryScore: number;
}

interface ProjectListResponse {
  items: ProjectItem[];
  total: number;
  summary: { submitted: number; accepted: number };
}

interface OpenSourceImportTask {
  id: string;
  title: string;
  description: string;
  acceptance: string[];
}

interface OpenSourceReference {
  id: string;
  name: string;
  sourceUrl: string;
  license: string;
  licenseRisk: 'permissive' | 'copyleft' | 'reference-only';
  category: string;
  summary: string;
  applicableNodeIds: string[];
  transferableFeatures: string[];
  integrationNotes: string[];
  importTasks: OpenSourceImportTask[];
}

interface OpenSourceCatalogResponse {
  items: OpenSourceReference[];
  total: number;
  summary: { permissive: number; copyleft: number; referenceOnly: number };
}

const COLOR_BY_INDEX = [
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-indigo-500 to-violet-500',
  'from-orange-500 to-amber-500',
  'from-pink-500 to-rose-500',
];

function levelFromDifficulty(difficulty: number) {
  if (difficulty <= 2) return '入门';
  if (difficulty === 3) return '中级';
  return '高级';
}

function statusLabel(status: ProjectItem['projectStatus']) {
  if (status === 'accepted') return '已验收';
  if (status === 'submitted') return '已提交';
  return '未开始';
}

function statusClass(status: ProjectItem['projectStatus']) {
  if (status === 'accepted') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (status === 'submitted') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return 'bg-white/[0.04] text-white/50 border-white/[0.06]';
}

function licenseRiskClass(risk: OpenSourceReference['licenseRisk']) {
  if (risk === 'permissive') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (risk === 'copyleft') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-white/[0.04] text-white/55 border-white/[0.08]';
}

function licenseRiskLabel(risk: OpenSourceReference['licenseRisk']) {
  if (risk === 'permissive') return '可借鉴';
  if (risk === 'copyleft') return '谨慎';
  return '仅参考';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ProjectsPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [summary, setSummary] = useState<ProjectListResponse['summary'] | null>(null);
  const [openSourceRefs, setOpenSourceRefs] = useState<OpenSourceReference[]>([]);
  const [openSourceSummary, setOpenSourceSummary] = useState<OpenSourceCatalogResponse['summary'] | null>(null);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await projectApi.list(accessToken || undefined) as ProjectListResponse;
      setProjects(res.items || []);
      setSummary(res.summary || null);
      setSelectedNodeId((current) => current || res.items?.[0]?.nodeId || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载项目失败');
      setProjects([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) loadProjects();
  }, [hydrated, isAuthenticated, loadProjects]);

  const filtered = useMemo(() => (
    filter === 'all' ? projects : projects.filter((project) => levelFromDifficulty(project.difficulty) === filter)
  ), [filter, projects]);

  const selectedProject = filtered.find((project) => project.nodeId === selectedNodeId) || filtered[0] || null;
  const completionPercent = selectedProject?.tasks.length
    ? Math.round((checkedTasks.size / selectedProject.tasks.length) * 100)
    : 0;
  const nextTask = selectedProject?.tasks.find((task) => !checkedTasks.has(task.id)) || null;

  useEffect(() => {
    if (!selectedProject) return;
    const latest = selectedProject.latestSubmission;
    setCheckedTasks(new Set(latest?.checklist || []));
    setRepositoryUrl(latest?.repositoryUrl || '');
    setPreviewUrl(latest?.previewUrl || '');
    setNotes(latest?.notes || '');
    setSubmitError('');
  }, [selectedProject?.nodeId]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !selectedProject) return;
    let cancelled = false;
    projectApi.openSourceCatalog(selectedProject.nodeId, accessToken || undefined)
      .then((res) => {
        if (cancelled) return;
        const catalog = res as OpenSourceCatalogResponse;
        setOpenSourceRefs(catalog.items || []);
        setOpenSourceSummary(catalog.summary || null);
      })
      .catch(() => {
        if (!cancelled) {
          setOpenSourceRefs([]);
          setOpenSourceSummary(null);
        }
      });
    return () => { cancelled = true; };
  }, [accessToken, hydrated, isAuthenticated, selectedProject?.nodeId]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !selectedProject) return;
    let cancelled = false;
    projectApi.submissions(selectedProject.nodeId, accessToken || undefined)
      .then((res) => {
        if (cancelled) return;
        const list = res as { items?: ProjectSubmission[] };
        setSubmissions(list.items || []);
      })
      .catch(() => {
        if (!cancelled) setSubmissions([]);
      });
    return () => { cancelled = true; };
  }, [accessToken, hydrated, isAuthenticated, selectedProject?.nodeId]);

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const submitProject = async () => {
    if (!selectedProject || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await projectApi.submit(
        selectedProject.nodeId,
        {
          repositoryUrl: repositoryUrl.trim() || undefined,
          previewUrl: previewUrl.trim() || undefined,
          notes: notes.trim() || undefined,
          checklist: Array.from(checkedTasks),
        },
        accessToken || undefined,
      ) as { project: ProjectItem; submission: ProjectSubmission };
      setProjects((items) => items.map((item) => item.nodeId === selectedProject.nodeId ? res.project : item));
      setSubmissions((items) => [res.submission, ...items]);
      setSelectedNodeId(res.project.nodeId);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '提交项目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const copyProjectPrompt = async () => {
    if (!selectedProject) return;
    const prompt = [
      `我要完成项目实战：${selectedProject.name}（${selectedProject.nodeId}）`,
      `项目主题：${selectedProject.theme}`,
      `项目描述：${selectedProject.description}`,
      `交付物：${selectedProject.deliverables.join('、')}`,
      '请按以下任务拆成可执行步骤：',
      ...selectedProject.tasks.map((task, index) => `${index + 1}. ${task.title}：${task.description}；验收：${task.acceptance.join(' / ')}`),
      '请输出：页面结构、数据模型、关键组件、接口契约、验收清单和第一轮实现代码。',
    ].join('\n');
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1800);
    setNotes((current) => current.trim() ? current : `已复制项目 Prompt，可粘贴到 AI 辅导或氛围编程继续推进。\n\n${prompt}`);
  };

  const importOpenSourceReference = (reference: OpenSourceReference) => {
    const taskLines = reference.importTasks
      .map((task) => `- ${task.title}: ${task.acceptance.join(' / ')}`)
      .join('\n');
    const importNote = [
      `参考开源项目：${reference.name}`,
      `来源：${reference.sourceUrl}`,
      `许可证：${reference.license}（${licenseRiskLabel(reference.licenseRisk)}）`,
      `可搬运功能：${reference.transferableFeatures.join('、')}`,
      '计划任务：',
      taskLines,
    ].join('\n');

    setNotes((current) => {
      if (current.includes(reference.sourceUrl)) return current;
      return current.trim() ? `${current.trim()}\n\n${importNote}` : importNote;
    });

    const suggestedTaskIds = selectedProject?.tasks.slice(0, 2).map((task) => task.id) || [];
    setCheckedTasks((current) => new Set([...Array.from(current), ...suggestedTaskIds]));
  };

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="p-6 pt-2 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">项目实战</h1>
          <p className="text-gray-300 text-sm">围绕 PROJ-* 知识点完成任务拆解、作品提交和阶段验收</p>
        </div>
        <div className="grid grid-cols-3 gap-2 min-w-72">
          {[
            { label: '项目数', value: projects.length },
            { label: '已提交', value: summary?.submitted || 0 },
            { label: '已验收', value: summary?.accepted || 0 },
          ].map((item) => (
            <div key={item.label} className="glass rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="text-[10px] text-white/55">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', '入门', '中级', '高级'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            {f === 'all' ? '全部' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : error ? (
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">加载失败：{error}</span>
          <button onClick={loadProjects} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">重试</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Rocket className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">暂无项目实战</h3>
          <p className="text-sm text-white/55 mb-4">当前本地数据库还没有 published 的 PROJ-* 项目知识点。</p>
          <Link href="/dashboard/vibe" className="btn-primary px-5 py-2 text-sm inline-flex">进入氛围编程</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            {filtered.map((project, index) => {
              const level = levelFromDifficulty(project.difficulty);
              const color = COLOR_BY_INDEX[index % COLOR_BY_INDEX.length];
              const durationHours = Math.max(1, Math.round((project.estimatedMinutes || 60) / 60));
              const selected = selectedProject?.nodeId === project.nodeId;
              return (
                <button
                  key={project.nodeId}
                  onClick={() => setSelectedNodeId(project.nodeId)}
                  className={`glass rounded-xl p-5 hover:bg-white/[0.05] transition-all group block text-left border ${selected ? 'border-orange-500/40 bg-orange-500/[0.04]' : 'border-white/[0.06]'}`}
                >
                  <div className={`w-full h-24 rounded-lg bg-gradient-to-br ${color} mb-4 flex items-center justify-center`}>
                    <Rocket className="w-8 h-8 text-white/80" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${level === '入门' ? 'bg-green-500/10 text-green-400' : level === '中级' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{level}</span>
                    <span className={`badge border ${statusClass(project.projectStatus)}`}>{statusLabel(project.projectStatus)}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">{project.name}</h3>
                  <p className="text-xs text-gray-300 mb-3 line-clamp-2">{project.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(project.skills || []).slice(0, 3).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-300">{skill}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-300">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{durationHours}h</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.prerequisites?.length || 0} 前置</span>
                    <span className="flex items-center gap-1 text-yellow-400"><Star className="w-3 h-3" />{project.nodeId}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedProject && (
            <div className="glass rounded-2xl p-5 h-fit xl:sticky xl:top-4 xl:max-h-[calc(100vh_-_2rem)] xl:overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge bg-white/10 text-white/65">{selectedProject.nodeId}</span>
                    <span className={`badge border ${statusClass(selectedProject.projectStatus)}`}>{statusLabel(selectedProject.projectStatus)}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedProject.name}</h2>
                  <p className="text-xs text-white/55 mt-1">{selectedProject.theme}</p>
                </div>
                <Link href={`/dashboard/vibe?nodeId=${selectedProject.nodeId}`} className="btn-secondary px-3 py-2 text-xs shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Vibe
                </Link>
              </div>

              <p className="text-sm text-white/65 mb-4">{selectedProject.description}</p>

              <div className="mb-5">
                <h3 className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">交付物</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.deliverables.map((item) => (
                    <span key={item} className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-[11px] text-white/65">{item}</span>
                  ))}
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-white/55 uppercase tracking-wider">执行工作区</h3>
                  <span className="text-xs text-orange-300 flex items-center gap-1"><Percent className="w-3 h-3" />{completionPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all" style={{ width: `${completionPercent}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg bg-white/[0.03] p-2">
                    <p className="text-[10px] text-white/40">已完成任务</p>
                    <p className="text-sm font-semibold text-white">{checkedTasks.size}/{selectedProject.tasks.length}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2">
                    <p className="text-[10px] text-white/40">预估耗时</p>
                    <p className="text-sm font-semibold text-white">{Math.max(1, Math.round((selectedProject.estimatedMinutes || 60) / 60))}h</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2">
                    <p className="text-[10px] text-white/40">验收状态</p>
                    <p className="text-sm font-semibold text-white">{statusLabel(selectedProject.projectStatus)}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-orange-500/[0.06] border border-orange-500/10 p-3 mb-3">
                  <p className="text-[10px] text-orange-300 mb-1">下一步建议</p>
                  <p className="text-xs text-white/65">{nextTask ? `${nextTask.title}：${nextTask.description}` : '任务已经全部勾选，可以补充仓库、预览地址和复盘说明后提交验收。'}</p>
                </div>
                <button onClick={copyProjectPrompt} className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/65 hover:bg-white/[0.08] transition-colors inline-flex items-center justify-center gap-1.5">
                  <Clipboard className="w-3.5 h-3.5" />
                  {copiedPrompt ? '已复制到剪贴板' : '复制项目 Prompt'}
                </button>
              </div>

              <div className="mb-5">
                <h3 className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">任务验收</h3>
                <div className="space-y-2">
                  {selectedProject.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${checkedTasks.has(task.id) ? 'border-green-500/25 bg-green-500/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${checkedTasks.has(task.id) ? 'text-green-400' : 'text-white/25'}`} />
                        <div>
                          <p className="text-sm text-white/80">{task.title}</p>
                          <p className="text-[11px] text-white/50 mt-0.5">{task.description}</p>
                          <p className="text-[10px] text-white/35 mt-1">验收：{task.acceptance.join(' / ')}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-xs font-semibold text-white/55 uppercase tracking-wider">开源搬运参考</h3>
                  <span className="text-[10px] text-white/35">
                    {openSourceRefs.length} 个参考 · {openSourceSummary?.permissive || 0} 个宽松许可
                  </span>
                </div>
                <div className="space-y-2">
                  {openSourceRefs.slice(0, 3).map((reference) => (
                    <div key={reference.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <GitFork className="w-3.5 h-3.5 text-orange-400" />
                            <p className="text-sm font-semibold text-white/85">{reference.name}</p>
                          </div>
                          <p className="text-[11px] text-white/45">{reference.category}</p>
                        </div>
                        <span className={`badge border text-[10px] ${licenseRiskClass(reference.licenseRisk)}`}>
                          {reference.license}
                        </span>
                      </div>
                      <p className="text-xs text-white/55 leading-relaxed mb-2">{reference.summary}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {reference.transferableFeatures.slice(0, 4).map((feature) => (
                          <span key={feature} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-white/55">{feature}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => importOpenSourceReference(reference)}
                          className="px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-300 text-[11px] hover:bg-orange-500/25 transition-colors"
                        >
                          写入提交说明
                        </button>
                        <a href={reference.sourceUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/55 text-[11px] hover:bg-white/[0.08] transition-colors inline-flex items-center gap-1">
                          查看源码 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/55 mb-1 block">仓库地址</label>
                  <input value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 focus:outline-none focus:border-orange-500/30" placeholder="https://github.com/..." />
                </div>
                <div>
                  <label className="text-xs text-white/55 mb-1 block">预览地址</label>
                  <input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 focus:outline-none focus:border-orange-500/30" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs text-white/55 mb-1 block">提交说明</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-24 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 focus:outline-none focus:border-orange-500/30 resize-y" placeholder="说明你完成了什么、还缺什么、希望 AI 如何评审..." />
                </div>

                {submitError && (
                  <div className="rounded-xl p-3 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {submitError}
                  </div>
                )}

                <button onClick={submitProject} disabled={submitting} className="w-full btn-primary py-3 text-sm disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  提交作品验收
                </button>

                {selectedProject.latestSubmission && (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/55">最近提交</span>
                      <span className={`text-xs font-semibold ${selectedProject.latestSubmission.status === 'accepted' ? 'text-green-400' : 'text-blue-400'}`}>
                        {selectedProject.latestSubmission.score} 分
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-white/50">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" />{selectedProject.submissionCount} 次提交</span>
                      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{formatDate(selectedProject.latestSubmission.createdAt)}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {selectedProject.latestSubmission.repositoryUrl && (
                        <a href={selectedProject.latestSubmission.repositoryUrl} target="_blank" rel="noreferrer" className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
                          仓库 <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {selectedProject.latestSubmission.previewUrl && (
                        <a href={selectedProject.latestSubmission.previewUrl} target="_blank" rel="noreferrer" className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
                          预览 <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {submissions.length > 0 && (
                  <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <History className="w-4 h-4 text-orange-300" />
                      <span className="text-xs text-white/60">提交历史</span>
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="rounded-lg bg-white/[0.025] border border-white/[0.04] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-semibold ${submission.status === 'accepted' ? 'text-green-400' : 'text-blue-400'}`}>
                              {submission.status === 'accepted' ? '已验收' : '已提交'} · {submission.score} 分
                            </span>
                            <span className="text-[10px] text-white/35">{formatDate(submission.createdAt)}</span>
                          </div>
                          {submission.notes && <p className="mt-1 text-[10px] text-white/45 line-clamp-2">{submission.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
