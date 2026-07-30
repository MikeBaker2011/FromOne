"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SmilezSectionHeader from "@/app/components/SmilezSectionHeader";
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

const confirmedBookingStatuses = ["handled", "completed", "confirmed"];
const CONFIRMED_BOOKINGS_PER_PAGE = 8;

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
    () => bookings.filter((booking) => !isBookingConfirmed(booking.status)),
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
    <main className="fromone-posts-page fromone-bookings-page">
      <section id="fromone-standard-shell">
        <SmilezSectionHeader
          eyebrow="Bookings"
          title="Manage bookings"
          description={
            <>
              Review new requests, confirm the bookings you can accept, and check
              previous bookings.
            </>
          }
          listingName={profile?.business_name}
          listingStatus={
            profile?.smiles_listing_venue_id
              ? "Live on Smilez"
              : "Waiting for listing setup"
          }
        />

{loading ? (
          <section className="posts-summary-panel bookings-notice">
            <div className="posts-panel-head">
              <span className="posts-step-badge">1</span>
              <div>
                <h2>Loading bookings…</h2>
                <p>Checking your Smilez booking requests.</p>
              </div>
            </div>
          </section>
        ) : null}

        {!loading && isSmilesLocked ? (
          <section className="posts-summary-panel bookings-notice">
            <div className="posts-panel-head">
              <span className="posts-step-badge">!</span>
              <div>
                <h2>{smilesLockedTitle}</h2>
                <p>{smilesLockedMessage}</p>
              </div>
            </div>
            <div className="posts-summary-actions bookings-link-actions">
              <Link href="/settings">Update business address</Link>
              <Link href="/posts">Create a normal post</Link>
            </div>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && !profile?.smiles_listing_venue_id ? (
          <section className="posts-summary-panel bookings-notice">
            <div className="posts-panel-head">
              <span className="posts-step-badge">1</span>
              <div>
                <h2>Your Smilez listing is not live yet</h2>
                <p>Bookings will appear here once your Smilez venue listing is live.</p>
              </div>
            </div>
            <div className="posts-summary-actions bookings-link-actions">
              <Link href="/settings">Check business details</Link>
              <Link href="/smiles">Back to Smilez</Link>
            </div>
          </section>
        ) : null}

        {!loading && !isSmilesLocked && profile?.smiles_listing_venue_id ? (
          <>
            <section className="posts-summary-panel bookings-summary-panel">
              <div className="posts-panel-head">
                <span className="posts-step-badge">1</span>
                <div>
                  <h2>Find a booking</h2>
                  <p>Search by customer name or booking reference.</p>
                </div>
              </div>

              <div className="bookings-search-row">
                <input
                  type="search"
                  value={bookingSearch}
                  onChange={(event) => setBookingSearch(event.target.value)}
                  placeholder="Name or booking number"
                  aria-label="Search bookings by name or booking number"
                />
                {bookingSearch ? (
                  <button type="button" onClick={() => setBookingSearch("")}>
                    Clear
                  </button>
                ) : null}
              </div>
            </section>

            <section className="bookings-count-row" aria-label="Booking totals">
              <article>
                <span>To confirm</span>
                <strong>{newBookings.length}</strong>
              </article>
              <article>
                <span>Confirmed</span>
                <strong>{confirmedBookings.length}</strong>
              </article>
            </section>

            <section className="posts-list-panel bookings-list-panel">
              <div className="posts-panel-head">
                <span className="posts-step-badge">2</span>
                <div>
                  <h2>New bookings</h2>
                  <p>Confirm the requests you can accept.</p>
                </div>
              </div>

              {normalisedBookingSearch ? (
                <p className="bookings-search-results">
                  {filteredNewBookings.length + confirmedBookings.length} result
                  {filteredNewBookings.length + confirmedBookings.length === 1 ? "" : "s"} found
                </p>
              ) : null}

              {filteredNewBookings.length === 0 ? (
                <div className="posts-empty-panel">
                  <div className="posts-panel-head">
                    <span className="posts-step-badge">✓</span>
                    <div>
                      <h2>
                        {normalisedBookingSearch
                          ? "No matching new bookings"
                          : "You’re all caught up"}
                      </h2>
                      <p>
                        {normalisedBookingSearch
                          ? "Try a different customer name or booking reference."
                          : "New booking requests from Smilez will appear here."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bookings-review-list">
                  {filteredNewBookings.map((booking) => (
                    <article className="bookings-review-card" key={booking.id}>
                      <div className="bookings-review-time">
                        <strong>{formatTime(booking.booking_time)}</strong>
                        <span>{formatDate(booking.booking_date)}</span>
                      </div>

                      <div className="bookings-review-copy">
                        <div className="posts-review-meta">
                          <span>{formatPartySize(booking.party_size)}</span>
                          <span>{makeBookingReference(booking)}</span>
                        </div>
                        <h3>{booking.customer_name || "Customer"}</h3>

                        <div className="bookings-detail-grid">
                          <BookingContactDetails booking={booking} />
                          <BookingNoteDetails booking={booking} />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="posts-review-action bookings-confirm-button"
                        onClick={() => confirmBooking(booking.id)}
                        disabled={busyId === booking.id}
                      >
                        {busyId === booking.id ? "Confirming…" : "Confirm booking"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="posts-list-panel bookings-list-panel">
              <div className="bookings-history-head">
                <div className="posts-panel-head">
                  <span className="posts-step-badge">3</span>
                  <div>
                    <h2>Confirmed bookings</h2>
                    <p>Check bookings you have already accepted.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="bookings-secondary-button"
                  onClick={() => {
                    setShowConfirmed((current) => {
                      const next = !current;
                      if (next) setConfirmedPage(1);
                      return next;
                    });
                  }}
                >
                  {showConfirmed ? "Hide bookings" : `Show ${confirmedBookings.length}`}
                </button>
              </div>

              {showConfirmed ? (
                confirmedBookings.length === 0 ? (
                  <div className="posts-empty-panel">
                    <div className="posts-panel-head">
                      <span className="posts-step-badge">✓</span>
                      <div>
                        <h2>No confirmed bookings yet</h2>
                        <p>Confirmed bookings will be kept here.</p>
                      </div>
                    </div>
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
                                className="bookings-review-card bookings-confirmed-card"
                                key={booking.id}
                              >
                                <div className="bookings-review-time">
                                  <strong>{formatTime(booking.booking_time)}</strong>
                                  <span>{formatPartySize(booking.party_size)}</span>
                                </div>

                                <div className="bookings-review-copy">
                                  <div className="posts-review-meta">
                                    <span>{formatDate(booking.booking_date)}</span>
                                    <span>{makeBookingReference(booking)}</span>
                                  </div>
                                  <h3>{booking.customer_name || "Customer"}</h3>

                                  <div className="bookings-detail-grid">
                                    <BookingContactDetails booking={booking} />
                                    <BookingNoteDetails booking={booking} />
                                  </div>
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
                          Page {confirmedPage} of {confirmedPageCount}
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
              ) : (
                <p className="bookings-help">
                  Open this section whenever you need to check an older booking.
                </p>
              )}
            </section>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.fromone-bookings-page) {
          background: var(--posts-bg) !important;
        }

        body:has(.fromone-bookings-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          background: var(--posts-bg) !important;
        }

        .fromone-bookings-page .bookings-back-link {
          display: inline-flex;
          align-items: center;
          min-height: 46px;
          margin-bottom: 24px;
          padding: 0 17px;
          border: 1px solid var(--posts-border);
          border-radius: 15px;
          background: #fff;
          color: var(--posts-navy);
          font-size: 0.86rem;
          font-weight: 900;
          text-decoration: none;
        }

        .fromone-bookings-page .bookings-summary-panel {
          align-items: center;
        }

        .fromone-bookings-page .bookings-search-row {
          display: grid;
          grid-template-columns: minmax(280px, 430px) auto;
          gap: 10px;
        }

        .fromone-bookings-page .bookings-search-row input {
          width: 100%;
          min-height: 46px;
          padding: 0 14px;
          border: 1px solid var(--posts-border);
          border-radius: 15px;
          background: #fff;
          color: var(--posts-navy);
          font: inherit;
          font-weight: 700;
          outline: none;
        }

        .fromone-bookings-page .bookings-search-row input:focus {
          border-color: var(--posts-pink);
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.1);
        }

        .fromone-bookings-page .bookings-search-row button,
        .fromone-bookings-page .bookings-secondary-button,
        .fromone-bookings-page .bookings-pagination button {
          min-height: 46px;
          padding: 0 17px;
          border: 1px solid var(--posts-border);
          border-radius: 15px;
          background: #fff;
          color: var(--posts-navy);
          font: inherit;
          font-size: 0.86rem;
          font-weight: 900;
          cursor: pointer;
        }

        .fromone-bookings-page .bookings-count-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .fromone-bookings-page .bookings-count-row article {
          padding: 18px 20px;
          border: 1px solid var(--posts-border);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--posts-shadow);
        }

        .fromone-bookings-page .bookings-count-row span {
          display: block;
          color: var(--posts-pink);
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fromone-bookings-page .bookings-count-row strong {
          display: block;
          margin-top: 7px;
          color: var(--posts-navy);
          font-size: 2rem;
          line-height: 1;
        }

        .fromone-bookings-page .bookings-list-panel + .bookings-list-panel {
          margin-top: 22px;
        }

        .fromone-bookings-page .bookings-search-results {
          margin: -6px 0 16px;
          color: var(--posts-muted);
          font-size: 0.86rem;
          font-weight: 800;
        }

        .fromone-bookings-page .bookings-review-list {
          display: grid;
          gap: 14px;
        }

        .fromone-bookings-page .bookings-review-card {
          display: grid;
          grid-template-columns: 180px minmax(0, 1fr) 170px;
          gap: 18px;
          align-items: center;
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--posts-border);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055);
        }

        .fromone-bookings-page .bookings-confirmed-card {
          grid-template-columns: 180px minmax(0, 1fr);
        }

        .fromone-bookings-page .bookings-review-time {
          display: grid;
          gap: 7px;
          min-width: 0;
          padding: 16px;
          border: 1px solid #ffd4e8;
          border-radius: 18px;
          background: #fff5fa;
        }

        .fromone-bookings-page .bookings-review-time strong {
          color: var(--posts-pink);
          font-size: 1.7rem;
          line-height: 1;
        }

        .fromone-bookings-page .bookings-review-time span {
          color: var(--posts-muted);
          font-size: 0.88rem;
          line-height: 1.4;
          font-weight: 700;
        }

        .fromone-bookings-page .bookings-review-copy {
          min-width: 0;
        }

        .fromone-bookings-page .bookings-review-copy h3 {
          margin: 0 0 12px;
          color: var(--posts-navy);
          font-size: 1.3rem;
          line-height: 1.12;
          letter-spacing: -0.035em;
        }

        .fromone-bookings-page .bookings-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .fromone-bookings-page .detailBox {
          padding: 13px;
          border: 1px solid var(--posts-border);
          border-radius: 15px;
          background: #f8fafc;
        }

        .fromone-bookings-page .detailBox > span {
          color: var(--posts-pink);
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .fromone-bookings-page .detailBox p {
          margin: 8px 0 0;
          color: var(--posts-muted);
          font-size: 0.86rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .fromone-bookings-page .contactRow {
          display: grid;
          gap: 5px;
          margin-top: 8px;
        }

        .fromone-bookings-page .contactRow a {
          color: var(--posts-navy);
          font-size: 0.84rem;
          font-weight: 800;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .fromone-bookings-page .bookings-confirm-button {
          width: 100%;
          margin: 0;
        }

        .fromone-bookings-page .bookings-history-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .fromone-bookings-page .bookings-confirmed-groups {
          display: grid;
          gap: 24px;
        }

        .fromone-bookings-page .bookings-confirmed-group {
          display: grid;
          gap: 10px;
        }

        .fromone-bookings-page .bookings-group-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          padding: 0 4px;
        }

        .fromone-bookings-page .bookings-group-heading strong {
          color: var(--posts-navy);
          font-size: 1.05rem;
        }

        .fromone-bookings-page .bookings-group-heading span,
        .fromone-bookings-page .bookings-help,
        .fromone-bookings-page .bookings-pagination span {
          color: var(--posts-muted);
          font-size: 0.86rem;
          font-weight: 800;
        }

        .fromone-bookings-page .bookings-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--posts-border);
        }

        .fromone-bookings-page .bookings-link-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .fromone-bookings-page .bookings-link-actions a + a {
          color: var(--posts-navy);
          background: #fff;
          border: 1px solid var(--posts-border);
          box-shadow: none;
        }

        @media (max-width: 980px) {
          .fromone-bookings-page .bookings-review-card,
          .fromone-bookings-page .bookings-confirmed-card {
            grid-template-columns: 150px minmax(0, 1fr);
          }

          .fromone-bookings-page .bookings-confirm-button {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 700px) {
          body:has(.fromone-bookings-page) .main-content {
            padding: 24px 16px 100px !important;
          }

          .fromone-bookings-page .bookings-summary-panel,
          .fromone-bookings-page .bookings-history-head {
            align-items: stretch;
            flex-direction: column;
          }

          .fromone-bookings-page .bookings-search-row,
          .fromone-bookings-page .bookings-count-row,
          .fromone-bookings-page .bookings-review-card,
          .fromone-bookings-page .bookings-confirmed-card,
          .fromone-bookings-page .bookings-detail-grid {
            grid-template-columns: 1fr;
          }

          .fromone-bookings-page .bookings-search-row button,
          .fromone-bookings-page .bookings-secondary-button,
          .fromone-bookings-page .bookings-confirm-button {
            width: 100%;
          }

          .fromone-bookings-page .bookings-confirm-button {
            grid-column: auto;
          }

          .fromone-bookings-page .bookings-pagination {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .fromone-bookings-page .bookings-pagination span {
            grid-column: 1 / -1;
            grid-row: 1;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}