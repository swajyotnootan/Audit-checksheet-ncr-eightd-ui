import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle, FiArrowLeft, FiCheckCircle, FiClock, FiEye,
  FiFileText, FiRefreshCw, FiSearch, FiXCircle, FiSend,
  FiMessageSquare, FiFilter, FiLayers, FiAlertTriangle
} from 'react-icons/fi';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import ForumThreadView from '../forum/ForumThreadView';
import Drawer from '../Drawer';
import axios from 'axios';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

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
// Helper Functions
// ─────────────────────────────────────────────────────────────

const hasNcr2Data = (ncr) => Boolean(
  ncr?.ncr2RootCause || ncr?.ncr2Correction || ncr?.ncr2CorrectiveAction ||
  ['READY_FOR_NCR2', 'NCR2_IN_PROGRESS', 'NCR2_COMPLETED'].includes(ncr?.status)
);

const hasForm8Data = (ncr) => Boolean(
  ncr?.rootCause || ncr?.correction || ncr?.correctiveAction || hasNcr2Data(ncr)
);

const getStatusLabel = (status) => {
  const labels = {
    AWAITING_AUDITEE: 'Awaiting Auditee Review', OPEN: 'Pending Manager Approval',
    APPROVED: 'Approved', IN_PROGRESS: 'In Progress', CLOSED: 'Closed',
    REJECTED: 'Rejected', SENT_TO_8D: 'Sent to 8D', IN_8D_PROCESS: 'In 8D Process',
    READY_FOR_NCR2: 'Ready for NCR2', NCR2_IN_PROGRESS: 'NCR2 Verification', NCR2_COMPLETED: 'NCR2 Completed',
  };
  return labels[status] || status;
};

const FILTER_TYPES = { ALL: 'all', REGULAR: 'regular', EIGHT_D: '8d' };

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

