'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Users, Film, Download, Server, Play, Pause, Trash2, RefreshCw, Shield, BarChart3, Settings, Database, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [tab, setTab] = useState<'overview' | 'users' | 'downloads' | 'workers'>('overview');
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users?limit=50').then(r => r.data),
    enabled: tab === 'users',
  });

  const { data: tasksData } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: () => api.get('/tasks/all?limit=50').then(r => r.data),
    enabled: tab === 'downloads',
    refetchInterval: 5000,
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.post('/admin/workers/pause'),
    onSuccess: () => toast.success('Queue paused'),
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.post('/admin/workers/resume'),
    onSuccess: () => toast.success('Queue resumed'),
  });

  const clearFailedMutation = useMutation({
    mutationFn: () => api.post('/admin/workers/clear-failed'),
    onSuccess: () => { toast.success('Failed jobs cleared'); qc.invalidateQueries({ queryKey: ['admin-tasks'] }); },
  });

  const banMutation = useMutation({
    mutationFn: ({ id, ban, reason }: any) => api.patch(`/admin/users/${id}/ban`, { ban, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const STAT_CARDS = [
    { label: 'Total Users',    value: stats?.users,          icon: Users,    color: '#a855f7' },
    { label: 'Anime Library',  value: stats?.anime,          icon: Film,     color: '#06b6d4' },
    { label: 'Episodes',       value: stats?.episodes,       icon: Play,     color: '#10b981' },
    { label: 'Total Downloads',value: stats?.tasks,          icon: Download, color: '#f97316' },
    { label: 'Active DLs',    value: stats?.activeDownloads, icon: Zap,      color: '#ec4899' },
    { label: 'Queue Waiting',  value: stats?.queue?.waiting, icon: Server,   color: '#eab308' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
          <Shield className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'Orbitron, monospace' }}>Admin Panel</h1>
          <p className="text-xs text-[#8888aa]">System control center</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {STAT_CARDS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-[#131320] border border-[rgba(124,58,237,0.1)]">
            <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value ?? '—'}</p>
            <p className="text-xs text-[#8888aa] mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#131320] mb-6 w-fit">
        {[
          { id: 'overview', icon: BarChart3, label: 'Overview'  },
          { id: 'users',    icon: Users,     label: 'Users'     },
          { id: 'downloads',icon: Download,  label: 'Downloads' },
          { id: 'workers',  icon: Server,    label: 'Workers'   },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-violet-600 text-white' : 'text-[#8888aa] hover:text-white'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Workers Tab ── */}
      {tab === 'workers' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#131320] border border-[rgba(124,58,237,0.15)]">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Server className="w-4 h-4 text-violet-400" />Worker Controls</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => resumeMutation.mutate()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all">
                <Play className="w-4 h-4" /> Resume Queue
              </button>
              <button onClick={() => pauseMutation.mutate()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/30 transition-all">
                <Pause className="w-4 h-4" /> Pause Queue
              </button>
              <button onClick={() => clearFailedMutation.mutate()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all">
                <Trash2 className="w-4 h-4" /> Clear Failed
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {[
                { label: 'Waiting', value: stats?.queue?.waiting, color: '#8888aa' },
                { label: 'Active',  value: stats?.queue?.active,  color: '#06b6d4' },
                { label: 'Done',    value: stats?.queue?.completed, color: '#10b981' },
                { label: 'Failed',  value: stats?.queue?.failed,  color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg bg-[#0a0a0f] text-center">
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
                  <p className="text-xs text-[#8888aa]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <div className="rounded-2xl bg-[#131320] border border-[rgba(124,58,237,0.15)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[rgba(255,255,255,0.05)]">
                <tr className="text-[#8888aa] text-xs uppercase">
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Downloads</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.data?.map((u: any) => (
                  <tr key={u._id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#f1f1f8]">{u.username}</p>
                          <p className="text-xs text-[#8888aa]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`tag-badge ${u.role === 'admin' ? '!text-red-400 !border-red-400/30' : u.role === 'moderator' ? '!text-cyan-400 !border-cyan-400/30' : ''}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#8888aa]">{u.totalDownloads || 0}</td>
                    <td className="px-4 py-3 text-[#8888aa] text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {!u.isBanned ? (
                        <button onClick={() => banMutation.mutate({ id: u._id, ban: true, reason: 'Admin action' })}
                          className="px-2 py-1 rounded text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all">
                          Ban
                        </button>
                      ) : (
                        <button onClick={() => banMutation.mutate({ id: u._id, ban: false })}
                          className="px-2 py-1 rounded text-xs text-green-400 bg-green-400/10 hover:bg-green-400/20 transition-all">
                          Unban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Downloads Tab ── */}
      {tab === 'downloads' && (
        <div className="rounded-2xl bg-[#131320] border border-[rgba(124,58,237,0.15)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[rgba(255,255,255,0.05)]">
                <tr className="text-[#8888aa] text-xs uppercase">
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Progress</th>
                  <th className="px-4 py-3 text-left">Quality</th>
                </tr>
              </thead>
              <tbody>
                {tasksData?.data?.map((t: any) => (
                  <tr key={t._id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#f1f1f8] max-w-xs truncate">{t.title}</td>
                    <td className="px-4 py-3 text-[#8888aa]">{t.user?.username || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`status-${t.status} text-xs font-medium`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-20 progress-bar h-1.5">
                        <div className="progress-bar-fill" style={{ width: `${t.progress}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#8888aa]">{t.quality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
