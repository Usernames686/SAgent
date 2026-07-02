/**
 * 氛围学习 - 分阶段教学配置
 *
 * 5 个学习阶段，涵盖 69 个知识点：
 *   Phase 1: 基础夯实 (14 讲) - JS 核心基础
 *   Phase 2: 进阶突破 (27 讲) - Node.js 服务端 (23) + 前端三件套 (8) → 实际 NODE 23 个 + FE 8 个
 *   Phase 3: 框架实战 (18 讲) - React 基础
 *   Phase 4: 工程规范 (3 讲)  - 工程化与部署
 *   Phase 5: 精通掌握 (3 讲)  - AI + 现代开发
 *
 * 数据来源：apps/api/src/modules/vibe-learning/knowledge-seed.data.ts
 */

// ── Types ──

export interface PhaseConfig {
  id: string;
  index: number;
  title: string;
  emoji: string;
  description: string;
  goal: string;
  outcome: string;
  prerequisite: string | null;
  color: string;          // gradient-from color
  colorTo: string;        // gradient-to color
  colorAccent: string;    // accent/text color
  modules: ModuleConfig[];
}

export interface ModuleConfig {
  id: string;
  name: string;
  emoji: string;
  nodeIds: string[];
}

/** 学习闭环步骤 — 与 page.tsx LearningMode 对齐 */
export type LearningLoopStep = 'concept' | 'code' | 'quiz';

export const LOOP_STEPS: { key: LearningLoopStep; label: string; emoji: string; icon: string }[] = [
  { key: 'concept', label: '概念理解', emoji: '📖', icon: 'BookOpen' },
  { key: 'code',    label: '动手实践', emoji: '💻', icon: 'Code2' },
  { key: 'quiz',    label: '评估反馈', emoji: '📝', icon: 'Brain' },
];

// ── Node Name Map (69 knowledge points) ──
// 与后端 knowledge-seed.data.ts 完全对齐

export const NODE_NAMES: Record<string, string> = {
  // P1: JavaScript 核心基础 (14)
  'JS-001': '变量与数据类型',
  'JS-002': '运算符与表达式',
  'JS-003': '条件与循环',
  'JS-004': '函数基础',
  'JS-005': '数组方法',
  'JS-006': '字符串与模板字面量',
  'JS-007': '解构与展开',
  'JS-008': '闭包与作用域',
  'JS-009': '类与原型继承',
  'JS-010': 'Promise 与异步',
  'JS-011': 'async/await',
  'JS-012': 'ES Modules',
  'JS-013': '错误处理与调试',
  'JS-014': '生成器与迭代器',

  // P2: Node.js 服务端开发 (23)
  'NODE-001': 'Node.js 运行时与模块系统',
  'NODE-002': '文件系统操作',
  'NODE-003': 'HTTP 服务器',
  'NODE-004': 'NestJS 框架入门',
  'NODE-005': 'NestJS 中间件与守卫',
  'NODE-006': '数据库集成',
  'NODE-007': 'RESTful API 开发',
  'NODE-008': '身份认证与授权',
  'NODE-009': 'WebSocket 实时通信',
  'NODE-010': 'TypeScript 基础',
  'NODE-011': 'NestJS 进阶',
  'NODE-012': '测试策略',
  'NODE-013': '流与 Buffer',
  'NODE-014': '进程与集群',
  'NODE-015': '缓存策略',
  'NODE-016': '日志与监控',
  'NODE-017': 'Docker 容器化',
  'NODE-018': 'CI/CD 流水线',
  'NODE-019': '微服务基础',
  'NODE-020': '消息队列原理',
  'NODE-021': '健康检查与监控',
  'NODE-022': '技术选型决策框架',
  'NODE-023': 'LLM 基础概念',

  // P2: 前端三件套 (8)
  'FE-001': 'HTML5 语义化',
  'FE-002': 'CSS 选择器与盒模型',
  'FE-003': 'Flexbox 布局',
  'FE-004': 'Grid 布局',
  'FE-005': '响应式设计',
  'FE-006': 'CSS 动画与过渡',
  'FE-007': 'Tailwind CSS',
  'FE-008': 'JavaScript DOM 操作',

  // P3: React 基础 (18)
  'REACT-001': 'React 项目初始化',
  'REACT-002': 'JSX 与组件基础',
  'REACT-003': 'State 与事件',
  'REACT-004': 'useEffect 与副作用',
  'REACT-005': '数据获取模式',
  'REACT-006': '路由与导航',
  'REACT-007': 'Context 与全局状态',
  'REACT-008': '表单与验证',
  'REACT-009': '性能优化',
  'REACT-010': '自定义 Hook',
  'REACT-011': 'React + TypeScript',
  'REACT-012': '组件设计模式',
  'REACT-013': '服务端渲染 (SSR)',
  'REACT-014': 'Next.js 基础',
  'REACT-015': '状态管理进阶',
  'REACT-016': '测试 React 应用',
  'REACT-017': '部署与发布',
  'REACT-018': '全栈项目实战',

  // P4: 工程化与部署 (3)
  'ENG-001': 'ESLint 代码检查',
  'ENG-002': 'TypeScript 进阶类型',
  'ENG-003': 'RESTful API 设计原则',

  // P5: AI + 现代开发 (3)
  'AI-001': 'AI 辅助编程工具',
  'AI-002': 'RAG 架构',
  'AI-003': 'AI Agent 架构',
};

