import type { DetailStep, StepSection } from '@/components/vibe/detail/KnowledgeDetailPage';
export type { DetailStep, StepSection };
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const STEPS: DetailStep[] = require('./async-await-steps.json');
export const TOTAL_STEPS = STEPS.length;
