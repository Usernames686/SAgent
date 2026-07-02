'use client';

import { useState, useEffect, useCallback } from 'react';
import { vibeLearningApi } from '@/lib/api';
import {
  LEARNING_PHASES,
  NODE_NAMES,
  getNodeName,
} from './phase-config';

/** 热力图单个知识点数据 */
interface HeatmapNodeItem {
  nodeId: string;
  status: 'locked' | 'learning' | 'passed' | 'mastered';
  masteryScore: number;
}

/** 热力图模块数据 */
interface HeatmapModuleData {
  moduleId: string;
  moduleName: string;
  nodes: HeatmapNodeItem[];
}

/** 热力图完整数据 */
interface HeatmapData {
  modules: HeatmapModuleData[];
  overallStats: {
    total: number;
    locked: number;
    learning: number;
    passed: number;
    mastered: number;
    averageMastery: number;
  };
}

/** 掌握度 → 颜色映射 */
function getHeatColor(score: number, status: string): string {
  if (status === 'locked' || score === 0) return '#ef4444';   // 红色 - 未学习
  if (score <= 49) return '#f97316';                           // 橙色 - 学习中
  if (score <= 79) return '#eab308';                           // 黄色 - 已通过
  return '#22c55e';                                            // 绿色 - 精通
}

/** 掌握度 → 文字颜色 */
function getHeatTextColor(score: number, status: string): string {
  if (status === 'locked' || score === 0) return 'text-red-300';
  if (score <= 49) return 'text-orange-300';
  if (score <= 79) return 'text-yellow-300';
  return 'text-green-300';
}

/** 掌握度 → 状态标签 */
function getStatusLabel(status: string, score: number): string {
  if (status === 'locked' || score === 0) return '未学习';
  if (score <= 49) return '学习中';
  if (score <= 79) return '已通过';
  return '精通';
}

/** 掌握度 → 边框颜色 */
function getHeatBorderColor(score: number, status: string): string {
  if (status === 'locked' || score === 0) return 'border-red-500/30';
  if (score <= 49) return 'border-orange-500/30';
  if (score <= 79) return 'border-yellow-500/30';
  return 'border-green-500/30';
}

