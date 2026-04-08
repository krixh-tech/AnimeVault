const Anime = require('../models/Anime');
const Episode = require('../models/Episode');
const { Bookmark } = require('../models/index');
const logger = require('../utils/logger');
const { getRedis } = require('../config/redis');

// ── Get All Anime (paginated, filtered) ────────────────────────────────
exports.getAnime = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 24, genre, type, status,
      year, sort = '-createdAt', q
    } = req.query;

    const filter = {};
    if (genre) filter.genres = genre.toLowerCase();
    if (type) filter.type = type.toUpperCase();
    if (status) filter.status = status.toUpperCase();
    if (year) filter.releaseYear = parseInt(year);
    if (q) filter.$text = { $search: q };

    const sortMap = {
      '-createdAt': { createdAt: -1 },
      '-popularity': { popularity: -1 },
      '-rating': { 'rating.average': -1 },
      '-trending': { trending: -1 },
      'title': { 'title.en': 1 },
    };

    const [anime, total] = await Promise.all([
      Anime.find(filter)
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select('title slug coverImage genres status type rating.average releaseYear views trending isFeatured'),
      Anime.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: anime,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get Single Anime ───────────────────────────────────────────────────
exports.getAnimeBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Try cache first
    const redis = getRedis();
    const cacheKey = `anime:${slug}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached), fromCache: true });
    }

    const anime = await Anime.findOne({ slug }).lean();
    if (!anime) return res.status(404).json({ success: false, message: 'Anime not found' });

    // Get episode count and latest episode
    const [episodeCount, episodes] = await Promise.all([
      Episode.countDocuments({ anime: anime._id }),
      Episode.find({ anime: anime._id })
        .sort({ number: 1 })
        .select('number title thumbnail duration airDate views downloads isSubbed isDubbed'),
    ]);

    // Increment view counter (async)
    Anime.updateOne({ _id: anime._id }, { $inc: { views: 1 } }).exec();

    const result = { ...anime, episodeCount, episodes };

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Get Trending ───────────────────────────────────────────────────────
exports.getTrending = async (req, res, next) => {
  try {
    const { limit = 12 } = req.query;
    const redis = getRedis();
    const cacheKey = `trending:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const anime = await Anime.find({ status: { $ne: 'NOT_YET_RELEASED' } })
      .sort({ trending: -1, views: -1 })
      .limit(parseInt(limit))
      .select('title slug coverImage genres type rating.average trending');

    await redis.setex(cacheKey, 600, JSON.stringify(anime)); // 10 min cache
    res.json({ success: true, data: anime });
  } catch (err) {
    next(err);
  }
};

// ── Get Featured ───────────────────────────────────────────────────────
exports.getFeatured = async (req, res, next) => {
  try {
    const redis = getRedis();
    const cacheKey = 'featured';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const anime = await Anime.find({ isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title slug coverImage bannerImage description genres rating.average type status');

    await redis.setex(cacheKey, 1800, JSON.stringify(anime)); // 30 min
    res.json({ success: true, data: anime });
  } catch (err) {
    next(err);
  }
};

// ── Get Latest Episodes ────────────────────────────────────────────────
exports.getLatestEpisodes = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const redis = getRedis();
    const cacheKey = `latest_eps:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const episodes = await Episode.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('anime', 'title slug coverImage genres')
      .select('number title thumbnail anime createdAt duration');

    await redis.setex(cacheKey, 300, JSON.stringify(episodes));
    res.json({ success: true, data: episodes });
  } catch (err) {
    next(err);
  }
};

// ── Create Anime (Admin) ───────────────────────────────────────────────
exports.createAnime = async (req, res, next) => {
  try {
    const anime = await Anime.create(req.body);
    res.status(201).json({ success: true, data: anime });
  } catch (err) {
    next(err);
  }
};

// ── Update Anime (Admin) ───────────────────────────────────────────────
exports.updateAnime = async (req, res, next) => {
  try {
    const anime = await Anime.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!anime) return res.status(404).json({ success: false, message: 'Not found' });

    // Invalidate cache
    const redis = getRedis();
    await redis.del(`anime:${anime.slug}`);

    res.json({ success: true, data: anime });
  } catch (err) {
    next(err);
  }
};

// ── Delete Anime (Admin) ───────────────────────────────────────────────
exports.deleteAnime = async (req, res, next) => {
  try {
    const anime = await Anime.findByIdAndDelete(req.params.id);
    if (!anime) return res.status(404).json({ success: false, message: 'Not found' });
    await Episode.deleteMany({ anime: req.params.id });
    res.json({ success: true, message: 'Anime deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Toggle Bookmark ────────────────────────────────────────────────────
exports.toggleBookmark = async (req, res, next) => {
  try {
    const { animeId } = req.params;
    const userId = req.user.id;
    const { status = 'plan_to_watch' } = req.body;

    const existing = await Bookmark.findOne({ user: userId, anime: animeId });
    if (existing) {
      await existing.deleteOne();
      await Anime.updateOne({ _id: animeId }, { $inc: { bookmarkCount: -1 } });
      return res.json({ success: true, bookmarked: false });
    }

    await Bookmark.create({ user: userId, anime: animeId, status });
    await Anime.updateOne({ _id: animeId }, { $inc: { bookmarkCount: 1 } });
    res.json({ success: true, bookmarked: true });
  } catch (err) {
    next(err);
  }
};

// ── Import from AniList/MAL ────────────────────────────────────────────
exports.importFromAniList = async (req, res, next) => {
  try {
    const { anilistId } = req.body;
    const { fetchFromAniList } = require('../services/metadataService');
    const data = await fetchFromAniList(anilistId);

    const existing = await Anime.findOne({ 'externalIds.anilist': anilistId });
    if (existing) {
      const updated = await Anime.findByIdAndUpdate(existing._id, data, { new: true });
      return res.json({ success: true, data: updated, updated: true });
    }

    const anime = await Anime.create(data);
    res.status(201).json({ success: true, data: anime, created: true });
  } catch (err) {
    next(err);
  }
};

// ── Get genres list ────────────────────────────────────────────────────
exports.getGenres = async (req, res, next) => {
  try {
    const genres = await Anime.distinct('genres');
    res.json({ success: true, data: genres.filter(Boolean).sort() });
  } catch (err) {
    next(err);
  }
};
