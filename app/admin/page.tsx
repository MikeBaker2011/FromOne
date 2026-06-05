'use client';

import './admin.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Keep this aligned with app/signin/page.tsx and lib/supabase/browser.ts.
// If the admin page uses a different auth storage key, it can fail to see the active session.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'fromone-auth-session',
  },
});

type AdminCustomer = {
  id: string;
  email: string;
  created_at: string | null;
  last_sign_in_at: string | null;
  access: any | null;
  billing: any | null;
};

type AdminBugReport = {
  id: string;
  user_id: string | null;
  user_email?: string | null;
  title: string;
  severity: string;
  description: string;
  steps_to_reproduce: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Not set';

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const cleanLabel = (value?: string | null) => {
  return value ? String(value).replace(/_/g, ' ') : 'not set';
};

const cleanText = (value?: unknown) => {
  return String(value || '').trim();
};

async function readJsonResponse(response: Response) {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      error: responseText || 'Server returned an empty response.',
    };
  }
}

function getCustomerStatus(customer: AdminCustomer) {
  const accessStatus = String(customer.access?.access_status || '').toLowerCase();
  const subscriptionStatus = String(customer.access?.subscription_status || '').toLowerCase();
  const billingStatus = String(customer.billing?.status || '').toLowerCase();
  const plan = String(customer.billing?.plan || '').toLowerCase();

  if (accessStatus === 'beta' || subscriptionStatus === 'beta' || billingStatus === 'beta') return 'Beta tester';
  if (accessStatus === 'active' && subscriptionStatus === 'active') return 'Active subscriber';
  if (plan === 'starter' || billingStatus === 'active') return 'Subscriber';
  if (accessStatus === 'pending_payment' || subscriptionStatus === 'pending_payment' || billingStatus === 'pending_payment') return 'Pending';
  if (accessStatus === 'expired' || billingStatus === 'expired') return 'Expired';
  if (accessStatus === 'locked' || ['past_due', 'suspended'].includes(billingStatus)) return 'Needs attention';
  return 'Demo / trial';
}

function isBetaCustomer(customer: AdminCustomer) {
  const accessStatus = String(customer.access?.access_status || '').toLowerCase();
  const subscriptionStatus = String(customer.access?.subscription_status || '').toLowerCase();
  const billingStatus = String(customer.billing?.status || '').toLowerCase();

  return accessStatus === 'beta' || subscriptionStatus === 'beta' || billingStatus === 'beta';
}

function isSubscriber(customer: AdminCustomer) {
  const status = getCustomerStatus(customer).toLowerCase();
  const plan = String(customer.billing?.plan || '').toLowerCase();
  const billingStatus = String(customer.billing?.status || '').toLowerCase();
  const reference = customer.billing?.paypal_subscription_id || customer.access?.subscription_reference;

  return status.includes('subscriber') || plan === 'starter' || billingStatus === 'active' || Boolean(reference);
}

function needsAttention(customer: AdminCustomer) {
  const status = getCustomerStatus(customer).toLowerCase();
  return status.includes('pending') || status.includes('expired') || status.includes('attention');
}

