"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SmilezBackButton from "@/app/components/SmilezBackButton";
import "../../posts/posts-companion-shared.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useToast } from "@/app/components/ToastProvider";

type SmilesReview = {
  id: string;
  reference_code?: string | null;
  review_reference?: string | null;
  customer_name: string | null;
  customer_email: string | null;
  rating: number | null;
  review_text: string | null;
  status: string | null;
  client_reply: string | null;
  created_at: string | null;
};

type SmilesProfile = {
  business_name: string | null;
  smiles_listing_venue_id: string | null;
  smiles_eligible?: boolean | null;
  smiles_eligibility_label?: string | null;
  smiles_eligibility_message?: string | null;
};

type SmilesEligibility = {
  eligible?: boolean;
  label?: string;
  message?: string;
  reason?: string;
};

type SmilesResponse = {
  success?: boolean;
  message?: string;
  profile?: SmilesProfile | null;
  smilesEligibility?: SmilesEligibility | null;
  reviews?: SmilesReview[];
};

function formatSubmittedAt(value: string | null) {
  if (!value) return "Unknown";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function getReviewLabel(status: string | null) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Waiting for Smiles admin";
  if (status === "rejected") return "Rejected";
  return "Review";
}

function renderStars(rating: number | null) {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function formatRating(value: number | null) {
  const rating = Number(value || 0);
  return "★".repeat(Math.max(0, Math.min(5, rating))) || "No rating";
}

function makeReviewReference(review: SmilesReview) {
  const existing = String(
    review.reference_code || review.review_reference || ""
  )
    .trim()
    .toUpperCase();

  if (existing) return existing;

  const fallback = String(review.id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();

  return fallback ? `SM-RV-${fallback}` : "SM-RV";
}

export default function SmilesReviewsPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SmilesProfile | null>(null);
  const [smilesEligibility, setSmilesEligibility] =
    useState<SmilesEligibility | null>(null);
  const [reviews, setReviews] = useState<SmilesReview[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isSmilesLocked =
    smilesEligibility?.eligible === false || profile?.smiles_eligible === false;

  const smilesLockedTitle =
    smilesEligibility?.label ||
    profile?.smiles_eligibility_label ||
    "Smiles reviews are not available";

  const smilesLockedMessage =
    smilesEligibility?.message ||
    profile?.smiles_eligibility_message ||
    "Smiles is for eligible local businesses. You can still use FromOne for Facebook and Instagram posts.";
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const approvedReviews = useMemo(
    () => reviews.filter((review) => review.status === "approved"),
    [reviews]
  );

  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status === "pending"),
    [reviews]
  );

  const reviewsNeedingReply = useMemo(
    () =>
      approvedReviews.filter(
        (review) => !String(review.client_reply || "").trim()
      ),
    [approvedReviews]
  );

  const reviewsToShow = showAll ? reviews : reviewsNeedingReply;

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Please sign in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const loadReviews = async () => {
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "GET",
        headers,
      });
      const result = (await response.json()) as SmilesResponse;

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not load reviews.");
      }

      const nextReviews = result.reviews || [];
      const nextReplyDrafts: Record<string, string> = {};

      nextReviews.forEach((review) => {
        nextReplyDrafts[review.id] = review.client_reply || "";
      });

      setProfile(result.profile || null);
      setReviews(nextReviews);
      setReplyDrafts(nextReplyDrafts);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Reviews unavailable",
        message: error?.message || "Could not load reviews.",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveReviewReply = async (reviewId: string) => {
    setBusyId(reviewId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save_review_reply",
          reviewId,
          clientReply: replyDrafts[reviewId] || "",
        }),
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not save reply.");
      }

      showToast({
        type: "success",
        title: "Reply saved",
        message: result.message || "Your public review reply was saved.",
      });

      await loadReviews();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Reply not saved",
        message: error?.message || "Could not save reply.",
      });
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  return (
    <main
      className="fromone-posts-page fromone-smiles-reviews-page smilesReviewsPage"
      data-fromone-smiles-reviews="simple-agency"
    >
      <section id="fromone-standard-shell" className="reviewsShell">
        <header className="reviews-simple-hero">
          <div>
            <span className="reviews-eyebrow">Smilez</span>
            <h1>Reviews.</h1>
            <p>Reply to customer reviews and check anything still waiting for approval.</p>
          </div>
<SmilezBackButton />
        </header>

        {loading ? (
          <section className="reviews-status-card">
            <strong>Loading reviews…</strong>
            <span>Checking your latest customer feedback.</span>
          </section>
        ) : null}

        {!loading && isSmilesLocked ? (
          <section className="reviews-status-card is-warning">
            <div>
              <strong>{smilesLockedTitle}</strong>
              <span>{smilesLockedMessage}</span>
            </div>
            <Link href="/settings">Business settings</Link>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && !profile?.smiles_listing_venue_id ? (
          <section className="reviews-status-card is-warning">
            <div>
              <strong>Your Smilez listing is not live yet</strong>
              <span>Reviews will appear here once your listing is live.</span>
            </div>
            <Link href="/settings">Check listing</Link>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && profile?.smiles_listing_venue_id ? (
          <>
            <section className="reviews-toolbar" aria-label="Review summary">
              <span>
                <strong>{reviewsNeedingReply.length}</strong> need reply
              </span>
              <span>
                <strong>{pendingReviews.length}</strong> waiting approval
              </span>
              <button type="button" onClick={() => setShowAll((current) => !current)}>
                {showAll ? "Show replies needed" : "View all"}
              </button>
            </section>

            {pendingReviews.length > 0 ? (
              <details className="reviews-pending">
                <summary>
                  <div>
                    <strong>Waiting for approval</strong>
                    <span>{pendingReviews.length} review{pendingReviews.length === 1 ? "" : "s"}</span>
                  </div>
                  <b>View</b>
                </summary>

                <div className="reviews-list">
                  {pendingReviews.map((review) => (
                    <article className="review-card is-pending" key={review.id}>
                      <div className="review-card-head">
                        <div>
                          <span className="review-status">{getReviewLabel(review.status)}</span>
                          <h3>{review.customer_name || "Customer"}</h3>
                        </div>
                        <strong className="review-rating" aria-label={`${review.rating || 0} out of 5`}>
                          {formatRating(review.rating)}
                        </strong>
                      </div>

                      <p className="review-text">{review.review_text || "No review text."}</p>

                      <div className="review-meta">
                        <span>{formatSubmittedAt(review.created_at)}</span>
                        <span>{makeReviewReference(review)}</span>
                        {review.customer_email ? (
                          <a href={`mailto:${review.customer_email}`}>Email customer</a>
                        ) : null}
                      </div>

                      <p className="review-note">
                        You can reply once Smilez approves this review.
                      </p>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}

            <section className="reviews-main-section">
              <div className="reviews-section-head">
                <div>
                  <h2>{showAll ? "All reviews" : "Reviews to reply to"}</h2>
                  <p>
                    {showAll
                      ? `${reviews.length} review${reviews.length === 1 ? "" : "s"} in total.`
                      : reviewsNeedingReply.length > 0
                        ? "Reply to the reviews that still need you."
                        : "Nothing needs a reply."}
                  </p>
                </div>
              </div>

              {reviewsToShow.length === 0 ? (
                <div className="reviews-empty">
                  <strong>{showAll ? "No reviews yet" : "You’re all caught up"}</strong>
                  <span>
                    {showAll
                      ? "Customer reviews will appear here."
                      : "New approved reviews without a reply will appear here."}
                  </span>
                </div>
              ) : (
                <div className="reviews-list">
                  {reviewsToShow.map((review) => (
                    <article className="review-card" key={review.id}>
                      <div className="review-card-head">
                        <div>
                          <span className="review-status">{getReviewLabel(review.status)}</span>
                          <h3>{review.customer_name || "Customer"}</h3>
                        </div>
                        <strong className="review-rating" aria-label={`${review.rating || 0} out of 5`}>
                          {formatRating(review.rating)}
                        </strong>
                      </div>

                      <p className="review-text">{review.review_text || "No review text."}</p>

                      <div className="review-meta">
                        <span>{formatSubmittedAt(review.created_at)}</span>
                        <span>{makeReviewReference(review)}</span>
                        {review.customer_email ? (
                          <a href={`mailto:${review.customer_email}`}>Email customer</a>
                        ) : null}
                      </div>

                      {review.status === "approved" ? (
                        <>
                          <label htmlFor={`reply-${review.id}`}>Your reply</label>
                          <textarea
                            id={`reply-${review.id}`}
                            value={replyDrafts[review.id] || ""}
                            onChange={(event) =>
                              setReplyDrafts((current) => ({
                                ...current,
                                [review.id]: event.target.value,
                              }))
                            }
                            placeholder="Write a short, useful reply..."
                          />

                          <button
                            type="button"
                            className="review-save-button"
                            onClick={() => saveReviewReply(review.id)}
                            disabled={busyId === review.id}
                          >
                            {busyId === review.id ? "Saving…" : "Save reply"}
                          </button>
                        </>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.fromone-smiles-reviews-page),
        body:has(.fromone-smiles-reviews-page) .app-shell,
        body:has(.fromone-smiles-reviews-page) .main-content,
        body:has(.fromone-smiles-reviews-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-smiles-reviews-page) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-smiles-reviews-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-smiles-reviews-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 90px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .smilesReviewsPage {
          width: 100%;
          max-width: 100%;
          margin: 0;
          color: #071b49;
          background: transparent !important;
          font-family: var(--font-main), "Plus Jakarta Sans", ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .reviewsShell {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .reviews-simple-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 2px;
        }

        .reviews-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .reviews-simple-hero h1 {
          margin: 0 0 9px;
          color: #071b49;
          font-size: clamp(2.4rem, 5vw, 3.9rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .reviews-simple-hero p {
          max-width: 650px;
          margin: 0;
          color: #66728a;
          font-size: 0.98rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .reviews-status-card a {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49 !important;
          font-size: 0.8rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: none !important;
          white-space: nowrap;
        }

        .reviews-status-card,
        .reviews-toolbar,
        .reviews-pending,
        .reviews-main-section {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .reviews-status-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .reviews-status-card > div {
          display: grid;
          gap: 3px;
        }

        .reviews-status-card strong {
          color: #071b49;
          font-size: 0.95rem;
          font-weight: 900;
        }

        .reviews-status-card span {
          color: #66728a;
          font-size: 0.82rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .reviews-status-card.is-warning {
          border-color: #ffd2e5;
          background: #fffafd;
        }

        .reviews-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
        }

        .reviews-toolbar > span {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0 11px;
          border-radius: 999px;
          background: #f7f9fc;
          color: #66728a;
          font-size: 0.76rem;
          font-weight: 750;
        }

        .reviews-toolbar > span strong {
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .reviews-toolbar button {
          min-height: 40px;
          margin-left: auto;
          padding: 0 13px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .reviews-pending {
          overflow: hidden;
        }

        .reviews-pending summary {
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          list-style: none;
        }

        .reviews-pending summary::-webkit-details-marker {
          display: none;
        }

        .reviews-pending summary > div {
          display: grid;
          gap: 2px;
        }

        .reviews-pending summary strong {
          color: #071b49;
          font-size: 0.94rem;
          font-weight: 900;
        }

        .reviews-pending summary span {
          color: #718096;
          font-size: 0.76rem;
          font-weight: 650;
        }

        .reviews-pending summary b {
          color: #f72585;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .reviews-main-section {
          padding: 16px;
        }

        .reviews-section-head {
          margin-bottom: 12px;
        }

        .reviews-section-head h2 {
          margin: 0 0 4px;
          color: #071b49;
          font-size: 1.18rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .reviews-section-head p {
          margin: 0;
          color: #718096;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .reviews-list {
          display: grid;
          gap: 9px;
        }

        .reviews-pending .reviews-list {
          padding: 0 12px 12px;
        }

        .review-card {
          padding: 14px;
          border: 1px solid #e3e8f1;
          border-radius: 15px;
          background: #fbfcfe;
        }

        .review-card.is-pending {
          border-color: #ffe0b5;
          background: #fffdf7;
        }

        .review-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .review-card-head h3 {
          margin: 6px 0 0;
          color: #071b49;
          font-size: 1.05rem;
          line-height: 1.15;
          font-weight: 900;
        }

        .review-status {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 8px;
          border-radius: 999px;
          background: #e8f8ef;
          color: #147a4d;
          font-size: 0.66rem;
          font-weight: 900;
        }

        .review-card.is-pending .review-status {
          background: #fff3d7;
          color: #9a5a00;
        }

        .review-rating {
          color: #f72585;
          font-size: 0.85rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .review-text {
          margin: 10px 0;
          color: #52617a;
          font-size: 0.88rem;
          line-height: 1.48;
          font-weight: 600;
        }

        .review-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }

        .review-meta span,
        .review-meta a {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 8px;
          border-radius: 999px;
          background: #f3f6fa;
          color: #52617a !important;
          font-size: 0.68rem;
          font-weight: 800;
          text-decoration: none;
        }

        .review-note {
          margin: 0;
          padding: 10px;
          border-radius: 10px;
          background: #fff8e8;
          color: #805300;
          font-size: 0.74rem;
          line-height: 1.4;
          font-weight: 700;
        }

        .review-card label {
          display: block;
          margin-bottom: 6px;
          color: #071b49;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .review-card textarea {
          width: 100%;
          min-height: 104px;
          resize: vertical;
          padding: 12px;
          border: 1px solid #dfe5f1;
          border-radius: 12px;
          background: #ffffff;
          color: #071b49;
          box-sizing: border-box;
          font: inherit;
          font-size: 0.86rem;
          line-height: 1.45;
          font-weight: 600;
          outline: none;
        }

        .review-card textarea:focus {
          border-color: #f72585;
          box-shadow: 0 0 0 3px rgba(247, 37, 133, 0.08);
        }

        .review-save-button {
          min-height: 40px;
          margin-top: 8px;
          padding: 0 14px;
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

        .review-save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reviews-empty {
          display: grid;
          gap: 3px;
          padding: 14px;
          border-radius: 13px;
          background: #f8fafc;
        }

        .reviews-empty strong {
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .reviews-empty span {
          color: #718096;
          font-size: 0.78rem;
          font-weight: 600;
        }

        @media (max-width: 700px) {
          body:has(.fromone-smiles-reviews-page) .main-content,
          body:has(.fromone-smiles-reviews-page) .main-content.fromone-mobile-bottom-safe {
            padding: 18px 10px 100px !important;
          }

          .reviewsShell {
            max-width: 100%;
            gap: 12px;
          }

          .reviews-simple-hero {
            display: grid;
            gap: 12px;
          }

          .reviews-simple-hero h1 {
            font-size: 2.2rem;
          }

          .reviews-toolbar {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .reviews-toolbar > span {
            justify-content: center;
          }

          .reviews-toolbar button {
            grid-column: 1 / -1;
            width: 100%;
            margin-left: 0;
          }

          .review-card-head {
            display: grid;
          }

          .review-rating {
            width: fit-content;
          }

          .review-save-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}