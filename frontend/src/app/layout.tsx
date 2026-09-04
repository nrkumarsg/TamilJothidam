import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'தமிழ் ஜாதகம் | Tamil Jathakam',
  description: 'Tamil Vedic Astrology / Jathakam AI platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ta">
      <body>{children}</body>
    </html>
  );
}
