'use client';

import type { Metadata } from 'next'; // Keep for now, might need adjustment with 'use client'
import { ThemeProvider } from '@/context/ThemeContext';
import './globals.css';
import { ModalProvider } from '@/context/ModalContext';
import { AuthProvider } from '@/contexts/AuthContext';

import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { initTracking } from '@/lib/track';
import styles from './layout.module.css';

// Static metadata might be problematic with 'use client' at the root.
// If build errors occur, this might need to be removed or handled differently.
// export const metadata: Metadata = {
//   title: 'EduTech AI - Empowering Education Through Responsible AI',
//   description: 'Transform education through responsible AI with 24/7 tutoring, verifiable skill badges, and immersive VR learning labs.',
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initTracking();
    
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker for offline support
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // no-op
      });
    }
  }, []);
  return (
    <html lang="en">
      <head>
        {/* Font imports are now handled in globals.css */}
        <link rel="icon" href="/Logo_Celestea.png" />
      </head>{styles.layout}
      <body className="font-plus-jakarta-sans bg-base text-white antialiased">
        <AuthProvider>
          <ModalProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>

            <Toaster position="bottom-right" />
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}