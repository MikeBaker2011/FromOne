import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

export const metadata: Metadata = {
  title: 'FromOne | Upload Media. Get Scheduled Social Posts.',
  description:
    'FromOne helps small businesses turn photos, videos and flyers into scheduled social media posts with Facebook and Instagram autoposting.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FromOne | Upload Media. Get Scheduled Social Posts.',
    description:
      'Upload photos, videos or flyers. FromOne creates posts, chooses times, and can autopost to Facebook and Instagram.',
    url: '/',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FromOne social media app for small businesses',
      },
    ],
  },
};

const flowSteps = [
  {
    eyebrow: '01',
    title: 'Business setup',
    description:
      'Set up the Business Profile once so FromOne understands the business, services, location, tone and customers.',
  },
  {
    eyebrow: '02',
    title: 'Upload media',
    description:
      'Add this week’s photos, videos, flyers, offers, menus, product shots or event clips.',
  },
  {
    eyebrow: '03',
    title: 'Create posts',
    description:
      'FromOne turns each upload into a ready-to-review post and chooses sensible posting times.',
  },
  {
    eyebrow: '04',
    title: 'Autopost',
    description:
      'Review and edit first. Facebook and Instagram can autopost. TikTok stays copy/open manual.',
  },
];

const businessBenefits = [
  {
    title: 'No blank screen',
    description:
      'The business uploads what it already has. FromOne turns that real media into usable posts.',
  },
  {
    title: 'Less weekly pressure',
    description:
      'Posts and suggested times are created automatically, so users do not need to plan from scratch.',
  },
  {
    title: 'Consistent posting',
    description:
      'A simple weekly upload habit helps small businesses keep showing up online.',
  },
  {
    title: 'Built for real platforms',
    description:
      'Facebook and Instagram can autopost, Instagram images can be made safer, and TikTok stays simple.',
  },
];

const starterFeatures = [
  'Upload photos, videos and flyers',
  'Business Profile setup',
  'Posts written from uploaded media',
  'Suggested posting times',
  'Facebook and Instagram autoposting',
  'Instagram-safe image resizing',
  'TikTok copy/open workflow',
  'Rewrite posts using media',
  'Cancel anytime',
];

