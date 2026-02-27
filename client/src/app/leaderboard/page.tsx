'use client'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Globe, Minus, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Tab = 'batch' | 'track' | 'platform'

export default function LeaderboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('platform')
  const [mounted, setMounted] = useState(false)
  const [batchId, setBatchId] = useState<string>('')

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    api.get('/user/dashboard').then(res => {
      const id = res.data.data?.ranks?.batchId
      if (id) setBatchId(id)
    }).catch(() => {})
  }, [])

  const { data: platformData, isLoading: platformLoading } = useQuery({
    queryKey: ['leaderboard', 'platform'],
    queryFn: async () => { const res = await api.get('/leaderboard/platform'); return res.data.data },
    enabled: tab === 'platform',
  })
  const { data: trackData, isLoading: trackLoading } = useQuery({
    queryKey: ['leaderboard', 'track'],
    queryFn: async () => { const res = await api.get('/leaderboard/track/webdev'); return res.data.data },
    enabled: tab === 'track',
  })
  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ['leaderboard', 'batch', batchId],
    queryFn: async () => { const res = await api.get(`/leaderboard/batch/${batchId}`); return res.data.data },
    enabled: tab === 'batch' && !!batchId,
  })

  const tabs = [
    { id: 'platform' as Tab, label: 'Platform', icon: <Globe size={15} />, color: '#8b5cf6' },
    { id: 'track' as Tab, label: 'Track Global', icon: <Trophy size={15} />, color: '#3b82f6' },
    { id: 'batch' as Tab, label: 'My Batch', icon: <Users size={15} />, color: '#22c55e' },
  ]

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  const getMovementIcon = (movement: number) => {
    if (movement > 0) return <TrendingUp size={11} style={{ color: '#22c55e' }} />
    if (movement < 0) return <TrendingDown size={11} style={{ color: '#ef4444' }} />
    return <Minus size={11} style={{ color: '#333' }} />
  }

  const getCurrentData = () => {
    if (tab === 'platform') return { list: platformData?.leaderboard || [], current: platformData?.currentUser, insights: null }
    if (tab === 'track') return { list: trackData?.leaderboard || [], current: trackData?.currentUser, insights: null }
    if (tab === 'batch') return { list: batchData?.leaderboard || [], current: null, insights: batchData?.insights }
    return { list: [], current: null, insights: null }
  }

  const isLoading = (tab === 'platform' && platformLoading) ||
    (tab === 'track' && trackLoading) ||
    (tab === 'batch' && batchLoading)

  const { list, current, insights } = getCurrentData()

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

        .lb-page {
          min-height: 100vh;
          background: #000;
          display: flex;
          flex-direction: column;
        }

        .lb-inner {
          flex: 1;
          max-width: 100%;
          width: 100%;
          margin: 0;
          padding: 36px 40px 80px;
        }

        /* ── HEADER ── */
        .lb-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 36px;
        }

        .lb-back {
          width: 38px; height: 38px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #555;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .lb-back:hover { color: #fff; background: rgba(255,255,255,0.08); }

        /* ── TABS ── */
        .lb-tabs {
          display: flex;
          gap: 6px;
          padding: 5px;
          border-radius: 18px;
          margin-bottom: 28px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .lb-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 0;
          border-radius: 13px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        /* ── YOU CARD ── */
        .lb-you-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 16px;
          margin-bottom: 20px;
          background: rgba(59,130,246,0.06);
          border: 1px solid rgba(59,130,246,0.18);
        }

        /* ── INSIGHTS ── */
        .lb-insights {
          padding: 14px 18px;
          border-radius: 14px;
          margin-bottom: 20px;
          background: rgba(34,197,94,0.05);
          border: 1px solid rgba(34,197,94,0.15);
        }

        /* ── TABLE HEADER ── */
        .lb-thead {
          display: grid;
          grid-template-columns: 52px 1fr 100px 80px 70px;
          gap: 8px;
          padding: 0 16px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          margin-bottom: 8px;
        }

        /* ── ENTRY ── */
        .lb-entry {
          display: grid;
          grid-template-columns: 52px 1fr 100px 80px 70px;
          gap: 8px;
          align-items: center;
          padding: 13px 16px;
          border-radius: 14px;
          margin-bottom: 5px;
          cursor: default;
          transition: all 0.18s;
          border: 1px solid transparent;
        }

        .lb-entry:hover:not(.lb-you) {
          background: rgba(255,255,255,0.04) !important;
          transform: translateX(3px);
        }

        .lb-rank-cell {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lb-user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .lb-avatar {
          width: 38px; height: 38px;
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800;
          flex-shrink: 0;
        }

        .lb-score-cell { text-align: right; }
        .lb-mastery-cell {}
        .lb-streak-cell { text-align: center; }

        .lb-progress-bar {
          height: 3px;
          border-radius: 99px;
          background: rgba(255,255,255,0.06);
          overflow: hidden;
          margin-top: 4px;
        }

        .lb-progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.8s ease;
        }

        /* ── EMPTY / LOADING ── */
        .lb-center { display: flex; align-items: center; justify-content: center; padding: 80px 0; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .lb-inner { padding: 28px 20px 70px; }
        }

        @media (max-width: 700px) {
          .lb-inner { padding: 20px 14px 80px; }
          .lb-thead { display: none; }
          .lb-entry { grid-template-columns: 44px 1fr 80px; }
          .lb-entry > :nth-child(4),
          .lb-entry > :nth-child(5) { display: none; }
          .lb-tab span.lb-tab-text { display: none; }
        }

        @media (max-width: 480px) {
          .lb-inner { padding: 16px 10px 80px; }
          .lb-entry { grid-template-columns: 36px 1fr 70px; gap: 6px; padding: 11px 12px; }
          .lb-avatar { width: 32px; height: 32px; font-size: 12px; border-radius: 9px; }
        }
      `}</style>

      <div className="lb-page">

        {/* Ambient */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 60% 0%, rgba(139,92,246,0.05) 0%, transparent 55%)' }} />

        <div
          className="lb-inner"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(14px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >

          {/* ── HEADER ── */}
          <div className="lb-header">
            <button className="lb-back" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={17} />
            </button>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>Leaderboard</h1>
              <p style={{ fontSize: '11px', color: '#333', marginTop: '3px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Global Rankings · Updates every 6h
              </p>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="lb-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className="lb-tab"
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: tab === t.id ? '#fff' : '#444',
                  border: tab === t.id ? `1px solid ${t.color}25` : '1px solid transparent',
                }}
              >
                <span style={{ color: tab === t.id ? t.color : '#444', display: 'flex' }}>{t.icon}</span>
                <span className="lb-tab-text">{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── YOU CARD ── */}
          {current && (
            <div className="lb-you-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'rgba(59,130,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', fontWeight: 800, color: '#3b82f6',
                }}>
                  #{tab === 'platform' ? current.platformRank : current.trackRank}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>Your Position</p>
                  <p style={{ fontSize: '11px', color: '#555', margin: '3px 0 0' }}>
                    {tab === 'platform'
                      ? `#${current.platformRank} of ${current.platformRankTotal} users`
                      : `#${current.trackRank} of ${current.trackRankTotal} in this track`}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#3b82f6' }}>
                  {current.performanceScore?.toFixed(1)}
                </div>
                <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Performance
                </div>
              </div>
            </div>
          )}

          {/* ── INSIGHTS ── */}
          {insights && tab === 'batch' && (
            <div className="lb-insights">
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
                {insights.message}
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Your Rank', value: `#${insights.yourRank}`, color: '#22c55e' },
                  { label: 'Batch Size', value: insights.batchTotal, color: '#3b82f6' },
                  { label: 'Avg Score', value: `${insights.batchAvg}%`, color: '#8b5cf6' },
                  insights.gapToNext > 0 && { label: 'Gap to Next', value: `+${insights.gapToNext}%`, color: '#f97316' },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TABLE ── */}
          {isLoading ? (
            <div className="lb-center">
              <div style={{ position: 'relative', width: 36, height: 36 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.2)' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid transparent', borderTopColor: '#8b5cf6', animation: 'spin 0.8s linear infinite' }} />
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="lb-center" style={{ flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '48px' }}>🏆</div>
              <p style={{ fontSize: '14px', color: '#444' }}>No rankings yet</p>
              <p style={{ fontSize: '12px', color: '#2a2a2a' }}>
                {tab === 'batch' ? 'Batch rank updates in real-time' : 'Global ranks recalculate every 6 hours'}
              </p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="lb-thead">
                <div style={{ textAlign: 'center' }}>#</div>
                <div>Player</div>
                <div style={{ textAlign: 'right' }}>Score</div>
                <div>Mastery</div>
                <div style={{ textAlign: 'center' }}>Streak</div>
              </div>

              {/* Entries */}
              <div>
                {list.map((entry: any, i: number) => {
                  const rank = entry.rank || entry.platformRank || entry.trackRank || i + 1
                  const score = entry.performanceScore || 0
                  const movement = entry.movement || entry.weeklyMovement || 0
                  const isYou = entry.isCurrentUser
                  const emoji = getRankEmoji(rank)

                  return (
                    <div
                      key={entry.userId || i}
                      className={`lb-entry ${isYou ? 'lb-you' : ''}`}
                      onClick={() => !isYou && router.push(`/profile/${entry.username}`)}
                      style={{
                        background: isYou ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
                        border: isYou ? '1px solid rgba(59,130,246,0.18)' : '1px solid rgba(255,255,255,0.04)',
                        cursor: isYou ? 'default' : 'pointer',
                      }}
                    >
                      {/* Rank */}
                      <div className="lb-rank-cell">
                        {emoji
                          ? <span style={{ fontSize: '22px' }}>{emoji}</span>
                          : <span style={{ fontSize: '13px', fontWeight: 800, color: rank <= 10 ? '#555' : '#333' }}>#{rank}</span>
                        }
                      </div>

                      {/* User */}
                      <div className="lb-user-cell">
                        <div
                          className="lb-avatar"
                          style={{
                            background: isYou ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                            color: isYou ? '#3b82f6' : '#666',
                          }}
                        >
                          {entry.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{
                              fontSize: '13px', fontWeight: 600,
                              color: isYou ? '#fff' : '#ccc',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {entry.username}
                            </span>
                            {isYou && (
                              <span style={{
                                fontSize: '9px', fontWeight: 700,
                                padding: '2px 6px', borderRadius: '20px',
                                background: 'rgba(59,130,246,0.2)', color: '#3b82f6',
                                flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em',
                              }}>
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span style={{ fontSize: '11px', color: '#444', textTransform: 'capitalize' }}>{entry.tier}</span>
                            <span style={{ color: '#2a2a2a' }}>·</span>
                            <span style={{ fontSize: '11px', color: '#444', textTransform: 'capitalize' }}>{entry.level}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="lb-score-cell">
                        <div style={{ fontSize: '15px', fontWeight: 900, color: isYou ? '#3b82f6' : '#fff' }}>
                          {score.toFixed(1)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '3px' }}>
                          {getMovementIcon(movement)}
                          <span style={{
                            fontSize: '10px',
                            color: movement > 0 ? '#22c55e' : movement < 0 ? '#ef4444' : '#333',
                          }}>
                            {movement !== 0 ? Math.abs(movement) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Mastery */}
                      <div className="lb-mastery-cell">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#eab308' }}>
                            {entry.masteryPercent || 0}%
                          </span>
                        </div>
                        <div className="lb-progress-bar">
                          <div
                            className="lb-progress-fill"
                            style={{
                              width: `${entry.masteryPercent || 0}%`,
                              background: isYou ? '#3b82f6' : '#eab308',
                            }}
                          />
                        </div>
                      </div>

                      {/* Streak */}
                      <div className="lb-streak-cell">
                        {entry.streakCurrent > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '14px' }}>🔥</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f97316' }}>
                              {entry.streakCurrent}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#2a2a2a' }}>—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}