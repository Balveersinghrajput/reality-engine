'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart2, BookOpen, Brain, Calendar, CheckCircle, ChevronRight,
  ClipboardList, Clock, Flame, Globe, LogOut, RefreshCw,
  Target, TrendingUp, Trophy, Users, Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface DailyTask {
  id: string; title: string; description: string; category: string
  estimatedMinutes: number; priority: 'high' | 'medium' | 'low'
  completed: boolean; completedAt?: string; date: string; phase?: string
  xp?: number
}
interface DayPerf { date: string; label: string; score: number; tasks: number; grade: string }
interface TestRecord {
  id: string; score: number; passed: boolean; difficulty: string
  date: string; timeTaken?: number; topic?: string
}
interface LbEntry {
  rank: number; userId: string; username: string; tier: string; level: string
  score: number; mastery: number; streak: number; testsCount: number
  xp: number; isCurrentUser?: boolean
}

type PhaseTask = { title: string; description: string; category: string; estimatedMinutes: number; priority: 'high'|'medium'|'low'; xp?: number }
type Phase = { phase: string; week: number; level: 'beginner'|'intermediate'|'advanced'; tasks: PhaseTask[] }

// ─────────────────────────────────────────────
// Full Learning Paths
// ─────────────────────────────────────────────
const PATHS: Record<string, Phase[]> = {
  'web development': [
    { phase: 'HTML Foundations', week: 1, level: 'beginner', tasks: [
      { title: 'Build a semantic HTML page from scratch', description: 'Use header, nav, main, section, article, footer — zero divs for structure', category: 'coding', estimatedMinutes: 40, priority: 'high', xp: 50 },
      { title: 'Create an HTML form with full validation', description: 'All input types, labels, required, minlength, pattern — test every field', category: 'coding', estimatedMinutes: 30, priority: 'high', xp: 40 },
      { title: 'Master HTML5 semantic elements', description: 'Document 10 cases where semantic tags beat divs for SEO & accessibility', category: 'review', estimatedMinutes: 25, priority: 'medium', xp: 30 },
      { title: 'Build a complex HTML table', description: 'thead, tbody, tfoot, colspan, rowspan — model a real class schedule', category: 'practice', estimatedMinutes: 30, priority: 'medium', xp: 35 },
      { title: 'Add meta tags + Open Graph to your page', description: 'title, description, og:image, viewport, charset — verify in browser preview', category: 'coding', estimatedMinutes: 20, priority: 'low', xp: 25 },
    ]},
    { phase: 'CSS Mastery', week: 2, level: 'beginner', tasks: [
      { title: 'Build a responsive navbar with Flexbox', description: 'Logo left, links right, hamburger on mobile — zero JavaScript', category: 'coding', estimatedMinutes: 45, priority: 'high', xp: 55 },
      { title: 'Create a card grid with CSS Grid', description: '3-col desktop → 2-col tablet → 1-col mobile using grid-template-columns', category: 'coding', estimatedMinutes: 40, priority: 'high', xp: 50 },
      { title: 'Refactor stylesheet to CSS custom properties', description: 'Extract all colors, spacing, font-sizes into :root variables', category: 'coding', estimatedMinutes: 30, priority: 'medium', xp: 35 },
      { title: 'Write media queries for 3 breakpoints', description: 'Test at 320px, 768px, 1280px — screenshot each, document what breaks', category: 'coding', estimatedMinutes: 35, priority: 'high', xp: 45 },
      { title: 'Build CSS animations for a landing page', description: 'fadeIn on load, hover effects on buttons and cards, smooth transitions', category: 'coding', estimatedMinutes: 35, priority: 'medium', xp: 40 },
    ]},
    { phase: 'JavaScript Fundamentals', week: 3, level: 'beginner', tasks: [
      { title: 'Implement map(), filter(), reduce() from scratch', description: 'Write custom versions, test with arrays of user objects', category: 'coding', estimatedMinutes: 55, priority: 'high', xp: 70 },
      { title: 'DOM manipulation: 3 interactive challenges', description: 'Create/insert elements, handle clicks, toggle classes — no frameworks', category: 'practice', estimatedMinutes: 45, priority: 'high', xp: 60 },
      { title: 'Build a fetch() integration with loading states', description: 'Call JSONPlaceholder API, show spinner, handle errors, render to DOM', category: 'coding', estimatedMinutes: 50, priority: 'high', xp: 65 },
      { title: 'Master closures with 5 real-world examples', description: 'Counter, memoize, once(), private data, module pattern', category: 'coding', estimatedMinutes: 35, priority: 'medium', xp: 45 },
      { title: 'Refactor ES5 code to modern ES6+', description: 'Destructuring, spread, optional chaining, nullish coalescing, arrow fns', category: 'review', estimatedMinutes: 30, priority: 'medium', xp: 35 },
    ]},
    { phase: 'React Fundamentals', week: 5, level: 'intermediate', tasks: [
      { title: 'Build 5 reusable React components', description: 'Button variants, Card, Modal, Input (controlled), Badge — with TypeScript props', category: 'coding', estimatedMinutes: 60, priority: 'high', xp: 80 },
      { title: 'Build a todo app with useState + useEffect', description: 'Add, complete, delete — localStorage persist, fetch on mount', category: 'coding', estimatedMinutes: 55, priority: 'high', xp: 75 },
      { title: 'Implement Context API theme switcher', description: 'createContext, useContext, Provider — dark/light mode with persistence', category: 'coding', estimatedMinutes: 40, priority: 'medium', xp: 55 },
      { title: 'Profile a React component with DevTools', description: 'Find re-renders, fix with memo/useCallback, document what changed', category: 'review', estimatedMinutes: 30, priority: 'medium', xp: 40 },
      { title: 'Build full CRUD app in React', description: 'Create, Read, Update, Delete with form, list, optimistic UI updates', category: 'coding', estimatedMinutes: 70, priority: 'high', xp: 90 },
    ]},
  ],
  'software engineering': [
    { phase: 'DSA Foundations', week: 1, level: 'beginner', tasks: [
      { title: 'Solve Two Sum, Best Time to Buy, Contains Duplicate', description: 'Brute force first, then optimal. Analyze time/space complexity', category: 'dsa', estimatedMinutes: 60, priority: 'high', xp: 75 },
      { title: 'Implement a linked list with 6 operations', description: 'Insert head/tail/position, delete, reverse, detect cycle — with tests', category: 'dsa', estimatedMinutes: 55, priority: 'high', xp: 70 },
      { title: 'Analyze Big O for 10 code snippets', description: 'Write complexity, explain WHY — cover O(n²), O(log n), O(n log n)', category: 'review', estimatedMinutes: 30, priority: 'medium', xp: 40 },
      { title: 'Solve Valid Parentheses + Min Stack', description: 'Stack data structure LIFO applications — implement both with tests', category: 'dsa', estimatedMinutes: 45, priority: 'high', xp: 60 },
      { title: 'Implement binary search + 2 variants', description: 'Classic, search rotated array, find peak element', category: 'coding', estimatedMinutes: 40, priority: 'medium', xp: 55 },
    ]},
    { phase: 'Arrays & Strings', week: 2, level: 'beginner', tasks: [
      { title: 'Solve 3 sliding window problems', description: 'Max sum k-subarray, longest unique substring, min window substring', category: 'dsa', estimatedMinutes: 55, priority: 'high', xp: 70 },
      { title: 'Two-pointer technique: 4 problems', description: 'Two Sum sorted, 3Sum, Container Most Water, Trapping Rain Water', category: 'dsa', estimatedMinutes: 60, priority: 'high', xp: 80 },
      { title: 'String manipulation: 5 classic problems', description: 'Anagram, palindrome, count words, reverse words, string compression', category: 'dsa', estimatedMinutes: 45, priority: 'medium', xp: 60 },
      { title: 'Prefix sum array: 3 applications', description: 'Range sum query, subarray sum equals k, product except self', category: 'dsa', estimatedMinutes: 40, priority: 'medium', xp: 55 },
      { title: 'Mock interview: 30min array problem', description: 'Pick a medium LeetCode array problem, solve under time pressure', category: 'practice', estimatedMinutes: 35, priority: 'high', xp: 65 },
    ]},
    { phase: 'Trees & Graphs', week: 3, level: 'intermediate', tasks: [
      { title: 'Implement BFS, DFS, level-order traversal', description: 'All three iteratively, apply to: max depth, right side view', category: 'dsa', estimatedMinutes: 50, priority: 'high', xp: 70 },
      { title: 'Solve 3 BST problems', description: 'Validate BST, lowest common ancestor, kth smallest element', category: 'dsa', estimatedMinutes: 55, priority: 'high', xp: 75 },
      { title: 'Implement graph: BFS + DFS + cycle detection', description: 'Adjacency list, directed/undirected, topological sort', category: 'dsa', estimatedMinutes: 60, priority: 'high', xp: 80 },
      { title: 'Dijkstra shortest path implementation', description: 'Priority queue approach, trace through example, analyze complexity', category: 'dsa', estimatedMinutes: 50, priority: 'medium', xp: 70 },
      { title: 'Solve number of islands + clone graph', description: 'Classic graph traversal patterns — explain approach before coding', category: 'dsa', estimatedMinutes: 45, priority: 'medium', xp: 65 },
    ]},
    { phase: 'Dynamic Programming', week: 4, level: 'intermediate', tasks: [
      { title: 'Solve 3 DP problems with memoization', description: 'Fibonacci, climbing stairs, house robber — draw recursion tree first', category: 'dsa', estimatedMinutes: 55, priority: 'high', xp: 75 },
      { title: 'Bottom-up DP: Coin Change + Knapsack', description: 'Build DP table manually, understand optimal substructure', category: 'dsa', estimatedMinutes: 60, priority: 'high', xp: 80 },
      { title: '2D DP: Longest Common Subsequence + Edit Distance', description: 'Fill the table cell by cell, trace back the solution', category: 'dsa', estimatedMinutes: 65, priority: 'high', xp: 85 },
      { title: 'Interval problems: Merge + Non-overlapping', description: 'Sort by start, greedy approach, prove correctness', category: 'dsa', estimatedMinutes: 45, priority: 'medium', xp: 60 },
      { title: 'Mock interview: 45min medium DP problem', description: 'Full mock — explain approach, code, test cases, complexity analysis', category: 'practice', estimatedMinutes: 45, priority: 'high', xp: 80 },
    ]},
  ],
  'data science': [
    { phase: 'Python for Data', week: 1, level: 'beginner', tasks: [
      { title: 'Clean and analyze the Titanic dataset', description: 'Handle nulls, encode categoricals, compute survival rate by class/sex/age', category: 'coding', estimatedMinutes: 60, priority: 'high', xp: 75 },
      { title: 'NumPy: vectorize all loop operations', description: 'Matrix multiply, broadcasting — benchmark vs loop version', category: 'coding', estimatedMinutes: 45, priority: 'high', xp: 60 },
      { title: 'Create 4 chart types with Matplotlib', description: 'Line, bar, scatter, histogram — title, labels, legend, colors', category: 'coding', estimatedMinutes: 40, priority: 'medium', xp: 50 },
      { title: 'Full EDA on any Kaggle dataset', description: 'Shape, dtypes, nulls, describe, correlation matrix, outliers', category: 'practice', estimatedMinutes: 55, priority: 'high', xp: 70 },
      { title: 'Study CLT + normal distribution', description: 'Simulate with 1000 samples, plot result, explain what you observe', category: 'review', estimatedMinutes: 30, priority: 'medium', xp: 40 },
    ]},
    { phase: 'Machine Learning Basics', week: 2, level: 'beginner', tasks: [
      { title: 'Linear regression from scratch with gradient descent', description: 'Implement GD, compute MSE, plot predictions vs actual', category: 'coding', estimatedMinutes: 65, priority: 'high', xp: 85 },
      { title: 'Classification pipeline with scikit-learn', description: 'Train/test split, confusion matrix, precision/recall/F1', category: 'coding', estimatedMinutes: 60, priority: 'high', xp: 80 },
      { title: 'Feature engineering on a dataset', description: 'Create 5 new features, test if model improves, document results', category: 'practice', estimatedMinutes: 50, priority: 'medium', xp: 65 },
      { title: 'k-fold cross-validation by hand', description: 'No sklearn CV — manually split, train, evaluate 5 folds', category: 'coding', estimatedMinutes: 45, priority: 'high', xp: 70 },
      { title: 'Study bias-variance tradeoff', description: 'Overfit and underfit intentionally, plot learning curves', category: 'review', estimatedMinutes: 35, priority: 'medium', xp: 50 },
    ]},
  ],
}

