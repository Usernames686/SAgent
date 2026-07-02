'use client';

import IframeTest from '@/components/IframeTest';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Iframe 渲染测试</h1>
      <div className="h-[500px] border border-white/10 rounded-lg overflow-hidden">
        <IframeTest />
      </div>
    </div>
  );
}
