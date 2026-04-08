// ── routes/anime.js ──────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/animeController');
const { protect, requireAdmin, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, ctrl.getAnime);
router.get('/trending', ctrl.getTrending);
router.get('/featured', ctrl.getFeatured);
router.get('/latest-episodes', ctrl.getLatestEpisodes);
router.get('/genres', ctrl.getGenres);
router.get('/:slug', optionalAuth, ctrl.getAnimeBySlug);
router.post('/:animeId/bookmark', protect, ctrl.toggleBookmark);
router.post('/', protect, requireAdmin, ctrl.createAnime);
router.put('/:id', protect, requireAdmin, ctrl.updateAnime);
router.delete('/:id', protect, requireAdmin, ctrl.deleteAnime);
router.post('/import/anilist', protect, requireAdmin, ctrl.importFromAniList);

module.exports = router;
