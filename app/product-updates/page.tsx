'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = 'mikeb33@hotmail.co.uk';
const PRODUCT_UPDATES_SEEN_KEY = 'fromone_product_updates_seen';

type ProductUpdate = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: 'draft' | 'published';
  display_order: number;
  published_at: string | null;
  created_at: string;
};

export default function ProductUpdatesPage() {
  const [updates, setUpdates] = useState<ProductUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Product Update');

  useEffect(() => {
    localStorage.setItem(PRODUCT_UPDATES_SEEN_KEY, 'true');
    window.dispatchEvent(new Event('fromone-product-updates-seen'));

    loadPage();
  }, []);

  const loadPage = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const admin = authData.user?.email === ADMIN_EMAIL;

    setIsAdmin(admin);

    let query = supabase
      .from('product_updates')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!admin) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading product updates:', error.message);
      setUpdates([]);
    } else {
      setUpdates((data || []) as ProductUpdate[]);
    }

    setLoading(false);
  };

  const publishedUpdates = useMemo(() => {
    return updates.filter((item) => item.status === 'published');
  }, [updates]);

  const draftUpdates = useMemo(() => {
    return updates.filter((item) => item.status !== 'published');
  }, [updates]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setCategory('Product Update');
  };

  const startEditing = (item: ProductUpdate) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setCategory(item.category || 'Product Update');

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  };

  const saveDraft = async () => {
    if (!isAdmin) return;

    if (!title.trim() || !body.trim()) {
      alert('Please add a title and update text.');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('product_updates')
          .update({
            title: title.trim(),
            body: body.trim(),
            category: category.trim() || 'Product Update',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) {
          alert(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from('product_updates').insert({
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || 'Product Update',
          status: 'draft',
          display_order: 0,
        });

        if (error) {
          alert(error.message);
          return;
        }
      }

      resetForm();
      await loadPage();
      alert('Update saved.');
    } finally {
      setSaving(false);
    }
  };

  const publishUpdate = async (item: ProductUpdate) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('product_updates')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPage();
    alert('Update published.');
  };

  const unpublishUpdate = async (item: ProductUpdate) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('product_updates')
      .update({
        status: 'draft',
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPage();
    alert('Update moved to draft.');
  };

  const deleteUpdate = async (item: ProductUpdate) => {
    if (!isAdmin) return;

    const confirmed = confirm(`Delete this update?\n\n${item.title}`);

    if (!confirmed) return;

    const { error } = await supabase.from('product_updates').delete().eq('id', item.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPage();
    alert('Update deleted.');
  };

  return (
    <main className="product-updates-public-page product-updates-page product-updates-simple-page">
      <PublicNav />

      <div className="page-header product-updates-hero">
        <div className="page-eyebrow">FromOne Updates</div>
        <h1 className="page-title">Product Updates</h1>
        <p className="page-description">
          Simple updates on the latest improvements, fixes, and new features added to
          FromOne.
        </p>
      </div>

      <section className="premium-card product-updates-section product-updates-timeline-card product-updates-clean-card">
        <div className="product-updates-section-header product-updates-clean-header">
          <div>
            <div className="page-eyebrow">Latest updates</div>
            <h2>What’s new</h2>
          </div>

          <span>{publishedUpdates.length} published</span>
        </div>

        {loading ? (
          <p>Loading product updates...</p>
        ) : publishedUpdates.length === 0 ? (
          <div className="product-updates-empty">
            <strong>No updates yet.</strong>
            <p>New improvements will appear here.</p>
          </div>
        ) : (
          <div className="product-updates-timeline product-updates-simple-list">
            {publishedUpdates.map((item) => (
              <article key={item.id} className="product-update-simple-item">
                <div className="product-update-simple-topline">
                  <span>{item.category || 'Product Update'}</span>

                  {item.published_at && (
                    <small>
                      {new Date(item.published_at).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </small>
                  )}
                </div>

                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <details className="product-updates-admin-tools">
          <summary>
            <span>
              <strong>Admin tools</strong>
              <small>Create updates and manage drafts</small>
            </span>

            <b>{draftUpdates.length} draft</b>
          </summary>

          <div className="product-updates-admin-tools-inner">
            <section className="premium-card product-updates-section product-updates-admin-card product-updates-admin-compact-card">
              <div>
                <div className="page-eyebrow">Admin Only</div>
                <h2>{editingId ? 'Edit update' : 'Create update'}</h2>
                <p>
                  Customers cannot see this editor. They only see updates after you publish
                  them.
                </p>
              </div>

              <div className="product-updates-admin-form">
                <label>
                  <strong>Category</strong>
                  <input
                    className="input"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Product Update"
                  />
                </label>

                <label>
                  <strong>Title</strong>
                  <input
                    className="input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Example: Weekly progress is now live"
                  />
                </label>

                <label>
                  <strong>Update text</strong>
                  <textarea
                    className="input"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write the product update here..."
                  />
                </label>

                <div className="product-updates-admin-actions">
                  <button onClick={saveDraft} disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save draft'}
                  </button>

                  {editingId && (
                    <button className="secondary-button" onClick={resetForm} disabled={saving}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="premium-card product-updates-section product-updates-drafts-card product-updates-admin-compact-card">
              <div className="product-updates-section-header product-updates-clean-header">
                <div>
                  <div className="page-eyebrow">Published updates</div>
                  <h2>Manage live updates</h2>
                </div>

                <span>{publishedUpdates.length} published</span>
              </div>

              {publishedUpdates.length === 0 ? (
                <div className="product-updates-empty">
                  <strong>No published updates.</strong>
                  <p>Published updates will appear here.</p>
                </div>
              ) : (
                <div className="product-updates-draft-list">
                  {publishedUpdates.map((item) => (
                    <article key={item.id} className="product-update-draft-item">
                      <div className="product-update-draft-content">
                        <span>{item.category || 'Product Update'}</span>
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </div>

                      <div className="product-update-admin-row product-update-draft-actions">
                        <button className="secondary-button" onClick={() => startEditing(item)}>
                          Edit
                        </button>

                        <button className="secondary-button" onClick={() => unpublishUpdate(item)}>
                          Unpublish
                        </button>

                        <button
                          className="secondary-button danger-button"
                          onClick={() => deleteUpdate(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="premium-card product-updates-section product-updates-drafts-card product-updates-admin-compact-card">
              <div className="product-updates-section-header product-updates-clean-header">
                <div>
                  <div className="page-eyebrow">Drafts</div>
                  <h2>Saved drafts</h2>
                </div>

                <span>{draftUpdates.length} draft</span>
              </div>

              {draftUpdates.length === 0 ? (
                <div className="product-updates-empty">
                  <strong>No drafts.</strong>
                  <p>Draft updates will appear here.</p>
                </div>
              ) : (
                <div className="product-updates-draft-list">
                  {draftUpdates.map((item) => (
                    <article key={item.id} className="product-update-draft-item">
                      <div className="product-update-draft-content">
                        <span>{item.category || 'Product Update'}</span>
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </div>

                      <div className="product-update-admin-row product-update-draft-actions">
                        <button className="secondary-button" onClick={() => startEditing(item)}>
                          Edit
                        </button>

                        <button onClick={() => publishUpdate(item)}>Publish</button>

                        <button
                          className="secondary-button danger-button"
                          onClick={() => deleteUpdate(item)}
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
        </details>
      )}

      <PublicFooter />
    </main>
  );
}