const StatCard = ({ title, value, icon: Icon, color, bg, border }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, color: color || T.text }}>{value}</p>
      </div>
      {Icon && (
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg || '#F1F5F9', border: `1px solid ${border || T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color || T.textMuted} />
        </div>
      )}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    AWAITING_AUDITEE: { label: 'Awaiting Auditee', bg: T.warningLight, color: '#92400E', border: T.warningBorder },
    OPEN: { label: 'Pending Approval', bg: T.warningLight, color: '#92400E', border: T.warningBorder },
    APPROVED: { label: 'Approved', bg: T.accentLight, color: '#1E40AF', border: T.accentBorder },
    IN_PROGRESS: { label: 'In Progress', bg: T.purpleLight, color: '#5B21B6', border: T.purpleBorder },
    CLOSED: { label: 'Closed', bg: T.successLight, color: '#065F46', border: T.successBorder },
    REJECTED: { label: 'Rejected', bg: T.errorLight, color: '#991B1B', border: T.errorBorder },
    SENT_TO_8D: { label: 'Sent to 8D', bg: T.purpleLight, color: '#5B21B6', border: T.purpleBorder },
    IN_8D_PROCESS: { label: 'In 8D Process', bg: '#ECFEFF', color: '#155E75', border: '#A5F3FC' },
    READY_FOR_NCR2: { label: 'Ready for NCR2', bg: T.accentLight, color: '#1E40AF', border: T.accentBorder },
    NCR2_IN_PROGRESS: { label: 'NCR2 Verification', bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
    NCR2_COMPLETED: { label: 'NCR2 Completed', bg: T.successLight, color: '#065F46', border: T.successBorder },
  };
  const { label, bg, color, border } = config[status] || { label: status, bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color: color, border: `1px solid ${border}`, fontFamily: FONT_FAMILY }}>
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────

const NCRDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ncrList, setNcrList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.ALL);

  const [showSendTo8DModal, setShowSendTo8DModal] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [sendTo8DComment, setSendTo8DComment] = useState('');

  const [show8DForumDrawer, setShow8DForumDrawer] = useState(false);
  const [selected8DNCR, setSelected8DNCR] = useState(null);
  const [eightDTeamMembers, setEightDTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const isAuditManager = user?.role === 'AUDIT_MANAGER';

  const is8DRelated = (ncr) => {
    const eightDStatuses = ['SENT_TO_8D', 'IN_8D_PROCESS', 'READY_FOR_NCR2', 'NCR2_IN_PROGRESS', 'NCR2_COMPLETED'];
    return eightDStatuses.includes(ncr?.status) || ncr?.requires8D === true;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const allResult = await ncrService.getAllNCRs();
    if (!allResult.success) setError(allResult.error);
    setNcrList(allResult.success ? allResult.data : []);
    setLoading(false);
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      setAllUsersList(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsersList([]);
    }
  };

  useEffect(() => { loadData(); fetchAllUsers(); }, []);

  const openNCRForum = (ncr) => {
    const auditor = allUsersList.find(u => u.id === ncr.auditorId);
    const auditee = allUsersList.find(u => u.id === ncr.auditeeId);
    const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');

    setSelectedNCRForForum({
      id: ncr.id, ncrNumber: ncr.ncrNumber, department: ncr.department, severity: ncr.severity, status: ncr.status,
      auditorId: ncr.auditorId, auditorName: ncr.auditorName || auditor?.name,
      auditeeId: ncr.auditeeId, auditeeName: ncr.auditeeName || auditee?.name,
      memberEmails: [auditor?.email, auditee?.email, user?.email, auditManager?.email].filter(Boolean)
    });
    setShowForumModal(true);
  };

  const open8DForum = async (ncr) => {
    setSelected8DNCR(ncr);
    setEightDTeamMembers([]);
    setShow8DForumDrawer(true);
    setLoadingTeamMembers(true);

    try {
      const eightDEventId = `8D-${ncr.ncrNumber}`;
      const response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data/${eightDEventId}`);
      if (response.data?.success && response.data.data) {
        const d0Data = response.data.data.content?.d0?.[0] || {};
        const emails = Array.isArray(d0Data.additionalEmails) ? d0Data.additionalEmails : [];
        setEightDTeamMembers(emails);
      }
    } catch (err) {
      console.error('Failed to fetch 8D team members:', err);
      setEightDTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const handleSendTo8D = (ncr) => {
    setSelectedNCR(ncr);
    setSendTo8DComment('');
    setShowSendTo8DModal(true);
  };

  const confirmSendTo8D = async () => {
    if (!selectedNCR) return;
    setProcessingAction(true);
    try {
      const result = await ncrService.sendTo8D(selectedNCR.id, sendTo8DComment, user?.id);
      if (result.success) {
        setShowSendTo8DModal(false);
        await loadData();
        addToast(`NCR #${selectedNCR.ncrNumber} sent to 8D team!`, 'success');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error sending to 8D:', error);
      setError('Failed to send NCR to 8D process');
    } finally {
      setProcessingAction(false);
      setSelectedNCR(null);
    }
  };

  const filteredNCRs = useMemo(() => {
    let filtered = ncrList;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((ncr) =>
        [ncr.ncrNumber, ncr.department, ncr.auditorName, ncr.auditeeName, ncr.statementOfNonconformity]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      );
    }
    if (activeFilter === FILTER_TYPES.REGULAR) filtered = filtered.filter(ncr => !is8DRelated(ncr));
    else if (activeFilter === FILTER_TYPES.EIGHT_D) filtered = filtered.filter(ncr => is8DRelated(ncr));
    return filtered;
  }, [ncrList, searchTerm, activeFilter]);

  const stats = useMemo(() => ({
    total: ncrList.length,
    regularCount: ncrList.filter(ncr => !is8DRelated(ncr)).length,
    eightDCount: ncrList.filter(ncr => is8DRelated(ncr)).length,
    awaitingAuditee: ncrList.filter((ncr) => ncr.status === 'AWAITING_AUDITEE').length,
    open: ncrList.filter((ncr) => ncr.status === 'OPEN').length,
    approved: ncrList.filter((ncr) => ncr.status === 'APPROVED').length,
    inProgress: ncrList.filter((ncr) => ncr.status === 'IN_PROGRESS').length,
    closed: ncrList.filter((ncr) => ncr.status === 'CLOSED').length,
    rejected: ncrList.filter((ncr) => ncr.status === 'REJECTED').length,
    sentTo8D: ncrList.filter((ncr) => ncr.status === 'SENT_TO_8D' || ncr.requires8D).length,
    readyForNCR2: ncrList.filter((ncr) => ncr.status === 'READY_FOR_NCR2').length,
    ncr2InProgress: ncrList.filter((ncr) => ncr.status === 'NCR2_IN_PROGRESS').length,
    ncr2Completed: ncrList.filter((ncr) => ncr.status === 'NCR2_COMPLETED').length,
  }), [ncrList]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: FONT_FAMILY }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner size={40} color={T.accent} />
          <p style={{ margin: '16px 0 0', fontSize: 15, fontWeight: 600, color: T.text }}>Loading NCR register...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
  

      {/* Main Content */}
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
                onClick={loadData}
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

        

        {/* Error Alert */}
        {error && (
          <div style={{ padding: 16, background: T.errorLight, border: `1px solid ${T.errorBorder}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, fontFamily: FONT_FAMILY }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: T.card, border: `1px solid ${T.errorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiAlertCircle size={18} color={T.error} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#991B1B' }}>Error</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#991B1B', opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
       {/* Statistics Cards - Forced into a Single Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(8, 1fr)', // 👈 Changed to exactly 8 columns
          gap: 16, 
          marginBottom: 24,
          overflowX: 'auto' // 👈 Added horizontal scroll just in case the screen is too small
        }}>
          <StatCard title="Total NCRs" value={stats.total} icon={FiFileText} color={T.textValue} bg="#F1F5F9" border={T.border} />
          <StatCard title="Awaiting Auditee" value={stats.awaitingAuditee} icon={FiClock} color={T.warning} bg={T.warningLight} border={T.warningBorder} />
          <StatCard title="Pending Approval" value={stats.open} icon={FiClock} color={T.warning} bg={T.warningLight} border={T.warningBorder} />
          <StatCard title="Approved" value={stats.approved} icon={FiCheckCircle} color={T.accent} bg={T.accentLight} border={T.accentBorder} />
          <StatCard title="In Progress" value={stats.inProgress} icon={FiAlertCircle} color={T.purple} bg={T.purpleLight} border={T.purpleBorder} />
          <StatCard title="Closed" value={stats.closed} icon={FiCheckCircle} color={T.success} bg={T.successLight} border={T.successBorder} />
          <StatCard title="Rejected" value={stats.rejected} icon={FiXCircle} color={T.error} bg={T.errorLight} border={T.errorBorder} />
          <StatCard title="In 8D Process" value={stats.eightDCount} icon={FiAlertTriangle} color={T.purple} bg={T.purpleLight} border={T.purpleBorder} />
        </div>

        {/* 8D Status Cards */}
        {activeFilter === FILTER_TYPES.EIGHT_D && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard title="Sent to 8D" value={stats.sentTo8D} icon={FiSend} color={T.purple} bg={T.purpleLight} border={T.purpleBorder} />
            <StatCard title="Ready for NCR2" value={stats.readyForNCR2} icon={FiClock} color="#1E40AF" bg={T.accentLight} border={T.accentBorder} />
            <StatCard title="NCR2 Verification" value={stats.ncr2InProgress} color="#5B21B6" bg="#F5F3FF" border="#DDD6FE" />
            <StatCard title="NCR2 Completed" value={stats.ncr2Completed} icon={FiCheckCircle} color={T.success} bg={T.successLight} border={T.successBorder} />
          </div>
        )}

        {/* Filter Section */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiFilter size={18} color={T.textMuted} />
              <span style={{ fontSize: 14, fontWeight: 600, color: T.textValue }}>Filter NCRs:</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setActiveFilter(FILTER_TYPES.ALL)} style={{ height: 38, padding: '0 16px', borderRadius: 8, border: `1px solid ${activeFilter === FILTER_TYPES.ALL ? T.text : T.border}`, background: activeFilter === FILTER_TYPES.ALL ? T.text : T.card, color: activeFilter === FILTER_TYPES.ALL ? '#FFF' : T.textValue, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: FONT_FAMILY }}>
                <FiLayers size={14} /> All NCRs
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: activeFilter === FILTER_TYPES.ALL ? 'rgba(255,255,255,0.2)' : '#F1F5F9', color: activeFilter === FILTER_TYPES.ALL ? '#FFF' : T.textMuted }}>{stats.total}</span>
              </button>
              <button onClick={() => setActiveFilter(FILTER_TYPES.REGULAR)} style={{ height: 38, padding: '0 16px', borderRadius: 8, border: `1px solid ${activeFilter === FILTER_TYPES.REGULAR ? T.accent : T.border}`, background: activeFilter === FILTER_TYPES.REGULAR ? T.accent : T.card, color: activeFilter === FILTER_TYPES.REGULAR ? '#FFF' : T.textValue, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: FONT_FAMILY }}>
                <FiFileText size={14} /> Regular NCRs
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: activeFilter === FILTER_TYPES.REGULAR ? 'rgba(255,255,255,0.2)' : T.accentLight, color: activeFilter === FILTER_TYPES.REGULAR ? '#FFF' : '#1E40AF' }}>{stats.regularCount}</span>
              </button>
              <button onClick={() => setActiveFilter(FILTER_TYPES.EIGHT_D)} style={{ height: 38, padding: '0 16px', borderRadius: 8, border: `1px solid ${activeFilter === FILTER_TYPES.EIGHT_D ? T.purple : T.border}`, background: activeFilter === FILTER_TYPES.EIGHT_D ? T.purple : T.card, color: activeFilter === FILTER_TYPES.EIGHT_D ? '#FFF' : T.textValue, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: FONT_FAMILY }}>
                <FiAlertTriangle size={14} /> 8D Process
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: activeFilter === FILTER_TYPES.EIGHT_D ? 'rgba(255,255,255,0.2)' : T.purpleLight, color: activeFilter === FILTER_TYPES.EIGHT_D ? '#FFF' : '#5B21B6' }}>{stats.eightDCount}</span>
              </button>
            </div>
          </div>
          {activeFilter !== FILTER_TYPES.ALL && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <p style={{ margin: 0, fontSize: 13, color: activeFilter === FILTER_TYPES.REGULAR ? '#1E40AF' : '#5B21B6' }}>
                {activeFilter === FILTER_TYPES.REGULAR ? '📋 Showing only regular NCRs (not in 8D process)' : '🔍 Showing only NCRs in 8D process'}
              </p>
            </div>
          )}
        </div>

        {/* NCR Table Section */}
        <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>
                {activeFilter === FILTER_TYPES.REGULAR && 'Regular NCRs'}
                {activeFilter === FILTER_TYPES.EIGHT_D && '8D Process NCRs'}
                {activeFilter === FILTER_TYPES.ALL && 'All NCRs'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>{filteredNCRs.length} NCR{filteredNCRs.length !== 1 ? 's' : ''} found</p>
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
              <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search NCR, department, auditor..."
                style={{ width: '100%', height: 40, padding: '0 16px 0 36px', fontSize: 14, fontFamily: FONT_FAMILY, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textValue, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_FAMILY, fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${T.border}` }}>
                  {['NCR No.', 'Department', 'Auditor', 'Auditee', 'Status', 'Audit Score', 'Action'].map((label) => (
                    <th key={label} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNCRs.map((ncr) => (
                  <tr key={ncr.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 24px', fontSize: 14, fontWeight: 600, color: T.textValue }}>{ncr.ncrNumber || `NCR ${ncr.id}`}</td>
                    <td style={{ padding: '14px 24px', fontSize: 14, color: T.textMuted }}>{ncr.department || '-'}</td>
                    <td style={{ padding: '14px 24px', fontSize: 14, color: T.textMuted }}>{ncr.auditorName || '-'}</td>
                    <td style={{ padding: '14px 24px', fontSize: 14, color: T.textMuted }}>{ncr.auditeeName || '-'}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                        <StatusBadge status={ncr.status} />
                        {is8DRelated(ncr) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: T.purpleLight, color: '#5B21B6', border: `1px solid ${T.purpleBorder}` }}>🔄 8D</span>
                        )}
                        {ncr.auditScore < 70 && ncr.status === 'APPROVED' && !ncr.requires8D && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: T.errorLight, color: '#991B1B', border: `1px solid ${T.errorBorder}` }}>⚠️ Needs 8D</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: 14 }}>
                      {ncr.auditScore != null ? (
                        <span style={{ fontWeight: 600, color: ncr.auditScore >= 70 ? T.success : T.error }}>{ncr.auditScore}%</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/ncr-view/${ncr.id}`, { state: { returnTo: '/ncr-dashboard', tab: 'ncrs' } })} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.accentBorder}`, background: T.accentLight, color: T.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} title="View NCR" onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#FFF'; }} onMouseLeave={e => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.color = T.accent; }}>
                          <FiEye size={14} />
                        </button>
                        <button onClick={() => openNCRForum(ncr)} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.purpleBorder}`, background: T.purpleLight, color: '#5B21B6', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: FONT_FAMILY }} title="Open NCR Discussion Forum" onMouseEnter={e => { e.currentTarget.style.background = T.purple; e.currentTarget.style.color = '#FFF'; }} onMouseLeave={e => { e.currentTarget.style.background = T.purpleLight; e.currentTarget.style.color = '#5B21B6'; }}>
                          <FiMessageSquare size={12} /> Forum
                        </button>
                        {is8DRelated(ncr) && (
                          <button onClick={() => open8DForum(ncr)} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.accentBorder}`, background: T.accentLight, color: '#1E40AF', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: FONT_FAMILY }} title="Open 8D Team Discussion" onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#FFF'; }} onMouseLeave={e => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.color = '#1E40AF'; }}>
                            <FiMessageSquare size={12} /> 8D Forum
                          </button>
                        )}
                        {isAuditManager && ncr.status === 'APPROVED' && ncr.auditScore < 70 && !ncr.requires8D && !is8DRelated(ncr) && (
                          <button onClick={() => handleSendTo8D(ncr)} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.errorBorder}`, background: T.errorLight, color: '#991B1B', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: FONT_FAMILY }} title="Send to 8D Process" onMouseEnter={e => { e.currentTarget.style.background = T.error; e.currentTarget.style.color = '#FFF'; }} onMouseLeave={e => { e.currentTarget.style.background = T.errorLight; e.currentTarget.style.color = '#991B1B'; }}>
                            <FiSend size={12} /> Send to 8D
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredNCRs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 14 }}>
                      {activeFilter === FILTER_TYPES.REGULAR && 'No regular NCRs found.'}
                      {activeFilter === FILTER_TYPES.EIGHT_D && 'No NCRs in 8D process found.'}
                      {activeFilter === FILTER_TYPES.ALL && 'No NCRs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Send to 8D Confirmation Modal */}
      {showSendTo8DModal && selectedNCR && (
        <div onClick={() => { setShowSendTo8DModal(false); setSelectedNCR(null); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.purpleLight, border: `1px solid ${T.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiSend size={22} color={T.purple} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Send to 8D Process</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>NCR #{selectedNCR.ncrNumber}</p>
              </div>
            </div>
            <div style={{ padding: '24px 32px' }}>
              {selectedNCR.auditScore < 70 && (
                <div style={{ padding: 16, background: T.errorLight, border: `1px solid ${T.errorBorder}`, borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#991B1B' }}>⚠️ Audit Score: {selectedNCR.auditScore}% (Below 70% threshold)</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#991B1B', opacity: 0.9 }}>This NCR requires 8D investigation.</p>
                </div>
              )}
              <p style={{ margin: '0 0 16px', fontSize: 14, color: T.textValue }}>
                Are you sure you want to send <strong>NCR #{selectedNCR.ncrNumber}</strong> to the 8D process?
              </p>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>Comments (Optional)</label>
              <textarea
                rows={4}
                style={{ width: '100%', padding: 12, fontSize: 14, fontFamily: FONT_FAMILY, borderRadius: 8, border: `1px solid ${T.border}`, background: '#F8FAFC', color: T.textValue, outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                placeholder="Add any comments about why this needs 8D investigation..."
                value={sendTo8DComment}
                onChange={(e) => setSendTo8DComment(e.target.value)}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowSendTo8DModal(false); setSelectedNCR(null); }} style={{ height: 40, padding: '0 20px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textValue, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_FAMILY }}>Cancel</button>
              <button onClick={confirmSendTo8D} disabled={processingAction} style={{ height: 40, padding: '0 20px', borderRadius: 8, border: 'none', background: T.purple, color: '#FFF', fontSize: 14, fontWeight: 600, cursor: processingAction ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT_FAMILY, opacity: processingAction ? 0.7 : 1 }}>
                {processingAction && <Spinner size={16} />}
                <FiSend size={16} /> Send to 8D
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NCR Forum Modal */}
      {showForumModal && selectedNCRForForum && (
        <AuditCheckSheetNCRForumModal
          auditId={selectedNCRForForum.id}
          auditNumber={selectedNCRForForum.ncrNumber}
          auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
          auditStatus={selectedNCRForForum.status}
          auditType="NCR Resolution"
          department={selectedNCRForForum.department}
          auditorId={selectedNCRForForum.auditorId}
          auditorName={selectedNCRForForum.auditorName}
          auditeeId={selectedNCRForForum.auditeeId}
          auditeeName={selectedNCRForForum.auditeeName}
          memberEmails={selectedNCRForForum.memberEmails || []}
          isOpen={showForumModal}
          onClose={() => { setShowForumModal(false); setSelectedNCRForForum(null); }}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}

      {/* 8D Forum Drawer */}
      <Drawer
        isOpen={show8DForumDrawer}
        onClose={() => { setShow8DForumDrawer(false); setSelected8DNCR(null); setEightDTeamMembers([]); }}
        title="8D Team Discussion"
        showHeader={false}
        className="w-full sm:w-[50vw]"
      >
        {selected8DNCR && (
          <div style={{ height: '100%', background: T.bg }}>
            {loadingTeamMembers ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: FONT_FAMILY }}>
                <Spinner size={24} color={T.accent} />
                <span style={{ marginLeft: 12, color: T.textMuted, fontSize: 14 }}>Loading team members...</span>
              </div>
            ) : (
              <ForumThreadView
                groupId={`8D-${selected8DNCR.ncrNumber}`}
                groupName={`8D-${selected8DNCR.ncrNumber}`}
                isInDrawer={true}
                setForumDrawerOpen={setShow8DForumDrawer}
                username={user?.email || user?.username}
                currentUser={user}
                allUsers={allUsersList}
                memberEmails={eightDTeamMembers}
                onBack={() => setShow8DForumDrawer(false)}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default NCRDashboard;