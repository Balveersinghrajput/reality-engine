'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useRef, useState } from 'react'
import {
  Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart,
  Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

type Phase = 'chat' | 'challenge' | 'grading' | 'result'
interface ChatMsg { role: 'user' | 'ai'; text: string }
interface Challenge {
  title: string; description: string; language: string
  starterCode: string; estimatedMinutes: number
  difficulty: 'easy' | 'medium' | 'hard' | 'brutal'
  testCases: { input: string; expected: string }[]
}
interface TestResult {
  score: number; grade: string; feedback: string
  passedTests: number; totalTests: number
  timeBonus: number; xpEarned: number
}
interface PerfEntry { day: string; date: string; score: number; challenges: number; xp: number }

const SIGMA_PROMPT = `You are SIGMA — a brutally honest, harsh AI coding mentor.
You NEVER sugarcoat. You mock mediocrity, insult laziness, reward only real excellence.
Speak like a disappointed genius who expected better. Keep answers under 4 sentences.
Always end with a sharp challenge or action item.`

const DIFF_COLOR: Record<string, string> = {
  easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444', brutal: '#a855f7',
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

function grade(score: number) {
  if (score >= 95) return 'S'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  return 'F'
}

async function callSIGMA(messages: { role: string; content: string }[], system = SIGMA_PROMPT) {
  const res = await api.post('/tasks/sigma', { messages, system })
  return (res.data.reply ?? '') as string
}

function heatColor(score: number) {
  if (score === 0) return 'rgba(255,255,255,.04)'
  if (score >= 90) return 'rgba(0,255,200,.8)'
  if (score >= 75) return 'rgba(0,200,255,.65)'
  if (score >= 55) return 'rgba(0,120,255,.55)'
  return 'rgba(0,60,200,.4)'
}

function rollingAvg(data: PerfEntry[], window = 7): number[] {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1).filter(d => d.score > 0)
    if (!slice.length) return 0
    return Math.round(slice.reduce((a, b) => a + b.score, 0) / slice.length)
  })
}

function buildHistogram(data: PerfEntry[]) {
  const buckets = [
    { range: '0–20', min: 0, max: 20, count: 0 },
    { range: '20–40', min: 20, max: 40, count: 0 },
    { range: '40–55', min: 40, max: 55, count: 0 },
    { range: '55–70', min: 55, max: 70, count: 0 },
    { range: '70–80', min: 70, max: 80, count: 0 },
    { range: '80–90', min: 80, max: 90, count: 0 },
    { range: '90–95', min: 90, max: 95, count: 0 },
    { range: '95+', min: 95, max: 101, count: 0 },
  ]
  data.filter(d => d.score > 0).forEach(d => {
    const b = buckets.find(b => d.score >= b.min && d.score < b.max)
    if (b) b.count++
  })
  return buckets
}

function buildDayOfWeek(data: PerfEntry[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const map: Record<string, { total: number; count: number }> = {}
  days.forEach(d => { map[d] = { total: 0, count: 0 } })
  data.filter(e => e.score > 0).forEach(e => {
    const d = new Date(e.date)
    const dayName = d.toLocaleDateString('en', { weekday: 'short' })
    if (map[dayName]) { map[dayName].total += e.score; map[dayName].count++ }
  })
  return days.map(d => ({
    day: d,
    avg: map[d].count ? Math.round(map[d].total / map[d].count) : 0,
    sessions: map[d].count,
  }))
}

function buildXPCumulative(data: PerfEntry[]) {
  let cumXP = 0
  return data.map(d => { cumXP += d.xp || 0; return { ...d, cumXP } })
}

function ScoreTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{ background: '#060810', border: '1px solid rgba(0,200,255,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <p style={{ color: '#4b5563', marginBottom: 3, fontFamily: 'monospace' }}>{d?.date || label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.dataKey === 'rollingAvg' ? '7d avg' : 'score'}: {p.value}
        </p>
      ))}
    </div>
  )
}

function HistTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#060810', border: '1px solid rgba(0,200,255,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <p style={{ color: '#9ca3af', marginBottom: 2 }}>Score {label}</p>
      <p style={{ color: '#00c8ff', fontWeight: 700 }}>{payload[0]?.value} sessions</p>
    </div>
  )
}

