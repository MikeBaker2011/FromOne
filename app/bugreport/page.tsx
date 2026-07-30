'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
    <main className="supportHubPage">
      <section className="supportHubContainer">
        <header className="supportHubHeader">
          <Link href="/dashboard" className="supportHubBackLink">
            <span aria-hidden="true">←</span>
            Back to dashboard
          </Link>

          <span className="supportHubEyebrow">FromOne support</span>
          <h1>Support hub.</h1>
          <p>
            Ask a question, report a problem, get billing help or send an
            improvement idea from one simple place.
          </p>
        </header>

        <section className="supportHubStatusCard">
          <div>
            <span className="supportHubEyebrow">Your support</span>
            <h2>Need a hand?</h2>
            <strong>Send us the details below</strong>
          </div>

          <a href="mailto:info@fromone.co.uk">Email support</a>
        </section>

        <section className="supportHubSectionCard">
          <div className="supportHubSectionHeading">
            <span>01</span>
            <div>
              <h2>Send a support request</h2>
              <p>Tell us what happened and what you were trying to do.</p>
            </div>
          </div>

          <div className="supportHubFormCard">
            <div className="supportHubFormGrid">
              <label>
                <strong>Type of help</strong>
                <select
                  className="supportHubInput"
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
                  className="supportHubInput"
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

              <label className="supportHubWideField">
                <strong>Short title</strong>
                <input
                  className="supportHubInput"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: I cannot create posts"
                />
              </label>

              <label className="supportHubWideField">
                <strong>Page</strong>
                <input
                  className="supportHubInput"
                  value={pageUrl}
                  onChange={(event) => setPageUrl(event.target.value)}
                  placeholder="Example: Dashboard, Posts, Settings"
                />
              </label>

              <label className="supportHubWideField">
                <strong>What happened?</strong>
                <textarea
                  className="supportHubInput"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Tell us what went wrong, what confused you, or what you need help with."
                  rows={5}
                />
              </label>

              <label className="supportHubWideField">
                <strong>What were you trying to do?</strong>
                <textarea
                  className="supportHubInput"
                  value={steps}
                  onChange={(event) => setSteps(event.target.value)}
                  placeholder="Example: I clicked Create drafts for review, waited, then saw an error."
                  rows={4}
                />
              </label>
            </div>

            <button
              type="button"
              className="supportHubPrimaryAction"
              onClick={submitSupportRequest}
              disabled={saving}
            >
              {saving ? "Sending..." : "Send support request"}
            </button>

            <p className="supportHubNote">Nothing is published from this page.</p>
          </div>
        </section>

        {isAdmin && (
          <section className="supportHubSectionCard supportHubAdminSection">
            <div className="supportHubSectionHeading">
              <span>02</span>
              <div>
                <h2>Support inbox</h2>
                <p>Review submitted requests and update their status.</p>
              </div>
            </div>

            <div className="supportHubAdminToolbar">
              <div className="supportHubStats">
                <span><strong>{newReportsCount}</strong> New</span>
                <span><strong>{openReportsCount}</strong> Open</span>
                <span><strong>{bugReports.length}</strong> Total</span>
              </div>

              <div className="supportHubAdminControls">
                <select
                  className="supportHubInput"
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

                <button type="button" onClick={loadBugReports}>
                  Refresh
                </button>
              </div>
            </div>

            {loadingReports ? (
              <p className="supportHubNote">Loading support requests...</p>
            ) : filteredBugReports.length === 0 ? (
              <div className="supportHubEmpty">
                <strong>No support requests found.</strong>
                <p>Support requests submitted by users will appear here.</p>
              </div>
            ) : (
              <div className="supportHubReportList">
                {filteredBugReports.map((report) => (
                  <article key={report.id} className="supportHubReportItem">
                    <div className="supportHubReportTop">
                      <div>
                        <span>{report.severity}</span>
                        <span>{report.status}</span>
                      </div>

                      <small>
                        {new Date(report.created_at).toLocaleString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </div>

                    <h3>{report.title}</h3>
                    {report.page_url && (
                      <p>
                        <strong>Page:</strong> {report.page_url}
                      </p>
                    )}
                    <p>{report.description}</p>

                    {report.steps_to_reproduce && (
                      <div className="supportHubReportSteps">
                        <strong>User was trying to do</strong>
                        <p>{report.steps_to_reproduce}</p>
                      </div>
                    )}

                    <div className="supportHubReportActions">
                      <button type="button" onClick={() => updateBugStatus(report.id, "reviewing")}>
                        Reviewing
                      </button>
                      <button type="button" onClick={() => updateBugStatus(report.id, "in_progress")}>
                        In progress
                      </button>
                      <button type="button" onClick={() => updateBugStatus(report.id, "resolved")}>
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
      </section>

      <style jsx global>{`
        body:has(.supportHubPage),
        body:has(.supportHubPage) .app-shell,
        body:has(.supportHubPage) .main-content,
        body:has(.supportHubPage) .main-content.fromone-mobile-bottom-safe,
        body:has(.supportHubPage) .fromone-universal-mobile-page-frame,
        .supportHubPage {
          background: #f4f7fb !important;
          background-color: #f4f7fb !important;
          background-image: none !important;
          color: #071b49;
        }

        body:has(.supportHubPage)::before,
        body:has(.supportHubPage)::after,
        body:has(.supportHubPage) .app-shell::before,
        body:has(.supportHubPage) .app-shell::after,
        body:has(.supportHubPage) .main-content::before,
        body:has(.supportHubPage) .main-content::after,
        body:has(.supportHubPage) .fromone-universal-mobile-page-frame::before,
        body:has(.supportHubPage) .fromone-universal-mobile-page-frame::after,
        .supportHubPage::before,
        .supportHubPage::after {
          display: none !important;
          content: none !important;
          background: none !important;
          background-image: none !important;
        }

        body:has(.supportHubPage) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
        }

        .supportHubPage {
          width: 100%;
          min-height: 100vh;
        }

        .supportHubContainer {
          width: min(100%, 1240px);
          margin: 0 auto;
          padding: 8px 0 72px;
          box-sizing: border-box;
        }

        .supportHubHeader {
          margin-bottom: 34px;
        }

        .supportHubBackLink {
          width: fit-content;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
          padding: 0 15px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49 !important;
          font-size: 0.84rem;
          font-weight: 850;
          text-decoration: none;
          box-shadow: 0 8px 20px rgba(7, 27, 73, 0.05);
        }

        .supportHubBackLink:hover {
          border-color: rgba(247, 37, 133, 0.28);
          color: #f72585 !important;
        }

        .supportHubEyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .supportHubHeader h1 {
          margin: 0;
          font-size: clamp(3rem, 6vw, 5.5rem);
          line-height: 0.94;
          letter-spacing: -0.065em;
        }

        .supportHubHeader p {
          max-width: 850px;
          margin: 16px 0 0;
          color: #5f6d86;
          font-size: clamp(1rem, 1.8vw, 1.18rem);
          font-weight: 650;
          line-height: 1.65;
        }

        .supportHubStatusCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          padding: 28px 0 34px;
          border-bottom: 1px solid #dfe5f1;
          background: transparent;
        }

        .supportHubStatusCard h2 {
          margin: 0 0 6px;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .supportHubStatusCard strong {
          color: #0a9b5c;
          font-size: 1rem;
        }

        .supportHubStatusCard a {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff !important;
          font-size: 0.84rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 12px 28px rgba(247, 37, 133, 0.2);
        }

        .supportHubSectionCard {
          margin-top: 0;
          padding: 42px 0 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .supportHubSectionHeading {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 24px;
        }

        .supportHubSectionHeading > span {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #f72585;
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 950;
        }

        .supportHubSectionHeading h2 {
          margin: 0;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .supportHubSectionHeading p {
          margin: 8px 0 0;
          color: #5f6d86;
          font-size: 1rem;
          font-weight: 650;
        }

        .supportHubFormCard {
          padding: clamp(24px, 4vw, 38px);
          border: 1px solid #dfe5f1;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 14px 38px rgba(7, 27, 73, 0.05);
        }

        .supportHubFormGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .supportHubFormGrid label {
          display: grid;
          gap: 8px;
        }

        .supportHubFormGrid label strong {
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .supportHubWideField {
          grid-column: 1 / -1;
        }

        .supportHubInput {
          width: 100%;
          min-height: 54px;
          padding: 13px 15px;
          border: 1px solid #d9e1ee;
          border-radius: 14px;
          background: #ffffff;
          color: #071b49;
          box-sizing: border-box;
          font: inherit;
          outline: none;
        }

        textarea.supportHubInput {
          min-height: 130px;
          resize: vertical;
        }

        .supportHubInput:focus {
          border-color: #f72585;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.1);
        }

        .supportHubPrimaryAction {
          width: 100%;
          min-height: 54px;
          margin-top: 20px;
          border: 0;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.2);
          font: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .supportHubPrimaryAction:disabled {
          opacity: 0.65;
        }

        .supportHubNote {
          margin: 12px 0 0;
          color: #6b7890;
          font-size: 0.84rem;
          text-align: center;
        }

        .supportHubAdminSection {
          margin-top: 48px;
          padding-top: 42px;
          border-top: 1px solid #dfe5f1;
        }

        .supportHubAdminToolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .supportHubStats,
        .supportHubAdminControls,
        .supportHubReportActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .supportHubStats span,
        .supportHubReportTop span {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          border: 1px solid #ffd2e5;
          border-radius: 999px;
          background: #fff7fb;
          font-size: 0.75rem;
          font-weight: 850;
        }

        .supportHubAdminControls button,
        .supportHubReportActions button {
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid #d9e1ee;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 850;
          cursor: pointer;
        }

        .supportHubReportList {
          display: grid;
          gap: 12px;
        }

        .supportHubReportItem,
        .supportHubEmpty {
          padding: 20px;
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
        }

        .supportHubReportTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .supportHubReportTop > div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .supportHubReportItem h3 {
          margin: 14px 0 8px;
        }

        .supportHubReportItem p,
        .supportHubEmpty p {
          color: #6b7890;
          line-height: 1.55;
        }

        .supportHubReportSteps {
          margin: 12px 0;
          padding: 13px;
          border-radius: 15px;
          background: #f8fafc;
        }

        @media (max-width: 760px) {
          .supportHubContainer {
            width: 100%;
            padding: 0 0 42px;
          }

          .supportHubHeader {
            margin-bottom: 22px;
          }

          .supportHubBackLink {
            margin-bottom: 22px;
          }

          .supportHubHeader h1 {
            font-size: clamp(2.8rem, 14vw, 4rem);
          }

          .supportHubHeader p {
            font-size: 0.92rem;
          }

          .supportHubStatusCard {
            align-items: stretch;
            flex-direction: column;
            padding: 22px 0 28px;
          }

          .supportHubStatusCard a {
            width: 100%;
            box-sizing: border-box;
          }

          .supportHubSectionCard {
            padding-top: 30px;
          }

          .supportHubSectionHeading {
            gap: 10px;
          }

          .supportHubSectionHeading > span {
            width: 36px;
            height: 36px;
          }

          .supportHubSectionHeading h2 {
            font-size: 1.8rem;
          }

          .supportHubSectionHeading p {
            font-size: 0.9rem;
          }

          .supportHubFormCard {
            padding: 18px;
            border-radius: 18px;
          }

          .supportHubFormGrid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .supportHubWideField {
            grid-column: auto;
          }

          .supportHubAdminToolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .supportHubAdminControls {
            display: grid;
            grid-template-columns: 1fr;
          }

          .supportHubAdminControls button {
            width: 100%;
          }

          .supportHubReportTop {
            display: grid;
          }

          .supportHubReportActions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 390px) {
          .supportHubReportActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}