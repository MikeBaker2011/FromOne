import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'How FromOne Works | Help Guide',
  description:
    'Learn how FromOne turns photos, videos and flyers into ready-to-review weekly social posts with Facebook and Instagram autoposting.',
  alternates: {
    canonical: '/tutorial',
  },
  openGraph: {
    title: 'How FromOne Works | Help Guide',
    description:
      'Set up the business, upload media, review the weekly posts, then publish Facebook and Instagram or copy/open TikTok.',
    url: '/tutorial',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'How FromOne creates scheduled social media posts',
      },
    ],
  },
};

const workflow = [
  {
    number: '01',
    title: 'Set the business profile',
    text:
      'Add the business name, services, location, tone and audience once. FromOne uses this profile every time posts are created.',
  },
  {
    number: '02',
    title: 'Upload the week’s media',
    text:
      'Add photos, videos or flyers from recent work, offers, products, events, menus or behind-the-scenes content.',
  },
  {
    number: '03',
    title: 'Review before publishing',
    text:
      'Open the weekly posts, check the wording and media, edit anything you want, then publish when ready.',
  },
];

const publishing = [
  {
    name: 'Facebook',
    status: 'Autopost',
    detail: 'Publishes to a connected Facebook Page after review.',
  },
  {
    name: 'Instagram',
    status: 'Image/video',
    detail: 'Publishes supported image and video posts when connected.',
  },
  {
    name: 'TikTok',
    status: 'Manual',
    detail: 'FromOne creates the wording; you copy it and open TikTok.',
  },
];

const checkpoints = [
  'Business Profile saved',
  'Media uploaded',
  'Posts reviewed',
  'Publishing method chosen',
];

