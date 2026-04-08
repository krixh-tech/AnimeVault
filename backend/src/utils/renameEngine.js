/**
 * AnimaVault Rename Engine
 * Cleans filenames and generates standardized names
 */

// Tags and patterns to remove
const REMOVE_PATTERNS = [
  /\[([^\]]*)\]/g,         // [HorribleSubs], [1080p], [x264], etc.
  /\(([^)]*(?:sub|dub|raw|bluray|bd|dvd|web|avc|hevc|x264|x265|aac|flac|xvid)[^)]*)\)/gi,
  /\b(?:www|http|https)\.[^\s]*/gi,
  /\b(?:BluRay|BDRip|DVDRip|WEBRip|WEB-DL|HDRip|HDTV|720p|1080p|480p|360p|4K|UHD)\b/gi,
  /\b(?:x264|x265|H\.264|H\.265|HEVC|AVC|AAC|MP3|FLAC|AC3|DTS|Atmos)\b/gi,
  /\b(?:HorribleSubs|SubsPlease|Erai-raws|AnimeTime|AnimeDubs|AnimeOut)\b/gi,
  /\b(?:MULTI|VOSTFR|VF|VO|VOST|DUAL|DUBBED|SUBBED|SUB|DUB)\b/gi,
  /\b(?:repack|proper|extended|theatrical|unrated|directors\.cut)\b/gi,
  /[-_\.]{2,}/g,           // multiple separators
];

const EPISODE_PATTERNS = [
  /[Ee](?:pisode)?[-\s]?(\d+)/,
  /[-_\s](?:ep|e)[-_\s]?(\d{2,3})/i,
  /[-_\s](\d{2,3})[-_\s](?:end|fin|v\d)/i,
  /\s(\d{2,3})\s/,
];

const QUALITY_PATTERNS = {
  '4K': /\b(?:4[Kk]|2160p|UHD)\b/,
  '1080p': /\b1080p?\b/i,
  '720p': /\b720p?\b/i,
  '480p': /\b480p?\b/i,
  '360p': /\b360p?\b/i,
};

/**
 * Clean a raw filename removing site tags, encoding info, etc.
 */
function cleanRawFilename(filename) {
  let name = filename;

  // Remove extension first
  const extMatch = name.match(/\.(mp4|mkv|webm|avi|mov)$/i);
  const ext = extMatch ? extMatch[0] : '.mp4';
  name = name.replace(/\.(mp4|mkv|webm|avi|mov)$/i, '');

  // Apply removal patterns
  for (const pattern of REMOVE_PATTERNS) {
    name = name.replace(pattern, ' ');
  }

  // Replace separators with spaces
  name = name.replace(/[_\.]/g, ' ');

  // Remove multiple spaces
  name = name.replace(/\s+/g, ' ').trim();

  return name + ext;
}

/**
 * Generate a standardized filename
 */
function cleanFilename({ title, episode, quality, ext = 'mp4', language = '' }) {
  // Clean the title
  let cleanTitle = title
    .replace(/[<>:"/\\|?*]/g, '')  // Remove invalid chars
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize words
  cleanTitle = cleanTitle.replace(/\b\w/g, c => c.toUpperCase());

  const parts = [cleanTitle];
  if (episode !== undefined && episode !== null) {
    const epStr = String(episode).padStart(2, '0');
    parts.push(`Episode ${epStr}`);
  }
  if (quality) parts.push(quality);
  if (language && language !== 'sub') parts.push(language.toUpperCase());

  return `${parts.join(' ')}.${ext}`;
}

/**
 * Extract episode number from filename or URL
 */
function extractEpisodeNumber(str) {
  for (const pattern of EPISODE_PATTERNS) {
    const m = str.match(pattern);
    if (m) return parseInt(m[1]);
  }
  return null;
}

/**
 * Extract quality from filename or URL
 */
function extractQuality(str) {
  for (const [quality, pattern] of Object.entries(QUALITY_PATTERNS)) {
    if (pattern.test(str)) return quality;
  }
  return null;
}

/**
 * Extract series title from filename (removes episode, quality, tags)
 */
function extractSeriesTitle(filename) {
  let name = filename
    .replace(/\.(mp4|mkv|webm|avi)$/i, '')
    .replace(/\[([^\]]*)\]/g, '')      // remove brackets
    .replace(/\(([^)]*)\)/g, '');       // remove parens

  // Remove episode pattern and everything after
  for (const pattern of EPISODE_PATTERNS) {
    const idx = name.search(pattern);
    if (idx > 0) {
      name = name.substring(0, idx);
      break;
    }
  }

  // Remove quality keywords
  name = name.replace(/\b(?:4K|1080p|720p|480p|360p|BluRay|WEB-DL|BDRip)\b/gi, '');
  name = name.replace(/[_\.\-]+/g, ' ').replace(/\s+/g, ' ').trim();

  return name;
}

/**
 * Batch rename multiple files
 */
function batchRename(files, options = {}) {
  return files.map((file, index) => {
    const episode = extractEpisodeNumber(file) || (options.startEpisode ? options.startEpisode + index : index + 1);
    const title = options.seriesTitle || extractSeriesTitle(file) || 'Unknown Anime';
    const quality = options.quality || extractQuality(file) || '720p';

    return {
      original: file,
      renamed: cleanFilename({ title, episode, quality, ext: 'mp4', language: options.language }),
      episode,
      title,
      quality,
    };
  });
}

module.exports = { cleanFilename, cleanRawFilename, extractEpisodeNumber, extractQuality, extractSeriesTitle, batchRename };
