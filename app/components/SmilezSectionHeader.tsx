"use client";

import type { ReactNode } from "react";
import BackToSmilezButton from "@/app/components/BackToSmilezButton";

type SmilezSectionHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  listingName?: string | null;
  listingStatus?: string;
};

export default function SmilezSectionHeader({
  eyebrow,
  title,
  description,
  listingName,
  listingStatus = "Live on Smilez",
}: SmilezSectionHeaderProps) {
  return (
    <header className="smilezSectionHeader">
      <div className="smilezSectionBackRow">
        <BackToSmilezButton />
      </div>

      <div className="smilezSectionHeroGrid">
        <div className="smilezSectionCopy">
          <span className="smilezSectionEyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        {listingName ? (
          <aside className="smilezSectionListingCard">
            <span>Your listing</span>
            <strong>{listingName}</strong>
            <p>{listingStatus}</p>
          </aside>
        ) : null}
      </div>

      <style jsx>{`
        .smilezSectionHeader {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 0 6px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .smilezSectionBackRow {
          display: flex !important;
          margin: 0 0 24px !important;
        }

        .smilezSectionHeroGrid {
          width: 100% !important;
          max-width: 100% !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 260px !important;
          gap: 24px !important;
          align-items: start !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .smilezSectionCopy {
          min-width: 0 !important;
          max-width: 790px !important;
        }

        .smilezSectionEyebrow {
          display: block !important;
          margin: 0 0 10px !important;
          color: #f72585 !important;
          font-size: 0.74rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
        }

        .smilezSectionHeader h1 {
          max-width: 760px !important;
          margin: 0 0 12px !important;
          color: #071b49 !important;
          font-size: clamp(2.6rem, 5vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.06em !important;
          font-weight: 800 !important;
          text-align: left !important;
          overflow: visible !important;
        }

        .smilezSectionHeader .smilezSectionCopy > p {
          max-width: 720px !important;
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.03rem !important;
          line-height: 1.56 !important;
          font-weight: 500 !important;
        }

        .smilezSectionListingCard {
          display: grid !important;
          gap: 7px !important;
          padding: 20px !important;
          border: 1px solid var(--posts-border, #dfe5f1) !important;
          border-radius: 26px !important;
          background: rgba(255, 255, 255, 0.9) !important;
          box-shadow: var(--posts-shadow, 0 16px 34px rgba(7, 27, 73, 0.08)) !important;
          backdrop-filter: blur(10px) !important;
        }

        .smilezSectionListingCard span {
          margin: 0 !important;
          color: #f72585 !important;
          font-size: 0.74rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
        }

        .smilezSectionListingCard strong {
          color: #071b49 !important;
          font-size: 1.6rem !important;
          line-height: 1 !important;
          letter-spacing: -0.04em !important;
          font-weight: 800 !important;
        }

        .smilezSectionListingCard p {
          margin: 0 !important;
          color: #047857 !important;
          font-size: 0.95rem !important;
          line-height: 1.4 !important;
          font-weight: 800 !important;
        }

        @media (max-width: 700px) {
          .smilezSectionHeroGrid {
            grid-template-columns: 1fr !important;
          }

          .smilezSectionHeader h1 {
            font-size: clamp(2.25rem, 11vw, 3rem) !important;
          }

          .smilezSectionHeader .smilezSectionCopy > p {
            font-size: 0.95rem !important;
          }

          .smilezSectionListingCard {
            padding: 17px !important;
            border-radius: 21px !important;
          }
        }
      `}</style>
    </header>
  );
}