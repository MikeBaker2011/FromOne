import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

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

const scanHighlights = [
  'Services and offers',
  'Target audience',
  'Tone of voice',
  'Location and local context',
  'Brand colours and style',
  'Useful calls to action',
];

const workflow = [
  {
    title: 'Scan or set up',
    description:
      'Add the website URL, or use the manual profile if the business does not have a website.',
  },
  {
    title: 'Choose platforms',
    description:
      'Select the channels you want content for, including Facebook, Instagram, Google Business, LinkedIn, TikTok, and more.',
  },
  {
    title: 'Create the plan',
    description:
      'FromOne builds a seven-day content plan with platform-specific posts ready to review.',
  },
  {
    title: 'Publish with control',
    description:
      'You stay in control. FromOne helps you prepare the content, but you publish manually.',
  },
];

const examplePosts = [
  {
    platform: 'Facebook',
    goal: 'Build trust',
    caption:
      'Not every plumbing problem starts with a big leak. Sometimes it is a slow drip, a strange noise, or a small patch of damp that gets worse over time. If something does not look or sound right, it is always better to get it checked early before it turns into a bigger repair.',
    cta: 'Message us today to arrange a quote.',
    hashtags: '#Plumbing #LocalPlumber #HomeMaintenance #SmallBusiness',
    imageIdea: 'A clear photo of a finished repair, van, tools, or team member on-site.',
  },
  {
    platform: 'Instagram',
    goal: 'Show the work',
    caption:
      'A clean finish matters. Whether it is a small repair or a full installation, customers want someone who turns up, explains the job clearly, and leaves things tidy afterwards. That is the kind of service people remember.',
    cta: 'Save this post for when you need a reliable local service.',
    hashtags: '#LocalBusiness #TradeBusiness #CustomerTrust #BeforeAndAfter',
    imageIdea: 'A before-and-after photo, finished job detail, or behind-the-scenes work shot.',
  },
  {
    platform: 'Google Business',
    goal: 'Drive enquiries',
    caption:
      'Need help with a repair, installation, or maintenance job? We help local customers with reliable service, clear communication, and practical advice before any work begins.',
    cta: 'Call or message us to book your next job.',
    hashtags: '#LocalService #GoogleBusiness #CustomerEnquiries',
    imageIdea: 'A simple service photo, shopfront, team photo, or completed customer job.',
  },
];

const productScreenshots = [
  {
    title: 'Dashboard setup',
    description:
      'Add the website or profile, confirm the business details, choose platforms, and create the plan.',
    image: '/dashboard-preview.png',
    alt: 'FromOne dashboard for creating weekly social media posts',
  },
  {
    title: 'Post-by-post workflow',
    description:
      'Move through the week, review each post, copy the content, publish manually, and track progress.',
    image: '/posts-preview.png',
    alt: 'FromOne posts page showing weekly post workflow',
  },
  {
    title: 'Audience and tone adjustments',
    description:
      'Make a post more specific for different customer types without starting again.',
    image: '/audience-preview.png',
    alt: 'FromOne audience rewrite tool for social media posts',
  },
];

const planFeatures = [
  '7-day free demo',
  '£29.99/month after demo',
  '2 website scans per week',
  'Seven posts per weekly plan',
  'Manual profile option',
  'Cancel anytime',
];

export default function Home() {
  return (
    <main className="sales-page">
      <section className="sales-hero">
        <PublicNav />

        <div className="sales-hero-grid">
          <div className="sales-hero-copy">
            <div className="page-eyebrow">Content planning for small businesses</div>

            <h1>One website. One week of content.</h1>

            <p>
              FromOne helps busy small businesses create, review, and publish a full week of
              social media content without hiring an agency or staring at a blank screen.
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
              <span>✓ Free 7-day demo</span>
              <span>✓ £29.99/month</span>
              <span>✓ Manual publishing</span>
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
              <h2>Weekly plan created</h2>

              <div className="sales-preview-list">
                <p>
                  <strong>Mon</strong>
                  <span>Trust-building Facebook post</span>
                </p>

                <p>
                  <strong>Tue</strong>
                  <span>Instagram caption and image idea</span>
                </p>

                <p>
                  <strong>Wed</strong>
                  <span>Google Business update</span>
                </p>
              </div>
            </div>

            <div className="sales-preview-floating">
              <strong>Ready to publish</strong>
              <span>Review → Copy → Post → Done</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-section sales-scan-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Website intelligence</div>
          <h2>The scan does the briefing work.</h2>
          <p>
            Instead of asking the business owner to write a marketing brief, FromOne uses the
            website to understand what matters and turns it into practical content.
          </p>
        </div>

        <div className="sales-scan-grid">
          <div className="sales-scan-card">
            <small>From one website URL</small>
            <h3>Less setup. More relevant posts.</h3>
            <p>
              FromOne looks for the information that normally shapes good content: what the
              business offers, who it serves, where it works, how it sounds, and what customers
              should do next.
            </p>
          </div>

          <div className="sales-scan-list">
            {scanHighlights.map((item) => (
              <div key={item} className="card">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-section sales-example-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Example output</div>
          <h2>See what a weekly post can look like.</h2>
          <p>
            FromOne creates practical, ready-to-use posts with a caption, call to action,
            hashtags, and image guidance for the platform.
          </p>
        </div>

        <div className="sales-example-grid">
          {examplePosts.map((post) => (
            <article key={post.platform} className="sales-example-card">
              <div className="sales-example-card-top">
                <span>{post.platform}</span>
                <small>{post.goal}</small>
              </div>

              <p className="sales-example-caption">{post.caption}</p>

              <div className="sales-example-detail">
                <strong>CTA</strong>
                <p>{post.cta}</p>
              </div>

              <div className="sales-example-detail">
                <strong>Hashtags</strong>
                <p>{post.hashtags}</p>
              </div>

              <div className="sales-example-detail sales-example-image-idea">
                <strong>Image idea</strong>
                <p>{post.imageIdea}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-section sales-steps-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Workflow</div>
          <h2>From setup to published post.</h2>
          <p>
            Every part of FromOne is designed to guide the user through the same simple flow:
            set up, create, review, publish, and track.
          </p>
        </div>

        <div className="sales-steps-grid">
          {workflow.map((step, index) => (
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
          <h2>Simple to use. Useful every week.</h2>
          <p>
            The product keeps the weekly content process focused, visual, and easy to follow.
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
          <div className="page-eyebrow">Pricing</div>
          <h2>Start free. Keep it simple.</h2>
          <p>
            Try the full workflow during the demo. If it saves time and keeps the business
            posting consistently, continue monthly.
          </p>
        </div>

        <div className="sales-pricing-card">
          <div>
            <small>FromOne Monthly</small>
            <h3>
              £29.99 <span>/ month</span>
            </h3>
            <p>
              A practical content assistant for small businesses that want consistent social
              media without agency costs.
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

      <PublicFooter />
    </main>
  );
}