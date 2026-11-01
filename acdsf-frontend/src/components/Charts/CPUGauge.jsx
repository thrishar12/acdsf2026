import React from 'react';

const CPUGauge = ({ value, label, size = 'md' }) => {
  const percentage = Math.min(Math.max(value || 0, 0), 100);
  
  const getColor = () => {
    if (percentage > 80) return 'text-red-400';
    if (percentage > 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRingColor = () => {
    if (percentage > 80) return 'stroke-red-500';
    if (percentage > 50) return 'stroke-yellow-500';
    return 'stroke-green-500';
  };

  const sizeMap = {
    sm: { w: 16, h: 16, text: 'text-xs' },
    md: { w: 24, h: 24, text: 'text-sm' },
    lg: { w: 32, h: 32, text: 'text-lg' },
  };

  const { w, h, text } = sizeMap[size] || sizeMap.md;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={w * 4} height={h * 4} viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#1a2332"
            strokeWidth="12"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className={`${getRingColor()} transition-all duration-1000 ease-out`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
            }}
          />
          <text
            x="60"
            y="65"
            textAnchor="middle"
            className={`${getColor()} font-bold ${text}`}
          >
            {Math.round(percentage)}%
          </text>
        </svg>
      </div>
      {label && <p className="text-xs text-gray-500 mt-1">{label}</p>}
    </div>
  );
};

export default CPUGauge;