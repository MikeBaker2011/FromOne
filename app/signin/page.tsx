'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'fromone-auth-session',
  },
});

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
  const [showResetOptions, setShowResetOptions] = useState(false);
  const [showVerificationOptions, setShowVerificationOptions] = useState(false);

  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const prepareSigninPage = async () => {
      const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);

      if (rememberedEmail && isMounted) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          const message = error.message || '';

          if (isRefreshTokenError(message)) {
            await clearStaleAuthSession();
          }

          return;
        }

        if (session?.user) {
          const destination = await getPostLoginDestination();

          if (isMounted) {
            router.replace(destination);
          }
        }
      } catch (error: any) {
        const message = error?.message || error?.code || '';

        if (isRefreshTokenError(message)) {
          await clearStaleAuthSession();
        }
      }
    };

    prepareSigninPage();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        router.replace(destination);
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
        .signin-wrap-left-sales {
          min-height: calc(100vh - 48px);
          width: min(1040px, calc(100vw - 28px)) !important;
          margin: 0 auto !important;
          padding: clamp(18px, 3vw, 34px) 0 !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 430px) !important;
          gap: clamp(18px, 3vw, 34px) !important;
          align-items: stretch !important;
        }

        .signin-left-sales-desktop {
          height: 100%;
          min-height: 610px;
          display: grid;
          grid-template-rows: auto auto auto;
          gap: 14px;
        }

        .signin-left-sales-main {
          padding: 24px;
          border-radius: 30px;
          border: 1px solid rgba(255, 212, 59, 0.18);
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.16), transparent 36%),
            linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028));
          box-shadow: 0 22px 70px rgba(0,0,0,0.24);
        }

        .signin-left-sales-main h1 {
          margin: 8px 0 12px;
          color: #ffffff;
          font-size: clamp(2.1rem, 4vw, 4rem);
          line-height: 0.94;
          letter-spacing: -0.065em;
        }

        .signin-left-sales-main p {
          max-width: 520px;
          margin: 0;
          color: rgba(248,250,252,0.72);
          line-height: 1.58;
          font-weight: 760;
        }

        .signin-left-sales-stack {
          display: grid;
          gap: 10px;
        }

        .signin-left-sales-stack div {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          column-gap: 13px;
          row-gap: 4px;
          align-items: start;
          padding: 15px;
          border-radius: 22px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 14px 42px rgba(0,0,0,0.16);
        }

        .signin-left-sales-stack span {
          grid-row: span 2;
          display: inline-flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-weight: 1000;
          font-size: 0.84rem;
        }

        .signin-left-sales-stack strong {
          color: #ffffff;
          line-height: 1.2;
        }

        .signin-left-sales-stack p {
          margin: 0;
          color: rgba(248,250,252,0.64);
          line-height: 1.42;
          font-size: 0.92rem;
          font-weight: 740;
        }

        .signin-left-sales-price {
          margin-top: auto;
          padding: 16px 18px;
          border-radius: 22px;
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.13), transparent 36%),
            rgba(255, 212, 59, 0.075);
          border: 1px solid rgba(255, 212, 59, 0.16);
          box-shadow: 0 14px 42px rgba(0,0,0,0.16);
        }

        .signin-left-sales-price strong {
          display: block;
          color: #ffffff;
          margin-bottom: 5px;
          line-height: 1.15;
        }

        .signin-left-sales-price span {
          display: block;
          color: rgba(248,250,252,0.68);
          line-height: 1.45;
          font-weight: 760;
        }

        .signin-app-download-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          padding: 16px 18px;
          border-radius: 24px;
          border: 1px solid rgba(255, 212, 59, 0.24);
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.2), transparent 38%),
            linear-gradient(145deg, rgba(255, 212, 59, 0.105), rgba(255,255,255,0.035));
          box-shadow:
            0 18px 54px rgba(0,0,0,0.22),
            0 0 0 0 rgba(255, 212, 59, 0.22);
          text-decoration: none;
          color: inherit;
          animation: signinAppPulse 1.85s ease-in-out infinite;
        }

        .signin-app-download-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 212, 59, 0.42);
        }

        .signin-app-download-card span {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 7px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.14);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.72rem;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.09em;
        }

        .signin-app-download-card strong {
          display: block;
          color: #ffffff;
          font-size: 1.2rem;
          line-height: 1.1;
          margin-bottom: 5px;
        }

        .signin-app-download-card small {
          display: block;
          color: rgba(248,250,252,0.68);
          line-height: 1.42;
          font-weight: 760;
        }

        .signin-app-download-arrow {
          width: 48px;
          height: 48px;
          display: inline-grid;
          place-items: center;
          border-radius: 18px;
          background: linear-gradient(135deg, #ffd43b, #f7b733);
          color: #101420;
          font-size: 1.45rem;
          font-weight: 1000;
          box-shadow: 0 16px 36px rgba(255, 212, 59, 0.22);
        }

        @keyframes signinAppPulse {
          0%, 100% {
            box-shadow:
              0 18px 54px rgba(0,0,0,0.22),
              0 0 0 0 rgba(255, 212, 59, 0.2);
          }
          50% {
            box-shadow:
              0 22px 64px rgba(0,0,0,0.28),
              0 0 0 7px rgba(255, 212, 59, 0.075),
              0 0 42px rgba(255, 212, 59, 0.16);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .signin-app-download-card {
            animation: none !important;
          }
        }

        .signin-login-card-right {
          height: 100% !important;
          min-height: 610px !important;
          width: 100% !important;
          max-width: 430px !important;
          margin: 0 auto !important;
          padding: 26px !important;
          border-radius: 30px !important;
          display: grid !important;
          align-content: center !important;
          background:
            radial-gradient(circle at top, rgba(255, 212, 59, 0.08), transparent 30%),
            rgba(5, 10, 24, 0.55) !important;
          border: 1px solid rgba(255,255,255,0.11) !important;
          box-shadow: 0 24px 80px rgba(0,0,0,0.28) !important;
        }

        .signin-wrap-left-sales .signin-logo-img {
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .signin-wrap-left-sales .signin-card h2,
        .signin-wrap-left-sales .signin-card-text {
          text-align: center !important;
        }

        .signin-login-card-right label {
          margin-top: 12px !important;
        }

        .signin-login-card-right .input {
          min-height: 46px !important;
        }

        .signin-compact-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin: 10px 0 12px;
        }

        .signin-compact-options-row label {
          margin: 0 !important;
        }

        .signin-compact-help {
          margin: 12px 0 0;
          text-align: center;
          display: grid;
          gap: 10px;
        }

        .signin-login-card-right .signin-primary-button,
        .signin-login-card-right .signin-text-link,
        .signin-login-card-right .signin-compact-help-panel button,
        .signin-login-card-right .signin-switch button {
          width: 100% !important;
          min-height: 48px !important;
          border-radius: 16px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
        }

        .signin-text-link {
          appearance: none;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.065);
          color: #ffe58a;
          font-weight: 950;
          cursor: pointer;
          padding: 0 14px;
          text-decoration: none;
          box-shadow: none;
        }

        .signin-text-link:hover {
          border-color: rgba(255, 212, 59, 0.24);
          background: rgba(255,255,255,0.085);
          text-decoration: none;
        }

        .signin-compact-help-panel {
          display: grid;
          gap: 12px;
          margin-top: 0;
          padding: 12px;
          border-radius: 18px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255, 212, 59, 0.13);
          text-align: center;
        }

        .signin-compact-help-panel p {
          margin: 0;
          color: rgba(248,250,252,0.68);
          line-height: 1.42;
          font-size: 0.9rem;
        }

        .signin-verify-compact {
          margin: 12px 0 0;
        }

        .signin-login-card-right .signin-primary-button {
          margin-top: 12px !important;
        }

        .signin-switch {
          display: grid !important;
          gap: 10px !important;
          margin-top: 14px !important;
          text-align: center !important;
        }


        @media (max-width: 760px) {
          .signin-wrap-left-sales {
            width: min(100%, 520px) !important;
            min-height: calc(100vh - 24px);
            padding: 18px 12px 28px !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-content: start !important;
          }

          .signin-left-sales-desktop {
            display: none !important;
          }

          .signin-app-download-card {
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
          }

          .signin-login-card-right {
            height: auto !important;
            min-height: 0 !important;
            max-width: 460px !important;
            padding: 24px !important;
            display: block !important;
            background: rgba(255,255,255,0.075) !important;
          }
        }

        @media (max-width: 520px) {
          .signin-compact-options-row {
            justify-content: center;
            text-align: center;
          }
        }
      `}</style>

      <div className="signin-background-glow signin-glow-one"></div>
      <div className="signin-background-glow signin-glow-two"></div>

      <div className="signin-wrap-left-sales">

        <section className="signin-left-sales-desktop" aria-label="FromOne overview">
          <div className="signin-left-sales-main">
            <div className="page-eyebrow">FromOne beta access</div>
            <h1>Create better posts without the social media stress.</h1>
            <p>
              FromOne helps small businesses create, prepare, schedule and publish
              ready-to-review posts from one simple workspace.
            </p>
          </div>

          <div className="signin-left-sales-stack">
            <div>
              <span>01</span>
              <strong>Set up the business</strong>
              <p>Add your Business Profile so posts match your services, audience and tone.</p>
            </div>

            <div>
              <span>02</span>
              <strong>Create posts from media</strong>
              <p>Use photos, videos or flyers to create more relevant content.</p>
            </div>

            <div>
              <span>03</span>
              <strong>Review and publish</strong>
              <p>Schedule, autopublish where supported, or post manually with control.</p>
            </div>
          </div>

          <a
            className="signin-app-download-card"
            href="/download/FromOne-beta-v1.apk"
            download
            aria-label="Download the FromOne Android beta app"
          >
            <div>
              <span>FromOne App</span>
              <strong>Download Android beta</strong>
              <small>Install the beta app for faster mobile posting from your phone.</small>
            </div>

            <div className="signin-app-download-arrow" aria-hidden="true">↓</div>
          </a>

          <div className="signin-left-sales-price">
            <strong>7-day demo included</strong>
            <span>Then £39.99/month. FromOne Academy is built in to guide every step.</span>
          </div>
        </section>

        <section className="signin-card signin-login-card-right">
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

          <div className="signin-compact-options-row">
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
          </div>

          {mode === 'signin' && (
            <div className="signin-compact-help">
              <button
                type="button"
                className="signin-text-link"
                onClick={() => setShowResetOptions((current) => !current)}
              >
                Forgot password?
              </button>

              {showResetOptions && (
                <div className="signin-compact-help-panel">
                  <p>
                    Enter your email above and we’ll send a fresh password reset link.
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
            <div className="signin-compact-help signin-verify-compact">
              <button
                type="button"
                className="signin-text-link"
                onClick={() => setShowVerificationOptions((current) => !current)}
              >
                Waiting for verification email?
              </button>

              {showVerificationOptions && (
                <div className="signin-compact-help-panel">
                  <p>Use this if your account verification email has not arrived.</p>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleResendConfirmation}
                    disabled={loading || resettingPassword || resendingConfirmation}
                  >
                    {resendingConfirmation ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              )}
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
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
