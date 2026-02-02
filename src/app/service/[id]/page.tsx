'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Home, Star } from 'lucide-react';

import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

type PackageOption = {
  key: 'basic' | 'pro';
  name: string;
  price: number;
  summary: string;
};

type DbService = {
  id: string;
  creator_id: string;
  title: string;
  price: number;
  cover_url: string | null;
  description: string | null;
  tags: string[] | null;
  rating: number | null;
};

type ServiceDetailView = {
  id: string;
  title: string;
  rating: number;
  reviewCount: number;
  toolTag: string;
  creator: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  gallery: string[];
  descriptionHtml: string;
  deliverables: string[];
  packages: PackageOption[];
};

function tabBtn(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${
    active
      ? 'bg-slate-900 text-white'
      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
  }`;
}

function packageBtn(active: boolean) {
  return `w-full rounded-2xl border p-3 text-left transition ${
    active
      ? 'border-slate-900 bg-slate-50'
      : 'border-slate-200 bg-white hover:bg-slate-50'
  }`;
}

function defaultPackages(price: number): PackageOption[] {
  const base = Math.max(0, Math.round(price));
  const pro = Math.round(base * 1.6);
  return [
    {
      key: 'basic',
      name: '基础版',
      price: base,
      summary: '标准交付',
    },
    {
      key: 'pro',
      name: '专业版',
      price: pro,
      summary: '更深度的定制与支持',
    },
  ];
}

type TabKey = 'desc' | 'deliver' | 'reviews';

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<ServiceDetailView | null>(null);

  const [tab, setTab] = useState<TabKey>('desc');
  const [pkg, setPkg] = useState<PackageOption['key']>('basic');
  const [bookingState, setBookingState] = useState<'idle' | 'loading' | 'error'>('idle');

  const [galleryFailed, setGalleryFailed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: qErr } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (!alive) return;

      if (qErr) {
        setError(qErr.message);
        setService(null);
        setLoading(false);
        return;
      }

      const row = data as DbService;
      const packages = defaultPackages(row.price);

      const view: ServiceDetailView = {
        id: row.id,
        title: row.title,
        rating: typeof row.rating === 'number' ? row.rating : 4.9,
        reviewCount: 0,
        toolTag: (row.tags?.[0] ?? 'AI').toString(),
        creator: {
          id: row.creator_id,
          name: 'Creator',
          avatarUrl:
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&q=80',
        },
        gallery: [
          row.cover_url ??
            'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1520975682031-a45c5f4b2b1b?auto=format&fit=crop&w=1600&q=80',
        ],
        descriptionHtml: row.description ? `<p>${row.description}</p>` : '<p>暂无描述。</p>',
        deliverables: ['源文件/素材', '商业授权', '交付文档'],
        packages,
      };

      setService(view);
      setPkg('basic');
      setBookingState('idle');
      setLoading(false);
    }

    void load();

    return () => {
      alive = false;
    };
  }, [id, supabase]);

  const selectedPackage = useMemo(() => {
    if (!service) return null;
    return service.packages.find((p) => p.key === pkg) ?? service.packages[0];
  }, [pkg, service]);

  async function handleBooking() {
    if (!service || !selectedPackage) return;

    setBookingState('loading');
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?next=/service/${id}`);
      return;
    }

    const orderPayload = {
      buyer_id: user.id,
      service_owner_id: service.creator.id,
      service_id: id,
      amount: selectedPackage.price,
      status: 'pending',
      service_snapshot: {
        title: service.title,
        price: selectedPackage.price,
        package_name: selectedPackage.name,
      },
    };

    const { error: insErr } = await supabase.from('orders').insert(orderPayload);

    if (insErr) {
      console.error('Error creating order:', insErr);
      setBookingState('error');
    } else {
      router.push('/profile?toast=order_created');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            加载中...
          </div>
        </div>
      </div>
    );
  }

  if (error || !service || !selectedPackage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
            读取服务失败：{error ?? '未知错误'}
          </div>
          <div className="mt-4">
            <Link href="/" className="text-sm font-semibold text-slate-900 hover:underline">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="mb-6">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
            <Link href="/" className="inline-flex items-center gap-1 transition hover:text-slate-900">
              <Home className="h-4 w-4" />
              首页
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-700">服务</span>
            <ChevronRight className="h-4 w-4" />
            <span className="line-clamp-1 text-slate-900">{service.title}</span>
          </nav>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {service.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1 font-semibold text-slate-900">
              <Star className="h-4 w-4 fill-slate-900" />
              <span>{service.rating.toFixed(1)}</span>
            </div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-2">
              <Image
                src={service.creator.avatarUrl}
                alt={service.creator.name}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full border border-slate-200 object-cover"
              />
              <span className="font-medium text-slate-800">{service.creator.name}</span>
              <span className="text-slate-400">·</span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                {service.toolTag}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl md:col-span-2">
                  {!galleryFailed[0] ? (
                    <Image
                      src={service.gallery[0]}
                      alt="main"
                      fill
                      onError={() => setGalleryFailed((prev) => ({ ...prev, 0: true }))}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 66vw"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300">
                      <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-2 text-sm font-semibold tracking-wide text-slate-700 backdrop-blur">
                        AI-Hub
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                  {service.gallery.slice(1, 5).map((url, i) => {
                    const index = i + 1;
                    return (
                      <div key={`${url}-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                        {!galleryFailed[index] ? (
                          <Image
                            src={url}
                            alt={`thumb-${i + 1}`}
                            fill
                            onError={() => setGalleryFailed((prev) => ({ ...prev, [index]: true }))}
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 20vw"
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300">
                            <div className="rounded-2xl border border-white/40 bg-white/40 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-700 backdrop-blur">
                              AI-Hub
                            </div>
                          </div>
                        )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={tabBtn(tab === 'desc')} onClick={() => setTab('desc')}>
                  服务描述
                </button>
                <button type="button" className={tabBtn(tab === 'deliver')} onClick={() => setTab('deliver')}>
                  交付标准
                </button>
                <button type="button" className={tabBtn(tab === 'reviews')} onClick={() => setTab('reviews')}>
                  用户评价
                </button>
              </div>

              {tab === 'desc' ? (
                <div className="prose prose-slate mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: service.descriptionHtml }} />
              ) : null}

              {tab === 'deliver' ? (
                <div className="mt-6">
                  <ul className="space-y-3">
                    {service.deliverables.map((item) => (
                      <li key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                          <Check className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-slate-800">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {tab === 'reviews' ? (
                <div className="mt-6 text-sm text-slate-600">MVP 阶段暂未接入评价数据。</div>
              ) : null}
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-3xl font-semibold tracking-tight text-slate-900">¥{selectedPackage.price.toLocaleString('zh-CN')}</div>
                <div className="text-xs font-medium text-slate-500">含平台服务费</div>
              </div>

              <div className="mt-5 space-y-2">
                {service.packages.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPkg(p.key)}
                    className={packageBtn(pkg === p.key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                      <div className="text-sm font-semibold text-slate-900">¥{p.price.toLocaleString('zh-CN')}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{p.summary}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={bookingState === 'loading'}
                  className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                >
                  {bookingState === 'loading' ? '处理中...' : '立即预订'}
                </button>
                <Link
                  href={`/inbox/${service.creator.id}?service=${encodeURIComponent(service.title)}`}
                  className="w-full rounded-full border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  联系创作者
                </Link>
              </div>

              {bookingState === 'error' ? (
                <p className="mt-2 text-center text-xs text-rose-600">下单失败，请稍后重试。</p>
              ) : null}
              <p className="mt-4 text-center text-xs text-slate-500">平台担保交易 · 不满意全额退款</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
