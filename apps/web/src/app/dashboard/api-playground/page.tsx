'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { API_BASE } from '@/lib/api';
import {
  AlertCircle,
  Check,
  Clock3,
  Code2,
  Copy,
  Database,
  Eraser,
  History,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ResponseTab = 'body' | 'headers' | 'curl';

interface EndpointTemplate {
  method: HttpMethod;
  path: string;
  desc: string;
  category: string;
  auth: boolean;
  body?: string;
}

interface RequestHistoryEntry {
  id: string;
  method: HttpMethod;
  path: string;
  status: number | null;
  latency: number;
  ok: boolean;
  time: string;
  responsePreview: string;
  body: string;
}

const STORAGE_KEY = 'sagent-api-workspace';

const API_ENDPOINTS: EndpointTemplate[] = [
  { method: 'GET', path: '/health', desc: '健康检查', category: '系统', auth: false },
  { method: 'GET', path: '/users/me', desc: '获取当前用户信息', category: '用户', auth: true },
  { method: 'GET', path: '/analytics/dashboard', desc: '个人学习仪表盘', category: '统计', auth: true },
  { method: 'GET', path: '/exercises', desc: '获取练习列表', category: '练习', auth: true },
  { method: 'GET', path: '/knowledge-points?domain=vibe_coding', desc: '获取知识点列表', category: '知识', auth: true },
  { method: 'GET', path: '/projects/open-source/catalog?nodeId=PROJ-002', desc: '开源搬运参考目录', category: '项目', auth: true },
  { method: 'POST', path: '/vibe-learning/session', desc: '启动氛围学习会话', category: '氛围学习', auth: true, body: '{\n  "nodeId": "JS-001"\n}' },
  { method: 'POST', path: '/agent/chat', desc: 'AI 对话', category: 'AI', auth: true, body: '{\n  "message": "解释一下闭包"\n}' },
  { method: 'POST', path: '/sandbox/execute', desc: '执行代码沙箱', category: '沙箱', auth: true, body: '{\n  "language": "javascript",\n  "code": "console.log(1 + 1)",\n  "input": ""\n}' },
  { method: 'POST', path: '/auth/login', desc: '用户登录获取 Token', category: '认证', auth: false, body: '{\n  "email": "test@example.com",\n  "password": "password"\n}' },
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-green-500/15 text-green-400 border-green-500/20',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
};

function formatJson(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function parseJsonObject(text: string) {
  if (!text.trim()) return {};
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Header 必须是 JSON 对象');
  }
  return parsed as Record<string, string>;
}

function compactPreview(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 120) || '无响应内容';
}

function methodAllowsBody(method: HttpMethod) {
  return method !== 'GET';
}

