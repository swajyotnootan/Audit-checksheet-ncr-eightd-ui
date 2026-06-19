// src/components/forms/Form5DetailedView.jsx
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

// Add this helper function to convert time to number for comparison
const getTimeValue = (timeStr) => {
  if (!timeStr) return 0;
  
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  
  let hour = parseInt(hours);
  const minute = parseInt(minutes);
  
  if (modifier === 'PM' && hour !== 12) {
    hour += 12;
  }
  if (modifier === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return hour + (minute / 60);
};

// Generate time options from 9 AM to 5 PM
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


// Add this after the imports, before the component declaration
const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

const monthNumber = {
  "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
  "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
};

const Form5DetailedView = () => {
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { year, month, preSelectedDepartment, startDate: preStartDate, endDate: preEndDate } = location.state || {};
  
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
  
  // Date-wise approval states
  const [submittingDate, setSubmittingDate] = useState(null);
  const [dateApprovalStatus, setDateApprovalStatus] = useState({});
  const [selectedRejectDate, setSelectedRejectDate] = useState(null);
  
  // Global Audit Type for the entire month
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
    auditObjective: '',
    auditScope: '',
    leadAuditorId: null,
    leadAuditorName: '',
    teamAuditorIds: [],
    teamAuditorNames: [],
    documentRevision: '1.0',
    preparedBy: '',
    approvedBy: ''
  });
  
  const [formData, setFormData] = useState({
    id: null,
    date: '',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    selectedDepartments: [],  // ✅ Array of {department, selectedElements}
    auditorId: '',
    auditeeId: '',
    isSpecialEvent: false,
    specialEventType: '',
    auditType: '',
    status: 'SCHEDULED'
  });

  // Add this new state in the component (after other useState declarations)
const [showBulkModal, setShowBulkModal] = useState(false);
const [bulkSelectedAuditDepartment, setBulkSelectedAuditDepartment] = useState('');
const [departmentTeamInfo, setDepartmentTeamInfo] = useState({
  leadAuditorId: null,
  leadAuditorName: null,
  teamAuditorIds: [],
  teamAuditorNames: [],
  auditeeIds: [],      // ✅ ADD THIS
  auditeeNames: []     // ✅ ADD THIS
});
const [bulkData, setBulkData] = useState({
  fromDate: '',
  toDate: '',
  startTime: '09:00 AM',
  endTime: '10:00 AM',
  selectedDepartments: [],
  auditorId: '',
  auditeeId: '',
  auditType: '',
  status: 'SCHEDULED',
  isSpecialEvent: false,
  specialEventType: ''
});

