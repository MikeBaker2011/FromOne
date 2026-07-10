import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | FromOne',
  description:
    'Read how FromOne collects, uses, stores, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

const privacySections = [
  {
    title: '1. Who we are',
    body: [
      'FromOne is a social media content workflow platform for small businesses. It helps users create social media posts, and where relevant Smiles offers and events, from a Business Profile, uploaded media, website information, and user-provided business details.',
      'For privacy questions, contact us at info@fromone.co.uk.',
    ],
  },
  {
    title: '2. What information we collect',
    body: [
      'We may collect and store account information, such as your email address and user ID.',
      'We may collect business profile information, such as business name, website URL, industry, location, services, audience, tone of voice, offers, brand colours, and logo URL.',
      'We may store uploaded media, including photos, videos, flyers, offer graphics, menus, product images, event clips, or other files you add to create posts.',
      'We may store generated content, including captions, hashtags, CTAs, image ideas, campaign plans, Smiles offer or event details, post status, and publishing history.',
      'We may store social publishing connection details, such as connected Meta, Facebook Page, or Instagram Business account references needed to publish posts.',
      'We may store support requests, feedback, reviews, billing status, subscription references, upload usage, saved content, media rescans, and product activity needed to operate the service.',
    ],
  },
  {
    title: '3. How we use your information',
    body: [
      'We use your information to create and manage your FromOne account.',
      'We use your Business Profile and uploaded media to generate social media posts and suitable Smiles offers or events.',
      'We save posts, uploaded media, Smiles listing details, and publishing progress.',
      'We publish Facebook and Instagram posts when you connect those accounts and choose to use publishing features.',
      'We use information to provide support, manage trials or subscriptions, improve FromOne, and keep the service secure.',
    ],
  },
  {
    title: '4. Website scans and uploaded media',
    body: [
      'If you enter a website URL, FromOne may scan publicly available content from that website to understand the business, services, audience, tone, offers, and brand details.',
      'If you upload photos, videos, flyers, or other files, FromOne may use that media to create, rewrite, improve, or publish social media posts for the connected business, and to prepare suitable Smiles offers or events.',
    ],
  },
  {
    title: '5. Social account connections',
    body: [
      'If you connect Meta, Facebook, or Instagram, FromOne stores the connection details needed to publish posts on your behalf.',
      'These details are used only to provide the publishing features you choose to use.',
    ],
  },
  {
    title: '6. Legal basis for processing',
    body: [
      'We process personal data where it is necessary to provide the service, manage your account, respond to support requests, comply with legal obligations, or where we have a legitimate interest in improving and securing FromOne.',
    ],
  },
  {
    title: '7. Who we share data with',
    body: [
      'We only share data with service providers needed to operate FromOne. This may include Supabase for authentication, database storage and file storage.',
      'It may also include AI/content generation providers used to create, improve, or rewrite posts, offers or events; Meta, Facebook and Instagram when you connect accounts and publish posts; payment providers once subscription billing is connected; and hosting, analytics, security or support tools if added to the service.',
      'We do not sell your personal data.',
    ],
  },
  {
    title: '8. How long we keep data',
    body: [
      'We keep account, business profile, campaign, uploaded media, and post data while your account is active or while it is needed to provide the service.',
      'Support requests and billing records may be kept for longer where needed for business, legal, tax, or security reasons.',
    ],
  },
  {
    title: '9. Your rights',
    body: [
      'Depending on your location and applicable law, you may have rights to access, correct, delete, restrict, object to, or request a copy of your personal data.',
      'To make a request, contact info@fromone.co.uk.',
    ],
  },
  {
    title: '10. Security',
    body: [
      'We take reasonable steps to protect your data, including using trusted service providers, authentication, access controls, and secure storage.',
      'No online service can guarantee complete security.',
    ],
  },
  {
    title: '11. International transfers',
    body: [
      'Some service providers may process data outside the UK or European Economic Area. If this happens, we rely on appropriate safeguards provided by those service providers.',
    ],
  },
  {
    title: '12. Children',
    body: [
      'FromOne is not intended for children. You should not use FromOne if you are under 18.',
    ],
  },
  {
    title: '13. Changes to this policy',
    body: [
      'We may update this Privacy Policy as FromOne changes. The latest version will always be available on this page.',
    ],
  },
];

export default function PrivacyPage() {
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
          <div className="page-eyebrow">FromOne Privacy Policy</div>

          <h1
            className="page-title"
            style={{
              maxWidth: 860,
              fontSize: 'clamp(44px, 7vw, 86px)',
              lineHeight: 0.9,
              marginBottom: 18,
            }}
          >
            Privacy Policy
          </h1>

          <p
            className="page-description"
            style={{
              maxWidth: 820,
              fontSize: 18,
              color: 'var(--muted-strong)',
            }}
          >
            This policy explains how FromOne collects, uses, stores, and protects personal data
            when you use the app to create posts, publish social media content, and prepare suitable Smiles offers or events.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 28,
            }}
          >
            <span className="status-pill">Last updated: 5 July 2026</span>
            <span className="status-pill">Uploads, posts, offers and events</span>
            <span className="status-pill">Meta / Facebook / Instagram</span>
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
            Your data is used to run your FromOne workspace.
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
            FromOne uses your account details, Business Profile, uploaded media and connected
            publishing information to provide the app, create posts, prepare suitable Smiles
            offers or events, and publish to connected channels when you choose to use those features.
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
            {privacySections.map((section) => (
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
            <Link href="/cookies" className="sales-secondary-button">
              Cookie Policy
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
