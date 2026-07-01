"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useToast } from "@/app/components/ToastProvider";

type SmilesBooking = {
  id: string;
  status: string | null;
};

type SmilesReview = {
  id: string;
  status: string | null;
  client_reply: string | null;
};

type SmilesBookingHour = {
  day_of_week: number;
  is_closed: boolean | null;
};

type SmilesProfile = {
  business_name: string | null;
  smiles_listing_venue_id: string | null;
};

type SmilesSentOffer = {
  id: string;
  title: string | null;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  saving_text: string | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean | null;
  reference_code: string | null;
  created_at: string | null;
};

type SmilesSentEvent = {
  id: string;
  title: string | null;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  location_name: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  price_text: string | null;
  is_published: boolean | null;
  reference_code: string | null;
  created_at: string | null;
};

type SmilesSentItem = {
  id: string;
  type: "offer" | "event";
  title: string;
  description: string;
  referenceCode: string;
  href: string;
  createdAt: string | null;
  isPublished: boolean;
};

type SmilesResponse = {
  success?: boolean;
  message?: string;
  profile?: SmilesProfile | null;
  bookings?: SmilesBooking[];
  reviews?: SmilesReview[];
  bookingHours?: SmilesBookingHour[];
  sentOffers?: SmilesSentOffer[];
  sentEvents?: SmilesSentEvent[];
  offers?: SmilesSentOffer[];
  events?: SmilesSentEvent[];
};

const confirmedBookingStatuses = ["handled", "completed", "confirmed"];

