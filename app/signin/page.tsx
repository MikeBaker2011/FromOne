'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const REMEMBER_EMAIL_KEY = 'fromone_remember_email';

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authMessageType, setAuthMessageType] = useState<'info' | 'success' | 'error'>('info');

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

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

  const showMessage = (
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
  ) => {
    setAuthMessage(message);
    setAuthMessageType(type);
  };

  const getFriendlyAuthError = (error: any) => {
    const message = String(error?.message || error || '').trim();
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('invalid login credentials')) {
      return 'The email or password is not recognised. Check the details and try again.';
    }

    if (lowerMessage.includes('email not confirmed')) {
      return 'Please verify your email address first. You can resend the verification email below.';
    }

    if (lowerMessage.includes('user already registered') || lowerMessage.includes('already registered')) {
      return 'An account already exists for this email. Switch to Sign in and continue.';
    }

    if (lowerMessage.includes('password should be at least')) {
      return 'Please use a stronger password. It should be at least 6 characters.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return 'Too many attempts. Please wait a moment, then try again.';
    }

    return message || 'Something went wrong. Please try again.';
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
    const cleanEmail = email.trim().toLowerCase();

    setAuthMessage('');

    if (!cleanEmail) {
      showMessage('Please enter your email address.', 'error');
      return;
    }

    if (!password.trim()) {
      showMessage('Please enter your password.', 'error');
      return;
    }

    if (mode === 'signup' && password.trim().length < 6) {
      showMessage('Please use a password with at least 6 characters.', 'error');
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
        showMessage('Signed in. Opening your workspace...', 'success');

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
        showMessage(
          'Account created. Please check your email to verify your account. After verification, you will be sent to Business Profile setup.',
          'success',
        );
        setMode('signin');
        setPassword('');
      }
    } catch (error: any) {
      showMessage(getFriendlyAuthError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();

    setAuthMessage('');

    if (!cleanEmail) {
      showMessage('Enter your email address first, then resend the verification email.', 'error');
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
      showMessage('Verification email sent. Please check your inbox and spam folder.', 'success');
    } catch (error: any) {
      showMessage(getFriendlyAuthError(error), 'error');
    } finally {
      setResendingConfirmation(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    setAuthMessage('');

    if (!cleanEmail) {
      showMessage('Enter your email address first, then request a password reset.', 'error');
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
      showMessage('Password reset email sent. Please check your inbox.', 'success');
    } catch (error: any) {
      showMessage(getFriendlyAuthError(error), 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    handleAuth();
  };

  const isBusy = loading || resettingPassword || resendingConfirmation;
  const isSignIn = mode === 'signin';

  return (
    <div className="signin-page">
      <div className="signin-background-glow signin-glow-one"></div>
      <div className="signin-background-glow signin-glow-two"></div>

      <div className="signin-wrap">
        <section className="signin-intro">
          <div>
            <div className="page-eyebrow">FromOne workspace</div>

            <h1 className="signin-main-title">
              {isSignIn ? 'Welcome back to FromOne.' : 'Start your FromOne demo.'}
            </h1>

            <p className="signin-main-text">
              Upload photos, videos or flyers and turn them into weekly social posts. Review
              everything first, then autopost Facebook and Instagram or copy/open TikTok manually.
            </p>
          </div>

          <div className="signin-mini-grid">
            <div className="signin-mini-card">
              <span>01</span>
              <strong>Set up once</strong>
              <p>Add your Business Profile so posts match your services, customers and tone.</p>
            </div>

            <div className="signin-mini-card">
              <span>02</span>
              <strong>Create weekly posts</strong>
              <p>Upload this week’s media and FromOne creates posts with suggested times.</p>
            </div>

            <div className="signin-mini-card">
              <span>03</span>
              <strong>Review before live</strong>
              <p>Nothing goes out until you review, edit, publish, copy or schedule it.</p>
            </div>
          </div>
        </section>

        <section className="signin-card">
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="signin-logo-img"
          />

          <div className="page-eyebrow" style={{ marginTop: 8 }}>
            {isSignIn ? 'Sign in' : 'Create account'}
          </div>

          <h2>{isSignIn ? 'Continue to workspace' : 'Create your account'}</h2>

          <p className="signin-card-text">
            {isSignIn
              ? 'Access your Business Profile, saved posts and publishing tools.'
              : 'Create an account, verify your email, then set up your Business Profile.'}
          </p>

          {authMessage && (
            <div
              className="signin-auth-message"
              role={authMessageType === 'error' ? 'alert' : 'status'}
              style={{
                border:
                  authMessageType === 'error'
                    ? '1px solid rgba(255, 95, 109, 0.32)'
                    : authMessageType === 'success'
                      ? '1px solid rgba(61, 220, 151, 0.28)'
                      : undefined,
                background:
                  authMessageType === 'error'
                    ? 'rgba(255, 95, 109, 0.1)'
                    : authMessageType === 'success'
                      ? 'rgba(61, 220, 151, 0.1)'
                      : undefined,
              }}
            >
              {authMessage}
            </div>
          )}

          <label htmlFor="fromone-email">
            <strong>Email address</strong>
          </label>
          <input
            id="fromone-email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
          />

          <label htmlFor="fromone-password">
            <strong>Password</strong>
          </label>
          <input
            id="fromone-password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            placeholder={isSignIn ? 'Enter your password' : 'Create a password'}
          />

          {isSignIn && (
            <div className="signin-options-row">
              <label className="signin-remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember email</span>
              </label>

              <button
                type="button"
                className="signin-forgot-button"
                onClick={handleForgotPassword}
                disabled={isBusy}
              >
                {resettingPassword ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
          )}

          <button
            className="signin-primary-button"
            onClick={handleAuth}
            disabled={isBusy}
          >
            {loading
              ? isSignIn
                ? 'Signing in...'
                : 'Creating account...'
              : isSignIn
                ? 'Sign in'
                : 'Create account'}
          </button>

          {isSignIn && (
            <div className="signin-verification-help">
              <span>Need the verification email?</span>

              <button
                type="button"
                className="signin-resend-button"
                onClick={handleResendConfirmation}
                disabled={isBusy}
              >
                {resendingConfirmation ? 'Sending...' : 'Resend verification'}
              </button>
            </div>
          )}

          <div className="signin-switch">
            <span>
              {isSignIn ? 'New to FromOne?' : 'Already have an account?'}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setAuthMessage('');
                setPassword('');
                setMode(isSignIn ? 'signup' : 'signin');
              }}
              disabled={isBusy}
            >
              {isSignIn ? 'Start demo' : 'Sign in'}
            </button>
          </div>

          {!isSignIn && (
            <p
              style={{
                margin: '16px 0 0',
                color: 'var(--muted)',
                fontSize: 13,
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              By creating an account, you’ll receive a verification email before entering the
              Business Profile setup.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
