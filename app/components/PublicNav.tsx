'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PublicNav() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <nav className="sales-nav public-nav">
      <Link href="/" className="sales-brand" onClick={closeMenu}>
        <span>F</span>
        <strong>FromOne</strong>
      </Link>

      <button
        type="button"
        className="public-nav-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation menu"
      >
        {open ? '×' : '☰'}
      </button>

      <div className={open ? 'sales-nav-links public-nav-links open' : 'sales-nav-links public-nav-links'}>
        <Link href="/" onClick={closeMenu}>
          Home
        </Link>

        <Link href="/tutorial" onClick={closeMenu}>
          How it works
        </Link>

        <Link href="/product-updates" onClick={closeMenu}>
          Updates
        </Link>

        <Link href="/signin" className="sales-nav-button" onClick={closeMenu}>
          Sign in
        </Link>
      </div>
    </nav>
  );
}