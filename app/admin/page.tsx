'use client';

import './admin.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  if (accessStatus === 'active' && subscriptionStatus === 'active') return 'Active subscriber';
  if (plan === 'starter' || billingStatus === 'active') return 'Subscriber';
  if (accessStatus === 'pending_payment' || subscriptionStatus === 'pending_payment' || billingStatus === 'pending_payment') return 'Pending';
  if (accessStatus === 'expired' || billingStatus === 'expired') return 'Expired';
  if (accessStatus === 'locked' || ['past_due', 'suspended'].includes(billingStatus)) return 'Needs attention';
  return 'Demo / trial';
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
  const [emailQuery, setEmailQuery] = useState('');
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<AdminCustomer[]>([]);
  const [bugReports, setBugReports] = useState<AdminBugReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [confirmExpireCustomer, setConfirmExpireCustomer] = useState<AdminCustomer | null>(null);
  const [adminNotesByUserId, setAdminNotesByUserId] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data.user?.email || null);
    });

    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error('Please sign in as the admin account first.');
    }

    return data.session.access_token;
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

  const demoCustomers = useMemo(() => {
    return recentCustomers.filter((customer) => !isSubscriber(customer)).slice(0, 8);
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
          const isActive = customer.access?.access_status === 'active' && customer.access?.subscription_status === 'active';

          return (
            <article key={customer.id} className="admin-action-item">
              <button type="button" className="admin-action-main" onClick={() => openCustomer(customer)}>
                <strong>{customer.email}</strong>
                <span>{status} · Created {formatDate(customer.created_at)}</span>
              </button>

              <div className="admin-action-buttons">
                <button type="button" className="secondary-button" onClick={() => openCustomer(customer)}>
                  {actionLabel}
                </button>
                <button
                  type="button"
                  onClick={() => runAction(customer.id, 'manual_active')}
                  disabled={busy || isActive}
                  title={isActive ? 'Customer is already active.' : undefined}
                >
                  {busy ? 'Updating...' : 'Activate Starter'}
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
          See recent demo signups, subscribers and support reports. Open a customer and activate
          Starter manually if PayPal does not auto-update access.
        </p>

        <p className="admin-signed-in">
          Signed in as <strong>{adminEmail || 'checking session...'}</strong>
        </p>
      </div>

      <section className="premium-card admin-search-card admin-compact-search-card">
        <div>
          <div className="page-eyebrow">Find customer</div>
          <h2>Search by email.</h2>
          <p>
            Use the full email or part of it. Search a customer, then use <strong>Activate Starter</strong>
            if a subscription needs manual activation.
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

      <section className="admin-live-sections">
        <article className="premium-card admin-live-card">
          <div className="admin-live-card-header">
            <div>
              <div className="page-eyebrow">Recent demo signups</div>
              <h2>People trying FromOne</h2>
            </div>
            <button type="button" className="secondary-button" onClick={loadOverview} disabled={loadingOverview}>
              Refresh
            </button>
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
    </main>
  );
}