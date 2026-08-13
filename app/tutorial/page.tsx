import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'How FromOne Works | Create, Review and Publish',
  description:
    'Learn how FromOne scans a business, creates posts, prepares media and supports Facebook, Instagram and Smiles workflows.',
  alternates: { canonical: '/tutorial' },
  openGraph: {
    title: 'How FromOne Works | Create, Review and Publish',
    description:
      'A simple walkthrough for scanning a business, creating posts, preparing media, publishing to social channels and sending suitable offers or events to Smiles.',
    url: '/tutorial',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'How FromOne creates ready-to-review social media posts',
      },
    ],
  },
};

const steps = [
  {
    number: "1",
    title: "Add your business",
    text: "Open Settings and add your business name, type, address, postcode and website. FromOne uses this information for your posts and Smilez listing.",
    link: "/settings",
    linkLabel: "Open Settings",
  },
  {
    number: "2",
    title: "Connect Facebook & Instagram",
    text: "In Settings, connect your Facebook and Instagram accounts once. You can skip this if you only want to use Smilez for now.",
    link: "/settings",
    linkLabel: "Connect accounts",
  },
  {
    number: "3",
    title: "Create your first post",
    text: "Open Create, add one photo, video or flyer, then choose AI draft or Manual. Press Create draft.",
    link: "/create",
    linkLabel: "Open Create",
  },
  {
    number: "4",
    title: "Check the draft",
    text: "Read the caption, change anything you want, then choose where it should go: Facebook, Instagram or Smilez.",
    link: "/posts",
    linkLabel: "Review drafts",
  },
  {
    number: "5",
    title: "Publish",
    text: "Press Publish now. FromOne sends the post to the destinations you selected.",
    link: "/create",
    linkLabel: "Create another post",
  },
  {
    number: "6",
    title: "Manage Smilez",
    text: "Use Smilez to manage bookings, reviews, customer photos, opening hours and customer insights.",
    link: "/smiles",
    linkLabel: "Open Smilez",
  },
];

export default function TutorialPage() {
  return (
    <main className="tutorialSimplePage">
      <PublicNav />

      <section className="tutorialSimpleShell">
        <header className="tutorialSimpleHero">
          <span>First time here?</span>
          <h1>How to use FromOne.</h1>
          <p>
            Follow these six steps. You do not need to set up everything at once.
          </p>
        </header>

        <section className="tutorialSimpleStart">
          <strong>Before you start</strong>
          <p>
            You only need your business details and one photo, video or flyer.
          </p>
        </section>

        <div className="tutorialSimpleSteps">
          {steps.map((step) => (
            <article className="tutorialSimpleStep" key={step.number}>
              <div className="tutorialSimpleNumber">{step.number}</div>

              <div className="tutorialSimpleContent">
                <h2>{step.title}</h2>
                <p>{step.text}</p>
                <Link href={step.link}>{step.linkLabel}</Link>
              </div>
            </article>
          ))}
        </div>

        <section className="tutorialSimpleDone">
          <span>That’s it</span>
          <h2>Create → Review → Publish.</h2>
          <p>
            Most of the time, that is the whole FromOne workflow.
          </p>

          <div className="tutorialSimpleActions">
            <Link href="/signin" className="primary">
              Start free demo
            </Link>
            <Link href="/dashboard" className="secondary">
              Open FromOne
            </Link>
          </div>
        </section>
      </section>

      <PublicFooter />

      <style>{`
        body:has(.tutorialSimplePage) {
          margin: 0;
          background: #ffffff !important;
          color: #071b49;
        }

        .tutorialSimplePage {
          min-height: 100vh;
          background: #ffffff;
          color: #071b49;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .tutorialSimpleShell {
          width: min(760px, calc(100% - 32px));
          margin: 0 auto;
          padding: 54px 0 72px;
        }

        .tutorialSimpleHero {
          margin-bottom: 22px;
        }

        .tutorialSimpleHero > span,
        .tutorialSimpleDone > span {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .tutorialSimpleHero h1 {
          margin: 0 0 10px;
          color: #071b49;
          font-size: clamp(2.5rem, 6vw, 4.2rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .tutorialSimpleHero p,
        .tutorialSimpleStart p,
        .tutorialSimpleStep p,
        .tutorialSimpleDone p {
          margin: 0;
          color: #66728a;
          font-size: 0.95rem;
          line-height: 1.5;
          font-weight: 600;
        }

        .tutorialSimpleStart {
          margin-bottom: 12px;
          padding: 13px 15px;
          border: 1px solid #ffd2e5;
          border-radius: 14px;
          background: #fffafd;
        }

        .tutorialSimpleStart strong {
          display: block;
          margin-bottom: 3px;
          font-size: 0.82rem;
          font-weight: 900;
        }

        .tutorialSimpleSteps {
          display: grid;
          gap: 8px;
        }

        .tutorialSimpleStep {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 12px;
          padding: 14px;
          border: 1px solid #dfe5f1;
          border-radius: 16px;
          background: #ffffff;
        }

        .tutorialSimpleNumber {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: #fff1f7;
          color: #c71363;
          font-size: 0.8rem;
          font-weight: 900;
        }

        .tutorialSimpleContent h2 {
          margin: 1px 0 5px;
          color: #071b49;
          font-size: 1rem;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .tutorialSimpleContent a {
          width: fit-content;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 9px;
          padding: 0 11px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font-size: 0.72rem;
          font-weight: 900;
          text-decoration: none;
        }

        .tutorialSimpleDone {
          margin-top: 14px;
          padding: 18px;
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #fbfcfe;
        }

        .tutorialSimpleDone h2 {
          margin: 0 0 6px;
          color: #071b49;
          font-size: 1.35rem;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .tutorialSimpleActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .tutorialSimpleActions a {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 15px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 900;
          text-decoration: none;
        }

        .tutorialSimpleActions .primary {
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff;
        }

        .tutorialSimpleActions .secondary {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49;
        }

        @media (max-width: 640px) {
          .tutorialSimpleShell {
            width: calc(100% - 20px);
            padding: 34px 0 54px;
          }

          .tutorialSimpleHero h1 {
            font-size: 2.35rem;
          }

          .tutorialSimpleStep {
            grid-template-columns: 36px minmax(0, 1fr);
            gap: 10px;
            padding: 12px;
          }

          .tutorialSimpleNumber {
            width: 34px;
            height: 34px;
          }

          .tutorialSimpleActions {
            display: grid;
          }

          .tutorialSimpleActions a {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}