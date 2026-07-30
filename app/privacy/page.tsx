import type { Metadata } from 'next';
import Link from 'next/link';

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
    title: '1. Who we are',
    body: [
      'FromOne is a social media content workflow platform for small businesses. It helps users create social media posts, and where relevant Smiles offers and events, from a Business Profile, uploaded media, website information, and user-provided business details.',
      'For privacy questions, contact us at info@fromone.co.uk.',
    ],
  },
  {
    title: '2. What information we collect',
    body: [
      'We may collect and store account information, such as your email address and user ID.',
      'We may collect business profile information, such as business name, website URL, industry, location, services, audience, tone of voice, offers, brand colours, and logo URL.',
      'We may store uploaded media, including photos, videos, flyers, offer graphics, menus, product images, event clips, or other files you add to create posts.',
      'We may store generated content, including captions, hashtags, CTAs, image ideas, campaign plans, Smiles offer or event details, post status, and publishing history.',
      'We may store social publishing connection details, such as connected Meta, Facebook Page, or Instagram Business account references needed to publish posts.',
      'We may store support requests, feedback, reviews, billing status, subscription references, upload usage, saved content, media rescans, and product activity needed to operate the service.',
    ],
  },
  {
    title: '3. How we use your information',
    body: [
      'We use your information to create and manage your FromOne account.',
      'We use your Business Profile and uploaded media to generate social media posts and suitable Smiles offers or events.',
      'We save posts, uploaded media, Smiles listing details, and publishing progress.',
      'We publish Facebook and Instagram posts when you connect those accounts and choose to use publishing features.',
      'We use information to provide support, manage trials or subscriptions, improve FromOne, and keep the service secure.',
    ],
  },
  {
    title: '4. Website scans and uploaded media',
    body: [
      'If you enter a website URL, FromOne may scan publicly available content from that website to understand the business, services, audience, tone, offers, and brand details.',
      'If you upload photos, videos, flyers, or other files, FromOne may use that media to create, rewrite, improve, or publish social media posts for the connected business, and to prepare suitable Smiles offers or events.',
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
      'It may also include AI/content generation providers used to create, improve, or rewrite posts, offers or events; Meta, Facebook and Instagram when you connect accounts and publish posts; payment providers once subscription billing is connected; and hosting, analytics, security or support tools if added to the service.',
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

export default function PrivacyPage() {
  return (
    <main className="privacyPage">
      <section className="privacyContainer">
        <header className="privacyTopbar">
          <Link href="/" className="privacyBrand" aria-label="FromOne home">
            <img src="/fromone-logo.png" alt="FromOne" />
          </Link>

          <Link href="/signin" className="privacyBackLink">
            ← Back to app
          </Link>
        </header>

        <section className="privacyHero">
          <div className="privacyHeroCopy">
            <span className="privacyEyebrow">FromOne legal</span>
            <h1>Privacy Policy</h1>
            <p>
              How FromOne collects, uses, stores and protects personal data when
              you create content, publish posts and manage your business.
            </p>
          </div>

          <div className="privacyHeroMeta">
            <span>Last updated</span>
            <strong>5 July 2026</strong>
          </div>
        </section>

        <section className="privacyOverview">
          <span className="privacyEyebrow">At a glance</span>
          <h2>Your data is used to run your FromOne workspace.</h2>
          <p>
            FromOne uses your account details, Business Profile, uploaded media
            and connected publishing information to provide the app, create
            posts, prepare suitable Smilez offers or events, and publish to
            connected channels when you choose those features.
          </p>

          <div className="privacyPills">
            <span>Account and business details</span>
            <span>Uploads and generated content</span>
            <span>Facebook and Instagram publishing</span>
          </div>
        </section>

        <section className="privacyLayout">
          <aside className="privacySidebar">
            <strong>Privacy Policy</strong>
            <p>Read each section below or use these links for related policies.</p>

            <nav aria-label="Related legal pages">
              <Link href="/cookies">Cookie Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/bugreport">Support</Link>
            </nav>
          </aside>

          <div className="privacySections">
            {privacySections.map((section) => (
              <article key={section.title} className="privacySection">
                <h2>{section.title}</h2>

                {section.body.map((paragraph) => (
                  <p key={paragraph}>
                    {paragraph.includes("info@fromone.co.uk") ? (
                      <>
                        {paragraph.replace("info@fromone.co.uk", "")}
                        <a href="mailto:info@fromone.co.uk">
                          info@fromone.co.uk
                        </a>
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>

        <section className="privacyActions">
          <div>
            <span className="privacyEyebrow">Need help?</span>
            <h2>Questions about your data?</h2>
            <p>Contact FromOne and we will help with your privacy request.</p>
          </div>

          <div className="privacyActionLinks">
            <a href="mailto:info@fromone.co.uk">Email FromOne</a>
            <Link href="/signin">Back to app</Link>
          </div>
        </section>
      </section>

      <style>{`
        .privacyPage {
          min-height: 100vh;
          background: #f7f9fc;
          color: #071b49;
        }

        .privacyContainer {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 24px 0 72px;
        }

        .privacyTopbar {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .privacyBrand {
          display: inline-flex;
          align-items: center;
        }

        .privacyBrand img {
          width: 126px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .privacyBackLink {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border: 1px solid rgba(7, 27, 73, 0.1);
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font-size: 0.82rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(7, 27, 73, 0.05);
        }

        .privacyHero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 36px;
          align-items: end;
          padding: clamp(30px, 5vw, 58px);
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 32px;
          background: #ffffff;
          box-shadow: 0 24px 60px rgba(7, 27, 73, 0.07);
        }

        .privacyHeroCopy {
          min-width: 0;
        }

        .privacyEyebrow {
          display: block;
          margin-bottom: 10px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .privacyHero h1 {
          max-width: 820px;
          margin: 0;
          font-size: clamp(3.6rem, 8vw, 6.6rem);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }

        .privacyHero p {
          max-width: 760px;
          margin: 22px 0 0;
          color: #5f6d86;
          font-size: clamp(1rem, 1.8vw, 1.18rem);
          font-weight: 650;
          line-height: 1.7;
        }

        .privacyHeroMeta {
          min-width: 180px;
          display: grid;
          gap: 6px;
          padding: 18px 20px;
          border-radius: 20px;
          background: #f8fafc;
        }

        .privacyHeroMeta span {
          color: #738096;
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
        }

        .privacyHeroMeta strong {
          font-size: 1rem;
        }

        .privacyOverview {
          margin-top: 24px;
          padding: clamp(26px, 4vw, 42px);
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 28px;
          background: #071b49;
          color: #ffffff;
        }

        .privacyOverview h2 {
          max-width: 820px;
          margin: 0;
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .privacyOverview p {
          max-width: 900px;
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.75;
        }

        .privacyPills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .privacyPills span {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0 13px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.75rem;
          font-weight: 800;
        }

        .privacyLayout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
          margin-top: 24px;
        }

        .privacySidebar {
          position: sticky;
          top: 22px;
          display: grid;
          gap: 14px;
          padding: 22px;
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 16px 38px rgba(7, 27, 73, 0.05);
        }

        .privacySidebar > strong {
          font-size: 1.1rem;
        }

        .privacySidebar p {
          margin: 0;
          color: #6b7890;
          font-size: 0.83rem;
          line-height: 1.55;
        }

        .privacySidebar nav {
          display: grid;
          gap: 8px;
        }

        .privacySidebar a {
          min-height: 40px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border-radius: 12px;
          background: #f5f7fb;
          color: #071b49;
          font-size: 0.78rem;
          font-weight: 850;
          text-decoration: none;
        }

        .privacySections {
          display: grid;
          gap: 14px;
        }

        .privacySection {
          padding: clamp(22px, 3vw, 30px);
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(7, 27, 73, 0.04);
        }

        .privacySection h2 {
          margin: 0 0 14px;
          font-size: clamp(1.25rem, 2vw, 1.55rem);
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .privacySection p {
          margin: 0 0 10px;
          color: #5f6d86;
          font-size: 0.95rem;
          line-height: 1.72;
        }

        .privacySection p:last-child {
          margin-bottom: 0;
        }

        .privacySection a {
          color: #f72585;
          font-weight: 900;
        }

        .privacyActions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
          margin-top: 24px;
          padding: 28px;
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 24px;
          background: #ffffff;
        }

        .privacyActions h2 {
          margin: 0;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          letter-spacing: -0.04em;
        }

        .privacyActions p {
          margin: 8px 0 0;
          color: #66748c;
        }

        .privacyActionLinks {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .privacyActionLinks a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 900;
          text-decoration: none;
        }

        .privacyActionLinks a:last-child {
          border: 1px solid rgba(7, 27, 73, 0.1);
          background: #ffffff;
          color: #071b49;
        }

        @media (max-width: 900px) {
          .privacyHero {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .privacyHeroMeta {
            width: fit-content;
          }

          .privacyLayout {
            grid-template-columns: 1fr;
          }

          .privacySidebar {
            position: static;
          }

          .privacySidebar nav {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .privacyActions {
            grid-template-columns: 1fr;
          }

          .privacyActionLinks {
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .privacyContainer {
            width: min(100% - 16px, 680px);
            padding: 10px 0 34px;
          }

          .privacyTopbar {
            min-height: 54px;
            margin-bottom: 14px;
          }

          .privacyBrand img {
            width: 92px;
          }

          .privacyBackLink {
            min-height: 38px;
            padding: 0 13px;
            font-size: 0.72rem;
          }

          .privacyHero {
            gap: 18px;
            padding: 24px 18px;
            border-radius: 22px;
          }

          .privacyHero h1 {
            font-size: clamp(2.7rem, 14vw, 3.8rem);
            line-height: 0.94;
          }

          .privacyHero p {
            margin-top: 16px;
            font-size: 0.92rem;
            line-height: 1.6;
          }

          .privacyHeroMeta {
            min-width: 0;
            width: 100%;
            padding: 14px 16px;
            border-radius: 16px;
          }

          .privacyOverview {
            margin-top: 14px;
            padding: 22px 18px;
            border-radius: 20px;
          }

          .privacyOverview h2 {
            font-size: 1.8rem;
            line-height: 1.04;
          }

          .privacyOverview p {
            margin-top: 14px;
            font-size: 0.9rem;
            line-height: 1.62;
          }

          .privacyPills {
            gap: 8px;
            margin-top: 18px;
          }

          .privacyPills span {
            min-height: 34px;
            font-size: 0.7rem;
          }

          .privacyLayout {
            gap: 12px;
            margin-top: 12px;
          }

          .privacySidebar {
            padding: 16px;
            border-radius: 18px;
          }

          .privacySidebar nav {
            grid-template-columns: 1fr;
          }

          .privacySidebar a {
            min-height: 38px;
          }

          .privacySections {
            gap: 10px;
          }

          .privacySection {
            padding: 18px;
            border-radius: 18px;
          }

          .privacySection h2 {
            margin-bottom: 10px;
            font-size: 1.12rem;
          }

          .privacySection p {
            margin-bottom: 8px;
            font-size: 0.92rem;
            line-height: 1.62;
          }

          .privacyActions {
            margin-top: 12px;
            padding: 20px 16px;
            border-radius: 18px;
          }

          .privacyActions h2 {
            font-size: 1.65rem;
          }

          .privacyActions p {
            font-size: 0.88rem;
            line-height: 1.55;
          }

          .privacyActionLinks {
            display: grid;
            grid-template-columns: 1fr;
          }

          .privacyActionLinks a {
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .privacyHero h1 {
            font-size: 2.45rem;
          }

          .privacySection {
            padding: 16px;
          }

          .privacySection p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </main>
  );
}
