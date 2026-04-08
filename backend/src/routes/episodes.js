// episodes.js
const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const { protect, requireAdmin } = require('../middleware/auth');

router.get('/anime/:animeId', async (req, res, next) => {
  try {
    const episodes = await Episode.find({ anime: req.params.animeId }).sort({ number: 1 });
    res.json({ success: true, data: episodes });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ep = await Episode.findById(req.params.id).populate('anime', 'title slug coverImage');
    if (!ep) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: ep });
  } catch (err) { next(err); }
});

router.post('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const ep = await Episode.create(req.body);
    res.status(201).json({ success: true, data: ep });
  } catch (err) { next(err); }
});

router.put('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const ep = await Episode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ep) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: ep });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    await Episode.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Episode deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
