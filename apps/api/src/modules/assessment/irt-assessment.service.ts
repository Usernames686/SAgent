// IRT 自适应能力诊断引擎
// 基于项目反应理论（Item Response Theory）3 参数 Logistic 模型
// P(θ) = c + (1 - c) / (1 + e^(-a * (θ - b)))

import { Injectable, Logger } from '@nestjs/common';

// ===== IRT 试题 =====
export interface AssessmentQuestion {
  id: string;
  domain: string;         // 能力维度
  difficulty: number;     // 难度参数 b（-3 ~ 3）
  discrimination: number; // 区分度参数 a（0.5 ~ 2.5）
  guessRate: number;      // 猜测概率 c（0 ~ 0.5）
  question: string;
  options: string[];      // 选项（A/B/C/D）
  correctIndex: number;   // 正确答案索引
  explanation: string;    // 解析
  timeLimit?: number;     // 建议用时（秒）
}

// ===== 能力评估结果 =====
export interface AbilityEstimate {
  theta: number;               // 当前能力值 θ（-3 ~ 3）
  standardError: number;       // 标准误 SE(θ)
  confidenceInterval: [number, number]; // 95% 置信区间
  dimensions: Record<string, number>;   // 各维度能力值
  answeredCount: number;
  correctCount: number;
  isComplete: boolean;         // 是否达到终止条件
  totalQuestions: number;      // 总答题数
}

// ===== 终止条件 =====
export const IRT_STOP_CONDITIONS = {
  MIN_QUESTIONS: 8,            // 最少 8 题
  MAX_QUESTIONS: 20,           // 最多 20 题
  SE_THRESHOLD: 0.5,          // 标准误低于此值可终止
};

