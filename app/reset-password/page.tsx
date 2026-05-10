'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);

  useEffect(() => {
    prepareRecoverySession();
  }, []);

  const prepareRecoverySession = async () => {
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          alert(error.message);
          setLinkReady(false);
          return;
        }

        setLinkReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setLinkReady(true);
        return;
      }

      setLinkReady(false);
    } catch (error: any) {
      alert(error?.message || 'Could not verify password reset link.');
      setLinkReady(false);
    } finally {
      setCheckingLink(false);
    }
  };

  const updatePassword = async () => {
    if (!password.trim()) {
      alert('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
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

      alert('Password updated. Please sign in with your new password.');
      router.push('/signin');
    } catch (error: any) {
      alert(error?.message || 'Could not update password.');
    } finally {
      setSaving(false);
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
              Enter a new password for your FromOne account. Once saved, you can sign in
              and continue using your workspace.
            </p>
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
            <p className="signin-card-text">Checking your password reset link...</p>
          ) : !linkReady ? (
            <>
              <p className="signin-card-text">
                This password reset link is missing, expired, or has already been used.
              </p>

              <button
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

              <label>
                <strong>New password</strong>
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter new password"
              />

              <label>
                <strong>Confirm password</strong>
              </label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
              />

              <button
                className="signin-primary-button"
                onClick={updatePassword}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Update password'}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}