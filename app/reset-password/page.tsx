'use client';

import { useState } from 'react';
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
          <div className="signin-logo">F</div>

          <h2>Reset password</h2>

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

          <button className="signin-primary-button" onClick={updatePassword} disabled={saving}>
            {saving ? 'Saving...' : 'Update password'}
          </button>
        </section>
      </div>
    </div>
  );
}