'use client';

import { LogOut, MapPin, Package, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useCart } from '@/stores/cart-store';
import { useSession } from '@/stores/session-store';

const LINKS = [
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/orders', label: 'Orders', icon: Package },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const refreshCart = useCart((s) => s.refresh);

  return (
    <aside>
      <p className="eyebrow mb-1">My account</p>
      <p className="mb-6 font-display text-2xl">Hi, {user?.name.split(' ')[0]}</p>
      <nav aria-label="Account">
        <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname.startsWith(href) ? 'page' : undefined}
                className={cn('flex items-center gap-3 whitespace-nowrap rounded-sm px-3 py-2.5 text-sm', pathname.startsWith(href) ? 'bg-ivory-deep font-semibold' : 'hover:bg-ivory-deep')}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            </li>
          ))}
          {user?.role === 'admin' && (
            <li>
              <Link href="/admin" className="flex items-center gap-3 whitespace-nowrap rounded-sm px-3 py-2.5 text-sm text-rose-deep hover:bg-ivory-deep">
                Admin dashboard
              </Link>
            </li>
          )}
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 whitespace-nowrap rounded-sm px-3 py-2.5 text-left text-sm hover:bg-ivory-deep"
              onClick={async () => {
                try {
                  await logout();
                  await refreshCart().catch(() => undefined);
                  router.replace('/');
                  toast.success('You have been logged out');
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            >
              <LogOut className="size-4" aria-hidden /> Log out
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
