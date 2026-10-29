import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatPaise } from '@shayara/shared';

/** A site path such as /images/products/ring.jpg, or a direct https image link. */
export function isImageSource(src: string) {
  if (/^\/[\w\-./]+$/.test(src)) return true;
  try {
    return new URL(src).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The image optimizer only fetches site files and UploadThing (see next.config
 * remotePatterns); links pasted from other hosts load straight in the browser.
 */
export function canOptimizeImage(src: string) {
  if (src.toLowerCase().split('?')[0]!.endsWith('.svg')) return false;
  if (src.startsWith('/')) return true;
  try {
    const { hostname } = new URL(src);
    return hostname === 'utfs.io' || /^[a-z0-9]+\.ufs\.sh$/i.test(hostname);
  } catch {
    return false;
  }
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-IN', opts).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
