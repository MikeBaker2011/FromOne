import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';

export const metadata: Metadata = {
  title: 'How FromOne Works | Create Weekly Social Media Content',
  description:
    'See how FromOne helps small businesses create a full week of social media content from a website scan or simple business profile.',
  alternates: {
    canonical: '/tutorial',
  },
  openGraph: {
    title: 'How FromOne Works | Create Weekly Social Media Content',
    description:
      'Set up your business once, generate a seven-day social media campaign, review each post, and publish manually with FromOne.',
    url: '/tutorial',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'How FromOne creates weekly social media content',
      },
    ],
  },
};

export default function TutorialPage() {
  const quickSteps = [
    {
      number: '01',
      title: 'Set up once',
      description:
        'Add your website or create a simple business profile. FromOne remembers this, so you do not need to start from scratch every week.',
    },
    {
      number: '02',
      title: 'Generate your weekly content',
      description:
        'Create a fresh seven-day campaign whenever you need one. FromOne gives you captions, CTAs, hashtags, image ideas, and platform suggestions.',
    },
    {
      number: '03',
      title: 'Review, copy, and publish',
      description:
        'Check each post, edit anything you want, upload an image, copy the content, open the platform, and publish it yourself.',
    },
    {
      number: '04',
      title: 'Track what is done',
      description:
        'Mark posts as posted so you can clearly see what has been published and what still needs doing.',
    },
  ];

  const setupOptions = [
    {
      title: 'Use a website scan',
      text:
        'Best if the business already has a website. Paste the website URL and FromOne will use it to understand the business, services, audience, tone, and content direction.',
    },
    {
      title: 'Use a manual profile',
      text:
        'Best if there is no website. Add the business name, industry, location, services, audience, tone, offers, and goals yourself.',
    },
    {
      title: 'Use the saved profile again',
      text:
        'Once the profile is saved, you can keep creating new weekly campaigns without re-entering the same details each time.',
    },
  ];

  const detailedSteps = [
    {
      title: '1. Open the Dashboard',
      text:
        'The Dashboard is where you start. You can paste a website, use a saved profile, or open the manual profile section.',
    },
    {
      title: '2. Add or check the business details',
      text:
        'If this is the first time using FromOne, add the website or fill in the manual business profile. If it is already saved, you can move straight to generating content.',
    },
    {
      title: '3. Generate the campaign',
      text:
        'Click the generate button. FromOne will create seven posts for the week, shaped around the business type, audience, location, tone, and offer.',
    },
    {
      title: '4. Go to Posts',
      text:
        'The Posts page shows the full campaign. You can move through each day, check the platform, read the caption, review the CTA, and see the suggested image idea.',
    },
    {
      title: '5. Tailor posts for an audience',
      text:
        'Use the audience tool if you want a post to speak to a specific customer group, such as homeowners, new customers, local shoppers, landlords, or busy professionals.',
    },
    {
      title: '6. Edit anything you want',
      text:
        'You stay in control. You can change the caption, CTA, hashtags, or image idea before publishing.',
    },
    {
      title: '7. Upload an image',
      text:
        'Add your own image to each post. This keeps your content more personal and relevant to your business.',
    },
    {
      title: '8. Copy, paste, and publish',
      text:
        'Copy the finished post, open the platform, paste the content, add the image, and publish manually.',
    },
    {
      title: '9. Mark the post as done',
      text:
        'After publishing, mark the post as posted inside FromOne. This helps you keep track of the week.',
    },
  ];

  const tips = [
    'You only need to set up the business once.',
    'You can generate a new weekly campaign whenever you need fresh posts.',
    'You can edit every post before publishing.',
    'FromOne does not post automatically — you stay in control.',
    'Use audience targeting when you want posts to speak to a specific type of customer.',
    'If something does not work as expected, use Feedback to let us know.',
  ];

  return (
    <main className="tutorial-public-page">
      <PublicNav />

      <div className="page-header tutorial-public-header">
        <div className="page-eyebrow">FromOne Tutorial</div>
        <h1 className="page-title">Set up once. Create content every week.</h1>
        <p className="page-description">
          FromOne is designed for busy small businesses. Add your business details once,
          generate a fresh weekly campaign when you need it, then copy, paste, publish,
          and track what is done.
        </p>
      </div>

      <section className="hero-card tutorial-hero tutorial-hero-updated">
        <div>
          <div className="page-eyebrow">Quick Start</div>
          <h2>Two easy ways to get started.</h2>
          <p>
            Use a website scan if you already have a website, or use the manual profile if
            you do not. Once your business profile is saved, FromOne can use it again for
            future weekly campaigns.
          </p>

          <div className="tutorial-hero-actions">
            <Link href="/signin" className="dashboard-profile-link">
              Start your 7-day demo
            </Link>

            <Link href="/" className="dashboard-profile-link">
              Back to homepage
            </Link>
          </div>
        </div>
      </section>

      <section className="tutorial-workflow-grid">
        {setupOptions.map((card) => (
          <div key={card.title}>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </div>
        ))}
      </section>

      <section className="sales-section sales-steps-section">
        <div className="sales-section-heading">
          <div className="page-eyebrow">Simple Workflow</div>
          <h2>The weekly process in plain English</h2>
          <p>
            FromOne keeps things simple: set up the business once, generate a fresh weekly
            plan, review the posts, and publish them yourself.
          </p>
        </div>

        <div className="sales-steps-grid">
          {quickSteps.map((step) => (
            <article key={step.number} className="sales-step-card">
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-card tutorial-detail-card">
        <div className="page-eyebrow">Step-by-step guide</div>
        <h2 style={{ marginTop: 0 }}>What to click and what happens next</h2>
        <p>
          This guide explains the full FromOne workflow from setup through to publishing.
        </p>

        <div className="tutorial-detail-list">
          {detailedSteps.map((step) => (
            <article key={step.title} className="tutorial-detail-item">
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-card tutorial-tips-card">
        <div className="page-eyebrow">Useful Tips</div>
        <h2 style={{ marginTop: 0 }}>Things to remember</h2>

        <div className="tutorial-tips-grid">
          {tips.map((tip) => (
            <div key={tip} className="card">
              ✓ {tip}
            </div>
          ))}
        </div>
      </section>

      <section className="sales-cta-section tutorial-public-cta">
        <div>
          <div className="page-eyebrow">Built for busy businesses</div>
          <h2>Simple enough to use every week.</h2>
          <p>
            FromOne removes the blank-page problem and gives small businesses a clear
            social media content workflow they can actually keep using.
          </p>
        </div>

        <Link href="/signin" className="sales-primary-button">
          Start your 7-day demo
        </Link>
      </section>
    </main>
  );
}