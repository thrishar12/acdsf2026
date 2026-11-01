import React from 'react';

export function RadarPingIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 48 48" className="overflow-visible">
        {/* Outer Grid */}
        <circle cx="24" cy="24" r="22" fill="none" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="24" cy="24" r="15" fill="none" stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="24" cy="24" r="7" fill="#00f5ff" fillOpacity="0.2" stroke="#00f5ff" strokeWidth="1.2" />
        {/* Crosshair grid */}
        <line x1="2" y1="24" x2="46" y2="24" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="0.8" />
        <line x1="24" y1="2" x2="24" y2="46" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="0.8" />
        {/* Rotating sweep */}
        <path d="M24 24 L24 2 A 22 22 0 0 1 44 24 Z" fill="url(#radarGradient)" className="radar-sweep" />
        {/* Ping blip */}
        <circle cx="34" cy="14" r="2" fill="#ff007f" className="animate-ping" style={{ transformOrigin: '34px 14px' }} />
        <circle cx="34" cy="14" r="2" fill="#ff007f" />
        <defs>
          <radialGradient id="radarGradient" cx="24" cy="24" r="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00f5ff" stopOpacity="0.02" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export function ShieldHoloIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
      >
        <path
          d="M24 4 L40 10 V22 C40 33 24 44 24 44 C24 44 8 33 8 22 V10 Z"
          fill="rgba(0, 245, 255, 0.12)"
          stroke="#00f5ff"
          strokeWidth="1.8"
        />
        <path
          d="M24 10 L34 14 V22 C34 30 24 38 24 38 C24 38 14 30 14 22 V14 Z"
          fill="none"
          stroke="#00ff9d"
          strokeWidth="1.2"
          strokeDasharray="4 2"
        />
        {/* Central Core */}
        <circle cx="24" cy="23" r="4" fill="#00ff9d" className="animate-pulse" />
      </svg>
    </div>
  );
}

export function GlitchTargetIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`group relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
      >
        <circle cx="24" cy="24" r="20" fill="rgba(255, 0, 127, 0.08)" stroke="#ff007f" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="12" fill="none" stroke="#f43f5e" strokeWidth="1" strokeDasharray="6 3" />
        <circle cx="24" cy="24" r="4" fill="#ff007f" />
        {/* Reticle brackets */}
        <path d="M10 24 H4 M44 24 H38 M24 10 V4 M24 44 V38" stroke="#ff007f" strokeWidth="2" />
      </svg>
    </div>
  );
}

export function DataStreamIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect x="6" y="8" width="36" height="32" rx="4" fill="rgba(168, 85, 247, 0.12)" stroke="#a855f7" strokeWidth="1.5" />
        <line x1="12" y1="18" x2="36" y2="18" stroke="#00f5ff" strokeWidth="2" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1s" repeatCount="indefinite" />
        </line>
        <line x1="12" y1="24" x2="28" y2="24" stroke="#00ff9d" strokeWidth="2" strokeDasharray="3 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-15" dur="1.2s" repeatCount="indefinite" />
        </line>
        <line x1="12" y1="30" x2="32" y2="30" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2">
          <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="0.8s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

export function BioHexIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 48 48">
        <polygon
          points="24,4 42,14 42,34 24,44 6,34 6,14"
          fill="rgba(0, 255, 157, 0.15)"
          stroke="#00ff9d"
          strokeWidth="1.8"
        />
        <polygon
          points="24,12 34,18 34,30 24,36 14,30 14,18"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <circle cx="24" cy="24" r="3.5" fill="#00ff9d" className="animate-ping" style={{ transformOrigin: '24px 24px' }} />
        <circle cx="24" cy="24" r="3.5" fill="#00ff9d" />
      </svg>
    </div>
  );
}

export function ApertureLockIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
      >
        <circle cx="24" cy="24" r="21" fill="none" stroke="#00f5ff" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="10" fill="rgba(0, 245, 255, 0.15)" stroke="#00ff9d" strokeWidth="1.5" />
        <path d="M24 3 L28 15 M45 24 L33 28 M24 45 L20 33 M3 24 L15 20" stroke="#00f5ff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function PulseBeacon({ color = 'cyan', size = 'md' }: { color?: 'cyan' | 'magenta' | 'acid' | 'warn'; size?: 'sm' | 'md' | 'lg' }) {
  const colorMap = {
    cyan: 'bg-[#00f5ff] text-[#00f5ff]',
    magenta: 'bg-[#ff007f] text-[#ff007f]',
    acid: 'bg-[#00ff9d] text-[#00ff9d]',
    warn: 'bg-[#fbbf24] text-[#fbbf24]',
  };

  const sizeMap = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
  };

  return (
    <span className="relative flex items-center justify-center">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorMap[color]}`} />
      <span className={`relative inline-flex rounded-full ${sizeMap[size]} ${colorMap[color]}`} />
    </span>
  );
}
