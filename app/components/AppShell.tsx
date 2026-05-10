'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { createClient } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const protectedRoutes = ['/dashboard', '/posts', '/settings'];

const publicMarketingRoutes = [
  '/',
  '/signin',
  '/reset-password',
  '/tutorial',
  '/product-updates',
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isProtectedRoute = () => {
    return protectedRoutes.some((route) => pathname.startsWith(route));
  };

  const isPublicMarketingRoute = () => {
    return publicMarketingRoutes.includes(pathname);
  };

  const shouldShowAppShell = () => {
    return !isPublicMarketingRoute();
  };

  const createTrialDates = () => {
    const started = new Date();
    const ends = new Date();

    ends.setDate(started.getDate() + 7);

    return {
      trial_started_at: started.toISOString(),
      trial_ends_at: ends.toISOString(),
    };
  };

  const checkAccess = async () => {
    setCheckingAccess(true);

    if (!isProtectedRoute()) {
      setCheckingAccess(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setCheckingAccess(false);
      router.replace('/signin');
      return;
    }

    const { data: billing, error } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Billing access check error:', error.message);
      setCheckingAccess(false);
      router.replace('/subscription');
      return;
    }

    if (!billing) {
      const trialDates = createTrialDates();

      const { error: insertError } = await supabase.from('user_billing').insert({
        user_id: user.id,
        plan: 'demo',
        status: 'trialing',
        trial_started_at: trialDates.trial_started_at,
        trial_ends_at: trialDates.trial_ends_at,
        is_trial_override: false,
        override_reason: null,
        manual_access_until: null,
        paypal_subscription_id: null,
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Create trial error:', insertError.message);
        setCheckingAccess(false);
        router.replace('/subscription');
        return;
      }

      setCheckingAccess(false);
      return;
    }

    const now = new Date();

    const plan = billing.plan || 'demo';
    const status = billing.status || 'trialing';
    const trialEndsAt = billing.trial_ends_at ? new Date(billing.trial_ends_at) : null;
    const manualAccessUntil = billing.manual_access_until
      ? new Date(billing.manual_access_until)
      : null;

    const hasActivePaidPlan =
      (plan === 'starter' || plan === 'pro') && status === 'active';

    const hasActiveTrial =
      plan === 'demo' &&
      status === 'trialing' &&
      trialEndsAt &&
      trialEndsAt.getTime() > now.getTime();

    const hasManualOverride =
      status === 'manual' &&
      manualAccessUntil &&
      manualAccessUntil.getTime() > now.getTime();

    const hasAccess = hasActivePaidPlan || hasActiveTrial || hasManualOverride;

    if (!hasAccess) {
      await supabase
        .from('user_billing')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      setCheckingAccess(false);
      router.replace('/subscription');
      return;
    }

    setCheckingAccess(false);
  };

  if (!shouldShowAppShell()) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="mobile-topbar">
        <div className="mobile-topbar-brand">
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="mobile-topbar-logo-img"
          />
          <span>FromOne</span>
        </div>

        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          type="button"
        >
          {menuOpen ? '×' : '☰'}
        </button>
      </div>

      <div className={menuOpen ? 'app-shell menu-open' : 'app-shell'}>
        <div
          className={menuOpen ? 'mobile-menu-overlay open' : 'mobile-menu-overlay'}
          onClick={() => setMenuOpen(false)}
        />

        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="main-content">
          {checkingAccess && isProtectedRoute() ? (
            <div className="premium-card">
              <div className="page-eyebrow">Checking Access</div>
              <h2 style={{ marginTop: 0 }}>Loading your FromOne workspace...</h2>
              <p>Please wait while we check your demo or subscription access.</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </>
  );
}