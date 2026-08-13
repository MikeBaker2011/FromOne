import Link from "next/link";
import PublicNav from "./components/PublicNav";

export const metadata = {
  title: "FromOne | One upload. Ready to publish.",
  description:
    "FromOne turns your photos, videos and flyers into ready-to-review posts for Facebook, Instagram and Smilez.",
};

export default function HomePage() {
  return (
    <main className="foHeroPage">
      <PublicNav />

      <section className="foHeroOnly">
        <div className="foHeroContent">
          <span className="foHeroEyebrow">FROMONE + SMILEZ</span>

          <h1>
            One upload.
            <br />
            <span>Ready to publish.</span>
          </h1>

          <p>
            Turn a photo, video or flyer into a ready-to-review post for
            Facebook, Instagram and Smilez.
          </p>

          <div className="foHeroActions">
            <Link href="/signin" className="foHeroPrimary">
              Start free demo
            </Link>

            <Link href="/signin" className="foHeroSecondary">
              Open FromOne
            </Link>
          </div>

          <div className="foHeroFlow" aria-label="FromOne workflow">
            <span>Create</span>
            <b>→</b>
            <span>Review</span>
            <b>→</b>
            <span>Publish</span>
          </div>
        </div>
      </section>

      <style>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #ffffff;
        }

        .foHeroPage {
          min-height: 100vh;
          overflow: hidden;
          color: #001b57;
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

        .foHeroOnly {
          position: relative;
          min-height: calc(100vh - 72px);
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 72px 24px 88px;
          background: #ffffff;
        }

        .foHeroContent {
          position: relative;
          z-index: 2;
          width: min(900px, 100%);
          margin: 0 auto;
          text-align: center;
        }

        .foHeroEyebrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          margin-bottom: 18px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(245, 0, 107, 0.08);
          color: #f5006b;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .foHeroContent h1 {
          margin: 0;
          color: #001b57;
          font-size: clamp(3.7rem, 9vw, 7.7rem);
          line-height: 0.88;
          letter-spacing: -0.075em;
          font-weight: 950;
          text-wrap: balance;
        }

        .foHeroContent h1,
        .foHeroContent h1 span {
          color: #000000;
          background: none;
          -webkit-background-clip: initial;
          background-clip: initial;
        }

        .foHeroContent > p {
          max-width: 650px;
          margin: 26px auto 0;
          color: #59677d;
          font-size: clamp(1.05rem, 2vw, 1.28rem);
          line-height: 1.55;
          font-weight: 650;
        }

        .foHeroActions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 30px;
        }

        .foHeroActions a {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: none;
        }

        .foHeroPrimary {
          border: 1px solid #f5006b;
          background: #f5006b;
          color: #ffffff;
        }

        .foHeroSecondary {
          border: 1px solid #dfe5f1;
          background: rgba(255, 255, 255, 0.9);
          color: #001b57;
        }

        .foHeroFlow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
          padding: 9px 13px;
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(8px);
        }

        .foHeroFlow span {
          color: #001b57;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .foHeroFlow b {
          color: #ff5a00;
          font-size: 0.76rem;
        }

        @media (max-width: 700px) {
          .foHeroOnly {
            min-height: calc(100vh - 64px);
            padding: 58px 18px 72px;
          }

          .foHeroContent h1 {
            font-size: clamp(3.1rem, 16vw, 4.8rem);
            line-height: 0.9;
          }

          .foHeroContent > p {
            margin-top: 20px;
            font-size: 0.98rem;
          }

          .foHeroActions {
            display: grid;
            grid-template-columns: 1fr;
            width: min(100%, 330px);
            margin-left: auto;
            margin-right: auto;
          }

          .foHeroActions a {
            width: 100%;
          }

          .foHeroFlow {
            gap: 7px;
            margin-top: 18px;
            padding: 8px 11px;
          }

          .foHeroFlow span {
            font-size: 0.68rem;
          }

        }
      `}</style>
    </main>
  );
}