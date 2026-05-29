'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

function cleanInternalPath(value: string | null) {
  const cleanValue = String(value || '').trim();

  if (!cleanValue || cleanValue.startsWith('http') || cleanValue.startsWith('//')) {
    return '/settings';
  }

  return cleanValue.startsWith('/') ? cleanValue : `/${cleanValue}`;
}

function getMissingPermissionText(value: string | null) {
  const permissions = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (permissions.length === 0) return '';

  return permissions.join(', ');
}

function ConnectSuccessContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get('status') || 'success';
  const returnTo = cleanInternalPath(searchParams.get('return_to'));
  const error = searchParams.get('meta_error') || '';
  const hasPermissionWarning = searchParams.get('meta_permission_warning') === 'true';
  const missingPermissions = getMissingPermissionText(searchParams.get('meta_missing_permissions'));

  const isSuccess = status === 'success';

  const destinationLabel = useMemo(() => {
    if (returnTo.includes('/dashboard')) return 'Continue to Dashboard';
    if (returnTo.includes('/posts')) return 'Continue to Posts';
    return 'Continue to Settings';
  }, [returnTo]);

  return (
    <main className="connect-result-page">
      <section className="connect-result-card">
        <div className={isSuccess ? 'connect-result-icon is-success' : 'connect-result-icon is-error'}>
          {isSuccess ? '✓' : '!'}
        </div>

        <div className="page-eyebrow">Connected accounts</div>

        <h1>{isSuccess ? 'Facebook and Instagram connected.' : 'Connection needs attention.'}</h1>

        <p>
          {isSuccess
            ? 'You can now continue back to FromOne. If this opened in your browser from the mobile app, use the button below to carry on.'
            : error || 'Meta did not complete the connection. You can go back and try again.'}
        </p>

        {hasPermissionWarning && (
          <div className="connect-result-note">
            <strong>Permission warning</strong>
            <span>
              The connection was saved, but some publishing permissions may still need approval
              {missingPermissions ? `: ${missingPermissions}` : '.'}
            </span>
          </div>
        )}

        <div className="connect-result-actions">
          <button type="button" onClick={() => { window.location.href = returnTo; }}>
            {destinationLabel}
          </button>

          <button type="button" className="secondary-button" onClick={() => { window.location.href = '/dashboard'; }}>
            Go to Dashboard
          </button>

          <button type="button" className="secondary-button" onClick={() => { window.location.href = '/settings'; }}>
            Manage connections
          </button>
        </div>
      </section>

      <style jsx global>{`
        .connect-result-page {
          min-height: calc(100vh - 40px);
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .connect-result-card {
          width: min(560px, 100%);
          text-align: center;
          padding: clamp(24px, 5vw, 42px);
          border-radius: 34px;
          background:
            radial-gradient(circle at top, rgba(255, 212, 59, 0.14), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035));
          border: 1px solid rgba(255, 212, 59, 0.2);
          box-shadow: 0 30px 96px rgba(0,0,0,0.34);
        }

        .connect-result-icon {
          width: 68px;
          height: 68px;
          display: inline-grid;
          place-items: center;
          margin: 0 auto 16px;
          border-radius: 22px;
          font-size: 2rem;
          font-weight: 1000;
        }

        .connect-result-icon.is-success {
          color: #062116;
          background: linear-gradient(135deg, #3ddc97, #a7f3d0);
          box-shadow: 0 18px 46px rgba(61, 220, 151, 0.24);
        }

        .connect-result-icon.is-error {
          color: #101420;
          background: linear-gradient(135deg, #ffd43b, #f7b733);
          box-shadow: 0 18px 46px rgba(255, 212, 59, 0.2);
        }

        .connect-result-card h1 {
          margin: 8px 0 12px;
          color: #ffffff;
          font-size: clamp(2rem, 5vw, 3.5rem);
          line-height: 0.96;
          letter-spacing: -0.06em;
        }

        .connect-result-card p {
          max-width: 460px;
          margin: 0 auto;
          color: rgba(248,250,252,0.72);
          line-height: 1.58;
          font-weight: 760;
        }

        .connect-result-note {
          display: grid;
          gap: 6px;
          margin: 18px auto 0;
          padding: 14px;
          border-radius: 20px;
          background: rgba(255, 212, 59, 0.09);
          border: 1px solid rgba(255, 212, 59, 0.16);
          text-align: left;
        }

        .connect-result-note strong {
          color: #ffe58a;
        }

        .connect-result-note span {
          color: rgba(248,250,252,0.72);
          line-height: 1.45;
          font-weight: 760;
        }

        .connect-result-actions {
          display: grid;
          gap: 10px;
          margin-top: 24px;
        }

        .connect-result-actions button {
          width: 100%;
          min-height: 54px;
          border-radius: 18px;
        }

        @media (max-width: 560px) {
          .connect-result-page {
            padding: 16px;
            align-items: start;
            padding-top: 42px;
          }

          .connect-result-card {
            border-radius: 28px;
            padding: 24px 18px;
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