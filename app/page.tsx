import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

export const metadata: Metadata = {
  title: 'FromOne | Turn Weekly Media Into Scheduled Social Posts',
  description:
    'Upload photos, videos or flyers. FromOne turns them into ready-to-review posts, chooses posting times, and can autopost to Facebook and Instagram.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FromOne | Turn Weekly Media Into Scheduled Social Posts',
    description:
      'Upload photos, videos or flyers. FromOne creates posts, suggests times, and can autopost to Facebook and Instagram.',
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
  'Business name and services',
  'Target customers',
  'Tone of voice',
  'Location and local context',
  'Offers and calls to action',
  'Brand colours and style',
];

const workflow = [
  {
    title: 'Set up once',
    description:
      'Create a Business Profile so FromOne knows the business, services, location, tone, offers and customers.',
  },
  {
    title: 'Upload weekly media',
    description:
      'Add the photos, videos or flyers you want to promote this week.',
  },
  {
    title: 'Create scheduled posts',
    description:
      'FromOne turns each upload into a post and chooses sensible posting times automatically.',
  },
  {
    title: 'Review and autopost',
    description:
      'Edit anything you want, then let FromOne publish Facebook and Instagram. TikTok stays copy/open manual.',
  },
];

const examplePosts = [
  {
    platform: 'Facebook',
    goal: 'Local enquiry',
    caption:
      'This week’s offer is ready. Whether you are booking ahead, asking a quick question, or comparing options, we are here to make it simple. Send us a message and we will point you in the right direction.',
    cta: 'Message us today to book or ask a question.',
    hashtags: '#LocalBusiness #SmallBusiness #FromOne',
    imageIdea: 'Uses the uploaded photo, flyer or short video as the main post topic.',
  },
  {
    platform: 'Instagram',
    goal: 'Visual promotion',
    caption:
      'A quick look at what is happening this week. FromOne turns your real photos, videos and flyers into posts that feel specific to the business, not generic filler content.',
    cta: 'Save this post or message us to find out more.',
    hashtags: '#InstagramMarketing #LocalBusiness #SmallBusiness',
    imageIdea: 'Publishes an Instagram-safe version if the image needs resizing.',
  },
  {
    platform: 'TikTok',
    goal: 'Manual short-form post',
    caption:
      'Use this as the caption when posting the video manually on TikTok. Keep it simple, show the moment, and give people one clear next step.',
    cta: 'Copy the caption, open TikTok, and post manually.',
    hashtags: '#TikTokBusiness #SmallBusiness #BehindTheScenes',
    imageIdea: 'Best for event clips, before-and-after videos, product demos, food, beauty, fitness, or behind-the-scenes footage.',
  },
];

const productScreenshots = [
  {
    title: 'Upload-first dashboard',
    description:
      'Upload this week’s photos, videos or flyers, choose platforms, and create posts in one simple flow.',
    image: '/dashboard-preview.png',
    alt: 'FromOne dashboard for creating weekly social media posts',
  },
  {
    title: 'Weekly post review',
    description:
      'Review each scheduled post, edit the wording or media, and see what is planned for the week.',
    image: '/posts-preview.png',
    alt: 'FromOne posts page showing weekly post workflow',
  },
  {
    title: 'Autopost and rewrite tools',
    description:
      'Rewrite using media, schedule autoposting, publish Facebook and Instagram, or copy/open TikTok.',
    image: '/audience-preview.png',
    alt: 'FromOne audience rewrite tool for social media posts',
  },
];

const planFeatures = [
  '7-day free demo',
  'Upload photos, videos and flyers',
  'Business Profile setup',
  'Automatic suggested post times',
  'Facebook and Instagram autoposting',
  'TikTok copy/open workflow',
  'Cancel anytime',
];

