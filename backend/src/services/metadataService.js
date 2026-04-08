const axios = require('axios');

// ── AniList GraphQL ────────────────────────────────────────────────────
const ANILIST_QUERY = `
query ($id: Int, $search: String) {
  Media(id: $id, search: $search, type: ANIME) {
    id malId title { romaji english native }
    description(asHtml: false)
    coverImage { large medium color }
    bannerImage
    genres tags { name }
    studios { nodes { name isAnimationStudio } }
    season seasonYear startDate { year month day } endDate { year month day }
    status format episodes duration
    averageScore popularity trending
    isAdult
    trailer { site id thumbnail }
    source
    nextAiringEpisode { episode airingAt }
    externalLinks { url site }
  }
}`;

async function fetchFromAniList(idOrSearch, isId = true) {
  const variables = isId
    ? { id: typeof idOrSearch === 'string' ? parseInt(idOrSearch) : idOrSearch }
    : { search: idOrSearch };

  const resp = await axios.post('https://graphql.anilist.co', {
    query: ANILIST_QUERY, variables,
  }, { timeout: 15000 });

  const m = resp.data?.data?.Media;
  if (!m) throw new Error('Anime not found on AniList');

  return mapAniListData(m);
}

function mapAniListData(m) {
  const studios = m.studios?.nodes?.filter(s => s.isAnimationStudio).map(s => s.name) || [];
  return {
    title: { en: m.title.english || m.title.romaji, jp: m.title.native, romaji: m.title.romaji },
    description: m.description?.replace(/<[^>]*>/g, '') || '',
    coverImage: { large: m.coverImage?.large, medium: m.coverImage?.medium, color: m.coverImage?.color },
    bannerImage: m.bannerImage,
    genres: (m.genres || []).map(g => g.toLowerCase()),
    tags: (m.tags || []).map(t => t.name),
    studios,
    season: m.season,
    seasonYear: m.seasonYear,
    releaseYear: m.startDate?.year,
    startDate: m.startDate ? new Date(`${m.startDate.year}-${m.startDate.month}-${m.startDate.day}`) : null,
    endDate: m.endDate?.year ? new Date(`${m.endDate.year}-${m.endDate.month}-${m.endDate.day}`) : null,
    status: m.status,
    type: m.format === 'MOVIE' ? 'MOVIE' : m.format || 'TV',
    format: m.format,
    source: m.source,
    rating: { average: m.averageScore ? m.averageScore / 10 : 0, anilist: m.averageScore },
    popularity: m.popularity,
    trending: m.trending,
    episodeCount: m.episodes,
    duration: m.duration,
    isAdult: m.isAdult,
    externalIds: { anilist: m.id, mal: m.malId },
    trailer: m.trailer ? { site: m.trailer.site, id: m.trailer.id, thumbnail: m.trailer.thumbnail } : undefined,
  };
}

// ── Jikan (MAL) ───────────────────────────────────────────────────────
async function fetchFromJikan(malId) {
  const resp = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`, { timeout: 10000 });
  const a = resp.data?.data;
  if (!a) throw new Error('Anime not found on Jikan');

  return {
    title: { en: a.title_english || a.title, jp: a.title_japanese, romaji: a.title },
    description: a.synopsis,
    coverImage: { large: a.images?.jpg?.large_image_url, medium: a.images?.jpg?.image_url },
    genres: (a.genres || []).map(g => g.name.toLowerCase()),
    studios: (a.studios || []).map(s => s.name),
    releaseYear: a.year,
    status: a.status === 'Finished Airing' ? 'FINISHED' : a.status === 'Currently Airing' ? 'RELEASING' : 'NOT_YET_RELEASED',
    type: a.type === 'Movie' ? 'MOVIE' : 'TV',
    episodeCount: a.episodes,
    duration: parseInt(a.duration) || null,
    rating: { average: a.score, mal: a.score * 10 },
    popularity: a.members,
    isAdult: a.rating?.includes('Rx') || false,
    externalIds: { mal: a.mal_id },
  };
}

// ── Search AniList ─────────────────────────────────────────────────────
async function searchAniList(query, page = 1, perPage = 20) {
  const searchQuery = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(search: $search, type: ANIME) {
        id title { english romaji } coverImage { medium } genres status format averageScore
      }
    }
  }`;
  const resp = await axios.post('https://graphql.anilist.co', {
    query: searchQuery, variables: { search: query, page, perPage },
  }, { timeout: 10000 });
  return resp.data?.data?.Page || { media: [], pageInfo: {} };
}

module.exports = { fetchFromAniList, fetchFromJikan, searchAniList, mapAniListData };
