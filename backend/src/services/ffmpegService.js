const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const logger = require('../utils/logger');

// Quality presets
const QUALITY_PRESETS = {
  '360p':  { width: 640,  height: 360,  crf: 28, bitrate: '800k'  },
  '480p':  { width: 854,  height: 480,  crf: 26, bitrate: '1200k' },
  '720p':  { width: 1280, height: 720,  crf: 23, bitrate: '2500k' },
  '1080p': { width: 1920, height: 1080, crf: 20, bitrate: '5000k' },
};

/**
 * Encode video with quality and codec options
 */
async function encodeVideo(inputPath, outputPath, options = {}, onProgress) {
  const {
    targetQuality = '720p',
    codec = 'h264',
    crf = 23,
    preset = 'medium',
    audioCodec = 'aac',
    audioBitrate = '128k',
  } = options;

  const preset_ = QUALITY_PRESETS[targetQuality] || QUALITY_PRESETS['720p'];
  const videoCodec = codec === 'h265' ? 'libx265' : 'libx264';

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
      .videoCodec(videoCodec)
      .audioCodec(audioCodec)
      .audioBitrate(audioBitrate)
      .size(`${preset_.width}x${preset_.height}`)
      .videoBitrate(preset_.bitrate)
      .addOption('-crf', String(crf || preset_.crf))
      .addOption('-preset', preset)
      .addOption('-movflags', '+faststart')  // Web-optimized MP4
      .addOption('-pix_fmt', 'yuv420p')
      .output(outputPath)
      .on('progress', (p) => {
        const pct = p.percent || 0;
        onProgress?.(Math.min(pct, 99));
      })
      .on('end', () => {
        logger.info(`✅ Encoded: ${path.basename(outputPath)}`);
        onProgress?.(100);
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error('FFmpeg encode error:', err.message);
        reject(err);
      });

    cmd.run();
  });
}

/**
 * Generate thumbnail from video at given time
 */
async function generateThumbnail(videoPath, outputPath, timeInSeconds = 10) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    const filename = path.basename(outputPath);

    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename,
        folder: dir,
        size: '1280x720',
      })
      .on('end', () => {
        logger.info(`✅ Thumbnail: ${filename}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.warn('Thumbnail generation failed:', err.message);
        reject(err);
      });
  });
}

/**
 * Generate multiple thumbnails (sprite sheet for video preview)
 */
async function generateThumbnailSprite(videoPath, outputDir, count = 10) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration || 0;
      const interval = duration / count;
      const timestamps = Array.from({ length: count }, (_, i) => i * interval);

      ffmpeg(videoPath)
        .screenshots({
          timestamps,
          filename: 'thumb_%i.jpg',
          folder: outputDir,
          size: '320x180',
        })
        .on('end', () => resolve(outputDir))
        .on('error', reject);
    });
  });
}

/**
 * Get video metadata (duration, resolution, codec, etc.)
 */
async function getVideoInfo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const video = metadata.streams.find(s => s.codec_type === 'video');
      const audio = metadata.streams.find(s => s.codec_type === 'audio');
      resolve({
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        width: video?.width,
        height: video?.height,
        videoCodec: video?.codec_name,
        audioCodec: audio?.codec_name,
        fps: video ? eval(video.r_frame_rate) : null,
      });
    });
  });
}

/**
 * Extract subtitles from MKV
 */
async function extractSubtitles(videoPath, outputDir) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, async (err, metadata) => {
      if (err) return reject(err);
      const subStreams = metadata.streams.filter(s => s.codec_type === 'subtitle');
      const results = [];

      for (const stream of subStreams) {
        const lang = stream.tags?.language || `track${stream.index}`;
        const outPath = path.join(outputDir, `${lang}.vtt`);
        await new Promise((res, rej) => {
          ffmpeg(videoPath)
            .outputOption(`-map 0:${stream.index}`)
            .output(outPath)
            .on('end', () => res(outPath))
            .on('error', rej)
            .run();
        });
        results.push({ language: lang, path: outPath });
      }

      resolve(results);
    });
  });
}

/**
 * Create HLS from MP4 (multi-quality)
 */
async function createHLSStream(inputPath, outputDir, qualities = ['720p', '1080p']) {
  const masterPlaylist = [];

  for (const quality of qualities) {
    const preset = QUALITY_PRESETS[quality];
    if (!preset) continue;

    const qualityDir = path.join(outputDir, quality);
    const playlistPath = path.join(qualityDir, 'index.m3u8');

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .size(`${preset.width}x${preset.height}`)
        .addOption('-crf', String(preset.crf))
        .addOption('-preset', 'veryfast')
        .addOption('-sc_threshold', '0')
        .addOption('-g', '48')
        .addOption('-keyint_min', '48')
        .addOption('-hls_time', '4')
        .addOption('-hls_playlist_type', 'vod')
        .addOption('-hls_segment_filename', path.join(qualityDir, 'seg%d.ts'))
        .output(playlistPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    masterPlaylist.push({
      bandwidth: parseInt(preset.bitrate) * 1000,
      resolution: `${preset.width}x${preset.height}`,
      playlist: `${quality}/index.m3u8`,
    });
  }

  // Write master playlist
  const masterPath = path.join(outputDir, 'master.m3u8');
  const masterContent = [
    '#EXTM3U',
    ...masterPlaylist.map(p => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${p.bandwidth},RESOLUTION=${p.resolution}`,
      p.playlist,
    ].join('\n')),
  ].join('\n');

  const fsp = require('fs').promises;
  await fsp.writeFile(masterPath, masterContent);

  return masterPath;
}

module.exports = {
  encodeVideo,
  generateThumbnail,
  generateThumbnailSprite,
  getVideoInfo,
  extractSubtitles,
  createHLSStream,
  QUALITY_PRESETS,
};
