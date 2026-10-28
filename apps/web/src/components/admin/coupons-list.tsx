'use client';

import { Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import type { CouponDto } from '@shayara/shared';
import { appliesToLabel } from '@/components/promo/slides';
import { Button } from '@/components/ui/button';
import { Alert, Badge, EmptyState, Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { AdminPageHeader, TableWrap, useAdminResource } from './admin-ui';
import { ConfirmDialog } from './confirm-dialog';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null);

function couponState(c: CouponDto): { label: string; variant: 'success' | 'muted' | 'gold' | 'danger' } {
  const now = Date.now();
  if (!c.active) return { label: 'Off', variant: 'muted' };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Scheduled', variant: 'gold' };
  if (c.endsAt && new Date(c.endsAt).getTime() <= now) return { label: 'Expired', variant: 'danger' };
  return { label: 'Live', variant: 'success' };
}

export function CouponsList() {
  const { data, error, loading, reload } = useAdminResource<{ items: CouponDto[] }>('/admin/coupons');
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (c: CouponDto) => {
    setBusyId(c.id);
    try {
      const { id: _id, usageCount: _u, createdAt: _c, ...rest } = c;
      await api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { ...rest, active: !c.active } });
      toast.success(c.active ? `${c.code} switched off` : `${c.code} is live`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: CouponDto) => {
    try {
      await api(`/admin/coupons/${c.id}`, { method: 'DELETE' });
      toast.success(`${c.code} deleted`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Coupons"
        description="Live coupons appear in the carousel on the home and shop pages. Customers apply the code at checkout."
        actions={
          <Button asChild>
            <Link href="/admin/coupons/new">
              <Plus /> New coupon
            </Link>
          </Button>
        }
      />
      {error && <Alert variant="error" title="Could not load coupons">{error}</Alert>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.items.length === 0 && (
        <EmptyState icon={<TicketPercent />} title="No coupons yet">
          Create one to offer a discount and feature it in the carousel.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <TableWrap label="Coupons">
          <thead>
            <tr>
              <th>Banner</th>
              <th>Code</th>
              <th>Discount</th>
              <th>Applies to</th>
              <th>Dates</th>
              <th>Orders</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => {
              const state = couponState(c);
              return (
                <tr key={c.id}>
                  <td>
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail of any uploaded URL
                      <img src={c.image.url} alt="" className="h-10 w-24 rounded object-cover ring-1 ring-border" />
                    ) : (
                      <span className="text-xs text-charcoal-soft">—</span>
                    )}
                  </td>
                  <td>
                    <p className="font-mono font-semibold tracking-wider text-rose-deep">{c.code}</p>
                    <p className="text-xs text-charcoal-soft">{c.title}</p>
                  </td>
                  <td className="font-semibold">{c.discountPercent}%</td>
                  <td className="text-xs">{appliesToLabel(c.appliesTo)}</td>
                  <td className="text-xs text-charcoal-soft">
                    {fmtDate(c.startsAt) ?? 'Now'} → {fmtDate(c.endsAt) ?? 'No end'}
                  </td>
                  <td>{c.usageCount}</td>
                  <td>
                    <Badge variant={state.variant}>{state.label}</Badge>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => void toggle(c)} loading={busyId === c.id}>
                        {c.active ? 'Turn off' : 'Turn on'}
                      </Button>
                      <Button asChild variant="ghost" size="icon" aria-label={`Edit ${c.code}`}>
                        <Link href={`/admin/coupons/${c.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" aria-label={`Delete ${c.code}`}>
                            <Trash2 />
                          </Button>
                        }
                        title={`Delete ${c.code}?`}
                        description="Customers will no longer be able to use this code. Past orders keep their discount."
                        confirmLabel="Delete coupon"
                        destructive
                        onConfirm={() => remove(c)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
