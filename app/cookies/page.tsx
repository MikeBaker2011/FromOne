import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Cookie Policy | FromOne',
  description: 'Read how FromOne uses cookies and similar technologies.',
  alternates: {
    canonical: '/cookies',
  },
};

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <PublicNav />

      <section className="page-header legal-header">
        <div className="page-eyebrow">FromOne Cookie Policy</div>
        <h1 className="page-title">Cookie Policy</h1>
        <p className="page-description">
          This page explains how FromOne uses cookies and similar technologies.
        </p>
        <p className="legal-updated">Last updated: 13 May 2026</p>
      </section>

      <section className="premium-card legal-card">
        <h2>1. What cookies are</h2>
        <p>
          Cookies are small files stored on your device when you visit a website. They can help
          a website work properly, remember preferences, keep you signed in, or understand how
          the service is used.
        </p>

        <h2>2. How FromOne uses cookies</h2>
        <p>FromOne may use cookies or similar technologies for the following purposes:</p>
        <ul>
          <li>
            <strong>Essential cookies:</strong> needed for sign-in, account security, session
            management, and core app functionality.
          </li>
          <li>
            <strong>Preference cookies:</strong> used to remember interface choices or saved
            settings.
          </li>
          <li>
            <strong>Analytics cookies:</strong> used only if analytics tools are added, to help
            understand how people use FromOne.
          </li>
          <li>
            <strong>Payment cookies:</strong> used by PayPal or payment providers when checkout
            or subscription billing is connected.
          </li>
        </ul>

        <h2>3. Essential cookies</h2>
        <p>
          Essential cookies are required for FromOne to work. These may include authentication
          cookies from Supabase or other session-related cookies. You cannot disable these
          through FromOne because they are needed to provide the service.
        </p>

        <h2>4. Non-essential cookies</h2>
        <p>
          If FromOne uses analytics, advertising, tracking, or other non-essential cookies, we
          will explain what they do and request consent where required before setting them.
        </p>

        <h2>5. Managing cookies</h2>
        <p>
          You can control cookies through your browser settings. Blocking some cookies may stop
          parts of FromOne from working correctly, especially account login and dashboard access.
        </p>

        <h2>6. Third-party services</h2>
        <p>
          Some third-party services may set cookies or similar technologies. These may include
          Supabase for authentication and PayPal once billing is connected. Their cookie use is
          controlled by their own policies.
        </p>

        <h2>7. Changes to this policy</h2>
        <p>
          We may update this Cookie Policy as FromOne changes or as new tools are added.
        </p>

        <div className="legal-link-row">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}