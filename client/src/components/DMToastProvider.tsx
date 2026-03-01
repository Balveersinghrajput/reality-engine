'use client'
import { useAuthStore } from '@/stores/authStore'
import { usePathname, useRouter } from 'next/navigation'
import {
    createContext, useCallback, useContext,
    useEffect, useRef, useState,
} from 'react'
import { io, Socket } from 'socket.io-client'

// ─────────────────────────────────────────────────────────────────
// Types & Context
// ─────────────────────────────────────────────────────────────────
interface DMToastItem {
  id: string
  conversationId: string
  senderUserId: string
  senderUsername: string
  message: string
}

interface DMContextValue {
  unreadCounts: Record<string, number>
  totalUnread: number
  markSeen: (conversationId: string) => void
}

const DMCtx = createContext<DMContextValue>({
  unreadCounts: {}, totalUnread: 0, markSeen: () => {},
})

export function useDMStore() {
  return useContext(DMCtx)
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#1d4ed8,#6d28d9)',
  'linear-gradient(135deg,#0891b2,#0e7490)',
  'linear-gradient(135deg,#059669,#047857)',
  'linear-gradient(135deg,#d97706,#b45309)',
  'linear-gradient(135deg,#dc2626,#b91c1c)',
  'linear-gradient(135deg,#7c3aed,#6d28d9)',
  'linear-gradient(135deg,#db2777,#be185d)',
]
function avatarGrad(name: string) {
  return GRADIENTS[(name?.charCodeAt(0) ?? 0) % GRADIENTS.length]
}

// ─────────────────────────────────────────────────────────────────
// Single Toast Card
// ─────────────────────────────────────────────────────────────────
function DMToast({ item, onClose, onClick }: {
  item: DMToastItem
  onClose: () => void
  onClick: () => void
}) {
  const [visible,  setVisible]  = useState(false)
  const [progress, setProgress] = useState(100)
  const DURATION = 4500

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))

    const start = Date.now()
    const tick = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100)
      setProgress(pct)
      if (pct === 0) clearInterval(tick)
    }, 30)

    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 380)
    }, DURATION)

    return () => { clearInterval(tick); clearTimeout(t) }
  }, [])

  function dismiss(e: React.MouseEvent) {
    e.stopPropagation()
    setVisible(false)
    setTimeout(onClose, 380)
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: 318,
        background: '#111318',
        border: '1px solid rgba(255,255,255,.11)',
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 16px 48px rgba(0,0,0,.85), 0 0 0 1px rgba(59,130,246,.08)',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(130%) scale(.94)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.38s cubic-bezier(.34,1.45,.64,1), opacity 0.38s ease',
        pointerEvents: 'all',
        userSelect: 'none',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,.05)' }}>
        <div style={{
          height: '100%', width: `${progress}%`, borderRadius: 2,
          background: 'linear-gradient(90deg,#3b82f6,#6366f1)',
          transition: 'width .03s linear',
        }} />
      </div>

      {/* Body */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px 10px' }}>
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          background: avatarGrad(item.senderUsername),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, fontWeight: 900, color: '#fff',
          border: '2px solid rgba(59,130,246,.35)',
          boxShadow: '0 2px 10px rgba(59,130,246,.18)',
        }}>
          {item.senderUsername[0]?.toUpperCase() ?? '?'}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13.5 }}>
              {item.senderUsername}
            </span>
            <span style={{
              fontSize: 9, color: '#3b82f6',
              background: 'rgba(59,130,246,.13)',
              border: '1px solid rgba(59,130,246,.22)',
              borderRadius: 20, padding: '2px 7px',
              fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
            }}>DM</span>
          </div>
          <p style={{
            color: '#9ca3af', fontSize: 12.5, lineHeight: 1.4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0,
          }}>
            {item.message.length > 55 ? item.message.slice(0, 55) + '…' : item.message}
          </p>
        </div>

        {/* Close btn */}
        <button
          onClick={dismiss}
          style={{
            background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 8, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#6b7280', flexShrink: 0, fontSize: 15, lineHeight: 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.13)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
        >×</button>
      </div>

      {/* Footer */}
      <div style={{ padding: '0 13px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: '#22c55e', boxShadow: '0 0 6px #22c55e77',
        }} />
        <span style={{ color: '#374151', fontSize: 10 }}>Tap to reply</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Provider — wrap your entire app with this
// ─────────────────────────────────────────────────────────────────
export default function DMToastProvider({ children }: { children: React.ReactNode }) {
  const { user: me, accessToken } = useAuthStore()
  const router   = useRouter()
  const pathname = usePathname()

  const [toasts,       setToasts]       = useState<DMToastItem[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const socketRef = useRef<Socket | null>(null)

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  const markSeen = useCallback((conversationId: string) => {
    setUnreadCounts(prev => { const n = { ...prev }; delete n[conversationId]; return n })
  }, [])

  function removeToast(id: string) {
    setToasts(p => p.filter(t => t.id !== id))
  }

  useEffect(() => {
    if (!accessToken || !me?.id) return

    const sock = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      { auth: { token: accessToken }, transports: ['websocket'] }
    )
    socketRef.current = sock

    sock.on('conversation_updated', (update: any) => {
      const senderId       = update.sender?.id ?? update.senderId
      const senderUsername = update.sender?.username ?? 'Someone'

      // Don't count/show our own messages
      if (senderId === me.id) return

      // Don't show toast if we're already in that chat
      const inThatChat = pathname?.startsWith('/chat/') && pathname?.includes(senderId ?? '')
      if (!inThatChat) {
        setUnreadCounts(prev => ({
          ...prev,
          [update.conversationId]: (prev[update.conversationId] ?? 0) + 1,
        }))
        const toast: DMToastItem = {
          id: `${Date.now()}-${Math.random()}`,
          conversationId: update.conversationId,
          senderUserId:   senderId ?? '',
          senderUsername,
          message: update.lastMessage ?? 'Sent you a message',
        }
        setToasts(p => [...p.slice(-2), toast]) // max 3 visible
      }
    })

    return () => { sock.disconnect(); socketRef.current = null }
  }, [accessToken, me?.id, pathname])

  return (
    <DMCtx.Provider value={{ unreadCounts, totalUnread, markSeen }}>
      {children}

      {/* Toast stack */}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
        fontFamily: "'Inter', sans-serif",
      }}>
        {toasts.map(t => (
          <DMToast
            key={t.id}
            item={t}
            onClose={() => removeToast(t.id)}
            onClick={() => {
              removeToast(t.id)
              markSeen(t.conversationId)
              router.push(`/chat/${t.senderUserId}`)
            }}
          />
        ))}
      </div>
    </DMCtx.Provider>
  )
}