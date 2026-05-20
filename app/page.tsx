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

const howItWorks = [
  {
    title: 'Business setup',
    description:
      'Set up the Business Profile once so FromOne understands the business, services, location, tone and customers.',
  },
  {
    title: 'Upload media',
    description:
      'Add this week’s photos, videos, flyers, offers, event clips, product shots, menus or behind-the-scenes content.',
  },
  {
    title: 'Create posts',
    description:
      'FromOne turns each upload into a ready-to-review post and chooses sensible posting times automatically.',
  },
  {
    title: 'Review and autopost',
    description:
      'Edit anything before it goes live. Facebook and Instagram can autopost. TikTok stays copy/open manual.',
  },
];

const starterFeatures = [
  'Upload photos, videos and flyers',
  'Business Profile setup',
  'Posts written from real uploaded media',
  'Automatic suggested post times',
  'Facebook and Instagram autoposting',
  'Instagram-safe image resizing',
  'TikTok copy/open workflow',
  'Rewrite posts using media',
  'Cancel anytime',
];


const faqs = [
  {
    question: 'What does FromOne actually do?',
    answer:
      'FromOne turns your weekly photos, videos and flyers into ready-to-review social media posts. It suggests posting times and can autopost to Facebook and Instagram.',
  },
  {
    question: 'Is it easy for non-technical users?',
    answer:
      'Yes. The weekly flow is simple: set up the business once, upload this week’s media, create posts, review them, then publish or schedule.',
  },
  {
    question: 'Can I edit the posts before they go live?',
    answer:
      'Yes. You can edit the wording, replace media, rewrite using the uploaded media, or change the suggested posting time.',
  },
  {
    question: 'Does FromOne post to TikTok automatically?',
    answer:
      'Not yet. FromOne creates TikTok-ready wording and keeps the process manual: copy the post, open TikTok and publish it yourself.',
  },
  {
    question: 'What happens if Instagram does not like my image size?',
    answer:
      'FromOne can create an Instagram-safe version of an image before publishing, which helps reduce failed Instagram posts.',
  },
  {
    question: 'Can I ask a question before starting?',
    answer:
      'Yes. Email info@fromone.co.uk and we will help you decide whether FromOne is right for your business.',
  },
];

export default function Home() {
  return (
    <main className="sales-page">
      <section className="sales-hero">
        <PublicNav />

        <div
          className="sales-hero-grid"
          style={{
            display: 'block',
          }}
        >
          <div
            className="sales-hero-copy"
            style={{
              maxWidth: 980,
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <div className="page-eyebrow">Simple social media for small businesses</div>

            <h1 style={{ lineHeight: 0.95, letterSpacing: '-0.07em' }}>
              Upload media. FromOne creates the posts.
            </h1>

            <p style={{ marginLeft: 'auto', marginRight: 'auto', maxWidth: 760 }}>
              FromOne turns your photos, videos and flyers into scheduled social media posts.
              Review the posts, edit anything, then autopost to Facebook and Instagram or copy/open
              TikTok.
            </p>

            <div
              className="sales-hero-actions"
              style={{
                justifyContent: 'center',
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
              className="sales-trust-row"
              style={{
                justifyContent: 'center',
              }}
            >
              <span>✓ Uploads become posts</span>
              <span>✓ Times chosen for you</span>
              <span>✓ Autopost Facebook & Instagram</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-section sales-steps-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">How it works</div>
          <h2>Four simple steps.</h2>
          <p>
            FromOne is designed to match the app itself: clear, guided and simple enough for small
            businesses that do not want another complicated marketing dashboard.
          </p>
        </div>

        <div className="sales-steps-grid">
          {howItWorks.map((step, index) => (
            <article key={step.title} className="sales-step-card">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-section sales-scan-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Why it is different</div>
          <h2>It starts with what the business already has.</h2>
          <p>
            Most businesses already have the raw material: job photos, product shots, flyers,
            menus, offer graphics, event clips and behind-the-scenes videos. FromOne turns those
            into the week’s content.
          </p>
        </div>

        <div className="sales-scan-grid">
          <div className="sales-scan-card">
            <small>The weekly promise</small>
            <h3>Upload files. Get posts with planned times.</h3>
            <p>
              FromOne does not ask users to think like marketers. It takes the media they already
              have, writes the posts, suggests the times and keeps publishing simple.
            </p>
          </div>

          <div className="sales-scan-list">
            {[
              'One upload becomes one post',
              'Posts are based on real business media',
              'Suggested times are created automatically',
              'Images can be made Instagram-safe',
              'Facebook and Instagram can autopost',
              'TikTok stays simple with copy/open',
            ].map((item) => (
              <div key={item} className="card">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-section sales-pricing-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Pricing</div>
          <h2>Simple monthly pricing.</h2>
          <p>
            Start with the demo. If FromOne saves time and keeps the business posting, continue
            with the monthly plan.
          </p>
        </div>

        <div
          className="sales-pricing-card"
          style={{
            maxWidth: 760,
            margin: '0 auto',
            textAlign: 'center',
            background:
              'radial-gradient(circle at top, rgba(255, 212, 59, 0.2), transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.04))',
            border: '1px solid rgba(255, 212, 59, 0.28)',
          }}
        >
          <div>
            <small>FromOne Starter</small>
            <h3>
              £39.99 <span>/ month</span>
            </h3>
            <p style={{ maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
              For small businesses that want their weekly media turned into scheduled social posts
              without agency costs.
            </p>
          </div>

          <div
            className="sales-pricing-features"
            style={{
              textAlign: 'left',
              maxWidth: 560,
              margin: '22px auto',
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

      <section className="sales-section sales-faq-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Questions</div>
          <h2>Simple answers.</h2>
          <p>
            FromOne is built to make weekly posting easier, not to give small businesses another
            complicated tool to learn.
          </p>
        </div>

        <div className="sales-faq-grid">
          {faqs.map((item) => (
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
