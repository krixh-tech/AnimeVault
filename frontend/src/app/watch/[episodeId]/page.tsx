'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Download, ChevronLeft, ChevronRight, List, Share2, Bookmark, Star } from 'lucide-react';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function WatchPage() {
  const { episodeId } = useParams() as { episodeId: string };
  const router = useRouter();
  const { user } = useAuthStore();
  const [showEpisodeList, setShowEpisodeList] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['stream', episodeId],
    queryFn: () => api.get(`/stream/${episodeId}`).then(r => r.data.data),
    enabled: !!episodeId,
  });

  const { data: episodeList } = useQuery({
    queryKey: ['episodes', data?.anime?._id],
    queryFn: () => api.get(`/episodes/anime/${data.anime._id}`).then(r => r.data.data),
    enabled: !!data?.anime?._id,
  });

  const progressMutation = useMutation({
    mutationFn: (progress: { progress: number; duration: number }) =>
      api.post(`/stream/${episodeId}/progress`, { ...progress, animeId: data?.anime?._id }),
  });

  const handleProgress = useCallback(
    (current: number, duration: number) => {
      if (!user || !duration) return;
      // Throttle: report every 30 seconds
      if (Math.floor(current) % 30 === 0 && current > 0) {
        progressMutation.mutate({ progress: current, duration });
      }
    },
    [user, progressMutation]
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton w-full aspect-video rounded-xl" />
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-4 w-1/3" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8888aa]">
        Episode not found
      </div>
    );
  }

  const { episode, sources, subtitles, anime } = data;
  const currentEpIndex = episodeList?.findIndex((e: any) => e._id === episodeId) ?? -1;
  const prevEp = currentEpIndex > 0 ? episodeList[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < (episodeList?.length ?? 0) - 1 ? episodeList[currentEpIndex + 1] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* ── Player ── */}
        <div className="flex-1 min-w-0">
          <VideoPlayer
            sources={sources || []}
            subtitles={subtitles || []}
            title={`${anime?.title?.en} - Ep ${episode.number}`}
            onProgress={handleProgress}
            onEnded={() => nextEp && router.push(`/watch/${nextEp._id}`)}
            autoPlay
          />

          {/* Episode info bar */}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => prevEp && router.push(`/watch/${prevEp._id}`)} disabled={!prevEp}
              className="p-2 rounded-lg bg-[#1c1c2e] text-[#8888aa] hover:text-white disabled:opacity-30 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <h1 className="font-bold text-lg leading-snug">
                {anime?.title?.en} — Episode {episode.number}
              </h1>
              {episode.title && (
                <p className="text-sm text-[#8888aa]">{episode.title}</p>
              )}
            </div>

            <button onClick={() => nextEp && router.push(`/watch/${nextEp._id}`)} disabled={!nextEp}
              className="p-2 rounded-lg bg-[#1c1c2e] text-[#8888aa] hover:text-white disabled:opacity-30 transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>

            <button onClick={() => setShowEpisodeList(s => !s)}
              className="p-2 rounded-lg bg-[#1c1c2e] text-[#8888aa] hover:text-white transition-all">
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Download bar */}
          <div className="mt-4 p-4 rounded-xl bg-[#131320] border border-[rgba(124,58,237,0.15)]">
            <p className="text-sm font-medium text-[#8888aa] mb-3">Download this episode</p>
            <div className="flex flex-wrap gap-2">
              {sources?.map((s: any) => (
                <a
                  key={s.quality}
                  href={`/api/downloads/direct?url=${encodeURIComponent(s.url)}`}
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  {s.quality}
                </a>
              ))}
              <Link href="/download"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 transition-all">
                <Download className="w-3.5 h-3.5" />
                Queue Download
              </Link>
            </div>
          </div>
        </div>

        {/* ── Episode List ── */}
        {(showEpisodeList || typeof window !== 'undefined' && window.innerWidth >= 1280) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="xl:w-80 shrink-0"
          >
            <div className="bg-[#131320] border border-[rgba(124,58,237,0.15)] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="font-semibold text-sm">Episodes</h3>
                <p className="text-xs text-[#8888aa]">{episodeList?.length || 0} episodes</p>
              </div>
              <div className="overflow-y-auto max-h-[60vh] scroll-area">
                {episodeList?.map((ep: any) => (
                  <Link key={ep._id} href={`/watch/${ep._id}`}>
                    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all border-l-2 ${ep._id === episodeId ? 'border-violet-500 bg-violet-500/5' : 'border-transparent'}`}>
                      {ep.thumbnail ? (
                        <img src={ep.thumbnail} alt="" className="w-20 aspect-video object-cover rounded" />
                      ) : (
                        <div className="w-20 aspect-video bg-[#1c1c2e] rounded flex items-center justify-center text-xs text-[#8888aa]">
                          Ep {ep.number}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${ep._id === episodeId ? 'text-violet-400' : 'text-[#f1f1f8]'}`}>
                          Episode {ep.number}
                        </p>
                        {ep.title && <p className="text-xs text-[#8888aa] truncate">{ep.title}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
