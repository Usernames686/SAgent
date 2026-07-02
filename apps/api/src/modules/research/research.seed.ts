export interface ResearchArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  level: string;
  author: string;
  views: number;
  likes: number;
  desc: string;
  tags: string[];
  content: string;
  publishedAt: string;
}

export const RESEARCH_ARTICLES: ResearchArticle[] = [
  {
    id: 'research-001',
    title: 'Vibe Coding 的氛围抽象方法',
    category: 'AI',
    readTime: '18min',
    level: '中级',
    author: 'sAgent Lab',
    views: 11230,
    likes: 789,
    desc: '从视觉、交互、工程约束三个层面拆解氛围描述如何变成可执行 Prompt。',
    tags: ['Vibe Coding', 'Prompt', 'AI IDE'],
    publishedAt: '2026-06-20T10:00:00.000Z',
    content: [
      '氛围编程不是只写一句“做得高级一点”，而是把模糊感受拆成可验证的设计约束。',
      '一个可执行的氛围描述通常包含视觉语义、交互节奏、信息密度、技术栈边界和验收标准。',
      '在 sAgent 中，学习者会先表达目标，再通过 Vibe Lab、代码评审、Bug Hunt 等环节迭代输出，逐步形成“描述 -> 生成 -> 检查 -> 修正”的闭环。',
    ].join('\n\n'),
  },
  {
    id: 'research-002',
    title: 'React 组件设计与 AI 生成代码质量',
    category: '前端',
    readTime: '16min',
    level: '中级',
    author: 'Frontend Research',
    views: 8340,
    likes: 512,
    desc: '分析 AI 生成 React 组件时常见的状态、样式和可维护性问题。',
    tags: ['React', 'Code Review', 'Quality'],
    publishedAt: '2026-06-18T10:00:00.000Z',
    content: [
      'AI 很容易生成“看起来能跑”的组件，但真实项目更关心状态边界、错误处理、加载态和复用方式。',
      '组件质量评审应覆盖 props 契约、状态来源、空状态、失败状态、交互反馈和可访问性。',
      '把这些要求写入 Prompt，可以显著降低返工成本。',
    ].join('\n\n'),
  },
  {
    id: 'research-003',
    title: 'NestJS 教学项目中的接口契约治理',
    category: '后端',
    readTime: '20min',
    level: '高级',
    author: 'Backend Guild',
    views: 6790,
    likes: 388,
    desc: '围绕 DTO、统一响应、Swagger 和前端 API client 的一致性展开。',
    tags: ['NestJS', 'API', 'Contract'],
    publishedAt: '2026-06-16T10:00:00.000Z',
    content: [
      '接口契约治理的核心是让前后端围绕同一份事实工作。',
      '后端负责稳定路由、状态码、响应结构和错误语义；前端通过统一 API client 消化鉴权和解包逻辑。',
      'API Playground 应发送真实请求，而不是展示样例响应，否则很容易掩盖契约漂移。',
    ].join('\n\n'),
  },
  {
    id: 'research-004',
    title: '编程学习平台的数据闭环',
    category: '教育',
    readTime: '15min',
    level: '通用',
    author: 'EdTech Research',
    views: 7420,
    likes: 431,
    desc: '如何用行为数据、提交历史、掌握度和复习队列驱动个性化学习。',
    tags: ['Learning Analytics', 'SM-2', 'Personalization'],
    publishedAt: '2026-06-14T10:00:00.000Z',
    content: [
      '有效的学习平台不只记录“看过什么”，更要记录练习结果、错误类型、复习间隔和反馈偏好。',
      '这些数据可以驱动下一步推荐、薄弱点复练、掌握度热力图和教学策略进化。',
      'sAgent 的 Vibe Learning 模块已经具备这些闭环的基础结构。',
    ].join('\n\n'),
  },
];
