'use client';

import { ExternalLink, LayoutDashboard, LayoutGrid, LogOut, Menu, MessageSquareText, Package, ShieldAlert, ShoppingCart, TicketPercent, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { EmptyState, Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/session-store';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareText },
  { href: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { href: '/admin/categories', label: 'Category images', icon: LayoutGrid },
];

/**
 * Client-side gate for the admin UI. This is a convenience only: every admin
 * API endpoint independently checks the admin role from the server session.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, status, load, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  useEffect(() => {
    if (status === 'ready' && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, user, router, pathname]);

  // Close the mobile menu after navigating (state adjusted during render, not in an effect).
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }

  if (status !== 'ready' || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Checking your access" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="container-page flex min-h-dvh items-center justify-center py-16">
        <div className="w-full max-w-lg">
          <EmptyState
            icon={<ShieldAlert />}
            title="Not authorised"
            action={
              <Button asChild variant="outline">
                <Link href="/">Back to the store</Link>
              </Button>
            }
          >
            This area is for Shayara administrators only.
          </EmptyState>
        </div>
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-dvh bg-ivory lg:grid lg:grid-cols-[15rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-rose-deep focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-ivory px-4 py-3 lg:hidden">
        <Logo href="/admin" size="sm" />
        <button type="button" onClick={() => setNavOpen((v) => !v)} className="rounded-sm p-2 hover:bg-ivory-deep" aria-expanded={navOpen} aria-controls="admin-nav" aria-label={navOpen ? 'Close menu' : 'Open menu'}>
          {navOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <aside
        id="admin-nav"
        className={cn(
          'border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col',
          navOpen ? 'block border-b' : 'hidden',
        )}
      >
        <div className="hidden px-6 py-6 lg:block">
          <Logo href="/admin" size="sm" />
          <p className="eyebrow mt-3 text-center text-[0.6rem]">Admin</p>
        </div>
        <nav aria-label="Admin" className="flex-1 px-3 py-3 lg:py-0">
          <ul className="space-y-1">
            {NAV.map(({ href, label, icon: Icon, exact }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href, exact) ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors',
                    isActive(href, exact) ? 'bg-rose-deep text-ivory' : 'text-charcoal hover:bg-ivory-deep',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/" className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-charcoal hover:bg-ivory-deep">
                <ExternalLink className="size-4" aria-hidden />
                View store
              </Link>
            </li>
          </ul>
        </nav>
        <div className="border-t border-border px-6 py-4 text-xs text-charcoal-soft">
          <p className="truncate font-medium text-charcoal">{user.name}</p>
          <p className="truncate">{user.email}</p>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-rose-deep hover:underline"
          >
            <LogOut className="size-3.5" aria-hidden /> Log out
          </button>
        </div>
      </aside>

      <main id="admin-main" tabIndex={-1} className="min-w-0 px-4 py-8 outline-none sm:px-8">
        {children}
      </main>
    </div>
  );
}