// ── Node Dependency Map (prerequisites) ──
// 与后端 knowledge-seed.data.ts prerequisites 字段完全对齐

export const NODE_PREREQUISITES: Record<string, string[]> = {
  'JS-001': [],
  'JS-002': ['JS-001'],
  'JS-003': ['JS-002'],
  'JS-004': ['JS-003'],
  'JS-005': ['JS-001', 'JS-004'],
  'JS-006': ['JS-001'],
  'JS-007': ['JS-006'],
  'JS-008': ['JS-004'],
  'JS-009': ['JS-008'],
  'JS-010': ['JS-005', 'JS-009'],
  'JS-011': ['JS-007', 'JS-010'],
  'JS-012': ['JS-004'],
  'JS-013': ['JS-003', 'JS-004'],
  'JS-014': ['JS-005', 'JS-008'],

  'NODE-001': ['JS-012'],
  'NODE-002': ['NODE-001'],
  'NODE-003': ['JS-011', 'NODE-001'],
  'NODE-004': ['NODE-003', 'JS-013'],
  'NODE-005': ['JS-009', 'NODE-004'],
  'NODE-006': ['NODE-002', 'NODE-005'],
  'NODE-007': ['NODE-006'],
  'NODE-008': ['NODE-007'],
  'NODE-009': ['NODE-004'],
  'NODE-010': ['JS-011', 'NODE-004'],
  'NODE-011': ['NODE-005', 'NODE-010'],
  'NODE-012': ['NODE-010'],
  'NODE-013': ['NODE-002'],
  'NODE-014': ['NODE-013'],
  'NODE-015': ['NODE-007', 'NODE-009'],
  'NODE-016': ['NODE-008'],
  'NODE-017': ['NODE-016'],
  'NODE-018': ['NODE-017'],
  'NODE-019': ['NODE-018'],
  'NODE-020': ['NODE-019'],
  'NODE-021': ['NODE-020'],
  'NODE-022': ['NODE-021'],
  'NODE-023': ['NODE-022'],

  'FE-001': [],
  'FE-002': ['FE-001'],
  'FE-003': ['FE-002'],
  'FE-004': ['FE-003'],
  'FE-005': ['FE-004'],
  'FE-006': ['FE-005'],
  'FE-007': ['FE-005'],
  'FE-008': ['FE-002'],

  'REACT-001': ['JS-012', 'FE-007'],
  'REACT-002': ['REACT-001'],
  'REACT-003': ['REACT-002', 'JS-007', 'JS-008'],
  'REACT-004': ['REACT-003'],
  'REACT-005': ['REACT-004', 'JS-011', 'FE-008'],
  'REACT-006': ['REACT-005'],
  'REACT-007': ['REACT-006'],
  'REACT-008': ['REACT-003'],
  'REACT-009': ['REACT-005', 'NODE-004'],
  'REACT-010': ['REACT-004'],
  'REACT-011': ['REACT-010', 'NODE-010'],
  'REACT-012': ['REACT-011'],
  'REACT-013': ['REACT-012'],
  'REACT-014': ['REACT-013'],
  'REACT-015': ['REACT-007'],
  'REACT-016': ['REACT-011'],
  'REACT-017': ['REACT-016'],
  'REACT-018': ['REACT-017'],

  'ENG-001': ['JS-013'],
  'ENG-002': ['ENG-001', 'NODE-010'],
  'ENG-003': ['ENG-002', 'REACT-018'],

  'AI-001': ['NODE-023'],
  'AI-002': ['AI-001'],
  'AI-003': ['AI-002'],
};

// ── Phase Configurations ──

