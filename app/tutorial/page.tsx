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
      'Add a business, generate a seven-day social media campaign, review each post, and publish manually with FromOne.',
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
  const steps = [
    {
      number: '01',
      title: 'Add the business',
      description:
        'Paste a website URL for FromOne to scan, or use the manual profile if the business does not have a website.',
    },
    {
      number: '02',
      title: 'Generate the week',
      description:
        'FromOne creates a seven-day social media campaign with captions, CTAs, hashtags, image ideas, and platform recommendations.',
    },
    {
      number: '03',
      title: 'Review and publish',
      description:
        'Edit the post if needed, upload an image, copy the content, open the platform, and publish it manually.',
    },
    {
      number: '04',
      title: 'Track what is done',
      description:
        'Mark posts as posted and use campaign history to revisit, duplicate, rename, or regenerate previous campaigns.',
    },
  ];

  const workflowCards = [
    {
      title: 'Website route',
      text: 'Best when the business already has a website. FromOne scans the site and uses the details to shape the weekly campaign.',
    },
    {
      title: 'Manual route',
      text: 'Best when there is no website. Add the business details yourself and FromOne creates content from that profile.',
    },
    {
      title: 'Publishing route',
      text: 'FromOne prepares the content. You stay in control by copying, uploading images, opening platforms, and marking posts as published.',
    },
  ];

  return (
    <main className="tutorial-public-page">
      <PublicNav />

      <div className="page-header tutorial-public-header">
        <div className="page-eyebrow">FromOne Tutorial</div>
        <h1 className="page-title">Create a full week of social media content in four simple steps.</h1>
        <p className="page-description">
          FromOne is designed to keep social media simple: add the business, generate the
          week, publish manually, and track what is done.
        </p>
      </div>

      <section className="hero-card tutorial-hero tutorial-hero-updated">
        <div>
          <div className="page-eyebrow">Quick Start</div>
          <h2>Two easy ways to create a campaign.</h2>
          <p>
            Use a website scan for the richest result, or use the no-website manual
            profile when the business does not have a site yet.
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
        {workflowCards.map((card) => (
          <div key={card.title}>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </div>
        ))}
      </section>

      <div className="tutorial-grid tutorial-grid-simple">
        {steps.map((step) => (
          <section key={step.number} className="tutorial-card">
            <div className="tutorial-step-number">{step.number}</div>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
          </section>
        ))}
      </div>

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