'use client';

import './admin.css';

import { useEffect, useState } from 'react';
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

export default function AdminPage() {
  const { showToast } = useToast();

  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [emailQuery, setEmailQuery] = useState('');
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [confirmExpireCustomer, setConfirmExpireCustomer] = useState<AdminCustomer | null>(null);
  const [adminNotesByUserId, setAdminNotesByUserId] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data.user?.email || null);
    });
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
    const nextNotes: Record<string, string> = {};

    for (const customer of items) {
      nextNotes[customer.id] = String(customer.access?.admin_notes || '');
    }

    setAdminNotesByUserId(nextNotes);
  };

  const searchCustomer = async () => {
    const cleanEmail = emailQuery.trim();

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
    } catch (error: any) {
      notify(error?.message || 'Could not search customers.', 'error');
    } finally {
      setLoading(false);
    }
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
      await searchCustomer();
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

  return (
    <main className="admin-page">
      <div className="page-header admin-header">
        <div className="page-eyebrow">Admin support</div>
        <h1 className="page-title">Customer access panel</h1>
        <p className="page-description">
          Search customers, check billing/access, extend beta access, clear pending payments,
          activate manually, or expire access without using SQL.
        </p>

        <p className="admin-signed-in">
          Signed in as <strong>{adminEmail || 'checking session...'}</strong>
        </p>
      </div>

      <section className="premium-card admin-search-card">
        <div>
          <div className="page-eyebrow">Find customer</div>
          <h2>Search by email.</h2>
          <p>
            Use the full email or part of it. Admin access is restricted server-side to the owner
            account only.
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
          <button type="button" onClick={searchCustomer} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </section>

      <section className="admin-results">
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

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => copySupportSummary(customer)}
                >
                  Copy summary
                </button>
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
                  className="secondary-button"
                  onClick={() => runAction(customer.id, 'manual_active')}
                  disabled={busy || (isActive && !isOwnerUnlimited)}
                  title={isActive && !isOwnerUnlimited ? 'Customer is already active.' : undefined}
                >
                  Activate manually
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
