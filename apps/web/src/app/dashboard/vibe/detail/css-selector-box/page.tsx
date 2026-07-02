'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/css-selector-box-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="CSS选择器与盒模型"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="blue"
    />
  );
}
