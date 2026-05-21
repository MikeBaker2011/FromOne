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

const privacySections = [
  {
    title: '1. Who we are',
    content: [
      'FromOne is a social media content workflow platform for small businesses. It helps users create weekly social media posts from a Business Profile, uploaded media, website information, and user-provided business details.',
      'For privacy questions, contact us at info@fromone.co.uk.',
    ],
  },
  {
    title: '2. What information we collect',
    intro: 'We may collect and store the following information:',
    list: [
      'Account information, such as your email address and user ID.',
      'Business profile information, such as business name, website URL, industry, location, services, audience, tone of voice, offers, brand colours, and logo URL.',
      'Uploaded media, including photos, videos, flyers, offer graphics, menus, product images, event clips, or other files you add to create posts.',
      'Generated content, including captions, hashtags, CTAs, image ideas, campaign plans, scheduled post times, post status, and publishing history.',
      'Social publishing connection details, such as connected Meta, Facebook Page, or Instagram Business account references needed to publish posts.',
      'Support requests, feedback, reviews, and messages you send to us.',
      'Billing-related information, such as plan status and payment or subscription references once billing is connected.',
      'Basic usage information, such as upload usage, media rescans, saved weekly sets, publishing activity, and product activity needed to operate the service.',
    ],
  },
  {
    title: '3. How we use your information',
    intro: 'We use your information to:',
    list: [
      'Create and manage your FromOne account.',
      'Generate weekly social media posts from your Business Profile and uploaded media.',
      'Save weekly sets, posts, uploaded media, scheduled times, and publishing progress.',
      'Publish or schedule Facebook and Instagram posts when you connect those accounts.',
      'Provide support and respond to feedback or bug reports.',
      'Manage access, trials, subscriptions, and billing status.',
      'Improve FromOne and keep the service secure.',
    ],
  },
  {
    title: '4. Website scans and uploaded media',
    content: [
      'If you enter a website URL, FromOne may scan publicly available content from that website to understand the business, services, audience, tone, offers, and brand details. This helps create more relevant social media content.',
      'If you upload photos, videos, flyers, or other files, FromOne may use that media to create, rewrite, improve, schedule, or publish social media posts for the connected business.',
    ],
  },
  {
    title: '5. Social account connections',
    content: [
      'If you connect Meta, Facebook, or Instagram, FromOne stores the connection details needed to publish posts on your behalf. These details are used only to provide the publishing features you choose to use.',
    ],
  },
  {
    title: '6. Legal basis for processing',
    content: [
      'We process personal data where it is necessary to provide the service, manage your account, respond to support requests, comply with legal obligations, or where we have a legitimate interest in improving and securing FromOne.',
    ],
  },
  {
    title: '7. Who we share data with',
    intro: 'We only share data with service providers needed to operate FromOne. This may include:',
    list: [
      'Supabase, for authentication, database storage, and file storage.',
      'AI/content generation providers used to create, improve, or rewrite posts.',
      'Meta, Facebook, and Instagram when you connect accounts and publish posts.',
      'Payment providers once subscription billing is connected.',
      'Hosting, analytics, security, or support tools if added to the service.',
    ],
    outro: 'We do not sell your personal data.',
  },
  {
    title: '8. How long we keep data',
    content: [
      'We keep account, business profile, campaign, uploaded media, and post data while your account is active or while it is needed to provide the service. Support requests and billing records may be kept for longer where needed for business, legal, tax, or security reasons.',
    ],
  },
  {
    title: '9. Your rights',
    content: [
      'Depending on your location and applicable law, you may have rights to access, correct, delete, restrict, object to, or request a copy of your personal data.',
      'To make a request, contact info@fromone.co.uk.',
    ],
  },
  {
    title: '10. Security',
    content: [
      'We take reasonable steps to protect your data, including using trusted service providers, authentication, access controls, and secure storage. No online service can guarantee complete security.',
    ],
  },
  {
    title: '11. International transfers',
    content: [
      'Some service providers may process data outside the UK or European Economic Area. If this happens, we rely on appropriate safeguards provided by those service providers.',
    ],
  },
  {
    title: '12. Children',
    content: [
      'FromOne is not intended for children. You should not use FromOne if you are under 18.',
    ],
  },
  {
    title: '13. Changes to this policy',
    content: [
      'We may update this Privacy Policy as FromOne changes. The latest version will always be available on this page.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="sales-page product-updates-page">
      <PublicNav />

      <section
        className="page-header"
        style={{
          marginTop: 86,
          marginBottom: 54,
        }}
      >
        <div className="page-eyebrow">FromOne Privacy Policy</div>
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-description">
          This policy explains how FromOne collects, uses, stores, and protects personal data.
        </p>

        <div
          style={{
            display: 'inline-flex',
            marginTop: 20,
            padding: '8px 12px',
            borderRadius: 999,
            color: 'rgba(248,250,252,0.78)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          Last updated: 13 May 2026
        </div>
      </section>

      <section
        className="premium-card"
        style={{
          marginBottom: 34,
          borderRadius: 34,
          padding: 'clamp(24px, 3vw, 38px)',
        }}
      >
        <div className="page-eyebrow">Overview</div>
        <h2
          style={{
            margin: '0 0 14px',
            fontSize: 'clamp(2rem, 3.4vw, 3.3rem)',
            lineHeight: 1,
            letterSpacing: '-0.06em',
          }}
        >
          How we handle your data.
        </h2>
        <p style={{ maxWidth: 850, margin: 0, color: 'var(--muted-strong)', lineHeight: 1.7 }}>
          FromOne uses your account details, business profile, uploaded media and connected
          publishing information only to provide the app, create posts, save your weekly content,
          and publish to connected channels when you choose to use those features.
        </p>
      </section>

      <section
        className="premium-card"
        style={{
          marginBottom: 58,
          borderRadius: 34,
          padding: 'clamp(24px, 3vw, 38px)',
        }}
      >
        <div style={{ display: 'grid', gap: 18 }}>
          {privacySections.map((section) => (
            <article
              key={section.title}
              className="card"
              style={{
                padding: 22,
                borderRadius: 24,
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
              }}
            >
              <h2 style={{ margin: '0 0 10px', fontSize: 23, letterSpacing: '-0.035em' }}>
                {section.title}
              </h2>

              {'intro' in section && section.intro && (
                <p style={{ margin: '0 0 10px', color: 'var(--muted-strong)', lineHeight: 1.65 }}>
                  {section.intro}
                </p>
              )}

              {'content' in section &&
                section.content?.map((paragraph) => (
                  <p
                    key={paragraph}
                    style={{
                      margin: '0 0 10px',
                      color: 'var(--muted-strong)',
                      lineHeight: 1.65,
                    }}
                  >
                    {paragraph.includes('info@fromone.co.uk') ? (
                      <>
                        {paragraph.replace('info@fromone.co.uk', '')}
                        <a href="mailto:info@fromone.co.uk">info@fromone.co.uk</a>
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}

              {'list' in section && section.list && (
                <ul
                  style={{
                    margin: '10px 0',
                    paddingLeft: 22,
                    color: 'var(--muted-strong)',
                    lineHeight: 1.65,
                  }}
                >
                  {section.list.map((item) => (
                    <li key={item} style={{ marginBottom: 7 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {'outro' in section && section.outro && (
                <p style={{ margin: '10px 0 0', color: 'var(--muted-strong)', lineHeight: 1.65 }}>
                  {section.outro}
                </p>
              )}
            </article>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 24,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Link href="/cookies" className="sales-secondary-button">
            Cookie Policy
          </Link>
          <Link href="/terms" className="sales-secondary-button">
            Terms of Service
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
