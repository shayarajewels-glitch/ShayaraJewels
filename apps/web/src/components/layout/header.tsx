'use client';

import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@shayara/shared';
import { Logo } from '@/components/brand/logo';
import { useHydrated } from '@/hooks/use-hydrated';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/overlays';
import { cn } from '@/lib/utils';
import { useCart } from '@/stores/cart-store';
import { useSession } from '@/stores/session-store';
import { useWishlist } from '@/stores/wishlist-store';
import { CartDrawer } from './cart-drawer';

const NAV = [
  { href: '/shop', label: 'Shop all' },
  ...CATEGORIES.map((c) => ({ href: `/categories/${c.slug}`, label: c.name })),
];

function SearchForm({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        onDone?.();
      }}
      className="relative w-full"
    >
      <label htmlFor="site-search" className="sr-only">
        Search jewellery
      </label>
      <input
        id="site-search"
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search rings, pendants, gold tone…"
        maxLength={80}
        className="h-11 w-full rounded-full border border-input bg-card pl-11 pr-4 text-sm placeholder:text-charcoal-soft/70 focus-visible:border-rose-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-deep/25"
      />
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" aria-hidden />
    </form>
  );
}

export function Header() {
  const pathname = usePathname();
  const { user, status, load } = useSession();
  const { cart, refresh, setDrawerOpen } = useCart();
  const wishCount = useWishlist((s) => s.items.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const mounted = useHydrated();

  useEffect(() => {
    if (status === 'idle') void load().then(() => refresh().catch(() => undefined));
  }, [status, load, refresh]);

  // Close the menus on navigation (state adjusted during render, not in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  const count = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-charcoal focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <div className="container-page grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-1">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger className="rounded-sm p-2 lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" title="Menu">
              <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-4">
                <div className="mb-5">
                  <SearchForm onDone={() => setMenuOpen(false)} />
                </div>
                <ul className="space-y-1">
                  {NAV.map((n) => (
                    <li key={n.href}>
                      <Link href={n.href} className="block rounded-sm px-2 py-3 font-display text-2xl hover:bg-ivory-deep">
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-1 border-t border-border pt-6 text-sm">
                  <Link href="/about" className="block px-2 py-2">
                    Our story
                  </Link>
                  <Link href="/contact" className="block px-2 py-2">
                    Contact
                  </Link>
                  <Link href={user ? '/account/profile' : '/login'} className="block px-2 py-2">
                    {user ? 'My account' : 'Log in / Sign up'}
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-6">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={cn(
                      'eyebrow whitespace-nowrap py-2 transition-colors hover:text-rose-deep',
                      pathname.startsWith(n.href) && 'text-charcoal underline decoration-champagne decoration-2 underline-offset-[10px]',
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Logo responsive />

        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
          <button type="button" onClick={() => setSearchOpen((v) => !v)} className="rounded-sm p-2 hover:bg-ivory-deep" aria-label="Search" aria-expanded={searchOpen}>
            <Search className="size-5" />
          </button>
          <Link href={user ? '/account/profile' : '/login'} className="hidden rounded-sm p-2 hover:bg-ivory-deep sm:inline-flex" aria-label={user ? 'My account' : 'Log in'}>
            <User className="size-5" />
          </Link>
          <Link href="/wishlist" className="relative rounded-sm p-2 hover:bg-ivory-deep" aria-label={`Wishlist${mounted && wishCount ? `, ${wishCount} items` : ''}`}>
            <Heart className="size-5" />
            {mounted && wishCount > 0 && <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-rose-deep" aria-hidden />}
          </Link>
          <button type="button" onClick={() => setDrawerOpen(true)} className="relative rounded-sm p-2 hover:bg-ivory-deep" aria-label={`Bag, ${count} item${count === 1 ? '' : 's'}`}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-deep px-1 text-[0.65rem] font-bold leading-5 text-white" aria-hidden>
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t border-border bg-ivory py-3">
          <div className="container-page max-w-2xl">
            <SearchForm autoFocus onDone={() => setSearchOpen(false)} />
          </div>
        </div>
      )}
      <CartDrawer />
    </header>
  );
}
