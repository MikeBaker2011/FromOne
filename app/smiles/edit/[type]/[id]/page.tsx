"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useToast } from "@/app/components/ToastProvider";

type SmilesItemType = "offer" | "event";

type SmilesItem = {
  id: string;
  type: SmilesItemType;
  title: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  saving_text?: string | null;
  pricing_label?: string | null;
  price_value?: string | null;
  terms?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  valid_days?: string | null;
  valid_times?: string | null;
  location_name?: string | null;
  address?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  ticket_type?: string | null;
  ticket_price?: string | null;
  price_text?: string | null;
  booking_url?: string | null;
  main_image_url?: string | null;
  reference_code?: string | null;
  is_published?: boolean | null;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  item?: SmilesItem | null;
};

const offerPricingOptions = [
  "Free",
  "Discount",
  "Fixed price",
  "From price",
  "BOGOF / multibuy",
  "Ask venue",
  "Price to be confirmed",
];

const eventTicketOptions = [
  "Free entry",
  "Ticketed",
  "Pay on door",
  "From price",
  "Donation",
  "Price to be confirmed",
];

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function getDateInputValue(value?: string | null) {
  const cleanValue = cleanText(value);
  return cleanValue ? cleanValue.slice(0, 10) : "";
}

function getTimeInputValue(value?: string | null) {
  const cleanValue = cleanText(value);
  return cleanValue ? cleanValue.slice(0, 5) : "";
}

function normaliseType(value: unknown): SmilesItemType | "" {
  const cleanValue = cleanText(value).toLowerCase();

  if (cleanValue === "offer" || cleanValue === "offers") return "offer";
  if (cleanValue === "event" || cleanValue === "events") return "event";

  return "";
}

