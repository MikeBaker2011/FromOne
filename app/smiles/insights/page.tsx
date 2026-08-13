"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SmilezBackButton from "@/app/components/SmilezBackButton";
import "../../posts/posts-companion-shared.css";
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
    <main className="customer-insights-page fromone-smiles-insights-page">
      <section id="fromone-standard-shell" className="customerInsightsShell">
        <header className="customerInsightsHero">
          <div>
            <span className="customerInsightsEyebrow">Smilez</span>
            <h1>Customer insights.</h1>
            <p>See what customers are doing around your Smilez listing.</p>
          </div>
          <SmilezBackButton />
        </header>

        {loading ? (
          <section className="customerInsightsStatus">
            <strong>Loading insights…</strong>
            <span>Checking your latest Smilez activity.</span>
          </section>
        ) : null}

        {!loading && !profile?.smiles_listing_venue_id ? (
          <section className="customerInsightsStatus isWarning">
            <div>
              <strong>Your Smilez listing is not live yet</strong>
              <span>
                {message ||
                  "Customer insights will appear once your business listing is live."}
              </span>
            </div>
            <Link href="/settings">Check listing</Link>
          </section>
        ) : null}

        {!loading && profile?.smiles_listing_venue_id ? (
          <>
            <section className="customerInsightsToolbar">
              <div className="customerInsightsListing">
                <strong>{profile.business_name || "Your business"}</strong>
                <span>Live on Smilez</span>
              </div>

              <button type="button" onClick={() => void loadInsights()}>
                Refresh
              </button>
            </section>

            <section className="customerInsightsPrimary" aria-label="Customer activity">
              <article>
                <span>Bookings</span>
                <strong>{bookings.length}</strong>
                <small>{confirmedBookings} confirmed</small>
              </article>

              <article>
                <span>Reviews</span>
                <strong>{reviews.length}</strong>
                <small>{approvedReviews} approved</small>
              </article>

              <article>
                <span>Photos</span>
                <strong>{customerPhotos.length}</strong>
                <small>{approvedPhotos} approved</small>
              </article>

              <article>
                <span>Live content</span>
                <strong>{liveOffers + liveEvents}</strong>
                <small>{liveOffers} offers · {liveEvents} events</small>
              </article>
            </section>

            <section className="customerInsightsNext">
              <div>
                <span className="customerInsightsEyebrow">Next action</span>
                <h2>{suggestedAction.title}</h2>
                <p>{suggestedAction.text}</p>
              </div>
              <Link href={suggestedAction.href}>{suggestedAction.action}</Link>
            </section>

            <section className="customerInsightsEngagement">
              <div className="customerInsightsSectionHead">
                <div>
                  <h2>Smilez engagement</h2>
                  <p>How customers are discovering and planning with your business.</p>
                </div>

                <div className="customerInsightsRange" aria-label="Insight date range">
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

              <div className="customerInsightsRows">
                {[
                  ["Venue views", engagement.venue_views],
                  ["Offer views", engagement.offer_views],
                  ["Event views", engagement.event_views],
                  ["Favourites", engagement.favourites],
                  ["Plan additions", engagement.plan_additions],
                  ["Booking starts", engagement.booking_starts],
                ].map(([label, value]) => (
                  <div className="customerInsightsRow" key={String(label)}>
                    <span>{label}</span>
                    <strong>{Number(value)}</strong>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.fromone-smiles-insights-page),
        body:has(.fromone-smiles-insights-page) .app-shell,
        body:has(.fromone-smiles-insights-page) .main-content,
        body:has(.fromone-smiles-insights-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-smiles-insights-page) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-smiles-insights-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-smiles-insights-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 90px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .customer-insights-page {
          width: 100%;
          max-width: 100%;
          margin: 0;
          color: #071b49;
          background: transparent !important;
          font-family: var(--font-main), "Plus Jakarta Sans", ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .customerInsightsShell {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .customerInsightsHero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .customerInsightsEyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .customerInsightsHero h1 {
          margin: 0 0 9px;
          color: #071b49;
          font-size: clamp(2.4rem, 5vw, 3.9rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .customerInsightsHero p {
          margin: 0;
          color: #66728a;
          font-size: 0.96rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .customerInsightsStatus,
        .customerInsightsToolbar,
        .customerInsightsNext,
        .customerInsightsEngagement {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .customerInsightsStatus {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .customerInsightsStatus > div {
          display: grid;
          gap: 3px;
        }

        .customerInsightsStatus strong {
          color: #071b49;
          font-size: 0.94rem;
          font-weight: 900;
        }

        .customerInsightsStatus span {
          color: #66728a;
          font-size: 0.8rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .customerInsightsStatus.isWarning {
          border-color: #ffd2e5;
          background: #fffafd;
        }

        .customerInsightsStatus a,
        .customerInsightsNext a {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: none !important;
        }

        .customerInsightsStatus a {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49 !important;
        }

        .customerInsightsToolbar {
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
        }

        .customerInsightsListing {
          display: grid;
          gap: 2px;
        }

        .customerInsightsListing strong {
          color: #071b49;
          font-size: 0.92rem;
          font-weight: 900;
        }

        .customerInsightsListing span {
          color: #138a5b;
          font-size: 0.74rem;
          font-weight: 800;
        }

        .customerInsightsToolbar button {
          min-height: 40px;
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

        .customerInsightsPrimary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .customerInsightsPrimary article {
          min-height: 112px;
          display: grid;
          align-content: center;
          gap: 5px;
          padding: 14px;
          border: 1px solid #e3e8f1;
          border-radius: 16px;
          background: #fbfcfe;
        }

        .customerInsightsPrimary span {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .customerInsightsPrimary strong {
          color: #071b49;
          font-size: 1.8rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .customerInsightsPrimary small {
          color: #718096;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .customerInsightsNext {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px;
        }

        .customerInsightsNext h2 {
          margin: 0 0 4px;
          color: #071b49;
          font-size: 1.08rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .customerInsightsNext p {
          max-width: 620px;
          margin: 0;
          color: #718096;
          font-size: 0.8rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .customerInsightsNext a {
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff !important;
        }

        .customerInsightsEngagement {
          padding: 16px;
        }

        .customerInsightsSectionHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .customerInsightsSectionHead h2 {
          margin: 0 0 4px;
          color: #071b49;
          font-size: 1.18rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .customerInsightsSectionHead p {
          margin: 0;
          color: #718096;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .customerInsightsRange {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .customerInsightsRange button {
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.72rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .customerInsightsRange button.isActive {
          border-color: #f72585;
          background: #f72585;
          color: #ffffff;
        }

        .customerInsightsRows {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .customerInsightsRow {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 12px;
          border: 1px solid #edf1f7;
          border-radius: 12px;
          background: #fbfcfe;
        }

        .customerInsightsRow span {
          color: #52617a;
          font-size: 0.78rem;
          font-weight: 750;
        }

        .customerInsightsRow strong {
          color: #071b49;
          font-size: 0.92rem;
          font-weight: 900;
        }

        @media (max-width: 700px) {
          body:has(.fromone-smiles-insights-page) .main-content,
          body:has(.fromone-smiles-insights-page) .main-content.fromone-mobile-bottom-safe {
            padding: 18px 10px 100px !important;
          }

          .customerInsightsShell {
            max-width: 100%;
            gap: 12px;
          }

          .customerInsightsHero {
            display: grid;
            gap: 12px;
          }

          .customerInsightsHero h1 {
            font-size: 2.2rem;
          }

          .customerInsightsPrimary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .customerInsightsNext {
            align-items: stretch;
            flex-direction: column;
          }

          .customerInsightsNext a {
            width: 100%;
          }

          .customerInsightsSectionHead {
            flex-direction: column;
          }

          .customerInsightsRange {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .customerInsightsRange button {
            width: 100%;
          }

          .customerInsightsRows {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}