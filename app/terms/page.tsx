import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | FromOne',
  description:
    'Read the terms for using FromOne.',
  alternates: {
    canonical: '/terms',
  },
};

const termsSections = [
  {
    title: '1. About FromOne',
    body: [
      'FromOne is a content workflow tool that helps small businesses create social media posts, Smiles offers and Smiles events from a Business Profile, uploaded media, website information, and user-provided business details.',
      'FromOne can help create post wording, media preparation, publishing workflows for channels such as Facebook and Instagram, and suitable offer or event submissions for Smiles.',
    ],
  },
  {
    title: '2. Using FromOne',
    body: [
      'You must use FromOne lawfully and responsibly.',
      'You are responsible for reviewing all generated content before publishing or allowing it to be published.',
      'You must not use FromOne to create unlawful, misleading, harmful, abusive, infringing, or otherwise inappropriate content.',
    ],
  },
  {
    title: '3. Generated content',
    body: [
      'FromOne uses AI-assisted tools to generate content suggestions. Generated posts may need editing, checking, or approval before use.',
      'You are responsible for ensuring that posts are accurate, lawful, suitable for your business, and appropriate for the platform where they are published.',
      'Generated content should not be treated as professional legal, financial, medical, or specialist advice.',
    ],
  },
  {
    title: '4. Publishing and Smiles submissions',
    body: [
      'FromOne may support direct publishing for supported connected platforms, such as Facebook and Instagram, when your accounts are connected and permissions are active.',
      'FromOne may also help prepare suitable offers and events for Smiles review or approval before they appear as live Smiles listings.',
      'You are responsible for checking post wording, media, platform choice, Smiles listing details, and publishing or submission status before relying on content being published or displayed.',
    ],
  },
  {
    title: '5. Accounts and access',
    body: [
      'You are responsible for keeping your account secure and for any activity that happens under your account.',
      'If you believe your account has been accessed without permission, contact us as soon as possible.',
      'You must provide accurate account and business information when using FromOne.',
    ],
  },
  {
    title: '6. Demo and subscription',
    body: [
      'FromOne may offer a 7-day demo. After the demo, continued access may require a paid subscription.',
      'The current monthly price is shown at checkout or in your account before you subscribe.',
      'Once payment billing is connected, the payment provider may manage subscription payments, renewals, invoices, and cancellation processes.',
    ],
  },
  {
    title: '7. Website scans',
    body: [
      'If you submit a website URL, you confirm that you have the right to use that website information for generating business content.',
      'FromOne may use publicly available website information to understand the business, services, audience, tone, offers, and brand details.',
    ],
  },
  {
    title: '8. Uploaded content',
    body: [
      'You are responsible for any images, videos, flyers, logos, text, or other materials you upload.',
      'You should only upload content that you own or have permission to use.',
      'You must not upload content that infringes someone else’s rights or contains unlawful, harmful, abusive, or inappropriate material.',
    ],
  },
  {
    title: '9. Social account connections',
    body: [
      'If you connect Meta, Facebook, Instagram, or another social platform, you authorise FromOne to use the connection to provide the publishing features you choose to use.',
      'You are responsible for making sure connected social accounts belong to you or are accounts you are authorised to manage.',
      'If a connection expires or permissions change, publishing features may stop working until you reconnect.',
    ],
  },
  {
    title: '10. Availability',
    body: [
      'We aim to keep FromOne available, but we cannot guarantee uninterrupted access.',
      'The service may be unavailable during maintenance, updates, outages, or issues with third-party providers such as hosting, database, AI, payment, or social platform services.',
    ],
  },
  {
    title: '11. Limits and fair use',
    body: [
      'FromOne may apply limits to website scans, saved weekly sets, generated posts, uploads, media processing, publishing actions, or other usage to keep the service stable and fair for all users.',
      'We may adjust limits as the product develops.',
    ],
  },
  {
    title: '12. No guarantee of results',
    body: [
      'FromOne helps create and manage content, but we do not guarantee social media growth, sales, leads, enquiries, engagement, rankings, or business results.',
      'Your results may depend on your business, offer, location, market, audience, content quality, and other factors outside FromOne’s control.',
    ],
  },
  {
    title: '13. Ending access',
    body: [
      'We may suspend or end access if the service is misused, if payment fails, if these terms are breached, or if continued access would create risk for FromOne or other users.',
      'You may stop using FromOne at any time. Some account, billing, and legal records may be retained where needed.',
    ],
  },
  {
    title: '14. Changes to these terms',
    body: [
      'We may update these terms as FromOne changes. The latest version will be available on this page.',
      'Continuing to use FromOne after changes means you accept the updated terms.',
    ],
  },
  {
    title: '15. Contact',
    body: [
      'For questions about these terms, contact info@fromone.co.uk.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="termsPage">
      <section className="termsContainer">
        <header className="termsTopbar">
          <Link href="/" className="termsBrand" aria-label="FromOne home">
            <img src="/fromone-logo.png" alt="FromOne" />
          </Link>

          <Link href="/signin" className="termsBackLink">
            ← Back to app
          </Link>
        </header>

        <section className="termsHero">
          <div className="termsHeroCopy">
            <span className="termsEyebrow">FromOne legal</span>
            <h1>Terms of Service</h1>
            <p>
              The rules for using FromOne to create, review and publish content,
              manage connected services and prepare Smilez offers or events.
            </p>
          </div>

          <div className="termsHeroMeta">
            <span>Last updated</span>
            <strong>13 May 2026</strong>
          </div>
        </section>

        <section className="termsOverview">
          <span className="termsEyebrow">At a glance</span>
          <h2>Use FromOne responsibly and review your content.</h2>
          <p>
            FromOne helps small businesses create and manage social media content.
            You remain responsible for your account, uploaded materials,
            connected social accounts, generated wording, Smilez listing details
            and published posts.
          </p>

          <div className="termsPills">
            <span>7-day demo</span>
            <span>Uploads and publishing</span>
            <span>Connected services</span>
          </div>
        </section>

        <section className="termsLayout">
          <aside className="termsSidebar">
            <strong>Terms of Service</strong>
            <p>Read each section below or use these links for related policies.</p>

            <nav aria-label="Related legal pages">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/cookies">Cookie Policy</Link>
              <Link href="/bugreport">Support</Link>
            </nav>
          </aside>

          <div className="termsSections">
            {termsSections.map((section) => (
              <article key={section.title} className="termsSection">
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

        <section className="termsActions">
          <div>
            <span className="termsEyebrow">Need help?</span>
            <h2>Questions about these terms?</h2>
            <p>Contact FromOne and we will help with your terms request.</p>
          </div>

          <div className="termsActionLinks">
            <a href="mailto:info@fromone.co.uk">Email FromOne</a>
            <Link href="/signin">Back to app</Link>
          </div>
        </section>
      </section>

      <style>{`
        .termsPage {
          min-height: 100vh;
          background: #f7f9fc;
          color: #071b49;
        }

        .termsContainer {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 24px 0 72px;
        }

        .termsTopbar {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .termsBrand {
          display: inline-flex;
          align-items: center;
        }

        .termsBrand img {
          width: 126px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .termsBackLink {
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

        .termsHero {
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

        .termsHeroCopy {
          min-width: 0;
        }

        .termsEyebrow {
          display: block;
          margin-bottom: 10px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .termsHero h1 {
          max-width: 820px;
          margin: 0;
          font-size: clamp(3.6rem, 8vw, 6.6rem);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }

        .termsHero p {
          max-width: 760px;
          margin: 22px 0 0;
          color: #5f6d86;
          font-size: clamp(1rem, 1.8vw, 1.18rem);
          font-weight: 650;
          line-height: 1.7;
        }

        .termsHeroMeta {
          min-width: 180px;
          display: grid;
          gap: 6px;
          padding: 18px 20px;
          border-radius: 20px;
          background: #f8fafc;
        }

        .termsHeroMeta span {
          color: #738096;
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
        }

        .termsHeroMeta strong {
          font-size: 1rem;
        }

        .termsOverview {
          margin-top: 24px;
          padding: clamp(26px, 4vw, 42px);
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 28px;
          background: #071b49;
          color: #ffffff;
        }

        .termsOverview h2 {
          max-width: 820px;
          margin: 0;
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .termsOverview p {
          max-width: 900px;
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.75;
        }

        .termsPills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .termsPills span {
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

        .termsLayout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
          margin-top: 24px;
        }

        .termsSidebar {
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

        .termsSidebar > strong {
          font-size: 1.1rem;
        }

        .termsSidebar p {
          margin: 0;
          color: #6b7890;
          font-size: 0.83rem;
          line-height: 1.55;
        }

        .termsSidebar nav {
          display: grid;
          gap: 8px;
        }

        .termsSidebar a {
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

        .termsSections {
          display: grid;
          gap: 14px;
        }

        .termsSection {
          padding: clamp(22px, 3vw, 30px);
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(7, 27, 73, 0.04);
        }

        .termsSection h2 {
          margin: 0 0 14px;
          font-size: clamp(1.25rem, 2vw, 1.55rem);
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .termsSection p {
          margin: 0 0 10px;
          color: #5f6d86;
          font-size: 0.95rem;
          line-height: 1.72;
        }

        .termsSection p:last-child {
          margin-bottom: 0;
        }

        .termsSection a {
          color: #f72585;
          font-weight: 900;
        }

        .termsActions {
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

        .termsActions h2 {
          margin: 0;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          letter-spacing: -0.04em;
        }

        .termsActions p {
          margin: 8px 0 0;
          color: #66748c;
        }

        .termsActionLinks {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .termsActionLinks a {
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

        .termsActionLinks a:last-child {
          border: 1px solid rgba(7, 27, 73, 0.1);
          background: #ffffff;
          color: #071b49;
        }

        @media (max-width: 900px) {
          .termsHero {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .termsHeroMeta {
            width: fit-content;
          }

          .termsLayout {
            grid-template-columns: 1fr;
          }

          .termsSidebar {
            position: static;
          }

          .termsSidebar nav {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .termsActions {
            grid-template-columns: 1fr;
          }

          .termsActionLinks {
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .termsContainer {
            width: min(100% - 16px, 680px);
            padding: 10px 0 34px;
          }

          .termsTopbar {
            min-height: 54px;
            margin-bottom: 14px;
          }

          .termsBrand img {
            width: 92px;
          }

          .termsBackLink {
            min-height: 38px;
            padding: 0 13px;
            font-size: 0.72rem;
          }

          .termsHero {
            gap: 18px;
            padding: 24px 18px;
            border-radius: 22px;
          }

          .termsHero h1 {
            font-size: clamp(2.7rem, 14vw, 3.8rem);
            line-height: 0.94;
          }

          .termsHero p {
            margin-top: 16px;
            font-size: 0.92rem;
            line-height: 1.6;
          }

          .termsHeroMeta {
            min-width: 0;
            width: 100%;
            padding: 14px 16px;
            border-radius: 16px;
          }

          .termsOverview {
            margin-top: 14px;
            padding: 22px 18px;
            border-radius: 20px;
          }

          .termsOverview h2 {
            font-size: 1.8rem;
            line-height: 1.04;
          }

          .termsOverview p {
            margin-top: 14px;
            font-size: 0.9rem;
            line-height: 1.62;
          }

          .termsPills {
            gap: 8px;
            margin-top: 18px;
          }

          .termsPills span {
            min-height: 34px;
            font-size: 0.7rem;
          }

          .termsLayout {
            gap: 12px;
            margin-top: 12px;
          }

          .termsSidebar {
            padding: 16px;
            border-radius: 18px;
          }

          .termsSidebar nav {
            grid-template-columns: 1fr;
          }

          .termsSidebar a {
            min-height: 38px;
          }

          .termsSections {
            gap: 10px;
          }

          .termsSection {
            padding: 18px;
            border-radius: 18px;
          }

          .termsSection h2 {
            margin-bottom: 10px;
            font-size: 1.12rem;
          }

          .termsSection p {
            margin-bottom: 8px;
            font-size: 0.92rem;
            line-height: 1.62;
          }

          .termsActions {
            margin-top: 12px;
            padding: 20px 16px;
            border-radius: 18px;
          }

          .termsActions h2 {
            font-size: 1.65rem;
          }

          .termsActions p {
            font-size: 0.88rem;
            line-height: 1.55;
          }

          .termsActionLinks {
            display: grid;
            grid-template-columns: 1fr;
          }

          .termsActionLinks a {
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .termsHero h1 {
            font-size: 2.45rem;
          }

          .termsSection {
            padding: 16px;
          }

          .termsSection p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </main>
  );
}