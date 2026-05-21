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
    eyebrow: 'Step 1',
    title: 'Business setup',
    description:
      'Set up the Business Profile once so FromOne understands the business, services, location, tone and customers.',
  },
  {
    eyebrow: 'Step 2',
    title: 'Upload media',
    description:
      'Add this week’s photos, videos, flyers, offers, menus, product shots, event clips or behind-the-scenes content.',
  },
  {
    eyebrow: 'Step 3',
    title: 'Create posts',
    description:
      'FromOne turns each upload into a ready-to-review post and chooses sensible posting times automatically.',
  },
  {
    eyebrow: 'Step 4',
    title: 'Review and autopost',
    description:
      'Edit anything before it goes live. Facebook and Instagram can autopost. TikTok stays copy/open manual.',
  },
];

const businessBenefits = [
  {
    title: 'No blank screen',
    description:
      'The business uploads what it already has. FromOne turns that real media into content ideas, captions and planned posts.',
  },
  {
    title: 'Less social media stress',
    description:
      'FromOne chooses posting times automatically, so users do not need to understand content scheduling.',
  },
  {
    title: 'More consistent posting',
    description:
      'A weekly upload flow makes it easier for small businesses to keep showing up online.',
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
  'Automatic suggested posting times',
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
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '10%',
            right: '7%',
            width: 420,
            height: 420,
            borderRadius: '999px',
            background: 'radial-gradient(circle, rgba(255,212,59,0.22), transparent 62%)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '8%',
            bottom: '4%',
            width: 320,
            height: 320,
            borderRadius: '999px',
            background: 'radial-gradient(circle, rgba(61,220,151,0.13), transparent 64%)',
            filter: 'blur(10px)',
            pointerEvents: 'none',
          }}
        />

        <PublicNav />

        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: 'clamp(70px, 10vw, 132px) 18px clamp(64px, 9vw, 112px)',
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
              margin: '22px auto 24px',
              maxWidth: 1040,
              fontSize: 'clamp(3.2rem, 8.1vw, 8.1rem)',
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
              maxWidth: 760,
              margin: '0 auto',
              color: 'var(--muted)',
              fontSize: 'clamp(1.04rem, 1.55vw, 1.28rem)',
              lineHeight: 1.72,
            }}
          >
            FromOne turns photos, videos and flyers into ready-to-review posts, chooses sensible
            posting times, and can autopost to Facebook and Instagram.
          </p>

          <div
            className="sales-hero-actions"
            style={{
              justifyContent: 'center',
              marginTop: 34,
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
              margin: '34px auto 0',
              maxWidth: 820,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {['Uploads become posts', 'Times chosen for you', 'Facebook & Instagram autopost'].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    minHeight: 58,
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.055)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'rgba(248,250,252,0.82)',
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  ✓ {item}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="sales-section sales-steps-section">
        <div
          className="sales-section-heading"
          style={{
            textAlign: 'center',
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: 760,
          }}
        >
          <div className="page-eyebrow">How it works</div>
          <h2>From setup to scheduled posts.</h2>
          <p>
            The app follows one simple path. Set up the business, upload the week’s media, create
            posts, then review and publish.
          </p>
        </div>

        <div
          className="sales-steps-grid"
          style={{
            maxWidth: 1180,
            margin: '0 auto',
          }}
        >
          {flowSteps.map((step, index) => (
            <article
              key={step.title}
              className="sales-step-card"
              style={{
                minHeight: 260,
                padding: 24,
                borderRadius: 28,
                background:
                  index === 0
                    ? 'radial-gradient(circle at top left, rgba(255,212,59,0.14), transparent 38%), rgba(255,255,255,0.055)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.072), rgba(255,255,255,0.038))',
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

      <section className="sales-section">
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: 'clamp(26px, 4vw, 44px)',
            borderRadius: 36,
            background:
              'radial-gradient(circle at top right, rgba(255,212,59,0.14), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 26px 90px rgba(0,0,0,0.28)',
          }}
        >
          <div
            className="sales-section-heading"
            style={{
              textAlign: 'center',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: 780,
            }}
          >
            <div className="page-eyebrow">Why this helps businesses</div>
            <h2>It removes the hardest part of social media.</h2>
            <p>
              Small businesses usually have the raw material. They just do not have the time,
              confidence or process to turn it into consistent posts.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginTop: 26,
            }}
          >
            {businessBenefits.map((benefit) => (
              <article
                key={benefit.title}
                className="card"
                style={{
                  padding: 22,
                  borderRadius: 24,
                  minHeight: 170,
                  background: 'rgba(5, 10, 24, 0.38)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <h3 style={{ margin: '0 0 10px', color: '#fff' }}>{benefit.title}</h3>
                <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.62 }}>
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-section sales-pricing-section">
        <div
          className="sales-section-heading"
          style={{
            textAlign: 'center',
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: 760,
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
            maxWidth: 820,
            margin: '0 auto',
            padding: 'clamp(28px, 4vw, 48px)',
            borderRadius: 38,
            textAlign: 'center',
            background:
              'radial-gradient(circle at top, rgba(255, 212, 59, 0.22), transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.095), rgba(255,255,255,0.04))',
            border: '1px solid rgba(255, 212, 59, 0.32)',
            boxShadow: '0 30px 100px rgba(0,0,0,0.32)',
          }}
        >
          <small
            style={{
              display: 'inline-flex',
              padding: '9px 13px',
              borderRadius: 999,
              background: 'rgba(255,212,59,0.13)',
              border: '1px solid rgba(255,212,59,0.24)',
            }}
          >
            FromOne Starter
          </small>

          <h3
            style={{
              margin: '18px 0 8px',
              fontSize: 'clamp(3.4rem, 7vw, 6.2rem)',
              lineHeight: 0.88,
            }}
          >
            £39.99 <span>/ month</span>
          </h3>

          <p style={{ maxWidth: 560, margin: '0 auto', color: 'var(--muted)', lineHeight: 1.65 }}>
            For small businesses that want weekly media turned into scheduled social posts without
            agency costs.
          </p>

          <div
            className="sales-pricing-features"
            style={{
              textAlign: 'left',
              maxWidth: 620,
              margin: '28px auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))',
              gap: 10,
            }}
          >
            {starterFeatures.map((feature) => (
              <span key={feature}>✓ {feature}</span>
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