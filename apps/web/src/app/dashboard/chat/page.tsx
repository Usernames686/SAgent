'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useChatStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { agentApi } from '@/lib/api';
import { AlertCircle, CheckCircle, Loader2, Send, Sparkles, Bot, User } from 'lucide-react';

const SUGGESTIONS = [
  { icon: '❓', text: '什么是闭包？', category: '概念' },
  { icon: '🐛', text: '帮我调试这段代码', category: '调试' },
  { icon: '📝', text: '帮我写一个 React 组件', category: '编码' },
  { icon: '💡', text: '解释 useEffect 的工作原理', category: '概念' },
  { icon: '🔧', text: '如何优化这段代码的性能？', category: '优化' },
  { icon: '🎯', text: '给我推荐下一步学习内容', category: '路径' },
];

export default function ChatPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { messages, addMessage } = useChatStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<{
    configured: boolean;
    model: string;
    baseURL: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    agentApi.health(accessToken || undefined)
      .then((res) => setModelStatus(res as typeof modelStatus))
      .catch((err: unknown) => setModelStatus({
        configured: false,
        model: '-',
        baseURL: '',
        message: err instanceof Error ? err.message : '模型状态检测失败',
      }));
  }, [hydrated, isAuthenticated, accessToken]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    addMessage({ id: crypto.randomUUID(), role: 'user', content: msg, timestamp: new Date() });
    setInput('');
    setLoading(true);

    try {
      const res = await agentApi.chat({ message: msg }, accessToken || undefined) as { content: string; agentType: string };
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: res.content, agentType: res.agentType, timestamp: new Date() });
    } catch (err) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `抱歉，遇到了错误：${(err as Error).message}`, timestamp: new Date() });
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI 辅导</h1>
            <p className="text-xs text-gray-300">
              {modelStatus
                ? `${modelStatus.configured ? '云端模型已配置' : '模型未配置'} · ${modelStatus.model}`
                : '正在检测模型配置...'}
            </p>
          </div>
        </div>
      </div>

      {modelStatus && !modelStatus.configured && (
        <div className="mx-4 mt-4 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-xs text-orange-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{modelStatus.message}</span>
        </div>
      )}

      {modelStatus?.configured && (
        <div className="mx-4 mt-4 rounded-xl border border-green-500/15 bg-green-500/10 px-4 py-2 text-xs text-green-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{modelStatus.baseURL}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">你好！我是 sAgent AI 辅导</h3>
            <p className="text-sm text-gray-300 mb-6">我可以帮你解答编程问题、调试代码、推荐学习内容</p>

            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSend(s.text)} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-sm text-gray-300 transition-colors">
                  <span>{s.icon}</span>
                  <span className="truncate">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-accent-500/20 to-pink-500/20 border border-accent-500/20'
                  : 'glass'
              }`}>
                {msg.agentType && msg.role === 'assistant' && (
                  <div className="text-xs text-gray-300 mb-1">
                    {msg.agentType === 'tutor' && '📚 智能辅导'}
                    {msg.agentType === 'debug' && '🐛 调试助手'}
                    {msg.agentType === 'evaluator' && '📊 代码评估'}
                  </div>
                )}
                <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入编程问题..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white disabled:opacity-30 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
