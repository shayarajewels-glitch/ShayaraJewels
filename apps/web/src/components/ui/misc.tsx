import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]', {
  variants: {
    variant: {
      default: 'bg-charcoal text-ivory',
      rose: 'bg-rose-soft text-rose-deep',
      gold: 'bg-champagne-soft text-champagne',
      muted: 'bg-ivory-deep text-charcoal-soft',
      success: 'bg-success/15 text-success',
      danger: 'bg-danger/15 text-danger',
      outline: 'border border-border text-charcoal-soft',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-sm bg-ivory-deep', className)} aria-hidden {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-border bg-card', className)} {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('border-border', className)} />;
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: 'info' | 'error' | 'success' | 'warning';
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-sand bg-ivory-deep text-charcoal',
    error: 'border-danger/40 bg-danger/10 text-danger',
    success: 'border-success/40 bg-success/10 text-success',
    warning: 'border-champagne/40 bg-champagne/10 text-champagne',
  }[variant];
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('rounded-sm border px-4 py-3 text-sm', styles, className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-sand px-6 py-16 text-center">
      {icon && <div className="mb-4 text-rose-deep [&_svg]:size-8">{icon}</div>}
      <h2 className="text-2xl">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-charcoal-soft">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-charcoal-soft', className)}>
      <span className="size-4 animate-spin rounded-full border-2 border-rose-deep border-r-transparent" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
