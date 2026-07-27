'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/app/components/ToastProvider';
import '../posts/posts-companion-shared.css';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';

type Plan = 'demo' | 'starter';
type PaymentProvider = 'revolut' | 'paypal' | 'manual' | null;

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
  const [subscriptionProvider, setSubscriptionProvider] = useState<PaymentProvider>(null);
  const [subscriptionReference, setSubscriptionReference] = useState<string | null>(null);
  const [cancelledAt, setCancelledAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const revolutStatus = params.get('revolut');
    const paypalStatus = params.get('paypal');

    if (revolutStatus === 'approved') {
      confirmApprovedRevolutCheckout();
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (paypalStatus === 'approved') {
      confirmApprovedPayPalCheckout();
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    loadSubscription();

    if (revolutStatus === 'cancelled') {
      notify(
        'No payment was taken. You can try again whenever you are ready.',
        'warning',
        'Revolut checkout cancelled',
      );
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

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

    const [
      { data: billingData, error: billingError },
      { data: accessData, error: accessError },
    ] = await Promise.all([
      supabase
        .from('user_billing')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_access')
        .select('subscription_provider, subscription_reference')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (billingError) {
      console.error('Error loading plan and billing:', billingError.message);
      setLoading(false);
      return;
    }

    if (accessError) {
      console.error('Error loading subscription provider:', accessError.message);
    }

    const providerValue = String(accessData?.subscription_provider || '').toLowerCase();
    const provider: PaymentProvider =
      providerValue === 'revolut'
        ? 'revolut'
        : providerValue === 'paypal'
          ? 'paypal'
          : providerValue
            ? 'manual'
            : null;

    setSubscriptionProvider(provider);
    setSubscriptionReference(accessData?.subscription_reference || null);

    if (!billingData) {
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

    const rawPlan = billingData.plan || 'demo';
    const plan: Plan = rawPlan === 'starter' || rawPlan === 'pro' ? 'starter' : 'demo';
    const billingStatus = billingData.status || 'trialing';
    const remaining = calculateDaysRemaining(billingData.trial_ends_at || null);

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
      setTrialStartedAt(billingData.trial_started_at || null);
      setTrialEndsAt(billingData.trial_ends_at || null);
      setPaypalSubscriptionId(billingData.paypal_subscription_id || null);
      setCancelledAt(billingData.cancelled_at || null);
      setDaysRemaining(0);
      setLoading(false);
      return;
    }

    setCurrentPlan(plan);
    setSelectedPlan(plan === 'demo' && billingStatus === 'expired' ? 'starter' : plan);
    setStatus(billingStatus);
    setTrialStartedAt(billingData.trial_started_at || null);
    setTrialEndsAt(billingData.trial_ends_at || null);
    setPaypalSubscriptionId(billingData.paypal_subscription_id || null);
    setCancelledAt(billingData.cancelled_at || null);
    setDaysRemaining(remaining);
    setLoading(false);
  };

  const confirmApprovedRevolutCheckout = async () => {
    setConfirmingPayment(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify(
          'Please sign in again, then return to Subscription.',
          'warning',
          'Sign in needed',
        );
        await loadSubscription();
        return;
      }

      const response = await fetch('/api/revolut/confirm-subscription', {
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
            'Revolut completed the checkout, but FromOne could not confirm the subscription yet.',
        );
      }

      if (result?.status === 'active') {
        notify('Starter access is active.', 'success', 'Revolut subscription confirmed');
      } else {
        notify(
          'Revolut received the checkout. Confirmation is still pending, so please refresh in a moment.',
          'info',
          'Revolut confirmation pending',
        );
      }

      await loadSubscription();
    } catch (error: any) {
      notify(
        error?.message || 'Revolut checkout returned, but confirmation failed.',
        'error',
        'Revolut confirmation failed',
      );
      await loadSubscription();
    } finally {
      setConfirmingPayment(false);
    }
  };

  const confirmApprovedPayPalCheckout = async () => {
    setConfirmingPayment(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify(
          'Please sign in again, then return to Subscription.',
          'warning',
          'Sign in needed',
        );
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
            'PayPal approved the checkout, but FromOne could not confirm the subscription yet.',
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
      setConfirmingPayment(false);
    }
  };

  const startRevolutCheckout = async () => {
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify(
          'Please sign in again, then return to Subscription and continue with Revolut.',
          'warning',
          'Sign in needed',
        );
        return;
      }

      const response = await fetch('/api/revolut/create-subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.checkout_url) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Could not start Revolut checkout. Please try again.',
        );
      }

      setCurrentPlan('starter');
      setSelectedPlan('starter');
      setStatus('pending_payment');
      setSubscriptionProvider('revolut');
      setSubscriptionReference(result.subscription_id || null);

      window.location.href = result.checkout_url;
    } catch (error: any) {
      notify(
        error?.message || 'Error starting Revolut checkout.',
        'error',
        'Revolut checkout failed',
      );
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async (planOverride?: Plan) => {
    const planToSave = planOverride ?? selectedPlan;

    if (planToSave === 'starter' && hasPaidAccess) {
      notify('Starter is already active on this account.', 'info', 'Starter active');
      return;
    }

    if (planToSave === 'starter' && isPendingPayment) {
      notify(
        'A checkout is already pending. Cancel it first if you need to start again.',
        'warning',
        'Payment pending',
      );
      return;
    }

    if (planToSave === 'starter') {
      setSelectedPlan('starter');
      await startRevolutCheckout();
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        notify('Please sign in again, then return to Billing.', 'warning', 'Sign in needed');
        setSaving(false);
        return;
      }

      if (status === 'expired') {
        notify('Your demo has ended. Choose Starter to continue.', 'warning', 'Demo ended');
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
      setTrialStartedAt(trialDates.trial_started_at);
      setTrialEndsAt(trialDates.trial_ends_at);

      notify('Demo access saved.', 'success', 'Demo saved');
      await loadSubscription();
    } catch (error: any) {
      notify(error?.message || 'Error saving demo access.', 'error', 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const cancelPendingPayment = async () => {
    if (!isPendingPayment) {
      notify('There is no pending checkout to cancel.', 'warning', 'No pending payment');
      return;
    }

    setConfirmDialog({
      type: 'cancelPendingPayment',
      title: 'Cancel pending checkout?',
      message:
        'This will stop the pending subscription and return your account to the demo plan. No future monthly payment will be taken from this pending checkout.',
      confirmLabel: 'Cancel pending payment',
      danger: true,
    });
  };

  const resetPendingPaymentLocally = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      throw new Error('Please sign in again, then return to Subscription.');
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

    const { error: accessError } = await supabase
      .from('user_access')
      .update({
        access_status: nextStatus === 'trialing' ? 'trial' : 'expired',
        subscription_status: 'none',
        subscription_provider: null,
        subscription_reference: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (accessError) {
      throw accessError;
    }

    setCurrentPlan('demo');
    setStatus(nextStatus);
    setPaypalSubscriptionId(null);
    setSubscriptionProvider(null);
    setSubscriptionReference(null);
  };

  const callCancellationRoute = async ({
    route,
    body,
  }: {
    route: string;
    body?: Record<string, unknown>;
  }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Please sign in again, then return to Subscription.');
    }

    const response = await fetch(route, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          'Subscription cancellation failed. Please try again or contact support.',
      );
    }

    return result;
  };

  const confirmCancelPendingPayment = async () => {
    if (!isPendingPayment) {
      notify('There is no pending checkout to cancel.', 'warning', 'No pending payment');
      closeConfirmDialog();
      return;
    }

    setCancelling(true);

    try {
      if (effectiveProvider === 'revolut' && subscriptionReference) {
        await callCancellationRoute({
          route: '/api/revolut/cancel-subscription',
        });
      } else {
        await resetPendingPaymentLocally();
      }

      closeConfirmDialog();
      notify('Pending checkout cancelled.', 'success', 'Pending payment cancelled');
      await loadSubscription();
    } catch (error: any) {
      notify(error?.message || 'Error cancelling pending payment.', 'error', 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  const cancelSubscription = async () => {
    if (!canCancel) {
      notify('There is no active subscription to cancel.', 'warning', 'No active subscription');
      return;
    }

    setConfirmDialog({
      type: 'cancelSubscription',
      title: 'Cancel Starter subscription?',
      message:
        'This will stop future renewals. Your access status will be updated after the payment provider confirms the cancellation.',
      confirmLabel: 'Cancel subscription',
      danger: true,
    });
  };

  const confirmCancelSubscription = async () => {
    if (!canCancel) {
      notify('There is no active subscription to cancel.', 'warning', 'No active subscription');
      closeConfirmDialog();
      return;
    }

    setCancelling(true);
    closeConfirmDialog();

    const providerName = effectiveProvider === 'paypal' ? 'PayPal' : 'Revolut';
    notify(`Cancelling your ${providerName} subscription now...`, 'info', 'Cancelling subscription');

    try {
      if (effectiveProvider === 'paypal') {
        if (!paypalSubscriptionId) {
          throw new Error('No PayPal subscription reference was found on this account.');
        }

        await callCancellationRoute({
          route: '/api/paypal/cancel-subscription',
          body: {
            paypalSubscriptionId,
            paypal_subscription_id: paypalSubscriptionId,
          },
        });
      } else if (effectiveProvider === 'revolut') {
        await callCancellationRoute({
          route: '/api/revolut/cancel-subscription',
        });
      } else {
        throw new Error('No supported payment provider was found for this subscription.');
      }

      setCurrentPlan('starter');
      setStatus('cancelled');
      setCancelledAt(new Date().toISOString());

      notify('Future renewals have been stopped.', 'success', 'Subscription cancelled');
      await loadSubscription();
    } catch (error: any) {
      notify(
        error?.message || 'Error cancelling subscription.',
        'error',
        'Cancellation failed',
      );
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

  const hasRealPayPalSubscription = paypalSubscriptionId?.startsWith('I-') === true;
  const hasRevolutSubscription =
    subscriptionProvider === 'revolut' && Boolean(subscriptionReference);

  const effectiveProvider: PaymentProvider = hasRealPayPalSubscription
    ? 'paypal'
    : hasRevolutSubscription
      ? 'revolut'
      : subscriptionProvider;

  const canCancel =
    currentPlan === 'starter' &&
    status === 'active' &&
    ((effectiveProvider === 'paypal' && hasRealPayPalSubscription) ||
      (effectiveProvider === 'revolut' && Boolean(subscriptionReference)));

  const providerName =
    effectiveProvider === 'paypal'
      ? 'PayPal'
      : effectiveProvider === 'revolut'
        ? 'Revolut'
        : hasPaidAccess
          ? 'Manual access'
          : 'Not connected';

  const nextPaymentLabel = hasPaidAccess
    ? effectiveProvider === 'paypal'
      ? 'Managed in PayPal'
      : effectiveProvider === 'revolut'
        ? 'Managed by Revolut'
        : 'Managed manually'
    : isPendingPayment
      ? effectiveProvider === 'paypal'
        ? 'Available after PayPal confirms your subscription'
        : 'Available after Revolut confirms your subscription'
      : 'No active Starter payment';

  const paymentStatusLabel = isPendingPayment
    ? 'Pending checkout'
    : hasPaidAccess
      ? effectiveProvider === 'paypal' || effectiveProvider === 'revolut'
        ? 'Active recurring subscription'
        : 'Manual access'
      : isCancelled
        ? 'Cancelled'
        : 'No active subscription';

  const paymentReference = effectiveProvider === 'paypal'
    ? paypalSubscriptionId
    : subscriptionReference;

  const paymentReferenceLabel = paymentReference
    ? effectiveProvider === 'manual'
      ? 'Manual access'
      : `${paymentReference.slice(0, 12)}...`
    : 'Not connected yet';

  const demoFeatures = [
    '7-day access to try the workflow',
    'Upload photos, videos and flyers',
    'Create social posts from uploaded media',
    'Preview Smilez offer and event setup',
    'Review and edit before anything is sent',
  ];

  const monthlyFeatures = [
    'Create posts from photos, videos and flyers',
    'Send approved posts to Facebook and Instagram',
    'Create live Smilez offers and events from uploads',
    'Business listing and Smilez approvals',
    'Review everything before publishing or sending',
  ];

  const plans = [
    {
      id: 'demo' as Plan,
      name: 'Demo',
      price: 'Free',
      priceNote: 'for 7 days',
      valueNote: 'Try FromOne with your own uploads.',
      description: 'Best for testing uploads, review screens, social posts and Smilez offer/event setup before subscribing.',
      buttonText: 'Use demo',
      disabled: isDemoExpired,
      features: demoFeatures,
    },
    {
      id: 'starter' as Plan,
      name: 'Starter',
      price: '£49.99',
      priceNote: '/ month',
      valueNote: 'Full posting, Smilez and publishing access.',
      description: 'For businesses that want FromOne to turn uploads into social posts, live Smilez listings, and Facebook or Instagram posts.',
      buttonText: isCancelled ? 'Restart Starter' : 'Continue with Revolut',
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
      <main id="fromone-standard-shell" className="fromone-posts-page fromone-subscription-page subscription-simple-page">
        <header className="posts-create-hero subscription-simple-header">
          <span className="posts-create-eyebrow page-eyebrow">Subscription</span>
          <h1>{isDemoExpired ? 'Demo ended.' : 'Plans for posting.'}</h1>
          <p>
            Choose the plan for uploads, social posts, Smilez offers and events, and Facebook and Instagram publishing.
          </p>
        </header>

        {confirmingPayment && (
          <section className="subscription-simple-notice">
            <strong>Checking payment...</strong>
            <span>FromOne is confirming your subscription with the payment provider and updating your access.</span>
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
                    ? 'Choose Starter to keep creating posts, Smilez offers and events from your uploads.'
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

            <section className="subscription-simple-card subscription-smiles-focus-card">
              <div>
                <span>What Starter unlocks</span>
                <h2>One workflow for posts and Smilez.</h2>
                <p>
                  Upload an image, video or flyer. FromOne prepares the social post and, when relevant, the Smilez offer or event. You review everything before it is published or sent for approval.
                </p>
              </div>

              <div className="subscription-smiles-focus-grid">
                <strong>Image to posts</strong>
                <strong>Smilez offers</strong>
                <strong>Smilez events</strong>
                <strong>Facebook and Instagram</strong>
              </div>
            </section>

            <section className="subscription-plan-grid">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isCurrent = currentPlan === plan.id && !isPendingPayment && !isCancelled;

                return (
                  <article
                    key={plan.id}
                    className={`subscription-simple-card subscription-plan-option ${
                      isSelected ? 'is-selected' : ''
                    } ${plan.disabled ? 'is-disabled' : ''}`}
                  >
                    <div className="subscription-plan-head">
                      <span>{plan.name}</span>
                      {isCurrent && <em>Current</em>}
                      {isSelected && !isCurrent && <em>Selected</em>}
                    </div>

                    <div className="subscription-plan-price">
                      <strong>{plan.price}</strong>
                      <span>{plan.priceNote}</span>
                    </div>

                    <p>{plan.valueNote}</p>
                    <p>{plan.description}</p>

                    <ul>
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={isSelected ? undefined : 'secondary-button'}
                      disabled={
                        plan.disabled ||
                        saving ||
                        cancelling ||
                        (plan.id === 'starter' && (hasPaidAccess || isPendingPayment))
                      }
                      onClick={async () => {
                        if (plan.disabled || saving || cancelling) return;

                        if (plan.id === 'starter' && isSelected) {
                          await savePlan(plan.id);
                          return;
                        }

                        setSelectedPlan(plan.id);
                      }}
                    >
                      {plan.disabled
                        ? 'Demo ended'
                        : isSelected
                          ? plan.buttonText
                          : `Choose ${plan.name}`}
                    </button>
                  </article>
                );
              })}
            </section>

            <section className="subscription-simple-card subscription-billing-card">
              <div className="subscription-billing-title">
                <div>
                  <span>Starter access</span>
                  <h2>Starter includes</h2>
                </div>

                <strong>{hasPaidAccess ? 'Active' : '£49.99/month'}</strong>
              </div>

              <p>
                Starter includes upload-to-post creation, Smilez offer and event workflows, and Facebook and Instagram publishing. Revolut handles new monthly subscriptions.
              </p>

              <div className="subscription-billing-grid">
                <div>
                  <span>Status</span>
                  <strong>{paymentStatusLabel}</strong>
                </div>

                <div>
                  <span>Next payment</span>
                  <strong>{nextPaymentLabel}</strong>
                </div>

                <div>
                  <span>Payment provider</span>
                  <strong>{providerName}{paymentReference ? ` · ${paymentReferenceLabel}` : ''}</strong>
                </div>
              </div>

              {isPendingPayment && (
                <p className="subscription-simple-warning">
                  Your checkout has started but the subscription has not been confirmed yet.
                </p>
              )}

              {hasPaidAccess && (
                <p className="subscription-simple-success">
                  {effectiveProvider === 'paypal'
                    ? 'Your legacy PayPal Starter subscription is active. Posting, Smilez workflows and publishing features are available.'
                    : effectiveProvider === 'revolut'
                      ? 'Your Revolut Starter subscription is active. Posting, Smilez workflows and publishing features are available.'
                      : 'Starter access is active. Post creation, Smilez workflows and publishing features are available.'}
                </p>
              )}

              {!hasPaidAccess && !isPendingPayment && (
                <p className="subscription-simple-muted">
                  {isCancelled
                    ? 'Restart Starter above or continue below to open Revolut and begin a new £49.99 monthly subscription.'
                    : 'Choose Starter above, then continue to Revolut to unlock posts, Smilez workflows and publishing.'}
                </p>
              )}

              <div className="subscription-action-row">
                <button onClick={() => savePlan()} disabled={saving || cancelling || (selectedPlan === 'starter' && (hasPaidAccess || isPendingPayment))}>
                  {saving
                    ? selectedPlan === 'starter'
                      ? 'Opening Revolut...'
                      : 'Saving...'
                    : selectedPlan === 'starter'
                      ? hasPaidAccess
                        ? 'Starter active'
                        : isPendingPayment
                          ? 'Payment pending'
                          : isCancelled
                            ? 'Restart with Revolut'
                            : 'Continue with Revolut'
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

      {confirmDialog && (() => {
        const activeConfirmDialog = confirmDialog!;

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-confirm-title"
            className="subscription-dialog-backdrop"
          >
            <div className="subscription-dialog-card">
              <div className="page-eyebrow">
                {activeConfirmDialog.danger ? 'Please confirm' : 'Confirm action'}
              </div>

              <h2 id="subscription-confirm-title">{activeConfirmDialog.title}</h2>

              <p>{activeConfirmDialog.message}</p>

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
                  className={activeConfirmDialog.danger ? 'secondary-button danger-button' : undefined}
                  onClick={() => {
                    if (activeConfirmDialog.type === 'cancelPendingPayment') {
                      confirmCancelPendingPayment();
                      return;
                    }

                    if (activeConfirmDialog.type === 'cancelSubscription') {
                      confirmCancelSubscription();
                    }
                  }}
                  disabled={cancelling || saving}
                >
                  {cancelling ? 'Cancelling...' : activeConfirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx global>{`
        /* -------------------------------------------------------------- */
        /* FROMONE SUBSCRIPTION — CLEAN APPROVED STANDARD                  */
        /* Desktop: main-content 38px + shell margin-top 28px              */
        /* Mobile: Posts/Help width + gap                                  */
        /* -------------------------------------------------------------- */
        body:has(.fromone-subscription-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-subscription-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-subscription-page) .app-shell,
        body:has(.fromone-subscription-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-subscription-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          min-height: 620px !important;
          margin: 28px auto 64px !important;
          padding: clamp(30px, 4vw, 48px) !important;
          display: grid !important;
          gap: 18px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
          color: #071b49 !important;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          backdrop-filter: none !important;
        }

        .fromone-subscription-page .subscription-simple-header {
          width: 100% !important;
          max-width: 760px !important;
          margin: 0 0 8px !important;
          padding: 0 !important;
          text-align: left !important;
        }

        .fromone-subscription-page .page-eyebrow {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-subscription-page .subscription-simple-header h1 {
          max-width: 760px !important;
          margin: 12px 0 14px !important;
          color: #071b49 !important;
          font-size: clamp(3rem, 5.2vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
          font-weight: 800 !important;
          text-align: left !important;
          overflow: visible !important;
        }

        .fromone-subscription-page .subscription-simple-header p,
        .fromone-subscription-page .subscription-plan-option p,
        .fromone-subscription-page .subscription-billing-card > p {
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
        }

        .fromone-subscription-page .subscription-simple-card,
        .fromone-subscription-page .subscription-current-strip,
        .fromone-subscription-page .subscription-simple-alert,
        .fromone-subscription-page .subscription-simple-notice {
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: none !important;
          box-sizing: border-box !important;
        }

        .fromone-subscription-page .subscription-current-strip {
          width: 100% !important;
          margin: 0 !important;
          padding: 18px !important;
          display: grid !important;
          gap: 14px !important;
          text-align: left !important;
          justify-items: start !important;
          background: #fff8fc !important;
          border-color: #ffd2e5 !important;
        }

        .fromone-subscription-page .subscription-current-strip span,
        .fromone-subscription-page .subscription-plan-head span,
        .fromone-subscription-page .subscription-billing-title span,
        .fromone-subscription-page .subscription-billing-grid span {
          color: #f72585 !important;
          font-size: 0.72rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-subscription-page .subscription-current-strip strong {
          display: block !important;
          margin-top: 7px !important;
          color: #071b49 !important;
          font-size: clamp(1.6rem, 3.4vw, 2.15rem) !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: -0.045em !important;
        }

        .fromone-subscription-page .subscription-current-meta {
          display: flex !important;
          flex-wrap: wrap !important;
          justify-content: flex-start !important;
          gap: 8px !important;
        }

        .fromone-subscription-page .subscription-current-meta span {
          min-height: 32px !important;
          display: inline-flex !important;
          align-items: center !important;
          padding: 0 12px !important;
          border: 1px solid #dfe7f2 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #52617a !important;
          font-size: 0.82rem !important;
          font-weight: 700 !important;
          letter-spacing: 0 !important;
          text-transform: none !important;
        }

        .fromone-subscription-page .subscription-plan-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 16px !important;
        }

        .fromone-subscription-page .subscription-plan-option {
          min-height: 0 !important;
          padding: 20px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 14px !important;
          background: #ffffff !important;
          border-color: #dfe7f2 !important;
        }

        .fromone-subscription-page .subscription-plan-option.is-selected {
          border-color: #f72585 !important;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.08) !important;
          transform: none !important;
        }

        .fromone-subscription-page .subscription-plan-option.is-disabled {
          opacity: 0.58 !important;
        }

        .fromone-subscription-page .subscription-plan-head {
          display: flex !important;
          justify-content: space-between !important;
          gap: 12px !important;
          align-items: center !important;
        }

        .fromone-subscription-page .subscription-plan-head em {
          min-height: 28px !important;
          display: inline-flex !important;
          align-items: center !important;
          padding: 0 10px !important;
          border-radius: 999px !important;
          color: #ffffff !important;
          background: #f72585 !important;
          font-size: 0.75rem !important;
          font-style: normal !important;
          font-weight: 800 !important;
        }

        .fromone-subscription-page .subscription-plan-price {
          display: grid !important;
          gap: 5px !important;
        }

        .fromone-subscription-page .subscription-plan-price strong {
          display: block !important;
          color: #071b49 !important;
          font-size: clamp(2.1rem, 4vw, 3rem) !important;
          line-height: 0.9 !important;
          font-weight: 800 !important;
          letter-spacing: -0.075em !important;
        }

        .fromone-subscription-page .subscription-plan-price span {
          display: block !important;
          color: #52617a !important;
          font-size: 1rem !important;
          line-height: 1.1 !important;
          font-weight: 600 !important;
        }

        .fromone-subscription-page .subscription-plan-option ul {
          display: grid !important;
          gap: 9px !important;
          margin: 0 !important;
          padding: 0 !important;
          list-style: none !important;
        }

        .fromone-subscription-page .subscription-plan-option li {
          position: relative !important;
          padding-left: 22px !important;
          color: #52617a !important;
          line-height: 1.45 !important;
          font-weight: 600 !important;
        }

        .fromone-subscription-page .subscription-plan-option li::before {
          content: "✓" !important;
          position: absolute !important;
          left: 0 !important;
          color: #f72585 !important;
          font-weight: 800 !important;
        }

        .fromone-subscription-page .subscription-plan-option button {
          width: 100% !important;
          margin-top: auto !important;
        }

        .fromone-subscription-page .subscription-billing-card {
          padding: clamp(18px, 3vw, 26px) !important;
          display: grid !important;
          gap: 14px !important;
          background: #ffffff !important;
          border-color: #dfe7f2 !important;
        }

        .fromone-subscription-page .subscription-billing-title {
          display: flex !important;
          justify-content: space-between !important;
          gap: 16px !important;
          align-items: start !important;
        }

        .fromone-subscription-page .subscription-billing-title h2 {
          margin: 7px 0 0 !important;
          color: #071b49 !important;
          font-size: clamp(1.55rem, 3vw, 2.05rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.055em !important;
          font-weight: 800 !important;
        }

        .fromone-subscription-page .subscription-billing-title > strong {
          color: #f72585 !important;
          font-size: clamp(1.25rem, 2.8vw, 1.7rem) !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          letter-spacing: -0.045em !important;
          font-weight: 800 !important;
        }

        .fromone-subscription-page .subscription-billing-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .fromone-subscription-page .subscription-billing-grid div {
          padding: 14px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 18px !important;
          background: #fff8fc !important;
        }

        .fromone-subscription-page .subscription-billing-grid strong {
          display: block !important;
          margin-top: 7px !important;
          color: #071b49 !important;
          font-size: 0.95rem !important;
          line-height: 1.25 !important;
          font-weight: 700 !important;
        }

        .fromone-subscription-page .subscription-simple-success,
        .fromone-subscription-page .subscription-simple-warning,
        .fromone-subscription-page .subscription-simple-muted {
          padding: 13px 14px !important;
          border-radius: 18px !important;
          line-height: 1.45 !important;
          font-weight: 600 !important;
        }

        .fromone-subscription-page .subscription-simple-success {
          color: #071b49 !important;
          background: #f1fff8 !important;
          border: 1px solid rgba(61, 220, 151, 0.28) !important;
        }

        .fromone-subscription-page .subscription-simple-warning,
        .fromone-subscription-page .subscription-simple-alert {
          color: #9f1239 !important;
          background: #fff1f2 !important;
          border-color: #fecdd3 !important;
        }

        .fromone-subscription-page .subscription-simple-alert,
        .fromone-subscription-page .subscription-simple-notice {
          padding: 16px 18px !important;
          display: grid !important;
          gap: 4px !important;
          text-align: center !important;
        }

        .fromone-subscription-page .subscription-simple-alert strong,
        .fromone-subscription-page .subscription-simple-notice strong {
          color: #071b49 !important;
          font-size: 1.08rem !important;
          font-weight: 800 !important;
        }

        .fromone-subscription-page .subscription-simple-alert span,
        .fromone-subscription-page .subscription-simple-notice span {
          color: #52617a !important;
          font-weight: 500 !important;
        }

        .fromone-subscription-page .subscription-simple-muted {
          color: #52617a !important;
          background: #f5f7fb !important;
          border: 1px solid #dfe7f2 !important;
        }

        .fromone-subscription-page .subscription-action-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
        }

        .fromone-subscription-page .subscription-action-row button,
        .fromone-subscription-page .subscription-plan-option button {
          min-height: 54px !important;
          padding: 0 22px !important;
          border-radius: 999px !important;
          font: inherit !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease !important;
        }

        .fromone-subscription-page .subscription-action-row button:not(.secondary-button),
        .fromone-subscription-page .subscription-plan-option button:not(.secondary-button) {
          border: 1px solid #f72585 !important;
          background: #f72585 !important;
          color: #ffffff !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.22) !important;
        }

        .fromone-subscription-page .subscription-action-row .secondary-button,
        .fromone-subscription-page .subscription-plan-option .secondary-button {
          border: 1px solid #ffd2e5 !important;
          background: #ffffff !important;
          color: #071b49 !important;
        }

        .fromone-subscription-page .danger-button {
          color: #9f1239 !important;
          border-color: #fecdd3 !important;
          background: #fff1f2 !important;
          box-shadow: none !important;
        }

        .subscription-dialog-backdrop {
          position: fixed !important;
          inset: 0 !important;
          z-index: 10000 !important;
          display: grid !important;
          place-items: center !important;
          padding: 18px !important;
          background: rgba(7, 27, 73, 0.42) !important;
          backdrop-filter: blur(10px) !important;
        }

        .subscription-dialog-card {
          width: min(520px, 100%) !important;
          padding: 26px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 28px 80px rgba(7, 27, 73, 0.22) !important;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            sans-serif !important;
        }

        .subscription-dialog-card h2 {
          margin: 6px 0 10px !important;
          color: #071b49 !important;
          font-size: clamp(1.55rem, 3vw, 2rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
          font-weight: 800 !important;
        }

        .subscription-dialog-card p {
          margin: 0 0 20px !important;
          color: #52617a !important;
          line-height: 1.55 !important;
          font-weight: 500 !important;
        }

        .subscription-dialog-actions {
          justify-content: flex-end !important;
        }

        @media (max-width: 820px) {
          body:has(.fromone-subscription-page) .main-content {
            padding-top: 0 !important;
          }

          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: calc(100% - 32px) !important;
            max-width: 500px !important;
            min-height: auto !important;
            margin: 24px auto 112px !important;
            padding: 28px 26px 26px !important;
            border-radius: 26px !important;
            gap: 16px !important;
          }

          .fromone-subscription-page .subscription-simple-header {
            margin-bottom: 18px !important;
          }

          .fromone-subscription-page .subscription-simple-header h1 {
            margin: 14px 0 18px !important;
            font-size: clamp(2.75rem, 11vw, 3.6rem) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.058em !important;
          }

          .fromone-subscription-page .subscription-simple-header p {
            font-size: 1rem !important;
            line-height: 1.45 !important;
          }

          .fromone-subscription-page .subscription-plan-grid,
          .fromone-subscription-page .subscription-billing-grid {
            grid-template-columns: 1fr !important;
          }

          .fromone-subscription-page .subscription-billing-title {
            display: grid !important;
          }

          .fromone-subscription-page .subscription-action-row {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .fromone-subscription-page .subscription-action-row button {
            width: 100% !important;
          }
        }

        @media (max-width: 420px) {
          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: calc(100% - 18px) !important;
            padding: 26px 22px 24px !important;
          }
        }

        /* -------------------------------------------------------------- */
        /* SUBSCRIPTION MOBILE WIDTH TWEAK — desktop unchanged             */
        /* -------------------------------------------------------------- */
        @media (max-width: 820px) {
          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: calc(100% - 48px) !important;
            max-width: 500px !important;
            margin: 24px auto 112px !important;
          }
        }

        @media (max-width: 420px) {
          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: calc(100% - 34px) !important;
          }
        }


        /* -------------------------------------------------------------- */
        /* SUBSCRIPTION MOBILE WIDTH FINAL — match Posts card width        */
        /* Desktop unchanged                                              */
        /* -------------------------------------------------------------- */
        @media (max-width: 820px) {
          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: calc(100% - 72px) !important;
            max-width: 468px !important;
            margin: 24px auto 112px !important;
          }
        }

        @media (max-width: 420px) {
          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: calc(100% - 48px) !important;
            max-width: 468px !important;
          }
        }


        .fromone-subscription-page .subscription-smiles-focus-card {
          padding: clamp(18px, 3vw, 26px) !important;
          display: grid !important;
          gap: 16px !important;
          background: #fff8fc !important;
          border-color: #ffd2e5 !important;
        }

        .fromone-subscription-page .subscription-smiles-focus-card span {
          color: #f72585 !important;
          font-size: 0.72rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-subscription-page .subscription-smiles-focus-card h2 {
          margin: 8px 0 8px !important;
          color: #071b49 !important;
          font-size: clamp(1.65rem, 3vw, 2.15rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.055em !important;
          font-weight: 800 !important;
        }

        .fromone-subscription-page .subscription-smiles-focus-card p {
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
        }

        .fromone-subscription-page .subscription-smiles-focus-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .fromone-subscription-page .subscription-smiles-focus-grid strong {
          min-height: 44px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 10px 12px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          font-size: 0.86rem !important;
          line-height: 1.15 !important;
          font-weight: 800 !important;
          text-align: center !important;
        }

        @media (max-width: 820px) {
          .fromone-subscription-page .subscription-smiles-focus-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .fromone-subscription-page .subscription-smiles-focus-card {
            padding: 20px !important;
          }
        }


        /* FINAL SHARED MOBILE WIDTH — matches Settings and Smilez */
        @media (max-width: 820px) {
          body:has(.fromone-subscription-page) .main-content {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 24px 0 112px !important;
            box-sizing: border-box !important;
          }
        }


        /*
         * OUTER MOBILE LAYOUT IS OWNED BY AppShell.
         * Billing keeps its internal card styling only.
         */
        @media (max-width: 900px) {
          body:has(.fromone-subscription-page) .main-content {
            padding-top: 0 !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 0 112px !important;
            box-sizing: border-box !important;
          }
        }


        /* FINAL SHARED FROMONE PAGE SYSTEM */
        body:has(.fromone-subscription-page) {
          background: var(--posts-bg) !important;
        }

        body:has(.fromone-subscription-page) .app-shell,
        body:has(.fromone-subscription-page) .main-content {
          background: var(--posts-bg) !important;
        }

        body:has(.fromone-subscription-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          overflow-x: hidden !important;
        }

        #fromone-standard-shell.fromone-subscription-page.subscription-simple-page {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          display: grid !important;
          gap: 22px !important;
          overflow: visible !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .fromone-subscription-page .subscription-simple-header {
          width: 100% !important;
          max-width: 790px !important;
          margin: 0 0 6px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .fromone-subscription-page .subscription-simple-header h1 {
          max-width: 760px !important;
          margin: 0 0 12px !important;
          color: var(--posts-navy) !important;
          font-size: clamp(2.6rem, 5vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.06em !important;
          font-weight: 800 !important;
        }

        .fromone-subscription-page .subscription-simple-header p {
          max-width: 720px !important;
          margin: 0 !important;
          color: var(--posts-muted) !important;
          font-size: 1.03rem !important;
          line-height: 1.56 !important;
          font-weight: 500 !important;
        }

        .fromone-subscription-page .page-eyebrow {
          display: block !important;
          margin: 0 0 10px !important;
          color: var(--posts-pink) !important;
          font-size: 0.74rem !important;
          font-weight: 900 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
        }

        .fromone-subscription-page .subscription-current-strip,
        .fromone-subscription-page .subscription-simple-card,
        .fromone-subscription-page .subscription-simple-alert,
        .fromone-subscription-page .subscription-simple-notice {
          border: 1px solid var(--posts-border) !important;
          border-radius: 26px !important;
          background: rgba(255, 255, 255, 0.84) !important;
          box-shadow: var(--posts-shadow) !important;
          backdrop-filter: blur(10px) !important;
        }

        .fromone-subscription-page .subscription-current-strip {
          padding: 20px !important;
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: var(--posts-border) !important;
        }

        .fromone-subscription-page .subscription-smiles-focus-card,
        .fromone-subscription-page .subscription-billing-card {
          padding: 22px !important;
          background: rgba(255, 255, 255, 0.84) !important;
          border-color: var(--posts-border) !important;
        }

        .fromone-subscription-page .subscription-plan-grid {
          gap: 16px !important;
        }

        .fromone-subscription-page .subscription-plan-option {
          padding: 22px !important;
          border: 1px solid var(--posts-border) !important;
          border-radius: 22px !important;
          background: #fff !important;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055) !important;
        }

        .fromone-subscription-page .subscription-plan-option.is-selected {
          border-color: rgba(247, 37, 133, 0.28) !important;
          box-shadow: 0 0 0 3px rgba(247, 37, 133, 0.08), 0 14px 34px rgba(7, 27, 73, 0.07) !important;
        }

        .fromone-subscription-page .subscription-action-row button,
        .fromone-subscription-page .subscription-plan-option button {
          min-height: 46px !important;
          padding: 0 17px !important;
          border-radius: 15px !important;
          font-size: 0.86rem !important;
          font-weight: 900 !important;
        }

        .fromone-subscription-page .subscription-action-row button:not(.secondary-button),
        .fromone-subscription-page .subscription-plan-option button:not(.secondary-button) {
          border: 0 !important;
          background: var(--posts-pink) !important;
          color: #fff !important;
          box-shadow: 0 10px 24px rgba(247, 37, 133, 0.21) !important;
        }

        .fromone-subscription-page .subscription-action-row .secondary-button,
        .fromone-subscription-page .subscription-plan-option .secondary-button {
          border: 1px solid var(--posts-border) !important;
          background: #fff !important;
          color: var(--posts-navy) !important;
          box-shadow: none !important;
        }

        .fromone-subscription-page .subscription-billing-grid div,
        .fromone-subscription-page .subscription-smiles-focus-grid strong {
          border: 1px solid var(--posts-border) !important;
          background: #f8fafc !important;
        }

        @media (max-width: 700px) {
          body:has(.fromone-subscription-page) .main-content {
            padding: 24px 16px 100px !important;
          }

          .fromone-subscription-page .subscription-simple-header h1 {
            font-size: clamp(2.25rem, 11vw, 3rem) !important;
          }

          .fromone-subscription-page .subscription-simple-header p {
            font-size: 0.95rem !important;
          }

          .fromone-subscription-page .subscription-plan-grid,
          .fromone-subscription-page .subscription-billing-grid,
          .fromone-subscription-page .subscription-smiles-focus-grid {
            grid-template-columns: 1fr !important;
          }

          .fromone-subscription-page .subscription-current-strip,
          .fromone-subscription-page .subscription-simple-card,
          .fromone-subscription-page .subscription-simple-alert,
          .fromone-subscription-page .subscription-simple-notice {
            border-radius: 21px !important;
          }
        }

      `}</style>
    </>
  );
}