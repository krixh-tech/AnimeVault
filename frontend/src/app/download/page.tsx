'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Link as LinkIcon, Search, Play, Trash2, RotateCcw,
  XCircle, CheckCircle, Loader2, Clock, Zap, Film, ListPlus, AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  queued:      { label: 'Queued',      color: '#8888aa', icon: Clock     },
  downloading: { label: 'Downloading', color: '#06b6d4', icon: Download  },
  encoding:    { label: 'Encoding',    color: '#f97316', icon: Zap       },
  completed:   { label: 'Completed',   color: '#10b981', icon: CheckCircle },
  failed:      { label: 'Failed',      color: '#ef4444', icon: AlertCircle },
  cancelled:   { label: 'Cancelled',   color: '#6b7280', icon: XCircle   },
};

function formatBytes(bytes: number) {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DownloadPage() {
  const [tab, setTab] = useState<'new' | 'queue'>('new');
  const [url, setUrl] = useState('');
  const [detected, setDetected] = useState<any>(null);
  const [detecting, setDetecting] = useState(false);
  const [quality, setQuality] = useState('720p');
  const [encode, setEncode] = useState(false);
  const queryClient = useQueryClient();

  // Live task updates via socket
  useSocket('task:update', (data: any) => {
    queryClient.setQueryData(['tasks'], (old: any) => ({
      ...old,
      data: old?.data?.map((t: any) => t._id === data.taskId ? { ...t, ...data } : t),
    }));
  });

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/downloads/tasks').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ['download-stats'],
    queryFn: () => api.get('/downloads/tasks/stats').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const detectMutation = useMutation({
    mutationFn: (url: string) => api.post('/downloads/detect', { url }).then(r => r.data.data),
    onSuccess: (data) => { setDetected(data); },
    onError: () => toast.error('Failed to detect video sources'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/downloads/tasks', data),
    onSuccess: () => {
      toast.success('Download queued!');
      setTab('queue');
      setUrl('');
      setDetected(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to queue download'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/downloads/tasks/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/downloads/tasks/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/downloads/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleDetect = async () => {
    if (!url.trim()) return;
    setDetecting(true);
    setDetected(null);
    await detectMutation.mutateAsync(url.trim());
    setDetecting(false);
  };

  const handleQueue = () => {
    if (!detected) return;
    createMutation.mutate({
      videoUrl: detected.downloadUrl || detected.sources?.[0]?.url,
      quality,
      animeTitle: detected.series || 'Unknown Anime',
      episodeNumber: detected.episode,
      encode,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'Orbitron, monospace', background: 'linear-gradient(90deg, #a855f7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Download Manager
        </h1>
        <p className="text-[#8888aa] text-sm">Paste any anime URL and we'll handle the rest</p>
      </motion.div>

      {/* ── Stats Bar ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: '#8888aa' },
            { label: 'Active', value: stats.active, color: '#06b6d4' },
            { label: 'Done', value: stats.completed, color: '#10b981' },
            { label: 'Storage', value: formatBytes(stats.storageUsed), color: '#a855f7' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl bg-[#131320] border border-[rgba(124,58,237,0.1)] text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#8888aa] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#131320] mb-6 w-fit">
        {[{ id: 'new', label: 'New Download', icon: Download }, { id: 'queue', label: `Queue (${tasksData?.data?.length ?? 0})`, icon: ListPlus }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'text-[#8888aa] hover:text-white'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'new' && (
          <motion.div key="new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* URL Input */}
            <div className="p-6 rounded-2xl bg-[#131320] border border-[rgba(124,58,237,0.15)] space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-violet-400" />
                Smart URL Detection
              </h2>
              <div className="flex gap-3">
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDetect()}
                  placeholder="Paste anime episode URL here..."
                  className="flex-1 bg-[#0a0a0f] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-sm text-[#f1f1f8] placeholder-[#8888aa] outline-none focus:border-violet-500 transition-all"
                />
                <button onClick={handleDetect} disabled={detecting || !url.trim()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all">
                  {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Detect
                </button>
              </div>

              {/* Detection Result */}
              <AnimatePresence>
                {detected && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-[#0a0a0f] border border-violet-500/30 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-violet-300">{detected.series || 'Unknown Series'}</p>
                        {detected.episode && <p className="text-sm text-[#8888aa]">Episode {detected.episode}</p>}
                        {detected.site && <p className="text-xs text-[#8888aa] mt-1">Source: {detected.site}</p>}
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    </div>

                    {/* Sources list */}
                    {detected.sources?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-[#8888aa] font-medium">DETECTED SOURCES</p>
                        <div className="flex flex-wrap gap-2">
                          {detected.sources.map((s: any, i: number) => (
                            <span key={i} className={`px-2 py-1 rounded text-xs border ${s.type === 'hls' ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-violet-500/40 text-violet-300 bg-violet-500/10'}`}>
                              {s.quality} · {s.type.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Options */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[#8888aa]">Quality</label>
                        <select value={quality} onChange={e => setQuality(e.target.value)}
                          className="bg-[#1c1c2e] border border-[rgba(124,58,237,0.2)] rounded px-2 py-1 text-xs text-white outline-none">
                          {['360p', '480p', '720p', '1080p'].map(q => <option key={q}>{q}</option>)}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[#8888aa] cursor-pointer">
                        <input type="checkbox" checked={encode} onChange={e => setEncode(e.target.checked)} className="accent-violet-500" />
                        Re-encode (FFmpeg)
                      </label>
                    </div>

                    <button onClick={handleQueue} disabled={createMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Queue Download
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {tab === 'queue' && (
          <motion.div key="queue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {loadingTasks ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))
            ) : tasksData?.data?.length === 0 ? (
              <div className="text-center py-20 text-[#8888aa]">
                <Download className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No downloads yet</p>
              </div>
            ) : (
              tasksData?.data?.map((task: any) => (
                <TaskCard key={task._id} task={task}
                  onCancel={() => cancelMutation.mutate(task._id)}
                  onRetry={() => retryMutation.mutate(task._id)}
                  onDelete={() => deleteMutation.mutate(task._id)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, onCancel, onRetry, onDelete }: { task: any; onCancel: () => void; onRetry: () => void; onDelete: () => void }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.queued;
  const Icon = cfg.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-[#131320] border border-[rgba(124,58,237,0.1)] hover:border-[rgba(124,58,237,0.2)] transition-all">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}>
          <Icon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm text-[#f1f1f8] truncate">{task.title}</p>
            <span className="text-xs shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>

          <p className="text-xs text-[#8888aa] mb-2">
            {task.quality} · {task.language?.toUpperCase()}
            {task.fileSize ? ` · ${formatBytes(task.fileSize)}` : ''}
            {task.speed > 0 ? ` · ${formatBytes(task.speed)}/s` : ''}
            {task.eta > 0 ? ` · ${task.eta}s left` : ''}
          </p>

          {/* Progress bar */}
          {['downloading', 'encoding'].includes(task.status) && (
            <div className="progress-bar h-1.5 rounded-full mb-2">
              <motion.div className="progress-bar-fill" animate={{ width: `${task.progress}%` }} />
            </div>
          )}

          {task.error && (
            <p className="text-xs text-red-400 mb-1 truncate">{task.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {task.status === 'failed' && (
            <button onClick={onRetry} className="p-1.5 rounded text-yellow-400 hover:bg-yellow-400/10 transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {['queued', 'downloading', 'encoding'].includes(task.status) && (
            <button onClick={onCancel} className="p-1.5 rounded text-red-400 hover:bg-red-400/10 transition-all">
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {['completed', 'cancelled', 'failed'].includes(task.status) && (
            <button onClick={onDelete} className="p-1.5 rounded text-[#8888aa] hover:text-red-400 hover:bg-red-400/10 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {task.status === 'completed' && task.outputFilename && (
            <a href={`/uploads/videos/${task.outputFilename}`} download
              className="p-1.5 rounded text-green-400 hover:bg-green-400/10 transition-all">
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
