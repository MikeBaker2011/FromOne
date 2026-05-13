import './globals.css';
import AppShell from './components/AppShell';
import CookieBanner from './components/CookieBanner';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.fromone.co.uk'),
  title: {
    default: 'FromOne | Weekly Social Media Content for Small Businesses',
    template: '%s | FromOne',
  },
  description:
    'FromOne helps small businesses create a full week of ready-to-publish social media posts from a website scan or simple business profile.',
  keywords: [
    'small business social media',
    'weekly social media posts',
    'social media content generator',
    'content planner for small businesses',
    'small business marketing tool',
    'Google Business posts',
    'Facebook post generator',
    'Instagram caption generator',
    'weekly content workflow',
  ],
  authors: [{ name: 'FromOne' }],
  creator: 'FromOne',
  publisher: 'FromOne',
  applicationName: 'FromOne',
  category: 'Marketing software',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FromOne | Weekly Social Media Content for Small Businesses',
    description:
      'Create a full week of ready-to-publish posts from one website scan or simple business profile.',
    url: '/',
    siteName: 'FromOne',
    type: 'website',
    locale: 'en_GB',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FromOne weekly content system for small businesses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FromOne | Weekly Social Media Content for Small Businesses',
    description:
      'Create a full week of ready-to-publish posts from one website scan or simple business profile.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#ffd43b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>
        <AppShell>{children}</AppShell>
        <CookieBanner />
      </body>
    </html>
  );
}