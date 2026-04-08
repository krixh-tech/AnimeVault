const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const TEMPLATES = {
  verification: (data) => ({
    subject: '🎌 Verify your AnimaVault account',
    html: `<div style="font-family:sans-serif;background:#0a0a0f;color:#fff;padding:40px;border-radius:12px">
      <h1 style="color:#7c3aed">Welcome to AnimaVault, ${data.username}!</h1>
      <p>Click the button below to verify your email address.</p>
      <a href="${process.env.FRONTEND_URL}/verify/${data.token}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Verify Email</a>
      <p style="color:#666">This link expires in 24 hours.</p>
    </div>`,
  }),
  new_episode: (data) => ({
    subject: `🎌 New Episode: ${data.animeTitle} Episode ${data.episodeNumber}`,
    html: `<div style="font-family:sans-serif;background:#0a0a0f;color:#fff;padding:40px;border-radius:12px">
      <img src="${data.coverImage}" alt="${data.animeTitle}" style="width:120px;border-radius:8px;float:left;margin-right:16px"/>
      <h1 style="color:#7c3aed">${data.animeTitle}</h1>
      <p>Episode ${data.episodeNumber} is now available!</p>
      <a href="${process.env.FRONTEND_URL}/anime/${data.animeSlug}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Watch Now</a>
    </div>`,
  }),
  download_complete: (data) => ({
    subject: `✅ Download Complete: ${data.filename}`,
    html: `<div style="font-family:sans-serif;background:#0a0a0f;color:#fff;padding:40px;border-radius:12px">
      <h1 style="color:#10b981">Download Complete!</h1>
      <p><strong>${data.filename}</strong> has finished downloading.</p>
      <p>Quality: ${data.quality} | Size: ${data.size}</p>
      <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">View Dashboard</a>
    </div>`,
  }),
};

async function sendEmail({ to, subject, template, data, html }) {
  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured, skipping email');
    return;
  }

  const tp = getTransporter();
  const content = template ? TEMPLATES[template]?.(data) : { subject, html };
  if (!content) return;

  await tp.sendMail({
    from: `"AnimaVault" <${process.env.SMTP_USER}>`,
    to,
    subject: content.subject,
    html: content.html,
  });

  logger.info(`📧 Email sent to ${to}: ${content.subject}`);
}

module.exports = { sendEmail };
