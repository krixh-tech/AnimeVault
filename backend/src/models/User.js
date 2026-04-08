const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  avatar: { type: String, default: '' },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: String,

  // ── Preferences ───────────────────────────────────────────────────
  preferences: {
    defaultQuality: { type: String, default: '720p' },
    autoPlay: { type: Boolean, default: true },
    skipIntro: { type: Boolean, default: false },
    theme: { type: String, default: 'dark' },
    language: { type: String, default: 'sub' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      newEpisodes: { type: Boolean, default: true },
    },
  },

  // ── Telegram Integration ──────────────────────────────────────────
  telegram: {
    chatId: String,
    username: String,
    isConnected: { type: Boolean, default: false },
  },

  // ── Storage ───────────────────────────────────────────────────────
  storageUsed: { type: Number, default: 0 }, // bytes
  storageLimit: { type: Number, default: 10 * 1024 * 1024 * 1024 }, // 10GB

  // ── Stats ─────────────────────────────────────────────────────────
  totalDownloads: { type: Number, default: 0 },
  totalWatchTime: { type: Number, default: 0 }, // seconds

  // ── Auth tokens ───────────────────────────────────────────────────
  refreshTokens: [{ type: String, select: false }],
  verificationToken: { type: String, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpiry: Date,

  lastLogin: Date,

}, { timestamps: true });

// ── Hash password before save ──────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare password ───────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Indexes ────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
