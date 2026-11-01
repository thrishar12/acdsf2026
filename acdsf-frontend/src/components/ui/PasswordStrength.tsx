/**
 * Password Strength Meter
 * Shows a 4-segment bar + label + checklist of requirements
 */

interface Props {
  password: string;
  className?: string;
}

interface Requirement {
  label: string;
  test: (p: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: 'At least 8 characters',          test: (p) => p.length >= 8 },
  { label: 'Uppercase letter (A-Z)',          test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a-z)',          test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0-9)',                    test: (p) => /\d/.test(p) },
  { label: 'Special character (!@#$%^&…)',    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(p) },
];

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  const passed = REQUIREMENTS.filter((r) => r.test(password)).length;
  if (!password)         return { score: 0, label: '',         color: '#1e293b' };
  if (passed <= 1)       return { score: 1, label: 'Weak',     color: '#ef4444' };
  if (passed === 2)      return { score: 2, label: 'Fair',     color: '#f59e0b' };
  if (passed === 3)      return { score: 3, label: 'Good',     color: '#06b6d4' };
  if (passed === 4)      return { score: 4, label: 'Strong',   color: '#10b981' };
  return                        { score: 5, label: 'Maximum',  color: '#a855f7' };
}

export function PasswordStrengthMeter({ password, className = '' }: Props) {
  const { score, label, color } = getPasswordStrength(password);
  const segments = 5;

  if (!password) return null;

  return (
    <div className={`space-y-2 ${className}`} aria-label="Password strength">
      {/* Segmented bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i < score ? color : 'rgba(255,255,255,0.08)',
                opacity: i < score ? (0.6 + (i / segments) * 0.4) : 1,
              }}
            />
          ))}
        </div>
        {label && (
          <span
            className="font-mono text-[10px] uppercase tracking-widest font-bold min-w-[52px] text-right transition-colors duration-300"
            style={{ color }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Requirement checklist */}
      <ul className="grid grid-cols-1 gap-0.5">
        {REQUIREMENTS.map((req) => {
          const ok = req.test(password);
          return (
            <li
              key={req.label}
              className="flex items-center gap-1.5 font-mono text-[10px] transition-colors duration-200"
              style={{ color: ok ? '#10b981' : '#475569' }}
            >
              <span className="text-[11px]">{ok ? '✓' : '·'}</span>
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
