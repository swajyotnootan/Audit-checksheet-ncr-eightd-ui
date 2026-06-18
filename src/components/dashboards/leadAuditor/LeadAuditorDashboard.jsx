// src/components/dashboards/LeadAuditorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiAward, FiBarChart2, FiCalendar, FiFileText, 
  FiAlertTriangle, FiUsers, FiUserCheck, FiRefreshCw,
  FiBell, FiTrendingUp, FiTrendingDown, FiMoreVertical,
  FiDownload, FiShare2, FiStar, FiClock, FiCheckCircle,
  FiXCircle, FiActivity, FiZap, FiShield, FiTarget
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../ToastContext';
import axios from 'axios';
import DashboardAnalytics from './DashboardAnalytics';
import AuditsAndResponses from './AuditsAndResponses';
import StakeholderManagement from './StakeholderManagement';
import ResponseDetailModal from './ResponseDetailModal';
import { useNavigate, useLocation } from 'react-router-dom';
const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

import YearFilter from '../../../components/common/YearFilter';

const PremiumCard = ({ children, className = "", gradient = false, hover = true }) => (
  <div className={`
    backdrop-blur-xl rounded-2xl shadow-xl 
    ${gradient 
      ? 'bg-gradient-to-br from-white/30 to-white/10 border border-white/20' 
      : 'bg-white/20 border border-white/20'
    }
    ${hover ? 'transition-all duration-300 hover:shadow-2xl hover:bg-white/30 hover:-translate-y-1' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const NavTab = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 rounded-xl backdrop-blur-sm
      ${active 
        ? 'bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white shadow-lg shadow-indigo-500/20' 
        : 'text-gray-600/90 hover:bg-white/30 hover:text-gray-800'
      }
    `}
  >
    <Icon size={18} />
    <span>{label}</span>
    {count !== undefined && (
      <span className={`
        px-2 py-0.5 text-xs rounded-full font-semibold
        ${active ? 'bg-white/20 text-white' : 'bg-gray-200/60 text-gray-600/90'}
      `}>
        {count}
      </span>
    )}
  </button>
);

const LeadAuditorDashboard = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [carouselSpeed, setCarouselSpeed] = useState(5000);
  const [responseViewMode, setResponseViewMode] = useState('grid');
  const [ncrViewMode, setNcrViewMode] = useState('grid');
  
  const [leadAuditorDepartment, setLeadAuditorDepartment] = useState(null);
  
  const [allSchedules, setAllSchedules] = useState([]);
  const [allNCRs, setAllNCRs] = useState([]);
  const [allAuditors, setAllAuditors] = useState([]);
  const [allAuditees, setAllAuditees] = useState([]);
  const [allResponses, setAllResponses] = useState([]);
  
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [filteredNCRs, setFilteredNCRs] = useState([]);
  const [filteredAuditors, setFilteredAuditors] = useState([]);
  const [filteredAuditees, setFilteredAuditees] = useState([]);
  const [filteredResponses, setFilteredResponses] = useState([]);
  
  const [reviewingResponse, setReviewingResponse] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewApproved, setReviewApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedResponseForDetail, setSelectedResponseForDetail] = useState(null);
  const [showResponseDetailModal, setShowResponseDetailModal] = useState(false);

  const [stats, setStats] = useState({
    totalSchedules: 0, completedSchedules: 0, approved: 0, rejected: 0,
    pendingApproval: 0, inProgress: 0, scheduled: 0, overdue: 0,
    totalNCRs: 0, openNCRs: 0, closedNCRs: 0, criticalNCRs: 0, majorNCRs: 0, minorNCRs: 0,
    totalResponses: 0, responsesApproved: 0, responsesRejected: 0, responsesSubmitted: 0,
    ncrApproved: 0, ncrInProgress: 0, ncrOpen: 0
  });

  const [selectedYear, setSelectedYear] = useState(() => {
  const savedYear = localStorage.getItem('leadAuditorSelectedYear');
  if (savedYear) {
    return parseInt(savedYear);
  }
  return new Date().getFullYear();
});
const [availableYears, setAvailableYears] = useState([]);

  // Add this function after your state declarations
