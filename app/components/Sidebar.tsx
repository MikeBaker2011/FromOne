'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';

const NEW_POSTS_KEY = 'fromone_has_new_posts';

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPostsDot, setShowPostsDot] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  function checkNewPosts() {
    if (typeof window === 'undefined') return;

    const hasNewPosts = localStorage.getItem(NEW_POSTS_KEY) === 'true';
    setShowPostsDot(hasNewPosts);
  }


  useEffect(() => {
    checkUser();
    checkNewPosts();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
      setCheckingAuth(false);
    });

    const handleStorageChange = () => {
      checkNewPosts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('fromone-new-posts-updated', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('fromone-new-posts-updated', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const closeMenu = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handlePostsClick = useCallback(() => {
    localStorage.removeItem(NEW_POSTS_KEY);
    window.dispatchEvent(new Event('fromone-new-posts-updated'));
    closeMenu();
  }, [closeMenu]);

  const checkAdminAccess = async (userId?: string | null) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Admin access check failed:', error.message);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } catch (error) {
      console.warn('Admin access check crashed:', error);
      setIsAdmin(false);
    }
  };

  const checkUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.warn('Auth check failed:', error.message);
        await supabase.auth.signOut();
        setIsSignedIn(false);
        setIsAdmin(false);
        return;
      }

      setIsSignedIn(Boolean(data.user));
      await checkAdminAccess(data.user?.id);
    } catch (error) {
      console.warn('Auth check crashed:', error);
      await supabase.auth.signOut();
      setIsSignedIn(false);
      setIsAdmin(false);
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
    setIsAdmin(false);
    closeMenu();
    router.push('/signin');
  };

  return (
    <aside
      className={isOpen ? 'sidebar sidebar-open' : 'sidebar'}
      data-mobile-menu-open={isOpen ? 'true' : 'false'}
    >
      <style jsx global>{`
        /* Sidebar hamburger performance pass */
        .sidebar {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(0, 0, 0);
          will-change: transform;
          contain: layout paint;
        }

        .sidebar * {
          -webkit-tap-highlight-color: transparent;
        }

        .sidebar-link,
        .mobile-menu-close {
          touch-action: manipulation;
        }

        @media (max-width: 900px) {
          .sidebar {
            transform: translate3d(-104%, 0, 0) !important;
            transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1) !important;
            will-change: transform;
            pointer-events: none;
            visibility: hidden;
          }

          .sidebar.sidebar-open {
            transform: translate3d(0, 0, 0) !important;
            pointer-events: auto;
            visibility: visible;
          }

          .sidebar::before,
          .sidebar::after {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sidebar {
            transition: none !important;
          }
        }
      `}</style>
      <div className="sidebar-mobile-top">
        <div className="sidebar-brand">
          <img
            src="/fromone-logo.png"
            alt="FromOne logo"
            className="sidebar-logo-img"
          />

          <div>
            <h1 className="sidebar-title">FromOne</h1>
            <p className="sidebar-subtitle">Upload. Review. Publish.</p>
          </div>
        </div>

        <button type="button" className="mobile-menu-close" onClick={onClose} aria-label="Close menu">
          ×
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="sidebar-nav-main">
          <Link className="sidebar-link" href="/dashboard" onClick={closeMenu}>
            <span className="sidebar-link-icon">⌂</span>
            Dashboard
          </Link>

          <Link
            className="sidebar-link sidebar-posts-link"
            href="/posts"
            onClick={handlePostsClick}
          >
            <span className="sidebar-link-icon">✦</span>
            <span className="sidebar-posts-text">
              Posts
              {showPostsDot && <b className="product-updates-live-dot" aria-label="New posts" />}
            </span>
          </Link>

          <Link className="sidebar-link" href="/reports" onClick={closeMenu}>
            <span className="sidebar-link-icon">◌</span>
            Reports
          </Link>

          <Link className="sidebar-link" href="/academy" onClick={closeMenu}>
            <span className="sidebar-link-icon">★</span>
            FromOne Academy
          </Link>

          <Link className="sidebar-link" href="/settings" onClick={closeMenu}>
            <span className="sidebar-link-icon">⚙</span>
            Settings
          </Link>

          <Link className="sidebar-link" href="/subscription" onClick={closeMenu}>
            <span className="sidebar-link-icon">£</span>
            Subscription
          </Link>

          {isAdmin && (
            <Link className="sidebar-link sidebar-admin-link" href="/admin" onClick={closeMenu}>
              <span className="sidebar-link-icon">◎</span>
              Admin
            </Link>
          )}
        </div>

        <div className="sidebar-nav-bottom">
          <Link className="sidebar-link" href="/bugreport" onClick={closeMenu}>
            <span className="sidebar-link-icon">✉</span>
            Support
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
              Sign out
            </button>
          ) : (
            <Link className="sidebar-link" href="/signin" onClick={closeMenu}>
              <span className="sidebar-link-icon">→</span>
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
}

export default memo(Sidebar);
