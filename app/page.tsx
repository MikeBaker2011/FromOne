import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

export const metadata: Metadata = {
  title: 'FromOne | Upload Media. Get Scheduled Social Posts.',
  description:
    'Upload photos, videos or flyers. FromOne creates social posts, chooses posting times, resizes Instagram images, and autoposts to Facebook and Instagram.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FromOne | Upload Media. Get Scheduled Social Posts.',
    description:
      'FromOne turns weekly business media into scheduled Facebook, Instagram and TikTok-ready posts.',
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

const productHighlights = [
  'Upload photos, videos and flyers',
  'One upload becomes one post',
  'Posts are written from real media',
  'Posting times are chosen for you',
  'Facebook and Instagram can autopost',
  'Instagram images can be resized safely',
];

const workflow = [
  {
    title: 'Upload files',
    description:
      'Add this week’s photos, videos, flyers, menus, offers, event clips or product shots.',
  },
  {
    title: 'Create posts',
    description:
      'FromOne turns each upload into a platform-ready post using the business details and tone.',
  },
  {
    title: 'Review the week',
    description:
      'See the posts in a simple weekly calendar. Edit wording, replace media or rewrite using the upload.',
  },
  {
    title: 'Autopost or copy',
    description:
      'Facebook and Instagram can autopost at the chosen times. TikTok is copy/open manual for now.',
  },
];

const appStrengths = [
  {
    title: 'Media-first posts',
    description:
      'FromOne does not just write generic captions. It uses the uploaded image, video or flyer as the reason for the post.',
  },
  {
    title: 'Automatic times',
    description:
      'FromOne suggests posting times automatically, so users are not forced to understand content scheduling.',
  },
  {
    title: 'Instagram-safe images',
    description:
      'If an image is the wrong shape for Instagram, FromOne can create a safer version before publishing.',
  },
  {
    title: 'Autopost where possible',
    description:
      'Facebook and Instagram can publish automatically. TikTok remains simple: copy the post and open TikTok.',
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
      'The user starts with one simple action: upload this week’s media and create posts.',
    image: '/dashboard-preview.png',
    alt: 'FromOne upload dashboard for creating social media posts',
  },
  {
    title: 'Weekly post calendar',
    description:
      'Posts are organised by day, platform and planned time so the week is easy to review.',
    image: '/posts-preview.png',
    alt: 'FromOne weekly post calendar showing scheduled posts',
  },
  {
    title: 'Powerful post editor',
    description:
      'Edit wording, replace media, rewrite using the upload, schedule autoposting or copy/open TikTok.',
    image: '/audience-preview.png',
    alt: 'FromOne post editor for reviewing and publishing social media posts',
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
            <div className="page-eyebrow">Social media made from your real business media</div>

            <h1 style={{ lineHeight: 0.9 }}>Upload media. Get scheduled posts.</h1>

            <p>
              FromOne turns photos, videos and flyers into ready-to-review posts, chooses sensible
              posting times, resizes Instagram images when needed, and can autopost to Facebook
              and Instagram.
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
              <span>✓ Uploads become posts</span>
              <span>✓ Auto-scheduled times</span>
              <span>✓ Facebook & Instagram autopost</span>
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
              <span>Upload → Review → Autopost</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-section sales-scan-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Why it feels different</div>
          <h2>FromOne starts with what the business already has.</h2>
          <p>
            Most small businesses already have photos, videos, flyers, menus, event clips or
            product shots. FromOne turns those real assets into useful scheduled posts.
          </p>
        </div>

        <div className="sales-scan-grid">
          <div className="sales-scan-card">
            <small>Simple weekly promise</small>
            <h3>Upload files. FromOne creates the week.</h3>
            <p>
              No complicated marketing dashboard. No confusing settings upfront. The user uploads
              the media, chooses the platforms, reviews the posts and lets FromOne handle the
              posting times.
            </p>
          </div>

          <div className="sales-scan-list">
            {productHighlights.map((item) => (
              <div key={item} className="card">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-section sales-example-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">What FromOne creates</div>
          <h2>Posts that are based on the upload, not generic filler.</h2>
          <p>
            Each post gets a caption, CTA, hashtags and platform-specific direction. The upload
            stays at the centre of the post.
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

      <section className="sales-section sales-scan-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Built for the real workflow</div>
          <h2>The best parts are automatic, but still editable.</h2>
          <p>
            FromOne makes the hard decisions for the user, then lets them change anything before
            it goes live.
          </p>
        </div>

        <div className="sales-steps-grid">
          {appStrengths.map((item, index) => (
            <article key={item.title} className="sales-step-card">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-section sales-steps-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Workflow</div>
          <h2>A weekly flow anyone can understand.</h2>
          <p>
            FromOne keeps the product path clear: upload, generate, review, autopost.
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
      <h3>Does it resize images for Instagram?</h3>
      <p>
        Yes. If an uploaded image is not a good shape for Instagram, FromOne can create an
        Instagram-safe version so the post has a better chance of publishing cleanly.
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
      <h3>Can I change the posts or times?</h3>
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