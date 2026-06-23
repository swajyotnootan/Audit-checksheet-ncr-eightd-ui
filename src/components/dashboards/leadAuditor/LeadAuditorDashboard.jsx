// src/components/dashboards/LeadAuditorDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  FiAward, FiBarChart2, FiCalendar, FiFileText,
  FiAlertTriangle, FiUsers, FiUserCheck, FiRefreshCw,
  FiMenu, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../ToastContext';
import axios from 'axios';
import DashboardAnalytics from './DashboardAnalytics';
import AuditsAndResponses from './AuditsAndResponses';
import StakeholderManagement from './StakeholderManagement';
import ResponseDetailModal from './ResponseDetailModal';
import { useNavigate, useLocation } from 'react-router-dom';
import YearFilter from '../../../components/common/YearFilter';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ============================================================================
// COLOR PALETTE (Matching Audit Manager Dashboard)
// ============================================================================
const NAVBAR_COLORS = {
  primary: '#00529B',
  secondary: '#3b82f6',
  dark: '#1e3a8a',
  light: '#60a5fa',
  lighter: '#93c5fd',
  bg: '#eff6ff',
  white: '#ffffff',
  chartColors: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
};

const animationStyles = `
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  .animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
  .animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  .card-hover { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .card-hover:hover { transform: translateY(-6px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
`;

