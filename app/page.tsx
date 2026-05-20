import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

export const metadata: Metadata = {
  title: 'FromOne | Upload Media. Get Scheduled Social Posts.',
  description:
    'FromOne helps small businesses turn weekly photos, videos and flyers into ready-to-review posts with suggested times and Facebook/Instagram autoposting.',
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

const simpleSteps = [
  {
    title: 'Upload this week’s media',
    description:
      'Add photos, videos, flyers, offers, menus, product shots, event clips or behind-the-scenes content.',
  },
  {
    title: 'FromOne creates the posts',
    description:
      'Each upload becomes a ready-to-review post using the business profile, tone, location, services and call to action.',
  },
  {
    title: 'Review, edit and autopost',
    description:
      'FromOne suggests posting times. Facebook and Instagram can autopost. TikTok stays copy/open manual.',
  },
];

const productBenefits = [
  {
    title: 'One upload becomes one post',
    description:
      'The post is based on the real image, video or flyer, so the content feels specific instead of generic.',
  },
  {
    title: 'Times are chosen for you',
    description:
      'FromOne suggests sensible posting times automatically. Users can still edit the time before it goes live.',
  },
  {
    title: 'Instagram-safe media',
    description:
      'If an image is not the right shape for Instagram, FromOne can create a safer version for publishing.',
  },
  {
    title: 'Simple publishing',
    description:
      'Facebook and Instagram can be posted now or scheduled. TikTok is kept honest: copy the post and open TikTok.',
  },
];

const productScreenshots = [
  {
    title: 'Upload-first dashboard',
    description:
      'The dashboard starts with one clear action: upload files and create posts.',
    image: '/dashboard-preview.png',
    alt: 'FromOne dashboard for uploading media and creating posts',
  },
  {
    title: 'Weekly post calendar',
    description:
      'Posts are shown by day, platform and planned time so the week is easy to review.',
    image: '/posts-preview.png',
    alt: 'FromOne weekly posts calendar',
  },
  {
    title: 'Simple post review',
    description:
      'Check media, rewrite using the upload, edit wording, then publish or schedule.',
    image: '/audience-preview.png',
    alt: 'FromOne post review modal',
  },
];

const planFeatures = [
  'Upload photos, videos and flyers',
  'Business Profile setup',
  'Posts written from uploaded media',
  'Automatic suggested post times',
  'Facebook and Instagram autoposting',
  'TikTok copy/open workflow',
  'Cancel anytime',
];

const faqItems = [
  {
    question: 'Does FromOne post automatically?',
    answer:
      'Yes. FromOne can autopost Facebook and Instagram after you review the post. TikTok is manual for now, so you copy the post and open TikTok.',
  },
  {
    question: 'Can I edit the posts?',
    answer:
      'Yes. You can edit the wording, replace media, rewrite a post using the uploaded media, or change the suggested posting time.',
  },
  {
    question: 'Does it work without technical knowledge?',
    answer:
      'Yes. The weekly flow is deliberately simple: upload files, create posts, review the week, and publish.',
  },
  {
    question: 'Does FromOne resize Instagram images?',
    answer:
      'Yes. When needed, FromOne can create an Instagram-safe version of an uploaded image so publishing is more reliable.',
  },
];

export default function Home() {
  return (
    <main className="sales-page">
      <section className="sales-hero">
        <PublicNav />

        <div className="sales-hero-grid">
          <div className="sales-hero-copy">
            <div className="page-eyebrow">Simple social media for small businesses</div>

            <h1 style={{ lineHeight: 0.92, letterSpacing: '-0.075em' }}>
              Upload media. Get scheduled posts.
            </h1>

            <p>
              FromOne turns your photos, videos and flyers into ready-to-review social posts,
              chooses sensible posting times, and can autopost to Facebook and Instagram.
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
              <span>✓ Built for non-technical users</span>
              <span>✓ Facebook & Instagram autopost</span>
              <span>✓ TikTok copy/open</span>
            </div>
          </div>

          <div className="sales-hero-preview">
            <div className="sales-preview-top">
              <span />
              <span />
              <span />
            </div>

            <div className="sales-preview-card">
              <small>Weekly media uploaded</small>
              <h2>3 posts created</h2>

              <div className="sales-preview-list">
                <p>
                  <strong>Facebook</strong>
                  <span>Autopost · 09:30</span>
                </p>

                <p>
                  <strong>Instagram</strong>
                  <span>Autopost · 12:45</span>
                </p>

                <p>
                  <strong>TikTok</strong>
                  <span>Copy/open · 18:30</span>
                </p>
              </div>
            </div>

            <div className="sales-preview-floating">
              <strong>Ready to review</strong>
              <span>Upload → Create → Review → Autopost</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-section sales-steps-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">How it works</div>
          <h2>One simple weekly flow.</h2>
          <p>
            FromOne is designed to feel obvious from the first screen. The business uploads media;
            FromOne turns it into posts and planned times.
          </p>
        </div>

        <div className="sales-steps-grid">
          {simpleSteps.map((step, index) => (
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
          <h2>It looks like the workflow feels.</h2>
          <p>
            The app is upload-first, review-first, and simple enough for businesses that do not
            want to learn another marketing tool.
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

      <section className="sales-section sales-scan-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Why small businesses understand it</div>
          <h2>FromOne starts with what they already have.</h2>
          <p>
            Most small businesses already have photos, videos, flyers, menus, offers, job photos,
            product shots or event clips. FromOne turns those assets into the week’s content.
          </p>
        </div>

        <div className="sales-scan-grid">
          <div className="sales-scan-card">
            <small>The promise</small>
            <h3>Upload files. FromOne creates the posts.</h3>
            <p>
              No complicated content calendar setup. No confusing marketing settings. The user
              uploads media, chooses platforms, reviews the posts, and lets FromOne help with
              publishing.
            </p>
          </div>

          <div className="sales-scan-list">
            {productBenefits.map((item) => (
              <div key={item.title} className="card">
                <strong>{item.title}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-section sales-pricing-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Pricing</div>
          <h2>Start free. Keep posting simple.</h2>
          <p>
            Try the full workflow during the demo. Upload media, create posts, review the week,
            and see how much time FromOne saves.
          </p>
        </div>

        <div className="sales-pricing-card">
          <div>
            <small>FromOne Starter</small>
            <h3>
              £39.99 <span>/ month</span>
            </h3>
            <p>
              For small businesses that want their weekly media turned into scheduled social posts
              without agency costs.
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

      <section className="sales-section sales-faq-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Questions</div>
          <h2>Clear answers before starting.</h2>
          <p>
            FromOne is built to keep weekly social media simple, controlled and practical for
            small businesses.
          </p>
        </div>

        <div className="sales-faq-grid">
          {faqItems.map((item) => (
            <article key={item.question} className="sales-faq-card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
