'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type TestPhase = 'setup' | 'active' | 'submitting' | 'result'
type QType = 'mcq' | 'short' | 'code' | 'truefalse'
type AppTab = 'exam' | 'history' | 'analytics' | 'leaderboard'

interface Question {
  id: number; type: QType; question: string; code?: string
  options?: string[]; correct: string; explanation: string; points: number; hint?: string
}
interface TestConfig {
  topic: string; difficulty: 'beginner' | 'intermediate' | 'advanced' | 'brutal'
  questionCount: number; timeLimitMinutes: number; enableHints: boolean
}
interface Answer {
  qId: number; value: string; isCorrect?: boolean; pointsEarned?: number
  flagged?: boolean; hintUsed?: boolean
}
interface TestResult {
  score: number; total: number; percentage: number; grade: string
  timeTaken: number; xpEarned: number; feedback: string; answers: Answer[]
}
interface HistoryEntry {
  id: string; topic: string; difficulty: string; percentage: number; grade: string
  score: number; total: number; correct: number; timeTaken: number; xpEarned: number
  date: string; questions: Question[]; answers: Answer[]
}
interface LeaderboardEntry {
  rank: number; userId: string; username: string; tier: string
  avgScore: number; bestScore: number; testCount: number; totalXP: number; isCurrentUser: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF = {
  beginner:     { label: 'Beginner',     color: '#22c55e', time: 15, q: 8,  xp: 1   },
  intermediate: { label: 'Intermediate', color: '#f59e0b', time: 20, q: 10, xp: 1.5 },
  advanced:     { label: 'Advanced',     color: '#ef4444', time: 25, q: 12, xp: 2   },
  brutal:       { label: 'BRUTAL',       color: '#a855f7', time: 30, q: 15, xp: 3   },
} as const

const GRADES: Record<string, { color: string; msg: string }> = {
  S: { color: '#a855f7', msg: "Fine. Not completely useless. Don't let it go to your head." },
  A: { color: '#22c55e', msg: "Above average. Still room to fail spectacularly, but you passed." },
  B: { color: '#3b82f6', msg: "Mediocre by my standards. The bar was low and you barely cleared it." },
  C: { color: '#f59e0b', msg: "You scraped through. That's not a compliment." },
  F: { color: '#ef4444', msg: "Disgraceful. Study harder or find a different career." },
}

const TOPICS = [
  'JavaScript Closures','React Hooks','Async/Await','CSS Flexbox',
  'TypeScript Generics','REST APIs','SQL Joins','Big O Notation',
  'Binary Search','Git Workflow','Docker Basics','Node.js Events',
  'Python Decorators','CSS Grid','WebSockets','GraphQL',
  'React Context','Redux Toolkit','Next.js','Tailwind CSS',
]

function calcGrade(p: number) {
  if (p >= 90) return 'S'; if (p >= 75) return 'A'
  if (p >= 60) return 'B'; if (p >= 45) return 'C'; return 'F'
}
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const hk = (uid: string) => uid ? `sigma_h_${uid}` : 'sigma_h'
function loadH(uid: string): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(hk(uid)) || '[]') } catch { return [] }
}
function saveH(uid: string, h: HistoryEntry[]) {
  localStorage.setItem(hk(uid), JSON.stringify(h.slice(0, 50)))
}
function migrate(uid: string) {
  if (!uid || localStorage.getItem(`sm_${uid}`)) return
  const old = localStorage.getItem('sigma_test_history')
  if (old && !localStorage.getItem(hk(uid))) localStorage.setItem(hk(uid), old)
  localStorage.setItem(`sm_${uid}`, '1')
}
async function callSIGMA(prompt: string, sys = '') {
  const res = await api.post('/tasks/sigma', {
    system: `You are SIGMA — a brutally honest AI testing examiner.${sys}`,
    messages: [{ role: 'user', content: prompt }],
  })
  return (res.data.reply ?? '') as string
}

// ─── Syntax highlight ─────────────────────────────────────────────────────────
function hl(code: string) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#4b5563;font-style:italic">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span style="color:#86efac">$1</span>')
    .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|typeof|new|this|true|false|null|undefined|from)\b/g, '<span style="color:#93c5fd">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fde68a">$1</span>')
    .replace(/\b(console|Math|Array|Object|Promise|JSON)\b/g, '<span style="color:#fb923c">$1</span>')
}

