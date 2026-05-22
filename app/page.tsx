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

const salesPoints = [
  'Turn weekly photos, videos and flyers into ready-to-review posts',
  'Create platform-specific wording for Facebook, Instagram and TikTok',
  'Suggest posting times automatically so the week is planned',
  'Autopost to Facebook and Instagram when connected',
  'Resize images into Instagram-safe versions when needed',
  'Keep TikTok simple with copy/open manual posting',
];

export default function Home() {
  return (
    <main className="sales-page">
      <style>{`
        .sales-hero-title-mobile {
          display: none;
        }

        @media (max-width: 720px) {
          .sales-page,
          .sales-page section,
          .sales-section-heading,
          .homepage-benefit-grid {
            text-align: center;
          }

          .sales-hero-title-desktop {
            display: none !important;
          }

          .sales-hero-title-mobile {
            display: block !important;
          }

          .sales-hero p,
          .sales-section-heading p {
            max-width: min(92vw, 520px) !important;
            margin-left: auto !important;
            margin-right: auto !important;
            text-align: center !important;
          }

          .sales-hero-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            width: 100% !important;
            max-width: 520px !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .sales-hero-actions a {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
          }

          .homepage-benefit-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 520px !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .homepage-benefit-pill {
            width: min(450px, 100%) !important;
            min-height: 64px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 10px !important;
            text-align: center !important;
            padding: 14px 18px !important;
          }

          .homepage-benefit-pill span,
          .homepage-benefit-pill strong {
            display: inline-flex !important;
            align-items: center !important;
            text-align: center !important;
          }

          .homepage-benefit-pill strong {
            line-height: 1.2 !important;
          }
        }

        @media (max-width: 420px) {
          .sales-hero-title-mobile {
            font-size: clamp(2.85rem, 12.6vw, 3.25rem) !important;
            max-width: 360px !important;
          }

          .homepage-benefit-pill {
            min-height: 58px !important;
            padding: 12px 14px !important;
          }
        }
      `}</style>

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
            className="sales-hero-title sales-hero-title-desktop"
            style={{
              margin: '20px auto 20px',
              maxWidth: 1120,
              fontSize: 'clamp(3rem, 7vw, 7rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.078em',
              textAlign: 'center',
            }}
          >
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>Upload media.</span>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>Get scheduled posts.</span>
          </h1>

          <h1
            className="sales-hero-title sales-hero-title-mobile"
            aria-hidden="true"
            style={{
              margin: '18px auto 18px',
              maxWidth: 390,
              fontSize: 'clamp(3.05rem, 12.8vw, 3.85rem)',
              lineHeight: 0.92,
              letterSpacing: '-0.07em',
              textAlign: 'center',
              display: 'none',
            }}
          >
            <span style={{ display: 'block' }}>Upload media.</span>
            <span style={{ display: 'block' }}>Get scheduled</span>
            <span style={{ display: 'block' }}>posts.</span>
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
            className="homepage-benefit-grid"
            style={{
              margin: '26px auto 0',
              maxWidth: 760,
            }}
          >
            {['Uploads become posts', 'Times chosen for you', 'Facebook & Instagram autopost'].map(
              (item) => (
                <div
                  key={item}
                  className="homepage-benefit-pill"
                >
                  <span aria-hidden="true">✓</span>
                  <strong>{item}</strong>
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

      <section className="sales-section" style={{ paddingTop: 38, paddingBottom: 70 }}>
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            borderRadius: 42,
            padding: 'clamp(28px, 5vw, 62px)',
            position: 'relative',
            overflow: 'hidden',
            background:
              'radial-gradient(circle at 20% 10%, rgba(255, 212, 59, 0.26), transparent 34%), radial-gradient(circle at 86% 22%, rgba(61, 220, 151, 0.13), transparent 32%), linear-gradient(145deg, rgba(255,255,255,0.105), rgba(255,255,255,0.035))',
            border: '1px solid rgba(255, 212, 59, 0.28)',
            boxShadow: '0 34px 120px rgba(0,0,0,0.38)',
          }}
        >
          <div
            style={{
              maxWidth: 820,
              margin: '0 auto',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              className="page-eyebrow"
              style={{
                display: 'inline-flex',
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(255, 212, 59, 0.13)',
                border: '1px solid rgba(255, 212, 59, 0.26)',
              }}
            >
              Built for busy small businesses
            </div>

            <h2
              style={{
                margin: '18px auto 16px',
                fontSize: 'clamp(2.4rem, 5vw, 5.5rem)',
                lineHeight: 0.94,
                letterSpacing: '-0.065em',
                maxWidth: 860,
              }}
            >
              Your weekly social media, created from the content you already have.
            </h2>

            <p
              style={{
                maxWidth: 700,
                margin: '0 auto',
                color: 'rgba(248,250,252,0.72)',
                fontSize: 'clamp(1rem, 1.35vw, 1.18rem)',
                lineHeight: 1.7,
              }}
            >
              FromOne gives small businesses a simple weekly system: upload real media, get useful
              posts, review the week, and let Facebook and Instagram publish automatically when
              connected.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12,
              margin: '32px auto 0',
              maxWidth: 900,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {salesPoints.map((point) => (
              <div
                key={point}
                style={{
                  padding: '15px 16px',
                  borderRadius: 18,
                  background: 'rgba(5, 10, 24, 0.42)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(248,250,252,0.88)',
                  fontWeight: 850,
                  lineHeight: 1.45,
                }}
              >
                ✓ {point}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 34,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Link href="/signin" className="sales-primary-button">
              Start 7-day demo
            </Link>

            <a href="mailto:info@fromone.co.uk" className="sales-secondary-button">
              Email info@fromone.co.uk
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}