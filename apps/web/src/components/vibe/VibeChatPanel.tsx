'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { vibeLearningApi } from '@/lib/api';
import { getNodeName } from './phase-config';

// ── Types ──

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** 是否正在流式输出中 */
  streaming?: boolean;
}

interface VibeChatPanelProps {
  sessionId: string | null;
  currentNodeId: string | null;
  token?: string;
  /** 外部控制面板开/关 */
  open: boolean;
  onClose: () => void;
}

// ── Component ──

export default function VibeChatPanel({
  sessionId,
  currentNodeId,
  token,
  open,
  onClose,
}: VibeChatPanelProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, scrollToBottom]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // 关闭时清理定时器
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    };
  }, []);

  // ── 流式渲染：逐字显示 AI 回复 ──
  const streamReply = useCallback((fullText: string) => {
    return new Promise<void>((resolve) => {
      let charIndex = 0;
      const chunkSize = 2; // 每次显示 2 个字符
      const interval = 20; // 20ms 间隔

      const tick = () => {
        charIndex += chunkSize;
        if (charIndex >= fullText.length) {
          setChatHistory(prev =>
            prev.map((msg, i) =>
              i === prev.length - 1
                ? { ...msg, content: fullText, streaming: false }
                : msg
            )
          );
          setIsStreaming(false);
          resolve();
        } else {
          setChatHistory(prev =>
            prev.map((msg, i) =>
              i === prev.length - 1
                ? { ...msg, content: fullText.slice(0, charIndex) }
                : msg
            )
          );
          streamTimerRef.current = setTimeout(tick, interval);
        }
      };
      tick();
    });
  }, []);

  // ── 发送消息 ──
  const handleSend = useCallback(async () => {
    if (!sessionId || !chatInput.trim() || isStreaming) return;

    const msg = chatInput.trim();
    setChatInput('');
    setIsStreaming(true);

    // 添加用户消息
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);

    // 添加 AI 消息占位符
    setChatHistory(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const res = await vibeLearningApi.chat({ sessionId, message: msg }, token) as any;
      const data = res;
      const reply = data?.reply || '（暂无回复）';

      // 流式渲染：模拟逐字输出效果（后端当前返回完整 JSON）
      // TODO: 后端支持 SSE 后可替换为真流式读取
      await streamReply(reply);
    } catch (err) {
      setChatHistory(prev =>
        prev.map((msg, i) =>
          i === prev.length - 1
            ? { ...msg, content: `❌ 请求失败: ${(err as Error).message}`, streaming: false }
            : msg
        )
      );
      setIsStreaming(false);
    }
  }, [sessionId, chatInput, isStreaming, token, streamReply]);

  // ── 快捷提问 ──
  const quickQuestions = [
    '解释一下这个概念',
    '给我一个例子',
    '我哪里理解错了？',
    '和上一个知识点有什么区别？',
  ];

  const currentNodeName = currentNodeId ? getNodeName(currentNodeId) : null;

  if (!open) return null;

  return (
    <>
      {/* 背景遮罩（移动端） */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* 侧面板 */}
      <div className="fixed right-0 top-0 h-full w-[380px] max-w-[90vw] z-50 flex flex-col animate-slide-left border-l border-white/[0.06]"
        style={{
          background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(5,2,16,0.98) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI 学习助手</h3>
              {currentNodeName && (
                <p className="text-[10px] text-white/50">当前：{currentNodeName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/65" />
          </button>
        </div>

        {/* ── Context Badge ── */}
        {currentNodeName && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10 flex items-center gap-2 shrink-0">
            <Sparkles className="w-3 h-3 text-emerald-400/60" />
            <span className="text-[10px] text-emerald-400/60">
              上下文：正在学习 <span className="text-emerald-400/80 font-medium">{currentNodeName}</span>
            </span>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 min-h-0 overflow-auto px-4 py-3 space-y-3">
          {chatHistory.length === 0 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-7 h-7 text-emerald-400/40" />
              </div>
              <p className="text-sm text-white/55">有什么问题？尽管问我！</p>
              <p className="text-[11px] text-white/70 mt-1">我会基于当前知识点给出解答</p>
              {/* 快捷提问 */}
              <div className="mt-4 space-y-1.5">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setChatInput(q); }}
                    className="block w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-white/55 hover:text-white/50 transition-colors"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-emerald-500/10 border border-emerald-500/15'
                  : 'glass'
              }`}>
                <p className="text-[9px] text-white/50 mb-1">
                  {msg.role === 'assistant' ? '🤖 AI 助手' : '🧑 你'}
                </p>
                <p className="text-[13px] text-white/60 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 bg-emerald-400/60 animate-pulse-dot ml-0.5 align-middle" />
                  )}
                </p>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isStreaming ? 'AI 正在回复...' : '输入你的问题...'}
              disabled={isStreaming}
              className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl focus:outline-none focus:border-emerald-500/30 text-sm text-white placeholder-white/15 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!chatInput.trim() || isStreaming}
              className="w-10 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
