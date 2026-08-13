"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SmilezBackButton from "@/app/components/SmilezBackButton";
import "../../posts/posts-companion-shared.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useToast } from "@/app/components/ToastProvider";

type SmilesProfile = {
  business_name: string | null;
  smiles_listing_venue_id: string | null;
};

type CustomerPhoto = {
  id: string;
  title: string | null;
  caption: string | null;
  image_alt: string | null;
  image_url: string | null;
  linked_item_title: string | null;
  linked_item_href: string | null;
  linked_venue_id: string | null;
  status: "pending" | "approved" | "rejected" | null;
  rejection_reason: string | null;
  created_at: string | null;
};

type CustomerPhotoReport = {
  id: string;
  photo_id: string;
  reason: "inappropriate" | "privacy" | "copyright" | "not_this_venue" | "other";
  details: string | null;
  status: "pending" | "reviewed" | "dismissed" | "photo_removed" | null;
  created_at: string | null;
  reviewed_at: string | null;
};

type SmilesResponse = {
  success?: boolean;
  message?: string;
  profile?: SmilesProfile | null;
  customerPhotos?: CustomerPhoto[];
  photos?: CustomerPhoto[];
  customerPhotoReports?: CustomerPhotoReport[];
  photoReports?: CustomerPhotoReport[];
};

function formatSubmittedAt(value: string | null) {
  if (!value) return "Recently submitted";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently submitted";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: CustomerPhoto["status"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Waiting for decision";
}

function getReportReasonLabel(reason: CustomerPhotoReport["reason"]) {
  if (reason === "inappropriate") return "Inappropriate content";
  if (reason === "privacy") return "Privacy concern";
  if (reason === "copyright") return "Copyright concern";
  if (reason === "not_this_venue") return "Not from this venue";
  return "Other concern";
}

