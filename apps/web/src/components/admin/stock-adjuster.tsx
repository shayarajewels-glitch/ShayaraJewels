'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { AdminProductDto } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Field, Input, NativeSelect } from '@/components/ui/form-controls';
import { Card } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';

/** Stock changes go through the dedicated, audited stock endpoint — never the general product update. */
export function StockAdjuster({ product, onUpdated }: { product: AdminProductDto; onUpdated: (p: AdminProductDto) => void }) {
  const [mode, setMode] = useState<'adjust' | 'set'>('adjust');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!/^-?\d+$/.test(amount.trim()) || (mode === 'set' && n < 0) || (mode === 'adjust' && n === 0)) {
      setError(mode === 'set' ? 'Enter a whole number of 0 or more' : 'Enter a whole number like 5 or -2');
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const body = mode === 'set' ? { set: n, reason: reason || undefined } : { adjust: n, reason: reason || undefined };
      const updated = await api<AdminProductDto>(`/admin/products/${product.id}/stock`, { method: 'PATCH', body });
      onUpdated(updated);
      setAmount('');
      setReason('');
      toast.success(`Stock is now ${updated.stock}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-sans text-sm font-semibold">Inventory</h2>
      <p className="mt-1 font-display text-4xl" aria-live="polite">
        {product.stock} <span className="font-sans text-sm text-charcoal-soft">available</span>
      </p>
      <p className="mt-1 text-xs text-charcoal-soft">Units held by unpaid orders are already deducted. {product.unitsSold} sold so far.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field id="stock-mode" label="Change">
            <NativeSelect value={mode} onChange={(e) => setMode(e.target.value as 'adjust' | 'set')} className="h-10">
              <option value="adjust">Add / remove</option>
              <option value="set">Set exact</option>
            </NativeSelect>
          </Field>
          <Field id="stock-amount" label={mode === 'set' ? 'New stock' : 'Units (+/-)'} error={error}>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10" />
          </Field>
        </div>
        <Field id="stock-reason" label="Reason (optional)">
          <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="New delivery, damaged, recount…" className="h-10" />
        </Field>
        <Button type="submit" size="sm" variant="outline" loading={busy} className="w-full">
          Update stock
        </Button>
      </form>
    </Card>
  );
}
