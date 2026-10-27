'use client';

import { MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AddressDto } from '@shayara/shared';
import { AddressBlock, AddressForm } from '@/components/account/address-form';
import { Button } from '@/components/ui/button';
import { Alert, Badge, Card, EmptyState, Skeleton } from '@/components/ui/misc';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { useApiQuery } from '@/hooks/use-api-query';
import { api, errorMessage } from '@/lib/api-client';

export default function AddressesPage() {
  const { data, error, reload: load } = useApiQuery<{ items: AddressDto[] }>('/users/me/addresses');
  const items = data?.items ?? null;
  const [editing, setEditing] = useState<AddressDto | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AddressDto | null>(null);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Addresses</h1>
        {editing === null && items && items.length > 0 && (
          <Button variant="outline" onClick={() => setEditing('new')}>
            <Plus /> Add address
          </Button>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {editing !== null && (
        <Card className="mb-8 p-6">
          <h2 className="mb-5 text-2xl">{editing === 'new' ? 'New address' : 'Edit address'}</h2>
          <AddressForm
            address={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              toast.success('Address saved');
              void load();
            }}
          />
        </Card>
      )}
      {!items && !error && <Skeleton className="h-40" />}
      {items && items.length === 0 && editing === null && (
        <EmptyState icon={<MapPin />} title="No saved addresses" action={<Button onClick={() => setEditing('new')}>Add an address</Button>}>
          Save an address to check out faster.
        </EmptyState>
      )}
      {items && items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((a) => (
            <li key={a.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="eyebrow">{a.label}</span>
                  {a.isDefault && <Badge variant="gold">Default</Badge>}
                </div>
                <AddressBlock address={a} />
                <div className="mt-auto flex gap-4 pt-4 text-xs">
                  <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setEditing(a)}>
                    Edit
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      className="font-semibold underline underline-offset-4"
                      onClick={async () => {
                        try {
                          await api(`/users/me/addresses/${a.id}`, { method: 'PATCH', body: { isDefault: true } });
                          void load();
                        } catch (err) {
                          toast.error(errorMessage(err));
                        }
                      }}
                    >
                      Set as default
                    </button>
                  )}
                  <button type="button" className="font-semibold text-danger underline underline-offset-4" onClick={() => setDeleting(a)}>
                    Delete
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent title="Delete this address?" description="Past orders keep their own copy of the delivery address.">
          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="ghost">Keep</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await api(`/users/me/addresses/${deleting!.id}`, { method: 'DELETE' });
                  setDeleting(null);
                  void load();
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
