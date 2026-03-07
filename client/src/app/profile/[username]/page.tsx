'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Award, Bookmark, BookOpen, Brain, Calendar, CheckCircle,
  ExternalLink, Film, Flame, Github, Globe, Heart, Image,
  Linkedin, MessageCircle, MessageSquare, Play, Plus, Send, Star,
  Target, TrendingUp, UserCheck, UserPlus, Users, UserX, X, Zap
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

const TIER: Record<string, { color: string; glow: string; label: string }> = {
  developing:  { color: '#6b7280', glow: 'rgba(107,114,128,.3)',  label: 'Developing'  },
  rising:      { color: '#22c55e', glow: 'rgba(34,197,94,.3)',    label: 'Rising'      },
  competitive: { color: '#3b82f6', glow: 'rgba(59,130,246,.3)',   label: 'Competitive' },
  elite:       { color: '#a78bfa', glow: 'rgba(167,139,250,.3)',  label: 'Elite'       },
  legendary:   { color: '#fbbf24', glow: 'rgba(251,191,36,.3)',   label: 'Legendary'   },
}

const BADGES = [
  { id: 'first_post', icon: '📸', label: 'First Post',    color: '#22c55e', desc: 'Shared first update' },
  { id: 'streak_7',   icon: '🔥', label: '7-Day Streak',  color: '#f97316', desc: 'Consistent for a week' },
  { id: 'streak_30',  icon: '⚡', label: '30-Day Streak', color: '#fbbf24', desc: 'Month of daily grind' },
  { id: 'top_10',     icon: '🏆', label: 'Top 10',        color: '#a78bfa', desc: 'Platform top 10' },
  { id: 'networker',  icon: '🤝', label: 'Networker',     color: '#3b82f6', desc: '10+ connections' },
  { id: 'centurion',  icon: '💯', label: 'Centurion',     color: '#ef4444', desc: '100 tasks done' },
  { id: 'scholar',    icon: '🧠', label: 'Scholar',       color: '#06b6d4', desc: '50 tests done' },
  { id: 'legendary',  icon: '👑', label: 'Legendary',     color: '#fbbf24', desc: 'Legendary tier' },
]

function StoryViewer({ highlights, startIdx, onClose }: { highlights: any[]; startIdx: number; onClose: () => void }) {
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
              <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', textAlign: 'center', padding: '0 32px', fontFamily: 'Syne,sans-serif' }}>{cur.title}</p>
            </div>}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,.85))', padding: '60px 24px 40px' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6, fontFamily: 'Syne,sans-serif' }}>{cur.title}</h3>
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

