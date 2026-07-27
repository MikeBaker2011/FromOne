"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "../posts/posts-companion-shared.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useToast } from "@/app/components/ToastProvider";

type SmilezBooking = {
  id: string;
  status: string | null;
};

type SmilezReview = {
  id: string;
  status: string | null;
  client_reply: string | null;
};

type SmilezCustomerPhoto = {
  id: string;
  status: string | null;
};

type SmilezSentOffer = {
  id: string;
  is_published: boolean | null;
};

type SmilezSentEvent = {
  id: string;
  is_published: boolean | null;
};

type SmilezProfile = {
  business_name: string | null;
  smiles_listing_venue_id: string | null;
};

type SmilezResponse = {
  success?: boolean;
  message?: string;
  profile?: SmilezProfile | null;
  bookings?: SmilezBooking[];
  reviews?: SmilezReview[];
  customerPhotos?: SmilezCustomerPhoto[];
  photos?: SmilezCustomerPhoto[];
  sentOffers?: SmilezSentOffer[];
  sentEvents?: SmilezSentEvent[];
  offers?: SmilezSentOffer[];
  events?: SmilezSentEvent[];
};

type InsightCard = {
  label: string;
  value: number;
  description: string;
};

type EngagementTotals = {
  venue_views: number;
  offer_views: number;
  event_views: number;
  favourites: number;
  plan_additions: number;
  booking_starts: number;
};

const emptyEngagementTotals: EngagementTotals = {
  venue_views: 0,
  offer_views: 0,
  event_views: 0,
  favourites: 0,
  plan_additions: 0,
  booking_starts: 0,
};

function cleanStatus(value: string | null) {
  return String(value || "").trim().toLowerCase();
}

