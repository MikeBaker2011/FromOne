"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useToast } from "@/app/components/ToastProvider";

type SmilesBooking = {
  id: string;
  reference_code?: string | null;
  booking_reference?: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  booking_date: string | null;
  booking_time: string | null;
  party_size: number | null;
  notes: string | null;
  status: string | null;
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
  bookings?: SmilesBooking[];
};

const confirmedBookingStatuses = ["handled", "completed", "confirmed"];

function isBookingConfirmed(status: string | null) {
  return confirmedBookingStatuses.includes(String(status || "").toLowerCase());
}

function formatDate(value: string | null) {
  if (!value) return "Date not set";

  const parsedDate = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function formatTime(value: string | null) {
  if (!value) return "Time not set";
  return value.slice(0, 5);
}

function formatPartySize(value: number | null) {
  const count = value || 1;
  return `${count} ${count === 1 ? "person" : "people"}`;
}

function makeBookingReference(booking: SmilesBooking) {
  const existing = cleanContactHref(
    booking.reference_code || booking.booking_reference || ""
  ).toUpperCase();

  if (existing) return existing;

  const fallback = cleanContactHref(booking.id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();

  return fallback ? `SM-BK-${fallback}` : "SM-BK";
}

function cleanContactHref(value: string) {
  return value.replace(/\s+/g, "");
}

function BookingContactDetails({ booking }: { booking: SmilesBooking }) {
  const hasPhone = Boolean(String(booking.customer_phone || "").trim());
  const hasEmail = Boolean(String(booking.customer_email || "").trim());

  return (
    <div className="detailBox contactBox">
      <span>Customer contact</span>
      {hasPhone || hasEmail ? (
        <div className="contactRow">
          {hasPhone ? (
            <a href={`tel:${cleanContactHref(booking.customer_phone || "")}`}>
              Call {booking.customer_phone}
            </a>
          ) : null}
          {hasEmail ? (
            <a href={`mailto:${booking.customer_email}`}>
              Email {booking.customer_email}
            </a>
          ) : null}
        </div>
      ) : (
        <p>No phone or email provided.</p>
      )}
    </div>
  );
}

function BookingNoteDetails({ booking }: { booking: SmilesBooking }) {
  return (
    <div className="detailBox noteBox">
      <span>Customer note</span>
      <p>{booking.notes ? booking.notes : "No customer note provided."}</p>
    </div>
  );
}

export default function SmilesBookingsPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SmilesProfile | null>(null);
  const [smilesEligibility, setSmilesEligibility] =
    useState<SmilesEligibility | null>(null);
  const [bookings, setBookings] = useState<SmilesBooking[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showConfirmed, setShowConfirmed] = useState(false);

  const isSmilesLocked =
    smilesEligibility?.eligible === false || profile?.smiles_eligible === false;

  const smilesLockedTitle =
    smilesEligibility?.label ||
    profile?.smiles_eligibility_label ||
    "Stockport Smiles bookings are not available";

  const smilesLockedMessage =
    smilesEligibility?.message ||
    profile?.smiles_eligibility_message ||
    "Stockport Smiles is for Stockport businesses. You can still use FromOne for Facebook and Instagram posts.";

  const newBookings = useMemo(
    () => bookings.filter((booking) => !isBookingConfirmed(booking.status)),
    [bookings]
  );

  const confirmedBookings = useMemo(
    () => bookings.filter((booking) => isBookingConfirmed(booking.status)),
    [bookings]
  );

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

  const loadBookings = async () => {
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "GET",
        headers,
      });
      const result = (await response.json()) as SmilesResponse;

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not load bookings.");
      }

      setProfile(result.profile || null);
      setSmilesEligibility(result.smilesEligibility || null);
      setBookings(result.bookings || []);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Bookings unavailable",
        message: error?.message || "Could not load bookings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async (bookingId: string) => {
    setBusyId(bookingId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_booking_handled",
          bookingId,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not confirm booking.");
      }

      showToast({
        type: "success",
        title: "Booking confirmed",
        message:
          result.message ||
          "The booking is confirmed and this time has been blocked.",
      });

      await loadBookings();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Booking not confirmed",
        message: error?.message || "Could not confirm booking.",
      });
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="fromone-smiles-bookings-page fromoneSmilesBookingsPage" data-smiles-bookings-page="simple">
      <section id="fromone-standard-shell" className="bookingsShell">
        <Link href="/smiles" className="backLink">
          Back to Smiles
        </Link>

        <header className="bookingsHero">
          <span>Bookings</span>
          <h1>Bookings. Keep it simple.</h1>
          <p>
            New customer requests appear here. Confirm the bookings you can accept.
          </p>
        </header>

        {loading ? (
          <section className="noticeCard">
            <h2>Loading bookings...</h2>
            <p>Checking your Stockport Smiles booking requests.</p>
          </section>
        ) : null}

        {!loading && isSmilesLocked ? (
          <section className="noticeCard lockedNotice">
            <span>Stockport only</span>
            <h2>{smilesLockedTitle}</h2>
            <p>{smilesLockedMessage}</p>
            <div className="lockedActions">
              <Link href="/settings">Update business address</Link>
              <Link href="/posts">Create a normal post</Link>
            </div>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && !profile?.smiles_listing_venue_id ? (
          <section className="noticeCard">
            <h2>Your Smiles listing is not live yet</h2>
            <p>
              Bookings will appear here once your Stockport Smiles listing is live.
            </p>
            <div className="lockedActions">
              <Link href="/settings">Check business details</Link>
              <Link href="/smiles">Back to Smiles</Link>
            </div>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && profile?.smiles_listing_venue_id ? (
          <>
            <section className="summaryGrid" aria-label="Booking summary">
              <article>
                <span>To confirm</span>
                <strong>{newBookings.length}</strong>
              </article>
              <article>
                <span>Confirmed</span>
                <strong>{confirmedBookings.length}</strong>
              </article>
            </section>

            <section className="bookingPanel">
              <div className="panelTop">
                <div>
                  <span>Do this first</span>
                  <h2>New bookings</h2>
                </div>
              </div>

              {newBookings.length === 0 ? (
                <div className="emptyState">
                  <h3>No new bookings</h3>
                  <p>New requests from Stockport Smiles will appear here.</p>
                </div>
              ) : (
                <div className="bookingList">
                  {newBookings.map((booking) => (
                    <article className="bookingCard" key={booking.id}>
                      <div className="bookingMain">
                        <div className="bookingDate">
                          <strong>{formatTime(booking.booking_time)}</strong>
                          <span>{formatDate(booking.booking_date)}</span>
                        </div>

                        <div className="bookingDetails">
                          <h3>{booking.customer_name || "Customer"}</h3>
                          <p>{formatPartySize(booking.party_size)}</p>
                          <div className="bookingReference">
                            Reference: <strong>{makeBookingReference(booking)}</strong>
                          </div>
                        </div>
                      </div>

                      <BookingContactDetails booking={booking} />
                      <BookingNoteDetails booking={booking} />

                      <button
                        type="button"
                        className="primaryButton"
                        onClick={() => confirmBooking(booking.id)}
                        disabled={busyId === booking.id}
                      >
                        {busyId === booking.id ? "Confirming..." : "Confirm booking"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="bookingPanel confirmedPanel">
              <div className="panelTop">
                <div>
                  <span>Already done</span>
                  <h2>Confirmed bookings</h2>
                </div>
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => setShowConfirmed((current) => !current)}
                >
                  {showConfirmed ? "Hide" : "Show"}
                </button>
              </div>

              {showConfirmed ? (
                confirmedBookings.length === 0 ? (
                  <div className="emptyState">
                    <h3>No confirmed bookings yet</h3>
                    <p>Confirmed bookings will be kept here.</p>
                  </div>
                ) : (
                  <div className="confirmedList">
                    {confirmedBookings.map((booking) => (
                      <article className="confirmedCard" key={booking.id}>
                        <div className="confirmedHeader">
                          <div>
                            <strong>{booking.customer_name || "Customer"}</strong>
                            <span>
                              {formatDate(booking.booking_date)} at{" "}
                              {formatTime(booking.booking_time)}
                            </span>
                            <small>Reference: {makeBookingReference(booking)}</small>
                          </div>
                          <em>{formatPartySize(booking.party_size)}</em>
                        </div>

                        <BookingContactDetails booking={booking} />
                        <BookingNoteDetails booking={booking} />
                      </article>
                    ))}
                  </div>
                )
              ) : (
                <p className="smallHelp">
                  Keep this hidden unless you need to check an old booking.
                </p>
              )}
            </section>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        /* -------------------------------------------------------------- */
        /* FROMONE SMILES BOOKINGS — APPROVED STANDARD                     */
        /* Desktop: main-content 38px + shell margin-top 28px              */
        /* Mobile: same fixed width/gap as finished mobile pages           */
        /* -------------------------------------------------------------- */
        body:has(.fromone-smiles-bookings-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-smiles-bookings-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-smiles-bookings-page) .app-shell,
        body:has(.fromone-smiles-bookings-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-smiles-bookings-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-smiles-bookings-page,
        .fromone-smiles-bookings-page * {
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

        .fromone-smiles-bookings-page.fromoneSmilesBookingsPage {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 16px 90px !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
          color: #071b49 !important;
        }

        .fromone-smiles-bookings-page #fromone-standard-shell.bookingsShell {
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

        .fromone-smiles-bookings-page .backLink {
          width: fit-content !important;
          min-height: 52px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 0 26px !important;
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

        .fromone-smiles-bookings-page .bookingsHero {
          width: 100% !important;
          max-width: 760px !important;
          margin: 0 0 30px !important;
          padding: 0 !important;
          text-align: left !important;
        }

        .fromone-smiles-bookings-page .bookingsHero span,
        .fromone-smiles-bookings-page .panelTop span,
        .fromone-smiles-bookings-page .summaryGrid span,
        .fromone-smiles-bookings-page .noteBox span,
        .fromone-smiles-bookings-page .detailBox span {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-smiles-bookings-page .bookingsHero h1 {
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

        .fromone-smiles-bookings-page .bookingsHero p,
        .fromone-smiles-bookings-page .noticeCard p,
        .fromone-smiles-bookings-page .emptyState p,
        .fromone-smiles-bookings-page .smallHelp,
        .fromone-smiles-bookings-page .detailBox p {
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
        }

        .fromone-smiles-bookings-page .summaryGrid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin-bottom: 18px !important;
        }

        .fromone-smiles-bookings-page .summaryGrid article,
        .fromone-smiles-bookings-page .bookingPanel,
        .fromone-smiles-bookings-page .noticeCard {
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .fromone-smiles-bookings-page .summaryGrid article {
          padding: 22px !important;
          background: #fff8fc !important;
          border-color: #ffd2e5 !important;
        }

        .fromone-smiles-bookings-page .summaryGrid strong {
          display: block !important;
          margin-top: 8px !important;
          color: #071b49 !important;
          font-size: clamp(1.85rem, 3.4vw, 2.25rem) !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: -0.045em !important;
        }

        .fromone-smiles-bookings-page .bookingPanel,
        .fromone-smiles-bookings-page .noticeCard {
          display: grid !important;
          gap: 18px !important;
          margin-top: 18px !important;
          padding: clamp(20px, 3vw, 30px) !important;
          background: #f7f9fd !important;
        }

        .fromone-smiles-bookings-page .confirmedPanel {
          background: #ffffff !important;
          border-color: #dfe5f1 !important;
        }

        .fromone-smiles-bookings-page .panelTop {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 16px !important;
        }

        .fromone-smiles-bookings-page .panelTop h2,
        .fromone-smiles-bookings-page .noticeCard h2 {
          margin: 8px 0 0 !important;
          color: #071b49 !important;
          font-size: clamp(1.75rem, 3.4vw, 2.25rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.048em !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-bookings-page .bookingList,
        .fromone-smiles-bookings-page .confirmedList {
          display: grid !important;
          gap: 14px !important;
        }

        .fromone-smiles-bookings-page .bookingCard,
        .fromone-smiles-bookings-page .confirmedCard {
          display: grid !important;
          gap: 16px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          padding: 22px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .fromone-smiles-bookings-page .bookingMain {
          display: grid !important;
          grid-template-columns: 190px minmax(0, 1fr) !important;
          gap: 18px !important;
          align-items: start !important;
        }

        .fromone-smiles-bookings-page .bookingDate {
          display: grid !important;
          gap: 6px !important;
          border-radius: 22px !important;
          padding: 18px !important;
          background: #fff8fc !important;
          border: 1px solid #ffd2e5 !important;
        }

        .fromone-smiles-bookings-page .bookingDate strong {
          color: #f72585 !important;
          font-size: clamp(1.75rem, 3vw, 2.1rem) !important;
          line-height: 1 !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-bookings-page .bookingDate span {
          color: #52617a !important;
          font-size: 0.94rem !important;
          line-height: 1.35 !important;
          font-weight: 700 !important;
        }

        .fromone-smiles-bookings-page .bookingDetails h3,
        .fromone-smiles-bookings-page .emptyState h3 {
          margin: 0 !important;
          color: #071b49 !important;
          font-size: clamp(1.65rem, 3vw, 2.05rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.04em !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-bookings-page .bookingDetails p {
          margin: 8px 0 0 !important;
          color: #52617a !important;
          font-size: 1rem !important;
          font-weight: 700 !important;
        }

        .fromone-smiles-bookings-page .contactRow {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          margin-top: 14px !important;
        }

        .fromone-smiles-bookings-page .contactRow a {
          max-width: 100% !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          padding: 9px 12px !important;
          color: #071b49 !important;
          background: #ffffff !important;
          font-size: 0.9rem !important;
          font-weight: 800 !important;
          text-decoration: none !important;
          overflow-wrap: anywhere !important;
        }

        .fromone-smiles-bookings-page .detailBox {
          border-radius: 18px !important;
          padding: 16px !important;
          background: #fff8fc !important;
          border: 1px solid #ffd2e5 !important;
        }

        .fromone-smiles-bookings-page .primaryButton,
        .fromone-smiles-bookings-page .secondaryButton {
          min-height: 56px !important;
          border-radius: 999px !important;
          padding: 0 24px !important;
          font: inherit !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .fromone-smiles-bookings-page .primaryButton {
          width: 100% !important;
          border: 1px solid #f72585 !important;
          color: #ffffff !important;
          background: #f72585 !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.20) !important;
        }

        .fromone-smiles-bookings-page .secondaryButton {
          color: #071b49 !important;
          background: #ffffff !important;
          border: 1px solid #ffd2e5 !important;
        }

        .fromone-smiles-bookings-page button:disabled {
          cursor: not-allowed !important;
          opacity: 0.65 !important;
        }

        .fromone-smiles-bookings-page .emptyState {
          border: 1px dashed #ffd2e5 !important;
          border-radius: 22px !important;
          padding: 22px !important;
          background: #ffffff !important;
          text-align: center !important;
        }

        .fromone-smiles-bookings-page .confirmedHeader {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 16px !important;
        }

        .fromone-smiles-bookings-page .confirmedHeader div {
          display: grid !important;
          gap: 5px !important;
        }

        .fromone-smiles-bookings-page .confirmedHeader strong {
          color: #071b49 !important;
          font-size: 1.35rem !important;
          line-height: 1.05 !important;
          font-weight: 800 !important;
        }

        .fromone-smiles-bookings-page .confirmedHeader span,
        .fromone-smiles-bookings-page .confirmedHeader em {
          color: #52617a !important;
          font-size: 0.98rem !important;
          font-style: normal !important;
          font-weight: 700 !important;
        }

        @media (max-width: 760px) {
          body:has(.fromone-smiles-bookings-page) .main-content {
            padding-top: 0 !important;
          }

          .fromone-smiles-bookings-page.fromoneSmilesBookingsPage {
            padding: 0 0 130px !important;
          }

          .fromone-smiles-bookings-page #fromone-standard-shell.bookingsShell {
            width: calc(100% - 72px) !important;
            max-width: 468px !important;
            min-height: auto !important;
            margin: 24px auto 0 !important;
            padding: 28px 26px 26px !important;
            border-radius: 26px !important;
          }

          .fromone-smiles-bookings-page .backLink {
            width: fit-content !important;
            max-width: 100% !important;
            margin-bottom: 26px !important;
          }

          .fromone-smiles-bookings-page .bookingsHero {
            margin-bottom: 32px !important;
          }

          .fromone-smiles-bookings-page .bookingsHero h1 {
            margin: 14px 0 18px !important;
            font-size: clamp(2.75rem, 11vw, 3.6rem) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.058em !important;
          }

          .fromone-smiles-bookings-page .bookingsHero p {
            font-size: 1rem !important;
            line-height: 1.45 !important;
          }

          .fromone-smiles-bookings-page .summaryGrid,
          .fromone-smiles-bookings-page .bookingMain {
            grid-template-columns: 1fr !important;
          }

          .fromone-smiles-bookings-page .bookingPanel,
          .fromone-smiles-bookings-page .noticeCard {
            padding: 20px !important;
            border-radius: 24px !important;
          }

          .fromone-smiles-bookings-page .panelTop {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .fromone-smiles-bookings-page .secondaryButton {
            width: 100% !important;
          }

          .fromone-smiles-bookings-page .bookingCard,
          .fromone-smiles-bookings-page .confirmedCard {
            padding: 20px !important;
          }

          .fromone-smiles-bookings-page .confirmedHeader {
            display: grid !important;
          }
        }

        @media (max-width: 420px) {
          .fromone-smiles-bookings-page #fromone-standard-shell.bookingsShell {
            width: calc(100% - 48px) !important;
            padding: 26px 22px 24px !important;
          }
        }

        /* -------------------------------------------------------------- */
        /* SMILES BOOKINGS — GRANNY-PROOF LOCK + REFERENCES                */
        /* -------------------------------------------------------------- */
        .fromone-smiles-bookings-page .lockedNotice {
          border-color: #ffd2e5 !important;
          background:
            radial-gradient(circle at 26px 20px, rgba(255, 212, 59, 0.26), transparent 42%),
            linear-gradient(135deg, #fff8fc, #ffffff) !important;
          text-align: left !important;
        }

        .fromone-smiles-bookings-page .lockedNotice > span {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-smiles-bookings-page .lockedActions {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
          margin-top: 4px !important;
        }

        .fromone-smiles-bookings-page .lockedActions a {
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

        .fromone-smiles-bookings-page .lockedActions a:first-child {
          color: #ffffff !important;
          border-color: transparent !important;
          background: linear-gradient(135deg, #f72585, #ff7ab8) !important;
          box-shadow: 0 14px 28px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-smiles-bookings-page .bookingReference {
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

        .fromone-smiles-bookings-page .bookingReference strong {
          color: #071b49 !important;
          font-size: 0.88rem !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: 0.02em !important;
        }

        .fromone-smiles-bookings-page .confirmedHeader small {
          display: block !important;
          width: fit-content !important;
          margin-top: 6px !important;
          padding: 7px 10px !important;
          border-radius: 999px !important;
          border: 1px solid #ffd2e5 !important;
          background: #fff8fc !important;
          color: #071b49 !important;
          font-size: 0.82rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
        }

        @media (max-width: 760px) {
          .fromone-smiles-bookings-page .lockedNotice {
            text-align: center !important;
            justify-items: center !important;
          }

          .fromone-smiles-bookings-page .lockedActions {
            width: 100% !important;
            justify-content: center !important;
          }

          .fromone-smiles-bookings-page .lockedActions a {
            width: 100% !important;
            max-width: 280px !important;
          }

          .fromone-smiles-bookings-page .bookingReference {
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .fromone-smiles-bookings-page .confirmedHeader small {
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }

      `}</style>
    </main>
  );
}
