import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-charcoal py-2 text-center text-[0.7rem] font-medium tracking-[0.14em] text-ivory">
        Free shipping on orders above ₹999 · Easy 7-day returns
      </div>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
