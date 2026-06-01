'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';
import { usePathname, useRouter } from 'next/navigation';

const protectedRoutes = ['/dashboard', '/posts', '/settings', '/subscription'];

const publicMarketingRoutes = [
  '/',
  '/signin',
  '/reset-password',
  '/tutorial',
  '/product-updates',
  '/pricing',
  '/privacy',
  '/terms',
  '/cookies',
  '/cookie-policy',
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
    return publicMarketingRoutes.some((route) => {
      if (route === '/') return pathname === '/';
      return pathname === route || pathname.startsWith(`${route}/`);
    });
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

  const handleInvalidSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out after invalid session failed:', error);
    }

    setCheckingAccess(false);

    if (isProtectedRoute()) {
      router.replace('/signin');
    }
  };

  const checkAccess = async () => {
    if (!isProtectedRoute()) {
      setCheckingAccess(false);
      return;
    }

    setCheckingAccess(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.warn('Auth access check error:', authError.message);

      if (
        authError.message.includes('Invalid Refresh Token') ||
        authError.message.includes('Refresh Token Not Found')
      ) {
        await handleInvalidSession();
        return;
      }

      setCheckingAccess(false);
      router.replace('/signin');
      return;
    }

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
      const expiredUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (plan === 'demo' && status === 'trialing') {
        expiredUpdate.status = 'expired';
      }

      if (Object.keys(expiredUpdate).length > 1) {
        await supabase
          .from('user_billing')
          .update(expiredUpdate)
          .eq('user_id', user.id);
      }

      setCheckingAccess(false);

      if (!pathname.startsWith('/subscription')) {
        router.replace('/subscription');
      }

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
          {checkingAccess && isProtectedRoute() && (
            <div
              aria-label="Checking access"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                height: 3,
                overflow: 'hidden',
                background: 'rgba(255, 212, 59, 0.08)',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '42%',
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, transparent, #ffd43b, transparent)',
                  animation: 'fromoneAccessBar 1.05s ease-in-out infinite',
                }}
              />
            </div>
          )}

          <style jsx global>{`
            @keyframes fromoneAccessBar {
              0% {
                transform: translateX(-120%);
              }

              100% {
                transform: translateX(260%);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              [aria-label="Checking access"] > div {
                animation: none !important;
              }
            }
          `}</style>

          {children}
        </main>
      </div>
    </>
  );
}