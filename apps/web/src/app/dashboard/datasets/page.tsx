'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { datasetApi } from '@/lib/api';
import {
  AlertCircle,
  BarChart3,
  Clock,
  Database,
  Download,
  Eye,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

interface DatasetDefinition {
  id: string;
  name: string;
  rows: number;
  size: string;
  desc: string;
  format: 'CSV' | 'JSON';
  columns: string[];
  stats: { users: number; avgTime: string; completionRate: string };
}

interface DatasetListResponse {
  items: DatasetDefinition[];
  total: number;
  summary: { rows: number; users: number };
}

interface DatasetPreviewResponse {
  dataset: DatasetDefinition;
  rows: Record<string, string | number | boolean>[];
}

interface DatasetDownloadRecord {
  id: string;
  datasetId: string;
  filename: string;
  contentType: string;
  createdAt: string;
}

const CARD_STYLES = [
  { color: 'text-blue-400', bg: 'bg-blue-500/[0.08]', border: 'border-blue-500/15' },
  { color: 'text-green-400', bg: 'bg-green-500/[0.08]', border: 'border-green-500/15' },
  { color: 'text-purple-400', bg: 'bg-purple-500/[0.08]', border: 'border-purple-500/15' },
  { color: 'text-orange-400', bg: 'bg-orange-500/[0.08]', border: 'border-orange-500/15' },
  { color: 'text-pink-400', bg: 'bg-pink-500/[0.08]', border: 'border-pink-500/15' },
  { color: 'text-cyan-400', bg: 'bg-cyan-500/[0.08]', border: 'border-cyan-500/15' },
];

function formatNumber(value: number) {
  return value.toLocaleString('zh-CN');
}

function formatCompact(value: number) {
  if (value >= 10000) return `${Math.round(value / 1000) / 10}万`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

function getFilename(response: Response, fallback: string) {
  const disposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export default function DatasetsPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [datasets, setDatasets] = useState<DatasetDefinition[]>([]);
  const [summary, setSummary] = useState<DatasetListResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<DatasetPreviewResponse | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [downloads, setDownloads] = useState<DatasetDownloadRecord[]>([]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await datasetApi.list(accessToken || undefined) as DatasetListResponse;
      setDatasets(res.items || []);
      setSummary(res.summary || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载数据集失败');
      setDatasets([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadDownloads = useCallback(async () => {
    try {
      const res = await datasetApi.downloads(accessToken || undefined) as DatasetDownloadRecord[] | { items?: DatasetDownloadRecord[] };
      setDownloads(Array.isArray(res) ? res : res.items || []);
    } catch {
      setDownloads([]);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      loadDatasets();
      loadDownloads();
    }
  }, [hydrated, isAuthenticated, loadDatasets, loadDownloads]);

  const totalSize = useMemo(() => {
    if (datasets.length === 0) return '0 MB';
    const mb = datasets.reduce((sum, dataset) => {
      const value = Number(dataset.size.replace(/[^\d.]/g, ''));
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
    return `${Math.round(mb * 10) / 10} MB`;
  }, [datasets]);

  const openPreview = async (dataset: DatasetDefinition) => {
    setPreviewLoadingId(dataset.id);
    setActionError('');
    try {
      const res = await datasetApi.preview(dataset.id, 20, accessToken || undefined) as DatasetPreviewResponse;
      setPreview(res);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : '预览失败');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const downloadDataset = async (dataset: DatasetDefinition) => {
    setDownloadingId(dataset.id);
    setActionError('');
    try {
      const response = await fetch(datasetApi.downloadUrl(dataset.id), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `下载失败 HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilename(response, `${dataset.id}.${dataset.format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      loadDownloads();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : '下载失败');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="p-6 pt-2 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">数据集</h1>
        <p className="text-sm text-white/65">学习数据与分析数据集 · 已接入后端预览和下载接口</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Database, label: '数据集', value: String(datasets.length), color: 'text-blue-400', bg: 'bg-blue-500/[0.08]' },
          { icon: BarChart3, label: '总数据行', value: formatCompact(summary?.rows || 0), color: 'text-green-400', bg: 'bg-green-500/[0.08]' },
          { icon: TrendingUp, label: '总大小', value: totalSize, color: 'text-purple-400', bg: 'bg-purple-500/[0.08]' },
          { icon: Users, label: '贡献用户', value: formatCompact(summary?.users || 0), color: 'text-orange-400', bg: 'bg-orange-500/[0.08]' },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-xl p-4 text-center">
            <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/55">{stat.label}</p>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="glass rounded-xl p-4 mb-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-auto text-xs text-white/55 hover:text-white">关闭</button>
        </div>
      )}

      {downloads.length > 0 && (
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">最近导出记录</h2>
            <span className="text-[10px] text-white/45">最近 {downloads.slice(0, 5).length} 条</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {downloads.slice(0, 4).map((record) => (
              <div key={record.id} className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                <p className="text-xs text-white/70 font-mono truncate">{record.filename}</p>
                <p className="text-[10px] text-white/40">{record.datasetId} · {new Date(record.createdAt).toLocaleString('zh-CN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : error ? (
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">加载失败：{error}</span>
          <button onClick={loadDatasets} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors">重试</button>
        </div>
      ) : datasets.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Database className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">暂无数据集</h3>
          <p className="text-sm text-white/55">后端当前没有返回可用的数据集资源。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {datasets.map((dataset, index) => {
            const style = CARD_STYLES[index % CARD_STYLES.length];
            return (
              <div key={dataset.id} className={`glass rounded-2xl p-6 hover:bg-white/[0.03] transition-all duration-300 border ${style.border}`}>
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  <div className={`w-14 h-14 rounded-2xl ${style.bg} flex items-center justify-center shrink-0`}>
                    <FileText className={`w-7 h-7 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white text-lg">{dataset.name}</h3>
                      <span className="badge bg-white/[0.04] text-white/65 border border-white/[0.06]">{dataset.format}</span>
                      <span className="badge bg-white/[0.04] text-white/45 border border-white/[0.06]">{dataset.id}</span>
                    </div>
                    <p className="text-sm text-white/65 mb-3">{dataset.desc}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {dataset.columns.map((col) => (
                        <span key={col} className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-[11px] text-white/65 font-mono">{col}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-5 text-xs text-white/55">
                      <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" />{formatNumber(dataset.rows)} 行</span>
                      <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />{dataset.size}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{formatNumber(dataset.stats.users)} 用户</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{dataset.stats.avgTime} 平均</span>
                      <span className="flex items-center gap-1.5 text-green-400"><TrendingUp className="w-3.5 h-3.5" />{dataset.stats.completionRate} 完成率</span>
                    </div>
                  </div>
                  <div className="flex lg:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => downloadDataset(dataset)}
                      disabled={downloadingId === dataset.id}
                      className="btn-primary px-5 py-2 text-xs disabled:opacity-50"
                    >
                      {downloadingId === dataset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      下载
                    </button>
                    <button
                      onClick={() => openPreview(dataset)}
                      disabled={previewLoadingId === dataset.id}
                      className="btn-secondary px-5 py-2 text-xs disabled:opacity-50"
                    >
                      {previewLoadingId === dataset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      预览
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[82vh] overflow-hidden glass rounded-2xl border border-white/[0.08] flex flex-col">
            <div className="p-5 border-b border-white/[0.06] flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white">{preview.dataset.name}</h2>
                <p className="text-xs text-white/50 mt-1">
                  {preview.dataset.format} · {formatNumber(preview.dataset.rows)} 行 · 当前预览 {preview.rows.length} 行样本
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto p-5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {preview.dataset.columns.map((column) => (
                      <th key={column} className="py-2 pr-4 text-white/60 font-medium whitespace-nowrap">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={index} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      {preview.dataset.columns.map((column) => (
                        <td key={column} className="py-2 pr-4 text-white/75 whitespace-nowrap font-mono">
                          {String(row[column] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
