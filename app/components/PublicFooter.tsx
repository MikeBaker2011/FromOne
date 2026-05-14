import Link from 'next/link';

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div>
          <strong>FromOne</strong>
          <p>Weekly social media content for small businesses.</p>
        </div>

        <nav className="public-footer-links" aria-label="Footer navigation">
          <Link href="/subscription">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/bugreport">Support</Link>
        </nav>

        <small>© {year} FromOne. All rights reserved.</small>
      </div>
    </footer>
  );
}