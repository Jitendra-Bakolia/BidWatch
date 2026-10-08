import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { KpiStrip } from './components/KpiStrip';
import { RaFilterBar } from './components/RaFilterBar';
import { ControlsBar } from './components/ControlsBar';
import { TenderGrid } from './components/TenderGrid';
import { TenderTable } from './components/TenderTable';
import { Pagination } from './components/Pagination';
import { QuickViewModal } from './components/QuickViewModal';
import { NoteModal } from './components/NoteModal';
import { CredsModal } from './components/CredsModal';
import { LogsModal } from './components/LogsModal';
import { SearchModal } from './components/SearchModal';
import { ShortlistDrawer } from './components/ShortlistDrawer';
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { MobileBottomBar } from './components/MobileBottomBar';
import { MainLoader } from './components/MainLoader';
import { Footer } from './components/Footer';
import {
  fetchLiveTenders,
  getShortlistedIds,
  toggleShortlistId,
  getTenderNotes,
  saveTenderNote,
  downloadTendersCSV,
} from './services/gemApi';
import { MINISTRIES_LIST } from './data/mockData';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function App() {
  // Main Data States
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [cutoffTime, setCutoffTime] = useState('');
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('last24h');
  const [showRa, setShowRa] = useState(false); // RA hidden by default as per gem-tenders.js spec
  const [raMode, setRaMode] = useState('include'); // 'include' or 'only'
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMinistry, setSelectedMinistry] = useState('All Ministries');
  const [selectedSort, setSelectedSort] = useState('date_desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Local Storage Bookmarks & Notes
  const [shortlistedIds, setShortlistedIds] = useState([]);
  const [notes, setNotes] = useState({});

  // Modals & Drawers
  const [quickViewTender, setQuickViewTender] = useState(null);
  const [noteTender, setNoteTender] = useState(null);
  const [isCredsOpen, setIsCredsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortlistDrawerOpen, setIsShortlistDrawerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Toast System
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Initial Load from API / Storage
  const loadData = useCallback(async (isFreshSync = false) => {
    if (isFreshSync) {
      setIsSyncing(true);
      showToast('Initiating 24-hour scan from GeM portal...', 'info');
    } else {
      setLoading(true);
    }

    try {
      const res = await fetchLiveTenders({ mode: '24h' });
      setTenders(res.bids || []);
      setIsLive(res.isLive);
      setCutoffTime(res.cutoffTime);
      setLastUpdated(Date.now());

      if (isFreshSync) {
        showToast(`Successfully synced ${res.bids?.length || 0} tenders from GeM!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error communicating with GeM server.', 'error');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Load local storage
    setShortlistedIds(getShortlistedIds());
    setNotes(getTenderNotes());

    // Load initial data
    loadData();
  }, [loadData]);

  // Global Keyboard Shortcuts (Cmd/Ctrl + K for Search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setQuickViewTender(null);
        setNoteTender(null);
        setIsCredsOpen(false);
        setIsLogsOpen(false);
        setIsSearchOpen(false);
        setIsShortlistDrawerOpen(false);
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle Shortlist Handler
  const handleToggleShortlist = useCallback((id) => {
    const { updated, isStarred } = toggleShortlistId(id);
    setShortlistedIds(updated);
    showToast(isStarred ? 'Tender added to shortlist ⭐' : 'Tender removed from shortlist', 'info');
  }, [showToast]);

  // Save Note Handler
  const handleSaveNote = useCallback((id, text) => {
    const updatedNotes = saveTenderNote(id, text);
    setNotes(updatedNotes);
    showToast(text ? 'Quotation note saved 📝' : 'Quotation note deleted', 'info');
  }, [showToast]);

  // Derived Ministries List
  const ministriesList = useMemo(() => {
    const set = new Set();
    tenders.forEach((t) => {
      if (t.ministry && t.ministry !== 'Not Specified') {
        set.add(t.ministry);
      }
    });
    const unique = Array.from(set).sort();
    return ['All Ministries', ...unique];
  }, [tenders]);

  // Overall Statistics
  const stats = useMemo(() => {
    const now = Date.now();
    let count24h = 0;
    let closingCount = 0;
    let highValCount = 0;
    let raCount = 0;

    tenders.forEach((t) => {
      if (t.isWithin24Hours) count24h++;
      if (t.isClosingIn24Hours) closingCount++;
      if (t.isHighValue) highValCount++;
      if (t.typeLabel === 'RA' || t.bidType === 5 || t.bidType === 2) raCount++;
    });

    return {
      count24h,
      shortCount: shortlistedIds.length,
      totalLoaded: tenders.length,
      closingCount,
      highValCount,
      raCount,
    };
  }, [tenders, shortlistedIds]);

  // Filtering & Sorting Pipeline
  const filteredTenders = useMemo(() => {
    let result = [...tenders];

    // 1. RA Filtering (Unchecked by default hides RA)
    if (!showRa) {
      result = result.filter((t) => t.typeLabel !== 'RA' && t.bidType !== 5 && t.bidType !== 2);
    } else if (raMode === 'only') {
      result = result.filter((t) => t.typeLabel === 'RA' || t.bidType === 5 || t.bidType === 2);
    }

    // 2. Active Tab Filtering
    if (activeTab === 'last24h') {
      result = result.filter((t) => t.isWithin24Hours !== false);
    } else if (activeTab === 'shortlisted') {
      result = result.filter((t) => shortlistedIds.includes(t.id));
    } else if (activeTab === 'closing') {
      result = result.filter((t) => t.isClosingIn24Hours);
    } else if (activeTab === 'highvalue') {
      result = result.filter((t) => t.isHighValue);
    }

    // 3. Type Selection
    if (selectedType === 'product') {
      result = result.filter((t) => t.typeLabel === 'BID' || t.bidType === 1);
    } else if (selectedType === 'service') {
      result = result.filter((t) => t.typeLabel === 'RA' || t.bidType === 5 || t.bidType === 2);
    }

    // 4. Ministry Selection
    if (selectedMinistry !== 'All Ministries') {
      result = result.filter((t) => t.ministry === selectedMinistry);
    }

    // 5. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => {
        return (
          t.bidNumber?.toLowerCase().includes(q) ||
          t.categoryName?.toLowerCase().includes(q) ||
          t.ministry?.toLowerCase().includes(q) ||
          t.department?.toLowerCase().includes(q)
        );
      });
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (selectedSort === 'date_desc') {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return db - da;
      }
      if (selectedSort === 'end_asc') {
        const da = a.endDate ? new Date(a.endDate).getTime() : 0;
        const db = b.endDate ? new Date(b.endDate).getTime() : 0;
        return da - db;
      }
      if (selectedSort === 'qty_desc') {
        return (Number(b.quantity) || 0) - (Number(a.quantity) || 0);
      }
      if (selectedSort === 'qty_asc') {
        return (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
      }
      if (selectedSort === 'cat_asc') {
        return (a.categoryName || '').localeCompare(b.categoryName || '');
      }
      return 0;
    });

    return result;
  }, [
    tenders,
    showRa,
    raMode,
    activeTab,
    shortlistedIds,
    selectedType,
    selectedMinistry,
    searchQuery,
    selectedSort,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, showRa, raMode, selectedType, selectedMinistry, selectedSort]);

  // Paginated Slices
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredTenders.length / pageSize) || 1;
  const paginatedTenders = useMemo(() => {
    if (pageSize === 'all') return filteredTenders;
    const start = (currentPage - 1) * pageSize;
    return filteredTenders.slice(start, start + pageSize);
  }, [filteredTenders, currentPage, pageSize]);

  // Export CSV Handler
  const handleExportCsv = useCallback(() => {
    downloadTendersCSV(filteredTenders, `gem_tenders_${activeTab}_export.csv`);
    showToast(`Exported ${filteredTenders.length.toLocaleString()} tenders to CSV 📥`, 'success');
  }, [filteredTenders, activeTab, showToast]);

  // Reset Filters Helper
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedMinistry('All Ministries');
    setSelectedSort('date_desc');
    setActiveTab('last24h');
    setShowRa(false);
    showToast('Filters reset to default view', 'info');
  }, [showToast]);

  // Shortlisted Tenders full objects for Drawer
  const shortlistedTendersList = useMemo(() => {
    return tenders.filter((t) => shortlistedIds.includes(t.id));
  }, [tenders, shortlistedIds]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f3f4f6] flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl bg-[#111827] border border-slate-700 text-xs font-semibold text-white animate-fade-in">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Announcement Bar */}
      <AnnouncementBar
        tenderCount={stats.count24h}
        isLive={isLive}
        lastUpdated={lastUpdated}
      />

      {/* Header */}
      <Header
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenCreds={() => setIsCredsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortlist={() => setIsShortlistDrawerOpen(true)}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onSyncAll={() => loadData(true)}
        onRefresh={() => loadData(false)}
        isSyncing={isSyncing}
        shortlistCount={stats.shortCount}
        isLive={isLive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-16">
        {/* KPI Strip */}
        <KpiStrip
          stats={stats}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Reverse Auction (RA) Filter Bar */}
        <RaFilterBar
          showRa={showRa}
          onToggleShowRa={setShowRa}
          raMode={raMode}
          onChangeRaMode={setRaMode}
          raCount={stats.raCount}
        />

        {/* Filter & Search Controls Bar */}
        <ControlsBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedMinistry={selectedMinistry}
          onMinistryChange={setSelectedMinistry}
          ministriesList={ministriesList}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((prev) => (prev === 'grid' ? 'table' : 'grid'))}
          onExportCsv={handleExportCsv}
          filteredCount={filteredTenders.length}
          tabCounts={{
            count24h: stats.count24h,
            shortCount: stats.shortCount,
          }}
        />

        {/* Pagination Top */}
        <div className="mb-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredTenders.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Tenders Display */}
        {loading ? (
          <MainLoader message="Scanning GeM 24-Hour Procurement Listings..." />
        ) : viewMode === 'grid' ? (
          <TenderGrid
            tenders={paginatedTenders}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
            onOpenQuickView={setQuickViewTender}
            onOpenNote={setNoteTender}
            notes={notes}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <TenderTable
            tenders={paginatedTenders}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
            onOpenQuickView={setQuickViewTender}
            onOpenNote={setNoteTender}
            notes={notes}
            onResetFilters={handleResetFilters}
          />
        )}

        {/* Pagination Bottom */}
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredTenders.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </main>

      {/* Footer */}
      <Footer
        totalCount={tenders.length}
        isLive={isLive}
        cutoffTime={cutoffTime}
      />

      {/* Mobile Bottom Bar */}
      <MobileBottomBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortlist={() => setIsShortlistDrawerOpen(true)}
        shortlistCount={stats.shortCount}
        showRa={showRa}
        onToggleShowRa={setShowRa}
        onOpenLogs={() => setIsLogsOpen(true)}
      />

      {/* Modals & Drawers */}
      <QuickViewModal
        tender={quickViewTender}
        isOpen={Boolean(quickViewTender)}
        onClose={() => setQuickViewTender(null)}
        isShortlisted={quickViewTender ? shortlistedIds.includes(quickViewTender.id) : false}
        onToggleShortlist={handleToggleShortlist}
        note={quickViewTender ? notes[quickViewTender.id] : null}
        onSaveNote={handleSaveNote}
      />

      <NoteModal
        tender={noteTender}
        isOpen={Boolean(noteTender)}
        onClose={() => setNoteTender(null)}
        initialNote={noteTender ? notes[noteTender.id] : null}
        onSaveNote={handleSaveNote}
      />

      <CredsModal
        isOpen={isCredsOpen}
        onClose={() => setIsCredsOpen(false)}
      />

      <LogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tenders={tenders}
        onSelectTender={(t) => setQuickViewTender(t)}
      />

      <ShortlistDrawer
        isOpen={isShortlistDrawerOpen}
        onClose={() => setIsShortlistDrawerOpen(false)}
        shortlistedTenders={shortlistedTendersList}
        onToggleShortlist={handleToggleShortlist}
        onOpenQuickView={setQuickViewTender}
        notes={notes}
      />

      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        showRa={showRa}
        onToggleShowRa={setShowRa}
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenCreds={() => setIsCredsOpen(true)}
        onSyncAll={() => loadData(true)}
        isSyncing={isSyncing}
        stats={stats}
      />
    </div>
  );
}
