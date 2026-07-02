'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/git-advanced-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="Git高级操作"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="cyan"
    />
  );
}
