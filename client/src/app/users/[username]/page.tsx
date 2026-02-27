'use client'
import api from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Brain, CheckCircle,
  Flame, Globe, Trophy, UserCheck,
  UserMinus, UserPlus, Users, Zap
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const username = params.username as string
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
  }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const res = await api.get(`/user/${username}/public`)
      return res.data.data
    },
    enabled: !!username,
  })

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['connection-status', username],
    queryFn: async () => {
      const userId = data?.user?.id || data?.id
      if (!userId) return null
      const res = await api.get(`/connections/status/${userId}`)
      return res.data.data
    },
    enabled: !!data,
  })

  // Send friend request
  const sendRequest = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/connections/request/${userId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Friend request sent!')
      refetchStatus()
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to send request'
      toast.error(msg)
      refetchStatus()
    },
  })

  // ✅ Accept incoming request
  const acceptRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await api.post(`/connections/accept/${connectionId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Connected! 🎉')
      refetchStatus()
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
    onError: () => toast.error('Failed to accept request'),
  })

  // Remove or decline connection
  const removeConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await api.delete(`/connections/${connectionId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Connection removed')
      refetchStatus()
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: () => toast.error('Failed to remove connection'),
  })

  const tierColors: Record<string, string> = {
    developing: '#6b7280', rising: '#22c55e',
    competitive: '#3b82f6', elite: '#a78bfa', legendary: '#fbbf24',
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ position: 'relative', width: 36, height: 36 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>👤</div>
        <p style={{ color: '#444', fontSize: '16px' }}>User not found</p>
        <button onClick={() => router.back()} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
          Go Back
        </button>
      </div>
    )
  }

  const user = data.user || data
  const tc = tierColors[user.tier] || '#555'
  const connStatus = statusData?.status
  const connectionId = statusData?.connectionId

  const renderConnectionButton = () => {
    // Already connected
    if (connStatus === 'accepted') {
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '10px', borderRadius: '12px',
            background: 'rgba(34,197,94,0.12)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.25)',
            fontSize: '13px', fontWeight: 700, cursor: 'default',
          }}>
            <UserCheck size={14} /> Connected
          </button>
          <button
            onClick={() => connectionId && removeConnection.mutate(connectionId)}
            disabled={removeConnection.isPending}
            style={{
              padding: '10px 14px', borderRadius: '12px',
              background: 'rgba(239,68,68,0.1)', color: '#f87171',
              border: '1px solid rgba(239,68,68,0.2)',
              cursor: removeConnection.isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: removeConnection.isPending ? 0.6 : 1,
            }}
          >
            <UserMinus size={14} />
          </button>
        </div>
      )
    }

    // Current user sent request — waiting for other user
    if (connStatus === 'pending_sent') {
      return (
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', padding: '10px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.04)', color: '#444',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '13px', fontWeight: 700, cursor: 'not-allowed',
        }}>
          <UserPlus size={14} /> Request Sent
        </button>
      )
    }

    // Other user sent request to current user — show Accept + Decline
    if (connStatus === 'pending_received') {
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* ✅ Accept uses acceptRequest mutation, NOT removeConnection */}
          <button
            onClick={() => connectionId && acceptRequest.mutate(connectionId)}
            disabled={acceptRequest.isPending}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', padding: '10px', borderRadius: '12px',
              background: acceptRequest.isPending ? 'rgba(59,130,246,0.4)' : '#3b82f6',
              color: '#fff', border: 'none',
              fontSize: '13px', fontWeight: 700,
              cursor: acceptRequest.isPending ? 'not-allowed' : 'pointer',
              opacity: acceptRequest.isPending ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            <UserCheck size={14} />
            {acceptRequest.isPending ? 'Accepting...' : 'Accept Request'}
          </button>
          {/* Decline uses removeConnection */}
          <button
            onClick={() => connectionId && removeConnection.mutate(connectionId)}
            disabled={removeConnection.isPending}
            style={{
              padding: '10px 14px', borderRadius: '12px',
              background: 'rgba(239,68,68,0.1)', color: '#f87171',
              border: '1px solid rgba(239,68,68,0.2)',
              cursor: removeConnection.isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: removeConnection.isPending ? 0.6 : 1,
            }}
          >
            <UserMinus size={14} />
          </button>
        </div>
      )
    }

    // No connection — show Connect button
    return (
      <button
        onClick={() => !sendRequest.isPending && sendRequest.mutate(user.id)}
        disabled={sendRequest.isPending}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', padding: '10px', borderRadius: '12px',
          background: sendRequest.isPending ? 'rgba(59,130,246,0.5)' : '#3b82f6',
          color: '#fff', border: 'none',
          fontSize: '13px', fontWeight: 700,
          cursor: sendRequest.isPending ? 'not-allowed' : 'pointer',
          opacity: sendRequest.isPending ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
      >
        <UserPlus size={14} />
        {sendRequest.isPending ? 'Sending...' : 'Connect'}
      </button>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: #030303; color: #fff; font-family: 'Space Grotesk', sans-serif; -webkit-font-smoothing: antialiased; }

        .up-root { min-height: 100vh; background: #030303; }
        .up-content { max-width: 1100px; margin: 0 auto; padding: 36px 28px 80px; position: relative; z-index: 1; }
        .up-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .up-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #555; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .up-back:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .up-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
        .up-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 20px; padding: 24px; }

        .up-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .up-stat { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 16px; }
        .up-stat-val { font-size: 24px; font-weight: 900; line-height: 1; margin-bottom: 4px; }
        .up-stat-lbl { font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; }
        .up-progress { height: 2px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; margin-top: 8px; }
        .up-progress-fill { height: 100%; border-radius: 99px; transition: width 1s ease; }

        .up-rank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .up-rank { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 14px; text-align: center; }
        .up-rank-num { font-size: 26px; font-weight: 900; line-height: 1; }
        .up-rank-lbl { font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; margin-top: 4px; }

        .up-about-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .up-about-item { padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; }
        .up-about-lbl { font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px; }
        .up-about-val { font-size: 13px; font-weight: 700; text-transform: capitalize; }

        @media (max-width: 900px) {
          .up-content { padding: 24px 20px 80px; }
          .up-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .up-content { padding: 16px 14px 80px; }
          .up-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .up-about-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 400px) {
          .up-content { padding: 12px 10px 60px; }
          .up-about-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="up-root">
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 400px 300px at 70% 10%, ${tc}08 0%, transparent 70%)` }} />

        <div
          className="up-content"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
        >
          <div className="up-header">
            <button className="up-back" onClick={() => router.back()}>
              <ArrowLeft size={17} />
            </button>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>User Profile</h1>
              <p style={{ fontSize: '11px', color: '#333', marginTop: '2px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>@{username}</p>
            </div>
          </div>

          <div className="up-grid">
            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div className="up-card">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '20px',
                    background: `${tc}15`, border: `2px solid ${tc}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '30px', fontWeight: 900, color: tc,
                    boxShadow: `0 0 30px ${tc}20`, margin: '0 auto 14px',
                  }}>
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>{user.username}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30`, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                      {user.tier?.toUpperCase()}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#666', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', textTransform: 'capitalize' }}>
                      {user.targetTrack}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#666', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', textTransform: 'capitalize' }}>
                      {user.level}
                    </span>
                  </div>
                </div>
                {renderConnectionButton()}
              </div>

              <div className="up-card">
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trophy size={14} style={{ color: '#fbbf24' }} /> Rankings
                </h3>
                <div className="up-rank-grid">
                  {[
                    { icon: <Users size={12} />, label: 'Batch', rank: user.batchRank, color: '#22c55e' },
                    { icon: <Trophy size={12} />, label: 'Track', rank: user.trackRank, color: '#3b82f6' },
                    { icon: <Globe size={12} />, label: 'Platform', rank: user.platformRank, color: '#a78bfa' },
                  ].map((item, i) => (
                    <div key={i} className="up-rank">
                      <div style={{ color: item.color, display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{item.icon}</div>
                      <div className="up-rank-num" style={{ color: item.color }}>#{item.rank || '—'}</div>
                      <div className="up-rank-lbl">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div className="up-card">
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} style={{ color: '#3b82f6' }} /> Performance
                </h3>
                <div className="up-stat-grid">
                  {[
                    { icon: <Brain size={13} />, label: 'Mastery', value: `${user.masteryPercent || 0}%`, progress: user.masteryPercent || 0, color: '#fbbf24' },
                    { icon: <Zap size={13} />, label: 'Reality Score', value: user.realityScore || 0, progress: Math.min(user.realityScore || 0, 100), color: '#3b82f6' },
                    { icon: <Flame size={13} />, label: 'Streak', value: `${user.streakCurrent || 0}d`, progress: Math.min((user.streakCurrent || 0) * 3, 100), color: '#fb923c' },
                    { icon: <CheckCircle size={13} />, label: 'Longest Streak', value: `${user.streakLongest || 0}d`, progress: Math.min((user.streakLongest || 0) * 2, 100), color: '#22c55e' },
                  ].map((item, i) => (
                    <div key={i} className="up-stat">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ color: item.color }}>{item.icon}</span>
                        <span style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</span>
                      </div>
                      <div className="up-stat-val" style={{ color: '#fff' }}>{item.value}</div>
                      <div className="up-progress">
                        <div className="up-progress-fill" style={{ width: `${item.progress}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="up-card">
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>About</h3>
                <div className="up-about-grid">
                  {[
                    { label: 'Track', value: user.targetTrack, color: '#3b82f6' },
                    { label: 'Level', value: user.level, color: '#22c55e' },
                    { label: 'Mode', value: user.mode, color: user.mode === 'harsh' ? '#ef4444' : user.mode === 'competitive' ? '#3b82f6' : '#6b7280' },
                    { label: 'Tier', value: user.tier, color: tc },
                    { label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', color: '#888' },
                    { label: 'Batch', value: user.batchCode?.split('_').slice(-1)[0] || '—', color: '#a78bfa' },
                  ].map((item, i) => (
                    <div key={i} className="up-about-item">
                      <div className="up-about-lbl">{item.label}</div>
                      <div className="up-about-val" style={{ color: item.color }}>{item.value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}