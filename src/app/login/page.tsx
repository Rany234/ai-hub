'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { createSupabaseBrowserClient } from '../../lib/supabase/client';

type Mode = 'signin' | 'signup';

function primaryBtn() {
  return 'inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
}

function inputClass() {
  return 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-slate-400';
}

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setInfo('登录成功，正在跳转...');
        window.location.href = '/';
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setInfo('注册成功！如需邮箱验证，请前往邮箱完成验证后再登录。');
      }
    } catch (err: any) {
      setError(err?.message ?? '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            登录 AI-Hub
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'signin' ? '使用邮箱与密码登录。' : '使用邮箱与密码创建账号。'}
          </p>

          <form onSubmit={onSubmitEmail} className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              className={inputClass()}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className={inputClass()}
            />

            <button type="submit" className={primaryBtn()} disabled={loading}>
              {mode === 'signin' ? '登录' : '注册'}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {info}
            </div>
          )}

          <div className="mt-5 text-sm text-slate-600">
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-semibold text-slate-900 hover:underline"
              >
                没有账号？去注册
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-semibold text-slate-900 hover:underline"
              >
                已有账号？去登录
              </button>
            )}
          </div>

          <div className="mt-5">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-700 hover:underline"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
