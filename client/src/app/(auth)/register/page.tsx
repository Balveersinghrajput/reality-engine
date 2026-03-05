'use client'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

const TRACKS = ['webdev','cloud','cyber','ai','devops','fullstack','system_design','robotics']
const LEVELS = ['beginner','intermediate','advanced']
const MODES  = ['normal','competitive','harsh']

type Step = 'form' | 'otp'

const MONO = '"IBM Plex Mono", monospace'

const TRACK_ICONS: Record<string, string> = {
  webdev:'🌐', cloud:'☁️', cyber:'🔐', ai:'🤖',
  devops:'⚙️', fullstack:'🧱', system_design:'📐', robotics:'🦾',
}
const MODE_DESC: Record<string, { color: string; label: string }> = {
  normal:      { color: '#6b7280', label: 'Balanced pace' },
  competitive: { color: '#00c8ff', label: 'Push harder'   },
  harsh:       { color: '#ef4444', label: 'No excuses'    },
}
const LEVEL_DESC: Record<string, string> = {
  beginner: 'Just starting', intermediate: 'Some experience', advanced: 'Production ready',
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
body{background:#030307;color:#fff;font-family:'Syne',sans-serif;-webkit-font-smoothing:antialiased}

.rp-root{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;
  padding:28px 20px 60px;position:relative;overflow-x:hidden;background:#030307}

.rp-grid{position:fixed;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(0,200,255,.022) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(0,200,255,.022) 1px,transparent 1px);
  background-size:44px 44px}
.rp-glow1{position:fixed;width:500px;height:500px;border-radius:50%;
  background:radial-gradient(circle,rgba(0,200,255,.06) 0%,transparent 70%);
  top:-150px;left:-150px;pointer-events:none}
.rp-glow2{position:fixed;width:400px;height:400px;border-radius:50%;
  background:radial-gradient(circle,rgba(139,92,246,.05) 0%,transparent 70%);
  bottom:-100px;right:-100px;pointer-events:none}
.rp-scan{position:fixed;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(0,200,255,.12),transparent);
  animation:scanline 10s linear infinite;pointer-events:none;z-index:0}

.rp-wrap{position:relative;z-index:1;width:100%;max-width:460px;
  animation:fadeUp .5s ease both}

.rp-logo{text-align:center;margin-bottom:24px}
.rp-logo-text{font-size:30px;font-weight:900;letter-spacing:-1px;color:#fff}
.rp-logo-text span{color:#00c8ff}
.rp-logo-sub{font-size:9px;font-family:${MONO};color:#1f2937;letter-spacing:4px;
  text-transform:uppercase;margin-top:5px}

.rp-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);
  border-radius:22px;padding:28px 28px 24px;backdrop-filter:blur(8px);position:relative;
  box-shadow:0 0 0 1px rgba(0,200,255,.03),0 32px 64px rgba(0,0,0,.6)}
.rp-card::before{content:'';position:absolute;top:-1px;left:-1px;width:30px;height:30px;
  border-top:1px solid rgba(0,200,255,.3);border-left:1px solid rgba(0,200,255,.3);
  border-radius:22px 0 0 0;pointer-events:none}
.rp-card::after{content:'';position:absolute;bottom:-1px;right:-1px;width:30px;height:30px;
  border-bottom:1px solid rgba(139,92,246,.3);border-right:1px solid rgba(139,92,246,.3);
  border-radius:0 0 22px 0;pointer-events:none}

.rp-title{font-size:20px;font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-.3px}
.rp-subtitle{font-size:11px;color:#374151;margin-bottom:22px;font-family:${MONO};letter-spacing:.5px}

.rp-field{margin-bottom:13px}
.rp-label{display:block;font-size:9px;font-family:${MONO};color:#374151;
  letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.rp-input{width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
  border-radius:11px;padding:11px 14px;color:#f1f5f9;font-size:13px;outline:none;
  font-family:'Syne',sans-serif;transition:border-color .2s,background .2s;box-sizing:border-box}
.rp-input:focus{border-color:rgba(0,200,255,.4);background:rgba(0,200,255,.03)}
.rp-input::placeholder{color:#1f2937}
.rp-input.err{border-color:rgba(239,68,68,.4)}
.rp-input.err:focus{border-color:rgba(239,68,68,.6);background:rgba(239,68,68,.03)}
.rp-input-wrap{position:relative}
.rp-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  background:none;border:none;color:#374151;cursor:pointer;font-size:9px;
  font-family:${MONO};letter-spacing:1px;padding:4px;transition:color .2s}
.rp-eye:hover{color:#00c8ff}

/* 2-col grid for username/email */
.rp-row2{display:grid;grid-template-columns:1fr 1fr;gap:11px}

/* Track picker */
.rp-track-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:13px}
.rp-track-opt{padding:9px 4px;border-radius:10px;border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.02);cursor:pointer;transition:all .18s;text-align:center}
.rp-track-opt:hover{background:rgba(255,255,255,.05)}
.rp-track-opt.on{background:rgba(0,200,255,.08);border-color:rgba(0,200,255,.3)}
.rp-track-icon{font-size:17px;margin-bottom:3px}
.rp-track-name{font-size:8.5px;color:#6b7280;font-family:${MONO};text-transform:uppercase;
  letter-spacing:.5px;white-space:nowrap}
.rp-track-opt.on .rp-track-name{color:#00c8ff}

/* Level / Mode row */
.rp-sel-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px}
.rp-sel-group{}
.rp-sel-opts{display:flex;flex-direction:column;gap:5px;margin-top:6px}
.rp-sel-opt{display:flex;align-items:center;justify-content:space-between;
  padding:8px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.06);
  background:rgba(255,255,255,.02);cursor:pointer;transition:all .18s}
.rp-sel-opt:hover{background:rgba(255,255,255,.04)}
.rp-sel-opt.on{border-color:currentColor}
.rp-sel-name{font-size:11px;font-weight:700;text-transform:capitalize}
.rp-sel-desc{font-size:8px;font-family:${MONO};color:#374151;margin-top:1px}
.rp-sel-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}

/* Submit btn */
.rp-btn{width:100%;padding:13px;border-radius:11px;border:none;cursor:pointer;
  font-size:13px;font-weight:700;font-family:'Syne',sans-serif;letter-spacing:.3px;
  transition:all .2s;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(0,200,255,.15),rgba(139,92,246,.15));
  color:#fff;border:1px solid rgba(0,200,255,.25);margin-top:4px}
.rp-btn::before{content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,#00c8ff,#8b5cf6);opacity:0;transition:opacity .2s}
.rp-btn:hover:not(:disabled)::before{opacity:.15}
.rp-btn:disabled{opacity:.4;cursor:not-allowed}
.rp-btn span{position:relative;z-index:1}

.rp-back{background:none;border:none;color:#374151;font-size:11px;cursor:pointer;
  padding:0;margin-bottom:18px;display:flex;align-items:center;gap:5px;
  font-family:${MONO};letter-spacing:1px;transition:color .2s}
.rp-back:hover{color:#00c8ff}

/* OTP */
.rp-otp-row{display:flex;gap:7px;margin-bottom:20px}
.rp-otp-box{flex:1;aspect-ratio:1;text-align:center;font-size:20px;font-weight:700;
  font-family:${MONO};background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
  border-radius:10px;color:#fff;outline:none;caret-color:#00c8ff;transition:border-color .15s,background .15s}
.rp-otp-box:focus{border-color:rgba(0,200,255,.4);background:rgba(0,200,255,.04)}
.rp-otp-box.filled{border-color:rgba(0,200,255,.3)}

.rp-email-hl{color:#00c8ff;font-size:11px;font-weight:600;margin-bottom:20px;
  font-family:${MONO};background:rgba(0,200,255,.06);border:1px solid rgba(0,200,255,.15);
  padding:6px 12px;border-radius:7px;display:inline-block}

.rp-err-msg{color:#ef4444;font-size:10px;margin-top:4px;font-family:${MONO}}

.rp-divider{display:flex;align-items:center;gap:10px;margin:16px 0;
  color:#1f2937;font-size:10px;font-family:${MONO}}
.rp-divider::before,.rp-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.05)}

.rp-bottom{text-align:center;color:#374151;margin-top:16px;font-size:12px}
.rp-bottom a{color:#00c8ff;text-decoration:none;font-weight:600;transition:color .2s}
.rp-bottom a:hover{color:#38bdf8}

.rp-spinner{display:inline-block;width:11px;height:11px;border-radius:50%;
  border:2px solid rgba(255,255,255,.2);border-top-color:#fff;
  animation:spin .6s linear infinite;margin-right:7px;vertical-align:middle}

.rp-resend{text-align:center;font-size:12px;color:#374151}
.rp-resend-btn{background:none;border:none;font-size:12px;cursor:pointer;
  padding:0;font-family:'Syne',sans-serif;transition:color .2s}

/* Step indicator */
.rp-steps{display:flex;align-items:center;gap:6px;margin-bottom:22px}
.rp-step-dot{width:24px;height:4px;border-radius:99px;transition:background .3s}
.rp-step-label{font-size:9px;font-family:${MONO};color:#374151;letter-spacing:1.5px;
  text-transform:uppercase;margin-left:4px}

@media(max-width:480px){
  .rp-card{padding:22px 18px 20px;border-radius:18px}
  .rp-row2{grid-template-columns:1fr}
  .rp-track-grid{grid-template-columns:repeat(4,1fr)}
  .rp-track-name{font-size:7.5px}
  .rp-sel-row{grid-template-columns:1fr 1fr}
}
`

export default function RegisterPage() {
  const router = useRouter()
  const { setToken, setUser } = useAuthStore()

  const [step, setStep]       = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp]         = useState(['','','','','',''])
  const [resendTimer, setResendTimer] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

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

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/auth/send-otp', { email: form.email })
      setStep('otp'); startResendTimer()
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
      toast.success('OTP sent! Check your email.')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  async function handleVerifyAndRegister(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        username: form.username, email: form.email, password: form.password,
        targetTrack: form.targetTrack, level: form.level, mode: form.mode, otp: code,
      })
      const { accessToken, refreshToken, user } = res.data.data
      setToken(accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setUser(user)
      toast.success('Welcome to Reality Engine!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP or registration failed')
      setOtp(['','','','','','']); otpRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await api.post('/auth/send-otp', { email: form.email })
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

  return (
    <>
      <style>{CSS}</style>
      <div className="rp-root">
        <div className="rp-grid" />
        <div className="rp-glow1" />
        <div className="rp-glow2" />
        <div className="rp-scan" />

        <div className="rp-wrap">
          {/* Logo */}
          <div className="rp-logo">
            <div className="rp-logo-text">Reality<span>Engine</span></div>
            <div className="rp-logo-sub">Start your journey</div>
          </div>

          <div className="rp-card">

            {/* Step indicator */}
            <div className="rp-steps">
              <div className="rp-step-dot" style={{ background: '#00c8ff', width: 32 }} />
              <div className="rp-step-dot" style={{ background: step === 'otp' ? '#8b5cf6' : 'rgba(255,255,255,.08)' }} />
              <span className="rp-step-label">{step === 'form' ? 'Profile Setup' : 'Verify Email'}</span>
            </div>

            {/* ── STEP 1: FORM ── */}
            {step === 'form' && (
              <>
                <div className="rp-title">Create account</div>
                <div className="rp-subtitle">Fill in your details to get started</div>

                <form onSubmit={handleFormSubmit}>
                  {/* Username + Email */}
                  <div className="rp-row2" style={{ marginBottom: 13 }}>
                    <div>
                      <label className="rp-label">Username</label>
                      <input
                        className="rp-input" required value={form.username}
                        placeholder="balveer"
                        onChange={e => setForm({ ...form, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="rp-label">Email</label>
                      <input
                        className="rp-input" type="email" required value={form.email}
                        placeholder="you@example.com"
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="rp-field">
                    <label className="rp-label">Password</label>
                    <div className="rp-input-wrap">
                      <input
                        className="rp-input" type={showPassword ? 'text' : 'password'} required
                        placeholder="••••••••" value={form.password} style={{ paddingRight: 52 }}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                      />
                      <button type="button" className="rp-eye" onClick={() => setShowPassword(v => !v)}>
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="rp-field">
                    <label className="rp-label">Confirm Password</label>
                    <div className="rp-input-wrap">
                      <input
                        className={`rp-input ${passwordMismatch ? 'err' : ''}`}
                        type={showConfirm ? 'text' : 'password'} required
                        placeholder="••••••••" value={form.confirmPassword} style={{ paddingRight: 52 }}
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      />
                      <button type="button" className="rp-eye" onClick={() => setShowConfirm(v => !v)}>
                        {showConfirm ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    {passwordMismatch && <p className="rp-err-msg">Passwords do not match</p>}
                  </div>

                  {/* Track Picker */}
                  <div className="rp-field">
                    <label className="rp-label">Learning Track</label>
                    <div className="rp-track-grid">
                      {TRACKS.map(t => (
                        <div
                          key={t}
                          className={`rp-track-opt ${form.targetTrack === t ? 'on' : ''}`}
                          onClick={() => setForm({ ...form, targetTrack: t })}
                        >
                          <div className="rp-track-icon">{TRACK_ICONS[t]}</div>
                          <div className="rp-track-name">{t.replace('_', ' ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Level + Mode */}
                  <div className="rp-sel-row">
                    {/* Level */}
                    <div className="rp-sel-group">
                      <label className="rp-label">Level</label>
                      <div className="rp-sel-opts">
                        {LEVELS.map(l => (
                          <div
                            key={l}
                            className={`rp-sel-opt ${form.level === l ? 'on' : ''}`}
                            style={{ color: form.level === l ? '#00c8ff' : '#374151' }}
                            onClick={() => setForm({ ...form, level: l })}
                          >
                            <div>
                              <div className="rp-sel-name" style={{ color: form.level === l ? '#00c8ff' : '#9ca3af' }}>{l}</div>
                              <div className="rp-sel-desc">{LEVEL_DESC[l]}</div>
                            </div>
                            <div className="rp-sel-dot" style={{ opacity: form.level === l ? 1 : 0 }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mode */}
                    <div className="rp-sel-group">
                      <label className="rp-label">Mode</label>
                      <div className="rp-sel-opts">
                        {MODES.map(m => {
                          const md = MODE_DESC[m]
                          const active = form.mode === m
                          return (
                            <div
                              key={m}
                              className={`rp-sel-opt ${active ? 'on' : ''}`}
                              style={{ color: active ? md.color : '#374151', borderColor: active ? md.color + '40' : 'rgba(255,255,255,.06)' }}
                              onClick={() => setForm({ ...form, mode: m })}
                            >
                              <div>
                                <div className="rp-sel-name" style={{ color: active ? md.color : '#9ca3af' }}>{m}</div>
                                <div className="rp-sel-desc">{md.label}</div>
                              </div>
                              <div className="rp-sel-dot" style={{ background: md.color, opacity: active ? 1 : 0 }} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="rp-btn" disabled={loading || passwordMismatch}>
                    <span>
                      {loading
                        ? <><span className="rp-spinner" />Sending OTP...</>
                        : 'Continue →'}
                    </span>
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 'otp' && (
              <>
                <button
                  type="button" className="rp-back"
                  onClick={() => { setStep('form'); setOtp(['','','','','','']) }}
                >
                  ← Back
                </button>

                <div className="rp-title">Verify your email</div>
                <p style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>6-digit code sent to</p>
                <div className="rp-email-hl">{form.email}</div>

                <form onSubmit={handleVerifyAndRegister}>
                  <div className="rp-otp-row" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el }}
                        className={`rp-otp-box ${digit ? 'filled' : ''}`}
                        type="text" inputMode="numeric" maxLength={1}
                        value={digit} placeholder="·"
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                      />
                    ))}
                  </div>

                  <button type="submit" className="rp-btn" disabled={loading} style={{ marginBottom: 14 }}>
                    <span>
                      {loading
                        ? <><span className="rp-spinner" />Creating account...</>
                        : 'Verify & Create Account'}
                    </span>
                  </button>
                </form>

                <p className="rp-resend">
                  Didn't get it?{' '}
                  <button
                    type="button" onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    className="rp-resend-btn"
                    style={{ color: resendTimer > 0 ? '#374151' : '#00c8ff', cursor: resendTimer > 0 ? 'default' : 'pointer' }}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </p>
              </>
            )}

            <div className="rp-divider">OR</div>

            <p className="rp-bottom">
              Already have an account?{' '}
              <Link href="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}