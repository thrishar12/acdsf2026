import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

const NetworkTable = ({ nodes, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('node_id');
  const [sortDirection, setSortDirection] = useState('asc');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-400">Loading nodes...</div>
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-400">No nodes found.</div>
      </div>
    );
  }

  const filteredNodes = nodes.filter(node =>
    node.node_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.sector || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedNodes = [...filteredNodes].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatus = (node) => {
    if (node.is_compromised) return 'compromised';
    if (node.cpu_load > 80) return 'under_attack';
    return 'secure';
  };

  const getSectorColor = (sector) => {
    const colors = {
      Government: 'border-blue-400/30 bg-blue-400/5 text-blue-400',
      Energy: 'border-orange-400/30 bg-orange-400/5 text-orange-400',
      Finance: 'border-green-400/30 bg-green-400/5 text-green-400',
      Telecom: 'border-purple-400/30 bg-purple-400/5 text-purple-400',
      Water: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-400',
      Transport: 'border-yellow-400/30 bg-yellow-400/5 text-yellow-400',
      backbone: 'border-gray-400/30 bg-gray-400/5 text-gray-400',
    };
    return colors[sector] || colors.backbone;
  };

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-xs text-gray-500">
          {filteredNodes.length} / {nodes.length} nodes
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                onClick={() => handleSort('node_id')}
              >
                <div className="flex items-center gap-1">
                  Node ID
                  {sortField === 'node_id' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                onClick={() => handleSort('sector')}
              >
                <div className="flex items-center gap-1">
                  Sector
                  {sortField === 'sector' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                onClick={() => handleSort('cpu_load')}
              >
                <div className="flex items-center gap-1">
                  CPU
                  {sortField === 'cpu_load' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                onClick={() => handleSort('alert_count')}
              >
                <div className="flex items-center gap-1">
                  Alerts
                  {sortField === 'alert_count' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {sortedNodes.map((node) => (
              <tr key={node.node_id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-gray-300">
                  {node.node_id}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getSectorColor(node.sector)}`}>
                    {node.sector || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          node.cpu_load > 80 ? 'bg-red-500' : 
                          node.cpu_load > 50 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(node.cpu_load || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10">{node.cpu_load || 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={getStatus(node)} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${node.alert_count > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {node.alert_count || 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NetworkTable;