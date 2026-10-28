import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

const ANNOUNCEMENTS = ['Free shipping on orders above ₹999', 'Easy 7-day returns', 'Secure UPI, card & netbanking checkout', 'Cash on delivery available', 'Gold, silver & rose gold tones'];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="marquee overflow-hidden bg-gradient-to-r from-[#b8901f] via-[#f0d27a] to-[#b8901f] py-2 text-[0.7rem] font-semibold tracking-[0.14em] text-ivory">
        <p className="sr-only">{ANNOUNCEMENTS.join(' · ')}</p>
        <div className="marquee-track flex w-max" aria-hidden>
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0">
              {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((text, i) => (
                <li key={i} className="flex items-center gap-8 px-4 whitespace-nowrap">
                  <span>{text}</span>
                  <span className="text-ivory/60">✦</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
