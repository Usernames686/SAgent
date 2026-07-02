'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/html5-semantic-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="HTML5语义化标签"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="orange"
    />
  );
}
