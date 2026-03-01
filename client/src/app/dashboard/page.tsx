'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart2,
  Brain,
  Calendar,
  CheckCircle, ChevronRight, Clock,
  Flame, Globe, LogOut,
  RefreshCw,
  Star,
  Target, TrendingUp, Trophy, Users, Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Area, AreaChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface DailyTask {
  id: string
  title: string
  description: string
  category: string
  estimatedMinutes: number
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  completedAt?: string
  date: string
}

interface DayPerf {
  date: string
  label: string
  score: number
  tasks: number
  grade: string
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split('T')[0]

function gradeFromScore(s: number) {
  if (s >= 90) return 'S'
  if (s >= 75) return 'A'
  if (s >= 60) return 'B'
  if (s >= 45) return 'C'
  return 'F'
}

function gradeColor(g: string) {
  return g === 'S' ? '#a855f7' : g === 'A' ? '#00ff96' : g === 'B' ? '#00c8ff' : g === 'C' ? '#f59e0b' : '#ef4444'
}

function scoreBarColor(s: number) {
  if (s >= 75) return '#00c8ff'
  if (s >= 50) return '#f59e0b'
  return '#ef4444'
}

// ──────────────────────────────────────────────────────────────
// localStorage helpers (tasks + daily performance)
// ──────────────────────────────────────────────────────────────
function loadTasks(): DailyTask[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('re_daily_tasks') || '[]') } catch { return [] }
}
function saveTasks(tasks: DailyTask[]) {
  localStorage.setItem('re_daily_tasks', JSON.stringify(tasks))
}
function loadPerf(): DayPerf[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('re_daily_perf') || '[]') } catch { return [] }
}
function savePerf(perf: DayPerf[]) {
  localStorage.setItem('re_daily_perf', JSON.stringify(perf))
}

