// src/components/dashboards/TopManagementDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBarChart2, FiCheckCircle, FiAlertCircle, FiTrendingUp, 
  FiEye, FiClock, FiCalendar, FiFileText, FiSend, FiList,
  FiUsers, FiCalendar as FiCalendarIcon, FiX, FiCheck,
  FiSunrise, FiSunset, FiCoffee, FiFilter, FiRefreshCw,
  FiInfo, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiCheckSquare, FiMessageCircle,
  FiArchive, FiActivity, FiUserCheck, FiUserX, FiClock as FiClockIcon
} from 'react-icons/fi';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import PlanDetailsModal from '../modals/PlanDetailsModal';
import DeptPlanDetailsModal from '../modals/DeptPlanDetailsModal';
import RejectModal from '../modals/RejectModal';  // ✅ ADD THIS LINE
import { auditScheduleApi } from '../../services/auditScheduleApi';



const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

const TopManagementDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tab state for detailed view
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  
  // Annual Plan (Form 3) states
  const [pendingPlans, setPendingPlans] = useState([]);
  const [approvedPlans, setApprovedPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [planApprovalComment, setPlanApprovalComment] = useState('');
  const [planRejectionReason, setPlanRejectionReason] = useState('');
  const [showPlanRejectModal, setShowPlanRejectModal] = useState(false);
  
  // Department Plan (Form 4) states
  const [pendingDeptPlans, setPendingDeptPlans] = useState([]);
  const [approvedDeptPlans, setApprovedDeptPlans] = useState([]);
  const [selectedDeptPlan, setSelectedDeptPlan] = useState(null);
  const [showDeptPlanDetails, setShowDeptPlanDetails] = useState(false);
  const [deptApprovalComment, setDeptApprovalComment] = useState('');
  const [deptRejectionReason, setDeptRejectionReason] = useState('');
  const [showDeptRejectModal, setShowDeptRejectModal] = useState(false);
  
  // Form 5 (Week Schedule) states
  const [pendingForm5Plans, setPendingForm5Plans] = useState([]);
  const [approvedForm5Plans, setApprovedForm5Plans] = useState([]);
  const [selectedForm5Plan, setSelectedForm5Plan] = useState(null);
  const [showForm5Details, setShowForm5Details] = useState(false);
  const [form5ApprovalComment, setForm5ApprovalComment] = useState('');
  const [form5RejectionReason, setForm5RejectionReason] = useState('');
  const [showForm5RejectModal, setShowForm5RejectModal] = useState(false);
  const [form5SchedulesDetail, setForm5SchedulesDetail] = useState([]);
  
  // Form 5 Detailed (Daily Schedule) states
  const [allDetailedSchedules, setAllDetailedSchedules] = useState([]);
  const [pendingDetailedPlans, setPendingDetailedPlans] = useState([]);
  const [approvedDetailedPlans, setApprovedDetailedPlans] = useState([]);
  const [selectedDetailedPlan, setSelectedDetailedPlan] = useState(null);
  const [showDetailedDetails, setShowDetailedDetails] = useState(false);
  const [detailedApprovalComment, setDetailedApprovalComment] = useState('');
  const [detailedRejectionReason, setDetailedRejectionReason] = useState('');
  const [showDetailedRejectModal, setShowDetailedRejectModal] = useState(false);
  const [detailedSchedulesList, setDetailedSchedulesList] = useState([]);
  
  // State for filters and actions
  const [detailedAuditTypeFilter, setDetailedAuditTypeFilter] = useState('');
  const [selectedScheduleForAction, setSelectedScheduleForAction] = useState(null);
  const [showScheduleRejectModal, setShowScheduleRejectModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  // Add these with other state declarations
const [changeRequestType, setChangeRequestType] = useState(''); // 'ANNUAL', 'DEPARTMENT', 'WEEK', 'DETAILED'
const [selectedPlanForChange, setSelectedPlanForChange] = useState(null);
const [showForumModal, setShowForumModal] = useState(false);
const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
const [allUsersList, setAllUsersList] = useState([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalAudits: 0,
    completedAudits: 0,
    pendingApproval: 0,
    approvedPlans: 0,
    pendingDeptApproval: 0,
    approvedDeptPlans: 0,
    pendingForm5Approval: 0,
    approvedForm5Plans: 0,
    pendingDetailedApproval: 0,
    approvedDetailedPlans: 0,
    overallCompletion: 0
  });

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

  // Helper: Check if schedule matches the selected audit type filter
  const doesScheduleMatchFilter = useCallback((schedule, filterValue) => {
    if (!filterValue || filterValue.trim() === '') {
      return true;
    }
    
    const normalizedFilter = filterValue.toLowerCase().trim();
    
    if (schedule.auditType && schedule.auditType.toLowerCase().includes(normalizedFilter)) {
      return true;
    }
    
    let elements = [];
    if (schedule.auditElements) {
      if (typeof schedule.auditElements === 'string') {
        try { elements = JSON.parse(schedule.auditElements); } catch(e) {}
      } else if (Array.isArray(schedule.auditElements)) {
        elements = schedule.auditElements;
      }
    }
    
    return elements.some(el => el && el.toLowerCase().includes(normalizedFilter));
  }, []);

  // Helper: Get status badge
  const getStatusBadge = (status, type = 'approval') => {
    if (type === 'approval') {
      switch (status) {
        case 'APPROVED':
          return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
        case 'REJECTED':
          return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1"><FiX className="w-3 h-3" /> Rejected</span>;
        case 'PENDING_APPROVAL':
          return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 flex items-center gap-1"><FiClock className="w-3 h-3" /> Pending</span>;
        case 'CHANGE_REQUESTED':
          return <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 flex items-center gap-1"><FiMessageSquare className="w-3 h-3" /> Changes Requested</span>;
        default:
          return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Draft</span>;
      }
    }
    return status;
  };

  const fetchAllUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    setAllUsersList(response.data || []);
  } catch (error) {
    setAllUsersList([]);
  }
};

// In useEffect, add: fetchAllUsers();

  // Fetch Annual Plans (Form 3)
  const fetchAnnualPlans = async () => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Fetch from 5 years ago to 5 years ahead
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    
    let allPlans = [];
    
    for (const year of years) {
      try {
        const response = await axios.get(`${API_BASE}/audit-plan/${year}`, { withCredentials: true });
        if (response.data && response.data.planItems && response.data.planItems.length > 0) {
          allPlans.push({ year: year, ...response.data });
        }
      } catch (err) {
        // No plan for this year
      }
    }
    
    const pending = allPlans.filter(p => p.approvalStatus === 'PENDING_APPROVAL');
    const approved = allPlans.filter(p => p.approvalStatus === 'APPROVED');
    
    setPendingPlans(pending);
    setApprovedPlans(approved);
    
    let totalPlanned = 0, totalCompleted = 0;
    approved.forEach(plan => {
      plan.planItems?.forEach(item => {
        item.months?.forEach(month => {
          if (month?.status === 'PLANNED') totalPlanned++;
          if (month?.status === 'COMPLETED') totalCompleted++;
        });
      });
    });
    
    return { totalPlanned, totalCompleted };
  } catch (error) {
    console.error('Error fetching annual plans:', error);
    return { totalPlanned: 0, totalCompleted: 0 };
  }
};

  // Fetch Department Plans (Form 4)
  const fetchDepartmentPlans = async () => {
  try {
    const currentYear = new Date().getFullYear();
    
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    
    let allDeptPlans = [];
    
    for (const year of years) {
      try {
        const response = await axios.get(`${API_BASE}/department-plan/${year}`, { withCredentials: true });
        if (response.data && response.data.planItems && response.data.planItems.length > 0) {
          allDeptPlans.push({ year: year, ...response.data });
        }
      } catch (err) {
        // No plan for this year
      }
    }
    
    const pending = allDeptPlans.filter(p => p.approvalStatus === 'PENDING_APPROVAL');
    const approved = allDeptPlans.filter(p => p.approvalStatus === 'APPROVED');
    
    setPendingDeptPlans(pending);
    setApprovedDeptPlans(approved);
    
    return { pendingCount: pending.length, approvedCount: approved.length };
  } catch (error) {
    console.error('Error fetching department plans:', error);
    return { pendingCount: 0, approvedCount: 0 };
  }
};

  // Fetch Form 5 Plans (Week Schedule)
 const fetchForm5Plans = async () => {
  try {
    const currentYear = new Date().getFullYear();
    
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    
    let allPendingApprovals = [];
    let allApproved = [];
    
    for (const year of years) {
      try {
        const response = await axios.get(`${API_BASE}/audit-schedule/year/${year}`, { withCredentials: true });
        const allSchedules = response.data || [];
        const weekSchedules = allSchedules.filter(s => !s.scheduledDate);
        
        if (weekSchedules.length > 0) {
          const monthMap = new Map();
          
          weekSchedules.forEach(schedule => {
            const month = schedule.month;
            if (!monthMap.has(month)) {
              monthMap.set(month, {
                year: year,
                month: month,
                approvalStatus: schedule.approvalStatus || 'DRAFT',
                preparedBy: schedule.preparedByName,
                approvedBy: schedule.approvedByName,
                approvedAt: schedule.approvedAt,
                rejectionReason: schedule.rejectionReason,
                leadAuditorId: schedule.leadAuditorId,
                leadAuditorName: schedule.leadAuditorName,
                scheduleCount: 0,
                schedules: []
              });
            }
            
            const monthData = monthMap.get(month);
            monthData.scheduleCount++;
            monthData.schedules.push(schedule);
          });
          
          for (const [month, monthData] of monthMap) {
            if (monthData.approvalStatus === 'PENDING_APPROVAL') {
              allPendingApprovals.push(monthData);
            } else if (monthData.approvalStatus === 'APPROVED') {
              allApproved.push(monthData);
            }
          }
        }
      } catch (err) { 
        console.log(`Error fetching Form 5 for year ${year}:`, err); 
      }
    }
    
    setPendingForm5Plans(allPendingApprovals);
    setApprovedForm5Plans(allApproved);
    
    return { pendingCount: allPendingApprovals.length, approvedCount: allApproved.length };
  } catch (error) {
    console.error('Error fetching Form 5 plans:', error);
    return { pendingCount: 0, approvedCount: 0 };
  }
};


  // Fetch ALL Detailed Schedules
