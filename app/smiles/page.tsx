"use client";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "../posts/posts-companion-shared.css";
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

type SmilesCustomerPhoto = {
  id: string;
  status: string | null;
};

type SmilesCustomerPhotoReport = {
  id: string;
  photo_id: string;
  status: string | null;
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
  fromone_post_id?: string | null;
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
  fromone_post_id?: string | null;
  created_at: string | null;
};

type SmilesSentItem = {
  id: string;
  type: "offer" | "event";
  title: string;
  description: string;
  referenceCode: string;
  href: string;
  editHref: string;
  isExpired: boolean;
  createdAt: string | null;
  isPublished: boolean;
};

type SmilesResponse = {
  success?: boolean;
  message?: string;
  profile?: SmilesProfile | null;
  bookings?: SmilesBooking[];
  reviews?: SmilesReview[];
  customerPhotos?: SmilesCustomerPhoto[];
  photos?: SmilesCustomerPhoto[];
  customerPhotoReports?: SmilesCustomerPhotoReport[];
  photoReports?: SmilesCustomerPhotoReport[];
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
  return (
    cleanText(process.env.NEXT_PUBLIC_STOCKPORT_SMILEZ_URL) ||
    cleanText(process.env.NEXT_PUBLIC_STOCKPORT_SMILES_URL) ||
    "https://www.stockportsmilez.co.uk"
  ).replace(/\/+$/, "");
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

function getDirectSmilesEditHref(
  type: "offer" | "event",
  id: string | null | undefined
) {
  const cleanId = cleanText(id);
  return cleanId ? `/smiles/edit/${type}/${cleanId}` : "";
}

function isPastDatedItem(startDate?: string | null, endDate?: string | null) {
  const relevantDate = cleanText(endDate || startDate);

  if (!relevantDate) return false;

  const parsedDate = new Date(`${relevantDate.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDate.setHours(0, 0, 0, 0);

  return parsedDate < today;
}

export default function SmilesDashboardPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<SmilesProfile | null>(null);
  const [bookings, setBookings] = useState<SmilesBooking[]>([]);
  const [reviews, setReviews] = useState<SmilesReview[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<SmilesCustomerPhoto[]>([]);
  const [customerPhotoReports, setCustomerPhotoReports] = useState<
    SmilesCustomerPhotoReport[]
  >([]);
  const [bookingHours, setBookingHours] = useState<SmilesBookingHour[]>([]);
  const [sentOffers, setSentOffers] = useState<SmilesSentOffer[]>([]);
  const [sentEvents, setSentEvents] = useState<SmilesSentEvent[]>([]);
  const initialLoadStartedRef = useRef(false);

  const newBookings = useMemo(
    () => bookings.filter((booking) => !isBookingConfirmed(booking.status)),
    [bookings]
  );

  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status === "pending"),
    [reviews]
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

  const reviewsNeedingAttention = pendingReviews.length + reviewsNeedingReply.length;

  const pendingCustomerPhotos = useMemo(
    () => customerPhotos.filter((photo) => photo.status === "pending"),
    [customerPhotos]
  );

  const approvedCustomerPhotos = useMemo(
    () => customerPhotos.filter((photo) => photo.status === "approved"),
    [customerPhotos]
  );

  const rejectedCustomerPhotos = useMemo(
    () => customerPhotos.filter((photo) => photo.status === "rejected"),
    [customerPhotos]
  );

  const pendingCustomerPhotoReports = useMemo(
    () =>
      customerPhotoReports.filter(
        (report) => String(report.status || "").toLowerCase() === "pending"
      ),
    [customerPhotoReports]
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
        "Offer sent to Stockport Smilez.",
      referenceCode: cleanText(offer.reference_code),
      href: offer.slug ? `${baseUrl}/offers/${offer.slug}` : "",
      editHref: getDirectSmilesEditHref("offer", offer.id),
      isExpired: isPastDatedItem(offer.start_date, offer.end_date),
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
        "Event sent to Stockport Smilez.",
      referenceCode: cleanText(event.reference_code),
      href: event.slug ? `${baseUrl}/events/${event.slug}` : "",
      editHref: getDirectSmilesEditHref("event", event.id),
      isExpired: isPastDatedItem(event.start_date, event.end_date),
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
        cache: "no-store",
      });

      const responseText = await response.text();
      let result: SmilesResponse = {};

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as SmilesResponse;
        } catch {
          throw new Error(
            response.ok
              ? "Smilez returned an unreadable response. Please refresh and try again."
              : `Smilez request failed with status ${response.status}.`
          );
        }
      }

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            `Could not load Stockport Smilez${
              response.status ? ` (${response.status})` : ""
            }.`
        );
      }

      setMessage(result.message || "");
      setProfile(result.profile || null);
      setBookings(result.bookings || []);
      setReviews(result.reviews || []);
      setCustomerPhotos(result.customerPhotos || result.photos || []);
      setCustomerPhotoReports(
        result.customerPhotoReports || result.photoReports || []
      );
      setBookingHours(result.bookingHours || []);
      setSentOffers(result.sentOffers || result.offers || []);
      setSentEvents(result.sentEvents || result.events || []);
    } catch (error: any) {
      const errorMessage = error?.message || "Could not load Stockport Smilez.";
      setMessage(errorMessage);
      showToast({
        type: "error",
        title: "Smilez unavailable",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoadStartedRef.current) return;

    initialLoadStartedRef.current = true;
    void loadSmiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className="fromone-posts-page fromone-smiles-page settings-create-style-page"
      data-fromone-smiles-redesign="simple-agency"
    >
      <section id="fromone-standard-shell" className="smiles-create-style-card">
        <header className="smiles-simple-hero">
          <span className="smiles-eyebrow">Smilez</span>
          <h1>Manage Smilez.</h1>
          <p>Bookings, reviews, photos and your live listings in one place.</p>
        </header>

        {loading ? (
          <section className="smiles-status-card" aria-label="Smilez loading">
            <strong>Loading Smilez…</strong>
            <span>Checking your listing.</span>
          </section>
        ) : null}

        {!loading && !profile?.smiles_listing_venue_id ? (
          <section className="smiles-status-card is-warning">
            <div>
              <strong>Your listing is not live yet</strong>
              <span>
                {message ||
                  "Once your Smilez listing is published, bookings, reviews and customer activity will appear here."}
              </span>
            </div>
            <Link href="/settings">Check listing</Link>
          </section>
        ) : null}

        {!loading && profile?.smiles_listing_venue_id ? (
          <>
            <section className="smiles-listing-summary">
              <div>
                <span className="smiles-eyebrow">Your listing</span>
                <h2>{profile.business_name || "Your business"}</h2>
                <p>Live on Smilez</p>
              </div>
              <Link href="/settings">Settings</Link>
            </section>

            <section className="smiles-action-list" aria-label="Smilez actions">
              <Link
                href="/smiles/bookings"
                className={`smiles-action-row ${newBookings.length > 0 ? "is-priority" : ""}`}
              >
                <div>
                  <strong>Bookings</strong>
                  <span>
                    {newBookings.length > 0
                      ? `${newBookings.length} need confirmation`
                      : "Nothing needs attention"}
                  </span>
                </div>
                <b>{bookings.length}</b>
                <em>→</em>
              </Link>

              <Link
                href="/smiles/reviews"
                className={`smiles-action-row ${reviewsNeedingAttention > 0 ? "is-priority" : ""}`}
              >
                <div>
                  <strong>Reviews</strong>
                  <span>
                    {reviewsNeedingAttention > 0
                      ? `${reviewsNeedingAttention} need attention`
                      : "Nothing needs attention"}
                  </span>
                </div>
                <b>{reviews.length}</b>
                <em>→</em>
              </Link>

              <Link
                href="/smiles/photos"
                className={`smiles-action-row ${
                  pendingCustomerPhotos.length > 0 || pendingCustomerPhotoReports.length > 0
                    ? "is-priority"
                    : ""
                }`}
              >
                <div>
                  <strong>Customer photos</strong>
                  <span>
                    {pendingCustomerPhotos.length > 0 || pendingCustomerPhotoReports.length > 0
                      ? `${pendingCustomerPhotos.length + pendingCustomerPhotoReports.length} need review`
                      : "Nothing needs attention"}
                  </span>
                </div>
                <b>{customerPhotos.length}</b>
                <em>→</em>
              </Link>

              <Link href="/smiles/booking-times" className="smiles-action-row">
                <div>
                  <strong>Opening & booking hours</strong>
                  <span>{openDays > 0 ? `${openDays} days open` : "Bookings are closed"}</span>
                </div>
                <em>→</em>
              </Link>
            </section>

            <section className="smiles-secondary-links" aria-label="More Smilez options">
              <Link href="/smiles/insights">
                <strong>Customer insights</strong>
                <span>View activity</span>
              </Link>
            </section>

            <details className="smiles-history">
              <summary>
                <div>
                  <strong>Offers & events</strong>
                  <span>
                    {sentSmilesItems.length === 0
                      ? "No live items yet"
                      : `${sentSmilesItems.length} item${sentSmilesItems.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <b>View</b>
              </summary>

              {sentSmilesItems.length > 0 ? (
                <div className="smiles-history-list">
                  {sentSmilesItems.map((item) => (
                    <article key={`${item.type}-${item.id}`} className="smiles-history-item">
                      <div className="smiles-history-copy">
                        <span className="smiles-eyebrow">{item.type === "offer" ? "Offer" : "Event"}</span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <small>
                          {item.isExpired
                            ? "Expired"
                            : item.isPublished
                              ? "Live"
                              : "Waiting approval"}
                          {item.createdAt ? ` · ${formatSentDate(item.createdAt)}` : ""}
                        </small>
                      </div>

                      <div className="smiles-history-actions">
                        {item.editHref ? <Link href={item.editHref}>Edit</Link> : null}
                        {item.href && item.isPublished && !item.isExpired ? (
                          <a href={item.href} target="_blank" rel="noreferrer">
                            View live
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="smiles-history-empty">
                  <p>Create an offer or event from the Create flow, then publish it to Smilez during review.</p>
                  <Link href="/create">Create content</Link>
                </div>
              )}
            </details>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.fromone-smiles-page),
        body:has(.fromone-smiles-page) .app-shell,
        body:has(.fromone-smiles-page) .main-content,
        body:has(.fromone-smiles-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-smiles-page) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-smiles-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-smiles-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 90px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-smiles-page.settings-create-style-page {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          color: #071b49 !important;
          background: transparent !important;
          font-family: var(--font-main), "Plus Jakarta Sans", ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }

        .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
          width: 100% !important;
          max-width: 980px !important;
          margin: 0 auto !important;
          padding: 0 !important;
          display: grid !important;
          gap: 16px !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .smiles-simple-hero {
          margin: 0 0 4px;
        }

        .smiles-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .smiles-simple-hero h1 {
          margin: 0 0 10px;
          color: #071b49;
          font-size: clamp(2.45rem, 5vw, 4rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .smiles-simple-hero p {
          max-width: 650px;
          margin: 0;
          color: #66728a;
          font-size: 1rem;
          line-height: 1.5;
          font-weight: 600;
        }

        .smiles-status-card,
        .smiles-listing-summary,
        .smiles-action-row,
        .smiles-secondary-links,
        .smiles-history {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          box-shadow: none;
        }

        .smiles-status-card,
        .smiles-listing-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
          border-radius: 18px;
        }

        .smiles-status-card {
          color: #52617a;
        }

        .smiles-status-card > div {
          display: grid;
          gap: 4px;
        }

        .smiles-status-card strong {
          color: #071b49;
          font-size: 1rem;
          font-weight: 900;
        }

        .smiles-status-card span {
          font-size: 0.88rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .smiles-status-card.is-warning {
          border-color: #ffd2e5;
          background: #fffafd;
        }

        .smiles-status-card a,
        .smiles-listing-summary a,
        .smiles-history-empty a {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 15px;
          border: 1px solid #f72585;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff !important;
          font-size: 0.8rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: none !important;
          white-space: nowrap;
        }

        .smiles-listing-summary h2 {
          margin: 0 0 4px;
          color: #071b49;
          font-size: 1.45rem;
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 900;
        }

        .smiles-listing-summary p {
          margin: 0;
          color: #138a5b;
          font-size: 0.84rem;
          font-weight: 800;
        }

        .smiles-action-list {
          display: grid;
          gap: 8px;
        }

        .smiles-action-row {
          min-height: 76px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          color: #071b49;
          text-decoration: none;
          transition: border-color 140ms ease, background 140ms ease;
        }

        .smiles-action-row:hover {
          border-color: rgba(247, 37, 133, 0.35);
        }

        .smiles-action-row.is-priority {
          border-color: #ffc6df;
          background: #fffafd;
        }

        .smiles-action-row > div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .smiles-action-row strong {
          color: #071b49;
          font-size: 0.98rem;
          font-weight: 900;
        }

        .smiles-action-row span {
          color: #718096;
          font-size: 0.8rem;
          line-height: 1.35;
          font-weight: 650;
        }

        .smiles-action-row b {
          min-width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #f7f9fc;
          color: #071b49;
          font-size: 0.82rem;
          font-weight: 900;
        }

        .smiles-action-row.is-priority b {
          background: #f72585;
          color: #ffffff;
        }

        .smiles-action-row em {
          color: #f72585;
          font-size: 1rem;
          font-style: normal;
          font-weight: 900;
        }

        .smiles-secondary-links {
          padding: 4px;
          border-radius: 16px;
        }

        .smiles-secondary-links a {
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          color: #071b49;
          text-decoration: none;
        }

        .smiles-secondary-links a strong {
          font-size: 0.9rem;
          font-weight: 900;
        }

        .smiles-secondary-links a span {
          color: #f72585;
          font-size: 0.8rem;
          font-weight: 850;
        }

        .smiles-history {
          overflow: hidden;
          border-radius: 18px;
        }

        .smiles-history summary {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 16px;
          cursor: pointer;
          list-style: none;
        }

        .smiles-history summary::-webkit-details-marker {
          display: none;
        }

        .smiles-history summary > div {
          display: grid;
          gap: 3px;
        }

        .smiles-history summary strong {
          color: #071b49;
          font-size: 0.96rem;
          font-weight: 900;
        }

        .smiles-history summary span {
          color: #718096;
          font-size: 0.8rem;
          font-weight: 650;
        }

        .smiles-history summary b {
          color: #f72585;
          font-size: 0.8rem;
          font-weight: 900;
        }

        .smiles-history-list {
          display: grid;
          gap: 8px;
          padding: 0 12px 12px;
        }

        .smiles-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px;
          border: 1px solid #e5e9f1;
          border-radius: 14px;
          background: #fbfcfe;
        }

        .smiles-history-copy {
          min-width: 0;
        }

        .smiles-history-copy h3 {
          margin: 0 0 5px;
          color: #071b49;
          font-size: 1rem;
          line-height: 1.2;
          font-weight: 900;
        }

        .smiles-history-copy p {
          display: -webkit-box;
          margin: 0 0 6px;
          overflow: hidden;
          color: #66728a;
          font-size: 0.8rem;
          line-height: 1.4;
          font-weight: 600;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .smiles-history-copy small {
          color: #7d8ca3;
          font-size: 0.72rem;
          font-weight: 750;
        }

        .smiles-history-actions {
          flex: 0 0 auto;
          display: flex;
          gap: 7px;
        }

        .smiles-history-actions a {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49 !important;
          font-size: 0.75rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: none !important;
        }

        .smiles-history-actions a:last-child {
          border-color: #f72585;
          background: #f72585;
          color: #ffffff !important;
        }

        .smiles-history-empty {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 0 16px 16px;
        }

        .smiles-history-empty p {
          margin: 0;
          color: #66728a;
          font-size: 0.82rem;
          line-height: 1.4;
          font-weight: 600;
        }

        @media (max-width: 700px) {
          body:has(.fromone-smiles-page) .main-content,
          body:has(.fromone-smiles-page) .main-content.fromone-mobile-bottom-safe {
            padding: 18px 10px 100px !important;
          }

          .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
            max-width: 100% !important;
            gap: 12px !important;
          }

          .smiles-simple-hero h1 {
            font-size: 2.25rem;
          }

          .smiles-simple-hero p {
            font-size: 0.9rem;
          }

          .smiles-listing-summary,
          .smiles-status-card {
            padding: 15px;
            border-radius: 16px;
          }

          .smiles-action-row {
            min-height: 70px;
            gap: 10px;
            padding: 12px 14px;
          }

          .smiles-history-item {
            align-items: flex-start;
            flex-direction: column;
          }

          .smiles-history-actions {
            width: 100%;
          }

          .smiles-history-actions a {
            flex: 1 1 0;
          }

          .smiles-history-empty {
            align-items: stretch;
            flex-direction: column;
          }

          .smiles-history-empty a {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}