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
  facebook_post_id?: string | null;
  instagram_post_id?: string | null;
};

type PostMetric = {
  id: string;
  campaign_post_id: string;
  user_id: string | null;
  platform: string;
  provider_post_id: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressions: number | null;
  reach: number | null;
  saves: number | null;
  engagement: number | null;
  synced_at: string | null;
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

const cleanText = (value?: unknown) => {
  return String(value || "").trim();
};

const isDiagnosticMetric = (metric?: any) => {
  return Boolean(metric?.raw?.diagnostic);
};

const isWaitingForMetaInsights = (metric?: any) => {
  if (!metric) return false;

  const hasProviderPostId = Boolean(metric.provider_post_id);
  const totals =
    Number(metric.likes || 0) +
    Number(metric.comments || 0) +
    Number(metric.shares || 0) +
    Number(metric.reach || 0) +
    Number(metric.impressions || 0) +
    Number(metric.saves || 0) +
    Number(metric.engagement || 0);

  return hasProviderPostId && totals === 0;
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [metricsMessage, setMetricsMessage] = useState("");
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [metrics, setMetrics] = useState<PostMetric[]>([]);
  const [syncingMetrics, setSyncingMetrics] = useState(false);
  const [autoSyncChecked, setAutoSyncChecked] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState<"all" | "facebook" | "instagram">("all");
  const [creatingFromBest, setCreatingFromBest] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [createdPostId, setCreatedPostId] = useState("");

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
          "id,title,platform,media_type,original_media_type,converted_from_pdf,media_prepare_status,publish_status,status,is_posted,scheduled_at,scheduled_publish_at,created_at,updated_at,facebook_post_id,instagram_post_id",
        )
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        throw error;
      }

      const postRows = (data || []) as CampaignPost[];
      setPosts(postRows);

      const { data: metricRows, error: metricError } = await supabase
        .from("post_metrics")
        .select(
          "id,campaign_post_id,user_id,platform,provider_post_id,likes,comments,shares,impressions,reach,saves,engagement,synced_at",
        )
        .eq("user_id", userId)
        .order("synced_at", { ascending: false })
        .limit(1000);

      if (metricError) {
        console.warn("Reports metrics unavailable:", metricError.message);
        setMetrics([]);
        setMetricsMessage("Post performance metrics are not available yet.");
      } else {
        setMetrics((metricRows || []) as PostMetric[]);
      }
    } catch (error: any) {
      console.error("Reports load error:", error?.message || error);
      setMessage(error?.message || "Could not load reports.");
      setPosts([]);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const syncMetaMetrics = async (options?: { silent?: boolean; automatic?: boolean }) => {
    const isSilent = Boolean(options?.silent);
    const isAutomatic = Boolean(options?.automatic);

    setSyncingMetrics(true);

    if (!isSilent) {
      setMetricsMessage("Checking Meta for the latest Facebook and Instagram metrics...");
    }

    const syncStartedAt = Date.now();

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Please sign in again before syncing metrics.");
      }

      const response = await fetch("/api/reports/sync-meta-metrics", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const result = await response.json().catch(() => ({}));

      const elapsed = Date.now() - syncStartedAt;
      if (elapsed < 900) {
        await new Promise((resolve) => window.setTimeout(resolve, 900 - elapsed));
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "Could not sync metrics yet.");
      }

      const synced = Number(result?.synced || 0);
      const failed = Number(result?.failed || 0);
      const checked = Array.isArray(result?.results) ? result.results.length : synced + failed;
      const finishedAt = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const syncPrefix = isAutomatic ? "Auto-sync complete. " : "";

      const diagnostics = result?.diagnostics;
      const diagnosticText = diagnostics
        ? ` Published posts found: ${diagnostics.publishedPostsFound ?? 0}. Posts with saved Meta IDs: ${diagnostics.postsWithMetaIds ?? 0}.`
        : "";

      if (synced > 0) {
        setMetricsMessage(
          `${syncPrefix}${result?.message || `Synced ${synced} metric record${synced === 1 ? "" : "s"}.`} Checked ${checked} Meta item${checked === 1 ? "" : "s"} at ${finishedAt}.${diagnosticText}`,
        );
      } else if (failed > 0) {
        setMetricsMessage(
          `${syncPrefix}${result?.message || "Meta was contacted, but no metrics could be saved yet."} Checked ${checked} item${checked === 1 ? "" : "s"}; ${failed} failed. This is usually a Meta permission, token, or insights-availability issue.${diagnosticText}`,
        );
      } else {
        setMetricsMessage(
          `${syncPrefix}${result?.message || "No published Facebook or Instagram posts were found to sync yet."} Checked at ${finishedAt}.${diagnosticText}`,
        );
      }

      await loadReports();
    } catch (error: any) {
      console.warn("Metrics sync unavailable:", error?.message || error);

      if (!isSilent) {
        setMetricsMessage(
          error?.message ||
            "Metrics sync could not complete. Try again shortly.",
        );
      }
    } finally {
      setSyncingMetrics(false);
    }
  };

  const createPostFromBestPerformer = async () => {
    setCreatingFromBest(true);
    setRecommendationMessage("Creating a new draft post from your best tracked performer...");
    setCreatedPostId("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Please sign in again before creating a post.");
      }

      const response = await fetch("/api/reports/create-post-from-best", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "Could not create the post yet.");
      }

      setCreatedPostId(result?.postId || "");
      setRecommendationMessage(
        result?.message || "Draft post created from your best performer.",
      );
    } catch (error: any) {
      console.warn("Create post from best performer unavailable:", error?.message || error);
      setRecommendationMessage(
        error?.message ||
          "Could not create a post from the best performer yet.",
      );
    } finally {
      setCreatingFromBest(false);
    }
  };

  const maybeAutoSyncMetrics = async () => {
    if (autoSyncChecked || syncingMetrics) return;

    setAutoSyncChecked(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) return;

      const storageKey = `fromone:last-meta-metrics-sync:${userId}`;
      const lastSyncTime = Number(window.localStorage.getItem(storageKey) || 0);
      const oneHourMs = 60 * 60 * 1000;

      if (Date.now() - lastSyncTime < oneHourMs) {
        return;
      }

      window.localStorage.setItem(storageKey, String(Date.now()));
      await syncMetaMetrics({ silent: true, automatic: true });
    } catch (error) {
      console.warn("Reports auto-sync skipped:", error);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (!loading) {
      maybeAutoSyncMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);



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

    const metricsByPostId = metrics.reduce<Record<string, PostMetric[]>>((current, metric) => {
      if (!metric.campaign_post_id) return current;

      current[metric.campaign_post_id] = current[metric.campaign_post_id] || [];
      current[metric.campaign_post_id].push(metric);

      return current;
    }, {});

    const diagnosticMetricCount = metrics.filter((metric: any) =>
      Boolean((metric as any)?.raw?.diagnostic),
    ).length;

    const metricTotals = metrics.reduce(
      (current, metric) => {
        current.likes += Number(metric.likes || 0);
        current.comments += Number(metric.comments || 0);
        current.shares += Number(metric.shares || 0);
        current.impressions += Number(metric.impressions || 0);
        current.reach += Number(metric.reach || 0);
        current.saves += Number(metric.saves || 0);
        current.engagement += Number(metric.engagement || 0);
        return current;
      },
      {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        reach: 0,
        saves: 0,
        engagement: 0,
      },
    );

    const bestMetric = [...metrics].sort(
      (first, second) => Number(second.engagement || 0) - Number(first.engagement || 0),
    )[0];

    const bestPost = bestMetric
      ? posts.find((post) => post.id === bestMetric.campaign_post_id) || null
      : null;

    const trackedPerformancePosts = metrics
      .map((metric) => {
        const linkedPost = posts.find((post) => post.id === metric.campaign_post_id) || null;

        return {
          metric,
          post: linkedPost,
          waitingForInsights:
            isDiagnosticMetric(metric) || isWaitingForMetaInsights(metric),
        };
      })
      .sort((first, second) => {
        const firstTime = first.metric.synced_at
          ? new Date(first.metric.synced_at).getTime()
          : 0;
        const secondTime = second.metric.synced_at
          ? new Date(second.metric.synced_at).getTime()
          : 0;

        return secondTime - firstTime;
      });

    return {
      postsThisWeek,
      posted,
      scheduled,
      waitingReview,
      preparedMedia,
      flyersPrepared,
      platformCounts,
      thisWeekPlatformCounts,
      metricsByPostId,
      metricTotals,
      diagnosticMetricCount,
      bestMetric,
      bestPost,
      trackedPerformancePosts,
    };
  }, [posts, metrics]);

  const platformRows = Object.entries(report.platformCounts).sort((a, b) => b[1] - a[1]);
  const thisWeekPlatformRows = Object.entries(report.thisWeekPlatformCounts).sort((a, b) => b[1] - a[1]);
  const recentPosts = posts.slice(0, 8);

  const trackedPerformancePosts = (report.trackedPerformancePosts || []) as any[];

  const filteredPerformancePosts =
    performanceFilter === "all"
      ? trackedPerformancePosts
      : trackedPerformancePosts.filter(({ metric }: any) =>
          cleanText(metric.platform).toLowerCase().includes(performanceFilter),
        );

  const facebookPerformanceCount = trackedPerformancePosts.filter(({ metric }: any) =>
    cleanText(metric.platform).toLowerCase().includes("facebook"),
  ).length;

  const instagramPerformanceCount = trackedPerformancePosts.filter(({ metric }: any) =>
    cleanText(metric.platform).toLowerCase().includes("instagram"),
  ).length;

  const recommendationSource =
    trackedPerformancePosts.find(({ waitingForInsights }: any) => !waitingForInsights) ||
    trackedPerformancePosts[0] ||
    null;

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
            Track your published posts, compare performance and create the next draft from your best performer.
          </p>
        </div>

        <div className="reports-hero-actions">
          <button
                type="button"
                className="reports-action-button reports-action-button-secondary"
                onClick={() => { window.location.href = "/posts"; }}
              >
                Review posts
              </button>
        </div>
      </section>

      {message && (
        <section className="premium-card reports-message-card">
          <strong>{message}</strong>
        </section>
      )}

      {(metricsMessage || syncingMetrics) && (
        <section className="premium-card reports-message-card reports-sync-message-card">
          <strong>{syncingMetrics ? "Syncing metrics..." : "Latest sync result"}</strong>
          <p>
            {syncingMetrics
              ? "FromOne is checking saved Facebook and Instagram post IDs against Meta. This can take a few seconds."
              : metricsMessage}
          </p>
        </section>
      )}

      <section className="reports-metric-grid reports-summary-grid">
        <article className="reports-metric-card">
          <span>Posted</span>
          <strong>{report.posted.length}</strong>
          <p>Posts marked as published.</p>
        </article>

        <article className="reports-metric-card">
          <span>Tracked</span>
          <strong>{trackedPerformancePosts.length}</strong>
          <p>Facebook and Instagram posts connected to Reports.</p>
        </article>

        <article className="reports-metric-card">
          <span>This week</span>
          <strong>{report.postsThisWeek.length}</strong>
          <p>Posts created this week.</p>
        </article>
      </section>

      <section className="premium-card reports-panel reports-main-performance-card">
        <div className="reports-section-head reports-performance-head">
          <div>
            <div className="page-eyebrow">Performance</div>
            <h2>Social engagement</h2>
            <p>
              Automatic sync runs about once an hour. Use Sync metrics anytime to refresh Facebook and Instagram stats.
            </p>
          </div>

          <button type="button" className="reports-action-button reports-action-button-primary" onClick={() => syncMetaMetrics()} disabled={syncingMetrics}>
            {syncingMetrics ? "Checking..." : "Sync metrics"}
          </button>
        </div>

        <div className="reports-compact-metrics">
          <article>
            <span>Likes</span>
            <strong>{report.metricTotals.likes}</strong>
          </article>
          <article>
            <span>Comments</span>
            <strong>{report.metricTotals.comments}</strong>
          </article>
          <article>
            <span>Shares</span>
            <strong>{report.metricTotals.shares}</strong>
          </article>
          <article>
            <span>Reach</span>
            <strong>{report.metricTotals.reach}</strong>
          </article>
          <article>
            <span>Impressions</span>
            <strong>{report.metricTotals.impressions}</strong>
          </article>
          <article>
            <span>Engagement</span>
            <strong>{report.metricTotals.engagement}</strong>
          </article>
        </div>

        <div className="reports-platform-filter" aria-label="Filter post performance">
          <button
            type="button"
            className={performanceFilter === "all" ? "is-active" : ""}
            onClick={() => setPerformanceFilter("all")}
          >
            All
            <span>{trackedPerformancePosts.length}</span>
          </button>
          <button
            type="button"
            className={performanceFilter === "facebook" ? "is-active" : ""}
            onClick={() => setPerformanceFilter("facebook")}
          >
            Facebook
            <span>{facebookPerformanceCount}</span>
          </button>
          <button
            type="button"
            className={performanceFilter === "instagram" ? "is-active" : ""}
            onClick={() => setPerformanceFilter("instagram")}
          >
            Instagram
            <span>{instagramPerformanceCount}</span>
          </button>
        </div>

        {filteredPerformancePosts.length === 0 ? (
          <div className="reports-note-box reports-empty-clean">
            <strong>No tracked Meta posts yet</strong>
            <p>
              Publish Facebook or Instagram posts through FromOne and each post will appear here with its individual stats.
            </p>
          </div>
        ) : (
          <div className="reports-post-clean-list">
            {filteredPerformancePosts.map(({ metric, post: linkedPost, waitingForInsights }: any) => (
              <article
                key={`${metric.campaign_post_id}-${metric.platform}`}
                className={waitingForInsights ? "reports-post-clean-card is-waiting" : "reports-post-clean-card"}
              >
                <div className="reports-post-clean-header">
                  <div className="reports-post-clean-title">
                    <span className="reports-pill">
                      {waitingForInsights ? "Meta post found" : metric.platform}
                    </span>
                    <h3>{linkedPost?.title || `${metric.platform} post`}</h3>
                    <p>
                      {waitingForInsights
                        ? "Waiting for Meta to return live activity."
                        : `Last synced ${formatDate(metric.synced_at)}`}
                    </p>
                  </div>

                  <div className="reports-post-clean-engagement">
                    <strong>{Number(metric.engagement || 0)}</strong>
                    <span>Engagement</span>
                  </div>
                </div>

                <div className="reports-post-clean-stats">
                  {[
                    ["Likes", metric.likes],
                    ["Comments", metric.comments],
                    ["Shares", metric.shares],
                    ["Reach", metric.reach],
                    ["Impressions", metric.impressions],
                    ["Saves", metric.saves],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="reports-post-clean-stat">
                      <strong>{Number(value || 0)}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="reports-post-clean-footer">
                  <span>{metric.platform}</span>
                  <span>Meta ID: {metric.provider_post_id || "Not saved"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="premium-card reports-panel reports-recommendation-panel">
        <div className="page-eyebrow">Best performer follow-up</div>
        <h2>Create the next post</h2>

        {recommendationSource ? (
          <div className="reports-recommendation-box">
            <span className="reports-pill">
              {recommendationSource.waitingForInsights
                ? "Early signal"
                : "Based on best performer"}
            </span>
            <h3>
              Create another {recommendationSource.metric.platform} post in the style of{" "}
              {recommendationSource.post?.title || `${recommendationSource.metric.platform} post`}.
            </h3>
            <p>
              {recommendationSource.waitingForInsights
                ? "FromOne has found the Meta post and is waiting for engagement data. Once real engagement appears, this recommendation can become more precise."
                : "This post currently has the strongest engagement in your tracked reports. Reuse the same type of offer, visual style and call to action in next week’s content plan."}
            </p>

            {recommendationMessage && (
              <p className="reports-recommendation-message">{recommendationMessage}</p>
            )}

            {createdPostId && (
              <Link
                href={`/posts/${createdPostId}`}
                className="reports-created-post-link"
              >
                Review new post
              </Link>
            )}

            <div className="reports-recommendation-actions">
              <button type="button" className="reports-action-button reports-action-button-primary" onClick={createPostFromBestPerformer} disabled={creatingFromBest}>
                {creatingFromBest ? "Creating..." : "Create post from best performer"}
              </button>
              <button
                type="button"
                className="reports-action-button reports-action-button-secondary"
                onClick={() => { window.location.href = "/posts"; }}
              >
                Review posts
              </button>
              <button type="button" className="reports-action-button reports-action-button-primary" onClick={() => syncMetaMetrics()} disabled={syncingMetrics}>{syncingMetrics ? "Checking..." : "Refresh metrics"}</button>
            </div>
          </div>
        ) : (
          <div className="reports-note-box">
            <strong>No recommendation yet</strong>
            <p>
              Publish Facebook or Instagram posts through FromOne and this area will suggest what to create next based on the strongest performer.
            </p>
          </div>
        )}
      </section>

      <style jsx>{`
        /* Phase 9 final polish — Reports cleanup */
        .reports-page {
          width: min(100%, 1080px) !important;
          margin: 0 auto !important;
          padding: 0 0 56px !important;
        }

        .reports-hero-card,
        .reports-message-card,
        .reports-panel,
        .reports-metric-card {
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          box-shadow: 0 22px 66px rgba(0, 0, 0, 0.24) !important;
        }

        .reports-hero-card {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 22px !important;
          align-items: center !important;
          margin-bottom: 18px !important;
          border-radius: 34px !important;
          padding: clamp(24px, 3.4vw, 38px) !important;
          border-color: rgba(255, 212, 59, 0.2) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.14), transparent 34%),
            rgba(15, 23, 42, 0.84) !important;
        }

        .reports-hero-card .page-title {
          margin: 8px 0 12px !important;
          color: #ffffff !important;
          font-size: clamp(2.45rem, 5vw, 4.4rem) !important;
          line-height: 0.92 !important;
          letter-spacing: -0.06em !important;
        }

        .reports-hero-card .page-description {
          max-width: 760px !important;
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.58 !important;
        }

        .reports-message-card {
          display: grid !important;
          gap: 7px !important;
          margin-bottom: 18px !important;
          padding: 16px 18px !important;
          border-radius: 22px !important;
          background: rgba(255, 212, 59, 0.08) !important;
          border-color: rgba(255, 212, 59, 0.18) !important;
        }

        .reports-message-card strong {
          color: #ffffff !important;
        }

        .reports-message-card p {
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.48 !important;
        }

        .reports-summary-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin: 0 0 18px !important;
        }

        .reports-metric-card {
          padding: 20px !important;
          border-radius: 26px !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 34%),
            rgba(15, 23, 42, 0.84) !important;
        }

        .reports-metric-card span,
        .reports-compact-metrics span,
        .reports-post-clean-stat span,
        .reports-post-clean-engagement span {
          color: rgba(255, 212, 59, 0.92) !important;
          font-size: 0.72rem !important;
          font-weight: 950 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .reports-metric-card strong {
          display: block !important;
          margin: 9px 0 7px !important;
          color: #ffffff !important;
          font-size: clamp(2.3rem, 4vw, 3.15rem) !important;
          line-height: 0.9 !important;
          letter-spacing: -0.07em !important;
        }

        .reports-metric-card p,
        .reports-panel p {
          color: rgba(248, 250, 252, 0.68) !important;
          line-height: 1.5 !important;
        }

        .reports-panel {
          border-radius: 30px !important;
          padding: clamp(22px, 3vw, 30px) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.055), transparent 34%),
            rgba(15, 23, 42, 0.84) !important;
        }

        .reports-main-performance-card {
          margin-bottom: 20px !important;
          border-color: rgba(255, 212, 59, 0.14) !important;
        }

        .reports-section-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 18px !important;
          align-items: start !important;
          margin-bottom: 18px !important;
        }

        .reports-panel h2 {
          margin: 8px 0 10px !important;
          color: #ffffff !important;
          font-size: clamp(1.9rem, 3.4vw, 3rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
        }

        .reports-compact-metrics {
          display: grid !important;
          grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
          gap: 10px !important;
          margin: 18px 0 !important;
        }

        .reports-compact-metrics article,
        .reports-post-clean-stat,
        .reports-post-clean-engagement {
          border-radius: 18px !important;
          background: rgba(2, 6, 23, 0.32) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .reports-compact-metrics article {
          padding: 14px !important;
        }

        .reports-compact-metrics strong,
        .reports-post-clean-stat strong,
        .reports-post-clean-engagement strong {
          color: #ffffff !important;
          letter-spacing: -0.055em !important;
        }

        .reports-platform-filter {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
          margin: 0 0 18px !important;
          padding: 8px !important;
          border-radius: 999px !important;
          background: rgba(2, 6, 23, 0.22) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
          width: fit-content !important;
          max-width: 100% !important;
        }

        .reports-platform-filter button {
          min-height: 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 9px !important;
          padding: 0 14px !important;
          border-radius: 999px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          background: rgba(255, 255, 255, 0.055) !important;
          color: rgba(248, 250, 252, 0.78) !important;
          font-weight: 950 !important;
          cursor: pointer !important;
        }

        .reports-platform-filter button.is-active {
          background: rgba(255, 212, 59, 0.16) !important;
          border-color: rgba(255, 212, 59, 0.34) !important;
          color: #ffe58a !important;
        }

        .reports-post-clean-list {
          display: grid !important;
          gap: 14px !important;
        }

        .reports-post-clean-card {
          display: grid !important;
          gap: 16px !important;
          padding: clamp(18px, 2.5vw, 24px) !important;
          border-radius: 26px !important;
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.05), transparent 36%),
            rgba(2, 6, 23, 0.34) !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          overflow: hidden !important;
        }

        .reports-post-clean-card.is-waiting {
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 36%),
            rgba(255, 255, 255, 0.045) !important;
          border-color: rgba(255, 212, 59, 0.2) !important;
        }

        .reports-post-clean-header {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 132px !important;
          gap: 16px !important;
          align-items: start !important;
        }

        .reports-post-clean-title h3 {
          margin: 12px 0 8px !important;
          color: #ffffff !important;
          font-size: clamp(1.25rem, 2vw, 1.65rem) !important;
          line-height: 1.12 !important;
          letter-spacing: -0.04em !important;
        }

        .reports-post-clean-stats {
          display: grid !important;
          grid-template-columns: repeat(6, minmax(90px, 1fr)) !important;
          gap: 10px !important;
        }

        .reports-post-clean-stat {
          display: grid !important;
          gap: 7px !important;
          padding: 13px 12px !important;
        }

        .reports-post-clean-footer {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px 14px !important;
          color: rgba(248, 250, 252, 0.44) !important;
          font-size: 0.78rem !important;
          font-weight: 800 !important;
          overflow-wrap: anywhere !important;
        }

        .reports-pill {
          min-height: 28px !important;
          width: fit-content !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 10px !important;
          border-radius: 999px !important;
          background: rgba(255, 212, 59, 0.12) !important;
          color: #ffe58a !important;
          border: 1px solid rgba(255, 212, 59, 0.2) !important;
          font-size: 0.72rem !important;
          font-weight: 1000 !important;
          letter-spacing: 0.07em !important;
          text-transform: uppercase !important;
        }

        .reports-recommendation-panel {
          margin-top: 22px !important;
          margin-bottom: 0 !important;
          border-color: rgba(255, 212, 59, 0.18) !important;
        }

        .reports-recommendation-box {
          display: grid !important;
          gap: 14px !important;
          padding: 18px !important;
          border-radius: 24px !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 36%),
            rgba(2, 6, 23, 0.26) !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
        }

        .reports-recommendation-box h3 {
          margin: 0 !important;
          color: #ffffff !important;
          font-size: clamp(1.25rem, 2.2vw, 1.75rem) !important;
          line-height: 1.12 !important;
          letter-spacing: -0.04em !important;
        }

        .reports-recommendation-message {
          margin: 2px 0 0 !important;
          padding: 12px 14px !important;
          border-radius: 16px !important;
          background: rgba(255, 212, 59, 0.09) !important;
          border: 1px solid rgba(255, 212, 59, 0.18) !important;
          color: rgba(248, 250, 252, 0.82) !important;
          line-height: 1.45 !important;
        }

        .reports-created-post-link {
          min-height: 46px !important;
          width: fit-content !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 16px !important;
          border-radius: 15px !important;
          background: rgba(34, 197, 94, 0.14) !important;
          color: #bbf7d0 !important;
          border: 1px solid rgba(34, 197, 94, 0.3) !important;
          font-weight: 950 !important;
          text-decoration: none !important;
        }

        .reports-recommendation-actions,
        .reports-hero-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 12px !important;
        }

        .reports-recommendation-actions {
          margin-top: 4px !important;
        }

        .reports-action-button {
          min-height: 46px !important;
          height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          border-width: 1px !important;
          border-style: solid !important;
          font-family: inherit !important;
          font-weight: 950 !important;
          font-size: 0.98rem !important;
          line-height: 1 !important;
          letter-spacing: -0.01em !important;
          text-decoration: none !important;
          white-space: nowrap !important;
          cursor: pointer !important;
          appearance: none !important;
        }

        .reports-action-button-primary {
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border-color: rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 32px rgba(255, 212, 59, 0.16) !important;
        }

        .reports-action-button-secondary {
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(248, 250, 252, 0.94) !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
          box-shadow: none !important;
        }

        .reports-action-button:disabled {
          opacity: 0.72 !important;
          cursor: wait !important;
          box-shadow: none !important;
        }

        .reports-note-box,
        .reports-empty-clean {
          padding: 16px !important;
          border-radius: 20px !important;
          background: rgba(255, 255, 255, 0.055) !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
        }

        @media (max-width: 920px) {
          .reports-page {
            width: min(100%, calc(100vw - 24px)) !important;
          }

          .reports-hero-card,
          .reports-section-head,
          .reports-post-clean-header {
            grid-template-columns: 1fr !important;
          }

          .reports-hero-actions,
          .reports-section-head {
            justify-content: stretch !important;
          }

          .reports-compact-metrics,
          .reports-post-clean-stats {
            grid-template-columns: repeat(3, minmax(90px, 1fr)) !important;
          }

          .reports-post-clean-engagement {
            justify-items: start !important;
            width: fit-content !important;
          }
        }

        @media (max-width: 640px) {
          .reports-hero-card,
          .reports-panel,
          .reports-metric-card {
            border-radius: 24px !important;
          }

          .reports-summary-grid,
          .reports-compact-metrics,
          .reports-post-clean-stats {
            grid-template-columns: 1fr !important;
          }

          .reports-platform-filter {
            width: 100% !important;
            border-radius: 22px !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .reports-platform-filter button,
          .reports-action-button,
          .reports-created-post-link {
            width: 100% !important;
          }

          .reports-recommendation-actions,
          .reports-hero-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }
        }


        .reports-recommendation-panel {
          margin-top: 24px !important;
          margin-bottom: 28px !important;
          padding-top: clamp(26px, 3vw, 34px) !important;
        }

        .reports-recommendation-panel > h2 {
          margin-bottom: 22px !important;
        }

        .reports-recommendation-box {
          margin-top: 8px !important;
        }

        .reports-recommendation-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 12px !important;
          margin-top: 14px !important;
        }

        .reports-recommendation-actions a[href="/posts"],
        .reports-recommendation-actions .reports-review-posts-button,
        .reports-recommendation-actions .reports-secondary-link {
          min-height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(248, 250, 252, 0.92) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          font-weight: 950 !important;
          text-decoration: none !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        .reports-recommendation-actions button {
          min-height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 32px rgba(255, 212, 59, 0.16) !important;
          font-weight: 950 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        @media (max-width: 720px) {
          .reports-recommendation-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .reports-recommendation-actions a[href="/posts"],
          .reports-recommendation-actions button {
            width: 100% !important;
          }
        }


        .reports-hero-card .reports-hero-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 12px !important;
          flex-wrap: wrap !important;
        }

        .reports-hero-card .reports-hero-actions a[href="/posts"],
        .reports-hero-card .reports-hero-actions .reports-hero-secondary-button {
          min-height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(248, 250, 252, 0.92) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          font-weight: 950 !important;
          text-decoration: none !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        .reports-hero-card .reports-hero-actions .reports-hero-primary-button,
        .reports-hero-card .reports-hero-actions button {
          min-height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 32px rgba(255, 212, 59, 0.16) !important;
          font-weight: 950 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        @media (max-width: 720px) {
          .reports-hero-card .reports-hero-actions {
            justify-content: stretch !important;
          }

          .reports-hero-card .reports-hero-actions a[href="/posts"],
          .reports-hero-card .reports-hero-actions button {
            width: 100% !important;
          }
        }


        .reports-page {
          width: min(100%, 1040px);
          margin: 0 auto;
          padding: 0 0 56px;
        }

        .reports-hero-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 22px;
          margin-bottom: 18px;
          padding: clamp(24px, 4vw, 38px) !important;
          border-radius: 32px !important;
          border: 1px solid rgba(255, 212, 59, 0.22) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.15), transparent 34%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.032)) !important;
        }

        .reports-hero-card .page-title {
          margin: 8px 0 10px;
          font-size: clamp(2.6rem, 5.2vw, 4.5rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
        }

        .reports-hero-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .reports-secondary-link {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(248, 250, 252, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
        }

        .reports-message-card {
          display: grid;
          gap: 6px;
          margin-bottom: 18px;
          border-color: rgba(255, 212, 59, 0.24) !important;
        }

        .reports-message-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.45;
        }

        .reports-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .reports-metric-card {
          padding: 20px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 34%),
            rgba(15, 23, 42, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .reports-metric-card span,
        .reports-compact-metrics span {
          display: block;
          color: rgba(255, 212, 59, 0.92);
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .reports-metric-card strong {
          display: block;
          margin: 9px 0 7px;
          color: #ffffff;
          font-size: clamp(2.35rem, 4vw, 3.2rem);
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

        .reports-panel {
          border-radius: 30px !important;
          padding: clamp(22px, 3vw, 30px) !important;
        }

        .reports-panel h2 {
          margin: 8px 0 10px;
          font-size: clamp(1.9rem, 3.4vw, 3rem);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .reports-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .reports-section-head p {
          margin: 0;
        }

        .reports-main-performance-card {
          margin-bottom: 20px;
          border-color: rgba(255, 212, 59, 0.16) !important;
        }

        .reports-compact-metrics {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin: 18px 0;
        }

        .reports-compact-metrics article {
          padding: 14px;
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.32);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .reports-compact-metrics strong {
          display: block;
          margin-top: 8px;
          color: #ffffff;
          font-size: clamp(1.55rem, 3vw, 2.2rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
        }

        .reports-platform-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 0 0 18px;
        }

        .reports-platform-filter button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(248, 250, 252, 0.78);
          font-weight: 950;
          cursor: pointer;
        }

        .reports-platform-filter button.is-active {
          background: rgba(255, 212, 59, 0.16);
          border-color: rgba(255, 212, 59, 0.36);
          color: #ffe58a;
        }

        .reports-platform-filter button span {
          min-width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(2, 6, 23, 0.32);
          font-size: 0.78rem;
        }

        .reports-post-clean-list {
          display: grid;
          gap: 16px;
        }

        .reports-post-clean-card {
          display: grid;
          gap: 18px;
          padding: clamp(18px, 2.6vw, 26px);
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.055), transparent 36%),
            rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.09);
          overflow: hidden;
        }

        .reports-post-clean-card.is-waiting {
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 36%),
            rgba(255, 255, 255, 0.045);
          border-color: rgba(255, 212, 59, 0.2);
        }

        .reports-post-clean-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 132px;
          gap: 18px;
          align-items: start;
        }

        .reports-post-clean-title h3 {
          margin: 14px 0 8px;
          color: #ffffff;
          font-size: clamp(1.3rem, 2vw, 1.7rem);
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .reports-post-clean-title p {
          max-width: 820px;
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.48;
        }

        .reports-post-clean-engagement {
          display: grid;
          gap: 7px;
          justify-items: end;
          padding: 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .reports-post-clean-engagement strong {
          color: #ffffff;
          font-size: 2.1rem;
          line-height: 0.9;
          letter-spacing: -0.06em;
        }

        .reports-post-clean-engagement span {
          color: rgba(248, 250, 252, 0.58);
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .reports-post-clean-stats {
          display: grid;
          grid-template-columns: repeat(6, minmax(90px, 1fr));
          gap: 10px;
        }

        .reports-post-clean-stat {
          display: grid;
          gap: 7px;
          min-width: 0;
          padding: 13px 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .reports-post-clean-stat strong {
          display: block;
          color: #ffffff;
          font-size: 1.45rem;
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .reports-post-clean-stat span {
          display: block;
          color: rgba(248, 250, 252, 0.6);
          font-size: 0.72rem;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .reports-post-clean-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          color: rgba(248, 250, 252, 0.44);
          font-size: 0.78rem;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .reports-recommendation-panel {
          margin-bottom: 0;
          border-color: rgba(255, 212, 59, 0.18) !important;
        }

        .reports-recommendation-box {
          display: grid;
          gap: 12px;
          padding: 18px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 36%),
            rgba(2, 6, 23, 0.26);
          border: 1px solid rgba(255, 212, 59, 0.16);
        }

        .reports-recommendation-box h3 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(1.25rem, 2.2vw, 1.75rem);
          line-height: 1.12;
          letter-spacing: -0.04em;
        }

        .reports-recommendation-box p {
          margin: 0;
        }

        .reports-recommendation-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 4px;
        }

        .reports-note-box {
          padding: 15px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .reports-note-box p {
          margin: 6px 0 0;
        }

        .reports-sync-button.is-syncing {
          cursor: wait;
          opacity: 0.82;
        }

        @media (max-width: 920px) {
          .reports-page {
            width: min(100%, calc(100vw - 24px));
          }

          .reports-hero-card,
          .reports-section-head {
            grid-template-columns: 1fr;
          }

          .reports-hero-card,
          .reports-section-head {
            display: grid;
          }

          .reports-hero-actions,
          .reports-section-head {
            justify-content: stretch;
          }

          .reports-hero-actions button,
          .reports-hero-actions a,
          .reports-section-head a {
            width: 100%;
          }

          .reports-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .reports-compact-metrics,
          .reports-post-clean-stats {
            grid-template-columns: repeat(3, minmax(90px, 1fr));
          }

          .reports-post-clean-header {
            grid-template-columns: 1fr;
          }

          .reports-post-clean-engagement {
            justify-items: start;
            width: fit-content;
          }
        }

        @media (max-width: 580px) {
          .reports-summary-grid,
          .reports-compact-metrics,
          .reports-post-clean-stats {
            grid-template-columns: 1fr;
          }
        }

        .reports-hero-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 12px !important;
          flex-wrap: wrap !important;
        }

        .reports-hero-actions .reports-hero-secondary-button,
        .reports-hero-actions .reports-hero-primary-button {
          min-height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          font-weight: 950 !important;
          text-decoration: none !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        .reports-hero-actions .reports-hero-secondary-button {
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(248, 250, 252, 0.92) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
        }

        .reports-hero-actions .reports-hero-primary-button {
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 32px rgba(255, 212, 59, 0.16) !important;
        }

        .reports-hero-actions .reports-hero-primary-button:disabled {
          cursor: wait !important;
          opacity: 0.78 !important;
        }

        @media (max-width: 720px) {
          .reports-hero-actions {
            justify-content: stretch !important;
          }

          .reports-hero-actions .reports-hero-secondary-button,
          .reports-hero-actions .reports-hero-primary-button {
            width: 100% !important;
          }
        }


        .reports-recommendation-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 12px !important;
          margin-top: 16px !important;
        }

        .reports-action-button {
          min-height: 46px !important;
          height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          border-width: 1px !important;
          border-style: solid !important;
          font-weight: 950 !important;
          font-size: 0.98rem !important;
          line-height: 1 !important;
          letter-spacing: -0.01em !important;
          text-decoration: none !important;
          white-space: nowrap !important;
          cursor: pointer !important;
          appearance: none !important;
        }

        .reports-action-button-primary {
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border-color: rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 32px rgba(255, 212, 59, 0.16) !important;
        }

        .reports-action-button-secondary {
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(248, 250, 252, 0.94) !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
          box-shadow: none !important;
        }

        .reports-action-button-secondary:hover {
          background: rgba(255, 255, 255, 0.12) !important;
        }

        .reports-action-button:disabled {
          opacity: 0.75 !important;
          cursor: wait !important;
        }

        @media (max-width: 720px) {
          .reports-recommendation-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .reports-action-button {
            width: 100% !important;
          }
        }


        .reports-recommendation-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 12px !important;
          margin-top: 16px !important;
        }

        .reports-action-button {
          min-height: 46px !important;
          height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 18px !important;
          border-radius: 15px !important;
          border-width: 1px !important;
          border-style: solid !important;
          font-weight: 950 !important;
          font-size: 0.98rem !important;
          line-height: 1 !important;
          letter-spacing: -0.01em !important;
          text-decoration: none !important;
          white-space: nowrap !important;
          cursor: pointer !important;
          appearance: none !important;
          font-family: inherit !important;
        }

        .reports-action-button-primary {
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border-color: rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 32px rgba(255, 212, 59, 0.16) !important;
        }

        .reports-action-button-secondary {
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(248, 250, 252, 0.94) !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
          box-shadow: none !important;
        }

        .reports-action-button-secondary:hover {
          background: rgba(255, 255, 255, 0.12) !important;
        }

        .reports-action-button:disabled {
          opacity: 0.75 !important;
          cursor: wait !important;
        }

        @media (max-width: 720px) {
          .reports-recommendation-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .reports-action-button {
            width: 100% !important;
          }
        }

      `}</style>
    </main>
  );
}
