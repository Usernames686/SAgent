'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  sessionId: string;
  onSend: (message: string) => Promise<string>;
}

export default function ChatPanel({ sessionId, onSend }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);

    try {
      const reply = await onSend(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `错误: ${(err as Error).message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI 对话</h3>
          <p className="text-xs text-white/55">与 AI 助手讨论和提问</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-3 mb-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm text-white/65">有什么问题？尽管问我！</p>
            <p className="text-xs text-white/50 mt-1">例如：&ldquo;这个概念和那个有什么区别？&rdquo;</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-emerald-500/15 border border-emerald-500/20'
                : 'glass'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.role === 'assistant' ? (
                  <Bot className="w-3 h-3 text-emerald-400" />
                ) : (
                  <User className="w-3 h-3 text-emerald-400" />
                )}
                <span className="text-[10px] text-white/55">{msg.role === 'assistant' ? 'AI 助手' : '你'}</span>
              </div>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="输入你的问题..."
          className="flex-1 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:outline-none focus:border-emerald-500/40 text-sm text-white placeholder-white/20"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
