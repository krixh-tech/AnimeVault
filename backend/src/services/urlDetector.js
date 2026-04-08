/**
 * Smart URL Detector
 * Detects video sources, HLS playlists, quality options from any URL
 */
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Detect episode info from URL ───────────────────────────────────────
function parseUrlMeta(url) {
  const result = { url, series: null, episode: null, quality: null, site: null };

  try {
    const u = new URL(url);
    result.site = u.hostname.replace('www.', '');

    // Episode number patterns
    const epPatterns = [
      /[Ee](?:pisode)?[-\s]?(\d+)/,
      /[-_]ep[-_]?(\d+)/i,
      /\/(\d+)\/?$/,
      /episode[/-](\d+)/i,
    ];
    for (const pattern of epPatterns) {
      const m = url.match(pattern);
      if (m) { result.episode = parseInt(m[1]); break; }
    }

    // Series from path
    const pathParts = u.pathname.split('/').filter(Boolean);
    if (pathParts.length > 1) {
      result.series = pathParts[pathParts.length - 2]
        ?.replace(/-/g, ' ')
        ?.replace(/\b\w/g, c => c.toUpperCase());
    }

    // Quality hints
    const qualityMatch = url.match(/(\d{3,4}p)/i);
    if (qualityMatch) result.quality = qualityMatch[1].toLowerCase();

  } catch {}

  return result;
}

// ── Extract video from page ────────────────────────────────────────────
async function extractFromPage(url) {
  const sources = [];

  try {
    const resp = await axios.get(url, {
      headers: { ...HEADERS, Referer: new URL(url).origin },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = resp.data;
    const $ = cheerio.load(html);

    // 1. Direct <source> tags
    $('source[src]').each((_, el) => {
      const src = $(el).attr('src');
      const type = $(el).attr('type') || '';
      const size = $(el).attr('size') || $(el).attr('label') || '';
      if (src && isVideoUrl(src)) {
        sources.push({
          url: resolveUrl(src, url),
          type: type.includes('m3u8') ? 'hls' : 'mp4',
          quality: extractQuality(src) || size || 'auto',
        });
      }
    });

    // 2. <video src> attribute
    $('video[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && isVideoUrl(src)) {
        sources.push({ url: resolveUrl(src, url), type: 'mp4', quality: 'auto' });
      }
    });

    // 3. JSON-LD / application/json scripts
    $('script[type="application/json"], script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        extractUrlsFromObject(data, url, sources);
      } catch {}
    });

    // 4. Inline script scanning
    const scriptContent = $('script:not([src])').map((_, el) => $(el).html()).get().join('\n');
    extractUrlsFromScript(scriptContent, url, sources);

    // 5. iframe embeds
    const iframes = [];
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.includes('ads')) iframes.push(resolveUrl(src, url));
    });

    // Recurse into iframes (1 level deep)
    for (const iframeSrc of iframes.slice(0, 3)) {
      try {
        const iframeSources = await extractFromIframe(iframeSrc, url);
        sources.push(...iframeSources);
      } catch {}
    }

  } catch (err) {
    logger.warn(`URL extraction failed for ${url}:`, err.message);
  }

  return dedupeSources(sources);
}

async function extractFromIframe(url, referer) {
  const sources = [];
  try {
    const resp = await axios.get(url, {
      headers: { ...HEADERS, Referer: referer },
      timeout: 10000,
    });
    const $ = cheerio.load(resp.data);
    const scriptContent = $('script:not([src])').map((_, el) => $(el).html()).get().join('\n');
    extractUrlsFromScript(scriptContent, url, sources);
    $('source[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && isVideoUrl(src)) {
        sources.push({ url: resolveUrl(src, url), type: 'mp4', quality: extractQuality(src) || 'auto' });
      }
    });
  } catch {}
  return sources;
}

