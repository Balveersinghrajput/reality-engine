'use client'
import api from '@/lib/api'
import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type TestPhase = 'setup' | 'active' | 'submitting' | 'result'
type QType = 'mcq' | 'short' | 'code' | 'truefalse'

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

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const DIFF_LABELS = {
  beginner:     { label: 'Beginner',     color: '#22c55e', time: 15, q: 8  },
  intermediate: { label: 'Intermediate', color: '#f59e0b', time: 20, q: 10 },
  advanced:     { label: 'Advanced',     color: '#ef4444', time: 25, q: 12 },
  brutal:       { label: 'BRUTAL',       color: '#a855f7', time: 30, q: 15 },
}

const GRADE_DATA: Record<string, { color: string; label: string; sigma: string }> = {
  S: { color: '#a855f7', label: 'S — Exceptional', sigma: "Fine. You're not completely useless. Don't let it go to your head." },
  A: { color: '#22c55e', label: 'A — Strong',       sigma: "Above average. Still room to fail spectacularly, but you passed." },
  B: { color: '#3b82f6', label: 'B — Decent',       sigma: "Mediocre by my standards. The bar was low and you barely cleared it." },
  C: { color: '#f59e0b', label: 'C — Weak',         sigma: "You scraped through. That's not a compliment." },
  F: { color: '#ef4444', label: 'F — Failed',       sigma: "Disgraceful. Study harder or find a different career." },
}

