import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Terms of Service | FromOne',
  description: 'Read the terms for using FromOne.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <PublicNav />

      <section className="page-header legal-header">
        <div className="page-eyebrow">FromOne Terms</div>
        <h1 className="page-title">Terms of Service</h1>
        <p className="page-description">
          These terms explain the rules for using FromOne.
        </p>
        <p className="legal-updated">Last updated: 13 May 2026</p>
      </section>

      <section className="premium-card legal-card">
        <h2>1. About FromOne</h2>
        <p>
          FromOne is a content workflow tool that helps small businesses create weekly social
          media post suggestions from a website scan or manual business profile.
        </p>

        <h2>2. Using FromOne</h2>
        <p>
          You must use FromOne lawfully and responsibly. You are responsible for reviewing all
          generated content before publishing it.
        </p>

        <h2>3. Generated content</h2>
        <p>
          FromOne uses AI-assisted tools to generate content suggestions. Generated posts may
          need editing, checking, or approval before use. You are responsible for ensuring that
          posts are accurate, lawful, and suitable for your business.
        </p>

        <h2>4. Manual publishing</h2>
        <p>
          FromOne does not publish automatically to your social media accounts. You copy,
          publish, and mark posts as done manually.
        </p>

        <h2>5. Accounts and access</h2>
        <p>
          You are responsible for keeping your account secure. If you believe your account has
          been accessed without permission, contact us as soon as possible.
        </p>

        <h2>6. Demo and subscription</h2>
        <p>
          FromOne may offer a 7-day demo. After the demo, continued access may require a paid
          subscription. The current monthly price is £29.99 unless shown differently at checkout.
        </p>
        <p>
          Once PayPal billing is connected, PayPal will manage subscription payments and
          cancellation processes.
        </p>

        <h2>7. Website scans</h2>
        <p>
          If you submit a website URL, you confirm that you have the right to use that website
          information for generating business content. FromOne may use publicly available website
          information to create content suggestions.
        </p>

        <h2>8. Uploaded content</h2>
        <p>
          You are responsible for any images, logos, text, or other materials you upload. You
          should only upload content that you own or have permission to use.
        </p>

        <h2>9. Availability</h2>
        <p>
          We aim to keep FromOne available, but we cannot guarantee uninterrupted access. The
          service may be unavailable during maintenance, updates, outages, or issues with
          third-party providers.
        </p>

        <h2>10. Limits and fair use</h2>
        <p>
          FromOne may apply limits to website scans, saved weekly plans, generated posts, uploads,
          or other usage to keep the service stable and fair for all users.
        </p>

        <h2>11. No guarantee of results</h2>
        <p>
          FromOne helps create content, but we do not guarantee social media growth, sales,
          leads, enquiries, engagement, rankings, or business results.
        </p>

        <h2>12. Ending access</h2>
        <p>
          We may suspend or end access if the service is misused, if payment fails, if these
          terms are breached, or if continued access would create risk for FromOne or other users.
        </p>

        <h2>13. Changes to these terms</h2>
        <p>
          We may update these terms as FromOne changes. The latest version will be available on
          this page.
        </p>

        <h2>14. Contact</h2>
        <p>
          For questions about these terms, contact{' '}
          <a href="mailto:mikeb33@hotmail.co.uk">mikeb33@hotmail.co.uk</a>.
        </p>

        <div className="legal-link-row">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/cookies">Cookie Policy</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}