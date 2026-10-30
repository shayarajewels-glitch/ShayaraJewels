'use client';

import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { CATEGORIES, type AdminBlogDto, type ProductType } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Field, Input, Label, NativeSelect, Textarea } from '@/components/ui/form-controls';
import { Card } from '@/components/ui/misc';
import { ApiError, api, errorMessage } from '@/lib/api-client';
import { IMAGE_TYPES } from '@/lib/uploadthing';
import { isImageSource } from '@/lib/utils';
import { useUploader } from './media-manager';

interface FormState {
  title: string;
  category: ProductType | '';
  content: string;
  image: { url: string; key?: string | null; alt: string } | null;
}

export function BlogForm({ blog }: { blog?: AdminBlogDto }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    title: blog?.title ?? '',
    category: blog?.category ?? '',
    content: blog?.content ?? '',
    image: blog?.image ?? null,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const uploader = useUploader('productImage', ([file]) => {
    if (!file) return;
    setForm((f) => ({ ...f, image: { url: file.url, key: file.key, alt: f.image?.alt || f.title } }));
    toast.success('Picture uploaded — save the post to keep it');
  });

  const applyLink = () => {
    const url = link.trim();
    if (!isImageSource(url)) return toast.error('Enter an https image link, or a site path like /images/products/my-ring.jpg');
    setForm((f) => ({ ...f, image: { url, alt: f.image?.alt || f.title } }));
    setLink('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image) {
      setErrors({ image: 'Add a picture' });
      return toast.error('Add a picture for the post');
    }
    setSaving(true);
    setErrors({});
    const body = {
      title: form.title.trim(),
      category: form.category || null,
      content: form.content.trim(),
      image: { url: form.image.url, ...(form.image.key ? { key: form.image.key } : {}), alt: form.image.alt.trim() },
    };
    try {
      if (blog) await api(`/admin/blogs/${blog.id}`, { method: 'PATCH', body });
      else await api('/admin/blogs', { method: 'POST', body });
      toast.success(blog ? 'Post saved' : 'Post published');
      router.push('/admin/blogs');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(Object.fromEntries(err.details.map((d) => [d.path.split('.')[0], d.message])));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <Card className="space-y-5 p-6">
        <Field id="title" label="Title" error={errors.title}>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} required />
        </Field>
        <Field
          id="category"
          label="Category"
          error={errors.category}
          hint="Optional. Shown as a label on the post and links readers to that category."
        >
          <NativeSelect value={form.category} onChange={(e) => set('category', e.target.value as ProductType | '')}>
            <option value="">No category</option>
            {CATEGORIES.map((c) => (
              <option key={c.type} value={c.type}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="content" label="Content" error={errors.content} hint="Plain text. Leave an empty line between paragraphs.">
          <Textarea value={form.content} onChange={(e) => set('content', e.target.value)} maxLength={20_000} required className="min-h-72 leading-7" />
        </Field>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-2xl">Picture</h2>
        {form.image ? (
          <div className="space-y-3">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-ivory-deep ring-1 ring-border">
              <ProductImage src={form.image.url} alt="" fill sizes="(min-width: 768px) 720px, 100vw" />
            </div>
            <p className="truncate text-[0.7rem] text-charcoal-soft">{form.image.url}</p>
            <Field id="imageAlt" label="Picture description (for screen readers)">
              <Input value={form.image.alt} onChange={(e) => set('image', { ...form.image!, alt: e.target.value })} maxLength={160} />
            </Field>
            <Button type="button" variant="ghost" size="sm" onClick={() => set('image', null)}>
              <Trash2 /> Remove picture
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-charcoal-soft">A wide photo works best (about 16 × 9).</p>
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
              <Upload /> {uploader.isUploading ? `Uploading… ${Math.round(uploader.progress)}%` : 'Upload picture'}
            </Button>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Label htmlFor="blog-image-link" className="text-xs">
                  Or paste an image link
                </Label>
                <Input
                  id="blog-image-link"
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
              <Button type="button" size="sm" variant="outline" onClick={applyLink}>
                <ImagePlus /> Use
              </Button>
            </div>
            {errors.image && <p className="text-sm text-danger">{errors.image}</p>}
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button type="submit" loading={saving} disabled={uploader.isUploading}>
          {blog ? 'Save post' : 'Publish post'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/blogs')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
