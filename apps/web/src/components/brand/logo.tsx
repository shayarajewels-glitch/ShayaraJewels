import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Text wordmark. A placeholder until a designed logo exists; swap the inner
 * markup for an <svg> or <Image> without touching call sites.
 */
export function Logo({ className, href = '/', tone = 'dark' }: { className?: string; href?: string | null; tone?: 'dark' | 'light' }) {
  const mark = (
    <span className={cn('inline-flex flex-col items-center leading-none', tone === 'light' ? 'text-ivory' : 'text-charcoal', className)}>
      <span className="font-display text-[1.65rem] font-medium tracking-[0.32em] pl-[0.32em]">SHAYARA</span>
      <span className="mt-1 h-px w-10 bg-champagne" aria-hidden />
    </span>
  );
  if (href === null) return mark;
  return (
    <Link href={href} aria-label="Shayara home" className="inline-flex rounded-sm">
      {mark}
    </Link>
  );
}
