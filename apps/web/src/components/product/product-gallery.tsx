'use client';

import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ProductImageDto, ProductVideoDto } from '@shayara/shared';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { ProductImage } from './product-image';

type Slide = { kind: 'image'; image: ProductImageDto } | { kind: 'video'; video: ProductVideoDto };

/** Ordered image gallery with thumbnails, keyboard navigation, hover zoom and a full-screen viewer. */
export function ProductGallery({ images, videos, productName }: { images: ProductImageDto[]; videos: ProductVideoDto[]; productName: string }) {
  const slides: Slide[] = [...images.map((image) => ({ kind: 'image' as const, image })), ...videos.map((video) => ({ kind: 'video' as const, video }))];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const count = slides.length;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, go]);

  if (count === 0) {
    return <div className="flex aspect-square items-center justify-center rounded-sm bg-ivory-deep text-sm text-charcoal-soft">Photos coming soon</div>;
  }
  const current = slides[index]!;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row" aria-roledescription="carousel" aria-label={`${productName} photos`}>
      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto md:w-20 md:flex-col" aria-label="Choose a photo">
          {slides.map((s, i) => (
            <li key={i} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={s.kind === 'image' ? `Show photo ${i + 1}: ${s.image.alt}` : 'Play product video'}
                aria-current={i === index}
                className={cn('relative block size-16 overflow-hidden rounded-sm border-2 bg-ivory-deep md:size-20', i === index ? 'border-charcoal' : 'border-transparent opacity-80 hover:opacity-100')}
              >
                {s.kind === 'image' ? (
                  <ProductImage src={s.image.url} alt="" fill sizes="80px" />
                ) : (
                  <>
                    {s.video.thumbnailUrl && <ProductImage src={s.video.thumbnailUrl} alt="" fill sizes="80px" />}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                      <Play className="size-5 fill-white" />
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex-1">
        <div
          className="relative aspect-square overflow-hidden rounded-sm bg-ivory-deep md:cursor-zoom-in"
          onMouseMove={(e) => {
            if (current.kind !== 'image' || window.matchMedia('(hover: none)').matches) return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => current.kind === 'image' && setViewerOpen(true)}
        >
          {current.kind === 'image' ? (
            <ProductImage
              src={current.image.url}
              alt={current.image.alt}
              fill
              priority={index === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="transition-transform duration-200 ease-out"
              style={zoom ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          ) : (
            <video src={current.video.url} poster={current.video.thumbnailUrl} controls playsInline className="h-full w-full object-cover" aria-label={`${productName} video`} />
          )}
        </div>
        {current.kind === 'image' && (
          <button type="button" onClick={() => setViewerOpen(true)} className="absolute bottom-3 right-3 rounded-full bg-ivory/90 p-2.5 shadow-sm" aria-label="Open full-screen photo viewer">
            <ZoomIn className="size-4" />
          </button>
        )}
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ivory/90 p-2 shadow-sm md:hidden" aria-label="Previous photo">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ivory/90 p-2 shadow-sm md:hidden" aria-label="Next photo">
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
        <p className="sr-only" aria-live="polite">
          Showing {index + 1} of {count}
        </p>
      </div>

      <DialogPrimitive.Root open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95" />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-describedby={undefined}>
            <DialogPrimitive.Title className="sr-only">{productName} photo viewer</DialogPrimitive.Title>
            {current.kind === 'image' && (
              <div className="relative h-full max-h-[90vh] w-full max-w-4xl">
                <ProductImage src={current.image.url} alt={current.image.alt} fill sizes="100vw" className="object-contain" />
              </div>
            )}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full bg-ivory p-2" aria-label="Close viewer">
              <X className="size-5" />
            </DialogPrimitive.Close>
            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-4 top-1/2 rounded-full bg-ivory p-3" aria-label="Previous photo">
                  <ChevronLeft className="size-5" />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute right-4 top-1/2 rounded-full bg-ivory p-3" aria-label="Next photo">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
