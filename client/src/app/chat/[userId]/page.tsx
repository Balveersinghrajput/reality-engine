'use client'
import { useDMStore } from '@/components/DMToastProvider'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  ArrowLeft, Check, ChevronDown, Code2, Copy,
  File, Forward, Info, Paperclip, Pin, Send, Trash2, X
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'

const LANG_COLORS: Record<string, string> = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3572a5',
  java: '#b07219', cpp: '#f34b7d', c: '#555555', go: '#00add8',
  rust: '#dea584', kotlin: '#a97bff', swift: '#f05138',
  html: '#e34c26', css: '#563d7c', sql: '#e38c00',
  bash: '#89e051', json: '#5a9', plaintext: '#888',
}
const LANGUAGES = Object.keys(LANG_COLORS)

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtSize(b?: number) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ─── Code Block ───────────────────────────────────────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied,   setCopied]   = useState(false)
  const [expanded, setExpanded] = useState(false)
  const lines   = code.split('\n')
  const lc      = LANG_COLORS[language] || '#888'
  const preview = lines.slice(0, 6)
  const hasMore = lines.length > 6

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 480, background: '#07090f', border: `1px solid ${lc}30`, fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: `linear-gradient(90deg, ${lc}12, transparent)`, borderBottom: `1px solid ${lc}20` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />)}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: lc, letterSpacing: 1.5, textTransform: 'uppercase' }}>{language}</span>
          <span style={{ fontSize: 10, color: '#333' }}>{lines.length} lines</span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied ? `${lc}20` : 'rgba(255,255,255,.04)', border: `1px solid ${copied ? lc + '50' : 'rgba(255,255,255,.06)'}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: copied ? lc : '#444', fontSize: 10, fontWeight: 700, transition: 'all .2s' }}>
          {copied ? <Check size={10} /> : <Copy size={10} />}{copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, lineHeight: '22px' }}>
          <tbody>
            {(expanded ? lines : preview).map((line, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.012)' }}>
                <td style={{ padding: '0 10px 0 14px', textAlign: 'right', color: '#252535', userSelect: 'none', minWidth: 36, borderRight: `1px solid ${lc}10`, fontSize: 10, verticalAlign: 'top' }}>{i + 1}</td>
                <td style={{ padding: '0 16px 0 14px', color: '#c9d1d9', whiteSpace: 'pre', verticalAlign: 'top' }}>{line || <span style={{ opacity: 0 }}>_</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', padding: '7px', background: `${lc}08`, border: 'none', borderTop: `1px solid ${lc}15`, color: lc, fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
          {expanded ? '▲ Show less' : `▼ ${lines.length - 6} more lines`}
        </button>
      )}
    </div>
  )
}

// ─── Context Menu ─────────────────────────────────────────────────
function ContextMenu({ x, y, isMine, onClose, onDelete, onCopy, onForward, onPin, onInfo }: any) {
  useEffect(() => {
    const h = () => onClose()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])
  const items = [
    { icon: <Copy size={13} />,    label: 'Copy',    action: onCopy },
    { icon: <Forward size={13} />, label: 'Forward', action: onForward },
    { icon: <Pin size={13} />,     label: 'Pin',     action: onPin },
    { icon: <Info size={13} />,    label: 'Info',    action: onInfo },
    ...(isMine ? [{ icon: <Trash2 size={13} />, label: 'Delete', action: onDelete, danger: true }] : []),
  ]
  return (
    <div style={{ position: 'fixed', left: x, top: y, zIndex: 1000, background: '#111318', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '5px', minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,.7)', animation: 'ctxIn .12s ease' }} onClick={e => e.stopPropagation()}>
      {items.map((item: any, i: number) => (
        <button key={i} onClick={() => { item.action(); onClose() }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', color: item.danger ? '#f87171' : '#ccc', fontSize: 13, fontWeight: 500 }}
          onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,.12)' : 'rgba(255,255,255,.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <span style={{ color: item.danger ? '#f87171' : '#555' }}>{item.icon}</span>{item.label}
        </button>
      ))}
    </div>
  )
}

// ─── Delete Dialog ────────────────────────────────────────────────
function DeleteDialog({ isMine, onClose, onDeleteForMe, onDeleteForEveryone }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .15s ease' }} onClick={onClose}>
      <div style={{ background: '#111318', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: '24px', minWidth: 290, boxShadow: '0 20px 60px rgba(0,0,0,.8)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} color="#f87171" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Delete Message</p>
            <p style={{ color: '#444', fontSize: 12 }}>Choose who to delete for</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onDeleteForMe}
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#ccc', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}>
            🙈 Delete for me
            <span style={{ display: 'block', fontSize: 11, color: '#444', fontWeight: 400, marginTop: 2 }}>Only you won't see this</span>
          </button>
          {isMine && (
            <button onClick={onDeleteForEveryone}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.08)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,.08)')}>
              🗑 Delete for everyone
              <span style={{ display: 'block', fontSize: 11, color: '#f8717180', fontWeight: 400, marginTop: 2 }}>Removed for all participants</span>
            </button>
          )}
          <button onClick={onClose} style={{ padding: '10px', borderRadius: 10, border: 'none', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Bubble ───────────────────────────────────────────────────────
function Bubble({ msg, isMine, onContextMenu }: { msg: any; isMine: boolean; onContextMenu: any }) {
  const del       = msg.isDeleted
  const isPending = msg._pending === true

  return (
    <div
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, msg, isMine) }}
      style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, padding: '3px 14px', marginBottom: 2, opacity: isPending ? 0.6 : 1, transition: 'opacity .2s' }}
    >
      {/* Avatar */}
      <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: isMine ? 'linear-gradient(135deg,#1d4ed8,#7c3aed)' : 'linear-gradient(135deg,#374151,#1f2937)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', marginBottom: 18 }}>
        {msg.sender?.username?.[0]?.toUpperCase() ?? '?'}
      </div>

      <div style={{ maxWidth: '68%', minWidth: 60 }}>
        {!isMine && (
          <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, marginBottom: 3, paddingLeft: 2 }}>{msg.sender?.username}</p>
        )}
        <div style={{
          borderRadius: isMine ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          padding: del ? '10px 14px' : msg.type === 'code' ? 0 : msg.type === 'image' ? 3 : '10px 14px',
          background: del ? 'rgba(255,255,255,.03)' : isMine ? 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)' : '#1e2130',
          border: del ? '1px solid rgba(255,255,255,.05)' : isMine ? '1px solid rgba(59,130,246,.35)' : '1px solid rgba(255,255,255,.08)',
          boxShadow: isMine ? '0 2px 12px rgba(37,99,235,.25)' : '0 2px 8px rgba(0,0,0,.3)',
          overflow: 'hidden',
        }}>
          {del
            ? <span style={{ color: '#4b5563', fontSize: 13, fontStyle: 'italic' }}>🗑 This message was deleted</span>
            : msg.type === 'text'
            ? <p style={{ color: isMine ? '#e0eaff' : '#d1d5db', fontSize: 14, lineHeight: 1.6, margin: 0, wordBreak: 'break-word' }}>{msg.content}</p>
            : msg.type === 'code'
            ? <CodeBlock code={msg.content} language={msg.codeLanguage || 'plaintext'} />
            : msg.type === 'image'
            ? <div>
                <img src={msg.fileUrl} alt="photo" style={{ maxWidth: 260, maxHeight: 280, borderRadius: 12, display: 'block', cursor: 'zoom-in' }} onClick={() => window.open(msg.fileUrl, '_blank')} />
                {msg.content && msg.content !== '🖼 Photo' && <p style={{ color: '#9ca3af', fontSize: 12, margin: '6px 6px 3px' }}>{msg.content}</p>}
              </div>
            : msg.type === 'video'
            ? <video src={msg.fileUrl} controls style={{ maxWidth: 260, maxHeight: 200, borderRadius: 12, display: 'block' }} />
            : <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(59,130,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <File size={16} color="#3b82f6" />
                  </div>
                  <div>
                    <p style={{ color: '#fff', fontSize: 13, margin: 0, fontWeight: 600 }}>{msg.fileName || 'File'}</p>
                    <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{fmtSize(msg.fileSize)}</p>
                  </div>
                </div>
              </a>
          }
        </div>
        <p style={{ fontSize: 10, color: '#374151', marginTop: 3, textAlign: isMine ? 'right' : 'left', fontFamily: 'monospace' }}>
          {isPending ? '⏳ sending…' : fmtTime(msg.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ChatPage() {
  const params = useParams()
  const targetUserId = (Array.isArray(params?.userId) ? params.userId[0] : params?.userId) as string | undefined
  const router = useRouter()

  const { user: me, accessToken } = useAuthStore()
  const { markSeen } = useDMStore()   // ✅ clear navbar DM badge

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [otherUser,      setOtherUser]      = useState<any>(null)
  const [messages,       setMessages]       = useState<any[]>([])
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [hasMore,        setHasMore]        = useState(true)
  const [loadingMore,    setLoadingMore]    = useState(false)
  const [cursor,         setCursor]         = useState<string | null>(null)
  const [typingOther,    setTypingOther]    = useState(false)
  const [showScrollBtn,  setShowScrollBtn]  = useState(false)
  const [showCodeModal,  setShowCodeModal]  = useState(false)
  const [codeInput,      setCodeInput]      = useState('')
  const [codeLang,       setCodeLang]       = useState('javascript')
  const [codeCaption,    setCodeCaption]    = useState('')
  const [ctxMenu,        setCtxMenu]        = useState<any>(null)
  const [deleteDialog,   setDeleteDialog]   = useState<any>(null)

  const socketRef   = useRef<Socket | null>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const msgsEl      = useRef<HTMLDivElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const atBottom    = useRef(true)

  // ── Load conversation & messages ──────────────────────────────
  useEffect(() => {
    if (!targetUserId) return
    async function init() {
      try {
        const r = await api.post(`/chat/conversations/${targetUserId}`)
        const { conversationId: cid, other } = r.data.data
        setConversationId(cid)
        setOtherUser(other)
        // ✅ Clear DM badge immediately when you open the chat
        markSeen(cid)

        const m = await api.get(`/chat/conversations/${cid}/messages`)
        const msgs: any[] = m.data.data
        setMessages(msgs)
        if (msgs.length < 40) setHasMore(false)
        if (msgs.length > 0)  setCursor(msgs[0].id)
        setTimeout(() => bottomRef.current?.scrollIntoView(), 80)
      } catch { toast.error('Failed to load chat') }
    }
    init()
  }, [targetUserId])

  // ── Socket ────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !accessToken) return
    const sock = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: { token: accessToken }, transports: ['websocket'],
    })
    socketRef.current = sock
    sock.emit('join_conversation', conversationId)

    // ✅ Replace optimistic bubble (sender) or add new message (receiver)
    sock.on('new_message', (msg: any) => {
      setMessages(prev => {
        const pendingIdx = prev.findIndex(m => m._pending && m.content === msg.content && m.type === msg.type)
        if (pendingIdx !== -1) {
          const updated = [...prev]
          updated[pendingIdx] = msg
          return updated
        }
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // Also clear badge in case a message comes in while we're viewing
      markSeen(conversationId)
      if (atBottom.current) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40)
      else setShowScrollBtn(true)
    })

    sock.on('message_deleted', ({ messageId }: any) =>
      setMessages(p => p.map(m => m.id === messageId ? { ...m, isDeleted: true } : m)))

    sock.on('messages_deleted', ({ messageIds }: any) => {
      const s = new Set<string>(messageIds)
      setMessages(p => p.map(m => s.has(m.id) ? { ...m, isDeleted: true } : m))
    })

    sock.on('user_typing',         () => setTypingOther(true))
    sock.on('user_stopped_typing', () => setTypingOther(false))

    return () => { sock.emit('leave_conversation', conversationId); sock.disconnect() }
  }, [conversationId, accessToken])

  // ── Scroll ────────────────────────────────────────────────────
  const onScroll = useCallback(() => {
    const el = msgsEl.current; if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setShowScrollBtn(!atBottom.current)
    if (el.scrollTop < 80 && hasMore && !loadingMore) loadOlder()
  }, [hasMore, loadingMore])

  async function loadOlder() {
    if (!conversationId || !cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const r = await api.get(`/chat/conversations/${conversationId}/messages?cursor=${cursor}`)
      const older: any[] = r.data.data
      if (older.length < 40) setHasMore(false)
      if (older.length > 0) {
        setCursor(older[0].id)
        const prevH = msgsEl.current?.scrollHeight || 0
        setMessages(p => [...older, ...p])
        setTimeout(() => { if (msgsEl.current) msgsEl.current.scrollTop = msgsEl.current.scrollHeight - prevH }, 40)
      }
    } finally { setLoadingMore(false) }
  }

  // ── Typing indicator ──────────────────────────────────────────
  function onInput(v: string) {
    setInput(v)
    if (!socketRef.current || !conversationId) return
    socketRef.current.emit('typing_start', { conversationId })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socketRef.current?.emit('typing_stop', { conversationId }), 1400)
  }

  // ── Send text (with optimistic update) ───────────────────────
  async function sendText() {
    if (!input.trim() || !conversationId || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    socketRef.current?.emit('typing_stop', { conversationId })

    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId, content, type: 'text',
      senderId: me?.id,
      sender: { id: me?.id, username: me?.username },
      createdAt: new Date().toISOString(),
      isDeleted: false, _pending: true,
    }
    setMessages(p => [...p, optimistic])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40)

    try {
      await api.post(`/chat/conversations/${conversationId}/messages`, { content })
    } catch {
      setMessages(p => p.filter(m => m.id !== tempId))
      setInput(content)
      toast.error('Failed to send')
    } finally { setSending(false) }
  }

  // ── Send code ─────────────────────────────────────────────────
  async function sendCode() {
    if (!codeInput.trim() || !conversationId) return
    try {
      await api.post(`/chat/conversations/${conversationId}/code`, {
        code: codeInput.trim(), language: codeLang, caption: codeCaption,
      })
      setShowCodeModal(false); setCodeInput(''); setCodeCaption('')
      toast.success('Code shared!')
    } catch { toast.error('Failed') }
  }

  // ── Upload ────────────────────────────────────────────────────
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !conversationId) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const ep = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
      await api.post(`/chat/conversations/${conversationId}/${ep}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); e.target.value = '' }
  }

  function handleContextMenu(e: React.MouseEvent, msg: any, isMine: boolean) {
    if (msg._pending) return
    e.preventDefault()
    setCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 180), y: Math.min(e.clientY, window.innerHeight - 240), msg, isMine })
  }

  async function handleDeleteForMe() {
    if (!deleteDialog) return
    try {
      await api.delete(`/chat/messages/${deleteDialog.msg.id}`)
      setMessages(p => p.map(m => m.id === deleteDialog.msg.id ? { ...m, isDeleted: true } : m))
      toast.success('Deleted for you')
    } catch { toast.error('Failed') }
    setDeleteDialog(null)
  }

  async function handleDeleteForEveryone() {
    if (!deleteDialog) return
    try { await api.delete(`/chat/messages/${deleteDialog.msg.id}`); toast.success('Deleted for everyone') }
    catch { toast.error('Failed') }
    setDeleteDialog(null)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1c1c2e;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}
        @keyframes ctxIn{from{opacity:0;transform:scale(.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .tdot{display:inline-block;width:5px;height:5px;border-radius:50%;background:#3b82f6;animation:blink 1.2s infinite}
        .tdot:nth-child(2){animation-delay:.2s}.tdot:nth-child(3){animation-delay:.4s}
        .inp:focus{outline:none;border-color:rgba(59,130,246,.5)!important}
        textarea:focus{outline:none}
        .sbtn:hover{background:#2563eb!important}
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#06070d', overflow: 'hidden' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#0a0b14', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'linear-gradient(135deg,#374151,#1f2937)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>
            {otherUser?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{otherUser?.username ?? '...'}</p>
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
              {typingOther
                ? <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
                    typing <span className="tdot" /><span className="tdot" /><span className="tdot" />
                  </span>
                : otherUser?.tier ?? ''}
            </p>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div ref={msgsEl} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 16, height: 16, border: '2px solid #1a1a2e', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .8s linear infinite', display: 'inline-block' }} />
            </div>
          )}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>💬</div>
              <p style={{ color: '#374151', fontSize: 14 }}>No messages yet. Say hi!</p>
            </div>
          )}
          {messages.map(msg => {
            const isMine = !!(
              (me?.id && msg.sender?.id  && msg.sender.id  === me.id) ||
              (me?.id && msg.senderId    && msg.senderId   === me.id)
            )
            return <Bubble key={msg.id} msg={msg} isMine={isMine} onContextMenu={handleContextMenu} />
          })}
          <div ref={bottomRef} />
        </div>

        {showScrollBtn && (
          <button onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowScrollBtn(false) }}
            style={{ position: 'fixed', bottom: 90, right: 18, width: 34, height: 34, borderRadius: '50%', background: '#1d4ed8', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.6)', zIndex: 10 }}>
            <ChevronDown size={16} />
          </button>
        )}

        {/* ── INPUT BAR ── */}
        <div style={{ padding: '10px 14px 14px', background: '#0a0b14', borderTop: '1px solid rgba(255,255,255,.04)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
            <button onClick={() => setShowCodeModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(59,130,246,.07)', border: '1px solid rgba(59,130,246,.2)', color: '#3b82f6', borderRadius: 8, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <Code2 size={12} /> Code
            </button>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFileChange}
              accept="image/*,video/*,.pdf,.zip,.doc,.docx,.txt,.csv,.json,.js,.ts,.py,.java,.cpp,.c,.go,.rs" />
            <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', color: '#6b7280', borderRadius: 8, padding: '5px 11px', fontSize: 11, cursor: 'pointer' }}>
              {uploading
                ? <div style={{ width: 12, height: 12, border: '2px solid #333', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                : <Paperclip size={12} />}
              {uploading ? 'Uploading...' : 'Attach'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea className="inp" value={input}
              onChange={e => onInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
              placeholder="Message… (right-click for options)"
              rows={1}
              style={{ flex: 1, background: '#0f1018', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '11px 15px', color: '#f0f0f0', fontSize: 14, resize: 'none', fontFamily: 'Inter,sans-serif', lineHeight: 1.55, maxHeight: 120, overflowY: 'auto' }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }}
            />
            <button className="sbtn" onClick={sendText} disabled={!input.trim() || sending}
              style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0, background: input.trim() ? '#3b82f6' : '#0f1018', color: input.trim() ? '#fff' : '#252535', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
              <Send size={16} />
            </button>
          </div>
          <p style={{ color: '#1f2937', fontSize: 10, textAlign: 'center', marginTop: 5 }}>Enter to send · Shift+Enter new line · Right-click for options</p>
        </div>
      </div>

      {/* ── OVERLAYS ── */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y} isMine={ctxMenu.isMine}
          onClose={() => setCtxMenu(null)}
          onDelete={() => { setDeleteDialog({ msg: ctxMenu.msg, isMine: ctxMenu.isMine }); setCtxMenu(null) }}
          onCopy={() => { navigator.clipboard.writeText(ctxMenu.msg.content); toast.success('Copied!') }}
          onForward={() => toast('Forward coming soon')}
          onPin={() => toast('Pin coming soon')}
          onInfo={() => toast(`Sent at ${fmtTime(ctxMenu.msg.createdAt)}`)}
        />
      )}
      {deleteDialog && (
        <DeleteDialog
          isMine={deleteDialog.isMine}
          onClose={() => setDeleteDialog(null)}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
        />
      )}
      {showCodeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowCodeModal(false)}>
          <div style={{ background: '#0a0b14', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, width: '100%', maxWidth: 700, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(59,130,246,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Code2 size={15} color="#3b82f6" />
                </div>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Share Code</span>
              </div>
              <button onClick={() => setShowCodeModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,.03)', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {LANGUAGES.map(lang => {
                const lc = LANG_COLORS[lang]; const active = codeLang === lang
                return (
                  <button key={lang} onClick={() => setCodeLang(lang)}
                    style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: active ? `${lc}18` : 'rgba(255,255,255,.03)', border: `1px solid ${active ? lc + '50' : 'rgba(255,255,255,.05)'}`, color: active ? lc : '#6b7280' }}>
                    {lang}
                  </button>
                )
              })}
            </div>
            <textarea value={codeInput} onChange={e => setCodeInput(e.target.value)}
              placeholder={`// Paste or write ${codeLang} code…`}
              style={{ width: '100%', minHeight: 220, maxHeight: 320, background: '#07090f', border: 'none', color: '#c9d1d9', fontSize: 13, lineHeight: 1.8, padding: '14px 18px', resize: 'none', fontFamily: "'JetBrains Mono',monospace", outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, padding: '11px 18px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
              <input value={codeCaption} onChange={e => setCodeCaption(e.target.value)}
                placeholder="Caption (optional)"
                style={{ flex: 1, background: '#0f1018', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '9px 13px', color: '#fff', fontSize: 13, outline: 'none' }}
              />
              <button onClick={sendCode} disabled={!codeInput.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: codeInput.trim() ? '#3b82f6' : '#111', border: 'none', borderRadius: 9, padding: '9px 18px', color: codeInput.trim() ? '#fff' : '#333', fontSize: 13, fontWeight: 700, cursor: codeInput.trim() ? 'pointer' : 'not-allowed' }}>
                <Send size={13} /> Send Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}