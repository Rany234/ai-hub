'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '../../lib/supabase/client';

type DbOrder = {
  id: number;
  status: string;
  amount: number | null;
  created_at: string;
  service_id: string | null;
  service_snapshot: any;
};

function primaryBtn() {
  return 'inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
}

function formatCny(n: number) {
  return n.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function ProfileContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = sp.get('toast');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  function showToast(message: string) {
    setToastMsg(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2200);
  }

  useEffect(() => {
    if (toast === 'order_created') {
      showToast('订单创建成功！');
      router.replace('/profile');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!alive) return;

      if (!user) {
        router.replace('/login?next=/profile');
        return;
      }

      setEmail(user.email ?? null);
      const meta: any = user.user_metadata ?? {};
      setAvatarUrl(meta.avatar_url ?? meta.picture ?? null);

      const { data: rows, error } = await supabase
        .from('orders')
        .select('id,status,amount,created_at,service_id,service_snapshot')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (!alive) return;

      if (error) {
        setOrdersError(error.message);
        setOrders([]);
      } else {
        setOrdersError(null);
        setOrders((rows ?? []) as DbOrder[]);
      }

      setLoading(false);
    }

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login?next=/profile');
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm text-slate-600">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {avatarUrl ? <Image src={avatarUrl} alt="avatar" fill className="object-cover" /> : null}
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">我的</h1>
                <p className="mt-1 text-sm text-slate-600">{email ?? '—'}</p>
              </div>
            </div>

            <button type="button" className={primaryBtn()} onClick={signOut}>
              退出登录
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">我的订单</h2>

          {ordersError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              读取订单失败：{ordersError}
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              {orders.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-600">暂无订单。</div>
              ) : (
                orders.map((o) => {
                  const title = o.service_snapshot?.title ?? (o.service_id ? `服务 #${o.service_id}` : '服务');
                  const amount = typeof o.amount === 'number' ? formatCny(o.amount) : '—';

                  return (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
                        <div className="mt-1 text-xs text-slate-500">状态：{o.status}</div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-slate-900">{amount}</div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">订单列表来自 Supabase `orders` 表（按 buyer_id 过滤）。</p>
        </div>
      </div>

      {toastMsg ? (
        <div className="fixed bottom-24 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm">
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 px-4 py-10">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-sm text-slate-600">Loading...</div>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
