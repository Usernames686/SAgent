// review-challenge.service.ts
// Phase 4 Step 32: 代码评审训练服务

import { Injectable, Logger } from '@nestjs/common';

// ── Types ──

export interface ReviewChallengeIssue {
  line: number;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ReviewChallenge {
  challengeId: string;
  nodeId: string;
  title: string;
  codeSnippet: string;     // 含问题的代码
  issues: ReviewChallengeIssue[];  // 预设问题（标准答案）
  rubric: string;          // 评分标准
}

export interface ReviewFinding {
  line: number;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ReviewSubmission {
  challengeId: string;
  findings: ReviewFinding[];
}

export interface ReviewScore {
  accuracy: number;       // 0-100，找出问题的准确率
  precision: number;      // 0-100，标注的正确率
  recall: number;         // 0-100，问题覆盖率
  f1Score: number;
}

export interface ReviewChallengeResult {
  challengeId: string;
  score: ReviewScore;
  userFindings: ReviewFinding[];
  expectedIssues: ReviewChallengeIssue[];
  comparison: Array<{
    line: number;
    userFound: boolean;
    expectedSeverity: string;
    userSeverity?: string;
    matched: boolean;
  }>;
  feedback: string;
}

// ── 预设评审题目 ──

const REVIEW_CHALLENGES: ReviewChallenge[] = [
  {
    challengeId: 'review-js-promise',
    nodeId: 'JS-010',
    title: 'Promise 链式调用评审',
    codeSnippet: `function fetchUserData(userId) {
  return fetch('/api/users/' + userId)
    .then(response => response.json())
    .then(data => {
      console.log(data);
      // 没有返回 data
    })
    .catch(err => {
      console.error(err);
      // 错误被吞掉了，没有重新抛出或处理
    });
}

async function processUser(id) {
  const user = fetchUserData(id);
  // 缺少 await
  return user.name;
}`,
    issues: [
      { line: 6, description: '.then() 中没有返回 data，导致后续 Promise 链收到 undefined', severity: 'error' },
      { line: 9, description: 'catch 块吞掉了错误，调用方无法知道请求失败', severity: 'warning' },
      { line: 14, description: 'fetchUserData 返回 Promise，缺少 await', severity: 'error' },
    ],
    rubric: '找出所有 error 级别问题得满分，warning 和 info 按比例加分',
  },
  {
    challengeId: 'review-react-hooks',
    nodeId: 'REACT-006',
    title: 'React Hooks 使用评审',
    codeSnippet: `import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, []);  // 缺少 userId 依赖

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      {/* user 可能为 null */}
      <p>{user.email}</p>
      <button onClick={() => setUser({ ...user, name: 'New' })}>
        Update
      </button>
    </div>
  );
}`,
    issues: [
      { line: 10, description: 'useEffect 依赖数组缺少 userId，userId 变化时不会重新获取数据', severity: 'error' },
      { line: 9, description: 'fetchUser 没有错误处理，请求失败时状态不会更新', severity: 'warning' },
      { line: 17, description: '虽然 loading 为 false 时 user 可能为 null（请求失败场景），缺少空值检查', severity: 'info' },
    ],
    rubric: '找出 error 级别问题得 60 分，warning 加 25 分，info 加 15 分',
  },
  {
    challengeId: 'review-node-security',
    nodeId: 'NODE-007',
    title: 'Node.js 安全性评审',
    codeSnippet: `const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

const SECRET = 'hardcoded-secret-123';  // 硬编码密钥

app.use(express.json());

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 直接拼接 SQL 查询
  const query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";

  db.query(query, (err, results) => {
    if (results.length > 0) {
      const token = jwt.sign({ username }, SECRET);
      res.json({ token });
    } else {
      res.status(401).json({ error: '登录失败' });
    }
  });
});

app.listen(3000);`,
    issues: [
      { line: 5, description: 'JWT 密钥硬编码在源码中，应该使用环境变量', severity: 'error' },
      { line: 12, description: 'SQL 注入漏洞：直接拼接用户输入到 SQL 语句', severity: 'error' },
      { line: 12, description: '密码应该使用 bcrypt 等算法哈希存储，不能明文比较', severity: 'warning' },
      { line: 17, description: 'JWT token 没有设置过期时间（expiresIn）', severity: 'warning' },
    ],
    rubric: '找出所有 error 级别问题得 70 分，warning 各加 15 分',
  },
];

@Injectable()
export class ReviewChallengeService {
  private readonly logger = new Logger(ReviewChallengeService.name);
  private readonly challenges = new Map<string, ReviewChallenge>();

