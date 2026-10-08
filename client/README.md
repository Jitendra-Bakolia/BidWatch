# 🏛️ GeM Tenders Portal — React + Vite Client

Next-generation real-time Government e-Marketplace (GeM) tenders portal and live shortlisting engine, built with React 19, Vite 6, Tailwind CSS v4, SCSS design architecture, and Lucide Icons.

## 🚀 Key Features

- **⚡ Real-Time 24-Hour Bid Tracker**: Instant visibility over tenders published within the last 24 hours.
- **🎯 Reverse Auction (RA) Engine**: Dedicated toggle to isolate or hide Reverse Auction (RA) tenders.
- **⭐ Shortlisting & Quotation Notes**: Star tenders and maintain internal quotation notes with offline and online sync.
- **📊 Real-Time KPI Strip**: Instant metrics for 24h bids, starred tenders, closing soon, and high-value contracts.
- **🔍 Full-Text Deep Search & Multilevel Filters**: Search by item, bid number, ministry, product vs. service type, and multiple sort modes.
- **📥 One-Click CSV Export**: Instant export of filtered or shortlisted tenders for procurement analysis.
- **📜 Live System Terminal**: Real-time log monitoring directly from `gem-tenders.log` and GeM sync worker.
- **🔐 GeM Account Vault**: Quick credential manager for 1-click official GeM portal login.
- **📱 Responsive Mobile Experience**: Mobile bottom navigation bar, touch drawers, and responsive grid/table views.

## 🛠️ Development & Usage

```bash
# Start frontend Vite development server (Port 3000)
npm run dev

# Start backend GeM scraper & API server (Port 7700)
npm run server

# Force fresh 24h sync from GeM portal
npm run sync

# Production build
npm run build
```
