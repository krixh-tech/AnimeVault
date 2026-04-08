const { v4: uuidv4 } = require('uuid');
const DownloadTask = require('../models/DownloadTask');
const Episode = require('../models/Episode');
const { downloadQueue } = require('../workers/downloadQueue');
const { detectVideoUrl } = require('../services/urlDetector');
const { cleanFilename } = require('../utils/renameEngine');
const { renderCaption } = require('../utils/captionEngine');
const logger = require('../utils/logger');

// ── Detect URL ─────────────────────────────────────────────────────────
exports.detectUrl = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL required' });

    const result = await detectVideoUrl(url);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Create Download Task ───────────────────────────────────────────────
exports.createTask = async (req, res, next) => {
  try {
    const {
      videoUrl, quality = '720p', animeTitle, episodeNumber,
      animeId, episodeId, encode = false, encodeOptions,
      rename = true, captionTemplate, language = 'sub',
    } = req.body;

    if (!videoUrl) return res.status(400).json({ success: false, message: 'videoUrl required' });

    // Check user storage
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (user.storageUsed >= user.storageLimit) {
      return res.status(403).json({ success: false, message: 'Storage limit reached' });
    }

    const title = animeTitle
      ? `${animeTitle} Episode ${episodeNumber}`
      : `Download Task ${Date.now()}`;

    const task = await DownloadTask.create({
      user: req.user.id,
      anime: animeId,
      episode: episodeId,
      title,
      animeTitle,
      episodeNumber,
      videoUrl,
      quality,
      language,
      encode,
      encodeOptions: encode ? (encodeOptions || {}) : undefined,
      rename,
      captionTemplate,
      status: 'queued',
    });

    // Add to BullMQ queue
    const job = await downloadQueue.add('download', {
      taskId: task._id.toString(),
      videoUrl,
      quality,
      encode,
      encodeOptions,
      rename,
      userId: req.user.id,
    }, {
      priority: task.priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    task.jobId = job.id;
    await task.save();

    // Emit to socket
    const io = req.app.get('io');
    io?.emitUserNotification(req.user.id, {
      type: 'system',
      title: 'Download Queued',
      message: `${title} has been added to the queue`,
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ── Batch Download ─────────────────────────────────────────────────────
exports.createBatchTask = async (req, res, next) => {
  try {
    const { episodes, quality = '720p', animeId, animeTitle, encode = false, rename = true } = req.body;

    if (!episodes?.length) return res.status(400).json({ success: false, message: 'episodes array required' });
    if (episodes.length > 50) return res.status(400).json({ success: false, message: 'Max 50 episodes per batch' });

    const batchId = uuidv4();
    const tasks = [];

    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const task = await DownloadTask.create({
        user: req.user.id,
        anime: animeId,
        episode: ep.episodeId,
        title: `${animeTitle} Episode ${ep.number}`,
        animeTitle,
        episodeNumber: ep.number,
        videoUrl: ep.videoUrl,
        quality,
        encode,
        rename,
        batchId,
        batchIndex: i,
        status: 'queued',
      });

      const job = await downloadQueue.add('download', {
        taskId: task._id.toString(),
        videoUrl: ep.videoUrl,
        quality,
        encode,
        rename,
        userId: req.user.id,
      }, {
        priority: -i, // sequence by episode number
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      task.jobId = job.id;
      await task.save();
      tasks.push(task);
    }

    res.status(201).json({
      success: true,
      data: { batchId, count: tasks.length, tasks },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get User Tasks ─────────────────────────────────────────────────────
exports.getUserTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { user: req.user.id };
    if (status) filter.status = status;

    const [tasks, total] = await Promise.all([
      DownloadTask.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('anime', 'title slug coverImage')
        .populate('episode', 'number title'),
      DownloadTask.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get Task by ID ─────────────────────────────────────────────────────
exports.getTask = async (req, res, next) => {
  try {
    const task = await DownloadTask.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('anime', 'title slug coverImage').populate('episode', 'number title');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ── Cancel Task ────────────────────────────────────────────────────────
exports.cancelTask = async (req, res, next) => {
  try {
    const task = await DownloadTask.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (['completed', 'failed'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed/failed task' });
    }

    if (task.jobId) {
      const job = await downloadQueue.getJob(task.jobId);
      if (job) await job.remove();
    }

    task.status = 'cancelled';
    await task.save();

    const io = req.app.get('io');
    io?.emitTaskUpdate(task._id.toString(), { status: 'cancelled' });

    res.json({ success: true, message: 'Task cancelled' });
  } catch (err) {
    next(err);
  }
};

// ── Retry Failed Task ──────────────────────────────────────────────────
exports.retryTask = async (req, res, next) => {
  try {
    const task = await DownloadTask.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Only failed tasks can be retried' });
    }

    task.status = 'queued';
    task.progress = 0;
    task.error = undefined;
    task.retries = 0;

    const job = await downloadQueue.add('download', {
      taskId: task._id.toString(),
      videoUrl: task.videoUrl,
      quality: task.quality,
      encode: task.encode,
      rename: task.rename,
      userId: req.user.id,
    }, { attempts: 3 });

    task.jobId = job.id;
    await task.save();

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ── Delete Task ────────────────────────────────────────────────────────
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await DownloadTask.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Optionally delete file
    if (task.outputPath && req.query.deleteFile === 'true') {
      const fs = require('fs').promises;
      await fs.unlink(task.outputPath).catch(() => {});
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Get Download Stats ─────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [total, completed, failed, active] = await Promise.all([
      DownloadTask.countDocuments({ user: userId }),
      DownloadTask.countDocuments({ user: userId, status: 'completed' }),
      DownloadTask.countDocuments({ user: userId, status: 'failed' }),
      DownloadTask.countDocuments({ user: userId, status: { $in: ['queued', 'downloading', 'encoding'] } }),
    ]);

    const User = require('../models/User');
    const user = await User.findById(userId).select('storageUsed storageLimit totalDownloads');

    res.json({
      success: true,
      data: {
        total, completed, failed, active,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        totalDownloads: user.totalDownloads,
      },
    });
  } catch (err) {
    next(err);
  }
};