// Add this function to handle bulk schedule creation
const handleBulkSchedule = async () => {
  if (!bulkData.fromDate || !bulkData.toDate) {
    addToast('Please select From Date and To Date', 'error');
    return;
  }

  const fromDate = new Date(bulkData.fromDate);
  const toDate = new Date(bulkData.toDate);
  
  if (fromDate > toDate) {
    addToast('From Date must be before To Date', 'error');
    return;
  }

  // Validation
  if (bulkData.isSpecialEvent) {
    if (!bulkData.specialEventType) {
      addToast('Please select event type', 'error');
      return;
    }
    if (bulkData.specialEventType !== 'LUNCH') {
      if (!bulkData.auditorId || !bulkData.auditeeId) {
        addToast('Please select Auditor and Auditee for Opening/Closing Meeting', 'error');
        return;
      }
    }
  } else {
    if (!bulkData.selectedDepartments || bulkData.selectedDepartments.length === 0) {
      addToast('Please select at least one department with audit elements', 'error');
      return;
    }
    const hasElements = bulkData.selectedDepartments.some(d => d.selectedElements && d.selectedElements.length > 0);
    if (!hasElements) {
      addToast('Please select at least one audit element for the selected departments', 'error');
      return;
    }
    if (!bulkData.auditorId || !bulkData.auditeeId) {
      addToast('Please select Auditor and Auditee', 'error');
      return;
    }
  }

  setSaving(true);

  try {
    // ✅ CREATE A SINGLE SCHEDULE with date range
    // Choose the first date as the "scheduledDate" for display
    const firstDate = new Date(fromDate);
    const scheduledDateStr = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}-${String(firstDate.getDate()).padStart(2, '0')}`;
    
    const saveData = {
      id: null,
      planYear: selectedYear,
      month: selectedMonth,
      department: bulkData.isSpecialEvent 
        ? (bulkData.specialEventType === 'OPENING' ? 'Opening Meeting' : 
           bulkData.specialEventType === 'CLOSING' ? 'Closing Meeting' : 'Lunch Break')
        : bulkData.selectedDepartments?.map(d => d.department).join(', ') || 'General',
      week: getWeekNumber(scheduledDateStr),
      scheduledDate: scheduledDateStr,  // Primary date for display
      fromDate: bulkData.fromDate,      // ✅ START OF DATE RANGE
      toDate: bulkData.toDate,          // ✅ END OF DATE RANGE
      timeSlot: `${bulkData.startTime} - ${bulkData.endTime}`,
      startTime: bulkData.startTime,
      endTime: bulkData.endTime,
      auditorId: (bulkData.auditorId && bulkData.specialEventType !== 'LUNCH') ? parseInt(bulkData.auditorId) : null,
      auditeeId: (bulkData.auditeeId && bulkData.specialEventType !== 'LUNCH') ? parseInt(bulkData.auditeeId) : null,
      status: bulkData.status,
      departments: bulkData.isSpecialEvent ? [] : (bulkData.selectedDepartments?.map(d => d.department) || []),
      auditElements: bulkData.isSpecialEvent ? [] : (bulkData.selectedDepartments?.flatMap(d => d.selectedElements) || []),
      selectedDepartments: bulkData.isSpecialEvent ? [] : (bulkData.selectedDepartments || []),
      isSpecialEvent: bulkData.isSpecialEvent || false,
      specialEventType: bulkData.specialEventType || '',
      auditType: bulkData.auditType || globalAuditType,
      auditNumber: auditNumber,
      // ✅ ADD PREPARED BY INFORMATION FROM HEADER DATA
      preparedByName: headerData.preparedBy || user?.name || user?.username,
      preparedByPosition: 'Audit Manager'  // Or get from user role
    };

    console.log('Creating single schedule with date range and prepared by:', saveData);
    
    await auditScheduleApi.saveDetailedSchedule(saveData, user?.id);
    addToast(`✅ Schedule created for date range ${bulkData.fromDate} to ${bulkData.toDate}`, 'success');
    
    setShowBulkModal(false);
    resetBulkForm();
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error creating schedule:', error);
    addToast('Failed to create schedule', 'error');
  } finally {
    setSaving(false);
  }
};
const resetBulkForm = () => {
  setBulkData({
    fromDate: '',
    toDate: '',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    selectedDepartments: [],
    auditorId: '',
    auditeeId: '',
    auditType: '',
    status: 'SCHEDULED',
    isSpecialEvent: false,
    specialEventType: ''
  });
};


 const getWeekNumber = (dateStr) => {
  if (!dateStr) return 'W-1';
  const date = new Date(dateStr);
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const dayOfMonth = date.getDate();
  let weekNum = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  
  // Week 1-6 (max 6 weeks)
  if (weekNum < 1) weekNum = 1;
  if (weekNum > 6) weekNum = 6;
  
  return `W-${weekNum}`;
};
// Add this helper to get available departments for bulk (using same logic)
// Get available departments for bulk schedule based on date range weeks
const getAvailableDepartmentsForBulk = useCallback(() => {
  if (!bulkData.fromDate || !bulkData.toDate) return [];
  
  const fromDate = new Date(bulkData.fromDate);
  const toDate = new Date(bulkData.toDate);
  
  // Get all unique weeks in the date range
  const weeksInRange = new Set();
  for (let dt = new Date(fromDate); dt <= toDate; dt.setDate(dt.getDate() + 1)) {
    const dateStr = dt.toISOString().split('T')[0];
    const weekNum = getWeekNumber(dateStr);
    weeksInRange.add(weekNum);
  }
  
  console.log(`Date range: ${bulkData.fromDate} to ${bulkData.toDate}`);
  console.log(`Weeks in range:`, Array.from(weeksInRange));
  
  const departmentsMap = new Map();
  
  // Filter basicSchedules by weeks in the date range
  const relevantSchedules = basicSchedules.filter(schedule => 
    weeksInRange.has(schedule.week) && 
    schedule.department && 
    schedule.department !== 'OPENING' && 
    schedule.department !== 'CLOSING'
  );
  
  console.log(`Found ${relevantSchedules.length} relevant schedules for weeks:`, relevantSchedules);
  
  relevantSchedules.forEach(schedule => {
    let auditElements = [];
    if (schedule.auditElements) {
      if (typeof schedule.auditElements === 'string') {
        try { auditElements = JSON.parse(schedule.auditElements); } catch(e) {}
      } else if (Array.isArray(schedule.auditElements)) {
        auditElements = schedule.auditElements;
      }
    }
    
    // Filter by global audit type
    let filteredElements = auditElements;
    if (globalAuditType) {
      filteredElements = auditElements.filter(element => 
        element.toLowerCase().includes(globalAuditType.toLowerCase())
      );
    }
    
    if (filteredElements.length > 0 && !departmentsMap.has(schedule.department)) {
      departmentsMap.set(schedule.department, {
        department: schedule.department,
        auditElements: filteredElements
      });
    }
  });
  
  return Array.from(departmentsMap.values());
}, [basicSchedules, bulkData.fromDate, bulkData.toDate, globalAuditType, getWeekNumber]);

  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  const timeOptions = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
  ];

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

  // ✅ UPDATED: Use filteredAuditSchedules instead of auditSchedules
  const getSchedulesForDate = (dateStr) => {
    return filteredAuditSchedules.filter(s => (s.scheduledDate === dateStr || s.date === dateStr))
      .sort((a, b) => {
        const timeA = convertToMinutes(a.startTime);
        const timeB = convertToMinutes(b.startTime);
        
        // If times are equal, sort by Department name for better organization
        if (timeA === timeB) {
          const deptA = Array.isArray(a.departments) && a.departments.length > 0 ? a.departments[0] : '';
          const deptB = Array.isArray(b.departments) && b.departments.length > 0 ? b.departments[0] : '';
          return deptA.localeCompare(deptB);
        }
        
        return timeA - timeB;
      });
  };

  // Get week number from date


  // Get available departments for a specific date/week (from Form 5)
// Get available departments with their audit elements for a specific date/week (from Form 5)
// Get available departments with their audit elements for a specific date/week 
// Get available departments for a specific date/week (from Form 5)
// Get available departments for a specific date/week (from Form 5)
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
      
      // ✅ Filter by global audit type
      let filteredElements = auditElements;
      if (globalAuditType && globalAuditType !== '') {
        filteredElements = auditElements.filter(element => 
          element.toLowerCase().includes(globalAuditType.toLowerCase())
        );
      }
      
      // ✅ ONLY show department if it has the selected audit type (or if no audit type selected)
      const shouldShowDepartment = !globalAuditType || filteredElements.length > 0;
      
      if (shouldShowDepartment) {
        departmentsMap.set(schedule.department, {
          department: schedule.department,
          auditElements: filteredElements
        });
      }
    }
  });
  
  console.log(`✅ Found ${departmentsMap.size} departments for week ${weekNum} with audit type "${globalAuditType}":`, Array.from(departmentsMap.keys()));
  
  return Array.from(departmentsMap.values());
};
  // Get available audit types for the entire month (from Form 5)
// Get available audit types for the entire month (from Form 5)
const getAllAvailableAuditTypes = useCallback(() => {
  const auditTypesSet = new Set();
  
  basicSchedules.forEach(schedule => {
    if (schedule.auditElements) {
      let auditElements = schedule.auditElements;
      if (typeof auditElements === 'string') {
        try {
          auditElements = JSON.parse(auditElements);
        } catch(e) {
          auditElements = [];
        }
      }
      auditElements.forEach(element => {
        if (element && element.trim()) {
          auditTypesSet.add(element);
        }
      });
    }
  });
  
  const types = Array.from(auditTypesSet);
  console.log('Available audit types:', types);
  return types;
}, [basicSchedules]);

// Check if a specific audit element is already scheduled for a date
const isElementScheduledForDate = (dateStr, element) => {
  const schedulesOnDate = auditSchedules.filter(s => s.scheduledDate === dateStr);
  return schedulesOnDate.some(schedule => {
    let elements = [];
    if (schedule.auditElements) {
      if (typeof schedule.auditElements === 'string') {
        try {
          elements = JSON.parse(schedule.auditElements);
        } catch(e) {}
      } else if (Array.isArray(schedule.auditElements)) {
        elements = schedule.auditElements;
      }
    }
    return elements.includes(element);
  });
};

  const getAvailableAuditors = useCallback(() => {
    const auditorIds = [];
    if (headerData.leadAuditorId) auditorIds.push(headerData.leadAuditorId);
    if (headerData.teamAuditorIds) {
      const teamIds = Array.isArray(headerData.teamAuditorIds) ? headerData.teamAuditorIds : JSON.parse(headerData.teamAuditorIds || '[]');
      auditorIds.push(...teamIds);
    }
    if (auditorIds.length === 0) return auditors;
    
    return auditors
      .filter(a => auditorIds.includes(a.id))
      .sort((a, b) => {
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

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const auditorsList = await auditScheduleApi.getAllAuditors();
      setAuditors(auditorsList || []);
      const auditeesList = await auditScheduleApi.getAuditees();
      setAuditees(auditeesList || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  
const getTeamMembersForDepartment = useCallback((departmentName, dateStr = null) => {
  console.log(`🔍 Looking for team for department: ${departmentName}, date: ${dateStr}`);
  
  // Get the week number if date is provided
  const targetWeek = dateStr ? getWeekNumber(dateStr) : null;
  
  let matchedSchedule = null;
  
  for (const schedule of basicSchedules) {
    if (schedule.department === departmentName) {
      const scheduleWeek = schedule.week;
      const isApproved = schedule.approvalStatus === 'APPROVED';
      
      if (targetWeek && scheduleWeek === targetWeek && isApproved) {
        matchedSchedule = schedule;
        console.log(`✅ Found schedule for ${departmentName} in week ${targetWeek}:`, schedule);
        break;
      } else if (!targetWeek && isApproved) {
        matchedSchedule = schedule;
        console.log(`✅ Found schedule for ${departmentName} (no date):`, schedule);
        break;
      }
    }
  }
  
  if (!matchedSchedule) {
    console.log(`⚠️ No approved schedule found for ${departmentName}`);
    return { 
      leadAuditorId: null, 
      leadAuditorName: null, 
      teamAuditorIds: [], 
      teamAuditorNames: [],
      auditeeIds: [],
      auditeeNames: []
    };
  }

  // ✅ FIX: Check BOTH teamAuditorIds AND coAuditorIds for co-auditors
  let teamIds = [];
  let teamNames = [];
  
  // Try teamAuditorIds first
  if (matchedSchedule.teamAuditorIds) {
    teamIds = matchedSchedule.teamAuditorIds;
    if (typeof teamIds === 'string') {
      try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; }
    }
  }
  
  // If no teamAuditorIds, try coAuditorIds
  if (teamIds.length === 0 && matchedSchedule.coAuditorIds) {
    teamIds = matchedSchedule.coAuditorIds;
    if (typeof teamIds === 'string') {
      try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; }
    }
    console.log(`✅ Found coAuditorIds:`, teamIds);
  }
  
  // Parse team auditor names
  if (matchedSchedule.teamAuditorNames) {
    teamNames = matchedSchedule.teamAuditorNames;
    if (typeof teamNames === 'string') {
      try { teamNames = JSON.parse(teamNames); } catch(e) { teamNames = []; }
    }
  }
  
  // If no teamAuditorNames, try coAuditorNames
  if (teamNames.length === 0 && matchedSchedule.coAuditorNames) {
    teamNames = matchedSchedule.coAuditorNames;
    if (typeof teamNames === 'string') {
      try { teamNames = JSON.parse(teamNames); } catch(e) { teamNames = []; }
    }
    console.log(`✅ Found coAuditorNames:`, teamNames);
  }
  
  // Parse auditee IDs (check multiple possible field names)
  let auditeeIds = [];
  let auditeeNames = [];
  
  if (matchedSchedule.auditeeIds) {
    auditeeIds = matchedSchedule.auditeeIds;
    if (typeof auditeeIds === 'string') {
      try { auditeeIds = JSON.parse(auditeeIds); } catch(e) { auditeeIds = []; }
    }
  } else if (matchedSchedule.auditeeIdList) {
    auditeeIds = matchedSchedule.auditeeIdList;
    if (typeof auditeeIds === 'string') {
      try { auditeeIds = JSON.parse(auditeeIds); } catch(e) { auditeeIds = []; }
    }
  }
  
  if (matchedSchedule.auditeeNames) {
    auditeeNames = matchedSchedule.auditeeNames;
    if (typeof auditeeNames === 'string') {
      try { auditeeNames = JSON.parse(auditeeNames); } catch(e) { auditeeNames = []; }
    }
  }

  // ✅ IMPORTANT: If we have IDs but no names, fetch user details
  if (teamIds.length > 0 && teamNames.length === 0) {
    console.log("Fetching names for team IDs:", teamIds);
    // Try to get names from the departmentAuditors list or fetch from API
    // For now, use placeholder names
    teamNames = teamIds.map(id => `Co-Auditor ${id}`);
  }

  const result = {
    leadAuditorId: matchedSchedule.leadAuditorId || matchedSchedule.auditorId,
    leadAuditorName: matchedSchedule.leadAuditorName || matchedSchedule.auditorName,
    teamAuditorIds: teamIds,  // This should contain co-auditor IDs
    teamAuditorNames: teamNames,
    auditeeIds: auditeeIds,
    auditeeNames: auditeeNames
  };
  
  console.log(`✅ Team info for ${departmentName}:`, {
    lead: result.leadAuditorId,
    leadName: result.leadAuditorName,
    teamIds: result.teamAuditorIds,
    teamNames: result.teamAuditorNames
  });
  
  return result;
}, [basicSchedules, getWeekNumber]);

// ✅ ADD THIS MAPPING CONSTANT inside the component (before fetchDepartmentUsers)
const departmentDisplayToEnum = {
  "HR": "HR",
  "R&D": "ENGG",
  "Purchase": "PURCHASE",
  "RMS": "STORES_DESPATCH",
  "SQA": "QA",
  "PPC": "PPC",
  "Production": "PRODUCTION",
  "QA/QC": "QA",           // ✅ QA/QC maps to QA enum
  "FGS": "STORES_DESPATCH",
  "Marketing": "MARKETING",
  "IMS (BE)": "MR",
  "Maintenance": "PLANT_MAINTENANCE",
  "Management": "UNIT_HEAD",
  "Plant Maintenance": "PLANT_MAINTENANCE",
  "Tool Maintenance": "TOOL_MAINTENANCE",
  "Stores & Despatch": "STORES_DESPATCH"
};

// ✅ REPLACE YOUR EXISTING fetchDepartmentUsers WITH THIS
const fetchDepartmentUsers = useCallback(async (departmentCode) => {
  if (!departmentCode) {
    setDepartmentAuditors([]);
    setDepartmentAuditees([]);
    return;
  }
  
  // ✅ Convert Display Name to Enum Value using the map
  const enumValue = departmentDisplayToEnum[departmentCode] || departmentCode.toUpperCase().replace(/[&\s\/]+/g, '_');
  
  console.log(`🔍 Fetching department users for: ${departmentCode} → enum: ${enumValue}`);
  
  setLoadingDepartmentUsers(true);
  try {
    // Fetch auditors for this department using the ENUM value
    const auditorsRes = await axios.get(
      `${API_BASE}/audit-schedule/auditors/by-department/${encodeURIComponent(enumValue)}`,
      { withCredentials: true }
    );
    setDepartmentAuditors(auditorsRes.data || []);
    
    // Fetch auditees for this department using the ENUM value
    const auditeesRes = await axios.get(
      `${API_BASE}/audit-schedule/auditees/by-department/${encodeURIComponent(enumValue)}`,
      { withCredentials: true }
    );
    setDepartmentAuditees(auditeesRes.data || []);
    
    console.log(`✅ Department ${departmentCode}: ${auditorsRes.data?.length} auditors, ${auditeesRes.data?.length} auditees`);
  } catch (error) {
    console.error('Error fetching department users:', error);
    addToast('Failed to load department users', 'error');
    setDepartmentAuditors([]);
    setDepartmentAuditees([]);
  } finally {
    setLoadingDepartmentUsers(false);
  }
}, [addToast]);

// Handle department selection for audit
const handleAuditDepartmentChange = async (departmentCode) => {
  setSelectedAuditDepartment(departmentCode);
  
  // ✅ Get team members for this department based on the selected date's week
  const teamInfo = getTeamMembersForDepartment(departmentCode, formData.date);
  setDepartmentTeamInfo(teamInfo);
  
  console.log("✅ Department Team Info for", departmentCode, ":", teamInfo);
  console.log("   Lead:", teamInfo.leadAuditorName);
  console.log("   Team Auditors:", teamInfo.teamAuditorNames);
  console.log("   Auditees:", teamInfo.auditeeNames);

  // Fetch department-specific users (all users in that department)
  await fetchDepartmentUsers(departmentCode);
  
  // Reset selections in form data
  setFormData(prev => ({
    ...prev,
    auditorId: '', // User must select from the filtered list
    auditeeId: ''
  }));
};

  // Fetch basic schedules
 // Update fetchBasicSchedules to preserve global audit type
const fetchBasicSchedules = useCallback(async () => {
  if (!selectedMonth) return;
  try {
    const weekSchedules = await auditScheduleApi.getByYearAndMonth(selectedYear, selectedMonth);
    const dateSchedules = await auditScheduleApi.getDateSchedulesByMonth(selectedYear, selectedMonth);
    
    // ✅ Combine both types
    const allSchedules = [...(weekSchedules.data || []), ...(dateSchedules.data || [])];
    
    // ✅ Log for debugging
    console.log('📋 All schedules fetched:', allSchedules.map(s => ({
      id: s.id,
      department: s.department,
      approvalStatus: s.approvalStatus,
      detailedApprovalStatus: s.detailedApprovalStatus
    })));
    
    setBasicSchedules(allSchedules);

    // After setting basicSchedules
console.log('📋 HR schedules:', basicSchedules.filter(s => s.department === 'HR').map(s => ({
  id: s.id,
  type: s.scheduledDate ? 'Detailed' : 'Week',
  approvalStatus: s.approvalStatus,
  detailedApprovalStatus: s.detailedApprovalStatus,
  leadAuditorId: s.leadAuditorId
})));
    // ... rest of the code
    
    // Check if month is approved for the detailed schedule to proceed
    const hasApprovedSchedules = allSchedules.some(s => s.approvalStatus === 'APPROVED');
    
    if (hasApprovedSchedules) {
      setApprovalStatus('APPROVED');
      const first = allSchedules.find(s => s.approvalStatus === 'APPROVED');
      if (first) {
        let teamIds = first.teamAuditorIds || [];
        if (typeof teamIds === 'string') {
          try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; }
        }
        setHeaderData({
          auditObjective: first.auditObjective || '',
          auditScope: first.auditScope || '',
          leadAuditorId: first.leadAuditorId || null,
          leadAuditorName: first.leadAuditorName || '',
          teamAuditorIds: teamIds,
          teamAuditorNames: first.teamAuditorNames || [],
          documentRevision: first.documentRevision || '1.0',
          preparedBy: first.preparedByName || user?.name || user?.username || '',  // ✅ FIXED: Use preparedByName from basic schedule
          approvedBy: first.approvedByName || ''
        });
      }
    } else {
      setApprovalStatus('NOT_APPROVED');
    }
    
    setAuditNumber(`INT/${selectedYear}/01`);
    
    // ✅ Get available audit types from ALL schedules (not just approved)
    const auditTypesSet = new Set();
    
    allSchedules.forEach(schedule => {
      if (schedule.auditElements) {
        let auditElements = schedule.auditElements;
        if (typeof auditElements === 'string') {
          try {
            auditElements = JSON.parse(auditElements);
          } catch(e) {
            auditElements = [];
          }
        }
        auditElements.forEach(element => {
          if (element && element.trim()) {
            auditTypesSet.add(element);
          }
        });
      }
    });
    
    const auditTypes = Array.from(auditTypesSet);
    console.log('Available audit types from all schedules:', auditTypes);
    setGlobalAuditTypesList(auditTypes);
    
    // ✅ Set default audit type if available and not already set
    if (auditTypes.length > 0 && !globalAuditType) {
      setGlobalAuditType(auditTypes[0]);
    }
  } catch (error) {
    console.error('Error fetching basic schedules:', error);
    setApprovalStatus('ERROR');
  }
}, [selectedYear, selectedMonth, globalAuditType]);

  // Fetch detailed schedules
const fetchDetailedSchedules = useCallback(async () => {
  if (!selectedMonth) return;
  try {
    const response = await auditScheduleApi.getDateSchedulesByMonth(selectedYear, selectedMonth);
    const dateSchedules = response.data || [];
    
    console.log('Date-based schedules fetched:', dateSchedules);
    
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
        try {
          schedule.departments = JSON.parse(schedule.departments);
        } catch(e) {
          schedule.departments = [];
        }
      }
      
      return schedule;
    });
    
setAuditSchedules(processedSchedules);
console.log('📋 HR in auditSchedules:', processedSchedules.filter(s => s.department === 'HR').map(s => ({
  id: s.id,
  scheduledDate: s.scheduledDate,
  leadAuditorId: s.leadAuditorId,
  teamAuditorIds: s.teamAuditorIds
})));    
    // Apply filter after setting schedules
    if (globalAuditType && globalAuditType !== '') {
      const filtered = processedSchedules.filter(schedule => {
        if (schedule.isSpecialEvent) return true;
        let auditElements = [];
        if (schedule.auditElements) {
          if (typeof schedule.auditElements === 'string') {
            try { auditElements = JSON.parse(schedule.auditElements); } catch(e) { auditElements = []; }
          } else if (Array.isArray(schedule.auditElements)) {
            auditElements = schedule.auditElements;
          }
        }
        return auditElements.some(element => 
          element.toLowerCase().includes(globalAuditType.toLowerCase())
        );
      });
      setFilteredAuditSchedules(filtered);
    } else {
      setFilteredAuditSchedules(processedSchedules);
    }
    
    if (processedSchedules.length > 0 && (!startDate || !endDate)) {
      const dates = [...new Set(processedSchedules.map(s => s.scheduledDate))].sort();
      if (dates.length > 0) {
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }
    }
  } catch (error) {
    console.error('Error fetching detailed schedules:', error);
    setAuditSchedules([]);
    setFilteredAuditSchedules([]);
  }
}, [selectedYear, selectedMonth, startDate, endDate, globalAuditType]);

// Filter schedules based on selected global audit type
  // Filter schedules based on selected global audit type
  // ✅ UPDATED: Robust filtering logic
  // ✅ UPDATED: Smart Filtering for Special Events
    // ✅ UPDATED: Strict Filtering (Hides Lunch if type doesn't match or if specific type selected)
   // ✅ UPDATED: Smart Filtering - Lunch Always Visible
  const filterSchedulesByAuditType = useCallback(() => {
    // If no audit type is selected, show ALL schedules
    if (!globalAuditType || globalAuditType.trim() === '') {
      setFilteredAuditSchedules(auditSchedules);
      return;
    }
    
    const normalizedGlobalType = globalAuditType.toLowerCase().trim();

    const filtered = auditSchedules.filter(schedule => {
      // 1. Handle Special Events
      if (schedule.isSpecialEvent) {
        // ✅ ALWAYS show Lunch breaks (Universal Event)
        
        
        // For Opening/Closing, check if their auditType matches the filter
        if (schedule.auditType && schedule.auditType.toLowerCase().includes(normalizedGlobalType)) {
          return true;
        }
        
        // Hide other special events if they don't match
        return false;
      }
      
      // 2. Handle Regular Audit Schedules
      let auditElements = [];
      
      // Parse audit elements safely
      if (schedule.auditElements) {
        if (typeof schedule.auditElements === 'string') {
          try {
            const parsed = JSON.parse(schedule.auditElements);
            auditElements = Array.isArray(parsed) ? parsed : [parsed];
          } catch(e) {
            auditElements = [schedule.auditElements];
          }
        } else if (Array.isArray(schedule.auditElements)) {
          auditElements = schedule.auditElements;
        }
      }
      
      // Check if ANY element matches OR if the main auditType field matches
      const matchesElements = auditElements.some(element => {
        if (!element) return false;
        return element.toLowerCase().includes(normalizedGlobalType);
      });

      const matchesMainType = schedule.auditType && schedule.auditType.toLowerCase().includes(normalizedGlobalType);

      return matchesElements || matchesMainType;
    });
    
    setFilteredAuditSchedules(filtered);
  }, [auditSchedules, globalAuditType]);

  // Add this effect inside the modal to check conflicts in real-time
useEffect(() => {
  if (showModal && formData.date && formData.startTime && formData.endTime) {
    // Skip conflict check for Lunch breaks
    if (formData.isSpecialEvent && formData.specialEventType === 'LUNCH') {
      setConflictWarning(null);
      return;
    }
    
    let checkAuditorId = null;
    let checkAuditeeId = null;
    
    if (!formData.isSpecialEvent) {
      checkAuditorId = formData.auditorId;
      checkAuditeeId = formData.auditeeId;
    } else if (formData.specialEventType !== 'LUNCH') {
      checkAuditorId = formData.auditorId;
      checkAuditeeId = formData.auditeeId;
    }
    
    if (checkAuditorId || checkAuditeeId) {
      const conflict = checkTimeConflict(
        formData.date,
        formData.startTime,
        formData.endTime,
        checkAuditorId,
        checkAuditeeId,
        formData.isSpecialEvent,
        formData.specialEventType,
        formData.id
      );
      
      setConflictWarning(conflict);
    } else {
      setConflictWarning(null);
    }
  }
}, [showModal, formData.date, formData.startTime, formData.endTime, formData.auditorId, formData.auditeeId, formData.isSpecialEvent, formData.specialEventType, formData.id]);


 // Check time conflict for both Auditor and Auditee
const checkTimeConflict = (date, startTime, endTime, auditorId, auditeeId, isSpecialEvent, specialEventType, excludeId = null) => {
  const dateSchedules = auditSchedules.filter(s => (s.scheduledDate === date || s.date === date));
  
  // First check: OVERLAPPING SPECIAL EVENTS (prevent two events at same time)
  if (isSpecialEvent && specialEventType !== 'LUNCH') {
    const overlappingEvent = dateSchedules.find(schedule => {
      if (excludeId && schedule.id === excludeId) return false;
      if (schedule.isSpecialEvent && schedule.specialEventType !== 'LUNCH') {
        const s1Start = convertToMinutes(startTime);
        const s1End = convertToMinutes(endTime);
        const s2Start = convertToMinutes(schedule.startTime);
        const s2End = convertToMinutes(schedule.endTime);
        return (s1Start < s2End && s1End > s2Start);
      }
      return false;
    });
    if (overlappingEvent) return { type: 'event', conflict: overlappingEvent };
  }
  
  // Second check: Same AUDITOR cannot be in two places at once
  if (auditorId && !isSpecialEvent) {
    const auditorConflict = dateSchedules.find(schedule => {
      if (excludeId && schedule.id === excludeId) return false;
      if (schedule.auditorId !== parseInt(auditorId)) return false;
      if (schedule.isSpecialEvent && schedule.specialEventType === 'LUNCH') return false;
      
      const s1Start = convertToMinutes(startTime);
      const s1End = convertToMinutes(endTime);
      const s2Start = convertToMinutes(schedule.startTime);
      const s2End = convertToMinutes(schedule.endTime);
      
      return (s1Start < s2End && s1End > s2Start);
    });
    
    if (auditorConflict) return { type: 'auditor', conflict: auditorConflict };
  }
  
  // Third check: Same AUDITEE cannot be in two places at once
  if (auditeeId && !isSpecialEvent) {
    const auditeeConflict = dateSchedules.find(schedule => {
      if (excludeId && schedule.id === excludeId) return false;
      if (schedule.auditeeId !== parseInt(auditeeId)) return false;
      if (schedule.isSpecialEvent && schedule.specialEventType === 'LUNCH') return false;
      
      const s1Start = convertToMinutes(startTime);
      const s1End = convertToMinutes(endTime);
      const s2Start = convertToMinutes(schedule.startTime);
      const s2End = convertToMinutes(schedule.endTime);
      
      return (s1Start < s2End && s1End > s2Start);
    });
    
    if (auditeeConflict) return { type: 'auditee', conflict: auditeeConflict };
  }
  
  return null;
};
  
// Save detailed schedule
const handleSave = async () => {
  

  // ✅ Only check if we're editing an existing schedule that's already approved
  if (formData.id) {
    const existingSchedule = auditSchedules.find(s => s.id === formData.id);
    if (existingSchedule?.detailedApprovalStatus === 'APPROVED') {
      addToast('Cannot edit an approved schedule', 'warning');
      return;
    }
  }
  
  if (!formData.date || !formData.startTime || !formData.endTime) {
    addToast('Please fill date and time', 'error');
    return;
  }
  
  if (formData.isSpecialEvent) {
    if (!formData.specialEventType) {
      addToast('Please select event type', 'error');
      return;
    }
    if (formData.specialEventType !== 'LUNCH') {
      if (!formData.auditorId || !formData.auditeeId) {
        addToast('Please select Auditor and Auditee for Opening/Closing Meeting', 'error');
        return;
      }
    }
  } else {
    if (!formData.selectedDepartments || formData.selectedDepartments.length === 0) {
      addToast('Please select at least one department', 'error');
      return;
    }
    
    // ✅ MODIFIED: Make audit elements optional - allows scheduling without selecting elements
    // This allows multiple schedules for same department with different time slots
    const hasElements = formData.selectedDepartments.some(d => d.selectedElements && d.selectedElements.length > 0);
    
    const auditTypeToUse = formData.auditType || globalAuditType;
    if (!auditTypeToUse) {
      addToast('Please select Audit Type', 'error');
      return;
    }
    if (!formData.auditorId || !formData.auditeeId) {
      addToast('Please select Auditor and Auditee', 'error');
      return;
    }
    
    // ✅ ADD WARNING for no elements but still allow saving
    if (!hasElements) {
      console.log('⚠️ No audit elements selected, but continuing with schedule');
      // Optional: add a warning toast instead of error
      // addToast('No audit elements selected. You can add them later.', 'warning');
    }
  }
  
  // ✅ MODIFIED: Only check conflict for same time slot, not different time slots
   if (!formData.isSpecialEvent && formData.auditorId && formData.auditeeId) {
    const conflict = checkTimeConflict(
      formData.date,
      formData.startTime,
      formData.endTime,
      formData.auditorId,
      formData.auditeeId,  // ← Add auditeeId parameter
      formData.isSpecialEvent,
      formData.specialEventType,
      formData.id
    );
    
    if (conflict) {
      if (conflict.type === 'auditor') {
        addToast(`❌ Conflict: Auditor ${conflict.conflict.auditorName} already scheduled from ${conflict.conflict.startTime} to ${conflict.conflict.endTime}`, 'error');
      } else if (conflict.type === 'auditee') {
        addToast(`❌ Conflict: Auditee ${conflict.conflict.auditeeName} already scheduled from ${conflict.conflict.startTime} to ${conflict.conflict.endTime}`, 'error');
      }
      return;
    }
  }
  setSaving(true);
  try {
    const auditTypeToUse = formData.auditType || globalAuditType;
    
    const saveData = {
      id: formData.id,
      planYear: selectedYear,
      month: selectedMonth,
      department: formData.selectedDepartments?.map(d => d.department).join(', ') || 'General',
      week: getWeekNumber(formData.date),
      scheduledDate: formData.date,
      timeSlot: `${formData.startTime} - ${formData.endTime}`,
      startTime: formData.startTime,
      endTime: formData.endTime,
      fromDate: startDate,
      toDate: endDate,
      auditorId: (formData.auditorId && formData.specialEventType !== 'LUNCH') ? parseInt(formData.auditorId) : null,
      auditeeId: (formData.auditeeId && formData.specialEventType !== 'LUNCH') ? parseInt(formData.auditeeId) : null,
      status: formData.status,
      departments: formData.selectedDepartments?.map(d => d.department) || [],
      auditElements: formData.selectedDepartments?.flatMap(d => d.selectedElements) || [],
      selectedDepartments: formData.selectedDepartments || [],
      isSpecialEvent: formData.isSpecialEvent || false,
      specialEventType: formData.specialEventType || '',
      auditType: auditTypeToUse,
      auditNumber: auditNumber,
      // ✅ ADD PREPARED BY INFORMATION FROM HEADER DATA
      preparedByName: headerData.preparedBy || user?.name || user?.username,
      preparedByPosition: 'Audit Manager'  // Or get from user role
    };
    

    
  console.log('=== EDIT SAVE DATA ===');
console.log('selectedDepartments:', saveData.selectedDepartments);
console.log('department:', saveData.department);
console.log('auditorId:', saveData.auditorId);
console.log('auditeeId:', saveData.auditeeId);


    console.log('Saving schedule data with prepared by:', saveData);
    
    if (formData.id) {
      await auditScheduleApi.updateDetailedSchedule(formData.id, saveData, user?.id);
      addToast('Schedule updated successfully!', 'success');
    } else {
      await auditScheduleApi.saveDetailedSchedule(saveData, user?.id);
      addToast('Schedule added successfully!', 'success');
    }
    
    setShowModal(false);
    resetForm();
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error saving schedule:', error);
    addToast(error.response?.data?.message || 'Failed to save schedule', 'error');
  } finally {
    setSaving(false);
  }
};
  // Submit all schedules in the date range for approval
  // Submit all schedules in the date range for approval
// Submit all DRAFT schedules for approval (individual schedule level)
// ✅ UPDATED: Submit ONLY filtered draft schedules
const handleSubmitAllDraftSchedules = async () => {
  // Use filteredAuditSchedules instead of auditSchedules
  const draftSchedules = filteredAuditSchedules.filter(s => s.detailedApprovalStatus === 'DRAFT');
  
  if (draftSchedules.length === 0) {
    addToast(`No draft schedules to submit for "${globalAuditType || 'All'}"`, 'warning');
    return;
  }
  
  // Confirm with user because this action is now context-aware
  if (!window.confirm(`Are you sure you want to submit ${draftSchedules.length} draft schedule(s) for "${globalAuditType}"?`)) {
    return;
  }

  setSubmitting(true);
  try {
    let submittedCount = 0;
    for (const schedule of draftSchedules) {
      await auditScheduleApi.submitScheduleForApproval(schedule.id, user?.id);
      submittedCount++;
      // Optional: Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    addToast(`${submittedCount} schedule(s) submitted for approval!`, 'success');
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error submitting schedules:', error);
    addToast('Failed to submit some schedules', 'error');
  } finally {
    setSubmitting(false);
  }
};

  // Delete schedule
const handleDelete = async (id) => {
  const scheduleToDelete = auditSchedules.find(s => s.id === id);
  
  // ✅ Check schedule's own status, not date status
  if (scheduleToDelete?.detailedApprovalStatus === 'APPROVED') {
    addToast('Cannot delete an approved schedule', 'warning');
    return;
  }
  
  if (scheduleToDelete?.detailedApprovalStatus === 'PENDING_APPROVAL') {
    addToast('Cannot delete a schedule pending approval', 'warning');
    return;
  }
  
  if (window.confirm('Are you sure you want to delete this schedule?')) {
    try {
      await auditScheduleApi.delete(id);
      addToast('Schedule deleted successfully!', 'success');
      await fetchDetailedSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      addToast('Failed to delete schedule', 'error');
    }
  }
};

  // Submit a single date for approval
// Submit a single date for approval
const handleSubmitDateForApproval = async (dateStr) => {
  setSubmittingDate(dateStr);
  try {
    await auditScheduleApi.submitDateForApproval(selectedYear, selectedMonth, dateStr, user?.id);
    
    setDateApprovalStatus(prev => ({ 
      ...prev, 
      [dateStr]: { ...prev[dateStr], status: 'PENDING_APPROVAL' } 
    }));
    addToast(`Schedule for ${dateStr} submitted for approval!`, 'success');
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error submitting date:', error);
    addToast(error.response?.data?.message || 'Failed to submit date', 'error');
  } finally {
    setSubmittingDate(null);
  }
};
  // Approve a single date
  const handleApproveDate = async (dateStr) => {
    setSubmittingDate(dateStr);
    try {
      await auditScheduleApi.approveDateSchedule(selectedYear, selectedMonth, dateStr, user?.id, approvalComment);
      
      setDateApprovalStatus(prev => ({ 
        ...prev, 
        [dateStr]: { ...prev[dateStr], status: 'APPROVED' } 
      }));
      addToast(`Schedule for ${dateStr} approved!`, 'success');
      await fetchDetailedSchedules();
    } catch (error) {
      console.error('Error approving date:', error);
      addToast('Failed to approve date', 'error');
    } finally {
      setSubmittingDate(null);
      setApprovalComment('');
    }
  };

  // Reject a single date
  const handleRejectDate = async () => {
    if (!selectedRejectDate) return;
    if (!rejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }
    
    setSubmittingDate(selectedRejectDate);
    try {
      await auditScheduleApi.rejectDateSchedule(selectedYear, selectedMonth, selectedRejectDate, user?.id, rejectionReason);
      
      setDateApprovalStatus(prev => ({ 
        ...prev, 
        [selectedRejectDate]: { ...prev[selectedRejectDate], status: 'REJECTED' } 
      }));
      addToast(`Schedule for ${selectedRejectDate} rejected`, 'error');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRejectDate(null);
      await fetchDetailedSchedules();
    } catch (error) {
      console.error('Error rejecting date:', error);
      addToast('Failed to reject date', 'error');
    } finally {
      setSubmittingDate(null);
    }
  };


  // Submit a single schedule for approval (by schedule ID)
const handleSubmitScheduleForApproval = async (scheduleId) => {
  setSubmitting(true);
  try {
    await auditScheduleApi.submitScheduleForApproval(scheduleId, user?.id);
    addToast('Schedule submitted for approval!', 'success');
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error submitting schedule:', error);
    addToast(error.response?.data?.message || 'Failed to submit schedule', 'error');
  } finally {
    setSubmitting(false);
  }
};

// Approve a single schedule
const handleApproveSchedule = async (scheduleId) => {
  setSubmitting(true);
  try {
    await auditScheduleApi.approveSchedule(scheduleId, user?.id, approvalComment);
    addToast('Schedule approved successfully!', 'success');
    setApprovalComment('');
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error approving schedule:', error);
    addToast(error.response?.data?.message || 'Failed to approve schedule', 'error');
  } finally {
    setSubmitting(false);
  }
};

// Reject a single schedule
const handleRejectSchedule = async (scheduleId) => {
  if (!rejectionReason.trim()) {
    addToast('Please provide a rejection reason', 'error');
    return;
  }
  
  setSubmitting(true);
  try {
    await auditScheduleApi.rejectSchedule(scheduleId, user?.id, rejectionReason);
    addToast('Schedule rejected', 'error');
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedRejectDate(null);
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error rejecting schedule:', error);
    addToast(error.response?.data?.message || 'Failed to reject schedule', 'error');
  } finally {
    setSubmitting(false);
  }
};

// Request changes for approved schedule
const handleRequestChanges = async (scheduleId) => {
  if (!changeRequestReason.trim()) {
    addToast('Please provide a reason for changes', 'error');
    return;
  }

  setSubmitting(true);
  try {
    await axios.post(`${API_BASE}/audit-schedule/detailed/${selectedYear}/${selectedMonth}/request-changes?userId=${user?.id}`, {
      reason: changeRequestReason
    }, { withCredentials: true });
    
    addToast(`Change request submitted for schedule`, 'warning');
    setShowChangeRequestModal(false);
    setChangeRequestReason('');
    await fetchDetailedSchedules();
  } catch (error) {
    console.error('Error requesting changes:', error);
    addToast(error.response?.data?.message || 'Failed to submit change request', 'error');
  } finally {
    setSubmitting(false);
  }
};
  const resetForm = () => {
  setFormData({
    id: null,
    date: '',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    selectedDepartments: [],
    auditorId: '',
    auditeeId: '',
    isSpecialEvent: false,
    specialEventType: '',
    auditType: globalAuditType,
    status: 'SCHEDULED'
  });
  setConflictWarning(null);
  setEditingSchedule(null);
  setSelectedAuditDepartment('');  // ✅ Add this line
  setDepartmentAuditors([]);       // ✅ Add this line
  setDepartmentAuditees([]);       // ✅ Add this line
};

 const handleAddSchedule = (dateStr) => {
  // ✅ Remove date status check - always allow adding if user can edit
  if (!canEdit) {
    addToast('You do not have permission to add schedules', 'warning');
    return;
  }
  
  setFormData({
    id: null,
    date: dateStr || '',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    selectedDepartments: [],
    auditorId: '',
    auditeeId: '',
    isSpecialEvent: false,
    specialEventType: '',
    auditType: globalAuditType,
    status: 'SCHEDULED'
  });
  setConflictWarning(null);
  setEditingSchedule(null);
  setShowModal(true);
};

const handleEditSchedule = (schedule) => {
  if (!canEdit) {
    addToast('You do not have permission to edit schedules', 'warning');
    return;
  }
  
  if (schedule.detailedApprovalStatus === 'APPROVED') {
    addToast('Cannot edit an approved schedule', 'warning');
    return;
  }
  
  // ✅ FIX: Properly parse selected departments from schedule
  let selectedDepartments = [];
  
  // Priority 1: Use selectedDepartments if exists
  if (schedule.selectedDepartments && Array.isArray(schedule.selectedDepartments) && schedule.selectedDepartments.length > 0) {
    selectedDepartments = schedule.selectedDepartments;
  } 
  // Priority 2: Use departments array
  else if (schedule.departments && Array.isArray(schedule.departments) && schedule.departments.length > 0) {
    selectedDepartments = schedule.departments.map(dept => ({
      department: dept,
      selectedElements: schedule.auditElements || []
    }));
  }
  // Priority 3: Use single department field
  else if (schedule.department && schedule.department !== 'General' && !schedule.isSpecialEvent) {
    selectedDepartments = [{
      department: schedule.department,
      selectedElements: schedule.auditElements || []
    }];
  }
  
  // Extract department name for dropdown
  let departmentToSelect = '';
  if (selectedDepartments.length > 0) {
    departmentToSelect = selectedDepartments[0].department;
  } else if (schedule.department && schedule.department !== 'General') {
    departmentToSelect = schedule.department;
  }
  
  setFormData({
    id: schedule.id,
    date: schedule.scheduledDate || schedule.date || '',
    startTime: schedule.startTime || '09:00 AM',
    endTime: schedule.endTime || '10:00 AM',
    selectedDepartments: selectedDepartments,  // ✅ This is critical
    auditorId: schedule.auditorId?.toString() || '',
    auditeeId: schedule.auditeeId?.toString() || '',
    isSpecialEvent: schedule.isSpecialEvent || false,
    specialEventType: schedule.specialEventType || '',
    auditType: schedule.auditType || globalAuditType,
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

  const handleExport = () => {
    const headers = ['Date', 'Day', 'Start Time', 'End Time', 'Departments/Event', 'Audit Type', 'Auditor', 'Auditee', 'Status'];
    const rows = auditSchedules.map(s => [
      s.scheduledDate || s.date,
      new Date(s.scheduledDate || s.date).toLocaleDateString('en-US', { weekday: 'long' }),
      s.startTime,
      s.endTime,
      s.isSpecialEvent ? s.specialEventType : (Array.isArray(s.departments) ? s.departments.join(', ') : s.departments),
      s.auditType || globalAuditType || '-',
      s.auditorName || '-',
      s.auditeeName || '-',
      s.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_schedule_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Schedule exported successfully!', 'success');
  };

  const handleDownloadPdf = async () => {
    if (!selectedMonth) {
      addToast('Please select a month first', 'warning');
      return;
    }

    setDownloadingPdf(true);
    try {
      const response = await auditScheduleApi.downloadDetailedViewPdf(selectedYear, selectedMonth, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        auditType: globalAuditType || undefined
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Form5_Detailed_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Detailed schedule PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading detailed schedule PDF:', error);
      addToast('Failed to download detailed schedule PDF', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Set default date range for the month
  useEffect(() => {
    if (selectedMonth && (!startDate || !endDate)) {
      const monthIdx = monthNumber[selectedMonth];
      const year = selectedMonth === 'Jan' || selectedMonth === 'Feb' || selectedMonth === 'Mar' ? selectedYear + 1 : selectedYear;
      const firstDay = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const lastDayStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDayStr);
    }
  }, [selectedMonth, selectedYear]);


  // Filter schedules when global audit type changes
useEffect(() => {
  filterSchedulesByAuditType();
}, [globalAuditType, auditSchedules, filterSchedulesByAuditType]);
  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUsers();
      await fetchBasicSchedules();
      await fetchDetailedSchedules();
      setLoading(false);
    };
    loadData();
  }, [fetchUsers, fetchBasicSchedules, fetchDetailedSchedules]);

  const availableAuditors = getAvailableAuditors();
  
  const getDateStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1"><FiClock className="w-3 h-3" /> Pending Approval</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1"><FiX className="w-3 h-3" /> Rejected</span>;
      case 'NO_DATA':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">No Data</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center gap-1"><FiEdit2 className="w-3 h-3" /> Draft</span>;
    }
  };

  const canEdit = isAuditManager;
  const canApprove = isTopManagement;
  const hasSchedules = auditSchedules.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-teal-600"></div>
      </div>
    );
  }

  if (approvalStatus !== 'APPROVED') {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/form5')} className="flex items-center gap-2 mb-6 text-purple-600">
            <FiArrowLeft /> Back to Form 5
          </button>
          <div className="p-12 text-center bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-yellow-100 rounded-full">
              <FiAlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-800">Form 5 Not Approved Yet</h2>
            <p className="mb-6 text-gray-500">
              Please complete and get approval for the basic schedule in Form 5 first.<br/>
              {monthDisplay[selectedMonth]} {selectedYear} is not approved.
            </p>
            <button onClick={() => navigate('/form5')} className="px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700">
              Go to Form 5
            </button>
          </div>
        </div>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/schedule-calendar')} className="p-2 text-gray-500 rounded-lg hover:text-teal-600">
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 shadow-lg bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
                <FiFileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Internal Audite Schedule</h1>
                <p className="text-sm text-gray-500">{monthDisplay[selectedMonth]} {selectedYear}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Audit Type:</label>
                <select
                  value={globalAuditType}
                  onChange={(e) => setGlobalAuditType(e.target.value)}
                  className="px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg"
                  disabled={!canEdit}
                >
                  <option value="">Select Audit Type</option>
                  {globalAuditTypesList.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <FiPrinter className="w-4 h-4" />
                {downloadingPdf ? 'Downloading...' : 'Download PDF'}
              </button>
              <button onClick={handleExport} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2">
                <FiDownload className="w-4 h-4" /> Export
              </button>
              <button onClick={() => { fetchDetailedSchedules(); }} className="p-2 text-gray-500 rounded-lg hover:text-teal-600">
                <FiRefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Header Data - Audit Team Info */}
      <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6">
        <div className="p-4 mb-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                <FiTrendingUp className="w-4 h-4" /> Audit Objective
              </h3>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{headerData.auditObjective || 'Not set'}</p>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-green-800">
                <FiEye className="w-4 h-4" /> Audit Scope
              </h3>
              <p className="mt-1 text-sm text-gray-700">{headerData.auditScope || 'All elements of quality system'}</p>
            </div>
          </div>
          {/* <div className="flex flex-wrap gap-4 pt-3 mt-3 text-sm border-t border-blue-200">
            <div className="flex items-center gap-2">
              <FiUserCheck className="w-4 h-4 text-purple-600" />
              <span className="text-gray-600">Lead Auditor:</span>
              <span className="font-medium">{headerData.leadAuditorName || 'Not assigned'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-purple-600" />
              <span className="text-gray-600">Team Auditors:</span>
              <span className="font-medium">{headerData.teamAuditorNames?.length ? headerData.teamAuditorNames.join(', ') : 'None'}</span>
            </div>
          </div> */}
        </div>

        {/* Date Range Selection */}
        <div className="p-4 mb-6 bg-white border border-gray-200 rounded-xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">From Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-full p-2 text-sm border border-gray-200 rounded-lg" 
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">To Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="w-full p-2 text-sm border border-gray-200 rounded-lg" 
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-3 py-3 text-sm font-semibold text-left text-gray-700">Date & Time</th>
                  <th className="px-3 py-3 text-sm font-semibold text-left text-gray-700">Area/Department/Event</th>
                  <th className="px-3 py-3 text-sm font-semibold text-left text-gray-700">Auditor Name</th>
                  <th className="px-3 py-3 text-sm font-semibold text-left text-gray-700">Auditee Name</th>
                  <th className="px-3 py-3 text-sm font-semibold text-left text-gray-700">Status</th>
                  <th className="w-20 px-3 py-3 text-sm font-semibold text-center text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dateRange.map((dateInfo, idx) => {
                  const daySchedules = getSchedulesForDate(dateInfo.dateStr);
                  const isWeekend = dateInfo.isWeekend;
                  
                  if (isWeekend) {
                    return (
                      <tr key={idx} className="bg-gray-100">
                        <td className="px-3 py-3 text-sm text-gray-400">{dateInfo.displayDate}<br/>{dateInfo.dayOfWeek}</td>
                        <td colSpan="5" className="px-3 py-3 text-sm text-gray-400">Weekend</td>
                        <td className="px-3 py-3"></td>
                      </tr>
                    );
                  }
                  
                  return (
                    <React.Fragment key={idx}>
                      {/* Date Header Row - Show progress only */}
                      <tr className="bg-gray-100 border-t border-b">
                        <td colSpan="6" className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{dateInfo.displayDate}</span>
                            <span className="text-xs text-gray-500">{dateInfo.dayOfWeek}</span>
                            {daySchedules.length > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {daySchedules.filter(s => s.detailedApprovalStatus === 'APPROVED').length}/{daySchedules.length} Approved
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Schedule rows for this date */}
                      {daySchedules.length === 0 ? (
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm text-gray-600">{dateInfo.displayDate}</td>
                          <td colSpan="4" className="px-3 py-3 text-sm text-gray-400">No schedules for this date</td>
                          <td className="px-3 py-3 text-center">
                            {canEdit && (
                              <button onClick={() => handleAddSchedule(dateInfo.dateStr)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg">
                                <FiPlus className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        daySchedules.map((schedule, sIdx) => (
                          <tr key={`${idx}-${sIdx}`} className={`hover:bg-gray-50 ${schedule.isSpecialEvent ? 'bg-gray-50' : ''}`}>
                            <td className="px-3 py-3 text-sm align-top">
  {sIdx === 0 ? null : <div className="h-4"></div>}
  
  {/* ✅ Show DATE RANGE if fromDate and toDate are different */}
  {schedule.fromDate && schedule.toDate && schedule.fromDate !== schedule.toDate ? (
    <div className="mb-1">
      <div className="flex items-center gap-1">
        <span className="text-xs text-purple-600">📅</span>
        <span className="text-xs font-semibold text-gray-700">Date Range:</span>
        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Flexible</span>
      </div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">
        {schedule.fromDate} → {schedule.toDate}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        Can be completed any day in this range
      </div>
    </div>
  ) : (
    <div className="mb-1 text-xs text-gray-500">
      📅 {schedule.scheduledDate || schedule.date}
    </div>
  )}
  
  {/* Time Slot */}
  <div className={`font-mono text-xs ${schedule.isSpecialEvent ? 'font-semibold' : 'text-gray-600'} mt-1`}>
    ⏰ {schedule.startTime} - {schedule.endTime}
  </div>
  
  {/* Audit Type */}
  <div className="mt-1 text-xs text-gray-400">
    📋 {schedule.auditType || globalAuditType || '-'}
  </div>
</td>
                            <td className="px-3 py-3 text-sm align-top">
                              {schedule.isSpecialEvent ? (
                                <div className="flex items-center gap-2">
                                  {schedule.specialEventType === 'OPENING' && <FiSunrise className="w-4 h-4 text-blue-500" />}
                                  {schedule.specialEventType === 'LUNCH' && <FiCoffee className="w-4 h-4 text-orange-500" />}
                                  {schedule.specialEventType === 'CLOSING' && <FiSunset className="w-4 h-4 text-purple-500" />}
                                  <span className="font-semibold">
                                    {schedule.specialEventType === 'OPENING' && 'Opening Meeting'}
                                    {schedule.specialEventType === 'LUNCH' && 'Lunch Break'}
                                    {schedule.specialEventType === 'CLOSING' && 'Closing Meeting'}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {schedule.departments?.map((dept, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                      <span>{dept}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm align-top">
                              {schedule.auditorName || '-'}
                            </td>
                            <td className="px-3 py-3 text-sm align-top">
                              {schedule.auditeeName || '-'}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  schedule.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                  schedule.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {schedule.status || 'SCHEDULED'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  schedule.detailedApprovalStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                  schedule.detailedApprovalStatus === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                                  schedule.detailedApprovalStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {schedule.detailedApprovalStatus === 'APPROVED' ? '✓ Approved' :
                                   schedule.detailedApprovalStatus === 'PENDING_APPROVAL' ? '⏳ Pending' :
                                   schedule.detailedApprovalStatus === 'REJECTED' ? '✗ Rejected' :
                                   '📝 Draft'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center align-top">
                              <div className="flex flex-col gap-1">
{canEdit && (schedule.detailedApprovalStatus === 'DRAFT' || schedule.detailedApprovalStatus === 'REJECTED' || schedule.detailedApprovalStatus === 'CHANGE_REQUESTED') && (
  <>
    <button onClick={() => handleEditSchedule(schedule)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
      <FiEdit2 className="w-3.5 h-3.5" />
    </button>
    <button onClick={() => handleDelete(schedule.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
      <FiTrash2 className="w-3.5 h-3.5" />
    </button>
    {schedule.detailedApprovalStatus === 'DRAFT' && (
      <button onClick={() => handleSubmitScheduleForApproval(schedule.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Submit for Approval">
        <FiSend className="w-3.5 h-3.5" />
      </button>
    )}
    {schedule.detailedApprovalStatus === 'CHANGE_REQUESTED' && (
      <button onClick={() => handleSubmitScheduleForApproval(schedule.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Resubmit for Approval">
        <FiSend className="w-3.5 h-3.5" />
      </button>
    )}
  </>
)}
                                {canApprove && schedule.detailedApprovalStatus === 'PENDING_APPROVAL' && (
  <div className="flex flex-col gap-1">
    <button onClick={() => handleApproveSchedule(schedule.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve">
      <FiCheck className="w-3.5 h-3.5" />
    </button>
    <button onClick={() => {
      setSelectedRejectDate(schedule.scheduledDate);
      window.tempScheduleId = schedule.id;
      setShowRejectModal(true);
    }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Reject">
      <FiX className="w-3.5 h-3.5" />
    </button>
    {/* ✅ ADD Request Changes button */}
    <button 
      onClick={() => {
        setSelectedRejectDate(schedule.scheduledDate);
        window.tempScheduleId = schedule.id;
        setChangeRequestReason('');
        setShowChangeRequestModal(true);
      }} 
      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" 
      title="Request Changes"
    >
      <FiMessageSquare className="w-3.5 h-3.5" />
    </button>
  </div>
)}
                                {schedule.detailedApprovalStatus === 'APPROVED' && canApprove && (
  <div className="flex flex-col gap-1">
    <button 
      onClick={() => {
        setSelectedRejectDate(schedule.scheduledDate);
        window.tempScheduleId = schedule.id;
        setChangeRequestReason('');
        setShowChangeRequestModal(true);
      }} 
      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" 
      title="Request Changes to Approved Schedule"
    >
      <FiMessageSquare className="w-3.5 h-3.5" />
    </button>
    <span className="text-xs font-medium text-green-600">Approved</span>
  </div>
)}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Schedule Buttons - ONE SECTION ONLY */}
        {canEdit && (
          <div className="flex flex-wrap justify-end gap-2 mt-4">
            {dateRange.filter(d => !d.isWeekend).slice(0, 5).map(dateInfo => (
              <button
                key={dateInfo.dateStr}
                onClick={() => handleAddSchedule(dateInfo.dateStr)}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" /> Add Schedule for {dateInfo.displayDate}
              </button>
            ))}
          </div>
        )}

        {canEdit && (
  <div className="flex flex-wrap justify-end gap-2 mt-4">
    {/* Existing Add Schedule buttons */}
    {dateRange.filter(d => !d.isWeekend).slice(0, 3).map(dateInfo => (
      <button
        key={dateInfo.dateStr}
        onClick={() => handleAddSchedule(dateInfo.dateStr)}
        className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs flex items-center gap-1"
      >
        <FiPlus className="w-3 h-3" /> Add Schedule for {dateInfo.displayDate}
      </button>
    ))}
    
    {/* NEW: Bulk Schedule Button */}
    <button
      onClick={() => setShowBulkModal(true)}
      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs flex items-center gap-1"
    >
      <FiCalendar className="w-3 h-3" /> Bulk Schedule (Date Range)
    </button>
  </div>
)}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          {hasSchedules && canEdit && (
            <button
              onClick={handleSubmitAllDraftSchedules}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiSend className="w-4 h-4" />}
              Submit All Draft Schedules
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 mt-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1"><FiSunrise className="w-3 h-3 text-blue-500" /> Opening Meeting</span>
            <span className="flex items-center gap-1"><FiCoffee className="w-3 h-3 text-orange-500" /> Lunch Break</span>
            <span className="flex items-center gap-1"><FiSunset className="w-3 h-3 text-purple-500" /> Closing Meeting</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div> Scheduled</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div> In Progress</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div> Completed</span>
          </div>
        </div>
      </div>

      {/* Change Requested Banner */}
{selectedMonth && approvalStatus === 'CHANGE_REQUESTED' && (
  <div className="p-4 mb-6 border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-orange-100 rounded-lg">
        <FiMessageSquare className="w-5 h-5 text-orange-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-orange-800">Changes Requested by Top Management</p>
        <p className="text-xs text-orange-600 mt-0.5">{rejectionReason}</p>
        <p className="mt-1 text-xs text-orange-500">Please make the requested changes and resubmit.</p>
      </div>
    </div>
  </div>
)}

      {/* Schedule Modal with Department Filtering */}
{showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
      <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div>
          <h3 className="text-xl font-semibold">{formData.id ? 'Edit Schedule' : 'Add Schedule'}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Schedule daily audit for department</p>
        </div>
        <button onClick={() => { setShowModal(false); resetForm(); setSelectedAuditDepartment(''); }} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
      </div>
      
      <div className="p-6 space-y-5">
        {conflictWarning && (
  <div className="p-3 border border-red-200 rounded-lg bg-red-50">
    <div className="flex items-start gap-2">
      <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-red-800">Schedule Conflict!</p>
        {conflictWarning.type === 'auditor' && (
          <p className="text-sm text-red-600">
            Auditor {conflictWarning.conflict.auditorName} already scheduled from {conflictWarning.conflict.startTime} to {conflictWarning.conflict.endTime}
          </p>
        )}
        {conflictWarning.type === 'auditee' && (
          <p className="text-sm text-red-600">
            Auditee {conflictWarning.conflict.auditeeName} already scheduled from {conflictWarning.conflict.startTime} to {conflictWarning.conflict.endTime}
          </p>
        )}
        {conflictWarning.type === 'event' && (
          <p className="text-sm text-red-600">
            Another event already scheduled at this time
          </p>
        )}
      </div>
    </div>
  </div>
)}
        
        {/* Department Selection - NEW */}
        {/* Department Selection - Filtered by current week */}
<div>
  <label className="block mb-1 text-sm font-medium text-gray-700">
    Department to Audit *
  </label>
  <select
    value={selectedAuditDepartment}
    
    onChange={(e) => {
  const newDepartment = e.target.value;
  setSelectedAuditDepartment(newDepartment);
  
  // REPLACE the selected departments with the new one (not add)
  if (newDepartment && formData.date) {
    const availableDepts = getAvailableDepartmentsForDate(formData.date);
    const selectedDeptInfo = availableDepts.find(d => d.department === newDepartment);
    
    if (selectedDeptInfo) {
      // Replace entire selectedDepartments array with just the new department
      const updatedDepartments = [{
        department: newDepartment,
        selectedElements: [...selectedDeptInfo.auditElements]
      }];
      setFormData(prev => ({ ...prev, selectedDepartments: updatedDepartments }));
    }
  } else if (!newDepartment) {
    // If no department selected, clear all
    setFormData(prev => ({ ...prev, selectedDepartments: [] }));
  }
  
  handleAuditDepartmentChange(newDepartment);
}}
    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
    // disabled={!!formData.id}
  >
    <option value="">Select Department</option>
    {(() => {
  // Get unique departments from basicSchedules for the current week only
  const currentWeek = formData.date ? getWeekNumber(formData.date) : null;
  const uniqueDepartments = new Map();
  
  basicSchedules.forEach(schedule => {
    if (schedule.department && 
        schedule.department !== 'OPENING' && 
        schedule.department !== 'CLOSING' &&
        schedule.approvalStatus === 'APPROVED') {  // Only show approved schedules
      
      // If we have a current date, only show schedules for that week
      if (!currentWeek || schedule.week === currentWeek) {
        if (!uniqueDepartments.has(schedule.department)) {
          uniqueDepartments.set(schedule.department, {
            department: schedule.department,
            week: schedule.week,
            hasTeam: !!(schedule.leadAuditorId || schedule.teamAuditorIds?.length)
          });
        }
      }
    }
  });
  
  return Array.from(uniqueDepartments.values()).map((deptInfo, idx) => (
    <option key={idx} value={deptInfo.department}>
      {deptInfo.department} (Week {deptInfo.week}) {!deptInfo.hasTeam }
    </option>
  ));
})()}
  </select>
  {formData.date && (
    <p className="mt-1 text-xs text-gray-400">
      Showing departments scheduled for week {getWeekNumber(formData.date)}
    </p>
  )}
</div>

        {/* Department Info Message */}
        {selectedAuditDepartment && (
          <div className="p-2 text-xs text-blue-600 rounded-lg bg-blue-50">
            <FiInfo className="inline w-3 h-3 mr-1" />
            Showing auditors and auditees from {selectedAuditDepartment} department only
          </div>
        )}

        {/* Date */}
        <div>
  <label className="block mb-1 text-sm font-medium text-gray-700">Date *</label>
  <input 
    type="date" 
    value={formData.date || ''} 
    onChange={(e) => setFormData({...formData, date: e.target.value})} 
    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" 
  />
</div>
        
        <div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block mb-1 text-sm font-medium text-gray-700">Start Time *</label>
    <select 
      value={formData.startTime || ''} 
      onChange={(e) => {
        const newStartTime = e.target.value;
        // Reset end time if it becomes invalid
        let newEndTime = formData.endTime;
        if (newEndTime && getTimeValue(newEndTime) <= getTimeValue(newStartTime)) {
          newEndTime = '';
        }
        setFormData({...formData, startTime: newStartTime, endTime: newEndTime});
      }} 
      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
    >
      <option value="">Select start time</option>
      {timeOptions.map(time => (
        <option key={time} value={time}>{time}</option>
      ))}
    </select>
  </div>
  
  <div>
    <label className="block mb-1 text-sm font-medium text-gray-700">End Time *</label>
    <select 
      value={formData.endTime || ''} 
      onChange={(e) => setFormData({...formData, endTime: e.target.value})} 
      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
    >
      <option value="">Select end time</option>
      {timeOptions
        .filter(time => {
          if (!formData.startTime) return false;
          return getTimeValue(time) > getTimeValue(formData.startTime);
        })
        .map(time => <option key={time} value={time}>{time}</option>)}
    </select>
    {formData.startTime && !formData.endTime && (
      <p className="mt-1 text-xs text-amber-600">Please select an end time after {formData.startTime}</p>
    )}
  </div>
</div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isSpecialEvent || false} 
              onChange={(e) => setFormData({...formData, isSpecialEvent: e.target.checked, specialEventType: '', departments: []})} 
              className="w-4 h-4 text-teal-600 rounded" 
            />
            <span className="text-sm text-gray-700">This is a Special Event (Opening/Lunch/Closing)</span>
          </label>
        </div>
        
        {formData.isSpecialEvent ? (
          <>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Event Type *</label>
              <select 
                value={formData.specialEventType || ''} 
                onChange={(e) => setFormData({...formData, specialEventType: e.target.value})} 
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select Event Type</option>
                <option value="OPENING">Opening Meeting</option>
                <option value="LUNCH">Lunch Break</option>
                <option value="CLOSING">Closing Meeting</option>
              </select>
            </div>
            
            {formData.specialEventType !== 'LUNCH' && (
              <>
                <div>
                  <label className="flex items-center block gap-1 mb-1 text-sm font-medium text-gray-700">
                    <FiUserCheck className="w-4 h-4 text-blue-500" /> Auditor *
                  </label>
                  <select 
                    value={formData.auditorId || ''} 
                    onChange={(e) => setFormData({...formData, auditorId: e.target.value})} 
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Auditor</option>
                    {selectedAuditDepartment ? (
                      departmentAuditors.map(a => (
                        <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                      ))
                    ) : (
                      <option disabled>Please select a department first</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="flex items-center block gap-1 mb-1 text-sm font-medium text-gray-700">
                    <FiUserPlus className="w-4 h-4 text-green-500" /> Auditee *
                  </label>
                  <select 
                    value={formData.auditeeId || ''} 
                    onChange={(e) => setFormData({...formData, auditeeId: e.target.value})} 
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Auditee</option>
                    {selectedAuditDepartment ? (
                      departmentAuditees.map(a => (
                        <option key={a.id} value={a.id}>{a.firstName} {a.lastName} {a.role === 'HOD' ? '(HOD)' : ''}</option>
                      ))
                    ) : (
                      <option disabled>Please select a department first</option>
                    )}
                  </select>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Audit Elements Selection */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Select Departments & Audit Elements *</label>
              <div className="p-3 overflow-y-auto border border-gray-200 rounded-lg max-h-60">
                {getAvailableDepartmentsForDate(formData.date)
                .filter(deptInfo => {
                  if (!selectedAuditDepartment) return false;
                  return deptInfo.department === selectedAuditDepartment;
                }).map(deptInfo => {
                  const departmentName = deptInfo.department;
                  const availableElements = deptInfo.auditElements || [];
                  const selectedDept = formData.selectedDepartments?.find(d => d.department === departmentName);
                  const selectedElements = selectedDept?.selectedElements || [];
                  
                  const isAutoSelected = selectedAuditDepartment === departmentName;
                  return (
                   <div key={departmentName} className={`pb-3 mb-4 border-b border-gray-200 last:mb-0 ${isAutoSelected ? 'bg-blue-50 rounded-lg p-2 -mx-2' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={availableElements.length > 0 && selectedElements.length === availableElements.length}
                            onChange={(e) => {
                              let updated = [...(formData.selectedDepartments || [])];
                              const existingIndex = updated.findIndex(d => d.department === departmentName);
                              
                              if (e.target.checked) {
                                if (existingIndex >= 0) {
                                  updated[existingIndex].selectedElements = [...availableElements];
                                } else {
                                  updated.push({
                                    department: departmentName,
                                    selectedElements: [...availableElements]
                                  });
                                }
                              } else {
                                if (existingIndex >= 0) {
                                  updated.splice(existingIndex, 1);
                                }
                              }
                              setFormData(prev => ({ ...prev, selectedDepartments: updated }));
                              
                              // Clear department selection when unchecking
                              if (departmentName === selectedAuditDepartment && !e.target.checked) {
                                setSelectedAuditDepartment('');
                              }
                            }}
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span className={`font-medium ${isAutoSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                            {departmentName}
                            {isAutoSelected && <span className="ml-2 text-xs text-blue-600">(Auto-selected)</span>}
                          </span>
                          <span className="text-xs text-gray-400">({availableElements.length} audit types)</span>
                        </div>
                      </div>
                      
                      {availableElements.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 ml-6 md:grid-cols-2">
                          {availableElements.map(element => (
                            <label key={element} className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-100">
                              <input
                                type="checkbox"
                                checked={selectedElements.includes(element)}
                                onChange={(e) => {
                                  let updated = [...(formData.selectedDepartments || [])];
                                  let deptIndex = updated.findIndex(d => d.department === departmentName);
                                  
                                  if (deptIndex === -1) {
                                    updated.push({ department: departmentName, selectedElements: [] });
                                    deptIndex = updated.length - 1;
                                  }
                                  
                                  if (e.target.checked) {
                                    updated[deptIndex].selectedElements = [...updated[deptIndex].selectedElements, element];
                                  } else {
                                    updated[deptIndex].selectedElements = updated[deptIndex].selectedElements.filter(el => el !== element);
                                  }
                                  
                                  if (updated[deptIndex].selectedElements.length === 0) {
                                    updated.splice(deptIndex, 1);
                                  }
                                  
                                  setFormData(prev => ({ ...prev, selectedDepartments: updated }));
                                }}
                                className="w-3.5 h-3.5 text-teal-600 rounded"
                              />
                              <span className="text-sm text-gray-700">{element}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Audit Type */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Audit Type</label>
              <input 
                type="text"
                value={globalAuditType}
                disabled
                className="w-full p-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-400">Audit type is set globally for all schedules</p>
            </div>
       
{/* Auditor Selection - Show ONLY Team Auditors (Co-Auditors) from Form 5 */}
<div>
  <label className="flex items-center block gap-1 mb-1 text-sm font-medium text-gray-700">
    <FiUserCheck className="w-4 h-4 text-blue-500" /> Auditor *
  </label>
  
  {!selectedAuditDepartment ? (
    <div className="w-full p-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
      Please select a department first
    </div>
  ) : loadingDepartmentUsers ? (
    <div className="w-full p-2 text-sm text-center text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
      Loading team members...
    </div>
  ) : (
    <select
      value={formData.auditorId || ''}
      onChange={(e) => setFormData({...formData, auditorId: e.target.value})}
      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
    >
      <option value="">Select Auditor from Team</option>
      {(() => {
        console.log("Department Team Info:", departmentTeamInfo);
        console.log("Available departmentAuditors:", departmentAuditors);
        
        // ✅ ONLY use teamAuditorIds (Co-Auditors), NOT leadAuditorId
        const allowedIds = new Set();
        if (Array.isArray(departmentTeamInfo.teamAuditorIds)) {
          departmentTeamInfo.teamAuditorIds.forEach(id => allowedIds.add(id));
        }

        console.log("Allowed auditor IDs (Team only):", Array.from(allowedIds));

        // Filter to ONLY show team auditors (co-auditors)
        const availableTeamMembers = departmentAuditors.filter(auditor => 
          allowedIds.has(auditor.id)
        );

        console.log("Available team members (co-auditors):", availableTeamMembers);

        if (availableTeamMembers.length === 0) {
          return <option disabled>⚠️ No team auditors assigned for this department in Form 5</option>;
        }

        return availableTeamMembers.map(auditor => (
          <option key={auditor.id} value={auditor.id}>
            👥 {auditor.firstName} {auditor.lastName}
          </option>
        ));
      })()}
    </select>
  )}
</div>
            
            {/* Auditee Selection - Show ONLY selected auditees from Form 5 */}
<div>
  <label className="flex items-center block gap-1 mb-1 text-sm font-medium text-gray-700">
    <FiUserPlus className="w-4 h-4 text-green-500" /> Auditee *
  </label>
  
  {!selectedAuditDepartment ? (
    <div className="w-full p-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
      Please select a department first
    </div>
  ) : loadingDepartmentUsers ? (
    <div className="w-full p-2 text-sm text-center text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
      <div className="inline-block w-4 h-4 mr-2 border-2 border-gray-300 rounded-full animate-spin border-t-teal-600"></div>
      Loading auditees...
    </div>
  ) : departmentTeamInfo.auditeeIds?.length === 0 ? (
    <div className="flex items-center w-full gap-2 p-2 text-sm border rounded-lg text-amber-600 border-amber-200 bg-amber-50">
      <FiAlertCircle className="w-4 h-4" />
      No auditees assigned for {selectedAuditDepartment} department in Form 5
    </div>
  ) : (
    <select 
      value={formData.auditeeId || ''} 
      onChange={(e) => setFormData({...formData, auditeeId: e.target.value})} 
      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
    >
      <option value="">Select Auditee</option>
      {(() => {
        // ✅ Filter departmentAuditees to only show those selected in Form 5
        const selectedAuditeeIds = new Set(departmentTeamInfo.auditeeIds);
        const availableAuditees = departmentAuditees.filter(auditee => 
          selectedAuditeeIds.has(auditee.id)
        );
        
        if (availableAuditees.length === 0) {
          return <option disabled>No matching auditees found</option>;
        }
        
        return availableAuditees.map(auditee => (
          <option key={auditee.id} value={auditee.id}>
            {auditee.firstName} {auditee.lastName} 
            {auditee.role === 'HOD' ? ' (HOD)' : auditee.role === 'AUDITEE' ? ' (Staff)' : ''}
          </option>
        ));
      })()}
    </select>
  )}
  
  {/* Display Helper Text for auditees */}
  {selectedAuditDepartment && departmentTeamInfo.auditeeNames?.length > 0 && (
    <p className="mt-1 text-xs text-gray-500">
      Selected Auditees: {departmentTeamInfo.auditeeNames.join(', ')}
    </p>
  )}
</div>
          </>
        )}
        
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Status</label>
          <select 
            value={formData.status || 'SCHEDULED'} 
            onChange={(e) => setFormData({...formData, status: e.target.value})} 
            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Summary */}
        {selectedAuditDepartment && formData.auditorId && formData.auditeeId && (
          <div className="p-3 border border-green-200 rounded-lg bg-green-50">
            <p className="flex items-center gap-2 text-sm text-green-800">
              <FiCheckCircle className="w-4 h-4" />
              Schedule ready for {selectedAuditDepartment} department
            </p>
          </div>
        )}
      </div>
      
      <div className="sticky bottom-0 flex justify-end gap-3 p-4 bg-white border-t border-gray-200">
        <button onClick={() => { setShowModal(false); resetForm(); setSelectedAuditDepartment(''); }} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving || !selectedAuditDepartment || !formData.auditorId || !formData.auditeeId} 
          className="flex items-center gap-2 px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiSave className="w-4 h-4" />}
          {formData.id ? 'Update Schedule' : 'Add Schedule'}
        </button>
      </div>
    </div>
  </div>
)}

{/* Bulk Schedule Modal */}
{/* Bulk Schedule Modal */}
{/* Bulk Schedule Modal */}
{showBulkModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
      <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div>
          <h3 className="text-xl font-semibold">Bulk Schedule</h3>
          <p className="text-sm text-gray-500 mt-0.5">Schedule same audit for multiple dates</p>
        </div>
        <button onClick={() => {
          setShowBulkModal(false);
          setBulkSelectedAuditDepartment('');
        }} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
      </div>
      
      <div className="p-6 space-y-5">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">From Date *</label>
            <input 
              type="date" 
              value={bulkData.fromDate} 
              onChange={(e) => {
                setBulkData({...bulkData, fromDate: e.target.value, toDate: ''});
                setBulkSelectedAuditDepartment('');
              }} 
              className="w-full p-2 border border-gray-200 rounded-lg"
              min={startDate}
              max={endDate}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">To Date *</label>
            <input 
              type="date" 
              value={bulkData.toDate} 
              onChange={(e) => {
                setBulkData({...bulkData, toDate: e.target.value});
                setBulkSelectedAuditDepartment('');
              }} 
              className="w-full p-2 border border-gray-200 rounded-lg"
              min={bulkData.fromDate || startDate}
              max={endDate}
            />
          </div>
        </div>

        {/* Department Selection - Same as Show Modal */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Department to Audit *
          </label>
          <select
            value={bulkSelectedAuditDepartment}
            onChange={(e) => {
              const newDepartment = e.target.value;
              setBulkSelectedAuditDepartment(newDepartment);
              
              if (newDepartment && bulkData.fromDate) {
                const availableDepts = getAvailableDepartmentsForBulk();
                const selectedDeptInfo = availableDepts.find(d => d.department === newDepartment);
                
                if (selectedDeptInfo) {
                  setBulkData(prev => ({
                    ...prev,
                    selectedDepartments: [{
                      department: newDepartment,
                      selectedElements: [...selectedDeptInfo.auditElements]
                    }]
                  }));
                }
              } else if (!newDepartment) {
                setBulkData(prev => ({ ...prev, selectedDepartments: [] }));
              }
            }}
            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select Department</option>
            {getAvailableDepartmentsForBulk().map((deptInfo, idx) => (
              <option key={idx} value={deptInfo.department}>
                {deptInfo.department}
              </option>
            ))}
          </select>
          {bulkData.fromDate && bulkData.toDate && bulkSelectedAuditDepartment && (
            <p className="mt-1 text-xs text-gray-400">
              Selected department for bulk scheduling
            </p>
          )}
        </div>

        {/* Department Info Message */}
        {bulkSelectedAuditDepartment && (
          <div className="p-2 text-xs text-blue-600 rounded-lg bg-blue-50">
            <FiInfo className="inline w-3 h-3 mr-1" />
            Showing audit elements from {bulkSelectedAuditDepartment} department only
          </div>
        )}

        {/* Time Range with validation */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Start Time *</label>
            <select 
              value={bulkData.startTime || ''} 
              onChange={(e) => {
                const newStartTime = e.target.value;
                let newEndTime = bulkData.endTime;
                if (newEndTime && getTimeValue(newEndTime) <= getTimeValue(newStartTime)) {
                  newEndTime = '';
                }
                setBulkData({...bulkData, startTime: newStartTime, endTime: newEndTime});
              }} 
              className="w-full p-2 border border-gray-200 rounded-lg"
            >
              <option value="">Select start time</option>
              {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">End Time *</label>
            <select 
              value={bulkData.endTime || ''} 
              onChange={(e) => setBulkData({...bulkData, endTime: e.target.value})} 
              className="w-full p-2 border border-gray-200 rounded-lg"
            >
              <option value="">Select end time</option>
              {timeOptions
                .filter(time => {
                  if (!bulkData.startTime) return false;
                  return getTimeValue(time) > getTimeValue(bulkData.startTime);
                })
                .map(time => <option key={time} value={time}>{time}</option>)}
            </select>
            {bulkData.startTime && !bulkData.endTime && (
              <p className="mt-1 text-xs text-amber-600">Please select an end time after {bulkData.startTime}</p>
            )}
          </div>
        </div>

        {/* Special Event Checkbox */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={bulkData.isSpecialEvent || false} 
              onChange={(e) => setBulkData({
                ...bulkData, 
                isSpecialEvent: e.target.checked, 
                specialEventType: '', 
                selectedDepartments: []
              })} 
              className="w-4 h-4 text-teal-600 rounded" 
            />
            <span className="text-sm text-gray-700">This is a Special Event (Opening/Lunch/Closing)</span>
          </label>
        </div>

        {bulkData.isSpecialEvent ? (
          // ========== SPECIAL EVENT SECTION ==========
          <>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Event Type *</label>
              <select 
                value={bulkData.specialEventType || ''} 
                onChange={(e) => setBulkData({...bulkData, specialEventType: e.target.value})} 
                className="w-full p-2 border border-gray-200 rounded-lg"
              >
                <option value="">Select Event Type</option>
                <option value="OPENING">Opening Meeting</option>
                <option value="LUNCH">Lunch Break</option>
                <option value="CLOSING">Closing Meeting</option>
              </select>
            </div>
            
            {bulkData.specialEventType !== 'LUNCH' && (
              <>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Auditor *</label>
                  <select 
                    value={bulkData.auditorId || ''} 
                    onChange={(e) => setBulkData({...bulkData, auditorId: e.target.value})} 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Select Auditor</option>
                    {availableAuditors.map(a => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Auditee *</label>
                  <select 
                    value={bulkData.auditeeId || ''} 
                    onChange={(e) => setBulkData({...bulkData, auditeeId: e.target.value})} 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Select Auditee</option>
                    {getSortedAuditees().map(a => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            {bulkData.specialEventType === 'LUNCH' && (
              <div className="p-3 text-xs text-orange-700 rounded-lg bg-orange-50">
                <FiInfo className="inline w-4 h-4 mr-1" />
                Lunch Break - No auditor or auditee assignment needed.
              </div>
            )}
          </>
        ) : (
          // ========== REGULAR AUDIT SECTION - LIKE SHOW MODAL ==========
          <>
            {/* Audit Elements Selection - Filtered by selected department */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Select Audit Elements *</label>
              <div className="p-3 overflow-y-auto border border-gray-200 rounded-lg max-h-60">
                {!bulkSelectedAuditDepartment ? (
                  <p className="py-4 text-sm text-center text-gray-400">
                    Please select a department first
                  </p>
                ) : (
                  (() => {
                    const availableDepts = getAvailableDepartmentsForBulk();
                    const deptInfo = availableDepts.find(d => d.department === bulkSelectedAuditDepartment);
                    
                    if (!deptInfo || deptInfo.auditElements.length === 0) {
                      return (
                        <p className="py-4 text-sm text-center text-gray-400">
                          No audit elements available for {bulkSelectedAuditDepartment}
                        </p>
                      );
                    }
                    
                    const selectedDept = bulkData.selectedDepartments?.find(d => d.department === bulkSelectedAuditDepartment);
                    const selectedElements = selectedDept?.selectedElements || [];
                    
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedElements.length === deptInfo.auditElements.length}
                              onChange={(e) => {
                                let updated = [...(bulkData.selectedDepartments || [])];
                                const existingIndex = updated.findIndex(d => d.department === bulkSelectedAuditDepartment);
                                
                                if (e.target.checked) {
                                  if (existingIndex >= 0) {
                                    updated[existingIndex].selectedElements = [...deptInfo.auditElements];
                                  } else {
                                    updated.push({
                                      department: bulkSelectedAuditDepartment,
                                      selectedElements: [...deptInfo.auditElements]
                                    });
                                  }
                                } else {
                                  if (existingIndex >= 0) {
                                    updated.splice(existingIndex, 1);
                                  }
                                }
                                setBulkData(prev => ({ ...prev, selectedDepartments: updated }));
                              }}
                              className="w-4 h-4 text-teal-600 rounded"
                            />
                            <span className="font-medium text-gray-800">{bulkSelectedAuditDepartment}</span>
                            <span className="text-xs text-gray-400">({deptInfo.auditElements.length} audit types)</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 ml-6 md:grid-cols-2">
                          {deptInfo.auditElements.map(element => (
                            <label key={element} className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-100">
                              <input
                                type="checkbox"
                                checked={selectedElements.includes(element)}
                                onChange={(e) => {
                                  let updated = [...(bulkData.selectedDepartments || [])];
                                  let deptIndex = updated.findIndex(d => d.department === bulkSelectedAuditDepartment);
                                  
                                  if (deptIndex === -1) {
                                    updated.push({ department: bulkSelectedAuditDepartment, selectedElements: [] });
                                    deptIndex = updated.length - 1;
                                  }
                                  
                                  if (e.target.checked) {
                                    updated[deptIndex].selectedElements = [...updated[deptIndex].selectedElements, element];
                                  } else {
                                    updated[deptIndex].selectedElements = updated[deptIndex].selectedElements.filter(el => el !== element);
                                  }
                                  
                                  if (updated[deptIndex].selectedElements.length === 0) {
                                    updated.splice(deptIndex, 1);
                                  }
                                  
                                  setBulkData(prev => ({ ...prev, selectedDepartments: updated }));
                                }}
                                className="w-3.5 h-3.5 text-teal-600 rounded"
                              />
                              <span className="text-sm text-gray-700">{element}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Audit Type */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Audit Type</label>
              <input 
                type="text"
                value={globalAuditType}
                disabled
                className="w-full p-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-400">Audit type is set globally for all schedules</p>
            </div>

            {/* Auditor & Auditee - Filtered by department team */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center block gap-1 mb-1 text-sm font-medium text-gray-700">
                  <FiUserCheck className="w-4 h-4 text-blue-500" /> Auditor *
                </label>
                {!bulkSelectedAuditDepartment ? (
                  <div className="w-full p-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                    Please select a department first
                  </div>
                ) : (
                  <select 
                    value={bulkData.auditorId || ''} 
                    onChange={(e) => setBulkData({...bulkData, auditorId: e.target.value})} 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Select Auditor from Team</option>
                    {availableAuditors
                      .filter(auditor => {
                        // Filter by department team
                        const teamInfo = getTeamMembersForDepartment(bulkSelectedAuditDepartment, bulkData.fromDate);
                        const teamAuditorIds = teamInfo.teamAuditorIds || [];
                        return teamAuditorIds.includes(auditor.id);
                      })
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          👥 {a.firstName} {a.lastName}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <div>
                <label className="flex items-center block gap-1 mb-1 text-sm font-medium text-gray-700">
                  <FiUserPlus className="w-4 h-4 text-green-500" /> Auditee *
                </label>
                {!bulkSelectedAuditDepartment ? (
                  <div className="w-full p-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                    Please select a department first
                  </div>
                ) : (
                  <select 
                    value={bulkData.auditeeId || ''} 
                    onChange={(e) => setBulkData({...bulkData, auditeeId: e.target.value})} 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Select Auditee</option>
                    {(() => {
                      const teamInfo = getTeamMembersForDepartment(bulkSelectedAuditDepartment, bulkData.fromDate);
                      const selectedAuditeeIds = new Set(teamInfo.auditeeIds || []);
                      return getSortedAuditees()
                        .filter(auditee => selectedAuditeeIds.has(auditee.id))
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.firstName} {a.lastName} {a.role === 'HOD' ? ' (HOD)' : ''}
                          </option>
                        ));
                    })()}
                  </select>
                )}
              </div>
            </div>
          </>
        )}

        {/* Status */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Status</label>
          <select 
            value={bulkData.status} 
            onChange={(e) => setBulkData({...bulkData, status: e.target.value})} 
            className="w-full p-2 border border-gray-200 rounded-lg"
          >
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Summary */}
        {bulkSelectedAuditDepartment && bulkData.auditorId && bulkData.auditeeId && (
          <div className="p-3 border border-green-200 rounded-lg bg-green-50">
            <p className="flex items-center gap-2 text-sm text-green-800">
              <FiCheckCircle className="w-4 h-4" />
              Schedule ready for {bulkSelectedAuditDepartment} department
            </p>
          </div>
        )}

        {/* Info Message */}
        <div className="p-3 text-xs text-blue-700 rounded-lg bg-blue-50">
          <FiInfo className="inline w-4 h-4 mr-1" />
          This will create separate schedules for each date in the range (excluding weekends). 
          Existing schedules for these dates will be skipped.
        </div>
      </div>
      
      <div className="sticky bottom-0 flex justify-end gap-3 p-4 bg-white border-t border-gray-200">
        <button onClick={() => {
          setShowBulkModal(false);
          setBulkSelectedAuditDepartment('');
        }} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button 
          onClick={handleBulkSchedule} 
          disabled={saving || !bulkSelectedAuditDepartment || !bulkData.auditorId || !bulkData.auditeeId || !bulkData.startTime || !bulkData.endTime} 
          className="flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCalendar className="w-4 h-4" />}
          Create Bulk Schedules
        </button>
      </div>
    </div>
  </div>
)}
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">Reject Schedule for {selectedRejectDate}</h3>
            <p className="mb-4 text-sm text-gray-600">Please provide a reason for rejection:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRejectDate(null);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
  onClick={() => {
    if (window.tempScheduleId) {
      handleRejectSchedule(window.tempScheduleId);
      window.tempScheduleId = null;
    } else {
      handleRejectDate();
    }
  }}
  disabled={submitting}
  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
>
  Confirm Reject
</button>
            </div>
          </div>
        </div>
      )}
      {/* Change Request Modal */}
{showChangeRequestModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="w-full max-w-md p-6 bg-white rounded-xl">
      <h3 className="mb-4 text-xl font-semibold text-gray-800">
        Request Changes for Schedule
      </h3>
      <p className="mb-4 text-sm text-gray-600">
        Please provide details about what changes are needed:
      </p>
      <textarea
        value={changeRequestReason}
        onChange={(e) => setChangeRequestReason(e.target.value)}
        rows={4}
        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
        placeholder="Describe the changes required..."
        autoFocus
      />
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => {
            setShowChangeRequestModal(false);
            setChangeRequestReason('');
            window.tempScheduleId = null;
            setSelectedRejectDate(null);
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (window.tempScheduleId) {
              handleRequestChanges(window.tempScheduleId);
              window.tempScheduleId = null;
            }
          }}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
          ) : (
            <FiMessageSquare className="w-4 h-4" />
          )}
          Submit Change Request
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Form5DetailedView;