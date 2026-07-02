'use client';

import { useEffect, useRef } from 'react';

export default function IframeTest() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui; }
    .card { background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 32px; max-width: 400px; text-align: center; }
    h1 { color: white; font-size: 24px; margin-bottom: 16px; }
    p { color: #9ca3af; margin-bottom: 20px; }
    button { padding: 12px 24px; background: linear-gradient(135deg, #f97316, #ec4899); border: none; border-radius: 12px; color: white; font-size: 16px; font-weight: 600; cursor: pointer; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>预览测试</h1>
    <p>如果你看到这个内容，说明 iframe 正常工作！</p>
    <button onclick="this.textContent='点击成功！'">点击测试</button>
  </div>
</body>
</html>`;
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <iframe
        ref={iframeRef}
        style={{ width: '100%', height: '100%', border: 'none', minHeight: '400px' }}
        title="测试"
      />
    </div>
  );
}
