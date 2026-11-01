import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';

const Header = ({ isOnline, lastUpdate, onRefresh }) => {
  return (
    <header className="border-b border-gray-800/50 bg-gradient-dark">
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center glow-blue">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              AI Cyber Defence Simulation
            </h1>
            <p className="text-xs text-gray-400">
              Real-time network monitoring & AI-powered defense
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 status-dot-online' : 'bg-red-500'}`} />
            <span className={`text-sm font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <span className="text-xs text-gray-500 hidden sm:block">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;