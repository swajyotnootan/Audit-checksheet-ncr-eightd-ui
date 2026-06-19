// components/Form9View/Form9View.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TableProperties, Layers, Save, Download,
  Loader2, AlertCircle, RefreshCw, CheckCircle, XCircle,
  ChevronRight, ChevronLeft, FileText, Scroll, Expand, X,
  Search, Filter, SlidersHorizontal, RotateCcw, ChevronDown
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Reusable UI Components (Memoized for performance)
// ─────────────────────────────────────────────────────────────

const ActionButton = React.memo(({ onClick, icon: Icon, label, variant = 'primary', disabled = false, title, loading = false }) => {
  const variants = {
    primary: 'bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
    outline: 'bg-transparent hover:bg-blue-50 text-blue-600 border-blue-200',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent',
    pdf: 'bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-sm',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title || label}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      <span className="hidden sm:inline">{loading ? 'Generating...' : label}</span>
    </button>
  );
});

const FormCard = React.memo(({ title, children, icon: Icon, actions }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} className="text-gray-500" />}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
));

const StatusBadge = React.memo(({ status }) => {
  const isClosed = isClosedNcrStatus(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
      isClosed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
    }`}>
      {isClosed ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {status}
    </span>
  );
});

const isClosedNcrStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return ['CLOSE', 'CLOSED', 'NCR2_COMPLETED'].includes(normalizedStatus);
};

const getCorrectiveActionText = (ncr) => (
  ncr.ncr2CorrectiveAction ||
  ncr.ncr2Correction ||
  ncr.correctiveAction ||
  ncr.correction ||
  'Pending'
);

// ─────────────────────────────────────────────────────────────
// Observation Modal Component
// ─────────────────────────────────────────────────────────────

const ObservationModal = React.memo(({ isOpen, onClose, observation, ncNo }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 id="modal-title" className="text-sm font-semibold text-gray-900">Observation Details</h3>
              <p className="text-xs text-gray-500">NCR: {ncNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(80vh-120px)]">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {observation || 'No observation details available.'}
          </p>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Select Filter Component
// ─────────────────────────────────────────────────────────────

const SelectFilter = React.memo(({ label, value, onChange, options, icon: Icon }) => (
  <div className="flex flex-col gap-1 min-w-[140px]">
    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {Icon && <Icon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none border border-gray-200 rounded-lg text-xs text-gray-700 bg-white pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all ${Icon ? 'pl-7' : 'pl-3'}`}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
));

// ─────────────────────────────────────────────────────────────
// Filter Panel Component
// ─────────────────────────────────────────────────────────────

