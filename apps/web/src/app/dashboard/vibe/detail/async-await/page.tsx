'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/async-await-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="async / await — 异步编程的终极武器"
      subtitle="由浅入深，图文并茂，逐步掌握 async/await 的本质"
      steps={STEPS}
      accentColor="teal"
    />
  );
}
