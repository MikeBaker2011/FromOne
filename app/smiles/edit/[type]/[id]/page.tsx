"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SmilezSectionHeader from "@/app/components/SmilezSectionHeader";
import "../../../../posts/posts-companion-shared.css";
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

function isValidHttpUrl(value: string) {
  const cleanValue = cleanText(value);

  if (!cleanValue) return true;

  try {
    const url = new URL(cleanValue);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDateRange(startDate: string, endDate: string) {
  return !startDate || !endDate || startDate <= endDate;
}

function isValidTimeRange(startTime: string, endTime: string) {
  return !startTime || !endTime || startTime < endTime;
}

function isValidEventDateTimeRange(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
) {
  if (!startDate) return false;

  const resolvedEndDate = endDate || startDate;

  if (resolvedEndDate < startDate) return false;

  if (!startTime || !endTime) return true;

  const startDateTime = new Date(`${startDate}T${startTime}:00`);
  const endDateTime = new Date(`${resolvedEndDate}T${endTime}:00`);

  if (
    Number.isNaN(startDateTime.getTime()) ||
    Number.isNaN(endDateTime.getTime())
  ) {
    return false;
  }

  return endDateTime.getTime() > startDateTime.getTime();
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
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [item, setItem] = useState<SmilesItem | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
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
    setShortDescription(cleanText(nextItem.short_description));
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

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanShortDescription = shortDescription.trim();

    if (!cleanTitle) {
      showToast({
        type: "warning",
        title: "Title needed",
        message: `Add a public ${itemLabel} title before saving.`,
      });
      return;
    }

    if (!cleanDescription) {
      showToast({
        type: "warning",
        title: "Description needed",
        message: `Add a public ${itemLabel} description before saving.`,
      });
      return;
    }

    if (cleanShortDescription.length > 180) {
      showToast({
        type: "warning",
        title: "Short description too long",
        message: "Keep the short description to 180 characters or fewer.",
      });
      return;
    }

    if (!isValidHttpUrl(mainImageUrl)) {
      showToast({
        type: "warning",
        title: "Image URL not valid",
        message: "Use a full image URL beginning with http:// or https://.",
      });
      return;
    }

    if (isOffer && !isValidDateRange(offerStartDate, offerEndDate)) {
      showToast({
        type: "warning",
        title: "Offer dates not valid",
        message: "The offer end date must be on or after the start date.",
      });
      return;
    }

    if (isEvent && !eventStartDate) {
      showToast({
        type: "warning",
        title: "Event date needed",
        message: "Choose a start date for the event.",
      });
      return;
    }

    if (isEvent && !isValidDateRange(eventStartDate, eventEndDate)) {
      showToast({
        type: "warning",
        title: "Event dates not valid",
        message: "The event end date must be on or after the start date.",
      });
      return;
    }

    if (
      isEvent &&
      !isValidEventDateTimeRange(
        eventStartDate,
        eventEndDate,
        startTime,
        endTime,
      )
    ) {
      showToast({
        type: "warning",
        title: "Event date or time not valid",
        message:
          "The event must end after it starts. Overnight events are valid when the end date is later than the start date.",
      });
      return;
    }

    if (isEvent && !isValidHttpUrl(bookingUrl)) {
      showToast({
        type: "warning",
        title: "Booking link not valid",
        message: "Use a full booking URL beginning with http:// or https://.",
      });
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const headers = await getAuthHeaders();
      const payload = isOffer
        ? {
            title: cleanTitle,
            description: cleanDescription,
            short_description:
              cleanShortDescription || cleanDescription.slice(0, 180),
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
            title: cleanTitle,
            description: cleanDescription,
            short_description:
              cleanShortDescription || cleanDescription.slice(0, 180),
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
      setMessage(isPublished ? "Live Smilez listing updated." : "Smilez listing saved as hidden.");
      showToast({
        type: "success",
        title: isPublished ? "Smilez listing updated" : "Smilez listing hidden",
        message: isPublished
          ? "The public Smilez listing has been updated."
          : "The listing has been saved and is no longer public.",
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

  const deleteItem = async () => {
    if (!type || !id || deleting) return;

    const confirmed = window.confirm(
      `Delete this Smilez ${itemLabel} permanently? This removes the public listing and cannot be undone. The original FromOne post will remain.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage("");

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/smiles/items/${type}/${id}`, {
        method: "DELETE",
        headers,
      });
      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || result.ok === false || result.success === false) {
        throw new Error(result.message || `Could not delete this Smilez ${itemLabel}.`);
      }

      showToast({
        type: "success",
        title: `Smilez ${itemLabel} deleted`,
        message: `The public Smilez ${itemLabel} has been permanently deleted. The original FromOne post remains.`,
      });

      router.replace("/smiles");
      router.refresh();
    } catch (error: any) {
      const errorMessage =
        error?.message || `Could not delete this Smilez ${itemLabel}.`;
      setMessage(errorMessage);
      showToast({
        type: "error",
        title: "Could not delete",
        message: errorMessage,
      });
      setDeleting(false);
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
    <main className="fromone-posts-page fromone-smiles-edit-page settings-create-style-page">
      <section id="fromone-standard-shell" className="smiles-edit-card">
        <SmilezSectionHeader
          eyebrow="Live Smilez listing"
          title={<>Edit live {itemLabel} listing.</>}
          description={
            <>
              Changes here update the public Smilez {itemLabel} card and detail page.
              They do not edit the original Facebook, Instagram or source post.
            </>
          }
        />

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
                    Reference {item.reference_code || "pending"} · {isPublished ? "Public" : "Hidden"}
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
                  <span>Short card description</span>
                  <textarea
                    value={shortDescription}
                    onChange={(event) => setShortDescription(event.target.value)}
                    placeholder="A concise summary for Smilez cards and search results"
                    maxLength={180}
                  />
                  <small>{shortDescription.length}/180 characters</small>
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
                  <span>Show this listing publicly on Smilez</span>
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
              <button type="button" onClick={saveItem} disabled={saving || deleting}>
                {saving ? "Saving..." : `Save ${isPublished ? "public" : "hidden"} ${itemLabel}`}
              </button>
              <button
                type="button"
                onClick={() => router.push("/smiles")}
                disabled={saving || deleting}
              >
                Cancel
              </button>
            </div>

            <section className="smiles-edit-danger-zone" aria-labelledby="smiles-delete-heading">
              <div>
                <span>Permanent action</span>
                <h2 id="smiles-delete-heading">Delete this Smilez {itemLabel}</h2>
                <p>
                  This removes the public Smilez listing permanently. The original FromOne
                  post will remain.
                </p>
              </div>

              <button
                type="button"
                onClick={deleteItem}
                disabled={saving || deleting}
              >
                {deleting
                  ? `Deleting ${itemLabel}...`
                  : `Delete ${itemLabel} permanently`}
              </button>
            </section>
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

        .smiles-edit-grid label small {
          color: #6d7d95;
          font-size: 0.78rem;
          font-weight: 750;
          text-align: right;
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

        .smiles-edit-danger-zone {
          margin-top: 28px;
          padding: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border: 1px solid rgba(190, 24, 93, 0.22);
          border-radius: 24px;
          background: #fff7fa;
        }

        .smiles-edit-danger-zone span {
          display: block;
          margin-bottom: 5px;
          color: #be185d;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .smiles-edit-danger-zone h2 {
          margin: 0;
          color: #7f1d1d;
          font-size: 20px;
          line-height: 1.15;
        }

        .smiles-edit-danger-zone p {
          margin: 7px 0 0;
          max-width: 580px;
          color: #7d5261;
          font-weight: 700;
          line-height: 1.45;
        }

        .smiles-edit-danger-zone button {
          min-height: 48px;
          flex: 0 0 auto;
          padding: 0 20px;
          border: 1px solid #be185d;
          border-radius: 999px;
          background: #ffffff;
          color: #be185d;
          font: inherit;
          font-weight: 950;
          cursor: pointer;
        }

        .smiles-edit-danger-zone button:hover:not(:disabled) {
          background: #be185d;
          color: #ffffff;
        }

        .smiles-edit-danger-zone button:disabled {
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

          .smiles-edit-danger-zone {
            align-items: stretch;
            flex-direction: column;
          }

          .smiles-edit-danger-zone button {
            width: 100%;
          }
        }

        /* FINAL SHARED FROMONE PAGE SYSTEM */
        :global(body:has(.fromone-smiles-edit-page)) {
          background: var(--posts-bg) !important;
        }

        :global(body:has(.fromone-smiles-edit-page) .app-shell),
        :global(body:has(.fromone-smiles-edit-page) .main-content) {
          background: var(--posts-bg) !important;
        }

        :global(body:has(.fromone-smiles-edit-page) .main-content) {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          overflow-x: hidden !important;
        }

        .fromone-smiles-edit-page {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          background-image: none !important;
          overflow: visible !important;
        }

        .smiles-edit-card {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          display: grid !important;
          gap: 22px !important;
          overflow: visible !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .smiles-edit-back {
          margin: 0 0 2px !important;
        }

        .smiles-edit-hero {
          width: 100% !important;
          max-width: 790px !important;
          margin: 0 0 6px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .smiles-edit-eyebrow {
          display: block !important;
          margin: 0 0 10px !important;
          color: var(--posts-pink) !important;
          font-size: 0.74rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
        }

        .smiles-edit-hero h1 {
          max-width: 760px !important;
          margin: 0 0 12px !important;
          color: var(--posts-navy) !important;
          font-size: clamp(2.6rem, 5vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.06em !important;
          font-weight: 800 !important;
        }

        .smiles-edit-hero p {
          max-width: 720px !important;
          margin: 0 !important;
          color: var(--posts-muted) !important;
          font-size: 1.03rem !important;
          line-height: 1.56 !important;
          font-weight: 500 !important;
        }

        .smiles-edit-message,
        .smiles-edit-panel,
        .smiles-edit-danger-zone {
          border: 1px solid var(--posts-border) !important;
          border-radius: 26px !important;
          background: rgba(255, 255, 255, 0.84) !important;
          box-shadow: var(--posts-shadow) !important;
          backdrop-filter: blur(10px) !important;
        }

        .smiles-edit-message {
          margin: 0 !important;
          padding: 15px 16px !important;
          background: #fff5fa !important;
          border-color: rgba(247, 37, 133, 0.18) !important;
        }

        .smiles-edit-panel {
          margin: 0 !important;
          padding: 22px !important;
          background: rgba(255, 255, 255, 0.84) !important;
        }

        .smiles-edit-grid input,
        .smiles-edit-grid textarea,
        .smiles-edit-grid select {
          min-height: 48px !important;
          border: 1px solid var(--posts-border) !important;
          border-radius: 14px !important;
          color: var(--posts-navy) !important;
          background: #fff !important;
        }

        .smiles-edit-grid input:focus,
        .smiles-edit-grid textarea:focus,
        .smiles-edit-grid select:focus {
          border-color: var(--posts-pink) !important;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.1) !important;
        }

        .smiles-edit-image-preview img,
        .smiles-edit-image-placeholder,
        .smiles-edit-toggle {
          border: 1px solid var(--posts-border) !important;
          border-radius: 18px !important;
          background: #fff !important;
        }

        .smiles-edit-actions {
          margin: 0 !important;
        }

        .smiles-edit-actions button,
        .smiles-edit-danger-zone button {
          min-height: 46px !important;
          padding: 0 17px !important;
          border-radius: 15px !important;
          font-size: 0.86rem !important;
          font-weight: 900 !important;
        }

        .smiles-edit-actions button:first-child {
          border: 0 !important;
          background: var(--posts-pink) !important;
          color: #fff !important;
          box-shadow: 0 10px 24px rgba(247, 37, 133, 0.21) !important;
        }

        .smiles-edit-actions button:last-child {
          border: 1px solid var(--posts-border) !important;
          background: #fff !important;
          color: var(--posts-navy) !important;
          box-shadow: none !important;
        }

        .smiles-edit-danger-zone {
          margin: 0 !important;
          padding: 22px !important;
          background: #fff7fa !important;
          border-color: rgba(190, 24, 93, 0.2) !important;
        }

        @media (max-width: 700px) {
          :global(body:has(.fromone-smiles-edit-page) .main-content) {
            padding: 24px 16px 100px !important;
          }

          .fromone-smiles-edit-page {
            padding: 0 !important;
          }

          .smiles-edit-hero h1 {
            font-size: clamp(2.25rem, 11vw, 3rem) !important;
          }

          .smiles-edit-hero p {
            font-size: 0.95rem !important;
          }

          .smiles-edit-grid,
          .smiles-edit-actions {
            grid-template-columns: 1fr !important;
          }

          .smiles-edit-panel,
          .smiles-edit-danger-zone {
            padding: 17px !important;
            border-radius: 21px !important;
          }

          .smiles-edit-danger-zone {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .smiles-edit-danger-zone button {
            width: 100% !important;
          }
        }

      `}</style>
    </main>
  );
}