export const LEARNING_PHASES: PhaseConfig[] = [
  {
    id: 'foundation',
    index: 1,
    title: '基础夯实',
    emoji: '🧱',
    description: '从零开始掌握 JavaScript 语言核心，打好编程地基',
    goal: '掌握 JavaScript 语言核心',
    outcome: '能独立编写 JS 函数和数据处理逻辑',
    prerequisite: null,
    color: 'from-blue-500',
    colorTo: 'to-indigo-500',
    colorAccent: 'text-blue-400',
    modules: [
      {
        id: 'javascript-basics',
        name: 'JavaScript 核心基础',
        emoji: '📜',
        nodeIds: [
          'JS-001', 'JS-002', 'JS-003', 'JS-004', 'JS-005',
          'JS-006', 'JS-007', 'JS-008', 'JS-009', 'JS-010',
          'JS-011', 'JS-012', 'JS-013', 'JS-014',
        ],
      },
    ],
  },
  {
    id: 'advancement',
    index: 2,
    title: '进阶突破',
    emoji: '⚡',
    description: '掌握服务端开发与前端核心技能，构建全栈能力',
    goal: '掌握服务端开发与前端核心技能',
    outcome: '能搭建 Node.js 服务 + 编写前端页面',
    prerequisite: 'foundation',
    color: 'from-violet-500',
    colorTo: 'to-purple-500',
    colorAccent: 'text-violet-400',
    modules: [
      {
        id: 'nodejs-basics',
        name: 'Node.js 服务端开发',
        emoji: '🟢',
        nodeIds: [
          'NODE-001', 'NODE-002', 'NODE-003', 'NODE-004', 'NODE-005',
          'NODE-006', 'NODE-007', 'NODE-008', 'NODE-009', 'NODE-010',
          'NODE-011', 'NODE-012', 'NODE-013', 'NODE-014', 'NODE-015',
          'NODE-016', 'NODE-017', 'NODE-018', 'NODE-019', 'NODE-020',
          'NODE-021', 'NODE-022', 'NODE-023',
        ],
      },
      {
        id: 'frontend-basics',
        name: '前端三件套',
        emoji: '🎨',
        nodeIds: ['FE-001', 'FE-002', 'FE-003', 'FE-004', 'FE-005', 'FE-006', 'FE-007', 'FE-008'],
      },
    ],
  },
  {
    id: 'framework',
    index: 3,
    title: '框架实战',
    emoji: '🏗️',
    description: '学习 React 核心概念与实战技巧，构建现代 Web 应用',
    goal: '学习 React 核心概念与实战技巧',
    outcome: '能开发完整的 React 单页应用',
    prerequisite: 'advancement',
    color: 'from-orange-500',
    colorTo: 'to-pink-500',
    colorAccent: 'text-orange-400',
    modules: [
      {
        id: 'react-basics',
        name: 'React 基础',
        emoji: '⚛️',
        nodeIds: [
          'REACT-001', 'REACT-002', 'REACT-003', 'REACT-004', 'REACT-005',
          'REACT-006', 'REACT-007', 'REACT-008', 'REACT-009', 'REACT-010',
          'REACT-011', 'REACT-012', 'REACT-013', 'REACT-014', 'REACT-015',
          'REACT-016', 'REACT-017', 'REACT-018',
        ],
      },
    ],
  },
  {
    id: 'engineering',
    index: 4,
    title: '工程规范',
    emoji: '🔧',
    description: '掌握工程化工具链与部署实践，走向专业开发',
    goal: '掌握工程化工具链与部署实践',
    outcome: '能将项目工程化并部署上线',
    prerequisite: 'framework',
    color: 'from-emerald-500',
    colorTo: 'to-teal-500',
    colorAccent: 'text-emerald-400',
    modules: [
      {
        id: 'engineering',
        name: '工程化与部署',
        emoji: '📦',
        nodeIds: ['ENG-001', 'ENG-002', 'ENG-003'],
      },
    ],
  },
  {
    id: 'mastery',
    index: 5,
    title: '精通掌握',
    emoji: '🎓',
    description: 'AI 辅助开发与综合实战，成为全栈 Vibe Coder',
    goal: 'AI 辅助开发与综合实战',
    outcome: '成为全栈 Vibe Coder',
    prerequisite: 'engineering',
    color: 'from-amber-500',
    colorTo: 'to-yellow-500',
    colorAccent: 'text-amber-400',
    modules: [
      {
        id: 'ai-modern',
        name: 'AI + 现代开发',
        emoji: '🤖',
        nodeIds: ['AI-001', 'AI-002', 'AI-003'],
      },
    ],
  },
];

