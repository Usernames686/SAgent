'use client';

import { useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Gauge, Clock, Send } from 'lucide-react';

interface FeedbackPanelProps {
  sessionId: string;
  onSubmit: (feedback: { type: 'difficulty' | 'pace' | 'content' | 'emotion'; value: string; comment?: string }) => void;
}

const FEEDBACK_OPTIONS = [
  {
    type: 'difficulty' as const,
    label: '难度感受',
    icon: Gauge,
    options: [
      { value: 'too_easy', label: '太简单了', icon: ThumbsUp, color: 'text-green-400' },
      { value: 'just_right', label: '刚刚好', icon: ThumbsUp, color: 'text-blue-400' },
      { value: 'too_hard', label: '太难了', icon: ThumbsDown, color: 'text-orange-400' },
    ],
  },
  {
    type: 'pace' as const,
    label: '学习节奏',
    icon: Clock,
    options: [
      { value: 'too_slow', label: '太慢了', icon: ThumbsUp, color: 'text-green-400' },
      { value: 'just_right', label: '刚刚好', icon: ThumbsUp, color: 'text-blue-400' },
      { value: 'too_fast', label: '太快了', icon: ThumbsDown, color: 'text-orange-400' },
    ],
  },
  {
    type: 'emotion' as const,
    label: '学习感受',
    icon: MessageSquare,
    options: [
      { value: 'great', label: '很棒！', color: 'text-green-400' },
      { value: 'bored', label: '有点无聊', color: 'text-yellow-400' },
      { value: 'frustrated', label: '有点挫败', color: 'text-red-400' },
    ],
  },
];

export default function FeedbackPanel({ sessionId, onSubmit }: FeedbackPanelProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const entries = Object.entries(selectedFeedback);
    if (entries.length === 0) return;

    // Submit the first selected feedback
    const [type, value] = entries[0];
    onSubmit({ type: type as any, value, comment: comment || undefined });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="glass rounded-2xl p-5 text-center animate-fade-in">
        <div className="text-3xl mb-2">🙏</div>
        <p className="text-sm text-white/70 font-medium">感谢你的反馈！</p>
        <p className="text-xs text-white/65 mt-1">我们会根据反馈调整学习体验</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 animate-fade-in">
      <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        学习反馈
      </h4>

      <div className="space-y-3">
        {FEEDBACK_OPTIONS.map((category) => (
          <div key={category.type}>
            <p className="text-xs text-white/65 mb-1.5">{category.label}</p>
            <div className="flex gap-2">
              {category.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedFeedback(prev => ({ ...prev, [category.type]: opt.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    selectedFeedback[category.type] === opt.value
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/65 hover:bg-white/[0.06]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="其他建议（可选）"
        className="w-full mt-3 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white/60 placeholder-white/20 resize-none h-16 focus:outline-none focus:border-emerald-500/30"
      />

      <button
        onClick={handleSubmit}
        disabled={Object.keys(selectedFeedback).length === 0}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors"
      >
        <Send className="w-3 h-3" /> 提交反馈
      </button>
    </div>
  );
}
