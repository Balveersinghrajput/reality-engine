'use client'

import { useDMStore } from '@/components/DMToastProvider'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  ArrowLeft,
  Camera,
  Check, CheckCheck,
  CheckSquare,
  ChevronDown,
  Clipboard,
  Code2,
  Copy,
  Image as ImageIcon,
  MoreVertical,
  Paperclip,
  Phone,
  Pin, PinOff,
  Reply,
  Search,
  Send,
  Share2,
  Smile,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface Message {
  id        : string
  senderId  : string
  content   : string
  createdAt : string
  seen     ?: boolean
  reactions?: Record<string, string[]>
  replyTo  ?: { id: string; content: string; senderName: string }
  fileUrl  ?: string
  fileType ?: 'image' | 'file' | 'code'
  fileName ?: string
  language ?: string   // for code snippets
  pinned   ?: boolean
}

interface OtherUser { id: string; username: string; tier?: string }

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','💯','👀','✅']
const FULL_EMOJIS  = [
  '😀','😂','🥲','😍','🤩','😎','🥳','😅','🤣','😭',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','🔥',
  '👍','👎','👏','🙌','🤝','✌️','🤟','🫶','💪','🎉',
  '🎊','🎁','🎈','🌟','⭐','💫','✨','🚀','🌈','🍕',
]
const AVATAR_GRADIENTS: [string, string][] = [
  ['#3b82f6','#6366f1'],
  ['#8b5cf6','#ec4899'],
  ['#06b6d4','#3b82f6'],
  ['#10b981','#06b6d4'],
  ['#f59e0b','#ef4444'],
]
const CODE_LANGS = ['javascript','typescript','python','java','c++','go','rust','html','css','sql','bash','json']

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function getAvatarColors(username?: string | null): [string, string] {
  if (!username) return ['#3b82f6', '#6366f1']
  return AVATAR_GRADIENTS[username.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const fmtDate = (d: string) => {
  const dt   = new Date(d); const now = new Date()
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (dt.toDateString() === now.toDateString())  return 'Today'
  if (dt.toDateString() === yest.toDateString()) return 'Yesterday'
  return dt.toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' })
}

const newDay = (msgs: Message[], i: number) =>
  i === 0 || new Date(msgs[i-1].createdAt).toDateString() !== new Date(msgs[i].createdAt).toDateString()

const lastInGroup = (msgs: Message[], i: number) =>
  i === msgs.length - 1 || msgs[i].senderId !== msgs[i+1].senderId

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

/** Typing indicator */
function TypingIndicator({ name }: { name: string }) {
  return (
    <div style={S.typingRow}>
      <div style={S.typingBubble}>
        <span style={{ fontSize:12, color:'#555' }}>{name} is typing</span>
        <div style={{ display:'flex', gap:3 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ ...S.dot, animationDelay:`${i*0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Reaction bar */
function ReactionBar({ msgId, myId, reactions={}, onReact }: {
  msgId:string; myId:string; reactions:Record<string,string[]>
  onReact:(id:string,emoji:string)=>void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} style={S.reactionBar}>
      <button style={S.addReactBtn} onClick={() => setOpen(v=>!v)}><Smile size={11}/></button>
      {open && (
        <div style={S.quickPicker}>
          {QUICK_EMOJIS.map(e => (
            <button key={e} style={S.qpItem} onClick={() => { onReact(msgId,e); setOpen(false) }}>{e}</button>
          ))}
        </div>
      )}
      {Object.entries(reactions).map(([emoji,users]) => (
        <button key={emoji}
          style={{ ...S.chip, ...(users.includes(myId) ? S.chipMine : {}) }}
          onClick={() => onReact(msgId,emoji)}>
          {emoji}<span style={{ fontSize:10, marginLeft:2, opacity:0.7 }}>{users.length}</span>
        </button>
      ))}
    </div>
  )
}

/** Code block inside a bubble */
function CodeBlock({ code, lang, mine }: { code:string; lang?:string; mine:boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ ...S.codeBlock, borderColor: mine ? '#1e3a6e':'#1a1a1a' }}>
      <div style={S.codeHeader}>
        <span style={{ fontSize:11, color:'#555', fontFamily:'monospace' }}>{lang ?? 'code'}</span>
        <button style={S.copyBtn} onClick={copy} title="Copy code">
          {copied ? <Check size={12} style={{ color:'#22c55e' }}/> : <Clipboard size={12}/>}
        </button>
      </div>
      <pre style={S.codePre}><code style={{ fontFamily:"'Fira Code',monospace", fontSize:12, color:'#c8d8f8' }}>{code}</code></pre>
    </div>
  )
}

/** In-bubble reply quote */
function InBubbleReply({ r }: { r: NonNullable<Message['replyTo']> }) {
  return (
    <div style={S.inReply}>
      <div style={S.inReplyBar}/>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:11, color:'#3b82f6', fontWeight:600, marginBottom:1 }}>{r.senderName}</p>
        <p style={{ fontSize:12, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{r.content}</p>
      </div>
    </div>
  )
}

/** Reply strip above input */
function ReplyStrip({ reply, onCancel }: { reply?:Message['replyTo']; onCancel:()=>void }) {
  if (!reply) return null
  return (
    <div style={S.replyStrip}>
      <div style={{ width:3, height:28, borderRadius:2, background:'#1d4ed8', flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, color:'#3b82f6', fontWeight:600 }}>{reply.senderName}</p>
        <p style={{ fontSize:12, color:'#444', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{reply.content}</p>
      </div>
      <button style={S.closeBtn} onClick={onCancel}><X size={13}/></button>
    </div>
  )
}

/** Code share modal */
function CodeModal({ onSend, onClose }: {
  onSend:(code:string,lang:string)=>void; onClose:()=>void
}) {
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('javascript')
  return (
    <div style={S.modalBackdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={S.modal}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontWeight:600, fontSize:15, color:'#e4e4e7' }}>Share Code</span>
          <button style={S.closeBtn} onClick={onClose}><X size={15}/></button>
        </div>

        {/* Language selector */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
          {CODE_LANGS.map(l => (
            <button key={l}
              style={{ padding:'3px 10px', borderRadius:20, fontSize:11,
                background: lang===l ? '#1d4ed8':'#111',
                border: `1px solid ${lang===l ? '#2563eb':'#1c1c1c'}`,
                color: lang===l ? '#fff':'#555', cursor:'pointer', transition:'all 0.15s' }}
              onClick={() => setLang(l)}>
              {l}
            </button>
          ))}
        </div>

        <textarea
          autoFocus
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Paste your code here…"
          style={{ ...S.codeTA }}
        />

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...S.primaryBtn, ...(!code.trim() ? { opacity:0.4, cursor:'not-allowed' }:{}) }}
            disabled={!code.trim()}
            onClick={() => { onSend(code,lang); onClose() }}>
            Send Code
          </button>
        </div>
      </div>
    </div>
  )
}

/** Delete confirmation modal */
function DeleteModal({ count, onDeleteForMe, onDeleteForAll, onClose }: {
  count:number; onDeleteForMe:()=>void; onDeleteForAll:()=>void; onClose:()=>void
}) {
  return (
    <div style={S.modalBackdrop} onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ ...S.modal, maxWidth:340 }}>
        <p style={{ fontSize:15, fontWeight:600, color:'#e4e4e7', marginBottom:8 }}>
          Delete {count} message{count>1?'s':''}?
        </p>
        <p style={{ fontSize:13, color:'#555', marginBottom:20 }}>
          This action cannot be undone.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button style={S.deleteForAllBtn} onClick={() => { onDeleteForAll(); onClose() }}>
            🗑️ Delete for Everyone
          </button>
          <button style={S.deleteForMeBtn} onClick={() => { onDeleteForMe(); onClose() }}>
            Delete for Me
          </button>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

/** Pinned banner */
function PinnedBanner({ pinned, onJump }: { pinned:Message[]; onJump:(id:string)=>void }) {
  const [i, setI] = useState(0)
  if (!pinned.length) return null
  const msg = pinned[i % pinned.length]
  return (
    <div style={S.pinnedBanner} onClick={() => { onJump(msg.id); setI(v=>(v+1)%pinned.length) }}>
      <Pin size={11} style={{ color:'#facc15', flexShrink:0 }}/>
      <p style={{ flex:1, minWidth:0, fontSize:12, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.content}</p>
      {pinned.length>1 && <span style={{ fontSize:11, color:'#444' }}>{(i%pinned.length)+1}/{pinned.length}</span>}
    </div>
  )
}

/** Search overlay */
function SearchOverlay({ messages, onClose, onJump }: {
  messages:Message[]; onClose:()=>void; onJump:(id:string)=>void
}) {
  const [q, setQ] = useState('')
  const hits = q.trim() ? messages.filter(m => m.content?.toLowerCase().includes(q.toLowerCase())) : []
  return (
    <div style={S.searchOverlay}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom:'1px solid #111' }}>
        <Search size={14} style={{ color:'#555', flexShrink:0 }}/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search messages…"
          style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#d4d4d8', fontSize:14 }}/>
        <button style={S.closeBtn} onClick={onClose}><X size={14}/></button>
      </div>
      <div style={{ overflowY:'auto', flex:1 }}>
        {q && !hits.length && <p style={{ color:'#444', fontSize:13, textAlign:'center', padding:24 }}>No results</p>}
        {hits.map(m => (
          <button key={m.id} style={S.searchHit} onClick={() => { onJump(m.id); onClose() }}>
            <p style={{ fontSize:13, color:'#bbb', textAlign:'left' }}>{m.content}</p>
            <p style={{ fontSize:11, color:'#444', marginTop:2 }}>{fmtTime(m.createdAt)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Full emoji panel */
function EmojiPanel({ onSelect }: { onSelect:(e:string)=>void }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', padding:'10px 12px', borderTop:'1px solid #0c0c0c', gap:2 }}>
      {FULL_EMOJIS.map(e => (
        <button key={e} style={S.emojiBtn} onClick={() => onSelect(e)}>{e}</button>
      ))}
    </div>
  )
}

/** 3-dot menu */
function MoreMenu({ onClose, username, onClear }: {
  onClose:()=>void; username:string; onClear:()=>void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} style={S.moreMenu}>
      {[
        { icon:<Share2 size={13}/>, label:'Share contact', fn:() => {
            if (navigator.share) navigator.share({ title:username })
            else { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!') }
          }},
        { icon:<Copy size={13}/>, label:'Copy username', fn:() => { navigator.clipboard.writeText(username); toast.success('Copied!') }},
        { icon:<Trash2 size={13}/>, label:'Clear chat', fn:onClear, danger:true },
      ].map(item => (
        <button key={item.label}
          style={{ ...S.moreItem, ...(item.danger ? { color:'#ef4444' }:{}) }}
          onClick={() => { item.fn(); onClose() }}>
          {item.icon}
          <span style={{ fontSize:13 }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Icon button — no border/borderColor conflict
//  Uses borderWidth + borderStyle + borderColor separately
// ─────────────────────────────────────────────
function IconBtn({
  onClick, label, active=false, children,
}: {
  onClick:()=>void; label:string; active?:boolean; children:React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width:34, height:34, borderRadius:9,
        borderWidth:1, borderStyle:'solid',
        borderColor: active ? '#1e3a8a' : '#161616',
        background:'#080808',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', color: active ? '#3b82f6':'#555',
        transition:'all 0.15s', flexShrink:0,
      }}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function ChatPage() {
  const params       = useParams()
  const router       = useRouter()
  const targetUserId = params?.userId as string

  const { user: me, accessToken } = useAuthStore()
  const { markSeen } = useDMStore()

  // ── State ──
  const [loading,        setLoading]        = useState(true)
  const [initError,      setInitError]      = useState<string|null>(null)
  const [conversationId, setConversationId] = useState<string|null>(null)
  const [otherUser,      setOtherUser]      = useState<OtherUser|null>(null)
  const [messages,       setMessages]       = useState<Message[]>([])
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [online,         setOnline]         = useState(false)
  const [isTyping,       setIsTyping]       = useState(false)
  const [showEmoji,      setShowEmoji]      = useState(false)
  const [replyTo,        setReplyTo]        = useState<Message['replyTo']|null>(null)
  const [showSearch,     setShowSearch]     = useState(false)
  const [showMore,       setShowMore]       = useState(false)
  const [showScrollBtn,  setShowScrollBtn]  = useState(false)
  const [showCodeModal,  setShowCodeModal]  = useState(false)

  // ── Multi-select state ──
  const [selectMode,    setSelectMode]    = useState(false)
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [showDelModal,  setShowDelModal]  = useState(false)

  // ── Refs ──
  const socketRef    = useRef<Socket|null>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const listRef      = useRef<HTMLDivElement>(null)
  const imgInputRef  = useRef<HTMLInputElement>(null)   // gallery images
  const fileInputRef = useRef<HTMLInputElement>(null)   // any file
  const camInputRef  = useRef<HTMLInputElement>(null)   // camera capture
  const msgRefs      = useRef<Record<string,HTMLDivElement|null>>({})
  const typingTimer  = useRef<ReturnType<typeof setTimeout>|null>(null)
  const didInit      = useRef(false)

  // ── Upload state ──
  const [uploading, setUploading] = useState(false)

  // ── Derived ──
  const [c1,c2]    = getAvatarColors(otherUser?.username)
  const avatarInit = otherUser?.username?.[0]?.toUpperCase() ?? '?'
  const pinnedMsgs = messages.filter(m => m.pinned)

  // ─────────────────────────────────────────
  //  Auth hydration — works on hard refresh
  //  Zustand-persist rehydrates async from localStorage, so on page
  //  load `me` and `accessToken` from useAuthStore() start as null.
  //  We subscribe to the store and set local state once they appear.
  // ─────────────────────────────────────────
  const [authReady, setAuthReady] = useState(() => {
    const s = useAuthStore.getState()
    return !!(s.user && s.accessToken)
  })

  useEffect(() => {
    // Already hydrated (normal navigation, not hard refresh)
    const s = useAuthStore.getState()
    if (s.user && s.accessToken) { setAuthReady(true); return }

    // Wait for persist to rehydrate
    const unsub = useAuthStore.subscribe((s) => {
      if (s.user && s.accessToken) {
        setAuthReady(true)
        unsub()
      }
    })
    return () => unsub()
  }, [])

  // ─────────────────────────────────────────
  //  Load conversation once auth is ready
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!targetUserId || !authReady || didInit.current) return
    didInit.current = true

    const { user: u, accessToken: t } = useAuthStore.getState()

    ;(async () => {
      try {
        setLoading(true); setInitError(null)
        const r = await api.post(`/chat/conversations/${targetUserId}`)
        const { conversationId: cid, other } = r.data.data
        setConversationId(cid); setOtherUser(other); markSeen(cid)
        const m = await api.get(`/chat/conversations/${cid}/messages`)
        setMessages(m.data.data ?? [])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 80)
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Failed to load chat'
        setInitError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    })()
  }, [targetUserId, authReady])

  // ── Socket ──
  // NOTE: `mounted` guard prevents React Strict Mode's double-invoke from
  //       connecting a socket that is immediately torn down, which causes
  //       "WebSocket closed before connection established" in dev mode.
  useEffect(() => {
    if (!conversationId || !accessToken) return
    let mounted = true

    // Disconnect any stale socket first
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL    ||
      'http://localhost:5000'

    const sock = io(SOCKET_URL, {
      auth               : { token: accessToken },
      transports         : ['websocket'],
      reconnection       : true,
      reconnectionDelay  : 1000,
      reconnectionAttempts: 5,
      // Delay connection slightly so cleanup from Strict Mode unmount
      // can cancel before the socket is actually opened
      autoConnect: false,
    })

    socketRef.current = sock

    // Only start connecting if still mounted
    const connectTimer = setTimeout(() => {
      if (!mounted) return
      sock.connect()
    }, 50)

    sock.on('connect', () => {
      if (mounted) sock.emit('join_conversation', conversationId)
    })
    sock.on('connect_error', err => console.warn('[socket]', err.message))

    sock.on('new_message', (msg: Message) => {
      if (!mounted) return
      setMessages(p => p.find(m => m.id === msg.id) ? p : [...p, msg])
      markSeen(conversationId)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40)
    })
    sock.on('message_reaction', ({ msgId, reactions }: any) => {
      if (mounted) setMessages(p => p.map(m => m.id === msgId ? { ...m, reactions } : m))
    })
    sock.on('message_pinned', ({ msgId, pinned }: any) => {
      if (mounted) setMessages(p => p.map(m => m.id === msgId ? { ...m, pinned } : m))
    })
    sock.on('messages_seen', ({ by }: any) => {
      if (mounted && by === otherUser?.id)
        setMessages(p => p.map(m => m.senderId === me?.id ? { ...m, seen: true } : m))
    })
    sock.on('user_typing',      ({ userId }: any) => { if (mounted && userId === otherUser?.id) setIsTyping(true)  })
    sock.on('user_stop_typing', ({ userId }: any) => { if (mounted && userId === otherUser?.id) setIsTyping(false) })
    sock.on('user_online',      ({ userId }: any) => { if (mounted && userId === otherUser?.id) setOnline(true)  })
    sock.on('user_offline',     ({ userId }: any) => { if (mounted && userId === otherUser?.id) setOnline(false) })

    return () => {
      mounted = false
      clearTimeout(connectTimer)
      if (sock.connected) sock.emit('leave_conversation', conversationId)
      sock.disconnect()
      socketRef.current = null
    }
  }, [conversationId, accessToken])

  // ── Scroll FAB ──
  useEffect(() => {
    const el = listRef.current; if (!el) return
    const h = () => setShowScrollBtn(el.scrollHeight-el.scrollTop-el.clientHeight > 200)
    el.addEventListener('scroll', h)
    return () => el.removeEventListener('scroll', h)
  }, [])

  // ─────────────────────────────────────────
  //  Actions
  // ─────────────────────────────────────────
  const jumpTo = useCallback((id:string) => {
    const el = msgRefs.current[id]; if (!el) return
    el.scrollIntoView({ behavior:'smooth', block:'center' })
    el.style.background = 'rgba(59,130,246,0.1)'
    setTimeout(() => { if (el) el.style.background='' }, 1200)
  }, [])

  const emitTyping = useCallback(() => {
    if (!conversationId) return
    socketRef.current?.emit('typing', { conversationId })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socketRef.current?.emit('stop_typing', { conversationId }), 2000)
  }, [conversationId])

  async function sendMessage() {
    const content = input.trim()
    if (!content || !conversationId || sending) return
    setSending(true); setInput(''); setReplyTo(null); setShowEmoji(false)
    if (textareaRef.current) textareaRef.current.style.height='auto'
    try { await api.post(`/chat/conversations/${conversationId}/messages`, { content, replyTo:replyTo??undefined }) }
    catch { toast.error('Send failed'); setInput(content) }
    finally { setSending(false) }
  }

  async function sendCode(code:string, lang:string) {
    if (!conversationId) return
    try {
      await api.post(`/chat/conversations/${conversationId}/messages`, {
        content:`\`\`\`${lang}\n${code}\n\`\`\``,
        fileType:'code', language:lang,
      })
    } catch { toast.error('Failed to send code') }
  }

  async function reactToMessage(msgId: string, emoji: string) {
    if (!conversationId || !me) return
    // Optimistic toggle
    setMessages(p => p.map(m => {
      if (m.id !== msgId) return m
      const reactions = { ...(m.reactions ?? {}) }
      const users     = reactions[emoji] ?? []
      reactions[emoji] = users.includes(me.id)
        ? users.filter(x => x !== me.id)
        : [...users, me.id]
      if (!reactions[emoji].length) delete reactions[emoji]
      return { ...m, reactions }
    }))
    try {
      await api.post(
        `/chat/conversations/${conversationId}/messages/${msgId}/react`,
        { emoji },
      )
    } catch {
      // Silently keep optimistic state
    }
  }

  function togglePin(msg: Message) {
    // Always toggle locally — persists for this session
    const newPinned = !msg.pinned
    setMessages(p => p.map(m => m.id === msg.id ? { ...m, pinned: newPinned } : m))
    // Fire-and-forget to backend (do not await, do not show error)
    if (conversationId) {
      api.post(
        `/chat/conversations/${conversationId}/messages/${msg.id}/pin`,
        { pinned: newPinned },
      ).catch(() => {/* backend optional */})
    }
  }

  async function uploadFile(file: File, type: 'image' | 'file') {
    if (!conversationId) { toast.error('No conversation'); return }
    setUploading(true)

    // ── Try multipart upload endpoint first ──
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      await api.post(
        `/chat/conversations/${conversationId}/messages/upload`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      toast.success(type === 'image' ? '📷 Image sent' : '📎 File sent')
      setUploading(false)
      return
    } catch (err: any) {
      // If endpoint doesn't exist (404/405), fall back to base64 inline
      const status = err?.response?.status
      if (status !== 404 && status !== 405) {
        toast.error('Upload failed')
        setUploading(false)
        return
      }
    }

    // ── Fallback: send file as base64 data-URL inside a message ──
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      await api.post(`/chat/conversations/${conversationId}/messages`, {
        content : '',
        fileUrl : dataUrl,
        fileType: type,
        fileName: file.name,
      })
      toast.success(type === 'image' ? '📷 Image sent' : '📎 File sent')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleImageInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file, 'image')
    e.target.value = ''
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    uploadFile(file, isImage ? 'image' : 'file')
    e.target.value = ''
  }

  function handleCameraInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file, 'image')
    e.target.value = ''
  }

  async function clearChat() {
    if (!conversationId) return
    try { await api.delete(`/chat/conversations/${conversationId}/messages`); setMessages([]); toast.success('Chat cleared') }
    catch { toast.error('Could not clear chat') }
  }

  // ── Multi-select ──
  function toggleSelect(id:string) {
    setSelected(prev => {
      const n=new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function exitSelectMode() { setSelectMode(false); setSelected(new Set()) }

  function deleteForMe() {
    const ids = [...selected]
    setMessages(p => p.filter(m => !ids.includes(m.id)))
    exitSelectMode()
    if (conversationId) {
      api.post(`/chat/conversations/${conversationId}/messages/delete-for-me`, { messageIds: ids })
        .catch(() => {/* backend optional */})
    }
  }

  function deleteForAll() {
    const ids = [...selected]
    setMessages(p => p.filter(m => !ids.includes(m.id)))
    exitSelectMode()
    if (conversationId) {
      api.post(`/chat/conversations/${conversationId}/messages/delete-for-all`, { messageIds: ids })
        .catch(() => {/* backend optional */})
    }
  }

  // ─────────────────────────────────────────
  //  Parse code blocks from message content
  // ─────────────────────────────────────────
  function parseContent(msg:Message) {
    const codeRegex = /^```(\w+)?\n([\s\S]*?)\n```$/
    const match = msg.content?.match(codeRegex)
    if (match || msg.fileType==='code') {
      const lang  = match?.[1] ?? msg.language ?? 'code'
      const code  = match?.[2] ?? msg.content ?? ''
      return { isCode:true, lang, code }
    }
    return { isCode:false, lang:'', code:'' }
  }

  // ─────────────────────────────────────────
  //  Loading / error screens
  // ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.fullCenter}>
        <div style={{ display:'flex', gap:7 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:9, height:9, borderRadius:'50%', background:'#1d4ed8',
              animation:`pulse 1s ${i*0.18}s ease-in-out infinite` }}/>
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.1)}}`}</style>
      </div>
    )
  }

  if (initError) {
    return (
      <div style={S.fullCenter}>
        <p style={{ color:'#555', fontSize:14, marginBottom:16 }}>{initError}</p>
        <button onClick={() => { didInit.current=false; setInitError(null); setLoading(true); setAuthReady(!!(useAuthStore.getState().user && useAuthStore.getState().accessToken)) }}
          style={{ padding:'8px 20px', borderRadius:10, background:'#1d4ed8', border:'none', color:'#fff', cursor:'pointer', fontSize:14 }}>
          Retry
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar       { width:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1a1a1a; border-radius:4px; }
        @keyframes msgIn        { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer      { to{background-position:-200% 0} }
        @keyframes typingBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }
        .msg-row:hover .msg-actions { opacity:1!important; pointer-events:auto!important; }
        .chat-ta:focus { outline:none; border-width:1px; border-style:solid; border-color:#1e3a8a!important; box-shadow:0 0 0 3px rgba(29,78,216,0.08); }
        .ib-hover:hover { background:#111!important; color:#888!important; }
        .send-btn:hover:not(:disabled) { filter:brightness(1.15); transform:scale(1.04); }
        .mi:hover { background:#111!important; }
        .sh:hover { background:#0c0c0c!important; }
        .qp-item:hover { transform:scale(1.3); }
        .emoji-btn:hover { transform:scale(1.2); }
        .act-btn:hover { color:#aaa!important; background:#111!important; }
        .msg-row-sel { background:rgba(29,78,216,0.06)!important; border-radius:8px; }
      `}</style>

      {/* Code share modal */}
      {showCodeModal && <CodeModal onSend={sendCode} onClose={() => setShowCodeModal(false)}/>}

      {/* Delete confirmation modal */}
      {showDelModal && (
        <DeleteModal
          count={selected.size}
          onDeleteForMe={deleteForMe}
          onDeleteForAll={deleteForAll}
          onClose={() => setShowDelModal(false)}
        />
      )}

      <div style={S.root}>

        {/* ══════════════════════════════
            HEADER
        ══════════════════════════════ */}
        <header style={S.header}>
          {/* Multi-select mode header */}
          {selectMode ? (
            <>
              <button style={S.closeBtn} onClick={exitSelectMode}><X size={16}/></button>
              <span style={{ flex:1, fontSize:15, fontWeight:600, color:'#e4e4e7' }}>
                {selected.size} selected
              </span>
              {selected.size>0 && (
                <button
                  onClick={() => setShowDelModal(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                    borderRadius:9, background:'#1c0a0a',
                    borderWidth:1, borderStyle:'solid', borderColor:'#3a1010',
                    color:'#ef4444', cursor:'pointer', fontSize:13 }}>
                  <Trash2 size={14}/> Delete
                </button>
              )}
            </>
          ) : (
            <>
              <IconBtn onClick={() => router.back()} label="Back">
                <ArrowLeft size={16}/>
              </IconBtn>

              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ ...S.avatar, background:`linear-gradient(135deg,${c1},${c2})` }}>
                  {avatarInit}
                </div>
                {online && <span style={S.onlineDot}/>}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <p style={S.headerName}>{otherUser?.username ?? '…'}</p>
                <p style={{ fontSize:12, marginTop:1, color:online ? '#22c55e':'#383838' }}>
                  {online ? '● Online' : (otherUser?.tier ?? 'Offline')}
                </p>
              </div>

              <div style={{ display:'flex', gap:6, position:'relative' }}>
                <IconBtn onClick={() => toast('Calling '+(otherUser?.username??''), { icon:'📞' })} label="Call">
                  <Phone size={14}/>
                </IconBtn>

                <IconBtn onClick={() => setShowSearch(v=>!v)} label="Search" active={showSearch}>
                  <Search size={14}/>
                </IconBtn>

                {/* Multi-select toggle */}
                <IconBtn onClick={() => setSelectMode(true)} label="Select messages">
                  <CheckSquare size={14}/>
                </IconBtn>

                <div style={{ position:'relative' }}>
                  <IconBtn onClick={() => setShowMore(v=>!v)} label="More" active={showMore}>
                    <MoreVertical size={14}/>
                  </IconBtn>
                  {showMore && (
                    <MoreMenu onClose={() => setShowMore(false)} username={otherUser?.username??''} onClear={clearChat}/>
                  )}
                </div>
              </div>
            </>
          )}
        </header>

        {/* Pinned */}
        {!selectMode && pinnedMsgs.length>0 && <PinnedBanner pinned={pinnedMsgs} onJump={jumpTo}/>}

        {/* Search */}
        {showSearch && <SearchOverlay messages={messages} onClose={() => setShowSearch(false)} onJump={jumpTo}/>}

        {/* ══════════════════════════════
            MESSAGES
        ══════════════════════════════ */}
        <main ref={listRef} style={S.messages} role="log" aria-live="polite">
          {!messages.length && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
              <span style={{ fontSize:40 }}>👋</span>
              <p style={{ color:'#2a2a2a', fontSize:14 }}>No messages yet — say hello!</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const mine     = msg.senderId === me?.id
            const showDate = newDay(messages, idx)
            const lastGrp  = lastInGroup(messages, idx)
            const firstGrp = idx===0 || messages[idx-1].senderId!==msg.senderId
            const isSel    = selected.has(msg.id)
            const { isCode, lang, code } = parseContent(msg)

            return (
              <div
                key={msg.id}
                ref={el => { msgRefs.current[msg.id]=el }}
                className={isSel ? 'msg-row-sel' : ''}
                style={{ marginTop:firstGrp&&idx!==0 ? 10:2, transition:'background 0.3s',
                  cursor: selectMode ? 'pointer':'default', padding:'0 4px' }}
                onClick={() => { if (selectMode) toggleSelect(msg.id) }}
                onMouseDown={(e) => {
                  if (selectMode) return
                  const id = msg.id
                  const t = window.setTimeout(() => { setSelectMode(true); setSelected(new Set([id])) }, 600)
                  const cancel = () => window.clearTimeout(t)
                  window.addEventListener('mouseup',   cancel, { once: true })
                  window.addEventListener('mousemove', cancel, { once: true })
                }}
                onTouchStart={(e) => {
                  if (selectMode) return
                  const id = msg.id
                  const t = window.setTimeout(() => { setSelectMode(true); setSelected(new Set([id])) }, 600)
                  const cancel = () => window.clearTimeout(t)
                  window.addEventListener('touchend',  cancel, { once: true })
                  window.addEventListener('touchmove', cancel, { once: true })
                }}
              >
                {showDate && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, margin:'14px 0 8px' }}>
                    <div style={{ flex:1, height:1, background:'#0f0f0f' }}/>
                    <span style={{ fontSize:11, color:'#2a2a2a', letterSpacing:0.5 }}>{fmtDate(msg.createdAt)}</span>
                    <div style={{ flex:1, height:1, background:'#0f0f0f' }}/>
                  </div>
                )}

                <div className={selectMode ? '' : 'msg-row'}
                  style={{ display:'flex', alignItems:'flex-end', gap:6,
                    animation: selectMode ? 'none':'msgIn 0.2s ease',
                    justifyContent: mine ? 'flex-end':'flex-start' }}>

                  {/* Select checkbox */}
                  {selectMode && (
                    <div style={{ flexShrink:0, color: isSel ? '#3b82f6':'#333' }}>
                      {isSel ? <CheckSquare size={18}/> : <Square size={18}/>}
                    </div>
                  )}

                  {/* Their avatar */}
                  {!mine && !selectMode && (
                    lastGrp
                      ? <div style={{ ...S.msgAv, background:`linear-gradient(135deg,${c1},${c2})` }}>{avatarInit}</div>
                      : <div style={{ width:28, flexShrink:0 }}/>
                  )}

                  {/* Bubble column */}
                  <div style={{ maxWidth:'72%', display:'flex', flexDirection:'column', alignItems:mine?'flex-end':'flex-start' }}>
                    <div style={{
                      ...S.bubble,
                      ...(mine ? S.bubbleMine : S.bubbleTheirs),
                      borderBottomRightRadius: mine ? 4:18,
                      borderBottomLeftRadius : mine ? 18:4,
                      ...(isSel ? { borderColor:'#1d4ed8' } : {}),
                    }}>
                      {msg.replyTo && <InBubbleReply r={msg.replyTo}/>}

                      {/* Code block */}
                      {isCode
                        ? <CodeBlock code={code} lang={lang} mine={mine}/>
                        : (
                          <>
                            {msg.fileType==='image' && msg.fileUrl && (
                              <img src={msg.fileUrl} alt="" style={{ maxWidth:220, borderRadius:10, display:'block', marginBottom:6, objectFit:'cover' }} loading="lazy"/>
                            )}
                            {msg.fileType==='file' && msg.fileUrl && (
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background:'#111', color:'#6b7280', fontSize:12, textDecoration:'none', marginBottom:6 }}>
                                📎 {msg.fileName ?? 'File'}
                              </a>
                            )}
                            {msg.content && <p style={{ fontSize:14, lineHeight:1.55 }}>{msg.content}</p>}
                          </>
                        )
                      }

                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4, marginTop:4, fontSize:10, opacity:0.45 }}>
                        <span>{fmtTime(msg.createdAt)}</span>
                        {mine && (msg.seen
                          ? <CheckCheck size={11} style={{ color:'#3b82f6' }}/>
                          : <Check      size={11} style={{ color:'#333'    }}/>
                        )}
                      </div>
                    </div>

                    {!selectMode && (
                      <ReactionBar msgId={msg.id} myId={me?.id??''} reactions={msg.reactions??{}} onReact={reactToMessage}/>
                    )}
                  </div>

                  {/* Hover action buttons (reply + pin) */}
                  {!selectMode && (
                    <div className="msg-actions" style={{
                      display:'flex', flexDirection:'column', gap:3,
                      opacity:0, transition:'opacity 0.15s', pointerEvents:'none',
                      ...(mine ? { order:-1, marginRight:6, marginLeft:0 }:{ marginLeft:6 }),
                    }}>
                      <button className="act-btn" style={S.actBtn} title="Reply"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReplyTo({ id: msg.id, content: msg.content, senderName: mine ? 'You' : (otherUser?.username ?? '') })
                          setShowEmoji(false)
                          textareaRef.current?.focus()
                        }}>
                        <Reply size={12}/>
                      </button>
                      <button className="act-btn" style={{ ...S.actBtn, color:msg.pinned?'#facc15':'#333' }}
                        title={msg.pinned?'Unpin':'Pin'}
                        onClick={(e) => { e.stopPropagation(); togglePin(msg) }}>
                        {msg.pinned ? <PinOff size={12}/> : <Pin size={12}/>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isTyping && <TypingIndicator name={otherUser?.username??''}/>}
          <div ref={bottomRef}/>
        </main>

        {/* Scroll FAB */}
        {showScrollBtn && (
          <button style={S.scrollFab} onClick={() => bottomRef.current?.scrollIntoView({ behavior:'smooth' })}>
            <ChevronDown size={16}/>
          </button>
        )}

        {/* ══════════════════════════════
            FOOTER (hidden in select mode)
        ══════════════════════════════ */}
        {!selectMode && (
          <footer style={S.footer}>
            {showEmoji && <EmojiPanel onSelect={e => { setInput(v=>v+e); textareaRef.current?.focus() }}/>}
            <ReplyStrip reply={replyTo ?? undefined} onCancel={() => { setReplyTo(null); textareaRef.current?.focus() }}/>

            <div style={{ display:'flex', alignItems:'flex-end', gap:8, padding:'8px 10px 10px' }}>
              {/* Emoji */}
              <button style={{ ...S.iconBtn2, color:showEmoji?'#3b82f6':'#444' }}
                onClick={() => setShowEmoji(v=>!v)} aria-label="Emoji">
                <Smile size={18}/>
              </button>

              {/* Code share */}
              <button style={S.iconBtn2} onClick={() => setShowCodeModal(true)} aria-label="Share code">
                <Code2 size={18}/>
              </button>

              {/* Camera capture */}
              <button
                style={S.iconBtn2}
                aria-label="Take photo"
                onClick={() => camInputRef.current?.click()}
                title="Take photo"
              >
                <Camera size={17}/>
              </button>

              {/* Gallery / image picker */}
              <button
                style={S.iconBtn2}
                aria-label="Send image"
                onClick={() => imgInputRef.current?.click()}
                title="Send image"
              >
                <ImageIcon size={17}/>
              </button>

              {/* Any file */}
              <button
                style={S.iconBtn2}
                aria-label="Attach file"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip size={17}/>
              </button>

              {/* Hidden inputs — separate refs so accept never conflicts */}
              <input
                ref={camInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleCameraInput}
              />
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={handleImageInput}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                hidden
                onChange={handleFileInput}
              />

              {/* Upload progress indicator */}
              {uploading && (
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#3b82f6', flexShrink:0 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', animation:'pulse 1s ease-in-out infinite' }}/>
                  Uploading…
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className="chat-ta"
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height='auto'
                  e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'
                  emitTyping()
                }}
                onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Message…"
                rows={1}
                style={S.textarea}
              />

              {/* Send */}
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!input.trim()||sending}
                style={{ ...S.sendBtn, ...(!input.trim()||sending ? S.sendOff:{}) }}
              >
                <Send size={14}/>
              </button>
            </div>
          </footer>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const S = {
  fullCenter: { height:'100dvh', display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center', background:'#000', gap:12 },
  root: {
    display:'flex', flexDirection:'column' as const,
    height:'100dvh', background:'#000',
    color:'#d4d4d8', overflow:'hidden',
    fontFamily:"'SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
    position:'relative' as const,
  },
  header: {
    display:'flex', alignItems:'center', gap:12,
    padding:'10px 14px',
    background:'rgba(4,4,4,0.97)', backdropFilter:'blur(20px)',
    borderBottom:'1px solid #0f0f0f',
    flexShrink:0, zIndex:20,
  },
  avatar: { width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, color:'#fff' },
  onlineDot: { position:'absolute' as const, bottom:-1, right:-1, width:11, height:11, borderRadius:'50%', background:'#22c55e', border:'2px solid #000', boxShadow:'0 0 8px rgba(34,197,94,0.5)' },
  headerName: { fontSize:15, fontWeight:600, color:'#e4e4e7', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis' },

  iconBtn2: { width:34, height:34, borderRadius:'50%', background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#444', flexShrink:0, transition:'color 0.15s' },

  moreMenu: { position:'absolute' as const, top:'110%', right:0, background:'#0a0a0a', borderWidth:1, borderStyle:'solid', borderColor:'#1a1a1a', borderRadius:12, padding:4, boxShadow:'0 8px 32px rgba(0,0,0,0.8)', zIndex:100, minWidth:170 },
  moreItem: { width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'transparent', border:'none', cursor:'pointer', color:'#888', borderRadius:8, transition:'background 0.15s' },

  pinnedBanner: { display:'flex', alignItems:'center', gap:8, padding:'6px 16px', background:'#060606', borderBottom:'1px solid #0f0f0f', cursor:'pointer', flexShrink:0 },
  searchOverlay: { position:'absolute' as const, inset:0, background:'rgba(0,0,0,0.97)', backdropFilter:'blur(20px)', zIndex:40, display:'flex', flexDirection:'column' as const },
  searchHit: { width:'100%', padding:'10px 16px', background:'transparent', border:'none', borderBottom:'1px solid #0d0d0d', cursor:'pointer', transition:'background 0.15s' },

  messages: { flex:1, overflowY:'auto' as const, padding:'14px 10px 8px', display:'flex', flexDirection:'column' as const },
  msgAv: { width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 },

  bubble: { padding:'9px 13px', borderRadius:18, wordBreak:'break-word' as const, transition:'background 0.4s' },
  bubbleMine:   { background:'#0c1628', borderWidth:1, borderStyle:'solid', borderColor:'#162040', color:'#c8d8f8', boxShadow:'0 2px 10px rgba(29,78,216,0.10)' },
  bubbleTheirs: { background:'#0c0c0c', borderWidth:1, borderStyle:'solid', borderColor:'#141414', color:'#b4b4b8' },

  actBtn: { width:26, height:26, borderRadius:7, borderWidth:1, borderStyle:'solid', borderColor:'#141414', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#333', transition:'all 0.15s' },

  reactionBar: { display:'flex', flexWrap:'wrap' as const, gap:4, marginTop:4, position:'relative' as const },
  addReactBtn: { width:22, height:22, borderRadius:6, borderWidth:1, borderStyle:'solid', borderColor:'#161616', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#444', transition:'all 0.15s' },
  quickPicker: { position:'absolute' as const, bottom:'110%', left:0, display:'flex', flexWrap:'wrap' as const, gap:3, padding:8, borderRadius:12, background:'#0c0c0c', borderWidth:1, borderStyle:'solid', borderColor:'#181818', boxShadow:'0 8px 32px rgba(0,0,0,0.7)', zIndex:50 },
  qpItem: { fontSize:17, background:'none', border:'none', cursor:'pointer', padding:3, borderRadius:6, transition:'transform 0.1s' },
  chip: { display:'flex', alignItems:'center', padding:'2px 6px', borderRadius:20, borderWidth:1, borderStyle:'solid', borderColor:'#181818', background:'#0c0c0c', cursor:'pointer', fontSize:13, color:'#ccc', transition:'all 0.15s' },
  chipMine: { borderColor:'#1e3a8a', background:'#0c1628' },

  inReply: { display:'flex', gap:8, padding:'5px 8px', borderRadius:8, background:'rgba(255,255,255,0.03)', marginBottom:6 },
  inReplyBar: { width:3, borderRadius:2, background:'#1d4ed8', flexShrink:0 },

  replyStrip: { display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#060606', borderTop:'1px solid #0f0f0f' },
  closeBtn: { background:'none', border:'none', cursor:'pointer', color:'#555', display:'flex' },

  typingRow:    { display:'flex', alignItems:'flex-end', gap:6, marginTop:6 },
  typingBubble: { display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderRadius:16, background:'#0c0c0c', borderWidth:1, borderStyle:'solid', borderColor:'#141414' },
  dot: { display:'inline-block', width:5, height:5, borderRadius:'50%', background:'#2a2a2a', animation:'typingBounce 1.2s ease-in-out infinite' },

  scrollFab: { position:'absolute' as const, bottom:88, right:14, width:34, height:34, borderRadius:'50%', background:'#0c0c0c', borderWidth:1, borderStyle:'solid', borderColor:'#1c1c1c', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#555', boxShadow:'0 4px 20px rgba(0,0,0,0.6)', zIndex:15, transition:'all 0.2s' },

  footer: { background:'rgba(3,3,3,0.97)', backdropFilter:'blur(20px)', borderTop:'1px solid #0c0c0c', flexShrink:0, zIndex:20 },
  textarea: { flex:1, background:'#080808', borderWidth:1, borderStyle:'solid', borderColor:'#161616', borderRadius:14, padding:'9px 13px', fontSize:14, lineHeight:1.5, color:'#d4d4d8', resize:'none' as const, outline:'none', fontFamily:'inherit', maxHeight:120, transition:'border-color 0.2s, box-shadow 0.2s' },
  sendBtn: { width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#1d4ed8,#4338ca)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', flexShrink:0, boxShadow:'0 4px 14px rgba(29,78,216,0.25)', transition:'all 0.15s' },
  sendOff: { background:'#0c0c0c', boxShadow:'none', cursor:'not-allowed', opacity:0.35 },
  emojiBtn: { fontSize:22, padding:'4px 6px', background:'none', border:'none', cursor:'pointer', borderRadius:8, transition:'transform 0.1s' },

  // Code block
  codeBlock: { borderRadius:10, overflow:'hidden', marginBottom:6, borderWidth:1, borderStyle:'solid' },
  codeHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:'rgba(0,0,0,0.4)' },
  codePre: { padding:'10px 12px', overflowX:'auto' as const, maxHeight:240, background:'rgba(0,0,0,0.3)', margin:0 },
  copyBtn: { background:'none', border:'none', cursor:'pointer', color:'#555', display:'flex', transition:'color 0.15s' },

  // Code modal
  modalBackdrop: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal: { background:'#0c0c0c', borderWidth:1, borderStyle:'solid', borderColor:'#1a1a1a', borderRadius:16, padding:20, width:'100%', maxWidth:500, boxShadow:'0 20px 60px rgba(0,0,0,0.8)' },
  codeTA: { width:'100%', minHeight:180, background:'#070707', borderWidth:1, borderStyle:'solid', borderColor:'#1a1a1a', borderRadius:10, padding:'10px 12px', fontSize:13, color:'#c8d8f8', fontFamily:"'Fira Code',monospace", resize:'vertical' as const, outline:'none', lineHeight:1.6 },
  cancelBtn: { padding:'8px 16px', borderRadius:9, background:'transparent', borderWidth:1, borderStyle:'solid', borderColor:'#1a1a1a', color:'#555', cursor:'pointer', fontSize:13 },
  primaryBtn: { padding:'8px 18px', borderRadius:9, background:'linear-gradient(135deg,#1d4ed8,#4338ca)', border:'none', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 },
  deleteForAllBtn: { padding:'11px', borderRadius:10, background:'#1c0a0a', borderWidth:1, borderStyle:'solid', borderColor:'#3a1010', color:'#ef4444', cursor:'pointer', fontSize:14, fontWeight:600, textAlign:'center' as const },
  deleteForMeBtn:  { padding:'11px', borderRadius:10, background:'#0c0c0c', borderWidth:1, borderStyle:'solid', borderColor:'#1a1a1a', color:'#888', cursor:'pointer', fontSize:13, textAlign:'center' as const },
} as const