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

export default function BugReportPage() {
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
      console.error('Error loading bug reports:', error.message);
      setBugReports([]);
    } else {
      setBugReports((data || []) as BugReport[]);
    }

    setLoadingReports(false);
  };

  const submitBug = async () => {
    if (!title.trim()) {
      alert('Please enter a short title.');
      return;
    }

    if (!description.trim()) {
      alert('Please describe what happened.');
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        alert('You need to sign in before submitting feedback.');
        return;
      }

      const { error } = await supabase.from('bug_reports').insert({
        user_id: userId,
        title: title.trim(),
        severity,
        description: description.trim(),
        steps_to_reproduce: steps.trim(),
        page_url: pageUrl.trim(),
        status: 'new',
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      alert('Thank you. Your feedback has been sent to the FromOne team.');

      setTitle('');
      setSeverity('Medium');
      setDescription('');
      setSteps('');
      setPageUrl('');

      if (isAdmin) {
        await loadBugReports();
      }
    } catch (error: any) {
      alert(error?.message || 'Error submitting feedback.');
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

    const confirmed = confirm(`Delete this feedback report?\n\n${report.title}`);

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
        <div className="page-eyebrow">FromOne Feedback</div>
        <h1 className="page-title">Tell us if something does not work as expected.</h1>
        <p className="page-description">
          Use this page to let us know if something looks wrong, does not work, or feels
          confusing. Your feedback helps us improve FromOne.
        </p>
      </div>

      <div className="grid grid-two">
        <section className="premium-card">
          <div className="page-eyebrow">Feedback Details</div>

          <label>
            <strong>Short title</strong>
          </label>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Generate button did not work"
          />

          <label>
            <strong>How serious is it?</strong>
          </label>
          <select
            className="input"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
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
            placeholder="Tell us what went wrong or what did not make sense."
            rows={6}
          />

          <label>
            <strong>What were you trying to do?</strong>
          </label>
          <textarea
            className="input"
            value={steps}
            onChange={(event) => setSteps(event.target.value)}
            placeholder="Example: I clicked Generate Campaign, waited a few seconds, then saw an error message."
            rows={6}
          />

          <button onClick={submitBug} disabled={saving}>
            {saving ? 'Sending...' : 'Send Feedback'}
          </button>
        </section>

        <section className="hero-card">
          <div className="page-eyebrow">Help Us Improve</div>
          <h2 style={{ marginTop: 0, fontSize: '34px' }}>
            Spotted something that does not look right?
          </h2>
          <p>
            Tell us what you were trying to do and what happened. Your feedback helps us
            improve FromOne and make it easier to use.
          </p>

          <div className="grid" style={{ marginTop: '22px' }}>
            <div className="card">
              <strong>What to include</strong>
              <p>
                Tell us which page you were on, what you clicked, and what happened next.
              </p>
            </div>

            <div className="card">
              <strong>Helpful example</strong>
              <p>
                “I clicked Generate Campaign, waited a few seconds, then saw an error
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
              <h2>Feedback inbox</h2>
              <p>
                Review submitted feedback, update its status, and remove reports when they
                are no longer needed.
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
              <option value="all">All reports</option>
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
            <p>Loading feedback...</p>
          ) : filteredBugReports.length === 0 ? (
            <div className="bug-admin-empty">
              <strong>No feedback found.</strong>
              <p>Feedback submitted by users will appear here.</p>
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