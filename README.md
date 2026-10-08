# 🏛️ BidWatch — GeM Tenders Portal & Live Shortlisting Engine

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)

**BidWatch** is a real-time Government e-Marketplace (GeM) tender tracking and procurement intelligence platform. It automatically scans, aggregates, and organizes tenders published in the last 24 hours (5,000+ bids), featuring real-time shortlisting, reverse auction (RA) filtering, CSV exports, live system logging, and note-taking.

---

## 🏗️ Architecture Overview

The system consists of two core components:

1. **Backend & Scraper Engine (`gem-tenders.js`)**:
   - Standalone Node.js service with **zero external npm dependencies** (built using native `http`, `https`, `fs`, `url` modules).
   - Scrapes official GeM portal (`bidplus.gem.gov.in`), caches data locally (`today_gem_tenders.json`, `today_gem_tenders.csv`), and exposes REST API endpoints on **Port 7700**.
   - Can also serve the compiled React SPA directly in production.

2. **Frontend Portal (`client/`)**:
   - Built with **React 19**, **Vite 6**, **Tailwind CSS v4**, and **SCSS**.
   - Includes real-time KPI metrics, search, tender cards/tables, quick modal previews, notes modal, and live system log terminal.
   - Development server runs on **Port 3000** and proxies `/api` requests to **Port 7700**.

---

## 🚀 How to Run the Project

You can run BidWatch either **locally with Node.js** (recommended for fastest setup and development) or **via Docker Compose**.

---

### Option 1: Local Development (Recommended)

#### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v26)
- **npm**: v9+

#### Step 1: Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

#### Step 2: Start the Backend Server (Terminal 1)
```bash
node gem-tenders.js
```
> Starts the backend API and initial GeM sync on **`http://localhost:7700`**.

#### Step 3: Start the Frontend Dev Server (Terminal 2)
```bash
cd client
npm run dev
```
> Starts Vite development server with hot module replacement on **`http://localhost:3000`**.

#### Step 4: Open in Browser
Open **[http://localhost:3000](http://localhost:3000)** in your browser. All API requests (`/api/*`) are automatically proxied to the backend on port 7700.

---

### Option 2: All-in-One Standalone Mode (No Dev Server)

If you build the React frontend once, `gem-tenders.js` can serve both the API and the React production bundle from a single port:

```bash
# 1. Build the frontend
cd client && npm run build && cd ..

# 2. Run backend (serves both API + React SPA)
node gem-tenders.js
```
Open **[http://localhost:7700](http://localhost:7700)**.

---

### Option 3: Docker & Docker Compose

Docker Compose files are provided at the root of the project:

- [`docker-compose.yml`](./docker-compose.yml): Production setup (Backend + Nginx Frontend Proxy)
- [`docker-compose.dev.yml`](./docker-compose.dev.yml): Development setup with hot reload
- [`Dockerfile`](./Dockerfile): Backend container definition
- [`client/Dockerfile`](./client/Dockerfile): Frontend container definition (Multi-stage + Nginx)

#### Run with Docker Compose (Production)

```bash
# Build and start all services
docker compose up --build

# Run in background (detached mode)
docker compose up -d
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000) (Nginx reverse proxies `/api/` to backend)
- **Backend Direct API**: [http://localhost:7700](http://localhost:7700)

To stop the containers:
```bash
docker compose down
```

#### Run with Docker Compose (Live Development Mode)

```bash
docker compose -f docker-compose.dev.yml up --build
```

> **Note for Linux / Ubuntu users**: If `docker compose` returns `unknown command: docker compose`, install the Docker Compose plugin:
> ```bash
> sudo apt-get update && sudo apt-get install docker-compose-plugin
> ```

---

## 💻 CLI & Scraper Utility Commands

You can run the backend scraper directly from the command line without launching the UI:

| Command | Description |
| :--- | :--- |
| `node gem-tenders.js` | Starts server and preloads last 24h tenders |
| `node gem-tenders.js --cli` | Scans GeM portal, outputs terminal preview, and saves JSON & CSV |
| `node gem-tenders.js --sync` | Forces a fresh 24h rescan from GeM portal |
| `cd client && npm run server` | Starts backend from client directory |
| `cd client && npm run sync` | Triggers CLI sync from client directory |
| `cd client && npm run build` | Builds frontend production assets to `client/dist` |
| `cd client && npm run lint` | Runs TypeScript lint check |

---

## 📡 API Endpoints

The backend exposes the following endpoints:

| Endpoint | Method | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/tenders` | `GET` | `mode=24h` (default) | Returns all tenders published in the last 24 hours |
| `/api/tenders` | `GET` | `page=1&search=...&type=all&sort=Bid-Start-Date-Latest` | Paginated search across active GeM bids |
| `/api/logs` | `GET` | — | Returns recent system activity logs |
| `/healthz` | `GET` | — | Nginx health check endpoint (in Docker) |

---

## ⚙️ Environment Variables

### Backend Configuration
| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `7700` | Port for the Node backend server |
| `NODE_ENV` | `development` | Set to `production` when deployed |

### Frontend Configuration (`client/.env`)
Copy [`client/.env.example`](./client/.env.example) to `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:7700
VITE_ENABLE_AUTO_POLL=true
VITE_POLL_INTERVAL_MS=30000
```

---

## 📁 Repository Structure

```text
BidWatch/
├── Dockerfile                  # Production Dockerfile for Node.js backend
├── docker-compose.yml          # Production Docker Compose (Backend + Nginx Frontend)
├── docker-compose.dev.yml      # Development Docker Compose (Hot reloading)
├── gem-tenders.js              # Standalone GeM scraper, API server & CLI runner
├── gem-tenders.log             # Persistent log output (git-ignored)
├── .gitignore                  # Root Git ignore rules
├── README.md                   # Project documentation
│
└── client/                     # React 19 Frontend
    ├── Dockerfile              # Multi-stage Dockerfile (Vite build + Nginx)
    ├── Dockerfile.dev          # Dev Dockerfile with hot reloading
    ├── nginx.conf              # Nginx reverse proxy configuration for /api/
    ├── package.json            # Frontend dependencies & scripts
    ├── vite.config.js          # Vite config (Tailwind, proxy rules)
    ├── src/
    │   ├── App.jsx             # Main dashboard layout & state management
    │   ├── components/         # Modals, TenderCard, TenderGrid, Header, KPI strip
    │   ├── services/gemApi.js  # GeM API client & polling service
    │   └── styles/             # SCSS & Tailwind design tokens
    └── public/                 # Static assets, logo, manifest
```

---

## 📄 License
ISC / Private
