'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/string-template-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="字符串与模板字面量"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="green"
    />
  );
}
