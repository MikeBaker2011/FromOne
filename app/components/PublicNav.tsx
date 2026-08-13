"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setIsSignedIn(false);
        return;
      }

      setIsSignedIn(Boolean(data.user));
    } catch {
      setIsSignedIn(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const closeMenu = () => setOpen(false);

  return (
    <header className="publicAppNav">
      <div className="publicAppNavInner">
        <Link
          href={isSignedIn ? "/dashboard" : "/"}
          className="publicAppNavBrand"
          onClick={closeMenu}
          aria-label="FromOne home"
        >
          <img src="/fromone-logo.png" alt="FromOne" />
        </Link>

        <nav className="publicAppNavDesktop" aria-label="Main navigation">
          <Link href="/tutorial" onClick={closeMenu}>
            How it works
          </Link>

          <Link
            href={isSignedIn ? "/dashboard" : "/signin"}
            className="publicAppNavPrimary"
            onClick={closeMenu}
          >
            {checkingAuth
              ? "Checking…"
              : isSignedIn
                ? "Open FromOne"
                : "Start free demo"}
          </Link>
        </nav>

        <button
          type="button"
          className="publicAppNavMenu"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <svg
            className="publicAppNavMenuIcon"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 6.5H21" />
            <path d="M3 12H21" />
            <path d="M3 17.5H21" />
          </svg>
        </button>
      </div>

      <div className={open ? "publicAppMobileNav isOpen" : "publicAppMobileNav"}>
        <Link href="/tutorial" onClick={closeMenu}>
          How it works
        </Link>

        <Link
          href={isSignedIn ? "/dashboard" : "/signin"}
          className="publicAppNavPrimary"
          onClick={closeMenu}
        >
          {checkingAuth
            ? "Checking…"
            : isSignedIn
              ? "Open FromOne"
              : "Start free demo"}
        </Link>
      </div>

      <style jsx global>{`
        .publicAppNav {
          position: sticky !important;
          top: 0 !important;
          z-index: 1200 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-bottom: 1px solid #e4e9f1 !important;
          border-radius: 0 !important;
          background: rgba(255, 255, 255, 0.98) !important;
          background-image: none !important;
          box-shadow: none !important;
          backdrop-filter: blur(10px) !important;
        }

        .publicAppNavInner {
          width: min(100%, 1240px) !important;
          min-height: 72px !important;
          margin: 0 auto !important;
          padding: 0 20px !important;
          display: grid !important;
          grid-template-columns: auto minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 18px !important;
          box-sizing: border-box !important;
        }

        .publicAppNavBrand {
          display: inline-flex !important;
          align-items: center !important;
          min-width: 0 !important;
          justify-self: start !important;
          text-decoration: none !important;
        }

        .publicAppNavBrand img {
          display: block !important;
          width: clamp(145px, 13vw, 190px) !important;
          height: auto !important;
          max-height: 50px !important;
          object-fit: contain !important;
          object-position: left center !important;
        }

        .publicAppNavDesktop {
          justify-self: end !important;
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
        }

        .publicAppNavDesktop a,
        .publicAppMobileNav a {
          min-height: 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 12px !important;
          border: 1px solid transparent !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: #52617a !important;
          font-size: 0.82rem !important;
          font-weight: 850 !important;
          line-height: normal !important;
          text-decoration: none !important;
          box-shadow: none !important;
          white-space: nowrap !important;
        }

        .publicAppNavDesktop a:hover,
        .publicAppMobileNav a:hover {
          background: #f7f9fc !important;
          color: #071b49 !important;
        }

        .publicAppNavDesktop .publicAppNavPrimary,
        .publicAppMobileNav .publicAppNavPrimary {
          border-color: #f72585 !important;
          background: #f72585 !important;
          color: #ffffff !important;
        }

        .publicAppNavMenu {
          display: none !important;
        }

        .publicAppMobileNav {
          display: none !important;
        }

        @media (max-width: 860px) {
          .publicAppNavInner {
            grid-template-columns: minmax(0, 1fr) auto !important;
            min-height: 64px !important;
            padding: 0 12px !important;
            gap: 10px !important;
          }

          .publicAppNavBrand img {
            width: min(160px, 50vw) !important;
            max-height: 46px !important;
          }

          .publicAppNavDesktop {
            display: none !important;
          }

          .publicAppNavMenu,
          .publicAppNavMenu:hover,
          .publicAppNavMenu:focus,
          .publicAppNavMenu:focus-visible,
          .publicAppNavMenu:active {
            display: grid !important;
            grid-column: 2 !important;
            justify-self: end !important;
            place-items: center !important;
            width: 38px !important;
            height: 38px !important;
            min-width: 38px !important;
            min-height: 38px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            background-image: none !important;
            color: #071b49 !important;
            box-shadow: none !important;
            filter: none !important;
            outline: none !important;
            appearance: none !important;
            transform: none !important;
            cursor: pointer !important;
          }

          .publicAppNavMenuIcon {
            display: block !important;
            width: 24px !important;
            height: 24px !important;
            overflow: visible !important;
          }

          .publicAppNavMenuIcon path {
            fill: none !important;
            stroke: #071b49 !important;
            stroke-width: 2 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
            vector-effect: non-scaling-stroke !important;
          }

          .publicAppMobileNav.isOpen {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 6px !important;
            padding: 8px 12px 12px !important;
            border-top: 1px solid #edf1f6 !important;
            background: #ffffff !important;
          }

          .publicAppMobileNav a {
            width: 100% !important;
            min-height: 44px !important;
            justify-content: flex-start !important;
            padding: 0 14px !important;
            border: 1px solid #e3e9f2 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
          }

          .publicAppMobileNav .publicAppNavPrimary {
            justify-content: center !important;
            border-radius: 999px !important;
          }
        }
      `}</style>
    </header>
  );
}