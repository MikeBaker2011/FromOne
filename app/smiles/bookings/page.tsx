"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SmilezBackButton from "@/app/components/SmilezBackButton";
import "../../posts/posts-companion-shared.css";
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

const confirmedBookingStatuses = ["handled", "completed", "confirmed", "accepted"];
const declinedBookingStatuses = ["declined", "rejected", "cancelled", "canceled"];
const CONFIRMED_BOOKINGS_PER_PAGE = 8;

function isBookingConfirmed(status: string | null) {
  return confirmedBookingStatuses.includes(String(status || "").toLowerCase());
}

function isBookingDeclined(status: string | null) {
  return declinedBookingStatuses.includes(String(status || "").toLowerCase());
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

function getBookingDateKey(value: string | null) {
  return value || "date-not-set";
}

function getBookingGroupLabel(value: string | null) {
  if (!value) return "Date not set";

  const bookingDate = new Date(`${value}T12:00:00`);
  if (Number.isNaN(bookingDate.getTime())) return value;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const bookingDay = new Date(bookingDate);
  bookingDay.setHours(12, 0, 0, 0);

  if (bookingDay.getTime() === today.getTime()) return "Today";
  if (bookingDay.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (bookingDay.getTime() === yesterday.getTime()) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(bookingDay);
}

function getBookingTimestamp(booking: SmilesBooking) {
  const date = booking.booking_date || "9999-12-31";
  const time = booking.booking_time || "23:59";
  const timestamp = new Date(`${date}T${time}`).getTime();

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
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
  const [confirmedPage, setConfirmedPage] = useState(1);
  const [bookingSearch, setBookingSearch] = useState("");

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
    () =>
      bookings.filter(
        (booking) =>
          !isBookingConfirmed(booking.status) && !isBookingDeclined(booking.status)
      ),
    [bookings]
  );

  const normalisedBookingSearch = bookingSearch.trim().toLowerCase();

  const matchesBookingSearch = (booking: SmilesBooking) => {
    if (!normalisedBookingSearch) return true;

    return [
      booking.customer_name,
      booking.reference_code,
      booking.booking_reference,
      makeBookingReference(booking),
      booking.customer_email,
      booking.customer_phone,
    ].some((value) =>
      String(value || "").toLowerCase().includes(normalisedBookingSearch)
    );
  };

  const filteredNewBookings = useMemo(
    () => newBookings.filter(matchesBookingSearch),
    [newBookings, normalisedBookingSearch]
  );

  const confirmedBookings = useMemo(
    () =>
      bookings
        .filter((booking) => isBookingConfirmed(booking.status))
        .filter(matchesBookingSearch)
        .sort((first, second) => getBookingTimestamp(first) - getBookingTimestamp(second)),
    [bookings, normalisedBookingSearch]
  );

  const confirmedPageCount = Math.max(
    1,
    Math.ceil(confirmedBookings.length / CONFIRMED_BOOKINGS_PER_PAGE)
  );

  const paginatedConfirmedBookings = useMemo(() => {
    const safePage = Math.min(confirmedPage, confirmedPageCount);
    const startIndex = (safePage - 1) * CONFIRMED_BOOKINGS_PER_PAGE;

    return confirmedBookings.slice(
      startIndex,
      startIndex + CONFIRMED_BOOKINGS_PER_PAGE
    );
  }, [confirmedBookings, confirmedPage, confirmedPageCount]);

  const groupedConfirmedBookings = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; label: string; bookings: SmilesBooking[] }
    >();

    paginatedConfirmedBookings.forEach((booking) => {
      const key = getBookingDateKey(booking.booking_date);
      const existing = groups.get(key);

      if (existing) {
        existing.bookings.push(booking);
        return;
      }

      groups.set(key, {
        key,
        label: getBookingGroupLabel(booking.booking_date),
        bookings: [booking],
      });
    });

    return Array.from(groups.values());
  }, [paginatedConfirmedBookings]);

  useEffect(() => {
    if (confirmedPage > confirmedPageCount) {
      setConfirmedPage(confirmedPageCount);
    }
  }, [confirmedPage, confirmedPageCount]);

  useEffect(() => {
    setConfirmedPage(1);

    if (normalisedBookingSearch) {
      setShowConfirmed(true);
    }
  }, [normalisedBookingSearch]);

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
          "The booking is confirmed and its guest count now uses the slot capacity.",
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

  const declineBooking = async (bookingId: string) => {
    const confirmed = window.confirm(
      "Decline this booking? It will stop using capacity for this time."
    );

    if (!confirmed) return;

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
          action: "decline_booking",
          bookingId,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not decline booking.");
      }

      showToast({
        type: "success",
        title: "Booking declined",
        message:
          result.message ||
          "The booking was declined and no longer uses slot capacity.",
      });

      await loadBookings();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Booking not declined",
        message: error?.message || "Could not decline booking.",
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
    <main className="fromone-posts-page fromone-bookings-page">
      <section id="fromone-standard-shell">
        <header className="bookings-simple-hero">
          <div>
            <span className="bookings-eyebrow">Smilez</span>
            <h1>Bookings.</h1>
            <p>Confirm new requests and check accepted bookings.</p>
          </div>
          <SmilezBackButton />
        </header>

        {loading ? (
          <section className="bookings-status-card">
            <strong>Loading bookings…</strong>
            <span>Checking your latest requests.</span>
          </section>
        ) : null}

        {!loading && isSmilesLocked ? (
          <section className="bookings-status-card is-warning">
            <div>
              <strong>{smilesLockedTitle}</strong>
              <span>{smilesLockedMessage}</span>
            </div>
            <Link href="/settings">Business settings</Link>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && !profile?.smiles_listing_venue_id ? (
          <section className="bookings-status-card is-warning">
            <div>
              <strong>Your Smilez listing is not live yet</strong>
              <span>Bookings will appear here once your venue listing is live.</span>
            </div>
            <Link href="/settings">Check listing</Link>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && profile?.smiles_listing_venue_id ? (
          <>
            <section className="bookings-toolbar">
              <div className="bookings-search-row">
                <input
                  type="search"
                  value={bookingSearch}
                  onChange={(event) => setBookingSearch(event.target.value)}
                  placeholder="Search name or booking number"
                  aria-label="Search bookings by name or booking number"
                />
                {bookingSearch ? (
                  <button type="button" onClick={() => setBookingSearch("")}>
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="bookings-counts" aria-label="Booking totals">
                <span><strong>{newBookings.length}</strong> to confirm</span>
                <span><strong>{confirmedBookings.length}</strong> confirmed</span>
              </div>
            </section>

            <section className="bookings-section">
              <div className="bookings-section-head">
                <div>
                  <h2>New bookings</h2>
                  <p>{newBookings.length > 0 ? "Confirm or decline each request." : "Nothing needs attention."}</p>
                </div>
              </div>

              {normalisedBookingSearch ? (
                <p className="bookings-search-results">
                  {filteredNewBookings.length + confirmedBookings.length} result
                  {filteredNewBookings.length + confirmedBookings.length === 1 ? "" : "s"} found
                </p>
              ) : null}

              {filteredNewBookings.length === 0 ? (
                <div className="bookings-empty">
                  <strong>
                    {normalisedBookingSearch ? "No matching new bookings" : "You’re all caught up"}
                  </strong>
                  <span>
                    {normalisedBookingSearch
                      ? "Try a different name or booking reference."
                      : "New booking requests will appear here."}
                  </span>
                </div>
              ) : (
                <div className="bookings-review-list">
                  {filteredNewBookings.map((booking) => (
                    <article className="bookings-review-card" key={booking.id}>
                      <div className="bookings-booking-main">
                        <div className="bookings-time-block">
                          <strong>{formatTime(booking.booking_time)}</strong>
                          <span>{formatDate(booking.booking_date)}</span>
                        </div>

                        <div className="bookings-review-copy">
                          <div className="bookings-meta-row">
                            <span>{formatPartySize(booking.party_size)}</span>
                            <span>{makeBookingReference(booking)}</span>
                          </div>
                          <h3>{booking.customer_name || "Customer"}</h3>

                          <div className="bookings-detail-grid">
                            <BookingContactDetails booking={booking} />
                            <BookingNoteDetails booking={booking} />
                          </div>
                        </div>
                      </div>

                      <div className="bookings-card-actions">
                        <button
                          type="button"
                          className="bookings-confirm-button"
                          onClick={() => confirmBooking(booking.id)}
                          disabled={busyId === booking.id}
                        >
                          {busyId === booking.id ? "Working…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          className="bookings-decline-button"
                          onClick={() => declineBooking(booking.id)}
                          disabled={busyId === booking.id}
                        >
                          Decline
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <details className="bookings-history" open={Boolean(normalisedBookingSearch) || showConfirmed}>
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setShowConfirmed((current) => !current);
                  setConfirmedPage(1);
                }}
              >
                <div>
                  <strong>Confirmed bookings</strong>
                  <span>{confirmedBookings.length} accepted</span>
                </div>
                <b>{showConfirmed || normalisedBookingSearch ? "Hide" : "View"}</b>
              </summary>

              {(showConfirmed || normalisedBookingSearch) ? (
                confirmedBookings.length === 0 ? (
                  <div className="bookings-empty is-history">
                    <strong>No confirmed bookings yet</strong>
                    <span>Accepted bookings will appear here.</span>
                  </div>
                ) : (
                  <>
                    <div className="bookings-confirmed-groups">
                      {groupedConfirmedBookings.map((group) => (
                        <section className="bookings-confirmed-group" key={group.key}>
                          <div className="bookings-group-heading">
                            <strong>{group.label}</strong>
                            <span>
                              {group.bookings.length} booking
                              {group.bookings.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="bookings-review-list">
                            {group.bookings.map((booking) => (
                              <article
                                className="bookings-review-card is-confirmed"
                                key={booking.id}
                              >
                                <div className="bookings-booking-main">
                                  <div className="bookings-time-block">
                                    <strong>{formatTime(booking.booking_time)}</strong>
                                    <span>{formatPartySize(booking.party_size)}</span>
                                  </div>

                                  <div className="bookings-review-copy">
                                    <div className="bookings-meta-row">
                                      <span>{formatDate(booking.booking_date)}</span>
                                      <span>{makeBookingReference(booking)}</span>
                                    </div>
                                    <h3>{booking.customer_name || "Customer"}</h3>

                                    <div className="bookings-detail-grid">
                                      <BookingContactDetails booking={booking} />
                                      <BookingNoteDetails booking={booking} />
                                    </div>
                                  </div>
                                </div>

                                <div className="bookings-card-actions">
                                  <button
                                    type="button"
                                    className="bookings-decline-button"
                                    onClick={() => declineBooking(booking.id)}
                                    disabled={busyId === booking.id}
                                  >
                                    {busyId === booking.id ? "Working…" : "Decline"}
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    {confirmedBookings.length > CONFIRMED_BOOKINGS_PER_PAGE ? (
                      <div className="bookings-pagination">
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmedPage((current) => Math.max(1, current - 1))
                          }
                          disabled={confirmedPage <= 1}
                        >
                          Previous
                        </button>
                        <span>
                          {confirmedPage} / {confirmedPageCount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmedPage((current) =>
                              Math.min(confirmedPageCount, current + 1)
                            )
                          }
                          disabled={confirmedPage >= confirmedPageCount}
                        >
                          Next
                        </button>
                      </div>
                    ) : null}
                  </>
                )
              ) : null}
            </details>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.fromone-bookings-page),
        body:has(.fromone-bookings-page) .app-shell,
        body:has(.fromone-bookings-page) .main-content,
        body:has(.fromone-bookings-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-bookings-page) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-bookings-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-bookings-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 90px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-bookings-page {
          width: 100%;
          max-width: 100%;
          margin: 0;
          color: #071b49;
          background: transparent !important;
        }

        .fromone-bookings-page #fromone-standard-shell {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .bookings-simple-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 2px;
        }

        .bookings-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .bookings-simple-hero h1 {
          margin: 0 0 9px;
          color: #071b49;
          font-size: clamp(2.4rem, 5vw, 3.9rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .bookings-simple-hero p {
          margin: 0;
          color: #66728a;
          font-size: 0.98rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .bookings-status-card a {
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

        .bookings-status-card,
        .bookings-toolbar,
        .bookings-section,
        .bookings-history {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .bookings-status-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .bookings-status-card > div,
        .bookings-status-card {
          color: #66728a;
        }

        .bookings-status-card strong {
          color: #071b49;
          font-size: 0.95rem;
          font-weight: 900;
        }

        .bookings-status-card span {
          display: block;
          margin-top: 3px;
          font-size: 0.82rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .bookings-status-card.is-warning {
          border-color: #ffd2e5;
          background: #fffafd;
        }

        .bookings-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px;
        }

        .bookings-search-row {
          flex: 1 1 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
        }

        .bookings-search-row input {
          width: 100%;
          min-height: 42px;
          padding: 0 13px;
          border: 1px solid #dfe5f1;
          border-radius: 12px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.86rem;
          font-weight: 700;
          outline: none;
        }

        .bookings-search-row input:focus {
          border-color: #f72585;
          box-shadow: 0 0 0 3px rgba(247, 37, 133, 0.08);
        }

        .bookings-search-row button,
        .bookings-pagination button {
          min-height: 42px;
          padding: 0 13px;
          border: 1px solid #dfe5f1;
          border-radius: 12px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .bookings-counts {
          display: flex;
          gap: 8px;
          flex: 0 0 auto;
        }

        .bookings-counts span {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0 11px;
          border-radius: 999px;
          background: #f7f9fc;
          color: #66728a;
          font-size: 0.76rem;
          font-weight: 750;
          white-space: nowrap;
        }

        .bookings-counts strong {
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .bookings-section {
          padding: 16px;
        }

        .bookings-section-head {
          margin-bottom: 12px;
        }

        .bookings-section-head h2 {
          margin: 0 0 4px;
          color: #071b49;
          font-size: 1.18rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .bookings-section-head p {
          margin: 0;
          color: #718096;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .bookings-search-results {
          margin: 0 0 10px;
          color: #718096;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .bookings-review-list {
          display: grid;
          gap: 9px;
        }

        .bookings-review-card {
          padding: 14px;
          border: 1px solid #e3e8f1;
          border-radius: 15px;
          background: #fbfcfe;
        }

        .bookings-booking-main {
          display: grid;
          grid-template-columns: 130px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .bookings-time-block {
          display: grid;
          gap: 5px;
          padding: 12px;
          border-radius: 13px;
          background: #fff5fa;
        }

        .bookings-time-block strong {
          color: #f72585;
          font-size: 1.35rem;
          line-height: 1;
          font-weight: 900;
        }

        .bookings-time-block span {
          color: #66728a;
          font-size: 0.78rem;
          line-height: 1.35;
          font-weight: 700;
        }

        .bookings-review-copy h3 {
          margin: 7px 0 9px;
          color: #071b49;
          font-size: 1.05rem;
          line-height: 1.15;
          font-weight: 900;
        }

        .bookings-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .bookings-meta-row span {
          padding: 5px 8px;
          border-radius: 999px;
          background: #f4f7fb;
          color: #52617a;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .bookings-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .fromone-bookings-page .detailBox {
          padding: 10px;
          border: 1px solid #e3e8f1;
          border-radius: 12px;
          background: #ffffff;
        }

        .fromone-bookings-page .detailBox > span {
          color: #f72585;
          font-size: 0.66rem;
          font-weight: 900;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .fromone-bookings-page .detailBox p {
          margin: 6px 0 0;
          color: #66728a;
          font-size: 0.76rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .fromone-bookings-page .contactRow {
          display: grid;
          gap: 4px;
          margin-top: 6px;
        }

        .fromone-bookings-page .contactRow a {
          color: #071b49;
          font-size: 0.76rem;
          font-weight: 800;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .bookings-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .bookings-confirm-button,
        .bookings-decline-button {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .bookings-confirm-button {
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff;
        }

        .bookings-decline-button {
          border: 1px solid #efb7c9;
          background: #ffffff;
          color: #a91257;
        }

        .bookings-confirm-button:disabled,
        .bookings-decline-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .bookings-empty {
          display: grid;
          gap: 3px;
          padding: 14px;
          border-radius: 13px;
          background: #f8fafc;
        }

        .bookings-empty strong {
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .bookings-empty span {
          color: #718096;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .bookings-history {
          overflow: hidden;
        }

        .bookings-history summary {
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          list-style: none;
        }

        .bookings-history summary::-webkit-details-marker {
          display: none;
        }

        .bookings-history summary > div {
          display: grid;
          gap: 2px;
        }

        .bookings-history summary strong {
          color: #071b49;
          font-size: 0.94rem;
          font-weight: 900;
        }

        .bookings-history summary span {
          color: #718096;
          font-size: 0.76rem;
          font-weight: 650;
        }

        .bookings-history summary b {
          color: #f72585;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .bookings-confirmed-groups {
          display: grid;
          gap: 14px;
          padding: 0 12px 12px;
        }

        .bookings-confirmed-group {
          display: grid;
          gap: 8px;
        }

        .bookings-group-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          padding: 0 2px;
        }

        .bookings-group-heading strong {
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .bookings-group-heading span {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 750;
        }

        .bookings-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 0 12px 12px;
          padding-top: 10px;
          border-top: 1px solid #edf1f7;
        }

        .bookings-pagination span {
          color: #718096;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .bookings-empty.is-history {
          margin: 0 12px 12px;
        }

        @media (max-width: 700px) {
          body:has(.fromone-bookings-page) .main-content,
          body:has(.fromone-bookings-page) .main-content.fromone-mobile-bottom-safe {
            padding: 18px 10px 100px !important;
          }

          .fromone-bookings-page #fromone-standard-shell {
            max-width: 100%;
            gap: 12px;
          }

          .bookings-simple-hero {
            display: grid;
            gap: 12px;
          }

          .bookings-simple-hero h1 {
            font-size: 2.2rem;
          }

          .bookings-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .bookings-counts {
            width: 100%;
          }

          .bookings-counts span {
            flex: 1 1 0;
            justify-content: center;
          }

          .bookings-booking-main,
          .bookings-detail-grid {
            grid-template-columns: 1fr;
          }

          .bookings-time-block {
            grid-template-columns: auto 1fr;
            align-items: baseline;
          }

          .bookings-card-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .bookings-confirm-button,
          .bookings-decline-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}