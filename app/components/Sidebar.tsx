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


        /* Keep all sidebar actions in one visible list */
        .sidebar {
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        .sidebar,
        .sidebar * {
          box-sizing: border-box !important;
          max-width: 100% !important;
        }

        .sidebar-nav {
          display: block !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        .sidebar-nav-main {
          display: grid !important;
          align-content: start !important;
          overflow: visible !important;
        }

        .sidebar-link,
        .sidebar-link-button {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }

        .sidebar-link-button {
          text-align: left !important;
        }

        .sidebar-support-link {
          margin-top: 10px !important;
        }

        .sidebar,
        .sidebar-nav,
        .sidebar-nav-main {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .sidebar::-webkit-scrollbar,
        .sidebar-nav::-webkit-scrollbar,
        .sidebar-nav-main::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }

        @media (max-width: 900px) {
          .sidebar {
            width: min(82vw, 310px) !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            padding: 14px 14px max(14px, env(safe-area-inset-bottom)) !important;
            overflow: hidden !important;
          }

          .sidebar-mobile-top {
            margin-bottom: 12px !important;
          }

          .sidebar-subtitle {
            font-size: 0.72rem !important;
          }

          .sidebar-nav-main {
            gap: 7px !important;
          }

          .sidebar-link,
          .sidebar-link-button {
            min-height: 40px !important;
            padding: 5px 9px !important;
            gap: 10px !important;
            border-radius: 16px !important;
            font-size: 0.9rem !important;
            line-height: 1 !important;
          }

          .sidebar-link-icon {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            border-radius: 12px !important;
            font-size: 0.74rem !important;
          }

          .sidebar-support-link {
            margin-top: 6px !important;
          }

          .mobile-menu-close {
            width: 38px !important;
            height: 38px !important;
            min-width: 38px !important;
          }
        }

        @media (max-width: 900px) and (max-height: 700px) {
          .sidebar {
            padding-top: 10px !important;
            padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
          }

          .sidebar-mobile-top {
            margin-bottom: 8px !important;
          }

          .sidebar-subtitle {
            display: none !important;
          }

          .sidebar-nav-main {
            gap: 4px !important;
          }

          .sidebar-link,
          .sidebar-link-button {
            min-height: 36px !important;
            padding: 4px 8px !important;
            font-size: 0.84rem !important;
          }

          .sidebar-link-icon {
            width: 29px !important;
            height: 29px !important;
            min-width: 29px !important;
            border-radius: 11px !important;
            font-size: 0.7rem !important;
          }

          .sidebar-support-link {
            margin-top: 4px !important;
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

        <button type="button" className="mobile-menu-close" onClick={closeMenu} aria-label="Close menu">
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

          <Link className="sidebar-link sidebar-support-link" href="/bugreport" onClick={closeMenu}>
            <span className="sidebar-link-icon">✉</span>
            Support
          </Link>

          {checkingAuth ? (
            <div className="sidebar-link sidebar-auth-link">
              <span className="sidebar-link-icon">…</span>
              Checking
            </div>
          ) : isSignedIn ? (
            <button
              type="button"
              className="sidebar-link sidebar-link-button sidebar-signout-link"
              onClick={handleSignOut}
            >
              <span className="sidebar-link-icon">×</span>
              Sign out
            </button>
          ) : (
            <Link className="sidebar-link sidebar-auth-link" href="/signin" onClick={closeMenu}>
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
