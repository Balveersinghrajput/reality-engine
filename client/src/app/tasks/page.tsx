'use client'
import api from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    BookOpen,
    CheckCircle,
    ChevronRight,
    Clock,
    Flame,
    Play, Square,
    Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function TasksPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [activeTimer, setActiveTimer] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [reflection, setReflection] = useState('')
  const [showReflection, setShowReflection] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
  }, [])

  // Timer tick
  useEffect(() => {
    if (!activeTimer) return
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks')
      return res.data.data
    },
  })

  const { data: statsData } = useQuery({
    queryKey: ['task-stats'],
    queryFn: async () => {
      const res = await api.get('/tasks/stats')
      return res.data.data
    },
  })

  const { data: todayTask } = useQuery({
    queryKey: ['today-task'],
    queryFn: async () => {
      const res = await api.get('/tasks/today')
      return res.data.data
    },
  })

  const startTimer = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/tasks/${taskId}/timer/start`)
      return res.data
    },
    onSuccess: (_, taskId) => {
      setActiveTimer(taskId)
      setTimerSeconds(0)
      toast.success('Timer started!')
    },
    onError: () => toast.error('Failed to start timer'),
  })

  const stopTimer = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/tasks/${taskId}/timer/stop`)
      return res.data
    },
    onSuccess: () => {
      setActiveTimer(null)
      setTimerSeconds(0)
      toast.success('Timer stopped!')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/tasks/${taskId}/complete`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Task completed! 🎉')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowReflection(true)
    },
    onError: () => toast.error('Failed to complete task'),
  })

  const saveReflection = useMutation({
    mutationFn: async ({ taskId, reflection }: { taskId: string; reflection: string }) => {
      const res = await api.post(`/tasks/${taskId}/reflection`, { reflection })
      return res.data
    },
    onSuccess: () => {
      toast.success('Reflection saved!')
      setShowReflection(false)
      setReflection('')
      setSelectedTask(null)
    },
  })

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const tasks = tasksData?.tasks || []
  const stats = statsData

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    pending:     { color: '#555', bg: 'rgba(255,255,255,0.04)', label: 'Pending' },
    in_progress: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'In Progress' },
    completed:   { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Completed' },
  }

  const levelConfig: Record<string, string> = {
    beginner: '#22c55e',
    intermediate: '#3b82f6',
    advanced: '#a78bfa',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }

        body { background: #030303; color: #fff; font-family: 'Space Grotesk', sans-serif; -webkit-font-smoothing: antialiased; }

        .tk-root { min-height: 100vh; background: #030303; position: relative; }
        .tk-ambient { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 500px 400px at 80% 10%, rgba(34,197,94,0.05) 0%, transparent 70%); }
        .tk-content {
            position: relative; z-index: 1;
            max-width: 100%; margin: 0;
            padding: 36px 40px 80px;
          }
        .tk-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .tk-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #555; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .tk-back:hover { color: #fff; background: rgba(255,255,255,0.08); }

        /* STATS ROW */
        .tk-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .tk-stat { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 16px; padding: 18px; }
        .tk-stat-val { font-size: 28px; font-weight: 900; color: #fff; line-height: 1; margin-bottom: 4px; }
        .tk-stat-lbl { font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; }
        .tk-stat-bar { height: 2px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; margin-top: 10px; }
        .tk-stat-fill { height: 100%; border-radius: 99px; transition: width 1s ease; }

        /* TODAY TASK */
        .tk-today { background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: 20px; padding: 22px 24px; margin-bottom: 24px; position: relative; overflow: hidden; }
        .tk-today-glow { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent); }
        .tk-today-label { font-size: 10px; font-weight: 700; color: '#3b82f6'; font-family: 'JetBrains Mono', monospace; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
        .tk-today-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .tk-today-desc { font-size: 13px; color: #555; line-height: 1.6; }

        /* TASK LIST */
        .tk-list { display: flex; flex-direction: column; gap: 10px; }

        .tk-task {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 18px; padding: 20px 22px;
          transition: all 0.25s ease; cursor: pointer;
          position: relative; overflow: hidden;
        }
        .tk-task:hover { background: rgba(255,255,255,0.04); transform: translateX(3px); }
        .tk-task.active { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
        .tk-task.completed { opacity: 0.6; }

        .tk-task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .tk-task-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
        .tk-task-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; font-family: 'JetBrains Mono', monospace; }
        .tk-task-title { font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 6px; }
        .tk-task-desc { font-size: 12px; color: #444; line-height: 1.6; }

        .tk-task-actions { display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }

        .tk-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif; }
        .tk-btn-primary { background: #3b82f6; color: #fff; }
        .tk-btn-primary:hover { background: #2563eb; }
        .tk-btn-success { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .tk-btn-success:hover { background: rgba(34,197,94,0.25); }
        .tk-btn-danger { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
        .tk-btn-danger:hover { background: rgba(239,68,68,0.2); }
        .tk-btn-ghost { background: rgba(255,255,255,0.04); color: #666; border: 1px solid rgba(255,255,255,0.08); }
        .tk-btn-ghost:hover { background: rgba(255,255,255,0.08); color: #aaa; }

        /* TIMER DISPLAY */
        .tk-timer { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 8px; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.25); }
        .tk-timer-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; animation: pulse 1s ease-in-out infinite; }
        .tk-timer-text { font-size: 13px; font-weight: 700; color: #3b82f6; font-family: 'JetBrains Mono', monospace; }

        /* REFLECTION MODAL */
        .tk-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .tk-modal { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; width: 100%; max-width: 480px; }

        /* EMPTY */
        .tk-empty { text-align: center; padding: 60px 20px; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .tk-content { padding: 24px 16px 80px; }
          .tk-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .tk-content { padding: 16px 12px 80px; }
          .tk-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .tk-stat { padding: 14px; }
          .tk-stat-val { font-size: 22px; }
          .tk-task { padding: 16px; }
        }
      `}</style>

      <div className="tk-root">
        <div className="tk-ambient" />

        <div
          className="tk-content"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
        >

          {/* HEADER */}
          <div className="tk-header">
            <button className="tk-back" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={17} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>My Tasks</h1>
              <p style={{ fontSize: '11px', color: '#333', marginTop: '3px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Daily Learning Tasks</p>
            </div>
          </div>

          {/* STATS */}
          {stats && (
            <div className="tk-stats">
              {[
                { label: 'Total', value: stats.total || 0, color: '#3b82f6', progress: 100 },
                { label: 'Completed', value: stats.completed || 0, color: '#22c55e', progress: stats.total ? (stats.completed / stats.total) * 100 : 0 },
                { label: 'In Progress', value: stats.inProgress || 0, color: '#f97316', progress: stats.total ? (stats.inProgress / stats.total) * 100 : 0 },
                { label: 'Completion %', value: `${Math.round(stats.completionRate || 0)}%`, color: '#a78bfa', progress: stats.completionRate || 0 },
              ].map((item, i) => (
                <div key={i} className="tk-stat">
                  <div className="tk-stat-val" style={{ color: item.color }}>{item.value}</div>
                  <div className="tk-stat-lbl">{item.label}</div>
                  <div className="tk-stat-bar">
                    <div className="tk-stat-fill" style={{ width: `${item.progress}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TODAY'S TASK */}
          {todayTask && (
            <div className="tk-today">
              <div className="tk-today-glow" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Flame size={13} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  Today's Focus
                </span>
              </div>
              <div className="tk-today-title">{todayTask.title}</div>
              <div className="tk-today-desc">{todayTask.description}</div>
            </div>
          )}

          {/* TASK LIST */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ position: 'relative', width: 36, height: 36 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.15)' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#22c55e', animation: 'spin 0.8s linear infinite' }} />
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="tk-empty">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ fontSize: '15px', color: '#444', marginBottom: '8px' }}>No tasks yet</p>
              <p style={{ fontSize: '12px', color: '#2a2a2a', fontFamily: 'JetBrains Mono, monospace' }}>AI will generate tasks for you</p>
            </div>
          ) : (
            <div className="tk-list">
              {/* Section labels */}
              {['in_progress', 'pending', 'completed'].map(status => {
                const filtered = tasks.filter((t: any) => t.status === status)
                if (filtered.length === 0) return null
                const sectionLabel = status === 'in_progress' ? '⚡ In Progress' : status === 'pending' ? '📋 Pending' : '✅ Completed'

                return (
                  <div key={status}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#2a2a2a', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px', marginTop: '8px' }}>
                      {sectionLabel}
                    </div>

                    {filtered.map((task: any) => {
                      const sc = statusConfig[task.status] || statusConfig.pending
                      const lc = levelConfig[task.level] || '#555'
                      const isActive = activeTimer === task.id
                      const isCompleted = task.status === 'completed'

                      return (
                        <div
                          key={task.id}
                          className={`tk-task ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                          onClick={() => !isCompleted && setSelectedTask(selectedTask?.id === task.id ? null : task)}
                        >
                          {/* Top line glow for active */}
                          {isActive && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)' }} />
                          )}

                          <div className="tk-task-top">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="tk-task-meta">
                                <span className="tk-task-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                                  {sc.label}
                                </span>
                                <span className="tk-task-badge" style={{ background: `${lc}12`, color: lc, border: `1px solid ${lc}25` }}>
                                  {task.level}
                                </span>
                                {task.estimatedTime && (
                                  <span style={{ fontSize: '11px', color: '#333', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={10} style={{ color: '#333' }} />
                                    {task.estimatedTime}m
                                  </span>
                                )}
                              </div>
                              <div className="tk-task-title">{task.title}</div>
                              <div className="tk-task-desc">{task.description?.substring(0, 100)}{task.description?.length > 100 ? '...' : ''}</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                              {isCompleted ? (
                                <CheckCircle size={20} style={{ color: '#22c55e' }} />
                              ) : (
                                <ChevronRight size={16} style={{ color: '#333', transform: selectedTask?.id === task.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                              )}
                            </div>
                          </div>

                          {/* Expanded actions */}
                          {selectedTask?.id === task.id && !isCompleted && (
                            <div onClick={e => e.stopPropagation()}>
                              {/* Full description */}
                              {task.description?.length > 100 && (
                                <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                  {task.description}
                                </div>
                              )}

                              <div className="tk-task-actions">
                                {/* Timer */}
                                {isActive ? (
                                  <>
                                    <div className="tk-timer">
                                      <div className="tk-timer-dot" />
                                      <span className="tk-timer-text">{formatTimer(timerSeconds)}</span>
                                    </div>
                                    <button
                                      className="tk-btn tk-btn-danger"
                                      onClick={() => stopTimer.mutate(task.id)}
                                    >
                                      <Square size={12} />
                                      Stop Timer
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="tk-btn tk-btn-ghost"
                                    onClick={() => startTimer.mutate(task.id)}
                                    disabled={!!activeTimer}
                                  >
                                    <Play size={12} />
                                    Start Timer
                                  </button>
                                )}

                                {/* Complete */}
                                {task.status !== 'pending' && (
                                  <button
                                    className="tk-btn tk-btn-success"
                                    onClick={() => {
                                      setSelectedTask(task)
                                      completeTask.mutate(task.id)
                                    }}
                                    disabled={completeTask.isPending}
                                  >
                                    <CheckCircle size={12} />
                                    Mark Complete
                                  </button>
                                )}

                                {task.status === 'pending' && (
                                  <button
                                    className="tk-btn tk-btn-primary"
                                    onClick={() => startTimer.mutate(task.id)}
                                    disabled={!!activeTimer}
                                  >
                                    <Zap size={12} />
                                    Start Task
                                  </button>
                                )}
                              </div>

                              {/* XP info */}
                              {task.xpReward && (
                                <div style={{ marginTop: '10px', fontSize: '11px', color: '#2a2a2a', fontFamily: 'JetBrains Mono, monospace' }}>
                                  Reward: +{task.xpReward} XP on completion
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* REFLECTION MODAL */}
      {showReflection && selectedTask && (
        <div className="tk-modal-overlay" onClick={() => setShowReflection(false)}>
          <div className="tk-modal" onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <BookOpen size={18} style={{ color: '#22c55e' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>Task Reflection</h3>
              </div>
              <p style={{ fontSize: '12px', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>
                What did you learn from this task?
              </p>
            </div>

            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="Write what you learned, challenges faced, and key takeaways..."
              rows={5}
              style={{
                width: '100%', background: '#0f0f0f', border: '1px solid #1a1a1a',
                borderRadius: '12px', padding: '14px 16px', color: '#fff',
                fontSize: '13px', outline: 'none', resize: 'none', lineHeight: 1.7,
                fontFamily: 'Space Grotesk, sans-serif',
              }}
              onFocus={e => e.target.style.borderColor = '#22c55e50'}
              onBlur={e => e.target.style.borderColor = '#1a1a1a'}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => saveReflection.mutate({ taskId: selectedTask.id, reflection })}
                disabled={!reflection.trim() || saveReflection.isPending}
                style={{
                  flex: 1, background: '#22c55e', color: '#000', fontWeight: 800,
                  padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', opacity: !reflection.trim() ? 0.5 : 1,
                }}
              >
                Save Reflection
              </button>
              <button
                onClick={() => { setShowReflection(false); setReflection('') }}
                style={{
                  padding: '12px 20px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                  color: '#555', cursor: 'pointer', fontSize: '13px',
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}