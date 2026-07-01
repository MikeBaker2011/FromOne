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

  const [pageMounted, setPageMounted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
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
    setPageMounted(true);
  }, []);

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
      } finally {
        if (isMounted) {
          setCheckingSession(false);
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

  if (!pageMounted || checkingSession) {
    return null;
  }

  return (
    <main className="fromone-signin-page signin-page">
      <section className="signin-card" aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}>
        <div className="signin-brand">
          <img src="/fromone-logo.png" alt="FromOne" />
          <div>
            <strong>FromOne</strong>
            <span>Upload it. Post it. Done.</span>
          </div>
        </div>

        <div className="signin-heading">
          <p className="signin-eyebrow">{mode === 'signin' ? 'WELCOME BACK' : 'START WITH FROMONE'}</p>
          <h1>{mode === 'signin' ? 'Sign in.' : 'Create account.'}</h1>
          <p>
            {mode === 'signin'
              ? 'Open your workspace to create posts, review drafts and manage Smiles-ready offers.'
              : 'Create your account to start making Facebook, Instagram and Smiles-ready posts.'}
          </p>
        </div>

        <div className="signin-mode-tabs" aria-label="Choose sign in or register">
          <button
            type="button"
            className={mode === 'signin' ? 'is-active' : ''}
            onClick={() => {
              setAuthMessage('');
              setAuthError('');
              setPassword('');
              setShowPassword(false);
              setMode('signin');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'is-active' : ''}
            onClick={() => {
              setAuthMessage('');
              setAuthError('');
              setPassword('');
              setShowPassword(false);
              setMode('signup');
            }}
          >
            Register
          </button>
        </div>

        <div ref={messageRef}>
          {authMessage && <div className="signin-message">{authMessage}</div>}
          {authError && <div className="signin-message is-error">{authError}</div>}
        </div>

        <label className="signin-field" htmlFor="email">
          <span>Email address</span>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="signin-field" htmlFor="password">
          <span>Password</span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password'}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>

        <div className="signin-options">
          <label>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            <span>Show password</span>
          </label>

          {mode === 'signin' && (
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Remember email</span>
            </label>
          )}
        </div>

        <button
          type="button"
          className="signin-primary"
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
          <div className="signin-help">
            <button
              type="button"
              onClick={() => setShowResetOptions((current) => !current)}
            >
              Forgot password?
            </button>

            {showResetOptions && (
              <div className="signin-help-panel">
                <p>Enter your email above and FromOne will send a fresh password reset link.</p>
                <button
                  type="button"
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

        {mode === 'signin' && (
          <div className="signin-help">
            <button
              type="button"
              onClick={() => setShowVerificationOptions((current) => !current)}
            >
              Waiting for verification email?
            </button>

            {showVerificationOptions && (
              <div className="signin-help-panel">
                <p>Use this if your account verification email has not arrived.</p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={loading || resettingPassword || resendingConfirmation}
                >
                  {resendingConfirmation ? 'Sending...' : 'Resend verification email'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <style jsx global>{`
        body:has(.fromone-signin-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-signin-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-signin-page) .app-shell,
        body:has(.fromone-signin-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-signin-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-signin-page.signin-page {
          width: 100% !important;
          min-height: 100vh !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 32px 16px !important;
          background:
            radial-gradient(circle at 15% 0%, rgba(247, 37, 133, 0.10), transparent 30rem),
            radial-gradient(circle at 90% 10%, rgba(255, 193, 7, 0.18), transparent 28rem),
            #f5f7fb !important;
          color: #071b49 !important;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          box-sizing: border-box !important;
        }

        .fromone-signin-page .signin-card {
          width: min(520px, 100%) !important;
          margin: 0 auto !important;
          padding: clamp(28px, 4vw, 42px) !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.12) !important;
          box-sizing: border-box !important;
        }

        .fromone-signin-page .signin-brand {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          margin-bottom: 28px !important;
        }

        .fromone-signin-page .signin-brand img {
          width: 54px !important;
          height: 54px !important;
          object-fit: contain !important;
          border-radius: 16px !important;
          box-shadow: 0 14px 30px rgba(255, 193, 7, 0.24) !important;
        }

        .fromone-signin-page .signin-brand strong {
          display: block !important;
          color: #071b49 !important;
          font-size: 1.35rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: -0.055em !important;
        }

        .fromone-signin-page .signin-brand span {
          display: block !important;
          margin-top: 5px !important;
          color: #52617a !important;
          font-size: 0.82rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
        }

        .fromone-signin-page .signin-heading {
          margin-bottom: 20px !important;
        }

        .fromone-signin-page .signin-eyebrow {
          margin: 0 0 10px !important;
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 850 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
        }

        .fromone-signin-page .signin-heading h1 {
          margin: 0 !important;
          color: #071b49 !important;
          font-size: clamp(2.8rem, 8vw, 4.1rem) !important;
          line-height: 0.94 !important;
          font-weight: 850 !important;
          letter-spacing: -0.065em !important;
        }

        .fromone-signin-page .signin-heading p:not(.signin-eyebrow) {
          margin: 14px 0 0 !important;
          color: #52617a !important;
          font-size: 1rem !important;
          line-height: 1.5 !important;
          font-weight: 650 !important;
        }

        .fromone-signin-page .signin-mode-tabs {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          margin-bottom: 18px !important;
          padding: 6px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          background: #f7f9fd !important;
        }

        .fromone-signin-page .signin-mode-tabs button {
          min-height: 44px !important;
          border: 0 !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: #52617a !important;
          font: inherit !important;
          font-weight: 850 !important;
          cursor: pointer !important;
        }

        .fromone-signin-page .signin-mode-tabs button.is-active {
          background: #f72585 !important;
          color: #ffffff !important;
          box-shadow: 0 14px 30px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-signin-page .signin-message {
          margin: 0 0 14px !important;
          padding: 13px 14px !important;
          border: 1px solid #b9f2d6 !important;
          border-radius: 18px !important;
          background: #f0fff7 !important;
          color: #007a4d !important;
          line-height: 1.45 !important;
          font-weight: 750 !important;
        }

        .fromone-signin-page .signin-message.is-error {
          border-color: #ffc8df !important;
          background: #fff6fa !important;
          color: #b0004f !important;
        }

        .fromone-signin-page .signin-field {
          display: grid !important;
          gap: 8px !important;
          margin-top: 14px !important;
        }

        .fromone-signin-page .signin-field span {
          color: #071b49 !important;
          font-size: 0.88rem !important;
          font-weight: 850 !important;
        }

        .fromone-signin-page .signin-field input {
          width: 100% !important;
          min-height: 56px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 18px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          padding: 0 16px !important;
          font: inherit !important;
          font-weight: 650 !important;
          outline: none !important;
          box-sizing: border-box !important;
        }

        .fromone-signin-page .signin-field input:focus {
          border-color: #f72585 !important;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.10) !important;
        }

        .fromone-signin-page .signin-options {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
          flex-wrap: wrap !important;
          margin: 14px 0 18px !important;
        }

        .fromone-signin-page .signin-options label {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          color: #52617a !important;
          font-size: 0.9rem !important;
          font-weight: 750 !important;
        }

        .fromone-signin-page .signin-options input {
          width: 18px !important;
          height: 18px !important;
          accent-color: #f72585 !important;
        }

        .fromone-signin-page .signin-primary {
          width: 100% !important;
          min-height: 58px !important;
          border: 0 !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font: inherit !important;
          font-size: 1rem !important;
          font-weight: 850 !important;
          box-shadow: 0 18px 42px rgba(247, 37, 133, 0.22) !important;
          cursor: pointer !important;
        }

        .fromone-signin-page .signin-primary:disabled,
        .fromone-signin-page .signin-help-panel button:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }

        .fromone-signin-page .signin-help {
          margin-top: 14px !important;
          text-align: center !important;
        }

        .fromone-signin-page .signin-help > button {
          border: 0 !important;
          background: transparent !important;
          color: #f72585 !important;
          font: inherit !important;
          font-size: 0.92rem !important;
          font-weight: 850 !important;
          cursor: pointer !important;
        }

        .fromone-signin-page .signin-help-panel {
          margin-top: 10px !important;
          padding: 14px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 18px !important;
          background: #f7f9fd !important;
          text-align: left !important;
        }

        .fromone-signin-page .signin-help-panel p {
          margin: 0 0 12px !important;
          color: #52617a !important;
          line-height: 1.45 !important;
          font-weight: 650 !important;
        }

        .fromone-signin-page .signin-help-panel button {
          width: 100% !important;
          min-height: 46px !important;
          border: 1px solid #ffc8df !important;
          border-radius: 999px !important;
          background: #fff6fa !important;
          color: #f72585 !important;
          font: inherit !important;
          font-weight: 850 !important;
          cursor: pointer !important;
        }

        @media (max-width: 620px) {
          .fromone-signin-page.signin-page {
            align-items: flex-start !important;
            padding: 24px 14px !important;
          }

          .fromone-signin-page .signin-card {
            padding: 26px 22px !important;
            border-radius: 28px !important;
          }

          .fromone-signin-page .signin-brand {
            justify-content: center !important;
            text-align: left !important;
          }

          .fromone-signin-page .signin-heading {
            text-align: center !important;
          }

          .fromone-signin-page .signin-heading h1 {
            font-size: clamp(2.7rem, 14vw, 3.7rem) !important;
          }

          .fromone-signin-page .signin-options {
            justify-content: center !important;
          }
        }
      `}</style>
    </main>
  );
}