const getCurrentTab = () => {
  switch(activeTab) {
    case 'audits': return 'audits';
    case 'responses': return 'responses';
    case 'ncrs': return 'ncrs';
    case 'auditors': return 'auditors';
    case 'auditees': return 'auditees';
    default: return 'responses';
  }
};

  const getViewPath = (response) => {
    const checkSheetName = response.checkSheet?.name?.toLowerCase() || '';
    const answers = typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers;
    const formName = answers?.formName?.toLowerCase() || '';
    
    if (checkSheetName.includes('5s') || formName.includes('5s') || formName.includes('5s audit')) {
      return `/fives-view/${response.id}`;
    }
    else if (checkSheetName.includes('manufacturing') || formName.includes('manufacturing') || formName.includes('manufacturing process')) {
      return `/manufacturing-view/${response.id}`;
    }
    else {
      return `/iatf-view/${response.id}`;
    }
  };

  const handleViewResponseDetail = (response) => {
    setSelectedResponseForDetail(response);
    setShowResponseDetailModal(true);
  };

  const handleReviewResponse = async () => {
    if (!reviewingResponse) return;
    if (!reviewApproved && !reviewComment.trim()) {
      addToast('Please provide a reason for rejection', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = reviewApproved ? 'lead-auditor/approve' : 'lead-auditor/reject';
      await axios.put(
        `${API_BASE}/templates/responses/${reviewingResponse.id}/${endpoint}`,
        { comment: reviewComment, signature: 'Lead Auditor' },
        { withCredentials: true }
      );
      addToast(`Response ${reviewApproved ? 'approved' : 'rejected'} successfully!`, reviewApproved ? 'success' : 'error');
      setReviewingResponse(null);
      setReviewComment('');
      fetchAllData();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Get lead auditor's department
  const fetchLeadAuditorDepartment = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users/${user?.id}`, { withCredentials: true });
      const userData = response.data;
      
      console.log('🔍 User Data from API:', userData);
      
      let department = null;
      if (userData.department) {
        department = userData.department;
        if (typeof department === 'object' && department.displayName) {
          department = department.displayName;
        } else if (typeof department === 'object' && department.name) {
          department = department.name;
        }
      } else if (userData.departmentName) {
        department = userData.departmentName;
      } else if (userData.departmentCode) {
        department = userData.departmentCode;
      }
      
      console.log('📋 Extracted Department:', department);
      setLeadAuditorDepartment(department);
      return department;
    } catch (error) {
      console.error('Error fetching lead auditor department:', error);
      if (user?.department) {
        let dept = user.department;
        if (typeof dept === 'object' && dept.displayName) {
          dept = dept.displayName;
        }
        console.log('📋 Department from user context:', dept);
        setLeadAuditorDepartment(dept);
        return dept;
      }
      return null;
    }
  };

  // Normalize department name for comparison
  const normalizeDepartment = (dept) => {
  if (!dept) return '';
  let deptStr = String(dept).toUpperCase().trim();
 
  const deptMap = {
    'HR': 'HR',
    'R&D': 'ENGG',
    'ENGINEERING': 'ENGG',
    'R AND D': 'ENGG',
    'PURCHASE': 'PURCHASE',
    'RMS': 'STORES_DESPATCH',
    'SQA': 'QA',
    'PPC': 'PPC',
    'PRODUCTION': 'PRODUCTION',
    'QA/QC': 'QA',
    'QA': 'QA',
    'QC': 'QA',
    'FGS': 'STORES_DESPATCH',
    'MARKETING': 'MARKETING',
    'IMS (BE)': 'MR',     // ← ADD THIS (with space)
    'IMS(BE)': 'MR',      // ← Also keep this for consistency
    'IMS': 'MR',          // ← Change from 'IMS(BE)' to 'MR'
    'MAINTENANCE': 'PLANT_MAINTENANCE',
    'MANAGEMENT': 'UNIT_HEAD',
    'PLANT MAINTENANCE': 'PLANT_MAINTENANCE',
    'TOOL MAINTENANCE': 'TOOL_MAINTENANCE',
    'TOOL MANAGEMENT': 'TOOL_MAINTENANCE',
    'STORES & DESPATCH': 'STORES_DESPATCH',
    'STORES': 'STORES_DESPATCH',
    'DESPATCH': 'STORES_DESPATCH',
    'UNIT HEAD': 'UNIT_HEAD',
    'MR': 'MR'            // ← Keep MR as MR
  };
 
  return deptMap[deptStr] || deptStr;
};
 
  // Filter data by department
  const filterDataByDepartment = (department, schedules, ncrs, auditors, auditees, responses) => {
    if (!department) {
      console.log('⚠️ No department to filter by, showing all data');
      return { schedules, ncrs, auditors, auditees, responses };
    }

    const normalizedTarget = normalizeDepartment(department);
    console.log('🎯 Filtering by department:', department, '→ Normalized:', normalizedTarget);
    
    const filtered = {
      schedules: schedules.filter(s => {
        const match = normalizeDepartment(s.department) === normalizedTarget;
        if (s.department && !match) {
          console.log(`  Schedule dept "${s.department}" → "${normalizeDepartment(s.department)}" ≠ ${normalizedTarget}`);
        }
        return match;
      }),
      ncrs: ncrs.filter(n => {
        const match = normalizeDepartment(n.department) === normalizedTarget;
        if (n.department && !match) {
          console.log(`  NCR dept "${n.department}" → "${normalizeDepartment(n.department)}" ≠ ${normalizedTarget}`);
        }
        return match;
      }),
      auditors: auditors.filter(a => {
        const dept = a.department || a.departmentName;
        return normalizeDepartment(dept) === normalizedTarget;
      }),
      auditees: auditees.filter(a => {
        const dept = a.department || a.departmentName;
        return normalizeDepartment(dept) === normalizedTarget;
      }),
      responses: responses.filter(r => {
        const match = normalizeDepartment(r.department) === normalizedTarget;
        if (r.department && !match) {
          console.log(`  Response dept "${r.department}" → "${normalizeDepartment(r.department)}" ≠ ${normalizedTarget}`);
        }
        return match;
      })
    };

    console.log('📊 Filter Results:', {
      schedules: filtered.schedules.length,
      ncrs: filtered.ncrs.length,
      auditors: filtered.auditors.length,
      auditees: filtered.auditees.length,
      responses: filtered.responses.length
    });

    return filtered;
  };

  // Update filtered data and stats
  const updateFilteredData = (department, schedules, ncrs, auditors, auditees, responses) => {
    const filtered = filterDataByDepartment(department, schedules, ncrs, auditors, auditees, responses);
    
    setFilteredSchedules(filtered.schedules);
    setFilteredNCRs(filtered.ncrs);
    setFilteredAuditors(filtered.auditors);
    setFilteredAuditees(filtered.auditees);
    setFilteredResponses(filtered.responses);
    
    const today = new Date();
    const responsesApproved = filtered.responses.filter(r => r.status === 'APPROVED').length;
    const responsesRejected = filtered.responses.filter(r => r.status === 'REJECTED').length;
    const responsesSubmitted = filtered.responses.filter(r => r.status === 'SUBMITTED').length;
    const overdue = filtered.schedules.filter(s => {
      if (!s.scheduledDate) return false;
      return new Date(s.scheduledDate) < today && s.status !== 'COMPLETED' && s.status !== 'REJECTED' && s.status !== 'APPROVED';
    }).length;
    
    setStats({
      totalSchedules: filtered.schedules.length,
      completedSchedules: filtered.schedules.filter(s => s.status === 'COMPLETED').length,
      approved: filtered.schedules.filter(s => s.status === 'APPROVED' || s.detailedApprovalStatus === 'APPROVED').length,
      rejected: filtered.schedules.filter(s => s.status === 'REJECTED').length,
      pendingApproval: filtered.schedules.filter(s => s.status === 'COMPLETED' && s.detailedApprovalStatus !== 'APPROVED').length,
      inProgress: filtered.schedules.filter(s => s.status === 'IN_PROGRESS').length,
      scheduled: filtered.schedules.filter(s => s.status === 'SCHEDULED').length,
      overdue,
      totalNCRs: filtered.ncrs.length,
      openNCRs: filtered.ncrs.filter(n => n.status !== 'CLOSED').length,
      closedNCRs: filtered.ncrs.filter(n => n.status === 'CLOSED').length,
      criticalNCRs: filtered.ncrs.filter(n => n.severity === 'CRITICAL').length,
      majorNCRs: filtered.ncrs.filter(n => n.severity === 'MAJOR').length,
      minorNCRs: filtered.ncrs.filter(n => n.severity === 'MINOR').length,
      totalResponses: filtered.responses.length,
      responsesApproved, responsesRejected, responsesSubmitted,
      ncrApproved: filtered.ncrs.filter(n => n.status === 'APPROVED').length,
      ncrInProgress: filtered.ncrs.filter(n => n.status === 'IN_PROGRESS').length,
      ncrOpen: filtered.ncrs.filter(n => n.status === 'OPEN').length
    });
  };

 const fetchAllData = async (year = selectedYear) => {
  try {
    setLoading(true);
    
    const department = await fetchLeadAuditorDepartment();
    
    console.log('📅 Fetching data for year:', year);
    console.log('👤 Lead Auditor Department:', department);
    
    const [schedulesRes, ncrRes, auditorsRes, auditeesRes, responsesRes] = await Promise.all([
      axios.get(`${API_BASE}/audit-schedule/year/${year}`, { withCredentials: true }),
      axios.get(`${API_BASE}/ncr/all`, { withCredentials: true }).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/audit-schedule/auditors`, { withCredentials: true }).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/audit-schedule/auditees`, { withCredentials: true }).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/templates/responses/all`, { withCredentials: true }).catch(() => ({ data: [] }))
    ]);
    
    let schedules = schedulesRes.data || [];
    let ncrs = ncrRes.data || [];
    const auditors = auditorsRes.data || [];
    const auditees = auditeesRes.data || [];
    let responses = responsesRes.data || [];
    
    // Filter NCRs by year
    ncrs = ncrs.filter(ncr => {
      const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
      if (ncrDate) {
        const ncrYear = new Date(ncrDate).getFullYear();
        return ncrYear === year;
      }
      return false;
    });
    
    // Filter responses by year
    responses = responses.filter(response => {
      const responseYear = response.createdAt ? new Date(response.createdAt).getFullYear() : null;
      return responseYear === year;
    });
    
    console.log('📦 Raw Data Counts for year', year, ':', {
      schedules: schedules.length,
      ncrs: ncrs.length,
      auditors: auditors.length,
      auditees: auditees.length,
      responses: responses.length
    });
    
    if (schedules.length > 0) {
      console.log('📋 Sample Schedule Departments:', schedules.slice(0, 3).map(s => s.department));
    }
    if (ncrs.length > 0) {
      console.log('📋 Sample NCR Departments:', ncrs.slice(0, 3).map(n => n.department));
    }
    if (responses.length > 0) {
      console.log('📋 Sample Response Departments:', responses.slice(0, 3).map(r => r.department));
    }
    
    setAllSchedules(schedules);
    setAllNCRs(ncrs);
    setAllAuditors(auditors);
    setAllAuditees(auditees);
    setAllResponses(responses);
    
    updateFilteredData(department, schedules, ncrs, auditors, auditees, responses);
    
  } catch (error) {
    console.error('Error fetching data:', error);
    addToast('Failed to load dashboard data', 'error');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // Get available years for filter
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2020;
  const endYear = currentYear + 5;
  const years = [];
  for (let i = startYear; i <= endYear; i++) {
    years.push(i);
  }
  return years.sort((a, b) => b - a);
};


  const getScheduledAuditsCount = () => {
  // Only count audits that have a scheduled date and are not draft
  return filteredSchedules.filter(s => {
    if (!s.scheduledDate) return false;
    const scheduledStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'];
    return scheduledStatuses.includes(s.status);
  }).length;
};


  const handleRefresh = () => {
  setRefreshing(true);
  fetchAllData(selectedYear);
};


 // Replace your existing handleViewResponse function
    const handleViewResponse = (response) => {
      const viewPath = getViewPath(response);
      const currentTab = getCurrentTab();
      
      // Option 1: Pass via state (cleaner)
      navigate(viewPath, { 
        state: { 
          returnTo: '/lead-auditor', 
          tab: currentTab 
        } 
      });
    };

  const handleReviewResponseClick = (response) => {
    setReviewingResponse(response);
    setReviewApproved(true);
    setReviewComment('');
  };

  // Replace your existing handleViewNCR function
  const handleViewNCR = (ncr) => {
    const currentTab = getCurrentTab();
  
    // Option 1: Pass via state
    navigate(`/ncr-view/${ncr.id}`, { 
      state: { 
        returnTo: '/lead-auditor', 
        tab: currentTab 
      } 
    });
  };

  // Add this useEffect after your other useEffects (around line 200-250)
