'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { knowledgePointApi } from '@/lib/api';
import { AlertCircle, ArrowRight, Brain, CheckCircle, Clock, Loader2, Lock } from 'lucide-react';

interface KnowledgePoint {
  nodeId: string;
  name: string;
  domain: string;
  module: string;
  category?: string;
  priority?: string;
  difficulty: number;
  estimatedMinutes: number;
  description: string;
  prerequisites?: string[];
  dependents?: string[];
  skills?: string[];
  status?: string;
}

interface ModuleNode {
  id: string;
  name: string;
  domain: string;
  points: KnowledgePoint[];
  x: number;
  y: number;
  color: string;
}

const MODULE_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#eab308', '#06b6d4', '#ef4444', '#84cc16', '#6366f1'];

function moduleLabel(moduleId: string) {
  return moduleId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function difficultyLabel(difficulty: number) {
  if (difficulty <= 1) return '入门';
  if (difficulty === 2) return '简单';
  if (difficulty === 3) return '中等';
  if (difficulty === 4) return '困难';
  return '专家';
}

export default function KnowledgePage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const loadPoints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let res = await knowledgePointApi.list({ domain: 'vibe_coding' }, accessToken || undefined) as KnowledgePoint[];
      if (!res || res.length === 0) {
        res = await knowledgePointApi.list(undefined, accessToken || undefined) as KnowledgePoint[];
      }
      setPoints(res || []);
      if (!selectedNodeId && res?.[0]) {
        setSelectedNodeId(res[0].nodeId);
        setSelectedModuleId(res[0].module);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载知识图谱失败');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedNodeId]);

  useEffect(() => {
    if (hydrated && isAuthenticated) loadPoints();
  }, [hydrated, isAuthenticated, loadPoints]);

  const pointMap = useMemo(() => new Map(points.map((point) => [point.nodeId, point])), [points]);

  const modules = useMemo<ModuleNode[]>(() => {
    const groups = new Map<string, KnowledgePoint[]>();
    points.forEach((point) => {
      const existing = groups.get(point.module) || [];
      existing.push(point);
      groups.set(point.module, existing);
    });

    return Array.from(groups.entries()).map(([moduleId, modulePoints], index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      return {
        id: moduleId,
        name: moduleLabel(moduleId),
        domain: modulePoints[0]?.domain || 'vibe_coding',
        points: modulePoints.sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
        x: 45 + col * 165,
        y: 45 + row * 120,
        color: MODULE_COLORS[index % MODULE_COLORS.length],
      };
    });
  }, [points]);

  const moduleMap = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);

  const moduleEdges = useMemo(() => {
    const edges = new Set<string>();
    points.forEach((point) => {
      (point.prerequisites || []).forEach((preId) => {
        const pre = pointMap.get(preId);
        if (pre && pre.module !== point.module) {
          edges.add(`${pre.module}->${point.module}`);
        }
      });
    });
    return Array.from(edges).map((edge) => {
      const [from, to] = edge.split('->');
      return { from, to };
    });
  }, [pointMap, points]);

  const selectedPoint = selectedNodeId ? pointMap.get(selectedNodeId) || null : null;
  const selectedModule = selectedModuleId ? moduleMap.get(selectedModuleId) || null : modules[0] || null;
  const completedCount = points.filter((p) => p.status === 'mastered' || p.status === 'passed').length;
  const totalMinutes = points.reduce((sum, p) => sum + (p.estimatedMinutes || 0), 0);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">加载失败：{error}</span>
          <button onClick={loadPoints} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-2 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">知识图谱</h1>
        <p className="text-gray-300 text-sm">来自后端知识点种子和学习数据的 Vibe Coding 知识体系</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '模块', value: modules.length, icon: Brain, color: 'text-orange-400', bg: 'bg-orange-500/[0.08]' },
          { label: '知识点', value: points.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/[0.08]' },
          { label: '已掌握', value: completedCount, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/[0.08]' },
          { label: '预计时长', value: `${Math.round(totalMinutes / 60)}h`, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/[0.08]' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/55">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">模块依赖关系</h3>
        {modules.length === 0 ? (
          <div className="text-center py-12 text-white/45">暂无知识点数据</div>
        ) : (
          <div className="relative overflow-auto" style={{ height: '400px' }}>
            <svg width="760" height="380" viewBox="0 0 760 380">
              {moduleEdges.map((edge) => {
                const from = moduleMap.get(edge.from);
                const to = moduleMap.get(edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={from.x + 62}
                    y1={from.y + 35}
                    x2={to.x + 62}
                    y2={to.y + 35}
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                );
              })}
              {modules.map((module) => {
                const isSelected = selectedModuleId === module.id;
                return (
                  <g
                    key={module.id}
                    onClick={() => {
                      setSelectedModuleId(module.id);
                      setSelectedNodeId(module.points[0]?.nodeId || null);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={module.x}
                      y={module.y}
                      width="125"
                      height="76"
                      rx="12"
                      fill={isSelected ? `${module.color}33` : 'rgba(255,255,255,0.05)'}
                      stroke={isSelected ? module.color : 'rgba(255,255,255,0.12)'}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <circle cx={module.x + 62} cy={module.y + 24} r="15" fill={module.color} opacity="0.9" />
                    <text x={module.x + 62} y={module.y + 29} textAnchor="middle" fill="white" fontSize="13">⌘</text>
                    <text x={module.x + 62} y={module.y + 52} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
                      {module.name.length > 14 ? `${module.name.slice(0, 13)}…` : module.name}
                    </text>
                    <text x={module.x + 62} y={module.y + 67} textAnchor="middle" fill="#9ca3af" fontSize="9">
                      {module.points.length} 个知识点
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">{selectedModule?.name || '知识点列表'}</h3>
          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
            {(selectedModule?.points || points).map((point) => {
              const selected = point.nodeId === selectedNodeId;
              return (
                <button
                  key={point.nodeId}
                  onClick={() => {
                    setSelectedNodeId(point.nodeId);
                    setSelectedModuleId(point.module);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${selected ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${point.prerequisites?.length ? 'bg-white/10 text-white/60' : 'bg-green-500/15 text-green-400'}`}>
                    {point.prerequisites?.length ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/85 truncate">{point.name}</p>
                    <p className="text-[10px] text-white/45">{point.nodeId} · {point.category || point.module} · {difficultyLabel(point.difficulty)}</p>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 ${selected ? 'text-orange-400' : 'text-white/30'}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-3">{selectedPoint?.name || '选择知识点'}</h3>
            {selectedPoint ? (
              <div className="space-y-4">
                <p className="text-sm text-white/65 leading-relaxed">{selectedPoint.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/[0.04] p-2">
                    <p className="text-white/45 mb-1">难度</p>
                    <p className="text-white/80">{difficultyLabel(selectedPoint.difficulty)}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] p-2">
                    <p className="text-white/45 mb-1">预计</p>
                    <p className="text-white/80">{selectedPoint.estimatedMinutes} 分钟</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/45 mb-2">技能标签</p>
                  <div className="flex flex-wrap gap-1">
                    {(selectedPoint.skills || []).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/60">{skill}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/45 mb-2">前置知识</p>
                  <div className="space-y-1">
                    {(selectedPoint.prerequisites || []).length === 0 ? (
                      <p className="text-xs text-green-400">无需前置知识</p>
                    ) : (
                      (selectedPoint.prerequisites || []).map((nodeId) => (
                        <button key={nodeId} onClick={() => setSelectedNodeId(nodeId)} className="block text-xs text-white/60 hover:text-orange-400">
                          {pointMap.get(nodeId)?.name || nodeId}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/45 mb-2">后续知识</p>
                  <div className="space-y-1">
                    {(selectedPoint.dependents || []).length === 0 ? (
                      <p className="text-xs text-white/40">暂无后续依赖</p>
                    ) : (
                      (selectedPoint.dependents || []).slice(0, 5).map((nodeId) => (
                        <button key={nodeId} onClick={() => setSelectedNodeId(nodeId)} className="block text-xs text-white/60 hover:text-orange-400">
                          {pointMap.get(nodeId)?.name || nodeId}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <Link href={`/dashboard/vibe?nodeId=${selectedPoint.nodeId}`} className="btn-primary w-full py-2.5 text-sm justify-center">
                  进入氛围学习
                </Link>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-300">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">点击模块或知识点查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
