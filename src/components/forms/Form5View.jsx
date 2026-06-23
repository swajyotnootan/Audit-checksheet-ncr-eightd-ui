import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { 
  FiRefreshCw, FiCalendar, FiFileText, FiUsers, 
  FiTrendingUp, FiEye, FiPlus, FiX, FiSend, 
  FiCheck, FiSave, FiAlertCircle, FiBarChart2,
  FiChevronDown, FiChevronUp, FiInfo, FiCheckCircle,
  FiClock, FiAlertTriangle, FiUserCheck, FiUserPlus,
  FiEdit2, FiTrash2, FiGrid, FiList, FiArrowRight, 
  FiMessageSquare, FiDownload, FiArrowLeft
} from 'react-icons/fi';
import ScheduleMatrixView from './ScheduleMatrixView';
import ScheduleListView from './ScheduleListView';
import ScheduleModal from './ScheduleModal';
import DocumentControlSection from './DocumentControlSection';
import axios from 'axios';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ═════ MNC STANDARD PALETTE ═════
const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#000000',       // Pure black for headings
  textValue: '#1F2937',  // Dark gray for values
  textMuted: '#6B7280',
  accent: '#3B82F6',
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
};

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ─── Reusable UI Components ────────────────────────────────────────────── */

const Card = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', ...style }}>
    {children}
  </div>
);

