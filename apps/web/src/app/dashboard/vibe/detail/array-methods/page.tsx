'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/array-methods-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="数组方法"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="cyan"
    />
  );
}
