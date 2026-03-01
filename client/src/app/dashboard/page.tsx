'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart2, Brain, Calendar, CheckCircle, ChevronRight, Clock,
  Flame, Globe, LogOut, RefreshCw, Star, Target, TrendingUp, Trophy, Users, Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  RadialBar, RadialBarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface DailyTask {
  id: string; title: string; description: string; category: string
  estimatedMinutes: number; priority: 'high' | 'medium' | 'low'
  completed: boolean; completedAt?: string; date: string
}
interface DayPerf { date: string; label: string; score: number; tasks: number; grade: string }
interface TestRecord {
  id: string; score: number; passed: boolean; difficulty: string
  date: string; timeTaken?: number; topic?: string
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split('T')[0]
const gradeFromScore = (s: number) => s >= 90 ? 'S' : s >= 75 ? 'A' : s >= 60 ? 'B' : s >= 45 ? 'C' : 'F'
const gradeColor = (g: string) => g === 'S' ? '#a855f7' : g === 'A' ? '#00ff96' : g === 'B' ? '#00c8ff' : g === 'C' ? '#f59e0b' : '#ef4444'
const scoreBarColor = (s: number) => s >= 75 ? '#00c8ff' : s >= 50 ? '#f59e0b' : '#ef4444'

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────
const loadTasks = (): DailyTask[] => { try { return JSON.parse(localStorage.getItem('re_daily_tasks') || '[]') } catch { return [] } }
const saveTasks = (t: DailyTask[]) => localStorage.setItem('re_daily_tasks', JSON.stringify(t))
const loadPerf = (): DayPerf[] => { try { return JSON.parse(localStorage.getItem('re_daily_perf') || '[]') } catch { return [] } }
const savePerf = (p: DayPerf[]) => localStorage.setItem('re_daily_perf', JSON.stringify(p))
const loadTestHistory = (): TestRecord[] => { try { return JSON.parse(localStorage.getItem('re_test_history') || '[]') } catch { return [] } }
const saveTestHistory = (t: TestRecord[]) => localStorage.setItem('re_test_history', JSON.stringify(t))

// ─────────────────────────────────────────────
// Gauge SVG
// ─────────────────────────────────────────────
function GaugeChart({ value, max = 100, label, color }: { value: number; max?: number; label: string; color: string }) {
  const pct = Math.min(value / max, 1)
  const angle = -150 + pct * 300
  const r = 54, cx = 70, cy = 70
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcPath = (s: number, e: number, fill: string, w = 8) => {
    const sr = toRad(s), er = toRad(e)
    const x1 = cx + r * Math.cos(sr), y1 = cy + r * Math.sin(sr)
    const x2 = cx + r * Math.cos(er), y2 = cy + r * Math.sin(er)
    return <path d={`M${x1},${y1} A${r},${r} 0 ${e - s > 180 ? 1 : 0},1 ${x2},${y2}`} fill="none" stroke={fill} strokeWidth={w} strokeLinecap="round" />
  }
  const nx = cx + 42 * Math.cos(toRad(angle)), ny = cy + 42 * Math.sin(toRad(angle))
  return (
    <svg width="140" height="90" viewBox="0 0 140 90" style={{ overflow: 'visible' }}>
      {arcPath(-150, -90, '#ef444430', 10)}{arcPath(-90, -30, '#f59e0b30', 10)}
      {arcPath(-30, 30, '#22c55e30', 10)}{arcPath(30, 90, '#3b82f630', 10)}{arcPath(90, 150, '#a855f730', 10)}
      {pct > 0 && arcPath(-150, -150 + pct * 300, color, 10)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={color} />
      <text x={cx} y={cy + 22} textAnchor="middle" fill="#fff" fontSize={18} fontWeight={900} fontFamily="monospace">{value}</text>
      <text x={cx} y={cy + 36} textAnchor="middle" fill="#555" fontSize={8} fontFamily="monospace" letterSpacing={1}>{label}</text>
    </svg>
  )
}

// ─────────────────────────────────────────────
// RICH TEST PERFORMANCE SECTION
// ─────────────────────────────────────────────
function TestPerformanceSection({ apiTests }: { apiTests: any[] }) {
  const [localTests, setLocalTests] = useState<TestRecord[]>([])
  const [activeView, setActiveView] = useState<'trend' | 'dist' | 'heatmap'>('trend')

  useEffect(() => {
    const stored = loadTestHistory()
    if (apiTests?.length) {
      const merged = [...stored]
      apiTests.forEach((t: any) => {
        const id = t.id || t.createdAt
        if (!merged.find(m => m.id === id)) {
          merged.push({ id, score: t.score, passed: t.passed, difficulty: t.difficulty || 'medium', date: t.createdAt || new Date().toISOString(), timeTaken: t.timeTaken, topic: t.topic })
        }
      })
      merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      saveTestHistory(merged)
      setLocalTests(merged)
    } else {
      setLocalTests(stored)
    }
  }, [apiTests])

  const allTests = localTests
  const total = allTests.length
  const passed = allTests.filter(t => t.passed).length
  const avgScore = total ? Math.round(allTests.reduce((a, b) => a + b.score, 0) / total) : 0
  const best = total ? Math.max(...allTests.map(t => t.score)) : 0
  const passRate = total ? Math.round((passed / total) * 100) : 0
  const streak = (() => { let s = 0; for (let i = allTests.length - 1; i >= 0; i--) { if (allTests[i].passed) s++; else break; } return s })()

  const trendData = allTests.slice(-20).map((t, i, arr) => ({
    idx: i + 1,
    score: t.score,
    avg: Math.round(arr.slice(0, i + 1).reduce((a, b) => a + b.score, 0) / (i + 1)),
    passed: t.passed,
    date: new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    diff: t.difficulty,
    label: `T${allTests.slice(-20).indexOf(t) + allTests.length - 19}`
  }))

  const buckets = [
    { range: '0–39', min: 0, max: 39, color: '#ef4444' },
    { range: '40–59', min: 40, max: 59, color: '#f59e0b' },
    { range: '60–74', min: 60, max: 74, color: '#00c8ff' },
    { range: '75–89', min: 75, max: 89, color: '#22c55e' },
    { range: '90+', min: 90, max: 100, color: '#a855f7' },
  ].map(b => ({ ...b, count: allTests.filter(t => t.score >= b.min && t.score <= b.max).length }))

  const heatmap = Array.from({ length: 49 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (48 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayTests = allTests.filter(t => t.date.startsWith(dateStr))
    const avg = dayTests.length ? Math.round(dayTests.reduce((a, b) => a + b.score, 0) / dayTests.length) : null
    return { date: dateStr, count: dayTests.length, avg, day: d.getDay(), week: Math.floor(i / 7) }
  })
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const cellColor = (avg: number | null, count: number) => {
    if (!count || avg === null) return 'rgba(255,255,255,0.04)'
    if (avg >= 90) return 'rgba(168,85,247,0.85)'
    if (avg >= 75) return 'rgba(34,197,94,0.85)'
    if (avg >= 60) return 'rgba(0,200,255,0.85)'
    if (avg >= 40) return 'rgba(245,158,11,0.85)'
    return 'rgba(239,68,68,0.85)'
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    return <circle cx={cx} cy={cy} r={4} fill={payload.passed ? '#00ff96' : '#ef4444'} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
  }

  const TrendTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: '#060d14', border: `1px solid ${d.passed ? 'rgba(0,255,150,.3)' : 'rgba(239,68,68,.3)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 11 }}>
        <div style={{ color: '#888', marginBottom: 4, fontFamily: 'monospace' }}>{d.date} · {d.diff}</div>
        <div style={{ color: d.passed ? '#00ff96' : '#ef4444', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{d.score}%</div>
        <div style={{ color: '#555', fontSize: 10 }}>Rolling avg: {d.avg}%</div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="test-perf-wrap">
        <div className="section-header">
          <div className="section-title-row"><TrendingUp size={15} style={{ color: '#3b82f6' }} /><span>Test Performance</span></div>
        </div>
        <div className="test-empty">
          <div className="test-empty-ring">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(59,130,246,.15)" strokeWidth="3" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="20 160" strokeLinecap="round" />
            </svg>
            <span style={{ position: 'absolute', fontSize: 20 }}>📊</span>
          </div>
          <p style={{ color: '#374151', fontSize: 12, marginTop: 12 }}>No tests yet</p>
          <p style={{ color: '#1f2937', fontSize: 10, fontFamily: 'monospace' }}>Complete tasks to unlock tests</p>
        </div>
      </div>
    )
  }

  return (
    <div className="test-perf-wrap">
      {/* Header */}
      <div className="section-header">
        <div className="section-title-row">
          <TrendingUp size={15} style={{ color: '#3b82f6' }} />
          <span>Test Performance</span>
          <span className="test-total-badge">{total} tests</span>
        </div>
        <div className="test-view-tabs">
          {(['trend', 'dist', 'heatmap'] as const).map(v => (
            <button key={v} className={`test-tab ${activeView === v ? 'active' : ''}`} onClick={() => setActiveView(v)}>
              {v === 'trend' ? '📈' : v === 'dist' ? '📊' : '🗓'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="test-kpi-row">
        {[
          { label: 'Avg', value: `${avgScore}%`, color: scoreBarColor(avgScore) },
          { label: 'Best', value: `${best}%`, color: '#a855f7' },
          { label: 'Pass', value: `${passRate}%`, color: '#00ff96' },
          { label: 'Streak', value: `${streak}✓`, color: '#f59e0b' },
        ].map((k, i) => (
          <div key={i} className="test-kpi">
            <div className="test-kpi-val" style={{ color: k.color }}>{k.value}</div>
            <div className="test-kpi-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Radial pass rate + grade breakdown */}
      <div className="test-radial-row">
        <div style={{ position: 'relative', width: 86, height: 86, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%"
              data={[{ value: passRate, fill: passRate >= 70 ? '#00ff96' : passRate >= 50 ? '#f59e0b' : '#ef4444' }]}
              startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,.04)' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: passRate >= 70 ? '#00ff96' : passRate >= 50 ? '#f59e0b' : '#ef4444' }}>{passRate}%</div>
            <div style={{ fontSize: 7, color: '#374151', letterSpacing: 1, textTransform: 'uppercase' }}>pass</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {['S', 'A', 'B', 'C', 'F'].map(g => {
              const [minS, maxS] = g === 'S' ? [90, 100] : g === 'A' ? [75, 89] : g === 'B' ? [60, 74] : g === 'C' ? [45, 59] : [0, 44]
              const cnt = allTests.filter(t => t.score >= minS && t.score <= maxS).length
              return (
                <div key={g} style={{ textAlign: 'center', minWidth: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: gradeColor(g), fontFamily: 'monospace', lineHeight: 1 }}>{cnt}</div>
                  <div style={{ fontSize: 9, color: gradeColor(g) + '70', fontFamily: 'monospace' }}>{g}</div>
                </div>
              )
            })}
          </div>
          {/* Grade bar */}
          <div style={{ height: 5, background: 'rgba(255,255,255,.04)', borderRadius: 100, overflow: 'hidden', display: 'flex' }}>
            {buckets.map((b, i) => b.count > 0 && <div key={i} style={{ height: '100%', width: `${(b.count / total) * 100}%`, background: b.color }} />)}
          </div>
          <div style={{ fontSize: 8, color: '#1f2937', marginTop: 4, fontFamily: 'monospace', letterSpacing: .5 }}>grade distribution</div>
        </div>
      </div>

      {/* TREND VIEW */}
      {activeView === 'trend' && (
        <div className="test-chart-wrap">
          <div style={{ fontSize: 9, color: '#1f2937', fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Score Trend · Last {Math.min(trendData.length, 20)} Tests
          </div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                <defs>
                  <linearGradient id="trendGradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="avgGradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#374151', fontSize: 8 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(trendData.length / 5) - 1)} />
                <YAxis domain={[0, 100]} tick={{ fill: '#374151', fontSize: 8 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TrendTooltip />} />
                <Area type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" fill="url(#avgGradB)" dot={false} />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#trendGradB)" dot={<CustomDot />} activeDot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
            {[{ w: 12, h: 2, bg: '#3b82f6', lbl: 'Score' }, { w: 12, h: 2, bg: '#f59e0b', lbl: 'Avg', dashed: true }].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
                <div style={{ width: l.w, height: l.h, background: l.bg, borderTop: l.dashed ? `2px dashed ${l.bg}` : undefined }} /> {l.lbl}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff96' }} />Pass
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />Fail
            </div>
          </div>
        </div>
      )}

      {/* DISTRIBUTION VIEW */}
      {activeView === 'dist' && (
        <div className="test-chart-wrap">
          <div style={{ fontSize: 9, color: '#1f2937', fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Score Distribution · {total} Total</div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -30 }} barGap={4}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: '#374151', fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#374151', fontSize: 8 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#060d14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${v} tests`, 'Count']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {buckets.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {buckets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                {b.range}: <span style={{ color: b.color }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEATMAP VIEW */}
      {activeView === 'heatmap' && (
        <div className="test-chart-wrap">
          <div style={{ fontSize: 9, color: '#1f2937', fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Activity Heatmap · Last 7 Weeks
          </div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
            <div style={{ width: 26, flexShrink: 0 }} />
            {Array.from({ length: 7 }, (_, w) => (
              <div key={w} style={{ flex: 1, textAlign: 'center', fontSize: 7, color: '#1f2937', fontFamily: 'monospace' }}>W{w + 1}</div>
            ))}
          </div>
          {dayLabels.map((day, d) => (
            <div key={d} style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'center' }}>
              <div style={{ width: 26, fontSize: 7, color: '#1f2937', fontFamily: 'monospace', textAlign: 'right', paddingRight: 4, flexShrink: 0 }}>{day}</div>
              {Array.from({ length: 7 }, (_, w) => {
                const cell = heatmap.find(h => h.week === w && h.day === d)
                return (
                  <div key={w}
                    title={cell?.count ? `${cell.date}: ${cell.count} tests${cell.avg !== null ? `, avg ${cell.avg}%` : ''}` : ''}
                    style={{ flex: 1, height: 14, borderRadius: 3, background: cell ? cellColor(cell.avg, cell.count) : 'rgba(255,255,255,0.03)', transition: 'transform .15s', cursor: cell?.count ? 'pointer' : 'default' }}
                    onMouseEnter={e => { if (cell?.count) (e.target as HTMLElement).style.transform = 'scale(1.3)' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)' }}
                  />
                )
              })}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { l: 'None', c: 'rgba(255,255,255,0.04)' }, { l: '<40', c: 'rgba(239,68,68,0.85)' },
              { l: '40-59', c: 'rgba(245,158,11,0.85)' }, { l: '60-74', c: 'rgba(0,200,255,0.85)' },
              { l: '75-89', c: 'rgba(34,197,94,0.85)' }, { l: '90+', c: 'rgba(168,85,247,0.85)' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: '#374151', fontFamily: 'monospace' }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: l.c, border: '1px solid rgba(255,255,255,.08)' }} />{l.l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent tests list */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 9, color: '#1f2937', fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Recent</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {allTests.slice(-5).reverse().map((t, i) => (
            <div key={i} style={{ padding: '7px 10px', borderRadius: 8, background: `linear-gradient(90deg, ${scoreBarColor(t.score)}15, transparent)`, borderLeft: `2px solid ${scoreBarColor(t.score)}60` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'capitalize' }}>{t.difficulty}</span>
                  <span style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>{new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: scoreBarColor(t.score), fontFamily: 'monospace' }}>{t.score}%</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', background: t.passed ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: t.passed ? '#22c55e' : '#ef4444', border: `1px solid ${t.passed ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}` }}>{t.passed ? 'PASS' : 'FAIL'}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: gradeColor(gradeFromScore(t.score)), fontFamily: 'monospace', width: 12 }}>{gradeFromScore(t.score)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Daily Performance Section
// ─────────────────────────────────────────────
function DailyPerfSection({ perf }: { perf: DayPerf[] }) {
  const last7 = perf.slice(-7)
  const todayPerf = perf.find(p => p.date === todayKey())
  const avgScore = last7.length ? Math.round(last7.reduce((a, b) => a + b.score, 0) / last7.length) : 0
  const totalTasks = last7.reduce((a, b) => a + b.tasks, 0)
  const gaugeColor = avgScore >= 75 ? '#22c55e' : avgScore >= 50 ? '#f59e0b' : '#ef4444'
  const miniData = last7.map(d => ({ name: d.label, score: d.score }))

  return (
    <div className="perf-section">
      <div className="section-header">
        <div className="section-title-row"><BarChart2 size={15} style={{ color: '#00c8ff' }} /><span>Daily Performance</span></div>
        <span className="section-sub">{todayKey()}</span>
      </div>
      <div className="perf-top-row">
        <div className="gauge-wrap">
          <div className="gauge-label-top">Performance Index</div>
          <GaugeChart value={avgScore} label="7-DAY AVG" color={gaugeColor} />
          <div className="gauge-meta">
            <span style={{ color: gaugeColor, fontWeight: 700, fontFamily: 'monospace' }}>{gradeFromScore(avgScore)}</span>
            <span style={{ color: '#374151', fontSize: 10 }}> rank</span>
          </div>
        </div>
        <div className="perf-mini-stats">
          {[
            { val: totalTasks, lbl: 'Tasks Done', color: '#00c8ff' },
            { val: last7.filter(d => d.score >= 60).length, lbl: 'Good Days', color: '#00ff96' },
            { val: todayPerf?.score ?? '—', lbl: 'Today', color: '#f59e0b' },
            { val: last7.length ? Math.max(...last7.map(d => d.score)) : '—', lbl: 'Best Day', color: '#a855f7' },
          ].map((s, i) => (
            <div key={i} className="mini-stat">
              <div className="mini-stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="mini-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="perf-chart-label">Score Trend — Last 7 Days</div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={miniData} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
            <defs>
              <linearGradient id="perfGradDB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00c8ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00c8ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#374151', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#374151', fontSize: 8 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#060810', border: '1px solid rgba(0,200,255,.2)', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${v}/100`, 'Score']} />
            <Area type="monotone" dataKey="score" stroke="#00c8ff" strokeWidth={2} fill="url(#perfGradDB)" dot={{ fill: '#00c8ff', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="perf-day-list">
        {last7.length === 0 ? (
          <div className="empty-state"><Calendar size={24} style={{ color: '#1f2937', margin: '0 auto 8px' }} /><p>Complete tasks to see daily performance</p></div>
        ) : last7.slice().reverse().map((d, i) => (
          <div key={i} className="perf-day-row">
            <div className="perf-day-date">{d.date}</div>
            <div className="perf-day-bar-wrap"><div className="perf-day-bar" style={{ width: `${d.score}%`, background: scoreBarColor(d.score) }} /></div>
            <div className="perf-day-score" style={{ color: gradeColor(d.grade) }}>{d.score}</div>
            <div className="perf-day-grade" style={{ color: gradeColor(d.grade) }}>{d.grade}</div>
            <div className="perf-day-tasks">{d.tasks}t</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// AI Task Section
// ─────────────────────────────────────────────
function AITaskSection({ tasks, onToggle, onRefresh, loading }: {
  tasks: DailyTask[]; onToggle: (id: string) => void; onRefresh: () => void; loading: boolean
}) {
  const today = todayKey()
  const todayTasks = tasks.filter(t => t.date === today)
  const done = todayTasks.filter(t => t.completed).length
  const total = todayTasks.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const prioColor: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
  const catColor: Record<string, string> = { coding: '#00c8ff', dsa: '#a855f7', system: '#f59e0b', review: '#00ff96', practice: '#fb923c' }

  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-title-row">
          <Target size={15} style={{ color: '#00ff96' }} />
          <span>Today's AI Tasks</span>
          <span className="today-date">{today}</span>
        </div>
        <button className={`refresh-btn ${loading ? 'spin-active' : ''}`} onClick={onRefresh} disabled={loading}><RefreshCw size={13} /></button>
      </div>
      {total > 0 && (
        <div className="task-progress-wrap">
          <div className="task-progress-track"><div className="task-progress-fill" style={{ width: `${pct}%` }} /></div>
          <span className="task-progress-label">{done}/{total} done · {pct}%</span>
        </div>
      )}
      <div className="task-list">
        {todayTasks.length === 0 ? (
          <div className="empty-state">
            <Brain size={28} style={{ color: '#1f2937', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ color: '#374151', fontSize: 12, textAlign: 'center' }}>No tasks for today.<br /><span style={{ color: '#1f2937', fontSize: 11 }}>Click refresh to get AI-generated tasks</span></p>
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
                <span className="task-cat" style={{ color: catColor[task.category] || '#00c8ff', background: `${catColor[task.category] || '#00c8ff'}14`, border: `1px solid ${catColor[task.category] || '#00c8ff'}25` }}>{task.category}</span>
                <span className="task-time"><Clock size={9} style={{ display: 'inline', marginRight: 3 }} />{task.estimatedMinutes}m</span>
                <span className="task-prio" style={{ color: prioColor[task.priority] || '#9ca3af' }}>● {task.priority}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [perf, setPerf] = useState<DayPerf[]>([])
  const [taskLoading, setTaskLoading] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const res = await api.get('/user/dashboard'); return res.data.data },
  })

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) router.push('/login')
    setTasks(loadTasks()); setPerf(loadPerf())
    setTimeout(() => setMounted(true), 100)
  }, [router])

  useEffect(() => { if (error) toast.error('Failed to load dashboard') }, [error])

  useEffect(() => {
    if (!mounted) return
    if (tasks.filter(t => t.date === todayKey()).length === 0) generateTasks()
  }, [mounted])

  useEffect(() => {
    if (!tasks.length) return
    const today = todayKey()
    const todayTasks = tasks.filter(t => t.date === today)
    if (!todayTasks.length) return
    const done = todayTasks.filter(t => t.completed).length
    const score = Math.round((done / todayTasks.length) * 100)
    const dayLabel = new Date().toLocaleDateString('en', { weekday: 'short' })
    setPerf(prev => {
      const copy = [...prev]
      const idx = copy.findIndex(p => p.date === today)
      const entry: DayPerf = { date: today, label: dayLabel, score, tasks: done, grade: gradeFromScore(score) }
      if (idx >= 0) copy[idx] = entry; else copy.push(entry)
      const limited = copy.slice(-30); savePerf(limited); return limited
    })
  }, [tasks])

  async function generateTasks() {
    setTaskLoading(true); const today = todayKey()
    try {
      const profile = data?.profile
      const res = await api.post('/tasks/sigma', {
        system: 'You are an AI learning coach. Generate exactly 5 daily learning tasks as valid JSON array only. No markdown, no extra text.',
        messages: [{ role: 'user', content: `Generate 5 daily learning tasks for a ${profile?.level || 'intermediate'} ${profile?.targetTrack || 'software engineering'} developer. Today is ${today}. Output ONLY a JSON array like: [{"id":"t1","title":"Task title","description":"Brief 1-sentence description","category":"coding","estimatedMinutes":30,"priority":"high"},...]` }]
      })
      const parsed = JSON.parse(res.data.reply?.replace(/```json|```/g, '').trim())
      const newTasks: DailyTask[] = parsed.map((t: any, i: number) => ({ ...t, id: `${today}-${i}`, completed: false, date: today }))
      setTasks(prev => { const merged = [...prev.filter(t => t.date !== today), ...newTasks]; saveTasks(merged); return merged })
      toast.success('AI tasks generated!')
    } catch {
      const fallback: DailyTask[] = [
        { id: `${today}-0`, title: 'Solve 2 LeetCode medium problems', description: 'Focus on arrays and sliding window techniques', category: 'dsa', estimatedMinutes: 45, priority: 'high', completed: false, date: today },
        { id: `${today}-1`, title: 'Read system design chapter', description: 'Cover load balancing and caching patterns', category: 'system', estimatedMinutes: 30, priority: 'medium', completed: false, date: today },
        { id: `${today}-2`, title: 'Build a REST API endpoint', description: 'Practice CRUD operations with validation', category: 'coding', estimatedMinutes: 60, priority: 'high', completed: false, date: today },
        { id: `${today}-3`, title: "Review yesterday's mistakes", description: 'Revisit failed tests and incorrect solutions', category: 'review', estimatedMinutes: 20, priority: 'medium', completed: false, date: today },
        { id: `${today}-4`, title: 'Mock interview practice', description: 'Answer 3 behavioral questions out loud', category: 'practice', estimatedMinutes: 25, priority: 'low', completed: false, date: today },
      ]
      setTasks(prev => { const merged = [...prev.filter(t => t.date !== today), ...fallback]; saveTasks(merged); return merged })
    } finally { setTaskLoading(false) }
  }

  function toggleTask(id: string) {
    setTasks(prev => { const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t); saveTasks(updated); return updated })
  }

  if (isLoading) return (
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

  const profile = data?.profile, performance = data?.performance, ranks = data?.ranks
  const tierConfig: Record<string, { color: string; glow: string }> = {
    developing: { color: '#6b7280', glow: 'rgba(107,114,128,0.4)' }, rising: { color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
    competitive: { color: '#00c8ff', glow: 'rgba(0,200,255,0.4)' }, elite: { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
    legendary: { color: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
  }
  const tier = tierConfig[profile?.tier] || tierConfig.developing
  const modeConfig: Record<string, { bg: string; text: string; border: string }> = {
    normal: { bg: 'rgba(255,255,255,0.06)', text: '#9ca3af', border: 'rgba(255,255,255,0.12)' },
    competitive: { bg: 'rgba(0,200,255,0.12)', text: '#00c8ff', border: 'rgba(0,200,255,0.35)' },
    harsh: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.35)' },
  }
  const mode = modeConfig[profile?.mode] || modeConfig.normal
  const rankCards = [
    { icon: <Users size={15} />, label: 'Batch Rank', rank: ranks?.batchRank, total: ranks?.batchTotal, sub: ranks?.batchCode, color: '#22c55e' },
    { icon: <Trophy size={15} />, label: 'Track Rank', rank: ranks?.trackRank, total: ranks?.trackRankTotal, sub: `${profile?.targetTrack}`, color: '#00c8ff' },
    { icon: <Globe size={15} />, label: 'Platform', rank: ranks?.platformRank, total: ranks?.platformRankTotal, sub: ranks?.weeklyMovement > 0 ? `↑ +${ranks.weeklyMovement}` : 'All users', color: '#a78bfa' },
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
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        body { background:#030307; color:#fff; font-family:'Syne',sans-serif; -webkit-font-smoothing:antialiased; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:#1a1a2e; border-radius:2px; }

        .db-root { min-height:100vh; background:#030307; }
        .db-bg { position:fixed; inset:0; pointer-events:none; z-index:0;
          background:radial-gradient(ellipse 700px 500px at 0% 0%,rgba(0,200,255,.05) 0%,transparent 70%),
                     radial-gradient(ellipse 600px 600px at 100% 100%,rgba(167,139,250,.04) 0%,transparent 70%); }
        .db-wrap { position:relative; z-index:1; max-width:1400px; margin:0 auto; padding:28px 28px 80px; }

        .db-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; gap:12px; flex-wrap:wrap; }
        .db-brand { display:flex; flex-direction:column; gap:4px; }
        .db-brand-name { font-size:24px; font-weight:800; letter-spacing:-0.5px; }
        .db-brand-name span { color:#00c8ff; }
        .db-brand-sub { font-size:9px; font-family:'IBM Plex Mono',monospace; color:#1f2937; letter-spacing:3px; text-transform:uppercase; }
        .db-header-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .db-mode-pill { font-size:10px; font-weight:700; font-family:'IBM Plex Mono',monospace; letter-spacing:2px; text-transform:uppercase; padding:5px 13px; border-radius:100px; }
        .db-logout { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.02); color:#555; cursor:pointer; transition:all .2s; font-family:'Syne',sans-serif; }
        .db-logout:hover { background:rgba(255,255,255,.06); color:#aaa; }

        .db-profile { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:20px; padding:20px 24px; margin-bottom:18px; display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
        .db-avatar { width:54px; height:54px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; flex-shrink:0; background:linear-gradient(135deg,#060810,#0d1117); }
        .db-profile-name { font-size:19px; font-weight:700; color:#f1f5f9; letter-spacing:-0.3px; margin-bottom:6px; }
        .db-profile-tags { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .db-tier-badge { font-size:9px; font-weight:800; font-family:'IBM Plex Mono',monospace; letter-spacing:1.5px; padding:3px 10px; border-radius:100px; }
        .db-profile-tag { font-size:12px; color:#374151; text-transform:capitalize; }

        .db-rank-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:18px; }
        .db-rank-card { background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.05); border-radius:18px; padding:20px 22px; position:relative; overflow:hidden; transition:all .25s; }
        .db-rank-card:hover { background:rgba(255,255,255,.032); transform:translateY(-2px); }
        .db-rank-top { width:100%; height:1px; position:absolute; top:0; left:0; }
        .db-rank-lbl { display:flex; align-items:center; gap:6px; margin-bottom:12px; font-size:10px; font-weight:600; color:#2a2a2a; letter-spacing:.5px; text-transform:uppercase; font-family:'IBM Plex Mono',monospace; }
        .db-rank-num { font-size:48px; font-weight:900; color:#fff; line-height:1; letter-spacing:-2px; margin-bottom:6px; }
        .db-rank-num span { font-size:16px; font-weight:500; color:#1f2937; letter-spacing:0; margin-left:2px; }
        .db-rank-sub { font-size:10px; font-family:'IBM Plex Mono',monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .db-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
        .db-stat-card { background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.05); border-radius:16px; padding:16px 18px; transition:all .25s; }
        .db-stat-card:hover { background:rgba(255,255,255,.032); transform:translateY(-2px); }
        .db-stat-lbl { display:flex; align-items:center; gap:5px; margin-bottom:8px; font-size:9px; color:#1f2937; text-transform:uppercase; letter-spacing:1.5px; font-family:'IBM Plex Mono',monospace; }
        .db-stat-val { font-size:26px; font-weight:800; color:#f0f0f0; letter-spacing:-0.5px; line-height:1; margin-bottom:4px; }
        .db-stat-sub { font-size:10px; color:#1f2937; margin-top:4px; font-family:'IBM Plex Mono',monospace; }
        .db-prog-track { width:100%; height:2px; background:rgba(255,255,255,.04); border-radius:100px; overflow:hidden; margin-top:8px; }
        .db-prog-fill { height:100%; border-radius:100px; }

        .main-grid { display:grid; grid-template-columns:1.05fr 1.2fr 1fr; gap:16px; margin-bottom:18px; }

        /* Shared */
        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:8px; }
        .section-title-row { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:700; color:#e2e8f0; }
        .section-sub { font-size:10px; color:#1f2937; font-family:'IBM Plex Mono',monospace; }
        .today-date { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; background:rgba(255,255,255,.04); padding:2px 7px; border-radius:100px; }
        .empty-state { padding:28px 16px; text-align:center; color:#374151; font-size:11px; }

        /* Tasks */
        .task-section { background:rgba(255,255,255,.018); border:1px solid rgba(0,255,150,.08); border-radius:20px; padding:20px; }
        .refresh-btn { width:30px; height:30px; border-radius:8px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); color:#555; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
        .refresh-btn:hover { color:#00ff96; border-color:rgba(0,255,150,.3); background:rgba(0,255,150,.08); }
        .spin-active svg { animation:spin .7s linear infinite; }
        .task-progress-wrap { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .task-progress-track { flex:1; height:4px; background:rgba(255,255,255,.05); border-radius:100px; overflow:hidden; }
        .task-progress-fill { height:100%; background:linear-gradient(90deg,#00ff9680,#00ff96); border-radius:100px; transition:width .5s cubic-bezier(.4,0,.2,1); }
        .task-progress-label { font-size:10px; color:#374151; font-family:'IBM Plex Mono',monospace; white-space:nowrap; }
        .task-list { display:flex; flex-direction:column; gap:8px; max-height:360px; overflow-y:auto; }
        .task-item { display:flex; gap:10px; padding:11px 12px; border-radius:12px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); cursor:pointer; transition:all .2s; }
        .task-item:hover { background:rgba(255,255,255,.04); border-color:rgba(0,255,150,.12); }
        .task-done { opacity:.55; }
        .task-check { width:20px; height:20px; border-radius:6px; border:1.5px solid; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
        .task-body { flex:1; min-width:0; }
        .task-title { font-size:12.5px; font-weight:600; margin-bottom:3px; line-height:1.3; }
        .task-desc { font-size:11px; color:#374151; line-height:1.4; margin-bottom:6px; }
        .task-meta-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .task-cat { font-size:9px; font-weight:700; font-family:'IBM Plex Mono',monospace; letter-spacing:1px; padding:2px 7px; border-radius:100px; text-transform:uppercase; }
        .task-time { font-size:9px; color:#374151; font-family:'IBM Plex Mono',monospace; display:flex; align-items:center; }
        .task-prio { font-size:9px; font-family:'IBM Plex Mono',monospace; }

        /* Test Performance */
        .test-perf-wrap { background:rgba(255,255,255,.018); border:1px solid rgba(59,130,246,.1); border-radius:20px; padding:20px; }
        .test-total-badge { font-size:9px; font-family:'IBM Plex Mono',monospace; color:#374151; background:rgba(59,130,246,.12); border:1px solid rgba(59,130,246,.2); padding:2px 8px; border-radius:100px; }
        .test-view-tabs { display:flex; gap:4px; }
        .test-tab { width:28px; height:28px; border-radius:8px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.03); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:all .2s; }
        .test-tab.active { background:rgba(59,130,246,.15); border-color:rgba(59,130,246,.3); }
        .test-tab:hover:not(.active) { background:rgba(255,255,255,.06); }
        .test-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
        .test-kpi { background:rgba(255,255,255,.03); border-radius:10px; padding:8px 10px; border:1px solid rgba(255,255,255,.05); text-align:center; }
        .test-kpi-val { font-size:17px; font-weight:900; font-family:'IBM Plex Mono',monospace; letter-spacing:-0.5px; line-height:1; }
        .test-kpi-lbl { font-size:8px; color:#374151; text-transform:uppercase; letter-spacing:1.5px; margin-top:3px; }
        .test-radial-row { display:flex; gap:12px; align-items:center; margin-bottom:12px; }
        .test-chart-wrap { margin-bottom:4px; }
        .test-empty { padding:24px 0; text-align:center; }
        .test-empty-ring { position:relative; width:64px; height:64px; margin:0 auto; display:flex; align-items:center; justify-content:center; }

        /* Daily Performance */
        .perf-section { background:rgba(255,255,255,.018); border:1px solid rgba(0,200,255,.08); border-radius:20px; padding:20px; }
        .perf-top-row { display:flex; gap:16px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
        .gauge-wrap { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
        .gauge-label-top { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:4px; }
        .gauge-meta { font-size:12px; color:#555; margin-top:4px; }
        .perf-mini-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; flex:1; }
        .mini-stat { background:rgba(255,255,255,.03); border-radius:10px; padding:10px 12px; border:1px solid rgba(255,255,255,.05); }
        .mini-stat-val { font-size:20px; font-weight:900; font-family:'IBM Plex Mono',monospace; line-height:1; letter-spacing:-1px; }
        .mini-stat-lbl { font-size:9px; color:#374151; margin-top:3px; text-transform:uppercase; letter-spacing:1px; }
        .perf-chart-label { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px; }
        .perf-day-list { margin-top:12px; display:flex; flex-direction:column; gap:5px; max-height:180px; overflow-y:auto; }
        .perf-day-row { display:flex; align-items:center; gap:8px; }
        .perf-day-date { font-size:9px; font-family:'IBM Plex Mono',monospace; color:#1f2937; width:72px; flex-shrink:0; }
        .perf-day-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,.04); border-radius:100px; overflow:hidden; }
        .perf-day-bar { height:100%; border-radius:100px; transition:width .4s; }
        .perf-day-score { font-size:11px; font-family:'IBM Plex Mono',monospace; font-weight:700; width:26px; text-align:right; flex-shrink:0; }
        .perf-day-grade { font-size:10px; font-weight:800; font-family:'IBM Plex Mono',monospace; width:14px; text-align:center; flex-shrink:0; }
        .perf-day-tasks { font-size:9px; color:#1f2937; font-family:'IBM Plex Mono',monospace; width:18px; text-align:right; flex-shrink:0; }

        /* Quick Actions */
        .actions-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        .action-card { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:14px; border:1px solid rgba(255,255,255,.05); background:rgba(255,255,255,.018); cursor:pointer; transition:all .2s; width:100%; text-align:left; color:inherit; font-family:'Syne',sans-serif; }
        .action-card:hover { background:rgba(255,255,255,.04); transform:translateY(-2px); }
        .action-icon { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .action-title { font-size:12px; font-weight:700; color:#d1d5db; margin-bottom:2px; }
        .action-sub { font-size:10px; color:#1f2937; font-family:'IBM Plex Mono',monospace; }

        /* RESPONSIVE */
        @media (max-width:1280px) {
          .main-grid { grid-template-columns:1fr 1.15fr; }
          .main-grid > :nth-child(3) { grid-column:1/-1; }
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
          .db-stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .main-grid { grid-template-columns:1fr; gap:14px; }
          .actions-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:560px) {
          .db-wrap { padding:14px 12px 72px; }
          .db-rank-grid { grid-template-columns:1fr; gap:8px; }
          .db-rank-card { display:flex; align-items:center; justify-content:space-between; gap:12px; }
          .db-rank-num { font-size:38px; margin-bottom:0; }
          .db-brand-sub,.db-logout span { display:none; }
          .db-logout { padding:8px 10px; }
          .perf-mini-stats { grid-template-columns:repeat(4,1fr); }
          .mini-stat { padding:8px 8px; }
          .mini-stat-val { font-size:16px; }
          .actions-grid { grid-template-columns:1fr; }
          .test-kpi-row { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:400px) {
          .db-wrap { padding:12px 10px 72px; }
          .db-stats-grid { grid-template-columns:1fr 1fr; gap:6px; }
          .db-stat-val { font-size:20px; }
          .perf-mini-stats { grid-template-columns:repeat(2,1fr); }
        }
      `}</style>

      <div className="db-root">
        <div className="db-bg" />
        <div className="db-wrap" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity .5s ease, transform .5s ease' }}>

          {/* HEADER */}
          <div className="db-header">
            <div className="db-brand">
              <div className="db-brand-name">Reality<span>Engine</span></div>
              <div className="db-brand-sub">Competitive Dashboard</div>
            </div>
            <div className="db-header-right">
              <span className="db-mode-pill" style={{ background: mode.bg, color: mode.text, border: `1px solid ${mode.border}` }}>{profile?.mode} Mode</span>
              <button className="db-logout" onClick={logout}><LogOut size={13} /><span>Logout</span></button>
            </div>
          </div>

          {/* PROFILE */}
          <div className="db-profile" style={{ animation: mounted ? 'fadeUp .4s ease both' : 'none' }}>
            <div className="db-avatar" style={{ border: `2px solid ${tier.color}30`, boxShadow: `0 0 24px ${tier.glow}`, color: tier.color }}>
              {profile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-profile-name">{profile?.username || 'User'}</div>
              <div className="db-profile-tags">
                <span className="db-tier-badge" style={{ color: tier.color, background: `${tier.color}14`, border: `1px solid ${tier.color}28` }}>{(profile?.tier || 'developing').toUpperCase()}</span>
                <span style={{ color: '#1f2937' }}>·</span>
                <span className="db-profile-tag">{profile?.targetTrack}</span>
                <span style={{ color: '#1f2937' }}>·</span>
                <span className="db-profile-tag">{profile?.level}</span>
              </div>
            </div>
          </div>

          {/* RANKS */}
          <div className="db-rank-grid">
            {rankCards.map((item, i) => (
              <div key={i} className="db-rank-card" style={{ animation: mounted ? `fadeUp .4s ease ${i * 60}ms both` : 'none' }}>
                <div className="db-rank-top" style={{ background: `linear-gradient(90deg,transparent,${item.color}50,transparent)` }} />
                <div className="db-rank-lbl"><span style={{ color: item.color }}>{item.icon}</span>{item.label}</div>
                <div className="db-rank-num">#{item.rank || '—'}<span>/{item.total || '?'}</span></div>
                <div className="db-rank-sub" style={{ color: item.color + 'aa' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* STATS */}
          <div className="db-stats-grid">
            {statCards.map((item, i) => (
              <div key={i} className="db-stat-card" style={{ animation: mounted ? `fadeUp .4s ease ${100 + i * 50}ms both` : 'none' }}>
                <div className="db-stat-lbl"><span style={{ color: item.color }}>{item.icon}</span>{item.label}</div>
                <div className="db-stat-val">{item.value}</div>
                {item.progress !== undefined && (
                  <div className="db-prog-track"><div className="db-prog-fill" style={{ width: `${item.progress}%`, background: `linear-gradient(90deg,${item.color}70,${item.color})`, boxShadow: `0 0 8px ${item.color}50` }} /></div>
                )}
                {item.sub && <div className="db-stat-sub">{item.sub}</div>}
              </div>
            ))}
          </div>

          {/* MAIN 3-COL GRID */}
          <div className="main-grid">
            <AITaskSection tasks={tasks} onToggle={toggleTask} onRefresh={generateTasks} loading={taskLoading} />
            <TestPerformanceSection apiTests={data?.recentTests || []} />
            <DailyPerfSection perf={perf} />
          </div>

          {/* QUICK ACTIONS */}
          <div style={{ background: 'rgba(255,255,255,.018)', border: '1px solid rgba(255,255,255,.055)', borderRadius: 20, padding: 20 }}>
            <div className="section-header">
              <div className="section-title-row"><ChevronRight size={15} style={{ color: '#a78bfa' }} /><span>Quick Actions</span></div>
            </div>
            <div className="actions-grid">
              {quickActions.map((item, i) => (
                <button key={i} className="action-card" onClick={() => router.push(item.path)}>
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