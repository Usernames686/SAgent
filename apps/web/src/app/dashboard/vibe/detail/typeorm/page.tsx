'use client';

import KnowledgeDetailPage from '@/components/vibe/detail/KnowledgeDetailPage';
import { STEPS } from '@/components/vibe/detail/typeorm-steps';

export default function Page() {
  return (
    <KnowledgeDetailPage
      title="TypeORM数据库"
      subtitle="由浅入深，图文并茂，逐步掌握核心知识"
      steps={STEPS}
      accentColor="teal"
    />
  );
}
