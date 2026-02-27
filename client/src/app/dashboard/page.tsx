'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import {
  Brain, CheckCircle, ChevronRight,
  Flame, Globe, LogOut, TrendingUp, Trophy, Users, Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/user/dashboard')
      return res.data.data
    },
  })

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) router.push('/login')
    setTimeout(() => setMounted(true), 100)
  }, [router])

  useEffect(() => {
    if (error) toast.error('Failed to load dashboard')
  }, [error])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030303' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 20px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <p style={{ color: '#333', fontSize: 10, letterSpacing: '4px' }}>LOADING</p>
        </div>
      </div>
    )
  }

  const profile = data?.profile
  const performance = data?.performance
  const ranks = data?.ranks

  const tierConfig: Record<string, { color: string; glow: string }> = {
    developing:  { color: '#6b7280', glow: 'rgba(107,114,128,0.4)' },
    rising:      { color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
    competitive: { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
    elite:       { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
    legendary:   { color: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
  }
  const tier = tierConfig[profile?.tier] || tierConfig.developing

  const modeConfig: Record<string, { bg: string; text: string; border: string }> = {
    normal:      { bg: 'rgba(255,255,255,0.06)', text: '#9ca3af', border: 'rgba(255,255,255,0.12)' },
    competitive: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
    harsh:       { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.35)' },
  }
  const mode = modeConfig[profile?.mode] || modeConfig.normal

  const rankCards = [
    { icon: <Users size={15} />, label: 'Batch Rank', rank: ranks?.batchRank, total: ranks?.batchTotal, sub: ranks?.batchCode, color: '#22c55e', delay: '0ms' },
    { icon: <Trophy size={15} />, label: 'Track Rank', rank: ranks?.trackRank, total: ranks?.trackRankTotal, sub: `${profile?.targetTrack} developers`, color: '#3b82f6', delay: '60ms' },
    { icon: <Globe size={15} />, label: 'Platform Rank', rank: ranks?.platformRank, total: ranks?.platformRankTotal,
      sub: ranks?.weeklyMovement > 0 ? `↑ +${ranks.weeklyMovement} this week` : ranks?.weeklyMovement < 0 ? `↓ ${ranks.weeklyMovement} this week` : 'All users',
      color: '#a78bfa', delay: '120ms' },
  ]

  const statCards = [
    { icon: <Brain size={13} />, label: 'Mastery', value: `${performance?.masteryPercent || 0}%`, progress: performance?.masteryPercent || 0, color: '#fbbf24', delay: '0ms' },
    { icon: <Zap size={13} />, label: 'Reality Score', value: performance?.realityScore || 0, progress: Math.min(performance?.realityScore || 0, 100), color: '#3b82f6', delay: '50ms' },
    { icon: <Flame size={13} />, label: 'Streak', value: `${performance?.streakCurrent || 0}d`, sub: `Best: ${performance?.streakLongest || 0}d`, color: '#fb923c', delay: '100ms' },
    { icon: <CheckCircle size={13} />, label: 'Tasks Done', value: performance?.completedTasks || 0, sub: `of ${performance?.totalTasks || 0} total`, color: '#34d399', delay: '150ms' },
  ]

  const quickActions = [
    { icon: <Trophy size={17} />, color: '#fbbf24', title: 'View Leaderboard', sub: 'See global rankings', path: '/leaderboard' },
    { icon: <Brain size={17} />, color: '#3b82f6', title: 'AI Mentor Chat', sub: 'Ask your AI mentor', path: '/ai-chat' },
    { icon: <Zap size={17} />, color: '#a78bfa', title: 'My Profile', sub: 'View your full stats', path: '/profile' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        body {
          background: #030303;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .db-root { min-height: 100vh; background: #030303; position: relative; overflow-x: hidden; }

        .db-ambient {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 600px 400px at 10% 0%, rgba(59,130,246,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 500px 500px at 90% 100%, rgba(167,139,250,0.06) 0%, transparent 70%);
        }

        .db-content {
          position: relative; z-index: 1;
          max-width: 100%; margin: 0;
          padding: 36px 40px 80px;
        }

        .db-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 32px; gap: 12px; flex-wrap: wrap;
        }
        .db-logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #fff; line-height: 1; }
        .db-logo span { color: #3b82f6; }
        .db-logo-sub { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #333; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; }
        .db-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .db-mode-badge { font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; letter-spacing: 2px; text-transform: uppercase; padding: 6px 14px; border-radius: 100px; }
        .db-logout { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #555; cursor: pointer; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif; }
        .db-logout:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); color: #ccc; }

        .db-profile { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 24px 28px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; }
        .db-avatar { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; flex-shrink: 0; background: linear-gradient(135deg, #0f0f1a, #111827); }
        .db-profile-name { font-size: 20px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.3px; margin-bottom: 6px; }
        .db-profile-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .db-tier-badge { font-size: 10px; font-weight: 800; font-family: 'JetBrains Mono', monospace; letter-spacing: 1.5px; padding: 3px 10px; border-radius: 100px; }
        .db-dot { color: #252525; font-size: 12px; }
        .db-profile-tag { font-size: 12px; color: #555; text-transform: capitalize; }
        .db-batch-code { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #2a2a2a; margin-top: 8px; }

        .db-rank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .db-rank-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 18px; padding: 22px; transition: all 0.25s ease; position: relative; overflow: hidden; }
        .db-rank-card:hover { background: rgba(255,255,255,0.038); transform: translateY(-3px); }
        .db-rank-label-row { display: flex; align-items: center; gap: 7px; margin-bottom: 16px; }
        .db-rank-label { font-size: 11px; font-weight: 600; color: #444; letter-spacing: 0.5px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }
        .db-rank-number { font-size: 52px; font-weight: 900; color: #fff; line-height: 1; letter-spacing: -2px; margin-bottom: 10px; }
        .db-rank-number span { font-size: 18px; font-weight: 500; color: #2a2a2a; letter-spacing: 0; margin-left: 4px; }
        .db-rank-sub { font-size: 11px; font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .db-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        .db-stat-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 16px; padding: 18px; transition: all 0.25s ease; }
        .db-stat-card:hover { background: rgba(255,255,255,0.036); transform: translateY(-2px); }
        .db-stat-label-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
        .db-stat-label { font-size: 10px; color: #3a3a3a; text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; }
        .db-stat-value { font-size: 28px; font-weight: 800; color: #f0f0f0; letter-spacing: -0.5px; line-height: 1; margin-bottom: 6px; }
        .db-progress-track { width: 100%; height: 2px; background: rgba(255,255,255,0.05); border-radius: 100px; overflow: hidden; margin-top: 10px; }
        .db-progress-fill { height: 100%; border-radius: 100px; transition: width 1.2s cubic-bezier(0.4,0,0.2,1); }
        .db-stat-sub { font-size: 11px; color: #2e2e2e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; }

        .db-bottom-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .db-section-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 20px; padding: 24px; }
        .db-section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #e2e8f0; letter-spacing: 0.2px; margin-bottom: 16px; }
        .db-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); margin-bottom: 16px; }

        .db-test-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.02); margin-bottom: 8px; transition: background 0.2s; }
        .db-test-item:hover { background: rgba(255,255,255,0.04); }
        .db-test-item:last-child { margin-bottom: 0; }
        .db-test-difficulty { font-size: 13px; font-weight: 600; color: #bbb; text-transform: capitalize; margin-bottom: 3px; }
        .db-test-date { font-size: 11px; color: #333; font-family: 'JetBrains Mono', monospace; }
        .db-test-score { font-size: 14px; font-weight: 800; text-align: right; margin-bottom: 2px; }
        .db-test-result { font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; letter-spacing: 1px; text-align: right; }

        .db-empty { text-align: center; padding: 36px 20px; }
        .db-empty-icon { font-size: 32px; margin-bottom: 12px; }
        .db-empty-title { font-size: 13px; color: #3a3a3a; font-weight: 600; margin-bottom: 4px; }
        .db-empty-sub { font-size: 11px; color: #2a2a2a; font-family: 'JetBrains Mono', monospace; }

        .db-action-btn { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: inherit; cursor: pointer; text-align: left; margin-bottom: 10px; transition: all 0.2s ease; font-family: 'Space Grotesk', sans-serif; }
        .db-action-btn:last-child { margin-bottom: 0; }
        .db-action-btn:hover { background: rgba(255,255,255,0.05); transform: translateX(4px); }
        .db-action-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .db-action-title { font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 2px; }
        .db-action-sub { font-size: 11px; color: #3a3a3a; font-family: 'JetBrains Mono', monospace; }

        @media (max-width: 1024px) {
          .db-content { padding: 28px 20px 50px; }
          .db-rank-number { font-size: 44px; }
        }
        @media (max-width: 768px) {
          .db-content { padding: 20px 16px 48px; }
          .db-rank-grid { grid-template-columns: repeat(3,1fr); gap: 10px; }
          .db-rank-number { font-size: 36px; }
          .db-stats-grid { grid-template-columns: repeat(2,1fr); }
          .db-bottom-grid { grid-template-columns: 1fr; }
          .db-profile { padding: 18px 20px; }
        }
        @media (max-width: 640px) {
          .db-content { padding: 16px 14px 80px; }
          .db-rank-grid { grid-template-columns: 1fr; }
          .db-rank-card { display: flex; align-items: center; justify-content: space-between; }
          .db-logo-sub { display: none; }
          .db-logout span { display: none; }
          .db-logout { padding: 8px 10px; }
        }
        @media (max-width: 400px) {
          .db-content { padding: 12px 10px 80px; }
          .db-stats-grid { grid-template-columns: repeat(2,1fr); gap: 8px; }
          .db-stat-value { font-size: 22px; }
          .db-rank-number { font-size: 34px; }
        }
      `}</style>

      <div className="db-root">
        <div className="db-ambient" />

        <div
          className="db-content"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          {/* HEADER */}
          <div className="db-header">
            <div>
              <div className="db-logo">Reality<span>Engine</span></div>
              <div className="db-logo-sub">Competitive Dashboard</div>
            </div>
            <div className="db-header-right">
              <span className="db-mode-badge" style={{ background: mode.bg, color: mode.text, border: `1px solid ${mode.border}` }}>
                {profile?.mode} Mode
              </span>
              <button className="db-logout" onClick={logout}>
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* PROFILE */}
          <div className="db-profile">
            <div className="db-avatar" style={{ border: `2px solid ${tier.color}35`, boxShadow: `0 0 28px ${tier.glow}`, color: tier.color }}>
              {profile?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-profile-name">{profile?.username}</div>
              <div className="db-profile-tags">
                <span className="db-tier-badge" style={{ color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}30` }}>
                  {profile?.tier?.toUpperCase()}
                </span>
                <span className="db-dot">•</span>
                <span className="db-profile-tag">{profile?.targetTrack}</span>
                <span className="db-dot">•</span>
                <span className="db-profile-tag">{profile?.level}</span>
              </div>
              <div className="db-batch-code">{ranks?.batchCode}</div>
            </div>
          </div>

          {/* RANK CARDS */}
          <div className="db-rank-grid">
            {rankCards.map((item, i) => (
              <div
                key={i}
                className="db-rank-card"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.4s ease ${item.delay}`,
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${item.color}60, transparent)` }} />
                <div className="db-rank-label-row">
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span className="db-rank-label">{item.label}</span>
                </div>
                <div className="db-rank-number">
                  #{item.rank || '—'}
                  <span>/ {item.total || '?'}</span>
                </div>
                <div className="db-rank-sub" style={{ color: item.color + 'aa' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* STATS */}
          <div className="db-stats-grid">
            {statCards.map((item, i) => (
              <div
                key={i}
                className="db-stat-card"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.4s ease ${item.delay}`,
                }}
              >
                <div className="db-stat-label-row">
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span className="db-stat-label">{item.label}</span>
                </div>
                <div className="db-stat-value">{item.value}</div>
                {item.progress !== undefined && (
                  <div className="db-progress-track">
                    <div className="db-progress-fill" style={{ width: `${item.progress}%`, background: `linear-gradient(90deg, ${item.color}80, ${item.color})`, boxShadow: `0 0 8px ${item.color}50` }} />
                  </div>
                )}
                {item.sub && <div className="db-stat-sub">{item.sub}</div>}
              </div>
            ))}
          </div>

          {/* BOTTOM */}
          <div className="db-bottom-grid">
            <div className="db-section-card">
              <div className="db-section-title">
                <TrendingUp size={15} style={{ color: '#3b82f6' }} />
                Recent Tests
              </div>
              <div className="db-divider" />
              {data?.recentTests?.length > 0 ? (
                data.recentTests.map((test: any, i: number) => (
                  <div key={i} className="db-test-item">
                    <div>
                      <div className="db-test-difficulty">{test.difficulty}</div>
                      <div className="db-test-date">{new Date(test.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="db-test-score" style={{ color: test.passed ? '#34d399' : '#f87171' }}>{test.score}%</div>
                      <div className="db-test-result" style={{ color: test.passed ? '#34d39966' : '#f8717166' }}>{test.passed ? 'PASS' : 'FAIL'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="db-empty">
                  <div className="db-empty-icon">📊</div>
                  <div className="db-empty-title">No tests yet</div>
                  <div className="db-empty-sub">Complete tasks to unlock tests</div>
                </div>
              )}
            </div>

            <div className="db-section-card">
              <div className="db-section-title">Quick Actions</div>
              <div className="db-divider" />
              {quickActions.map((item, i) => (
                <button
                  key={i}
                  className="db-action-btn"
                  onClick={() => router.push(item.path)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${item.color}25` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
                >
                  <div className="db-action-icon" style={{ background: `${item.color}14`, color: item.color }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="db-action-title">{item.title}</div>
                    <div className="db-action-sub">{item.sub}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: '#2a2a2a', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}