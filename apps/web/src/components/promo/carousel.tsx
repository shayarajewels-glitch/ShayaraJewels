'use client';

import { Check, ChevronLeft, ChevronRight, Copy, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { canOptimizeImage, cn } from '@/lib/utils';

export type Slide =
  | { kind: 'coupon'; id: string; code: string; title: string; description: string; percent: number; appliesLabel: string; href: string; image: { url: string; alt: string } | null; endsLabel: string | null }
  | { kind: 'promo'; id: string; eyebrow: string; title: string; text: string; cta: string; href: string; image: string; imageAlt: string };

const INTERVAL_MS = 6000;

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success(`Code ${code} copied — apply it at checkout`);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error('Could not copy. Please note the code down.');
        }
      }}
      className="inline-flex items-center gap-2 rounded-full border border-dashed border-rose-deep/80 bg-ivory/70 py-2 pl-4 pr-3 font-mono text-sm font-semibold tracking-widest text-rose-deep backdrop-blur transition-colors hover:bg-rose-deep hover:text-ivory"
      aria-label={`Copy coupon code ${code}`}
    >
      {code}
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}

function SlideBody({ slide, priority }: { slide: Slide; priority: boolean }) {
  if (slide.kind === 'promo') {
    return (
      <>
        <Image src={slide.image} alt={slide.imageAlt} fill priority={priority} sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
        <div className="relative flex h-full max-w-lg flex-col justify-center gap-3 p-6 sm:p-10 md:p-14">
          <p className="eyebrow text-champagne">{slide.eyebrow}</p>
          <p className="font-display text-3xl leading-tight text-charcoal sm:text-5xl">{slide.title}</p>
          <p className="hidden text-sm leading-6 text-charcoal-soft sm:block">{slide.text}</p>
          <Link
            href={slide.href}
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-b from-[#f3d77a] via-rose-deep to-[#b8901f] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-ivory"
          >
            {slide.cta} <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </>
    );
  }
  return (
    <>
      {slide.image ? (
        <Image src={slide.image.url} alt={slide.image.alt} fill priority={priority} unoptimized={!canOptimizeImage(slide.image.url)} sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
      ) : (
        <div aria-hidden className="bg-glow absolute inset-0" />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="relative flex h-full max-w-xl flex-col justify-center gap-3 p-6 sm:p-10 md:p-14">
        <p className="eyebrow flex items-center gap-2 text-champagne">
          <Ticket className="size-4" aria-hidden /> Offer · {slide.appliesLabel}
        </p>
        <p className="font-display text-4xl leading-none text-charcoal sm:text-6xl">
          <span className="text-gilded">{slide.percent}% off</span>
        </p>
        <p className="font-display text-xl text-charcoal sm:text-2xl">{slide.title}</p>
        {slide.description && <p className="hidden text-sm leading-6 text-charcoal-soft sm:block">{slide.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <CopyCode code={slide.code} />
          <Link href={slide.href} className="eyebrow text-[0.65rem] text-charcoal underline decoration-champagne underline-offset-4 hover:text-rose-deep">
            Shop now
          </Link>
        </div>
        {slide.endsLabel && <p className="text-xs text-charcoal-soft">{slide.endsLabel}</p>}
      </div>
    </>
  );
}

export function Carousel({ slides, label = 'Offers and highlights', className }: { slides: Slide[]; label?: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('relative overflow-hidden rounded-3xl bg-ivory-deep ring-1 ring-rose-deep/25', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1);
        if (e.key === 'ArrowRight') go(index + 1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 40) return;
        go(end < start ? index + 1 : index - 1);
      }}
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/7] lg:aspect-[8/3]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={cn('absolute inset-0 transition-opacity duration-700 ease-out', i === index ? 'opacity-100' : 'pointer-events-none opacity-0')}
          >
            <SlideBody slide={slide} priority={i === 0} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-charcoal backdrop-blur transition-colors hover:bg-rose-deep hover:text-ivory sm:flex"
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-charcoal backdrop-blur transition-colors hover:bg-rose-deep hover:text-ivory sm:flex"
            aria-label="Next slide"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-rose-deep' : 'w-1.5 bg-charcoal/50 hover:bg-charcoal')}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
