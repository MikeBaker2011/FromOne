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
        .signin-wrap-responsive {
          min-height: calc(100vh - 48px);
          display: grid !important;
          grid-template-columns: minmax(0, 1.12fr) minmax(360px, 450px) !important;
          gap: clamp(28px, 4.4vw, 58px) !important;
          align-items: center !important;
          width: min(1180px, calc(100vw - 28px)) !important;
          margin: 0 auto !important;
          padding: clamp(24px, 4vw, 48px) 0 !important;
        }

        .signin-wrap-responsive .signin-card {
          width: 100% !important;
          max-width: 460px !important;
          margin: 0 auto !important;
        }

        .signin-intro-desktop-only {
          display: grid;
          gap: 22px;
          align-content: center;
          min-width: 0;
        }

        .signin-intro-desktop-only .page-eyebrow {
          margin-bottom: 10px;
        }

        .signin-main-title {
          max-width: 620px;
          margin: 0;
          font-size: clamp(2.45rem, 4.6vw, 4.75rem);
          line-height: 0.92;
          letter-spacing: -0.065em;
          color: #ffffff;
        }

        .signin-main-text {
          max-width: 580px;
          margin: 18px 0 0;
          color: rgba(248,250,252,0.72);
          font-size: 1.04rem;
          line-height: 1.7;
          font-weight: 760;
        }

        .signin-feature-panel {
          max-width: 720px;
          padding: 18px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.12), transparent 36%),
            linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028));
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 20px 58px rgba(0,0,0,0.2);
        }

        .signin-feature-panel-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .signin-feature-panel-head span {
          display: inline-flex;
          width: fit-content;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.12);
          border: 1px solid rgba(255, 212, 59, 0.18);
          color: #ffe58a;
          font-size: 0.75rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .signin-feature-panel-head strong {
          color: #ffffff;
          font-size: 1.1rem;
          line-height: 1.2;
          text-align: right;
        }

        .signin-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .signin-feature-card {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 11px;
          align-items: start;
          padding: 13px;
          border-radius: 20px;
          background: rgba(2, 6, 23, 0.3);
          border: 1px solid rgba(255,255,255,0.075);
        }

        .signin-feature-card span {
          display: inline-flex;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-weight: 1000;
        }

        .signin-feature-card strong {
          display: block;
          color: #ffffff;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .signin-feature-card p {
          margin: 0;
          color: rgba(248,250,252,0.62);
          line-height: 1.42;
          font-size: 0.88rem;
          font-weight: 740;
        }

        .signin-proof-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          max-width: 720px;
        }

        .signin-proof-row div {
          padding: 14px;
          border-radius: 20px;
          background: rgba(255, 212, 59, 0.08);
          border: 1px solid rgba(255, 212, 59, 0.14);
        }

        .signin-proof-row strong {
          display: block;
          color: #ffffff;
          margin-bottom: 5px;
          line-height: 1.15;
        }

        .signin-proof-row span {
          display: block;
          color: rgba(248,250,252,0.66);
          line-height: 1.38;
          font-size: 0.88rem;
          font-weight: 740;
        }

        .signin-journey-note {
          max-width: 720px;
          padding: 16px 18px;
          border-radius: 22px;
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.12), transparent 38%),
            rgba(255,255,255,0.055);
          border: 1px solid rgba(255, 212, 59, 0.16);
          box-shadow: 0 18px 48px rgba(0,0,0,0.18);
        }

        .signin-journey-note strong {
          display: block;
          margin-bottom: 7px;
          color: #ffffff;
          font-size: 1rem;
        }

        .signin-journey-note span {
          display: block;
          color: rgba(248,250,252,0.72);
          line-height: 1.55;
          font-weight: 760;
        }

        .signin-wrap-responsive .signin-logo-img {
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .signin-wrap-responsive .signin-card h2,
        .signin-wrap-responsive .signin-card-text {
          text-align: center !important;
        }

        @media (max-width: 980px) {
          .signin-wrap-responsive {
            grid-template-columns: minmax(0, 460px) !important;
            justify-content: center !important;
            width: min(100%, 560px) !important;
            min-height: calc(100vh - 24px);
            padding: 18px 12px 28px !important;
            align-items: start !important;
          }

          .signin-intro-desktop-only {
            display: none !important;
          }

          .signin-wrap-responsive .signin-card {
            margin-top: 0 !important;
          }
        }
      `}</style>

      <div className="signin-background-glow signin-glow-one"></div>
      <div className="signin-background-glow signin-glow-two"></div>

      <div className="signin-wrap signin-wrap-responsive">
        <section className="signin-intro signin-intro-desktop-only">
          <div>
            <div className="page-eyebrow">FromOne for small businesses</div>

            <h1 className="signin-main-title">
              Create, prepare and publish posts without the stress.
            </h1>

            <p className="signin-main-text">
              FromOne helps small businesses turn a website, business profile, photos,
              videos or flyers into ready-to-review social posts.
            </p>
          </div>

          <div className="signin-feature-panel">
            <div className="signin-feature-panel-head">
              <span>Included in FromOne</span>
              <strong>Your online social media assistant</strong>
            </div>

            <div className="signin-feature-grid">
              <div className="signin-feature-card">
                <span>01</span>
                <strong>Business Profile</strong>
                <p>Set up the business once so every post has the right services, audience, location and tone.</p>
              </div>

              <div className="signin-feature-card">
                <span>02</span>
                <strong>Website scan</strong>
                <p>Use a website to help FromOne understand what the business does and who it helps.</p>
              </div>

              <div className="signin-feature-card">
                <span>03</span>
                <strong>Media prep</strong>
                <p>Prepare images for social platforms before posting, sharing or downloading.</p>
              </div>

              <div className="signin-feature-card">
                <span>04</span>
                <strong>Scheduling</strong>
                <p>Plan posts ahead of time and keep a simple weekly workflow.</p>
              </div>

              <div className="signin-feature-card">
                <span>05</span>
                <strong>Autopublish</strong>
                <p>Facebook and Instagram can autopublish when Meta is connected and the post is ready.</p>
              </div>

              <div className="signin-feature-card">
                <span>06</span>
                <strong>Manual fallback</strong>
                <p>Copy captions, download media and publish manually whenever a platform needs extra control.</p>
              </div>
            </div>
          </div>

          <div className="signin-proof-row">
            <div>
              <strong>7-day demo</strong>
              <span>Try the workflow before subscribing.</span>
            </div>

            <div>
              <strong>FromOne Academy</strong>
              <span>Step-by-step guidance built into the app.</span>
            </div>

            <div>
              <strong>£39.99/month</strong>
              <span>Built to avoid big agency fees.</span>
            </div>
          </div>

          <div className="signin-journey-note">
            <strong>New here?</strong>
            <span>
              After sign in, FromOne will guide you to Business Profile setup first if it
              has not been completed yet. Once that is done, the Dashboard becomes your main workspace.
            </span>
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