// ===== 默认试题池 =====
const QUESTION_POOL: AssessmentQuestion[] = [
  // ---- 编程基础 ----
  {
    id: 'IRT-PF-001', domain: 'programming_fundamentals',
    difficulty: -2.0, discrimination: 1.2, guessRate: 0.25,
    question: '以下哪个是 JavaScript 中正确的变量声明方式？',
    options: ['variable x = 10', 'v x = 10', 'let x = 10', 'int x = 10'],
    correctIndex: 2,
    explanation: 'let 是 ES6 引入的块级作用域变量声明关键字。',
  },
  {
    id: 'IRT-PF-002', domain: 'programming_fundamentals',
    difficulty: -1.0, discrimination: 1.5, guessRate: 0.2,
    question: '以下代码输出什么？\nconsole.log(typeof "Hello")',
    options: ['string', 'hello', 'String', 'undefined'],
    correctIndex: 0,
    explanation: 'typeof 运算符返回一个字符串，表示操作数的类型。"Hello" 是字符串字面量，所以返回 "string"。',
  },
  {
    id: 'IRT-PF-003', domain: 'programming_fundamentals',
    difficulty: 0.5, discrimination: 1.8, guessRate: 0.15,
    question: '以下代码输出什么？\nconsole.log(0.1 + 0.2 === 0.3)',
    options: ['true', 'false', 'undefined', 'NaN'],
    correctIndex: 1,
    explanation: '由于浮点数精度问题，0.1 + 0.2 = 0.30000000000000004 !== 0.3。',
  },
  {
    id: 'IRT-PF-004', domain: 'programming_fundamentals',
    difficulty: 1.0, discrimination: 2.0, guessRate: 0.1,
    question: '以下哪种不是 JavaScript 的作用域类型？',
    options: ['全局作用域', '函数作用域', '块级作用域', '类作用域'],
    correctIndex: 3,
    explanation: 'JavaScript 有全局、函数和块级作用域（let/const），没有"类作用域"。',
  },
  // ---- 数据结构 ----
  {
    id: 'IRT-DS-001', domain: 'data_structures',
    difficulty: -1.5, discrimination: 1.0, guessRate: 0.25,
    question: '数组的索引从什么数字开始？',
    options: ['0', '1', '-1', '取决于语言'],
    correctIndex: 0,
    explanation: '大多数编程语言中，数组索引从 0 开始。',
  },
  {
    id: 'IRT-DS-002', domain: 'data_structures',
    difficulty: 0.0, discrimination: 1.5, guessRate: 0.2,
    question: '以下哪种数据结构是"先进后出"（LIFO）的？',
    options: ['队列 (Queue)', '栈 (Stack)', '链表 (Linked List)', '哈希表 (Hash Table)'],
    correctIndex: 1,
    explanation: '栈（Stack）是 LIFO 结构，像一叠盘子，后放上去的先取走。',
  },
  {
    id: 'IRT-DS-003', domain: 'data_structures',
    difficulty: 1.5, discrimination: 2.0, guessRate: 0.15,
    question: '哈希表（Hash Table）的平均查找时间复杂度是多少？',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctIndex: 0,
    explanation: '理想情况下，哈希表通过哈希函数直接定位，平均时间复杂度为 O(1)。',
  },
  {
    id: 'IRT-DS-004', domain: 'data_structures',
    difficulty: 2.0, discrimination: 2.2, guessRate: 0.1,
    question: '红黑树的主要应用场景是什么？',
    options: ['数据库索引', '网络路由', '有序集合的实现', '所有以上'],
    correctIndex: 3,
    explanation: '红黑树是一种自平衡二叉查找树，广泛应用于 TreeMap、TreeSet、数据库索引等场景。',
  },
  // ---- 算法 ----
  {
    id: 'IRT-AL-001', domain: 'algorithms',
    difficulty: -1.0, discrimination: 1.0, guessRate: 0.25,
    question: '二分查找的前提条件是什么？',
    options: ['数据已排序', '数据量小', '数据存储在数组中', '数据无重复'],
    correctIndex: 0,
    explanation: '二分查找要求数据是有序的，这样才能每次排除一半的数据。',
  },
  {
    id: 'IRT-AL-002', domain: 'algorithms',
    difficulty: 0.5, discrimination: 1.5, guessRate: 0.2,
    question: '冒泡排序的平均时间复杂度是什么？',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
    correctIndex: 2,
    explanation: '冒泡排序的平均和最坏时间复杂度都是 O(n²)，因为它需要嵌套循环比较相邻元素。',
  },
  {
    id: 'IRT-AL-003', domain: 'algorithms',
    difficulty: 1.5, discrimination: 2.0, guessRate: 0.15,
    question: '以下哪种算法使用"分治"策略？',
    options: ['线性搜索', '冒泡排序', '归并排序', '插入排序'],
    correctIndex: 2,
    explanation: '归并排序使用分治策略：将数组分成两半，分别排序后合并。',
  },
  {
    id: 'IRT-AL-004', domain: 'algorithms',
    difficulty: 2.5, discrimination: 2.5, guessRate: 0.1,
    question: '动态规划的两个关键特性是什么？',
    options: ['分治和递归', '最优子结构和重叠子问题', '贪心和回溯', '排序和搜索'],
    correctIndex: 1,
    explanation: '动态规划适用于具有最优子结构（最优解包含子问题最优解）和重叠子问题（子问题被重复求解）的问题。',
  },
  // ---- Web 开发 ----
  {
    id: 'IRT-WD-001', domain: 'web_development',
    difficulty: -2.0, discrimination: 0.8, guessRate: 0.25,
    question: 'HTML 中哪个标签用于创建超链接？',
    options: ['<link>', '<a>', '<href>', '<url>'],
    correctIndex: 1,
    explanation: '<a>（anchor）标签用于创建超链接，href 属性指定链接目标。',
  },
  {
    id: 'IRT-WD-002', domain: 'web_development',
    difficulty: -0.5, discrimination: 1.2, guessRate: 0.2,
    question: 'CSS 中哪个属性实现 Flexbox 布局？',
    options: ['display: block', 'display: flex', 'display: grid', 'position: flex'],
    correctIndex: 1,
    explanation: 'display: flex 将一个容器设置为 Flexbox 布局，使其子项具有弹性排列能力。',
  },
  {
    id: 'IRT-WD-003', domain: 'web_development',
    difficulty: 0.5, discrimination: 1.5, guessRate: 0.15,
    question: 'React 中 useEffect 的主要作用是什么？',
    options: ['管理组件状态', '处理副作用', '渲染组件', '优化性能'],
    correctIndex: 1,
    explanation: 'useEffect 用于处理副作用，如数据获取、订阅、手动 DOM 操作等。',
  },
  {
    id: 'IRT-WD-004', domain: 'web_development',
    difficulty: 1.5, discrimination: 2.0, guessRate: 0.1,
    question: 'Next.js 中 App Router 使用什么文件作为根布局？',
    options: ['_app.tsx', 'layout.tsx', 'app.tsx', 'root.tsx'],
    correctIndex: 1,
    explanation: 'App Router 使用 app/layout.tsx 作为根布局文件，包裹所有页面。',
  },
  // ---- 数据库 ----
  {
    id: 'IRT-DB-001', domain: 'database',
    difficulty: -1.0, discrimination: 1.0, guessRate: 0.25,
    question: 'SQL 中哪个关键字用于查询数据？',
    options: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'],
    correctIndex: 2,
    explanation: 'SELECT 是 SQL 中用于查询（检索）数据的关键字。',
  },
  {
    id: 'IRT-DB-002', domain: 'database',
    difficulty: 0.5, discrimination: 1.5, guessRate: 0.2,
    question: '数据库三范式中，第二范式（2NF）的要求是什么？',
    options: ['每列都是原子的', '消除部分函数依赖', '消除传递依赖', '所有属性都依赖于候选键'],
    correctIndex: 1,
    explanation: '2NF 要求满足 1NF，且每个非主属性完全函数依赖于候选键（消除部分依赖）。',
  },
  {
    id: 'IRT-DB-003', domain: 'database',
    difficulty: 1.5, discrimination: 2.0, guessRate: 0.15,
    question: '以下哪种是 NoSQL 数据库的类型？',
    options: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite'],
    correctIndex: 2,
    explanation: 'MongoDB 是文档型 NoSQL 数据库，而 MySQL、PostgreSQL、SQLite 都是关系型数据库。',
  },
  // ---- 系统设计 ----
  {
    id: 'IRT-SD-001', domain: 'system_design',
    difficulty: 0.0, discrimination: 1.0, guessRate: 0.2,
    question: 'RESTful API 中，GET 请求的特性是什么？',
    options: ['有副作用', '幂等的', '只能传少量数据', '需要认证'],
    correctIndex: 1,
    explanation: 'GET 请求是幂等的，多次发送同个 GET 请求不会改变服务端状态。',
  },
  {
    id: 'IRT-SD-002', domain: 'system_design',
    difficulty: 1.0, discrimination: 1.8, guessRate: 0.15,
    question: '在微服务架构中，服务间通信最常用的方式是什么？',
    options: ['共享数据库', 'HTTP/REST 或消息队列', '文件共享', '直接内存访问'],
    correctIndex: 1,
    explanation: '微服务通常通过 HTTP/REST API 同步通信或通过消息队列异步通信。',
  },
  {
    id: 'IRT-SD-003', domain: 'system_design',
    difficulty: 2.5, discrimination: 2.5, guessRate: 0.1,
    question: 'CAP 定理中，分区容错性（P）是必须的，此时需要在哪两者之间权衡？',
    options: ['一致性和可用性', '可靠性和性能', '安全性和可扩展性', '成本和效率'],
    correctIndex: 0,
    explanation: 'CAP 定理指出，分布式系统在分区容错性（P）下，需要在一致性（C）和可用性（A）之间权衡。',
  },
  // ---- Prompt 工程 ----
  {
    id: 'IRT-PE-001', domain: 'prompt_engineering',
    difficulty: -1.5, discrimination: 0.8, guessRate: 0.25,
    question: '以下哪个是 Prompt 工程的核心原则？',
    options: ['尽量简短', '清晰具体的指令', '使用特定格式', '全部大写'],
    correctIndex: 1,
    explanation: 'Prompt 工程的核心是给出清晰、具体、明确的指令，让 AI 准确理解需求。',
  },
  {
    id: 'IRT-PE-002', domain: 'prompt_engineering',
    difficulty: 0.0, discrimination: 1.5, guessRate: 0.2,
    question: 'Few-shot Prompting 的含义是什么？',
    options: ['只给少量输入', '在 Prompt 中提供少量示例', '限制输出长度', '快速生成结果'],
    correctIndex: 1,
    explanation: 'Few-shot Prompting 是在 Prompt 中提供少量输入-输出示例，引导模型按照示例的模式生成。',
  },
  {
    id: 'IRT-PE-003', domain: 'prompt_engineering',
    difficulty: 1.5, discrimination: 2.0, guessRate: 0.15,
    question: 'Chain-of-Thought (CoT) Prompting 的主要优势是什么？',
    options: ['减少 token 消耗', '提升复杂推理能力', '加快生成速度', '支持多语言'],
    correctIndex: 1,
    explanation: 'CoT 通过引导模型展示推理步骤，显著提升复杂推理任务的准确性。',
  },
  // ---- 氛围抽象 ----
  {
    id: 'IRT-VA-001', domain: 'vibe_abstraction',
    difficulty: -1.0, discrimination: 1.0, guessRate: 0.25,
    question: 'Vibe Coding 的核心思想是什么？',
    options: ['手动写每一行代码', '用自然语言描述意图生成代码', '只使用 AI 工具', '放弃代码审查'],
    correctIndex: 1,
    explanation: 'Vibe Coding 的核心是"说意图、定氛围、控结果"——用自然语言描述意图和风格，AI 生成代码。',
  },
  {
    id: 'IRT-VA-002', domain: 'vibe_abstraction',
    difficulty: 0.5, discrimination: 1.5, guessRate: 0.2,
    question: '在 Vibe Coding 中，"氛围"（Vibe）指的是什么？',
    options: ['背景音乐', '代码的视觉风格和交互感受', '编程环境主题', '代码注释风格'],
    correctIndex: 1,
    explanation: '"氛围"指代码的视觉风格、交互效果和整体设计感受，是 Vibe Coding 的核心概念。',
  },
  {
    id: 'IRT-VA-003', domain: 'vibe_abstraction',
    difficulty: 2.0, discrimination: 2.2, guessRate: 0.1,
    question: '以下哪个不属于 Vibe Coding 的交互模式？',
    options: ['氛围描述式', 'Prompt 迭代', '调试修复', '氛围竞猜'],
    correctIndex: 2,
    explanation: 'Vibe Coding 的 5 种交互模式是：氛围描述式、Prompt迭代、配对编程、氛围竞猜、代码审查。调试修复不是独立模式。',
  },
];

