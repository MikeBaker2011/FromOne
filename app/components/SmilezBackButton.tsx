"use client";

import Link from "next/link";

type SmilezBackButtonProps = {
  href?: string;
  label?: string;
};

export default function SmilezBackButton({
  href = "/smiles",
  label = "Back to Smilez",
}: SmilezBackButtonProps) {
  return (
    <>
      <Link href={href} className="smilez-back-button">
        {label}
      </Link>

      <style jsx global>{`
        .smilez-back-button {
          width: fit-content !important;
          min-height: 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 14px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          font-size: 0.8rem !important;
          font-weight: 900 !important;
          line-height: normal !important;
          text-decoration: none !important;
          box-shadow: none !important;
          white-space: nowrap !important;
          appearance: none !important;
        }

        .smilez-back-button:hover,
        .smilez-back-button:focus,
        .smilez-back-button:active,
        .smilez-back-button:visited {
          border-color: #dfe5f1 !important;
          background: #ffffff !important;
          color: #071b49 !important;
          text-decoration: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}