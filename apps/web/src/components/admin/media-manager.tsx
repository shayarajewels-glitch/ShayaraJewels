'use client';

import { ArrowDown, ArrowUp, ImagePlus, Trash2, Upload, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ProductImageInput, ProductVideoInput } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Input, Label, NativeSelect } from '@/components/ui/form-controls';
import { Alert, Card } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { IMAGE_TYPES, VIDEO_TYPES, sizeToBytes, useUploadThing, videoDuration, type UploadConfig, type UploadEndpoint } from '@/lib/uploadthing';

const MAX_IMAGES = 12;
const MAX_VIDEOS = 3;

export interface MediaState {
  images: ProductImageInput[];
  videos: ProductVideoInput[];
}

/** Short-lived upload token from the API (admin + CSRF protected), reused until shortly before expiry. */
let cachedToken: { token: string; expiresAt: number } | null = null;
async function uploadToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) return cachedToken.token;
  const res = await api<{ token: string; expiresAt: string }>('/admin/uploads/token', { method: 'POST' });
  cachedToken = { token: res.token, expiresAt: new Date(res.expiresAt).getTime() };
  return res.token;
}

/** Shared with other admin forms (e.g. coupon banners). */
export function useUploader(endpoint: UploadEndpoint, onDone: (files: { url: string; key: string; name: string }[]) => void) {
  const [progress, setProgress] = useState(0);
  const { startUpload, isUploading } = useUploadThing(endpoint, {
    headers: async () => ({ Authorization: `Bearer ${await uploadToken()}` }),
    uploadProgressGranularity: 'fine',
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: (res) => {
      setProgress(0);
      onDone(res.map((f) => ({ url: f.ufsUrl, key: f.key, name: f.name })));
    },
    onUploadError: (err) => {
      setProgress(0);
      toast.error(err.message || 'Upload failed');
    },
  });
  return { startUpload, isUploading, progress };
}

