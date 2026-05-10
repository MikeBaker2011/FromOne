'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCT_UPDATES_SEEN_KEY = 'fromone_product_updates_seen';
const NEW_POSTS_KEY = 'fromone_has_new_posts';

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showProductUpdatesDot, setShowProductUpdatesDot] = useState(false);
  const [showPostsDot, setShowPostsDot] = useState(false);

  useEffect(() => {
    checkUser();
    checkProductUpdatesSeen();
    checkNewPosts();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
      setCheckingAuth(false);
    });

    const handleStorageChange = () => {
      checkProductUpdatesSeen();
      checkNewPosts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('fromone-product-updates-seen', handleStorageChange);
    window.addEventListener('fromone-new-posts-updated', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('fromone-product-updates-seen', handleStorageChange);
      window.removeEventListener('fromone-new-posts-updated', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkProductUpdatesSeen = () => {
    const hasSeenUpdates = localStorage.getItem(PRODUCT_UPDATES_SEEN_KEY) === 'true';
    setShowProductUpdatesDot(!hasSeenUpdates);
  };

  const checkNewPosts = () => {
    const hasNewPosts = localStorage.getItem(NEW_POSTS_KEY) === 'true';
    setShowPostsDot(hasNewPosts);
  };

  const handlePostsClick = () => {
    localStorage.removeItem(NEW_POSTS_KEY);
    window.dispatchEvent(new Event('fromone-new-posts-updated'));

    if (onClose) {
      onClose();
    }
  };

  const handleProductUpdatesClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const checkUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.warn('Auth check failed:', error.message);
        await supabase.auth.signOut();
        setIsSignedIn(false);
        return;
      }

      setIsSignedIn(Boolean(data.user));
    } catch (error) {
      console.warn('Auth check crashed:', error);
      await supabase.auth.signOut();
      setIsSignedIn(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out failed:', error);
    }

    setIsSignedIn(false);

    if (onClose) {
      onClose();
    }

    router.push('/signin');
  };

  return (
    <aside className={isOpen ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="sidebar-mobile-top">
        <div className="sidebar-brand">
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="sidebar-logo-img"
          />

          <div>
            <h1 className="sidebar-title">FromOne</h1>
            <p className="sidebar-subtitle">Step-by-step content workflow</p>
          </div>
        </div>

        <button className="mobile-menu-close" onClick={onClose} aria-label="Close menu">
          ×
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-main">
          <Link className="sidebar-link" href="/dashboard" onClick={onClose}>
            <span className="sidebar-link-icon">1</span>
            Dashboard
          </Link>

          <Link
            className="sidebar-link sidebar-posts-link"
            href="/posts"
            onClick={handlePostsClick}
          >
            <span className="sidebar-link-icon">2</span>
            <span className="sidebar-posts-text">
              Posts
              {showPostsDot && <b className="product-updates-live-dot" aria-label="New posts" />}
            </span>
          </Link>

          <Link className="sidebar-link" href="/tutorial" onClick={onClose}>
            <span className="sidebar-link-icon">?</span>
            Tutorial
          </Link>

          <Link
            className="sidebar-link sidebar-link-coming-soon"
            href="/social-hub"
            onClick={onClose}
          >
            <span className="sidebar-link-icon">H</span>
            <span className="sidebar-link-text">
              Social Hub
              <small>Coming soon</small>
            </span>
          </Link>

          <Link
            className="sidebar-link sidebar-product-updates-link"
            href="/product-updates"
            onClick={handleProductUpdatesClick}
          >
            <span className="sidebar-link-icon">N</span>
            <span className="sidebar-product-updates-text">
              Product Updates
              {showProductUpdatesDot && (
                <b className="product-updates-live-dot" aria-label="New updates" />
              )}
            </span>
          </Link>
        </div>

        <div className="sidebar-nav-bottom">
          <Link className="sidebar-link" href="/settings" onClick={onClose}>
            <span className="sidebar-link-icon">⚙</span>
            Settings
          </Link>

          <Link className="sidebar-link" href="/subscription" onClick={onClose}>
            <span className="sidebar-link-icon">£</span>
            Subscription
          </Link>

          <Link className="sidebar-link" href="/bugreport" onClick={onClose}>
            <span className="sidebar-link-icon">!</span>
            Bug Report
          </Link>

          {checkingAuth ? (
            <div className="sidebar-link">
              <span className="sidebar-link-icon">…</span>
              Checking
            </div>
          ) : isSignedIn ? (
            <button
              type="button"
              className="sidebar-link sidebar-link-button"
              onClick={handleSignOut}
            >
              <span className="sidebar-link-icon">×</span>
              Sign Out
            </button>
          ) : (
            <Link className="sidebar-link" href="/signin" onClick={onClose}>
              <span className="sidebar-link-icon">→</span>
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
}