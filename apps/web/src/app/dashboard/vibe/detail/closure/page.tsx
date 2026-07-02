'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/closure-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="闭包 · 深度讲解"
      subtitle="由浅入深，图文并茂，逐步掌握闭包的核心原理与实战应用"
      steps={STEPS}
      accentColor="pink"
    />
  );
}
