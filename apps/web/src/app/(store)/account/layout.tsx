import type { Metadata } from 'next';
import { AccountNav } from '@/components/account/account-nav';
import { RequireAuth } from '@/components/account/require-auth';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-10">
      <RequireAuth>
        <div className="grid gap-10 md:grid-cols-[14rem_1fr]">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </RequireAuth>
    </div>
  );
}
