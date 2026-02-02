'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart, Briefcase, Check, Package } from 'lucide-react';

import { createSupabaseBrowserClient } from '../../lib/supabase/client';

type DbOrder = {
  id: number;
  status: string;
  amount: number | null;
  created_at: string;
  service_id: string | null;
  service_snapshot: any;
  delivery_url: string | null;
};

type DbService = {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
};

function formatCny(n: number) {
  return n.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function SidebarLink({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function DashboardContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = sp.get('toast');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [services, setServices] = useState<DbService[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [deliveringOrder, setDeliveringOrder] = useState<DbOrder | null>(null);
  const [deliveryLink, setDeliveryLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  function showToast(message: string) {
    setToastMsg(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2200);
  }

  useEffect(() => {
    if (toast === 'published') {
      showToast('发布成功！');
      router.replace('/dashboard');
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
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!alive) return;

      if (!authUser) {
        router.replace('/login?next=/dashboard');
        return;
      }

      const [ordersRes, servicesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('service_owner_id', authUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('id,title,price,cover_url')
          .eq('creator_id', authUser.id),
      ]);

      if (!alive) return;

      if (ordersRes.error) {
        setError(`读取订单失败: ${ordersRes.error.message}`);
      } else {
        setOrders(ordersRes.data as DbOrder[]);
      }

      if (servicesRes.error) {
        setError(`读取服务失败: ${servicesRes.error.message}`);
      } else {
        setServices(servicesRes.data as DbService[]);
      }

      setLoading(false);
    }

    void load();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  async function updateOrderStatus(orderId: number, status: string) {
    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', orderId);

    if (updateError) {
      alert(`更新失败: ${updateError.message}`);
    } else {
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)));
    }
  }

  async function handleDeliver() {
    if (!deliveringOrder || !deliveryLink.trim()) return;
    setIsSubmitting(true);
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'completed', delivery_url: deliveryLink.trim() })
      .eq('id', deliveringOrder.id);

    if (updateError) {
      alert(`交付失败: ${updateError.message}`);
    } else {
      setOrders(
        orders.map((o) =>
          o.id === deliveringOrder.id
            ? { ...o, status: 'completed', delivery_url: deliveryLink.trim() }
            : o
        )
      );
      setDeliveringOrder(null);
      setDeliveryLink('');
    }
    setIsSubmitting(false);
  }

  async function deleteService(serviceId: string) {
    if (!window.confirm('确定要下架此服务吗？此操作不可逆。')) return;

    const { error: deleteError } = await supabase.from('services').delete().eq('id', serviceId);

    if (deleteError) {
      alert(`下架失败: ${deleteError.message}`);
    } else {
      setServices(services.filter((s) => s.id !== serviceId));
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
        <aside className="md:col-span-1">
          <div className="sticky top-24 space-y-1">
            <SidebarLink active>
              <Briefcase className="h-5 w-5" />接收的订单
            </SidebarLink>
            <SidebarLink active={false}>
              <Package className="h-5 w-5" />我的服务
            </SidebarLink>
            <SidebarLink active={false}>
              <BarChart className="h-5 w-5" />统计（TBD）
            </SidebarLink>
          </div>
        </aside>

        <main className="md:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">创作者仪表盘</h1>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              发布新服务
            </Link>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <h2 className="mt-6 text-lg font-semibold text-slate-900">接收的订单</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {orders.length === 0 ? (
              <p className="px-6 py-4 text-sm text-slate-600">暂无订单。</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="border-b border-slate-100 p-4 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {o.service_snapshot?.title ?? (o.service_id ? `服务 #${o.service_id}` : '服务')}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>订单号: {o.id}</span>
                        <span>
                          状态: <span className="font-medium text-slate-700">{o.status}</span>
                        </span>
                        <span>
                          金额: <span className="font-medium text-slate-700">{formatCny(o.amount ?? 0)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {o.status === 'pending' ? (
                        <button
                          onClick={() => updateOrderStatus(o.id, 'processing')}
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          开始制作
                        </button>
                      ) : null}
                      {o.status === 'processing' ? (
                        <button
                          onClick={() => setDeliveringOrder(o)}
                          className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          交付作品
                        </button>
                      ) : null}
                      {o.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                          <Check className="h-3.5 w-3.5" />已交付
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">我的服务</h2>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              发布新服务
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[16/10] bg-slate-100">
                  {s.cover_url ? (
                    <Image
                      src={s.cover_url}
                      alt={s.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-semibold text-slate-900">{s.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{formatCny(s.price)}</span>
                    <button
                      onClick={() => deleteService(s.id)}
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      下架
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {deliveringOrder ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">交付作品</h2>
            <p className="mt-1 text-sm text-slate-600">请输入交付链接（如网盘、在线文档等），买家确认后将完成订单。</p>
            <input
              type="url"
              value={deliveryLink}
              onChange={(e) => setDeliveryLink(e.target.value)}
              placeholder="https://your-delivery-link.com"
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeliveringOrder(null)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleDeliver}
                disabled={isSubmitting || !deliveryLink.trim()}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? '提交中...' : '确认交付'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMsg ? (
        <div className="fixed bottom-24 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm">
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading...
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
