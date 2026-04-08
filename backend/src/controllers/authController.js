const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendEmail } = require('../services/emailService');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

// ── Register ───────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.email === email ? 'Email already registered' : 'Username taken',
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      username, email, password,
      verificationToken,
    });

    // Send verification email (non-blocking)
    sendEmail({
      to: email,
      subject: '🎌 Welcome to AnimaVault - Verify your email',
      template: 'verification',
      data: { username, token: verificationToken },
    }).catch((err) => logger.warn('Email send failed:', err));

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          preferences: user.preferences,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ──────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.isBanned) {
      return res.status(403).json({ success: false, message: `Account banned: ${user.banReason}` });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken]; // keep last 5
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          preferences: user.preferences,
          isVerified: user.isVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ──────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ success: false, message: 'Token revoked' });
    }

    const tokens = generateTokens(user._id, user.role);
    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
};

// ── Logout ─────────────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user.id).select('+refreshTokens');
    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save({ validateBeforeSave: false });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Get Me ─────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── Verify Email ───────────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');
    if (!user) return res.status(400).json({ success: false, message: 'Invalid token' });
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Email verified!' });
  } catch (err) {
    next(err);
  }
};
