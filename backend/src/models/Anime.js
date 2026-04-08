const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  // ── Identity ─────────────────────────────────────────────────────
  title: {
    en: { type: String, required: true, trim: true },
    jp: { type: String, trim: true },
    romaji: { type: String, trim: true },
    synonyms: [String],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // ── Media ─────────────────────────────────────────────────────────
  coverImage: {
    large: String,
    medium: String,
    color: String, // dominant color for theming
  },
  bannerImage: String,
  trailer: {
    site: String, // youtube | dailymotion
    id: String,
    thumbnail: String,
  },

  // ── Info ──────────────────────────────────────────────────────────
  description: { type: String, maxlength: 5000 },
  genres: [{ type: String, lowercase: true }],
  tags: [String],
  studios: [String],
  season: String,       // WINTER | SPRING | SUMMER | FALL
  seasonYear: Number,
  releaseYear: Number,
  startDate: Date,
  endDate: Date,
  status: {
    type: String,
    enum: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'],
    default: 'NOT_YET_RELEASED',
  },
  type: {
    type: String,
    enum: ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'],
    default: 'TV',
  },
  format: String,
  source: String, // MANGA | LIGHT_NOVEL | ORIGINAL | etc.

  // ── Stats ─────────────────────────────────────────────────────────
  rating: {
    average: { type: Number, min: 0, max: 10, default: 0 },
    count: { type: Number, default: 0 },
    mal: Number,
    anilist: Number,
  },
  popularity: { type: Number, default: 0 },
  trending: { type: Number, default: 0 },

  // ── Episodes ──────────────────────────────────────────────────────
  episodeCount: Number,  // total (null if ongoing)
  duration: Number,       // avg duration in minutes

  // ── External IDs ─────────────────────────────────────────────────
  externalIds: {
    mal: Number,
    anilist: Number,
    kitsu: String,
    thetvdb: Number,
    crunchyroll: String,
  },

  // ── Scraping Sources ─────────────────────────────────────────────
  sources: [{
    site: String, // e.g. "gogoanime", "9anime"
    url: String,
    lastScraped: Date,
    isActive: { type: Boolean, default: true },
  }],

  // ── Content Flags ────────────────────────────────────────────────
  isAdult: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isTrending: { type: Boolean, default: false },

  // ── Watch Stats ───────────────────────────────────────────────────
  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  watchTime: { type: Number, default: 0 }, // total seconds watched

  // ── User interactions (cached counts) ────────────────────────────
  bookmarkCount: { type: Number, default: 0 },

}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────────────
animeSchema.index({ 'title.en': 'text', 'title.jp': 'text', 'title.synonyms': 'text', description: 'text' });
animeSchema.index({ slug: 1 });
animeSchema.index({ genres: 1 });
animeSchema.index({ status: 1 });
animeSchema.index({ type: 1 });
animeSchema.index({ releaseYear: 1 });
animeSchema.index({ trending: -1 });
animeSchema.index({ popularity: -1 });
animeSchema.index({ 'rating.average': -1 });
animeSchema.index({ isFeatured: 1 });
animeSchema.index({ createdAt: -1 });

// ── Slug generation ────────────────────────────────────────────────────
animeSchema.pre('save', function (next) {
  if (!this.slug && this.title?.en) {
    this.slug = this.title.en
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// ── Virtual: full title ────────────────────────────────────────────────
animeSchema.virtual('displayTitle').get(function () {
  return this.title?.en || this.title?.romaji || 'Unknown';
});

animeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Anime', animeSchema);
