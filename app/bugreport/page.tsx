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
    <main className="supportSimplePage">
      <section className="supportSimpleShell">
        <header className="supportSimpleHero">
          <span>Support</span>
          <h1>Need help?</h1>
          <p>Send us a short message and we’ll take a look.</p>
        </header>

        <section className="supportSimpleContact">
          <div>
            <strong>Prefer email?</strong>
            <span>info@fromone.co.uk</span>
          </div>
          <a href="mailto:info@fromone.co.uk">Email support</a>
        </section>

        <section className="supportSimpleCard">
          <div className="supportSimpleGrid">
            <label>
              <strong>What do you need help with?</strong>
              <select
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
              <strong>Short title</strong>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: I cannot create a post"
              />
            </label>

            <label className="wide">
              <strong>Tell us what happened</strong>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Briefly describe the problem or question."
                rows={5}
              />
            </label>

            <details className="supportSimpleMore wide">
              <summary>Add more detail</summary>

              <div className="supportSimpleGrid supportSimpleExtra">
                <label>
                  <strong>Urgency</strong>
                  <select
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

                <label>
                  <strong>Page</strong>
                  <input
                    value={pageUrl}
                    onChange={(event) => setPageUrl(event.target.value)}
                    placeholder="/create"
                  />
                </label>

                <label className="wide">
                  <strong>What were you trying to do?</strong>
                  <textarea
                    value={steps}
                    onChange={(event) => setSteps(event.target.value)}
                    placeholder="Optional"
                    rows={3}
                  />
                </label>
              </div>
            </details>
          </div>

          <button
            type="button"
            className="supportSimpleSend"
            onClick={submitSupportRequest}
            disabled={saving}
          >
            {saving ? "Sending…" : "Send support request"}
          </button>
        </section>

        {isAdmin ? (
          <details className="supportSimpleAdmin">
            <summary>
              Admin support inbox
              <span>{openReportsCount} open</span>
            </summary>

            <div className="supportSimpleAdminBody">
              <div className="supportSimpleAdminToolbar">
                <div>
                  <strong>{newReportsCount} new</strong>
                  <span>{bugReports.length} total</span>
                </div>

                <div>
                  <select
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
                <p className="supportSimpleEmpty">Loading support requests…</p>
              ) : filteredBugReports.length === 0 ? (
                <p className="supportSimpleEmpty">No support requests found.</p>
              ) : (
                <div className="supportSimpleReportList">
                  {filteredBugReports.map((report) => (
                    <article key={report.id} className="supportSimpleReport">
                      <div className="supportSimpleReportTop">
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

                      {report.page_url ? (
                        <small className="supportSimplePageRef">
                          {report.page_url}
                        </small>
                      ) : null}

                      <p>{report.description}</p>

                      {report.steps_to_reproduce ? (
                        <details className="supportSimpleReportDetails">
                          <summary>More detail</summary>
                          <p>{report.steps_to_reproduce}</p>
                        </details>
                      ) : null}

                      <div className="supportSimpleReportActions">
                        <button
                          type="button"
                          onClick={() => updateBugStatus(report.id, "reviewing")}
                        >
                          Reviewing
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBugStatus(report.id, "in_progress")}
                        >
                          In progress
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBugStatus(report.id, "resolved")}
                        >
                          Resolved
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteBugReport(report)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </details>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.supportSimplePage),
        body:has(.supportSimplePage) .app-shell,
        body:has(.supportSimplePage) .main-content,
        body:has(.supportSimplePage) .main-content.fromone-mobile-bottom-safe,
        body:has(.supportSimplePage) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.supportSimplePage)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.supportSimplePage) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 100px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .supportSimplePage {
          width: 100%;
          min-height: 100%;
          margin: 0;
          color: #071b49;
          background: #ffffff;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .supportSimpleShell {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .supportSimpleHero {
          margin-bottom: 4px;
        }

        .supportSimpleHero > span {
          display: block;
          margin-bottom: 7px;
          color: #f72585;
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .supportSimpleHero h1 {
          margin: 0 0 8px;
          color: #071b49;
          font-size: clamp(2.35rem, 5vw, 3.7rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .supportSimpleHero p {
          margin: 0;
          color: #66728a;
          font-size: 0.94rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .supportSimpleContact,
        .supportSimpleCard,
        .supportSimpleAdmin {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .supportSimpleContact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
        }

        .supportSimpleContact > div {
          display: grid;
          gap: 2px;
        }

        .supportSimpleContact strong {
          font-size: 0.8rem;
          font-weight: 900;
        }

        .supportSimpleContact span {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .supportSimpleContact a {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 13px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font-size: 0.74rem;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .supportSimpleCard {
          padding: 15px;
        }

        .supportSimpleGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .supportSimpleGrid label {
          display: grid;
          gap: 5px;
        }

        .supportSimpleGrid .wide {
          grid-column: 1 / -1;
        }

        .supportSimpleGrid label strong {
          color: #071b49;
          font-size: 0.74rem;
          font-weight: 900;
        }

        .supportSimpleGrid input,
        .supportSimpleGrid select,
        .supportSimpleGrid textarea,
        .supportSimpleAdminToolbar select {
          width: 100%;
          min-height: 43px;
          padding: 9px 11px;
          border: 1px solid #dfe5f1;
          border-radius: 11px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 650;
          outline: none;
          box-sizing: border-box;
        }

        .supportSimpleGrid textarea {
          resize: vertical;
        }

        .supportSimpleGrid input:focus,
        .supportSimpleGrid select:focus,
        .supportSimpleGrid textarea:focus {
          border-color: #f72585;
          box-shadow: 0 0 0 3px rgba(247, 37, 133, 0.08);
        }

        .supportSimpleMore {
          margin-top: 1px;
          border-top: 1px solid #edf1f7;
        }

        .supportSimpleMore summary {
          padding: 12px 0 0;
          color: #52617a;
          font-size: 0.76rem;
          font-weight: 900;
          cursor: pointer;
          list-style: none;
        }

        .supportSimpleMore summary::-webkit-details-marker {
          display: none;
        }

        .supportSimpleMore[open] summary {
          margin-bottom: 12px;
        }

        .supportSimpleExtra {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .supportSimpleSend {
          width: 100%;
          min-height: 44px;
          margin-top: 12px;
          border: 1px solid #f72585;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .supportSimpleSend:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .supportSimpleAdmin {
          overflow: hidden;
        }

        .supportSimpleAdmin > summary {
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 14px;
          color: #071b49;
          font-size: 0.78rem;
          font-weight: 900;
          cursor: pointer;
          list-style: none;
        }

        .supportSimpleAdmin > summary::-webkit-details-marker {
          display: none;
        }

        .supportSimpleAdmin > summary span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 9px;
          border-radius: 999px;
          background: #fff1f7;
          color: #c71363;
          font-size: 0.68rem;
        }

        .supportSimpleAdminBody {
          padding: 0 14px 14px;
        }

        .supportSimpleAdminToolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 0;
          border-top: 1px solid #edf1f7;
        }

        .supportSimpleAdminToolbar > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .supportSimpleAdminToolbar > div:first-child {
          display: grid;
          gap: 2px;
        }

        .supportSimpleAdminToolbar > div:first-child strong {
          font-size: 0.78rem;
          font-weight: 900;
        }

        .supportSimpleAdminToolbar > div:first-child span {
          color: #718096;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .supportSimpleAdminToolbar select {
          min-width: 140px;
        }

        .supportSimpleAdminToolbar button,
        .supportSimpleReportActions button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 11px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.7rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none;
        }

        .supportSimpleReportList {
          display: grid;
          gap: 8px;
        }

        .supportSimpleReport {
          padding: 12px;
          border: 1px solid #e5eaf2;
          border-radius: 14px;
          background: #ffffff;
        }

        .supportSimpleReportTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .supportSimpleReportTop > div {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .supportSimpleReportTop span {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          padding: 0 8px;
          border-radius: 999px;
          background: #f7f9fc;
          color: #52617a;
          font-size: 0.65rem;
          font-weight: 850;
        }

        .supportSimpleReportTop small,
        .supportSimplePageRef {
          color: #8a96a8;
          font-size: 0.66rem;
          font-weight: 650;
        }

        .supportSimpleReport h3 {
          margin: 10px 0 5px;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .supportSimpleReport > p,
        .supportSimpleReportDetails p {
          margin: 7px 0;
          color: #66728a;
          font-size: 0.76rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .supportSimpleReportDetails summary {
          color: #52617a;
          font-size: 0.7rem;
          font-weight: 850;
          cursor: pointer;
        }

        .supportSimpleReportActions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .supportSimpleReportActions .danger {
          border-color: #fecdd3;
          color: #9f1239;
          background: #fffafa;
        }

        .supportSimpleEmpty {
          margin: 0;
          padding: 18px 0;
          color: #718096;
          font-size: 0.76rem;
          font-weight: 650;
          text-align: center;
        }

        @media (max-width: 700px) {
          body:has(.supportSimplePage) .main-content,
          body:has(.supportSimplePage) .main-content.fromone-mobile-bottom-safe {
            padding: 18px 10px 100px !important;
          }

          .supportSimpleShell {
            max-width: 100%;
          }

          .supportSimpleHero h1 {
            font-size: 2.2rem;
          }

          .supportSimpleGrid,
          .supportSimpleExtra {
            grid-template-columns: 1fr;
          }

          .supportSimpleGrid .wide {
            grid-column: auto;
          }

          .supportSimpleContact {
            align-items: stretch;
            flex-direction: column;
          }

          .supportSimpleContact a {
            width: 100%;
            box-sizing: border-box;
          }

          .supportSimpleAdminToolbar,
          .supportSimpleReportTop {
            align-items: stretch;
            flex-direction: column;
          }

          .supportSimpleAdminToolbar > div:last-child {
            display: grid;
            grid-template-columns: 1fr;
          }

          .supportSimpleAdminToolbar select,
          .supportSimpleAdminToolbar button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}