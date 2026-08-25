import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cairn',
  description: 'A household plan across seven domains, where the discipline is computed rather than remembered.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-ground text-ink antialiased">{children}</body>
    </html>
  );
}
