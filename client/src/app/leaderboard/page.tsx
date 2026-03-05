'use client'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Tab = 'platform' | 'track' | 'batch'
const MONO = '"IBM Plex Mono", monospace'

// ── Normalize ANY backend entry shape ─────────────────────────────
// FIXED: score now correctly reads `score` first (which is the composite score
// returned by leaderboard.service.js), before falling back to other fields.
// Previously `masteryPercent` was being used which caused 0% for all users.
function norm(u: any, i: number, uid: string) {
  const rawScore =
    u.score            ??   // composite 0-100 from leaderboard.service
    u.performanceScore ??
    u.avgScore         ??
    u.averageScore     ??
    0

  return {
    rank:     u.rank     ?? u.platformRank ?? u.trackRank ?? i + 1,
    userId:   u.userId   ?? u.id ?? '',
    username: u.username ?? u.name ?? 'Unknown',
    tier:     (u.tier    ?? 'developing').toLowerCase(),
    level:    (u.level   ?? 'beginner').toLowerCase(),
    pic:      u.profilePic ?? null,
    score:    Number(rawScore),
    mastery:  Number(u.mastery ?? u.masteryPercent ?? 0),
    streak:   Number(u.streak  ?? u.streakCurrent  ?? u.streakCount ?? 0),
    tests:    Number(u.testCount ?? u.testsCount ?? u.testsTaken ?? 0),
    move:     Number(u.movement ?? u.weeklyMovement ?? u.rankChange ?? 0),
    isMe:     !!(u.isCurrentUser || u.userId === uid || u.id === uid),
  }
}

function medal(r: number) { return r===1?'🥇':r===2?'🥈':r===3?'🥉':null }
function medalC(r: number) { return r===1?'#fbbf24':r===2?'#9ca3af':r===3?'#f97316':'#374151' }

