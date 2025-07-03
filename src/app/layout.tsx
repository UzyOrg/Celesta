'use client';

import type { Metadata } from 'next'; // Keep for now, might need adjustment with 'use client'
import { ThemeProvider } from '@/context/ThemeContext';
import './globals.css';
import { ModalProvider } from '@/context/ModalContext';

import { Toaster } from 'react-hot-toast';

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
  return (
    <html lang="en">
      <head>
        {/* Font imports are now handled in globals.css */}
      </head>
      <body className="font-plus-jakarta-sans bg-base text-white antialiased">
        <ModalProvider>
          <ThemeProvider>
            <div className="min-h-screen flex flex-col">
              <main className="flex-grow">
                {children}
              </main>
            </div>
          </ThemeProvider>

          <Toaster position="bottom-right" />
        </ModalProvider>
      </body>
    </html>
  );
}