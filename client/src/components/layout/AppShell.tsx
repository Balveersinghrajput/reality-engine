'use client'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

const AUTH_PAGES = ['/login', '/register']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PAGES.includes(pathname)

  if (isAuthPage) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#030303' }}>
      <Navbar />
      <main style={{
        flex: 1,
        minHeight: '100vh',
        width: '100%',
        marginLeft: '64px',
        overflowX: 'hidden',
      }}>
        {children}
      </main>
    </div>
  )
}