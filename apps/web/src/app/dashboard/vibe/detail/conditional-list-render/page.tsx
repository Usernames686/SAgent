'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/conditional-list-render-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="条件渲染与列表渲染"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="green"
    />
  );
}
