'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '../../lib/supabase/client';

type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  avatarUrl: string;
};

const conversations: Conversation[] = [
  {
    id: 'system',
    title: '系统通知：欢迎加入',
    subtitle: 'AI-HUB 已为你准备好了第一批精选服务。',
    time: '刚刚',
    avatarUrl:
      'https://images.unsplash.com/photo-1520975682031-a45c5f4b2b1b?auto=format&fit=crop&w=96&q=80',
  },
  {
    id: 'neo',
    title: 'Neo：关于您的头像需求…',
    subtitle: '我可以先给你做 3 个风格方向草案，你更偏…',
    time: '2小时前',
    avatarUrl:
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=96&q=80',
  },
  {
    id: 'allen',
    title: 'Allen：关于 ComfyUI 部署',
    subtitle: '你们现在是本地机器还是云上 GPU？我建议…',
    time: '昨天',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&q=80',
  },
];

export default function InboxPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const open = sp.get('open');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;

    async function guard() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        if (!data.session) {
          router.replace('/login?next=/inbox');
          return;
        }
        setChecked(true);
      } catch {
        if (!alive) return;
        router.replace('/login?next=/inbox');
      }
    }

    void guard();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            加载中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            消息
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {open ? '已为你准备好新对话入口。' : '这里展示与你的创作者/系统的对话。'}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/inbox/${c.id}${open === c.id ? '?open=1' : ''}`}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 transition hover:bg-slate-50"
            >
              <Image
                src={c.avatarUrl}
                alt={c.title}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-slate-200 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {c.title}
                  </div>
                  <div className="shrink-0 text-xs text-slate-500">{c.time}</div>
                </div>
                <div className="mt-1 truncate text-sm text-slate-600">
                  {c.subtitle}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
