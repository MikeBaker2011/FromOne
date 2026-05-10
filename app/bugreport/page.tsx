'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BugReportPage() {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [saving, setSaving] = useState(false);

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

      alert('Bug report sent. Thank you.');
      setTitle('');
      setSeverity('Medium');
      setDescription('');
      setSteps('');
      setPageUrl('');
    } catch (error: any) {
      alert(error?.message || 'Error submitting bug report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">FromOne Bug Report</div>
        <h1 className="page-title">Report something that needs fixing.</h1>
        <p className="page-description">
          Use this page to capture issues during the MVP build and user testing.
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
    </>
  );
}