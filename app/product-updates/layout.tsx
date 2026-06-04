import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Updates | FromOne',
  description:
    'Follow the latest FromOne improvements, fixes, and new features for small business social media content planning.',
  alternates: {
    canonical: '/product-updates',
  },
  openGraph: {
    title: 'Product Updates | FromOne',
    description:
      'See the latest FromOne improvements, fixes, and new features for small business content creation.',
    url: '/product-updates',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FromOne product updates',
      },
    ],
  },
};

export default function ProductUpdatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}