@Injectable()
export class IrtAssessmentService {
  private readonly logger = new Logger(IrtAssessmentService.name);

  /**
   * IRT 3 参数 Logistic 模型
   * P(θ) = c + (1 - c) / (1 + e^(-a * (θ - b)))
   */
  probabilityCorrect(theta: number, question: AssessmentQuestion): number {
    const { difficulty: b, discrimination: a, guessRate: c } = question;
    const exponent = -a * (theta - b);
    // 防止 exp 溢出
    const clampedExp = Math.max(-700, Math.min(700, exponent));
    return c + (1 - c) / (1 + Math.exp(clampedExp));
  }

  /**
   * 项目信息函数 I(θ) = [P'(θ)]² / [P(θ) * (1 - P(θ))]
   * 表示某个题目对能力估计提供的信息量
   */
  itemInfo(theta: number, question: AssessmentQuestion): number {
    const { discrimination: a } = question;
    const p = this.probabilityCorrect(theta, question);
    const q = 1 - p;
    if (p <= 0 || q <= 0) return 0;
    // P'(θ) = a * (1 - c) * e^(-a*(θ-b)) / (1 + e^(-a*(θ-b)))²
    const { difficulty: b, guessRate: c } = question;
    const exponent = -a * (theta - b);
    const clampedExp = Math.max(-700, Math.min(700, exponent));
    const expTerm = Math.exp(clampedExp);
    const numerator = a * (1 - c) * expTerm;
    const denominator = Math.pow(1 + expTerm, 2);
    const pDeriv = denominator > 0 ? numerator / denominator : 0;
    return Math.pow(pDeriv, 2) / (p * q);
  }

