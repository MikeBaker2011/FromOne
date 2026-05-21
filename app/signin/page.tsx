'use client';

import { useEffect, useState } from 'react';
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

  const saveRememberedEmail = (cleanEmail: string) => {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
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

    if (!cleanEmail) {
      alert('Please enter your email.');
      return;
    }

    if (!password.trim()) {
      alert('Please enter your password.');
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
        setMode('signin');
      }
    } catch (error: any) {
      alert(error?.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim();

    setAuthMessage('');

    if (!cleanEmail) {
      alert('Enter your email address first, then click resend verification email.');
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
    } catch (error: any) {
      alert(error?.message || 'Could not resend verification email.');
    } finally {
      setResendingConfirmation(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();

    setAuthMessage('');

    if (!cleanEmail) {
      alert('Enter your email address first, then click forgot password.');
      return;
    }

    setResettingPassword(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: 'https://fromone.co.uk/reset-password',
      });

      if (error) {
        throw error;
      }

      saveRememberedEmail(cleanEmail);
      setAuthMessage('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      alert(error?.message || 'Could not send password reset email.');
    } finally {
      setResettingPassword(false);
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
              Sign in to manage your Business Profile, upload media, create scheduled posts,
              and autopost to Facebook and Instagram.
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

          <label>
            <strong>Email address</strong>
          </label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <label>
            <strong>Password</strong>
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
          />

          {mode === 'signin' && (
            <div className="signin-options-row">
              <label className="signin-remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="signin-forgot-button"
                onClick={handleForgotPassword}
                disabled={resettingPassword || loading || resendingConfirmation}
              >
                {resettingPassword ? 'Sending reset email...' : 'Forgot password?'}
              </button>
            </div>
          )}

          <button
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