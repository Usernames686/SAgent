'use client';

import { useState } from 'react';
import { BookOpen, ChevronRight, Lightbulb, Code2, Brain } from 'lucide-react';

interface ReadingPanelProps {
  title: string;
  content: string;
  skills: string[];
  assessmentCriteria: { basic: string; intermediate: string; advanced: string };
  onStartQuiz: () => void;
  onStartCoding: () => void;
}

export default function ReadingPanel({
  title,
  content,
  skills,
  assessmentCriteria,
  onStartQuiz,
  onStartCoding,
}: ReadingPanelProps) {
  const [expandedSection, setExpandedSection] = useState<'content' | 'criteria' | null>('content');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/55">知识阅读模式</p>
        </div>
      </div>

      {/* Skills Tags */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, i) => (
            <span key={i} className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded-lg text-xs">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className="glass rounded-2xl p-5 cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={() => setExpandedSection(expandedSection === 'content' ? null : 'content')}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/70 flex items-center gap-2">
            📖 知识讲解
          </span>
          <ChevronRight className={`w-4 h-4 text-white/50 transition-transform ${expandedSection === 'content' ? 'rotate-90' : ''}`} />
        </div>
        {expandedSection === 'content' && (
          <div className="mt-3 text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
            {content || '暂无内容，请点击下方按钮开始测验或编码练习。'}
          </div>
        )}
      </div>

      {/* Assessment Criteria */}
      <div
        className="glass rounded-2xl p-5 cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={() => setExpandedSection(expandedSection === 'criteria' ? null : 'criteria')}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/70 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            学习目标
          </span>
          <ChevronRight className={`w-4 h-4 text-white/50 transition-transform ${expandedSection === 'criteria' ? 'rotate-90' : ''}`} />
        </div>
        {expandedSection === 'criteria' && (
          <div className="mt-3 space-y-3">
            <div className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded text-[10px] mt-0.5 shrink-0">基础</span>
              <span className="text-sm text-white/50">{assessmentCriteria.basic}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded text-[10px] mt-0.5 shrink-0">进阶</span>
              <span className="text-sm text-white/50">{assessmentCriteria.intermediate}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded text-[10px] mt-0.5 shrink-0">高级</span>
              <span className="text-sm text-white/50">{assessmentCriteria.advanced}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onStartQuiz}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-sm font-medium transition-all"
        >
          <Brain className="w-4 h-4" />
          开始 Quiz 测试
        </button>
        <button
          onClick={onStartCoding}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-sm font-medium transition-all"
        >
          <Code2 className="w-4 h-4" />
          开始编码练习
        </button>
      </div>
    </div>
  );
}
