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
        "Offer sent to Stockport Smiles.",
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
        "Event sent to Stockport Smiles.",
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
              ? "Smiles returned an unreadable response. Please refresh and try again."
              : `Smiles request failed with status ${response.status}.`
          );
        }
      }

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            `Could not load Stockport Smiles${
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
    if (initialLoadStartedRef.current) return;

    initialLoadStartedRef.current = true;
    void loadSmiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className="fromone-posts-page fromone-smiles-page settings-create-style-page"
      data-fromone-smiles-redesign="v1"
    >
      <section id="fromone-standard-shell" className="smiles-create-style-card">
        <header className="posts-create-hero smiles-create-hero">
          <span className="posts-create-eyebrow smiles-create-eyebrow">Stockport Smiles</span>
          <h1>Smiles hub.</h1>
          <p>
            Keep bookings, reviews, customer photos, offers and events tidy from one simple place.
          </p>
        </header>

        {loading ? (
          <section
            className="smiles-simple-panel smiles-loading-panel"
            aria-label="Smiles loading"
          >
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
                <Link
                  href="/smiles/bookings"
                  className={`smiles-action-card ${
                    newBookings.length > 0 ? "is-priority" : ""
                  }`}
                >
                  <span>Bookings</span>
                  <strong>{bookings.length}</strong>
                  <h3>
                    {bookings.length === 1
                      ? "1 booking in total"
                      : `${bookings.length} bookings in total`}
                  </h3>
                  <p>
                    {newBookings.length === 1
                      ? "1 booking still needs confirmation."
                      : `${newBookings.length} bookings still need confirmation.`}
                  </p>
                  <em>Manage bookings</em>
                </Link>

                <Link
                  href="/smiles/reviews"
                  className={`smiles-action-card ${
                    reviewsNeedingAttention > 0 ? "is-priority" : ""
                  }`}
                >
                  <span>Reviews</span>
                  <strong>{reviews.length}</strong>
                  <h3>
                    {reviews.length === 1
                      ? "1 review in total"
                      : `${reviews.length} reviews in total`}
                  </h3>
                  <p>
                    {reviewsNeedingAttention === 0
                      ? "No reviews need attention."
                      : `${pendingReviews.length} waiting for approval and ${reviewsNeedingReply.length} needing a reply.`}
                  </p>
                  <em>Manage reviews</em>
                </Link>

                <Link
                  href="/smiles/photos"
                  className={`smiles-action-card ${
                    pendingCustomerPhotos.length > 0 ? "is-priority" : ""
                  }`}
                >
                  <span>Customer photos</span>
                  <strong>{customerPhotos.length}</strong>
                  <h3>
                    {customerPhotos.length === 1
                      ? "1 customer photo in total"
                      : `${customerPhotos.length} customer photos in total`}
                  </h3>
                  <p>
                    {pendingCustomerPhotos.length > 0
                      ? `${pendingCustomerPhotos.length} waiting, ${approvedCustomerPhotos.length} approved and ${rejectedCustomerPhotos.length} rejected.`
                      : `${approvedCustomerPhotos.length} approved and ${rejectedCustomerPhotos.length} rejected. Nothing is waiting.`}
                  </p>
                  <em>Review photos</em>
                </Link>

                <Link
                  href="/smiles/photos"
                  className={`smiles-action-card ${
                    pendingCustomerPhotoReports.length > 0 ? "is-priority" : ""
                  }`}
                >
                  <span>Photo reports</span>
                  <strong>{pendingCustomerPhotoReports.length}</strong>
                  <h3>
                    {pendingCustomerPhotoReports.length === 1
                      ? "1 photo report needs review"
                      : `${pendingCustomerPhotoReports.length} photo reports need review`}
                  </h3>
                  <p>
                    {pendingCustomerPhotoReports.length > 0
                      ? "Open customer photos to review reported content."
                      : "No customer photo reports need attention."}
                  </p>
                  <em>Review reports</em>
                </Link>

                <Link href="/posts" className="smiles-action-card">
                  <span>Offers & events</span>
                  <strong>{sentSmilesItems.length}</strong>
                  <h3>
                    {sentSmilesItems.length === 1
                      ? "1 sent item in total"
                      : `${sentSmilesItems.length} sent items in total`}
                  </h3>
                  <p>
                    {sentSmilesItems.length > 0
                      ? "Open Posts to create another offer or event."
                      : "No offers or events have been sent to Smiles yet."}
                  </p>
                  <em>Review posts</em>
                </Link>

                <Link
                  href="/smiles/booking-times"
                  className="smiles-action-card"
                >
                  <span>Opening & booking hours</span>
                  <strong>{openDays || 0}</strong>
                  <h3>
                    {openDays > 0
                      ? `${openDays} days open`
                      : "Bookings are closed"}
                  </h3>
                  <p>
                    These hours show on your Smiles venue page and control when
                    customers can request bookings.
                  </p>
                  <em>Edit hours</em>
                </Link>
              </div>
            </section>

            <details className="smiles-simple-panel smiles-history-panel">
              <summary>
                <span className="smiles-step-badge">02</span>
                <div>
                  <h2>Smiles offers and events</h2>
                  <p>
                    {sentSmilesItems.length > 0
                      ? `${sentSmilesItems.length} sent item${
                          sentSmilesItems.length === 1 ? "" : "s"
                        } with references.`
                      : "Nothing has been sent to Smiles yet."}
                  </p>
                  <p className="smiles-history-help">
                    View or edit the live Smiles listings for your venue.
                  </p>
                </div>
                <strong>Open</strong>
              </summary>

              {sentSmilesItems.length > 0 ? (
                <div className="smiles-history-grid">
                  {sentSmilesItems.map((item) => (
                    <article
                      key={`${item.type}-${item.id}`}
                      className="smiles-history-card"
                    >
                      <div>
                        <span>{item.type === "offer" ? "Offer" : "Event"}</span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>

                      <div className="smiles-history-meta">
                        <strong>{item.referenceCode || "Reference pending"}</strong>
                        <small>{formatSentDate(item.createdAt)}</small>
                        <small>
                          {item.isExpired
                            ? "Expired"
                            : item.isPublished
                              ? "Live"
                              : "Waiting approval"}
                        </small>
                      </div>

                      <div className="smiles-history-actions">
                        {item.href && item.isPublished && !item.isExpired ? (
                          <a href={item.href} target="_blank" rel="noreferrer">
                            View live page
                          </a>
                        ) : (
                          <button type="button" disabled>
                            {item.isExpired ? "Expired" : "Not live"}
                          </button>
                        )}

                        {item.editHref ? (
                          <Link
                            href={item.editHref}
                            title="Edit this live Stockport Smiles listing directly."
                          >
                            Edit live listing
                          </Link>
                        ) : (
                          <button type="button" disabled>
                            Edit unavailable
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="smiles-empty-history">
                  <h3>No offers or events sent yet</h3>
                  <p>
                    Create a post, choose Offer or Event, then send the live
                    listing to Smiles.
                  </p>
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
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.1) !important;
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
          background: linear-gradient(
            145deg,
            rgba(247, 37, 133, 0.055),
            #ffffff
          ) !important;
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

        .fromone-smiles-page .smiles-history-help {
          margin-top: 6px !important;
          color: #52617a !important;
          font-size: 0.95rem !important;
          font-weight: 700 !important;
        }

        .fromone-smiles-page .smiles-history-actions {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
          margin-top: 4px !important;
        }

        .fromone-smiles-page .smiles-history-actions a,
        .fromone-smiles-page .smiles-history-actions button {
          min-height: 48px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 16px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          font: inherit !important;
          font-weight: 950 !important;
          font-size: 0.95rem !important;
          line-height: 1 !important;
          text-decoration: none !important;
        }

        .fromone-smiles-page .smiles-history-actions a:first-child {
          background: #f72585 !important;
          border-color: #f72585 !important;
          color: #ffffff !important;
        }

        .fromone-smiles-page .smiles-history-actions a:last-child {
          background: #ffffff !important;
          border-color: #dfe5f1 !important;
          color: #071b49 !important;
          box-shadow: none !important;
        }

        .fromone-smiles-page .smiles-history-actions button:disabled {
          background: #f8fafc !important;
          color: #7d8ca3 !important;
          cursor: not-allowed !important;
          opacity: 1 !important;
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
            background: #ffffff !important;
            overflow-x: hidden !important;
          }

          html,
          body {
            overflow-x: hidden !important;
            background: #ffffff !important;
          }

          .fromone-smiles-page.settings-create-style-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 10px 112px !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            display: block !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: auto !important;
            margin: 24px 0 0 !important;
            padding: 28px 26px 26px !important;
            box-sizing: border-box !important;
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
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding: 26px 22px 24px !important;
          }
        }

        /*
         * OUTER MOBILE LAYOUT IS OWNED BY AppShell.
         * Smilez keeps its internal card styling only.
         */
        @media (max-width: 900px) {
          body:has(.fromone-smiles-page) .main-content {
            padding-top: 0 !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .fromone-smiles-page.settings-create-style-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 0 112px !important;
            box-sizing: border-box !important;
          }

          .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        }


        /*
         * FINAL SMILEZ ALIGNMENT
         * AppShell owns all outer spacing. Remove Smilez-only mobile gutter/margin.
         */
        @media (max-width: 900px) {
          body:has(.fromone-smiles-page) .main-content,
          body:has(.fromone-smiles-page) .main-content.fromone-mobile-bottom-safe {
            padding-top: 14px !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
            box-sizing: border-box !important;
          }

          .fromone-smiles-page.settings-create-style-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 0 112px !important;
            box-sizing: border-box !important;
          }

          .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        }


        /*
         * Smilez was receiving the 14px mobile top gap twice:
         * once from main-content and once from the universal page frame.
         */
        @media (max-width: 900px) {
          .fromone-route-smiles .fromone-universal-mobile-page-frame {
            padding-top: 0 !important;
          }

          body:has(.fromone-smiles-page) .main-content,
          body:has(.fromone-smiles-page) .main-content.fromone-mobile-bottom-safe {
            padding-top: 14px !important;
          }
        }


        /* FINAL SHARED FROMONE PAGE SYSTEM */
        body:has(.fromone-smiles-page) {
          background: #ffffff !important;
        }

        body:has(.fromone-smiles-page) .app-shell,
        body:has(.fromone-smiles-page) .main-content {
          background: #ffffff !important;
        }

        body:has(.fromone-smiles-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          overflow-x: hidden !important;
        }

        .fromone-smiles-page.settings-create-style-page {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          overflow: visible !important;
        }

        .fromone-smiles-page #fromone-standard-shell.smiles-create-style-card {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          display: grid !important;
          gap: 22px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .fromone-smiles-page .smiles-create-hero {
          width: 100% !important;
          max-width: 790px !important;
          margin: 0 0 6px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .fromone-smiles-page .smiles-create-hero h1 {
          max-width: 760px !important;
          margin: 0 0 12px !important;
          color: var(--posts-navy) !important;
          font-size: clamp(2.6rem, 5vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.06em !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-page .smiles-create-hero p {
          max-width: 720px !important;
          margin: 0 !important;
          color: var(--posts-muted) !important;
          font-size: 1.03rem !important;
          line-height: 1.56 !important;
          font-weight: 500 !important;
        }

        .fromone-smiles-page .smiles-create-eyebrow {
          display: block !important;
          margin: 0 0 10px !important;
          color: var(--posts-pink) !important;
          font-size: 0.74rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
        }

        .fromone-smiles-page .smiles-simple-panel,
        .fromone-smiles-page .smiles-listing-strip {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 22px !important;
          border: 1px solid var(--posts-border) !important;
          border-radius: 26px !important;
          background: #ffffff !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .fromone-smiles-page .smiles-listing-strip {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: var(--posts-border) !important;
        }

        .fromone-smiles-page .smiles-action-grid,
        .fromone-smiles-page .smiles-history-grid {
          gap: 16px !important;
        }

        .fromone-smiles-page .smiles-action-card,
        .fromone-smiles-page .smiles-history-card,
        .fromone-smiles-page .smiles-empty-history {
          border: 1px solid var(--posts-border) !important;
          border-radius: 22px !important;
          background: #fff !important;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055) !important;
        }

        .fromone-smiles-page .smiles-action-card.is-priority {
          border-color: rgba(247, 37, 133, 0.28) !important;
          background: #fff !important;
          box-shadow:
            0 0 0 3px rgba(247, 37, 133, 0.08),
            0 14px 34px rgba(7, 27, 73, 0.07) !important;
        }

        .fromone-smiles-page .smiles-listing-strip a,
        .fromone-smiles-page .smiles-primary-action,
        .fromone-smiles-page .smiles-action-card em,
        .fromone-smiles-page .smiles-history-card a,
        .fromone-smiles-page .smiles-empty-history a {
          min-height: 46px !important;
          padding: 0 17px !important;
          border-radius: 15px !important;
          border: 0 !important;
          background: var(--posts-pink) !important;
          color: #fff !important;
          box-shadow: 0 10px 24px rgba(247, 37, 133, 0.21) !important;
          font-size: 0.86rem !important;
          font-weight: 900 !important;
        }

        .fromone-smiles-page .smiles-history-actions a,
        .fromone-smiles-page .smiles-history-actions button,
        .fromone-smiles-page .smiles-history-panel summary > strong {
          min-height: 46px !important;
          padding: 0 17px !important;
          border-radius: 15px !important;
          font-size: 0.86rem !important;
          font-weight: 900 !important;
        }

        .fromone-smiles-page .smiles-history-actions a:last-child,
        .fromone-smiles-page .smiles-history-panel summary > strong {
          border: 1px solid var(--posts-border) !important;
          background: #fff !important;
          color: var(--posts-navy) !important;
          box-shadow: none !important;
        }

        @media (max-width: 700px) {
          body:has(.fromone-smiles-page),
          body:has(.fromone-smiles-page) .app-shell,
          body:has(.fromone-smiles-page) .main-content,
          body:has(.fromone-smiles-page) .main-content.fromone-mobile-bottom-safe,
          .fromone-smiles-page.settings-create-style-page,
          .fromone-route-smiles .fromone-universal-mobile-page-frame {
            background: #ffffff !important;
            background-image: none !important;
          }

          body:has(.fromone-smiles-page) .main-content,
          body:has(.fromone-smiles-page) .main-content.fromone-mobile-bottom-safe {
            padding: 24px 16px 100px !important;
          }

          .fromone-smiles-page.settings-create-style-page {
            padding: 0 !important;
          }

          .fromone-smiles-page .smiles-create-hero h1 {
            font-size: clamp(2.25rem, 11vw, 3rem) !important;
          }

          .fromone-smiles-page .smiles-create-hero p {
            font-size: 0.95rem !important;
          }

          .fromone-smiles-page .smiles-simple-panel,
          .fromone-smiles-page .smiles-listing-strip {
            padding: 17px !important;
            border-radius: 21px !important;
          }

          .fromone-smiles-page .smiles-action-grid,
          .fromone-smiles-page .smiles-history-grid {
            grid-template-columns: 1fr !important;
          }
        }

      `}</style>
    </main>
  );
}