import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | FromOne',
  description:
    'Read how FromOne collects, uses, stores, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main className="sales-page product-updates-page legal-page">
      <PublicNav />

      <section className="page-header" style={{ marginTop: 86, marginBottom: 70 }}>
        <div className="page-eyebrow">FromOne Privacy Policy</div>
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-description">
          This policy explains how FromOne collects, uses, stores, and protects personal data.
        </p>
        <p className="legal-updated">Last updated: 13 May 2026</p>
      </section>

      <section
        className="premium-card legal-card"
        style={{
          marginBottom: 58,
          borderRadius: 34,
          padding: 'clamp(24px, 3vw, 38px)',
        }}
      >
        <h2>1. Who we are</h2>
        <p>
          FromOne is a social media content workflow platform for small businesses. It helps
          users create weekly social media posts from a Business Profile, uploaded media, website
          information, and user-provided business details.
        </p>
        <p>
          For privacy questions, contact us at{' '}
          <a href="mailto:info@fromone.co.uk">info@fromone.co.uk</a>.
        </p>

        <h2>2. What information we collect</h2>
        <p>We may collect and store the following information:</p>
        <ul>
          <li>Account information, such as your email address and user ID.</li>
          <li>
            Business profile information, such as business name, website URL, industry,
            location, services, audience, tone of voice, offers, brand colours, and logo URL.
          </li>
          <li>
            Uploaded media, including photos, videos, flyers, offer graphics, menus, product
            images, event clips, or other files you add to create posts.
          </li>
          <li>
            Generated content, including captions, hashtags, CTAs, image ideas, campaign
            plans, scheduled post times, post status, and publishing history.
          </li>
          <li>
            Social publishing connection details, such as connected Meta, Facebook Page, or
            Instagram Business account references needed to publish posts.
          </li>
          <li>Support requests, feedback, reviews, and messages you send to us.</li>
          <li>
            Billing-related information, such as plan status and payment or subscription
            references once billing is connected.
          </li>
          <li>
            Basic usage information, such as upload usage, media rescans, saved weekly sets,
            publishing activity, and product activity needed to operate the service.
          </li>
        </ul>

        <h2>3. How we use your information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Create and manage your FromOne account.</li>
          <li>Generate weekly social media posts from your Business Profile and uploaded media.</li>
          <li>Save weekly sets, posts, uploaded media, scheduled times, and publishing progress.</li>
          <li>Publish or schedule Facebook and Instagram posts when you connect those accounts.</li>
          <li>Provide support and respond to feedback or bug reports.</li>
          <li>Manage access, trials, subscriptions, and billing status.</li>
          <li>Improve FromOne and keep the service secure.</li>
        </ul>

        <h2>4. Website scans and uploaded media</h2>
        <p>
          If you enter a website URL, FromOne may scan publicly available content from that
          website to understand the business, services, audience, tone, offers, and brand
          details. This helps create more relevant social media content.
        </p>
        <p>
          If you upload photos, videos, flyers, or other files, FromOne may use that media to
          create, rewrite, improve, schedule, or publish social media posts for the connected
          business.
        </p>

        <h2>5. Social account connections</h2>
        <p>
          If you connect Meta, Facebook, or Instagram, FromOne stores the connection details
          needed to publish posts on your behalf. These details are used only to provide the
          publishing features you choose to use.
        </p>

        <h2>6. Legal basis for processing</h2>
        <p>
          We process personal data where it is necessary to provide the service, manage your
          account, respond to support requests, comply with legal obligations, or where we have
          a legitimate interest in improving and securing FromOne.
        </p>

        <h2>7. Who we share data with</h2>
        <p>
          We only share data with service providers needed to operate FromOne. This may include:
        </p>
        <ul>
          <li>Supabase, for authentication, database storage, and file storage.</li>
          <li>AI/content generation providers used to create, improve, or rewrite posts.</li>
          <li>Meta, Facebook, and Instagram when you connect accounts and publish posts.</li>
          <li>Payment providers once subscription billing is connected.</li>
          <li>Hosting, analytics, security, or support tools if added to the service.</li>
        </ul>
        <p>We do not sell your personal data.</p>

        <h2>8. How long we keep data</h2>
        <p>
          We keep account, business profile, campaign, uploaded media, and post data while your
          account is active or while it is needed to provide the service. Support requests and
          billing records may be kept for longer where needed for business, legal, tax, or
          security reasons.
        </p>

        <h2>9. Your rights</h2>
        <p>
          Depending on your location and applicable law, you may have rights to access,
          correct, delete, restrict, object to, or request a copy of your personal data.
        </p>
        <p>
          To make a request, contact{' '}
          <a href="mailto:info@fromone.co.uk">info@fromone.co.uk</a>.
        </p>

        <h2>10. Security</h2>
        <p>
          We take reasonable steps to protect your data, including using trusted service
          providers, authentication, access controls, and secure storage. No online service can
          guarantee complete security.
        </p>

        <h2>11. International transfers</h2>
        <p>
          Some service providers may process data outside the UK or European Economic Area. If
          this happens, we rely on appropriate safeguards provided by those service providers.
        </p>

        <h2>12. Children</h2>
        <p>
          FromOne is not intended for children. You should not use FromOne if you are under 18.
        </p>

        <h2>13. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy as FromOne changes. The latest version will always
          be available on this page.
        </p>

        <div className="legal-link-row">
          <Link href="/cookies">Cookie Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
