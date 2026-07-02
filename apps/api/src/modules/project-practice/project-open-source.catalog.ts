export type LicenseRisk = 'permissive' | 'copyleft' | 'reference-only';

export interface OpenSourceImportTask {
  id: string;
  title: string;
  description: string;
  acceptance: string[];
}

export interface OpenSourceProjectReference {
  id: string;
  name: string;
  sourceUrl: string;
  license: string;
  licenseRisk: LicenseRisk;
  category: string;
  summary: string;
  applicableNodeIds: string[];
  transferableFeatures: string[];
  integrationNotes: string[];
  importTasks: OpenSourceImportTask[];
}

export const OPEN_SOURCE_PROJECT_REFERENCES: OpenSourceProjectReference[] = [
  {
    id: 'hoppscotch-api-workspace',
    name: 'Hoppscotch API Workspace',
    sourceUrl: 'https://github.com/hoppscotch/hoppscotch',
    license: 'MIT',
    licenseRisk: 'permissive',
    category: 'API 演练 / 请求工作台',
    summary: '参考其请求集合、环境变量、历史记录、响应查看器，把 API 演练场从单次请求工具升级为可复用工作台。',
    applicableNodeIds: ['PROJ-002', 'PROJ-003', 'PROJ-005'],
    transferableFeatures: ['请求集合', '环境变量', '请求历史', '响应状态/耗时面板', 'Authorization 预设'],
    integrationNotes: [
      '可直接借鉴功能结构，但 UI 与数据模型按本项目重写。',
      '适合先落地在 /dashboard/api-playground，再接入项目提交验收。',
    ],
    importTasks: [
      {
        id: 'api-collection',
        title: '搬运 API 集合能力',
        description: '为项目定义一组可复用 API 请求模板，支持按认证、资源和场景分组。',
        acceptance: ['可新增/选择请求模板', '支持 GET/POST/PUT/DELETE', '保留请求体示例', '能标记是否需要 JWT'],
      },
      {
        id: 'env-vars',
        title: '搬运环境变量能力',
        description: '支持 {{baseUrl}}、{{token}} 这类变量替换，让本地/云端 API 可以切换。',
        acceptance: ['变量可编辑', '发送前完成变量替换', '缺变量时有提示', '默认包含本地 API 地址'],
      },
      {
        id: 'request-history',
        title: '搬运请求历史能力',
        description: '记录最近请求的状态码、耗时、时间和响应摘要，便于复盘联调。',
        acceptance: ['保留最近 20 条', '显示状态码和耗时', '可一键恢复请求', '失败请求有错误信息'],
      },
    ],
  },
  {
    id: 'project-based-learning-catalog',
    name: 'Project Based Learning',
    sourceUrl: 'https://github.com/practical-tutorials/project-based-learning',
    license: 'MIT',
    licenseRisk: 'permissive',
    category: '项目化学习目录',
    summary: '参考其按语言/领域组织项目教程的方式，把项目实战扩展成“项目库 + 难度 + 交付物 + 验收”的学习路径。',
    applicableNodeIds: ['PROJ-001', 'PROJ-002', 'PROJ-004'],
    transferableFeatures: ['项目分类目录', '语言/技术栈标签', '从小到大的项目阶梯', '教程链接归档'],
    integrationNotes: [
      '不直接复制教程正文，只保留学习目录形态和外链引用。',
      '适合补齐项目实战的推荐项目、前置知识和下一步项目。',
    ],
    importTasks: [
      {
        id: 'project-catalog',
        title: '搬运项目目录能力',
        description: '把项目按前端、全栈、AI、部署等分类，形成可筛选项目库。',
        acceptance: ['至少 4 个分类', '支持技术栈标签', '每个项目有难度和耗时', '每个项目有交付物'],
      },
      {
        id: 'learning-ladder',
        title: '搬运项目阶梯能力',
        description: '为每个项目标注前置项目和后续项目，让学习路线更像真实开源课程。',
        acceptance: ['显示前置项目', '显示后续推荐', '能解释推荐原因', '避免孤立项目卡片'],
      },
    ],
  },
  {
    id: 'judge0-submission-runner',
    name: 'Judge0 CE',
    sourceUrl: 'https://github.com/judge0/judge0',
    license: 'GPL-3.0',
    licenseRisk: 'copyleft',
    category: '在线评测 / 提交反馈',
    summary: '参考其提交、运行状态、用例反馈模型，完善编程练习的运行结果、通过率和错误提示。',
    applicableNodeIds: ['PROJ-002', 'PROJ-003', 'PROJ-005'],
    transferableFeatures: ['多语言执行', '提交状态机', '测试用例反馈', '运行耗时', '错误输出'],
    integrationNotes: [
      'GPL-3.0 不适合直接复制代码到当前项目，建议只借鉴模型或以独立服务/API 方式接入。',
      '当前项目已有 sandbox，可先补提交状态和用例反馈，不直接引入 Judge0 代码。',
    ],
    importTasks: [
      {
        id: 'submission-status',
        title: '搬运提交状态机',
        description: '为代码提交增加 queued/running/accepted/wrong_answer/runtime_error 等状态。',
        acceptance: ['状态可视化', '错误和通过分开显示', '保留运行耗时', '支持重新提交'],
      },
      {
        id: 'case-feedback',
        title: '搬运用例反馈',
        description: '展示每个测试用例的输入、期望输出、实际输出和错误信息。',
        acceptance: ['逐用例展示', '隐藏用例可隐藏细节', '通过率明确', '失败原因可读'],
      },
    ],
  },
  {
    id: 'freecodecamp-learning-loop',
    name: 'freeCodeCamp Learning Loop',
    sourceUrl: 'https://github.com/freeCodeCamp/freeCodeCamp',
    license: 'BSD-3-Clause',
    licenseRisk: 'permissive',
    category: '课程 / 练习 / 认证闭环',
    summary: '参考其“讲解-练习-测试-认证”的闭环，让氛围编程和项目实战不只是页面展示，而有阶段目标和证据。',
    applicableNodeIds: ['PROJ-001', 'PROJ-002', 'PROJ-003', 'PROJ-004', 'PROJ-005'],
    transferableFeatures: ['挑战式练习', '阶段认证', '测试驱动反馈', '学习进度证据'],
    integrationNotes: [
      '不复制课程正文，只借鉴学习闭环和认证结构。',
      '适合增强项目实战的验收评分和成就系统。',
    ],
    importTasks: [
      {
        id: 'certification-rubric',
        title: '搬运阶段认证能力',
        description: '把项目验收拆成需求、实现、测试、复盘四个证据维度。',
        acceptance: ['每个维度有分数', '提交后生成评语', '80 分以上验收', '可查看最近提交'],
      },
      {
        id: 'evidence-based-progress',
        title: '搬运证据式进度',
        description: '进度不只看点击，而看代码、预览、测试、说明等真实产物。',
        acceptance: ['统计提交物', '统计测试用例', '统计说明完整度', '进度与证据绑定'],
      },
    ],
  },
];

export function getOpenSourceReferencesForProject(nodeId?: string) {
  if (!nodeId) return OPEN_SOURCE_PROJECT_REFERENCES;
  const exact = OPEN_SOURCE_PROJECT_REFERENCES.filter((item) => item.applicableNodeIds.includes(nodeId));
  return exact.length > 0 ? exact : OPEN_SOURCE_PROJECT_REFERENCES;
}
