import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Help Guide | How FromOne Works',
  description:
    'A simple guide to using FromOne to set up a Business Profile, upload media, create scheduled posts, review posts, and autopost to Facebook and Instagram.',
  alternates: {
    canonical: '/tutorial',
  },
  openGraph: {
    title: 'Help Guide | How FromOne Works',
    description:
      'Set up the business, upload photos, videos or flyers, create posts, review the weekly calendar, and autopost to Facebook and Instagram.',
    url: '/tutorial',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'How FromOne creates scheduled social media posts',
      },
    ],
  },
};

const steps = [
  {
    number: '1',
    title: 'Set up the Business Profile',
    text:
      'Add the business details once in Settings. FromOne uses this to understand the business, services, location, tone, customers and offers.',
  },
  {
    number: '2',
    title: 'Upload this week’s media',
    text:
      'Go to the Dashboard and upload photos, videos, flyers, menus, offers, product shots, event clips or behind-the-scenes content.',
  },
  {
    number: '3',
    title: 'Choose the platforms',
    text:
      'Choose Facebook, Instagram and/or TikTok. Facebook and Instagram can autopost when connected. TikTok is copy/open manual for now.',
  },
  {
    number: '4',
    title: 'Create your posts',
    text:
      'Click Create my posts. FromOne turns each upload into a ready-to-review post and chooses sensible posting times automatically.',
  },
  {
    number: '5',
    title: 'Review the weekly calendar',
    text:
      'Open Posts to check the week. Each card shows the platform, media, wording and planned posting time.',
  },
  {
    number: '6',
    title: 'Edit, rewrite or publish',
    text:
      'Open a post to edit wording, replace media, rewrite using the upload, change the scheduled time, publish now or let FromOne autopost.',
  },
];

const platformNotes = [
  {
    title: 'Facebook',
    text:
      'FromOne can publish now or autopost at the scheduled time when Facebook is connected.',
  },
  {
    title: 'Instagram',
    text:
      'FromOne can publish image and video posts when Instagram is connected. If an image shape is not suitable, FromOne can create an Instagram-safe version.',
  },
  {
    title: 'TikTok',
    text:
      'FromOne creates TikTok-ready wording, but TikTok posting stays manual. Copy the post, open TikTok and publish it yourself.',
  },
];

export default function TutorialPage() {
  return (
    <main className="sales-page product-updates-page tutorial-public-page">
      <PublicNav />

      <section className="page-header" style={{ marginTop: 86, marginBottom: 70 }}>
        <div className="page-eyebrow">FromOne Help Guide</div>
        <h1 className="page-title">How FromOne works</h1>
        <p className="page-description">
          Set up the business once, upload this week’s media, create scheduled posts, review the
          weekly calendar, then autopost Facebook and Instagram or copy/open TikTok.
        </p>

        <div className="button-row" style={{ marginTop: 26 }}>
          <Link href="/dashboard" className="sales-primary-button">
            Go to Dashboard
          </Link>

          <Link href="/posts" className="sales-secondary-button">
            View Posts
          </Link>
        </div>
      </section>

      <section
        className="premium-card"
        style={{
          marginBottom: 34,
          borderRadius: 34,
          padding: 'clamp(24px, 3vw, 34px)',
        }}
      >
        <div className="page-eyebrow">Simple workflow</div>
        <h2
          style={{
            margin: '0 0 24px',
            fontSize: 'clamp(2rem, 3.4vw, 3.3rem)',
            lineHeight: 1,
            letterSpacing: '-0.06em',
          }}
        >
          Six clear steps
        </h2>

        <div style={{ display: 'grid', gap: 14 }}>
          {steps.map((step) => (
            <article
              key={step.number}
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: '42px minmax(0, 1fr)',
                gap: 18,
                alignItems: 'start',
                padding: 20,
                borderRadius: 22,
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 14,
                  color: '#07100d',
                  background: 'var(--gold)',
                  fontWeight: 1000,
                }}
              >
                {step.number}
              </span>

              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{step.title}</h3>
                <p style={{ margin: 0, color: 'var(--muted-strong)', lineHeight: 1.58 }}>
                  {step.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="premium-card"
        style={{
          marginBottom: 34,
          borderRadius: 34,
          padding: 'clamp(24px, 3vw, 34px)',
        }}
      >
        <div className="page-eyebrow">Publishing</div>
        <h2
          style={{
            margin: '0 0 24px',
            fontSize: 'clamp(2rem, 3.4vw, 3.3rem)',
            lineHeight: 1,
            letterSpacing: '-0.06em',
          }}
        >
          What happens on each platform?
        </h2>

        <div style={{ display: 'grid', gap: 14 }}>
          {platformNotes.map((item, index) => (
            <article
              key={item.title}
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: '42px minmax(0, 1fr)',
                gap: 18,
                alignItems: 'start',
                padding: 20,
                borderRadius: 22,
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 14,
                  color: '#07100d',
                  background: 'var(--gold)',
                  fontWeight: 1000,
                }}
              >
                {index + 1}
              </span>

              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{item.title}</h3>
                <p style={{ margin: 0, color: 'var(--muted-strong)', lineHeight: 1.58 }}>
                  {item.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="premium-card"
        style={{
          marginBottom: 58,
          borderRadius: 34,
          padding: 'clamp(24px, 3.5vw, 38px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 22,
          alignItems: 'center',
        }}
      >
        <div>
          <div className="page-eyebrow">Ready to start?</div>
          <h2
            style={{
              margin: '0 0 12px',
              maxWidth: 680,
              fontSize: 'clamp(2rem, 3.4vw, 3.4rem)',
              lineHeight: 1,
              letterSpacing: '-0.06em',
            }}
          >
            Upload your media and create your posts.
          </h2>
          <p style={{ margin: 0, color: 'var(--muted-strong)', lineHeight: 1.65 }}>
            Start from the Dashboard. FromOne will use your Business Profile and uploaded media to
            create posts with planned times.
          </p>
        </div>

        <Link href="/dashboard" className="sales-primary-button">
          Create my posts
        </Link>
      </section>

      <PublicFooter />
    </main>
  );
}
