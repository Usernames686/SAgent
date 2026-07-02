import EvolutionDemoNotice from '../demo-notice';

export default function EvolutionTestPage() {
  return (
    <EvolutionDemoNotice
      title="Evolution Agent 测试演示"
      description="原测试页面使用固定策略和固定分数模拟进化效果，现已降级为开发演示说明。"
      legacyRoute="/dashboard/evolution/test"
    />
  );
}
