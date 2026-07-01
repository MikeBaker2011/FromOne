"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    "Stockport Smiles reviews are not available";

  const smilesLockedMessage =
    smilesEligibility?.message ||
    profile?.smiles_eligibility_message ||
    "Stockport Smiles is for Stockport businesses. You can still use FromOne for Facebook and Instagram posts.";
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const approvedReviews = useMemo(
    () => reviews.filter((review) => review.status === "approved"),
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
    <main className="fromone-smiles-reviews-page smilesReviewsPage" data-fromone-smiles-reviews="simple-v2">
      <section id="fromone-standard-shell" className="reviewsShell">
        <div className="heroTop">
          <Link href="/smiles" className="backLink">
            Back to Smiles
          </Link>
        </div>

        <div className="heroGrid">
          <div>
            <p className="eyebrow">Reviews</p>
            <h1>Customer reviews. Keep it simple.</h1>
            <p className="intro">
              Reply to public customer reviews from one clear place. Keep replies
              short, polite and useful.
            </p>
          </div>

          {profile?.business_name ? (
            <div className="listingCard">
              <span>Your listing</span>
              <strong>{profile.business_name}</strong>
              <p>
                {profile.smiles_listing_venue_id
                  ? "Live on Stockport Smiles"
                  : "Waiting for listing setup"}
              </p>
            </div>
          ) : null}
        </div>

        {loading ? (
          <section className="simplePanel">
            <h2>Loading reviews...</h2>
          </section>
        ) : null}

        {!loading && !profile?.smiles_listing_venue_id ? (
          <section className="simplePanel">
            <span className="panelEyebrow">Not live yet</span>
            <h2>Your Smiles listing is not live yet</h2>
            <p>Reviews will appear here once your listing is live.</p>
          </section>
        ) : null}

        {!loading && profile?.smiles_listing_venue_id ? (
          <>
            <section className="reviewSummary" aria-label="Review summary">
              <article>
                <span>Needs reply</span>
                <strong>{reviewsNeedingReply.length}</strong>
              </article>
              <article>
                <span>Approved reviews</span>
                <strong>{approvedReviews.length}</strong>
              </article>
            </section>

            <section className="simplePanel priority">
              <div className="sectionTop">
                <div>
                  <span>{showAll ? "All reviews" : "Do this first"}</span>
                  <h2>{showAll ? "All reviews" : "Reviews to reply to"}</h2>
                </div>
                <button type="button" onClick={() => setShowAll((item) => !item)}>
                  {showAll ? "Show replies needed" : "View all reviews"}
                </button>
              </div>

              {reviewsToShow.length === 0 ? (
                <div className="emptyState">
                  <h3>{showAll ? "No reviews yet" : "No reviews need a reply"}</h3>
                  <p>
                    {showAll
                      ? "Customer reviews from Stockport Smiles will appear here."
                      : "Reviews without a business reply will appear here."}
                  </p>
                </div>
              ) : (
                <div className="reviewList">
                  {reviewsToShow.map((review) => (
                    <article className="reviewCard" key={review.id}>
                      <div className="reviewTop">
                        <div>
                          <span>{getReviewLabel(review.status)}</span>
                          <h3>{review.customer_name || "Customer"}</h3>
                          <p>{review.review_text || "No review text."}</p>
                        </div>
                        <strong aria-label={`${review.rating || 0} out of 5`}>
                          <span>{renderStars(review.rating)}</span>
                          {review.rating || 0}/5
                        </strong>
                      </div>

                      <div className="pillRow">
                        <span>{formatSubmittedAt(review.created_at)}</span>
                        {review.customer_email ? (
                          <a href={`mailto:${review.customer_email}`}>
                            Email {review.customer_email}
                          </a>
                        ) : null}
                      </div>

                      <div className="reviewReference">
                        Reference: <strong>{makeReviewReference(review)}</strong>
                      </div>

                      <label htmlFor={`reply-${review.id}`}>
                        Public business reply
                      </label>
                      <textarea
                        id={`reply-${review.id}`}
                        value={replyDrafts[review.id] || ""}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [review.id]: event.target.value,
                          }))
                        }
                        placeholder="Example: Thank you for taking the time to leave us a lovely review. We hope to see you again soon."
                      />

                      <button
                        type="button"
                        onClick={() => saveReviewReply(review.id)}
                        disabled={busyId === review.id}
                      >
                        {busyId === review.id ? "Saving..." : "Save reply"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>

      <style jsx>{`
        /* -------------------------------------------------------------- */
        /* FROMONE SMILES REVIEWS — CLEAN MOBILE + DESKTOP STANDARD         */
        /* Desktop: main-content 38px + shell margin-top 28px              */
        /* Mobile: same fixed width/gap as finished mobile pages           */
        /* -------------------------------------------------------------- */
        :global(body:has(.fromone-smiles-reviews-page)) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        :global(body:has(.fromone-smiles-reviews-page)::before) {
          display: none !important;
          content: none !important;
        }

        :global(body:has(.fromone-smiles-reviews-page) .app-shell),
        :global(body:has(.fromone-smiles-reviews-page) .main-content) {
          background: #f5f7fb !important;
        }

        :global(body:has(.fromone-smiles-reviews-page) .main-content) {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .smilesReviewsPage,
        .smilesReviewsPage * {
          box-sizing: border-box !important;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
        }

        .smilesReviewsPage {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 16px 96px !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
          color: #071b49 !important;
        }

        .reviewsShell {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          min-height: 620px !important;
          margin: 28px auto 0 !important;
          padding: clamp(30px, 4vw, 48px) !important;
          overflow: hidden !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
          color: #071b49 !important;
        }

        .heroTop {
          display: flex !important;
          margin-bottom: 26px !important;
        }

        .backLink {
          width: fit-content !important;
          min-height: 52px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          padding: 0 22px !important;
          color: #071b49 !important;
          background: #ffffff !important;
          box-shadow: 0 10px 24px rgba(7, 27, 73, 0.06) !important;
          font-size: 0.98rem !important;
          font-weight: 800 !important;
          text-decoration: none !important;
        }

        .heroGrid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 260px !important;
          gap: 24px !important;
          align-items: start !important;
          margin-bottom: 30px !important;
        }

        .heroGrid > div:first-child {
          max-width: 760px !important;
        }

        .eyebrow,
        .panelEyebrow,
        .sectionTop span,
        .reviewSummary span,
        .listingCard span {
          margin: 0 !important;
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0 !important;
        }

        h1 {
          max-width: 760px !important;
          margin: 12px 0 14px !important;
          color: #071b49 !important;
          font-size: clamp(3rem, 5.2vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
          font-weight: 800 !important;
          text-align: left !important;
          overflow: visible !important;
        }

        .intro,
        .simplePanel p,
        .reviewTop p,
        .emptyState p {
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
        }

        .listingCard {
          display: grid !important;
          gap: 7px !important;
          padding: 20px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 24px !important;
          background: #fff8fc !important;
        }

        .listingCard strong {
          color: #071b49 !important;
          font-size: 1.6rem !important;
          line-height: 1 !important;
          letter-spacing: -0.04em !important;
          font-weight: 800 !important;
        }

        .listingCard p {
          margin: 0 !important;
          color: #047857 !important;
          font-size: 0.95rem !important;
          font-weight: 800 !important;
        }

        .reviewSummary {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin-bottom: 18px !important;
        }

        .reviewSummary article,
        .simplePanel {
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .reviewSummary article {
          padding: 22px !important;
          background: #fff8fc !important;
          border-color: #ffd2e5 !important;
        }

        .reviewSummary strong {
          display: block !important;
          margin-top: 8px !important;
          color: #071b49 !important;
          font-size: clamp(1.85rem, 3.4vw, 2.25rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
          font-weight: 800 !important;
        }

        .simplePanel {
          display: grid !important;
          gap: 16px !important;
          padding: clamp(20px, 3vw, 30px) !important;
          background: #f7f9fd !important;
        }

        .simplePanel.priority {
          background: #ffffff !important;
          border-color: #dfe5f1 !important;
        }

        .simplePanel h2 {
          margin: 8px 0 0 !important;
          color: #071b49 !important;
          font-size: clamp(1.75rem, 3.4vw, 2.25rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.048em !important;
          font-weight: 800 !important;
        }

        .sectionTop,
        .reviewTop {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 16px !important;
          align-items: start !important;
        }

        .sectionTop h2 {
          margin: 8px 0 0 !important;
        }

        .sectionTop button,
        .reviewCard button {
          min-height: 56px !important;
          border-radius: 999px !important;
          padding: 0 24px !important;
          font: inherit !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .reviewCard button {
          border: 1px solid #f72585 !important;
          color: #ffffff !important;
          background: #f72585 !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.20) !important;
        }

        .sectionTop button {
          border: 1px solid #ffd2e5 !important;
          background: #ffffff !important;
          color: #071b49 !important;
          box-shadow: 0 10px 24px rgba(7, 27, 73, 0.06) !important;
        }

        .reviewList {
          display: grid !important;
          gap: 14px !important;
        }

        .reviewCard {
          display: grid !important;
          gap: 15px !important;
          padding: 22px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .reviewTop span {
          width: fit-content !important;
          min-height: 32px !important;
          display: inline-flex !important;
          align-items: center !important;
          border-radius: 999px !important;
          padding: 0 12px !important;
          color: #047857 !important;
          background: #d1fae5 !important;
          font-size: 0.82rem !important;
          font-weight: 800 !important;
        }

        .reviewTop h3 {
          margin: 10px 0 6px !important;
          color: #071b49 !important;
          font-size: clamp(1.65rem, 3vw, 2.05rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.04em !important;
          font-weight: 800 !important;
        }

        .reviewTop > strong {
          display: grid !important;
          justify-items: end !important;
          gap: 3px !important;
          color: #f72585 !important;
          font-size: 1.05rem !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          font-weight: 800 !important;
        }

        .reviewTop > strong span {
          min-height: auto !important;
          padding: 0 !important;
          color: #f72585 !important;
          background: transparent !important;
          font-size: 1rem !important;
          letter-spacing: 0 !important;
        }

        .pillRow {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
        }

        .pillRow span,
        .pillRow a {
          width: fit-content !important;
          max-width: 100% !important;
          min-height: 38px !important;
          display: inline-flex !important;
          align-items: center !important;
          padding: 0 13px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          color: #071b49 !important;
          background: #ffffff !important;
          font-size: 0.9rem !important;
          font-weight: 700 !important;
          text-decoration: none !important;
          overflow-wrap: anywhere !important;
        }

        .reviewCard label {
          color: #071b49 !important;
          font-size: 0.95rem !important;
          font-weight: 800 !important;
        }

        .reviewCard textarea {
          width: 100% !important;
          min-height: 124px !important;
          resize: vertical !important;
          border: 1px solid #d7e0ee !important;
          border-radius: 20px !important;
          padding: 16px !important;
          color: #071b49 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          font: inherit !important;
          font-size: 1rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
          outline: none !important;
        }

        .reviewCard textarea:focus {
          border-color: #f72585 !important;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.11) !important;
        }

        .reviewCard button:disabled {
          opacity: 0.7 !important;
          cursor: not-allowed !important;
        }

        .emptyState {
          padding: 22px !important;
          border: 1px dashed #ffd2e5 !important;
          border-radius: 22px !important;
          background: #ffffff !important;
          text-align: center !important;
        }

        .emptyState h3 {
          margin: 0 0 7px !important;
          color: #071b49 !important;
          font-size: 1.65rem !important;
          line-height: 1.1 !important;
          letter-spacing: -0.035em !important;
          font-weight: 800 !important;
        }

        @media (max-width: 760px) {
          :global(body:has(.fromone-smiles-reviews-page) .main-content) {
            padding-top: 0 !important;
          }

          .smilesReviewsPage {
            padding: 0 0 130px !important;
          }

          .reviewsShell {
            width: calc(100% - 72px) !important;
            max-width: 468px !important;
            min-height: auto !important;
            margin: 24px auto 0 !important;
            padding: 28px 26px 26px !important;
            border-radius: 26px !important;
            overflow: hidden !important;
          }

          .heroTop {
            margin-bottom: 24px !important;
          }

          .backLink {
            width: fit-content !important;
            max-width: 100% !important;
            min-height: 48px !important;
            padding: 0 18px !important;
          }

          .heroGrid,
          .reviewSummary,
          .sectionTop,
          .reviewTop {
            grid-template-columns: 1fr !important;
          }

          .heroGrid {
            gap: 18px !important;
            margin-bottom: 28px !important;
          }

          h1 {
            margin: 14px 0 18px !important;
            font-size: clamp(2.45rem, 10.2vw, 3.25rem) !important;
            line-height: 0.96 !important;
            letter-spacing: -0.058em !important;
          }

          .intro {
            font-size: 1rem !important;
            line-height: 1.45 !important;
          }

          .listingCard {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .listingCard strong {
            font-size: 1.35rem !important;
          }

          .reviewSummary {
            gap: 12px !important;
            margin-bottom: 14px !important;
          }

          .reviewSummary article {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .reviewSummary strong {
            font-size: 2rem !important;
          }

          .simplePanel,
          .reviewCard {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .simplePanel {
            gap: 14px !important;
          }

          .simplePanel h2,
          .sectionTop h2 {
            font-size: clamp(1.8rem, 8vw, 2.18rem) !important;
            line-height: 1 !important;
          }

          .sectionTop {
            gap: 14px !important;
          }

          .sectionTop button,
          .reviewCard button {
            width: 100% !important;
            min-height: 54px !important;
          }

          .reviewList {
            gap: 12px !important;
          }

          .reviewCard {
            gap: 14px !important;
          }

          .reviewTop {
            gap: 12px !important;
          }

          .reviewTop > strong {
            width: fit-content !important;
            justify-items: start !important;
            padding: 8px 12px !important;
            border: 1px solid #ffd2e5 !important;
            border-radius: 999px !important;
            background: #fff8fc !important;
          }

          .reviewTop h3 {
            font-size: clamp(1.65rem, 7.2vw, 2rem) !important;
            line-height: 1.02 !important;
          }

          .reviewTop p {
            font-size: 0.98rem !important;
            line-height: 1.45 !important;
          }

          .pillRow {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .pillRow span,
          .pillRow a {
            width: 100% !important;
            justify-content: center !important;
            min-height: 42px !important;
            padding: 9px 12px !important;
            white-space: normal !important;
            text-align: center !important;
          }

          .reviewCard textarea {
            min-height: 138px !important;
            border-radius: 18px !important;
            font-size: 0.98rem !important;
          }
        }

        @media (max-width: 420px) {
          .reviewsShell {
            width: calc(100% - 48px) !important;
            padding: 26px 22px 24px !important;
          }

          h1 {
            font-size: clamp(2.32rem, 10.8vw, 3rem) !important;
          }

          .simplePanel,
          .reviewCard {
            padding: 16px !important;
          }
        }

        /* -------------------------------------------------------------- */
        /* SMILES REVIEWS — GRANNY-PROOF LOCK + REFERENCES                 */
        /* -------------------------------------------------------------- */
        .fromone-smiles-reviews-page .lockedNotice {
          border-color: #ffd2e5 !important;
          background:
            radial-gradient(circle at 26px 20px, rgba(255, 212, 59, 0.26), transparent 42%),
            linear-gradient(135deg, #fff8fc, #ffffff) !important;
          text-align: left !important;
        }

        .fromone-smiles-reviews-page .lockedNotice > span {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-smiles-reviews-page .lockedActions {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
          margin-top: 4px !important;
        }

        .fromone-smiles-reviews-page .lockedActions a {
          min-height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          padding: 0 18px !important;
          border: 1px solid #dfe5f1 !important;
          color: #071b49 !important;
          background: #ffffff !important;
          text-decoration: none !important;
          font-size: 0.92rem !important;
          font-weight: 900 !important;
          box-shadow: 0 10px 22px rgba(7, 27, 73, 0.06) !important;
        }

        .fromone-smiles-reviews-page .lockedActions a:first-child {
          color: #ffffff !important;
          border-color: transparent !important;
          background: linear-gradient(135deg, #f72585, #ff7ab8) !important;
          box-shadow: 0 14px 28px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-smiles-reviews-page .reviewReference {
          width: fit-content !important;
          max-width: 100% !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          margin-top: 12px !important;
          padding: 9px 12px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 999px !important;
          background: #fff8fc !important;
          color: #52617a !important;
          font-size: 0.88rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-reviews-page .reviewReference strong {
          color: #071b49 !important;
          font-size: 0.88rem !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: 0.02em !important;
        }

        @media (max-width: 760px) {
          .fromone-smiles-reviews-page .lockedNotice {
            text-align: center !important;
            justify-items: center !important;
          }

          .fromone-smiles-reviews-page .lockedActions {
            width: 100% !important;
            justify-content: center !important;
          }

          .fromone-smiles-reviews-page .lockedActions a {
            width: 100% !important;
            max-width: 280px !important;
          }

          .fromone-smiles-reviews-page .reviewReference {
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }


        /* SMILES REVIEWS — ACTIVE REFERENCE PILL FIX */
        .reviewCard .reviewReference {
          width: fit-content !important;
          max-width: 100% !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          margin: 12px 0 18px !important;
          padding: 9px 12px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 999px !important;
          background: #fff8fc !important;
          color: #52617a !important;
          font-size: 0.88rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
        }

        .reviewCard .reviewReference strong {
          color: #071b49 !important;
          font-size: 0.88rem !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: 0.02em !important;
        }

        @media (max-width: 760px) {
          .reviewCard .reviewReference {
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }

      `}</style>
    </main>
  );
}
