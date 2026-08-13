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
      <main className="fromone-posts-page fromone-subscription-page subscriptionLitePage">
        <section id="fromone-standard-shell" className="subscriptionLiteShell">
          <header className="subscriptionLiteHero">
            <span>Plan</span>
            <h1>Your plan.</h1>
            <p>See your access or manage Starter.</p>
          </header>

          {confirmingPayment ? (
            <section className="subscriptionLiteNotice">
              <strong>Checking payment…</strong>
              <span>Confirming your subscription.</span>
            </section>
          ) : null}

          {loading ? (
            <section className="subscriptionLiteStatus">
              <strong>Loading your plan…</strong>
            </section>
          ) : (
            <>
              <section className="subscriptionLiteStatus">
                <div>
                  <span>Current access</span>
                  <strong>{getAccessTitle()}</strong>
                  {isDemoActive ? (
                    <small>Your free demo ends {formatDate(trialEndsAt)}.</small>
                  ) : null}
                  {hasPaidAccess ? (
                    <small>Starter is active.</small>
                  ) : null}
                  {isPendingPayment ? (
                    <small>Your checkout is waiting for confirmation.</small>
                  ) : null}
                  {isCancelled ? (
                    <small>Your subscription will not renew.</small>
                  ) : null}
                </div>

                <span
                  className={`subscriptionLiteBadge ${
                    hasPaidAccess
                      ? 'isActive'
                      : isPendingPayment
                        ? 'isPending'
                        : isDemoExpired || isCancelled
                          ? 'isWarning'
                          : ''
                  }`}
                >
                  {hasPaidAccess
                    ? 'Active'
                    : isPendingPayment
                      ? 'Pending'
                      : isDemoExpired
                        ? 'Expired'
                        : isCancelled
                          ? 'Cancelled'
                          : 'Demo'}
                </span>
              </section>

              {!hasPaidAccess ? (
                <section className="subscriptionLiteStarter">
                  <div className="subscriptionLiteStarterHead">
                    <div>
                      <span>Starter</span>
                      <h2>Everything you need to publish.</h2>
                    </div>
                    <div className="subscriptionLitePrice">
                      <strong>£49.99</strong>
                      <span>/ month</span>
                    </div>
                  </div>

                  <div className="subscriptionLiteFeatures">
                    <span>AI & manual post creation</span>
                    <span>Facebook & Instagram publishing</span>
                    <span>Smilez offers & events</span>
                    <span>Business listing management</span>
                  </div>

                  {isPendingPayment ? (
                    <div className="subscriptionLiteActions">
                      <button type="button" className="primary" disabled>
                        Payment pending
                      </button>
                      <button
                        type="button"
                        className="secondary danger"
                        onClick={cancelPendingPayment}
                        disabled={saving || cancelling}
                      >
                        {cancelling ? 'Cancelling…' : 'Cancel pending payment'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="subscriptionLiteMainButton"
                      onClick={() => savePlan('starter')}
                      disabled={saving || cancelling}
                    >
                      {saving
                        ? 'Opening Revolut…'
                        : isCancelled
                          ? 'Restart Starter'
                          : 'Start Starter'}
                    </button>
                  )}
                </section>
              ) : (
                <section className="subscriptionLiteStarter isActivePlan">
                  <div className="subscriptionLiteStarterHead">
                    <div>
                      <span>Starter</span>
                      <h2>Your subscription is active.</h2>
                    </div>
                    <div className="subscriptionLitePrice">
                      <strong>£49.99</strong>
                      <span>/ month</span>
                    </div>
                  </div>

                  <p className="subscriptionLiteActiveCopy">
                    Posting, Smilez and publishing features are available.
                  </p>

                  {canCancel ? (
                    <button
                      type="button"
                      className="subscriptionLiteCancel"
                      onClick={cancelSubscription}
                      disabled={saving || cancelling}
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                    </button>
                  ) : null}
                </section>
              )}

              <details className="subscriptionLiteDetails">
                <summary>Billing details</summary>
                <div className="subscriptionLiteDetailRows">
                  <div>
                    <span>Plan</span>
                    <strong>{currentPlan === 'starter' ? 'Starter' : 'Demo'}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{paymentStatusLabel}</strong>
                  </div>
                  {currentPlan === 'demo' ? (
                    <div>
                      <span>Demo ends</span>
                      <strong>{formatDate(trialEndsAt)}</strong>
                    </div>
                  ) : null}
                  {currentPlan === 'starter' ? (
                    <>
                      <div>
                        <span>Provider</span>
                        <strong>{providerName}</strong>
                      </div>
                      <div>
                        <span>Next payment</span>
                        <strong>{nextPaymentLabel}</strong>
                      </div>
                      {paymentReference ? (
                        <div>
                          <span>Reference</span>
                          <strong>{paymentReferenceLabel}</strong>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </details>
            </>
          )}
        </section>
      </main>

      {confirmDialog &&
        (() => {
          const activeConfirmDialog = confirmDialog!;

          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="subscription-confirm-title"
              className="subscriptionLiteBackdrop"
            >
              <section className="subscriptionLiteDialog">
                <span>Please confirm</span>
                <h2 id="subscription-confirm-title">{activeConfirmDialog.title}</h2>
                <p>{activeConfirmDialog.message}</p>

                <div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={closeConfirmDialog}
                    disabled={cancelling || saving}
                  >
                    Keep as is
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      if (activeConfirmDialog.type === 'cancelPendingPayment') {
                        void confirmCancelPendingPayment();
                        return;
                      }

                      if (activeConfirmDialog.type === 'cancelSubscription') {
                        void confirmCancelSubscription();
                      }
                    }}
                    disabled={cancelling || saving}
                  >
                    {cancelling ? 'Working…' : activeConfirmDialog.confirmLabel}
                  </button>
                </div>
              </section>
            </div>
          );
        })()}

      <style jsx global>{`
        body:has(.subscriptionLitePage),
        body:has(.subscriptionLitePage) .app-shell,
        body:has(.subscriptionLitePage) .main-content,
        body:has(.subscriptionLitePage) .main-content.fromone-mobile-bottom-safe,
        body:has(.subscriptionLitePage) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.subscriptionLitePage)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.subscriptionLitePage) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 100px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .subscriptionLitePage {
          width: 100%;
          margin: 0;
          color: #071b49;
          background: transparent !important;
          font-family: var(--font-main), "Plus Jakarta Sans", ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .subscriptionLiteShell {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .subscriptionLiteHero {
          margin-bottom: 3px;
        }

        .subscriptionLiteHero > span,
        .subscriptionLiteStarterHead > div:first-child > span,
        .subscriptionLiteDialog > span {
          display: block;
          margin-bottom: 7px;
          color: #f72585;
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .subscriptionLiteHero h1 {
          margin: 0 0 8px;
          color: #071b49;
          font-size: clamp(2.35rem, 5vw, 3.7rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .subscriptionLiteHero p {
          margin: 0;
          color: #66728a;
          font-size: 0.94rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .subscriptionLiteStatus,
        .subscriptionLiteStarter,
        .subscriptionLiteDetails,
        .subscriptionLiteNotice {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .subscriptionLiteStatus {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 16px;
        }

        .subscriptionLiteStatus > div {
          display: grid;
          gap: 2px;
        }

        .subscriptionLiteStatus > div > span {
          color: #718096;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .subscriptionLiteStatus > div > strong {
          color: #071b49;
          font-size: 1rem;
          font-weight: 900;
        }

        .subscriptionLiteStatus small {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .subscriptionLiteBadge {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border-radius: 999px;
          background: #f7f9fc;
          color: #52617a;
          font-size: 0.68rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .subscriptionLiteBadge.isActive {
          background: #e8f8ef;
          color: #147a4d;
        }

        .subscriptionLiteBadge.isPending {
          background: #fff3d7;
          color: #9a5a00;
        }

        .subscriptionLiteBadge.isWarning {
          background: #fff1f2;
          color: #9f1239;
        }

        .subscriptionLiteNotice {
          display: grid;
          gap: 2px;
          padding: 12px 14px;
        }

        .subscriptionLiteNotice strong {
          font-size: 0.84rem;
          font-weight: 900;
        }

        .subscriptionLiteNotice span {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .subscriptionLiteStarter {
          padding: 16px;
        }

        .subscriptionLiteStarter.isActivePlan {
          border-color: #cfeadb;
          background: #fbfffd;
        }

        .subscriptionLiteStarterHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .subscriptionLiteStarterHead h2 {
          margin: 0;
          color: #071b49;
          font-size: 1.18rem;
          line-height: 1.12;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .subscriptionLitePrice {
          display: flex;
          align-items: baseline;
          gap: 4px;
          white-space: nowrap;
        }

        .subscriptionLitePrice strong {
          color: #071b49;
          font-size: 1.5rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .subscriptionLitePrice span {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .subscriptionLiteFeatures {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
          margin: 14px 0;
        }

        .subscriptionLiteFeatures span {
          min-height: 38px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 10px;
          background: #f7f9fc;
          color: #52617a;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .subscriptionLiteFeatures span::before {
          content: "✓";
          margin-right: 7px;
          color: #f72585;
          font-weight: 900;
        }

        .subscriptionLiteActiveCopy {
          margin: 12px 0 0;
          color: #52617a;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .subscriptionLiteMainButton,
        .subscriptionLiteActions button,
        .subscriptionLiteCancel,
        .subscriptionLiteDialog button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 15px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .subscriptionLiteMainButton,
        .subscriptionLiteActions .primary {
          width: 100%;
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff;
        }

        .subscriptionLiteActions {
          display: grid;
          gap: 7px;
          margin-top: 14px;
        }

        .subscriptionLiteActions .secondary,
        .subscriptionLiteCancel,
        .subscriptionLiteDialog .secondary {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49;
        }

        .subscriptionLiteActions .danger,
        .subscriptionLiteCancel,
        .subscriptionLiteDialog .danger {
          border-color: #fecdd3;
          color: #9f1239;
          background: #fffafa;
        }

        .subscriptionLiteCancel {
          margin-top: 14px;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .subscriptionLiteDetails {
          overflow: hidden;
        }

        .subscriptionLiteDetails summary {
          min-height: 50px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          color: #52617a;
          font-size: 0.76rem;
          font-weight: 900;
          cursor: pointer;
          list-style: none;
        }

        .subscriptionLiteDetails summary::-webkit-details-marker {
          display: none;
        }

        .subscriptionLiteDetailRows {
          display: grid;
          padding: 0 14px 12px;
        }

        .subscriptionLiteDetailRows > div {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid #edf1f7;
        }

        .subscriptionLiteDetailRows span {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .subscriptionLiteDetailRows strong {
          color: #071b49;
          font-size: 0.76rem;
          font-weight: 900;
          text-align: right;
        }

        .subscriptionLiteBackdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(7, 27, 73, 0.38);
        }

        .subscriptionLiteDialog {
          width: min(100%, 420px);
          padding: 18px;
          border-radius: 18px;
          background: #ffffff;
        }

        .subscriptionLiteDialog h2 {
          margin: 0;
          color: #071b49;
          font-size: 1.1rem;
          line-height: 1.15;
          font-weight: 900;
        }

        .subscriptionLiteDialog p {
          margin: 8px 0 16px;
          color: #66728a;
          font-size: 0.8rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .subscriptionLiteDialog > div {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
        }

        @media (max-width: 700px) {
          body:has(.subscriptionLitePage) .main-content,
          body:has(.subscriptionLitePage) .main-content.fromone-mobile-bottom-safe {
            padding: 18px 10px 100px !important;
          }

          .subscriptionLiteShell {
            max-width: 100%;
          }

          .subscriptionLiteHero h1 {
            font-size: 2.2rem;
          }

          .subscriptionLiteStarterHead {
            display: grid;
          }

          .subscriptionLiteFeatures {
            grid-template-columns: 1fr;
          }

          .subscriptionLiteCancel {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}