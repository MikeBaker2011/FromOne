'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

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

const supportPromises = [
  {
    title: 'Clear details help us move faster',
    text: 'Tell us what page you were on, what you clicked, and what happened next.',
  },
  {
    title: 'Signed-in users can send requests',
    text: 'Support messages are linked to your FromOne account so we can investigate properly.',
  },
  {
    title: 'Product feedback is welcome',
    text: 'Confusing wording, slow screens and improvement ideas are useful too.',
  },
];

export default function SupportPage() {
  const [requestType, setRequestType] = useState('Question');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');

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

    setFormMessage('');
    setFormError('');

    if (!title.trim()) {
      setFormError('Please add a short title.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please tell us what you need help with.');
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        setFormError('Please sign in before sending a support request.');
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

      setFormMessage('Your support request has been sent. Thank you.');

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
      setFormError(error?.message || 'Error sending support request.');
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
    <main className="sales-page fromone-support-page">
      <style>{`
        .fromone-support-page {
          overflow: hidden;
        }

        .fromone-support-shell {
          width: min(1160px, calc(100vw - 32px));
          margin: 0 auto;
        }

        .fromone-support-hero {
          position: relative;
          overflow: hidden;
          padding-bottom: clamp(36px, 5vw, 64px);
        }

        .fromone-support-hero::before {
          content: '';
          position: absolute;
          inset: -220px -140px auto;
          height: 680px;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 212, 59, 0.2), transparent 32%),
            radial-gradient(circle at 72% 28%, rgba(61, 220, 151, 0.12), transparent 28%),
            radial-gradient(circle at 24% 24%, rgba(255, 255, 255, 0.08), transparent 30%);
          pointer-events: none;
        }

        .fromone-support-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
          gap: clamp(24px, 5vw, 54px);
          align-items: center;
          padding: clamp(42px, 5vw, 70px) 0 clamp(18px, 3vw, 30px);
        }

        .fromone-support-copy {
          max-width: 680px;
        }

        .fromone-support-title {
          margin: 0 0 18px;
          color: #ffffff;
          font-size: clamp(3.1rem, 7vw, 7.2rem);
          line-height: 0.88;
          letter-spacing: -0.082em;
        }

        .fromone-support-title span {
          color: #ffd43b;
        }

        .fromone-support-text {
          max-width: 600px;
          margin: 0;
          color: rgba(248, 250, 252, 0.76);
          font-size: clamp(1.04rem, 1.35vw, 1.18rem);
          line-height: 1.7;
        }

        .fromone-support-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .fromone-support-preview {
          position: relative;
          padding: clamp(22px, 3vw, 34px);
          border-radius: 42px;
          background:
            radial-gradient(circle at 22% 8%, rgba(255, 212, 59, 0.22), transparent 28%),
            radial-gradient(circle at 82% 18%, rgba(61, 220, 151, 0.14), transparent 30%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.038));
          border: 1px solid rgba(255, 212, 59, 0.24);
          box-shadow: 0 38px 130px rgba(0, 0, 0, 0.42);
        }

        .fromone-support-preview-inner {
          display: grid;
          gap: 14px;
        }

        .fromone-support-stat-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .fromone-support-stat {
          padding: 15px 14px;
          border-radius: 20px;
          background: rgba(2, 6, 23, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
        }

        .fromone-support-stat strong {
          display: block;
          color: #ffffff;
          font-size: 1.45rem;
          line-height: 1;
        }

        .fromone-support-stat span {
          display: block;
          margin-top: 6px;
          color: rgba(248, 250, 252, 0.66);
          font-size: 0.78rem;
          font-weight: 850;
        }

        .fromone-support-tip {
          padding: 20px;
          border-radius: 28px;
          background: rgba(2, 6, 23, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fromone-support-tip .label {
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 950;
        }

        .fromone-support-tip h2 {
          margin: 16px 0 10px;
          color: #ffffff;
          font-size: clamp(1.7rem, 3vw, 2.5rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .fromone-support-tip p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.62;
        }

        .fromone-support-promises {
          display: grid;
          gap: 10px;
        }

        .fromone-support-promise {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 14px 15px;
          border-radius: 20px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .fromone-support-promise span {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-weight: 1000;
        }

        .fromone-support-promise strong {
          display: block;
          color: #ffffff;
        }

        .fromone-support-promise p {
          margin: 4px 0 0;
          color: rgba(248, 250, 252, 0.66);
          line-height: 1.45;
          font-size: 0.92rem;
        }

        .fromone-support-section {
          padding: clamp(34px, 5vw, 58px) 0;
        }

        .fromone-support-form-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
          gap: 18px;
          align-items: start;
        }

        .fromone-support-card {
          border-radius: 38px;
          padding: clamp(22px, 3.5vw, 38px);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.13), transparent 34%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.034));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.3);
        }

        .fromone-support-card h2 {
          margin: 8px 0 12px;
          color: #ffffff;
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 0.95;
          letter-spacing: -0.062em;
        }

        .fromone-support-card p {
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.65;
        }

        .fromone-support-form {
          display: grid;
          gap: 14px;
          margin-top: 22px;
        }

        .fromone-support-form label {
          display: grid;
          gap: 8px;
        }

        .fromone-support-form label strong {
          color: rgba(248, 250, 252, 0.92);
        }

        .fromone-support-form textarea.input {
          min-height: 150px;
        }

        .fromone-support-message {
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(61, 220, 151, 0.1);
          border: 1px solid rgba(61, 220, 151, 0.24);
          color: #a7f3d0;
          font-weight: 850;
          line-height: 1.45;
        }

        .fromone-support-message.is-error {
          background: rgba(248, 113, 113, 0.1);
          border-color: rgba(248, 113, 113, 0.25);
          color: #fecaca;
        }

        .fromone-support-help-stack {
          display: grid;
          gap: 12px;
        }

        .fromone-support-help-card {
          padding: 18px;
          border-radius: 24px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .fromone-support-help-card strong {
          display: block;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .fromone-support-help-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.55;
        }

        .fromone-admin-section {
          padding: clamp(26px, 4vw, 48px) 0 72px;
        }

        .bug-admin-card {
          border-radius: 38px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.034)) !important;
        }

        .bug-admin-header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
        }

        .bug-admin-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(82px, 1fr));
          gap: 10px;
        }

        .bug-admin-stats span {
          padding: 12px;
          border-radius: 18px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
          text-align: center;
          color: rgba(248, 250, 252, 0.72);
          font-weight: 850;
        }

        .bug-admin-stats strong {
          display: block;
          color: #ffffff;
          font-size: 1.4rem;
        }

        .bug-admin-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          margin: 20px 0;
        }

        .bug-admin-empty,
        .bug-report-item {
          padding: 18px;
          border-radius: 24px;
          background: rgba(5, 10, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .bug-report-list {
          display: grid;
          gap: 14px;
        }

        .bug-report-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }

        .bug-severity,
        .bug-status {
          display: inline-flex;
          margin-right: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 950;
        }

        .bug-status {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.1);
          color: rgba(248, 250, 252, 0.78);
        }

        .bug-report-item h3 {
          margin: 0 0 10px;
          color: #ffffff;
        }

        .bug-report-item p {
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.58;
        }

        .bug-report-url,
        .bug-report-user {
          color: rgba(248, 250, 252, 0.58);
        }

        .bug-report-steps {
          margin-top: 14px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .bug-report-steps strong {
          color: #ffffff;
        }

        .bug-report-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        @media (max-width: 920px) {
          .fromone-support-hero-grid,
          .fromone-support-form-grid {
            grid-template-columns: 1fr;
          }

          .fromone-support-copy,
          .fromone-support-text {
            max-width: 760px;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
          }

          .fromone-support-actions {
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .fromone-support-shell {
            width: min(100% - 24px, 520px);
          }

          .fromone-support-hero-grid {
            padding-top: 38px;
            gap: 28px;
          }

          .fromone-support-title {
            font-size: clamp(3rem, 14vw, 4.1rem);
            line-height: 0.9;
          }

          .fromone-support-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .fromone-support-actions a,
          .fromone-support-form button {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .fromone-support-preview,
          .fromone-support-card {
            border-radius: 30px;
          }

          .fromone-support-stat-row {
            grid-template-columns: 1fr;
          }

          .fromone-support-promise {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .fromone-support-card,
          .fromone-support-help-card,
          .fromone-support-tip,
          .fromone-support-stat {
            text-align: center;
          }

          .bug-admin-header {
            display: grid;
          }

          .bug-admin-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .bug-admin-controls {
            grid-template-columns: 1fr;
          }

          .bug-report-top {
            display: grid;
          }

          .bug-report-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .bug-report-actions button {
            width: 100%;
          }
        }
      `}</style>

      <section className="fromone-support-hero">
        <PublicNav />

        <div className="fromone-support-shell fromone-support-hero-grid">
          <div className="fromone-support-copy">
            <h1 className="fromone-support-title">
              Get help without the <span>guesswork.</span>
            </h1>

            <p className="fromone-support-text">
              Send a focused support request when something is confusing, broken, slow or needs a closer look.
            </p>

            <div className="fromone-support-actions">
              <a href="#support-request" className="sales-primary-button">
                Send support request
              </a>

              <Link href="/tutorial" className="sales-secondary-button">
                View guide
              </Link>
            </div>
          </div>

          <aside className="fromone-support-preview" aria-label="Support guidance">
            <div className="fromone-support-preview-inner">
              <div className="fromone-support-stat-row">
                <div className="fromone-support-stat">
                  <strong>1</strong>
                  <span>short title</span>
                </div>
                <div className="fromone-support-stat">
                  <strong>2</strong>
                  <span>what happened</span>
                </div>
                <div className="fromone-support-stat">
                  <strong>3</strong>
                  <span>page or action</span>
                </div>
              </div>

              <div className="fromone-support-tip">
                <span className="label">Helpful example</span>
                <h2>“I clicked Create posts, then saw an error.”</h2>
                <p>
                  A clear request helps us understand the issue quickly and improve FromOne for everyone.
                </p>
              </div>

              <div className="fromone-support-promises">
                {supportPromises.map((item) => (
                  <div key={item.title} className="fromone-support-promise">
                    <span aria-hidden="true">✓</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section id="support-request" className="fromone-support-section">
        <div className="fromone-support-shell fromone-support-form-grid">
          <section className="fromone-support-card">
            <div className="page-eyebrow">Support request</div>
            <h2>Tell us what you need.</h2>
            <p>
              Keep it simple. Tell us what you were trying to do, what happened, and which page you were on.
            </p>

            <div className="fromone-support-form">
              {formMessage && <div className="fromone-support-message">{formMessage}</div>}
              {formError && <div className="fromone-support-message is-error">{formError}</div>}

              <label>
                <strong>Type of help</strong>
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
              </label>

              <label>
                <strong>Short title</strong>
                <input
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: I cannot create weekly posts"
                />
              </label>

              <label>
                <strong>Urgency</strong>
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
              </label>

              <label>
                <strong>Page or area</strong>
                <input
                  className="input"
                  value={pageUrl}
                  onChange={(event) => setPageUrl(event.target.value)}
                  placeholder="Example: Dashboard, Posts, Settings"
                />
              </label>

              <label>
                <strong>What happened?</strong>
                <textarea
                  className="input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Tell us what went wrong, what confused you, or what you need help with."
                  rows={6}
                />
              </label>

              <label>
                <strong>What were you trying to do?</strong>
                <textarea
                  className="input"
                  value={steps}
                  onChange={(event) => setSteps(event.target.value)}
                  placeholder="Example: I clicked Create posts, waited a few seconds, then saw an error message."
                  rows={5}
                />
              </label>

              <button type="button" onClick={submitSupportRequest} disabled={saving}>
                {saving ? 'Sending...' : 'Send support request'}
              </button>
            </div>
          </section>

          <aside className="fromone-support-card">
            <div className="page-eyebrow">What to include</div>
            <h2>Useful details make support faster.</h2>

            <div className="fromone-support-help-stack">
              <div className="fromone-support-help-card">
                <strong>The page</strong>
                <p>Example: Dashboard, Posts, Settings, Subscription or Sign in.</p>
              </div>

              <div className="fromone-support-help-card">
                <strong>The action</strong>
                <p>Example: “I clicked Create posts” or “I tried to publish Instagram.”</p>
              </div>

              <div className="fromone-support-help-card">
                <strong>The result</strong>
                <p>Tell us what happened next, especially if you saw an error message.</p>
              </div>

              <div className="fromone-support-help-card">
                <strong>Need the walkthrough?</strong>
                <p>
                  The guide explains the normal flow from setup to posting.
                </p>
                <Link href="/tutorial" className="sales-secondary-button" style={{ marginTop: 14 }}>
                  Open guide
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {isAdmin && (
        <section className="fromone-admin-section">
          <div className="fromone-support-shell">
            <section className="premium-card bug-admin-card">
              <div className="bug-admin-header">
                <div>
                  <div className="page-eyebrow">Admin only</div>
                  <h2>Support inbox</h2>
                  <p>
                    Review submitted support requests, update their status, and remove reports when they are no longer needed.
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
          </div>
        </section>
      )}

      <PublicFooter />
    </main>
  );
}
