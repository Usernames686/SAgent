'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/scope-chain-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="作用域链 · 深度讲解"
      subtitle="由浅入深，图文并茂，逐步掌握作用域链的核心原理"
      steps={STEPS}
      accentColor="blue"
    />
  );
}