  constructor() {
    for (const ch of REVIEW_CHALLENGES) {
      this.challenges.set(ch.challengeId, ch);
    }
  }

  /** 获取所有评审题目 */
  getAllChallenges(nodeId?: string): ReviewChallenge[] {
    const all = Array.from(this.challenges.values());
    if (nodeId) {
      return all.filter(c => c.nodeId === nodeId);
    }
    return all;
  }

  /** 获取单个评审题目（不含标准答案） */
  getChallenge(challengeId: string): Omit<ReviewChallenge, 'issues'> | null {
    const ch = this.challenges.get(challengeId);
    if (!ch) return null;
    const { issues, ...rest } = ch;
    return rest;
  }

  /** 提交评审结果 */
  submitReview(submission: ReviewSubmission): ReviewChallengeResult {
    const challenge = this.challenges.get(submission.challengeId);
    if (!challenge) {
      return {
        challengeId: submission.challengeId,
        score: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 },
        userFindings: submission.findings,
        expectedIssues: [],
        comparison: [],
        feedback: '题目不存在',
      };
    }

    const expected = challenge.issues;
    const userFindings = submission.findings;

    // 构建比较表
    const comparison: ReviewChallengeResult['comparison'] = expected.map(issue => {
      const userMatch = userFindings.find(f => Math.abs(f.line - issue.line) <= 1);
      return {
        line: issue.line,
        userFound: !!userMatch,
        expectedSeverity: issue.severity,
        userSeverity: userMatch?.severity,
        matched: !!userMatch && userMatch.severity === issue.severity,
      };
    });

    // 计算 precision / recall / accuracy
    const truePositives = comparison.filter(c => c.userFound).length;
    const falsePositives = userFindings.filter(f =>
      !expected.some(e => Math.abs(e.line - f.line) <= 1)
    ).length;
    const falseNegatives = comparison.filter(c => !c.userFound).length;
    const total = expected.length;

    const precision = truePositives + falsePositives > 0
      ? (truePositives / (truePositives + falsePositives)) * 100 : 0;
    const recall = total > 0
      ? (truePositives / total) * 100 : 0;
    const f1Score = precision + recall > 0
      ? (2 * precision * recall) / (precision + recall) : 0;
    const accuracy = total > 0
      ? ((total - falseNegatives) / total) * 100 : 0;

    const score: ReviewScore = {
      accuracy: Math.round(accuracy),
      precision: Math.round(precision),
      recall: Math.round(recall),
      f1Score: Math.round(f1Score),
    };

    return {
      challengeId: submission.challengeId,
      score,
      userFindings,
      expectedIssues: expected,
      comparison,
      feedback: this.generateFeedback(score, comparison),
    };
  }

  private generateFeedback(score: ReviewScore, comparison: ReviewChallengeResult['comparison']): string {
    const parts: string[] = [];

    if (score.f1Score >= 90) {
      parts.push('出色的代码评审能力！');
    } else if (score.f1Score >= 70) {
      parts.push('评审做得不错，但还有一些遗漏。');
    } else if (score.f1Score >= 50) {
      parts.push('发现了部分问题，但还有提升空间。');
    } else {
      parts.push('需要加强对代码问题的识别能力。');
    }

    const missed = comparison.filter(c => !c.userFound);
    if (missed.length > 0) {
      parts.push(`遗漏了 ${missed.length} 个问题（行号: ${missed.map(m => m.line).join(', ')}）`);
    }

    const wrongSeverity = comparison.filter(c => c.userFound && !c.matched);
    if (wrongSeverity.length > 0) {
      parts.push(`${wrongSeverity.length} 个问题的严重程度判断不准确`);
    }

    return parts.join('。');
  }
}
