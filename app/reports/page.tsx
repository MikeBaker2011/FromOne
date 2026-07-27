"use client";

import Link from "next/link";
import "../posts/posts-companion-shared.css";
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
      console.warn("Create similar post unavailable:", error?.message || error);
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
      <main className="fromone-posts-page fromone-reports-page">
        <section id="fromone-standard-shell">
          <header className="posts-create-hero">
            <span className="posts-create-eyebrow">Reports</span>
            <h1>Loading reports…</h1>
            <p>Checking your posts, publishing activity and performance.</p>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="fromone-posts-page fromone-reports-page">
      <section id="fromone-standard-shell">
        <header className="posts-create-hero reports-shared-hero">
          <span className="posts-create-eyebrow">Reports</span>
          <h1>See what is working.</h1>
          <p>
            Review publishing activity and see how your Facebook and Instagram
            posts are performing.
          </p>
        </header>

        {message ? (
          <section className="posts-summary-panel reports-shared-message">
            <div className="posts-panel-head">
              <span className="posts-step-badge">!</span>
              <div>
                <h2>Reports update</h2>
                <p>{message}</p>
              </div>
            </div>
          </section>
        ) : null}

        {(metricsMessage || syncingMetrics) ? (
          <section className="posts-summary-panel reports-shared-message">
            <div className="posts-panel-head">
              <span className="posts-step-badge">1</span>
              <div>
                <h2>{syncingMetrics ? "Refreshing report…" : "Latest report update"}</h2>
                <p>
                  {syncingMetrics
                    ? "FromOne is checking Facebook and Instagram for the latest stats."
                    : metricsMessage}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="reports-shared-summary">
          <article>
            <span>Published</span>
            <strong>{report.posted.length}</strong>
            <p>Posts already published.</p>
          </article>
          <article>
            <span>Tracked posts</span>
            <strong>{trackedPerformancePosts.length}</strong>
            <p>Posts with performance tracking.</p>
          </article>
          <article>
            <span>Created this week</span>
            <strong>{report.postsThisWeek.length}</strong>
            <p>Posts created this week.</p>
          </article>
        </section>

        <section className="posts-summary-panel reports-shared-guide">
          <div className="posts-panel-head">
            <span className="posts-step-badge">2</span>
            <div>
              <h2>Keep an eye on what works</h2>
              <p>
                Use Reports after posts have been published. Refresh the metrics
                when you want the latest Facebook and Instagram activity.
              </p>
            </div>
          </div>
          <div className="posts-summary-actions reports-shared-actions">
            <button
              type="button"
              className="posts-primary-action"
              onClick={() => syncMetaMetrics()}
              disabled={syncingMetrics}
            >
              {syncingMetrics ? "Refreshing…" : "Refresh metrics"}
            </button>
            <Link href="/posts">Review posts</Link>
          </div>
        </section>

        <section className="posts-list-panel reports-shared-panel">
          <div className="posts-panel-head">
            <span className="posts-step-badge">3</span>
            <div>
              <h2>Facebook & Instagram performance</h2>
              <p>See the totals and individual results for tracked posts.</p>
            </div>
          </div>

          <div className="reports-shared-compact-metrics">
            {[
              ["Likes", report.metricTotals.likes],
              ["Comments", report.metricTotals.comments],
              ["Shares", report.metricTotals.shares],
              ["Reach", report.metricTotals.reach],
              ["Impressions", report.metricTotals.impressions],
              ["Engagement", report.metricTotals.engagement],
            ].map(([label, value]) => (
              <article key={String(label)}>
                <span>{label}</span>
                <strong>{Number(value || 0)}</strong>
              </article>
            ))}
          </div>

          <div className="reports-shared-filter" aria-label="Filter post performance">
            <button
              type="button"
              className={performanceFilter === "all" ? "is-active" : ""}
              onClick={() => setPerformanceFilter("all")}
            >
              All <span>{trackedPerformancePosts.length}</span>
            </button>
            <button
              type="button"
              className={performanceFilter === "facebook" ? "is-active" : ""}
              onClick={() => setPerformanceFilter("facebook")}
            >
              Facebook <span>{facebookPerformanceCount}</span>
            </button>
            <button
              type="button"
              className={performanceFilter === "instagram" ? "is-active" : ""}
              onClick={() => setPerformanceFilter("instagram")}
            >
              Instagram <span>{instagramPerformanceCount}</span>
            </button>
          </div>

          {filteredPerformancePosts.length === 0 ? (
            <div className="posts-empty-panel">
              <div className="posts-panel-head">
                <span className="posts-step-badge">✓</span>
                <div>
                  <h2>No tracked posts yet</h2>
                  <p>
                    Published Facebook and Instagram posts will appear here once
                    tracking is available.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="reports-shared-post-list">
              {filteredPerformancePosts.map(
                ({ metric, post: linkedPost, waitingForInsights }: any) => (
                  <article
                    key={`${metric.campaign_post_id}-${metric.platform}`}
                    className="reports-shared-post-card"
                  >
                    <div className="reports-shared-post-head">
                      <div>
                        <div className="posts-review-meta">
                          <span>{waitingForInsights ? "Waiting for Meta" : metric.platform}</span>
                        </div>
                        <h3>{linkedPost?.title || `${metric.platform} post`}</h3>
                        <p>
                          {waitingForInsights
                            ? "Meta has found the post but has not returned activity yet."
                            : `Last synced ${formatDate(metric.synced_at)}`}
                        </p>
                      </div>

                      <div className="reports-shared-engagement">
                        <strong>{Number(metric.engagement || 0)}</strong>
                        <span>Engagement</span>
                      </div>
                    </div>

                    <div className="reports-shared-post-stats">
                      {[
                        ["Likes", metric.likes],
                        ["Comments", metric.comments],
                        ["Shares", metric.shares],
                        ["Reach", metric.reach],
                        ["Impressions", metric.impressions],
                        ["Saves", metric.saves],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <strong>{Number(value || 0)}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <section className="posts-list-panel reports-shared-panel reports-shared-recommendation">
          <div className="posts-panel-head">
            <span className="posts-step-badge">4</span>
            <div>
              <h2>Create more of what works</h2>
              <p>Use your strongest tracked post as the starting point for a new draft.</p>
            </div>
          </div>

          {recommendationSource ? (
            <div className="reports-shared-recommendation-box">
              <div className="posts-review-meta">
                <span>
                  {recommendationSource.waitingForInsights
                    ? "Early signal"
                    : "Best performer"}
                </span>
              </div>

              <h3>
                Create another {recommendationSource.metric.platform} post similar
                to {recommendationSource.post?.title || "your strongest post"}.
              </h3>

              <p>
                {recommendationSource.waitingForInsights
                  ? "Meta is still returning activity, so this recommendation may become clearer."
                  : "Use a similar offer, visual style or call to action in your next content plan."}
              </p>

              {recommendationMessage ? (
                <p className="reports-shared-status">{recommendationMessage}</p>
              ) : null}

              <div className="reports-shared-actions">
                <button
                  type="button"
                  className="posts-primary-action"
                  onClick={createPostFromBestPerformer}
                  disabled={creatingFromBest}
                >
                  {creatingFromBest ? "Creating…" : "Create similar post"}
                </button>

                {createdPostId ? (
                  <Link href={`/posts/${createdPostId}`}>Review new post</Link>
                ) : null}

                <Link href="/posts">Review posts</Link>
              </div>
            </div>
          ) : (
            <div className="posts-empty-panel">
              <div className="posts-panel-head">
                <span className="posts-step-badge">✓</span>
                <div>
                  <h2>No recommendation yet</h2>
                  <p>
                    Once posts are published and tracked, FromOne will suggest
                    what to create next.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>

      <style jsx global>{`
        body:has(.fromone-reports-page) {
          background: var(--posts-bg) !important;
        }

        body:has(.fromone-reports-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          background: var(--posts-bg) !important;
        }

        .reports-shared-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .reports-shared-summary article {
          padding: 20px;
          border: 1px solid var(--posts-border);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--posts-shadow);
        }

        .reports-shared-summary span,
        .reports-shared-compact-metrics span,
        .reports-shared-engagement span,
        .reports-shared-post-stats span {
          color: var(--posts-pink);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .reports-shared-summary strong {
          display: block;
          margin: 9px 0 7px;
          color: var(--posts-navy);
          font-size: 2.4rem;
          line-height: 1;
        }

        .reports-shared-summary p,
        .reports-shared-post-card p,
        .reports-shared-recommendation-box p {
          margin: 0;
          color: var(--posts-muted);
          line-height: 1.5;
        }

        .reports-shared-guide,
        .reports-shared-panel {
          margin-bottom: 22px;
        }

        .reports-shared-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .reports-shared-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 17px;
          border: 1px solid var(--posts-border);
          border-radius: 15px;
          background: #fff;
          color: var(--posts-navy);
          font-size: 0.86rem;
          font-weight: 900;
          text-decoration: none;
        }

        .reports-shared-compact-metrics {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .reports-shared-compact-metrics article,
        .reports-shared-post-stats div,
        .reports-shared-engagement {
          padding: 14px;
          border: 1px solid var(--posts-border);
          border-radius: 16px;
          background: #f8fafc;
        }

        .reports-shared-compact-metrics strong,
        .reports-shared-post-stats strong,
        .reports-shared-engagement strong {
          display: block;
          margin-top: 7px;
          color: var(--posts-navy);
          font-size: 1.55rem;
          line-height: 1;
        }

        .reports-shared-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-bottom: 18px;
        }

        .reports-shared-filter button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid var(--posts-border);
          border-radius: 999px;
          background: #fff;
          color: var(--posts-navy);
          font: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .reports-shared-filter button.is-active {
          border-color: #ffd4e8;
          background: #fff5fa;
          color: var(--posts-pink);
        }

        .reports-shared-filter button span {
          display: inline-grid;
          place-items: center;
          min-width: 24px;
          min-height: 24px;
          border-radius: 999px;
          background: #f2f5fa;
          font-size: 0.76rem;
        }

        .reports-shared-post-list {
          display: grid;
          gap: 14px;
        }

        .reports-shared-post-card {
          display: grid;
          gap: 16px;
          padding: 20px;
          border: 1px solid var(--posts-border);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055);
        }

        .reports-shared-post-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 140px;
          gap: 18px;
          align-items: start;
        }

        .reports-shared-post-head h3,
        .reports-shared-recommendation-box h3 {
          margin: 10px 0 8px;
          color: var(--posts-navy);
          font-size: 1.35rem;
          line-height: 1.15;
          letter-spacing: -0.035em;
        }

        .reports-shared-post-stats {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        .reports-shared-recommendation-box {
          padding: 20px;
          border: 1px solid var(--posts-border);
          border-radius: 22px;
          background: #fff;
        }

        .reports-shared-recommendation-box .reports-shared-actions {
          margin-top: 16px;
        }

        .reports-shared-status {
          margin-top: 14px !important;
          padding: 13px 14px;
          border: 1px solid #ffd4e8;
          border-radius: 15px;
          background: #fff5fa;
        }

        @media (max-width: 980px) {
          .reports-shared-compact-metrics,
          .reports-shared-post-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          body:has(.fromone-reports-page) .main-content {
            padding: 24px 16px 100px !important;
          }

          .reports-shared-summary,
          .reports-shared-compact-metrics,
          .reports-shared-post-stats,
          .reports-shared-post-head {
            grid-template-columns: 1fr;
          }

          .reports-shared-actions,
          .reports-shared-filter {
            display: grid;
            grid-template-columns: 1fr;
          }

          .reports-shared-actions a,
          .reports-shared-actions button,
          .reports-shared-filter button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}