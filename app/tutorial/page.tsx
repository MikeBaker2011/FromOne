import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';

export const metadata: Metadata = {
  title: 'How FromOne Works | Create Weekly Social Media Content',
  description:
    'A simple guide to using FromOne to create and publish weekly social media posts for a small business.',
  alternates: {
    canonical: '/tutorial',
  },
  openGraph: {
    title: 'How FromOne Works | Create Weekly Social Media Content',
    description:
      'Set up your business, create weekly posts, review them, publish manually, and track what is done.',
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
    title: 'Add your business',
    text:
      'Paste your website, or add your business details if you do not have a website.',
  },
  {
    number: '2',
    title: 'Create weekly posts',
    text:
      'FromOne creates seven ready-to-use posts for the week.',
  },
  {
    number: '3',
    title: 'Review each post',
    text:
      'Open Posts, choose a day, read the post, and add an image if needed.',
  },
  {
    number: '4',
    title: 'Copy and publish',
    text:
      'Copy the post, open the platform, paste it, add your image, and publish it yourself.',
  },
  {
    number: '5',
    title: 'Mark it as posted',
    text:
      'After publishing, mark the post as posted so you can see what is left this week.',
  },
];

export default function TutorialPage() {
  return (
    <main className="tutorial-public-page tutorial-simple-page">
      <PublicNav />

      <section className="page-header tutorial-public-header tutorial-simple-header">
        <div className="page-eyebrow">FromOne Tutorial</div>
        <h1 className="page-title">How FromOne works</h1>
        <p className="page-description">
          FromOne helps you create a week of social media posts, then guides you through
          publishing them manually.
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
        <h2>Five steps</h2>

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
            FromOne does not post automatically. You choose the post, copy it, publish it
            yourself, then mark it as done.
          </p>
        </div>

        <Link href="/dashboard" className="sales-primary-button">
          Create weekly posts
        </Link>
      </section>
    </main>
  );
}