  /**
   * EAP（Expected A Posteriori）能力估计
   * 使用贝叶斯后验期望估计能力值
   */
  estimateTheta(
    answers: { questionId: string; isCorrect: boolean }[],
    questions: Map<string, AssessmentQuestion>,
    priorMean = 0,
    priorVariance = 1,
  ): AbilityEstimate {
    // 计算每个维度的表现
    const dimensions: Record<string, { correct: number; total: number }> = {};
    for (const ans of answers) {
      const q = questions.get(ans.questionId);
      if (!q) continue;
      if (!dimensions[q.domain]) {
        dimensions[q.domain] = { correct: 0, total: 0 };
      }
      dimensions[q.domain].total++;
      if (ans.isCorrect) dimensions[q.domain].correct++;
    }

    const dimensionScores: Record<string, number> = {};
    for (const [domain, d] of Object.entries(dimensions)) {
      dimensionScores[domain] = d.total > 0 ? Math.round((d.correct / d.total) * 100) / 100 : 0;
    }

    const totalCorrect = answers.filter(a => a.isCorrect).length;
    const totalAnswered = answers.length;

    // EAP 能力估计
    const theta = this.eapEstimate(answers, questions, priorMean, priorVariance);
    const standardError = this.eapStandardError(answers, questions, priorVariance);

    // 检查终止条件
    const isComplete = this.shouldStop(totalAnswered, standardError);

    return {
      theta: Math.round(theta * 100) / 100,
      standardError: Math.round(standardError * 100) / 100,
      confidenceInterval: [
        Math.round((theta - 1.96 * standardError) * 100) / 100,
        Math.round((theta + 1.96 * standardError) * 100) / 100,
      ],
      dimensions: dimensionScores,
      answeredCount: totalAnswered,
      correctCount: totalCorrect,
      isComplete,
      totalQuestions: totalAnswered,
    };
  }

