import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';

export const metadata: Metadata = {
  title: 'Help Guide | How FromOne Works',
  description:
    'A simple guide to using FromOne to set up a business, create weekly social media posts, review posts, and publish them manually.',
  alternates: {
    canonical: '/tutorial',
  },
  openGraph: {
    title: 'Help Guide | How FromOne Works',
    description:
      'Set up your business, choose your platforms, create weekly posts, review them, publish manually, and track what is done.',
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

const steps = [
  {
    number: '1',
    title: 'Set up the business',
    text:
      'Add the business website, or enter the business details manually if there is no website.',
  },
  {
    number: '2',
    title: 'Choose your platforms',
    text:
      'Select the social platforms you want content for. FromOne will only create posts for the platforms you choose.',
  },
  {
    number: '3',
    title: 'Create weekly posts',
    text:
      'Click the create button on the Dashboard. FromOne creates seven ready-to-use posts for the week.',
  },
  {
    number: '4',
    title: 'Open Posts',
    text:
      'Go to Posts to see the weekly calendar. Choose a day to review the post for that day.',
  },
  {
    number: '5',
    title: 'Prepare the post',
    text:
      'Read the post, make it more specific if needed, edit the wording, and add an image.',
  },
  {
    number: '6',
    title: 'Publish and mark as done',
    text:
      'Copy the post, open the platform, publish it manually, then mark it as posted in FromOne.',
  },
];

const tips = [
  {
    title: 'FromOne does not auto-post',
    text:
      'You stay in control. FromOne creates the content, then you copy and publish it manually.',
  },
  {
    title: 'Use Settings for business details',
    text:
      'Settings is where you can update the website, business profile, tone, offers, and brand details.',
  },
  {
    title: 'Use Support if something feels unclear',
    text:
      'Send a support request if something does not work, looks wrong, or you need help.',
  },
];

export default function TutorialPage() {
  return (
    <main className="tutorial-public-page tutorial-simple-page">
      <PublicNav />

      <section className="page-header tutorial-public-header tutorial-simple-header">
        <div className="page-eyebrow">FromOne Help Guide</div>
        <h1 className="page-title">How FromOne works</h1>
        <p className="page-description">
          A simple guide to setting up a business, creating weekly posts, reviewing them,
          and publishing manually.
        </p>

        <div className="tutorial-simple-actions">
          <Link href="/dashboard" className="sales-primary-button">
            Go to Dashboard
          </Link>

          <Link href="/posts" className="sales-secondary-button">
            View Posts
          </Link>
        </div>
      </section>

      <section className="premium-card tutorial-simple-card">
        <div className="page-eyebrow">Simple workflow</div>
        <h2>Six steps</h2>

        <div className="tutorial-simple-step-list">
          {steps.map((step) => (
            <article key={step.number} className="tutorial-simple-step">
              <span>{step.number}</span>

              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-card tutorial-simple-note">
        <div>
          <div className="page-eyebrow">Good to know</div>
          <h2>You stay in control</h2>
          <p>
            FromOne does not post automatically. It creates the weekly content, then you
            review, copy, publish, and mark each post as done.
          </p>
        </div>

        <Link href="/dashboard" className="sales-primary-button">
          Create weekly posts
        </Link>
      </section>

      <section className="premium-card tutorial-simple-card">
        <div className="page-eyebrow">Helpful notes</div>
        <h2>Before you start</h2>

        <div className="grid grid-three">
          {tips.map((tip) => (
            <article key={tip.title} className="card">
              <strong>{tip.title}</strong>
              <p>{tip.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}