'use client'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Brain, Calendar, CheckCircle, Flame, Globe, TrendingUp, Trophy, Users, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/user/profile')
      return res.data.data
    },
  })

  const { data: scoreData } = useQuery({
    queryKey: ['reality-score'],
    queryFn: async () => {
      const res = await api.get('/reality-score')
      return res.data.data
    },
  })

  const { data: rankData } = useQuery({
    queryKey: ['my-rank'],
    queryFn: async () => {
      const res = await api.get('/leaderboard/my-rank')
      return res.data.data
    },
  })

  async function calculateScore() {
    try {
      await api.post('/reality-score/calculate')
      window.location.reload()
    } catch (e) {}
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '40px', height: '40px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.2)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    )
  }

  const tierColors: Record<string, string> = {
    developing: '#666', rising: '#22c55e',
    competitive: '#3b82f6', elite: '#8b5cf6', legendary: '#eab308',
  }
  const tierColor = tierColors[data?.tier] || '#666'

  const readiness = scoreData?.readinessLevel
  const latest = scoreData?.latest

  return (
    <div style={{ minHeight: '100vh', background: '#000', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div style={{ maxWidth: '100%', margin: '0', padding: '36px 40px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>My Profile</h1>
            <p style={{ fontSize: '12px', color: '#444', marginTop: '2px' }}>Your complete stats</p>
          </div>
        </div>

        {/* Profile Card */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: `${tierColor}15`, border: `2px solid ${tierColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 900, color: tierColor,
              boxShadow: `0 0 24px ${tierColor}20`,
            }}>
              {data?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>{data?.username}</h2>
              <p style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{data?.email}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                  {data?.tier?.toUpperCase()}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '20px', padding: '3px 10px', fontSize: '11px' }}>
                  {data?.targetTrack}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '20px', padding: '3px 10px', fontSize: '11px' }}>
                  {data?.level}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '20px', padding: '3px 10px', fontSize: '11px' }}>
                  {data?.mode} mode
                </span>
              </div>
            </div>

            {/* Reality Score Badge */}
            {readiness && (
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px 20px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff' }}>{scoreData?.user?.currentScore || 0}</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Reality Score</div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>{readiness.emoji} {readiness.level}</div>
              </div>
            )}
          </div>

          {/* Member since */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#333', fontSize: '12px' }}>
            <Calendar size={12} />
            <span>Member since {new Date(data?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* 3 Rank Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            { icon: <Users size={15} />, label: 'Batch Rank', rank: rankData?.batchRank, total: rankData?.batchTotal, color: '#22c55e', sub: rankData?.batchCode },
            { icon: <Trophy size={15} />, label: 'Track Rank', rank: rankData?.trackRank, total: rankData?.trackRankTotal, color: '#3b82f6', sub: `${data?.targetTrack} devs` },
            { icon: <Globe size={15} />, label: 'Platform Rank', rank: rankData?.platformRank, total: rankData?.platformRankTotal, color: '#8b5cf6', sub: 'All users' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: item.color }}>
                {item.icon}
                <span style={{ fontSize: '11px', color: '#444', fontWeight: 600 }}>{item.label}</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                #{item.rank || '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#333', marginTop: '4px' }}>/ {item.total || '?'}</div>
              <div style={{ fontSize: '11px', color: item.color + '99', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>

          {/* Performance */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={15} style={{ color: '#3b82f6' }} /> Performance
            </h3>
            {[
              { label: 'Mastery', value: `${data?.masteryPercent || 0}%`, progress: data?.masteryPercent || 0, color: '#eab308', icon: <Brain size={13} /> },
              { label: 'Streak', value: `${data?.streakCurrent || 0} days`, progress: Math.min((data?.streakCurrent || 0) * 3, 100), color: '#f97316', icon: <Flame size={13} /> },
              { label: 'Tests', value: `${data?._count?.testResults || 0} taken`, progress: Math.min((data?._count?.testResults || 0) * 5, 100), color: '#22c55e', icon: <CheckCircle size={13} /> },
              { label: 'Tasks', value: `${data?._count?.tasks || 0} total`, progress: Math.min((data?._count?.tasks || 0) * 2, 100), color: '#8b5cf6', icon: <Zap size={13} /> },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#555', fontSize: '12px' }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                    {item.label}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#ccc' }}>{item.value}</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.progress}%`, background: item.color, borderRadius: '10px', transition: 'width 1s ease', boxShadow: `0 0 6px ${item.color}60` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Reality Score Breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={15} style={{ color: '#eab308' }} /> Reality Score Breakdown
            </h3>
            {latest ? (
              <>
                {[
                  { label: 'Interview Score', value: latest.interviewScore, color: '#3b82f6' },
                  { label: 'Code Quality', value: latest.codeQualityScore, color: '#22c55e' },
                  { label: 'Speed', value: latest.speedScore, color: '#f97316' },
                  { label: 'Consistency', value: latest.consistencyScore, color: '#8b5cf6' },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#555' }}>{item.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#ccc' }}>{item.value || 0}%</span>
                    </div>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.value || 0}%`, background: item.color, borderRadius: '10px', boxShadow: `0 0 6px ${item.color}60` }} />
                    </div>
                  </div>
                ))}

                {/* Industry Gap */}
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#555' }}>Industry Standard</span>
                    <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 700 }}>{scoreData?.user?.industryStandard}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#555' }}>Your Gap</span>
                    <span style={{ fontSize: '12px', color: latest.industryGap > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                      {latest.industryGap > 0 ? `-${latest.industryGap}%` : '✅ Above standard'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '20px' }}>
                <p style={{ color: '#444', fontSize: '13px', marginBottom: '16px' }}>No score calculated yet</p>
                <button
                  onClick={calculateScore}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Calculate My Score
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {scoreData?.recommendations && scoreData.recommendations.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              💡 AI Recommendations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scoreData.recommendations.map((rec: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '10px' }}>
                  <span style={{ color: '#3b82f6', fontSize: '12px', marginTop: '1px' }}>→</span>
                  <span style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculate Button */}
        {latest && (
          <button
            onClick={calculateScore}
            style={{ width: '100%', marginTop: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', color: '#555', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#fff'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#555'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            🔄 Recalculate Reality Score
          </button>
        )}

      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
