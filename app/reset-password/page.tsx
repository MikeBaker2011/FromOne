'use client';

import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2.25 12s3.75-6.25 9.75-6.25S21.75 12 21.75 12 18 18.25 12 18.25 2.25 12 2.25 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 5.92A10.4 10.4 0 0 1 12 5.75C18 5.75 21.75 12 21.75 12a17.7 17.7 0 0 1-3.1 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.7 6.95C3.9 8.75 2.25 12 2.25 12S6 18.25 12 18.25c1.55 0 2.95-.42 4.17-1.06"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 10.15A2.75 2.75 0 0 0 13.85 14.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  visible,
  placeholder,
  autoComplete,
  onChange,
  onToggle,
  onKeyDown,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <label htmlFor={id}>
        <strong>{label}</strong>
      </label>

      <div
        style={{
          position: 'relative',
          width: '100%',
        }}
      >
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            paddingRight: 56,
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 34,
            height: 34,
            minHeight: 34,
            padding: 0,
            borderRadius: 999,
            border: 0,
            background: 'transparent',
            color: 'rgba(248, 250, 252, 0.66)',
            display: 'inline-grid',
            placeItems: 'center',
            boxShadow: 'none',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </span>
        </button>
      </div>
    </>
  );
}

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
      return 'This password reset link has expired or has already been used. Please request a new password reset email from the sign-in page and open the newest email only.';
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
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

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

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

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

      setPageError(
        'This password reset link is missing, expired, or has already been used. Please request a new reset email from the sign-in page and open the newest email only.'
      );
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

              <PasswordField
                id="new-password"
                label="New password"
                value={password}
                visible={showPassword}
                onChange={setPassword}
                onToggle={() => setShowPassword((current) => !current)}
                onKeyDown={handleKeyDown}
                placeholder="Enter new password"
                autoComplete="new-password"
              />

              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirmPassword}
                visible={showConfirmPassword}
                onChange={setConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                onKeyDown={handleKeyDown}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />

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
