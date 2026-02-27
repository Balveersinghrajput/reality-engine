'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

type Step = 'login' | 'forgot_email' | 'forgot_otp' | 'new_password'

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

export default function LoginPage() {
  const router = useRouter()
  const { setToken, setUser } = useAuthStore()

  const [step, setStep] = useState<Step>('login')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  // Forgot password flow
  const [forgotEmail, setForgotEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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

  // ── Normal Login ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login', loginForm)
      const { accessToken, refreshToken, user } = res.data.data
      setToken(accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setUser(user)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Send OTP ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail })
      setStep('forgot_otp')
      startResendTimer()
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
      toast.success('OTP sent to your email!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Email not found')
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP ──
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { email: forgotEmail, otp: code })
      setStep('new_password')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ── Reset Password ──
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      // ✅ otp removed — already verified in previous step
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        newPassword,
      })
      toast.success('Password updated! Please login.')
      setStep('login')
      setForgotEmail('')
      setOtp(['', '', '', '', '', ''])
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail })
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

  const Btn = ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => (
    <button
      type="submit"
      disabled={disabled || loading}
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

  const BackBtn = ({ to, label = '← Back' }: { to: Step; label?: string }) => (
    <button
      type="button"
      onClick={() => setStep(to)}
      style={{ background: 'none', border: 'none', color: '#555', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}
    >{label}</button>
  )

  const passwordMismatch = !!confirmPassword && confirmPassword !== newPassword

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
            Reality<span style={{ color: '#3b82f6' }}>Engine</span>
          </h1>
          <p style={{ color: '#444', marginTop: '6px', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Competitive Tech Learning
          </p>
        </div>

        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '36px' }}>

          {/* ── LOGIN ── */}
          {step === 'login' && (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '24px' }}>Welcome back</h2>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>EMAIL</label>
                  <input
                    type="email" required value={loginForm.email}
                    onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="you@example.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#1a1a1a'}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={labelStyle}>PASSWORD</label>
                  <input
                    type="password" required value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="••••••••" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#1a1a1a'}
                  />
                </div>

                <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={() => { setStep('forgot_email'); setForgotEmail(loginForm.email) }}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>

                <Btn>{loading ? 'Logging in...' : 'Login'}</Btn>
              </form>
            </>
          )}

          {/* ── FORGOT — Enter Email ── */}
          {step === 'forgot_email' && (
            <>
              <BackBtn to="login" label="← Back to login" />
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Reset password</h2>
              <p style={{ color: '#444', fontSize: '13px', marginBottom: '24px' }}>
                Enter your registered email to receive a verification code.
              </p>
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>EMAIL</label>
                  <input
                    type="email" required value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@example.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#1a1a1a'}
                  />
                </div>
                <Btn>{loading ? 'Sending OTP...' : 'Send OTP →'}</Btn>
              </form>
            </>
          )}

          {/* ── FORGOT — Verify OTP ── */}
          {step === 'forgot_otp' && (
            <>
              <BackBtn to="forgot_email" />
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Check your inbox</h2>
              <p style={{ color: '#444', fontSize: '13px', marginBottom: '4px' }}>6-digit code sent to</p>
              <p style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600, marginBottom: '28px' }}>{forgotEmail}</p>

              <form onSubmit={handleVerifyOtp}>
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
                  <Btn>{loading ? 'Verifying...' : 'Verify OTP →'}</Btn>
                </div>
              </form>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#444' }}>
                Didn't get it?{' '}
                <button onClick={handleResend} disabled={resendTimer > 0 || loading} type="button"
                  style={{ background: 'none', border: 'none', color: resendTimer > 0 ? '#333' : '#3b82f6', fontSize: '13px', cursor: resendTimer > 0 ? 'default' : 'pointer', padding: 0 }}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </p>
            </>
          )}

          {/* ── FORGOT — Set New Password ── */}
          {step === 'new_password' && (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Set new password</h2>
              <p style={{ color: '#444', fontSize: '13px', marginBottom: '24px' }}>Choose a strong password for your account.</p>

              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>NEW PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'} required value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: '44px' }}
                      onFocus={e => e.target.style.borderColor = '#3b82f6'}
                      onBlur={e => e.target.style.borderColor = '#1a1a1a'}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '12px' }}>
                      {showNew ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>CONFIRM PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'} required value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
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

                <Btn disabled={passwordMismatch}>{loading ? 'Updating...' : 'Update Password'}</Btn>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', color: '#444', marginTop: '24px', fontSize: '13px' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: '#3b82f6' }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}