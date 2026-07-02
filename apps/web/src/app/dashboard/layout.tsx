'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { analyticsApi } from '@/lib/api';
import {
  LayoutDashboard, Route, Code2, Palette, MessageSquare,
  LogOut, ChevronLeft, ChevronRight, Flame, Star,
  Target, Brain, Sparkles, BookOpen, GraduationCap, Award,
  Settings, Bell, Search, ChevronDown, Zap, Terminal, Users,
  BarChart3, Rocket, Swords, Microscope, Cpu, Database,
  Layers, Bookmark, History, Activity,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: '学习中心',
    items: [
      { href: '/dashboard', label: '学习概览', icon: LayoutDashboard },
      { href: '/dashboard/learn', label: '学习路径', icon: Route, badge: '进行中' },
      { href: '/dashboard/exercises', label: '编程练习', icon: Code2 },
      { href: '/dashboard/vibe', label: '氛围编程', icon: Palette, badge: '热门' },
      { href: '/dashboard/chat', label: 'AI 辅导', icon: MessageSquare },
    ],
  },
  {
    label: '知识体系',
    items: [
      { href: '/dashboard/knowledge', label: '知识图谱', icon: Brain },
      { href: '/dashboard/projects', label: '项目实战', icon: Rocket, badge: '新' },
      { href: '/dashboard/interview', label: '面试准备', icon: GraduationCap },
      { href: '/dashboard/challenges', label: '编程挑战', icon: Swords },
      { href: '/dashboard/research', label: '深度研究', icon: Microscope },
    ],
  },
  {
    label: '工具与资源',
    items: [
      { href: '/dashboard/evolution', label: '进化引擎', icon: Activity, badge: 'AI' },
      { href: '/dashboard/analytics', label: '学习分析', icon: BarChart3 },
      { href: '/dashboard/codelab', label: '代码实验室', icon: Cpu },
      { href: '/dashboard/datasets', label: '数据集', icon: Database },
      { href: '/dashboard/api-playground', label: 'API 演练场', icon: Layers },
    ],
  },
  {
    label: '社区与成就',
    items: [
      { href: '/dashboard/community', label: '社区讨论', icon: Users },
      { href: '/dashboard/badges', label: '成就系统', icon: Award },
      { href: '/dashboard/bookmarks', label: '我的收藏', icon: Bookmark },
      { href: '/dashboard/history', label: '浏览历史', icon: History },
    ],
  },
];

interface DashboardData {
  overview: {
    totalStudyMinutes: number;
    totalExercises: number;
    streak: number;
    level: number;
    xp: number;
    badgesEarned: number;
    pagesVisited: number;
  };
  weeklyGoal: {
    target: number;
    current: number;
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, accessToken } = useAuthStore();
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['学习中心', '知识体系', '工具与资源', '社区与成就']);
  const [mounted, setMounted] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !user) { window.location.href = '/login'; } }, [mounted, user]);
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      window.location.href = '/login?reason=expired';
    };
    window.addEventListener('sagent-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('sagent-auth-expired', handleAuthExpired);
  }, [logout]);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  useEffect(() => {
    if (!mounted || !user) return;
    analyticsApi.getDashboard(accessToken || undefined)
      .then((res) => setDashboardData(res as DashboardData))
      .catch(() => setDashboardData(null));
  }, [mounted, user, accessToken]);

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  if (!mounted || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #020614 0%, #0a0f1e 50%, #0d1321 100%)' }}>
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userAvatar = user?.nickname?.charAt(0) || 'U';
  const overview = dashboardData?.overview;
  const weeklyGoal = dashboardData?.weeklyGoal || { target: 7, current: 0 };
  const weeklyPercent = weeklyGoal.target > 0 ? Math.min(100, Math.round((weeklyGoal.current / weeklyGoal.target) * 100)) : 0;
  const quickStats = [
    { icon: Flame, label: '连续', value: `${overview?.streak ?? 0}天`, color: 'text-orange-400' },
    { icon: Zap, label: 'XP', value: `${overview?.xp ?? 0}`, color: 'text-yellow-400' },
    { icon: Target, label: '目标', value: `${weeklyPercent}%`, color: 'text-green-400' },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #020614 0%, #0a0f1e 50%, #0d1321 100%)' }}>
      {/* Sidebar */}
      <aside className={`flex min-h-0 flex-col border-r border-white/[0.06] transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[68px]' : 'w-64'}`} style={{ background: 'rgba(2, 6, 14, 0.8)', backdropFilter: 'blur(20px)' }}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-sm tracking-tight">sAgent</span>
                <span className="block text-[10px] text-white/55 -mt-0.5 font-medium">Vibe Coding</span>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/65 hover:text-white">
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] text-white/55 text-sm hover:bg-white/[0.05] hover:border-white/[0.08] transition-all cursor-pointer">
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1">搜索...</span>
              <span className="text-[10px] bg-white/[0.05] px-1.5 py-0.5 rounded font-mono">⌘K</span>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <div className="grid grid-cols-3 gap-1.5">
              {quickStats.map((stat, i) => (
                <div key={i} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <stat.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${stat.color}`} />
                  <div className="text-[10px] font-bold text-white">{stat.value}</div>
                  <div className="text-[9px] text-white/55">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <button onClick={() => toggleSection(section.label)} className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold text-white/50 uppercase tracking-widest hover:text-white/50 transition-colors">
                  {section.label}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedSections.includes(section.label) ? '' : '-rotate-90'}`} />
                </button>
              )}
              {(sidebarCollapsed || expandedSections.includes(section.label)) && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                    return (
                      <Link key={item.href} href={item.href} scroll={false} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                        isActive 
                          ? 'bg-gradient-to-r from-orange-500/10 to-pink-500/5 text-white shadow-sm shadow-orange-500/5' 
                          : 'text-white/65 hover:bg-white/[0.03] hover:text-white/70'
                      }`}>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-orange-400 to-pink-400 rounded-r-full" />
                        )}
                        <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-orange-400' : 'text-white/55 group-hover:text-white/50'}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="text-[13px] flex-1 font-medium">{item.label}</span>
                            {item.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-white/[0.06] text-white/65">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Daily Goal */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/[0.08] via-pink-500/[0.04] to-purple-500/[0.04] border border-orange-500/[0.08]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-white/70">每日目标</span>
                </div>
                <span className="text-xs font-bold text-orange-400">{weeklyPercent}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-full" style={{ width: `${weeklyPercent}%` }} />
              </div>
              <p className="text-[10px] text-white/50">本周 {weeklyGoal.current}/{weeklyGoal.target} 天</p>
            </div>
          </div>
        )}

        {/* User section */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-orange-500/15">
                {user.nickname?.charAt(0) || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#020614]" />
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.nickname}</p>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] text-white/55">Lv.{overview?.level ?? 1} · {(overview?.xp ?? 0).toLocaleString()} XP</span>
                  </div>
                </div>
                <button onClick={() => { logout(); window.location.href = '/login'; }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/55 hover:text-red-400" title="退出登录">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={contentRef} className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        {children}
      </main>
    </div>
  );
}
