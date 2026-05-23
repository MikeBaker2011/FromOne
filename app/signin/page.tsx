'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const REMEMBER_EMAIL_KEY = 'fromone_remember_email';

export default function SignInPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);
  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (resetCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResetCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
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

  const showInlineMessage = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (type === 'error') {
      setAuthError(message);
      setAuthMessage('');
    } else {
      setAuthMessage(message);
      setAuthError('');
    }

    window.setTimeout(() => {
      messageRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 80);
  };

  const getEmailRedirectUrl = () => {
    if (typeof window === 'undefined') {
      return 'https://fromone.co.uk/settings?setup=business';
    }

    return `${window.location.origin}/settings?setup=business`;
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

    if (resetCooldown > 0) {
      const message = `A password reset email was just sent. Please wait ${resetCooldown} second${resetCooldown === 1 ? '' : 's'} before requesting another one. Use the newest email only.`;
      showInlineMessage(message, 'warning');
      notify(message, 'warning', 'Reset already sent');
      return;
    }

    if (!cleanEmail) {
      notify('Enter your email address first, then tap Send reset email.', 'warning', 'Email needed');
      return;
    }

    setResettingPassword(true);

    try {
      const redirectTo =
        typeof window === 'undefined'
          ? 'https://fromone.co.uk/reset-password'
          : `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      saveRememberedEmail(cleanEmail);
      setResetCooldown(60);
      showInlineMessage(
        'Password reset email sent. Please use the newest email only, check spam/junk, and allow up to 1 minute for the link to arrive.',
        'success',
      );
      notify('Password reset email sent.', 'success', 'Check your email');
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthError(error?.message || 'Could not send password reset email.');
      showInlineMessage(friendlyMessage, 'error');
      notify(friendlyMessage, 'error', 'Reset failed');
    } finally {
      setResettingPassword(false);
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

          {(authMessage || authError) && (
            <div
              ref={messageRef}
              className={authError ? 'signin-auth-message is-error' : 'signin-auth-message'}
            >
              {authError || authMessage}
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

          <label htmlFor="password">
            <strong>Password</strong>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              style={{ paddingRight: 68 }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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

          {mode === 'signin' && (
            <>
              <div className="signin-options-row">
                <label className="signin-remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember email</span>
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  margin: '14px 0 0',
                  padding: 14,
                  borderRadius: 18,
                  background: 'rgba(255, 212, 59, 0.08)',
                  border: '1px solid rgba(255, 212, 59, 0.18)',
                }}
              >
                <div>
                  <strong style={{ color: '#fff' }}>Can’t sign in?</strong>
                  <p
                    style={{
                      margin: '5px 0 0',
                      color: 'rgba(248, 250, 252, 0.72)',
                      fontSize: '0.92rem',
                      lineHeight: 1.45,
                    }}
                  >
                    Enter your email above, then send one reset link. Use the newest email only.
                  </p>
                </div>

                <button
                  type="button"
                  className="signin-forgot-button"
                  onClick={handleForgotPassword}
                  disabled={resettingPassword || loading || resendingConfirmation || resetCooldown > 0}
                  style={{
                    width: '100%',
                    minHeight: 48,
                    justifyContent: 'center',
                    borderRadius: 14,
                  }}
                >
                  {resettingPassword
                    ? 'Sending reset email...'
                    : resetCooldown > 0
                      ? `Reset sent · wait ${resetCooldown}s`
                      : 'Send reset email'}
                </button>
              </div>
            </>
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
