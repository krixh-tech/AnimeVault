const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Anime = require('../models/Anime');
const Episode = require('../models/Episode');
const DownloadTask = require('../models/DownloadTask');
const { downloadQueue } = require('../workers/downloadQueue');
const logger = require('../utils/logger');

// All admin routes require auth + admin role
router.use(protect, requireAdmin);

// ── Dashboard Stats ────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [users, anime, episodes, tasks] = await Promise.all([
      User.countDocuments(),
      Anime.countDocuments(),
      Episode.countDocuments(),
      DownloadTask.countDocuments(),
    ]);
    const [activeDownloads, queueStats] = await Promise.all([
      DownloadTask.countDocuments({ status: { $in: ['downloading', 'encoding'] } }),
      Promise.all([
        downloadQueue.getWaitingCount(),
        downloadQueue.getActiveCount(),
        downloadQueue.getCompletedCount(),
        downloadQueue.getFailedCount(),
      ]).then(([waiting, active, completed, failed]) => ({ waiting, active, completed, failed })),
    ]);

    res.json({ success: true, data: { users, anime, episodes, tasks, activeDownloads, queue: queueStats } });
  } catch (err) { next(err); }
});

// ── User Management ────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = search ? { $or: [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit))
        .select('-password -refreshTokens -verificationToken'),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, total });
  } catch (err) { next(err); }
});

router.patch('/users/:id/ban', async (req, res, next) => {
  try {
    const { ban, reason } = req.body;
    await User.findByIdAndUpdate(req.params.id, { isBanned: ban, banReason: ban ? reason : undefined });
    res.json({ success: true, message: ban ? 'User banned' : 'User unbanned' });
  } catch (err) { next(err); }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) { next(err); }
});

// ── Worker Management ──────────────────────────────────────────────────
router.post('/workers/pause', async (req, res, next) => {
  try {
    await downloadQueue.pause();
    res.json({ success: true, message: 'Download queue paused' });
  } catch (err) { next(err); }
});

router.post('/workers/resume', async (req, res, next) => {
  try {
    await downloadQueue.resume();
    res.json({ success: true, message: 'Download queue resumed' });
  } catch (err) { next(err); }
});

router.post('/workers/clear-failed', async (req, res, next) => {
  try {
    await downloadQueue.clean(0, 100, 'failed');
    await DownloadTask.updateMany({ status: 'failed' }, { $set: { status: 'cancelled' } });
    res.json({ success: true, message: 'Failed jobs cleared' });
  } catch (err) { next(err); }
});

// ── Storage Stats ──────────────────────────────────────────────────────
router.get('/storage', async (req, res, next) => {
  try {
    const { execSync } = require('child_process');
    const uploadsDir = require('path').join(__dirname, '../../uploads');
    let diskUsage = 0;
    try {
      const output = execSync(`du -sb ${uploadsDir} 2>/dev/null || echo "0"`).toString();
      diskUsage = parseInt(output.split('\t')[0]) || 0;
    } catch {}
    const userStorageAgg = await User.aggregate([
      { $group: { _id: null, totalUsed: { $sum: '$storageUsed' } } }
    ]);
    res.json({ success: true, data: {
      diskUsage,
      userStorageTotal: userStorageAgg[0]?.totalUsed || 0,
    }});
  } catch (err) { next(err); }
});

// ── Trending / Featured management ────────────────────────────────────
router.patch('/anime/:id/featured', async (req, res, next) => {
  try {
    const { featured } = req.body;
    await Anime.findByIdAndUpdate(req.params.id, { isFeatured: featured });
    const redis = require('../config/redis').getRedis();
    await redis.del('featured');
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