export default function SmilesPhotosPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SmilesProfile | null>(null);
  const [photos, setPhotos] = useState<CustomerPhoto[]>([]);
  const [reports, setReports] = useState<CustomerPhotoReport[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});

  const pendingPhotos = useMemo(
    () => photos.filter((photo) => photo.status === "pending"),
    [photos]
  );

  const approvedPhotos = useMemo(
    () => photos.filter((photo) => photo.status === "approved"),
    [photos]
  );

  const rejectedPhotos = useMemo(
    () => photos.filter((photo) => photo.status === "rejected"),
    [photos]
  );

  const pendingReports = useMemo(
    () => reports.filter((report) => report.status === "pending"),
    [reports]
  );

  const photosToShow = showAll ? photos : pendingPhotos;

  async function getAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Please sign in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function loadPhotos() {
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const result = (await response.json()) as SmilesResponse;

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not load customer photos.");
      }

      setProfile(result.profile || null);
      setPhotos(result.customerPhotos || result.photos || []);
      setReports(result.customerPhotoReports || result.photoReports || []);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Photos unavailable",
        message: error?.message || "Could not load customer photos.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function moderatePhoto(
    photoId: string,
    decision: "approved" | "rejected"
  ) {
    const rejectionReason = String(
      rejectionReasons[photoId] || ""
    ).trim();

    if (decision === "rejected" && !rejectionReason) {
      showToast({
        type: "error",
        title: "Reason needed",
        message: "Add a short reason before rejecting this photo.",
      });
      return;
    }

    setBusyId(photoId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "moderate_customer_photo",
          photoId,
          decision,
          rejectionReason,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not update the photo.");
      }

      showToast({
        type: "success",
        title: decision === "approved" ? "Photo approved" : "Photo rejected",
        message: result.message || "The photo was updated.",
      });

      await loadPhotos();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Photo not updated",
        message: error?.message || "Could not update the photo.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function reviewReport(
    reportId: string,
    action: "dismiss_customer_photo_report" | "remove_reported_customer_photo"
  ) {
    setBusyId(reportId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/smiles/business", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, reportId }),
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not update the report.");
      }

      showToast({
        type: "success",
        title:
          action === "dismiss_customer_photo_report"
            ? "Report dismissed"
            : "Photo removed",
        message: result.message || "The report was updated.",
      });

      await loadPhotos();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Report not updated",
        message: error?.message || "Could not update the report.",
      });
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="fromone-posts-page fromone-smiles-photos-page smilesPhotosPage">
      <section id="fromone-standard-shell" className="photosShell">
        <header className="photosSimpleHero">
          <div>
            <span className="photosEyebrow">Smilez</span>
            <h1>Customer photos.</h1>
            <p>Approve new photos and deal with reports.</p>
          </div>
          <SmilezBackButton />
        </header>

        {loading ? (
          <section className="photosStatusCard">
            <strong>Loading photos…</strong>
            <span>Checking customer submissions.</span>
          </section>
        ) : null}

        {!loading && !profile?.smiles_listing_venue_id ? (
          <section className="photosStatusCard isWarning">
            <div>
              <strong>Your Smilez listing is not live yet</strong>
              <span>Customer photos will appear here once your listing is live.</span>
            </div>
            <Link href="/settings">Check listing</Link>
          </section>
        ) : null}

        {!loading && profile?.smiles_listing_venue_id ? (
          <>
            <section className="photosToolbar">
              <div className="photosCounts">
                <span><strong>{pendingPhotos.length}</strong> waiting</span>
                <span><strong>{pendingReports.length}</strong> reports</span>
              </div>
              <button type="button" onClick={() => setShowAll((current) => !current)}>
                {showAll ? "Show waiting only" : `View all ${photos.length}`}
              </button>
            </section>

            {pendingReports.length > 0 ? (
              <details className="photosReports" open>
                <summary>
                  <div>
                    <strong>Reported photos</strong>
                    <span>{pendingReports.length} need review</span>
                  </div>
                  <b>Review</b>
                </summary>

                <div className="reportList">
                  {pendingReports.map((report) => {
                    const photo = photos.find((item) => item.id === report.photo_id);
                    const title = String(photo?.title || "").trim() || "Reported customer photo";

                    return (
                      <article className="reportRow" key={report.id}>
                        <div className="reportThumb">
                          {photo?.image_url ? (
                            <img
                              src={photo.image_url}
                              alt={String(photo.image_alt || "").trim() || title}
                            />
                          ) : (
                            <div className="photoFallback">No preview</div>
                          )}
                        </div>

                        <div className="reportCopy">
                          <strong>{title}</strong>
                          <span>{getReportReasonLabel(report.reason)}</span>
                          {report.details ? <p>{report.details}</p> : null}
                        </div>

                        <div className="reportActions">
                          <button
                            type="button"
                            className="dismissReportButton"
                            disabled={busyId === report.id}
                            onClick={() =>
                              reviewReport(report.id, "dismiss_customer_photo_report")
                            }
                          >
                            {busyId === report.id ? "Saving…" : "Dismiss"}
                          </button>
                          <button
                            type="button"
                            className="removeReportedPhotoButton"
                            disabled={busyId === report.id}
                            onClick={() =>
                              reviewReport(report.id, "remove_reported_customer_photo")
                            }
                          >
                            {busyId === report.id ? "Saving…" : "Remove photo"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            ) : null}

            <section className="photosMainSection">
              <div className="photosSectionHead">
                <div>
                  <h2>{showAll ? "All customer photos" : "Photos to review"}</h2>
                  <p>
                    {showAll
                      ? `${approvedPhotos.length} approved · ${rejectedPhotos.length} rejected`
                      : pendingPhotos.length > 0
                        ? "Approve or reject each new photo."
                        : "Nothing needs attention."}
                  </p>
                </div>
              </div>

              {photosToShow.length === 0 ? (
                <div className="photosEmpty">
                  <strong>{showAll ? "No customer photos yet" : "You’re all caught up"}</strong>
                  <span>
                    {showAll
                      ? "Customer photos linked to your venue will appear here."
                      : "New photos will appear here when they need a decision."}
                  </span>
                </div>
              ) : (
                <div className="photoList">
                  {photosToShow.map((photo) => {
                    const title = String(photo.title || "").trim() || "Customer photo";
                    const caption = String(photo.caption || "").trim();

                    return (
                      <article className="photoRow" key={photo.id}>
                        <div className="photoThumb">
                          {photo.image_url ? (
                            <img
                              src={photo.image_url}
                              alt={String(photo.image_alt || "").trim() || title}
                            />
                          ) : (
                            <div className="photoFallback">No preview</div>
                          )}
                        </div>

                        <div className="photoCopy">
                          <div className="photoTopline">
                            <span className={`statusBadge is-${photo.status || "pending"}`}>
                              {getStatusLabel(photo.status)}
                            </span>
                            <small>{formatSubmittedAt(photo.created_at)}</small>
                          </div>
                          <h3>{title}</h3>
                          {caption ? <p>{caption}</p> : null}

                          {photo.status === "rejected" && photo.rejection_reason ? (
                            <p className="rejectedReason">{photo.rejection_reason}</p>
                          ) : null}

                          {photo.status === "pending" ? (
                            <div className="moderationBox">
                              <button
                                type="button"
                                className="approveButton"
                                disabled={busyId === photo.id}
                                onClick={() => moderatePhoto(photo.id, "approved")}
                              >
                                {busyId === photo.id ? "Saving…" : "Approve"}
                              </button>

                              <details className="rejectDetails">
                                <summary>Reject</summary>
                                <label htmlFor={`reject-${photo.id}`}>Reason</label>
                                <textarea
                                  id={`reject-${photo.id}`}
                                  value={rejectionReasons[photo.id] || ""}
                                  onChange={(event) =>
                                    setRejectionReasons((current) => ({
                                      ...current,
                                      [photo.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Add a short reason"
                                  maxLength={280}
                                />
                                <button
                                  type="button"
                                  className="rejectButton"
                                  disabled={busyId === photo.id}
                                  onClick={() => moderatePhoto(photo.id, "rejected")}
                                >
                                  {busyId === photo.id ? "Saving…" : "Reject photo"}
                                </button>
                              </details>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>

      <style jsx>{`
        :global(body:has(.fromone-smiles-photos-page)),
        :global(body:has(.fromone-smiles-photos-page) .app-shell),
        :global(body:has(.fromone-smiles-photos-page) .main-content),
        :global(body:has(.fromone-smiles-photos-page) .main-content.fromone-mobile-bottom-safe),
        :global(body:has(.fromone-smiles-photos-page) .fromone-universal-mobile-page-frame) {
          background: #ffffff !important;
          background-image: none !important;
        }

        :global(body:has(.fromone-smiles-photos-page)::before) {
          display: none !important;
          content: none !important;
        }

        :global(body:has(.fromone-smiles-photos-page) .main-content) {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 34px clamp(24px, 4vw, 54px) 90px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .smilesPhotosPage,
        .smilesPhotosPage * {
          box-sizing: border-box;
        }

        .smilesPhotosPage {
          width: 100%;
          margin: 0;
          color: #071b49;
          background: transparent !important;
        }

        .photosShell {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .photosSimpleHero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .photosEyebrow {
          display: block;
          margin-bottom: 8px;
          color: #f72585;
          font-size: 0.72rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .photosSimpleHero h1 {
          margin: 0 0 9px;
          color: #071b49;
          font-size: clamp(2.4rem, 5vw, 3.9rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .photosSimpleHero p {
          margin: 0;
          color: #66728a;
          font-size: 0.96rem;
          line-height: 1.45;
          font-weight: 600;
        }

        .photosStatusCard a {
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


        .photosStatusCard,
        .photosToolbar,
        .photosReports,
        .photosMainSection {
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: none;
        }

        .photosStatusCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .photosStatusCard > div {
          display: grid;
          gap: 3px;
        }

        .photosStatusCard strong {
          color: #071b49;
          font-size: 0.94rem;
          font-weight: 900;
        }

        .photosStatusCard span {
          color: #66728a;
          font-size: 0.8rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .photosStatusCard.isWarning {
          border-color: #ffd2e5;
          background: #fffafd;
        }

        .photosToolbar {
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
        }

        .photosCounts {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .photosCounts span {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0 11px;
          border-radius: 999px;
          background: #f7f9fc;
          color: #66728a;
          font-size: 0.75rem;
          font-weight: 750;
        }

        .photosCounts strong {
          color: #071b49;
          font-size: 0.88rem;
          font-weight: 900;
        }

        .photosToolbar > button {
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

        .photosReports {
          overflow: hidden;
        }

        .photosReports summary {
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          list-style: none;
        }

        .photosReports summary::-webkit-details-marker {
          display: none;
        }

        .photosReports summary > div {
          display: grid;
          gap: 2px;
        }

        .photosReports summary strong {
          color: #071b49;
          font-size: 0.94rem;
          font-weight: 900;
        }

        .photosReports summary span {
          color: #a91257;
          font-size: 0.76rem;
          font-weight: 750;
        }

        .photosReports summary b {
          color: #f72585;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .reportList {
          display: grid;
          gap: 8px;
          padding: 0 12px 12px;
        }

        .reportRow {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border: 1px solid #ffd2e5;
          border-radius: 14px;
          background: #fffafd;
        }

        .reportThumb,
        .photoThumb {
          overflow: hidden;
          border-radius: 11px;
          background: #f4f7fb;
        }

        .reportThumb {
          width: 92px;
          height: 76px;
        }

        .reportThumb img,
        .photoThumb img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .reportCopy {
          min-width: 0;
        }

        .reportCopy strong {
          display: block;
          color: #071b49;
          font-size: 0.88rem;
          font-weight: 900;
        }

        .reportCopy span {
          display: block;
          margin-top: 3px;
          color: #a91257;
          font-size: 0.74rem;
          font-weight: 800;
        }

        .reportCopy p {
          margin: 5px 0 0;
          color: #66728a;
          font-size: 0.75rem;
          line-height: 1.35;
          font-weight: 600;
        }

        .reportActions {
          display: flex;
          gap: 7px;
        }

        .reportActions button,
        .approveButton,
        .rejectButton {
          min-height: 38px;
          padding: 0 12px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.76rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none !important;
        }

        .dismissReportButton {
          border: 1px solid #dfe5f1;
          background: #ffffff;
          color: #071b49;
        }

        .removeReportedPhotoButton {
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff;
        }

        .photosMainSection {
          padding: 16px;
        }

        .photosSectionHead {
          margin-bottom: 12px;
        }

        .photosSectionHead h2 {
          margin: 0 0 4px;
          color: #071b49;
          font-size: 1.18rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .photosSectionHead p {
          margin: 0;
          color: #718096;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .photoList {
          display: grid;
          gap: 9px;
        }

        .photoRow {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 14px;
          padding: 12px;
          border: 1px solid #e3e8f1;
          border-radius: 15px;
          background: #fbfcfe;
        }

        .photoThumb {
          width: 150px;
          height: 130px;
        }

        .photoCopy {
          min-width: 0;
        }

        .photoTopline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .statusBadge {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 9px;
          border-radius: 999px;
          background: #fff4f9;
          color: #a91257;
          font-size: 0.68rem;
          font-weight: 900;
        }

        .statusBadge.is-approved {
          background: #edf9f4;
          color: #047857;
        }

        .statusBadge.is-rejected {
          background: #fff3f6;
          color: #b51662;
        }

        .photoTopline small {
          color: #8a96a8;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .photoCopy h3 {
          margin: 8px 0 5px;
          color: #071b49;
          font-size: 1rem;
          line-height: 1.15;
          font-weight: 900;
        }

        .photoCopy > p {
          margin: 0;
          color: #66728a;
          font-size: 0.78rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .rejectedReason {
          margin-top: 8px !important;
          padding: 8px 10px;
          border-radius: 10px;
          background: #fff3f6;
          color: #b51662 !important;
          font-weight: 750 !important;
        }

        .moderationBox {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 10px;
        }

        .approveButton {
          border: 1px solid #f72585;
          background: #f72585;
          color: #ffffff;
        }

        .rejectDetails {
          position: relative;
        }

        .rejectDetails > summary {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid #efb7c9;
          border-radius: 999px;
          background: #ffffff;
          color: #a91257;
          font-size: 0.76rem;
          font-weight: 900;
          cursor: pointer;
          list-style: none;
        }

        .rejectDetails > summary::-webkit-details-marker {
          display: none;
        }

        .rejectDetails[open] {
          width: min(360px, 100%);
          display: grid;
          gap: 7px;
        }

        .rejectDetails label {
          margin-top: 6px;
          color: #071b49;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .rejectDetails textarea {
          width: 100%;
          min-height: 72px;
          resize: vertical;
          padding: 10px;
          border: 1px solid #dfe5f1;
          border-radius: 11px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.78rem;
          line-height: 1.4;
          outline: none;
        }

        .rejectButton {
          width: fit-content;
          border: 1px solid #efb7c9;
          background: #ffffff;
          color: #a91257;
        }

        .photoFallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          padding: 10px;
          color: #7b8798;
          font-size: 0.72rem;
          font-weight: 800;
          text-align: center;
        }

        .photosEmpty {
          display: grid;
          gap: 3px;
          padding: 14px;
          border-radius: 13px;
          background: #f8fafc;
        }

        .photosEmpty strong {
          color: #071b49;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .photosEmpty span {
          color: #718096;
          font-size: 0.78rem;
          font-weight: 600;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }



        @media (max-width: 700px) {
          :global(body:has(.fromone-smiles-photos-page) .main-content),
          :global(body:has(.fromone-smiles-photos-page) .main-content.fromone-mobile-bottom-safe) {
            padding: 18px 10px 100px !important;
          }

          .photosShell {
            max-width: 100%;
            gap: 12px;
          }

          .photosSimpleHero {
            display: grid;
            gap: 12px;
          }

          .photosSimpleHero h1 {
            font-size: 2.2rem;
          }

          .photosToolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .photosCounts {
            width: 100%;
          }

          .photosCounts span {
            flex: 1 1 0;
            justify-content: center;
          }

          .photosToolbar > button {
            width: 100%;
          }

          .reportRow {
            grid-template-columns: 72px minmax(0, 1fr);
          }

          .reportThumb {
            width: 72px;
            height: 72px;
          }

          .reportActions {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .reportActions button {
            width: 100%;
          }

          .photoRow {
            grid-template-columns: 100px minmax(0, 1fr);
            gap: 10px;
          }

          .photoThumb {
            width: 100px;
            height: 100px;
          }

          .photoTopline {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .moderationBox {
            flex-wrap: wrap;
          }

          .approveButton {
            flex: 1 1 0;
          }

          .rejectDetails {
            flex: 1 1 0;
          }

          .rejectDetails > summary {
            width: 100%;
            justify-content: center;
          }

          .rejectDetails[open] {
            flex-basis: 100%;
            width: 100%;
          }

          .rejectButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}