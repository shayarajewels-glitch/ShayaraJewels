import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-[#f3d77a] via-rose-deep to-[#b8901f] text-ivory shadow-[0_8px_24px_-10px_rgba(212,175,55,0.6)] hover:from-[#fbe8a6] hover:via-[#e6c35c] hover:to-rose-deep',
        rose: 'bg-rose-deep text-ivory hover:bg-rose',
        outline: 'border border-rose-deep/70 bg-transparent text-rose-deep hover:bg-rose-deep hover:text-ivory',
        subtle: 'bg-ivory-deep text-charcoal hover:bg-sand',
        ghost: 'text-charcoal hover:bg-ivory-deep',
        link: 'h-auto px-0 normal-case tracking-normal text-rose-deep underline-offset-4 hover:underline',
        destructive: 'bg-danger text-white hover:bg-[#842620]',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-[0.68rem]',
        lg: 'h-12 px-8',
        icon: 'size-10 tracking-normal',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild = false, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
