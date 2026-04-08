'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Download, Star, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

// ── Hero Slider ────────────────────────────────────────────────────────
export function HeroSlider({ items }: { items: any[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % items.length), 6000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return <HeroSkeleton />;

  const item = items[current];

  return (
    <div className="relative h-[70vh] min-h-[400px] max-h-[640px] overflow-hidden">
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {item.bannerImage && (
            <img
              src={item.bannerImage}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/20" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-4 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.genres?.slice(0, 3).map((g: string) => (
                <span key={g} className="tag-badge">{g}</span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-3 leading-tight" style={{ fontFamily: 'Orbitron, monospace' }}>
              {item.title?.en || item.title?.romaji}
            </h1>

            {/* Rating + Status */}
            <div className="flex items-center gap-4 mb-4">
              {item.rating?.average > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {item.rating.average.toFixed(1)}
                </span>
              )}
              <span className={`text-sm font-medium ${item.status === 'RELEASING' ? 'text-green-400' : 'text-[#8888aa]'}`}>
                {item.status === 'RELEASING' ? '● Ongoing' : item.status === 'FINISHED' ? 'Completed' : item.status}
              </span>
              {item.type && <span className="text-sm text-[#8888aa]">{item.type}</span>}
            </div>

            <p className="text-[#8888aa] text-sm md:text-base line-clamp-3 mb-6 max-w-lg">
              {item.description}
            </p>

            <div className="flex items-center gap-3">
              <Link href={`/anime/${item.slug}`}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 25px rgba(124,58,237,0.4)' }}
              >
                <Play className="w-4 h-4" />
                Watch Now
              </Link>
              <Link href={`/anime/${item.slug}`}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-[#f1f1f8] bg-white/10 backdrop-blur border border-white/20 hover:bg-white/15 transition-all">
                <Download className="w-4 h-4" />
                Download
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-4 lg:right-8 z-10 flex gap-2">
          {items.map((item, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-12 h-16 rounded-lg overflow-hidden transition-all border-2 ${i === current ? 'border-violet-500 scale-110 shadow-[0_0_15px_rgba(124,58,237,0.5)]' : 'border-transparent opacity-50 hover:opacity-75'}`}>
              {item.coverImage?.medium && (
                <img src={item.coverImage.medium} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Nav arrows */}
      {items.length > 1 && (
        <>
          <button onClick={() => setCurrent(c => (c - 1 + items.length) % items.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 backdrop-blur text-white hover:bg-violet-600/60 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrent(c => (c + 1) % items.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 backdrop-blur text-white hover:bg-violet-600/60 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="relative h-[70vh] min-h-[400px] max-h-[640px] bg-[#131320] flex items-center px-8">
      <div className="space-y-4 max-w-xl w-full">
        <div className="flex gap-2">
          {[70, 80, 60].map(w => <div key={w} className="skeleton h-6 rounded-full" style={{ width: w }} />)}
        </div>
        <div className="skeleton h-12 w-2/3" />
        <div className="skeleton h-12 w-1/2" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
        <div className="flex gap-3 pt-2">
          <div className="skeleton h-12 w-36 rounded-xl" />
          <div className="skeleton h-12 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Episode Card ───────────────────────────────────────────────────────
export function EpisodeCard({ episode }: { episode: any }) {
  return (
    <Link href={`/watch/${episode._id}`}>
      <div className="anime-card group cursor-pointer">
        <div className="relative aspect-video overflow-hidden bg-[#1c1c2e]">
          {episode.thumbnail ? (
            <img src={episode.thumbnail} alt={episode.title || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-cyan-900/20 flex items-center justify-center">
              <Play className="w-8 h-8 text-violet-500/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
            <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
          </div>
          {episode.duration && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-[10px] text-white rounded">
              {Math.floor(episode.duration / 60)}m
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-xs text-violet-400 font-medium mb-0.5">
            {episode.anime?.title?.en || 'Unknown'} · Ep {episode.number}
          </p>
          <p className="text-sm text-[#f1f1f8] truncate">{episode.title || `Episode ${episode.number}`}</p>
        </div>
      </div>
    </Link>
  );
}
