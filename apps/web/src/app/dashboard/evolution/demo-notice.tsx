import Link from 'next/link';
import { Activity, ArrowLeft, Beaker, GitBranch } from 'lucide-react';

interface EvolutionDemoNoticeProps {
  title: string;
  description: string;
  legacyRoute: string;
}

export default function EvolutionDemoNotice({ title, description, legacyRoute }: EvolutionDemoNoticeProps) {
  return (
    <div className="p-6 pt-2 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link href="/dashboard/evolution" className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white/75 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          返回进化引擎
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Beaker className="w-6 h-6 text-purple-400" />
          {title}
        </h1>
        <p className="text-sm text-white/65 mt-1">{description}</p>
      </div>

      <div className="glass rounded-2xl p-6 border border-purple-500/15">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <GitBranch className="w-6 h-6 text-purple-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white mb-2">开发演示入口</h2>
            <p className="text-sm leading-6 text-white/65 mb-4">
              这个路由保留为 Evolution Agent 的内部演示说明，不再承担正式业务流程。正式数据、策略、报告和实验状态请以主页面的后端接口为准。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">当前路由</p>
                <code className="text-xs text-white/70 font-mono">{legacyRoute}</code>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">正式入口</p>
                <code className="text-xs text-white/70 font-mono">/dashboard/evolution</code>
              </div>
            </div>
            <Link href="/dashboard/evolution" className="btn-primary px-5 py-2 text-sm inline-flex">
              <Activity className="w-4 h-4" />
              打开真实进化数据
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
