export interface ProjectTaskDefinition {
  id: string;
  title: string;
  description: string;
  acceptance: string[];
}

export interface ProjectDefinition {
  nodeId: string;
  theme: string;
  deliverables: string[];
  tasks: ProjectTaskDefinition[];
}

const COMMON_TASKS: ProjectTaskDefinition[] = [
  {
    id: 'vibe-brief',
    title: '定义氛围与约束',
    description: '把模糊的产品感觉拆成视觉、交互、技术栈和验收标准。',
    acceptance: ['包含目标用户', '包含视觉关键词', '包含技术栈', '包含不可做事项'],
  },
  {
    id: 'prompt-chain',
    title: '编写 Prompt 链',
    description: '把项目从结构、组件、状态、样式到部署拆成可连续执行的提示词。',
    acceptance: ['至少 4 个连续 Prompt', '每个 Prompt 有明确输出', '包含迭代修正 Prompt'],
  },
  {
    id: 'preview',
    title: '提交可预览成果',
    description: '提交仓库、在线预览或 HTML 片段，便于 AI 与人工验收。',
    acceptance: ['提供仓库或预览地址', '说明核心页面', '列出已完成和未完成内容'],
  },
];

export const PROJECT_DEFINITIONS: ProjectDefinition[] = [
  {
    nodeId: 'PROJ-001',
    theme: '个人作品集',
    deliverables: ['Hero 与个人定位', '项目展示区', '技能标签', '联系方式', '响应式布局'],
    tasks: [
      ...COMMON_TASKS,
      {
        id: 'portfolio-content',
        title: '整理作品集内容',
        description: '准备个人介绍、项目案例、技能栈和联系方式。',
        acceptance: ['至少 3 个项目案例', '每个案例有角色/技术/结果', '包含清晰 CTA'],
      },
    ],
  },
  {
    nodeId: 'PROJ-002',
    theme: '全栈待办应用',
    deliverables: ['任务 CRUD', '用户维度数据模型', '筛选与分页', '状态持久化', '错误处理'],
    tasks: [
      ...COMMON_TASKS,
      {
        id: 'crud-contract',
        title: '设计 CRUD 契约',
        description: '定义数据模型、接口路径、请求体、响应结构和错误码。',
        acceptance: ['包含 GET/POST/PATCH/DELETE', '包含字段校验', '包含空状态和失败状态'],
      },
    ],
  },
  {
    nodeId: 'PROJ-003',
    theme: 'AI 聊天机器人',
    deliverables: ['消息列表', '上下文管理', '流式/加载反馈', '错误重试', 'Prompt 角色设定'],
    tasks: [
      ...COMMON_TASKS,
      {
        id: 'chat-flow',
        title: '设计对话流程',
        description: '定义用户输入、上下文组装、模型调用和回复呈现流程。',
        acceptance: ['包含 session 概念', '包含 loading/错误反馈', '包含上下文截断策略'],
      },
    ],
  },
  {
    nodeId: 'PROJ-004',
    theme: '博客系统',
    deliverables: ['文章列表', '文章详情', '标签/分类', 'MDX 或富文本渲染', 'SEO 元信息'],
    tasks: [
      ...COMMON_TASKS,
      {
        id: 'content-model',
        title: '设计内容模型',
        description: '定义文章、标签、作者、发布时间和发布状态。',
        acceptance: ['包含 Post 模型', '包含 slug', '包含标签或分类', '包含草稿/发布状态'],
      },
    ],
  },
  {
    nodeId: 'PROJ-005',
    theme: 'RAG 知识库',
    deliverables: ['文档上传流程', '切分策略', '检索策略', '问答界面', '引用来源展示'],
    tasks: [
      ...COMMON_TASKS,
      {
        id: 'rag-pipeline',
        title: '设计 RAG 管道',
        description: '规划文档切分、向量化、召回、重排和答案生成流程。',
        acceptance: ['包含 chunk 策略', '包含 topK 检索', '包含引用来源', '包含失败兜底'],
      },
    ],
  },
];

export function getProjectDefinition(nodeId: string) {
  return PROJECT_DEFINITIONS.find((project) => project.nodeId === nodeId);
}
