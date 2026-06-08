'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  HelpCircle,
  LogIn,
  LogOut,
  PenLine,
  Plus,
  Settings,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

const NEW_POSTS_KEY = 'fromone_has_new_posts';

const iconProps = {
  size: 20,
  strokeWidth: 2.8,
  absoluteStrokeWidth: true,
};

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
      checkAdminAccess(session?.user?.id);
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem(NEW_POSTS_KEY);
      window.dispatchEvent(new Event('fromone-new-posts-updated'));
    }

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
    <>
      <aside
        className={isOpen ? 'sidebar sidebar-open' : 'sidebar'}
        data-mobile-menu-open={isOpen ? 'true' : 'false'}
      >
        <style jsx global>{`
          /* Remove curved active border around sidebar item */
          .sidebar-link,
          .sidebar-link-button {
            border-color: transparent !important;
            outline: none !important;
            box-shadow: none !important;
            background-clip: padding-box !important;
          }

          .sidebar-link:hover,
          .sidebar-link:active,
          .sidebar-link:focus,
          .sidebar-link:focus-visible,
          .sidebar-link-button:hover,
          .sidebar-link-button:active,
          .sidebar-link-button:focus,
          .sidebar-link-button:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }

          .sidebar-link[aria-current='page'],
          .sidebar-link.active,
          .sidebar-link.is-active,
          .sidebar-link.sidebar-active {
            border-color: transparent !important;
            outline: none !important;
            box-shadow: none !important;
          }

          .sidebar-link[aria-current='page']::before,
          .sidebar-link[aria-current='page']::after,
          .sidebar-link.active::before,
          .sidebar-link.active::after,
          .sidebar-link.is-active::before,
          .sidebar-link.is-active::after,
          .sidebar-link.sidebar-active::before,
          .sidebar-link.sidebar-active::after {
            display: none !important;
            content: none !important;
          }

          .sidebar-link:focus-visible .sidebar-link-icon,
          .sidebar-link-button:focus-visible .sidebar-link-icon,
          .mobile-menu-close:focus-visible,
          .mobile-bottom-nav-link:focus-visible,
          .mobile-bottom-nav-create:focus-visible {
            box-shadow: 0 0 0 2px rgba(255, 212, 59, 0.36) !important;
          }

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
          .mobile-menu-close,
          .mobile-bottom-nav-link,
          .mobile-bottom-nav-create {
            touch-action: manipulation;
          }

          @media (max-width: 900px) {
            .sidebar {
              transform: translate3d(-104%, 0, 0) !important;
              transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1) !important;
              will-change: transform;
              pointer-events: none;
              visibility: hidden;
              z-index: 90;
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

          .sidebar-nav-main,
          .sidebar-nav-account {
            display: grid !important;
            align-content: start !important;
            overflow: visible !important;
          }

          .sidebar-nav-account {
            margin-top: 18px !important;
            padding-top: 14px !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            gap: 7px !important;
          }

          .sidebar-section-label {
            margin: 0 0 3px 10px !important;
            color: rgba(255, 255, 255, 0.55) !important;
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.08em !important;
            text-transform: uppercase !important;
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

          .sidebar-link-icon svg,
          .mobile-bottom-nav-icon svg,
          .mobile-bottom-nav-create svg {
            display: block;
          }

          .sidebar-link-icon {
            color: #ffd43b !important;
          }

          .mobile-bottom-nav-icon {
            color: #ffffff !important;
          }

          .sidebar,
          .sidebar-nav,
          .sidebar-nav-main,
          .sidebar-nav-account {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          .sidebar::-webkit-scrollbar,
          .sidebar-nav::-webkit-scrollbar,
          .sidebar-nav-main::-webkit-scrollbar,
          .sidebar-nav-account::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
            display: none !important;
          }

          .mobile-bottom-nav {
            display: none;
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

            .sidebar-nav-account {
              margin-top: 14px !important;
              padding-top: 12px !important;
              gap: 6px !important;
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

            .mobile-menu-close {
              width: 38px !important;
              height: 38px !important;
              min-width: 38px !important;
            }

            .mobile-bottom-nav {
              position: fixed;
              left: 12px;
              right: 12px;
              bottom: max(10px, env(safe-area-inset-bottom));
              z-index: 80;
              display: grid;
              grid-template-columns: 1fr 1fr 58px 1fr 1fr;
              align-items: center;
              gap: 6px;
              min-height: 68px;
              padding: 8px 10px;
              border: 1px solid rgba(255, 212, 59, 0.18);
              border-radius: 26px;
              background:
                linear-gradient(180deg, rgba(9, 22, 46, 0.96), rgba(4, 13, 31, 0.98));
              box-shadow:
                0 18px 46px rgba(0, 0, 0, 0.38),
                inset 0 1px 0 rgba(255, 255, 255, 0.08);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
            }

            .mobile-bottom-nav-link {
              position: relative;
              display: grid;
              place-items: center;
              gap: 3px;
              min-width: 0;
              min-height: 50px;
              border-radius: 18px;
              color: rgba(255, 255, 255, 0.78);
              text-decoration: none;
              font-size: 0.66rem;
              font-weight: 700;
              line-height: 1;
            }

            .mobile-bottom-nav-link:hover,
            .mobile-bottom-nav-link:active {
              color: #ffffff;
              background: rgba(255, 255, 255, 0.06);
            }

            .mobile-bottom-nav-icon {
              display: grid;
              place-items: center;
              width: 24px;
              height: 24px;
              color: #ffffff;
              line-height: 1;
            }

            .mobile-bottom-nav-create {
              display: grid;
              place-items: center;
              width: 48px;
              height: 48px;
              margin: 0 auto;
              border-radius: 999px;
              background: linear-gradient(180deg, #ffd43b, #ffb703);
              color: #061225;
              text-decoration: none;
              box-shadow:
                0 12px 28px rgba(255, 183, 3, 0.32),
                inset 0 1px 0 rgba(255, 255, 255, 0.42);
            }

            .mobile-bottom-nav-create:hover,
            .mobile-bottom-nav-create:active {
              transform: translateY(-1px);
            }

            .mobile-bottom-nav-posts-dot {
              position: absolute;
              top: 8px;
              right: 18px;
              width: 8px;
              height: 8px;
              border-radius: 999px;
              background: #ffd43b;
              box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.18);
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

            .sidebar-nav-account {
              margin-top: 10px !important;
              padding-top: 10px !important;
              gap: 4px !important;
            }

            .sidebar-section-label {
              display: none !important;
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

            .mobile-bottom-nav {
              min-height: 62px;
              grid-template-columns: 1fr 1fr 52px 1fr 1fr;
              border-radius: 23px;
            }

            .mobile-bottom-nav-link {
              min-height: 46px;
              font-size: 0.62rem;
            }

            .mobile-bottom-nav-create {
              width: 44px;
              height: 44px;
            }
          }

          @media (min-width: 901px) {
            .mobile-bottom-nav {
              display: none !important;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .sidebar,
            .mobile-bottom-nav-create {
              transition: none !important;
            }

            .mobile-bottom-nav-create:hover,
            .mobile-bottom-nav-create:active {
              transform: none !important;
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
              <p className="sidebar-subtitle">Upload it. Post it. Done.</p>
            </div>
          </div>

          <button
            type="button"
            className="mobile-menu-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="sidebar-nav-main">
            <Link className="sidebar-link" href="/dashboard" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <UploadCloud {...iconProps} />
              </span>
              Create
            </Link>

            <Link
              className="sidebar-link sidebar-posts-link"
              href="/posts"
              onClick={handlePostsClick}
            >
              <span className="sidebar-link-icon">
                <PenLine {...iconProps} />
              </span>
              <span className="sidebar-posts-text">
                Posts
                {showPostsDot && (
                  <b
                    className="product-updates-live-dot"
                    aria-label="New posts"
                  />
                )}
              </span>
            </Link>

            <Link className="sidebar-link" href="/reports" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <BarChart3 {...iconProps} />
              </span>
              Reports
            </Link>

            <Link className="sidebar-link" href="/calendar" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <CalendarDays {...iconProps} />
              </span>
              Calendar
            </Link>

            <Link className="sidebar-link" href="/settings" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <Settings {...iconProps} />
              </span>
              Settings
            </Link>
          </div>

          <div className="sidebar-nav-account" aria-label="Account navigation">
            <p className="sidebar-section-label">Account</p>

            <Link className="sidebar-link" href="/subscription" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <CreditCard {...iconProps} />
              </span>
              Plan
            </Link>

            <Link className="sidebar-link" href="/bugreport" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <HelpCircle {...iconProps} />
              </span>
              Help
            </Link>

            {isAdmin && (
              <Link
                className="sidebar-link sidebar-admin-link"
                href="/admin"
                onClick={closeMenu}
              >
                <span className="sidebar-link-icon">
                  <ShieldCheck {...iconProps} />
                </span>
                Admin
              </Link>
            )}

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
                <span className="sidebar-link-icon">
                  <LogOut {...iconProps} />
                </span>
                Sign out
              </button>
            ) : (
              <Link
                className="sidebar-link sidebar-auth-link"
                href="/signin"
                onClick={closeMenu}
              >
                <span className="sidebar-link-icon">
                  <LogIn {...iconProps} />
                </span>
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link
          className="mobile-bottom-nav-link"
          href="/posts"
          onClick={handlePostsClick}
        >
          {showPostsDot && (
            <b
              className="mobile-bottom-nav-posts-dot"
              aria-label="New posts"
            />
          )}
          <span className="mobile-bottom-nav-icon">
            <PenLine {...iconProps} />
          </span>
          <span>Posts</span>
        </Link>

        <Link
          className="mobile-bottom-nav-link"
          href="/bugreport"
          onClick={closeMenu}
        >
          <span className="mobile-bottom-nav-icon">
            <HelpCircle {...iconProps} />
          </span>
          <span>Help</span>
        </Link>

        <Link
          className="mobile-bottom-nav-create"
          href="/dashboard"
          onClick={closeMenu}
          aria-label="Create posts"
        >
          <Plus size={30} strokeWidth={3.2} absoluteStrokeWidth />
        </Link>

        <Link
          className="mobile-bottom-nav-link"
          href="/calendar"
          onClick={closeMenu}
        >
          <span className="mobile-bottom-nav-icon">
            <CalendarDays {...iconProps} />
          </span>
          <span>Calendar</span>
        </Link>

        <Link
          className="mobile-bottom-nav-link"
          href="/settings"
          onClick={closeMenu}
        >
          <span className="mobile-bottom-nav-icon">
            <Settings {...iconProps} />
          </span>
          <span>Settings</span>
        </Link>
      </nav>
    </>
  );
}

export default memo(Sidebar);
