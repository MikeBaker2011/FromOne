'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
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

type Plan = 'demo' | 'starter';

export default function SubscriptionPage() {
  const { showToast } = useToast();

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

  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'cancelPendingPayment' | 'cancelSubscription';
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
  } | null>(null);

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const [selectedPlan, setSelectedPlan] = useState<Plan>('demo');
  const [currentPlan, setCurrentPlan] = useState<Plan>('demo');
  const [status, setStatus] = useState('trialing');
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [paypalSubscriptionId, setPaypalSubscriptionId] = useState<string | null>(null);
  const [cancelledAt, setCancelledAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingPayPal, setConfirmingPayPal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get('paypal');

    if (paypalStatus === 'approved') {
      confirmApprovedPayPalCheckout();
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    loadSubscription();

    if (paypalStatus === 'cancelled') {
      notify(
        'You can try again whenever you are ready.',
        'warning',
        'PayPal checkout cancelled',
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return 0;

    const now = new Date();
    const end = new Date(endDate);
    const difference = end.getTime() - now.getTime();

    return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
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

  const loadSubscription = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading plan and billing:', error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      const trialDates = createTrialDates();

      const { data: newBilling, error: insertError } = await supabase
        .from('user_billing')
        .insert({
          user_id: userId,
          plan: 'demo',
          status: 'trialing',
          trial_started_at: trialDates.trial_started_at,
          trial_ends_at: trialDates.trial_ends_at,
          is_trial_override: false,
          override_reason: null,
          manual_access_until: null,
          paypal_subscription_id: null,
          cancelled_at: null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating demo trial:', insertError.message);
        setLoading(false);
        return;
      }

      setCurrentPlan('demo');
      setSelectedPlan('demo');
      setStatus('trialing');
      setTrialStartedAt(newBilling.trial_started_at);
      setTrialEndsAt(newBilling.trial_ends_at);
      setPaypalSubscriptionId(newBilling.paypal_subscription_id || null);
      setCancelledAt(newBilling.cancelled_at || null);
      setDaysRemaining(calculateDaysRemaining(newBilling.trial_ends_at));
      setLoading(false);
      return;
    }

    const rawPlan = data.plan || 'demo';
    const plan: Plan = rawPlan === 'starter' || rawPlan === 'pro' ? 'starter' : 'demo';
    const billingStatus = data.status || 'trialing';
    const remaining = calculateDaysRemaining(data.trial_ends_at || null);

    if (plan === 'demo' && billingStatus === 'trialing' && remaining === 0) {
      await supabase
        .from('user_billing')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      setCurrentPlan('demo');
      setSelectedPlan('starter');
      setStatus('expired');
      setTrialStartedAt(data.trial_started_at || null);
      setTrialEndsAt(data.trial_ends_at || null);
      setPaypalSubscriptionId(data.paypal_subscription_id || null);
      setCancelledAt(data.cancelled_at || null);
      setDaysRemaining(0);
      setLoading(false);
      return;
    }

    setCurrentPlan(plan);
    setSelectedPlan(plan === 'demo' && billingStatus === 'expired' ? 'starter' : plan);
    setStatus(billingStatus);
    setTrialStartedAt(data.trial_started_at || null);
    setTrialEndsAt(data.trial_ends_at || null);
    setPaypalSubscriptionId(data.paypal_subscription_id || null);
    setCancelledAt(data.cancelled_at || null);
    setDaysRemaining(remaining);

    setLoading(false);
  };

  const confirmApprovedPayPalCheckout = async () => {
    setConfirmingPayPal(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify('Please sign in again, then return to Subscription and continue with PayPal.', 'warning', 'Sign in needed');
        await loadSubscription();
        return;
      }

      const response = await fetch('/api/paypal/confirm-subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'PayPal approved the checkout, but FromOne could not confirm the subscription yet.'
        );
      }

      if (result?.status === 'active') {
        notify('Starter access is active.', 'success', 'PayPal subscription confirmed');
      } else {
        notify(
          'PayPal approved the checkout. Confirmation is still pending, so please refresh in a moment.',
          'info',
          'PayPal confirmation pending',
        );
      }

      await loadSubscription();
    } catch (error: any) {
      notify(
        error?.message || 'PayPal approved the checkout, but confirmation failed.',
        'error',
        'PayPal confirmation failed',
      );
      await loadSubscription();
    } finally {
      setConfirmingPayPal(false);
    }
  };

  const startPayPalCheckout = async () => {
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify('Please sign in again, then return to Subscription and continue with PayPal.', 'warning', 'Sign in needed');
        return;
      }

      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.approve_url) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Could not start PayPal checkout. Please try again.'
        );
      }

      setCurrentPlan('starter');
      setSelectedPlan('starter');
      setStatus('pending_payment');
      setPaypalSubscriptionId(result.subscription_id || null);

      window.location.href = result.approve_url;
    } catch (error: any) {
      notify(error?.message || 'Error starting PayPal checkout.', 'error', 'PayPal checkout failed');
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async () => {
    if (selectedPlan === 'starter') {
      await startPayPalCheckout();
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        notify('Please sign in again, then return to Subscription and continue with PayPal.', 'warning', 'Sign in needed');
        setSaving(false);
        return;
      }

      if (selectedPlan === 'demo' && status === 'expired') {
        notify('Your demo has ended. Please choose the monthly plan to continue.', 'warning', 'Demo ended');
        setSaving(false);
        return;
      }

      const trialDates =
        !trialStartedAt || !trialEndsAt
          ? createTrialDates()
          : {
              trial_started_at: trialStartedAt,
              trial_ends_at: trialEndsAt,
            };

      const { error } = await supabase.from('user_billing').upsert({
        user_id: userId,
        plan: 'demo',
        status: 'trialing',
        trial_started_at: trialDates.trial_started_at,
        trial_ends_at: trialDates.trial_ends_at,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      setCurrentPlan('demo');
      setSelectedPlan('demo');
      setStatus('trialing');

      notify('Demo access saved.', 'success', 'Demo saved');

      await loadSubscription();
    } catch (error: any) {
      notify(error?.message || 'Error saving plan and billing preference.', 'error', 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const cancelPendingPayment = async () => {
    if (!isPendingPayment) {
      notify('There is no pending PayPal checkout to cancel.', 'warning', 'No pending payment');
      return;
    }

    setConfirmDialog({
      type: 'cancelPendingPayment',
      title: 'Cancel pending PayPal checkout?',
      message:
        'This will return your account to the demo plan. No PayPal payment will be taken from this pending checkout.',
      confirmLabel: 'Cancel pending payment',
      danger: true,
    });
  };

  const confirmCancelPendingPayment = async () => {
    if (!isPendingPayment) {
      notify('There is no pending PayPal checkout to cancel.', 'warning', 'No pending payment');
      closeConfirmDialog();
      return;
    }

    setCancelling(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        notify('Please sign in again, then return to Subscription and continue with PayPal.', 'warning', 'Sign in needed');
        return;
      }

      const nextStatus = daysRemaining > 0 ? 'trialing' : 'expired';

      const { error: billingError } = await supabase
        .from('user_billing')
        .update({
          plan: 'demo',
          status: nextStatus,
          paypal_subscription_id: null,
          cancelled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (billingError) {
        throw billingError;
      }

      await supabase
        .from('user_access')
        .update({
          access_status: nextStatus === 'trialing' ? 'trial' : 'expired',
          subscription_status: 'none',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      setCurrentPlan('demo');
      setSelectedPlan(nextStatus === 'expired' ? 'starter' : 'demo');
      setStatus(nextStatus);
      setPaypalSubscriptionId(null);
      closeConfirmDialog();

      notify('Pending PayPal checkout cancelled.', 'success', 'Pending payment cancelled');
      await loadSubscription();
    } catch (error: any) {
      notify(error?.message || 'Error cancelling pending payment.', 'error', 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  const cancelSubscription = async () => {
    if (!canCancel) {
      notify('There is no active PayPal subscription to cancel yet.', 'warning', 'No active subscription');
      return;
    }

    setConfirmDialog({
      type: 'cancelSubscription',
      title: 'Cancel Starter subscription?',
      message:
        'This will stop future renewals. You may keep access until the end of the current billing period depending on how your Starter billing is configured.',
      confirmLabel: 'Cancel subscription',
      danger: true,
    });
  };

  const confirmCancelSubscription = async () => {
    if (!canCancel) {
      notify('There is no active PayPal subscription to cancel yet.', 'warning', 'No active subscription');
      closeConfirmDialog();
      return;
    }

    setCancelling(true);
    closeConfirmDialog();
    notify('Cancelling your PayPal subscription now...', 'info', 'Cancelling subscription');

    const timeoutController = new AbortController();
    const timeoutId = window.setTimeout(() => timeoutController.abort(), 25000);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify('Please sign in again, then return to Subscription and cancel the subscription.', 'warning', 'Sign in needed');
        return;
      }

      if (!paypalSubscriptionId) {
        notify('No PayPal subscription reference was found on this account.', 'warning', 'No PayPal reference');
        return;
      }

      const response = await fetch('/api/paypal/cancel-subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paypalSubscriptionId,
          paypal_subscription_id: paypalSubscriptionId,
        }),
        signal: timeoutController.signal,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'PayPal cancellation failed. Please try again or contact support.'
        );
      }

      const cancelledDate = new Date().toISOString();

      setCurrentPlan('starter');
      setSelectedPlan('starter');
      setStatus('cancelled');
      setCancelledAt(cancelledDate);

      notify('Future renewals have been stopped.', 'success', 'Subscription cancelled');
      await loadSubscription();
    } catch (error: any) {
      const message =
        error?.name === 'AbortError'
          ? 'PayPal cancellation is taking too long. Please refresh and try again, or check PayPal directly.'
          : error?.message || 'Error cancelling subscription.';

      notify(message, 'error', 'Cancellation failed');
    } finally {
      window.clearTimeout(timeoutId);
      setCancelling(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'Not set';

    return new Date(value).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isDemoExpired = currentPlan === 'demo' && status === 'expired';
  const isDemoActive = currentPlan === 'demo' && status === 'trialing' && daysRemaining > 0;
  const hasPaidAccess = currentPlan === 'starter' && status === 'active';
  const isCancelled = status === 'cancelled';
  const isPendingPayment = status === 'pending_payment';

  const hasRealPayPalSubscription = paypalSubscriptionId?.startsWith('I-') === true;

  const hasManualStarterAccess =
    currentPlan === 'starter' &&
    status === 'active' &&
    Boolean(paypalSubscriptionId) &&
    !hasRealPayPalSubscription;

  const canCancel =
    currentPlan === 'starter' &&
    status === 'active' &&
    hasRealPayPalSubscription;

  const nextPaymentLabel = hasPaidAccess
    ? hasRealPayPalSubscription
      ? 'Managed in PayPal'
      : 'Managed manually'
    : isPendingPayment
      ? 'Available after PayPal confirms your subscription'
      : 'No active monthly payment';

  const paypalStatusLabel = isPendingPayment
    ? 'Pending checkout'
    : hasPaidAccess
      ? hasRealPayPalSubscription
        ? 'Active recurring subscription'
        : 'Manual access'
      : isCancelled
        ? 'Cancelled'
        : 'No active PayPal subscription';

  const demoFeatures = [
    '7-day access',
    'Try the upload-to-post workflow',
    'Create posts from uploaded media',
    'Suggested posting times',
    'Review and edit posts',
    'Facebook and Instagram publishing where connected',
    'TikTok copy/open manual posting',
  ];

  const monthlyFeatures = [
    'Upload photos, videos and flyers',
    'Posts written from uploaded media',
    'Automatic suggested posting times',
    'Facebook and Instagram autoposting',
    'Instagram-safe image resizing',
    'TikTok copy/open workflow',
    'Rewrite posts using media',
    'PayPal monthly billing',
  ];

  const plans = [
    {
      id: 'demo' as Plan,
      name: 'Demo',
      price: 'Free',
      priceNote: 'for 7 days',
      valueNote: 'Try FromOne with limited uploads, posts and website scans.',
      description:
        'Best for testing the simple upload, review and publish workflow before subscribing.',
      buttonText: 'Use demo',
      disabled: isDemoExpired,
      features: demoFeatures,
    },
    {
      id: 'starter' as Plan,
      name: 'Starter',
      price: '£19.99',
      priceNote: '/ month',
      valueNote: 'Introductory launch price for small businesses.',
      description:
        'Full monthly access to turn your weekly photos, videos and flyers into scheduled social posts.',
      buttonText: isCancelled ? 'Restart Starter' : 'Continue with PayPal',
      disabled: false,
      features: monthlyFeatures,
    },
  ];

  const getAccessTitle = () => {
    if (isDemoActive) {
      return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
    }

    if (isDemoExpired) return 'Demo expired';
    if (hasPaidAccess) return 'Starter plan active';
    if (isPendingPayment) return 'Payment pending';
    if (isCancelled) return 'Subscription cancelled';

    return 'Demo access';
  };

  return (
    <>
      <main className="subscription-simple-page">
        <header className="subscription-simple-header">
          <div className="page-eyebrow">Subscription</div>
          <h1>{isDemoExpired ? 'Your demo has ended.' : 'Choose your FromOne plan.'}</h1>
          <p>
            Start with a 7-day demo. Continue with the introductory Starter price of
            <strong> £19.99/month</strong>.
          </p>
        </header>

        {confirmingPayPal && (
          <section className="subscription-simple-notice">
            <strong>Checking PayPal...</strong>
            <span>FromOne is confirming your subscription and updating your access.</span>
          </section>
        )}

        {loading ? (
          <section className="subscription-simple-card subscription-simple-loading">
            Loading subscription...
          </section>
        ) : (
          <>
            {(isDemoExpired || isCancelled) && (
              <section className="subscription-simple-alert">
                <strong>{isDemoExpired ? 'Demo ended' : 'Subscription cancelled'}</strong>
                <span>
                  {isDemoExpired
                    ? 'Choose Starter to keep creating scheduled posts from your media.'
                    : 'Future renewals have been stopped. You can restart Starter anytime.'}
                </span>
              </section>
            )}

            <section className="subscription-current-strip">
              <div>
                <span>Current access</span>
                <strong>{getAccessTitle()}</strong>
              </div>

              <div className="subscription-current-meta">
                <span>Plan: {currentPlan === 'starter' ? 'Starter' : 'Demo'}</span>
                <span>Status: {status}</span>
                {currentPlan === 'demo' && <span>Ends: {formatDate(trialEndsAt)}</span>}
              </div>
            </section>

            <section className="subscription-plan-grid">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;

                return (
                  <article
                    key={plan.id}
                    className={`subscription-simple-card subscription-plan-option ${
                      isSelected ? 'is-selected' : ''
                    } ${plan.disabled ? 'is-disabled' : ''}`}
                  >
                    <div className="subscription-plan-head">
                      <span>{plan.name}</span>
                      {isSelected && <em>Selected</em>}
                    </div>

                    <div className="subscription-plan-price">
                      <strong>{plan.price}</strong>
                      <span>{plan.priceNote}</span>
                    </div>

                    <p>{plan.valueNote}</p>

                    <ul>
                      {plan.features.slice(0, 5).map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>

                    <button
                      className={isSelected ? '' : 'secondary-button'}
                      disabled={plan.disabled}
                      onClick={() => {
                        if (!plan.disabled) {
                          setSelectedPlan(plan.id);
                        }
                      }}
                    >
                      {plan.disabled
                        ? 'Demo ended'
                        : isSelected
                          ? 'Selected'
                          : plan.buttonText}
                    </button>
                  </article>
                );
              })}
            </section>

            <section className="subscription-simple-card subscription-billing-card">
              <div className="subscription-billing-title">
                <div>
                  <span>Starter billing</span>
                  <h2>PayPal monthly subscription</h2>
                </div>

                <strong>£19.99/month</strong>
              </div>

              <p>
                Introductory offer for the first 50 founding customers or until
                31 August 2026, whichever comes first. Standard price later:
                <strong> £39.99/month</strong>.
              </p>

              <div className="subscription-billing-grid">
                <div>
                  <span>Status</span>
                  <strong>{paypalStatusLabel}</strong>
                </div>

                <div>
                  <span>Next payment</span>
                  <strong>{nextPaymentLabel}</strong>
                </div>

                <div>
                  <span>PayPal reference</span>
                  <strong>
                    {paypalSubscriptionId
                      ? hasRealPayPalSubscription
                        ? `${paypalSubscriptionId.slice(0, 12)}...`
                        : 'Manual access'
                      : 'Not connected yet'}
                  </strong>
                </div>
              </div>

              {isPendingPayment && (
                <p className="subscription-simple-warning">
                  You started PayPal checkout but it has not been confirmed yet.
                </p>
              )}

              {hasPaidAccess && (
                <p className="subscription-simple-success">
                  {hasRealPayPalSubscription
                    ? 'Your subscription is active. Future payments and renewals are managed securely by PayPal.'
                    : 'Your Starter access is active and managed manually by FromOne.'}
                </p>
              )}

              {!hasPaidAccess && !isPendingPayment && (
                <p className="subscription-simple-muted">
                  Choose Starter above, then continue to PayPal to start the subscription.
                </p>
              )}

              <div className="subscription-action-row">
                <button onClick={savePlan} disabled={saving || cancelling}>
                  {saving
                    ? selectedPlan === 'starter'
                      ? 'Opening PayPal...'
                      : 'Saving...'
                    : selectedPlan === 'starter'
                      ? 'Continue with PayPal'
                      : 'Save Demo Plan'}
                </button>

                {isPendingPayment && (
                  <button
                    type="button"
                    className="secondary-button danger-button"
                    onClick={cancelPendingPayment}
                    disabled={saving || cancelling}
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel pending payment'}
                  </button>
                )}

                <button
                  className="secondary-button"
                  onClick={() => setSelectedPlan(currentPlan)}
                  disabled={saving || cancelling}
                >
                  Cancel changes
                </button>

                {canCancel && (
                  <button
                    type="button"
                    className="secondary-button danger-button"
                    onClick={cancelSubscription}
                    disabled={saving || cancelling}
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel subscription'}
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-confirm-title"
          className="subscription-dialog-backdrop"
        >
          <div className="premium-card subscription-dialog-card">
            <div className="page-eyebrow">
              {confirmDialog.danger ? 'Please confirm' : 'Confirm action'}
            </div>

            <h2 id="subscription-confirm-title">{confirmDialog.title}</h2>

            <p>{confirmDialog.message}</p>

            <div className="subscription-action-row subscription-dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeConfirmDialog}
                disabled={cancelling || saving}
              >
                Keep as is
              </button>

              <button
                type="button"
                className={confirmDialog.danger ? 'secondary-button danger-button' : undefined}
                onClick={() => {
                  if (confirmDialog.type === 'cancelPendingPayment') {
                    confirmCancelPendingPayment();
                    return;
                  }

                  if (confirmDialog.type === 'cancelSubscription') {
                    confirmCancelSubscription();
                  }
                }}
                disabled={cancelling || saving}
              >
                {cancelling ? 'Cancelling...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .subscription-simple-page {
          width: min(980px, calc(100vw - 28px));
          margin: 0 auto 56px;
          display: grid;
          gap: 18px;
        }

        .subscription-simple-header {
          text-align: center;
          max-width: 780px;
          margin: 0 auto 8px;
        }

        .subscription-simple-header h1 {
          margin: 8px 0 14px;
          color: #f8fafc;
          font-size: clamp(2.7rem, 6vw, 5.4rem);
          line-height: 0.9;
          letter-spacing: -0.08em;
          font-weight: 1000;
        }

        .subscription-simple-header p {
          margin: 0 auto;
          max-width: 680px;
          color: rgba(191, 219, 254, 0.88);
          font-size: clamp(1.02rem, 1.7vw, 1.2rem);
          line-height: 1.55;
          font-weight: 760;
        }

        .subscription-simple-card,
        .subscription-current-strip,
        .subscription-simple-alert,
        .subscription-simple-notice {
          border-radius: 28px;
          border: 1px solid rgba(255, 212, 59, 0.18);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 40%),
            rgba(15, 23, 42, 0.78);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.26);
        }

        .subscription-current-strip {
          width: min(680px, 100%);
          margin: 0 auto;
          padding: 22px 24px;
          display: grid;
          gap: 14px;
          text-align: center;
          justify-items: center;
        }

        .subscription-current-strip span,
        .subscription-plan-head span,
        .subscription-billing-title span,
        .subscription-billing-grid span {
          color: #ffd43b;
          font-size: 0.72rem;
          font-weight: 1000;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .subscription-current-strip strong {
          display: block;
          margin-top: 6px;
          color: #ffffff;
          font-size: clamp(1.8rem, 4vw, 2.7rem);
          line-height: 1;
          letter-spacing: -0.065em;
        }

        .subscription-current-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }

        .subscription-current-meta span {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          padding: 0 11px;
          border-radius: 999px;
          color: rgba(248,250,252,0.75);
          letter-spacing: 0;
          text-transform: none;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .subscription-plan-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .subscription-plan-option {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-height: 0;
        }

        .subscription-plan-option.is-selected {
          border-color: rgba(255, 212, 59, 0.58);
          transform: translateY(-2px);
        }

        .subscription-plan-option.is-disabled {
          opacity: 0.58;
        }

        .subscription-plan-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .subscription-plan-head em {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 999px;
          color: #05070d;
          background: #ffd43b;
          font-size: 0.75rem;
          font-style: normal;
          font-weight: 1000;
        }

        .subscription-plan-price strong {
          color: #ffffff;
          font-size: clamp(2.4rem, 5vw, 4rem);
          line-height: 0.9;
          font-weight: 1000;
          letter-spacing: -0.08em;
        }

        .subscription-plan-price span {
          color: rgba(248,250,252,0.58);
          font-weight: 900;
        }

        .subscription-plan-option p {
          margin: 0;
          color: rgba(248,250,252,0.7);
          line-height: 1.48;
          font-weight: 760;
        }

        .subscription-plan-option ul {
          display: grid;
          gap: 9px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .subscription-plan-option li {
          position: relative;
          padding-left: 22px;
          color: rgba(248,250,252,0.76);
          line-height: 1.36;
          font-weight: 800;
        }

        .subscription-plan-option li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #ffd43b;
          font-weight: 1000;
        }

        .subscription-plan-option button {
          width: 100%;
          margin-top: auto;
        }

        .subscription-billing-card {
          padding: 24px;
          display: grid;
          gap: 18px;
        }

        .subscription-billing-title {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: start;
        }

        .subscription-billing-title h2 {
          margin: 6px 0 0;
          color: #ffffff;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          line-height: 1;
          letter-spacing: -0.065em;
          font-weight: 1000;
        }

        .subscription-billing-title > strong {
          color: #ffd43b;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          line-height: 1;
          white-space: nowrap;
          letter-spacing: -0.06em;
        }

        .subscription-billing-card > p {
          margin: 0;
          color: rgba(248,250,252,0.68);
          line-height: 1.55;
          font-weight: 760;
        }

        .subscription-billing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .subscription-billing-grid div {
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .subscription-billing-grid strong {
          display: block;
          margin-top: 6px;
          color: rgba(248,250,252,0.76);
          font-size: 0.95rem;
          line-height: 1.25;
        }

        .subscription-simple-success,
        .subscription-simple-warning,
        .subscription-simple-muted {
          padding: 13px 14px;
          border-radius: 18px;
        }

        .subscription-simple-success {
          color: #ffe58a !important;
          background: rgba(255, 212, 59, 0.08);
          border: 1px solid rgba(255, 212, 59, 0.12);
          font-weight: 900 !important;
        }

        .subscription-simple-warning,
        .subscription-simple-alert {
          color: #fecaca;
          background: rgba(248, 113, 113, 0.09);
          border-color: rgba(248, 113, 113, 0.24);
        }

        .subscription-simple-alert,
        .subscription-simple-notice {
          padding: 16px 18px;
          display: grid;
          gap: 4px;
          text-align: center;
        }

        .subscription-simple-alert strong,
        .subscription-simple-notice strong {
          color: #ffffff;
          font-size: 1.1rem;
        }

        .subscription-simple-alert span,
        .subscription-simple-notice span {
          color: rgba(248,250,252,0.68);
          font-weight: 760;
        }

        .subscription-simple-muted {
          color: rgba(248,250,252,0.62) !important;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .subscription-action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .subscription-action-row button {
          min-height: 52px;
        }

        .subscription-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(2, 6, 23, 0.72);
          backdrop-filter: blur(14px);
        }

        .subscription-dialog-card {
          width: min(520px, 100%);
          border-radius: 30px;
          border: 1px solid rgba(255, 95, 109, 0.34);
          box-shadow: 0 34px 110px rgba(0,0,0,0.48);
        }

        .subscription-dialog-card h2 {
          margin: 4px 0 10px;
        }

        .subscription-dialog-card p {
          margin: 0 0 20px;
          color: var(--muted);
          line-height: 1.55;
        }

        .subscription-dialog-actions {
          justify-content: flex-end;
        }

        @media (max-width: 820px) {
          .subscription-simple-page {
            width: min(100%, calc(100vw - 24px));
            gap: 14px;
          }

          .subscription-plan-grid,
          .subscription-billing-grid {
            grid-template-columns: 1fr;
          }

          .subscription-billing-title {
            display: grid;
          }

          .subscription-action-row {
            display: grid;
            grid-template-columns: 1fr;
          }

          .subscription-action-row button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
