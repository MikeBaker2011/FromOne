import Link from 'next/link';

export default function SocialHubPage() {
  return (
    <div className="page-header">
      <div className="page-eyebrow">Coming Soon</div>
      <h1 className="page-title">Social Hub</h1>
      <p className="page-description">
        A future space where small businesses can connect, collaborate, share
        opportunities, and support each other.
      </p>

      <div className="premium-card social-hub-coming-soon">
        <div className="page-eyebrow">Future Feature</div>

        <h2>Business community board coming soon.</h2>

        <p>
          Social Hub will become a simple message board for businesses to post
          collaboration ideas, local opportunities, service requests, shout-outs,
          and partnership offers.
        </p>

        <div className="social-hub-preview-grid">
          <div>
            <strong>Collaborations</strong>
            <span>Find local businesses to work with.</span>
          </div>

          <div>
            <strong>Opportunities</strong>
            <span>Share offers, events, openings, and useful updates.</span>
          </div>

          <div>
            <strong>Community</strong>
            <span>Build visibility with other businesses in your area.</span>
          </div>
        </div>

        <Link href="/dashboard" className="dashboard-profile-link social-hub-back-link">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}