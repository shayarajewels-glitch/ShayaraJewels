'use client';

import { ImagePlus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { CATEGORIES, type CouponDto, type ProductType } from '@shayara/shared';
import { Carousel } from '@/components/promo/carousel';
import { couponSlide } from '@/components/promo/slides';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Label, Textarea } from '@/components/ui/form-controls';
import { Card } from '@/components/ui/misc';
import { ApiError, api, errorMessage } from '@/lib/api-client';
import { IMAGE_TYPES } from '@/lib/uploadthing';
import { useUploader } from './media-manager';

interface FormState {
  code: string;
  title: string;
  description: string;
  discountPercent: string;
  appliesTo: ProductType[];
  image: { url: string; key?: string; alt: string } | null;
  active: boolean;
  startsOn: string;
  endsOn: string;
  sortOrder: string;
}

/** ISO instant -> yyyy-mm-dd in India time, for <input type="date">. */
const toDateInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');

function fromCoupon(c?: CouponDto): FormState {
  return {
    code: c?.code ?? '',
    title: c?.title ?? '',
    description: c?.description ?? '',
    discountPercent: c ? String(c.discountPercent) : '10',
    appliesTo: c?.appliesTo ?? [],
    image: c?.image ?? null,
    active: c?.active ?? true,
    startsOn: toDateInput(c?.startsAt ?? null),
    endsOn: toDateInput(c?.endsAt ?? null),
    sortOrder: c ? String(c.sortOrder) : '0',
  };
}

export function CouponForm({ coupon }: { coupon?: CouponDto }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => fromCoupon(coupon));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const uploader = useUploader('productImage', ([file]) => {
    if (!file) return;
    setForm((f) => ({ ...f, image: { url: file.url, key: file.key, alt: f.image?.alt || f.title } }));
    toast.success('Banner uploaded — save the coupon to keep it');
  });

  const toggleType = (t: ProductType) =>
    set('appliesTo', form.appliesTo.includes(t) ? form.appliesTo.filter((x) => x !== t) : [...form.appliesTo, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const body = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      discountPercent: Number(form.discountPercent),
      appliesTo: form.appliesTo,
      image: form.image ? { url: form.image.url, ...(form.image.key ? { key: form.image.key } : {}), alt: form.image.alt.trim() } : null,
      active: form.active,
      // Dates are whole days in India time: from the start of the first day to the end of the last.
      startsAt: form.startsOn ? `${form.startsOn}T00:00:00+05:30` : null,
      endsAt: form.endsOn ? `${form.endsOn}T23:59:59+05:30` : null,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (coupon) await api(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body });
      else await api('/admin/coupons', { method: 'POST', body });
      toast.success(coupon ? 'Coupon saved' : `Coupon ${body.code} created`);
      router.push('/admin/coupons');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const preview = couponSlide({
    code: form.code.trim().toUpperCase() || 'CODE',
    title: form.title || 'Coupon title',
    description: form.description,
    discountPercent: Number(form.discountPercent) || 0,
    appliesTo: form.appliesTo,
    image: form.image ? { url: form.image.url, alt: form.image.alt } : null,
    endsAt: form.endsOn ? `${form.endsOn}T23:59:59+05:30` : null,
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Label>Carousel preview</Label>
        <Carousel slides={[preview]} label="Coupon preview" />
      </div>
      <div className="max-w-3xl space-y-6">
        <Card className="space-y-5 p-6">
          <h2 className="text-2xl">Offer</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="code" label="Coupon code" error={errors.code} hint="Customers type this at checkout, e.g. ANKLET20.">
              <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={24} required className="font-mono uppercase tracking-wider" />
            </Field>
            <Field id="discountPercent" label="Discount (%)" error={errors.discountPercent} hint="Between 1 and 90.">
              <Input type="number" min={1} max={90} step={1} value={form.discountPercent} onChange={(e) => set('discountPercent', e.target.value)} required />
            </Field>
          </div>
          <Field id="title" label="Title" error={errors.title} hint="Shown large on the carousel slide, e.g. “Festive anklet sale”.">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} required />
          </Field>
          <Field id="description" label="Short description (optional)" error={errors.description}>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={200} className="min-h-20" />
          </Field>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-2xl">Applies to</h2>
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox checked={form.appliesTo.length === 0} onChange={() => set('appliesTo', [])} />
            <span>
              <strong>All products</strong> <span className="text-charcoal-soft">(sitewide)</span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <label key={c.type} className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={form.appliesTo.includes(c.type)} onChange={() => toggleType(c.type)} />
                {c.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-charcoal-soft">The discount comes off only the matching items in the bag. Shipping stays free above ₹999 based on the bag total before the discount.</p>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-2xl">Carousel banner</h2>
          <p className="text-sm text-charcoal-soft">Upload a wide image, ideally 1600 × 600 px (JPG, PNG or WebP). The code, discount and a Copy button are drawn on top of the left side, so keep that area simple. Without a banner the slide uses a product photo from the chosen category.</p>
          {form.image ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of any uploaded URL */}
              <img src={form.image.url} alt="" className="aspect-[8/3] w-full rounded-lg object-cover ring-1 ring-border" />
              <Field id="imageAlt" label="Image description (for screen readers)">
                <Input value={form.image.alt} onChange={(e) => set('image', { ...form.image!, alt: e.target.value })} maxLength={160} />
              </Field>
              <Button type="button" variant="ghost" size="sm" onClick={() => set('image', null)}>
                <Trash2 /> Remove banner
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_TYPES.join(',')}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).slice(0, 1);
                  if (files.length) void uploader.startUpload(files);
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} loading={uploader.isUploading}>
                <ImagePlus /> {uploader.isUploading ? `Uploading… ${Math.round(uploader.progress)}%` : 'Upload banner'}
              </Button>
            </div>
          )}
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="text-2xl">Schedule</h2>
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            <span>
              <strong>Active</strong> — customers can use it and it shows in the carousel
            </span>
          </label>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="startsOn" label="Starts (optional)" error={errors.startsAt}>
              <Input type="date" value={form.startsOn} onChange={(e) => set('startsOn', e.target.value)} />
            </Field>
            <Field id="endsOn" label="Ends (optional)" error={errors.endsAt} hint="Valid through this whole day.">
              <Input type="date" value={form.endsOn} onChange={(e) => set('endsOn', e.target.value)} />
            </Field>
            <Field id="sortOrder" label="Carousel order" hint="Lower shows first.">
              <Input type="number" min={0} max={1000} value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={saving}>
            {coupon ? 'Save coupon' : 'Create coupon'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/admin/coupons')}>
            Cancel
          </Button>
        </div>
      </div>

    </form>
  );
}
