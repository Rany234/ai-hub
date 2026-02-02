'use client';

import { useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, Sparkles } from 'lucide-react';

type Tool = 'Midjourney' | 'Stable Diffusion' | 'ComfyUI' | 'Runway' | 'Python';

const tools: Tool[] = ['Midjourney', 'Stable Diffusion', 'ComfyUI', 'Runway', 'Python'];

function primaryBtn() {
  return 'inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
}

function chip(active: boolean) {
  return `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
    active
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
  }`;
}

function inputClass() {
  return 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-slate-400';
}

export default function JoinPage() {
  const [nickname, setNickname] = useState('');
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => {
    return nickname.trim().length > 0 && portfolioUrl.trim().length > 0;
  }, [nickname, portfolioUrl]);

  const confettiTimerRef = useRef<number | null>(null);

  function fireConfetti() {
    const duration = 900;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        spread: 70,
        startVelocity: 35,
        ticks: 140,
        origin: { x: Math.random(), y: 0 },
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }

  function toggleTool(t: Tool) {
    setSelectedTools((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    fireConfetti();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-2 md:items-stretch md:px-6">
        {/* Left pitch */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-sm md:p-12">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold">
              <Sparkles className="h-4 w-4" />
              Become a Creator
            </div>

            <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              加入全球顶尖 AI 创作者网络。
            </h1>
            <p className="mt-4 max-w-md text-pretty text-base leading-7 text-white/80 md:text-lg">
              不仅是接单，更是建立你的数字资产。
            </p>

            <div className="mt-8 space-y-3 text-sm text-white/80">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-white" />
                <span>被高质量需求主动发现</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-white" />
                <span>积累可复用的作品与 Workflow 资产</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-white" />
                <span>协作分账更透明、交付更标准</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          {!submitted ? (
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  创作者申请
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  填写基本信息，我们会在 24 小时内由人类审核员联系你。
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-900">昵称 / ID</label>
                  <div className="mt-2">
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="例如：NeoDirector"
                      className={inputClass()}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">擅长工具</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tools.map((t) => {
                      const active = selectedTools.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTool(t)}
                          className={chip(active)}
                          aria-pressed={active}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">作品集链接（必填）</label>
                  <div className="mt-2">
                    <input
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://..."
                      className={inputClass()}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">联系方式</label>
                  <div className="mt-2">
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="微信 / 邮箱 / 手机号"
                      className={inputClass()}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className={primaryBtn()} disabled={!canSubmit}>
                  提交申请
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                <Check className="h-4 w-4" />
                申请已收到
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
                我们的人类审核员将在 24 小时内联系您。
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                你可以先准备：精选作品集、代表性 Workflow、常用工具栈与可交付范围。
              </p>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                <div>
                  <span className="font-medium text-slate-900">昵称：</span>
                  {nickname || '—'}
                </div>
                <div className="mt-1">
                  <span className="font-medium text-slate-900">工具：</span>
                  {selectedTools.length ? selectedTools.join(', ') : '—'}
                </div>
                <div className="mt-1">
                  <span className="font-medium text-slate-900">作品集：</span>
                  {portfolioUrl || '—'}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
