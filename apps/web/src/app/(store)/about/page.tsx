import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = {
  title: 'About Shayara',
  description: 'Shayara makes contemporary fashion jewellery for everyday elegance — honest about materials, designed for real life.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <ContentPage eyebrow="Our story" title="About Shayara">
      <p className="font-display text-2xl leading-snug text-charcoal">Everyday elegance. Your kind of shine.</p>
      <p>
        Shayara began with a simple idea: jewellery you reach for every morning should feel special without feeling precious. We design rings, necklaces, pendants,
        bracelets and anklets for the way you actually live — commutes and coffee runs, desk days and dinner plans, weddings and weekends.
      </p>
      <h2>What we make</h2>
      <p>
        Shayara is a fashion and artificial jewellery brand. Our pieces come in gold, silver and rose gold <strong>tones</strong> — plated or coated finishes over base
        metals such as brass and stainless steel. We never present our jewellery as solid gold or silver, and every product page lists its finish and base material
        separately so you know exactly what you are buying.
      </p>
      <h2>How we design</h2>
      <ul>
        <li>Light, comfortable pieces made for all-day wear.</li>
        <li>Designs that layer and stack, so your collection grows with you.</li>
        <li>Prices that make it easy to match jewellery to your mood.</li>
      </ul>
      <h2>Our promise</h2>
      <p>
        Clear descriptions, secure checkout, honest reviews from verified buyers and a straightforward{' '}
        <Link href="/returns-policy">returns policy</Link>. If something isn&apos;t right, <Link href="/contact">tell us</Link> — we read every message.
      </p>
    </ContentPage>
  );
}
