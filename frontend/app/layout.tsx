import type { Metadata } from 'next';
import '@cloudscape-design/global-styles/index.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Route 53 Management Console',
  description: 'AWS Route 53 console clone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}