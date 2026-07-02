'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Play, Code2, Brain, Zap, Shield, BarChart3, Terminal, ChevronDown, Cpu, Globe, Rocket, Star } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Hero Background Image */}
      <div className="fixed inset-0 -z-10">
        {/* Background image with overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80")',
            transform: `scale(${1 + scrollY * 0.0002}) translateY(${scrollY * 0.3}px)`,
          }}
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/80 via-[#0a0a1a]/70 to-[#0a0a1a]/95" />
        {/* Additional color overlay for mood */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-orange-900/20" />
        
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/30 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Floating particles */}
        {mounted && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  animation: `floatUp ${15 + Math.random() * 25}s linear infinite`,
                  animationDelay: `${Math.random() * 15}s`,
                  opacity: 0.3 + Math.random() * 0.4
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="relative z-10 px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                sAgent
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors">功能</a>
              <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">工作原理</a>
              <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">登录</Link>
              <Link href="/register" className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-lg text-sm font-medium text-white transition-all">
                免费开始
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/80 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Cpu className="w-4 h-4 text-orange-400" />
              <span>10 个 AI Agent 协同工作</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>

            {/* Main heading */}
            <h1 className={`text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="block text-white drop-shadow-lg">编程学习的</span>
              <span className="block bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                未来已来
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              AI 驱动的个性化编程学习平台，让每个人都能获得世界级的编程教育。
              <br />
              <span className="text-white/90">描述你想要的氛围，AI 为你生成代码。</span>
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-semibold text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                开始学习
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl text-white font-medium text-lg transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                观看演示
              </Link>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-3 gap-8 sm:gap-16 mt-16 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {[
                { value: '10+', label: '专业 Agent' },
                { value: '1000+', label: '学习资源' },
                { value: '98%', label: '用户满意度' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/50 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <a href="#features" className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors">
            <span className="text-xs">向下滚动</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#0a0a1a]/90 to-[#0a0a1a]/95">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm mb-6">
              <Star className="w-4 h-4" />
              核心功能
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">
              为什么选择 sAgent
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              我们重新定义了编程学习的体验
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="relative py-32 px-6 lg:px-8 bg-[#0a0a1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
              <Rocket className="w-4 h-4" />
              快速开始
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">
              三步开始学习
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/25 relative z-10">
                  <span className="text-2xl font-bold text-white">{i + 1}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-white/60">{step.description}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-orange-500/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 lg:px-8 bg-gradient-to-b from-[#0a0a1a] to-[#0a0a1a]/95">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 sm:p-16 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-purple-500/10 opacity-50" />
            
            <div className="relative z-10">
              <Globe className="w-12 h-12 text-orange-400 mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                准备好改变你的编程学习方式了吗？
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                加入 sAgent，体验 AI 驱动的个性化编程教育
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-semibold text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                免费注册
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-6 lg:px-8 bg-[#0a0a1a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">sAgent</span>
          </div>
          <p className="text-sm text-white/65">
            © 2026 sAgent. 萌虎教育 · 智能编码学习平台
          </p>
          <div className="flex items-center gap-6 text-sm text-white/65">
            <a href="#" className="hover:text-white transition-colors">隐私政策</a>
            <a href="#" className="hover:text-white transition-colors">服务条款</a>
            <a href="#" className="hover:text-white transition-colors">帮助中心</a>
          </div>
        </div>
      </footer>

      {/* Global styles */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}

const features = [
  {
    icon: Brain,
    title: '10 个专业 Agent',
    description: 'Tutor、Evaluator、Debug、Path Planner 等专业智能体协同工作，覆盖学习全链路。',
  },
  {
    icon: Code2,
    title: '氛围编程',
    description: '描述你想要的氛围，AI 为你生成 React + Tailwind CSS 组件代码。',
  },
  {
    icon: BarChart3,
    title: '个性化路径',
    description: 'BKT + RL 混合算法，根据你的能力水平和学习风格动态调整学习内容。',
  },
  {
    icon: Zap,
    title: '实时反馈',
    description: '代码编辑器实时语法检查、Lint 提示、智能补全，编码到反馈不超过 3 秒。',
  },
  {
    icon: Shield,
    title: '安全沙箱',
    description: 'Docker + gVisor 多层隔离，代码在安全沙箱中执行，无需担心安全问题。',
  },
  {
    icon: Terminal,
    title: '自我进化',
    description: 'Evolution Agent 持续优化教学策略，A/B 测试驱动，系统越用越好。',
  },
];

const steps = [
  {
    title: '创建账号',
    description: '30 秒完成注册，告诉我们你的学习目标和当前水平。',
  },
  {
    title: 'AI 诊断',
    description: '系统自动评估你的能力，生成个性化学习路径。',
  },
  {
    title: '开始学习',
    description: '跟随 AI 导师，通过氛围编程掌握全栈技能。',
  },
];
