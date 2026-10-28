import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { Toaster } from 'sonner';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_TITLE, SITE_URL } from '@/lib/config';
import './globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_IN', url: SITE_URL, title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
  // Google Search Console "HTML tag" verification; set the token on the host, no rebuild of code needed.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: '#0b0906',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${manrope.variable}`}>
      {/* Extensions such as ColorZilla add attributes to <body> before hydration. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
        <Toaster position="bottom-center" toastOptions={{ classNames: { toast: '!bg-popover !text-charcoal !border !border-rose-deep/40 !rounded-md', description: '!text-charcoal-soft' } }} />
      </body>
    </html>
  );
}
