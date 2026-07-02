'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks/useHydration';
import { userApi } from '@/lib/api';
import { Loader2, Settings, Save, Moon, Sun, Bell, User, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const hydrated = useHydration();
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (hydrated && !isAuthenticated) window.location.href = '/login';
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!nickname.trim()) {
      setSaveResult('error');
      setSaveMsg('昵称不能为空');
      return;
    }
    setSaving(true);
    setSaveResult('idle');
    try {
      await userApi.updateMe({ nickname: nickname.trim() }, accessToken || undefined);
      setSaveResult('success');
      setSaveMsg('保存成功');
    } catch (err: unknown) {
      setSaveResult('error');
      setSaveMsg(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [nickname, accessToken]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-500/10"><Settings className="w-5 h-5 text-gray-300" /></div>
        <div>
          <h1 className="text-xl font-bold text-white">设置</h1>
          <p className="text-sm text-white/65">管理账户和偏好设置</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-medium text-white/60 flex items-center gap-2"><User className="w-4 h-4" />个人信息</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/65 mb-1 block">邮箱</label>
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/50">{user?.email || '未设置'}</div>
          </div>
          <div>
            <label className="text-xs text-white/65 mb-1 block">昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 focus:border-orange-500/30 focus:outline-none transition-colors"
              placeholder="输入昵称"
            />
          </div>
          <div>
            <label className="text-xs text-white/65 mb-1 block">角色</label>
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/50">{user?.role || 'student'}</div>
          </div>
        </div>

        {saveResult !== 'idle' && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
            saveResult === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {saveResult === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {saveMsg}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? '保存中...' : '保存设置'}
      </button>
    </div>
  );
}
