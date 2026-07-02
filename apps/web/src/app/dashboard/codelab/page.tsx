'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { sandboxApi } from '@/lib/api';
import { Loader2, Cpu, Play, Copy, Check, Terminal, Code2, FileCode, Braces, Zap, AlertCircle } from 'lucide-react';

interface CodeExample {
  id: number;
  title: string;
  lang: string;
  desc: string;
  difficulty: string;
  code: string;
}

function getCodeExamples(): CodeExample[] {
  return [
    {
      id: 1,
      title: 'Node.js HTTP 服务器',
      lang: 'javascript',
      desc: '创建一个基础的 HTTP 服务器',
      difficulty: '入门',
      code: [
        'const http = require("http");',
        '',
        'const server = http.createServer((req, res) => {',
        '  const url = req.url;',
        '',
        '  if (url === "/") {',
        '    res.writeHead(200, { "Content-Type": "application/json" });',
        '    res.end(JSON.stringify({ message: "Hello World!", timestamp: new Date().toISOString() }));',
        '  } else if (url === "/api/users") {',
        '    res.writeHead(200, { "Content-Type": "application/json" });',
        '    res.end(JSON.stringify([',
        '      { id: 1, name: "Alice", role: "admin" },',
        '      { id: 2, name: "Bob", role: "user" }',
        '    ]));',
        '  } else {',
        '    res.writeHead(404);',
        '    res.end("Not Found");',
        '  }',
        '});',
        '',
        'server.listen(3000, () => {',
        '  console.log("Server running on http://localhost:3000");',
        '});',
      ].join('\n'),
    },
    {
      id: 2,
      title: 'Express REST API',
      lang: 'javascript',
      desc: '使用 Express 创建 RESTful API',
      difficulty: '简单',
      code: [
        'const express = require("express");',
        'const app = express();',
        '',
        'app.use(express.json());',
        '',
        'let users = [',
        '  { id: 1, name: "Alice", email: "alice@example.com" },',
        '  { id: 2, name: "Bob", email: "bob@example.com" }',
        '];',
        '',
        '// GET all users',
        'app.get("/api/users", (req, res) => {',
        '  res.json({ success: true, data: users });',
        '});',
        '',
        '// GET user by id',
        'app.get("/api/users/:id", (req, res) => {',
        '  const user = users.find(u => u.id === parseInt(req.params.id));',
        '  if (!user) return res.status(404).json({ error: "User not found" });',
        '  res.json({ success: true, data: user });',
        '});',
        '',
        '// POST create user',
        'app.post("/api/users", (req, res) => {',
        '  const newUser = { id: users.length + 1, ...req.body };',
        '  users.push(newUser);',
        '  res.status(201).json({ success: true, data: newUser });',
        '});',
        '',
        'app.listen(3000, () => console.log("API running on port 3000"));',
      ].join('\n'),
    },
    {
      id: 3,
      title: 'React Hooks 示例',
      lang: 'javascript',
      desc: 'useState 和 useEffect 的使用',
      difficulty: '简单',
      code: [
        'import { useState, useEffect } from "react";',
        '',
        'function UserProfile({ userId }) {',
        '  const [user, setUser] = useState(null);',
        '  const [loading, setLoading] = useState(true);',
        '  const [error, setError] = useState(null);',
        '',
        '  useEffect(() => {',
        '    async function fetchUser() {',
        '      try {',
        '        const res = await fetch("/api/users/" + userId);',
        '        const data = await res.json();',
        '        setUser(data);',
        '      } catch (e) {',
        '        setError(e.message);',
        '      } finally {',
        '        setLoading(false);',
        '      }',
        '    }',
        '    fetchUser();',
        '  }, [userId]);',
        '',
        '  if (loading) return <div>Loading...</div>;',
        '  if (error) return <div>Error: {error}</div>;',
        '  return <div>{user.name}</div>;',
        '}',
      ].join('\n'),
    },
    {
      id: 4,
      title: 'TypeScript 泛型工具',
      lang: 'typescript',
      desc: '常用泛型类型定义',
      difficulty: '中等',
      code: [
        '// 深度只读',
        'type DeepReadonly<T> = {',
        '  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];',
        '};',
        '',
        '// 可选字段',
        'type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;',
        '',
        '// 提取 Promise 值',
        'type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;',
        '',
        '// 示例',
        'interface User {',
        '  id: number;',
        '  name: string;',
        '  email: string;',
        '  profile: { avatar: string; bio: string };',
        '}',
        '',
        'type ReadonlyUser = DeepReadonly<User>;',
        'type PartialUser = Optional<User, "email" | "profile">;',
        '',
        'console.log("Generic utilities loaded!");',
      ].join('\n'),
    },
    {
      id: 5,
      title: 'Python 数据处理',
      lang: 'python',
      desc: '读取输入并统计基础数据',
      difficulty: '入门',
      code: [
        'numbers = [3, 8, 13, 21, 34]',
        'total = sum(numbers)',
        'average = total / len(numbers)',
        '',
        'print("numbers:", numbers)',
        'print("total:", total)',
        'print("average:", round(average, 2))',
      ].join('\n'),
    },
  ];
}

