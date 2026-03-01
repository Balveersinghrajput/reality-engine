import DMToastProvider from '@/components/DMToastProvider'
import Providers from '@/components/Providers'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Reality Engine',
  description: 'Competitive Tech Learning Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ background: '#000' }}>
      <body
        className={inter.className}
        style={{
          background: '#000000',
          color: '#ffffff',
          minHeight: '100vh',
        }}
      >
        <Providers>
          <DMToastProvider>
            {children}
          </DMToastProvider>
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0d0d0d',
              color: '#fff',
              border: '1px solid #1a1a1a',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}