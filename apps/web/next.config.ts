import type { NextConfig } from 'next';

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').origin;
  } catch {
    return 'http://localhost:4000';
  }
})();

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Optional same-origin proxy to the API (e.g. https://shayara-api.onrender.com).
 * Lets the storefront run on a host like *.vercel.app without a custom domain:
 * the browser only talks to the storefront origin, so the session cookie stays
 * first-party. Point NEXT_PUBLIC_API_BASE_URL at `<storefront>/api/v1` when set.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, '');

/**
 * Content Security Policy. Razorpay Checkout needs its script, frames and API;
 * UploadThing needs its ingest hosts for direct uploads.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh https://*.razorpay.com",
  "media-src 'self' blob: https://utfs.io https://*.ufs.sh",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin} https://*.razorpay.com https://*.ingest.uploadthing.com https://*.ufs.sh https://utfs.io https://api.uploadthing.com https://sea1.ingest.uploadthing.com${isDev ? ' ws: http://localhost:*' : ''}`,
  'frame-src https://api.razorpay.com https://checkout.razorpay.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The shared workspace package ships TypeScript source.
  transpilePackages: ['@shayara/shared'],
  images: {
    remotePatterns: [new URL('https://utfs.io/f/**'), { protocol: 'https', hostname: '*.ufs.sh', pathname: '/f/**' }],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      { source: '/api/v1/:path*', destination: `${apiProxyTarget}/api/v1/:path*` },
      { source: '/api/uploadthing', destination: `${apiProxyTarget}/api/uploadthing` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")' },
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
        ],
      },
      {
        // Private pages must never be indexed (authorization is still enforced by the API).
        source: '/(account|admin|checkout|cart|wishlist|login|register|forgot-password|reset-password|verify-email)(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
