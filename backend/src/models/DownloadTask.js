const mongoose = require('mongoose');

const downloadTaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
  },
  episode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
  },

  // ── Task Info ─────────────────────────────────────────────────────
  title: { type: String, required: true },
  animeTitle: String,
  episodeNumber: Number,
  videoUrl: { type: String, required: true },
  quality: { type: String, default: '720p' },
  language: { type: String, default: 'sub' },

  // ── Status ────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['queued', 'downloading', 'encoding', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'queued',
  },
  priority: { type: Number, default: 0 }, // higher = more priority
  jobId: String, // BullMQ job ID

  // ── Progress ──────────────────────────────────────────────────────
  progress: { type: Number, default: 0, min: 0, max: 100 },
  downloadedBytes: { type: Number, default: 0 },
  totalBytes: { type: Number, default: 0 },
  speed: { type: Number, default: 0 }, // bytes/sec
  eta: Number, // seconds remaining

  // ── Output ────────────────────────────────────────────────────────
  outputPath: String,
  outputFilename: String,
  fileSize: Number,
  mimeType: String,
  thumbnail: String,

  // ── Encoding options ──────────────────────────────────────────────
  encode: { type: Boolean, default: false },
  encodeOptions: {
    targetQuality: String,
    codec: { type: String, default: 'h264' },
    crf: { type: Number, default: 23 },
    preset: { type: String, default: 'medium' },
  },

  // ── Rename options ────────────────────────────────────────────────
  rename: { type: Boolean, default: true },
  renamedFilename: String,

  // ── Caption Template ──────────────────────────────────────────────
  captionTemplate: String,
  generatedCaption: String,

  // ── Batch reference ───────────────────────────────────────────────
  batchId: String,
  batchIndex: Number,

  // ── Error info ────────────────────────────────────────────────────
  error: String,
  retries: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },

  startedAt: Date,
  completedAt: Date,

}, { timestamps: true });

downloadTaskSchema.index({ user: 1, status: 1 });
downloadTaskSchema.index({ status: 1 });
downloadTaskSchema.index({ batchId: 1 });
downloadTaskSchema.index({ jobId: 1 });
downloadTaskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DownloadTask', downloadTaskSchema);
