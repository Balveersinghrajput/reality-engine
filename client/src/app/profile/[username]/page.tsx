'use client'
import api from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Brain,
    Calendar,
    CheckCircle,
    Flame,
    Globe,
    MessageSquare, Trophy,
    UserCheck,
    UserPlus,
    Users,
    UserX,
    Zap
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function PublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const username = params.username as string
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const res = await api.get(`/user/${username}/public`)
      return res.data.data
    },
  })

  const { data: connectionStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['connection-status', profileData?.id],
    queryFn: async () => {
      const res = await api.get(`/connections/status/${profileData?.id}`)
      return res.data.data
    },
    enabled: !!profileData?.id,
  })

  const sendRequest = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/connections/request/${profileData?.id}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Friend request sent!')
      refetchStatus()
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: () => toast.error('Failed to send request'),
  })

  const removeConnection = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/connections/${connectionStatus?.connectionId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Connection removed')
      refetchStatus()
    },
    onError: () => toast.error('Failed to remove connection'),
  })

  const tierConfig: Record<string, { color: string; glow: string }> = {
    developing:  { color: '#6b7280', glow: 'rgba(107,114,128,0.3)' },
    rising:      { color: '#22c55e', glow: 'rgba(34,197,94,0.3)' },
    competitive: { color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
    elite:       { color: '#a78bfa', glow: 'rgba(167,139,250,0.3)' },
    legendary:   { color: '#fbbf24', glow: 'rgba(251,191,36,0.3)' },
  }

  const profile = profileData
  const tier = tierConfig[profile?.tier] || tierConfig.developing
  const status = connectionStatus?.status

  const getConnectionBtn = () => {
    if (status === 'accepted') return {
      icon: <UserCheck size={14} />,
      label: 'Connected',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.3)',
      action: () => removeConnection.mutate(),
    }
    if (status === 'pending_sent') return {
      icon: <UserX size={14} />,
      label: 'Request Sent',
      color: '#f97316',
      bg: 'rgba(249,115,22,0.12)',
      border: 'rgba(249,115,22,0.3)',
      action: () => {},
    }
    if (status === 'pending_received') return {
      icon: <UserCheck size={14} />,
      label: 'Accept Request',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.3)',
      action: () => {},
    }
    return {
      icon: <UserPlus size={14} />,
      label: 'Add Friend',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.3)',
      action: () => sendRequest.mutate(),
    }
  }

  const connBtn = getConnectionBtn()

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
        <p style={{ color: '#444', fontSize: '15px' }}>User not found</p>
        <button onClick={() => router.back()} style={{ marginTop: '16px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>← Go back</button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: #030303; color: #fff; font-family: 'Space Grotesk', sans-serif; -webkit-font-smoothing: antialiased; }

        .pp-root { min-height: 100vh; background: #030303; }
        .pp-ambient { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 500px 400px at 50% 0%, ${tier.glow} 0%, transparent 60%); }
        .pp-content { position: relative; z-index: 1; max-width: 100%; padding: 36px 40px 80px; }

        .pp-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #555; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; margin-bottom: 28px; }
        .pp-back:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .pp-hero { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 32px; margin-bottom: 20px; position: relative; overflow: hidden; }
        .pp-hero-glow { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, ${tier.color}60, transparent); }

        .pp-avatar { width: 80px; height: 80px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 900; flex-shrink: 0; }

        .pp-action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif; }

        .pp-rank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .pp-rank-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 18px; padding: 20px; }

        .pp-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        .pp-stat { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 16px; padding: 18px; }

        .pp-progress { height: 2px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; margin-top: 10px; }
        .pp-progress-fill { height: 100%; border-radius: 99px; transition: width 1s ease; }

        @media (max-width: 768px) {
          .pp-content { padding: 24px 20px 80px; }
          .pp-rank-grid { grid-template-columns: repeat(3,1fr); gap: 10px; }
          .pp-stats-grid { grid-template-columns: repeat(2,1fr); }
          .pp-hero { padding: 22px; }
        }
        @media (max-width: 480px) {
          .pp-content { padding: 16px 14px 80px; }
          .pp-rank-grid { grid-template-columns: 1fr; }
          .pp-stats-grid { grid-template-columns: repeat(2,1fr); }
          .pp-avatar { width: 60px; height: 60px; font-size: 22px; }
        }
      `}</style>

      <div className="pp-root">
        <div className="pp-ambient" />
        <div
          className="pp-content"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
        >

          {/* BACK */}
          <button className="pp-back" onClick={() => router.back()}>
            <ArrowLeft size={17} />
          </button>

          {/* HERO */}
          <div className="pp-hero">
            <div className="pp-hero-glow" />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>

              {/* Avatar */}
              <div
                className="pp-avatar"
                style={{
                  background: `${tier.color}15`,
                  border: `2px solid ${tier.color}40`,
                  boxShadow: `0 0 32px ${tier.glow}`,
                  color: tier.color,
                }}
              >
                {profile.username?.[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  {profile.username}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ background: `${tier.color}18`, color: tier.color, border: `1px solid ${tier.color}30`, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px' }}>
                    {profile.tier?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '12px', color: '#555', textTransform: 'capitalize' }}>{profile.targetTrack}</span>
                  <span style={{ color: '#252525' }}>•</span>
                  <span style={{ fontSize: '12px', color: '#555', textTransform: 'capitalize' }}>{profile.level}</span>
                  <span style={{ color: '#252525' }}>•</span>
                  <span style={{ fontSize: '12px', color: '#555', textTransform: 'capitalize' }}>{profile.mode} mode</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2a2a2a', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', marginBottom: '20px' }}>
                  <Calendar size={11} />
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Add Friend / Connection Button */}
                  <button
                    className="pp-action-btn"
                    onClick={connBtn.action}
                    disabled={sendRequest.isPending || status === 'pending_sent'}
                    style={{
                      background: connBtn.bg,
                      color: connBtn.color,
                      border: `1px solid ${connBtn.border}`,
                      opacity: (sendRequest.isPending || status === 'pending_sent') ? 0.7 : 1,
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  >
                    {connBtn.icon}
                    {connBtn.label}
                  </button>

                  {/* Message Button - only if connected */}
                  {status === 'accepted' && (
                    <button
                      className="pp-action-btn"
                      onClick={() => router.push(`/messages/${profile.id}`)}
                      style={{
                        background: 'rgba(139,92,246,0.12)',
                        color: '#a78bfa',
                        border: '1px solid rgba(139,92,246,0.3)',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                    >
                      <MessageSquare size={14} />
                      Message
                    </button>
                  )}

                  {/* Compare Button */}
                  <button
                    className="pp-action-btn"
                    onClick={() => router.push(`/compare/${profile.id}`)}
                    style={{
                      background: 'rgba(251,191,36,0.08)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251,191,36,0.2)',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  >
                    <Zap size={14} />
                    Compare
                  </button>
                </div>
              </div>

              {/* Reality Score */}
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px 24px', flexShrink: 0 }}>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {profile.realityScore || 0}
                </div>
                <div style={{ fontSize: '10px', color: '#444', marginTop: '6px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Reality Score
                </div>
              </div>

            </div>
          </div>

          {/* RANK CARDS */}
          <div className="pp-rank-grid">
            {[
              { icon: <Users size={14} />, label: 'Batch Rank', rank: profile.batchRank, total: profile.batchTotal, color: '#22c55e' },
              { icon: <Trophy size={14} />, label: 'Track Rank', rank: profile.trackRank, total: profile.trackRankTotal, color: '#3b82f6' },
              { icon: <Globe size={14} />, label: 'Platform Rank', rank: profile.platformRank, total: profile.platformRankTotal, color: '#a78bfa' },
            ].map((item, i) => (
              <div key={i} className="pp-rank-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span style={{ fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>
                  #{item.rank || '—'}
                </div>
                <div style={{ fontSize: '12px', color: '#2a2a2a', marginTop: '4px' }}>/ {item.total || '?'}</div>
              </div>
            ))}
          </div>

          {/* STATS */}
          <div className="pp-stats-grid">
            {[
              { icon: <Brain size={13} />, label: 'Mastery', value: `${profile.masteryPercent || 0}%`, progress: profile.masteryPercent || 0, color: '#fbbf24' },
              { icon: <Flame size={13} />, label: 'Streak', value: `${profile.streakCurrent || 0}d`, sub: `Best: ${profile.streakLongest || 0}d`, color: '#fb923c' },
              { icon: <CheckCircle size={13} />, label: 'Tasks Done', value: profile._count?.tasks || 0, sub: 'completed', color: '#34d399' },
              { icon: <Zap size={13} />, label: 'Tests Taken', value: profile._count?.testResults || 0, sub: 'total tests', color: '#3b82f6' },
            ].map((item, i) => (
              <div key={i} className="pp-stat">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.5px', lineHeight: 1 }}>{item.value}</div>
                {(item as any).progress !== undefined && (
                  <div className="pp-progress">
                    <div className="pp-progress-fill" style={{ width: `${(item as any).progress}%`, background: item.color }} />
                  </div>
                )}
                {(item as any).sub && <div style={{ fontSize: '11px', color: '#2e2e2e', marginTop: '6px', fontFamily: 'JetBrains Mono, monospace' }}>{(item as any).sub}</div>}
              </div>
            ))}
          </div>

          {/* NOT CONNECTED WARNING */}
          {status !== 'accepted' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ color: '#333', fontSize: '13px', marginBottom: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                Connect with {profile.username} to see more details and start chatting
              </p>
              <button
                onClick={connBtn.action}
                disabled={status === 'pending_sent' || sendRequest.isPending}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={14} />
                  {status === 'pending_sent' ? 'Request Sent' : 'Add Friend'}
                </span>
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}