'use client'
import api from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft, Bell,
  Check,
  CheckCircle,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all')

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  // ── Notifications — polls every 10s, always fresh ──
  const { data: notifData, isLoading: notifLoading, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications')
      return res.data.data
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  // ── Pending requests — polls every 8s, always fresh ──
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: async () => {
      const res = await api.get('/connections/pending')
      return res.data.data
    },
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/notifications/${id}/read`)
      return res.data
    },
    onSuccess: () => {
      refetchNotifs()
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/notifications/all/read')
      return res.data
    },
    onSuccess: () => {
      toast.success('All marked as read')
      refetchNotifs()
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const deleteNotif = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notifications/${id}`)
      return res.data
    },
    onSuccess: () => refetchNotifs(),
  })

  const acceptRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await api.post(`/connections/accept/${connectionId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Friend request accepted! 🎉')
      refetchPending()
      refetchNotifs()
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
    onError: () => toast.error('Failed to accept request'),
  })

  const rejectRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await api.delete(`/connections/${connectionId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Request declined')
      refetchPending()
      refetchNotifs()
    },
    onError: () => toast.error('Failed to decline request'),
  })

  const notifications = notifData?.notifications || []
  const unreadCount = notifData?.unreadCount || 0

  // ── Handle any shape backend might return ──
  // Backend might return: { requests: [] } or { pending: [] } or just []
  const pendingRequests: any[] = Array.isArray(pendingData)
    ? pendingData
    : pendingData?.requests ?? pendingData?.pending ?? pendingData?.connections ?? []

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'connection': return <UserPlus size={15} style={{ color: '#3b82f6' }} />
      case 'group': return <Users size={15} style={{ color: '#22c55e' }} />
      case 'harsh': return <AlertTriangle size={15} style={{ color: '#ef4444' }} />
      case 'task': return <CheckCircle size={15} style={{ color: '#22c55e' }} />
      case 'test': return <Trophy size={15} style={{ color: '#fbbf24' }} />
      default: return <Zap size={15} style={{ color: '#a78bfa' }} />
    }
  }

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'connection': return { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' }
      case 'group': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' }
      case 'harsh': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' }
      case 'task': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' }
      case 'test': return { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' }
      default: return { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' }
    }
  }

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  // ── Request card (reused in both tabs) ──
  const RequestCard = ({ req }: { req: any }) => {
    // Support different field names backend might use
    const requestId = req.requestId ?? req.id ?? req.connectionId
    const sender = req.from ?? req.sender ?? req.user ?? {}
    const sentAt = req.sentAt ?? req.createdAt ?? req.requestedAt

    return (
      <div key={requestId} className="nt-req">
        <div
          className="nt-req-avatar"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push(`/profile/${sender?.username}`)}
        >
          {sender?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span
              style={{ fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              onClick={() => router.push(`/profile/${sender?.username}`)}
            >
              {sender?.username || 'Unknown'}
            </span>
            {sender?.tier && (
              <span style={{ fontSize: '10px', color: '#555', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '20px', fontFamily: 'JetBrains Mono, monospace' }}>
                {sender.tier}
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#555' }}>
            Wants to connect with you
            {sender?.targetTrack ? ` · ${sender.targetTrack}` : ''}
            {sender?.level ? ` · ${sender.level}` : ''}
          </p>
          {sentAt && (
            <p style={{ fontSize: '10px', color: '#2a2a2a', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
              {formatTime(sentAt)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            className="nt-btn nt-btn-accept"
            onClick={() => acceptRequest.mutate(requestId)}
            disabled={acceptRequest.isPending}
          >
            <Check size={13} />
            {acceptRequest.isPending ? '...' : 'Accept'}
          </button>
          <button
            className="nt-btn nt-btn-reject"
            onClick={() => rejectRequest.mutate(requestId)}
            disabled={rejectRequest.isPending}
          >
            <X size={13} />
            {rejectRequest.isPending ? '...' : 'Decline'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        body { background: #030303; color: #fff; font-family: 'Space Grotesk', sans-serif; }
        .nt-root { min-height: 100vh; background: #030303; }
        .nt-ambient { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 500px 300px at 60% 0%, rgba(59,130,246,0.05) 0%, transparent 60%); }
        .nt-content { position: relative; z-index: 1; max-width: 100%; padding: 36px 40px 80px; }
        .nt-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #555; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .nt-back:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .nt-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 24px; width: fit-content; }
        .nt-tab { display: flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; font-family: 'Space Grotesk', sans-serif; }
        .nt-notif { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; border-radius: 16px; margin-bottom: 8px; transition: all 0.2s; position: relative; animation: slideIn 0.3s ease; }
        .nt-notif:hover { transform: translateX(3px); }
        .nt-notif-icon { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nt-notif-title { font-size: 13px; font-weight: 600; color: #ddd; margin-bottom: 3px; line-height: 1.4; }
        .nt-notif-msg { font-size: 12px; color: #555; line-height: 1.5; }
        .nt-notif-time { font-size: 10px; color: #2a2a2a; font-family: 'JetBrains Mono', monospace; margin-top: 5px; }
        .nt-req { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 18px; margin-bottom: 10px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); transition: all 0.2s; }
        .nt-req:hover { background: rgba(255,255,255,0.04); }
        .nt-req-avatar { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; flex-shrink: 0; background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.25); }
        .nt-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif; }
        .nt-btn-accept { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .nt-btn-accept:hover:not(:disabled) { background: rgba(34,197,94,0.25); transform: scale(1.02); }
        .nt-btn-reject { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .nt-btn-reject:hover:not(:disabled) { background: rgba(239,68,68,0.18); transform: scale(1.02); }
        .nt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .nt-btn-delete { width: 28px; height: 28px; border-radius: 8px; background: transparent; border: 1px solid transparent; color: #333; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .nt-btn-delete:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); color: #f87171; }
        .nt-empty { text-align: center; padding: 80px 20px; }
        .nt-section-label { font-size: 10px; font-weight: 700; color: #2a2a2a; font-family: 'JetBrains Mono', monospace; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; margin-top: 4px; }
        @media (max-width: 768px) { .nt-content { padding: 24px 16px 80px; } }
        @media (max-width: 480px) {
          .nt-content { padding: 16px 12px 80px; }
          .nt-req { gap: 10px; padding: 14px; }
          .nt-req-avatar { width: 38px; height: 38px; font-size: 15px; }
          .nt-btn { padding: 7px 12px; font-size: 11px; }
        }
      `}</style>

      <div className="nt-root">
        <div className="nt-ambient" />
        <div
          className="nt-content"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
        >

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="nt-back" onClick={() => router.push('/dashboard')}>
                <ArrowLeft size={17} />
              </button>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: '10px', fontSize: '13px', background: '#ef4444', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontWeight: 700 }}>
                      {unreadCount}
                    </span>
                  )}
                </h1>
                <p style={{ fontSize: '11px', color: '#333', marginTop: '3px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Stay updated
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                style={{ fontSize: '12px', color: '#3b82f6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* TABS */}
          <div className="nt-tabs">
            {[
              { id: 'all', label: 'All Notifications', icon: <Bell size={14} /> },
              {
                id: 'requests',
                label: `Friend Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`,
                icon: <UserPlus size={14} />,
              },
            ].map(tab => (
              <button
                key={tab.id}
                className="nt-tab"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#444',
                  border: activeTab === tab.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                }}
              >
                <span style={{ color: activeTab === tab.id ? '#3b82f6' : '#444' }}>{tab.icon}</span>
                {tab.label}
                {/* Red badge on requests tab if there are pending */}
                {tab.id === 'requests' && pendingRequests.length > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: '20px', padding: '1px 6px', fontSize: '10px', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── FRIEND REQUESTS TAB ── */}
          {activeTab === 'requests' && (
            <div>
              {pendingLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <div style={{ position: 'relative', width: 32, height: 32 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="nt-empty">
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                  <p style={{ color: '#444', fontSize: '14px', marginBottom: '6px' }}>No pending requests</p>
                  <p style={{ color: '#2a2a2a', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>Friend requests will appear here</p>
                </div>
              ) : (
                <div>
                  <div className="nt-section-label">{pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}</div>
                  {pendingRequests.map((req: any) => <RequestCard key={req.requestId ?? req.id} req={req} />)}
                </div>
              )}
            </div>
          )}

          {/* ── ALL NOTIFICATIONS TAB ── */}
          {activeTab === 'all' && (
            <div>
              {/* Show pending requests at top of All tab too */}
              {pendingRequests.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="nt-section-label" style={{ color: '#3b82f6' }}>
                    🔔 {pendingRequests.length} Friend Request{pendingRequests.length !== 1 ? 's' : ''} Waiting
                  </div>
                  {pendingRequests.map((req: any) => <RequestCard key={req.requestId ?? req.id} req={req} />)}
                </div>
              )}

              {notifLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <div style={{ position: 'relative', width: 32, height: 32 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </div>
              ) : notifications.length === 0 && pendingRequests.length === 0 ? (
                <div className="nt-empty">
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                  <p style={{ color: '#444', fontSize: '14px', marginBottom: '6px' }}>No notifications yet</p>
                  <p style={{ color: '#2a2a2a', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>Activity will show up here</p>
                </div>
              ) : (
                <div>
                  {/* Unread */}
                  {notifications.filter((n: any) => !n.isRead).length > 0 && (
                    <>
                      <div className="nt-section-label">Unread</div>
                      {notifications.filter((n: any) => !n.isRead).map((notif: any) => {
                        const nc = getNotifColor(notif.type)
                        return (
                          <div
                            key={notif.id}
                            className="nt-notif"
                            style={{ background: nc.bg, border: `1px solid ${nc.border}`, cursor: 'pointer' }}
                            onClick={() => markRead.mutate(notif.id)}
                          >
                            <div className="nt-notif-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              {getNotifIcon(notif.type)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="nt-notif-title">{notif.title}</div>
                              <div className="nt-notif-msg">{notif.message}</div>
                              <div className="nt-notif-time">{formatTime(notif.createdAt)}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }} />
                              <button className="nt-btn-delete" onClick={e => { e.stopPropagation(); deleteNotif.mutate(notif.id) }}>
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {/* Read */}
                  {notifications.filter((n: any) => n.isRead).length > 0 && (
                    <>
                      <div className="nt-section-label" style={{ marginTop: '20px' }}>Earlier</div>
                      {notifications.filter((n: any) => n.isRead).map((notif: any) => (
                        <div
                          key={notif.id}
                          className="nt-notif"
                          style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <div className="nt-notif-icon" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {getNotifIcon(notif.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, opacity: 0.6 }}>
                            <div className="nt-notif-title">{notif.title}</div>
                            <div className="nt-notif-msg">{notif.message}</div>
                            <div className="nt-notif-time">{formatTime(notif.createdAt)}</div>
                          </div>
                          <button className="nt-btn-delete" onClick={() => deleteNotif.mutate(notif.id)}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}