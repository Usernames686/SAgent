'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { ArrowLeft, ArrowRight, Check, Sparkles, Map } from 'lucide-react';

const GOALS = [
  { id: 'python_data', label: 'Python 数据分析', desc: '从零学习 Python 数据分析', icon: '📊' },
  { id: 'frontend_dev', label: '前端开发', desc: '学习 React/Vue 前端开发', icon: '🎨' },
  { id: 'fullstack', label: '全栈开发', desc: '前后端全栈工程师', icon: '🚀' },
  { id: 'ai_engineer', label: 'AI 工程师', desc: 'AI 应用开发与 Agent 构建', icon: '🤖' },
  { id: 'vibe_coding', label: '氛围编程', desc: 'Vibe Coding 全栈工程师', icon: '✨' },
  { id: 'interview', label: '面试准备', desc: '算法与面试题训练', icon: '💼' },
];

const LEVELS = [
  { id: 'beginner', label: '零基础', desc: '没有任何编程经验', icon: '🌱' },
  { id: 'elementary', label: '入门', desc: '了解基本概念，写过简单代码', icon: '📘' },
  { id: 'intermediate', label: '中级', desc: '能独立完成项目', icon: '💻' },
  { id: 'advanced', label: '高级', desc: '有丰富项目经验', icon: '🏆' },
];

const RECOMMENDED_PATHS: Record<string, string[]> = {
  beginner: ['认知与思维', '工具链', '提示词工程', '代码阅读与极简编程', '全栈工程能力'],
  elementary: ['工具链', '提示词工程', '代码阅读与极简编程', '全栈工程能力', 'AI 大模型与高级'],
  intermediate: ['全栈工程能力', 'AI 大模型与高级', '质量、安全与避坑', '实战项目'],
  advanced: ['AI 大模型与高级', '质量、安全与避坑', '实战项目'],
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  const recommendedPath = RECOMMENDED_PATHS[selectedLevel] || RECOMMENDED_PATHS.beginner;

  const handleComplete = () => {
    // 保存选择到 localStorage，dashboard 首页读取
    localStorage.setItem('sagent_onboarding', JSON.stringify({ goal: selectedGoal, level: selectedLevel }));
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  step > i
                    ? 'bg-accent-500 text-white'
                    : step === i
                    ? 'bg-accent-500/20 text-accent-400 border-2 border-accent-500'
                    : 'bg-white/5 text-gray-300 border border-white/10'
                }`}
              >
                {step > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && (
                <div className={`w-16 h-0.5 rounded-full transition-all duration-300 ${
                  step > i ? 'bg-accent-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Welcome & Goal */}
        {step === 0 && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">
                欢迎，{user?.nickname || '同学'}！
              </h1>
              <p className="text-gray-300">让我们为你定制个性化学习路径</p>
            </div>

            <h2 className="text-lg font-semibold mb-4">你的学习目标是什么？</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`p-4 rounded-xl text-left transition-all duration-200 ${
                    selectedGoal === goal.id
                      ? 'bg-accent-500/10 border-2 border-accent-500 shadow-lg shadow-accent-500/10'
                      : 'glass glass-hover border-2 border-transparent'
                  }`}
                  aria-pressed={selectedGoal === goal.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{goal.icon}</span>
                    <div>
                      <p className="font-medium">{goal.label}</p>
                      <p className="text-sm text-gray-300">{goal.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(1)}
                disabled={!selectedGoal}
                className="btn-primary px-6"
              >
                下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Level */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">你目前的编程水平？</h1>
              <p className="text-gray-300">这将帮助我们调整学习难度</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={`p-5 rounded-xl text-center transition-all duration-200 ${
                    selectedLevel === level.id
                      ? 'bg-accent-500/10 border-2 border-accent-500 shadow-lg shadow-accent-500/10'
                      : 'glass glass-hover border-2 border-transparent'
                  }`}
                  aria-pressed={selectedLevel === level.id}
                >
                  <span className="text-2xl block mb-2" aria-hidden="true">{level.icon}</span>
                  <p className="font-medium">{level.label}</p>
                  <p className="text-sm text-gray-300 mt-1">{level.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="btn-secondary px-6">
                <ArrowLeft className="w-4 h-4" /> 返回
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedLevel}
                className="btn-primary px-6"
              >
                下一步 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Recommended Path */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">你的专属学习路径</h1>
              <p className="text-gray-300">基于你的目标和水平，我们推荐以下学习顺序</p>
            </div>

            <div className="glass rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Map className="w-5 h-5 text-accent-400" />
                <h3 className="font-semibold text-white">推荐学习路径</h3>
              </div>
              <div className="space-y-3">
                {recommendedPath.map((module, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center text-sm font-bold text-accent-400">
                      {i + 1}
                    </div>
                    <span className="text-white/80">{module}</span>
                    {i === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-medium border border-green-500/20">
                        从这里开始
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary px-6">
                <ArrowLeft className="w-4 h-4" /> 返回
              </button>
              <button onClick={handleComplete} className="btn-primary px-8">
                <Sparkles className="w-4 h-4" />
                开始学习
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