const ActionButton = ({ onClick, disabled, loading, color, bgColor, borderColor, icon: Icon, children, style }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    style={{
      height: 40, padding: '0 20px', borderRadius: 8, border: `1px solid ${borderColor || 'transparent'}`,
      background: (disabled || loading) ? '#F1F5F9' : bgColor, color: (disabled || loading) ? '#94A3B8' : color,
      fontSize: 14, fontWeight: 600, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: FONT_FAMILY,
      boxShadow: (disabled || loading) ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      ...style
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
    success: { bg: T.successLight, border: T.successBorder, color: '#065F46', iconColor: '#059669' },
    info: { bg: T.accentLight, border: T.accentBorder, color: '#1E3A8A', iconColor: T.accent }
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{ padding: 16, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, fontFamily: FONT_FAMILY }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: T.card, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={s.iconColor} />
      </div>
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

// Custom Select Style Helper
const selectStyle = {
  height: 40, padding: '0 36px 0 12px', fontSize: 14, fontWeight: 500, fontFamily: FONT_FAMILY, borderRadius: 8,
  border: `1px solid ${T.border}`, background: T.card, color: T.textValue, outline: 'none', cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const Form5View = () => {
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const urlYear = searchParams.get('year');
  const location = useLocation();
  const { preselectedYear, preselectedMonth } = location.state || {};

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState(() => {
    if (urlYear) return parseInt(urlYear);
    if (preselectedYear) return preselectedYear;
    return new Date().getFullYear();
  });  
  const [selectedMonth, setSelectedMonth] = useState(preselectedMonth || "");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [auditees, setAuditees] = useState([]);
  const [planStatus, setPlanStatus] = useState({});
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [viewMode, setViewMode] = useState('matrix');
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [tempRejectionReason, setTempRejectionReason] = useState('');

  const [monthComments, setMonthComments] = useState({
    approvalComments: '', rejectionReason: '', rejectedBy: '', rejectedAt: null,
    changeRequestedBy: '', changeRequestedAt: null
  });

  const [summary, setSummary] = useState({
    totalSchedules: 0, departmentsCount: 0, weeksCovered: 0,
    completed: 0, inProgress: 0, scheduled: 0
  });
  
  const [documentInfo, setDocumentInfo] = useState({
    documentRevision: '1.0', revisionDate: new Date().toISOString().split('T')[0],
    revisionDetails: 'First Approved copy (IATF16949)', auditFrequency: 'Half yearly',
    preparedBy: '', approvedBy: '', approvedAt: null
  });
  
  const [auditObjective, setAuditObjective] = useState(`* To assess the effectiveness and efficiency of the quality management system.\n* To verify compliance with IATF16949:2016 requirement.\n* To detect a particular problem for improvement.\n* Other.`);
  const [auditScope, setAuditScope] = useState("All elements of quality system");
  
  const [formData, setFormData] = useState({
    department: '', month: '', week: '', auditElements: [],
    auditorId: '', auditeeId: '', status: 'SCHEDULED'
  });
  
  const [availableYears, setAvailableYears] = useState([]);
  const [auditTeam, setAuditTeam] = useState({
    leadAuditorId: '', leadAuditorName: '', teamAuditorIds: [], teamAuditorNames: []
  });

  // Constants
  const weeks = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  const auditElementsMap = {
    "System Audit (ISO9001)": "A", "System Audit (IATF16949)": "B",
    "5S Audit": "C", "Process Audit": "D", "Product Audit": "E"
  };

  const getWeeksForMonth = useCallback((year, month) => {
    const monthMap = { "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11, "Jan": 0, "Feb": 1, "Mar": 2 };
    const monthNum = monthMap[month];
    if (monthNum === undefined) return 4;
    const actualYear = (month === "Jan" || month === "Feb" || month === "Mar") ? year + 1 : year;
    const firstDay = new Date(actualYear, monthNum, 1).getDay();
    const daysInMonth = new Date(actualYear, monthNum + 1, 0).getDate();
    return Math.ceil((daysInMonth + firstDay) / 7);
  }, []);

  const monthWeeksCount = selectedMonth ? getWeeksForMonth(selectedYear, selectedMonth) : 4;
  const displayWeeks = weeks.slice(0, monthWeeksCount);

  // API Calls
  const fetchUsers = useCallback(async () => {
    try {
      const auditeesList = await auditScheduleApi.getAuditees();
      setAuditees(auditeesList || []);
    } catch (error) { console.error('Error fetching users:', error); }
  }, []);

  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = response.data || [];
      setAvailableMonths(months);
      const initialStatus = {};
      months.forEach(month => { initialStatus[month.month] = month.approvalStatus || 'DRAFT'; });
      setPlanStatus(prev => ({ ...prev, ...initialStatus }));
      if (!selectedMonth && months.length > 0) {
        const firstWithPlan = months.find(m => m.hasPlannedAudits);
        setSelectedMonth(firstWithPlan ? firstWithPlan.month : months[0].month);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
      addToast('Failed to load available months', 'error');
    }
  }, [selectedYear, selectedMonth, addToast]);

  const fetchAvailableDepartments = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const response = await auditScheduleApi.getAvailableDepartments(selectedYear, selectedMonth);
      setAvailableDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching available departments:', error);
      setAvailableDepartments([]);
    }
  }, [selectedYear, selectedMonth]);

  const fetchSchedules = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      setLoading(true);
      const response = await auditScheduleApi.getByYearAndMonth(selectedYear, selectedMonth);
      const allSchedules = response.data || [];
      const weekSchedules = allSchedules.filter(schedule => !schedule.scheduledDate);
      setSchedules(weekSchedules);
      
      if (weekSchedules.length > 0) {
        const firstSchedule = weekSchedules[0];
        const preparedByValue = firstSchedule.preparedBy || firstSchedule.preparedByName || firstSchedule.prepared_by_name || firstSchedule.prepared_by || 'Not available';
        if (preparedByValue && preparedByValue !== 'Not available') {
          setDocumentInfo(prev => ({ ...prev, preparedBy: preparedByValue }));
        }
        setMonthComments({
          approvalComments: firstSchedule.approvalComments || '',
          rejectionReason: firstSchedule.rejectionReason || '',
          rejectedBy: firstSchedule.rejectedByName || '',
          rejectedAt: firstSchedule.rejectedAt || null,
          changeRequestedBy: firstSchedule.changeRequestedBy || '',
          changeRequestedAt: firstSchedule.changeRequestedAt || null
        });
        if (firstSchedule.rejectionReason) setRejectionReason(firstSchedule.rejectionReason);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      addToast('Failed to load schedules', 'error');
      setSchedules([]);
    } finally { setLoading(false); }
  }, [selectedYear, selectedMonth, addToast]);

  const fetchSummary = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const response = await auditScheduleApi.getSummary(selectedYear, selectedMonth);
      setSummary(response.data || { totalSchedules: 0, departmentsCount: 0, weeksCovered: 0, completed: 0, inProgress: 0, scheduled: 0 });
    } catch (error) { console.error('Error fetching summary:', error); }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const loadData = async () => {
      if (preselectedYear) setSelectedYear(preselectedYear);
      await fetchUsers();
      await fetchAvailableMonths();
      if (preselectedMonth) setSelectedMonth(preselectedMonth);
    };
    loadData();
  }, [fetchUsers, fetchAvailableMonths, preselectedYear, preselectedMonth]);

  useEffect(() => {
    if (selectedMonth) {
      setLoading(true);
      Promise.all([fetchAvailableDepartments(), fetchSchedules(), fetchSummary()]).finally(() => setLoading(false));
    }
  }, [selectedMonth, selectedYear, fetchAvailableDepartments, fetchSchedules, fetchSummary]);

  useEffect(() => { if (!preselectedYear) fetchAvailableMonths(); }, [selectedYear]);
  useEffect(() => { if (urlYear) setSelectedYear(parseInt(urlYear)); }, [urlYear]);
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years);
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedMonth) { addToast('Please select a month first', 'warning'); return; }
    setDownloading(true);
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/${selectedYear}/${selectedMonth}/download`, { responseType: 'blob', withCredentials: true });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Form5_Internal_Quality_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`);
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      addToast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      addToast('Failed to download PDF', 'error');
    } finally { setDownloading(false); }
  };

  const handleSubmitSchedule = async (scheduleData) => {
    const currentStatus = planStatus[selectedMonth];
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED' && currentStatus !== 'CHANGE_REQUESTED') {
      addToast(`Cannot modify schedule when status is ${currentStatus}`, 'warning');
      return false;
    }
    setSaving(true);
    try {
      const saveData = {
        id: scheduleData.id, planYear: selectedYear, department: scheduleData.department,
        month: scheduleData.month, week: scheduleData.week, auditorId: parseInt(scheduleData.auditorId),
        auditeeIdList: scheduleData.auditeeIdList || [], auditeeNames: scheduleData.auditeeNames || [],
        coAuditorIdList: scheduleData.coAuditorIdList || [], coAuditorNames: scheduleData.coAuditorNames || [],
        status: scheduleData.status || 'SCHEDULED', auditElements: scheduleData.auditElements || []
      };
      if (editingSchedule && editingSchedule.id) await auditScheduleApi.update(editingSchedule.id, saveData);
      else await auditScheduleApi.create(saveData, user?.id);
      
      addToast('Schedule saved successfully!', 'success');
      await fetchSchedules(); await fetchSummary();
      setShowForm(false); setEditingSchedule(null);
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      addToast(error.response?.data?.message || 'Failed to save schedule', 'error');
      return false;
    } finally { setSaving(false); }
  };

  const handleDeleteSchedule = async (id, month) => {
    const currentStatus = planStatus[month];
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED' && currentStatus !== 'CHANGE_REQUESTED') {
      addToast(`Cannot delete schedule when status is ${currentStatus}`, 'warning'); return;
    }
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await auditScheduleApi.delete(id);
        addToast('Schedule deleted successfully!', 'success');
        await fetchSchedules(); await fetchSummary();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        addToast('Failed to delete schedule', 'error');
      }
    }
  };

  const handleSaveDocument = async () => {
    const currentStatus = planStatus[selectedMonth];
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED' && currentStatus !== 'CHANGE_REQUESTED') {
      addToast(`Only draft or rejected plans can be saved`, 'warning'); return;
    }
    setSaving(true);
    try {
      const preparedByName = user?.name || user?.username || documentInfo.preparedBy || 'Unknown User';
      const saveData = {
        planYear: selectedYear, month: selectedMonth, schedules: schedules,
        auditObjective: auditObjective, auditScope: auditScope,
        documentRevision: documentInfo.documentRevision, revisionDate: documentInfo.revisionDate,
        revisionDetails: documentInfo.revisionDetails, auditFrequency: documentInfo.auditFrequency,
        preparedBy: preparedByName, preparedByName: preparedByName, approvalStatus: 'DRAFT'
      };
      await auditScheduleApi.saveMonthDocument(saveData, user?.id);
      addToast(`${monthDisplay[selectedMonth]} schedule saved as DRAFT!`, 'success');
      await fetchSchedules(); await fetchAvailableMonths();
    } catch (error) {
      console.error('Error saving document:', error);
      addToast('Failed to save document', 'error');
    } finally { setSaving(false); }
  };

  const handleSubmitForApproval = async () => {
    if (schedules.length === 0) { addToast(`No schedules found. Please add schedules first.`, 'warning'); return; }
    setSubmitting(true);
    try {
      const preparedByName = user?.name || user?.username || documentInfo.preparedBy || 'Unknown User';
      const saveData = {
        planYear: selectedYear, month: selectedMonth, schedules: schedules,
        auditObjective: auditObjective, auditScope: auditScope,
        documentRevision: documentInfo.documentRevision, revisionDate: documentInfo.revisionDate,
        revisionDetails: documentInfo.revisionDetails, auditFrequency: documentInfo.auditFrequency,
        preparedBy: preparedByName, preparedByName: preparedByName, approvalStatus: 'PENDING_APPROVAL'
      };
      await auditScheduleApi.saveMonthDocument(saveData, user?.id);
      await auditScheduleApi.submitMonth(selectedYear, selectedMonth, user?.id);
      setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'PENDING_APPROVAL' }));
      addToast(`${monthDisplay[selectedMonth]} schedule submitted for approval!`, 'success');
      await fetchSchedules(); await fetchAvailableMonths();
    } catch (error) {
      console.error('Error submitting plan:', error);
      addToast('Failed to submit plan', 'error');
    } finally { setSubmitting(false); }
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) { addToast('Please provide approval comments', 'warning'); return; }
    setSubmitting(true);
    try {
      await auditScheduleApi.approveMonth(selectedYear, selectedMonth, user?.id, tempApprovalComment);
      setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'APPROVED' }));
      setMonthComments({ approvalComments: tempApprovalComment, rejectionReason: '', rejectedBy: '', rejectedAt: null, changeRequestedBy: '', changeRequestedAt: null });
      setShowApproveModal(false); setTempApprovalComment('');
      addToast(`${monthDisplay[selectedMonth]} schedule approved successfully!`, 'success');
      await fetchSchedules(); await fetchAvailableMonths();
    } catch (error) {
      console.error('Error approving plan:', error);
      addToast('Failed to approve schedule', 'error');
    } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectMonth(selectedYear, selectedMonth, user?.id, tempRejectionReason);
      setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'REJECTED' }));
      setRejectionReason(tempRejectionReason);
      setMonthComments({ approvalComments: '', rejectionReason: tempRejectionReason, rejectedBy: user?.name || user?.username, rejectedAt: new Date().toISOString(), changeRequestedBy: '', changeRequestedAt: null });
      setShowRejectModal(false); setTempRejectionReason('');
      addToast(`${monthDisplay[selectedMonth]} schedule rejected`, 'error');
      await fetchSchedules(); await fetchAvailableMonths();
    } catch (error) {
      console.error('Error rejecting plan:', error);
      addToast('Failed to reject schedule', 'error');
    } finally { setSubmitting(false); }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) { addToast('Please provide a reason for changes', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-schedule/${selectedYear}/${selectedMonth}/request-changes?userId=${user?.id}`, { reason: changeRequestReason }, { withCredentials: true });
      setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'CHANGE_REQUESTED' }));
      setMonthComments({ approvalComments: '', rejectionReason: changeRequestReason, rejectedBy: '', rejectedAt: null, changeRequestedBy: user?.name || user?.username, changeRequestedAt: new Date().toISOString() });
      addToast(`Change request submitted for ${monthDisplay[selectedMonth]}`, 'warning');
      setShowChangeRequestModal(false); setChangeRequestReason('');
      await fetchAvailableMonths(); await fetchSchedules();
    } catch (error) {
      console.error('Error requesting changes:', error);
      addToast(error.response?.data?.message || 'Failed to submit change request', 'error');
    } finally { setSubmitting(false); }
  };

  const isMonthEditable = (month) => {
    const status = planStatus[month] || 'DRAFT';
    return status === 'DRAFT' || status === 'REJECTED' || status === 'CHANGE_REQUESTED';
  };

  const hasSchedules = schedules.length > 0;
  const canEdit = (isAuditManager && isMonthEditable(selectedMonth));
  const canSubmit = (isAuditManager && isMonthEditable(selectedMonth) && hasSchedules);
  const canApprove = (isTopManagement && planStatus[selectedMonth] === 'PENDING_APPROVAL');

  const getPlanStatusBadge = () => {
    const status = planStatus[selectedMonth] || 'DRAFT';
    const styles = {
      'APPROVED': { bg: T.successLight, color: '#065F46', border: T.successBorder, text: 'Approved', icon: FiCheckCircle },
      'PENDING_APPROVAL': { bg: T.warningLight, color: '#92400E', border: T.warningBorder, text: 'Pending', icon: FiClock },
      'REJECTED': { bg: T.errorLight, color: '#991B1B', border: T.errorBorder, text: 'Rejected', icon: FiX },
      'CHANGE_REQUESTED': { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA', text: 'Changes Requested', icon: FiMessageSquare }
    };
    const s = styles[status] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', text: 'Draft', icon: FiFileText };
    const Icon = s.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, fontSize: 12, fontWeight: 600, color: s.color, fontFamily: FONT_FAMILY }}>
        <Icon size={14} /> {s.text}
      </span>
    );
  };

  if (loading && !selectedMonth) {
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
            {/* Back Button */}
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
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Internal Quality Audit Schedule</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>Form 5 - Week-wise Audit Planning (W-1 to W-6)</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>Status:</span>
              {getPlanStatusBadge()}
            </div>
            
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={selectStyle}>
              {availableYears.map(year => <option key={year} value={year}>{year} - {year + 1}</option>)}
            </select>
            
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{...selectStyle, minWidth: 180}}>
              {availableMonths.length === 0 ? (
                <option value="">No months available</option>
              ) : (
                availableMonths.map(month => (
                  <option key={month.month} value={month.month} disabled={!month.hasPlannedAudits}>
                    {monthDisplay[month.month]} {!month.hasPlannedAudits && '(No plan)'}
                  </option>
                ))
              )}
            </select>

            <button 
              onClick={() => { fetchAvailableMonths(); fetchSchedules(); fetchSummary(); fetchUsers(); }} 
              style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
              title="Refresh"
            >
              <FiRefreshCw size={18} />
            </button>

            <ActionButton 
              onClick={handleDownloadPDF} 
              loading={downloading} 
              disabled={!selectedMonth} 
              color="#FFF" 
              bgColor={T.accent} 
              icon={FiDownload}
            >
              PDF
            </ActionButton>

            {/* View Toggle */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 4, border: `1px solid ${T.border}` }}>
              <button 
                onClick={() => setViewMode('matrix')} 
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_FAMILY,
                  background: viewMode === 'matrix' ? T.card : 'transparent',
                  color: viewMode === 'matrix' ? T.accent : T.textMuted,
                  boxShadow: viewMode === 'matrix' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <FiGrid size={14} /> Matrix
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_FAMILY,
                  background: viewMode === 'list' ? T.card : 'transparent',
                  color: viewMode === 'list' ? T.accent : T.textMuted,
                  boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <FiList size={14} /> List
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Status Banners */}
      {selectedMonth && planStatus[selectedMonth] === 'APPROVED' && (
        <AlertBanner type="success" icon={FiCheckCircle} title="Month Approved" message="This month's schedule has been approved and is ready for execution." />
      )}
      {selectedMonth && planStatus[selectedMonth] === 'PENDING_APPROVAL' && (
        <AlertBanner type="warning" icon={FiClock} title="Pending Approval" message="Waiting for Top Management review. No changes allowed." />
      )}
      {selectedMonth && planStatus[selectedMonth] === 'APPROVED' && monthComments.approvalComments && (
        <AlertBanner type="info" icon={FiMessageSquare} title="Approval Comments" message={monthComments.approvalComments} />
      )}
      {selectedMonth && planStatus[selectedMonth] === 'CHANGE_REQUESTED' && monthComments.rejectionReason && (
        <AlertBanner type="warning" icon={FiMessageSquare} title="Change Request" message={monthComments.rejectionReason} footer={`Requested by: ${monthComments.changeRequestedBy}`} />
      )}
      {selectedMonth && planStatus[selectedMonth] === 'REJECTED' && monthComments.rejectionReason && (
        <AlertBanner type="error" icon={FiX} title="Rejection Reason" message={monthComments.rejectionReason} footer={`Rejected by: ${monthComments.rejectedBy}`} />
      )}

      
      {/* Departments Info */}
      {availableDepartments.length > 0 && (
        <Card style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: T.text }}>
            <FiUsers size={16} color={T.accent} /> 
            Departments for {monthDisplay[selectedMonth]}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {availableDepartments.map(dept => {
              const hasSchedule = schedules.some(s => s.department === dept.department);
              const scheduleCount = schedules.filter(s => s.department === dept.department).length;
              const completedCount = schedules.filter(s => s.department === dept.department && s.status === 'COMPLETED').length;
              return (
                <div key={dept.department} style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', 
                  background: hasSchedule ? T.successLight : '#F8FAFC', 
                  border: `1px solid ${hasSchedule ? T.successBorder : T.border}`, 
                  borderRadius: 20, fontSize: 13, fontWeight: 500, color: hasSchedule ? '#065F46' : T.textValue
                }}>
                  {dept.department}
                  {hasSchedule ? (
                    <FiCheckCircle size={14} color={T.success} />
                  ) : canEdit ? (
                    <FiPlus size={14} color={T.accent} style={{ cursor: 'pointer' }} onClick={() => {
                      setEditingSchedule(null);
                      setFormData({ department: dept.department, month: selectedMonth, week: '', auditElements: dept.auditElements || [], auditorId: '', auditeeId: '', status: 'SCHEDULED' });
                      setShowForm(true);
                    }} />
                  ) : (
                    <FiClock size={14} color={T.textMuted} />
                  )}
                  {scheduleCount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: completedCount === scheduleCount ? T.success : T.textMuted }}>
                      {completedCount}/{scheduleCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Table / List View */}
      <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
        {viewMode === 'matrix' ? (
          <ScheduleMatrixView
            departments={availableDepartments.map(d => d.department)}
            deptPlanData={Object.fromEntries(availableDepartments.map(d => [d.department, [{ month: selectedMonth, elements: d.auditElements }]]))}
            selectedMonth={selectedMonth}
            schedules={schedules}
            weeks={displayWeeks}
            selectedYear={selectedYear}
            canEdit={canEdit}
            onCellClick={(department, week, existingSchedule) => {
              const deptData = availableDepartments.find(d => d.department === department);
              if (existingSchedule) {
                setEditingSchedule(existingSchedule);
                setFormData({
                  department: existingSchedule.department, month: existingSchedule.month, week: existingSchedule.week,
                  auditElements: existingSchedule.auditElements || [], auditorId: existingSchedule.auditorId?.toString() || '',
                  auditeeId: existingSchedule.auditeeId?.toString() || '', status: existingSchedule.status || 'SCHEDULED'
                });
              } else {
                setEditingSchedule(null);
                setFormData({
                  department: department, month: selectedMonth, week: week,
                  auditElements: deptData?.auditElements || [], auditorId: '', auditeeId: '', status: 'SCHEDULED'
                });
              }
              setShowForm(true);
            }}
            onDeleteSchedule={handleDeleteSchedule}
            auditElementsMap={auditElementsMap}
            getStatusBadge={(status) => {
              const styles = { 
                'COMPLETED': { bg: T.successLight, color: '#065F46', border: T.successBorder }, 
                'IN_PROGRESS': { bg: T.accentLight, color: '#1E40AF', border: T.accentBorder }, 
                'CANCELLED': { bg: T.errorLight, color: '#991B1B', border: T.errorBorder } 
              };
              const s = styles[status] || { bg: T.warningLight, color: '#92400E', border: T.warningBorder };
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, fontSize: 11, fontWeight: 600, color: s.color }}>
                  {status || 'SCHEDULED'}
                </span>
              );
            }}
          />
        ) : (
          <div style={{ padding: 24 }}>
            {canEdit && availableDepartments.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <ActionButton 
                  onClick={() => {
                    setEditingSchedule(null);
                    setFormData({ department: '', month: selectedMonth, week: '', auditElements: [], auditorId: '', auditeeId: '', status: 'SCHEDULED' });
                    setShowForm(true);
                  }} 
                  color="#FFF" 
                  bgColor={T.accent} 
                  icon={FiPlus}
                >
                  Add Schedule
                </ActionButton>
              </div>
            )}
            <ScheduleListView
              schedules={schedules}
              canEdit={canEdit}
              onEdit={(schedule) => {
                setEditingSchedule(schedule);
                setFormData({
                  department: schedule.department, month: schedule.month, week: schedule.week,
                  auditElements: schedule.auditElements || [], auditorId: schedule.auditorId?.toString() || '',
                  auditeeId: schedule.auditeeId?.toString() || '', status: schedule.status || 'SCHEDULED'
                });
                setShowForm(true);
              }}
              onDelete={handleDeleteSchedule}
              auditElementsMap={auditElementsMap}
              getStatusBadge={(status) => {
                const styles = { 
                  'COMPLETED': { bg: T.successLight, color: '#065F46', border: T.successBorder }, 
                  'IN_PROGRESS': { bg: T.accentLight, color: '#1E40AF', border: T.accentBorder }, 
                  'CANCELLED': { bg: T.errorLight, color: '#991B1B', border: T.errorBorder } 
                };
                const s = styles[status] || { bg: T.warningLight, color: '#92400E', border: T.warningBorder };
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, fontSize: 11, fontWeight: 600, color: s.color }}>
                    {status || 'SCHEDULED'}
                  </span>
                );
              }}
            />
          </div>
        )}
      </Card>

      {/* Document Control Section */}
      <Card style={{ marginBottom: 24 }}>
        <DocumentControlSection
          documentInfo={documentInfo}
          setDocumentInfo={setDocumentInfo}
          planStatus={planStatus[selectedMonth]}
          selectedMonth={selectedMonth}
          monthDisplay={monthDisplay[selectedMonth]}
          canEdit={canEdit}
          canSubmit={canSubmit}
          canApprove={canApprove}
          stats={summary}
          onSaveDocument={handleSaveDocument}
          onSubmitForApproval={handleSubmitForApproval}
          onApprove={() => setShowApproveModal(true)}
          onReject={() => setShowRejectModal(true)}
          saving={saving}
          submitting={submitting}
          approvalComment=""
          setApprovalComment={() => {}}
        />
      </Card>

      {/* Request Changes Button */}
      {isTopManagement && planStatus[selectedMonth] === 'APPROVED' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <ActionButton onClick={() => setShowChangeRequestModal(true)} color="#FFF" bgColor={T.warning} icon={FiMessageSquare}>
            Request Changes
          </ActionButton>
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingSchedule(null); }}
        onSave={handleSubmitSchedule}
        formData={formData}
        setFormData={setFormData}
        departments={availableDepartments.map(d => d.department)}
        deptPlanData={Object.fromEntries(availableDepartments.map(d => [d.department, [{ month: selectedMonth, elements: d.auditElements }]]))}
        weeks={displayWeeks}
        selectedMonth={selectedMonth}
        monthDisplay={monthDisplay}
        editingSchedule={editingSchedule}
        saving={saving}
        selectedYear={selectedYear}
      />

      {/* Legend */}
      <Card style={{ padding: 24 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend & Criteria</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 13, color: T.textMuted, marginBottom: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: T.accent }}></div> P - Planned
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: T.success }}></div> C - Completed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#CBD5E1' }}></div> — - Not Planned
          </span>
        </div>
        <div style={{ padding: 16, background: '#F8FAFC', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.textMuted, lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}><strong style={{ color: T.textValue }}>Audit Criteria:</strong> ISO9001:2015 IATF16949 Standard, QMS Manual, QMS Procedures, WI, etc.</p>
          <p style={{ margin: '4px 0 0' }}><strong style={{ color: T.textValue }}>Audit Scope:</strong> Applicable process within department/function and clause No. 4, 5, 6, 7, 8, 9 & 10</p>
          <p style={{ margin: '4px 0 0' }}><strong style={{ color: T.textValue }}>Audit Method:</strong> Interview with Auditee, Observation and verification</p>
        </div>
      </Card>

      {/* Modals */}
      <ActionModal 
        isOpen={showApproveModal} onClose={() => { setShowApproveModal(false); setTempApprovalComment(''); }}
        title={`Approve ${monthDisplay[selectedMonth]} Schedule`} description="Please provide approval comments:"
        icon={FiCheck} iconColor={T.success} iconBg={T.successLight} iconBorder={T.successBorder}
        value={tempApprovalComment} setValue={setTempApprovalComment} placeholder="Enter approval comments..."
        onSubmit={handleApprove} submitLabel="Confirm Approve" submitColor="#FFF" submitBg={T.success} submitting={submitting}
      />
      <ActionModal 
        isOpen={showRejectModal} onClose={() => { setShowRejectModal(false); setTempRejectionReason(''); }}
        title={`Reject ${monthDisplay[selectedMonth]} Schedule`} description="Please provide a reason for rejection:"
        icon={FiAlertTriangle} iconColor={T.error} iconBg={T.errorLight} iconBorder={T.errorBorder}
        value={tempRejectionReason} setValue={setTempRejectionReason} placeholder="Enter rejection reason..."
        onSubmit={handleReject} submitLabel="Confirm Reject" submitColor="#FFF" submitBg={T.error} submitting={submitting}
      />
      <ActionModal 
        isOpen={showChangeRequestModal} onClose={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); }}
        title={`Request Changes - ${monthDisplay[selectedMonth]}`} description="Please provide details about what changes are needed:"
        icon={FiMessageSquare} iconColor={T.warning} iconBg={T.warningLight} iconBorder={T.warningBorder}
        value={changeRequestReason} setValue={setChangeRequestReason} placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges} submitLabel="Submit Request" submitColor="#FFF" submitBg={T.warning} submitting={submitting}
      />

    </div>
  );
};

export default Form5View;