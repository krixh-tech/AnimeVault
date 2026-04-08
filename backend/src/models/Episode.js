const mongoose = require('mongoose');

const videoSourceSchema = new mongoose.Schema({
  quality: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '4K', 'auto'],
    required: true,
  },
  url: { type: String, required: true },
  type: {
    type: String,
    enum: ['hls', 'mp4', 'mkv', 'webm'],
    default: 'mp4',
  },
  size: Number,      // in bytes
  bitrate: Number,   // kbps
  codec: String,     // h264 | h265 | av1
  isEncoded: { type: Boolean, default: false },
  localPath: String, // if stored locally post-download
}, { _id: false });

const subtitleSchema = new mongoose.Schema({
  language: { type: String, required: true },
  label: String,
  url: { type: String, required: true },
  format: { type: String, enum: ['vtt', 'srt', 'ass'], default: 'vtt' },
  isDefault: { type: Boolean, default: false },
}, { _id: false });

const episodeSchema = new mongoose.Schema({
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
    required: true,
  },
  number: { type: Number, required: true },
  title: String,
  description: String,
  thumbnail: String,
  duration: Number, // seconds
  airDate: Date,

  // ── Video Sources ─────────────────────────────────────────────────
  sources: [videoSourceSchema],
  subtitles: [subtitleSchema],
  hlsPlaylist: String, // primary m3u8 URL

  // ── Download Info ─────────────────────────────────────────────────
  downloadUrls: [{
    quality: String,
    url: String,
    size: Number,
    filename: String,
    _id: false,
  }],

  // ── Scraping Metadata ─────────────────────────────────────────────
  sourceUrl: String,   // original scraped URL
  sourceSite: String,
  rawFilename: String, // original filename before renaming
  cleanFilename: String,

  // ── Local Storage ─────────────────────────────────────────────────
  localFiles: [{
    quality: String,
    path: String,
    size: Number,
    mimeType: String,
    _id: false,
  }],

  // ── Stats ─────────────────────────────────────────────────────────
  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  watchTime: { type: Number, default: 0 },

  // ── Flags ─────────────────────────────────────────────────────────
  isProcessed: { type: Boolean, default: false },
  isFiller: { type: Boolean, default: false },
  isSubbed: { type: Boolean, default: true },
  isDubbed: { type: Boolean, default: false },
  language: { type: String, default: 'sub' },

}, { timestamps: true });

episodeSchema.index({ anime: 1, number: 1 }, { unique: true });
episodeSchema.index({ anime: 1 });
episodeSchema.index({ airDate: 1 });
episodeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Episode', episodeSchema);
