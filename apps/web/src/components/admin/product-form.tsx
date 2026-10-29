'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  FINISHES,
  FINISH_LABELS,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  createProductSchema,
  updateProductSchema,
  type AdminProductDto,
} from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls';
import { Alert, Card } from '@/components/ui/misc';
import { ApiError, api, errorMessage } from '@/lib/api-client';
import { rupeesInput, toPaise } from './admin-ui';
import { MediaManager, type MediaState } from './media-manager';
import { StockAdjuster } from './stock-adjuster';

const rupees = z.string().trim().refine((v) => v === '' || /^\d+(\.\d{1,2})?$/.test(v.replace(/,/g, '')), 'Enter an amount in rupees, e.g. 1299 or 1299.50');

/** Form values are strings as typed; the shared API schema validates the converted payload. */
const formSchema = z.object({
  name: z.string().trim().min(3, 'Name is too short').max(120),
  slug: z.string().trim().max(120),
  sku: z.string().trim().min(3, 'SKU is required').max(40),
  description: z.string().trim().min(20, 'Write at least 20 characters').max(5000),
  type: z.enum(PRODUCT_TYPES),
  finish: z.enum(FINISHES),
  baseMaterial: z.string().trim().max(80),
  sizeOptions: z.string().max(400),
  careInstructions: z.string().trim().max(1000),
  price: rupees.refine((v) => v !== '', 'Price is required'),
  compareAt: rupees,
  stock: z.string().trim().refine((v) => v === '' || /^\d+$/.test(v), 'Whole number of units'),
  status: z.enum(PRODUCT_STATUSES),
  featured: z.boolean(),
  searchKeywords: z.string().max(800),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
});
type FormValues = z.infer<typeof formSchema>;

/** Maps API / shared-schema paths to form fields. */
const PATH_TO_FIELD: Record<string, keyof FormValues | 'media'> = {
  pricePaise: 'price',
  compareAtPricePaise: 'compareAt',
  images: 'media',
  videos: 'media',
};

const list = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function defaults(p?: AdminProductDto): FormValues {
  return {
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    sku: p?.sku ?? '',
    description: p?.description ?? '',
    type: p?.type ?? 'ring',
    finish: p?.finish ?? 'gold',
    baseMaterial: p?.baseMaterial ?? '',
    sizeOptions: p?.sizeOptions.join(', ') ?? '',
    careInstructions: p?.careInstructions ?? '',
    price: rupeesInput(p?.pricePaise),
    compareAt: rupeesInput(p?.compareAtPricePaise),
    stock: p ? String(p.stock) : '0',
    status: p?.status ?? 'draft',
    featured: p?.featured ?? false,
    searchKeywords: p?.searchKeywords.join(', ') ?? '',
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
  };
}

