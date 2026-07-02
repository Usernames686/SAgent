'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/function-props-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="函数组件与Props"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="blue"
    />
  );
}
