import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';

export const metadata: Metadata = {
  title: 'FromOne | Social Media Content for Small Businesses',
  description:
    'Create a full week of ready-to-publish social media posts for your small business from one website scan or simple business profile.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FromOne | Social Media Content for Small Businesses',
    description:
      'Create a full week of ready-to-publish posts from one website scan or simple business profile.',
    url: '/',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FromOne weekly social media content platform for small businesses',
      },
    ],
  },
};

const benefits = [
  {
    title: 'A full week of posts in minutes',
    description:
      'FromOne turns a website scan or manual business profile into seven ready-to-use posts across Facebook, Instagram, Google Business, LinkedIn, and TikTok.',
  },
  {
    title: 'Built for busy small businesses',
    description:
      'No complicated marketing dashboard. No guessing what to post. Just a clear weekly workflow that shows what to publish next.',
  },
  {
    title: 'Industry-specific content',
    description:
      'Posts are shaped around the business type, audience, services, tone, location, and offer, so the content feels relevant rather than generic.',
  },
  {
    title: 'Manual publishing made simple',
    description:
      'Copy the post, upload the image, open the platform, publish it yourself, then mark it as posted so nothing gets lost.',
  },
];

const steps = [
  'Add a website or manual business profile',
  'Generate a seven-day content campaign',
  'Review, edit, and tailor each post',
  'Copy, publish manually, and track what is done',
];

const productScreenshots = [
  {
    title: 'Dashboard campaign generator',
    description:
      'Start a campaign from a website scan or manual business profile.',
    image: '/dashboard-preview.png',
    alt: 'FromOne dashboard campaign generator',
  },
  {
    title: 'Weekly posts view',
    description:
      'Review the full campaign, edit posts, upload images, and track publishing.',
    image: '/posts-preview.png',
    alt: 'FromOne weekly posts view',
  },
  {
    title: 'Audience rewrite tool',
    description:
      'Tailor posts for specific customer types based on the business industry.',
    image: '/audience-preview.png',
    alt: 'FromOne audience rewrite tool',
  },
];

export default function Home() {
  return (
    <main className="sales-page">
      <section className="sales-hero">
        <PublicNav />

        <div className="sales-hero-grid">
          <div className="sales-hero-copy">
            <div className="page-eyebrow">Small Business Content System</div>

            <h1>Social media content without the weekly headache.</h1>

            <p>
              FromOne helps small businesses create a full week of clear, useful,
              ready-to-publish social media posts from one website scan or a simple
              business profile.
            </p>

            <div className="sales-hero-actions">
              <Link href="/signin" className="sales-primary-button">
                Start your 7-day demo
              </Link>

              <Link href="/tutorial" className="sales-secondary-button">
                See how it works
              </Link>
            </div>

            <div className="sales-trust-row">
              <span>✓ Website scan</span>
              <span>✓ Manual profile option</span>
              <span>✓ 7-day campaign plan</span>
            </div>
          </div>

          <div className="sales-hero-preview">
            <div className="sales-preview-top">
              <span />
              <span />
              <span />
            </div>

            <div className="sales-preview-card">
              <small>This week’s campaign</small>
              <h2>7 posts ready to publish</h2>

              <div className="sales-preview-list">
                <p>
                  <strong>Day 1</strong>
                  <span>Facebook trust-building post</span>
                </p>

                <p>
                  <strong>Day 2</strong>
                  <span>Instagram visual caption</span>
                </p>

                <p>
                  <strong>Day 3</strong>
                  <span>Google Business update</span>
                </p>
              </div>
            </div>

            <div className="sales-preview-floating">
              <strong>Ready</strong>
              <span>Copy → Publish → Mark done</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-section sales-problem-section">
        <div>
          <div className="page-eyebrow">Why FromOne Exists</div>
          <h2>Small businesses know they should post. They just do not have time.</h2>
        </div>

        <p>
          Most local businesses are busy serving customers, answering calls, quoting jobs,
          and running the day-to-day. Social media gets pushed aside because planning,
          writing, and organising posts takes too long. FromOne gives them a simple weekly
          content planner instead.
        </p>
      </section>

      <section className="sales-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Benefits</div>
          <h2>What FromOne gives your business</h2>
          <p>
            A practical social media content workflow that keeps marketing moving without
            needing a marketing team.
          </p>
        </div>

        <div className="sales-benefit-grid">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="sales-benefit-card">
              <div className="sales-card-icon">✓</div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-section sales-screenshots-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Product Preview</div>
          <h2>Designed to feel simple from the first click</h2>
          <p>
            From campaign creation to post review, FromOne keeps the weekly content
            workflow clear, visual, and easy to follow.
          </p>
        </div>

        <div className="sales-screenshot-grid">
          {productScreenshots.map((item) => (
            <article key={item.title} className="sales-screenshot-card">
              <div className="sales-screenshot-image-wrap">
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={1600}
                  height={1000}
                  className="sales-screenshot-image"
                />
              </div>

              <div className="sales-screenshot-content">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-section sales-steps-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Workflow</div>
          <h2>One simple weekly rhythm</h2>
        </div>

        <div className="sales-steps-grid">
          {steps.map((step, index) => (
            <article key={step} className="sales-step-card">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-cta-section">
        <div>
          <div className="page-eyebrow">Ready for small businesses</div>
          <h2>Give your business a week of content before the week even starts.</h2>
          <p>
            Start with a website scan, or use the manual profile route if there is no
            website yet.
          </p>
        </div>

        <Link href="/signin" className="sales-primary-button">
          Start your 7-day demo
        </Link>
      </section>
    </main>
  );
}