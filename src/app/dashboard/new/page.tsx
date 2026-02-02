'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wand2 } from 'lucide-react';

import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

const randomUnsplash = () => {
  const urls = [
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1520975682031-a45c5f4b2b1b?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80',
  ];
  return urls[Math.floor(Math.random() * urls.length)];
};

function FormLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-800">{children}</label>;
}

export default function NewServicePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login?next=/dashboard/new');
      return;
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('价格必须为有效的数字。');
      setSubmitting(false);
      return;
    }

    const payload = {
      creator_id: user.id,
      title: title.trim(),
      price: priceNum,
      description: description.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      cover_url: coverUrl.trim(),
    };

    const { error: insErr } = await supabase.from('services').insert(payload);

    if (insErr) {
      setError(`发布失败: ${insErr.message}`);
      setSubmitting(false);
    } else {
      router.push('/dashboard?toast=published');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <header className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            返回仪表盘
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">发布新服务</h1>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <FormLabel>标题</FormLabel>
              <input value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full rounded-lg border-slate-300" />
            </div>

            <div>
              <FormLabel>价格 (元)</FormLabel>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required min="0" step="0.01" className="mt-1 w-full rounded-lg border-slate-300" />
            </div>

            <div>
              <FormLabel>描述</FormLabel>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border-slate-300" />
            </div>

            <div>
              <FormLabel>标签</FormLabel>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Sora, Video, ComfyUI" className="mt-1 w-full rounded-lg border-slate-300" />
              <p className="mt-1 text-xs text-slate-500">用逗号分隔，第一个标签将作为服务卡片上的主要 Tag。</p>
            </div>

            <div>
              <FormLabel>封面图 URL</FormLabel>
              <div className="mt-1 flex gap-2">
                <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://images.unsplash.com/..." className="flex-1 rounded-lg border-slate-300" />
                <button type="button" onClick={() => setCoverUrl(randomUnsplash())} className="rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  <Wand2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="border-t border-slate-200 pt-5">
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70">
                {submitting ? '发布中...' : '确认发布'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
