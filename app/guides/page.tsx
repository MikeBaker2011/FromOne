'use client';

import Link from 'next/link';

const videoGuides = [
  {
    step: '01',
    title: 'Getting started',
    duration: '1–2 min',
    description:
      'Sign up, log in, reset your password, and open the FromOne dashboard.',
  },
  {
    step: '02',
    title: 'Add your business or website',
    duration: '1–2 min',
    description:
      'Add business details or scan a website so FromOne understands the brand, services and tone.',
  },
  {
    step: '03',
    title: 'Create your first posts',
    duration: '1–2 min',
    description:
      'Generate a set of social posts from business context, photos, videos or flyers.',
  },
  {
    step: '04',
    title: 'Review a post',
    duration: '1 min',
    description:
      'Check the caption, CTA, hashtags, platform, media and scheduled time before publishing.',
  },
  {
    step: '05',
    title: 'Prepare media',
    duration: '2 min',
    description:
      'Crop, resize, rotate, flip and create a prepared image for Facebook, Instagram, TikTok or stories.',
  },
  {
    step: '06',
    title: 'Edit wording',
    duration: '1 min',
    description:
      'Improve captions, change tone, adjust the audience and make the wording stronger.',
  },
  {
    step: '07',
    title: 'Schedule a post',
    duration: '1 min',
    description:
      'Set or edit the scheduled publish time directly from the post review page.',
  },
  {
    step: '08',
    title: 'Publish options',
    duration: '2 min',
    description:
      'Use Autopublish now, scheduled autopublish, post manually, or share/download prepared media.',
  },
  {
    step: '09',
    title: 'Connect Facebook and Instagram',
    duration: '2 min',
    description:
      'Connect or reconnect Meta, understand connection errors, and keep manual fallback available.',
  },
  {
    step: '10',
    title: 'Account, subscription and support',
    duration: '1 min',
    description:
      'Check settings, subscription access, sign out, and find support when something needs attention.',
  },
];

