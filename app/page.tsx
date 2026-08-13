import Link from "next/link";
import PublicNav from "./components/PublicNav";

export const metadata = {
  title: "FromOne | One upload. Posts, offers and events.",
  description:
    "FromOne turns business photos, videos and flyers into ready-to-review Facebook and Instagram posts, plus Smilez offers and events when relevant.",
};

const tutorialSteps = [
  {
    number: "1",
    title: "Add your business",
    text: "Add your business name, type, address, postcode and website in Settings.",
  },
  {
    number: "2",
    title: "Connect social accounts",
    text: "Connect Facebook and Instagram once. You can skip this if you only want to use Smilez.",
  },
  {
    number: "3",
    title: "Add one upload",
    text: "Open Create and add a photo, video or flyer.",
  },
  {
    number: "4",
    title: "Create the draft",
    text: "Choose AI draft or Manual, then create your post.",
  },
  {
    number: "5",
    title: "Review it",
    text: "Check the wording and choose Facebook, Instagram or Smilez.",
  },
  {
    number: "6",
    title: "Publish",
    text: "Press Publish now. FromOne sends it to the destinations you selected.",
  },
];

export default function HomePage() {
  return (
    <main className="foHomePage">
      <PublicNav />

      <section className="foHomeShell">
        <section className="foHero">
          <span className="foEyebrow">FROMONE + SMILEZ</span>
          <h1>One upload. Ready to publish.</h1>
          <p>
            Turn a photo, video or flyer into a ready-to-review post for
            Facebook, Instagram and Smilez.
          </p>

          <div className="foHeroActions">
            <Link href="/signin" className="primary">
              Start free demo
            </Link>
            <a href="#how-it-works" className="secondary">
              See how it works
            </a>
          </div>
        </section>

        <section className="foQuickFlow" aria-label="FromOne workflow">
          <div>
            <strong>1</strong>
            <span>Create</span>
          </div>
          <div>
            <strong>2</strong>
            <span>Review</span>
          </div>
          <div>
            <strong>3</strong>
            <span>Publish</span>
          </div>
        </section>

        <section id="how-it-works" className="foTutorial">
          <header className="foSectionHead">
            <span className="foEyebrow">FIRST TIME?</span>
            <h2>How to use FromOne.</h2>
            <p>Follow these six steps. You do not need to set up everything at once.</p>
          </header>

          <div className="foTutorialStart">
            <strong>Before you start</strong>
            <span>You only need your business details and one photo, video or flyer.</span>
          </div>

          <div className="foTutorialSteps">
            {tutorialSteps.map((step) => (
              <article key={step.number} className="foTutorialStep">
                <span className="foTutorialNumber">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="foTutorialDone">
            <strong>That’s it.</strong>
            <span>Create → Review → Publish.</span>
          </div>
        </section>

        <section className="foSmilez">
          <div>
            <span className="foEyebrow">SMILEZ</span>
            <h2>More than social posts.</h2>
            <p>
              Suitable offers and events can also go to Smilez, where customers
              can discover your business locally.
            </p>
          </div>

          <img src="/stockport-smiles-logo.png" alt="Smilez" />
        </section>

        <section className="foFinal">
          <div>
            <span className="foEyebrow">READY?</span>
            <h2>Start with one upload.</h2>
            <p>
              Add your business, upload something useful and create your first post.
            </p>
          </div>

          <Link href="/signin" className="primary">
            Start free demo
          </Link>
        </section>
      </section>


      <style>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #ffffff;
        }

        .foHomePage {
          min-height: 100vh;
          overflow-x: hidden;
          color: #071b49;
          background: #ffffff;
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

        .foHomeShell {
          width: min(820px, calc(100% - 32px));
          margin: 0 auto;
          padding: 54px 0 72px;
          display: grid;
          gap: 14px;
        }

        .foHero {
          padding: 8px 0 18px;
          text-align: center;
        }

        .foEyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .foHero h1 {
          max-width: 760px;
          margin: 0 auto;
          color: #071b49;
          font-size: clamp(3rem, 8vw, 5.8rem);
          line-height: 0.92;
          letter-spacing: -0.07em;
          font-weight: 900;
        }

        .foHero p,
        .foSectionHead p,
        .foSmilez p,
        .foFinal p {
          max-width: 660px;
          margin: 16px auto 0;
          color: #66728a;
          font-size: 1rem;
          line-height: 1.5;
          font-weight: 600;
        }

        .foHeroActions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 22px;
        }

        .foHeroActions a,
        .foFinal > a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 900;
          text-decoration: none;
        }

        .primary {
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff;
        }

        .secondary {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49;
        }

        .foQuickFlow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 10px;
          border: 1px solid #dfe5f1;
          border-radius: 16px;
          background: #fbfcfe;
        }

        .foQuickFlow div {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 10px;
          text-align: center;
          border-radius: 11px;
          background: #ffffff;
        }

        .foQuickFlow strong {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: #fff1f7;
          color: #c71363;
          font-size: 0.7rem;
          font-weight: 900;
        }

        .foQuickFlow span {
          color: #071b49;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .foTutorial,
        .foSmilez,
        .foFinal {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .foTutorial {
          padding: 18px;
          scroll-margin-top: 86px;
          text-align: center;
        }

        .foSectionHead h2,
        .foSmilez h2,
        .foFinal h2 {
          margin: 0;
          color: #071b49;
          font-size: clamp(1.8rem, 4vw, 2.7rem);
          line-height: 1;
          letter-spacing: -0.05em;
          font-weight: 900;
        }

        .foTutorialStart {
          display: grid;
          gap: 3px;
          text-align: center;
          margin: 16px 0 10px;
          padding: 12px 13px;
          border: 1px solid #ffd2e5;
          border-radius: 13px;
          background: #fffafd;
        }

        .foTutorialStart strong {
          font-size: 0.78rem;
          font-weight: 900;
        }

        .foTutorialStart span {
          color: #66728a;
          font-size: 0.75rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .foTutorialSteps {
          display: grid;
          gap: 7px;
        }

        .foTutorialStep {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 11px 0;
          text-align: left;
          border-bottom: 1px solid #edf1f7;
        }

        .foTutorialStep:last-child {
          border-bottom: 0;
        }

        .foTutorialNumber {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: #fff1f7;
          color: #c71363;
          font-size: 0.7rem;
          font-weight: 900;
        }

        .foTutorialStep h3 {
          margin: 1px 0 3px;
          color: #071b49;
          font-size: 0.9rem;
          line-height: 1.2;
          font-weight: 900;
        }

        .foTutorialStep p {
          margin: 0;
          color: #66728a;
          font-size: 0.78rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .foTutorialDone {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 10px;
          padding-top: 12px;
          border-top: 1px solid #edf1f7;
        }

        .foTutorialDone strong {
          font-size: 0.82rem;
          font-weight: 900;
        }

        .foTutorialDone span {
          color: #f72585;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .foSmilez {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: center;
          justify-items: center;
          padding: 18px;
          text-align: center;
        }

        .foSmilez img {
          width: min(180px, 60%);
          max-height: 90px;
          margin: 0 auto;
          display: block;
          justify-self: center;
          object-fit: contain;
        }

        .foFinal {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 18px;
          padding: 18px;
          background: #fbfcfe;
          text-align: center;
        }

        .foFinal p {
          margin-top: 7px;
          font-size: 0.85rem;
        }

        .foFinal > a {
          flex: 0 0 auto;
        }

        @media (max-width: 700px) {
          .foHomeShell {
            width: calc(100% - 20px);
            padding: 34px 0 54px;
          }

          .foHero h1 {
            font-size: clamp(2.8rem, 14vw, 4rem);
          }

          .foHero p {
            font-size: 0.94rem;
          }

          .foHeroActions {
            display: grid;
          }

          .foHeroActions a {
            width: 100%;
          }

          .foQuickFlow {
            grid-template-columns: 1fr;
          }

          .foSmilez {
            grid-template-columns: 1fr;
          }

          .foSmilez img {
            width: min(180px, 60%);
            margin: 0 auto;
            justify-self: center;
          }

          .foFinal {
            align-items: stretch;
            flex-direction: column;
          }

          .foFinal > a {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}