'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/lib/api';
import { AnimeCard, AnimeCardSkeleton } from '@/components/anime/AnimeCard';

const GENRES = ['action','adventure','comedy','drama','fantasy','horror','mystery','psychological','romance','sci-fi','slice of life','sports','supernatural','thriller'];
const TYPES = ['TV','MOVIE','OVA','ONA','SPECIAL'];
const STATUSES = ['RELEASING','FINISHED','NOT_YET_RELEASED'];
const SORTS = [
  { value: '-createdAt', label: 'Newest'    },
  { value: '-popularity', label: 'Popular'  },
  { value: '-rating',     label: 'Top Rated'},
  { value: '-trending',   label: 'Trending' },
  { value: 'title',       label: 'A-Z'      },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const q      = searchParams.get('q') || '';
  const genre  = searchParams.get('genre') || '';
  const type   = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const year   = searchParams.get('year') || '';
  const sort   = searchParams.get('sort') || '-createdAt';
  const page   = parseInt(searchParams.get('page') || '1');

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (genre) params.set('genre', genre);
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  if (year) params.set('year', year);
  params.set('sort', sort);
  params.set('page', String(page));
  params.set('limit', '24');

  const { data, isLoading } = useQuery({
    queryKey: ['search', params.toString()],
    queryFn: () => api.get(`/anime?${params.toString()}`).then(r => r.data),
    placeholderData: prev => prev,
  });

  const updateFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.set('page', '1');
    router.push(`/search?${p.toString()}`);
  };

  const activeFilters = [genre, type, status, year].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
      {/* ── Search bar ── */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888aa]" />
          <input
            defaultValue={q}
            onKeyDown={e => e.key === 'Enter' && updateFilter('q', (e.target as HTMLInputElement).value)}
            placeholder="Search anime..."
            className="w-full bg-[#131320] border border-[rgba(124,58,237,0.2)] rounded-xl pl-9 pr-4 py-3 text-sm text-[#f1f1f8] placeholder-[#8888aa] outline-none focus:border-violet-500 transition-all"
          />
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-all ${showFilters || activeFilters > 0 ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-[#131320] border-[rgba(124,58,237,0.2)] text-[#8888aa] hover:text-white'}`}>
          <SlidersHorizontal className="w-4 h-4" />
          Filters {activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center">{activeFilters}</span>}
        </button>
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[#131320] border border-[rgba(124,58,237,0.15)] mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <FilterSelect label="Genre" value={genre} options={GENRES.map(g => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))} onChange={v => updateFilter('genre', v)} />
          <FilterSelect label="Type" value={type} options={TYPES.map(t => ({ value: t, label: t }))} onChange={v => updateFilter('type', v)} />
          <FilterSelect label="Status" value={status} options={STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} onChange={v => updateFilter('status', v)} />
          <FilterSelect label="Sort" value={sort} options={SORTS.map(s => ({ value: s.value, label: s.label }))} onChange={v => updateFilter('sort', v)} />
        </motion.div>
      )}

      {/* ── Active filter chips ── */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {genre && <Chip label={`Genre: ${genre}`} onRemove={() => updateFilter('genre', '')} />}
          {type && <Chip label={`Type: ${type}`} onRemove={() => updateFilter('type', '')} />}
          {status && <Chip label={`Status: ${status}`} onRemove={() => updateFilter('status', '')} />}
          {year && <Chip label={`Year: ${year}`} onRemove={() => updateFilter('year', '')} />}
        </div>
      )}

      {/* ── Results ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#8888aa]">
          {isLoading ? 'Searching...' : `${data?.pagination?.total || 0} results`}
          {q && <span> for "<span className="text-violet-400">{q}</span>"</span>}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 24 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-24 text-[#8888aa]">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">No results found</p>
          <p className="text-sm">Try different keywords or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data?.data?.map((anime: any, i: number) => (
              <motion.div key={anime._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <AnimeCard anime={anime} />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination?.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.min(data.pagination.pages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => updateFilter('page', String(p))}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-[#131320] text-[#8888aa] hover:text-white border border-[rgba(124,58,237,0.1)]'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: any) {
  return (
    <div>
      <label className="block text-xs text-[#8888aa] mb-1.5 uppercase tracking-wider">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0a0a0f] border border-[rgba(124,58,237,0.2)] rounded-lg px-3 py-2 text-sm text-[#f1f1f8] outline-none focus:border-violet-500 transition-all">
        <option value="">All</option>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-violet-500/15 border border-violet-500/30 text-violet-300">
      {label}
      <button onClick={onRemove}><X className="w-3 h-3" /></button>
    </span>
  );
}
