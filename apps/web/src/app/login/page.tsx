'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { Sparkles, Mail, Lock, Loader2, Github } from 'lucide-react';

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '';
const OAUTH_REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/login`
  : '';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('admin@qq.com');
  const [password, setPassword] = useState('adminadmin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 处理 OAuth 回调（URL 中带 code 参数）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    setOauthLoading(true);
    setError('');
    try {
      // 调用后端 OAuth 接口
      const res = await authApi.githubOAuth(code) as Record<string, unknown>;
      const data = res as {
        user: { id: string; email: string; nickname: string; role: string; subscription: string };
        accessToken: string;
        refreshToken: string;
      };
      login(data.user, data.accessToken, data.refreshToken);
      // 清理 URL 中的 code
      window.history.replaceState({}, '', '/login');
      window.location.href = '/dashboard';
    } catch (err) {
      setError((err as Error).message || 'GitHub 登录失败');
      window.history.replaceState({}, '', '/login');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ email, password }) as Record<string, unknown>;
      const data = res as {
        user: { id: string; email: string; nickname: string; role: string; subscription: string };
        accessToken: string;
        refreshToken: string;
      };
      login(data.user, data.accessToken, data.refreshToken);
      window.location.href = '/dashboard';
    } catch (err) {
      setError((err as Error).message || '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/25 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">欢迎回来</h1>
          <p className="text-gray-300 mt-1 text-sm">登录你的 sAgent 账号</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 sm:p-8 space-y-5" noValidate>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" role="alert">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label-text">
              邮箱地址
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="label-text">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 pr-10"
                placeholder="输入密码"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-300 transition-colors"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>

          {/* OAuth 分隔线 */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-900/80 px-3 text-gray-300">或使用第三方登录</span>
            </div>
          </div>

          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={() => {
              const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${OAUTH_REDIRECT_URI}&scope=user:email`;
              window.location.href = githubAuthUrl;
            }}
            disabled={oauthLoading || !GITHUB_CLIENT_ID}
            className="w-full py-2.5 px-4 rounded-xl border border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {oauthLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Github className="w-4 h-4" />
            )}
            {oauthLoading ? 'GitHub 登录中...' : '使用 GitHub 登录'}
          </button>

          <p className="text-center text-sm text-gray-300">
            还没有账号？{' '}
            <a href="/register" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
              免费注册
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