function calcGrade(pct: number) {
  if (pct >= 90) return 'S'
  if (pct >= 75) return 'A'
  if (pct >= 60) return 'B'
  if (pct >= 45) return 'C'
  return 'F'
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

const MONO = '"JetBrains Mono", monospace'

async function callSIGMA(prompt: string, systemExtra = '') {
  const res = await api.post('/tasks/sigma', {
    system: `You are SIGMA — a brutally honest AI testing examiner. You create rigorous, fair but tough exams.${systemExtra}`,
    messages: [{ role: 'user', content: prompt }],
  })
  return (res.data.reply ?? '') as string
}

const TOPICS = [
  'JavaScript Closures', 'React Hooks', 'Async/Await', 'CSS Flexbox',
  'TypeScript Generics', 'REST APIs', 'SQL Joins', 'Big O Notation',
  'Binary Search', 'Git Workflow', 'Docker Basics', 'Node.js Events',
]

// ─────────────────────────────────────────────────────────────────
// Question Card
// ─────────────────────────────────────────────────────────────────
function QuestionCard({
  q, index, total, answer, onAnswer, revealed,
}: {
  q: Question
  index: number
  total: number
  answer: Answer | undefined
  onAnswer: (v: string) => void
  revealed: boolean
}) {
  const [shortInput, setShortInput] = useState(answer?.value ?? '')
  const isCorrect  = revealed && answer?.isCorrect
  const isWrong    = revealed && answer && !answer.isCorrect

  return (
    <div style={{
      background: '#07080f',
      border: `1px solid ${revealed
        ? (isCorrect ? 'rgba(34,197,94,.3)' : isWrong ? 'rgba(239,68,68,.3)' : 'rgba(100,100,100,.2)')
        : 'rgba(255,255,255,.07)'}`,
      borderRadius: 16,
      padding: '20px',
      marginBottom: 14,
      transition: 'border-color .3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: revealed
            ? (isCorrect ? 'rgba(34,197,94,.15)' : isWrong ? 'rgba(239,68,68,.15)' : 'rgba(100,100,100,.1)')
            : 'rgba(255,255,255,.06)',
          border: `1px solid ${revealed
            ? (isCorrect ? 'rgba(34,197,94,.3)' : isWrong ? 'rgba(239,68,68,.3)' : 'rgba(100,100,100,.2)')
            : 'rgba(255,255,255,.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, fontFamily: MONO,
          color: revealed ? (isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#6b7280') : '#9ca3af',
        }}>
          {revealed ? (isCorrect ? '✓' : isWrong ? '✗' : '—') : index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const,
              color: q.type === 'code' ? '#f59e0b' : q.type === 'mcq' ? '#3b82f6' : '#6b7280',
              background: q.type === 'code' ? 'rgba(245,158,11,.1)' : q.type === 'mcq' ? 'rgba(59,130,246,.1)' : 'rgba(255,255,255,.05)',
              borderRadius: 5, padding: '2px 7px',
              border: `1px solid ${q.type === 'code' ? 'rgba(245,158,11,.2)' : q.type === 'mcq' ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.07)'}`,
            }}>
              {q.type === 'code' ? '⟨/⟩ Code' : q.type === 'mcq' ? '◉ MCQ' : q.type === 'truefalse' ? '◈ T/F' : '✎ Short'}
            </span>
            <span style={{ fontSize: 9, color: '#374151', fontFamily: MONO }}>{q.points} pts · Q{index + 1}/{total}</span>
          </div>
          <p style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{q.question}</p>
        </div>
      </div>

      {/* Code block */}
      {q.code && (
        <div style={{
          background: '#03040a', border: '1px solid rgba(245,158,11,.15)',
          borderRadius: 10, padding: '12px 14px', marginBottom: 14,
          fontFamily: MONO, fontSize: 12.5, color: '#fbbf24',
          lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre',
        }}>
          {q.code}
        </div>
      )}

      {/* Answer input (active phase) */}
      {!revealed && (
        <>
          {(q.type === 'mcq' || q.type === 'truefalse') && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => onAnswer(opt)} style={{
                  background: answer?.value === opt ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${answer?.value === opt ? 'rgba(59,130,246,.4)' : 'rgba(255,255,255,.07)'}`,
                  borderRadius: 10, padding: '10px 14px', textAlign: 'left',
                  color: answer?.value === opt ? '#93c5fd' : '#9ca3af',
                  fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: answer?.value === opt ? 'rgba(59,130,246,.3)' : 'rgba(255,255,255,.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10,
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {(q.type === 'short' || q.type === 'code') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={shortInput}
                onChange={e => setShortInput(e.target.value)}
                placeholder={q.type === 'code' ? 'Write your answer / explain the output...' : 'Your answer...'}
                rows={q.type === 'code' ? 3 : 2}
                style={{
                  flex: 1, background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 10, padding: '10px 13px', color: '#e5e7eb',
                  fontSize: 13, fontFamily: q.type === 'code' ? MONO : 'inherit',
                  resize: 'none', lineHeight: 1.6, outline: 'none',
                }}
              />
              <button onClick={() => onAnswer(shortInput)} disabled={!shortInput.trim()} style={{
                width: 38, borderRadius: 10, border: 'none',
                background: shortInput.trim() ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.04)',
                color: shortInput.trim() ? '#93c5fd' : '#374151',
                cursor: shortInput.trim() ? 'pointer' : 'not-allowed', fontSize: 16,
              }}>✓</button>
            </div>
          )}
        </>
      )}

      {/* Revealed result */}
      {revealed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {answer?.value && (
              <div style={{
                background: isCorrect ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
                border: `1px solid ${isCorrect ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`,
                borderRadius: 8, padding: '6px 12px',
              }}>
                <span style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>YOUR ANSWER</span>
                <span style={{ fontSize: 12.5, color: isCorrect ? '#86efac' : '#fca5a5' }}>{answer.value}</span>
              </div>
            )}
            {!isCorrect && (
              <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 8, padding: '6px 12px' }}>
                <span style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>CORRECT ANSWER</span>
                <span style={{ fontSize: 12.5, color: '#86efac' }}>{q.correct}</span>
              </div>
            )}
          </div>
          <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.1)', borderRadius: 8, padding: '10px 12px' }}>
            <span style={{ fontSize: 9, color: '#ef4444', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Σ EXPLANATION</span>
            <p style={{ fontSize: 12.5, color: '#d1d5db', lineHeight: 1.6 }}>{q.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Score ring SVG
// ─────────────────────────────────────────────────────────────────
function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 32
  const circ = 2 * Math.PI * r
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${circ * (1 - pct / 100)}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="40" y="45" textAnchor="middle" fill={color} fontSize="13" fontWeight="700" fontFamily="monospace">
        {pct}%
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────
export default function TestPage() {
  const [phase,      setPhase]      = useState<TestPhase>('setup')
  const [config,     setConfig]     = useState<TestConfig>({
    topic: '', difficulty: 'intermediate', questionCount: 10, timeLimitMinutes: 20,
  })
  const [generating, setGenerating] = useState(false)
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [answers,    setAnswers]    = useState<Record<number, Answer>>({})
  const [elapsed,    setElapsed]    = useState(0)
  const [result,     setResult]     = useState<TestResult | null>(null)
  const [topicInput, setTopicInput] = useState('')
  const [activeQ,    setActiveQ]    = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const diffInfo       = DIFF_LABELS[config.difficulty]
  const timeLimitSecs  = config.timeLimitMinutes * 60
  const remaining      = Math.max(0, timeLimitSecs - elapsed)
  const answeredCount  = Object.keys(answers).length
  const progress       = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const timeWarning    = remaining < 120 && phase === 'active'

  // Timer
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // Auto-submit on time up
  useEffect(() => {
    if (phase === 'active' && elapsed >= timeLimitSecs && timeLimitSecs > 0) {
      submitTest()
    }
  }, [elapsed])

  // ── Generate exam ────────────────────────────────────────────
  async function generateTest() {
    if (!config.topic.trim()) return
    setGenerating(true)
    try {
      const raw = await callSIGMA(
        `Generate a ${config.difficulty} level test on "${config.topic}" with exactly ${config.questionCount} questions.
Mix types: MCQ, short answer, true/false, code analysis.
Output ONLY a valid JSON array — no markdown, no extra text:
[
  {"id":1,"type":"mcq","question":"...","options":["A","B","C","D"],"correct":"A","explanation":"...","points":10},
  {"id":2,"type":"code","question":"What does this output?","code":"const x = 1 + '2'","correct":"12","explanation":"...","points":15},
  {"id":3,"type":"truefalse","question":"...","options":["True","False"],"correct":"True","explanation":"...","points":5},
  {"id":4,"type":"short","question":"...","correct":"...","explanation":"...","points":10}
]
Rules: MCQ=4 options, truefalse=["True","False"], code needs real code snippet, points: mcq=10 short=10 code=15 truefalse=5`,
        ' Output ONLY the JSON array. No extra text whatsoever.'
      )
      const cleaned  = raw.replace(/```json|```/g, '').trim()
      const parsed: Question[] = JSON.parse(cleaned)
      setQuestions(parsed)
      setElapsed(0)
      setAnswers({})
      setActiveQ(0)
      setPhase('active')
    } catch (e) {
      console.error(e)
      alert('Failed to generate exam. Check console.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Answer ───────────────────────────────────────────────────
  function answerQuestion(qId: number, value: string) {
    setAnswers(prev => ({ ...prev, [qId]: { qId, value } }))
    const currentIdx = questions.findIndex(q => q.id === qId)
    const next = questions.findIndex((q, i) => i > currentIdx && !answers[q.id])
    if (next !== -1) setActiveQ(next)
  }

  // ── Submit & grade ───────────────────────────────────────────
  async function submitTest() {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('submitting')

    const timeTaken = elapsed
    let totalPts = 0
    let earnedPts = 0
    const gradedAnswers: Answer[] = []

    questions.forEach(q => {
      totalPts += q.points
      const ans = answers[q.id]
      if (!ans?.value) {
        gradedAnswers.push({ qId: q.id, value: '', isCorrect: false, pointsEarned: 0 })
        return
      }
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const correct = norm(q.correct)
      const given   = norm(ans.value)
      let isCorrect = false

      if (q.type === 'mcq' || q.type === 'truefalse') {
        isCorrect = given === correct || given[0] === correct[0]
      } else {
        const keyTerms  = correct.split(' ').filter(w => w.length > 3)
        const matchCount = keyTerms.filter(t => given.includes(t)).length
        isCorrect = keyTerms.length === 0 || matchCount >= Math.ceil(keyTerms.length * 0.5)
      }

      const pts = isCorrect ? q.points : 0
      earnedPts += pts
      gradedAnswers.push({ qId: q.id, value: ans.value, isCorrect, pointsEarned: pts })
    })

    const percentage = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0
    const grade      = calcGrade(percentage)
    const multi      = config.difficulty === 'brutal' ? 3 : config.difficulty === 'advanced' ? 2 : 1.5
    const xpEarned   = Math.round(percentage * multi)

    let feedback = GRADE_DATA[grade].sigma
    try {
      const verdict = await callSIGMA(
        `Student scored ${percentage}% on a ${config.difficulty} "${config.topic}" test. Time: ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s. Unanswered: ${questions.length - Object.keys(answers).length}. Give a 2-sentence brutal verdict.`
      )
      if (verdict.trim()) feedback = verdict.trim()
    } catch {}

    await api.post('/tasks/save-result', {
      challengeTitle: `Test: ${config.topic}`,
      score: percentage, xpEarned, timeTaken,
      estimatedMinutes: config.timeLimitMinutes,
      difficulty: config.difficulty,
    }).catch(() => {})

    const ansMap: Record<number, Answer> = {}
    gradedAnswers.forEach(a => { ansMap[a.qId] = a })
    setAnswers(ansMap)

    setResult({ score: earnedPts, total: totalPts, percentage, grade, timeTaken, xpEarned, feedback, answers: gradedAnswers })
    setPhase('result')
  }

  function resetTest() {
    setPhase('setup'); setQuestions([]); setAnswers({})
    setElapsed(0); setResult(null); setActiveQ(0)
    setConfig(c => ({ ...c, topic: '' })); setTopicInput('')
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#050507;font-family:'Syne',sans-serif}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .fade{animation:fadeIn .3s ease}
        button:active{transform:scale(.97)}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#050507', color: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 18px' }}>

          {/* ── HEADER ── */}
          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: '#6b7280', letterSpacing: 3, textTransform: 'uppercase', fontFamily: MONO }}>SIGMA EXAM ENGINE</span>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: phase === 'active' ? '#22c55e' : '#374151', animation: phase === 'active' ? 'blink 1.5s infinite' : 'none' }} />
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
                Knowledge <span style={{ color: '#ef4444' }}>Test</span>
              </h1>
              <p style={{ color: '#374151', fontSize: 11, marginTop: 5, fontFamily: MONO }}>
                {phase === 'setup'      && '// configure your exam → face questions'}
                {phase === 'active'     && `// exam active — ${answeredCount}/${questions.length} answered`}
                {phase === 'submitting' && '// grading in progress...'}
                {phase === 'result'     && `// exam complete — ${result?.percentage}% scored`}
              </p>
            </div>

            {/* Timer */}
            {phase === 'active' && (
              <div style={{
                background: timeWarning ? 'rgba(239,68,68,.1)' : '#080910',
                border: `1px solid ${timeWarning ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.07)'}`,
                borderRadius: 14, padding: '12px 18px', textAlign: 'right', transition: 'all .3s',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: MONO, color: timeWarning ? '#ef4444' : '#fff', letterSpacing: 3, lineHeight: 1 }}>
                  {fmt(remaining)}
                </div>
                <div style={{ fontSize: 9, color: '#374151', fontFamily: MONO, marginTop: 3 }}>
                  {timeWarning ? '⚠ TIME WARNING' : 'remaining'}
                </div>
                <div style={{ width: 100, height: 2, background: 'rgba(255,255,255,.05)', borderRadius: 1, marginTop: 7, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(remaining / timeLimitSecs) * 100}%`, background: timeWarning ? '#ef4444' : '#3b82f6', transition: 'width 1s linear, background .3s', borderRadius: 1 }} />
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* SETUP                                           */}
          {/* ════════════════════════════════════════════════ */}
          {phase === 'setup' && (
            <div className="fade">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

                {/* Config panel */}
                <div style={{ background: '#080910', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, padding: '24px' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#e5e7eb' }}>Exam Configuration</h2>

                  {/* Topic input */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: MONO }}>Topic</label>
                    <input
                      value={topicInput}
                      onChange={e => { setTopicInput(e.target.value); setConfig(c => ({ ...c, topic: e.target.value })) }}
                      placeholder="e.g. JavaScript Closures, React Hooks, SQL..."
                      style={{ width: '100%', background: '#0d0e1a', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '12px 16px', color: '#f0f0f0', fontSize: 14, outline: 'none', fontFamily: 'Syne, sans-serif' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {TOPICS.map(t => (
                        <button key={t} onClick={() => { setTopicInput(t); setConfig(c => ({ ...c, topic: t })) }}
                          style={{ background: config.topic === t ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${config.topic === t ? 'rgba(239,68,68,.3)' : 'rgba(255,255,255,.06)'}`, borderRadius: 8, padding: '5px 11px', fontSize: 11, color: config.topic === t ? '#ef4444' : '#6b7280', cursor: 'pointer', transition: 'all .15s' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: MONO }}>Difficulty</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                      {(Object.keys(DIFF_LABELS) as TestConfig['difficulty'][]).map(d => {
                        const info = DIFF_LABELS[d]
                        const active = config.difficulty === d
                        return (
                          <button key={d} onClick={() => setConfig(c => ({ ...c, difficulty: d, questionCount: info.q, timeLimitMinutes: info.time }))}
                            style={{ background: active ? `${info.color}18` : 'rgba(255,255,255,.03)', border: `1px solid ${active ? `${info.color}40` : 'rgba(255,255,255,.06)'}`, borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: active ? info.color : '#4b5563', marginBottom: 3 }}>{info.label}</div>
                            <div style={{ fontSize: 9, color: '#374151', fontFamily: MONO }}>{info.q}q · {info.time}m</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Q count & time */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {[
                      { label: 'Questions', key: 'questionCount' as const, min: 5, max: 20, unit: 'q', step: 1 },
                      { label: 'Time Limit', key: 'timeLimitMinutes' as const, min: 5, max: 60, unit: 'm', step: 5 },
                    ].map(field => (
                      <div key={field.key}>
                        <label style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontFamily: MONO }}>{field.label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d0e1a', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 12px' }}>
                          <button onClick={() => setConfig(c => ({ ...c, [field.key]: Math.max(field.min, c[field.key] - field.step) }))}
                            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.07)', color: '#9ca3af', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                          <span style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>
                            {config[field.key]}{field.unit}
                          </span>
                          <button onClick={() => setConfig(c => ({ ...c, [field.key]: Math.min(field.max, c[field.key] + field.step) }))}
                            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.07)', color: '#9ca3af', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={generateTest} disabled={!config.topic.trim() || generating}
                    style={{ width: '100%', padding: '14px', background: !config.topic.trim() ? 'rgba(255,255,255,.05)' : 'rgba(239,68,68,.15)', border: `1px solid ${!config.topic.trim() ? 'rgba(255,255,255,.07)' : 'rgba(239,68,68,.35)'}`, borderRadius: 12, color: !config.topic.trim() ? '#374151' : '#ef4444', fontSize: 14, fontWeight: 700, cursor: !config.topic.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Syne, sans-serif' }}>
                    {generating
                      ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(239,68,68,.3)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Building your exam...</>
                      : `⚡ Generate ${config.questionCount}-Question Exam`}
                  </button>
                </div>

                {/* Right: preview + rules */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Question mix preview */}
                  <div style={{ background: '#080910', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: '18px' }}>
                    <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>Exam Preview</div>
                    {[
                      { icon: '◉', label: 'MCQ',          count: Math.round(config.questionCount * 0.4),  pts: '10 pts', color: '#3b82f6' },
                      { icon: '⟨/⟩', label: 'Code Analysis', count: Math.round(config.questionCount * 0.25), pts: '15 pts', color: '#f59e0b' },
                      { icon: '✎', label: 'Short Answer', count: Math.round(config.questionCount * 0.2),  pts: '10 pts', color: '#22c55e' },
                      { icon: '◈', label: 'True / False', count: Math.round(config.questionCount * 0.15), pts: '5 pts',  color: '#a855f7' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: item.color, fontSize: 11 }}>{item.icon}</span>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>{item.label}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>~{item.count}</span>
                          <span style={{ fontSize: 10, color: '#374151', marginLeft: 4 }}>{item.pts}</span>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Total</span>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: diffInfo.color }}>~{config.questionCount * 10}pts</span>
                    </div>
                  </div>

                  {/* Rules */}
                  <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.12)', borderRadius: 14, padding: '16px' }}>
                    <div style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontFamily: MONO }}>Σ Rules</div>
                    {[
                      `${config.timeLimitMinutes} minutes — no extensions`,
                      'Time runs out = auto-submit',
                      'Short answers graded on key concepts',
                      'All questions graded by SIGMA AI',
                      'Results saved to performance graph',
                    ].map((rule, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#ef4444', fontSize: 10, marginTop: 1, flexShrink: 0 }}>›</span>
                        <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* ACTIVE EXAM                                     */}
          {/* ════════════════════════════════════════════════ */}
          {phase === 'active' && questions.length > 0 && (
            <div className="fade">
              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#6b7280', fontFamily: MONO }}>{answeredCount}/{questions.length} answered</span>
                  <span style={{ fontSize: 10, color: '#6b7280', fontFamily: MONO }}>{Math.round(progress)}% complete</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#ef4444)', borderRadius: 2, transition: 'width .3s' }} />
                </div>
              </div>

              {/* Q navigator */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {questions.map((q, i) => {
                  const answered = !!answers[q.id]
                  const isActive = i === activeQ
                  return (
                    <button key={i} onClick={() => setActiveQ(i)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${isActive ? 'rgba(239,68,68,.5)' : answered ? 'rgba(59,130,246,.3)' : 'rgba(255,255,255,.07)'}`, background: isActive ? 'rgba(239,68,68,.12)' : answered ? 'rgba(59,130,246,.1)' : 'rgba(255,255,255,.03)', color: isActive ? '#ef4444' : answered ? '#93c5fd' : '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
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
              />

              {/* Nav buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button onClick={() => setActiveQ(Math.max(0, activeQ - 1))} disabled={activeQ === 0}
                  style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 18px', color: activeQ === 0 ? '#374151' : '#9ca3af', cursor: activeQ === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Syne, sans-serif' }}>
                  ← Previous
                </button>
                <button onClick={submitTest} style={{ background: answeredCount === questions.length ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.12)', border: `1px solid ${answeredCount === questions.length ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.25)'}`, borderRadius: 10, padding: '10px 20px', color: answeredCount === questions.length ? '#22c55e' : '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                  {answeredCount === questions.length ? '✓ Submit Exam' : `Submit (${questions.length - answeredCount} unanswered)`}
                </button>
                <button onClick={() => setActiveQ(Math.min(questions.length - 1, activeQ + 1))} disabled={activeQ === questions.length - 1}
                  style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 18px', color: activeQ === questions.length - 1 ? '#374151' : '#9ca3af', cursor: activeQ === questions.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Syne, sans-serif' }}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* SUBMITTING                                      */}
          {/* ════════════════════════════════════════════════ */}
          {phase === 'submitting' && (
            <div className="fade" style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ width: 52, height: 52, border: '3px solid rgba(239,68,68,.15)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 20px' }} />
              <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>SIGMA is grading your exam...</p>
              <p style={{ color: '#374151', fontSize: 12, fontFamily: MONO }}>// calculating your inadequacy score</p>
            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* RESULT                                          */}
          {/* ════════════════════════════════════════════════ */}
          {phase === 'result' && result && (
            <div className="fade">
              {/* Score hero */}
              <div style={{ background: '#080910', border: `1px solid ${GRADE_DATA[result.grade].color}30`, borderRadius: 20, padding: '28px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 20, alignItems: 'center' }}>

                  {/* Grade badge */}
                  <div style={{ width: 90, height: 90, borderRadius: 20, background: `${GRADE_DATA[result.grade].color}15`, border: `2px solid ${GRADE_DATA[result.grade].color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', flexShrink: 0 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: GRADE_DATA[result.grade].color, fontFamily: MONO, lineHeight: 1 }}>{result.grade}</span>
                    <span style={{ fontSize: 8, color: GRADE_DATA[result.grade].color, letterSpacing: 1, marginTop: 2 }}>GRADE</span>
                  </div>

                  {/* Score details */}
                  <div>
                    <div style={{ fontSize: 44, fontWeight: 800, fontFamily: MONO, lineHeight: 1, color: '#fff' }}>
                      {result.percentage}<span style={{ fontSize: 18, color: '#374151', fontWeight: 400 }}>%</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                      {result.score} / {result.total} pts · {result.answers.filter(a => a.isCorrect).length}/{questions.length} correct
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 6, padding: '3px 9px' }}>+{result.xpEarned} XP</span>
                      <span style={{ fontSize: 10, color: '#6b7280', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, padding: '3px 9px', fontFamily: MONO }}>
                        {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s / {config.timeLimitMinutes}m
                      </span>
                      <span style={{ fontSize: 10, color: diffInfo.color, background: `${diffInfo.color}10`, border: `1px solid ${diffInfo.color}25`, borderRadius: 6, padding: '3px 9px' }}>
                        {diffInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Ring */}
                  <ScoreRing pct={result.percentage} color={GRADE_DATA[result.grade].color} />
                </div>

                {/* SIGMA verdict */}
                <div style={{ marginTop: 18, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.12)', borderRadius: 12, padding: '13px 16px', display: 'flex', gap: 10 }}>
                  <span style={{ color: '#ef4444', fontSize: 16, flexShrink: 0 }}>Σ</span>
                  <p style={{ color: '#fca5a5', fontSize: 13.5, lineHeight: 1.6, fontStyle: 'italic' }}>"{result.feedback}"</p>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 16 }}>
                  {[
                    { label: 'Correct',  value: result.answers.filter(a => a.isCorrect).length,           color: '#22c55e' },
                    { label: 'Wrong',    value: result.answers.filter(a => a.value && !a.isCorrect).length, color: '#ef4444' },
                    { label: 'Skipped',  value: result.answers.filter(a => !a.value).length,               color: '#6b7280' },
                    { label: 'Accuracy', value: `${result.percentage}%`,                                   color: GRADE_DATA[result.grade].color },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: '#374151', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question review */}
              <div style={{ marginBottom: 16 }}>
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
                <button onClick={resetTest} style={{ flex: 1, padding: '13px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                  🔁 New Test
                </button>
                <button onClick={() => { setPhase('setup'); setTimeout(generateTest, 100) }} disabled={generating}
                  style={{ flex: 1, padding: '13px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 12, color: '#93c5fd', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                  ↻ Retake Same Topic
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}