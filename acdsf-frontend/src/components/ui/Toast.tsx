/**
 * ACDSF — Global Toast Notification System (v2)
 * Supports: critical/high/medium/info/success severities
 * Features: severity glow, shield icon for "caught", hover-pause, click-through, stacked
 */
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, Shield, Siren } from 'lucide-react';

export type ToastSeverity = 'success' | 'critical' | 'high' | 'medium' | 'info' | 'error' | 'warning';

interface ToastItem {
  id: string;
  severity: ToastSeverity;
  title: string;
  message: string;
  type?: string;
  duration?: number; // ms, 0 = sticky
  onClick?: () => void;
}

// ── Singleton event bus ──────────────────────────────────────────────────────
const listeners: Array<(item: ToastItem) => void> = [];
function emit(item: ToastItem) {
  listeners.forEach(fn => fn(item));
}

// ── Public API ───────────────────────────────────────────────────────────────
export const toast = {
  success: (message: string, title = 'Success', extra?: Partial<ToastItem>) =>
    emit({ id: crypto.randomUUID(), severity: 'success', title, message, duration: 6000, ...extra }),
  error: (message: string, title = 'Error', extra?: Partial<ToastItem>) =>
    emit({ id: crypto.randomUUID(), severity: 'error', title, message, duration: 7000, ...extra }),
  warning: (message: string, title = 'Warning', extra?: Partial<ToastItem>) =>
    emit({ id: crypto.randomUUID(), severity: 'warning', title, message, duration: 6000, ...extra }),
  info: (message: string, title = 'Info', extra?: Partial<ToastItem>) =>
    emit({ id: crypto.randomUUID(), severity: 'info', title, message, duration: 5000, ...extra }),
  critical: (message: string, title = 'Critical', extra?: Partial<ToastItem>) =>
    emit({ id: crypto.randomUUID(), severity: 'critical', title, message, duration: 0, ...extra }),
  high: (message: string, title = 'Alert', extra?: Partial<ToastItem>) =>
    emit({ id: crypto.randomUUID(), severity: 'high', title, message, duration: 8000, ...extra }),
  attack: (type: string, title: string, message: string, extra?: Partial<ToastItem>) =>
    emit({
      id: crypto.randomUUID(),
      severity: type === 'ATTACK_CAUGHT' ? 'success'
        : type === 'ATTACK_MISSED' ? 'critical'
        : type === 'ATTACK_LAUNCHED' ? 'medium'
        : type === 'ATTACK_DETECTED' ? 'high'
        : 'info',
      title,
      message,
      type,
      duration: type === 'ATTACK_CAUGHT' || type === 'ATTACK_MISSED' ? 0 : 8000,
      ...extra,
    }),
};

// Compatibility helper
export function mountToastContainer() {
  // ToastContainer is rendered inside the React root hierarchy (App.tsx)
}

// ── Severity Config ───────────────────────────────────────────────────────────
const SEV_CONFIG: Record<ToastSeverity, { border: string; glow: string; icon: string; label: string; labelColor: string }> = {
  success: {
    border: 'border-emerald-500/60',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    icon: '#10b981',
    label: 'SUCCESS',
    labelColor: 'text-emerald-400',
  },
  critical: {
    border: 'border-rose-500/80',
    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
    icon: '#ef4444',
    label: 'CRITICAL',
    labelColor: 'text-rose-400',
  },
  high: {
    border: 'border-orange-500/60',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.35)]',
    icon: '#f97316',
    label: 'HIGH',
    labelColor: 'text-orange-400',
  },
  medium: {
    border: 'border-amber-500/60',
    glow: 'shadow-[0_0_18px_rgba(245,158,11,0.3)]',
    icon: '#f59e0b',
    label: 'MEDIUM',
    labelColor: 'text-amber-400',
  },
  warning: {
    border: 'border-yellow-500/60',
    glow: 'shadow-[0_0_18px_rgba(234,179,8,0.3)]',
    icon: '#eab308',
    label: 'WARNING',
    labelColor: 'text-yellow-400',
  },
  info: {
    border: 'border-cyan-500/50',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.25)]',
    icon: '#06b6d4',
    label: 'INFO',
    labelColor: 'text-cyan-400',
  },
  error: {
    border: 'border-red-500/60',
    glow: 'shadow-[0_0_20px_rgba(220,38,38,0.4)]',
    icon: '#dc2626',
    label: 'ERROR',
    labelColor: 'text-red-400',
  },
};

function getIcon(item: ToastItem) {
  if (item.type === 'ATTACK_CAUGHT') return Shield;
  if (item.severity === 'success') return CheckCircle2;
  if (item.severity === 'critical' || item.severity === 'error') return XCircle;
  if (item.severity === 'high') return AlertTriangle;
  return Info;
}

// ── Individual Toast ──────────────────────────────────────────────────────────
function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const sev = item.severity as ToastSeverity;
  const cfg = SEV_CONFIG[sev] || SEV_CONFIG.info;
  const Icon = getIcon(item);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const startTimer = useCallback(() => {
    if (!item.duration) return;
    timerRef.current = setTimeout(onRemove, item.duration);
  }, [item.duration, onRemove]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [startTimer]);

  const isAttackCaught = item.type === 'ATTACK_CAUGHT';

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      onClick={item.onClick}
      className={`
        relative flex items-start gap-3 rounded-xl px-4 py-3.5
        border backdrop-blur-xl
        bg-[#0d141e]/95
        ${cfg.border} ${cfg.glow}
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
        ${item.onClick ? 'cursor-pointer hover:brightness-110' : ''}
        ${isAttackCaught ? 'ring-1 ring-emerald-400/40' : ''}
        max-w-sm w-full
      `}
      style={{ minWidth: '320px' }}
    >
      {/* Severity top border accent */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl`} style={{ background: cfg.icon }} />

      <div className="flex-shrink-0 mt-0.5">
        <Icon size={isAttackCaught ? 20 : 16} style={{ color: cfg.icon }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${cfg.labelColor}`}>
            {cfg.label}
          </span>
          <span className="text-slate-500 font-mono text-[9px]">•</span>
          <span className="text-slate-300 text-xs font-semibold truncate">{item.title}</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">{item.message}</p>
        {!item.duration && (
          <p className="text-slate-600 text-[9px] mt-1 font-mono">Click × to dismiss</p>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Dismiss"
        className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setItems(prev => [...prev.slice(-5), item]); // max 6 toasts
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const remove = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  if (items.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
      aria-live="polite"
    >
      {items.map(item => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItem item={item} onRemove={() => remove(item.id)} />
        </div>
      ))}
    </div>
  );
}
