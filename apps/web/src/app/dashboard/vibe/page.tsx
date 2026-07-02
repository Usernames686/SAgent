'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { API_BASE, vibeLearningApi } from '@/lib/api';
import {
  Loader2, BookOpen, Brain, Code2, MessageSquare,
  RefreshCw, Sparkles, AlertCircle, WifiOff, GraduationCap,
  ChevronRight, CheckCircle2, XCircle, ArrowRight,
} from 'lucide-react';
import VibeSidebar from '@/components/vibe/VibeSidebar';
import ConceptPanel from '@/components/vibe/ConceptPanel';
import VibeCodeLab from '@/components/vibe/VibeCodeLab';
import VibeQuizPanel from '@/components/vibe/VibeQuizPanel';
import VibeProgressDashboard from '@/components/vibe/VibeProgressDashboard';
import VibeChatPanel from '@/components/vibe/VibeChatPanel';
import VibeCodingLabPage from '@/components/vibe/VibeCodingLabPage';
import BugHuntChallenge from '@/components/vibe/BugHuntChallenge';
import CodeReviewTrainer from '@/components/vibe/CodeReviewTrainer';
import SpacedRepetitionReview from '@/components/vibe/SpacedRepetitionReview';
import ErrorReview from '@/components/vibe/ErrorReview';
import ProgressHeatmap from '@/components/vibe/ProgressHeatmap';
import LearningAdvisor from '@/components/vibe/LearningAdvisor';
import NodeCompletionCard from '@/components/vibe/NodeCompletionCard';
import { LEARNING_PHASES } from '@/components/vibe/phase-config';

// ── Types ──

type LearningMode = 'concept' | 'code' | 'quiz' | 'chat';
type VibeMode = 'vibe-lab' | 'bug-hunt' | 'code-review' | 'spaced-repetition' | 'error-review' | 'progress-heatmap' | 'learning-advisor' | null;

function normalizeMode(mode: string): LearningMode {
  const mapping: Record<string, LearningMode> = {
    lecture: 'concept', practice: 'code', exam: 'quiz',
    concept: 'concept', code: 'code', quiz: 'quiz', chat: 'chat',
    // 兼容旧模式名
    reading: 'concept', coding: 'code',
  };
  return mapping[mode] || 'concept';
}

function toBackendMode(mode: LearningMode): string {
  const mapping: Record<LearningMode, string> = {
    concept: 'lecture', quiz: 'exam', code: 'practice', chat: 'chat',
  };
  return mapping[mode];
}

function isAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('未授权') || message.includes('请先登录') || message.includes('401');
}

interface LectureConcept { title: string; content: string }
interface CodeExample { title: string; code: string; explanation: string }
interface ComparisonCard { title: string; leftLabel: string; leftItems: string[]; rightLabel: string; rightItems: string[]; verdict?: string; detailHref?: string }
interface TypeCard { name: string; icon: string; color: string; typeofResult: string; example: string; note?: string }
interface TypeCheckCase { expression: string; answer: string; hint?: string }
interface QuickRefRow { syntax: string; meaning: string; example: string }
interface RichMediaContent {
  comparisons?: ComparisonCard[];
  typeCards?: TypeCard[];
  typeCardsDetailHref?: string;
  typeCheckLab?: TypeCheckCase[];
  quickRef?: { title: string; rows: QuickRefRow[] };
  analogy?: { title: string; image: string; explanation: string };
  relationMap?: { nodes: { id: string; label: string }[]; edges: { from: string; to: string; label: string }[] };
  mnemonic?: string;
}
interface LectureContentData {
  nodeId: string; motivation: string; concepts: LectureConcept[];
  codeExamples: CodeExample[]; summary: string; tips: string[]; thinkQuestions: string[];
  /** ★ 详细讲解页面路径 */
  detailHref?: string;
  richMedia?: RichMediaContent;
}
interface QuizOption { id: string; text: string; isCorrect: boolean }
interface QuizQuestion { questionId: string; questionText: string; options: QuizOption[] }
interface AvailableMode { mode: LearningMode; label: string; description: string }

