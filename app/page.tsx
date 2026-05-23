import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

export const metadata: Metadata = {
  title: 'FromOne | Weekly Social Posts From Your Media',
  description:
    'FromOne turns small business photos, videos and flyers into ready-to-review weekly social posts with Facebook and Instagram autoposting.',
  alternates: { canonical: '/' },
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

const proofPoints = ['Photos, videos & flyers', 'Review before publishing', 'Facebook + Instagram autopost'];

const workflow = [
  {
    step: '01',
    title: 'Upload real media',
    text: 'Add this week’s photos, videos or flyers from the work already happening in the business.',
  },
  {
    step: '02',
    title: 'Review ready posts',
    text: 'FromOne writes platform-ready posts, suggests times and keeps everything editable before anything goes live.',
  },
  {
    step: '03',
    title: 'Publish with control',
    text: 'Facebook and Instagram can autopost when connected. TikTok stays copy/open manual.',
  },
];

const platformCards = [
  { name: 'Facebook', label: 'Autopost ready', text: 'Publish to a connected Facebook Page after review.' },
  { name: 'Instagram', label: 'Image/video ready', text: 'Publish to a connected professional account with supported media.' },
  { name: 'TikTok', label: 'Manual by design', text: 'Copy the caption and open TikTok when it is time to post.' },
];

export default function Home() {
  return (
    <main className="sales-page fromone-marketing-page fromone-home-page">
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

        .fromone-hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 4%, rgba(255, 212, 59, 0.17), transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(61, 220, 151, 0.11), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,0.025), transparent 48%);
        }

        .fromone-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(380px, 0.98fr);
          gap: clamp(32px, 5vw, 64px);
          align-items: center;
          padding: clamp(58px, 6vw, 82px) 0 clamp(50px, 6vw, 78px);
        }

        .fromone-hero-title {
          margin: 0 0 22px;
          color: #ffffff;
          font-size: clamp(3.8rem, 7.3vw, 7.55rem);
          line-height: 0.88;
          letter-spacing: -0.085em;
        }

        .fromone-hero-title span { color: #ffd43b; }

        .fromone-hero-text {
          max-width: 620px;
          margin: 0;
          color: rgba(248, 250, 252, 0.78);
          font-size: clamp(1.06rem, 1.35vw, 1.22rem);
          line-height: 1.7;
        }

        .fromone-hero-actions,
        .fromone-proof-row,
        .fromone-final-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .fromone-hero-actions { margin-top: 30px; }
        .fromone-proof-row { margin-top: 24px; gap: 10px; }

        .fromone-proof-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 13px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(248, 250, 252, 0.88);
          font-size: 0.88rem;
          font-weight: 900;
        }

        .fromone-proof-pill span { color: #ffd43b; }

        .fromone-product-preview {
          padding: clamp(22px, 3vw, 32px);
          border-radius: 42px;
          background:
            radial-gradient(circle at 18% 10%, rgba(255, 212, 59, 0.22), transparent 30%),
            radial-gradient(circle at 84% 16%, rgba(61, 220, 151, 0.15), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 212, 59, 0.23);
          box-shadow: 0 38px 120px rgba(0, 0, 0, 0.4);
        }

        .fromone-product-inner { display: grid; gap: 14px; }

        .fromone-preview-toolbar,
        .fromone-media-tile,
        .fromone-sample-post,
        .fromone-schedule-chip {
          text-align: center;
        }

        .fromone-preview-toolbar {
          display: grid;
          justify-items: center;
          gap: 8px;
          padding: 20px 18px;
          border-radius: 26px;
          background: rgba(2, 6, 23, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-preview-toolbar strong { color: #ffffff; font-size: 1.08rem; }
        .fromone-preview-toolbar span { color: #a7f3d0; font-size: 0.9rem; font-weight: 950; }

        .fromone-media-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .fromone-media-tile {
          min-height: 176px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 212, 59, 0.22), transparent 34%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.82));
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 18px;
          display: grid;
          align-content: center;
          justify-items: center;
        }

        .fromone-media-tile.secondary {
          background:
            radial-gradient(circle at 70% 18%, rgba(61, 220, 151, 0.2), transparent 34%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.74));
        }

        .fromone-media-tile small { color: rgba(248, 250, 252, 0.68); font-weight: 900; }
        .fromone-media-tile strong { margin-top: 8px; color: #ffffff; font-size: 1.12rem; line-height: 1.18; }

        .fromone-sample-post,
        .fromone-schedule-chip {
          background: rgba(2, 6, 23, 0.64);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-sample-post { padding: 18px; border-radius: 28px; }
        .fromone-sample-post .meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; color: #ffe58a; font-size: 0.8rem; font-weight: 950; letter-spacing: 0.08em; text-transform: uppercase; }
        .fromone-sample-post p { margin: 0 auto; max-width: 520px; color: rgba(248, 250, 252, 0.84); line-height: 1.58; }

        .fromone-schedule-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .fromone-schedule-chip { padding: 12px; border-radius: 18px; }
        .fromone-schedule-chip strong, .fromone-schedule-chip span { display: block; }
        .fromone-schedule-chip strong { color: #ffffff; font-size: 0.9rem; }
        .fromone-schedule-chip span { margin-top: 4px; color: rgba(248, 250, 252, 0.62); font-size: 0.78rem; font-weight: 800; }

        .fromone-section { padding: clamp(44px, 5vw, 64px) 0; }
        .fromone-section-heading { max-width: 760px; margin: 0 auto 24px; text-align: center; }
        .fromone-section-heading h2 { margin: 10px 0 12px; color: #ffffff; font-size: clamp(2.35rem, 4.7vw, 4.8rem); line-height: 0.94; letter-spacing: -0.068em; }
        .fromone-section-heading p { margin: 0 auto; color: rgba(248, 250, 252, 0.72); line-height: 1.7; font-size: clamp(1rem, 1.2vw, 1.12rem); }

        .fromone-workflow-grid,
        .fromone-platform-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }

        .fromone-card {
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
        }

        .fromone-workflow-card,
        .fromone-platform-card { padding: 24px; min-height: 220px; }
        .fromone-step-number { display: inline-flex; width: 42px; height: 42px; align-items: center; justify-content: center; border-radius: 16px; background: #ffd43b; color: #101420; font-weight: 1000; box-shadow: 0 16px 36px rgba(255, 212, 59, 0.18); }
        .fromone-workflow-card h3, .fromone-platform-card h3 { margin: 20px 0 10px; color: #ffffff; font-size: 1.45rem; }
        .fromone-workflow-card p, .fromone-platform-card p { margin: 0; color: rgba(248, 250, 252, 0.7); line-height: 1.62; }

        .fromone-feature-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
          gap: clamp(20px, 4vw, 40px);
          align-items: center;
          padding: clamp(28px, 5vw, 54px);
          border-radius: 42px;
          background: radial-gradient(circle at top left, rgba(255, 212, 59, 0.14), transparent 32%), linear-gradient(145deg, rgba(255, 255, 255, 0.088), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 96px rgba(0, 0, 0, 0.3);
        }

        .fromone-feature-panel h2 { margin: 10px 0 14px; color: #ffffff; font-size: clamp(2.4rem, 4.7vw, 4.9rem); line-height: 0.94; letter-spacing: -0.072em; }
        .fromone-feature-panel p { margin: 0; color: rgba(248, 250, 252, 0.72); line-height: 1.7; }
        .fromone-feature-list { display: grid; gap: 12px; }
        .fromone-feature-list div { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; align-items: center; padding: 15px 16px; border-radius: 20px; background: rgba(5, 10, 24, 0.42); border: 1px solid rgba(255, 255, 255, 0.09); color: rgba(248, 250, 252, 0.86); font-weight: 850; line-height: 1.42; }
        .fromone-feature-list span { width: 34px; height: 34px; display: inline-grid; place-items: center; border-radius: 13px; background: rgba(255, 212, 59, 0.14); color: #ffd43b; font-weight: 1000; }

        .fromone-platform-card .label { display: inline-flex; padding: 8px 10px; border-radius: 999px; background: rgba(255, 212, 59, 0.1); border: 1px solid rgba(255, 212, 59, 0.2); color: #ffe58a; font-size: 0.78rem; font-weight: 950; }

        .fromone-final-cta {
          padding: clamp(34px, 5vw, 60px);
          border-radius: 46px;
          background: radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.22), transparent 34%), radial-gradient(circle at 86% 20%, rgba(61, 220, 151, 0.11), transparent 30%), linear-gradient(145deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.26);
          box-shadow: 0 34px 110px rgba(0, 0, 0, 0.38);
          text-align: center;
        }
        .fromone-final-cta h2 { max-width: 820px; margin: 12px auto 16px; color: #ffffff; font-size: clamp(2.55rem, 5.4vw, 5.5rem); line-height: 0.92; letter-spacing: -0.076em; }
        .fromone-final-cta p { max-width: 660px; margin: 0 auto; color: rgba(248, 250, 252, 0.72); line-height: 1.7; }
        .fromone-final-actions { justify-content: center; margin-top: 30px; }

        @media (max-width: 920px) {
          .fromone-hero-grid, .fromone-feature-panel, .fromone-workflow-grid, .fromone-platform-grid { grid-template-columns: 1fr; }
          .fromone-hero-copy, .fromone-feature-panel, .fromone-workflow-card, .fromone-platform-card { text-align: center; }
          .fromone-hero-copy, .fromone-hero-text { margin-left: auto; margin-right: auto; }
          .fromone-hero-actions, .fromone-proof-row { justify-content: center; }
          .fromone-feature-list div { grid-template-columns: 1fr; justify-items: center; text-align: center; }
        }

        @media (max-width: 640px) {
          .fromone-marketing-page .public-nav { width: calc(100vw - 32px) !important; padding-top: 18px !important; }
          .fromone-shell { width: min(100% - 24px, 520px); }
          .fromone-hero-grid { padding-top: 54px; padding-bottom: 42px; gap: 32px; }
          .fromone-hero-title { font-size: clamp(2.85rem, 13.4vw, 3.82rem); line-height: 0.94; letter-spacing: -0.074em; }
          .fromone-hero-actions, .fromone-final-actions { display: grid; grid-template-columns: 1fr; width: 100%; }
          .fromone-hero-actions a, .fromone-final-actions a { width: 100%; justify-content: center; text-align: center; }
          .fromone-proof-row { display: grid; grid-template-columns: 1fr; }
          .fromone-product-preview, .fromone-feature-panel, .fromone-final-cta { border-radius: 30px; }
          .fromone-media-grid, .fromone-schedule-grid { grid-template-columns: 1fr; }
          .fromone-media-tile { min-height: 144px; }
          .fromone-section { padding: 42px 0; }
          .fromone-workflow-card, .fromone-platform-card { min-height: auto; padding: 20px; }
        }
      `}</style>

      <section className="fromone-hero">
        <PublicNav />

        <div className="fromone-shell fromone-hero-grid">
          <div className="fromone-hero-copy">
            <h1 className="fromone-hero-title">
              Turn this week’s media into <span>ready posts.</span>
            </h1>

            <p className="fromone-hero-text">
              Upload photos, videos or flyers. FromOne writes the posts, suggests the times and keeps publishing under your control.
            </p>

            <div className="fromone-hero-actions">
              <Link href="/signin" className="sales-primary-button">Start 7-day demo</Link>
              <a href="/download/FromOne-beta-v1.apk" download className="sales-secondary-button">
                Download Android APK
              </a>
            </div>

            <div className="fromone-proof-row" aria-label="FromOne highlights">
              {proofPoints.map((item) => (
                <div key={item} className="fromone-proof-pill"><span aria-hidden="true">✓</span>{item}</div>
              ))}
            </div>
          </div>

          <div className="fromone-product-preview" aria-label="FromOne product preview">
            <div className="fromone-product-inner">
              <div className="fromone-preview-toolbar"><strong>This week</strong><span>3 posts ready</span></div>
              <div className="fromone-media-grid">
                <div className="fromone-media-tile"><small>Upload 01</small><strong>New offer flyer</strong></div>
                <div className="fromone-media-tile secondary"><small>Upload 02</small><strong>Behind-the-scenes clip</strong></div>
              </div>
              <div className="fromone-sample-post"><div className="meta"><span>Instagram</span><span>Thu · 18:45</span></div><p>Fresh content built from the media you already have, with wording shaped around your business, offer and audience.</p></div>
              <div className="fromone-schedule-grid">
                <div className="fromone-schedule-chip"><strong>Facebook</strong><span>Autopost</span></div>
                <div className="fromone-schedule-chip"><strong>Instagram</strong><span>Autopost</span></div>
                <div className="fromone-schedule-chip"><strong>TikTok</strong><span>Copy/open</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-shell">
          <div className="fromone-section-heading">
            <div className="page-eyebrow">How it works</div>
            <h2>A simple weekly rhythm.</h2>
            <p>FromOne keeps the workflow focused: upload real media, review the posts, then publish when they are ready.</p>
          </div>
          <div className="fromone-workflow-grid">
            {workflow.map((item) => (
              <article key={item.title} className="fromone-card fromone-workflow-card"><span className="fromone-step-number">{item.step}</span><h3>{item.title}</h3><p>{item.text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-shell">
          <div className="fromone-feature-panel">
            <div><div className="page-eyebrow">Why it feels different</div><h2>No blank page. No content guesswork.</h2><p>FromOne starts with the business’s own media and profile. That means each post has a real topic, a clear audience and a practical next step.</p></div>
            <div className="fromone-feature-list">
              {['Posts created from real media, not generic prompts','Suggested posting times for the week','Instagram-safe image handling','Edit, improve, rescan and review before publishing'].map((feature) => (<div key={feature}><span aria-hidden="true">✓</span><strong>{feature}</strong></div>))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-shell">
          <div className="fromone-section-heading"><div className="page-eyebrow">Publishing</div><h2>Built around real platform rules.</h2><p>Clear publishing options without pretending every platform works the same way.</p></div>
          <div className="fromone-platform-grid">
            {platformCards.map((platform) => (<article key={platform.name} className="fromone-card fromone-platform-card"><span className="label">{platform.label}</span><h3>{platform.name}</h3><p>{platform.text}</p></article>))}
          </div>
        </div>
      </section>

      <section className="fromone-section" style={{ paddingBottom: 72 }}>
        <div className="fromone-shell">
          <div className="fromone-final-cta">
            <div className="page-eyebrow">FromOne Starter</div><h2>Make posting weekly feel manageable.</h2><p>Start with the demo, set up the Business Profile and see how quickly real media becomes a usable weekly posting plan.</p>
            <div className="fromone-final-actions"><Link href="/signin" className="sales-primary-button">Start 7-day demo</Link><a href="mailto:info@fromone.co.uk" className="sales-secondary-button">Email info@fromone.co.uk</a></div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
