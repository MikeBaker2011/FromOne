"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

type CalendarPost = {
  id: string;
  campaign_id?: string | null;
  user_id?: string | null;
  platform?: string | null;
  title?: string | null;
  caption?: string | null;
  cta?: string | null;
  media_url?: string | null;
  image_url?: string | null;
  media_type?: string | null;
  scheduled_at?: string | null;
  scheduled_publish_at?: string | null;
  created_at?: string | null;
  status?: string | null;
  publish_status?: string | null;
  approval_status?: string | null;
  is_posted?: boolean | null;
  deleted_at?: string | null;
};

type CalendarStatus = "Posted" | "Scheduled" | "Needs review" | "Failed";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  next.setDate(next.getDate() + mondayOffset);
  next.setHours(0, 0, 0, 0);

  return next;
}

function endOfWeek(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);

  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function isSameCalendarDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function getPostDateValue(post: CalendarPost) {
  return post.scheduled_publish_at || post.scheduled_at || post.created_at || null;
}

function getPostDate(post: CalendarPost) {
  const value = getPostDateValue(post);
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getPostStatus(post: CalendarPost): CalendarStatus {
  const status = String(post.status || "").toLowerCase();
  const publishStatus = String(post.publish_status || "").toLowerCase();
  const approvalStatus = String(post.approval_status || "").toLowerCase();

  if (publishStatus === "failed" || status === "failed") return "Failed";

  if (
    post.is_posted === true ||
    status === "posted" ||
    publishStatus === "posted" ||
    publishStatus === "published" ||
    approvalStatus === "posted"
  ) {
    return "Posted";
  }

  if (
    status === "scheduled" ||
    publishStatus === "scheduled" ||
    approvalStatus === "scheduled" ||
    Boolean(post.scheduled_publish_at)
  ) {
    return "Scheduled";
  }

  return "Needs review";
}

function getStatusClass(status: CalendarStatus) {
  if (status === "Posted") return "is-posted";
  if (status === "Scheduled") return "is-scheduled";
  if (status === "Failed") return "is-failed";
  return "is-review";
}

function getPlatformName(post: CalendarPost) {
  const platform = String(post.platform || "").toLowerCase();

  if (platform.includes("facebook")) return "Facebook";
  if (platform.includes("instagram")) return "Instagram";
  if (platform.includes("tiktok")) return "TikTok";

  return "Post";
}

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getPostTitle(post: CalendarPost) {
  const title = cleanText(post.title);

  if (
    title &&
    !/^(facebook|instagram|tiktok|post)\s*post\s*\d*$/i.test(title) &&
    !/^post\s*\d+$/i.test(title)
  ) {
    return title;
  }

  const caption = cleanText(post.caption);
  if (!caption) return `${getPlatformName(post)} post`;

  const firstSentence = caption.split(/[.!?]/).find((part) => part.trim().length >= 12)?.trim() || caption;

  return firstSentence.length > 58 ? `${firstSentence.slice(0, 55).trim()}...` : firstSentence;
}

function getPostTimeLabel(post: CalendarPost) {
  const date = getPostDate(post);
  if (!date) return "No time";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWeekRangeLabel(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });

  const endLabel = end.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

function getReviewHref(post: CalendarPost) {
  const campaignQuery = post.campaign_id
    ? `?campaign=${encodeURIComponent(post.campaign_id)}`
    : "";

  return `/posts/${encodeURIComponent(post.id)}${campaignQuery}`;
}

export default function CalendarPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    loadCalendarPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted]);

  const selectedWeekStart = useMemo(() => {
    return startOfWeek(addWeeks(new Date(), weekOffset));
  }, [weekOffset]);

  const selectedWeekEnd = useMemo(() => {
    return endOfWeek(selectedWeekStart);
  }, [selectedWeekStart]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => addDays(selectedWeekStart, index));
  }, [selectedWeekStart]);

  const postsThisWeek = useMemo(() => {
    return posts
      .filter((post) => {
        const date = getPostDate(post);
        if (!date) return false;
        return date.getTime() >= selectedWeekStart.getTime() && date.getTime() <= selectedWeekEnd.getTime();
      })
      .sort((firstPost, secondPost) => {
        const firstTime = getPostDate(firstPost)?.getTime() || 0;
        const secondTime = getPostDate(secondPost)?.getTime() || 0;
        return firstTime - secondTime;
      });
  }, [posts, selectedWeekEnd, selectedWeekStart]);

  const weekStats = useMemo(() => {
    return postsThisWeek.reduce(
      (stats, post) => {
        const status = getPostStatus(post);

        if (status === "Posted") stats.posted += 1;
        else if (status === "Scheduled") stats.scheduled += 1;
        else if (status === "Failed") stats.failed += 1;
        else stats.review += 1;

        return stats;
      },
      {
        posted: 0,
        scheduled: 0,
        review: 0,
        failed: 0,
      },
    );
  }, [postsThisWeek]);

  async function loadCalendarPosts() {
    setLoading(true);
    setLoadError("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        setPosts([]);
        setLoadError("Please sign in to view your calendar.");
        return;
      }

      const baseQuery = supabase
        .from("campaign_posts")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(350);

      const { data, error } = await baseQuery.eq("user_id", userId);

      if (error) {
        const fallback = await supabase
          .from("campaign_posts")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(350);

        if (fallback.error) {
          throw fallback.error;
        }

        setPosts(fallback.data || []);
        return;
      }

      setPosts(data || []);
    } catch (error: any) {
      console.error("Calendar load error:", error);
      setLoadError(error?.message || "Could not load your calendar.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  if (!hasMounted) {
    return (
      <main className="calendar-page">
        <section className="calendar-shell">
          <div className="calendar-loading-card" />
        </section>
      </main>
    );
  }

  return (
    <main className="calendar-page">
      <style jsx global>{`
        .calendar-page {
          width: 100%;
          min-height: calc(100vh - 120px);
          margin: 0 auto 56px;
          padding: 0 0 42px;
        }

        .calendar-shell {
          width: 100%;
          max-width: var(--fromone-desktop-page-width, 1400px);
          margin: 0 auto;
          box-sizing: border-box;
        }

        .calendar-hero {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 212, 59, 0.18);
          border-radius: 34px;
          padding: clamp(24px, 3.6vw, 42px);
          background:
            radial-gradient(circle at 52% -8%, rgba(255, 212, 59, 0.11), transparent 34%),
            radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.055), transparent 28%),
            linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.026));
          box-shadow:
            0 30px 92px rgba(0,0,0,0.28),
            inset 0 1px 0 rgba(255,255,255,0.055);
        }

        .calendar-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255,212,59,0.035), transparent 28%, transparent 72%, rgba(255,212,59,0.03));
          opacity: 0.9;
        }

        .calendar-hero > * {
          position: relative;
          z-index: 1;
        }

        .calendar-hero-top {
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 0;
          margin-bottom: 22px;
        }

        .calendar-hero-top > div:first-child {
          width: 100%;
          display: grid;
          justify-items: center;
        }

        .calendar-eyebrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.095);
          border: 1px solid rgba(255, 212, 59, 0.18);
          color: #ffd43b;
          font-size: 0.72rem;
          font-weight: 1000;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .calendar-title {
          margin: 14px 0 8px;
          color: #ffffff;
          font-size: clamp(3rem, 5vw, 5.1rem);
          line-height: 0.9;
          font-weight: 1000;
          letter-spacing: -0.072em;
          text-align: center;
        }

        .calendar-description {
          max-width: 690px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.64);
          font-size: 1rem;
          line-height: 1.52;
          font-weight: 760;
          text-align: center;
        }

        .calendar-header-actions {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 0;
        }

        .calendar-action,
        .calendar-nav-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.055);
          color: #ffffff;
          text-decoration: none;
          font-size: 0.8rem;
          line-height: 1;
          font-weight: 900;
          cursor: pointer;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.055);
        }

        .calendar-action:hover,
        .calendar-nav-button:hover {
          background: rgba(255,255,255,0.09);
        }

        .calendar-action.is-primary {
          border: 0;
          background: linear-gradient(135deg, #ffdd4a, #ffc21a);
          color: #061225;
          box-shadow:
            0 10px 20px rgba(255, 212, 59, 0.14),
            inset 0 1px 0 rgba(255,255,255,0.36);
        }

        .calendar-week-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 14px;
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.42);
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .calendar-week-label {
          display: grid;
          gap: 3px;
        }

        .calendar-week-label strong {
          color: #ffffff;
          font-size: 1.04rem;
          font-weight: 1000;
          letter-spacing: -0.025em;
        }

        .calendar-week-label span {
          color: rgba(248,250,252,0.52);
          font-size: 0.8rem;
          font-weight: 780;
        }

        .calendar-week-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .calendar-nav-button {
          min-height: 38px;
          padding: 0 14px;
          font-size: 0.82rem;
        }

        .calendar-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .calendar-stat {
          min-height: 68px;
          padding: 13px 14px;
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.032));
          border: 1px solid rgba(255,255,255,0.085);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.045);
        }

        .calendar-stat strong {
          display: block;
          color: #ffffff;
          font-size: 1.25rem;
          line-height: 1;
          font-weight: 1000;
        }

        .calendar-stat span {
          display: block;
          margin-top: 7px;
          color: rgba(248,250,252,0.56);
          font-size: 0.76rem;
          font-weight: 900;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          align-items: stretch;
        }

        .calendar-day-card {
          display: flex;
          flex-direction: column;
          min-height: 280px;
          padding: 11px;
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.032));
          border: 1px solid rgba(255,255,255,0.085);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.045),
            0 12px 28px rgba(0,0,0,0.12);
        }

        .calendar-day-card.is-today {
          border-color: rgba(255, 212, 59, 0.42);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 212, 59, 0.08), transparent 42%),
            linear-gradient(180deg, rgba(255,255,255,0.058), rgba(255,255,255,0.034));
        }

        .calendar-day-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
          padding: 0 1px;
        }

        .calendar-day-header strong {
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 1000;
          letter-spacing: -0.02em;
        }

        .calendar-day-header span {
          color: rgba(248,250,252,0.48);
          font-size: 0.72rem;
          font-weight: 900;
        }

        .calendar-empty {
          flex: 1;
          display: grid;
          place-items: center;
          min-height: 0;
          border-radius: 18px;
          border: 1px dashed rgba(255,255,255,0.09);
          background: rgba(2,6,23,0.18);
          color: rgba(248,250,252,0.36);
          font-size: 0.82rem;
          font-weight: 900;
          text-align: center;
        }

        .calendar-day-posts {
          display: grid;
          gap: 9px;
          align-content: start;
        }

        .calendar-post-card {
          display: grid;
          gap: 7px;
          padding: 10px;
          border-radius: 18px;
          background:
            radial-gradient(circle at 0% 0%, rgba(255, 212, 59, 0.045), transparent 34%),
            rgba(2, 6, 23, 0.42);
          border: 1px solid rgba(255,255,255,0.08);
          text-decoration: none;
          color: inherit;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
        }

        .calendar-post-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 212, 59, 0.24);
          background:
            radial-gradient(circle at 0% 0%, rgba(255, 212, 59, 0.065), transparent 34%),
            rgba(2, 6, 23, 0.52);
        }

        .calendar-post-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .calendar-platform {
          color: rgba(248,250,252,0.66);
          font-size: 0.7rem;
          font-weight: 1000;
        }

        .calendar-time {
          color: rgba(248,250,252,0.42);
          font-size: 0.68rem;
          font-weight: 900;
        }

        .calendar-status {
          justify-self: start;
          display: inline-flex;
          align-items: center;
          min-height: 23px;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 0.62rem;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .calendar-status.is-posted {
          background: rgba(34,197,94,0.13);
          border: 1px solid rgba(34,197,94,0.32);
          color: #86efac;
        }

        .calendar-status.is-scheduled {
          background: rgba(56,189,248,0.12);
          border: 1px solid rgba(56,189,248,0.32);
          color: #93e4ff;
        }

        .calendar-status.is-review {
          background: rgba(255,212,59,0.11);
          border: 1px solid rgba(255,212,59,0.3);
          color: #ffd43b;
        }

        .calendar-status.is-failed {
          background: rgba(248,113,113,0.12);
          border: 1px solid rgba(248,113,113,0.32);
          color: #fca5a5;
        }

        .calendar-post-title {
          margin: 0;
          color: rgba(248,250,252,0.9);
          font-size: 0.78rem;
          line-height: 1.22;
          font-weight: 900;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .calendar-more-count {
          color: rgba(248,250,252,0.46);
          font-size: 0.74rem;
          font-weight: 900;
          text-align: center;
          padding: 2px 0;
        }

        .calendar-loading-card,
        .calendar-error,
        .calendar-empty-week {
          padding: 28px;
          border-radius: 28px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.09);
          color: rgba(248,250,252,0.72);
          text-align: center;
          font-weight: 850;
        }

        .calendar-loading-card {
          min-height: 360px;
        }

        .calendar-empty-week {
          margin-top: 14px;
        }

        @media (max-width: 1180px) and (min-width: 901px) {
          .calendar-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .calendar-day-card {
            min-height: 230px;
          }
        }

        @media (max-width: 900px) {
          .calendar-page {
            padding-bottom: 118px;
          }

          .calendar-shell {
            max-width: var(--fromone-mobile-page-width, 430px);
          }

          .calendar-hero {
            border-radius: 30px;
            padding: 22px 14px 18px;
          }

          .calendar-hero-top {
            display: grid;
            gap: 14px;
            margin-bottom: 18px;
            text-align: center;
          }

          .calendar-eyebrow {
            margin-inline: auto;
          }

          .calendar-title {
            font-size: clamp(2.65rem, 12vw, 3.35rem);
            margin: 12px 0 10px;
            letter-spacing: -0.075em;
          }

          .calendar-description {
            max-width: 340px;
            margin-inline: auto;
            font-size: 0.9rem;
            line-height: 1.42;
          }

          .calendar-header-actions {
            justify-content: center;
          }

          .calendar-action {
            min-height: 34px;
            height: 34px;
            padding: 0 12px;
            font-size: 0.76rem;
            line-height: 1;
          }

          .calendar-week-bar {
            display: grid;
            justify-items: center;
            text-align: center;
            padding: 13px;
            border-radius: 22px;
          }

          .calendar-week-nav {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
          }

          .calendar-nav-button {
            min-width: 0;
            padding: 0 8px;
          }

          .calendar-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .calendar-stat {
            min-height: 68px;
            padding: 12px;
          }

          .calendar-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .calendar-day-card {
            min-height: 0;
            padding: 12px;
            border-radius: 22px;
          }

          .calendar-empty {
            min-height: 66px;
          }

          .calendar-post-card {
            grid-template-columns: 1fr;
          }

          .calendar-post-title {
            -webkit-line-clamp: 2;
          }
        }
      `}</style>

      <section className="calendar-shell">
        <div className="calendar-hero">
          <div className="calendar-hero-top">
            <div>
              <span className="calendar-eyebrow">Calendar</span>
              <h1 className="calendar-title">This week</h1>
              <p className="calendar-description">
                See the full week at a glance — posted, scheduled, and still to review. Nothing disappears when you add more.
              </p>
            </div>


          </div>

          <div className="calendar-week-bar">
            <div className="calendar-week-label">
              <strong>{weekOffset === 0 ? "This week" : getWeekRangeLabel(selectedWeekStart, selectedWeekEnd)}</strong>
              <span>{getWeekRangeLabel(selectedWeekStart, selectedWeekEnd)}</span>
            </div>

            <div className="calendar-week-nav">
              <button className="calendar-nav-button" type="button" onClick={() => setWeekOffset((current) => current - 1)}>
                Previous
              </button>
              <button className="calendar-nav-button" type="button" onClick={() => setWeekOffset(0)}>
                Today
              </button>
              <button className="calendar-nav-button" type="button" onClick={() => setWeekOffset((current) => current + 1)}>
                Next
              </button>
            </div>
          </div>

          <div className="calendar-stats" aria-label="Weekly post summary">
            <div className="calendar-stat">
              <strong>{postsThisWeek.length}</strong>
              <span>Total</span>
            </div>
            <div className="calendar-stat">
              <strong>{weekStats.review}</strong>
              <span>Needs review</span>
            </div>
            <div className="calendar-stat">
              <strong>{weekStats.scheduled}</strong>
              <span>Scheduled</span>
            </div>
            <div className="calendar-stat">
              <strong>{weekStats.posted}</strong>
              <span>Posted</span>
            </div>
          </div>

          {loading ? (
            <div className="calendar-loading-card">Loading your calendar...</div>
          ) : loadError ? (
            <div className="calendar-error">{loadError}</div>
          ) : (
            <>
              <div className="calendar-grid" aria-label="Weekly calendar">
                {weekDays.map((day, dayIndex) => {
                  const dayPosts = postsThisWeek.filter((post) => {
                    const postDate = getPostDate(post);
                    return postDate ? isSameCalendarDay(postDate, day) : false;
                  });

                  const visiblePosts = dayPosts.slice(0, 3);
                  const extraCount = Math.max(dayPosts.length - visiblePosts.length, 0);

                  return (
                    <article
                      key={day.toISOString()}
                      className={`calendar-day-card ${isSameCalendarDay(day, new Date()) ? "is-today" : ""}`}
                    >
                      <header className="calendar-day-header">
                        <strong>{DAY_LABELS[dayIndex]}</strong>
                        <span>
                          {day.toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </header>

                      {dayPosts.length === 0 ? (
                        <div className="calendar-empty">Empty</div>
                      ) : (
                        <div className="calendar-day-posts">
                          {visiblePosts.map((post) => {
                            const status = getPostStatus(post);

                            return (
                              <Link key={post.id} href={getReviewHref(post)} className="calendar-post-card">
                                <div className="calendar-post-top">
                                  <span className="calendar-platform">{getPlatformName(post)}</span>
                                  <span className="calendar-time">{getPostTimeLabel(post)}</span>
                                </div>

                                <span className={`calendar-status ${getStatusClass(status)}`}>
                                  {status}
                                </span>

                                <p className="calendar-post-title">{getPostTitle(post)}</p>
                              </Link>
                            );
                          })}

                          {extraCount > 0 && (
                            <div className="calendar-more-count">
                              +{extraCount} more post{extraCount === 1 ? "" : "s"}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {postsThisWeek.length === 0 && (
                <div className="calendar-empty-week">
                  No posts in this week yet. Add content from the Create page.
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