function ActivityHeatmap({ posts, tier }: { posts: any[]; tier: { color: string } }) {
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
  const getColor = (c: number) => c === 0 ? '#111' : `${tier.color}${Math.round((0.2 + (c / max) * 0.8) * 255).toString(16).padStart(2, '0')}`
  return (
    <div style={{ background: '#080808', border: '1px solid #111', borderRadius: 16, padding: '18px 20px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={13} color={tier.color} /><span style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', fontFamily: 'Syne,sans-serif' }}>Activity</span></div>
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

function BadgesSection({ xp, posts, friends, tasks, tests, tier: tierStr }: { xp: number; posts: any[]; friends: any[]; tasks: number; tests: number; tier: string }) {
  const earned = BADGES.filter(b => {
    if (b.id === 'first_post') return posts.length > 0
    if (b.id === 'streak_7')   return xp >= 500
    if (b.id === 'streak_30')  return xp >= 3000
    if (b.id === 'top_10')     return xp >= 5000
    if (b.id === 'networker')  return friends.length >= 10
    if (b.id === 'centurion')  return tasks >= 100
    if (b.id === 'scholar')    return tests >= 50
    if (b.id === 'legendary')  return tierStr === 'legendary'
    return false
  }).map(b => b.id)
  return (
    <div style={{ background: '#080808', border: '1px solid #111', borderRadius: 16, padding: '18px 20px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Award size={13} color="#fbbf24" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', fontFamily: 'Syne,sans-serif' }}>Achievements</span>
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

function PostModal({ post, onClose, onLike, profile, tier }: { post: any; onClose: () => void; onLike: (id: string) => void; profile: any; tier: any }) {
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
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
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px,3vw,16px)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#000', border: '1px solid #262626', borderRadius: 4, display: 'flex', width: '100%', maxWidth: 920, maxHeight: '94vh', overflow: 'hidden', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><X size={16} /></button>
        <div style={{ flex: '0 0 55%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340, maxHeight: '94vh', overflow: 'hidden' }}>
          {post.videoUrl ? <video src={post.videoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '94vh' }} />
            : post.imageUrl ? <img src={post.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '94vh' }} />
            : <div style={{ padding: 32, textAlign: 'center' }}><p style={{ fontSize: 15, color: '#e5e7eb', lineHeight: 1.8, fontFamily: 'Syne,sans-serif' }}>{post.content}</p></div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #262626', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: profile?.profilePic ? 'transparent' : `${tier.color}18`, border: `2px solid ${tier.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: tier.color, overflow: 'hidden' }}>
              {profile?.profilePic ? <img src={profile.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Syne,sans-serif' }}>{profile?.username}</p>
              <p style={{ fontSize: 10, color: '#737373', fontFamily: 'monospace' }}>{new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          {post.content && <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}><p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.7, fontFamily: 'Syne,sans-serif' }}><span style={{ fontWeight: 700, color: '#fff', marginRight: 6 }}>{profile?.username}</span>{post.content}</p></div>}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {loading ? <p style={{ color: '#737373', fontSize: 12 }}>Loading…</p>
              : comments.length === 0 ? <p style={{ color: '#737373', fontSize: 12 }}>No comments yet.</p>
              : comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#3b82f6', flexShrink: 0 }}>{(c.user?.username || 'U')[0].toUpperCase()}</div>
                  <p style={{ fontSize: 12, color: '#fff', lineHeight: 1.6, fontFamily: 'Syne,sans-serif' }}><span style={{ fontWeight: 700, marginRight: 6 }}>{c.user?.username}</span>{c.content}</p>
                </div>
              ))}
          </div>
          <div style={{ borderTop: '1px solid #262626', padding: '10px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <button onClick={() => onLike(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Heart size={20} fill={post.liked ? '#ef4444' : 'none'} color={post.liked ? '#ef4444' : '#737373'} /></button>
              <MessageCircle size={20} color="#737373" />
              <Send size={20} color="#737373" style={{ transform: 'rotate(20deg)' }} />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10, fontFamily: 'Syne,sans-serif' }}>{post.likes?.toLocaleString()} likes</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #1a1a1a', paddingTop: 10 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendComment()} placeholder="Add a comment…" style={{ flex: 1, background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'Syne,sans-serif' }} />
              <button onClick={sendComment} disabled={!commentText.trim()} style={{ background: 'none', border: 'none', color: commentText.trim() ? '#3b82f6' : '#1e3a5f', cursor: commentText.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 700 }}>Post</button>
            </div>
          </div>
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
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: 'Syne,sans-serif' }}>Add Highlight</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 120, background: preview ? 'transparent' : 'rgba(255,255,255,.02)', border: '1px dashed #262626', borderRadius: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
          {preview ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center' }}><Image size={22} color="#374151" /><p style={{ fontSize: 11, color: '#374151', marginTop: 6 }}>Click to add image</p></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)) }} />
        {[{ key: 'title', label: 'Title *', placeholder: 'My Project' }, { key: 'link', label: 'Link *', placeholder: 'https://github.com/...' }, { key: 'description', label: 'Description', placeholder: 'What did you build?' }].map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, color: '#555', marginBottom: 5, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 12px', color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Syne,sans-serif' }} />
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
  const tc = TIER[user?.tier] || TIER.developing
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
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: user?.profilePic ? 'transparent' : `${tc.color}18`, border: `1.5px solid ${tc.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: tc.color, flexShrink: 0, overflow: 'hidden' }}>
          {user?.profilePic ? <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.username?.[0]?.toUpperCase()}
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Share your progress, project, or insight..." rows={3} style={{ flex: 1, background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'Syne,sans-serif' }} />
      </div>
      {mediaPreview && (
        <div style={{ position: 'relative', marginTop: 12, borderRadius: 12, overflow: 'hidden', maxHeight: 240 }}>
          {mediaType === 'video' ? <video src={mediaPreview} controls style={{ width: '100%', maxHeight: 240, borderRadius: 12, background: '#000' }} /> : <img src={mediaPreview} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12 }} />}
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
        <button onClick={submit} disabled={posting || (!content.trim() && !mediaFile)} style={{ padding: '7px 18px', background: posting || (!content.trim() && !mediaFile) ? 'rgba(59,130,246,.04)' : 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.35)', borderRadius: 10, color: posting || (!content.trim() && !mediaFile) ? '#1e3a5f' : '#3b82f6', fontSize: 12, fontWeight: 700, cursor: posting || (!content.trim() && !mediaFile) ? 'not-allowed' : 'pointer' }}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}

export default function PublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const username = params.username as string
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'badges' | 'friends'>('posts')
  const [activePost, setActivePost] = useState<any>(null)
  const [story, setStory] = useState<{ highlights: any[]; startIdx: number } | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [addingHighlight, setAddingHighlight] = useState(false)
  const [postView, setPostView] = useState<'grid' | 'list'>('grid')

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  // ✅ FIX: staleTime prevents stale flash on refresh
  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => api.get(`/user/${username}/public`).then(r => r.data.data),
    enabled: !!username,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // ✅ FIX: Case-insensitive isOwnProfile check — "Rajput" === "rajput" now works
  const isOwnProfile = !!(user && (
    user.username?.toLowerCase() === username?.toLowerCase() ||
    (profile?.id && user.id === profile.id)
  ))

  const { data: connectionStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['conn-status', profile?.id],
    queryFn: () => api.get(`/connections/status/${profile?.id}`).then(r => r.data.data).catch(() => ({ status: null, connectionId: null })),
    enabled: !!profile?.id && !isOwnProfile,
    staleTime: 30_000,
  })

  const { data: friendsData } = useQuery({
    queryKey: ['public-friends', profile?.id],
    queryFn: () => api.get(`/user/${profile?.username}/friends`).then(r => r.data.data).catch(() => []),
    enabled: !!profile?.id && (connectionStatus?.status === 'accepted' || isOwnProfile),
    staleTime: 60_000,
  })

  const sendRequest = useMutation({
    mutationFn: () => api.post(`/connections/request/${profile.id}`),
    onSuccess: () => { toast.success('Friend request sent!'); refetchStatus() },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })
  const acceptRequest = useMutation({
    mutationFn: () => api.post(`/connections/accept/${connectionStatus?.connectionId}`),
    onSuccess: () => { toast.success('Accepted!'); refetchStatus() },
    onError: () => toast.error('Failed to accept'),
  })
  const removeConnection = useMutation({
    mutationFn: () => api.delete(`/connections/${connectionStatus?.connectionId}`),
    onSuccess: () => { toast.success('Connection removed'); refetchStatus() },
    onError: () => toast.error('Failed to remove'),
  })

  const likePost = async (id: string) => { try { await api.post(`/user/posts/${id}/like`); qc.invalidateQueries({ queryKey: ['public-profile', username] }) } catch {} }
  const bookmarkPost = async (id: string) => { try { await api.post(`/user/posts/${id}/bookmark`); qc.invalidateQueries({ queryKey: ['public-profile', username] }) } catch {} }
  const deletePostMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/user/posts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['public-profile', username] }); toast.success('Post deleted') },
    onError: () => toast.error('Failed to delete'),
  })
  const addHighlight = async (fd: any, file?: File) => {
    try {
      const form = new FormData()
      Object.entries(fd).forEach(([k, v]) => form.append(k, v as string))
      if (file) form.append('image', file)
      await api.post('/user/highlights', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      qc.invalidateQueries({ queryKey: ['public-profile', username] }); setAddingHighlight(false); toast.success('Highlight added!')
    } catch { toast.error('Failed to add highlight') }
  }
  const deleteHighlight = async (id: string) => {
    try { await api.delete(`/user/highlights/${id}`); qc.invalidateQueries({ queryKey: ['public-profile', username] }); toast.success('Removed') }
    catch { toast.error('Failed to delete') }
  }

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #1a1a1a', borderTopColor: '#3b82f6', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ✅ FIX: Only show "not found" after loading is complete
  if (!isLoading && !profile) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>👤</div>
      <p style={{ color: '#525252', fontSize: 14 }}>User not found</p>
      <button onClick={() => router.back()} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>← Go back</button>
    </div>
  )

  if (!profile) return null

  const tier = TIER[profile?.tier] || TIER.developing
  const status = connectionStatus?.status
  const canSeeDetails = status === 'accepted' || isOwnProfile
  const posts: any[] = (profile?.posts || []).map((p: any) => ({ ...p, bookmarked: p.bookmarked ?? false }))
  const savedPosts: any[] = posts.filter(p => p.bookmarked)
  const highlights: any[] = profile?.highlights || []
  const friends: any[] = Array.isArray(friendsData) ? friendsData : []
  const skills: string[] = profile?.skills || []

  const connBtn = (() => {
    if (isOwnProfile) return null
    if (status === 'accepted')         return { icon: UserCheck, label: 'Connected',      color: '#22c55e', bg: 'rgba(34,197,94,.1)',   border: 'rgba(34,197,94,.3)',   action: () => removeConnection.mutate(), disabled: removeConnection.isPending }
    if (status === 'pending_sent')     return { icon: UserX,     label: 'Request Sent',   color: '#f97316', bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.3)', action: () => {},                        disabled: true }
    if (status === 'pending_received') return { icon: UserCheck, label: 'Accept Request', color: '#3b82f6', bg: 'rgba(59,130,246,.1)', border: 'rgba(59,130,246,.3)', action: () => acceptRequest.mutate(),    disabled: acceptRequest.isPending }
    return { icon: UserPlus, label: 'Add Friend', color: '#3b82f6', bg: 'rgba(59,130,246,.1)', border: 'rgba(59,130,246,.3)', action: () => sendRequest.mutate(), disabled: sendRequest.isPending }
  })()

  const stats = [
    { label: 'Mastery', value: `${Math.round(profile?.masteryPercent || 0)}%`, color: '#22c55e', icon: Brain },
    { label: 'Streak',  value: `${profile?.streakCurrent || 0}d`,             color: '#fb923c', icon: Flame },
    { label: 'XP',      value: (profile?.xp || 0).toLocaleString(),           color: '#fbbf24', icon: Zap },
    { label: 'Tasks',   value: profile?._count?.tasks || 0,                   color: '#3b82f6', icon: CheckCircle },
    { label: 'Tests',   value: profile?._count?.testResults || 0,             color: '#a78bfa', icon: Target },
    { label: 'Reality', value: profile?.realityScore || 0,                    color: '#ef4444', icon: TrendingUp },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box} h1,h2,h3,h4,h5,h6,p{margin:0;padding:0}
        body{background:#000;color:#fff;font-family:'Syne',sans-serif;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px;height:3px} ::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .pub-root{min-height:100vh;background:#000}
        .pub-wrap{max-width:935px;margin:0 auto;padding:clamp(12px,3vw,36px) clamp(0px,2vw,24px) 100px}
        .pub-hero{background:linear-gradient(160deg,#0a0a0a,#050505);border:1px solid #111;border-radius:clamp(0px,2vw,20px);padding:clamp(16px,3vw,24px) clamp(14px,3vw,24px);margin-bottom:8px;position:relative;overflow:hidden;animation:fadeUp .4s ease both}
        .pub-layout{display:flex;gap:clamp(14px,3vw,22px);align-items:flex-start}
        .pub-avatar{width:clamp(72px,10vw,96px);height:clamp(72px,10vw,96px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:clamp(24px,4vw,34px);font-weight:900;overflow:hidden;flex-shrink:0}
        .pub-body{flex:1;min-width:0}
        .pub-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
        .pub-actions{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap}
        .pub-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:8px}
        .pub-stat{background:#080808;border:1px solid #111;border-radius:12px;padding:clamp(10px,2vw,14px) 6px;text-align:center;transition:background .2s}
        .pub-stat:hover{background:#0f0f0f}
        .pub-ranks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
        .pub-rank{background:#080808;border:1px solid #111;border-radius:16px;padding:clamp(12px,2vw,16px);position:relative;overflow:hidden}
        .hl-row{display:flex;gap:clamp(14px,3vw,22px);overflow-x:auto;padding:8px 0 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;align-items:flex-start;margin-bottom:0;border-bottom:1px solid #111;padding-bottom:20px}
        .hl-row::-webkit-scrollbar{display:none}
        .hl-bwrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer}
        .hl-bring{width:clamp(66px,11vw,92px);height:clamp(66px,11vw,92px);border-radius:50%;padding:2.5px;display:flex;align-items:center;justify-content:center;transition:transform .2s}
        .hl-bring:hover{transform:scale(1.05)}
        .hl-binner{width:100%;height:100%;border-radius:50%;border:2.5px solid #000;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#111}
        .hl-blabel{font-size:11px;color:#a3a3a3;text-align:center;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pub-tabs{display:flex;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;margin-bottom:2px}
        .pub-tab{flex:1;padding:clamp(10px,2vw,14px) 0;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:clamp(11px,1.5vw,13px);font-weight:600;font-family:'Syne',sans-serif;border-top:2px solid transparent;margin-top:-1px;transition:all .2s;color:#525252}
        .pub-tab.active{color:#fff;border-top-color:#fff}
        .pub-tab:hover:not(.active){color:#a3a3a3}
        .posts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
        .post-tile{aspect-ratio:1;position:relative;overflow:hidden;cursor:pointer;background:#0a0a0a}
        .post-tile img,.post-tile video{width:100%;height:100%;object-fit:cover;display:block}
        .post-tile-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;gap:16px}
        .post-tile:hover .post-tile-overlay{opacity:1}
        .post-tile-stat{display:flex;align-items:center;gap:5px;color:#fff;font-size:14px;font-weight:700}
        .post-tile-text{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;font-size:11px;color:#737373;line-height:1.5;background:#0d0d0d}
        .fr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
        .fr-card{background:#080808;border:1px solid #111;border-radius:14px;padding:14px 16px;cursor:pointer;transition:background .2s,transform .2s;display:flex;align-items:center;gap:12px}
        .fr-card:hover{background:#0f0f0f;transform:translateY(-2px)}
        .hl-bwrap:hover .hl-del{opacity:1!important}
        @media(max-width:900px){.pub-stats{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:700px){.pub-wrap{padding:14px 12px 90px}.fr-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:540px){
          .pub-wrap{padding:0 0 80px}
          .pub-hero{border-radius:0;border-left:none;border-right:none;margin-bottom:0;padding:14px}
          .pub-stats{grid-template-columns:repeat(3,1fr);gap:4px}
          .pub-stat{border-radius:0;border-left:none;border-right:none}
          .pub-ranks{grid-template-columns:repeat(3,1fr)!important;gap:4px;padding:0 10px}
          .pub-rank{border-radius:10px;padding:10px 8px}
          .hl-row{padding:8px 12px 20px}
          .fr-grid{padding:0 12px}
          .posts-grid{gap:1px}
          .pub-tab span:not(.tc){display:none}
          .pub-tab{gap:2px}
        }
        @media(max-width:420px){
          .pub-stats{grid-template-columns:repeat(3,1fr)!important}
          .pub-ranks{grid-template-columns:repeat(3,1fr)!important}
          .fr-grid{grid-template-columns:repeat(2,1fr)}
          .posts-grid{grid-template-columns:repeat(3,1fr)}
        }
        @media(min-width:1200px){.pub-wrap{padding:36px 24px 100px}.fr-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}}
      `}</style>

      {activePost && <PostModal post={activePost} onClose={() => setActivePost(null)} onLike={likePost} profile={profile} tier={tier} />}
      {story && <StoryViewer highlights={story.highlights} startIdx={story.startIdx} onClose={() => setStory(null)} />}
      {addingHighlight && isOwnProfile && <AddHighlightModal onClose={() => setAddingHighlight(false)} onAdd={addHighlight} />}
      {showComposer && isOwnProfile && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowComposer(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 18, padding: 20, width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'Syne,sans-serif' }}>New Post</h3>
              <button onClick={() => setShowComposer(false)} style={{ background: 'none', border: 'none', color: '#525252', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <PostComposer user={profile} onPosted={() => { qc.invalidateQueries({ queryKey: ['public-profile', username] }); setShowComposer(false) }} />
          </div>
        </div>
      )}

      <div className="pub-root" style={{ opacity: mounted ? 1 : 0, transition: 'opacity .4s ease' }}>
        <div className="pub-wrap">

          <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#525252', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 18 }}>
            <ArrowLeft size={16} />
          </button>

          <div className="pub-hero">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${tier.color}60,transparent)` }} />
            <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle,${tier.glow},transparent 70%)`, pointerEvents: 'none', opacity: .4 }} />
            <div className="pub-layout" style={{ position: 'relative' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ padding: 2, borderRadius: '50%', background: `conic-gradient(${tier.color},${tier.color}40,${tier.color})` }}>
                  <div style={{ padding: 2, borderRadius: '50%', background: '#000' }}>
                    <div className="pub-avatar" style={{ background: profile?.profilePic ? 'transparent' : `${tier.color}15`, color: tier.color }}>
                      {profile?.profilePic ? <img src={profile.profilePic} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile?.username?.[0]?.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="pub-body">
                <div className="pub-top">
                  <div>
                    <h1 style={{ fontSize: 'clamp(18px,4vw,24px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', marginBottom: 6 }}>{profile?.username}</h1>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}25`, borderRadius: 100, padding: '2px 9px', fontSize: 8, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1.5 }}>{tier.label.toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: '#525252', textTransform: 'capitalize' }}>{profile?.targetTrack}</span>
                      {profile?.level && <><span style={{ color: '#1f2937' }}>·</span><span style={{ fontSize: 11, color: '#525252', textTransform: 'capitalize' }}>{profile.level}</span></>}
                    </div>
                  </div>
                  <div className="pub-actions">
                    {isOwnProfile ? (
                      <button onClick={() => router.push('/profile')} style={{ padding: '9px 16px', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 10, color: '#a3a3a3', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Edit Profile</button>
                    ) : connBtn ? (
                      <>
                        <button onClick={connBtn.action} disabled={connBtn.disabled} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: connBtn.bg, border: `1px solid ${connBtn.border}`, borderRadius: 10, color: connBtn.color, cursor: connBtn.disabled ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: connBtn.disabled ? .7 : 1 }}>
                          <connBtn.icon size={14} /> {connBtn.label}
                        </button>
                        {status === 'accepted' && (
                          <button onClick={() => router.push(`/chat/${profile?.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 10, color: '#3b82f6', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                            <MessageSquare size={14} /> Message
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 14, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 14, overflow: 'hidden' }}>
                  {[
                    { label: 'Posts',       value: posts.length,                         color: '#e5e7eb' },
                    { label: 'Connections', value: friends.length,                       color: '#e5e7eb' },
                    { label: 'XP',          value: (profile?.xp || 0).toLocaleString(), color: '#fbbf24' },
                  ].map((s, i, arr) => (
                    <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 6px', borderRight: i < arr.length - 1 ? '1px solid #1a1a1a' : 'none', gap: 3 }}>
                      <span style={{ fontSize: 'clamp(15px,3vw,19px)', fontWeight: 900, color: s.color, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1, letterSpacing: '-0.5px' }}>{s.value}</span>
                      <span style={{ fontSize: 9, color: '#525252', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'monospace', fontWeight: 600 }}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {profile?.bio && <p style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.7, marginBottom: 10 }}>{profile.bio}</p>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {[{ url: profile?.githubUrl, Icon: Github, label: 'GitHub', color: '#e5e7eb' }, { url: profile?.linkedinUrl, Icon: Linkedin, label: 'LinkedIn', color: '#3b82f6' }, { url: profile?.portfolioUrl, Icon: Globe, label: 'Portfolio', color: '#22c55e' }].filter(l => l.url).map(l => (
                    <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, color: l.color, fontSize: 10, fontWeight: 700, textDecoration: 'none', fontFamily: 'monospace' }}><l.Icon size={11} /> {l.label}</a>
                  ))}
                  {profile?.createdAt && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#404040', fontFamily: 'monospace' }}><Calendar size={10} />{new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                </div>
                {skills.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {skills.slice(0, 12).map(sk => <span key={sk} style={{ padding: '3px 10px', background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.16)', borderRadius: 100, fontSize: 10, color: '#93c5fd', fontFamily: 'monospace' }}>{sk}</span>)}
                    {skills.length > 12 && <span style={{ fontSize: 10, color: '#404040', padding: '3px 6px' }}>+{skills.length - 12}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pub-stats" style={{ marginBottom: 8 }}>
            {stats.map((s, i) => (
              <div key={i} className="pub-stat" style={{ borderColor: `${s.color}15` }}>
                <s.icon size={12} color={s.color} style={{ display: 'block', margin: '0 auto 5px' }} />
                <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 900, color: s.color, fontFamily: 'IBM Plex Mono,monospace', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 7, color: '#404040', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="pub-ranks">
            {[
              { label: 'Batch Rank',    rank: profile?.batchRank,    total: profile?.batchTotal,        color: '#22c55e', sub: profile?.batchCode || 'Batch', icon: Users },
              { label: 'Track Rank',    rank: profile?.trackRank,    total: profile?.trackRankTotal,    color: '#3b82f6', sub: profile?.targetTrack,           icon: TrendingUp },
              { label: 'Platform Rank', rank: profile?.platformRank, total: profile?.platformRankTotal, color: '#a78bfa', sub: 'All users',                    icon: Globe },
            ].map((r, i) => (
              <div key={i} className="pub-rank" style={{ borderColor: `${r.color}15` }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${r.color}40,transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <r.icon size={10} color={r.color} />
                  <span style={{ fontSize: 'clamp(7px,1.2vw,9px)', color: '#404040', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{r.label}</span>
                </div>
                <div style={{ fontSize: 'clamp(14px,3vw,24px)', fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1, fontFamily: 'IBM Plex Mono,monospace' }}>
                  #{r.rank || '—'}<span style={{ fontSize: 10, color: '#404040', fontWeight: 400, letterSpacing: 0 }}>/{r.total || '?'}</span>
                </div>
                <div style={{ fontSize: 9, color: `${r.color}99`, marginTop: 4, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{r.sub}</div>
              </div>
            ))}
          </div>

          <ActivityHeatmap posts={posts} tier={tier} />

          {(highlights.length > 0 || isOwnProfile) && (
            <div className="hl-row">
              {isOwnProfile && (
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }} onClick={() => setAddingHighlight(true)}>
                  <button style={{ width: 'clamp(66px,11vw,88px)', height: 'clamp(66px,11vw,88px)', borderRadius: '50%', background: 'transparent', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}><Plus size={24} /></button>
                  <span style={{ fontSize: 11, color: '#e5e7eb', fontFamily: 'Syne,sans-serif' }}>New</span>
                </div>
              )}
              {highlights.map((hl, i) => (
                <div key={hl.id} className="hl-bwrap" onClick={() => setStory({ highlights, startIdx: i })}>
                  <div className="hl-bring" style={{ background: `conic-gradient(${tier.color},${tier.color}55,${tier.color})` }}>
                    <div className="hl-binner">
                      {hl.imageUrl ? <img src={hl.imageUrl} alt={hl.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Star size={22} color={tier.color} />}
                    </div>
                  </div>
                  {isOwnProfile && (
                    <button onClick={e => { e.stopPropagation(); deleteHighlight(hl.id) }} className="hl-del"
                      style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#1a1a1a', border: '2px solid #000', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, opacity: 0, transition: 'opacity .2s' }}>
                      <X size={9} />
                    </button>
                  )}
                  <span className="hl-blabel">{hl.title}</span>
                </div>
              ))}
            </div>
          )}

          {!canSeeDetails && !isOwnProfile && (
            <div style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: 16, padding: 'clamp(20px,4vw,28px) 24px', textAlign: 'center', marginTop: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
              <p style={{ color: '#a3a3a3', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Connect to see more</p>
              <p style={{ color: '#525252', fontSize: 13, marginBottom: 18 }}>Connect with <strong style={{ color: '#a3a3a3' }}>{profile?.username}</strong> to see their posts and friends</p>
              {connBtn && (
                <button onClick={connBtn.action} disabled={connBtn.disabled} style={{ padding: '10px 24px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 10, color: '#3b82f6', cursor: connBtn.disabled ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7, opacity: connBtn.disabled ? .7 : 1 }}>
                  <UserPlus size={14} /> {status === 'pending_sent' ? 'Request Sent' : 'Add Friend'}
                </button>
              )}
            </div>
          )}

          {canSeeDetails && (
            <>
              <div className="pub-tabs">
                {([
                  { key: 'posts',   icon: BookOpen, label: 'Posts',   count: posts.length },
                  ...(isOwnProfile ? [{ key: 'saved' as const, icon: Bookmark, label: 'Saved', count: savedPosts.length }] : []),
                  { key: 'badges',  icon: Award,    label: 'Badges',  count: BADGES.length },
                  { key: 'friends', icon: Users,    label: 'Friends', count: friends.length },
                ] as const).map(t => (
                  <button key={t.key} className={`pub-tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key as any)}>
                    <t.icon size={16} />
                    <span>{t.label}</span>
                    <span className="tc" style={{ fontSize: 9, background: activeTab === t.key ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)', color: activeTab === t.key ? '#e5e7eb' : '#404040', padding: '1px 6px', borderRadius: 100, fontFamily: 'monospace' }}>{t.count}</span>
                  </button>
                ))}
              </div>

              {activeTab === 'posts' && (
                posts.length === 0
                  ? <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,60px) 0', borderTop: '1px solid #1a1a1a' }}>
                      <BookOpen size={36} style={{ color: '#1a1a1a', display: 'block', margin: '0 auto 12px' }} />
                      <p style={{ color: '#a3a3a3', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No posts yet</p>
                      {isOwnProfile && <button onClick={() => setShowComposer(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 12, color: '#e5e7eb', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginTop: 12 }}><Plus size={15} /> Create first post</button>}
                    </div>
                  : <>
                      {isOwnProfile && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 8px', borderBottom: '1px solid #111', marginBottom: 2 }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {([{ v: 'grid', icon: '▦' }, { v: 'list', icon: '☰' }] as const).map(({ v, icon }) => (
                              <button key={v} onClick={() => setPostView(v)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: postView === v ? '#1a1a1a' : 'transparent', border: `1px solid ${postView === v ? '#262626' : 'transparent'}`, borderRadius: 8, color: postView === v ? '#fff' : '#525252', cursor: 'pointer', fontSize: 14 }}>{icon}</button>
                            ))}
                          </div>
                          <button onClick={() => setShowComposer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1a1a1a', border: '1px solid #262626', borderRadius: 10, color: '#e5e7eb', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Syne,sans-serif' }}><Plus size={13} /> New Post</button>
                        </div>
                      )}
                      <div className="posts-grid">
                        {posts.map((post: any) => (
                          <div key={post.id} className="post-tile" onClick={() => setActivePost(post)}>
                            {post.videoUrl ? <><video src={post.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted /><div style={{ position: 'absolute', top: 8, right: 8, color: '#fff' }}><Play size={14} fill="#fff" /></div></>
                              : post.imageUrl ? <img src={post.imageUrl} alt="" /> : <div className="post-tile-text">{post.content}</div>}
                            <div className="post-tile-overlay">
                              <div className="post-tile-stat"><Heart size={16} fill="#fff" color="#fff" /> {post.likes}</div>
                              <div className="post-tile-stat"><MessageCircle size={16} fill="#fff" color="#fff" /> {post.comments}</div>
                            </div>
                            {isOwnProfile && post.bookmarked && <div style={{ position: 'absolute', top: 6, left: 6 }}><Bookmark size={13} fill="#fbbf24" color="#fbbf24" /></div>}
                          </div>
                        ))}
                      </div>
                    </>
              )}

              {activeTab === 'saved' && isOwnProfile && (
                savedPosts.length === 0
                  ? <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,60px) 0', borderTop: '1px solid #1a1a1a' }}>
                      <Bookmark size={36} style={{ color: '#1a1a1a', display: 'block', margin: '0 auto 12px' }} />
                      <p style={{ color: '#a3a3a3', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Nothing saved yet</p>
                    </div>
                  : <div className="posts-grid">
                      {savedPosts.map((post: any) => (
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

              {activeTab === 'badges' && (
                <div style={{ paddingTop: 12 }}>
                  <BadgesSection xp={profile?.xp || 0} posts={posts} friends={friends} tasks={profile?._count?.tasks || 0} tests={profile?._count?.testResults || 0} tier={profile?.tier || 'developing'} />
                </div>
              )}

              {activeTab === 'friends' && (
                friends.length === 0
                  ? <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,60px) 0' }}>
                      <Users size={36} style={{ color: '#1a1a1a', display: 'block', margin: '0 auto 12px' }} />
                      <p style={{ color: '#525252', fontSize: 13 }}>No connections yet</p>
                    </div>
                  : <div className="fr-grid" style={{ paddingTop: 12 }}>
                      {friends.map((f: any) => {
                        const ft = TIER[f.tier] || TIER.developing
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
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}