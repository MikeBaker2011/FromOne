import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';

export const metadata: Metadata = {
  title: 'How FromOne Works | Create Weekly Social Media Content',
  description:
    'A simple guide to using FromOne to set up a business, choose platforms, create weekly social media posts, and publish them manually.',
  alternates: {
    canonical: '/tutorial',
  },
  openGraph: {
    title: 'How FromOne Works | Create Weekly Social Media Content',
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
    title: 'Add website or business details',
    text:
      'Paste the business website, or use the business details form if there is no website.',
  },
  {
    number: '2',
    title: 'Save the business setup',
    text:
      'Save the website or business details first so FromOne knows what business it is creating content for.',
  },
  {
    number: '3',
    title: 'Check Current Business',
    text:
      'Review the detected or saved business details, including the business name, industry, location, website, and selected platforms.',
  },
  {
    number: '4',
    title: 'Choose social platforms',
    text:
      'Select the social media platforms you want posts for. Click a platform card to add or remove it, and use More to see the next options.',
  },
  {
    number: '5',
    title: 'Create weekly posts',
    text:
      'Once the setup and platforms are ready, click Create Weekly Posts under the platform selector. FromOne creates seven posts using the selected platforms.',
  },
  {
    number: '6',
    title: 'Review and publish in Posts',
    text:
      'Open Posts, choose a day, review the content, add an image if needed, copy it to the platform, publish it manually, then mark it as posted.',
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
          FromOne helps you set up a business, choose the right platforms, create a week
          of social media posts, then publish them manually.
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
          <h2>You choose the platforms first</h2>
          <p>
            FromOne does not post automatically. You choose the platforms, create the weekly
            posts, copy each post, publish it yourself, then mark it as done.
          </p>
        </div>

        <Link href="/dashboard" className="sales-primary-button">
          Set up weekly posts
        </Link>
      </section>
    </main>
  );
}