const CODE_EXAMPLES = getCodeExamples();

export default function CodelabPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [selectedCode, setSelectedCode] = useState(CODE_EXAMPLES[0]);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<{ docker?: boolean; mode?: string; supportedLanguages?: string[] } | null>(null);
  const [healthError, setHealthError] = useState('');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    sandboxApi.health(accessToken || undefined)
      .then((res) => setHealth(res as { docker?: boolean; mode?: string; supportedLanguages?: string[] }))
      .catch((err: unknown) => setHealthError(err instanceof Error ? err.message : '沙箱健康检查失败'));
  }, [hydrated, isAuthenticated, accessToken]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput('');
    try {
      const res = await sandboxApi.run(
        { code: selectedCode.code, language: selectedCode.lang },
        accessToken || undefined,
      );
      const result = res as { success?: boolean; stdout?: string; stderr?: string; output?: string; error?: string; exitCode?: number | null; durationMs?: number };
      if (result.error || result.stderr || result.success === false) {
        setOutput('❌ 执行错误:\n' + (result.error || result.stderr || `进程退出码 ${result.exitCode}`));
      } else {
        const meta = result.durationMs !== undefined ? `\n\n耗时: ${result.durationMs}ms` : '';
        setOutput((result.output || result.stdout || '✅ 执行成功（无输出）') + meta);
      }
    } catch (err: unknown) {
      setOutput('❌ 请求失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setRunning(false);
    }
  }, [selectedCode, accessToken]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(selectedCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedCode]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10"><Code2 className="w-5 h-5 text-orange-400" /></div>
        <div>
          <h1 className="text-xl font-bold text-white">代码实验室</h1>
          <p className="text-sm text-white/65">在线编写和运行代码，沙箱安全执行</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] text-white/45 mb-1">沙箱模式</p>
          <p className="text-sm font-semibold text-white">{health?.mode || '检测中'}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] text-white/45 mb-1">Docker</p>
          <p className={health?.docker ? 'text-sm font-semibold text-green-400' : 'text-sm font-semibold text-orange-400'}>{health ? (health.docker ? '可用' : '未启用，本地执行') : '-'}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] text-white/45 mb-1">支持语言</p>
          <p className="text-sm font-semibold text-white truncate">{health?.supportedLanguages?.join(', ') || '-'}</p>
        </div>
      </div>

      {healthError && (
        <div className="glass rounded-xl p-4 flex items-center gap-2 text-orange-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{healthError}</span>
        </div>
      )}

      {/* Example selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CODE_EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => { setSelectedCode(ex); setOutput(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedCode.id === ex.id
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70'
            }`}
          >
            {ex.lang === 'javascript' ? <Braces className="w-3.5 h-3.5" /> :
             ex.lang === 'typescript' ? <FileCode className="w-3.5 h-3.5" /> :
             <Zap className="w-3.5 h-3.5" />}
            {ex.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Panel */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-white/55" />
              <span className="text-xs font-medium text-white/65">{selectedCode.lang.toUpperCase()}</span>
              <span className="badge bg-white/5 text-white/55 text-[10px]">{selectedCode.difficulty}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/10 text-white/55 hover:text-white/60 transition-all">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 disabled:opacity-50 transition-all"
              >
                {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {running ? '运行中...' : '运行'}
              </button>
            </div>
          </div>
          <pre className="p-5 text-[13px] font-mono text-white/70 overflow-auto max-h-[450px] leading-relaxed">
            <code>{selectedCode.code}</code>
          </pre>
        </div>

        {/* Output Panel */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-white/55" />
            <span className="text-xs font-medium text-white/65">输出</span>
          </div>
          <pre className="p-4 text-[12px] font-mono overflow-auto max-h-[450px] bg-black/20 leading-relaxed whitespace-pre-wrap">
            {output ? (
              <span className={output.includes('❌') ? 'text-red-400/80' : 'text-green-400/80'}>{output}</span>
            ) : (
              <span className="text-white/50">
                {'// 点击「运行」查看输出结果\n'}
            {'// 支持语言以沙箱健康检查返回为准\n'}
                {'// 所有代码在沙箱中安全执行'}
              </span>
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
