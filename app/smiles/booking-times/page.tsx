"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SmilezBackButton from "@/app/components/SmilezBackButton";
import "../../posts/posts-companion-shared.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useToast } from "@/app/components/ToastProvider";

type SmilesBookingHour = {
  id?: string;
  day_of_week: number;
  is_closed: boolean | null;
  opens_at: string | null;
  closes_at: string | null;
};

type SmilesProfile = {
  business_name: string | null;
  smiles_listing_venue_id: string | null;
};

type SmilesResponse = {
  success?: boolean;
  message?: string;
  profile?: SmilesProfile | null;
  bookingHours?: SmilesBookingHour[];
};

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getDefaultBookingHours(): SmilesBookingHour[] {
  return dayLabels.map((_, day) => ({
    day_of_week: day,
    is_closed: day === 0,
    opens_at: day === 0 ? null : "12:00:00",
    closes_at: day === 5 || day === 6 ? "23:00:00" : day === 0 ? null : "21:00:00",
  }));
}

function toTimeInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function normaliseHours(hours: SmilesBookingHour[]) {
  const defaults = getDefaultBookingHours();

  if (hours.length === 0) {
    return defaults;
  }

  return defaults.map((defaultHour) => {
    const suppliedHour = hours.find(
      (hour) => Number(hour.day_of_week) === defaultHour.day_of_week
    );

    return suppliedHour || defaultHour;
  });
}

function getHoursSummary(hours: SmilesBookingHour[]) {
  const openDays = hours.filter((hour) => !hour.is_closed);

  if (openDays.length === 0) {
    return "Bookings are closed";
  }

  if (openDays.length === 7) {
    return "Open every day";
  }

  return `${openDays.length} days open`;
}

