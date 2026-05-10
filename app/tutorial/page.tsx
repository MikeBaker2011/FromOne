import Link from 'next/link';

export default function TutorialPage() {
  const steps = [
    {
      number: '01',
      title: 'Start on Dashboard',
      description:
        'Use the Dashboard to create a campaign. Add a website URL, or open the no-website manual profile form.',
    },
    {
      number: '02',
      title: 'Scan a website',
      description:
        'If the business has a website, paste the URL and FromOne scans it for services, tone, audience, offers, and brand style.',
    },
    {
      number: '03',
      title: 'No website? Use manual profile',
      description:
        'If the business does not have a website, enter the business name, industry, services, audience, tone, goals, and offer manually.',
    },
    {
      number: '04',
      title: 'Generate seven posts',
      description:
        'FromOne creates a 7-day campaign across Facebook, Instagram, Google Business, LinkedIn, TikTok, and more.',
    },
    {
      number: '05',
      title: 'Review in Posts',
      description:
        'Open the Posts page to choose a campaign week, review each day, and check the generated captions, CTAs, hashtags, and image ideas.',
    },
    {
      number: '06',
      title: 'Tailor the audience',
      description:
        'Use the audience dropdown to rewrite a post for a specific customer type. The options change based on the business industry.',
    },
    {
      number: '07',
      title: 'Edit before publishing',
      description:
        'Fine-tune the caption, CTA, hashtags, and image prompt so the post sounds right before it is copied or published manually.',
    },
    {
      number: '08',
      title: 'Upload an image',
      description:
        'Attach the image you want to use for the post. You can replace or delete images any time before publishing.',
    },
    {
      number: '09',
      title: 'Publish manually',
      description:
        'Copy the post, open the platform, publish it yourself, then return to FromOne and mark it as posted.',
    },
    {
      number: '10',
      title: 'Use campaign history',
      description:
        'Rename, duplicate, regenerate, delete, or revisit previous campaigns from the Posts page.',
    },
  ];

  const workflowCards = [
    {
      title: 'Website route',
      text: 'Best when the business already has a website. FromOne scans the site and uses that information to shape the weekly campaign.',
    },
    {
      title: 'Manual route',
      text: 'Best when there is no website. Add the business details yourself and FromOne creates the campaign from that profile.',
    },
    {
      title: 'Publishing route',
      text: 'FromOne prepares the content. You stay in control by copying, uploading images, opening platforms, and marking posts as published.',
    },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">FromOne Tutorial</div>
        <h1 className="page-title">Create a week of content in minutes.</h1>
        <p className="page-description">
          Follow this workflow to turn a website or manual business profile into a
          complete 7-day social campaign.
        </p>
      </div>

      <section className="hero-card tutorial-hero tutorial-hero-updated">
        <div>
          <div className="page-eyebrow">Quick Start</div>
          <h2>Two ways to create a campaign.</h2>
          <p>
            Use a website scan for the richest result, or use the no-website manual
            profile when the business does not have a site yet.
          </p>

          <div className="tutorial-hero-actions">
            <Link href="/dashboard" className="dashboard-profile-link">
              Start on Dashboard
            </Link>

            <Link href="/posts" className="dashboard-profile-link">
              View Posts
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

      <div className="tutorial-grid tutorial-grid-updated">
        {steps.map((step) => (
          <section key={step.number} className="tutorial-card">
            <div className="tutorial-step-number">{step.number}</div>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
          </section>
        ))}
      </div>
    </>
  );
}