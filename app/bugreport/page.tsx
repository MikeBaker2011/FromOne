'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = 'mikeb33@hotmail.co.uk';

type BugReport = {
  id: string;
  user_id: string | null;
  title: string;
  severity: string;
  description: string;
  steps_to_reproduce: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
};

const supportTypes = [
  'Question',
  'Something not working',
  'Improvement idea',
  'Billing help',
  'Other',
];

const urgencyOptions = ['Low', 'Medium', 'High', 'Critical'];

export default function SupportPage() {
  const [requestType, setRequestType] = useState('Question');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    checkAdminAndLoadReports();

    if (typeof window !== 'undefined') {
      setPageUrl(window.location.pathname);
    }
  }, []);

  const checkAdminAndLoadReports = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const admin = authData.user?.email === ADMIN_EMAIL;

    setIsAdmin(admin);

    if (admin) {
      await loadBugReports();
    }
  };

  const loadBugReports = async () => {
    setLoadingReports(true);

    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading support requests:', error.message);
      setBugReports([]);
    } else {
      setBugReports((data || []) as BugReport[]);
    }

    setLoadingReports(false);
  };

  const buildSupportTitle = () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) return '';

    return `[${requestType}] ${cleanTitle}`;
  };

  const submitSupportRequest = async () => {
    const supportTitle = buildSupportTitle();

    if (!title.trim()) {
      alert('Please enter a short title.');
      return;
    }

    if (!description.trim()) {
      alert('Please tell us what you need help with.');
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        alert('You need to sign in before sending a support request.');
        return;
      }

      const { error } = await supabase.from('bug_reports').insert({
        user_id: userId,
        title: supportTitle,
        severity,
        description: description.trim(),
        steps_to_reproduce: steps.trim() || null,
        page_url: pageUrl.trim() || null,
        status: 'new',
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      alert('Thank you. Your support request has been sent.');

      setRequestType('Question');
      setTitle('');
      setSeverity('Medium');
      setDescription('');
      setSteps('');

      if (typeof window !== 'undefined') {
        setPageUrl(window.location.pathname);
      }

      if (isAdmin) {
        await loadBugReports();
      }
    } catch (error: any) {
      alert(error?.message || 'Error sending support request.');
    } finally {
      setSaving(false);
    }
  };

  const updateBugStatus = async (reportId: string, nextStatus: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('bug_reports')
      .update({
        status: nextStatus,
      })
      .eq('id', reportId);

    if (error) {
      alert(error.message);
      return;
    }

    setBugReports((currentReports) =>
      currentReports.map((report) =>
        report.id === reportId ? { ...report, status: nextStatus } : report
      )
    );
  };

  const deleteBugReport = async (report: BugReport) => {
    if (!isAdmin) return;

    const confirmed = confirm(`Delete this support request?\n\n${report.title}`);

    if (!confirmed) return;

    const { error } = await supabase.from('bug_reports').delete().eq('id', report.id);

    if (error) {
      alert(error.message);
      return;
    }

    setBugReports((currentReports) =>
      currentReports.filter((item) => item.id !== report.id)
    );
  };

  const filteredBugReports = useMemo(() => {
    if (statusFilter === 'all') return bugReports;

    return bugReports.filter((report) => report.status === statusFilter);
  }, [bugReports, statusFilter]);

  const newReportsCount = bugReports.filter((report) => report.status === 'new').length;

  const openReportsCount = bugReports.filter((report) =>
    ['new', 'reviewing', 'in_progress'].includes(report.status)
  ).length;

  return (
    <main className="fromone-help-page help-create-style-page" data-help-page="create-style-v1">
      <section id="fromone-standard-shell" className="help-create-style-card">
        <header className="help-create-hero">
          <div className="help-eyebrow">Help</div>
          <h1>
            Need help?
            <br />
            Keep it simple.
          </h1>
          <p>
            Send a quick message. Tell us what you were trying to do and what happened.
          </p>
        </header>

        <section className="help-panel">
          <div className="help-panel-head">
            <div>
              <div className="help-eyebrow">Support request</div>
              <h2>Tell us what happened.</h2>
              <p>Use this if something is confusing, broken, or you need a hand.</p>
            </div>
          </div>

          <div className="help-form-grid">
            <label>
              <strong>Type of help</strong>
              <select
                className="help-input"
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
              >
                {supportTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <strong>Urgency</strong>
              <select
                className="help-input"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
              >
                {urgencyOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="help-wide-field">
              <strong>Short title</strong>
              <input
                className="help-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: I cannot create posts"
              />
            </label>

            <label className="help-wide-field">
              <strong>Page</strong>
              <input
                className="help-input"
                value={pageUrl}
                onChange={(event) => setPageUrl(event.target.value)}
                placeholder="Example: Dashboard, Posts, Settings"
              />
            </label>

            <label className="help-wide-field">
              <strong>What happened?</strong>
              <textarea
                className="help-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell us what went wrong, what confused you, or what you need help with."
                rows={5}
              />
            </label>

            <label className="help-wide-field">
              <strong>What were you trying to do?</strong>
              <textarea
                className="help-input"
                value={steps}
                onChange={(event) => setSteps(event.target.value)}
                placeholder="Example: I clicked Create drafts for review, waited, then saw an error."
                rows={4}
              />
            </label>
          </div>

          <button
            type="button"
            className="help-primary-action"
            onClick={submitSupportRequest}
            disabled={saving}
          >
            {saving ? 'Sending...' : 'Send support request'}
          </button>

          <p className="help-note">Nothing is published from this page.</p>
        </section>

        <p className="help-outside-note">
          Helpful detail: which page you were on, what you clicked, and what happened next.
        </p>
      </section>

      {isAdmin && (
        <section className="help-create-style-card help-admin-card">
          <div className="help-admin-head">
            <div>
              <div className="help-eyebrow">Admin only</div>
              <h2>Support inbox</h2>
              <p>Review submitted support requests and update their status.</p>
            </div>

            <div className="help-admin-stats">
              <span><strong>{newReportsCount}</strong> New</span>
              <span><strong>{openReportsCount}</strong> Open</span>
              <span><strong>{bugReports.length}</strong> Total</span>
            </div>
          </div>

          <div className="help-admin-controls">
            <select
              className="help-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All requests</option>
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <button type="button" className="help-secondary-action" onClick={loadBugReports}>
              Refresh
            </button>
          </div>

          {loadingReports ? (
            <p className="help-note">Loading support requests...</p>
          ) : filteredBugReports.length === 0 ? (
            <div className="help-admin-empty">
              <strong>No support requests found.</strong>
              <p>Support requests submitted by users will appear here.</p>
            </div>
          ) : (
            <div className="help-report-list">
              {filteredBugReports.map((report) => (
                <article key={report.id} className="help-report-item">
                  <div className="help-report-top">
                    <div>
                      <span>{report.severity}</span>
                      <span>{report.status}</span>
                    </div>
                    <small>
                      {new Date(report.created_at).toLocaleString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </div>

                  <h3>{report.title}</h3>
                  {report.page_url && <p><strong>Page:</strong> {report.page_url}</p>}
                  <p>{report.description}</p>

                  {report.steps_to_reproduce && (
                    <div className="help-report-steps">
                      <strong>User was trying to do</strong>
                      <p>{report.steps_to_reproduce}</p>
                    </div>
                  )}

                  <div className="help-report-actions">
                    <button type="button" onClick={() => updateBugStatus(report.id, 'reviewing')}>
                      Reviewing
                    </button>
                    <button type="button" onClick={() => updateBugStatus(report.id, 'in_progress')}>
                      In progress
                    </button>
                    <button type="button" onClick={() => updateBugStatus(report.id, 'resolved')}>
                      Resolved
                    </button>
                    <button type="button" onClick={() => deleteBugReport(report)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <style jsx global>{`
        /* -------------------------------------------------------------- */
        /* FROMONE HELP PAGE — CLEAN APPROVED STANDARD                     */
        /* Desktop gap: main-content 38px + shell margin-top 28px          */
        /* Mobile gap: page padding-top 24px, shell margin-top 0           */
        /* -------------------------------------------------------------- */
        body:has(.fromone-help-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-help-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-help-page) .app-shell,
        body:has(.fromone-help-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-help-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-help-page.help-create-style-page {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 16px 72px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
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
        }

        .fromone-help-page #fromone-standard-shell.help-create-style-card,
        .fromone-help-page .help-admin-card {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          padding: clamp(30px, 4vw, 48px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
          color: #071b49 !important;
          backdrop-filter: none !important;
        }

        .fromone-help-page #fromone-standard-shell.help-create-style-card {
          min-height: 620px !important;
          margin: 28px auto 0 !important;
        }

        .fromone-help-page .help-admin-card {
          margin: 22px auto 0 !important;
        }

        .fromone-help-page .help-create-hero {
          width: 100% !important;
          max-width: 760px !important;
          margin: 0 0 26px !important;
          padding: 0 !important;
          text-align: left !important;
        }

        .fromone-help-page .help-eyebrow {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-help-page .help-create-hero h1 {
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

        .fromone-help-page .help-create-hero p,
        .fromone-help-page .help-panel p,
        .fromone-help-page .help-admin-card p {
          max-width: 720px !important;
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
          text-align: left !important;
        }

        .fromone-help-page .help-panel {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: clamp(20px, 3vw, 30px) !important;
          box-sizing: border-box !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #f7f9fd !important;
        }

        .fromone-help-page .help-panel-head,
        .fromone-help-page .help-admin-head {
          display: block !important;
          margin-bottom: 18px !important;
        }

        .fromone-help-page .help-panel h2,
        .fromone-help-page .help-admin-card h2 {
          margin: 8px 0 8px !important;
          color: #071b49 !important;
          font-size: clamp(1.55rem, 3vw, 2.05rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
          font-weight: 800 !important;
        }

        .fromone-help-page .help-form-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        .fromone-help-page .help-form-grid label {
          display: grid !important;
          gap: 8px !important;
        }

        .fromone-help-page .help-form-grid label strong {
          color: #071b49 !important;
          font-size: 0.8rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.045em !important;
        }

        .fromone-help-page .help-wide-field {
          grid-column: 1 / -1 !important;
        }

        .fromone-help-page .help-input {
          width: 100% !important;
          max-width: 100% !important;
          min-height: 52px !important;
          padding: 12px 15px !important;
          border: 1px solid #d7e0ee !important;
          border-radius: 16px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          box-sizing: border-box !important;
          font: inherit !important;
          font-size: 0.98rem !important;
          font-weight: 500 !important;
          outline: none !important;
        }

        .fromone-help-page textarea.help-input {
          min-height: 96px !important;
          resize: vertical !important;
        }

        .fromone-help-page .help-input:focus {
          border-color: #f72585 !important;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.11) !important;
        }

        .fromone-help-page .help-primary-action {
          width: 100% !important;
          min-height: 58px !important;
          margin-top: 16px !important;
          padding: 0 24px !important;
          border: 1px solid #f72585 !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          box-shadow: 0 18px 38px rgba(247, 37, 133, 0.24) !important;
          font: inherit !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .fromone-help-page .help-secondary-action,
        .fromone-help-page .help-report-actions button {
          min-height: 52px !important;
          padding: 0 22px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          font: inherit !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .fromone-help-page .help-primary-action:disabled {
          cursor: not-allowed !important;
          opacity: 0.65 !important;
        }

        .fromone-help-page .help-note,
        .fromone-help-page .help-outside-note {
          color: #626b80 !important;
          font-size: 0.95rem !important;
          line-height: 1.45 !important;
          font-weight: 600 !important;
          text-align: center !important;
        }

        .fromone-help-page .help-note {
          margin: 12px 0 0 !important;
        }

        .fromone-help-page .help-outside-note {
          max-width: 620px !important;
          margin: 16px auto 0 !important;
        }

        .fromone-help-page .help-admin-stats,
        .fromone-help-page .help-admin-controls,
        .fromone-help-page .help-report-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
        }

        .fromone-help-page .help-admin-stats span,
        .fromone-help-page .help-report-top span {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 999px !important;
          background: #fff8fc !important;
          color: #071b49 !important;
          font-weight: 800 !important;
        }

        .fromone-help-page .help-admin-stats span {
          min-height: 42px !important;
          gap: 7px !important;
          padding: 8px 13px !important;
        }

        .fromone-help-page .help-admin-controls {
          margin-bottom: 16px !important;
        }

        .fromone-help-page .help-report-list {
          display: grid !important;
          gap: 12px !important;
        }

        .fromone-help-page .help-report-item,
        .fromone-help-page .help-admin-empty {
          padding: 16px !important;
          border: 1px solid #dfe7f2 !important;
          border-radius: 20px !important;
          background: #ffffff !important;
        }

        .fromone-help-page .help-report-top {
          display: flex !important;
          gap: 12px !important;
          justify-content: space-between !important;
        }

        .fromone-help-page .help-report-top div {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
        }

        .fromone-help-page .help-report-top span {
          padding: 7px 10px !important;
          font-size: 0.76rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.04em !important;
        }

        .fromone-help-page .help-report-top small {
          color: #6b7280 !important;
          font-size: 0.82rem !important;
          font-weight: 600 !important;
        }

        .fromone-help-page .help-report-item h3 {
          margin: 12px 0 8px !important;
          color: #071b49 !important;
          font-size: 1.2rem !important;
          font-weight: 800 !important;
          letter-spacing: -0.025em !important;
        }

        .fromone-help-page .help-report-steps {
          margin: 12px 0 !important;
          padding: 12px !important;
          border-radius: 16px !important;
          background: #f5f7fb !important;
        }

        @media (max-width: 760px) {
          body:has(.fromone-help-page) .main-content {
            padding-top: 0 !important;
          }

          .fromone-help-page.help-create-style-page {
            padding: 24px 16px 112px !important;
          }

          .fromone-help-page #fromone-standard-shell.help-create-style-card,
          .fromone-help-page .help-admin-card {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            margin-top: 0 !important;
            padding: 22px !important;
            border-radius: 26px !important;
          }

          .fromone-help-page .help-create-hero h1 {
            font-size: clamp(2.35rem, 10vw, 3.25rem) !important;
            line-height: 0.96 !important;
          }

          .fromone-help-page .help-create-hero p,
          .fromone-help-page .help-panel p,
          .fromone-help-page .help-admin-card p {
            font-size: 0.96rem !important;
          }

          .fromone-help-page .help-form-grid,
          .fromone-help-page .help-admin-head {
            grid-template-columns: 1fr !important;
            display: grid !important;
          }

          .fromone-help-page .help-panel {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .fromone-help-page .help-panel h2,
          .fromone-help-page .help-admin-card h2 {
            font-size: 1.55rem !important;
          }

          .fromone-help-page .help-admin-controls .help-input,
          .fromone-help-page .help-secondary-action {
            width: 100% !important;
          }

          .fromone-help-page .help-report-top {
            display: grid !important;
          }
        }

        /* -------------------------------------------------------------- */
        /* BUG REPORTS MOBILE POLISH — match Posts/Dashboard feel          */
        /* Desktop unchanged                                              */
        /* -------------------------------------------------------------- */
        @media (max-width: 760px) {
          body:has(.fromone-help-page) .main-content {
            padding-top: 0 !important;
          }

          .fromone-help-page.help-create-style-page {
            padding: 24px 16px 112px !important;
          }

          .fromone-help-page #fromone-standard-shell.help-create-style-card,
          .fromone-help-page .help-admin-card {
            width: calc(100% - 32px) !important;
            max-width: 500px !important;
            min-height: auto !important;
            margin: 0 auto !important;
            padding: 28px 26px 26px !important;
            border-radius: 26px !important;
          }

          .fromone-help-page .help-create-hero {
            margin-bottom: 32px !important;
          }

          .fromone-help-page .help-create-hero h1 {
            margin: 14px 0 18px !important;
            font-size: clamp(2.75rem, 11vw, 3.6rem) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.058em !important;
          }

          .fromone-help-page .help-create-hero p {
            font-size: 1rem !important;
            line-height: 1.45 !important;
          }

          .fromone-help-page .help-panel {
            margin-top: 0 !important;
            padding: 22px !important;
            border-radius: 24px !important;
          }

          .fromone-help-page .help-panel-head {
            margin-bottom: 22px !important;
          }

          .fromone-help-page .help-panel h2 {
            font-size: clamp(1.75rem, 7vw, 2.15rem) !important;
            line-height: 0.98 !important;
          }

          .fromone-help-page .help-form-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .fromone-help-page .help-primary-action {
            min-height: 58px !important;
            margin-top: 18px !important;
          }
        }

        @media (max-width: 420px) {
          .fromone-help-page.help-create-style-page {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .fromone-help-page #fromone-standard-shell.help-create-style-card,
          .fromone-help-page .help-admin-card {
            width: calc(100% - 18px) !important;
            padding: 26px 22px 24px !important;
          }
        }

      `}</style>
    </main>
  );
}
