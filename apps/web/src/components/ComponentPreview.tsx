'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface ComponentPreviewProps {
  code: string;
}

export default function ComponentPreview({ code }: ComponentPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!code || code.trim().length === 0 || !iframeRef.current) {
      return;
    }

    setLoaded(false);

    const html = generateHtml(code);
    iframeRef.current.srcdoc = html;
    
    // Mark as loaded after iframe renders
    const timer = setTimeout(() => setLoaded(true), 200);
    return () => clearTimeout(timer);
  }, [code]);

  if (!code || code.trim().length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300 text-sm">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-white/60">点击模板或输入描述生成组件</p>
          <p className="text-xs mt-2 text-gray-300">AI 将生成 React + Tailwind CSS 组件</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
      {!loaded && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none', 
          minHeight: '400px',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s'
        }}
        title="组件预览"
      />
    </div>
  );
}

function generateHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
      min-height: 100vh; 
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
    .avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 28px; font-weight: 700;
      box-shadow: 0 10px 30px rgba(249,115,22,0.4);
    }
    .title { color: white; font-size: 22px; font-weight: 700; }
    .subtitle { color: rgba(255,255,255,0.5); font-size: 14px; margin-top: 4px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 20px; text-align: center;
    }
    .stat-value { color: white; font-size: 32px; font-weight: 700; }
    .stat-value.accent {
      background: linear-gradient(135deg, #f97316, #ec4899);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .stat-label { color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 6px; }
    .btn {
      width: 100%; padding: 16px;
      background: linear-gradient(135deg, #f97316, #ec4899);
      border: none; border-radius: 14px;
      color: white; font-size: 16px; font-weight: 600; cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(249,115,22,0.3);
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 15px 40px rgba(249,115,22,0.4); }
    .btn:active { transform: translateY(0); }
    .info { margin-top: 20px; padding: 14px; background: rgba(255,255,255,0.04); border-radius: 12px; text-align: center; }
    .info span { color: rgba(255,255,255,0.5); font-size: 12px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="avatar">U</div>
      <div>
        <div class="title">用户统计</div>
        <div class="subtitle">实时数据概览</div>
      </div>
    </div>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">1,234</div>
        <div class="stat-label">总用户</div>
      </div>
      <div class="stat-card">
        <div class="stat-value accent">89%</div>
        <div class="stat-label">活跃率</div>
      </div>
    </div>
    <button class="btn" onclick="var c=document.getElementById('cnt');c.textContent=parseInt(c.textContent)+1">点击次数: <span id="cnt">0</span></button>
    <div class="info"><span class="dot"></span>Node.js 渲染 · React 组件</div>
  </div>
</body>
</html>`;
}
