'use client';

import { CheckCircle2, XCircle, Beaker, Loader2 } from 'lucide-react';

/** 测试结果项 */
interface TestResultItem {
  testName: string;
  passed: boolean;
  error?: string;
}

interface UnitTestPanelProps {
  results: TestResultItem[];
  running: boolean;
  totalPassed: number;
  totalTests: number;
}

export default function UnitTestPanel({
  results,
  running,
  totalPassed,
  totalTests,
}: UnitTestPanelProps) {
  if (running) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white/80">单元测试</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/10 rounded-xl">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-xs text-blue-400/70">正在运行测试...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const allPassed = totalPassed === totalTests;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white/80">单元测试</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
          allPassed
            ? 'bg-green-500/15 text-green-400'
            : 'bg-orange-500/15 text-orange-400'
        }`}>
          {totalPassed}/{totalTests} 通过
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allPassed ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${(totalPassed / totalTests) * 100}%` }}
        />
      </div>

      {/* Test items */}
      <div className="space-y-1.5">
        {results.map((test, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs ${
              test.passed
                ? 'bg-green-500/5 border border-green-500/10'
                : 'bg-red-500/5 border border-red-500/10'
            }`}
          >
            {test.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className={test.passed ? 'text-green-400/80' : 'text-red-400/80'}>
                {test.testName}
              </span>
              {test.error && (
                <p className="mt-0.5 text-red-400/60 font-mono break-all">{test.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
