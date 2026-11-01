import React from 'react';

const StatusBadge = ({ status, size = 'sm' }) => {
  const statusMap = {
    secure: { label: 'Secure', color: 'bg-green-500', text: 'text-green-400' },
    compromised: { label: 'Compromised', color: 'bg-red-500', text: 'text-red-400' },
    under_attack: { label: 'Under Attack', color: 'bg-yellow-500', text: 'text-yellow-400' },
    warning: { label: 'Warning', color: 'bg-orange-500', text: 'text-orange-400' },
    online: { label: 'Online', color: 'bg-green-500', text: 'text-green-400' },
    offline: { label: 'Offline', color: 'bg-gray-500', text: 'text-gray-400' },
  };

  const info = statusMap[status] || statusMap.secure;
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} font-medium ${info.text}`}>
      <span className={`${dotSize} rounded-full ${info.color} ${status === 'online' ? 'status-dot-online' : ''}`} />
      {info.label}
    </span>
  );
};

export default StatusBadge;