// ─── Global CSS ────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #08090f; color: #eeeef5; font-family: 'Barlow', sans-serif; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-thumb { background: #1e2133; border-radius: 2px; }
input, textarea, select { font-family: 'Barlow', sans-serif; }
button { font-family: 'Barlow', sans-serif; cursor: pointer; border: none; background: none; }
button:active { transform: scale(.97); }
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop   { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.25; } }
@keyframes toast { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
.fadeUp { animation: fadeUp .28s ease both; }
.pop    { animation: pop .22s ease both; }
`

// ─── Inline style helpers ─────────────────────────────────────────────────────
const S = {
  bg:   '#08090f',
  s1:   '#0d0e18',
  s2:   '#13152080',
  s3:   '#1a1d2e',
  b1:   'rgba(255,255,255,.07)',
  b2:   'rgba(255,255,255,.03)',
  t1:   '#eeeef5',
  t2:   '#8b90a8',
  t3:   '#3d4060',
  red:  '#ff3636',
  mono: "'JetBrains Mono', monospace",
  head: "'Barlow Condensed', sans-serif",
  body: "'Barlow', sans-serif",
}

type CSSProps = React.CSSProperties

const card: CSSProps = {
  background: S.s1,
  border: `1px solid ${S.b1}`,
  borderRadius: 16,
  padding: 20,
}
const cardSm: CSSProps = { ...card, padding: 14, borderRadius: 12 }

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: string; msg: string; color: string }
function useToast() {
  const [ts, set] = useState<Toast[]>([])
  const push = useCallback((msg: string, color = '#22c55e') => {
    const id = Math.random().toString(36).slice(2)
    set(p => [...p, { id, msg, color }])
    setTimeout(() => set(p => p.filter(t => t.id !== id)), 3000)
  }, [])
  return { ts, push, rm: (id: string) => set(p => p.filter(t => t.id !== id)) }
}
function Toasts({ ts, rm }: { ts: Toast[]; rm: (id: string) => void }) {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 290 }}>
      {ts.map(t => (
        <div key={t.id} onClick={() => rm(t.id)} style={{
          animation: 'toast .2s ease',
          background: 'rgba(12,13,22,.96)', backdropFilter: 'blur(12px)',
          border: `1px solid ${t.color}35`, borderLeft: `3px solid ${t.color}`,
          borderRadius: 10, padding: '9px 13px', color: t.color,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  const [cp, setCp] = useState(false)
  return (
    <div style={{ background: '#030407', border: '1px solid rgba(255,255,255,.05)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(255,255,255,.02)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(code).catch(() => {}); setCp(true); setTimeout(() => setCp(false), 1500) }}
          style={{ fontSize: 9, color: cp ? '#22c55e' : S.t3, fontFamily: S.mono, letterSpacing: 1 }}>
          {cp ? '✓ COPIED' : 'COPY'}
        </button>
      </div>
      <div style={{ padding: '14px 16px', fontFamily: S.mono, fontSize: 12.5, lineHeight: 1.9, overflowX: 'auto', whiteSpace: 'pre', color: '#e2e8f0' }}
        dangerouslySetInnerHTML={{ __html: hl(code) }} />
    </div>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function Ring({ pct, color, sz = 82 }: { pct: number; color: string; sz?: number }) {
  const r = sz * .37, c = 2 * Math.PI * r, sw = sz * .086
  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={S.s3} strokeWidth={sw} />
      <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
      <text x={sz / 2} y={sz / 2 - 3} textAnchor="middle" fill={color} fontSize={sz * .17} fontWeight="800" fontFamily="monospace">{pct}%</text>
      <text x={sz / 2} y={sz / 2 + 12} textAnchor="middle" fill={S.t3} fontSize={sz * .09} fontFamily="monospace">SCORE</text>
    </svg>
  )
}

// ─── QCard ────────────────────────────────────────────────────────────────────
function QCard({ q, idx, total, ans, onAns, revealed, flagged, onFlag, hintUsed, onHint, hintsOn }: {
  q: Question; idx: number; total: number; ans?: Answer
  onAns: (v: string) => void; revealed: boolean
  flagged?: boolean; onFlag?: () => void
  hintUsed?: boolean; onHint?: () => void; hintsOn?: boolean
}) {
  const [txt, setTxt] = useState(ans?.value ?? '')
  const [showHint, setShowHint] = useState(false)
  const ok = revealed && ans?.isCorrect
  const bad = revealed && ans && !ans.isCorrect

  const TYPE: Record<QType, { l: string; c: string; bg: string }> = {
    mcq:       { l: 'MCQ',        c: '#3b82f6', bg: 'rgba(59,130,246,.1)'  },
    code:      { l: 'CODE',       c: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
    truefalse: { l: 'TRUE/FALSE', c: '#a855f7', bg: 'rgba(168,85,247,.1)'  },
    short:     { l: 'SHORT',      c: '#22c55e', bg: 'rgba(34,197,94,.1)'   },
  }
  const m = TYPE[q.type]
  const borderColor = revealed
    ? (ok ? 'rgba(34,197,94,.3)' : bad ? 'rgba(239,68,68,.3)' : S.b1)
    : flagged ? 'rgba(245,158,11,.35)' : S.b1

  return (
    <div style={{ background: S.s1, border: `1px solid ${borderColor}`, borderRadius: 16, overflow: 'hidden', marginBottom: 12, transition: 'border-color .2s' }}>
      <div style={{ height: 3, background: revealed ? (ok ? '#22c55e' : bad ? '#ef4444' : S.s3) : flagged ? '#f59e0b' : m.c, opacity: .65 }} />
      <div style={{ padding: '16px 18px' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 30, height: 30, borderRadius: 8, background: revealed ? (ok ? 'rgba(34,197,94,.12)' : bad ? 'rgba(239,68,68,.12)' : S.s3) : m.bg, border: `1px solid ${revealed ? (ok ? 'rgba(34,197,94,.25)' : bad ? 'rgba(239,68,68,.25)' : S.b1) : m.c + '30'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: revealed ? 13 : 11, fontWeight: 700, fontFamily: S.mono, color: revealed ? (ok ? '#22c55e' : bad ? '#ef4444' : S.t3) : m.c, flexShrink: 0 }}>
            {revealed ? (ok ? '✓' : bad ? '✗' : '—') : idx + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: m.c, background: m.bg, border: `1px solid ${m.c}20`, borderRadius: 5, padding: '2px 7px', fontFamily: S.mono }}>{m.l}</span>
              <span style={{ fontSize: 9, color: S.t3, background: S.s3, borderRadius: 5, padding: '2px 7px', fontFamily: S.mono }}>{q.points}PTS</span>
              {hintUsed && <span style={{ fontSize: 9, color: '#f59e0b', fontFamily: S.mono }}>💡hint</span>}
            </div>
            <p style={{ color: S.t1, fontSize: 14, lineHeight: 1.7, fontWeight: 500 }}>{q.question}</p>
          </div>
          {!revealed && (
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {hintsOn && q.hint && onHint && (
                <button onClick={() => { setShowHint(s => !s); if (!hintUsed) onHint() }}
                  style={{ width: 28, height: 28, borderRadius: 7, background: hintUsed ? 'rgba(245,158,11,.1)' : S.s3, border: `1px solid ${hintUsed ? 'rgba(245,158,11,.4)' : S.b1}`, color: hintUsed ? '#f59e0b' : S.t3, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💡</button>
              )}
              {onFlag && (
                <button onClick={onFlag}
                  style={{ width: 28, height: 28, borderRadius: 7, background: flagged ? 'rgba(245,158,11,.1)' : S.s3, border: `1px solid ${flagged ? 'rgba(245,158,11,.4)' : S.b1}`, color: flagged ? '#f59e0b' : S.t3, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚑</button>
              )}
            </div>
          )}
        </div>

        {showHint && q.hint && (
          <div style={{ background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 9, padding: '9px 12px', marginBottom: 12, fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>
            <strong style={{ marginRight: 6 }}>💡</strong>{q.hint}
          </div>
        )}

        {q.code && <CodeBlock code={q.code} />}

        {!revealed && (
          <>
            {(q.type === 'mcq' || q.type === 'truefalse') && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map((opt, oi) => {
                  const sel = ans?.value === opt
                  return (
                    <button key={oi} onClick={() => onAns(opt)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 10, background: sel ? 'rgba(59,130,246,.1)' : S.s3, border: `1px solid ${sel ? 'rgba(59,130,246,.4)' : S.b1}`, color: sel ? '#93c5fd' : S.t2, fontSize: 13, textAlign: 'left', transition: 'all .12s' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: sel ? 'rgba(59,130,246,.2)' : S.s1, border: `1px solid ${sel ? 'rgba(59,130,246,.4)' : S.b1}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, fontFamily: S.mono, color: sel ? '#3b82f6' : S.t3, flexShrink: 0 }}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                      {sel && <span style={{ marginLeft: 'auto', color: '#3b82f6' }}>●</span>}
                    </button>
                  )
                })}
              </div>
            )}
            {(q.type === 'short' || q.type === 'code') && (
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea value={txt} onChange={e => setTxt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && txt.trim()) onAns(txt) }}
                  placeholder={q.type === 'code' ? 'Explain the output… (Ctrl+Enter)' : 'Your answer… (Ctrl+Enter)'}
                  rows={q.type === 'code' ? 3 : 2}
                  style={{ flex: 1, background: S.s3, border: `1px solid ${S.b1}`, borderRadius: 10, padding: '10px 12px', color: S.t1, fontSize: 13, fontFamily: q.type === 'code' ? S.mono : S.body, resize: 'vertical', lineHeight: 1.6, outline: 'none' }} />
                <button onClick={() => { if (txt.trim()) onAns(txt) }} disabled={!txt.trim()}
                  style={{ width: 36, borderRadius: 10, background: txt.trim() ? 'rgba(34,197,94,.18)' : S.s3, color: txt.trim() ? '#22c55e' : S.t3, fontSize: 16, transition: 'all .15s' }}>✓</button>
              </div>
            )}
          </>
        )}

        {revealed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ans?.value ? (
                <div style={{ background: ok ? 'rgba(34,197,94,.07)' : 'rgba(239,68,68,.07)', border: `1px solid ${ok ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`, borderRadius: 9, padding: '7px 12px' }}>
                  <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono, marginBottom: 3, letterSpacing: 1 }}>YOUR ANSWER</div>
                  <div style={{ fontSize: 13, color: ok ? '#86efac' : '#fca5a5' }}>{ans.value}</div>
                </div>
              ) : (
                <div style={{ background: S.s3, border: `1px solid ${S.b1}`, borderRadius: 9, padding: '7px 12px' }}>
                  <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono }}>SKIPPED</div>
                </div>
              )}
              {!ok && (
                <div style={{ background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 9, padding: '7px 12px' }}>
                  <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono, marginBottom: 3, letterSpacing: 1 }}>CORRECT</div>
                  <div style={{ fontSize: 13, color: '#86efac' }}>{q.correct}</div>
                </div>
              )}
            </div>
            <div style={{ background: 'rgba(255,54,54,.05)', border: '1px solid rgba(255,54,54,.1)', borderRadius: 9, padding: '11px 13px' }}>
              <div style={{ fontSize: 9, color: S.red, letterSpacing: 1.5, marginBottom: 5, fontFamily: S.mono }}>Σ EXPLANATION</div>
              <p style={{ fontSize: 13, color: S.t2, lineHeight: 1.7 }}>{q.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics({ history }: { history: HistoryEntry[] }) {
  const [chart, setChart] = useState<'trend' | 'heat'>('trend')

  if (!history.length) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
      <p style={{ color: S.t2, fontSize: 14, fontWeight: 600 }}>No data yet</p>
      <p style={{ color: S.t3, fontSize: 12, marginTop: 6, fontFamily: S.mono }}>// take tests to unlock analytics</p>
    </div>
  )

  const avg = Math.round(history.reduce((a, b) => a + b.percentage, 0) / history.length)
  const best = Math.max(...history.map(h => h.percentage))
  const totalXP = history.reduce((a, b) => a + b.xpEarned, 0)
  const totalCorrect = history.reduce((a, b) => a + b.correct, 0)
  const totalQ = history.reduce((a, b) => a + (b.questions?.length || 0), 0)

  const byDiff: Record<string, number[]> = {}
  history.forEach(h => { (byDiff[h.difficulty] || (byDiff[h.difficulty] = [])).push(h.percentage) })
  const diffBars = Object.entries(byDiff).map(([d, s]) => ({
    label: d.slice(0, 3).toUpperCase(),
    val: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
    color: DIFF[d as keyof typeof DIFF]?.color || '#6b7280',
  }))
  const maxBar = Math.max(...diffBars.map(d => d.val), 1)

  const gradeDist: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, F: 0 }
  history.forEach(h => { gradeDist[h.grade] = (gradeDist[h.grade] || 0) + 1 })

  const topicMap: Record<string, number[]> = {}
  history.forEach(h => { (topicMap[h.topic] || (topicMap[h.topic] = [])).push(h.percentage) })
  const topics = Object.entries(topicMap)
    .map(([t, s]) => ({ t, avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length) }))
    .sort((a, b) => b.avg - a.avg)

  const recent = history.slice(0, 12).reverse()

  const heatmap = (() => {
    const m: Record<string, number> = {}
    history.forEach(h => { const d = new Date(h.date).toDateString(); m[d] = (m[d] || 0) + 1 })
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i))
      return { key: d.toDateString(), n: m[d.toDateString()] || 0 }
    })
  })()

  const ACHS = [
    { icon: '🩸', label: 'First Blood',  desc: 'Complete first test',  ok: history.length >= 1 },
    { icon: '💯', label: 'Perfect',      desc: 'Score 100%',           ok: history.some(e => e.percentage === 100) },
    { icon: '⚡', label: 'Speed Demon',  desc: 'Finish in <5 min',     ok: history.some(e => e.timeTaken < 300) },
    { icon: '💪', label: 'Grinder',      desc: 'Complete 10 tests',    ok: history.length >= 10 },
    { icon: '💀', label: 'Masochist',    desc: 'Pass BRUTAL exam',     ok: history.some(e => e.difficulty === 'brutal' && e.percentage >= 45) },
    { icon: '🎯', label: 'Sharp',        desc: 'Score A+ three times', ok: history.filter(e => e.grade === 'S' || e.grade === 'A').length >= 3 },
  ]

  const row2: CSSProps = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const sbox: CSSProps = { background: S.s3, borderRadius: 10, padding: '12px', textAlign: 'center' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary row — scrollable on tiny screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { l: 'Avg',      v: `${avg}%`,  c: GRADES[calcGrade(avg)].color },
          { l: 'Best',     v: `${best}%`, c: '#a855f7' },
          { l: 'Total XP', v: totalXP,    c: '#f59e0b' },
          { l: 'Accuracy', v: totalQ > 0 ? `${Math.round((totalCorrect / totalQ) * 100)}%` : '—', c: '#22c55e' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: '13px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, fontFamily: S.mono, lineHeight: 1, marginBottom: 3 }}>{s.v}</div>
            <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono, letterSpacing: 1 }}>{s.l.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, letterSpacing: 1.5 }}>PERFORMANCE</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['trend', 'heat'] as const).map(c => (
              <button key={c} onClick={() => setChart(c)}
                style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${chart === c ? 'rgba(255,54,54,.35)' : S.b1}`, background: chart === c ? 'rgba(255,54,54,.1)' : S.s3, color: chart === c ? S.red : S.t3, fontSize: 10, fontFamily: S.mono, textTransform: 'capitalize' as const }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        {chart === 'trend' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 72 }}>
            {recent.map((h, i) => {
              const col = GRADES[h.grade].color
              return (
                <div key={i} title={`${h.topic}: ${h.percentage}%`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 7, color: col, fontFamily: S.mono }}>{h.percentage}</div>
                  <div style={{ width: '100%', background: S.s3, borderRadius: 3, height: 52, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: `${h.percentage}%`, background: col, borderRadius: 3, opacity: .85 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {chart === 'heat' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 4 }}>
              {heatmap.map((d, i) => (
                <div key={i} title={`${d.key}: ${d.n}`} style={{ aspectRatio: '1', borderRadius: 3, background: d.n === 0 ? S.s3 : d.n === 1 ? 'rgba(34,197,94,.28)' : d.n === 2 ? 'rgba(34,197,94,.58)' : '#22c55e', transition: 'background .2s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 9, color: S.t3, fontFamily: S.mono }}>Less</span>
              {[S.s3, 'rgba(34,197,94,.28)', 'rgba(34,197,94,.58)', '#22c55e'].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              ))}
              <span style={{ fontSize: 9, color: S.t3, fontFamily: S.mono }}>More</span>
            </div>
          </>
        )}
      </div>

      {/* Diff + Grade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, letterSpacing: 1.5, marginBottom: 12 }}>AVG BY DIFFICULTY</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 70 }}>
            {diffBars.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 9, color: d.color, fontFamily: S.mono, fontWeight: 700 }}>{d.val}</div>
                <div style={{ width: '100%', background: S.s3, borderRadius: 4, height: 44, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: `${(d.val / maxBar) * 100}%`, background: d.color, opacity: .85, borderRadius: '3px 3px 0 0', transition: 'height .5s' }} />
                </div>
                <div style={{ fontSize: 8, color: S.t3, fontFamily: S.mono }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, letterSpacing: 1.5, marginBottom: 12 }}>GRADE DISTRIBUTION</div>
          <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
            {Object.entries(gradeDist).map(([g, n]) => n ? <div key={g} style={{ width: `${(n / history.length) * 100}%`, background: GRADES[g].color, opacity: .85 }} /> : null)}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(gradeDist).map(([g, n]) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: GRADES[g].color }} />
                <span style={{ fontSize: 11, color: GRADES[g].color, fontFamily: S.mono, fontWeight: 700 }}>{g}</span>
                <span style={{ fontSize: 11, color: S.t3 }}>{n}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Topics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { title: '🔥 Strongest', bc: 'rgba(34,197,94,.12)', tc: '#22c55e', data: topics.slice(0, 4) },
          { title: '💀 Needs Work', bc: 'rgba(239,68,68,.12)', tc: '#ef4444', data: [...topics].sort((a, b) => a.avg - b.avg).slice(0, 4) },
        ].map(sec => (
          <div key={sec.title} style={{ background: S.s1, border: `1px solid ${sec.bc}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 10, color: sec.tc, letterSpacing: 1.5, fontFamily: S.mono, marginBottom: 12 }}>{sec.title}</div>
            {sec.data.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <span style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, width: 14 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: S.t1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.t}</div>
                  <div style={{ height: 3, background: S.s3, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.avg}%`, background: GRADES[calcGrade(t.avg)].color, borderRadius: 2, transition: 'width .5s' }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: GRADES[calcGrade(t.avg)].color, fontFamily: S.mono, flexShrink: 0 }}>{t.avg}%</span>
              </div>
            ))}
            {!sec.data.length && <p style={{ color: S.t3, fontSize: 12, fontFamily: S.mono }}>// no data</p>}
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div style={card}>
        <div style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, letterSpacing: 1.5, marginBottom: 14 }}>ACHIEVEMENTS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {ACHS.map((a, i) => (
            <div key={i} style={{ borderRadius: 12, padding: '13px 10px', textAlign: 'center', background: a.ok ? 'rgba(245,158,11,.08)' : S.s3, border: `1px solid ${a.ok ? 'rgba(245,158,11,.25)' : S.b1}`, opacity: a.ok ? 1 : .4, transition: 'all .2s' }}>
              <div style={{ fontSize: 24, marginBottom: 5 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: a.ok ? '#f59e0b' : S.t3, marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 9, color: S.t3, lineHeight: 1.4, fontFamily: S.mono }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────────────────────
function History({ history, onReview }: { history: HistoryEntry[]; onReview: (e: HistoryEntry) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [sort, setSort] = useState<'date' | 'score'>('date')
  const sorted = [...history].sort((a, b) =>
    sort === 'score' ? b.percentage - a.percentage : new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  if (!history.length) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
      <p style={{ color: S.t2, fontSize: 14, fontWeight: 600 }}>No tests yet</p>
    </div>
  )
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'flex-end' }}>
        {(['date', 'score'] as const).map(s => (
          <button key={s} onClick={() => setSort(s)}
            style={{ padding: '6px 12px', borderRadius: 8, background: sort === s ? 'rgba(255,54,54,.12)' : S.s3, border: `1px solid ${sort === s ? 'rgba(255,54,54,.3)' : S.b1}`, color: sort === s ? S.red : S.t3, fontSize: 11, fontFamily: S.mono }}>
            {s === 'date' ? '⏱ Recent' : '📊 Score'}
          </button>
        ))}
      </div>
      {sorted.map(e => {
        const g = GRADES[e.grade], isOpen = open === e.id
        const diff = DIFF[e.difficulty as keyof typeof DIFF]
        return (
          <div key={e.id} style={{ background: S.s1, border: `1px solid ${isOpen ? g.color + '30' : S.b1}`, borderRadius: 14, marginBottom: 8, overflow: 'hidden', transition: 'border-color .2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : e.id)}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${g.color}12`, border: `2px solid ${g.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: g.color, fontFamily: S.mono, flexShrink: 0 }}>{e.grade}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.topic}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: diff?.color || S.t3, fontFamily: S.mono, fontWeight: 600 }}>{e.difficulty}</span>
                  <span style={{ fontSize: 10, color: S.t3, fontFamily: S.mono }}>{e.correct}/{e.questions?.length || '?'} correct</span>
                  <span style={{ fontSize: 10, color: S.t3, fontFamily: S.mono }}>{Math.floor(e.timeTaken / 60)}m {e.timeTaken % 60}s</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: g.color, fontFamily: S.mono, lineHeight: 1 }}>{e.percentage}%</div>
                <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 3, fontFamily: S.mono }}>+{e.xpEarned}xp</div>
              </div>
              <span style={{ color: S.t3, fontSize: 12, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${S.b2}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, marginBottom: 10 }}>
                  {new Date(e.date).toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { l: 'Correct', v: e.answers.filter(a => a.isCorrect).length, c: '#22c55e' },
                    { l: 'Wrong', v: e.answers.filter(a => a.value && !a.isCorrect).length, c: '#ef4444' },
                    { l: 'Skipped', v: e.answers.filter(a => !a.value).length, c: S.t3 },
                    { l: 'Flagged', v: e.answers.filter(a => a.flagged).length, c: '#f59e0b' },
                  ].map(s => (
                    <div key={s.l} style={{ background: S.s3, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.c, fontFamily: S.mono }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: S.t3, marginTop: 2, fontFamily: S.mono }}>{s.l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => onReview(e)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 10, color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>
                  📖 Full Review
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function fetch(t = '') {
    setLoading(true); setErr('')
    try {
      const r = await api.get(t ? `/tasks/leaderboard?topic=${encodeURIComponent(t)}` : '/tasks/leaderboard')
      setEntries(r.data.leaderboard || []); setMyRank(r.data.myRank || null)
      if (r.data.myTopics?.length) setTopics(r.data.myTopics)
      setTopic(r.data.topic || '')
    } catch { setErr('Failed to load.') } finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [])

  const mc = (r: number) => r === 1 ? '#fbbf24' : r === 2 ? '#9ca3af' : r === 3 ? '#f97316' : S.t3
  const mi = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`
  const pill = (active: boolean) => ({ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600 as const, background: active ? 'rgba(255,54,54,.12)' : S.s3, border: `1px solid ${active ? 'rgba(255,54,54,.3)' : S.b1}`, color: active ? S.red : S.t2, cursor: 'pointer' as const, whiteSpace: 'nowrap' as const })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, fontFamily: S.head, letterSpacing: '.5px' }}>{topic ? `Top — ${topic}` : 'Global Leaderboard'}</h2>
          {myRank && <p style={{ fontSize: 11, color: S.t3, fontFamily: S.mono, marginTop: 3 }}>Your rank: <span style={{ color: '#f59e0b', fontWeight: 700 }}>#{myRank}</span></p>}
        </div>
        <button onClick={() => fetch(topic)} style={{ ...pill(false), fontSize: 11 }}>↻ Refresh</button>
      </div>
      {topics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          <button onClick={() => { setTopic(''); fetch('') }} style={pill(!topic)}>All</button>
          {topics.map(t => <button key={t} onClick={() => { setTopic(t); fetch(t) }} style={pill(topic === t)}>{t}</button>)}
        </div>
      )}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,54,54,.15)', borderTopColor: S.red, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: S.t3, fontSize: 12, fontFamily: S.mono }}>// fetching rankings...</p>
        </div>
      )}
      {!loading && err && <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>{err}</div>}
      {!loading && !err && !entries.length && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <p style={{ color: S.t3, fontSize: 13 }}>No scores yet.</p>
        </div>
      )}
      {!loading && entries.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.12fr 1fr', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}>
          {[entries[1], entries[0], entries[2]].map((e, i) => {
            const rr = i === 0 ? 2 : i === 1 ? 1 : 3, c = mc(rr)
            return (
              <div key={e.rank} style={{ background: e.isCurrentUser ? `${c}15` : S.s1, border: `1px solid ${e.isCurrentUser ? c + '45' : c + '22'}`, borderRadius: 16, padding: '14px 10px', textAlign: 'center', height: [108, 132, 96][i], display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                <div style={{ fontSize: i === 1 ? 28 : 22 }}>{mi(rr)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.username}</div>
                <div style={{ fontSize: i === 1 ? 20 : 16, fontWeight: 900, color: c, fontFamily: S.mono }}>{e.avgScore}%</div>
                <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono }}>{e.testCount}x</div>
              </div>
            )
          })}
        </div>
      )}
      {!loading && entries.length > 0 && (
        <div style={{ background: S.s1, border: `1px solid ${S.b1}`, borderRadius: 16, overflow: 'hidden' }}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 72px 72px 52px 66px', padding: '10px 16px', borderBottom: `1px solid ${S.b1}` }}>
            {['Rank', 'Player', 'Avg', 'Best', 'Tests', 'XP'].map(h => (
              <div key={h} style={{ fontSize: 9, color: S.t3, fontFamily: S.mono, letterSpacing: 1.5 }}>{h}</div>
            ))}
          </div>
          {entries.map(e => {
            const c = mc(e.rank)
            return (
              <div key={e.rank} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 72px 72px 52px 66px', padding: '11px 16px', borderBottom: `1px solid ${S.b2}`, background: e.isCurrentUser ? 'rgba(255,54,54,.05)' : 'transparent' }}>
                <div style={{ fontSize: e.rank <= 3 ? 15 : 11, fontWeight: 700, color: c, fontFamily: S.mono, display: 'flex', alignItems: 'center' }}>{e.rank <= 3 ? mi(e.rank) : `#${e.rank}`}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: S.s3, border: `1px solid ${S.b1}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: S.t2, flexShrink: 0, fontFamily: S.mono }}>{e.username[0]?.toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: e.isCurrentUser ? S.red : S.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.username}{e.isCurrentUser && <span style={{ fontSize: 9, color: S.red, fontFamily: S.mono }}> (you)</span>}</div>
                    <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono }}>{e.tier}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: GRADES[calcGrade(e.avgScore)].color, fontFamily: S.mono, display: 'flex', alignItems: 'center' }}>{e.avgScore}%</div>
                <div style={{ fontSize: 11, color: S.t2, fontFamily: S.mono, display: 'flex', alignItems: 'center' }}>{e.bestScore}%</div>
                <div style={{ fontSize: 11, color: S.t3, fontFamily: S.mono, display: 'flex', alignItems: 'center' }}>{e.testCount}</div>
                <div style={{ fontSize: 11, color: '#f59e0b', fontFamily: S.mono, display: 'flex', alignItems: 'center' }}>{e.totalXP.toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TestPage() {
  const [tab, setTab] = useState<AppTab>('exam')
  const [phase, setPhase] = useState<TestPhase>('setup')
  const [cfg, setCfg] = useState<TestConfig>({ topic: '', difficulty: 'intermediate', questionCount: 10, timeLimitMinutes: 20, enableHints: true })
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [flags, setFlags] = useState<Set<number>>(new Set())
  const [hints, setHints] = useState<Set<number>>(new Set())
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<TestResult | null>(null)
  const [topicInput, setTopicInput] = useState('')
  const [activeQ, setActiveQ] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [review, setReview] = useState<HistoryEntry | null>(null)
  const [showFlagged, setShowFlagged] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { user } = useAuthStore()
  const uid = user?.id || ''
  const { ts, push, rm } = useToast()

  useEffect(() => { if (!uid) return; migrate(uid); setHistory(loadH(uid)) }, [uid])

  const diff = DIFF[cfg.difficulty]
  const tlSecs = cfg.timeLimitMinutes * 60
  const remaining = Math.max(0, tlSecs - elapsed)
  const answered = Object.keys(answers).length
  const pct = questions.length > 0 ? (answered / questions.length) * 100 : 0
  const warn = remaining < 120 && phase === 'active'
  const flaggedQs = questions.filter(q => flags.has(q.id))

  useEffect(() => {
    if (phase === 'active') timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    else if (timerRef.current) clearInterval(timerRef.current)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  useEffect(() => {
    if (phase === 'active' && elapsed >= tlSecs && tlSecs > 0) { push('⏰ Time up — auto-submitting', '#f59e0b'); submitTest() }
  }, [elapsed])

  async function generate() {
    if (!cfg.topic.trim()) return
    setGenerating(true)
    try {
      const raw = await callSIGMA(
        `Generate a ${cfg.difficulty} test on "${cfg.topic}" with exactly ${cfg.questionCount} questions.
Mix: MCQ(~40%), code(~25%), short(~20%), truefalse(~15%). Add a "hint" field per question (1 sentence, no spoilers).
Output ONLY valid JSON array:
[{"id":1,"type":"mcq","question":"...","options":["A","B","C","D"],"correct":"A","explanation":"...","points":10,"hint":"..."},
{"id":2,"type":"code","question":"Output?","code":"// real JS","correct":"...","explanation":"...","points":15,"hint":"..."},
{"id":3,"type":"truefalse","question":"...","options":["True","False"],"correct":"True","explanation":"...","points":5,"hint":"..."},
{"id":4,"type":"short","question":"...","correct":"key terms","explanation":"...","points":10,"hint":"..."}]
Difficulty: ${cfg.difficulty}. MCQ must have 4 options. Code must have real executable code.`,
        ' Output ONLY the JSON array.'
      )
      const qs: Question[] = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setQuestions(qs); setElapsed(0); setAnswers({}); setFlags(new Set()); setHints(new Set()); setActiveQ(0)
      setPhase('active')
      push(`✓ ${qs.length} questions ready`, '#22c55e')
    } catch (e) { console.error(e); push('Failed to generate exam', '#ef4444') }
    finally { setGenerating(false) }
  }

  function answer(qId: number, val: string) {
    setAnswers(p => ({ ...p, [qId]: { qId, value: val, flagged: flags.has(qId), hintUsed: hints.has(qId) } }))
    const idx = questions.findIndex(q => q.id === qId)
    const nxt = questions.findIndex((q, i) => i > idx && !answers[q.id])
    if (nxt !== -1) setTimeout(() => setActiveQ(nxt), 150)
  }
  function flagQ(qId: number) { setFlags(p => { const s = new Set(p); s.has(qId) ? s.delete(qId) : s.add(qId); return s }) }
  function hintQ(qId: number) { if (!hints.has(qId)) { setHints(p => new Set(p).add(qId)); push('💡 Hint used (−5% on this Q)', '#f59e0b') } }

  async function submitTest() {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('submitting')
    const tt = elapsed
    let tot = 0, earned = 0
    const graded: Answer[] = []
    questions.forEach(q => {
      tot += q.points
      const a = answers[q.id]
      if (!a?.value) { graded.push({ qId: q.id, value: '', isCorrect: false, pointsEarned: 0, flagged: flags.has(q.id), hintUsed: hints.has(q.id) }); return }
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const cor = norm(q.correct), giv = norm(a.value)
      let ok = false
      if (q.type === 'mcq' || q.type === 'truefalse') ok = giv === cor || giv[0] === cor[0]
      else { const terms = cor.split(' ').filter(w => w.length > 3); ok = terms.length === 0 || terms.filter(t => giv.includes(t)).length >= Math.ceil(terms.length * .5) }
      const pen = hints.has(q.id) ? .95 : 1
      const pts = ok ? Math.round(q.points * pen) : 0
      earned += pts
      graded.push({ qId: q.id, value: a.value, isCorrect: ok, pointsEarned: pts, flagged: flags.has(q.id), hintUsed: hints.has(q.id) })
    })
    const percentage = tot > 0 ? Math.round((earned / tot) * 100) : 0
    const grade = calcGrade(percentage)
    const xpEarned = Math.round(percentage * diff.xp)
    let feedback = GRADES[grade].msg
    try {
      const v = await callSIGMA(`Student scored ${percentage}% on ${cfg.difficulty} "${cfg.topic}". Time: ${Math.floor(tt / 60)}m. Unanswered: ${questions.length - Object.keys(answers).length}. Give 2-sentence brutal verdict.`)
      if (v.trim()) feedback = v.trim()
    } catch {}
    await api.post('/tasks/save-result', { challengeTitle: `Test: ${cfg.topic}`, score: percentage, xpEarned, timeTaken: tt, estimatedMinutes: cfg.timeLimitMinutes, difficulty: cfg.difficulty }).catch(() => {})
    const am: Record<number, Answer> = {}; graded.forEach(a => { am[a.qId] = a }); setAnswers(am)
    const entry: HistoryEntry = { id: Date.now().toString(), topic: cfg.topic, difficulty: cfg.difficulty, percentage, grade, score: earned, total: tot, correct: graded.filter(a => a.isCorrect).length, timeTaken: tt, xpEarned, date: new Date().toISOString(), questions, answers: graded }
    const nh = [entry, ...history]; setHistory(nh); saveH(uid, nh)
    setResult({ score: earned, total: tot, percentage, grade, timeTaken: tt, xpEarned, feedback, answers: graded })
    setPhase('result')
  }

  function reset() {
    setPhase('setup'); setQuestions([]); setAnswers({}); setFlags(new Set()); setHints(new Set())
    setElapsed(0); setResult(null); setActiveQ(0); setReview(null); setShowFlagged(false)
    setCfg(c => ({ ...c, topic: '' })); setTopicInput('')
  }

  // Responsive breakpoints via inline media queries aren't possible,
  // so we use window width state for key layout switches
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isSmall = typeof window !== 'undefined' && window.innerWidth < 480

  // ─── Full Review ─────────────────────────────────────────────
  if (review) return (
    <>
      <style>{CSS}</style>
      <Toasts ts={ts} rm={rm} />
      <div style={{ minHeight: '100vh', background: S.bg }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(16px,4vw,28px) clamp(12px,3vw,18px)' }}>
          <button onClick={() => setReview(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: S.t3, fontSize: 13, marginBottom: 20, padding: '7px 13px', background: S.s3, border: `1px solid ${S.b1}`, borderRadius: 9 }}>← Back</button>
          <h2 style={{ fontSize: 'clamp(17px,4vw,22px)', fontWeight: 800, fontFamily: S.head, letterSpacing: '.5px', marginBottom: 6 }}>Review: {review.topic}</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {[{ l: `${review.grade} · ${review.percentage}%`, c: GRADES[review.grade].color }, { l: review.difficulty, c: S.t3 }, { l: new Date(review.date).toLocaleDateString(), c: S.t3 }].map((x, i) => (
              <span key={i} style={{ fontSize: 10, color: x.c, background: `${x.c}18`, border: `1px solid ${x.c}25`, borderRadius: 5, padding: '2px 8px', fontFamily: S.mono }}>{x.l}</span>
            ))}
          </div>
          {review.questions.map((q, i) => <QCard key={q.id} q={q} idx={i} total={review.questions.length} ans={review.answers.find(a => a.qId === q.id)} onAns={() => {}} revealed />)}
        </div>
      </div>
    </>
  )

  // ─── Main ─────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <Toasts ts={ts} rm={rm} />
      <div style={{ minHeight: '100vh', background: S.bg }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: 'clamp(16px,4vw,28px) clamp(12px,3vw,20px)' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: S.t3, letterSpacing: 3, fontFamily: S.mono }}>SIGMA EXAM ENGINE</span>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: phase === 'active' ? '#22c55e' : S.t3, animation: phase === 'active' ? 'pulse 1.5s infinite' : 'none' }} />
              </div>
              <h1 style={{ fontSize: 'clamp(24px,5vw,36px)', fontWeight: 900, fontFamily: S.head, letterSpacing: '-.5px', lineHeight: 1 }}>
                Knowledge <span style={{ color: S.red }}>Test</span>
              </h1>
            </div>
            {phase === 'active' && (
              <div style={{ background: warn ? 'rgba(239,68,68,.1)' : S.s1, border: `1px solid ${warn ? 'rgba(239,68,68,.4)' : S.b1}`, borderRadius: 12, padding: '10px 15px', textAlign: 'right', transition: 'all .3s' }}>
                <div style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 700, fontFamily: S.mono, color: warn ? '#ef4444' : S.t1, letterSpacing: 3, lineHeight: 1 }}>{fmt(remaining)}</div>
                <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono, marginTop: 2 }}>{warn ? '⚠ WARNING' : 'remaining'}</div>
                <div style={{ height: 2, background: S.s3, borderRadius: 1, marginTop: 5, overflow: 'hidden', width: 80 }}>
                  <div style={{ height: '100%', width: `${(remaining / tlSecs) * 100}%`, background: warn ? '#ef4444' : '#3b82f6', transition: 'width 1s linear', borderRadius: 1 }} />
                </div>
              </div>
            )}
          </div>

          {/* TABS */}
          {phase !== 'active' && phase !== 'submitting' && (
            <div style={{ display: 'flex', gap: 3, background: S.s1, border: `1px solid ${S.b1}`, borderRadius: 14, padding: 4, marginBottom: 22, overflowX: 'auto' }}>
              {([
                { id: 'exam',        label: '⚡ Exam',    badge: 0 },
                { id: 'history',     label: '📋 History', badge: history.length },
                { id: 'analytics',   label: '📊 Stats',   badge: 0 },
                { id: 'leaderboard', label: '🏆 Board',   badge: 0 },
              ] as { id: AppTab; label: string; badge: number }[]).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: '1 0 auto', padding: 'clamp(7px,2vw,10px) clamp(10px,2vw,16px)', borderRadius: 10, border: 'none', background: tab === t.id ? 'rgba(255,54,54,.14)' : 'transparent', color: tab === t.id ? S.red : S.t3, fontSize: 'clamp(11px,2.5vw,13px)', fontWeight: 700, transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  {t.label}
                  {t.badge > 0 && <span style={{ background: 'rgba(255,54,54,.2)', color: S.red, fontSize: 9, fontFamily: S.mono, padding: '1px 5px', borderRadius: 4 }}>{t.badge}</span>}
                </button>
              ))}
            </div>
          )}

          {/* ══ EXAM TAB ══ */}
          {tab === 'exam' && (
            <>
              {/* ── SETUP ── */}
              {phase === 'setup' && (
                <div className="fadeUp" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 276px', gap: 16, alignItems: 'start' }}>

                  {/* LEFT */}
                  <div style={card}>
                    <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, fontFamily: S.head, letterSpacing: '.5px' }}>Configure Exam</h2>

                    {/* Topic */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 10, color: S.t3, letterSpacing: 1.5, display: 'block', marginBottom: 8, fontFamily: S.mono }}>TOPIC</label>
                      <input value={topicInput} onChange={e => { setTopicInput(e.target.value); setCfg(c => ({ ...c, topic: e.target.value })) }}
                        placeholder="Type a topic or pick one below…"
                        style={{ width: '100%', background: S.s3, border: `1px solid ${S.b1}`, borderRadius: 10, padding: '11px 14px', color: S.t1, fontSize: 14, outline: 'none', transition: 'border-color .15s' }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(255,54,54,.4)')}
                        onBlur={e => (e.target.style.borderColor = S.b1)} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {TOPICS.map(t => (
                          <button key={t} onClick={() => { setTopicInput(t); setCfg(c => ({ ...c, topic: t })) }}
                            style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.topic === t ? 'rgba(255,54,54,.12)' : S.s3, border: `1px solid ${cfg.topic === t ? 'rgba(255,54,54,.3)' : S.b1}`, color: cfg.topic === t ? S.red : S.t2, transition: 'all .12s', whiteSpace: 'nowrap' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 10, color: S.t3, letterSpacing: 1.5, display: 'block', marginBottom: 8, fontFamily: S.mono }}>DIFFICULTY</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {(Object.keys(DIFF) as TestConfig['difficulty'][]).map(d => {
                          const info = DIFF[d], active = cfg.difficulty === d
                          return (
                            <button key={d} onClick={() => setCfg(c => ({ ...c, difficulty: d, questionCount: info.q, timeLimitMinutes: info.time }))}
                              style={{ padding: '10px 6px', borderRadius: 12, background: active ? `${info.color}12` : S.s3, border: `1.5px solid ${active ? info.color + '50' : S.b1}`, textAlign: 'center', transition: 'all .15s' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: active ? info.color : S.t3, marginBottom: 3 }}>{info.label}</div>
                              <div style={{ fontSize: 9, color: S.t3, fontFamily: S.mono }}>{info.q}q · {info.time}m</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Count + Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                      {[
                        { l: 'QUESTIONS', k: 'questionCount' as const, min: 5, max: 20, step: 1, u: 'q' },
                        { l: 'TIME LIMIT', k: 'timeLimitMinutes' as const, min: 5, max: 60, step: 5, u: 'm' },
                      ].map(f => (
                        <div key={f.k}>
                          <label style={{ fontSize: 10, color: S.t3, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontFamily: S.mono }}>{f.l}</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: S.s3, border: `1px solid ${S.b1}`, borderRadius: 10, padding: '8px 12px' }}>
                            <button onClick={() => setCfg(c => ({ ...c, [f.k]: Math.max(f.min, c[f.k] - f.step) }))}
                              style={{ width: 26, height: 26, borderRadius: 7, background: S.s1, border: `1px solid ${S.b1}`, color: S.t2, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                            <span style={{ flex: 1, textAlign: 'center', fontFamily: S.mono, fontSize: 14, fontWeight: 700 }}>{cfg[f.k]}{f.u}</span>
                            <button onClick={() => setCfg(c => ({ ...c, [f.k]: Math.min(f.max, c[f.k] + f.step) }))}
                              style={{ width: 26, height: 26, borderRadius: 7, background: S.s1, border: `1px solid ${S.b1}`, color: S.t2, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hints toggle */}
                    <button onClick={() => setCfg(c => ({ ...c, enableHints: !c.enableHints }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: cfg.enableHints ? 'rgba(245,158,11,.07)' : S.s3, border: `1px solid ${cfg.enableHints ? 'rgba(245,158,11,.3)' : S.b1}`, borderRadius: 10, padding: '11px 14px', marginBottom: 20, cursor: 'pointer', transition: 'all .15s' }}>
                      <span style={{ fontSize: 18 }}>💡</span>
                      <div style={{ textAlign: 'left', flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: cfg.enableHints ? '#f59e0b' : S.t3 }}>Hints {cfg.enableHints ? 'Enabled' : 'Disabled'}</div>
                        <div style={{ fontSize: 10, color: S.t3, fontFamily: S.mono }}>−5% score penalty per hint used</div>
                      </div>
                      <div style={{ width: 36, height: 20, borderRadius: 10, background: cfg.enableHints ? 'rgba(245,158,11,.3)' : S.s1, border: `1px solid ${cfg.enableHints ? 'rgba(245,158,11,.5)' : S.b1}`, position: 'relative', transition: 'all .2s', flexShrink: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: cfg.enableHints ? '#f59e0b' : S.t3, position: 'absolute', top: 3, left: cfg.enableHints ? 18 : 3, transition: 'left .2s' }} />
                      </div>
                    </button>

                    <button onClick={generate} disabled={!cfg.topic.trim() || generating}
                      style={{ width: '100%', padding: '13px', background: !cfg.topic.trim() ? S.s3 : 'rgba(255,54,54,.15)', border: `1px solid ${!cfg.topic.trim() ? S.b1 : 'rgba(255,54,54,.35)'}`, borderRadius: 12, color: !cfg.topic.trim() ? S.t3 : S.red, fontSize: 14, fontWeight: 700, cursor: !cfg.topic.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .15s', opacity: !cfg.topic.trim() ? .5 : 1 }}>
                      {generating
                        ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,54,54,.3)', borderTopColor: S.red, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Building exam...</>
                        : `⚡ Generate ${cfg.questionCount}-Question Exam`}
                    </button>
                  </div>

                  {/* RIGHT SIDEBAR */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Mix */}
                    <div style={cardSm}>
                      <div style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, letterSpacing: 1.5, marginBottom: 12 }}>QUESTION MIX</div>
                      {[
                        { ic: '◉',   l: 'MCQ',       n: Math.round(cfg.questionCount * .4),  p: '10pt', c: '#3b82f6' },
                        { ic: '</>', l: 'Code',       n: Math.round(cfg.questionCount * .25), p: '15pt', c: '#f59e0b' },
                        { ic: '✎',   l: 'Short',      n: Math.round(cfg.questionCount * .2),  p: '10pt', c: '#22c55e' },
                        { ic: '◈',   l: 'True/False', n: Math.round(cfg.questionCount * .15), p: '5pt',  c: '#a855f7' },
                      ].map(item => (
                        <div key={item.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${S.b2}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ color: item.c, fontSize: 11, width: 18 }}>{item.ic}</span>
                            <span style={{ fontSize: 12, color: S.t2 }}>{item.l}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: S.mono }}>~{item.n}</span>
                            <span style={{ fontSize: 10, color: S.t3, marginLeft: 4, fontFamily: S.mono }}>{item.p}</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 8, borderTop: `1px solid ${S.b1}` }}>
                        <span style={{ fontSize: 11, color: S.t3 }}>Est. total</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: S.mono, color: diff.color }}>~{cfg.questionCount * 10}pts</span>
                      </div>
                    </div>

                    {/* Rules */}
                    <div style={{ background: 'rgba(255,54,54,.04)', border: '1px solid rgba(255,54,54,.1)', borderRadius: 12, padding: '14px' }}>
                      <div style={{ fontSize: 10, color: S.red, letterSpacing: 1.5, fontFamily: S.mono, marginBottom: 9 }}>Σ RULES</div>
                      {[`${cfg.timeLimitMinutes}m — no extensions`, 'Auto-submit on time out', 'Flag questions with ⚑', 'Hints cost −5% each', 'Results saved to history'].map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                          <span style={{ color: S.red, fontSize: 10, flexShrink: 0, marginTop: 1 }}>›</span>
                          <span style={{ fontSize: 12, color: S.t3, lineHeight: 1.5 }}>{r}</span>
                        </div>
                      ))}
                    </div>

                    {/* Last test */}
                    {history.length > 0 && (
                      <div style={cardSm}>
                        <div style={{ fontSize: 10, color: S.t3, fontFamily: S.mono, letterSpacing: 1, marginBottom: 7 }}>LAST TEST</div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{history[0].topic}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: GRADES[history[0].grade].color, fontFamily: S.mono }}>{history[0].percentage}%</span>
                          <button onClick={() => { setTopicInput(history[0].topic); setCfg(c => ({ ...c, topic: history[0].topic, difficulty: history[0].difficulty as any })) }}
                            style={{ padding: '5px 10px', background: S.s3, border: `1px solid ${S.b1}`, borderRadius: 7, color: S.t3, fontSize: 10 }}>
                            Retake
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ACTIVE ── */}
              {phase === 'active' && questions.length > 0 && (
                <div className="fadeUp">
                  {/* Progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: S.t3, fontFamily: S.mono }}>{answered}/{questions.length} answered</span>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {flags.size > 0 && (
                          <button onClick={() => setShowFlagged(f => !f)}
                            style={{ fontSize: 10, color: showFlagged ? '#f59e0b' : S.t3, background: showFlagged ? 'rgba(245,158,11,.1)' : S.s3, border: `1px solid ${showFlagged ? 'rgba(245,158,11,.3)' : S.b1}`, borderRadius: 6, padding: '3px 9px', fontFamily: S.mono }}>
                            ⚑ {flags.size}
                          </button>
                        )}
                        <span style={{ fontSize: 10, color: S.t3, fontFamily: S.mono }}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: S.s3, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#3b82f6,#ef4444)', borderRadius: 2, transition: 'width .3s' }} />
                    </div>
                  </div>

                  {/* Flagged panel */}
                  {showFlagged && flaggedQs.length > 0 && (
                    <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 12, padding: '11px 14px', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#f59e0b', fontFamily: S.mono, marginBottom: 8 }}>⚑ FLAGGED FOR REVIEW</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {flaggedQs.map(q => { const i = questions.findIndex(x => x.id === q.id); return <button key={q.id} onClick={() => { setActiveQ(i); setShowFlagged(false) }} style={{ padding: '4px 9px', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 7, color: '#f59e0b', fontSize: 11, fontFamily: S.mono }}>Q{i + 1}{answers[q.id] ? '✓' : '○'}</button> })}
                      </div>
                    </div>
                  )}

                  {/* Q navigator */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                    {questions.map((q, i) => {
                      const a = !!answers[q.id], fl = flags.has(q.id), ac = i === activeQ
                      const bg = ac ? 'rgba(255,54,54,.15)' : fl ? 'rgba(245,158,11,.1)' : a ? 'rgba(59,130,246,.1)' : S.s3
                      const bc = ac ? 'rgba(255,54,54,.5)' : fl ? 'rgba(245,158,11,.35)' : a ? 'rgba(59,130,246,.3)' : S.b1
                      const col = ac ? S.red : fl ? '#f59e0b' : a ? '#93c5fd' : S.t3
                      return <button key={i} onClick={() => setActiveQ(i)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${bc}`, background: bg, color: col, fontSize: 10, fontWeight: 700, fontFamily: S.mono, transition: 'all .12s' }}>{i + 1}</button>
                    })}
                  </div>

                  <QCard
                    q={questions[activeQ]} idx={activeQ} total={questions.length}
                    ans={answers[questions[activeQ].id]}
                    onAns={v => answer(questions[activeQ].id, v)}
                    revealed={false}
                    flagged={flags.has(questions[activeQ].id)}
                    onFlag={() => flagQ(questions[activeQ].id)}
                    hintUsed={hints.has(questions[activeQ].id)}
                    onHint={() => hintQ(questions[activeQ].id)}
                    hintsOn={cfg.enableHints}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <button disabled={activeQ === 0} onClick={() => setActiveQ(Math.max(0, activeQ - 1))}
                      style={{ padding: '10px 16px', borderRadius: 10, background: S.s3, border: `1px solid ${S.b1}`, color: activeQ === 0 ? S.t3 : S.t2, fontSize: 12, fontWeight: 600 }}>
                      ← Prev
                    </button>
                    <button onClick={submitTest}
                      style={{ padding: '10px 18px', borderRadius: 10, background: answered === questions.length ? 'rgba(34,197,94,.15)' : 'rgba(255,54,54,.12)', border: `1px solid ${answered === questions.length ? 'rgba(34,197,94,.3)' : 'rgba(255,54,54,.25)'}`, color: answered === questions.length ? '#22c55e' : S.red, fontSize: 12, fontWeight: 700 }}>
                      {answered === questions.length ? '✓ Submit' : `Submit (${questions.length - answered} left)`}
                    </button>
                    <button disabled={activeQ === questions.length - 1} onClick={() => setActiveQ(Math.min(questions.length - 1, activeQ + 1))}
                      style={{ padding: '10px 16px', borderRadius: 10, background: S.s3, border: `1px solid ${S.b1}`, color: activeQ === questions.length - 1 ? S.t3 : S.t2, fontSize: 12, fontWeight: 600 }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* ── SUBMITTING ── */}
              {phase === 'submitting' && (
                <div className="pop" style={{ textAlign: 'center', padding: '80px 24px' }}>
                  <div style={{ width: 48, height: 48, border: '3px solid rgba(255,54,54,.15)', borderTopColor: S.red, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 18px' }} />
                  <p style={{ color: S.red, fontWeight: 800, fontSize: 18, marginBottom: 6, fontFamily: S.head, letterSpacing: '.5px' }}>SIGMA IS GRADING...</p>
                  <p style={{ color: S.t3, fontSize: 12, fontFamily: S.mono }}>// calculating your inadequacy score</p>
                </div>
              )}

              {/* ── RESULT ── */}
              {phase === 'result' && result && (
                <div className="fadeUp">
                  <div style={{ background: S.s1, border: `1px solid ${GRADES[result.grade].color}30`, borderRadius: 20, padding: 'clamp(16px,3vw,26px)', marginBottom: 14, boxShadow: `0 0 60px ${GRADES[result.grade].color}18` }}>
                    <div style={{ display: 'flex', gap: 'clamp(10px,3vw,18px)', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
                      <div style={{ width: 78, height: 78, borderRadius: 18, background: `${GRADES[result.grade].color}12`, border: `2px solid ${GRADES[result.grade].color}50`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 32, fontWeight: 900, color: GRADES[result.grade].color, fontFamily: S.mono, lineHeight: 1 }}>{result.grade}</span>
                        <span style={{ fontSize: 7, color: GRADES[result.grade].color, letterSpacing: 1.5, fontFamily: S.mono }}>GRADE</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'clamp(30px,6vw,46px)', fontWeight: 900, fontFamily: S.mono, lineHeight: 1 }}>
                          {result.percentage}<span style={{ fontSize: 16, color: S.t3, fontWeight: 400 }}>%</span>
                        </div>
                        <div style={{ fontSize: 12, color: S.t3, marginTop: 4 }}>{result.score}/{result.total} pts · {result.answers.filter(a => a.isCorrect).length}/{questions.length} correct</div>
                        <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                          {[
                            { l: `+${result.xpEarned} XP`, c: '#f59e0b' },
                            { l: `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`, c: S.t3 },
                            { l: diff.label, c: diff.color },
                          ].map((x, i) => (
                            <span key={i} style={{ fontSize: 10, color: x.c, background: `${x.c}12`, border: `1px solid ${x.c}25`, borderRadius: 6, padding: '3px 8px', fontFamily: S.mono }}>{x.l}</span>
                          ))}
                        </div>
                      </div>
                      <Ring pct={result.percentage} color={GRADES[result.grade].color} />
                    </div>

                    <div style={{ background: 'rgba(255,54,54,.05)', border: '1px solid rgba(255,54,54,.1)', borderRadius: 12, padding: '12px 15px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: S.red, fontSize: 15, flexShrink: 0, marginTop: 1 }}>Σ</span>
                      <p style={{ color: '#fca5a5', fontSize: 13.5, lineHeight: 1.7, fontStyle: 'italic' }}>"{result.feedback}"</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {[
                        { l: 'Correct',  v: result.answers.filter(a => a.isCorrect).length,             c: '#22c55e' },
                        { l: 'Wrong',    v: result.answers.filter(a => a.value && !a.isCorrect).length,  c: '#ef4444' },
                        { l: 'Skipped',  v: result.answers.filter(a => !a.value).length,                 c: S.t3 },
                        { l: 'Accuracy', v: `${result.percentage}%`,                                     c: GRADES[result.grade].color },
                      ].map(s => (
                        <div key={s.l} style={{ background: S.s3, borderRadius: 10, padding: '11px', textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: s.c, fontFamily: S.mono }}>{s.v}</div>
                          <div style={{ fontSize: 9, color: S.t3, marginTop: 3, fontFamily: S.mono, letterSpacing: .8 }}>{s.l.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: S.t3, letterSpacing: 2, fontFamily: S.mono, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span>QUESTION REVIEW</span>
                      <div style={{ flex: 1, height: 1, background: S.b1 }} />
                    </div>
                    {questions.map((q, i) => <QCard key={q.id} q={q} idx={i} total={questions.length} ans={result.answers.find(a => a.qId === q.id)} onAns={() => {}} revealed />)}
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={reset} style={{ flex: 1, minWidth: 120, padding: '13px', background: 'rgba(255,54,54,.12)', border: '1px solid rgba(255,54,54,.3)', borderRadius: 12, color: S.red, fontSize: 13, fontWeight: 700 }}>🔁 New Test</button>
                    <button onClick={() => setTab('analytics')} style={{ flex: 1, minWidth: 120, padding: '13px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 12, color: '#93c5fd', fontSize: 13, fontWeight: 700 }}>📊 View Stats</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ OTHER TABS ══ */}
          {tab === 'history'     && phase !== 'active' && phase !== 'submitting' && <div className="fadeUp"><History history={history} onReview={setReview} /></div>}
          {tab === 'analytics'   && phase !== 'active' && phase !== 'submitting' && <div className="fadeUp"><Analytics history={history} /></div>}
          {tab === 'leaderboard' && phase !== 'active' && phase !== 'submitting' && <div className="fadeUp"><Leaderboard /></div>}

        </div>
      </div>
    </>
  )
}