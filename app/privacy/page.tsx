import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | FromOne',
  description: 'How FromOne collects, uses, stores and protects data when you use the service.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | FromOne',
    description: 'How FromOne handles account data, business profiles, uploaded media and connected publishing data.',
    url: '/privacy',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FromOne privacy policy',
      },
    ],
  },
};

const privacySummary = [
  {
    label: 'Account',
    title: 'Your workspace data',
    text: 'We use your account, Business Profile and saved posts to run FromOne and keep your workspace available.',
  },
  {
    label: 'Media',
    title: 'Photos, videos and flyers',
    text: 'Uploaded media is used to create, improve, schedule and publish posts for the connected business.',
  },
  {
    label: 'Publishing',
    title: 'Connected platforms',
    text: 'Meta, Facebook and Instagram connection details are used only for the publishing features you choose to use.',
  },
];

const privacySections = [
  {
    title: '1. Who we are',
    body: [
      'FromOne is a social media content workflow platform for small businesses. It helps users create weekly social media posts from a Business Profile, uploaded media, website information, and user-provided business details.',
      'For privacy questions, contact us at info@fromone.co.uk.',
    ],
  },
  {
    title: '2. What information we collect',
    body: [
      'We may collect and store account information, such as your email address and user ID.',
      'We may collect business profile information, such as business name, website URL, industry, location, services, audience, tone of voice, offers, brand colours, and logo URL.',
      'We may store uploaded media, including photos, videos, flyers, offer graphics, menus, product images, event clips, or other files you add to create posts.',
      'We may store generated content, including captions, hashtags, CTAs, image ideas, campaign plans, scheduled post times, post status, and publishing history.',
      'We may store social publishing connection details, such as connected Meta, Facebook Page, or Instagram Business account references needed to publish posts.',
      'We may store support requests, feedback, reviews, billing status, subscription references, upload usage, saved weekly sets, media rescans, and product activity needed to operate the service.',
    ],
  },
  {
    title: '3. How we use your information',
    body: [
      'We use your information to create and manage your FromOne account.',
      'We use your Business Profile and uploaded media to generate weekly social media posts.',
      'We save weekly sets, posts, uploaded media, scheduled times, and publishing progress.',
      'We publish or schedule Facebook and Instagram posts when you connect those accounts and choose to use publishing features.',
      'We use information to provide support, manage trials or subscriptions, improve FromOne, and keep the service secure.',
    ],
  },
  {
    title: '4. Website scans and uploaded media',
    body: [
      'If you enter a website URL, FromOne may scan publicly available content from that website to understand the business, services, audience, tone, offers, and brand details.',
      'If you upload photos, videos, flyers, or other files, FromOne may use that media to create, rewrite, improve, schedule, or publish social media posts for the connected business.',
    ],
  },
  {
    title: '5. Social account connections',
    body: [
      'If you connect Meta, Facebook, or Instagram, FromOne stores the connection details needed to publish posts on your behalf.',
      'These details are used only to provide the publishing features you choose to use.',
    ],
  },
  {
    title: '6. Legal basis for processing',
    body: [
      'We process personal data where it is necessary to provide the service, manage your account, respond to support requests, comply with legal obligations, or where we have a legitimate interest in improving and securing FromOne.',
    ],
  },
  {
    title: '7. Who we share data with',
    body: [
      'We only share data with service providers needed to operate FromOne. This may include Supabase for authentication, database storage and file storage.',
      'It may also include AI/content generation providers used to create, improve, or rewrite posts; Meta, Facebook and Instagram when you connect accounts and publish posts; payment providers once subscription billing is connected; and hosting, analytics, security or support tools if added to the service.',
      'We do not sell your personal data.',
    ],
  },
  {
    title: '8. How long we keep data',
    body: [
      'We keep account, business profile, campaign, uploaded media, and post data while your account is active or while it is needed to provide the service.',
      'Support requests and billing records may be kept for longer where needed for business, legal, tax, or security reasons.',
    ],
  },
  {
    title: '9. Your rights',
    body: [
      'Depending on your location and applicable law, you may have rights to access, correct, delete, restrict, object to, or request a copy of your personal data.',
      'To make a request, contact info@fromone.co.uk.',
    ],
  },
  {
    title: '10. Security',
    body: [
      'We take reasonable steps to protect your data, including using trusted service providers, authentication, access controls, and secure storage.',
      'No online service can guarantee complete security.',
    ],
  },
  {
    title: '11. International transfers',
    body: [
      'Some service providers may process data outside the UK or European Economic Area. If this happens, we rely on appropriate safeguards provided by those service providers.',
    ],
  },
  {
    title: '12. Children',
    body: [
      'FromOne is not intended for children. You should not use FromOne if you are under 18.',
    ],
  },
  {
    title: '13. Changes to this policy',
    body: [
      'We may update this Privacy Policy as FromOne changes. The latest version will always be available on this page.',
    ],
  },
];

