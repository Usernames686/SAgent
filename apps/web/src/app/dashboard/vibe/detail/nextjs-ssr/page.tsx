'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/nextjs-ssr-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="Next.js SSR/SSG"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="purple"
    />
  );
}