// ============================================================================
// PREMIUM SIDEBAR
// ============================================================================
const Sidebar = ({ activeTab, setActiveTab, isOpen, stats }) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: <FiBarChart2 className="w-5 h-5" /> },
    { id: 'audits', label: 'Audits', icon: <FiCalendar className="w-5 h-5" />, count: stats.totalSchedules },
    { id: 'responses', label: 'CheckSheets', icon: <FiFileText className="w-5 h-5" />, count: stats.totalResponses },
    { id: 'ncrs', label: 'NCR Management', icon: <FiAlertTriangle className="w-5 h-5" />, count: stats.totalNCRs },
    { id: 'auditors', label: 'Auditors', icon: <FiUsers className="w-5 h-5" /> },
    { id: 'auditees', label: 'Auditees', icon: <FiUserCheck className="w-5 h-5" /> },
  ];

  return (
    <aside 
      className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 shadow-md transition-all duration-500 ease-out overflow-hidden flex flex-col ${isOpen ? 'w-64' : 'w-0 border-r-0'}`}
    >
      <div className="flex-shrink-0 p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl" 
            style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)` }}
          >
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <div className={`${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300`}>
            <h2 className="text-base font-bold leading-tight text-slate-800">Lead Auditor</h2>
            <p className="text-xs text-slate-500 mt-0.5">Command Center</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${activeTab === item.id ? 'text-white font-semibold shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            style={{
              ...(activeTab === item.id ? { 
                background: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)`, 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' 
              } : {})
            }}
          >
            <div className={`flex-shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {item.icon}
            </div>
            <span className={`whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 text-sm`}>
              {item.label}
            </span>
            {item.count !== undefined && item.count !== null && isOpen && (
              <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
const LeadAuditorDashboard = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    if (savedYear) return parseInt(savedYear);
    return new Date().getFullYear();
  });
  const [availableYears, setAvailableYears] = useState([]);

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================
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
    if (checkSheetName.includes('5s') || formName.includes('5s') || formName.includes('5s audit')) return `/fives-view/${response.id}`;
    else if (checkSheetName.includes('manufacturing') || formName.includes('manufacturing') || formName.includes('manufacturing process')) return `/manufacturing-view/${response.id}`;
    else return `/iatf-view/${response.id}`;
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
      await axios.put(`${API_BASE}/templates/responses/${reviewingResponse.id}/${endpoint}`, { comment: reviewComment, signature: 'Lead Auditor' }, { withCredentials: true });
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

  const fetchLeadAuditorDepartment = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users/${user?.id}`, { withCredentials: true });
      const userData = response.data;
      let department = null;
      if (userData.department) {
        department = userData.department;
        if (typeof department === 'object' && department.displayName) department = department.displayName;
        else if (typeof department === 'object' && department.name) department = department.name;
      } else if (userData.departmentName) department = userData.departmentName;
      else if (userData.departmentCode) department = userData.departmentCode;
      setLeadAuditorDepartment(department);
      return department;
    } catch (error) {
      if (user?.department) {
        let dept = user.department;
        if (typeof dept === 'object' && dept.displayName) dept = dept.displayName;
        setLeadAuditorDepartment(dept);
        return dept;
      }
      return null;
    }
  };

  const normalizeDepartment = (dept) => {
    if (!dept) return '';
    let deptStr = String(dept).toUpperCase().trim();
    const deptMap = {
      'HR': 'HR', 'R&D': 'ENGG', 'ENGINEERING': 'ENGG', 'R AND D': 'ENGG',
      'PURCHASE': 'PURCHASE', 'RMS': 'STORES_DESPATCH', 'SQA': 'QA', 'PPC': 'PPC',
      'PRODUCTION': 'PRODUCTION', 'QA/QC': 'QA', 'QA': 'QA', 'QC': 'QA',
      'FGS': 'STORES_DESPATCH', 'MARKETING': 'MARKETING', 'IMS (BE)': 'MR',
      'IMS(BE)': 'MR', 'IMS': 'MR', 'MAINTENANCE': 'PLANT_MAINTENANCE',
      'MANAGEMENT': 'UNIT_HEAD', 'PLANT MAINTENANCE': 'PLANT_MAINTENANCE',
      'TOOL MAINTENANCE': 'TOOL_MAINTENANCE', 'TOOL MANAGEMENT': 'TOOL_MAINTENANCE',
      'STORES & DESPATCH': 'STORES_DESPATCH', 'STORES': 'STORES_DESPATCH',
      'DESPATCH': 'STORES_DESPATCH', 'UNIT HEAD': 'UNIT_HEAD', 'MR': 'MR'
    };
    return deptMap[deptStr] || deptStr;
  };

  const filterDataByDepartment = (department, schedules, ncrs, auditors, auditees, responses) => {
    if (!department) return { schedules, ncrs, auditors, auditees, responses };
    const normalizedTarget = normalizeDepartment(department);
    const filtered = {
      schedules: schedules.filter(s => normalizeDepartment(s.department) === normalizedTarget),
      ncrs: ncrs.filter(n => normalizeDepartment(n.department) === normalizedTarget),
      auditors: auditors.filter(a => normalizeDepartment(a.department || a.departmentName) === normalizedTarget),
      auditees: auditees.filter(a => normalizeDepartment(a.department || a.departmentName) === normalizedTarget),
      responses: responses.filter(r => normalizeDepartment(r.department) === normalizedTarget)
    };
    return filtered;
  };

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

      ncrs = ncrs.filter(ncr => {
        const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
        if (ncrDate) return new Date(ncrDate).getFullYear() === year;
        return false;
      });

      responses = responses.filter(response => {
        const responseYear = response.createdAt ? new Date(response.createdAt).getFullYear() : null;
        return responseYear === year;
      });

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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData(selectedYear);
  };

  const handleViewResponse = (response) => {
    const viewPath = getViewPath(response);
    const currentTab = getCurrentTab();
    navigate(viewPath, { state: { returnTo: '/lead-auditor', tab: currentTab } });
  };

  const handleReviewResponseClick = (response) => {
    setReviewingResponse(response);
    setReviewApproved(true);
    setReviewComment('');
  };

  const handleViewNCR = (ncr) => {
    const currentTab = getCurrentTab();
    navigate(`/ncr-view/${ncr.id}`, { state: { returnTo: '/lead-auditor', tab: currentTab } });
  };

  // ========================================================================
  // EFFECTS
  // ========================================================================
  
  // 1. Handle URL params and state for active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('activeTab');
    if (tabFromUrl && ['overview', 'audits', 'responses', 'ncrs', 'auditors', 'auditees'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      setTimeout(() => window.history.replaceState({}, document.title), 100);
    }
  }, [location.search, location.state]);

  // 2. ⭐️ LISTEN FOR NAVBAR TOGGLE EVENT (THIS FIXES YOUR ISSUE)
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsSidebarOpen(prev => !prev);
    };
    
    window.addEventListener('toggle-lead-auditor-sidebar', handleToggleSidebar);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('toggle-lead-auditor-sidebar', handleToggleSidebar);
    };
  }, []);

  // 3. Fetch data when year changes
  useEffect(() => { 
    fetchAllData(selectedYear); 
  }, [selectedYear]);

  // 4. Initialize available years
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 2020; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years.sort((a, b) => b - a));
  }, []);

  // 5. Save selected year to local storage
  useEffect(() => { 
    localStorage.setItem('leadAuditorSelectedYear', selectedYear); 
  }, [selectedYear]);

  const getResponseStatusBadge = (status) => {
    const badges = {
      'APPROVED': 'bg-emerald-100 text-emerald-700',
      'REJECTED': 'bg-red-100 text-red-700',
      'SUBMITTED': 'bg-blue-100 text-blue-700',
      'DRAFT': 'bg-slate-100 text-slate-700'
    };
    return badges[status] || 'bg-slate-100 text-slate-700';
  };

  const departmentDisplayName = leadAuditorDepartment || 'All Departments';

  // ========================================================================
  // LOADING STATE
  // ========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="text-center">
          <div 
            className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" 
            style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}
          ></div>
          <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // MAIN RENDER
  // ========================================================================
  return (
    <div className="min-h-screen m-0" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} stats={stats} />
      
      {/* Main Content */}
      <main className={`transition-all duration-500 ease-out ${isSidebarOpen ? 'ml-64' : 'ml-0'} pt-6`}>
        <div className="px-6 pb-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fadeInUp">
            <div>
              <h1 className="mb-1 text-3xl font-bold text-slate-800">Lead Auditor Dashboard</h1>
              <p className="text-sm text-slate-500">
                Welcome back, <span className="font-semibold text-slate-700">{user?.name || user?.username}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-medium" style={{ color: NAVBAR_COLORS.primary }}>Dept: {departmentDisplayName}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <YearFilter 
                selectedYear={selectedYear} 
                onYearChange={(newYear) => setSelectedYear(newYear)} 
                availableYears={availableYears} 
              />
              <button 
                onClick={handleRefresh} 
                disabled={refreshing} 
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md card-hover"
              >
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Content Area */}
          {activeTab === 'overview' && filteredSchedules.length === 0 && filteredResponses.length === 0 && filteredNCRs.length === 0 ? (
            <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
              <FiAlertTriangle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="mb-2 text-xl font-semibold text-slate-800">No Data Available</h3>
              <p className="mb-4 text-slate-500">No audits, responses, or NCRs found for department: <strong>{departmentDisplayName}</strong></p>
              <button 
                onClick={handleRefresh} 
                className="px-4 py-2 mt-4 text-white transition-colors rounded-lg shadow-md" 
                style={{ backgroundColor: NAVBAR_COLORS.primary }}
              >
                <FiRefreshCw className="inline w-4 h-4 mr-2" /> Refresh Data
              </button>
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

        {/* Modals */}
        {showResponseDetailModal && selectedResponseForDetail && (
          <ResponseDetailModal 
            response={selectedResponseForDetail} 
            onClose={() => { 
              setShowResponseDetailModal(false); 
              setSelectedResponseForDetail(null); 
            }} 
          />
        )}

        {reviewingResponse && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl animate-scaleIn">
              <div className="px-6 py-4 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.lighter }}>
                      <FiFileText className="w-5 h-5" style={{ color: NAVBAR_COLORS.primary }} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Review Response</h3>
                  </div>
                  <button onClick={() => setReviewingResponse(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">✕</button>
                </div>
              </div>
              <div className="p-6">
                <div className="p-4 mb-4 border rounded-xl bg-slate-50 border-slate-200">
                  <p className="font-semibold text-slate-800">{reviewingResponse.department}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-slate-600">Score: <span className="font-bold" style={{ color: NAVBAR_COLORS.primary }}>{reviewingResponse.totalScore}/{reviewingResponse.maxPossibleScore}</span></p>
                    <p className="text-sm text-slate-600">Auditee: <span className="font-medium">{reviewingResponse.auditeeName}</span></p>
                  </div>
                  <div className="mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getResponseStatusBadge(reviewingResponse.status)}`}>{reviewingResponse.status}</span>
                  </div>
                </div>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${reviewApproved ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                      {reviewApproved && <FiCheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <input type="radio" checked={reviewApproved} onChange={() => setReviewApproved(true)} className="hidden" />
                    <span className="text-sm font-medium text-slate-700">Approve</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!reviewApproved ? 'border-red-500 bg-red-500' : 'border-slate-300'}`}>
                      {!reviewApproved && <FiXCircle className="w-3 h-3 text-white" />}
                    </div>
                    <input type="radio" checked={!reviewApproved} onChange={() => setReviewApproved(false)} className="hidden" />
                    <span className="text-sm font-medium text-slate-700">Reject</span>
                  </label>
                </div>
                <textarea 
                  value={reviewComment} 
                  onChange={(e) => setReviewComment(e.target.value)} 
                  rows={3} 
                  className="w-full p-3 transition bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder={reviewApproved ? "Add approval comments (optional)..." : "Please provide reason for rejection..."} 
                />
                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={() => setReviewingResponse(null)} className="px-5 py-2 transition border text-slate-600 border-slate-300 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button 
                    onClick={handleReviewResponse} 
                    disabled={submitting} 
                    className={`px-5 py-2 rounded-xl text-white font-medium transition-all shadow-md ${reviewApproved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} disabled:opacity-50`}
                  >
                    {submitting ? 'Processing...' : (reviewApproved ? 'Approve Response' : 'Reject Response')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeadAuditorDashboard;