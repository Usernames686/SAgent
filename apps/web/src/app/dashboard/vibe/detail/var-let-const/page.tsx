'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Lightbulb, BookOpen, Code2, AlertTriangle } from 'lucide-react';
import { STEPS, TOTAL_STEPS, type DetailStep, type StepSection } from '@/components/vibe/detail/var-let-const-steps';

// ── Section Renderers ──

const VARIANT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  red:    { border: 'border-red-500/15',    bg: 'bg-red-500/[0.02]',    text: 'text-red-400' },
  blue:   { border: 'border-blue-500/15',   bg: 'bg-blue-500/[0.02]',   text: 'text-blue-400' },
  purple: { border: 'border-purple-500/15', bg: 'bg-purple-500/[0.02]', text: 'text-purple-400' },
  orange: { border: 'border-orange-500/15', bg: 'bg-orange-500/[0.02]', text: 'text-orange-400' },
  green:  { border: 'border-green-500/15',  bg: 'bg-green-500/[0.02]',  text: 'text-green-400' },
};

function renderMarkdown(text: string) {
  // Simple **bold** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white/80">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function SectionRenderer({ section }: { section: StepSection }) {
  const v = section.variant || 'blue';
  const colors = VARIANT_COLORS[v] || VARIANT_COLORS.blue;

  switch (section.type) {
    case 'intro':
      return (
        <div className={`rounded-2xl p-5 border ${colors.border} ${colors.bg}`}>
          {section.title && <h3 className={`text-sm font-semibold ${colors.text} mb-2`}>{section.title}</h3>}
          {section.text && <p className="text-sm text-white/60 leading-relaxed">{renderMarkdown(section.text)}</p>}
        </div>
      );

    case 'code':
      return (
        <div className={`rounded-2xl p-5 border ${colors.border} ${colors.bg}`}>
          {section.title && <h3 className={`text-sm font-semibold ${colors.text} mb-3`}>{section.title}</h3>}
          {section.code && (
            <pre className="text-xs leading-relaxed text-emerald-400/80 bg-black/30 rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">
              {section.code}
            </pre>
          )}
          {section.text && (
            <p className="text-xs text-white/65 mt-3 leading-relaxed">{renderMarkdown(section.text)}</p>
          )}
        </div>
      );

    case 'svg':
      return (
        <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0d1b2a]">
          <img src={section.svgSrc} alt="原理图解" className="w-full h-auto" loading="lazy" />
        </div>
      );

    case 'warning':
      return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400/80 leading-relaxed">{renderMarkdown(section.text || '')}</p>
        </div>
      );

    case 'success':
      return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <p className="text-xs text-green-400/80 leading-relaxed">{renderMarkdown(section.text || '')}</p>
        </div>
      );

    case 'grid':
      return (
        <div className="grid grid-cols-3 gap-3">
          {section.items?.map((item, i) => {
            const itemColors = VARIANT_COLORS[item.color] || VARIANT_COLORS.blue;
            return (
              <div key={i} className={`rounded-xl p-4 border ${itemColors.border} ${itemColors.bg} text-center`}>
                <div className="text-3xl mb-2">{item.icon}</div>
                <p className={`text-xs font-semibold ${itemColors.text} mb-1`}>{item.label}</p>
                <p className="text-[11px] text-white/65">{item.desc}</p>
              </div>
            );
          })}
        </div>
      );

    case 'tip':
      return (
        <div className="rounded-2xl p-5 border border-yellow-500/15 bg-yellow-500/[0.02]">
          {section.title && <h3 className="text-sm font-semibold text-yellow-400 mb-3">{section.title}</h3>}
          {section.text && (
            <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{renderMarkdown(section.text)}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ── Main Page ──

export default function VarLetConstDetailPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = STEPS[currentStep];
  const progress = (completedSteps.size / TOTAL_STEPS) * 100;

  const goNext = () => {
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    if (currentStep < TOTAL_STEPS - 1) setCurrentStep(currentStep + 1);
  };
  const goPrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'linear-gradient(135deg, #020614 0%, #0a0f1e 50%, #0d1321 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a href="/dashboard/vibe" className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white/60 transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> 返回氛围编程
          </a>
          <h1 className="text-2xl font-bold text-white mb-2">let vs const vs var — 三兄弟对决</h1>
          <p className="text-sm text-white/65">由浅入深，图文并茂，逐步掌握三种变量声明的本质区别</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-white/55">学习进度</span>
            <span className="text-[11px] text-white/65">{completedSteps.size} / {TOTAL_STEPS} 步</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progress, (currentStep / TOTAL_STEPS) * 100)}%` }}
            />
          </div>
        </div>

        {/* Step navigator */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const isCurrent = i === currentStep;
            const isDone = completedSteps.has(i);
            return (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  isCurrent
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                    : isDone
                      ? 'bg-green-500/8 text-green-400/60 border border-green-500/10'
                      : 'text-white/50 hover:text-white/65 border border-transparent'
                }`}
              >
                {isDone ? '✓' : `${i + 1}`}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-orange-400">{currentStep + 1}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              <p className="text-[11px] text-white/55">{step.subtitle}</p>
            </div>
          </div>

          <div className="space-y-5">
            {step.sections.map((section, i) => (
              <SectionRenderer key={i} section={section} />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-white/65 hover:text-white/60 border border-white/[0.06] hover:border-white/[0.1] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> 上一步
          </button>

          <span className="text-[11px] text-white/50">
            {currentStep + 1} / {TOTAL_STEPS}
          </span>

          {currentStep < TOTAL_STEPS - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 transition-all shadow-lg shadow-orange-500/20"
            >
              下一步 <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <a
              href="/dashboard/vibe"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg shadow-green-500/20"
            >
              🎉 回去练习
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
