import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | FromOne',
  description: 'Read how FromOne collects, uses, stores, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

const privacySections = [
  {
    title: 'Who we are',
    body: [
      'FromOne is a social media content workflow platform for small businesses. It helps users create weekly social media posts from a Business Profile, uploaded media, website information, and user-provided business details.',
      'For privacy questions, contact us at info@fromone.co.uk.',
    ],
  },
  {
    title: 'What information we collect',
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
    title: 'How we use your information',
    body: [
      'We use your information to create and manage your FromOne account.',
      'We use your Business Profile and uploaded media to generate weekly social media posts.',
      'We save weekly sets, posts, uploaded media, scheduled times, and publishing progress.',
      'We publish or schedule Facebook and Instagram posts when you connect those accounts and choose to use publishing features.',
      'We use information to provide support, manage trials or subscriptions, improve FromOne, and keep the service secure.',
    ],
  },
  {
    title: 'Website scans and uploaded media',
    body: [
      'If you enter a website URL, FromOne may scan publicly available content from that website to understand the business, services, audience, tone, offers, and brand details.',
      'If you upload photos, videos, flyers, or other files, FromOne may use that media to create, rewrite, improve, schedule, or publish social media posts for the connected business.',
    ],
  },
  {
    title: 'Social account connections',
    body: [
      'If you connect Meta, Facebook, or Instagram, FromOne stores the connection details needed to publish posts on your behalf.',
      'These details are used only to provide the publishing features you choose to use.',
    ],
  },
  {
    title: 'Legal basis for processing',
    body: [
      'We process personal data where it is necessary to provide the service, manage your account, respond to support requests, comply with legal obligations, or where we have a legitimate interest in improving and securing FromOne.',
    ],
  },
  {
    title: 'Who we share data with',
    body: [
      'We only share data with service providers needed to operate FromOne. This may include Supabase for authentication, database storage and file storage.',
      'It may also include AI/content generation providers used to create, improve, or rewrite posts; Meta, Facebook and Instagram when you connect accounts and publish posts; payment providers once subscription billing is connected; and hosting, analytics, security or support tools if added to the service.',
      'We do not sell your personal data.',
    ],
  },
  {
    title: 'How long we keep data',
    body: [
      'We keep account, business profile, campaign, uploaded media, and post data while your account is active or while it is needed to provide the service.',
      'Support requests and billing records may be kept for longer where needed for business, legal, tax, or security reasons.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'Depending on your location and applicable law, you may have rights to access, correct, delete, restrict, object to, or request a copy of your personal data.',
      'To make a request, contact info@fromone.co.uk.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We take reasonable steps to protect your data, including using trusted service providers, authentication, access controls, and secure storage.',
      'No online service can guarantee complete security.',
    ],
  },
  {
    title: 'International transfers',
    body: [
      'Some service providers may process data outside the UK or European Economic Area. If this happens, we rely on appropriate safeguards provided by those service providers.',
    ],
  },
  {
    title: 'Children',
    body: [
      'FromOne is not intended for children. You should not use FromOne if you are under 18.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy as FromOne changes. The latest version will always be available on this page.',
    ],
  },
];

const privacyPrinciples = [
  {
    title: 'Used for your workspace',
    text: 'Your data helps FromOne create posts, save weekly sets, manage media and support publishing features.',
  },
  {
    title: 'Publishing stays controlled',
    text: 'Facebook and Instagram publishing only uses connected accounts when you choose to publish or schedule.',
  },
  {
    title: 'No data selling',
    text: 'FromOne does not sell your personal data. Data is shared only with services needed to run the product.',
  },
];

const dataJourney = [
  'Account created',
  'Business Profile saved',
  'Media uploaded',
  'Posts generated',
  'Review and publish',
];

const renderParagraph = (paragraph: string) => {
  if (!paragraph.includes('info@fromone.co.uk')) return paragraph;

  const parts = paragraph.split('info@fromone.co.uk');

  return (
    <>
      {parts[0]}
      <a href="mailto:info@fromone.co.uk">info@fromone.co.uk</a>
      {parts[1] || ''}
    </>
  );
};

