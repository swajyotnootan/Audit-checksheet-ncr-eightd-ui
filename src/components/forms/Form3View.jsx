import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';

import {
  FiSave, FiRefreshCw, FiCheckCircle, FiClock, FiSend,
  FiCheck, FiX, FiAlertCircle, FiFileText, FiMessageSquare, FiDownload,
  FiStar, FiCalendar, FiArrowLeft // 👈 Added FiArrowLeft
} from 'react-icons/fi';

const API_BASE = 'http://localhost:8080/api';

// ══════ MNC STANDARD PALETTE ══════
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

/* ─── Reusable UI Components ────────────────────────────────────────────── */

const Card = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', ...style }}>
    {children}
  </div>
);

const formatLocalDateTime = (utcDateStr) => {
  if (!utcDateStr) return '-';

  // Create date object - handle both with and without timezone info
  const date = new Date(utcDateStr);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    // If invalid, try appending 'Z' for UTC
    const altDate = new Date(utcDateStr + 'Z');
    if (isNaN(altDate.getTime())) return '-';
    
    // Convert to IST
    return altDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Convert to IST
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const ActionButton = ({ onClick, disabled, loading, color, bgColor, borderColor, icon: Icon, children }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    style={{
      height: 40, padding: '0 20px', borderRadius: 8, border: `1px solid ${borderColor || 'transparent'}`,
      background: (disabled || loading) ? '#F1F5F9' : bgColor, color: (disabled || loading) ? '#94A3B8' : color,
      fontSize: 14, fontWeight: 600, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: FONT_FAMILY,
      boxShadow: (disabled || loading) ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}
  >
    {loading ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
      </svg>
    ) : Icon ? <Icon size={16} /> : null}
    {children}
  </button>
);

const AlertBanner = ({ type, title, message, footer, icon: Icon }) => {
  const styles = {
    error: { bg: T.errorLight, border: T.errorBorder, color: '#991B1B', iconColor: '#DC2626' },
    warning: { bg: T.warningLight, border: T.warningBorder, color: '#92400E', iconColor: '#D97706' },
    success: { bg: T.successLight, border: T.successBorder, color: '#065F46', iconColor: '#059669' }
  };
  const s = styles[type] || styles.error;
  return (
    <div style={{ padding: 16, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, fontFamily: FONT_FAMILY }}>
      <Icon size={20} color={s.iconColor} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: s.color }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: s.color, opacity: 0.9 }}>{message}</p>
        {footer && <p style={{ margin: '8px 0 0', fontSize: 12, color: s.color, opacity: 0.7 }}>{footer}</p>}
      </div>
    </div>
  );
};

