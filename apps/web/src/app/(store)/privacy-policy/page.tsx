import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/layout/content-page';
import { SUPPORT_EMAIL } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy policy', description: 'How Shayara collects, uses and protects your personal data.', alternates: { canonical: '/privacy-policy' } };

export default function PrivacyPolicyPage() {
  return (
    <ContentPage title="Privacy policy" updated="27 October 2026">
      <p>
        This policy explains what personal data Shayara collects, why, and the choices you have. It is written to align with India&apos;s Digital Personal Data Protection
        Act, 2023.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, optional mobile number and a securely hashed password (we never store your password itself).</li>
        <li>Delivery addresses you save and the address copied onto each order.</li>
        <li>Order history, reviews you submit and messages you send us.</li>
        <li>Payment status and references from Razorpay. We never see or store your card, UPI PIN or bank credentials.</li>
        <li>Technical data needed to keep the site secure, such as a session cookie and basic request logs.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To process and deliver your orders, handle returns and refunds, and provide support.</li>
        <li>To keep your account and our store secure (for example, preventing fraud and abuse).</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>
        Only service providers that help us run the store: our payment processor (Razorpay), courier partners, hosting and database providers, file storage for product
        media, and email delivery. We do not sell your personal data.
      </p>
      <h2>Cookies</h2>
      <p>
        We use one essential, HTTP-only session cookie to keep you signed in and protect forms against cross-site attacks. Your wishlist is stored in your browser on this
        device. We do not use advertising cookies.
      </p>
      <h2>Retention</h2>
      <p>We keep account data while your account is active, and order records as long as the law requires for tax and accounting purposes.</p>
      <h2>Your rights</h2>
      <p>
        You can view and update your profile and addresses in <Link href="/account/profile">My account</Link>. To request access to, correction or deletion of your data,
        or to raise a grievance, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