export default function PrivacyPage() {
  return (
    <main className="sales-page fromone-public-home fromone-legal-page fromone-privacy-page">
      <style>{`
        .fromone-legal-page {
          overflow: hidden;
        }

        .fromone-legal-stage {
          position: relative;
          overflow: hidden;
          padding-bottom: clamp(34px, 5vw, 64px);
        }

        .fromone-legal-stage::before {
          content: '';
          position: absolute;
          inset: -230px -160px auto;
          height: 720px;
          background:
            radial-gradient(circle at 50% 20%, rgba(255, 212, 59, 0.2), transparent 32%),
            radial-gradient(circle at 74% 26%, rgba(61, 220, 151, 0.11), transparent 30%),
            radial-gradient(circle at 20% 26%, rgba(255, 255, 255, 0.08), transparent 28%);
          pointer-events: none;
        }

        .fromone-legal-shell {
          width: min(1160px, calc(100vw - 32px));
          margin: 0 auto;
        }


        .fromone-legal-simple-nav {
          width: min(1160px, calc(100vw - 32px));
          margin: 0 auto;
          padding: 24px 0 0;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .fromone-legal-home-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          color: #101420;
          background: #ffd43b;
          border: 1px solid rgba(255, 212, 59, 0.34);
          font-weight: 1000;
          text-decoration: none;
          box-shadow: 0 16px 36px rgba(255, 212, 59, 0.18);
        }

        .fromone-legal-mini-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #ffffff;
          font-weight: 1000;
          letter-spacing: -0.045em;
          text-decoration: none;
        }

        .fromone-legal-mini-brand img {
          width: 56px;
          height: 56px;
          object-fit: contain;
          border-radius: 18px;
        }

        .fromone-legal-page .sales-nav.public-nav {
          width: min(1160px, calc(100vw - 32px)) !important;
          margin: 0 auto !important;
          padding: 24px 0 0 !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .fromone-legal-page .public-nav-inner {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
        }

        .fromone-legal-hero {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, 0.72fr);
          gap: clamp(24px, 5vw, 54px);
          align-items: center;
          padding: clamp(54px, 7vw, 88px) 0 clamp(18px, 3vw, 34px);
        }

        .fromone-legal-hero-copy {
          max-width: 760px;
        }

        .fromone-legal-kicker {
          display: inline-flex;
          align-items: center;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.105);
          border: 1px solid rgba(255, 212, 59, 0.24);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fromone-legal-title {
          margin: 20px 0 18px;
          color: #ffffff;
          font-size: clamp(3.15rem, 7vw, 7rem);
          line-height: 0.88;
          letter-spacing: -0.08em;
        }

        .fromone-legal-title span {
          color: #ffd43b;
        }

        .fromone-legal-intro {
          max-width: 650px;
          margin: 0;
          color: rgba(248, 250, 252, 0.76);
          font-size: clamp(1.02rem, 1.32vw, 1.18rem);
          line-height: 1.72;
        }

        .fromone-legal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .fromone-privacy-panel {
          position: relative;
          padding: clamp(22px, 3vw, 34px);
          border-radius: 40px;
          background:
            radial-gradient(circle at 18% 8%, rgba(255, 212, 59, 0.2), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.22);
          box-shadow: 0 34px 110px rgba(0, 0, 0, 0.38);
        }

        .fromone-privacy-panel-card {
          display: grid;
          gap: 14px;
          padding: 18px;
          border-radius: 28px;
          background: rgba(2, 6, 23, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-privacy-panel-card strong {
          color: #ffffff;
          font-size: 1.25rem;
        }

        .fromone-privacy-panel-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.6;
        }

        .fromone-data-journey {
          display: grid;
          gap: 10px;
        }

        .fromone-data-journey span {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(248, 250, 252, 0.84);
          font-weight: 850;
        }

        .fromone-data-journey span::after {
          content: '✓';
          color: #a7f3d0;
          font-weight: 1000;
        }

        .fromone-legal-section {
          padding: clamp(34px, 5vw, 58px) 0;
        }

        .fromone-principles-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .fromone-principle-card,
        .fromone-policy-card {
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
        }

        .fromone-principle-card {
          padding: 24px;
          min-height: 180px;
        }

        .fromone-principle-card span {
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

        .fromone-principle-card h2 {
          margin: 22px 0 10px;
          color: #ffffff;
          font-size: 1.35rem;
        }

        .fromone-principle-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.7);
          line-height: 1.62;
        }

        .fromone-policy-layout {
          display: grid;
          grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .fromone-policy-index {
          position: sticky;
          top: 22px;
          padding: 18px;
          border-radius: 28px;
          background: rgba(5, 10, 24, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-policy-index .page-eyebrow {
          margin-bottom: 12px;
        }

        .fromone-policy-index a {
          display: block;
          padding: 10px 0;
          color: rgba(248, 250, 252, 0.74);
          font-size: 0.92rem;
          font-weight: 850;
          border-top: 1px solid rgba(255, 255, 255, 0.075);
        }

        .fromone-policy-index a:hover {
          color: #ffd43b;
        }

        .fromone-policy-list {
          display: grid;
          gap: 12px;
        }

        .fromone-policy-card {
          padding: clamp(18px, 2.4vw, 24px);
          scroll-margin-top: 28px;
        }

        .fromone-policy-card h2 {
          margin: 0 0 12px;
          color: #ffffff;
          font-size: clamp(1.24rem, 2vw, 1.65rem);
          letter-spacing: -0.04em;
        }

        .fromone-policy-card p {
          margin: 0 0 10px;
          color: rgba(248, 250, 252, 0.74);
          line-height: 1.72;
        }

        .fromone-policy-card p:last-child {
          margin-bottom: 0;
        }

        .fromone-policy-card a {
          color: #ffd43b;
          font-weight: 950;
        }

        .fromone-legal-footer-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          margin-top: 26px;
        }

        @media (max-width: 920px) {
          .fromone-legal-hero,
          .fromone-policy-layout {
            grid-template-columns: 1fr;
          }

          .fromone-legal-hero-copy {
            margin: 0 auto;
            text-align: center;
          }

          .fromone-legal-intro,
          .fromone-legal-actions {
            margin-left: auto;
            margin-right: auto;
            justify-content: center;
          }

          .fromone-policy-index {
            position: relative;
            top: auto;
          }

          .fromone-policy-index nav {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0 12px;
          }

          .fromone-principles-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .fromone-legal-shell {
            width: min(100% - 24px, 520px);
          }

          .fromone-legal-simple-nav {
            width: min(100% - 32px, 520px);
            padding-top: 18px;
          }

          .fromone-legal-mini-brand img {
            width: 52px;
            height: 52px;
          }

          .fromone-legal-home-link {
            min-height: 46px;
            padding: 0 16px;
          }

          .fromone-legal-hero {
            padding-top: 48px;
            gap: 26px;
          }

          .fromone-legal-title {
            font-size: clamp(3rem, 14vw, 4.15rem);
            line-height: 0.9;
          }

          .fromone-legal-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .fromone-legal-actions a,
          .fromone-legal-footer-actions a {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .fromone-privacy-panel,
          .fromone-principle-card,
          .fromone-policy-card,
          .fromone-policy-index {
            text-align: center;
          }

          .fromone-principle-card {
            display: grid;
            justify-items: center;
            min-height: auto;
          }

          .fromone-data-journey span {
            display: grid;
            justify-items: center;
            text-align: center;
          }

          .fromone-policy-index nav {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="fromone-legal-stage">
        <div className="fromone-legal-simple-nav" aria-label="Privacy page navigation">
          <Link href="/" className="fromone-legal-mini-brand" aria-label="FromOne homepage">
            <img src="/fromone-logo.png" alt="FromOne logo" />
            <span>FromOne</span>
          </Link>

          <Link href="/" className="fromone-legal-home-link">
            Home
          </Link>
        </div>

        <div className="fromone-legal-shell fromone-legal-hero">
          <div className="fromone-legal-hero-copy">
            <div className="fromone-legal-kicker">Privacy at FromOne</div>

            <h1 className="fromone-legal-title">
              Clear rules for your <span>workspace data.</span>
            </h1>

            <p className="fromone-legal-intro">
              This policy explains how FromOne collects, stores and uses the data needed to run your Business Profile, uploaded media, generated posts and publishing connections.
            </p>

            <div className="fromone-legal-actions">
              <Link href="/signin" className="sales-primary-button">
                Back to app
              </Link>

              <a href="mailto:info@fromone.co.uk" className="sales-secondary-button">
                Email privacy question
              </a>
            </div>
          </div>

          <aside className="fromone-privacy-panel" aria-label="Privacy summary">
            <div className="fromone-privacy-panel-card">
              <div className="page-eyebrow">Last updated</div>
              <strong>13 May 2026</strong>
              <p>
                Covers account data, Business Profiles, uploaded media, generated posts, publishing connections, support requests and billing references.
              </p>
            </div>

            <div className="fromone-data-journey" style={{ marginTop: 14 }}>
              {dataJourney.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="fromone-legal-section">
        <div className="fromone-legal-shell">
          <div className="fromone-principles-grid">
            {privacyPrinciples.map((principle, index) => (
              <article key={principle.title} className="fromone-principle-card">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h2>{principle.title}</h2>
                <p>{principle.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-legal-section" style={{ paddingTop: 0 }}>
        <div className="fromone-legal-shell">
          <div className="fromone-policy-layout">
            <aside className="fromone-policy-index" aria-label="Privacy policy sections">
              <div className="page-eyebrow">Policy index</div>
              <nav>
                {privacySections.map((section, index) => (
                  <a key={section.title} href={`#privacy-${index + 1}`}>
                    {index + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="fromone-policy-list">
              {privacySections.map((section, index) => (
                <article key={section.title} id={`privacy-${index + 1}`} className="fromone-policy-card">
                  <h2>{index + 1}. {section.title}</h2>

                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{renderParagraph(paragraph)}</p>
                  ))}
                </article>
              ))}
            </div>
          </div>

          <div className="fromone-legal-footer-actions">
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
      </section>

      <PublicFooter />
    </main>
  );
}
