import EvolutionDemoNotice from '../demo-notice';

export default function EvolutionInteractivePage() {
  return (
    <EvolutionDemoNotice
      title="Evolution 交互演示"
      description="原交互页面使用固定问题和固定评分演示策略变化，现已降级为开发演示说明。"
      legacyRoute="/dashboard/evolution/interactive"
    />
  );
}
