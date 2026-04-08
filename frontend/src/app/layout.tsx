import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: { default: 'AnimaVault', template: '%s | AnimaVault' },
  description: 'Premium anime streaming and download platform',
  keywords: ['anime', 'streaming', 'download', 'manga', 'episodes'],
  themeColor: '#7c3aed',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'AnimaVault',
    description: 'Premium anime streaming and download platform',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#0a0a0f] text-[#f1f1f8] antialiased" style={{ fontFamily: 'Inter, sans-serif' }}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1c1c2e',
                color: '#f1f1f8',
                border: '1px solid rgba(124,58,237,0.3)',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444',  secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
