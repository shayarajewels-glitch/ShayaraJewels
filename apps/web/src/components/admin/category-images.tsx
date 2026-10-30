'use client';

import { ImagePlus, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AdminCategoryImageDto } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form-controls';
import { Alert, Badge, Card, Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { CATEGORY_TILES } from '@/lib/category-tiles';
import { IMAGE_TYPES } from '@/lib/uploadthing';
import { isImageSource } from '@/lib/utils';
import { AdminPageHeader, useAdminResource } from './admin-ui';
import { useUploader } from './media-manager';

type Draft = { url: string; key?: string | null; alt: string } | null;

const sameImage = (a: Draft, b: Draft) => (a?.url ?? null) === (b?.url ?? null) && (a?.alt ?? '') === (b?.alt ?? '');

function CategoryImageCard({ item, onSaved }: { item: AdminCategoryImageDto; onSaved: (items: AdminCategoryImageDto[]) => void }) {
  const builtIn = CATEGORY_TILES[item.slug]!;
  const [draft, setDraft] = useState<Draft>(item.image);
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = !sameImage(draft, item.image);
  const defaultAlt = `${item.name} from Shayara`;

  const uploader = useUploader('productImage', ([file]) => {
    if (!file) return;
    setDraft((d) => ({ url: file.url, key: file.key, alt: d?.alt || defaultAlt }));
    toast.success(`Picture uploaded — click Save to show it on ${item.name}`);
  });

  const applyLink = () => {
    const url = link.trim();
    if (!isImageSource(url)) return toast.error('Enter an https image link, or a site path like /images/products/my-ring.jpg');
    setDraft((d) => ({ url, alt: d?.alt || defaultAlt }));
    setLink('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { image: draft ? { url: draft.url, ...(draft.key ? { key: draft.key } : {}), alt: draft.alt.trim() } : null };
      const res = await api<{ items: AdminCategoryImageDto[] }>(`/admin/category-images/${item.type}`, { method: 'PATCH', body });
      toast.success(draft ? `${item.name} picture saved` : `${item.name} is back to the built-in photo`);
      onSaved(res.items);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl">{item.name}</h2>
        {draft ? <Badge variant="gold">Custom</Badge> : <Badge variant="muted">Built-in photo</Badge>}
      </div>

      <div className={`arch relative mx-auto aspect-[3/4] w-full max-w-[13rem] overflow-hidden bg-gradient-to-b ${builtIn.tint} ring-1 ring-border`}>
        <ProductImage src={draft?.url ?? builtIn.image} alt="" fill sizes="208px" />
      </div>
      {draft && <p className="truncate text-center text-[0.7rem] text-charcoal-soft">{draft.url}</p>}

      <div className="space-y-3">
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
        <Button type="button" variant="outline" className="w-full" onClick={() => fileInput.current?.click()} loading={uploader.isUploading}>
          <Upload /> {uploader.isUploading ? `Uploading… ${Math.round(uploader.progress)}%` : 'Upload picture'}
        </Button>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label htmlFor={`link-${item.type}`} className="text-xs">
              Or paste an image link
            </Label>
            <Input
              id={`link-${item.type}`}
              placeholder="https://example.com/photo.jpg"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink();
                }
              }}
              className="h-9"
            />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={applyLink} aria-label={`Use link for ${item.name}`}>
            <ImagePlus /> Use
          </Button>
        </div>

        {draft && (
          <div>
            <Label htmlFor={`alt-${item.type}`} className="text-xs">
              Picture description (for screen readers)
            </Label>
            <Input id={`alt-${item.type}`} value={draft.alt} maxLength={160} onChange={(e) => setDraft({ ...draft, alt: e.target.value })} className="h-9" />
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" size="sm" onClick={() => void save()} loading={saving} disabled={!dirty || uploader.isUploading}>
          Save
        </Button>
        {dirty && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(item.image)}>
            Discard
          </Button>
        )}
        {draft && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
            <RotateCcw /> Use built-in photo
          </Button>
        )}
      </div>
    </Card>
  );
}

export function CategoryImagesEditor() {
  const { data, error, loading } = useAdminResource<{ items: AdminCategoryImageDto[] }>('/admin/category-images');
  const [saved, setSaved] = useState<AdminCategoryImageDto[] | null>(null);
  const items = saved ?? data?.items;

  return (
    <div>
      <AdminPageHeader
        title="Category images"
        description="The pictures on the “Shop by category” tiles on the home page. Upload a photo or paste a direct image link, then click Save. Tall photos (about 3 × 4) fit the arch best."
      />
      {error && <Alert variant="error" title="Could not load categories">{error}</Alert>}
      {loading && !items && <Skeleton className="h-96" />}
      {items && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            // Remount after a save so the card starts from the stored picture.
            <CategoryImageCard key={`${item.type}-${item.updatedAt ?? 'built-in'}`} item={item} onSaved={setSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
