"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

type CampaignPost = {
  id: string;
  title: string | null;
  platform: string | null;
  media_type: string | null;
  original_media_type: string | null;
  converted_from_pdf: boolean | null;
  media_prepare_status: string | null;
  publish_status: string | null;
  status: string | null;
  is_posted: boolean | null;
  scheduled_at: string | null;
  scheduled_publish_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Not set";
  }
};

const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);

  return date;
};

const getEndOfWeek = () => {
  const date = getStartOfWeek();

  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);

  return date;
};

const normalisePlatform = (value?: string | null) => {
  const clean = String(value || "Other").trim();
  return clean || "Other";
};

const cleanStatus = (value?: string | null) => {
  return String(value || "planned").replace(/_/g, " ");
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<CampaignPost[]>([]);

  const loadReports = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      let userId = authData.user?.id || null;

      if (authError) {
        const authMessage = String(authError.message || "").toLowerCase();
        const isMissingSession =
          authMessage.includes("auth session missing") ||
          authError.name === "AuthSessionMissingError";

        if (!isMissingSession) {
          console.error("Reports auth error:", authError.message);
        }

        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData.session?.user?.id || null;
      }

      if (!userId) {
        setPosts([]);
        setMessage("Please sign in to view reports.");
        return;
      }

      const { data, error } = await supabase
        .from("campaign_posts")
        .select(
          "id,title,platform,media_type,original_media_type,converted_from_pdf,media_prepare_status,publish_status,status,is_posted,scheduled_at,scheduled_publish_at,created_at,updated_at",
        )
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        throw error;
      }

      setPosts((data || []) as CampaignPost[]);
    } catch (error: any) {
      console.error("Reports load error:", error?.message || error);
      setMessage(error?.message || "Could not load reports.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const report = useMemo(() => {
    const startOfWeek = getStartOfWeek().getTime();
    const endOfWeek = getEndOfWeek().getTime();

    const postsThisWeek = posts.filter((post) => {
      const sourceDate = post.created_at || post.scheduled_at || post.scheduled_publish_at;

      if (!sourceDate) return false;

      const time = new Date(sourceDate).getTime();
      return time >= startOfWeek && time <= endOfWeek;
    });

    const posted = posts.filter((post) => Boolean(post.is_posted) || cleanStatus(post.publish_status).toLowerCase() === "posted");
    const scheduled = posts.filter((post) => {
      const status = cleanStatus(post.publish_status || post.status).toLowerCase();
      return status.includes("scheduled") || Boolean(post.scheduled_publish_at || post.scheduled_at);
    });
    const waitingReview = posts.filter((post) => !post.is_posted && cleanStatus(post.publish_status).toLowerCase() !== "posted");
    const preparedMedia = posts.filter((post) => cleanStatus(post.media_prepare_status).toLowerCase() === "prepared");
    const flyersPrepared = posts.filter(
      (post) =>
        Boolean(post.converted_from_pdf) ||
        cleanStatus(post.original_media_type).toLowerCase() === "flyer" ||
        cleanStatus(post.media_type).toLowerCase() === "flyer",
    );

    const platformCounts = posts.reduce<Record<string, number>>((current, post) => {
      const platform = normalisePlatform(post.platform);
      current[platform] = (current[platform] || 0) + 1;
      return current;
    }, {});

    const thisWeekPlatformCounts = postsThisWeek.reduce<Record<string, number>>((current, post) => {
      const platform = normalisePlatform(post.platform);
      current[platform] = (current[platform] || 0) + 1;
      return current;
    }, {});

    return {
      postsThisWeek,
      posted,
      scheduled,
      waitingReview,
      preparedMedia,
      flyersPrepared,
      platformCounts,
      thisWeekPlatformCounts,
    };
  }, [posts]);

  const platformRows = Object.entries(report.platformCounts).sort((a, b) => b[1] - a[1]);
  const thisWeekPlatformRows = Object.entries(report.thisWeekPlatformCounts).sort((a, b) => b[1] - a[1]);
  const recentPosts = posts.slice(0, 8);

  if (loading) {
    return (
      <main className="reports-page">
        <section className="premium-card reports-hero-card">
          <div className="page-eyebrow">Reports</div>
          <h1 className="page-title">Loading reports...</h1>
          <p className="page-description">Checking your weekly posts and publishing activity.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="reports-page">
      <section className="premium-card reports-hero-card">
        <div>
          <div className="page-eyebrow">Reports</div>
          <h1 className="page-title">Your social report.</h1>
          <p className="page-description">
            A simple summary of what FromOne has created, scheduled and prepared for your posts.
          </p>
        </div>

        <div className="reports-hero-actions">
          <button type="button" onClick={loadReports}>
            Refresh
          </button>
          <Link href="/posts" className="reports-secondary-link">
            Review posts
          </Link>
        </div>
      </section>

      {message && (
        <section className="premium-card reports-message-card">
          <strong>{message}</strong>
        </section>
      )}

      <section className="reports-metric-grid">
        <article className="reports-metric-card">
          <span>This week</span>
          <strong>{report.postsThisWeek.length}</strong>
          <p>Posts created this week.</p>
        </article>

        <article className="reports-metric-card">
          <span>Scheduled</span>
          <strong>{report.scheduled.length}</strong>
          <p>Posts with a planned time.</p>
        </article>

        <article className="reports-metric-card">
          <span>Posted</span>
          <strong>{report.posted.length}</strong>
          <p>Posts marked as published.</p>
        </article>

        <article className="reports-metric-card">
          <span>To review</span>
          <strong>{report.waitingReview.length}</strong>
          <p>Posts still waiting for action.</p>
        </article>

        <article className="reports-metric-card">
          <span>Prepared media</span>
          <strong>{report.preparedMedia.length}</strong>
          <p>Images ready for social use.</p>
        </article>

        <article className="reports-metric-card">
          <span>Flyers handled</span>
          <strong>{report.flyersPrepared.length}</strong>
          <p>Flyers or PDFs used in posts.</p>
        </article>
      </section>

      <section className="reports-grid-two">
        <article className="premium-card reports-panel">
          <div className="page-eyebrow">Platform split</div>
          <h2>All posts by platform</h2>

          {platformRows.length === 0 ? (
            <p className="reports-muted">No posts yet.</p>
          ) : (
            <div className="reports-bars">
              {platformRows.map(([platform, count]) => {
                const width = posts.length > 0 ? Math.max(8, Math.round((count / posts.length) * 100)) : 0;

                return (
                  <div key={platform} className="reports-bar-row">
                    <div>
                      <strong>{platform}</strong>
                      <span>{count} post{count === 1 ? "" : "s"}</span>
                    </div>
                    <div className="reports-bar-track" aria-hidden="true">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="premium-card reports-panel">
          <div className="page-eyebrow">This week</div>
          <h2>Weekly platform mix</h2>

          {thisWeekPlatformRows.length === 0 ? (
            <p className="reports-muted">No posts created this week yet.</p>
          ) : (
            <div className="reports-platform-pills">
              {thisWeekPlatformRows.map(([platform, count]) => (
                <span key={platform}>
                  <strong>{platform}</strong>
                  {count}
                </span>
              ))}
            </div>
          )}

          <div className="reports-note-box">
            <strong>Tip</strong>
            <p>
              Keep the weekly mix balanced across the platforms you care about most. Facebook and Instagram can autopost when connected; TikTok stays manual for now.
            </p>
          </div>
        </article>
      </section>

      <section className="premium-card reports-panel reports-recent-panel">
        <div className="reports-section-head">
          <div>
            <div className="page-eyebrow">Recent activity</div>
            <h2>Latest posts</h2>
            <p>Recently created posts and their current status.</p>
          </div>

          <Link href="/posts" className="reports-secondary-link">
            Open Posts
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <p className="reports-muted">No posts found yet. Create your first weekly set from Dashboard.</p>
        ) : (
          <div className="reports-recent-list">
            {recentPosts.map((post) => (
              <article key={post.id} className="reports-recent-item">
                <div>
                  <span className="reports-pill">{post.platform || "Post"}</span>
                  <span className="reports-pill is-muted">{cleanStatus(post.publish_status || post.status)}</span>
                </div>

                <h3>{post.title || "Untitled post"}</h3>
                <p>
                  {post.media_type ? `${cleanStatus(post.media_type)} media` : "No media"} · Scheduled {formatDate(post.scheduled_publish_at || post.scheduled_at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .reports-page {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: 0 0 56px;
        }

        .reports-hero-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 22px;
          margin-bottom: 20px;
          padding: clamp(24px, 4vw, 42px) !important;
          border-radius: 34px !important;
          border: 1px solid rgba(255, 212, 59, 0.24) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.16), transparent 34%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.032)) !important;
        }

        .reports-hero-card .page-title {
          margin: 8px 0 12px;
          font-size: clamp(2.5rem, 5.4vw, 4.8rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
        }

        .reports-hero-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .reports-secondary-link {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(248, 250, 252, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
        }

        .reports-message-card {
          margin-bottom: 18px;
          border-color: rgba(255, 212, 59, 0.24) !important;
        }

        .reports-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .reports-metric-card {
          padding: 22px;
          border-radius: 26px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 34%),
            rgba(15, 23, 42, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 22px 58px rgba(0, 0, 0, 0.18);
        }

        .reports-metric-card span {
          display: block;
          color: rgba(255, 212, 59, 0.92);
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .reports-metric-card strong {
          display: block;
          margin: 10px 0 8px;
          color: #ffffff;
          font-size: clamp(2.5rem, 5vw, 3.4rem);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }

        .reports-metric-card p,
        .reports-panel p {
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.5;
        }

        .reports-metric-card p {
          margin: 0;
        }

        .reports-grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .reports-panel {
          border-radius: 30px !important;
          padding: clamp(22px, 3vw, 30px) !important;
        }

        .reports-panel h2 {
          margin: 8px 0 14px;
          font-size: clamp(1.7rem, 3vw, 2.6rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .reports-bars {
          display: grid;
          gap: 14px;
        }

        .reports-bar-row {
          display: grid;
          gap: 8px;
        }

        .reports-bar-row > div:first-child {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .reports-bar-row strong {
          color: #ffffff;
        }

        .reports-bar-row span {
          color: rgba(248, 250, 252, 0.62);
          font-weight: 850;
        }

        .reports-bar-track {
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .reports-bar-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, #ffd43b, #f7b733);
        }

        .reports-platform-pills {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .reports-platform-pills span,
        .reports-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 11px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.82rem;
          font-weight: 950;
        }

        .reports-pill.is-muted {
          background: rgba(148, 163, 184, 0.12);
          color: rgba(248, 250, 252, 0.72);
          border-color: rgba(148, 163, 184, 0.2);
        }

        .reports-note-box {
          margin-top: 18px;
          padding: 15px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .reports-note-box p {
          margin: 6px 0 0;
        }

        .reports-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 16px;
        }

        .reports-section-head p {
          margin: 0;
        }

        .reports-recent-list {
          display: grid;
          gap: 12px;
        }

        .reports-recent-item {
          padding: 16px;
          border-radius: 22px;
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .reports-recent-item h3 {
          margin: 12px 0 8px;
          color: #ffffff;
          font-size: 1.1rem;
          line-height: 1.2;
        }

        .reports-recent-item p {
          margin: 0;
        }

        .reports-muted {
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
        }

        @media (max-width: 900px) {
          .reports-page {
            width: min(100%, calc(100vw - 24px));
          }

          .reports-hero-card,
          .reports-grid-two {
            grid-template-columns: 1fr;
          }

          .reports-hero-actions,
          .reports-section-head {
            display: grid;
            grid-template-columns: 1fr;
            justify-content: stretch;
          }

          .reports-hero-actions button,
          .reports-hero-actions a,
          .reports-section-head a {
            width: 100%;
          }

          .reports-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 580px) {
          .reports-metric-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
