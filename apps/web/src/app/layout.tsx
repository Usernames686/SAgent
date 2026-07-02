import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'sAgent - 智能编程学习平台',
  description: '全球领先的 AI 驱动氛围编程学习平台，10 个专业化 Agent 协同工作，为您提供个性化的编程学习体验。',
  keywords: ['编程学习', 'AI 辅导', '氛围编程', 'Vibe Coding', '编程教育'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-accent-500 focus:text-white focus:rounded-lg focus:m-4">
          跳转到主要内容
        </a>
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