const TIER_C: Record<string,string> = {
  developing:'#6b7280', rising:'#22c55e', competitive:'#00c8ff', elite:'#a78bfa', legendary:'#fbbf24'
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes spin{to{transform:rotate(360deg)}}
body{background:#030307;color:#fff;font-family:'Syne',sans-serif;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:2px}
.lb-page{min-height:100vh;background:#030307}
.lb-glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 600px 400px at 70% 0%,rgba(139,92,246,.05),transparent 60%),radial-gradient(ellipse 400px 400px at 0% 80%,rgba(0,200,255,.03),transparent 60%)}
.lb-wrap{position:relative;z-index:1;width:100%;max-width:100%;padding:28px 32px 80px;opacity:0;transform:translateY(12px);transition:opacity .4s ease,transform .4s ease}
.lb-wrap.in{opacity:1;transform:none}
.lb-header{display:flex;align-items:center;gap:13px;margin-bottom:26px}
.back{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#555;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
.back:hover{color:#fff;background:rgba(255,255,255,.08)}
.tabs{display:flex;gap:5px;padding:5px;border-radius:15px;margin-bottom:20px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06)}
.tab{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 6px;border-radius:11px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;border:1px solid transparent;white-space:nowrap;font-family:'Syne',sans-serif;background:transparent;color:#444}
.tab.on{background:rgba(255,255,255,.07);color:#fff}
.you-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 17px;border-radius:13px;margin-bottom:17px;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.2);flex-wrap:wrap}
.insights{padding:13px 17px;border-radius:13px;margin-bottom:17px;background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.15)}
.podium{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px;margin-bottom:17px;align-items:flex-end}
.pod-card{border-radius:13px;padding:13px 8px;text-align:center;display:flex;flex-direction:column;justify-content:center;gap:4px;transition:all .2s}
.table-wrap{background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.06);border-radius:15px;overflow:hidden}
.thead{display:grid;grid-template-columns:52px 1fr 88px 80px 68px 54px;gap:8px;padding:10px 15px;font-size:9px;font-weight:700;color:#2a2a2a;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,.05)}
.trow{display:grid;grid-template-columns:52px 1fr 88px 80px 68px 54px;gap:8px;align-items:center;padding:11px 15px;border-bottom:1px solid rgba(255,255,255,.04);transition:all .18s;cursor:pointer}
.trow:last-child{border-bottom:none}
.trow:hover:not(.me){background:rgba(255,255,255,.03);transform:translateX(2px)}
.trow.me{background:rgba(139,92,246,.07);border-left:2px solid rgba(139,92,246,.4);padding-left:13px}
.avt{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;overflow:hidden}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:10px;text-align:center}
.spin-r{width:30px;height:30px;border-radius:50%;border:2px solid rgba(139,92,246,.2);border-top-color:#8b5cf6;animation:spin .8s linear infinite;margin:40px auto}
.bar-bg{height:3px;border-radius:99px;background:rgba(255,255,255,.06);overflow:hidden;margin-top:4px}
.bar-fill{height:100%;border-radius:99px;transition:width .7s ease}
@media(max-width:900px){.thead{grid-template-columns:44px 1fr 80px 70px 58px}.trow{grid-template-columns:44px 1fr 80px 70px 58px}.thead>:last-child,.trow>:last-child{display:none}}
@media(max-width:650px){.lb-wrap{padding:16px 13px 70px}.thead{grid-template-columns:40px 1fr 72px 58px;gap:6px;padding:8px 12px}.trow{grid-template-columns:40px 1fr 72px 58px;gap:6px;padding:10px 12px}.thead>:nth-child(4),.thead>:nth-child(5),.thead>:last-child{display:none}.trow>:nth-child(4),.trow>:nth-child(5),.trow>:last-child{display:none}.tab-lbl{display:none}.tab{padding:10px}}
@media(max-width:480px){.lb-wrap{padding:13px 10px 70px}.thead{grid-template-columns:34px 1fr 62px;gap:5px;padding:8px 10px}.trow{grid-template-columns:34px 1fr 62px;gap:5px;padding:9px 10px}.thead>:nth-child(3){display:block!important}.thead>:nth-child(n+4){display:none}.trow>:nth-child(3){display:block!important}.trow>:nth-child(n+4){display:none}.avt{width:28px;height:28px;font-size:11px;border-radius:8px}.you-card{flex-direction:column;align-items:flex-start}.podium{gap:5px}.pod-card{padding:10px 5px}}
`

export default function LeaderboardPage() {
  const router          = useRouter()
  const [tab, setTab]   = useState<Tab>('platform')
  const [mounted, setM] = useState(false)
  const [uid, setUid]   = useState('')
  const [track, setTr]  = useState('webdev')
  const [batch, setBa]  = useState('')
  const [rk,  setRk]    = useState(0)

  useEffect(() => {
    setTimeout(() => setM(true), 100)
    api.get('/user/dashboard').then(r => {
      const p  = r.data?.data?.profile || {}
      const rk = r.data?.data?.ranks   || {}
      if (p.id)          setUid(p.id)
      if (p.targetTrack) setTr(p.targetTrack)
      const bc = rk.batchCode || p.batchCode || ''
      if (bc) setBa(bc)
    }).catch(() => {})
  }, [])

  // ── Fetch helper: try primary URL, fall back to secondary ─────
  function fetchList(primary: string, fallback: string) {
    return api.get(primary)
      .then(r => r.data?.data ?? r.data)
      .catch(() =>
        api.get(fallback).then(r => r.data?.data ?? r.data)
      )
  }

  const { data: pd, isLoading: pl, refetch: rp } = useQuery({
    queryKey: ['lb-p', rk],
    enabled:  tab === 'platform',
    staleTime: 60000,
    queryFn: () => fetchList('/leaderboard/platform', '/leaderboard?scope=global'),
  })
  const { data: td, isLoading: tl, refetch: rt } = useQuery({
    queryKey: ['lb-t', track, rk],
    enabled:  tab === 'track',
    staleTime: 60000,
    queryFn: () => fetchList(`/leaderboard/track/${track}`, `/leaderboard?scope=track&track=${track}`),
  })
  const { data: bd, isLoading: bl, refetch: rb } = useQuery({
    queryKey: ['lb-b', batch, rk],
    enabled:  tab === 'batch' && !!batch,
    staleTime: 60000,
    queryFn: () => fetchList(`/leaderboard/batch/${batch}`, `/leaderboard?scope=batch&batch=${batch}`),
  })

  // Extract array from any backend response shape
  function getList(raw: any) {
    const arr = raw?.leaderboard ?? raw?.users ?? raw?.rankings ?? (Array.isArray(raw) ? raw : [])
    return arr.map((u: any, i: number) => norm(u, i, uid))
  }

  const pList   = getList(pd)
  const tList   = getList(td)
  const bList   = getList(bd)
  const list    = tab === 'platform' ? pList : tab === 'track' ? tList : bList
  const loading = tab === 'platform' ? pl    : tab === 'track' ? tl    : bl

  const meEntry  = list.find((e: any) => e.isMe)
  const insights = bd?.insights
  const rawData  = tab === 'platform' ? pd : tab === 'track' ? td : bd
  const meRank   = rawData?.myRank  ?? meEntry?.rank
  const meScore  = rawData?.myEntry?.score ?? meEntry?.score ?? 0
  const total    = rawData?.total ?? rawData?.totalUsers ?? list.length

  function refresh() {
    setRk(k => k + 1)
    if (tab === 'platform') rp()
    if (tab === 'track')    rt()
    if (tab === 'batch')    rb()
  }

  const top3 = list.slice(0, 3)  // always exactly first 3 unique entries
const podium = top3.length === 3 ? [top3[1], top3[0], top3[2]] : null
  const podH   = [96, 124, 84]

  const TABS = [
    { id: 'platform' as Tab, label: 'Platform', icon: '🌍', color: '#8b5cf6' },
    { id: 'track'    as Tab, label: 'Track',    icon: '🎯', color: '#3b82f6' },
    { id: 'batch'    as Tab, label: 'My Batch', icon: '👥', color: '#22c55e' },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="lb-page">
        <div className="lb-glow" />
        <div className={`lb-wrap ${mounted ? 'in' : ''}`}>

          {/* HEADER */}
          <div className="lb-header">
            <button className="back" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={16} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>Leaderboard</h1>
              <p style={{ fontSize: 10, color: '#2a2a2a', marginTop: 3, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: MONO }}>Rankings · Every 6h</p>
            </div>
            <button className="back" onClick={refresh}><RefreshCw size={13} /></button>
          </div>

          {/* TABS */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`}
                onClick={() => setTab(t.id)}
                style={{ borderColor: tab === t.id ? `${t.color}25` : 'transparent' }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                <span className="tab-lbl" style={{ color: tab === t.id ? t.color : '#444' }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* YOUR POSITION */}
          {meEntry && !loading && (
            <div className="you-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#8b5cf6', flexShrink: 0, fontFamily: MONO }}>
                  #{meRank ?? '?'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Your Position</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>#{meRank} of {total} users</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#8b5cf6', fontFamily: MONO }}>
                  {meScore != null ? `${Number(meScore).toFixed(0)}%` : '—'}
                </div>
                <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: MONO }}>Score</div>
              </div>
            </div>
          )}

          {/* BATCH INSIGHTS */}
          {tab === 'batch' && insights && (
            <div className="insights">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 9 }}>{insights.message}</div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {[
                  { l: 'Your Rank', v: `#${insights.yourRank}`,    c: '#22c55e' },
                  { l: 'Batch Size', v: insights.batchTotal,        c: '#3b82f6' },
                  { l: 'Avg Score',  v: `${insights.batchAvg}%`,   c: '#8b5cf6' },
                  insights.gapToNext > 0 && { l: 'Gap to Next', v: `+${insights.gapToNext}%`, c: '#f97316' },
                ].filter(Boolean).map((x: any, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: x.c, fontFamily: MONO }}>{x.v}</div>
                    <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: MONO }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NO BATCH */}
          {tab === 'batch' && !batch && !loading && (
            <div className="empty">
              <div style={{ fontSize: 44 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>No Batch Assigned</div>
              <div style={{ fontSize: 12, color: '#444', maxWidth: 280 }}>Complete registration to get matched with peers at your level.</div>
            </div>
          )}

          {/* LOADING */}
          {loading && <div className="spin-r" />}

          {/* EMPTY */}
          {!loading && list.length === 0 && !(tab === 'batch' && !batch) && (
            <div className="empty">
              <div style={{ fontSize: 44 }}>🏆</div>
              <div style={{ fontSize: 14, color: '#555' }}>No rankings yet</div>
              <div style={{ fontSize: 11, color: '#333', marginTop: 4, fontFamily: MONO }}>
                {tab === 'batch' ? 'Real-time updates' : 'Recalculates every 6 hours'}
              </div>
            </div>
          )}

          {/* CONTENT */}
          {!loading && list.length > 0 && (
            <>
              {/* PODIUM */}
              {podium && (
                <div className="podium">
                  {podium.map((e: any, i: number) => {
                    const rr = i === 0 ? 2 : i === 1 ? 1 : 3
                    const mc = medalC(rr)
                    return (
                      <div key={`pod-${i}-${e.userId}`} className="pod-card"
                        style={{ background: e.isMe ? `${mc}12` : 'rgba(255,255,255,.02)', border: `1px solid ${mc}${e.isMe ? '40' : '1a'}`, height: podH[i] }}>
                        <div style={{ fontSize: i === 1 ? 22 : 17 }}>{medal(rr)}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 6px' }}>{e.username}</div>
                        <div style={{ fontSize: i === 1 ? 17 : 13, fontWeight: 900, color: mc, fontFamily: MONO, lineHeight: 1 }}>
                          {e.score != null ? `${e.score.toFixed(0)}%` : '—'}
                        </div>
                        {(e.streak > 0 || e.tests > 0) && (
                          <div style={{ fontSize: 8, color: '#374151', fontFamily: MONO }}>
                            {e.tests > 0 ? `${e.tests}t` : ''}{e.streak > 0 ? ` · ${e.streak}🔥` : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* TABLE */}
              <div className="table-wrap">
                <div className="thead">
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div>Player</div>
                  <div style={{ textAlign: 'right' }}>Score</div>
                  <div>Mastery</div>
                  <div style={{ textAlign: 'center' }}>Streak</div>
                  <div style={{ textAlign: 'center' }}>Tests</div>
                </div>

                {list.map((e: any, idx: number) => {
                  const mc = medalC(e.rank)
                  const tc = TIER_C[e.tier] || '#6b7280'
                  const sc = e.score >= 75 ? '#22c55e' : e.score >= 50 ? '#f59e0b' : '#9ca3af'
                  const em = medal(e.rank)
                  return (
                    <div key={e.userId || idx} className={`trow ${e.isMe ? 'me' : ''}`}
                      onClick={() => !e.isMe && e.username && router.push(`/profile/${e.username}`)}>

                      {/* Rank */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {em
                          ? <span style={{ fontSize: 19 }}>{em}</span>
                          : <span style={{ fontSize: 11, fontWeight: 800, color: mc, fontFamily: MONO }}>#{e.rank}</span>}
                      </div>

                      {/* User */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <div className="avt" style={{ background: e.isMe ? 'rgba(139,92,246,.2)' : `${tc}18`, color: e.isMe ? '#8b5cf6' : tc, border: `1px solid ${e.isMe ? 'rgba(139,92,246,.35)' : tc + '28'}` }}>
                          {e.pic
                            ? <img src={e.pic} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                            : e.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: e.isMe ? '#c4b5fd' : '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.username}</span>
                            {e.isMe && <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 99, background: 'rgba(139,92,246,.2)', color: '#8b5cf6', flexShrink: 0 }}>YOU</span>}
                          </div>
                          <div style={{ fontSize: 9, color: tc, textTransform: 'capitalize', fontFamily: MONO, marginTop: 1 }}>{e.tier} · {e.level}</div>
                        </div>
                      </div>

                      {/* Score */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: e.isMe ? '#8b5cf6' : sc, fontFamily: MONO }}>
                          {e.score != null ? `${e.score.toFixed(0)}%` : '—'}
                        </div>
                        {e.move !== 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 }}>
                            {e.move > 0
                              ? <TrendingUp size={9} style={{ color: '#22c55e' }} />
                              : e.move < 0
                                ? <TrendingDown size={9} style={{ color: '#ef4444' }} />
                                : <Minus size={9} style={{ color: '#333' }} />}
                            <span style={{ fontSize: 9, color: e.move > 0 ? '#22c55e' : e.move < 0 ? '#ef4444' : '#333', fontFamily: MONO }}>{Math.abs(e.move)}</span>
                          </div>
                        )}
                      </div>

                      {/* Mastery */}
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#eab308', fontFamily: MONO }}>
                          {e.mastery != null ? `${e.mastery}%` : '—'}
                        </span>
                        <div className="bar-bg">
                          <div className="bar-fill" style={{ width: `${e.mastery}%`, background: e.isMe ? '#8b5cf6' : '#eab308' }} />
                        </div>
                      </div>

                      {/* Streak */}
                      <div style={{ textAlign: 'center' }}>
                        {e.streak > 0
                          ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                              <span style={{ fontSize: 13 }}>🔥</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316', fontFamily: MONO }}>{e.streak}</span>
                            </div>
                          : <span style={{ fontSize: 11, color: '#2a2a2a' }}>—</span>}
                      </div>

                      {/* Tests */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', fontFamily: MONO }}>
                          {e.tests != null ? e.tests : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: '#1f2937', fontFamily: MONO }}>
                {list.length} users · {tab === 'batch' ? 'real-time' : 'updates every 6 hours'}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}