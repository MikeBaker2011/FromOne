"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
        <div className="heroTop">
          <Link
            href="/smiles"
            className="backLink"
            style={{
              minHeight: 42,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "fit-content",
              padding: "0 16px",
              border: "1px solid rgba(7, 27, 73, 0.14)",
              borderRadius: 999,
              background: "#ffffff",
              color: "var(--posts-navy)",
              fontSize: "0.84rem",
              fontWeight: 900,
              lineHeight: 1,
              textDecoration: "none",
              boxShadow: "none",
            }}
          >
            Back to Smiles
          </Link>
        </div>

        <div className="posts-create-hero heroGrid">
          <div>
            <span className="posts-create-eyebrow eyebrow">Customer photos</span>
            <h1>Review customer photos.</h1>
            <p className="intro">
              Approve or reject photos customers have linked to your venue.
            </p>
          </div>

        </div>

        {loading ? (
          <section className="simplePanel">
            <h2>Loading customer photos...</h2>
          </section>
        ) : null}

        {!loading && !profile?.smiles_listing_venue_id ? (
          <section className="simplePanel">
            <span className="panelEyebrow">Not live yet</span>
            <h2>Your Smiles listing is not live yet</h2>
            <p>Customer photos will appear here once your listing is live.</p>
          </section>
        ) : null}

        {!loading && profile?.smiles_listing_venue_id ? (
          <>
            <section className="photoSummary" aria-label="Photo summary">
              <article>
                <span>Waiting</span>
                <strong>{pendingPhotos.length}</strong>
              </article>
              <article>
                <span>Approved</span>
                <strong>{approvedPhotos.length}</strong>
              </article>
              <article>
                <span>Rejected</span>
                <strong>{rejectedPhotos.length}</strong>
              </article>
              <article className={pendingReports.length > 0 ? "hasReports" : ""}>
                <span>Reports</span>
                <strong>{pendingReports.length}</strong>
              </article>
            </section>

            {pendingReports.length > 0 ? (
              <section className="simplePanel reportsPanel">
                <div className="sectionTop">
                  <div>
                    <span>Customer reports</span>
                    <h2>Reported photos needing review</h2>
                  </div>
                </div>

                <div className="reportGrid">
                  {pendingReports.map((report) => {
                    const photo = photos.find((item) => item.id === report.photo_id);
                    const title =
                      String(photo?.title || "").trim() || "Reported customer photo";

                    return (
                      <article className="reportCard" key={report.id}>
                        <div className="reportImage">
                          {photo?.image_url ? (
                            <img
                              src={photo.image_url}
                              alt={String(photo.image_alt || "").trim() || title}
                            />
                          ) : (
                            <div className="photoFallback">Photo preview unavailable</div>
                          )}
                        </div>

                        <div className="reportBody">
                          <span className="reportFlag">Report received</span>
                          <h3>{title}</h3>
                          <strong>{getReportReasonLabel(report.reason)}</strong>
                          {report.details ? <p>{report.details}</p> : null}
                          <small>{formatSubmittedAt(report.created_at)}</small>

                          <div className="reportActions">
                            <button
                              type="button"
                              className="dismissReportButton"
                              disabled={busyId === report.id}
                              onClick={() =>
                                reviewReport(report.id, "dismiss_customer_photo_report")
                              }
                            >
                              {busyId === report.id ? "Saving..." : "Dismiss report"}
                            </button>
                            <button
                              type="button"
                              className="removeReportedPhotoButton"
                              disabled={busyId === report.id}
                              onClick={() =>
                                reviewReport(report.id, "remove_reported_customer_photo")
                              }
                            >
                              {busyId === report.id
                                ? "Saving..."
                                : "Remove photo from public view"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="simplePanel priority">
              <div className="sectionTop">
                <div>
                  <span>{showAll ? "All customer photos" : "Do this first"}</span>
                  <h2>
                    {showAll ? "All customer photos" : "Photos needing a decision"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAll((current) => !current)}
                >
                  {showAll ? "Show waiting only" : "View all photos"}
                </button>
              </div>

              {photosToShow.length === 0 ? (
                <div className="emptyState">
                  <h3>
                    {showAll
                      ? "No customer photos yet"
                      : "No photos need a decision"}
                  </h3>
                  <p>
                    {showAll
                      ? "Photos linked to your venue will appear here."
                      : "New pending customer photos will appear here."}
                  </p>
                </div>
              ) : (
                <div className="photoGrid">
                  {photosToShow.map((photo) => {
                    const title =
                      String(photo.title || "").trim() || "Customer photo";
                    const caption =
                      String(photo.caption || "").trim() ||
                      "No caption was supplied.";

                    return (
                      <article className="photoCard" key={photo.id}>
                        <div className="photoImage">
                          {photo.image_url ? (
                            <img
                              src={photo.image_url}
                              alt={
                                String(photo.image_alt || "").trim() ||
                                title
                              }
                            />
                          ) : (
                            <div className="photoFallback">
                              Photo preview unavailable
                            </div>
                          )}

                          <span className={`statusBadge is-${photo.status || "pending"}`}>
                            {getStatusLabel(photo.status)}
                          </span>
                        </div>

                        <div className="photoBody">
                          <div>
                            <span className="photoVenue">
                              {photo.linked_item_title ||
                                profile.business_name ||
                                "Your venue"}
                            </span>
                            <h3>{title}</h3>
                            <p>{caption}</p>
                          </div>

                          <div className="photoMeta">
                            <span>{formatSubmittedAt(photo.created_at)}</span>
                          </div>

                          {photo.status === "rejected" &&
                          photo.rejection_reason ? (
                            <p className="rejectedReason">
                              {photo.rejection_reason}
                            </p>
                          ) : null}

                          {photo.status === "pending" ? (
                            <div className="moderationBox">
                              <button
                                type="button"
                                className="approveButton"
                                disabled={busyId === photo.id}
                                onClick={() =>
                                  moderatePhoto(photo.id, "approved")
                                }
                              >
                                {busyId === photo.id
                                  ? "Saving..."
                                  : "Approve photo"}
                              </button>

                              <label htmlFor={`reject-${photo.id}`}>
                                Reason if rejecting
                              </label>
                              <textarea
                                id={`reject-${photo.id}`}
                                value={rejectionReasons[photo.id] || ""}
                                onChange={(event) =>
                                  setRejectionReasons((current) => ({
                                    ...current,
                                    [photo.id]: event.target.value,
                                  }))
                                }
                                placeholder="Example: The photo is too dark or does not clearly show this venue."
                                maxLength={280}
                              />

                              <button
                                type="button"
                                className="rejectButton"
                                disabled={busyId === photo.id}
                                onClick={() =>
                                  moderatePhoto(photo.id, "rejected")
                                }
                              >
                                {busyId === photo.id
                                  ? "Saving..."
                                  : "Reject photo"}
                              </button>
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
        :global(body:has(.fromone-smiles-photos-page)) {
          background: var(--posts-bg) !important;
          overflow-x: hidden !important;
        }

        :global(body:has(.fromone-smiles-photos-page) .app-shell),
        :global(body:has(.fromone-smiles-photos-page) .main-content) {
          background: var(--posts-bg) !important;
        }

        :global(body:has(.fromone-smiles-photos-page) .main-content) {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          overflow-x: hidden !important;
        }

        .smilesPhotosPage,
        .smilesPhotosPage * {
          box-sizing: border-box;
        }

        .smilesPhotosPage {
          width: 100%;
          min-width: 0;
          color: var(--posts-navy);
        }

        .photosShell {
          width: 100%;
          display: grid;
          gap: 22px;
        }

        .heroTop {
          margin-bottom: 2px;
        }

        .backLink {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border: 1px solid rgba(7, 27, 73, 0.12);
          border-radius: 999px;
          background: #ffffff;
          color: var(--posts-navy);
          font-size: 0.84rem;
          font-weight: 900;
          text-decoration: none;
          box-shadow: none;
        }

        .backLink:hover {
          border-color: rgba(247, 37, 133, 0.28);
          background: #fff7fb;
          color: var(--posts-pink);
        }

        .heroGrid {
          display: block;
        }

        .heroGrid > div:first-child {
          min-width: 0;
          max-width: 900px;
        }

        .eyebrow,
        .panelEyebrow,
        .sectionTop span,
        .photoSummary span,
        .photoVenue {
          color: var(--posts-pink);
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        h1 {
          max-width: 900px;
          margin: 0 0 14px;
          color: var(--posts-navy);
          font-size: clamp(2.7rem, 4.2vw, 4rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
          text-wrap: balance;
        }

        .intro,
        .simplePanel p,
        .photoCard p,
        .emptyState p {
          margin: 0;
          color: var(--posts-muted);
          font-weight: 600;
          line-height: 1.55;
        }

        .photoSummary article,
        .simplePanel {
          border: 1px solid var(--posts-border);
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--posts-shadow);
        }

        .photoSummary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .photoSummary article {
          padding: 20px;
        }

        .photoSummary strong {
          display: block;
          margin-top: 8px;
          color: var(--posts-navy);
          font-size: 2.1rem;
        }

        .simplePanel {
          display: grid;
          gap: 18px;
          padding: 22px;
        }

        .sectionTop {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
        }

        .sectionTop h2,
        .simplePanel h2 {
          margin: 8px 0 0;
          color: var(--posts-navy);
          font-size: clamp(1.75rem, 3.4vw, 2.25rem);
          line-height: 1;
          letter-spacing: -0.048em;
        }

        .sectionTop button,
        .approveButton,
        .rejectButton,
        .dismissReportButton,
        .removeReportedPhotoButton {
          min-height: 46px;
          padding: 0 17px;
          border-radius: 15px;
          font: inherit;
          font-size: 0.86rem;
          font-weight: 900;
          cursor: pointer;
        }

        .sectionTop button {
          border: 1px solid var(--posts-border);
          background: #fff;
          color: var(--posts-navy);
        }

        .photoSummary article.hasReports {
          border-color: rgba(247, 37, 133, 0.28);
          background: #fff7fb;
        }

        .reportsPanel {
          border-color: rgba(247, 37, 133, 0.24);
        }

        .reportGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .reportCard {
          min-width: 0;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(150px, 0.75fr) minmax(0, 1.25fr);
          border: 1px solid var(--posts-border);
          border-radius: 22px;
          background: #fff;
        }

        .reportImage {
          min-height: 230px;
          background: #f8fafc;
        }

        .reportImage img {
          width: 100%;
          height: 100%;
          min-height: 230px;
          display: block;
          object-fit: cover;
        }

        .reportBody {
          display: grid;
          align-content: start;
          gap: 10px;
          padding: 18px;
        }

        .reportFlag {
          color: var(--posts-pink);
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .reportBody h3 {
          margin: 0;
          color: var(--posts-navy);
          font-size: 1.35rem;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .reportBody strong {
          color: var(--posts-navy);
          font-size: 0.94rem;
        }

        .reportBody small {
          color: var(--posts-muted);
          font-weight: 800;
        }

        .reportActions {
          display: grid;
          gap: 9px;
          margin-top: 4px;
        }

        .dismissReportButton {
          border: 1px solid var(--posts-border);
          background: #fff;
          color: var(--posts-navy);
        }

        .removeReportedPhotoButton {
          border: 0;
          background: var(--posts-pink);
          color: #fff;
        }

        .photoGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .photoCard {
          min-width: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--posts-border);
          border-radius: 22px;
          background: #fff;
        }

        .photoImage {
          position: relative;
          min-height: 190px;
          background: #f8fafc;
        }

        .photoImage img {
          width: 100%;
          height: 210px;
          display: block;
          object-fit: cover;
        }

        .photoFallback {
          min-height: 190px;
          display: grid;
          place-items: center;
          padding: 20px;
          color: var(--posts-muted);
          font-weight: 800;
          text-align: center;
        }

        .statusBadge {
          position: absolute;
          top: 14px;
          left: 14px;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid rgba(7, 27, 73, 0.12);
          border-radius: 999px;
          background: #fff;
          color: var(--posts-navy);
          font-size: 0.76rem;
          font-weight: 900;
        }

        .statusBadge.is-approved {
          border-color: rgba(4, 120, 87, 0.2);
          color: #047857;
        }

        .statusBadge.is-rejected {
          border-color: rgba(181, 22, 98, 0.2);
          color: #b51662;
        }

        .photoBody {
          flex: 1;
          display: grid;
          gap: 11px;
          padding: 16px;
        }

        .photoBody h3 {
          margin: 7px 0 7px;
          color: var(--posts-navy);
          font-size: 1.28rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .photoMeta {
          padding-top: 12px;
          border-top: 1px solid var(--posts-border);
          color: var(--posts-muted);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .rejectedReason {
          padding: 12px 14px;
          border: 1px solid rgba(181, 22, 98, 0.16);
          border-radius: 14px;
          background: #fff5f8;
          color: #b51662 !important;
          font-weight: 800 !important;
        }

        .moderationBox {
          display: grid;
          gap: 10px;
          margin-top: auto;
          padding-top: 4px;
        }

        .moderationBox label {
          color: var(--posts-navy);
          font-size: 0.9rem;
          font-weight: 900;
        }

        .moderationBox textarea {
          width: 100%;
          min-height: 88px;
          resize: vertical;
          padding: 14px;
          border: 1px solid var(--posts-border);
          border-radius: 14px;
          background: #fff;
          color: var(--posts-navy);
          font: inherit;
          line-height: 1.5;
          outline: none;
        }

        .moderationBox textarea:focus {
          border-color: var(--posts-pink);
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.1);
        }

        .approveButton {
          border: 0;
          background: var(--posts-pink);
          color: #fff;
        }

        .rejectButton {
          border: 1px solid var(--posts-border);
          background: #fff;
          color: var(--posts-navy);
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .emptyState {
          padding: 24px;
          border: 1px dashed var(--posts-border);
          border-radius: 20px;
          background: #fff;
          text-align: center;
        }

        .emptyState h3 {
          margin: 0 0 7px;
          color: var(--posts-navy);
          font-size: 1.6rem;
        }

        @media (max-width: 980px) {
          .heroGrid > div:first-child {
            max-width: 900px;
          }

          .photoGrid,
          .reportGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .reportCard {
            grid-template-columns: 1fr;
          }

          .reportImage,
          .reportImage img {
            min-height: 210px;
            height: 210px;
          }
        }

        @media (max-width: 760px) {
          :global(body:has(.fromone-smiles-photos-page) .main-content) {
            padding: 24px 16px 100px !important;
          }

          .photoSummary,
          .sectionTop,
          .photoGrid,
          .reportGrid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: clamp(2.25rem, 11vw, 3rem);
          }

          .listingCard,
          .photoSummary article,
          .simplePanel,
          .photoBody {
            padding: 17px;
            border-radius: 21px;
          }

          .sectionTop button,
          .approveButton,
          .rejectButton,
          .dismissReportButton,
          .removeReportedPhotoButton {
            width: 100%;
          }

          .photoImage img {
            height: 230px;
          }
        }
      `}</style>
    </main>
  );
}