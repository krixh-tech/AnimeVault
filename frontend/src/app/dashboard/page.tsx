'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { History, Bookmark, Download, Bell, User, Settings, Play, Clock, CheckCircle, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { AnimeCard } from '@/components/anime/AnimeCard';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const { user } = useAuthStore();

  const { data: history } = useQuery({
    queryKey: ['watch-history'],
    queryFn: () => api.get('/users/watch-history?limit=20').then(r => r.data.data),
    enabled: tab === 'history' || tab === 'overview',
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api.get('/users/bookmarks').then(r => r.data.data),
    enabled: tab === 'watchlist' || tab === 'overview',
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: tab === 'notifications',
  });

  const { data: dlStats } = useQuery({
    queryKey: ['download-stats'],
    queryFn: () => api.get('/downloads/tasks/stats').then(r => r.data.data),
  });

  const TABS = [
    { id: 'overview',      icon: User,       label: 'Overview'      },
    { id: 'history',       icon: History,    label: 'History'       },
    { id: 'watchlist',     icon: Bookmark,   label: 'Watchlist'     },
    { id: 'downloads',     icon: Download,   label: 'Downloads'     },
    { id: 'notifications', icon: Bell,       label: 'Notifications' },
  ];

  const formatBytes = (b: number) => {
    if (!b) return '0 B';
    const k = 1024, s = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      {/* ── Profile header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 mb-8 p-6 rounded-2xl bg-[#131320] border border-[rgba(124,58,237,0.15)]"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))' }}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user?.username}</h1>
          <p className="text-[#8888aa] text-sm">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="tag-badge">{user?.role}</span>
            {user?.isVerified && <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" />Verified</span>}
          </div>
        </div>
        {dlStats && (
          <div className="hidden md:flex items-center gap-6 text-center">
            {[
              { label: 'Downloads', value: dlStats.totalDownloads },
              { label: 'Storage',   value: formatBytes(dlStats.storageUsed) },
              { label: 'Active',    value: dlStats.active },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xl font-bold text-violet-400">{s.value}</p>
                <p className="text-xs text-[#8888aa]">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-[#131320] text-[#8888aa] hover:text-white border border-[rgba(124,58,237,0.1)]'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <Section title="Continue Watching" icon={Play} href="/dashboard?tab=history">
            {history?.length === 0 ? (
              <Empty text="No watch history yet" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {history?.slice(0, 4).map((h: any) => (
                  <Link key={h._id} href={`/watch/${h.episode?._id}`}>
                    <div className="anime-card group">
                      <div className="relative aspect-video overflow-hidden bg-[#1c1c2e]">
                        {h.episode?.thumbnail ? <img src={h.episode.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6 text-violet-500/30" /></div>}
                        {/* Progress overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                          <div className="h-full bg-violet-500" style={{ width: `${h.duration ? (h.progress / h.duration) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs text-violet-400 truncate">{h.anime?.title?.en}</p>
                        <p className="text-sm truncate">Ep {h.episode?.number}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="My Watchlist" icon={Bookmark} href="/dashboard?tab=watchlist">
            {bookmarks?.length === 0 ? (
              <Empty text="No bookmarks yet" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {bookmarks?.slice(0, 6).map((b: any) => <AnimeCard key={b._id} anime={b.anime} />)}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div className="space-y-2">
          {history?.map((h: any) => (
            <Link key={h._id} href={`/watch/${h.episode?._id}`}>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#131320] border border-[rgba(124,58,237,0.1)] hover:border-violet-500/30 transition-all group">
                <div className="w-24 aspect-video rounded-lg overflow-hidden bg-[#1c1c2e] shrink-0">
                  {h.episode?.thumbnail ? <img src={h.episode.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-violet-500/30" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#f1f1f8] truncate">{h.anime?.title?.en}</p>
                  <p className="text-sm text-[#8888aa]">Episode {h.episode?.number}</p>
                  <div className="mt-1.5 w-32 h-1 bg-[#1c1c2e] rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${h.duration ? (h.progress / h.duration) * 100 : 0}%` }} />
                  </div>
                </div>
                <p className="text-xs text-[#8888aa] shrink-0">{new Date(h.watchedAt).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
          {!history?.length && <Empty text="No watch history" />}
        </div>
      )}

      {/* ── Watchlist ── */}
      {tab === 'watchlist' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {bookmarks?.map((b: any) => <AnimeCard key={b._id} anime={b.anime} />)}
          {!bookmarks?.length && <div className="col-span-full"><Empty text="No bookmarks yet" /></div>}
        </div>
      )}

      {/* ── Downloads (redirect) ── */}
      {tab === 'downloads' && (
        <div className="text-center py-12">
          <p className="text-[#8888aa] mb-4">Manage your downloads</p>
          <Link href="/download" className="px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-all">
            Go to Download Manager
          </Link>
        </div>
      )}

      {/* ── Notifications ── */}
      {tab === 'notifications' && (
        <div className="space-y-2">
          {notifications?.data?.map((n: any) => (
            <div key={n._id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${n.isRead ? 'bg-[#131320] border-[rgba(124,58,237,0.05)]' : 'bg-violet-500/5 border-violet-500/20'}`}>
              {n.image && <img src={n.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <div className="flex-1">
                <p className="font-medium text-sm">{n.title}</p>
                {n.message && <p className="text-xs text-[#8888aa] mt-0.5">{n.message}</p>}
                <p className="text-xs text-[#8888aa] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1" />}
            </div>
          ))}
          {!notifications?.data?.length && <Empty text="No notifications" />}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, href, children }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-bold text-sm" style={{ fontFamily: 'Orbitron, monospace' }}>
          <Icon className="w-4 h-4 text-violet-400" />{title}
        </h2>
        <Link href={href} className="text-xs text-[#8888aa] hover:text-violet-400 transition-colors">View All</Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-[#8888aa]">
      <p>{text}</p>
    </div>
  );
}
