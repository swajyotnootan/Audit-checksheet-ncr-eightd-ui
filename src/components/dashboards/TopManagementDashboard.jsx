import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBarChart2, FiCheckCircle, FiAlertCircle, FiTrendingUp,
  FiEye, FiClock, FiCalendar, FiFileText, FiSend, FiList,
  FiUsers, FiCalendar as FiCalendarIcon, FiX, FiCheck,
  FiSunrise, FiSunset, FiCoffee, FiFilter, FiRefreshCw,
  FiInfo, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiCheckSquare, FiMessageCircle,
  FiArchive, FiActivity, FiUserCheck, FiUserX, FiClock as FiClockIcon,
  FiChevronRight, FiGrid
} from 'react-icons/fi';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import PlanDetailsModal from '../modals/PlanDetailsModal';
import DeptPlanDetailsModal from '../modals/DeptPlanDetailsModal';
import RejectModal from '../modals/RejectModal';
import { auditScheduleApi } from '../../services/auditScheduleApi';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ============================================================================
// COLOR PALETTE & ANIMATIONS (Matching Audit Manager Dashboard)
// ============================================================================
const NAVBAR_COLORS = {
  primary: '#00529B',
  secondary: '#3b82f6',
  dark: '#1e3a8a',
  light: '#60a5fa',
  lighter: '#93c5fd',
  bg: '#eff6ff',
  white: '#ffffff',
};

