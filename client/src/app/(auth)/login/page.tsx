'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

type Step = 'login' | 'forgot_email' | 'forgot_otp' | 'new_password'

const MONO = '"IBM Plex Mono", monospace'
const SANS = '"Syne", sans-serif'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
body{background:#030307;color:#fff;font-family:'Syne',sans-serif;-webkit-font-smoothing:antialiased}

.lp-root{min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:20px;position:relative;overflow:hidden;background:#030307}

/* Grid background */
.lp-grid{position:fixed;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(0,200,255,.025) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(0,200,255,.025) 1px,transparent 1px);
  background-size:44px 44px}

/* Glow blobs */
.lp-glow1{position:fixed;width:500px;height:500px;border-radius:50%;
  background:radial-gradient(circle,rgba(0,200,255,.06) 0%,transparent 70%);
  top:-150px;left:-150px;pointer-events:none}
.lp-glow2{position:fixed;width:400px;height:400px;border-radius:50%;
  background:radial-gradient(circle,rgba(139,92,246,.05) 0%,transparent 70%);
  bottom:-100px;right:-100px;pointer-events:none}

/* Scan line */
.lp-scan{position:fixed;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(0,200,255,.15),transparent);
  animation:scanline 8s linear infinite;pointer-events:none;z-index:0}

.lp-wrap{position:relative;z-index:1;width:100%;max-width:420px;
  animation:fadeUp .5s ease both}

/* Logo */
.lp-logo{text-align:center;margin-bottom:28px}
.lp-logo-text{font-size:32px;font-weight:900;letter-spacing:-1px;color:#fff}
.lp-logo-text span{color:#00c8ff}
.lp-logo-sub{font-size:9px;font-family:${MONO};color:#1f2937;letter-spacing:4px;
  text-transform:uppercase;margin-top:5px}

/* Card */
.lp-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);
  border-radius:22px;padding:32px;backdrop-filter:blur(8px);
  box-shadow:0 0 0 1px rgba(0,200,255,.03),0 32px 64px rgba(0,0,0,.6)}

/* Corner accents */
.lp-card::before,.lp-card::after{content:'';position:absolute;width:30px;height:30px;pointer-events:none}
.lp-card{position:relative}
.lp-card::before{top:-1px;left:-1px;border-top:1px solid rgba(0,200,255,.3);border-left:1px solid rgba(0,200,255,.3);border-radius:22px 0 0 0}
.lp-card::after{bottom:-1px;right:-1px;border-bottom:1px solid rgba(139,92,246,.3);border-right:1px solid rgba(139,92,246,.3);border-radius:0 0 22px 0}

