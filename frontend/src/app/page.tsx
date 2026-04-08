'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Download, TrendingUp, Clock, Star, ChevronRight, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { AnimeCard, AnimeCardSkeleton } from '@/components/anime/AnimeCard';
import { EpisodeCard } from '@/components/anime/EpisodeCard';
import { HeroSlider } from '@/components/anime/HeroSlider';

export default function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ['featured'],
    queryFn: () => api.get('/anime/featured').then(r => r.data.data),
  });

  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/anime/trending?limit=12').then(r => r.data.data),
  });

  const { data: latestEps, isLoading: loadingEps } = useQuery({
    queryKey: ['latest-episodes'],
    queryFn: () => api.get('/anime/latest-episodes?limit=20').then(r => r.data.data),
  });

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <HeroSlider items={featured || []} />

      {/* ── Latest Episodes ── */}
      <Section title="Latest Episodes" icon={Clock} href="/search?sort=-createdAt" accent="cyan">
        {loadingEps ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {latestEps?.map((ep: any) => (
              <EpisodeCard key={ep._id} episode={ep} />
            ))}
          </div>
        )}
      </Section>

      {/* ── Trending Anime ── */}
      <Section title="Trending Now" icon={Flame} href="/search?sort=-trending" accent="violet">
        {loadingTrending ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {trending?.map((anime: any, i: number) => (
              <motion.div
                key={anime._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <AnimeCard anime={anime} rank={i + 1} />
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Quick Download CTA ── */}
      <div className="px-4 lg:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl p-8 md:p-12 grid-bg"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 100%)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                Smart Download System
              </h2>
              <p className="text-[#8888aa] text-sm md:text-base max-w-lg">
                Paste any anime URL — our engine auto-detects the source, episode number, and available qualities. Queue entire seasons in one click.
              </p>
            </div>
            <Link href="/download"
              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                boxShadow: '0 0 30px rgba(124,58,237,0.4)',
              }}
            >
              <Download className="w-5 h-5" />
              Start Downloading
            </Link>
          </div>
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, href, children, accent = 'violet' }: any) {
  const accentColor = accent === 'cyan' ? '#06b6d4' : '#a855f7';
  return (
    <section className="px-4 lg:px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full" style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
          <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: 'Orbitron, monospace' }}>{title}</h2>
        </div>
        <Link href={href} className="flex items-center gap-1 text-sm text-[#8888aa] hover:text-violet-400 transition-colors">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
