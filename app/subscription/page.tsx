'use client';

import Link from 'next/link';

export default function SubscriptionPage() {
  return (
    <main
      style={{
        width: 'min(980px, calc(100vw - 28px))',
        margin: '0 auto 56px',
      }}
    >
      <section
        className="premium-card subscription-beta-paused"
        style={{
          width: '100%',
          borderRadius: 36,
          padding: 'clamp(28px, 5vw, 54px)',
          border: '1px solid rgba(255, 212, 59, 0.28)',
          background:
            'radial-gradient(circle at top right, rgba(255, 212, 59, 0.14), transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.078), rgba(255,255,255,0.03))',
          boxShadow: '0 30px 96px rgba(0,0,0,0.32)',
          textAlign: 'center',
        }}
      >
        <div className="page-eyebrow">Beta access</div>

        <h1
          className="page-title"
          style={{
            margin: '8px auto 16px',
            maxWidth: 760,
            fontSize: 'clamp(2.6rem, 6vw, 5rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.075em',
          }}
        >
          Subscriptions are paused during beta.
        </h1>

        <p
          className="page-description"
          style={{
            maxWidth: 680,
            margin: '0 auto',
            color: 'rgba(248, 250, 252, 0.72)',
            lineHeight: 1.6,
            fontWeight: 760,
          }}
        >
          FromOne is currently in beta testing, so paid subscriptions and PayPal checkout
          are temporarily disabled. Existing beta testers can keep using the app while we
          finish testing.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            margin: '30px auto 0',
            maxWidth: 760,
            textAlign: 'left',
          }}
        >
          <div className="card" style={{ padding: 16 }}>
            <strong>Billing status</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontWeight: 800 }}>
              Paused for beta
            </p>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <strong>Payments</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontWeight: 800 }}>
              PayPal checkout disabled
            </p>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <strong>Beta contact</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontWeight: 800 }}>
              info@fromone.co.uk
            </p>
          </div>
        </div>

        <div
          className="button-row subscription-beta-actions"
          style={{
            marginTop: 30,
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <a
            href="mailto:info@fromone.co.uk?subject=FromOne beta access"
            className="fo-beta-primary-link"
          >
            Email beta access
          </a>

          <Link href="/posts" className="fo-beta-secondary-link">
            Back to posts
          </Link>
        </div>
      </section>

      <style jsx global>{`
        .subscription-beta-paused .fo-beta-primary-link,
        .subscription-beta-paused .fo-beta-secondary-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0 22px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 1000;
          letter-spacing: -0.035em;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
          outline: none;
          box-shadow: none;
        }

        .subscription-beta-paused .fo-beta-primary-link {
          background: #ffd43b;
          color: #05070d;
          border: 1px solid rgba(255, 212, 59, 0.74);
        }

        .subscription-beta-paused .fo-beta-secondary-link {
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
        }

        .subscription-beta-paused .fo-beta-primary-link:hover,
        .subscription-beta-paused .fo-beta-secondary-link:hover {
          transform: translateY(-1px);
        }

        .subscription-beta-paused .fo-beta-secondary-link:hover {
          border-color: rgba(255, 212, 59, 0.28);
          background: rgba(255, 255, 255, 0.11);
        }

        .subscription-beta-paused .fo-beta-primary-link:focus-visible,
        .subscription-beta-paused .fo-beta-secondary-link:focus-visible {
          outline: 2px solid rgba(255, 212, 59, 0.72);
          outline-offset: 3px;
        }

        @media (max-width: 720px) {
          main {
            width: min(100%, calc(100vw - 24px)) !important;
            margin-bottom: 36px !important;
          }

          .subscription-beta-paused {
            border-radius: 26px !important;
            padding: 24px !important;
          }

          .subscription-beta-paused .subscription-beta-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .subscription-beta-paused .subscription-beta-actions a {
            width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}