function isBookingConfirmed(status: string | null) {
  return confirmedBookingStatuses.includes(String(status || "").toLowerCase());
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function getSmilesBaseUrl() {
  return cleanText(process.env.NEXT_PUBLIC_STOCKPORT_SMILES_URL).replace(/\/+$/, "") ||
    "https://www.stockportsmiles.co.uk";
}

function formatSentDate(value: string | null) {
  if (!value) return "Date not available";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export default function SmilesDashboardPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<SmilesProfile | null>(null);
  const [bookings, setBookings] = useState<SmilesBooking[]>([]);
  const [reviews, setReviews] = useState<SmilesReview[]>([]);
  const [bookingHours, setBookingHours] = useState<SmilesBookingHour[]>([]);
  const [sentOffers, setSentOffers] = useState<SmilesSentOffer[]>([]);
  const [sentEvents, setSentEvents] = useState<SmilesSentEvent[]>([]);

  const newBookings = useMemo(
    () => bookings.filter((booking) => !isBookingConfirmed(booking.status)),
    [bookings]
  );

  const reviewsNeedingReply = useMemo(
    () =>
      reviews.filter(
        (review) =>
          review.status === "approved" &&
          !String(review.client_reply || "").trim()
      ),
    [reviews]
  );

  const openDays = useMemo(
    () => bookingHours.filter((hour) => !hour.is_closed).length,
    [bookingHours]
  );

  const sentSmilesItems = useMemo<SmilesSentItem[]>(() => {
    const baseUrl = getSmilesBaseUrl();

    const offers = sentOffers.map((offer) => ({
      id: offer.id,
      type: "offer" as const,
      title: cleanText(offer.title) || "Untitled offer",
      description:
        cleanText(offer.short_description) ||
        cleanText(offer.saving_text) ||
        cleanText(offer.description) ||
        "Offer sent to Stockport Smiles.",
      referenceCode: cleanText(offer.reference_code),
      href: offer.slug ? `${baseUrl}/offers/${offer.slug}` : "",
      createdAt: offer.created_at,
      isPublished: Boolean(offer.is_published),
    }));

    const events = sentEvents.map((event) => ({
      id: event.id,
      type: "event" as const,
      title: cleanText(event.title) || "Untitled event",
      description:
        cleanText(event.short_description) ||
        cleanText(event.location_name) ||
        cleanText(event.description) ||
        "Event sent to Stockport Smiles.",
      referenceCode: cleanText(event.reference_code),
      href: event.slug ? `${baseUrl}/events/${event.slug}` : "",
      createdAt: event.created_at,
      isPublished: Boolean(event.is_published),
    }));

    return [...offers, ...events].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    });
  }, [sentOffers, sentEvents]);

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

  const loadSmiles = async () => {
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "GET",
        headers,
      });
      const result = (await response.json()) as SmilesResponse;

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not load Stockport Smiles.");
      }

      setMessage(result.message || "");
      setProfile(result.profile || null);
      setBookings(result.bookings || []);
      setReviews(result.reviews || []);
      setBookingHours(result.bookingHours || []);
      setSentOffers(result.sentOffers || result.offers || []);
      setSentEvents(result.sentEvents || result.events || []);
    } catch (error: any) {
      const errorMessage = error?.message || "Could not load Stockport Smiles.";
      setMessage(errorMessage);
      showToast({
        type: "error",
        title: "Smiles unavailable",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSmiles();
  }, []);

  return (
    <main className="fromone-smiles-page settings-create-style-page" data-fromone-smiles-redesign="v1">
      <section id="fromone-standard-shell" className="smiles-create-style-card">
        <header className="smiles-create-hero">
          <div className="smiles-create-eyebrow">Stockport Smiles</div>
          <h1>Smiles hub.</h1>
          <p>
            Keep bookings, reviews, offers and events tidy from one simple place.
          </p>
        </header>

        {loading ? (
          <section className="smiles-simple-panel smiles-loading-panel" aria-label="Smiles loading">
            <div className="smiles-panel-head">
              <span className="smiles-step-badge">...</span>
              <div>
                <h2>Loading Smiles</h2>
                <p>Checking your Stockport Smiles listing.</p>
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !profile?.smiles_listing_venue_id ? (
          <section className="smiles-simple-panel smiles-warning-panel">
            <div className="smiles-panel-head">
              <span className="smiles-step-badge">01</span>
              <div>
                <h2>Your listing is not live yet</h2>
                <p>
                  {message ||
                    "Once Smiles admin publishes your business listing, bookings and reviews will appear here."}
                </p>
              </div>
            </div>
            <Link className="smiles-primary-action" href="/settings">
              Check listing status
            </Link>
          </section>
        ) : null}

        {!loading && profile?.smiles_listing_venue_id ? (
          <>
            <section className="smiles-listing-strip">
              <div>
                <span>Your listing</span>
                <h2>{profile.business_name || "Your business"}</h2>
                <p>Live on Stockport Smiles</p>
              </div>
              <Link href="/settings">Listing settings</Link>
            </section>

            <section className="smiles-simple-panel">
              <div className="smiles-panel-head">
                <span className="smiles-step-badge">01</span>
                <div>
                  <h2>Today on Smiles</h2>
                  <p>Open the item you need, deal with it, then carry on.</p>
                </div>
              </div>

              <div className="smiles-action-grid" aria-label="Smiles actions">
                <Link href="/smiles/bookings" className="smiles-action-card is-priority">
                  <span>Bookings</span>
                  <strong>{newBookings.length}</strong>
                  <h3>
                    {newBookings.length === 1
                      ? "1 booking to confirm"
                      : `${newBookings.length} bookings to confirm`}
                  </h3>
                  <p>See customer requests and confirm the bookings you can accept.</p>
                  <em>Manage bookings</em>
                </Link>

                <Link href="/smiles/reviews" className="smiles-action-card">
                  <span>Reviews</span>
                  <strong>{reviewsNeedingReply.length}</strong>
                  <h3>
                    {reviewsNeedingReply.length === 1
                      ? "1 review needs a reply"
                      : `${reviewsNeedingReply.length} reviews need a reply`}
                  </h3>
                  <p>Reply to public Smiles reviews from your customers.</p>
                  <em>Manage reviews</em>
                </Link>

                <Link href="/posts" className="smiles-action-card">
                  <span>Offers & events</span>
                  <strong>{sentSmilesItems.length || "+"}</strong>
                  <h3>Send offers and events</h3>
                  <p>Review FromOne posts, then send suitable updates to Smiles.</p>
                  <em>Review posts</em>
                </Link>

                <Link href="/smiles/booking-times" className="smiles-action-card">
                  <span>Booking times</span>
                  <strong>{openDays || 0}</strong>
                  <h3>{openDays > 0 ? `${openDays} days open` : "Bookings are closed"}</h3>
                  <p>Set the days and times customers can request bookings.</p>
                  <em>Edit times</em>
                </Link>
              </div>
            </section>

            <details className="smiles-simple-panel smiles-history-panel">
              <summary>
                <span className="smiles-step-badge">02</span>
                <div>
                  <h2>Past offers and events</h2>
                  <p>
                    {sentSmilesItems.length > 0
                      ? `${sentSmilesItems.length} sent item${sentSmilesItems.length === 1 ? "" : "s"} with references.`
                      : "Nothing has been sent to Smiles yet."}
                  </p>
                </div>
                <strong>Open</strong>
              </summary>

              {sentSmilesItems.length > 0 ? (
                <div className="smiles-history-grid">
                  {sentSmilesItems.map((item) => (
                    <article key={`${item.type}-${item.id}`} className="smiles-history-card">
                      <div>
                        <span>{item.type === "offer" ? "Offer" : "Event"}</span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>

                      <div className="smiles-history-meta">
                        <strong>{item.referenceCode || "Reference pending"}</strong>
                        <small>{formatSentDate(item.createdAt)}</small>
                        <small>{item.isPublished ? "Live" : "Waiting approval"}</small>
                      </div>

                      {item.href ? (
                        <a href={item.href} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="smiles-empty-history">
                  <h3>No offers or events sent yet</h3>
                  <p>Create a post, choose Offer or Event, then send it to Smiles.</p>
                  <Link href="/posts">Review posts</Link>
                </div>
              )}
            </details>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.fromone-smiles-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-smiles-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-smiles-page) .app-shell,
        body:has(.fromone-smiles-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-smiles-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-smiles-page.settings-create-style-page {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 16px 104px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
          color: #071b49 !important;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          font-weight: 500 !important;
          letter-spacing: -0.01em !important;
        }

        .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          min-height: 620px !important;
          margin: 28px auto 0 !important;
          padding: clamp(30px, 4vw, 48px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          display: block !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
          color: #071b49 !important;
          backdrop-filter: none !important;
        }

        .fromone-smiles-page .smiles-create-hero {
          width: 100% !important;
          max-width: 760px !important;
          margin: 0 0 26px !important;
          padding: 0 !important;
          text-align: left !important;
        }

        .fromone-smiles-page .smiles-create-eyebrow,
        .fromone-smiles-page .smiles-listing-strip span,
        .fromone-smiles-page .smiles-action-card span,
        .fromone-smiles-page .smiles-history-card span {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-smiles-page .smiles-create-hero h1 {
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

        .fromone-smiles-page p {
          color: #52617a !important;
          font-size: 1rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
        }

        .fromone-smiles-page .smiles-create-hero p {
          max-width: 720px !important;
          margin: 0 !important;
          font-size: 1.02rem !important;
        }

        .fromone-smiles-page .smiles-simple-panel,
        .fromone-smiles-page .smiles-listing-strip {
          width: 100% !important;
          max-width: 100% !important;
          margin-top: 18px !important;
          padding: clamp(20px, 3vw, 30px) !important;
          box-sizing: border-box !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #f7f9fd !important;
        }

        .fromone-smiles-page .smiles-listing-strip {
          display: flex !important;
          gap: 18px !important;
          align-items: center !important;
          justify-content: space-between !important;
          background:
            linear-gradient(135deg, rgba(247, 37, 133, 0.045), transparent 46%),
            #fff8fc !important;
          border-color: #ffd2e5 !important;
        }

        .fromone-smiles-page .smiles-listing-strip h2,
        .fromone-smiles-page .smiles-panel-head h2,
        .fromone-smiles-page .smiles-history-panel summary h2 {
          margin: 0 0 6px !important;
          color: #071b49 !important;
          font-size: clamp(1.65rem, 3.4vw, 2.15rem) !important;
          font-weight: 800 !important;
          line-height: 1.05 !important;
          letter-spacing: -0.045em !important;
        }

        .fromone-smiles-page .smiles-listing-strip p,
        .fromone-smiles-page .smiles-panel-head p,
        .fromone-smiles-page .smiles-history-panel summary p {
          margin: 0 !important;
        }

        .fromone-smiles-page .smiles-listing-strip p {
          color: #047857 !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-page .smiles-listing-strip a,
        .fromone-smiles-page .smiles-primary-action,
        .fromone-smiles-page .smiles-action-card em,
        .fromone-smiles-page .smiles-history-card a,
        .fromone-smiles-page .smiles-empty-history a {
          min-height: 54px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 22px !important;
          border: 1px solid #f72585 !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          box-shadow: 0 18px 38px rgba(247, 37, 133, 0.24) !important;
          font: inherit !important;
          font-weight: 800 !important;
          text-decoration: none !important;
        }

        .fromone-smiles-page .smiles-panel-head,
        .fromone-smiles-page .smiles-history-panel summary {
          display: flex !important;
          gap: 12px !important;
          align-items: flex-start !important;
          margin-bottom: 18px !important;
        }

        .fromone-smiles-page .smiles-step-badge {
          display: inline-flex !important;
          width: 34px !important;
          height: 34px !important;
          flex: 0 0 34px !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font-size: 0.78rem !important;
          font-weight: 800 !important;
          box-shadow: 0 12px 26px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-smiles-page .smiles-action-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
        }

        .fromone-smiles-page .smiles-action-card {
          display: grid !important;
          gap: 8px !important;
          min-height: 220px !important;
          padding: 18px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 22px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
          color: #071b49 !important;
          text-decoration: none !important;
        }

        .fromone-smiles-page .smiles-action-card.is-priority {
          border-color: #ffc2dc !important;
          background: linear-gradient(145deg, rgba(247, 37, 133, 0.055), #ffffff) !important;
        }

        .fromone-smiles-page .smiles-action-card strong {
          width: 52px !important;
          height: 52px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font-size: 1.3rem !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-page .smiles-action-card h3,
        .fromone-smiles-page .smiles-history-card h3,
        .fromone-smiles-page .smiles-empty-history h3 {
          margin: 0 !important;
          color: #071b49 !important;
          font-size: clamp(1.35rem, 2.6vw, 1.65rem) !important;
          font-weight: 800 !important;
          line-height: 1.05 !important;
          letter-spacing: -0.035em !important;
        }

        .fromone-smiles-page .smiles-action-card p,
        .fromone-smiles-page .smiles-history-card p,
        .fromone-smiles-page .smiles-empty-history p {
          margin: 0 !important;
        }

        .fromone-smiles-page .smiles-action-card em {
          width: 100% !important;
          margin-top: auto !important;
          box-shadow: 0 12px 26px rgba(247, 37, 133, 0.18) !important;
          font-style: normal !important;
        }

        .fromone-smiles-page .smiles-history-panel {
          overflow: hidden !important;
        }

        .fromone-smiles-page .smiles-history-panel summary {
          margin-bottom: 0 !important;
          cursor: pointer !important;
          list-style: none !important;
        }

        .fromone-smiles-page .smiles-history-panel summary::-webkit-details-marker {
          display: none !important;
        }

        .fromone-smiles-page .smiles-history-panel summary > div {
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }

        .fromone-smiles-page .smiles-history-panel summary > strong {
          min-height: 44px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 16px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          font-size: 0.92rem !important;
          font-weight: 800 !important;
          white-space: nowrap !important;
        }

        .fromone-smiles-page .smiles-history-panel[open] summary {
          margin-bottom: 18px !important;
        }

        .fromone-smiles-page .smiles-history-panel[open] summary > strong {
          background: #f72585 !important;
          color: #ffffff !important;
          border-color: #f72585 !important;
        }

        .fromone-smiles-page .smiles-history-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
        }

        .fromone-smiles-page .smiles-history-card,
        .fromone-smiles-page .smiles-empty-history {
          display: grid !important;
          gap: 12px !important;
          padding: 18px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 22px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .fromone-smiles-page .smiles-history-card p {
          display: -webkit-box !important;
          overflow: hidden !important;
          -webkit-line-clamp: 3 !important;
          -webkit-box-orient: vertical !important;
        }

        .fromone-smiles-page .smiles-history-meta {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
        }

        .fromone-smiles-page .smiles-history-meta strong,
        .fromone-smiles-page .smiles-history-meta small {
          width: fit-content !important;
          border-radius: 999px !important;
          padding: 7px 10px !important;
          border: 1px solid #dfe5f1 !important;
          background: #f7f9fd !important;
          color: #071b49 !important;
          font-size: 0.82rem !important;
          font-weight: 800 !important;
          line-height: 1 !important;
        }

        .fromone-smiles-page .smiles-history-meta strong {
          border-color: #ffd2e5 !important;
          background: #fff8fc !important;
        }

        @media (max-width: 760px) {
          body:has(.fromone-smiles-page) .main-content {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding-top: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-bottom: 0 !important;
            display: block !important;
            box-sizing: border-box !important;
            background: #f5f7fb !important;
            overflow-x: hidden !important;
          }

          html,
          body {
            overflow-x: hidden !important;
            background: #f5f7fb !important;
          }

          .fromone-smiles-page.settings-create-style-page {
            width: 100% !important;
            max-width: none !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 0 112px !important;
            background: #f5f7fb !important;
            display: block !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
            width: calc(100% - 72px) !important;
            max-width: 468px !important;
            min-height: auto !important;
            margin: 24px auto 0 !important;
            padding: 28px 26px 26px !important;
            border-radius: 26px !important;
          }

          .fromone-smiles-page .smiles-create-hero {
            margin-bottom: 32px !important;
          }

          .fromone-smiles-page .smiles-create-hero h1 {
            margin: 14px 0 18px !important;
            font-size: clamp(2.75rem, 11vw, 3.6rem) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.058em !important;
          }

          .fromone-smiles-page .smiles-create-hero p {
            font-size: 1rem !important;
            line-height: 1.45 !important;
          }

          .fromone-smiles-page .smiles-simple-panel,
          .fromone-smiles-page .smiles-listing-strip {
            margin-top: 18px !important;
            padding: 20px !important;
            border-radius: 24px !important;
          }

          .fromone-smiles-page .smiles-panel-head {
            margin-bottom: 22px !important;
          }

          .fromone-smiles-page .smiles-panel-head h2,
          .fromone-smiles-page .smiles-history-panel summary h2 {
            font-size: clamp(1.75rem, 7vw, 2.15rem) !important;
            line-height: 0.98 !important;
          }

          .fromone-smiles-page .smiles-listing-strip,
          .fromone-smiles-page .smiles-action-grid,
          .fromone-smiles-page .smiles-history-grid {
            grid-template-columns: 1fr !important;
          }

          .fromone-smiles-page .smiles-listing-strip {
            display: grid !important;
          }

          .fromone-smiles-page .smiles-listing-strip a,
          .fromone-smiles-page .smiles-primary-action {
            width: 100% !important;
          }

          .fromone-smiles-page .smiles-action-grid {
            gap: 14px !important;
          }

          .fromone-smiles-page .smiles-action-card {
            min-height: auto !important;
          }

          .fromone-smiles-page .smiles-history-panel summary {
            align-items: flex-start !important;
          }

          .fromone-smiles-page .smiles-history-panel summary > strong {
            display: none !important;
          }
        }

        @media (max-width: 420px) {
          .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
            width: calc(100% - 48px) !important;
            padding: 26px 22px 24px !important;
          }
        }
      `}</style>
    </main>
  );
}
