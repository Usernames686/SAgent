'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/node-testing-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="Node.js测试"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="teal"
    />
  );
}
