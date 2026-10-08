/**
 * ==============================================================================
 * 🏛️ GeM (Government e-Marketplace) Tenders Portal & Live Shortlisting Engine
 * ==============================================================================
 * All-in-One Standalone File.
 * Zero external dependencies (uses native Node.js https & http modules).
 * Automatically loads and displays ALL tenders from the LAST 24 HOURS (5,655+ bids).
 *
 * HOW TO RUN:
 *   node gem-tenders.js          -> Starts Web Dashboard & prints 24h tenders table
 *   node gem-tenders.js --cli    -> CLI only: Scans GeM and saves JSON & CSV
 *   node gem-tenders.js --sync   -> Forces fresh 24h rescan from GeM portal
 * ==============================================================================
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 7700;
const ROOT_DIR = __dirname || process.cwd();
const LOG_FILE = path.join(ROOT_DIR, 'gem-tenders.log');
const JSON_CACHE_FILE = path.join(ROOT_DIR, 'today_gem_tenders.json');
const CSV_CACHE_FILE = path.join(ROOT_DIR, 'today_gem_tenders.csv');

// Health Check & Render Keep-Alive Configuration (Default: every 3 minutes)
const HEALTH_CHECK_INTERVAL_MS = parseInt(
  process.env.HEALTH_CHECK_INTERVAL_MS || process.env.PING_INTERVAL_MS || String(3 * 60 * 1000),
  10
);
const DISABLE_SELF_PING = process.env.DISABLE_SELF_PING === 'true';

// ---------------------------------------------------------------------------
// 1. Console & File Logging Engine
// ---------------------------------------------------------------------------

const MAX_LOGS = 1000;
const inMemoryLogs = [];

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').slice(0, 19);
}

function writeLog(level, tag, message, extra = null) {
  const time = formatTimestamp();
  const extraStr = extra ? (typeof extra === 'object' ? ' ' + JSON.stringify(extra) : ' ' + extra) : '';
  const plainLine = `[${time}] [${level.toUpperCase()}] [${tag}] ${message}${extraStr}\n`;

  inMemoryLogs.push({
    id: Date.now() + Math.random().toString(36).substr(2, 4),
    time,
    level,
    tag,
    message,
    extra: extra ? (typeof extra === 'object' ? extra : String(extra)) : null
  });
  if (inMemoryLogs.length > MAX_LOGS) inMemoryLogs.shift();

  fs.appendFile(LOG_FILE, plainLine, (err) => {
    if (err) console.error('Failed to write to gem-tenders.log:', err.message);
  });

  let levelColor = colors.reset;
  if (level === 'info') levelColor = colors.green;
  else if (level === 'gem') levelColor = colors.magenta;
  else if (level === 'http') levelColor = colors.cyan;
  else if (level === 'warn') levelColor = colors.yellow;
  else if (level === 'error') levelColor = colors.red;

  console.log(`${colors.dim}[${time}]${colors.reset} ${levelColor}${colors.bright}[${tag}]${colors.reset} ${message}${extraStr ? colors.dim + extraStr + colors.reset : ''}`);
}

const logger = {
  info: (tag, msg, extra) => writeLog('info', tag, msg, extra),
  gem: (tag, msg, extra) => writeLog('gem', tag, msg, extra),
  http: (tag, msg, extra) => writeLog('http', tag, msg, extra),
  warn: (tag, msg, extra) => writeLog('warn', tag, msg, extra),
  error: (tag, msg, extra) => writeLog('error', tag, msg, extra),
  getRecent: () => [...inMemoryLogs]
};

// ---------------------------------------------------------------------------
// 2. GeM BidPlus Network & Scraping Engine (Pure Node.js HTTPS)
// ---------------------------------------------------------------------------

const sharedHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: 30 });

let sessionCache = {
  cookie: null,
  csrfToken: null,
  expiresAt: 0
};

function httpsRequest(url, options = {}, postData = null) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      agent: sharedHttpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.headers || {})
      },
      timeout: 20000
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, headers: res.headers, body, duration });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      logger.error('GeM-HTTPS', `Request failed to ${url} after ${duration}ms`, err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      logger.error('GeM-HTTPS', `Request timed out to ${url}`);
      reject(new Error('GeM connection timed out.'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function getGeMSession(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && sessionCache.csrfToken && sessionCache.cookie && sessionCache.expiresAt > now) {
    return sessionCache;
  }

  logger.gem('GeM-Auth', 'Connecting to https://bidplus.gem.gov.in/all-bids to acquire fresh session...');
  const res = await httpsRequest('https://bidplus.gem.gov.in/all-bids');
  if (res.statusCode !== 200) {
    logger.error('GeM-Auth', `Failed to connect to GeM portal. HTTP status: ${res.statusCode}`);
    throw new Error(`Failed to connect to GeM portal. HTTP status: ${res.statusCode}`);
  }

  const setCookies = res.headers['set-cookie'] || [];
  const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');

  const csrfMatch = res.body.match(/csrf_bd_gem_nk[\x27\x22]\s*:\s*[\x27\x22]([a-f0-9]+)[\x27\x22]/i);
  if (!csrfMatch || !csrfMatch[1]) {
    logger.error('GeM-Auth', 'CSRF token pattern not found in GeM response');
    throw new Error('CSRF token not found in GeM response');
  }

  sessionCache = {
    cookie: cookieHeader,
    csrfToken: csrfMatch[1],
    expiresAt: now + (15 * 60 * 1000)
  };

  logger.gem('GeM-Auth', `Session acquired successfully. CSRF: ${csrfMatch[1].slice(0, 8)}... | Cookies: ${setCookies.length} found`);
  return sessionCache;
}

function normalizeBid(doc) {
  const bidId = Array.isArray(doc.b_id) ? doc.b_id[0] : (doc.b_id || doc.id);
  const bidNumber = Array.isArray(doc.b_bid_number) ? doc.b_bid_number[0] : (doc.b_bid_number || 'N/A');
  const categoryName = Array.isArray(doc.b_category_name) ? doc.b_category_name.join(', ') : (doc.b_category_name || doc.bd_category_name?.[0] || 'N/A');
  const quantity = Array.isArray(doc.b_total_quantity) ? doc.b_total_quantity[0] : (doc.b_total_quantity || 1);
  const startDate = Array.isArray(doc.final_start_date_sort) ? doc.final_start_date_sort[0] : (doc.final_start_date_sort || '');
  const endDate = Array.isArray(doc.final_end_date_sort) ? doc.final_end_date_sort[0] : (doc.final_end_date_sort || '');
  const ministry = Array.isArray(doc.ba_official_details_minName) ? doc.ba_official_details_minName[0] : (doc.ba_official_details_minName || 'Not Specified');
  const department = Array.isArray(doc.ba_official_details_deptName) ? doc.ba_official_details_deptName[0] : (doc.ba_official_details_deptName || '');
  const isHighValue = Boolean(Array.isArray(doc.is_high_value) ? doc.is_high_value[0] : doc.is_high_value);
  const bidType = Array.isArray(doc.b_bid_type) ? doc.b_bid_type[0] : (doc.b_bid_type || 1);

  let docPath = `showbidDocument/${bidId}`;
  let typeLabel = 'BID';

  if (bidType === 5) {
    typeLabel = 'RA';
    docPath = `showdirectradocumentPdf/${bidId}`;
  } else if (bidType === 2) {
    typeLabel = 'RA';
    docPath = `showradocumentPdf/${bidId}`;
  }

  const now = Date.now();
  const sTime = startDate ? new Date(startDate).getTime() : 0;
  const eTime = endDate ? new Date(endDate).getTime() : 0;
  const isWithin24Hours = sTime >= (now - (24 * 60 * 60 * 1000));
  const isClosingIn24Hours = eTime >= now && eTime <= (now + (24 * 60 * 60 * 1000));

  return {
    id: String(bidId),
    bidId,
    bidNumber,
    categoryName,
    quantity: Number(quantity) || 1,
    startDate,
    endDate,
    ministry,
    department,
    isHighValue,
    bidType,
    typeLabel,
    docUrl: `https://bidplus.gem.gov.in/${docPath}`,
    isWithin24Hours,
    isClosingIn24Hours
  };
}

async function fetchBidsPage({ page = 1, search = '', type = 'all', sort = 'Bid-Start-Date-Latest', highBidValue = '', retried = false }) {
  const session = await getGeMSession(retried);

  const payload = {
    page: Number(page) || 1,
    param: { searchBid: search || '', searchType: 'fullText' },
    filter: {
      bidStatusType: 'ongoing_bids',
      byType: type || 'all',
      highBidValue: highBidValue || '',
      byEndDate: { from: '', to: '' },
      sort: sort || 'Bid-Start-Date-Latest'
    }
  };

  const postBody = 'payload=' + encodeURIComponent(JSON.stringify(payload)) + '&csrf_bd_gem_nk=' + session.csrfToken;

  try {
    const res = await httpsRequest('https://bidplus.gem.gov.in/all-bids-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': session.cookie,
        'Referer': 'https://bidplus.gem.gov.in/all-bids',
        'Origin': 'https://bidplus.gem.gov.in',
        'Content-Length': Buffer.byteLength(postBody)
      }
    }, postBody);

    const data = JSON.parse(res.body);
    if (data && data.code === 200) {
      const rawResponse = data.response?.response || {};
      const total = rawResponse.numFound || 0;
      const docs = rawResponse.docs || [];
      return {
        bids: docs.map(normalizeBid),
        total,
        page: Number(page),
        totalPages: Math.ceil(total / 10)
      };
    } else {
      throw new Error(data?.message || 'GeM response code error');
    }
  } catch (err) {
    if (!retried) {
      return fetchBidsPage({ page, search, type, sort, highBidValue, retried: true });
    }
    throw err;
  }
}

/**
 * Fetch ALL tenders published in the last 24 hours.
 * Uses concurrent chunks of 15 pages until start date drops below 24h cutoff.
 */
