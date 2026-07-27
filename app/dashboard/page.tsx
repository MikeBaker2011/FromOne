"use client";

import Link from "next/link";

type DashboardCard = {
  title: string;
  description: string;
  href: string;
  status: string;
  eyebrow: string;
};

const cards: DashboardCard[] = [
  {
    eyebrow: "Create",
    title: "Create content",
    description: "Upload a photo, video or flyer and prepare content for Facebook, Instagram or Smilez.",
    href: "/create",
    status: "Start creating",
  },
  {
    eyebrow: "Posts",
    title: "Review your posts",
    description: "Check drafts, make changes and publish approved content to Facebook or Instagram.",
    href: "/posts",
    status: "Open review queue",
  },
  {
    eyebrow: "Bookings",
    title: "Manage bookings",
    description: "See new customer bookings, confirm details and keep on top of upcoming visits.",
    href: "/smiles/bookings",
    status: "View bookings",
  },
  {
    eyebrow: "Smilez",
    title: "Manage your Smilez presence",
    description: "Check your listing, offers, events and anything waiting for approval.",
    href: "/smiles",
    status: "Open Smilez",
  },
  {
    eyebrow: "Insights",
    title: "See customer activity",
    description: "Review real bookings, reviews, customer photos, offers and events connected to your Smilez listing.",
    href: "/insights",
    status: "View customer insights",
  },
  {
    eyebrow: "Reports",
    title: "See what is working",
    description: "Review publishing activity and Facebook or Instagram performance.",
    href: "/reports",
    status: "View reports",
  },
  {
    eyebrow: "Business",
    title: "Update your business",
    description: "Keep business details, contact information and social connections up to date.",
    href: "/settings",
    status: "Open business settings",
  },
  {
    eyebrow: "Plan",
    title: "Manage your plan",
    description: "Check access, billing status and your current FromOne plan.",
    href: "/subscription",
    status: "View plan",
  },
];

export default function DashboardPage() {
  return (
    <main className="companion-home">
      <header className="companion-home-header">
        <div className="page-eyebrow">FromOne companion</div>
        <h1>Manage your Smilez presence and social content.</h1>
        <p>
          Choose what you need to do. FromOne keeps your posts, bookings,
          Smilez activity and business details together.
        </p>
      </header>

      <section className="companion-card-grid" aria-label="FromOne sections">
        {cards.map((card, index) => (
          <Link href={card.href} key={card.href} className="companion-dashboard-card">
            <div className="companion-card-top">
              <span className="companion-card-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="companion-card-eyebrow">{card.eyebrow}</span>
            </div>

            <div>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </div>

            <span className="companion-card-action">{card.status}</span>
          </Link>
        ))}
      </section>

      <style jsx global>{`
        body:has(.companion-home),
        body:has(.companion-home) .app-shell,
        body:has(.companion-home) .main-content,
        body:has(.companion-home) .main-content.fromone-mobile-bottom-safe,
        body:has(.companion-home) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        .companion-home {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          background: #ffffff !important;
          color: #071b49;
          font-family: var(--font-main), "Plus Jakarta Sans", ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .companion-home-header {
          max-width: 760px;
          margin-bottom: 28px;
        }

        .companion-home .page-eyebrow {
          margin-bottom: 12px;
          color: #f72585;
          font-size: 0.78rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .companion-home-header h1 {
          margin: 0 0 16px;
          color: #071b49;
          font-size: clamp(2.55rem, 5vw, 4.25rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .companion-home-header p {
          max-width: 690px;
          margin: 0;
          color: #52617a;
          font-size: 1.05rem;
          line-height: 1.58;
          font-weight: 600;
        }

        .companion-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          background: #ffffff !important;
        }

        .companion-dashboard-card {
          min-height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
          padding: 26px;
          border: 1px solid #dfe5f1;
          border-radius: 24px;
          background: #ffffff;
          color: #071b49;
          text-decoration: none;
          box-shadow: 0 14px 36px rgba(7, 27, 73, 0.06);
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        }

        .companion-dashboard-card:hover {
          transform: translateY(-2px);
          border-color: #f72585;
          box-shadow: 0 18px 44px rgba(7, 27, 73, 0.1);
        }

        .companion-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .companion-card-number {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 900;
        }

        .companion-card-eyebrow {
          color: #f72585;
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .companion-dashboard-card h2 {
          margin: 0 0 10px;
          color: #071b49;
          font-size: clamp(1.55rem, 2.4vw, 2.05rem);
          line-height: 1;
          letter-spacing: -0.045em;
          font-weight: 900;
        }

        .companion-dashboard-card p {
          margin: 0;
          color: #52617a;
          font-size: 0.98rem;
          line-height: 1.5;
          font-weight: 600;
        }

        .companion-card-action {
          min-height: 44px;
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 999px;
          background: #fff1f7;
          color: #c71363;
          border: 1px solid #ffd2e5;
          font-size: 0.86rem;
          font-weight: 900;
        }

        @media (max-width: 1100px) {
          .companion-card-grid {
            gap: 16px;
          }
        }

        @media (max-width: 820px) {
          body:has(.companion-home),
          body:has(.companion-home) .app-shell,
          body:has(.companion-home) .main-content,
          body:has(.companion-home) .main-content.fromone-mobile-bottom-safe,
          body:has(.companion-home) .fromone-universal-mobile-page-frame,
          .companion-home,
          .companion-card-grid {
            background: #ffffff !important;
            background-image: none !important;
          }

          .companion-home-header {
            max-width: 100%;
            margin-bottom: 22px;
          }

          .companion-home-header h1 {
            font-size: clamp(2.25rem, 8.5vw, 3.4rem);
            line-height: 0.98;
          }

          .companion-home-header p {
            font-size: 1rem;
            line-height: 1.5;
          }

          .companion-card-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .companion-dashboard-card {
            min-height: 0;
            gap: 18px;
            padding: 22px;
            border-radius: 22px;
          }
        }

        @media (max-width: 520px) {
          .companion-home-header {
            margin-bottom: 18px;
          }

          .companion-home .page-eyebrow {
            margin-bottom: 10px;
            font-size: 0.72rem;
          }

          .companion-home-header h1 {
            margin-bottom: 12px;
            font-size: clamp(2rem, 11vw, 2.75rem);
            letter-spacing: -0.052em;
          }

          .companion-home-header p {
            font-size: 0.95rem;
          }

          .companion-card-grid {
            gap: 12px;
          }

          .companion-dashboard-card {
            min-height: 0;
            gap: 16px;
            padding: 18px;
            border-radius: 20px;
          }

          .companion-card-top {
            gap: 10px;
          }

          .companion-card-number {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            font-size: 0.74rem;
          }

          .companion-card-eyebrow {
            font-size: 0.7rem;
          }

          .companion-dashboard-card h2 {
            margin-bottom: 8px;
            font-size: 1.45rem;
          }

          .companion-dashboard-card p {
            font-size: 0.92rem;
            line-height: 1.45;
          }

          .companion-card-action {
            width: 100%;
            min-height: 46px;
            padding: 0 14px;
            box-sizing: border-box;
          }
        }

        @media (max-width: 360px) {
          .companion-dashboard-card {
            padding: 16px;
          }

          .companion-home-header h1 {
            font-size: 1.9rem;
          }
        }
      `}</style>
    </main>
  );
}