function extractUrlsFromScript(script, baseUrl, sources) {
  // m3u8 URLs
  const m3u8Matches = script.matchAll(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]*?)["'`]/g);
  for (const m of m3u8Matches) {
    sources.push({ url: m[1], type: 'hls', quality: extractQuality(m[1]) || 'auto' });
  }

  // mp4/mkv URLs
  const mp4Matches = script.matchAll(/["'`](https?:\/\/[^"'`]+\.(mp4|mkv|webm)[^"'`]*?)["'`]/g);
  for (const m of mp4Matches) {
    sources.push({ url: m[1], type: m[2], quality: extractQuality(m[1]) || 'auto' });
  }

  // JWPlayer / video.js config patterns
  const jwMatch = script.match(/(?:jwplayer|videojs)[^{]+{([^}]+file[^}]+)}/s);
  if (jwMatch) {
    const fileMatch = jwMatch[1].match(/file["'\s]*:["'\s]*(https?:\/\/[^"'\s,}]+)/);
    if (fileMatch && isVideoUrl(fileMatch[1])) {
      sources.push({ url: fileMatch[1], type: fileMatch[1].includes('m3u8') ? 'hls' : 'mp4', quality: 'auto' });
    }
  }

  // sources array pattern: [{file: "...", label: "720p"}]
  const sourcesMatch = script.matchAll(/\{[^}]*(?:file|src)["'\s]*:["'\s]*(https?:\/\/[^"'\s,}]+)[^}]*(?:label|size)["'\s]*:["'\s]*["']([^"']+)["'][^}]*\}/g);
  for (const m of sourcesMatch) {
    if (isVideoUrl(m[1])) {
      sources.push({ url: m[1], type: m[1].includes('m3u8') ? 'hls' : 'mp4', quality: m[2] });
    }
  }
}

function extractUrlsFromObject(obj, baseUrl, sources) {
  if (typeof obj === 'string') {
    if (isVideoUrl(obj)) sources.push({ url: obj, type: obj.includes('m3u8') ? 'hls' : 'mp4', quality: extractQuality(obj) || 'auto' });
    return;
  }
  if (Array.isArray(obj)) { obj.forEach(v => extractUrlsFromObject(v, baseUrl, sources)); return; }
  if (typeof obj === 'object' && obj) {
    Object.values(obj).forEach(v => extractUrlsFromObject(v, baseUrl, sources));
  }
}

function isVideoUrl(url) {
  return /\.(mp4|mkv|webm|m3u8|ts)(\?|$|#)/i.test(url) ||
    url.includes('.m3u8') || url.includes('/hls/') || url.includes('/playlist/');
}

function extractQuality(url) {
  const m = url.match(/(\d{3,4})p/i);
  return m ? m[1] + 'p' : null;
}

function resolveUrl(src, base) {
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
}

function dedupeSources(sources) {
  const seen = new Set();
  return sources.filter(s => {
    const key = s.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Check if URL is a direct video ────────────────────────────────────
async function checkDirectVideo(url) {
  try {
    const resp = await axios.head(url, {
      headers: HEADERS,
      timeout: 8000,
      maxRedirects: 5,
    });
    const ct = resp.headers['content-type'] || '';
    const cl = parseInt(resp.headers['content-length'] || '0');
    return {
      isDirect: ct.includes('video') || ct.includes('octet-stream'),
      contentType: ct,
      size: cl,
      filename: url.split('/').pop()?.split('?')[0],
    };
  } catch {
    return { isDirect: false };
  }
}

// ── Main export ────────────────────────────────────────────────────────
async function detectVideoUrl(url) {
  const meta = parseUrlMeta(url);

  // 1. Check if it's a direct video link
  const direct = await checkDirectVideo(url);
  if (direct.isDirect || isVideoUrl(url)) {
    const isHLS = url.includes('.m3u8');
    return {
      ...meta,
      isDirectVideo: true,
      sources: [{
        url,
        type: isHLS ? 'hls' : 'mp4',
        quality: extractQuality(url) || 'auto',
        size: direct.size,
      }],
      streamingUrl: isHLS ? url : null,
      downloadUrl: isHLS ? null : url,
    };
  }

  // 2. Scrape the page for video sources
  const sources = await extractFromPage(url);

  // 3. Classify sources
  const hlsSources = sources.filter(s => s.type === 'hls');
  const mp4Sources = sources.filter(s => s.type !== 'hls');

  return {
    ...meta,
    isDirectVideo: false,
    sources,
    hlsSources,
    mp4Sources,
    streamingUrl: hlsSources[0]?.url || null,
    downloadUrl: mp4Sources[0]?.url || hlsSources[0]?.url || null,
    qualities: [...new Set(sources.map(s => s.quality).filter(Boolean))],
  };
}

module.exports = { detectVideoUrl, extractFromPage, parseUrlMeta };
