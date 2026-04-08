import '../globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import AIAssistantWidget from '../components/AIAssistant';

export const metadata = {
  title: 'FieldTrack — Field Training Management System',
  description: 'Manage student internships, training reports, and evaluations for universities and companies.',
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  border: '1px solid #334155',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
              }}
            />
            <AIAssistantWidget />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
