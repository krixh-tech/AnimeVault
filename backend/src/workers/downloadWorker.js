/**
 * AnimaVault Download Worker
 * Processes video download tasks from BullMQ queue
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const https = require('https');
const http = require('http');
const axios = require('axios');

const connectDB = require('../config/database');
const connectRedis = require('../config/redis');
const DownloadTask = require('../models/DownloadTask');
const Episode = require('../models/Episode');
const User = require('../models/User');
const { cleanFilename } = require('../utils/renameEngine');
const { renderCaption } = require('../utils/captionEngine');
const { encodeVideo, generateThumbnail } = require('../services/ffmpegService');
const { uploadToStorage } = require('../services/storageService');
const logger = require('../utils/logger');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

// Ensure dirs exist
[UPLOADS_DIR, TEMP_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const connection = {
  host: (() => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const match = url.match(/redis:\/\/(?::.*@)?([^:]+)/);
    return match?.[1] || 'localhost';
  })(),
  port: 6379,
  password: (() => {
    const url = process.env.REDIS_URL || '';
    const match = url.match(/redis:\/\/:(.+)@/);
    return match?.[1] || undefined;
  })(),
};

// ── Download file with progress ───────────────────────────────────────
async function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloaded = 0;
    let total = 0;

    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(url).origin,
      },
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        return downloadFile(response.headers.location, destPath, onProgress)
          .then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      total = parseInt(response.headers['content-length'] || '0');
      let lastReport = Date.now();

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const now = Date.now();
        if (now - lastReport > 500) { // report every 500ms
          onProgress?.(downloaded, total);
          lastReport = now;
        }
      });

      response.pipe(file);
      file.on('finish', () => { file.close(); resolve({ downloaded, total }); });
    });

    req.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
    file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

// ── Download HLS stream ───────────────────────────────────────────────
async function downloadHLS(m3u8Url, destPath, onProgress) {
  const { default: ffmpeg } = await import('fluent-ffmpeg');
  return new Promise((resolve, reject) => {
    let duration = 0;

    ffmpeg(m3u8Url)
      .inputOptions([
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
        '-allowed_extensions', 'ALL',
      ])
      .outputOptions([
        '-c', 'copy',
        '-bsf:a', 'aac_adtstoasc',
      ])
      .output(destPath)
      .on('codecData', (data) => {
        const match = data.duration?.match(/(\d+):(\d+):(\d+)/);
        if (match) duration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
      })
      .on('progress', (progress) => {
        const pct = duration > 0
          ? Math.min((progress.timemark?.split(':').reduce((acc, t, i) => acc + parseFloat(t) * [3600, 60, 1][i], 0) / duration) * 100, 99)
          : progress.percent || 0;
        onProgress?.(pct);
      })
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// ── Main Worker ───────────────────────────────────────────────────────
const worker = new Worker('downloads', async (job) => {
  const { taskId, videoUrl, quality, encode, encodeOptions, rename, userId } = job.data;

  const task = await DownloadTask.findById(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const updateTask = async (updates) => {
    Object.assign(task, updates);
    await task.save();
    // Emit via Redis pub/sub (worker can't access Socket.IO directly)
    const redis = require('../config/redis').getRedis();
    await redis.publish('task:update', JSON.stringify({ taskId, ...updates }));
  };

  // ── Mark downloading ────────────────────────────────────────────
  await updateTask({ status: 'downloading', startedAt: new Date(), progress: 0 });
  await job.updateProgress(0);

  // ── Determine filename ──────────────────────────────────────────
  const ext = videoUrl.includes('.m3u8') ? 'mp4' : (videoUrl.match(/\.(mp4|mkv|webm)/)?.[1] || 'mp4');
  const rawName = `task_${taskId}.${ext}`;
  const tempPath = path.join(TEMP_DIR, rawName);
  let finalPath = path.join(UPLOADS_DIR, 'videos', `user_${userId}`, rawName);

  // Ensure user dir
  await fsp.mkdir(path.dirname(finalPath), { recursive: true });

  try {
    // ── Download ──────────────────────────────────────────────────
    const isHLS = videoUrl.includes('.m3u8') || videoUrl.includes('m3u8');

    if (isHLS) {
      await downloadHLS(videoUrl, tempPath, async (pct) => {
        const p = Math.round(pct * 0.6); // 0-60% for download phase
        await updateTask({ progress: p, downloadedBytes: 0, totalBytes: 0 });
        await job.updateProgress(p);
      });
    } else {
      let lastBytes = 0;
      let lastTime = Date.now();

      await downloadFile(videoUrl, tempPath, async (downloaded, total) => {
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        const speed = elapsed > 0 ? (downloaded - lastBytes) / elapsed : 0;
        const pct = total > 0 ? Math.round((downloaded / total) * 60) : 0;
        const eta = speed > 0 && total > 0 ? Math.round((total - downloaded) / speed) : 0;

        lastBytes = downloaded;
        lastTime = now;

        await updateTask({ progress: pct, downloadedBytes: downloaded, totalBytes: total, speed, eta });
        await job.updateProgress(pct);
      });
    }

    // ── Rename ────────────────────────────────────────────────────
    let outputFilename = rawName;
    if (rename && task.animeTitle) {
      const cleaned = cleanFilename({
        title: task.animeTitle,
        episode: task.episodeNumber,
        quality: task.quality,
        ext,
      });
      outputFilename = cleaned;
    }

    finalPath = path.join(path.dirname(finalPath), outputFilename);
    await fsp.rename(tempPath, finalPath);

    await updateTask({ progress: 65, outputPath: finalPath, outputFilename, renamedFilename: outputFilename });
    await job.updateProgress(65);

    // ── Generate thumbnail ─────────────────────────────────────────
    const thumbDir = path.join(UPLOADS_DIR, 'thumbnails', `user_${userId}`);
    await fsp.mkdir(thumbDir, { recursive: true });
    const thumbPath = path.join(thumbDir, `${taskId}.jpg`);

    try {
      await generateThumbnail(finalPath, thumbPath, 10); // thumbnail at 10s
      task.thumbnail = `/uploads/thumbnails/user_${userId}/${taskId}.jpg`;
    } catch (e) {
      logger.warn('Thumbnail generation failed:', e.message);
    }

    await updateTask({ progress: 70 });
    await job.updateProgress(70);

    // ── Encode ────────────────────────────────────────────────────
    let encodedPath = finalPath;
    if (encode && encodeOptions) {
      await updateTask({ status: 'encoding', progress: 75 });
      await job.updateProgress(75);

      const encodedName = outputFilename.replace(/\.(mp4|mkv|webm)$/, `_${encodeOptions.targetQuality || '720p'}.mp4`);
      encodedPath = path.join(path.dirname(finalPath), encodedName);

      await encodeVideo(finalPath, encodedPath, {
        targetQuality: encodeOptions.targetQuality || '720p',
        codec: encodeOptions.codec || 'h264',
        crf: encodeOptions.crf || 23,
        preset: encodeOptions.preset || 'medium',
      }, async (pct) => {
        const p = 75 + Math.round(pct * 0.2);
        await updateTask({ progress: p });
        await job.updateProgress(p);
      });

      // Remove original if encoded
      await fsp.unlink(finalPath).catch(() => {});
    }

    // ── Upload to external storage ────────────────────────────────
    let publicUrl = `/uploads/videos/user_${userId}/${outputFilename}`;
    if (process.env.STORAGE_MODE === 's3') {
      await updateTask({ progress: 92 });
      const s3Key = `videos/user_${userId}/${outputFilename}`;
      publicUrl = await uploadToStorage(encodedPath, s3Key);
    }

    // ── Get file stats ─────────────────────────────────────────────
    const stats = await fsp.stat(encodedPath);

    // ── Generate caption ───────────────────────────────────────────
    let generatedCaption = '';
    if (task.captionTemplate) {
      generatedCaption = renderCaption(task.captionTemplate, {
        filename: outputFilename,
        episode: task.episodeNumber,
        quality: task.quality,
        language: task.language,
        size: formatBytes(stats.size),
      });
    }

    // ── Update Episode with local file ────────────────────────────
    if (task.episode) {
      await Episode.updateOne(
        { _id: task.episode },
        { $push: { localFiles: { quality: task.quality, path: publicUrl, size: stats.size, mimeType: 'video/mp4' } } }
      );
    }

    // ── Update user storage ────────────────────────────────────────
    await User.updateOne({ _id: userId }, {
      $inc: { storageUsed: stats.size, totalDownloads: 1 },
    });

    // ── Complete ──────────────────────────────────────────────────
    await updateTask({
      status: 'completed',
      progress: 100,
      outputPath: encodedPath,
      outputFilename,
      fileSize: stats.size,
      mimeType: 'video/mp4',
      generatedCaption,
      completedAt: new Date(),
      eta: 0,
      speed: 0,
    });
    await job.updateProgress(100);

    logger.info(`✅ Task ${taskId} completed: ${outputFilename} (${formatBytes(stats.size)})`);

    return { success: true, filename: outputFilename, size: stats.size };

  } catch (err) {
    // Cleanup temp file
    await fsp.unlink(tempPath).catch(() => {});

    await updateTask({
      status: 'failed',
      error: err.message,
      retries: (task.retries || 0) + 1,
    });

    logger.error(`❌ Task ${taskId} failed:`, err.message);
    throw err;
  }
}, {
  connection,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
  limiter: { max: 10, duration: 60000 }, // max 10 downloads per minute
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

worker.on('completed', (job) => logger.info(`Worker job ${job.id} done`));
worker.on('failed', (job, err) => logger.error(`Worker job ${job?.id} failed:`, err.message));
worker.on('error', (err) => logger.error('Worker error:', err));

// Startup
async function start() {
  await connectDB();
  await connectRedis();
  logger.info('🔧 Download worker started');
}

start().catch((err) => { logger.error('Worker startup failed:', err); process.exit(1); });

module.exports = worker;
