'use client'
import api from '@/lib/api'
import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type TestPhase = 'home' | 'setup' | 'active' | 'submitting' | 'result'
type QType = 'mcq' | 'short' | 'code' | 'truefalse'
type AppTab = 'exam' | 'history' | 'analytics' | 'leaderboard'

interface Question {
  id: number
  type: QType
  question: string
  code?: string
  options?: string[]
  correct: string
  explanation: string
  points: number
}

interface TestConfig {
  topic: string
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'brutal'
  questionCount: number
  timeLimitMinutes: number
}

interface Answer {
  qId: number
  value: string
  isCorrect?: boolean
  pointsEarned?: number
  flagged?: boolean
}

interface TestResult {
  score: number
  total: number
  percentage: number
  grade: string
  timeTaken: number
  xpEarned: number
  feedback: string
  answers: Answer[]
}

interface HistoryEntry {
  id: string
  topic: string
  difficulty: string
  percentage: number
  grade: string
  score: number
  total: number
  correct: number
  timeTaken: number
  xpEarned: number
  date: string
  questions: Question[]
  answers: Answer[]
}

// ─────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────
const MONO = '"JetBrains Mono", monospace'

const DIFF = {
  beginner:     { label: 'Beginner',     color: '#22c55e', time: 15, q: 8  },
  intermediate: { label: 'Intermediate', color: '#f59e0b', time: 20, q: 10 },
  advanced:     { label: 'Advanced',     color: '#ef4444', time: 25, q: 12 },
  brutal:       { label: 'BRUTAL',       color: '#a855f7', time: 30, q: 15 },
} as const

const GRADES: Record<string, { color: string; glow: string; sigma: string }> = {
  S: { color: '#a855f7', glow: 'rgba(168,85,247,.3)',  sigma: "Fine. Not completely useless. Don't let it go to your head." },
  A: { color: '#22c55e', glow: 'rgba(34,197,94,.3)',   sigma: "Above average. Still room to fail spectacularly, but you passed." },
  B: { color: '#3b82f6', glow: 'rgba(59,130,246,.3)',  sigma: "Mediocre by my standards. The bar was low and you barely cleared it." },
  C: { color: '#f59e0b', glow: 'rgba(245,158,11,.3)',  sigma: "You scraped through. That's not a compliment." },
  F: { color: '#ef4444', glow: 'rgba(239,68,68,.3)',   sigma: "Disgraceful. Study harder or find a different career." },
}

const TOPICS = [
  'JavaScript Closures', 'React Hooks', 'Async/Await', 'CSS Flexbox',
  'TypeScript Generics', 'REST APIs', 'SQL Joins', 'Big O Notation',
  'Binary Search', 'Git Workflow', 'Docker Basics', 'Node.js Events',
  'Python Decorators', 'CSS Grid', 'WebSockets', 'GraphQL',
]

function calcGrade(p: number) {
  if (p >= 90) return 'S'
  if (p >= 75) return 'A'
  if (p >= 60) return 'B'
  if (p >= 45) return 'C'
  return 'F'
}

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('sigma_test_history') || '[]') } catch { return [] }
}
function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem('sigma_test_history', JSON.stringify(h.slice(0, 50)))
}

async function callSIGMA(prompt: string, system = '') {
  const res = await api.post('/tasks/sigma', {
    system: `You are SIGMA — a brutally honest AI testing examiner.${system}`,
    messages: [{ role: 'user', content: prompt }],
  })
  return (res.data.reply ?? '') as string
}

// ─────────────────────────────────────────────────────────────────
// Syntax highlighter (basic, no deps)
// ─────────────────────────────────────────────────────────────────
function highlight(code: string): string {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#6b7280;font-style:italic">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span style="color:#86efac">$1</span>')
    .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|typeof|new|this|true|false|null|undefined|=>|from)\b/g, '<span style="color:#93c5fd">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fbbf24">$1</span>')
    .replace(/\b(console|Math|Array|Object|Promise|JSON|window|document)\b/g, '<span style="color:#fb923c">$1</span>')
}

