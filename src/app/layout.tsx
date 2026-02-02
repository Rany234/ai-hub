import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { MobileNav } from '../../components/MobileNav';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI-HUB',
  description: 'AI Service Marketplace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased pb-20 md:pb-0`}>
        {children}
        <MobileNav />
      </body>
    </html>
  );
}