function AnalyticsDashboard({ data }: { data: PerfEntry[] }) {
  const sessions = data.filter(d => d.score > 0)
  const avg = sessions.length ? Math.round(sessions.reduce((a, b) => a + b.score, 0) / sessions.length) : 0
  const best = sessions.length ? Math.max(...sessions.map(d => d.score)) : 0
  const totalXP = data.reduce((a, b) => a + (b.xp || 0), 0)
  const totalChallenges = data.reduce((a, b) => a + (b.challenges || 0), 0)
  const activeDays = sessions.length

  const rollingData = data.map((d, i) => ({ ...d, rollingAvg: rollingAvg(data, 7)[i] }))
  const histogram = buildHistogram(data)
  const dayOfWeek = buildDayOfWeek(data)
  const xpCumulative = buildXPCumulative(data)

  const gradeDistrib = [
    { label: 'S', min: 95, max: 101, color: '#a855f7' },
    { label: 'A', min: 80, max: 95, color: '#00ff96' },
    { label: 'B', min: 65, max: 80, color: '#00c8ff' },
    { label: 'C', min: 50, max: 65, color: '#f59e0b' },
    { label: 'F', min: 0, max: 50, color: '#ef4444' },
  ].map(g => ({
    ...g,
    count: sessions.filter(d => d.score >= g.min && d.score < g.max).length,
    pct: sessions.length ? Math.round((sessions.filter(d => d.score >= g.min && d.score < g.max).length / sessions.length) * 100) : 0,
  }))

  const weakDay = dayOfWeek.filter(d => d.sessions > 0).sort((a, b) => a.avg - b.avg)[0]
  const bestDay = dayOfWeek.filter(d => d.sessions > 0).sort((a, b) => b.avg - a.avg)[0]

  const insights: { text: string; color: string; icon: string }[] = []
  if (sessions.length >= 5) {
    const recent5 = sessions.slice(-5)
    const earlier5 = sessions.slice(-10, -5)
    if (earlier5.length >= 3) {
      const rA = recent5.reduce((a, b) => a + b.score, 0) / recent5.length
      const eA = earlier5.reduce((a, b) => a + b.score, 0) / earlier5.length
      if (rA > eA + 5) insights.push({ text: `Trending up +${Math.round(rA - eA)}pts`, color: '#00ff96', icon: '↑' })
      else if (rA < eA - 5) insights.push({ text: `Trending down ${Math.round(eA - rA)}pts`, color: '#ef4444', icon: '↓' })
    }
    const stdDev = Math.sqrt(sessions.map(d => d.score).reduce((a, b) => a + (b - avg) ** 2, 0) / sessions.length)
    if (stdDev > 20) insights.push({ text: `High inconsistency (σ=${Math.round(stdDev)})`, color: '#f59e0b', icon: '~' })
    if (weakDay?.sessions >= 2) insights.push({ text: `Weakest: ${weakDay.day} (${weakDay.avg} avg)`, color: '#ef4444', icon: '▼' })
    if (bestDay?.sessions >= 2) insights.push({ text: `Strongest: ${bestDay.day} (${bestDay.avg} avg)`, color: '#00ff96', icon: '▲' })
    const sDays = sessions.filter(d => d.score >= 95).length
    if (sDays >= 3) insights.push({ text: `${sDays} S-rank sessions 🔥`, color: '#a855f7', icon: '★' })
  }

  return (
    <div className="analytics-wrap">
      {/* KPI */}
      <div className="kpi-grid">
        {[
          { label: 'AVG SCORE', value: avg || '—', sub: 'all time', color: '#00c8ff' },
          { label: 'SESSIONS', value: totalChallenges || '—', sub: 'challenges', color: '#00ff96' },
          { label: 'TOTAL XP', value: totalXP ? `${totalXP}xp` : '—', sub: 'earned', color: '#f59e0b' },
          { label: 'BEST', value: best || '—', sub: 'personal best', color: '#a855f7' },
          { label: 'ACTIVE DAYS', value: activeDays || '—', sub: 'days trained', color: '#ef4444' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Score + Histogram */}
      <div className="chart-row-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="clabel">SCORE VS 7-DAY AVG</div>
              {avg > 0 && <div className="cmeta">Median: <strong style={{ color: '#00c8ff' }}>{avg}</strong></div>}
            </div>
            <div className="legend-row">
              <span style={{ color: '#00c8ff', fontSize: 10 }}>● Score</span>
              <span style={{ color: '#ff6b9d', fontSize: 10 }}>— 7d avg</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={rollingData} margin={{ top: 8, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.03)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#1f2937', fontSize: 8 }} axisLine={false} tickLine={false}
                interval={Math.max(1, Math.floor(data.length / 7))} />
              <YAxis domain={[0, 100]} tick={{ fill: '#1f2937', fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ScoreTooltip />} />
              {avg > 0 && <ReferenceLine y={avg} stroke="rgba(0,200,255,.2)" strokeDasharray="4 4"
                label={{ value: `${avg}`, position: 'right', fill: '#00c8ff', fontSize: 8 }} />}
              <Bar dataKey="score" radius={[2, 2, 0, 0]} maxBarSize={14}>
                {rollingData.map((d, i) => (
                  <Cell key={i} fill={d.score >= 90 ? 'rgba(0,255,200,.9)' : d.score >= 75 ? 'rgba(0,200,255,.75)' : d.score >= 55 ? 'rgba(0,120,255,.6)' : d.score > 0 ? 'rgba(0,60,200,.45)' : 'rgba(255,255,255,.03)'} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="rollingAvg" stroke="#ff6b9d" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="clabel">SCORE DISTRIBUTION</div>
              <div className="legend-row" style={{ marginTop: 2 }}>
                {gradeDistrib.map(g => g.count > 0 && <span key={g.label} style={{ color: g.color, fontSize: 9 }}>{g.label}:{g.pct}%</span>)}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={histogram} margin={{ top: 8, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.03)" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: '#1f2937', fontSize: 7 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#1f2937', fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip content={<HistTooltip />} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {histogram.map((h, i) => (
                  <Cell key={i} fill={h.min >= 95 ? 'rgba(168,85,247,.85)' : h.min >= 80 ? 'rgba(0,255,150,.8)' : h.min >= 65 ? 'rgba(0,200,255,.7)' : h.min >= 50 ? 'rgba(245,158,11,.65)' : 'rgba(239,68,68,.55)'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: XP + Day of Week + Heatmap */}
      <div className="chart-row-3">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="clabel">XP GROWTH</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#00ff96', fontFamily: 'monospace', lineHeight: 1 }}>{totalXP}<span style={{ fontSize: 10, color: '#374151', marginLeft: 3 }}>xp</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={xpCumulative} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff96" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff96" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.03)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#1f2937', fontSize: 7 }} axisLine={false} tickLine={false}
                interval={Math.max(1, Math.floor(data.length / 5))} />
              <YAxis tick={{ fill: '#1f2937', fontSize: 7 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => [`${v} XP`, 'Cumulative']}
                contentStyle={{ background: '#060810', border: '1px solid rgba(0,255,150,.2)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="cumXP" stroke="#00ff96" strokeWidth={2} fill="url(#xpGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="clabel">BEST DAY TO TRAIN</div>
              {bestDay && <div className="cmeta">
                Best: <strong style={{ color: '#00ff96' }}>{bestDay.day}</strong>
                {weakDay && <> · Weak: <strong style={{ color: '#ef4444' }}>{weakDay.day}</strong></>}
              </div>}
            </div>
          </div>
          <div className="day-bars">
            {dayOfWeek.map(d => {
              const color = d.avg >= 80 ? '#00ff96' : d.avg >= 60 ? '#00c8ff' : d.avg > 0 ? '#f59e0b' : '#1f2937'
              return (
                <div key={d.day} className="day-row">
                  <span className="day-lbl">{d.day}</span>
                  <div className="day-track"><div className="day-fill" style={{ width: `${d.avg}%`, background: color }} /></div>
                  <span className="day-score" style={{ color }}>{d.avg || '—'}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="clabel">28-DAY HEATMAP</div>
              <div className="cmeta">{activeDays} active days</div>
            </div>
          </div>
          <div className="heatmap-wrap">
            <div className="hm-header">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="hm-dl">{d}</div>)}
            </div>
            <div className="hm-grid">
              {data.slice(-28).map((d, i) => (
                <div key={i} className="hm-cell" title={`${d.date}: ${d.score}/100`} style={{ background: heatColor(d.score) }}>
                  {d.score >= 95 && <span style={{ fontSize: 7, color: '#000', fontWeight: 900 }}>S</span>}
                </div>
              ))}
            </div>
            <div className="hm-legend">
              <span className="hm-ll">Low</span>
              {['rgba(255,255,255,.04)', 'rgba(0,60,200,.4)', 'rgba(0,120,255,.55)', 'rgba(0,200,255,.65)', 'rgba(0,255,200,.8)'].map((c, i) => (
                <div key={i} className="hm-lc" style={{ background: c }} />
              ))}
              <span className="hm-ll">High</span>
            </div>
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="insights-card">
          <div className="clabel" style={{ marginBottom: 10 }}>AUTO INSIGHTS</div>
          <div className="insights-row">
            {insights.map((ins, i) => (
              <div key={i} className="insight-pill" style={{ background: `${ins.color}10`, border: `1px solid ${ins.color}25` }}>
                <span style={{ color: ins.color, fontSize: 13, fontWeight: 900 }}>{ins.icon}</span>
                <span className="insight-txt">{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const [phase, setPhase] = useState<Phase>('chat')
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'ai', text: `Welcome. I'm SIGMA. Skip the pleasantries — what are you trying to learn today? Be specific, or I'll assume you're wasting my time.` }])
  const [chatInput, setChatInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [perfData, setPerfData] = useState<PerfEntry[]>([])

  const chatBottom = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get('/tasks/performance?range=all').then(r => {
      const raw: PerfEntry[] = r.data.data ?? []
      if (!raw.length) { setPerfData([]); return }
      const map: Record<string, PerfEntry> = {}
      raw.forEach(d => { map[d.date] = d })
      const firstDate = new Date(raw[0].date)
      const today = new Date()
      const filled: PerfEntry[] = []
      for (let d = new Date(firstDate); d <= today; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0]
        const day = d.toLocaleDateString('en', { weekday: 'short' })
        filled.push(map[key] ?? { day, date: key, score: 0, challenges: 0, xp: 0 })
      }
      setPerfData(filled)
    }).catch(() => {
      const today = new Date()
      setPerfData(Array.from({ length: 28 }, (_, i) => {
        const d = new Date(today); d.setDate(today.getDate() - (27 - i))
        return { day: d.toLocaleDateString('en', { weekday: 'short' }), date: d.toISOString().split('T')[0], score: 0, challenges: 0, xp: 0 }
      }))
    })
  }, [])

  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (running) timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    else if (timerRef.current) clearInterval(timerRef.current)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  async function sendChat() {
    if (!chatInput.trim() || aiLoading) return
    const userText = chatInput.trim()
    setMsgs(p => [...p, { role: 'user', text: userText }])
    setChatInput(''); setAiLoading(true)
    try {
      const history = [...msgs, { role: 'user', text: userText }].map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
      const reply = await callSIGMA(history)
      setMsgs(p => [...p, { role: 'ai', text: reply }])
    } catch {
      setMsgs(p => [...p, { role: 'ai', text: 'Your connection is as reliable as your code. Try again.' }])
    } finally { setAiLoading(false) }
  }

  async function generateChallenge() {
    setGenLoading(true)
    const topic = msgs.filter(m => m.role === 'user').map(m => m.text).join(', ')
    try {
      const raw = await callSIGMA([{ role: 'user', content: `Student wants to learn: "${topic}". Generate a coding challenge. Output ONLY valid JSON — no markdown:\n{"title":"...","description":"...","language":"javascript","starterCode":"// write here","estimatedMinutes":15,"difficulty":"medium","testCases":[{"input":"...","expected":"..."}]}` }],
        `${SIGMA_PROMPT}\nWhen asked for a challenge, output ONLY the JSON object. No extra text.`)
      const parsed: Challenge = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setChallenge(parsed); setCode(parsed.starterCode || '// write your solution here\n')
      setMsgs(p => [...p, { role: 'ai', text: `Fine. Challenge generated. ${parsed.estimatedMinutes} minutes estimated. Most people fail at ${Math.floor(parsed.estimatedMinutes * 0.7)}m. Let's see if you're "most people".` }])
      setElapsed(0); setRunning(true); setPhase('challenge')
    } catch {
      setMsgs(p => [...p, { role: 'ai', text: 'Challenge generation failed. Even my systems have standards.' }])
    } finally { setGenLoading(false) }
  }

  async function submitCode() {
    if (!challenge) return
    setRunning(false); setPhase('grading')
    const timeTaken = elapsed; const estSecs = challenge.estimatedMinutes * 60
    const timeBonus = timeTaken < estSecs ? Math.round(((estSecs - timeTaken) / estSecs) * 20) : 0
    try {
      const raw = await callSIGMA([{ role: 'user', content: `Grade HARSHLY.\nChallenge: "${challenge.title}"\nTask: ${challenge.description}\nCode:\n\`\`\`${challenge.language}\n${code}\n\`\`\`\nTest cases: ${JSON.stringify(challenge.testCases)}\nTime: ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s (est: ${challenge.estimatedMinutes}m)\nOutput ONLY JSON: {"score":<0-100>,"passedTests":<n>,"totalTests":${challenge.testCases.length},"feedback":"<2-3 brutal sentences>"}` }],
        `${SIGMA_PROMPT}\nWhen grading, output ONLY the JSON object.`)
      const graded = JSON.parse(raw.replace(/```json|```/g, '').trim())
      const finalScore = Math.min(100, (graded.score ?? 0) + timeBonus)
      const xp = Math.round(finalScore * (challenge.difficulty === 'brutal' ? 3 : challenge.difficulty === 'hard' ? 2 : 1.5))
      setResult({ score: finalScore, grade: grade(finalScore), feedback: graded.feedback ?? 'No comment.', passedTests: graded.passedTests ?? 0, totalTests: graded.totalTests ?? challenge.testCases.length, timeBonus, xpEarned: xp })
      await api.post('/tasks/save-result', { challengeTitle: challenge.title, score: finalScore, xpEarned: xp, timeTaken, estimatedMinutes: challenge.estimatedMinutes, difficulty: challenge.difficulty }).catch(() => { })
      const key = new Date().toISOString().split('T')[0]; const day = new Date().toLocaleDateString('en', { weekday: 'short' })
      setPerfData(prev => { const c = [...prev]; const i = c.findIndex(d => d.date === key); if (i >= 0) c[i] = { ...c[i], score: Math.round((c[i].score + finalScore) / 2), challenges: (c[i].challenges || 0) + 1, xp: (c[i].xp || 0) + xp }; else c.push({ day, date: key, score: finalScore, challenges: 1, xp }); return c })
      setPhase('result')
    } catch {
      setResult({ score: 0, grade: 'F', feedback: "Your code broke my grader. Somehow that's worse than failing.", passedTests: 0, totalTests: challenge.testCases.length, timeBonus: 0, xpEarned: 0 })
      setPhase('result')
    }
  }

  function reset() {
    const good = result && result.score >= 80
    setPhase('chat'); setChallenge(null); setCode(''); setElapsed(0); setResult(null)
    setMsgs([{ role: 'ai', text: good ? `Not completely embarrassing. I've seen worse — barely. What next?` : `That performance was an insult to silicon. What topic now?` }])
  }

  const estSecs = (challenge?.estimatedMinutes ?? 0) * 60
  const overTime = elapsed > estSecs && estSecs > 0
  const userMsgCount = msgs.filter(m => m.role === 'user').length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes pulseC { 0%,100%{box-shadow:0 0 0 0 rgba(0,200,255,.5)} 70%{box-shadow:0 0 0 8px rgba(0,200,255,0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .page-wrap { min-height:100vh; background:#030307; font-family:'Space Grotesk',sans-serif; color:#fff; }
        .page-inner { max-width:1400px; margin:0 auto; padding:24px 18px; }

        /* Header */
        .live-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        .live-dot { width:8px; height:8px; border-radius:50%; background:#00c8ff; animation:pulseC 2s infinite; flex-shrink:0; }
        .live-txt { font-size:10px; color:#00c8ff; letter-spacing:2.5px; text-transform:uppercase; font-family:'JetBrains Mono',monospace; font-weight:700; }
        .pg-title { font-size:28px; font-weight:700; letter-spacing:-0.5px; }
        .pg-sub { color:#374151; font-size:11px; margin-top:4px; font-family:'JetBrains Mono',monospace; }
        .pg-header { margin-bottom:20px; }

        /* Analytics */
        .analytics-wrap { margin-bottom:18px; }
        .kpi-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:12px; }
        .kpi-card { background:#06080f; border:1px solid rgba(255,255,255,.06); border-radius:14px; padding:14px 16px; }
        .kpi-label { font-size:9px; color:#374151; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px; font-family:'JetBrains Mono',monospace; }
        .kpi-value { font-size:26px; font-weight:900; font-family:'JetBrains Mono',monospace; line-height:1; letter-spacing:-1px; }
        .kpi-sub { font-size:10px; color:#1f2937; margin-top:4px; }

        .chart-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        .chart-row-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px; }
        .chart-card { background:#06080f; border:1px solid rgba(0,200,255,.09); border-radius:14px; overflow:hidden; }
        .chart-hdr { padding:12px 16px 0; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px; }
        .clabel { font-size:9px; color:#374151; letter-spacing:2px; text-transform:uppercase; font-family:'JetBrains Mono',monospace; margin-bottom:2px; }
        .cmeta { font-size:11px; color:#4b5563; font-family:'JetBrains Mono',monospace; }
        .legend-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

        .day-bars { padding:8px 16px 14px; display:flex; flex-direction:column; gap:6px; }
        .day-row { display:flex; align-items:center; gap:8px; }
        .day-lbl { font-size:10px; color:#374151; font-family:'JetBrains Mono',monospace; width:26px; flex-shrink:0; }
        .day-track { flex:1; height:10px; background:rgba(255,255,255,.04); border-radius:3px; overflow:hidden; }
        .day-fill { height:100%; border-radius:3px; transition:width .4s; }
        .day-score { font-size:10px; font-family:'JetBrains Mono',monospace; width:24px; text-align:right; flex-shrink:0; }

        .heatmap-wrap { padding:6px 16px 14px; }
        .hm-header { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:3px; }
        .hm-dl { font-size:8px; color:#1f2937; text-align:center; font-family:'JetBrains Mono',monospace; }
        .hm-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
        .hm-cell { aspect-ratio:1; border-radius:3px; cursor:default; display:flex; align-items:center; justify-content:center; transition:transform .1s; }
        .hm-cell:hover { transform:scale(1.15); }
        .hm-legend { display:flex; gap:5px; margin-top:8px; align-items:center; }
        .hm-ll { font-size:8px; color:#374151; }
        .hm-lc { width:10px; height:10px; border-radius:2px; }

        .insights-card { background:#06080f; border:1px solid rgba(255,255,255,.06); border-radius:14px; padding:14px 18px; }
        .insights-row { display:flex; gap:8px; flex-wrap:wrap; }
        .insight-pill { display:flex; gap:6px; align-items:center; border-radius:8px; padding:6px 12px; }
        .insight-txt { font-size:11px; color:#9ca3af; }

        /* Main grid */
        .main-grid { display:grid; gap:14px; align-items:start; }
        .main-grid.solo { grid-template-columns:1fr; }
        .main-grid.duo { grid-template-columns:1fr 1fr; }

        /* Chat */
        .chat-panel { background:#06080f; border:1px solid rgba(0,200,255,.12); border-radius:20px; overflow:hidden; display:flex; flex-direction:column; }
        .chat-h-full { height:420px; }
        .chat-h-split { height:520px; }
        .chat-top { padding:13px 16px; border-bottom:1px solid rgba(0,200,255,.08); background:rgba(0,200,255,.02); display:flex; align-items:center; gap:12px; flex-shrink:0; flex-wrap:wrap; }
        .sig-avatar { width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#0a1a2e,#0e2a4e); display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; border:1px solid rgba(0,200,255,.3); color:#00c8ff; font-weight:900; }
        .sig-name { color:#00c8ff; font-weight:700; font-size:14px; }
        .sig-status { color:#374151; font-size:9px; font-family:'JetBrains Mono',monospace; }
        .gen-btn { background:rgba(0,200,255,.12); border:1px solid rgba(0,200,255,.3); color:#00c8ff; border-radius:10px; padding:8px 13px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap; transition:filter .15s; }
        .gen-btn:hover:not(:disabled) { filter:brightness(1.2); }
        .chat-msgs { flex:1; overflow-y:auto; padding:14px 12px; }
        .msg { animation:slideUp .22s ease; margin-bottom:10px; display:flex; gap:9px; }
        .msg.usr { flex-direction:row-reverse; }
        .msg-av { width:26px; height:26px; border-radius:7px; background:linear-gradient(135deg,#0a1a2e,#0e2a4e); border:1px solid rgba(0,200,255,.3); display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; margin-top:3px; color:#00c8ff; font-weight:900; }
        .msg-b { max-width:78%; padding:9px 13px; font-size:13.5px; line-height:1.55; }
        .msg-b.ai { background:rgba(0,200,255,.05); border:1px solid rgba(0,200,255,.12); border-radius:4px 14px 14px 14px; color:#7dd3fc; }
        .msg-b.usr { background:rgba(0,255,150,.05); border:1px solid rgba(0,255,150,.12); border-radius:14px 4px 14px 14px; color:#86efac; }
        .typing-d { padding:12px 14px; background:rgba(0,200,255,.05); border:1px solid rgba(0,200,255,.12); border-radius:4px 14px 14px 14px; display:flex; gap:5px; align-items:center; }
        .dot { width:5px; height:5px; border-radius:50%; background:#00c8ff; }
        .chat-in-wrap { padding:10px 12px; border-top:1px solid rgba(255,255,255,.04); display:flex; gap:8px; flex-shrink:0; }
        .chat-in { flex:1; background:#0a0c18; border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:10px 14px; color:#f0f0f0; font-size:13.5px; font-family:'Space Grotesk',sans-serif; }
        .chat-in:focus { outline:none; }
        .send-btn { width:40px; height:40px; border-radius:50%; border:none; font-size:18px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:filter .15s; }
        .send-btn:hover:not(:disabled) { filter:brightness(1.2); }

        /* Right panel */
        .right-panel { display:flex; flex-direction:column; gap:12px; }
        .ch-info { background:#06080f; border:1px solid rgba(255,255,255,.07); border-radius:16px; padding:16px; }
        .ch-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
        .ch-tags { display:flex; gap:7px; margin-bottom:7px; flex-wrap:wrap; }
        .dtag { font-size:9px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; border-radius:6px; padding:2px 8px; }
        .ltag { font-size:9px; color:#374151; font-family:'JetBrains Mono',monospace; background:rgba(255,255,255,.04); border-radius:6px; padding:2px 8px; }
        .ch-title { font-size:16px; font-weight:700; }
        .timer-box { text-align:right; flex-shrink:0; border-radius:12px; padding:8px 13px; }
        .timer-v { font-size:24px; font-weight:700; font-family:'JetBrains Mono',monospace; letter-spacing:2px; line-height:1; }
        .timer-e { font-size:9px; color:#374151; font-family:'JetBrains Mono',monospace; margin-top:2px; }
        .ch-desc { color:#9ca3af; font-size:13px; line-height:1.6; margin-bottom:10px; }
        .prog-bar { height:3px; background:rgba(255,255,255,.05); border-radius:2px; overflow:hidden; }
        .prog-fill { height:100%; border-radius:2px; transition:width .5s,background .3s; }

        .code-ed { background:#04050a; border:1px solid rgba(255,255,255,.07); border-radius:16px; overflow:hidden; }
        .ed-tb { padding:9px 14px; border-bottom:1px solid rgba(255,255,255,.05); background:rgba(255,255,255,.02); display:flex; align-items:center; gap:6px; }
        .td { width:9px; height:9px; border-radius:50%; }
        .ed-fn { font-size:10px; color:#374151; font-family:'JetBrains Mono',monospace; margin-left:6px; }
        .code-ta { width:100%; min-height:200px; max-height:280px; background:transparent; border:none; color:#c9d1d9; font-size:13px; line-height:1.8; padding:13px 16px; font-family:'JetBrains Mono',monospace; resize:none; }
        .code-ta:focus { outline:none; }
        .ed-ft { padding:10px 14px; border-top:1px solid rgba(255,255,255,.04); display:flex; justify-content:flex-end; }
        .sub-btn { background:rgba(0,200,255,.1); border:1px solid rgba(0,200,255,.3); color:#00c8ff; border-radius:10px; padding:10px 20px; font-size:12px; font-weight:700; cursor:pointer; transition:filter .15s; }
        .sub-btn:hover:not(:disabled) { filter:brightness(1.2); }

        .grading-pnl { background:#06080f; border:1px solid rgba(0,200,255,.12); border-radius:16px; padding:48px 24px; text-align:center; }
        .spinner { width:44px; height:44px; border:3px solid rgba(0,200,255,.15); border-top-color:#00c8ff; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 14px; }

        .result-pnl { border-radius:16px; padding:22px; }
        .res-top { display:flex; align-items:center; gap:18px; margin-bottom:18px; flex-wrap:wrap; }
        .grade-box { width:76px; height:76px; border-radius:16px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:900; font-family:'JetBrains Mono',monospace; }
        .res-score { font-size:38px; font-weight:700; font-family:'JetBrains Mono',monospace; color:#fff; line-height:1; }
        .badges { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
        .badge { font-size:10px; border-radius:6px; padding:2px 8px; }
        .fb-box { border-radius:11px; padding:12px 14px; margin-bottom:14px; }
        .res-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; }
        .s-cell { background:rgba(255,255,255,.03); border-radius:9px; padding:10px; text-align:center; }
        .s-val { font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; color:#fff; }
        .s-lbl { font-size:9px; color:#374151; margin-top:3px; text-transform:uppercase; letter-spacing:1px; }
        .reset-btn { width:100%; padding:11px; border-radius:11px; font-size:13px; font-weight:700; cursor:pointer; transition:filter .15s; }
        .reset-btn:hover { filter:brightness(1.2); }

        .how-grid { margin-top:16px; display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .how-card { background:#06080f; border:1px solid rgba(255,255,255,.05); border-radius:14px; padding:16px; }
        .how-n { font-size:10px; font-family:'JetBrains Mono',monospace; font-weight:700; margin-bottom:7px; }
        .how-t { font-size:14px; font-weight:700; margin-bottom:5px; color:#fff; }
        .how-d { font-size:12px; color:#4b5563; line-height:1.5; }

        /* ═══════════════ RESPONSIVE ═══════════════ */

        /* ≤1280px: compact 3-col bottom charts */
        @media (max-width:1280px) {
          .page-inner { padding:20px 16px; }
          .kpi-grid { gap:8px; }
          .kpi-value { font-size:22px; }
          .kpi-card { padding:12px 12px; }
          .chart-row-3 { grid-template-columns:1fr 1fr; }
          .chart-row-3 .chart-card:last-child { grid-column:span 2; }
        }

        /* ≤1024px: tablet — 1-col charts, stacked panels */
        @media (max-width:1024px) {
          .pg-title { font-size:24px; }
          .kpi-grid { grid-template-columns:repeat(3,1fr); }
          .chart-row-2 { grid-template-columns:1fr; }
          .chart-row-3 { grid-template-columns:1fr 1fr; }
          .chart-row-3 .chart-card:last-child { grid-column:1 / -1; }
          .main-grid.duo { grid-template-columns:1fr; }
          .chat-h-split { height:460px; }
          .how-grid { grid-template-columns:repeat(2,1fr); }
        }

        /* ≤768px: large mobile */
        @media (max-width:768px) {
          .page-inner { padding:14px 12px; }
          .pg-title { font-size:21px; }
          .kpi-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
          .kpi-card:last-child { grid-column:1 / -1; }
          .kpi-value { font-size:20px; }
          .chart-row-2 { grid-template-columns:1fr; }
          .chart-row-3 { grid-template-columns:1fr; }
          .chart-row-3 .chart-card:last-child { grid-column:auto; }
          .main-grid.duo { grid-template-columns:1fr; }
          .chat-h-full { height:360px; }
          .chat-h-split { height:400px; }
          .how-grid { grid-template-columns:1fr 1fr; gap:8px; }
          .res-stats { grid-template-columns:1fr 1fr; }
          .res-stats .s-cell:last-child { grid-column:1 / -1; }
          .gen-btn .gen-lbl { display:none; }
          .ch-top { gap:8px; }
          .timer-v { font-size:20px; }
          .insight-txt { font-size:10px; }
          .msg-b { font-size:13px; }
        }

        /* ≤480px: small mobile */
        @media (max-width:480px) {
          .page-inner { padding:12px 10px; }
          .pg-title { font-size:18px; }
          .kpi-grid { grid-template-columns:repeat(2,1fr); gap:6px; }
          .kpi-card { padding:10px 10px; }
          .kpi-value { font-size:17px; }
          .kpi-label { font-size:8px; letter-spacing:1px; }
          .chat-h-full { height:320px; }
          .chat-h-split { height:360px; }
          .chat-top { padding:10px 12px; }
          .sig-avatar { width:32px; height:32px; font-size:14px; }
          .sig-name { font-size:13px; }
          .msg-b { font-size:12.5px; padding:7px 10px; max-width:88%; }
          .chat-in { font-size:13px; padding:9px 12px; }
          .send-btn { width:36px; height:36px; font-size:16px; }
          .how-grid { grid-template-columns:1fr; }
          .grade-box { width:60px; height:60px; font-size:24px; }
          .res-score { font-size:30px; }
          .res-stats { grid-template-columns:1fr; }
          .timer-v { font-size:18px; }
          .ch-title { font-size:14px; }
          .ch-desc { font-size:12px; }
          .code-ta { min-height:160px; font-size:12px; }
          .hm-grid { gap:2px; }
          .hm-header { gap:2px; }
          .live-txt { font-size:9px; letter-spacing:1.5px; }
        }

        /* ≤360px: very small */
        @media (max-width:360px) {
          .pg-title { font-size:16px; }
          .kpi-grid { grid-template-columns:1fr 1fr; gap:5px; }
          .kpi-value { font-size:15px; }
          .chat-h-full { height:280px; }
          .chat-h-split { height:320px; }
          .res-top { flex-direction:column; align-items:flex-start; }
          .res-stats { grid-template-columns:1fr; }
          .how-grid { grid-template-columns:1fr; }
          .insights-row { gap:5px; }
        }
      `}</style>

      <div className="page-wrap">
        <div className="page-inner">

          <div className="pg-header">
            <div className="live-row">
              <span className="live-dot" />
              <span className="live-txt">SIGMA TRAINING HQ — LIVE</span>
            </div>
            <h1 className="pg-title">AI Challenge <span style={{ color: '#00c8ff' }}>Engine</span></h1>
            <p className="pg-sub">
              {phase === 'chat' && '// chat with SIGMA → get a challenge → survive'}
              {phase === 'challenge' && `// challenge active — ${overTime ? '⚠ OVER ESTIMATE' : 'in progress'}`}
              {phase === 'grading' && '// submitting to SIGMA for judgment...'}
              {phase === 'result' && '// session complete — review your performance'}
            </p>
          </div>

          <AnalyticsDashboard data={perfData} />

          <div className={`main-grid ${phase === 'chat' ? 'solo' : 'duo'}`}>

            {/* Chat */}
            <div className={`chat-panel ${phase === 'chat' ? 'chat-h-full' : 'chat-h-split'}`}>
              <div className="chat-top">
                <div className="sig-avatar">Σ</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="sig-name">SIGMA</p>
                  <p className="sig-status">{aiLoading ? '▌ judging...' : '● awaiting your excuse'}</p>
                </div>
                {phase === 'chat' && userMsgCount > 0 && (
                  <button className="gen-btn" onClick={generateChallenge} disabled={genLoading}>
                    {genLoading
                      ? <><div style={{ width: 11, height: 11, border: '2px solid rgba(0,200,255,.3)', borderTopColor: '#00c8ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /><span className="gen-lbl">Generating...</span></>
                      : <>⚡ <span className="gen-lbl">Get Challenge</span></>}
                  </button>
                )}
              </div>
              <div className="chat-msgs">
                {msgs.map((m, i) => (
                  <div key={i} className={`msg ${m.role === 'user' ? 'usr' : ''}`}>
                    {m.role === 'ai' && <div className="msg-av">Σ</div>}
                    <div className={`msg-b ${m.role === 'ai' ? 'ai' : 'usr'}`}>{m.text}</div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="msg">
                    <div className="msg-av">Σ</div>
                    <div className="typing-d">
                      {[0, 1, 2].map(i => <div key={i} className="dot" style={{ animation: `blink 1.2s infinite ${i * .2}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={chatBottom} />
              </div>
              {phase !== 'grading' && (
                <div className="chat-in-wrap">
                  <input className="chat-in" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder={phase === 'chat' ? 'Tell SIGMA what to challenge you on...' : 'Ask for a hint (coward)...'} />
                  <button className="send-btn" onClick={sendChat} disabled={!chatInput.trim() || aiLoading}
                    style={{ background: chatInput.trim() ? '#00c8ff' : '#0d0e1a', color: chatInput.trim() ? '#000' : '#374151' }}>›</button>
                </div>
              )}
            </div>

            {/* Right panel */}
            {(phase === 'challenge' || phase === 'grading' || phase === 'result') && challenge && (
              <div className="right-panel">
                <div className="ch-info">
                  <div className="ch-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ch-tags">
                        <span className="dtag" style={{ color: DIFF_COLOR[challenge.difficulty], background: `${DIFF_COLOR[challenge.difficulty]}15`, border: `1px solid ${DIFF_COLOR[challenge.difficulty]}35` }}>{challenge.difficulty}</span>
                        <span className="ltag">{challenge.language}</span>
                        <span className="ltag">est. {challenge.estimatedMinutes}m</span>
                      </div>
                      <h2 className="ch-title">{challenge.title}</h2>
                    </div>
                    <div className="timer-box" style={{ background: overTime ? 'rgba(239,68,68,.1)' : 'rgba(0,200,255,.05)', border: `1px solid ${overTime ? 'rgba(239,68,68,.3)' : 'rgba(0,200,255,.2)'}` }}>
                      <div className="timer-v" style={{ color: overTime ? '#ef4444' : '#00c8ff' }}>{fmt(elapsed)}</div>
                      <div className="timer-e">/ {fmt(estSecs)} est.</div>
                    </div>
                  </div>
                  <p className="ch-desc">{challenge.description}</p>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: `${Math.min(100, estSecs > 0 ? (elapsed / estSecs) * 100 : 0)}%`, background: overTime ? '#ef4444' : '#00c8ff' }} /></div>
                </div>

                {phase === 'challenge' && (
                  <div className="code-ed">
                    <div className="ed-tb">
                      {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} className="td" style={{ background: c }} />)}
                      <span className="ed-fn">solution.{challenge.language === 'javascript' ? 'js' : challenge.language === 'python' ? 'py' : challenge.language === 'typescript' ? 'ts' : 'txt'}</span>
                    </div>
                    <textarea className="code-ta" value={code} onChange={e => setCode(e.target.value)} />
                    <div className="ed-ft">
                      <button className="sub-btn" onClick={submitCode} disabled={!code.trim()}>⚡ Submit for Judgment</button>
                    </div>
                  </div>
                )}

                {phase === 'grading' && (
                  <div className="grading-pnl">
                    <div className="spinner" />
                    <p style={{ color: '#00c8ff', fontWeight: 700, fontSize: 15 }}>SIGMA is evaluating...</p>
                    <p style={{ color: '#374151', fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>// prepare for harsh feedback</p>
                  </div>
                )}

                {phase === 'result' && result && (
                  <div className="result-pnl" style={{ background: '#06080f', border: `1px solid ${result.score >= 80 ? 'rgba(0,255,150,.2)' : 'rgba(239,68,68,.2)'}` }}>
                    <div className="res-top">
                      <div className="grade-box" style={{ background: result.score >= 80 ? 'rgba(0,255,150,.08)' : result.score >= 50 ? 'rgba(245,158,11,.08)' : 'rgba(239,68,68,.08)', border: `2px solid ${result.score >= 80 ? '#00ff96' : result.score >= 50 ? '#f59e0b' : '#ef4444'}`, color: result.score >= 80 ? '#00ff96' : result.score >= 50 ? '#f59e0b' : '#ef4444' }}>{result.grade}</div>
                      <div>
                        <div className="res-score">{result.score}<span style={{ fontSize: 16, color: '#374151' }}>/100</span></div>
                        <div className="badges">
                          <span className="badge" style={{ color: '#00ff96', background: 'rgba(0,255,150,.08)', border: '1px solid rgba(0,255,150,.2)' }}>{result.passedTests}/{result.totalTests} tests</span>
                          {result.timeBonus > 0 && <span className="badge" style={{ color: '#00c8ff', background: 'rgba(0,200,255,.08)', border: '1px solid rgba(0,200,255,.2)' }}>+{result.timeBonus} speed</span>}
                          <span className="badge" style={{ color: '#f59e0b', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)' }}>+{result.xpEarned} XP</span>
                        </div>
                      </div>
                    </div>
                    <div className="fb-box" style={{ background: 'rgba(0,200,255,.04)', border: '1px solid rgba(0,200,255,.1)' }}>
                      <div style={{ display: 'flex', gap: 9 }}>
                        <span style={{ color: '#00c8ff', fontSize: 14, flexShrink: 0, fontWeight: 900 }}>Σ</span>
                        <p style={{ color: '#7dd3fc', fontSize: 13, lineHeight: 1.6, fontStyle: 'italic' }}>"{result.feedback}"</p>
                      </div>
                    </div>
                    <div className="res-stats">
                      {[
                        { label: 'Your time', value: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` },
                        { label: 'Estimated', value: `${challenge.estimatedMinutes}m 0s` },
                        { label: 'Speed', value: elapsed <= estSecs ? '🔥 Faster' : elapsed <= estSecs * 1.5 ? '😐 Slow' : '🐌 Too slow' },
                      ].map(s => (
                        <div key={s.label} className="s-cell">
                          <div className="s-val">{s.value}</div>
                          <div className="s-lbl">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <button className="reset-btn" onClick={reset} style={{ background: 'rgba(0,200,255,.08)', border: '1px solid rgba(0,200,255,.25)', color: '#00c8ff' }}>🔁 New Challenge</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {phase === 'chat' && userMsgCount === 0 && (
            <div className="how-grid">
              {[
                { n: '01', title: 'Talk to SIGMA', desc: "Tell SIGMA what you're learning. Be specific or face judgment.", c: '#00c8ff' },
                { n: '02', title: 'Get Challenged', desc: 'AI generates a custom timed coding challenge for your topic.', c: '#f59e0b' },
                { n: '03', title: 'Race the Clock', desc: 'Beat the estimate for bonus score. Fall behind and SIGMA notices.', c: '#ef4444' },
                { n: '04', title: 'Get Graded', desc: 'Score, grade, XP — all stored and visualized in your analytics above.', c: '#00ff96' },
              ].map(item => (
                <div key={item.n} className="how-card">
                  <div className="how-n" style={{ color: item.c }}>{item.n}</div>
                  <div className="how-t">{item.title}</div>
                  <div className="how-d">{item.desc}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}