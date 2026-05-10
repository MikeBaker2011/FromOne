'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Plan = 'demo' | 'starter' | 'pro';

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('demo');
  const [currentPlan, setCurrentPlan] = useState<Plan>('demo');
  const [status, setStatus] = useState('trialing');
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      console.error('Error loading subscription:', error.message);
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
      setDaysRemaining(calculateDaysRemaining(newBilling.trial_ends_at));
      setLoading(false);
      return;
    }

    const plan = (data.plan || 'demo') as Plan;
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
      setDaysRemaining(0);
      setLoading(false);
      return;
    }

    setCurrentPlan(plan);
    setSelectedPlan(plan === 'demo' && billingStatus === 'expired' ? 'starter' : plan);
    setStatus(billingStatus);
    setTrialStartedAt(data.trial_started_at || null);
    setTrialEndsAt(data.trial_ends_at || null);
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
        alert('Your demo has ended. Please choose Starter or Pro to continue.');
        setSaving(false);
        return;
      }

      const nextStatus = selectedPlan === 'demo' ? 'trialing' : 'active';

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

      if (selectedPlan === 'starter' || selectedPlan === 'pro') {
        alert(
          'Plan saved for now. PayPal checkout will be connected when your PayPal access is ready.'
        );
      } else {
        alert('Subscription preference saved.');
      }

      await loadSubscription();
    } catch (error: any) {
      alert(error?.message || 'Error saving subscription.');
    } finally {
      setSaving(false);
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
  const hasPaidAccess =
    (currentPlan === 'starter' || currentPlan === 'pro') && status === 'active';

  const plans = [
    {
      id: 'demo' as Plan,
      name: 'Demo',
      price: '7 days',
      description: 'Try FromOne before PayPal billing is connected.',
      disabled: isDemoExpired,
      features: [
        '7-day trial access',
        'Business profile setup',
        'Website scan testing',
        'Manual details workflow',
      ],
    },
    {
      id: 'starter' as Plan,
      name: 'Starter',
      price: '£19',
      description: 'For small businesses and solo users.',
      disabled: false,
      features: [
        'Weekly content generation',
        'Website scan workflow',
        'Saved campaigns',
        'Posts due today alerts',
      ],
    },
    {
      id: 'pro' as Plan,
      name: 'Pro',
      price: '£49',
      description: 'For agencies and power users.',
      disabled: false,
      features: [
        'Multiple client campaigns',
        'Priority AI workflow',
        'Advanced campaign history',
        'PayPal billing ready',
      ],
    },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">FromOne Subscription</div>
        <h1 className="page-title">
          {isDemoExpired
            ? 'Your demo has ended.'
            : 'Demo trial and PayPal-ready plans.'}
        </h1>
        <p className="page-description">
          {isDemoExpired
            ? 'Choose Starter or Pro to continue using your dashboard, settings, and saved posts.'
            : 'New users get a 7-day demo. PayPal checkout will be connected once your PayPal account access is ready.'}
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
              <div className="page-eyebrow">Demo Ended</div>
              <h2 style={{ marginTop: 0 }}>Your 7-day demo has expired.</h2>
              <p>
                Dashboard, Posts, and Settings are now locked. Select Starter or Pro to
                continue. PayPal checkout is coming soon, so this currently saves the plan
                preference in Supabase.
              </p>
            </div>
          )}

          <div className="grid grid-two" style={{ marginBottom: '24px' }}>
            <section className="hero-card">
              <div className="page-eyebrow">Current Access</div>

              <h2 style={{ marginTop: 0, fontSize: '38px' }}>
                {isDemoActive
                  ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
                  : isDemoExpired
                    ? 'Demo expired'
                    : hasPaidAccess
                      ? `${currentPlan} active`
                      : `${currentPlan} plan`}
              </h2>

              <p>
                Status: <strong>{status}</strong>
              </p>

              <p>
                Trial started: <strong>{formatDate(trialStartedAt)}</strong>
              </p>

              <p>
                Trial ends: <strong>{formatDate(trialEndsAt)}</strong>
              </p>
            </section>

            <section className="premium-card">
              <div className="page-eyebrow">PayPal Coming Soon</div>
              <h2 style={{ marginTop: 0 }}>No payment is taken yet.</h2>
              <p>
                This page is ready for PayPal billing, but checkout is not connected
                while account access is pending.
              </p>
              <p>
                Starter and Pro will connect to PayPal monthly subscriptions when access
                is ready.
              </p>
            </section>
          </div>

          <div className="grid grid-three">
            {plans.map((plan) => (
              <section
                key={plan.id}
                className="premium-card"
                style={{
                  opacity: plan.disabled ? 0.55 : 1,
                  border:
                    selectedPlan === plan.id
                      ? '1px solid rgba(255, 212, 59, 0.65)'
                      : undefined,
                  transform: selectedPlan === plan.id ? 'translateY(-3px)' : undefined,
                }}
              >
                <div className="page-eyebrow">{plan.name}</div>

                <h2 style={{ marginTop: 0, fontSize: '40px' }}>
                  {plan.price}
                  {plan.id === 'starter' || plan.id === 'pro' ? (
                    <span style={{ color: 'var(--muted)', fontSize: '16px' }}>
                      {' '}
                      / month
                    </span>
                  ) : null}
                </h2>

                <p>{plan.description}</p>

                <div style={{ display: 'grid', gap: '10px', margin: '22px 0' }}>
                  {plan.features.map((feature) => (
                    <div key={feature} className="card" style={{ padding: '12px' }}>
                      ✓ {feature}
                    </div>
                  ))}
                </div>

                <button
                  className={selectedPlan === plan.id ? '' : 'secondary-button'}
                  disabled={plan.disabled}
                  onClick={() => {
                    if (!plan.disabled) {
                      setSelectedPlan(plan.id);
                    }
                  }}
                >
                  {plan.disabled
                    ? 'Demo Ended'
                    : selectedPlan === plan.id
                      ? 'Selected'
                      : 'Choose Plan'}
                </button>
              </section>
            ))}
          </div>

          <div className="premium-card" style={{ marginTop: '24px' }}>
            <div className="button-row">
              <button onClick={savePlan} disabled={saving}>
                {saving ? 'Saving...' : 'Save Subscription Preference'}
              </button>

              <button
                className="secondary-button"
                onClick={() => setSelectedPlan(currentPlan)}
              >
                Cancel Changes
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}