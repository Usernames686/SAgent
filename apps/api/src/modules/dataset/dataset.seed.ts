export interface DatasetDefinition {
  id: string;
  name: string;
  rows: number;
  size: string;
  desc: string;
  format: 'CSV' | 'JSON';
  columns: string[];
  stats: { users: number; avgTime: string; completionRate: string };
  sampleRows: Record<string, string | number | boolean>[];
}

export const DATASETS: DatasetDefinition[] = [
  {
    id: 'learning-behavior',
    name: '编程学习行为数据',
    rows: 125000,
    size: '2.3 MB',
    desc: '用户编程行为、答题记录、学习时长分布、错误模式分析、代码提交频率。',
    format: 'CSV',
    columns: ['user_id', 'action', 'timestamp', 'duration', 'result'],
    stats: { users: 12500, avgTime: '45min', completionRate: '78%' },
    sampleRows: [
      { user_id: 'u_001', action: 'code_submit', timestamp: '2026-06-20T10:00:00Z', duration: 38, result: 'pass' },
      { user_id: 'u_002', action: 'hint_request', timestamp: '2026-06-20T10:03:00Z', duration: 12, result: 'continue' },
      { user_id: 'u_003', action: 'quiz_submit', timestamp: '2026-06-20T10:07:00Z', duration: 6, result: 'fail' },
    ],
  },
  {
    id: 'code-quality',
    name: '代码质量评估数据',
    rows: 45000,
    size: '1.8 MB',
    desc: '代码质量评分、风格分析、复杂度指标、最佳实践遵循度、重构建议。',
    format: 'JSON',
    columns: ['code_id', 'quality_score', 'style', 'complexity'],
    stats: { users: 4500, avgTime: '30min', completionRate: '82%' },
    sampleRows: [
      { code_id: 'c_001', quality_score: 86, style: 'clean', complexity: 4 },
      { code_id: 'c_002', quality_score: 63, style: 'needs_refactor', complexity: 8 },
      { code_id: 'c_003', quality_score: 91, style: 'typed', complexity: 3 },
    ],
  },
  {
    id: 'knowledge-mastery',
    name: '知识点掌握数据',
    rows: 89000,
    size: '950 KB',
    desc: '知识掌握概率、学习进度、遗忘曲线、前置知识依赖关系。',
    format: 'CSV',
    columns: ['user_id', 'kp_id', 'mastery', 'last_review'],
    stats: { users: 8900, avgTime: '60min', completionRate: '65%' },
    sampleRows: [
      { user_id: 'u_001', kp_id: 'JS-001', mastery: 0.92, last_review: '2026-06-20' },
      { user_id: 'u_002', kp_id: 'REACT-003', mastery: 0.67, last_review: '2026-06-18' },
      { user_id: 'u_003', kp_id: 'VIBE-004', mastery: 0.74, last_review: '2026-06-19' },
    ],
  },
  {
    id: 'ai-tutor-interactions',
    name: 'AI 辅导交互数据',
    rows: 234000,
    size: '4.5 MB',
    desc: '对话记录、满意度评分、Agent 调用日志、响应质量、Token 消耗。',
    format: 'JSON',
    columns: ['session_id', 'agent', 'tokens', 'rating'],
    stats: { users: 23400, avgTime: '15min', completionRate: '88%' },
    sampleRows: [
      { session_id: 's_001', agent: 'tutor', tokens: 860, rating: 5 },
      { session_id: 's_002', agent: 'debug', tokens: 1240, rating: 4 },
      { session_id: 's_003', agent: 'vibe', tokens: 2120, rating: 5 },
    ],
  },
];