export default function SmilesBookingTimesPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<SmilesProfile | null>(null);
  const [bookingHours, setBookingHours] = useState<SmilesBookingHour[]>(
    getDefaultBookingHours
  );

  const openDays = useMemo(
    () => bookingHours.filter((hour) => !hour.is_closed).length,
    [bookingHours]
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

  const loadBookingTimes = async () => {
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "GET",
        headers,
      });
      const result = (await response.json()) as SmilesResponse;

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not load opening and booking hours.");
      }

      setMessage(result.message || "");
      setProfile(result.profile || null);
      setBookingHours(normaliseHours(result.bookingHours || []));
    } catch (error: any) {
      const errorMessage = error?.message || "Could not load opening and booking hours.";
      setMessage(errorMessage);
      showToast({
        type: "error",
        title: "Hours unavailable",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingHour = (
    dayOfWeek: number,
    updates: Partial<SmilesBookingHour>
  ) => {
    setBookingHours((current) =>
      current.map((hour) =>
        hour.day_of_week === dayOfWeek ? { ...hour, ...updates } : hour
      )
    );
  };

  const applyWeekdayPreset = () => {
    setBookingHours(
      dayLabels.map((_, day) => ({
        day_of_week: day,
        is_closed: day === 0 || day === 6,
        opens_at: day === 0 || day === 6 ? null : "09:00",
        closes_at: day === 0 || day === 6 ? null : "17:00",
      }))
    );
  };

  const applyClosedWeekendsPreset = () => {
    setBookingHours((current) =>
      current.map((hour) =>
        hour.day_of_week === 0 || hour.day_of_week === 6
          ? {
              ...hour,
              is_closed: true,
              opens_at: null,
              closes_at: null,
            }
          : {
              ...hour,
              is_closed: false,
              opens_at: toTimeInput(hour.opens_at) || "09:00",
              closes_at: toTimeInput(hour.closes_at) || "17:00",
            }
      )
    );
  };

  const applyEveryDayPreset = () => {
    setBookingHours(
      dayLabels.map((_, day) => ({
        day_of_week: day,
        is_closed: false,
        opens_at: "09:00",
        closes_at: "17:00",
      }))
    );
  };

  const saveBookingTimes = async () => {
    setSaving(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save_booking_hours",
          hours: bookingHours.map((hour) => ({
            day_of_week: hour.day_of_week,
            is_closed: Boolean(hour.is_closed),
            opens_at: hour.is_closed ? null : toTimeInput(hour.opens_at),
            closes_at: hour.is_closed ? null : toTimeInput(hour.closes_at),
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not save opening and booking hours.");
      }

      showToast({
        type: "success",
        title: "Opening & booking hours saved",
        message:
          result.message ||
          "Customers will now see these opening hours on Smiles.",
      });

      await loadBookingTimes();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Times not saved",
        message: error?.message || "Could not save opening and booking hours.",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadBookingTimes();
  }, []);

  return (
    <main
      className="fromone-posts-page fromone-booking-times-page bookingTimesPage"
      data-fromone-smiles-times="simple-agency"
    >
      <section id="fromone-standard-shell" className="bookingTimesShell">
        <header className="bookingTimesSimpleHero">
          <div>
            <span className="bookingTimesEyebrow">Smilez</span>
            <h1>Opening hours.</h1>
            <p>Set when customers can request bookings.</p>
          </div>
          <SmilezBackButton />
        </header>

        {loading ? (
          <section className="bookingTimesStatusCard">
            <strong>Loading hours…</strong>
            <span>Checking your current Smilez settings.</span>
          </section>
        ) : null}

        {!loading && !profile?.smiles_listing_venue_id ? (
          <section className="bookingTimesStatusCard isWarning">
            <div>
              <strong>Your Smilez listing is not live yet</strong>
              <span>
                {message ||
                  "Opening and booking hours can be changed once your Smilez listing is live."}
              </span>
            </div>
            <Link href="/settings">Check listing</Link>
          </section>
        ) : null}

        {!loading && profile?.smiles_listing_venue_id ? (
          <>
            <section className="bookingTimesToolbar">
              <div className="bookingTimesSummary">
                <span>
                  <strong>{openDays}</strong> days open
                </span>
                <span>{getHoursSummary(bookingHours)}</span>
              </div>

              <div className="bookingTimesPresets" aria-label="Quick hour presets">
                <button type="button" onClick={applyWeekdayPreset}>
                  Mon–Fri
                </button>
                <button type="button" onClick={applyClosedWeekendsPreset}>
                  Closed weekends
                </button>
                <button type="button" onClick={applyEveryDayPreset}>
                  Every day
                </button>
              </div>
            </section>

            <section className="bookingTimesMainSection">
              <div className="bookingTimesSectionHead">
                <div>
                  <h2>Set each day</h2>
                  <p>Turn a day on or off, then choose opening and closing times.</p>
                </div>
              </div>

              <div className="bookingTimesDayList">
                {bookingHours.map((hour) => {
                  const closed = Boolean(hour.is_closed);

                  return (
                    <article
                      className={closed ? "bookingTimesDayRow isClosed" : "bookingTimesDayRow"}
                      key={hour.day_of_week}
                    >
                      <div className="bookingTimesDayName">
                        <strong>{dayLabels[hour.day_of_week]}</strong>
                        <span>{closed ? "Closed" : "Open"}</span>
                      </div>

                      <label className="bookingTimesSwitch">
                        <input
                          type="checkbox"
                          checked={!closed}
                          onChange={(event) =>
                            updateBookingHour(hour.day_of_week, {
                              is_closed: !event.target.checked,
                              opens_at: event.target.checked
                                ? toTimeInput(hour.opens_at) || "09:00"
                                : null,
                              closes_at: event.target.checked
                                ? toTimeInput(hour.closes_at) || "17:00"
                                : null,
                            })
                          }
                        />
                        <span>{closed ? "Closed" : "Open"}</span>
                      </label>

                      {!closed ? (
                        <div className="bookingTimesInputs">
                          <label>
                            <span>Opens</span>
                            <input
                              type="time"
                              value={toTimeInput(hour.opens_at)}
                              onChange={(event) =>
                                updateBookingHour(hour.day_of_week, {
                                  opens_at: event.target.value,
                                })
                              }
                            />
                          </label>

                          <label>
                            <span>Closes</span>
                            <input
                              type="time"
                              value={toTimeInput(hour.closes_at)}
                              onChange={(event) =>
                                updateBookingHour(hour.day_of_week, {
                                  closes_at: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="bookingTimesClosedText">No bookings this day</div>
                      )}
                    </article>
                  );
                })}
              </div>

              <button
                className="bookingTimesSaveButton"
                type="button"
                onClick={saveBookingTimes}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save hours"}
              </button>
            </section>
          </>
        ) : null}
      </section>

      <style jsx global>{`
        body:has(.fromone-booking-times-page),
        body:has(.fromone-booking-times-page) .app-shell,
        body:has(.fromone-booking-times-page) .main-content,
        body:has(.fromone-booking-times-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-booking-times-page) .fromone-universal-mobile-page-frame {
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-booking-times-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-booking-times-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 90px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .bookingTimesPage,
        .bookingTimesPage * {
          box-sizing: border-box;
        }

        .bookingTimesPage {
          width: 100%;
          max-width: 100%;
          margin: 0;
          color: #071b49;
          background: transparent !important;
          font-family: var(--font-main), "Plus Jakarta Sans", ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .bookingTimesShell {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .bookingTimesSimpleHero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .bookingTimesEyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .bookingTimesSimpleHero h1 {
          margin: 0 0 9px;
          color: #071b49;
          font-size: clamp(2.4rem, 5vw, 3.9rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .bookingTimesSimpleHero p {
          margin: 0;
          color: #66728a;
          font-size: 0.96rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .bookingTimesStatusCard,
        .bookingTimesToolbar,
        .bookingTimesMainSection {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .bookingTimesStatusCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .bookingTimesStatusCard > div {
          display: grid;
          gap: 3px;
        }

        .bookingTimesStatusCard strong {
          color: #071b49;
          font-size: 0.94rem;
          font-weight: 900;
        }

        .bookingTimesStatusCard span {
          color: #66728a;
          font-size: 0.8rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .bookingTimesStatusCard.isWarning {
          border-color: #ffd2e5;
          background: #fffafd;
        }

        .bookingTimesStatusCard a {
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

        .bookingTimesToolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px;
        }

        .bookingTimesSummary {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .bookingTimesSummary span {
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

        .bookingTimesSummary strong {
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .bookingTimesPresets {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
        }

        .bookingTimesPresets button {
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.76rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .bookingTimesMainSection {
          padding: 16px;
        }

        .bookingTimesSectionHead {
          margin-bottom: 12px;
        }

        .bookingTimesSectionHead h2 {
          margin: 0 0 4px;
          color: #071b49;
          font-size: 1.18rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .bookingTimesSectionHead p {
          margin: 0;
          color: #718096;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .bookingTimesDayList {
          display: grid;
          gap: 8px;
        }

        .bookingTimesDayRow {
          min-height: 74px;
          display: grid;
          grid-template-columns: 150px auto minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border: 1px solid #e3e8f1;
          border-radius: 15px;
          background: #fbfcfe;
        }

        .bookingTimesDayRow.isClosed {
          background: #f8fafc;
        }

        .bookingTimesDayName {
          display: grid;
          gap: 3px;
        }

        .bookingTimesDayName strong {
          color: #071b49;
          font-size: 0.94rem;
          font-weight: 900;
        }

        .bookingTimesDayName span {
          color: #718096;
          font-size: 0.72rem;
          font-weight: 750;
        }

        .bookingTimesSwitch {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font-size: 0.76rem;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .bookingTimesSwitch input {
          width: 16px;
          height: 16px;
          accent-color: #f72585;
        }

        .bookingTimesInputs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .bookingTimesInputs label {
          display: grid;
          gap: 4px;
        }

        .bookingTimesInputs label > span {
          color: #718096;
          font-size: 0.68rem;
          font-weight: 800;
        }

        .bookingTimesInputs input {
          width: 100%;
          min-height: 40px;
          padding: 0 10px;
          border: 1px solid #dfe5f1;
          border-radius: 11px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          outline: none;
        }

        .bookingTimesInputs input:focus {
          border-color: #f72585;
          box-shadow: 0 0 0 3px rgba(247, 37, 133, 0.08);
        }

        .bookingTimesClosedText {
          color: #8a96a8;
          font-size: 0.78rem;
          font-weight: 650;
        }

        .bookingTimesSaveButton {
          width: 100%;
          min-height: 44px;
          margin-top: 12px;
          padding: 0 16px;
          border: 1px solid #f72585;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .bookingTimesSaveButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          body:has(.fromone-booking-times-page) .main-content,
          body:has(.fromone-booking-times-page) .main-content.fromone-mobile-bottom-safe {
            padding: 18px 10px 100px !important;
          }

          .bookingTimesShell {
            max-width: 100%;
            gap: 12px;
          }

          .bookingTimesSimpleHero {
            display: grid;
            gap: 12px;
          }

          .bookingTimesSimpleHero h1 {
            font-size: 2.2rem;
          }

          .bookingTimesToolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .bookingTimesSummary {
            width: 100%;
          }

          .bookingTimesSummary span {
            flex: 1 1 0;
            justify-content: center;
          }

          .bookingTimesPresets {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .bookingTimesPresets button {
            width: 100%;
            padding: 0 8px;
            font-size: 0.7rem;
          }

          .bookingTimesDayRow {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            padding: 12px;
          }

          .bookingTimesInputs,
          .bookingTimesClosedText {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 430px) {
          .bookingTimesPresets {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}