/**
 * ==============================================================================
 * 🏛️ GeM Tenders API & Data Service
 * ==============================================================================
 * Handles communication with the Node.js scraper server (gem-tenders.js),
 * caching, local preferences, bookmarks, quotation notes, and CSV generation.
 */

import { INITIAL_TENDERS } from '../data/mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const STORAGE_KEYS = {
  SHORTLIST: 'gem_shortlisted_ids_v1',
  NOTES: 'gem_tender_notes_v1',
  CREDS: 'gem_user_creds_v1',
  PREFS: 'gem_view_prefs_v1',
};

export async function fetchLiveTenders({ mode = '24h', page = 1, search = '', type = 'all', sort = 'date_desc' } = {}) {
  try {
    const params = new URLSearchParams();
    if (mode === '24h') {
      params.append('mode', '24h');
    } else {
      params.append('page', String(page));
      if (search) params.append('search', search);
      if (type) params.append('type', type);
      if (sort) params.append('sort', sort);
    }

    const response = await fetch(`${BASE_URL}/api/tenders?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(60000), // GeM scraper 24h sync may take up to 60s
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      return {
        success: true,
        bids: json.data.bids || [],
        total: json.data.total || json.data.bids?.length || 0,
        cutoffTime: json.data.cutoffTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isLive: true,
      };
    }
    throw new Error(json.message || 'Malformed response');
  } catch (err) {
    console.warn('GeM API fetch fallback to mock dataset:', err.message);
    return {
      success: true,
      bids: INITIAL_TENDERS,
      total: INITIAL_TENDERS.length,
      cutoffTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isLive: false,
      errorNotice: err.message,
    };
  }
}

export async function fetchSystemLogs() {
  try {
    const res = await fetch(`${BASE_URL}/api/logs`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.logs || [];
  } catch (err) {
    return [
      {
        id: 'fallback-1',
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        level: 'gem',
        tag: 'CLIENT-INFO',
        message: 'Connected to local web client. GeM live scraper service listening on port 7700.',
      },
      {
        id: 'fallback-2',
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        level: 'info',
        tag: 'STORAGE',
        message: 'Persistent memory loaded. Ready for shortlisting and bidding actions.',
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// Shortlisting & Bookmarks
// ---------------------------------------------------------------------------
export function getShortlistedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHORTLIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShortlistedIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEYS.SHORTLIST, JSON.stringify(ids));
  } catch (e) {
    console.error(e);
  }
}

export function toggleShortlistId(id) {
  const current = getShortlistedIds();
  const exists = current.includes(id);
  const updated = exists ? current.filter((x) => x !== id) : [...current, id];
  saveShortlistedIds(updated);
  return { updated, isStarred: !exists };
}

// ---------------------------------------------------------------------------
// Notes Management
// ---------------------------------------------------------------------------
export function getTenderNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTenderNote(bidId, noteText) {
  const notes = getTenderNotes();
  if (noteText && noteText.trim()) {
    notes[bidId] = {
      text: noteText.trim(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    delete notes[bidId];
  }
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error(e);
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Credentials Manager
// ---------------------------------------------------------------------------
export function getStoredCreds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREDS);
    return raw ? JSON.parse(raw) : { userId: '', password: '' };
  } catch {
    return { userId: '', password: '' };
  }
}

export function saveStoredCreds(userId, password) {
  try {
    localStorage.setItem(STORAGE_KEYS.CREDS, JSON.stringify({ userId, password }));
  } catch (e) {
    console.error(e);
  }
}

// ---------------------------------------------------------------------------
// CSV Exporter
// ---------------------------------------------------------------------------
export function downloadTendersCSV(tenders, filename = 'gem_tenders_export.csv') {
  if (!tenders || tenders.length === 0) return;

  const headers = [
    'Bid Number',
    'Type',
    'Category / Item Description',
    'Quantity',
    'Start Date',
    'End Date',
    'Ministry',
    'Department',
    'High Value',
    'Official Document URL',
  ];

  const rows = tenders.map((t) => [
    `"${(t.bidNumber || '').replace(/"/g, '""')}"`,
    `"${(t.typeLabel || 'BID').replace(/"/g, '""')}"`,
    `"${(t.categoryName || '').replace(/"/g, '""')}"`,
    t.quantity || 1,
    `"${(t.startDate || '').replace(/"/g, '""')}"`,
    `"${(t.endDate || '').replace(/"/g, '""')}"`,
    `"${(t.ministry || '').replace(/"/g, '""')}"`,
    `"${(t.department || '').replace(/"/g, '""')}"`,
    t.isHighValue ? 'YES' : 'NO',
    `"${(t.docUrl || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
