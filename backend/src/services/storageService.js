const path = require('path');
const fs = require('fs').promises;

// ── Local Storage ──────────────────────────────────────────────────────
async function saveLocally(buffer, filename, subdir = '') {
  const uploadDir = path.join(__dirname, '../../uploads', subdir);
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${subdir ? subdir + '/' : ''}${filename}`;
}

// ── S3 / R2 Compatible Storage ────────────────────────────────────────
async function uploadToS3(filePath, key) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const fileBuffer = await fs.readFile(filePath);
  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
    // For R2: endpoint: process.env.R2_ENDPOINT
  });
  await client.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ACL: 'public-read',
  }));
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

// ── Main export ────────────────────────────────────────────────────────
async function uploadToStorage(filePath, key) {
  if (process.env.STORAGE_MODE === 's3') return uploadToS3(filePath, key);
  const filename = path.basename(key);
  const subdir = path.dirname(key);
  return saveLocally(await fs.readFile(filePath), filename, subdir);
}

async function deleteFromStorage(urlOrKey) {
  if (process.env.STORAGE_MODE === 's3') {
    const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({ region: process.env.AWS_REGION });
    await client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: urlOrKey }));
  } else {
    const localPath = path.join(__dirname, '../..', urlOrKey.startsWith('/') ? urlOrKey : `/${urlOrKey}`);
    await fs.unlink(localPath).catch(() => {});
  }
}

module.exports = { uploadToStorage, deleteFromStorage, saveLocally };
