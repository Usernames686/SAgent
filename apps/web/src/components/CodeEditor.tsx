'use client';

import { useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useEditorStore, useAuthStore } from '@/stores';
import { exerciseApi, agentApi } from '@/lib/api';

// ── Monaco: 使用 jsdelivr CDN 替代默认 CDN（国内更稳定） ──
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs',
    },
  });
}

export default function CodeEditor() {
  const { code, setCode, language, setLanguage, exerciseId } = useEditorStore();
  const token = useAuthStore((s) => s.accessToken);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleRun = async () => {
    if (!exerciseId || !token) return;
    setIsRunning(true);
    try {
      const res = await exerciseApi.run(
        exerciseId,
        { code, language, input: '' },
        token,
      ) as { output: string; error: string | null };
      setOutput(res.error || res.output || 'No output');
    } catch (err) {
      setOutput((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!exerciseId || !token) return;
    setIsEvaluating(true);
    try {
      const res = await exerciseApi.submit(
        exerciseId,
        { code, language },
        token,
      ) as { isPassed: boolean; passRate: number };
      setOutput(
        res.isPassed
          ? `✅ 全部通过！通过率: ${(res.passRate * 100).toFixed(0)}%`
          : `❌ 未完全通过，通过率: ${(res.passRate * 100).toFixed(0)}%`,
      );
    } catch (err) {
      setOutput((err as Error).message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAiEvaluate = async () => {
    if (!token) return;
    setIsEvaluating(true);
    try {
      const res = await agentApi.evaluate(
        { code, exerciseDescription: '当前代码评估' },
        token,
      ) as { content: string };
      setOutput(res.content);
    } catch (err) {
      setOutput((err as Error).message);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="h-12 border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
          >
            {isRunning ? '运行中...' : '▶ 运行'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isEvaluating}
            className="px-4 py-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
          >
            {isEvaluating ? '评估中...' : '📤 提交'}
          </button>
          <button
            onClick={handleAiEvaluate}
            disabled={isEvaluating}
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
          >
            🤖 AI 评估
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Output Panel */}
      {output && (
        <div className="h-40 border-t border-white/10 p-4 overflow-auto">
          <div className="text-xs text-gray-300 mb-2">输出</div>
          <pre className="text-sm font-mono whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}
