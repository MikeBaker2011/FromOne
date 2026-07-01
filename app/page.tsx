import Link from "next/link";

export const metadata = {
  title: "FromOne | One upload. Facebook, Instagram and Smiles.",
  description:
    "FromOne turns business photos, videos and flyers into ready-to-review Facebook, Instagram and Smiles posts.",
};

export default function HomePage() {
  return (
    <main className="fo-page">
      <nav className="fo-nav" aria-label="FromOne landing navigation">
        <Link href="/" className="fo-brand" aria-label="FromOne home">
          <img src="/fromone-logo.png" alt="FromOne" />
          <span>
            <strong>FromOne</strong>
            <small>Upload it. Post it. Done.</small>
          </span>
        </Link>

        <div className="fo-nav-actions">
          <Link href="/signin" className="fo-nav-secondary">
            Open app
          </Link>
          <Link href="/signin" className="fo-nav-primary">
            Start 7-day trial
          </Link>
        </div>
      </nav>

      <section className="fo-hero">
        <div className="fo-hero-main">
          <p className="fo-eyebrow">FROMONE + SMILES</p>
          <h1>
            Turn one upload into posts, offers and events.
          </h1>
          <p className="fo-intro">
            FromOne creates ready-to-review Facebook and Instagram posts from
            your photos, videos and flyers. Suitable offers and events can also
            be sent to Smiles for approval.
          </p>

          <div className="fo-actions">
            <Link href="/signin" className="fo-primary">
              Start 7-day trial
            </Link>
            <Link href="/subscription" className="fo-secondary">
              View plans
            </Link>
          </div>
        </div>
      </section>

      <section className="fo-section fo-three">
        <article>
          <span>01</span>
          <h3>Upload anything useful</h3>
          <p>
            Add an image, video or flyer. FromOne understands the content and
            prepares a practical post.
          </p>
        </article>

        <article>
          <span>02</span>
          <h3>Review before posting</h3>
          <p>
            Captions, hashtags and calls to action are created for Facebook and
            Instagram. Nothing is published until it is checked.
          </p>
        </article>

        <article>
          <span>03</span>
          <h3>Publish or send</h3>
          <p>
            Publish to Facebook or Instagram after review. If the post is an
            offer or event, it can also be sent to Smiles for approval.
          </p>
        </article>
      </section>

      <section className="fo-section fo-smiles-sell">
        <div className="fo-smiles-copy">
          <p className="fo-eyebrow">WHY SMILES MATTERS</p>
          <h2>Social posts are seen. Smiles posts are found.</h2>
          <p>
            FromOne gives local offers and events a proper route into Smiles,
            with clear references, approval status and view links.
          </p>
        </div>

        <div className="fo-smiles-logo-card">
          <img src="/stockport-smiles-logo.png" alt="Smiles" />
        </div>
      </section>

      <section className="fo-section fo-proof">
        <div>
          <p className="fo-eyebrow">BUILT FOR REAL USERS</p>
          <h2>Big buttons. Clear steps. No accidental publishing.</h2>
        </div>

        <div className="fo-proof-list">
          <article>
            <strong>1</strong>
            <span>Add image, video or flyer</span>
          </article>
          <article>
            <strong>2</strong>
            <span>Choose Facebook, Instagram and Smiles</span>
          </article>
          <article>
            <strong>3</strong>
            <span>Check the wording and image</span>
          </article>
          <article>
            <strong>4</strong>
            <span>Publish to Facebook or Instagram, or send suitable posts to Smiles</span>
          </article>
        </div>
      </section>

      <section className="fo-final">
        <div>
          <p className="fo-eyebrow">START WITH ONE UPLOAD</p>
          <h2>Upload it. Post it. Done.</h2>
          <p>
            Create posts for Facebook and Instagram, and send suitable offers
            and events to Smiles.
          </p>
        </div>

        <Link href="/signin" className="fo-primary">
          Start 7-day trial
        </Link>
      </section>

      <style>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f7fb;
        }

        .fo-page {
          min-height: 100vh;
          padding: 24px;
          overflow-x: hidden;
          color: #071b49;
          background:
            radial-gradient(circle at 6% 0%, rgba(247, 37, 133, 0.16), transparent 32rem),
            radial-gradient(circle at 94% 3%, rgba(255, 193, 7, 0.24), transparent 30rem),
            linear-gradient(180deg, #f8f9fd 0%, #edf2f8 100%);
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        .fo-nav,
        .fo-hero,
        .fo-section,
        .fo-final {
          width: min(1180px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .fo-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
          padding: 14px;
          border: 1px solid #dfe5f1;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 18px 50px rgba(7, 27, 73, 0.08);
          backdrop-filter: blur(14px);
        }

        .fo-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #071b49;
          text-decoration: none;
        }

        .fo-brand img {
          width: 52px;
          height: 52px;
          object-fit: contain;
          border-radius: 16px;
          box-shadow: 0 14px 30px rgba(255, 193, 7, 0.24);
        }

        .fo-brand strong {
          display: block;
          font-size: 1.3rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.055em;
        }

        .fo-brand small {
          display: block;
          margin-top: 5px;
          color: #52617a;
          font-size: 0.8rem;
          line-height: 1;
          font-weight: 800;
        }

        .fo-nav-actions,
        .fo-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .fo-nav-primary,
        .fo-nav-secondary,
        .fo-primary,
        .fo-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 20px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        .fo-nav-primary,
        .fo-primary {
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff;
          box-shadow: 0 18px 42px rgba(247, 37, 133, 0.24);
        }

        .fo-nav-secondary,
        .fo-secondary {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49;
        }

        .fo-hero {
          display: block;
        }

        .fo-hero-main,
        .fo-section,
        .fo-final {
          border: 1px solid #dfe5f1;
          border-radius: 34px;
          background: #ffffff;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10);
        }

        .fo-hero-main {
          min-height: 560px;
          padding: clamp(42px, 5vw, 66px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          background:
            radial-gradient(circle at right, rgba(247, 37, 133, 0.10), transparent 38%),
            #ffffff;
        }

        .fo-eyebrow {
          margin: 0 0 14px;
          color: #f72585;
          font-size: 0.78rem;
          line-height: 1;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .fo-hero h1,
        .fo-section h2,
        .fo-final h2 {
          margin: 0;
          color: #071b49;
          font-weight: 850;
          letter-spacing: -0.067em;
          text-wrap: balance;
        }

        .fo-hero h1 {
          max-width: 980px;
          font-size: clamp(4.4rem, 7vw, 7.4rem);
          line-height: 0.88;
        }

        .fo-intro {
          max-width: 720px;
          margin: 28px 0 0;
          color: #52617a;
          font-size: clamp(1.12rem, 1.75vw, 1.4rem);
          line-height: 1.48;
          font-weight: 650;
        }

        .fo-actions {
          margin-top: 34px;
        }

        .fo-primary,
        .fo-secondary {
          min-height: 56px;
          padding: 0 26px;
        }

        .fo-section,
        .fo-final {
          margin-top: 18px;
          padding: clamp(32px, 4vw, 50px);
        }

        .fo-section h2,
        .fo-final h2 {
          max-width: 900px;
          font-size: clamp(2.8rem, 5vw, 4.8rem);
          line-height: 0.94;
        }

        .fo-section p,
        .fo-final p {
          margin: 0;
          color: #52617a;
          line-height: 1.48;
          font-weight: 650;
        }

        .fo-section > div > p:not(.fo-eyebrow),
        .fo-final p {
          margin-top: 16px;
          max-width: 760px;
          font-size: 1.06rem;
        }

        .fo-three {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .fo-three article,
        .fo-proof-list article,
        .fo-smiles-logo-card {
          min-width: 0;
          padding: 24px;
          border: 1px solid #dfe5f1;
          border-radius: 26px;
          background: #f7f9fd;
        }

        .fo-three span,
        .fo-proof-list strong {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          font-size: 0.84rem;
          font-weight: 900;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.18);
        }

        .fo-three h3 {
          margin: 20px 0 10px;
          color: #071b49;
          font-size: 1.48rem;
          line-height: 1.05;
          font-weight: 850;
          letter-spacing: -0.045em;
        }

        .fo-smiles-sell,
        .fo-proof,
        .fo-final {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 24px;
          align-items: center;
        }

        .fo-smiles-sell {
          background:
            radial-gradient(circle at right, rgba(247, 37, 133, 0.10), transparent 38%),
            #ffffff;
        }

        .fo-smiles-logo-card {
          background: #ffffff;
          box-shadow: 0 18px 50px rgba(7, 27, 73, 0.08);
        }

        .fo-smiles-logo-card img {
          width: 100%;
          max-height: 240px;
          object-fit: contain;
          display: block;
        }

        .fo-proof-list {
          display: grid;
          gap: 10px;
        }

        .fo-proof-list article {
          display: grid;
          grid-template-columns: 44px 1fr;
          align-items: center;
          gap: 14px;
          background: #ffffff;
        }

        .fo-proof-list span {
          color: #071b49;
          font-size: 1.08rem;
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: -0.025em;
        }

        .fo-final {
          background:
            radial-gradient(circle at right, rgba(247, 37, 133, 0.11), transparent 40%),
            #ffffff;
        }

        .fo-final .fo-primary {
          justify-self: end;
          min-width: 190px;
        }

        @media (max-width: 980px) {
          .fo-page {
            padding: 18px;
          }

          .fo-smiles-sell,
          .fo-proof,
          .fo-final {
            grid-template-columns: 1fr;
          }

          .fo-hero-main {
            min-height: auto;
          }

          .fo-three {
            grid-template-columns: 1fr;
          }

          .fo-final .fo-primary {
            justify-self: start;
          }
        }

        @media (max-width: 620px) {
          .fo-page {
            padding: 12px;
          }

          .fo-nav {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            border-radius: 24px;
          }

          .fo-brand {
            justify-content: center;
          }

          .fo-nav-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .fo-nav-primary,
          .fo-nav-secondary {
            width: 100%;
            padding: 0 12px;
          }

          .fo-hero-main,
          .fo-section,
          .fo-final {
            border-radius: 26px;
            padding: 24px;
          }

          .fo-hero h1 {
            font-size: clamp(3.1rem, 15vw, 4.8rem);
          }

          .fo-section h2,
          .fo-final h2 {
            font-size: clamp(2.4rem, 12vw, 3.65rem);
          }

          .fo-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .fo-primary,
          .fo-secondary,
          .fo-final .fo-primary {
            width: 100%;
            justify-self: stretch;
          }

        }
      `}</style>
    </main>
  );
}
