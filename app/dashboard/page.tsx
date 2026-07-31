"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

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
    description:
      "Upload a photo, video or flyer and prepare content for Facebook, Instagram or Smilez.",
    href: "/create",
    status: "Start creating",
  },
  {
    eyebrow: "Posts",
    title: "Review your posts",
    description:
      "Check drafts, make changes and publish approved content to Facebook or Instagram.",
    href: "/posts",
    status: "Open review queue",
  },
  {
    eyebrow: "Smilez",
    title: "Manage your Smilez presence",
    description:
      "Check your listing, offers, events and anything waiting for approval.",
    href: "/smiles",
    status: "Open Smilez",
  },
  {
    eyebrow: "Reports",
    title: "See social performance",
    description:
      "Review publishing activity and Facebook or Instagram results.",
    href: "/reports",
    status: "View reports",
  },
  {
    eyebrow: "Business",
    title: "Update your business",
    description:
      "Keep business details, contact information and social connections up to date.",
    href: "/settings",
    status: "Open business settings",
  },
  {
    eyebrow: "Plan",
    title: "Manage your plan",
    description:
      "Check access, billing status and your current FromOne plan.",
    href: "/subscription",
    status: "View plan",
  },
];

export default function DashboardPage() {
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupComplete, setSetupComplete] = useState(true);
  const [missingSetupItems, setMissingSetupItems] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const checkBusinessSetup = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;

        if (!userId) {
          if (active) {
            setSetupComplete(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("business_profiles")
          .select("business_name, industry, location, services")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Dashboard setup check error:", error.message);
          return;
        }

        const missingItems: string[] = [];

        if (!data?.business_name?.trim()) {
          missingItems.push("Add your business name");
        }

        if (!data?.industry?.trim()) {
          missingItems.push("Choose your business type");
        }

        if (!data?.location?.trim()) {
          missingItems.push("Add your business location");
        }

        if (!Array.isArray(data?.services) || data.services.length === 0) {
          missingItems.push("Add at least one service");
        }

        if (active) {
          setMissingSetupItems(missingItems);
          setSetupComplete(missingItems.length === 0);
        }
      } finally {
        if (active) {
          setCheckingSetup(false);
        }
      }
    };

    checkBusinessSetup();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="companion-home">
      <header className="companion-home-header">
        <div className="page-eyebrow">FromOne companion</div>
        <h1>Manage your content, business and online presence.</h1>
        <p>
          Choose what you need to do. FromOne keeps your content, Smilez workspace,
          reporting and business details together.
        </p>
      </header>

      {!checkingSetup && !setupComplete && (
        <section className="companion-setup-panel" aria-label="Business setup">
          <div>
            <span className="companion-setup-eyebrow">Finish your setup</span>
            <h2>Complete your business profile.</h2>
            <p>
              Your profile is nearly ready. Complete the items below so FromOne can
              create better content and prepare your Smilez presence correctly.
            </p>

            <div className="companion-setup-checklist">
              <strong>Still needed:</strong>
              <ul>
                {missingSetupItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <Link href="/settings?setup=business">
            Finish setting up your business
          </Link>
        </section>
      )}

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

        .companion-setup-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          margin: 0 0 24px;
          padding: 26px 28px;
          border: 1px solid #ffd2e5;
          border-radius: 24px;
          background: #fff7fb;
          box-shadow: 0 14px 34px rgba(7, 27, 73, 0.05);
        }

        .companion-setup-panel > div {
          max-width: 760px;
        }

        .companion-setup-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .companion-setup-panel h2 {
          margin: 0 0 8px;
          color: #071b49;
          font-size: clamp(1.65rem, 3vw, 2.35rem);
          line-height: 1;
          letter-spacing: -0.045em;
          font-weight: 900;
        }

        .companion-setup-panel p {
          margin: 0;
          color: #52617a;
          font-size: 0.96rem;
          line-height: 1.55;
          font-weight: 600;
        }

        .companion-setup-checklist {
          margin-top: 16px;
          padding: 15px 17px;
          border: 1px solid #ffd2e5;
          border-radius: 17px;
          background: #ffffff;
        }

        .companion-setup-checklist strong {
          display: block;
          margin-bottom: 8px;
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .companion-setup-checklist ul {
          display: grid;
          gap: 7px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .companion-setup-checklist li {
          position: relative;
          padding-left: 21px;
          color: #52617a;
          font-size: 0.9rem;
          line-height: 1.4;
          font-weight: 700;
        }

        .companion-setup-checklist li::before {
          content: "";
          position: absolute;
          top: 0.52em;
          left: 2px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #f72585;
          transform: translateY(-50%);
        }

        .companion-setup-panel > a {
          min-height: 48px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff !important;
          font-size: 0.84rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 12px 26px rgba(247, 37, 133, 0.2);
          white-space: nowrap;
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
          transition: transform 160ms ease, border-color 160ms ease,
            box-shadow 160ms ease;
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
          min-height: 46px;
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 17px;
          border: 0;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(247, 37, 133, 0.21);
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

          .companion-setup-panel {
            align-items: stretch;
            flex-direction: column;
            gap: 20px;
            padding: 22px;
            border-radius: 22px;
          }

          .companion-setup-panel > a {
            width: 100%;
            box-sizing: border-box;
            white-space: normal;
            text-align: center;
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

          .companion-setup-panel {
            margin-bottom: 18px;
            padding: 18px;
            border-radius: 20px;
          }

          .companion-setup-panel h2 {
            font-size: 1.55rem;
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