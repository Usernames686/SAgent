// CodeReviewTrainer.tsx
// Phase 4 Step 33: 代码评审训练 — 逐行标注问题 → 对比标准答案 → 评分

'use client';

import React, { useState, useEffect } from 'react';
import { vibeLearningApi } from '@/lib/api';

// ── Types ──

interface ReviewChallenge {
  challengeId: string;
  nodeId: string;
  title: string;
  codeSnippet: string;
  rubric: string;
}

interface ReviewFinding {
  line: number;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

interface ReviewResult {
  challengeId: string;
  score: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  userFindings: ReviewFinding[];
  expectedIssues: Array<{
    line: number;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  comparison: Array<{
    line: number;
    userFound: boolean;
    expectedSeverity: string;
    userSeverity?: string;
    matched: boolean;
  }>;
  feedback: string;
}

// ── Component ──

export default function CodeReviewTrainer() {
  const [challenges, setChallenges] = useState<ReviewChallenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ReviewChallenge | null>(null);
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLine, setNewLine] = useState(1);
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<'error' | 'warning' | 'info'>('warning');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState('');

  // 加载题目
  useEffect(() => {
    vibeLearningApi.getReviewChallenges()
      .then((data: any) => setChallenges(data))
      .catch(() => {});
  }, []);

  const selectChallenge = (ch: ReviewChallenge) => {
    setActiveChallenge(ch);
    setFindings([]);
    setResult(null);
    setError('');
    setShowAddForm(false);
  };

  const addFinding = () => {
    if (!newDescription.trim()) return;
    setFindings(prev => [...prev, {
      line: newLine,
      description: newDescription.trim(),
      severity: newSeverity,
    }]);
    setNewDescription('');
    setShowAddForm(false);
  };

  const removeFinding = (index: number) => {
    setFindings(prev => prev.filter((_, i) => i !== index));
  };

