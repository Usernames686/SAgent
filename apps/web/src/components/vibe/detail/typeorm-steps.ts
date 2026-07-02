import type { DetailStep, StepSection } from '@/components/vibe/detail/KnowledgeDetailPage';

export const STEPS: DetailStep[] = [
  {
    id: 0,
    title: '从生活出发：TypeORM数据库',
    subtitle: '5 分钟 · 零基础友好',
    sections: [
      { type: 'intro', title: '📖 TypeORM数据库', text: '操作数据库像操作对象。让我们从最基础的概念开始，逐步深入。', variant: 'teal' },
      { type: 'code', title: '📝 快速预览', code: '// NODE-010 - TypeORM数据库\n// 在后续步骤中逐步展开', variant: 'teal' },
    ],
  },
  {
    id: 1,
    title: '核心概念',
    subtitle: '8 分钟 · 理解原理',
    sections: [
      { type: 'intro', title: '核心原理', text: 'TypeORM数据库的核心原理和关键概念，这是理解后续内容的基础。', variant: 'teal' },
      { type: 'code', title: '代码示例', code: '// 核心概念示例\nconsole.log("NODE-010 core");', variant: 'teal' },
      { type: 'success', text: '理解核心概念后，接下来看实际应用。' },
    ],
  },
  {
    id: 2,
    title: '实战应用',
    subtitle: '8 分钟 · 动手实践',
    sections: [
      { type: 'intro', title: '实际开发中的用法', text: 'TypeORM数据库在实际项目中最常见的使用场景和模式。', variant: 'teal' },
      { type: 'code', title: '实战代码', code: '// 实战示例\n// NODE-010 practical usage', variant: 'teal' },
      { type: 'tip', title: '💡 最佳实践', text: '在实际开发中使用TypeORM数据库的推荐方式和常见陷阱。' },
    ],
  },
  {
    id: 3,
    title: '常见陷阱与总结',
    subtitle: '5 分钟 · 避坑指南',
    sections: [
      { type: 'warning', text: 'TypeORM数据库最常见的陷阱和需要注意的边界情况。', variant: 'red' },
      { type: 'code', title: '📝 速查表', code: '// NODE-010 速查表\n// 常用API和模式一览' },
      { type: 'success', text: '恭喜完成TypeORM数据库的学习！🎉' },
    ],
  },
];

export const TOTAL_STEPS = STEPS.length;
