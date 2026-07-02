# sAgent JSON 化架构规范

> 本项目所有静态数据必须遵循 JSON 化架构，确保 TypeScript 编译速度和启动速度。

## 核心原则

**数据与逻辑分离**：纯数据存 `.json`，TypeScript 只写逻辑和类型。

## 已转换的文件

### API 端（NestJS）

| 原 .ts 文件 | 行数 | 转换后 .json | 轻量 .ts |
|-------------|------|-------------|---------|
| `lecture-content.data.ts` | 3,669 | `lecture-content.data.json` (402 KB) | 124 行 |
| `exercise-data.ts` | 2,717 | `exercise-data.data.json` (198 KB) | 48 行 |
| `quiz-bank.data.ts` | 1,450 | `quiz-bank.data.json` (154 KB) | 88 行 |

### Web 端（Next.js）

| 原 .ts 文件 | 行数 | 转换后 .json |
|-------------|------|-------------|
| `condition-loop-steps.ts` | 398 | `condition-loop-steps.json` (11.8 KB) |
| `functions-steps.ts` | 379 | `functions-steps.json` (11.8 KB) |
| `operators-steps.ts` | 253 | `operators-steps.json` (14.4 KB) |
| `null-vs-undefined-steps.ts` | 250 | `null-vs-undefined-steps.json` (8.6 KB) |
| `var-let-const-steps.ts` | 231 | `var-let-const-steps.json` (8.3 KB) |
| `seven-types-steps.ts` | 217 | `seven-types-steps.json` (8.3 KB) |
| `array-methods-steps.ts` | 92 | `array-methods-steps.json` (8.6 KB) |
| `string-template-steps.ts` | 90 | `string-template-steps.json` (6.6 KB) |
| `oop-prototype-steps.ts` | 87 | `oop-prototype-steps.json` (9.1 KB) |
| `destructuring-spread-steps.ts` | 72 | `destructuring-spread-steps.json` (5.8 KB) |
| `closure-steps.ts` | 66 | `closure-steps.json` (7.7 KB) |
| `scope-chain-steps.ts` | 66 | `scope-chain-steps.json` (8.0 KB) |
| `hoisting-tdz-steps.ts` | 64 | `hoisting-tdz-steps.json` (7.1 KB) |
| `closure-scope-steps.ts` | 63 | `closure-scope-steps.json` (5.8 KB) |

## 规范

### 1. 新增知识点数据 → 写入 JSON

**API 端**：写入 `apps/api/src/modules/vibe-learning/lecture-content.data.json`

**Web 端**：写入 `apps/web/src/components/vibe/detail/<name>-steps.json`

### 2. .ts 文件只做轻量 loader

```typescript
// xxx-steps.ts
import type { DetailStep, StepSection } from '@/components/vibe/detail/KnowledgeDetailPage';
export type { DetailStep, StepSection };
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const STEPS: DetailStep[] = require('./xxx-steps.json');
export const TOTAL_STEPS = STEPS.length;
```

### 3. 含 RegExp 的数据 → JSON 中用标记序列化

```json
{ "__regex__": true, "source": "const|let", "flags": "" }
```

运行时用 `new RegExp(obj.source, obj.flags)` 重建。

### 4. nest-cli.json 配置 JSON 自动复制

```json
{
  "compilerOptions": {
    "assets": [{ "include": "**/*.json", "watchAssets": true }]
  }
}
```

### 5. 禁止在 .ts 文件中硬编码超过 50 行的纯数据对象

超过 50 行的纯数据必须提取为 `.json` 文件。

## 性能对比

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| API 启动 | 1 小时+ | ~3 秒 |
| `nest build` | 卡死 | ~6 秒 |
| Web 端 steps 编译 | 每个文件需类型推断 | require() 直接加载 |
