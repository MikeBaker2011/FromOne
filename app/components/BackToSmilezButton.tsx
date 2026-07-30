"use client";

import Link from "next/link";

export default function BackToSmilezButton() {
  return (
    <div style={{ width: "100%", display: "flex", marginBottom: 24 }}>
      <Link
        href="/smiles"
        style={{
          width: "fit-content",
          minHeight: 44,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          padding: "0 18px",
          border: "1px solid rgba(247, 37, 133, 0.28)",
          borderRadius: 999,
          background: "transparent",
          color: "#071b49",
          boxShadow: "none",
          boxSizing: "border-box",
          fontSize: "0.86rem",
          fontWeight: 900,
          lineHeight: 1,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        <span aria-hidden="true">←</span>
        <span>Back to Smilez</span>
      </Link>
    </div>
  );
}