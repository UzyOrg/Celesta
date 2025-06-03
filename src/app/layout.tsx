import type { Metadata } from 'next';
import { ThemeProvider } from '@/context/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduTech AI - Empowering Education Through Responsible AI',
  description: 'Transform education through responsible AI with 24/7 tutoring, verifiable skill badges, and immersive VR learning labs.',
};

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
      <body className="font-plus-jakarta-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}