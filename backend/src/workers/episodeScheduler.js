/**
 * AnimaVault Episode Scheduler
 * Periodically checks for new episodes and notifies users
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const cron = require('node-cron');
const axios = require('axios');
const connectDB = require('../config/database');
const connectRedis = require('../config/redis');
const Anime = require('../models/Anime');
const Episode = require('../models/Episode');
const { Notification, Bookmark } = require('../models/index');
const { notificationQueue } = require('./downloadQueue');
const logger = require('../utils/logger');

// ── Fetch from AniList (episode release check) ─────────────────────────
async function checkAniListForNewEpisodes(anime) {
  if (!anime.externalIds?.anilist) return null;

  try {
    const query = `
      query ($id: Int) {
        Media(id: $id) {
          nextAiringEpisode { episode airingAt timeUntilAiring }
          episodes
          status
        }
      }
    `;
    const resp = await axios.post('https://graphql.anilist.co', {
      query,
      variables: { id: anime.externalIds.anilist },
    }, { timeout: 10000 });

    return resp.data?.data?.Media || null;
  } catch (err) {
    logger.warn(`AniList check failed for ${anime.displayTitle}:`, err.message);
    return null;
  }
}

// ── Check Jikan (MAL) for episodes ────────────────────────────────────
async function checkJikanForEpisodes(anime, page = 1) {
  if (!anime.externalIds?.mal) return [];

  try {
    const resp = await axios.get(
      `https://api.jikan.moe/v4/anime/${anime.externalIds.mal}/episodes?page=${page}`,
      { timeout: 10000 }
    );
    return resp.data?.data || [];
  } catch {
    return [];
  }
}

// ── Sync episodes from Jikan ──────────────────────────────────────────
async function syncEpisodesFromJikan(anime) {
  const jikanEpisodes = await checkJikanForEpisodes(anime);
  if (!jikanEpisodes.length) return 0;

  let newCount = 0;
  for (const ep of jikanEpisodes) {
    const exists = await Episode.findOne({ anime: anime._id, number: ep.mal_id });
    if (exists) continue;

    await Episode.create({
      anime: anime._id,
      number: ep.mal_id,
      title: ep.title || `Episode ${ep.mal_id}`,
      airDate: ep.aired ? new Date(ep.aired) : null,
      duration: ep.duration || anime.duration || 24,
      isSubbed: true,
    });
    newCount++;
  }

  return newCount;
}

// ── Notify subscribers of new episode ─────────────────────────────────
async function notifyNewEpisode(anime, episodeNumber) {
  // Find all users who bookmarked this anime
  const bookmarks = await Bookmark.find({
    anime: anime._id,
    status: { $in: ['watching', 'plan_to_watch'] },
  }).populate('user', 'preferences telegram email');

  for (const bookmark of bookmarks) {
    if (!bookmark.user) continue;
    const prefs = bookmark.user.preferences?.notifications;

    if (prefs?.newEpisodes !== false) {
      // Create in-app notification
      await Notification.create({
        user: bookmark.user._id,
        type: 'new_episode',
        title: `New Episode: ${anime.title.en}`,
        message: `Episode ${episodeNumber} is now available!`,
        image: anime.coverImage?.medium,
        link: `/anime/${anime.slug}`,
        data: { animeId: anime._id, episode: episodeNumber },
      });

      // Queue email notification
      if (prefs?.email !== false && bookmark.user.email) {
        await notificationQueue.add('email', {
          to: bookmark.user.email,
          subject: `🎌 New Episode: ${anime.title.en} Episode ${episodeNumber}`,
          template: 'new_episode',
          data: {
            animeTitle: anime.title.en,
            episodeNumber,
            coverImage: anime.coverImage?.medium,
            animeSlug: anime.slug,
          },
        });
      }
    }
  }

  // Emit real-time via global io
  if (global.io) {
    global.io.emitNewEpisode(anime._id.toString(), {
      animeId: anime._id,
      animeTitle: anime.title.en,
      animeSlug: anime.slug,
      episodeNumber,
      coverImage: anime.coverImage?.medium,
    });
  }

  logger.info(`📣 Notified ${bookmarks.length} users of ${anime.title.en} EP${episodeNumber}`);
}

// ── Main check job ─────────────────────────────────────────────────────
async function checkForNewEpisodes() {
  logger.info('🔍 Checking for new episodes...');

  try {
    // Only check ongoing anime
    const ongoingAnime = await Anime.find({ status: 'RELEASING' })
      .limit(50) // Process 50 at a time to avoid rate limits
      .select('_id title slug externalIds duration coverImage');

    let totalNew = 0;

    for (const anime of ongoingAnime) {
      try {
        // Check current highest episode in DB
        const latestEp = await Episode.findOne({ anime: anime._id })
          .sort({ number: -1 })
          .select('number');
        const currentMax = latestEp?.number || 0;

        // Sync from Jikan
        const newCount = await syncEpisodesFromJikan(anime);

        if (newCount > 0) {
          totalNew += newCount;
          const newMax = currentMax + newCount;
          for (let ep = currentMax + 1; ep <= newMax; ep++) {
            await notifyNewEpisode(anime, ep);
          }
        }

        // Respect rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        logger.warn(`Failed to check ${anime.title.en}:`, err.message);
      }
    }

    logger.info(`✅ Episode check complete. Found ${totalNew} new episodes.`);
  } catch (err) {
    logger.error('Episode check failed:', err);
  }
}

// ── Update trending scores ─────────────────────────────────────────────
async function updateTrendingScores() {
  logger.info('📊 Updating trending scores...');
  try {
    // Simple trending: views in last 7 days * 2 + bookmarks
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const { WatchHistory } = require('../models/index');

    const trendingData = await WatchHistory.aggregate([
      { $match: { watchedAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$anime', recentViews: { $sum: 1 } } },
      { $sort: { recentViews: -1 } },
      { $limit: 100 },
    ]);

    for (let i = 0; i < trendingData.length; i++) {
      await Anime.updateOne(
        { _id: trendingData[i]._id },
        { $set: { trending: trendingData.length - i } }
      );
    }
    logger.info('✅ Trending scores updated');
  } catch (err) {
    logger.error('Trending update failed:', err);
  }
}

// ── Start scheduler ────────────────────────────────────────────────────
async function startScheduler() {
  await connectDB();
  await connectRedis();

  logger.info('⏰ Episode scheduler started');

  // Check for new episodes every 10 minutes
  cron.schedule('*/10 * * * *', checkForNewEpisodes, { timezone: 'UTC' });

  // Update trending scores every hour
  cron.schedule('0 * * * *', updateTrendingScores, { timezone: 'UTC' });

  // Run immediately on startup
  setTimeout(checkForNewEpisodes, 5000);
}

startScheduler().catch(err => {
  logger.error('Scheduler startup failed:', err);
  process.exit(1);
});
