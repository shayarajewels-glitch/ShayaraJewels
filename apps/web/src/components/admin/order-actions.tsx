'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ADMIN_ORDER_TRANSITIONS, ORDER_STATUS_LABELS, formatPaise, type AdminOrderDto, type OrderStatus } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls';
import { Alert, Card } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { toPaise } from './admin-ui';
import { ConfirmDialog } from './confirm-dialog';

type Update = (order: AdminOrderDto) => void;

export function StatusUpdater({ order, onUpdated }: { order: AdminOrderDto; onUpdated: Update }) {
  const options = ADMIN_ORDER_TRANSITIONS[order.status];
  const [target, setTarget] = useState<OrderStatus | ''>(options[0] ?? '');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [codCollected, setCodCollected] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const isCod = order.paymentMethod === 'cod';
  const canRecordCod = isCod && order.codCollectionStatus !== 'collected' && ['delivered', 'return_requested', 'returned'].includes(order.status);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      const updated = await api<AdminOrderDto>(`/admin/orders/${order.id}/status`, { method: 'PATCH', body });
      onUpdated(updated);
      toast.success(`Order is now ${ORDER_STATUS_LABELS[updated.status].toLowerCase()}`);
      setNote('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!target) return;
    if (target === 'shipped' && (!carrier.trim() || !trackingNumber.trim())) {
      setError('Add the courier and tracking number to mark the order shipped.');
      return;
    }
    if (trackingUrl && !trackingUrl.startsWith('https://')) {
      setError('The tracking link must start with https://');
      return;
    }
    await send({
      status: target,
      note: note.trim() || undefined,
      ...(target === 'shipped' ? { tracking: { carrier: carrier.trim(), trackingNumber: trackingNumber.trim(), trackingUrl: trackingUrl.trim() || undefined } } : {}),
      ...(target === 'returned' ? { restock } : {}),
      ...(isCod && target === 'delivered' && codCollected ? { codCollected: true } : {}),
    });
  };

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-sans text-sm font-semibold">Fulfilment</h2>
      {error && <Alert variant="error">{error}</Alert>}
      {options.length === 0 ? (
        <p className="text-sm text-charcoal-soft">
          {order.status === 'pending_payment' ? 'Waiting for payment. The order is confirmed automatically once paid, or released when the window expires.' : 'No further status changes are available.'}
        </p>
      ) : (
        <>
          <Field id="target-status" label="Move order to">
            <NativeSelect value={target} onChange={(e) => setTarget(e.target.value as OrderStatus)} className="h-10">
              {options.map((s) => (
                <option key={s} value={s}>
                  {order.status === 'return_requested' && s === 'delivered' ? 'Delivered (reject return)' : ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {target === 'shipped' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="carrier" label="Courier">
                <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Delhivery" className="h-10" />
              </Field>
              <Field id="tracking-number" label="Tracking number">
                <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="h-10" />
              </Field>
              <Field id="tracking-url" label="Tracking link (optional)" className="sm:col-span-2">
                <Input type="url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://" className="h-10" />
              </Field>
            </div>
          )}
          {target === 'returned' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put returned units back into stock
            </label>
          )}
          {isCod && target === 'delivered' && order.status !== 'return_requested' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={codCollected} onChange={(e) => setCodCollected(e.target.checked)} /> Cash was collected ({formatPaise(order.totalPaise)})
            </label>
          )}
          <Field id="status-note" label="Note (optional, visible in the timeline)">
            <Textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} rows={2} className="min-h-0" />
          </Field>
          {target === 'cancelled' ? (
            <ConfirmDialog
              title={`Cancel order ${order.orderNumber}?`}
              description={
                order.paymentStatus === 'paid' && !isCod
                  ? 'Stock is released and the full payment is refunded to the customer automatically.'
                  : 'Stock is released. This cannot be undone.'
              }
              confirmLabel="Cancel order"
              destructive
              onConfirm={submit}
              trigger={
                <Button variant="destructive" className="w-full" disabled={busy}>
                  Cancel order
                </Button>
              }
            />
          ) : (
            <Button className="w-full" loading={busy} onClick={submit} disabled={!target}>
              Update status
            </Button>
          )}
        </>
      )}
      {canRecordCod && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs text-charcoal-soft">Cash on Delivery collection: {order.codCollectionStatus.replace('_', ' ')}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" loading={busy} onClick={() => send({ status: order.status, codCollected: true })}>
              Record cash collected
            </Button>
            {order.codCollectionStatus !== 'failed' && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => send({ status: order.status, codCollected: false })}>
                Mark collection failed
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function RefundForm({ order, onUpdated }: { order: AdminOrderDto; onUpdated: Update }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(order.status === 'returned');
  const [error, setError] = useState<string>();

  const refundable = order.paymentMethod === 'razorpay' && ['paid', 'partially_refunded'].includes(order.paymentStatus) && !['pending_payment', 'shipped'].includes(order.status);
  if (order.paymentMethod === 'cod') {
    return (
      <Card className="p-5 text-sm text-charcoal-soft">
        <h2 className="mb-2 font-sans text-sm font-semibold text-charcoal">Refunds</h2>
        Cash on Delivery orders are refunded outside the payment gateway (e.g. bank transfer or UPI). Record the details in the order note.
      </Card>
    );
  }
  if (!refundable) return null;

  const preShipment = order.status === 'confirmed' || order.status === 'processing';
  const committed = order.payments.flatMap((p) => p.refunds).filter((r) => r.status !== 'failed').reduce((s, r) => s + r.amountPaise, 0);
  const remaining = order.totalPaise - committed;

  const submit = async () => {
    setError(undefined);
    const amountPaise = preShipment ? undefined : toPaise(amount);
    if (Number.isNaN(amountPaise)) return setError('Enter the amount in rupees, e.g. 499 or 499.50');
    if (reason.trim().length < 3) return setError('Add a short reason for the refund');
    try {
      const updated = await api<AdminOrderDto>(`/admin/orders/${order.id}/refund`, {
        method: 'POST',
        body: { amountPaise: amountPaise ?? undefined, reason: reason.trim(), restock },
      });
      onUpdated(updated);
      setAmount('');
      setReason('');
      toast.success('Refund initiated with Razorpay');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-sans text-sm font-semibold">Refund</h2>
      <p className="text-xs text-charcoal-soft">
        {preShipment
          ? 'This order has not shipped. Refunding cancels the whole order, releases stock and refunds the full amount.'
          : `Up to ${formatPaise(remaining)} can still be refunded. Leave the amount empty to refund everything remaining.`}
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      {!preShipment && (
        <Field id="refund-amount" label="Amount (₹, optional)">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10" />
        </Field>
      )}
      <Field id="refund-reason" label="Reason">
        <Input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className="h-10" />
      </Field>
      {order.status === 'returned' && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put returned units back into stock
        </label>
      )}
      <ConfirmDialog
        title="Issue refund?"
        description="Refunds are sent to the customer's original payment method through Razorpay and cannot be reversed."
        confirmLabel="Refund"
        destructive
        onConfirm={submit}
        trigger={
          <Button variant="outline" className="w-full">
            {preShipment ? 'Cancel & refund in full' : 'Issue refund'}
          </Button>
        }
      />
    </Card>
  );
}