function getPath(track: string): Phase[] {
  const k = (track || '').toLowerCase().trim()
  if (k.includes('web')) return PATHS['web development']
  if (k.includes('software') || k.includes('swe') || k.includes('dsa')) return PATHS['software engineering']
  if (k.includes('data') || k.includes('ml') || k.includes('ai')) return PATHS['data science']
  return PATHS['software engineering']
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const todayKey   = () => new Date().toISOString().split('T')[0]
const gradeFrom  = (s: number) => s >= 90 ? 'S' : s >= 75 ? 'A' : s >= 60 ? 'B' : s >= 45 ? 'C' : 'F'
const gradeColor = (g: string) => g === 'S' ? '#a855f7' : g === 'A' ? '#00ff96' : g === 'B' ? '#00c8ff' : g === 'C' ? '#f59e0b' : '#ef4444'
const scoreColor = (s: number) => s >= 75 ? '#00c8ff' : s >= 50 ? '#f59e0b' : '#ef4444'
const MONO       = '"IBM Plex Mono", monospace'

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────
const taskKey  = (uid: string) => `re_tasks_${uid}`
const perfKey  = (uid: string) => `re_perf_${uid}`
const phaseKey = (uid: string) => `re_phase_${uid}`
function sp<T>(k: string, fb: T): T { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fb } catch { return fb } }
const loadTasks  = (uid: string) => sp<DailyTask[]>(taskKey(uid), [])
const saveTasks  = (uid: string, d: DailyTask[]) => localStorage.setItem(taskKey(uid), JSON.stringify(d))
const loadPerf   = (uid: string) => sp<DayPerf[]>(perfKey(uid), [])
const savePerf   = (uid: string, d: DayPerf[]) => localStorage.setItem(perfKey(uid), JSON.stringify(d))
const loadPhase  = (uid: string) => sp<number>(phaseKey(uid), 0)
const savePhase  = (uid: string, p: number) => localStorage.setItem(phaseKey(uid), JSON.stringify(p))

// ─────────────────────────────────────────────
// Stats computation
// ─────────────────────────────────────────────
function computeStats(tasks: DailyTask[], tests: TestRecord[], sigma: any[], backendPerf: any) {
  const scores = [
    ...tests.map(t => t.score),
    ...(sigma || []).map((s: any) => s.score || 0).filter((s: number) => s > 0),
  ]
  const mastery = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : (backendPerf?.masteryPercent || 0)

  const active = new Set([
    ...tasks.filter(t => t.completed && t.completedAt).map(t => t.completedAt!.split('T')[0]),
    ...tests.map(t => t.date.split('T')[0]),
  ])
  let streak = 0
  const now = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    if (active.has(d.toISOString().split('T')[0])) { streak++ } else if (i > 0) break
  }

  const passRate = tests.length ? Math.round((tests.filter(t => t.passed).length / tests.length) * 100) : 0
  const totalXP  = tasks.filter(t => t.completed).reduce((s, t) => s + (t.xp || 20), 0)

  return {
    mastery, streak, passRate, totalXP,
    completedTasks: tasks.filter(t => t.completed).length,
    totalTasks:     tasks.length,
    testsCount:     tests.length,
    avgTestScore:   tests.length ? Math.round(tests.reduce((a, b) => a + b.score, 0) / tests.length) : 0,
    longestStreak:  backendPerf?.streakLongest || streak,
  }
}

function verdictFallback(mastery: number, streak: number, pct: number, mode: string) {
  const h = mode === 'harsh'
  if (mastery >= 85 && streak >= 7 && pct >= 80)
    return { text: h ? "Acceptable. Don't let it go to your head." : "Strong consistent performance. Keep building.", color: '#a855f7', icon: '🔥' }
  if (mastery >= 70 && pct >= 60)
    return { text: h ? "Mediocre by elite standards. The market doesn't hire mediocre." : "Above average. Identify and drill your weak spots.", color: '#22c55e', icon: '📈' }
  if (mastery >= 40 && pct >= 30)
    return { text: h ? "Half effort. You're building skills at the speed of someone who won't get hired." : "Progress visible. Consistency is your next unlock.", color: '#f59e0b', icon: '⚠️' }
  if (streak === 0 && mastery < 20)
    return { text: h ? "You haven't studied. While you rest, others are grinding." : "One task a day compounds into mastery. Start now.", color: '#ef4444', icon: '💀' }
  return { text: h ? "You exist in the system. That's the nicest thing I can say." : "Inconsistent activity. Small daily habits create big results.", color: '#00c8ff', icon: '📊' }
}

const TIER_C: Record<string, string> = {
  developing: '#6b7280', rising: '#22c55e', competitive: '#00c8ff', elite: '#a78bfa', legendary: '#fbbf24'
}
const levelC: Record<string, string> = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#a855f7' }

