'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim()) {
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
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        router.push('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        alert('Account created. Check your email if confirmation is enabled, then sign in.');
        setMode('signin');
      }
    } catch (error: any) {
      alert(error?.message || 'Authentication error.');
    } finally {
      setLoading(false);
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
              Access your campaigns, business profiles, scheduled posts, and 7-day
              demo trial from one simple workspace.
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
              <strong>Workspace</strong>
              <p>Save business profiles, campaigns, and posts.</p>
            </div>

            <div className="signin-mini-card">
              <span>03</span>
              <strong>Trial</strong>
              <p>Use your 7-day demo or continue with a plan.</p>
            </div>
          </div>
        </section>

        <section className="signin-card">
          <div className="signin-logo">F</div>

          <h2>{mode === 'signin' ? 'Welcome back' : 'Create account'}</h2>

          <p className="signin-card-text">
            {mode === 'signin'
              ? 'Sign in to continue to your FromOne workspace.'
              : 'Create your account to start your FromOne demo.'}
          </p>

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

          <button className="signin-primary-button" onClick={handleAuth} disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>

          <div className="signin-switch">
            <span>
              {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}