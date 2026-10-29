import Image, { type ImageProps } from 'next/image';
import { canOptimizeImage, cn } from '@/lib/utils';

/**
 * next/image wrapper. Local SVG placeholders and links to other hosts are
 * served as-is; site photos and UploadThing uploads are optimised.
 */
export function ProductImage({ src, className, ...props }: Omit<ImageProps, 'src'> & { src: string }) {
  return <Image src={src} unoptimized={!canOptimizeImage(src)} className={cn('object-cover', className)} {...props} />;
}
