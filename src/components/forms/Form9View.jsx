import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiGrid, FiLayers, FiSave, FiDownload,
  FiAlertCircle, FiRefreshCw, FiCheckCircle, FiXCircle,
  FiChevronRight, FiChevronLeft, FiFileText, FiMove, FiMaximize2, FiX,
  FiSearch, FiFilter, FiSliders, FiRotateCw, FiChevronDown
} from 'react-icons/fi';

// ═════ MNC STANDARD PALETTE ═════
const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#000000',       
  textValue: '#1F2937',  
  textMuted: '#6B7280',
  accent: '#00529B',
  accentLight: '#EFF6FF',
  accentBorder: '#DBEAFE',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  purpleBorder: '#DDD6FE',
};

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ─────────────────────────────────────────────────────────────
// Reusable UI Components
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', ...style }}>
    {children}
  </div>
);

const Spinner = ({ size = 16, color = '#FFFFFF' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
  </svg>
);

const ActionButton = React.memo(({ onClick, icon: Icon, label, variant = 'primary', disabled = false, title, loading = false }) => {
  const styles = {
    primary: { bg: T.accent, color: '#FFF', border: 'transparent' },
    secondary: { bg: T.card, color: T.textValue, border: T.border },
    outline: { bg: 'transparent', color: T.accent, border: T.accentBorder },
    pdf: { bg: T.error, color: '#FFF', border: 'transparent' },
  };
  const s = styles[variant] || styles.primary;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title || label}
      style={{
        height: 40, padding: '0 20px', borderRadius: 8, 
        border: `1px solid ${s.border}`,
        background: disabled ? '#F1F5F9' : s.bg, 
        color: disabled ? '#94A3B8' : s.color,
        fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: FONT_FAMILY,
        boxShadow: (variant === 'primary' || variant === 'pdf') && !disabled ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
      }}
    >
      {loading ? <Spinner size={16} color={s.color} /> : Icon && <Icon size={16} />}
      <span>{loading ? 'Generating...' : label}</span>
    </button>
  );
});

const StatusBadge = React.memo(({ status }) => {
  const isClosed = isClosedNcrStatus(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, fontFamily: FONT_FAMILY,
      background: isClosed ? T.successLight : T.warningLight,
      color: isClosed ? '#065F46' : '#92400E',
      border: `1px solid ${isClosed ? T.successBorder : T.warningBorder}`
    }}>
      {isClosed ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}
      {status}
    </span>
  );
});

const isClosedNcrStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return ['CLOSE', 'CLOSED', 'NCR2_COMPLETED'].includes(normalizedStatus);
};

const getCorrectiveActionText = (ncr) => (
  ncr.ncr2CorrectiveAction || ncr.ncr2Correction || ncr.correctiveAction || ncr.correction || 'Pending'
);

// ─────────────────────────────────────────────────────────────
// Observation Modal Component
// ─────────────────────────────────────────────────────────────

const ObservationModal = React.memo(({ isOpen, onClose, observation, ncNo }) => {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiFileText size={22} color={T.accent} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Observation Details</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>NCR: {ncNo}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FiX size={20} />
          </button>
        </div>
        <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, color: T.textValue, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {observation || 'No observation details available.'}
          </p>
        </div>
        <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
          <ActionButton onClick={onClose} label="Close" variant="secondary" />
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Filter Components
// ─────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', height: 40, padding: '0 14px', fontSize: 14, fontFamily: FONT_FAMILY, 
  borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textValue, 
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
};

const selectStyle = {
  ...inputStyle,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36,
  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', cursor: 'pointer'
};

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT_FAMILY };

const SelectFilter = React.memo(({ label, value, onChange, options }) => (
  <div style={{ minWidth: 140 }}>
    <label style={labelStyle}>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
      <option value="">All</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
));

