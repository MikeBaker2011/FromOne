import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Cookie Policy | FromOne',
  description: 'Read how FromOne uses cookies and similar technologies.',
  alternates: {
    canonical: '/cookies',
  },
};

const cookieSections = [
  {
    title: '1. What cookies are',
    body: [
      'Cookies are small files stored on your device when you visit a website. They can help a website work properly, remember preferences, keep you signed in, or understand how the service is used.',
    ],
  },
  {
    title: '2. How FromOne uses cookies',
    body: [
      'FromOne may use cookies or similar technologies for essential app functions, preferences, analytics if added, publishing connections, and payment or billing features if connected.',
      'Essential cookies are needed for sign-in, account security, session management, dashboard access, uploads, saved posts, and core app functionality.',
      'Preference cookies may be used to remember interface choices, cookie choices, saved settings, or onboarding progress.',
      'Analytics cookies may be used only if analytics tools are added, to help understand how people use FromOne and improve the product.',
      'Publishing connection cookies may be used by Meta, Facebook, Instagram, or related services when you connect accounts or manage publishing permissions.',
      'Payment cookies may be used by payment providers when checkout, subscription billing, invoices, or account billing features are connected.',
    ],
  },
  {
    title: '3. Essential cookies',
    body: [
      'Essential cookies are required for FromOne to work. These may include authentication cookies from Supabase or other session-related cookies needed for account access, uploads, saved weekly post sets, and publishing workflows.',
      'You cannot disable essential cookies through FromOne because they are needed to provide the service.',
    ],
  },
  {
    title: '4. Non-essential cookies',
    body: [
      'If FromOne uses analytics, advertising, tracking, or other non-essential cookies, we will explain what they do and request consent where required before setting them.',
    ],
  },
  {
    title: '5. Managing cookies',
    body: [
      'You can control cookies through your browser settings. Blocking some cookies may stop parts of FromOne from working correctly, especially account login, dashboard access, uploads, and publishing workflows.',
    ],
  },
  {
    title: '6. Third-party services',
    body: [
      'Some third-party services may set cookies or similar technologies. These may include Supabase for authentication and storage, Meta, Facebook, and Instagram when connecting publishing accounts, AI/content services used to support the app, and payment providers once billing is connected.',
      'Their cookie use is controlled by their own policies.',
    ],
  },
  {
    title: '7. Changes to this policy',
    body: [
      'We may update this Cookie Policy as FromOne changes or as new tools are added. The latest version will always be available on this page.',
    ],
  },
];

export default function CookiesPage() {
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
          <div className="page-eyebrow">FromOne Cookie Policy</div>

          <h1
            className="page-title"
            style={{
              maxWidth: 860,
              fontSize: 'clamp(44px, 7vw, 86px)',
              lineHeight: 0.9,
              marginBottom: 18,
            }}
          >
            Cookie Policy
          </h1>

          <p
            className="page-description"
            style={{
              maxWidth: 820,
              fontSize: 18,
              color: 'var(--muted-strong)',
            }}
          >
            This page explains how FromOne uses cookies and similar technologies to keep the app
            working, remember choices, support account access, and enable connected services.
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
            <span className="status-pill">Essential app cookies</span>
            <span className="status-pill">Connected services</span>
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
              maxWidth: 860,
              fontSize: 'clamp(32px, 4vw, 54px)',
              lineHeight: 1,
              letterSpacing: '-0.06em',
            }}
          >
            Cookies help FromOne run properly.
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
            FromOne uses essential cookies and similar technologies for sign-in, account security,
            dashboard access, uploads, saved weekly sets, and publishing workflows. Other cookies
            may be used only where needed for preferences, analytics, connected services, or
            payment features.
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
            {cookieSections.map((section) => (
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
                    {paragraph}
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
            <Link href="/terms" className="sales-secondary-button">
              Terms of Service
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
