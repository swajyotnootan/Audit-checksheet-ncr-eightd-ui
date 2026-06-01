// src/components/forms/Form5View.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { useNavigate} from 'react-router-dom';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { 
  FiRefreshCw, FiCalendar, FiFileText, FiUsers, 
  FiTrendingUp, FiEye, FiPlus, FiX, FiSend, 
  FiCheck, FiSave, FiAlertCircle, FiBarChart2,
  FiChevronDown, FiChevronUp, FiInfo, FiCheckCircle,
  FiClock, FiAlertTriangle, FiUserCheck, FiUserPlus,
  FiEdit2, FiTrash2, FiGrid, FiList, FiArrowRight, FiMessageSquare, FiDownload
} from 'react-icons/fi';
import ScheduleMatrixView from './ScheduleMatrixView';
import ScheduleListView from './ScheduleListView';
import ScheduleModal from './ScheduleModal';
import DocumentControlSection from './DocumentControlSection';
import StatisticsCard from './StatisticsCard';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

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
});  const [selectedMonth, setSelectedMonth] = useState(preselectedMonth || "");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [auditees, setAuditees] = useState([]);
  const [planStatus, setPlanStatus] = useState({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState('matrix');
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');

  // Comment Modal States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState('');
  const [tempRejectionReason, setTempRejectionReason] = useState('');
  // Department-wise filtering states for Form5


  const [monthComments, setMonthComments] = useState({
    approvalComments: '',
    rejectionReason: '',
    rejectedBy: '',
    rejectedAt: null,
    changeRequestedBy: '',
    changeRequestedAt: null
  });

  const [summary, setSummary] = useState({
    totalSchedules: 0,
    departmentsCount: 0,
    weeksCovered: 0,
    completed: 0,
    inProgress: 0,
    scheduled: 0
  });
  
  // Document Control State
  const [documentInfo, setDocumentInfo] = useState({
    documentRevision: '1.0',
    revisionDate: new Date().toISOString().split('T')[0],
    revisionDetails: 'First Approved copy (IATF16949)',
    auditFrequency: 'Half yearly',
    preparedBy: '',
    approvedBy: '',
    approvedAt: null
  });
  
  
  
  // Audit Objective & Scope
  const [auditObjective, setAuditObjective] = useState(`* To assess the effectiveness and efficiency of the quality management system.
* To verify compliance with IATF16949:2016 requirement.
* To detect a particular problem for improvement.
* Other.`);

  const [auditScope, setAuditScope] = useState("All elements of quality system");
  
  const [formData, setFormData] = useState({
    department: '',
    month: '',
    week: '',
    auditElements: [],
    auditorId: '',
    auditeeId: '',
    status: 'SCHEDULED'
  });
  
const [availableYears, setAvailableYears] = useState([]);
// Add this near other useState declarations
const [auditTeam, setAuditTeam] = useState({
    leadAuditorId: '',
    leadAuditorName: '',
    teamAuditorIds: [],
    teamAuditorNames: []
});

  // Constants
  const weeks = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  const auditElementsMap = {
    "System Audit (ISO9001)": "A",
    "System Audit (IATF16949)": "B",
    "5S Audit": "C",
    "Process Audit": "D",
    "Product Audit": "E"
  };

  const getWeeksForMonth = useCallback((year, month) => {
    const monthMap = {
      "Apr": 3, "May": 4, "Jun": 5, "Jul": 6,
      "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10,
      "Dec": 11, "Jan": 0, "Feb": 1, "Mar": 2
    };
    
    const monthNum = monthMap[month];
    if (monthNum === undefined) return 4;
    
    const actualYear = (month === "Jan" || month === "Feb" || month === "Mar") ? year + 1 : year;
    const firstDay = new Date(actualYear, monthNum, 1).getDay();
    const daysInMonth = new Date(actualYear, monthNum + 1, 0).getDate();
    const weeksCount = Math.ceil((daysInMonth + firstDay) / 7);
    
    return weeksCount;
  }, []);

  const monthWeeksCount = selectedMonth ? getWeeksForMonth(selectedYear, selectedMonth) : 4;
  const displayWeeks = weeks.slice(0, monthWeeksCount);

 

  // Fetch users
 // MODIFY the fetchUsers function - remove fetching all auditors since we filter by department now
// Fetch users - simplified, only needed for auditees if any
const fetchUsers = useCallback(async () => {
  try {
    // Only fetch if needed elsewhere
    const auditeesList = await auditScheduleApi.getAuditees();
    setAuditees(auditeesList || []);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}, []);
  // Fetch available months
  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = response.data || [];
      setAvailableMonths(months);
      
      const initialStatus = {};
      months.forEach(month => {
        initialStatus[month.month] = month.approvalStatus || 'DRAFT';
      });
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

  // Fetch available departments
  const fetchAvailableDepartments = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const response = await auditScheduleApi.getAvailableDepartments(selectedYear, selectedMonth);
      const depts = response.data || [];
      setAvailableDepartments(depts);
    } catch (error) {
      console.error('Error fetching available departments:', error);
      setAvailableDepartments([]);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch schedules
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

        // ✅ FIX: Properly read preparedBy from multiple possible field names
      const preparedByValue = firstSchedule.preparedBy || 
                              firstSchedule.preparedByName || 
                              firstSchedule.prepared_by_name ||
                              firstSchedule.prepared_by ||
                              'Not available';
      
      console.log('📋 First schedule preparedBy:', preparedByValue);
      
      // ✅ Update documentInfo with the preparedBy value
      if (preparedByValue && preparedByValue !== 'Not available') {
        setDocumentInfo(prev => ({
          ...prev,
          preparedBy: preparedByValue
        }));
      }
        setMonthComments({
          approvalComments: firstSchedule.approvalComments || '',
          rejectionReason: firstSchedule.rejectionReason || '',
          rejectedBy: firstSchedule.rejectedByName || '',
          rejectedAt: firstSchedule.rejectedAt || null,
          changeRequestedBy: firstSchedule.changeRequestedBy || '',
          changeRequestedAt: firstSchedule.changeRequestedAt || null
        });
        
        if (firstSchedule.rejectionReason) {
          setRejectionReason(firstSchedule.rejectionReason);
        }
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      addToast('Failed to load schedules', 'error');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, addToast]);
  const fetchSummary = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const response = await auditScheduleApi.getSummary(selectedYear, selectedMonth);
      setSummary(response.data || {
        totalSchedules: 0,
        departmentsCount: 0,
        weeksCovered: 0,
        completed: 0,
        inProgress: 0,
        scheduled: 0
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [selectedYear, selectedMonth]);

  // Load all initial data
  // In the initial load useEffect, remove fetchDepartments()
useEffect(() => {
  const loadData = async () => {
    if (preselectedYear) setSelectedYear(preselectedYear);
    await fetchUsers();  // Keep this if needed
    await fetchAvailableMonths();
    // await fetchDepartments();  // DELETE THIS LINE
    if (preselectedMonth) {
      setSelectedMonth(preselectedMonth);
    }
  };
  loadData();
}, [fetchUsers, fetchAvailableMonths, preselectedYear, preselectedMonth]);
  // Load month-specific data
  useEffect(() => {
    if (selectedMonth) {
      setLoading(true);
      Promise.all([
        fetchAvailableDepartments(),
        fetchSchedules(),
        fetchSummary()
      ]).finally(() => setLoading(false));
    }
  }, [selectedMonth, selectedYear, fetchAvailableDepartments, fetchSchedules, fetchSummary]);

  // When year changes, refetch available months
  useEffect(() => {
    if (!preselectedYear) {
      fetchAvailableMonths();
    }
  }, [selectedYear]);

  useEffect(() => {
  if (urlYear) {
    setSelectedYear(parseInt(urlYear));
  }
}, [urlYear]);


  useEffect(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }
  setAvailableYears(years);
}, []);

  

  const handleDownloadPDF = async () => {
    if (!selectedMonth) {
      addToast('Please select a month first', 'warning');
      return;
    }
    setDownloading(true);
    try {
      const response = await axios.get(
        `${API_BASE}/audit-schedule/${selectedYear}/${selectedMonth}/download`,
        {
          responseType: 'blob',
          withCredentials: true
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Form5_Internal_Quality_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      addToast('Failed to download PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // CRUD Operations
 // In Form5View.jsx, replace the handleSubmitSchedule function with this:

const handleSubmitSchedule = async (scheduleData) => {
    const currentStatus = planStatus[selectedMonth];
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED' && currentStatus !== 'CHANGE_REQUESTED') {
        addToast(`Cannot modify schedule when ${monthDisplay[selectedMonth]} status is ${currentStatus}`, 'warning');
        return false;
    }

    setSaving(true);
    try {
        // ✅ Prepare data exactly as the Detailed Schedule Service expects it
        const saveData = {
            id: scheduleData.id, // If editing, include ID
            planYear: selectedYear,
            department: scheduleData.department,
            month: scheduleData.month,
            week: scheduleData.week,
            
            // Primary Auditor
            auditorId: parseInt(scheduleData.auditorId),
            
            // ✅ Multiple Auditees (Service looks for these keys)
            auditeeIdList: scheduleData.auditeeIdList || [], 
            auditeeNames: scheduleData.auditeeNames || [],
            
            // ✅ Multiple Co-Auditors (Service looks for these keys)
            coAuditorIdList: scheduleData.coAuditorIdList || [],
            coAuditorNames: scheduleData.coAuditorNames || [],
            
            status: scheduleData.status || 'SCHEDULED',
            
            
            // Optional: If you want to save audit elements too
            auditElements: scheduleData.auditElements || []
        };

        console.log("Sending to Detailed Save Endpoint:", saveData);

        // ✅ CHANGE THIS: Use saveDetailedSchedule instead of create/update
        // This endpoint handles the JSON serialization for lists
        // For week schedules (CORRECT)
          if (editingSchedule && editingSchedule.id) {
              await auditScheduleApi.update(editingSchedule.id, saveData);
          } else {
              await auditScheduleApi.create(saveData, user?.id);
          }
        
        addToast('Schedule saved successfully!', 'success');
        
        // Refresh data
        await fetchSchedules();
        await fetchSummary();
        setShowForm(false);      // ✅ ADD THIS LINE
  setEditingSchedule(null); // ✅ ADD THIS LINE
        return true;

    } catch (error) {
        console.error('Error saving schedule:', error);
        addToast(error.response?.data?.message || 'Failed to save schedule', 'error');
        return false;
    } finally {
        setSaving(false);
    }
};
  const handleDeleteSchedule = async (id, month) => {
    const currentStatus = planStatus[month];
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED' && currentStatus !== 'CHANGE_REQUESTED') {
      addToast(`Cannot delete schedule when ${monthDisplay[month]} status is ${currentStatus}`, 'warning');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await auditScheduleApi.delete(id);
        addToast('Schedule deleted successfully!', 'success');
        await fetchSchedules();
        await fetchSummary();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        addToast('Failed to delete schedule', 'error');
      }
    }
  };

const handleSaveDocument = async () => {
  const currentStatus = planStatus[selectedMonth];
  if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED' && currentStatus !== 'CHANGE_REQUESTED') {
    addToast(`Only draft or rejected plans can be saved`, 'warning');
    return;
  }

  setSaving(true);
  try {
    const preparedByName = user?.name || user?.username || documentInfo.preparedBy || 'Unknown User';
    
    // ✅ CORRECT: For each schedule, separate audit elements from team members
    const schedulesWithTeams = schedules.map(schedule => {
      // Get the team for this department from departmentTeams state
      const departmentTeam = departmentTeams[schedule.department];
      
      return {
        id: schedule.id,
        planYear: selectedYear,
        department: schedule.department,
        month: schedule.month,
        week: schedule.week,
        auditElements: schedule.auditElements || [],  // Audit types stay here
        // ✅ Team members are USER IDs, not audit elements
        leadAuditorId: departmentTeam?.leadAuditorId ? parseInt(departmentTeam.leadAuditorId) : schedule.leadAuditorId,
        leadAuditorName: departmentTeam?.leadAuditorName || schedule.leadAuditorName,
        teamAuditorIds: departmentTeam?.teamAuditorIds?.map(id => parseInt(id)) || schedule.teamAuditorIds || [],
        teamAuditorNames: departmentTeam?.teamAuditorNames || schedule.teamAuditorNames || [],
        auditorId: schedule.auditorId,
        auditeeId: schedule.auditeeId,
        status: schedule.status
      };
    });
    
    const saveData = {
      planYear: selectedYear,
      month: selectedMonth,
      schedules: schedulesWithTeams,
      auditObjective: auditObjective,
      auditScope: auditScope,
      documentRevision: documentInfo.documentRevision,
      revisionDate: documentInfo.revisionDate,
      revisionDetails: documentInfo.revisionDetails,
      auditFrequency: documentInfo.auditFrequency,
      preparedBy: preparedByName,
      preparedByName: preparedByName,
      approvalStatus: 'DRAFT'
    };
    
    await auditScheduleApi.saveMonthDocument(saveData, user?.id);
    addToast(`${monthDisplay[selectedMonth]} schedule saved as DRAFT!`, 'success');
    await fetchSchedules();
    await fetchAvailableMonths();
  } catch (error) {
    console.error('Error saving document:', error);
    addToast('Failed to save document', 'error');
  } finally {
    setSaving(false);
  }
};
const handleSubmitForApproval = async () => {
  if (schedules.length === 0) {
    addToast(`No schedules found for ${monthDisplay[selectedMonth]}. Please add schedules first.`, 'warning');
    return;
  }

  setSubmitting(true);
  try {
    const preparedByName = user?.name || user?.username || documentInfo.preparedBy || 'Unknown User';
    
    // Simplified saveData without auditTeam
    const saveData = {
      planYear: selectedYear,
      month: selectedMonth,
      schedules: schedules,
      auditObjective: auditObjective,
      auditScope: auditScope,
      documentRevision: documentInfo.documentRevision,
      revisionDate: documentInfo.revisionDate,
      revisionDetails: documentInfo.revisionDetails,
      auditFrequency: documentInfo.auditFrequency,
      preparedBy: preparedByName,
      preparedByName: preparedByName,
      approvalStatus: 'PENDING_APPROVAL'
    };
    
    await auditScheduleApi.saveMonthDocument(saveData, user?.id);
    await auditScheduleApi.submitMonth(selectedYear, selectedMonth, user?.id);
    
    setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'PENDING_APPROVAL' }));
    addToast(`${monthDisplay[selectedMonth]} schedule submitted for approval!`, 'success');
    
    await fetchSchedules();
    await fetchAvailableMonths();
  } catch (error) {
    console.error('Error submitting plan:', error);
    addToast('Failed to submit plan', 'error');
  } finally {
    setSubmitting(false);
  }
};

  const handleApprove = async () => {
  if (!tempApprovalComment.trim()) {
    addToast('Please provide approval comments', 'warning');
    return;
  }

  setSubmitting(true);
  try {
    await auditScheduleApi.approveMonth(selectedYear, selectedMonth, user?.id, tempApprovalComment);
    setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'APPROVED' }));
    setMonthComments({
      approvalComments: tempApprovalComment,
      rejectionReason: '',         // ✅ Clear rejection reason
      rejectedBy: '',              // ✅ Clear rejected by
      rejectedAt: null,            // ✅ Clear rejected at
      changeRequestedBy: '',       // ✅ Clear change request
      changeRequestedAt: null
    });
    setShowApproveModal(false);
    setTempApprovalComment('');
    addToast(`${monthDisplay[selectedMonth]} schedule approved successfully!`, 'success');
    await fetchSchedules();
    await fetchAvailableMonths();
  } catch (error) {
    console.error('Error approving plan:', error);
    addToast('Failed to approve schedule', 'error');
  } finally {
    setSubmitting(false);
  }
};

  const handleReject = async () => {
  if (!tempRejectionReason.trim()) {
    addToast('Please provide a rejection reason', 'error');
    return;
  }

  setSubmitting(true);
  try {
    await auditScheduleApi.rejectMonth(selectedYear, selectedMonth, user?.id, tempRejectionReason);
    setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'REJECTED' }));
    setRejectionReason(tempRejectionReason);
    setMonthComments({
      approvalComments: '',        // ✅ Clear approval comments
      rejectionReason: tempRejectionReason,
      rejectedBy: user?.name || user?.username,
      rejectedAt: new Date().toISOString(),
      changeRequestedBy: '',       // ✅ Clear change request
      changeRequestedAt: null
    });
    setShowRejectModal(false);
    setTempRejectionReason('');
    addToast(`${monthDisplay[selectedMonth]} schedule rejected`, 'error');
    await fetchSchedules();
    await fetchAvailableMonths();
  } catch (error) {
    console.error('Error rejecting plan:', error);
    addToast('Failed to reject schedule', 'error');
  } finally {
    setSubmitting(false);
  }
};

 const handleRequestChanges = async () => {
  if (!changeRequestReason.trim()) {
    addToast('Please provide a reason for changes', 'error');
    return;
  }

  setSubmitting(true);
  try {
    await axios.post(`${API_BASE}/audit-schedule/${selectedYear}/${selectedMonth}/request-changes?userId=${user?.id}`, {
      reason: changeRequestReason
    }, { withCredentials: true });
    
    setPlanStatus(prev => ({ ...prev, [selectedMonth]: 'CHANGE_REQUESTED' }));
    setMonthComments({
      approvalComments: '',         // ✅ Clear approval comments
      rejectionReason: changeRequestReason,
      rejectedBy: '',              // ✅ Clear rejected by
      rejectedAt: null,            // ✅ Clear rejected at
      changeRequestedBy: user?.name || user?.username,
      changeRequestedAt: new Date().toISOString()
    });
    
    addToast(`Change request submitted for ${monthDisplay[selectedMonth]} ${selectedYear}`, 'warning');
    setShowChangeRequestModal(false);
    setChangeRequestReason('');
    await fetchAvailableMonths();
    await fetchSchedules();
  } catch (error) {
    console.error('Error requesting changes:', error);
    addToast(error.response?.data?.message || 'Failed to submit change request', 'error');
  } finally {
    setSubmitting(false);
  }
};

  const isMonthEditable = (month) => {
    const status = planStatus[month] || 'DRAFT';
    return status === 'DRAFT' || status === 'REJECTED' || status === 'CHANGE_REQUESTED';
  };

  const hasSchedules = schedules.length > 0;
  const canEdit = (isAuditManager && isMonthEditable(selectedMonth));
  const canSubmit = (isAuditManager && isMonthEditable(selectedMonth) && hasSchedules);
  const canApprove = (isTopManagement && planStatus[selectedMonth] === 'PENDING_APPROVAL');

  useEffect(() => {
    if (schedules.length > 0 && !canEdit && planStatus[selectedMonth] === 'APPROVED') {
      const scheduleWithAuditors = schedules.find(s => s.leadAuditorId || (s.teamAuditorIds && s.teamAuditorIds.length > 0));
      
      if (scheduleWithAuditors) {
        let teamIds = scheduleWithAuditors.teamAuditorIds || [];
        if (typeof teamIds === 'string') {
          try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; }
        }
        
        setAuditTeam({
          leadAuditorId: scheduleWithAuditors.leadAuditorId || '',
          leadAuditorName: scheduleWithAuditors.leadAuditorName || '',
          teamAuditorIds: teamIds,
          teamAuditorNames: scheduleWithAuditors.teamAuditorNames || []
        });
      }
    }
    
    if (schedules.length > 0 && planStatus[selectedMonth] === 'CHANGE_REQUESTED') {
      const scheduleWithAuditors = schedules.find(s => s.leadAuditorId || (s.teamAuditorIds && s.teamAuditorIds.length > 0));
      
      if (scheduleWithAuditors) {
        let teamIds = scheduleWithAuditors.teamAuditorIds || [];
        if (typeof teamIds === 'string') {
          try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; }
        }
        
        setAuditTeam({
          leadAuditorId: scheduleWithAuditors.leadAuditorId ? scheduleWithAuditors.leadAuditorId.toString() : '',
          leadAuditorName: scheduleWithAuditors.leadAuditorName || '',
          teamAuditorIds: teamIds.map(id => id.toString()),
          teamAuditorNames: scheduleWithAuditors.teamAuditorNames || []
        });
      }
    }
  }, [schedules, canEdit, selectedMonth, planStatus]);

  const getPlanStatusBadge = () => {
    const status = planStatus[selectedMonth] || 'DRAFT';
    const badges = {
      'APPROVED': 'bg-emerald-100 text-emerald-700',
      'PENDING_APPROVAL': 'bg-amber-100 text-amber-700',
      'REJECTED': 'bg-rose-100 text-rose-700',
      'CHANGE_REQUESTED': 'bg-orange-100 text-orange-700',
      'DRAFT': 'bg-slate-100 text-slate-600'
    };
    const icons = { 'APPROVED': '✓', 'PENDING_APPROVAL': '⏳', 'REJECTED': '✗', 'DRAFT': '📝', 'CHANGE_REQUESTED': '↻' };
    const labels = { 'APPROVED': 'Approved', 'PENDING_APPROVAL': 'Pending', 'REJECTED': 'Rejected', 'DRAFT': 'Draft', 'CHANGE_REQUESTED': 'Changes Requested' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {icons[status]} {labels[status]}
      </span>
    );
  };

  

  if (loading && !selectedMonth) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 shadow-lg bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Internal Quality Audit Schedule</h1>
                <p className="text-sm text-slate-500">Form 5 - Week-wise Audit Planning (W-1 to W-4)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Status:</span>
                {getPlanStatusBadge()}
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 text-sm bg-white border shadow-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year} - {year + 1}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium min-w-[200px] shadow-sm focus:ring-2 focus:ring-indigo-500"
              >
                {availableMonths.length === 0 ? (
                  <option value="">No months available</option>
                ) : (
                  availableMonths.map(month => {
                    const monthStatus = planStatus[month.month] || month.approvalStatus || 'DRAFT';
                    const icons = { 'APPROVED': '✓', 'PENDING_APPROVAL': '⏳', 'REJECTED': '✗', 'DRAFT': '📝', 'CHANGE_REQUESTED': '↻' };
                    return (
                      <option key={month.month} value={month.month} disabled={!month.hasPlannedAudits}>
                        {icons[monthStatus]} {monthDisplay[month.month]} 
                        {!month.hasPlannedAudits && ' (No planned audits)'}
                      </option>
                    );
                  })
                )}
              </select>
              <button 
                onClick={() => { fetchAvailableMonths(); fetchSchedules(); fetchSummary(); fetchUsers(); }} 
                className="p-2 transition-colors text-slate-500 hover:text-indigo-600 rounded-xl"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={downloading || !selectedMonth}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all
                  ${downloading || !selectedMonth
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-md'
                  }`}
                title="Download Form 5 PDF"
              >
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                ) : (
                  <FiDownload className="w-4 h-4" />
                )}
                {downloading ? 'Downloading…' : 'Download PDF'}
              </button>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setViewMode('matrix')} 
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${viewMode === 'matrix' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  <FiGrid className="w-4 h-4" /> Matrix
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  <FiList className="w-4 h-4" /> List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Banners */}
        {selectedMonth && planStatus[selectedMonth] === 'APPROVED' && (
          <div className="p-4 mb-6 border shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <FiCheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">✓ Month Approved</p>
                <p className="text-xs text-emerald-600">This month's schedule has been approved.</p>
              </div>
            </div>
          </div>
        )}

        {selectedMonth && planStatus[selectedMonth] === 'PENDING_APPROVAL' && (
          <div className="p-4 mb-6 border bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <FiClock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">⏳ Pending Approval</p>
                <p className="text-xs text-amber-600">Waiting for Top Management review. No changes allowed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Approval Comments Display - Only show when status is APPROVED */}
{selectedMonth && planStatus[selectedMonth] === 'APPROVED' && monthComments.approvalComments && (
  <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
    <div className="flex items-start gap-2">
      <FiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-green-800">Approval Comments</p>
        <p className="text-sm text-green-600">{monthComments.approvalComments}</p>
        <p className="mt-1 text-xs text-green-500">
          Approved by: Top Management | Date: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  </div>
)}

{/* Change Request Comments Display - Only show when status is CHANGE_REQUESTED */}
{selectedMonth && planStatus[selectedMonth] === 'CHANGE_REQUESTED' && monthComments.rejectionReason && (
  <div className="p-3 mb-4 border border-orange-200 rounded-lg bg-orange-50">
    <div className="flex items-start gap-2">
      <FiMessageSquare className="w-5 h-5 text-orange-500 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-orange-800">Change Request Comments</p>
        <p className="text-sm text-orange-600">{monthComments.rejectionReason}</p>
        {monthComments.changeRequestedBy && (
          <p className="mt-1 text-xs text-orange-500">
            Requested by: {monthComments.changeRequestedBy} | Date: {monthComments.changeRequestedAt && new Date(monthComments.changeRequestedAt).toLocaleString()}
          </p>
        )}
        <p className="mt-1 text-xs text-orange-500">Please review the requested changes and update the plan.</p>
      </div>
    </div>
  </div>
)}

{/* Rejection Comments Display - Only show when status is REJECTED */}
{selectedMonth && planStatus[selectedMonth] === 'REJECTED' && monthComments.rejectionReason && (
  <div className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
    <div className="flex items-start gap-2">
      <FiX className="w-5 h-5 text-red-500 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-red-800">Rejection Reason</p>
        <p className="text-sm text-red-600">{monthComments.rejectionReason}</p>
        {monthComments.rejectedBy && (
          <p className="mt-1 text-xs text-red-500">
            Rejected by: {monthComments.rejectedBy} | Date: {monthComments.rejectedAt && new Date(monthComments.rejectedAt).toLocaleString()}
          </p>
        )}
        <p className="mt-1 text-xs text-red-500">Please make necessary corrections and resubmit.</p>
      </div>
    </div>
  </div>
)}

{/* Plan History & Comments Section - Shows ALL comments for reference */}
{(monthComments.approvalComments || monthComments.rejectionReason) && (
  <div className="p-4 mb-6 border border-gray-200 rounded-lg bg-gray-50">
    <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
      <FiMessageSquare className="w-4 h-4" />
      Plan History & Comments
    </h3>
    <div className="space-y-3">
      {/* Only show approval comment if status is APPROVED */}
      {planStatus[selectedMonth] === 'APPROVED' && monthComments.approvalComments && (
        <div className="pl-3 text-sm border-l-2 border-green-400">
          <div className="flex items-center gap-2 mb-1">
            <FiCheckCircle className="w-4 h-4 text-green-500" />
            <span className="font-medium text-green-700">Approval Comment</span>
          </div>
          <p className="ml-6 text-gray-600">{monthComments.approvalComments}</p>
        </div>
      )}
      
      {/* Only show rejection reason if status is REJECTED */}
      {planStatus[selectedMonth] === 'REJECTED' && monthComments.rejectionReason && (
        <div className="pl-3 text-sm border-l-2 border-red-400">
          <div className="flex items-center gap-2 mb-1">
            <FiX className="w-4 h-4 text-red-500" />
            <span className="font-medium text-red-700">Rejection Reason</span>
          </div>
          <p className="ml-6 text-gray-600">{monthComments.rejectionReason}</p>
          {monthComments.rejectedBy && (
            <p className="mt-1 ml-6 text-xs text-gray-400">
              By: {monthComments.rejectedBy} | Date: {monthComments.rejectedAt && new Date(monthComments.rejectedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
      
      {/* Only show change request if status is CHANGE_REQUESTED */}
      {planStatus[selectedMonth] === 'CHANGE_REQUESTED' && monthComments.rejectionReason && (
        <div className="pl-3 text-sm border-l-2 border-orange-400">
          <div className="flex items-center gap-2 mb-1">
            <FiMessageSquare className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-orange-700">Change Request</span>
          </div>
          <p className="ml-6 text-gray-600">{monthComments.rejectionReason}</p>
          {monthComments.changeRequestedBy && (
            <p className="mt-1 ml-6 text-xs text-gray-400">
              By: {monthComments.changeRequestedBy} | Date: {monthComments.changeRequestedAt && new Date(monthComments.changeRequestedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
      
      {/* No comments message */}
      {(planStatus[selectedMonth] !== 'APPROVED' && planStatus[selectedMonth] !== 'REJECTED' && planStatus[selectedMonth] !== 'CHANGE_REQUESTED') && (
        <p className="text-sm italic text-gray-400">No comments available for current status</p>
      )}
    </div>
  </div>
)}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4 lg:grid-cols-6">
          <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
            <p className="text-xs text-slate-500">Total Schedules</p>
            <p className="text-2xl font-bold text-slate-800">{summary.totalSchedules}</p>
          </div>
          <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
            <p className="text-xs text-emerald-600">Completed</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.completed}</p>
          </div>
          <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
            <p className="text-xs text-blue-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{summary.inProgress}</p>
          </div>
          <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
            <p className="text-xs text-amber-600">Scheduled</p>
            <p className="text-2xl font-bold text-amber-600">{summary.scheduled}</p>
          </div>
          <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
            <p className="text-xs text-purple-600">Departments</p>
            <p className="text-2xl font-bold text-purple-600">{summary.departmentsCount}</p>
          </div>
          <div className="p-4 border border-indigo-100 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
            <p className="text-xs text-indigo-600">Weeks Covered</p>
            <p className="text-2xl font-bold text-indigo-600">{summary.weeksCovered}/4</p>
          </div>
        </div>

        {/* Audit Objective & Scope */}
        <div className="grid grid-cols-1 gap-5 mb-6 lg:grid-cols-2">
          <div className="p-5 bg-white border shadow-sm rounded-xl border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <FiTrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Audit Objective</h3>
              {canEdit && <span className="ml-2 text-xs text-slate-400">(Editable)</span>}
            </div>
            {canEdit ? (
              <textarea 
                value={auditObjective} 
                onChange={(e) => setAuditObjective(e.target.value)} 
                rows={4} 
                className="w-full p-3 text-sm border rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500" 
              />
            ) : (
              <p className="text-sm whitespace-pre-line text-slate-600">{auditObjective}</p>
            )}
          </div>
          <div className="p-5 bg-white border shadow-sm rounded-xl border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <FiEye className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Audit Scope</h3>
              {canEdit && <span className="ml-2 text-xs text-slate-400">(Editable)</span>}
            </div>
            {canEdit ? (
              <textarea 
                value={auditScope} 
                onChange={(e) => setAuditScope(e.target.value)} 
                rows={4} 
                className="w-full p-3 text-sm border rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500" 
              />
            ) : (
              <p className="text-sm text-slate-600">{auditScope}</p>
            )}
          </div>
        </div>

        

        {/* Departments Info */}
        {availableDepartments.length > 0 && (
          <div className="p-4 mb-5 border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
            <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-blue-800">
              <FiCalendar className="w-4 h-4" />
              Departments for {monthDisplay[selectedMonth]}
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({availableDepartments.filter(d => schedules.some(s => s.department === d.department)).length} of {availableDepartments.length} scheduled)
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableDepartments.map(dept => {
                const hasSchedule = schedules.some(s => s.department === dept.department);
                const scheduleCount = schedules.filter(s => s.department === dept.department).length;
                const completedCount = schedules.filter(s => s.department === dept.department && s.status === 'COMPLETED').length;
                return (
                  <div key={dept.department} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-white shadow-sm">
                    {dept.department}
                    {hasSchedule ? (
                      <FiCheckCircle className="ml-1.5 w-3.5 h-3.5 text-green-500" />
                    ) : canEdit ? (
                      <FiPlus className="w-3 h-3 ml-1 cursor-pointer hover:text-green-600" onClick={() => {
                        setEditingSchedule(null);
                        setFormData({
                          department: dept.department,
                          month: selectedMonth,
                          week: '',
                          auditElements: dept.auditElements || [],
                          auditorId: '',
                          auditeeId: '',
                          status: 'SCHEDULED'
                        });
                        setShowForm(true);
                      }} />
                    ) : (
                      <FiClock className="ml-1.5 w-3.5 h-3.5 text-slate-400" />
                    )}
                    {scheduleCount > 0 && (
                      <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${completedCount === scheduleCount ? 'bg-emerald-100' : 'bg-white'}`}>
                        {completedCount}/{scheduleCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Table */}
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
                  department: existingSchedule.department,
                  month: existingSchedule.month,
                  week: existingSchedule.week,
                  auditElements: existingSchedule.auditElements || [],
                  auditorId: existingSchedule.auditorId?.toString() || '',
                  auditeeId: existingSchedule.auditeeId?.toString() || '',
                  status: existingSchedule.status || 'SCHEDULED'
                });
              } else {
                setEditingSchedule(null);
                setFormData({
                  department: department,
                  month: selectedMonth,
                  week: week,
                  auditElements: deptData?.auditElements || [],
                  auditorId: '',
                  auditeeId: '',
                  status: 'SCHEDULED'
                });
              }
              setShowForm(true);
            }}
            onDeleteSchedule={handleDeleteSchedule}
            auditElementsMap={auditElementsMap}
            getStatusBadge={(status) => {
              const badges = { 
                'COMPLETED': 'bg-emerald-100 text-emerald-700', 
                'IN_PROGRESS': 'bg-blue-100 text-blue-700', 
                'CANCELLED': 'bg-rose-100 text-rose-700' 
              };
              const displayStatus = status || 'SCHEDULED';
              return (
                <span className={`px-2 py-1 rounded-full text-xs ${badges[displayStatus] || 'bg-amber-100 text-amber-700'}`}>
                  {displayStatus}
                </span>
              );
            }}
          />
        ) : (
          <>
            {canEdit && availableDepartments.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setEditingSchedule(null);
                    setFormData({
                      department: '',
                      month: selectedMonth,
                      week: '',
                      auditElements: [],
                      auditorId: '',
                      auditeeId: '',
                      status: 'SCHEDULED'
                    });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Schedule for {monthDisplay[selectedMonth]}
                </button>
              </div>
            )}
            
            <ScheduleListView
              schedules={schedules}
              canEdit={canEdit}
              onEdit={(schedule) => {
                setEditingSchedule(schedule);
                setFormData({
                  department: schedule.department,
                  month: schedule.month,
                  week: schedule.week,
                  auditElements: schedule.auditElements || [],
                  auditorId: schedule.auditorId?.toString() || '',
                  auditeeId: schedule.auditeeId?.toString() || '',
                  status: schedule.status || 'SCHEDULED'
                });
                setShowForm(true);
              }}
              onDelete={handleDeleteSchedule}
              auditElementsMap={auditElementsMap}
              getStatusBadge={(status) => {
                const badges = { 
                  'COMPLETED': 'bg-emerald-100 text-emerald-700', 
                  'IN_PROGRESS': 'bg-blue-100 text-blue-700', 
                  'CANCELLED': 'bg-rose-100 text-rose-700' 
                };
                const displayStatus = status || 'SCHEDULED';
                return (
                  <span className={`px-2 py-1 rounded-full text-xs ${badges[displayStatus] || 'bg-amber-100 text-amber-700'}`}>
                    {displayStatus}
                  </span>
                );
              }}
            />
          </>
        )}

        {/* Document Control Section */}
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
          approvalComment={approvalComment}
          setApprovalComment={setApprovalComment}
        />

        {/* Request Changes Button for Approved Months */}
        {isTopManagement && planStatus[selectedMonth] === 'APPROVED' && (
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowChangeRequestModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              <FiMessageSquare className="w-4 h-4" />
              Request Changes
            </button>
          </div>
        )}

        {/* Schedule Modal */}
        {/* Schedule Modal - Remove auditors and auditees props */}
