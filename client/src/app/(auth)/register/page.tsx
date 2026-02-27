'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

const TRACKS = ['webdev', 'cloud', 'cyber', 'ai', 'devops', 'fullstack', 'system_design', 'robotics']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const MODES = ['normal', 'competitive', 'harsh']

type Step = 'form' | 'otp'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f0f0f',
  border: '1px solid #1a1a1a',
  borderRadius: '10px',
  padding: '12px 16px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#555',
  fontSize: '12px',
  marginBottom: '6px',
  fontWeight: 600,
  letterSpacing: '0.5px',
}

export default function RegisterPage() {
  const router = useRouter()
  const { setToken, setUser } = useAuthStore()

  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    targetTrack: 'webdev', level: 'beginner', mode: 'competitive',
  })

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const passwordMismatch = !!form.confirmPassword && form.confirmPassword !== form.password

  function startResendTimer() {
    setResendTimer(30)
    const tick = () => {
      setResendTimer(t => {
        if (t <= 1) return 0
        timerRef.current = setTimeout(tick, 1000)
        return t - 1
      })
    }
    timerRef.current = setTimeout(tick, 1000)
  }

  // ── Submit Form → Send OTP ──
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      // Send OTP first to verify email before creating account
      await api.post('/auth/send-otp', { email: form.email })
      setStep('otp')
      startResendTimer()
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
      toast.success('OTP sent! Check your email.')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP → Register ──
  async function handleVerifyAndRegister(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      // Verify OTP then register with all form data
      const res = await api.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
        targetTrack: form.targetTrack,
        level: form.level,
        mode: form.mode,
        otp: code,
      })
      const { accessToken, refreshToken, user } = res.data.data
      setToken(accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setUser(user)
      toast.success('Welcome to Reality Engine!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP or registration failed')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await api.post('/auth/send-otp', { email: form.email })
      setOtp(['', '', '', '', '', ''])
      startResendTimer()
      otpRefs.current[0]?.focus()
      toast.success('New OTP sent!')
    } catch {
      toast.error('Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
  }
  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }
  function handleOtpPaste(e: React.ClipboardEvent) {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length) {
      const next = [...paste.split(''), ...Array(6).fill('')].slice(0, 6)
      setOtp(next)
      otpRefs.current[Math.min(paste.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  const SubmitBtn = ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => (
    <button type="submit" disabled={disabled || loading}
      style={{
        width: '100%', background: '#3b82f6', color: '#fff', fontWeight: 700,
        padding: '13px', borderRadius: '10px', fontSize: '14px', border: 'none',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.7 : 1, transition: 'all 0.2s',
      }}
      onMouseEnter={e => { if (!loading && !disabled) (e.currentTarget as HTMLElement).style.background = '#2563eb' }}
      onMouseLeave={e => { if (!loading && !disabled) (e.currentTarget as HTMLElement).style.background = '#3b82f6' }}
    >{children}</button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
            Reality<span style={{ color: '#3b82f6' }}>Engine</span>
          </h1>
          <p style={{ color: '#444', marginTop: '6px', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Start your journey
          </p>
        </div>

        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '36px' }}>

          {/* ── STEP 1: Registration Form ── */}
          {step === 'form' && (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '24px' }}>Create account</h2>
              <form onSubmit={handleFormSubmit}>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>USERNAME</label>
                  <input required value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    placeholder="balveer" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#1a1a1a'}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>EMAIL</label>
                  <input type="email" required value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#1a1a1a'}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} required value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: '44px' }}
                      onFocus={e => e.target.style.borderColor = '#3b82f6'}
                      onBlur={e => e.target.style.borderColor = '#1a1a1a'}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '12px' }}>
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>CONFIRM PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: '44px', borderColor: passwordMismatch ? '#ef4444' : '#1a1a1a' }}
                      onFocus={e => e.target.style.borderColor = passwordMismatch ? '#ef4444' : '#3b82f6'}
                      onBlur={e => e.target.style.borderColor = passwordMismatch ? '#ef4444' : '#1a1a1a'}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '12px' }}>
                      {showConfirm ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                  {passwordMismatch && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>Passwords do not match</p>
                  )}
                </div>

                {/* Track / Level / Mode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                  {[
                    { label: 'TRACK', key: 'targetTrack', options: TRACKS },
                    { label: 'LEVEL', key: 'level', options: LEVELS },
                    { label: 'MODE', key: 'mode', options: MODES },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={labelStyle}>{field.label}</label>
                      <select
                        value={form[field.key as keyof typeof form]}
                        onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                        style={{ width: '100%', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 8px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      >
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <SubmitBtn disabled={passwordMismatch}>
                  {loading ? 'Sending OTP...' : 'Continue →'}
                </SubmitBtn>
              </form>
            </>
          )}

          {/* ── STEP 2: Verify OTP ── */}
          {step === 'otp' && (
            <>
              <button type="button" onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']) }}
                style={{ background: 'none', border: 'none', color: '#555', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>
                ← Back
              </button>

              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Verify your email</h2>
              <p style={{ color: '#444', fontSize: '13px', marginBottom: '4px' }}>6-digit code sent to</p>
              <p style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600, marginBottom: '28px' }}>{form.email}</p>

              <form onSubmit={handleVerifyAndRegister}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el }}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit} placeholder="·"
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      style={{ width: '100%', aspectRatio: '1', textAlign: 'center', fontSize: '22px', fontWeight: 600, background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '10px', color: '#fff', outline: 'none', caretColor: '#3b82f6', transition: 'border-color 0.15s' }}
                      onFocus={e => e.target.style.borderColor = '#3b82f6'}
                      onBlur={e => e.target.style.borderColor = digit ? '#2563eb' : '#1a1a1a'}
                    />
                  ))}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <SubmitBtn>{loading ? 'Creating account...' : 'Verify & Create Account'}</SubmitBtn>
                </div>
              </form>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#444' }}>
                Didn't get it?{' '}
                <button type="button" onClick={handleResend} disabled={resendTimer > 0 || loading}
                  style={{ background: 'none', border: 'none', color: resendTimer > 0 ? '#333' : '#3b82f6', fontSize: '13px', cursor: resendTimer > 0 ? 'default' : 'pointer', padding: 0 }}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </p>
            </>
          )}

          <p style={{ textAlign: 'center', color: '#444', marginTop: '24px', fontSize: '13px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#3b82f6' }}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}