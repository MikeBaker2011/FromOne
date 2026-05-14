'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      <Link href="/" className="sales-brand" onClick={closeMenu}>
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
        aria-label="Toggle navigation menu"
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

        <Link href="/product-updates" onClick={closeMenu}>
          Updates
        </Link>

        <Link
          href={isSignedIn ? '/dashboard' : '/signin'}
          className="sales-nav-button"
          onClick={closeMenu}
        >
          {checkingAuth ? 'Checking...' : isSignedIn ? 'Dashboard' : 'Start free demo'}
        </Link>
      </div>
    </nav>
  );
}