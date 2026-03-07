'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award, Bookmark, BookOpen, Brain, Calendar, Camera, CheckCircle, Code2,
  Edit2, ExternalLink, Film, Flame, Github, Globe, Grid, Heart,
  Image, Link2, Linkedin, List, MessageCircle, Play, Plus, Save,
  Send, Share2, Star, Target, Trash2, TrendingUp, Trophy, Users, X, Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

interface Friend { id: string; username: string; tier: string; targetTrack: string; profilePic?: string }
interface Highlight { id: string; title: string; imageUrl?: string; link: string; description: string }
interface Post {
  id: string; content: string; imageUrl?: string; videoUrl?: string;
  likes: number; comments: number; createdAt: string; liked: boolean; bookmarked: boolean;
  user?: { username: string; profilePic?: string; tier?: string }
}

const TIER: Record<string, { color: string; glow: string; label: string }> = {
  developing:  { color: '#6b7280', glow: 'rgba(107,114,128,.3)',  label: 'Developing'  },
  rising:      { color: '#22c55e', glow: 'rgba(34,197,94,.3)',    label: 'Rising'      },
  competitive: { color: '#3b82f6', glow: 'rgba(59,130,246,.3)',   label: 'Competitive' },
  elite:       { color: '#a78bfa', glow: 'rgba(167,139,250,.3)',  label: 'Elite'       },
  legendary:   { color: '#fbbf24', glow: 'rgba(251,191,36,.3)',   label: 'Legendary'   },
}

const BADGES = [
  { id: 'first_post', icon: '📸', label: 'First Post',    desc: 'Shared your first update',  color: '#22c55e' },
  { id: 'streak_7',   icon: '🔥', label: '7-Day Streak',  desc: 'Consistent for a week',      color: '#f97316' },
  { id: 'streak_30',  icon: '⚡', label: '30-Day Streak', desc: 'A month of daily grind',     color: '#fbbf24' },
  { id: 'top_10',     icon: '🏆', label: 'Top 10',        desc: 'Platform top 10',            color: '#a78bfa' },
  { id: 'networker',  icon: '🤝', label: 'Networker',     desc: 'Connected with 10+ people',  color: '#3b82f6' },
  { id: 'centurion',  icon: '💯', label: 'Centurion',     desc: '100 tasks completed',        color: '#ef4444' },
  { id: 'scholar',    icon: '🧠', label: 'Scholar',       desc: '50 test assessments',        color: '#06b6d4' },
  { id: 'legendary',  icon: '👑', label: 'Legendary',     desc: 'Reached Legendary tier',     color: '#fbbf24' },
]

function StoryViewer({ highlights, startIdx, onClose }: { highlights: Highlight[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  const [progress, setProgress] = useState(0)
  const ref = useRef<any>(null)
  const DURATION = 5000
  const cur = highlights[idx]
  useEffect(() => {
    setProgress(0)
    const t0 = Date.now()
    ref.current = setInterval(() => {
      const pct = Math.min(((Date.now() - t0) / DURATION) * 100, 100)
      setProgress(pct)
      if (pct >= 100) { clearInterval(ref.current); idx < highlights.length - 1 ? setIdx(i => i + 1) : onClose() }
    }, 30)
    return () => clearInterval(ref.current)
  }, [idx])
  const go = (d: 'prev' | 'next') => {
    clearInterval(ref.current)
    if (d === 'prev' && idx > 0) setIdx(i => i - 1)
    else if (d === 'next' && idx < highlights.length - 1) setIdx(i => i + 1)
    else onClose()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', gap: 4, zIndex: 10 }}>
        {highlights.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2, background: 'rgba(255,255,255,.25)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#fff', width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ position: 'absolute', top: 28, right: 16, zIndex: 10, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      <div style={{ width: '100%', maxWidth: 420, height: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {cur.imageUrl
          ? <img src={cur.imageUrl} alt={cur.title} style={{ width: '100%', height: '100vh', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <Star size={64} color="#4338ca" />
              <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', textAlign: 'center', padding: '0 32px', fontFamily: 'Syne, sans-serif' }}>{cur.title}</p>
            </div>}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,.85))', padding: '60px 24px 40px' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>{cur.title}</h3>
          {cur.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginBottom: 14 }}>{cur.description}</p>}
          <a href={cur.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}><ExternalLink size={13} /> View Project</a>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ flex: 1 }} onClick={() => go('prev')} />
          <div style={{ flex: 1 }} onClick={() => go('next')} />
        </div>
      </div>
    </div>
  )
}

function ActivityHeatmap({ posts, tier }: { posts: Post[]; tier: { color: string } }) {
  const weeks = useMemo(() => {
    const today = new Date()
    const days: { date: string; count: number }[] = []
    for (let i = 363; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      days.push({ date: ds, count: posts.filter(p => p.createdAt?.slice(0, 10) === ds).length })
    }
    const r: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) r.push(days.slice(i, i + 7))
    return r
  }, [posts])
  const max = Math.max(...weeks.flat().map(d => d.count), 1)
  const getColor = (c: number) => !c ? '#111' : `${tier.color}${Math.round((0.2 + (c / max) * 0.8) * 255).toString(16).padStart(2, '0')}`
  return (
    <div style={{ background: '#080808', border: '1px solid #111', borderRadius: 16, padding: '18px 20px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={13} color={tier.color} /><span style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', fontFamily: 'Syne, sans-serif' }}>Activity</span></div>
        <span style={{ fontSize: 10, color: '#404040', fontFamily: 'monospace' }}>{posts.length} posts this year</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {week.map((day, di) => <div key={di} title={`${day.date}: ${day.count}`} style={{ width: 11, height: 11, borderRadius: 2, background: getColor(day.count), flexShrink: 0 }} />)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: '#404040', fontFamily: 'monospace' }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: v === 0 ? '#111' : `${tier.color}${Math.round((0.2 + v * 0.8) * 255).toString(16).padStart(2, '0')}` }} />)}
        <span style={{ fontSize: 9, color: '#404040', fontFamily: 'monospace' }}>More</span>
      </div>
    </div>
  )
}

