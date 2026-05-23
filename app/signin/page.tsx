'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const REMEMBER_EMAIL_KEY = 'fromone_remember_email';

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

export default function SignInPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (resetCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResetCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resetCooldown]);

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

  const getEmailRedirectUrl = () => {
    if (typeof window === 'undefined') {
      return 'https://fromone.co.uk/settings?setup=business';
    }

    return `${window.location.origin}/settings?setup=business`;
  };

  const getPasswordResetRedirectUrl = () => {
    if (typeof window === 'undefined') {
      return 'https://fromone.co.uk/reset-password';
    }

    return `${window.location.origin}/reset-password`;
  };

  const saveRememberedEmail = (cleanEmail: string) => {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  };

  const getFriendlyAuthError = (message: string) => {
    const cleanMessage = String(message || '').trim();
    const lowerMessage = cleanMessage.toLowerCase();

    if (lowerMessage.includes('invalid login credentials')) {
      return 'Those sign-in details do not match an account. Please check your email and password.';
    }

    if (lowerMessage.includes('email not confirmed')) {
      return 'Please verify your email before signing in. You can resend the verification email below.';
    }

    if (lowerMessage.includes('already registered')) {
      return 'An account already exists for this email. Please sign in instead.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return 'Please wait a moment before requesting another email.';
    }

    if (lowerMessage.includes('password')) {
      return cleanMessage || 'Please check your password and try again.';
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('failed to fetch')) {
      return 'FromOne could not reach the sign-in service. Please check your connection and try again.';
    }

    return cleanMessage || 'Authentication failed. Please try again.';
  };

  const getPostLoginDestination = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || null;

    if (!userId) {
      return '/dashboard';
    }

    const { data, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, industry')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Business Profile check error:', error.message);
      return '/dashboard';
    }

    if (!data?.id || !data?.business_name || !data?.industry) {
      return '/settings?setup=business';
    }

    return '/dashboard';
  };

  const handleAuth = async () => {
    const cleanEmail = email.trim();

    setAuthMessage('');
    setAuthError('');

    if (!cleanEmail) {
      notify('Please enter your email address.', 'warning', 'Email needed');
      return;
    }

    if (!password.trim()) {
      notify('Please enter your password.', 'warning', 'Password needed');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        saveRememberedEmail(cleanEmail);

        const destination = await getPostLoginDestination();
        router.push(destination);
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getEmailRedirectUrl(),
          },
        });

        if (error) {
          throw error;
        }

        saveRememberedEmail(cleanEmail);
        setAuthMessage(
          'Account created. Please check your email to verify your account. After verification, you will be sent to Business Profile setup.'
        );
        notify('Check your email to verify your account.', 'success', 'Account created');
        setMode('signin');
        setPassword('');
        setShowPassword(false);
      }
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthError(error?.message);
      setAuthError(friendlyMessage);
      notify(friendlyMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim();

    setAuthMessage('');
    setAuthError('');

    if (!cleanEmail) {
      notify('Enter your email address first, then resend the verification email.', 'warning', 'Email needed');
      return;
    }

    setResendingConfirmation(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: getEmailRedirectUrl(),
        },
      });

      if (error) {
        throw error;
      }

      saveRememberedEmail(cleanEmail);
      setAuthMessage('Verification email sent. Please check your inbox and spam folder.');
      notify('Verification email sent.', 'success', 'Check your email');
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthError(error?.message || 'Could not resend verification email.');
      setAuthError(friendlyMessage);
      notify(friendlyMessage, 'error', 'Verification failed');
    } finally {
      setResendingConfirmation(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();

    setAuthMessage('');
    setAuthError('');

    if (!cleanEmail) {
      notify('Enter your email address first, then request a password reset.', 'warning', 'Email needed');
      return;
    }

    if (resetCooldown > 0) {
      notify(`Please wait ${resetCooldown} seconds before requesting another reset email.`, 'info', 'Email already sent');
      return;
    }

    setResettingPassword(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      saveRememberedEmail(cleanEmail);
      setResetCooldown(60);
      setAuthMessage(
        'Password reset email sent. Open the newest email only. If you request another reset, older links may stop working.'
      );
      notify('Password reset email sent.', 'success', 'Check your email');
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthError(error?.message || 'Could not send password reset email.');
      setAuthError(friendlyMessage);
      notify(friendlyMessage, 'error', 'Reset failed');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !loading && !resettingPassword && !resendingConfirmation) {
      handleAuth();
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-background-glow signin-glow-one"></div>
      <div className="signin-background-glow signin-glow-two"></div>

      <div className="signin-wrap">
        <section className="signin-intro">
          <div>
            <div className="page-eyebrow">FromOne Access</div>

            <h1 className="signin-main-title">
              Sign in to your FromOne workspace.
            </h1>

            <p className="signin-main-text">
              Manage your Business Profile, upload media, create scheduled posts, and publish
              to Facebook and Instagram after review.
            </p>
          </div>

          <div className="signin-mini-grid">
            <div className="signin-mini-card">
              <span>01</span>
              <strong>Account</strong>
              <p>Create or access your FromOne account.</p>
            </div>

            <div className="signin-mini-card">
              <span>02</span>
              <strong>Business setup</strong>
              <p>New users start by setting up their Business Profile.</p>
            </div>

            <div className="signin-mini-card">
              <span>03</span>
              <strong>Weekly posts</strong>
              <p>Upload media and turn it into scheduled posts.</p>
            </div>
          </div>
        </section>

        <section className="signin-card">
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="signin-logo-img"
          />

          <h2>{mode === 'signin' ? 'Welcome back' : 'Create account'}</h2>

          <p className="signin-card-text">
            {mode === 'signin'
              ? 'Sign in to continue to your FromOne workspace.'
              : 'Create your account to start your FromOne demo.'}
          </p>

          {authMessage && (
            <div className="signin-auth-message">
              {authMessage}
            </div>
          )}

          {authError && (
            <div className="signin-auth-message is-error">
              {authError}
            </div>
          )}

          <label htmlFor="email">
            <strong>Email address</strong>
          </label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <PasswordField
            id="password"
            label="Password"
            value={password}
            visible={showPassword}
            onChange={setPassword}
            onToggle={() => setShowPassword((current) => !current)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          {mode === 'signin' && (
            <div
              style={{
                display: 'grid',
                gap: 12,
                margin: '14px 0 18px',
                padding: 16,
                borderRadius: 22,
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <label className="signin-remember-label" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember email</span>
                </label>
              </div>

              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Can&apos;t sign in?</strong>
                <p
                  style={{
                    margin: '0 0 12px',
                    color: 'var(--muted)',
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  Enter your email above, then send a reset link. Use the newest email only.
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleForgotPassword}
                  disabled={resettingPassword || loading || resendingConfirmation || resetCooldown > 0}
                  style={{ width: '100%' }}
                >
                  {resettingPassword
                    ? 'Sending reset email...'
                    : resetCooldown > 0
                      ? `Reset email sent · ${resetCooldown}s`
                      : 'Send reset email'}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="signin-primary-button"
            onClick={handleAuth}
            disabled={loading || resettingPassword || resendingConfirmation}
          >
            {loading
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>

          {mode === 'signin' && (
            <div className="signin-verification-help">
              <span>Waiting for your verification email?</span>

              <button
                type="button"
                className="signin-resend-button"
                onClick={handleResendConfirmation}
                disabled={loading || resettingPassword || resendingConfirmation}
              >
                {resendingConfirmation ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

          <div className="signin-switch">
            <span>
              {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setAuthMessage('');
                setAuthError('');
                setPassword('');
                setShowPassword(false);
                setMode(mode === 'signin' ? 'signup' : 'signin');
              }}
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