const ActionModal = ({ isOpen, onClose, title, description, icon: Icon, iconColor, iconBg, iconBorder, value, setValue, placeholder, onSubmit, submitLabel, submitColor, submitBg, submitting }) => {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={22} color={iconColor} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>{description}</p>
          </div>
        </div>
        <div style={{ padding: '24px 32px' }}>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={5}
            placeholder={placeholder}
            autoFocus
            style={{
              width: '100%', padding: 12, fontSize: 14, fontFamily: FONT_FAMILY, borderRadius: 8,
              border: `1px solid ${T.border}`, background: '#F8FAFC', color: T.textValue,
              outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = iconColor}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <ActionButton onClick={onClose} color={T.textValue} bgColor={T.card} borderColor={T.border}>Cancel</ActionButton>
          <ActionButton onClick={onSubmit} disabled={!value.trim()} loading={submitting} color="#FFF" bgColor={submitBg} icon={Icon}>{submitLabel}</ActionButton>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
const Form3View = () => {
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [planData, setPlanData] = useState([]);
  const [planStatus, setPlanStatus] = useState('DRAFT');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState('');
  const [tempRejectionReason, setTempRejectionReason] = useState('');
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [searchParams] = useSearchParams();
  const urlYear = searchParams.get('year');
  
  const [selectedYear, setSelectedYear] = useState(urlYear ? parseInt(urlYear) : new Date().getFullYear());

  useEffect(() => { if (urlYear) setSelectedYear(parseInt(urlYear)); }, [urlYear]);

  const [planInfo, setPlanInfo] = useState({
    preparedBy: '', approvedBy: '', approvedAt: null, approvalComments: '',
    rejectedAt: null, rejectedBy: '', rejectionReason: ''
  });

  const auditElements = [
    { id: 1, name: "System Audit (ISO9001)" }, { id: 2, name: "System Audit (IATF16949)" },
    { id: 3, name: "5S Audit" }, { id: 4, name: "Process Audit" }, { id: 5, name: "Product Audit" }
  ];

  const financialMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}`, { withCredentials: true });
      if (response.data) {
        setPlanData(response.data.planItems || []);
        setPlanStatus(response.data.approvalStatus || 'DRAFT');
        setRejectionReason(response.data.rejectionReason || '');
        setPlanInfo({
          preparedBy: response.data.preparedBy || user?.name || user?.username,
          approvedBy: response.data.approvedBy || '', approvedAt: response.data.approvedAt || null,
          approvalComments: response.data.approvalComments || '', rejectedAt: response.data.rejectedAt || null,
          rejectedBy: response.data.rejectedBy || '', rejectionReason: response.data.rejectionReason || ''
        });
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      addToast('Failed to load plan data', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { const currentYear = new Date().getFullYear(); const years = []; for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i); setAvailableYears(years); }, []);
  useEffect(() => { fetchPlanData(); }, [selectedYear]);

  const handleDemoPlanned = async () => {
    if (!canEdit) { addToast('You cannot modify this plan in its current status', 'warning'); return; }
    setDemoLoading(true);
    try {
      let newPlanData = [...planData];
      if (newPlanData.length === 0) {
        auditElements.forEach(element => {
          const monthsData = financialMonths.map(month => ({ month: month, status: '' }));
          newPlanData.push({ auditElement: element.name, months: monthsData });
        });
      }
      let totalPlannedCount = 0;
      newPlanData.forEach(element => {
        if (element.auditElement === "System Audit (IATF16949)" || element.auditElement === "5S Audit") {
          element.months.forEach(month => {
            if (month.status !== 'PLANNED') { month.status = 'PLANNED'; totalPlannedCount++; }
          });
        }
      });
      setPlanData(newPlanData);
      await axios.post(`${API_BASE}/audit-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: newPlanData }, { withCredentials: true });
      addToast(`✅ Demo mode: ${totalPlannedCount} audits marked as PLANNED!`, 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to mark audits as planned', 'error'); } finally { setDemoLoading(false); }
  };

  const handleSave = async () => {
    if (planStatus === 'APPROVED') { addToast('Approved plan cannot be modified', 'warning'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: planData }, { withCredentials: true });
      addToast('Annual Audit Plan saved successfully!', 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to save plan', 'error'); } finally { setSaving(false); }
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = false; let plannedCount = 0;
    planData.forEach(element => element?.months?.forEach(month => { if (month?.status === 'PLANNED') { hasPlanned = true; plannedCount++; } }));
    if (!hasPlanned) { addToast('Please mark at least one month as PLANNED before submitting', 'warning'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: planData }, { withCredentials: true });
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/submit?userId=${user?.id}`, {}, { withCredentials: true });
      addToast(`Plan ${planStatus === 'REJECTED' ? 'resubmitted' : 'submitted'} for approval! (${plannedCount} months planned)`, 'success');
      await fetchPlanData();
    } catch (error) { addToast(error.response?.data?.message || 'Failed to submit plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (elementIndex, monthName) => {
    if (!canEdit) { addToast('You cannot modify this plan', 'warning'); return; }
    const newPlanData = [...planData];
    const element = newPlanData[elementIndex];
    if (!element) return;
    const monthIndex = element.months.findIndex(m => m.month === monthName);
    if (monthIndex === -1) return;
    const currentStatus = element.months[monthIndex].status;
    element.months[monthIndex].status = currentStatus === '' ? 'PLANNED' : currentStatus === 'PLANNED' ? 'COMPLETED' : '';
    setPlanData(newPlanData);
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) { addToast('Please provide approval comments', 'warning'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/approve?userId=${user?.id}`, { comments: tempApprovalComment }, { withCredentials: true });
      setPlanStatus('APPROVED');
      setPlanInfo(prev => ({ ...prev, approvalComments: tempApprovalComment, approvedAt: new Date().toISOString(), approvedBy: user?.name || user?.username }));
      setShowApproveModal(false); setTempApprovalComment('');
      addToast('Plan approved successfully!', 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to approve plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/reject?userId=${user?.id}`, { reason: tempRejectionReason }, { withCredentials: true });
      setPlanStatus('REJECTED'); setRejectionReason(tempRejectionReason);
      setPlanInfo(prev => ({ ...prev, rejectionReason: tempRejectionReason, rejectedAt: new Date().toISOString(), rejectedBy: user?.name || user?.username }));
      setShowRejectModal(false); setTempRejectionReason('');
      addToast('Plan rejected', 'error');
      await fetchPlanData();
    } catch (error) { addToast('Failed to reject plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) { addToast('Please provide a reason', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/request-changes?userId=${user?.id}`, { reason: changeRequestReason }, { withCredentials: true });
      addToast(`Change request submitted for ${selectedYear}`, 'warning');
      setShowChangeRequestModal(false); setChangeRequestReason('');
      await fetchPlanData();
    } catch (error) { addToast(error.response?.data?.message || 'Failed to submit change request', 'error'); } finally { setSubmitting(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}/export-pdf`, { responseType: 'blob', withCredentials: true });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Annual_Audit_Plan_${selectedYear}.pdf`);
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      addToast('PDF exported successfully!', 'success');
    } catch (error) { addToast(error.response?.data?.message || 'Failed to export PDF', 'error'); } finally { setExporting(false); }
  };

  const getPlanStatusBadge = () => {
    const styles = {
      'APPROVED': { bg: T.successLight, color: '#065F46', border: T.successBorder, text: 'Approved', icon: FiCheckCircle },
      'PENDING_APPROVAL': { bg: T.warningLight, color: '#92400E', border: T.warningBorder, text: 'Pending Approval', icon: FiClock },
      'REJECTED': { bg: T.errorLight, color: '#991B1B', border: T.errorBorder, text: 'Rejected', icon: FiX },
      'CHANGE_REQUESTED': { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA', text: 'Changes Requested', icon: FiMessageSquare }
    };
    const s = styles[planStatus] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', text: 'Draft', icon: FiFileText };
    const Icon = s.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, fontSize: 12, fontWeight: 600, color: s.color, fontFamily: FONT_FAMILY }}>
        <Icon size={14} /> {s.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const baseStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700, transition: 'all 0.2s' };
    if (status === 'COMPLETED') return <div style={{ ...baseStyle, background: T.successLight, color: T.success, border: `1px solid ${T.successBorder}` }}><FiCheck size={14} /></div>;
    if (status === 'PLANNED') return <div style={{ ...baseStyle, background: T.accentLight, color: T.accent, border: `1px solid ${T.accentBorder}` }}><FiClock size={14} /></div>;
    return <div style={{ ...baseStyle, background: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0' }}>—</div>;
  };

  // We still need totalPlanned to determine if the user can submit the plan
  let totalPlanned = 0;
  planData.forEach(element => element?.months?.forEach(month => {
    if (month?.status === 'PLANNED') totalPlanned++;
  }));

  const canEdit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED'));
  const canSubmit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED') && totalPlanned > 0);
  const canApprove = (isTopManagement && planStatus === 'PENDING_APPROVAL');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: FONT_FAMILY }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <circle cx="12" cy="12" r="10" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="12" cy="12" r="10" stroke={T.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
      
      {/* Header */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>


                <button
                onClick={() => {
                  // 👇 Dynamic routing based on user role
                  if (isTopManagement) {
                    navigate('/top-management'); // ⚠️ Update this path to match your actual Top Management dashboard route
                  } else {
                    navigate('/audit-manager?view=schedules');
                  }
                }}
                style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
                title="Back to Dashboard"
              >
                <FiArrowLeft size={18} />
              </button>


            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCalendar size={24} color={T.accent} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Annual Internal Audit Plan</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>Form 3 - Annual Audit Planning (Financial Year)</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>Status:</span>
              {getPlanStatusBadge()}
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              disabled={planStatus === 'PENDING_APPROVAL'}
              style={{
                height: 40, padding: '0 32px 0 12px', fontSize: 14, fontWeight: 500, fontFamily: FONT_FAMILY, borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.card, color: T.textValue, outline: 'none', cursor: 'pointer',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'
              }}
            >
              {availableYears.map(year => <option key={year} value={year}>{year} - {year + 1}</option>)}
            </select>
            <button
              onClick={fetchPlanData}
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


      {/* {planStatus === 'APPROVED' && planInfo.approvalComments && 
      <AlertBanner type="success" icon={FiCheckCircle} title="Approval Comments" message={planInfo.approvalComments} 
      footer={`Approved by: ${planInfo.approvedBy} | Date: ${formatLocalDateTime(planInfo.approvedAt)}`} />}
       */}
      {/* Alerts */}
      {planStatus === 'CHANGE_REQUESTED' && (rejectionReason || planInfo.rejectionReason) && (
          <AlertBanner 
            type="warning" 
            icon={FiAlertCircle}
            title="Change Request Reason"
            message={rejectionReason || planInfo.rejectionReason}
            footer={`Requested by: ${planInfo.rejectedBy} | Date: ${formatLocalDateTime(planInfo.rejectedAt)}`}
          />
        )}


          {planStatus === 'REJECTED' && (rejectionReason || planInfo.rejectionReason) && (
            <AlertBanner 
              type="error" 
              icon={FiAlertCircle}
              title="Rejection Reason"
              message={rejectionReason || planInfo.rejectionReason}
              footer={`Rejected by: ${planInfo.rejectedBy} | Date: ${formatLocalDateTime(planInfo.rejectedAt)}`}
            />
          )}
      {planStatus === 'APPROVED' && planInfo.approvalComments && (
        <AlertBanner 
          type="success" 
          icon={FiCheckCircle}
          title="Approval Comments"
          message={planInfo.approvalComments}
          footer={`Approved by: ${planInfo.approvedBy} | Date: ${formatLocalDateTime(planInfo.approvedAt)}`}
        />
      )}

      {/* Demo Banner */}
      {canEdit && (
        <Card style={{ padding: 20, marginBottom: 24, background: 'linear-gradient(to right, #F5F3FF, #FDF2F8)', border: `1px solid ${T.purpleBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF', border: `1px solid ${T.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiStar size={20} color={T.purple} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#4C1D95' }}>Quick Planning Demo</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6D28D9' }}>Save time with automatic planning for IATF16949 & 5S audits</p>
              </div>
            </div>
            <ActionButton 
              onClick={handleDemoPlanned} 
              loading={demoLoading} 
              color="#FFF" 
              bgColor={T.purple} 
              icon={FiStar}
            >
              Demo: Plan All Months (IATF & 5S)
            </ActionButton>
          </div>
        </Card>
      )}

      {/* Main Table */}
      <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontFamily: FONT_FAMILY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${T.border}` }}>
                <th rowSpan={2} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: `1px solid ${T.border}` }}>S. No.</th>
                <th rowSpan={2} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: `1px solid ${T.border}`, minWidth: 200 }}>Audit Elements</th>
                <th colSpan={12} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Year {selectedYear} - {selectedYear + 1}</th>
              </tr>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {/* Removed the extra empty <th> that was causing misalignment */}
                {financialMonths.map(month => (
                  <th key={month} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', borderRight: `1px solid ${T.border}`, minWidth: 50 }}>{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planData.length === 0 ? (
                <tr><td colSpan={14} style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>No audit elements found. Click "Demo: Plan All Months" to initialize.</td></tr>
              ) : (
                planData.map((element, elementIndex) => {
                  const monthStatusMap = {};
                  element?.months?.forEach(month => { monthStatusMap[month.month] = month.status; });
                  return (
                    <tr key={elementIndex} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: T.textMuted, fontWeight: 500, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>{elementIndex + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: T.textValue, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>{element?.auditElement}</td>
                      {financialMonths.map((financialMonth, displayIndex) => {
                        const status = monthStatusMap[financialMonth] || '';
                        return (
                          <td key={displayIndex} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: `1px solid ${T.border}`, borderRight: displayIndex === 11 ? 'none' : `1px solid ${T.border}` }}>
                            {canEdit ? (
                              <button
                                onClick={() => handleStatusChange(elementIndex, financialMonth)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                {getStatusBadge(status)}
                              </button>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center' }}>{getStatusBadge(status)}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend & Actions */}
      <Card style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Legend:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textMuted }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: T.accent }}></div> P - Planned
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textMuted }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: T.success }}></div> C - Completed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textMuted }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#CBD5E1' }}></div> — - Not Planned
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {planData.length > 0 && (
              <ActionButton onClick={handleExportPDF} loading={exporting} color={T.textValue} bgColor={T.card} borderColor={T.border} icon={FiDownload}>Export PDF</ActionButton>
            )}
            {canEdit && (
              <ActionButton onClick={handleSave} loading={saving} color={T.textValue} bgColor={T.card} borderColor={T.border} icon={FiSave}>Save Draft</ActionButton>
            )}
            {canSubmit && (
              <ActionButton onClick={handleSubmitForApproval} loading={submitting} color="#FFF" bgColor={T.accent} icon={FiSend}>
                {planStatus === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
              </ActionButton>
            )}
            {canApprove && (
              <>
                <ActionButton onClick={() => setShowRejectModal(true)} color="#FFF" bgColor={T.error} icon={FiX}>Reject</ActionButton>
                <ActionButton onClick={() => setShowApproveModal(true)} color="#FFF" bgColor={T.success} icon={FiCheck}>Approve</ActionButton>
              </>
            )}
            {isTopManagement && planStatus === 'APPROVED' && (
              <ActionButton onClick={() => setShowChangeRequestModal(true)} color="#FFF" bgColor={T.warning} icon={FiMessageSquare}>Request Changes</ActionButton>
            )}
          </div>
        </div>
      </Card>

      {/* Comments History */}
      {(planInfo.approvalComments || rejectionReason || planInfo.rejectionReason) && (
        <Card style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: T.text }}>
            <FiMessageSquare size={16} /> Plan History & Comments
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {planInfo.approvalComments && (
              <div style={{ paddingLeft: 16, borderLeft: `3px solid ${T.success}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FiCheckCircle size={14} color={T.success} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>Approval Comment</span>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 14, color: T.textValue }}>{planInfo.approvalComments}</p>
                {planInfo.approvedBy && <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>By: {planInfo.approvedBy} | Date: {planInfo.approvedAt && new Date(planInfo.approvedAt).toLocaleString()}</p>}
              </div>
            )}
            {(rejectionReason || planInfo.rejectionReason) && planStatus === 'REJECTED' && (
                  <div style={{ paddingLeft: 16, borderLeft: `3px solid ${T.error}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <FiX size={14} color={T.error} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>Rejection Reason</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, color: T.textValue }}>{rejectionReason || planInfo.rejectionReason}</p>
                    {planInfo.rejectedBy && <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>By: {planInfo.rejectedBy} | Date: {formatLocalDateTime(planInfo.rejectedAt)}</p>}
                  </div>
                )}

                {/* Add Change Request section if needed */}
                {planStatus === 'CHANGE_REQUESTED' && planInfo.rejectionReason && (
                  <div style={{ paddingLeft: 16, borderLeft: `3px solid ${T.warning}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <FiMessageSquare size={14} color={T.warning} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Change Request Reason</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, color: T.textValue }}>{planInfo.rejectionReason}</p>
                    {planInfo.rejectedBy && <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>By: {planInfo.rejectedBy} | Date: {formatLocalDateTime(planInfo.rejectedAt)}</p>}
                  </div>
                )}
          </div>
        </Card>
      )}

      {/* Footer */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prepared By</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.textValue }}>{planInfo.preparedBy}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved By</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.textValue }}>{planInfo.approvedBy || (planStatus === 'APPROVED' ? 'Pending' : 'Not Approved')}</p>
            {planInfo.approvedAt && <p style={{ margin: '4px 0 0', fontSize: 12, color: T.textMuted }}>{new Date(planInfo.approvedAt).toLocaleDateString()}</p>}
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.textValue }}>{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <ActionModal 
        isOpen={showApproveModal} onClose={() => { setShowApproveModal(false); setTempApprovalComment(''); }}
        title="Approve Plan" description="Please provide approval comments:"
        icon={FiCheck} iconColor={T.success} iconBg={T.successLight} iconBorder={T.successBorder}
        value={tempApprovalComment} setValue={setTempApprovalComment} placeholder="Enter approval comments..."
        onSubmit={handleApprove} submitLabel="Confirm Approve" submitColor="#FFF" submitBg={T.success} submitting={submitting}
      />
      <ActionModal 
        isOpen={showRejectModal} onClose={() => { setShowRejectModal(false); setTempRejectionReason(''); }}
        title="Reject Plan" description="Please provide a reason for rejection:"
        icon={FiX} iconColor={T.error} iconBg={T.errorLight} iconBorder={T.errorBorder}
        value={tempRejectionReason} setValue={setTempRejectionReason} placeholder="Enter rejection reason..."
        onSubmit={handleReject} submitLabel="Confirm Reject" submitColor="#FFF" submitBg={T.error} submitting={submitting}
      />
      <ActionModal 
        isOpen={showChangeRequestModal} onClose={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); }}
        title={`Request Changes - ${selectedYear}`} description="Please provide details about what changes are needed:"
        icon={FiMessageSquare} iconColor={T.warning} iconBg={T.warningLight} iconBorder={T.warningBorder}
        value={changeRequestReason} setValue={setChangeRequestReason} placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges} submitLabel="Submit Request" submitColor="#FFF" submitBg={T.warning} submitting={submitting}
      />

    </div>
  );
};

export default Form3View;