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

const summaryCards = [
  {
    title: 'We use data to run the workspace',
    text: 'Business details, uploaded media and post history help FromOne create, save and publish the content you ask it to prepare.',
  },
  {
    title: 'You stay in control',
    text: 'Connected Facebook and Instagram accounts are used only for the publishing features you choose to use.',
  },
  {
    title: 'We do not sell personal data',
    text: 'FromOne uses trusted service providers to operate the app, store content and process subscriptions.',
  },
];

const dataHighlights = [
  'Account and sign-in information',
  'Business Profile and brand details',
  'Uploaded photos, videos and flyers',
  'Generated posts, schedules and publish history',
  'Meta, Facebook and Instagram connection references',
  'Support, billing, usage and product activity records',
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
          padding-bottom: clamp(32px, 5vw, 58px);
        }

        .fromone-legal-hero::before {
          content: '';
          position: absolute;
          inset: -240px -120px auto;
          height: 680px;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 212, 59, 0.2), transparent 32%),
            radial-gradient(circle at 72% 28%, rgba(61, 220, 151, 0.11), transparent 28%),
            radial-gradient(circle at 24% 24%, rgba(255, 255, 255, 0.075), transparent 30%);
          pointer-events: none;
        }

        .fromone-legal-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(330px, 0.96fr);
          gap: clamp(24px, 5vw, 54px);
          align-items: center;
          padding: clamp(42px, 6vw, 82px) 0 clamp(10px, 2vw, 24px);
        }

        .fromone-legal-title {
          margin: 0 0 18px;
          max-width: 760px;
          color: #ffffff;
          font-size: clamp(3.2rem, 7vw, 7.2rem);
          line-height: 0.86;
          letter-spacing: -0.082em;
        }

        .fromone-legal-title span {
          color: #ffd43b;
        }

        .fromone-legal-copy p {
          max-width: 650px;
          margin: 0;
          color: rgba(248, 250, 252, 0.74);
          font-size: clamp(1.03rem, 1.3vw, 1.16rem);
          line-height: 1.72;
        }

        .fromone-legal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .fromone-legal-proof {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .fromone-legal-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(248, 250, 252, 0.86);
          font-size: 0.88rem;
          font-weight: 900;
        }

        .fromone-legal-pill span {
          color: #ffd43b;
        }

        .fromone-legal-summary {
          position: relative;
          z-index: 1;
          padding: clamp(22px, 3vw, 32px);
          border-radius: 42px;
          background:
            radial-gradient(circle at 22% 8%, rgba(255, 212, 59, 0.22), transparent 28%),
            radial-gradient(circle at 82% 18%, rgba(61, 220, 151, 0.12), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.115), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.24);
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.38);
        }

        .fromone-legal-summary-grid {
          display: grid;
          gap: 12px;
        }

        .fromone-legal-summary-card {
          padding: 18px;
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-legal-summary-card strong {
          display: block;
          color: #ffffff;
          font-size: 1.04rem;
          line-height: 1.25;
        }

        .fromone-legal-summary-card p {
          margin: 8px 0 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.58;
        }

        .fromone-legal-section {
          padding: clamp(30px, 4.8vw, 58px) 0;
        }

        .fromone-legal-panel {
          padding: clamp(24px, 4.2vw, 46px);
          border-radius: 42px;
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.12), transparent 32%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.086), rgba(255, 255, 255, 0.032));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 28px 92px rgba(0, 0, 0, 0.28);
        }

        .fromone-legal-panel-header {
          max-width: 760px;
          margin-bottom: 24px;
        }

        .fromone-legal-panel-header h2 {
          margin: 10px 0 12px;
          color: #ffffff;
          font-size: clamp(2.25rem, 4.7vw, 4.6rem);
          line-height: 0.92;
          letter-spacing: -0.068em;
        }

        .fromone-legal-panel-header p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-data-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .fromone-data-item {
          padding: 16px;
          border-radius: 20px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(248, 250, 252, 0.86);
          font-weight: 850;
          line-height: 1.42;
        }

        .fromone-policy-list {
          display: grid;
          gap: 12px;
        }

        .fromone-policy-card {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          gap: 16px;
          padding: clamp(18px, 2.3vw, 24px);
          border-radius: 26px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.072), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.095);
        }

        .fromone-policy-number {
          width: 44px;
          height: 44px;
          display: inline-grid;
          place-items: center;
          border-radius: 16px;
          background: #ffd43b;
          color: #101420;
          font-weight: 1000;
          box-shadow: 0 16px 36px rgba(255, 212, 59, 0.18);
        }

        .fromone-policy-card h3 {
          margin: 2px 0 10px;
          color: #ffffff;
          font-size: clamp(1.16rem, 1.8vw, 1.42rem);
          line-height: 1.18;
        }

        .fromone-policy-card p {
          margin: 0 0 9px;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.68;
        }

        .fromone-policy-card p:last-child {
          margin-bottom: 0;
        }

        .fromone-legal-cta {
          padding: clamp(28px, 5vw, 56px);
          border-radius: 46px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 212, 59, 0.25), transparent 34%),
            radial-gradient(circle at 86% 20%, rgba(61, 220, 151, 0.12), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.115), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.27);
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.38);
          text-align: center;
        }

        .fromone-legal-cta h2 {
          max-width: 760px;
          margin: 12px auto 14px;
          color: #ffffff;
          font-size: clamp(2.35rem, 5.2vw, 5.2rem);
          line-height: 0.92;
          letter-spacing: -0.072em;
        }

        .fromone-legal-cta p {
          max-width: 640px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.7;
        }

        .fromone-legal-cta-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 28px;
        }

        @media (max-width: 920px) {
          .fromone-legal-hero-grid {
            grid-template-columns: 1fr;
          }

          .fromone-legal-copy {
            max-width: 760px;
            margin: 0 auto;
            text-align: center;
          }

          .fromone-legal-copy p,
          .fromone-legal-actions,
          .fromone-legal-proof {
            margin-left: auto;
            margin-right: auto;
            justify-content: center;
          }

          .fromone-data-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .fromone-legal-shell {
            width: min(100% - 24px, 520px);
          }

          .fromone-legal-hero-grid {
            padding-top: 42px;
            gap: 24px;
          }

          .fromone-legal-title {
            font-size: clamp(3rem, 14vw, 4.15rem);
            line-height: 0.9;
          }

          .fromone-legal-actions,
          .fromone-legal-cta-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .fromone-legal-actions a,
          .fromone-legal-cta-actions a {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .fromone-legal-proof,
          .fromone-data-grid {
            display: grid;
            grid-template-columns: 1fr;
          }

          .fromone-legal-pill,
          .fromone-data-item {
            justify-content: center;
            text-align: center;
          }

          .fromone-legal-summary,
          .fromone-legal-panel,
          .fromone-legal-cta {
            border-radius: 30px;
          }

          .fromone-legal-panel-header,
          .fromone-policy-card,
          .fromone-legal-cta {
            text-align: center;
          }

          .fromone-policy-card {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .fromone-policy-number {
            margin: 0 auto;
          }
        }
      `}</style>

      <section className="fromone-legal-hero">
        <PublicNav />

        <div className="fromone-legal-shell fromone-legal-hero-grid">
          <div className="fromone-legal-copy">
            <h1 className="fromone-legal-title">
              Privacy, written for <span>real use.</span>
            </h1>

            <p>
              This policy explains how FromOne collects, uses, stores and protects personal data when
              you use the app to create, schedule and publish social media content.
            </p>

            <div className="fromone-legal-actions">
              <Link href="/signin" className="sales-primary-button">
                Back to FromOne
              </Link>

              <Link href="/terms" className="sales-secondary-button">
                View terms
              </Link>
            </div>

            <div className="fromone-legal-proof" aria-label="Privacy policy highlights">
              <div className="fromone-legal-pill"><span>✓</span> Updated 13 May 2026</div>
              <div className="fromone-legal-pill"><span>✓</span> Uploads and publishing</div>
              <div className="fromone-legal-pill"><span>✓</span> Meta / Facebook / Instagram</div>
            </div>
          </div>

          <aside className="fromone-legal-summary" aria-label="Privacy summary">
            <div className="fromone-legal-summary-grid">
              {summaryCards.map((item) => (
                <div key={item.title} className="fromone-legal-summary-card">
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="fromone-legal-section">
        <div className="fromone-legal-shell">
          <div className="fromone-legal-panel">
            <div className="fromone-legal-panel-header">
              <div className="page-eyebrow">Overview</div>
              <h2>Your data powers your workspace.</h2>
              <p>
                FromOne uses account details, your Business Profile, uploaded media and connected
                publishing information to provide the app and prepare the posts you ask it to create.
              </p>
            </div>

            <div className="fromone-data-grid">
              {dataHighlights.map((item) => (
                <div key={item} className="fromone-data-item">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-legal-section">
        <div className="fromone-legal-shell">
          <div className="fromone-legal-panel">
            <div className="fromone-legal-panel-header">
              <div className="page-eyebrow">Full policy</div>
              <h2>The detail.</h2>
              <p>
                The sections below explain what FromOne collects, why it is used, who it may be
                shared with and how to contact us.
              </p>
            </div>

            <div className="fromone-policy-list">
              {privacySections.map((section, index) => (
                <article key={section.title} className="fromone-policy-card">
                  <span className="fromone-policy-number">{String(index + 1).padStart(2, '0')}</span>

                  <div>
                    <h3>{section.title}</h3>

                    {section.body.map((paragraph) => (
                      <p key={paragraph}>
                        {paragraph.includes('info@fromone.co.uk') ? (
                          <>
                            {paragraph.replace('info@fromone.co.uk', '')}
                            <a
                              href="mailto:info@fromone.co.uk"
                              style={{ color: '#ffd43b', fontWeight: 950 }}
                            >
                              info@fromone.co.uk
                            </a>
                          </>
                        ) : (
                          paragraph
                        )}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fromone-legal-section" style={{ paddingBottom: 82 }}>
        <div className="fromone-legal-shell">
          <div className="fromone-legal-cta">
            <div className="page-eyebrow">Questions</div>
            <h2>Need help with your data?</h2>
            <p>
              Contact us about privacy questions, personal data requests or anything that feels unclear.
            </p>

            <div className="fromone-legal-cta-actions">
              <a href="mailto:info@fromone.co.uk" className="sales-primary-button">
                Email info@fromone.co.uk
              </a>

              <Link href="/cookies" className="sales-secondary-button">
                Cookie Policy
              </Link>

              <Link href="/terms" className="sales-secondary-button">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
