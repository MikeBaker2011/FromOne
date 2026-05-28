'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const REMEMBER_EMAIL_KEY = 'fromone_remember_email';
const RESET_COOLDOWN_SECONDS = 60;

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

    const timer = window.setTimeout(() => {
      setResetCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resetCooldown]);

  useEffect(() => {
    if (!authMessage && !authError) return;

    window.setTimeout(() => {
      messageRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
  }, [authMessage, authError]);

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

  const getResetRedirectUrl = () => {
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

  const isRefreshTokenError = (message: string) => {
    const lower = String(message || '').toLowerCase();

    return (
      lower.includes('invalid refresh token') ||
      lower.includes('refresh token not found') ||
      lower.includes('refresh_token_not_found')
    );
  };

  const clearStaleAuthSession = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore errors caused by an already-invalid local session.
    }

    if (typeof window !== 'undefined') {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('sb-') || key.includes('supabase'))
        .forEach((key) => window.localStorage.removeItem(key));
    }
  };

  const getFriendlyAuthError = (message: string) => {
    const cleanMessage = String(message || '').trim();
    const lowerMessage = cleanMessage.toLowerCase();

    if (isRefreshTokenError(cleanMessage)) {
      return 'Your previous sign-in session expired. Please request a new password reset email and use the newest link.';
    }

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
        setShowPassword(false);
      }
    } catch (error: any) {
      if (isRefreshTokenError(error?.message || error?.code)) {
        await clearStaleAuthSession();
      }

      const friendlyMessage = getFriendlyAuthError(error?.message || error?.code);
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
      if (isRefreshTokenError(error?.message || error?.code)) {
        await clearStaleAuthSession();
      }

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
      notify(`Please wait ${resetCooldown} seconds before requesting another reset email.`, 'info', 'Reset already sent');
      return;
    }

    setResettingPassword(true);

    try {
      await clearStaleAuthSession();

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getResetRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      saveRememberedEmail(cleanEmail);
      setResetCooldown(RESET_COOLDOWN_SECONDS);
      setAuthMessage(
        'Password reset email sent. Please use the newest email only. It can take up to a minute to arrive, and older reset emails may stop working.'
      );
      notify('Password reset email sent.', 'success', 'Check your email');
    } catch (error: any) {
      if (isRefreshTokenError(error?.message || error?.code)) {
        await clearStaleAuthSession();
      }

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
      <style jsx global>{`
        .signin-wrap-merged-premium {
          min-height: calc(100vh - 48px);
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 440px) !important;
          gap: clamp(24px, 4vw, 46px) !important;
          align-items: stretch !important;
          justify-content: center !important;
          width: min(1060px, calc(100vw - 28px)) !important;
          margin: 0 auto !important;
          padding: clamp(24px, 4vw, 48px) !important;
          border-radius: 40px !important;
          border: 1px solid rgba(255, 212, 59, 0.2) !important;
          background:
            radial-gradient(circle at 12% 14%, rgba(255, 212, 59, 0.18), transparent 34%),
            radial-gradient(circle at 88% 10%, rgba(61, 220, 151, 0.1), transparent 32%),
            linear-gradient(145deg, rgba(255,255,255,0.088), rgba(255,255,255,0.032)) !important;
          box-shadow: 0 32px 105px rgba(0,0,0,0.38) !important;
        }

        .signin-merged-sales {
          display: grid;
          gap: 22px;
          align-content: center;
          min-width: 0;
          padding: clamp(4px, 1.2vw, 12px) 0;
        }

        .signin-main-title {
          max-width: 560px;
          margin: 0;
          font-size: clamp(2.65rem, 4.7vw, 5.1rem);
          line-height: 0.92;
          letter-spacing: -0.065em;
          color: #ffffff;
        }

        .signin-main-text {
          max-width: 540px;
          margin: 16px 0 0;
          color: rgba(248,250,252,0.74);
          font-size: 1.04rem;
          line-height: 1.68;
          font-weight: 760;
        }

        .signin-merged-feature-list {
          display: grid;
          gap: 10px;
          max-width: 560px;
        }

        .signin-merged-feature-list div {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          column-gap: 12px;
          row-gap: 4px;
          align-items: start;
          padding: 13px 14px;
          border-radius: 20px;
          background: rgba(2, 6, 23, 0.24);
          border: 1px solid rgba(255,255,255,0.075);
        }

        .signin-merged-feature-list span {
          grid-row: span 2;
          display: inline-flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(61, 220, 151, 0.13);
          color: #a7f3d0;
          font-weight: 1000;
        }

        .signin-merged-feature-list strong {
          color: #ffffff;
          line-height: 1.2;
        }

        .signin-merged-feature-list p {
          margin: 0;
          color: rgba(248,250,252,0.62);
          line-height: 1.42;
          font-size: 0.92rem;
          font-weight: 740;
        }

        .signin-merged-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          max-width: 560px;
        }

        .signin-merged-stats div {
          padding: 14px;
          border-radius: 20px;
          background: rgba(255, 212, 59, 0.08);
          border: 1px solid rgba(255, 212, 59, 0.14);
          text-align: center;
        }

        .signin-merged-stats strong {
          display: block;
          color: #ffffff;
          font-size: 1.12rem;
          margin-bottom: 4px;
          line-height: 1.1;
        }

        .signin-merged-stats span {
          display: block;
          color: rgba(248,250,252,0.66);
          line-height: 1.25;
          font-size: 0.86rem;
          font-weight: 760;
        }

        .signin-merged-form {
          align-self: center !important;
          width: 100% !important;
          max-width: 440px !important;
          margin: 0 !important;
          background:
            radial-gradient(circle at top, rgba(255, 212, 59, 0.08), transparent 30%),
            rgba(5, 10, 24, 0.44) !important;
          border: 1px solid rgba(255,255,255,0.11) !important;
          box-shadow: 0 22px 70px rgba(0,0,0,0.24) !important;
        }

        .signin-wrap-merged-premium .signin-logo-img {
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .signin-wrap-merged-premium .signin-card h2,
        .signin-wrap-merged-premium .signin-card-text {
          text-align: center !important;
        }

        @media (max-width: 980px) {
          .signin-wrap-merged-premium {
            grid-template-columns: minmax(0, 460px) !important;
            justify-content: center !important;
            width: min(100%, 560px) !important;
            min-height: calc(100vh - 24px);
            padding: 18px 12px 28px !important;
            align-items: start !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          .signin-intro-desktop-only {
            display: none !important;
          }

          .signin-merged-form {
            max-width: 460px !important;
            margin: 0 auto !important;
            background: rgba(255,255,255,0.075) !important;
          }
        }
      `}</style>

      <div className="signin-background-glow signin-glow-one"></div>
      <div className="signin-background-glow signin-glow-two"></div>

      <div className="signin-wrap signin-wrap-merged-premium">
        <section className="signin-intro signin-intro-desktop-only signin-merged-sales">
          <div>
            <div className="page-eyebrow">FromOne for small businesses</div>

            <h1 className="signin-main-title">
              Create better social posts in less time.
            </h1>

            <p className="signin-main-text">
              FromOne helps you set up your business profile, create ready-to-review posts,
              prepare media, schedule content and publish with more control.
            </p>
          </div>

          <div className="signin-merged-feature-list">
            <div>
              <span>✓</span>
              <strong>Business Profile setup</strong>
              <p>Tell FromOne about the business once, then use it every week.</p>
            </div>

            <div>
              <span>✓</span>
              <strong>Posts from media</strong>
              <p>Upload photos, videos or flyers and turn them into social posts.</p>
            </div>

            <div>
              <span>✓</span>
              <strong>Schedule or publish</strong>
              <p>Autopublish where supported, or use manual fallback anytime.</p>
            </div>
          </div>

          <div className="signin-merged-stats">
            <div>
              <strong>7-day</strong>
              <span>free demo</span>
            </div>

            <div>
              <strong>£39.99</strong>
              <span>per month</span>
            </div>

            <div>
              <strong>Academy</strong>
              <span>built in</span>
            </div>
          </div>
        </section>

        <section className="signin-card signin-merged-form">
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="signin-logo-img"
          />

          <h2>{mode === 'signin' ? 'Welcome back' : 'Create account'}</h2>

          <p className="signin-card-text">
            {mode === 'signin'
              ? 'Sign in to continue to FromOne.'
              : 'Create your account to start your 7-day FromOne demo.'}
          </p>

          <div ref={messageRef}>
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
          </div>

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
          <input
            id="password"
            className="input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password'}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          <label className="show-password-row">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            <span>Show password</span>
          </label>

          {mode === 'signin' && (
            <label className="signin-remember-label signin-remember-standalone">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Remember email</span>
            </label>
          )}

          {mode === 'signin' && (
            <div className="signin-reset-panel">
              <strong>Can’t sign in?</strong>
              <p>
                Enter your email above and we’ll send a fresh password reset link. Use the newest
                email only.
              </p>

              <button
                type="button"
                className="secondary-button"
                onClick={handleForgotPassword}
                disabled={resettingPassword || loading || resendingConfirmation || resetCooldown > 0}
              >
                {resettingPassword
                  ? 'Sending reset email...'
                  : resetCooldown > 0
                    ? `Reset sent · ${resetCooldown}s`
                    : 'Send reset email'}
              </button>
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
