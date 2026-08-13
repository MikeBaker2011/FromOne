"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

type DashboardCard = {
  title: string;
  description: string;
  href: string;
  eyebrow: string;
};

const primaryCards: DashboardCard[] = [
  {
    eyebrow: "Create",
    title: "Create content",
    description:
      "Upload a photo, video or flyer, write with AI or manually, review it and publish.",
    href: "/create",
  },
  {
    eyebrow: "Smilez",
    title: "Manage Smilez",
    description:
      "Manage your venue, offers, events and anything waiting for approval.",
    href: "/smiles",
  },
];

const quickLinks = [
  {
    title: "Business settings",
    description: "Business details and social connections",
    href: "/settings",
  },
  {
    title: "Plan",
    description: "Access and billing",
    href: "/subscription",
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
        <h1>What would you like to do?</h1>
        <p>Create content or manage your Smilez presence. Everything else is one tap away.</p>
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

      <section className="companion-primary-grid" aria-label="Main actions">
        {primaryCards.map((card) => (
          <Link href={card.href} key={card.href} className="companion-primary-card">
            <div>
              <span className="companion-card-eyebrow">{card.eyebrow}</span>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </div>

            <span className="companion-card-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      <section className="companion-quick-links" aria-label="Quick links">
        <div className="companion-quick-links-head">
          <span className="companion-card-eyebrow">Quick links</span>
        </div>

        <div className="companion-quick-links-grid">
          {quickLinks.map((item) => (
            <Link href={item.href} key={item.href} className="companion-quick-link">
              <div>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
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

        .companion-primary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 18px;
          background: #ffffff !important;
        }

        .companion-primary-card {
          min-height: 210px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          border: 1px solid #dfe5f1;
          border-radius: 22px;
          background: #ffffff;
          color: #071b49;
          text-decoration: none;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.045);
          transition: border-color 150ms ease, transform 150ms ease;
        }

        .companion-primary-card:hover {
          border-color: rgba(247, 37, 133, 0.5);
          transform: translateY(-1px);
        }

        .companion-card-eyebrow {
          display: block;
          margin-bottom: 10px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .companion-primary-card h2 {
          margin: 0 0 8px;
          color: #071b49;
          font-size: clamp(1.55rem, 2.4vw, 2rem);
          line-height: 1;
          letter-spacing: -0.045em;
          font-weight: 900;
        }

        .companion-primary-card p {
          max-width: 440px;
          margin: 0;
          color: #52617a;
          font-size: 0.94rem;
          line-height: 1.48;
          font-weight: 600;
        }

        .companion-card-arrow {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #ffd2e5;
          background: #fff7fb;
          color: #f72585;
          font-size: 1.1rem;
          font-weight: 900;
        }

        .companion-quick-links {
          padding: 18px 0 0;
          border-top: 1px solid #edf1f7;
        }

        .companion-quick-links-head {
          margin-bottom: 10px;
        }

        .companion-quick-links-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .companion-quick-link {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid #e3e8f1;
          border-radius: 16px;
          background: #ffffff;
          color: #071b49;
          text-decoration: none;
          transition: border-color 150ms ease;
        }

        .companion-quick-link:hover {
          border-color: rgba(247, 37, 133, 0.35);
        }

        .companion-quick-link > div {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .companion-quick-link strong {
          font-size: 0.92rem;
          font-weight: 850;
        }

        .companion-quick-link span {
          color: #738097;
          font-size: 0.76rem;
          line-height: 1.35;
        }

        .companion-quick-link > span:last-child {
          color: #f72585;
          font-size: 1rem;
          font-weight: 900;
        }

        @media (max-width: 1100px) {
          .companion-primary-grid {
            gap: 14px;
          }

          .companion-quick-links-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 820px) {
          body:has(.companion-home),
          body:has(.companion-home) .app-shell,
          body:has(.companion-home) .main-content,
          body:has(.companion-home) .main-content.fromone-mobile-bottom-safe,
          body:has(.companion-home) .fromone-universal-mobile-page-frame,
          .companion-home,
          .companion-primary-grid {
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

          .companion-primary-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .companion-primary-card {
            min-height: 160px;
            padding: 20px;
            border-radius: 20px;
          }

          .companion-quick-links-grid {
            grid-template-columns: 1fr;
            gap: 9px;
          }
        }

        @media (max-width: 520px) {
          .companion-home-header {
            margin-bottom: 18px;
          }

          .companion-home .page-eyebrow {
            margin-bottom: 9px;
            font-size: 0.7rem;
          }

          .companion-home-header h1 {
            margin-bottom: 10px;
            font-size: clamp(2rem, 10.6vw, 2.7rem);
            letter-spacing: -0.052em;
          }

          .companion-home-header p {
            font-size: 0.94rem;
          }

          .companion-setup-panel {
            margin-bottom: 18px;
            padding: 18px;
            border-radius: 20px;
          }

          .companion-setup-panel h2 {
            font-size: 1.5rem;
          }

          .companion-primary-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 16px;
          }

          .companion-primary-card {
            min-height: 142px;
            align-items: center;
            padding: 18px;
            border-radius: 18px;
          }

          .companion-primary-card h2 {
            margin-bottom: 7px;
            font-size: 1.38rem;
          }

          .companion-primary-card p {
            font-size: 0.88rem;
            line-height: 1.42;
          }

          .companion-card-arrow {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .companion-quick-links {
            padding-top: 14px;
          }

          .companion-quick-link {
            min-height: 64px;
            padding: 12px 14px;
            border-radius: 14px;
          }
        }

        @media (max-width: 360px) {
          .companion-primary-card {
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