export default function SmilesDirectEditPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const type = useMemo(() => normaliseType(params?.type), [params]);
  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? cleanText(value[0]) : cleanText(value);
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [item, setItem] = useState<SmilesItem | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const [savingText, setSavingText] = useState("");
  const [pricingLabel, setPricingLabel] = useState("Price to be confirmed");
  const [priceValue, setPriceValue] = useState("");
  const [terms, setTerms] = useState("");
  const [offerStartDate, setOfferStartDate] = useState("");
  const [offerEndDate, setOfferEndDate] = useState("");
  const [validDays, setValidDays] = useState("");
  const [validTimes, setValidTimes] = useState("");

  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [ticketType, setTicketType] = useState("Price to be confirmed");
  const [ticketPrice, setTicketPrice] = useState("");
  const [priceText, setPriceText] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  const isOffer = type === "offer";
  const isEvent = type === "event";
  const itemLabel = isOffer ? "offer" : "event";

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Please sign in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const populateForm = (nextItem: SmilesItem) => {
    setItem(nextItem);
    setTitle(cleanText(nextItem.title));
    setDescription(cleanText(nextItem.description));
    setMainImageUrl(cleanText(nextItem.main_image_url));
    setIsPublished(nextItem.is_published !== false);

    setSavingText(cleanText(nextItem.saving_text));
    setPricingLabel(cleanText(nextItem.pricing_label) || "Price to be confirmed");
    setPriceValue(cleanText(nextItem.price_value));
    setTerms(cleanText(nextItem.terms));
    setOfferStartDate(getDateInputValue(nextItem.start_date));
    setOfferEndDate(getDateInputValue(nextItem.end_date));
    setValidDays(cleanText(nextItem.valid_days));
    setValidTimes(cleanText(nextItem.valid_times));

    setLocationName(cleanText(nextItem.location_name));
    setAddress(cleanText(nextItem.address));
    setEventStartDate(getDateInputValue(nextItem.start_date));
    setEventEndDate(getDateInputValue(nextItem.end_date));
    setStartTime(getTimeInputValue(nextItem.start_time));
    setEndTime(getTimeInputValue(nextItem.end_time));
    setTicketType(cleanText(nextItem.ticket_type) || "Price to be confirmed");
    setTicketPrice(cleanText(nextItem.ticket_price));
    setPriceText(cleanText(nextItem.price_text));
    setBookingUrl(cleanText(nextItem.booking_url));
  };

  const loadItem = async () => {
    if (!type || !id) {
      setLoading(false);
      setMessage("This Smiles listing link is not valid.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/smiles/items/${type}/${id}`, {
        method: "GET",
        headers,
      });
      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || result.ok === false || result.success === false || !result.item) {
        throw new Error(result.message || "Could not load this Smiles listing.");
      }

      populateForm(result.item);
    } catch (error: any) {
      const errorMessage = error?.message || "Could not load this Smiles listing.";
      setMessage(errorMessage);
      showToast({
        type: "error",
        title: "Could not load Smiles listing",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const saveItem = async () => {
    if (!type || !id) return;

    setSaving(true);
    setMessage("");

    try {
      const headers = await getAuthHeaders();
      const payload = isOffer
        ? {
            title,
            description,
            short_description: description,
            saving_text: savingText,
            pricing_label: pricingLabel,
            price_value: priceValue,
            terms,
            start_date: offerStartDate || null,
            end_date: offerEndDate || null,
            valid_days: validDays,
            valid_times: validTimes,
            main_image_url: mainImageUrl,
            is_published: isPublished,
          }
        : {
            title,
            description,
            short_description: description,
            location_name: locationName,
            address,
            start_date: eventStartDate || null,
            end_date: eventEndDate || null,
            start_time: startTime || null,
            end_time: endTime || null,
            ticket_type: ticketType,
            ticket_price: ticketPrice,
            price_text: priceText,
            booking_url: bookingUrl,
            main_image_url: mainImageUrl,
            is_published: isPublished,
          };

      const response = await fetch(`/api/smiles/items/${type}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || result.ok === false || result.success === false || !result.item) {
        throw new Error(result.message || "Could not save this Smiles listing.");
      }

      populateForm(result.item);
      setMessage("Live Smiles listing updated.");
      showToast({
        type: "success",
        title: "Smiles listing updated",
        message: "The live Smiles listing has been updated.",
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Could not save this Smiles listing.";
      setMessage(errorMessage);
      showToast({
        type: "error",
        title: "Could not save",
        message: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  useEffect(() => {
    setImagePreviewFailed(false);
  }, [mainImageUrl]);

  return (
    <main className="fromone-smiles-edit-page settings-create-style-page">
      <section id="fromone-standard-shell" className="smiles-edit-card">
        <Link className="smiles-edit-back" href="/smiles">
          Back to Smiles hub
        </Link>

        <header className="smiles-edit-hero">
          <div className="smiles-edit-eyebrow">Live Smiles listing</div>
          <h1>Edit live {itemLabel} listing.</h1>
          <p>
            Changes here update the public Smiles {itemLabel} card and detail page. They do
            not edit the original Facebook, Instagram or source post.
          </p>
        </header>

        {message ? <div className="smiles-edit-message">{message}</div> : null}

        {loading ? (
          <section className="smiles-edit-panel">
            <h2>Loading item...</h2>
            <p>Checking the Smiles record.</p>
          </section>
        ) : !item ? (
          <section className="smiles-edit-panel">
            <h2>Item not found</h2>
            <p>{message || "This Smiles listing could not be loaded."}</p>
          </section>
        ) : (
          <>
            <section className="smiles-edit-panel">
              <div className="smiles-edit-panel-head">
                <span>01</span>
                <div>
                  <h2>Public listing details</h2>
                  <p>
                    Reference {item.reference_code || "pending"} · {isPublished ? "Live" : "Hidden"}
                  </p>
                </div>
              </div>

              <div className="smiles-edit-grid">
                <label className="is-wide">
                  <span>{isOffer ? "Offer listing title" : "Event listing title"}</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>

                <label className="is-wide">
                  <span>Public description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>

                <label className="is-wide">
                  <span>Main image URL</span>
                  <input
                    value={mainImageUrl}
                    onChange={(event) => setMainImageUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <div className="smiles-edit-image-preview is-wide">
                  <span>Current public image</span>
                  {mainImageUrl && !imagePreviewFailed ? (
                    <img
                      src={mainImageUrl}
                      alt={`${isOffer ? "Offer" : "Event"} listing preview`}
                      onError={() => setImagePreviewFailed(true)}
                    />
                  ) : (
                    <div className="smiles-edit-image-placeholder">
                      {mainImageUrl ? "Image could not be loaded" : "No image set"}
                    </div>
                  )}
                </div>

                <label className="smiles-edit-toggle">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(event) => setIsPublished(event.target.checked)}
                  />
                  <span>Show this listing publicly on Smiles</span>
                </label>
              </div>
            </section>

            {isOffer ? (
              <section className="smiles-edit-panel">
                <div className="smiles-edit-panel-head">
                  <span>02</span>
                  <div>
                    <h2>Live offer details</h2>
                    <p>Set the public saving, pricing label and dates.</p>
                  </div>
                </div>

                <div className="smiles-edit-grid">
                  <label>
                    <span>Saving or price text</span>
                    <input
                      value={savingText}
                      onChange={(event) => setSavingText(event.target.value)}
                      placeholder="Example: 2 cocktails for £12"
                    />
                  </label>

                  <label>
                    <span>Pricing label</span>
                    <select
                      value={pricingLabel}
                      onChange={(event) => setPricingLabel(event.target.value)}
                    >
                      {offerPricingOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Price / saving value</span>
                    <input
                      value={priceValue}
                      onChange={(event) => setPriceValue(event.target.value)}
                      placeholder="Example: £12 or 20%"
                    />
                  </label>

                  <label>
                    <span>Start date</span>
                    <input
                      type="date"
                      value={offerStartDate}
                      onChange={(event) => setOfferStartDate(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>End date</span>
                    <input
                      type="date"
                      value={offerEndDate}
                      onChange={(event) => setOfferEndDate(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Valid days</span>
                    <input
                      value={validDays}
                      onChange={(event) => setValidDays(event.target.value)}
                      placeholder="Example: Friday and Saturday"
                    />
                  </label>

                  <label>
                    <span>Valid times</span>
                    <input
                      value={validTimes}
                      onChange={(event) => setValidTimes(event.target.value)}
                      placeholder="Example: Before 10pm"
                    />
                  </label>

                  <label className="is-wide">
                    <span>Terms</span>
                    <input
                      value={terms}
                      onChange={(event) => setTerms(event.target.value)}
                      placeholder="Example: Subject to availability"
                    />
                  </label>
                </div>
              </section>
            ) : null}

            {isEvent ? (
              <section className="smiles-edit-panel">
                <div className="smiles-edit-panel-head">
                  <span>02</span>
                  <div>
                    <h2>Live event details</h2>
                    <p>Set the public date, time, ticket details and booking link.</p>
                  </div>
                </div>

                <div className="smiles-edit-grid">
                  <label>
                    <span>Location name</span>
                    <input
                      value={locationName}
                      onChange={(event) => setLocationName(event.target.value)}
                      placeholder="Example: Neon Yard Stockport"
                    />
                  </label>

                  <label>
                    <span>Address</span>
                    <input value={address} onChange={(event) => setAddress(event.target.value)} />
                  </label>

                  <label>
                    <span>Start date</span>
                    <input
                      type="date"
                      value={eventStartDate}
                      onChange={(event) => setEventStartDate(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>End date</span>
                    <input
                      type="date"
                      value={eventEndDate}
                      onChange={(event) => setEventEndDate(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Start time</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>End time</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Ticket type</span>
                    <select value={ticketType} onChange={(event) => setTicketType(event.target.value)}>
                      {eventTicketOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Ticket price</span>
                    <input
                      value={ticketPrice}
                      onChange={(event) => setTicketPrice(event.target.value)}
                      placeholder="Example: £10"
                    />
                  </label>

                  <label>
                    <span>Price text</span>
                    <input
                      value={priceText}
                      onChange={(event) => setPriceText(event.target.value)}
                      placeholder="Example: Pay on door - £10"
                    />
                  </label>

                  <label>
                    <span>Booking link</span>
                    <input
                      value={bookingUrl}
                      onChange={(event) => setBookingUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </label>
                </div>
              </section>
            ) : null}

            <div className="smiles-edit-actions">
              <button type="button" onClick={saveItem} disabled={saving}>
                {saving ? "Saving..." : `Save live ${itemLabel} listing`}
              </button>
              <button type="button" onClick={() => router.push("/smiles")}>
                Cancel
              </button>
            </div>
          </>
        )}
      </section>

      <style jsx>{`
        .fromone-smiles-edit-page {
          width: 100%;
          min-height: 100vh;
          padding: clamp(24px, 5vw, 64px);
          background:
            radial-gradient(circle at top left, rgba(247, 37, 133, 0.12), transparent 34%),
            #f5f8fc;
          color: #071b49;
        }

        .smiles-edit-card {
          width: min(100%, 980px);
          margin: 0 auto;
          padding: clamp(24px, 4vw, 44px);
          border: 1px solid #dfe5f1;
          border-radius: 34px;
          background: #ffffff;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.1);
        }

        .smiles-edit-back {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 0 18px;
          border: 1px solid #ffd2e5;
          border-radius: 999px;
          color: #071b49;
          font-weight: 900;
          text-decoration: none;
        }

        .smiles-edit-hero {
          margin: 28px 0 24px;
        }

        .smiles-edit-eyebrow,
        .smiles-edit-grid label span {
          color: #f72585;
          font-size: 0.82rem;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .smiles-edit-hero h1 {
          margin: 8px 0;
          font-size: clamp(2.4rem, 7vw, 4.3rem);
          line-height: 0.92;
          letter-spacing: -0.055em;
        }

        .smiles-edit-hero p,
        .smiles-edit-panel-head p {
          margin: 0;
          color: #52617a;
          font-weight: 750;
        }

        .smiles-edit-message {
          margin-bottom: 18px;
          padding: 14px 16px;
          border: 1px solid #ffd2e5;
          border-radius: 18px;
          background: #fff5fa;
          color: #071b49;
          font-weight: 850;
        }

        .smiles-edit-panel {
          display: grid;
          gap: 18px;
          margin-top: 18px;
          padding: clamp(18px, 3vw, 26px);
          border: 1px solid #dfe5f1;
          border-radius: 26px;
          background: #f8fbff;
        }

        .smiles-edit-panel-head {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .smiles-edit-panel-head > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #f72585;
          color: #ffffff;
          font-weight: 950;
          box-shadow: 0 14px 30px rgba(247, 37, 133, 0.2);
        }

        .smiles-edit-panel h2 {
          margin: 0;
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          line-height: 1;
          letter-spacing: -0.035em;
        }

        .smiles-edit-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .smiles-edit-grid label {
          display: grid;
          gap: 8px;
          margin: 0;
        }

        .smiles-edit-grid .is-wide,
        .smiles-edit-toggle {
          grid-column: 1 / -1;
        }

        .smiles-edit-grid input,
        .smiles-edit-grid textarea,
        .smiles-edit-grid select {
          width: 100%;
          min-height: 54px;
          padding: 13px 16px;
          border: 1px solid #d7e0ee;
          border-radius: 18px;
          background: #ffffff;
          color: #071b49;
          box-sizing: border-box;
          font: inherit;
          font-weight: 750;
          outline: none;
        }

        .smiles-edit-grid textarea {
          min-height: 132px;
          resize: vertical;
          line-height: 1.45;
        }

        .smiles-edit-grid select {
          appearance: none;
          background-image: linear-gradient(45deg, transparent 50%, #071b49 50%),
            linear-gradient(135deg, #071b49 50%, transparent 50%);
          background-position: calc(100% - 22px) 24px, calc(100% - 16px) 24px;
          background-size: 6px 6px, 6px 6px;
          background-repeat: no-repeat;
          padding-right: 42px;
        }

        .smiles-edit-grid input:focus,
        .smiles-edit-grid textarea:focus,
        .smiles-edit-grid select:focus {
          border-color: #f72585;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.1);
        }

        .smiles-edit-image-preview {
          display: grid;
          gap: 8px;
        }

        .smiles-edit-image-preview > span {
          color: #f72585;
          font-size: 0.82rem;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .smiles-edit-image-preview img,
        .smiles-edit-image-placeholder {
          width: 100%;
          aspect-ratio: 16 / 9;
          border: 1px solid #d7e0ee;
          border-radius: 22px;
          background: #ffffff;
          box-sizing: border-box;
        }

        .smiles-edit-image-preview img {
          display: block;
          object-fit: cover;
        }

        .smiles-edit-image-placeholder {
          display: grid;
          place-items: center;
          color: #7d8ca3;
          font-weight: 900;
        }

        .smiles-edit-toggle {
          display: flex !important;
          align-items: center;
          gap: 12px !important;
          padding: 14px 16px;
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
        }

        .smiles-edit-toggle input {
          width: 20px;
          min-height: 20px;
        }

        .smiles-edit-toggle span {
          color: #071b49 !important;
          letter-spacing: 0 !important;
          text-transform: none !important;
        }

        .smiles-edit-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 220px);
          gap: 12px;
          margin-top: 22px;
        }

        .smiles-edit-actions button {
          min-height: 58px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-weight: 950;
          cursor: pointer;
        }

        .smiles-edit-actions button:first-child {
          border-color: #f72585;
          background: #f72585;
          color: #ffffff;
          box-shadow: 0 18px 38px rgba(247, 37, 133, 0.24);
        }

        .smiles-edit-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        @media (max-width: 760px) {
          .fromone-smiles-edit-page {
            padding: 18px;
          }

          .smiles-edit-card {
            border-radius: 26px;
            padding: 22px;
          }

          .smiles-edit-grid,
          .smiles-edit-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
