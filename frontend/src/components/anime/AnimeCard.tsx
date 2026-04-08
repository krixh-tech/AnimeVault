'use client';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, Play } from 'lucide-react';

// ── Anime Card ─────────────────────────────────────────────────────────
export function AnimeCard({ anime, rank }: { anime: any; rank?: number }) {
  return (
    <Link href={`/anime/${anime.slug}`}>
      <div className="anime-card group cursor-pointer">
        <div className="relative aspect-[3/4] overflow-hidden bg-[#1c1c2e]">
          {anime.coverImage?.medium ? (
            <img
              src={anime.coverImage.medium}
              alt={anime.title?.en || 'Anime'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/30 to-cyan-900/20">
              <Play className="w-10 h-10 text-violet-500/30" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
            >
              <Play className="w-3.5 h-3.5" />
              Watch Now
            </motion.button>
          </div>

          {/* Rank badge */}
          {rank && rank <= 3 && (
            <div className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{
                background: rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : '#cd7c2e',
                boxShadow: `0 0 10px ${rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : '#cd7c2e'}66`,
              }}>
              #{rank}
            </div>
          )}

          {/* Status badge */}
          {anime.status === 'RELEASING' && (
            <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-green-500/80">
              ONGOING
            </div>
          )}
        </div>

        <div className="p-2.5">
          <p className="text-sm font-medium text-[#f1f1f8] truncate leading-snug">
            {anime.title?.en || anime.title?.romaji}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {anime.rating?.average > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-yellow-400">
                <Star className="w-3 h-3 fill-yellow-400" />
                {anime.rating.average.toFixed(1)}
              </span>
            )}
            {anime.type && (
              <span className="text-[10px] text-[#8888aa] uppercase">{anime.type}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Anime Card Skeleton ────────────────────────────────────────────────
export function AnimeCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#131320]">
      <div className="skeleton aspect-[3/4]" />
      <div className="p-2.5 space-y-2">
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-2.5 w-1/2" />
      </div>
    </div>
  );
}
