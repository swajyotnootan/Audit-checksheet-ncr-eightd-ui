import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { 
  FiSave, FiRefreshCw, FiCheckCircle, FiClock, FiSend, 
  FiCheck, FiX, FiAlertCircle, FiFileText, FiMessageSquare, FiDownload,
  FiStar, FiCalendar, FiChevronDown, FiChevronUp, FiRepeat,
  FiCheckSquare, FiPlus, FiFilter, FiTrendingUp, FiArrowLeft // 👈 Added FiArrowLeft
} from 'react-icons/fi';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ══════ MNC STANDARD PALETTE ══════
const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#000000',       // Pure black for headings/labels
  textValue: '#1F2937',  // Dark gray for values
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

// ══════ GLOBAL CONSTANTS & HELPERS ══════
const departments = ["HR", "R&D", "Purchase", "RMS", "SQA", "PPC", "Production", "QA/QC", "FGS", "Marketing", "IMS (BE)", "Maintenance", "Management"];
const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const monthDisplay = { "Apr": "April", "May": "May", "Jun": "June", "Jul": "July", "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March" };

const getQuarter = (month) => {
  const quarters = { "Apr": "Q1", "May": "Q1", "Jun": "Q1", "Jul": "Q2", "Aug": "Q2", "Sep": "Q2", "Oct": "Q3", "Nov": "Q3", "Dec": "Q3", "Jan": "Q4", "Feb": "Q4", "Mar": "Q4" };
  return quarters[month];
};

const getAuditElementsForMonth = (month) => {
  const elementMapping = {
    "Apr": ["5S Audit", "System Audit (ISO9001)"], "May": ["System Audit (IATF16949)", "Process Audit"],
    "Jun": ["System Audit (IATF16949)", "5S Audit", "Product Audit"], "Jul": ["5S Audit", "System Audit (IATF16949)"],
    "Aug": ["Process Audit", "Product Audit"], "Sep": ["System Audit (ISO9001)", "5S Audit"],
    "Oct": ["System Audit (IATF16949)", "Process Audit"], "Nov": ["Product Audit", "System Audit (ISO9001)"],
    "Dec": ["5S Audit", "System Audit (IATF16949)"], "Jan": ["Process Audit", "Product Audit"],
    "Feb": ["System Audit (ISO9001)", "5S Audit"], "Mar": ["System Audit (IATF16949)", "Process Audit", "Product Audit"]
  };
  return elementMapping[month] || [];
};

const isRelevantForDemo = (auditElement) => auditElement.includes("IATF16949") || auditElement.includes("5S Audit");

/* ─── Reusable UI Components ────────────────────────────────────────────── */

const Card = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', ...style }}>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, subValue, color, bg, border }) => (
  <Card style={{ padding: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT_FAMILY }}>{label}</span>
    </div>
    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: T.text, fontFamily: FONT_FAMILY }}>{value}</p>
    {subValue && <p style={{ margin: '4px 0 0', fontSize: 12, color: color, fontWeight: 500 }}>{subValue}</p>}
  </Card>
);

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

