'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  useEffect(() => {
    loadSubscription();

    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get('paypal');

    if (paypalStatus === 'approved') {
      notify(
        'Your account will update once PayPal confirms the subscription.',
        'success',
        'PayPal checkout approved',
      );
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (paypalStatus === 'cancelled') {
      notify(
        'You can try again whenever you are ready.',
        'warning',
        'PayPal checkout cancelled',
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
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

  const startPayPalCheckout = async () => {
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify('Please sign in first.', 'warning', 'Sign in needed');
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
        notify('Please sign in first.', 'warning', 'Sign in needed');
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
        notify('Please sign in first.', 'warning', 'Sign in needed');
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

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        notify('Please sign in first.', 'warning', 'Sign in needed');
        setCancelling(false);
        return;
      }

      const response = await fetch('/api/paypal/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paypalSubscriptionId,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'PayPal cancellation failed. Please try again or contact support.'
        );
      }

      const { error: billingError } = await supabase
        .from('user_billing')
        .update({
          plan: 'starter',
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (billingError) {
        throw billingError;
      }

      await supabase
        .from('user_access')
        .update({
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      setStatus('cancelled');
      setCancelledAt(new Date().toISOString());
      closeConfirmDialog();

      notify('Future renewals have been stopped.', 'success', 'Subscription cancelled');
      await loadSubscription();
    } catch (error: any) {
      notify(error?.message || 'Error cancelling subscription.', 'error', 'Cancellation failed');
    } finally {
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

  const canCancel =
    currentPlan === 'starter' &&
    status === 'active' &&
    Boolean(paypalSubscriptionId);

  const nextPaymentLabel = hasPaidAccess
    ? 'Managed in PayPal'
    : isPendingPayment
      ? 'Available after PayPal confirms your subscription'
      : 'No active monthly payment';

  const paypalStatusLabel = isPendingPayment
    ? 'Pending checkout'
    : hasPaidAccess
      ? 'Active recurring subscription'
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
      price: '£39.99',
      priceNote: '/ month',
      valueNote: 'Weekly media-to-post creation for small businesses.',
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
      <div className="page-header">
        <div className="page-eyebrow">Subscription</div>
        <h1 className="page-title">
          {isDemoExpired ? 'Your demo has ended.' : 'Simple access for small businesses.'}
        </h1>
        <p className="page-description">
          Start with a 7-day demo, then continue with FromOne Starter for £39.99/month.
          Upload photos, videos or flyers, create scheduled posts, autopost Facebook and
          Instagram, or copy/open TikTok manually.
        </p>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading subscription...</p>
        </div>
      ) : (
        <>
          {isDemoExpired && (
            <div
              className="premium-card"
              style={{
                marginBottom: '24px',
                border: '1px solid rgba(255, 95, 109, 0.45)',
              }}
            >
              <div className="page-eyebrow">Demo ended</div>
              <h2 style={{ marginTop: 0 }}>Your 7-day demo has expired.</h2>
              <p>
                Choose Starter to keep creating scheduled posts from your photos, videos,
                flyers and saved Business Profile.
              </p>
            </div>
          )}

          {isCancelled && (
            <div
              className="premium-card"
              style={{
                marginBottom: '24px',
                border: '1px solid rgba(255, 95, 109, 0.45)',
              }}
            >
              <div className="page-eyebrow">Subscription cancelled</div>
              <h2 style={{ marginTop: 0 }}>Your Starter plan has been cancelled.</h2>
              <p>
                Future renewals have been stopped. You can restart Starter anytime.
              </p>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <section className="hero-card">
              <div className="page-eyebrow">Current access</div>

              <h2 style={{ marginTop: 0, fontSize: '38px' }}>{getAccessTitle()}</h2>

              <p>
                Plan:{' '}
                <strong>
                  {currentPlan === 'starter' ? 'Starter' : 'Demo'}
                </strong>
              </p>

              <p>
                Status: <strong>{status}</strong>
              </p>

              {currentPlan === 'demo' && (
                <>
                  <p>
                    Demo started: <strong>{formatDate(trialStartedAt)}</strong>
                  </p>

                  <p>
                    Demo ends: <strong>{formatDate(trialEndsAt)}</strong>
                  </p>
                </>
              )}

              {cancelledAt && (
                <p>
                  Cancelled: <strong>{formatDate(cancelledAt)}</strong>
                </p>
              )}
            </section>
          </div>

          <div className="grid grid-two">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;

              return (
                <section
                  key={plan.id}
                  className="premium-card"
                  style={{
                    opacity: plan.disabled ? 0.55 : 1,
                    border: isSelected ? '1px solid rgba(255, 212, 59, 0.65)' : undefined,
                    transform: isSelected ? 'translateY(-3px)' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '560px',
                  }}
                >
                  <div style={{ minHeight: '190px' }}>
                    <div className="page-eyebrow">{plan.name}</div>

                    <h2
                      style={{
                        marginTop: 0,
                        marginBottom: '8px',
                        fontSize: '44px',
                        lineHeight: 1.05,
                      }}
                    >
                      {plan.price}
                      <span style={{ color: 'var(--muted)', fontSize: '16px' }}>
                        {' '}
                        {plan.priceNote}
                      </span>
                    </h2>

                    <p
                      style={{
                        margin: '0 0 18px',
                        color: plan.id === 'starter' ? 'var(--gold)' : 'var(--muted)',
                        fontWeight: 900,
                        lineHeight: 1.5,
                        minHeight: '48px',
                      }}
                    >
                      {plan.valueNote}
                    </p>

                    <p style={{ marginBottom: 0 }}>{plan.description}</p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '10px',
                      margin: '22px 0',
                    }}
                  >
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="card"
                        style={{
                          padding: '12px',
                          minHeight: '46px',
                          display: 'flex',
                          alignItems: 'center',
                          fontWeight: 800,
                        }}
                      >
                        ✓ {feature}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <button
                      className={isSelected ? '' : 'secondary-button'}
                      disabled={plan.disabled}
                      onClick={() => {
                        if (!plan.disabled) {
                          setSelectedPlan(plan.id);
                        }
                      }}
                      style={{ width: '100%' }}
                    >
                      {plan.disabled
                        ? 'Demo ended'
                        : isSelected
                          ? 'Selected'
                          : plan.buttonText}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>

          <div
            className="premium-card"
            style={{
              marginTop: '24px',
              border: '1px solid rgba(255, 212, 59, 0.28)',
              background:
                'radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), rgba(255, 255, 255, 0.04) 42%, rgba(15, 23, 42, 0.88))',
            }}
          >
            <div className="page-eyebrow">Starter billing</div>
            <h2 style={{ marginTop: 0 }}>Secure monthly billing with PayPal.</h2>

            <p>
              FromOne Starter is a recurring PayPal subscription at{' '}
              <strong>£39.99/month</strong>. PayPal manages the payment securely, and FromOne
              unlocks Starter access once PayPal confirms the subscription.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginTop: '20px',
              }}
            >
              <div className="card" style={{ padding: '14px' }}>
                <strong>Status</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontWeight: 800 }}>
                  {paypalStatusLabel}
                </p>
              </div>

              <div className="card" style={{ padding: '14px' }}>
                <strong>Recurring payment</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontWeight: 800 }}>
                  £39.99/month
                </p>
              </div>

              <div className="card" style={{ padding: '14px' }}>
                <strong>Next payment</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontWeight: 800 }}>
                  {nextPaymentLabel}
                </p>
              </div>

              <div className="card" style={{ padding: '14px' }}>
                <strong>PayPal reference</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontWeight: 800 }}>
                  {paypalSubscriptionId
                    ? `${paypalSubscriptionId.slice(0, 12)}...`
                    : 'Not connected yet'}
                </p>
              </div>
            </div>

            {isPendingPayment && (
              <p style={{ marginTop: '18px', color: 'var(--gold)', fontWeight: 900 }}>
                You started PayPal checkout but it has not been confirmed yet. You can complete
                checkout or cancel the pending setup below.
              </p>
            )}

            {hasPaidAccess && (
              <p style={{ marginTop: '18px', color: 'var(--gold)', fontWeight: 900 }}>
                Your subscription is active. Future payments and renewals are managed securely by
                PayPal.
              </p>
            )}

            {!hasPaidAccess && !isPendingPayment && (
              <p style={{ marginTop: '18px', color: 'var(--muted)', fontWeight: 800 }}>
                Choose Starter above, then continue to PayPal to start the subscription.
              </p>
            )}

            <div className="button-row" style={{ marginTop: '22px' }}>
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
          </div>
        </>
      )}

      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-confirm-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: 18,
            background: 'rgba(2, 6, 23, 0.72)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div
            className="premium-card"
            style={{
              width: 'min(520px, 100%)',
              borderRadius: 30,
              border: confirmDialog.danger
                ? '1px solid rgba(255, 95, 109, 0.34)'
                : '1px solid rgba(255, 212, 59, 0.26)',
              boxShadow: '0 34px 110px rgba(0,0,0,0.48)',
            }}
          >
            <div className="page-eyebrow">
              {confirmDialog.danger ? 'Please confirm' : 'Confirm action'}
            </div>

            <h2 id="subscription-confirm-title" style={{ margin: '4px 0 10px' }}>
              {confirmDialog.title}
            </h2>

            <p style={{ margin: '0 0 20px', color: 'var(--muted)', lineHeight: 1.55 }}>
              {confirmDialog.message}
            </p>

            <div
              className="button-row"
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}
            >
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
                {cancelling ? 'Working...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
