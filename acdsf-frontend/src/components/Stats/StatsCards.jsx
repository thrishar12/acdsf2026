import React from 'react';
import { Server, Shield, Cpu, AlertTriangle } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
  <div className="bg-gradient-card rounded-xl border border-gray-800/50 p-5 card-hover">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </div>
);

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const { total, compromised, avgCpu, totalAlerts, secure } = stats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Server}
        label="Total Nodes"
        value={total}
        subtext={`${secure} secure, ${compromised} compromised`}
        color="text-blue-400"
      />
      <StatCard
        icon={Shield}
        label="Secure"
        value={secure}
        subtext={`${total > 0 ? Math.round((secure/total)*100) : 0}% of network`}
        color="text-green-400"
      />
      <StatCard
        icon={Cpu}
        label="Avg CPU Load"
        value={`${avgCpu.toFixed(1)}%`}
        subtext={avgCpu > 70 ? '⚠️ High load detected' : '✅ Normal operation'}
        color="text-purple-400"
      />
      <StatCard
        icon={AlertTriangle}
        label="Total Alerts"
        value={totalAlerts}
        subtext={totalAlerts > 0 ? '⚠️ Actions required' : '✅ No alerts'}
        color="text-yellow-400"
      />
    </div>
  );
};

export default StatsCards;