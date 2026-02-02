'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';

type ServiceCardProps = {
  id?: string | number;
  coverImageUrl: string;
  title: string;
  creatorName: string;
  creatorAvatarUrl: string;
  rating: number;
  priceLabel: string;
  toolTag: string;
  previewVideoUrl?: string;
  size?: 'sm' | 'lg';
  imagePriority?: boolean;
};

const defaultPreviewVideo =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export function ServiceCard({
  id,
  coverImageUrl,
  title,
  creatorName,
  creatorAvatarUrl,
  rating,
  priceLabel,
  toolTag,
  previewVideoUrl,
  size = 'sm',
  imagePriority = false,
}: ServiceCardProps) {
  const href = `/service/${id ?? 1}`;
  const isPerfect = Math.abs(rating - 5.0) < 0.001;
  const isLarge = size === 'lg';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canVideo, setCanVideo] = useState(true);
  const [coverFailed, setCoverFailed] = useState(false);

  const videoSrc = useMemo(() => previewVideoUrl ?? defaultPreviewVideo, [previewVideoUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onError = () => setCanVideo(false);
    v.addEventListener('error', onError);
    return () => v.removeEventListener('error', onError);
  }, []);

  return (
    <Link href={href} className="group block w-full">
      <div
        className={`relative overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md ${
          isPerfect ? 'ai-glow-border' : 'border border-slate-200'
        }`}
      >
        <div className={`relative overflow-hidden ${isLarge ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
          {!coverFailed ? (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
              priority={imagePriority}
              onError={() => setCoverFailed(true)}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300">
              <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-2 text-sm font-semibold tracking-wide text-slate-700 backdrop-blur">
                AI-Hub
              </div>
            </div>
          )}

          {canVideo && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              src={videoSrc}
              muted
              playsInline
              loop
              preload="none"
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                void el.play().catch(() => setCanVideo(false));
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.pause();
                el.currentTime = 0;
              }}
            />
          )}

          <div className="ai-scanlines" />
          <div className="ai-scan-sweep" />

          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 backdrop-blur">
              {toolTag}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className={isLarge ? 'min-h-[48px]' : 'min-h-[44px]'}>
            <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900">
              {title}
            </h3>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src={creatorAvatarUrl}
                alt={creatorName}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full border border-slate-200 object-cover"
              />
              <span className="truncate text-sm text-slate-700">{creatorName}</span>
            </div>

            <div className="flex items-center gap-1 text-sm font-medium text-slate-700">
              <Star className="h-4 w-4 fill-slate-900 text-slate-900" />
              <span>{rating.toFixed(1)}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="text-sm font-semibold text-slate-900">{priceLabel}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
