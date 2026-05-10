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
      alert('Please describe the issue.');
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        alert('You need to sign in before submitting a bug report.');
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

      alert('Bug report submitted. Thank you — the FromOne team will review it.');

      setTitle('');
      setSeverity('Medium');
      setDescription('');
      setSteps('');
      setPageUrl('');

      if (isAdmin) {
        await loadBugReports();
      }
    } catch (error: any) {
      alert(error?.message || 'Error submitting bug report.');
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

    const confirmed = confirm(`Delete this bug report?\n\n${report.title}`);

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
        <div className="page-eyebrow">FromOne Bug Report</div>
        <h1 className="page-title">Report something that needs fixing.</h1>
        <p className="page-description">
          Use this page to send feedback during testing. Reports are saved securely and
          reviewed by the FromOne team.
        </p>
      </div>

      <div className="grid grid-two">
        <section className="premium-card">
          <div className="page-eyebrow">Issue Details</div>

          <label>
            <strong>Issue title</strong>
          </label>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Generate button does nothing"
          />

          <label>
            <strong>Severity</strong>
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
            <strong>Page or URL</strong>
          </label>
          <input
            className="input"
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
            placeholder="Example: /dashboard"
          />

          <label>
            <strong>What happened?</strong>
          </label>
          <textarea
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue clearly."
            rows={6}
          />

          <label>
            <strong>Steps to reproduce</strong>
          </label>
          <textarea
            className="input"
            value={steps}
            onChange={(event) => setSteps(event.target.value)}
            placeholder="Example: 1. Go to Dashboard 2. Click Generate 3. Error appears"
            rows={6}
          />

          <button onClick={submitBug} disabled={saving}>
            {saving ? 'Sending...' : 'Submit Bug Report'}
          </button>
        </section>

        <section className="hero-card">
          <div className="page-eyebrow">Testing Notes</div>
          <h2 style={{ marginTop: 0, fontSize: '34px' }}>
            Useful bug reports make the MVP faster to finish.
          </h2>
          <p>
            Try to include the page, what you clicked, what you expected, and what
            actually happened.
          </p>

          <div className="grid" style={{ marginTop: '22px' }}>
            <div className="card">
              <strong>Good report</strong>
              <p>
                “On Dashboard, I clicked Generate Week of Posts. It loaded for 10 seconds,
                then showed an error.”
              </p>
            </div>

            <div className="card">
              <strong>Better report</strong>
              <p>
                “I was signed in, had a business profile saved, selected OpenAI, and the
                error appeared after clicking Generate.”
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
              <h2>Bug report inbox</h2>
              <p>
                Review submitted issues, update their status, and remove reports when they
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
            <p>Loading bug reports...</p>
          ) : filteredBugReports.length === 0 ? (
            <div className="bug-admin-empty">
              <strong>No bug reports found.</strong>
              <p>Reports submitted by testers will appear here.</p>
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
                      <strong>Steps to reproduce</strong>
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