const ElementSelectionModal = ({ isOpen, onClose, month, availableElements, selectedElements, onSave }) => {
  const [tempSelected, setTempSelected] = useState([...selectedElements]);
  
  useEffect(() => { setTempSelected([...selectedElements]); }, [selectedElements, isOpen]);
  if (!isOpen) return null;

  const availableNotSelected = availableElements.filter(el => !tempSelected.includes(el));

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.purpleLight, border: `1px solid ${T.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiCheckSquare size={22} color={T.purple} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Select Audit Elements</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>For {monthDisplay[month]}</p>
          </div>
        </div>
        <div style={{ padding: '24px 32px', maxHeight: '60vh', overflowY: 'auto' }}>
          {tempSelected.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Selected Elements ({tempSelected.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tempSelected.map(el => (
                  <span key={el} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: T.successLight, border: `1px solid ${T.successBorder}`, borderRadius: 16, fontSize: 12, fontWeight: 500, color: '#065F46' }}>
                    {el}
                    <button onClick={() => setTempSelected(tempSelected.filter(e => e !== el))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#065F46' }}>
                      <FiX size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {availableNotSelected.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Add More Elements
              </label>
              <select
                onChange={(e) => { if (e.target.value) { setTempSelected([...tempSelected, e.target.value]); e.target.value = ''; } }}
                style={{
                  width: '100%', height: 40, padding: '0 36px 0 12px', fontSize: 14, fontFamily: FONT_FAMILY, borderRadius: 8,
                  border: `1px solid ${T.border}`, background: T.card, color: T.textValue, outline: 'none', cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'
                }}
                value=""
              >
                <option value="">-- Select an audit element --</option>
                {availableNotSelected.map(el => <option key={el} value={el}>{el}</option>)}
              </select>
            </div>
          )}
          {availableElements.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: T.textMuted }}>
              <FiAlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No audit elements planned for this month in Form 3</p>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <ActionButton onClick={onClose} color={T.textValue} bgColor={T.card} borderColor={T.border}>Cancel</ActionButton>
          <ActionButton onClick={() => { onSave(tempSelected); onClose(); }} color="#FFF" bgColor={T.purple} icon={FiCheckSquare}>Save Elements</ActionButton>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
const Form4View = () => {
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [planData, setPlanData] = useState([]);
  const [planStatus, setPlanStatus] = useState('DRAFT');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState('');
  const [tempRejectionReason, setTempRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState(''); 
  const [auditFrequency, setAuditFrequency] = useState('Half yearly');
  const [documentRevision, setDocumentRevision] = useState('1.0');
  const [revisionDate, setRevisionDate] = useState(new Date().toISOString().split('T')[0]);
  const [revisionDetails, setRevisionDetails] = useState('First Approved copy (IATF16949)');
  const [auditElementsFromForm3, setAuditElementsFromForm3] = useState({});
  const [expandedDept, setExpandedDept] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // ─── NEW STATE FOR FORM 3 DROPDOWN ───
  const [showForm3Details, setShowForm3Details] = useState(true); 
  
  const [selectedMonthForElements, setSelectedMonthForElements] = useState(null);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [searchParams] = useSearchParams();
  const urlYear = searchParams.get('year');
  
  const [selectedYear, setSelectedYear] = useState(urlYear ? parseInt(urlYear) : new Date().getFullYear());

  useEffect(() => { if (urlYear) setSelectedYear(parseInt(urlYear)); }, [urlYear]);

  const [planInfo, setPlanInfo] = useState({
    preparedBy: '', approvedBy: '', approvedAt: null,
    preparedByPosition: 'Audit Manager', approvedByPosition: 'Top Management',
    approvalComments: '', rejectedBy: '', rejectedAt: null, rejectionReason: ''
  });

  // ─── ALL ORIGINAL HANDLERS RESTORED ──────────────────────────────────────

  const handleQuickPlanned = async () => {
    if (!canEdit) { addToast('You cannot modify this plan in its current status', 'warning'); return; }
    setDemoLoading(true);
    try {
      const newPlanData = [...planData];
      const form3PlannedElements = auditElementsFromForm3;
      let totalPlannedCount = 0, totalElementsAdded = 0;
      const monthsProcessed = new Set();
      const firstQuarterMonths = ["Apr", "May", "Jun"];
      
      newPlanData.forEach((dept) => {
        dept.months.forEach((month) => {
          if (firstQuarterMonths.includes(month.month)) {
            const form3ElementsForMonth = form3PlannedElements[month.month] || [];
            const relevantElements = form3ElementsForMonth.filter(el => isRelevantForDemo(el));
            if (relevantElements.length > 0) {
              monthsProcessed.add(month.month);
              if (month.status !== 'PLANNED') { month.status = 'PLANNED'; totalPlannedCount++; }
              const currentElements = month.selectedElements || [];
              const newElements = relevantElements.filter(el => !currentElements.includes(el));
              if (newElements.length > 0) { month.selectedElements = [...currentElements, ...newElements]; totalElementsAdded += newElements.length; }
            }
          }
        });
      });
      setPlanData(newPlanData);
      await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: newPlanData, approvalStatus: 'DRAFT', auditFrequency, documentRevision, revisionDate, revisionDetails, preparedBy: planInfo.preparedBy }, { withCredentials: true });
      addToast(`✅ Quick plan: Updated ${totalPlannedCount} Q1 months with ${totalElementsAdded} elements`, 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to sync with Form3 data', 'error'); } finally { setDemoLoading(false); }
  };

  const handlePlanCurrentQuarter = async () => {
    if (!canEdit) { addToast('You cannot modify this plan', 'warning'); return; }
    setDemoLoading(true);
    try {
      const newPlanData = [...planData];
      const currentMonth = new Date().toLocaleString('default', { month: 'short' });
      let currentQuarterMonths = [];
      if (["Apr", "May", "Jun"].includes(currentMonth)) currentQuarterMonths = ["Apr", "May", "Jun"];
      else if (["Jul", "Aug", "Sep"].includes(currentMonth)) currentQuarterMonths = ["Jul", "Aug", "Sep"];
      else if (["Oct", "Nov", "Dec"].includes(currentMonth)) currentQuarterMonths = ["Oct", "Nov", "Dec"];
      else currentQuarterMonths = ["Jan", "Feb", "Mar"];
      
      const form3PlannedElements = auditElementsFromForm3;
      let totalPlannedCount = 0, totalElementsAdded = 0;
      const monthsProcessed = new Set();
      
      newPlanData.forEach((dept) => {
        dept.months.forEach((month) => {
          if (currentQuarterMonths.includes(month.month)) {
            const form3ElementsForMonth = form3PlannedElements[month.month] || [];
            const relevantElements = form3ElementsForMonth.filter(el => isRelevantForDemo(el));
            if (relevantElements.length > 0) {
              monthsProcessed.add(month.month);
              if (month.status !== 'PLANNED') { month.status = 'PLANNED'; totalPlannedCount++; }
              const currentElements = month.selectedElements || [];
              const newElements = relevantElements.filter(el => !currentElements.includes(el));
              if (newElements.length > 0) { month.selectedElements = [...currentElements, ...newElements]; totalElementsAdded += newElements.length; }
            }
          }
        });
      });
      setPlanData(newPlanData);
      await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: newPlanData, approvalStatus: 'DRAFT', auditFrequency, documentRevision, revisionDate, revisionDetails, preparedBy: planInfo.preparedBy }, { withCredentials: true });
      addToast(`✅ Current quarter sync: Updated ${totalPlannedCount} months`, 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to sync', 'error'); } finally { setDemoLoading(false); }
  };

  const handleDemoPlanned = async () => {
    if (!canEdit) { addToast('You cannot modify this plan', 'warning'); return; }
    setDemoLoading(true);
    try {
      const newPlanData = [...planData];
      const form3PlannedElements = auditElementsFromForm3;
      let totalPlannedCount = 0, totalElementsAdded = 0;
      const monthsProcessed = new Set();
      
      newPlanData.forEach((dept) => {
        dept.months.forEach((month) => {
          const form3ElementsForMonth = form3PlannedElements[month.month] || [];
          const relevantElements = form3ElementsForMonth.filter(el => isRelevantForDemo(el));
          if (relevantElements.length > 0) {
            monthsProcessed.add(month.month);
            if (month.status !== 'PLANNED') { month.status = 'PLANNED'; totalPlannedCount++; }
            const currentElements = month.selectedElements || [];
            const newElements = relevantElements.filter(el => !currentElements.includes(el));
            if (newElements.length > 0) { month.selectedElements = [...currentElements, ...newElements]; totalElementsAdded += newElements.length; }
          }
        });
      });
      setPlanData(newPlanData);
      await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: newPlanData, approvalStatus: 'DRAFT', auditFrequency, documentRevision, revisionDate, revisionDetails, preparedBy: planInfo.preparedBy }, { withCredentials: true });
      addToast(`✅ Synced ${totalPlannedCount} months with ${totalElementsAdded} elements from Form3`, 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to sync with Form3 data', 'error'); } finally { setDemoLoading(false); }
  };

  const fetchForm3Data = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}`, { withCredentials: true });
      const elementsByMonth = {};
      months.forEach(month => { elementsByMonth[month] = []; });
      if (response.data?.planItems) {
        response.data.planItems.forEach(element => {
          if (element?.months) {
            element.months.forEach(monthData => {
              if (monthData?.status === 'PLANNED' && monthData?.month) {
                if (!elementsByMonth[monthData.month].includes(element.auditElement)) {
                  elementsByMonth[monthData.month].push(element.auditElement);
                }
              }
            });
          }
        });
      }
      setAuditElementsFromForm3(elementsByMonth);
    } catch (error) {
      const emptyElements = {};
      months.forEach(month => { emptyElements[month] = []; });
      setAuditElementsFromForm3(emptyElements);
    }
  };

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/department-plan/${selectedYear}`, { withCredentials: true });
      if (response.data?.planItems?.length > 0) {
        setPlanData(response.data.planItems);
        setPlanStatus(response.data.approvalStatus || 'DRAFT');
        setPlanInfo({
          preparedBy: response.data.preparedBy || user?.name || user?.username,
          approvedBy: response.data.approvedBy || '', approvedAt: response.data.approvedAt || null,
          preparedByPosition: 'Audit Manager', approvedByPosition: 'Top Management',
          approvalComments: response.data.approvalComments || '', rejectedBy: response.data.rejectedBy || '',
          rejectedAt: response.data.rejectedAt || null, rejectionReason: response.data.rejectionReason || ''
        });
        setRejectionReason(response.data.rejectionReason || '');
        setAuditFrequency(response.data.auditFrequency || 'Half yearly');
        setDocumentRevision(response.data.documentRevision || '1.0');
        setRevisionDate(response.data.revisionDate || new Date().toISOString().split('T')[0]);
        setRevisionDetails(response.data.revisionDetails || 'First Approved copy (IATF16949)');
      } else {
        const emptyPlanData = departments.map(dept => ({ department: dept, months: months.map(month => ({ month, status: '', selectedElements: [] })) }));
        setPlanData(emptyPlanData);
        setPlanStatus('DRAFT');
        setPlanInfo({ preparedBy: user?.name || user?.username, approvedBy: '', approvedAt: null, preparedByPosition: 'Audit Manager', approvedByPosition: 'Top Management', approvalComments: '', rejectedBy: '', rejectedAt: null, rejectionReason: '' });
      }
    } catch (error) {
      addToast('Failed to load department plan data', 'error');
      const emptyPlanData = departments.map(dept => ({ department: dept, months: months.map(month => ({ month, status: '', selectedElements: [] })) }));
      setPlanData(emptyPlanData);
    } finally { setLoading(false); }
  };

  useEffect(() => { const currentYear = new Date().getFullYear(); const years = []; for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i); setAvailableYears(years); }, []);
  useEffect(() => { const loadData = async () => { await fetchForm3Data(); await fetchPlanData(); }; loadData(); }, [selectedYear]);

  const handleElementToggle = (deptIndex, month, element) => {
    if (!canEdit) { addToast('Only draft or rejected plans can be modified', 'warning'); return; }
    const newPlanData = [...planData];
    const monthIndex = newPlanData[deptIndex].months.findIndex(m => m.month === month);
    if (monthIndex !== -1) {
      const currentSelected = newPlanData[deptIndex].months[monthIndex].selectedElements || [];
      if (currentSelected.includes(element)) {
        newPlanData[deptIndex].months[monthIndex].selectedElements = currentSelected.filter(e => e !== element);
      } else {
        newPlanData[deptIndex].months[monthIndex].selectedElements = [...currentSelected, element];
      }
      if (newPlanData[deptIndex].months[monthIndex].selectedElements.length > 0 && newPlanData[deptIndex].months[monthIndex].status === '') {
        newPlanData[deptIndex].months[monthIndex].status = 'PLANNED';
      } else if (newPlanData[deptIndex].months[monthIndex].selectedElements.length === 0) {
        newPlanData[deptIndex].months[monthIndex].status = '';
      }
      setPlanData(newPlanData);
    }
  };

  const handleAddElementsToMonth = (deptIndex, month, selectedElements) => {
    if (!canEdit) { addToast('Only draft or rejected plans can be modified', 'warning'); return; }
    const newPlanData = [...planData];
    const monthIndex = newPlanData[deptIndex].months.findIndex(m => m.month === month);
    if (monthIndex !== -1) {
      const updatedSelected = [...new Set([...(newPlanData[deptIndex].months[monthIndex].selectedElements || []), ...selectedElements])];
      newPlanData[deptIndex].months[monthIndex].selectedElements = updatedSelected;
      if (updatedSelected.length > 0 && newPlanData[deptIndex].months[monthIndex].status === '') newPlanData[deptIndex].months[monthIndex].status = 'PLANNED';
      setPlanData(newPlanData);
      setSelectedMonthForElements(null);
      addToast(`Added ${selectedElements.length} element(s) to ${monthDisplay[month]}`, 'success');
    }
  };

  const handleMonthStatusChange = (deptIndex, month) => {
    if (!canEdit) { addToast('Only draft or rejected plans can be modified', 'warning'); return; }
    const newPlanData = [...planData];
    const monthIndex = newPlanData[deptIndex].months.findIndex(m => m.month === month);
    if (monthIndex !== -1) {
      const currentStatus = newPlanData[deptIndex].months[monthIndex].status || '';
      const hasElements = newPlanData[deptIndex].months[monthIndex].selectedElements?.length > 0;
      if (!hasElements && currentStatus === '') { addToast('Please select audit elements first', 'warning'); return; }
      let newStatus = currentStatus === '' ? 'PLANNED' : currentStatus === 'PLANNED' ? 'COMPLETED' : currentStatus === 'COMPLETED' ? 'RESCHEDULED' : '';
      newPlanData[deptIndex].months[monthIndex].status = newStatus;
      setPlanData(newPlanData);
    }
  };

  const handleSave = async () => {
    if (!canEdit) { addToast('Only draft, rejected, or change requested plans can be saved', 'warning'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: planData, approvalStatus: 'DRAFT', auditFrequency, documentRevision, revisionDate, revisionDetails, preparedBy: planInfo.preparedBy }, { withCredentials: true });
      addToast('Department audit plan saved as DRAFT!', 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to save plan', 'error'); } finally { setSaving(false); }
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = false;
    planData.forEach(dept => dept.months.forEach(month => { if (month.status === 'PLANNED') hasPlanned = true; }));
    if (!hasPlanned) { addToast('Please mark at least one department-month as PLANNED', 'warning'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, { planYear: selectedYear, planItems: planData, approvalStatus: 'PENDING_APPROVAL', auditFrequency, documentRevision, revisionDate, revisionDetails, preparedBy: planInfo.preparedBy }, { withCredentials: true });
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/submit?userId=${user?.id}`, {}, { withCredentials: true });
      addToast('Plan submitted for approval successfully!', 'success');
      await fetchPlanData();
    } catch (error) { addToast('Failed to submit plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) { addToast('Please provide approval comments', 'warning'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/approve?userId=${user?.id}`, { comments: tempApprovalComment }, { withCredentials: true });
      setPlanStatus('APPROVED');
      setPlanInfo(prev => ({ ...prev, approvalComments: tempApprovalComment, approvedBy: user?.name || user?.username, approvedAt: new Date().toISOString() }));
      setShowApproveModal(false); setTempApprovalComment('');
      addToast('Plan approved successfully!', 'success');
      fetchPlanData();
    } catch (error) { addToast('Failed to approve plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/reject?userId=${user?.id}`, { reason: tempRejectionReason }, { withCredentials: true });
      setPlanStatus('REJECTED'); setRejectionReason(tempRejectionReason);
      setPlanInfo(prev => ({ ...prev, rejectionReason: tempRejectionReason, rejectedBy: user?.name || user?.username, rejectedAt: new Date().toISOString() }));
      setShowRejectModal(false); setTempRejectionReason('');
      addToast('Plan rejected', 'error');
      fetchPlanData();
    } catch (error) { addToast('Failed to reject plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) { addToast('Please provide a reason', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/request-changes?userId=${user?.id}`, { reason: changeRequestReason }, { withCredentials: true });
      addToast(`Change request submitted for ${selectedYear}`, 'warning');
      setShowChangeRequestModal(false); setChangeRequestReason('');
      await fetchPlanData();
    } catch (error) { addToast(error.response?.data?.message || 'Failed to submit change request', 'error'); } finally { setSubmitting(false); }
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/department-plan/${selectedYear}/download`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Form4_Internal_Quality_Audit_Plan_${selectedYear}.pdf`);
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      addToast('PDF downloaded successfully!', 'success');
    } catch (error) { addToast('Failed to download PDF', 'error'); } finally { setLoading(false); }
  };

  const getMonthStatusBadge = (status, hasElements) => {
    const baseStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700, transition: 'all 0.2s' };
    if (status === 'COMPLETED') return <div style={{ ...baseStyle, background: T.successLight, color: T.success, border: `1px solid ${T.successBorder}` }}><FiCheck size={14} /></div>;
    if (status === 'PLANNED') return <div style={{ ...baseStyle, background: T.accentLight, color: T.accent, border: `1px solid ${T.accentBorder}` }}><FiClock size={14} /></div>;
    if (status === 'RESCHEDULED') return <div style={{ ...baseStyle, background: T.warningLight, color: T.warning, border: `1px solid ${T.warningBorder}` }}><FiRepeat size={14} /></div>;
    return <div style={{ ...baseStyle, background: '#F1F5F9', color: '#94A3B8', border: hasElements ? `1px dashed ${T.warning}` : '1px solid #E2E8F0' }}>—</div>;
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

  const getAvailableElementsForMonth = (month) => auditElementsFromForm3[month] || getAuditElementsForMonth(month);

  // ─── STATISTICS CALCULATIONS ─────────────────────────────────────────────
  let totalPlanned = 0, totalCompleted = 0, totalRescheduled = 0, totalDepartmentsWithPlan = 0;
  if (planData && planData.length > 0) {
    planData.forEach(dept => {
      let deptHasPlan = false;
      if (dept?.months) {
        dept.months.forEach(month => {
          if (month.status === 'PLANNED') { totalPlanned++; deptHasPlan = true; }
          if (month.status === 'COMPLETED') { totalCompleted++; deptHasPlan = true; }
          if (month.status === 'RESCHEDULED') { totalRescheduled++; deptHasPlan = true; }
        });
      }
      if (deptHasPlan) totalDepartmentsWithPlan++;
    });
  }
  const totalAudits = departments.length * 12;
  const completionRate = totalAudits > 0 ? ((totalCompleted / totalAudits) * 100).toFixed(1) : 0;

  const canEdit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED'));
  const canSubmit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED') && totalPlanned > 0);
  const canApprove = (isTopManagement && planStatus === 'PENDING_APPROVAL');

  const filteredDepartments = planData.filter(dept => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'planned') return dept.months.some(m => m.status === 'PLANNED');
    if (filterStatus === 'completed') return dept.months.some(m => m.status === 'COMPLETED');
    if (filterStatus === 'rescheduled') return dept.months.some(m => m.status === 'RESCHEDULED');
    if (filterStatus === 'pending') return dept.months.some(m => m.status === '');
    return true;
  });

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
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Annual Internal Quality Audit Plan</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>Form 4 - Department-wise Audit Planning (Financial Year)</p>
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
            <button onClick={() => { fetchForm3Data(); fetchPlanData(); }} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Refresh"><FiRefreshCw size={18} /></button>
            <button onClick={handleDownloadPDF} disabled={loading} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Download PDF"><FiDownload size={18} /></button>
          </div>
        </div>
      </Card>

      {/* Demo Banner */}
      {canEdit && (
        <Card style={{ padding: 20, marginBottom: 24, background: 'linear-gradient(to right, #F5F3FF, #FDF2F8)', border: `1px solid ${T.purpleBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF', border: `1px solid ${T.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiStar size={20} color={T.purple} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#4C1D95' }}>Sync with Form3 Demo Data</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6D28D9' }}>Auto-populate departments based on Form3 selections (IATF16949 & 5S only)</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <ActionButton onClick={handlePlanCurrentQuarter} loading={demoLoading} color="#FFF" bgColor={T.success} icon={FiCalendar}>Sync Current Quarter</ActionButton>
              <ActionButton onClick={handleQuickPlanned} loading={demoLoading} color="#FFF" bgColor={T.accent} icon={FiClock}>Sync Q1 Only</ActionButton>
              <ActionButton onClick={handleDemoPlanned} loading={demoLoading} color="#FFF" bgColor={T.purple} icon={FiStar}>Sync All Months</ActionButton>
            </div>
          </div>
        </Card>
      )}

      {/* Alerts */}
      {planStatus === 'APPROVED' && planInfo.approvalComments && <AlertBanner type="success" icon={FiCheckCircle} title="Approval Comments" message={planInfo.approvalComments} footer={`Approved by: ${planInfo.approvedBy} | Date: ${planInfo.approvedAt && new Date(planInfo.approvedAt).toLocaleString()}`} />}
      {planStatus === 'CHANGE_REQUESTED' && planInfo.rejectionReason && <AlertBanner type="warning" icon={FiMessageSquare} title="Change Request Comments" message={planInfo.rejectionReason} footer={`Requested by: ${planInfo.rejectedBy} | Date: ${planInfo.rejectedAt && new Date(planInfo.rejectedAt).toLocaleString()}`} />}
      {planStatus === 'REJECTED' && planInfo.rejectionReason && <AlertBanner type="error" icon={FiX} title="Rejection Reason" message={planInfo.rejectionReason} footer={`Rejected by: ${planInfo.rejectedBy} | Date: ${planInfo.rejectedAt && new Date(planInfo.rejectedAt).toLocaleString()}`} />}

      {/* Statistics Cards
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon={FiFileText} label="Departments" value={departments.length} subValue={`${totalDepartmentsWithPlan} active`} color={T.textValue} bg="#F1F5F9" border={T.border} />
        <StatCard icon={FiClock} label="Planned (P)" value={totalPlanned} color={T.accent} bg={T.accentLight} border={T.accentBorder} />
        <StatCard icon={FiCheckCircle} label="Completed (C)" value={totalCompleted} color={T.success} bg={T.successLight} border={T.successBorder} />
        <StatCard icon={FiRepeat} label="Rescheduled (R)" value={totalRescheduled} color={T.warning} bg={T.warningLight} border={T.warningBorder} />
        <StatCard icon={FiAlertCircle} label="Pending" value={totalPlanned + totalRescheduled - totalCompleted} color="#D97706" bg="#FFFBEB" border="#FDE68A" />
        <StatCard icon={FiTrendingUp} label="Completion Rate" value={`${completionRate}%`} color={T.purple} bg={T.purpleLight} border={T.purpleBorder} />
      </div> */}

      {/* Form 3 Summary Card (COLLAPSIBLE) */}
      <Card style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        <div 
          onClick={() => setShowForm3Details(!showForm3Details)}
          style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            cursor: 'pointer', padding: '20px 24px',
            background: showForm3Details ? '#F8FAFC' : '#FFFFFF',
            borderBottom: showForm3Details ? `1px solid ${T.border}` : 'none',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { if(!showForm3Details) e.currentTarget.style.background = '#F8FAFC'; }}
          onMouseLeave={e => { if(!showForm3Details) e.currentTarget.style.background = '#FFFFFF'; }}
        >
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 700, color: T.text }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiFileText size={16} color={T.accent} />
            </div>
            Form 3 - Planned Audit Types for {selectedYear}
            <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, background: '#FFFFFF', border: `1px solid ${T.border}`, padding: '2px 8px', borderRadius: 12, marginLeft: 4 }}>
              {months.reduce((acc, m) => acc + (getAvailableElementsForMonth(m).length > 0 ? 1 : 0), 0)} Active Months
            </span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {showForm3Details ? 'Collapse' : 'Expand'}
            </span>
            <div style={{ 
              width: 28, height: 28, borderRadius: '50%', 
              background: showForm3Details ? T.accent : '#F1F5F9', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              transition: 'all 0.3s ease',
              boxShadow: showForm3Details ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
            }}>
              {showForm3Details ? <FiChevronUp size={16} color="#FFF" /> : <FiChevronDown size={16} color={T.textMuted} />}
            </div>
          </div>
        </div>
        
        {showForm3Details && (
          <div style={{ padding: 24, background: '#FFFFFF' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {months.map(month => {
                const elements = getAvailableElementsForMonth(month);
                return (
                  <div key={month} style={{ 
                    padding: 16, background: '#F8FAFC', border: `1px solid ${T.border}`, borderRadius: 10, 
                    transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accentBorder; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textValue, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{monthDisplay[month]}</span>
                      <span style={{ 
                        fontSize: 10, color: T.accent, fontWeight: 700, background: T.accentLight, 
                        border: `1px solid ${T.accentBorder}`, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' 
                      }}>
                        {getQuarter(month)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {elements.length > 0 ? elements.map(el => (
                        <span key={el} style={{ 
                          padding: '4px 10px', background: T.successLight, border: `1px solid ${T.successBorder}`, 
                          borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#065F46' 
                        }}>
                          {el.split('(')[0].trim()}
                        </span>
                      )) : (
                        <span style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' }}>No audits planned</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Filter Bar */}
      <Card style={{ padding: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FiFilter size={16} color={T.textMuted} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.textValue }}>Filter by status:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'all', label: 'All', color: T.purple },
              { id: 'planned', label: 'Planned (P)', color: T.accent },
              { id: 'completed', label: 'Completed (C)', color: T.success },
              { id: 'rescheduled', label: 'Rescheduled (R)', color: T.warning },
              { id: 'pending', label: 'Pending', color: '#D97706' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  border: `1px solid ${filterStatus === f.id ? f.color : T.border}`,
                  background: filterStatus === f.id ? f.color : T.card,
                  color: filterStatus === f.id ? '#FFF' : T.textValue,
                  fontFamily: FONT_FAMILY
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 12, color: T.textMuted }}>Showing {filteredDepartments.length} of {departments.length} departments</span>
      </Card>

      {/* Main Table */}
      <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', fontFamily: FONT_FAMILY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${T.border}` }}>
                <th rowSpan={2} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: `1px solid ${T.border}`, position: 'sticky', left: 0, background: '#F8FAFC', zIndex: 2, minWidth: 200 }}>Audit Area</th>
                <th colSpan={12} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Months (Financial Year)</th>
              </tr>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {months.map(month => (
                  <th key={month} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', borderRight: `1px solid ${T.border}`, minWidth: 80 }}>
                    {monthDisplay[month]}
                    <span style={{ display: 'block', fontSize: 10, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{getQuarter(month)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept, idx) => {
                  const originalIndex = planData.findIndex(d => d.department === dept.department);
                  const hasAnySelected = dept.months?.some(m => m.selectedElements && m.selectedElements.length > 0);
                  const isExpanded = expandedDept === originalIndex;
                  
                  return (
                    <React.Fragment key={dept.department}>
                      <tr style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: T.textValue, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => setExpandedDept(isExpanded ? null : originalIndex)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 0, display: 'flex' }}
                            >
                              {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                            </button>
                            <span>{dept.department}</span>
                            {hasAnySelected && (
                              <span style={{ padding: '2px 6px', background: T.successLight, border: `1px solid ${T.successBorder}`, borderRadius: 10, fontSize: 10, fontWeight: 600, color: '#065F46' }}>✓</span>
                            )}
                          </div>
                        </td>
                        {dept.months && dept.months.map((month, monthIdx) => {
                          const selectedElementsCount = month.selectedElements?.length || 0;
                          const availableElements = getAvailableElementsForMonth(month.month);
                          const hasElements = selectedElementsCount > 0;
                          
                          return (
                            <td key={monthIdx} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                {canEdit ? (
                                  <button
                                    onClick={() => handleMonthStatusChange(originalIndex, month.month)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                  >
                                    {getMonthStatusBadge(month.status, hasElements)}
                                  </button>
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>{getMonthStatusBadge(month.status, hasElements)}</div>
                                )}
                                
                                <div style={{ textAlign: 'center' }}>
                                  {hasElements ? (
                                    <button
                                      onClick={() => canEdit && setSelectedMonthForElements({ deptIndex: originalIndex, month: month.month })}
                                      style={{ background: 'none', border: 'none', cursor: canEdit ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.purple, fontFamily: FONT_FAMILY, margin: '0 auto' }}
                                      disabled={!canEdit}
                                    >
                                      <FiCheckSquare size={12} />
                                      {selectedElementsCount} elem.
                                    </button>
                                  ) : (
                                    canEdit && availableElements.length > 0 && (
                                      <button
                                        onClick={() => setSelectedMonthForElements({ deptIndex: originalIndex, month: month.month })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.textMuted, fontFamily: FONT_FAMILY, margin: '0 auto' }}
                                      >
                                        <FiPlus size={12} /> Add
                                      </button>
                                    )
                                  )}
                                  {!hasElements && availableElements.length === 0 && (
                                    <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan={13} style={{ padding: 16, background: '#F8FAFC', borderBottom: `1px solid ${T.border}` }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                              {dept.months.map((month, monthIdx) => {
                                const selectedElements = month.selectedElements || [];
                                if (selectedElements.length === 0) return null;
                                return (
                                  <div key={monthIdx} style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.textValue, marginBottom: 8 }}>
                                      {monthDisplay[month.month]} <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>({getQuarter(month.month)})</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {selectedElements.map(el => (
                                        <span key={el} style={{ padding: '2px 8px', background: T.purpleLight, border: `1px solid ${T.purpleBorder}`, borderRadius: 12, fontSize: 11, fontWeight: 500, color: '#5B21B6' }}>
                                          {el}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>
                    <FiFileText size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ fontSize: 14 }}>No departments match the selected filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend & Document Control */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</h4>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: T.textValue }}>Audit Elements:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: T.textMuted }}>
                <span>A - System (ISO)</span> <span>B - System (IATF)</span> <span>C - 5S</span> <span>D - Process</span> <span>E - Product</span>
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: T.textValue }}>Status Codes:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: T.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiClock size={10} color={T.accent} /></div> P - Planned</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: T.successLight, border: `1px solid ${T.successBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiCheck size={10} color={T.success} /></div> C - Completed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: T.warningLight, border: `1px solid ${T.warningBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiRepeat size={10} color={T.warning} /></div> R - Rescheduled</span>
              </div>
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Control</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 13 }}>
              <span style={{ color: T.textMuted }}>Document Title:</span> <span style={{ color: T.textValue, fontWeight: 500 }}>Internal Quality Audit Schedule</span>
              <span style={{ color: T.textMuted }}>Document No.:</span> <span style={{ color: T.textValue, fontWeight: 500 }}>IQA/F/04</span>
              <span style={{ color: T.textMuted }}>Revision:</span> <span style={{ color: T.textValue, fontWeight: 500 }}>{documentRevision}</span>
              <span style={{ color: T.textMuted }}>Revision Date:</span> <span style={{ color: T.textValue, fontWeight: 500 }}>{revisionDate}</span>
              <span style={{ color: T.textMuted }}>Frequency:</span>
              <select
                value={auditFrequency}
                onChange={(e) => setAuditFrequency(e.target.value)}
                disabled={!canEdit}
                style={{
                  height: 32, padding: '0 28px 0 10px', fontSize: 13, fontFamily: FONT_FAMILY, borderRadius: 6,
                  border: `1px solid ${T.border}`, background: T.card, color: T.textValue, outline: 'none', cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'
                }}
              >
                <option value="Half yearly">Half yearly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24, padding: 16, background: '#F8FAFC', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.textMuted, lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}><strong style={{ color: T.textValue }}>Audit Criteria:</strong> ISO9001:2015, IATF16949 Standard, QMS Manual, Procedures, WI, etc.</p>
          <p style={{ margin: '4px 0 0' }}><strong style={{ color: T.textValue }}>Audit Scope:</strong> Applicable process within department/function and clause No. 4, 5, 6, 7, 8, 9 & 10.</p>
          <p style={{ margin: '4px 0 0' }}><strong style={{ color: T.textValue }}>Audit Method:</strong> Interview with Auditee, Observation and verification to check compliance.</p>
        </div>
      </Card>

      {/* Action Buttons */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontSize: 13, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
            {canSubmit ? <FiCheckCircle color={T.success} size={16} /> : <FiAlertCircle color={T.textMuted} size={16} />}
            {canSubmit ? 'Ready to submit' : 'Complete planning to submit'}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {canEdit && <ActionButton onClick={handleSave} loading={saving} color={T.textValue} bgColor={T.card} borderColor={T.border} icon={FiSave}>Save Draft</ActionButton>}
            {canSubmit && <ActionButton onClick={handleSubmitForApproval} loading={submitting} color="#FFF" bgColor={T.accent} icon={FiSend}>{planStatus === 'REJECTED' ? 'Resubmit' : 'Submit for Approval'}</ActionButton>}
            {canApprove && (
              <>
                <ActionButton onClick={() => setShowRejectModal(true)} color="#FFF" bgColor={T.error} icon={FiX}>Reject</ActionButton>
                <ActionButton onClick={() => setShowApproveModal(true)} color="#FFF" bgColor={T.success} icon={FiCheck}>Approve</ActionButton>
              </>
            )}
            {isTopManagement && planStatus === 'APPROVED' && <ActionButton onClick={() => setShowChangeRequestModal(true)} color="#FFF" bgColor={T.warning} icon={FiMessageSquare}>Request Changes</ActionButton>}
          </div>
        </div>
      </Card>

      {/* Modals */}
      <ActionModal isOpen={showApproveModal} onClose={() => { setShowApproveModal(false); setTempApprovalComment(''); }} title="Approve Plan" description="Please provide approval comments:" icon={FiCheck} iconColor={T.success} iconBg={T.successLight} iconBorder={T.successBorder} value={tempApprovalComment} setValue={setTempApprovalComment} placeholder="Enter approval comments..." onSubmit={handleApprove} submitLabel="Confirm Approve" submitColor="#FFF" submitBg={T.success} submitting={submitting} />
      <ActionModal isOpen={showRejectModal} onClose={() => { setShowRejectModal(false); setTempRejectionReason(''); }} title="Reject Plan" description="Please provide a reason for rejection:" icon={FiX} iconColor={T.error} iconBg={T.errorLight} iconBorder={T.errorBorder} value={tempRejectionReason} setValue={setTempRejectionReason} placeholder="Enter rejection reason..." onSubmit={handleReject} submitLabel="Confirm Reject" submitColor="#FFF" submitBg={T.error} submitting={submitting} />
      <ActionModal isOpen={showChangeRequestModal} onClose={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); }} title={`Request Changes - ${selectedYear}`} description="Please provide details about what changes are needed:" icon={FiMessageSquare} iconColor={T.warning} iconBg={T.warningLight} iconBorder={T.warningBorder} value={changeRequestReason} setValue={setChangeRequestReason} placeholder="Describe the changes required..." onSubmit={handleRequestChanges} submitLabel="Submit Request" submitColor="#FFF" submitBg={T.warning} submitting={submitting} />
      
      <ElementSelectionModal
        isOpen={!!selectedMonthForElements}
        onClose={() => setSelectedMonthForElements(null)}
        month={selectedMonthForElements?.month}
        availableElements={selectedMonthForElements ? getAvailableElementsForMonth(selectedMonthForElements.month) : []}
        selectedElements={selectedMonthForElements ? (planData[selectedMonthForElements.deptIndex]?.months.find(m => m.month === selectedMonthForElements.month)?.selectedElements || []) : []}
        onSave={(elements) => handleAddElementsToMonth(selectedMonthForElements.deptIndex, selectedMonthForElements.month, elements)}
      />

    </div>
  );
};

export default Form4View;