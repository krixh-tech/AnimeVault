// MongoDB initialization script
db = db.getSiblingDB('animavault');

// Create indexes
db.createCollection('animes');
db.createCollection('episodes');
db.createCollection('users');
db.createCollection('downloadtasks');
db.createCollection('notifications');
db.createCollection('watchhistories');
db.createCollection('bookmarks');

// Create admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@animavault.io',
  // password: "admin123" (bcrypt hash - change in production!)
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewxq4yJ7gKjxQQgO',
  role: 'admin',
  isVerified: true,
  isActive: true,
  isBanned: false,
  storageUsed: 0,
  storageLimit: 107374182400,
  totalDownloads: 0,
  totalWatchTime: 0,
  preferences: {
    defaultQuality: '1080p',
    autoPlay: true,
    skipIntro: false,
    theme: 'dark',
    language: 'sub',
    notifications: { email: true, push: true, newEpisodes: true }
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print('✅ AnimaVault database initialized');
