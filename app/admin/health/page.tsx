"use client";

import "../admin.css";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Keep this aligned with app/admin/page.tsx.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "fromone-auth-session",
  },
});

type HealthPost = {
  id: string;
  title: string | null;
  platform: string | null;
  media_type: string | null;
  media_url: string | null;
  media_prepare_status: string | null;
  media_prepare_error: string | null;
  conversion_warning: string | null;
  publish_status: string | null;
  publish_error: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  campaign_id: string | null;
};

type UsageEvent = {
  id: string;
  user_id: string | null;
  event_type: string | null;
  metadata: any;
  created_at: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const cleanStatus = (value?: string | null) => {
  return String(value || "ready").replace(/_/g, " ");
};

const getPostTitle = (post: HealthPost) => {
  return post.title || `${post.platform || "Post"} ${post.id?.slice(0, 6) || ""}`;
};

const getHealthBadgeClass = (status?: string | null) => {
  const clean = String(status || "").toLowerCase();

  if (clean === "failed") return "is-danger";
  if (clean === "prepared" || clean === "posted") return "is-success";
  if (clean === "preparing" || clean === "scheduled") return "is-warning";
  if (clean === "needs_preparing") return "is-warning";
  return "is-muted";
};

export default function AdminHealthPage() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<HealthPost[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const initialiseAdminSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setAdminEmail(data.session?.user?.email || null);
      setAuthReady(true);
    };

    initialiseAdminSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setAdminEmail(session?.user?.email || null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadHealth = async () => {
    setRefreshing(true);
    setMessage("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const userId = authData.user?.id;

      if (!userId) {
        setIsAdmin(false);
        setMessage("Please sign in to view system health.");
        return;
      }

      const { data: adminRow, error: adminError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (adminError) {
        const text = adminError.message || "";

        if (text.includes("admin_users") || adminError.code === "PGRST205") {
          setIsAdmin(false);
          setMessage("Admin access is not configured for this account.");
          return;
        }

        throw adminError;
      }

      if (!adminRow) {
        setIsAdmin(false);
        setMessage("You do not have admin access.");
        return;
      }

      setIsAdmin(true);

      const { data: postRows, error: postError } = await supabase
        .from("campaign_posts")
        .select(
          "id,title,platform,media_type,media_url,media_prepare_status,media_prepare_error,conversion_warning,publish_status,publish_error,status,created_at,updated_at,campaign_id",
        )
        .order("updated_at", { ascending: false })
        .limit(300);

      if (postError) throw postError;

      setPosts((postRows || []) as HealthPost[]);

      const { data: eventRows, error: eventError } = await supabase
        .from("usage_events")
        .select("id,user_id,event_type,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(80);

      if (eventError) {
        setUsageEvents([]);
      } else {
        setUsageEvents((eventRows || []) as UsageEvent[]);
      }
    } catch (error: any) {
      setMessage(error?.message || "Could not load system health.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const health = useMemo(() => {
    const failedMedia = posts.filter(
      (post) =>
        String(post.media_prepare_status || "").toLowerCase() === "failed" ||
        Boolean(post.media_prepare_error),
    );

    const needsPreparing = posts.filter(
      (post) => String(post.media_prepare_status || "").toLowerCase() === "needs_preparing",
    );

    const failedPublishes = posts.filter(
      (post) =>
        String(post.publish_status || "").toLowerCase() === "failed" ||
        Boolean(post.publish_error),
    );

    const warnings = posts.filter((post) => Boolean(post.conversion_warning));

    const prepared = posts.filter(
      (post) => String(post.media_prepare_status || "").toLowerCase() === "prepared",
    );

    return {
      failedMedia,
      needsPreparing,
      failedPublishes,
      warnings,
      prepared,
    };
  }, [posts]);

  const recentProblemPosts = useMemo(() => {
    return posts
      .filter((post) => {
        const mediaStatus = String(post.media_prepare_status || "").toLowerCase();
        const publishStatus = String(post.publish_status || "").toLowerCase();

        return (
          mediaStatus === "failed" ||
          mediaStatus === "needs_preparing" ||
          publishStatus === "failed" ||
          Boolean(post.media_prepare_error) ||
          Boolean(post.publish_error) ||
          Boolean(post.conversion_warning)
        );
      })
      .slice(0, 50);
  }, [posts]);

  if (loading) {
    return (
      <main className="admin-page">
        <div className="page-header admin-header">
          <div className="page-eyebrow">System health</div>
          <h1 className="page-title">Loading health dashboard...</h1>
          <p className="page-description">Checking FromOne media, publishing and usage activity.</p>
        </div>
      </main>
    );
  }

  if (authReady && !isAdmin) {
    return (
      <main className="admin-page">
        <div className="page-header admin-header">
          <div className="page-eyebrow">System health</div>
          <h1 className="page-title">Admin access needed</h1>
          <p className="page-description">{message || "You do not have admin access."}</p>
          <p className="admin-signed-in">
            Signed in as <strong>{adminEmail || "not signed in"}</strong>
          </p>
        </div>

        <section className="premium-card admin-search-card admin-compact-search-card">
          <div>
            <div className="page-eyebrow">Back to admin</div>
            <h2>Customer action panel</h2>
            <p>Return to the main admin dashboard.</p>
          </div>

          <Link href="/admin" className="admin-health-link-button">
            Back to admin →
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page admin-health-page">
      <div className="admin-health-shell">
        <div className="page-header admin-header">
        <div className="page-eyebrow">System health</div>
        <h1 className="page-title">Health dashboard</h1>
        <p className="page-description">
          Check failed media preparation, publishing issues, old flyers that need attention and recent usage events.
        </p>

        <p className="admin-signed-in">
          Signed in as <strong>{authReady ? adminEmail || "not signed in" : "checking session..."}</strong>
        </p>
      </div>

      <section className="premium-card admin-search-card admin-health-hero-card">
        <div>
          <div className="page-eyebrow">FromOne health</div>
          <h2>Media and publishing checks.</h2>
          <p>
            Use this screen to spot failed flyer preparation, publish failures and unusual usage activity before customers report it.
          </p>
        </div>

        <div className="admin-health-actions">
          <button type="button" onClick={loadHealth} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh health"}
          </button>
          <Link href="/admin" className="admin-health-secondary-link">
            Customer panel
          </Link>
        </div>
      </section>

      {message && (
        <section className="premium-card admin-health-message-card">
          <div className="page-eyebrow">Notice</div>
          <p>{message}</p>
        </section>
      )}

      <section className="admin-health-metrics-grid">
        <article className="admin-health-metric-card">
          <span>Recent posts checked</span>
          <strong>{posts.length}</strong>
          <p>Latest campaign posts scanned.</p>
        </article>

        <article className="admin-health-metric-card">
          <span>Prepared media</span>
          <strong>{health.prepared.length}</strong>
          <p>Posts with image-ready media.</p>
        </article>

        <article className="admin-health-metric-card">
          <span>Needs preparing</span>
          <strong>{health.needsPreparing.length}</strong>
          <p>Older flyers or items needing attention.</p>
        </article>

        <article className="admin-health-metric-card">
          <span>Media failures</span>
          <strong>{health.failedMedia.length}</strong>
          <p>Failed media preparation attempts.</p>
        </article>

        <article className="admin-health-metric-card">
          <span>Publish failures</span>
          <strong>{health.failedPublishes.length}</strong>
          <p>Posts that failed to publish.</p>
        </article>

        <article className="admin-health-metric-card">
          <span>Warnings</span>
          <strong>{health.warnings.length}</strong>
          <p>Fallbacks or conversion warnings.</p>
        </article>
      </section>

      <section className="premium-card admin-live-card admin-health-table-card">
        <div className="admin-live-card-header">
          <div>
            <div className="page-eyebrow">Needs attention</div>
            <h2>Recent media or publish issues</h2>
            <p>Open a post to review the problem and help the customer if needed.</p>
          </div>
        </div>

        {recentProblemPosts.length === 0 ? (
          <p className="admin-muted-text">No recent media or publish issues found in the latest posts.</p>
        ) : (
          <div className="admin-health-table-wrap">
            <table className="admin-health-table">
              <thead>
                <tr>
                  <th>Updated</th>
                  <th>Post</th>
                  <th>Platform</th>
                  <th>Media</th>
                  <th>Prepare</th>
                  <th>Publish</th>
                  <th>Issue</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {recentProblemPosts.map((post) => {
                  const issue =
                    post.media_prepare_error ||
                    post.conversion_warning ||
                    post.publish_error ||
                    "Needs attention";

                  return (
                    <tr key={post.id}>
                      <td>{formatDate(post.updated_at || post.created_at)}</td>
                      <td>
                        <strong>{getPostTitle(post)}</strong>
                      </td>
                      <td>{post.platform || "—"}</td>
                      <td>{post.media_type || "—"}</td>
                      <td>
                        <span className={`admin-health-pill ${getHealthBadgeClass(post.media_prepare_status)}`}>
                          {cleanStatus(post.media_prepare_status)}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-health-pill ${getHealthBadgeClass(post.publish_status || post.status)}`}>
                          {cleanStatus(post.publish_status || post.status)}
                        </span>
                      </td>
                      <td className="admin-health-issue" title={issue}>
                        {issue}
                      </td>
                      <td>
                        <Link href={`/posts/${post.id}`} className="admin-health-text-link">
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="premium-card admin-live-card admin-health-events-card">
        <div className="admin-live-card-header">
          <div>
            <div className="page-eyebrow">Usage events</div>
            <h2>Recent activity</h2>
            <p>Recent usage events can help explain limits, rescans or customer activity.</p>
          </div>
        </div>

        {usageEvents.length === 0 ? (
          <p className="admin-muted-text">No recent usage events found or the usage table is unavailable.</p>
        ) : (
          <div className="admin-bug-summary-list">
            {usageEvents.slice(0, 25).map((event) => (
              <article key={event.id} className="admin-bug-summary-item admin-health-event-item">
                <div>
                  <span className="admin-bug-pill">{event.event_type || "event"}</span>
                  <span className="admin-bug-pill is-muted">{formatDate(event.created_at)}</span>
                </div>
                <h3>{event.event_type || "Usage event"}</h3>
                <p className="admin-health-event-text">
                  {JSON.stringify(event.metadata || {}, null, 2)}
                </p>
                <small>{event.user_id || "Unknown user"}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      </div>

      <style jsx>{`
        .admin-health-page {
          width: 100%;
        }

        .admin-health-shell {
          width: min(100%, 1120px);
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 0 56px;
          overflow: hidden;
        }

        .admin-health-page .admin-header {
          max-width: 920px;
          margin-bottom: 26px;
        }

        .admin-health-page .page-title {
          max-width: 100%;
        }

        .admin-health-hero-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 18px;
          margin-bottom: 18px;
          overflow: hidden;
        }

        .admin-health-hero-card p,
        .admin-health-events-card p,
        .admin-health-table-card p {
          margin-bottom: 0;
        }

        .admin-health-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          min-width: 0;
          max-width: 100%;
          flex-wrap: wrap;
        }

        .admin-health-actions button,
        .admin-health-actions a {
          min-height: 54px;
          white-space: nowrap;
        }


        .admin-health-secondary-link {
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(248, 250, 252, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .admin-health-secondary-link:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 212, 59, 0.34);
          color: #ffffff;
        }

        .admin-health-link-button {
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 18px;
          background: linear-gradient(135deg, #ffd43b, #f7b733);
          color: #101420;
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 18px 42px rgba(255, 212, 59, 0.2);
        }

        .admin-health-message-card {
          margin-top: 18px;
          border-color: rgba(248, 113, 113, 0.26);
        }

        .admin-health-message-card p {
          color: #fecaca;
          font-weight: 800;
        }
.admin-health-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .admin-health-table {
          width: 100%;
          min-width: 920px;
          border-collapse: collapse;
        }

        .admin-health-table th {
          padding: 10px 8px;
          color: rgba(248, 250, 252, 0.58);
          font-size: 0.76rem;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .admin-health-table td {
          padding: 13px 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(248, 250, 252, 0.82);
          vertical-align: middle;
        }

        .admin-health-table td strong {
          color: #ffffff;
        }

        .admin-health-pill {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 950;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .admin-health-pill.is-danger {
          background: rgba(248, 113, 113, 0.14);
          color: #fecaca;
          border: 1px solid rgba(248, 113, 113, 0.34);
        }

        .admin-health-pill.is-success {
          background: rgba(34, 197, 94, 0.14);
          color: #bbf7d0;
          border: 1px solid rgba(34, 197, 94, 0.34);
        }

        .admin-health-pill.is-warning {
          background: rgba(250, 204, 21, 0.14);
          color: #fef08a;
          border: 1px solid rgba(250, 204, 21, 0.34);
        }

        .admin-health-pill.is-muted {
          background: rgba(148, 163, 184, 0.12);
          color: #cbd5e1;
          border: 1px solid rgba(148, 163, 184, 0.22);
        }

        .admin-health-issue {
          max-width: 340px;
          color: #fecaca !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-health-text-link {
          color: #ffd43b;
          font-weight: 950;
          text-decoration: none;
        }


        .admin-health-events-card {
          overflow: hidden;
        }

        .admin-health-events-card .admin-bug-summary-list {
          display: grid;
          gap: 12px;
          max-width: 100%;
          overflow: hidden;
        }

        .admin-health-event-item {
          max-width: 100%;
          overflow: hidden;
        }

        .admin-health-event-text {
          display: block;
          max-width: 100%;
          white-space: pre-wrap !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.45;
        }

        .admin-health-event-item small {
          display: block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }


        .admin-health-metrics-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 16px !important;
          margin: 18px 0 22px !important;
        }

        .admin-health-metric-card {
          min-width: 0;
          padding: 22px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 34%),
            rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.18);
        }

        .admin-health-metric-card span {
          display: block;
          color: rgba(248, 250, 252, 0.62);
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.02em;
        }

        .admin-health-metric-card strong {
          display: block;
          margin: 9px 0 8px;
          color: #ffffff;
          font-size: clamp(2.2rem, 5vw, 3.1rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
        }

        .admin-health-metric-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          font-size: 0.95rem;
          line-height: 1.45;
        }


        .admin-health-table-card,
        .admin-health-events-card {
          margin-top: 18px;
        }

        .admin-health-table-card {
          margin-bottom: 18px;
        }

        .admin-health-events-card {
          margin-bottom: 36px;
        }

        .admin-health-table-card + .admin-health-events-card {
          margin-top: 22px;
        }

        @media (max-width: 1100px) {
          .admin-health-shell {
            width: 100%;
            max-width: 100%;
          }

          .admin-health-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          .admin-health-shell {
            width: 100%;
            max-width: 100%;
          }

          .admin-health-page .admin-header {
            max-width: 100%;
          }

          .admin-health-hero-card {
            display: grid;
            grid-template-columns: 1fr;
          }

          .admin-health-actions {
            justify-content: stretch;
            align-items: stretch;
          }

          .admin-health-actions button,
          .admin-health-actions a {
            width: 100%;
          }

          .admin-health-metrics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