// Fetch ALL Detailed Schedules
const fetchDetailedPlans = useCallback(async () => {
  try {
    const currentYear = new Date().getFullYear();
    const years = [];    
      for (let i = currentYear - 5; i <= currentYear + 2; i++) 
        { 
           years.push(i);   
        }
     let allDailySchedules = [];
    
    for (const year of years) {
      for (const month of ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']) {
        try {
          const response = await auditScheduleApi.getDateSchedulesByMonth(year, month);
          const schedules = response.data || [];
          
          // Add year and month to each schedule
          schedules.forEach(schedule => {
            schedule.planYear = year;
            schedule.month = month;
            
            // Normalize the field names
            if (!schedule.preparedByName && schedule.preparedBy) {
              schedule.preparedByName = schedule.preparedBy;
            }
            
            if (!schedule.approvedByName && schedule.approvedBy) {
              schedule.approvedByName = schedule.approvedBy;
            }
            
            // ALWAYS map approvalStatus to detailedApprovalStatus
            schedule.detailedApprovalStatus = schedule.approvalStatus || schedule.detailedApprovalStatus || 'DRAFT';
          });
          
          allDailySchedules.push(...schedules);
        } catch (err) {
          console.log(`No schedules for ${month} ${year}`);
        }
      }
    }
    
    console.log('✅ Total detailed schedules fetched:', allDailySchedules.length);
    
    setAllDetailedSchedules(allDailySchedules);
    
    // Group by year and month
    const monthMap = new Map();
    
    allDailySchedules.forEach(schedule => {
      const year = schedule.planYear;
      const month = schedule.month;
      const key = `${year}-${month}`;
      
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          year: year,
          month: month,
          preparedBySet: new Set(),
          approvedBySet: new Set(),
          approvedAt: null,
          leadAuditorName: schedule.leadAuditorName,
          schedules: []
        });
      }
      
      const monthData = monthMap.get(key);
      
      // Collect preparers
      if (schedule.preparedBy && schedule.preparedBy !== 'N/A' && schedule.preparedBy !== 'null') {
        monthData.preparedBySet.add(schedule.preparedBy);
      } else if (schedule.preparedByName && schedule.preparedByName !== 'N/A') {
        monthData.preparedBySet.add(schedule.preparedByName);
      }
      
      // Collect approvers
      if (schedule.approvedBy && schedule.approvedBy !== 'N/A' && schedule.approvedBy !== 'null') {
        monthData.approvedBySet.add(schedule.approvedBy);
      } else if (schedule.approvedByName && schedule.approvedByName !== 'N/A') {
        monthData.approvedBySet.add(schedule.approvedByName);
      }
      
      // Track latest approval date
      const approvalDate = schedule.approvedAt || schedule.approvedDate;
      if (approvalDate && (!monthData.approvedAt || new Date(approvalDate) > new Date(monthData.approvedAt))) {
        monthData.approvedAt = approvalDate;
      }
      
      monthData.schedules.push(schedule);
    });
    
    // Convert to display format
    const pendingMonths = [];
    const approvedMonths = [];
    
    for (const [key, monthData] of monthMap) {
      const schedules = monthData.schedules;
      
      // Convert Sets to comma-separated strings
      const uniquePreparedBy = Array.from(monthData.preparedBySet);
      const uniqueApprovedBy = Array.from(monthData.approvedBySet);
      
      monthData.displayPreparedBy = uniquePreparedBy.length > 0 
        ? uniquePreparedBy.join(', ') 
        : 'Not available';
      
      monthData.displayApprovedBy = uniqueApprovedBy.length > 0 
        ? uniqueApprovedBy.join(', ') 
        : 'Not approved yet';
      
      // Get status for each schedule
      const getStatus = (schedule) => {
        return schedule.detailedApprovalStatus || schedule.approvalStatus || 'DRAFT';
      };
      
      const hasPending = schedules.some(s => getStatus(s) === 'PENDING_APPROVAL');
      const hasChangeRequested = schedules.some(s => getStatus(s) === 'CHANGE_REQUESTED');
      const hasRejected = schedules.some(s => getStatus(s) === 'REJECTED');
      const hasApproved = schedules.some(s => getStatus(s) === 'APPROVED');
      const hasDraft = schedules.some(s => getStatus(s) === 'DRAFT');
      const allApproved = schedules.length > 0 && schedules.every(s => getStatus(s) === 'APPROVED');
      
      // Debug log
      console.log(`📊 Month ${monthData.month} ${monthData.year}:`, {
        preparedBy: monthData.displayPreparedBy,
        approvedBy: monthData.displayApprovedBy,
        totalSchedules: schedules.length,
        statusSummary: { 
          hasPending, 
          hasChangeRequested, 
          hasRejected,
          hasApproved,
          hasDraft,
          allApproved 
        }
      });
      
      // PENDING TAB: Months with PENDING_APPROVAL or CHANGE_REQUESTED
      if (hasPending || hasChangeRequested) {
        pendingMonths.push({
          ...monthData,
          preparedBy: monthData.displayPreparedBy,
          approvedBy: monthData.displayApprovedBy,
          scheduleCount: schedules.length,
          pendingCount: schedules.filter(s => getStatus(s) === 'PENDING_APPROVAL').length,
          changeRequestedCount: schedules.filter(s => getStatus(s) === 'CHANGE_REQUESTED').length,
          isChangeRequested: hasChangeRequested,
          rejectedCount: schedules.filter(s => getStatus(s) === 'REJECTED').length,
          approvedCount: schedules.filter(s => getStatus(s) === 'APPROVED').length,
          schedules: schedules
        });
      } 
      // HISTORY TAB: All other months (approved, rejected, mixed, draft, or any combination without pending)
      else {
        approvedMonths.push({
          ...monthData,
          preparedBy: monthData.displayPreparedBy,
          approvedBy: monthData.displayApprovedBy,
          scheduleCount: schedules.length,
          approvedCount: schedules.filter(s => getStatus(s) === 'APPROVED').length,
          rejectedCount: schedules.filter(s => getStatus(s) === 'REJECTED').length,
          draftCount: schedules.filter(s => getStatus(s) === 'DRAFT').length,
          allApproved: allApproved,
          approvedAt: monthData.approvedAt,
          schedules: schedules
        });
      }
    }
    
    console.log('✅ Final Results:', {
      pendingMonths: pendingMonths.length,
      approvedMonths: approvedMonths.length,
      firstPendingMonth: pendingMonths[0] ? {
        month: pendingMonths[0].month,
        preparedBy: pendingMonths[0].preparedBy,
        approvedBy: pendingMonths[0].approvedBy
      } : null
    });
    
    setPendingDetailedPlans(pendingMonths);
    setApprovedDetailedPlans(approvedMonths);
    
    return { 
      pendingCount: pendingMonths.length, 
      approvedCount: approvedMonths.length 
    };
  } catch (error) {
    console.error('Error fetching detailed plans:', error);
    return { pendingCount: 0, approvedCount: 0 };
  }
}, []);

