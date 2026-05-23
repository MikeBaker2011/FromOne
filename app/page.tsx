import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

export const metadata: Metadata = {
  title: 'FromOne | Weekly Social Posts From Your Media',
  description:
    'FromOne turns small business photos, videos and flyers into ready-to-review weekly social posts with Facebook and Instagram autoposting.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FromOne | Weekly Social Posts From Your Media',
    description:
      'Upload this week’s media. FromOne writes the posts, suggests times, and can publish Facebook and Instagram after review.',
    url: '/',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FromOne social media app for small businesses',
      },
    ],
  },
};

const heroProof = ['Photos, videos & flyers', 'Facebook + Instagram autopost', 'TikTok copy/open'];

const workflow = [
  {
    step: '01',
    title: 'Upload the week',
    description: 'Add the media the business already has: jobs, offers, menus, events, products or short clips.',
  },
  {
    step: '02',
    title: 'Review the posts',
    description: 'FromOne writes platform-ready captions, CTAs and hashtags using the saved Business Profile.',
  },
  {
    step: '03',
    title: 'Publish with control',
    description: 'Facebook and Instagram can autopost when connected. TikTok stays simple with copy/open.',
  },
];

const premiumFeatures = [
  'Posts created from real media, not generic prompts',
  'Suggested posting times for the week',
  'Instagram-safe image handling',
  'Edit, improve, rescan and review before publishing',
];

const platformCards = [
  {
    name: 'Facebook',
    label: 'Autopost ready',
    detail: 'Publish to a connected Facebook Page after review.',
  },
  {
    name: 'Instagram',
    label: 'Image/video ready',
    detail: 'Publish to a connected professional account with supported media.',
  },
  {
    name: 'TikTok',
    label: 'Manual by design',
    detail: 'Copy the caption and open TikTok when it is time to post.',
  },
];

