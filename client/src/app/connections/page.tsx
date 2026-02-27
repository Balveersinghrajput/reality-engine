'use client'
import api from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft, Check, Search,
    UserCheck, UserMinus, UserPlus,
    X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type Tab = 'connections' | 'pending' | 'search'

export default function ConnectionsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('connections')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
  }, [])

  const { data: connectionsData, isLoading: loadingConnections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await api.get('/connections')
      return res.data.data
    },
    enabled: tab === 'connections',
  })

  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: async () => {
      const res = await api.get('/connections/pending')
      return res.data.data
    },
    enabled: tab === 'pending',
  })

  const sendRequest = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/connections/request/${userId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Connection request sent!')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      // Update search results status
      setSearchResults(prev => prev.map(u =>
        u.id === sendRequest.variables ? { ...u, connectionStatus: 'pending_sent' } : u
      ))
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send request'),
  })

  const acceptRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await api.post(`/connections/accept/${connectionId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Connection accepted! 🎉')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
    },
    onError: () => toast.error('Failed to accept request'),
  })

  const removeConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await api.delete(`/connections/${connectionId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Connection removed')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: () => toast.error('Failed to remove connection'),
  })

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await api.get(`/user/search?query=${encodeURIComponent(searchQuery)}`)
      setSearchResults(res.data.data?.users || [])
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const tierColors: Record<string, string> = {
    developing: '#6b7280', rising: '#22c55e',
    competitive: '#3b82f6', elite: '#a78bfa', legendary: '#fbbf24',
  }

  const connections = connectionsData?.connections || []
  const pendingRequests = pendingData?.requests || []

  const tabs = [
    { id: 'connections' as Tab, label: 'Connections', icon: <UserCheck size={14} />, count: connections.length },
    { id: 'pending' as Tab, label: 'Requests', icon: <UserPlus size={14} />, count: pendingRequests.length },
    { id: 'search' as Tab, label: 'Find Users', icon: <Search size={14} />, count: null },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

        body { background: #030303; color: #fff; font-family: 'Space Grotesk', sans-serif; -webkit-font-smoothing: antialiased; }

        .cn-root { min-height: 100vh; background: #030303; }
        .cn-ambient { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 500px 400px at 70% 10%, rgba(59,130,246,0.05) 0%, transparent 70%); }
        .cn-content { position: relative; z-index: 1; max-width: 100%; margin: 0; padding: 36px 40px 80px; }

        .cn-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .cn-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #555; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .cn-back:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .cn-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 16px; margin-bottom: 28px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
        .cn-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; font-family: 'Space Grotesk', sans-serif; }

        .cn-search-box { display: flex; gap: 10px; margin-bottom: 24px; }
        .cn-search-input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 16px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; font-family: 'Space Grotesk', sans-serif; }
        .cn-search-input:focus { border-color: rgba(59,130,246,0.4); }
        .cn-search-btn { padding: 12px 20px; background: #3b82f6; color: #fff; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif; }
        .cn-search-btn:hover { background: #2563eb; }

        .cn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

        .cn-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 18px; padding: 20px; transition: all 0.2s; position: relative; overflow: hidden; }
        .cn-card:hover { background: rgba(255,255,255,0.04); transform: translateY(-2px); }

        .cn-card-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
        .cn-avatar { width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; flex-shrink: 0; cursor: pointer; transition: transform 0.2s; }
        .cn-avatar:hover { transform: scale(1.05); }
        .cn-name { font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px; cursor: pointer; }
        .cn-name:hover { color: #3b82f6; }
        .cn-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .cn-tag { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: rgba(255,255,255,0.06); color: #555; text-transform: capitalize; }

        .cn-stats { display: flex; gap: 16px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 14px; }
        .cn-stat { text-align: center; flex: 1; }
        .cn-stat-val { font-size: 16px; font-weight: 900; color: #fff; }
        .cn-stat-lbl { font-size: 10px; color: #333; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; margin-top: 2px; }

        .cn-actions { display: flex; gap: 8px; }
        .cn-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif; }
        .cn-btn-primary { background: #3b82f6; color: #fff; }
        .cn-btn-primary:hover { background: #2563eb; }
        .cn-btn-success { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .cn-btn-success:hover { background: rgba(34,197,94,0.25); }
        .cn-btn-danger { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .cn-btn-danger:hover { background: rgba(239,68,68,0.2); }
        .cn-btn-ghost { background: rgba(255,255,255,0.04); color: #555; border: 1px solid rgba(255,255,255,0.08); }
        .cn-btn-ghost:hover { background: rgba(255,255,255,0.08); color: #aaa; }
        .cn-btn-sent { background: rgba(255,255,255,0.04); color: #333; border: 1px solid rgba(255,255,255,0.06); cursor: default; }

        .cn-empty { text-align: center; padding: 80px 20px; }

        .cn-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; border-radius: 99px; background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; padding: 0 5px; margin-left: 4px; }

        @media (max-width: 768px) {
          .cn-content { padding: 24px 16px 80px; }
          .cn-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .cn-content { padding: 16px 12px 80px; }
          .cn-tab span.cn-tab-text { display: none; }
        }
      `}</style>

      <div className="cn-root">
        <div className="cn-ambient" />
        <div
          className="cn-content"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
        >

          {/* HEADER */}
          <div className="cn-header">
            <button className="cn-back" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={17} />
            </button>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>Connections</h1>
              <p style={{ fontSize: '11px', color: '#333', marginTop: '3px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Your Network
              </p>
            </div>
          </div>

          {/* TABS */}
          <div className="cn-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className="cn-tab"
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: tab === t.id ? '#3b82f6' : '#444',
                  border: tab === t.id ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                }}
              >
                <span style={{ color: tab === t.id ? '#3b82f6' : '#444', display: 'flex' }}>{t.icon}</span>
                <span className="cn-tab-text">{t.label}</span>
                {t.count !== null && t.count > 0 && (
                  <span className="cn-badge">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* SEARCH TAB */}
          {tab === 'search' && (
            <>
              <div className="cn-search-box">
                <input
                  className="cn-search-input"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className="cn-search-btn" onClick={handleSearch} disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searching ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <div style={{ position: 'relative', width: 36, height: 36 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="cn-grid">
                  {searchResults.map((user: any) => {
                    const tc = tierColors[user.tier] || '#555'
                    const status = user.connectionStatus
                    return (
                      <div key={user.id} className="cn-card">
                        <div className="cn-card-top">
                          <div
                            className="cn-avatar"
                            style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                            onClick={() => router.push(`/users/${user.username}`)}
                          >
                            {user.username?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="cn-name" onClick={() => router.push(`/users/${user.username}`)}>
                              {user.username}
                            </div>
                            <div className="cn-tags">
                              <span className="cn-tag" style={{ color: tc, background: `${tc}15` }}>{user.tier}</span>
                              <span className="cn-tag">{user.targetTrack}</span>
                              <span className="cn-tag">{user.level}</span>
                            </div>
                          </div>
                        </div>

                        <div className="cn-stats">
                          <div className="cn-stat">
                            <div className="cn-stat-val">{user.masteryPercent || 0}%</div>
                            <div className="cn-stat-lbl">Mastery</div>
                          </div>
                          <div className="cn-stat">
                            <div className="cn-stat-val">{user.realityScore || 0}</div>
                            <div className="cn-stat-lbl">Score</div>
                          </div>
                          <div className="cn-stat">
                            <div className="cn-stat-val">{user.streakCurrent || 0}d</div>
                            <div className="cn-stat-lbl">Streak</div>
                          </div>
                        </div>

                        <div className="cn-actions">
                          <button
                            className="cn-btn"
                            style={{
                              ...(status === 'accepted' ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }
                                : status === 'pending_sent' ? { background: 'rgba(255,255,255,0.04)', color: '#333', border: '1px solid rgba(255,255,255,0.06)', cursor: 'default' }
                                : { background: '#3b82f6', color: '#fff' })
                            }}
                            onClick={() => {
                              if (!status || status === 'none') sendRequest.mutate(user.id)
                            }}
                            disabled={status === 'accepted' || status === 'pending_sent'}
                          >
                            {status === 'accepted' ? <><UserCheck size={12} /> Connected</>
                              : status === 'pending_sent' ? <><UserPlus size={12} /> Requested</>
                              : <><UserPlus size={12} /> Connect</>}
                          </button>
                          <button
                            className="cn-btn cn-btn-ghost"
                            onClick={() => router.push(`/users/${user.username}`)}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : searchQuery && !searching ? (
                <div className="cn-empty">
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                  <p style={{ fontSize: '14px', color: '#444' }}>No users found</p>
                  <p style={{ fontSize: '12px', color: '#2a2a2a', marginTop: '6px' }}>Try a different username</p>
                </div>
              ) : (
                <div className="cn-empty">
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                  <p style={{ fontSize: '14px', color: '#444' }}>Search for users</p>
                  <p style={{ fontSize: '12px', color: '#2a2a2a', marginTop: '6px' }}>Find and connect with other learners</p>
                </div>
              )}
            </>
          )}

          {/* PENDING REQUESTS TAB */}
          {tab === 'pending' && (
            <>
              {loadingPending ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <div style={{ position: 'relative', width: 36, height: 36 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="cn-empty">
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <p style={{ fontSize: '14px', color: '#444' }}>No pending requests</p>
                  <p style={{ fontSize: '12px', color: '#2a2a2a', marginTop: '6px' }}>You're all caught up!</p>
                </div>
              ) : (
                <div className="cn-grid">
                  {pendingRequests.map((req: any) => {
                    const user = req.sender || req.user || req
                    const tc = tierColors[user.tier] || '#555'
                    return (
                      <div key={req.id} className="cn-card">
                        <div className="cn-card-top">
                          <div
                            className="cn-avatar"
                            style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                            onClick={() => router.push(`/users/${user.username}`)}
                          >
                            {user.username?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="cn-name" onClick={() => router.push(`/users/${user.username}`)}>
                              {user.username}
                            </div>
                            <div className="cn-tags">
                              <span className="cn-tag" style={{ color: tc, background: `${tc}15` }}>{user.tier}</span>
                              <span className="cn-tag">{user.targetTrack}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#333', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                              Wants to connect with you
                            </div>
                          </div>
                        </div>

                        <div className="cn-actions">
                          <button
                            className="cn-btn cn-btn-success"
                            onClick={() => acceptRequest.mutate(req.id)}
                            disabled={acceptRequest.isPending}
                          >
                            <Check size={12} />
                            Accept
                          </button>
                          <button
                            className="cn-btn cn-btn-danger"
                            onClick={() => removeConnection.mutate(req.id)}
                          >
                            <X size={12} />
                            Decline
                          </button>
                          <button
                            className="cn-btn cn-btn-ghost"
                            onClick={() => router.push(`/users/${user.username}`)}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* CONNECTIONS TAB */}
          {tab === 'connections' && (
            <>
              {loadingConnections ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <div style={{ position: 'relative', width: 36, height: 36 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </div>
              ) : connections.length === 0 ? (
                <div className="cn-empty">
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤝</div>
                  <p style={{ fontSize: '14px', color: '#444' }}>No connections yet</p>
                  <p style={{ fontSize: '12px', color: '#2a2a2a', marginTop: '6px' }}>Find users to connect with</p>
                  <button
                    onClick={() => setTab('search')}
                    style={{ marginTop: '16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Find Users
                  </button>
                </div>
              ) : (
                <div className="cn-grid">
                  {connections.map((conn: any) => {
                    const user = conn.connectedUser || conn.user || conn
                    const tc = tierColors[user.tier] || '#555'
                    return (
                      <div key={conn.id} className="cn-card">
                        <div className="cn-card-top">
                          <div
                            className="cn-avatar"
                            style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                            onClick={() => router.push(`/users/${user.username}`)}
                          >
                            {user.username?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="cn-name" onClick={() => router.push(`/users/${user.username}`)}>
                              {user.username}
                            </div>
                            <div className="cn-tags">
                              <span className="cn-tag" style={{ color: tc, background: `${tc}15` }}>{user.tier}</span>
                              <span className="cn-tag">{user.targetTrack}</span>
                              <span className="cn-tag">{user.level}</span>
                            </div>
                          </div>
                        </div>

                        <div className="cn-stats">
                          <div className="cn-stat">
                            <div className="cn-stat-val">{user.masteryPercent || 0}%</div>
                            <div className="cn-stat-lbl">Mastery</div>
                          </div>
                          <div className="cn-stat">
                            <div className="cn-stat-val">{user.realityScore || 0}</div>
                            <div className="cn-stat-lbl">Score</div>
                          </div>
                          <div className="cn-stat">
                            <div className="cn-stat-val">{user.streakCurrent || 0}d</div>
                            <div className="cn-stat-lbl">Streak</div>
                          </div>
                        </div>

                        <div className="cn-actions">
                          <button
                            className="cn-btn cn-btn-primary"
                            onClick={() => router.push(`/users/${user.username}`)}
                          >
                            View Profile
                          </button>
                          <button
                            className="cn-btn cn-btn-danger"
                            onClick={() => removeConnection.mutate(conn.id)}
                          >
                            <UserMinus size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}