export default function TutorialPage() {
  return (
    <main className="sales-page tutorial-public-page">
      <style>{`
        .tutorial-public-page {
          overflow: hidden;
        }

        .tutorial-shell {
          width: min(1120px, calc(100vw - 32px));
          margin: 0 auto;
        }

        .tutorial-hero {
          position: relative;
          overflow: hidden;
          padding-bottom: clamp(34px, 5vw, 58px);
        }

        .tutorial-hero::before {
          content: '';
          position: absolute;
          inset: -230px -120px auto;
          height: 660px;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 212, 59, 0.2), transparent 32%),
            radial-gradient(circle at 76% 22%, rgba(61, 220, 151, 0.12), transparent 30%),
            radial-gradient(circle at 20% 22%, rgba(255, 255, 255, 0.08), transparent 30%);
          pointer-events: none;
        }

        .tutorial-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 0.98fr) minmax(340px, 0.82fr);
          gap: clamp(26px, 5vw, 54px);
          align-items: center;
          padding: clamp(42px, 6vw, 76px) 0 clamp(8px, 2vw, 22px);
        }

        .tutorial-hero-copy {
          max-width: 720px;
        }

        .tutorial-title {
          margin: 0 0 18px;
          color: #ffffff;
          font-size: clamp(3.3rem, 7vw, 7.2rem);
          line-height: 0.88;
          letter-spacing: -0.082em;
        }

        .tutorial-title span {
          color: #ffd43b;
        }

        .tutorial-lede {
          max-width: 620px;
          margin: 0;
          color: rgba(248, 250, 252, 0.76);
          font-size: clamp(1.04rem, 1.35vw, 1.2rem);
          line-height: 1.72;
        }

        .tutorial-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .tutorial-preview {
          position: relative;
          padding: clamp(22px, 3vw, 32px);
          border-radius: 40px;
          background:
            radial-gradient(circle at 20% 8%, rgba(255, 212, 59, 0.24), transparent 30%),
            radial-gradient(circle at 86% 18%, rgba(61, 220, 151, 0.13), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.24);
          box-shadow: 0 34px 120px rgba(0, 0, 0, 0.38);
        }

        .tutorial-preview-card {
          display: grid;
          gap: 14px;
          padding: 18px;
          border-radius: 30px;
          background: rgba(2, 6, 23, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tutorial-preview-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .tutorial-preview-top strong {
          color: #ffffff;
          font-size: 1.1rem;
        }

        .tutorial-preview-top span {
          color: #a7f3d0;
          font-size: 0.82rem;
          font-weight: 950;
        }

        .tutorial-checklist {
          display: grid;
          gap: 10px;
        }

        .tutorial-checklist div {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding: 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.065);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(248, 250, 252, 0.84);
          font-weight: 850;
        }

        .tutorial-checklist span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.15);
          color: #ffd43b;
          font-weight: 1000;
        }

        .tutorial-section {
          padding: clamp(34px, 5vw, 56px) 0;
        }

        .tutorial-section-heading {
          max-width: 760px;
          margin: 0 auto 24px;
          text-align: center;
        }

        .tutorial-section-heading h2 {
          margin: 10px 0 12px;
          color: #ffffff;
          font-size: clamp(2.35rem, 5vw, 4.9rem);
          line-height: 0.92;
          letter-spacing: -0.068em;
        }

        .tutorial-section-heading p {
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
          font-size: clamp(1rem, 1.2vw, 1.12rem);
        }

        .tutorial-workflow-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .tutorial-workflow-card,
        .tutorial-platform-card {
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
        }

        .tutorial-workflow-card {
          min-height: 250px;
          padding: 24px;
        }

        .tutorial-step-number {
          display: inline-grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border-radius: 16px;
          background: #ffd43b;
          color: #101420;
          font-weight: 1000;
          box-shadow: 0 16px 36px rgba(255, 212, 59, 0.18);
        }

        .tutorial-workflow-card h3 {
          margin: 22px 0 10px;
          color: #ffffff;
          font-size: 1.45rem;
        }

        .tutorial-workflow-card p,
        .tutorial-platform-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.7);
          line-height: 1.62;
        }

        .tutorial-platform-panel {
          padding: clamp(26px, 4vw, 44px);
          border-radius: 42px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.14), transparent 34%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.088), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 96px rgba(0, 0, 0, 0.3);
        }

        .tutorial-platform-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .tutorial-platform-card {
          min-height: 210px;
          padding: 24px;
        }

        .tutorial-platform-card .status {
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 950;
        }

        .tutorial-platform-card h3 {
          margin: 16px 0 9px;
          color: #ffffff;
          font-size: 1.7rem;
        }

        .tutorial-final {
          margin-bottom: clamp(48px, 6vw, 70px);
          padding: clamp(30px, 5vw, 58px);
          border-radius: 44px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.26), transparent 34%),
            radial-gradient(circle at 84% 20%, rgba(61, 220, 151, 0.12), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.28);
          box-shadow: 0 34px 120px rgba(0, 0, 0, 0.38);
          text-align: center;
        }

        .tutorial-final h2 {
          max-width: 760px;
          margin: 12px auto 16px;
          color: #ffffff;
          font-size: clamp(2.45rem, 5.6vw, 5.6rem);
          line-height: 0.9;
          letter-spacing: -0.074em;
        }

        .tutorial-final p {
          max-width: 640px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .tutorial-final-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 30px;
        }

        @media (max-width: 920px) {
          .tutorial-hero-grid {
            grid-template-columns: 1fr;
          }

          .tutorial-hero-copy {
            margin: 0 auto;
            text-align: center;
          }

          .tutorial-lede,
          .tutorial-actions {
            margin-left: auto;
            margin-right: auto;
          }

          .tutorial-actions {
            justify-content: center;
          }

          .tutorial-workflow-grid,
          .tutorial-platform-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .tutorial-shell {
            width: min(100% - 24px, 520px);
          }

          .tutorial-hero-grid {
            padding-top: 50px;
            gap: 28px;
          }

          .tutorial-title {
            font-size: clamp(3rem, 14vw, 4.1rem);
            line-height: 0.91;
          }

          .tutorial-actions,
          .tutorial-final-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .tutorial-actions a,
          .tutorial-final-actions a {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .tutorial-preview,
          .tutorial-platform-panel,
          .tutorial-final {
            border-radius: 30px;
          }

          .tutorial-preview-top {
            display: grid;
            justify-items: center;
            text-align: center;
          }

          .tutorial-workflow-card,
          .tutorial-platform-card {
            min-height: auto;
            padding: 20px;
            display: grid;
            justify-items: center;
            text-align: center;
          }

          .tutorial-checklist div {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .tutorial-workflow-card h3,
          .tutorial-workflow-card p,
          .tutorial-platform-card h3,
          .tutorial-platform-card p,
          .tutorial-section-heading,
          .tutorial-final {
            text-align: center;
          }
        }
      `}</style>

      <section className="tutorial-hero">
        <PublicNav />

        <div className="tutorial-shell tutorial-hero-grid">
          <div className="tutorial-hero-copy">
            <h1 className="tutorial-title">
              From upload to <span>ready posts.</span>
            </h1>

            <p className="tutorial-lede">
              A quick guide to the FromOne workflow: set up the business, upload weekly media,
              review the posts, then publish with control.
            </p>

            <div className="tutorial-actions">
              <Link href="/dashboard" className="sales-primary-button">
                Go to Dashboard
              </Link>

              <Link href="/posts" className="sales-secondary-button">
                View Posts
              </Link>
            </div>
          </div>

          <aside className="tutorial-preview" aria-label="FromOne setup checklist">
            <div className="tutorial-preview-card">
              <div className="tutorial-preview-top">
                <strong>Setup checklist</strong>
                <span>4 steps</span>
              </div>

              <div className="tutorial-checklist">
                {checkpoints.map((item) => (
                  <div key={item}>
                    <span aria-hidden="true">✓</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="tutorial-section">
        <div className="tutorial-shell">
          <div className="tutorial-section-heading">
            <div className="page-eyebrow">How it works</div>
            <h2>Three steps, no guesswork.</h2>
            <p>
              FromOne is designed around the weekly habit small businesses already understand:
              collect the week’s media, turn it into posts, and review before anything goes live.
            </p>
          </div>

          <div className="tutorial-workflow-grid">
            {workflow.map((item) => (
              <article key={item.title} className="tutorial-workflow-card">
                <span className="tutorial-step-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tutorial-section">
        <div className="tutorial-shell tutorial-platform-panel">
          <div className="tutorial-section-heading">
            <div className="page-eyebrow">Publishing rules</div>
            <h2>Each platform stays clear.</h2>
            <p>
              FromOne keeps publishing honest: Facebook and Instagram can autopost when connected,
              and TikTok remains a simple manual copy/open flow.
            </p>
          </div>

          <div className="tutorial-platform-grid">
            {publishing.map((item) => (
              <article key={item.name} className="tutorial-platform-card">
                <span className="status">{item.status}</span>
                <h3>{item.name}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tutorial-section" style={{ paddingTop: 28 }}>
        <div className="tutorial-shell">
          <div className="tutorial-final">
            <div className="page-eyebrow">Ready to start?</div>
            <h2>Create the week from real media.</h2>
            <p>
              Start on the Dashboard. Upload the content, choose the platforms and review the
              posts before publishing.
            </p>

            <div className="tutorial-final-actions">
              <Link href="/dashboard" className="sales-primary-button">
                Create posts
              </Link>

              <Link href="/settings" className="sales-secondary-button">
                Check setup
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