// ─────────────────────────────────────────────────────────────────
// Code Block
// ─────────────────────────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ background: '#03040a', border: '1px solid rgba(245,158,11,.18)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid rgba(245,158,11,.1)', background: 'rgba(245,158,11,.04)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        </div>
        <button onClick={copy} style={{ fontSize: 10, color: copied ? '#22c55e' : '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, letterSpacing: 1 }}>
          {copied ? '✓ COPIED' : 'COPY'}
        </button>
      </div>
      <div
        style={{ padding: '14px 16px', fontFamily: MONO, fontSize: 12.5, lineHeight: 1.9, overflowX: 'auto', whiteSpace: 'pre', color: '#e2e8f0' }}
        dangerouslySetInnerHTML={{ __html: highlight(code) }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Question Card
// ─────────────────────────────────────────────────────────────────
function QuestionCard({
  q, index, total, answer, onAnswer, revealed, flagged, onFlag,
}: {
  q: Question; index: number; total: number
  answer: Answer | undefined
  onAnswer: (v: string) => void
  revealed: boolean
  flagged?: boolean
  onFlag?: () => void
}) {
  const [shortInput, setShortInput] = useState(answer?.value ?? '')
  const isCorrect = revealed && answer?.isCorrect
  const isWrong   = revealed && answer && !answer.isCorrect

  const borderColor = revealed
    ? (isCorrect ? 'rgba(34,197,94,.35)' : isWrong ? 'rgba(239,68,68,.35)' : 'rgba(100,100,100,.2)')
    : (flagged ? 'rgba(245,158,11,.4)' : 'rgba(255,255,255,.07)')

  const TYPE_META = {
    mcq:       { label: '◉ MCQ',         color: '#3b82f6', bg: 'rgba(59,130,246,.1)',  border: 'rgba(59,130,246,.2)'  },
    code:      { label: '⟨/⟩ Code',      color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.2)' },
    truefalse: { label: '◈ True / False', color: '#a855f7', bg: 'rgba(168,85,247,.1)', border: 'rgba(168,85,247,.2)' },
    short:     { label: '✎ Short',        color: '#22c55e', bg: 'rgba(34,197,94,.1)',  border: 'rgba(34,197,94,.2)'  },
  }
  const meta = TYPE_META[q.type]

  return (
    <div style={{ background: '#07080f', border: `1px solid ${borderColor}`, borderRadius: 16, padding: '20px', marginBottom: 14, transition: 'border-color .25s' }}>

      {/* Q header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        {/* Number / result badge */}
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: revealed ? (isCorrect ? 'rgba(34,197,94,.15)' : isWrong ? 'rgba(239,68,68,.15)' : 'rgba(100,100,100,.08)') : (flagged ? 'rgba(245,158,11,.15)' : 'rgba(255,255,255,.05)'),
          border: `1px solid ${revealed ? (isCorrect ? 'rgba(34,197,94,.3)' : isWrong ? 'rgba(239,68,68,.3)' : 'rgba(100,100,100,.2)') : (flagged ? 'rgba(245,158,11,.4)' : 'rgba(255,255,255,.08)')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: revealed ? 14 : 12, fontWeight: 700, fontFamily: MONO,
          color: revealed ? (isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#6b7280') : (flagged ? '#f59e0b' : '#9ca3af'),
        }}>
          {revealed ? (isCorrect ? '✓' : isWrong ? '✗' : '—') : index + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, color: meta.color, background: meta.bg, borderRadius: 5, padding: '2px 8px', border: `1px solid ${meta.border}` }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 9, color: '#374151', fontFamily: MONO }}>{q.points} pts</span>
            <span style={{ fontSize: 9, color: '#1f2937', fontFamily: MONO }}>Q{index + 1}/{total}</span>
          </div>
          <p style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.65, fontWeight: 500 }}>{q.question}</p>
        </div>

        {/* Flag button */}
        {!revealed && onFlag && (
          <button onClick={onFlag} title="Flag for review" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: `1px solid ${flagged ? 'rgba(245,158,11,.5)' : 'rgba(255,255,255,.08)'}`, background: flagged ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.03)', color: flagged ? '#f59e0b' : '#374151', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
            ⚑
          </button>
        )}
      </div>

      {/* Code block */}
      {q.code && <CodeBlock code={q.code} />}

      {/* Answer input */}
      {!revealed && (
        <>
          {(q.type === 'mcq' || q.type === 'truefalse') && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {q.options.map((opt, oi) => {
                const sel = answer?.value === opt
                return (
                  <button key={oi} onClick={() => onAnswer(opt)} style={{ background: sel ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.025)', border: `1px solid ${sel ? 'rgba(59,130,246,.45)' : 'rgba(255,255,255,.07)'}`, borderRadius: 10, padding: '11px 14px', textAlign: 'left', color: sel ? '#93c5fd' : '#9ca3af', fontSize: 13, cursor: 'pointer', transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: sel ? 'rgba(59,130,246,.3)' : 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: MONO }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                    {sel && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3b82f6' }}>●</span>}
                  </button>
                )
              })}
            </div>
          )}

          {(q.type === 'short' || q.type === 'code') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={shortInput}
                onChange={e => setShortInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && shortInput.trim()) onAnswer(shortInput) }}
                placeholder={q.type === 'code' ? 'Write your answer or explain the output... (Ctrl+Enter to save)' : 'Your answer... (Ctrl+Enter to save)'}
                rows={q.type === 'code' ? 3 : 2}
                style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '11px 13px', color: '#e5e7eb', fontSize: 13, fontFamily: q.type === 'code' ? MONO : 'inherit', resize: 'vertical', lineHeight: 1.6, outline: 'none' }}
              />
              <button onClick={() => { if (shortInput.trim()) onAnswer(shortInput) }} disabled={!shortInput.trim()} style={{ width: 38, borderRadius: 10, border: 'none', background: shortInput.trim() ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.04)', color: shortInput.trim() ? '#22c55e' : '#374151', cursor: shortInput.trim() ? 'pointer' : 'not-allowed', fontSize: 16, transition: 'all .15s' }}>✓</button>
            </div>
          )}
        </>
      )}

      {/* Revealed result */}
      {revealed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {answer?.value ? (
              <div style={{ background: isCorrect ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${isCorrect ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`, borderRadius: 9, padding: '7px 13px' }}>
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3, letterSpacing: 1 }}>YOUR ANSWER</div>
                <div style={{ fontSize: 13, color: isCorrect ? '#86efac' : '#fca5a5' }}>{answer.value}</div>
              </div>
            ) : (
              <div style={{ background: 'rgba(100,100,100,.08)', border: '1px solid rgba(100,100,100,.2)', borderRadius: 9, padding: '7px 13px' }}>
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>SKIPPED</div>
              </div>
            )}
            {!isCorrect && (
              <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 9, padding: '7px 13px' }}>
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3, letterSpacing: 1 }}>CORRECT ANSWER</div>
                <div style={{ fontSize: 13, color: '#86efac' }}>{q.correct}</div>
              </div>
            )}
          </div>
          <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.1)', borderRadius: 9, padding: '11px 13px' }}>
            <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: 1.5, marginBottom: 5 }}>Σ EXPLANATION</div>
            <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.65 }}>{q.explanation}</p>
          </div>
          {answer?.flagged && (
            <div style={{ fontSize: 10, color: '#f59e0b', fontFamily: MONO }}>⚑ You flagged this question for review</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Score Ring
// ─────────────────────────────────────────────────────────────────
function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 34, circ = 2 * Math.PI * r
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="7" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
      <text x="44" y="40" textAnchor="middle" fill={color} fontSize="16" fontWeight="800" fontFamily="monospace">{pct}%</text>
      <text x="44" y="54" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="monospace">SCORE</text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// Mini bar chart for analytics
// ─────────────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 9, color: d.color, fontFamily: MONO, fontWeight: 700 }}>{d.value}</div>
          <div style={{ width: '100%', background: 'rgba(255,255,255,.04)', borderRadius: 4, overflow: 'hidden', height: 36 }}>
            <div style={{ width: '100%', height: `${(d.value / max) * 100}%`, background: d.color, marginTop: 'auto', borderRadius: 3, transition: 'height .5s ease', display: 'flex', alignItems: 'flex-end' }} />
          </div>
          <div style={{ fontSize: 8, color: '#374151', textAlign: 'center', letterSpacing: 0.5 }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// History Tab
// ─────────────────────────────────────────────────────────────────
function HistoryTab({ history, onReview }: { history: HistoryEntry[]; onReview: (e: HistoryEntry) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (history.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
      <p style={{ color: '#374151', fontSize: 14 }}>No tests taken yet.</p>
      <p style={{ color: '#1f2937', fontSize: 12, marginTop: 6 }}>Complete your first exam to see history here.</p>
    </div>
  )

  return (
    <div>
      {history.map(entry => {
        const g = GRADES[entry.grade]
        const isOpen = expanded === entry.id
        return (
          <div key={entry.id} style={{ background: '#07080f', border: `1px solid ${isOpen ? g.color + '30' : 'rgba(255,255,255,.07)'}`, borderRadius: 16, marginBottom: 10, overflow: 'hidden', transition: 'border-color .2s' }}>
            {/* Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : entry.id)}>
              {/* Grade */}
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${g.color}15`, border: `2px solid ${g.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: g.color, fontFamily: MONO, flexShrink: 0 }}>
                {entry.grade}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.topic}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: DIFF[entry.difficulty as keyof typeof DIFF]?.color || '#6b7280', fontFamily: MONO }}>{entry.difficulty}</span>
                  <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO }}>·</span>
                  <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO }}>{entry.correct}/{entry.questions?.length || '?'} correct</span>
                  <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO }}>·</span>
                  <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO }}>{Math.floor(entry.timeTaken / 60)}m {entry.timeTaken % 60}s</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: g.color, fontFamily: MONO, lineHeight: 1 }}>{entry.percentage}%</div>
                <div style={{ fontSize: 9, color: '#374151', marginTop: 3, fontFamily: MONO }}>+{entry.xpEarned} XP</div>
              </div>
              <div style={{ color: '#374151', fontSize: 12, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</div>
            </div>

            {/* Expanded review */}
            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontFamily: MONO }}>
                  Taken on {new Date(entry.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Correct',  value: entry.answers.filter(a => a.isCorrect).length,           color: '#22c55e' },
                    { label: 'Wrong',    value: entry.answers.filter(a => a.value && !a.isCorrect).length, color: '#ef4444' },
                    { label: 'Skipped',  value: entry.answers.filter(a => !a.value).length,               color: '#6b7280' },
                    { label: 'Flagged',  value: entry.answers.filter(a => a.flagged).length,              color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 9, padding: '9px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: '#374151', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => onReview(entry)} style={{ width: '100%', padding: '10px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 10, color: '#93c5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
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

// ─────────────────────────────────────────────────────────────────
// Analytics Tab
// ─────────────────────────────────────────────────────────────────
function AnalyticsTab({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
      <p style={{ color: '#374151', fontSize: 14 }}>No data yet.</p>
      <p style={{ color: '#1f2937', fontSize: 12, marginTop: 6 }}>Take some tests to see your analytics.</p>
    </div>
  )

  const avg = Math.round(history.reduce((a, b) => a + b.percentage, 0) / history.length)
  const best = Math.max(...history.map(h => h.percentage))
  const totalXP = history.reduce((a, b) => a + b.xpEarned, 0)
  const totalCorrect = history.reduce((a, b) => a + b.correct, 0)
  const totalQ = history.reduce((a, b) => a + (b.questions?.length || 0), 0)

  // By difficulty
  const byDiff: Record<string, number[]> = {}
  history.forEach(h => {
    if (!byDiff[h.difficulty]) byDiff[h.difficulty] = []
    byDiff[h.difficulty].push(h.percentage)
  })
  const diffStats = Object.entries(byDiff).map(([d, scores]) => ({
    label: d.slice(0, 3).toUpperCase(),
    value: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    color: DIFF[d as keyof typeof DIFF]?.color || '#6b7280',
  }))

  // Grade distribution
  const gradeDist: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, F: 0 }
  history.forEach(h => { gradeDist[h.grade] = (gradeDist[h.grade] || 0) + 1 })

  // Recent trend (last 10)
  const recent = history.slice(0, 10).reverse()

  // Top topics (best avg score)
  const topicMap: Record<string, number[]> = {}
  history.forEach(h => {
    if (!topicMap[h.topic]) topicMap[h.topic] = []
    topicMap[h.topic].push(h.percentage)
  })
  const topTopics = Object.entries(topicMap)
    .map(([t, s]) => ({ topic: t, avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length), count: s.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  // Weak topics
  const weakTopics = [...topTopics].sort((a, b) => a.avg - b.avg).slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Avg Score',   value: `${avg}%`,   color: GRADES[calcGrade(avg)].color },
          { label: 'Best Score',  value: `${best}%`,  color: '#a855f7' },
          { label: 'Total XP',    value: totalXP,     color: '#f59e0b' },
          { label: 'Accuracy',    value: totalQ > 0 ? `${Math.round((totalCorrect / totalQ) * 100)}%` : '—', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#07080f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: MONO, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#374151', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score trend + difficulty avg side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Score trend */}
        <div style={{ background: '#07080f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>Score Trend (last {recent.length})</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60 }}>
            {recent.map((h, i) => {
              const pct = h.percentage
              const color = GRADES[h.grade].color
              return (
                <div key={i} title={`${h.topic}: ${pct}%`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 7, color, fontFamily: MONO }}>{pct}</div>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,.04)', borderRadius: 3, height: 40, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: `${pct}%`, background: color, borderRadius: 3, opacity: 0.8, transition: 'height .4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By difficulty */}
        <div style={{ background: '#07080f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>Avg by Difficulty</div>
          <MiniBarChart data={diffStats} />
        </div>
      </div>

      {/* Grade distribution */}
      <div style={{ background: '#07080f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '16px' }}>
        <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>Grade Distribution</div>
        <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          {Object.entries(gradeDist).map(([g, count]) => {
            if (!count) return null
            const pct = (count / history.length) * 100
            return <div key={g} title={`${g}: ${count}`} style={{ width: `${pct}%`, background: GRADES[g].color, opacity: 0.85 }} />
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {Object.entries(gradeDist).map(([g, count]) => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: GRADES[g].color }} />
              <span style={{ fontSize: 11, color: GRADES[g].color, fontFamily: MONO, fontWeight: 700 }}>{g}</span>
              <span style={{ fontSize: 11, color: '#374151' }}>{count}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* Topic performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Best topics */}
        <div style={{ background: '#07080f', border: '1px solid rgba(34,197,94,.1)', borderRadius: 14, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#22c55e', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>🔥 Strongest Topics</div>
          {topTopics.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO, width: 14 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</div>
                <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${t.avg}%`, background: GRADES[calcGrade(t.avg)].color, borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: GRADES[calcGrade(t.avg)].color, fontFamily: MONO, flexShrink: 0 }}>{t.avg}%</span>
            </div>
          ))}
        </div>

        {/* Weak topics */}
        <div style={{ background: '#07080f', border: '1px solid rgba(239,68,68,.1)', borderRadius: 14, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>💀 Needs Work</div>
          {weakTopics.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO, width: 14 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</div>
                <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${t.avg}%`, background: '#ef4444', borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', fontFamily: MONO, flexShrink: 0 }}>{t.avg}%</span>
            </div>
          ))}
          {weakTopics.length === 0 && <p style={{ color: '#374151', fontSize: 12 }}>No weak areas yet.</p>}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Leaderboard Tab
// ─────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  tier: string
  avgScore: number
  bestScore: number
  testCount: number
  totalXP: number
  isCurrentUser: boolean
}

const TIER_COLORS: Record<string, string> = {
  developing:  '#6b7280',
  rising:      '#22c55e',
  competitive: '#00c8ff',
  elite:       '#a78bfa',
  legendary:   '#fbbf24',
}

function LeaderboardTab() {
  const [entries,   setEntries]   = useState<LeaderboardEntry[]>([])
  const [myRank,    setMyRank]    = useState<number | null>(null)
  const [myTopics,  setMyTopics]  = useState<string[]>([])
  const [topic,     setTopic]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  async function fetchLeaderboard(t = '') {
    setLoading(true); setError('')
    try {
      const url = t ? `/tasks/leaderboard?topic=${encodeURIComponent(t)}` : '/tasks/leaderboard'
      const res = await api.get(url)
      setEntries(res.data.leaderboard || [])
      setMyRank(res.data.myRank || null)
      if (res.data.myTopics?.length) setMyTopics(res.data.myTopics)
      setTopic(res.data.topic || '')
    } catch {
      setError('Failed to load leaderboard.')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchLeaderboard() }, [])

  const medalColor = (rank: number) =>
    rank === 1 ? '#fbbf24' : rank === 2 ? '#9ca3af' : rank === 3 ? '#f97316' : '#374151'

  const medalIcon = (rank: number) =>
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#e5e7eb', marginBottom: 3 }}>
            {topic ? `Top Scores — ${topic}` : 'Global Leaderboard'}
          </h2>
          {myRank && (
            <p style={{ fontSize: 11, color: '#374151', fontFamily: MONO }}>
              Your rank: <span style={{ color: '#f59e0b', fontWeight: 700 }}>#{myRank}</span>
              {topic && ' on this topic'}
            </p>
          )}
        </div>
        <button onClick={() => fetchLeaderboard(topic)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: MONO }}>
          ↻ Refresh
        </button>
      </div>

      {/* Topic filter pills */}
      {myTopics.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: '#374151', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, fontFamily: MONO }}>Filter by Topic</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => { setTopic(''); fetchLeaderboard('') }}
              style={{ background: !topic ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${!topic ? 'rgba(239,68,68,.35)' : 'rgba(255,255,255,.07)'}`, borderRadius: 8, padding: '5px 11px', fontSize: 11, color: !topic ? '#ef4444' : '#6b7280', cursor: 'pointer', transition: 'all .12s' }}>
              All Topics
            </button>
            {myTopics.map(t => (
              <button key={t} onClick={() => { setTopic(t); fetchLeaderboard(t) }}
                style={{ background: topic === t ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${topic === t ? 'rgba(239,68,68,.35)' : 'rgba(255,255,255,.07)'}`, borderRadius: 8, padding: '5px 11px', fontSize: 11, color: topic === t ? '#ef4444' : '#6b7280', cursor: 'pointer', transition: 'all .12s' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading / Error / Empty */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px 24px' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(239,68,68,.15)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: '#374151', fontSize: 12, fontFamily: MONO }}>// fetching rankings...</p>
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: '#ef4444', fontSize: 13 }}>{error}</div>
      )}
      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🏆</div>
          <p style={{ color: '#374151', fontSize: 14 }}>No scores yet{topic ? ` for ${topic}` : ''}.</p>
          <p style={{ color: '#1f2937', fontSize: 12, marginTop: 6 }}>Complete a test to appear on the leaderboard.</p>
        </div>
      )}

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}>
          {[entries[1], entries[0], entries[2]].map((e, i) => {
            const realRank = i === 0 ? 2 : i === 1 ? 1 : 3
            const heights  = [110, 130, 100]
            const mc       = medalColor(realRank)
            return (
              <div key={e.rank} style={{ background: e.isCurrentUser ? `${mc}15` : '#07080f', border: `1px solid ${e.isCurrentUser ? mc + '50' : mc + '25'}`, borderRadius: 16, padding: '16px 12px', textAlign: 'center', height: heights[i], display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, transition: 'all .2s' }}>
                <div style={{ fontSize: i === 1 ? 28 : 22 }}>{medalIcon(realRank)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.username}</div>
                <div style={{ fontSize: i === 1 ? 20 : 16, fontWeight: 900, color: mc, fontFamily: MONO, lineHeight: 1 }}>{e.avgScore}%</div>
                <div style={{ fontSize: 9, color: '#374151', fontFamily: MONO }}>{e.testCount} test{e.testCount !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      {!loading && entries.length > 0 && (
        <div style={{ background: '#07080f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 80px 60px 70px', gap: 0, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            {['Rank', 'Player', 'Avg', 'Best', 'Tests', 'XP'].map(h => (
              <div key={h} style={{ fontSize: 9, color: '#374151', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: MONO }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {entries.map((e) => {
            const mc = medalColor(e.rank)
            const gradeColor = GRADES[calcGrade(e.avgScore)].color
            return (
              <div key={e.rank} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 80px 60px 70px', gap: 0, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.04)', background: e.isCurrentUser ? 'rgba(239,68,68,.06)' : 'transparent', transition: 'background .15s' }}>
                {/* Rank */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: e.rank <= 3 ? 16 : 12, fontWeight: 700, color: mc, fontFamily: MONO }}>
                    {e.rank <= 3 ? medalIcon(e.rank) : `#${e.rank}`}
                  </span>
                </div>
                {/* Username + tier */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${TIER_COLORS[e.tier] || '#6b7280'}18`, border: `1px solid ${TIER_COLORS[e.tier] || '#6b7280'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: TIER_COLORS[e.tier] || '#6b7280', flexShrink: 0, fontFamily: MONO }}>
                    {e.username[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: e.isCurrentUser ? '#ef4444' : '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.username} {e.isCurrentUser && <span style={{ fontSize: 9, color: '#ef4444', fontFamily: MONO }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 9, color: TIER_COLORS[e.tier] || '#374151', textTransform: 'capitalize', fontFamily: MONO }}>{e.tier}</div>
                  </div>
                </div>
                {/* Avg score */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor, fontFamily: MONO }}>{e.avgScore}%</span>
                </div>
                {/* Best */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: MONO }}>{e.bestScore}%</span>
                </div>
                {/* Test count */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontFamily: MONO }}>{e.testCount}</span>
                </div>
                {/* XP */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: MONO }}>{e.totalXP.toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────
export default function TestPage() {
  const [tab,        setTab]        = useState<AppTab>('exam')
  const [phase,      setPhase]      = useState<TestPhase>('setup')
  const [config,     setConfig]     = useState<TestConfig>({ topic: '', difficulty: 'intermediate', questionCount: 10, timeLimitMinutes: 20 })
  const [generating, setGenerating] = useState(false)
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [answers,    setAnswers]    = useState<Record<number, Answer>>({})
  const [flags,      setFlags]      = useState<Set<number>>(new Set())
  const [elapsed,    setElapsed]    = useState(0)
  const [result,     setResult]     = useState<TestResult | null>(null)
  const [topicInput, setTopicInput] = useState('')
  const [activeQ,    setActiveQ]    = useState(0)
  const [history,    setHistory]    = useState<HistoryEntry[]>([])
  const [reviewEntry, setReviewEntry] = useState<HistoryEntry | null>(null)
  const [showFlagged, setShowFlagged] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setHistory(loadHistory()) }, [])

  const diffInfo      = DIFF[config.difficulty]
  const timeLimitSecs = config.timeLimitMinutes * 60
  const remaining     = Math.max(0, timeLimitSecs - elapsed)
  const answeredCount = Object.keys(answers).length
  const progress      = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const timeWarning   = remaining < 120 && phase === 'active'
  const flaggedQs     = questions.filter(q => flags.has(q.id))

  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  useEffect(() => {
    if (phase === 'active' && elapsed >= timeLimitSecs && timeLimitSecs > 0) submitTest()
  }, [elapsed])

  // ── Generate ─────────────────────────────────────────────────
  async function generateTest() {
    if (!config.topic.trim()) return
    setGenerating(true)
    try {
      const raw = await callSIGMA(
        `Generate a ${config.difficulty} level test on "${config.topic}" with exactly ${config.questionCount} questions.
Mix question types: MCQ (~40%), code analysis (~25%), short answer (~20%), true/false (~15%).
Output ONLY a valid JSON array — no markdown, no preamble, no trailing text:
[
  {"id":1,"type":"mcq","question":"...","options":["A","B","C","D"],"correct":"A","explanation":"...","points":10},
  {"id":2,"type":"code","question":"What is the output of this code?","code":"// real JS/Python code here","correct":"...","explanation":"...","points":15},
  {"id":3,"type":"truefalse","question":"...","options":["True","False"],"correct":"True","explanation":"...","points":5},
  {"id":4,"type":"short","question":"...","correct":"key terms expected","explanation":"...","points":10}
]
Important: MCQ must have exactly 4 options. Code questions MUST have a real executable code snippet. Difficulty: ${config.difficulty}.`,
        ' Output ONLY the JSON array. Absolutely no extra text before or after.'
      )
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const parsed: Question[] = JSON.parse(cleaned)
      setQuestions(parsed)
      setElapsed(0); setAnswers({}); setFlags(new Set()); setActiveQ(0)
      setPhase('active')
    } catch (e) {
      console.error('Test generation failed:', e)
      alert('Failed to generate exam — check console. The AI may have returned malformed JSON.')
    } finally { setGenerating(false) }
  }

  // ── Answer & flag ────────────────────────────────────────────
  function answerQuestion(qId: number, value: string) {
    setAnswers(prev => ({ ...prev, [qId]: { qId, value, flagged: flags.has(qId) } }))
    const idx = questions.findIndex(q => q.id === qId)
    const next = questions.findIndex((q, i) => i > idx && !answers[q.id])
    if (next !== -1) setTimeout(() => setActiveQ(next), 150)
  }

  function toggleFlag(qId: number) {
    setFlags(prev => {
      const s = new Set(prev)
      s.has(qId) ? s.delete(qId) : s.add(qId)
      return s
    })
  }

  // ── Submit ───────────────────────────────────────────────────
  async function submitTest() {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('submitting')
    const timeTaken = elapsed
    let totalPts = 0, earnedPts = 0
    const gradedAnswers: Answer[] = []

    questions.forEach(q => {
      totalPts += q.points
      const ans = answers[q.id]
      if (!ans?.value) {
        gradedAnswers.push({ qId: q.id, value: '', isCorrect: false, pointsEarned: 0, flagged: flags.has(q.id) })
        return
      }
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const correct = norm(q.correct), given = norm(ans.value)
      let isCorrect = false
      if (q.type === 'mcq' || q.type === 'truefalse') {
        isCorrect = given === correct || given[0] === correct[0]
      } else {
        const terms = correct.split(' ').filter(w => w.length > 3)
        isCorrect = terms.length === 0 || terms.filter(t => given.includes(t)).length >= Math.ceil(terms.length * 0.5)
      }
      const pts = isCorrect ? q.points : 0
      earnedPts += pts
      gradedAnswers.push({ qId: q.id, value: ans.value, isCorrect, pointsEarned: pts, flagged: flags.has(q.id) })
    })

    const percentage = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0
    const grade      = calcGrade(percentage)
    const multi      = config.difficulty === 'brutal' ? 3 : config.difficulty === 'advanced' ? 2 : 1.5
    const xpEarned   = Math.round(percentage * multi)

    let feedback = GRADES[grade].sigma
    try {
      const v = await callSIGMA(`Student scored ${percentage}% on ${config.difficulty} "${config.topic}". Time: ${Math.floor(timeTaken/60)}m. Unanswered: ${questions.length - Object.keys(answers).length}. Give a 2-sentence brutal verdict.`)
      if (v.trim()) feedback = v.trim()
    } catch {}

    await api.post('/tasks/save-result', { challengeTitle: `Test: ${config.topic}`, score: percentage, xpEarned, timeTaken, estimatedMinutes: config.timeLimitMinutes, difficulty: config.difficulty }).catch(() => {})

    const ansMap: Record<number, Answer> = {}
    gradedAnswers.forEach(a => { ansMap[a.qId] = a })
    setAnswers(ansMap)

    // Save to history
    const entry: HistoryEntry = {
      id: Date.now().toString(), topic: config.topic, difficulty: config.difficulty,
      percentage, grade, score: earnedPts, total: totalPts,
      correct: gradedAnswers.filter(a => a.isCorrect).length,
      timeTaken, xpEarned, date: new Date().toISOString(),
      questions, answers: gradedAnswers,
    }
    const newHistory = [entry, ...history]
    setHistory(newHistory)
    saveHistory(newHistory)

    setResult({ score: earnedPts, total: totalPts, percentage, grade, timeTaken, xpEarned, feedback, answers: gradedAnswers })
    setPhase('result')
  }

  function resetTest() {
    setPhase('setup'); setQuestions([]); setAnswers({}); setFlags(new Set())
    setElapsed(0); setResult(null); setActiveQ(0); setReviewEntry(null); setShowFlagged(false)
    setConfig(c => ({ ...c, topic: '' })); setTopicInput('')
  }

  // ─────────────────────────────────────────────────────────────
  // Full review mode (from history)
  if (reviewEntry) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:#050507;font-family:'Syne',sans-serif}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:2px}`}</style>
        <div style={{ minHeight: '100vh', background: '#050507', color: '#fff' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 18px' }}>
            <button onClick={() => setReviewEntry(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 20, fontFamily: 'Syne, sans-serif' }}>
              ← Back to History
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Review: {reviewEntry.topic}</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: GRADES[reviewEntry.grade].color, fontFamily: MONO }}>{reviewEntry.grade} · {reviewEntry.percentage}%</span>
              <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO }}>{reviewEntry.difficulty}</span>
              <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO }}>{new Date(reviewEntry.date).toLocaleDateString()}</span>
            </div>
            {reviewEntry.questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} total={reviewEntry.questions.length}
                answer={reviewEntry.answers.find(a => a.qId === q.id)}
                onAnswer={() => {}} revealed={true} />
            ))}
          </div>
        </div>
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#050507;font-family:'Syne',sans-serif}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .fade{animation:fadeIn .25s ease}
        button:active{transform:scale(.97)}
        input:focus,textarea:focus{outline:none}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#050507', color: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 18px' }}>

          {/* ── HEADER + TABS ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: '#6b7280', letterSpacing: 3, textTransform: 'uppercase', fontFamily: MONO }}>SIGMA EXAM ENGINE</span>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: phase === 'active' ? '#22c55e' : '#1f2937', animation: phase === 'active' ? 'pulse 1.5s infinite' : 'none' }} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
                Knowledge <span style={{ color: '#ef4444' }}>Test</span>
              </h1>
            </div>

            {/* Timer (active) */}
            {phase === 'active' && (
              <div style={{ background: timeWarning ? 'rgba(239,68,68,.1)' : '#080910', border: `1px solid ${timeWarning ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.07)'}`, borderRadius: 14, padding: '11px 16px', textAlign: 'right', transition: 'all .3s' }}>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: MONO, color: timeWarning ? '#ef4444' : '#fff', letterSpacing: 3, lineHeight: 1 }}>{fmt(remaining)}</div>
                <div style={{ fontSize: 9, color: '#374151', fontFamily: MONO, marginTop: 2 }}>{timeWarning ? '⚠ WARNING' : 'remaining'}</div>
                <div style={{ width: 90, height: 2, background: 'rgba(255,255,255,.05)', borderRadius: 1, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(remaining / timeLimitSecs) * 100}%`, background: timeWarning ? '#ef4444' : '#3b82f6', transition: 'width 1s linear, background .3s', borderRadius: 1 }} />
                </div>
              </div>
            )}
          </div>

          {/* Tab bar — only when not in active exam */}
          {phase !== 'active' && phase !== 'submitting' && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: '#07080f', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: 4 }}>
              {([
                { id: 'exam',      label: '⚡ Exam',      badge: 0 },
                { id: 'history',   label: '📋 History',   badge: history.length },
                { id: 'analytics', label: '📊 Analytics', badge: 0 },
              { id: 'leaderboard', label: '🏆 Board',    badge: 0 },
              ] as { id: AppTab; label: string; badge: number }[]).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none', background: tab === t.id ? 'rgba(239,68,68,.15)' : 'transparent', color: tab === t.id ? '#ef4444' : '#4b5563', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s', fontFamily: 'Syne, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {t.label}
                  {t.badge > 0 && <span style={{ background: 'rgba(239,68,68,.2)', color: '#ef4444', fontSize: 9, fontFamily: MONO, padding: '1px 5px', borderRadius: 4 }}>{t.badge}</span>}
                </button>
              ))}
            </div>
          )}

          {/* ═══════════ EXAM TAB ═══════════ */}
          {tab === 'exam' && (

            <>
            {/* ── SETUP ── */}
            {phase === 'setup' && (
              <div className="fade">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, alignItems: 'start' }}>

                  <div style={{ background: '#08090f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, padding: '24px' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#e5e7eb' }}>Configure Exam</h2>

                    {/* Topic */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: MONO }}>Topic</label>
                      <input value={topicInput} onChange={e => { setTopicInput(e.target.value); setConfig(c => ({ ...c, topic: e.target.value })) }}
                        placeholder="JavaScript Closures, React Hooks, SQL..."
                        style={{ width: '100%', background: '#0d0e1a', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '12px 16px', color: '#f0f0f0', fontSize: 14, fontFamily: 'Syne, sans-serif' }} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {TOPICS.map(t => (
                          <button key={t} onClick={() => { setTopicInput(t); setConfig(c => ({ ...c, topic: t })) }}
                            style={{ background: config.topic === t ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${config.topic === t ? 'rgba(239,68,68,.3)' : 'rgba(255,255,255,.06)'}`, borderRadius: 8, padding: '5px 10px', fontSize: 11, color: config.topic === t ? '#ef4444' : '#6b7280', cursor: 'pointer', transition: 'all .12s' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: MONO }}>Difficulty</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                        {(Object.keys(DIFF) as TestConfig['difficulty'][]).map(d => {
                          const info = DIFF[d], active = config.difficulty === d
                          return (
                            <button key={d} onClick={() => setConfig(c => ({ ...c, difficulty: d, questionCount: info.q, timeLimitMinutes: info.time }))}
                              style={{ background: active ? `${info.color}18` : 'rgba(255,255,255,.03)', border: `1px solid ${active ? `${info.color}40` : 'rgba(255,255,255,.06)'}`, borderRadius: 10, padding: '9px 6px', cursor: 'pointer', textAlign: 'center', transition: 'all .12s' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: active ? info.color : '#4b5563', marginBottom: 2 }}>{info.label}</div>
                              <div style={{ fontSize: 9, color: '#374151', fontFamily: MONO }}>{info.q}q·{info.time}m</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Count + Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                      {[
                        { label: 'Questions', key: 'questionCount' as const, min: 5, max: 20, step: 1, unit: 'q' },
                        { label: 'Time Limit', key: 'timeLimitMinutes' as const, min: 5, max: 60, step: 5, unit: 'm' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontFamily: MONO }}>{f.label}</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d0e1a', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 12px' }}>
                            <button onClick={() => setConfig(c => ({ ...c, [f.key]: Math.max(f.min, c[f.key] - f.step) }))} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.07)', color: '#9ca3af', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>−</button>
                            <span style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{config[f.key]}{f.unit}</span>
                            <button onClick={() => setConfig(c => ({ ...c, [f.key]: Math.min(f.max, c[f.key] + f.step) }))} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.07)', color: '#9ca3af', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>+</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={generateTest} disabled={!config.topic.trim() || generating}
                      style={{ width: '100%', padding: '13px', background: !config.topic.trim() ? 'rgba(255,255,255,.05)' : 'rgba(239,68,68,.15)', border: `1px solid ${!config.topic.trim() ? 'rgba(255,255,255,.07)' : 'rgba(239,68,68,.35)'}`, borderRadius: 12, color: !config.topic.trim() ? '#374151' : '#ef4444', fontSize: 13, fontWeight: 700, cursor: !config.topic.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Syne, sans-serif' }}>
                      {generating
                        ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(239,68,68,.3)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Building exam...</>
                        : `⚡ Generate ${config.questionCount}-Question Exam`}
                    </button>
                  </div>

                  {/* Preview + Rules */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: '#08090f', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: '16px' }}>
                      <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>Question Mix</div>
                      {[
                        { icon: '◉', label: 'MCQ',          count: Math.round(config.questionCount * 0.4),  pts: '10pt', color: '#3b82f6' },
                        { icon: '⟨/⟩', label: 'Code',       count: Math.round(config.questionCount * 0.25), pts: '15pt', color: '#f59e0b' },
                        { icon: '✎', label: 'Short',         count: Math.round(config.questionCount * 0.2),  pts: '10pt', color: '#22c55e' },
                        { icon: '◈', label: 'True/False',    count: Math.round(config.questionCount * 0.15), pts: '5pt',  color: '#a855f7' },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ color: item.color, fontSize: 11 }}>{item.icon}</span>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>{item.label}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>~{item.count}</span>
                            <span style={{ fontSize: 10, color: '#374151', marginLeft: 4 }}>{item.pts}</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>Est. total</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: diffInfo.color }}>~{config.questionCount * 10}pts</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.12)', borderRadius: 14, padding: '14px' }}>
                      <div style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9, fontFamily: MONO }}>Σ Rules</div>
                      {[`${config.timeLimitMinutes}m — no extensions`, 'Time out = auto-submit', 'Flag questions with ⚑', 'Results saved to history', 'Topic analytics updated'].map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                          <span style={{ color: '#ef4444', fontSize: 10, marginTop: 1, flexShrink: 0 }}>›</span>
                          <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{r}</span>
                        </div>
                      ))}
                    </div>

                    {/* Last test shortcut */}
                    {history.length > 0 && (
                      <div style={{ background: '#08090f', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '13px' }}>
                        <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7, fontFamily: MONO }}>Last Test</div>
                        <div style={{ fontSize: 12, color: '#e5e7eb', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{history[0].topic}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 22, fontWeight: 800, color: GRADES[history[0].grade].color, fontFamily: MONO }}>{history[0].percentage}%</span>
                          <button onClick={() => { setTopicInput(history[0].topic); setConfig(c => ({ ...c, topic: history[0].topic, difficulty: history[0].difficulty as any })) }}
                            style={{ fontSize: 10, color: '#6b7280', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 7, padding: '4px 9px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                            Retake
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTIVE EXAM ── */}
            {phase === 'active' && questions.length > 0 && (
              <div className="fade">
                {/* Progress bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: '#6b7280', fontFamily: MONO }}>{answeredCount}/{questions.length} answered</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {flags.size > 0 && (
                        <button onClick={() => setShowFlagged(f => !f)} style={{ fontSize: 10, color: showFlagged ? '#f59e0b' : '#4b5563', background: showFlagged ? 'rgba(245,158,11,.1)' : 'rgba(255,255,255,.04)', border: `1px solid ${showFlagged ? 'rgba(245,158,11,.3)' : 'rgba(255,255,255,.06)'}`, borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: MONO }}>
                          ⚑ {flags.size} flagged
                        </button>
                      )}
                      <span style={{ fontSize: 10, color: '#374151', fontFamily: MONO }}>{Math.round(progress)}%</span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#ef4444)', borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                </div>

                {/* Flagged panel */}
                {showFlagged && flaggedQs.length > 0 && (
                  <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: '#f59e0b', letterSpacing: 1, marginBottom: 8, fontFamily: MONO }}>⚑ FLAGGED FOR REVIEW</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {flaggedQs.map(q => {
                        const idx = questions.findIndex(x => x.id === q.id)
                        return (
                          <button key={q.id} onClick={() => { setActiveQ(idx); setShowFlagged(false) }}
                            style={{ padding: '5px 10px', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 7, color: '#f59e0b', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
                            Q{idx + 1} {answers[q.id] ? '✓' : '○'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Q navigator */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
                  {questions.map((q, i) => {
                    const answered = !!answers[q.id]
                    const isActive = i === activeQ
                    const isFlagged = flags.has(q.id)
                    return (
                      <button key={i} onClick={() => setActiveQ(i)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${isActive ? 'rgba(239,68,68,.6)' : isFlagged ? 'rgba(245,158,11,.5)' : answered ? 'rgba(59,130,246,.3)' : 'rgba(255,255,255,.07)'}`, background: isActive ? 'rgba(239,68,68,.15)' : isFlagged ? 'rgba(245,158,11,.1)' : answered ? 'rgba(59,130,246,.1)' : 'rgba(255,255,255,.03)', color: isActive ? '#ef4444' : isFlagged ? '#f59e0b' : answered ? '#93c5fd' : '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, transition: 'all .12s' }}>
                        {i + 1}
                      </button>
                    )
                  })}
                </div>

                {/* Active question */}
                <QuestionCard
                  q={questions[activeQ]} index={activeQ} total={questions.length}
                  answer={answers[questions[activeQ].id]}
                  onAnswer={(v) => answerQuestion(questions[activeQ].id, v)}
                  revealed={false}
                  flagged={flags.has(questions[activeQ].id)}
                  onFlag={() => toggleFlag(questions[activeQ].id)}
                />

                {/* Nav */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 }}>
                  <button onClick={() => setActiveQ(Math.max(0, activeQ - 1))} disabled={activeQ === 0}
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 16px', color: activeQ === 0 ? '#1f2937' : '#9ca3af', cursor: activeQ === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Syne, sans-serif' }}>
                    ← Prev
                  </button>
                  <button onClick={submitTest} style={{ background: answeredCount === questions.length ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.1)', border: `1px solid ${answeredCount === questions.length ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}`, borderRadius: 10, padding: '10px 18px', color: answeredCount === questions.length ? '#22c55e' : '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                    {answeredCount === questions.length ? '✓ Submit' : `Submit (${questions.length - answeredCount} left)`}
                  </button>
                  <button onClick={() => setActiveQ(Math.min(questions.length - 1, activeQ + 1))} disabled={activeQ === questions.length - 1}
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 16px', color: activeQ === questions.length - 1 ? '#1f2937' : '#9ca3af', cursor: activeQ === questions.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Syne, sans-serif' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── SUBMITTING ── */}
            {phase === 'submitting' && (
              <div className="fade" style={{ textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ width: 50, height: 50, border: '3px solid rgba(239,68,68,.15)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 18px' }} />
                <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 17, marginBottom: 5 }}>SIGMA is grading your exam...</p>
                <p style={{ color: '#374151', fontSize: 12, fontFamily: MONO }}>// calculating your inadequacy score</p>
              </div>
            )}

            {/* ── RESULT ── */}
            {phase === 'result' && result && (
              <div className="fade">
                {/* Hero */}
                <div style={{ background: '#080910', border: `1px solid ${GRADES[result.grade].color}30`, borderRadius: 20, padding: '26px', marginBottom: 14, boxShadow: `0 0 40px ${GRADES[result.grade].glow}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 18, alignItems: 'center', marginBottom: 18 }}>
                    {/* Grade */}
                    <div style={{ width: 86, height: 86, borderRadius: 18, background: `${GRADES[result.grade].color}15`, border: `2px solid ${GRADES[result.grade].color}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 38, fontWeight: 900, color: GRADES[result.grade].color, fontFamily: MONO, lineHeight: 1 }}>{result.grade}</span>
                      <span style={{ fontSize: 8, color: GRADES[result.grade].color, letterSpacing: 1.5, marginTop: 2 }}>GRADE</span>
                    </div>
                    {/* Details */}
                    <div>
                      <div style={{ fontSize: 42, fontWeight: 800, fontFamily: MONO, lineHeight: 1, color: '#fff' }}>
                        {result.percentage}<span style={{ fontSize: 17, color: '#374151', fontWeight: 400 }}>%</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        {result.score}/{result.total} pts · {result.answers.filter(a => a.isCorrect).length}/{questions.length} correct
                      </div>
                      <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 6, padding: '3px 8px' }}>+{result.xpEarned} XP</span>
                        <span style={{ fontSize: 10, color: '#6b7280', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 6, padding: '3px 8px', fontFamily: MONO }}>{Math.floor(result.timeTaken/60)}m {result.timeTaken%60}s</span>
                        <span style={{ fontSize: 10, color: diffInfo.color, background: `${diffInfo.color}10`, border: `1px solid ${diffInfo.color}25`, borderRadius: 6, padding: '3px 8px' }}>{diffInfo.label}</span>
                        {result.answers.filter(a => a.flagged).length > 0 && (
                          <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 6, padding: '3px 8px' }}>⚑ {result.answers.filter(a => a.flagged).length} flagged</span>
                        )}
                      </div>
                    </div>
                    <ScoreRing pct={result.percentage} color={GRADES[result.grade].color} />
                  </div>

                  {/* SIGMA verdict */}
                  <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.12)', borderRadius: 12, padding: '12px 15px', marginBottom: 16, display: 'flex', gap: 10 }}>
                    <span style={{ color: '#ef4444', fontSize: 15, flexShrink: 0 }}>Σ</span>
                    <p style={{ color: '#fca5a5', fontSize: 13.5, lineHeight: 1.65, fontStyle: 'italic' }}>"{result.feedback}"</p>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Correct',  value: result.answers.filter(a => a.isCorrect).length,            color: '#22c55e' },
                      { label: 'Wrong',    value: result.answers.filter(a => a.value && !a.isCorrect).length, color: '#ef4444' },
                      { label: 'Skipped',  value: result.answers.filter(a => !a.value).length,                color: '#6b7280' },
                      { label: 'Accuracy', value: `${result.percentage}%`,                                    color: GRADES[result.grade].color },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '11px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: '#374151', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question review */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#4b5563', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Question Review</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
                  </div>
                  {questions.map((q, i) => (
                    <QuestionCard key={q.id} q={q} index={i} total={questions.length}
                      answer={result.answers.find(a => a.qId === q.id)}
                      onAnswer={() => {}} revealed={true} />
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={resetTest} style={{ flex: 1, padding: '13px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>🔁 New Test</button>
                  <button onClick={() => { const t = config.topic; resetTest(); setTimeout(() => { setTopicInput(t); setConfig(c => ({ ...c, topic: t })); setTimeout(generateTest, 50) }, 50) }} disabled={generating}
                    style={{ flex: 1, padding: '13px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 12, color: '#93c5fd', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>↻ Retake Topic</button>
                </div>
              </div>
            )}
            </>
          )}

          {/* ═══════════ HISTORY TAB ═══════════ */}
          {tab === 'history' && phase !== 'active' && phase !== 'submitting' && (
            <div className="fade">
              <HistoryTab history={history} onReview={setReviewEntry} />
            </div>
          )}

          {/* ═══════════ ANALYTICS TAB ═══════════ */}
          {tab === 'analytics' && phase !== 'active' && phase !== 'submitting' && (
            <div className="fade">
              <AnalyticsTab history={history} />
            </div>
          )}

          {/* ═══════════ LEADERBOARD TAB ═══════════ */}
          {tab === 'leaderboard' && phase !== 'active' && phase !== 'submitting' && (
            <div className="fade">
              <LeaderboardTab />
            </div>
          )}

        </div>
      </div>
    </>
  )
}