<ScheduleModal
  isOpen={showForm}
  onClose={() => {
    setShowForm(false);
    setEditingSchedule(null);
  }}
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
        <div className="p-4 mt-6 border bg-slate-50 rounded-xl border-slate-200">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="font-medium text-slate-600">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-slate-500">P - Planned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-500">C - Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              <span className="text-slate-500">— - Not Planned</span>
            </div>
          </div>
          <div className="pt-3 mt-3 text-xs border-t border-slate-200 text-slate-500">
            <p><span className="font-semibold">Audit Criteria:</span> ISO9001:2015 IATF16949 Standard, QMS Manual, QMS Procedures, WI, etc.</p>
            <p><span className="font-semibold">Audit Scope:</span> Applicable process within department/function and clause No. 4, 5, 6, 7, 8, 9 &amp; 10</p>
            <p><span className="font-semibold">Audit Method:</span> Interview with Auditee, Observation and verification</p>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <FiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Approve {monthDisplay[selectedMonth]} Schedule</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">Please provide approval comments:</p>
            <textarea
              value={tempApprovalComment}
              onChange={(e) => setTempApprovalComment(e.target.value)}
              rows={4}
              className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-green-500"
              placeholder="Enter approval comments..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setTempApprovalComment('');
                }}
                className="px-4 py-2 border rounded-lg border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting || !tempApprovalComment.trim()}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                ) : (
                  <FiCheck className="w-4 h-4" />
                )}
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-rose-100">
                <FiAlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Reject {monthDisplay[selectedMonth]} Schedule</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">Please provide a reason for rejection:</p>
            <textarea 
              value={tempRejectionReason} 
              onChange={(e) => setTempRejectionReason(e.target.value)} 
              rows={4} 
              className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-rose-500" 
              placeholder="Enter rejection reason..." 
              autoFocus 
            />
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => { 
                  setShowRejectModal(false); 
                  setTempRejectionReason(''); 
                }} 
                className="px-4 py-2 border rounded-lg border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject} 
                disabled={submitting || !tempRejectionReason.trim()} 
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiX className="w-4 h-4" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <FiMessageSquare className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">
                Request Changes - {monthDisplay[selectedMonth]} {selectedYear}
              </h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Please provide details about what changes are needed:
            </p>
            <textarea
              value={changeRequestReason}
              onChange={(e) => setChangeRequestReason(e.target.value)}
              rows={4}
              className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-orange-500"
              placeholder="Describe the changes required..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowChangeRequestModal(false);
                  setChangeRequestReason('');
                }}
                className="px-4 py-2 border rounded-lg border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
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

export default Form5View;