export default function Home() {
  return (
    <main className="sales-page">
      <section className="sales-hero">
        <PublicNav />

        <div className="sales-hero-grid">
          <div className="sales-hero-copy">
            <div className="page-eyebrow">Weekly social posts from your real media</div>

            <h1>Upload your media. Get your posts.</h1>

            <p>
              FromOne turns this week’s photos, videos and flyers into scheduled social media
              posts. Review the posts, edit anything, then autopost Facebook and Instagram or
              copy/open TikTok.
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
              <span>✓ Autopost Facebook & Instagram</span>
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
              <small>Media uploaded</small>
              <h2>Posts scheduled</h2>

              <div className="sales-preview-list">
                <p>
                  <strong>Mon</strong>
                  <span>Facebook post · 09:30</span>
                </p>

                <p>
                  <strong>Tue</strong>
                  <span>Instagram post · 12:45</span>
                </p>

                <p>
                  <strong>Wed</strong>
                  <span>TikTok copy/open · 18:30</span>
                </p>
              </div>
            </div>

            <div className="sales-preview-floating">
              <strong>Ready to review</strong>
              <span>Review → Edit → Autopost</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-section sales-scan-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Business Profile</div>
          <h2>The business setup does the briefing work.</h2>
          <p>
            Set up the Business Profile once. Then each week, FromOne uses that profile with the
            uploaded media to create posts that sound like the business.
          </p>
        </div>

        <div className="sales-scan-grid">
          <div className="sales-scan-card">
            <small>Set up once</small>
            <h3>The Business Profile becomes the brain.</h3>
            <p>
              FromOne learns the services, customers, tone, location and offers once, then uses
              that information every time new photos, videos or flyers are uploaded.
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
          <h2>Posts built from real business media.</h2>
          <p>
            FromOne uses each upload as the topic, then adds the business context, tone, CTA,
            hashtags and platform-specific wording.
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
          <h2>From upload to autopost.</h2>
          <p>
            The weekly flow stays simple enough for non-technical users: upload the media, create
            the posts, review them, then let FromOne handle Facebook and Instagram timing.
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
          <h2>Simple enough to use every week.</h2>
          <p>
            Dashboard is upload-first. Posts are review-first. Publishing is clear and controlled.
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
          <h2>Start free. Keep posting simple.</h2>
          <p>
            Try the full workflow during the demo. Upload media, create posts, review them, and
            see how much time FromOne saves.
          </p>
        </div>

        <div className="sales-pricing-card">
          <div>
            <small>FromOne Starter</small>
            <h3>
              £39.99 <span>/ month</span>
            </h3>
            <p>
              For small businesses that want their weekly photos, videos and flyers turned into
              scheduled posts without agency costs.
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
    <h2>Common questions before starting.</h2>
    <p>
      FromOne is built to keep weekly social media simple, controlled, and practical for small
      businesses.
    </p>
  </div>

  <div className="sales-faq-grid">
    <article className="sales-faq-card">
      <h3>Does FromOne post automatically?</h3>
      <p>
        Yes. FromOne can autopost Facebook and Instagram at the suggested time after you review
        the post. TikTok stays manual, so you copy the post and open TikTok to publish it yourself.
      </p>
    </article>

    <article className="sales-faq-card">
      <h3>Can I use it without a website?</h3>
      <p>
        Yes. You can add business details manually if the business does not have a website, then
        FromOne can create a weekly plan from that profile.
      </p>
    </article>

    <article className="sales-faq-card">
      <h3>Which platforms does it support?</h3>
      <p>
        FromOne currently focuses on Facebook, Instagram and TikTok. Facebook and Instagram can
        be published or scheduled. TikTok is copy/open manual for now.
      </p>
    </article>

    <article className="sales-faq-card">
      <h3>Can I edit the posts?</h3>
      <p>
        Yes. You can edit wording, replace media, rewrite using the media, or change the
        suggested posting time before it goes live.
      </p>
    </article>
  </div>
</section>
      <PublicFooter />
    </main>
  );
}