import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus, type PaymentStatus } from '@shayara/shared';
import { Badge } from '@/components/ui/misc';

const ORDER_VARIANT: Record<OrderStatus, 'rose' | 'gold' | 'muted' | 'success' | 'danger' | 'outline'> = {
  pending_payment: 'gold',
  confirmed: 'rose',
  processing: 'rose',
  shipped: 'rose',
  delivered: 'success',
  cancelled: 'muted',
  return_requested: 'gold',
  returned: 'muted',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant = status === 'paid' ? 'success' : status === 'failed' ? 'danger' : status === 'pending' ? 'gold' : 'muted';
  return <Badge variant={variant}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