export default function CustomerInsightsPage() {
  const { showToast } = useToast();
  const initialLoadStartedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<SmilezProfile | null>(null);
  const [bookings, setBookings] = useState<SmilezBooking[]>([]);
  const [reviews, setReviews] = useState<SmilezReview[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<SmilezCustomerPhoto[]>([]);
  const [sentOffers, setSentOffers] = useState<SmilezSentOffer[]>([]);
  const [sentEvents, setSentEvents] = useState<SmilezSentEvent[]>([]);
  const [rangeDays, setRangeDays] = useState(30);
  const [engagement, setEngagement] =
    useState<EngagementTotals>(emptyEngagementTotals);

  const confirmedBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        ["handled", "completed", "confirmed"].includes(cleanStatus(booking.status))
      ).length,
    [bookings]
  );

  const approvedReviews = useMemo(
    () => reviews.filter((review) => cleanStatus(review.status) === "approved").length,
    [reviews]
  );

  const approvedPhotos = useMemo(
    () =>
      customerPhotos.filter((photo) => cleanStatus(photo.status) === "approved").length,
    [customerPhotos]
  );

  const liveOffers = useMemo(
    () => sentOffers.filter((offer) => Boolean(offer.is_published)).length,
    [sentOffers]
  );

  const liveEvents = useMemo(
    () => sentEvents.filter((event) => Boolean(event.is_published)).length,
    [sentEvents]
  );

  const insightCards = useMemo<InsightCard[]>(
    () => [
      {
        label: "Bookings",
        value: bookings.length,
        description:
          bookings.length === 1
            ? "1 customer booking has been received."
            : `${bookings.length} customer bookings have been received.`,
      },
      {
        label: "Confirmed visits",
        value: confirmedBookings,
        description:
          confirmedBookings === 1
            ? "1 booking has been confirmed or completed."
            : `${confirmedBookings} bookings have been confirmed or completed.`,
      },
      {
        label: "Customer reviews",
        value: reviews.length,
        description:
          approvedReviews === 1
            ? "1 approved review is helping customers choose you."
            : `${approvedReviews} approved reviews are helping customers choose you.`,
      },
      {
        label: "Customer photos",
        value: customerPhotos.length,
        description:
          approvedPhotos === 1
            ? "1 approved customer photo is available."
            : `${approvedPhotos} approved customer photos are available.`,
      },
      {
        label: "Live offers",
        value: liveOffers,
        description:
          liveOffers === 1
            ? "1 offer is currently published on Smilez."
            : `${liveOffers} offers are currently published on Smilez.`,
      },
      {
        label: "Live events",
        value: liveEvents,
        description:
          liveEvents === 1
            ? "1 event is currently published on Smilez."
            : `${liveEvents} events are currently published on Smilez.`,
      },
    ],
    [
      approvedPhotos,
      approvedReviews,
      bookings.length,
      confirmedBookings,
      customerPhotos.length,
      liveEvents,
      liveOffers,
      reviews.length,
    ]
  );

  const strongestResult = useMemo(() => {
    const results = [
      {
        value: confirmedBookings,
        title: "Confirmed customer visits",
        text: "Bookings are turning into confirmed or completed visits.",
      },
      {
        value: approvedReviews,
        title: "Approved customer reviews",
        text: "Customer feedback is building trust around your business.",
      },
      {
        value: approvedPhotos,
        title: "Approved customer photos",
        text: "Real customer photos are strengthening your Smilez listing.",
      },
      {
        value: liveOffers + liveEvents,
        title: "Live offers and events",
        text: "Your active content is giving customers more reasons to visit.",
      },
    ].sort((a, b) => b.value - a.value);

    return results[0];
  }, [approvedPhotos, approvedReviews, confirmedBookings, liveEvents, liveOffers]);

  const suggestedAction = useMemo(() => {
    if (liveOffers + liveEvents === 0) {
      return {
        title: "Publish an offer or event",
        text: "Give customers a fresh reason to discover and visit your business.",
        href: "/create",
        action: "Create content",
      };
    }

    if (reviews.length > approvedReviews) {
      return {
        title: "Review customer feedback",
        text: "Check anything waiting for approval and reply where a response would help.",
        href: "/smiles/reviews",
        action: "Open reviews",
      };
    }

    if (customerPhotos.length > approvedPhotos) {
      return {
        title: "Review customer photos",
        text: "Approve suitable customer photos so they can support your public listing.",
        href: "/smiles/photos",
        action: "Open photos",
      };
    }

    return {
      title: "Keep your listing active",
      text: "Add another timely offer, event or customer update while your listing is in good shape.",
      href: "/create",
      action: "Create something new",
    };
  }, [
    approvedPhotos,
    approvedReviews,
    customerPhotos.length,
    liveEvents,
    liveOffers,
    reviews.length,
  ]);

  const loadInsights = async () => {
    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch("/api/smiles/business", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const responseText = await response.text();
      let result: SmilezResponse = {};

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as SmilezResponse;
        } catch {
          throw new Error("Smilez returned an unreadable response.");
        }
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not load customer insights.");
      }

      setMessage(result.message || "");
      setProfile(result.profile || null);
      setBookings(result.bookings || []);
      setReviews(result.reviews || []);
      setCustomerPhotos(result.customerPhotos || result.photos || []);
      setSentOffers(result.sentOffers || result.offers || []);
      setSentEvents(result.sentEvents || result.events || []);

      const venueId = result.profile?.smiles_listing_venue_id;

      if (venueId) {
        const engagementResponse = await fetch(
          "/api/insights/smilez-engagement",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              businessId: venueId,
              days: rangeDays,
            }),
          }
        );

        const engagementResult = await engagementResponse.json();

        if (!engagementResponse.ok || engagementResult?.success === false) {
          console.error(
            "Could not load Smilez engagement:",
            engagementResult?.message || "Unknown error"
          );
        } else {
          const totals = engagementResult?.totals || {};

          setEngagement({
            venue_views: Number(totals.venue_views || 0),
            offer_views: Number(totals.offer_views || 0),
            event_views: Number(totals.event_views || 0),
            favourites: Number(totals.favourites || 0),
            plan_additions: Number(totals.plan_additions || 0),
            booking_starts: Number(totals.booking_starts || 0),
          });
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Could not load customer insights.";
      setMessage(errorMessage);
      showToast({
        type: "error",
        title: "Insights unavailable",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoadStartedRef.current) return;

    initialLoadStartedRef.current = true;
    void loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  return (
    <main className="customer-insights-page">
      <header className="customer-insights-hero">
        <div>
          <span className="customer-insights-eyebrow">Customer insights</span>
          <h1>See the activity around your business.</h1>
          <p>
            A simple view of the real bookings, reviews, customer photos, offers and
            events already connected to your Smilez listing.
          </p>
        </div>

        <Link href="/smiles" className="customer-insights-secondary-action">
          Open Smilez hub
        </Link>
      </header>

      {loading ? (
        <section className="customer-insights-state">
          <span>Loading</span>
          <h2>Checking your customer activity</h2>
          <p>Your latest Smilez information is being collected.</p>
        </section>
      ) : null}

      {!loading && !profile?.smiles_listing_venue_id ? (
        <section className="customer-insights-state customer-insights-warning">
          <span>Listing needed</span>
          <h2>Customer insights will appear when your Smilez listing is connected.</h2>
          <p>
            {message ||
              "Once your business listing is live, FromOne will show the real activity connected to it."}
          </p>
          <Link href="/settings">Check business settings</Link>
        </section>
      ) : null}

      {!loading && profile?.smiles_listing_venue_id ? (
        <>
          <section className="customer-insights-listing">
            <div>
              <span>Live business</span>
              <h2>{profile.business_name || "Your business"}</h2>
              <p>Current totals from your connected Smilez listing.</p>
            </div>
            <button type="button" onClick={() => void loadInsights()}>
              Refresh insights
            </button>
          </section>

          <section className="customer-insights-grid" aria-label="Customer insight totals">
            {insightCards.map((card) => (
              <article className="customer-insight-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.description}</p>
              </article>
            ))}
          </section>

          <section className="customer-insights-summary-grid">
            <article className="customer-insights-summary">
              <span>Strongest result</span>
              <div className="customer-insights-result-number">
                {strongestResult.value}
              </div>
              <h2>{strongestResult.title}</h2>
              <p>
                {strongestResult.value > 0
                  ? strongestResult.text
                  : "Customer activity will build here as people interact with your listing."}
              </p>
            </article>

            <article className="customer-insights-summary customer-insights-next">
              <span>Suggested next action</span>
              <h2>{suggestedAction.title}</h2>
              <p>{suggestedAction.text}</p>
              <Link href={suggestedAction.href}>{suggestedAction.action}</Link>
            </article>
          </section>

          <section className="customer-insights-engagement">
            <div className="customer-insights-engagement-head">
              <div>
                <span>Smilez engagement</span>
                <h2>How customers are discovering and planning with you</h2>
              </div>
              <div className="customer-insights-range" aria-label="Insight date range">
                {[
                  { label: "7 days", value: 7 },
                  { label: "30 days", value: 30 },
                  { label: "All time", value: 0 },
                ].map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    className={rangeDays === range.value ? "isActive" : ""}
                    onClick={() => setRangeDays(range.value)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="customer-insights-grid">
              {[
                ["Venue views", engagement.venue_views, "People who opened your venue page."],
                ["Offer views", engagement.offer_views, "People who opened one of your offers."],
                ["Event views", engagement.event_views, "People who opened one of your events."],
                ["Favourites", engagement.favourites, "Times customers saved your content."],
                ["Plan additions", engagement.plan_additions, "Times customers added you to a day or night plan."],
                ["Booking starts", engagement.booking_starts, "Times customers started a booking journey."],
              ].map(([label, value, description]) => (
                <article className="customer-insight-card" key={String(label)}>
                  <span>{label}</span>
                  <strong>{Number(value)}</strong>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <style jsx global>{`
        body:has(.customer-insights-page) {
          background: #f5f7fb !important;
        }

        body:has(.customer-insights-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          box-sizing: border-box !important;
          background: #f5f7fb !important;
        }

        .customer-insights-page {
          width: 100%;
          color: #071b49;
          font-family: var(--font-main), "Plus Jakarta Sans", ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .customer-insights-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .customer-insights-hero > div {
          max-width: 780px;
        }

        .customer-insights-eyebrow,
        .customer-insights-listing span,
        .customer-insight-card span,
        .customer-insights-summary > span,
        .customer-insights-note span,
        .customer-insights-state > span {
          display: block;
          margin-bottom: 10px;
          color: #f72585;
          font-size: 0.74rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .customer-insights-hero h1 {
          max-width: 760px;
          margin: 0 0 14px;
          color: #071b49;
          font-size: clamp(2.6rem, 5vw, 4.45rem);
          line-height: 0.96;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .customer-insights-hero p,
        .customer-insights-listing p,
        .customer-insight-card p,
        .customer-insights-summary p,
        .customer-insights-note p,
        .customer-insights-state p {
          margin: 0;
          color: #52617a;
          font-size: 1rem;
          line-height: 1.55;
          font-weight: 600;
        }

        .customer-insights-secondary-action,
        .customer-insights-state a,
        .customer-insights-next a,
        .customer-insights-listing button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 17px;
          border-radius: 15px;
          font: inherit;
          font-size: 0.86rem;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .customer-insights-secondary-action,
        .customer-insights-listing button {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49;
          box-shadow: none;
        }

        .customer-insights-listing,
        .customer-insights-state,
        .customer-insights-note,
        .customer-insights-engagement {
          padding: 22px;
          border: 1px solid #dfe5f1;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055);
        }

        .customer-insights-listing {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .customer-insights-listing h2,
        .customer-insights-summary h2,
        .customer-insights-note h2,
        .customer-insights-state h2 {
          margin: 0 0 8px;
          color: #071b49;
          font-size: clamp(1.55rem, 3vw, 2rem);
          line-height: 1.04;
          letter-spacing: -0.045em;
          font-weight: 900;
        }

        .customer-insights-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .customer-insight-card {
          min-height: 210px;
          display: flex;
          flex-direction: column;
          padding: 22px;
          border: 1px solid #dfe5f1;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055);
        }

        .customer-insight-card strong {
          margin: 6px 0 18px;
          color: #071b49;
          font-size: clamp(3rem, 6vw, 4.75rem);
          line-height: 0.9;
          letter-spacing: -0.065em;
          font-weight: 900;
        }

        .customer-insight-card p {
          margin-top: auto;
          font-size: 0.94rem;
        }

        .customer-insights-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .customer-insights-summary {
          min-height: 250px;
          padding: 24px;
          border: 1px solid #dfe5f1;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055);
        }

        .customer-insights-result-number {
          width: 66px;
          height: 66px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 4px 0 22px;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          font-size: 1.55rem;
          font-weight: 900;
        }

        .customer-insights-next {
          display: flex;
          flex-direction: column;
          background: #fff8fc;
          border-color: #ffd2e5;
        }

        .customer-insights-next a,
        .customer-insights-state a {
          width: fit-content;
          margin-top: auto;
          border: 0;
          background: #f72585;
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(247, 37, 133, 0.21);
        }

        .customer-insights-engagement {
          margin-top: 16px;
        }

        .customer-insights-engagement-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .customer-insights-engagement-head span {
          display: block;
          margin-bottom: 10px;
          color: #f72585;
          font-size: 0.74rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .customer-insights-engagement-head h2 {
          margin: 0;
          color: #071b49;
          font-size: clamp(1.55rem, 3vw, 2rem);
          line-height: 1.04;
          letter-spacing: -0.045em;
          font-weight: 900;
        }

        .customer-insights-range {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .customer-insights-range button {
          min-height: 40px;
          padding: 0 13px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #fff;
          color: #071b49;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 900;
          cursor: pointer;
        }

        .customer-insights-range button.isActive {
          border-color: #f72585;
          background: #f72585;
          color: #fff;
        }

        .customer-insights-note {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: 24px;
          align-items: center;
          margin-top: 16px;
          background: #f7f9fd;
          box-shadow: none;
        }

        .customer-insights-note h2 {
          margin-bottom: 0;
        }

        .customer-insights-state {
          max-width: 760px;
        }

        .customer-insights-warning {
          border-color: #ffd2e5;
          background: #fff8fc;
        }

        .customer-insights-state a {
          margin-top: 18px;
        }

        @media (max-width: 900px) {
          body:has(.customer-insights-page) .main-content,
          body:has(.customer-insights-page) .main-content.fromone-mobile-bottom-safe {
            padding: 24px 16px 100px !important;
          }

          .customer-insights-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .customer-insights-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .customer-insights-hero h1 {
            font-size: clamp(2.25rem, 11vw, 3rem);
          }

          .customer-insights-secondary-action,
          .customer-insights-listing button {
            width: 100%;
          }

          .customer-insights-listing,
          .customer-insights-summary-grid,
          .customer-insights-note {
            grid-template-columns: 1fr;
          }

          .customer-insights-listing {
            display: grid;
          }

          .customer-insights-engagement-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .customer-insights-grid {
            grid-template-columns: 1fr;
          }

          .customer-insight-card {
            min-height: 180px;
          }

          .customer-insights-summary {
            min-height: 230px;
          }
        }
      `}</style>
    </main>
  );
}