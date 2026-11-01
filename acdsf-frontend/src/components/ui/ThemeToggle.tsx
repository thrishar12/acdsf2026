import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStoredTheme, toggleTheme, type Theme } from '../../utils/theme';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  const isLight = theme === 'light';

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode (Report Mode)'}
        className={`flex items-center justify-center rounded-lg border p-2 transition-all duration-200 ${
          isLight
            ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'
            : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300'
        }`}
      >
        {isLight ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Theme (Pink & Yellow Edition)'}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition-all duration-150 ${
        isLight
          ? 'border-[#FECDD3] bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] active:scale-95 shadow-sm'
          : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300'
      }`}
    >
      {isLight ? (
        <>
          <Sun size={13} className="text-[#D97706]" />
          <span>LIGHT</span>
        </>
      ) : (
        <>
          <Moon size={13} />
          <span>DARK</span>
        </>
      )}
    </button>
  );
}