// Add this function - it's missing from your code!
const refreshDetailedSchedulesData = useCallback(async () => {
  try {
    // Refetch all detailed schedules
    const result = await fetchDetailedPlans();
    console.log('🔄 Refreshed detailed plans:', result);
    
    // If a modal is open, update its data too
    if (showDetailedDetails && selectedDetailedPlan) {
      // Find the month in the UPDATED lists after refresh
      let updatedMonthData = pendingDetailedPlans.find(p => 
        p.month === selectedDetailedPlan.month && p.year === selectedDetailedPlan.year
      );
      
      if (!updatedMonthData) {
        updatedMonthData = approvedDetailedPlans.find(p => 
          p.month === selectedDetailedPlan.month && p.year === selectedDetailedPlan.year
        );
      }
      
      if (updatedMonthData) {
        setDetailedSchedulesList(updatedMonthData.schedules || []);
        console.log('✅ Updated modal schedules with fresh data');
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error refreshing detailed plans:', error);
    return null;
  }
}, [fetchDetailedPlans, showDetailedDetails, selectedDetailedPlan, pendingDetailedPlans, approvedDetailedPlans]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [annualStats, deptStats, form5Stats, detailedStats] = await Promise.all([
        fetchAnnualPlans(),
        fetchDepartmentPlans(),
        fetchForm5Plans(),
        fetchDetailedPlans()
      ]);
      
      setStats({
        totalAudits: annualStats.totalPlanned,
        completedAudits: annualStats.totalCompleted,
        pendingApproval: pendingPlans.length,
        approvedPlans: approvedPlans.length,
        pendingDeptApproval: pendingDeptPlans.length,
        approvedDeptPlans: approvedDeptPlans.length,
        pendingForm5Approval: pendingForm5Plans.length,
        approvedForm5Plans: approvedForm5Plans.length,
        pendingDetailedApproval: detailedStats.pendingCount,
        approvedDetailedPlans: detailedStats.approvedCount,
        overallCompletion: annualStats.totalPlanned > 0 ? ((annualStats.totalCompleted / annualStats.totalPlanned) * 100).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add this function with your other handlers (around line 500-600)
// In TopManagementDashboard.jsx - Update openAuditForum
const openAuditForum = (auditData) => {
  // Build member emails from available data
  const memberEmails = [];
  
  console.log('🔍 [TOP MGMT DEBUG] openAuditForum called with:', auditData);
  console.log('🔍 [TOP MGMT DEBUG] allUsersList available:', allUsersList.length);
  
  // Add current user (Top Management)
  if (user?.email) memberEmails.push(user.email);
  
  // Add auditor if available
  if (auditData.auditorId) {
    const auditor = allUsersList.find(u => u.id === auditData.auditorId);
    if (auditor?.email) {
      memberEmails.push(auditor.email);
      console.log('✅ [TOP MGMT] Found auditor:', auditor.email);
    } else {
      console.log('⚠️ [TOP MGMT] Auditor not found for ID:', auditData.auditorId);
    }
  }
  
  // Add auditee if available
  if (auditData.auditeeId) {
    const auditee = allUsersList.find(u => u.id === auditData.auditeeId);
    if (auditee?.email) {
      memberEmails.push(auditee.email);
      console.log('✅ [TOP MGMT] Found auditee:', auditee.email);
    } else {
      console.log('⚠️ [TOP MGMT] Auditee not found for ID:', auditData.auditeeId);
    }
  }
  
  // Add HOD if available
  if (auditData.hodEmail) {
    memberEmails.push(auditData.hodEmail);
    console.log('✅ [TOP MGMT] Added HOD email:', auditData.hodEmail);
  }
  
  // Add memberEmails if passed directly
  if (auditData.memberEmails) {
    memberEmails.push(...auditData.memberEmails);
    console.log('✅ [TOP MGMT] Added memberEmails from props:', auditData.memberEmails);
  }
  
  const uniqueMemberEmails = [...new Set(memberEmails)];
  console.log('🔍 [TOP MGMT] Final memberEmails to send:', uniqueMemberEmails);
  
  setSelectedAuditForForum({
    ...auditData,
    memberEmails: uniqueMemberEmails
  });
  setShowForumModal(true);
};

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    addToast('Dashboard refreshed', 'success');
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAllUsers(); // Make sure this is called
  }, []);

  // ========== Annual Plan Handlers ==========
  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    setPlanApprovalComment('');
    setPlanRejectionReason('');
    setShowPlanDetails(true);
  };

  const handleApprovePlan = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedPlan.year}/approve?userId=${user?.id}`, {
        comments: planApprovalComment
      }, { withCredentials: true });
      
      addToast(`Annual Audit Plan ${selectedPlan.year} approved successfully!`, 'success');
      setShowPlanDetails(false);
      setSelectedPlan(null);
      setPlanApprovalComment('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error approving plan:', error);
      addToast('Failed to approve plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!planRejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedPlan.year}/reject?userId=${user?.id}`, {
        reason: planRejectionReason
      }, { withCredentials: true });
      
      addToast(`Annual Audit Plan ${selectedPlan.year} rejected`, 'error');
      setShowPlanRejectModal(false);
      setShowPlanDetails(false);
      setSelectedPlan(null);
      setPlanRejectionReason('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting plan:', error);
      addToast('Failed to reject plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== Department Plan Handlers ==========
  const handleViewDeptPlan = (plan) => {
    setSelectedDeptPlan(plan);
    setDeptApprovalComment('');
    setDeptRejectionReason('');
    setShowDeptPlanDetails(true);
  };

  const handleApproveDeptPlan = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedDeptPlan.year}/approve?userId=${user?.id}`, {
        comments: deptApprovalComment
      }, { withCredentials: true });
      
      addToast(`Department Audit Plan ${selectedDeptPlan.year} approved successfully!`, 'success');
      setShowDeptPlanDetails(false);
      setSelectedDeptPlan(null);
      setDeptApprovalComment('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error approving department plan:', error);
      addToast('Failed to approve department plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectDeptPlan = async () => {
    if (!deptRejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedDeptPlan.year}/reject?userId=${user?.id}`, {
        reason: deptRejectionReason
      }, { withCredentials: true });
      
      addToast(`Department Audit Plan ${selectedDeptPlan.year} rejected`, 'error');
      setShowDeptRejectModal(false);
      setShowDeptPlanDetails(false);
      setSelectedDeptPlan(null);
      setDeptRejectionReason('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting department plan:', error);
      addToast('Failed to reject department plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== Form 5 (Week Schedule) Handlers ==========
  const handleViewForm5Plan = (plan) => {
    setSelectedForm5Plan(plan);
    setForm5SchedulesDetail(plan.schedules || []);
    setForm5ApprovalComment('');
    setForm5RejectionReason('');
    setShowForm5Details(true);
  };

  const handleApproveForm5Plan = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/approve?userId=${user?.id}`, {
        comments: form5ApprovalComment
      }, { withCredentials: true });
      
      addToast(`Week Schedule for ${selectedForm5Plan.month} approved successfully!`, 'success');
      setShowForm5Details(false);
      setSelectedForm5Plan(null);
      setForm5ApprovalComment('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error approving Form 5 plan:', error);
      addToast('Failed to approve week schedule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectForm5Plan = async () => {
    if (!form5RejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/reject?userId=${user?.id}`, {
        reason: form5RejectionReason
      }, { withCredentials: true });
      
      addToast(`Week Schedule for ${selectedForm5Plan.month} rejected`, 'error');
      setShowForm5RejectModal(false);
      setShowForm5Details(false);
      setSelectedForm5Plan(null);
      setForm5RejectionReason('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting Form 5 plan:', error);
      addToast('Failed to reject week schedule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== Form 5 Detailed (Daily Schedule) Handlers ==========
  const handleViewDetailedPlan = (plan, tab = 'pending') => {
    setSelectedDetailedPlan(plan);
    setDetailedSchedulesList(plan.schedules || []);
    setDetailedApprovalComment('');
    setDetailedRejectionReason('');
    setDetailedAuditTypeFilter('');
    setActiveTab(tab);
    setShowDetailedDetails(true);
  };

  // Request changes for Annual Plan (Form 3)
const handleRequestAnnualPlanChanges = async () => {
  if (!changeRequestReason.trim()) {
    addToast('Please provide a reason for changes', 'error');
    return;
  }
  
  setSubmitting(true);
  try {
    await axios.post(`${API_BASE}/audit-plan/${selectedPlanForChange.year}/request-changes?userId=${user?.id}`, {
      reason: changeRequestReason
    }, { withCredentials: true });
    
    addToast(`Change request submitted for Annual Plan ${selectedPlanForChange.year}`, 'warning');
    setShowChangeRequestModal(false);
    setChangeRequestReason('');
    setSelectedPlanForChange(null);
    await fetchDashboardData();
  } catch (error) {
    console.error('Error requesting changes:', error);
    addToast('Failed to submit change request', 'error');
  } finally {
    setSubmitting(false);
  }
};

// Request changes for Department Plan (Form 4)
const handleRequestDeptPlanChanges = async () => {
  if (!changeRequestReason.trim()) {
    addToast('Please provide a reason for changes', 'error');
    return;
  }
  
  setSubmitting(true);
  try {
    await axios.post(`${API_BASE}/department-plan/${selectedPlanForChange.year}/request-changes?userId=${user?.id}`, {
      reason: changeRequestReason
    }, { withCredentials: true });
    
    addToast(`Change request submitted for Department Plan ${selectedPlanForChange.year}`, 'warning');
    setShowChangeRequestModal(false);
    setChangeRequestReason('');
    setSelectedPlanForChange(null);
    await fetchDashboardData();
  } catch (error) {
    console.error('Error requesting changes:', error);
    addToast('Failed to submit change request', 'error');
  } finally {
    setSubmitting(false);
  }
};

 // UPDATE the handleApproveSingleSchedule function:
const handleApproveSingleSchedule = async (schedule) => {
  if (!window.confirm(`Approve schedule for ${schedule.scheduledDate}?`)) return;
  
  setSubmitting(true);
  try {
    await auditScheduleApi.approveSchedule(schedule.id, user?.id, detailedApprovalComment);
    
    addToast(`Schedule for ${schedule.scheduledDate} approved!`, 'success');
    
    // ✅ CRITICAL: Refresh the ENTIRE dashboard data, not just modal
    await fetchDashboardData();  // This will refresh pendingDetailedPlans and approvedDetailedPlans
    
    // Also close any open modal if needed
    if (showDetailedDetails) {
      setShowDetailedDetails(false);
      setSelectedDetailedPlan(null);
    }
    
  } catch (error) {
    console.error('Error approving schedule:', error);
    addToast(error.response?.data?.message || 'Failed to approve schedule', 'error');
  } finally {
    setSubmitting(false);
  }
};

// UPDATE the handleRejectSingleSchedule function:
const handleRejectSingleSchedule = async () => {
  if (!selectedScheduleForAction) return;
  if (!detailedRejectionReason.trim()) {
    addToast('Please provide a rejection reason', 'error');
    return;
  }
  
  setSubmitting(true);
  try {
    await auditScheduleApi.rejectSchedule(selectedScheduleForAction.id, user?.id, detailedRejectionReason);
    
    addToast(`Schedule for ${selectedScheduleForAction.scheduledDate} rejected`, 'error');
    
    // ✅ IMMEDIATE LOCAL STATE UPDATE - Status changes instantly!
    setDetailedSchedulesList(prevList => 
      prevList.map(s => 
        s.id === selectedScheduleForAction.id 
          ? { 
              ...s, 
              detailedApprovalStatus: 'REJECTED', 
              detailedRejectionReason: detailedRejectionReason,
              approvedByName: null,
              approvedBy: null
            }
          : s
      )
    );
    
    // ✅ Also update in allDetailedSchedules
    setAllDetailedSchedules(prevList => 
      prevList.map(s => 
        s.id === selectedScheduleForAction.id 
          ? { 
              ...s, 
              detailedApprovalStatus: 'REJECTED', 
              detailedRejectionReason: detailedRejectionReason,
              approvedByName: null,
              approvedBy: null
            }
          : s
      )
    );
    
    // ✅ Refresh in background
    refreshDetailedSchedulesData();
    
    setShowScheduleRejectModal(false);
    setDetailedRejectionReason('');
    setSelectedScheduleForAction(null);
  } catch (error) {
    console.error('Error rejecting schedule:', error);
    addToast(error.response?.data?.message || 'Failed to reject schedule', 'error');
  } finally {
    setSubmitting(false);
  }
};

// UPDATE the handleRequestChangesForSchedule function:
const handleRequestChangesForSchedule = async (schedule) => {
  if (!changeRequestReason.trim()) {
    addToast('Please provide a reason for change request', 'error');
    return;
  }
  
  setSubmitting(true);
  try {
    await axios.post(`${API_BASE}/audit-schedule/detailed/${schedule.planYear}/${schedule.month}/request-changes?userId=${user?.id}`, {
      reason: changeRequestReason
    }, { withCredentials: true });
    
    addToast(`Change requested for schedule on ${schedule.scheduledDate}`, 'warning');
    
    // ✅ IMMEDIATE LOCAL STATE UPDATE
    setDetailedSchedulesList(prevList => 
      prevList.map(s => 
        s.id === schedule.id 
          ? { 
              ...s, 
              detailedApprovalStatus: 'CHANGE_REQUESTED', 
              detailedRejectionReason: changeRequestReason
            }
          : s
      )
    );
    
    setAllDetailedSchedules(prevList => 
      prevList.map(s => 
        s.id === schedule.id 
          ? { 
              ...s, 
              detailedApprovalStatus: 'CHANGE_REQUESTED', 
              detailedRejectionReason: changeRequestReason
            }
          : s
      )
    );
    
    refreshDetailedSchedulesData();
    
    setShowChangeRequestModal(false);
    setChangeRequestReason('');
    setSelectedScheduleForAction(null);
  } catch (error) {
    console.error('Error requesting changes:', error);
    addToast(error.response?.data?.message || 'Failed to request changes', 'error');
  } finally {
    setSubmitting(false);
  }
};

// UPDATE Bulk Approve function:
// UPDATED Bulk Approve function with proper modal refresh:
const handleBulkApproveByAuditType = async () => {
  // Get current pending schedules matching filter
  const pendingSchedules = detailedSchedulesList.filter(s => 
    s.detailedApprovalStatus === 'PENDING_APPROVAL' && 
    doesScheduleMatchFilter(s, detailedAuditTypeFilter)
  );
  
  if (pendingSchedules.length === 0) {
    const filterMsg = detailedAuditTypeFilter ? ` for "${detailedAuditTypeFilter}"` : '';
    addToast(`No pending schedules${filterMsg} to approve`, 'warning');
    return;
  }
  
  const filterMsg = detailedAuditTypeFilter ? ` for audit type "${detailedAuditTypeFilter}"` : '';
  if (!window.confirm(`Approve ${pendingSchedules.length} pending schedule(s)${filterMsg}?`)) {
    return;
  }
  
  setSubmitting(true);
  try {
    let approvedCount = 0;
    const approvedIds = new Set();
    const comment = detailedApprovalComment;
    
    // Send approval requests
    for (const schedule of pendingSchedules) {
      await axios.post(`${API_BASE}/audit-schedule/schedule/${schedule.id}/approve?userId=${user?.id}`, {
        comments: comment
      }, { withCredentials: true });
      approvedCount++;
      approvedIds.add(schedule.id);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // ✅ CRITICAL: Create NEW array with updated statuses
    const updatedList = detailedSchedulesList.map(schedule => {
      if (approvedIds.has(schedule.id)) {
        return {
          ...schedule,
          detailedApprovalStatus: 'APPROVED',
          approvedByName: user?.name || user?.username,
          approvedBy: user?.name || user?.username,
          approvedAt: new Date().toISOString(),
          approvedDate: new Date().toISOString()
        };
      }
      return schedule;
    });
    
    // ✅ Update state - this triggers re-render and getFilteredDetailedSchedules will run again
    setDetailedSchedulesList(updatedList);
    
    // Also update the master list
    setAllDetailedSchedules(prevList => 
      prevList.map(schedule => 
        approvedIds.has(schedule.id) 
          ? { 
              ...schedule, 
              detailedApprovalStatus: 'APPROVED', 
              approvedByName: user?.name || user?.username,
              approvedBy: user?.name || user?.username,
              approvedAt: new Date().toISOString()
            }
          : schedule
      )
    );
    
    addToast(`${approvedCount} schedule(s) approved successfully!`, 'success');
    
    // ✅ Clear the approval comment after successful bulk action
    setDetailedApprovalComment('');
    
  } catch (error) {
    console.error('Error approving schedules:', error);
    addToast(error.response?.data?.message || 'Failed to approve some schedules', 'error');
  } finally {
    setSubmitting(false);
  }
};

// UPDATE Bulk Reject function:
// UPDATED Bulk Reject function with proper modal refresh:
const handleBulkRejectByAuditType = async () => {
  if (!detailedRejectionReason.trim()) {
    addToast('Please provide a rejection reason', 'error');
    return;
  }
  
  const pendingSchedules = detailedSchedulesList.filter(s => 
    s.detailedApprovalStatus === 'PENDING_APPROVAL' && 
    doesScheduleMatchFilter(s, detailedAuditTypeFilter)
  );
  
  if (pendingSchedules.length === 0) {
    const filterMsg = detailedAuditTypeFilter ? ` for "${detailedAuditTypeFilter}"` : '';
    addToast(`No pending schedules${filterMsg} to reject`, 'warning');
    return;
  }
  
  const filterMsg = detailedAuditTypeFilter ? ` for audit type "${detailedAuditTypeFilter}"` : '';
  if (!window.confirm(`Reject ${pendingSchedules.length} pending schedule(s)${filterMsg}?`)) {
    return;
  }
  
  setSubmitting(true);
  try {
    let rejectedCount = 0;
    const rejectedIds = new Set();
    const rejectionReason = detailedRejectionReason;
    
    // Send rejection requests
    for (const schedule of pendingSchedules) {
      await axios.post(`${API_BASE}/audit-schedule/schedule/${schedule.id}/reject?userId=${user?.id}`, {
        reason: rejectionReason
      }, { withCredentials: true });
      rejectedCount++;
      rejectedIds.add(schedule.id);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // ✅ CRITICAL: Create NEW array with updated statuses
    const updatedList = detailedSchedulesList.map(schedule => {
      if (rejectedIds.has(schedule.id)) {
        return {
          ...schedule,
          detailedApprovalStatus: 'REJECTED',
          detailedRejectionReason: rejectionReason,
          approvedByName: null,
          approvedBy: null
        };
      }
      return schedule;
    });
    
    // ✅ Update state - triggers re-render
    setDetailedSchedulesList(updatedList);
    
    // Also update the master list
    setAllDetailedSchedules(prevList => 
      prevList.map(schedule => 
        rejectedIds.has(schedule.id) 
          ? { 
              ...schedule, 
              detailedApprovalStatus: 'REJECTED', 
              detailedRejectionReason: rejectionReason,
              approvedByName: null,
              approvedBy: null
            }
          : schedule
      )
    );
    
    addToast(`${rejectedCount} schedule(s) rejected`, 'error');
    setShowDetailedRejectModal(false);
    
    // ✅ Clear rejection reason after successful bulk action
    setDetailedRejectionReason('');
    
  } catch (error) {
    console.error('Error rejecting schedules:', error);
    addToast(error.response?.data?.message || 'Failed to reject some schedules', 'error');
  } finally {
    setSubmitting(false);
  }
};
  // Helper: Get filtered schedules based on audit type and tab
  const getFilteredDetailedSchedules = useCallback(() => {
  // ✅ Create a copy first to avoid mutation
  let filtered = [...detailedSchedulesList];
  
  // Filter by audit type
  if (detailedAuditTypeFilter && detailedAuditTypeFilter.trim() !== '') {
    filtered = filtered.filter(schedule => 
      doesScheduleMatchFilter(schedule, detailedAuditTypeFilter)
    );
  }
  
  // Filter by tab (pending vs history)
  if (activeTab === 'pending') {
    filtered = filtered.filter(s => 
      s.detailedApprovalStatus === 'PENDING_APPROVAL' || 
      s.detailedApprovalStatus === 'CHANGE_REQUESTED'
    );
  } else {
    // History tab: show approved, rejected, and draft (but not pending)
    filtered = filtered.filter(s => 
      s.detailedApprovalStatus === 'APPROVED' || 
      s.detailedApprovalStatus === 'REJECTED' ||
      s.detailedApprovalStatus === 'DRAFT' ||
      !s.detailedApprovalStatus
    );
  }
  
  // ✅ Sort by using toSorted() or create a copy before sort
  if (activeTab === 'history') {
    // Create a new sorted array instead of mutating
    return [...filtered].sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  } else {
    return [...filtered].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }
}, [detailedSchedulesList, detailedAuditTypeFilter, activeTab, doesScheduleMatchFilter]);
  // Helper: Get Unique Audit Types for Filter Dropdown
  const getUniqueAuditTypes = useCallback(() => {
    const types = new Set();
    detailedSchedulesList.forEach(s => {
      if (s.auditType) types.add(s.auditType);
      if (s.auditElements) {
        let els = [];
        if (typeof s.auditElements === 'string') {
          try { els = JSON.parse(s.auditElements); } catch(e) {}
        } else if (Array.isArray(s.auditElements)) {
          els = s.auditElements;
        }
        els.forEach(el => types.add(el));
      }
    });
    return Array.from(types).sort();
  }, [detailedSchedulesList]);

  // Get count of pending schedules matching current filter
  const getFilteredPendingCount = useCallback(() => {
    return detailedSchedulesList.filter(s => 
      (s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED') &&
      doesScheduleMatchFilter(s, detailedAuditTypeFilter)
    ).length;
  }, [detailedSchedulesList, detailedAuditTypeFilter, doesScheduleMatchFilter]);

  // Get count of history schedules matching current filter
  const getFilteredHistoryCount = useCallback(() => {
    return detailedSchedulesList.filter(s => 
      (s.detailedApprovalStatus === 'APPROVED' || s.detailedApprovalStatus === 'REJECTED') &&
      doesScheduleMatchFilter(s, detailedAuditTypeFilter)
    ).length;
  }, [detailedSchedulesList, detailedAuditTypeFilter, doesScheduleMatchFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiBarChart2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Top Management Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Review and approve audit plans</p>
              <p className="text-xs text-gray-400 mt-1">
                Logged in as: <span className="font-medium">{user?.name || user?.username}</span>
              </p>
            </div>
          </div>
<button 
  onClick={() => {
    // ✅ Get users from available roles (only AUDIT_MANAGER and TOP_MANAGEMENT exist)
    const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
    const topManagement = allUsersList.find(u => u.role === 'TOP_MANAGEMENT');
    
    // Use the first available user as auditee (since no AUDITEE role exists)
    const availableAuditee = auditManager || topManagement;
    
    openAuditForum({ 
      id: 'demo', 
      auditNumber: 'AUD-DEMO',
      auditType: 'Demo Audit',
      department: 'Quality',
      auditorId: auditManager?.id || user?.id,
      auditorName: auditManager?.name || user?.name,
      auditeeId: availableAuditee?.id,
      auditeeName: availableAuditee?.name,
      hodEmail: availableAuditee?.email,  // Use same as HOD for now
      hodName: availableAuditee?.name,
      memberEmails: [user?.email, availableAuditee?.email].filter(Boolean)
    });
  }}
  className="px-3 py-2 ml-[700px] bg-purple-600 text-white rounded-lg text-sm flex items-center gap-2"
>
  <FiMessageCircle className="w-4 h-4" /> Forum
</button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Audits Planned</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalAudits}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FiCalendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Completed Audits</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedAudits}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <FiCheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">Plans Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.pendingApproval + stats.pendingDeptApproval + stats.pendingForm5Approval + stats.pendingDetailedApproval}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <FiSend className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Completion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.overallCompletion}%</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <FiTrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
          {/* Card 1: Annual Audit Plans Section - Form 3 */}
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                <FiFileText className="w-4 h-4 text-blue-500" />
                Annual Audit Plans (Form 3) - Pending Approval ({pendingPlans.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingPlans.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FiCheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No annual plans pending approval</p>
                </div>
              ) : (
                pendingPlans.map((plan) => (
                  <div key={plan.year} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Annual Audit Plan {plan.year}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>Prepared by: {plan.preparedBy || 'N/A'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewPlan(plan)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                      >
                        <FiEye className="w-4 h-4" /> Review
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 2: Department Audit Plans Section - Form 4 */}
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                <FiList className="w-4 h-4 text-green-500" />
                Department Audit Plans (Form 4) - Pending Approval ({pendingDeptPlans.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingDeptPlans.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FiCheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No department plans pending approval</p>
                </div>
              ) : (
                pendingDeptPlans.map((plan) => (
                  <div key={plan.year} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Department Audit Plan {plan.year}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>Prepared by: {plan.preparedBy || 'N/A'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewDeptPlan(plan)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                      >
                        <FiEye className="w-4 h-4" /> Review
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 3: Form 5 - Week Schedule Plans Section */}
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                <FiCalendarIcon className="w-4 h-4 text-indigo-500" />
                Week Schedule Plans (Form 5) - Pending Approval ({pendingForm5Plans.length})
              </h2>
              <p className="mt-1 text-xs text-gray-400">Week-based audit schedules (W-1 to W-4)</p>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingForm5Plans.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FiCheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No week schedule plans pending approval</p>
                </div>
              ) : (
                pendingForm5Plans.map((plan, idx) => (
                  <div key={`${plan.year}-${plan.month}`} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          {monthDisplay[plan.month] || plan.month} {plan.year}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>Prepared by: {plan.preparedBy || 'N/A'}</span>
                          <span>Weeks: {plan.scheduleCount || 0}</span>
                          {plan.leadAuditorName && <span>Lead Auditor: {plan.leadAuditorName}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewForm5Plan(plan)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-1"
                      >
                        <FiEye className="w-4 h-4" /> Review Week Schedule
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 4: Form 5 Detailed - Daily Schedule Plans Section with Tabs */}
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                    <FiClock className="w-4 h-4 text-teal-500" />
                    Daily Schedule Plans (Form 5 Detailed)
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">Daily audit schedules with time slots</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded-full">
                    {pendingDetailedPlans.length} Pending
                  </span>
                  <span className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full">
                    {approvedDetailedPlans.length} Approved/History
                  </span>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation for Daily Schedules */}
            <div className="px-5 bg-white border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-3 px-2 text-sm font-medium transition-colors relative ${
                    activeTab === 'pending' 
                      ? 'text-teal-600 border-b-2 border-teal-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4" />
                    Pending Approval
                    {pendingDetailedPlans.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                        {pendingDetailedPlans.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-3 px-2 text-sm font-medium transition-colors relative ${
                    activeTab === 'history' 
                      ? 'text-teal-600 border-b-2 border-teal-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiArchive className="w-4 h-4" />
                    History & Approved
                    {approvedDetailedPlans.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                        {approvedDetailedPlans.length}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Content based on active tab */}
            <div className="divide-y divide-gray-100">
              {activeTab === 'pending' && pendingDetailedPlans.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <FiCheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No daily schedule plans pending approval</p>
                </div>
              )}
              
              {activeTab === 'history' && approvedDetailedPlans.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <FiArchive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No approved or historical daily schedules</p>
                </div>
              )}
              
              {((activeTab === 'pending' && pendingDetailedPlans.length > 0) ||
                (activeTab === 'history' && approvedDetailedPlans.length > 0)) && (
                (activeTab === 'pending' ? pendingDetailedPlans : approvedDetailedPlans).map((plan, idx) => (
                  <div key={`${plan.year}-${plan.month}`} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          {monthDisplay[plan.month] || plan.month} {plan.year}
                          {plan.isChangeRequested && activeTab === 'pending' && (
                            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                              Changes Requested ({plan.changeRequestedCount})
                            </span>
                          )}
                          {plan.pendingCount > 0 && activeTab === 'pending' && !plan.isChangeRequested && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                              {plan.pendingCount} pending
                            </span>
                          )}
                          {activeTab === 'history' && plan.approvedCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                              {plan.approvedCount} approved
                            </span>
                          )}
                          {activeTab === 'history' && plan.rejectedCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                              {plan.rejectedCount} rejected
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>Prepared by: {plan.preparedBy || 'N/A'}</span>
                          <span>Total Schedules: {plan.scheduleCount || 0}</span>
                          {plan.leadAuditorName && <span>Lead Auditor: {plan.leadAuditorName}</span>}
                        </div>
                        {activeTab === 'history' && plan.approvedAt && (
                          <div className="mt-1 text-xs text-gray-400">
                            <span>Approved on: {new Date(plan.approvedAt).toLocaleString()}</span>
                            {plan.approvedBy && <span className="ml-2">by {plan.approvedBy}</span>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewDetailedPlan(plan, activeTab)}
                        className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-1"
                      >
                        <FiEye className="w-4 h-4" /> {activeTab === 'pending' ? 'Review & Approve' : 'View History'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Management Review</h3>
            <button
              onClick={() => navigate('/reports')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-700">View Audit Summary Report</span>
              <FiBarChart2 className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Audit Plans</h3>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/form3')}
                className="flex-1 text-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-sm text-blue-700">Annual Plan</span>
              </button>
              <button
                onClick={() => navigate('/form4')}
                className="flex-1 text-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="text-sm text-green-700">Dept Plan</span>
              </button>
              <button
                onClick={() => navigate('/form5')}
                className="flex-1 text-center p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <span className="text-sm text-indigo-700">Week Schedule</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form 5 Week Schedule Details Modal */}
      {showForm5Details && selectedForm5Plan && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50">
    <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
      <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div>
          <h3 className="text-xl font-semibold">
            Week Schedule - {monthDisplay[selectedForm5Plan.month]} {selectedForm5Plan.year}
          </h3>
          {selectedForm5Plan.leadAuditorName && (
            <p className="mt-1 text-sm text-gray-500">Lead Auditor: {selectedForm5Plan.leadAuditorName}</p>
          )}
          <p className="text-sm text-gray-500">
            Prepared by: {selectedForm5Plan.preparedByName || selectedForm5Plan.preparedBy || 'N/A'}
          </p>
        </div>
        <button onClick={() => setShowForm5Details(false)} className="p-2 rounded-lg hover:bg-gray-100">
          ✕
        </button>
      </div>
     
      <div className="p-6">
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">Department</th>
                <th className="px-3 py-2 border">Week</th>
                <th className="px-3 py-2 border">Audit Elements</th>
                <th className="px-3 py-2 border">Lead Auditor</th>
                <th className="px-3 py-2 border">Team Auditors</th>
                <th className="px-3 py-2 border">Auditees</th>
                <th className="px-3 py-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {form5SchedulesDetail.map((schedule, idx) => {
                // ✅ DEBUG: Log what data is available
                console.log(`===== SCHEDULE ${idx} =====`);
                console.log("Schedule ID:", schedule.id);
                console.log("Department:", schedule.department);
                console.log("teamAuditorNames:", schedule.teamAuditorNames);
                console.log("coAuditorNames:", schedule.coAuditorNames);
                console.log("coAuditorIds:", schedule.coAuditorIds);
                console.log("teamAuditorIds:", schedule.teamAuditorIds);
               
                // ✅ FIX: Parse team auditor names from MULTIPLE possible sources
                let teamAuditorNames = [];
               
                // Source 1: teamAuditorNames (array or JSON string)
                if (schedule.teamAuditorNames) {
                  if (typeof schedule.teamAuditorNames === 'string') {
                    try {
                      teamAuditorNames = JSON.parse(schedule.teamAuditorNames);
                      console.log("Parsed teamAuditorNames from JSON string:", teamAuditorNames);
                    } catch(e) {
                      console.error("Error parsing teamAuditorNames:", e);
                      teamAuditorNames = [];
                    }
                  } else if (Array.isArray(schedule.teamAuditorNames)) {
                    teamAuditorNames = schedule.teamAuditorNames;
                    console.log("teamAuditorNames is array:", teamAuditorNames);
                  }
                }
               
                // Source 2: coAuditorNames (alternative field)
                if (teamAuditorNames.length === 0 && schedule.coAuditorNames) {
                  if (typeof schedule.coAuditorNames === 'string') {
                    try {
                      teamAuditorNames = JSON.parse(schedule.coAuditorNames);
                      console.log("Parsed coAuditorNames from JSON string:", teamAuditorNames);
                    } catch(e) {
                      teamAuditorNames = [];
                    }
                  } else if (Array.isArray(schedule.coAuditorNames)) {
                    teamAuditorNames = schedule.coAuditorNames;
                    console.log("coAuditorNames is array:", teamAuditorNames);
                  }
                }
               
                // Source 3: If we have teamAuditorIds but no names, fetch from users
                if (teamAuditorNames.length === 0 && schedule.teamAuditorIds) {
                  let teamIds = [];
                  if (typeof schedule.teamAuditorIds === 'string') {
                    try {
                      teamIds = JSON.parse(schedule.teamAuditorIds);
                    } catch(e) {}
                  } else if (Array.isArray(schedule.teamAuditorIds)) {
                    teamIds = schedule.teamAuditorIds;
                  }
                 
                  if (teamIds.length > 0) {
                    // Try to get from coAuditorIds field
                    if (schedule.coAuditorIds) {
                      let coIds = [];
                      if (typeof schedule.coAuditorIds === 'string') {
                        try {
                          coIds = JSON.parse(schedule.coAuditorIds);
                        } catch(e) {}
                      } else if (Array.isArray(schedule.coAuditorIds)) {
                        coIds = schedule.coAuditorIds;
                      }
                      if (coIds.length > 0 && coIds.length === teamIds.length) {
                        teamAuditorNames = coIds.map(id => `Auditor ${id}`);
                      } else {
                        teamAuditorNames = teamIds.map(id => `Auditor ${id}`);
                      }
                    } else {
                      teamAuditorNames = teamIds.map(id => `Auditor ${id}`);
                    }
                    console.log("Generated names from IDs:", teamAuditorNames);
                  }
                }
               
                // ✅ FIX: Parse multiple auditee names from JSON
                let auditeeNames = [];
                if (schedule.auditeeNames) {
                  if (typeof schedule.auditeeNames === 'string') {
                    try {
                      auditeeNames = JSON.parse(schedule.auditeeNames);
                      console.log("Parsed auditeeNames:", auditeeNames);
                    } catch(e) {
                      console.error("Parse error:", e);
                      auditeeNames = [schedule.auditeeNames];
                    }
                  } else if (Array.isArray(schedule.auditeeNames)) {
                    auditeeNames = schedule.auditeeNames;
                  }
                } else if (schedule.auditeeName) {
                  auditeeNames = [schedule.auditeeName];
                }
               
                // Get lead auditor name
                const leadAuditorName = schedule.leadAuditorName || schedule.auditorName || '-';
               
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border">{schedule.department}</td>
                    <td className="px-3 py-2 border">{schedule.week}</td>
                    <td className="px-3 py-2 border">
                      <div className="flex flex-wrap gap-1">
                        {schedule.auditElements && typeof schedule.auditElements === 'string'
                          ? (() => {
                              try {
                                const elements = JSON.parse(schedule.auditElements);
                                return elements.map((el, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    {auditElementsMap[el] || el.substring(0, 3)}
                                  </span>
                                ));
                              } catch(e) {
                                return <span className="text-xs">{schedule.auditElements}</span>;
                              }
                            })()
                          : schedule.auditElements?.map((el, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {auditElementsMap[el] || el.substring(0, 3)}
                              </span>
                            ))
                        }
                      </div>
                    </td>
                    <td className="px-3 py-2 border">
                      <div className="font-medium text-gray-800">{leadAuditorName}</div>
                    </td>
                    {/* ✅ UPDATED Team Auditors Column with better display */}
                    <td className="px-3 py-2 border">
                      {teamAuditorNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teamAuditorNames.map((name, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs" title={name}>
                              {name.length > 20 ? name.substring(0, 18) + '...' : name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* ✅ UPDATED Auditees Column */}
                    <td className="px-3 py-2 border">
                      {auditeeNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {auditeeNames.map((name, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs" title={name}>
                              {name.length > 20 ? name.substring(0, 18) + '...' : name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border">
                      <span className="px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded-full">
                        {schedule.status || 'SCHEDULED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
       
        {/* Legend */}
        <div className="p-3 mb-4 rounded-lg bg-gray-50">
          <p className="mb-1 text-xs font-medium text-gray-600">Legend - Audit Elements codes:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-gray-500">A - System Audit (ISO9001)</span>
            <span className="text-gray-500">B - System Audit (IATF16949)</span>
            <span className="text-gray-500">C - 5S Audit</span>
            <span className="text-gray-500">D - Process Audit</span>
            <span className="text-gray-500">E - Product Audit</span>
          </div>
        </div>
       
        {/* Approval Comments */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-gray-700">Approval Comments (Optional)</label>
          <textarea
            value={form5ApprovalComment}
            onChange={(e) => setForm5ApprovalComment(e.target.value)}
            rows={2}
            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Add any comments for approval..."
          />
        </div>
       
        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowForm5RejectModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            <FiX className="w-4 h-4" /> Reject
          </button>
          <button
            onClick={handleApproveForm5Plan}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCheck className="w-4 h-4" />}
            Approve
          </button>
        </div>
      </div>
    </div>
  </div>
)}
 

      {/* Form 5 Detailed Daily Schedule Modal with Tabs */}
      {showDetailedDetails && selectedDetailedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">
                  Daily Schedule - {monthDisplay[selectedDetailedPlan.month]} {selectedDetailedPlan.year}
                </h3>
                {selectedDetailedPlan.leadAuditorName && (
                  <p className="text-sm text-gray-500 mt-1">Lead Auditor: {selectedDetailedPlan.leadAuditorName}</p>
                )}
                <p className="text-sm text-gray-500">Prepared by: {selectedDetailedPlan.preparedBy || 'N/A'}</p>
              </div>
              <button onClick={() => setShowDetailedDetails(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {/* Inner Tabs for Pending/History within the modal */}
              <div className="mb-4 border-b border-gray-200">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`py-2 px-3 text-sm font-medium transition-colors ${
                      activeTab === 'pending' 
                        ? 'text-teal-600 border-b-2 border-teal-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FiClock className="w-4 h-4" />
                      Pending Approval
                      <span className="ml-1 text-xs text-gray-400">
                        ({detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED').length})
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`py-2 px-3 text-sm font-medium transition-colors ${
                      activeTab === 'history' 
                        ? 'text-teal-600 border-b-2 border-teal-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FiArchive className="w-4 h-4" />
                      History & Approved
                      <span className="ml-1 text-xs text-gray-400">
                        ({detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'APPROVED' || s.detailedApprovalStatus === 'REJECTED').length})
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Status Summary & Filter */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-2">Schedule Status Summary:</p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const pendingCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL').length;
                      const approvedCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'APPROVED').length;
                      const rejectedCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'REJECTED').length;
                      const changeRequestedCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'CHANGE_REQUESTED').length;
                      const draftCount = detailedSchedulesList.filter(s => !s.detailedApprovalStatus || s.detailedApprovalStatus === 'DRAFT').length;
                      
                      return (
                        <>
                          {pendingCount > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                              {pendingCount} Pending
                            </span>
                          )}
                          {approvedCount > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                              {approvedCount} Approved
                            </span>
                          )}
                          {rejectedCount > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                              {rejectedCount} Rejected
                            </span>
                          )}
                          {changeRequestedCount > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                              {changeRequestedCount} Changes Requested
                            </span>
                          )}
                          {draftCount > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                              {draftCount} Draft
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <FiFilter className="text-gray-400" />
                  <select 
                    value={detailedAuditTypeFilter}
                    onChange={(e) => setDetailedAuditTypeFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">All Audit Types</option>
                    {getUniqueAuditTypes().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 border">Date</th>
                      <th className="px-3 py-2 border">Time Slot</th>
                      <th className="px-3 py-2 border">Departments/Event</th>
                      <th className="px-3 py-2 border">Audit Type</th>
                      <th className="px-3 py-2 border">Auditor</th>
                      <th className="px-3 py-2 border">Auditee</th>
                      <th className="px-3 py-2 border">Approval Status</th>
                      <th className="px-3 py-2 border">Approved/Rejected By</th>
                      <th className="px-3 py-2 border text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredDetailedSchedules().map((schedule, idx) => {
  const approvalStatus = schedule.detailedApprovalStatus || 'DRAFT';
  const isPending = approvalStatus === 'PENDING_APPROVAL';
  const isChangeRequested = approvalStatus === 'CHANGE_REQUESTED';
  const isApproved = approvalStatus === 'APPROVED';
  const isRejected = approvalStatus === 'REJECTED';
  
  return (
    <tr key={schedule.id || idx} className="hover:bg-gray-50">
      {/* Date Column - WITH DATE RANGE SUPPORT */}
      <td className="px-3 py-2 border">
        {schedule.fromDate && schedule.toDate && schedule.fromDate !== schedule.toDate ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-purple-600 text-xs">📅</span>
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
          <div className="text-sm">{schedule.scheduledDate || schedule.date}</div>
        )}
      </td>
      
      {/* Time Slot Column */}
      <td className="px-3 py-2 border">
        <div className="text-sm">{schedule.startTime} - {schedule.endTime}</div>
        {schedule.fromDate && schedule.toDate && schedule.fromDate !== schedule.toDate && (
          <div className="text-[10px] text-purple-500 mt-0.5">(Any day in range)</div>
        )}
      </td>
      
      {/* Rest of the columns remain the same */}
      <td className="px-3 py-2 border">
        {schedule.isSpecialEvent ? (
          <div className="flex items-center gap-2">
            {schedule.specialEventType === 'OPENING' && <FiSunrise className="w-4 h-4 text-blue-500" />}
            {schedule.specialEventType === 'LUNCH' && <FiCoffee className="w-4 h-4 text-orange-500" />}
            {schedule.specialEventType === 'CLOSING' && <FiSunset className="w-4 h-4 text-purple-500" />}
            <span>
              {schedule.specialEventType === 'OPENING' ? 'Opening Meeting' : 
               schedule.specialEventType === 'LUNCH' ? 'Lunch Break' : 'Closing Meeting'}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {schedule.departments?.map((dept, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                {dept}
              </span>
            ))}
          </div>
        )}
      </td>
      
      <td className="px-3 py-2 border">{schedule.auditType || '-'}</td>
      <td className="px-3 py-2 border">{schedule.auditorName || '-'}</td>
      <td className="px-3 py-2 border">{schedule.auditeeName || '-'}</td>
      <td className="px-3 py-2 border">{getStatusBadge(approvalStatus)}</td>
      
                          <td className="px-3 py-2 border">
                            {isApproved && schedule.approvedByName && (
                              <div className="flex items-center gap-1 text-xs">
                                <FiUserCheck className="w-3 h-3 text-green-600" />
                                <span>{schedule.approvedByName}</span>
                                {schedule.approvedDate && (
                                  <span className="text-gray-400 text-xs">
                                    {new Date(schedule.approvedDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                            {isRejected && schedule.detailedRejectionReason && (
                              <div className="flex items-center gap-1 text-xs">
                                <FiUserX className="w-3 h-3 text-red-600" />
                                <span className="text-red-600" title={schedule.detailedRejectionReason}>
                                  {schedule.detailedRejectionReason.substring(0, 30)}...
                                </span>
                              </div>
                            )}
                            {isChangeRequested && schedule.detailedRejectionReason && (
                              <div className="flex items-center gap-1 text-xs">
                                <FiMessageSquare className="w-3 h-3 text-orange-600" />
                                <span className="text-orange-600" title={schedule.detailedRejectionReason}>
                                  Changes requested
                                </span>
                              </div>
                            )}
                            {isPending && (
                              <div className="text-xs text-gray-400">
                                Awaiting review
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 border text-center">
                            {isPending && (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleApproveSingleSchedule(schedule)}
                                  disabled={submitting}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Approve Schedule"
                                >
                                  <FiThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedScheduleForAction(schedule);
                                    setDetailedRejectionReason('');
                                    setShowScheduleRejectModal(true);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Reject Schedule"
                                >
                                  <FiThumbsDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedScheduleForAction(schedule);
                                    setChangeRequestReason('');
                                    setShowChangeRequestModal(true);
                                  }}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                                  title="Request Changes"
                                >
                                  <FiMessageSquare className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {isChangeRequested && (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedScheduleForAction(schedule);
                                    setChangeRequestReason('');
                                    setShowChangeRequestModal(true);
                                  }}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                                  title="Review Changes"
                                >
                                  <FiMessageSquare className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleApproveSingleSchedule(schedule)}
                                  disabled={submitting}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Approve After Changes"
                                >
                                  <FiCheck className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {isApproved && (
  <div className="flex flex-col gap-1">
    <button 
      onClick={() => {
        setSelectedScheduleForAction(schedule);
        setChangeRequestReason('');
        setShowChangeRequestModal(true);
      }} 
      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" 
      title="Request Changes to Approved Schedule"
    >
      <FiMessageSquare className="w-4 h-4" />
    </button>
    <span className="text-xs text-green-600 font-medium">Approved</span>
  </div>
)}
                          </td>
                        </tr>
                      );
                    })}
                    {getFilteredDetailedSchedules().length === 0 && (
                      <tr>
                        <td colSpan="9" className="px-3 py-4 text-center text-gray-400">
                          No schedules found for selected filter and tab.
                         </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Bulk Actions Section - Only show on Pending tab */}
              {activeTab === 'pending' && getFilteredPendingCount() > 0 && (
                <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 mb-2 flex items-center gap-2">
                    <FiInfo className="w-4 h-4" />
                    Bulk Actions: {getFilteredPendingCount()} pending schedule(s) 
                    {detailedAuditTypeFilter ? ` for audit type "${detailedAuditTypeFilter}"` : ' (all audit types)'}
                  </p>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comments / Reason (Optional for approve, required for reject)</label>
                    <textarea
                      value={detailedApprovalComment}
                      onChange={(e) => setDetailedApprovalComment(e.target.value)}
                      rows={2}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Add comments for bulk action..."
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDetailedRejectModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      <FiX className="w-4 h-4" /> Reject All Pending
                    </button>
                    <button
                      onClick={handleBulkApproveByAuditType}
                      disabled={submitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <FiCheckSquare className="w-4 h-4" />}
                      Approve All Pending
                    </button>
                  </div>
                </div>
              )}
              
              {/* History info section */}
              {activeTab === 'history' && getFilteredHistoryCount() > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <FiArchive className="w-4 h-4" />
                    This section shows all approved and rejected schedules for this month.
                    {detailedAuditTypeFilter && ` Currently filtered by "${detailedAuditTypeFilter}".`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modals */}
      {showForm5RejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Reject Week Schedule</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={form5RejectionReason}
              onChange={(e) => setForm5RejectionReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowForm5RejectModal(false); setForm5RejectionReason(''); }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectForm5Plan}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailedRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Reject {getFilteredPendingCount()} Pending Schedule(s)
              {detailedAuditTypeFilter && ` for "${detailedAuditTypeFilter}"`}
            </h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={detailedRejectionReason}
              onChange={(e) => setDetailedRejectionReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowDetailedRejectModal(false); setDetailedRejectionReason(''); }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRejectByAuditType}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Schedule Reject Modal */}
      {showScheduleRejectModal && selectedScheduleForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Reject Schedule for {selectedScheduleForAction.scheduledDate}
            </h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={detailedRejectionReason}
              onChange={(e) => setDetailedRejectionReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowScheduleRejectModal(false);
                  setDetailedRejectionReason('');
                  setSelectedScheduleForAction(null);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSingleSchedule}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && selectedScheduleForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Request Changes for {selectedScheduleForAction.scheduledDate}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
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
                  setSelectedScheduleForAction(null);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestChangesForSchedule(selectedScheduleForAction)}
                disabled={submitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                Request Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals */}
      {showPlanDetails && (
        <PlanDetailsModal
          selectedPlan={selectedPlan}
          onClose={() => { setShowPlanDetails(false); setSelectedPlan(null); setPlanApprovalComment(''); }}
          onApprove={handleApprovePlan}
          onReject={() => setShowPlanRejectModal(true)}
          approvalComment={planApprovalComment}
          setApprovalComment={setPlanApprovalComment}
          submitting={submitting}
        />
      )}
      
      {showPlanRejectModal && (
        <RejectModal
          isOpen={showPlanRejectModal}
          onClose={() => { setShowPlanRejectModal(false); setPlanRejectionReason(''); }}
          onConfirm={handleRejectPlan}
          year={selectedPlan?.year}
          rejectionReason={planRejectionReason}
          setRejectionReason={setPlanRejectionReason}
          submitting={submitting}
        />
      )}

      {showDeptPlanDetails && (
        <DeptPlanDetailsModal
          selectedPlan={selectedDeptPlan}
          onClose={() => { setShowDeptPlanDetails(false); setSelectedDeptPlan(null); setDeptApprovalComment(''); }}
          onApprove={handleApproveDeptPlan}
          onReject={() => setShowDeptRejectModal(true)}
          approvalComment={deptApprovalComment}
          setApprovalComment={setDeptApprovalComment}
          submitting={submitting}
        />
      )}
      
      {showDeptRejectModal && (
        <RejectModal
          isOpen={showDeptRejectModal}
          onClose={() => { setShowDeptRejectModal(false); setDeptRejectionReason(''); }}
          onConfirm={handleRejectDeptPlan}
          year={selectedDeptPlan?.year}
          rejectionReason={deptRejectionReason}
          setRejectionReason={setDeptRejectionReason}
          submitting={submitting}
        />
      )}

      {/* Forum Modal */}
{/* Forum Modal */}
{showForumModal && selectedAuditForForum && (
  <AuditCheckSheetNCRForumModal
    auditId={selectedAuditForForum.id}
    auditNumber={selectedAuditForForum.auditNumber}
    auditTitle={selectedAuditForForum.auditType}
    auditStatus="IN_PROGRESS"
    auditType={selectedAuditForForum.auditType}
    department={selectedAuditForForum.department}
    auditorId={user?.id}
    auditorName={user?.name}
    auditeeId={selectedAuditForForum.auditeeId}
    auditeeName={selectedAuditForForum.auditeeName}
    hodEmail={selectedAuditForForum.hodEmail}
    hodName={selectedAuditForForum.hodName}
    memberEmails={selectedAuditForForum.memberEmails || []}  // ✅ ADD THIS LINE
    isOpen={showForumModal}
    onClose={() => {
      setShowForumModal(false);
      setSelectedAuditForForum(null);
    }}
    currentUser={user}
    allUsers={allUsersList}
  />
)}
    </div>

    
  );
};

export default TopManagementDashboard;