import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resolign | Find Like-minded Souls',
  description: 'A social media built for deep introverts to find deep thinkers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