const renderParagraph = (paragraph: string) => {
  const email = 'info@fromone.co.uk';

  if (!paragraph.includes(email)) return paragraph;

  const [before, after] = paragraph.split(email);

  return (
    <>
      {before}
      <a href={`mailto:${email}`} className="fromone-privacy-link">
        {email}
      </a>
      {after}
    </>
  );
};

export default function PrivacyPage() {
  return (
    <main className="sales-page fromone-public-home fromone-privacy-page">
      <style>{`
        .fromone-privacy-page {
          overflow: hidden;
        }

        .fromone-privacy-shell {
          width: min(1160px, calc(100vw - 32px));
          margin: 0 auto;
        }

        .fromone-privacy-hero {
          position: relative;
          overflow: hidden;
          padding-bottom: clamp(34px, 5vw, 62px);
        }

        .fromone-privacy-hero::before {
          content: '';
          position: absolute;
          inset: -220px -140px auto;
          height: 700px;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 212, 59, 0.18), transparent 32%),
            radial-gradient(circle at 72% 28%, rgba(61, 220, 151, 0.1), transparent 28%),
            radial-gradient(circle at 24% 24%, rgba(255, 255, 255, 0.075), transparent 30%);
          filter: blur(4px);
          pointer-events: none;
        }

        .fromone-privacy-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
          gap: clamp(26px, 5vw, 56px);
          align-items: center;
          padding: clamp(44px, 6vw, 78px) 0 clamp(18px, 3vw, 30px);
        }

        .fromone-privacy-copy {
          max-width: 720px;
        }

        .fromone-privacy-title {
          margin: 0 0 20px;
          max-width: 760px;
          color: #ffffff;
          font-size: clamp(3.2rem, 7vw, 7.2rem);
          line-height: 0.86;
          letter-spacing: -0.085em;
        }

        .fromone-privacy-title span {
          color: #ffd43b;
        }

        .fromone-privacy-text {
          max-width: 640px;
          margin: 0;
          color: rgba(248, 250, 252, 0.76);
          font-size: clamp(1.04rem, 1.35vw, 1.2rem);
          line-height: 1.72;
        }

        .fromone-privacy-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .fromone-privacy-proof-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .fromone-privacy-proof-pill {
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

        .fromone-privacy-proof-pill span {
          color: #ffd43b;
        }

        .fromone-privacy-card {
          position: relative;
          padding: clamp(22px, 3vw, 34px);
          border-radius: 42px;
          background:
            radial-gradient(circle at 22% 8%, rgba(255, 212, 59, 0.2), transparent 28%),
            radial-gradient(circle at 82% 18%, rgba(61, 220, 151, 0.12), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.24);
          box-shadow: 0 38px 130px rgba(0, 0, 0, 0.42);
          overflow: hidden;
        }

        .fromone-privacy-card::before {
          content: '';
          position: absolute;
          inset: 18px;
          border-radius: 34px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }

        .fromone-privacy-card-inner {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 14px;
        }

        .fromone-privacy-mini-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-privacy-mini-toolbar strong {
          color: #ffffff;
        }

        .fromone-privacy-mini-toolbar span {
          color: #a7f3d0;
          font-size: 0.82rem;
          font-weight: 950;
        }

        .fromone-privacy-summary-grid {
          display: grid;
          gap: 12px;
        }

        .fromone-privacy-summary-card {
          padding: 18px;
          border-radius: 26px;
          background: rgba(2, 6, 23, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-privacy-summary-card small {
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .fromone-privacy-summary-card strong {
          display: block;
          margin: 8px 0 8px;
          color: #ffffff;
          font-size: 1.08rem;
        }

        .fromone-privacy-summary-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.55;
        }

        .fromone-privacy-section {
          padding: clamp(34px, 5vw, 62px) 0;
        }

        .fromone-privacy-section-heading {
          max-width: 760px;
          margin: 0 auto 24px;
          text-align: center;
        }

        .fromone-privacy-section-heading h2 {
          margin: 10px 0 12px;
          color: #ffffff;
          font-size: clamp(2.25rem, 4.6vw, 4.7rem);
          line-height: 0.92;
          letter-spacing: -0.068em;
        }

        .fromone-privacy-section-heading p {
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
          font-size: clamp(1rem, 1.2vw, 1.12rem);
        }

        .fromone-privacy-overview-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
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

        .fromone-privacy-overview-panel h2 {
          margin: 10px 0 14px;
          color: #ffffff;
          font-size: clamp(2.35rem, 4.8vw, 5.1rem);
          line-height: 0.92;
          letter-spacing: -0.072em;
        }

        .fromone-privacy-overview-panel p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-privacy-overview-list {
          display: grid;
          gap: 12px;
        }

        .fromone-privacy-overview-list div {
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

        .fromone-privacy-overview-list span {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-weight: 1000;
        }

        .fromone-policy-card {
          border-radius: 38px;
          padding: clamp(20px, 3vw, 30px);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 28%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.28);
        }

        .fromone-policy-grid {
          display: grid;
          gap: 12px;
        }

        .fromone-policy-section {
          padding: clamp(18px, 2.3vw, 24px);
          border-radius: 24px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .fromone-policy-section h3 {
          margin: 0 0 10px;
          color: #ffffff;
          font-size: clamp(1.18rem, 2vw, 1.45rem);
          letter-spacing: -0.04em;
        }

        .fromone-policy-section p {
          margin: 0 0 10px;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.68;
          font-size: 0.96rem;
        }

        .fromone-policy-section p:last-child {
          margin-bottom: 0;
        }

        .fromone-privacy-link {
          color: #ffd43b;
          font-weight: 950;
        }

        .fromone-privacy-final-cta {
          position: relative;
          overflow: hidden;
          padding: clamp(30px, 5vw, 56px);
          border-radius: 42px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.22), transparent 34%),
            radial-gradient(circle at 86% 20%, rgba(61, 220, 151, 0.11), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.24);
          box-shadow: 0 34px 118px rgba(0, 0, 0, 0.36);
          text-align: center;
        }

        .fromone-privacy-final-cta h2 {
          max-width: 760px;
          margin: 12px auto 16px;
          color: #ffffff;
          font-size: clamp(2.35rem, 5vw, 5.2rem);
          line-height: 0.92;
          letter-spacing: -0.074em;
        }

        .fromone-privacy-final-cta p {
          max-width: 650px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-privacy-final-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 28px;
        }

        @media (max-width: 920px) {
          .fromone-privacy-hero-grid,
          .fromone-privacy-overview-panel {
            grid-template-columns: 1fr;
          }

          .fromone-privacy-copy {
            max-width: 760px;
            margin: 0 auto;
            text-align: center;
          }

          .fromone-privacy-text,
          .fromone-privacy-proof-row,
          .fromone-privacy-actions {
            justify-content: center;
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (max-width: 640px) {
          .fromone-privacy-shell {
            width: min(100% - 24px, 520px);
          }

          .fromone-privacy-hero-grid {
            padding-top: 54px;
            gap: 28px;
          }

          .fromone-privacy-title {
            font-size: clamp(3rem, 14vw, 4.1rem);
            line-height: 0.91;
            letter-spacing: -0.078em;
          }

          .fromone-privacy-actions,
          .fromone-privacy-final-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .fromone-privacy-actions a,
          .fromone-privacy-final-actions a {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .fromone-privacy-proof-row {
            display: grid;
            grid-template-columns: 1fr;
          }

          .fromone-privacy-proof-pill {
            justify-content: center;
          }

          .fromone-privacy-card,
          .fromone-privacy-overview-panel,
          .fromone-policy-card,
          .fromone-privacy-final-cta {
            border-radius: 30px;
          }

          .fromone-privacy-page,
          .fromone-privacy-page section,
          .fromone-privacy-shell,
          .fromone-privacy-card,
          .fromone-privacy-card-inner,
          .fromone-privacy-section-heading,
          .fromone-privacy-overview-panel,
          .fromone-policy-section,
          .fromone-privacy-final-cta {
            text-align: center !important;
          }

          .fromone-privacy-mini-toolbar {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            gap: 8px !important;
            padding: 20px 16px !important;
          }

          .fromone-privacy-summary-card {
            text-align: center !important;
          }

          .fromone-privacy-overview-list div {
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
            padding: 16px !important;
          }

          .fromone-privacy-overview-list span {
            margin: 0 auto !important;
          }
        }
      `}</style>

      <section className="fromone-privacy-hero">
        <PublicNav />

        <div className="fromone-privacy-shell fromone-privacy-hero-grid">
          <div className="fromone-privacy-copy">
            <h1 className="fromone-privacy-title">
              Privacy, explained <span>clearly.</span>
            </h1>

            <p className="fromone-privacy-text">
              This policy explains how FromOne uses account data, Business Profiles, uploaded media and connected publishing details to run the service.
            </p>

            <div className="fromone-privacy-actions">
              <Link href="/signin" className="sales-primary-button">
                Back to FromOne
              </Link>

              <a href="mailto:info@fromone.co.uk" className="sales-secondary-button">
                Email privacy questions
              </a>
            </div>

            <div className="fromone-privacy-proof-row" aria-label="Privacy highlights">
              <div className="fromone-privacy-proof-pill">
                <span aria-hidden="true">✓</span>
                We do not sell your data
              </div>
              <div className="fromone-privacy-proof-pill">
                <span aria-hidden="true">✓</span>
                Used to run your workspace
              </div>
              <div className="fromone-privacy-proof-pill">
                <span aria-hidden="true">✓</span>
                Contact: info@fromone.co.uk
              </div>
            </div>
          </div>

          <div className="fromone-privacy-card" aria-label="Privacy summary">
            <div className="fromone-privacy-card-inner">
              <div className="fromone-privacy-mini-toolbar">
                <strong>Privacy Policy</strong>
                <span>Last updated · 13 May 2026</span>
              </div>

              <div className="fromone-privacy-summary-grid">
                {privacySummary.map((item) => (
                  <article key={item.title} className="fromone-privacy-summary-card">
                    <small>{item.label}</small>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-privacy-section">
        <div className="fromone-privacy-shell">
          <div className="fromone-privacy-overview-panel">
            <div>
              <div className="page-eyebrow">Overview</div>
              <h2>Your data powers your FromOne workspace.</h2>
              <p>
                FromOne uses your information to create posts, manage weekly sets, store uploaded media and publish to connected channels when you choose to use those features.
              </p>
            </div>

            <div className="fromone-privacy-overview-list">
              <div>
                <span aria-hidden="true">✓</span>
                <strong>Business details help FromOne write more relevant posts.</strong>
              </div>
              <div>
                <span aria-hidden="true">✓</span>
                <strong>Uploaded media is used to create, rewrite and schedule content.</strong>
              </div>
              <div>
                <span aria-hidden="true">✓</span>
                <strong>Connected publishing data is used only for publishing features.</strong>
              </div>
              <div>
                <span aria-hidden="true">✓</span>
                <strong>You can contact us to ask about access, correction or deletion.</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-privacy-section">
        <div className="fromone-privacy-shell">
          <div className="fromone-privacy-section-heading">
            <div className="page-eyebrow">Full policy</div>
            <h2>The details.</h2>
            <p>
              The full Privacy Policy is below, keeping the legal wording intact while making it easier to read.
            </p>
          </div>

          <div className="fromone-policy-card">
            <div className="fromone-policy-grid">
              {privacySections.map((section) => (
                <article key={section.title} className="fromone-policy-section">
                  <h3>{section.title}</h3>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{renderParagraph(paragraph)}</p>
                  ))}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-privacy-section" style={{ paddingBottom: 82 }}>
        <div className="fromone-privacy-shell">
          <div className="fromone-privacy-final-cta">
            <div className="page-eyebrow">Related pages</div>
            <h2>Privacy, cookies and terms in one place.</h2>
            <p>
              Review the supporting policies below, or return to FromOne when you are ready.
            </p>

            <div className="fromone-privacy-final-actions">
              <Link href="/cookies" className="sales-secondary-button">
                Cookie Policy
              </Link>
              <Link href="/terms" className="sales-secondary-button">
                Terms of Service
              </Link>
              <Link href="/signin" className="sales-primary-button">
                Back to FromOne
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
