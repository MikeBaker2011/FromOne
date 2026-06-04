import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Terms of Service | FromOne',
  description: 'Read the terms for using FromOne.',
  alternates: {
    canonical: '/terms',
  },
};

const termsSections = [
  {
    title: '1. About FromOne',
    body: [
      'FromOne is a content workflow tool that helps small businesses create weekly social media posts from a Business Profile, uploaded media, website information, and user-provided business details.',
      'FromOne can help create post wording, planned post times, and publishing workflows for channels such as Facebook, Instagram, and TikTok.',
    ],
  },
  {
    title: '2. Using FromOne',
    body: [
      'You must use FromOne lawfully and responsibly.',
      'You are responsible for reviewing all generated content before publishing or allowing it to be published.',
      'You must not use FromOne to create unlawful, misleading, harmful, abusive, infringing, or otherwise inappropriate content.',
    ],
  },
  {
    title: '3. Generated content',
    body: [
      'FromOne uses AI-assisted tools to generate content suggestions. Generated posts may need editing, checking, or approval before use.',
      'You are responsible for ensuring that posts are accurate, lawful, suitable for your business, and appropriate for the platform where they are published.',
      'Generated content should not be treated as professional legal, financial, medical, or specialist advice.',
    ],
  },
  {
    title: '4. Publishing and autoposting',
    body: [
      'FromOne may support publishing now or scheduled autoposting for supported connected platforms, such as Facebook and Instagram, when your accounts are connected and permissions are active.',
      'TikTok posting may remain manual. FromOne may create TikTok-ready wording, but you may need to copy, open TikTok, and publish it yourself.',
      'You are responsible for checking post wording, media, platform choice, scheduled time, and publishing status before relying on a post being published.',
    ],
  },
  {
    title: '5. Accounts and access',
    body: [
      'You are responsible for keeping your account secure and for any activity that happens under your account.',
      'If you believe your account has been accessed without permission, contact us as soon as possible.',
      'You must provide accurate account and business information when using FromOne.',
    ],
  },
  {
    title: '6. Demo and subscription',
    body: [
      'FromOne may offer a 7-day demo. After the demo, continued access may require a paid subscription.',
      'The current monthly price is £29.99 unless shown differently at checkout or in your account.',
      'Once payment billing is connected, the payment provider may manage subscription payments, renewals, invoices, and cancellation processes.',
    ],
  },
  {
    title: '7. Website scans',
    body: [
      'If you submit a website URL, you confirm that you have the right to use that website information for generating business content.',
      'FromOne may use publicly available website information to understand the business, services, audience, tone, offers, and brand details.',
    ],
  },
  {
    title: '8. Uploaded content',
    body: [
      'You are responsible for any images, videos, flyers, logos, text, or other materials you upload.',
      'You should only upload content that you own or have permission to use.',
      'You must not upload content that infringes someone else’s rights or contains unlawful, harmful, abusive, or inappropriate material.',
    ],
  },
  {
    title: '9. Social account connections',
    body: [
      'If you connect Meta, Facebook, Instagram, or another social platform, you authorise FromOne to use the connection to provide the publishing features you choose to use.',
      'You are responsible for making sure connected social accounts belong to you or are accounts you are authorised to manage.',
      'If a connection expires or permissions change, publishing features may stop working until you reconnect.',
    ],
  },
  {
    title: '10. Availability',
    body: [
      'We aim to keep FromOne available, but we cannot guarantee uninterrupted access.',
      'The service may be unavailable during maintenance, updates, outages, or issues with third-party providers such as hosting, database, AI, payment, or social platform services.',
    ],
  },
  {
    title: '11. Limits and fair use',
    body: [
      'FromOne may apply limits to website scans, saved weekly sets, generated posts, uploads, media processing, publishing actions, or other usage to keep the service stable and fair for all users.',
      'We may adjust limits as the product develops.',
    ],
  },
  {
    title: '12. No guarantee of results',
    body: [
      'FromOne helps create and manage content, but we do not guarantee social media growth, sales, leads, enquiries, engagement, rankings, or business results.',
      'Your results may depend on your business, offer, location, market, audience, content quality, and other factors outside FromOne’s control.',
    ],
  },
  {
    title: '13. Ending access',
    body: [
      'We may suspend or end access if the service is misused, if payment fails, if these terms are breached, or if continued access would create risk for FromOne or other users.',
      'You may stop using FromOne at any time. Some account, billing, and legal records may be retained where needed.',
    ],
  },
  {
    title: '14. Changes to these terms',
    body: [
      'We may update these terms as FromOne changes. The latest version will be available on this page.',
      'Continuing to use FromOne after changes means you accept the updated terms.',
    ],
  },
  {
    title: '15. Contact',
    body: [
      'For questions about these terms, contact info@fromone.co.uk.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      <section
        style={{
          width: 'min(1180px, calc(100% - 32px))',
          margin: '0 auto',
          padding: '26px 0 70px',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            marginBottom: 70,
          }}
        >
          <Link
            href="/signin"
            aria-label="Back to FromOne"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              color: 'var(--text)',
              fontWeight: 1000,
              letterSpacing: '-0.045em',
            }}
          >
            <img
              src="/fromone-logo.png"
              alt="FromOne logo"
              style={{
                width: 62,
                height: 62,
                objectFit: 'contain',
                borderRadius: 18,
              }}
            />
            <span style={{ fontSize: 22 }}>FromOne</span>
          </Link>

          <Link
            href="/signin"
            className="sales-secondary-button"
            style={{
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 16px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            ← Back to app
          </Link>
        </header>

        <section
          className="hero-card"
          style={{
            marginBottom: 28,
            padding: 'clamp(26px, 5vw, 54px)',
            borderRadius: 38,
          }}
        >
          <div className="page-eyebrow">FromOne Terms</div>

          <h1
            className="page-title"
            style={{
              maxWidth: 900,
              fontSize: 'clamp(44px, 7vw, 86px)',
              lineHeight: 0.9,
              marginBottom: 18,
            }}
          >
            Terms of Service
          </h1>

          <p
            className="page-description"
            style={{
              maxWidth: 820,
              fontSize: 18,
              color: 'var(--muted-strong)',
            }}
          >
            These terms explain the rules for using FromOne to create, review, schedule and publish
            social media content for your business.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 28,
            }}
          >
            <span className="status-pill">Last updated: 13 May 2026</span>
            <span className="status-pill">7-day demo</span>
            <span className="status-pill">Uploads and publishing</span>
          </div>
        </section>

        <section
          className="premium-card"
          style={{
            marginBottom: 28,
            borderRadius: 34,
            padding: 'clamp(24px, 4vw, 38px)',
          }}
        >
          <div className="page-eyebrow">Overview</div>
          <h2
            style={{
              margin: '0 0 12px',
              maxWidth: 900,
              fontSize: 'clamp(32px, 4vw, 54px)',
              lineHeight: 1,
              letterSpacing: '-0.06em',
            }}
          >
            Use FromOne responsibly and review your posts.
          </h2>
          <p
            style={{
              maxWidth: 900,
              margin: 0,
              color: 'var(--muted-strong)',
              lineHeight: 1.75,
              fontSize: 16,
            }}
          >
            FromOne helps small businesses create and manage social media content. You remain
            responsible for your account, uploaded materials, connected social accounts, generated
            wording, scheduled times and published posts.
          </p>
        </section>

        <section
          className="premium-card"
          style={{
            borderRadius: 34,
            padding: 'clamp(18px, 3vw, 30px)',
            marginBottom: 42,
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: 14,
            }}
          >
            {termsSections.map((section) => (
              <article
                key={section.title}
                className="card"
                style={{
                  borderRadius: 24,
                  padding: 'clamp(18px, 2.4vw, 24px)',
                  background:
                    'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 10px',
                    fontSize: 'clamp(20px, 2vw, 25px)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {section.title}
                </h2>

                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    style={{
                      margin: '0 0 9px',
                      color: 'var(--muted-strong)',
                      lineHeight: 1.65,
                      fontSize: 15,
                    }}
                  >
                    {paragraph.includes('info@fromone.co.uk') ? (
                      <>
                        {paragraph.replace('info@fromone.co.uk', '')}
                        <a
                          href="mailto:info@fromone.co.uk"
                          style={{ color: 'var(--gold)', fontWeight: 950 }}
                        >
                          info@fromone.co.uk
                        </a>
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}
              </article>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 24,
              paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Link href="/privacy" className="sales-secondary-button">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="sales-secondary-button">
              Cookie Policy
            </Link>
            <Link href="/signin" className="sales-primary-button">
              Back to FromOne
            </Link>
          </div>
        </section>
      </section>

      <PublicFooter />
    </main>
  );
}
