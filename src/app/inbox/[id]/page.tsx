'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  MessageSquareWarning,
  PackageCheck,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';

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

type OrderVersionStatus = 'pending_review' | 'rejected' | 'approved';

type OrderVersion = {
  id: string;
  versionNumber: number;
  contentUrl: string;
  promptRaw: string;
  notes: string;
  buyerFeedback?: string;
  status: OrderVersionStatus;
  createdAt: number;
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

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Stepper({ current }: { current: number }) {
  const steps = [1, 2, 3];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">版本进度</div>
      <div className="mt-3 flex items-center gap-3">
        {steps.map((s, idx) => {
          const active = current >= s;
          const isCurrent = current === s;

          return (
            <div key={s} className="flex flex-1 items-center gap-3">
              <div className="relative flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: active ? '#0f172a' : '#e2e8f0',
                    scale: isCurrent ? 1.08 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
                >
                  {`V${s}`}
                </motion.div>
                {isCurrent ? (
                  <motion.div
                    layoutId="stepper-dot"
                    className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-600"
                  />
                ) : null}
              </div>

              {idx < steps.length - 1 ? (
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={false}
                    animate={{ width: current > s ? '100%' : '0%' }}
                    transition={{ duration: 0.35 }}
                    className="h-full bg-slate-900"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-slate-500">当前版本：V{current}</div>
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function DrawerShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm">
      <button type="button" onClick={onClose} className="absolute inset-0" aria-label="Close" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-3xl border border-slate-200 bg-white"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}

function AssetPreviewCard({
  version,
  onOpen,
}: {
  version: OrderVersion;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-4 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:bg-slate-50"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <Image
          src={version.contentUrl}
          alt={`V${version.versionNumber}`}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-sm font-semibold text-slate-900">当前交付：V{version.versionNumber}</div>
          <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            点击查看
          </div>
        </div>
        <div className="mt-1 line-clamp-1 text-xs text-slate-600">{version.notes || '—'}</div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: OrderVersionStatus }) {
  const map: Record<OrderVersionStatus, string> = {
    pending_review: '待验收',
    rejected: '需修改',
    approved: '已通过',
  };

  const cls: Record<OrderVersionStatus, string> = {
    pending_review: 'border-amber-200 bg-amber-50 text-amber-800',
    rejected: 'border-rose-200 bg-rose-50 text-rose-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls[status]}`}>
      {map[status]}
    </span>
  );
}

function OrderStatusPanel({
  role,
  versions,
  currentVersion,
  remainingRevisions,
  maxRevisions,
  onOpenSeller,
  onOpenBuyerRevision,
  onApprove,
}: {
  role: 'seller' | 'buyer';
  versions: OrderVersion[];
  currentVersion: OrderVersion;
  remainingRevisions: number;
  maxRevisions: number;
  onOpenSeller: () => void;
  onOpenBuyerRevision: () => void;
  onApprove: () => void;
}) {
  return (
    <div className="space-y-4">
      <Stepper current={currentVersion.versionNumber} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">订单状态</div>
            <div className="mt-1 text-xs text-slate-500">当前版本：V{currentVersion.versionNumber}</div>
          </div>
          <StatusBadge status={currentVersion.status} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          {role === 'seller' ? (
            <button
              type="button"
              onClick={onOpenSeller}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              提交新交付物
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <PackageCheck className="h-4 w-4" />
                确认验收
              </button>
              {remainingRevisions > 0 ? (
                <button
                  type="button"
                  onClick={onOpenBuyerRevision}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  申请修改
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  已无剩余修改次数
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span>可修改次数</span>
            <span className="font-semibold">
              {remainingRevisions}/{maxRevisions}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">历史版本</div>
        <div className="mt-3 space-y-2">
          {versions
            .slice()
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">V{v.versionNumber}</div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{v.notes || '—'}</div>
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function InboxDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const opened = sp.get('open') === '1';
  const serviceParam = sp.get('service');
  const serviceTitle = serviceParam ? decodeURIComponent(serviceParam) : null;
  const roleParam = sp.get('role');
  const role: 'seller' | 'buyer' = roleParam === 'seller' ? 'seller' : 'buyer';

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

  const [maxRevisions] = useState(3);
  const [remainingRevisions, setRemainingRevisions] = useState(3);

  const [versions, setVersions] = useState<OrderVersion[]>(() => [
    {
      id: makeId(),
      versionNumber: 1,
      contentUrl:
        'https://images.unsplash.com/photo-1520975682031-a45c5f4b2b1b?auto=format&fit=crop&w=800&q=80',
      promptRaw: JSON.stringify({ prompt: 'portrait, cyberpunk, cool tones', seed: 42 }, null, 2),
      notes: '初版交付，偏赛博冷光风格。',
      status: 'pending_review',
      createdAt: Date.now(),
    },
  ]);

  const currentVersion = useMemo(() => {
    return versions.reduce((a, b) => (b.versionNumber > a.versionNumber ? b : a));
  }, [versions]);

  const [viewerOpen, setViewerOpen] = useState(false);

  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [sellerFiles, setSellerFiles] = useState<FileList | null>(null);
  const [sellerPrompt, setSellerPrompt] = useState('');
  const [sellerNotes, setSellerNotes] = useState('');
  const [sellerError, setSellerError] = useState<string | null>(null);

  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerFeedback, setBuyerFeedback] = useState('');

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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
        id: makeId(),
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
            id: makeId(),
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

  function approveCurrent() {
    setVersions((prev) =>
      prev.map((v) =>
        v.id === currentVersion.id ? { ...v, status: 'approved' as const } : v
      )
    );
    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        from: 'me',
        text: '我已确认验收，感谢！',
        time: formatTime(new Date()),
      },
    ]);
  }

  function openBuyerRevision() {
    setBuyerFeedback('');
    setBuyerModalOpen(true);
  }

  function submitBuyerRevision() {
    const fb = buyerFeedback.trim();
    if (!fb) return;

    setVersions((prev) =>
      prev.map((v) =>
        v.id === currentVersion.id
          ? { ...v, status: 'rejected' as const, buyerFeedback: fb }
          : v
      )
    );
    setRemainingRevisions((n) => Math.max(0, n - 1));
    setBuyerModalOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        from: 'me',
        text: `我这边有些修改建议：${fb}`,
        time: formatTime(new Date()),
      },
    ]);
  }

  function openSellerDeliver() {
    setSellerFiles(null);
    setSellerPrompt('');
    setSellerNotes('');
    setSellerError(null);
    setSellerModalOpen(true);
  }

  function submitSellerDeliver() {
    if (!sellerFiles || sellerFiles.length === 0) {
      setSellerError('请先选择至少一个文件。');
      return;
    }
    const prompt = sellerPrompt.trim();
    const notes = sellerNotes.trim();
    if (!prompt) {
      setSellerError('Prompt 参数为必填。');
      return;
    }
    if (!notes) {
      setSellerError('Notes 为必填。');
      return;
    }

    const file = sellerFiles[0];
    const url = URL.createObjectURL(file);
    const nextVersion = Math.min(3, currentVersion.versionNumber + 1);

    setVersions((prev) => [
      ...prev,
      {
        id: makeId(),
        versionNumber: nextVersion,
        contentUrl: url,
        promptRaw: prompt,
        notes,
        status: 'pending_review',
        createdAt: Date.now(),
      },
    ]);
    setSellerModalOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        from: 'them',
        text: `我已提交新版本 V${nextVersion}，请你查看并验收。`,
        time: formatTime(new Date()),
      },
    ]);
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

  const statusPanel = (
    <OrderStatusPanel
      role={role}
      versions={versions}
      currentVersion={currentVersion}
      remainingRevisions={remainingRevisions}
      maxRevisions={maxRevisions}
      onOpenSeller={openSellerDeliver}
      onOpenBuyerRevision={openBuyerRevision}
      onApprove={approveCurrent}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-h-[calc(100vh-3rem)] flex-col">
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

            <div className="ml-auto hidden items-center gap-2 text-xs text-slate-500 lg:flex">
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                {role === 'seller' ? '卖家视图' : '买家视图'}
              </span>
            </div>
        </header>

          {serviceTitle ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <span className="text-slate-500">正在咨询：</span>
              <span className="font-semibold text-slate-900">{serviceTitle}</span>
            </div>
          ) : null}

          <AssetPreviewCard version={currentVersion} onOpen={() => setViewerOpen(true)} />

          <main ref={listRef} className="mt-4 flex-1 space-y-3 overflow-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  m.from === 'me'
                      ? 'bg-gradient-to-r from-slate-900 to-cyan-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-800'
                }`}
              >
                <div>{m.text}</div>
                  <div className={`mt-1 text-[11px] ${m.from === 'me' ? 'text-white/70' : 'text-slate-500'}`}>
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

        <aside className="sticky top-6 hidden self-start lg:block">{statusPanel}</aside>
      </div>

      <button
        type="button"
        onClick={() => setMobilePanelOpen(true)}
        className="fixed bottom-6 right-5 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 lg:hidden"
        aria-label="Open order panel"
      >
        <ImageIcon className="h-5 w-5" />
      </button>

      {mobilePanelOpen ? (
        <DrawerShell title="订单状态" onClose={() => setMobilePanelOpen(false)}>
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            当前：{role === 'seller' ? '卖家视图' : '买家视图'}
          </div>
          {statusPanel}
        </DrawerShell>
      ) : null}

      {viewerOpen ? (
        <ModalShell title={`版本 V${currentVersion.versionNumber} 预览`} onClose={() => setViewerOpen(false)}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <Image
              src={currentVersion.contentUrl}
              alt={`V${currentVersion.versionNumber}`}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-700">Prompt 参数</div>
              <pre className="mt-1 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
{currentVersion.promptRaw}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Notes</div>
              <div className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
                {currentVersion.notes || '—'}
              </div>
            </div>
            {currentVersion.buyerFeedback ? (
              <div>
                <div className="text-xs font-semibold text-slate-700">买家反馈</div>
                <div className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
                  {currentVersion.buyerFeedback}
                </div>
              </div>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {sellerModalOpen ? (
        <ModalShell title="提交新交付物" onClose={() => setSellerModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">上传图片/文件</div>
              <input
                type="file"
                onChange={(e) => setSellerFiles(e.target.files)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <div className="mt-1 text-xs text-slate-500">MVP：仅本地预览，不会上传到服务器。</div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">Prompt 参数（必填）</div>
              <textarea
                value={sellerPrompt}
                onChange={(e) => setSellerPrompt(e.target.value)}
                rows={5}
                placeholder={`建议填写 JSON，例如：{\n  "prompt": "...",\n  "seed": 123\n}`}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">Notes（必填）</div>
              <textarea
                value={sellerNotes}
                onChange={(e) => setSellerNotes(e.target.value)}
                rows={3}
                placeholder="描述本次交付改动点..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            {sellerError ? <div className="text-sm text-rose-600">{sellerError}</div> : null}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setSellerModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitSellerDeliver}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                提交
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {buyerModalOpen ? (
        <ModalShell title="申请修改" onClose={() => setBuyerModalOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              剩余修改次数：{remainingRevisions}/{maxRevisions}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">修改建议（必填）</div>
              <textarea
                value={buyerFeedback}
                onChange={(e) => setBuyerFeedback(e.target.value)}
                rows={4}
                placeholder="请描述你希望调整的点..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setBuyerModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!buyerFeedback.trim()}
                onClick={submitBuyerRevision}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                提交
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
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
