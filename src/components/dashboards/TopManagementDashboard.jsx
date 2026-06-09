import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBarChart2, FiCheckCircle, FiAlertCircle, FiTrendingUp, 
  FiEye, FiClock, FiCalendar, FiFileText, FiSend, FiList,
  FiUsers, FiCalendar as FiCalendarIcon, FiX, FiCheck,
  FiSunrise, FiSunset, FiCoffee, FiFilter, FiRefreshCw,
  FiInfo, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiCheckSquare, FiMessageCircle,
  FiArchive, FiActivity, FiUserCheck, FiUserX, FiClock as FiClockIcon,
  FiChevronRight
} from 'react-icons/fi';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import PlanDetailsModal from '../modals/PlanDetailsModal';
import DeptPlanDetailsModal from '../modals/DeptPlanDetailsModal';
import RejectModal from '../modals/RejectModal';
import { auditScheduleApi } from '../../services/auditScheduleApi';

const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

const TopManagementDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tab state for detailed view
  const [activeTab, setActiveTab] = useState('pending');
  
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
  const [changeRequestType, setChangeRequestType] = useState('');
  const [selectedPlanForChange, setSelectedPlanForChange] = useState(null);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);
  

  // Add these with your other state declarations
const [allMonthlyPlans, setAllMonthlyPlans] = useState([]);
const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

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
          return <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
        case 'REJECTED':
          return <span className="flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-100 rounded-full"><FiX className="w-3 h-3" /> Rejected</span>;
        case 'PENDING_APPROVAL':
          return <span className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded-full"><FiClock className="w-3 h-3" /> Pending</span>;
        case 'CHANGE_REQUESTED':
          return <span className="flex items-center gap-1 px-2 py-1 text-xs text-orange-700 bg-orange-100 rounded-full"><FiMessageSquare className="w-3 h-3" /> Changes Requested</span>;
        default:
          return <span className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full">Draft</span>;
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

  // Fetch Annual Plans (Form 3)
  const fetchAnnualPlans = async () => {
    try {
      const currentYear = new Date().getFullYear();
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
  const fetchDetailedPlans = useCallback(async () => {
    try {
      const currentYear = new Date().getFullYear();
const years = [];
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
      years.push(i);
    }      let allDailySchedules = [];
      
      for (const year of years) {
        for (const month of ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']) {
          try {
            const response = await auditScheduleApi.getDateSchedulesByMonth(year, month);
            const schedules = response.data || [];
            
            schedules.forEach(schedule => {
              schedule.planYear = year;
              schedule.month = month;
              
              if (!schedule.preparedByName && schedule.preparedBy) {
                schedule.preparedByName = schedule.preparedBy;
              }
              
              if (!schedule.approvedByName && schedule.approvedBy) {
                schedule.approvedByName = schedule.approvedBy;
              }
              
              if (!schedule.detailedApprovalStatus && schedule.approvalStatus) {
                schedule.detailedApprovalStatus = schedule.approvalStatus;
              }
            });
            
            allDailySchedules.push(...schedules);
          } catch (err) {
            console.log(`No schedules for ${month} ${year}`);
          }
        }
      }
      
      setAllDetailedSchedules(allDailySchedules);
      
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
        
        if (schedule.preparedBy && schedule.preparedBy !== 'N/A' && schedule.preparedBy !== 'null') {
          monthData.preparedBySet.add(schedule.preparedBy);
        } else if (schedule.preparedByName && schedule.preparedByName !== 'N/A') {
          monthData.preparedBySet.add(schedule.preparedByName);
        }
        
        if (schedule.approvedBy && schedule.approvedBy !== 'N/A' && schedule.approvedBy !== 'null') {
          monthData.approvedBySet.add(schedule.approvedBy);
        } else if (schedule.approvedByName && schedule.approvedByName !== 'N/A') {
          monthData.approvedBySet.add(schedule.approvedByName);
        }
        
        const approvalDate = schedule.approvedAt || schedule.approvedDate;
        if (approvalDate && (!monthData.approvedAt || new Date(approvalDate) > new Date(monthData.approvedAt))) {
          monthData.approvedAt = approvalDate;
        }
        
        monthData.schedules.push(schedule);
      });
      
      const pendingMonths = [];
      const approvedMonths = [];
      const rejectedMonths = [];
      
      for (const [key, monthData] of monthMap) {
        const schedules = monthData.schedules;
        
        const uniquePreparedBy = Array.from(monthData.preparedBySet);
        const uniqueApprovedBy = Array.from(monthData.approvedBySet);
        
        monthData.displayPreparedBy = uniquePreparedBy.length > 0 
          ? uniquePreparedBy.join(', ') 
          : 'Not available';
        
        monthData.displayApprovedBy = uniqueApprovedBy.length > 0 
          ? uniqueApprovedBy.join(', ') 
          : 'Not approved yet';
        
        const getStatus = (schedule) => {
          return schedule.detailedApprovalStatus || schedule.approvalStatus || 'DRAFT';
        };
        
        const allApproved = schedules.length > 0 && schedules.every(s => getStatus(s) === 'APPROVED');
        const hasPending = schedules.some(s => getStatus(s) === 'PENDING_APPROVAL');
        const hasChangeRequested = schedules.some(s => getStatus(s) === 'CHANGE_REQUESTED');
        const hasRejected = schedules.some(s => getStatus(s) === 'REJECTED');
        
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
            schedules: schedules
          });
        } else if (allApproved && schedules.length > 0) {
          approvedMonths.push({
            ...monthData,
            preparedBy: monthData.displayPreparedBy,
            approvedBy: monthData.displayApprovedBy,
            scheduleCount: schedules.length,
            approvedCount: schedules.length,
            approvedAt: monthData.approvedAt,
            schedules: schedules
          });
        } else if (hasRejected) {
          rejectedMonths.push({
            ...monthData,
            preparedBy: monthData.displayPreparedBy,
            approvedBy: monthData.displayApprovedBy,
            scheduleCount: schedules.length,
            rejectedCount: schedules.filter(s => getStatus(s) === 'REJECTED').length,
            approvedCount: schedules.filter(s => getStatus(s) === 'APPROVED').length,
            schedules: schedules
          });
        }
      }
      
      setPendingDetailedPlans(pendingMonths);
      setApprovedDetailedPlans([...approvedMonths, ...rejectedMonths]);
      
      return { 
        pendingCount: pendingMonths.length, 
        approvedCount: approvedMonths.length + rejectedMonths.length 
      };
    } catch (error) {
      console.error('Error fetching detailed plans:', error);
      return { pendingCount: 0, approvedCount: 0 };
    }
  }, []);

  const refreshDetailedSchedulesData = useCallback(async () => {
    try {
      const result = await fetchDetailedPlans();
      console.log('ðŸ”„ Refreshed detailed plans:', result);
      
      if (showDetailedDetails && selectedDetailedPlan) {
        const updatedPendingMonths = [...pendingDetailedPlans];
        const updatedApprovedMonths = [...approvedDetailedPlans];
        
        let found = false;
        for (let i = 0; i < updatedPendingMonths.length; i++) {
          if (updatedPendingMonths[i].month === selectedDetailedPlan.month && 
              updatedPendingMonths[i].year === selectedDetailedPlan.year) {
            updatedPendingMonths[i] = {
              ...updatedPendingMonths[i],
              schedules: updatedPendingMonths[i].schedules.map(s => {
                const updated = allDetailedSchedules.find(a => a.id === s.id);
                return updated || s;
              })
            };
            setDetailedSchedulesList(updatedPendingMonths[i].schedules);
            found = true;
            break;
          }
        }
        
        if (!found) {
          for (let i = 0; i < updatedApprovedMonths.length; i++) {
            if (updatedApprovedMonths[i].month === selectedDetailedPlan.month && 
                updatedApprovedMonths[i].year === selectedDetailedPlan.year) {
              setDetailedSchedulesList(updatedApprovedMonths[i].schedules);
              break;
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error refreshing detailed plans:', error);
      return null;
    }
  }, [fetchDetailedPlans, showDetailedDetails, selectedDetailedPlan, pendingDetailedPlans, approvedDetailedPlans, allDetailedSchedules]);

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

  const openAuditForum = (auditData) => {
    const memberEmails = [];
    
    if (user?.email) memberEmails.push(user.email);
    
    if (auditData.auditorId) {
      const auditor = allUsersList.find(u => u.id === auditData.auditorId);
      if (auditor?.email) {
        memberEmails.push(auditor.email);
      }
    }
    
    if (auditData.auditeeId) {
      const auditee = allUsersList.find(u => u.id === auditData.auditeeId);
      if (auditee?.email) {
        memberEmails.push(auditee.email);
      }
    }
    
    if (auditData.hodEmail) {
      memberEmails.push(auditData.hodEmail);
    }
    
    if (auditData.memberEmails) {
      memberEmails.push(...auditData.memberEmails);
    }
    
    const uniqueMemberEmails = [...new Set(memberEmails)];
    
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
    fetchAllUsers();
  }, []);



  useEffect(() => {
  if (showDetailedDetails && selectedDetailedPlan) {
    const hasPendingSchedules = detailedSchedulesList.some(
      s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || 
           s.detailedApprovalStatus === 'CHANGE_REQUESTED'
    );
    
    if (!hasPendingSchedules && activeTab === 'pending') {
      setActiveTab('history');
    }
  }
}, [showDetailedDetails, detailedSchedulesList, selectedDetailedPlan, activeTab]);


// Add this after your other useEffects
useEffect(() => {
  if (showDetailedDetails && selectedDetailedPlan) {
    // Ensure detailedSchedulesList reflects the current selected plan's schedules
    const currentSchedules = selectedDetailedPlan.schedules || [];
    setDetailedSchedulesList(currentSchedules);
  }
}, [selectedDetailedPlan, showDetailedDetails]);

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
// ========== Form 5 Detailed (Daily Schedule) Handlers ==========
const handleViewDetailedPlan = (plan, tab = 'pending') => {
  setSelectedDetailedPlan(plan);
  const schedules = plan.schedules || [];
  setDetailedSchedulesList(schedules);
  
  // Combine all months for navigation
  const allMonths = [...pendingDetailedPlans, ...approvedDetailedPlans];
  setAllMonthlyPlans(allMonths);
  
  const currentIdx = allMonths.findIndex(
    m => m.year === plan.year && m.month === plan.month
  );
  setCurrentMonthIndex(currentIdx >= 0 ? currentIdx : 0);
  
  // Check if there are any pending or change-requested schedules
  const hasPendingSchedules = schedules.some(s => 
    s.detailedApprovalStatus === 'PENDING_APPROVAL' || 
    s.detailedApprovalStatus === 'CHANGE_REQUESTED'
  );
  
  // Auto-switch to history tab if no pending schedules
  if (!hasPendingSchedules) {
    setActiveTab('history');
  } else {
    setActiveTab(tab);
  }
  
  setDetailedApprovalComment('');
  setDetailedRejectionReason('');
  setDetailedAuditTypeFilter('');
  setShowDetailedDetails(true);
};

// Add navigation function
const navigateToMonth = (direction) => {
  const newIndex = currentMonthIndex + direction;
  if (newIndex >= 0 && newIndex < allMonthlyPlans.length) {
    const newPlan = allMonthlyPlans[newIndex];
    setCurrentMonthIndex(newIndex);
    setSelectedDetailedPlan(newPlan);
    setDetailedSchedulesList(newPlan.schedules || []);
    
    const hasPendingSchedules = newPlan.schedules.some(s => 
      s.detailedApprovalStatus === 'PENDING_APPROVAL' || 
      s.detailedApprovalStatus === 'CHANGE_REQUESTED'
    );
    
    if (!hasPendingSchedules && activeTab === 'pending') {
      setActiveTab('history');
    }
  }
};
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

  const handleApproveSingleSchedule = async (schedule) => {
  if (!window.confirm(`Approve schedule for ${schedule.scheduledDate}?`)) return;
  
  setSubmitting(true);
  try {
    // Try the actual API call
    await auditScheduleApi.approveSchedule(schedule.id, user?.id, detailedApprovalComment);
    addToast(`Schedule for ${schedule.scheduledDate} approved!`, 'success');
  } catch (error) {
    console.error('API Error:', error);
    addToast(`Warning: Backend error but updating UI locally. ${error.response?.data?.message || ''}`, 'warning');
    // Continue with local update even if backend fails
  }
  
  // âœ… IMMEDIATE LOCAL UI UPDATE (works even if backend fails)
  // Update the schedule in detailedSchedulesList
  setDetailedSchedulesList(prevList => {
    const updatedList = prevList.map(s => 
      s.id === schedule.id 
        ? { 
            ...s, 
            detailedApprovalStatus: 'APPROVED', 
            approvedByName: user?.name || user?.username,
            approvedBy: user?.name || user?.username,
            approvedAt: new Date().toISOString(),
            approvedDate: new Date().toISOString()
          }
        : s
    );
    
    // If on pending tab, filter out approved schedules
    if (activeTab === 'pending') {
      return updatedList.filter(s => 
        s.detailedApprovalStatus === 'PENDING_APPROVAL' || 
        s.detailedApprovalStatus === 'CHANGE_REQUESTED'
      );
    }
    return updatedList;
  });
  
  // Update master list
  setAllDetailedSchedules(prevList => 
    prevList.map(s => 
      s.id === schedule.id 
        ? { 
            ...s, 
            detailedApprovalStatus: 'APPROVED', 
            approvedByName: user?.name || user?.username,
            approvedBy: user?.name || user?.username,
            approvedAt: new Date().toISOString()
          }
        : s
    )
  );
  
  // Update the monthly plan data
  if (selectedDetailedPlan) {
    const updatedSchedules = selectedDetailedPlan.schedules.map(s =>
      s.id === schedule.id
        ? { 
            ...s, 
            detailedApprovalStatus: 'APPROVED', 
            approvedByName: user?.name || user?.username,
            approvedBy: user?.name || user?.username,
            approvedAt: new Date().toISOString()
          }
        : s
    );
    
    const newPendingCount = updatedSchedules.filter(s => 
      s.detailedApprovalStatus === 'PENDING_APPROVAL'
    ).length;
    const newChangeRequestedCount = updatedSchedules.filter(s => 
      s.detailedApprovalStatus === 'CHANGE_REQUESTED'
    ).length;
    
    setSelectedDetailedPlan({
      ...selectedDetailedPlan,
      schedules: updatedSchedules,
      pendingCount: newPendingCount,
      changeRequestedCount: newChangeRequestedCount
    });
    
    // Update the plan in the pendingDetailedPlans or approvedDetailedPlans arrays
    setPendingDetailedPlans(prev => 
      prev.map(plan => 
        plan.year === selectedDetailedPlan.year && plan.month === selectedDetailedPlan.month
          ? { ...plan, pendingCount: newPendingCount, changeRequestedCount: newChangeRequestedCount }
          : plan
      ).filter(plan => plan.pendingCount > 0 || plan.changeRequestedCount > 0) // Remove if no pending left
    );
    
    // If schedule was approved and no pending left, move to approved plans
    if (newPendingCount === 0 && newChangeRequestedCount === 0) {
      setApprovedDetailedPlans(prev => {
        // Check if already exists
        const exists = prev.some(p => p.year === selectedDetailedPlan.year && p.month === selectedDetailedPlan.month);
        if (!exists) {
          return [...prev, { ...selectedDetailedPlan, schedules: updatedSchedules, pendingCount: 0, changeRequestedCount: 0 }];
        }
        return prev;
      });
    }
  }
  
  // Check if there are no more pending schedules
  const remainingPending = detailedSchedulesList.filter(s => 
    s.id !== schedule.id && 
    (s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED')
  ).length;
  
  if (remainingPending === 0 && activeTab === 'pending') {
    setActiveTab('history');
  }
  
  // Try to refresh in background, but UI already updated
  setTimeout(() => {
    fetchDetailedPlans(); // Refresh data in background
  }, 1000);
  
  setSubmitting(false);
};


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

 const handleBulkApproveByAuditType = async () => {
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
  
  const approvedIds = new Set(pendingSchedules.map(s => s.id));
  
  // Try API calls
  for (const schedule of pendingSchedules) {
    try {
      await axios.post(`${API_BASE}/audit-schedule/schedule/${schedule.id}/approve?userId=${user?.id}`, {
        comments: detailedApprovalComment
      }, { withCredentials: true });
    } catch (error) {
      console.error(`Failed to approve schedule ${schedule.id}:`, error);
    }
  }
  
  // âœ… CRITICAL: Update the detailedSchedulesList with APPROVED status
  setDetailedSchedulesList(prevList => {
    // First, mark all approved schedules as APPROVED
    const updatedList = prevList.map(schedule => {
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
    
    // If we're on pending tab, return ONLY pending and change-requested schedules
    if (activeTab === 'pending') {
      const filteredList = updatedList.filter(s => 
        s.detailedApprovalStatus === 'PENDING_APPROVAL' || 
        s.detailedApprovalStatus === 'CHANGE_REQUESTED'
      );
      console.log('Bulk Approve - Pending tab filtered list length:', filteredList.length);
      return filteredList;
    }
    
    return updatedList;
  });
  
  // âœ… Update master list
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
  
  // âœ… Update selected plan's schedules
  if (selectedDetailedPlan) {
    const updatedSchedules = selectedDetailedPlan.schedules.map(s =>
      approvedIds.has(s.id)
        ? { 
            ...s, 
            detailedApprovalStatus: 'APPROVED', 
            approvedByName: user?.name || user?.username,
            approvedBy: user?.name || user?.username,
            approvedAt: new Date().toISOString()
          }
        : s
    );
    
    const newPendingCount = updatedSchedules.filter(s => 
      s.detailedApprovalStatus === 'PENDING_APPROVAL'
    ).length;
    const newChangeRequestedCount = updatedSchedules.filter(s => 
      s.detailedApprovalStatus === 'CHANGE_REQUESTED'
    ).length;
    
    setSelectedDetailedPlan({
      ...selectedDetailedPlan,
      schedules: updatedSchedules,
      pendingCount: newPendingCount,
      changeRequestedCount: newChangeRequestedCount
    });
  }
  
  addToast(`${pendingSchedules.length} schedule(s) approved!`, 'success');
  setDetailedApprovalComment('');
  
  // âœ… Check if no more pending schedules and auto-switch to history
  const remainingPendingCount = detailedSchedulesList.filter(s => 
    !approvedIds.has(s.id) && 
    (s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED')
  ).length;
  
  console.log('Remaining pending count:', remainingPendingCount);
  
  if (remainingPendingCount === 0 && activeTab === 'pending') {
    console.log('No pending left, switching to history tab');
    setActiveTab('history');
  }
  
  // âœ… Force refresh the filtered view
  setTimeout(() => {
    // This will trigger re-render of getFilteredDetailedSchedules
    setDetailedAuditTypeFilter(prev => prev);
  }, 100);
  
  // Background refresh
  setTimeout(() => {
    fetchDetailedPlans();
  }, 2000);
  
  setSubmitting(false);
};
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
      
      for (const schedule of pendingSchedules) {
        await axios.post(`${API_BASE}/audit-schedule/schedule/${schedule.id}/reject?userId=${user?.id}`, {
          reason: rejectionReason
        }, { withCredentials: true });
        rejectedCount++;
        rejectedIds.add(schedule.id);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
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
      
      setDetailedSchedulesList(updatedList);
      
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
      setDetailedRejectionReason('');
      
    } catch (error) {
      console.error('Error rejecting schedules:', error);
      addToast(error.response?.data?.message || 'Failed to reject some schedules', 'error');
    } finally {
      setSubmitting(false);
    }
  };

 const getFilteredDetailedSchedules = useCallback(() => {
  console.log('Filtering schedules - Active Tab:', activeTab);
  console.log('Total schedules before filter:', detailedSchedulesList.length);
  console.log('Schedule statuses:', detailedSchedulesList.map(s => ({ id: s.id, status: s.detailedApprovalStatus })));
  
  let filtered = [...detailedSchedulesList];
  
  // Filter by audit type
  if (detailedAuditTypeFilter && detailedAuditTypeFilter.trim() !== '') {
    filtered = filtered.filter(schedule => 
      doesScheduleMatchFilter(schedule, detailedAuditTypeFilter)
    );
  }
  
  // Filter by tab
  if (activeTab === 'pending') {
    filtered = filtered.filter(s => 
      s.detailedApprovalStatus === 'PENDING_APPROVAL' || 
      s.detailedApprovalStatus === 'CHANGE_REQUESTED'
    );
    console.log('Pending tab filtered count:', filtered.length);
  } else {
    // History tab - show APPROVED and REJECTED
    filtered = filtered.filter(s => 
      s.detailedApprovalStatus === 'APPROVED' || 
      s.detailedApprovalStatus === 'REJECTED'
    );
    console.log('History tab filtered count:', filtered.length);
  }
  
  // Sort
  if (activeTab === 'history') {
    return [...filtered].sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  } else {
    return [...filtered].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }
}, [detailedSchedulesList, detailedAuditTypeFilter, activeTab, doesScheduleMatchFilter]);

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

  const getFilteredPendingCount = useCallback(() => {
    return detailedSchedulesList.filter(s => 
      (s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED') &&
      doesScheduleMatchFilter(s, detailedAuditTypeFilter)
    ).length;
  }, [detailedSchedulesList, detailedAuditTypeFilter, doesScheduleMatchFilter]);

  const getFilteredHistoryCount = useCallback(() => {
    return detailedSchedulesList.filter(s => 
      (s.detailedApprovalStatus === 'APPROVED' || s.detailedApprovalStatus === 'REJECTED') &&
      doesScheduleMatchFilter(s, detailedAuditTypeFilter)
    ).length;
  }, [detailedSchedulesList, detailedAuditTypeFilter, doesScheduleMatchFilter]);

  // Compact Plan Card Component
  const PlanSectionCard = ({ title, icon: Icon, color, pendingCount, plans, onViewPlan, formType }) => {
    const getFormTypeLabel = () => {
      switch(formType) {
        case 'annual': return 'Annual Plan';
        case 'dept': return 'Dept Plan';
        case 'week': return 'Week Schedule';
        case 'daily': return 'Daily Schedule';
        default: return 'Plan';
      }
    };

    return (
      <div className="overflow-hidden transition-shadow bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
        <div className={`px-4 py-3 border-b ${color.bg} ${color.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${color.text}`} />
              <h3 className="font-semibold text-gray-800">{title}</h3>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color.badge.bg} ${color.badge.text}`}>
              {pendingCount} Pending
            </span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
          {pendingCount === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <FiCheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending {getFormTypeLabel().toLowerCase()}s</p>
            </div>
          ) : (
            plans.slice(0, 4).map((plan, idx) => (
              <div key={idx} className="p-3 transition-colors cursor-pointer hover:bg-gray-50" onClick={() => onViewPlan(plan)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {plan.year ? `${getFormTypeLabel()} ${plan.year}` : 
                       plan.month ? `${monthDisplay[plan.month] || plan.month} ${plan.year}` : 
                       getFormTypeLabel()}
                    </p>
                    {plan.preparedBy && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        Prepared by: {plan.preparedBy}
                      </p>
                    )}
                    {plan.scheduleCount && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {plan.scheduleCount} schedule(s)
                      </p>
                    )}
                  </div>
                  <FiChevronRight className="flex-shrink-0 w-4 h-4 mt-1 text-gray-300" />
                </div>
              </div>
            ))
          )}
          {pendingCount > 4 && (
            <div className="p-2 text-center border-t border-gray-100">
              <button 
                onClick={() => onViewPlan(plans[0])}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                + {pendingCount - 4} more pending...
              </button>
            </div>
          )}
        </div>
        
        {pendingCount > 0 && (
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => onViewPlan(plans[0])}
              className="flex items-center justify-center w-full gap-1 text-xs font-medium text-center text-gray-600 hover:text-gray-800"
            >
              <FiEye className="w-3 h-3" /> View All ({pendingCount})
            </button>
          </div>
        )}
      </div>
    );
  };


  // NEW: Daily Schedule Card Component (doesn't affect other cards)
const DailyScheduleCard = ({ 
  title, 
  icon: Icon, 
  color, 
  pendingPlans, 
  approvedPlans, 
  onViewPlan, 
  onViewHistoryPlan 
}) => {
  const totalMonths = pendingPlans.length + approvedPlans.length;

  return (
    <div className="overflow-hidden transition-shadow bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
      <div className={`px-4 py-3 border-b ${color.bg} ${color.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${color.text}`} />
            <h3 className="font-semibold text-gray-800">{title}</h3>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color.badge.bg} ${color.badge.text}`}>
              {pendingPlans.length} Pending
            </span>
            {approvedPlans.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {approvedPlans.length} History
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
        {/* Show pending plans */}
        {pendingPlans.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <FiCheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending daily schedules</p>
          </div>
        ) : (
          pendingPlans.slice(0, 3).map((plan, idx) => (
            <div key={`pending-${plan.year}-${plan.month}`} className="p-3 transition-colors cursor-pointer hover:bg-gray-50" 
                 onClick={() => onViewPlan(plan, 'pending')}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {monthDisplay[plan.month] || plan.month} {plan.year}
                    {plan.isChangeRequested && (
                      <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                        Changes Requested
                      </span>
                    )}
                    {plan.pendingCount > 0 && !plan.isChangeRequested && (
                      <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                        {plan.pendingCount} pending
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    Prepared by: {plan.preparedBy || 'N/A'} â€¢ {plan.scheduleCount || 0} schedule(s)
                  </p>
                </div>
                <FiChevronRight className="flex-shrink-0 w-4 h-4 mt-1 text-gray-300" />
              </div>
            </div>
          ))
        )}
        
        {/* Show history/approved plans summary */}
        {approvedPlans.length > 0 && (
          <div className="px-3 py-2 bg-gray-50">
            <p className="text-xs font-medium text-gray-500">
              ðŸ“‹ {approvedPlans.length} month(s) with approved/history schedules
            </p>
          </div>
        )}
      </div>
      
      {/* ALWAYS SHOW VIEW ALL BUTTON when there are any plans */}
      {totalMonths > 0 && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => {
              if (pendingPlans.length > 0) {
                onViewPlan(pendingPlans[0], 'pending');
              } else if (approvedPlans.length > 0 && onViewHistoryPlan) {
                onViewHistoryPlan(approvedPlans[0], 'history');
              }
            }}
            className="flex items-center justify-center w-full gap-1 text-xs font-medium text-center text-teal-600 hover:text-teal-700"
          >
            <FiEye className="w-3 h-3" /> 
            View All ({totalMonths} months)
          </button>
        </div>
      )}
    </div>
  );
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiBarChart2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Top Management Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Review and approve audit plans</p>
              <p className="mt-1 text-xs text-gray-400">
                Logged in as: <span className="font-medium">{user?.name || user?.username}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
                const topManagement = allUsersList.find(u => u.role === 'TOP_MANAGEMENT');
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
                  hodEmail: availableAuditee?.email,
                  hodName: availableAuditee?.name,
                  memberEmails: [user?.email, availableAuditee?.email].filter(Boolean)
                });
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <FiMessageCircle className="w-4 h-4" /> Forum
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Audits Planned</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalAudits}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <FiCalendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Completed Audits</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedAudits}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <FiCheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
          <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">Plans Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.pendingApproval + stats.pendingDeptApproval + stats.pendingForm5Approval + stats.pendingDetailedApproval}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <FiSend className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>
          <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Completion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.overallCompletion}%</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <FiTrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Compact Pending Plans Grid - 2x2 Layout */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2">
          {/* Annual Audit Plans - Form 3 */}
          <PlanSectionCard
            title="Annual Audit Plans (Form 3)"
            icon={FiFileText}
            color={{
              bg: "bg-blue-50",
              border: "border-blue-100",
              text: "text-blue-600",
              badge: { bg: "bg-blue-100", text: "text-blue-700" }
            }}
            pendingCount={pendingPlans.length}
            plans={pendingPlans}
            onViewPlan={(plan) => handleViewPlan(plan)}
            formType="annual"
          />

          {/* Department Audit Plans - Form 4 */}
          <PlanSectionCard
            title="Department Audit Plans (Form 4)"
            icon={FiList}
            color={{
              bg: "bg-green-50",
              border: "border-green-100",
              text: "text-green-600",
              badge: { bg: "bg-green-100", text: "text-green-700" }
            }}
            pendingCount={pendingDeptPlans.length}
            plans={pendingDeptPlans}
            onViewPlan={(plan) => handleViewDeptPlan(plan)}
            formType="dept"
          />

          {/* Week Schedule Plans - Form 5 */}
          <PlanSectionCard
            title="Week Schedule Plans (Form 5)"
            icon={FiCalendarIcon}
            color={{
              bg: "bg-indigo-50",
              border: "border-indigo-100",
              text: "text-indigo-600",
              badge: { bg: "bg-indigo-100", text: "text-indigo-700" }
            }}
            pendingCount={pendingForm5Plans.length}
            plans={pendingForm5Plans}
            onViewPlan={(plan) => handleViewForm5Plan(plan)}
            formType="week"
          />

          {/* Daily Schedule Plans - Form 5 Detailed */}
          <DailyScheduleCard
            title="Daily Schedule Plans (Detailed)"
            icon={FiClock}
            color={{
              bg: "bg-teal-50",
              border: "border-teal-100",
              text: "text-teal-600",
              badge: { bg: "bg-teal-100", text: "text-teal-700" }
            }}
            pendingPlans={pendingDetailedPlans}
            approvedPlans={approvedDetailedPlans}
            onViewPlan={(plan, tab) => {
              console.log('Viewing plan with tab:', tab);
              handleViewDetailedPlan(plan, tab);
            }}
            onViewHistoryPlan={(plan, tab) => {
              console.log('Viewing history plan with tab:', tab);
              handleViewDetailedPlan(plan, tab || 'history');
            }}
          />
        </div>

        {/* Approved Plans Summary - Collapsible Section */}
        <div className="mb-8">
          <details className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <summary className="flex items-center gap-2 px-5 py-3 font-semibold text-gray-700 transition-colors cursor-pointer hover:bg-gray-50">
              <FiCheckCircle className="w-4 h-4 text-green-500" />
              Approved Plans Summary ({approvedPlans.length + approvedDeptPlans.length + approvedForm5Plans.length + approvedDetailedPlans.length})
              <span className="ml-2 text-xs text-gray-400">(Click to expand)</span>
            </summary>
            <div className="p-5 border-t border-gray-100">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Annual Plans ({approvedPlans.length})</h4>
                  {approvedPlans.length === 0 ? (
                    <p className="text-xs text-gray-400">No approved annual plans</p>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-32">
                      {approvedPlans.map(plan => (
                        <p key={plan.year} className="text-xs text-gray-600">
                          â€¢ {plan.year} - {plan.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Department Plans ({approvedDeptPlans.length})</h4>
                  {approvedDeptPlans.length === 0 ? (
                    <p className="text-xs text-gray-400">No approved department plans</p>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-32">
                      {approvedDeptPlans.map(plan => (
                        <p key={plan.year} className="text-xs text-gray-600">
                          â€¢ {plan.year} - {plan.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Week Schedules ({approvedForm5Plans.length})</h4>
                  {approvedForm5Plans.length === 0 ? (
                    <p className="text-xs text-gray-400">No approved week schedules</p>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-32">
                      {approvedForm5Plans.map(plan => (
                        <p key={`${plan.year}-${plan.month}`} className="text-xs text-gray-600">
                          â€¢ {monthDisplay[plan.month] || plan.month} {plan.year}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Daily Schedules ({approvedDetailedPlans.length})</h4>
                  {approvedDetailedPlans.length === 0 ? (
                    <p className="text-xs text-gray-400">No approved daily schedules</p>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-32">
                      {approvedDetailedPlans.map(plan => (
                        <p key={`${plan.year}-${plan.month}`} className="text-xs text-gray-600">
                          â€¢ {monthDisplay[plan.month] || plan.month} {plan.year} ({plan.scheduleCount} schedules)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Management Review</h3>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center justify-between w-full p-3 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100"
            >
              <span className="text-gray-700">View Audit Summary Report</span>
              <FiBarChart2 className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Audit Plans</h3>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/form3')}
                className="flex-1 p-3 text-center transition-colors rounded-lg bg-blue-50 hover:bg-blue-100"
              >
                <span className="text-sm text-blue-700">Annual Plan</span>
              </button>
              <button
                onClick={() => navigate('/form4')}
                className="flex-1 p-3 text-center transition-colors rounded-lg bg-green-50 hover:bg-green-100"
              >
                <span className="text-sm text-green-700">Dept Plan</span>
              </button>
              <button
                onClick={() => navigate('/form5')}
                className="flex-1 p-3 text-center transition-colors rounded-lg bg-indigo-50 hover:bg-indigo-100"
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
                âœ•
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
                      let teamAuditorNames = [];
                     
                      if (schedule.teamAuditorNames) {
                        if (typeof schedule.teamAuditorNames === 'string') {
                          try {
                            teamAuditorNames = JSON.parse(schedule.teamAuditorNames);
                          } catch(e) {
                            teamAuditorNames = [];
                          }
                        } else if (Array.isArray(schedule.teamAuditorNames)) {
                          teamAuditorNames = schedule.teamAuditorNames;
                        }
                      }
                     
                      if (teamAuditorNames.length === 0 && schedule.coAuditorNames) {
                        if (typeof schedule.coAuditorNames === 'string') {
                          try {
                            teamAuditorNames = JSON.parse(schedule.coAuditorNames);
                          } catch(e) {
                            teamAuditorNames = [];
                          }
                        } else if (Array.isArray(schedule.coAuditorNames)) {
                          teamAuditorNames = schedule.coAuditorNames;
                        }
                      }
                     
                      let auditeeNames = [];
                      if (schedule.auditeeNames) {
                        if (typeof schedule.auditeeNames === 'string') {
                          try {
                            auditeeNames = JSON.parse(schedule.auditeeNames);
                          } catch(e) {
                            auditeeNames = [schedule.auditeeNames];
                          }
                        } else if (Array.isArray(schedule.auditeeNames)) {
                          auditeeNames = schedule.auditeeNames;
                        }
                      } else if (schedule.auditeeName) {
                        auditeeNames = [schedule.auditeeName];
                      }
                     
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

     {/* Form 5 Detailed Daily Schedule Modal with Tabs and Month Navigation */}
      {showDetailedDetails && selectedDetailedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            {/* Header with Month Info */}
            <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold">
                  Daily Schedule - {monthDisplay[selectedDetailedPlan.month]} {selectedDetailedPlan.year}
                </h3>
                {selectedDetailedPlan.leadAuditorName && (
                  <p className="mt-1 text-sm text-gray-500">Lead Auditor: {selectedDetailedPlan.leadAuditorName}</p>
                )}
                <p className="text-sm text-gray-500">Prepared by: {selectedDetailedPlan.preparedBy || 'N/A'}</p>
              </div>
              <button onClick={() => setShowDetailedDetails(false)} className="p-2 rounded-lg hover:bg-gray-100">
                âœ•
              </button>
            </div>
            
            <div className="p-6">
              {/* Tabs with Month Navigation Integrated */}
              <div className="mb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
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
                  
                  {/* Month Navigation - Placed near tabs with larger size */}
                  {allMonthlyPlans.length > 1 && (
                    <div className="flex items-center gap-3 px-3 py-1 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => navigateToMonth(-1)}
                        disabled={currentMonthIndex === 0}
                        className="flex items-center justify-center w-8 h-8 text-lg font-bold transition-colors bg-white rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Previous Month"
                      >
                        â—€
                      </button>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-700">
                          {monthDisplay[allMonthlyPlans[currentMonthIndex]?.month]} {allMonthlyPlans[currentMonthIndex]?.year}
                        </div>
                        <div className="text-xs text-gray-500">
                          {currentMonthIndex + 1} of {allMonthlyPlans.length}
                        </div>
                      </div>
                      <button
                        onClick={() => navigateToMonth(1)}
                        disabled={currentMonthIndex === allMonthlyPlans.length - 1}
                        className="flex items-center justify-center w-8 h-8 text-lg font-bold transition-colors bg-white rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Next Month"
                      >
                        â–¶
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Summary & Filter */}
              <div className="flex flex-col justify-between gap-4 p-3 mb-4 rounded-lg bg-gray-50 md:flex-row md:items-center">
                <div className="flex-1">
                  <p className="mb-2 text-xs font-medium text-gray-600">Schedule Status Summary:</p>
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
                            <span className="px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded-full">
                              {pendingCount} Pending
                            </span>
                          )}
                          {approvedCount > 0 && (
                            <span className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full">
                              {approvedCount} Approved
                            </span>
                          )}
                          {rejectedCount > 0 && (
                            <span className="px-2 py-1 text-xs text-red-700 bg-red-100 rounded-full">
                              {rejectedCount} Rejected
                            </span>
                          )}
                          {changeRequestedCount > 0 && (
                            <span className="px-2 py-1 text-xs text-orange-700 bg-orange-100 rounded-full">
                              {changeRequestedCount} Changes Requested
                            </span>
                          )}
                          {draftCount > 0 && (
                            <span className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full">
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

              {/* Schedule Table - Keep existing table code */}
              <div className="mb-6 overflow-x-auto">
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
                      <th className="px-3 py-2 text-center border">Actions</th>
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
                          <td className="px-3 py-2 border">
                            {schedule.fromDate && schedule.toDate && schedule.fromDate !== schedule.toDate ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-purple-600">ðŸ“…</span>
                                  <span className="text-xs font-semibold text-gray-700">Date Range:</span>
                                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Flexible</span>
                                </div>
                                <div className="text-xs font-medium text-gray-600 mt-0.5">
                                  {schedule.fromDate} â†’ {schedule.toDate}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  Can be completed any day in this range
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm">{schedule.scheduledDate || schedule.date}</div>
                            )}
                          </td>
                          
                          <td className="px-3 py-2 border">
                            <div className="text-sm">{schedule.startTime} - {schedule.endTime}</div>
                            {schedule.fromDate && schedule.toDate && schedule.fromDate !== schedule.toDate && (
                              <div className="text-[10px] text-purple-500 mt-0.5">(Any day in range)</div>
                            )}
                          </td>
                          
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
                                  <span className="text-xs text-gray-400">
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
                          <td className="px-3 py-2 text-center border">
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
                                <span className="text-xs font-medium text-green-600">Approved</span>
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
                <div className="p-4 mb-4 border rounded-lg bg-amber-50 border-amber-200">
                  <p className="flex items-center gap-2 mb-2 text-sm text-amber-800">
                    <FiInfo className="w-4 h-4" />
                    Bulk Actions: {getFilteredPendingCount()} pending schedule(s) 
                    {detailedAuditTypeFilter ? ` for audit type "${detailedAuditTypeFilter}"` : ' (all audit types)'}
                  </p>
                  <div className="mb-3">
                    <label className="block mb-1 text-sm font-medium text-gray-700">Comments / Reason (Optional for approve, required for reject)</label>
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
                      className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      <FiX className="w-4 h-4" /> Reject All Pending
                    </button>
                    <button
                      onClick={handleBulkApproveByAuditType}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCheckSquare className="w-4 h-4" />}
                      Approve All Pending
                    </button>
                  </div>
                </div>
              )}
              
              {/* History info section */}
              {activeTab === 'history' && getFilteredHistoryCount() > 0 && (
                <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
                  <p className="flex items-center gap-2 text-sm text-blue-700">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">Reject Week Schedule</h3>
            <p className="mb-4 text-sm text-gray-600">Please provide a reason for rejection:</p>
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
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailedRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">
              Reject {getFilteredPendingCount()} Pending Schedule(s)
              {detailedAuditTypeFilter && ` for "${detailedAuditTypeFilter}"`}
            </h3>
            <p className="mb-4 text-sm text-gray-600">Please provide a reason for rejection:</p>
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
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Schedule Reject Modal */}
      {showScheduleRejectModal && selectedScheduleForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">
              Reject Schedule for {selectedScheduleForAction.scheduledDate}
            </h3>
            <p className="mb-4 text-sm text-gray-600">Please provide a reason for rejection:</p>
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
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && selectedScheduleForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">
              Request Changes for {selectedScheduleForAction.scheduledDate}
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
                  setSelectedScheduleForAction(null);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestChangesForSchedule(selectedScheduleForAction)}
                disabled={submitting}
                className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
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
          memberEmails={selectedAuditForForum.memberEmails || []}
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