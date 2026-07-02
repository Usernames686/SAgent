'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { Sparkles, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.register({ email, password, nickname }) as Record<string, unknown>;
      const data = res as {
        user: { id: string; email: string; nickname: string; role: string; subscription: string };
        accessToken: string;
        refreshToken: string;
      };
      login(data.user, data.accessToken, data.refreshToken);
      window.location.href = '/assessment';
    } catch (err) {
      setError((err as Error).message || '注册失败，请稍后重试');
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
          <h1 className="text-2xl font-bold">创建账号</h1>
          <p className="text-gray-300 mt-1 text-sm">开始你的编程学习之旅</p>
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
            <label htmlFor="nickname" className="label-text">
              昵称
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field pl-10"
                placeholder="你的昵称"
                required
                autoComplete="nickname"
              />
            </div>
          </div>

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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="至少 8 位"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs text-gray-300 mt-1">密码至少需要 8 个字符</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                注册中...
              </>
            ) : (
              '创建账号'
            )}
          </button>

          <p className="text-center text-sm text-gray-300">
            已有账号？{' '}
            <a href="/login" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
              立即登录
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
