import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Clock,
  History,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { CyberBadge } from '../components/ui/CyberBadge';
import { toast } from '../components/ui/Toast';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { PulseBeacon } from '../components/ui/CyberIcons';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

interface UserRecord {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login?: string;
}

interface AuditLogRecord {
  id: number;
  user_id?: number;
  email?: string;
  action: string;
  ip?: string;
  user_agent?: string;
  details?: string;
  timestamp: string;
}

const ROLES = [
  { id: 'admin', label: 'Admin', tone: 'magenta' as const, desc: 'Full system sovereignty' },
  { id: 'analyst', label: 'Analyst', tone: 'acid' as const, desc: 'Triage & threat assessment' },
  { id: 'red-team', label: 'Red Team', tone: 'warn' as const, desc: 'Adversary simulation' },
  { id: 'blue-team', label: 'Blue Team', tone: 'cyan' as const, desc: 'Active mitigation & defense' },
  { id: 'viewer', label: 'Viewer', tone: 'violet' as const, desc: 'Read-only telemetry observer' },
];

export function UsersPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});

  const isAdmin = user?.role === 'admin';

  const fetchUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user directory');
      }
      const data = await res.json();
      setUsers(data.users || []);
      const roleMap: Record<number, string> = {};
      (data.users || []).forEach((u: UserRecord) => {
        roleMap[u.id] = u.role;
      });
      setSelectedRoles(roleMap);
    } catch (err: any) {
      toast.error(err.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/audit-log?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.audit_log || []);
      }
    } catch {
      // Non-critical background fetch failure
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchAuditLogs();
    } else {
      setLoading(false);
    }
  }, [isAdmin, token]);

  const handleRoleChange = async (userId: number) => {
    const targetRole = selectedRoles[userId];
    if (!targetRole || !token) return;

    setUpdatingRole(userId);
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: targetRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }

      toast.success(`Role updated to ${targetRole.toUpperCase()}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u))
      );
      fetchAuditLogs();
    } catch (err: any) {
      toast.error(err.message || 'Error updating clearance');
    } finally {
      setUpdatingRole(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      analysts: users.filter((u) => u.role === 'analyst').length,
      operators: users.filter((u) => u.role === 'red-team' || u.role === 'blue-team').length,
    };
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <GlassCard className="p-8 text-center space-y-4 border-rose-500/30">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(244,63,94,0.3)]">
            <Shield size={32} />
          </div>
          <h2 className="text-xl font-bold tracking-wider text-white font-display uppercase">
            RESTRICTED ACCESS LEVEL // CLEARANCE DENIED
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            User and Identity Access Management is restricted to Sovereign Administrators. Your current clearance level is <span className="font-mono text-cyan-400 font-bold uppercase">{user?.role}</span>.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-cyan-500/20 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-950/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <KeyRound size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white font-display uppercase flex items-center gap-3">
                IAM &amp; Access Sovereignty
                <CyberBadge label="ENCRYPTED REGISTRY" tone="acid" size="sm" />
              </h1>
              <p className="font-mono text-xs text-slate-400">
                Manage operator clearances, roles, credentials, and track sovereign audit trails
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'border border-white/10 bg-black/40 text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <Users size={14} />
            OPERATOR DIRECTORY ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'border border-purple-500/50 bg-purple-950/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'border border-white/10 bg-black/40 text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <History size={14} />
            AUDIT LOG ({auditLogs.length})
          </button>
          <button
            onClick={() => {
              fetchUsers();
              fetchAuditLogs();
            }}
            title="Refresh Registry"
            className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2 text-cyan-300 transition-all hover:bg-cyan-900/40 hover:border-cyan-400 hover:brightness-110"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Total Operators</span>
            <Users size={16} className="text-cyan-400" />
          </div>
          <p className="font-display text-2xl font-bold text-white mt-2">{stats.total}</p>
          <span className="font-mono text-[10px] text-cyan-400/80">Active registered identities</span>
        </GlassCard>

        <GlassCard className="p-4 border-pink-500/20 bg-gradient-to-br from-pink-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Sovereign Admins</span>
            <Shield size={16} className="text-pink-400" />
          </div>
          <p className="font-display text-2xl font-bold text-pink-300 mt-2">{stats.admins}</p>
          <span className="font-mono text-[10px] text-pink-400/80">Full administrative sovereignty</span>
        </GlassCard>

        <GlassCard className="p-4 border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">SOC Analysts</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <p className="font-display text-2xl font-bold text-emerald-300 mt-2">{stats.analysts}</p>
          <span className="font-mono text-[10px] text-emerald-400/80">Telemetry &amp; Incident Triage</span>
        </GlassCard>

        <GlassCard className="p-4 border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Tactical Red/Blue</span>
            <PulseBeacon color="cyan" size="sm" />
          </div>
          <p className="font-display text-2xl font-bold text-purple-300 mt-2">{stats.operators}</p>
          <span className="font-mono text-[10px] text-purple-400/80">Active Combat Operators</span>
        </GlassCard>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by full name, email, or username..."
                className="w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-4 py-2.5 font-mono text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-56">
              <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                aria-label="Filter operators by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/60 pl-10 pr-8 py-2.5 font-mono text-xs text-cyan-300 outline-none focus:border-cyan-500/60 transition-all"
              >
                <option value="all">ALL CLEARANCES</option>
                <option value="admin">ADMIN ONLY</option>
                <option value="analyst">ANALYST ONLY</option>
                <option value="red-team">RED TEAM ONLY</option>
                <option value="blue-team">BLUE TEAM ONLY</option>
                <option value="viewer">VIEWER ONLY</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <GlassCard className="overflow-hidden border-cyan-500/20">
            {loading ? (
              <div className="p-6 space-y-4">
                <SkeletonCard lines={4} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <UserX size={32} className="mx-auto text-slate-500" />
                <p className="font-mono text-xs text-slate-400 uppercase tracking-widest">No matching operators detected</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-4">Operator Dossier</th>
                      <th className="py-3 px-4">Contact Coordinate</th>
                      <th className="py-3 px-4">Active Clearance</th>
                      <th className="py-3 px-4">Promotion / Clearance Reassign</th>
                      <th className="py-3 px-4">Registration</th>
                      <th className="py-3 px-4">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const roleConfig = ROLES.find((r) => r.id === u.role) || ROLES[1];
                      const currentSelected = selectedRoles[u.id] || u.role;
                      const hasChanged = currentSelected !== u.role;
                      const isSelf = u.email === user?.email;

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 font-mono text-xs font-bold text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                {u.full_name ? u.full_name.slice(0, 2).toUpperCase() : u.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white text-xs tracking-wide flex items-center gap-2">
                                  {u.full_name || u.username}
                                  {isSelf && (
                                    <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold text-cyan-300 border border-cyan-500/40">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-500 tracking-wider font-mono">@{u.username}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4">
                            <CyberBadge
                              label={roleConfig.label}
                              tone={roleConfig.tone}
                              size="sm"
                            />
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                aria-label={`Change clearance role for ${u.full_name || u.username}`}
                                value={currentSelected}
                                disabled={updatingRole === u.id}
                                onChange={(e) =>
                                  setSelectedRoles({ ...selectedRoles, [u.id]: e.target.value })
                                }
                                className="rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-xs font-mono text-slate-200 outline-none focus:border-cyan-400"
                              >
                                {ROLES.map((r) => (
                                  <option key={r.id} value={r.id} className="bg-black text-white">
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                              {hasChanged && (
                                <button
                                  onClick={() => handleRoleChange(u.id)}
                                  disabled={updatingRole === u.id}
                                  className="flex items-center gap-1 rounded-lg border border-pink-500/50 bg-pink-950/40 px-2.5 py-1 text-[10px] font-bold text-pink-300 hover:bg-pink-900/60 hover:shadow-[0_0_12px_rgba(236,72,153,0.4)] transition-all"
                                >
                                  {updatingRole === u.id ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={11} />
                                  )}
                                  APPLY
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-[10px] text-slate-400">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                          </td>

                          <td className="py-3.5 px-4 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-slate-500" />
                              {u.last_login ? new Date(u.last_login).toLocaleTimeString() : 'Never'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      ) : (
        /* Audit Log Table */
        <GlassCard className="overflow-hidden border-purple-500/20">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <History size={16} className="text-purple-400" />
              <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                Sovereign Security Events &amp; Authentication Trail
              </h2>
            </div>
            <span className="font-mono text-[10px] text-purple-300">Latest 100 immutable events</span>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead className="sticky top-0 bg-[#080d1a] border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-widest z-10">
                <tr>
                  <th className="py-2.5 px-4">Event ID</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Operator Email</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Details / Metadata</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No security audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const isAlert = log.action.includes('FAIL') || log.action.includes('RESET');
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 text-[10px]">#{log.id}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                              isAlert
                                ? 'border border-pink-500/40 bg-pink-950/40 text-pink-300'
                                : 'border border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{log.email || 'System'}</td>
                        <td className="py-2.5 px-4 text-cyan-400 font-mono text-[10px]">{log.ip || '127.0.0.1'}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-[10px] truncate max-w-xs" title={log.details}>
                          {log.details || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[10px]">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