async function fetchBidsLast24Hours({ maxPages = 850, onProgress = null } = {}) {
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  logger.gem('GeM-24h', `Initiating 24-hour scan (Cutoff: ${cutoff24h.toISOString()})...`);

  const CHUNK_SIZE = 15;
  let page = 1;
  let all24hBids = [];
  const seenIds = new Set();
  let reachedOld = false;
  let grandTotal = 0;
  let consecutiveOldCount = 0;

  while (page <= maxPages && !reachedOld) {
    const pageNums = [];
    for (let i = 0; i < CHUNK_SIZE && (page + i) <= maxPages; i++) {
      pageNums.push(page + i);
    }

    const promises = pageNums.map(p =>
      fetchBidsPage({ page: p, sort: 'Bid-Start-Date-Latest' })
        .catch(err => {
          logger.warn('GeM-24h', `Page ${p} query failed: ${err.message}`);
          return { bids: [], total: 0 };
        })
    );

    const results = await Promise.all(promises);

    for (const res of results) {
      if (res.total > grandTotal) grandTotal = res.total;
      if (!res.bids || res.bids.length === 0) {
        reachedOld = true;
        break;
      }

      for (const b of res.bids) {
        const sDate = b.startDate ? new Date(b.startDate) : null;
        if (sDate && sDate < cutoff24h) {
          consecutiveOldCount++;
          if (consecutiveOldCount >= 25) {
            reachedOld = true;
            break;
          }
        } else {
          consecutiveOldCount = 0;
          if (!seenIds.has(b.id)) {
            seenIds.add(b.id);
            all24hBids.push(b);
          }
        }
      }
      if (reachedOld) break;
    }

    const currentMaxPage = page + pageNums.length - 1;
    if (onProgress) {
      onProgress(all24hBids.length, currentMaxPage);
    }
    logger.info('GeM-24h', `Progress: ${all24hBids.length} tenders collected within last 24h (scanned through page ${currentMaxPage})...`);
    page += CHUNK_SIZE;
  }

  logger.info('GeM-24h', `Complete! Retrieved ${all24hBids.length} tenders from the last 24 hours (Total on GeM: ${grandTotal.toLocaleString()}).`);
  return {
    bids: all24hBids,
    total: grandTotal,
    cutoffTime: cutoff24h.toISOString(),
    count: all24hBids.length
  };
}

async function fetchBids({ page = 1, search = '', type = 'all', sort = 'Bid-Start-Date-Latest', batchPages = 1, highBidValue = '' }) {
  const pageNum = Number(page) || 1;
  const batchCount = Math.min(Math.max(Number(batchPages) || 1, 1), 10);

  const promises = [];
  for (let i = 0; i < batchCount; i++) {
    promises.push(
      fetchBidsPage({ page: pageNum + i, search, type, sort, highBidValue })
        .catch(() => ({ bids: [], total: 0 }))
    );
  }

  const results = await Promise.all(promises);
  const seenIds = new Set();
  const merged = [];
  let grandTotal = 0;

  for (const res of results) {
    if (res.total > grandTotal) grandTotal = res.total;
    for (const b of res.bids) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        merged.push(b);
      }
    }
  }

  return {
    bids: merged,
    total: grandTotal,
    page: pageNum,
    batchPages: batchCount,
    totalPages: Math.ceil(grandTotal / 10)
  };
}

