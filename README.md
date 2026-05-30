# SpoTube

A cross-platform desktop music application that lets you stream Spotify playlists through YouTube, download tracks offline, and manage your personal music library.

## Features

- Stream Spotify playlists via YouTube
- Search YouTube songs and videos
- Import YouTube playlists
- Download MP3 / MP4 (powered by yt-dlp)
- User account system (register, login, JWT auth)
- Personal playlists and favorites management
- Quick demo login

## Architecture

```
SpoTube/
├── server/           # Fastify API server (Node.js)
│   ├── src/
│   │   ├── auth/         # Register / login / JWT
│   │   ├── spotify/      # Spotify playlist resolution
│   │   ├── youtube/      # YouTube search & download
│   │   ├── playlists/    # User playlist CRUD
│   │   ├── favorites/    # Favorite tracks management
│   │   ├── security/     # IP firewall middleware
│   │   └── server.js     # Entry point
│   └── prisma/
│       └── schema.prisma
└── client-desktop/   # Electron + React + Vite desktop client
    └── src/
        ├── main/         # Electron main process
        └── renderer/     # React UI
```

---

## Setup

### Requirements

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) (local or remote)
- [Redis](https://redis.io/) (local or remote)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (required for download feature)

---

### 1. Getting API Keys

#### Spotify API

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create App"**
3. Fill in the app name and description, set Redirect URI to `http://localhost:3000`
4. Copy the **Client ID** and **Client Secret** from your app dashboard

#### YouTube Data API v3

> **Note:** The YouTube Data API key is currently optional — the app uses the scraping-based `yt-search` library by default.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Navigate to **APIs & Services → Library**, search for "YouTube Data API v3" and enable it
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**

---

### 2. Server Setup

```bash
cd server
npm install
```

Fill in the `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/spotube_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_long_and_secret_key_here"
YOUTUBE_API_KEY="AIza..."
SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
DEMO_EMAIL="demo@spotube.com"
DEMO_PASSWORD="demo123"
```

Push the database schema:

```bash
npm run db:push
npm run db:generate
```

Start the server:

```bash
npm run dev     # Development mode (nodemon)
npm start       # Production mode
```

Server runs at `http://localhost:3000`

---

### 3. Desktop Client Setup

```bash
cd client-desktop
npm install
```

Start the React dev server:

```bash
npm run dev     # Vite dev server: http://localhost:5173
```

Start Electron (in a separate terminal):

```bash
npm run start:electron
```

---

### 4. Quick Start (start.bat)

Run the `start.bat` file in the root directory to launch both the server and the client simultaneously.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Get current session info |
| GET | `/youtube/search?q=` | Search YouTube tracks |
| GET | `/youtube/playlist?id=` | Fetch YouTube playlist |
| GET | `/youtube/download?id=&format=` | Stream audio/video download |
| GET | `/spotify/playlist?url=` | Resolve Spotify playlist via YouTube |
| GET | `/spotify/home-data` | Home page curated categories |
| GET | `/playlists` | List user playlists |
| POST | `/playlists` | Create a playlist |
| GET | `/playlists/:id` | Get playlist details |
| POST | `/playlists/:id/add` | Add a single track |
| POST | `/playlists/:id/bulk-add` | Add multiple tracks at once |
| DELETE | `/playlists/:id` | Delete a playlist |
| GET | `/favorites` | Get favorite tracks |
| POST | `/favorites/toggle` | Add or remove a favorite |
| GET | `/health` | Server health check |

---

## Demo Login

Click the **"Quick Demo Login"** button when the app opens to sign in instantly with the test account.

```
Email:    demo@spotube.com
Password: demo123
```

---

## Tech Stack

**Server**
- [Fastify](https://fastify.dev/) — HTTP framework
- [Prisma](https://www.prisma.io/) — ORM
- [PostgreSQL](https://www.postgresql.org/) — Database
- [Redis](https://redis.io/) — Session & rate limiting
- [Argon2](https://github.com/ranisalt/node-argon2) — Password hashing
- [Zod](https://zod.dev/) — Schema validation
- [yt-search](https://github.com/talmobi/yt-search) — YouTube search
- [spotify-url-info](https://github.com/microlinkhq/spotify-url-info) — Spotify metadata

**Client**
- [Electron](https://www.electronjs.org/) — Desktop runtime
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) — UI
- [Zustand](https://zustand-demo.pmnd.rs/) — State management
- [Lucide React](https://lucide.dev/) — Icons
- [react-youtube](https://github.com/tjallingh/react-youtube) — YouTube player
- [youtube-dl-exec](https://github.com/microlinkhq/youtube-dl-exec) — yt-dlp wrapper

---

## Security

- Passwords hashed with Argon2
- JWT-based authentication
- IP-level firewall with risk scoring system
- Rate limiting (100 requests per minute)
- Secure HTTP headers via Helmet
- `.env` file protected by `.gitignore`

---

## License

MIT