// ── Derived Lookup Maps ──

/** nodeId → 所属 phase id */
export const NODE_PHASE_MAP: Record<string, string> = {};
LEARNING_PHASES.forEach((phase) => {
  phase.modules.forEach((mod) => {
    mod.nodeIds.forEach((nid) => {
      NODE_PHASE_MAP[nid] = phase.id;
    });
  });
});

/** nodeId → 所属 module id */
export const NODE_MODULE_MAP: Record<string, string> = {};
LEARNING_PHASES.forEach((phase) => {
  phase.modules.forEach((mod) => {
    mod.nodeIds.forEach((nid) => {
      NODE_MODULE_MAP[nid] = mod.id;
    });
  });
});

/** phase id → PhaseConfig */
export const PHASE_MAP: Record<string, PhaseConfig> = {};
LEARNING_PHASES.forEach((phase) => {
  PHASE_MAP[phase.id] = phase;
});

/** 获取某个阶段的总讲数 */
export function getPhaseLectureCount(phase: PhaseConfig): number {
  return phase.modules.reduce((sum, m) => sum + m.nodeIds.length, 0);
}

/** 总知识点数 */
export const TOTAL_NODE_COUNT = LEARNING_PHASES.reduce(
  (sum, p) => sum + p.modules.reduce((s, m) => s + m.nodeIds.length, 0),
  0,
);

/** 获取节点名称（带 fallback） */
export function getNodeName(nodeId: string): string {
  return NODE_NAMES[nodeId] || nodeId;
}

/** 检查节点是否已解锁（所有前置条件已满足） */
export function isNodeUnlocked(nodeId: string, completedNodes: Set<string>): boolean {
  const prereqs = NODE_PREREQUISITES[nodeId] || [];
  if (prereqs.length === 0) return true;
  return prereqs.every((p) => completedNodes.has(p));
}

/** 获取下一个推荐节点（同模块内顺序，否则同阶段下一模块第一个，否则下一阶段第一个） */
export function getNextRecommendedNode(
  currentNodeId: string,
  completedNodes: Set<string>,
): string | null {
  const phaseId = NODE_PHASE_MAP[currentNodeId];
  const phase = PHASE_MAP[phaseId];
  if (!phase) return null;

  const allNodeIds = phase.modules.flatMap((m) => m.nodeIds);
  const currentIdx = allNodeIds.indexOf(currentNodeId);

  // 同阶段内找下一个未完成的
  for (let i = currentIdx + 1; i < allNodeIds.length; i++) {
    if (!completedNodes.has(allNodeIds[i])) return allNodeIds[i];
  }

  // 当前阶段全部完成，找下一阶段第一个未完成的
  const phaseIdx = LEARNING_PHASES.findIndex((p) => p.id === phaseId);
  for (let j = phaseIdx + 1; j < LEARNING_PHASES.length; j++) {
    const nextPhaseNodes = LEARNING_PHASES[j].modules.flatMap((m) => m.nodeIds);
    const firstUncompleted = nextPhaseNodes.find((n) => !completedNodes.has(n));
    if (firstUncompleted) return firstUncompleted;
  }

  return null; // 全部完成
}

// ── 学习闭环决策常量（设计方案 §3.1 / §6.2） ──

/** 评估通过阈值：≥ 90% 为通过 */
export const PASS_THRESHOLD = 0.9;

/** 判断评估是否通过 */
export function isPassed(score: number): boolean {
  return score >= PASS_THRESHOLD;
}

/** 获取阶段进度信息 */
export function getPhaseProgress(
  phaseId: string,
  completedNodes: Set<string>,
  knowledgeState: Record<string, number>,
): { completed: number; total: number; progress: number; avgMastery: number } {
  const phase = PHASE_MAP[phaseId];
  if (!phase) return { completed: 0, total: 0, progress: 0, avgMastery: 0 };
  const allNodeIds = phase.modules.flatMap((m) => m.nodeIds);
  const completed = allNodeIds.filter((id) => completedNodes.has(id)).length;
  const total = allNodeIds.length;
  const masteryValues = allNodeIds
    .filter((id) => knowledgeState[id] !== undefined)
    .map((id) => knowledgeState[id]);
  const avgMastery = masteryValues.length > 0
    ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length
    : 0;
  return {
    completed,
    total,
    progress: total > 0 ? completed / total : 0,
    avgMastery,
  };
}
