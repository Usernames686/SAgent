import { KnowledgePoint } from '../../entities/knowledge-point.entity';

/** 练习数据：模板 + 参考解法 + 检查项 */
export interface ExerciseDef {
  template: string;
  reference: string;
  checks: { pattern: RegExp; name: string; weight: number }[];
  /** Level 2 运行验证 */
  runtimeChecks?: {
    testCases: { input: string; expectedOutput: string; description: string }[];
    timeout?: number;
  };
  /** 逐步提示（level 1-3，penalty 为扣分比例） */
  hints?: { level: number; content: string; penalty: number }[];
}

// 数据已迁移至 exercise-data.data.json
// 运行时遍历将序列化标记还原为 RegExp 实例
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ALL_EXERCISES_RAW: Record<string, any> = require('./exercise-data.data.json');

function reviveRegex(obj: any): any {
  if (obj && obj.__regex__) return new RegExp(obj.source, obj.flags || '');
  if (Array.isArray(obj)) return obj.map(reviveRegex);
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = reviveRegex(obj[k]);
    return out;
  }
  return obj;
}

export const ALL_EXERCISES: Record<string, ExerciseDef> = reviveRegex(ALL_EXERCISES_RAW);

/** 构建全部练习数据 */
export function getExerciseData(kp: KnowledgePoint): ExerciseDef {
  const def = ALL_EXERCISES[kp.nodeId];
  if (def) return def;
  // 兜底：根据知识点信息生成通用模板和检查
  return {
    template: `// 练习：${kp.name}\n// 目标：掌握 ${kp.name} 的基本用法\n`,
    reference: `// 参考解法：${kp.name}\n`,
    checks: [
      { pattern: /const|let/, name: '使用变量声明', weight: 0.15 },
      { pattern: /console\.log/, name: '输出结果', weight: 0.2 },
    ],
  };
}
