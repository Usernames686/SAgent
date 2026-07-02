'use client';

import { Play, CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

/** 沙箱运行结果 */
interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  executionTime: number;
}

interface RuntimeOutputPanelProps {
  result: RunResult | null;
  running: boolean;
  onRun: () => void;
}

export default function RuntimeOutputPanel({ result, running, onRun }: RuntimeOutputPanelProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white/80">运行结果</span>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 transition-all disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {running ? '运行中...' : '运行代码'}
        </button>
      </div>

      {/* Running indicator */}
      {running && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          <span className="text-xs text-emerald-400/70">正在沙箱中运行...</span>
        </div>
      )}

      {/* Result */}
      {result && !running && (
        <div className="space-y-2">
          {/* Status bar */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            result.success
              ? 'bg-green-500/5 border border-green-500/10'
              : 'bg-red-500/5 border border-red-500/10'
          }`}>
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? '运行成功' : '运行失败'}
            </span>
            <span className="ml-auto flex items-center gap-1 text-xs text-white/55">
              <Clock className="w-3 h-3" /> {result.executionTime}ms
            </span>
          </div>

          {/* Stdout */}
          {result.stdout && (
            <div className="bg-black/30 rounded-xl p-3 border border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] text-white/55 uppercase tracking-wider">输出</span>
              </div>
              <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {result.stdout}
              </pre>
            </div>
          )}

          {/* Stderr */}
          {result.stderr && (
            <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-[10px] text-red-400/70 uppercase tracking-wider">错误信息</span>
              </div>
              <pre className="text-xs text-red-400/70 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {result.stderr}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* No result placeholder */}
      {!result && !running && (
        <div className="text-center py-6 text-white/50 text-xs">
          点击"运行代码"查看运行结果
        </div>
      )}
    </div>
  );
}
