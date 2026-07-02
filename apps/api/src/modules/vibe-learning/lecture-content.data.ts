/**
 * sAgent 讲授内容数据 — "先讲授、再练习、后考试"
 *
 * 为每个知识点提供结构化的讲授(Lecture)内容：
 * - motivation: 为什么学这个（引入）
 * - concepts: 核心概念讲解（2-4条，渐进深入）
 * - codeExamples: 带注释的代码示例（2-3个，从简到繁）
 * - summary: 要点总结
 * - tips: 常见坑点和最佳实践
 * - thinkQuestions: 启发性思考题（引导理解，不计分）
 */

import { KnowledgePoint } from '../../entities/knowledge-point.entity';

export interface LectureConcept {
  title: string;
  content: string;
  /** ★ 配套 SVG 教学示意图 */
  svgDiagram?: SvgDiagram;
}

/** SVG 教学图描述 */
export interface SvgDiagram {
  /** 图类型 */
  type: 'flowchart' | 'comparison' | 'structure' | 'state' | 'relation' | 'animation';
  /** 图标题 */
  title: string;
  /** SVG 文件路径（存放于 public/images/knowledge-svg/） */
  src: string;
  /** 图下方简要说明 */
  caption: string;
}

export interface CodeExample {
  title: string;
  code: string;
  explanation: string;
}

export interface LectureContent {
  nodeId: string;
  motivation: string;
  concepts: LectureConcept[];
  codeExamples: CodeExample[];
  summary: string;
  tips: string[];
  thinkQuestions: string[];
  /** ★ 详细讲解页面路径，点击后跳转到独立讲解页 */
  detailHref?: string;
  /** ★ 图文并茂扩展字段（可选，按知识点按需填充） */
  richMedia?: RichMediaContent;
}

/** 对比卡片：左右两栏对比 */
export interface ComparisonCard {
  title: string;
  leftLabel: string;
  leftItems: string[];
  rightLabel: string;
  rightItems: string[];
  verdict?: string;
  /** ★ 详细讲解页面路径，点击后在新 Tab 打开 */
  detailHref?: string;
}

/** 类型图鉴条目 */
export interface TypeCard {
  name: string;
  icon: string;
  color: string;
  typeofResult: string;
  example: string;
  note?: string;
}

/** 互动检测台用例 */
export interface TypeCheckCase {
  expression: string;
  answer: string;
  hint?: string;
}

/** 速查表行 */
export interface QuickRefRow {
  syntax: string;
  meaning: string;
  example: string;
}

/** 图文并茂多媒体内容 */
export interface RichMediaContent {
  /** 对比卡片列表 */
  comparisons?: ComparisonCard[];
  /** 类型图鉴（如 JS 七种原始类型的可视化卡片） */
  typeCards?: TypeCard[];
  /** ★ 类型图鉴详细讲解页面路径 */
  typeCardsDetailHref?: string;
  /** 互动类型检测台 */
  typeCheckLab?: TypeCheckCase[];
  /** 速查表 */
  quickRef?: { title: string; rows: QuickRefRow[] };
  /** 视觉比喻/类比 */
  analogy?: { title: string; image: string; explanation: string };
  /** 关系图（节点-边描述，前端渲染） */
  relationMap?: { nodes: { id: string; label: string }[]; edges: { from: string; to: string; label: string }[] };
  /** 记忆口诀 */
  mnemonic?: string;
}

// 数据已迁移至 lecture-content.data.json，避免 TS 类型推断大型对象导致编译缓慢
// eslint-disable-next-line @typescript-eslint/no-var-requires
const L: Record<string, LectureContent> = require('./lecture-content.data.json');

export const JS_LECTURES: Record<string, LectureContent> = L;

/** 获取指定知识点的讲授内容 */
export function getLectureContent(nodeId: string): LectureContent | undefined {
  return L[nodeId];
}

/** 获取指定模块的所有讲授内容 */
export function getLecturesByModule(nodeIds: string[]): LectureContent[] {
  return nodeIds.map(id => L[id]).filter(Boolean);
}