function BadgesSection({ xp, posts, friends, tasks, tests, tier }: { xp: number; posts: Post[]; friends: any[]; tasks: number; tests: number; tier: string }) {
  const earned = BADGES.filter(b => {
    if (b.id === 'first_post') return posts.length > 0
    if (b.id === 'streak_7')   return xp >= 500
    if (b.id === 'streak_30')  return xp >= 3000
    if (b.id === 'top_10')     return xp >= 5000
    if (b.id === 'networker')  return friends.length >= 10
    if (b.id === 'centurion')  return tasks >= 100
    if (b.id === 'scholar')    return tests >= 50
    if (b.id === 'legendary')  return tier === 'legendary'
    return false
  }).map(b => b.id)
  return (
    <div style={{ background: '#080808', border: '1px solid #111', borderRadius: 16, padding: '18px 20px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Award size={13} color="#fbbf24" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', fontFamily: 'Syne, sans-serif' }}>Achievements</span>
        <span style={{ fontSize: 9, background: 'rgba(251,191,36,.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,.2)', padding: '1px 7px', borderRadius: 100, fontFamily: 'monospace' }}>{earned.length}/{BADGES.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {BADGES.map(b => {
          const ok = earned.includes(b.id)
          return (
            <div key={b.id} title={`${b.label}: ${b.desc}${ok ? ' ✓' : ' (locked)'}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 12, background: ok ? `${b.color}10` : 'rgba(255,255,255,.02)', border: `1px solid ${ok ? `${b.color}25` : '#111'}`, filter: ok ? 'none' : 'grayscale(1)', opacity: ok ? 1 : 0.4, position: 'relative' }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{b.icon}</span>
              <span style={{ fontSize: 8, color: ok ? b.color : '#404040', fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, lineHeight: 1.3 }}>{b.label}</span>
              {ok && <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: b.color }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PostModal({ post, isOwn, onClose, onLike, onBookmark, onDelete, username, profilePic, tier }: {
  post: Post; isOwn: boolean; onClose: () => void
  onLike: (id: string) => void; onBookmark: (id: string) => void; onDelete: (id: string) => void
  username: string; profilePic?: string; tier: string
}) {
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const tc = TIER[tier] || TIER.developing
  useEffect(() => {
    api.get(`/user/posts/${post.id}/comments`).then(r => setComments(r.data.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [post.id])
  const sendComment = async () => {
    if (!commentText.trim()) return
    try {
      await api.post(`/user/posts/${post.id}/comments`, { content: commentText })
      const r = await api.get(`/user/posts/${post.id}/comments`)
      setComments(r.data.data || []); setCommentText('')
    } catch { toast.error('Failed to comment') }
  }
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px,3vw,16px)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#000', border: '1px solid #262626', borderRadius: 4, display: 'flex', width: '100%', maxWidth: 920, maxHeight: '94vh', overflow: 'hidden', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><X size={16} /></button>
        <div style={{ flex: '0 0 55%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340, maxHeight: '94vh', overflow: 'hidden' }}>
          {post.videoUrl ? <video src={post.videoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '94vh' }} />
            : post.imageUrl ? <img src={post.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '94vh' }} />
            : <div style={{ padding: 32, textAlign: 'center' }}><p style={{ fontSize: 16, color: '#e5e7eb', lineHeight: 1.8, fontFamily: 'Syne, sans-serif' }}>{post.content}</p></div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #262626', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: profilePic ? 'transparent' : `${tc.color}18`, border: `2px solid ${tc.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: tc.color, overflow: 'hidden' }}>
                {profilePic ? <img src={profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{username}</p>
                <p style={{ fontSize: 10, color: '#737373', fontFamily: 'monospace' }}>{new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            {isOwn && <button onClick={() => { onDelete(post.id); onClose() }} style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer' }}><Trash2 size={15} /></button>}
          </div>
          {post.content && <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}><p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.7, fontFamily: 'Syne, sans-serif' }}><span style={{ fontWeight: 700, color: '#fff', marginRight: 6 }}>{username}</span>{post.content}</p></div>}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {loading ? <p style={{ color: '#737373', fontSize: 12 }}>Loading…</p>
              : comments.length === 0 ? <p style={{ color: '#737373', fontSize: 12 }}>No comments yet.</p>
              : comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#3b82f6', flexShrink: 0 }}>{(c.user?.username || 'U')[0].toUpperCase()}</div>
                  <p style={{ fontSize: 12, color: '#fff', lineHeight: 1.6, fontFamily: 'Syne, sans-serif' }}><span style={{ fontWeight: 700, marginRight: 6 }}>{c.user?.username}</span>{c.content}</p>
                </div>
              ))}
          </div>
          <div style={{ borderTop: '1px solid #262626', padding: '10px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <button onClick={() => onLike(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Heart size={20} fill={post.liked ? '#ef4444' : 'none'} color={post.liked ? '#ef4444' : '#737373'} /></button>
              <MessageCircle size={20} color="#737373" />
              <Send size={20} color="#737373" style={{ transform: 'rotate(20deg)' }} />
              <button onClick={() => onBookmark(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}><Bookmark size={20} fill={post.bookmarked ? '#fff' : 'none'} color={post.bookmarked ? '#fff' : '#737373'} /></button>
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>{post.likes.toLocaleString()} likes</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendComment()} placeholder="Add a comment…" style={{ flex: 1, background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }} />
              <button onClick={sendComment} disabled={!commentText.trim()} style={{ background: 'none', border: 'none', color: commentText.trim() ? '#3b82f6' : '#1e3a5f', cursor: commentText.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Post</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditModal({ data, onClose, onSave }: { data: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ bio: data?.bio || '', githubUrl: data?.githubUrl || '', linkedinUrl: data?.linkedinUrl || '', portfolioUrl: data?.portfolioUrl || '', skills: (data?.skills || []).join(', ') })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif' }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {[
          { key: 'bio', label: 'Bio', placeholder: 'Tell your story...', multiline: true },
          { key: 'githubUrl', label: 'GitHub URL', placeholder: 'https://github.com/username' },
          { key: 'linkedinUrl', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/username' },
          { key: 'portfolioUrl', label: 'Portfolio', placeholder: 'https://yoursite.com' },
          { key: 'skills', label: 'Skills (comma-separated)', placeholder: 'React, Node.js...' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, color: '#555', marginBottom: 5, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>{f.label}</label>
            {f.multiline
              ? <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 12px', color: '#e5e7eb', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Syne, sans-serif' }} />
              : <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 12px', color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Syne, sans-serif' }} />}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,.04)', border: '1px solid #1a1a1a', borderRadius: 10, color: '#555', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Cancel</button>
          <button onClick={() => onSave({ ...form, skills: form.skills.split(',').map((s: string) => s.trim()).filter(Boolean) })} style={{ flex: 1, padding: '11px', background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.35)', borderRadius: 10, color: '#3b82f6', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Save size={14} /> Save</button>
        </div>
      </div>
    </div>
  )
}

function AddHighlightModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any, file?: File) => void }) {
  const [form, setForm] = useState({ title: '', link: '', description: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif' }}>Add Highlight</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 130, background: preview ? 'transparent' : 'rgba(255,255,255,.02)', border: '1px dashed #262626', borderRadius: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
          {preview ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center' }}><Image size={22} color="#374151" /><p style={{ fontSize: 11, color: '#374151', marginTop: 6 }}>Click to add image</p></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)) }} />
        {[
          { key: 'title', label: 'Title *', placeholder: 'My Awesome Project' },
          { key: 'link', label: 'Link *', placeholder: 'https://github.com/...' },
          { key: 'description', label: 'Description', placeholder: 'What did you build?' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, color: '#555', marginBottom: 5, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 12px', color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Syne, sans-serif' }} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,.04)', border: '1px solid #1a1a1a', borderRadius: 10, color: '#555', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Cancel</button>
          <button onClick={() => { if (!form.title || !form.link) { toast.error('Title and link required'); return }; onAdd(form, file || undefined) }} style={{ flex: 1, padding: '11px', background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.35)', borderRadius: 10, color: '#3b82f6', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Plus size={14} /> Add</button>
        </div>
      </div>
    </div>
  )
}

function PostComposer({ user, onPosted }: { user: any; onPosted: () => void }) {
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [posting, setPosting] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const tier = TIER[user?.tier] || TIER.developing
  const clear = () => { setMediaFile(null); setMediaPreview(null); setMediaType(null) }
  const submit = async () => {
    if (!content.trim() && !mediaFile) return
    setPosting(true)
    try {
      const fd = new FormData(); fd.append('content', content)
      if (mediaFile) fd.append('media', mediaFile)
      await api.post('/user/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setContent(''); clear(); onPosted(); toast.success('Posted!')
    } catch { toast.error('Failed to post') } finally { setPosting(false) }
  }
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid #1a1a1a', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: user?.profilePic ? 'transparent' : `${tier.color}18`, border: `1.5px solid ${tier.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: tier.color, flexShrink: 0, overflow: 'hidden' }}>
          {user?.profilePic ? <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.username?.[0]?.toUpperCase()}
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Share your progress, project, or insight..." rows={3} style={{ flex: 1, background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'Syne, sans-serif' }} />
      </div>
      {mediaPreview && (
        <div style={{ position: 'relative', marginTop: 12, borderRadius: 12, overflow: 'hidden', maxHeight: 260 }}>
          {mediaType === 'video' ? <video src={mediaPreview} controls style={{ width: '100%', maxHeight: 260, borderRadius: 12, objectFit: 'cover', background: '#000' }} /> : <img src={mediaPreview} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12 }} />}
          <button onClick={clear} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #1a1a1a', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => imgRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.18)', borderRadius: 8, color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><Image size={12} /> Photo</button>
          <button onClick={() => vidRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.18)', borderRadius: 8, color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><Film size={12} /> Video</button>
          <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; setMediaFile(f); setMediaPreview(URL.createObjectURL(f)); setMediaType('image') }} />
          <input ref={vidRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; setMediaFile(f); setMediaPreview(URL.createObjectURL(f)); setMediaType('video') }} />
        </div>
        <button onClick={submit} disabled={posting || (!content.trim() && !mediaFile)}
          style={{ padding: '7px 18px', background: posting || (!content.trim() && !mediaFile) ? 'rgba(59,130,246,.04)' : 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.35)', borderRadius: 10, color: posting || (!content.trim() && !mediaFile) ? '#1e3a5f' : '#3b82f6', fontSize: 12, fontWeight: 700, cursor: posting || (!content.trim() && !mediaFile) ? 'not-allowed' : 'pointer' }}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [story, setStory] = useState<{ highlights: Highlight[]; startIdx: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'badges' | 'friends'>('posts')
  const [postView, setPostView] = useState<'grid' | 'list'>('grid')
  const [showComposer, setShowComposer] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [addingHighlight, setAddingHighlight] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  // ✅ FIX 1: Only fetch when user is authenticated
  // ✅ FIX 2: staleTime prevents stale flash on refresh
  const { data: profileRaw, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/user/profile').then(r => r.data.data),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const { data: rankData } = useQuery({
    queryKey: ['my-rank'],
    queryFn: () => api.get('/leaderboard/my-rank').then(r => r.data.data).catch(() => null),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const { data: friendsRaw } = useQuery({
    queryKey: ['my-friends'],
    queryFn: () => api.get('/connections?status=accepted&limit=50').then(r => r.data.data).catch(() => []),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const saveMutation = useMutation({
    mutationFn: (d: any) => api.patch('/user/profile', d),
    onSuccess: () => { toast.success('Profile updated!'); qc.invalidateQueries({ queryKey: ['my-profile'] }); setEditingProfile(false) },
    onError: () => toast.error('Failed to save'),
  })
  const deletePostMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/user/posts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-profile'] }); toast.success('Post deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const likePost = async (id: string) => { try { await api.post(`/user/posts/${id}/like`); qc.invalidateQueries({ queryKey: ['my-profile'] }) } catch {} }
  const bookmarkPost = async (id: string) => { try { await api.post(`/user/posts/${id}/bookmark`); qc.invalidateQueries({ queryKey: ['my-profile'] }) } catch {} }
  const addHighlight = async (fd: any, file?: File) => {
    try {
      const form = new FormData()
      Object.entries(fd).forEach(([k, v]) => form.append(k, v as string))
      if (file) form.append('image', file)
      await api.post('/user/highlights', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      qc.invalidateQueries({ queryKey: ['my-profile'] }); setAddingHighlight(false); toast.success('Highlight added!')
    } catch { toast.error('Failed to add highlight') }
  }
  const deleteHighlight = async (id: string) => {
    try { await api.delete(`/user/highlights/${id}`); qc.invalidateQueries({ queryKey: ['my-profile'] }); toast.success('Removed') }
    catch { toast.error('Failed to delete') }
  }

  // ✅ FIX 3: Show loader while auth is hydrating OR profile is fetching
  if (!user || isLoading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #1a1a1a', borderTopColor: '#3b82f6', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const p = profileRaw
  const tier = TIER[p?.tier] || TIER.developing
  const skills: string[] = p?.skills || []
  const posts: Post[] = (p?.posts || []).map((post: any) => ({ ...post, bookmarked: post.bookmarked ?? false, user: post.user || { username: p?.username, profilePic: p?.profilePic, tier: p?.tier } }))
  const savedPosts = posts.filter(post => post.bookmarked)
  const highlights: Highlight[] = p?.highlights || []
  const friends: Friend[] = (Array.isArray(friendsRaw) ? friendsRaw : []).map((item: any) => {
    if (item.username) return item
    const other = item.sender?.id === user?.id ? item.receiver : item.sender
    return other || item
  }).filter(Boolean)

  const stats = [
    { label: 'XP',      value: (p?.xp || 0).toLocaleString(),           color: '#fbbf24', icon: Zap },
    { label: 'Mastery', value: `${Math.round(p?.masteryPercent || 0)}%`, color: '#22c55e', icon: Brain },
    { label: 'Streak',  value: `${p?.streakCurrent || 0}d`,              color: '#fb923c', icon: Flame },
    { label: 'Tasks',   value: p?._count?.tasks || 0,                    color: '#3b82f6', icon: CheckCircle },
    { label: 'Tests',   value: p?._count?.testResults || 0,              color: '#a78bfa', icon: Target },
    { label: 'Rank',    value: `#${rankData?.platformRank || '—'}`,      color: '#ef4444', icon: Trophy },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box} h1,h2,h3,h4,h5,h6,p,ul,ol{margin:0;padding:0}
        body{background:#000;color:#fff;font-family:'Syne',sans-serif;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .pf-root{min-height:100vh;background:#000}
        .pf-wrap{max-width:935px;margin:0 auto;padding:clamp(12px,3vw,40px) clamp(0px,2vw,24px) 100px}
        .hero-card{background:linear-gradient(160deg,#0a0a0a,#050505);border:1px solid #111;border-radius:clamp(0px,2vw,20px);padding:clamp(16px,3vw,28px) clamp(14px,3vw,24px);margin-bottom:8px;position:relative;overflow:hidden;animation:fadeUp .4s ease both}
        .hero-layout{display:flex;gap:clamp(14px,3vw,24px);align-items:flex-start}
        .hero-avatar-wrap{flex-shrink:0;position:relative}
        .hero-avatar{width:clamp(72px,10vw,96px);height:clamp(72px,10vw,96px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:clamp(24px,4vw,34px);font-weight:900;overflow:hidden}
        .hero-cam-btn{position:absolute;bottom:0;right:0;width:26px;height:26px;border-radius:50%;background:#1a1a1a;border:2px solid #000;color:#9ca3af;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .hero-body{flex:1;min-width:0}
        .hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}
        .hero-name{font-size:clamp(18px,4vw,26px);font-weight:900;color:#fff;letter-spacing:-.3px;line-height:1.1}
        .hero-actions{display:flex;gap:7px;flex-shrink:0;flex-wrap:wrap}
        .hero-bio{font-size:13px;color:#a3a3a3;line-height:1.7;margin-bottom:10px}
        .hero-links{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
        .hero-skills{display:flex;gap:5px;flex-wrap:wrap}
        .stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:8px}
        .stat-card{background:#080808;border:1px solid #111;border-radius:12px;padding:clamp(10px,2vw,14px) 6px;text-align:center;transition:background .2s}
        .stat-card:hover{background:#0f0f0f}
        .ranks-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
        .rank-card{background:#080808;border:1px solid #111;border-radius:16px;padding:clamp(12px,2vw,16px);position:relative;overflow:hidden}
        .hl-row-wrap{margin-bottom:0;border-bottom:1px solid #111;padding-bottom:20px}
        .hl-row{display:flex;gap:clamp(14px,3vw,22px);overflow-x:auto;padding:8px 0 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;align-items:flex-start}
        .hl-row::-webkit-scrollbar{display:none}
        .hl-new-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer}
        .hl-add-btn{width:clamp(64px,11vw,88px);height:clamp(64px,11vw,88px);border-radius:50%;background:transparent;border:2px solid #fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s,background .2s;color:#fff;flex-shrink:0}
        .hl-add-btn:hover{background:rgba(255,255,255,.06);transform:scale(1.04)}
        .hl-new-label{font-size:11px;color:#e5e7eb;font-family:'Syne',sans-serif}
        .hl-bubble-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer;position:relative}
        .hl-bubble-ring{width:clamp(66px,11vw,92px);height:clamp(66px,11vw,92px);border-radius:50%;padding:2.5px;display:flex;align-items:center;justify-content:center;transition:transform .2s}
        .hl-bubble-ring:hover{transform:scale(1.05)}
        .hl-bubble-inner{width:100%;height:100%;border-radius:50%;border:2.5px solid #000;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#111}
        .hl-bubble-label{font-size:11px;color:#a3a3a3;text-align:center;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .hl-bubble-wrap:hover .hl-del-btn{opacity:1!important}
        .tabs-row{display:flex;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;margin-bottom:2px}
        .tab-btn{flex:1;padding:clamp(10px,2vw,14px) 0;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:clamp(11px,1.5vw,13px);font-weight:600;font-family:'Syne',sans-serif;border-top:2px solid transparent;margin-top:-1px;transition:all .2s;color:#525252}
        .tab-btn.active{color:#fff;border-top-color:#fff}
        .tab-btn:hover:not(.active){color:#a3a3a3}
        .posts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
        .posts-list{display:flex;flex-direction:column;gap:12px;padding:12px 0}
        .post-tile{aspect-ratio:1;position:relative;overflow:hidden;cursor:pointer;background:#0a0a0a}
        .post-tile img,.post-tile video{width:100%;height:100%;object-fit:cover;display:block}
        .post-tile-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;gap:16px}
        .post-tile:hover .post-tile-overlay{opacity:1}
        .post-tile-stat{display:flex;align-items:center;gap:5px;color:#fff;font-size:14px;font-weight:700}
        .post-tile-text{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;font-size:12px;color:#a3a3a3;line-height:1.5;background:#0d0d0d}
        .post-list-card{background:#080808;border:1px solid #111;border-radius:14px;overflow:hidden;cursor:pointer;transition:background .2s;flex-direction:column}
        .post-list-card:hover{background:#0d0d0d}
        .post-list-card img,.post-list-card video{width:100%;max-height:360px;object-fit:cover;display:block}
        .post-list-body{padding:12px 14px}
        .fr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
        .fr-card{background:#080808;border:1px solid #111;border-radius:14px;padding:14px 16px;cursor:pointer;transition:background .2s,transform .2s;display:flex;align-items:center;gap:12px}
        .fr-card:hover{background:#0f0f0f;transform:translateY(-2px)}
        .skill-pill{padding:3px 10px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.16);border-radius:100px;font-size:10px;color:#93c5fd;font-family:'IBM Plex Mono',monospace}
        @media(max-width:900px){.stats-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:700px){.pf-wrap{padding:14px 12px 90px}.fr-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:540px){
          .pf-wrap{padding:0 0 80px}
          .hero-card{border-radius:0;border-left:none;border-right:none;margin-bottom:0;padding:14px}
          .stats-grid{grid-template-columns:repeat(3,1fr);gap:4px}
          .stat-card{border-radius:0;border-left:none;border-right:none}
          .ranks-grid{grid-template-columns:repeat(3,1fr)!important;gap:4px;padding:0 10px}
          .rank-card{border-radius:10px;padding:10px 8px}
          .hl-row-wrap{padding:0 12px}
          .fr-grid{padding:0 12px}
          .posts-grid{gap:1px}
          .posts-list{padding:12px}
          .tab-btn span:not(.tc){display:none}
          .tab-btn{gap:2px}
        }
        @media(max-width:420px){
          .stats-grid{grid-template-columns:repeat(3,1fr)!important}
          .ranks-grid{grid-template-columns:repeat(3,1fr)!important}
          .fr-grid{grid-template-columns:repeat(2,1fr)}
          .posts-grid{grid-template-columns:repeat(3,1fr)}
        }
        @media(min-width:1200px){.fr-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}}
      `}</style>

      {activePost && <PostModal post={activePost} isOwn onClose={() => setActivePost(null)} onLike={likePost} onBookmark={bookmarkPost} onDelete={id => { deletePostMutation.mutate(id); setActivePost(null) }} username={p?.username} profilePic={p?.profilePic} tier={p?.tier || 'developing'} />}
      {story && <StoryViewer highlights={story.highlights} startIdx={story.startIdx} onClose={() => setStory(null)} />}
      {editingProfile && <EditModal data={p} onClose={() => setEditingProfile(false)} onSave={d => saveMutation.mutate(d)} />}
      {addingHighlight && <AddHighlightModal onClose={() => setAddingHighlight(false)} onAdd={addHighlight} />}

      <div className="pf-root" style={{ opacity: mounted ? 1 : 0, transition: 'opacity .4s ease' }}>
        <div className="pf-wrap">

          <div className="hero-card">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${tier.color}60,transparent)` }} />
            <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle,${tier.glow},transparent 70%)`, pointerEvents: 'none', opacity: .5 }} />
            <div className="hero-layout" style={{ position: 'relative' }}>
              <div className="hero-avatar-wrap">
                <div style={{ padding: 2, borderRadius: '50%', background: `conic-gradient(${tier.color},${tier.color}40,${tier.color})` }}>
                  <div style={{ padding: 2, borderRadius: '50%', background: '#000' }}>
                    <div className="hero-avatar" style={{ background: p?.profilePic ? 'transparent' : `${tier.color}15`, color: tier.color }}>
                      {p?.profilePic ? <img src={p.profilePic} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p?.username?.[0]?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button className="hero-cam-btn" onClick={() => fileRef.current?.click()}><Camera size={11} /></button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return
                  const fd = new FormData(); fd.append('profilePic', file)
                  try { await api.patch('/user/profile-pic', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); qc.invalidateQueries({ queryKey: ['my-profile'] }); toast.success('Photo updated!') }
                  catch { toast.error('Upload failed') }
                }} />
              </div>

              <div className="hero-body">
                <div className="hero-top">
                  <div>
                    <h1 className="hero-name">{p?.username}</h1>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 5 }}>
                      <span style={{ background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}25`, borderRadius: 100, padding: '2px 9px', fontSize: 8, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1.5 }}>{tier.label.toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: '#525252', textTransform: 'capitalize' }}>{p?.targetTrack}</span>
                      {p?.level && <><span style={{ color: '#1f2937' }}>·</span><span style={{ fontSize: 11, color: '#525252', textTransform: 'capitalize' }}>{p.level}</span></>}
                    </div>
                  </div>
                  <div className="hero-actions">
                    <button onClick={() => setEditingProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 10, color: '#a3a3a3', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}><Edit2 size={13} /> Edit</button>
                    <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/profile/' + p?.username); toast.success('Link copied!') }} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 10, color: '#a3a3a3', cursor: 'pointer' }}><Share2 size={13} /></button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 14, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 14, overflow: 'hidden' }}>
                  {[
                    { label: 'Posts',       value: posts.length,                           color: '#e5e7eb' },
                    { label: 'Connections', value: friends.length,                         color: '#e5e7eb' },
                    { label: 'Rank',        value: `#${rankData?.platformRank || '—'}`,   color: '#a78bfa' },
                    { label: 'Score',       value: Math.round(p?.realityScore || 0),       color: '#ef4444' },
                  ].map((s, i, arr) => (
                    <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', borderRight: i < arr.length - 1 ? '1px solid #1a1a1a' : 'none', gap: 3 }}>
                      <span style={{ fontSize: 'clamp(13px,2.5vw,17px)', fontWeight: 900, color: s.color, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1, letterSpacing: '-0.5px' }}>{s.value}</span>
                      <span style={{ fontSize: 8, color: '#525252', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'monospace', fontWeight: 600 }}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {p?.bio ? <p className="hero-bio">{p.bio}</p> : <p style={{ fontSize: 12, color: '#404040', fontStyle: 'italic', marginBottom: 10, cursor: 'pointer' }} onClick={() => setEditingProfile(true)}>+ Add a bio…</p>}

                <div className="hero-links">
                  {[{ url: p?.githubUrl, Icon: Github, label: 'GitHub', color: '#e5e7eb' }, { url: p?.linkedinUrl, Icon: Linkedin, label: 'LinkedIn', color: '#3b82f6' }, { url: p?.portfolioUrl, Icon: Globe, label: 'Portfolio', color: '#22c55e' }].filter(l => l.url).map(l => (
                    <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, color: l.color, fontSize: 10, fontWeight: 700, textDecoration: 'none', fontFamily: 'monospace' }}><l.Icon size={11} /> {l.label}</a>
                  ))}
                  {!p?.githubUrl && !p?.linkedinUrl && !p?.portfolioUrl && <button onClick={() => setEditingProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#0a0a0a', border: '1px dashed #1a1a1a', borderRadius: 8, color: '#404040', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace' }}><Link2 size={11} /> Add links</button>}
                  {p?.createdAt && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#404040', fontFamily: 'monospace' }}><Calendar size={10} />{new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                </div>

                {skills.length > 0
                  ? <div className="hero-skills">{skills.slice(0, 14).map(sk => <span key={sk} className="skill-pill">{sk}</span>)}{skills.length > 14 && <span style={{ fontSize: 10, color: '#404040', padding: '2px 6px' }}>+{skills.length - 14}</span>}</div>
                  : <button onClick={() => setEditingProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#404040', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}><Code2 size={10} /> + Add skills</button>}
              </div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: 8 }}>
            {stats.map((s, i) => (
              <div key={i} className="stat-card" style={{ borderColor: `${s.color}15` }}>
                <s.icon size={12} color={s.color} style={{ display: 'block', margin: '0 auto 5px' }} />
                <div style={{ fontSize: 'clamp(12px,2vw,15px)', fontWeight: 900, color: s.color, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 7, color: '#404040', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="ranks-grid" style={{ marginBottom: 12 }}>
            {[
              { label: 'Batch Rank',    rank: rankData?.batchRank,    total: rankData?.batchTotal,        color: '#22c55e', sub: rankData?.batchCode || 'Your batch', icon: Users },
              { label: 'Track Rank',    rank: rankData?.trackRank,    total: rankData?.trackRankTotal,    color: '#3b82f6', sub: p?.targetTrack,                       icon: TrendingUp },
              { label: 'Platform Rank', rank: rankData?.platformRank, total: rankData?.platformRankTotal, color: '#a78bfa', sub: 'All users',                          icon: Globe },
            ].map((r, i) => (
              <div key={i} className="rank-card" style={{ borderColor: `${r.color}15` }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${r.color}40,transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <r.icon size={10} color={r.color} />
                  <span style={{ fontSize: 'clamp(7px,1.2vw,9px)', color: '#404040', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{r.label}</span>
                </div>
                <div style={{ fontSize: 'clamp(14px,3vw,26px)', fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1, fontFamily: 'IBM Plex Mono, monospace' }}>
                  #{r.rank || '—'}<span style={{ fontSize: 10, color: '#404040', fontWeight: 400, letterSpacing: 0 }}>/{r.total || '?'}</span>
                </div>
                <div style={{ fontSize: 9, color: `${r.color}99`, marginTop: 4, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{r.sub}</div>
              </div>
            ))}
          </div>

          <ActivityHeatmap posts={posts} tier={tier} />

          <div className="hl-row-wrap">
            <div className="hl-row">
              <div className="hl-new-wrap" onClick={() => setAddingHighlight(true)}>
                <button className="hl-add-btn"><Plus size={26} /></button>
                <span className="hl-new-label">New</span>
              </div>
              {highlights.map((hl, i) => (
                <div key={hl.id} className="hl-bubble-wrap">
                  <div className="hl-bubble-ring" style={{ background: `conic-gradient(${tier.color},${tier.color}55,${tier.color})` }} onClick={() => setStory({ highlights, startIdx: i })}>
                    <div className="hl-bubble-inner">
                      {hl.imageUrl ? <img src={hl.imageUrl} alt={hl.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Star size={22} color={tier.color} />}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteHighlight(hl.id) }} className="hl-del-btn"
                    style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: '#1a1a1a', border: '2px solid #000', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .2s', zIndex: 2 }}>
                    <X size={10} />
                  </button>
                  <span className="hl-bubble-label">{hl.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tabs-row">
            {([
              { key: 'posts',   icon: BookOpen, label: 'Posts',       count: posts.length },
              { key: 'saved',   icon: Bookmark, label: 'Saved',       count: savedPosts.length },
              { key: 'badges',  icon: Award,    label: 'Badges',      count: BADGES.length },
              { key: 'friends', icon: Users,    label: 'Connections', count: friends.length },
            ] as const).map(t => (
              <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
                <t.icon size={16} />
                <span>{t.label}</span>
                <span className="tc" style={{ fontSize: 9, background: activeTab === t.key ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)', color: activeTab === t.key ? '#e5e7eb' : '#404040', padding: '1px 6px', borderRadius: 100, fontFamily: 'monospace' }}>{t.count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'posts' && (
            <div>
              {posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,60px) 20px', borderTop: '1px solid #1a1a1a' }}>
                  <Camera size={40} style={{ color: '#1a1a1a', display: 'block', margin: '0 auto 14px' }} />
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#e5e7eb', marginBottom: 6 }}>Share your journey</p>
                  <p style={{ color: '#525252', fontSize: 13, marginBottom: 20 }}>Posts you share will appear here</p>
                  <button onClick={() => setShowComposer(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 12, color: '#e5e7eb', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}><Plus size={16} /> Create your first post</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 8px', borderBottom: '1px solid #111', marginBottom: 2 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {([{ v: 'grid', Icon: Grid }, { v: 'list', Icon: List }] as const).map(({ v, Icon }) => (
                        <button key={v} onClick={() => setPostView(v)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: postView === v ? '#1a1a1a' : 'transparent', border: `1px solid ${postView === v ? '#262626' : 'transparent'}`, borderRadius: 8, color: postView === v ? '#fff' : '#525252', cursor: 'pointer' }}><Icon size={14} /></button>
                      ))}
                    </div>
                    <button onClick={() => setShowComposer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 10, color: '#e5e7eb', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}><Plus size={14} /> New Post</button>
                  </div>
                  {postView === 'grid' ? (
                    <div className="posts-grid">
                      {posts.map(post => (
                        <div key={post.id} className="post-tile" onClick={() => setActivePost(post)}>
                          {post.videoUrl ? <><video src={post.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted /><div style={{ position: 'absolute', top: 8, right: 8, color: '#fff', opacity: .9 }}><Play size={16} fill="#fff" /></div></>
                            : post.imageUrl ? <img src={post.imageUrl} alt="" />
                            : <div className="post-tile-text">{post.content}</div>}
                          <div className="post-tile-overlay">
                            <div className="post-tile-stat"><Heart size={16} fill="#fff" color="#fff" /> {post.likes}</div>
                            <div className="post-tile-stat"><MessageCircle size={16} fill="#fff" color="#fff" /> {post.comments}</div>
                          </div>
                          {post.bookmarked && <div style={{ position: 'absolute', top: 6, left: 6, pointerEvents: 'none' }}><Bookmark size={13} fill="#fbbf24" color="#fbbf24" /></div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="posts-list">
                      {posts.map(post => (
                        <div key={post.id} className="post-list-card" onClick={() => setActivePost(post)}>
                          {post.imageUrl && <img src={post.imageUrl} alt="" />}
                          {post.videoUrl && <video src={post.videoUrl} muted style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />}
                          <div className="post-list-body">
                            {post.content && <p style={{ fontSize: 14, color: '#e5e7eb', lineHeight: 1.6, marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>{post.content}</p>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#737373' }}><Heart size={13} color={post.liked ? '#ef4444' : '#737373'} fill={post.liked ? '#ef4444' : 'none'} /> {post.likes}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#737373' }}><MessageCircle size={13} /> {post.comments}</span>
                              <span style={{ fontSize: 11, color: '#404040', marginLeft: 'auto', fontFamily: 'monospace' }}>{new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {showComposer && (
                <div onClick={e => { if (e.target === e.currentTarget) setShowComposer(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(8px)' }}>
                  <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 18, padding: 20, width: '100%', maxWidth: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif' }}>New Post</h3>
                      <button onClick={() => setShowComposer(false)} style={{ background: 'none', border: 'none', color: '#525252', cursor: 'pointer' }}><X size={18} /></button>
                    </div>
                    <PostComposer user={p} onPosted={() => { qc.invalidateQueries({ queryKey: ['my-profile'] }); setShowComposer(false) }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div>
              {savedPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,60px) 20px', borderTop: '1px solid #1a1a1a' }}>
                  <Bookmark size={40} style={{ color: '#1a1a1a', display: 'block', margin: '0 auto 14px' }} />
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#e5e7eb', marginBottom: 6 }}>Nothing saved yet</p>
                  <p style={{ color: '#525252', fontSize: 13, marginBottom: 4 }}>Tap the bookmark icon on any post to save it here.</p>
                  <p style={{ color: '#404040', fontSize: 11, fontFamily: 'monospace' }}>Only you can see your saved posts</p>
                </div>
              ) : (
                <div className="posts-grid">
                  {savedPosts.map(post => (
                    <div key={post.id} className="post-tile" onClick={() => setActivePost(post)}>
                      {post.videoUrl ? <video src={post.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted /> : post.imageUrl ? <img src={post.imageUrl} alt="" /> : <div className="post-tile-text">{post.content}</div>}
                      <div className="post-tile-overlay">
                        <div className="post-tile-stat"><Heart size={16} fill="#fff" color="#fff" /> {post.likes}</div>
                        <div className="post-tile-stat"><MessageCircle size={16} fill="#fff" color="#fff" /> {post.comments}</div>
                      </div>
                      <div style={{ position: 'absolute', top: 6, left: 6 }}><Bookmark size={13} fill="#fbbf24" color="#fbbf24" /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'badges' && (
            <div style={{ paddingTop: 12 }}>
              <BadgesSection xp={p?.xp || 0} posts={posts} friends={friends} tasks={p?._count?.tasks || 0} tests={p?._count?.testResults || 0} tier={p?.tier || 'developing'} />
            </div>
          )}

          {activeTab === 'friends' && (
            <div style={{ paddingTop: 16 }}>
              {friends.length > 0 ? (
                <div className="fr-grid">
                  {friends.map(f => {
                    const ft = TIER[f?.tier] || TIER.developing
                    return (
                      <div key={f.id} className="fr-card" onClick={() => router.push(`/profile/${f.username}`)} style={{ borderColor: `${ft.color}18` }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: f.profilePic ? 'transparent' : `${ft.color}15`, border: `2px solid ${ft.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: ft.color, flexShrink: 0, overflow: 'hidden' }}>
                          {f.profilePic ? <img src={f.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : f.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.username}</p>
                          <p style={{ fontSize: 10, color: ft.color, fontFamily: 'monospace', marginTop: 1 }}>{ft.label}</p>
                          <p style={{ fontSize: 10, color: '#525252', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.targetTrack}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Users size={40} style={{ color: '#1a1a1a', display: 'block', margin: '0 auto 14px' }} />
                  <p style={{ color: '#a3a3a3', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No connections yet</p>
                  <p style={{ color: '#525252', fontSize: 13, marginBottom: 20 }}>Connect with batchmates to grow your network</p>
                  <button onClick={() => router.push('/connections')} style={{ padding: '10px 22px', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 12, color: '#e5e7eb', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Find People</button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