interface LearningStep {
  nodeId: string; nodeName: string; mode: string; stage: string;
  title: string; description: string; content?: string;
  lectureContent?: LectureContentData; quizQuestions?: QuizQuestion[];
  codeTemplate?: string; availableModes: AvailableMode[];
}

interface ModuleProgress {
  module: string; moduleName: string; completed: number; total: number; progress: number;
}

interface LearningProgressData {
  overallProgress: number; completedCount: number; totalCount: number;
  totalScore: number; totalAttempts: number; averageScore: number;
  currentModule: string; knowledgeState: Record<string, number>;
  completedNodeIds?: string[];
  recentActivity: { nodeName: string; mode: string; score: number; timestamp: string }[];
  moduleProgress: ModuleProgress[];
}

const MODE_ICONS: Record<LearningMode, typeof BookOpen> = {
  concept: BookOpen, quiz: Brain, code: Code2, chat: MessageSquare,
};

const MODE_COLORS: Record<LearningMode, { bg: string; text: string; border: string }> = {
  concept: { bg: 'from-blue-500/20 to-cyan-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  quiz: { bg: 'from-violet-500/20 to-purple-500/15', text: 'text-violet-400', border: 'border-violet-500/20' },
  code: { bg: 'from-pink-500/20 to-rose-500/15', text: 'text-pink-400', border: 'border-pink-500/20' },
  chat: { bg: 'from-emerald-500/20 to-teal-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

// ── Main Component ──

export default function VibeLearningPage() {
  const hydrated = useHydration();
  const { isAuthenticated, accessToken } = useAuthStore();
  const token = accessToken || undefined;

  // Core state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<LearningStep | null>(null);
  const [progress, setProgress] = useState<LearningProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'learn' | 'progress'>('learn');
  const [submitting, setSubmitting] = useState(false);
  const [currentMode, setCurrentMode] = useState<LearningMode>('concept');

  // Vibe mode state (Phase 4)
  const [vibeMode, setVibeMode] = useState<VibeMode>(() => {
    if (typeof window === 'undefined') return null;
    const mode = new URLSearchParams(window.location.search).get('mode') as VibeMode;
    const allowed: VibeMode[] = ['vibe-lab', 'bug-hunt', 'code-review', 'spaced-repetition', 'error-review', 'progress-heatmap', 'learning-advisor'];
    return allowed.includes(mode) ? mode : null;
  });

  // Quiz state (managed by page, consumed by VibeQuizPanel)
  const [quizFeedback, setQuizFeedback] = useState<{ correct: boolean; score: number; feedback: string } | null>(null);

  // Coding state
  const [codingFeedback, setCodingFeedback] = useState<{
    score: number; feedback: string;
    analysis?: { correct: string[]; missing: string[]; suggestions: string[] };
    referenceSolution?: string; nodeCompleted: boolean;
  } | null>(null);

  // Chat panel state (floating side panel)
  const [chatOpen, setChatOpen] = useState(false);

  // Sidebar node selection
  const [sidebarNodeId, setSidebarNodeId] = useState<string | null>(null);

  // Completion transition
  const [showCompletion, setShowCompletion] = useState<{
    completedNodeName: string; nextNodeName: string; nextNodeId: string; score: number;
  } | null>(null);

  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Effects ──

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    return () => { if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); };
  }, []);

  const initSession = useCallback(async (nodeId?: string) => {
    setLoading(true);
    setError(null);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError(`请求超时，请检查后端服务是否可访问：${API_BASE}`);
    }, 10000);

    try {
      const res = await vibeLearningApi.startSession({ nodeId }, token) as any;
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

      const data = res;
      if (!data?.session || !data?.nextStep) throw new Error('API 返回数据格式异常');

      if (data.nextStep.mode) data.nextStep.mode = normalizeMode(data.nextStep.mode);
      if (data.nextStep.availableModes) {
        data.nextStep.availableModes = data.nextStep.availableModes.map((m: any) => ({
          ...m, mode: normalizeMode(m.mode),
        }));
      }

      setSessionId(data.session.id);
      setStep(data.nextStep);
      setCurrentMode(data.nextStep.mode || 'concept');
      setSidebarNodeId(data.nextStep.nodeId);
      setQuizFeedback(null);
      setCodingFeedback(null);
      setShowCompletion(null);
    } catch (err) {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      const msg = (err as Error)?.message || '无法连接到学习服务';
      setError(isAuthError(err) ? '登录状态已过期，请重新登录后继续学习。' : `加载失败: ${msg}`);
      console.error('initSession error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadProgress = useCallback(async () => {
    try {
      const res = await vibeLearningApi.getProgress(token) as any;
      const data = res;
      if (data) setProgress(data);
    } catch (err) {
      console.error('loadProgress error:', err);
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      const nodeId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('nodeId') || undefined
        : undefined;
      initSession(nodeId);
      loadProgress();
    }
  }, [hydrated, isAuthenticated, initSession, loadProgress]);

  // ── Handlers ──

  const handleSelectNode = (nodeId: string) => {
    setSidebarNodeId(nodeId);
    initSession(nodeId);
  };

  const updateVibeMode = (mode: VibeMode) => {
    setVibeMode(mode);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (mode) url.searchParams.set('mode', mode);
    else url.searchParams.delete('mode');
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  };

  const switchMode = async (mode: LearningMode) => {
    if (!sessionId) return;
    setError(null);
    try {
      const res = await vibeLearningApi.switchMode({ sessionId, mode: toBackendMode(mode) }, token) as any;
      const data = res;
      if (data) {
        if (data.mode) data.mode = normalizeMode(data.mode);
        if (data.availableModes) {
          data.availableModes = data.availableModes.map((m: any) => ({
            ...m, mode: normalizeMode(m.mode),
          }));
        }
        setStep(data);
        setCurrentMode(normalizeMode(data.mode || mode));
      }
      setQuizFeedback(null);
      setCodingFeedback(null);
      setShowCompletion(null);
    } catch (err) {
      setError(`切换模式失败: ${(err as Error).message}`);
    }
  };

  const handleSubmitQuiz = async (answers: { questionId: string; selectedOptionId: string }[]) => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await vibeLearningApi.submitQuiz({ sessionId, answers }, token) as any;
      const data = res;
      setQuizFeedback(data);

      // 闭环决策：评估通过（score ≥ 90%）→ 显示完成过渡卡片
      const passed = data.score >= 0.9;
      if (passed && data.nextStep && step) {
        if (data.nextStep.nodeId !== step.nodeId) {
          setShowCompletion({
            completedNodeName: step.nodeName,
            nextNodeName: data.nextStep.nodeName || '',
            nextNodeId: data.nextStep.nodeId,
            score: data.score,
          });
        }
      }

      if (data.nextStep) {
        if (data.nextStep.mode) data.nextStep.mode = normalizeMode(data.nextStep.mode);
        if (data.nextStep.availableModes) {
          data.nextStep.availableModes = data.nextStep.availableModes.map((m: any) => ({
            ...m, mode: normalizeMode(m.mode),
          }));
        }
        setStep(data.nextStep);
        setSidebarNodeId(data.nextStep.nodeId);
        if (passed) {
          setCurrentMode(normalizeMode(data.nextStep.mode || 'concept'));
        }
      }
      loadProgress();
    } catch (err) {
      setError(`提交失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCoding = async (code: string) => {
    if (!sessionId || !code.trim()) return;
    setSubmitting(true);
    try {
      const res = await vibeLearningApi.submitCoding({ sessionId, code }, token) as any;
      const data = res;
      setCodingFeedback(data);
      if (data.nextStep) {
        if (data.nextStep.mode) data.nextStep.mode = normalizeMode(data.nextStep.mode);
        if (data.nextStep.availableModes) {
          data.nextStep.availableModes = data.nextStep.availableModes.map((m: any) => ({
            ...m, mode: normalizeMode(m.mode),
          }));
        }
        if (data.nextStep.nodeId !== step?.nodeId && data.nodeCompleted && step) {
          setShowCompletion({
            completedNodeName: step.nodeName,
            nextNodeName: data.nextStep.nodeName,
            nextNodeId: data.nextStep.nodeId,
            score: data.score,
          });
        }
        setStep(data.nextStep);
        setSidebarNodeId(data.nextStep.nodeId);
        setCurrentMode(normalizeMode(data.nextStep.mode || 'code'));
      }
      loadProgress();
    } catch (err) {
      setError(`提交失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryQuiz = () => {
    setQuizFeedback(null);
    if (step) {
      switchMode('quiz');
    }
  };

  const handleRetryCoding = () => {
    setCodingFeedback(null);
    if (step) {
      switchMode('code');
    }
  };


  // ── Derived data ──

  // 使用 knowledgeState (key=nodeId) 来判断完成状态，比 recentActivity.nodeName 更准确
  const completedNodes = new Set<string>([
    // 优先使用后端返回的 completedNodeIds
    ...(progress?.completedNodeIds || []),
    // 兜底：从 knowledgeState 中获取掌握度 >= 0.9 的节点
    ...Object.entries(progress?.knowledgeState || {})
      .filter(([_, mastery]) => mastery >= 0.9)
      .map(([nodeId]) => nodeId),
  ]);
  const knowledgeState = progress?.knowledgeState || {};
  const totalNodes = LEARNING_PHASES.reduce((sum, p) => sum + p.modules.reduce((s, m) => s + m.nodeIds.length, 0), 0);
  const currentPhase = LEARNING_PHASES.find(p => p.modules.some(m => m.nodeIds.includes(step?.nodeId || '')));

  // ── Render ──

  // Loading
  if (!hydrated || loading || (!step && !error)) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#050210' }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 opacity-20 animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-orange-400 animate-spin" />
          </div>
          <p className="text-sm text-white/65">正在准备学习环境...</p>
          <p className="text-[10px] text-white/70 mt-1">Vibe Learning</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#050210' }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-orange-400/50 mx-auto mb-3" />
          <p className="text-sm text-white/65">请先登录</p>
        </div>
      </div>
    );
  }

  // Error (no step)
  if (error && !step) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#050210' }}>
        <div className="text-center max-w-md">
          <WifiOff className="w-16 h-16 text-orange-400/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">{error.includes('登录状态') ? '需要重新登录' : '连接失败'}</h3>
          <p className="text-sm text-white/65 mb-4">{error}</p>
          {!error.includes('登录状态') && (
            <p className="text-xs text-white/50 mb-4">
              请确认后端服务已启动：<code className="px-2 py-0.5 rounded bg-white/5 text-orange-400">{API_BASE}</code>
            </p>
          )}
          <div className="flex gap-3 justify-center">
            {error.includes('登录状态') ? (
              <button onClick={() => { window.location.href = '/login?reason=expired'; }} className="btn-primary px-5 py-2.5 text-sm">
                重新登录
              </button>
            ) : (
              <button onClick={() => initSession()} className="btn-primary px-5 py-2.5 text-sm">
                <RefreshCw className="w-4 h-4" /> 重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Welcome (no step but no error)
  if (!step) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#050210' }}>
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-orange-400/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">欢迎来到氛围学习</h3>
          <p className="text-sm text-white/65 mb-4">点击下方按钮开始你的学习之旅</p>
          <button onClick={() => initSession()} className="btn-primary px-6 py-2.5 text-sm">
            <Sparkles className="w-4 h-4" /> 开始学习
          </button>
        </div>
      </div>
    );
  }

  // ── Main Layout ──
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#050210' }}>
      {/* Sidebar */}
      <div className="hidden xl:block h-full shrink-0">
        <VibeSidebar
          currentNodeId={step.nodeId}
          completedNodes={completedNodes}
          knowledgeState={knowledgeState}
          onSelectNode={handleSelectNode}
          overallProgress={progress?.overallProgress || 0}
          completedCount={progress?.completedCount || 0}
          totalCount={progress?.totalCount || totalNodes}
          currentLoopStep={currentMode as 'concept' | 'code' | 'quiz'}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 border-b border-white/[0.06] flex items-center justify-between gap-3 px-3 sm:px-5 shrink-0"
          style={{ background: 'rgba(5,2,16,0.6)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-3">
            {/* Phase Badge */}
            {currentPhase && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r ${currentPhase.color} ${currentPhase.colorTo} text-white`}>
                P{currentPhase.index}
              </span>
            )}
            <div>
              <h1 className="text-sm font-bold text-white/90">{step.nodeName}</h1>
              <p className="text-[10px] text-white/50">{step.stage}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.04]">
              <button
                onClick={() => setActiveTab('learn')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'learn' ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:text-white/60'
                }`}
              >
                📖 学习
              </button>
              <button
                onClick={() => { setActiveTab('progress'); loadProgress(); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'progress' ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:text-white/60'
                }`}
              >
                📊 进度
              </button>
            </div>
            <button onClick={() => initSession(step.nodeId)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white/60 transition-colors" title="刷新">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[11px] text-red-300 flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-[10px] text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Completion Transition — Step 42: 增强过渡体验 */}
        {showCompletion && (
          <NodeCompletionCard
            completedNodeName={showCompletion.completedNodeName}
            completedNodeId={step?.nodeId || ''}
            score={showCompletion.score}
            studyMinutes={0}
            mastery={progress?.knowledgeState?.[step?.nodeId || ''] ?? showCompletion.score}
            nextNodeName={showCompletion.nextNodeName}
            nextNodeId={showCompletion.nextNodeId}
            totalCompleted={completedNodes.size}
            totalNodes={totalNodes}
            streakDays={0}
            onContinue={() => {
              setShowCompletion(null);
              if (showCompletion.nextNodeId) {
                initSession(showCompletion.nextNodeId);
              }
            }}
            onViewProgress={() => {
              setShowCompletion(null);
              setActiveTab('progress');
            }}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'progress' ? (
              <div className="h-full overflow-auto p-3 sm:p-5">
              <VibeProgressDashboard
                completedNodes={completedNodes}
                knowledgeState={knowledgeState}
                currentNodeId={step.nodeId}
                totalNodes={progress?.totalCount || totalNodes}
                sessionCount={progress?.totalAttempts || 0}
                totalStudyMinutes={0}
                recentActivity={progress?.recentActivity}
                moduleProgress={progress?.moduleProgress}
                averageScore={progress?.averageScore}
                completedCount={progress?.completedCount}
              />
            </div>
          ) : (
              <div className="h-full flex flex-col min-w-0">
              {/* Mode Tabs */}
              <div className="px-5 pt-3 pb-2 border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1">
                  {step.availableModes.filter(m => m.mode !== 'chat').map((m) => {
                    const Icon = MODE_ICONS[m.mode] || BookOpen;
                    const colors = MODE_COLORS[m.mode];
                    const isActive = currentMode === m.mode && !vibeMode;
                    return (
                      <button
                        key={m.mode}
                        onClick={() => { updateVibeMode(null); switchMode(m.mode); }}
                        className={`flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? `bg-gradient-to-r ${colors.bg} ${colors.text} border ${colors.border}`
                            : 'bg-white/[0.02] text-white/55 hover:bg-white/[0.04] hover:text-white/50 border border-transparent'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {m.label}
                      </button>
                    );
                  })}

                  {/* ── Phase 4: Vibe 特色模式 ── */}
                  <div className="w-px h-5 bg-white/[0.08] mx-1 shrink-0" />
                  {([
                    { key: 'vibe-lab' as VibeMode, label: '✨ Vibe Coding', color: 'from-purple-500/20 to-pink-500/15', textColor: 'text-purple-400', borderColor: 'border-purple-500/20' },
                    { key: 'bug-hunt' as VibeMode, label: '🐛 Bug 猎手', color: 'from-red-500/20 to-orange-500/15', textColor: 'text-red-400', borderColor: 'border-red-500/20' },
                    { key: 'code-review' as VibeMode, label: '🔍 代码评审', color: 'from-blue-500/20 to-cyan-500/15', textColor: 'text-blue-400', borderColor: 'border-blue-500/20' },
                    { key: 'spaced-repetition' as VibeMode, label: '🧠 间隔复习', color: 'from-violet-500/20 to-purple-500/15', textColor: 'text-violet-400', borderColor: 'border-violet-500/20' },
                    { key: 'error-review' as VibeMode, label: '📝 错题回顾', color: 'from-orange-500/20 to-red-500/15', textColor: 'text-orange-400', borderColor: 'border-orange-500/20' },
                    { key: 'progress-heatmap' as VibeMode, label: '🗺️ 热力图', color: 'from-emerald-500/20 to-teal-500/15', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
                    { key: 'learning-advisor' as VibeMode, label: '🎯 学习建议', color: 'from-indigo-500/20 to-violet-500/15', textColor: 'text-indigo-400', borderColor: 'border-indigo-500/20' },
                  ]).map(vm => (
                    <button
                      key={vm.key}
                      onClick={() => updateVibeMode(vm.key === vibeMode ? null : vm.key)}
                      className={`flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                        vibeMode === vm.key
                          ? `bg-gradient-to-r ${vm.color} ${vm.textColor} border ${vm.borderColor}`
                          : 'bg-white/[0.02] text-white/55 hover:bg-white/[0.04] hover:text-white/50 border border-transparent'
                      }`}
                    >
                      {vm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Panel */}
              <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-5">
                {/* Vibe 特色模式 */}
                {vibeMode === 'vibe-lab' && <VibeCodingLabPage nodeId={step.nodeId} />}
                {vibeMode === 'bug-hunt' && <BugHuntChallenge />}
                {vibeMode === 'code-review' && <CodeReviewTrainer />}
                {vibeMode === 'spaced-repetition' && <SpacedRepetitionReview />}
                {vibeMode === 'error-review' && <ErrorReview />}
                {vibeMode === 'progress-heatmap' && <ProgressHeatmap />}
                {vibeMode === 'learning-advisor' && <LearningAdvisor />}

                {/* 原有学习模式 */}
                {!vibeMode && currentMode === 'concept' && (
                  <ConceptPanel
                    nodeId={step.nodeId}
                    nodeName={step.nodeName}
                    stage={step.stage}
                    lectureContent={step.lectureContent || null}
                    content={step.content}
                    onStartPractice={() => switchMode('code')}
                    onStartQuiz={() => switchMode('quiz')}
                  />
                )}

                {!vibeMode && currentMode === 'quiz' && step.quizQuestions && (
                  <VibeQuizPanel
                    questions={step.quizQuestions}
                    onSubmit={handleSubmitQuiz}
                    onRetry={handleRetryQuiz}
                    onBackToConcept={() => switchMode('concept')}
                    onBackToPractice={() => switchMode('code')}
                    feedback={quizFeedback}
                    submitting={submitting}
                  />
                )}

                {!vibeMode && currentMode === 'code' && (
                  <VibeCodeLab
                    template={step.codeTemplate || '// Write your code here\n'}
                    nodeName={step.nodeName}
                    nodeId={step.nodeId}
                    onSubmit={handleSubmitCoding}
                    onRetry={handleRetryCoding}
                    onBackToConcept={() => switchMode('concept')}
                    onStartQuiz={() => switchMode('quiz')}
                    feedback={codingFeedback}
                    submitting={submitting}
                  />
                )}

              </div>
            </div>
          )}
        </div>

        {/* ── AI Chat Floating Button ── */}
        {step && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all hover:scale-105"
            title="AI 学习助手"
          >
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            {!chatOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 animate-pulse-dot" />
            )}
          </button>
        )}

        {/* ── AI Chat Side Panel ── */}
        <VibeChatPanel
          sessionId={sessionId}
          currentNodeId={step?.nodeId || sidebarNodeId}
          token={token}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </div>
  );
}
