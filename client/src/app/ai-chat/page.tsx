'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Send, Bot, User, Zap, Code, MessageSquare } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type ContextType = 'chat' | 'code_review'

export default function AIChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextType, setContextType] = useState<ContextType>('chat')
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    setMessages([{
      role: 'assistant',
      content: "Hey! I'm your AI mentor. I can help you with tech concepts, review your code, and guide your learning journey. What do you want to work on?",
      timestamp: new Date(),
    }])
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/ai/chat', {
        message: userMsg.content,
        contextType,
      })

      const aiMsg: Message = {
        role: 'assistant',
        content: res.data.data.response,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble responding. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const suggestions = [
    'What should I learn next in web development?',
    'Explain async/await in JavaScript',
    'Review this code: function sum(a,b){ return a+b }',
    'How do I improve my performance score?',
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(10px)',
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#fff'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#666'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
          }}
        >
          <ArrowLeft size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>AI Mentor</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '11px', color: '#444' }}>Online · Powered by Groq</span>
            </div>
          </div>
        </div>

        {/* Context Toggle */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '4px',
        }}>
          {([
            { id: 'chat', icon: <MessageSquare size={13} />, label: 'Chat' },
            { id: 'code_review', icon: <Code size={13} />, label: 'Code' },
          ] as { id: ContextType; icon: any; label: string }[]).map(ctx => (
            <button
              key={ctx.id}
              onClick={() => setContextType(ctx.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s',
                background: contextType === ctx.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: contextType === ctx.id ? '#3b82f6' : '#555',
              }}
            >
              {ctx.icon}
              {ctx.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}>

        {/* Suggestions (show when only 1 message) */}
        {messages.length === 1 && (
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', color: '#333', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Suggestions
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#666',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = '#aaa'
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.2)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = '#666'
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages list */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '12px',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: msg.role === 'assistant'
                ? 'rgba(59,130,246,0.15)'
                : 'rgba(139,92,246,0.15)',
              border: msg.role === 'assistant'
                ? '1px solid rgba(59,130,246,0.25)'
                : '1px solid rgba(139,92,246,0.25)',
            }}>
              {msg.role === 'assistant'
                ? <Bot size={15} style={{ color: '#3b82f6' }} />
                : <User size={15} style={{ color: '#8b5cf6' }} />
              }
            </div>

            {/* Bubble */}
            <div style={{ maxWidth: '75%' }}>
              <div style={{
                background: msg.role === 'assistant'
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(59,130,246,0.12)',
                border: msg.role === 'assistant'
                  ? '1px solid rgba(255,255,255,0.06)'
                  : '1px solid rgba(59,130,246,0.25)',
                borderRadius: msg.role === 'assistant'
                  ? '4px 16px 16px 16px'
                  : '16px 4px 16px 16px',
                padding: '12px 16px',
                color: '#ddd',
                fontSize: '14px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
              <p style={{
                fontSize: '10px',
                color: '#333',
                marginTop: '4px',
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.25)',
            }}>
              <Bot size={15} style={{ color: '#3b82f6' }} />
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px 16px 16px 16px',
              padding: '14px 18px',
              display: 'flex',
              gap: '5px',
              alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 24px',
        position: 'sticky',
        bottom: 0,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}>
          {contextType === 'code_review' && (
            <div style={{
              position: 'absolute',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              color: '#3b82f6',
              whiteSpace: 'nowrap',
            }}>
              💡 Code Review mode — paste your code for AI analysis
            </div>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={contextType === 'code_review'
              ? 'Paste your code here for review...'
              : 'Ask your AI mentor anything...'
            }
            rows={1}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              maxHeight: '120px',
              overflowY: 'auto',
              transition: 'border-color 0.2s',
              fontFamily: contextType === 'code_review' ? 'monospace' : 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: input.trim() && !loading ? '#3b82f6' : 'rgba(255,255,255,0.05)',
              border: 'none',
              color: input.trim() && !loading ? '#fff' : '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              if (input.trim() && !loading)
                (e.currentTarget as HTMLElement).style.background = '#2563eb'
            }}
            onMouseLeave={e => {
              if (input.trim() && !loading)
                (e.currentTarget as HTMLElement).style.background = '#3b82f6'
            }}
          >
            <Send size={16} />
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '10px', color: '#222', marginTop: '8px', maxWidth: '800px', margin: '8px auto 0' }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