// ─────────────────────────────────────────────
// CSS — KEY FIXES:
//   1. bottom-row → single-col on mobile
//   2. lb-scroll → custom scrollbar + fade-out bottom hint
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes scrollHint{0%,100%{opacity:0;transform:translateY(-4px)}50%{opacity:1;transform:translateY(0)}}
body{background:#030307;color:#fff;font-family:'Syne',sans-serif;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:2px}

/* ── lb custom scroll ─────────────────────────── */
.lb-scroll::-webkit-scrollbar{width:3px}
.lb-scroll::-webkit-scrollbar-track{background:rgba(255,255,255,.02);border-radius:2px}
.lb-scroll::-webkit-scrollbar-thumb{background:rgba(251,191,36,.25);border-radius:2px}
.lb-scroll::-webkit-scrollbar-thumb:hover{background:rgba(251,191,36,.45)}
.lb-scroll{scrollbar-width:thin;scrollbar-color:rgba(251,191,36,.25) rgba(255,255,255,.02)}

.db-root{min-height:100vh;background:#030307}
.db-bg{position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 700px 500px at 0% 0%,rgba(0,200,255,.06) 0%,transparent 70%),
             radial-gradient(ellipse 600px 600px at 100% 100%,rgba(167,139,250,.05) 0%,transparent 70%)}
.db-wrap{position:relative;z-index:1;max-width:1440px;margin:0 auto;padding:20px 20px 80px}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:10px;flex-wrap:wrap}
.brand-name{font-size:20px;font-weight:900;letter-spacing:-.5px}
.brand-name span{color:#00c8ff}
.brand-sub{font-size:9px;font-family:${MONO};color:#1f2937;letter-spacing:3px;text-transform:uppercase;margin-top:1px}
.mode-pill{font-size:9px;font-weight:700;font-family:${MONO};letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:100px}
.logout-btn{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:6px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);color:#555;cursor:pointer;transition:all .2s;font-family:'Syne',sans-serif}
.logout-btn:hover{background:rgba(255,255,255,.06);color:#aaa}
.profile-bar{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px 18px;margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;cursor:pointer;transition:all .2s}
.profile-bar:hover{background:rgba(255,255,255,.035);border-color:rgba(255,255,255,.1)}
.avatar{width:46px;height:46px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;flex-shrink:0;overflow:hidden}
.sigma-bar{border-radius:13px;padding:13px 16px;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px;border:1px solid}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
.stat-card{background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:13px 15px;transition:all .22s;cursor:default}
.stat-card:hover{background:rgba(255,255,255,.03);transform:translateY(-2px)}
.stat-lbl{display:flex;align-items:center;gap:4px;margin-bottom:6px;font-size:9px;color:#1f2937;text-transform:uppercase;letter-spacing:1.5px;font-family:${MONO}}
.stat-val{font-size:22px;font-weight:900;color:#f0f0f0;letter-spacing:-.5px;line-height:1;margin-bottom:3px}
.stat-sub{font-size:9px;color:#1f2937;font-family:${MONO}}
.prog-track{width:100%;height:2px;background:rgba(255,255,255,.04);border-radius:100px;overflow:hidden;margin-top:6px}
.prog-fill{height:100%;border-radius:100px}
.rank-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.rank-card{background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:14px 16px;position:relative;overflow:hidden;transition:all .22s}
.rank-card:hover{background:rgba(255,255,255,.03);transform:translateY(-2px)}
.rank-num{font-size:38px;font-weight:900;color:#fff;line-height:1;letter-spacing:-2px;margin-bottom:3px}
.rank-num span{font-size:13px;font-weight:500;color:#1f2937;margin-left:2px}
.main-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px}

/* ── BOTTOM ROW — responsive ──────────────────── */
.bottom-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.panel{background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:16px}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px}
.pt{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#e2e8f0}
.task-list{display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto;padding-right:2px}
.task-item{display:flex;gap:8px;padding:9px 10px;border-radius:9px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .16s}
.task-item:hover{background:rgba(255,255,255,.04)}
.task-done{opacity:.4}
.chk{width:17px;height:17px;border-radius:5px;border:1.5px solid;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;transition:all .15s}

/* ── lb tabs ──────────────────────────────────── */
.lb-tabs{display:flex;gap:3px;background:#07080f;border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:3px;margin-bottom:11px}
.lb-tab{flex:1;padding:6px 8px;border-radius:7px;border:none;background:transparent;color:#4b5563;font-size:10px;font-weight:700;cursor:pointer;transition:all .14s;font-family:'Syne',sans-serif}
.lb-tab.on{background:rgba(251,191,36,.12);color:#fbbf24}

/* ── lb table rows ────────────────────────────── */
.lb-row{display:grid;grid-template-columns:38px 1fr 60px 52px 46px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.04);align-items:center;transition:background .14s}
.lb-row:hover{background:rgba(255,255,255,.02)}
.lb-row.me{background:rgba(251,191,36,.05);border-left:2px solid rgba(251,191,36,.3)}
.lb-head{font-size:8px;color:#374151;text-transform:uppercase;letter-spacing:1.5px;font-family:${MONO}}
.avt{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}

.refresh-btn{width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#555;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.refresh-btn:hover{color:#fbbf24;border-color:rgba(251,191,36,.3)}
.spin svg{animation:spin .7s linear infinite}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:10px}
.kpi{background:rgba(255,255,255,.03);border-radius:7px;padding:6px 7px;border:1px solid rgba(255,255,255,.05);text-align:center}
.kv{font-size:14px;font-weight:900;font-family:${MONO};line-height:1}
.kl{font-size:7px;color:#374151;text-transform:uppercase;letter-spacing:1.5px;margin-top:2px}
.action-card{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.018);cursor:pointer;transition:all .18s;width:100%;text-align:left;color:inherit;font-family:'Syne',sans-serif}
.action-card:hover{background:rgba(255,255,255,.04);transform:translateY(-2px)}
.phase-badge{display:inline-flex;align-items:center;gap:4px;font-size:8px;font-family:${MONO};letter-spacing:1.2px;padding:2px 7px;border-radius:4px;text-transform:uppercase;font-weight:700}
.xp-badge{font-size:7px;font-family:${MONO};color:#fbbf24;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);padding:1px 5px;border-radius:3px;font-weight:700}

/* ── Scroll fade hint on lb list ──────────────── */
.lb-scroll-wrap{position:relative}
.lb-scroll-wrap::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:40px;
  background:linear-gradient(to bottom,transparent,#07080f);
  pointer-events:none;border-radius:0 0 10px 10px;
  transition:opacity .3s;
}
.lb-scroll-wrap.at-bottom::after{opacity:0}
.lb-scroll-arrow{
  position:absolute;bottom:6px;left:50%;transform:translateX(-50%);
  width:20px;height:20px;border-radius:50%;
  background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.3);
  display:flex;align-items:center;justify-content:center;
  animation:scrollHint 2s ease infinite;z-index:2;pointer-events:none;
}

/* ── Responsive breakpoints ───────────────────── */
@media(max-width:1200px){
  .main-grid{grid-template-columns:1fr 1fr}
  .main-grid>:nth-child(3){grid-column:1/-1}
  .stats-grid{grid-template-columns:repeat(4,1fr)}
}
@media(max-width:1024px){
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .rank-grid{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:768px){
  .db-wrap{padding:12px 12px 70px}
  .main-grid{grid-template-columns:1fr}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .rank-grid{grid-template-columns:1fr 1fr}
  .brand-name{font-size:17px}
  .stat-val{font-size:20px}
  /* ── BOTTOM ROW: stack vertically on tablet/mobile ── */
  .bottom-row{grid-template-columns:1fr}
}
@media(max-width:560px){
  .rank-grid{grid-template-columns:1fr}
  .kpi-row{grid-template-columns:repeat(2,1fr)}
  .db-wrap{padding:10px 10px 70px}
  .stats-grid{grid-template-columns:1fr 1fr}
  .lb-row{grid-template-columns:32px 1fr 55px 44px 40px;padding:8px 10px}
}
@media(max-width:380px){
  .stats-grid{grid-template-columns:1fr}
  .rank-grid{grid-template-columns:1fr}
}
`

// ─────────────────────────────────────────────
// LeaderboardPanel
// ─────────────────────────────────────────────

// How many rows to show before scroll kicks in
const LB_VISIBLE_ROWS = 4

function LeaderboardPanel({ userId, profile }: { userId: string; profile: any }) {
  const [scope,    setScope]   = useState<'global'|'track'|'batch'>('global')
  const [entries,  setEntries] = useState<LbEntry[]>([])
  const [myRank,   setMyRank]  = useState<number|null>(null)
  const [total,    setTotal]   = useState(0)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')
  const [atBottom, setAtBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function fetchLb(s: typeof scope) {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ scope: s })
      if (s === 'track' && profile?.targetTrack) params.set('track', profile.targetTrack)
      const r = await api.get(`/leaderboard?${params}`)
      const d = r.data?.data || r.data
      const raw = d?.leaderboard || d?.users || d?.rankings || []
      const lb: LbEntry[] = raw.map((u: any, i: number) => ({
        rank:          u.rank          || i + 1,
        userId:        u.userId        || u.id || '',
        username:      u.username      || u.name || 'Unknown',
        tier:          u.tier          || 'developing',
        level:         u.level         || 'beginner',
        score:         Math.round(u.score ?? u.avgScore ?? u.averageScore ?? u.performanceScore ?? 0),
        mastery:       Math.round(u.mastery ?? u.masteryPercent ?? 0),
        streak:        u.streak        ?? u.streakCurrent ?? 0,
        testsCount:    u.testsCount    ?? u.testCount ?? u.tests ?? 0,
        xp:            u.xp            ?? u.totalXP ?? u.xpTotal ?? 0,
        isCurrentUser: !!(u.isCurrentUser || u.userId === userId || u.id === userId),
      }))
      setEntries(lb)
      setMyRank(d?.myRank ?? lb.find(e => e.isCurrentUser)?.rank ?? null)
      setTotal(d?.total ?? d?.totalUsers ?? lb.length)
    } catch (err: any) {
      setError('Failed to load rankings'); setEntries([])
    } finally { setLoading(false) }
  }

  useEffect(() => { if (userId) fetchLb(scope) }, [scope, userId])

  // Track scroll position to hide bottom fade when at bottom
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 8)
  }

  const me = entries.find(e => e.isCurrentUser)
  const hasMore = entries.length > LB_VISIBLE_ROWS

  // Row height = ~48px each — clamp visible area
  const ROW_H   = 48
  const maxH    = LB_VISIBLE_ROWS * ROW_H

  return (
    <div className="panel" style={{ borderColor: 'rgba(251,191,36,.09)' }}>
      <div className="ph">
        <div className="pt"><Trophy size={13} style={{ color: '#fbbf24' }} /><span>Rankings</span></div>
        <button className={`refresh-btn ${loading ? 'spin' : ''}`} onClick={() => fetchLb(scope)} disabled={loading}>
          <RefreshCw size={10} />
        </button>
      </div>

      <div className="lb-tabs">
        {(['global','track','batch'] as const).map(s => (
          <button key={s} className={`lb-tab ${scope === s ? 'on' : ''}`} onClick={() => setScope(s)}>
            {s === 'global' ? '🌍 Global' : s === 'track' ? '🎯 Track' : '👥 Batch'}
          </button>
        ))}
      </div>

      {/* YOUR POSITION */}
      {myRank && !loading && (
        <div style={{ background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', fontFamily: MONO, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Your Position</div>
            <div style={{ fontSize: 20, fontWeight: 900, fontFamily: MONO, color: '#fbbf24', lineHeight: 1 }}>
              #{myRank}<span style={{ fontSize: 10, color: '#374151', fontWeight: 400, marginLeft: 4 }}>of {total}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: '#6b7280', fontFamily: MONO, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Score</div>
            <div style={{ fontSize: 20, fontWeight: 900, fontFamily: MONO, color: (me?.score ?? 0) >= 75 ? '#22c55e' : (me?.score ?? 0) >= 50 ? '#f59e0b' : '#374151', lineHeight: 1 }}>
              {(me?.score ?? 0) > 0 ? `${me!.score}%` : '—'}
            </div>
          </div>
          {me && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: '#6b7280', fontFamily: MONO, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Streak</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: MONO, color: '#f59e0b', lineHeight: 1 }}>
                {me.streak > 0 ? `${me.streak}d` : '—'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <div style={{ width: 26, height: 26, border: '2px solid rgba(251,191,36,.15)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 8px' }} />
          <p style={{ color: '#374151', fontSize: 9, fontFamily: MONO, letterSpacing: 2 }}>fetching rankings...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: '#ef4444', fontSize: 11 }}>{error}</p>
          <button onClick={() => fetchLb(scope)} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', cursor: 'pointer', fontSize: 10 }}>Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Trophy size={24} style={{ color: '#1f2937', display: 'block', margin: '0 auto 7px' }} />
          <p style={{ color: '#374151', fontSize: 11 }}>No rankings yet.</p>
          <p style={{ color: '#1f2937', fontSize: 9, marginTop: 3 }}>Complete tests to appear here.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ background: '#07080f', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, overflow: 'hidden' }}>

          {/* Header */}
          <div className="lb-row" style={{ background: 'rgba(255,255,255,.025)', padding: '6px 12px' }}>
            <div className="lb-head">#</div>
            <div className="lb-head">Player</div>
            <div className="lb-head">Score</div>
            <div className="lb-head">Mastery</div>
            <div className="lb-head">Streak</div>
          </div>

          {/* First N rows always visible */}
          {entries.slice(0, LB_VISIBLE_ROWS).map((e, idx) => (
            <LbRow key={`top-${idx}-${e.userId}`} e={e} />
          ))}

          {/* Scrollable zone for remaining rows */}
          {hasMore && (
            <div
              className={`lb-scroll-wrap ${atBottom ? 'at-bottom' : ''}`}
              style={{ position: 'relative' }}
            >
              {/* Scroll container */}
              <div
                ref={scrollRef}
                className="lb-scroll"
                onScroll={onScroll}
                style={{
                  maxHeight: maxH,
                  overflowY: 'auto',
                  // subtle top border to separate fixed vs scrollable
                  borderTop: '1px dashed rgba(251,191,36,.12)',
                }}
              >
                {entries.slice(LB_VISIBLE_ROWS).map((e, idx) => (
                  <LbRow key={`rest-${idx}-${e.userId}`} e={e} />
                ))}
              </div>

              {/* Bottom fade + animated arrow — hidden when at bottom */}
              {!atBottom && (
                <>
                  {/* fade overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 42,
                    background: 'linear-gradient(to bottom, transparent, #07080f)',
                    pointerEvents: 'none', borderRadius: '0 0 10px 10px',
                  }} />
                  {/* bouncing arrow */}
                  <div style={{
                    position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(251,191,36,.14)', border: '1px solid rgba(251,191,36,.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'scrollHint 2s ease infinite', zIndex: 2, pointerEvents: 'none',
                  }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 2.5L4 5.5L7 2.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </>
              )}

              {/* Count badge */}
              <div style={{ padding: '5px 12px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ fontSize: 8, color: '#374151', fontFamily: MONO, letterSpacing: 1 }}>
                  +{entries.length - LB_VISIBLE_ROWS} more · scroll to see
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shared row component ────────────────────────────────────────────────────
function LbRow({ e }: { e: LbEntry }) {
  const tc = TIER_C[e.tier] || '#6b7280'
  const sc = e.score >= 75 ? '#22c55e' : e.score >= 50 ? '#f59e0b' : '#9ca3af'
  const rankColor = e.rank === 1 ? '#fbbf24' : e.rank === 2 ? '#9ca3af' : e.rank === 3 ? '#f97316' : '#374151'
  return (
    <div className={`lb-row ${e.isCurrentUser ? 'me' : ''}`}>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: rankColor }}>
        {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <div className="avt" style={{ background: `${tc}18`, border: `1px solid ${tc}28`, color: tc }}>
          {e.username[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: e.isCurrentUser ? '#fbbf24' : '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e.username}{e.isCurrentUser && <span style={{ fontSize: 7, color: '#fbbf24', marginLeft: 3 }}>YOU</span>}
          </div>
          <div style={{ fontSize: 7, color: tc, textTransform: 'capitalize', fontFamily: MONO }}>{e.tier}·{e.level}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: e.score > 0 ? sc : '#374151', fontFamily: MONO }}>
        {e.score > 0 ? `${e.score}%` : '—'}
      </div>
      <div style={{ fontSize: 9, color: e.mastery > 0 ? '#6b7280' : '#1f2937', fontFamily: MONO }}>
        {e.mastery > 0 ? `${e.mastery}%` : '—'}
      </div>
      <div style={{ fontSize: 9, color: e.streak > 0 ? '#f59e0b' : '#1f2937', fontFamily: MONO }}>
        {e.streak > 0 ? `${e.streak}d` : '—'}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TasksPanel
// ─────────────────────────────────────────────
function TasksPanel({ tasks, track, onToggle, onNextPhase, onRefresh, loading, phaseIdx }: {
  tasks: DailyTask[]; track: string; onToggle: (id: string) => void
  onNextPhase: () => void; onRefresh: () => void; loading: boolean; phaseIdx: number
}) {
  const today      = todayKey()
  const todayTasks = tasks.filter(t => t.date === today)
  const done       = todayTasks.filter(t => t.completed).length
  const total      = todayTasks.length
  const pct        = total ? Math.round((done / total) * 100) : 0
  const allDone    = total > 0 && done === total
  const path       = getPath(track)
  const phase      = path[phaseIdx] || path[0]
  const xpToday    = todayTasks.filter(t => t.completed).reduce((s, t) => s + (t.xp || 20), 0)

  const catC: Record<string, string> = { coding: '#00c8ff', dsa: '#a855f7', system: '#f59e0b', review: '#00ff96', practice: '#fb923c' }
  const prioC: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

  return (
    <div className="panel" style={{ borderColor: 'rgba(0,255,150,.08)' }}>
      <div className="ph">
        <div className="pt"><Target size={13} style={{ color: '#00ff96' }} /><span>Learning Path</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {xpToday > 0 && <span className="xp-badge">+{xpToday} XP</span>}
          <button className={`refresh-btn ${loading ? 'spin' : ''}`} onClick={onRefresh} disabled={loading}><RefreshCw size={10} /></button>
        </div>
      </div>

      {phase && (
        <div style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 6, flexWrap: 'wrap' }}>
            <span className="phase-badge" style={{ color: '#00ff96', background: 'rgba(0,255,150,.1)', border: '1px solid rgba(0,255,150,.2)' }}>
              <BookOpen size={8} /> Wk {phase.week} · {phase.phase}
            </span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 7.5, fontFamily: MONO, color: levelC[phase.level] || '#6b7280', background: `${levelC[phase.level] || '#6b7280'}15`, padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase' }}>{phase.level}</span>
              <span style={{ fontSize: 8, color: '#374151', fontFamily: MONO }}>{phaseIdx + 1}/{path.length}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {path.map((p, i) => (
              <div key={i} title={`Wk${p.week}: ${p.phase}`} style={{ flex: 1, height: 3, borderRadius: 2, background: i < phaseIdx ? '#00ff96' : i === phaseIdx ? 'rgba(0,255,150,.45)' : 'rgba(255,255,255,.05)', transition: 'background .3s' }} />
            ))}
          </div>
        </div>
      )}

      {total > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#00ff9660,#00ff96)', borderRadius: 100, transition: 'width .5s' }} />
            </div>
            <span style={{ fontSize: 8, color: '#374151', fontFamily: MONO, whiteSpace: 'nowrap' }}>{done}/{total} · {pct}%</span>
          </div>
          {allDone && phaseIdx < path.length - 1 && (
            <button onClick={onNextPhase} style={{ width: '100%', marginTop: 6, padding: '7px', background: 'rgba(0,255,150,.1)', border: '1px solid rgba(0,255,150,.25)', borderRadius: 7, color: '#00ff96', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne',sans-serif" }}>
              ✓ Phase Complete — Start Week {path[phaseIdx + 1]?.week} →
            </button>
          )}
        </div>
      )}

      <div className="task-list">
        {todayTasks.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center' }}>
            <Brain size={22} style={{ color: '#1f2937', display: 'block', margin: '0 auto 8px' }} />
            <p style={{ color: '#374151', fontSize: 11 }}>No tasks yet.</p>
            <p style={{ fontSize: 9, marginTop: 3, color: '#1f2937', fontFamily: MONO }}>Tap ↺ to generate {phase?.phase} tasks</p>
          </div>
        ) : todayTasks.map(t => {
          const cc = catC[t.category] || '#00c8ff'
          return (
            <div key={t.id} className={`task-item ${t.completed ? 'task-done' : ''}`} onClick={() => onToggle(t.id)}>
              <div className="chk" style={{ borderColor: t.completed ? '#00ff96' : 'rgba(255,255,255,.15)', background: t.completed ? 'rgba(0,255,150,.12)' : 'transparent' }}>
                {t.completed && <CheckCircle size={9} style={{ color: '#00ff96' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, color: t.completed ? '#374151' : '#e2e8f0', textDecoration: t.completed ? 'line-through' : 'none', lineHeight: 1.3 }}>{t.title}</div>
                <div style={{ fontSize: 9, color: '#374151', lineHeight: 1.4, marginBottom: 4 }}>{t.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 7, fontWeight: 700, fontFamily: MONO, letterSpacing: 1, padding: '1px 5px', borderRadius: 100, textTransform: 'uppercase', color: cc, background: `${cc}12`, border: `1px solid ${cc}20` }}>{t.category}</span>
                  <span style={{ fontSize: 8, color: '#374151', fontFamily: MONO }}><Clock size={7} style={{ display: 'inline', marginRight: 2 }} />{t.estimatedMinutes}m</span>
                  <span style={{ fontSize: 8, fontFamily: MONO, color: prioC[t.priority] }}>● {t.priority}</span>
                  {t.xp && <span className="xp-badge">{t.xp}xp</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TestPerfPanel
// ─────────────────────────────────────────────
function TestPerfPanel({ tests }: { tests: TestRecord[] }) {
  const [view, setView] = useState<'trend'|'dist'>('trend')
  const [rdy,  setRdy]  = useState(false)
  useEffect(() => { const t = setTimeout(() => setRdy(true), 120); return () => clearTimeout(t) }, [])

  const total = tests.length
  const avg   = total ? Math.round(tests.reduce((a, b) => a + b.score, 0) / total) : 0
  const best  = total ? Math.max(...tests.map(t => t.score)) : 0
  const pass  = total ? Math.round((tests.filter(t => t.passed).length / total) * 100) : 0
  const str   = (() => { let s = 0; for (let i = tests.length - 1; i >= 0; i--) { if (tests[i].passed) s++; else break } return s })()

  const trend   = tests.slice(-15).map((t, i) => ({ i: i + 1, score: t.score, passed: t.passed }))
  const buckets = [
    { r: '0-39',  c: '#ef4444', n: tests.filter(t => t.score < 40).length },
    { r: '40-59', c: '#f59e0b', n: tests.filter(t => t.score >= 40 && t.score < 60).length },
    { r: '60-74', c: '#00c8ff', n: tests.filter(t => t.score >= 60 && t.score < 75).length },
    { r: '75-89', c: '#22c55e', n: tests.filter(t => t.score >= 75 && t.score < 90).length },
    { r: '90+',   c: '#a855f7', n: tests.filter(t => t.score >= 90).length },
  ]

  if (total === 0) return (
    <div className="panel" style={{ borderColor: 'rgba(59,130,246,.08)' }}>
      <div className="ph"><div className="pt"><TrendingUp size={13} style={{ color: '#3b82f6' }} /><span>Test Performance</span></div></div>
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <ClipboardList size={24} style={{ color: '#1f2937', display: 'block', margin: '0 auto 7px' }} />
        <p style={{ color: '#374151', fontSize: 11 }}>No tests taken yet.</p>
        <p style={{ color: '#1f2937', fontSize: 9, marginTop: 3 }}>Head to the Exam tab to begin.</p>
      </div>
    </div>
  )

  const TT = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return <div style={{ background: '#060d14', border: `1px solid ${d.passed ? 'rgba(0,255,150,.3)' : 'rgba(239,68,68,.3)'}`, borderRadius: 7, padding: '6px 10px', fontSize: 11 }}>
      <div style={{ color: d.passed ? '#00ff96' : '#ef4444', fontWeight: 800, fontSize: 14, fontFamily: MONO }}>{d.score}%</div>
    </div>
  }

  return (
    <div className="panel" style={{ borderColor: 'rgba(59,130,246,.08)' }}>
      <div className="ph">
        <div className="pt">
          <TrendingUp size={13} style={{ color: '#3b82f6' }} /><span>Tests</span>
          <span style={{ fontSize: 8, fontFamily: MONO, color: '#374151', background: 'rgba(59,130,246,.12)', padding: '2px 5px', borderRadius: 4 }}>{total}</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {(['trend','dist'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${view === v ? 'rgba(59,130,246,.4)' : 'rgba(255,255,255,.07)'}`, background: view === v ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.03)', cursor: 'pointer', fontSize: 10 }}>
              {v === 'trend' ? '📈' : '📊'}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-row">
        {[{ l:'Avg', v:`${avg}%`, c: scoreColor(avg) }, { l:'Best', v:`${best}%`, c:'#a855f7' }, { l:'Pass', v:`${pass}%`, c:'#00ff96' }, { l:'Streak', v:`${str}✓`, c:'#f59e0b' }].map((k, i) => (
          <div key={i} className="kpi"><div className="kv" style={{ color: k.c }}>{k.v}</div><div className="kl">{k.l}</div></div>
        ))}
      </div>

      {rdy && view === 'trend' && (
        <div style={{ width: '100%', height: 90 }}>
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
              <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
              <XAxis dataKey="i" tick={{ fill: '#374151', fontSize: 7 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#374151', fontSize: 7 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#tg)"
                dot={(p: any) => <circle key={p.index} cx={p.cx} cy={p.cy} r={3} fill={p.payload.passed ? '#00ff96' : '#ef4444'} />} activeDot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {rdy && view === 'dist' && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 74 }}>
          {buckets.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ fontSize: 8, color: b.c, fontFamily: MONO, fontWeight: 700 }}>{b.n}</div>
              <div style={{ width: '100%', background: 'rgba(255,255,255,.04)', borderRadius: 3, height: 42, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${total ? (b.n / total) * 100 : 0}%`, background: b.c, borderRadius: 3, transition: 'height .5s', minHeight: b.n > 0 ? 3 : 0 }} />
              </div>
              <div style={{ fontSize: 6.5, color: '#374151', fontFamily: MONO }}>{b.r}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {tests.slice(-4).reverse().map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: `linear-gradient(90deg,${scoreColor(t.score)}10,transparent)`, borderLeft: `2px solid ${scoreColor(t.score)}45` }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#9ca3af', textTransform: 'capitalize' }}>{t.difficulty}</span>
              {t.topic && <span style={{ fontSize: 7.5, color: '#374151', fontFamily: MONO, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: scoreColor(t.score), fontFamily: MONO }}>{t.score}%</span>
              <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 3px', borderRadius: 3, fontFamily: MONO, background: t.passed ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: t.passed ? '#22c55e' : '#ef4444' }}>{t.passed ? 'P' : 'F'}</span>
              <span style={{ fontSize: 8, fontWeight: 800, color: gradeColor(gradeFrom(t.score)), fontFamily: MONO }}>{gradeFrom(t.score)}</span>
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
  const router  = useRouter()
  const { logout } = useAuthStore()

  const [mounted,   setMounted]   = useState(false)
  const [tasks,     setTasks]     = useState<DailyTask[]>([])
  const [perf,      setPerf]      = useState<DayPerf[]>([])
  const [loading,   setLoading]   = useState(false)
  const [phaseIdx,  setPhaseIdx]  = useState(0)

  const [aiVerdict,      setAiVerdict]      = useState<{ text: string; color: string; icon: string }|null>(null)
  const [aiSummary,      setAiSummary]      = useState('')
  const [aiWeakAreas,    setAiWeakAreas]    = useState<string[]>([])
  const [verdictLoading, setVerdictLoading] = useState(false)

  const tasksGenerated = useRef(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  async () => { const r = await api.get('/user/dashboard'); return r.data.data },
    retry: 1,
  })
  const { data: testData } = useQuery({
    queryKey: ['dash-tests'],
    queryFn:  () => api.get('/tests/history').then(r => r.data.data).catch(() => []),
    staleTime: 30000,
  })
  const { data: sigmaData } = useQuery({
    queryKey: ['dash-sigma'],
    queryFn:  () => api.get('/tasks/performance?range=all').then(r => r.data.data).catch(() => []),
    staleTime: 30000,
  })

  const userId  = data?.profile?.id || ''
  const profile = data?.profile
  const ranks   = data?.ranks

  const allTests: TestRecord[] = useMemo(() => {
    const a1: any[] = Array.isArray(testData)  ? testData  : []
    const a2: any[] = Array.isArray(sigmaData) ? sigmaData.flatMap((d: any) =>
      d.challenges > 0 ? [{ id: `sigma-${d.date}`, score: d.score, passed: d.score >= 60, difficulty: 'medium', date: d.date, topic: 'SIGMA' }] : []
    ) : []
    const seen = new Set<string>()
    return [...a1, ...a2].reduce((acc: TestRecord[], t: any) => {
      const id = t.id || t.createdAt
      if (!seen.has(id)) {
        seen.add(id)
        acc.push({
          id,
          score:      t.percentage ?? t.score ?? 0,
          passed:     t.passed ?? false,
          difficulty: t.difficulty || 'medium',
          date:       t.createdAt || t.date || '',
          timeTaken:  t.timeTaken,
          topic:      t.topic || t.challengeTitle?.replace(/^Test:\s*/, '') || '',
        })
      }
      return acc
    }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [testData, sigmaData])

  const stats = useMemo(() => computeStats(tasks, allTests, sigmaData, data?.performance), [tasks, allTests, sigmaData, data])

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return }
    setTimeout(() => setMounted(true), 80)
  }, [router])

  useEffect(() => {
    if (!userId) return
    setTasks(loadTasks(userId))
    setPerf(loadPerf(userId))
    setPhaseIdx(loadPhase(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const today = todayKey()
    setPerf(prev => {
      if (prev.find(p => p.date === today)) return prev
      const entry: DayPerf = { date: today, label: new Date().toLocaleDateString('en', { weekday: 'short' }), score: 0, tasks: 0, grade: 'F' }
      const updated = [...prev, entry].slice(-30)
      savePerf(userId, updated)
      return updated
    })
  }, [userId])

  useEffect(() => {
    if (!mounted || !userId) return
    if (tasksGenerated.current) return
    const existing = loadTasks(userId).filter(t => t.date === todayKey())
    if (existing.length > 0) return
    tasksGenerated.current = true
    const track  = profile?.targetTrack || localStorage.getItem('re_track') || 'software engineering'
    const level  = profile?.level || 'beginner'
    const path   = getPath(track)
    const idx    = loadPhase(userId)
    const phase  = path[idx] || path[0]
    generateTasksInternal(userId, track, phase, idx, profile?.username || 'User', level)
  }, [mounted, userId, profile])

  useEffect(() => {
    if (!userId) return
    const today      = todayKey()
    const todayTasks = tasks.filter(t => t.date === today)
    if (!todayTasks.length) return
    const done  = todayTasks.filter(t => t.completed).length
    const score = Math.round((done / todayTasks.length) * 100)
    setPerf(prev => {
      const copy = [...prev]
      const idx  = copy.findIndex(p => p.date === today)
      const entry: DayPerf = { date: today, label: new Date().toLocaleDateString('en', { weekday: 'short' }), score, tasks: done, grade: gradeFrom(score) }
      if (idx >= 0) copy[idx] = entry; else copy.push(entry)
      const updated = copy.slice(-30)
      savePerf(userId, updated)
      return updated
    })
  }, [tasks, userId])

  useEffect(() => {
    if (!profile || !userId) return
    if (stats.mastery === 0 && stats.streak === 0 && stats.testsCount === 0) return
    if (verdictLoading) return
    setVerdictLoading(true)
    const payload = { mastery: stats.mastery, streak: stats.streak, testsCount: stats.testsCount, avgTestScore: stats.avgTestScore, completedTasks: stats.completedTasks, totalTasks: stats.totalTasks, passRate: stats.passRate || 0 }
    api.post('/ai/harsh/analyze', { stats: payload })
      .then(r => {
        const a = r.data?.data?.analysis || r.data?.analysis
        if (!a) return
        const gc: Record<string, string> = { S: '#a855f7', A: '#22c55e', B: '#00c8ff', C: '#f59e0b', F: '#ef4444' }
        const gi: Record<string, string> = { S: '🔥', A: '📈', B: '📊', C: '⚠️', F: '💀' }
        const g = a.grade || 'B'
        setAiVerdict({ text: a.verdict || '', color: gc[g] || '#00c8ff', icon: gi[g] || '📊' })
        if (a.weaknesses?.length) setAiWeakAreas(a.weaknesses.slice(0, 3))
      })
      .catch(() => {})
      .finally(() => setVerdictLoading(false))
    const qs = new URLSearchParams({ tasksCompleted: String(stats.completedTasks), avgThisWeek: String(stats.avgTestScore), streak: String(stats.streak) })
    api.get('/ai/weekly-summary?' + qs).then(r => { const s = r.data?.data?.summary || r.data?.summary; if (s?.headline || typeof s === 'string') setAiSummary(s?.headline || s) }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, stats.mastery, stats.streak, stats.testsCount])

  useEffect(() => { if (error) toast.error('Failed to load dashboard data') }, [error])

  async function generateTasksInternal(uid: string, track: string, phase: Phase, idx: number, username: string, level: string) {
    setLoading(true)
    const today = todayKey()
    try {
      const res = await api.post('/ai/chat', {
        message: `Generate 5 practical daily learning tasks for a ${level} ${track} student in the "${phase.phase}" phase (week ${phase.week}). Output ONLY a valid JSON array:\n[{"id":"t1","title":"Specific task title","description":"Exactly what to do in one sentence","category":"coding","estimatedMinutes":45,"priority":"high","xp":50}]\nValid categories: coding, dsa, system, review, practice. XP range: 25-100 based on difficulty.`,
        contextType: 'task_generation',
      })
      const raw = res.data?.data?.response || res.data?.response || res.data?.reply || ''
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed) && parsed.length > 0) {
          const newTasks: DailyTask[] = parsed.map((t: any, n: number) => ({ ...t, id: `${uid}-${today}-${n}`, completed: false, date: today, phase: phase.phase }))
          setTasks(prev => { const merged = [...prev.filter(t => t.date !== today), ...newTasks]; saveTasks(uid, merged); return merged })
          toast.success(`${phase.phase} tasks ready!`, { icon: '📋' })
          setLoading(false); return
        }
      }
    } catch (e) { console.warn('[Dashboard] AI task gen failed, using fallback:', e) }
    const fb = (phase.tasks || []).slice(0, 5).map((t, n) => ({ ...t, id: `${uid}-${today}-${n}`, completed: false, date: today, phase: phase.phase }))
    setTasks(prev => { const merged = [...prev.filter(t => t.date !== today), ...fb]; saveTasks(uid, merged); return merged })
    setLoading(false)
  }

  function generateTasks(idx?: number) {
    if (!userId) return
    const i     = idx ?? phaseIdx
    const track = profile?.targetTrack || 'software engineering'
    const path  = getPath(track)
    const phase = path[i] || path[0]
    tasksGenerated.current = false
    generateTasksInternal(userId, track, phase, i, profile?.username || 'User', profile?.level || 'beginner')
  }

  function toggleTask(id: string) {
    setTasks(prev => {
      const u = prev.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t)
      saveTasks(userId, u); return u
    })
  }

  function advancePhase() {
    const path = getPath(profile?.targetTrack || '')
    const next = Math.min(phaseIdx + 1, path.length - 1)
    setPhaseIdx(next); savePhase(userId, next)
    toast.success(`🎉 Week ${path[next]?.week}: ${path[next]?.phase} unlocked!`)
    generateTasks(next)
  }

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030307' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, margin: '0 auto 12px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(0,200,255,.1)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#00c8ff', animation: 'spin .8s linear infinite' }} />
        </div>
        <p style={{ color: '#374151', fontSize: 9, letterSpacing: '4px', fontFamily: MONO }}>LOADING</p>
      </div>
    </div>
  )

  const tierC: Record<string, { color: string; glow: string }> = {
    developing:  { color: '#6b7280', glow: 'rgba(107,114,128,.3)' },
    rising:      { color: '#22c55e', glow: 'rgba(34,197,94,.3)'   },
    competitive: { color: '#00c8ff', glow: 'rgba(0,200,255,.3)'   },
    elite:       { color: '#a78bfa', glow: 'rgba(167,139,250,.3)' },
    legendary:   { color: '#fbbf24', glow: 'rgba(251,191,36,.3)'  },
  }
  const tier = tierC[profile?.tier] || tierC.developing

  const modeC: Record<string, { bg: string; text: string; border: string }> = {
    normal:      { bg: 'rgba(255,255,255,.06)', text: '#9ca3af', border: 'rgba(255,255,255,.12)' },
    competitive: { bg: 'rgba(0,200,255,.12)',   text: '#00c8ff', border: 'rgba(0,200,255,.35)'  },
    harsh:       { bg: 'rgba(239,68,68,.12)',   text: '#f87171', border: 'rgba(239,68,68,.35)'  },
  }
  const modeStyle = modeC[profile?.mode] || modeC.normal

  const today      = todayKey()
  const todayTasks = tasks.filter(t => t.date === today)
  const taskPct    = todayTasks.length ? Math.round((todayTasks.filter(t => t.completed).length / todayTasks.length) * 100) : 0
  const v          = aiVerdict || verdictFallback(stats.mastery, stats.streak, taskPct, profile?.mode || 'normal')

  const path     = getPath(profile?.targetTrack || '')
  const curPhase = path[phaseIdx] || path[0]
  const last7    = perf.slice(-7)

  const rankCards = [
    { icon: <Users size={12} />,  label: 'Batch Rank', rank: ranks?.batchRank,    total: ranks?.batchTotal,        sub: ranks?.batchCode || 'Your batch',    color: '#22c55e' },
    { icon: <Trophy size={12} />, label: 'Track Rank', rank: ranks?.trackRank,    total: ranks?.trackRankTotal,    sub: profile?.targetTrack || 'Your track', color: '#00c8ff' },
    { icon: <Globe size={12} />,  label: 'Platform',   rank: ranks?.platformRank, total: ranks?.platformRankTotal, sub: 'All users',                          color: '#a78bfa' },
  ]

  const statCards = [
    { icon: <Brain size={11} />,       label: 'Mastery',    value: `${stats.mastery}%`,  sub: stats.mastery >= 70 ? 'Strong' : stats.mastery > 0 ? 'Building' : 'Not started', color: '#fbbf24', prog: stats.mastery },
    { icon: <Flame size={11} />,       label: 'Streak',     value: `${stats.streak}d`,   sub: `Best: ${stats.longestStreak}d`, color: '#fb923c' },
    { icon: <CheckCircle size={11} />, label: 'Tasks Done', value: stats.completedTasks, sub: `of ${stats.totalTasks} total`,  color: '#34d399', prog: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0 },
    { icon: <Zap size={11} />,         label: 'Total XP',   value: stats.totalXP,        sub: stats.testsCount > 0 ? `${stats.testsCount} tests taken` : 'Take your first test', color: '#3b82f6' },
  ]

  const quickActions = [
    { icon: <Zap size={13} />,           color: '#ef4444', title: 'SIGMA AI',    sub: 'Chat + harsh verdict', path: '/ai'          },
    { icon: <ClipboardList size={13} />, color: '#a78bfa', title: 'Take Test',   sub: `${stats.testsCount} done`,     path: '/test'        },
    { icon: <Trophy size={13} />,        color: '#fbbf24', title: 'Leaderboard', sub: 'Full rankings',         path: '/leaderboard' },
    { icon: <Users size={13} />,         color: '#22c55e', title: 'Friends',     sub: 'Your network',          path: '/profile'     },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="db-root">
        <div className="db-bg" />
        <div className="db-wrap" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'opacity .4s ease, transform .4s ease' }}>

          {/* HEADER */}
          <div className="header">
            <div>
              <div className="brand-name">Reality<span>Engine</span></div>
              <div className="brand-sub">Competitive Dashboard</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span className="mode-pill" style={{ background: modeStyle.bg, color: modeStyle.text, border: `1px solid ${modeStyle.border}` }}>{profile?.mode || 'normal'} Mode</span>
              <button className="logout-btn" onClick={logout}><LogOut size={11} /><span>Logout</span></button>
            </div>
          </div>

          {/* PROFILE BAR */}
          <div className="profile-bar" onClick={() => router.push('/profile')} style={{ animation: mounted ? 'fadeUp .4s ease both' : 'none' }}>
            <div className="avatar" style={{ border: `2px solid ${tier.color}30`, boxShadow: `0 0 16px ${tier.glow}`, color: tier.color, background: profile?.profilePic ? 'transparent' : 'linear-gradient(135deg,#060810,#0d1117)' }}>
              {profile?.profilePic ? <img src={profile.profilePic} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{profile?.username || 'User'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 8, fontWeight: 800, fontFamily: MONO, letterSpacing: 1.5, padding: '2px 8px', borderRadius: 100, color: tier.color, background: `${tier.color}14`, border: `1px solid ${tier.color}28` }}>{(profile?.tier || 'developing').toUpperCase()}</span>
                <span style={{ color: '#1f2937', fontSize: 9 }}>·</span>
                <span style={{ fontSize: 10, color: '#374151', textTransform: 'capitalize' }}>{profile?.targetTrack}</span>
                <span style={{ color: '#1f2937', fontSize: 9 }}>·</span>
                <span style={{ fontSize: 10, color: '#374151', textTransform: 'capitalize' }}>{profile?.level}</span>
                {curPhase && (
                  <><span style={{ color: '#1f2937', fontSize: 9 }}>·</span>
                  <span style={{ fontSize: 8, color: levelC[curPhase.level] || '#00ff96', fontFamily: MONO, background: `${levelC[curPhase.level] || '#00ff96'}12`, padding: '1px 5px', borderRadius: 4 }}>Wk{curPhase.week}: {curPhase.phase}</span></>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 8, color: '#374151', fontFamily: MONO, marginBottom: 2 }}>MASTERY</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: MONO, color: stats.mastery >= 70 ? '#22c55e' : stats.mastery >= 40 ? '#f59e0b' : '#ef4444' }}>{stats.mastery}%</div>
              <div style={{ width: 66, height: 2, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden', marginTop: 3, marginLeft: 'auto' }}>
                <div style={{ height: '100%', width: `${stats.mastery}%`, background: tier.color, transition: 'width .5s' }} />
              </div>
            </div>
            <ChevronRight size={11} style={{ color: '#374151', flexShrink: 0 }} />
          </div>

          {/* SIGMA BAR */}
          <div className="sigma-bar" style={{ background: `${v.color}08`, borderColor: `${v.color}1e`, animation: mounted ? 'fadeUp .4s ease .05s both' : 'none' }}>
            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{v.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 7.5, fontFamily: MONO, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3, color: v.color + 'aa' }}>Σ SIGMA ASSESSMENT</div>
              <div style={{ fontSize: 12, lineHeight: 1.6, fontStyle: 'italic', color: v.color + 'dd' }}>{v.text}</div>
              {aiSummary && <div style={{ fontSize: 9, color: '#374151', fontFamily: MONO, marginTop: 4 }}>Week: {aiSummary}</div>}
              {verdictLoading && !aiVerdict && <div style={{ fontSize: 8, color: '#374151', fontFamily: MONO, marginTop: 3, animation: 'pulse 1.5s ease infinite' }}>analysing your data...</div>}
              {aiWeakAreas.length > 0 && (
                <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {aiWeakAreas.map((w, i) => (
                    <span key={i} style={{ fontSize: 7.5, color: '#ef4444aa', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 4, padding: '1px 5px', fontFamily: MONO }}>⚠ {w}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 7.5, color: '#374151', fontFamily: MONO, marginBottom: 2 }}>TODAY</div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: MONO, color: taskPct >= 70 ? '#22c55e' : taskPct >= 40 ? '#f59e0b' : '#ef4444' }}>{taskPct}%</div>
              <div style={{ fontSize: 7.5, color: '#374151', fontFamily: MONO }}>tasks done</div>
            </div>
          </div>

          {/* RANK CARDS */}
          <div className="rank-grid">
            {rankCards.map((item, i) => (
              <div key={i} className="rank-card" style={{ animation: mounted ? `fadeUp .4s ease ${i * 50}ms both` : 'none' }}>
                <div style={{ width: '100%', height: 1, position: 'absolute', top: 0, left: 0, background: `linear-gradient(90deg,transparent,${item.color}50,transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontSize: 8, fontWeight: 600, color: '#2a2a2a', letterSpacing: '.5px', textTransform: 'uppercase', fontFamily: MONO }}>
                  <span style={{ color: item.color }}>{item.icon}</span>{item.label}
                </div>
                <div className="rank-num">#{item.rank || '—'}<span>/{item.total || '?'}</span></div>
                <div style={{ fontSize: 8, fontFamily: MONO, color: item.color + 'aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* STAT CARDS */}
          <div className="stats-grid">
            {statCards.map((item, i) => (
              <div key={i} className="stat-card" style={{ animation: mounted ? `fadeUp .4s ease ${60 + i * 45}ms both` : 'none' }}>
                <div className="stat-lbl"><span style={{ color: item.color }}>{item.icon}</span>{item.label}</div>
                <div className="stat-val">{item.value}</div>
                {item.sub && <div className="stat-sub">{item.sub}</div>}
                {(item as any).prog !== undefined && (
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width: `${(item as any).prog}%`, background: `linear-gradient(90deg,${item.color}70,${item.color})`, boxShadow: `0 0 6px ${item.color}40` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* MAIN 3-COL GRID */}
          <div className="main-grid">
            <TasksPanel tasks={tasks} track={profile?.targetTrack || ''} onToggle={toggleTask} onNextPhase={advancePhase} onRefresh={() => generateTasks()} loading={loading} phaseIdx={phaseIdx} />
            <TestPerfPanel tests={allTests} />
            <LeaderboardPanel userId={userId} profile={profile} />
          </div>

          {/* ─── BOTTOM ROW — responsive via .bottom-row class ─── */}
          <div className="bottom-row">

            {/* Daily Performance */}
            <div className="panel" style={{ borderColor: 'rgba(0,200,255,.08)' }}>
              <div className="ph">
                <div className="pt"><BarChart2 size={13} style={{ color: '#00c8ff' }} /><span>Daily Performance</span></div>
                <span style={{ fontSize: 8, color: '#374151', fontFamily: MONO }}>{today}</span>
              </div>
              {last7.length > 0 ? (
                <>
                  <div style={{ width: '100%', height: 75, marginBottom: 9 }}>
                    <ResponsiveContainer width="100%" height={75}>
                      <AreaChart data={last7.map(d => ({ n: d.label, s: d.score }))} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                        <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00c8ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00c8ff" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
                        <XAxis dataKey="n" tick={{ fill: '#374151', fontSize: 7 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#374151', fontSize: 7 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#060810', border: '1px solid rgba(0,200,255,.2)', borderRadius: 7, fontSize: 11 }} formatter={(v: any) => [`${v}%`, 'Score']} />
                        <Area type="monotone" dataKey="s" stroke="#00c8ff" strokeWidth={2} fill="url(#pg)" dot={{ fill: '#00c8ff', r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 130, overflowY: 'auto' }}>
                    {last7.slice().reverse().map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ fontSize: 8, fontFamily: MONO, color: '#1f2937', width: 60, flexShrink: 0 }}>{d.date}</div>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.04)', borderRadius: 100, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.score}%`, background: scoreColor(d.score), borderRadius: 100, transition: 'width .4s' }} />
                        </div>
                        <div style={{ fontSize: 9, fontFamily: MONO, fontWeight: 700, color: gradeColor(d.grade), width: 22, textAlign: 'right', flexShrink: 0 }}>{d.score}</div>
                        <div style={{ fontSize: 8, fontWeight: 800, fontFamily: MONO, color: gradeColor(d.grade), width: 11, flexShrink: 0 }}>{d.grade}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <Calendar size={22} style={{ color: '#1f2937', display: 'block', margin: '0 auto 6px' }} />
                  <p style={{ color: '#374151', fontSize: 11 }}>Loading performance data...</p>
                </div>
              )}
            </div>

            {/* Quick Actions + Roadmap */}
            <div className="panel" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
              <div className="ph">
                <div className="pt"><Zap size={13} style={{ color: '#a78bfa' }} /><span>Quick Actions</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 13 }}>
                {quickActions.map((item, i) => (
                  <button key={i} className="action-card" onClick={() => router.push(item.path)}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}14`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#d1d5db', marginBottom: 1 }}>{item.title}</div>
                      <div style={{ fontSize: 8, color: '#1f2937', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(255,255,255,.018)', borderRadius: 10, border: '1px solid rgba(255,255,255,.05)', padding: '10px 12px', maxHeight: 240, overflowY: 'auto' }}>
                <div style={{ fontSize: 7.5, color: '#374151', fontFamily: MONO, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Full Roadmap · {profile?.targetTrack || 'Track'} ({path.length} weeks)
                </div>
                {path.map((p, i) => {
                  const lc      = levelC[p.level] || '#6b7280'
                  const isDone  = i < phaseIdx
                  const isActive = i === phaseIdx
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 7, paddingBottom: 7, borderBottom: i < path.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, background: isDone ? 'rgba(0,255,150,.18)' : isActive ? 'rgba(0,200,255,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${isDone ? 'rgba(0,255,150,.4)' : isActive ? 'rgba(0,200,255,.3)' : 'rgba(255,255,255,.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: isDone ? '#00ff96' : isActive ? '#00c8ff' : '#374151', fontWeight: 700 }}>
                        {isDone ? '✓' : isActive ? '▶' : String(i + 1)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                          <div style={{ fontSize: 10, color: isActive ? '#e5e7eb' : isDone ? '#374151' : '#2a2a2a', fontWeight: isActive ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Wk {p.week}: {p.phase}
                          </div>
                          {isActive && <span style={{ fontSize: 6.5, color: '#00c8ff', fontFamily: MONO, background: 'rgba(0,200,255,.1)', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>ACTIVE</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 7, color: lc, background: `${lc}15`, padding: '0px 4px', borderRadius: 3, fontFamily: MONO, textTransform: 'uppercase', fontWeight: 700 }}>{p.level}</span>
                          <span style={{ fontSize: 7, color: '#1f2937', fontFamily: MONO }}>{p.tasks.length} tasks</span>
                          <span style={{ fontSize: 7, color: '#1f2937', fontFamily: MONO }}>· {p.tasks.reduce((s, t) => s + t.estimatedMinutes, 0)}m</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>{/* end .bottom-row */}
        </div>
      </div>
    </>
  )
}