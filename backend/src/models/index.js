const mongoose = require('mongoose');

// ── Notification ──────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['new_episode', 'download_complete', 'download_failed', 'system', 'announcement'],
    required: true,
  },
  title: { type: String, required: true },
  message: String,
  image: String,
  link: String,
  data: mongoose.Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });

// ── Watch History ─────────────────────────────────────────────────────
const watchHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  anime: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true },
  episode: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
  watchedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 }, // seconds watched
  duration: Number, // total duration seconds
  completed: { type: Boolean, default: false },
}, { timestamps: true });

watchHistorySchema.index({ user: 1, anime: 1, episode: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, watchedAt: -1 });

// ── Bookmark ──────────────────────────────────────────────────────────
const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  anime: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true },
  status: {
    type: String,
    enum: ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'],
    default: 'plan_to_watch',
  },
  rating: { type: Number, min: 0, max: 10 },
  notes: String,
  addedAt: { type: Date, default: Date.now },
}, { timestamps: true });

bookmarkSchema.index({ user: 1, anime: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, status: 1 });

// ── Caption Template ──────────────────────────────────────────────────
const captionTemplateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  template: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

captionTemplateSchema.index({ user: 1 });

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
  WatchHistory: mongoose.model('WatchHistory', watchHistorySchema),
  Bookmark: mongoose.model('Bookmark', bookmarkSchema),
  CaptionTemplate: mongoose.model('CaptionTemplate', captionTemplateSchema),
};
