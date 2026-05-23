'use client';

import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const notify = (
    message: any,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    title?: string,
  ) => {
    const cleanMessage = String(message || '').trim();

    if (!cleanMessage) return;

    const defaultTitle =
      title ||
      (type === 'success'
        ? 'Done'
        : type === 'error'
          ? 'Something went wrong'
          : type === 'warning'
            ? 'Please check'
            : 'FromOne');

    showToast({
      type,
      title: defaultTitle,
      message: cleanMessage,
    });
  };

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [pageMessage, setPageMessage] = useState('');
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    prepareRecoverySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFriendlyAuthError = (message: string) => {
    const cleanMessage = String(message || '').trim();
    const lowerMessage = cleanMessage.toLowerCase();

    if (
      lowerMessage.includes('expired') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('already been used') ||
      lowerMessage.includes('otp') ||
      lowerMessage.includes('token')
    ) {
      return 'This password reset link has expired or has already been used. Please request a new password reset email from the sign-in page.';
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('failed to fetch')) {
      return 'FromOne could not reach the sign-in service. Please check your connection and try again.';
    }

    return cleanMessage || 'Could not complete the password reset. Please try again.';
  };

  const prepareRecoverySession = async () => {
    setCheckingLink(true);
    setPageError('');
    setPageMessage('');

    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          const friendlyMessage = getFriendlyAuthError(error.message);
          setPageError(friendlyMessage);
          setLinkReady(false);
          return;
        }

        setLinkReady(true);
        setPageMessage('Reset link verified. Choose a new password below.');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setLinkReady(true);
        setPageMessage('Choose a new password below.');
        return;
      }

      setPageError('This password reset link is missing, expired, or has already been used. Please request a new reset email from the sign-in page.');
      setLinkReady(false);
    } catch (error: any) {
      setPageError(getFriendlyAuthError(error?.message));
      setLinkReady(false);
    } finally {
      setCheckingLink(false);
    }
  };

  const passwordChecks = useMemo(
    () => [
      {
        label: 'At least 6 characters',
        ready: password.length >= 6,
      },
      {
        label: 'Passwords match',
        ready: Boolean(password) && password === confirmPassword,
      },
    ],
    [password, confirmPassword],
  );

  const canSubmit = passwordChecks.every((item) => item.ready) && !saving;

  const updatePassword = async () => {
    setPageError('');
    setPageMessage('');

    if (!password.trim()) {
      notify('Please enter a new password.', 'warning', 'Password needed');
      return;
    }

    if (password.length < 6) {
      notify('Password must be at least 6 characters.', 'warning', 'Password too short');
      return;
    }

    if (password !== confirmPassword) {
      notify('The two passwords do not match.', 'warning', 'Passwords do not match');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setPageMessage('Password updated. Redirecting you to sign in...');
      notify('Please sign in with your new password.', 'success', 'Password updated');

      window.setTimeout(() => {
        router.push('/signin');
      }, 700);
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthError(error?.message || 'Could not update password.');
      setPageError(friendlyMessage);
      notify(friendlyMessage, 'error', 'Password update failed');
    } finally {
      setSaving(false);
    }
  };


  const renderPasswordEyeIcon = (isVisible: boolean) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {isVisible ? (
        <>
          <path
            d="M3 3l18 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10.58 10.58a2 2 0 0 0 2.84 2.84"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9.88 5.08A9.5 9.5 0 0 1 12 4.84c5.52 0 9 5.16 9 7.16a5.5 5.5 0 0 1-1.34 2.77"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.11 6.88C4.11 8.2 3 10.43 3 12c0 2 3.48 7.16 9 7.16a9.2 9.2 0 0 0 5.02-1.48"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && linkReady && !saving) {
      updatePassword();
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-background-glow signin-glow-one"></div>
      <div className="signin-background-glow signin-glow-two"></div>

      <div className="signin-wrap signin-reset-wrap">
        <section className="signin-intro">
          <div>
            <div className="page-eyebrow">FromOne Password Reset</div>

            <h1 className="signin-main-title">Create a new password.</h1>

            <p className="signin-main-text">
              Choose a new password for your FromOne account. Once saved, you can sign in
              and continue creating, reviewing and publishing your weekly posts.
            </p>
          </div>

          <div className="signin-mini-grid">
            <div className="signin-mini-card">
              <span>01</span>
              <strong>Verify link</strong>
              <p>FromOne checks that your reset link is valid.</p>
            </div>

            <div className="signin-mini-card">
              <span>02</span>
              <strong>Set password</strong>
              <p>Create a new password for your account.</p>
            </div>

            <div className="signin-mini-card">
              <span>03</span>
              <strong>Sign back in</strong>
              <p>Use your new password to access your workspace.</p>
            </div>
          </div>
        </section>

        <section className="signin-card">
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="signin-logo-img"
          />

          <h2>Reset password</h2>

          {checkingLink ? (
            <>
              <p className="signin-card-text">Checking your password reset link...</p>
              <div className="signin-auth-message">This usually takes a few seconds.</div>
            </>
          ) : !linkReady ? (
            <>
              <p className="signin-card-text">
                This reset link is no longer ready to use.
              </p>

              {pageError && <div className="signin-auth-message is-error">{pageError}</div>}

              <button
                type="button"
                className="signin-primary-button"
                onClick={() => router.push('/signin')}
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <p className="signin-card-text">
                Choose a secure new password for your account.
              </p>

              {pageMessage && <div className="signin-auth-message">{pageMessage}</div>}
              {pageError && <div className="signin-auth-message is-error">{pageError}</div>}

              <label htmlFor="new-password">
                <strong>New password</strong>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="new-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  style={{ paddingRight: 68 }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 42,
                    height: 42,
                    minWidth: 42,
                    minHeight: 42,
                    padding: 0,
                    borderRadius: 14,
                    display: 'inline-grid',
                    placeItems: 'center',
                    border: '1px solid rgba(255, 212, 59, 0.22)',
                    background: showPassword
                      ? 'rgba(255, 212, 59, 0.16)'
                      : 'rgba(255,255,255,0.065)',
                    color: showPassword ? '#ffe58a' : 'rgba(248,250,252,0.78)',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.18)',
                  }}
                >
                  {renderPasswordEyeIcon(showPassword)}
                </button>
              </div>

              <label htmlFor="confirm-password">
                <strong>Confirm password</strong>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirm-password"
                  className="input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  style={{ paddingRight: 68 }}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 42,
                    height: 42,
                    minWidth: 42,
                    minHeight: 42,
                    padding: 0,
                    borderRadius: 14,
                    display: 'inline-grid',
                    placeItems: 'center',
                    border: '1px solid rgba(255, 212, 59, 0.22)',
                    background: showConfirmPassword
                      ? 'rgba(255, 212, 59, 0.16)'
                      : 'rgba(255,255,255,0.065)',
                    color: showConfirmPassword ? '#ffe58a' : 'rgba(248,250,252,0.78)',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.18)',
                  }}
                >
                  {renderPasswordEyeIcon(showConfirmPassword)}
                </button>
              </div>

              <div
                className="signin-auth-message"
                style={{
                  display: 'grid',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {passwordChecks.map((check) => (
                  <span
                    key={check.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      color: check.ready ? '#a7f3d0' : 'rgba(248, 250, 252, 0.74)',
                      fontWeight: 850,
                    }}
                  >
                    {check.label}
                    <strong>{check.ready ? '✓' : '•'}</strong>
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="signin-primary-button"
                onClick={updatePassword}
                disabled={!canSubmit}
              >
                {saving ? 'Saving password...' : 'Update password'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => router.push('/signin')}
                disabled={saving}
                style={{ width: '100%' }}
              >
                Back to sign in
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
