"use client";

import Link from "next/link";

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-brand">
          <Link href="/" className="public-footer-logo" aria-label="FromOne home">
            FromOne
          </Link>

          <p>Social posts, offers and events for small businesses.</p>
        </div>

        <nav className="public-footer-links" aria-label="Footer navigation">
          <Link href="/subscription">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/bugreport">Support</Link>
        </nav>

        <small>© {year} FromOne. All rights reserved.</small>
      </div>

      <style jsx global>{`
        .public-footer {
          width: 100%;
          margin-top: auto;
          border-top: 1px solid #e3e9f2 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          color: #071b49 !important;
          box-shadow: none !important;
        }

        .public-footer::before,
        .public-footer::after {
          display: none !important;
          content: none !important;
          background: none !important;
        }

        .public-footer-inner {
          width: min(1180px, calc(100% - 40px));
          min-height: 104px;
          margin: 0 auto;
          padding: 24px 0;
          display: grid;
          grid-template-columns: minmax(240px, 1fr) auto auto;
          align-items: center;
          gap: 34px;
          box-sizing: border-box;
          background: transparent !important;
        }

        .public-footer-brand {
          display: grid;
          gap: 5px;
        }

        .public-footer-logo {
          width: fit-content;
          color: #071b49 !important;
          -webkit-text-fill-color: #071b49 !important;
          font-size: 1rem;
          font-weight: 900;
          line-height: 1.1;
          text-decoration: none;
          text-shadow: none !important;
        }

        .public-footer-brand p {
          margin: 0;
          color: #647087 !important;
          -webkit-text-fill-color: #647087 !important;
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1.45;
          text-shadow: none !important;
        }

        .public-footer-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 10px 22px;
          background: transparent !important;
        }

        .public-footer-links a,
        .public-footer-links a:link,
        .public-footer-links a:visited,
        .public-footer-links a:active {
          color: #071b49 !important;
          -webkit-text-fill-color: #071b49 !important;
          font-size: 0.78rem;
          font-weight: 800;
          text-decoration: none !important;
          opacity: 1 !important;
          filter: none !important;
          text-shadow: none !important;
          transition: color 160ms ease;
        }

        .public-footer-links a:hover {
          color: #f72585 !important;
          -webkit-text-fill-color: #f72585 !important;
        }

        .public-footer small {
          color: #647087 !important;
          -webkit-text-fill-color: #647087 !important;
          font-size: 0.72rem;
          font-weight: 600;
          line-height: 1.45;
          white-space: nowrap;
          text-shadow: none !important;
        }

        @media (max-width: 820px) {
          .public-footer-inner {
            grid-template-columns: 1fr;
            justify-items: center;
            gap: 16px;
            padding: 24px 0 28px;
            text-align: center;
          }

          .public-footer-brand {
            justify-items: center;
          }

          .public-footer-links {
            gap: 10px 18px;
          }

          .public-footer small {
            white-space: normal;
          }
        }

        @media (max-width: 520px) {
          .public-footer-inner {
            width: min(100% - 24px, 680px);
          }

          .public-footer-links {
            gap: 10px 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .public-footer-links a {
            transition: none;
          }
        }
      `}</style>
    </footer>
  );
}