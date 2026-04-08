'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { AnimeCard, AnimeCardSkeleton } from '@/components/anime/AnimeCard';

const GENRES: string[] = [
'action','adventure','comedy','drama','fantasy','horror','mystery',
'psychological','romance','sci-fi','slice of life','sports','supernatural','thriller'
];

const TYPES: string[] = ['TV','MOVIE','OVA','ONA','SPECIAL'];

const STATUSES: string[] = ['RELEASING','FINISHED','NOT_YET_RELEASED'];

const SORTS: { value: string; label: string }[] = [
{ value: '-createdAt', label: 'Newest' },
{ value: '-popularity', label: 'Popular' },
{ value: '-rating', label: 'Top Rated' },
{ value: '-trending', label: 'Trending' },
{ value: 'title', label: 'A-Z' }
];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-white">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {

const searchParams = useSearchParams();
const router = useRouter();
const [showFilters, setShowFilters] = useState(false);

const q = searchParams.get('q') || '';
const genre = searchParams.get('genre') || '';
const type = searchParams.get('type') || '';
const status = searchParams.get('status') || '';
const year = searchParams.get('year') || '';
const sort = searchParams.get('sort') || '-createdAt';
const page = parseInt(searchParams.get('page') || '1');

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
placeholderData: (prev: any) => prev
});

const updateFilter = (key: string, value: string) => {

const p = new URLSearchParams(searchParams.toString());

if (value) p.set(key, value);
else p.delete(key);

p.set('page','1');

router.push(`/search?${p.toString()}`);

};

return (

<div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">

<div className="flex gap-3 mb-6">

<div className="flex-1 relative">

<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888aa]" />

<input
defaultValue={q}
onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
if (e.key === 'Enter') {
updateFilter('q', e.currentTarget.value);
}
}}
placeholder="Search anime..."
className="w-full bg-[#131320] border border-[rgba(124,58,237,0.2)] rounded-xl pl-9 pr-4 py-3 text-sm text-[#f1f1f8]"
/>

</div>

<button
onClick={() => setShowFilters(f => !f)}
className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-[#131320] border border-[rgba(124,58,237,0.2)] text-[#8888aa]"
>

<SlidersHorizontal className="w-4 h-4"/>

Filters

</button>

</div>

{isLoading ? (

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">

{Array.from({length:24}).map((_,i)=>(

<AnimeCardSkeleton key={i}/>

))}

</div>

) : (

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">

{data?.data?.map((anime:any,i:number)=>(

<motion.div
key={anime._id}
initial={{opacity:0,y:15}}
animate={{opacity:1,y:0}}
transition={{delay:i*0.03}}
>

<AnimeCard anime={anime}/>

</motion.div>

))}

</div>

)}

</div>

);

}
