'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setIsSignedIn(false);
        return;
      }

      setIsSignedIn(Boolean(data.user));
    } catch {
      setIsSignedIn(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const closeMenu = () => setOpen(false);

  return (
    <nav className="sales-nav public-nav">
      <div className="public-nav-inner">
        <Link href="/" className="sales-brand public-nav-brand" onClick={closeMenu}>
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="fromone-brand-logo"
          />
          <strong>FromOne</strong>
        </Link>

        <button
          type="button"
          className="public-nav-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
        >
          {open ? '×' : '☰'}
        </button>

        <div
          className={
            open
              ? 'sales-nav-links public-nav-links open'
              : 'sales-nav-links public-nav-links'
          }
        >
          <Link href="/" onClick={closeMenu}>
            Home
          </Link>

          <Link href="/tutorial" onClick={closeMenu}>
            How it works
          </Link>

          <Link
            href={isSignedIn ? '/dashboard' : '/signin'}
            className="sales-nav-button"
            onClick={closeMenu}
          >
            {checkingAuth ? 'Checking...' : isSignedIn ? 'Dashboard' : 'Start free demo'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