  const submitReview = async () => {
    if (!activeChallenge || findings.length === 0) {
      setError('请至少标注一个问题');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await vibeLearningApi.submitReview({
        challengeId: activeChallenge.challengeId,
        findings,
      }) as any;
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 将代码按行分割，标注发现的行
  const codeLines = activeChallenge?.codeSnippet.split('\n') || [];
  const findingLines = new Set(findings.map(f => f.line));
  const resultFindingLines = result
    ? new Set(result.expectedIssues.map(i => i.line))
    : null;

  const severityColor = (s: string) => {
    switch (s) {
      case 'error': return 'text-red-400 bg-red-900/30 border-red-700/50';
      case 'warning': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50';
      case 'info': return 'text-blue-400 bg-blue-900/30 border-blue-700/50';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          🔍 代码评审训练
        </h1>
        <p className="text-gray-300 mt-2">审阅代码，找出问题，提升 Code Review 能力</p>
      </div>

      {/* 题目列表 */}
      {!activeChallenge && (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map(ch => (
            <button
              key={ch.challengeId}
              onClick={() => selectChallenge(ch)}
              className="bg-gray-900 rounded-xl p-5 border border-gray-700 hover:border-cyan-500 transition-all text-left"
            >
              <h3 className="font-semibold text-white mb-2">{ch.title}</h3>
              <p className="text-xs text-gray-300">关联知识点: {ch.nodeId}</p>
              <p className="text-xs text-gray-300 mt-1">评分标准: {ch.rubric}</p>
            </button>
          ))}
        </div>
      )}

      {/* 评审进行中 */}
      {activeChallenge && !result && (
        <div className="space-y-4">
          {/* 顶部 */}
          <div className="flex items-center justify-between bg-gray-900 rounded-xl p-4 border border-gray-700">
            <h2 className="font-semibold text-white">{activeChallenge.title}</h2>
            <button
              onClick={() => setActiveChallenge(null)}
              className="text-sm text-gray-300 hover:text-white"
            >
              ← 返回列表
            </button>
          </div>

          {/* 代码展示区 + 行内评论 */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-2 bg-gray-800 text-sm text-gray-300 border-b border-gray-700">
              代码审查（点击行号添加评论）
            </div>
            <div className="divide-y divide-gray-800/50">
              {codeLines.map((line, i) => {
                const lineNum = i + 1;
                const hasFinding = findingLines.has(lineNum);
                const lineFinding = findings.find(f => f.line === lineNum);
                return (
                  <div
                    key={i}
                    className={`flex ${hasFinding ? 'bg-yellow-900/10' : ''} group hover:bg-gray-800/50`}
                  >
                    <button
                      onClick={() => { setNewLine(lineNum); setShowAddForm(true); }}
                      className="w-12 flex-shrink-0 text-right pr-3 text-xs text-gray-300 hover:text-cyan-400 cursor-pointer select-none py-1"
                    >
                      {lineNum}
                    </button>
                    <pre className="flex-1 text-sm text-gray-300 font-mono py-1 overflow-x-auto">
                      {line}
                    </pre>
                    {lineFinding && (
                      <div className={`flex-shrink-0 px-2 py-1 text-xs rounded m-1 border ${severityColor(lineFinding.severity)}`}>
                        {lineFinding.severity}: {lineFinding.description.slice(0, 30)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 已标注的问题 */}
          {findings.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
              <h3 className="font-semibold text-white mb-3">
                📋 已标注问题 ({findings.length})
              </h3>
              <div className="space-y-2">
                {findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-800 rounded-lg p-3">
                    <span className={`px-2 py-0.5 rounded text-xs border ${severityColor(f.severity)}`}>
                      {f.severity}
                    </span>
                    <span className="text-xs text-gray-300">行 {f.line}:</span>
                    <span className="flex-1 text-sm text-gray-300">{f.description}</span>
                    <button
                      onClick={() => removeFinding(i)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 添加问题表单 */}
          {showAddForm && (
            <div className="bg-gray-900 rounded-xl p-5 border border-cyan-700/50">
              <h3 className="font-semibold text-cyan-400 mb-3">📝 标注问题 (行 {newLine})</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="描述你发现的问题..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  {(['error', 'warning', 'info'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setNewSeverity(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${
                        newSeverity === s ? severityColor(s) + ' border' : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {s === 'error' ? '🔴 Error' : s === 'warning' ? '🟡 Warning' : '🔵 Info'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addFinding}
                    disabled={!newDescription.trim()}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-500 disabled:opacity-50"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-3 justify-center">
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                ➕ 添加标注
              </button>
            )}
            <button
              onClick={submitReview}
              disabled={submitting || findings.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? '⏳ 评分中...' : '📤 提交评审'}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      )}

      {/* 评审结果 */}
      {result && activeChallenge && (
        <div className="space-y-4">
          {/* 评分 */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">📊 评审评分</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: '准确率', value: result.score.accuracy },
                { label: '精确率', value: result.score.precision },
                { label: '召回率', value: result.score.recall },
                { label: 'F1', value: result.score.f1Score },
              ].map(m => (
                <div key={m.label} className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{m.value}</div>
                  <div className="text-xs text-gray-300">{m.label}</div>
                </div>
              ))}
            </div>
            <p className="text-gray-300">{result.feedback}</p>
          </div>

          {/* 对比视图 */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
            <h3 className="font-semibold text-white mb-3">🔄 对比视图</h3>
            <div className="space-y-2">
              {codeLines.map((line, i) => {
                const lineNum = i + 1;
                const comparison = result.comparison.find(c => c.line === lineNum);
                const userFinding = findings.find(f => f.line === lineNum);
                const expectedIssue = result.expectedIssues.find(e => e.line === lineNum);
                if (!comparison && !userFinding && !expectedIssue) return null;

                return (
                  <div key={i} className={`rounded-lg p-3 border ${
                    comparison?.matched ? 'bg-green-900/20 border-green-700/50' :
                    comparison?.userFound ? 'bg-yellow-900/20 border-yellow-700/50' :
                    expectedIssue ? 'bg-red-900/20 border-red-700/50' : 'bg-gray-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-300">行 {lineNum}</span>
                      {comparison?.matched && <span className="text-xs text-green-400">✅ 完全匹配</span>}
                      {comparison?.userFound && !comparison?.matched && <span className="text-xs text-yellow-400">⚠️ 严重程度不同</span>}
                      {expectedIssue && !comparison?.userFound && <span className="text-xs text-red-400">❌ 遗漏</span>}
                    </div>
                    <pre className="text-sm text-gray-300 font-mono mb-1">{line}</pre>
                    {expectedIssue && (
                      <div className="text-xs text-blue-400">
                        标准答案: [{expectedIssue.severity}] {expectedIssue.description}
                      </div>
                    )}
                    {userFinding && !comparison?.matched && (
                      <div className="text-xs text-yellow-400">
                        你的标注: [{userFinding.severity}] {userFinding.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => selectChallenge(activeChallenge)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              🔄 重新挑战
            </button>
            <button
              onClick={() => { setActiveChallenge(null); setResult(null); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              选择其他题目
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
