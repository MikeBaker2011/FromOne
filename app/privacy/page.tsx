import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | FromOne',
  description:
    'Read how FromOne collects, uses, stores, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

const policySections = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: [
      'FromOne is a social media content workflow platform for small businesses. It helps users create weekly social media posts from a Business Profile, uploaded media, website information, and user-provided business details.',
      'For privacy questions, contact us at info@fromone.co.uk.',
    ],
  },
  {
    id: 'what-we-collect',
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
    id: 'how-we-use-it',
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
    id: 'website-scans',
    title: 'Website scans and uploaded media',
    body: [
      'If you enter a website URL, FromOne may scan publicly available content from that website to understand the business, services, audience, tone, offers, and brand details.',
      'If you upload photos, videos, flyers, or other files, FromOne may use that media to create, rewrite, improve, schedule, or publish social media posts for the connected business.',
    ],
  },
  {
    id: 'social-connections',
    title: 'Social account connections',
    body: [
      'If you connect Meta, Facebook, or Instagram, FromOne stores the connection details needed to publish posts on your behalf.',
      'These details are used only to provide the publishing features you choose to use.',
    ],
  },
  {
    id: 'legal-basis',
    title: 'Legal basis for processing',
    body: [
      'We process personal data where it is necessary to provide the service, manage your account, respond to support requests, comply with legal obligations, or where we have a legitimate interest in improving and securing FromOne.',
    ],
  },
  {
    id: 'sharing',
    title: 'Who we share data with',
    body: [
      'We only share data with service providers needed to operate FromOne. This may include Supabase for authentication, database storage and file storage.',
      'It may also include AI/content generation providers used to create, improve, or rewrite posts; Meta, Facebook and Instagram when you connect accounts and publish posts; payment providers once subscription billing is connected; and hosting, analytics, security or support tools if added to the service.',
      'We do not sell your personal data.',
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep data',
    body: [
      'We keep account, business profile, campaign, uploaded media, and post data while your account is active or while it is needed to provide the service.',
      'Support requests and billing records may be kept for longer where needed for business, legal, tax, or security reasons.',
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: [
      'Depending on your location and applicable law, you may have rights to access, correct, delete, restrict, object to, or request a copy of your personal data.',
      'To make a request, contact info@fromone.co.uk.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    body: [
      'We take reasonable steps to protect your data, including using trusted service providers, authentication, access controls, and secure storage.',
      'No online service can guarantee complete security.',
    ],
  },
  {
    id: 'international',
    title: 'International transfers',
    body: [
      'Some service providers may process data outside the UK or European Economic Area. If this happens, we rely on appropriate safeguards provided by those service providers.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    body: [
      'FromOne is not intended for children. You should not use FromOne if you are under 18.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy as FromOne changes. The latest version will always be available on this page.',
    ],
  },
];

const dataJourney = [
  {
    label: 'Account',
    title: 'Sign in and workspace access',
    text: 'Email, user ID and account state keep the right workspace connected to the right user.',
  },
  {
    label: 'Profile',
    title: 'Business context',
    text: 'Business details, services, audience and tone help FromOne create posts that fit the business.',
  },
  {
    label: 'Media',
    title: 'Uploads and generated posts',
    text: 'Photos, videos, flyers and generated captions are stored so weekly posts can be reviewed and published.',
  },
  {
    label: 'Publishing',
    title: 'Connected channels',
    text: 'Meta, Facebook and Instagram references are used only for the publishing features you choose to use.',
  },
];

const trustPoints = [
  'We do not sell personal data.',
  'You review posts before publishing.',
  'Connected social accounts are used for FromOne publishing features.',
  'Support and billing records are kept only where needed.',
];

export default function PrivacyPage() {
  return (
    <main className="sales-page fromone-legal-page">
      <style>{`
        .fromone-legal-page {
          overflow: hidden;
        }

        .fromone-legal-shell {
          width: min(1160px, calc(100vw - 32px));
          margin: 0 auto;
        }

        .fromone-legal-hero {
          position: relative;
          overflow: hidden;
          padding-bottom: clamp(32px, 5vw, 54px);
        }

        .fromone-legal-hero::before {
          content: '';
          position: absolute;
          inset: -220px -120px auto;
          height: 680px;
          background:
            radial-gradient(circle at 50% 20%, rgba(255, 212, 59, 0.2), transparent 32%),
            radial-gradient(circle at 78% 26%, rgba(61, 220, 151, 0.11), transparent 30%),
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08), transparent 30%);
          pointer-events: none;
        }

        .fromone-legal-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
          gap: clamp(22px, 4vw, 44px);
          align-items: stretch;
          padding: clamp(34px, 5vw, 66px) 0 clamp(18px, 3vw, 30px);
        }

        .fromone-legal-hero-copy {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 430px;
          padding: clamp(28px, 5vw, 54px);
          border-radius: 44px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.18), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 212, 59, 0.24);
          box-shadow: 0 34px 110px rgba(0, 0, 0, 0.34);
        }

        .fromone-legal-title {
          margin: 14px 0 18px;
          max-width: 720px;
          color: #ffffff;
          font-size: clamp(3.3rem, 7vw, 7rem);
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
          font-size: clamp(1.04rem, 1.35vw, 1.18rem);
          line-height: 1.7;
        }

        .fromone-legal-quick-card {
          display: grid;
          align-content: space-between;
          gap: 18px;
          padding: clamp(22px, 3vw, 30px);
          border-radius: 40px;
          background:
            radial-gradient(circle at 80% 12%, rgba(61, 220, 151, 0.14), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.105), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.3);
        }

        .fromone-legal-date {
          display: inline-flex;
          width: fit-content;
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.12);
          border: 1px solid rgba(255, 212, 59, 0.22);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .fromone-legal-quick-card h2 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(1.9rem, 3vw, 3rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
        }

        .fromone-trust-list {
          display: grid;
          gap: 10px;
        }

        .fromone-trust-list div {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding: 13px 14px;
          border-radius: 18px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(248, 250, 252, 0.84);
          font-weight: 850;
          line-height: 1.38;
        }

        .fromone-trust-list span {
          width: 30px;
          height: 30px;
          display: inline-grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-weight: 1000;
        }

        .fromone-legal-section {
          padding: clamp(34px, 5vw, 56px) 0;
        }

        .fromone-legal-heading {
          max-width: 760px;
          margin: 0 auto 24px;
          text-align: center;
        }

        .fromone-legal-heading h2 {
          margin: 10px 0 12px;
          color: #ffffff;
          font-size: clamp(2.35rem, 5vw, 5rem);
          line-height: 0.92;
          letter-spacing: -0.07em;
        }

        .fromone-legal-heading p {
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-data-journey {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .fromone-data-card {
          min-height: 230px;
          padding: 22px;
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
        }

        .fromone-data-card span {
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.76rem;
          font-weight: 950;
        }

        .fromone-data-card h3 {
          margin: 18px 0 9px;
          color: #ffffff;
          font-size: 1.22rem;
          line-height: 1.12;
        }

        .fromone-data-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.7);
          line-height: 1.58;
        }

        .fromone-policy-layout {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .fromone-policy-index {
          position: sticky;
          top: 20px;
          padding: 18px;
          border-radius: 28px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .fromone-policy-index strong {
          display: block;
          margin-bottom: 12px;
          color: #ffffff;
          font-size: 1.05rem;
        }

        .fromone-policy-index a {
          display: block;
          padding: 9px 10px;
          border-radius: 14px;
          color: rgba(248, 250, 252, 0.7);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 850;
          line-height: 1.25;
        }

        .fromone-policy-index a:hover {
          color: #ffe58a;
          background: rgba(255, 212, 59, 0.08);
        }

        .fromone-policy-list {
          display: grid;
          gap: 14px;
        }

        .fromone-policy-card {
          scroll-margin-top: 24px;
          padding: clamp(20px, 2.4vw, 28px);
          border-radius: 30px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.18);
        }

        .fromone-policy-card h2 {
          margin: 0 0 14px;
          color: #ffffff;
          font-size: clamp(1.35rem, 2vw, 2rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .fromone-policy-card p {
          margin: 0 0 10px;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.72;
        }

        .fromone-policy-card p:last-child {
          margin-bottom: 0;
        }

        .fromone-policy-card a {
          color: #ffe58a;
          font-weight: 950;
        }

        .fromone-legal-cta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          padding: clamp(24px, 4vw, 38px);
          border-radius: 38px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.16), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 212, 59, 0.22);
          box-shadow: 0 26px 86px rgba(0, 0, 0, 0.28);
        }

        .fromone-legal-cta h2 {
          margin: 0 0 8px;
          color: #ffffff;
          font-size: clamp(1.8rem, 3.5vw, 3.4rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
        }

        .fromone-legal-cta p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.62;
        }

        .fromone-legal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
        }

        @media (max-width: 980px) {
          .fromone-legal-hero-grid,
          .fromone-policy-layout,
          .fromone-legal-cta {
            grid-template-columns: 1fr;
          }

          .fromone-legal-hero-copy,
          .fromone-legal-quick-card {
            min-height: auto;
          }

          .fromone-data-journey {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .fromone-policy-index {
            position: static;
          }

          .fromone-policy-index nav {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
          }

          .fromone-legal-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .fromone-legal-shell {
            width: min(100% - 24px, 520px);
          }

          .fromone-legal-hero-grid {
            padding-top: 34px;
          }

          .fromone-legal-hero-copy,
          .fromone-legal-quick-card,
          .fromone-data-card,
          .fromone-policy-card,
          .fromone-legal-cta {
            text-align: center;
          }

          .fromone-legal-title {
            font-size: clamp(3rem, 14vw, 4.15rem);
            line-height: 0.92;
          }

          .fromone-legal-intro,
          .fromone-legal-heading p,
          .fromone-legal-cta p {
            margin-left: auto;
            margin-right: auto;
          }

          .fromone-legal-date,
          .fromone-data-card span {
            margin-left: auto;
            margin-right: auto;
          }

          .fromone-trust-list div {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .fromone-data-journey,
          .fromone-policy-index nav {
            grid-template-columns: 1fr;
          }

          .fromone-data-card {
            min-height: auto;
          }

          .fromone-policy-index {
            display: none;
          }

          .fromone-legal-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .fromone-legal-actions a {
            width: 100%;
            justify-content: center;
            text-align: center;
          }
        }
      `}</style>

      <section className="fromone-legal-hero">
        <PublicNav />

        <div className="fromone-legal-shell fromone-legal-hero-grid">
          <section className="fromone-legal-hero-copy">
            <div className="page-eyebrow">Privacy at FromOne</div>

            <h1 className="fromone-legal-title">
              Your data powers <span>your workspace.</span>
            </h1>

            <p className="fromone-legal-intro">
              FromOne uses account details, business information, uploads and connected publishing
              settings to create, review, schedule and publish social posts.
            </p>
          </section>

          <aside className="fromone-legal-quick-card" aria-label="Privacy summary">
            <div>
              <span className="fromone-legal-date">Last updated · 13 May 2026</span>
            </div>

            <h2>What matters most</h2>

            <div className="fromone-trust-list">
              {trustPoints.map((point) => (
                <div key={point}>
                  <span aria-hidden="true">✓</span>
                  <strong>{point}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="fromone-legal-section">
        <div className="fromone-legal-shell">
          <div className="fromone-legal-heading">
            <div className="page-eyebrow">Data journey</div>
            <h2>What FromOne needs to work.</h2>
            <p>
              The app uses information in a practical way: to identify your account, understand the
              business, create posts, and publish only when you use connected publishing features.
            </p>
          </div>

          <div className="fromone-data-journey">
            {dataJourney.map((item) => (
              <article key={item.label} className="fromone-data-card">
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-legal-section">
        <div className="fromone-legal-shell fromone-policy-layout">
          <aside className="fromone-policy-index" aria-label="Privacy policy contents">
            <strong>Policy sections</strong>
            <nav>
              {policySections.map((section) => (
                <a key={section.id} href={`#${section.id}`}>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="fromone-policy-list">
            {policySections.map((section) => (
              <article key={section.id} id={section.id} className="fromone-policy-card">
                <h2>{section.title}</h2>

                {section.body.map((paragraph) => (
                  <p key={paragraph}>
                    {paragraph.includes('info@fromone.co.uk') ? (
                      <>
                        {paragraph.replace('info@fromone.co.uk', '')}
                        <a href="mailto:info@fromone.co.uk">info@fromone.co.uk</a>
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fromone-legal-section" style={{ paddingBottom: 76 }}>
        <div className="fromone-legal-shell">
          <div className="fromone-legal-cta">
            <div>
              <div className="page-eyebrow">Questions</div>
              <h2>Need help with your data?</h2>
              <p>
                Contact FromOne or read the related policies for cookies and terms of service.
              </p>
            </div>

            <div className="fromone-legal-actions">
              <a href="mailto:info@fromone.co.uk" className="sales-primary-button">
                Email support
              </a>
              <Link href="/cookies" className="sales-secondary-button">
                Cookies
              </Link>
              <Link href="/terms" className="sales-secondary-button">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
