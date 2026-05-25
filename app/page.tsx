import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';

export const metadata: Metadata = {
  title: 'FromOne | Create, Prepare, Schedule and Publish Social Posts',
  description:
    'FromOne scans your business, creates weekly social posts, prepares the media, and helps you publish manually or automatically to Facebook and Instagram.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'FromOne | Create, Prepare, Schedule and Publish Social Posts',
    description:
      'Scan your business, create posts, prepare images, review everything, then schedule or autopublish to Facebook and Instagram with manual fallback.',
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

const proofPoints = [
  'Website + business scanning',
  'Image prep for each platform',
  'Schedule, autopublish or post manually',
];

const workflow = [
  {
    step: '01',
    title: 'Scan or add your business',
    text: 'Start with a website, business details, photos, videos or flyers so the posts are based on real context.',
  },
  {
    step: '02',
    title: 'Create and prepare posts',
    text: 'FromOne writes captions, suggests times, and helps resize or prepare media for each platform before publishing.',
  },
  {
    step: '03',
    title: 'Publish your way',
    text: 'Schedule posts, autopublish to Facebook and Instagram where supported, or use the manual fallback anytime.',
  },
];

const platformCards = [
  {
    name: 'Facebook',
    label: 'Autopublish + schedule',
    text: 'Publish now or schedule to a connected Facebook Page, with manual posting always available.',
  },
  {
    name: 'Instagram',
    label: 'Media-ready publishing',
    text: 'Prepare supported images or videos, then publish now or schedule to a connected professional account.',
  },
  {
    name: 'TikTok',
    label: 'Manual by design',
    text: 'FromOne prepares the wording and media so the user can copy, open TikTok and post manually.',
  },
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
          font-size: clamp(3.1rem, 6vw, 6.25rem);
          line-height: 1.06;
          letter-spacing: -0.035em;
        }

        .fromone-hero-title span {
          color: #ffd43b;
          display: inline-block;
        }

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
          .fromone-hero-title { font-size: clamp(2.35rem, 10.5vw, 3.15rem); line-height: 1.08; letter-spacing: -0.03em; }
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
              Ready-to-publish <span>social posts.</span>
            </h1>

            <p className="fromone-hero-text">
              FromOne scans your business, creates social posts, prepares the media, and helps you schedule, autopublish or post manually from one place.
            </p>

            <div className="fromone-hero-actions">
              <Link href="/signin" className="sales-primary-button">Start 7-day demo</Link>
              <Link href="/tutorial" className="sales-secondary-button">
                See how it works
              </Link>
            </div>

            <div className="fromone-proof-row" aria-label="FromOne highlights">
              {proofPoints.map((item) => (
                <div key={item} className="fromone-proof-pill"><span aria-hidden="true">✓</span>{item}</div>
              ))}
            </div>
          </div>

          <div className="fromone-product-preview" aria-label="FromOne product preview">
            <div className="fromone-product-inner">
              <div className="fromone-preview-toolbar"><strong>This week</strong><span>Posts ready to review</span></div>
              <div className="fromone-media-grid">
                <div className="fromone-media-tile"><small>Scan 01</small><strong>Business website</strong></div>
                <div className="fromone-media-tile secondary"><small>Media 02</small><strong>Photos, flyers or video</strong></div>
              </div>
              <div className="fromone-sample-post"><div className="meta"><span>Instagram</span><span>Thu · 18:45</span></div><p>Fresh content built from your business and media, with wording, prepared images and a clear publish option.</p></div>
              <div className="fromone-schedule-grid">
                <div className="fromone-schedule-chip"><strong>Facebook</strong><span>Schedule</span></div>
                <div className="fromone-schedule-chip"><strong>Instagram</strong><span>Autopublish</span></div>
                <div className="fromone-schedule-chip"><strong>TikTok</strong><span>Manual</span></div>
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
            <p>FromOne keeps the workflow focused: understand the business, create the posts, prepare the media, then publish when ready.</p>
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
            <div><div className="page-eyebrow">Why it feels different</div><h2>No blank page. No messy handover.</h2><p>FromOne starts with the business, website and media. That means each post has a real topic, the image can be prepared, and the publishing path is clear.</p></div>
            <div className="fromone-feature-list">
              {[
                'Website and business scanning for better context',
                'Posts created from real media, not generic prompts',
                'Image preparation, resizing and platform-safe media',
                'Editable schedule, autopublish now and manual fallback',
              ].map((feature) => (<div key={feature}><span aria-hidden="true">✓</span><strong>{feature}</strong></div>))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-section">
        <div className="fromone-shell">
          <div className="fromone-section-heading"><div className="page-eyebrow">Publishing</div><h2>Built around real platform rules.</h2><p>Autopublish where Facebook and Instagram support it, with a simple manual route when a platform or connection needs attention.</p></div>
          <div className="fromone-platform-grid">
            {platformCards.map((platform) => (<article key={platform.name} className="fromone-card fromone-platform-card"><span className="label">{platform.label}</span><h3>{platform.name}</h3><p>{platform.text}</p></article>))}
          </div>
        </div>
      </section>

      <section className="fromone-section" style={{ paddingBottom: 72 }}>
        <div className="fromone-shell">
          <div className="fromone-final-cta">
            <div className="page-eyebrow">FromOne Starter</div><h2>Create, prepare and publish from one place.</h2><p>Start with the demo, add your business or website, and see how quickly FromOne turns real context and media into a usable posting plan.</p>
            <div className="fromone-final-actions"><Link href="/signin" className="sales-primary-button">Start 7-day demo</Link><a href="mailto:info@fromone.co.uk" className="sales-secondary-button">Email info@fromone.co.uk</a></div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
