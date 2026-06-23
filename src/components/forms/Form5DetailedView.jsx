import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiCalendar, FiClock, FiSave, FiRefreshCw,
  FiAlertCircle, FiCheckCircle, FiX, FiPlus, FiTrash2,
  FiEdit2, FiUserCheck, FiUserPlus, FiInfo, FiEye, FiTrendingUp, FiUsers,
  FiChevronLeft, FiChevronRight, FiFileText, FiDownload, FiPrinter,
  FiSunrise, FiSunset, FiCoffee, FiSend, FiCheck, FiAlertTriangle, FiMessageSquare
} from 'react-icons/fi';
import axios from 'axios';
import { width } from '@mui/system';


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

// ═════ REUSABLE UI COMPONENTS ═════

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
      height: 42, 
      padding: '0 22px', 
      borderRadius: 8, 
      border: `1px solid ${borderColor || 'transparent'}`,
      background: (disabled || loading) ? '#F1F5F9' : bgColor, 
      color: (disabled || loading) ? '#94A3B8' : color,
      fontSize: 15, 
      fontWeight: 600, 
      cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      display: 'flex', 
      alignItems: 'center', 
      gap: 8, 
      transition: 'all 0.2s', 
      fontFamily: FONT_FAMILY,
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
    <div style={{ 
      padding: 18, 
      background: s.bg, 
      border: `1px solid ${s.border}`, 
      borderRadius: 12, 
      marginBottom: 24, 
      display: 'flex', 
      gap: 14, 
      fontFamily: FONT_FAMILY 
    }}>
      <div style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 8, 
        background: T.card, 
        border: `1px solid ${s.border}`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0 
      }}>
        <Icon size={20} color={s.iconColor} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: s.color }}>{title}</p>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: s.color, opacity: 0.9 }}>{message}</p>
        {footer && <p style={{ margin: '10px 0 0', fontSize: 13, color: s.color, opacity: 0.7 }}>{footer}</p>}
      </div>
    </div>
  );
};

// ═════ HELPER FUNCTIONS & CONSTANTS ═════
const getTimeValue = (timeStr) => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  const minute = parseInt(minutes);
  if (modifier === 'PM' && hour !== 12) hour += 12;
  if (modifier === 'AM' && hour === 12) hour = 0;
  return hour + (minute / 60);
};

const timeOptions = (() => {
  const options = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 17 && minute > 0) break;
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      const displayMinute = minute.toString().padStart(2, '0');
      const period = hour >= 12 ? 'PM' : 'AM';
      options.push(`${displayHour}:${displayMinute} ${period}`);
    }
  }
  return options;
})();

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';
const monthNumber = {
  "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
  "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
};

// Shared Input Styles for Modals (Increased Font Size)
const inputStyle = {
  width: '100%', 
  height: 44, 
  padding: '0 14px', 
  fontSize: 15, 
  fontFamily: FONT_FAMILY, 
  borderRadius: 8, 
  border: `1px solid ${T.border}`, 
  background: T.card, 
  color: T.textValue, 
  outline: 'none', 
  boxSizing: 'border-box', 
  transition: 'border-color 0.2s'
};

const selectStyleModal = {
  ...inputStyle,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', 
  backgroundPosition: 'right 14px center', 
  paddingRight: 40,
  WebkitAppearance: 'none', 
  MozAppearance: 'none', 
  appearance: 'none', 
  cursor: 'pointer'
};

const labelStyle = {
  display: 'block', 
  fontSize: 14, 
  fontWeight: 600, 
  color: T.text, 
  marginBottom: 8, 
  fontFamily: FONT_FAMILY
};