export default function GuidesPage() {
  return (
    <main className="guides-page">
      <style>{`
        .guides-page {
          min-height: 100vh;
          width: 100%;
          padding: clamp(20px, 3vw, 32px);
          color: #ffffff;
        }

        .guides-shell {
          width: 100%;
          max-width: 1480px;
          margin: 0 auto;
        }

        .guides-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: end;
          margin-bottom: 22px;
          padding: clamp(22px, 4vw, 34px);
          border-radius: 32px;
          background:
            radial-gradient(circle at 12% 16%, rgba(255, 212, 59, 0.18), transparent 32%),
            linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035));
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.26);
        }

        .guides-eyebrow {
          margin: 0 0 10px;
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .guides-hero h1 {
          margin: 0;
          font-size: clamp(2.2rem, 5vw, 4.8rem);
          line-height: 1.02;
          letter-spacing: -0.045em;
        }

        .guides-hero p {
          max-width: 720px;
          margin: 14px 0 0;
          color: rgba(248,250,252,0.72);
          font-size: 1.03rem;
          line-height: 1.7;
        }

        .guides-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .guides-button {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.075);
          color: #ffffff;
          font-weight: 900;
          text-decoration: none;
        }

        .guides-button.primary {
          background: #ffd43b;
          color: #101420;
          border-color: rgba(255,212,59,0.48);
          box-shadow: 0 16px 42px rgba(255, 212, 59, 0.16);
        }

        .guides-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .guide-card {
          display: grid;
          grid-template-rows: 184px 1fr;
          gap: 16px;
          min-height: 520px;
          padding: 16px;
          border-radius: 28px;
          background: linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.035));
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 18px 55px rgba(0,0,0,0.2);
        }

        .guide-placeholder {
          position: relative;
          display: grid;
          place-items: center;
          height: 184px;
          min-height: 184px;
          border-radius: 22px;
          overflow: hidden;
          background:
            radial-gradient(circle at 30% 16%, rgba(255, 212, 59, 0.2), transparent 35%),
            radial-gradient(circle at 78% 12%, rgba(61, 220, 151, 0.12), transparent 35%),
            rgba(2, 6, 23, 0.66);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .guide-play {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #ffd43b;
          color: #101420;
          font-size: 1.35rem;
          font-weight: 1000;
          box-shadow: 0 18px 44px rgba(255, 212, 59, 0.22);
        }

        .guide-coming-soon {
          position: absolute;
          left: 12px;
          bottom: 12px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(2, 6, 23, 0.78);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.84);
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .guide-content {
          display: grid;
          grid-template-rows: 46px auto 1fr 42px;
          gap: 12px;
          min-width: 0;
          height: 100%;
        }

        .guide-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 46px;
        }

        .guide-step {
          display: inline-flex;
          width: 46px;
          height: 46px;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #ffd43b;
          color: #101420;
          font-weight: 1000;
          box-shadow: 0 14px 30px rgba(255, 212, 59, 0.16);
        }

        .guide-duration {
          color: rgba(248,250,252,0.62);
          font-size: 0.82rem;
          font-weight: 900;
        }

        .guide-card h2 {
          margin: 0;
          min-height: 56px;
          font-size: 1.35rem;
          line-height: 1.16;
        }

        .guide-card p {
          margin: 0;
          color: rgba(248,250,252,0.7);
          line-height: 1.58;
        }

        .guide-card button {
          align-self: end;
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.84);
          font-weight: 950;
          cursor: not-allowed;
        }

        .guides-note {
          margin-top: 18px;
          padding: 16px 18px;
          border-radius: 22px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(248,250,252,0.72);
          line-height: 1.6;
        }

        @media (max-width: 1280px) {
          .guides-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .guides-hero {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .guides-actions {
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .guides-page {
            padding: 18px 12px 32px;
          }

          .guides-hero {
            border-radius: 26px;
          }

          .guides-grid {
            grid-template-columns: 1fr;
          }

          .guide-card {
            grid-template-columns: 1fr;
            grid-template-rows: 170px 1fr;
            min-height: auto;
            border-radius: 24px;
          }

          .guide-placeholder {
            height: 170px;
            min-height: 170px;
          }

          .guide-content {
            grid-template-rows: 46px auto auto 42px;
          }

          .guide-card h2 {
            min-height: auto;
          }
        }
      `}</style>

      <div className="guides-shell">
        <section className="guides-hero">
          <div>
            <p className="guides-eyebrow">Video Guides</p>
            <h1>Learn FromOne step by step.</h1>
            <p>
              Short Canva-friendly walkthroughs for every key part of FromOne. Add the video embeds later, then each card becomes a quick self-serve guide for beta users.
            </p>
          </div>

          <div className="guides-actions">
            <Link href="/tutorial" className="guides-button">
              Tutorial page
            </Link>
            <Link href="/dashboard" className="guides-button primary">
              Back to dashboard
            </Link>
          </div>
        </section>

        <section className="guides-grid" aria-label="FromOne video guide list">
          {videoGuides.map((guide) => (
            <article key={guide.step} className="guide-card">
              <div className="guide-placeholder">
                <span className="guide-play" aria-hidden="true">▶</span>
                <span className="guide-coming-soon">Video coming soon</span>
              </div>

              <div className="guide-content">
                <div className="guide-topline">
                  <span className="guide-step">{guide.step}</span>
                  <span className="guide-duration">{guide.duration}</span>
                </div>

                <h2>{guide.title}</h2>
                <p>{guide.description}</p>

                <button type="button" disabled>
                  Watch guide soon
                </button>
              </div>
            </article>
          ))}
        </section>

        <div className="guides-note">
          Record each guide in Canva as a short screen walkthrough with voiceover. Once each video is ready, replace the placeholder with a YouTube, Vimeo, Canva or hosted video embed.
        </div>
      </div>
    </main>
  );
}
