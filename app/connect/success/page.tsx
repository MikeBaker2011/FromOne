"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function cleanInternalPath(value: string | null) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue || cleanValue.startsWith("http") || cleanValue.startsWith("//")) {
    return "/settings";
  }

  return cleanValue.startsWith("/") ? cleanValue : `/${cleanValue}`;
}

function getMissingPermissionText(value: string | null) {
  const permissions = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (permissions.length === 0) return "";

  return permissions.join(", ");
}

function ConnectSuccessContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get("status") || "success";
  const returnTo = cleanInternalPath(searchParams.get("return_to"));
  const error = searchParams.get("meta_error") || "";
  const hasPermissionWarning =
    searchParams.get("meta_permission_warning") === "true";
  const missingPermissions = getMissingPermissionText(
    searchParams.get("meta_missing_permissions")
  );

  const isSuccess = status === "success";

  const destinationLabel = useMemo(() => {
    return "Continue to FromOne";
  }, []);

  return (
    <main className="connect-result-page">
      <section className="connect-result-card">
        <div className="page-eyebrow">Connected accounts</div>

        <h1>
          {isSuccess
            ? "Facebook and Instagram connected."
            : "Connection needs attention."}
        </h1>

        <p>
          {isSuccess
            ? "Connection complete. You can continue here, or return to the FromOne app if you opened this from your home screen."
            : error ||
              "Meta did not complete the connection. You can go back and try again."}
        </p>

        {hasPermissionWarning && (
          <div className="connect-result-note">
            <strong>Permission warning</strong>
            <span>
              The connection was saved, but some publishing permissions may still
              need approval
              {missingPermissions ? `: ${missingPermissions}` : "."}
            </span>
          </div>
        )}

        <div className="connect-result-actions">
          <button
            type="button"
            onClick={() => {
              window.location.href = returnTo;
            }}
          >
            {destinationLabel}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Go to Dashboard
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              window.location.href = "/settings";
            }}
          >
            Manage connections
          </button>
        </div>

        <p className="connect-result-app-note">
          Opened from the installed app? After continuing, you can also switch back
          to FromOne from your phone&apos;s app switcher.
        </p>
      </section>

      <style jsx global>{`
        body:has(.connect-result-page),
        body:has(.connect-result-page) .app-shell,
        body:has(.connect-result-page) .main-content,
        body:has(.connect-result-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.connect-result-page) .fromone-universal-mobile-page-frame,
        .connect-result-page {
          background: #f4f7fb !important;
          background-color: #f4f7fb !important;
          background-image: none !important;
        }

        body:has(.connect-result-page)::before,
        body:has(.connect-result-page)::after,
        body:has(.connect-result-page) .app-shell::before,
        body:has(.connect-result-page) .app-shell::after,
        body:has(.connect-result-page) .main-content::before,
        body:has(.connect-result-page) .main-content::after,
        body:has(.connect-result-page)
          .fromone-universal-mobile-page-frame::before,
        body:has(.connect-result-page)
          .fromone-universal-mobile-page-frame::after,
        .connect-result-page::before,
        .connect-result-page::after {
          display: none !important;
          content: none !important;
          background: none !important;
          background-image: none !important;
        }

        .connect-result-page {
          min-height: calc(100vh - 40px);
          display: grid;
          place-items: center;
          padding: 32px 20px;
          box-sizing: border-box;
        }

        .connect-result-card {
          width: min(640px, 100%);
          text-align: center;
          padding: clamp(28px, 5vw, 48px);
          border: 1px solid #dfe5f1;
          border-radius: 30px;
          background: #ffffff;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.08);
          box-sizing: border-box;
        }

        .connect-result-card .page-eyebrow {
          margin-bottom: 14px;
          color: #f72585 !important;
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .connect-result-card h1 {
          margin: 0 0 16px;
          color: #071b49 !important;
          font-size: clamp(2.2rem, 6vw, 4.2rem);
          line-height: 0.96;
          letter-spacing: -0.06em;
          font-weight: 900;
          text-shadow: none !important;
        }

        .connect-result-card p {
          max-width: 500px;
          margin: 0 auto;
          color: #52617a !important;
          font-size: 1rem;
          line-height: 1.6;
          font-weight: 650;
          text-shadow: none !important;
        }

        .connect-result-note {
          display: grid;
          gap: 7px;
          margin: 20px auto 0;
          padding: 16px;
          border: 1px solid #ffd2e5;
          border-radius: 18px;
          background: #fff7fb;
          text-align: left;
        }

        .connect-result-note strong {
          color: #071b49 !important;
          font-size: 0.88rem;
          font-weight: 900;
        }

        .connect-result-note span {
          color: #52617a !important;
          line-height: 1.5;
          font-weight: 650;
        }

        .connect-result-actions {
          display: grid;
          gap: 12px;
          margin-top: 28px;
        }

        .connect-result-actions button {
          width: 100%;
          min-height: 56px;
          border: 0;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff !important;
          font: inherit;
          font-size: 0.92rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(247, 37, 133, 0.2);
        }

        .connect-result-actions .secondary-button {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49 !important;
          box-shadow: none;
        }

        .connect-result-actions .secondary-button:hover {
          border-color: rgba(247, 37, 133, 0.28);
          color: #f72585 !important;
        }

        .connect-result-app-note {
          margin-top: 18px !important;
          color: #778197 !important;
          font-size: 0.84rem !important;
        }

        @media (max-width: 560px) {
          .connect-result-page {
            align-items: start;
            padding: 24px 12px 36px;
          }

          .connect-result-card {
            padding: 26px 18px;
            border-radius: 24px;
          }

          .connect-result-card h1 {
            font-size: clamp(2rem, 12vw, 3rem);
          }
        }
      `}</style>
    </main>
  );
}

function ConnectSuccessFallback() {
  return (
    <main className="connect-result-page">
      <section className="connect-result-card">
        <div className="page-eyebrow">Connected accounts</div>
        <h1>Loading connection result...</h1>
      </section>
    </main>
  );
}

export default function ConnectSuccessPage() {
  return (
    <Suspense fallback={<ConnectSuccessFallback />}>
      <ConnectSuccessContent />
    </Suspense>
  );
}