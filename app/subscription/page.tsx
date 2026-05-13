'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Plan = 'demo' | 'starter';

export default function SubscriptionPage() {
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

  const savePlan = async () => {
    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        alert('Please sign in first.');
        setSaving(false);
        return;
      }

      if (selectedPlan === 'demo' && status === 'expired') {
        alert('Your demo has ended. Please choose the monthly plan to continue.');
        setSaving(false);
        return;
      }

      const nextStatus = selectedPlan === 'demo' ? 'trialing' : 'pending_payment';

      const { error } = await supabase.from('user_billing').upsert({
        user_id: userId,
        plan: selectedPlan,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      setCurrentPlan(selectedPlan);
      setStatus(nextStatus);

      if (selectedPlan === 'starter') {
        alert(
          'Monthly plan selected. PayPal checkout is being connected, so you will not be charged yet.'
        );
      } else {
        alert('Demo access saved.');
      }

      await loadSubscription();
    } catch (error: any) {
      alert(error?.message || 'Error saving plan and billing preference.');
    } finally {
      setSaving(false);
    }
  };

  const cancelSubscription = async () => {
    if (!canCancel) {
      alert('There is no active PayPal subscription to cancel yet.');
      return;
    }

    const confirmed = confirm(
      'Cancel your FromOne Monthly subscription?\n\nThis will stop future renewals. You may keep access until the end of the current billing period depending on how your PayPal billing is configured.'
    );

    if (!confirmed) return;

    setCancelling(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        alert('Please sign in first.');
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

      alert('Subscription cancelled. Future renewals have been stopped.');
      await loadSubscription();
    } catch (error: any) {
      alert(error?.message || 'Error cancelling subscription.');
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

  const sharedFeatures = [
    'Create weekly social media posts',
    'Website scan or manual business profile',
    'Choose your social platforms',
    'Copy, paste, and publish workflow',
    '2 website scans per week',
  ];

  const plans = [
    {
      id: 'demo' as Plan,
      name: '7-Day Demo',
      price: 'Free',
      priceNote: 'for 7 days',
      valueNote: 'Demo access locks after 7 days unless you move to the monthly plan.',
      description: 'Try the full FromOne workflow free for 7 days.',
      buttonText: 'Use free demo',
      disabled: isDemoExpired,
      features: sharedFeatures,
    },
    {
      id: 'starter' as Plan,
      name: 'FromOne Monthly',
      price: '£29.99',
      priceNote: '/ month',
      valueNote: 'Less than £1 a day for weekly social media content.',
      description: 'Continue using the full FromOne workflow every week for your business.',
      buttonText: isCancelled ? 'Restart monthly plan' : 'Choose monthly plan',
      disabled: false,
      features: sharedFeatures,
    },
  ];

  const getAccessTitle = () => {
    if (isDemoActive) {
      return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
    }

    if (isDemoExpired) return 'Demo expired';
    if (hasPaidAccess) return 'Monthly plan active';
    if (isPendingPayment) return 'Payment setup pending';
    if (isCancelled) return 'Subscription cancelled';

    return 'Demo access';
  };

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">FromOne Plan & Billing</div>
        <h1 className="page-title">
          {isDemoExpired ? 'Your demo has ended.' : 'Simple pricing for small businesses.'}
        </h1>
        <p className="page-description">
          Start with a 7-day free demo, then continue with FromOne Monthly for £29.99 per
          month. That is less than £1 a day for weekly social media content, with no
          complicated tiers.
        </p>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading plan and billing...</p>
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
              <div className="page-eyebrow">Demo Ended</div>
              <h2 style={{ marginTop: 0 }}>Your 7-day demo has expired.</h2>
              <p>
                Dashboard, Posts, and Settings are now locked. Choose the monthly plan to
                continue using FromOne.
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
              <div className="page-eyebrow">Subscription Cancelled</div>
              <h2 style={{ marginTop: 0 }}>Your monthly plan has been cancelled.</h2>
              <p>
                Future renewals have been stopped. You can restart the monthly plan anytime.
              </p>
            </div>
          )}

          {isPendingPayment && (
            <div
              className="premium-card"
              style={{
                marginBottom: '24px',
                border: '1px solid rgba(255, 212, 59, 0.45)',
              }}
            >
              <div className="page-eyebrow">Payment Setup Pending</div>
              <h2 style={{ marginTop: 0 }}>PayPal checkout is being connected.</h2>
              <p>
                Your monthly plan preference has been saved, but you have not been charged yet.
                PayPal payment will be connected before live billing starts.
              </p>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <section className="hero-card">
              <div className="page-eyebrow">Current Access</div>

              <h2 style={{ marginTop: 0, fontSize: '38px' }}>{getAccessTitle()}</h2>

              <p>
                Plan:{' '}
                <strong>
                  {currentPlan === 'starter' ? 'FromOne Monthly' : '7-Day Demo'}
                </strong>
              </p>

              <p>
                Status: <strong>{status}</strong>
              </p>

              {currentPlan === 'demo' && (
                <>
                  <p>
                    Trial started: <strong>{formatDate(trialStartedAt)}</strong>
                  </p>

                  <p>
                    Trial ends: <strong>{formatDate(trialEndsAt)}</strong>
                  </p>
                </>
              )}

              {paypalSubscriptionId && (
                <p>
                  PayPal subscription:{' '}
                  <strong>{paypalSubscriptionId.slice(0, 8)}...</strong>
                </p>
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
                    minHeight: '620px',
                  }}
                >
                  <div style={{ minHeight: '220px' }}>
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
                        ? 'Demo Ended'
                        : isSelected
                          ? 'Selected'
                          : plan.buttonText}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="premium-card" style={{ marginTop: '24px' }}>
            <div className="page-eyebrow">Billing Management</div>
            <h2 style={{ marginTop: 0 }}>Manage your plan.</h2>
            <p>
              PayPal will manage monthly payments and renewals once connected. You will be
              able to cancel anytime from this page before your next billing date.
            </p>

            {!paypalSubscriptionId && currentPlan === 'starter' && (
              <p style={{ color: 'var(--muted)', fontWeight: 800 }}>
                PayPal is not connected yet, so no payment has been taken and cancellation is
                not required.
              </p>
            )}

            <div className="button-row" style={{ marginTop: '20px' }}>
              <button onClick={savePlan} disabled={saving || cancelling}>
                {saving
                  ? 'Saving...'
                  : selectedPlan === 'starter'
                    ? 'Save Monthly Plan'
                    : 'Save Demo Plan'}
              </button>

              <button
                className="secondary-button"
                onClick={() => setSelectedPlan(currentPlan)}
                disabled={saving || cancelling}
              >
                Cancel Changes
              </button>

              {canCancel && (
                <button
                  type="button"
                  className="secondary-button danger-button"
                  onClick={cancelSubscription}
                  disabled={saving || cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}