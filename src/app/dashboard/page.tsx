'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart, Briefcase, Package } from 'lucide-react';

import { createSupabaseBrowserClient } from '../../lib/supabase/client';

type OrderStatus = 'pending' | 'processing' | 'delivered' | 'completed' | 'cancelled' | string;

type DbOrder = {
  id: number;
  status: OrderStatus;
  amount: number | null;
  created_at: string;
  buyer_id?: string;
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

type DbProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type ActiveOrderVM = {
  id: number;
  status: OrderStatus;
  buyerName: string;
  buyerAvatarUrl: string;
  serviceTitle: string;
};

const formatCny = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
};

function statusLabel(status: OrderStatus) {
  if (status === 'pending') return '待接单';
  if (status === 'processing') return '制作中';
  if (status === 'delivered') return '待验收';
  if (status === 'completed') return '已完成';
  if (status === 'cancelled') return '已取消';
  return status;
}

function statusBadgeCls(status: OrderStatus) {
  if (status === 'pending') return 'border-slate-200 bg-slate-50 text-slate-700';
  if (status === 'processing') return 'border-sky-200 bg-sky-50 text-sky-800';
  if (status === 'delivered') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-white text-slate-700';
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

  const [services, setServices] = useState<DbService[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrderVM[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(true);
      setError(null);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!alive) return;

      if (!authUser) {
        router.replace('/login?next=/dashboard');
        return;
      }

      // Step 1: fetch orders for this seller
      const ordersRes = await supabase
        .from('orders')
        .select('*')
        .eq('service_owner_id', authUser.id)
        .order('created_at', { ascending: false });

      if (!alive) return;

      if (ordersRes.error) {
        setError(`读取销售订单失败: ${ordersRes.error.message}`);
        setActiveOrders([]);
      }

      const orders = (ordersRes.data ?? []) as DbOrder[];

      // Step 2: fetch buyer profiles (if buyer_id exists)
      const buyerIds = Array.from(
        new Set(orders.map((o) => o.buyer_id).filter((x): x is string => !!x))
      );

      let profilesById = new Map<string, DbProfile>();
      if (buyerIds.length > 0) {
        const profRes = await supabase
          .from('profiles')
          .select('id,username,full_name,avatar_url')
          .in('id', buyerIds);

        if (profRes.data) {
          profilesById = new Map((profRes.data as DbProfile[]).map((p) => [p.id, p]));
        }
      }

      // Step 3: fetch services titles (if service_id exists)
      const serviceIds = Array.from(
        new Set(orders.map((o) => o.service_id).filter((x): x is string => !!x))
      );

      let servicesById = new Map<string, { title: string | null }>();
      if (serviceIds.length > 0) {
        const svcRes = await supabase.from('services').select('id,title').in('id', serviceIds);
        if (svcRes.data) {
          servicesById = new Map(
            (svcRes.data as { id: string; title: string | null }[]).map((s) => [s.id, { title: s.title }])
          );
        }
      }

      // Step 4: map VM
      const vm: ActiveOrderVM[] = orders.map((o) => {
        const buyerId = o.buyer_id ?? '';
        const p = buyerId ? profilesById.get(buyerId) : undefined;

        const buyerName =
          p?.full_name ?? p?.username ?? (buyerId ? `${buyerId.slice(0, 6)}...` : '买家');

        const buyerAvatarUrl =
          p?.avatar_url ??
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&q=80';

        const serviceTitle =
          (o.service_id ? servicesById.get(o.service_id)?.title : null) ??
          o.service_snapshot?.title ??
          (o.service_id ? `服务 #${o.service_id}` : '服务');

        return {
          id: o.id,
          status: o.status,
          buyerName,
          buyerAvatarUrl,
          serviceTitle,
        };
      });

      // Services list (for My Services)
      const servicesRes = await supabase
        .from('services')
        .select('id,title,price,cover_url')
        .eq('creator_id', authUser.id);

      if (!alive) return;

      if (servicesRes.error) {
        setError((prev) => prev ?? `读取服务失败: ${servicesRes.error.message}`);
        setServices([]);
      } else {
        setServices(servicesRes.data as DbService[]);
      }

      setActiveOrders(vm);
      setLoading(false);
    }

    void load();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

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

          <h2 className="mt-6 text-lg font-semibold text-slate-900">待处理订单 (Active Orders)</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {activeOrders.length === 0 ? (
              <div className="px-6 py-5 text-sm text-slate-600">暂无销售订单。</div>
            ) : (
              activeOrders.map((o) => {
                const showDot = o.status === 'processing';

                return (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {showDot ? <span className="h-2 w-2 rounded-full bg-rose-500" /> : null}
                        <div className="truncate text-sm font-semibold text-slate-900">
                          #{o.id} · {o.serviceTitle}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="relative h-7 w-7 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                            <Image src={o.buyerAvatarUrl} alt={o.buyerName} fill className="object-cover" sizes="28px" />
                          </span>
                          <span className="text-sm text-slate-700">{o.buyerName}</span>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeCls(
                            o.status
                          )}`}
                        >
                          {statusLabel(o.status)}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/inbox/${o.id}?role=seller`}
                      className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      处理订单 / 进入沟通
                    </Link>
                  </div>
                );
              })
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
