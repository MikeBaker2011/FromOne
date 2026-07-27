"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { usePathname, useRouter } from "next/navigation";

const protectedRoutes = [
  "/dashboard",
  "/create",
  "/posts",
  "/reports",
  "/settings",
  "/subscription",
  "/smiles",
];

const publicMarketingRoutes = [
  "/",
  "/signin",
  "/reset-password",
  "/tutorial",
  "/product-updates",
  "/pricing",
  "/privacy",
  "/terms",
  "/cookies",
  "/cookie-policy",
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const accessCheckedOnceRef = useRef(false);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isProtectedRoute = () => {
    return protectedRoutes.some((route) => pathname.startsWith(route));
  };

  const isPublicMarketingRoute = () => {
    return publicMarketingRoutes.some((route) => {
      if (route === "/") return pathname === "/";
      return pathname === route || pathname.startsWith(`${route}/`);
    });
  };

  const shouldShowAppShell = () => {
    return !isPublicMarketingRoute();
  };

  const createTrialDates = () => {
    const started = new Date();
    const ends = new Date();

    ends.setDate(started.getDate() + 7);

    return {
      trial_started_at: started.toISOString(),
      trial_ends_at: ends.toISOString(),
    };
  };

  const finishAccessCheck = () => {
    accessCheckedOnceRef.current = true;
    setCheckingAccess(false);
  };

  const handleInvalidSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("Sign out after invalid session failed:", error);
    }

    finishAccessCheck();

    if (isProtectedRoute()) {
      router.replace("/signin");
    }
  };

  const checkAccess = async () => {
    if (!isProtectedRoute()) {
      finishAccessCheck();
      return;
    }

    if (!accessCheckedOnceRef.current) {
      setCheckingAccess(true);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.warn("Auth access check error:", authError.message);

      if (
        authError.message.includes("Invalid Refresh Token") ||
        authError.message.includes("Refresh Token Not Found")
      ) {
        await handleInvalidSession();
        return;
      }

      finishAccessCheck();
      router.replace("/signin");
      return;
    }

    const user = authData.user;

    if (!user) {
      finishAccessCheck();
      router.replace("/signin");
      return;
    }

    const { data: billing, error } = await supabase
      .from("user_billing")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Billing access check error:", error.message);
      finishAccessCheck();
      router.replace("/subscription");
      return;
    }

    if (!billing) {
      const trialDates = createTrialDates();

      const { error: insertError } = await supabase
        .from("user_billing")
        .insert({
          user_id: user.id,
          plan: "demo",
          status: "trialing",
          trial_started_at: trialDates.trial_started_at,
          trial_ends_at: trialDates.trial_ends_at,
          is_trial_override: false,
          override_reason: null,
          manual_access_until: null,
          paypal_subscription_id: null,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Create trial error:", insertError.message);
        finishAccessCheck();
        router.replace("/subscription");
        return;
      }

      finishAccessCheck();
      return;
    }

    const now = new Date();

    const plan = String(billing.plan || "demo").toLowerCase();
    const status = String(billing.status || "trialing").toLowerCase();
    const trialEndsAt = billing.trial_ends_at
      ? new Date(billing.trial_ends_at)
      : null;
    const manualAccessUntil = billing.manual_access_until
      ? new Date(billing.manual_access_until)
      : null;

    const hasBetaAccess = status === "beta" || plan === "beta";

    const hasActivePaidPlan =
      (plan === "starter" || plan === "pro") && status === "active";

    const hasActiveTrial =
      plan === "demo" &&
      status === "trialing" &&
      trialEndsAt &&
      trialEndsAt.getTime() > now.getTime();

    const hasManualOverride =
      status === "manual" &&
      manualAccessUntil &&
      manualAccessUntil.getTime() > now.getTime();

    const hasAccess =
      hasBetaAccess || hasActivePaidPlan || hasActiveTrial || hasManualOverride;

    if (!hasAccess) {
      const expiredUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (plan === "demo" && status === "trialing") {
        expiredUpdate.status = "expired";
      }

      if (Object.keys(expiredUpdate).length > 1) {
        await supabase
          .from("user_billing")
          .update(expiredUpdate)
          .eq("user_id", user.id);
      }

      finishAccessCheck();

      if (!pathname.startsWith("/subscription")) {
        router.replace("/subscription");
      }

      return;
    }

    finishAccessCheck();
  };

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setMenuOpen(false);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error.message);
      }
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      router.replace("/signin");
      router.refresh();
      setSigningOut(false);
    }
  };

  const getRouteClassName = () => {
    if (pathname.startsWith("/dashboard")) return "fromone-route-dashboard";
    if (pathname.startsWith("/create")) return "fromone-route-create";
    if (pathname.startsWith("/posts")) return "fromone-route-posts";
    if (pathname.startsWith("/reports")) return "fromone-route-reports";
    if (pathname.startsWith("/settings")) return "fromone-route-settings";
    if (pathname.startsWith("/subscription"))
      return "fromone-route-subscription";
    if (pathname.startsWith("/billing")) return "fromone-route-billing";
    if (pathname.startsWith("/smiles")) return "fromone-route-smiles";

    return "";
  };

  if (!shouldShowAppShell()) {
    return <>{children}</>;
  }

  if ((isProtectedRoute() && checkingAccess) || signingOut) {
    return (
      <div className="fromone-auth-transition" role="status" aria-live="polite">
        <img src="/fromone-logo.png" alt="FromOne" width={220} height={68} />
        <p>{signingOut ? "Signing you out..." : "Checking your access..."}</p>

        <style jsx global>{`
          html,
          body {
            margin: 0;
            min-height: 100%;
            background: #f4f7fb !important;
          }

          .fromone-auth-transition {
            min-height: 100vh;
            display: grid;
            place-content: center;
            justify-items: center;
            gap: 16px;
            padding: 24px;
            box-sizing: border-box;
            background: #f4f7fb;
            color: #071b49;
            text-align: center;
          }

          .fromone-auth-transition img {
            width: min(220px, 70vw);
            height: auto;
            object-fit: contain;
          }

          .fromone-auth-transition p {
            margin: 0;
            color: #52617a;
            font-size: 0.95rem;
            font-weight: 800;
          }
        `}</style>
      </div>
    );
  }

  const primaryLinks = [
    { href: "/dashboard", label: "Home" },
    { href: "/create", label: "Create" },
    { href: "/posts", label: "Posts" },
    { href: "/smiles", label: "Smilez" },
    { href: "/reports", label: "Track my social" },
  ];

  const secondaryLinks = [
    { href: "/settings", label: "Business" },
    { href: "/subscription", label: "Plan" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/smiles") return pathname === "/smiles";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="fromone-navbar">
        <div className="fromone-navbar-inner">
          <Link
            href="/dashboard"
            className="fromone-navbar-brand"
            onClick={() => setMenuOpen(false)}
          >
            <img src="/fromone-logo.png" alt="FromOne" width={220} height={68} />
          </Link>

          <nav className="fromone-navbar-links" aria-label="Primary navigation">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(link.href) ? "is-active" : ""}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <nav
            className="fromone-navbar-account"
            aria-label="Account navigation"
          >
            {secondaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(link.href) ? "is-active" : ""}
              >
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              className="fromone-navbar-signout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </nav>

          <button
            type="button"
            className="fromone-navbar-menu"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div
          className={
            menuOpen ? "fromone-mobile-nav is-open" : "fromone-mobile-nav"
          }
        >
          {[...primaryLinks, ...secondaryLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? "is-active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <button
            type="button"
            className="fromone-mobile-signout"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <main
        className={`main-content fromone-mobile-bottom-safe ${getRouteClassName()}`}
      >
        <div className="fromone-universal-mobile-page-frame">{children}</div>
      </main>

      <style jsx global>{`
        :root {
          --fromone-page-max: 1240px;
          --fromone-page-gutter: 28px;
          --fromone-page-top: 28px;
          --fromone-page-bottom: 88px;
          --fromone-nav-height: 92px;
        }

        html,
        body {
          width: 100%;
          max-width: 100%;
          min-height: 100%;
          margin: 0;
          overflow-x: hidden;
          background: #f4f7fb !important;
          color: #071b49;
        }

        body {
          min-height: 100vh;
        }

        .fromone-navbar {
          position: sticky;
          top: 0;
          z-index: 1200;
          width: 100%;
          background: rgba(255, 255, 255, 0.97);
          border-bottom: 1px solid #dfe5f1;
          box-shadow: 0 8px 24px rgba(7, 27, 73, 0.06);
          backdrop-filter: blur(14px);
        }

        .fromone-navbar-inner {
          width: min(100%, 1440px);
          min-height: var(--fromone-nav-height);
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
          box-sizing: border-box;
        }

        .fromone-navbar-brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .fromone-navbar-brand img {
          display: block;
          width: clamp(190px, 16vw, 250px);
          height: auto;
          max-height: 72px;
          object-fit: contain;
          object-position: left center;
        }

        .fromone-navbar-links,
        .fromone-navbar-account {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fromone-navbar-links {
          justify-content: center;
        }

        .fromone-navbar-links a,
        .fromone-navbar-account a,
        .fromone-mobile-nav a,
        .fromone-navbar-signout,
        .fromone-mobile-signout {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 13px;
          border-radius: 999px;
          color: #52617a;
          font-size: 0.91rem;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          transition:
            background 160ms ease,
            color 160ms ease;
        }

        .fromone-navbar-links a:hover,
        .fromone-navbar-account a:hover,
        .fromone-navbar-links a.is-active,
        .fromone-navbar-account a.is-active,
        .fromone-mobile-nav a.is-active {
          background: #fff1f7;
          color: #c71363;
        }

        .fromone-navbar-signout,
        .fromone-mobile-signout {
          border: 1px solid rgba(247, 37, 133, 0.22);
          background: #fff1f7;
          color: #c71363;
          font: inherit;
          cursor: pointer;
        }

        .fromone-navbar-signout:hover,
        .fromone-mobile-signout:hover {
          background: #f72585;
          color: #ffffff;
        }

        .fromone-navbar-signout:disabled,
        .fromone-mobile-signout:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .fromone-navbar-menu,
        .fromone-mobile-nav {
          display: none;
        }

        .app-shell,
        .main-content,
        .fromone-universal-mobile-page-frame {
          background-color: #f4f7fb;
        }

        .main-content.fromone-mobile-bottom-safe {
          width: 100%;
          max-width: none;
          min-width: 0;
          margin: 0;
          padding:
            var(--fromone-page-top)
            var(--fromone-page-gutter)
            var(--fromone-page-bottom);
          box-sizing: border-box;
          overflow-x: clip;
          color: #071b49;
          background: #f4f7fb !important;
        }

        .fromone-universal-mobile-page-frame {
          width: min(100%, var(--fromone-page-max));
          min-height: calc(100vh - var(--fromone-nav-height) - var(--fromone-page-top));
          max-width: var(--fromone-page-max);
          min-width: 0;
          margin: 0 auto;
          padding: 0;
          box-sizing: border-box;
        }

        .fromone-universal-mobile-page-frame > * {
          min-width: 0;
        }

        @media (max-width: 1120px) {
          :root {
            --fromone-page-gutter: 20px;
            --fromone-page-top: 24px;
          }

          .fromone-navbar-inner {
            gap: 12px;
          }

          .fromone-navbar-links a,
          .fromone-navbar-account a,
          .fromone-navbar-signout {
            padding: 0 9px;
            font-size: 0.84rem;
          }
        }

        @media (max-width: 900px) {
          :root {
            --fromone-nav-height: 78px;
            --fromone-page-gutter: 16px;
            --fromone-page-top: 22px;
            --fromone-page-bottom: 112px;
          }

          .fromone-navbar-inner {
            grid-template-columns: minmax(0, 1fr) auto;
            min-height: var(--fromone-nav-height);
            padding: 0 14px;
            gap: 12px;
          }

          .fromone-navbar-brand {
            min-width: 0;
            justify-self: start;
          }

          .fromone-navbar-brand img {
            width: min(220px, 58vw);
            height: auto;
            max-height: 64px;
          }

          .fromone-navbar-links,
          .fromone-navbar-account {
            display: none;
          }

          .fromone-navbar-menu {
            display: grid;
            grid-column: 2;
            justify-self: end;
            place-items: center;
            width: 48px;
            height: 48px;
            padding: 11px;
            border: 1px solid #ffd2e5;
            border-radius: 16px;
            background: #fff8fc;
            cursor: pointer;
          }

          .fromone-navbar-menu span {
            display: block;
            width: 22px;
            height: 2px;
            margin: 2px 0;
            border-radius: 999px;
            background: #071b49;
          }

          .fromone-mobile-nav {
            display: none;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 10px 14px 16px;
            border-top: 1px solid #edf1f6;
            background: #ffffff;
          }

          .fromone-mobile-nav.is-open {
            display: grid;
          }

          .fromone-mobile-nav a,
          .fromone-mobile-signout {
            width: 100%;
            justify-content: flex-start;
            min-height: 48px;
            padding: 0 16px;
            border: 1px solid #e3e9f2;
            border-radius: 16px;
            background: #f8fafc;
            box-sizing: border-box;
          }

          .fromone-mobile-signout {
            border-color: rgba(247, 37, 133, 0.22);
            background: #fff1f7;
            color: #c71363;
          }

          .main-content.fromone-mobile-bottom-safe {
            padding:
              var(--fromone-page-top)
              var(--fromone-page-gutter)
              max(var(--fromone-page-bottom), calc(6rem + env(safe-area-inset-bottom)));
            background: #f4f7fb !important;
          }

          .fromone-universal-mobile-page-frame {
            width: 100%;
            max-width: 100%;
            margin: 0;
          }
        }

        @media (max-width: 520px) {
          :root {
            --fromone-page-gutter: 10px;
            --fromone-page-top: 18px;
            --fromone-page-bottom: 104px;
          }

          .fromone-mobile-nav {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 420px) {
          :root {
            --fromone-nav-height: 84px;
          }

          .fromone-navbar-inner {
            padding: 0 10px;
            gap: 8px;
          }

          .fromone-navbar-brand img {
            width: min(200px, 60vw);
            height: auto;
            max-height: 60px;
          }

          .fromone-navbar-menu {
            width: 46px;
            height: 46px;
            border-radius: 15px;
          }
        }

        @media (max-width: 360px) {
          :root {
            --fromone-page-gutter: 8px;
          }
        }

        body:has(.fromone-settings-page),
        body:has(.fromone-settings-page) .app-shell,
        body:has(.fromone-settings-page) .main-content,
        body:has(.fromone-settings-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-settings-page) .fromone-universal-mobile-page-frame,
        .fromone-route-settings {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-settings-page)::before,
        body:has(.fromone-settings-page)::after,
        body:has(.fromone-settings-page) .app-shell::before,
        body:has(.fromone-settings-page) .app-shell::after,
        body:has(.fromone-settings-page) .main-content::before,
        body:has(.fromone-settings-page) .main-content::after,
        body:has(.fromone-settings-page) .fromone-universal-mobile-page-frame::before,
        body:has(.fromone-settings-page) .fromone-universal-mobile-page-frame::after,
        .fromone-route-settings::before,
        .fromone-route-settings::after {
          display: none !important;
          content: none !important;
          background: none !important;
          background-image: none !important;
        }
      `}</style>
    </>
  );
}