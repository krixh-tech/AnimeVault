# 🎌 AnimaVault — Premium Anime Streaming & Download Platform

A full-stack, production-ready anime streaming and download platform combining the best of modern anime streaming sites and Telegram download bots in a single web application.

---

## ✨ Features

| Category | Features |
|---|---|
| **Streaming** | HLS.js player, multi-quality, subtitles, PiP, speed control, fullscreen |
| **Downloads** | Smart URL detection, batch download, queue system, progress tracking |
| **Video** | FFmpeg encoding, thumbnail generation, HLS segmentation, H264/H265 |
| **Metadata** | AniList + Jikan (MAL) auto-import, full anime database |
| **Scheduler** | Auto new-episode detection every 10 minutes |
| **Notifications** | In-app, email, real-time via Socket.IO |
| **Auth** | JWT + refresh tokens, email verification, role-based access |
| **Admin** | Full dashboard: users, downloads, workers, storage |
| **Rename Engine** | Auto-clean filenames, remove site tags and encoding noise |
| **Caption Templates** | `{filename}`, `{episode}`, `{quality}` with `[B]`/`[T]`/`[SP]` tags |
| **Storage** | Local filesystem or S3/Cloudflare R2 |

---

## 🗂️ Project Structure

```
animavault/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── server.js           # Entry point, Express + Socket.IO
│   │   ├── config/             # DB, Redis, Socket setup
│   │   ├── models/             # Mongoose schemas
│   │   ├── controllers/        # Route handlers
│   │   ├── routes/             # Express routers
│   │   ├── middleware/         # Auth, error handler, rate limiter
│   │   ├── services/           # FFmpeg, metadata, email, storage, URL detector
│   │   ├── workers/            # BullMQ download worker, episode scheduler
│   │   └── utils/              # Logger, rename engine, caption engine
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── Dockerfile.scheduler
│
├── frontend/                   # Next.js 14 App Router
│   ├── src/
│   │   ├── app/                # Pages (home, anime, watch, download, dashboard, admin)
│   │   ├── components/         # Layout, anime cards, video player, download UI
│   │   ├── lib/                # Axios client, Socket.IO init
│   │   ├── hooks/              # useSocket
│   │   └── store/              # Zustand (auth, notifications)
│   └── Dockerfile
│
├── docker/
│   ├── nginx.conf              # Reverse proxy config
│   └── mongo-init.js           # DB initialization
│
├── docker-compose.yml          # Full stack orchestration
└── .env.example                # Environment variables template
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone and setup env
git clone <repo>
cd animavault
cp .env.example .env
# Edit .env with your secrets

# 2. Start everything
docker-compose up -d

# 3. Open
# Frontend: http://localhost:3000
# API:      http://localhost:5000
# Admin login: admin@animavault.io / admin123
```

### Option 2: Manual Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start MongoDB + Redis (Docker)
docker-compose up -d mongodb redis

# Backend (in backend/)
cp ../.env.example .env
npm run dev          # API server on :5000
npm run worker       # Download worker
npm run scheduler    # Episode scheduler

# Frontend (in frontend/)
npm run dev          # Next.js on :3000
```

---

## 🔌 API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Get current user |

### Anime
| Method | Path | Description |
|---|---|---|
| GET  | `/api/anime` | List anime (paginated, filterable) |
| GET  | `/api/anime/trending` | Trending anime |
| GET  | `/api/anime/featured` | Featured (hero banner) |
| GET  | `/api/anime/latest-episodes` | Latest episodes |
| GET  | `/api/anime/:slug` | Anime detail + episodes |
| POST | `/api/anime/import/anilist` | Import from AniList |

### Downloads
| Method | Path | Description |
|---|---|---|
| POST | `/api/downloads/detect` | Detect video sources from URL |
| POST | `/api/downloads/tasks` | Create download task |
| POST | `/api/downloads/tasks/batch` | Batch download multiple episodes |
| GET  | `/api/downloads/tasks` | Get user's tasks |
| POST | `/api/downloads/tasks/:id/cancel` | Cancel task |
| POST | `/api/downloads/tasks/:id/retry` | Retry failed task |

### Streaming
| Method | Path | Description |
|---|---|---|
| GET  | `/api/stream/:episodeId` | Get streaming sources |
| POST | `/api/stream/:episodeId/progress` | Save watch progress |

---

## ⚙️ Environment Variables

See `.env.example` for the complete list. Key variables:

```env
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=<64-char random string>
STORAGE_MODE=local         # or s3
WORKER_CONCURRENCY=3       # parallel downloads
```

---

## 📦 Download Queue Task Lifecycle

```
User submits URL
     ↓
Smart URL Detection (urlDetector.js)
     ↓
DownloadTask created (status: queued)
     ↓
BullMQ job added
     ↓
Worker picks up job
     ↓
[downloading] → progress updates via Redis pub/sub → Socket.IO → browser
     ↓
[encoding]    → optional FFmpeg re-encode
     ↓
[completed]   → file saved, thumbnail generated, user notified
```

---

## 🎨 Design System

- **Colors**: Violet (`#7c3aed`) + Cyan (`#06b6d4`) neon palette
- **Font**: Orbitron (headings) + Inter (body)
- **Theme**: Deep dark `#0a0a0f` base with glassmorphism cards
- **Effects**: Neon glow, scan-lines, CSS shimmer skeletons
- **Animations**: Framer Motion page transitions + micro-interactions

---

## 🐳 Services (Docker Compose)

| Service | Port | Description |
|---|---|---|
| `nginx` | 80 | Reverse proxy |
| `frontend` | 3000 | Next.js |
| `backend` | 5000 | Express API + Socket.IO |
| `worker` | — | BullMQ download worker |
| `scheduler` | — | Episode auto-detection |
| `mongodb` | 27017 | Database |
| `redis` | 6379 | Queue + cache + pub/sub |

---

## 📝 Caption Template Reference

```
Template:  [B]🎬 {anime}[/B]
           Episode {episode} · {quality}
           📦 {size}

Output:    **🎬 Naruto Shippuden**
           Episode 01 · 1080p
           📦 1.2 GB
```

**Variables**: `{filename}` `{episode}` `{quality}` `{language}` `{size}` `{title}` `{anime}` `{date}`

**Tags**: `[B]` bold · `[T]` italic · `[U]` underline · `[SP]` spoiler · `[CODE]` code

---

## 🔒 Security

- JWT access tokens (15min) + refresh tokens (7 days, rotated)
- Rate limiting on all endpoints
- Helmet.js security headers
- MongoDB sanitization (XSS + NoSQL injection)
- HPP (HTTP Parameter Pollution) protection
- Storage quota per user

---

## 📄 License

MIT — Build something amazing.