  /**
   * EAP 期望后验估计
   */
  private eapEstimate(
    answers: { questionId: string; isCorrect: boolean }[],
    questions: Map<string, AssessmentQuestion>,
    priorMean: number,
    priorVariance: number,
  ): number {
    // 使用 30 点高斯-埃尔米特求积近似
    const quadPoints = 30;
    const nodes = this.gaussHermiteNodes(quadPoints);

    let numerator = 0;
    let denominator = 0;

    for (const node of nodes) {
      const theta = node;
      const prior = this.normalPdf(theta, priorMean, Math.sqrt(priorVariance));

      let likelihood = 1;
      for (const ans of answers) {
        const q = questions.get(ans.questionId);
        if (!q) continue;
        const p = this.probabilityCorrect(theta, q);
        likelihood *= ans.isCorrect ? p : (1 - p);
      }

      const weight = theta * prior * likelihood;
      numerator += weight;
      denominator += prior * likelihood;
    }

    return denominator > 0 ? numerator / denominator : priorMean;
  }

  /**
   * EAP 标准误
   */
  private eapStandardError(
    answers: { questionId: string; isCorrect: boolean }[],
    questions: Map<string, AssessmentQuestion>,
    priorVariance: number,
  ): number {
    const theta = this.eapEstimate(answers, questions, 0, priorVariance);

    let infoSum = 0;
    for (const ans of answers) {
      const q = questions.get(ans.questionId);
      if (q) infoSum += this.itemInfo(theta, q);
    }

    const posteriorVariance = 1 / (1 / priorVariance + infoSum);
    return Math.sqrt(posteriorVariance);
  }

