// bug-challenge.service.ts
// Phase 4 Step 30: Bug 修复挑战服务

import { Injectable, Logger } from '@nestjs/common';
import { CodeSandboxService } from './code-sandbox.service';

// ── Types ──

export interface BugChallenge {
  challengeId: string;
  nodeId: string;
  title: string;
  description: string;       // Bug 现象描述
  buggedCode: string;        // 含 Bug 代码
  hints: string[];           // 修复提示（逐步展开）
  difficulty: 1 | 2 | 3;
  timeLimit: number;         // 限时（秒）
  testCases: Array<{
    input?: string;
    expectedOutput: string;
  }>;
}

export interface BugChallengeSubmission {
  challengeId: string;
  fixedCode: string;
  timeUsed: number;          // 实际用时（秒）
  hintsUsed: number;         // 使用了几条提示
}

export interface BugChallengeResult {
  challengeId: string;
  passed: boolean;
  score: number;             // 0-100
  testResults: Array<{
    passed: boolean;
    expected: string;
    actual: string;
  }>;
  timeUsed: number;
  hintsUsed: number;
  feedback: string;
}

// ── 预设 Bug 挑战题目 ──

const BUG_CHALLENGES: BugChallenge[] = [
  {
    challengeId: 'bug-js-async-await',
    nodeId: 'JS-010',
    title: '异步函数缺少 await',
    description: '这段代码期望获取用户数据并返回用户名，但总是返回一个 Promise 对象而不是实际的用户名字符串。请找出并修复 Bug。',
    buggedCode: `async function getUserName(userId) {
  // 模拟 API 调用
  const fetchUser = () => new Promise(resolve => {
    setTimeout(() => resolve({ id: userId, name: '张三' }), 100);
  });

  const user = fetchUser();  // Bug: 缺少 await
  return user.name;
}

// 测试
getUserName(1).then(name => console.log(name));`,
    hints: [
      '提示1：注意 fetchUser 是一个返回 Promise 的函数',
      '提示2：当一个函数返回 Promise 时，需要用 await 等待结果',
      '提示3：在 const user = fetchUser() 前面加上 await',
    ],
    difficulty: 2,
    timeLimit: 300,
    testCases: [
      { expectedOutput: '张三' },
    ],
  },
  {
    challengeId: 'bug-js-try-catch',
    nodeId: 'JS-013',
    title: 'try-catch 未捕获异步错误',
    description: '这段代码尝试捕获异步操作中的错误，但 catch 块始终无法捕获到错误。请修复 Bug，使得错误能被正确捕获并返回友好的错误消息。',
    buggedCode: `async function fetchData() {
  try {
    // 模拟失败的 API 调用
    setTimeout(() => {
      throw new Error('网络请求失败');
    }, 100);
  } catch (err) {
    return '错误已捕获: ' + err.message;
  }
}

// 测试
fetchData().then(result => console.log(result));`,
    hints: [
      '提示1：setTimeout 中的回调函数是在不同执行上下文中运行的',
      '提示2：try-catch 只能捕获同步错误，setTimeout 内抛出的错误不会被捕获',
      '提示3：将 setTimeout 改为返回 Promise 的形式，使用 await 等待',
    ],
    difficulty: 2,
    timeLimit: 300,
    testCases: [
      { expectedOutput: '错误已捕获: 网络请求失败' },
    ],
  },
  {
    challengeId: 'bug-react-useeffect',
    nodeId: 'REACT-006',
    title: 'useEffect 缺少依赖项',
    description: '这个 React 组件有一个计数器，点击按钮后应该显示更新后的计数值，但点击后页面上的数字始终不变。请找出并修复 Bug。',
    buggedCode: `import React, { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = '点击了 ' + count + ' 次';
  }, []);  // Bug: 缺少 count 依赖

  return (
    <div>
      <p>当前计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        点击+1
      </button>
    </div>
  );
}

export default Counter;`,
    hints: [
      '提示1：useEffect 的第二个参数是依赖项数组',
      '提示2：当依赖项数组为空 [] 时，effect 只在挂载时执行一次',
      '提示3：将依赖数组改为 [count]，这样 count 变化时 effect 会重新执行',
    ],
    difficulty: 3,
    timeLimit: 420,
    testCases: [
      { expectedOutput: 'useEffect依赖项已修复' },
    ],
  },
  {
    challengeId: 'bug-react-error-boundary',
    nodeId: 'REACT-012',
    title: '缺少错误边界',
    description: '这个组件在渲染时可能抛出错误，但错误会导致整个应用崩溃。请添加错误边界组件来捕获渲染错误，显示降级 UI。',
    buggedCode: `import React from 'react';

// 可能出错的不稳定组件
function UnstableComponent({ shouldCrash }) {
  if (shouldCrash) {
    throw new Error('渲染出错！');
  }
  return <div>组件正常渲染</div>;
}

function App() {
  return (
    <div>
      <h1>我的应用</h1>
      <UnstableComponent shouldCrash={true} />
    </div>
  );
}

export default App;`,
    hints: [
      '提示1：React 错误边界是一个类组件，需要实现 static getDerivedStateFromError 和 componentDidCatch',
      '提示2：创建一个 ErrorBoundary 类组件来包裹 UnstableComponent',
      '提示3：ErrorBoundary 在 catch 到错误时渲染降级 UI，而不是让整个应用崩溃',
    ],
    difficulty: 2,
    timeLimit: 420,
    testCases: [
      { expectedOutput: '错误边界已添加' },
    ],
  },
  {
    challengeId: 'bug-node-jwt',
    nodeId: 'NODE-007',
    title: 'JWT 验证逻辑错误',
    description: '这段 JWT 验证中间件有逻辑错误：即使 token 无效或过期，请求也能通过验证。请找出并修复 Bug。',
    buggedCode: `const jwt = require('jsonwebtoken');

const SECRET = 'my-secret-key';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供 token' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
  } catch (err) {
    // Bug: 捕获错误后仍然调用 next()，请求继续执行
  }

  next();
}

module.exports = authMiddleware;`,
    hints: [
      '提示1：当 jwt.verify 抛出错误时，catch 块捕获了错误但没有做任何处理',
      '提示2：catch 块中应该返回 401 响应，而不是让代码继续执行',
      '提示3：在 catch 块中添加 return res.status(401).json({ error: "token 无效" })',
    ],
    difficulty: 3,
    timeLimit: 420,
    testCases: [
      { expectedOutput: 'JWT验证逻辑已修复' },
    ],
  },
];

