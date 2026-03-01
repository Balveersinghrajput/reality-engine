'use client'
import { useDMStore } from '@/components/DMToastProvider'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, MessageCircle, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

function fmtTime(d?: string) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  if (hrs  < 24) return `${hrs}h`
  if (days < 7)  return `${days}d`
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const GRADIENTS = [
  'linear-gradient(135deg,#1d4ed8,#6d28d9)',
  'linear-gradient(135deg,#0891b2,#0e7490)',
  'linear-gradient(135deg,#059669,#047857)',
  'linear-gradient(135deg,#d97706,#b45309)',
  'linear-gradient(135deg,#dc2626,#b91c1c)',
  'linear-gradient(135deg,#7c3aed,#6d28d9)',
  'linear-gradient(135deg,#db2777,#be185d)',
]
function avatarGradient(name: string) {
  return GRADIENTS[(name?.charCodeAt(0) ?? 0) % GRADIENTS.length]
}

export default function MessagesPage() {
  const router      = useRouter()
  const qc          = useQueryClient()
  const { accessToken } = useAuthStore()
  const { markSeen } = useDMStore()   // ✅ clears navbar badge when conversation opened

  const [search,      setSearch]      = useState('')
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const socketRef = useRef<Socket | null>(null)

  // ── Fetch conversations ──────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const r = await api.get('/chat/conversations')
      return r.data.data as any[]
    },
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  // ── Socket: real-time conversation list updates ──────────────
  useEffect(() => {
    if (!accessToken) return
    const sock = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      { auth: { token: accessToken }, transports: ['websocket'] }
    )
    socketRef.current = sock

    sock.on('conversation_updated', (update: any) => {
      qc.setQueryData(['conversations'], (old: any[]) => {
        if (!old) return old
        const updated = old.map((c: any) =>
          c.conversationId === update.conversationId
            ? { ...c, lastMessage: update.lastMessage, lastMessageAt: update.lastMessageAt, unreadCount: (c.unreadCount || 0) + 1 }
            : c
        )
        return [...updated].sort((a, b) =>
          new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
        )
      })
    })

    // Online status
    sock.on('user_online',  ({ userId }: any) => setOnlineUsers(p => new Set([...p, userId])))
    sock.on('user_offline', ({ userId }: any) => setOnlineUsers(p => { const n = new Set(p); n.delete(userId); return n }))

    return () => { sock.disconnect() }
  }, [accessToken, qc])

  const conversations = (data ?? [])
    .filter((c: any) => c.other?.username?.toLowerCase().includes(search.toLowerCase()))

  const totalUnread = conversations.reduce((s: number, c: any) => s + (c.unreadCount ?? 0), 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#000;font-family:'Inter',sans-serif}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .conv-row{transition:background .15s}
        .conv-row:hover{background:rgba(255,255,255,.04)!important}
        .conv-row:active{background:rgba(255,255,255,.07)!important}
        .search-inp:focus{outline:none}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '20px 20px 0', background: '#030303', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 10 }}>
                Messages
                {totalUnread > 0 && (
                  <span style={{
                    fontSize: 12, background: '#3b82f6', color: '#fff',
                    borderRadius: 20, padding: '2px 9px', fontWeight: 700,
                  }}>{totalUnread}</span>
                )}
              </h1>
              <p style={{ color: '#2a2a2a', fontSize: 11, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>
                Direct messages
              </p>
            </div>
            <button
              onClick={() => router.push('/leaderboard')}
              title="Start a new chat"
              style={{
                width: 38, height: 38, borderRadius: 12, cursor: 'pointer',
                background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)',
                color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><Edit size={16} /></button>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#0f0f0f', border: '1px solid #1a1a1a',
            borderRadius: 14, padding: '10px 14px', marginBottom: 8,
          }}>
            <Search size={14} color="#333" />
            <input
              className="search-inp"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, flex: 1 }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
            )}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,.04)', marginBottom: 4 }} />
        </div>

        {/* ── LIST ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
              <div style={{ width: 26, height: 26, border: '2px solid #1a1a1a', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <MessageCircle size={32} color="#3b82f6" style={{ opacity: .5 }} />
              </div>
              <p style={{ color: '#444', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                {search ? 'No results found' : 'No messages yet'}
              </p>
              <p style={{ color: '#2a2a2a', fontSize: 12 }}>
                {search ? 'Try a different name' : "Visit a user's profile and tap Message to start chatting"}
              </p>
            </div>
          ) : (
            conversations.map((c: any) => {
              const hasUnread = (c.unreadCount ?? 0) > 0
              const isOnline  = onlineUsers.has(c.other?.id)
              const initial   = c.other?.username?.[0]?.toUpperCase() ?? '?'
              const grad      = avatarGradient(c.other?.username ?? '')

              return (
                <div
                  key={c.conversationId}
                  className="conv-row"
                  onClick={() => {
                    // ✅ Clear unread optimistically in local query cache
                    qc.setQueryData(['conversations'], (old: any[]) =>
                      old?.map((x: any) =>
                        x.conversationId === c.conversationId ? { ...x, unreadCount: 0 } : x
                      )
                    )
                    // ✅ Clear navbar DM badge via context
                    markSeen(c.conversationId)
                    router.push(`/chat/${c.other?.id}`)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 20px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,.03)',
                    background: hasUnread ? 'rgba(59,130,246,.03)' : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%', background: grad,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 900, color: '#fff',
                      border: hasUnread ? '2px solid #3b82f6' : '2px solid transparent',
                      transition: 'border-color .2s',
                    }}>{initial}</div>
                    {isOnline && (
                      <div style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 12, height: 12, borderRadius: '50%',
                        background: '#22c55e', border: '2px solid #030303',
                      }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: hasUnread ? '#fff' : '#ccc', fontWeight: hasUnread ? 700 : 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        {c.other?.username}
                      </span>
                      <span style={{ color: hasUnread ? '#3b82f6' : '#2a2a2a', fontSize: 11, fontFamily: 'monospace', flexShrink: 0, fontWeight: hasUnread ? 700 : 400 }}>
                        {fmtTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ color: hasUnread ? '#888' : '#333', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, fontWeight: hasUnread ? 500 : 400 }}>
                        {c.lastMessage ?? 'Tap to start chatting'}
                      </p>
                      {/* ✅ Unread count badge */}
                      {hasUnread && (
                        <div style={{ minWidth: 18, height: 18, borderRadius: 99, background: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </div>
                      )}
                    </div>
                    {c.other?.tier && (
                      <span style={{ fontSize: 9, color: '#2a2a2a', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3, display: 'block' }}>
                        {c.other.tier}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Bottom count */}
        {!isLoading && conversations.length > 0 && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ color: '#1a1a1a', fontSize: 11, fontFamily: 'monospace' }}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </>
  )
}