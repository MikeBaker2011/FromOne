// app/components/CookieBanner.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const COOKIE_CHOICE_KEY = 'fromone_cookie_choice';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const savedChoice = localStorage.getItem(COOKIE_CHOICE_KEY);

    if (!savedChoice) {
      setShowBanner(true);
    }
  }, []);

  const saveChoice = (choice: 'accepted' | 'essential') => {
    localStorage.setItem(COOKIE_CHOICE_KEY, choice);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <section className="cookie-banner" aria-label="Cookie notice">
      <div className="cookie-banner-copy">
        <strong>Cookies on FromOne</strong>
        <p>
          We use essential cookies to keep FromOne working. We may use optional cookies to
          improve the product, but only if you accept them.
        </p>
        <Link href="/cookies">Read our Cookie Policy</Link>
      </div>

      <div className="cookie-banner-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => saveChoice('essential')}
        >
          Essential only
        </button>

        <button type="button" onClick={() => saveChoice('accepted')}>
          Accept all
        </button>
      </div>
    </section>
  );
}