export default function Home() {
  return (
    <main className="sales-page fromone-public-home">
      <style>{`
        .fromone-public-home {
          overflow: hidden;
        }

        .fromone-public-shell {
          width: min(1160px, calc(100vw - 32px));
          margin: 0 auto;
        }

        .fromone-hero-stage {
          position: relative;
          overflow: hidden;
          padding-bottom: clamp(34px, 5vw, 70px);
        }

        .fromone-hero-stage::before {
          content: '';
          position: absolute;
          inset: -220px -140px auto;
          height: 720px;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 212, 59, 0.22), transparent 32%),
            radial-gradient(circle at 72% 28%, rgba(61, 220, 151, 0.12), transparent 28%),
            radial-gradient(circle at 24% 24%, rgba(255, 255, 255, 0.09), transparent 30%);
          filter: blur(4px);
          pointer-events: none;
        }

        .fromone-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          gap: clamp(26px, 5vw, 56px);
          align-items: center;
          padding: clamp(58px, 8vw, 112px) 0 clamp(18px, 3vw, 34px);
        }

        .fromone-hero-copy {
          max-width: 680px;
        }

        .fromone-hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.105);
          border: 1px solid rgba(255, 212, 59, 0.26);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fromone-hero-title {
          margin: 20px 0 20px;
          max-width: 760px;
          color: #ffffff;
          font-size: clamp(3.4rem, 7.4vw, 7.65rem);
          line-height: 0.86;
          letter-spacing: -0.085em;
        }

        .fromone-hero-title span {
          color: #ffd43b;
        }

        .fromone-hero-text {
          max-width: 620px;
          margin: 0;
          color: rgba(248, 250, 252, 0.76);
          font-size: clamp(1.04rem, 1.35vw, 1.2rem);
          line-height: 1.72;
        }

        .fromone-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .fromone-proof-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .fromone-proof-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(248, 250, 252, 0.86);
          font-size: 0.88rem;
          font-weight: 900;
        }

        .fromone-proof-pill span {
          color: #ffd43b;
        }

        .fromone-product-card {
          position: relative;
          min-height: 540px;
          padding: clamp(22px, 3vw, 34px);
          border-radius: 42px;
          background:
            radial-gradient(circle at 22% 8%, rgba(255, 212, 59, 0.24), transparent 28%),
            radial-gradient(circle at 82% 18%, rgba(61, 220, 151, 0.14), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.24);
          box-shadow: 0 38px 130px rgba(0, 0, 0, 0.42);
          overflow: hidden;
        }

        .fromone-product-card::before {
          content: '';
          position: absolute;
          inset: 18px;
          border-radius: 34px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }

        .fromone-phone-card {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 14px;
        }

        .fromone-mini-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-mini-toolbar strong {
          color: #ffffff;
        }

        .fromone-mini-toolbar span {
          color: #a7f3d0;
          font-size: 0.82rem;
          font-weight: 950;
        }

        .fromone-media-preview {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 12px;
        }

        .fromone-media-tile {
          min-height: 172px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 212, 59, 0.28), transparent 34%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.82));
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .fromone-media-tile.secondary {
          background:
            radial-gradient(circle at 70% 18%, rgba(61, 220, 151, 0.22), transparent 34%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.72));
        }

        .fromone-media-tile small {
          display: block;
          color: rgba(248, 250, 252, 0.62);
          font-weight: 850;
          line-height: 1.2;
        }

        .fromone-media-tile strong {
          display: block;
          margin-top: 8px;
          color: #ffffff;
          font-size: 1.1rem;
          line-height: 1.15;
          min-height: 2.55em;
        }

        .fromone-sample-post {
          padding: 18px;
          border-radius: 28px;
          background: rgba(2, 6, 23, 0.64);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-sample-post .meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: #ffe58a;
          font-size: 0.8rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .fromone-sample-post p {
          margin: 0;
          color: rgba(248, 250, 252, 0.84);
          line-height: 1.58;
        }

        .fromone-schedule-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .fromone-schedule-chip {
          padding: 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.09);
          text-align: center;
        }

        .fromone-schedule-chip strong {
          display: block;
          color: #ffffff;
          font-size: 0.9rem;
        }

        .fromone-schedule-chip span {
          display: block;
          margin-top: 4px;
          color: rgba(248, 250, 252, 0.62);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .fromone-section {
          padding: clamp(42px, 6vw, 76px) 0;
        }

        .fromone-section-heading {
          max-width: 760px;
          margin: 0 auto 24px;
          text-align: center;
        }

        .fromone-section-heading h2 {
          margin: 10px 0 12px;
          color: #ffffff;
          font-size: clamp(2.3rem, 5vw, 5rem);
          line-height: 0.92;
          letter-spacing: -0.068em;
        }

        .fromone-section-heading p {
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
          font-size: clamp(1rem, 1.2vw, 1.12rem);
        }

        .fromone-workflow-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .fromone-workflow-card,
        .fromone-platform-card {
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
        }

        .fromone-workflow-card {
          min-height: 245px;
          padding: 24px;
        }

        .fromone-workflow-card span {
          display: inline-flex;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #ffd43b;
          color: #101420;
          font-weight: 1000;
          box-shadow: 0 16px 36px rgba(255, 212, 59, 0.18);
        }

        .fromone-workflow-card h3,
        .fromone-platform-card h3 {
          color: #ffffff;
        }

        .fromone-workflow-card h3 {
          margin: 22px 0 10px;
          font-size: 1.45rem;
        }

        .fromone-workflow-card p,
        .fromone-platform-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.7);
          line-height: 1.62;
        }

        .fromone-feature-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: clamp(20px, 4vw, 40px);
          align-items: center;
          padding: clamp(28px, 5vw, 54px);
          border-radius: 42px;
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.14), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.088), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 96px rgba(0, 0, 0, 0.3);
        }

        .fromone-feature-panel h2 {
          margin: 10px 0 14px;
          color: #ffffff;
          font-size: clamp(2.4rem, 5vw, 5.4rem);
          line-height: 0.92;
          letter-spacing: -0.072em;
        }

        .fromone-feature-panel p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-feature-list {
          display: grid;
          gap: 12px;
        }

        .fromone-feature-list div {
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

        .fromone-feature-list span {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-weight: 1000;
        }

        .fromone-platform-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .fromone-platform-card {
          padding: 24px;
          min-height: 210px;
        }

        .fromone-platform-card .label {
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 950;
        }

        .fromone-platform-card h3 {
          margin: 16px 0 9px;
          font-size: 1.7rem;
        }

        .fromone-final-cta {
          position: relative;
          overflow: hidden;
          padding: clamp(34px, 6vw, 70px);
          border-radius: 46px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.27), transparent 34%),
            radial-gradient(circle at 86% 20%, rgba(61, 220, 151, 0.13), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.28);
          box-shadow: 0 38px 130px rgba(0, 0, 0, 0.42);
          text-align: center;
        }

        .fromone-final-cta h2 {
          max-width: 820px;
          margin: 12px auto 16px;
          color: #ffffff;
          font-size: clamp(2.55rem, 5.8vw, 6rem);
          line-height: 0.9;
          letter-spacing: -0.076em;
        }

        .fromone-final-cta p {
          max-width: 660px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-final-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 30px;
        }

        @media (max-width: 920px) {
          .fromone-hero-grid,
          .fromone-feature-panel {
            grid-template-columns: 1fr;
          }

          .fromone-hero-copy {
            max-width: 760px;
            margin: 0 auto;
            text-align: center;
          }

          .fromone-hero-text,
          .fromone-proof-row,
          .fromone-hero-actions {
            justify-content: center;
            margin-left: auto;
            margin-right: auto;
          }

          .fromone-product-card {
            min-height: auto;
          }

          .fromone-workflow-grid,
          .fromone-platform-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .fromone-public-shell {
            width: min(100% - 24px, 520px);
          }

          .fromone-hero-grid {
            padding-top: 42px;
            gap: 28px;
          }

          .fromone-hero-title {
            font-size: clamp(3.05rem, 15vw, 4.25rem);
            line-height: 0.9;
            letter-spacing: -0.078em;
          }

          .fromone-hero-actions,
          .fromone-final-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .fromone-hero-actions a,
          .fromone-final-actions a {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .fromone-proof-row {
            display: grid;
            grid-template-columns: 1fr;
          }

          .fromone-proof-pill {
            justify-content: center;
          }

          .fromone-product-card,
          .fromone-feature-panel,
          .fromone-final-cta {
            border-radius: 30px;
          }

          .fromone-media-preview,
          .fromone-schedule-row {
            grid-template-columns: 1fr;
          }

          .fromone-media-tile {
            min-height: 138px;
          }

          .fromone-workflow-card,
          .fromone-platform-card {
            min-height: auto;
            padding: 20px;
            text-align: left;
          }

          .fromone-section-heading,
          .fromone-feature-panel,
          .fromone-final-cta {
            text-align: center;
          }

          .fromone-feature-list div {
            text-align: left;
          }


        @media (max-width: 640px) {
          .fromone-public-home,
          .fromone-public-home section,
          .fromone-public-shell,
          .fromone-hero-copy,
          .fromone-product-card,
          .fromone-phone-card,
          .fromone-section-heading,
          .fromone-workflow-card,
          .fromone-feature-panel,
          .fromone-platform-card,
          .fromone-final-cta {
            text-align: center !important;
          }

          .fromone-hero-copy,
          .fromone-hero-text,
          .fromone-section-heading,
          .fromone-section-heading p,
          .fromone-feature-panel p,
          .fromone-final-cta p {
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .fromone-hero-kicker,
          .fromone-proof-pill,
          .fromone-workflow-card span,
          .fromone-platform-card .label {
            margin-left: auto !important;
            margin-right: auto !important;
            justify-content: center !important;
          }

          .fromone-media-preview {
            justify-items: center !important;
          }

          .fromone-media-tile {
            width: 100% !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            min-height: 144px !important;
          }

          .fromone-media-tile small,
          .fromone-media-tile strong {
            text-align: center !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .fromone-media-tile strong {
            min-height: auto !important;
            max-width: 260px !important;
          }

          .fromone-mini-toolbar {
            display: grid !important;
            justify-items: center !important;
            text-align: center !important;
          }

          .fromone-sample-post .meta {
            justify-content: center !important;
            flex-wrap: wrap !important;
            text-align: center !important;
          }

          .fromone-sample-post p {
            text-align: center !important;
          }

          .fromone-schedule-chip {
            text-align: center !important;
          }

          .fromone-workflow-card {
            display: grid !important;
            justify-items: center !important;
          }

          .fromone-workflow-card h3,
          .fromone-workflow-card p,
          .fromone-platform-card h3,
          .fromone-platform-card p {
            text-align: center !important;
          }

          .fromone-feature-list div {
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
            padding: 16px !important;
          }

          .fromone-feature-list span {
            margin: 0 auto !important;
          }

          .fromone-platform-card {
            display: grid !important;
            justify-items: center !important;
          }
        }
        }
      `}</style>

      <section className="fromone-hero-stage">
        <PublicNav />

        <div className="fromone-public-shell fromone-hero-grid">
          <div className="fromone-hero-copy">
            <div className="fromone-hero-kicker">For busy small businesses</div>

            <h1 className="fromone-hero-title">
              Turn this week’s media into <span>ready posts.</span>
            </h1>

            <p className="fromone-hero-text">
              Upload photos, videos or flyers. FromOne writes the posts, suggests the times and keeps publishing under your control.
            </p>

            <div className="fromone-hero-actions">
              <Link href="/signin" className="sales-primary-button">
                Start 7-day demo
              </Link>

              <Link href="/tutorial" className="sales-secondary-button">
                Watch the walkthrough
              </Link>
            </div>

            <div className="fromone-proof-row" aria-label="FromOne highlights">
              {heroProof.map((item) => (
                <div key={item} className="fromone-proof-pill">
                  <span aria-hidden="true">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="fromone-product-card" aria-label="FromOne product preview">
            <div className="fromone-phone-card">
              <div className="fromone-mini-toolbar">
                <strong>This week</strong>
                <span>3 posts ready</span>
              </div>

              <div className="fromone-media-preview">
                <div className="fromone-media-tile">
                  <small>Upload 01</small>
                  <strong>New offer flyer</strong>
                </div>

                <div className="fromone-media-tile secondary">
                  <small>Upload 02</small>
                  <strong>Behind-the-scenes clip</strong>
                </div>
              </div>

              <div className="fromone-sample-post">
                <div className="meta">
                  <span>Instagram</span>
                  <span>Thu · 18:45</span>
                </div>
                <p>
                  Fresh content built from the media you already have, with wording shaped around your business, offer and audience.
                </p>
              </div>

              <div className="fromone-schedule-row">
                <div className="fromone-schedule-chip">
                  <strong>Facebook</strong>
                  <span>Autopost</span>
                </div>
                <div className="fromone-schedule-chip">
                  <strong>Instagram</strong>
                  <span>Autopost</span>
                </div>
                <div className="fromone-schedule-chip">
                  <strong>TikTok</strong>
                  <span>Copy/open</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-public-shell">
          <div className="fromone-section-heading">
            <div className="page-eyebrow">How it works</div>
            <h2>A simple weekly rhythm.</h2>
            <p>
              FromOne keeps the workflow focused: upload real media, review the posts, then publish when they are ready.
            </p>
          </div>

          <div className="fromone-workflow-grid">
            {workflow.map((item) => (
              <article key={item.title} className="fromone-workflow-card">
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-public-shell">
          <div className="fromone-feature-panel">
            <div>
              <div className="page-eyebrow">Why it feels different</div>
              <h2>No blank page. No content guesswork.</h2>
              <p>
                FromOne starts with the business’s own media and profile. That means each post has a real topic, a clear audience and a practical next step.
              </p>
            </div>

            <div className="fromone-feature-list">
              {premiumFeatures.map((feature) => (
                <div key={feature}>
                  <span aria-hidden="true">✓</span>
                  <strong>{feature}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-public-shell">
          <div className="fromone-section-heading">
            <div className="page-eyebrow">Publishing</div>
            <h2>Built around real platform rules.</h2>
            <p>
              Clear publishing options without pretending every platform works the same way.
            </p>
          </div>

          <div className="fromone-platform-grid">
            {platformCards.map((platform) => (
              <article key={platform.name} className="fromone-platform-card">
                <span className="label">{platform.label}</span>
                <h3>{platform.name}</h3>
                <p>{platform.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-section" style={{ paddingBottom: 82 }}>
        <div className="fromone-public-shell">
          <div className="fromone-final-cta">
            <div className="page-eyebrow">FromOne Starter</div>
            <h2>Make posting weekly feel manageable.</h2>
            <p>
              Start with the demo, set up the business profile and see how quickly real media becomes a usable weekly posting plan.
            </p>

            <div className="fromone-final-actions">
              <Link href="/signin" className="sales-primary-button">
                Start 7-day demo
              </Link>

              <a href="mailto:info@fromone.co.uk" className="sales-secondary-button">
                Email info@fromone.co.uk
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
