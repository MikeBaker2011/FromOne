'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';
import { usePathname, useRouter } from 'next/navigation';

const protectedRoutes = [
  '/dashboard',
  '/posts',
  '/reports',
  '/settings',
  '/subscription',
];

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
  const accessCheckedOnceRef = useRef(false);

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

  const finishAccessCheck = () => {
    accessCheckedOnceRef.current = true;
    setCheckingAccess(false);
  };

  const handleInvalidSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out after invalid session failed:', error);
    }

    finishAccessCheck();

    if (isProtectedRoute()) {
      router.replace('/signin');
    }
  };

  const checkAccess = async () => {
    if (!isProtectedRoute()) {
      finishAccessCheck();
      return;
    }

    if (!accessCheckedOnceRef.current) {
      setCheckingAccess(true);
    }

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

      finishAccessCheck();
      router.replace('/signin');
      return;
    }

    const user = authData.user;

    if (!user) {
      finishAccessCheck();
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
      finishAccessCheck();
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
        finishAccessCheck();
        router.replace('/subscription');
        return;
      }

      finishAccessCheck();
      return;
    }

    const now = new Date();

    const plan = String(billing.plan || 'demo').toLowerCase();
    const status = String(billing.status || 'trialing').toLowerCase();
    const trialEndsAt = billing.trial_ends_at
      ? new Date(billing.trial_ends_at)
      : null;
    const manualAccessUntil = billing.manual_access_until
      ? new Date(billing.manual_access_until)
      : null;

    const hasBetaAccess = status === 'beta' || plan === 'beta';

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

    const hasAccess =
      hasBetaAccess || hasActivePaidPlan || hasActiveTrial || hasManualOverride;

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

      finishAccessCheck();

      if (!pathname.startsWith('/subscription')) {
        router.replace('/subscription');
      }

      return;
    }

    finishAccessCheck();
  };


  const getRouteClassName = () => {
    if (pathname.startsWith('/dashboard')) return 'fromone-route-dashboard';
    if (pathname.startsWith('/posts')) return 'fromone-route-posts';
    if (pathname.startsWith('/reports')) return 'fromone-route-reports';
    if (pathname.startsWith('/settings')) return 'fromone-route-settings';
    if (pathname.startsWith('/subscription')) return 'fromone-route-subscription';

    return '';
  };

  if (!shouldShowAppShell()) {
    return <>{children}</>;
  }

  return (
    <>
      {/* 
        Do not use the old "mobile-topbar" class here.
        Some existing/global CSS hides that class on the Posts page, causing the menu
        to flash then disappear. This custom topbar is independent and cannot be
        affected by those old selectors.
      */}
      <div className="fromone-account-topbar">
        <div className="fromone-account-topbar-brand">
          <img
            src="/fromone-logo.png"
            alt="FromOne"
            className="fromone-account-topbar-logo"
            width={34}
            height={34}
          />
          <div className="fromone-mobile-brand-copy">
            <strong>FromOne</strong>
            <span>Upload it. Post it. Done.</span>
          </div>
        </div>

        <button
          className="fromone-account-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle account menu"
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

        <main className={`main-content fromone-mobile-bottom-safe ${getRouteClassName()}`}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        .fromone-account-topbar {
          display: none;
        }

        @media (max-width: 900px) {
          .fromone-account-topbar {
            position: sticky !important;
            top: 0 !important;
            z-index: 1200 !important;
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            min-height: 62px !important;
            height: 62px !important;
            padding: 8px 16px !important;
            background: rgba(5, 11, 24, 0.96) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            transform: none !important;
            pointer-events: auto !important;
          }

          .fromone-account-topbar-brand {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            align-items: center !important;
            gap: 10px !important;
            min-width: 0 !important;
            color: #ffffff !important;
            font-size: 1.05rem !important;
            font-weight: 950 !important;
            letter-spacing: -0.04em !important;
          }


          /* Stop mobile topbar/logo flashing during route changes */
          .fromone-account-topbar,
          .fromone-account-topbar * {
            transition: none !important;
            animation: none !important;
          }


          .fromone-account-topbar-logo {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 34px !important;
            height: 34px !important;
            min-width: 34px !important;
            border-radius: 10px !important;
            object-fit: contain !important;
            background: #ffd43b !important;
            transition: none !important;
            animation: none !important;
          }

          .fromone-mobile-brand-copy {
            display: grid !important;
            gap: 2px !important;
            min-width: 0 !important;
          }

          .fromone-mobile-brand-copy strong {
            display: block !important;
            color: #ffffff !important;
            font-size: 1.04rem !important;
            line-height: 1 !important;
            font-weight: 1000 !important;
            letter-spacing: -0.045em !important;
          }

          .fromone-mobile-brand-copy span {
            display: block !important;
            color: rgba(255, 255, 255, 0.68) !important;
            font-size: 0.68rem !important;
            line-height: 1.1 !important;
            font-weight: 750 !important;
            letter-spacing: -0.01em !important;
          }

          .fromone-account-menu-button {
            display: inline-flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            align-items: center !important;
            justify-content: center !important;
            width: 46px !important;
            height: 46px !important;
            min-width: 46px !important;
            border: 0 !important;
            border-radius: 16px !important;
            background: #ffd43b !important;
            color: #061225 !important;
            font-size: 1.5rem !important;
            font-weight: 1000 !important;
            line-height: 1 !important;
            cursor: pointer !important;
            box-shadow:
              0 12px 26px rgba(255, 212, 59, 0.22),
              inset 0 1px 0 rgba(255, 255, 255, 0.34) !important;
            -webkit-tap-highlight-color: transparent;
          }

          .fromone-mobile-bottom-safe {
            padding-bottom: max(7.25rem, calc(7.25rem + env(safe-area-inset-bottom))) !important;
          }
        }

        @media (min-width: 901px) {
          .fromone-account-topbar {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