export function MediaManager({ value, onChange, productName }: { value: MediaState; onChange: (next: MediaState) => void; productName: string }) {
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [pathInput, setPathInput] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  // Upload callbacks fire later; read the newest media state, not the one captured at render.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    api<UploadConfig>('/admin/uploads/config')
      .then(setConfig)
      .catch(() => setConfig({ enabled: false, maxImageSize: '4MB', maxVideoSize: '32MB', maxVideoSeconds: 60 }));
  }, []);

  const images = [...value.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const setImages = (next: ProductImageInput[]) => onChange({ ...latest.current, images: next.map((img, i) => ({ ...img, sortOrder: i })) });
  const setVideos = (next: ProductVideoInput[]) => onChange({ ...latest.current, videos: next });

  const imageUploader = useUploader('productImage', (files) => {
    const current = [...latest.current.images].sort((a, b) => a.sortOrder - b.sortOrder);
    setImages([...current, ...files.map((f) => ({ url: f.url, key: f.key, alt: `${productName || 'Product'} photo`, sortOrder: 0 }))]);
    toast.success(`${files.length} image${files.length === 1 ? '' : 's'} uploaded — save the product to keep them`);
  });
  const videoUploader = useUploader('productVideo', (files) => {
    setVideos([...latest.current.videos, ...files.map((f) => ({ url: f.url, key: f.key }))]);
    toast.success('Video uploaded — save the product to keep it');
  });

  const pickImages = async (files: FileList | null) => {
    if (!files?.length || !config) return;
    const list = Array.from(files);
    const max = sizeToBytes(config.maxImageSize);
    const bad = list.find((f) => !IMAGE_TYPES.includes(f.type) || f.size > max);
    if (bad) return toast.error(`${bad.name}: use JPEG, PNG, WebP or AVIF up to ${config.maxImageSize}`);
    if (images.length + list.length > MAX_IMAGES) return toast.error(`A product can have at most ${MAX_IMAGES} images`);
    await imageUploader.startUpload(list);
  };

  const pickVideo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !config) return;
    if (!VIDEO_TYPES.includes(file.type) || file.size > sizeToBytes(config.maxVideoSize)) {
      return toast.error(`Use an MP4 or WebM video up to ${config.maxVideoSize}`);
    }
    if (value.videos.length >= MAX_VIDEOS) return toast.error(`A product can have at most ${MAX_VIDEOS} videos`);
    try {
      const seconds = await videoDuration(file);
      if (seconds > config.maxVideoSeconds) return toast.error(`Videos can be at most ${config.maxVideoSeconds} seconds long`);
    } catch (err) {
      return toast.error(errorMessage(err));
    }
    await videoUploader.startUpload([file]);
  };

  const move = (i: number, delta: number) => {
    const next = [...images];
    const [item] = next.splice(i, 1);
    next.splice(i + delta, 0, item!);
    setImages(next);
  };

  const addPath = () => {
    const path = pathInput.trim();
    if (!/^\/[\w\-./]+$/.test(path)) return toast.error('Enter a site path like /images/products/my-ring.jpg');
    if (images.length >= MAX_IMAGES) return toast.error(`A product can have at most ${MAX_IMAGES} images`);
    setImages([...images, { url: path, alt: `${productName || 'Product'} photo`, sortOrder: images.length }]);
    setPathInput('');
  };

  const uploading = imageUploader.isUploading || videoUploader.isUploading;
  const progress = imageUploader.isUploading ? imageUploader.progress : videoUploader.progress;

  return (
    <div className="space-y-6">
      {config && !config.enabled && (
        <Alert variant="info" title="Uploads are not configured">
          Set UPLOADTHING_TOKEN on the API to upload photos and videos. Meanwhile you can add images that already exist on the site by path.
        </Alert>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-sm font-semibold">
            Images <span className="font-normal text-charcoal-soft">({images.length}/{MAX_IMAGES}) — the first image is the cover</span>
          </h3>
          {config?.enabled && (
            <>
              <input ref={imageInput} type="file" accept={IMAGE_TYPES.join(',')} multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void pickImages(e.target.files).finally(() => (e.target.value = ''))} />
              <Button type="button" size="sm" variant="outline" onClick={() => imageInput.current?.click()} disabled={uploading}>
                <Upload /> Upload images
              </Button>
            </>
          )}
        </div>

        {uploading && (
          <div className="mb-3" role="status" aria-live="polite">
            <p className="text-xs text-charcoal-soft">Uploading… {progress}%</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ivory-deep">
              <div className="h-full bg-rose-deep transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {images.length === 0 ? (
          <p className="rounded-sm border border-dashed border-sand px-4 py-8 text-center text-sm text-charcoal-soft">No images yet. A published product needs at least one.</p>
        ) : (
          <ol className="space-y-3">
            {images.map((img, i) => (
              <li key={`${img.url}-${i}`}>
                <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-ivory-deep">
                    <ProductImage src={img.url} alt="" fill sizes="80px" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded-sm bg-rose-deep px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-ivory">Cover</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`alt-${i}`} className="text-xs">
                      Alt text (describe the photo)
                    </Label>
                    <Input
                      id={`alt-${i}`}
                      value={img.alt}
                      maxLength={160}
                      onChange={(e) => setImages(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                      className="h-9"
                    />
                    <p className="mt-1 truncate text-[0.7rem] text-charcoal-soft">{img.url}</p>
                  </div>
                  <div className="flex gap-1 self-end sm:self-center">
                    <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move image ${i + 1} up`}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Move image ${i + 1} down`}>
                      <ArrowDown />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="text-danger" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="image-path" className="text-xs">
              Add image by site path
            </Label>
            <Input id="image-path" placeholder="/images/products/rng-mira-g-1.jpg" value={pathInput} onChange={(e) => setPathInput(e.target.value)} className="h-9" />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addPath}>
            <ImagePlus /> Add
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-sm font-semibold">
            Videos <span className="font-normal text-charcoal-soft">(optional, up to {config?.maxVideoSeconds ?? 60}s)</span>
          </h3>
          {config?.enabled && (
            <>
              <input ref={videoInput} type="file" accept={VIDEO_TYPES.join(',')} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void pickVideo(e.target.files).finally(() => (e.target.value = ''))} />
              <Button type="button" size="sm" variant="outline" onClick={() => videoInput.current?.click()} disabled={uploading || value.videos.length >= MAX_VIDEOS}>
                <Video /> Upload video
              </Button>
            </>
          )}
        </div>
        {value.videos.length === 0 ? (
          <p className="text-sm text-charcoal-soft">No videos.</p>
        ) : (
          <ul className="space-y-3">
            {value.videos.map((v, i) => (
              <li key={`${v.url}-${i}`}>
                <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <video src={v.url} poster={v.thumbnailUrl} muted playsInline className="h-20 w-32 rounded-sm bg-ivory-deep object-cover" aria-label={`Video ${i + 1}`} />
                  <div className="flex-1">
                    <Label htmlFor={`thumb-${i}`} className="text-xs">
                      Thumbnail
                    </Label>
                    <NativeSelect
                      id={`thumb-${i}`}
                      value={v.thumbnailUrl ?? ''}
                      onChange={(e) => {
                        const chosen = images.find((img) => img.url === e.target.value);
                        setVideos(value.videos.map((x, j) => (j === i ? { ...x, thumbnailUrl: chosen?.url, thumbnailKey: chosen?.key } : x)));
                      }}
                      className="h-9"
                    >
                      <option value="">None</option>
                      {images.map((img, n) => (
                        <option key={img.url} value={img.url}>
                          Image {n + 1}: {img.alt}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="self-end text-danger sm:self-center" onClick={() => setVideos(value.videos.filter((_, j) => j !== i))} aria-label={`Remove video ${i + 1}`}>
                    <Trash2 />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-charcoal-soft">Media changes are saved when you save the product. Removed uploads are deleted from storage after saving.</p>
    </div>
  );
}