const animationStyles = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeInUp {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out forwards;
  opacity: 0;
}
.animate-scaleIn {
  animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
.card-hover {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-hover:hover {
  transform: translateY(-6px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}
.stat-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}
`;

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================
const Sidebar = ({ activeView, setActiveView, isOpen }) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: <FiGrid className="w-5 h-5" /> },
    { id: 'annual', label: 'Annual Plan (Form 3)', icon: <FiFileText className="w-5 h-5" /> },
    { id: 'dept', label: 'Dept Plan (Form 4)', icon: <FiList className="w-5 h-5" /> },
    { id: 'week', label: 'Week Schedule (Form 5)', icon: <FiCalendarIcon className="w-5 h-5" /> },
    { id: 'daily', label: 'Daily Schedule', icon: <FiClock className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={`
        fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)]
        bg-white border-r border-slate-200 shadow-md
        transition-all duration-500 ease-out overflow-hidden flex flex-col
        ${isOpen ? 'w-64' : 'w-0 border-r-0'}
      `}
    >
      <div className="flex-shrink-0 p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl"
            style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)` }}
          >
            <FiBarChart2 className="w-5 h-5 text-white" />
          </div>
          <div className={`${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300`}>
            <h2 className="text-base font-bold leading-tight text-slate-800">Top Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">Approval Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              transition-all duration-300 group relative animate-fadeInUp
              ${activeView === item.id ? 'text-white font-semibold shadow-md' : 'text-slate-600 hover:bg-slate-50'}
            `}
            style={{
              animationDelay: `${index * 0.1}s`,
              ...(activeView === item.id ? {
                background: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)`,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              } : {})
            }}
          >
            <div className={`flex-shrink-0 ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {item.icon}
            </div>
            <span className={`whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 text-sm`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="flex-shrink-0 p-4 border-t border-slate-100">
        <div className="p-4 border rounded-xl" style={{ background: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
          <p className="text-xs font-semibold" style={{ color: NAVBAR_COLORS.dark }}>Management Review</p>
          <p className="mt-1 text-xs" style={{ color: NAVBAR_COLORS.secondary }}>Oversee audit approvals</p>
        </div>
      </div>
    </aside>
  );
};

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================
const KpiCard = ({ title, value, icon, color, delay = 0 }) => {
  return (
    <div
      className="p-6 bg-white border shadow-sm stat-card border-slate-200 rounded-2xl animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: color.bg }}>
          <div style={{ color: color.text }}>{icon}</div>
        </div>
      </div>
      <p className="mb-1 text-3xl font-bold tracking-tight text-slate-800">{value}</p>
      <p className="text-xs font-medium tracking-wide uppercase text-slate-500">{title}</p>
    </div>
  );
};

const TopManagementDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [activeView, setActiveView] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  
  const [allMonthlyPlans, setAllMonthlyPlans] = useState([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  const [stats, setStats] = useState({
    totalAudits: 0, completedAudits: 0, pendingApproval: 0, approvedPlans: 0,
    pendingDeptApproval: 0, approvedDeptPlans: 0, pendingForm5Approval: 0,
    approvedForm5Plans: 0, pendingDetailedApproval: 0, approvedDetailedPlans: 0,
    overallCompletion: 0
  });

  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  const auditElementsMap = {
    "System Audit (ISO9001)": "A", "System Audit (IATF16949)": "B",
    "5S Audit": "C", "Process Audit": "D", "Product Audit": "E"
  };

  const doesScheduleMatchFilter = useCallback((schedule, filterValue) => {
    if (!filterValue || filterValue.trim() === '') return true;
    const normalizedFilter = filterValue.toLowerCase().trim();
    if (schedule.auditType && schedule.auditType.toLowerCase().includes(normalizedFilter)) return true;
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

  const getStatusBadge = (status, type = 'approval') => {
    if (type === 'approval') {
      switch (status) {
        case 'APPROVED': return <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
        case 'REJECTED': return <span className="flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-100 rounded-full"><FiX className="w-3 h-3" /> Rejected</span>;
        case 'PENDING_APPROVAL': return <span className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded-full"><FiClock className="w-3 h-3" /> Pending</span>;
        case 'CHANGE_REQUESTED': return <span className="flex items-center gap-1 px-2 py-1 text-xs text-orange-700 bg-orange-100 rounded-full"><FiMessageSquare className="w-3 h-3" /> Changes Requested</span>;
        default: return <span className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full">Draft</span>;
      }
    }
    return status;
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      setAllUsersList(response.data || []);
    } catch (error) { setAllUsersList([]); }
  };

  // Fetch Annual Plans (Form 3)
  const fetchAnnualPlans = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);
      let allPlans = [];
      for (const year of years) {
        try {
          const response = await axios.get(`${API_BASE}/audit-plan/${year}`, { withCredentials: true });
          if (response.data && response.data.planItems && response.data.planItems.length > 0) {
            allPlans.push({ year: year, ...response.data });
          }
        } catch (err) {}
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
      for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);
      let allDeptPlans = [];
      for (const year of years) {
        try {
          const response = await axios.get(`${API_BASE}/department-plan/${year}`, { withCredentials: true });
          if (response.data && response.data.planItems && response.data.planItems.length > 0) {
            allDeptPlans.push({ year: year, ...response.data });
          }
        } catch (err) {}
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
      for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);
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
                  year: year, month: month,
                  approvalStatus: schedule.approvalStatus || 'DRAFT',
                  preparedBy: schedule.preparedByName,
                  approvedBy: schedule.approvedByName,
                  approvedAt: schedule.approvedAt,
                  rejectionReason: schedule.rejectionReason,
                  leadAuditorId: schedule.leadAuditorId,
                  leadAuditorName: schedule.leadAuditorName,
                  scheduleCount: 0, schedules: []
                });
              }
              const monthData = monthMap.get(month);
              monthData.scheduleCount++;
              monthData.schedules.push(schedule);
            });
            for (const [month, monthData] of monthMap) {
              if (monthData.approvalStatus === 'PENDING_APPROVAL') allPendingApprovals.push(monthData);
              else if (monthData.approvalStatus === 'APPROVED') allApproved.push(monthData);
            }
          }
        } catch (err) {}
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
      for (let i = currentYear - 5; i <= currentYear + 2; i++) years.push(i);      
      let allDailySchedules = [];
      for (const year of years) {
        for (const month of ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']) {
          try {
            const response = await auditScheduleApi.getDateSchedulesByMonth(year, month);
            const schedules = response.data || [];
            schedules.forEach(schedule => {
              schedule.planYear = year;
              schedule.month = month;
              if (!schedule.preparedByName && schedule.preparedBy) schedule.preparedByName = schedule.preparedBy;
              if (!schedule.approvedByName && schedule.approvedBy) schedule.approvedByName = schedule.approvedBy;
              if (!schedule.detailedApprovalStatus && schedule.approvalStatus) schedule.detailedApprovalStatus = schedule.approvalStatus;
            });
            allDailySchedules.push(...schedules);
          } catch (err) {}
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
            year: year, month: month,
            preparedBySet: new Set(), approvedBySet: new Set(),
            approvedAt: null, leadAuditorName: schedule.leadAuditorName,
            schedules: []
          });
        }
        const monthData = monthMap.get(key);
        if (schedule.preparedBy && schedule.preparedBy !== 'N/A' && schedule.preparedBy !== 'null') monthData.preparedBySet.add(schedule.preparedBy);
        else if (schedule.preparedByName && schedule.preparedByName !== 'N/A') monthData.preparedBySet.add(schedule.preparedByName);
        
        if (schedule.approvedBy && schedule.approvedBy !== 'N/A' && schedule.approvedBy !== 'null') monthData.approvedBySet.add(schedule.approvedBy);
        else if (schedule.approvedByName && schedule.approvedByName !== 'N/A') monthData.approvedBySet.add(schedule.approvedByName);
        
        const approvalDate = schedule.approvedAt || schedule.approvedDate;
        if (approvalDate && (!monthData.approvedAt || new Date(approvalDate) > new Date(monthData.approvedAt))) monthData.approvedAt = approvalDate;
        monthData.schedules.push(schedule);
      });
      
      const pendingMonths = [];
      const approvedMonths = [];
      const rejectedMonths = [];
      for (const [key, monthData] of monthMap) {
        const schedules = monthData.schedules;
        const uniquePreparedBy = Array.from(monthData.preparedBySet);
        const uniqueApprovedBy = Array.from(monthData.approvedBySet);
        monthData.displayPreparedBy = uniquePreparedBy.length > 0 ? uniquePreparedBy.join(', ') : 'Not available';
        monthData.displayApprovedBy = uniqueApprovedBy.length > 0 ? uniqueApprovedBy.join(', ') : 'Not approved yet';
        
        const getStatus = (schedule) => schedule.detailedApprovalStatus || schedule.approvalStatus || 'DRAFT';
        const allApproved = schedules.length > 0 && schedules.every(s => getStatus(s) === 'APPROVED');
        const hasPending = schedules.some(s => getStatus(s) === 'PENDING_APPROVAL');
        const hasChangeRequested = schedules.some(s => getStatus(s) === 'CHANGE_REQUESTED');
        const hasRejected = schedules.some(s => getStatus(s) === 'REJECTED');
        
        if (hasPending || hasChangeRequested) {
          pendingMonths.push({
            ...monthData,
            preparedBy: monthData.displayPreparedBy, approvedBy: monthData.displayApprovedBy,
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
            preparedBy: monthData.displayPreparedBy, approvedBy: monthData.displayApprovedBy,
            scheduleCount: schedules.length, approvedCount: schedules.length,
            approvedAt: monthData.approvedAt, schedules: schedules
          });
        } else if (hasRejected) {
          rejectedMonths.push({
            ...monthData,
            preparedBy: monthData.displayPreparedBy, approvedBy: monthData.displayApprovedBy,
            scheduleCount: schedules.length,
            rejectedCount: schedules.filter(s => getStatus(s) === 'REJECTED').length,
            approvedCount: schedules.filter(s => getStatus(s) === 'APPROVED').length,
            schedules: schedules
          });
        }
      }
      setPendingDetailedPlans(pendingMonths);
      setApprovedDetailedPlans([...approvedMonths, ...rejectedMonths]);
      return { pendingCount: pendingMonths.length, approvedCount: approvedMonths.length + rejectedMonths.length };
    } catch (error) {
      console.error('Error fetching detailed plans:', error);
      return { pendingCount: 0, approvedCount: 0 };
    }
  }, []);

  const refreshDetailedSchedulesData = useCallback(async () => {
    try {
      const result = await fetchDetailedPlans();
      if (showDetailedDetails && selectedDetailedPlan) {
        const updatedPendingMonths = [...pendingDetailedPlans];
        const updatedApprovedMonths = [...approvedDetailedPlans];
        let found = false;
        for (let i = 0; i < updatedPendingMonths.length; i++) {
          if (updatedPendingMonths[i].month === selectedDetailedPlan.month && updatedPendingMonths[i].year === selectedDetailedPlan.year) {
            updatedPendingMonths[i] = { ...updatedPendingMonths[i], schedules: updatedPendingMonths[i].schedules.map(s => allDetailedSchedules.find(a => a.id === s.id) || s) };
            setDetailedSchedulesList(updatedPendingMonths[i].schedules);
            found = true; break;
          }
        }
        if (!found) {
          for (let i = 0; i < updatedApprovedMonths.length; i++) {
            if (updatedApprovedMonths[i].month === selectedDetailedPlan.month && updatedApprovedMonths[i].year === selectedDetailedPlan.year) {
              setDetailedSchedulesList(updatedApprovedMonths[i].schedules); break;
            }
          }
        }
      }
      return result;
    } catch (error) { return null; }
  }, [fetchDetailedPlans, showDetailedDetails, selectedDetailedPlan, pendingDetailedPlans, approvedDetailedPlans, allDetailedSchedules]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [annualStats, deptStats, form5Stats, detailedStats] = await Promise.all([
        fetchAnnualPlans(), fetchDepartmentPlans(), fetchForm5Plans(), fetchDetailedPlans()
      ]);
      setStats({
        totalAudits: annualStats.totalPlanned, completedAudits: annualStats.totalCompleted,
        pendingApproval: pendingPlans.length, approvedPlans: approvedPlans.length,
        pendingDeptApproval: pendingDeptPlans.length, approvedDeptPlans: approvedDeptPlans.length,
        pendingForm5Approval: pendingForm5Plans.length, approvedForm5Plans: approvedForm5Plans.length,
        pendingDetailedApproval: detailedStats.pendingCount, approvedDetailedPlans: detailedStats.approvedCount,
        overallCompletion: annualStats.totalPlanned > 0 ? ((annualStats.totalCompleted / annualStats.totalPlanned) * 100).toFixed(1) : 0
      });
    } catch (error) {
      addToast('Failed to load dashboard data', 'error');
    } finally { setLoading(false); }
  };

  const openAuditForum = (auditData) => {
    const memberEmails = [];
    if (user?.email) memberEmails.push(user.email);
    if (auditData.auditorId) { const auditor = allUsersList.find(u => u.id === auditData.auditorId); if (auditor?.email) memberEmails.push(auditor.email); }
    if (auditData.auditeeId) { const auditee = allUsersList.find(u => u.id === auditData.auditeeId); if (auditee?.email) memberEmails.push(auditee.email); }
    if (auditData.hodEmail) memberEmails.push(auditData.hodEmail);
    if (auditData.memberEmails) memberEmails.push(...auditData.memberEmails);
    setSelectedAuditForForum({ ...auditData, memberEmails: [...new Set(memberEmails)] });
    setShowForumModal(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    addToast('Dashboard refreshed', 'success');
  };

  useEffect(() => { fetchDashboardData(); fetchAllUsers(); }, []);

  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggle-top-management-sidebar', handleToggleSidebar);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('toggle-top-management-sidebar', handleToggleSidebar);
    };
  }, []);
  

  useEffect(() => {
    if (showDetailedDetails && selectedDetailedPlan) {
      const hasPendingSchedules = detailedSchedulesList.some(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED');
      if (!hasPendingSchedules && activeTab === 'pending') setActiveTab('history');
    }
  }, [showDetailedDetails, detailedSchedulesList, selectedDetailedPlan, activeTab]);

  useEffect(() => {
    if (showDetailedDetails && selectedDetailedPlan) setDetailedSchedulesList(selectedDetailedPlan.schedules || []);
  }, [selectedDetailedPlan, showDetailedDetails]);

  // ========== Handlers ==========
  const handleViewPlan = (plan) => { setSelectedPlan(plan); setPlanApprovalComment(''); setPlanRejectionReason(''); setShowPlanDetails(true); };
  const handleApprovePlan = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedPlan.year}/approve?userId=${user?.id}`, { comments: planApprovalComment }, { withCredentials: true });
      addToast(`Annual Audit Plan ${selectedPlan.year} approved successfully!`, 'success');
      setShowPlanDetails(false); setSelectedPlan(null); setPlanApprovalComment(''); fetchDashboardData();
    } catch (error) { addToast('Failed to approve plan', 'error'); } finally { setSubmitting(false); }
  };
  const handleRejectPlan = async () => {
    if (!planRejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedPlan.year}/reject?userId=${user?.id}`, { reason: planRejectionReason }, { withCredentials: true });
      addToast(`Annual Audit Plan ${selectedPlan.year} rejected`, 'error');
      setShowPlanRejectModal(false); setShowPlanDetails(false); setSelectedPlan(null); setPlanRejectionReason(''); fetchDashboardData();
    } catch (error) { addToast('Failed to reject plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleViewDeptPlan = (plan) => { setSelectedDeptPlan(plan); setDeptApprovalComment(''); setDeptRejectionReason(''); setShowDeptPlanDetails(true); };
  const handleApproveDeptPlan = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedDeptPlan.year}/approve?userId=${user?.id}`, { comments: deptApprovalComment }, { withCredentials: true });
      addToast(`Department Audit Plan ${selectedDeptPlan.year} approved successfully!`, 'success');
      setShowDeptPlanDetails(false); setSelectedDeptPlan(null); setDeptApprovalComment(''); fetchDashboardData();
    } catch (error) { addToast('Failed to approve department plan', 'error'); } finally { setSubmitting(false); }
  };
  const handleRejectDeptPlan = async () => {
    if (!deptRejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedDeptPlan.year}/reject?userId=${user?.id}`, { reason: deptRejectionReason }, { withCredentials: true });
      addToast(`Department Audit Plan ${selectedDeptPlan.year} rejected`, 'error');
      setShowDeptRejectModal(false); setShowDeptPlanDetails(false); setSelectedDeptPlan(null); setDeptRejectionReason(''); fetchDashboardData();
    } catch (error) { addToast('Failed to reject department plan', 'error'); } finally { setSubmitting(false); }
  };

  const handleViewForm5Plan = (plan) => { setSelectedForm5Plan(plan); setForm5SchedulesDetail(plan.schedules || []); setForm5ApprovalComment(''); setForm5RejectionReason(''); setShowForm5Details(true); };
  const handleApproveForm5Plan = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/approve?userId=${user?.id}`, { comments: form5ApprovalComment }, { withCredentials: true });
      addToast(`Week Schedule for ${selectedForm5Plan.month} approved successfully!`, 'success');
      setShowForm5Details(false); setSelectedForm5Plan(null); setForm5ApprovalComment(''); fetchDashboardData();
    } catch (error) { addToast('Failed to approve week schedule', 'error'); } finally { setSubmitting(false); }
  };
  const handleRejectForm5Plan = async () => {
    if (!form5RejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/reject?userId=${user?.id}`, { reason: form5RejectionReason }, { withCredentials: true });
      addToast(`Week Schedule for ${selectedForm5Plan.month} rejected`, 'error');
      setShowForm5RejectModal(false); setShowForm5Details(false); setSelectedForm5Plan(null); setForm5RejectionReason(''); fetchDashboardData();
    } catch (error) { addToast('Failed to reject week schedule', 'error'); } finally { setSubmitting(false); }
  };

  const handleViewDetailedPlan = (plan, tab = 'pending') => {
    setSelectedDetailedPlan(plan);
    setDetailedSchedulesList(plan.schedules || []);
    const allMonths = [...pendingDetailedPlans, ...approvedDetailedPlans];
    setAllMonthlyPlans(allMonths);
    setCurrentMonthIndex(allMonths.findIndex(m => m.year === plan.year && m.month === plan.month) || 0);
    const hasPendingSchedules = plan.schedules.some(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED');
    setActiveTab(!hasPendingSchedules ? 'history' : tab);
    setDetailedApprovalComment(''); setDetailedRejectionReason(''); setDetailedAuditTypeFilter(''); setShowDetailedDetails(true);
  };

  const navigateToMonth = (direction) => {
    const newIndex = currentMonthIndex + direction;
    if (newIndex >= 0 && newIndex < allMonthlyPlans.length) {
      const newPlan = allMonthlyPlans[newIndex];
      setCurrentMonthIndex(newIndex); setSelectedDetailedPlan(newPlan); setDetailedSchedulesList(newPlan.schedules || []);
      const hasPendingSchedules = newPlan.schedules.some(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED');
      if (!hasPendingSchedules && activeTab === 'pending') setActiveTab('history');
    }
  };

  const handleRequestAnnualPlanChanges = async () => {
    if (!changeRequestReason.trim()) { addToast('Please provide a reason for changes', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedPlanForChange.year}/request-changes?userId=${user?.id}`, { reason: changeRequestReason }, { withCredentials: true });
      addToast(`Change request submitted for Annual Plan ${selectedPlanForChange.year}`, 'warning');
      setShowChangeRequestModal(false); setChangeRequestReason(''); setSelectedPlanForChange(null); await fetchDashboardData();
    } catch (error) { addToast('Failed to submit change request', 'error'); } finally { setSubmitting(false); }
  };

  const handleRequestDeptPlanChanges = async () => {
    if (!changeRequestReason.trim()) { addToast('Please provide a reason for changes', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedPlanForChange.year}/request-changes?userId=${user?.id}`, { reason: changeRequestReason }, { withCredentials: true });
      addToast(`Change request submitted for Department Plan ${selectedPlanForChange.year}`, 'warning');
      setShowChangeRequestModal(false); setChangeRequestReason(''); setSelectedPlanForChange(null); await fetchDashboardData();
    } catch (error) { addToast('Failed to submit change request', 'error'); } finally { setSubmitting(false); }
  };

  const handleApproveSingleSchedule = async (schedule) => {
    if (!window.confirm(`Approve schedule for ${schedule.scheduledDate}?`)) return;
    setSubmitting(true);
    try { await auditScheduleApi.approveSchedule(schedule.id, user?.id, detailedApprovalComment); addToast(`Schedule approved!`, 'success'); } 
    catch (error) { addToast(`Warning: Backend error but updating UI locally.`, 'warning'); }
    
    setDetailedSchedulesList(prevList => {
      const updatedList = prevList.map(s => s.id === schedule.id ? { ...s, detailedApprovalStatus: 'APPROVED', approvedByName: user?.name || user?.username, approvedBy: user?.name || user?.username, approvedAt: new Date().toISOString(), approvedDate: new Date().toISOString() } : s);
      return activeTab === 'pending' ? updatedList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED') : updatedList;
    });
    setAllDetailedSchedules(prevList => prevList.map(s => s.id === schedule.id ? { ...s, detailedApprovalStatus: 'APPROVED', approvedByName: user?.name || user?.username, approvedBy: user?.name || user?.username, approvedAt: new Date().toISOString() } : s));
    
    if (selectedDetailedPlan) {
      const updatedSchedules = selectedDetailedPlan.schedules.map(s => s.id === schedule.id ? { ...s, detailedApprovalStatus: 'APPROVED', approvedByName: user?.name || user?.username, approvedBy: user?.name || user?.username, approvedAt: new Date().toISOString() } : s);
      const newPendingCount = updatedSchedules.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL').length;
      const newChangeRequestedCount = updatedSchedules.filter(s => s.detailedApprovalStatus === 'CHANGE_REQUESTED').length;
      setSelectedDetailedPlan({ ...selectedDetailedPlan, schedules: updatedSchedules, pendingCount: newPendingCount, changeRequestedCount: newChangeRequestedCount });
      setPendingDetailedPlans(prev => prev.map(plan => plan.year === selectedDetailedPlan.year && plan.month === selectedDetailedPlan.month ? { ...plan, pendingCount: newPendingCount, changeRequestedCount: newChangeRequestedCount } : plan).filter(plan => plan.pendingCount > 0 || plan.changeRequestedCount > 0));
      if (newPendingCount === 0 && newChangeRequestedCount === 0) {
        setApprovedDetailedPlans(prev => prev.some(p => p.year === selectedDetailedPlan.year && p.month === selectedDetailedPlan.month) ? prev : [...prev, { ...selectedDetailedPlan, schedules: updatedSchedules, pendingCount: 0, changeRequestedCount: 0 }]);
      }
    }
    if (detailedSchedulesList.filter(s => s.id !== schedule.id && (s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED')).length === 0 && activeTab === 'pending') setActiveTab('history');
    setTimeout(() => fetchDetailedPlans(), 1000);
    setSubmitting(false);
  };

  const handleRejectSingleSchedule = async () => {
    if (!selectedScheduleForAction || !detailedRejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectSchedule(selectedScheduleForAction.id, user?.id, detailedRejectionReason);
      addToast(`Schedule rejected`, 'error');
      setDetailedSchedulesList(prevList => prevList.map(s => s.id === selectedScheduleForAction.id ? { ...s, detailedApprovalStatus: 'REJECTED', detailedRejectionReason: detailedRejectionReason, approvedByName: null, approvedBy: null } : s));
      setAllDetailedSchedules(prevList => prevList.map(s => s.id === selectedScheduleForAction.id ? { ...s, detailedApprovalStatus: 'REJECTED', detailedRejectionReason: detailedRejectionReason, approvedByName: null, approvedBy: null } : s));
      refreshDetailedSchedulesData(); setShowScheduleRejectModal(false); setDetailedRejectionReason(''); setSelectedScheduleForAction(null);
    } catch (error) { addToast('Failed to reject schedule', 'error'); } finally { setSubmitting(false); }
  };

  const handleRequestChangesForSchedule = async (schedule) => {
    if (!changeRequestReason.trim()) { addToast('Please provide a reason for change request', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-schedule/detailed/${schedule.planYear}/${schedule.month}/request-changes?userId=${user?.id}`, { reason: changeRequestReason }, { withCredentials: true });
      addToast(`Change requested`, 'warning');
      setDetailedSchedulesList(prevList => prevList.map(s => s.id === schedule.id ? { ...s, detailedApprovalStatus: 'CHANGE_REQUESTED', detailedRejectionReason: changeRequestReason } : s));
      setAllDetailedSchedules(prevList => prevList.map(s => s.id === schedule.id ? { ...s, detailedApprovalStatus: 'CHANGE_REQUESTED', detailedRejectionReason: changeRequestReason } : s));
      refreshDetailedSchedulesData(); setShowChangeRequestModal(false); setChangeRequestReason(''); setSelectedScheduleForAction(null);
    } catch (error) { addToast('Failed to request changes', 'error'); } finally { setSubmitting(false); }
  };

  const handleBulkApproveByAuditType = async () => {
    const pendingSchedules = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' && doesScheduleMatchFilter(s, detailedAuditTypeFilter));
    if (pendingSchedules.length === 0) { addToast(`No pending schedules to approve`, 'warning'); return; }
    if (!window.confirm(`Approve ${pendingSchedules.length} pending schedule(s)?`)) return;
    setSubmitting(true);
    const approvedIds = new Set(pendingSchedules.map(s => s.id));
    for (const schedule of pendingSchedules) {
      try { await axios.post(`${API_BASE}/audit-schedule/schedule/${schedule.id}/approve?userId=${user?.id}`, { comments: detailedApprovalComment }, { withCredentials: true }); } catch (error) {}
    }
    setDetailedSchedulesList(prevList => {
      const updatedList = prevList.map(schedule => approvedIds.has(schedule.id) ? { ...schedule, detailedApprovalStatus: 'APPROVED', approvedByName: user?.name || user?.username, approvedBy: user?.name || user?.username, approvedAt: new Date().toISOString(), approvedDate: new Date().toISOString() } : schedule);
      return activeTab === 'pending' ? updatedList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED') : updatedList;
    });
    setAllDetailedSchedules(prevList => prevList.map(schedule => approvedIds.has(schedule.id) ? { ...schedule, detailedApprovalStatus: 'APPROVED', approvedByName: user?.name || user?.username, approvedBy: user?.name || user?.username, approvedAt: new Date().toISOString() } : schedule));
    if (selectedDetailedPlan) {
      const updatedSchedules = selectedDetailedPlan.schedules.map(s => approvedIds.has(s.id) ? { ...s, detailedApprovalStatus: 'APPROVED', approvedByName: user?.name || user?.username, approvedBy: user?.name || user?.username, approvedAt: new Date().toISOString() } : s);
      const newPendingCount = updatedSchedules.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL').length;
      const newChangeRequestedCount = updatedSchedules.filter(s => s.detailedApprovalStatus === 'CHANGE_REQUESTED').length;
      setSelectedDetailedPlan({ ...selectedDetailedPlan, schedules: updatedSchedules, pendingCount: newPendingCount, changeRequestedCount: newChangeRequestedCount });
    }
    addToast(`${pendingSchedules.length} schedule(s) approved!`, 'success'); setDetailedApprovalComment('');
    if (detailedSchedulesList.filter(s => !approvedIds.has(s.id) && (s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED')).length === 0 && activeTab === 'pending') setActiveTab('history');
    setTimeout(() => fetchDetailedPlans(), 2000); setSubmitting(false);
  };

  const handleBulkRejectByAuditType = async () => {
    if (!detailedRejectionReason.trim()) { addToast('Please provide a rejection reason', 'error'); return; }
    const pendingSchedules = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' && doesScheduleMatchFilter(s, detailedAuditTypeFilter));
    if (pendingSchedules.length === 0) { addToast(`No pending schedules to reject`, 'warning'); return; }
    if (!window.confirm(`Reject ${pendingSchedules.length} pending schedule(s)?`)) return;
    setSubmitting(true);
    try {
      let rejectedCount = 0; const rejectedIds = new Set(); const rejectionReason = detailedRejectionReason;
      for (const schedule of pendingSchedules) {
        await axios.post(`${API_BASE}/audit-schedule/schedule/${schedule.id}/reject?userId=${user?.id}`, { reason: rejectionReason }, { withCredentials: true });
        rejectedCount++; rejectedIds.add(schedule.id); await new Promise(resolve => setTimeout(resolve, 100));
      }
      setDetailedSchedulesList(detailedSchedulesList.map(schedule => rejectedIds.has(schedule.id) ? { ...schedule, detailedApprovalStatus: 'REJECTED', detailedRejectionReason: rejectionReason, approvedByName: null, approvedBy: null } : schedule));
      setAllDetailedSchedules(prevList => prevList.map(schedule => rejectedIds.has(schedule.id) ? { ...schedule, detailedApprovalStatus: 'REJECTED', detailedRejectionReason: rejectionReason, approvedByName: null, approvedBy: null } : schedule));
      addToast(`${rejectedCount} schedule(s) rejected`, 'error'); setShowDetailedRejectModal(false); setDetailedRejectionReason('');
    } catch (error) { addToast('Failed to reject some schedules', 'error'); } finally { setSubmitting(false); }
  };

  const getFilteredDetailedSchedules = useCallback(() => {
    let filtered = [...detailedSchedulesList];
    if (detailedAuditTypeFilter && detailedAuditTypeFilter.trim() !== '') filtered = filtered.filter(schedule => doesScheduleMatchFilter(schedule, detailedAuditTypeFilter));
    if (activeTab === 'pending') filtered = filtered.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED');
    else filtered = filtered.filter(s => s.detailedApprovalStatus === 'APPROVED' || s.detailedApprovalStatus === 'REJECTED');
    return activeTab === 'history' ? [...filtered].sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate)) : [...filtered].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }, [detailedSchedulesList, detailedAuditTypeFilter, activeTab, doesScheduleMatchFilter]);

  const getUniqueAuditTypes = useCallback(() => {
    const types = new Set();
    detailedSchedulesList.forEach(s => {
      if (s.auditType) types.add(s.auditType);
      if (s.auditElements) {
        let els = typeof s.auditElements === 'string' ? (() => { try { return JSON.parse(s.auditElements); } catch(e) { return []; } })() : (Array.isArray(s.auditElements) ? s.auditElements : []);
        els.forEach(el => types.add(el));
      }
    });
    return Array.from(types).sort();
  }, [detailedSchedulesList]);

  const getFilteredPendingCount = useCallback(() => detailedSchedulesList.filter(s => (s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED') && doesScheduleMatchFilter(s, detailedAuditTypeFilter)).length, [detailedSchedulesList, detailedAuditTypeFilter, doesScheduleMatchFilter]);
  const getFilteredHistoryCount = useCallback(() => detailedSchedulesList.filter(s => (s.detailedApprovalStatus === 'APPROVED' || s.detailedApprovalStatus === 'REJECTED') && doesScheduleMatchFilter(s, detailedAuditTypeFilter)).length, [detailedSchedulesList, detailedAuditTypeFilter, doesScheduleMatchFilter]);

  const PlanSectionCard = ({ title, icon: Icon, color, pendingCount, plans, onViewPlan, formType, showAll = false, delay = 0 }) => {
    const getFormTypeLabel = () => {
      switch(formType) {
        case 'annual': return 'Annual Plan';
        case 'dept': return 'Dept Plan';
        case 'week': return 'Week Schedule';
        case 'daily': return 'Daily Schedule';
        default: return 'Plan';
      }
    };
    const displayPlans = showAll ? plans : plans.slice(0, 4);
    
    return (
      <div className="overflow-hidden transition-shadow bg-white border shadow-sm border-slate-200 rounded-2xl hover:shadow-md animate-fadeInUp card-hover" style={{ animationDelay: `${delay}ms` }}>
        <div className="px-5 py-4 border-b" style={{ backgroundColor: color.bg, borderColor: color.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                <Icon className="w-5 h-5" style={{ color: color.text }} />
              </div>
              <h3 className="font-bold text-slate-800">{title}</h3>
            </div>
            <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm" style={{ backgroundColor: color.badge.bg, color: color.badge.text }}>
              {pendingCount} Pending
            </span>
          </div>
        </div>
        <div className="overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: showAll ? '600px' : '280px' }}>
          {pendingCount === 0 && plans.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <FiCheckCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No {getFormTypeLabel().toLowerCase()}s found</p>
            </div>
          ) : (
            displayPlans.map((plan, idx) => (
              <div key={idx} className="p-4 transition-colors cursor-pointer hover:bg-slate-50" onClick={() => onViewPlan(plan)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {plan.year ? `${getFormTypeLabel()} ${plan.year}` : plan.month ? `${monthDisplay[plan.month] || plan.month} ${plan.year}` : getFormTypeLabel()}
                    </p>
                    {plan.preparedBy && <p className="mt-1 text-xs truncate text-slate-500">Prepared by: {plan.preparedBy}</p>}
                    {plan.scheduleCount && <p className="mt-1 text-xs text-slate-500">{plan.scheduleCount} schedule(s)</p>}
                  </div>
                  <FiChevronRight className="flex-shrink-0 w-5 h-5 mt-1 text-slate-400" />
                </div>
              </div>
            ))
          )}
          {!showAll && pendingCount > 4 && (
            <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
              <button onClick={() => onViewPlan(plans[0])} className="text-xs font-semibold text-blue-600 hover:text-blue-700">+ {pendingCount - 4} more pending...</button>
            </div>
          )}
        </div>
        {!showAll && pendingCount > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <button onClick={() => onViewPlan(plans[0])} className="flex items-center justify-center w-full gap-2 text-xs font-semibold text-center text-slate-600 hover:text-slate-800">
              <FiEye className="w-4 h-4" /> View All ({pendingCount})
            </button>
          </div>
        )}
      </div>
    );
  };

  const DailyScheduleCard = ({ title, icon: Icon, color, pendingPlans, approvedPlans, onViewPlan, onViewHistoryPlan, showAll = false, delay = 0 }) => {
    const totalMonths = pendingPlans.length + approvedPlans.length;
    const displayPending = showAll ? pendingPlans : pendingPlans.slice(0, 3);
    
    return (
      <div className="overflow-hidden transition-shadow bg-white border shadow-sm border-slate-200 rounded-2xl hover:shadow-md animate-fadeInUp card-hover" style={{ animationDelay: `${delay}ms` }}>
        <div className="px-5 py-4 border-b" style={{ backgroundColor: color.bg, borderColor: color.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                <Icon className="w-5 h-5" style={{ color: color.text }} />
              </div>
              <h3 className="font-bold text-slate-800">{title}</h3>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm" style={{ backgroundColor: color.badge.bg, color: color.badge.text }}>
                {pendingPlans.length} Pending
              </span>
              {approvedPlans.length > 0 && (
                <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full shadow-sm">{approvedPlans.length} History</span>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: showAll ? '600px' : '280px' }}>
          {pendingPlans.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <FiCheckCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No pending daily schedules</p>
            </div>
          ) : (
            displayPending.map((plan, idx) => (
              <div key={`pending-${plan.year}-${plan.month}`} className="p-4 transition-colors cursor-pointer hover:bg-slate-50" onClick={() => onViewPlan(plan, 'pending')}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {monthDisplay[plan.month] || plan.month} {plan.year}
                      {plan.isChangeRequested && <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Changes Requested</span>}
                      {plan.pendingCount > 0 && !plan.isChangeRequested && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{plan.pendingCount} pending</span>}
                    </p>
                    <p className="mt-1 text-xs truncate text-slate-500">Prepared by: {plan.preparedBy || 'N/A'} • {plan.scheduleCount || 0} schedule(s)</p>
                  </div>
                  <FiChevronRight className="flex-shrink-0 w-5 h-5 mt-1 text-slate-400" />
                </div>
              </div>
            ))
          )}
          {approvedPlans.length > 0 && (
            <div className="px-4 py-3 border-t bg-slate-50 border-slate-100">
              <p className="text-xs font-semibold text-slate-600">📋 {approvedPlans.length} month(s) with approved/history schedules</p>
            </div>
          )}
        </div>
        {!showAll && totalMonths > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => {
                if (pendingPlans.length > 0) onViewPlan(pendingPlans[0], 'pending');
                else if (approvedPlans.length > 0 && onViewHistoryPlan) onViewHistoryPlan(approvedPlans[0], 'history');
              }}
              className="flex items-center justify-center w-full gap-2 text-xs font-semibold text-center text-teal-600 hover:text-teal-700"
            >
              <FiEye className="w-4 h-4" /> View All ({totalMonths} months)
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
          <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen m-0" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} />
      
      <main className={`transition-all duration-500 ease-out ${isSidebarOpen ? 'ml-64' : 'ml-0'} pt-6`}>
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fadeInUp">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 transition-all bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md card-hover" title="Toggle Sidebar">
                <FiGrid className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  {activeView === 'overview' && 'Dashboard Overview'}
                  {activeView === 'annual' && 'Annual Audit Plans'}
                  {activeView === 'dept' && 'Department Audit Plans'}
                  {activeView === 'week' && 'Week Schedules'}
                  {activeView === 'daily' && 'Daily Schedules'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">Welcome back, <span className="font-semibold text-slate-700">{user?.name || user?.username}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
                  const topManagement = allUsersList.find(u => u.role === 'TOP_MANAGEMENT');
                  const availableAuditee = auditManager || topManagement;
                  openAuditForum({
                    id: 'demo', auditNumber: 'AUD-DEMO', auditType: 'Demo Audit', department: 'Quality',
                    auditorId: auditManager?.id || user?.id, auditorName: auditManager?.name || user?.name,
                    auditeeId: availableAuditee?.id, auditeeName: availableAuditee?.name,
                    hodEmail: availableAuditee?.email, hodName: availableAuditee?.name,
                    memberEmails: [user?.email, availableAuditee?.email].filter(Boolean)
                  });
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl shadow-md transition-all hover:shadow-lg"
                style={{ backgroundColor: NAVBAR_COLORS.primary }}
              >
                <FiMessageCircle className="w-4 h-4" /> Forum
              </button>
              <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md card-hover disabled:opacity-50">
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {activeView === 'overview' && (
            <>
              <div className="grid grid-cols-1 gap-5 mb-8 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total Audits Planned" value={stats.totalAudits} icon={<FiCalendar className="w-6 h-6" />} color={{bg: '#eff6ff', text: '#00529B'}} delay={0} />
                <KpiCard title="Completed Audits" value={stats.completedAudits} icon={<FiCheckCircle className="w-6 h-6" />} color={{bg: '#f0fdf4', text: '#166534'}} delay={100} />
                <KpiCard title="Plans Pending" value={stats.pendingApproval + stats.pendingDeptApproval + stats.pendingForm5Approval + stats.pendingDetailedApproval} icon={<FiSend className="w-6 h-6" />} color={{bg: '#fffbeb', text: '#b45309'}} delay={200} />
                <KpiCard title="Completion Rate" value={`${stats.overallCompletion}%`} icon={<FiTrendingUp className="w-6 h-6" />} color={{bg: '#faf5ff', text: '#7e22ce'}} delay={300} />
              </div>

              <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2">
                <PlanSectionCard title="Annual Audit Plans (Form 3)" icon={FiFileText} color={{bg: "#eff6ff", border: "#bfdbfe", text: "#00529B", badge: { bg: "#dbeafe", text: "#1e3a8a" }}} pendingCount={pendingPlans.length} plans={pendingPlans} onViewPlan={handleViewPlan} formType="annual" delay={400} />
                <PlanSectionCard title="Department Audit Plans (Form 4)" icon={FiList} color={{bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", badge: { bg: "#dcfce7", text: "#14532d" }}} pendingCount={pendingDeptPlans.length} plans={pendingDeptPlans} onViewPlan={handleViewDeptPlan} formType="dept" delay={500} />
                <PlanSectionCard title="Week Schedule Plans (Form 5)" icon={FiCalendarIcon} color={{bg: "#eef2ff", border: "#c7d2fe", text: "#3730a3", badge: { bg: "#e0e7ff", text: "#312e81" }}} pendingCount={pendingForm5Plans.length} plans={pendingForm5Plans} onViewPlan={handleViewForm5Plan} formType="week" delay={600} />
                <DailyScheduleCard title="Daily Schedule Plans (Detailed)" icon={FiClock} color={{bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e", badge: { bg: "#ccfbf1", text: "#115e59" }}} pendingPlans={pendingDetailedPlans} approvedPlans={approvedDetailedPlans} onViewPlan={(plan, tab) => handleViewDetailedPlan(plan, tab)} onViewHistoryPlan={(plan, tab) => handleViewDetailedPlan(plan, tab || 'history')} delay={700} />
              </div>

              <div className="mb-8 animate-fadeInUp" style={{animationDelay: '800ms'}}>
                <details className="bg-white border shadow-sm border-slate-200 rounded-2xl card-hover">
                  <summary className="flex items-center gap-2 px-6 py-4 font-semibold transition-colors cursor-pointer text-slate-700 hover:bg-slate-50 rounded-t-2xl">
                    <FiCheckCircle className="w-5 h-5 text-green-500" />
                    Approved Plans Summary ({approvedPlans.length + approvedDeptPlans.length + approvedForm5Plans.length + approvedDetailedPlans.length})
                    <span className="ml-2 text-xs font-normal text-slate-400">(Click to expand)</span>
                  </summary>
                  <div className="p-6 border-t border-slate-100">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <h4 className="mb-2 text-sm font-bold text-slate-700">Annual Plans ({approvedPlans.length})</h4>
                        {approvedPlans.length === 0 ? <p className="text-xs text-slate-400">No approved annual plans</p> : (
                          <div className="space-y-1 overflow-y-auto max-h-32">
                            {approvedPlans.map(plan => <p key={plan.year} className="text-xs text-slate-600">• {plan.year} - {plan.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : 'N/A'}</p>)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-bold text-slate-700">Department Plans ({approvedDeptPlans.length})</h4>
                        {approvedDeptPlans.length === 0 ? <p className="text-xs text-slate-400">No approved department plans</p> : (
                          <div className="space-y-1 overflow-y-auto max-h-32">
                            {approvedDeptPlans.map(plan => <p key={plan.year} className="text-xs text-slate-600">• {plan.year} - {plan.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : 'N/A'}</p>)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-bold text-slate-700">Week Schedules ({approvedForm5Plans.length})</h4>
                        {approvedForm5Plans.length === 0 ? <p className="text-xs text-slate-400">No approved week schedules</p> : (
                          <div className="space-y-1 overflow-y-auto max-h-32">
                            {approvedForm5Plans.map(plan => <p key={`${plan.year}-${plan.month}`} className="text-xs text-slate-600">• {monthDisplay[plan.month] || plan.month} {plan.year}</p>)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-bold text-slate-700">Daily Schedules ({approvedDetailedPlans.length})</h4>
                        {approvedDetailedPlans.length === 0 ? <p className="text-xs text-slate-400">No approved daily schedules</p> : (
                          <div className="space-y-1 overflow-y-auto max-h-32">
                            {approvedDetailedPlans.map(plan => <p key={`${plan.year}-${plan.month}`} className="text-xs text-slate-600">• {monthDisplay[plan.month] || plan.month} {plan.year} ({plan.scheduleCount} schedules)</p>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 animate-fadeInUp" style={{animationDelay: '900ms'}}>
                <div className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl card-hover">
                  <h3 className="mb-4 text-lg font-bold text-slate-800">Management Review</h3>
                  <button onClick={() => navigate('/reports')} className="flex items-center justify-between w-full p-3 transition-colors border border-transparent shadow-sm rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-slate-200 hover:shadow-md group">
                    <span className="font-medium text-slate-700">View Audit Summary Report</span>
                    <FiBarChart2 className="w-5 h-5 transition-transform text-slate-400 group-hover:translate-x-1" />
                  </button>
                </div>
                <div className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl card-hover">
                  <h3 className="mb-4 text-lg font-bold text-slate-800">Audit Plans</h3>
                  <div className="flex gap-3">
                    <button onClick={() => navigate('/form3')} className="flex-1 p-3 text-center transition-colors rounded-xl bg-blue-50 hover:bg-blue-100"><span className="text-sm font-medium text-blue-700">Annual Plan</span></button>
                    <button onClick={() => navigate('/form4')} className="flex-1 p-3 text-center transition-colors rounded-xl bg-green-50 hover:bg-green-100"><span className="text-sm font-medium text-green-700">Dept Plan</span></button>
                    <button onClick={() => navigate('/form5')} className="flex-1 p-3 text-center transition-colors rounded-xl bg-indigo-50 hover:bg-indigo-100"><span className="text-sm font-medium text-indigo-700">Week Schedule</span></button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'annual' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fadeInUp">
              <PlanSectionCard title="Pending Annual Plans" icon={FiFileText} color={{bg: "#eff6ff", border: "#bfdbfe", text: "#00529B", badge: { bg: "#dbeafe", text: "#1e3a8a" }}} pendingCount={pendingPlans.length} plans={pendingPlans} onViewPlan={handleViewPlan} formType="annual" showAll={true} delay={0} />
              <PlanSectionCard title="Approved Annual Plans" icon={FiCheckCircle} color={{bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", badge: { bg: "#dcfce7", text: "#14532d" }}} pendingCount={0} plans={approvedPlans} onViewPlan={handleViewPlan} formType="annual" showAll={true} delay={100} />
            </div>
          )}

          {activeView === 'dept' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fadeInUp">
              <PlanSectionCard title="Pending Department Plans" icon={FiList} color={{bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", badge: { bg: "#dcfce7", text: "#14532d" }}} pendingCount={pendingDeptPlans.length} plans={pendingDeptPlans} onViewPlan={handleViewDeptPlan} formType="dept" showAll={true} delay={0} />
              <PlanSectionCard title="Approved Department Plans" icon={FiCheckCircle} color={{bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", badge: { bg: "#dcfce7", text: "#14532d" }}} pendingCount={0} plans={approvedDeptPlans} onViewPlan={handleViewDeptPlan} formType="dept" showAll={true} delay={100} />
            </div>
          )}

          {activeView === 'week' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fadeInUp">
              <PlanSectionCard title="Pending Week Schedules" icon={FiCalendarIcon} color={{bg: "#eef2ff", border: "#c7d2fe", text: "#3730a3", badge: { bg: "#e0e7ff", text: "#312e81" }}} pendingCount={pendingForm5Plans.length} plans={pendingForm5Plans} onViewPlan={handleViewForm5Plan} formType="week" showAll={true} delay={0} />
              <PlanSectionCard title="Approved Week Schedules" icon={FiCheckCircle} color={{bg: "#eef2ff", border: "#c7d2fe", text: "#3730a3", badge: { bg: "#e0e7ff", text: "#312e81" }}} pendingCount={0} plans={approvedForm5Plans} onViewPlan={handleViewForm5Plan} formType="week" showAll={true} delay={100} />
            </div>
          )}

          {activeView === 'daily' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fadeInUp">
              <DailyScheduleCard title="Pending Daily Schedules" icon={FiClock} color={{bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e", badge: { bg: "#ccfbf1", text: "#115e59" }}} pendingPlans={pendingDetailedPlans} approvedPlans={[]} onViewPlan={(plan, tab) => handleViewDetailedPlan(plan, tab)} onViewHistoryPlan={(plan, tab) => handleViewDetailedPlan(plan, tab || 'history')} showAll={true} delay={0} />
              <DailyScheduleCard title="Approved/History Daily Schedules" icon={FiArchive} color={{bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e", badge: { bg: "#ccfbf1", text: "#115e59" }}} pendingPlans={[]} approvedPlans={approvedDetailedPlans} onViewPlan={(plan, tab) => handleViewDetailedPlan(plan, tab)} onViewHistoryPlan={(plan, tab) => handleViewDetailedPlan(plan, tab || 'history')} showAll={true} delay={100} />
            </div>
          )}
        </div>

        {/* Form 5 Week Schedule Details Modal */}
        {showForm5Details && selectedForm5Plan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto shadow-2xl animate-scaleIn">
              <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-slate-200 rounded-t-2xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Week Schedule - {monthDisplay[selectedForm5Plan.month]} {selectedForm5Plan.year}</h3>
                  {selectedForm5Plan.leadAuditorName && <p className="mt-1 text-sm text-slate-500">Lead Auditor: {selectedForm5Plan.leadAuditorName}</p>}
                  <p className="text-sm text-slate-500">Prepared by: {selectedForm5Plan.preparedByName || selectedForm5Plan.preparedBy || 'N/A'}</p>
                </div>
                <button onClick={() => setShowForm5Details(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
              </div>
              <div className="p-6">
                <div className="mb-6 overflow-x-auto">
                  <table className="w-full overflow-hidden text-sm border rounded-lg border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Department</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Week</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Audit Elements</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Lead Auditor</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Team Auditors</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Auditees</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form5SchedulesDetail.map((schedule, idx) => {
                        let teamAuditorNames = typeof schedule.teamAuditorNames === 'string' ? (() => { try { return JSON.parse(schedule.teamAuditorNames); } catch(e) { return []; } })() : (Array.isArray(schedule.teamAuditorNames) ? schedule.teamAuditorNames : []);
                        if (teamAuditorNames.length === 0 && schedule.coAuditorNames) teamAuditorNames = typeof schedule.coAuditorNames === 'string' ? (() => { try { return JSON.parse(schedule.coAuditorNames); } catch(e) { return []; } })() : (Array.isArray(schedule.coAuditorNames) ? schedule.coAuditorNames : []);
                        let auditeeNames = typeof schedule.auditeeNames === 'string' ? (() => { try { return JSON.parse(schedule.auditeeNames); } catch(e) { return [schedule.auditeeNames]; } })() : (Array.isArray(schedule.auditeeNames) ? schedule.auditeeNames : (schedule.auditeeName ? [schedule.auditeeName] : []));
                        const leadAuditorName = schedule.leadAuditorName || schedule.auditorName || '-';
                        return (
                          <tr key={idx} className="transition-colors hover:bg-slate-50">
                            <td className="px-3 py-2 border-b border-slate-100">{schedule.department}</td>
                            <td className="px-3 py-2 border-b border-slate-100">{schedule.week}</td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              <div className="flex flex-wrap gap-1">
                                {schedule.auditElements && typeof schedule.auditElements === 'string' ? (() => {
                                  try { return JSON.parse(schedule.auditElements).map((el, i) => <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{auditElementsMap[el] || el.substring(0, 3)}</span>); } 
                                  catch(e) { return <span className="text-xs">{schedule.auditElements}</span>; }
                                })() : schedule.auditElements?.map((el, i) => <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{auditElementsMap[el] || el.substring(0, 3)}</span>)}
                              </div>
                            </td>
                            <td className="px-3 py-2 font-medium border-b border-slate-100 text-slate-800">{leadAuditorName}</td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              {teamAuditorNames.length > 0 ? <div className="flex flex-wrap gap-1">{teamAuditorNames.map((name, i) => <span key={i} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs" title={name}>{name.length > 20 ? name.substring(0, 18) + '...' : name}</span>)}</div> : <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              {auditeeNames.length > 0 ? <div className="flex flex-wrap gap-1">{auditeeNames.map((name, i) => <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs" title={name}>{name.length > 20 ? name.substring(0, 18) + '...' : name}</span>)}</div> : <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">{schedule.status || 'SCHEDULED'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 mb-4 border rounded-lg bg-slate-50 border-slate-100">
                  <p className="mb-1 text-xs font-bold text-slate-600">Legend - Audit Elements codes:</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>A - System Audit (ISO9001)</span><span>B - System Audit (IATF16949)</span><span>C - 5S Audit</span><span>D - Process Audit</span><span>E - Product Audit</span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-bold text-slate-700">Approval Comments (Optional)</label>
                  <textarea value={form5ApprovalComment} onChange={(e) => setForm5ApprovalComment(e.target.value)} rows={2} className="w-full p-2 border rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500" placeholder="Add any comments for approval..." />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowForm5RejectModal(true)} className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700"><FiX className="w-4 h-4" /> Reject</button>
                  <button onClick={handleApproveForm5Plan} disabled={submitting} className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50">
                    {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCheck className="w-4 h-4" />} Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form 5 Detailed Daily Schedule Modal */}
        {showDetailedDetails && selectedDetailedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto shadow-2xl animate-scaleIn">
              <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-slate-200 rounded-t-2xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Daily Schedule - {monthDisplay[selectedDetailedPlan.month]} {selectedDetailedPlan.year}</h3>
                  {selectedDetailedPlan.leadAuditorName && <p className="mt-1 text-sm text-slate-500">Lead Auditor: {selectedDetailedPlan.leadAuditorName}</p>}
                  <p className="text-sm text-slate-500">Prepared by: {selectedDetailedPlan.preparedBy || 'N/A'}</p>
                </div>
                <button onClick={() => setShowDetailedDetails(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
              </div>
              <div className="p-6">
                <div className="mb-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <button onClick={() => setActiveTab('pending')} className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'pending' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        <div className="flex items-center gap-2"><FiClock className="w-4 h-4" /> Pending Approval <span className="ml-1 text-xs text-slate-400">({detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL' || s.detailedApprovalStatus === 'CHANGE_REQUESTED').length})</span></div>
                      </button>
                      <button onClick={() => setActiveTab('history')} className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        <div className="flex items-center gap-2"><FiArchive className="w-4 h-4" /> History & Approved <span className="ml-1 text-xs text-slate-400">({detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'APPROVED' || s.detailedApprovalStatus === 'REJECTED').length})</span></div>
                      </button>
                    </div>
                    {allMonthlyPlans.length > 1 && (
                      <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-100">
                        <button onClick={() => navigateToMonth(-1)} disabled={currentMonthIndex === 0} className="flex items-center justify-center w-8 h-8 text-lg font-bold transition-colors bg-white rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" title="Previous Month">◀</button>
                        <div className="text-center">
                          <div className="text-sm font-bold text-slate-700">{monthDisplay[allMonthlyPlans[currentMonthIndex]?.month]} {allMonthlyPlans[currentMonthIndex]?.year}</div>
                          <div className="text-xs text-slate-500">{currentMonthIndex + 1} of {allMonthlyPlans.length}</div>
                        </div>
                        <button onClick={() => navigateToMonth(1)} disabled={currentMonthIndex === allMonthlyPlans.length - 1} className="flex items-center justify-center w-8 h-8 text-lg font-bold transition-colors bg-white rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" title="Next Month">▶</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-4 p-3 mb-4 border rounded-lg bg-slate-50 border-slate-100 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="mb-2 text-xs font-bold text-slate-600">Schedule Status Summary:</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const pendingCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'PENDING_APPROVAL').length;
                        const approvedCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'APPROVED').length;
                        const rejectedCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'REJECTED').length;
                        const changeRequestedCount = detailedSchedulesList.filter(s => s.detailedApprovalStatus === 'CHANGE_REQUESTED').length;
                        const draftCount = detailedSchedulesList.filter(s => !s.detailedApprovalStatus || s.detailedApprovalStatus === 'DRAFT').length;
                        return (<>
                          {pendingCount > 0 && <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">{pendingCount} Pending</span>}
                          {approvedCount > 0 && <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">{approvedCount} Approved</span>}
                          {rejectedCount > 0 && <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">{rejectedCount} Rejected</span>}
                          {changeRequestedCount > 0 && <span className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">{changeRequestedCount} Changes Requested</span>}
                          {draftCount > 0 && <span className="px-2 py-1 text-xs font-medium rounded-full text-slate-600 bg-slate-200">{draftCount} Draft</span>}
                        </>);
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiFilter className="text-slate-400" />
                    <select value={detailedAuditTypeFilter} onChange={(e) => setDetailedAuditTypeFilter(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500">
                      <option value="">All Audit Types</option>
                      {getUniqueAuditTypes().map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mb-6 overflow-x-auto">
                  <table className="w-full overflow-hidden text-sm border rounded-lg border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Date</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Time Slot</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Departments/Event</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Audit Type</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Auditor</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Auditee</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Approval Status</th>
                        <th className="px-3 py-2 font-semibold text-left border-b border-slate-200 text-slate-600">Approved/Rejected By</th>
                        <th className="px-3 py-2 font-semibold text-center border-b border-slate-200 text-slate-600">Actions</th>
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
                          <tr key={schedule.id || idx} className="transition-colors hover:bg-slate-50">
                            <td className="px-3 py-2 border-b border-slate-100">
                              {schedule.fromDate && schedule.toDate && schedule.fromDate !== schedule.toDate ? (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1"><span className="text-xs text-purple-600">📅</span><span className="text-xs font-bold text-slate-700">Date Range:</span><span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Flexible</span></div>
                                  <div className="text-xs font-medium text-slate-600 mt-0.5">{schedule.fromDate} → {schedule.toDate}</div>
                                </div>
                              ) : (<div className="text-sm font-medium">{schedule.scheduledDate || schedule.date}</div>)}
                            </td>
                            <td className="px-3 py-2 border-b border-slate-100"><div className="text-sm">{schedule.startTime} - {schedule.endTime}</div></td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              {schedule.isSpecialEvent ? (
                                <div className="flex items-center gap-2">
                                  {schedule.specialEventType === 'OPENING' && <FiSunrise className="w-4 h-4 text-blue-500" />}
                                  {schedule.specialEventType === 'LUNCH' && <FiCoffee className="w-4 h-4 text-orange-500" />}
                                  {schedule.specialEventType === 'CLOSING' && <FiSunset className="w-4 h-4 text-purple-500" />}
                                  <span className="font-medium">{schedule.specialEventType === 'OPENING' ? 'Opening Meeting' : schedule.specialEventType === 'LUNCH' ? 'Lunch Break' : 'Closing Meeting'}</span>
                                </div>
                              ) : (<div className="flex flex-wrap gap-1">{schedule.departments?.map((dept, i) => <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{dept}</span>)}</div>)}
                            </td>
                            <td className="px-3 py-2 font-medium border-b border-slate-100">{schedule.auditType || '-'}</td>
                            <td className="px-3 py-2 border-b border-slate-100">{schedule.auditorName || '-'}</td>
                            <td className="px-3 py-2 border-b border-slate-100">{schedule.auditeeName || '-'}</td>
                            <td className="px-3 py-2 border-b border-slate-100">{getStatusBadge(approvalStatus)}</td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              {isApproved && schedule.approvedByName && <div className="flex items-center gap-1 text-xs"><FiUserCheck className="w-3 h-3 text-green-600" /><span className="font-medium">{schedule.approvedByName}</span></div>}
                              {isRejected && schedule.detailedRejectionReason && <div className="flex items-center gap-1 text-xs"><FiUserX className="w-3 h-3 text-red-600" /><span className="font-medium text-red-600" title={schedule.detailedRejectionReason}>{schedule.detailedRejectionReason.substring(0, 30)}...</span></div>}
                              {isChangeRequested && schedule.detailedRejectionReason && <div className="flex items-center gap-1 text-xs"><FiMessageSquare className="w-3 h-3 text-orange-600" /><span className="font-medium text-orange-600">Changes requested</span></div>}
                              {isPending && <div className="text-xs font-medium text-slate-400">Awaiting review</div>}
                            </td>
                            <td className="px-3 py-2 text-center border-b border-slate-100">
                              {isPending && (
                                <div className="flex flex-col items-center gap-1">
                                  <button onClick={() => handleApproveSingleSchedule(schedule)} disabled={submitting} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve Schedule"><FiThumbsUp className="w-4 h-4" /></button>
                                  <button onClick={() => { setSelectedScheduleForAction(schedule); setDetailedRejectionReason(''); setShowScheduleRejectModal(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Reject Schedule"><FiThumbsDown className="w-4 h-4" /></button>
                                  <button onClick={() => { setSelectedScheduleForAction(schedule); setChangeRequestReason(''); setShowChangeRequestModal(true); }} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Request Changes"><FiMessageSquare className="w-4 h-4" /></button>
                                </div>
                              )}
                              {isChangeRequested && (
                                <div className="flex flex-col items-center gap-1">
                                  <button onClick={() => { setSelectedScheduleForAction(schedule); setChangeRequestReason(''); setShowChangeRequestModal(true); }} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Review Changes"><FiMessageSquare className="w-4 h-4" /></button>
                                  <button onClick={() => handleApproveSingleSchedule(schedule)} disabled={submitting} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve After Changes"><FiCheck className="w-4 h-4" /></button>
                                </div>
                              )}
                              {isApproved && (
                                <div className="flex flex-col items-center gap-1">
                                  <button onClick={() => { setSelectedScheduleForAction(schedule); setChangeRequestReason(''); setShowChangeRequestModal(true); }} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Request Changes to Approved Schedule"><FiMessageSquare className="w-4 h-4" /></button>
                                  <span className="text-xs font-bold text-green-600">Approved</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {getFilteredDetailedSchedules().length === 0 && (
                        <tr><td colSpan="9" className="px-3 py-8 font-medium text-center text-slate-400">No schedules found for selected filter and tab.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {activeTab === 'pending' && getFilteredPendingCount() > 0 && (
                  <div className="p-4 mb-4 border rounded-xl bg-amber-50 border-amber-200">
                    <p className="flex items-center gap-2 mb-2 text-sm font-bold text-amber-800"><FiInfo className="w-4 h-4" /> Bulk Actions: {getFilteredPendingCount()} pending schedule(s) {detailedAuditTypeFilter ? ` for audit type "${detailedAuditTypeFilter}"` : ' (all audit types)'}</p>
                    <div className="mb-3">
                      <label className="block mb-1 text-sm font-bold text-slate-700">Comments / Reason (Optional for approve, required for reject)</label>
                      <textarea value={detailedApprovalComment} onChange={(e) => setDetailedApprovalComment(e.target.value)} rows={2} className="w-full p-2 border rounded-lg border-slate-200 focus:ring-2 focus:ring-teal-500" placeholder="Add comments for bulk action..." />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowDetailedRejectModal(true)} className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700"><FiX className="w-4 h-4" /> Reject All Pending</button>
                      <button onClick={handleBulkApproveByAuditType} disabled={submitting} className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50">
                        {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCheckSquare className="w-4 h-4" />} Approve All Pending
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === 'history' && getFilteredHistoryCount() > 0 && (
                  <div className="p-3 mb-4 border border-blue-200 rounded-xl bg-blue-50">
                    <p className="flex items-center gap-2 text-sm font-medium text-blue-700"><FiArchive className="w-4 h-4" /> This section shows all approved and rejected schedules for this month. {detailedAuditTypeFilter && ` Currently filtered by "${detailedAuditTypeFilter}".`}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reject Modals */}
        {showForm5RejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl animate-scaleIn">
              <h3 className="mb-4 text-xl font-bold text-slate-800">Reject Week Schedule</h3>
              <p className="mb-4 text-sm text-slate-600">Please provide a reason for rejection:</p>
              <textarea value={form5RejectionReason} onChange={(e) => setForm5RejectionReason(e.target.value)} rows={4} className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-red-500" placeholder="Enter rejection reason..." autoFocus />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowForm5RejectModal(false); setForm5RejectionReason(''); }} className="px-4 py-2 font-medium border rounded-lg border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={handleRejectForm5Plan} disabled={submitting} className="px-4 py-2 font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-50">Confirm Reject</button>
              </div>
            </div>
          </div>
        )}
        {showDetailedRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl animate-scaleIn">
              <h3 className="mb-4 text-xl font-bold text-slate-800">Reject {getFilteredPendingCount()} Pending Schedule(s) {detailedAuditTypeFilter && ` for "${detailedAuditTypeFilter}"`}</h3>
              <p className="mb-4 text-sm text-slate-600">Please provide a reason for rejection:</p>
              <textarea value={detailedRejectionReason} onChange={(e) => setDetailedRejectionReason(e.target.value)} rows={4} className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-red-500" placeholder="Enter rejection reason..." autoFocus />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowDetailedRejectModal(false); setDetailedRejectionReason(''); }} className="px-4 py-2 font-medium border rounded-lg border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={handleBulkRejectByAuditType} disabled={submitting} className="px-4 py-2 font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-50">Confirm Reject All</button>
              </div>
            </div>
          </div>
        )}
        {showScheduleRejectModal && selectedScheduleForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl animate-scaleIn">
              <h3 className="mb-4 text-xl font-bold text-slate-800">Reject Schedule for {selectedScheduleForAction.scheduledDate}</h3>
              <p className="mb-4 text-sm text-slate-600">Please provide a reason for rejection:</p>
              <textarea value={detailedRejectionReason} onChange={(e) => setDetailedRejectionReason(e.target.value)} rows={4} className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-red-500" placeholder="Enter rejection reason..." autoFocus />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowScheduleRejectModal(false); setDetailedRejectionReason(''); setSelectedScheduleForAction(null); }} className="px-4 py-2 font-medium border rounded-lg border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={handleRejectSingleSchedule} disabled={submitting} className="px-4 py-2 font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-50">Confirm Reject</button>
              </div>
            </div>
          </div>
        )}
        {showChangeRequestModal && selectedScheduleForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl animate-scaleIn">
              <h3 className="mb-4 text-xl font-bold text-slate-800">Request Changes for {selectedScheduleForAction.scheduledDate}</h3>
              <p className="mb-4 text-sm text-slate-600">Please provide details about what changes are needed:</p>
              <textarea value={changeRequestReason} onChange={(e) => setChangeRequestReason(e.target.value)} rows={4} className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-orange-500" placeholder="Describe the changes required..." autoFocus />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); setSelectedScheduleForAction(null); }} className="px-4 py-2 font-medium border rounded-lg border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={() => handleRequestChangesForSchedule(selectedScheduleForAction)} disabled={submitting} className="px-4 py-2 font-medium text-white bg-orange-600 rounded-lg shadow-sm hover:bg-orange-700 disabled:opacity-50">Request Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Other Modals */}
        {showPlanDetails && <PlanDetailsModal selectedPlan={selectedPlan} onClose={() => { setShowPlanDetails(false); setSelectedPlan(null); setPlanApprovalComment(''); }} onApprove={handleApprovePlan} onReject={() => setShowPlanRejectModal(true)} approvalComment={planApprovalComment} setApprovalComment={setPlanApprovalComment} submitting={submitting} />}
        {showPlanRejectModal && <RejectModal isOpen={showPlanRejectModal} onClose={() => { setShowPlanRejectModal(false); setPlanRejectionReason(''); }} onConfirm={handleRejectPlan} year={selectedPlan?.year} rejectionReason={planRejectionReason} setRejectionReason={setPlanRejectionReason} submitting={submitting} />}
        {showDeptPlanDetails && <DeptPlanDetailsModal selectedPlan={selectedDeptPlan} onClose={() => { setShowDeptPlanDetails(false); setSelectedDeptPlan(null); setDeptApprovalComment(''); }} onApprove={handleApproveDeptPlan} onReject={() => setShowDeptRejectModal(true)} approvalComment={deptApprovalComment} setApprovalComment={setDeptApprovalComment} submitting={submitting} />}
        {showDeptRejectModal && <RejectModal isOpen={showDeptRejectModal} onClose={() => { setShowDeptRejectModal(false); setDeptRejectionReason(''); }} onConfirm={handleRejectDeptPlan} year={selectedDeptPlan?.year} rejectionReason={deptRejectionReason} setRejectionReason={setDeptRejectionReason} submitting={submitting} />}
        {showForumModal && selectedAuditForForum && (
          <AuditCheckSheetNCRForumModal
            auditId={selectedAuditForForum.id} auditNumber={selectedAuditForForum.auditNumber} auditTitle={selectedAuditForForum.auditType} auditStatus="IN_PROGRESS"
            auditType={selectedAuditForForum.auditType} department={selectedAuditForForum.department} auditorId={user?.id} auditorName={user?.name}
            auditeeId={selectedAuditForForum.auditeeId} auditeeName={selectedAuditForForum.auditeeName} hodEmail={selectedAuditForForum.hodEmail} hodName={selectedAuditForForum.hodName}
            memberEmails={selectedAuditForForum.memberEmails || []} isOpen={showForumModal} onClose={() => { setShowForumModal(false); setSelectedAuditForForum(null); }}
            currentUser={user} allUsers={allUsersList}
          />
        )}
      </main>
    </div>
  );
};

export default TopManagementDashboard;