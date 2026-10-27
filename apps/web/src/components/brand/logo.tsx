import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand lockup: the designer "S" mark with the SHAYARA wordmark.
 * `variant="mark"` shows the S alone (compact spaces).
 */
export function Logo({
  className,
  href = '/',
  tone = 'dark',
  variant = 'full',
  responsive = false,
}: {
  className?: string;
  href?: string | null;
  tone?: 'dark' | 'light';
  variant?: 'full' | 'mark';
  /** Show only the mark on small screens (tight headers). */
  responsive?: boolean;
}) {
  const mark = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/shayara-mark.png"
        alt={variant === 'mark' ? 'Shayara' : ''}
        width={48}
        height={48}
        priority
        className="size-10 rounded-md shadow-[0_1px_3px_rgba(90,70,50,0.18)] sm:size-11"
      />
      {variant === 'full' && (
        <span className={cn('flex-col items-start leading-none', responsive ? 'hidden sm:flex' : 'flex', tone === 'light' ? 'text-ivory' : 'text-charcoal')}>
          <span className="font-display text-[1.45rem] font-medium tracking-[0.28em] sm:text-[1.6rem]">SHAYARA</span>
          <span className="mt-1 h-px w-full bg-gradient-to-r from-champagne via-champagne/70 to-transparent" aria-hidden />
        </span>
      )}
    </span>
  );
  if (href === null) return mark;
  return (
    <Link href={href} aria-label="Shayara home" className="inline-flex rounded-sm">
      {mark}
    </Link>
  );
}
