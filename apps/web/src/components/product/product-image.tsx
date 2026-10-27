import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

/**
 * next/image wrapper. Local SVG placeholders are served as-is (the image
 * optimizer does not rasterise SVG); uploaded photos are optimised.
 */
export function ProductImage({ src, className, ...props }: Omit<ImageProps, 'src'> & { src: string }) {
  const isSvg = src.toLowerCase().split('?')[0]!.endsWith('.svg');
  return <Image src={src} unoptimized={isSvg} className={cn('object-cover', className)} {...props} />;
}
