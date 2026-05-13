import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';

export const metadata: Metadata = {
  title: 'FromOne | Weekly Social Media Posts for Small Businesses',
  description:
    'Create a full week of ready-to-publish social media posts for your small business from one website scan or simple business profile. Try FromOne free for 7 days, then continue for £29.99/month.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FromOne | Weekly Social Media Posts for Small Businesses',
    description:
      'Create seven ready-to-publish posts from one website scan or simple business profile. Built for busy small businesses.',
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
    title: 'Website scan to weekly content',
    description:
      'FromOne scans the business website to understand services, audience, tone, location, offers, and brand details before creating posts.',
  },
  {
    title: 'Seven posts ready for the week',
    description:
      'Create a full seven-day content plan with captions, CTAs, hashtags, image ideas, and platform-specific post suggestions.',
  },
  {
    title: 'Built for small businesses',
    description:
      'No complicated agency process. No blank-page stress. Just a simple workflow that shows what to post next.',
  },
  {
    title: 'Manual publishing, full control',
    description:
      'FromOne does not post automatically. You review each post, copy it, publish it yourself, then mark it as done.',
  },
];

const scanBenefits = [
  'Understands what the business actually does',
  'Finds services, tone, audience, and offers',
  'Creates more relevant captions and CTAs',
  'Helps keep posts specific instead of generic',
];

const steps = [
  {
    title: 'Add the business',
    description:
      'Paste the website URL, or enter the business details manually if there is no website.',
  },
  {
    title: 'Choose platforms',
    description:
      'Select where you want posts for — Facebook, Instagram, Google Business, LinkedIn, TikTok, and more.',
  },
  {
    title: 'Create the week',
    description:
      'FromOne creates seven ready-to-use posts based on the business, audience, offer, and selected platforms.',
  },
  {
    title: 'Review and publish',
    description:
      'Open Posts, check each day, add an image, copy the post, publish manually, and mark it as done.',
  },
];

const productScreenshots = [
  {
    title: 'Simple dashboard',
    description:
      'Add a website or business profile, choose platforms, and create the weekly posts.',
    image: '/dashboard-preview.png',
    alt: 'FromOne dashboard for creating weekly social media posts',
  },
  {
    title: 'Weekly post workflow',
    description:
      'Review each post, make it more specific, edit it, upload an image, and publish manually.',
    image: '/posts-preview.png',
    alt: 'FromOne posts page showing weekly post workflow',
  },
  {
    title: 'Customer-specific rewrites',
    description:
      'Adjust posts for different customer types and tones without starting again.',
    image: '/audience-preview.png',
    alt: 'FromOne audience rewrite tool for social media posts',
  },
];

const planFeatures = [
  '7-day free demo',
  '£29.99/month after demo',
  '2 website scans per week',
  'Seven posts per weekly plan',
  'Manual business profile option',
  'Copy, publish, and mark-done workflow',
];

export default function Home() {
  return (
    <main className="sales-page">
      <section className="sales-hero">
        <PublicNav />

        <div className="sales-hero-grid">
          <div className="sales-hero-copy">
            <div className="page-eyebrow">Weekly content for small businesses</div>

            <h1>Social media posts for the week, created from one website scan.</h1>

            <p>
              FromOne helps small businesses turn a website or simple business profile into
              seven ready-to-publish social media posts, with a clear workflow for reviewing,
              copying, publishing, and tracking what is done.
            </p>

            <div className="sales-hero-actions">
              <Link href="/signin" className="sales-primary-button">
                Start 7-day demo
              </Link>

              <Link href="/tutorial" className="sales-secondary-button">
                See how it works
              </Link>
            </div>

            <div className="sales-trust-row">
              <span>✓ 7-day free demo</span>
              <span>✓ Then £29.99/month</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>

          <div className="sales-hero-preview">
            <div className="sales-preview-top">
              <span />
              <span />
              <span />
            </div>

            <div className="sales-preview-card">
              <small>Website scan complete</small>
              <h2>7 posts ready to review</h2>

              <div className="sales-preview-list">
                <p>
                  <strong>Day 1</strong>
                  <span>Facebook trust-building post</span>
                </p>

                <p>
                  <strong>Day 2</strong>
                  <span>Instagram caption and image idea</span>
                </p>

                <p>
                  <strong>Day 3</strong>
                  <span>Google Business update</span>
                </p>
              </div>
            </div>

            <div className="sales-preview-floating">
              <strong>Simple workflow</strong>
              <span>Review → Copy → Publish → Done</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-section sales-problem-section">
        <div>
          <div className="page-eyebrow">The problem</div>
          <h2>Most small businesses know they should post. They just do not have time.</h2>
        </div>

        <p>
          Planning social content every week takes time. You have to think of ideas, write
          captions, choose platforms, create calls to action, and remember what has already
          been posted. FromOne turns that into a simple weekly system.
        </p>
      </section>

      <section className="sales-section sales-scan-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Website scan</div>
          <h2>Why the website scan matters</h2>
          <p>
            FromOne uses the business website as the starting point, so the weekly posts can
            be based on real services, real customers, and the actual tone of the business.
          </p>
        </div>

        <div className="sales-scan-grid">
          <div className="sales-scan-card">
            <small>From one website URL</small>
            <h3>FromOne builds the content brief for you.</h3>
            <p>
              Instead of asking the business owner to write a full marketing brief, FromOne
              scans the website and uses the information to shape the weekly posts.
            </p>
          </div>

          <div className="sales-scan-list">
            {scanBenefits.map((benefit) => (
              <div key={benefit} className="card">
                ✓ {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Benefits</div>
          <h2>What FromOne gives your business</h2>
          <p>
            A practical weekly content workflow for businesses that need to stay visible
            online without spending hours planning social posts.
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

      <section className="sales-section sales-steps-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Workflow</div>
          <h2>Simple enough to use every week</h2>
          <p>
            FromOne is designed around one clear routine: set up the business, create the
            week, review the posts, publish manually, and mark each post as done.
          </p>
        </div>

        <div className="sales-steps-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="sales-step-card">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-section sales-screenshots-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Product preview</div>
          <h2>Designed to feel clear from the first click</h2>
          <p>
            From dashboard setup to post review, FromOne keeps the content workflow focused
            and easy to follow.
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

      <section className="sales-section sales-pricing-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Simple pricing</div>
          <h2>Try it free, then continue monthly</h2>
          <p>
            Start with the full workflow during the 7-day demo. If it saves you time, keep
            using it for one simple monthly price.
          </p>
        </div>

        <div className="sales-pricing-card">
          <div>
            <small>FromOne Monthly</small>
            <h3>
              £29.99 <span>/ month</span>
            </h3>
            <p>
              A simple content assistant for small businesses that need weekly social posts
              without the agency cost.
            </p>
          </div>

          <div className="sales-pricing-features">
            {planFeatures.map((feature) => (
              <span key={feature}>✓ {feature}</span>
            ))}
          </div>

          <Link href="/signin" className="sales-primary-button">
            Start 7-day demo
          </Link>
        </div>
      </section>

      <section className="sales-cta-section">
        <div>
          <div className="page-eyebrow">Ready for small businesses</div>
          <h2>Create next week’s content before the week even starts.</h2>
          <p>
            Start with a website scan, or use the manual business profile route if there is
            no website yet.
          </p>
        </div>

        <Link href="/signin" className="sales-primary-button">
          Start your 7-day demo
        </Link>
      </section>
    </main>
  );
}