export default function Home() {
  return (
    <main className="sales-page">
      <section
        className="sales-hero"
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingBottom: 0,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '12%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 720,
            height: 420,
            borderRadius: '999px',
            background:
              'radial-gradient(circle, rgba(255,212,59,0.17), rgba(61,220,151,0.06), transparent 70%)',
            filter: 'blur(22px)',
            pointerEvents: 'none',
          }}
        />

        <PublicNav />

        <div
          style={{
            maxWidth: 1060,
            margin: '0 auto',
            padding: 'clamp(56px, 8vw, 104px) 18px clamp(44px, 6vw, 74px)',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            className="page-eyebrow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 14px',
              borderRadius: 999,
              background: 'rgba(255, 212, 59, 0.1)',
              border: '1px solid rgba(255, 212, 59, 0.24)',
            }}
          >
            Simple social media for small businesses
          </div>

          <h1
            style={{
              margin: '20px auto 20px',
              maxWidth: 980,
              fontSize: 'clamp(3.25rem, 8vw, 7.8rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.078em',
              textAlign: 'center',
            }}
          >
            <span style={{ display: 'block' }}>Upload media.</span>
            <span style={{ display: 'block' }}>Get scheduled posts.</span>
          </h1>

          <p
            style={{
              maxWidth: 730,
              margin: '0 auto',
              color: 'var(--muted)',
              fontSize: 'clamp(1.02rem, 1.45vw, 1.22rem)',
              lineHeight: 1.65,
            }}
          >
            FromOne turns photos, videos and flyers into ready-to-review posts, chooses sensible
            posting times, and can autopost to Facebook and Instagram.
          </p>

          <div
            className="sales-hero-actions"
            style={{
              justifyContent: 'center',
              marginTop: 30,
            }}
          >
            <Link href="/signin" className="sales-primary-button">
              Start 7-day demo
            </Link>

            <Link href="/tutorial" className="sales-secondary-button">
              See how it works
            </Link>
          </div>

          <div
            style={{
              margin: '26px auto 0',
              maxWidth: 760,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {['Uploads become posts', 'Times chosen for you', 'Facebook & Instagram autopost'].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    minHeight: 50,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.055)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'rgba(248,250,252,0.82)',
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  ✓ {item}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="sales-section sales-steps-section" style={{ paddingTop: 54, paddingBottom: 50 }}>
        <div
          className="sales-section-heading"
          style={{
            textAlign: 'center',
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: 740,
            marginBottom: 24,
          }}
        >
          <div className="page-eyebrow">How it works</div>
          <h2>From setup to scheduled posts.</h2>
          <p>
            One simple path: set up the business, upload the week’s media, create posts, then
            review and publish.
          </p>
        </div>

        <div
          className="sales-steps-grid"
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            gap: 14,
          }}
        >
          {flowSteps.map((step, index) => (
            <article
              key={step.title}
              className="sales-step-card"
              style={{
                minHeight: 225,
                padding: 22,
                borderRadius: 26,
                background:
                  index === 0
                    ? 'radial-gradient(circle at top left, rgba(255,212,59,0.15), transparent 40%), rgba(255,255,255,0.055)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.036))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span>{step.eyebrow}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-section" style={{ paddingTop: 38, paddingBottom: 50 }}>
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: 'clamp(24px, 3.5vw, 38px)',
            borderRadius: 34,
            background:
              'radial-gradient(circle at top right, rgba(255,212,59,0.12), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.032))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 22px 72px rgba(0,0,0,0.24)',
          }}
        >
          <div
            className="sales-section-heading"
            style={{
              textAlign: 'center',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: 760,
              marginBottom: 22,
            }}
          >
            <div className="page-eyebrow">Why this helps businesses</div>
            <h2>It removes the hardest part of social media.</h2>
            <p>
              Small businesses usually have the raw material. They just need a simple way to turn
              it into consistent posts.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {businessBenefits.map((benefit) => (
              <article
                key={benefit.title}
                className="card"
                style={{
                  padding: 20,
                  borderRadius: 22,
                  minHeight: 155,
                  background: 'rgba(5, 10, 24, 0.34)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <h3 style={{ margin: '0 0 9px', color: '#fff' }}>{benefit.title}</h3>
                <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.58 }}>
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-section sales-pricing-section" style={{ paddingTop: 38, paddingBottom: 66 }}>
        <div
          className="sales-section-heading"
          style={{
            textAlign: 'center',
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: 720,
            marginBottom: 24,
          }}
        >
          <div className="page-eyebrow">Pricing</div>
          <h2>A simple monthly plan.</h2>
          <p>
            Start with the demo. If FromOne saves time and keeps the business posting, continue
            with Starter.
          </p>
        </div>

        <div
          className="sales-pricing-card"
          style={{
            maxWidth: 680,
            margin: '0 auto',
            padding: 'clamp(26px, 4vw, 44px)',
            borderRadius: 34,
            textAlign: 'center',
            background:
              'radial-gradient(circle at top, rgba(255, 212, 59, 0.18), transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.088), rgba(255,255,255,0.038))',
            border: '1px solid rgba(255, 212, 59, 0.28)',
            boxShadow: '0 26px 82px rgba(0,0,0,0.3)',
          }}
        >
          <small
            style={{
              display: 'inline-flex',
              padding: '8px 13px',
              borderRadius: 999,
              background: 'rgba(255,212,59,0.13)',
              border: '1px solid rgba(255,212,59,0.24)',
              marginBottom: 14,
            }}
          >
            FromOne Starter
          </small>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <strong
              style={{
                fontSize: 'clamp(3.6rem, 8vw, 6.6rem)',
                lineHeight: 0.9,
                letterSpacing: '-0.06em',
                color: '#fff',
              }}
            >
              £39.99
            </strong>
            <span
              style={{
                color: 'var(--muted)',
                fontWeight: 900,
                fontSize: 18,
                paddingBottom: 8,
              }}
            >
              / month
            </span>
          </div>

          <p style={{ maxWidth: 520, margin: '0 auto 24px', color: 'var(--muted)', lineHeight: 1.6 }}>
            For small businesses that want weekly media turned into scheduled social posts without
            agency costs.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              maxWidth: 560,
              margin: '0 auto 26px',
              textAlign: 'left',
            }}
          >
            {starterFeatures.map((feature) => (
              <div
                key={feature}
                style={{
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.055)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'rgba(248,250,252,0.88)',
                  fontWeight: 850,
                  fontSize: 14,
                }}
              >
                ✓ {feature}
              </div>
            ))}
          </div>

          <Link href="/signin" className="sales-primary-button">
            Start 7-day demo
          </Link>

          <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>
            Questions before starting? Email{' '}
            <a href="mailto:info@fromone.co.uk">info@fromone.co.uk</a>
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}