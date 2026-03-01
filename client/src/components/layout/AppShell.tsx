'use client'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

const AUTH_PATHS = ['/login', '/register']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = AUTH_PATHS.some(p => pathname.startsWith(p))

  if (isAuth) return <>{children}</>

  return (
    <>
      <style>{`
        /* Desktop: content offset right of 64px sidebar */
        @media (min-width: 768px) {
          .re-main {
            margin-left: 64px;
            padding-bottom: 0;
          }
        }
        /* Mobile: no left margin, pad bottom for bottom nav */
        @media (max-width: 767px) {
          .re-main {
            margin-left: 0;
            padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>

      <Navbar />

      <main
        className="re-main"
        style={{
          minHeight: '100vh',
          width: '100%',
          overflowX: 'hidden',
          background: '#030303',
        }}
      >
        {children}
      </main>
    </>
  )
}