export default function ProgressHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<HeatmapNodeItem | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  /** 从 phase-config 构建模块配置 */
  const buildModuleConfig = useCallback(() => {
    const config: Record<string, { name: string; nodeIds: string[] }> = {};
    LEARNING_PHASES.forEach(phase => {
      phase.modules.forEach(mod => {
        config[mod.id] = {
          name: mod.name,
          nodeIds: mod.nodeIds,
        };
      });
    });
    return config;
  }, []);

  /** 加载热力图数据 */
  const loadHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const config = buildModuleConfig();
      const data = await vibeLearningApi.getProgressHeatmap(config) as HeatmapData;
      setHeatmapData(data);
    } catch (e) {
      console.error('加载热力图数据失败:', e);
    }
    setLoading(false);
  }, [buildModuleConfig]);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  if (loading && !heatmapData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  const stats = heatmapData?.overallStats;

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">🗺️</span>
        <div>
          <h2 className="text-xl font-bold text-white">掌握度热力图</h2>
          <p className="text-sm text-gray-300">可视化每个知识点的学习状态与掌握程度</p>
        </div>
      </div>

      {/* 总体统计 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 text-center">
            <div className="text-xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-300">已学习</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-red-500/20 text-center">
            <div className="text-xl font-bold text-red-400">{stats.locked}</div>
            <div className="text-xs text-gray-300">未学习</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-orange-500/20 text-center">
            <div className="text-xl font-bold text-orange-400">{stats.learning}</div>
            <div className="text-xs text-gray-300">学习中</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-yellow-500/20 text-center">
            <div className="text-xl font-bold text-yellow-400">{stats.passed}</div>
            <div className="text-xs text-gray-300">已通过</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-green-500/20 text-center">
            <div className="text-xl font-bold text-green-400">{stats.mastered}</div>
            <div className="text-xs text-gray-300">精通</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-violet-500/20 text-center">
            <div className="text-xl font-bold text-violet-400">{stats.averageMastery}%</div>
            <div className="text-xs text-gray-300">平均掌握度</div>
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="flex items-center gap-4 px-2">
        <span className="text-xs text-gray-300">图例：</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-xs text-gray-300">未学习 (0%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
          <span className="text-xs text-gray-300">学习中 (1-49%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
          <span className="text-xs text-gray-300">已通过 (50-79%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-xs text-gray-300">精通 (80-100%)</span>
        </div>
      </div>

      {/* 热力图 — 按模块分块渲染 */}
      {heatmapData && heatmapData.modules.length > 0 ? (
        <div className="space-y-6">
          {heatmapData.modules.map(mod => {
            const masteredCount = mod.nodes.filter(n => n.masteryScore >= 80).length;
            const passedCount = mod.nodes.filter(n => n.masteryScore >= 50 && n.masteryScore < 80).length;
            const learningCount = mod.nodes.filter(n => n.masteryScore > 0 && n.masteryScore < 50).length;
            const lockedCount = mod.nodes.filter(n => n.masteryScore === 0).length;
            const avgMastery = mod.nodes.length > 0
              ? Math.round(mod.nodes.reduce((s, n) => s + n.masteryScore, 0) / mod.nodes.length)
              : 0;

            return (
              <div key={mod.moduleId} className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/40">
                {/* 模块头部 */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{mod.moduleName}</h3>
                    <div className="text-xs text-gray-300 mt-0.5">
                      {mod.nodes.length} 个知识点 · 平均掌握度 {avgMastery}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-400">精通 {masteredCount}</span>
                    <span className="text-yellow-400">通过 {passedCount}</span>
                    <span className="text-orange-400">学习 {learningCount}</span>
                    <span className="text-red-400">未学 {lockedCount}</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="w-full h-1.5 bg-gray-700/50 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((masteredCount + passedCount) / mod.nodes.length * 100)}%`,
                      background: `linear-gradient(90deg, #22c55e ${(masteredCount / (masteredCount + passedCount || 1)) * 100}%, #eab308 100%)`,
                    }}
                  />
                </div>

                {/* 知识点网格 */}
                <div className="grid gap-2" style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(80px, 1fr))`,
                }}>
                  {mod.nodes.map(node => {
                    const color = getHeatColor(node.masteryScore, node.status);
                    const textColor = getHeatTextColor(node.masteryScore, node.status);
                    const borderColor = getHeatBorderColor(node.masteryScore, node.status);
                    const isHovered = hoveredNode === node.nodeId;
                    const isSelected = selectedNode?.nodeId === node.nodeId;
                    const shortId = node.nodeId.split('-')[1] || node.nodeId;
                    const name = getNodeName(node.nodeId);

                    return (
                      <div
                        key={node.nodeId}
                        className={`
                          relative rounded-lg p-2 border cursor-pointer
                          transition-all duration-200
                          ${borderColor}
                          ${isHovered ? 'scale-105 z-10 shadow-lg' : ''}
                          ${isSelected ? 'ring-2 ring-white/40' : ''}
                        `}
                        style={{ backgroundColor: `${color}20` }}
                        onMouseEnter={() => setHoveredNode(node.nodeId)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => setSelectedNode(isSelected ? null : node)}
                      >
                        <div className={`text-xs font-mono font-bold ${textColor}`}>{shortId}</div>
                        <div className="text-[10px] text-gray-300 truncate mt-0.5">{name}</div>
                        <div className="text-[10px] mt-1" style={{ color }}>{node.masteryScore}%</div>

                        {/* 悬浮提示 */}
                        {isHovered && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 shadow-xl z-50 whitespace-nowrap pointer-events-none">
                            <div className="text-xs font-medium text-white">{name}</div>
                            <div className="text-[10px] text-gray-300">
                              {getStatusLabel(node.status, node.masteryScore)} · {node.masteryScore}%
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-300">
          暂无学习进度数据，开始学习后将在此展示掌握度
        </div>
      )}

      {/* 选中知识点详情 */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedNode(null)}>
          <div
            className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">知识点详情</h3>
              <button onClick={() => setSelectedNode(null)} className="text-gray-300 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-violet-400">{selectedNode.nodeId}</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    color: getHeatColor(selectedNode.masteryScore, selectedNode.status),
                    backgroundColor: `${getHeatColor(selectedNode.masteryScore, selectedNode.status)}20`,
                  }}
                >
                  {getStatusLabel(selectedNode.status, selectedNode.masteryScore)}
                </span>
              </div>

              <div className="text-base text-white font-medium">
                {getNodeName(selectedNode.nodeId)}
              </div>

              {/* 掌握度进度条 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300">掌握度</span>
                  <span className="text-sm font-bold" style={{ color: getHeatColor(selectedNode.masteryScore, selectedNode.status) }}>
                    {selectedNode.masteryScore}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedNode.masteryScore}%`,
                      backgroundColor: getHeatColor(selectedNode.masteryScore, selectedNode.status),
                    }}
                  />
                </div>
              </div>

              {/* 状态里程碑 */}
              <div className="flex items-center justify-between">
                {[
                  { label: '未学习', threshold: 0, color: '#ef4444' },
                  { label: '学习中', threshold: 1, color: '#f97316' },
                  { label: '已通过', threshold: 50, color: '#eab308' },
                  { label: '精通', threshold: 80, color: '#22c55e' },
                ].map(milestone => (
                  <div key={milestone.label} className="flex flex-col items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full border-2"
                      style={{
                        borderColor: milestone.color,
                        backgroundColor: selectedNode.masteryScore >= milestone.threshold ? milestone.color : 'transparent',
                      }}
                    />
                    <span className="text-[10px] text-gray-300">{milestone.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setSelectedNode(null)}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