/* Step title */
.lp-title{font-size:20px;font-weight:800;color:#fff;margin-bottom:22px;letter-spacing:-.3px}
.lp-subtitle{font-size:12px;color:#374151;margin-bottom:20px;line-height:1.6}

/* Field */
.lp-field{margin-bottom:15px}
.lp-label{display:block;font-size:9px;font-family:${MONO};color:#374151;
  letter-spacing:2px;text-transform:uppercase;margin-bottom:7px;font-weight:500}
.lp-input{width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
  border-radius:11px;padding:12px 14px;color:#f1f5f9;font-size:13px;outline:none;
  font-family:'Syne',sans-serif;transition:border-color .2s,background .2s;
  box-sizing:border-box}
.lp-input:focus{border-color:rgba(0,200,255,.4);background:rgba(0,200,255,.03)}
.lp-input::placeholder{color:#1f2937}
.lp-input-wrap{position:relative}
.lp-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  background:none;border:none;color:#374151;cursor:pointer;font-size:9px;
  font-family:${MONO};letter-spacing:1px;padding:4px;transition:color .2s}
.lp-eye:hover{color:#00c8ff}

/* Submit btn */
.lp-btn{width:100%;padding:13px;border-radius:11px;border:none;cursor:pointer;
  font-size:13px;font-weight:700;font-family:'Syne',sans-serif;letter-spacing:.3px;
  transition:all .2s;position:relative;overflow:hidden;
  background:linear-gradient(135deg,#00c8ff18,#8b5cf618);
  color:#fff;border:1px solid rgba(0,200,255,.25)}
.lp-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,#00c8ff,#8b5cf6);
  opacity:0;transition:opacity .2s}
.lp-btn:hover::before{opacity:.15}
.lp-btn:active{transform:scale(.99)}
.lp-btn:disabled{opacity:.45;cursor:not-allowed}
.lp-btn span{position:relative;z-index:1}

/* Forgot link */
.lp-forgot{background:none;border:none;color:#374151;font-size:11px;cursor:pointer;
  padding:0;transition:color .2s;font-family:'Syne',sans-serif}
.lp-forgot:hover{color:#00c8ff}

/* Back btn */
.lp-back{background:none;border:none;color:#374151;font-size:11px;cursor:pointer;
  padding:0;margin-bottom:20px;display:flex;align-items:center;gap:5px;
  font-family:${MONO};letter-spacing:1px;transition:color .2s}
.lp-back:hover{color:#00c8ff}

/* OTP boxes */
.lp-otp-row{display:flex;gap:7px;margin-bottom:20px}
.lp-otp-box{flex:1;aspect-ratio:1;text-align:center;font-size:20px;font-weight:700;
  font-family:${MONO};background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
  border-radius:10px;color:#fff;outline:none;caret-color:#00c8ff;
  transition:border-color .15s,background .15s}
.lp-otp-box:focus{border-color:rgba(0,200,255,.4);background:rgba(0,200,255,.04)}
.lp-otp-box.filled{border-color:rgba(0,200,255,.3)}

/* Email highlight */
.lp-email-hl{color:#00c8ff;font-size:12px;font-weight:600;margin-bottom:22px;
  font-family:${MONO};background:rgba(0,200,255,.06);border:1px solid rgba(0,200,255,.15);
  padding:6px 12px;border-radius:7px;display:inline-block}

/* Divider */
.lp-divider{display:flex;align-items:center;gap:10px;margin:18px 0;color:#1f2937;font-size:10px;font-family:${MONO}}
.lp-divider::before,.lp-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.05)}

/* Bottom link */
.lp-bottom{text-align:center;color:#374151;margin-top:20px;font-size:12px}
.lp-bottom a{color:#00c8ff;text-decoration:none;font-weight:600;transition:color .2s}
.lp-bottom a:hover{color:#38bdf8}

/* Error text */
.lp-err{color:#ef4444;font-size:11px;margin-top:5px;font-family:${MONO}}

/* Resend */
.lp-resend{text-align:center;font-size:12px;color:#374151}
.lp-resend-btn{background:none;border:none;font-size:12px;cursor:pointer;
  padding:0;font-family:'Syne',sans-serif;transition:color .2s}

/* Loading spinner inline */
.lp-spinner{display:inline-block;width:12px;height:12px;border-radius:50%;
  border:2px solid rgba(255,255,255,.2);border-top-color:#fff;
  animation:spin .6s linear infinite;margin-right:7px;vertical-align:middle}

/* Mismatch border */
.input-error{border-color:rgba(239,68,68,.4) !important}
.input-error:focus{border-color:rgba(239,68,68,.6) !important;background:rgba(239,68,68,.03) !important}

@media(max-width:480px){
  .lp-card{padding:24px 20px;border-radius:18px}
  .lp-logo-text{font-size:28px}
}
`

export default function LoginPage() {
  const router = useRouter()
  const { setToken, setUser } = useAuthStore()

  const [step, setStep]           = useState<Step>('login')
  const [loading, setLoading]     = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass]   = useState(false)

  const [forgotEmail, setForgotEmail]       = useState('')
  const [otp, setOtp]                       = useState(['','','','','',''])
  const [newPassword, setNewPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]               = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
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
    } finally { setLoading(false) }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail })
      setStep('forgot_otp'); startResendTimer()
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
      toast.success('OTP sent!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Email not found')
    } finally { setLoading(false) }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { email: forgotEmail, otp: code })
      setStep('new_password')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
      setOtp(['','','','','','']); otpRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 6) { toast.error('Min 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email: forgotEmail, newPassword })
      toast.success('Password updated! Please login.')
      setStep('login'); setForgotEmail(''); setOtp(['','','','','',''])
      setNewPassword(''); setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed')
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail })
      setOtp(['','','','','','']); startResendTimer()
      otpRefs.current[0]?.focus(); toast.success('New OTP sent!')
    } catch { toast.error('Failed to resend') }
    finally { setLoading(false) }
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
      setOtp([...paste.split(''), ...Array(6).fill('')].slice(0, 6))
      otpRefs.current[Math.min(paste.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  const passwordMismatch = !!confirmPassword && confirmPassword !== newPassword

  return (
    <>
      <style>{CSS}</style>
      <div className="lp-root">
        <div className="lp-grid" />
        <div className="lp-glow1" />
        <div className="lp-glow2" />
        <div className="lp-scan" />

        <div className="lp-wrap">
          {/* Logo */}
          <div className="lp-logo">
            <div className="lp-logo-text">Reality<span>Engine</span></div>
            <div className="lp-logo-sub">Competitive Tech Learning</div>
          </div>

          <div className="lp-card">

            {/* ── LOGIN ── */}
            {step === 'login' && (
              <>
                <div className="lp-title">Welcome back</div>
                <form onSubmit={handleLogin}>
                  <div className="lp-field">
                    <label className="lp-label">Email</label>
                    <input
                      className="lp-input" type="email" required
                      placeholder="you@example.com" value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                    />
                  </div>

                  <div className="lp-field">
                    <label className="lp-label">Password</label>
                    <div className="lp-input-wrap">
                      <input
                        className="lp-input" type={showPass ? 'text' : 'password'} required
                        placeholder="••••••••" value={loginForm.password}
                        style={{ paddingRight: 52 }}
                        onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      />
                      <button type="button" className="lp-eye" onClick={() => setShowPass(v => !v)}>
                        {showPass ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginBottom: 20 }}>
                    <button type="button" className="lp-forgot"
                      onClick={() => { setStep('forgot_email'); setForgotEmail(loginForm.email) }}>
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" className="lp-btn" disabled={loading}>
                    <span>{loading ? <><span className="lp-spinner"/>Logging in...</> : 'Login →'}</span>
                  </button>
                </form>
              </>
            )}

            {/* ── FORGOT EMAIL ── */}
            {step === 'forgot_email' && (
              <>
                <button type="button" className="lp-back" onClick={() => setStep('login')}>
                  ← Back to login
                </button>
                <div className="lp-title">Reset password</div>
                <p className="lp-subtitle">Enter your registered email to receive a 6-digit verification code.</p>
                <form onSubmit={handleSendOtp}>
                  <div className="lp-field">
                    <label className="lp-label">Email</label>
                    <input
                      className="lp-input" type="email" required
                      placeholder="you@example.com" value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="lp-btn" disabled={loading}>
                    <span>{loading ? <><span className="lp-spinner"/>Sending...</> : 'Send OTP →'}</span>
                  </button>
                </form>
              </>
            )}

            {/* ── OTP ── */}
            {step === 'forgot_otp' && (
              <>
                <button type="button" className="lp-back" onClick={() => setStep('forgot_email')}>
                  ← Back
                </button>
                <div className="lp-title">Check your inbox</div>
                <p className="lp-subtitle" style={{ marginBottom: 8 }}>6-digit code sent to</p>
                <div className="lp-email-hl">{forgotEmail}</div>

                <form onSubmit={handleVerifyOtp}>
                  <div className="lp-otp-row" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el }}
                        className={`lp-otp-box ${digit ? 'filled' : ''}`}
                        type="text" inputMode="numeric" maxLength={1}
                        value={digit} placeholder="·"
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                      />
                    ))}
                  </div>
                  <button type="submit" className="lp-btn" disabled={loading} style={{ marginBottom: 14 }}>
                    <span>{loading ? <><span className="lp-spinner"/>Verifying...</> : 'Verify OTP →'}</span>
                  </button>
                </form>

                <p className="lp-resend">
                  Didn't get it?{' '}
                  <button onClick={handleResend} disabled={resendTimer > 0 || loading}
                    className="lp-resend-btn"
                    style={{ color: resendTimer > 0 ? '#374151' : '#00c8ff', cursor: resendTimer > 0 ? 'default' : 'pointer' }}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </p>
              </>
            )}

            {/* ── NEW PASSWORD ── */}
            {step === 'new_password' && (
              <>
                <div className="lp-title">Set new password</div>
                <p className="lp-subtitle">Choose a strong password for your account.</p>
                <form onSubmit={handleResetPassword}>
                  <div className="lp-field">
                    <label className="lp-label">New Password</label>
                    <div className="lp-input-wrap">
                      <input
                        className="lp-input" type={showNew ? 'text' : 'password'} required
                        placeholder="••••••••" value={newPassword} style={{ paddingRight: 52 }}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <button type="button" className="lp-eye" onClick={() => setShowNew(v => !v)}>
                        {showNew ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  <div className="lp-field">
                    <label className="lp-label">Confirm Password</label>
                    <div className="lp-input-wrap">
                      <input
                        className={`lp-input ${passwordMismatch ? 'input-error' : ''}`}
                        type={showConfirm ? 'text' : 'password'} required
                        placeholder="••••••••" value={confirmPassword} style={{ paddingRight: 52 }}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                      <button type="button" className="lp-eye" onClick={() => setShowConfirm(v => !v)}>
                        {showConfirm ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    {passwordMismatch && <p className="lp-err">Passwords do not match</p>}
                  </div>

                  <button type="submit" className="lp-btn" disabled={loading || passwordMismatch}>
                    <span>{loading ? <><span className="lp-spinner"/>Updating...</> : 'Update Password'}</span>
                  </button>
                </form>
              </>
            )}

            <div className="lp-divider">OR</div>

            <p className="lp-bottom">
              Don't have an account?{' '}
              <Link href="/register">Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}