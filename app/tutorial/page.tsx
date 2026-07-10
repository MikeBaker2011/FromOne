import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'How FromOne Works | Create, Review and Publish',
  description:
    'Learn how FromOne scans a business, creates posts, prepares media and supports Facebook, Instagram and Smiles workflows.',
  alternates: { canonical: '/tutorial' },
  openGraph: {
    title: 'How FromOne Works | Create, Review and Publish',
    description:
      'A simple walkthrough for scanning a business, creating posts, preparing media, publishing to social channels and sending suitable offers or events to Smiles.',
    url: '/tutorial',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'How FromOne creates ready-to-review social media posts',
      },
    ],
  },
};

const guideSteps = [
  {
    number: '01',
    title: 'Scan or set up the business',
    text: 'Add a website or business details so FromOne understands the services, audience, tone and location.',
  },
  {
    number: '02',
    title: 'Create and prepare posts',
    text: 'Generate posts, check the wording, and prepare images or media for the right platform format.',
  },
  {
    number: '03',
    title: 'Publish or send',
    text: 'Publish to Facebook or Instagram where supported, or send suitable offers and events to Smiles for approval.',
  },
];

const platformNotes = [
  {
    title: 'Facebook',
    label: 'Direct publishing',
    text: 'FromOne can publish to a connected Facebook Page, with manual posting as a fallback if the connection needs attention.',
  },
  {
    title: 'Instagram',
    label: 'Connected publishing',
    text: 'FromOne can prepare supported image or video media for Instagram before publishing.',
  },
  {
    title: 'Smiles',
    label: 'Offers and events',
    text: 'Suitable offers and events can be sent to Smiles for approval, then managed as live listings.',
  },
];