export default function AdminPage() {
  const { showToast } = useToast();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [emailQuery, setEmailQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<AdminCustomer[]>([]);
  const [bugReports, setBugReports] = useState<AdminBugReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [confirmExpireCustomer, setConfirmExpireCustomer] = useState<AdminCustomer | null>(null);
  const [adminNotesByUserId, setAdminNotesByUserId] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const initialiseAdminSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setAdminEmail(data.session?.user?.email || null);
      setAuthReady(true);
    };

    initialiseAdminSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setAdminEmail(session?.user?.email || null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !adminEmail) return;

    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, adminEmail]);

  const notify = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    title?: string,
  ) => {
    showToast({
      type,
      title:
        title ||
        (type === 'success'
          ? 'Done'
          : type === 'error'
            ? 'Something went wrong'
            : type === 'warning'
              ? 'Please check'
              : 'FromOne Admin'),
      message,
    });
  };

  const getToken = async () => {
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        lastError = error.message;
      }

      if (data.session?.access_token) {
        return data.session.access_token;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    throw new Error(lastError || 'Please sign in as the admin account first.');
  };

  const syncAdminNotes = (items: AdminCustomer[]) => {
    setAdminNotesByUserId((current) => {
      const nextNotes: Record<string, string> = { ...current };

      for (const customer of items) {
        nextNotes[customer.id] = String(customer.access?.admin_notes || nextNotes[customer.id] || '');
      }

      return nextNotes;
    });
  };

  const loadOverview = async () => {
    if (!authReady && !adminEmail) return;

    setLoadingOverview(true);

    try {
      const token = await getToken();

      const response = await fetch('/api/admin/customer?mode=overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || 'Could not load admin overview.');
      }

      const overviewCustomers = result.customers || [];
      setRecentCustomers(overviewCustomers);
      setBugReports(result.bugReports || []);
      syncAdminNotes(overviewCustomers);
    } catch (error: any) {
      notify(error?.message || 'Could not load admin overview.', 'error');
    } finally {
      setLoadingOverview(false);
    }
  };

  const searchCustomer = async (overrideEmail?: string) => {
    const cleanEmail = (overrideEmail || emailQuery).trim();

    if (!cleanEmail) {
      notify('Enter an email address or part of an email.', 'warning', 'Email needed');
      return;
    }

    if (!authReady && !adminEmail) {
      notify('Checking admin session. Please try again in a moment.', 'info', 'Checking session');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();

      const response = await fetch(`/api/admin/customer?email=${encodeURIComponent(cleanEmail)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || 'Could not search customers.');
      }

      const foundCustomers = result.customers || [];

      setCustomers(foundCustomers);
      syncAdminNotes(foundCustomers);

      if (!foundCustomers.length) {
        notify('No matching customer found.', 'info', 'No result');
        return;
      }

      notify(`${foundCustomers.length} customer result found.`, 'success', 'Customer found');
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (error: any) {
      notify(error?.message || 'Could not search customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCustomer = async (customer: AdminCustomer) => {
    setEmailQuery(customer.email || '');
    setCustomers([customer]);
    syncAdminNotes([customer]);
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const runAction = async (userId: string, action: string, extraBody?: Record<string, any>) => {
    setActingUserId(userId);

    try {
      const token = await getToken();

      const response = await fetch('/api/admin/customer/action', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action,
          ...(extraBody || {}),
        }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || 'Admin action failed.');
      }

      notify(result?.message || 'Customer updated.', 'success', 'Updated');
      await loadOverview();

      if (customers.some((customer) => customer.id === userId)) {
        await searchCustomer(customers.find((customer) => customer.id === userId)?.email || emailQuery);
      }
    } catch (error: any) {
      notify(error?.message || 'Admin action failed.', 'error');
    } finally {
      setActingUserId(null);
    }
  };

  const buildInviteMessage = (emailAddress?: string) => {
    const email = cleanText(emailAddress || inviteEmail);

    return [
      'Hi,',
      '',
      'You’ve been invited to test FromOne beta.',
      '',
      'Please sign up or sign in here:',
      'https://www.fromone.co.uk/signin',
      '',
      email
        ? `Use this email address when signing in: ${email}`
        : 'Use the email address this invite was sent to when signing in.',
      '',
      'Once you have signed in, reply to this email and we’ll activate your beta access.',
      '',
      'Thanks,',
      'FromOne',
      'info@fromone.co.uk',
    ].join('\n');
  };

  const copyBetaInviteMessage = async () => {
    const cleanEmail = cleanText(inviteEmail);

    if (!cleanEmail) {
      notify('Enter the tester email first.', 'warning', 'Email needed');
      return;
    }

    await navigator.clipboard.writeText(buildInviteMessage(cleanEmail));
    notify('Beta invite message copied.', 'success', 'Invite copied');
  };

  const saveAdminNotes = async (customer: AdminCustomer) => {
    await runAction(customer.id, 'save_notes', {
      adminNotes: adminNotesByUserId[customer.id] || '',
    });
  };

  const confirmExpireAccess = async () => {
    if (!confirmExpireCustomer) return;

    const customer = confirmExpireCustomer;
    setConfirmExpireCustomer(null);
    await runAction(customer.id, 'expire');
  };

  const copySupportSummary = async (customer: AdminCustomer) => {
    const summary = [
      `Email: ${customer.email}`,
      `User ID: ${customer.id}`,
      `Access: ${cleanLabel(customer.access?.access_status)}`,
      `Subscription: ${cleanLabel(customer.access?.subscription_status)}`,
      `Provider: ${cleanLabel(customer.access?.subscription_provider)}`,
      `Reference: ${customer.access?.subscription_reference || customer.billing?.paypal_subscription_id || 'Not set'}`,
      `Plan: ${cleanLabel(customer.billing?.plan)}`,
      `Billing: ${cleanLabel(customer.billing?.status)}`,
      `Payment: ${cleanLabel(customer.billing?.payment_status)}`,
      `Extension ends: ${formatDate(customer.access?.extension_ends_at)}`,
      `Admin notes: ${customer.access?.admin_notes || 'None'}`,
    ].join('\n');

    await navigator.clipboard.writeText(summary);
    notify('Support summary copied.', 'success', 'Copied');
  };

  const betaCustomers = useMemo(() => {
    return recentCustomers.filter((customer) => isBetaCustomer(customer)).slice(0, 8);
  }, [recentCustomers]);

  const demoCustomers = useMemo(() => {
    return recentCustomers
      .filter((customer) => !isSubscriber(customer) && !isBetaCustomer(customer))
      .slice(0, 8);
  }, [recentCustomers]);

  const subscriberCustomers = useMemo(() => {
    return recentCustomers.filter((customer) => isSubscriber(customer)).slice(0, 8);
  }, [recentCustomers]);

  const attentionCustomers = useMemo(() => {
    return recentCustomers.filter((customer) => needsAttention(customer)).slice(0, 8);
  }, [recentCustomers]);

  const renderCustomerList = (items: AdminCustomer[], emptyText: string, actionLabel = 'Open') => {
    if (loadingOverview) {
      return <p className="admin-muted-text">Loading...</p>;
    }

    if (!items.length) {
      return <p className="admin-muted-text">{emptyText}</p>;
    }

    return (
      <div className="admin-action-list">
        {items.map((customer) => {
          const busy = actingUserId === customer.id;
          const status = getCustomerStatus(customer);
          const isBetaActive = isBetaCustomer(customer);
          const isActive = customer.access?.access_status === 'active' && customer.access?.subscription_status === 'active';

          return (
            <article key={customer.id} className="admin-action-item">
              <button type="button" className="admin-action-main" onClick={() => openCustomer(customer)}>
                <strong className="admin-customer-email-text">{customer.email}</strong>
                <span>{status} · Created {formatDate(customer.created_at)}</span>
              </button>

              <div className="admin-action-buttons">
                <button type="button" className="secondary-button" onClick={() => openCustomer(customer)}>
                  {actionLabel}
                </button>
                <button
                  type="button"
                  onClick={() => runAction(customer.id, 'grant_beta')}
                  disabled={busy || isBetaActive}
                  title={isBetaActive ? 'Customer already has beta access.' : undefined}
                >
                  {busy ? 'Updating...' : isBetaActive ? 'Beta active' : 'Grant beta'}
                </button>

                {isBetaActive && (
                  <button
                    type="button"
                    className="secondary-button danger-button"
                    onClick={() => runAction(customer.id, 'revoke_beta')}
                    disabled={busy}
                  >
                    Revoke
                  </button>
                )}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => runAction(customer.id, 'manual_active')}
                  disabled={busy || isActive}
                  title={isActive ? 'Customer is already active.' : undefined}
                >
                  Activate Starter
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <main className="admin-page">
      <div className="page-header admin-header">
        <div className="page-eyebrow">Admin support</div>
        <h1 className="page-title">Customer action panel</h1>
        <p className="page-description">
          See recent beta testers, demo signups, subscribers and support reports. Open a customer,
          grant beta access, or activate Starter manually if needed.
        </p>

        <p className="admin-signed-in">
          Signed in as <strong>{authReady ? adminEmail || 'not signed in' : 'checking session...'}</strong>
        </p>
      </div>

      <section className="premium-card admin-search-card admin-compact-search-card">
        <div>
          <div className="page-eyebrow">Find customer</div>
          <h2>Search by email.</h2>
          <p>
            Use the full email or part of it. Search a customer, then use <strong>Grant beta</strong>
            during beta testing or <strong>Activate Starter</strong> for support cases.
          </p>
        </div>

        <div className="admin-search-row">
          <input
            className="input"
            value={emailQuery}
            onChange={(event) => setEmailQuery(event.target.value)}
            placeholder="customer@example.com"
            onKeyDown={(event) => {
              if (event.key === 'Enter') searchCustomer();
            }}
          />
          <button type="button" onClick={() => searchCustomer()} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </section>

      <section className="premium-card admin-beta-invite-card">
        <div>
          <div className="page-eyebrow">Manual beta invite</div>
          <h2>Prepare a beta invite email.</h2>
          <p>
            Enter an email, copy the invite message, then send it from <strong>info@fromone.co.uk</strong>.
            Once the tester signs up, search them above and click <strong>Grant beta</strong>.
          </p>
        </div>

        <div className="admin-beta-invite-grid">
          <label className="admin-beta-invite-field">
            <span>Tester email</span>
            <input
              className="input"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="tester@example.com"
            />
          </label>

          <label className="admin-beta-invite-field">
            <span>Invite message</span>
            <textarea
              className="input"
              value={buildInviteMessage(inviteEmail)}
              readOnly
              rows={9}
            />
          </label>

          <div className="admin-beta-invite-actions">
            <button type="button" onClick={copyBetaInviteMessage}>
              Copy invite message
            </button>

            <a
              className="secondary-button"
              href={`mailto:${encodeURIComponent(inviteEmail.trim())}?subject=${encodeURIComponent('FromOne beta invite')}&body=${encodeURIComponent(buildInviteMessage(inviteEmail))}`}
            >
              Open email
            </a>
          </div>
        </div>
      </section>

      <section className="premium-card admin-health-link-card">
        <div>
          <div className="page-eyebrow">System health</div>
          <h2>Check FromOne health.</h2>
          <p>
            See failed media preparations, publish issues, warnings and recent usage events from one place.
          </p>
        </div>

        <Link href="/admin/health" className="admin-health-link-button">
          Open health dashboard →
        </Link>
      </section>

      <section className="admin-live-sections">
        <article className="premium-card admin-live-card">
          <div className="admin-live-card-header">
            <div>
              <div className="page-eyebrow">Beta testers</div>
              <h2>Controlled beta access</h2>
            </div>
            <button type="button" className="secondary-button" onClick={loadOverview} disabled={loadingOverview}>
              Refresh
            </button>
          </div>
          {renderCustomerList(betaCustomers, 'No beta testers found yet.', 'Open')}
        </article>

        <article className="premium-card admin-live-card">
          <div className="admin-live-card-header">
            <div>
              <div className="page-eyebrow">Recent demo signups</div>
              <h2>People trying FromOne</h2>
            </div>
          </div>
          {renderCustomerList(demoCustomers, 'No recent demo signups found.', 'Open')}
        </article>

        <article className="premium-card admin-live-card">
          <div className="admin-live-card-header">
            <div>
              <div className="page-eyebrow">Recent subscribers</div>
              <h2>Billing and access</h2>
            </div>
          </div>
          {renderCustomerList(
            subscriberCustomers.length ? subscriberCustomers : attentionCustomers,
            'No recent subscribers or billing records found.',
            'Open',
          )}
        </article>
      </section>

      <section className="premium-card admin-live-card admin-support-overview-card">
        <div className="admin-live-card-header">
          <div>
            <div className="page-eyebrow">Support / bug reports</div>
            <h2>Latest things customers reported</h2>
            <p>Use this to spot anything from the support/bug fix form without opening the support page.</p>
          </div>
        </div>

        {loadingOverview ? (
          <p className="admin-muted-text">Loading reports...</p>
        ) : bugReports.length === 0 ? (
          <p className="admin-muted-text">No support or bug reports found.</p>
        ) : (
          <div className="admin-bug-summary-list">
            {bugReports.slice(0, 8).map((report) => (
              <article key={report.id} className="admin-bug-summary-item">
                <div>
                  <span className="admin-bug-pill">{report.severity || 'Medium'}</span>
                  <span className="admin-bug-pill is-muted">{report.status || 'new'}</span>
                </div>
                <h3>{report.title}</h3>
                <p>{report.description}</p>
                <small>
                  {report.user_email || report.user_id || 'Unknown user'} · {report.page_url || 'No page'} · {formatDate(report.created_at)}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section ref={resultsRef} className="admin-results">
        {customers.map((customer) => {
          const busy = actingUserId === customer.id;
          const isBetaActive = isBetaCustomer(customer);
          const isOwnerUnlimited =
            customer.access?.subscription_reference === 'owner-unlimited-access' ||
            customer.billing?.paypal_subscription_id === 'owner-unlimited-access';
          const isActive =
            customer.access?.access_status === 'active' &&
            customer.access?.subscription_status === 'active';
          const isExpired = customer.access?.access_status === 'expired';
          const isPending =
            customer.access?.access_status === 'pending_payment' ||
            customer.access?.subscription_status === 'pending_payment' ||
            customer.billing?.status === 'pending_payment';

          return (
            <article key={customer.id} className="premium-card admin-customer-card">
              <div className="admin-customer-top">
                <div>
                  <div className="page-eyebrow">Customer</div>
                  <h2>{customer.email}</h2>
                  <p>
                    User ID: <code>{customer.id}</code>
                  </p>
                </div>

                <div className="admin-customer-top-actions">
                  <span className="admin-customer-badge">{getCustomerStatus(customer)}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copySupportSummary(customer)}
                  >
                    Copy summary
                  </button>
                </div>
              </div>

              <div className="admin-status-grid">
                <section className="admin-mini-card">
                  <span>Access</span>
                  <strong>{cleanLabel(customer.access?.access_status)}</strong>
                  <p>Subscription: {cleanLabel(customer.access?.subscription_status)}</p>
                  <p>Provider: {cleanLabel(customer.access?.subscription_provider)}</p>
                  <p>Reference: {customer.access?.subscription_reference || 'Not set'}</p>
                </section>

                <section className="admin-mini-card">
                  <span>Demo / extension</span>
                  <strong>{formatDate(customer.access?.extension_ends_at)}</strong>
                  <p>Trial started: {formatDate(customer.access?.trial_started_at)}</p>
                  <p>Trial ends: {formatDate(customer.access?.trial_ends_at)}</p>
                  <p>Updated: {formatDate(customer.access?.updated_at)}</p>
                </section>

                <section className="admin-mini-card">
                  <span>Billing</span>
                  <strong>{cleanLabel(customer.billing?.plan)}</strong>
                  <p>Status: {cleanLabel(customer.billing?.status)}</p>
                  <p>Payment: {cleanLabel(customer.billing?.payment_status)}</p>
                  <p>PayPal: {customer.billing?.paypal_subscription_id || 'Not set'}</p>
                </section>

                <section className="admin-mini-card">
                  <span>Account</span>
                  <strong>Created {formatDate(customer.created_at)}</strong>
                  <p>Last sign-in: {formatDate(customer.last_sign_in_at)}</p>
                  <p>Cancelled: {formatDate(customer.billing?.cancelled_at)}</p>
                  <p>Billing updated: {formatDate(customer.billing?.updated_at)}</p>
                </section>
              </div>

              <div className="admin-notes-card">
                <label>
                  <strong>Admin notes</strong>
                  <span>Internal notes for beta/support history.</span>
                </label>
                <textarea
                  className="input"
                  value={adminNotesByUserId[customer.id] || ''}
                  onChange={(event) =>
                    setAdminNotesByUserId((current) => ({
                      ...current,
                      [customer.id]: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Example: Beta tester. Extended after onboarding feedback."
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => saveAdminNotes(customer)}
                  disabled={busy}
                >
                  Save notes
                </button>
              </div>

              <div className="admin-actions">
                <button
                  type="button"
                  onClick={() => runAction(customer.id, 'grant_beta')}
                  disabled={busy || isBetaActive}
                  title={isBetaActive ? 'Customer already has beta access.' : undefined}
                >
                  Grant beta access
                </button>
                <button
                  type="button"
                  className="secondary-button danger-button"
                  onClick={() => runAction(customer.id, 'revoke_beta')}
                  disabled={busy || !isBetaActive}
                  title={!isBetaActive ? 'Customer does not currently have beta access.' : undefined}
                >
                  Revoke beta
                </button>
                <button type="button" onClick={() => runAction(customer.id, 'extend_7')} disabled={busy}>
                  Extend 7 days
                </button>
                <button type="button" onClick={() => runAction(customer.id, 'extend_14')} disabled={busy}>
                  Extend 14 days
                </button>
                <button type="button" onClick={() => runAction(customer.id, 'extend_30')} disabled={busy}>
                  Extend 30 days
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => runAction(customer.id, 'remove_extension')}
                  disabled={busy || !customer.access?.extension_ends_at}
                  title={!customer.access?.extension_ends_at ? 'No extension is set.' : undefined}
                >
                  Remove extension
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => runAction(customer.id, 'clear_pending')}
                  disabled={busy || !isPending}
                  title={!isPending ? 'No pending payment to clear.' : undefined}
                >
                  Clear pending
                </button>
                <button
                  type="button"
                  onClick={() => runAction(customer.id, 'manual_active')}
                  disabled={busy || (isActive && !isOwnerUnlimited)}
                  title={isActive && !isOwnerUnlimited ? 'Customer is already active.' : undefined}
                >
                  Activate Starter
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => runAction(customer.id, 'owner_unlimited')}
                  disabled={busy || isOwnerUnlimited}
                  title={isOwnerUnlimited ? 'Owner unlimited is already active.' : undefined}
                >
                  Owner unlimited
                </button>
                <button
                  type="button"
                  className="secondary-button danger-button"
                  onClick={() => setConfirmExpireCustomer(customer)}
                  disabled={busy || isExpired}
                  title={isExpired ? 'Customer is already expired.' : undefined}
                >
                  Expire access
                </button>
              </div>

              {busy && <p className="admin-working">Updating customer...</p>}
            </article>
          );
        })}
      </section>

      {confirmExpireCustomer && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <section className="premium-card admin-confirm-card">
            <div className="page-eyebrow">Please confirm</div>
            <h2>Expire this customer?</h2>
            <p>
              This will remove active access for <strong>{confirmExpireCustomer.email}</strong> and
              mark their billing as expired. This should only be used for support/admin cases.
            </p>

            <div className="admin-confirm-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmExpireCustomer(null)}
              >
                Keep access
              </button>
              <button type="button" className="secondary-button danger-button" onClick={confirmExpireAccess}>
                Expire access
              </button>
            </div>
          </section>
        </div>
      )}


      <style jsx global>{`
        /* Final admin customer row fix — remove oversized yellow customer pills */
        .admin-action-list {
          width: 100% !important;
          min-width: 0 !important;
        }

        .admin-action-list .admin-action-item {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 14px !important;
          align-items: stretch !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .admin-page .admin-action-list .admin-action-main,
        .admin-page button.admin-action-main,
        .admin-action-list button.admin-action-main {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: auto !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 6px !important;
          align-items: start !important;
          justify-content: stretch !important;
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
          background-image: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          color: inherit !important;
          text-align: left !important;
          cursor: pointer !important;
          appearance: none !important;
        }

        .admin-page .admin-action-list .admin-action-main:hover,
        .admin-page button.admin-action-main:hover {
          transform: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }

        .admin-action-list .admin-customer-email-text {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          color: #ffffff !important;
          font-size: clamp(0.86rem, 1.1vw, 0.96rem) !important;
          line-height: 1.25 !important;
          font-weight: 900 !important;
          letter-spacing: -0.012em !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .admin-action-list .admin-action-main span {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.58) !important;
          font-size: 0.76rem !important;
          line-height: 1.35 !important;
          font-weight: 760 !important;
          letter-spacing: -0.006em !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .admin-action-list .admin-action-buttons {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
          align-items: center !important;
          width: 100% !important;
          min-width: 0 !important;
        }

        .admin-action-list .admin-action-buttons button {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          white-space: normal !important;
        }

        @media (max-width: 760px) {
          .admin-action-list .admin-customer-email-text,
          .admin-action-list .admin-action-main span {
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            text-overflow: clip !important;
          }

          .admin-action-list .admin-action-buttons {
            grid-template-columns: 1fr !important;
          }
        }


        /* Phase 9 UI polish — Admin */
        .admin-page {
          width: min(100%, 1180px) !important;
          margin-inline: auto !important;
          padding-bottom: 56px !important;
        }

        .admin-header {
          border-radius: 34px !important;
          padding: clamp(24px, 3.4vw, 38px) !important;
          margin-bottom: 20px !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            rgba(15, 23, 42, 0.84) !important;
          border: 1px solid rgba(255, 212, 59, 0.18) !important;
          box-shadow: 0 26px 84px rgba(0, 0, 0, 0.28) !important;
        }

        .admin-header .page-title {
          margin: 8px 0 12px !important;
          color: #ffffff !important;
          font-size: clamp(2.4rem, 5vw, 4.6rem) !important;
          line-height: 0.92 !important;
          letter-spacing: -0.06em !important;
        }

        .admin-header .page-description {
          max-width: 850px !important;
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.58 !important;
        }

        .admin-signed-in {
          width: fit-content !important;
          margin: 18px 0 0 !important;
          padding: 10px 13px !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.065) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: rgba(248, 250, 252, 0.68) !important;
        }

        .admin-search-card,
        .admin-beta-invite-card,
        .admin-health-link-card,
        .admin-live-card,
        .admin-support-overview-card,
        .admin-customer-card {
          border-radius: 30px !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.06), transparent 34%),
            rgba(15, 23, 42, 0.84) !important;
          box-shadow: 0 22px 66px rgba(0, 0, 0, 0.24) !important;
        }

        .admin-search-card {
          display: grid !important;
          grid-template-columns: minmax(0, 0.85fr) minmax(320px, 1.15fr) !important;
          gap: 22px !important;
          align-items: end !important;
          padding: clamp(22px, 3vw, 30px) !important;
          margin-bottom: 18px !important;
        }

        .admin-search-card h2,
        .admin-beta-invite-card h2,
        .admin-health-link-card h2,
        .admin-live-card h2,
        .admin-customer-card h2 {
          margin-top: 8px !important;
          margin-bottom: 8px !important;
          color: #ffffff !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
        }

        .admin-search-card p,
        .admin-beta-invite-card p,
        .admin-health-link-card p,
        .admin-live-card p {
          color: rgba(248, 250, 252, 0.7) !important;
          line-height: 1.55 !important;
        }

        .admin-search-row {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 10px !important;
          align-items: center !important;
          min-width: 0 !important;
        }

        .admin-search-row input,
        .admin-beta-invite-field input,
        .admin-beta-invite-field textarea,
        .admin-notes-card textarea {
          width: 100% !important;
          border-radius: 16px !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          background: rgba(2, 6, 23, 0.42) !important;
          color: #ffffff !important;
          padding: 12px 13px !important;
          outline: none !important;
        }

        .admin-search-row input {
          min-height: 46px !important;
        }

        .admin-search-row input:focus,
        .admin-beta-invite-field input:focus,
        .admin-beta-invite-field textarea:focus,
        .admin-notes-card textarea:focus {
          border-color: rgba(255, 212, 59, 0.46) !important;
          box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.1) !important;
        }

        .admin-beta-invite-card {
          border-color: rgba(255, 212, 59, 0.14) !important;
        }

        .admin-beta-invite-grid {
          padding: 16px !important;
          border-radius: 24px !important;
          background: rgba(2, 6, 23, 0.26) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .admin-beta-invite-actions,
        .admin-actions,
        .admin-action-buttons,
        .admin-confirm-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
          align-items: center !important;
        }

        .admin-page button,
        .admin-page .secondary-button,
        .admin-health-link-button,
        .admin-beta-invite-actions a {
          min-height: 44px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 0 15px !important;
          border-radius: 15px !important;
          font-family: inherit !important;
          font-weight: 950 !important;
          line-height: 1 !important;
          text-decoration: none !important;
          cursor: pointer !important;
          appearance: none !important;
        }

        .admin-page button:not(.secondary-button):not(.danger-button),
        .admin-health-link-button,
        .admin-beta-invite-actions button {
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 30px rgba(255, 212, 59, 0.13) !important;
        }

        .admin-page .secondary-button,
        .admin-beta-invite-actions a.secondary-button {
          background: rgba(255, 255, 255, 0.075) !important;
          color: rgba(248, 250, 252, 0.93) !important;
          border: 1px solid rgba(255, 255, 255, 0.13) !important;
          box-shadow: none !important;
        }

        .admin-page .danger-button {
          background: rgba(248, 113, 113, 0.12) !important;
          color: #fecaca !important;
          border-color: rgba(248, 113, 113, 0.28) !important;
          box-shadow: none !important;
        }

        .admin-page button:disabled {
          opacity: 0.62 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }

        .admin-health-link-card {
          border-color: rgba(255, 212, 59, 0.16) !important;
        }

        .admin-live-sections {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 16px !important;
          margin: 20px 0 !important;
        }

        .admin-live-card {
          min-width: 0 !important;
          padding: 20px !important;
        }

        .admin-live-card-header {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 14px !important;
          margin-bottom: 16px !important;
        }

        .admin-action-list {
          display: grid !important;
          gap: 12px !important;
        }

        .admin-action-list .admin-action-item {
          padding: 14px !important;
          border-radius: 20px !important;
          background: rgba(2, 6, 23, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .admin-action-list .admin-action-main {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          min-height: auto !important;
          padding: 0 !important;
          color: inherit !important;
        }

        .admin-muted-text {
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.62) !important;
          line-height: 1.45 !important;
        }

        .admin-support-overview-card {
          padding: 22px !important;
          margin-top: 18px !important;
        }

        .admin-bug-summary-list {
          gap: 12px !important;
        }

        .admin-bug-summary-item {
          border-radius: 20px !important;
          background: rgba(2, 6, 23, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .admin-results {
          margin-top: 22px !important;
        }

        .admin-customer-card {
          overflow: hidden !important;
        }

        .admin-customer-top {
          padding-bottom: 18px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .admin-customer-top h2 {
          overflow-wrap: anywhere !important;
        }

        .admin-status-grid {
          margin-top: 18px !important;
        }

        .admin-mini-card {
          border-radius: 22px !important;
          background: rgba(2, 6, 23, 0.32) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .admin-notes-card {
          border-radius: 24px !important;
          background: rgba(2, 6, 23, 0.32) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .admin-confirm-overlay {
          backdrop-filter: blur(14px) !important;
        }

        .admin-confirm-card {
          border-radius: 28px !important;
        }

        @media (max-width: 1080px) {
          .admin-live-sections {
            grid-template-columns: 1fr !important;
          }

          .admin-search-card {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .admin-page {
            padding-inline: 12px !important;
          }

          .admin-header,
          .admin-search-card,
          .admin-beta-invite-card,
          .admin-health-link-card,
          .admin-live-card,
          .admin-support-overview-card,
          .admin-customer-card {
            border-radius: 24px !important;
            padding: 17px !important;
          }

          .admin-header .page-title {
            font-size: 2.35rem !important;
          }

          .admin-search-row {
            grid-template-columns: 1fr !important;
          }

          .admin-search-row button,
          .admin-beta-invite-actions button,
          .admin-beta-invite-actions a,
          .admin-health-link-button,
          .admin-live-card-header button,
          .admin-page button {
            width: 100% !important;
          }

          .admin-live-card-header,
          .admin-customer-top,
          .admin-health-link-card {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .admin-beta-invite-actions,
          .admin-actions,
          .admin-action-buttons,
          .admin-confirm-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }
        }


        .admin-action-list .admin-action-item {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 14px !important;
          align-items: stretch !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .admin-action-list .admin-action-main {
          min-width: 0 !important;
          width: 100% !important;
          text-align: left !important;
          padding-right: 0 !important;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
        }

        .admin-action-list .admin-customer-email-text {
          display: block !important;
          max-width: 100% !important;
          color: #ffffff !important;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          font-size: 0.9rem !important;
          line-height: 1.25 !important;
          letter-spacing: -0.006em !important;
          font-weight: 780 !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
          white-space: normal !important;
        }

        .admin-action-list .admin-action-main span {
          display: block !important;
          margin-top: 6px !important;
          color: rgba(248, 250, 252, 0.56) !important;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          font-size: 0.76rem !important;
          line-height: 1.35 !important;
          font-weight: 720 !important;
          letter-spacing: -0.005em !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
        }

        .admin-action-list .admin-action-buttons {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
          justify-content: flex-start !important;
          align-items: center !important;
          min-width: 0 !important;
          width: 100% !important;
        }

        .admin-action-list .admin-action-buttons button {
          flex: 0 1 auto !important;
          min-width: 118px !important;
          max-width: 100% !important;
          white-space: nowrap !important;
        }

        @media (max-width: 760px) {
          .admin-action-list .admin-action-buttons {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .admin-action-list .admin-action-buttons button {
            width: 100% !important;
          }
        }
      `}</style>


      <style jsx>{`

        .admin-beta-invite-card {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(320px, 1.15fr);
          gap: 22px;
          align-items: start;
          margin: 18px 0 22px;
          padding: clamp(22px, 3vw, 30px) !important;
        }

        .admin-beta-invite-card h2 {
          margin: 8px 0 8px;
        }

        .admin-beta-invite-card p {
          margin-bottom: 0;
        }

        .admin-beta-invite-grid {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .admin-beta-invite-field {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .admin-beta-invite-field span {
          color: rgba(255, 212, 59, 0.92);
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-beta-invite-field textarea {
          min-height: 190px;
          resize: vertical;
          line-height: 1.45;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .admin-beta-invite-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .admin-beta-invite-actions a {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 950;
        }

        .admin-results {
          display: grid;
          gap: 22px;
          margin-top: 22px;
        }

        .admin-customer-card {
          padding: clamp(22px, 3vw, 34px) !important;
          border-radius: 30px !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 34%),
            rgba(15, 23, 42, 0.88) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28) !important;
        }

        .admin-customer-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .admin-customer-top h2 {
          margin: 8px 0 8px;
          font-size: clamp(1.8rem, 4vw, 3rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .admin-customer-top p {
          margin: 0;
          color: rgba(248, 250, 252, 0.66);
          line-height: 1.55;
        }

        .admin-customer-top code {
          color: rgba(248, 250, 252, 0.82);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 7px;
          border-radius: 9px;
          font-size: 0.82rem;
          word-break: break-all;
        }

        .admin-customer-top-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 220px;
        }

        .admin-customer-badge,
        .admin-bug-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.14);
          color: #fef08a;
          border: 1px solid rgba(255, 212, 59, 0.34);
          font-size: 0.74rem;
          font-weight: 950;
          white-space: nowrap;
          text-transform: capitalize;
        }

        .admin-bug-pill.is-muted {
          background: rgba(148, 163, 184, 0.12);
          color: rgba(248, 250, 252, 0.72);
          border-color: rgba(148, 163, 184, 0.22);
        }

        .admin-status-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 18px 0;
        }

        .admin-mini-card {
          min-width: 0;
          padding: 18px;
          border-radius: 22px;
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .admin-mini-card span {
          display: block;
          color: rgba(255, 212, 59, 0.92);
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .admin-mini-card strong {
          display: block;
          color: #ffffff;
          font-size: 1rem;
          line-height: 1.3;
          margin-bottom: 10px;
          word-break: break-word;
        }

        .admin-mini-card p {
          margin: 5px 0 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.45;
          font-size: 0.88rem;
          word-break: break-word;
        }

        .admin-notes-card {
          margin-top: 18px;
          padding: 18px;
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.36);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .admin-notes-card label {
          display: grid;
          gap: 4px;
          margin-bottom: 10px;
        }

        .admin-notes-card label strong {
          color: #ffffff;
          font-size: 1rem;
        }

        .admin-notes-card label span {
          color: rgba(248, 250, 252, 0.62);
          line-height: 1.45;
        }

        .admin-notes-card textarea {
          width: 100%;
          min-height: 96px;
          resize: vertical;
          margin-bottom: 12px;
        }

        .admin-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 18px;
        }

        .admin-actions button,
        .admin-customer-top-actions button,
        .admin-notes-card button,
        .admin-action-buttons button {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 14px;
          font-weight: 950;
        }

        .admin-actions .secondary-button,
        .admin-customer-top-actions .secondary-button,
        .admin-notes-card .secondary-button {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(248, 250, 252, 0.92);
        }

        .danger-button {
          background: rgba(127, 29, 29, 0.28) !important;
          border-color: rgba(248, 113, 113, 0.38) !important;
          color: #fecaca !important;
        }

        .admin-working {
          margin: 14px 0 0;
          color: #fef08a;
          font-weight: 900;
        }

        .admin-bug-summary-list {
          display: grid;
          gap: 12px;
        }

        .admin-bug-summary-item {
          padding: 16px;
          border-radius: 20px;
          background: rgba(2, 6, 23, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .admin-bug-summary-item h3 {
          margin: 10px 0 8px;
          color: #ffffff;
          font-size: 1.05rem;
          line-height: 1.25;
        }

        .admin-bug-summary-item p {
          margin: 0 0 10px;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .admin-bug-summary-item small {
          color: rgba(248, 250, 252, 0.54);
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .admin-confirm-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.78);
          backdrop-filter: blur(12px);
        }

        .admin-confirm-card {
          width: min(100%, 560px);
          padding: 26px !important;
        }

        .admin-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }


        .admin-health-link-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin: 18px 0 22px;
          padding: clamp(22px, 3vw, 30px) !important;
        }

        .admin-health-link-card p {
          margin-bottom: 0;
        }

        .admin-health-link-card h2 {
          margin: 8px 0 8px;
        }

        .admin-health-link-button {
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 18px;
          background: linear-gradient(135deg, #ffd43b, #f7b733);
          color: #101420;
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 18px 42px rgba(255, 212, 59, 0.2);
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .admin-health-link-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 52px rgba(255, 212, 59, 0.26);
        }

        @media (max-width: 1080px) {
          .admin-status-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .admin-beta-invite-card {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .admin-customer-top {
            display: grid;
            grid-template-columns: 1fr;
          }

          .admin-customer-top-actions {
            justify-content: stretch;
            min-width: 0;
          }

          .admin-customer-top-actions button,
          .admin-customer-top-actions .admin-customer-badge {
            width: 100%;
          }

          .admin-status-grid {
            grid-template-columns: 1fr;
          }

          .admin-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .admin-actions button,
          .admin-confirm-actions button,
          .admin-health-link-button {
            width: 100%;
          }

          .admin-health-link-card {
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}