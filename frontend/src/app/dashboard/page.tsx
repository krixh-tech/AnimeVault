'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  History,
  Bookmark,
  Download,
  Bell,
  User,
  Play,
  CheckCircle
} from 'lucide-react';

import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { AnimeCard } from '@/components/anime/AnimeCard';


export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-white">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}


function DashboardContent() {

  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const { user } = useAuthStore();

  const { data: history } = useQuery({
    queryKey: ['watch-history'],
    queryFn: () => api.get('/users/watch-history?limit=20').then(r => r.data.data),
    enabled: tab === 'history' || tab === 'overview'
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api.get('/users/bookmarks').then(r => r.data.data),
    enabled: tab === 'watchlist' || tab === 'overview'
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: tab === 'notifications'
  });

  const { data: dlStats } = useQuery({
    queryKey: ['download-stats'],
    queryFn: () => api.get('/downloads/tasks/stats').then(r => r.data.data)
  });

  const TABS = [
    { id: 'overview', icon: User, label: 'Overview' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'watchlist', icon: Bookmark, label: 'Watchlist' },
    { id: 'downloads', icon: Download, label: 'Downloads' },
    { id: 'notifications', icon: Bell, label: 'Notifications' }
  ];

  const formatBytes = (b: number) => {
    if (!b) return '0 B';
    const k = 1024;
    const s = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
  };

  return (

    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">

      <motion.div
        initial={{ opacity:0, y:-10 }}
        animate={{ opacity:1, y:0 }}
        className="flex items-center gap-5 mb-8 p-6 rounded-2xl bg-[#131320] border border-[rgba(124,58,237,0.15)]"
      >

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
          {user?.username?.[0]?.toUpperCase()}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user?.username}</h1>
          <p className="text-[#8888aa] text-sm">{user?.email}</p>

          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="tag-badge">{user?.role}</span>

            {user?.isVerified && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            )}

          </div>
        </div>

        {dlStats && (
          <div className="hidden md:flex items-center gap-6 text-center">

            <div>
              <p className="text-xl font-bold text-violet-400">{dlStats.totalDownloads}</p>
              <p className="text-xs text-[#8888aa]">Downloads</p>
            </div>

            <div>
              <p className="text-xl font-bold text-violet-400">{formatBytes(dlStats.storageUsed)}</p>
              <p className="text-xs text-[#8888aa]">Storage</p>
            </div>

            <div>
              <p className="text-xl font-bold text-violet-400">{dlStats.active}</p>
              <p className="text-xs text-[#8888aa]">Active</p>
            </div>

          </div>
        )}

      </motion.div>


      <div className="flex gap-1 overflow-x-auto pb-1 mb-6">

        {TABS.map(t => (

          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t.id
                ? 'bg-violet-600 text-white'
                : 'bg-[#131320] text-[#8888aa]'
            }`}
          >

            <t.icon className="w-4 h-4" />
            {t.label}

          </button>

        ))}

      </div>


      {tab === 'watchlist' && (

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">

          {bookmarks?.map((b:any)=>(
            <AnimeCard key={b._id} anime={b.anime}/>
          ))}

        </div>

      )}

    </div>

  );

}
