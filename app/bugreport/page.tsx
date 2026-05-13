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
    <>
      <div className="page-header">
        <div className="page-eyebrow">FromOne Support</div>
        <h1 className="page-title">How can we help?</h1>
        <p className="page-description">
          Send a quick message if something is not working, confusing, or you need help using
          FromOne.
        </p>
      </div>

      <div className="grid grid-two">
        <section className="premium-card">
          <div className="page-eyebrow">Support Request</div>
          <h2 style={{ marginTop: 0 }}>Tell us what you need.</h2>
          <p>
            Keep it simple. Tell us what you were trying to do and what happened, and we will
            review it.
          </p>

          <label>
            <strong>What type of help do you need?</strong>
          </label>
          <select
            className="input"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
          >
            {supportTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label>
            <strong>Short title</strong>
          </label>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: I cannot create weekly posts"
          />

          <label>
            <strong>How urgent is it?</strong>
          </label>
          <select
            className="input"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {urgencyOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label>
            <strong>Which page were you on?</strong>
          </label>
          <input
            className="input"
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
            placeholder="Example: Dashboard, Posts, Settings"
          />

          <label>
            <strong>What happened?</strong>
          </label>
          <textarea
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tell us what went wrong, what confused you, or what you need help with."
            rows={6}
          />

          <label>
            <strong>What were you trying to do?</strong>
          </label>
          <textarea
            className="input"
            value={steps}
            onChange={(event) => setSteps(event.target.value)}
            placeholder="Example: I clicked Create Weekly Posts, waited a few seconds, then saw an error message."
            rows={6}
          />

          <button onClick={submitSupportRequest} disabled={saving}>
            {saving ? 'Sending...' : 'Send Support Request'}
          </button>
        </section>

        <section className="hero-card">
          <div className="page-eyebrow">Support</div>
          <h2 style={{ marginTop: 0, fontSize: '34px' }}>
            We want FromOne to feel simple.
          </h2>
          <p>
            If something feels unclear, slow, broken, or difficult to use, send it here. This
            helps us improve the product and support you properly.
          </p>

          <div className="grid" style={{ marginTop: '22px' }}>
            <div className="card">
              <strong>What to include</strong>
              <p>Tell us which page you were on, what you clicked, and what happened next.</p>
            </div>

            <div className="card">
              <strong>Helpful example</strong>
              <p>
                “I clicked Create Weekly Posts, waited a few seconds, then saw an error
                message.”
              </p>
            </div>
          </div>
        </section>
      </div>

      {isAdmin && (
        <section className="premium-card bug-admin-card">
          <div className="bug-admin-header">
            <div>
              <div className="page-eyebrow">Admin Only</div>
              <h2>Support inbox</h2>
              <p>
                Review submitted support requests, update their status, and remove reports
                when they are no longer needed.
              </p>
            </div>

            <div className="bug-admin-stats">
              <span>
                <strong>{newReportsCount}</strong>
                New
              </span>
              <span>
                <strong>{openReportsCount}</strong>
                Open
              </span>
              <span>
                <strong>{bugReports.length}</strong>
                Total
              </span>
            </div>
          </div>

          <div className="bug-admin-controls">
            <select
              className="input"
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

            <button className="secondary-button" onClick={loadBugReports}>
              Refresh
            </button>
          </div>

          {loadingReports ? (
            <p>Loading support requests...</p>
          ) : filteredBugReports.length === 0 ? (
            <div className="bug-admin-empty">
              <strong>No support requests found.</strong>
              <p>Support requests submitted by users will appear here.</p>
            </div>
          ) : (
            <div className="bug-report-list">
              {filteredBugReports.map((report) => (
                <article key={report.id} className="bug-report-item">
                  <div className="bug-report-top">
                    <div>
                      <span
                        className={`bug-severity bug-severity-${report.severity.toLowerCase()}`}
                      >
                        {report.severity}
                      </span>
                      <span className="bug-status">{report.status}</span>
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

                  {report.page_url && (
                    <p className="bug-report-url">
                      <strong>Page:</strong> {report.page_url}
                    </p>
                  )}

                  <p>{report.description}</p>

                  {report.steps_to_reproduce && (
                    <div className="bug-report-steps">
                      <strong>User was trying to do</strong>
                      <p>{report.steps_to_reproduce}</p>
                    </div>
                  )}

                  {report.user_id && (
                    <small className="bug-report-user">User ID: {report.user_id}</small>
                  )}

                  <div className="bug-report-actions">
                    <button
                      className="secondary-button"
                      onClick={() => updateBugStatus(report.id, 'reviewing')}
                    >
                      Reviewing
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => updateBugStatus(report.id, 'in_progress')}
                    >
                      In progress
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => updateBugStatus(report.id, 'resolved')}
                    >
                      Resolved
                    </button>

                    <button
                      className="secondary-button danger-button"
                      onClick={() => deleteBugReport(report)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}