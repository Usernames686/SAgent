// BugHuntChallenge.tsx
// Phase 4 Step 31: Bug 修复挑战 — 选择题目 → 修改代码 → 提交验证

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { vibeLearningApi } from '@/lib/api';

// ── Types ──

interface BugChallenge {
  challengeId: string;
  nodeId: string;
  title: string;
  description: string;
  buggedCode: string;
  hints: string[];
  difficulty: 1 | 2 | 3;
  timeLimit: number;
  testCases: Array<{ input?: string; expectedOutput: string }>;
}

interface BugResult {
  challengeId: string;
  passed: boolean;
  score: number;
  testResults: Array<{ passed: boolean; expected: string; actual: string }>;
  timeUsed: number;
  hintsUsed: number;
  feedback: string;
}

// ── Component ──

export default function BugHuntChallenge() {
  const [challenges, setChallenges] = useState<BugChallenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<BugChallenge | null>(null);
  const [code, setCode] = useState('');
  const [started, setStarted] = useState(false);
  const [timeUsed, setTimeUsed] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BugResult | null>(null);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载题目列表
  useEffect(() => {
    vibeLearningApi.getBugChallenges()
      .then((data: any) => setChallenges(data))
      .catch(() => {});
  }, []);

  // 计时器
  useEffect(() => {
    if (started && !result) {
      timerRef.current = setInterval(() => {
        setTimeUsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, result]);

  const selectChallenge = (ch: BugChallenge) => {
    setActiveChallenge(ch);
    setCode(ch.buggedCode);
    setStarted(false);
    setTimeUsed(0);
    setHintsUsed(0);
    setCurrentHint(null);
    setResult(null);
    setError('');
  };

  const startChallenge = () => {
    setStarted(true);
    setTimeUsed(0);
  };

  const requestHint = async () => {
    if (!activeChallenge) return;
    try {
      const res = await vibeLearningApi.getBugHint({
        challengeId: activeChallenge.challengeId,
        hintIndex: hintsUsed,
      }) as any;
      setCurrentHint(res.hint);
      setHintsUsed(prev => prev + 1);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const submitFix = async () => {
    if (!activeChallenge) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await vibeLearningApi.submitBugFix({
        challengeId: activeChallenge.challengeId,
        fixedCode: code,
        timeUsed,
        hintsUsed,
      }) as any;
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const difficultyLabel = (d: number) => d === 1 ? '🟢 简单' : d === 2 ? '🟡 中等' : '🔴 困难';
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
          🐛 Bug 修复挑战
        </h1>
        <p className="text-gray-300 mt-2">找出 Bug，修复代码，成为调试大师</p>
      </div>

      {/* 题目列表 */}
      {!activeChallenge && (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map(ch => (
            <button
              key={ch.challengeId}
              onClick={() => selectChallenge(ch)}
              className="bg-gray-900 rounded-xl p-5 border border-gray-700 hover:border-orange-500 transition-all text-left"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-white">{ch.title}</h3>
                <span className="text-xs">{difficultyLabel(ch.difficulty)}</span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">{ch.description}</p>
              <div className="mt-2 text-xs text-gray-300">
                关联知识点: {ch.nodeId} · 限时: {Math.floor(ch.timeLimit / 60)} 分钟
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 挑战进行中 */}
      {activeChallenge && (
        <div className="space-y-4">
          {/* 顶部信息栏 */}
          <div className="flex items-center justify-between bg-gray-900 rounded-xl p-4 border border-gray-700">
            <div>
              <h2 className="font-semibold text-white">{activeChallenge.title}</h2>
              <p className="text-sm text-gray-300">{difficultyLabel(activeChallenge.difficulty)}</p>
            </div>
            <div className="flex items-center gap-4">
              {started && (
                <div className={`font-mono text-xl ${timeUsed > activeChallenge.timeLimit ? 'text-red-400' : 'text-green-400'}`}>
                  ⏱ {formatTime(timeUsed)}
                </div>
              )}
              <button
                onClick={() => { setActiveChallenge(null); setStarted(false); }}
                className="text-sm text-gray-300 hover:text-white"
              >
                ← 返回列表
              </button>
            </div>
          </div>

          {/* 问题描述 */}
          <div className="bg-gray-900 rounded-xl p-5 border border-orange-700/50">
            <h3 className="font-semibold text-orange-400 mb-2">🐛 Bug 现象</h3>
            <p className="text-gray-300 text-sm">{activeChallenge.description}</p>
          </div>

          {/* 代码编辑器 */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
            <h3 className="font-semibold text-white mb-3">📝 代码编辑</h3>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              disabled={!started || !!result}
              className="w-full h-72 bg-gray-950 rounded-lg p-4 text-sm text-green-400 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              spellCheck={false}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 justify-center">
            {!started ? (
              <button
                onClick={startChallenge}
                className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-all"
              >
                🚀 开始计时
              </button>
            ) : !result ? (
              <>
                <button
                  onClick={requestHint}
                  disabled={hintsUsed >= activeChallenge.hints.length}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50"
                >
                  💡 提示 ({hintsUsed}/{activeChallenge.hints.length})
                </button>
                <button
                  onClick={submitFix}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-400 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? '⏳ 验证中...' : '✅ 提交修复'}
                </button>
              </>
            ) : null}
          </div>

          {/* 当前提示 */}
          {currentHint && (
            <div className="bg-yellow-900/30 rounded-xl p-4 border border-yellow-700/50">
              <h3 className="font-semibold text-yellow-400 mb-1">💡 提示</h3>
              <p className="text-sm text-yellow-200">{currentHint}</p>
            </div>
          )}

          {/* 错误 */}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {/* 提交结果 */}
          {result && (
            <div className={`rounded-xl p-5 border ${
              result.passed ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {result.passed ? '🎉 修复成功！' : '❌ 修复失败'}
                </h3>
                <div className="text-3xl font-bold text-purple-400">{result.score}分</div>
              </div>
              <p className="text-gray-300 mb-3">{result.feedback}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-800 rounded-lg p-3">
                  <span className="text-gray-300">用时:</span> {formatTime(result.timeUsed)}
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <span className="text-gray-300">提示使用:</span> {result.hintsUsed} 次
                </div>
              </div>

              {/* 测试用例结果 */}
              {result.testResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="font-semibold text-sm">测试用例:</h4>
                  {result.testResults.map((tr, i) => (
                    <div key={i} className={`text-sm p-2 rounded ${tr.passed ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                      {tr.passed ? '✅' : '❌'} 期望: {tr.expected} | 实际: {tr.actual}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={() => selectChallenge(activeChallenge)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  🔄 重新挑战
                </button>
                <button
                  onClick={() => { setActiveChallenge(null); setResult(null); }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                >
                  选择其他题目
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
