'use client';

import { generateReactHelpers } from '@uploadthing/react';
import type { FileRouter } from 'uploadthing/types';
import { UPLOADTHING_URL } from './config';

/**
 * UploadThing client helpers pointed at the Express API's route handler.
 * Kept untyped (generic FileRouter) so the web app never imports API code;
 * the endpoints are `productImage` and `productVideo`.
 */
export const { useUploadThing } = generateReactHelpers<FileRouter>({ url: UPLOADTHING_URL });

export type UploadEndpoint = 'productImage' | 'productVideo';

export interface UploadConfig {
  enabled: boolean;
  maxImageSize: string;
  maxVideoSize: string;
  maxVideoSeconds: number;
}

/** "4MB" -> bytes. */
export function sizeToBytes(size: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i.exec(size.trim());
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  const unit = m[2]!.toUpperCase();
  return Math.round(n * (unit === 'KB' ? 1024 : unit === 'MB' ? 1024 ** 2 : 1024 ** 3));
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];

/** Reads a video's duration in the browser (seconds). */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the video file'));
    };
    el.src = url;
  });
}
