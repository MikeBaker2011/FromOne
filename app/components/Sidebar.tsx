'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';
import { usePathname, useRouter } from 'next/navigation';
import {
  CreditCard,
  HelpCircle,
  LogIn,
  LogOut,
  PenLine,
  Plus,
  Settings,
  Smile,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPostsDot, setShowPostsDot] = useState(false);

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
    setIsMobileMenuOpen(false);
    onClose?.();
  }, [onClose]);

  const handlePostsClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(NEW_POSTS_KEY);
      window.dispatchEvent(new Event('fromone-new-posts-updated'));
    }

    closeMenu();
  }, [closeMenu]);

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

  const isActivePath = useCallback(
    (href: string) => {
      if (!pathname) return false;
      if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  const navClass = useCallback(
    (href: string) => (isActivePath(href) ? 'sidebar-link is-current' : 'sidebar-link'),
    [isActivePath]
  );

  const mobileNavClass = useCallback(
    (href: string) =>
      isActivePath(href)
        ? 'mobile-bottom-nav-link is-current'
        : 'mobile-bottom-nav-link',
    [isActivePath]
  );

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out failed:', error);
    }

    setIsSignedIn(false);
    closeMenu();
    router.push('/signin');
  };

  return (
    <>
      <aside
        className={isOpen || isMobileMenuOpen ? "sidebar sidebar-open mobile-dropdown-open" : "sidebar"}
        data-mobile-menu-open={isOpen || isMobileMenuOpen ? "true" : "false"}
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
            margin-top: 7px !important;
            padding-top: 0 !important;
            border-top: 0 !important;
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

          .sidebar-link-icon svg {
            color: #ffd43b !important;
            stroke: #ffd43b !important;
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
              margin-top: 7px !important;
              padding-top: 0 !important;
              border-top: 0 !important;
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
              left: max(16px, calc(env(safe-area-inset-left) + 16px));
              right: max(16px, calc(env(safe-area-inset-right) + 16px));
              bottom: max(14px, calc(env(safe-area-inset-bottom) + 12px));
              z-index: 120;
              display: grid;
              grid-template-columns: minmax(48px, 1fr) minmax(48px, 1fr) 58px minmax(48px, 1fr) minmax(48px, 1fr);
              align-items: center;
              gap: 2px;
              min-height: 72px;
              padding: 9px 10px 9px;
              box-sizing: border-box;
              overflow: visible;
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
              grid-template-rows: 26px 15px;
              place-items: center;
              align-content: center;
              gap: 2px;
              min-width: 0;
              min-height: 56px;
              overflow: visible;
              border-radius: 18px;
              color: rgba(255, 255, 255, 0.82);
              text-decoration: none;
              font-size: 0.64rem;
              font-weight: 700;
              line-height: 1;
            }

            .mobile-bottom-nav-link span:last-child {
              display: block;
              width: 100%;
              max-width: 100%;
              min-height: 13px;
              overflow: visible;
              text-align: center;
              text-overflow: clip;
              white-space: nowrap;
              line-height: 13px;
            }

            .mobile-bottom-nav-link:hover,
            .mobile-bottom-nav-link:active {
              color: #ffffff;
              background: rgba(255, 255, 255, 0.06);
            }

            .mobile-bottom-nav-icon {
              display: grid;
              place-items: center;
              width: 26px;
              height: 26px;
              color: #ffffff;
              line-height: 1;
            }

            .mobile-bottom-nav > .mobile-bottom-nav-create {
              display: grid !important;
              place-items: center !important;
              width: 50px !important;
              min-width: 50px !important;
              max-width: 50px !important;
              height: 50px !important;
              min-height: 50px !important;
              max-height: 50px !important;
              aspect-ratio: 1 / 1 !important;
              padding: 0 !important;
              margin: 0 auto !important;
              align-self: center !important;
              justify-self: center !important;
              border-radius: 999px !important;
              background: linear-gradient(180deg, #ffd43b, #ffb703);
              color: #061225;
              text-decoration: none;
              overflow: hidden !important;
              transform: translateY(-3px) !important;
              box-shadow:
                0 10px 24px rgba(255, 183, 3, 0.28),
                inset 0 1px 0 rgba(255, 255, 255, 0.42);
            }

            .mobile-bottom-nav > .mobile-bottom-nav-create:hover,
            .mobile-bottom-nav > .mobile-bottom-nav-create:active {
              transform: translateY(-4px) !important;
            }

            .mobile-bottom-nav > .mobile-bottom-nav-create svg {
              width: 25px !important;
              height: 25px !important;
              min-width: 25px !important;
              min-height: 25px !important;
              max-width: 25px !important;
              max-height: 25px !important;
              display: block !important;
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
              margin-top: 5px !important;
              padding-top: 0 !important;
              border-top: 0 !important;
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
              left: max(14px, calc(env(safe-area-inset-left) + 14px));
              right: max(14px, calc(env(safe-area-inset-right) + 14px));
              bottom: max(12px, calc(env(safe-area-inset-bottom) + 10px));
              min-height: 70px;
              grid-template-columns: minmax(46px, 1fr) minmax(46px, 1fr) 56px minmax(46px, 1fr) minmax(46px, 1fr);
              border-radius: 23px;
            }

            .mobile-bottom-nav-link {
              min-height: 54px;
              font-size: 0.6rem;
            }

            .mobile-bottom-nav > .mobile-bottom-nav-create {
              width: 48px !important;
              min-width: 48px !important;
              max-width: 48px !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
              transform: translateY(-2px) !important;
            }
          }

          @media (min-width: 901px) {
            .mobile-bottom-nav {
              display: none !important;
            }
          }


          @media (max-width: 380px) {
            .mobile-bottom-nav {
              left: 10px !important;
              right: 10px !important;
              grid-template-columns: minmax(42px, 1fr) minmax(42px, 1fr) 54px minmax(42px, 1fr) minmax(42px, 1fr) !important;
              padding-left: 7px !important;
              padding-right: 7px !important;
            }

            .mobile-bottom-nav-link {
              font-size: 0.58rem !important;
            }

            .mobile-bottom-nav > .mobile-bottom-nav-create {
              width: 48px !important;
              min-width: 48px !important;
              max-width: 48px !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
              transform: translateY(-2px) !important;
            }
          }


          /* Final hard override so the centre plus cannot be stretched by global nav CSS */
          @media (max-width: 900px) {
            .mobile-bottom-nav > a.mobile-bottom-nav-create,
            .mobile-bottom-nav > a.mobile-bottom-nav-create:link,
            .mobile-bottom-nav > a.mobile-bottom-nav-create:visited {
              box-sizing: border-box !important;
              display: grid !important;
              place-items: center !important;
              width: 50px !important;
              min-width: 50px !important;
              max-width: 50px !important;
              height: 50px !important;
              min-height: 50px !important;
              max-height: 50px !important;
              padding: 0 !important;
              margin: 0 auto !important;
              border-radius: 999px !important;
              line-height: 1 !important;
              align-self: center !important;
              justify-self: center !important;
              transform: translateY(-3px) !important;
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

          /* -------------------------------------------------------------- */
          /* FROMONE NAV — AGENCY STANDARD                                  */
          /* Matches finished page shells: premium, clean, consistent        */
          /* -------------------------------------------------------------- */
          .sidebar {
            width: 360px !important;
            flex: 0 0 360px !important;
            min-width: 360px !important;
            height: 100dvh !important;
            min-height: 100dvh !important;
            position: sticky !important;
            top: 0 !important;
            padding: 22px 30px 24px !important;
            display: grid !important;
            grid-template-rows: auto 1fr !important;
            gap: 34px !important;
            overflow: hidden !important;
            border-right: 1px solid rgba(223, 229, 241, 0.10) !important;
            background:
              radial-gradient(circle at 28px 24px, rgba(255, 212, 59, 0.14), transparent 26%),
              linear-gradient(180deg, #0d1422 0%, #070c15 100%) !important;
            box-shadow: 22px 0 70px rgba(7, 27, 73, 0.08) !important;
            color: #ffffff !important;
          }

          .sidebar-mobile-top {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 14px !important;
            margin: 0 !important;
            min-width: 0 !important;
          }

          .sidebar-brand {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            min-width: 0 !important;
          }

          .sidebar-logo-img {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            border-radius: 14px !important;
            object-fit: contain !important;
            background: #ffd43b !important;
            box-shadow: 0 12px 28px rgba(255, 212, 59, 0.20) !important;
          }

          .sidebar-title {
            margin: 0 !important;
            color: #ffffff !important;
            font-size: 1.36rem !important;
            line-height: 1 !important;
            font-weight: 800 !important;
            letter-spacing: -0.045em !important;
          }

          .sidebar-subtitle {
            margin: 4px 0 0 !important;
            color: rgba(255, 255, 255, 0.76) !important;
            font-size: 0.83rem !important;
            line-height: 1.1 !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
          }

          .mobile-menu-close {
            display: none !important;
          }

          .sidebar-nav {
            display: grid !important;
            grid-template-rows: auto auto !important;
            align-content: start !important;
            gap: 24px !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          .sidebar-nav-main,
          .sidebar-nav-account {
            display: grid !important;
            gap: 14px !important;
            align-content: start !important;
          }

          .sidebar-nav-account {
            margin-top: 4px !important;
            padding-top: 6px !important;
            border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
          }

          .sidebar-link,
          .sidebar-link-button {
            position: relative !important;
            width: 100% !important;
            min-height: 66px !important;
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 10px 14px !important;
            border: 1px solid transparent !important;
            border-radius: 22px !important;
            background: transparent !important;
            color: rgba(255, 255, 255, 0.84) !important;
            text-decoration: none !important;
            font: inherit !important;
            font-size: 1rem !important;
            line-height: 1 !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
            cursor: pointer !important;
            transition:
              background 170ms ease,
              border-color 170ms ease,
              color 170ms ease,
              transform 170ms ease !important;
          }

          .sidebar-link:hover,
          .sidebar-link-button:hover {
            transform: translateX(2px) !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            background: rgba(255, 255, 255, 0.055) !important;
            color: #ffffff !important;
          }

          .sidebar-link.is-current,
          .sidebar-link[aria-current='page'],
          .sidebar-link.active,
          .sidebar-link.is-active,
          .sidebar-link.sidebar-active {
            border-color: rgba(255, 255, 255, 0.08) !important;
            background: rgba(255, 255, 255, 0.075) !important;
            color: #ffffff !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045) !important;
          }

          .sidebar-link-icon {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            display: grid !important;
            place-items: center !important;
            border-radius: 16px !important;
            background: rgba(255, 255, 255, 0.055) !important;
            color: #ffd43b !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045) !important;
          }

          .sidebar-link.is-current .sidebar-link-icon,
          .sidebar-link:hover .sidebar-link-icon,
          .sidebar-link-button:hover .sidebar-link-icon {
            background: rgba(255, 212, 59, 0.12) !important;
            color: #ffd43b !important;
          }

          .sidebar-link-icon svg {
            width: 21px !important;
            height: 21px !important;
            color: #ffd43b !important;
            stroke: #ffd43b !important;
          }

          .sidebar-posts-text {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-width: 0 !important;
          }

          .product-updates-live-dot {
            width: 8px !important;
            height: 8px !important;
            display: inline-flex !important;
            border-radius: 999px !important;
            background: #f72585 !important;
            box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.14) !important;
          }

          @media (max-width: 900px) {
            .sidebar {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: min(82vw, 310px) !important;
              min-width: 0 !important;
              max-width: 310px !important;
              height: 100dvh !important;
              min-height: 100dvh !important;
              padding: 18px 16px max(18px, env(safe-area-inset-bottom)) !important;
              z-index: 90 !important;
              gap: 20px !important;
              border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
              box-shadow: 18px 0 60px rgba(0, 0, 0, 0.30) !important;
            }

            .mobile-menu-close {
              width: 42px !important;
              height: 42px !important;
              min-width: 42px !important;
              display: inline-grid !important;
              place-items: center !important;
              border: 1px solid rgba(255, 255, 255, 0.10) !important;
              border-radius: 16px !important;
              background: rgba(255, 255, 255, 0.07) !important;
              color: #ffffff !important;
              font-size: 1.4rem !important;
              line-height: 1 !important;
              font-weight: 700 !important;
            }

            .sidebar-logo-img {
              width: 38px !important;
              height: 38px !important;
              min-width: 38px !important;
            }

            .sidebar-title {
              font-size: 1.18rem !important;
            }

            .sidebar-subtitle {
              font-size: 0.72rem !important;
            }

            .sidebar-nav {
              gap: 12px !important;
            }

            .sidebar-nav-main,
            .sidebar-nav-account {
              gap: 8px !important;
            }

            .sidebar-link,
            .sidebar-link-button {
              min-height: 46px !important;
              padding: 6px 10px !important;
              gap: 11px !important;
              border-radius: 18px !important;
              font-size: 0.92rem !important;
            }

            .sidebar-link-icon {
              width: 34px !important;
              height: 34px !important;
              min-width: 34px !important;
              border-radius: 13px !important;
            }

            .sidebar-link-icon svg {
              width: 19px !important;
              height: 19px !important;
            }

            .mobile-bottom-nav {
              position: fixed !important;
              left: max(18px, calc(env(safe-area-inset-left) + 18px)) !important;
              right: max(18px, calc(env(safe-area-inset-right) + 18px)) !important;
              bottom: max(14px, calc(env(safe-area-inset-bottom) + 12px)) !important;
              z-index: 120 !important;
              display: grid !important;
              grid-template-columns: minmax(48px, 1fr) minmax(48px, 1fr) 58px minmax(48px, 1fr) minmax(48px, 1fr) !important;
              align-items: center !important;
              gap: 2px !important;
              min-height: 74px !important;
              padding: 9px 10px !important;
              overflow: visible !important;
              border: 1px solid rgba(223, 229, 241, 0.12) !important;
              border-radius: 28px !important;
              background:
                radial-gradient(circle at 50% -20%, rgba(255, 212, 59, 0.12), transparent 34%),
                linear-gradient(180deg, rgba(13, 20, 34, 0.98), rgba(7, 12, 21, 0.98)) !important;
              box-shadow:
                0 20px 50px rgba(0, 0, 0, 0.36),
                inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
              backdrop-filter: blur(18px) !important;
              -webkit-backdrop-filter: blur(18px) !important;
            }

            .mobile-bottom-nav-link {
              position: relative !important;
              min-width: 0 !important;
              min-height: 58px !important;
              display: grid !important;
              grid-template-rows: 28px 15px !important;
              place-items: center !important;
              align-content: center !important;
              gap: 2px !important;
              border-radius: 20px !important;
              color: rgba(255, 255, 255, 0.82) !important;
              text-decoration: none !important;
              font-size: 0.64rem !important;
              line-height: 1 !important;
              font-weight: 800 !important;
              letter-spacing: -0.02em !important;
            }

            .mobile-bottom-nav-link.is-current {
              background: rgba(255, 255, 255, 0.07) !important;
              color: #ffffff !important;
            }

            .mobile-bottom-nav-link span:last-child {
              display: block !important;
              width: 100% !important;
              min-height: 13px !important;
              overflow: visible !important;
              text-align: center !important;
              white-space: nowrap !important;
              line-height: 13px !important;
            }

            .mobile-bottom-nav-icon {
              display: grid !important;
              place-items: center !important;
              width: 28px !important;
              height: 28px !important;
              color: #ffffff !important;
            }

            .mobile-bottom-nav-link.is-current .mobile-bottom-nav-icon {
              color: #ffd43b !important;
            }

            .mobile-bottom-nav-link.is-current .mobile-bottom-nav-icon svg {
              color: #ffd43b !important;
              stroke: #ffd43b !important;
            }

            .mobile-bottom-nav > a.mobile-bottom-nav-create {
              width: 52px !important;
              min-width: 52px !important;
              max-width: 52px !important;
              height: 52px !important;
              min-height: 52px !important;
              max-height: 52px !important;
              display: grid !important;
              place-items: center !important;
              padding: 0 !important;
              margin: 0 auto !important;
              border-radius: 999px !important;
              background: linear-gradient(180deg, #ffd43b, #ffb703) !important;
              color: #061225 !important;
              transform: translateY(-4px) !important;
              box-shadow:
                0 12px 28px rgba(255, 183, 3, 0.30),
                inset 0 1px 0 rgba(255, 255, 255, 0.42) !important;
            }

            .mobile-bottom-nav > a.mobile-bottom-nav-create svg {
              width: 26px !important;
              height: 26px !important;
            }

            .mobile-bottom-nav-posts-dot {
              position: absolute !important;
              top: 8px !important;
              right: 18px !important;
              width: 8px !important;
              height: 8px !important;
              border-radius: 999px !important;
              background: #f72585 !important;
              box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.16) !important;
            }
          }

          @media (max-width: 420px) {
            .mobile-bottom-nav {
              left: 14px !important;
              right: 14px !important;
              grid-template-columns: minmax(44px, 1fr) minmax(44px, 1fr) 56px minmax(44px, 1fr) minmax(44px, 1fr) !important;
              padding-left: 8px !important;
              padding-right: 8px !important;
            }

            .mobile-bottom-nav-link {
              font-size: 0.6rem !important;
            }

            .mobile-bottom-nav > a.mobile-bottom-nav-create {
              width: 50px !important;
              min-width: 50px !important;
              max-width: 50px !important;
              height: 50px !important;
              min-height: 50px !important;
              max-height: 50px !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* STOCKPORT SMILES BRANDING — powered by FromOne                 */
          /* -------------------------------------------------------------- */
          .sidebar-smiles-powered {
            width: 100% !important;
            min-height: 72px !important;
            display: grid !important;
            grid-template-columns: 46px minmax(0, 1fr) !important;
            align-items: center !important;
            gap: 12px !important;
            margin: 2px 0 0 !important;
            padding: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.075) !important;
            border-radius: 22px !important;
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.070), rgba(255, 255, 255, 0.030)),
              rgba(255, 255, 255, 0.035) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045) !important;
          }

          .sidebar-smiles-powered img {
            width: 46px !important;
            height: 46px !important;
            min-width: 46px !important;
            object-fit: contain !important;
            border-radius: 14px !important;
            background: rgba(255, 255, 255, 0.96) !important;
            padding: 5px !important;
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18) !important;
          }

          .sidebar-smiles-powered span {
            color: rgba(255, 255, 255, 0.84) !important;
            font-size: 0.82rem !important;
            line-height: 1.18 !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
          }

          .mobile-smiles-powered-mark {
            display: none !important;
          }

          @media (max-width: 900px) {
            .sidebar-smiles-powered {
              min-height: 54px !important;
              grid-template-columns: 34px minmax(0, 1fr) !important;
              gap: 10px !important;
              padding: 9px 10px !important;
              border-radius: 18px !important;
            }

            .sidebar-smiles-powered img {
              width: 34px !important;
              height: 34px !important;
              min-width: 34px !important;
              border-radius: 11px !important;
              padding: 4px !important;
            }

            .sidebar-smiles-powered span {
              font-size: 0.72rem !important;
              line-height: 1.12 !important;
            }

            .mobile-smiles-powered-mark {
              position: absolute !important;
              left: 50% !important;
              top: -10px !important;
              transform: translateX(-50%) !important;
              z-index: -1 !important;
              width: 0 !important;
              height: 0 !important;
              overflow: visible !important;
              pointer-events: none !important;
              display: none !important;
            }

            .mobile-smiles-powered-mark img {
              display: none !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* FROMONE NAV — STOCKPORT SMILES LIGHT THEME                     */
          /* Replaces old dark nav so it matches the finished Smiles pages   */
          /* -------------------------------------------------------------- */
          .sidebar {
            width: 360px !important;
            flex: 0 0 360px !important;
            min-width: 360px !important;
            height: 100dvh !important;
            min-height: 100dvh !important;
            position: sticky !important;
            top: 0 !important;
            padding: 22px 28px 24px !important;
            display: grid !important;
            grid-template-rows: auto 1fr !important;
            gap: 28px !important;
            overflow: hidden !important;
            border-right: 1px solid #dfe5f1 !important;
            background:
              radial-gradient(circle at 34px 30px, rgba(255, 212, 59, 0.26), transparent 26%),
              linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
            box-shadow: 18px 0 60px rgba(7, 27, 73, 0.06) !important;
            color: #071b49 !important;
          }

          .sidebar-mobile-top {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 14px !important;
            min-width: 0 !important;
          }

          .sidebar-brand {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            min-width: 0 !important;
          }

          .sidebar-logo-img {
            width: 46px !important;
            height: 46px !important;
            min-width: 46px !important;
            object-fit: contain !important;
            border: 1px solid #ffd2e5 !important;
            border-radius: 16px !important;
            background: #ffd43b !important;
            padding: 3px !important;
            box-shadow: 0 12px 26px rgba(255, 212, 59, 0.24) !important;
          }

          .sidebar-title {
            margin: 0 !important;
            color: #071b49 !important;
            font-size: 1.38rem !important;
            line-height: 1 !important;
            font-weight: 800 !important;
            letter-spacing: -0.052em !important;
          }

          .sidebar-subtitle {
            margin: 4px 0 0 !important;
            color: #52617a !important;
            font-size: 0.82rem !important;
            line-height: 1.1 !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
          }

          .sidebar-nav {
            display: grid !important;
            grid-template-rows: auto auto auto !important;
            align-content: start !important;
            gap: 18px !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          .sidebar-nav-main,
          .sidebar-nav-account {
            display: grid !important;
            gap: 10px !important;
            align-content: start !important;
          }

          .sidebar-nav-account {
            margin-top: 0 !important;
            padding-top: 18px !important;
            border-top: 1px solid #dfe5f1 !important;
          }

          .sidebar-link,
          .sidebar-link-button,
          .sidebar-auth-link {
            position: relative !important;
            width: 100% !important;
            min-height: 60px !important;
            display: flex !important;
            align-items: center !important;
            gap: 14px !important;
            padding: 9px 12px !important;
            border: 1px solid transparent !important;
            border-radius: 22px !important;
            background: transparent !important;
            color: #52617a !important;
            text-decoration: none !important;
            font: inherit !important;
            font-size: 0.98rem !important;
            line-height: 1 !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
            cursor: pointer !important;
            box-shadow: none !important;
            transition:
              background 170ms ease,
              border-color 170ms ease,
              color 170ms ease,
              transform 170ms ease !important;
          }

          .sidebar-link:hover,
          .sidebar-link-button:hover {
            transform: translateX(2px) !important;
            border-color: #ffd2e5 !important;
            background: #fff8fc !important;
            color: #071b49 !important;
            box-shadow: none !important;
          }

          .sidebar-link.is-current,
          .sidebar-link[aria-current='page'],
          .sidebar-link.active,
          .sidebar-link.is-active,
          .sidebar-link.sidebar-active {
            border-color: #ffd2e5 !important;
            background: #fff8fc !important;
            color: #071b49 !important;
            box-shadow: 0 10px 24px rgba(247, 37, 133, 0.07) !important;
          }

          .sidebar-link.is-current::before,
          .sidebar-link[aria-current='page']::before,
          .sidebar-link.active::before,
          .sidebar-link.is-active::before,
          .sidebar-link.sidebar-active::before {
            content: "" !important;
            display: block !important;
            position: absolute !important;
            left: 9px !important;
            top: 50% !important;
            width: 6px !important;
            height: 26px !important;
            border-radius: 999px !important;
            background: #f72585 !important;
            transform: translateY(-50%) !important;
          }

          .sidebar-link-icon {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            display: grid !important;
            place-items: center !important;
            border: 1px solid #dfe5f1 !important;
            border-radius: 16px !important;
            background: #ffffff !important;
            color: #f72585 !important;
            box-shadow: 0 8px 18px rgba(7, 27, 73, 0.04) !important;
          }

          .sidebar-link.is-current .sidebar-link-icon,
          .sidebar-link:hover .sidebar-link-icon,
          .sidebar-link-button:hover .sidebar-link-icon {
            border-color: #ffd2e5 !important;
            background: #ffffff !important;
            color: #f72585 !important;
          }

          .sidebar-link-icon svg {
            width: 20px !important;
            height: 20px !important;
            color: #f72585 !important;
            stroke: #f72585 !important;
          }

          .product-updates-live-dot {
            width: 8px !important;
            height: 8px !important;
            border-radius: 999px !important;
            background: #f72585 !important;
            box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.14) !important;
          }

          .sidebar-smiles-powered {
            width: 100% !important;
            min-height: 88px !important;
            display: grid !important;
            grid-template-columns: 56px minmax(0, 1fr) !important;
            align-items: center !important;
            gap: 14px !important;
            margin: 4px 0 0 !important;
            padding: 14px !important;
            border: 1px solid #ffd2e5 !important;
            border-radius: 26px !important;
            background:
              radial-gradient(circle at 18px 14px, rgba(255, 212, 59, 0.30), transparent 42%),
              linear-gradient(135deg, #fff8fc 0%, #ffffff 100%) !important;
            box-shadow: 0 14px 34px rgba(247, 37, 133, 0.08) !important;
          }

          .sidebar-smiles-powered img {
            width: 56px !important;
            height: 56px !important;
            min-width: 56px !important;
            object-fit: contain !important;
            border: 1px solid #dfe5f1 !important;
            border-radius: 18px !important;
            background: #ffffff !important;
            padding: 5px !important;
            box-shadow: 0 10px 24px rgba(7, 27, 73, 0.06) !important;
          }

          .sidebar-smiles-powered div {
            display: grid !important;
            gap: 4px !important;
            min-width: 0 !important;
          }

          .sidebar-smiles-powered strong {
            color: #071b49 !important;
            font-size: 1rem !important;
            line-height: 1 !important;
            font-weight: 800 !important;
            letter-spacing: -0.04em !important;
          }

          .sidebar-smiles-powered span {
            color: #52617a !important;
            font-size: 0.78rem !important;
            line-height: 1.15 !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
          }

          .mobile-menu-close {
            display: none !important;
          }

          @media (max-width: 900px) {
            .sidebar {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: min(82vw, 310px) !important;
              min-width: 0 !important;
              max-width: 310px !important;
              height: 100dvh !important;
              min-height: 100dvh !important;
              padding: 18px 16px max(18px, env(safe-area-inset-bottom)) !important;
              z-index: 90 !important;
              gap: 20px !important;
              border-right: 1px solid #dfe5f1 !important;
              background:
                radial-gradient(circle at 28px 24px, rgba(255, 212, 59, 0.24), transparent 28%),
                linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
              box-shadow: 18px 0 60px rgba(7, 27, 73, 0.18) !important;
            }

            .mobile-menu-close {
              width: 42px !important;
              height: 42px !important;
              min-width: 42px !important;
              display: inline-grid !important;
              place-items: center !important;
              border: 1px solid #dfe5f1 !important;
              border-radius: 16px !important;
              background: #ffffff !important;
              color: #071b49 !important;
              font-size: 1.4rem !important;
              line-height: 1 !important;
              font-weight: 800 !important;
              box-shadow: 0 8px 18px rgba(7, 27, 73, 0.06) !important;
            }

            .sidebar-logo-img {
              width: 38px !important;
              height: 38px !important;
              min-width: 38px !important;
              border-radius: 13px !important;
            }

            .sidebar-title {
              font-size: 1.18rem !important;
            }

            .sidebar-subtitle {
              font-size: 0.72rem !important;
            }

            .sidebar-nav {
              gap: 12px !important;
            }

            .sidebar-nav-main,
            .sidebar-nav-account {
              gap: 8px !important;
            }

            .sidebar-link,
            .sidebar-link-button,
            .sidebar-auth-link {
              min-height: 48px !important;
              padding: 6px 10px !important;
              gap: 11px !important;
              border-radius: 18px !important;
              font-size: 0.92rem !important;
            }

            .sidebar-link.is-current::before,
            .sidebar-link[aria-current='page']::before {
              left: 7px !important;
              height: 22px !important;
            }

            .sidebar-link-icon {
              width: 34px !important;
              height: 34px !important;
              min-width: 34px !important;
              border-radius: 13px !important;
            }

            .sidebar-link-icon svg {
              width: 18px !important;
              height: 18px !important;
            }

            .sidebar-smiles-powered {
              min-height: 58px !important;
              grid-template-columns: 38px minmax(0, 1fr) !important;
              gap: 10px !important;
              padding: 10px !important;
              border-radius: 20px !important;
            }

            .sidebar-smiles-powered img {
              width: 38px !important;
              height: 38px !important;
              min-width: 38px !important;
              border-radius: 13px !important;
              padding: 4px !important;
            }

            .sidebar-smiles-powered strong {
              font-size: 0.84rem !important;
            }

            .sidebar-smiles-powered span {
              font-size: 0.68rem !important;
            }

            .mobile-bottom-nav {
              position: fixed !important;
              left: max(18px, calc(env(safe-area-inset-left) + 18px)) !important;
              right: max(18px, calc(env(safe-area-inset-right) + 18px)) !important;
              bottom: max(14px, calc(env(safe-area-inset-bottom) + 12px)) !important;
              z-index: 120 !important;
              display: grid !important;
              grid-template-columns: minmax(48px, 1fr) minmax(48px, 1fr) 58px minmax(48px, 1fr) minmax(48px, 1fr) !important;
              align-items: center !important;
              gap: 2px !important;
              min-height: 74px !important;
              padding: 9px 10px !important;
              overflow: visible !important;
              border: 1px solid #dfe5f1 !important;
              border-radius: 28px !important;
              background:
                radial-gradient(circle at 50% -20%, rgba(255, 212, 59, 0.20), transparent 34%),
                rgba(255, 255, 255, 0.96) !important;
              box-shadow:
                0 20px 50px rgba(7, 27, 73, 0.18),
                inset 0 1px 0 rgba(255, 255, 255, 0.72) !important;
              backdrop-filter: blur(18px) !important;
              -webkit-backdrop-filter: blur(18px) !important;
            }

            .mobile-bottom-nav-link {
              position: relative !important;
              min-width: 0 !important;
              min-height: 58px !important;
              display: grid !important;
              grid-template-rows: 28px 15px !important;
              place-items: center !important;
              align-content: center !important;
              gap: 2px !important;
              border-radius: 20px !important;
              color: #52617a !important;
              text-decoration: none !important;
              font-size: 0.64rem !important;
              line-height: 1 !important;
              font-weight: 800 !important;
              letter-spacing: -0.02em !important;
            }

            .mobile-bottom-nav-link.is-current {
              background: #fff8fc !important;
              color: #071b49 !important;
            }

            .mobile-bottom-nav-icon {
              display: grid !important;
              place-items: center !important;
              width: 28px !important;
              height: 28px !important;
              color: #52617a !important;
            }

            .mobile-bottom-nav-icon svg {
              color: currentColor !important;
              stroke: currentColor !important;
            }

            .mobile-bottom-nav-link.is-current .mobile-bottom-nav-icon,
            .mobile-bottom-nav-link.is-current .mobile-bottom-nav-icon svg {
              color: #f72585 !important;
              stroke: #f72585 !important;
            }

            .mobile-bottom-nav > a.mobile-bottom-nav-create {
              width: 52px !important;
              min-width: 52px !important;
              max-width: 52px !important;
              height: 52px !important;
              min-height: 52px !important;
              max-height: 52px !important;
              display: grid !important;
              place-items: center !important;
              padding: 0 !important;
              margin: 0 auto !important;
              border-radius: 999px !important;
              background: linear-gradient(180deg, #ffd43b, #ffb703) !important;
              color: #071b49 !important;
              transform: translateY(-4px) !important;
              box-shadow:
                0 12px 28px rgba(255, 183, 3, 0.30),
                inset 0 1px 0 rgba(255, 255, 255, 0.42) !important;
            }

            .mobile-bottom-nav > a.mobile-bottom-nav-create svg {
              width: 26px !important;
              height: 26px !important;
              color: #071b49 !important;
              stroke: #071b49 !important;
            }

            .mobile-bottom-nav-posts-dot {
              position: absolute !important;
              top: 8px !important;
              right: 18px !important;
              width: 8px !important;
              height: 8px !important;
              border-radius: 999px !important;
              background: #f72585 !important;
              box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.16) !important;
            }
          }

          @media (max-width: 420px) {
            .mobile-bottom-nav {
              left: 14px !important;
              right: 14px !important;
              grid-template-columns: minmax(44px, 1fr) minmax(44px, 1fr) 56px minmax(44px, 1fr) minmax(44px, 1fr) !important;
              padding-left: 8px !important;
              padding-right: 8px !important;
            }

            .mobile-bottom-nav-link {
              font-size: 0.6rem !important;
            }

            .mobile-bottom-nav > a.mobile-bottom-nav-create {
              width: 50px !important;
              min-width: 50px !important;
              max-width: 50px !important;
              height: 50px !important;
              min-height: 50px !important;
              max-height: 50px !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* SIDEBAR CUTOFF FIX — allow the nav content to breathe/scroll    */
          /* -------------------------------------------------------------- */
          .sidebar {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            scrollbar-width: thin !important;
            scrollbar-color: rgba(247, 37, 133, 0.28) transparent !important;
          }

          .sidebar::-webkit-scrollbar {
            width: 6px !important;
          }

          .sidebar::-webkit-scrollbar-track {
            background: transparent !important;
          }

          .sidebar::-webkit-scrollbar-thumb {
            border-radius: 999px !important;
            background: rgba(247, 37, 133, 0.24) !important;
          }

          .sidebar-nav {
            min-height: 0 !important;
            overflow: visible !important;
            padding-bottom: 26px !important;
          }

          .sidebar-nav-main,
          .sidebar-nav-account {
            min-width: 0 !important;
          }

          .sidebar-smiles-powered {
            max-width: 100% !important;
            grid-template-columns: 50px minmax(0, 1fr) !important;
            gap: 12px !important;
            padding: 12px !important;
            border-radius: 24px !important;
          }

          .sidebar-smiles-powered img {
            width: 50px !important;
            height: 50px !important;
            min-width: 50px !important;
            border-radius: 16px !important;
          }

          .sidebar-smiles-powered div {
            min-width: 0 !important;
            overflow: hidden !important;
          }

          .sidebar-smiles-powered strong,
          .sidebar-smiles-powered span {
            display: block !important;
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          @media (max-width: 900px) {
            .sidebar {
              overflow-y: auto !important;
              overflow-x: hidden !important;
              padding-bottom: max(96px, calc(env(safe-area-inset-bottom) + 96px)) !important;
            }

            .sidebar-nav {
              padding-bottom: 24px !important;
            }

            .sidebar-smiles-powered {
              grid-template-columns: 36px minmax(0, 1fr) !important;
              gap: 9px !important;
              padding: 9px !important;
              border-radius: 18px !important;
            }

            .sidebar-smiles-powered img {
              width: 36px !important;
              height: 36px !important;
              min-width: 36px !important;
              border-radius: 12px !important;
            }

            .sidebar-smiles-powered strong {
              font-size: 0.82rem !important;
            }

            .sidebar-smiles-powered span {
              font-size: 0.66rem !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* SIDEBAR NO-SCROLL FIX — taller natural sidebar                 */
          /* -------------------------------------------------------------- */
          .sidebar {
            height: auto !important;
            min-height: calc(100vh + 96px) !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            scrollbar-width: none !important;
            padding-bottom: 34px !important;
          }

          .sidebar::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          .sidebar-nav {
            overflow: visible !important;
            min-height: auto !important;
            padding-bottom: 0 !important;
            gap: 16px !important;
          }

          .sidebar-nav-main,
          .sidebar-nav-account {
            gap: 8px !important;
          }

          .sidebar-link,
          .sidebar-link-button,
          .sidebar-auth-link {
            min-height: 54px !important;
          }

          .sidebar-smiles-powered {
            min-height: 78px !important;
            grid-template-columns: 46px minmax(0, 1fr) !important;
            gap: 11px !important;
            padding: 11px !important;
          }

          .sidebar-smiles-powered img {
            width: 46px !important;
            height: 46px !important;
            min-width: 46px !important;
          }

          @media (max-width: 900px) {
            .sidebar {
              height: auto !important;
              min-height: calc(100vh + 120px) !important;
              overflow: visible !important;
              overflow-x: visible !important;
              overflow-y: visible !important;
              padding-bottom: max(116px, calc(env(safe-area-inset-bottom) + 116px)) !important;
            }

            .sidebar-nav {
              overflow: visible !important;
              padding-bottom: 0 !important;
              gap: 10px !important;
            }

            .sidebar-link,
            .sidebar-link-button,
            .sidebar-auth-link {
              min-height: 44px !important;
            }

            .sidebar-smiles-powered {
              min-height: 52px !important;
              grid-template-columns: 34px minmax(0, 1fr) !important;
              gap: 8px !important;
              padding: 8px !important;
              border-radius: 18px !important;
            }

            .sidebar-smiles-powered img {
              width: 34px !important;
              height: 34px !important;
              min-width: 34px !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* SIDEBAR FULL-PAGE HEIGHT — background follows page bottom       */
          /* -------------------------------------------------------------- */
          body:has(.sidebar) .app-shell {
            position: relative !important;
            align-items: stretch !important;
            min-height: 100vh !important;
          }

          body:has(.sidebar) .app-shell::before {
            content: "" !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            width: 360px !important;
            z-index: 0 !important;
            pointer-events: none !important;
            border-right: 1px solid #dfe5f1 !important;
            background:
              radial-gradient(circle at 34px 30px, rgba(255, 212, 59, 0.26), transparent 26%),
              linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
            box-shadow: 18px 0 60px rgba(7, 27, 73, 0.06) !important;
          }

          .sidebar {
            position: relative !important;
            top: auto !important;
            z-index: 1 !important;
            align-self: stretch !important;
            height: auto !important;
            min-height: 100vh !important;
            overflow: visible !important;
            background: transparent !important;
            box-shadow: none !important;
            border-right: 0 !important;
          }

          body:has(.sidebar) .main-content {
            position: relative !important;
            z-index: 1 !important;
          }

          @media (max-width: 900px) {
            body:has(.sidebar) .app-shell::before {
              display: none !important;
              content: none !important;
            }

            .sidebar {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              height: auto !important;
              min-height: calc(100vh + 120px) !important;
              background:
                radial-gradient(circle at 28px 24px, rgba(255, 212, 59, 0.24), transparent 28%),
                linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
              box-shadow: 18px 0 60px rgba(7, 27, 73, 0.18) !important;
              border-right: 1px solid #dfe5f1 !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* MOBILE HEADER + MENU — SMILES LIGHT THEME                      */
          /* -------------------------------------------------------------- */
          @media (max-width: 900px) {
            .mobile-header,
            .sidebar-mobile-header,
            .app-mobile-header,
            .mobile-topbar,
            .fromone-mobile-header {
              min-height: 82px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 14px !important;
              padding: max(10px, env(safe-area-inset-top)) 20px 10px !important;
              border-bottom: 1px solid #dfe5f1 !important;
              background:
                radial-gradient(circle at 36px 22px, rgba(255, 212, 59, 0.28), transparent 32%),
                linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
              color: #071b49 !important;
              box-shadow: 0 12px 30px rgba(7, 27, 73, 0.08) !important;
            }

            .mobile-header *,
            .sidebar-mobile-header *,
            .app-mobile-header *,
            .mobile-topbar *,
            .fromone-mobile-header * {
              color: #071b49 !important;
            }

            .mobile-header img,
            .sidebar-mobile-header img,
            .app-mobile-header img,
            .mobile-topbar img,
            .fromone-mobile-header img {
              background: #ffd43b !important;
              border-radius: 14px !important;
              box-shadow: 0 10px 22px rgba(255, 212, 59, 0.20) !important;
            }

            .mobile-header button,
            .sidebar-mobile-header button,
            .app-mobile-header button,
            .mobile-topbar button,
            .fromone-mobile-header button,
            .mobile-menu-button,
            .mobile-menu-toggle,
            .hamburger-button {
              width: 56px !important;
              height: 56px !important;
              min-width: 56px !important;
              display: inline-grid !important;
              place-items: center !important;
              border: 1px solid #ffd2e5 !important;
              border-radius: 18px !important;
              background: #ffd43b !important;
              color: #071b49 !important;
              box-shadow: 0 14px 28px rgba(255, 183, 3, 0.24) !important;
            }

            .mobile-header button svg,
            .sidebar-mobile-header button svg,
            .app-mobile-header button svg,
            .mobile-topbar button svg,
            .fromone-mobile-header button svg,
            .mobile-menu-button svg,
            .mobile-menu-toggle svg,
            .hamburger-button svg {
              color: #071b49 !important;
              stroke: #071b49 !important;
            }

            .sidebar {
              background:
                radial-gradient(circle at 28px 24px, rgba(255, 212, 59, 0.24), transparent 28%),
                linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
              color: #071b49 !important;
            }

            .sidebar-overlay,
            .mobile-sidebar-overlay,
            .sidebar-backdrop {
              background: rgba(7, 27, 73, 0.42) !important;
              backdrop-filter: blur(6px) !important;
              -webkit-backdrop-filter: blur(6px) !important;
            }

            .mobile-menu-close {
              width: 56px !important;
              height: 56px !important;
              min-width: 56px !important;
              display: inline-grid !important;
              place-items: center !important;
              border: 1px solid #ffd2e5 !important;
              border-radius: 18px !important;
              background: #ffd43b !important;
              color: #071b49 !important;
              font-size: 1.45rem !important;
              line-height: 1 !important;
              font-weight: 900 !important;
              box-shadow: 0 14px 28px rgba(255, 183, 3, 0.24) !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* SIMPLE MOBILE DROPDOWN — controlled by hamburger state          */
          /* -------------------------------------------------------------- */
          @media (max-width: 900px) {
            .mobile-header,
            .sidebar-mobile-header,
            .app-mobile-header,
            .mobile-topbar,
            .fromone-mobile-header {
              position: sticky !important;
              top: 0 !important;
              z-index: 1000 !important;
              min-height: 72px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 14px !important;
              padding: max(10px, env(safe-area-inset-top)) 18px 10px !important;
              border-bottom: 1px solid #dfe5f1 !important;
              background:
                radial-gradient(circle at 34px 18px, rgba(255, 212, 59, 0.24), transparent 30%),
                linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
              color: #071b49 !important;
              box-shadow: 0 10px 24px rgba(7, 27, 73, 0.08) !important;
            }

            .mobile-header *,
            .sidebar-mobile-header *,
            .app-mobile-header *,
            .mobile-topbar *,
            .fromone-mobile-header * {
              color: #071b49 !important;
            }

            .mobile-menu-button,
            .mobile-menu-toggle,
            .hamburger-button,
            .mobile-header button,
            .sidebar-mobile-header button,
            .app-mobile-header button,
            .mobile-topbar button,
            .fromone-mobile-header button {
              width: 54px !important;
              height: 54px !important;
              min-width: 54px !important;
              display: inline-grid !important;
              place-items: center !important;
              border: 1px solid #ffd2e5 !important;
              border-radius: 18px !important;
              background: #ffd43b !important;
              color: #071b49 !important;
              box-shadow: 0 14px 28px rgba(255, 183, 3, 0.24) !important;
            }

            .mobile-menu-button svg,
            .mobile-menu-toggle svg,
            .hamburger-button svg,
            .mobile-header button svg,
            .sidebar-mobile-header button svg,
            .app-mobile-header button svg,
            .mobile-topbar button svg,
            .fromone-mobile-header button svg {
              color: #071b49 !important;
              stroke: #071b49 !important;
            }

            .sidebar {
              position: fixed !important;
              top: 82px !important;
              left: 18px !important;
              right: 18px !important;
              z-index: 1200 !important;
              width: auto !important;
              min-width: 0 !important;
              max-width: none !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: calc(100dvh - 172px) !important;
              display: block !important;
              padding: 16px !important;
              overflow: auto !important;
              border: 1px solid #dfe5f1 !important;
              border-radius: 28px !important;
              background:
                radial-gradient(circle at 24px 20px, rgba(255, 212, 59, 0.24), transparent 32%),
                linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
              box-shadow: 0 24px 70px rgba(7, 27, 73, 0.22) !important;
              color: #071b49 !important;
              transform: translateY(-10px) scale(0.985) !important;
              opacity: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
              transition:
                opacity 160ms ease,
                transform 160ms ease,
                visibility 160ms ease !important;
            }

            .sidebar.mobile-dropdown-open {
              transform: translateY(0) scale(1) !important;
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
            }

            .sidebar-mobile-top {
              display: none !important;
            }

            .sidebar-nav {
              display: grid !important;
              gap: 12px !important;
              overflow: visible !important;
              padding: 0 !important;
            }

            .sidebar-nav-main,
            .sidebar-nav-account {
              display: grid !important;
              gap: 8px !important;
              padding: 0 !important;
              border: 0 !important;
            }

            .sidebar-nav-account {
              padding-top: 10px !important;
              border-top: 1px solid #dfe5f1 !important;
            }

            .sidebar-link,
            .sidebar-link-button,
            .sidebar-auth-link {
              min-height: 52px !important;
              border-radius: 18px !important;
              padding: 8px 10px !important;
              color: #52617a !important;
              background: transparent !important;
              border: 1px solid transparent !important;
              box-shadow: none !important;
              font-size: 0.96rem !important;
              font-weight: 800 !important;
            }

            .sidebar-link.is-current,
            .sidebar-link:hover,
            .sidebar-link-button:hover {
              background: #fff8fc !important;
              border-color: #ffd2e5 !important;
              color: #071b49 !important;
              box-shadow: 0 10px 24px rgba(247, 37, 133, 0.07) !important;
            }

            .sidebar-link::before {
              display: none !important;
              content: none !important;
            }

            .sidebar-link-icon {
              width: 36px !important;
              height: 36px !important;
              min-width: 36px !important;
              border: 1px solid #dfe5f1 !important;
              border-radius: 14px !important;
              background: #ffffff !important;
              color: #f72585 !important;
              box-shadow: 0 8px 18px rgba(7, 27, 73, 0.04) !important;
            }

            .sidebar-link-icon svg {
              width: 19px !important;
              height: 19px !important;
              color: #f72585 !important;
              stroke: #f72585 !important;
            }

            .sidebar-smiles-powered {
              min-height: 58px !important;
              display: grid !important;
              grid-template-columns: 38px minmax(0, 1fr) !important;
              gap: 10px !important;
              margin: 4px 0 !important;
              padding: 10px !important;
              border: 1px solid #ffd2e5 !important;
              border-radius: 20px !important;
              background: #fff8fc !important;
              box-shadow: 0 10px 24px rgba(247, 37, 133, 0.07) !important;
            }

            .sidebar-smiles-powered img {
              width: 38px !important;
              height: 38px !important;
              min-width: 38px !important;
              border-radius: 13px !important;
              background: #ffffff !important;
              padding: 4px !important;
            }

            .mobile-menu-close,
            .sidebar-overlay,
            .mobile-sidebar-overlay,
            .sidebar-backdrop {
              display: none !important;
            }

            .mobile-bottom-nav {
              z-index: 900 !important;
            }
          }

          @media (max-width: 420px) {
            .sidebar {
              left: 14px !important;
              right: 14px !important;
              top: 78px !important;
              max-height: calc(100dvh - 168px) !important;
              padding: 14px !important;
              border-radius: 26px !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* REAL DROPDOWN FIX — parent hamburger opens this menu             */
          /* -------------------------------------------------------------- */
          @media (max-width: 900px) {
            .sidebar {
              position: fixed !important;
              top: 88px !important;
              left: 24px !important;
              right: 24px !important;
              z-index: 1400 !important;
              width: auto !important;
              min-width: 0 !important;
              max-width: none !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: calc(100dvh - 176px) !important;
              display: block !important;
              padding: 18px !important;
              overflow: auto !important;
              border: 1px solid #dfe5f1 !important;
              border-radius: 28px !important;
              background:
                radial-gradient(circle at 26px 20px, rgba(255, 212, 59, 0.26), transparent 34%),
                linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%) !important;
              box-shadow: 0 28px 80px rgba(7, 27, 73, 0.24) !important;
              color: #071b49 !important;
              transform: translateY(-10px) scale(0.985) !important;
              opacity: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
              transition:
                opacity 160ms ease,
                transform 160ms ease,
                visibility 160ms ease !important;
            }

            .sidebar.sidebar-open,
            .sidebar.mobile-dropdown-open,
            .sidebar[data-mobile-menu-open="true"] {
              transform: translateY(0) scale(1) !important;
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
            }

            .sidebar-mobile-top {
              display: none !important;
            }

            .sidebar-nav {
              display: grid !important;
              gap: 12px !important;
              padding: 0 !important;
              overflow: visible !important;
            }

            .sidebar-nav-main,
            .sidebar-nav-account {
              display: grid !important;
              gap: 8px !important;
              padding: 0 !important;
              border: 0 !important;
            }

            .sidebar-nav-account {
              padding-top: 10px !important;
              border-top: 1px solid #dfe5f1 !important;
            }

            .sidebar-link,
            .sidebar-link-button,
            .sidebar-auth-link {
              min-height: 52px !important;
              display: flex !important;
              align-items: center !important;
              gap: 12px !important;
              border: 1px solid transparent !important;
              border-radius: 18px !important;
              padding: 8px 10px !important;
              color: #52617a !important;
              background: transparent !important;
              box-shadow: none !important;
              font-size: 0.96rem !important;
              font-weight: 800 !important;
              text-decoration: none !important;
            }

            .sidebar-link.is-current,
            .sidebar-link:hover,
            .sidebar-link-button:hover {
              background: #fff8fc !important;
              border-color: #ffd2e5 !important;
              color: #071b49 !important;
              box-shadow: 0 10px 24px rgba(247, 37, 133, 0.07) !important;
            }

            .sidebar-link::before,
            .sidebar-link::after {
              display: none !important;
              content: none !important;
            }

            .sidebar-link-icon {
              width: 36px !important;
              height: 36px !important;
              min-width: 36px !important;
              display: grid !important;
              place-items: center !important;
              border: 1px solid #dfe5f1 !important;
              border-radius: 14px !important;
              background: #ffffff !important;
              color: #f72585 !important;
              box-shadow: 0 8px 18px rgba(7, 27, 73, 0.04) !important;
            }

            .sidebar-link-icon svg {
              width: 19px !important;
              height: 19px !important;
              color: #f72585 !important;
              stroke: #f72585 !important;
            }

            .sidebar-smiles-powered {
              min-height: 58px !important;
              display: grid !important;
              grid-template-columns: 38px minmax(0, 1fr) !important;
              align-items: center !important;
              gap: 10px !important;
              margin: 4px 0 !important;
              padding: 10px !important;
              border: 1px solid #ffd2e5 !important;
              border-radius: 20px !important;
              background: #fff8fc !important;
              box-shadow: 0 10px 24px rgba(247, 37, 133, 0.07) !important;
            }

            .sidebar-smiles-powered img {
              width: 38px !important;
              height: 38px !important;
              min-width: 38px !important;
              border-radius: 13px !important;
              background: #ffffff !important;
              padding: 4px !important;
            }

            .sidebar-smiles-powered strong {
              display: block !important;
              color: #071b49 !important;
              font-size: 0.88rem !important;
              line-height: 1 !important;
              font-weight: 800 !important;
              letter-spacing: -0.035em !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }

            .sidebar-smiles-powered span {
              display: block !important;
              margin-top: 3px !important;
              color: #52617a !important;
              font-size: 0.72rem !important;
              line-height: 1 !important;
              font-weight: 800 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }

            .mobile-bottom-nav {
              z-index: 900 !important;
            }
          }

          @media (max-width: 420px) {
            .sidebar {
              top: 82px !important;
              left: 16px !important;
              right: 16px !important;
              max-height: calc(100dvh - 170px) !important;
              padding: 16px !important;
              border-radius: 26px !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* FINAL MOBILE DROPDOWN CLICK FIX                                */
          /* Overlay can dim the page, but it must never sit above menu      */
          /* -------------------------------------------------------------- */
          @media (max-width: 900px) {
            .sidebar.sidebar-open,
            .sidebar.mobile-dropdown-open,
            .sidebar[data-mobile-menu-open="true"] {
              z-index: 2147483646 !important;
              pointer-events: auto !important;
              isolation: isolate !important;
            }

            .sidebar.sidebar-open *,
            .sidebar.mobile-dropdown-open *,
            .sidebar[data-mobile-menu-open="true"] * {
              pointer-events: auto !important;
            }

            body:has(.sidebar[data-mobile-menu-open="true"]) .sidebar,
            body:has(.sidebar.sidebar-open) .sidebar,
            body:has(.sidebar.mobile-dropdown-open) .sidebar {
              z-index: 2147483646 !important;
              pointer-events: auto !important;
            }

            body:has(.sidebar[data-mobile-menu-open="true"]) .sidebar-overlay,
            body:has(.sidebar[data-mobile-menu-open="true"]) .mobile-sidebar-overlay,
            body:has(.sidebar[data-mobile-menu-open="true"]) .sidebar-backdrop,
            body:has(.sidebar.sidebar-open) .sidebar-overlay,
            body:has(.sidebar.sidebar-open) .mobile-sidebar-overlay,
            body:has(.sidebar.sidebar-open) .sidebar-backdrop,
            body:has(.sidebar.mobile-dropdown-open) .sidebar-overlay,
            body:has(.sidebar.mobile-dropdown-open) .mobile-sidebar-overlay,
            body:has(.sidebar.mobile-dropdown-open) .sidebar-backdrop {
              z-index: 2147483000 !important;
              pointer-events: none !important;
            }

            body:has(.sidebar[data-mobile-menu-open="true"]) [class*="overlay"],
            body:has(.sidebar[data-mobile-menu-open="true"]) [class*="backdrop"],
            body:has(.sidebar.sidebar-open) [class*="overlay"],
            body:has(.sidebar.sidebar-open) [class*="backdrop"],
            body:has(.sidebar.mobile-dropdown-open) [class*="overlay"],
            body:has(.sidebar.mobile-dropdown-open) [class*="backdrop"] {
              pointer-events: none !important;
            }

            body:has(.sidebar[data-mobile-menu-open="true"]) .sidebar,
            body:has(.sidebar.sidebar-open) .sidebar,
            body:has(.sidebar.mobile-dropdown-open) .sidebar,
            body:has(.sidebar[data-mobile-menu-open="true"]) .sidebar *,
            body:has(.sidebar.sidebar-open) .sidebar *,
            body:has(.sidebar.mobile-dropdown-open) .sidebar * {
              pointer-events: auto !important;
            }

            .sidebar-link,
            .sidebar-link-button,
            .sidebar-auth-link,
            .sidebar-smiles-powered {
              position: relative !important;
              z-index: 2 !important;
            }
          }


          /* -------------------------------------------------------------- */
          /* MOBILE DROPDOWN — hide Stockport Smiles card                    */
          /* Keep this card desktop-only                                     */
          /* -------------------------------------------------------------- */
          @media (max-width: 900px) {
            .sidebar .sidebar-smiles-powered {
              display: none !important;
            }

            .sidebar-nav-account {
              padding-top: 10px !important;
              border-top: 1px solid #dfe5f1 !important;
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
            <Link className={navClass("/dashboard")} href="/dashboard" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <UploadCloud {...iconProps} />
              </span>
              Create
            </Link>

            <Link
              className={`${navClass("/posts")} sidebar-posts-link`}
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

            <Link className={navClass("/smiles")} href="/smiles" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <Smile {...iconProps} />
              </span>
              Smiles
            </Link>

            <Link className={navClass("/settings")} href="/settings" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <Settings {...iconProps} />
              </span>
              Settings
            </Link>

            <Link className={navClass("/subscription")} href="/subscription" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <CreditCard {...iconProps} />
              </span>
              Billing
            </Link>
          </div>

          <div className="sidebar-smiles-powered" aria-label="Stockport Smiles powered by FromOne">
            <img src="/stockport-smiles-logo.png" alt="Stockport Smiles" />
            <div>
              <strong>Stockport Smiles</strong>
              <span>Powered by FromOne</span>
            </div>
          </div>

          <div className="sidebar-nav-account" aria-label="Account navigation">
            <Link className={navClass("/bugreport")} href="/bugreport" onClick={closeMenu}>
              <span className="sidebar-link-icon">
                <HelpCircle {...iconProps} />
              </span>
              Help
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
          className={mobileNavClass("/posts")}
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
          className={mobileNavClass("/smiles")}
          href="/smiles"
          onClick={closeMenu}
        >
          <span className="mobile-bottom-nav-icon">
            <Smile {...iconProps} />
          </span>
          <span>Smiles</span>
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
          className={mobileNavClass("/subscription")}
          href="/subscription"
          onClick={closeMenu}
        >
          <span className="mobile-bottom-nav-icon">
            <CreditCard {...iconProps} />
          </span>
          <span>Billing</span>
        </Link>

        <Link
          className={mobileNavClass("/settings")}
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
