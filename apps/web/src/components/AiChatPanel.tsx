'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore, useAuthStore, useEditorStore } from '@/stores';
import { agentApi } from '@/lib/api';

export default function AiChatPanel() {
  const { messages, addMessage, isStreaming, setStreaming } = useChatStore();
  const token = useAuthStore((s) => s.accessToken);
  const { code } = useEditorStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: input,
      timestamp: new Date(),
    };
    addMessage(userMessage);
    setInput('');
    setStreaming(true);

    try {
      const res = await agentApi.chat(
        {
          message: input,
          context: code ? { currentCode: code } : undefined,
        },
        token,
      ) as {
        content: string;
        agentType: string;
        tokens: number;
      };

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.content,
        agentType: res.agentType,
        timestamp: new Date(),
      });
    } catch (err) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `错误：${(err as Error).message}`,
        timestamp: new Date(),
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleVibeCoding = async () => {
    if (!input.trim() || !token) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: `[氛围编程] ${input}`,
      timestamp: new Date(),
    };
    addMessage(userMessage);
    setInput('');
    setStreaming(true);

    try {
      const res = await agentApi.vibe(
        {
          vibe: input,
          requirements: '生成匹配氛围的完整代码',
        },
        token,
      ) as { content: string };

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.content,
        agentType: 'tutor',
        timestamp: new Date(),
      });
    } catch (err) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `错误：${(err as Error).message}`,
        timestamp: new Date(),
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-4">
        <div className="flex items-center gap-2">
          <span className="text-accent-400">🤖</span>
          <span className="font-medium">AI 辅导</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-300 mt-8">
            <p className="text-4xl mb-4">👋</p>
            <p className="font-medium">你好！我是 sAgent AI 辅导</p>
            <p className="text-sm mt-2">问我任何编程问题，或者描述你想要的氛围</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-accent-500/20 border border-accent-500/30'
                  : 'glass'
              }`}
            >
              {msg.agentType && msg.role === 'assistant' && (
                <div className="text-xs text-gray-300 mb-1">
                  {msg.agentType === 'tutor' && '📚 Tutor'}
                  {msg.agentType === 'debug' && '🐛 Debug'}
                  {msg.agentType === 'evaluator' && '📊 Evaluator'}
                  {msg.agentType === 'path_planner' && '🗺️ Path Planner'}
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="glass rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-accent-400 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-accent-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入问题或描述氛围..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent-500 text-sm"
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="px-4 py-3 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            发送
          </button>
          <button
            onClick={handleVibeCoding}
            disabled={!input.trim() || isStreaming}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
            title="氛围编程模式"
          >
            🎨
          </button>
        </div>
      </div>
    </div>
  );
}
