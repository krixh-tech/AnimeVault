'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, Download, Bookmark, BookmarkCheck, Star, Calendar, Clock, Film, List, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AnimeDetailPage() {
  const { slug } = useParams() as { slug: string };
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showAllEps, setShowAllEps] = useState(false);

  const { data: anime, isLoading } = useQuery({
    queryKey: ['anime', slug],
    queryFn: () => api.get(`/anime/${slug}`).then(r => r.data.data),
    enabled: !!slug,
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/anime/${anime?._id}/bookmark`),
    onSuccess: (res) => {
      toast.success(res.data.bookmarked ? 'Added to watchlist' : 'Removed from watchlist');
      qc.invalidateQueries({ queryKey: ['anime', slug] });
    },
  });

  if (isLoading) return <DetailSkeleton />;
  if (!anime) return <div className="flex items-center justify-center h-64 text-[#8888aa]">Anime not found</div>;

  const episodes = showAllEps ? anime.episodes : anime.episodes?.slice(0, 24);
  const STATUS_COLOR: Record<string, string> = {
    RELEASING: '#10b981', FINISHED: '#8888aa', NOT_YET_RELEASED: '#f97316',
  };

  return (
    <div>
      {/* ── Banner ── */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        {anime.bannerImage ? (
          <img src={anime.bannerImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-cyan-900/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 to-transparent" />
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 -mt-32 relative z-10 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* ── Cover ── */}
          <div className="shrink-0">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-44 md:w-56 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border-2 border-[rgba(124,58,237,0.3)]">
              {anime.coverImage?.large ? (
                <img src={anime.coverImage.large} alt={anime.title?.en} className="w-full aspect-[3/4] object-cover" />
              ) : (
                <div className="w-full aspect-[3/4] bg-[#1c1c2e] flex items-center justify-center">
                  <Film className="w-12 h-12 text-violet-500/30" />
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Info ── */}
          <div className="flex-1 pt-32 md:pt-0">
            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {anime.genres?.map((g: string) => (
                <Link key={g} href={`/search?genre=${g}`} className="tag-badge hover:bg-violet-500/20 transition-all">{g}</Link>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold mb-1 leading-tight" style={{ fontFamily: 'Orbitron, monospace' }}>
              {anime.title?.en || anime.title?.romaji}
            </h1>
            {anime.title?.jp && <p className="text-[#8888aa] text-sm mb-4">{anime.title.jp}</p>}

            {/* Meta strip */}
            <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
              {anime.rating?.average > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-yellow-400">
                  <Star className="w-4 h-4 fill-yellow-400" /> {anime.rating.average.toFixed(1)}
                </span>
              )}
              <span style={{ color: STATUS_COLOR[anime.status] || '#8888aa' }}>
                {anime.status === 'RELEASING' ? '● Ongoing' : anime.status === 'FINISHED' ? 'Completed' : anime.status}
              </span>
              {anime.releaseYear && <span className="flex items-center gap-1 text-[#8888aa]"><Calendar className="w-3.5 h-3.5" />{anime.releaseYear}</span>}
              {anime.duration && <span className="flex items-center gap-1 text-[#8888aa]"><Clock className="w-3.5 h-3.5" />{anime.duration} min/ep</span>}
              {anime.type && <span className="text-[#8888aa]">{anime.type}</span>}
              {anime.episodeCount && <span className="text-[#8888aa]">{anime.episodeCount} eps</span>}
            </div>

            <p className="text-[#8888aa] text-sm leading-relaxed mb-6 max-w-2xl line-clamp-4">
              {anime.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              {anime.episodes?.[0] && (
                <Link href={`/watch/${anime.episodes[0]._id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 25px rgba(124,58,237,0.4)' }}>
                  <Play className="w-4 h-4" /> Watch Now
                </Link>
              )}
              <Link href={`/download?anime=${anime.slug}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-[#1c1c2e] border border-[rgba(124,58,237,0.3)] text-[#f1f1f8] hover:border-violet-500/60 transition-all">
                <Download className="w-4 h-4" /> Download
              </Link>
              {user && (
                <button onClick={() => bookmarkMutation.mutate()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-[#1c1c2e] border border-[rgba(124,58,237,0.3)] text-[#f1f1f8] hover:border-violet-500/60 transition-all">
                  <Bookmark className="w-4 h-4" /> Watchlist
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Studios & Info ── */}
        {(anime.studios?.length > 0 || anime.source) && (
          <div className="flex flex-wrap gap-6 mt-8 pt-8 border-t border-[rgba(255,255,255,0.05)] text-sm">
            {anime.studios?.length > 0 && (
              <div><p className="text-xs text-[#8888aa] uppercase mb-1">Studio</p><p className="text-[#f1f1f8]">{anime.studios.join(', ')}</p></div>
            )}
            {anime.source && (
              <div><p className="text-xs text-[#8888aa] uppercase mb-1">Source</p><p className="text-[#f1f1f8]">{anime.source}</p></div>
            )}
            {anime.season && (
              <div><p className="text-xs text-[#8888aa] uppercase mb-1">Season</p><p className="text-[#f1f1f8]">{anime.season} {anime.seasonYear}</p></div>
            )}
          </div>
        )}

        {/* ── Episode List ── */}
        {anime.episodes?.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]" />
              <List className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                Episodes <span className="text-[#8888aa] text-base font-normal">({anime.episodeCount || anime.episodes.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {episodes?.map((ep: any, i: number) => (
                <motion.div key={ep._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                  <Link href={`/watch/${ep._id}`}>
                    <div className="group relative rounded-xl overflow-hidden bg-[#131320] border border-[rgba(124,58,237,0.1)] hover:border-violet-500/40 transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]">
                      <div className="aspect-video bg-[#1c1c2e] overflow-hidden">
                        {ep.thumbnail ? (
                          <img src={ep.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-violet-500/20" style={{ fontFamily: 'Orbitron' }}>{ep.number}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-violet-400">Ep {ep.number}</p>
                        {ep.title && <p className="text-[10px] text-[#8888aa] truncate">{ep.title}</p>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {anime.episodes.length > 24 && (
              <button onClick={() => setShowAllEps(s => !s)}
                className="w-full mt-4 py-3 rounded-xl text-sm text-[#8888aa] bg-[#131320] border border-[rgba(124,58,237,0.1)] hover:border-violet-500/30 hover:text-violet-400 transition-all flex items-center justify-center gap-2">
                <ChevronDown className={`w-4 h-4 transition-transform ${showAllEps ? 'rotate-180' : ''}`} />
                {showAllEps ? 'Show Less' : `Show All ${anime.episodes.length} Episodes`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <div className="skeleton h-64 md:h-96 w-full" />
      <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10 pb-16">
        <div className="flex gap-8">
          <div className="skeleton w-44 md:w-56 aspect-[3/4] rounded-2xl shrink-0" />
          <div className="flex-1 pt-32 md:pt-0 space-y-4">
            <div className="flex gap-2"><div className="skeleton h-6 w-20 rounded-full" /><div className="skeleton h-6 w-16 rounded-full" /></div>
            <div className="skeleton h-10 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-20 w-full" />
            <div className="flex gap-3"><div className="skeleton h-11 w-32 rounded-xl" /><div className="skeleton h-11 w-32 rounded-xl" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