@Injectable()
export class BugChallengeService {
  private readonly logger = new Logger(BugChallengeService.name);
  private readonly challenges = new Map<string, BugChallenge>();

  constructor(private readonly sandbox: CodeSandboxService) {
    // 初始化题目
    for (const ch of BUG_CHALLENGES) {
      this.challenges.set(ch.challengeId, ch);
    }
  }

  /** 获取所有 Bug 挑战题目 */
  getAllChallenges(nodeId?: string): BugChallenge[] {
    const all = Array.from(this.challenges.values());
    if (nodeId) {
      return all.filter(c => c.nodeId === nodeId);
    }
    return all;
  }

  /** 获取单个挑战（不含答案和测试用例的详细内容） */
  getChallenge(challengeId: string): BugChallenge | null {
    return this.challenges.get(challengeId) ?? null;
  }

  /** 提交 Bug 修复方案 */
  async submitFix(submission: BugChallengeSubmission): Promise<BugChallengeResult> {
    const challenge = this.challenges.get(submission.challengeId);
    if (!challenge) {
      return {
        challengeId: submission.challengeId,
        passed: false,
        score: 0,
        testResults: [],
        timeUsed: submission.timeUsed,
        hintsUsed: submission.hintsUsed,
        feedback: '题目不存在',
      };
    }

    // 运行提交的代码
    const runResult = await this.sandbox.runCode(submission.fixedCode);

    // 基本语法检查
    if (!runResult.success) {
      return {
        challengeId: submission.challengeId,
        passed: false,
        score: 0,
        testResults: [],
        timeUsed: submission.timeUsed,
        hintsUsed: submission.hintsUsed,
        feedback: `代码运行出错: ${runResult.stderr}`,
      };
    }

    // 测试用例检查
    const testResults = challenge.testCases.map(tc => {
      const actual = (runResult.stdout || '').trim();
      const expected = tc.expectedOutput.trim();
      return {
        passed: actual.includes(expected),
        expected: expected,
        actual: actual,
      };
    });

    const allPassed = testResults.every(r => r.passed);

    // 计算分数
    const baseScore = allPassed ? 80 : 0;
    const timeBonus = Math.max(0, 20 - Math.floor(submission.timeUsed / challenge.timeLimit * 20));
    const hintPenalty = submission.hintsUsed * 5;
    const score = Math.max(0, Math.min(100, baseScore + timeBonus - hintPenalty));

    return {
      challengeId: submission.challengeId,
      passed: allPassed,
      score,
      testResults,
      timeUsed: submission.timeUsed,
      hintsUsed: submission.hintsUsed,
      feedback: allPassed
        ? `修复成功！${score >= 90 ? '太棒了！' : score >= 70 ? '做得不错！' : '还可以更快！'}`
        : `测试未通过，请检查你的修复是否正确。`,
    };
  }

  /** 获取挑战的提示（按索引逐步展开） */
  getHint(challengeId: string, hintIndex: number): string | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || hintIndex >= challenge.hints.length) {
      return null;
    }
    return challenge.hints[hintIndex];
  }
}
