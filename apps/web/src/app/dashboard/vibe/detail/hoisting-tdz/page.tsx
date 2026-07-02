'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/hoisting-tdz-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="变量提升与TDZ · 深度讲解"
      subtitle="由浅入深，图文并茂，逐步掌握变量提升与暂时性死区"
      steps={STEPS}
      accentColor="amber"
    />
  );
}
