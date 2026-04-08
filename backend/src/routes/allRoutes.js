// ── routes/downloads.js ──────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/downloadController');
const { protect } = require('../middleware/auth');
const { downloadLimiter, detectLimiter } = require('../middleware/rateLimiter');

router.post('/detect', protect, detectLimiter, ctrl.detectUrl);
router.post('/tasks', protect, downloadLimiter, ctrl.createTask);
router.post('/tasks/batch', protect, downloadLimiter, ctrl.createBatchTask);
router.get('/tasks', protect, ctrl.getUserTasks);
router.get('/tasks/stats', protect, ctrl.getStats);
router.get('/tasks/:id', protect, ctrl.getTask);
router.post('/tasks/:id/cancel', protect, ctrl.cancelTask);
router.post('/tasks/:id/retry', protect, ctrl.retryTask);
router.delete('/tasks/:id', protect, ctrl.deleteTask);

module.exports = router;


// ── routes/search.js ─────────────────────────────────────────────────
const express2 = require('express');
const searchRouter = express2.Router();
const Anime = require('../models/Anime');
const { searchLimiter } = require('../middleware/rateLimiter');

searchRouter.get('/', searchLimiter, async (req, res, next) => {
  try {
    const { q, genre, type, status, year, page = 1, limit = 20 } = req.query;
    if (!q && !genre && !type && !status && !year) {
      return res.status(400).json({ success: false, message: 'At least one search parameter required' });
    }

    const filter = {};
    if (q) filter.$text = { $search: q };
    if (genre) filter.genres = genre.toLowerCase();
    if (type) filter.type = type.toUpperCase();
    if (status) filter.status = status.toUpperCase();
    if (year) filter.releaseYear = parseInt(year);

    const [results, total] = await Promise.all([
      Anime.find(filter)
        .sort(q ? { score: { $meta: 'textScore' } } : { popularity: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select('title slug coverImage genres type status rating.average releaseYear'),
      Anime.countDocuments(filter),
    ]);

    res.json({ success: true, data: results, total, page: parseInt(page) });
  } catch (err) { next(err); }
});

module.exports.downloadRouter = router;
module.exports.searchRouter = searchRouter;


// ── routes/stream.js ─────────────────────────────────────────────────
const express3 = require('express');
const streamRouter = express3.Router();
const Episode = require('../models/Episode');
const { WatchHistory } = require('../models/index');
const { protect, optionalAuth } = require('../middleware/auth');

// Get streaming sources for an episode
streamRouter.get('/:episodeId', optionalAuth, async (req, res, next) => {
  try {
    const episode = await Episode.findById(req.params.episodeId)
      .populate('anime', 'title slug coverImage');
    if (!episode) return res.status(404).json({ success: false, message: 'Episode not found' });

    // Increment view
    Episode.updateOne({ _id: episode._id }, { $inc: { views: 1 } }).exec();
    if (episode.anime) {
      require('../models/Anime').updateOne({ _id: episode.anime._id }, { $inc: { views: 1 } }).exec();
    }

    res.json({ success: true, data: {
      episode: {
        id: episode._id,
        number: episode.number,
        title: episode.title,
        duration: episode.duration,
        thumbnail: episode.thumbnail,
      },
      sources: episode.sources,
      hlsPlaylist: episode.hlsPlaylist,
      subtitles: episode.subtitles,
      anime: episode.anime,
    }});
  } catch (err) { next(err); }
});

// Update watch progress
streamRouter.post('/:episodeId/progress', protect, async (req, res, next) => {
  try {
    const { progress, duration } = req.body;
    const completed = duration > 0 && progress / duration > 0.9;
    await WatchHistory.findOneAndUpdate(
      { user: req.user.id, episode: req.params.episodeId },
      { $set: { progress, duration, completed, watchedAt: new Date() },
        $setOnInsert: { anime: req.body.animeId } },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports.streamRouter = streamRouter;


// ── routes/notifications.js ──────────────────────────────────────────
const express4 = require('express');
const notifRouter = express4.Router();
const { Notification } = require('../models/index');
const { protect: protectN } = require('../middleware/auth');

notifRouter.get('/', protectN, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const filter = { user: req.user.id };
    if (unread === 'true') filter.isRead = false;
    const [notifs, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Notification.countDocuments(filter),
    ]);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    res.json({ success: true, data: notifs, total, unreadCount });
  } catch (err) { next(err); }
});

notifRouter.patch('/read-all', protectN, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

notifRouter.patch('/:id/read', protectN, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports.notifRouter = notifRouter;


// ── routes/tasks.js (alias) ───────────────────────────────────────────
const express5 = require('express');
const tasksRouter = express5.Router();
const DownloadTask = require('../models/DownloadTask');
const { protect: protectT, requireAdmin: requireAdminT } = require('../middleware/auth');

// Admin: all tasks
tasksRouter.get('/all', protectT, requireAdminT, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};
    const [tasks, total] = await Promise.all([
      DownloadTask.find(filter).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(parseInt(limit))
        .populate('user', 'username email')
        .populate('anime', 'title slug'),
      DownloadTask.countDocuments(filter),
    ]);
    res.json({ success: true, data: tasks, total });
  } catch (err) { next(err); }
});

// Admin queue stats
tasksRouter.get('/queue-stats', protectT, requireAdminT, async (req, res, next) => {
  try {
    const { downloadQueue } = require('../workers/downloadQueue');
    const [waiting, active, completed, failed] = await Promise.all([
      downloadQueue.getWaitingCount(),
      downloadQueue.getActiveCount(),
      downloadQueue.getCompletedCount(),
      downloadQueue.getFailedCount(),
    ]);
    res.json({ success: true, data: { waiting, active, completed, failed } });
  } catch (err) { next(err); }
});

module.exports.tasksRouter = tasksRouter;


// ── routes/users.js ──────────────────────────────────────────────────
const express6 = require('express');
const userRouter = express6.Router();
const { protect: protectU } = require('../middleware/auth');
const { WatchHistory, Bookmark } = require('../models/index');
const User = require('../models/User');

userRouter.get('/watch-history', protectU, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const history = await WatchHistory.find({ user: req.user.id })
      .sort({ watchedAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit))
      .populate('anime', 'title slug coverImage')
      .populate('episode', 'number title thumbnail');
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
});

userRouter.get('/bookmarks', protectU, async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user.id })
      .populate('anime', 'title slug coverImage genres status rating.average');
    res.json({ success: true, data: bookmarks });
  } catch (err) { next(err); }
});

userRouter.patch('/preferences', protectU, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { preferences: req.body } },
      { new: true }
    );
    res.json({ success: true, data: user.preferences });
  } catch (err) { next(err); }
});

module.exports.userRouter = userRouter;
