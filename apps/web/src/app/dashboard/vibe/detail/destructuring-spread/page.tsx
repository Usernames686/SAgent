'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/destructuring-spread-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="解构与展开运算符"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="amber"
    />
  );
}
