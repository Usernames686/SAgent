/**
 * sAgent 完整 Quiz 题库
 *
 * 覆盖全部 115 知识点的多题型题库
 * 题型：choice（选择题）、fill_blank（填空题）、code_completion（代码补全）、code_review（代码评审）、ordering（排序题）
 * 每个知识点 2-4 道题，包含解析
 */

/** Quiz 题型枚举 */
export type QuizType = 'choice' | 'fill_blank' | 'code_completion' | 'code_review' | 'ordering';

/** 代码评审问题项 */
export interface CodeReviewIssue {
  line: number;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

/** 排序题选项项 */
export interface OrderingItem {
  id: string;
  text: string;
  correctOrder: number;
}

export interface QuizItem {
  questionId: string;
  questionText: string;
  explanation: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  /** 题型，默认 choice（向后兼容） */
  type: QuizType;

  // === 选择题 ===
  options?: { id: string; text: string; isCorrect: boolean }[];

  // === 填空题 ===
  blankAnswer?: string;
  blankAlternatives?: string[];

  // === 代码补全 ===
  codeTemplate?: string;
  codeAnswer?: string;
  codeValidatePattern?: string;

  // === 代码评审 ===
  codeSnippet?: string;
  reviewIssues?: CodeReviewIssue[];

  // === 排序题 ===
  orderingItems?: OrderingItem[];
}

export interface QuizBank {
  [nodeId: string]: QuizItem[];
}

// 数据已迁移至 quiz-bank.data.json
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const QUIZ_BANK: QuizBank = require('./quiz-bank.data.json');

/** 获取指定知识点的 Quiz 题目（含多题型） */
export function getQuizForNode(nodeId: string, count: number = 3): QuizItem[] {
  const items = QUIZ_BANK[nodeId];
  if (!items) return [];
  return items.slice(0, count);
}

/** 获取指定知识点的所有题型题目（含选择+填空+代码补全+代码评审+排序） */
export function getMultiTypeQuizForNode(nodeId: string): QuizItem[] {
  const choiceItems = QUIZ_BANK[nodeId] || [];
  const fillBlankItems = QUIZ_BANK[`${nodeId}-fb`] || [];
  const codeCompletionItems = QUIZ_BANK[`${nodeId}-cc`] || [];
  const codeReviewItems = QUIZ_BANK[`${nodeId}-cr`] || [];
  const orderingItems = QUIZ_BANK[`${nodeId}-order`] || [];
  return [...choiceItems, ...fillBlankItems, ...codeCompletionItems, ...codeReviewItems, ...orderingItems];
}

/** 按题型筛选获取题目 */
export function getQuizByType(nodeId: string, quizType: QuizType): QuizItem[] {
  const allItems = getMultiTypeQuizForNode(nodeId);
  return allItems.filter(item => item.type === quizType);
}

/** 获取所有有题库的知识点 ID */
export function getAllQuizNodeIds(): string[] {
  return Object.keys(QUIZ_BANK);
}
