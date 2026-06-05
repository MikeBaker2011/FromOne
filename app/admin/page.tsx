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

const formatCount = (value: number) => new Intl.NumberFormat('en-GB').format(value);

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

function getStatusTone(label: string) {
  const value = label.toLowerCase();
  if (value.includes('active') || value.includes('subscriber') || value.includes('beta')) return 'good';
  if (value.includes('pending') || value.includes('attention')) return 'warn';
  if (value.includes('expired') || value.includes('locked') || value.includes('suspended')) return 'bad';
  return 'neutral';
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

  const openIssues = useMemo(() => {
    return bugReports.filter((report) => {
      const status = String(report.status || '').toLowerCase();
      return !['closed', 'resolved', 'done', 'fixed'].includes(status);
    });
  }, [bugReports]);

  const systemServices = [
    'API & Services',
    'Database',
    'Background Jobs',
    'Email Delivery',
    'File Storage',
    'Web App',
  ];

  const recentSearches = useMemo(() => {
    return recentCustomers.slice(0, 3);
  }, [recentCustomers]);

  const renderCustomerRows = (items: AdminCustomer[], emptyText: string) => {
    if (loadingOverview) {
      return <p className="admin-empty-text">Loading customer activity...</p>;
    }

    if (!items.length) {
      return <p className="admin-empty-text">{emptyText}</p>;
    }

    return (
      <div className="admin-table-list">
        {items.map((customer) => {
          const busy = actingUserId === customer.id;
          const status = getCustomerStatus(customer);
          const isBetaActive = isBetaCustomer(customer);
          const isActive = customer.access?.access_status === 'active' && customer.access?.subscription_status === 'active';

          return (
            <article key={customer.id} className="admin-table-row">
              <button type="button" className="admin-row-main" onClick={() => openCustomer(customer)}>
                <span className="admin-row-email">{customer.email}</span>
                <span className="admin-row-meta">Created {formatDate(customer.created_at)}</span>
              </button>

              <span className={`admin-status-chip is-${getStatusTone(status)}`}>{status}</span>

              <div className="admin-row-actions">
                <button type="button" className="admin-ghost-button" onClick={() => openCustomer(customer)}>
                  Open
                </button>
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() => runAction(customer.id, 'grant_beta')}
                  disabled={busy || isBetaActive}
                  title={isBetaActive ? 'Customer already has beta access.' : undefined}
                >
                  {busy ? 'Updating...' : isBetaActive ? 'Beta active' : 'Grant beta'}
                </button>
                <button
                  type="button"
                  className="admin-ghost-button"
                  onClick={() => runAction(customer.id, 'manual_active')}
                  disabled={busy || isActive}
                  title={isActive ? 'Customer is already active.' : undefined}
                >
                  Activate
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <main className="admin-page admin-agency-page">
      <section className="admin-hero-panel">
        <div>
          <div className="admin-eyebrow">Admin support</div>
          <h1>Customer Action Panel</h1>
          <p>
            See recent beta testers, demo signups, subscribers and support reports. Open a customer,
            grant beta access, or activate Starter manually when support needs it.
          </p>
          <div className="admin-session-pill">
            Signed in as <strong>{authReady ? adminEmail || 'not signed in' : 'checking session...'}</strong>
          </div>
        </div>

        <div className="admin-hero-actions" aria-label="Admin quick actions">
          <Link href="/admin/health" className="admin-ghost-button">
            Health dashboard
          </Link>
          <button type="button" className="admin-ghost-button" onClick={loadOverview} disabled={loadingOverview}>
            {loadingOverview ? 'Refreshing...' : 'Refresh data'}
          </button>
          <a className="admin-primary-button" href="#beta-invite">
            New beta invite
          </a>
        </div>
      </section>

      <section className="admin-kpi-grid" aria-label="Admin overview">
        <article className="admin-kpi-card">
          <span className="admin-kpi-icon">◎</span>
          <div>
            <p>Beta testers</p>
            <strong>{formatCount(betaCustomers.length)}</strong>
            <small>Controlled access</small>
          </div>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-icon">◌</span>
          <div>
            <p>Demo signups</p>
            <strong>{formatCount(demoCustomers.length)}</strong>
            <small>Recent trials</small>
          </div>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-icon">♛</span>
          <div>
            <p>Subscribers</p>
            <strong>{formatCount(subscriberCustomers.length)}</strong>
            <small>Billing records</small>
          </div>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-icon is-alert">!</span>
          <div>
            <p>Open issues</p>
            <strong>{formatCount(openIssues.length)}</strong>
            <small>{openIssues.length ? 'Needs review' : 'All clear'}</small>
          </div>
        </article>
      </section>

      <section className="admin-action-grid">
        <article className="admin-panel admin-search-panel">
          <div className="admin-panel-header">
            <span className="admin-panel-icon">⌕</span>
            <div>
              <div className="admin-eyebrow">Find customer</div>
              <h2>Search by email</h2>
              <p>
                Use a full email or partial match, then grant beta access, activate Starter, or copy a support summary.
              </p>
            </div>
          </div>

          <div className="admin-search-row">
            <input
              className="admin-input"
              value={emailQuery}
              onChange={(event) => setEmailQuery(event.target.value)}
              placeholder="customer@example.com"
              onKeyDown={(event) => {
                if (event.key === 'Enter') searchCustomer();
              }}
            />
            <button type="button" className="admin-primary-button" onClick={() => searchCustomer()} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="admin-recent-searches">
            <div className="admin-mini-heading">Recent customers</div>
            {recentSearches.length ? (
              recentSearches.map((customer) => (
                <button key={customer.id} type="button" onClick={() => openCustomer(customer)}>
                  <span>{customer.email}</span>
                  <small>{formatDate(customer.created_at)}</small>
                </button>
              ))
            ) : (
              <p className="admin-empty-text">Recent customer activity will appear here.</p>
            )}
          </div>
        </article>

        <article id="beta-invite" className="admin-panel admin-invite-panel">
          <div className="admin-panel-header">
            <span className="admin-panel-icon">↗</span>
            <div>
              <div className="admin-eyebrow">Beta invite</div>
              <h2>Prepare invite email</h2>
              <p>Send a polished beta invite, then grant access after the tester signs up.</p>
            </div>
          </div>

          <label className="admin-field">
            <span>Tester email</span>
            <input
              className="admin-input"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="tester@example.com"
            />
          </label>

          <label className="admin-field">
            <span>Invite message</span>
            <textarea className="admin-input" value={buildInviteMessage(inviteEmail)} readOnly rows={9} />
          </label>

          <div className="admin-button-row">
            <button type="button" className="admin-primary-button" onClick={copyBetaInviteMessage}>
              Copy message
            </button>
            <a
              className="admin-ghost-button"
              href={`mailto:${encodeURIComponent(inviteEmail.trim())}?subject=${encodeURIComponent('FromOne beta invite')}&body=${encodeURIComponent(buildInviteMessage(inviteEmail))}`}
            >
              Open email
            </a>
          </div>
        </article>
      </section>

      <section className="admin-panel admin-health-panel">
        <div className="admin-health-copy">
          <span className="admin-panel-icon">◇</span>
          <div>
            <div className="admin-eyebrow">System health</div>
            <h2>All systems operational</h2>
            <p>Keep an eye on media preparation, publishing, storage and app delivery from one clean view.</p>
          </div>
        </div>

        <div className="admin-service-grid">
          {systemServices.map((service) => (
            <div key={service} className="admin-service-item">
              <span />
              <strong>{service}</strong>
              <small>Operational</small>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-live-grid">
        <article className="admin-panel admin-list-card">
          <div className="admin-list-card-header">
            <div>
              <div className="admin-eyebrow">Beta testers</div>
              <h2>Controlled beta access</h2>
            </div>
            <button type="button" className="admin-ghost-button" onClick={loadOverview} disabled={loadingOverview}>
              Refresh
            </button>
          </div>
          {renderCustomerRows(betaCustomers, 'No beta testers found yet.')}
        </article>

        <article className="admin-panel admin-list-card">
          <div className="admin-list-card-header">
            <div>
              <div className="admin-eyebrow">Recent demo signups</div>
              <h2>People trying FromOne</h2>
            </div>
          </div>
          {renderCustomerRows(demoCustomers, 'No recent demo signups found.')}
        </article>

        <article className="admin-panel admin-list-card">
          <div className="admin-list-card-header">
            <div>
              <div className="admin-eyebrow">Recent subscribers</div>
              <h2>Billing and access</h2>
            </div>
          </div>
          {renderCustomerRows(
            subscriberCustomers.length ? subscriberCustomers : attentionCustomers,
            'No recent subscribers or billing records found.',
          )}
        </article>
      </section>

      <section className="admin-panel admin-support-panel">
        <div className="admin-list-card-header">
          <div>
            <div className="admin-eyebrow">Support & bug reports</div>
            <h2>Latest customer reports</h2>
            <p>Use this to spot issues from the support form without leaving the admin panel.</p>
          </div>
        </div>

        {loadingOverview ? (
          <p className="admin-empty-text">Loading reports...</p>
        ) : bugReports.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">✓</div>
            <h3>No open support tickets</h3>
            <p>Great job. There are no issues right now. New reports will appear here.</p>
          </div>
        ) : (
          <div className="admin-report-list">
            {bugReports.slice(0, 8).map((report) => (
              <article key={report.id} className="admin-report-item">
                <div className="admin-report-chips">
                  <span className="admin-status-chip is-warn">{report.severity || 'Medium'}</span>
                  <span className="admin-status-chip is-neutral">{report.status || 'new'}</span>
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
          const status = getCustomerStatus(customer);

          return (
            <article key={customer.id} className="admin-panel admin-customer-card">
              <div className="admin-customer-top">
                <div>
                  <div className="admin-eyebrow">Customer profile</div>
                  <h2>{customer.email}</h2>
                  <p>
                    User ID: <code>{customer.id}</code>
                  </p>
                </div>

                <div className="admin-customer-top-actions">
                  <span className={`admin-status-chip is-${getStatusTone(status)}`}>{status}</span>
                  <button type="button" className="admin-ghost-button" onClick={() => copySupportSummary(customer)}>
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
                  <span>Internal notes for beta access, billing support or onboarding history.</span>
                </label>
                <textarea
                  className="admin-input"
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
                <button type="button" className="admin-ghost-button" onClick={() => saveAdminNotes(customer)} disabled={busy}>
                  Save notes
                </button>
              </div>

              <div className="admin-action-button-grid">
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() => runAction(customer.id, 'grant_beta')}
                  disabled={busy || isBetaActive}
                  title={isBetaActive ? 'Customer already has beta access.' : undefined}
                >
                  Grant beta access
                </button>
                <button
                  type="button"
                  className="admin-danger-button"
                  onClick={() => runAction(customer.id, 'revoke_beta')}
                  disabled={busy || !isBetaActive}
                  title={!isBetaActive ? 'Customer does not currently have beta access.' : undefined}
                >
                  Revoke beta
                </button>
                <button type="button" className="admin-ghost-button" onClick={() => runAction(customer.id, 'extend_7')} disabled={busy}>
                  Extend 7 days
                </button>
                <button type="button" className="admin-ghost-button" onClick={() => runAction(customer.id, 'extend_14')} disabled={busy}>
                  Extend 14 days
                </button>
                <button type="button" className="admin-ghost-button" onClick={() => runAction(customer.id, 'extend_30')} disabled={busy}>
                  Extend 30 days
                </button>
                <button
                  type="button"
                  className="admin-ghost-button"
                  onClick={() => runAction(customer.id, 'remove_extension')}
                  disabled={busy || !customer.access?.extension_ends_at}
                  title={!customer.access?.extension_ends_at ? 'No extension is set.' : undefined}
                >
                  Remove extension
                </button>
                <button
                  type="button"
                  className="admin-ghost-button"
                  onClick={() => runAction(customer.id, 'clear_pending')}
                  disabled={busy || !isPending}
                  title={!isPending ? 'No pending payment to clear.' : undefined}
                >
                  Clear pending
                </button>
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() => runAction(customer.id, 'manual_active')}
                  disabled={busy || (isActive && !isOwnerUnlimited)}
                  title={isActive && !isOwnerUnlimited ? 'Customer is already active.' : undefined}
                >
                  Activate Starter
                </button>
                <button
                  type="button"
                  className="admin-ghost-button"
                  onClick={() => runAction(customer.id, 'owner_unlimited')}
                  disabled={busy || isOwnerUnlimited}
                  title={isOwnerUnlimited ? 'Owner unlimited is already active.' : undefined}
                >
                  Owner unlimited
                </button>
                <button
                  type="button"
                  className="admin-danger-button"
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
          <section className="admin-panel admin-confirm-card">
            <div className="admin-eyebrow">Please confirm</div>
            <h2>Expire this customer?</h2>
            <p>
              This will remove active access for <strong>{confirmExpireCustomer.email}</strong> and mark their billing as expired.
              Use this only for support/admin cases.
            </p>

            <div className="admin-button-row is-end">
              <button type="button" className="admin-ghost-button" onClick={() => setConfirmExpireCustomer(null)}>
                Keep access
              </button>
              <button type="button" className="admin-danger-button" onClick={confirmExpireAccess}>
                Expire access
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        .admin-agency-page {
          --admin-bg: #070b12;
          --admin-panel: rgba(15, 23, 42, 0.78);
          --admin-panel-strong: rgba(15, 23, 42, 0.92);
          --admin-border: rgba(255, 255, 255, 0.09);
          --admin-border-strong: rgba(255, 212, 59, 0.22);
          --admin-text: #f8fafc;
          --admin-muted: rgba(248, 250, 252, 0.64);
          --admin-soft: rgba(248, 250, 252, 0.44);
          --admin-gold: #ffd43b;
          --admin-gold-2: #f7b733;
          --admin-good: #4ade80;
          --admin-warn: #facc15;
          --admin-bad: #fb7185;
          width: min(100%, 1180px) !important;
          margin: 0 auto !important;
          padding: clamp(16px, 2vw, 24px) clamp(12px, 2vw, 18px) 64px !important;
          color: var(--admin-text) !important;
        }

        .admin-agency-page *,
        .admin-agency-page *::before,
        .admin-agency-page *::after {
          box-sizing: border-box;
        }

        .admin-agency-page button,
        .admin-agency-page a,
        .admin-agency-page input,
        .admin-agency-page textarea {
          font-family: inherit !important;
        }

        .admin-hero-panel,
        .admin-panel,
        .admin-kpi-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--admin-border);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 34%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(8, 13, 24, 0.86));
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(18px);
        }

        .admin-hero-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 24px;
          min-height: 238px;
          margin-bottom: 18px;
          padding: clamp(26px, 4vw, 46px);
          border-radius: 34px;
          border-color: rgba(255, 212, 59, 0.18);
        }

        .admin-hero-panel::after,
        .admin-support-panel::after {
          content: '';
          position: absolute;
          inset: auto -18% -60% 48%;
          height: 360px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 212, 59, 0.12), transparent 62%);
          pointer-events: none;
        }

        .admin-eyebrow,
        .admin-mini-heading,
        .admin-field > span,
        .admin-mini-card > span {
          color: var(--admin-gold);
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .admin-hero-panel h1 {
          max-width: 820px;
          margin: 10px 0 14px;
          color: #ffffff;
          font-size: clamp(2.7rem, 6vw, 5.4rem);
          line-height: 0.88;
          letter-spacing: -0.07em;
        }

        .admin-hero-panel p,
        .admin-panel p,
        .admin-report-item p,
        .admin-mini-card p,
        .admin-notes-card span {
          color: var(--admin-muted);
          line-height: 1.58;
        }

        .admin-hero-panel p {
          max-width: 800px;
          margin: 0;
          font-size: 1rem;
        }

        .admin-session-pill {
          width: fit-content;
          max-width: 100%;
          margin-top: 20px;
          padding: 10px 13px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.065);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(248, 250, 252, 0.7);
          overflow-wrap: anywhere;
        }

        .admin-hero-actions,
        .admin-button-row,
        .admin-row-actions,
        .admin-customer-top-actions,
        .admin-action-button-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .admin-hero-actions {
          justify-content: flex-end;
          min-width: 330px;
        }

        .admin-primary-button,
        .admin-ghost-button,
        .admin-danger-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          border-radius: 15px;
          border: 1px solid transparent;
          font-weight: 950;
          line-height: 1;
          text-decoration: none;
          cursor: pointer;
          appearance: none;
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .admin-primary-button {
          background: linear-gradient(135deg, var(--admin-gold), var(--admin-gold-2));
          color: #101420;
          border-color: rgba(255, 212, 59, 0.54);
          box-shadow: 0 16px 34px rgba(255, 212, 59, 0.14);
        }

        .admin-ghost-button {
          background: rgba(255, 255, 255, 0.07);
          color: rgba(248, 250, 252, 0.92);
          border-color: rgba(255, 255, 255, 0.13);
        }

        .admin-danger-button {
          background: rgba(251, 113, 133, 0.12);
          color: #fecdd3;
          border-color: rgba(251, 113, 133, 0.28);
        }

        .admin-primary-button:hover:not(:disabled),
        .admin-ghost-button:hover:not(:disabled),
        .admin-danger-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .admin-agency-page button:disabled,
        .admin-agency-page a[aria-disabled='true'] {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .admin-kpi-card {
          display: flex;
          gap: 14px;
          align-items: center;
          min-height: 126px;
          padding: 20px;
          border-radius: 22px;
        }

        .admin-kpi-icon,
        .admin-panel-icon,
        .admin-empty-icon {
          flex: 0 0 auto;
          display: inline-grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 18px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.16);
          color: var(--admin-gold);
          font-weight: 950;
        }

        .admin-kpi-icon.is-alert {
          color: #fb7185;
          background: rgba(251, 113, 133, 0.1);
          border-color: rgba(251, 113, 133, 0.16);
        }

        .admin-kpi-card p,
        .admin-kpi-card small {
          margin: 0;
          color: var(--admin-muted);
        }

        .admin-kpi-card strong {
          display: block;
          margin: 5px 0;
          color: #ffffff;
          font-size: 2rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .admin-action-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.45fr);
          gap: 16px;
          margin-bottom: 16px;
        }

        .admin-panel {
          border-radius: 28px;
          padding: clamp(20px, 2.6vw, 28px);
        }

        .admin-panel-header,
        .admin-health-copy,
        .admin-list-card-header,
        .admin-customer-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .admin-panel-header {
          justify-content: flex-start;
          margin-bottom: 20px;
        }

        .admin-panel h2 {
          margin: 6px 0 8px;
          color: #ffffff;
          font-size: clamp(1.25rem, 2vw, 1.75rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .admin-panel p {
          margin: 0;
        }

        .admin-search-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }

        .admin-input {
          width: 100%;
          min-width: 0;
          min-height: 46px;
          padding: 12px 14px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(2, 6, 23, 0.42);
          color: #ffffff;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        textarea.admin-input {
          min-height: 198px;
          resize: vertical;
          line-height: 1.5;
        }

        .admin-input:focus {
          border-color: rgba(255, 212, 59, 0.5);
          box-shadow: 0 0 0 4px rgba(255, 212, 59, 0.09);
        }

        .admin-field {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .admin-recent-searches {
          display: grid;
          gap: 9px;
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .admin-recent-searches button {
          width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 13px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.24);
          color: rgba(248, 250, 252, 0.9);
          text-align: left;
          cursor: pointer;
        }

        .admin-recent-searches small,
        .admin-row-meta,
        .admin-report-item small {
          color: var(--admin-soft);
        }

        .admin-health-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
          gap: 22px;
          align-items: center;
          margin-bottom: 16px;
        }

        .admin-health-copy {
          justify-content: flex-start;
        }

        .admin-service-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.25);
        }

        .admin-service-item {
          display: grid;
          gap: 5px;
          min-width: 0;
          padding: 14px;
          border-right: 1px solid rgba(255, 255, 255, 0.07);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .admin-service-item span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--admin-good);
          box-shadow: 0 0 14px rgba(74, 222, 128, 0.6);
        }

        .admin-service-item strong {
          color: rgba(248, 250, 252, 0.92);
          font-size: 0.86rem;
        }

        .admin-service-item small {
          color: var(--admin-good);
          font-weight: 850;
        }

        .admin-live-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .admin-list-card {
          min-width: 0;
          padding: 20px;
        }

        .admin-list-card-header {
          margin-bottom: 16px;
        }

        .admin-table-list {
          display: grid;
          gap: 10px;
        }

        .admin-table-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.28);
        }

        .admin-row-main {
          width: 100%;
          min-width: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .admin-row-email {
          display: block;
          max-width: 100%;
          color: #ffffff;
          font-weight: 900;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .admin-row-meta {
          display: block;
          margin-top: 5px;
          font-size: 0.76rem;
          line-height: 1.35;
        }

        .admin-row-actions {
          gap: 8px;
        }

        .admin-row-actions .admin-primary-button,
        .admin-row-actions .admin-ghost-button {
          min-height: 36px;
          flex: 1 1 94px;
          padding: 0 11px;
          border-radius: 12px;
          font-size: 0.78rem;
        }

        .admin-status-chip {
          width: fit-content;
          max-width: 100%;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          font-size: 0.72rem;
          font-weight: 950;
          text-transform: capitalize;
          overflow-wrap: anywhere;
        }

        .admin-status-chip.is-good {
          color: #bbf7d0;
          background: rgba(74, 222, 128, 0.12);
          border-color: rgba(74, 222, 128, 0.28);
        }

        .admin-status-chip.is-warn {
          color: #fef08a;
          background: rgba(250, 204, 21, 0.12);
          border-color: rgba(250, 204, 21, 0.3);
        }

        .admin-status-chip.is-bad {
          color: #fecdd3;
          background: rgba(251, 113, 133, 0.12);
          border-color: rgba(251, 113, 133, 0.28);
        }

        .admin-status-chip.is-neutral {
          color: rgba(248, 250, 252, 0.72);
          background: rgba(148, 163, 184, 0.12);
          border-color: rgba(148, 163, 184, 0.22);
        }

        .admin-support-panel {
          min-height: 290px;
          margin-bottom: 20px;
        }

        .admin-empty-state {
          display: grid;
          place-items: center;
          text-align: center;
          min-height: 190px;
          padding: 26px;
        }

        .admin-empty-state h3 {
          margin: 16px 0 6px;
          color: #ffffff;
          font-size: 1.35rem;
          letter-spacing: -0.04em;
        }

        .admin-empty-state p,
        .admin-empty-text {
          margin: 0;
          color: var(--admin-muted);
          line-height: 1.5;
        }

        .admin-report-list {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .admin-report-item {
          padding: 16px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.3);
        }

        .admin-report-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .admin-report-item h3 {
          margin: 0 0 8px;
          color: #ffffff;
          line-height: 1.25;
        }

        .admin-results {
          display: grid;
          gap: 18px;
          margin-top: 20px;
        }

        .admin-customer-card {
          padding: clamp(22px, 3vw, 34px);
          border-color: rgba(255, 212, 59, 0.14);
        }

        .admin-customer-top {
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .admin-customer-top h2 {
          margin: 8px 0;
          color: #ffffff;
          font-size: clamp(1.7rem, 4vw, 3.2rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
          overflow-wrap: anywhere;
        }

        .admin-customer-top code {
          padding: 3px 7px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(248, 250, 252, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.08);
          word-break: break-all;
        }

        .admin-status-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 18px 0;
        }

        .admin-mini-card,
        .admin-notes-card {
          min-width: 0;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.32);
        }

        .admin-mini-card strong {
          display: block;
          margin: 8px 0 10px;
          color: #ffffff;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .admin-mini-card p {
          margin: 5px 0 0;
          font-size: 0.88rem;
          overflow-wrap: anywhere;
        }

        .admin-notes-card {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .admin-notes-card label {
          display: grid;
          gap: 4px;
        }

        .admin-notes-card strong {
          color: #ffffff;
        }

        .admin-action-button-grid {
          margin-top: 18px;
        }

        .admin-working {
          margin: 14px 0 0;
          color: #fef08a;
          font-weight: 900;
        }

        .admin-confirm-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(14px);
        }

        .admin-confirm-card {
          width: min(100%, 560px);
          border-radius: 28px;
        }

        .admin-confirm-card h2 {
          margin-top: 8px;
        }

        .admin-button-row.is-end {
          justify-content: flex-end;
          margin-top: 18px;
        }

        @media (max-width: 1120px) {
          .admin-hero-panel,
          .admin-action-grid,
          .admin-health-panel {
            grid-template-columns: 1fr;
          }

          .admin-hero-actions {
            justify-content: flex-start;
            min-width: 0;
          }

          .admin-kpi-grid,
          .admin-live-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-status-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .admin-agency-page {
            padding-inline: 12px !important;
          }

          .admin-hero-panel,
          .admin-panel {
            border-radius: 24px;
            padding: 18px;
          }

          .admin-hero-panel h1 {
            font-size: 2.45rem;
          }

          .admin-kpi-grid,
          .admin-live-grid,
          .admin-status-grid,
          .admin-service-grid,
          .admin-search-row {
            grid-template-columns: 1fr;
          }

          .admin-hero-actions,
          .admin-button-row,
          .admin-row-actions,
          .admin-customer-top,
          .admin-customer-top-actions,
          .admin-action-button-grid,
          .admin-list-card-header,
          .admin-panel-header,
          .admin-health-copy {
            display: grid;
            grid-template-columns: 1fr;
          }

          .admin-primary-button,
          .admin-ghost-button,
          .admin-danger-button,
          .admin-recent-searches button,
          .admin-status-chip {
            width: 100%;
          }

          .admin-panel-icon {
            width: 46px;
            height: 46px;
          }
        }
      `}</style>
    </main>
  );
}
