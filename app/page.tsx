import Link from "next/link";

export const metadata = {
  title: "FromOne | Social posts from your business content",
  description:
    "FromOne turns your business photos, videos and flyers into ready-to-review social media posts for Facebook, Instagram and TikTok.",
};

export default function HomePage() {
  return (
    <main className="fo-page">
      <nav className="fo-nav" aria-label="FromOne landing navigation">
        <Link href="/" className="fo-brand" aria-label="FromOne home">
          <img
            src="/fromone-logo.png"
            alt="FromOne"
            className="fo-logo-img"
          />
          <span>
            <strong>FromOne</strong>
            <small>Upload. Review. Publish.</small>
          </span>
        </Link>

        <div className="fo-nav-actions">
          <a
            href="mailto:info@fromone.co.uk?subject=FromOne beta tester"
            className="fo-nav-beta"
          >
            Join beta
          </a>

          <Link href="/signin" className="fo-nav-open">
            Open app
          </Link>
        </div>
      </nav>

      <section className="fo-hero">
        <div className="fo-hero-copy">
          <p className="fo-eyebrow">FROMONE FOR LOCAL BUSINESSES</p>

          <h1>Social posts from the content your business already has.</h1>

          <p className="fo-intro">
            FromOne turns your photos, videos and flyers into ready-to-review
            posts for Facebook, Instagram and TikTok.
          </p>

          <div className="fo-hero-actions">
            <Link href="/signin" className="fo-primary">
              Open the app
            </Link>

            <a
              href="mailto:info@fromone.co.uk?subject=FromOne beta tester"
              className="fo-secondary"
            >
              Apply to beta test
            </a>
          </div>

          <div className="fo-proof">
            <span>Upload photos, videos or flyers</span>
            <span>FromOne writes the post</span>
            <span>Review before anything goes live</span>
          </div>
        </div>
      </section>

      <section className="fo-section fo-explain">
        <div className="fo-section-head fo-section-head-centred">
          <p className="fo-eyebrow">WHAT FROMONE DOES</p>
          <h2>FromOne takes the pressure out of knowing what to post.</h2>
          <p>
            It reads the business context, looks at the uploaded media and
            creates a post the client can quickly review before anything goes
            live.
          </p>
        </div>

        <div className="fo-explain-grid">
          <article>
            <span>01</span>
            <h3>Your website shows who you are.</h3>
            <p>
              FromOne uses your business profile to understand your tone,
              services and customers.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>Your media shows what you do.</h3>
            <p>
              Upload photos, videos or flyers from the work your business is
              already doing.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>FromOne writes the post.</h3>
            <p>
              It creates the caption, call to action and hashtags so the post is
              ready to review.
            </p>
          </article>
        </div>
      </section>

      <section className="fo-section fo-how">
        <div className="fo-how-copy">
          <p className="fo-eyebrow">SIMPLE FLOW</p>
          <h2>Upload once. Review the post. Approve when ready.</h2>
          <p>
            FromOne keeps the process simple for business owners who want to
            post consistently without overthinking what to write.
          </p>
        </div>

        <div className="fo-steps">
          <article>
            <span>Upload</span>
            <strong>Add a photo, video or flyer.</strong>
          </article>

          <article>
            <span>Create</span>
            <strong>FromOne writes the caption, CTA and hashtags.</strong>
          </article>

          <article>
            <span>Review</span>
            <strong>Edit, improve and approve.</strong>
          </article>

          <article>
            <span>Schedule</span>
            <strong>Publish now or plan ahead.</strong>
          </article>
        </div>
      </section>

      <section className="fo-beta">
        <div>
          <p className="fo-eyebrow">BETA TESTERS</p>
          <h2>Beta spaces are open for local businesses.</h2>
          <p>
            We are inviting a small number of businesses to test FromOne before
            public launch and help shape the platform.
          </p>
        </div>

        <a
          href="mailto:info@fromone.co.uk?subject=FromOne beta tester"
          className="fo-beta-cta"
        >
          Join the beta
        </a>
      </section>

      <style>{`
        /* Phase 9 UI polish — Homepage / landing page */
        .fo-page {
          overflow-x: hidden;
        }

        .fo-nav {
          position: sticky;
          top: 18px;
          z-index: 20;
          padding: 12px;
          border-radius: 24px;
          background: rgba(5, 7, 13, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(18px);
        }

        .fo-logo-img {
          border-radius: 14px;
        }

        .fo-nav-actions a,
        .fo-hero-actions a,
        .fo-beta-cta {
          min-height: 46px;
        }

        .fo-hero-copy {
          position: relative;
          overflow: hidden;
        }

        .fo-hero-copy::before {
          content: "";
          position: absolute;
          inset: 24px;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          pointer-events: none;
        }

        .fo-hero-copy > * {
          position: relative;
          z-index: 1;
        }

        .fo-eyebrow {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-inline: auto;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.18);
        }

        .fo-hero-copy .fo-eyebrow {
          margin-bottom: 22px;
        }

        .fo-intro {
          max-width: 700px;
        }

        .fo-primary,
        .fo-beta-cta {
          background: linear-gradient(135deg, #ffd43b, #f7b733);
        }

        .fo-secondary,
        .fo-nav-open {
          background: rgba(255, 255, 255, 0.075);
        }

        .fo-proof {
          max-width: 780px;
        }

        .fo-proof span {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
        }

        .fo-section,
        .fo-beta {
          overflow: hidden;
        }

        .fo-section-head-centred .fo-eyebrow {
          margin-bottom: 16px;
        }

        .fo-explain-grid article,
        .fo-steps article {
          min-height: 190px;
          display: grid;
          align-content: start;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .fo-explain-grid article:hover,
        .fo-steps article:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 212, 59, 0.22);
          background: rgba(5, 7, 13, 0.56);
        }

        .fo-explain-grid article p,
        .fo-steps article strong {
          text-wrap: pretty;
        }

        .fo-how-copy .fo-eyebrow {
          margin-inline: 0;
        }

        .fo-steps article {
          min-height: 138px;
        }

        .fo-beta {
          background:
            radial-gradient(circle at right, rgba(255, 212, 59, 0.14), transparent 38%),
            rgba(13, 16, 24, 0.88);
        }

        .fo-beta .fo-eyebrow {
          margin-inline: 0;
        }

        .fo-beta-cta {
          min-width: 170px;
        }

        @media (max-width: 980px) {
          .fo-nav {
            top: 10px;
            margin-bottom: 24px;
          }

          .fo-how-copy .fo-eyebrow,
          .fo-beta .fo-eyebrow {
            margin-inline: auto;
          }

          .fo-how,
          .fo-beta {
            text-align: center;
          }

          .fo-beta-cta {
            width: fit-content;
            margin-inline: auto;
          }

          .fo-explain-grid article,
          .fo-steps article {
            min-height: 0;
          }
        }

        @media (max-width: 560px) {
          .fo-page {
            padding: 12px;
          }

          .fo-nav {
            position: static;
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .fo-brand {
            width: 100%;
            justify-content: center;
            text-align: left;
          }

          .fo-nav-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .fo-nav-beta,
          .fo-nav-open {
            width: 100%;
            padding-inline: 12px;
          }

          .fo-hero-copy::before {
            inset: 12px;
            border-radius: 20px;
          }

          .fo-proof {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .fo-proof span {
            justify-content: center;
            text-align: center;
          }

          .fo-beta-cta {
            width: 100%;
          }
        }


        :root {
          color-scheme: dark;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #05070d;
        }

        .fo-page {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.16), transparent 34rem),
            radial-gradient(circle at 82% 10%, rgba(255, 212, 59, 0.08), transparent 34rem),
            linear-gradient(180deg, #05070d 0%, #070a12 100%);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .fo-nav,
        .fo-hero,
        .fo-section,
        .fo-beta {
          width: min(1180px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .fo-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 58px;
        }

        .fo-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #f8fafc;
          text-decoration: none;
        }

        .fo-logo-img {
          width: 46px;
          height: 46px;
          display: block;
          object-fit: contain;
          filter: drop-shadow(0 18px 34px rgba(255, 212, 59, 0.18));
        }

        .fo-brand strong {
          display: block;
          font-size: 1.28rem;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.065em;
        }

        .fo-brand small {
          display: block;
          margin-top: 6px;
          color: rgba(248, 250, 252, 0.62);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .fo-nav-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .fo-nav-beta,
        .fo-nav-open,
        .fo-primary,
        .fo-secondary,
        .fo-beta-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 1000;
          letter-spacing: -0.035em;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .fo-nav-beta,
        .fo-nav-open {
          min-height: 44px;
          padding: 0 18px;
          font-size: 0.95rem;
        }

        .fo-nav-beta {
          color: #ffd43b;
          border: 1px solid rgba(255, 212, 59, 0.24);
          background: rgba(255, 212, 59, 0.08);
        }

        .fo-nav-open {
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
        }

        .fo-hero {
          display: block;
        }

        .fo-hero-copy,
        .fo-section,
        .fo-beta {
          border: 1px solid rgba(255, 212, 59, 0.18);
          background:
            linear-gradient(135deg, rgba(255, 212, 59, 0.08), transparent 38%),
            rgba(13, 16, 24, 0.86);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(18px);
        }

        .fo-hero-copy {
          border-radius: 34px;
          padding: clamp(42px, 7vw, 82px);
          min-height: 600px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .fo-eyebrow {
          margin: 0 0 18px;
          color: #ffd43b;
          font-size: 0.76rem;
          font-weight: 1000;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3,
        p {
          text-wrap: balance;
        }

        h1 {
          margin: 0;
          max-width: 980px;
          font-size: clamp(3.6rem, 7.4vw, 7.4rem);
          line-height: 0.9;
          letter-spacing: -0.09em;
          font-weight: 1000;
        }

        .fo-intro {
          max-width: 760px;
          margin: 28px auto 0;
          color: rgba(248, 250, 252, 0.74);
          font-size: clamp(1.1rem, 1.7vw, 1.38rem);
          line-height: 1.48;
          font-weight: 780;
        }

        .fo-hero-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 34px;
        }

        .fo-primary,
        .fo-secondary,
        .fo-beta-cta {
          min-height: 54px;
          padding: 0 24px;
        }

        .fo-primary {
          background: #ffd43b;
          color: #05070d;
          box-shadow: 0 18px 40px rgba(255, 212, 59, 0.22);
        }

        .fo-secondary {
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
        }

        .fo-primary:hover,
        .fo-secondary:hover,
        .fo-nav-beta:hover,
        .fo-nav-open:hover,
        .fo-beta-cta:hover {
          transform: translateY(-2px);
        }

        .fo-proof {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 34px;
        }

        .fo-proof span {
          border-radius: 999px;
          padding: 10px 13px;
          color: rgba(248, 250, 252, 0.72);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.86rem;
          font-weight: 850;
        }

        .fo-section {
          margin-top: 24px;
          border-radius: 34px;
          padding: clamp(28px, 4vw, 42px);
        }

        .fo-section-head {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr);
          gap: 26px;
          align-items: end;
        }

        .fo-section-head-centred {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 860px;
          margin: 0 auto;
        }

        .fo-section-head-centred h2 {
          max-width: 820px;
        }

        .fo-section-head-centred p:not(.fo-eyebrow) {
          max-width: 720px;
          margin: 18px auto 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.52;
          font-size: 1.08rem;
          font-weight: 760;
        }

        .fo-section h2,
        .fo-how-copy h2,
        .fo-beta h2 {
          margin: 0;
          font-size: clamp(2.6rem, 4.5vw, 4.6rem);
          line-height: 0.92;
          letter-spacing: -0.085em;
          font-weight: 1000;
        }

        .fo-explain-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 34px;
        }

        .fo-explain-grid article,
        .fo-steps article {
          border-radius: 24px;
          padding: 22px;
          background: rgba(5, 7, 13, 0.46);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fo-explain-grid span {
          display: inline-flex;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          align-items: center;
          justify-content: center;
          background: rgba(255, 212, 59, 0.12);
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 1000;
        }

        .fo-explain-grid h3 {
          margin: 20px 0 0;
          font-size: 1.35rem;
          line-height: 1.04;
          letter-spacing: -0.055em;
          font-weight: 1000;
        }

        .fo-explain-grid p,
        .fo-how-copy p,
        .fo-beta p {
          margin: 12px 0 0;
          color: rgba(248, 250, 252, 0.66);
          line-height: 1.5;
          font-weight: 760;
        }

        .fo-how {
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 26px;
          align-items: center;
        }

        .fo-steps {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .fo-steps span {
          display: block;
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 1000;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .fo-steps strong {
          display: block;
          margin-top: 16px;
          font-size: 1.25rem;
          line-height: 1.08;
          letter-spacing: -0.05em;
          font-weight: 1000;
        }

        .fo-beta {
          margin-top: 24px;
          border-radius: 34px;
          padding: clamp(28px, 4vw, 42px);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
        }

        .fo-beta p {
          max-width: 720px;
        }

        .fo-beta-cta {
          color: #05070d;
          background: #ffd43b;
          white-space: nowrap;
        }

        @media (max-width: 980px) {
          .fo-page {
            padding: 18px;
          }

          .fo-nav {
            margin-bottom: 30px;
          }

          .fo-section-head,
          .fo-how,
          .fo-beta {
            grid-template-columns: 1fr;
          }

          .fo-section-head-centred {
            display: flex;
          }

          .fo-hero-copy {
            min-height: auto;
          }

          .fo-explain-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .fo-nav {
            align-items: flex-start;
          }

          .fo-nav-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .fo-hero-copy,
          .fo-section,
          .fo-beta {
            border-radius: 26px;
            padding: 24px;
          }

          h1 {
            font-size: clamp(3rem, 15vw, 4.9rem);
          }

          .fo-hero-actions,
          .fo-steps {
            display: grid;
            grid-template-columns: 1fr;
          }

          .fo-primary,
          .fo-secondary,
          .fo-beta-cta {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
