"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    <main className="fromone-booking-times-page bookingTimesPage" data-fromone-smiles-times="simple-v2">
      <section id="fromone-standard-shell" className="bookingTimesShell">
      <section className="bookingTimesHero">
        <Link
          href="/smiles"
          className="backPill"
          style={{
            width: "fit-content",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "42px",
            marginBottom: "24px",
            borderRadius: "999px",
            padding: "0 16px",
            color: "#071b49",
            background: "#ffffff",
            border: "1.5px solid #dfe5f1",
            boxShadow: "0 10px 24px rgba(7, 27, 73, 0.06)",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Back to Smiles
        </Link>
        <span>Opening & booking hours</span>
        <h1>When are you open?</h1>
        <p>
          These hours appear on your Smiles venue page and control when
          customers can request bookings.
        </p>
      </section>

      {loading ? (
        <section className="simplePanel">
          <h2>Loading opening & booking hours...</h2>
          <p>Checking your current Smiles hours.</p>
        </section>
      ) : null}

      {!loading && !profile?.smiles_listing_venue_id ? (
        <section className="simplePanel">
          <h2>Your Smiles listing is not live yet</h2>
          <p>
            {message ||
              "Opening and booking hours can be changed once your Smiles listing is live."}
          </p>
          <Link href="/settings">Check listing status</Link>
        </section>
      ) : null}

      {!loading && profile?.smiles_listing_venue_id ? (
        <>
          <section className="timesSummary">
            <article>
              <span>Current hours</span>
              <strong>{getHoursSummary(bookingHours)}</strong>
            </article>
            <article>
              <span>Days shown open</span>
              <strong>{openDays}</strong>
            </article>
          </section>

          <section className="simplePanel">
            <div className="sectionTop">
              <div>
                <span>Quick setup</span>
                <h2>Use a preset</h2>
              </div>
            </div>

            <div className="presetGrid">
              <button type="button" onClick={applyWeekdayPreset}>
                Same hours Monday to Friday
              </button>
              <button type="button" onClick={applyClosedWeekendsPreset}>
                Closed weekends
              </button>
              <button type="button" onClick={applyEveryDayPreset}>
                Open every day
              </button>
            </div>
          </section>

          <section className="simplePanel priority">
            <div className="sectionTop">
              <div>
                <span>Fine tune</span>
                <h2>Each day</h2>
                <p>
                  Mark closed days and set the opening window customers should
                  see. The same times are used for Smiles booking request slots.
                </p>
              </div>
            </div>

            <div className="dayGrid">
              {bookingHours.map((hour) => {
                const closed = Boolean(hour.is_closed);

                return (
                  <article
                    className={closed ? "dayCard closed" : "dayCard"}
                    key={hour.day_of_week}
                  >
                    <div className="dayTop">
                      <div>
                        <span>{closed ? "Closed" : "Open"}</span>
                        <h3>{dayLabels[hour.day_of_week]}</h3>
                      </div>

                      <label className="switchLabel">
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
                    </div>

                    {!closed ? (
                      <div className="timeGrid">
                        <label>
                          Opens
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
                          Closes
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
                      <p>This day will show as closed on Smiles.</p>
                    )}
                  </article>
                );
              })}
            </div>

            <button
              className="saveButton"
              type="button"
              onClick={saveBookingTimes}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save opening & booking hours"}
            </button>
          </section>
        </>
      ) : null}

      </section>

      <style jsx>{`
        /* -------------------------------------------------------------- */
        /* FROMONE SMILES BOOKING TIMES — APPROVED STANDARD                */
        /* Desktop: main-content 38px + shell margin-top 28px              */
        /* Mobile: same fixed width/gap as finished mobile pages           */
        /* -------------------------------------------------------------- */
        :global(body:has(.fromone-booking-times-page)) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        :global(body:has(.fromone-booking-times-page)::before) {
          display: none !important;
          content: none !important;
        }

        :global(body:has(.fromone-booking-times-page) .app-shell),
        :global(body:has(.fromone-booking-times-page) .main-content) {
          background: #f5f7fb !important;
        }

        :global(body:has(.fromone-booking-times-page) .main-content) {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .bookingTimesPage,
        .bookingTimesPage * {
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

        .bookingTimesPage {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 16px 92px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
          color: #071b49 !important;
          font-weight: 500 !important;
          letter-spacing: -0.01em !important;
        }

        .bookingTimesShell {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          min-height: 620px !important;
          margin: 28px auto 0 !important;
          padding: clamp(30px, 4vw, 48px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
          color: #071b49 !important;
        }

        .bookingTimesHero,
        .timesSummary,
        .simplePanel {
          max-width: 100% !important;
          margin-inline: 0 !important;
        }

        .bookingTimesHero {
          margin: 0 0 26px !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .bookingTimesHero .backPill,
        .simplePanel a {
          width: fit-content !important;
          min-height: 52px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 0 22px !important;
          border-radius: 999px !important;
          padding: 0 22px !important;
          color: #071b49 !important;
          background: #ffffff !important;
          border: 1px solid #dfe5f1 !important;
          box-shadow: 0 10px 24px rgba(7, 27, 73, 0.06) !important;
          font-weight: 800 !important;
          text-decoration: none !important;
        }

        .simplePanel a {
          margin: 4px 0 0 !important;
          color: #ffffff !important;
          background: #f72585 !important;
          border-color: #f72585 !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.22) !important;
        }

        .bookingTimesHero > span,
        .bookingTimesHero span,
        .sectionTop span,
        .timesSummary span,
        .dayTop span {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .bookingTimesHero h1 {
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

        .bookingTimesHero p,
        .simplePanel p,
        .dayCard p {
          max-width: 720px !important;
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
        }

        .timesSummary {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin-bottom: 18px !important;
        }

        .timesSummary article,
        .simplePanel {
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
          box-sizing: border-box !important;
        }

        .timesSummary article {
          padding: 22px !important;
          background: #fff8fc !important;
          border-color: #ffd2e5 !important;
        }

        .timesSummary strong {
          display: block !important;
          margin-top: 8px !important;
          color: #071b49 !important;
          font-size: clamp(1.75rem, 3.4vw, 2.2rem) !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: -0.045em !important;
        }

        .simplePanel {
          display: grid !important;
          gap: 16px !important;
          margin-bottom: 18px !important;
          padding: clamp(20px, 3vw, 30px) !important;
          background: #f7f9fd !important;
        }

        .simplePanel.priority {
          border-color: #ffd2e5 !important;
          background: #fff8fc !important;
        }

        .sectionTop {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 16px !important;
          align-items: start !important;
        }

        .sectionTop h2 {
          margin: 8px 0 0 !important;
          color: #071b49 !important;
          font-size: clamp(1.75rem, 3.4vw, 2.25rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.048em !important;
          font-weight: 800 !important;
        }

        .presetGrid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .presetGrid button,
        .saveButton {
          min-height: 54px !important;
          border: 1px solid #ffd2e5 !important;
          border-radius: 999px !important;
          padding: 0 20px !important;
          color: #071b49 !important;
          background: #ffffff !important;
          font: inherit !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          box-shadow: 0 10px 24px rgba(7, 27, 73, 0.06) !important;
        }

        .presetGrid button:first-child,
        .saveButton {
          border-color: #f72585 !important;
          background: #f72585 !important;
          color: #ffffff !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.20) !important;
        }

        .presetGrid button:disabled,
        .saveButton:disabled {
          cursor: not-allowed !important;
          opacity: 0.65 !important;
        }

        .dayGrid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
        }

        .dayCard {
          display: grid !important;
          gap: 16px !important;
          padding: 20px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .dayCard.closed {
          background: #ffffff !important;
        }

        .dayTop {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 14px !important;
          align-items: center !important;
        }

        .dayTop h3 {
          margin: 7px 0 0 !important;
          color: #071b49 !important;
          font-size: clamp(1.55rem, 3vw, 1.95rem) !important;
          line-height: 1.05 !important;
          letter-spacing: -0.04em !important;
          font-weight: 800 !important;
        }

        .switchLabel {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          border-radius: 999px !important;
          padding: 10px 13px !important;
          color: #071b49 !important;
          background: #f5f7fb !important;
          border: 1px solid #dfe5f1 !important;
          font-size: 0.88rem !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .switchLabel input {
          width: 20px !important;
          height: 20px !important;
          accent-color: #f72585 !important;
        }

        .timeGrid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .timeGrid label {
          display: grid !important;
          gap: 7px !important;
          color: #52617a !important;
          font-size: 0.82rem !important;
          font-weight: 800 !important;
        }

        .timeGrid input {
          width: 100% !important;
          min-height: 52px !important;
          border: 1px solid #d7e0ee !important;
          border-radius: 18px !important;
          padding: 0 14px !important;
          color: #071b49 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          font: inherit !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
          outline: none !important;
        }

        .timeGrid input:focus {
          border-color: #f72585 !important;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.11) !important;
        }

        .dayCard p {
          max-width: none !important;
          padding: 14px !important;
          border-radius: 16px !important;
          background: #f5f7fb !important;
        }

        .saveButton {
          width: 100% !important;
          min-height: 60px !important;
          font-size: 1.05rem !important;
        }

        @media (max-width: 760px) {
          :global(body:has(.fromone-booking-times-page) .main-content) {
            padding-top: 0 !important;
          }

          .bookingTimesPage {
            padding: 0 0 130px !important;
          }

          .bookingTimesShell {
            width: calc(100% - 72px) !important;
            max-width: 468px !important;
            min-height: auto !important;
            margin: 24px auto 0 !important;
            padding: 28px 26px 26px !important;
            border-radius: 26px !important;
          }

          .bookingTimesHero {
            margin-bottom: 32px !important;
          }

          .bookingTimesHero h1 {
            margin: 14px 0 18px !important;
            font-size: clamp(2.75rem, 11vw, 3.6rem) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.058em !important;
          }

          .bookingTimesHero p {
            font-size: 1rem !important;
            line-height: 1.45 !important;
          }

          .bookingTimesHero .backPill,
          .simplePanel a {
            width: 100% !important;
          }

          .timesSummary,
          .presetGrid,
          .dayGrid,
          .sectionTop,
          .dayTop,
          .timeGrid {
            grid-template-columns: 1fr !important;
          }

          .timesSummary {
            gap: 14px !important;
          }

          .simplePanel {
            padding: 20px !important;
            border-radius: 24px !important;
          }

          .presetGrid button,
          .saveButton {
            width: 100% !important;
          }

          .switchLabel {
            justify-self: start !important;
          }
        }

        @media (max-width: 420px) {
          .bookingTimesShell {
            width: calc(100% - 48px) !important;
            padding: 26px 22px 24px !important;
          }
        }

        /* -------------------------------------------------------------- */
        /* BOOKING TIMES HERO FIX — keep back button separate              */
        /* -------------------------------------------------------------- */
        .bookingTimesHero .backPill {
          display: inline-flex !important;
          width: fit-content !important;
          margin: 0 0 26px 0 !important;
        }

        .bookingTimesHero > span {
          display: block !important;
          width: 100% !important;
          clear: both !important;
          margin: 0 0 0 0 !important;
        }

        @media (max-width: 760px) {
          .bookingTimesHero .backPill {
            width: fit-content !important;
            max-width: 100% !important;
            margin-bottom: 26px !important;
          }

          .bookingTimesHero > span {
            display: block !important;
            width: 100% !important;
          }
        }

      `}</style>
    </main>
  );
}
