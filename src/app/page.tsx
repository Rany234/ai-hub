'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';

import { ServiceCard } from '../../components/ServiceCard';
import { createSupabaseBrowserClient } from '../lib/supabase/client';

type Category = '全部' | 'AI 视觉' | 'AI 视频' | '工作流搭建' | 'AI 开发';

type DbService = {
  id: string;
  creator_id: string;
  title: string;
  price: number;
  cover_url: string | null;
  rating: number | null;
  tags: string[] | null;
};

type ViewService = {
  id: string;
  coverImageUrl: string;
  title: string;
  creatorName: string;
  creatorAvatarUrl: string;
  rating: number;
  priceLabel: string;
  toolTag: string;
  category: Exclude<Category, '全部'>;
  previewVideoUrl?: string;
};

const categories: Category[] = ['全部', 'AI 视觉', 'AI 视频', '工作流搭建', 'AI 开发'];

function formatCnySimple(n: number) {
  return `¥${Math.round(n).toLocaleString('zh-CN')} / 单`;
}

function inferCategory(tags: string[] | null | undefined): Exclude<Category, '全部'> {
  const t = (tags ?? []).join(' ').toLowerCase();
  if (t.includes('video') || t.includes('runway') || t.includes('sora')) return 'AI 视频';
  if (t.includes('workflow') || t.includes('comfyui')) return '工作流搭建';
  if (t.includes('dev') || t.includes('code') || t.includes('python')) return 'AI 开发';
  return 'AI 视觉';
}

export default function Home() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [authed, setAuthed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [services, setServices] = useState<ViewService[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const session = data.session;
      setAuthed(!!session);
      const meta: any = session?.user?.user_metadata ?? {};
      setAvatarUrl(meta.avatar_url ?? meta.picture ?? null);
    }

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthed(!!session);
      const meta: any = session?.user?.user_metadata ?? {};
      setAvatarUrl(meta.avatar_url ?? meta.picture ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let alive = true;

    async function loadServices() {
      setLoadingServices(true);
      setServicesError(null);

      const { data, error } = await supabase.from('services').select('*').order('title');

      if (!alive) return;

      if (error) {
        setServicesError(error.message);
        setServices([]);
      } else {
        const rows = (data ?? []) as DbService[];
        setServices(
          rows.map((s) => ({
            id: s.id,
            title: s.title,
            coverImageUrl:
              s.cover_url ??
              'https://images.unsplash.com/photo-1520975682031-a45c5f4b2b1b?auto=format&fit=crop&w=1400&q=80',
            creatorName: 'Creator',
            creatorAvatarUrl:
              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&q=80',
            rating: typeof s.rating === 'number' ? s.rating : 4.9,
            priceLabel: formatCnySimple(s.price),
            toolTag: (s.tags?.[0] ?? 'AI').toString(),
            category: inferCategory(s.tags),
          }))
        );
      }

      setLoadingServices(false);
    }

    void loadServices();

    return () => {
      alive = false;
    };
  }, [supabase]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-wide text-slate-900">AI-HUB</span>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href={authed ? '/dashboard' : '/join'}
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              成为创作者
            </Link>

            <Link
              href={authed ? '/profile' : '/login?next=/profile'}
              className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:inline-flex"
            >
              <span className="relative h-6 w-6 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {avatarUrl ? <Image src={avatarUrl} alt="avatar" fill className="object-cover" /> : null}
              </span>
              {authed ? '我的' : '登录'}
            </Link>

            <Link
              href="#services"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              浏览服务
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            AI 服务超市：像逛街一样采购 AI 生产力。
          </h1>

          <div className="mt-6 max-w-3xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="搜索 ComfyUI, 视频重绘, 数字人..."
                className="w-full rounded-2xl border border-white/60 bg-white/70 py-4 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-500 shadow-sm backdrop-blur-md outline-none transition focus:border-slate-300 focus:bg-white"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    c === '全部'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="mt-8">
          {servicesError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
              读取服务失败：{servicesError}
            </div>
          ) : null}

          {loadingServices ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              加载服务中...
            </div>
          ) : (
            <div className="grid auto-rows-[1fr] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s, idx) => {
                const isBig = idx < 2;
                return (
                  <div
                    key={s.id}
                    className={isBig ? 'lg:col-span-2 lg:row-span-2' : ''}
                  >
                    <ServiceCard
                      id={s.id}
                      coverImageUrl={s.coverImageUrl}
                      title={s.title}
                      creatorName={s.creatorName}
                      creatorAvatarUrl={s.creatorAvatarUrl}
                      rating={s.rating}
                      priceLabel={s.priceLabel}
                      toolTag={s.toolTag}
                      size={isBig ? 'lg' : 'sm'}
                      imagePriority={isBig}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-slate-500 md:px-6">
          AI-HUB · Service Marketplace MVP
        </div>
      </footer>
    </div>
  );
}