const FilterPanel = React.memo(({ filters, onFilterChange, onReset, rows, activeFilterCount }) => {
  const [isOpen, setIsOpen] = useState(true); // Default open for better UX

  const uniqueValues = useMemo(() => ({
    status: [...new Set(rows.map((r) => r.status).filter(Boolean))],
    department: [...new Set(rows.map((r) => r.department).filter(Boolean))],
    audit: [...new Set(rows.map((r) => r.audit).filter(Boolean))],
    implementationStatus: [...new Set(rows.map((r) => r.implementationStatus).filter(Boolean))],
    auditorName: [...new Set(rows.map((r) => r.auditorName).filter(Boolean))],
  }), [rows]);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', overflow: 'hidden', marginBottom: 24 }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#F8FAFC', borderBottom: isOpen ? `1px solid ${T.border}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.purpleLight, border: `1px solid ${T.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiSliders size={16} color={T.purple} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Filters & Search</span>
          {activeFilterCount > 0 && (
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: T.purple, color: '#FFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeFilterCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeFilterCount > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onReset(); }} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.textValue, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_FAMILY }}>
              <FiRotateCw size={12} /> Clear
            </button>
          )}
          <FiChevronDown size={18} color={T.textMuted} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Global Search</label>
            <div style={{ position: 'relative' }}>
              <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input type="text" value={filters.search} onChange={(e) => onFilterChange('search', e.target.value)} placeholder="Search any field..." style={{...inputStyle, paddingLeft: 36}} />
            </div>
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={labelStyle}>NCR No.</label>
            <input type="text" value={filters.ncNo} onChange={(e) => onFilterChange('ncNo', e.target.value)} placeholder="e.g. NCR-001" style={inputStyle} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={labelStyle}>Date From</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => onFilterChange('dateFrom', e.target.value)} style={inputStyle} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={labelStyle}>Date To</label>
            <input type="date" value={filters.dateTo} onChange={(e) => onFilterChange('dateTo', e.target.value)} style={inputStyle} />
          </div>
          <SelectFilter label="Status" value={filters.status} onChange={(v) => onFilterChange('status', v)} options={uniqueValues.status} />
          <SelectFilter label="Department" value={filters.department} onChange={(v) => onFilterChange('department', v)} options={uniqueValues.department} />
          <SelectFilter label="Audit Type" value={filters.audit} onChange={(v) => onFilterChange('audit', v)} options={uniqueValues.audit} />
          <SelectFilter label="Impl. Status" value={filters.implementationStatus} onChange={(v) => onFilterChange('implementationStatus', v)} options={uniqueValues.implementationStatus} />
          <SelectFilter label="Auditor" value={filters.auditorName} onChange={(v) => onFilterChange('auditorName', v)} options={uniqueValues.auditorName} />
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Highlight Helper
// ─────────────────────────────────────────────────────────────

function HighlightText({ text, query }) {
  if (!query || !text) return <>{text || '—'}</>;
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: '#FEF08A', color: '#713f12', borderRadius: 2, padding: '0 2px' }}>{part}</mark>
          : part
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

const DEFAULT_FILTERS = { search: '', ncNo: '', status: '', department: '', audit: '', implementationStatus: '', auditorName: '', dateFrom: '', dateTo: '' };

export default function Form9View() {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({ title: 'Summary of Non Conformity', rows: [] });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState({ text: '', ncNo: '' });

  const fetchNCRSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://internalaudit.hub.swajyot.co.in:8090/api/ncr/all', {
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

  const filteredRows = useMemo(() => {
    const { search, ncNo, status, department, audit, implementationStatus, auditorName, dateFrom, dateTo } = filters;
    return formData.rows.filter((row) => {
      if (search) {
        const q = search.toLowerCase();
        const haystack = [row.ncNo, row.auditDate, row.auditorName, row.auditeeName, row.observation, row.department, row.correctiveAction, row.audit, row.responsibility, row.targetDate, row.implementationStatus, row.status].join(' ').toLowerCase();
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

  const activeFilterCount = useMemo(() => Object.values(filters).filter((v) => v !== '').length, [filters]);
  const handleFilterChange = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value })), []);
  const handleResetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://internalaudit.hub.swajyot.co.in:8090/api/ncr/form9/pdf', { method: 'GET', headers: { 'Authorization': token ? `Bearer ${token}` : '' } });
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

  const handleOpenObservation = useCallback((observation, ncNo) => { setSelectedObservation({ text: observation, ncNo }); setModalOpen(true); }, []);
  const handleCloseObservation = useCallback(() => { setModalOpen(false); setSelectedObservation({ text: '', ncNo: '' }); }, []);
  const scrollTable = useCallback((direction) => { if (tableRef.current) { tableRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' }); } }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: FONT_FAMILY }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner size={40} color={T.accent} />
          <p style={{ margin: '16px 0 0', fontSize: 15, fontWeight: 600, color: T.text }}>Loading NCR Summary...</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: T.textMuted }}>Fetching data from server</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
   

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>

                {/* Header (Converted to Card) */}
        <Card style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                onClick={() => navigate('/audit-manager?view=ncr')} 
                style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
                title="Back to Audit Manager"
              >
                <FiArrowLeft size={18} />
              </button>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiFileText size={24} color={T.accent} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Form 7: Nonconformity Reports</h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>View all NCRs raised by auditors</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={fetchNCRSummary}
                style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
                title="Refresh"
              >
                <FiRefreshCw size={18} />
              </button>
            </div>
          </div>
        </Card>
        
        {/* Alerts */}
        {success && (
          <div style={{ padding: 16, background: T.successLight, border: `1px solid ${T.successBorder}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', fontFamily: FONT_FAMILY }}>
            <FiCheckCircle size={20} color={T.success} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#065F46' }}>{success}</span>
          </div>
        )}
        {error && (
          <div style={{ padding: 16, background: T.errorLight, border: `1px solid ${T.errorBorder}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start', fontFamily: FONT_FAMILY }}>
            <FiAlertCircle size={20} color={T.error} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#991B1B' }}>Error</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#991B1B', opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Title Card */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.successLight, border: `1px solid ${T.successBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiGrid size={24} color={T.success} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>{formData.title}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: T.textMuted }}>
                Total Records: <span style={{ fontWeight: 600, color: T.textValue }}>{formData.rows.length}</span>
                {activeFilterCount > 0 && <span style={{ marginLeft: 8, color: T.purple, fontWeight: 600 }}>· {filteredRows.length} filtered</span>}
              </p>
            </div>
          </div>
          {formData.rows.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: T.errorLight, border: `1px solid ${T.errorBorder}`, borderRadius: 8 }}>
              <FiFileText size={16} color={T.error} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>Ready to export — {formData.rows.length} records</span>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        <FilterPanel filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} rows={formData.rows} activeFilterCount={activeFilterCount} />

        {/* No Results */}
        {activeFilterCount > 0 && filteredRows.length === 0 && (
          <div style={{ padding: 16, background: T.warningLight, border: `1px solid ${T.warningBorder}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', fontFamily: FONT_FAMILY }}>
            <FiFilter size={20} color={T.warning} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#92400E' }}>No records match your filters</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#92400E', opacity: 0.9 }}>Try adjusting or clearing the active filters.</p>
            </div>
            <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', color: '#92400E', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', fontSize: 14 }}>Clear all</button>
          </div>
        )}

        {/* Table Card */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FiLayers size={18} color={T.textMuted} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>NCR Summary Table</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeFilterCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6', background: T.purpleLight, border: `1px solid ${T.purpleBorder}`, padding: '4px 10px', borderRadius: 20 }}>
                  {filteredRows.length} / {formData.rows.length} shown
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, background: '#F1F5F9', padding: '4px 10px', borderRadius: 20, border: `1px solid ${T.border}` }}>{formData.rows.length} rows</span>
            </div>
          </div>

          {/* Scroll Controls */}
          {filteredRows.length > 0 && (
            <div style={{ padding: '12px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.textMuted }}>
                <FiMove size={14} />
                <span>Scroll horizontally to see all columns</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => scrollTable('left')} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FiChevronLeft size={16} /></button>
                <button onClick={() => scrollTable('right')} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FiChevronRight size={16} /></button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div ref={tableRef} style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1800, borderCollapse: 'collapse', fontFamily: FONT_FAMILY, fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: `2px solid ${T.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60, position: 'sticky', left: 0, background: '#F8FAFC', zIndex: 10, borderRight: `1px solid ${T.border}` }}>Sr.</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 100 }}>NCR No.</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 90 }}>Audit Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 130 }}>Auditor Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 130 }}>Auditee Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 200 }}>Observation<br/><span style={{ fontWeight: 400, color: T.textMuted, textTransform: 'none', fontSize: 10 }}>Description of non conformity</span></th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 80 }}>Dept.</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 180 }}>Corrective Action</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 80 }}>Audit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 100 }}>Responsibility</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 90 }}>Target Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 120 }}>Impl. Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', width: 120, position: 'sticky', right: 0, background: '#F8FAFC', zIndex: 10, borderLeft: `1px solid ${T.border}` }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 14 }}>
                      {formData.rows.length === 0 ? 'No NCR records found' : 'No records match the current filters'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={`${row.ncNo}-${index}`} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px', color: T.textMuted, fontFamily: 'monospace', position: 'sticky', left: 0, background: 'inherit', zIndex: 5, borderRight: `1px solid ${T.border}` }}>{index + 1}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: T.textValue, whiteSpace: 'nowrap' }}><HighlightText text={row.ncNo} query={filters.search || filters.ncNo} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, whiteSpace: 'nowrap' }}><HighlightText text={row.auditDate || '—'} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><HighlightText text={row.auditorName} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><HighlightText text={row.auditeeName} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, maxWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                            <HighlightText text={row.observation || '—'} query={filters.search} />
                          </span>
                          {row.observation && row.observation.length > 100 && (
                            <button onClick={() => handleOpenObservation(row.observation, row.ncNo)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.accentBorder}`, background: T.accentLight, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="View full observation">
                              <FiMaximize2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: T.textValue, whiteSpace: 'nowrap' }}><HighlightText text={row.department || '—'} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, maxWidth: 180, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={row.correctiveAction}><HighlightText text={row.correctiveAction || '—'} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, whiteSpace: 'nowrap' }}><HighlightText text={row.audit || '—'} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.responsibility}><HighlightText text={row.responsibility || '—'} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', color: T.textValue, whiteSpace: 'nowrap' }}>{row.targetDate || '—'}</td>
                      <td style={{ padding: '14px 16px', color: T.textValue, whiteSpace: 'nowrap' }}><HighlightText text={row.implementationStatus || '—'} query={filters.search} /></td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', position: 'sticky', right: 0, background: 'inherit', zIndex: 5, borderLeft: `1px solid ${T.border}` }}>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredRows.length > 0 && (
            <div style={{ padding: '12px 24px', background: '#F8FAFC', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: T.textMuted }}>
              <p style={{ margin: 0 }}>
                Showing <span style={{ fontWeight: 600, color: T.textValue }}>{filteredRows.length}</span>
                {activeFilterCount > 0 && <> of <span style={{ fontWeight: 600, color: T.textValue }}>{formData.rows.length}</span> records</>}
                {activeFilterCount === 0 && <> records</>}
              </p>
              <p style={{ margin: 0 }}>Last updated: <span style={{ fontWeight: 600, color: T.textValue }}>{new Date().toLocaleTimeString()}</span></p>
            </div>
          )}
        </div>

        {/* Helper Text */}
        <div style={{ textAlign: 'center', fontSize: 13, color: T.textMuted, marginTop: 24 }}>
          <p style={{ margin: 0 }}>💡 <strong>Tip:</strong> Use the Filters & Search panel to narrow results • Click <FiMaximize2 size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> to view full observation details</p>
        </div>
      </main>

      {/* Modal */}
      <ObservationModal isOpen={modalOpen} onClose={handleCloseObservation} observation={selectedObservation.text} ncNo={selectedObservation.ncNo} />
    </div>
  );
}