function saveTendersToFiles(bids) {
  try {
    fs.writeFileSync(JSON_CACHE_FILE, JSON.stringify(bids, null, 2));
    const csvRows = [
      ['Bid Number', 'Type', 'Category', 'Quantity', 'Ministry', 'Department', 'Start Date', 'End Date', 'PDF URL'].join(',')
    ];
    bids.forEach(b => {
      csvRows.push([
        `"${b.bidNumber}"`,
        `"${b.typeLabel}"`,
        `"${(b.categoryName || '').replace(/"/g, '""')}"`,
        b.quantity || 1,
        `"${(b.ministry || '').replace(/"/g, '""')}"`,
        `"${(b.department || '').replace(/"/g, '""')}"`,
        `"${b.startDate}"`,
        `"${b.endDate}"`,
        `"${b.docUrl}"`
      ].join(','));
    });
    fs.writeFileSync(CSV_CACHE_FILE, '\uFEFF' + csvRows.join('\n'));
    return true;
  } catch (err) {
    logger.error('STORAGE', 'Failed to write cache files:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. Complete Interactive Web UI (HTML, CSS & JS with Client-side Pagination)
// ---------------------------------------------------------------------------

function getHtmlPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeM Tenders Portal - Last 24 Hours Live Bids</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card: #111827;
      --border: #1f2937;
      --hover: #1e293b;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #f59e0b;
      --success: #10b981;
      --danger: #ef4444;
      --purple: #8b5cf6;
      --sky: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      padding: 24px 20px 80px 20px;
    }
    .wrapper { max-width: 1400px; margin: 0 auto; }
    
    /* Header */
    header {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
      gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo-badge {
      width: 48px; height: 48px; border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      display: flex; align-items: center; justify-content: center; font-size: 24px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }
    h1 { font-size: 22px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .sync-pill {
      background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 9999px;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #38bdf8; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
    .subtitle { color: var(--muted); font-size: 13px; margin-top: 4px; }
    .header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

    /* Buttons */
    button, .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; border: 1px solid transparent; text-decoration: none;
    }
    .btn-primary { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #fff; }
    .btn-primary:hover { background: linear-gradient(135deg, #2563eb, #1e40af); transform: translateY(-1px); }
    .btn-secondary { background: #1f2937; border-color: #374151; color: #e5e7eb; }
    .btn-secondary:hover { background: #374151; color: #fff; }
    .btn-accent { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }

    /* KPI Cards */
    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px; margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      padding: 16px; cursor: pointer; transition: all 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); border-color: #374151; }
    .kpi-card.active { border-color: var(--primary); background: rgba(59, 130, 246, 0.08); }
    .kpi-label { font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; }
    .kpi-val { font-size: 24px; font-weight: 700; color: #fff; margin: 4px 0 2px 0; }
    .kpi-sub { font-size: 11px; color: var(--muted); }

    /* Controls Bar */
    .controls {
      background: var(--card); border: 1px solid var(--border); border-radius: 14px;
      padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 14px;
    }
    .controls-top { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; }
    .search-box { flex: 1; min-width: 260px; position: relative; }
    .search-box input {
      width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px;
      padding: 10px 14px 10px 38px; color: #fff; font-size: 13px; outline: none;
    }
    .search-box input:focus { border-color: var(--primary); }
    .search-icon { position: absolute; left: 12px; top: 11px; color: #64748b; font-size: 14px; }
    
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; }
    .tab-btn {
      background: #1e293b; border: 1px solid #334155; color: #94a3b8;
      padding: 6px 14px; border-radius: 8px; font-size: 13px; cursor: pointer;
    }
    .tab-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
    .badge-count { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 99px; font-size: 11px; margin-left: 4px; }

    .controls-bottom {
      display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center;
      padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);
    }
    select {
      background: #0f172a; border: 1px solid #334155; color: #e2e8f0;
      padding: 7px 10px; border-radius: 6px; font-size: 13px; outline: none; cursor: pointer;
    }

    /* Pagination */
    .pagination-bar {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
      background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 10px 16px;
    }
    .pagination-info { font-size: 13px; color: var(--muted); }
    .pagination-controls { display: flex; align-items: center; gap: 6px; }
    .page-btn {
      background: #1e293b; border: 1px solid #334155; color: #e2e8f0;
      padding: 5px 11px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .page-btn:hover:not(:disabled) { background: var(--primary); border-color: var(--primary); color: #fff; }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* Grid Cards */
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; margin-bottom: 30px; }
    .card {
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      padding: 18px; display: flex; flex-direction: column; justify-content: space-between;
      transition: all 0.2s; position: relative;
    }
    .card:hover { transform: translateY(-2px); border-color: var(--primary); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    .card.is-short { border-color: rgba(245, 158, 11, 0.6); background: linear-gradient(180deg, rgba(245, 158, 11, 0.05), var(--card)); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
    .tag-bid { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .tag-ra { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .tag-24h { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .tag-close { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .star-btn { background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; transition: transform 0.2s; }
    .star-btn:hover { transform: scale(1.2); color: #f59e0b; }
    .star-btn.starred { color: #f59e0b; filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.6)); }
    
    .bid-num { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #93c5fd; font-weight: 600; margin-bottom: 8px; }
    .title { font-size: 14px; font-weight: 600; color: #f1f5f9; line-height: 1.4; margin-bottom: 12px; min-height: 38px; }
    .meta-box { background: #0f172a; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .meta-lbl { font-size: 11px; color: #64748b; margin-bottom: 2px; }
    .dept { font-size: 12px; color: #94a3b8; margin-bottom: 14px; }
    .note-box { background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 6px 10px; font-size: 12px; color: #fbbf24; margin-bottom: 12px; border-radius: 0 6px 6px 0; }
    .card-footer { display: flex; gap: 8px; align-items: center; padding-top: 10px; border-top: 1px solid var(--border); }
    
    /* Table View */
    .table-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow-x: auto; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { background: #0f172a; padding: 12px 14px; color: #94a3b8; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border); }
    td { padding: 12px 14px; border-bottom: 1px solid #1e293b; color: #e2e8f0; }
    tr:hover td { background: rgba(30, 41, 59, 0.4); }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
      z-index: 999; display: none; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-overlay.open { display: flex; }
    .modal { background: #111827; border: 1px solid #374151; border-radius: 14px; max-width: 540px; width: 100%; overflow: hidden; }
    .modal-header { padding: 18px 20px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .modal-footer { padding: 14px 20px; border-top: 1px solid #1f2937; display: flex; justify-content: flex-end; gap: 10px; background: #0f172a; }
    
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--muted); }
    .field input, .field textarea {
      background: #0f172a; border: 1px solid #334155; border-radius: 8px;
      padding: 9px 12px; color: #fff; font-size: 13px; outline: none; font-family: inherit;
    }
    .field input:focus, .field textarea:focus { border-color: var(--primary); }

    .alert-callout {
      background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #93c5fd; line-height: 1.5;
    }

    /* Logs Terminal */
    .logs-terminal {
      background: #030712; border: 1px solid #1f2937; border-radius: 8px;
      padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px;
      color: #e2e8f0; height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
    }
    .log-row { display: flex; gap: 8px; line-height: 1.4; word-break: break-word; }
    .log-time { color: #64748b; flex-shrink: 0; }
    .log-tag { font-weight: 600; flex-shrink: 0; }
    .log-tag-gem { color: #c084fc; }
    .log-tag-http { color: #38bdf8; }
    .log-tag-info { color: #34d399; }
    .log-tag-warn { color: #fde047; }
    .log-tag-error { color: #f87171; }
    .log-msg { color: #f1f5f9; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="logo-badge">🏛️</div>
        <div>
          <h1>GeM Tenders Portal <span class="sync-pill"><span class="dot"></span> Last 24 Hours Active</span></h1>
          <p class="subtitle">Official Government e-Marketplace Bids from Last 24 Hours • Filter, Shortlist & Export</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="openLogsModal()">📜 Live Logs</button>
        <button class="btn btn-secondary" onclick="openCredsModal()">🔐 <span id="credsBtnLabel">GeM Account & Login</span></button>
        <button class="btn btn-primary" onclick="syncAll24Hours()" id="sync24Btn">⚡ Sync All Last 24h</button>
        <button class="btn btn-secondary" onclick="loadData()">🔄 Refresh</button>
      </div>
    </header>

    <!-- KPI Strip -->
    <div class="kpi-grid">
      <div class="kpi-card active" onclick="setTab('last24h')" id="kpi-24h">
        <div class="kpi-label">🕒 Last 24 Hours</div>
        <div class="kpi-val" style="color: #38bdf8;" id="count24h">0</div>
        <div class="kpi-sub" id="loadedSub">All bids in last 24h</div>
      </div>
      <div class="kpi-card" onclick="setTab('shortlisted')" id="kpi-short">
        <div class="kpi-label">⭐ Shortlisted</div>
        <div class="kpi-val" style="color: #f59e0b;" id="shortCount">0</div>
        <div class="kpi-sub">Click to view shortlisted</div>
      </div>
      <div class="kpi-card" onclick="setTab('all')" id="kpi-all">
        <div class="kpi-label">Total Loaded</div>
        <div class="kpi-val" id="totalLoaded">0</div>
        <div class="kpi-sub">In current memory view</div>
      </div>
      <div class="kpi-card" onclick="setTab('closing')" id="kpi-closing">
        <div class="kpi-label">⏳ Closing in 24h</div>
        <div class="kpi-val" style="color: #f87171;" id="todayClosing">0</div>
        <div class="kpi-sub">Urgent bids closing soon</div>
      </div>
      <div class="kpi-card" onclick="setTab('highvalue')" id="kpi-high">
        <div class="kpi-label">💎 High Value</div>
        <div class="kpi-val" style="color: #c084fc;" id="highValCount">0</div>
        <div class="kpi-sub">Large procurement bids</div>
      </div>
    </div>

    <!-- Top RA Filter Bar (Default: False / Hidden) -->
    <div class="ra-filter-bar" style="background:var(--card); border:1px solid rgba(168, 85, 247, 0.4); border-radius:12px; padding:12px 18px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; box-shadow:0 4px 16px rgba(168, 85, 247, 0.08);">
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <label style="display:inline-flex; align-items:center; gap:10px; cursor:pointer; font-size:14px; font-weight:700; color:#fff; user-select:none;">
          <input type="checkbox" id="showRaCheckbox" onchange="onRaCheckboxChange()" style="width:18px; height:18px; accent-color:#a855f7; cursor:pointer;">
          <span style="display:flex; align-items:center; gap:6px;">⚡ Show RA (Reverse Auction) Tenders</span>
        </label>
        <span class="tag tag-ra" id="raCountBadge" style="font-size:11px;">1,412 RA</span>
        <span id="raStatusText" style="font-size:12px; color:#94a3b8;">(Unchecked by default: RA tenders are hidden)</span>
      </div>

      <div id="raOptionsGroup" style="display:none; align-items:center; gap:8px;">
        <span style="font-size:12px; color:#c084fc; font-weight:600;">RA View Mode:</span>
        <button class="btn btn-primary" id="raModeIncludeBtn" onclick="setRaMode('include')" style="padding:4px 10px; font-size:12px;">All (Bids + RA)</button>
        <button class="btn btn-secondary" id="raModeOnlyBtn" onclick="setRaMode('only')" style="padding:4px 10px; font-size:12px;">Only RA Tenders</button>
      </div>
    </div>

    <!-- Controls Bar ("Short that data") -->
    <div class="controls">
      <div class="controls-top">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="searchInput" placeholder="Search by item, bid number (GEM/2026/...), ministry..." oninput="onFilterChange()">
        </div>
        <div class="tabs">
          <button class="tab-btn active" id="tab-last24h" onclick="setTab('last24h')">🕒 Last 24 Hours (<span id="tab24hCount">0</span>)</button>
          <button class="tab-btn" id="tab-shortlisted" onclick="setTab('shortlisted')">⭐ Shortlisted <span class="badge-count" id="tabShortCount">0</span></button>
          <button class="tab-btn" id="tab-all" onclick="setTab('all')">All Loaded Bids</button>
          <button class="tab-btn" id="tab-closing" onclick="setTab('closing')">⏳ Closing Soon</button>
        </div>
      </div>

      <div class="controls-bottom">
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <span style="font-size:12px; color:#64748b; font-weight:600;">TYPE:</span>
          <select id="typeSelect" onchange="onFilterChange()">
            <option value="all">All Types (Goods & Services)</option>
            <option value="product">Products (Goods)</option>
            <option value="service">Services / RA</option>
          </select>

          <span style="font-size:12px; color:#64748b; font-weight:600; margin-left:6px;">MINISTRY:</span>
          <select id="minSelect" onchange="onFilterChange()" style="max-width:220px;">
            <option value="all">All Ministries</option>
          </select>

          <span style="font-size:12px; color:#64748b; font-weight:600; margin-left:6px;">SORT BY:</span>
          <select id="sortSelect" onchange="onFilterChange()">
            <option value="date_desc">📅 Start Date: Latest First</option>
            <option value="end_asc">⏳ End Date: Closing Soonest</option>
            <option value="qty_desc">🔢 Quantity: High to Low</option>
            <option value="qty_asc">🔢 Quantity: Low to High</option>
            <option value="cat_asc">🔤 Category: A to Z</option>
          </select>
        </div>

        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn btn-secondary" onclick="exportCSV()">📥 Export CSV (<span id="exportCount">0</span>)</button>
          <button class="btn btn-secondary" onclick="toggleView()" id="viewToggleBtn">☰ Table View</button>
        </div>
      </div>
    </div>

    <!-- Pagination Top -->
    <div id="paginationTop" style="margin-bottom:16px;"></div>

    <!-- Tenders View Container -->
    <div id="contentArea"></div>

    <!-- Pagination Bottom -->
    <div id="paginationBottom" style="margin-top:20px;"></div>
  </div>

  <!-- Modal: Live Logs Viewer -->
  <div class="modal-overlay" id="logsModal" onclick="closeLogsModal()">
    <div class="modal" style="max-width:750px;" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 style="color:#fff; font-size:16px;">📜 Live System & GeM Sync Logs</h3>
        <div style="display:flex; gap:8px; align-items:center;">
          <span style="font-size:12px; color:#34d399;">● Live Tail</span>
          <button style="background:none; border:none; color:#9ca3af; font-size:18px; cursor:pointer;" onclick="closeLogsModal()">✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#9ca3af;">
          <span>Logs saved to file: <code style="color:#93c5fd;">gem-tenders.log</code></span>
          <button class="btn btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="fetchLogs()">🔄 Refresh Now</button>
        </div>
        <div class="logs-terminal" id="logsTerminal">
          <div style="color:#64748b;">Loading logs...</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeLogsModal()">Close</button>
      </div>
    </div>
  </div>

  <!-- Modal: GeM Login Credentials -->
  <div class="modal-overlay" id="credsModal" onclick="closeCredsModal()">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 style="color:#fff; font-size:16px;">🔐 GeM Account & Portal Manager</h3>
        <button style="background:none; border:none; color:#9ca3af; font-size:18px; cursor:pointer;" onclick="closeCredsModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert-callout">
          <strong>💡 Live Sync Active:</strong> Public tenders for the last 24 hours are synced in real time without needing captcha. You can save your official GeM credentials below for 1-click login and quick reference.
        </div>
        <div class="field">
          <label>GeM Login User ID</label>
          <div style="display:flex; gap:6px;">
            <input type="text" id="gemUserId" placeholder="Enter your GeM User ID" style="flex:1;">
            <button class="btn btn-secondary" onclick="copyText(document.getElementById('gemUserId').value, 'User ID')">📋 Copy</button>
          </div>
        </div>
        <div class="field">
          <label>GeM Password</label>
          <div style="display:flex; gap:6px;">
            <input type="password" id="gemPassword" placeholder="Enter your GeM Password" style="flex:1;">
            <button class="btn btn-secondary" onclick="togglePwdVisibility()">👁️</button>
            <button class="btn btn-secondary" onclick="copyText(document.getElementById('gemPassword').value, 'Password')">📋 Copy</button>
          </div>
        </div>
        <a href="https://mkp.gem.gov.in/registration/signup#!/login" target="_blank" class="btn btn-primary" style="margin-top:6px; text-align:center;">
          🌐 Open Official GeM Portal Login ↗
        </a>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeCredsModal()">Close</button>
        <button class="btn btn-primary" onclick="saveCreds()">Save in Browser</button>
      </div>
    </div>
  </div>

  <!-- Modal: Note Editor -->
  <div class="modal-overlay" id="noteModal" onclick="closeNoteModal()">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 style="color:#fff; font-size:16px;">📝 Add / Edit Tender Note</h3>
        <button style="background:none; border:none; color:#9ca3af; font-size:18px; cursor:pointer;" onclick="closeNoteModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size:13px; color:#93c5fd;" id="noteBidNum"></div>
        <div class="field">
          <label>Internal Note / Target Quotation</label>
          <textarea id="noteInput" rows="4" placeholder="e.g. Quoted at ₹3.2L, technical compliance approved..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeNoteModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNote()">Save Note</button>
      </div>
    </div>
  </div>

  <script>
    let allBids = [];
    let currentTab = 'last24h';
    let viewMode = 'grid';
    let activeNoteBidId = null;
    let logPollTimer = null;
    let currentPage = 1;
    let pageSize = 50;
    let currentRaMode = 'include';

    function onRaCheckboxChange() {
      currentPage = 1;
      const cb = document.getElementById('showRaCheckbox');
      const isChecked = cb ? cb.checked : false;
      const group = document.getElementById('raOptionsGroup');
      const status = document.getElementById('raStatusText');
      if (group) group.style.display = isChecked ? 'inline-flex' : 'none';
      if (status) {
        if (isChecked) {
          status.textContent = currentRaMode === 'only' ? 'Showing ONLY Reverse Auctions (RA)' : 'Showing ALL tenders (Regular BIDs + RA)';
          status.style.color = '#34d399';
        } else {
          status.textContent = '(Unchecked by default: RA tenders are hidden)';
          status.style.color = '#94a3b8';
        }
      }
      render();
    }

    function setRaMode(mode) {
      currentRaMode = mode;
      currentPage = 1;
      const incBtn = document.getElementById('raModeIncludeBtn');
      const onlyBtn = document.getElementById('raModeOnlyBtn');
      if (incBtn) incBtn.className = 'btn ' + (mode === 'include' ? 'btn-primary' : 'btn-secondary');
      if (onlyBtn) onlyBtn.className = 'btn ' + (mode === 'only' ? 'btn-primary' : 'btn-secondary');
      const status = document.getElementById('raStatusText');
      if (status) {
        status.textContent = mode === 'only' ? 'Showing ONLY Reverse Auctions (RA)' : 'Showing ALL tenders (Regular BIDs + RA)';
      }
      render();
    }

    function changePage(p) {
      currentPage = p;
      render();
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }

    function changePageSize(s) {
      pageSize = s === 'all' ? 'all' : parseInt(s, 10);
      currentPage = 1;
      render();
    }

    function onFilterChange() {
      const type = document.getElementById('typeSelect').value;
      if (type === 'service') {
        const cb = document.getElementById('showRaCheckbox');
        if (cb && !cb.checked) {
          cb.checked = true;
          const group = document.getElementById('raOptionsGroup');
          if (group) group.style.display = 'inline-flex';
          const status = document.getElementById('raStatusText');
          if (status) {
            status.textContent = currentRaMode === 'only' ? 'Showing ONLY Reverse Auctions (RA)' : 'Showing ALL tenders (Regular BIDs + RA)';
            status.style.color = '#34d399';
          }
        }
      }
      currentPage = 1;
      render();
    }

    function renderPagination(totalItems, totalPages, startIndex, endIndex) {
      const topPag = document.getElementById('paginationTop');
      const botPag = document.getElementById('paginationBottom');
      if (!topPag && !botPag) return;

      const html = '<div class="pagination-bar" style="width:100%;">' +
        '<div class="pagination-info">Showing <strong style="color:#fff;">' + (startIndex + 1).toLocaleString() + ' - ' + endIndex.toLocaleString() + '</strong> of <strong style="color:#60a5fa;">' + totalItems.toLocaleString() + '</strong> tenders</div>' +
        '<div class="pagination-controls">' +
          '<span style="font-size:12px; color:#64748b; margin-right:4px;">Per Page:</span>' +
          '<select onchange="changePageSize(this.value)" style="padding:4px 8px; font-size:12px; margin-right:12px;">' +
            '<option value="25"' + (pageSize === 25 ? ' selected' : '') + '>25</option>' +
            '<option value="50"' + (pageSize === 50 ? ' selected' : '') + '>50</option>' +
            '<option value="100"' + (pageSize === 100 ? ' selected' : '') + '>100</option>' +
            '<option value="250"' + (pageSize === 250 ? ' selected' : '') + '>250</option>' +
            '<option value="all"' + (pageSize === 'all' ? ' selected' : '') + '>All (' + totalItems + ')</option>' +
          '</select>' +
          '<button class="page-btn" onclick="changePage(1)"' + (currentPage === 1 ? ' disabled' : '') + '>« First</button>' +
          '<button class="page-btn" onclick="changePage(' + (currentPage - 1) + ')"' + (currentPage <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
          '<span style="font-size:12px; padding:0 8px; color:#e2e8f0;">Page <strong style="color:#fff;">' + currentPage + '</strong> of <strong>' + totalPages + '</strong></span>' +
          '<button class="page-btn" onclick="changePage(' + (currentPage + 1) + ')"' + (currentPage >= totalPages ? ' disabled' : '') + '>Next ›</button>' +
          '<button class="page-btn" onclick="changePage(' + totalPages + ')"' + (currentPage === totalPages ? ' disabled' : '') + '>Last »</button>' +
        '</div>' +
      '</div>';

      if (topPag) topPag.innerHTML = html;
      if (botPag) botPag.innerHTML = html;
    }

    function getShortlist() {
      try { return JSON.parse(localStorage.getItem('gem_shortlist') || '{}'); } catch { return {}; }
    }
    function saveShortlist(obj) {
      localStorage.setItem('gem_shortlist', JSON.stringify(obj));
    }
    function getCreds() {
      try { return JSON.parse(localStorage.getItem('gem_creds') || '{}'); } catch { return {}; }
    }

    async function loadData() {
      document.getElementById('contentArea').innerHTML = '<div style="text-align:center; padding:60px; color:#9ca3af;">⏳ Loading tenders from GeM...</div>';
      try {
        const res = await fetch('/api/tenders?hours=24');
        const json = await res.json();
        if (json.success) {
          allBids = json.data.bids || [];
          populateMinistries();
          render();
        } else {
          document.getElementById('contentArea').innerHTML = '<div style="text-align:center; padding:60px; color:#ef4444;">Error: ' + (json.message || 'Failed to fetch') + '</div>';
        }
      } catch (err) {
        document.getElementById('contentArea').innerHTML = '<div style="text-align:center; padding:60px; color:#ef4444;">Connection error: ' + err.message + '</div>';
      }
    }

    async function syncAll24Hours() {
      const btn = document.getElementById('sync24Btn');
      btn.textContent = '⏳ Scanning 24h Tenders...';
      btn.disabled = true;
      try {
        const res = await fetch('/api/tenders?mode=24h');
        const json = await res.json();
        if (json.success) {
          allBids = json.data.bids || [];
          populateMinistries();
          render();
          alert('Successfully synced ' + allBids.length + ' tenders from the last 24 hours!');
        }
      } catch (err) {
        alert('Sync error: ' + err.message);
      } finally {
        btn.textContent = '⚡ Sync All Last 24h';
        btn.disabled = false;
      }
    }

    function populateMinistries() {
      const set = new Set();
      allBids.forEach(b => { if (b.ministry && b.ministry !== 'Not Specified') set.add(b.ministry); });
      const sel = document.getElementById('minSelect');
      sel.innerHTML = '<option value="all">All Ministries (' + set.size + ')</option>';
      Array.from(set).sort().forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        sel.appendChild(opt);
      });
    }

    function setTab(tab) {
      currentTab = tab;
      currentPage = 1;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
      const t = document.getElementById('tab-' + tab);
      if (t) t.classList.add('active');
      const k = document.getElementById('kpi-' + (tab === 'shortlisted' ? 'short' : (tab === 'last24h' ? '24h' : tab)));
      if (k) k.classList.add('active');
      render();
    }

    function toggleShortlist(id) {
      const s = getShortlist();
      const bid = allBids.find(b => b.id === id);
      if (s[id]) {
        delete s[id];
      } else if (bid) {
        s[id] = { ...bid, addedAt: new Date().toISOString(), note: '' };
      }
      saveShortlist(s);
      render();
    }

    function openNote(id) {
      activeNoteBidId = id;
      const s = getShortlist();
      const bid = allBids.find(b => b.id === id) || s[id];
      document.getElementById('noteBidNum').textContent = 'Tender: ' + (bid ? bid.bidNumber : id);
      document.getElementById('noteInput').value = s[id]?.note || '';
      document.getElementById('noteModal').classList.add('open');
    }
    function closeNoteModal() {
      document.getElementById('noteModal').classList.remove('open');
      activeNoteBidId = null;
    }
    function saveNote() {
      if (!activeNoteBidId) return;
      const s = getShortlist();
      if (!s[activeNoteBidId]) {
        const bid = allBids.find(b => b.id === activeNoteBidId);
        if (bid) s[activeNoteBidId] = { ...bid };
      }
      if (s[activeNoteBidId]) {
        s[activeNoteBidId].note = document.getElementById('noteInput').value;
        saveShortlist(s);
      }
      closeNoteModal();
      render();
    }

    function toggleView() {
      viewMode = viewMode === 'grid' ? 'table' : 'grid';
      document.getElementById('viewToggleBtn').textContent = viewMode === 'grid' ? '☰ Table View' : '▦ Grid View';
      render();
    }

    function formatDate(str) {
      if (!str) return 'N/A';
      try {
        const d = new Date(str);
        return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch { return str; }
    }

    function copyText(text, label) {
      navigator.clipboard.writeText(text);
      alert((label || 'Text') + ' copied to clipboard!');
    }

    function render() {
      const s = getShortlist();
      const shortCount = Object.keys(s).length;
      document.getElementById('shortCount').textContent = shortCount;
      document.getElementById('tabShortCount').textContent = shortCount;

      const now = Date.now();
      const cutoff24h = now - (24 * 60 * 60 * 1000);

      let count24h = 0;
      let closingSoonCount = 0;
      let highValCount = 0;
      let raTotalCount = 0;

      allBids.forEach(b => {
        const sTime = b.startDate ? new Date(b.startDate).getTime() : 0;
        if (sTime >= cutoff24h) count24h++;
        if (b.isClosingIn24Hours) closingSoonCount++;
        if (b.isHighValue) highValCount++;
        if (b.typeLabel === 'RA') raTotalCount++;
      });

      const raBadge = document.getElementById('raCountBadge');
      if (raBadge) raBadge.textContent = raTotalCount.toLocaleString() + ' RA';

      document.getElementById('count24h').textContent = count24h;
      document.getElementById('tab24hCount').textContent = count24h;
      document.getElementById('totalLoaded').textContent = allBids.length;
      document.getElementById('todayClosing').textContent = closingSoonCount;
      document.getElementById('highValCount').textContent = highValCount;
      document.getElementById('loadedSub').textContent = count24h + ' tenders within 24h';

      let list = [...allBids];

      // RA Checkbox Filter (Default: False -> Hide RA tenders unless checked)
      const showRa = Boolean(document.getElementById('showRaCheckbox')?.checked);
      const raGroup = document.getElementById('raOptionsGroup');
      const raStatus = document.getElementById('raStatusText');
      if (showRa) {
        if (raGroup) raGroup.style.display = 'inline-flex';
        if (raStatus) {
          raStatus.textContent = currentRaMode === 'only'
            ? 'Showing ONLY Reverse Auctions (RA)'
            : 'Showing ALL tenders (Regular BIDs + RA)';
          raStatus.style.color = '#34d399';
        }
        if (currentRaMode === 'only') {
          list = list.filter(b => b.typeLabel === 'RA');
        }
      } else {
        if (raGroup) raGroup.style.display = 'none';
        if (raStatus) {
          raStatus.textContent = '(Unchecked by default: RA tenders are hidden)';
          raStatus.style.color = '#94a3b8';
        }
        // User has NOT checked RA checkbox: HIDE RA TENDERS
        list = list.filter(b => b.typeLabel !== 'RA');
      }

      // Tab filter
      if (currentTab === 'last24h') {
        list = list.filter(b => {
          const sTime = b.startDate ? new Date(b.startDate).getTime() : 0;
          return sTime >= cutoff24h;
        });
      } else if (currentTab === 'shortlisted') {
        const existing = new Set(list.map(b => b.id));
        list = list.filter(b => Boolean(s[b.id]));
        Object.keys(s).forEach(k => {
          if (!existing.has(k)) list.push(s[k]);
        });
      } else if (currentTab === 'closing') {
        list = list.filter(b => b.isClosingIn24Hours);
      } else if (currentTab === 'highvalue') {
        list = list.filter(b => b.isHighValue);
      }

      // Type filter
      const type = document.getElementById('typeSelect').value;
      if (type === 'product') list = list.filter(b => b.typeLabel === 'BID');
      if (type === 'service') list = list.filter(b => b.typeLabel === 'RA');

      // Ministry filter
      const min = document.getElementById('minSelect').value;
      if (min !== 'all') list = list.filter(b => b.ministry === min);

      // Search filter
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      if (q) {
        list = list.filter(b =>
          (b.bidNumber && b.bidNumber.toLowerCase().includes(q)) ||
          (b.categoryName && b.categoryName.toLowerCase().includes(q)) ||
          (b.ministry && b.ministry.toLowerCase().includes(q)) ||
          (b.department && b.department.toLowerCase().includes(q))
        );
      }

      // Sorting
      const sort = document.getElementById('sortSelect').value;
      list.sort((a, b) => {
        if (sort === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
        if (sort === 'qty_asc') return (a.quantity || 0) - (b.quantity || 0);
        if (sort === 'cat_asc') return (a.categoryName || '').localeCompare(b.categoryName || '');
        if (sort === 'date_desc') return new Date(b.startDate || 0) - new Date(a.startDate || 0);
        if (sort === 'end_asc') return new Date(a.endDate || 0) - new Date(b.endDate || 0);
        return 0;
      });

      document.getElementById('exportCount').textContent = list.length;
      const container = document.getElementById('contentArea');
      const topPag = document.getElementById('paginationTop');
      const botPag = document.getElementById('paginationBottom');

      if (list.length === 0) {
        if (topPag) topPag.innerHTML = '';
        if (botPag) botPag.innerHTML = '';
        container.innerHTML = '<div style="text-align:center; padding:60px 20px; background:#111827; border:1px solid #1f2937; border-radius:12px;">' +
          '<div style="font-size:40px; margin-bottom:10px;">📂</div>' +
          '<h3 style="color:#fff; margin-bottom:6px;">' + (currentTab === 'shortlisted' ? 'No Shortlisted Tenders' : 'No Tenders Found in this View') + '</h3>' +
          '<p style="color:#9ca3af; font-size:13px;">' + (currentTab === 'shortlisted' ? 'Click the star icon (⭐) on any tender to shortlist it here.' : 'Try switching tabs or click "Sync All Last 24h" above.') + '</p>' +
        '</div>';
        return;
      }

      const totalItems = list.length;
      const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      const startIndex = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
      const endIndex = pageSize === 'all' ? totalItems : Math.min(startIndex + pageSize, totalItems);
      const pagedList = list.slice(startIndex, endIndex);

      renderPagination(totalItems, totalPages, startIndex, endIndex);

      if (viewMode === 'grid') {
        let html = '<div class="grid">';
        pagedList.forEach(b => {
          const isShort = Boolean(s[b.id]);
          const note = s[b.id]?.note;
          html += '<div class="card ' + (isShort ? 'is-short' : '') + '">' +
            '<div>' +
              '<div class="card-header">' +
                '<div class="badges">' +
                  '<span class="tag ' + (b.typeLabel === 'RA' ? 'tag-ra' : 'tag-bid') + '">' + (b.typeLabel || 'BID') + '</span>' +
                  '<span class="tag tag-24h">🕒 Last 24h</span>' +
                  (b.isHighValue ? '<span class="tag" style="background:rgba(245,158,11,0.15); color:#fbbf24;">💎 High Value</span>' : '') +
                  (b.isClosingIn24Hours ? '<span class="tag tag-close">⏳ Closes in 24h</span>' : '') +
                '</div>' +
                '<button class="star-btn ' + (isShort ? 'starred' : '') + '" onclick="toggleShortlist(\\'' + b.id + '\\')">' + (isShort ? '★' : '☆') + '</button>' +
              '</div>' +
              '<div class="bid-num">' + b.bidNumber + ' <span style="cursor:pointer;" onclick="copyText(\\'' + b.bidNumber + '\\', \\'Bid No\\')">📋</span></div>' +
              '<div class="title">' + b.categoryName + '</div>' +
              '<div class="meta-box">' +
                '<div><div class="meta-lbl">QUANTITY</div><strong>📦 ' + (b.quantity || 1).toLocaleString() + ' units</strong></div>' +
                '<div><div class="meta-lbl">START DATE</div>' + formatDate(b.startDate) + '</div>' +
                '<div style="grid-column:span 2;"><div class="meta-lbl">END / OPENING DATE</div><span style="color:#fca5a5;">⏰ ' + formatDate(b.endDate) + '</span></div>' +
              '</div>' +
              '<div class="dept">🏛️ <strong>' + b.ministry + '</strong>' + (b.department ? ' • ' + b.department : '') + '</div>' +
              (isShort && note ? '<div class="note-box">📝 ' + note + '</div>' : '') +
            '</div>' +
            '<div class="card-footer">' +
              '<a href="' + b.docUrl + '" target="_blank" class="btn btn-primary" style="flex:1; padding:6px 10px; font-size:12px;">📄 View GeM PDF</a>' +
              '<button class="btn ' + (isShort ? 'btn-accent' : 'btn-secondary') + '" style="padding:6px 10px; font-size:12px;" onclick="toggleShortlist(\\'' + b.id + '\\')">' + (isShort ? '★ Shortlisted' : '☆ Shortlist') + '</button>' +
              (isShort ? '<button class="btn btn-secondary" style="padding:6px 8px; font-size:12px;" onclick="openNote(\\'' + b.id + '\\')">📝</button>' : '') +
            '</div>' +
          '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
      } else {
        let html = '<div class="table-box"><table><thead><tr>' +
          '<th>★</th><th>Bid Number</th><th>Category / Item</th><th>Qty</th><th>Ministry</th><th>Start Date</th><th>End Date</th><th>Action</th>' +
        '</tr></thead><tbody>';
        pagedList.forEach(b => {
          const isShort = Boolean(s[b.id]);
          html += '<tr>' +
            '<td><button class="star-btn ' + (isShort ? 'starred' : '') + '" onclick="toggleShortlist(\\'' + b.id + '\\')">' + (isShort ? '★' : '☆') + '</button></td>' +
            '<td><strong style="font-family:monospace; color:#93c5fd;">' + b.bidNumber + '</strong></td>' +
            '<td style="max-width:300px;">' + b.categoryName + (s[b.id]?.note ? '<div style="font-size:11px; color:#fbbf24;">Note: ' + s[b.id].note + '</div>' : '') + '</td>' +
            '<td><strong>' + (b.quantity || 1).toLocaleString() + '</strong></td>' +
            '<td style="max-width:200px;">' + b.ministry + '</td>' +
            '<td style="font-size:12px;">' + formatDate(b.startDate) + '</td>' +
            '<td style="color:#fca5a5; font-size:12px;">' + formatDate(b.endDate) + '</td>' +
            '<td><a href="' + b.docUrl + '" target="_blank" class="btn btn-primary" style="padding:4px 8px; font-size:11px;">PDF</a>' +
            (isShort ? ' <button class="btn btn-secondary" style="padding:4px 6px; font-size:11px;" onclick="openNote(\\'' + b.id + '\\')">📝</button>' : '') +
            '</td>' +
          '</tr>';
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
      }
    }

    function exportCSV() {
      const s = getShortlist();
      let list = [...allBids];
      const now = Date.now();
      const cutoff24h = now - (24 * 60 * 60 * 1000);

      // RA Checkbox Filter
      const showRa = Boolean(document.getElementById('showRaCheckbox')?.checked);
      if (!showRa) {
        list = list.filter(b => b.typeLabel !== 'RA');
      } else if (currentRaMode === 'only') {
        list = list.filter(b => b.typeLabel === 'RA');
      }

      if (currentTab === 'last24h') {
        list = list.filter(b => {
          const sTime = b.startDate ? new Date(b.startDate).getTime() : 0;
          return sTime >= cutoff24h;
        });
      } else if (currentTab === 'shortlisted') {
        const existing = new Set(list.map(b => b.id));
        list = list.filter(b => Boolean(s[b.id]));
        Object.keys(s).forEach(k => {
          if (!existing.has(k)) list.push(s[k]);
        });
      } else if (currentTab === 'closing') {
        list = list.filter(b => b.isClosingIn24Hours);
      } else if (currentTab === 'highvalue') {
        list = list.filter(b => b.isHighValue);
      }

      const type = document.getElementById('typeSelect').value;
      if (type === 'product') list = list.filter(b => b.typeLabel === 'BID');
      if (type === 'service') list = list.filter(b => b.typeLabel === 'RA');

      const min = document.getElementById('minSelect').value;
      if (min !== 'all') list = list.filter(b => b.ministry === min);

      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      if (q) {
        list = list.filter(b =>
          (b.bidNumber && b.bidNumber.toLowerCase().includes(q)) ||
          (b.categoryName && b.categoryName.toLowerCase().includes(q)) ||
          (b.ministry && b.ministry.toLowerCase().includes(q)) ||
          (b.department && b.department.toLowerCase().includes(q))
        );
      }

      if (list.length === 0) return alert('No tenders to export with current filters');

      const headers = ['Bid Number', 'Type', 'Category', 'Quantity', 'Ministry', 'Department', 'Start Date', 'End Date', 'PDF Link', 'Shortlisted', 'Note'];
      const rows = list.map(b => [
        '"' + b.bidNumber + '"',
        '"' + b.typeLabel + '"',
        '"' + (b.categoryName || '').replace(/"/g, '""') + '"',
        b.quantity || 1,
        '"' + (b.ministry || '').replace(/"/g, '""') + '"',
        '"' + (b.department || '').replace(/"/g, '""') + '"',
        '"' + b.startDate + '"',
        '"' + b.endDate + '"',
        '"' + b.docUrl + '"',
        s[b.id] ? 'YES' : 'NO',
        '"' + (s[b.id]?.note || '').replace(/"/g, '""') + '"'
      ]);

      const newline = String.fromCharCode(10);
      const csv = String.fromCharCode(0xFEFF) + [headers.join(','), ...rows.map(r => r.join(','))].join(newline);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const tag = showRa ? (currentRaMode === 'only' ? 'only_ra_' : 'with_ra_') : 'bids_only_';
      a.download = 'gem_tenders_' + tag + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
    }

    function openCredsModal() {
      const c = getCreds();
      document.getElementById('gemUserId').value = c.userId || '';
      document.getElementById('gemPassword').value = c.password || '';
      document.getElementById('credsModal').classList.add('open');
    }
    function closeCredsModal() {
      document.getElementById('credsModal').classList.remove('open');
    }
    function saveCreds() {
      const u = document.getElementById('gemUserId').value;
      const p = document.getElementById('gemPassword').value;
      localStorage.setItem('gem_creds', JSON.stringify({ userId: u, password: p }));
      updateCredsLabel();
      closeCredsModal();
      alert('GeM Credentials saved in your browser storage!');
    }
    function updateCredsLabel() {
      const c = getCreds();
      document.getElementById('credsBtnLabel').textContent = c.userId ? 'GeM: ' + c.userId : 'GeM Account & Login';
    }
    function togglePwdVisibility() {
      const el = document.getElementById('gemPassword');
      el.type = el.type === 'password' ? 'text' : 'password';
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        const json = await res.json();
        if (json.success && json.logs) {
          const terminal = document.getElementById('logsTerminal');
          if (json.logs.length === 0) {
            terminal.innerHTML = '<div style="color:#64748b;">No logs recorded yet.</div>';
            return;
          }
          terminal.innerHTML = json.logs.map(l => {
            let tagClass = 'log-tag-info';
            if (l.level === 'gem') tagClass = 'log-tag-gem';
            else if (l.level === 'http') tagClass = 'log-tag-http';
            else if (l.level === 'warn') tagClass = 'log-tag-warn';
            else if (l.level === 'error') tagClass = 'log-tag-error';

            return '<div class="log-row">' +
              '<span class="log-time">' + l.time.slice(11) + '</span>' +
              '<span class="log-tag ' + tagClass + '">[' + l.tag + ']</span>' +
              '<span class="log-msg">' + l.message + (l.extra ? ' <span style="color:#9ca3af; font-size:11px;">' + (typeof l.extra === 'object' ? JSON.stringify(l.extra) : l.extra) + '</span>' : '') + '</span>' +
            '</div>';
          }).join('');
          terminal.scrollTop = terminal.scrollHeight;
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    }

    function openLogsModal() {
      document.getElementById('logsModal').classList.add('open');
      fetchLogs();
      if (!logPollTimer) {
        logPollTimer = setInterval(fetchLogs, 2500);
      }
    }

    function closeLogsModal() {
      document.getElementById('logsModal').classList.remove('open');
      if (logPollTimer) {
        clearInterval(logPollTimer);
        logPollTimer = null;
      }
    }

    // Auto-init
    updateCredsLabel();
    loadData();
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 4. Built-in HTTP Server & API Endpoints
// ---------------------------------------------------------------------------

let preloaded24hData = null;

// Initialize preloaded data from disk if available
function initPreloadedData() {
  if (fs.existsSync(JSON_CACHE_FILE)) {
    try {
      const content = fs.readFileSync(JSON_CACHE_FILE, 'utf8');
      const bids = JSON.parse(content);
      if (Array.isArray(bids) && bids.length > 0) {
        preloaded24hData = {
          bids,
          total: bids.length,
          cutoffTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          count: bids.length,
          timestamp: Date.now()
        };
        logger.info('STORAGE', `Loaded ${bids.length.toLocaleString()} cached tenders from ${JSON_CACHE_FILE}`);
        return preloaded24hData;
      }
    } catch (err) {
      logger.warn('STORAGE', 'Failed to read cached tenders JSON:', err.message);
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Serve React Production Assets & SPA if available
  const clientDistDir = path.join(ROOT_DIR, 'client', 'dist');
  if (pathname.startsWith('/assets/')) {
    const assetPath = path.join(clientDistDir, pathname);
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      const mimeTypes = {
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.json': 'application/json',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      return fs.createReadStream(assetPath).pipe(res);
    }
  }

  // Serve Manifest, Logo, Favicon
  if (pathname === '/manifest.json' || pathname === '/logo.svg' || pathname === '/favicon.ico') {
    const publicAssetPath = path.join(ROOT_DIR, 'client', 'dist', pathname);
    if (fs.existsSync(publicAssetPath)) {
      const ext = path.extname(publicAssetPath).toLowerCase();
      const mimeTypes = {
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.ico': 'image/x-icon',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      return fs.createReadStream(publicAssetPath).pipe(res);
    }
  }

  // Serve HTML Dashboard / React App
  if (pathname === '/' || pathname === '/index.html') {
    const reactIndexPath = path.join(clientDistDir, 'index.html');
    if (fs.existsSync(reactIndexPath)) {
      logger.http('HTTP-REQ', `GET ${pathname} (React Production SPA)`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(reactIndexPath).pipe(res);
    }
    logger.http('HTTP-REQ', `GET ${pathname} (Dashboard UI fallback)`);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(getHtmlPage());
  }

  // API: /api/tenders
  if (pathname === '/api/tenders') {
    try {
      const is24hMode = parsedUrl.searchParams.get('mode') === '24h' || parsedUrl.searchParams.get('hours') === '24' || true;
      const forceRefresh = parsedUrl.searchParams.get('mode') === '24h';
      logger.http('HTTP-REQ', `GET /api/tenders ${is24hMode ? '(Last 24 Hours Mode)' : ''}`);

      let data;
      if (is24hMode) {
        if (!forceRefresh && preloaded24hData && preloaded24hData.bids && preloaded24hData.bids.length > 0) {
          data = preloaded24hData;
        } else {
          data = await fetchBidsLast24Hours();
          data.timestamp = Date.now();
          preloaded24hData = data;
          saveTendersToFiles(data.bids);
        }
      } else {
        const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
        const search = parsedUrl.searchParams.get('search') || '';
        const type = parsedUrl.searchParams.get('type') || 'all';
        const sort = parsedUrl.searchParams.get('sort') || 'Bid-Start-Date-Latest';
        const batchPages = parseInt(parsedUrl.searchParams.get('batch') || '5', 10);
        data = await fetchBids({ page, search, type, sort, batchPages });
      }

      const duration = Date.now() - startTime;
      logger.http('HTTP-RES', `GET /api/tenders -> 200 OK (${data.bids.length} bids returned in ${duration}ms)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, data }));
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error('HTTP-RES', `GET /api/tenders -> 500 Error (${err.message}) after ${duration}ms`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  // API: /api/logs
  if (pathname === '/api/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      logs: logger.getRecent()
    }));
  }

  // API: Health Check & Keep-Alive (/health, /healthz, /ping, /api/health)
  if (pathname === '/health' || pathname === '/healthz' || pathname === '/ping' || pathname === '/api/health') {
    const memoryUsage = process.memoryUsage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'healthy',
      service: 'BidWatch GeM Tenders Portal',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      renderExternalUrl: process.env.RENDER_EXTERNAL_URL || null,
      pingIntervalMinutes: Math.round(HEALTH_CHECK_INTERVAL_MS / 60000 * 10) / 10,
      memory: {
        rssMB: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100
      },
      cachedBidsCount: (preloaded24hData && preloaded24hData.bids) ? preloaded24hData.bids.length : 0
    }));
  }

  // 404
  logger.warn('HTTP-404', `Path not found: ${pathname}`);
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route Not Found');
});

// ---------------------------------------------------------------------------
// 5. CLI Runner Mode
// ---------------------------------------------------------------------------

async function runCliMode() {
  logger.info('CLI', 'Running GeM Tenders 24-Hour Scan...');
  console.log('\n=============================================================');
  console.log('🏛️  GeM TENDERS SCANNER - ALL DATA FROM LAST 24 HOURS');
  console.log('=============================================================');
  console.log('📡 Connecting to official GeM portal (bidplus.gem.gov.in)...');
  console.log('🔍 Scanning all pages published within the last 24 hours...\n');

  try {
    const result = await fetchBidsLast24Hours({
      onProgress: (count, p) => {
        process.stdout.write(`\r🔍 [GeM 24h Scan] Page ${p} scanned | Found ${count.toLocaleString()} tenders... `);
      }
    });
    process.stdout.write('\n\n');

    logger.info('CLI', `Successfully fetched ${result.bids.length} tenders from the last 24 hours.`);

    console.log('=============================================================');
    console.log(`✅ SUCCESS! RETRIEVED ${result.bids.length.toLocaleString()} TENDERS FROM LAST 24 HOURS`);
    console.log('=============================================================');
    console.log(`📊 Total Tenders Found (Last 24h) : ${result.bids.length.toLocaleString()}`);
    console.log(`🌐 Total Active Tenders on GeM    : ${result.total.toLocaleString()}`);
    console.log(`🕒 Scan Cutoff Timestamp          : ${new Date(result.cutoffTime).toLocaleString('en-IN')}`);
    console.log('=============================================================\n');

    console.log('📋 PREVIEW OF FIRST 30 TENDERS:\n');
    console.table(result.bids.slice(0, 30).map((b, idx) => ({
      '#': idx + 1,
      'Bid Number': b.bidNumber,
      'Category / Item': (b.categoryName || '').slice(0, 35) + '...',
      'Quantity': b.quantity,
      'Start Date': b.startDate ? b.startDate.slice(0, 16).replace('T', ' ') : 'N/A',
      'End Date': b.endDate ? b.endDate.slice(0, 16).replace('T', ' ') : 'N/A',
      'Ministry': (b.ministry || '').slice(0, 25)
    })));

    saveTendersToFiles(result.bids);
    console.log(`\n💾 Saved all ${result.bids.length.toLocaleString()} tenders JSON to: ${JSON_CACHE_FILE}`);
    console.log(`💾 Saved all ${result.bids.length.toLocaleString()} tenders CSV to: ${CSV_CACHE_FILE}\n`);
  } catch (err) {
    logger.error('CLI', 'Error executing 24h CLI mode:', err.message);
    console.error('❌ Error fetching GeM tenders:', err.message);
  }
}

// ---------------------------------------------------------------------------
// 5.1 Keep-Alive & 3-Minute Health Check Engine (Render Auto-Wakeup)
// ---------------------------------------------------------------------------

function getSelfPingUrl() {
  const custom = process.env.HEALTH_CHECK_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (custom && custom.trim()) {
    const trimmed = custom.trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/health') || trimmed.endsWith('/healthz') || trimmed.endsWith('/ping') || trimmed.endsWith('/api/health')) {
      return trimmed;
    }
    return `${trimmed}/api/health`;
  }
  return `http://127.0.0.1:${PORT}/api/health`;
}

let healthCheckTimer = null;

function performHealthCheckPing() {
  const targetUrl = getSelfPingUrl();
  const isHttps = targetUrl.startsWith('https://');
  const clientLib = isHttps ? https : http;

  const req = clientLib.get(targetUrl, {
    headers: {
      'User-Agent': 'BidWatch-KeepAlive/1.0',
      'Accept': 'application/json',
    },
    timeout: 15000,
  }, (res) => {
    res.resume(); // Drain stream to release memory and socket
    logger.info('KEEPALIVE', `Health check ping OK -> ${targetUrl} [${res.statusCode}]`);
  });

  req.on('error', (err) => {
    logger.warn('KEEPALIVE', `Health check notice for ${targetUrl}: ${err.message}`);
  });

  req.on('timeout', () => {
    req.destroy();
    logger.warn('KEEPALIVE', `Health check timed out for ${targetUrl}`);
  });
}

function startHealthCheckCron() {
  if (healthCheckTimer) return;
  const targetUrl = getSelfPingUrl();
  const minutes = (HEALTH_CHECK_INTERVAL_MS / 60000).toFixed(1);

  logger.info('KEEPALIVE', `Automated keepalive scheduled every ${minutes} min -> ${targetUrl}`);
  console.log(`💓 Auto Health Check & Keep-Alive : Scheduled every ${minutes} min (Target: ${targetUrl})`);

  // Initial ping 15 seconds after server boot
  const initialTimeout = setTimeout(() => {
    performHealthCheckPing();
  }, 15000);
  if (initialTimeout.unref) initialTimeout.unref();

  // Periodic recurring keepalive ping
  healthCheckTimer = setInterval(() => {
    performHealthCheckPing();
  }, HEALTH_CHECK_INTERVAL_MS);
  if (healthCheckTimer.unref) healthCheckTimer.unref();
}

// ---------------------------------------------------------------------------
// 6. Entrypoint
// ---------------------------------------------------------------------------

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn('STARTUP', `Port ${PORT} is in use, attempting port ${PORT + 1}...`);
    PORT = PORT + 1;
    server.listen(PORT);
  } else {
    logger.error('STARTUP', 'Server error:', err);
  }
});

if (process.argv.includes('--cli') || process.argv.includes('--export')) {
  runCliMode();
} else {
  // Load existing 24-hour cache if present
  initPreloadedData();

  server.listen(PORT, async () => {
    logger.info('STARTUP', `GeM Tenders Server initialized on port ${PORT}`);
    logger.info('STARTUP', `Persistent log file active at: ${LOG_FILE}`);
    console.log('\n=============================================================');
    console.log('🏛️  GeM TENDERS PORTAL - ALL DATA FROM LAST 24 HOURS');
    console.log('=============================================================');
    console.log(`🚀 Web Dashboard running at : http://localhost:${PORT}`);
    console.log(`📡 Connected to official GeM portal (bidplus.gem.gov.in)`);
    console.log(`📜 Persistent logs saved to  : ${LOG_FILE}`);
    console.log('=============================================================\n');

    // Start automated 3-minute health check self-ping (Render keep-alive)
    if (!DISABLE_SELF_PING) {
      startHealthCheckCron();
    }

    if (preloaded24hData && preloaded24hData.bids && preloaded24hData.bids.length > 0 && !process.argv.includes('--sync')) {
      const bids = preloaded24hData.bids;
      const regularBids = bids.filter(b => b.typeLabel !== 'RA');
      const raBids = bids.filter(b => b.typeLabel === 'RA');
      console.log(`✅ INSTANTLY LOADED ${bids.length.toLocaleString()} TENDERS FROM LAST 24 HOURS (${regularBids.length.toLocaleString()} Regular BIDs, ${raBids.length.toLocaleString()} RA)!\n`);
      console.log('📋 SAMPLE PREVIEW (Top 25 Regular BIDs shown below - RA hidden by default):\n');

      console.table(regularBids.slice(0, 25).map((b, idx) => ({
        '#': idx + 1,
        'Type': b.typeLabel,
        'Bid Number': b.bidNumber,
        'Category / Item': (b.categoryName || '').length > 34 ? b.categoryName.slice(0, 31) + '...' : b.categoryName,
        'Qty': b.quantity,
        'Start Date': b.startDate ? b.startDate.slice(0, 16).replace('T', ' ') : 'N/A',
        'End Date': b.endDate ? b.endDate.slice(0, 16).replace('T', ' ') : 'N/A',
        'Ministry': (b.ministry || '').length > 25 ? b.ministry.slice(0, 22) + '...' : b.ministry
      })));

      console.log(`\n... and ${(regularBids.length - 25).toLocaleString()} more regular tenders (All ${bids.length.toLocaleString()} tenders in memory).\n`);
      console.log(`💡 RA Tenders (${raBids.length.toLocaleString()} Reverse Auctions) are hidden by default.`);
      console.log(`   Check "⚡ Show RA Tenders" on top of the dashboard to view RAs.`);
      console.log(`💾 JSON Dataset : ${JSON_CACHE_FILE}`);
      console.log(`💾 CSV Dataset  : ${CSV_CACHE_FILE}`);
      console.log(`\n👉 Open Web Dashboard to view, filter, sort & download PDFs: http://localhost:${PORT}`);
      console.log(`💡 Tip: Run 'node gem-tenders.js --sync' whenever you want to re-scan live from GeM.`);
      console.log(`⚡ Press Ctrl + C to stop the server.\n`);
    } else {
      console.log('🔍 Fetching ALL live tenders published in the last 24 hours from GeM...');
      try {
        const result = await fetchBidsLast24Hours({
          onProgress: (count, p) => {
            process.stdout.write(`\r🔍 [GeM Live Scan] Scanned page ${p} | Found ${count.toLocaleString()} tenders... `);
          }
        });
        process.stdout.write('\n\n');
        result.timestamp = Date.now();
        preloaded24hData = result;

        console.log(`✅ RETRIEVED ALL ${result.bids.length.toLocaleString()} TENDERS FROM THE LAST 24 HOURS (Total active in GeM: ${result.total.toLocaleString()})!\n`);
        console.log('📋 SAMPLE PREVIEW (First 25 shown below):\n');

        console.table(result.bids.slice(0, 25).map((b, idx) => ({
          '#': idx + 1,
          'Bid Number': b.bidNumber,
          'Category / Item': (b.categoryName || '').length > 38 ? b.categoryName.slice(0, 35) + '...' : b.categoryName,
          'Qty': b.quantity,
          'Start Date': b.startDate ? b.startDate.slice(0, 16).replace('T', ' ') : 'N/A',
          'End Date': b.endDate ? b.endDate.slice(0, 16).replace('T', ' ') : 'N/A',
          'Ministry': (b.ministry || '').length > 25 ? b.ministry.slice(0, 22) + '...' : b.ministry
        })));

        saveTendersToFiles(result.bids);
        console.log(`\n💾 Saved all ${result.bids.length.toLocaleString()} tenders to: ${JSON_CACHE_FILE}`);
        console.log(`💾 Saved all ${result.bids.length.toLocaleString()} tenders to: ${CSV_CACHE_FILE}`);
        console.log(`\n👉 Open Web Dashboard to view, filter, sort & download PDFs: http://localhost:${PORT}`);
        console.log(`⚡ Press Ctrl + C to stop the server.\n`);
      } catch (err) {
        console.error('❌ Failed to fetch 24h tenders on startup:', err.message);
      }
    }
  });
}
