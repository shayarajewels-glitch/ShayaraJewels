import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand lockup: the jewelled gold "S" with the SHAYARA wordmark, both cut
 * from the master logo (public/brand/shayara-logo-full.png) on transparent
 * backgrounds. `variant="mark"` shows the S alone (compact spaces).
 */
export function Logo({
  className,
  href = '/',
  variant = 'full',
  size = 'md',
  responsive = false,
}: {
  className?: string;
  href?: string | null;
  variant?: 'full' | 'mark';
  /** `sm` keeps a fixed compact size for narrow spaces such as the admin sidebar. */
  size?: 'sm' | 'md';
  /** Show only the mark on very narrow screens (tight headers). */
  responsive?: boolean;
}) {
  const mark = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image src="/brand/shayara-s.png" alt={variant === 'mark' ? 'Shayara' : ''} width={188} height={249} priority className={size === 'sm' ? 'h-10 w-auto' : 'h-11 w-auto sm:h-12 lg:h-14'} />
      {variant === 'full' && (
        <Image
          src="/brand/shayara-wordmark.png"
          alt="Shayara"
          width={633}
          height={123}
          priority
          className={cn(size === 'sm' ? 'h-6 w-auto' : 'h-5 w-auto sm:h-7 lg:h-9', responsive && 'max-[340px]:hidden')}
        />
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
