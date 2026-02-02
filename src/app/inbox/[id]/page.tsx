'use client';

import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

type Message = {
  id: string;
  from: 'me' | 'them';
  text: string;
  time: string;
};

type Thread = {
  id: string;
  title: string;
  avatarUrl: string;
  messages: Message[];
};

function formatTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getThread(id: string, opened?: boolean): Thread {
  if (id === 'system') {
    return {
      id,
      title: '系统通知',
      avatarUrl:
        'https://images.unsplash.com/photo-1520975682031-a45c5f4b2b1b?auto=format&fit=crop&w=96&q=80',
      messages: [
        {
          id: 'm1',
          from: 'them',
          text: '欢迎加入 AI-HUB。你现在可以像逛街一样挑选 AI 服务。',
          time: '刚刚',
        },
        {
          id: 'm2',
          from: 'them',
          text: '需要帮助？随时在这里联系平台。',
          time: '刚刚',
        },
      ],
    };
  }

  if (id === 'neo') {
    return {
      id,
      title: 'Neo',
      avatarUrl:
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=96&q=80',
      messages: [
        {
          id: 'm1',
          from: 'them',
          text: '关于您的头像需求：我可以先给你做 3 个风格方向草案。',
          time: '2小时前',
        },
        {
          id: 'm2',
          from: 'me',
          text: '可以！我希望偏二次元但不要太幼，颜色偏冷一点。',
          time: '2小时前',
        },
        {
          id: 'm3',
          from: 'them',
          text: '收到。我会给你 3 版：写实二次元 / 动漫线稿 / 赛博冷光。',
          time: '1小时前',
        },
      ],
    };
  }

  const base: Thread = {
    id,
    title: id === 'allen' ? 'Allen' : '对话',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&q=80',
    messages: [
      {
        id: 'm1',
        from: 'them',
        text: '你好，我看到了你的服务咨询。你希望部署在本地还是云端？',
        time: '昨天',
      },
      {
        id: 'm2',
        from: 'me',
        text: '我们云端为主，后续可能会加本地备份。',
        time: '昨天',
      },
    ],
  };

  if (opened) {
    base.messages.unshift({
      id: 'open',
      from: 'them',
      text: '已为你创建新对话。把需求发我，我马上给你建议。',
      time: '刚刚',
    });
  }

  return base;
}

function InboxDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const opened = sp.get('open') === '1';
  const serviceParam = sp.get('service');
  const serviceTitle = serviceParam ? decodeURIComponent(serviceParam) : null;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;

    async function guard() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        if (!data.session) {
          router.replace(`/login?next=/inbox/${id}`);
          return;
        }
        setChecked(true);
      } catch {
        if (!alive) return;
        router.replace(`/login?next=/inbox/${id}`);
      }
    }

    void guard();

    return () => {
      alive = false;
    };
  }, [router, supabase, id]);

  const thread = useMemo(() => getThread(id, opened), [id, opened]);

  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const autoRepliedRef = useRef(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(thread.messages);
    setDraft('');
    setTyping(false);
    autoRepliedRef.current = false;
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  }, [thread.messages, thread.id]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  function send() {
    const text = draft.trim();
    if (!text) return;

    const now = new Date();

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        from: 'me',
        text,
        time: formatTime(now),
      },
    ]);
    setDraft('');

    if (!autoRepliedRef.current) {
      autoRepliedRef.current = true;
      setTyping(true);
      replyTimerRef.current = setTimeout(() => {
        const serviceName = serviceTitle ?? '这个服务';
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-reply`,
            from: 'them',
            text: `收到！关于这个 ${serviceName} 的需求，你有具体的参考图吗？`,
            time: formatTime(new Date()),
          },
        ]);
        setTyping(false);
        replyTimerRef.current = null;
      }, 1500);
    }
  }

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
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 md:px-6">
        <header className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>

          <Image
            src={thread.avatarUrl}
            alt={thread.title}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border border-slate-200 object-cover"
          />
          <div className="text-sm font-semibold text-slate-900">{thread.title}</div>
        </header>

        {serviceTitle ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <span className="text-slate-500">正在咨询：</span>
            <span className="font-semibold text-slate-900">{serviceTitle}</span>
          </div>
        ) : null}

        <main ref={listRef} className="mt-4 flex-1 space-y-3 overflow-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  m.from === 'me'
                    ? 'bg-gradient-to-r from-slate-900 to-cyan-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-800'
                }`}
              >
                <div>{m.text}</div>
                <div
                  className={`mt-1 text-[11px] ${
                    m.from === 'me' ? 'text-white/70' : 'text-slate-500'
                  }`}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}

          {typing ? (
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">对方正在输入</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        <footer className="mt-5 border-t border-slate-200 bg-slate-50 pt-4">
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="输入消息..."
              rows={1}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              发送
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading...
            </div>
          </div>
        </div>
      }
    >
      <InboxDetailContent id={id} />
    </Suspense>
  );
}