export default function TutorialPage() {
  return (
    <main className="sales-page fromone-marketing-page fromone-tutorial-page">
      <style>{`
        .fromone-marketing-page {
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 212, 59, 0.09), transparent 34%),
            #050811;
        }

        .fromone-marketing-page .public-nav {
          width: min(1180px, calc(100vw - 40px)) !important;
          max-width: none !important;
          margin: 0 auto !important;
          padding: clamp(24px, 3vw, 34px) 0 0 !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .fromone-marketing-page .public-nav-inner {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .fromone-shell {
          width: min(1180px, calc(100vw - 40px));
          margin: 0 auto;
        }

        .fromone-guide-hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 4%, rgba(255, 212, 59, 0.16), transparent 28%),
            radial-gradient(circle at 86% 7%, rgba(61, 220, 151, 0.11), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,0.025), transparent 50%);
        }

        .fromone-guide-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.96fr) minmax(360px, 1.04fr);
          gap: clamp(30px, 5vw, 62px);
          align-items: center;
          padding: clamp(58px, 6vw, 82px) 0 clamp(50px, 6vw, 78px);
        }

        .fromone-guide-title {
          margin: 0 0 20px;
          color: #ffffff;
          font-size: clamp(3rem, 5.9vw, 6rem);
          line-height: 1.06;
          letter-spacing: -0.035em;
        }

        .fromone-guide-title span {
          color: #ffd43b;
          display: inline-block;
        }

        .fromone-guide-text {
          max-width: 610px;
          margin: 0;
          color: rgba(248, 250, 252, 0.76);
          font-size: clamp(1.05rem, 1.35vw, 1.2rem);
          line-height: 1.7;
        }

        .fromone-guide-actions,
        .fromone-final-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .fromone-guide-panel {
          padding: clamp(22px, 3vw, 32px);
          border-radius: 42px;
          background:
            radial-gradient(circle at 18% 10%, rgba(255, 212, 59, 0.2), transparent 30%),
            radial-gradient(circle at 86% 16%, rgba(61, 220, 151, 0.14), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 212, 59, 0.23);
          box-shadow: 0 38px 120px rgba(0, 0, 0, 0.4);
        }

        .fromone-guide-card-list {
          display: grid;
          gap: 14px;
        }

        .fromone-guide-mini-card {
          display: grid;
          grid-template-columns: 54px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
          padding: 18px;
          border-radius: 26px;
          background: rgba(2, 6, 23, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-guide-mini-card span,
        .fromone-step-number {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #ffd43b;
          color: #101420;
          font-weight: 1000;
          box-shadow: 0 16px 36px rgba(255, 212, 59, 0.18);
        }

        .fromone-guide-mini-card h3 {
          margin: 0 0 8px;
          color: #ffffff;
          font-size: 1.18rem;
        }

        .fromone-guide-mini-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.55;
        }

        .fromone-section {
          padding: clamp(44px, 5vw, 64px) 0;
        }

        .fromone-section-heading {
          max-width: 760px;
          margin: 0 auto 24px;
          text-align: center;
        }

        .fromone-section-heading h2 {
          margin: 10px 0 12px;
          color: #ffffff;
          font-size: clamp(2.35rem, 4.7vw, 4.8rem);
          line-height: 0.94;
          letter-spacing: -0.068em;
        }

        .fromone-section-heading p {
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
          font-size: clamp(1rem, 1.2vw, 1.12rem);
        }

        .fromone-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .fromone-info-card {
          min-height: 230px;
          padding: 24px;
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
        }

        .fromone-info-card h3 {
          margin: 20px 0 10px;
          color: #ffffff;
          font-size: 1.45rem;
        }

        .fromone-info-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.7);
          line-height: 1.62;
        }

        .fromone-platform-label {
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 950;
        }

        .fromone-wide-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
          gap: clamp(20px, 4vw, 42px);
          align-items: center;
          padding: clamp(28px, 5vw, 54px);
          border-radius: 42px;
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.14), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.088), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 96px rgba(0, 0, 0, 0.3);
        }

        .fromone-wide-panel h2 {
          margin: 10px 0 14px;
          color: #ffffff;
          font-size: clamp(2.4rem, 4.7vw, 4.9rem);
          line-height: 0.94;
          letter-spacing: -0.072em;
        }

        .fromone-wide-panel p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-checklist {
          display: grid;
          gap: 12px;
        }

        .fromone-checklist div {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 15px 16px;
          border-radius: 20px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(248, 250, 252, 0.86);
          font-weight: 850;
          line-height: 1.42;
        }

        .fromone-checklist span {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-weight: 1000;
        }

        .fromone-final-cta {
          padding: clamp(34px, 5vw, 60px);
          border-radius: 46px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.22), transparent 34%),
            radial-gradient(circle at 86% 20%, rgba(61, 220, 151, 0.11), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.26);
          box-shadow: 0 34px 110px rgba(0, 0, 0, 0.38);
          text-align: center;
        }

        .fromone-final-cta h2 {
          max-width: 820px;
          margin: 12px auto 16px;
          color: #ffffff;
          font-size: clamp(2.55rem, 5.4vw, 5.5rem);
          line-height: 0.92;
          letter-spacing: -0.076em;
        }

        .fromone-final-cta p {
          max-width: 660px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-final-actions {
          justify-content: center;
        }

        @media (max-width: 920px) {
          .fromone-guide-grid,
          .fromone-card-grid,
          .fromone-wide-panel {
            grid-template-columns: 1fr;
          }

          .fromone-guide-copy,
          .fromone-info-card,
          .fromone-wide-panel {
            text-align: center;
          }

          .fromone-guide-text,
          .fromone-guide-actions {
            margin-left: auto;
            margin-right: auto;
          }

          .fromone-guide-actions {
            justify-content: center;
          }

          .fromone-checklist div {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }
        }

        @media (max-width: 640px) {
          .fromone-marketing-page .public-nav {
            width: calc(100vw - 32px) !important;
            padding-top: 18px !important;
          }

          .fromone-shell {
            width: min(100% - 24px, 520px);
          }

          .fromone-guide-grid {
            padding-top: 54px;
            padding-bottom: 42px;
            gap: 32px;
          }

          .fromone-guide-title {
            font-size: clamp(2.35rem, 10.5vw, 3.15rem);
            line-height: 1.08;
            letter-spacing: -0.03em;
          }

          .fromone-guide-actions,
          .fromone-final-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .fromone-guide-actions a,
          .fromone-final-actions a {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .fromone-guide-panel,
          .fromone-wide-panel,
          .fromone-final-cta {
            border-radius: 30px;
          }

          .fromone-guide-mini-card {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .fromone-section {
            padding: 42px 0;
          }

          .fromone-info-card {
            min-height: auto;
            padding: 20px;
          }
        }
      `}</style>

      <section className="fromone-guide-hero">
        <PublicNav />

        <div className="fromone-shell fromone-guide-grid">
          <div className="fromone-guide-copy">
            <h1 className="fromone-guide-title">
              How FromOne creates <span>ready posts.</span>
            </h1>
            <p className="fromone-guide-text">
              A focused walkthrough for scanning a business, creating posts, preparing media, publishing to Facebook or Instagram, and sending suitable offers or events to Smiles.
            </p>
            <div className="fromone-guide-actions">
              <Link href="/signin" className="sales-primary-button">Start 7-day demo</Link>
              <Link href="/dashboard" className="sales-secondary-button">Go to Dashboard</Link>
            </div>
          </div>

          <div className="fromone-guide-panel" aria-label="FromOne workflow preview">
            <div className="fromone-guide-card-list">
              {guideSteps.map((step) => (
                <article key={step.number} className="fromone-guide-mini-card">
                  <span>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-shell">
          <div className="fromone-section-heading">
            <div className="page-eyebrow">The workflow</div>
            <h2>Simple enough to use every week.</h2>
            <p>FromOne keeps the process practical: scan the business, create posts, prepare the media, then publish or send with control.</p>
          </div>

          <div className="fromone-card-grid">
            {guideSteps.map((step) => (
              <article key={step.title} className="fromone-info-card">
                <span className="fromone-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-shell">
          <div className="fromone-wide-panel">
            <div>
              <div className="page-eyebrow">Review before publishing</div>
              <h2>Every post stays under control.</h2>
              <p>
                Posts are created for review first. You can edit wording, prepare the image, publish to connected social channels, send suitable offers or events to Smiles, or post manually when needed.
              </p>
            </div>

            <div className="fromone-checklist">
              {[
                'Check the caption, CTA and hashtags',
                'Prepare or replace the media',
                'Publish now or keep it for manual posting',
                'Use manual fallback if a connection needs attention',
              ].map((item) => (
                <div key={item}><span aria-hidden="true">✓</span><strong>{item}</strong></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-shell">
          <div className="fromone-section-heading">
            <div className="page-eyebrow">Publishing rules</div>
            <h2>Each platform is handled honestly.</h2>
            <p>Publish where Facebook and Instagram support it. Send suitable offers and events to Smiles, and keep connection issues simple with manual fallback.</p>
          </div>

          <div className="fromone-card-grid">
            {platformNotes.map((platform) => (
              <article key={platform.title} className="fromone-info-card">
                <span className="fromone-platform-label">{platform.label}</span>
                <h3>{platform.title}</h3>
                <p>{platform.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-section" style={{ paddingBottom: 72 }}>
        <div className="fromone-shell">
          <div className="fromone-final-cta">
            <div className="page-eyebrow">Ready to try it?</div>
            <h2>Create the first posting plan.</h2>
            <p>Start with the demo, add the business or website, prepare the first posts and choose whether they should publish socially or go to Smiles.</p>
            <div className="fromone-final-actions">
              <Link href="/signin" className="sales-primary-button">Start 7-day demo</Link>
              <Link href="/" className="sales-secondary-button">Back to homepage</Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