  /**
   * 选择下一个最优试题（最大信息量法）
   */
  selectNextQuestion(
    theta: number,
    answeredIds: Set<string>,
    domain?: string,
  ): AssessmentQuestion | null {
    let pool = QUESTION_POOL;
    if (domain) {
      pool = QUESTION_POOL.filter(q => q.domain === domain);
    }

    const candidates = pool.filter(q => !answeredIds.has(q.id));
    if (candidates.length === 0) return null;

    // 选择信息量最大的题目
    let bestQuestion: AssessmentQuestion | null = null;
    let bestInfo = -1;

    for (const q of candidates) {
      const info = this.itemInfo(theta, q);
      if (info > bestInfo) {
        bestInfo = info;
        bestQuestion = q;
      }
    }

    return bestQuestion;
  }

  /**
   * 判断是否达到终止条件
   */
  shouldStop(answeredCount: number, standardError: number): boolean {
    // 达到最少题数且标准误足够低
    if (answeredCount >= IRT_STOP_CONDITIONS.MIN_QUESTIONS && standardError <= IRT_STOP_CONDITIONS.SE_THRESHOLD) {
      return true;
    }
    // 达到最大题数强制终止
    if (answeredCount >= IRT_STOP_CONDITIONS.MAX_QUESTIONS) {
      return true;
    }
    return false;
  }

  /**
   * 获取试题池（可选按领域筛选）
   */
  getQuestionPool(domain?: string): AssessmentQuestion[] {
    if (domain) return QUESTION_POOL.filter(q => q.domain === domain);
    return [...QUESTION_POOL];
  }

  /**
   * 获取初始试题（推荐中等难度）
   */
  getInitialQuestions(count: number = 3): AssessmentQuestion[] {
    // 选择各领域的中等难度题作为开场
    const domains = [...new Set(QUESTION_POOL.map(q => q.domain))];
    const selected: AssessmentQuestion[] = [];

    for (const domain of domains) {
      const domainQuestions = QUESTION_POOL.filter(q => q.domain === domain);
      // 选难度接近 0 的
      domainQuestions.sort((a, b) => Math.abs(a.difficulty) - Math.abs(b.difficulty));
      if (domainQuestions.length > 0) selected.push(domainQuestions[0]);
    }

    return selected.slice(0, count);
  }

  /**
   * 将能力值 θ 映射为等级
   */
  thetaToLevel(theta: number): 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert' {
    if (theta < -1.5) return 'beginner';
    if (theta < -0.5) return 'elementary';
    if (theta < 0.5) return 'intermediate';
    if (theta < 1.5) return 'advanced';
    return 'expert';
  }

  /**
   * 将能力值 θ 映射为 0-100 分
   */
  thetaToScore(theta: number): number {
    return Math.round((theta + 3) / 6 * 100);
  }

  // ===== 辅助数学函数 =====

  private normalPdf(x: number, mean: number, std: number): number {
    const variance = std * std;
    const exponent = -Math.pow(x - mean, 2) / (2 * variance);
    return Math.exp(Math.max(-700, exponent)) / Math.sqrt(2 * Math.PI * variance);
  }

  private gaussHermiteNodes(n: number): number[] {
    // 简化的高斯-埃尔米特节点（n=30）
    // 在实际系统中应使用预计算表或数值库
    const nodes: number[] = [];
    const step = 6 / (n + 1); // 范围 [-3, 3]
    for (let i = 0; i < n; i++) {
      nodes.push(-3 + (i + 1) * step);
    }
    return nodes;
  }
}