export default function ApiPlaygroundPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [selectedEndpoint, setSelectedEndpoint] = useState(API_ENDPOINTS[0]);
  const [method, setMethod] = useState<HttpMethod>(API_ENDPOINTS[0].method);
  const [path, setPath] = useState(API_ENDPOINTS[0].path);
  const [body, setBody] = useState(API_ENDPOINTS[0].body || '');
  const [headersText, setHeadersText] = useState('{\n  "Content-Type": "application/json"\n}');
  const [envVars, setEnvVars] = useState<Record<string, string>>({
    baseUrl: API_BASE,
    token: '',
  });
  const [authEnabled, setAuthEnabled] = useState(API_ENDPOINTS[0].auth);
  const [response, setResponse] = useState('');
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseTab, setResponseTab] = useState<ResponseTab>('body');
  const [status, setStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState<'response' | 'curl' | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        headersText?: string;
        envVars?: Record<string, string>;
        history?: RequestHistoryEntry[];
      };
      if (parsed.headersText) setHeadersText(parsed.headersText);
      if (parsed.envVars) setEnvVars({ baseUrl: API_BASE, token: accessToken || '', ...parsed.envVars });
      if (Array.isArray(parsed.history)) setHistory(parsed.history.slice(0, 20));
    } catch {}
  }, [accessToken, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ headersText, envVars, history }));
  }, [envVars, headersText, history, hydrated]);

  useEffect(() => {
    if (!accessToken) return;
    setEnvVars((current) => ({ ...current, token: current.token || accessToken }));
  }, [accessToken]);

  const categories = useMemo(() => ['全部', ...Array.from(new Set(API_ENDPOINTS.map((endpoint) => endpoint.category)))], []);

  const filteredEndpoints = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return API_ENDPOINTS.filter((endpoint) => {
      const inCategory = category === '全部' || endpoint.category === category;
      const inQuery = !keyword || `${endpoint.method} ${endpoint.path} ${endpoint.desc} ${endpoint.category}`.toLowerCase().includes(keyword);
      return inCategory && inQuery;
    });
  }, [category, query]);

  const requestCount = history.length;
  const lastStatus = history[0]?.status ?? status;

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  const resolveVariables = (text: string) => text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => envVars[key] ?? '');

  const buildUrl = (rawPath = path) => {
    const resolvedPath = resolveVariables(rawPath.trim());
    if (/^https?:\/\//i.test(resolvedPath)) return resolvedPath;
    const baseUrl = resolveVariables(envVars.baseUrl || API_BASE).replace(/\/$/, '');
    const suffix = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
    return `${baseUrl}${suffix}`;
  };

  const buildCurl = () => {
    let headers: Record<string, string> = {};
    try {
      headers = parseJsonObject(resolveVariables(headersText));
    } catch {}
    if (authEnabled && (accessToken || envVars.token)) headers.Authorization = `Bearer ${accessToken || envVars.token}`;
    const headerLines = Object.entries(headers).map(([key, value]) => `  -H '${key}: ${value}'`);
    const dataLine = methodAllowsBody(method) && body.trim()
      ? [`  --data '${resolveVariables(body).replace(/'/g, "'\\''")}'`]
      : [];
    return [`curl -X ${method}`, ...headerLines, ...dataLine, `  '${buildUrl()}'`].join(' \\\n');
  };

  const selectEndpoint = (endpoint: EndpointTemplate) => {
    setSelectedEndpoint(endpoint);
    setMethod(endpoint.method);
    setPath(endpoint.path);
    setBody(endpoint.body || '');
    setAuthEnabled(endpoint.auth);
    setResponse('');
    setResponseHeaders({});
    setStatus(null);
    setLatency(null);
    setError('');
  };

  const restoreHistory = (entry: RequestHistoryEntry) => {
    setMethod(entry.method);
    setPath(entry.path);
    setBody(entry.body);
    setStatus(entry.status);
    setLatency(entry.latency);
    setResponse('');
    setResponseHeaders({});
    setError('');
  };

  const updateEnvVar = (key: string, value: string) => {
    setEnvVars((current) => ({ ...current, [key]: value }));
  };

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    setResponseHeaders({});
    setStatus(null);
    const start = Date.now();
    const resolvedBody = resolveVariables(body);

    try {
      if (authEnabled && !accessToken && !envVars.token) {
        throw new Error('当前接口需要登录 Token');
      }

      let parsedBody: unknown = undefined;
      if (methodAllowsBody(method) && resolvedBody.trim()) {
        try {
          parsedBody = JSON.parse(resolvedBody);
        } catch {
          throw new Error('请求体不是合法 JSON');
        }
      }

      const headers = parseJsonObject(resolveVariables(headersText));
      if (authEnabled && (accessToken || envVars.token)) headers.Authorization = `Bearer ${accessToken || envVars.token}`;
      if (!methodAllowsBody(method)) delete headers['Content-Type'];

      const res = await fetch(buildUrl(), {
        method,
        headers,
        body: methodAllowsBody(method) ? JSON.stringify(parsedBody || {}) : undefined,
      });
      const text = await res.text();
      const nextLatency = Date.now() - start;
      const formatted = formatJson(text);
      const nextHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => { nextHeaders[key] = value; });

      setStatus(res.status);
      setLatency(nextLatency);
      setResponse(formatted);
      setResponseHeaders(nextHeaders);
      setResponseTab('body');
      setHistory((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          method,
          path,
          status: res.status,
          latency: nextLatency,
          ok: res.ok,
          time: new Date().toISOString(),
          responsePreview: compactPreview(formatted),
          body,
        },
        ...current,
      ].slice(0, 20));
    } catch (err: unknown) {
      const nextLatency = Date.now() - start;
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
      setLatency(nextLatency);
      setHistory((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          method,
          path,
          status: null,
          latency: nextLatency,
          ok: false,
          time: new Date().toISOString(),
          responsePreview: message,
          body,
        },
        ...current,
      ].slice(0, 20));
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, type: 'response' | 'curl') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  const responseBody = response || '// 点击「发送请求」查看真实后端响应';
  const responseHeaderText = Object.keys(responseHeaders).length
    ? JSON.stringify(responseHeaders, null, 2)
    : '// 请求完成后显示响应头';
  const curlText = buildCurl();

  return (
    <div className="p-6 pt-2 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">API 演练场</h1>
          <p className="text-sm text-white/65">本地 API 请求工作台，支持模板、变量、历史记录和响应检查</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge bg-orange-500/10 text-orange-300 border border-orange-500/15">Hoppscotch 工作台思路</span>
          <span className="badge bg-white/5 text-white/55 border border-white/[0.06]">Base: {envVars.baseUrl}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Layers, label: '端点模板', value: API_ENDPOINTS.length, color: 'text-blue-400', bg: 'bg-blue-500/[0.08]' },
          { icon: Code2, label: '请求历史', value: requestCount, color: 'text-green-400', bg: 'bg-green-500/[0.08]' },
          { icon: Zap, label: '最近延迟', value: latency !== null ? `${latency}ms` : '-', color: 'text-orange-400', bg: 'bg-orange-500/[0.08]' },
          { icon: Shield, label: '最近状态', value: lastStatus ? `HTTP ${lastStatus}` : '-', color: 'text-purple-400', bg: 'bg-purple-500/[0.08]' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/55">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px] gap-4">
        <section className="glass rounded-2xl p-4 max-h-[760px] overflow-auto">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-orange-500/40"
              placeholder="搜索端点"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${category === item ? 'bg-orange-500/20 text-orange-300' : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {filteredEndpoints.map((endpoint) => (
              <button key={`${endpoint.method}-${endpoint.path}`} onClick={() => selectEndpoint(endpoint)} className={`w-full text-left p-3 rounded-xl text-sm transition-all duration-200 ${selectedEndpoint === endpoint ? 'bg-orange-500/[0.08] border border-orange-500/15' : 'hover:bg-white/[0.03] border border-transparent'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`badge text-[10px] border ${METHOD_COLORS[endpoint.method]}`}>{endpoint.method}</span>
                  <span className="text-[10px] text-white/50">{endpoint.category}</span>
                  {endpoint.auth && <span className="text-[10px] text-yellow-400">JWT</span>}
                </div>
                <code className="text-[11px] text-white/70 font-mono block truncate">/api/v1{endpoint.path}</code>
                <p className="text-[10px] text-white/50 mt-1">{endpoint.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 min-w-0">
          <div className="glass rounded-2xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-[110px_minmax(0,1fr)_auto] gap-3 items-center mb-4">
              <select value={method} onChange={(event) => setMethod(event.target.value as HttpMethod)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white">
                {(['GET', 'POST', 'PUT', 'DELETE'] as HttpMethod[]).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input value={path} onChange={(event) => setPath(event.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500/40" />
              <button onClick={handleTest} disabled={loading} className="btn-primary px-5 py-2 text-xs">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} 发送请求
              </button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <p className="text-xs text-white/55">{selectedEndpoint.desc}</p>
              <button
                onClick={() => setAuthEnabled((current) => !current)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-colors ${authEnabled ? 'bg-yellow-500/10 text-yellow-300' : 'bg-white/[0.04] text-white/45'}`}
              >
                <Shield className="w-3.5 h-3.5" />
                JWT {authEnabled ? '已启用' : '未启用'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Headers</label>
                  <button onClick={() => setHeadersText('{\n  "Content-Type": "application/json"\n}')} className="text-[10px] text-white/40 hover:text-white/70 inline-flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> 重置
                  </button>
                </div>
                <textarea
                  value={headersText}
                  onChange={(event) => setHeadersText(event.target.value)}
                  className="w-full min-h-36 bg-black/25 border border-white/[0.08] rounded-xl p-3 text-[12px] font-mono text-white/75 focus:outline-none focus:border-orange-500/40 resize-y"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 block">Body</label>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  disabled={!methodAllowsBody(method)}
                  className="w-full min-h-36 bg-black/25 border border-white/[0.08] rounded-xl p-3 text-[12px] font-mono text-white/75 focus:outline-none focus:border-orange-500/40 resize-y disabled:opacity-40"
                  placeholder={methodAllowsBody(method) ? '{ }' : 'GET 请求不发送 Body'}
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="glass rounded-xl p-4 flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                {(['body', 'headers', 'curl'] as ResponseTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setResponseTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors ${responseTab === tab ? 'bg-orange-500/15 text-orange-300' : 'bg-white/[0.04] text-white/45 hover:bg-white/[0.08]'}`}
                  >
                    {tab === 'body' ? 'Body' : tab === 'headers' ? 'Headers' : 'cURL'}
                  </button>
                ))}
                {status !== null && <span className={`badge text-[10px] ${status >= 200 && status < 300 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>HTTP {status}</span>}
                {latency !== null && <span className="badge bg-white/5 text-white/55 text-[10px]">{latency}ms</span>}
              </div>
              <button
                onClick={() => copyText(responseTab === 'curl' ? curlText : responseTab === 'headers' ? responseHeaderText : responseBody, responseTab === 'curl' ? 'curl' : 'response')}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/55 hover:text-white/60 transition-colors disabled:opacity-30"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="p-5 text-[12px] font-mono text-white/60 overflow-auto max-h-[360px] leading-relaxed whitespace-pre-wrap">
              {responseTab === 'body' ? responseBody : responseTab === 'headers' ? responseHeaderText : curlText}
            </pre>
          </div>
        </section>

        <aside className="space-y-4 min-w-0">
          <section className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-orange-400" />
              <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">环境变量</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key}>
                  <label className="text-[10px] text-white/40 mb-1 block">{`{{${key}}}`}</label>
                  <input
                    value={value}
                    onChange={(event) => updateEnvVar(key, event.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white/75 font-mono focus:outline-none focus:border-orange-500/40"
                    type={key === 'token' ? 'password' : 'text'}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => updateEnvVar('baseUrl', API_BASE)} className="px-3 py-2 rounded-xl bg-white/[0.04] text-[11px] text-white/55 hover:bg-white/[0.08] transition-colors">本地 API</button>
                <button onClick={() => updateEnvVar('token', accessToken || '')} className="px-3 py-2 rounded-xl bg-white/[0.04] text-[11px] text-white/55 hover:bg-white/[0.08] transition-colors">同步 Token</button>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-4 max-h-[420px] overflow-auto">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-green-400" />
                <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">请求历史</h3>
              </div>
              <button onClick={() => setHistory([])} className="p-1.5 rounded-lg hover:bg-white/5 text-white/35 hover:text-white/65">
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
            {history.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <Clock3 className="w-5 h-5 text-white/25 mx-auto mb-2" />
                <p className="text-xs text-white/45">暂无请求记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <button key={entry.id} onClick={() => restoreHistory(entry)} className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] p-3 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge text-[10px] border ${METHOD_COLORS[entry.method]}`}>{entry.method}</span>
                      <span className={`text-[10px] ${entry.ok ? 'text-green-400' : 'text-red-400'}`}>{entry.status ? `HTTP ${entry.status}` : 'ERR'}</span>
                      <span className="text-[10px] text-white/35 ml-auto">{entry.latency}ms</span>
                    </div>
                    <code className="text-[11px] text-white/65 font-mono block truncate">{entry.path}</code>
                    <p className="text-[10px] text-white/35 mt-1 line-clamp-2">{entry.responsePreview}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">变量预览</h3>
            </div>
            <code className="block text-[11px] leading-relaxed text-white/50 bg-black/20 border border-white/[0.05] rounded-xl p-3 break-all">
              {buildUrl()}
            </code>
          </section>
        </aside>
      </div>
    </div>
  );
}
