'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/stores/session-store';

/** Management shortcut shown on the customer-facing page only to administrators. */
export function AdminProductBar({ productId }: { productId: string }) {
  const user = useSession((s) => s.user);
  if (user?.role !== 'admin') return null;
  return (
    <div className="mb-5 flex items-center justify-between rounded-sm border border-champagne-soft bg-[#fbf4e4] px-4 py-2.5 text-xs text-[#6f5320]">
      <span>You are viewing the customer page as an administrator.</span>
      <Link href={`/admin/products/${productId}`} className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
        <Pencil className="size-3.5" /> Edit
      </Link>
    </div>
  );
}
