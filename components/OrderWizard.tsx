'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowLeft, X } from 'lucide-react';

type Intent = 'image' | 'video' | 'code';

type Step = 1 | 2 | 3;

type BudgetValue = number | 'Negotiable';

type FormState = {
  intent: Intent | null;
  description: string;
  budget: number;
  budgetNegotiable: boolean;
};

const slideVariants = {
  enter: (direction: 1 | -1) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 1 | -1) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

function cardBtn(active: boolean) {
  return `w-full rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
    active ? 'border-slate-900' : 'border-slate-200'
  }`;
}

function primaryBtn() {
  return 'inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
}

function secondaryBtn() {
  return 'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
}

function formatCny(n: number) {
  return n.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function parseBudgetInput(v: string) {
  const cleaned = v.replace(/[^0-9]/g, '');
  if (!cleaned) return 0;
  return Math.max(0, Math.min(9_999_999, Number(cleaned)));
}

export function OrderWizard() {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [form, setForm] = useState<FormState>({
    intent: null,
    description: '',
    budget: 1500,
    budgetNegotiable: false,
  });

  const [isHookOpen, setIsHookOpen] = useState(false);
  const [contact, setContact] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const title = useMemo(() => {
    if (step === 1) return '你想创作什么？';
    if (step === 2) return '请用一句话描述你的想法...';
    return '你的心理预算是多少？';
  }, [step]);

  function goNext() {
    setDirection(1);
    setStep((s) => (s === 3 ? 3 : ((s + 1) as Step)));
  }

  function goPrev() {
    setDirection(-1);
    setStep((s) => (s === 1 ? 1 : ((s - 1) as Step)));
  }

  const canNext = useMemo(() => {
    if (step === 1) return !!form.intent;
    if (step === 2) return form.description.trim().length > 0;
    return true;
  }, [form.description, form.intent, step]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

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

  function onSubmit() {
    fireConfetti();
    setTimeout(() => setIsHookOpen(true), 350);
  }

  function onViewMatches() {
    const budget: BudgetValue = form.budgetNegotiable ? 'Negotiable' : form.budget;

    const payload = {
      intent: form.intent,
      description: form.description,
      budget,
      contact,
    };

    // Simulate submission for later DB integration.
    // eslint-disable-next-line no-console
    console.log('[AI-HUB] order payload:', payload);

    setIsHookOpen(false);
    showToast('发布成功！正在为您匹配...');
  }

  const canSubmitHook = contact.trim().length > 0;

  return (
    <section className="mx-auto mt-10 max-w-3xl">
      <div className="min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="text-sm font-medium text-slate-600">{step}/3</div>

          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className={secondaryBtn()}
            aria-label="上一步"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>

        <div className="px-6 py-10 sm:px-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {title}
              </h2>

              {step === 1 && (
                <div className="mt-8 grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    className={cardBtn(form.intent === 'image')}
                    onClick={() => {
                      setForm((f) => ({ ...f, intent: 'image' }));
                      goNext();
                    }}
                  >
                    <div className="text-lg font-semibold text-slate-900">找人做图</div>
                    <div className="mt-1 text-sm text-slate-600">
                      海报、电商图、品牌 KV、视觉概念
                    </div>
                  </button>

                  <button
                    type="button"
                    className={cardBtn(form.intent === 'video')}
                    onClick={() => {
                      setForm((f) => ({ ...f, intent: 'video' }));
                      goNext();
                    }}
                  >
                    <div className="text-lg font-semibold text-slate-900">找人做视频</div>
                    <div className="mt-1 text-sm text-slate-600">
                      广告短片、分镜、动态演示、角色动画
                    </div>
                  </button>

                  <button
                    type="button"
                    className={cardBtn(form.intent === 'code')}
                    onClick={() => {
                      setForm((f) => ({ ...f, intent: 'code' }));
                      goNext();
                    }}
                  >
                    <div className="text-lg font-semibold text-slate-900">找人写代码</div>
                    <div className="mt-1 text-sm text-slate-600">
                      自动化脚本、Agent 工具、数据处理
                    </div>
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="mt-8">
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="例如：给我的咖啡品牌做一张极简风海报，主色调奶白+深棕..."
                    className="min-h-[160px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-slate-400"
                  />

                  <div className="mt-6 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canNext}
                      className={primaryBtn()}
                    >
                      继续
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="mt-8">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-700">预算</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {form.budgetNegotiable
                            ? '期待报价（可议）'
                            : '请输入你的心理预算'}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">可随时调整</div>
                    </div>

                    <div className="mt-4">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">
                          ¥
                        </span>
                        <input
                          inputMode="numeric"
                          value={form.budgetNegotiable ? '' : String(form.budget || '')}
                          onChange={(e) => {
                            const v = parseBudgetInput(e.target.value);
                            setForm((f) => ({ ...f, budget: v }));
                          }}
                          disabled={form.budgetNegotiable}
                          placeholder={form.budgetNegotiable ? '已选择期待报价' : '例如：2000'}
                          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-10 pr-4 text-2xl font-semibold tracking-tight text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={form.budgetNegotiable}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                budgetNegotiable: e.target.checked,
                                budget: e.target.checked ? 0 : f.budget || 1500,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900"
                          />
                          暂无预算 / 期待报价
                        </label>

                        <div className="flex items-center gap-2">
                          {[
                            { label: '¥500', value: 500 },
                            { label: '¥1,500', value: 1500 },
                            { label: '¥3,000', value: 3000 },
                            { label: '¥8,000', value: 8000 },
                          ].map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              disabled={form.budgetNegotiable}
                              onClick={() => setForm((f) => ({ ...f, budget: p.value }))}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 text-sm text-slate-700">
                      <div>
                        <span className="font-medium text-slate-900">你要做：</span>
                        {form.intent === 'image'
                          ? '做图'
                          : form.intent === 'video'
                            ? '做视频'
                            : '写代码'}
                      </div>
                      <div className="line-clamp-2">
                        <span className="font-medium text-slate-900">描述：</span>
                        {form.description || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end">
                    <button type="button" className={primaryBtn()} onClick={onSubmit}>
                      提交/完成
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        这是简洁版发布流程（Typeform 风格）。后续会在「提交/完成」后接入匹配与数据库。
      </div>

      <AnimatePresence>
        {isHookOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">需求已生成！我们要如何联系您？</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    请输入您的手机号或微信ID，我们会把匹配结果发给您。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHookOpen(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5">
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="手机号 / 微信ID"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-slate-400"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onViewMatches}
                  disabled={!canSubmitHook}
                  className={primaryBtn()}
                >
                  查看匹配的创作者
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