useEffect(() => {
  // Check for tab in URL query parameters
  const params = new URLSearchParams(location.search);
  const tabFromUrl = params.get('activeTab');
  
  if (tabFromUrl && ['overview', 'audits', 'responses', 'ncrs', 'auditors', 'auditees'].includes(tabFromUrl)) {
    setActiveTab(tabFromUrl);
  }
  
  // Check for tab in state (from navigation)
  if (location.state?.activeTab) {
    setActiveTab(location.state.activeTab);
    // Clear the state after using
    setTimeout(() => {
      window.history.replaceState({}, document.title);
    }, 100);
  }
}, [location.search, location.state]);

 useEffect(() => { 
  fetchAllData(selectedYear); 
}, [selectedYear]);


useEffect(() => {
  const currentYear = new Date().getFullYear();
  const startYear = 2020;
  const endYear = currentYear + 5;
  const years = [];
  for (let i = startYear; i <= endYear; i++) {
    years.push(i);
  }
  setAvailableYears(years.sort((a, b) => b - a));
}, []);


  // Save selected year to localStorage
useEffect(() => {
  localStorage.setItem('leadAuditorSelectedYear', selectedYear);
}, [selectedYear]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50/30 via-white/50 to-purple-50/30">
        <div className="relative">
          <div className="w-20 h-20 border-4 rounded-full border-indigo-200/50 animate-spin border-t-indigo-600/70" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600/70 to-purple-600/70 animate-pulse" />
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-600/90">Loading dashboard...</p>
        <p className="text-sm text-gray-400/80">Preparing your analytics</p>
      </div>
    );
  }

  const getResponseStatusBadge = (status) => {
    const badges = { 
      'APPROVED': 'bg-gradient-to-r from-emerald-500/80 to-emerald-600/80 text-white shadow-sm', 
      'REJECTED': 'bg-gradient-to-r from-red-500/80 to-red-600/80 text-white shadow-sm', 
      'SUBMITTED': 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white shadow-sm', 
      'DRAFT': 'bg-gradient-to-r from-gray-500/80 to-gray-600/80 text-white shadow-sm' 
    };
    return badges[status] || 'bg-gradient-to-r from-gray-500/80 to-gray-600/80 text-white shadow-sm';
  };

  const notificationCount = stats.pendingApproval + stats.overdue + stats.criticalNCRs + stats.responsesSubmitted;

  const departmentDisplayName = leadAuditorDepartment || 'All Departments';

  return (
    <div className="min-h-screen mt-7 bg-gradient-to-br from-indigo-50/20 via-white/40 to-purple-50/20">
      {/* Animated Background with reduced opacity */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute rounded-full bg-indigo-300/40 -top-40 -right-40 w-80 h-80 mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute rounded-full bg-purple-300/40 -bottom-40 -left-40 w-80 h-80 mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-300/40 top-1/2 left-1/2 w-80 h-80 mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Premium Header with glass morphic effect */}
      <div className="sticky top-0 z-30 border-b shadow-sm backdrop-blur-xl bg-white/30 border-white/20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-r from-indigo-500/80 to-purple-500/80 rounded-xl shadow-lg shadow-indigo-500/20">
                <FiAward className="w-6 h-6 text-white/90" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-indigo-700/90 to-purple-700/90 bg-clip-text">
                  Lead Auditor Command Center
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-500/90">Welcome back, {user?.name || user?.username}</p>
                  <span className="w-1 h-1 rounded-full bg-gray-400/60" />
                  <p className="text-sm font-medium text-indigo-600/90">
                    Department: {departmentDisplayName}
                  </p>
                  <span className="w-1 h-1 rounded-full bg-gray-400/60" />
                  <p className="text-xs text-gray-400/80">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
        <YearFilter 
          selectedYear={selectedYear}
          onYearChange={(newYear) => {
            setSelectedYear(newYear);
          }}
          availableYears={availableYears}
        />
        
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 transition rounded-xl backdrop-blur-sm bg-white/30 hover:bg-white/50 disabled:opacity-50"
          title="Refresh Data"
        >
          <FiRefreshCw className={`w-5 h-5 text-gray-600/90 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
          </div>
        </div>
        
        {/* Premium Navigation */}
        <div className="px-6 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
            <NavTab 
              active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
              icon={FiBarChart2} 
              label="Overview" 
            />
            <NavTab 
              active={activeTab === 'audits'} 
              onClick={() => setActiveTab('audits')} 
              icon={FiCalendar} 
              label="Audits" 
              // count={getScheduledAuditsCount()}  // Changed from filteredSchedules.length
            />
            <NavTab 
              active={activeTab === 'responses'} 
              onClick={() => setActiveTab('responses')} 
              icon={FiFileText} 
              label="CheckSheets" 
              // count={filteredResponses.length}
            />
            <NavTab 
              active={activeTab === 'ncrs'} 
              onClick={() => setActiveTab('ncrs')} 
              icon={FiAlertTriangle} 
              label="NCRs" 
              // count={filteredNCRs.length}
            />
            <NavTab 
              active={activeTab === 'auditors'} 
              onClick={() => setActiveTab('auditors')} 
              icon={FiUsers} 
              label="Auditors" 
              // count={filteredAuditors.length}
            />
            <NavTab 
              active={activeTab === 'auditees'} 
              onClick={() => setActiveTab('auditees')} 
              icon={FiUserCheck} 
              label="Auditees" 
              // count={filteredAuditees.length}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && filteredSchedules.length === 0 && filteredResponses.length === 0 && filteredNCRs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="max-w-md p-6 text-center border bg-white/30 backdrop-blur-sm rounded-2xl border-white/20">
              <FiAlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500/80" />
              <h3 className="mb-2 text-xl font-semibold text-gray-800/90">No Data Available</h3>
              <p className="mb-4 text-gray-600/90">
                No audits, responses, or NCRs found for department: <strong>{departmentDisplayName}</strong>
              </p>
              <p className="text-sm text-gray-500/80">
                This could be because:
                <br />• No data has been created for this department yet
                <br />• The department name in your profile doesn't match the data
                <br />• The system is still loading
              </p>
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 mt-4 text-white transition-colors rounded-lg bg-indigo-600/80 hover:bg-indigo-700/90"
              >
                <FiRefreshCw className="inline w-4 h-4 mr-2" />
                Refresh Data
              </button>
            </div>
          </div>
        ) : activeTab === 'overview' && (
          <DashboardAnalytics 
            stats={stats}
            allSchedules={filteredSchedules}
            allNCRs={filteredNCRs}
            allResponses={filteredResponses}
            carouselSpeed={carouselSpeed}
            setCarouselSpeed={setCarouselSpeed}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            leadAuditorDepartment={leadAuditorDepartment}
            selectedYear={selectedYear}  
          />
        )}

        {/* Audits, Responses, NCRs Tabs */}
        {(activeTab === 'audits' || activeTab === 'responses' || activeTab === 'ncrs') && (
          <AuditsAndResponses 
            activeTab={activeTab}
            allSchedules={filteredSchedules}
            allNCRs={filteredNCRs}
            allResponses={filteredResponses}
            allAuditors={filteredAuditors}
            stats={stats}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            responseViewMode={responseViewMode}
            setResponseViewMode={setResponseViewMode}
            ncrViewMode={ncrViewMode}
            setNcrViewMode={setNcrViewMode}
            onViewResponse={handleViewResponse}
            onReviewResponse={handleReviewResponseClick}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        )}

        {/* Auditors and Auditees Tabs */}
        {(activeTab === 'auditors' || activeTab === 'auditees') && (
          <StakeholderManagement 
            activeTab={activeTab} 
            allAuditors={filteredAuditors}
            allAuditees={filteredAuditees}
            allSchedules={filteredSchedules}
            allResponses={filteredResponses}
            allNCRs={filteredNCRs}
            onViewResponse={handleViewResponse}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        )}
      </div>

      {/* Response Detail Modal */}
      {showResponseDetailModal && selectedResponseForDetail && (
        <ResponseDetailModal 
          response={selectedResponseForDetail}
          onClose={() => {
            setShowResponseDetailModal(false);
            setSelectedResponseForDetail(null);
          }}
        />
      )}

      {/* Review Response Modal with glass morphic effect */}
      {reviewingResponse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <PremiumCard className="w-full max-w-md overflow-hidden bg-white">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">Review Response</h3>
                </div>
                <button 
                  onClick={() => setReviewingResponse(null)} 
                  className="p-1 transition rounded-lg text-white/70 hover:text-white hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 bg-white">
              <div className="p-4 mb-4 border border-gray-200 rounded-xl bg-gray-50">
                <p className="font-semibold text-gray-800">{reviewingResponse.department}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-600">Score: <span className="font-bold text-indigo-600">{reviewingResponse.totalScore}/{reviewingResponse.maxPossibleScore}</span></p>
                  <p className="text-sm text-gray-600">Auditee: <span className="font-medium">{reviewingResponse.auditeeName}</span></p>
                </div>
                <div className="mt-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getResponseStatusBadge(reviewingResponse.status)}`}>
                    {reviewingResponse.status}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${reviewApproved ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 group-hover:border-emerald-300'}`}>
                    {reviewApproved && <FiCheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <input type="radio" checked={reviewApproved} onChange={() => setReviewApproved(true)} className="hidden" />
                  <span className="text-sm font-medium text-gray-700">Approve</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!reviewApproved ? 'border-red-500 bg-red-500' : 'border-gray-300 group-hover:border-red-300'}`}>
                    {!reviewApproved && <FiXCircle className="w-3 h-3 text-white" />}
                  </div>
                  <input type="radio" checked={!reviewApproved} onChange={() => setReviewApproved(false)} className="hidden" />
                  <span className="text-sm font-medium text-gray-700">Reject</span>
                </label>
              </div>
              
              <textarea 
                value={reviewComment} 
                onChange={(e) => setReviewComment(e.target.value)} 
                rows={3} 
                className="w-full p-3 transition bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={reviewApproved ? "Add approval comments (optional)..." : "Please provide reason for rejection..."} 
              />
              
              <div className="flex justify-end gap-3 mt-5">
                <button 
                  onClick={() => setReviewingResponse(null)} 
                  className="px-5 py-2 text-gray-600 transition border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReviewResponse} 
                  disabled={submitting} 
                  className={`px-5 py-2 rounded-xl text-white font-medium transition-all shadow-lg ${
                    reviewApproved 
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' 
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  } disabled:opacity-50`}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    reviewApproved ? 'Approve Response' : 'Reject Response'
                  )}
                </button>
              </div>
            </div>
          </PremiumCard>
        </div>
      )}

     <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default LeadAuditorDashboard;