// ──────────────────────────────────────────────────────────────
// Gauge component (Fear & Greed style from image)
// ──────────────────────────────────────────────────────────────
function GaugeChart({ value, max = 100, label, color }: { value: number; max?: number; label: string; color: string }) {
  const pct = Math.min(value / max, 1)
  const angle = -150 + pct * 300 // sweep from -150° to +150°
  const r = 54
  const cx = 70, cy = 70
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcPath = (startDeg: number, endDeg: number, fill: string, strokeW = 8) => {
    const s = toRad(startDeg), e = toRad(endDeg)
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return <path d={`M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2}`} fill="none" stroke={fill} strokeWidth={strokeW} strokeLinecap="round" />
  }
  // needle
  const needleRad = toRad(angle)
  const nx = cx + 42 * Math.cos(needleRad)
  const ny = cy + 42 * Math.sin(needleRad)

  return (
    <svg width="140" height="90" viewBox="0 0 140 90" style={{ overflow: 'visible' }}>
      {/* track segments: red → yellow → green */}
      {arcPath(-150, -90, '#ef444430', 10)}
      {arcPath(-90, -30, '#f59e0b30', 10)}
      {arcPath(-30, 30,  '#22c55e30', 10)}
      {arcPath(30,  90,  '#3b82f630', 10)}
      {arcPath(90,  150, '#a855f730', 10)}
      {/* active fill */}
      {pct > 0 && arcPath(-150, -150 + pct * 300, color, 10)}
      {/* needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={color} />
      {/* value */}
      <text x={cx} y={cy + 22} textAnchor="middle" fill="#fff" fontSize={18} fontWeight={900} fontFamily="monospace">{value}</text>
      <text x={cx} y={cy + 36} textAnchor="middle" fill="#555" fontSize={8} fontFamily="monospace" letterSpacing={1}>{label}</text>
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────
// Daily Performance Card (image-inspired layout)
// ──────────────────────────────────────────────────────────────
function DailyPerfSection({ perf }: { perf: DayPerf[] }) {
  const last7 = perf.slice(-7)
  const todayPerf = perf.find(p => p.date === todayKey())
  const avgScore = last7.length ? Math.round(last7.reduce((a, b) => a + b.score, 0) / last7.length) : 0
  const totalTasks = last7.reduce((a, b) => a + b.tasks, 0)

  const gaugeColor = avgScore >= 75 ? '#22c55e' : avgScore >= 50 ? '#f59e0b' : '#ef4444'

  const miniData = last7.map(d => ({ name: d.label, score: d.score, tasks: d.tasks }))

  return (
    <div className="perf-section">
      <div className="section-header">
        <div className="section-title-row">
          <BarChart2 size={15} style={{ color: '#00c8ff' }} />
          <span>Daily Performance</span>
        </div>
        <span className="section-sub">{todayKey()}</span>
      </div>

      {/* Top row: Gauge + Stats */}
      <div className="perf-top-row">
        {/* Gauge */}
        <div className="gauge-wrap">
          <div className="gauge-label-top">Performance Index</div>
          <GaugeChart value={avgScore} label="7-DAY AVG" color={gaugeColor} />
          <div className="gauge-meta">
            <span style={{ color: gaugeColor, fontWeight: 700, fontFamily: 'monospace' }}>{gradeFromScore(avgScore)}</span>
            <span style={{ color: '#374151', fontSize: 10 }}> rank</span>
          </div>
        </div>

        {/* Mini stats */}
        <div className="perf-mini-stats">
          <div className="mini-stat">
            <div className="mini-stat-val" style={{ color: '#00c8ff' }}>{totalTasks}</div>
            <div className="mini-stat-lbl">Tasks Done</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-val" style={{ color: '#00ff96' }}>{last7.filter(d => d.score >= 60).length}</div>
            <div className="mini-stat-lbl">Good Days</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-val" style={{ color: '#f59e0b' }}>{todayPerf?.score ?? '—'}</div>
            <div className="mini-stat-lbl">Today</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-val" style={{ color: '#a855f7' }}>{last7.length ? Math.max(...last7.map(d => d.score)) : '—'}</div>
            <div className="mini-stat-lbl">Best Day</div>
          </div>
        </div>
      </div>

      {/* Volume line chart (bottom of image) */}
      <div className="perf-chart-label">Score Trend — Last 7 Days</div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={miniData} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00c8ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00c8ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#374151', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#374151', fontSize: 8 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#060810', border: '1px solid rgba(0,200,255,.2)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: any) => [`${v}/100`, 'Score']}
            />
            <Area type="monotone" dataKey="score" stroke="#00c8ff" strokeWidth={2} fill="url(#perfGrad)" dot={{ fill: '#00c8ff', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Day-by-day list */}
      <div className="perf-day-list">
        {last7.length === 0 ? (
          <div className="empty-state">
            <Calendar size={24} style={{ color: '#1f2937', margin: '0 auto 8px' }} />
            <p>Complete tasks to see daily performance</p>
          </div>
        ) : last7.slice().reverse().map((d, i) => (
          <div key={i} className="perf-day-row">
            <div className="perf-day-date">{d.date}</div>
            <div className="perf-day-bar-wrap">
              <div className="perf-day-bar" style={{ width: `${d.score}%`, background: scoreBarColor(d.score) }} />
            </div>
            <div className="perf-day-score" style={{ color: gradeColor(d.grade) }}>{d.score}</div>
            <div className="perf-day-grade" style={{ color: gradeColor(d.grade) }}>{d.grade}</div>
            <div className="perf-day-tasks">{d.tasks}t</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// AI Task Section
// ──────────────────────────────────────────────────────────────
function AITaskSection({ tasks, onToggle, onRefresh, loading }: {
  tasks: DailyTask[]; onToggle: (id: string) => void; onRefresh: () => void; loading: boolean
}) {
  const today = todayKey()
  const todayTasks = tasks.filter(t => t.date === today)
  const done = todayTasks.filter(t => t.completed).length
  const total = todayTasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const prioColor = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
  const catColor: Record<string, string> = { coding: '#00c8ff', dsa: '#a855f7', system: '#f59e0b', review: '#00ff96', practice: '#fb923c' }

  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-title-row">
          <Target size={15} style={{ color: '#00ff96' }} />
          <span>Today's AI Tasks</span>
          <span className="today-date">{today}</span>
        </div>
        <button className={`refresh-btn ${loading ? 'spin-active' : ''}`} onClick={onRefresh} disabled={loading} title="Get new tasks from AI">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="task-progress-wrap">
          <div className="task-progress-track">
            <div className="task-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="task-progress-label">{done}/{total} done · {pct}%</span>
        </div>
      )}

      {/* Task list */}
      <div className="task-list">
        {todayTasks.length === 0 ? (
          <div className="empty-state">
            <Brain size={28} style={{ color: '#1f2937', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ color: '#374151', fontSize: 12, textAlign: 'center' }}>
              No tasks for today.<br />
              <span style={{ color: '#1f2937', fontSize: 11 }}>Click refresh to get AI-generated tasks</span>
            </p>
          </div>
        ) : todayTasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'task-done' : ''}`} onClick={() => onToggle(task.id)}>
            <div className="task-check" style={{ borderColor: task.completed ? '#00ff96' : 'rgba(255,255,255,.15)', background: task.completed ? '#00ff9614' : 'transparent' }}>
              {task.completed && <CheckCircle size={13} style={{ color: '#00ff96' }} />}
            </div>
            <div className="task-body">
              <div className="task-title" style={{ color: task.completed ? '#374151' : '#e2e8f0', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
              <div className="task-desc">{task.description}</div>
              <div className="task-meta-row">
                <span className="task-cat" style={{ color: catColor[task.category] || '#00c8ff', background: `${catColor[task.category] || '#00c8ff'}14`, border: `1px solid ${catColor[task.category] || '#00c8ff'}25` }}>
                  {task.category}
                </span>
                <span className="task-time"><Clock size={9} style={{ display: 'inline', marginRight: 3 }} />{task.estimatedMinutes}m</span>
                <span className="task-prio" style={{ color: prioColor[task.priority] }}>● {task.priority}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Recent Tests Graph
// ──────────────────────────────────────────────────────────────
function RecentTestsGraph({ tests }: { tests: any[] }) {
  const chartData = tests.slice(0, 10).reverse().map((t, i) => ({
    name: `T${i + 1}`,
    score: t.score,
    date: new Date(t.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    passed: t.passed,
  }))

  return (
    <div className="tests-graph-section">
      <div className="section-header">
        <div className="section-title-row">
          <TrendingUp size={15} style={{ color: '#3b82f6' }} />
          <span>Recent Tests</span>
        </div>
        <div className="tests-legend">
          <span className="legend-dot" style={{ background: '#22c55e' }} /> Pass
          <span className="legend-dot" style={{ background: '#ef4444', marginLeft: 8 }} /> Fail
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="empty-state">
          <BarChart2 size={28} style={{ color: '#1f2937', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ color: '#374151', fontSize: 12, textAlign: 'center' }}>No tests yet.<br /><span style={{ color: '#1f2937', fontSize: 11 }}>Complete tasks to unlock tests</span></p>
        </div>
      ) : (
        <>
          <div style={{ height: 130 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                <defs>
                  <linearGradient id="testGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#374151', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#374151', fontSize: 8 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#060810', border: '1px solid rgba(59,130,246,.25)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any, _, props) => [`${v}% · ${props.payload?.passed ? 'PASS' : 'FAIL'}`, props.payload?.date]}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#testGrad)"
                  dot={(p: any) => <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill={p.payload.passed ? '#22c55e' : '#ef4444'} stroke="none" />} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Test row list */}
          <div className="test-list">
            {tests.slice(0, 5).map((t: any, i: number) => (
              <div key={i} className="test-row">
                <div>
                  <div className="test-diff">{t.difficulty}</div>
                  <div className="test-date">{new Date(t.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="test-score" style={{ color: t.passed ? '#22c55e' : '#ef4444' }}>
                  {t.score}%
                  <span className="test-badge" style={{ background: t.passed ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: t.passed ? '#22c55e' : '#ef4444', border: `1px solid ${t.passed ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}` }}>
                    {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [perf, setPerf] = useState<DayPerf[]>([])
  const [taskLoading, setTaskLoading] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/user/dashboard')
      return res.data.data
    },
  })

  // Load persisted tasks + perf
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) router.push('/login')
    setTasks(loadTasks())
    setPerf(loadPerf())
    setTimeout(() => setMounted(true), 100)
  }, [router])

  useEffect(() => { if (error) toast.error('Failed to load dashboard') }, [error])

  // Auto-generate tasks if none for today
  useEffect(() => {
    if (!mounted) return
    const today = todayKey()
    const todayTasks = tasks.filter(t => t.date === today)
    if (todayTasks.length === 0) generateTasks()
  }, [mounted])

  // Update daily perf when tasks change
  useEffect(() => {
    if (tasks.length === 0) return
    const today = todayKey()
    const todayTasks = tasks.filter(t => t.date === today)
    if (todayTasks.length === 0) return
    const done = todayTasks.filter(t => t.completed).length
    const score = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0
    const dayLabel = new Date().toLocaleDateString('en', { weekday: 'short' })
    setPerf(prev => {
      const copy = [...prev]
      const idx = copy.findIndex(p => p.date === today)
      const entry: DayPerf = { date: today, label: dayLabel, score, tasks: done, grade: gradeFromScore(score) }
      if (idx >= 0) copy[idx] = entry
      else copy.push(entry)
      const limited = copy.slice(-30)
      savePerf(limited)
      return limited
    })
  }, [tasks])

  async function generateTasks() {
    setTaskLoading(true)
    const today = todayKey()
    try {
      const profile = data?.profile
      const track = profile?.targetTrack || 'software engineering'
      const level = profile?.level || 'intermediate'

      const res = await api.post('/tasks/sigma', {
        system: 'You are an AI learning coach. Generate exactly 5 daily learning tasks as valid JSON array only. No markdown, no extra text.',
        messages: [{
          role: 'user',
          content: `Generate 5 daily learning tasks for a ${level} ${track} developer. Today is ${today}.
Output ONLY a JSON array like:
[{"id":"t1","title":"Task title","description":"Brief 1-sentence description","category":"coding","estimatedMinutes":30,"priority":"high"},...]
Categories: coding, dsa, system, review, practice. Priority: high/medium/low.`
        }]
      })

      const raw = res.data.reply?.replace(/```json|```/g, '').trim()
      const parsed: Omit<DailyTask, 'completed' | 'date'>[] = JSON.parse(raw)
      const newTasks: DailyTask[] = parsed.map((t, i) => ({
        ...t,
        id: `${today}-${i}`,
        completed: false,
        date: today,
      }))

      setTasks(prev => {
        const filtered = prev.filter(t => t.date !== today)
        const merged = [...filtered, ...newTasks]
        saveTasks(merged)
        return merged
      })
      toast.success('AI tasks generated for today!')
    } catch {
      // fallback static tasks
      const fallback: DailyTask[] = [
        { id: `${today}-0`, title: 'Solve 2 LeetCode medium problems', description: 'Focus on arrays and sliding window techniques', category: 'dsa', estimatedMinutes: 45, priority: 'high', completed: false, date: today },
        { id: `${today}-1`, title: 'Read system design chapter', description: 'Cover load balancing and caching patterns', category: 'system', estimatedMinutes: 30, priority: 'medium', completed: false, date: today },
        { id: `${today}-2`, title: 'Build a REST API endpoint', description: 'Practice CRUD operations with validation', category: 'coding', estimatedMinutes: 60, priority: 'high', completed: false, date: today },
        { id: `${today}-3`, title: 'Review yesterday\'s mistakes', description: 'Revisit failed tests and incorrect solutions', category: 'review', estimatedMinutes: 20, priority: 'medium', completed: false, date: today },
        { id: `${today}-4`, title: 'Mock interview practice', description: 'Answer 3 behavioral questions out loud', category: 'practice', estimatedMinutes: 25, priority: 'low', completed: false, date: today },
      ]
      setTasks(prev => {
        const filtered = prev.filter(t => t.date !== today)
        const merged = [...filtered, ...fallback]
        saveTasks(merged)
        return merged
      })
    } finally {
      setTaskLoading(false)
    }
  }

  function toggleTask(id: string) {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t)
      saveTasks(updated)
      return updated
    })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030307' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 20px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(0,200,255,0.1)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#00c8ff', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <p style={{ color: '#374151', fontSize: 10, letterSpacing: '4px', fontFamily: 'monospace' }}>LOADING</p>
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
    competitive: { color: '#00c8ff', glow: 'rgba(0,200,255,0.4)' },
    elite:       { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
    legendary:   { color: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
  }
  const tier = tierConfig[profile?.tier] || tierConfig.developing

  const modeConfig: Record<string, { bg: string; text: string; border: string }> = {
    normal:      { bg: 'rgba(255,255,255,0.06)', text: '#9ca3af', border: 'rgba(255,255,255,0.12)' },
    competitive: { bg: 'rgba(0,200,255,0.12)',  text: '#00c8ff', border: 'rgba(0,200,255,0.35)' },
    harsh:       { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.35)' },
  }
  const mode = modeConfig[profile?.mode] || modeConfig.normal

  const rankCards = [
    { icon: <Users size={15} />, label: 'Batch Rank', rank: ranks?.batchRank, total: ranks?.batchTotal, sub: ranks?.batchCode, color: '#22c55e' },
    { icon: <Trophy size={15} />, label: 'Track Rank', rank: ranks?.trackRank, total: ranks?.trackRankTotal, sub: `${profile?.targetTrack}`, color: '#00c8ff' },
    { icon: <Globe size={15} />, label: 'Platform', rank: ranks?.platformRank, total: ranks?.platformRankTotal,
      sub: ranks?.weeklyMovement > 0 ? `↑ +${ranks.weeklyMovement} this week` : 'All users', color: '#a78bfa' },
  ]

  const statCards = [
    { icon: <Brain size={13} />, label: 'Mastery', value: `${performance?.masteryPercent || 0}%`, progress: performance?.masteryPercent || 0, color: '#fbbf24' },
    { icon: <Zap size={13} />, label: 'Reality Score', value: performance?.realityScore || 0, progress: Math.min(performance?.realityScore || 0, 100), color: '#00c8ff' },
    { icon: <Flame size={13} />, label: 'Streak', value: `${performance?.streakCurrent || 0}d`, sub: `Best: ${performance?.streakLongest || 0}d`, color: '#fb923c' },
    { icon: <CheckCircle size={13} />, label: 'Tasks Done', value: performance?.completedTasks || 0, sub: `of ${performance?.totalTasks || 0}`, color: '#34d399' },
  ]

  const quickActions = [
    { icon: <Trophy size={16} />, color: '#fbbf24', title: 'Leaderboard', sub: 'Global rankings', path: '/leaderboard' },
    { icon: <Brain size={16} />, color: '#00c8ff', title: 'AI Mentor', sub: 'Chat with AI', path: '/ai-chat' },
    { icon: <Zap size={16} />, color: '#a78bfa', title: 'My Profile', sub: 'View full stats', path: '/profile' },
    { icon: <Star size={16} />, color: '#00ff96', title: 'SIGMA Tasks', sub: 'Challenge engine', path: '/tasks' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-c   { 0%,100%{box-shadow:0 0 0 0 rgba(0,200,255,.4)} 70%{box-shadow:0 0 0 10px rgba(0,200,255,0)} }
        @keyframes shimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        body { background:#030307; color:#fff; font-family:'Syne',sans-serif; -webkit-font-smoothing:antialiased; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:#1a1a2e; border-radius:2px; }

        .db-root { min-height:100vh; background:#030307; }
        .db-bg {
          position:fixed; inset:0; pointer-events:none; z-index:0;
          background:
            radial-gradient(ellipse 700px 500px at 0% 0%, rgba(0,200,255,.05) 0%, transparent 70%),
            radial-gradient(ellipse 600px 600px at 100% 100%, rgba(167,139,250,.04) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 50% 50%, rgba(0,255,150,.02) 0%, transparent 70%);
        }
        .db-wrap { position:relative; z-index:1; max-width:1400px; margin:0 auto; padding:28px 28px 80px; }

        /* HEADER */
        .db-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; gap:12px; flex-wrap:wrap; }
        .db-brand { display:flex; flex-direction:column; gap:4px; }
        .db-brand-name { font-size:24px; font-weight:800; letter-spacing:-0.5px; color:#fff; }
        .db-brand-name span { color:#00c8ff; }
        .db-brand-sub { font-size:9px; font-family:'IBM Plex Mono',monospace; color:#1f2937; letter-spacing:3px; text-transform:uppercase; }
        .db-header-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .db-mode-pill { font-size:10px; font-weight:700; font-family:'IBM Plex Mono',monospace; letter-spacing:2px; text-transform:uppercase; padding:5px 13px; border-radius:100px; }
        .db-logout { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.02); color:#555; cursor:pointer; transition:all .2s; font-family:'Syne',sans-serif; }
        .db-logout:hover { background:rgba(255,255,255,.06); color:#aaa; }

        /* PROFILE */
        .db-profile { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:20px; padding:20px 24px; margin-bottom:18px; display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
        .db-avatar { width:54px; height:54px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; flex-shrink:0; background:linear-gradient(135deg,#060810,#0d1117); }
        .db-profile-name { font-size:19px; font-weight:700; color:#f1f5f9; letter-spacing:-0.3px; margin-bottom:6px; }
        .db-profile-tags { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .db-tier-badge { font-size:9px; font-weight:800; font-family:'IBM Plex Mono',monospace; letter-spacing:1.5px; padding:3px 10px; border-radius:100px; }
        .db-profile-tag { font-size:12px; color:#374151; text-transform:capitalize; }

        /* RANKS */
        .db-rank-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:18px; }
        .db-rank-card { background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.05); border-radius:18px; padding:20px 22px; position:relative; overflow:hidden; transition:all .25s; cursor:default; }
        .db-rank-card:hover { background:rgba(255,255,255,.032); transform:translateY(-2px); }
        .db-rank-top { width:100%; height:1px; position:absolute; top:0; left:0; }
        .db-rank-lbl { display:flex; align-items:center; gap:6px; margin-bottom:12px; font-size:10px; font-weight:600; color:#2a2a2a; letter-spacing:.5px; text-transform:uppercase; font-family:'IBM Plex Mono',monospace; }
        .db-rank-num { font-size:48px; font-weight:900; color:#fff; line-height:1; letter-spacing:-2px; margin-bottom:6px; }
        .db-rank-num span { font-size:16px; font-weight:500; color:#1f2937; letter-spacing:0; margin-left:2px; }
        .db-rank-sub { font-size:10px; font-family:'IBM Plex Mono',monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        /* STATS */
        .db-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
        .db-stat-card { background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.05); border-radius:16px; padding:16px 18px; transition:all .25s; }
        .db-stat-card:hover { background:rgba(255,255,255,.032); transform:translateY(-2px); }
        .db-stat-lbl { display:flex; align-items:center; gap:5px; margin-bottom:8px; font-size:9px; color:#1f2937; text-transform:uppercase; letter-spacing:1.5px; font-family:'IBM Plex Mono',monospace; }
        .db-stat-val { font-size:26px; font-weight:800; color:#f0f0f0; letter-spacing:-0.5px; line-height:1; margin-bottom:4px; }
        .db-stat-sub { font-size:10px; color:#1f2937; margin-top:4px; font-family:'IBM Plex Mono',monospace; }
        .db-prog-track { width:100%; height:2px; background:rgba(255,255,255,.04); border-radius:100px; overflow:hidden; margin-top:8px; }
        .db-prog-fill { height:100%; border-radius:100px; }

        /* MAIN GRID */
        .main-grid { display:grid; grid-template-columns:1.2fr 1fr 1fr; gap:16px; margin-bottom:18px; }

        /* SHARED SECTION CARD */
        .section-card { background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.055); border-radius:20px; padding:20px; height:100%; }
        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:8px; }
        .section-title-row { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:700; color:#e2e8f0; }
        .section-sub { font-size:10px; color:#1f2937; font-family:'IBM Plex Mono',monospace; }
        .today-date { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; background:rgba(255,255,255,.04); padding:2px 7px; border-radius:100px; }

        /* TASK SECTION */
        .task-section { background:rgba(255,255,255,.018); border:1px solid rgba(0,255,150,.08); border-radius:20px; padding:20px; }
        .refresh-btn { width:30px; height:30px; border-radius:8px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); color:#555; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
        .refresh-btn:hover { color:#00ff96; border-color:rgba(0,255,150,.3); background:rgba(0,255,150,.08); }
        .spin-active svg { animation:spin .7s linear infinite; }
        .task-progress-wrap { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .task-progress-track { flex:1; height:4px; background:rgba(255,255,255,.05); border-radius:100px; overflow:hidden; }
        .task-progress-fill { height:100%; background:linear-gradient(90deg,#00ff9680,#00ff96); border-radius:100px; transition:width .5s cubic-bezier(.4,0,.2,1); }
        .task-progress-label { font-size:10px; color:#374151; font-family:'IBM Plex Mono',monospace; white-space:nowrap; }
        .task-list { display:flex; flex-direction:column; gap:8px; max-height:340px; overflow-y:auto; }
        .task-item { display:flex; gap:10px; padding:11px 12px; border-radius:12px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); cursor:pointer; transition:all .2s; }
        .task-item:hover { background:rgba(255,255,255,.04); border-color:rgba(0,255,150,.12); }
        .task-done { opacity:.55; }
        .task-check { width:20px; height:20px; border-radius:6px; border:1.5px solid; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; transition:all .2s; }
        .task-body { flex:1; min-width:0; }
        .task-title { font-size:12.5px; font-weight:600; margin-bottom:3px; line-height:1.3; }
        .task-desc { font-size:11px; color:#374151; line-height:1.4; margin-bottom:6px; }
        .task-meta-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .task-cat { font-size:9px; font-weight:700; font-family:'IBM Plex Mono',monospace; letter-spacing:1px; padding:2px 7px; border-radius:100px; text-transform:uppercase; }
        .task-time { font-size:9px; color:#374151; font-family:'IBM Plex Mono',monospace; display:flex; align-items:center; }
        .task-prio { font-size:9px; font-family:'IBM Plex Mono',monospace; }

        /* TESTS GRAPH SECTION */
        .tests-graph-section { background:rgba(255,255,255,.018); border:1px solid rgba(59,130,246,.08); border-radius:20px; padding:20px; }
        .tests-legend { display:flex; align-items:center; font-size:10px; color:#374151; font-family:'IBM Plex Mono',monospace; gap:4px; }
        .legend-dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
        .test-list { margin-top:10px; display:flex; flex-direction:column; gap:6px; }
        .test-row { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-radius:10px; background:rgba(255,255,255,.02); }
        .test-diff { font-size:12px; font-weight:600; color:#9ca3af; text-transform:capitalize; }
        .test-date { font-size:10px; color:#1f2937; font-family:'IBM Plex Mono',monospace; margin-top:2px; }
        .test-score { font-size:14px; font-weight:800; display:flex; align-items:center; gap:6px; }
        .test-badge { font-size:9px; font-weight:700; font-family:'IBM Plex Mono',monospace; padding:2px 6px; border-radius:6px; }

        /* DAILY PERFORMANCE */
        .perf-section { background:rgba(255,255,255,.018); border:1px solid rgba(0,200,255,.08); border-radius:20px; padding:20px; }
        .perf-top-row { display:flex; gap:16px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
        .gauge-wrap { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
        .gauge-label-top { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:4px; }
        .gauge-meta { font-size:12px; color:#555; margin-top:4px; }
        .perf-mini-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; flex:1; }
        .mini-stat { background:rgba(255,255,255,.03); border-radius:10px; padding:10px 12px; border:1px solid rgba(255,255,255,.05); }
        .mini-stat-val { font-size:22px; font-weight:900; font-family:'IBM Plex Mono',monospace; line-height:1; letter-spacing:-1px; }
        .mini-stat-lbl { font-size:9px; color:#374151; margin-top:3px; text-transform:uppercase; letter-spacing:1px; }
        .perf-chart-label { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px; }
        .perf-day-list { margin-top:12px; display:flex; flex-direction:column; gap:5px; max-height:200px; overflow-y:auto; }
        .perf-day-row { display:flex; align-items:center; gap:8px; }
        .perf-day-date { font-size:9px; font-family:'IBM Plex Mono',monospace; color:#1f2937; width:72px; flex-shrink:0; }
        .perf-day-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,.04); border-radius:100px; overflow:hidden; }
        .perf-day-bar { height:100%; border-radius:100px; transition:width .4s; }
        .perf-day-score { font-size:11px; font-family:'IBM Plex Mono',monospace; font-weight:700; width:26px; text-align:right; flex-shrink:0; }
        .perf-day-grade { font-size:10px; font-weight:800; font-family:'IBM Plex Mono',monospace; width:14px; text-align:center; flex-shrink:0; }
        .perf-day-tasks { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; width:18px; text-align:right; flex-shrink:0; }

        /* QUICK ACTIONS */
        .actions-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .action-card { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:14px; border:1px solid rgba(255,255,255,.05); background:rgba(255,255,255,.018); cursor:pointer; transition:all .2s; }
        .action-card:hover { background:rgba(255,255,255,.04); transform:translateY(-2px); }
        .action-icon { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .action-title { font-size:12px; font-weight:700; color:#d1d5db; margin-bottom:2px; }
        .action-sub { font-size:10px; color:#1f2937; font-family:'IBM Plex Mono',monospace; }

        /* EMPTY */
        .empty-state { padding:28px 16px; text-align:center; color:#374151; font-size:11px; }

        /* ══════════ RESPONSIVE ══════════ */
        @media (max-width:1200px) {
          .main-grid { grid-template-columns:1fr 1fr; }
          .main-grid > .perf-full { grid-column:1/-1; }
        }
        @media (max-width:1024px) {
          .db-wrap { padding:22px 20px 60px; }
          .db-rank-num { font-size:40px; }
          .db-stat-val { font-size:22px; }
          .main-grid { grid-template-columns:1fr 1fr; gap:14px; }
        }
        @media (max-width:768px) {
          .db-wrap { padding:16px 14px 70px; }
          .db-rank-grid { grid-template-columns:repeat(3,1fr); gap:10px; }
          .db-rank-num { font-size:34px; }
          .db-rank-card { padding:14px 16px; }
          .db-stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .main-grid { grid-template-columns:1fr; gap:14px; }
          .perf-top-row { gap:12px; }
          .actions-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:560px) {
          .db-wrap { padding:14px 12px 72px; }
          .db-rank-grid { grid-template-columns:1fr; gap:8px; }
          .db-rank-card { display:flex; align-items:center; justify-content:space-between; gap:12px; }
          .db-rank-num { font-size:38px; margin-bottom:0; }
          .db-stats-grid { gap:8px; }
          .db-brand-sub { display:none; }
          .db-logout span { display:none; }
          .db-profile { padding:14px 16px; }
          .perf-mini-stats { grid-template-columns:repeat(4,1fr); }
          .mini-stat { padding:8px 10px; }
          .mini-stat-val { font-size:18px; }
          .actions-grid { grid-template-columns:1fr; }
        }
        @media (max-width:400px) {
          .db-wrap { padding:12px 10px 72px; }
          .db-stats-grid { grid-template-columns:1fr 1fr; gap:6px; }
          .db-stat-val { font-size:20px; }
          .perf-mini-stats { grid-template-columns:repeat(2,1fr); }
          .task-list { max-height:260px; }
        }
      `}</style>

      <div className="db-root">
        <div className="db-bg" />
        <div
          className="db-wrap"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity .5s ease, transform .5s ease' }}
        >

          {/* ── HEADER ── */}
          <div className="db-header">
            <div className="db-brand">
              <div className="db-brand-name">Reality<span>Engine</span></div>
              <div className="db-brand-sub">Competitive Dashboard</div>
            </div>
            <div className="db-header-right">
              <span className="db-mode-pill" style={{ background: mode.bg, color: mode.text, border: `1px solid ${mode.border}` }}>
                {profile?.mode} Mode
              </span>
              <button className="db-logout" onClick={logout}>
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* ── PROFILE ── */}
          <div className="db-profile" style={{ animation: mounted ? 'fadeUp .4s ease both' : 'none' }}>
            <div className="db-avatar" style={{ border: `2px solid ${tier.color}30`, boxShadow: `0 0 24px ${tier.glow}`, color: tier.color }}>
              {profile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-profile-name">{profile?.username || 'User'}</div>
              <div className="db-profile-tags">
                <span className="db-tier-badge" style={{ color: tier.color, background: `${tier.color}14`, border: `1px solid ${tier.color}28` }}>
                  {(profile?.tier || 'developing').toUpperCase()}
                </span>
                <span style={{ color: '#1f2937' }}>·</span>
                <span className="db-profile-tag">{profile?.targetTrack}</span>
                <span style={{ color: '#1f2937' }}>·</span>
                <span className="db-profile-tag">{profile?.level}</span>
              </div>
            </div>
          </div>

          {/* ── RANK CARDS ── */}
          <div className="db-rank-grid">
            {rankCards.map((item, i) => (
              <div key={i} className="db-rank-card" style={{ animation: mounted ? `fadeUp .4s ease ${i * 60}ms both` : 'none' }}>
                <div className="db-rank-top" style={{ background: `linear-gradient(90deg,transparent,${item.color}50,transparent)` }} />
                <div className="db-rank-lbl">
                  <span style={{ color: item.color }}>{item.icon}</span>
                  {item.label}
                </div>
                <div className="db-rank-num">#{item.rank || '—'}<span>/{item.total || '?'}</span></div>
                <div className="db-rank-sub" style={{ color: item.color + 'aa' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* ── STAT CARDS ── */}
          <div className="db-stats-grid">
            {statCards.map((item, i) => (
              <div key={i} className="db-stat-card" style={{ animation: mounted ? `fadeUp .4s ease ${100 + i * 50}ms both` : 'none' }}>
                <div className="db-stat-lbl">
                  <span style={{ color: item.color }}>{item.icon}</span>
                  {item.label}
                </div>
                <div className="db-stat-val">{item.value}</div>
                {item.progress !== undefined && (
                  <div className="db-prog-track">
                    <div className="db-prog-fill" style={{ width: `${item.progress}%`, background: `linear-gradient(90deg,${item.color}70,${item.color})`, boxShadow: `0 0 8px ${item.color}50` }} />
                  </div>
                )}
                {item.sub && <div className="db-stat-sub">{item.sub}</div>}
              </div>
            ))}
          </div>

          {/* ── MAIN 3-COL GRID: Tasks | Tests | Performance ── */}
          <div className="main-grid">
            {/* AI Tasks */}
            <AITaskSection tasks={tasks} onToggle={toggleTask} onRefresh={generateTasks} loading={taskLoading} />
            {/* Recent Tests Graph */}
            <RecentTestsGraph tests={data?.recentTests || []} />
            {/* Daily Performance */}
            <DailyPerfSection perf={perf} />
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div className="section-card" style={{ background: 'rgba(255,255,255,.018)', border: '1px solid rgba(255,255,255,.055)', borderRadius: 20, padding: 20 }}>
            <div className="section-header">
              <div className="section-title-row">
                <ChevronRight size={15} style={{ color: '#a78bfa' }} />
                <span>Quick Actions</span>
              </div>
            </div>
            <div className="actions-grid">
              {quickActions.map((item, i) => (
                <button key={i} className="action-card" onClick={() => router.push(item.path)}
                  style={{ background: 'rgba(255,255,255,.018)', border: '1px solid rgba(255,255,255,.05)', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'inherit', fontFamily: 'inherit' }}>
                  <div className="action-icon" style={{ background: `${item.color}14`, color: item.color }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="action-title">{item.title}</div>
                    <div className="action-sub">{item.sub}</div>
                  </div>
                  <ChevronRight size={13} style={{ color: '#1f2937', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}