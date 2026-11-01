import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  Terminal,
  User,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CyberCanvas } from '../components/viz/CyberCanvas';
import { useAuth } from '../context/AuthContext';
import { CyberBadge } from '../components/ui/CyberBadge';
import { PulseBeacon, ShieldHoloIcon } from '../components/ui/CyberIcons';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrength';
import { toast } from '../components/ui/Toast';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useTheme } from '../utils/theme';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

type Mode = 'login' | 'signup' | 'forgot';

export function AuthPage() {
  const { isLight } = useTheme();
  const { login, signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true);

  // UI state
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword;

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccess(false);
    setForgotSent(false);
    setPassword('');
    setConfirmPassword('');
  };

  // ── Login / Register submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailOk) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (mode === 'signup' && !passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup(fullName, email, password, confirmPassword);
        toast.success('Account created! Welcome to the Command Center.');
      } else {
        await login(email, password);
        if (remember) localStorage.setItem('acdsf.remember', email);
        toast.success('Authentication successful. Clearance granted.');
      }
      setSuccess(true);
      setTimeout(() => navigate('/app/command-center'), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ── Forgot password submit ───────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!emailOk) {
      setError('Enter a valid email address.');
      return;
    }
    setForgotBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setForgotSent(true);
      toast.info('If that email is registered, a reset link has been sent.');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <main className={`relative grid min-h-screen overflow-hidden transition-colors duration-300 lg:grid-cols-2 ${
      isLight ? 'bg-gradient-to-br from-[#FBCFE8] via-[#FEF3C7] to-[#FCE7F3] text-[#0F172A]' : 'bg-[#030712] text-slate-100'
    }`}>
      {/* Floating Theme Toggle */}
      <div className="absolute right-5 top-5 z-40">
        <ThemeToggle />
      </div>

      {/* ── Left: Animated Brand Column ─────────────────────────────────── */}
      <section className={`relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between border-r ${
        isLight
          ? 'bg-gradient-to-b from-[#FBCFE8]/95 via-[#FCE7F3]/95 to-[#FEF3C7]/95 border-[#F472B6] shadow-sm'
          : 'bg-[#040a16] border-cyan-500/20'
      }`}>
        {!isLight && (
          <>
            <CyberCanvas className="opacity-70" />
            <div className="scanlines pointer-events-none absolute inset-0 opacity-25" />
            <div className="cyber-grid-bg pointer-events-none absolute inset-0 opacity-30" />
          </>
        )}

        {/* Brand header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 ${
              isLight
                ? 'border-[#F472B6] bg-[#FCE7F3] text-[#E11D48] shadow-md'
                : 'border-cyan-400/40 bg-cyan-950/60 text-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.3)]'
            }`}>
              <ShieldHoloIcon size={26} />
            </div>
            <div>
              <span className={`font-display text-lg font-extrabold tracking-[0.3em] ${
                isLight ? 'text-[#881337]' : 'text-white glow-text'
              }`}>
                ACDSF
              </span>
              <p className={`font-mono text-[9px] tracking-widest font-bold ${
                isLight ? 'text-[#BE123C]' : 'text-cyan-400'
              }`}>
                AI CYBER DEFENCE FRAMEWORK
              </p>
            </div>
          </Link>
          <CyberBadge label="v1.0 SOVEREIGN GATEWAY" tone={isLight ? 'magenta' : 'acid'} size="sm" />
        </div>

        {/* Hero text */}
        <div className="relative z-10 my-8">
          <p className={`font-mono text-xs uppercase tracking-[0.3em] font-extrabold ${
            isLight ? 'text-[#BE123C]' : 'text-purple-300'
          }`}>
            RESTRICTED ACCESS // CLEARANCE REQUIRED
          </p>
          <h1 className={`mt-3 max-w-lg font-display text-4xl font-extrabold leading-tight lg:text-5xl ${
            isLight ? 'text-[#0F172A]' : 'text-white'
          }`}>
            <span className={isLight ? 'text-[#E11D48]' : 'gradient-text-animated'}>Authenticate</span>
            {' '}to the National Cyber Command.
          </h1>
          <p className={`mt-4 max-w-md text-sm leading-relaxed font-medium ${
            isLight ? 'text-[#334155]' : 'text-slate-400'
          }`}>
            Enter your clearance credentials to access real-time digital twins, Red vs Blue live theatres, and explainable AI telemetry — secured by JWT + bcrypt.
          </p>

          {/* Animated radar */}
          <div className="relative mt-8 h-60 w-60">
            <div className={`absolute inset-0 rounded-full border-2 spin-slow ${
              isLight ? 'border-[#F472B6]/40' : 'border-cyan-400/20'
            }`} />
            <div
              className={`absolute inset-4 rounded-full border-2 border-dashed spin-slow ${
                isLight ? 'border-[#FDA4AF]/60' : 'border-purple-400/40'
              }`}
              style={{ animationDuration: '14s', animationDirection: 'reverse' }}
            />
            <div className={`absolute inset-12 rounded-full border-2 ${
              isLight ? 'border-[#FECDD3]' : 'border-cyan-300/30'
            }`} />
            <div className={`radar-sweep absolute inset-0 h-full w-full rounded-full border-r-2 ${
              isLight ? 'border-[#E11D48]' : 'border-cyan-400/80'
            }`} />
            <div className={`absolute inset-20 flex flex-col items-center justify-center rounded-full border-2 shadow-lg ${
              isLight
                ? 'border-[#F472B6] bg-[#FCE7F3] text-[#E11D48]'
                : 'border-cyan-400/50 bg-cyan-950/50 text-[#00f5ff] shadow-[0_0_30px_rgba(0,245,255,0.35)]'
            }`}>
              <Shield size={32} />
              <span className={`mt-1 font-mono text-[9px] uppercase tracking-widest font-extrabold ${
                isLight ? 'text-[#881337]' : 'text-cyan-200'
              }`}>
                SECURED
              </span>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {['JWT Auth', 'bcrypt Hashing', 'Rate Limiting', 'Audit Log', 'Role-Based Access'].map((f) => (
              <span
                key={f}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] font-bold ${
                  isLight
                    ? 'border-[#F472B6] bg-[#FCE7F3] text-[#881337] shadow-sm'
                    : 'border-cyan-500/25 bg-cyan-950/30 text-cyan-300'
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer meta */}
        <div className={`relative z-10 flex items-center justify-between border-t pt-4 font-mono text-[11px] font-bold ${
          isLight ? 'border-[#FBCFE8] text-[#475569]' : 'border-white/10 text-slate-500'
        }`}>
          <span>TLS 1.3 / SOVEREIGN CLEARANCE PROTOCOL</span>
          <span className={isLight ? 'text-[#BE123C]' : 'text-cyan-400'}>SECURE VAULT ACTIVE</span>
        </div>
      </section>

      {/* ── Right: Auth Form Column ──────────────────────────────────────── */}
      <section className={`relative flex items-center justify-center px-6 py-12 ${
        isLight
          ? 'bg-gradient-to-br from-[#FCE7F3] via-[#FEF3C7] to-[#FBCFE8]'
          : 'bg-[#050c18]'
      }`}>
        {!isLight && <div className="scanlines pointer-events-none absolute inset-0 opacity-15" />}
        <div className="relative z-10 w-full max-w-lg">

          {/* Form Card Container in Light Pink */}
          <div className={`rounded-3xl p-8 sm:p-10 border transition-all duration-200 ${
            isLight
              ? 'border-2 border-[#F472B6] bg-gradient-to-br from-[#FFF0F5] via-[#FFFBEB] to-[#FCE7F3] shadow-[0_12px_36px_rgba(244,114,182,0.35)]'
              : 'border border-white/10 bg-black/40'
          }`}>

            {/* Tab switcher: Login | Register */}
            {mode !== 'forgot' && (
              <div className={`mb-6 flex rounded-2xl border p-1 ${
                isLight ? 'border-2 border-[#F472B6] bg-[#FCE7F3]' : 'border-white/10 bg-white/[0.03]'
              }`}>
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`flex-1 rounded-xl py-2.5 font-heading text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                      mode === m
                        ? isLight
                          ? 'bg-[#E11D48] text-white shadow-md'
                          : 'bg-gradient-to-r from-cyan-500/30 to-violet-500/20 text-white shadow-[0_0_20px_rgba(0,245,255,0.15)]'
                        : isLight
                        ? 'text-[#881337] hover:bg-[#FDF2F8]'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m === 'login' ? '🔐 Login' : '✨ Register'}
                  </button>
                ))}
              </div>
            )}

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <PulseBeacon color={success ? 'acid' : (isLight ? 'magenta' : 'cyan')} size="sm" />
                  <p className={`font-mono text-[11px] uppercase tracking-[0.25em] font-extrabold ${
                    isLight ? 'text-[#BE123C]' : 'text-[#00f5ff]'
                  }`}>
                    {mode === 'forgot' ? 'Password Recovery' : 'Operator Authentication'}
                  </p>
                </div>
                <h2 className={`mt-1 font-display text-2xl font-extrabold ${
                  isLight ? 'text-[#0F172A]' : 'text-white'
                }`}>
                  {mode === 'login'  && 'Operator Clearance'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Recover Access'}
                </h2>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border-2 ${
                isLight
                  ? 'border-[#F472B6] bg-[#FCE7F3] text-[#E11D48] shadow-sm'
                  : 'border-cyan-400/30 bg-cyan-950/50 text-[#00f5ff]'
              }`}>
                <KeyRound size={20} />
              </div>
            </div>

            {/* ── SUCCESS state ─────────────────────────────────────────── */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mb-6 rounded-2xl border p-6 text-center shadow-lg ${
                    isLight
                      ? 'border-2 border-[#86EFAC] bg-[#F0FDF4] text-[#0F172A]'
                      : 'border-emerald-400/50 bg-emerald-950/40 text-white'
                  }`}
                >
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                    isLight
                      ? 'border-[#16A34A] bg-[#DCFCE7] text-[#15803D]'
                      : 'border-emerald-400 bg-emerald-500/20 text-[#00ff9d]'
                  }`}>
                    <Check size={32} />
                  </div>
                  <h3 className={`mt-3 font-display text-xl font-extrabold ${isLight ? 'text-[#15803D]' : 'text-white'}`}>
                    CLEARANCE GRANTED
                  </h3>
                  <p className={`mt-1 font-mono text-xs font-bold ${isLight ? 'text-[#16A34A]' : 'text-emerald-300'}`}>
                    Redirecting to Command Center...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── FORGOT PASSWORD form ──────────────────────────────────── */}
            {mode === 'forgot' && !forgotSent && (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className={`text-sm font-medium ${isLight ? 'text-[#334155]' : 'text-slate-400'}`}>
                  Enter your registered email address and we'll send you a reset link valid for 30 minutes.
                </p>

                <div>
                  <label htmlFor="forgot-email" className={`block font-mono text-[11px] uppercase tracking-widest font-bold ${
                    isLight ? 'text-[#881337]' : 'text-slate-400'
                  }`}>
                    Registered Email
                  </label>
                  <div className="relative mt-1.5">
                    <Mail size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isLight ? 'text-[#BE123C]' : 'text-slate-500'
                    }`} />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      autoComplete="email"
                      className={`w-full rounded-xl border-2 pl-10 pr-4 py-3 text-sm font-semibold outline-none transition ${
                        isLight
                          ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/20'
                          : 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-cyan-400'
                      }`}
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className={`text-xs font-bold ${isLight ? 'text-[#DC2626]' : 'text-rose-400'}`}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={forgotBusy}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-heading text-sm font-bold uppercase tracking-widest text-white shadow-md transition disabled:opacity-60 ${
                    isLight
                      ? 'bg-gradient-to-r from-[#E11D48] to-[#F43F5E] hover:brightness-105 active:scale-95'
                      : 'bg-gradient-to-r from-violet-600 to-violet-500 shadow-[0_0_25px_rgba(168,85,247,0.3)]'
                  }`}
                >
                  {forgotBusy ? (
                    <><RefreshCw size={15} className="animate-spin" /> Sending...</>
                  ) : (
                    <><Mail size={15} /> Send Reset Link</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`w-full text-center font-mono text-xs font-bold transition-colors ${
                    isLight ? 'text-[#881337] hover:text-[#E11D48]' : 'text-slate-500 hover:text-cyan-400'
                  }`}
                >
                  ← Back to Login
                </button>
              </form>
            )}

            {/* ── FORGOT: confirmation ──────────────────────────────────── */}
            {mode === 'forgot' && forgotSent && (
              <div className="space-y-4">
                <div className={`rounded-2xl border-2 p-6 text-center ${
                  isLight ? 'border-[#FBCFE8] bg-[#FFF0F5]' : 'border-cyan-400/30 bg-cyan-950/20'
                }`}>
                  <Mail size={36} className={`mx-auto mb-3 ${isLight ? 'text-[#E11D48]' : 'text-cyan-400'}`} />
                  <h3 className={`font-display text-lg font-extrabold ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
                    Check your inbox
                  </h3>
                  <p className={`mt-2 font-mono text-xs font-medium ${isLight ? 'text-[#334155]' : 'text-slate-400'}`}>
                    If <span className={`font-bold ${isLight ? 'text-[#E11D48]' : 'text-cyan-300'}`}>{email}</span> is registered, a reset link has been sent. Check your spam folder if you don't see it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`w-full text-center font-mono text-xs font-bold transition-colors ${
                    isLight ? 'text-[#881337] hover:text-[#E11D48]' : 'text-slate-500 hover:text-cyan-400'
                  }`}
                >
                  ← Back to Login
                </button>
              </div>
            )}

            {/* ── LOGIN / SIGNUP form ───────────────────────────────────── */}
            {(mode === 'login' || mode === 'signup') && !success && (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Full Name (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="auth-name" className={`block font-mono text-[11px] uppercase tracking-widest font-bold ${
                      isLight ? 'text-[#881337]' : 'text-slate-400'
                    }`}>
                      Full Name <span className="text-rose-600 font-extrabold">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <User size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isLight ? 'text-[#BE123C]' : 'text-slate-500'
                      }`} />
                      <input
                        id="auth-name"
                        type="text"
                        required
                        autoComplete="name"
                        className={`w-full rounded-xl border-2 pl-10 pr-4 py-3 text-sm font-semibold outline-none transition ${
                          isLight
                            ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/20'
                            : 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-cyan-400'
                        }`}
                        placeholder="e.g. Sarah Chen"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="auth-email" className={`block font-mono text-[11px] uppercase tracking-widest font-bold ${
                    isLight ? 'text-[#881337]' : 'text-slate-400'
                  }`}>
                    Email Address <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isLight ? 'text-[#BE123C]' : 'text-slate-500'
                    }`} />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      className={`w-full rounded-xl border-2 pl-10 pr-4 py-3 text-sm font-semibold outline-none transition ${
                        isLight
                          ? email && !emailOk
                            ? 'border-[#DC2626] bg-white text-[#0F172A] focus:ring-2 focus:ring-[#DC2626]/20'
                            : 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/20'
                          : email && !emailOk
                          ? 'border-rose-500/60 bg-white/5 text-white'
                          : 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-cyan-400'
                      }`}
                      placeholder="you@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {email && !emailOk && (
                    <p className={`mt-1 font-mono text-[11px] font-bold ${isLight ? 'text-[#DC2626]' : 'text-rose-400'}`}>
                      Enter a valid email address
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="auth-password" className={`block font-mono text-[11px] uppercase tracking-widest font-bold ${
                    isLight ? 'text-[#881337]' : 'text-slate-400'
                  }`}>
                    Password <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={8}
                      className={`w-full rounded-xl border-2 px-4 py-3 pr-10 text-sm font-semibold outline-none transition ${
                        isLight
                          ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/20'
                          : 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-cyan-400'
                      }`}
                      placeholder={mode === 'login' ? 'Your password' : 'Min 8 chars, upper+lower+number+symbol'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors ${
                        isLight ? 'text-[#881337] hover:text-[#0F172A]' : 'text-slate-400 hover:text-white'
                      }`}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {/* Password strength meter (signup only) */}
                  {mode === 'signup' && password && (
                    <PasswordStrengthMeter password={password} className="mt-2" />
                  )}
                </div>

                {/* Confirm Password (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="auth-confirm" className={`block font-mono text-[11px] uppercase tracking-widest font-bold ${
                      isLight ? 'text-[#881337]' : 'text-slate-400'
                    }`}>
                      Confirm Password <span className="text-rose-600 font-extrabold">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="auth-confirm"
                        type={showConfirm ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        className={`w-full rounded-xl border-2 px-4 py-3 pr-10 text-sm font-semibold outline-none transition ${
                          isLight
                            ? confirmPassword && !passwordsMatch
                              ? 'border-[#DC2626] bg-white text-[#0F172A] focus:ring-2 focus:ring-[#DC2626]/20'
                              : 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/20'
                            : confirmPassword && !passwordsMatch
                            ? 'border-rose-500/60 bg-white/5 text-white'
                            : 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-cyan-400'
                        }`}
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors ${
                          isLight ? 'text-[#881337] hover:text-[#0F172A]' : 'text-slate-400 hover:text-white'
                        }`}
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className={`mt-1 font-mono text-[11px] font-bold ${isLight ? 'text-[#DC2626]' : 'text-rose-400'}`}>
                        Passwords do not match
                      </p>
                    )}
                    {confirmPassword && passwordsMatch && (
                      <p className={`mt-1 font-mono text-[11px] font-bold ${isLight ? 'text-[#16A34A]' : 'text-emerald-400'}`}>
                        ✓ Passwords match
                      </p>
                    )}
                  </div>
                )}

                {/* Remember me & Forgot password (login only) */}
                {mode === 'login' && (
                  <div className={`flex items-center justify-between font-mono text-xs font-bold ${
                    isLight ? 'text-[#334155]' : 'text-slate-400'
                  }`}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        id="auth-remember"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className={`rounded ${isLight ? 'border-[#F472B6] text-[#E11D48] focus:ring-[#E11D48]' : 'border-slate-700 bg-white/5 text-cyan-500'}`}
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      className={`font-bold transition-colors ${
                        isLight ? 'text-[#BE123C] hover:text-[#9F1239] hover:underline' : 'text-cyan-400 hover:text-cyan-300 hover:underline'
                      }`}
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div role="alert" className={`rounded-xl border-2 px-4 py-3 font-mono text-xs font-bold ${
                    isLight
                      ? 'border-[#F43F5E] bg-[#FFF1F2] text-[#9F1239]'
                      : 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                  }`}>
                    <span className="mr-2 font-black text-rose-600">ERROR:</span>{error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  id="auth-submit-btn"
                  disabled={busy || isLoading}
                  className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 font-heading text-sm font-black uppercase tracking-widest text-white shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-gradient-to-r from-[#E11D48] via-[#F43F5E] to-[#FB7185] hover:brightness-105 active:scale-95'
                      : 'btn-neon bg-gradient-to-r from-[#00f5ff] via-[#22d3ee] to-[#38bdf8] text-slate-950 shadow-[0_0_25px_rgba(0,245,255,0.35)]'
                  }`}
                >
                  {busy || isLoading ? (
                    <span className="inline-flex items-center gap-2 font-bold">
                      <RefreshCw size={16} className="animate-spin" />
                      {mode === 'login' ? 'Authenticating...' : 'Creating account...'}
                    </span>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Authenticate' : 'Create Account'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Terms / note */}
                {mode === 'signup' && (
                  <p className={`text-center font-mono text-[10px] font-semibold ${
                    isLight ? 'text-[#64748B]' : 'text-slate-600'
                  }`}>
                    By registering you agree to operate within the ACDSF security policy. Passwords are hashed with bcrypt.
                  </p>
                )}
              </form>
            )}

          </div>
        </div>
      </section>
    </main>
  );
}