export function ProductForm({ product: initial }: { product?: AdminProductDto }) {
  const router = useRouter();
  const [product, setProduct] = useState(initial);
  const isEdit = Boolean(product);
  const [media, setMedia] = useState<MediaState>({
    images: initial?.images.map((i) => ({ url: i.url, key: i.key, alt: i.alt, sortOrder: i.sortOrder })) ?? [],
    videos: initial?.videos.map((v) => ({ url: v.url, key: v.key, thumbnailUrl: v.thumbnailUrl, thumbnailKey: v.thumbnailKey })) ?? [],
  });
  const [mediaError, setMediaError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults(initial) });

  const [seoTitle, seoDescription, name] = useWatch({ control, name: ['seoTitle', 'seoDescription', 'name'] });

  const applyIssues = (issues: { path: string; message: string }[]) => {
    for (const issue of issues) {
      const root = issue.path.split('.')[0] ?? '';
      const field = PATH_TO_FIELD[root] ?? (root as keyof FormValues);
      if (field === 'media') setMediaError(issue.message);
      else if (field in formSchema.shape) setError(field as keyof FormValues, { message: issue.message });
      else setFormError(issue.message);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(undefined);
    setMediaError(undefined);
    const payload = {
      name: values.name,
      sku: values.sku,
      description: values.description,
      type: values.type,
      finish: values.finish,
      baseMaterial: values.baseMaterial || (isEdit ? '' : undefined),
      sizeOptions: list(values.sizeOptions),
      careInstructions: values.careInstructions || (isEdit ? '' : undefined),
      pricePaise: toPaise(values.price) ?? 0,
      compareAtPricePaise: toPaise(values.compareAt),
      status: values.status,
      featured: values.featured,
      searchKeywords: list(values.searchKeywords),
      seoTitle: values.seoTitle || (isEdit ? '' : undefined),
      seoDescription: values.seoDescription || (isEdit ? '' : undefined),
      images: media.images,
      videos: media.videos,
      ...(values.slug ? { slug: values.slug } : {}),
      ...(isEdit ? {} : { stock: Number(values.stock || 0) }),
    };

    // Validate with the same schema the API uses, for instant field-level feedback.
    const check = (isEdit ? updateProductSchema : createProductSchema).safeParse(payload);
    if (!check.success) {
      applyIssues(check.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
      return;
    }

    try {
      const saved = isEdit
        ? await api<AdminProductDto>(`/admin/products/${product!.id}`, { method: 'PATCH', body: payload })
        : await api<AdminProductDto>('/admin/products', { method: 'POST', body: payload });
      toast.success(isEdit ? 'Product saved' : 'Product created');
      if (isEdit) {
        setProduct(saved);
        reset(defaults(saved));
      } else {
        router.replace(`/admin/products/${saved.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) applyIssues(err.details);
      setFormError(errorMessage(err));
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate className="min-w-0 space-y-8">
        {formError && <Alert variant="error">{formError}</Alert>}

        <Card className="space-y-5 p-6">
          <h2 className="font-sans text-sm font-semibold">Basics</h2>
          <Field id="name" label="Name" error={errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="slug" label="URL slug" error={errors.slug?.message} hint={isEdit ? 'Changing it changes the product URL.' : 'Leave empty to generate from the name.'}>
              <Input {...register('slug')} placeholder="aria-layered-necklace" />
            </Field>
            <Field id="sku" label="SKU" error={errors.sku?.message}>
              <Input {...register('sku')} className="uppercase" placeholder="NCK-ARIA-G" />
            </Field>
          </div>
          <Field id="description" label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={5} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="type" label="Product type" error={errors.type?.message}>
              <NativeSelect {...register('type')} className="capitalize">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="finish" label="Finish" error={errors.finish?.message}>
              <NativeSelect {...register('finish')}>
                {FINISHES.map((f) => (
                  <option key={f} value={f}>
                    {FINISH_LABELS[f]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="baseMaterial" label="Base material" error={errors.baseMaterial?.message} hint="The actual metal/material, e.g. Brass. Never describe a plated finish as solid gold or silver.">
              <Input {...register('baseMaterial')} />
            </Field>
            <Field id="sizeOptions" label="Size options" error={errors.sizeOptions?.message} hint="Comma separated, e.g. 6, 7, 8. Leave empty if one size.">
              <Input {...register('sizeOptions')} />
            </Field>
          </div>
          <Field id="careInstructions" label="Care instructions" error={errors.careInstructions?.message}>
            <Textarea {...register('careInstructions')} rows={3} />
          </Field>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-sans text-sm font-semibold">Pricing</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="price" label="Price (₹)" error={errors.price?.message}>
              <Input {...register('price')} inputMode="decimal" />
            </Field>
            <Field id="compareAt" label="Compare-at price (₹)" error={errors.compareAt?.message} hint="Optional. Only for a genuine previous price.">
              <Input {...register('compareAt')} inputMode="decimal" />
            </Field>
            {!isEdit && (
              <Field id="stock" label="Opening stock" error={errors.stock?.message}>
                <Input {...register('stock')} inputMode="numeric" />
              </Field>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-sans text-sm font-semibold">Photos & video</h2>
          {mediaError && (
            <Alert variant="error" className="mb-4">
              {mediaError}
            </Alert>
          )}
          <MediaManager value={media} onChange={setMedia} productName={name} />
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-sans text-sm font-semibold">Search & SEO</h2>
          <Field id="searchKeywords" label="Search keywords" error={errors.searchKeywords?.message} hint="Comma separated words shoppers might search for.">
            <Input {...register('searchKeywords')} />
          </Field>
          <Field id="seoTitle" label="SEO title" error={errors.seoTitle?.message} hint={`${seoTitle.length}/70 characters. Defaults to the product name.`}>
            <Input {...register('seoTitle')} maxLength={70} />
          </Field>
          <Field id="seoDescription" label="SEO description" error={errors.seoDescription?.message} hint={`${seoDescription.length}/170 characters. Defaults to the description.`}>
            <Textarea {...register('seoDescription')} maxLength={170} rows={3} />
          </Field>
        </Card>
      </form>

      <div className="min-w-0 space-y-6 xl:sticky xl:top-8 xl:self-start">
        <Card className="space-y-4 p-5">
          <Field id="status" label="Status" error={errors.status?.message} hint="Only published products appear in the store.">
            <NativeSelect {...register('status')} form="product-form" className="capitalize">
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register('featured')} form="product-form" /> Feature on the homepage
          </label>
          <Button type="submit" form="product-form" className="w-full" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
          {isEdit && (isDirty ? <p className="text-center text-xs text-charcoal-soft">You have unsaved changes.</p> : null)}
          {product && (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/admin/products/${product.id}/preview`}>
                <Eye /> Preview
              </Link>
            </Button>
          )}
        </Card>
        {product && <StockAdjuster product={product} onUpdated={setProduct} />}
      </div>
    </div>
  );
}
