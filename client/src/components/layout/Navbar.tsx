'use client'
import { useDMStore } from '@/components/DMToastProvider'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Bell, Bot, Home, MessageCircle, Trophy, User, Zap } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// ── Notification unread count (bell) ─────────────────────────────
function useNotifCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const fetch = () =>
      api.get('/notifications/unread-count')
        .then(r => setCount(r.data.data?.count ?? 0))
        .catch(() => {})
    fetch()
    const t = setInterval(fetch, 15000)
    return () => clearInterval(t)
  }, [])
  return count
}

// ── Red badge pill ────────────────────────────────────────────────
function Badge({ count }: { count: number }) {
  if (!count) return null
  return (
    <div style={{
      position: 'absolute', top: -3, right: -3,
      minWidth: 15, height: 15, borderRadius: 99,
      background: '#ef4444', border: '2px solid #030303',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 800, color: '#fff', padding: '0 3px',
      lineHeight: 1, zIndex: 2, pointerEvents: 'none',
    }}>
      {count > 99 ? '99' : count}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname    = usePathname()
  const { user }    = useAuthStore()
  const { totalUnread: dmUnread } = useDMStore()   // ✅ live DM badge
  const notifUnread = useNotifCount()

  const navItems = [
    { href: '/dashboard',     icon: Home,          label: 'Home',   badge: 0           },
    { href: '/tasks',         icon: Zap,           label: 'Tasks',  badge: 0           },
    { href: '/leaderboard',   icon: Trophy,        label: 'Ranks',  badge: 0           },
    { href: '/ai-chat',       icon: Bot,           label: 'AI',     badge: 0           },
    { href: '/messages',      icon: MessageCircle, label: 'DMs',    badge: dmUnread    },
    { href: '/notifications', icon: Bell,          label: 'Alerts', badge: notifUnread },
    {
      href: user?.username ? `/profile/${user.username}` : '/profile',
      icon: User, label: 'Me', badge: 0,
    },
  ]

  // ── Desktop sidebar ───────────────────────────────────────────
  const desktop = (
    <nav style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 64,
      background: '#030303', borderRight: '1px solid rgba(255,255,255,.05)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 16, paddingBottom: 16, zIndex: 100, gap: 4,
    }}>
      {/* Logo */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, marginBottom: 12,
        background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 900, color: '#fff',
      }}>R</div>

      {navItems.map(({ href, icon: Icon, label, badge }) => {
        const active = !!pathname?.startsWith(href)
        return (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div
              title={label}
              style={{
                position: 'relative', width: 44, height: 44, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(59,130,246,.15)' : 'transparent',
                border:     active ? '1px solid rgba(59,130,246,.3)' : '1px solid transparent',
                cursor: 'pointer', transition: 'all .18s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={20} color={active ? '#3b82f6' : '#484848'} strokeWidth={active ? 2.2 : 1.8} />
              <Badge count={badge} />
            </div>
          </Link>
        )
      })}
    </nav>
  )

  // ── Mobile bottom bar ─────────────────────────────────────────
  const mobile = (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 56,
      background: '#030303', borderTop: '1px solid rgba(255,255,255,.05)',
      display: 'flex', alignItems: 'center', zIndex: 100,
    }}>
      {navItems.map(({ href, icon: Icon, label, badge }) => {
        const active = !!pathname?.startsWith(href)
        return (
          <Link key={href} href={href} style={{ textDecoration: 'none', flex: 1, maxWidth: `${100 / 7}%` }}>
            <div style={{
              position: 'relative', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', height: 44, cursor: 'pointer',
            }}>
              <div style={{ position: 'relative' }}>
                <Icon size={20} color={active ? '#3b82f6' : '#484848'} strokeWidth={active ? 2.2 : 1.8} />
                <Badge count={badge} />
              </div>
              {active && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#3b82f6', position: 'absolute', bottom: 2,
                }} />
              )}
            </div>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <style>{`
        @media(max-width:768px){.re-desktop{display:none!important}}
        @media(min-width:769px){.re-mobile{display:none!important}}
      `}</style>
      <div className="re-desktop">{desktop}</div>
      <div className="re-mobile">{mobile}</div>
    </>
  )
}