// ═════ MAIN COMPONENT ═════
const Form5DetailedView = () => {
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { year, month, preSelectedDepartment, startDate: preStartDate, endDate: preEndDate } = location.state || {};

  // State Variables
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedYear] = useState(year || new Date().getFullYear());
  const [selectedMonth] = useState(month || "");
  const [basicSchedules, setBasicSchedules] = useState([]);
  const [auditSchedules, setAuditSchedules] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [auditees, setAuditees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('CHECKING');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  
  const [submittingDate, setSubmittingDate] = useState(null);
  const [dateApprovalStatus, setDateApprovalStatus] = useState({});
  const [selectedRejectDate, setSelectedRejectDate] = useState(null);
  
  const [globalAuditType, setGlobalAuditType] = useState('');
  const [globalAuditTypesList, setGlobalAuditTypesList] = useState([]);
  const [startDate, setStartDate] = useState(preStartDate || '');
  const [endDate, setEndDate] = useState(preEndDate || '');
  const [auditNumber, setAuditNumber] = useState('');
  const [filteredAuditSchedules, setFilteredAuditSchedules] = useState([]);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [departmentAuditors, setDepartmentAuditors] = useState([]);
  const [departmentAuditees, setDepartmentAuditees] = useState([]);
  const [loadingDepartmentUsers, setLoadingDepartmentUsers] = useState(false);
  const [selectedAuditDepartment, setSelectedAuditDepartment] = useState('');
  
  const [headerData, setHeaderData] = useState({
    auditObjective: '', auditScope: '', leadAuditorId: null, leadAuditorName: '',
    teamAuditorIds: [], teamAuditorNames: [], documentRevision: '1.0', preparedBy: '', approvedBy: ''
  });

  const [formData, setFormData] = useState({
    id: null, date: '', startTime: '09:00 AM', endTime: '10:00 AM',
    selectedDepartments: [], auditorId: '', auditeeId: '',
    isSpecialEvent: false, specialEventType: '', auditType: '', status: 'SCHEDULED'
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSelectedAuditDepartment, setBulkSelectedAuditDepartment] = useState('');
  const [departmentTeamInfo, setDepartmentTeamInfo] = useState({
    leadAuditorId: null, leadAuditorName: null, teamAuditorIds: [], teamAuditorNames: [],
    auditeeIds: [], auditeeNames: []
  });

  const [bulkData, setBulkData] = useState({
    fromDate: '', toDate: '', startTime: '09:00 AM', endTime: '10:00 AM',
    selectedDepartments: [], auditorId: '', auditeeId: '', auditType: '',
    status: 'SCHEDULED', isSpecialEvent: false, specialEventType: ''
  });

  // Helper Functions
  const getWeekNumber = (dateStr) => {
    if (!dateStr) return 'W-1';
    const date = new Date(dateStr);
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const dayOfMonth = date.getDate();
    let weekNum = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
    if (weekNum < 1) weekNum = 1;
    if (weekNum > 6) weekNum = 6;
    return `W-${weekNum}`;
  };

  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  const convertToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(minutes);
  };

  const generateDateRange = () => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      dates.push({
        dateStr: `${year}-${month}-${day}`, 
        displayDate: `${day}/${month}/${year}`,
        dayOfWeek: dt.toLocaleDateString('en-US', { weekday: 'long' }),
        isWeekend: dt.getDay() === 0 || dt.getDay() === 6
      });
    }
    return dates;
  };

  const dateRange = generateDateRange();

  const getSchedulesForDate = (dateStr) => {
    return filteredAuditSchedules.filter(s => (s.scheduledDate === dateStr || s.date === dateStr))
      .sort((a, b) => {
        const timeA = convertToMinutes(a.startTime);
        const timeB = convertToMinutes(b.startTime);
        if (timeA === timeB) {
          const deptA = Array.isArray(a.departments) && a.departments.length > 0 ? a.departments[0] : '';
          const deptB = Array.isArray(b.departments) && b.departments.length > 0 ? b.departments[0] : '';
          return deptA.localeCompare(deptB);
        }
        return timeA - timeB;
      });
  };

  const getAvailableDepartmentsForDate = (dateStr) => {
    if (!dateStr) return [];
    const weekNum = getWeekNumber(dateStr);
    const departmentsMap = new Map();
    basicSchedules.forEach(schedule => {
      if (schedule.week === weekNum && schedule.department &&
        schedule.department !== 'OPENING' && schedule.department !== 'CLOSING') {
        let auditElements = [];
        if (schedule.auditElements) {
          if (typeof schedule.auditElements === 'string') { 
            try { auditElements = JSON.parse(schedule.auditElements); } catch(e) {} 
          } else if (Array.isArray(schedule.auditElements)) { 
            auditElements = schedule.auditElements; 
          }
        }
        let filteredElements = auditElements;
        if (globalAuditType && globalAuditType !== '') {
          filteredElements = auditElements.filter(element => element.toLowerCase().includes(globalAuditType.toLowerCase()));
        }
        const shouldShowDepartment = !globalAuditType || filteredElements.length > 0;
        if (shouldShowDepartment) {
          departmentsMap.set(schedule.department, { department: schedule.department, auditElements: filteredElements });
        }
      }
    });
    return Array.from(departmentsMap.values());
  };

  const getAvailableDepartmentsForBulk = useCallback(() => {
    if (!bulkData.fromDate || !bulkData.toDate) return [];
    const fromDate = new Date(bulkData.fromDate);
    const toDate = new Date(bulkData.toDate);
    const weeksInRange = new Set();
    for (let dt = new Date(fromDate); dt <= toDate; dt.setDate(dt.getDate() + 1)) {
      const dateStr = dt.toISOString().split('T')[0];
      weeksInRange.add(getWeekNumber(dateStr));
    }
    const departmentsMap = new Map();
    const relevantSchedules = basicSchedules.filter(schedule =>
      weeksInRange.has(schedule.week) && schedule.department &&
      schedule.department !== 'OPENING' && schedule.department !== 'CLOSING'
    );
    relevantSchedules.forEach(schedule => {
      let auditElements = [];
      if (schedule.auditElements) {
        if (typeof schedule.auditElements === 'string') { try { auditElements = JSON.parse(schedule.auditElements); } catch(e) {} }
        else if (Array.isArray(schedule.auditElements)) { auditElements = schedule.auditElements; }
      }
      let filteredElements = auditElements;
      if (globalAuditType) {
        filteredElements = auditElements.filter(element => element.toLowerCase().includes(globalAuditType.toLowerCase()));
      }
      if (filteredElements.length > 0 && !departmentsMap.has(schedule.department)) {
        departmentsMap.set(schedule.department, { department: schedule.department, auditElements: filteredElements });
      }
    });
    return Array.from(departmentsMap.values());
  }, [basicSchedules, bulkData.fromDate, bulkData.toDate, globalAuditType]);

  const getAvailableAuditors = useCallback(() => {
    const auditorIds = [];
    if (headerData.leadAuditorId) auditorIds.push(headerData.leadAuditorId);
    if (headerData.teamAuditorIds) {
      const teamIds = Array.isArray(headerData.teamAuditorIds) ? headerData.teamAuditorIds : JSON.parse(headerData.teamAuditorIds || '[]');
      auditorIds.push(...teamIds);
    }
    if (auditorIds.length === 0) return auditors;
    return auditors.filter(a => auditorIds.includes(a.id)).sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [auditors, headerData.leadAuditorId, headerData.teamAuditorIds]);

  const getSortedAuditees = useCallback(() => {
    return [...auditees].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [auditees]);

  const getTeamMembersForDepartment = useCallback((departmentName, dateStr = null) => {
    const targetWeek = dateStr ? getWeekNumber(dateStr) : null;
    let matchedSchedule = null;
    for (const schedule of basicSchedules) {
      if (schedule.department === departmentName) {
        const scheduleWeek = schedule.week;
        const isApproved = schedule.approvalStatus === 'APPROVED';
        if (targetWeek && scheduleWeek === targetWeek && isApproved) { matchedSchedule = schedule; break; }
        else if (!targetWeek && isApproved) { matchedSchedule = schedule; break; }
      }
    }
    if (!matchedSchedule) {
      return { leadAuditorId: null, leadAuditorName: null, teamAuditorIds: [], teamAuditorNames: [], auditeeIds: [], auditeeNames: [] };
    }
    let teamIds = []; let teamNames = [];
    if (matchedSchedule.teamAuditorIds) {
      teamIds = matchedSchedule.teamAuditorIds;
      if (typeof teamIds === 'string') { try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; } }
    }
    if (teamIds.length === 0 && matchedSchedule.coAuditorIds) {
      teamIds = matchedSchedule.coAuditorIds;
      if (typeof teamIds === 'string') { try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; } }
    }
    if (matchedSchedule.teamAuditorNames) {
      teamNames = matchedSchedule.teamAuditorNames;
      if (typeof teamNames === 'string') { try { teamNames = JSON.parse(teamNames); } catch(e) { teamNames = []; } }
    }
    if (teamNames.length === 0 && matchedSchedule.coAuditorNames) {
      teamNames = matchedSchedule.coAuditorNames;
      if (typeof teamNames === 'string') { try { teamNames = JSON.parse(teamNames); } catch(e) { teamNames = []; } }
    }
    let auditeeIds = []; let auditeeNames = [];
    if (matchedSchedule.auditeeIds) {
      auditeeIds = matchedSchedule.auditeeIds;
      if (typeof auditeeIds === 'string') { try { auditeeIds = JSON.parse(auditeeIds); } catch(e) { auditeeIds = []; } }
    } else if (matchedSchedule.auditeeIdList) {
      auditeeIds = matchedSchedule.auditeeIdList;
      if (typeof auditeeIds === 'string') { try { auditeeIds = JSON.parse(auditeeIds); } catch(e) { auditeeIds = []; } }
    }
    if (matchedSchedule.auditeeNames) {
      auditeeNames = matchedSchedule.auditeeNames;
      if (typeof auditeeNames === 'string') { try { auditeeNames = JSON.parse(auditeeNames); } catch(e) { auditeeNames = []; } }
    }
    if (teamIds.length > 0 && teamNames.length === 0) { teamNames = teamIds.map(id => `Co-Auditor ${id}`); }
    return {
      leadAuditorId: matchedSchedule.leadAuditorId || matchedSchedule.auditorId,
      leadAuditorName: matchedSchedule.leadAuditorName || matchedSchedule.auditorName,
      teamAuditorIds: teamIds, teamAuditorNames: teamNames,
      auditeeIds: auditeeIds, auditeeNames: auditeeNames
    };
  }, [basicSchedules]);

  const departmentDisplayToEnum = {
    "HR": "HR", "R&D": "ENGG", "Purchase": "PURCHASE", "RMS": "STORES_DESPATCH",
    "SQA": "QA", "PPC": "PPC", "Production": "PRODUCTION", "QA/QC": "QA",
    "FGS": "STORES_DESPATCH", "Marketing": "MARKETING", "IMS (BE)": "MR",
    "Maintenance": "PLANT_MAINTENANCE", "Management": "UNIT_HEAD",
    "Plant Maintenance": "PLANT_MAINTENANCE", "Tool Maintenance": "TOOL_MAINTENANCE",
    "Stores & Despatch": "STORES_DESPATCH"
  };

  // API & Data Fetching
  const fetchUsers = useCallback(async () => {
    try {
      const auditorsList = await auditScheduleApi.getAllAuditors();
      setAuditors(auditorsList || []);
      const auditeesList = await auditScheduleApi.getAuditees();
      setAuditees(auditeesList || []);
    } catch (error) { console.error('Error fetching users:', error); }
  }, []);

  const fetchDepartmentUsers = useCallback(async (departmentCode) => {
    if (!departmentCode) { setDepartmentAuditors([]); setDepartmentAuditees([]); return; }
    const enumValue = departmentDisplayToEnum[departmentCode] || departmentCode.toUpperCase().replace(/[&\s\/]+/g, '_');
    setLoadingDepartmentUsers(true);
    try {
      const auditorsRes = await axios.get(`${API_BASE}/audit-schedule/auditors/by-department/${encodeURIComponent(enumValue)}`, { withCredentials: true });
      setDepartmentAuditors(auditorsRes.data || []);
      const auditeesRes = await axios.get(`${API_BASE}/audit-schedule/auditees/by-department/${encodeURIComponent(enumValue)}`, { withCredentials: true });
      setDepartmentAuditees(auditeesRes.data || []);
    } catch (error) {
      console.error('Error fetching department users:', error);
      addToast('Failed to load department users', 'error');
      setDepartmentAuditors([]); setDepartmentAuditees([]);
    } finally { setLoadingDepartmentUsers(false); }
  }, [addToast]);

  const fetchBasicSchedules = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const weekSchedules = await auditScheduleApi.getByYearAndMonth(selectedYear, selectedMonth);
      const dateSchedules = await auditScheduleApi.getDateSchedulesByMonth(selectedYear, selectedMonth);
      const allSchedules = [...(weekSchedules.data || []), ...(dateSchedules.data || [])];
      setBasicSchedules(allSchedules);
      
      const hasApprovedSchedules = allSchedules.some(s => s.approvalStatus === 'APPROVED');
      if (hasApprovedSchedules) {
        setApprovalStatus('APPROVED');
        const first = allSchedules.find(s => s.approvalStatus === 'APPROVED');
        if (first) {
          let teamIds = first.teamAuditorIds || [];
          if (typeof teamIds === 'string') { try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; } }
          setHeaderData({
            auditObjective: first.auditObjective || '', auditScope: first.auditScope || '',
            leadAuditorId: first.leadAuditorId || null, leadAuditorName: first.leadAuditorName || '',
            teamAuditorIds: teamIds, teamAuditorNames: first.teamAuditorNames || [],
            documentRevision: first.documentRevision || '1.0',
            preparedBy: first.preparedByName || user?.name || user?.username || '',
            approvedBy: first.approvedByName || ''
          });
        }
      } else { setApprovalStatus('NOT_APPROVED'); }
      
      setAuditNumber(`INT/${selectedYear}/01`);
      const auditTypesSet = new Set();
      allSchedules.forEach(schedule => {
        if (schedule.auditElements) {
          let auditElements = schedule.auditElements;
          if (typeof auditElements === 'string') { try { auditElements = JSON.parse(auditElements); } catch(e) { auditElements = []; } }
          auditElements.forEach(element => { if (element && element.trim()) auditTypesSet.add(element); });
        }
      });
      const auditTypes = Array.from(auditTypesSet);
      setGlobalAuditTypesList(auditTypes);
      if (auditTypes.length > 0 && !globalAuditType) setGlobalAuditType(auditTypes[0]);
    } catch (error) { console.error('Error fetching basic schedules:', error); setApprovalStatus('ERROR'); }
  }, [selectedYear, selectedMonth, globalAuditType]);

  const fetchDetailedSchedules = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const response = await auditScheduleApi.getDateSchedulesByMonth(selectedYear, selectedMonth);
      const dateSchedules = response.data || [];
      const processedSchedules = dateSchedules.map(schedule => {
        if ((!schedule.startTime || !schedule.endTime) && schedule.remarks) {
          try {
            const remarks = JSON.parse(schedule.remarks);
            if (remarks.startTime) schedule.startTime = remarks.startTime;
            if (remarks.endTime) schedule.endTime = remarks.endTime;
            if (remarks.isSpecialEvent) schedule.isSpecialEvent = remarks.isSpecialEvent;
            if (remarks.specialEventType) schedule.specialEventType = remarks.specialEventType;
          } catch(e) {}
        }
        if (schedule.departments && typeof schedule.departments === 'string') {
          try { schedule.departments = JSON.parse(schedule.departments); } catch(e) { schedule.departments = []; }
        }
        return schedule;
      });
      setAuditSchedules(processedSchedules);
      
      if (globalAuditType && globalAuditType !== '') {
        const filtered = processedSchedules.filter(schedule => {
          if (schedule.isSpecialEvent) return true;
          let auditElements = [];
          if (schedule.auditElements) {
            if (typeof schedule.auditElements === 'string') { try { auditElements = JSON.parse(schedule.auditElements); } catch(e) { auditElements = []; } }
            else if (Array.isArray(schedule.auditElements)) { auditElements = schedule.auditElements; }
          }
          return auditElements.some(element => element.toLowerCase().includes(globalAuditType.toLowerCase()));
        });
        setFilteredAuditSchedules(filtered);
      } else { setFilteredAuditSchedules(processedSchedules); }
      
      if (processedSchedules.length > 0 && (!startDate || !endDate)) {
        const dates = [...new Set(processedSchedules.map(s => s.scheduledDate))].sort();
        if (dates.length > 0) { setStartDate(dates[0]); setEndDate(dates[dates.length - 1]); }
      }
    } catch (error) { console.error('Error fetching detailed schedules:', error); setAuditSchedules([]); setFilteredAuditSchedules([]); }
  }, [selectedYear, selectedMonth, startDate, endDate, globalAuditType]);

  const filterSchedulesByAuditType = useCallback(() => {
    if (!globalAuditType || globalAuditType.trim() === '') { setFilteredAuditSchedules(auditSchedules); return; }
    const normalizedGlobalType = globalAuditType.toLowerCase().trim();
    const filtered = auditSchedules.filter(schedule => {
      if (schedule.isSpecialEvent) {
        if (schedule.specialEventType === 'LUNCH') return true;
        if (schedule.auditType && schedule.auditType.toLowerCase().includes(normalizedGlobalType)) return true;
        return false;
      }
      let auditElements = [];
      if (schedule.auditElements) {
        if (typeof schedule.auditElements === 'string') { try { const parsed = JSON.parse(schedule.auditElements); auditElements = Array.isArray(parsed) ? parsed : [parsed]; } catch(e) { auditElements = [schedule.auditElements]; } }
        else if (Array.isArray(schedule.auditElements)) { auditElements = schedule.auditElements; }
      }
      const matchesElements = auditElements.some(element => { if (!element) return false; return element.toLowerCase().includes(normalizedGlobalType); });
      const matchesMainType = schedule.auditType && schedule.auditType.toLowerCase().includes(normalizedGlobalType);
      return matchesElements || matchesMainType;
    });
    setFilteredAuditSchedules(filtered);
  }, [auditSchedules, globalAuditType]);

  const checkTimeConflict = (date, startTime, endTime, auditorId, auditeeId, isSpecialEvent, specialEventType, excludeId = null) => {
    const dateSchedules = auditSchedules.filter(s => (s.scheduledDate === date || s.date === date));
    if (isSpecialEvent && specialEventType !== 'LUNCH') {
      const overlappingEvent = dateSchedules.find(schedule => {
        if (excludeId && schedule.id === excludeId) return false;
        if (schedule.isSpecialEvent && schedule.specialEventType !== 'LUNCH') {
          const s1Start = convertToMinutes(startTime); const s1End = convertToMinutes(endTime);
          const s2Start = convertToMinutes(schedule.startTime); const s2End = convertToMinutes(schedule.endTime);
          return (s1Start < s2End && s1End > s2Start);
        }
        return false;
      });
      if (overlappingEvent) return { type: 'event', conflict: overlappingEvent };
    }
    if (auditorId && !isSpecialEvent) {
      const auditorConflict = dateSchedules.find(schedule => {
        if (excludeId && schedule.id === excludeId) return false;
        if (schedule.auditorId !== parseInt(auditorId)) return false;
        if (schedule.isSpecialEvent && schedule.specialEventType === 'LUNCH') return false;
        const s1Start = convertToMinutes(startTime); const s1End = convertToMinutes(endTime);
        const s2Start = convertToMinutes(schedule.startTime); const s2End = convertToMinutes(schedule.endTime);
        return (s1Start < s2End && s1End > s2Start);
      });
      if (auditorConflict) return { type: 'auditor', conflict: auditorConflict };
    }
    if (auditeeId && !isSpecialEvent) {
      const auditeeConflict = dateSchedules.find(schedule => {
        if (excludeId && schedule.id === excludeId) return false;
        if (schedule.auditeeId !== parseInt(auditeeId)) return false;
        if (schedule.isSpecialEvent && schedule.specialEventType === 'LUNCH') return false;
        const s1Start = convertToMinutes(startTime); const s1End = convertToMinutes(endTime);
        const s2Start = convertToMinutes(schedule.startTime); const s2End = convertToMinutes(schedule.endTime);
        return (s1Start < s2End && s1End > s2Start);
      });
      if (auditeeConflict) return { type: 'auditee', conflict: auditeeConflict };
    }
    return null;
  };

  // Handlers
  const handleAuditDepartmentChange = async (departmentCode) => {
    setSelectedAuditDepartment(departmentCode);
    const teamInfo = getTeamMembersForDepartment(departmentCode, formData.date);
    setDepartmentTeamInfo(teamInfo);
    await fetchDepartmentUsers(departmentCode);
    setFormData(prev => ({ ...prev, auditorId: '', auditeeId: '' }));
  };

  const handleSave = async () => {
    if (formData.id) {
      const existingSchedule = auditSchedules.find(s => s.id === formData.id);
      if (existingSchedule?.detailedApprovalStatus === 'APPROVED') { addToast('Cannot edit an approved schedule', 'warning'); return; }
    }
    if (!formData.date || !formData.startTime || !formData.endTime) { addToast('Please fill date and time', 'error'); return; }
    if (formData.isSpecialEvent) {
      if (!formData.specialEventType) { addToast('Please select event type', 'error'); return; }
      if (formData.specialEventType !== 'LUNCH') {
        if (!formData.auditorId || !formData.auditeeId) { addToast('Please select Auditor and Auditee for Opening/Closing Meeting', 'error'); return; }
      }
    } else {
      if (!formData.selectedDepartments || formData.selectedDepartments.length === 0) { addToast('Please select at least one department', 'error'); return; }
      const auditTypeToUse = formData.auditType || globalAuditType;
      if (!auditTypeToUse) { addToast('Please select Audit Type', 'error'); return; }
      if (!formData.auditorId || !formData.auditeeId) { addToast('Please select Auditor and Auditee', 'error'); return; }
    }
    if (!formData.isSpecialEvent && formData.auditorId && formData.auditeeId) {
      const conflict = checkTimeConflict(formData.date, formData.startTime, formData.endTime, formData.auditorId, formData.auditeeId, formData.isSpecialEvent, formData.specialEventType, formData.id);
      if (conflict) {
        if (conflict.type === 'auditor') addToast(`❌ Conflict: Auditor ${conflict.conflict.auditorName} already scheduled`, 'error');
        else if (conflict.type === 'auditee') addToast(`❌ Conflict: Auditee ${conflict.conflict.auditeeName} already scheduled`, 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const auditTypeToUse = formData.auditType || globalAuditType;
      const saveData = {
        id: formData.id, planYear: selectedYear, month: selectedMonth,
        department: formData.selectedDepartments?.map(d => d.department).join(', ') || 'General',
        week: getWeekNumber(formData.date), scheduledDate: formData.date,
        timeSlot: `${formData.startTime} - ${formData.endTime}`, startTime: formData.startTime, endTime: formData.endTime,
        fromDate: startDate, toDate: endDate,
        auditorId: (formData.auditorId && formData.specialEventType !== 'LUNCH') ? parseInt(formData.auditorId) : null,
        auditeeId: (formData.auditeeId && formData.specialEventType !== 'LUNCH') ? parseInt(formData.auditeeId) : null,
        status: formData.status,
        departments: formData.selectedDepartments?.map(d => d.department) || [],
        auditElements: formData.selectedDepartments?.flatMap(d => d.selectedElements) || [],
        selectedDepartments: formData.selectedDepartments || [],
        isSpecialEvent: formData.isSpecialEvent || false, specialEventType: formData.specialEventType || '',
        auditType: auditTypeToUse, auditNumber: auditNumber,
        preparedByName: headerData.preparedBy || user?.name || user?.username, preparedByPosition: 'Audit Manager'
      };
      if (formData.id) {
        await auditScheduleApi.updateDetailedSchedule(formData.id, saveData, user?.id);
        addToast('Schedule updated successfully!', 'success');
      } else {
        await auditScheduleApi.saveDetailedSchedule(saveData, user?.id);
        addToast('Schedule added successfully!', 'success');
      }
      setShowModal(false); resetForm(); await fetchDetailedSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      addToast(error.response?.data?.message || 'Failed to save schedule', 'error');
    } finally { setSaving(false); }
  };

  const handleBulkSchedule = async () => {
    if (!bulkData.fromDate || !bulkData.toDate) { addToast('Please select From Date and To Date', 'error'); return; }
    const fromDate = new Date(bulkData.fromDate);
    const toDate = new Date(bulkData.toDate);
    if (fromDate > toDate) { addToast('From Date must be before To Date', 'error'); return; }

    if (bulkData.isSpecialEvent) {
      if (!bulkData.specialEventType) { addToast('Please select event type', 'error'); return; }
      if (bulkData.specialEventType !== 'LUNCH') {
        if (!bulkData.auditorId || !bulkData.auditeeId) { addToast('Please select Auditor and Auditee for Opening/Closing Meeting', 'error'); return; }
      }
    } else {
      if (!bulkData.selectedDepartments || bulkData.selectedDepartments.length === 0) { addToast('Please select at least one department with audit elements', 'error'); return; }
      const hasElements = bulkData.selectedDepartments.some(d => d.selectedElements && d.selectedElements.length > 0);
      if (!hasElements) { addToast('Please select at least one audit element for the selected departments', 'error'); return; }
      if (!bulkData.auditorId || !bulkData.auditeeId) { addToast('Please select Auditor and Auditee', 'error'); return; }
    }

    setSaving(true);
    try {
      const firstDate = new Date(fromDate);
      const scheduledDateStr = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}-${String(firstDate.getDate()).padStart(2, '0')}`;
      const saveData = {
        id: null, planYear: selectedYear, month: selectedMonth,
        department: bulkData.isSpecialEvent
          ? (bulkData.specialEventType === 'OPENING' ? 'Opening Meeting' : bulkData.specialEventType === 'CLOSING' ? 'Closing Meeting' : 'Lunch Break')
          : bulkData.selectedDepartments?.map(d => d.department).join(', ') || 'General',
        week: getWeekNumber(scheduledDateStr), scheduledDate: scheduledDateStr,
        fromDate: bulkData.fromDate, toDate: bulkData.toDate,
        timeSlot: `${bulkData.startTime} - ${bulkData.endTime}`,
        startTime: bulkData.startTime, endTime: bulkData.endTime,
        auditorId: (bulkData.auditorId && bulkData.specialEventType !== 'LUNCH') ? parseInt(bulkData.auditorId) : null,
        auditeeId: (bulkData.auditeeId && bulkData.specialEventType !== 'LUNCH') ? parseInt(bulkData.auditeeId) : null,
        status: bulkData.status,
        departments: bulkData.isSpecialEvent ? [] : (bulkData.selectedDepartments?.map(d => d.department) || []),
        auditElements: bulkData.isSpecialEvent ? [] : (bulkData.selectedDepartments?.flatMap(d => d.selectedElements) || []),
        selectedDepartments: bulkData.isSpecialEvent ? [] : (bulkData.selectedDepartments || []),
        isSpecialEvent: bulkData.isSpecialEvent || false, specialEventType: bulkData.specialEventType || '',
        auditType: bulkData.auditType || globalAuditType, auditNumber: auditNumber,
        preparedByName: headerData.preparedBy || user?.name || user?.username, preparedByPosition: 'Audit Manager'
      };
      await auditScheduleApi.saveDetailedSchedule(saveData, user?.id);
      addToast(`✅ Schedule created for date range ${bulkData.fromDate} to ${bulkData.toDate}`, 'success');
      setShowBulkModal(false);
      resetBulkForm();
      await fetchDetailedSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      addToast('Failed to create schedule', 'error');
    } finally { setSaving(false); }
  };

  const handleSubmitAllDraftSchedules = async () => {
    const draftSchedules = filteredAuditSchedules.filter(s => s.detailedApprovalStatus === 'DRAFT');
    if (draftSchedules.length === 0) { addToast(`No draft schedules to submit for "${globalAuditType || 'All'}"`, 'warning'); return; }
    if (!window.confirm(`Are you sure you want to submit ${draftSchedules.length} draft schedule(s) for "${globalAuditType}"?`)) return;
    setSubmitting(true);
    try {
      let submittedCount = 0;
      for (const schedule of draftSchedules) {
        await auditScheduleApi.submitScheduleForApproval(schedule.id, user?.id);
        submittedCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      addToast(`${submittedCount} schedule(s) submitted for approval!`, 'success');
      await fetchDetailedSchedules();
    } catch (error) { console.error('Error submitting schedules:', error); addToast('Failed to submit some schedules', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    const scheduleToDelete = auditSchedules.find(s => s.id === id);
    if (scheduleToDelete?.detailedApprovalStatus === 'APPROVED') { addToast('Cannot delete an approved schedule', 'warning'); return; }
    if (scheduleToDelete?.detailedApprovalStatus === 'PENDING_APPROVAL') { addToast('Cannot delete a schedule pending approval', 'warning'); return; }
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try { await auditScheduleApi.delete(id); addToast('Schedule deleted successfully!', 'success'); await fetchDetailedSchedules(); }
      catch (error) { console.error('Error deleting schedule:', error); addToast('Failed to delete schedule', 'error'); }
    }
  };

  const handleSubmitScheduleForApproval = async (scheduleId) => {
    setSubmitting(true);
    try { await auditScheduleApi.submitScheduleForApproval(scheduleId, user?.id); addToast('Schedule submitted for approval!', 'success'); await fetchDetailedSchedules(); }
    catch (error) { console.error('Error submitting schedule:', error); addToast(error.response?.data?.message || 'Failed to submit schedule', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleApproveSchedule = async (scheduleId) => {
    setSubmitting(true);
    try { await auditScheduleApi.approveSchedule(scheduleId, user?.id, approvalComment); addToast('Schedule approved successfully!', 'success'); setApprovalComment(''); await fetchDetailedSchedules(); }
    catch (error) { console.error('Error approving schedule:', error); addToast(error.response?.data?.message || 'Failed to approve schedule', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleRejectSchedule = async (scheduleId) => {
    if (!rejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectSchedule(scheduleId, user?.id, rejectionReason);
      addToast('Schedule rejected', 'error'); setShowRejectModal(false); setRejectionReason(''); setSelectedRejectDate(null); await fetchDetailedSchedules();
    } catch (error) { console.error('Error rejecting schedule:', error); addToast(error.response?.data?.message || 'Failed to reject schedule', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleRequestChanges = async (scheduleId) => {
    if (!changeRequestReason.trim()) { addToast('Please provide a reason for changes', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-schedule/detailed/${selectedYear}/${selectedMonth}/request-changes?userId=${user?.id}`, { reason: changeRequestReason }, { withCredentials: true });
      addToast(`Change request submitted for schedule`, 'warning'); setShowChangeRequestModal(false); setChangeRequestReason(''); await fetchDetailedSchedules();
    } catch (error) { console.error('Error requesting changes:', error); addToast(error.response?.data?.message || 'Failed to submit change request', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleExport = () => {
    const headers = ['Date', 'Day', 'Start Time', 'End Time', 'Departments/Event', 'Audit Type', 'Auditor', 'Auditee', 'Status'];
    const rows = auditSchedules.map(s => [
      s.scheduledDate || s.date, new Date(s.scheduledDate || s.date).toLocaleDateString('en-US', { weekday: 'long' }),
      s.startTime, s.endTime, s.isSpecialEvent ? s.specialEventType : (Array.isArray(s.departments) ? s.departments.join(', ') : s.departments),
      s.auditType || globalAuditType || '-', s.auditorName || '-', s.auditeeName || '-', s.status
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit_schedule_${selectedMonth}_${selectedYear}.csv`; a.click();
    URL.revokeObjectURL(url); addToast('Schedule exported successfully!', 'success');
  };

  const handleDownloadPdf = async () => {
    if (!selectedMonth) { addToast('Please select a month first', 'warning'); return; }
    setDownloadingPdf(true);
    try {
      const response = await auditScheduleApi.downloadDetailedViewPdf(selectedYear, selectedMonth, { startDate: startDate || undefined, endDate: endDate || undefined, auditType: globalAuditType || undefined });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Form5_Detailed_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`);
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      addToast('Detailed schedule PDF downloaded successfully!', 'success');
    } catch (error) { console.error('Error downloading detailed schedule PDF:', error); addToast('Failed to download detailed schedule PDF', 'error'); }
    finally { setDownloadingPdf(false); }
  };

  const resetForm = () => {
    setFormData({ id: null, date: '', startTime: '09:00 AM', endTime: '10:00 AM', selectedDepartments: [], auditorId: '', auditeeId: '', isSpecialEvent: false, specialEventType: '', auditType: globalAuditType, status: 'SCHEDULED' });
    setConflictWarning(null); setEditingSchedule(null); setSelectedAuditDepartment(''); setDepartmentAuditors([]); setDepartmentAuditees([]);
  };

  const resetBulkForm = () => {
    setBulkData({
      fromDate: '', toDate: '', startTime: '09:00 AM', endTime: '10:00 AM',
      selectedDepartments: [], auditorId: '', auditeeId: '', auditType: '',
      status: 'SCHEDULED', isSpecialEvent: false, specialEventType: ''
    });
  };

  const handleAddSchedule = (dateStr) => {
    if (!canEdit) { addToast('You do not have permission to add schedules', 'warning'); return; }
    setFormData({ id: null, date: dateStr || '', startTime: '09:00 AM', endTime: '10:00 AM', selectedDepartments: [], auditorId: '', auditeeId: '', isSpecialEvent: false, specialEventType: '', auditType: globalAuditType, status: 'SCHEDULED' });
    setConflictWarning(null); setEditingSchedule(null); setShowModal(true);
  };

  const handleEditSchedule = (schedule) => {
    if (!canEdit) { addToast('You do not have permission to edit schedules', 'warning'); return; }
    if (schedule.detailedApprovalStatus === 'APPROVED') { addToast('Cannot edit an approved schedule', 'warning'); return; }
    let selectedDepartments = [];
    if (schedule.selectedDepartments && Array.isArray(schedule.selectedDepartments) && schedule.selectedDepartments.length > 0) selectedDepartments = schedule.selectedDepartments;
    else if (schedule.departments && Array.isArray(schedule.departments) && schedule.departments.length > 0) selectedDepartments = schedule.departments.map(dept => ({ department: dept, selectedElements: schedule.auditElements || [] }));
    else if (schedule.department && schedule.department !== 'General' && !schedule.isSpecialEvent) selectedDepartments = [{ department: schedule.department, selectedElements: schedule.auditElements || [] }];
    
    let departmentToSelect = '';
    if (selectedDepartments.length > 0) departmentToSelect = selectedDepartments[0].department;
    else if (schedule.department && schedule.department !== 'General') departmentToSelect = schedule.department;
    
    setFormData({ 
      id: schedule.id, date: schedule.scheduledDate || schedule.date || '', 
      startTime: schedule.startTime || '09:00 AM', endTime: schedule.endTime || '10:00 AM', 
      selectedDepartments: selectedDepartments, auditorId: schedule.auditorId?.toString() || '', 
      auditeeId: schedule.auditeeId?.toString() || '', isSpecialEvent: schedule.isSpecialEvent || false, 
      specialEventType: schedule.specialEventType || '', auditType: schedule.auditType || globalAuditType, 
      status: schedule.status || 'SCHEDULED' 
    });
    setSelectedAuditDepartment(departmentToSelect);
    if (departmentToSelect) { 
      const teamInfo = getTeamMembersForDepartment(departmentToSelect); 
      setDepartmentTeamInfo(teamInfo); 
      fetchDepartmentUsers(departmentToSelect); 
    }
    setShowModal(true);
  };

  // Effects
  useEffect(() => {
    if (showModal && formData.date && formData.startTime && formData.endTime) {
      if (formData.isSpecialEvent && formData.specialEventType === 'LUNCH') { setConflictWarning(null); return; }
      let checkAuditorId = null; let checkAuditeeId = null;
      if (!formData.isSpecialEvent) { checkAuditorId = formData.auditorId; checkAuditeeId = formData.auditeeId; }
      else if (formData.specialEventType !== 'LUNCH') { checkAuditorId = formData.auditorId; checkAuditeeId = formData.auditeeId; }
      if (checkAuditorId || checkAuditeeId) {
        const conflict = checkTimeConflict(formData.date, formData.startTime, formData.endTime, checkAuditorId, checkAuditeeId, formData.isSpecialEvent, formData.specialEventType, formData.id);
        setConflictWarning(conflict);
      } else { setConflictWarning(null); }
    }
  }, [showModal, formData.date, formData.startTime, formData.endTime, formData.auditorId, formData.auditeeId, formData.isSpecialEvent, formData.specialEventType, formData.id]);

  useEffect(() => {
    if (selectedMonth && (!startDate || !endDate)) {
      const monthIdx = monthNumber[selectedMonth];
      const year = selectedMonth === 'Jan' || selectedMonth === 'Feb' || selectedMonth === 'Mar' ? selectedYear + 1 : selectedYear;
      const firstDay = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const lastDayStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(firstDay); setEndDate(lastDayStr);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { filterSchedulesByAuditType(); }, [globalAuditType, auditSchedules, filterSchedulesByAuditType]);

  useEffect(() => {
    const loadData = async () => { setLoading(true); await fetchUsers(); await fetchBasicSchedules(); await fetchDetailedSchedules(); setLoading(false); };
    loadData();
  }, [fetchUsers, fetchBasicSchedules, fetchDetailedSchedules]);

  const availableAuditors = getAvailableAuditors();
  const canEdit = isAuditManager;
  const canApprove = isTopManagement;
  const hasSchedules = auditSchedules.length > 0;

  // Loading State
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: FONT_FAMILY }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <circle cx="12" cy="12" r="10" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="12" cy="12" r="10" stroke={T.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
        </svg>
      </div>
    );
  }

  // Not Approved State
  if (approvalStatus !== 'APPROVED') {
    return (
      <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <button onClick={() => navigate('/form5')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, fontFamily: FONT_FAMILY }}>
            <FiArrowLeft /> Back to Form 5
          </button>
          <Card style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 16px', background: T.warningLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.warningBorder}` }}>
              <FiAlertCircle size={40} color={T.warning} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: T.text }}>Form 5 Not Approved Yet</h2>
            <p style={{ margin: '0 0 24px', color: T.textMuted, fontSize: 15 }}>
              Please complete and get approval for the basic schedule in Form 5 first.<br/>
              {monthDisplay[selectedMonth]} {selectedYear} is not approved.
            </p>
            <ActionButton onClick={() => navigate('/form5')} color="#FFF" bgColor={T.accent} style={{ margin: '0 auto' }}>Go to Form 5</ActionButton>
          </Card>
        </div>
      </div>
    );
  }

  // Main Render
  return (
     <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
      
      {/* Header */}
      <Card style={{ padding: 12, marginBottom: 8}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button 
              onClick={() => navigate('/schedule-calendar')} 
              style={{ width: 42, height: 42, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} 
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }} 
              onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
            >
              <FiArrowLeft size={18} />
            </button>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiFileText size={20} color={T.accent} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: T.text }}>Internal Audit Schedule</h1>
              <p style={{ margin: '2px 0 0', fontSize: 14, color: T.textMuted }}>{monthDisplay[selectedMonth]} {selectedYear}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: T.textMuted }}>Audit Type:</label>
              <select 
                value={globalAuditType} 
                onChange={(e) => setGlobalAuditType(e.target.value)} 
                disabled={!canEdit} 
                style={{ 
                  height: 40, padding: '0 36px 0 14px', fontSize: 14, fontWeight: 500, fontFamily: FONT_FAMILY, borderRadius: 8, 
                  border: `1px solid ${T.border}`, background: T.card, color: T.textValue, outline: 'none', cursor: 'pointer', 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, 
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', 
                  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' 
                }}
              >
                <option value="">All Types</option>
                {globalAuditTypesList.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <ActionButton onClick={handleDownloadPdf} loading={downloadingPdf} color="#FFF" bgColor={T.accent} icon={FiPrinter} style={{ height: 40, fontSize: 14 }}>PDF</ActionButton>
            <ActionButton onClick={handleExport} color="#FFF" bgColor={T.accent} borderColor={T.border} icon={FiDownload} style={{ height: 40, fontSize: 14 }}>Export</ActionButton>
            <button 
              onClick={() => { fetchDetailedSchedules(); }} 
              style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} 
              title="Refresh"
            >
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>
      </Card>

     <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
      {/* Header */}
      <Card style={{ padding: 13, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <FiCalendar size={16} color={T.accent} /> Date Range
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
            <div>
              <label style={labelStyle}>From Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!canEdit} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!canEdit} style={inputStyle} />
            </div>
          </div>
        </Card>

        {/* Schedule Table */}
        <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_FAMILY, fontSize: 15 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Area/Department/Event</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditor</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditee</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dateRange.map((dateInfo, idx) => {
                  const daySchedules = getSchedulesForDate(dateInfo.dateStr);
                  const isWeekend = dateInfo.isWeekend;
                  
                  if (isWeekend) {
                    return (
                      <tr key={idx} style={{ background: '#F8FAFC', borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '14px 16px', fontSize: 14, color: T.textMuted, fontWeight: 500 }}>
                          {dateInfo.displayDate}
                          <br/>
                          <span style={{ fontSize: 12, color: '#94A3B8' }}>{dateInfo.dayOfWeek}</span>
                        </td>
                        <td colSpan="5" style={{ padding: '14px 16px', fontSize: 14, color: T.textMuted, fontStyle: 'italic' }}>Weekend</td>
                      </tr>
                    );
                  }
                  
                  return (
                    <React.Fragment key={idx}>
                      <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${T.border}` }}>
                        <td colSpan="6" style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{dateInfo.displayDate}</span>
                            <span style={{ fontSize: 13, color: T.textMuted }}>{dateInfo.dayOfWeek}</span>
                            {daySchedules.length > 0 && (
                              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: T.accentLight, color: '#1E40AF', border: `1px solid ${T.accentBorder}` }}>
                                {daySchedules.filter(s => s.detailedApprovalStatus === 'APPROVED').length}/{daySchedules.length} Approved
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {daySchedules.length === 0 ? (
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '14px 16px', fontSize: 14, color: T.textValue }}>{dateInfo.displayDate}</td>
                          <td colSpan="4" style={{ padding: '14px 16px', fontSize: 14, color: T.textMuted, fontStyle: 'italic' }}>No schedules for this date</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {canEdit && (
                              <button 
                                onClick={() => handleAddSchedule(dateInfo.dateStr)} 
                                style={{ width: 36, height: 36, borderRadius: '50%', background: T.accentLight, border: `1px solid ${T.accentBorder}`, color: T.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} 
                                onMouseEnter={e => e.currentTarget.style.background = T.accent} 
                                onMouseLeave={e => e.currentTarget.style.background = T.accentLight}
                              >
                                <FiPlus size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        daySchedules.map((schedule, sIdx) => {
                          const statusStyle = schedule.status === 'COMPLETED' ? { bg: T.successLight, color: '#065F46', border: T.successBorder } :
                                            schedule.status === 'IN_PROGRESS' ? { bg: T.accentLight, color: '#1E40AF', border: T.accentBorder } :
                                            { bg: T.warningLight, color: '#92400E', border: T.warningBorder };
                          const approvalStyle = schedule.detailedApprovalStatus === 'APPROVED' ? { bg: T.successLight, color: '#065F46', border: T.successBorder } :
                                              schedule.detailedApprovalStatus === 'PENDING_APPROVAL' ? { bg: T.warningLight, color: '#92400E', border: T.warningBorder } :
                                              schedule.detailedApprovalStatus === 'REJECTED' ? { bg: T.errorLight, color: '#991B1B', border: T.errorBorder } :
                                              { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
                          
                          return (
                            <tr 
                              key={`${idx}-${sIdx}`} 
                              style={{ borderBottom: `1px solid ${T.border}`, background: schedule.isSpecialEvent ? '#F8FAFC' : 'transparent', transition: 'background 0.15s' }} 
                              onMouseEnter={e => { if(!schedule.isSpecialEvent) e.currentTarget.style.background = '#F8FAFC'; }} 
                              onMouseLeave={e => { if(!schedule.isSpecialEvent) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: 14 }}>
                                {schedule.fromDate && schedule.toDate && schedule.fromDate !== schedule.toDate ? (
                                  <div style={{ marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: T.purple }}>Date Range:</span>
                                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: T.purpleLight, color: '#5B21B6', border: `1px solid ${T.purpleBorder}` }}>Flexible</span>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: T.textValue }}>{schedule.fromDate} → {schedule.toDate}</div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>📅 {schedule.scheduledDate || schedule.date}</div>
                                )}
                                <div style={{ fontSize: 14, fontWeight: 600, color: T.textValue, fontFamily: 'monospace' }}>⏰ {schedule.startTime} - {schedule.endTime}</div>
                                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>📋 {schedule.auditType || globalAuditType || '-'}</div>
                              </td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: 14 }}>
                                {schedule.isSpecialEvent ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {schedule.specialEventType === 'OPENING' && <FiSunrise size={16} color={T.accent} />}
                                    {schedule.specialEventType === 'LUNCH' && <FiCoffee size={16} color={T.warning} />}
                                    {schedule.specialEventType === 'CLOSING' && <FiSunset size={16} color={T.purple} />}
                                    <span style={{ fontWeight: 600, color: T.textValue }}>
                                      {schedule.specialEventType === 'OPENING' && 'Opening Meeting'}
                                      {schedule.specialEventType === 'LUNCH' && 'Lunch Break'}
                                      {schedule.specialEventType === 'CLOSING' && 'Closing Meeting'}
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {schedule.departments?.map((dept, i) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent }}></div>
                                        <span style={{ color: T.textValue, fontSize: 14 }}>{dept}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: 14, color: T.textValue }}>{schedule.auditorName || '-'}</td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: 14, color: T.textValue }}>{schedule.auditeeName || '-'}</td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, width: 'fit-content' }}>
                                    {schedule.status || 'SCHEDULED'}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: approvalStyle.bg, color: approvalStyle.color, border: `1px solid ${approvalStyle.border}`, width: 'fit-content' }}>
                                    {schedule.detailedApprovalStatus === 'APPROVED' ? '✓ Approved' :
                                     schedule.detailedApprovalStatus === 'PENDING_APPROVAL' ? '⏳ Pending' :
                                     schedule.detailedApprovalStatus === 'REJECTED' ? '✗ Rejected' : '📝 Draft'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                                  {canEdit && (schedule.detailedApprovalStatus === 'DRAFT' || schedule.detailedApprovalStatus === 'REJECTED' || schedule.detailedApprovalStatus === 'CHANGE_REQUESTED') && (
                                    <>
                                      <button onClick={() => handleEditSchedule(schedule)} style={{ width: 32, height: 32, borderRadius: 6, background: T.accentLight, border: `1px solid ${T.accentBorder}`, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Edit"><FiEdit2 size={16} /></button>
                                      <button onClick={() => handleDelete(schedule.id)} style={{ width: 32, height: 32, borderRadius: 6, background: T.errorLight, border: `1px solid ${T.errorBorder}`, color: T.error, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Delete"><FiTrash2 size={16} /></button>
                                      {(schedule.detailedApprovalStatus === 'DRAFT' || schedule.detailedApprovalStatus === 'CHANGE_REQUESTED') && (
                                        <button onClick={() => handleSubmitScheduleForApproval(schedule.id)} style={{ width: 32, height: 32, borderRadius: 6, background: T.successLight, border: `1px solid ${T.successBorder}`, color: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Submit"><FiSend size={16} /></button>
                                      )}
                                    </>
                                  )}
                                  {canApprove && schedule.detailedApprovalStatus === 'PENDING_APPROVAL' && (
                                    <>
                                      <button onClick={() => handleApproveSchedule(schedule.id)} style={{ width: 32, height: 32, borderRadius: 6, background: T.successLight, border: `1px solid ${T.successBorder}`, color: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Approve"><FiCheck size={16} /></button>
                                      <button onClick={() => { setSelectedRejectDate(schedule.scheduledDate); window.tempScheduleId = schedule.id; setShowRejectModal(true); }} style={{ width: 32, height: 32, borderRadius: 6, background: T.errorLight, border: `1px solid ${T.errorBorder}`, color: T.error, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Reject"><FiX size={16} /></button>
                                      <button onClick={() => { setSelectedRejectDate(schedule.scheduledDate); window.tempScheduleId = schedule.id; setChangeRequestReason(''); setShowChangeRequestModal(true); }} style={{ width: 32, height: 32, borderRadius: 6, background: T.warningLight, border: `1px solid ${T.warningBorder}`, color: T.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Request Changes"><FiMessageSquare size={16} /></button>
                                    </>
                                  )}
                                  {schedule.detailedApprovalStatus === 'APPROVED' && canApprove && (
                                    <button onClick={() => { setSelectedRejectDate(schedule.scheduledDate); window.tempScheduleId = schedule.id; setChangeRequestReason(''); setShowChangeRequestModal(true); }} style={{ width: 32, height: 32, borderRadius: 6, background: T.warningLight, border: `1px solid ${T.warningBorder}`, color: T.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Request Changes"><FiMessageSquare size={16} /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {canEdit && dateRange.filter(d => !d.isWeekend).slice(0, 3).map(dateInfo => (
              <ActionButton key={dateInfo.dateStr} onClick={() => handleAddSchedule(dateInfo.dateStr)} color="#FFF" bgColor={T.accent} icon={FiPlus} style={{ height: 40, fontSize: 14 }}>
                Add {dateInfo.displayDate}
              </ActionButton>
            ))}
            {canEdit && (
              <ActionButton onClick={() => setShowBulkModal(true)} color="#FFF" bgColor={T.purple} icon={FiCalendar} style={{ height: 40, fontSize: 14 }}>
                Bulk Schedule
              </ActionButton>
            )}
          </div>
          {hasSchedules && canEdit && (
            <ActionButton onClick={handleSubmitAllDraftSchedules} loading={submitting} color="#FFF" bgColor={T.accent} icon={FiSend}>
              Submit All Draft Schedules
            </ActionButton>
          )}
        </div>

        {/* Legend */}
        <Card style={{ padding: 24 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 14, color: T.textMuted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiSunrise size={16} color={T.accent} /> Opening Meeting</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiCoffee size={16} color={T.warning} /> Lunch Break</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiSunset size={16} color={T.purple} /> Closing Meeting</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: '50%', background: T.warningLight, border: `1px solid ${T.warningBorder}` }}></div> Scheduled</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: '50%', background: T.accentLight, border: `1px solid ${T.accentBorder}` }}></div> In Progress</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: '50%', background: T.successLight, border: `1px solid ${T.successBorder}` }}></div> Completed</span>
          </div>
        </Card>
      </div>

      {/* Change Requested Banner */}
      {selectedMonth && approvalStatus === 'CHANGE_REQUESTED' && (
        <div style={{ padding: 24 }}>
          <AlertBanner type="warning" icon={FiMessageSquare} title="Changes Requested by Top Management" message={rejectionReason} footer="Please make the requested changes and resubmit." />
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div 
          onClick={() => { setShowModal(false); resetForm(); setSelectedAuditDepartment(''); }} 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: T.card, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', 
              display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', 
              border: `1px solid ${T.border}`, overflow: 'hidden' 
            }}
          >
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: T.text }}>{formData.id ? 'Edit Schedule' : 'Add Schedule'}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: T.textMuted }}>Schedule daily audit for department</p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); setSelectedAuditDepartment(''); }} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <FiX size={20} />
              </button>
            </div>
            <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {conflictWarning && (
                <AlertBanner type="error" icon={FiAlertCircle} title="Schedule Conflict!" message={
                  conflictWarning.type === 'auditor' ? `Auditor ${conflictWarning.conflict.auditorName} already scheduled` :
                  conflictWarning.type === 'auditee' ? `Auditee ${conflictWarning.conflict.auditeeName} already scheduled` :
                  'Another event already scheduled at this time'
                } />
              )}
              <div>
                <label style={labelStyle}>Department to Audit *</label>
                <select 
                  value={selectedAuditDepartment} 
                  onChange={(e) => {
                    const newDepartment = e.target.value; 
                    setSelectedAuditDepartment(newDepartment);
                    if (newDepartment && formData.date) {
                      const availableDepts = getAvailableDepartmentsForDate(formData.date);
                      const selectedDeptInfo = availableDepts.find(d => d.department === newDepartment);
                      if (selectedDeptInfo) setFormData(prev => ({ ...prev, selectedDepartments: [{ department: newDepartment, selectedElements: [...selectedDeptInfo.auditElements] }] }));
                    } else if (!newDepartment) setFormData(prev => ({ ...prev, selectedDepartments: [] }));
                    handleAuditDepartmentChange(newDepartment);
                  }} 
                  style={selectStyleModal}
                >
                  <option value="">Select Department</option>
                  {(() => {
                    const currentWeek = formData.date ? getWeekNumber(formData.date) : null;
                    const uniqueDepartments = new Map();
                    basicSchedules.forEach(schedule => {
                      if (schedule.department && schedule.department !== 'OPENING' && schedule.department !== 'CLOSING' && schedule.approvalStatus === 'APPROVED') {
                        if (!currentWeek || schedule.week === currentWeek) {
                          if (!uniqueDepartments.has(schedule.department)) uniqueDepartments.set(schedule.department, { department: schedule.department, week: schedule.week });
                        }
                      }
                    });
                    return Array.from(uniqueDepartments.values()).map((deptInfo, idx) => <option key={idx} value={deptInfo.department}>{deptInfo.department} (Week {deptInfo.week})</option>);
                  })()}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={formData.date || ''} onChange={(e) => setFormData({...formData, date: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Start Time *</label>
                  <select 
                    value={formData.startTime || ''} 
                    onChange={(e) => {
                      const newStartTime = e.target.value; 
                      let newEndTime = formData.endTime;
                      if (newEndTime && getTimeValue(newEndTime) <= getTimeValue(newStartTime)) newEndTime = '';
                      setFormData({...formData, startTime: newStartTime, endTime: newEndTime});
                    }} 
                    style={selectStyleModal}
                  >
                    <option value="">Select start time</option>
                    {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>End Time *</label>
                  <select 
                    value={formData.endTime || ''} 
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})} 
                    style={selectStyleModal}
                  >
                    <option value="">Select end time</option>
                    {timeOptions.filter(time => !formData.startTime || getTimeValue(time) > getTimeValue(formData.startTime)).map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 15, color: T.textValue }}>
                <input type="checkbox" checked={formData.isSpecialEvent || false} onChange={(e) => setFormData({...formData, isSpecialEvent: e.target.checked, specialEventType: '', departments: []})} style={{ accentColor: T.accent, width: 18, height: 18 }} />
                This is a Special Event (Opening/Lunch/Closing)
              </label>
              {formData.isSpecialEvent ? (
                <>
                  <div>
                    <label style={labelStyle}>Event Type *</label>
                    <select value={formData.specialEventType || ''} onChange={(e) => setFormData({...formData, specialEventType: e.target.value})} style={selectStyleModal}>
                      <option value="">Select Event Type</option>
                      <option value="OPENING">Opening Meeting</option>
                      <option value="LUNCH">Lunch Break</option>
                      <option value="CLOSING">Closing Meeting</option>
                    </select>
                  </div>
                  {formData.specialEventType !== 'LUNCH' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Auditor *</label>
                        <select value={formData.auditorId || ''} onChange={(e) => setFormData({...formData, auditorId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditor</option>
                          {selectedAuditDepartment ? departmentAuditors.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>) : <option disabled>Please select a department first</option>}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Auditee *</label>
                        <select value={formData.auditeeId || ''} onChange={(e) => setFormData({...formData, auditeeId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditee</option>
                          {selectedAuditDepartment ? departmentAuditees.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} {a.role === 'HOD' ? '(HOD)' : ''}</option>) : <option disabled>Please select a department first</option>}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>Select Departments & Audit Elements *</label>
                    <div style={{ padding: 16, border: `1px solid ${T.border}`, borderRadius: 8, maxHeight: 240, overflowY: 'auto', background: '#F8FAFC' }}>
                      {getAvailableDepartmentsForDate(formData.date).filter(deptInfo => !selectedAuditDepartment || deptInfo.department === selectedAuditDepartment).map(deptInfo => {
                        const departmentName = deptInfo.department;
                        const availableElements = deptInfo.auditElements || [];
                        const selectedDept = formData.selectedDepartments?.find(d => d.department === departmentName);
                        const selectedElements = selectedDept?.selectedElements || [];
                        return (
                          <div key={departmentName} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                              <input type="checkbox" checked={availableElements.length > 0 && selectedElements.length === availableElements.length} onChange={(e) => {
                                let updated = [...(formData.selectedDepartments || [])];
                                const existingIndex = updated.findIndex(d => d.department === departmentName);
                                if (e.target.checked) {
                                  if (existingIndex >= 0) updated[existingIndex].selectedElements = [...availableElements];
                                  else updated.push({ department: departmentName, selectedElements: [...availableElements] });
                                } else { if (existingIndex >= 0) updated.splice(existingIndex, 1); }
                                setFormData(prev => ({ ...prev, selectedDepartments: updated }));
                                if (departmentName === selectedAuditDepartment && !e.target.checked) setSelectedAuditDepartment('');
                              }} style={{ accentColor: T.accent, width: 18, height: 18 }} />
                              <span style={{ fontWeight: 600, color: T.text, fontSize: 15 }}>{departmentName}</span>
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginLeft: 28 }}>
                              {availableElements.map(element => (
                                <label key={element} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, cursor: 'pointer', borderRadius: 6, fontSize: 14, color: T.textValue }}>
                                  <input type="checkbox" checked={selectedElements.includes(element)} onChange={(e) => {
                                    let updated = [...(formData.selectedDepartments || [])];
                                    let deptIndex = updated.findIndex(d => d.department === departmentName);
                                    if (deptIndex === -1) { updated.push({ department: departmentName, selectedElements: [] }); deptIndex = updated.length - 1; }
                                    if (e.target.checked) updated[deptIndex].selectedElements = [...updated[deptIndex].selectedElements, element];
                                    else updated[deptIndex].selectedElements = updated[deptIndex].selectedElements.filter(el => el !== element);
                                    if (updated[deptIndex].selectedElements.length === 0) updated.splice(deptIndex, 1);
                                    setFormData(prev => ({ ...prev, selectedDepartments: updated }));
                                  }} style={{ accentColor: T.accent, width: 16, height: 16 }} />
                                  {element}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Auditor *</label>
                      {!selectedAuditDepartment ? <div style={{...inputStyle, display: 'flex', alignItems: 'center', color: T.textMuted}}>Select department first</div> : (
                        <select value={formData.auditorId || ''} onChange={(e) => setFormData({...formData, auditorId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditor from Team</option>
                          {(() => {
                            const allowedIds = new Set(Array.isArray(departmentTeamInfo.teamAuditorIds) ? departmentTeamInfo.teamAuditorIds : []);
                            const availableTeamMembers = departmentAuditors.filter(auditor => allowedIds.has(auditor.id));
                            if (availableTeamMembers.length === 0) return <option disabled>⚠️ No team auditors assigned</option>;
                            return availableTeamMembers.map(auditor => <option key={auditor.id} value={auditor.id}>👥 {auditor.firstName} {auditor.lastName}</option>);
                          })()}
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Auditee *</label>
                      {!selectedAuditDepartment ? <div style={{...inputStyle, display: 'flex', alignItems: 'center', color: T.textMuted}}>Select department first</div> : (
                        <select value={formData.auditeeId || ''} onChange={(e) => setFormData({...formData, auditeeId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditee</option>
                          {(() => {
                            const selectedAuditeeIds = new Set(departmentTeamInfo.auditeeIds || []);
                            const availableAuditees = departmentAuditees.filter(auditee => selectedAuditeeIds.has(auditee.id));
                            if (availableAuditees.length === 0) return <option disabled>No matching auditees found</option>;
                            return availableAuditees.map(auditee => <option key={auditee.id} value={auditee.id}>{auditee.firstName} {auditee.lastName} {auditee.role === 'HOD' ? ' (HOD)' : ''}</option>);
                          })()}
                        </select>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label style={labelStyle}>Status</label>
                <select value={formData.status || 'SCHEDULED'} onChange={(e) => setFormData({...formData, status: e.target.value})} style={selectStyleModal}>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <ActionButton onClick={() => { setShowModal(false); resetForm(); setSelectedAuditDepartment(''); }} color={T.textValue} bgColor={T.card} borderColor={T.border}>Cancel</ActionButton>
              <ActionButton onClick={handleSave} loading={saving} disabled={!selectedAuditDepartment || !formData.auditorId || !formData.auditeeId} color="#FFF" bgColor={T.accent} icon={FiSave}>
                {formData.id ? 'Update Schedule' : 'Add Schedule'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Schedule Modal */}
      {showBulkModal && (
        <div 
          onClick={() => { setShowBulkModal(false); setBulkSelectedAuditDepartment(''); }} 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: T.card, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', 
              display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', 
              border: `1px solid ${T.border}`, overflow: 'hidden' 
            }}
          >
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: T.text }}>Bulk Schedule</h3>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: T.textMuted }}>Schedule same audit for multiple dates</p>
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkSelectedAuditDepartment(''); }} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <FiX size={20} />
              </button>
            </div>
            <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>From Date *</label>
                  <input type="date" value={bulkData.fromDate} onChange={(e) => { setBulkData({...bulkData, fromDate: e.target.value, toDate: ''}); setBulkSelectedAuditDepartment(''); }} min={startDate} max={endDate} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>To Date *</label>
                  <input type="date" value={bulkData.toDate} onChange={(e) => { setBulkData({...bulkData, toDate: e.target.value}); setBulkSelectedAuditDepartment(''); }} min={bulkData.fromDate || startDate} max={endDate} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Department to Audit *</label>
                <select 
                  value={bulkSelectedAuditDepartment} 
                  onChange={(e) => {
                    const newDepartment = e.target.value; 
                    setBulkSelectedAuditDepartment(newDepartment);
                    if (newDepartment && bulkData.fromDate) {
                      const availableDepts = getAvailableDepartmentsForBulk();
                      const selectedDeptInfo = availableDepts.find(d => d.department === newDepartment);
                      if (selectedDeptInfo) setBulkData(prev => ({ ...prev, selectedDepartments: [{ department: newDepartment, selectedElements: [...selectedDeptInfo.auditElements] }] }));
                    } else if (!newDepartment) setBulkData(prev => ({ ...prev, selectedDepartments: [] }));
                  }} 
                  style={selectStyleModal}
                >
                  <option value="">Select Department</option>
                  {getAvailableDepartmentsForBulk().map((deptInfo, idx) => <option key={idx} value={deptInfo.department}>{deptInfo.department}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Start Time *</label>
                  <select 
                    value={bulkData.startTime || ''} 
                    onChange={(e) => {
                      const newStartTime = e.target.value; 
                      let newEndTime = bulkData.endTime;
                      if (newEndTime && getTimeValue(newEndTime) <= getTimeValue(newStartTime)) newEndTime = '';
                      setBulkData({...bulkData, startTime: newStartTime, endTime: newEndTime});
                    }} 
                    style={selectStyleModal}
                  >
                    <option value="">Select start time</option>
                    {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>End Time *</label>
                  <select 
                    value={bulkData.endTime || ''} 
                    onChange={(e) => setBulkData({...bulkData, endTime: e.target.value})} 
                    style={selectStyleModal}
                  >
                    <option value="">Select end time</option>
                    {timeOptions.filter(time => !bulkData.startTime || getTimeValue(time) > getTimeValue(bulkData.startTime)).map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 15, color: T.textValue }}>
                <input type="checkbox" checked={bulkData.isSpecialEvent || false} onChange={(e) => setBulkData({...bulkData, isSpecialEvent: e.target.checked, specialEventType: '', selectedDepartments: []})} style={{ accentColor: T.accent, width: 18, height: 18 }} />
                This is a Special Event (Opening/Lunch/Closing)
              </label>
              {bulkData.isSpecialEvent ? (
                <>
                  <div>
                    <label style={labelStyle}>Event Type *</label>
                    <select value={bulkData.specialEventType || ''} onChange={(e) => setBulkData({...bulkData, specialEventType: e.target.value})} style={selectStyleModal}>
                      <option value="">Select Event Type</option>
                      <option value="OPENING">Opening Meeting</option>
                      <option value="LUNCH">Lunch Break</option>
                      <option value="CLOSING">Closing Meeting</option>
                    </select>
                  </div>
                  {bulkData.specialEventType !== 'LUNCH' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Auditor *</label>
                        <select value={bulkData.auditorId || ''} onChange={(e) => setBulkData({...bulkData, auditorId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditor</option>
                          {availableAuditors.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Auditee *</label>
                        <select value={bulkData.auditeeId || ''} onChange={(e) => setBulkData({...bulkData, auditeeId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditee</option>
                          {getSortedAuditees().map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>Select Audit Elements *</label>
                    <div style={{ padding: 16, border: `1px solid ${T.border}`, borderRadius: 8, maxHeight: 200, overflowY: 'auto', background: '#F8FAFC' }}>
                      {!bulkSelectedAuditDepartment ? <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 14 }}>Please select a department first</p> : (() => {
                        const availableDepts = getAvailableDepartmentsForBulk();
                        const deptInfo = availableDepts.find(d => d.department === bulkSelectedAuditDepartment);
                        if (!deptInfo || deptInfo.auditElements.length === 0) return <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 14 }}>No audit elements available</p>;
                        const selectedDept = bulkData.selectedDepartments?.find(d => d.department === bulkSelectedAuditDepartment);
                        const selectedElements = selectedDept?.selectedElements || [];
                        return (
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer', fontWeight: 600, color: T.text, fontSize: 15 }}>
                              <input type="checkbox" checked={selectedElements.length === deptInfo.auditElements.length} onChange={(e) => {
                                let updated = [...(bulkData.selectedDepartments || [])];
                                const existingIndex = updated.findIndex(d => d.department === bulkSelectedAuditDepartment);
                                if (e.target.checked) {
                                  if (existingIndex >= 0) updated[existingIndex].selectedElements = [...deptInfo.auditElements];
                                  else updated.push({ department: bulkSelectedAuditDepartment, selectedElements: [...deptInfo.auditElements] });
                                } else { if (existingIndex >= 0) updated.splice(existingIndex, 1); }
                                setBulkData(prev => ({ ...prev, selectedDepartments: updated }));
                              }} style={{ accentColor: T.accent, width: 18, height: 18 }} />
                              {bulkSelectedAuditDepartment}
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginLeft: 28 }}>
                              {deptInfo.auditElements.map(element => (
                                <label key={element} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, cursor: 'pointer', borderRadius: 6, fontSize: 14, color: T.textValue }}>
                                  <input type="checkbox" checked={selectedElements.includes(element)} onChange={(e) => {
                                    let updated = [...(bulkData.selectedDepartments || [])];
                                    let deptIndex = updated.findIndex(d => d.department === bulkSelectedAuditDepartment);
                                    if (deptIndex === -1) { updated.push({ department: bulkSelectedAuditDepartment, selectedElements: [] }); deptIndex = updated.length - 1; }
                                    if (e.target.checked) updated[deptIndex].selectedElements = [...updated[deptIndex].selectedElements, element];
                                    else updated[deptIndex].selectedElements = updated[deptIndex].selectedElements.filter(el => el !== element);
                                    if (updated[deptIndex].selectedElements.length === 0) updated.splice(deptIndex, 1);
                                    setBulkData(prev => ({ ...prev, selectedDepartments: updated }));
                                  }} style={{ accentColor: T.accent, width: 16, height: 16 }} />
                                  {element}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Auditor *</label>
                      {!bulkSelectedAuditDepartment ? <div style={{...inputStyle, display: 'flex', alignItems: 'center', color: T.textMuted}}>Select department first</div> : (
                        <select value={bulkData.auditorId || ''} onChange={(e) => setBulkData({...bulkData, auditorId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditor from Team</option>
                          {availableAuditors.filter(auditor => {
                            const teamInfo = getTeamMembersForDepartment(bulkSelectedAuditDepartment, bulkData.fromDate);
                            return (teamInfo.teamAuditorIds || []).includes(auditor.id);
                          }).map(a => <option key={a.id} value={a.id}>👥 {a.firstName} {a.lastName}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Auditee *</label>
                      {!bulkSelectedAuditDepartment ? <div style={{...inputStyle, display: 'flex', alignItems: 'center', color: T.textMuted}}>Select department first</div> : (
                        <select value={bulkData.auditeeId || ''} onChange={(e) => setBulkData({...bulkData, auditeeId: e.target.value})} style={selectStyleModal}>
                          <option value="">Select Auditee</option>
                          {(() => {
                            const teamInfo = getTeamMembersForDepartment(bulkSelectedAuditDepartment, bulkData.fromDate);
                            const selectedAuditeeIds = new Set(teamInfo.auditeeIds || []);
                            return getSortedAuditees().filter(auditee => selectedAuditeeIds.has(auditee.id)).map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} {a.role === 'HOD' ? ' (HOD)' : ''}</option>);
                          })()}
                        </select>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label style={labelStyle}>Status</label>
                <select value={bulkData.status} onChange={(e) => setBulkData({...bulkData, status: e.target.value})} style={selectStyleModal}>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <ActionButton onClick={() => { setShowBulkModal(false); setBulkSelectedAuditDepartment(''); }} color={T.textValue} bgColor={T.card} borderColor={T.border}>Cancel</ActionButton>
              <ActionButton onClick={handleBulkSchedule} loading={saving} disabled={!bulkSelectedAuditDepartment || !bulkData.auditorId || !bulkData.auditeeId || !bulkData.startTime || !bulkData.endTime} color="#FFF" bgColor={T.purple} icon={FiCalendar}>
                Create Bulk Schedules
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div 
          onClick={() => { setShowRejectModal(false); setRejectionReason(''); setSelectedRejectDate(null); window.tempScheduleId = null; }} 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: T.card, borderRadius: 16, width: '100%', maxWidth: 480, 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: `1px solid ${T.border}`, overflow: 'hidden' 
            }}
          >
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.errorLight, border: `1px solid ${T.errorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiAlertTriangle size={22} color={T.error} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Reject Schedule</h3>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: T.textMuted }}>Please provide a reason for rejection:</p>
              </div>
            </div>
            <div style={{ padding: '24px 32px' }}>
              <textarea 
                value={rejectionReason} 
                onChange={(e) => setRejectionReason(e.target.value)} 
                rows={5} 
                placeholder="Enter rejection reason..." 
                autoFocus 
                style={{ 
                  width: '100%', padding: 14, fontSize: 15, fontFamily: FONT_FAMILY, borderRadius: 8, 
                  border: `1px solid ${T.border}`, background: '#F8FAFC', color: T.textValue, 
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box' 
                }} 
              />
            </div>
            <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <ActionButton onClick={() => { setShowRejectModal(false); setRejectionReason(''); setSelectedRejectDate(null); window.tempScheduleId = null; }} color={T.textValue} bgColor={T.card} borderColor={T.border}>Cancel</ActionButton>
              <ActionButton onClick={() => { if (window.tempScheduleId) { handleRejectSchedule(window.tempScheduleId); window.tempScheduleId = null; } else { handleRejectDate(); } }} loading={submitting} color="#FFF" bgColor={T.error} icon={FiX}>Confirm Reject</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && (
        <div 
          onClick={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); window.tempScheduleId = null; setSelectedRejectDate = null; }} 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: T.card, borderRadius: 16, width: '100%', maxWidth: 480, 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: `1px solid ${T.border}`, overflow: 'hidden' 
            }}
          >
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.warningLight, border: `1px solid ${T.warningBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiMessageSquare size={22} color={T.warning} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Request Changes</h3>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: T.textMuted }}>Please provide details about what changes are needed:</p>
              </div>
            </div>
            <div style={{ padding: '24px 32px' }}>
              <textarea 
                value={changeRequestReason} 
                onChange={(e) => setChangeRequestReason(e.target.value)} 
                rows={5} 
                placeholder="Describe the changes required..." 
                autoFocus 
                style={{ 
                  width: '100%', padding: 14, fontSize: 15, fontFamily: FONT_FAMILY, borderRadius: 8, 
                  border: `1px solid ${T.border}`, background: '#F8FAFC', color: T.textValue, 
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box' 
                }} 
              />
            </div>
            <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <ActionButton onClick={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); window.tempScheduleId = null; setSelectedRejectDate(null); }} color={T.textValue} bgColor={T.card} borderColor={T.border}>Cancel</ActionButton>
              <ActionButton onClick={() => { if (window.tempScheduleId) { handleRequestChanges(window.tempScheduleId); window.tempScheduleId = null; } }} loading={submitting} color="#FFF" bgColor={T.warning} icon={FiMessageSquare}>Submit Request</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Form5DetailedView;