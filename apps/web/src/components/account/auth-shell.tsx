import { Logo } from '@/components/brand/logo';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo href={null} className="mb-6" />
          <h1 className="text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-charcoal-soft">{subtitle}</p>}
        </div>
        <div className="rounded-md border border-border bg-card p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-charcoal-soft">{footer}</div>}
      </div>
    </div>
  );
}