const FilterPanel = React.memo(({ filters, onFilterChange, onReset, rows, activeFilterCount }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Derive unique values for dropdowns from all rows
  const uniqueValues = useMemo(() => ({
    status: [...new Set(rows.map((r) => r.status).filter(Boolean))],
    department: [...new Set(rows.map((r) => r.department).filter(Boolean))],
    audit: [...new Set(rows.map((r) => r.audit).filter(Boolean))],
    implementationStatus: [...new Set(rows.map((r) => r.implementationStatus).filter(Boolean))],
    auditorName: [...new Set(rows.map((r) => r.auditorName).filter(Boolean))],
  }), [rows]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Filter Header (always visible) */}
      <div
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-violet-50">
            <SlidersHorizontal size={15} className="text-violet-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Filters & Search</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 transition-colors"
            >
              <RotateCcw size={12} />
              Clear all
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Collapsible Filter Body */}
      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 animate-fade-in">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Global Search */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Global Search</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  placeholder="Search any field..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all placeholder:text-gray-400"
                />
                {filters.search && (
                  <button onClick={() => onFilterChange('search', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* NCR No Search */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">NCR No.</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.ncNo}
                  onChange={(e) => onFilterChange('ncNo', e.target.value)}
                  placeholder="e.g. NCR-001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Audit Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[130px]">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Audit Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all"
              />
            </div>

            <SelectFilter label="Status" value={filters.status} onChange={(v) => onFilterChange('status', v)} options={uniqueValues.status} />
            <SelectFilter label="Department" value={filters.department} onChange={(v) => onFilterChange('department', v)} options={uniqueValues.department} />
            <SelectFilter label="Audit Type" value={filters.audit} onChange={(v) => onFilterChange('audit', v)} options={uniqueValues.audit} />
            <SelectFilter label="Impl. Status" value={filters.implementationStatus} onChange={(v) => onFilterChange('implementationStatus', v)} options={uniqueValues.implementationStatus} />
            <SelectFilter label="Auditor" value={filters.auditorName} onChange={(v) => onFilterChange('auditorName', v)} options={uniqueValues.auditorName} />
          </div>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Highlight helper – wraps matched text in a <mark>
// ─────────────────────────────────────────────────────────────

function HighlightText({ text, query }) {
  if (!query || !text) return <>{text || '—'}</>;
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Default filter state
// ─────────────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  search: '',
  ncNo: '',
  status: '',
  department: '',
  audit: '',
  implementationStatus: '',
  auditorName: '',
  dateFrom: '',
  dateTo: '',
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function Form9View() {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({ title: 'Summary of Non Conformity', rows: [] });

  // Filter state
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState({ text: '', ncNo: '' });

  const fetchNCRSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://internalaudit.hub.swajyot.co.in:8090
/api/ncr/all', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const ncrList = await response.json();
        const transformedRows = ncrList.map((ncr, index) => {
          const isClosed = isClosedNcrStatus(ncr.status);
          const correctiveAction = getCorrectiveActionText(ncr);

          return {
            srNo: String(index + 1),
            ncNo: ncr.ncrNumber || `NCR-${index + 1}`,
            auditDate: ncr.createdAt ? new Date(ncr.createdAt).toLocaleDateString('en-GB') : '',
            // Store ISO for date-range filtering
            auditDateISO: ncr.createdAt ? new Date(ncr.createdAt).toISOString().split('T')[0] : '',
            auditorName: ncr.auditorName || 'Not Assigned',
            auditeeName: ncr.auditeeName || 'Not Assigned',
            observation: ncr.statementOfNonconformity || ncr.objectiveEvidence || '',
            department: ncr.department || '',
            correctiveAction,
            audit: ncr.auditType || 'IATF',
            responsibility: ncr.department || '',
            targetDate: ncr.dueDate || '8/08/2025',
            implementationStatus: isClosed ? 'Done' : (correctiveAction !== 'Pending' ? 'In Progress' : 'Pending'),
            status: isClosed ? 'Close' : 'Open'
          };
        });
        setFormData({ title: `Summary of Non Conformity (${new Date().getFullYear()})`, rows: transformedRows });
        setSuccess(`Loaded ${transformedRows.length} NCR records`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to fetch NCR data');
      }
    } catch (err) {
      console.error('Error fetching NCRs:', err);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNCRSummary(); }, [fetchNCRSummary]);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape' && modalOpen) setModalOpen(false); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [modalOpen]);

  // ── Filter logic ──────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const { search, ncNo, status, department, audit, implementationStatus, auditorName, dateFrom, dateTo } = filters;
    return formData.rows.filter((row) => {
      // Global search across all text fields
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          row.ncNo, row.auditDate, row.auditorName, row.auditeeName,
          row.observation, row.department, row.correctiveAction,
          row.audit, row.responsibility, row.targetDate,
          row.implementationStatus, row.status
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (ncNo && !row.ncNo.toLowerCase().includes(ncNo.toLowerCase())) return false;
      if (status && row.status !== status) return false;
      if (department && row.department !== department) return false;
      if (audit && row.audit !== audit) return false;
      if (implementationStatus && row.implementationStatus !== implementationStatus) return false;
      if (auditorName && row.auditorName !== auditorName) return false;
      if (dateFrom && row.auditDateISO && row.auditDateISO < dateFrom) return false;
      if (dateTo && row.auditDateISO && row.auditDateISO > dateTo) return false;
      return true;
    });
  }, [formData.rows, filters]);

  const activeFilterCount = useMemo(() =>
    Object.values(filters).filter((v) => v !== '').length,
  [filters]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // ─────────────────────────────────────────────────────────

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://internalaudit.hub.swajyot.co.in:8090
/api/ncr/form9/pdf', {
        method: 'GET',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!response.ok) { const text = await response.text(); throw new Error(text || `Server error: ${response.status}`); }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Form9_NCR_Summary_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('PDF downloaded successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error('PDF download error:', err);
      setError(`Failed to download PDF: ${err.message}`);
    } finally { setPdfLoading(false); }
  }, []);

  const handleSave = useCallback(() => {
    console.log('Saved Form9View data:', formData);
    setSuccess('Summary data saved!');
    setTimeout(() => setSuccess(null), 2500);
  }, [formData]);

  const handleOpenObservation = useCallback((observation, ncNo) => {
    setSelectedObservation({ text: observation, ncNo });
    setModalOpen(true);
  }, []);

  const handleCloseObservation = useCallback(() => {
    setModalOpen(false);
    setSelectedObservation({ text: '', ncNo: '' });
  }, []);

  const scrollTable = useCallback((direction) => {
    if (tableRef.current) {
      tableRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading NCR Summary...</p>
          <p className="text-gray-500 text-sm mt-1">Fetching data from server</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <header className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/audit-manager?view=ncr')}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to NCR
              </button>
              <span className="text-gray-300">/</span>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-50"><TableProperties size={16} className="text-green-600" /></div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">Summary of NC Report</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Form 9 • NCR Summary</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ActionButton onClick={fetchNCRSummary} icon={RefreshCw} label="Refresh" variant="outline" title="Reload data from server" />
              <ActionButton onClick={handleDownloadPdf} icon={Download} label="Download PDF" variant="pdf" loading={pdfLoading} disabled={formData.rows.length === 0} title="Download Form 9 as PDF" />
              <ActionButton onClick={handleSave} icon={Save} label="Save Summary" variant="primary" title="Save changes" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 animate-fade-in" role="status">
            <CheckCircle size={18} className="flex-shrink-0" /><span className="text-sm font-medium">{success}</span>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 animate-fade-in" role="alert">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div><p className="text-sm font-medium">Error</p><p className="text-sm mt-0.5">{error}</p></div>
          </div>
        )}

        {/* Title Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50"><TableProperties size={20} className="text-green-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{formData.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Total Records: <span className="font-semibold text-gray-700">{formData.rows.length}</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-2 text-violet-600 font-semibold">
                      · {filteredRows.length} filtered
                    </span>
                  )}
                </p>
              </div>
            </div>
            {formData.rows.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                <FileText size={14} className="text-rose-600" />
                <span className="text-xs text-rose-700 font-medium">Ready to export — {formData.rows.length} records</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter Panel ── */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          rows={formData.rows}
          activeFilterCount={activeFilterCount}
        />

        {/* ── No results banner ── */}
        {activeFilterCount > 0 && filteredRows.length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 animate-fade-in">
            <Filter size={18} className="flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">No records match your filters</p>
              <p className="text-xs mt-0.5 text-amber-700">Try adjusting or clearing the active filters.</p>
            </div>
            <button onClick={handleResetFilters} className="text-xs font-medium underline hover:no-underline">
              Clear all
            </button>
          </div>
        )}

        {/* Table */}
        <FormCard
          title="NCR Summary Table"
          icon={Layers}
          actions={
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span className="text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded font-medium">
                  {filteredRows.length} / {formData.rows.length} shown
                </span>
              )}
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{formData.rows.length} rows</span>
            </div>
          }
        >
          {/* Scroll Controls */}
          {filteredRows.length > 0 && (
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Scroll size={14} />
                <span>Scroll horizontally to see all columns</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => scrollTable('left')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Scroll left" aria-label="Scroll table left">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => scrollTable('right')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Scroll right" aria-label="Scroll table right">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Table Container */}
          <div ref={tableRef} className="overflow-x-auto scrollbar-thin -mx-5 px-5">
            <table className="min-w-full text-xs" style={{ minWidth: '1800px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-12 sticky left-0 bg-gray-50 z-10">Sr.</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">NCR No.</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[90px]">Audit Date</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[130px]">Auditor Name</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[130px]">Auditee Name</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                    Observation<br /><span className="font-normal text-gray-400">Description of non conformity</span>
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">Dept.</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[180px]">Corrective Action</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">Audit</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">Responsibility</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[90px]">Target Date</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">Implementation Status</th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-20 sticky right-0 bg-gray-50 z-10">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-gray-400 text-sm">
                      {formData.rows.length === 0 ? 'No NCR records found' : 'No records match the current filters'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={`${row.ncNo}-${index}`} className="transition-colors duration-150 hover:bg-violet-50/30">
                      <td className="px-3 py-3 text-gray-500 font-mono sticky left-0 bg-white z-10 border-r border-gray-100">{index + 1}</td>
                      <td className="px-3 py-3 font-mono text-gray-800 whitespace-nowrap">
                        <HighlightText text={row.ncNo} query={filters.search || filters.ncNo} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        <HighlightText text={row.auditDate || '—'} query={filters.search} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 truncate max-w-[130px]">
                        <HighlightText text={row.auditorName} query={filters.search} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 truncate max-w-[130px]">
                        <HighlightText text={row.auditeeName} query={filters.search} />
                      </td>

                      {/* Observation Column */}
                      <td className="px-3 py-3 text-gray-700 max-w-[200px]">
                        <div className="flex items-start gap-2">
                          <span className="line-clamp-2 flex-1">
                            <HighlightText text={row.observation || '—'} query={filters.search} />
                          </span>
                          {row.observation && row.observation.length > 100 && (
                            <button
                              onClick={() => handleOpenObservation(row.observation, row.ncNo)}
                              className="flex-shrink-0 p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                              title="View full observation"
                              aria-label={`Expand observation for ${row.ncNo}`}
                            >
                              <Expand size={14} />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        <HighlightText text={row.department || '—'} query={filters.search} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 max-w-[180px] line-clamp-2" title={row.correctiveAction}>
                        <HighlightText text={row.correctiveAction || '—'} query={filters.search} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        <HighlightText text={row.audit || '—'} query={filters.search} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 truncate max-w-[100px]" title={row.responsibility}>
                        <HighlightText text={row.responsibility || '—'} query={filters.search} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{row.targetDate || '—'}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        <HighlightText text={row.implementationStatus || '—'} query={filters.search} />
                      </td>
                      <td className="px-3 py-3 text-center sticky right-0 bg-white z-10 border-l border-gray-100">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {filteredRows.length > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 mt-4 -mx-5 -mb-5 rounded-b-xl">
              <p>
                Showing <span className="font-medium text-gray-700">{filteredRows.length}</span>
                {activeFilterCount > 0 && <> of <span className="font-medium text-gray-700">{formData.rows.length}</span> records</>}
                {activeFilterCount === 0 && <> records</>}
              </p>
              <p>Last updated: <span className="font-medium">{new Date().toLocaleTimeString()}</span></p>
            </div>
          )}
        </FormCard>

        {/* Helper Text */}
        <div className="text-center text-xs text-gray-400 py-2">
          <p>💡 <strong>Tip:</strong> Use the Filters & Search panel to narrow results • Click <Expand size={12} className="inline -mt-0.5" /> to view full observation details</p>
        </div>
      </main>

      {/* Observation Modal */}
      <ObservationModal
        isOpen={modalOpen}
        onClose={handleCloseObservation}
        observation={selectedObservation.text}
        ncNo={selectedObservation.ncNo}
      />

      <style>{`
        .scrollbar-thin::-webkit-scrollbar { height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
        .sticky { will-change: transform; backface-visibility: hidden; }
        mark { background-color: #fef08a; color: #713f12; border-radius: 2px; padding: 0 2px; }
      `}</style>
    </div>
  );
}
