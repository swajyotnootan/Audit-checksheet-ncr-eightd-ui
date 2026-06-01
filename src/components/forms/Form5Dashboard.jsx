// src/components/forms/Form5Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { 
  FiCalendar, FiCheckCircle, FiClock, FiAlertCircle, 
  FiArrowRight, FiFileText, FiUsers, FiUserCheck, 
  FiTrendingUp, FiEye, FiRefreshCw, FiPlus, FiEdit2,
  FiBarChart2, FiGrid, FiList, FiDownload, FiPrinter, FiInfo
} from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';


const Form5Dashboard = () => {
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
const urlYear = searchParams.get('year');
  
const [selectedYear, setSelectedYear] = useState(
  urlYear ? parseInt(urlYear) : new Date().getFullYear()
);  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMonths: 0,
    approvedMonths: 0,
    pendingMonths: 0,
    draftMonths: 0,
    rejectedMonths: 0,
    totalSchedules: 0
  });
  
const [availableYears, setAvailableYears] = useState([]);
  
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };
  
  const financialMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const monthColors = {
    "Apr": "from-emerald-500 to-teal-500",
    "May": "from-blue-500 to-cyan-500",
    "Jun": "from-indigo-500 to-purple-500",
    "Jul": "from-purple-500 to-pink-500",
    "Aug": "from-pink-500 to-rose-500",
    "Sep": "from-orange-500 to-amber-500",
    "Oct": "from-amber-500 to-yellow-500",
    "Nov": "from-lime-500 to-green-500",
    "Dec": "from-green-500 to-emerald-500",
    "Jan": "from-cyan-500 to-blue-500",
    "Feb": "from-sky-500 to-indigo-500",
    "Mar": "from-violet-500 to-purple-500"
  };
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = response.data || [];
      setAvailableMonths(months);
      
      // Calculate stats
      const approved = months.filter(m => m.approvalStatus === 'APPROVED' && m.hasPlannedAudits).length;
      const pending = months.filter(m => m.approvalStatus === 'PENDING_APPROVAL').length;
      const draft = months.filter(m => m.approvalStatus === 'DRAFT').length;
      const rejected = months.filter(m => m.approvalStatus === 'REJECTED').length;
      const totalSchedules = months.reduce((sum, m) => sum + (m.scheduleCount || 0), 0);
      
      setStats({
        totalMonths: months.filter(m => m.hasPlannedAudits).length,
        approvedMonths: approved,
        pendingMonths: pending,
        draftMonths: draft,
        rejectedMonths: rejected,
        totalSchedules: totalSchedules
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
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
  
  const handleMonthClick = (month) => {
    navigate('/form5', {
      state: { 
        preselectedYear: selectedYear, 
        preselectedMonth: month.month 
      }
    });
  };
  
  const handleCreateNew = () => {
    navigate('/form5', {
      state: { 
        preselectedYear: selectedYear, 
        preselectedMonth: null 
      }
    });
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
            <FiCheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
            <FiClock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-rose-100 text-rose-700">
            <FiAlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
            <FiFileText className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                <FiFileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Internal Quality Audit Schedule</h1>
                <p className="text-sm text-slate-500 mt-0.5">Form 5 - Month-wise Audit Planning (IATF16949)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year} - {year + 1}</option>
                ))}
              </select>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-sm"
              >
                <FiPlus className="w-4 h-4" />
                Create New Schedule
              </button>
              <button
                onClick={fetchData}
                className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total Months</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalMonths}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-emerald-600">Approved</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.approvedMonths}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-amber-600">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pendingMonths}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-500">Draft</p>
            <p className="text-2xl font-bold text-slate-500">{stats.draftMonths}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-rose-600">Rejected</p>
            <p className="text-2xl font-bold text-rose-600">{stats.rejectedMonths}</p>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4 shadow-sm">
            <p className="text-xs text-indigo-600">Total Schedules</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.totalSchedules}</p>
          </div>
        </div>
        
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FiInfo className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">How to use Form 5</p>
              <p className="text-xs text-blue-600 mt-1">
                Select a month below to create week-wise audit schedules. After completing all weeks, submit for approval.
                Once approved, you can create daily schedules with specific time slots.
              </p>
            </div>
          </div>
        </div>
        
        {/* Month Grid Cards */}
        {availableMonths.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <FiCalendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No months available for {selectedYear}</p>
            <p className="text-sm text-slate-400 mt-2">Please complete Form 4 (Department Audit Plan) first.</p>
            <button
              onClick={() => navigate('/form4')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              Go to Form 4
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {financialMonths.map(month => {
              const monthData = availableMonths.find(m => m.month === month);
              const hasPlannedAudits = monthData?.hasPlannedAudits || false;
              const approvalStatus = monthData?.approvalStatus || 'DRAFT';
              const scheduleCount = monthData?.scheduleCount || 0;
              const isDisabled = !hasPlannedAudits;
              
              // Don't show months without planned audits
              if (!hasPlannedAudits) return null;
              
              const gradientColor = monthColors[month] || "from-gray-500 to-gray-600";
              
              return (
                <div
                  key={month}
                  onClick={() => !isDisabled && handleMonthClick(monthData)}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all cursor-pointer
                    ${!isDisabled 
                      ? 'border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1' 
                      : 'border-slate-200 opacity-60 cursor-not-allowed'
                    }`}
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-r ${gradientColor} px-4 py-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">{monthDisplay[month]}</h3>
                      {getStatusBadge(approvalStatus)}
                    </div>
                    <p className="text-white/80 text-sm mt-1">{selectedYear}</p>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                      <FiCalendar className="w-4 h-4" />
                      <span>Financial Year {selectedYear}-{selectedYear+1}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <FiFileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Schedules</p>
                          <p className="text-lg font-bold text-slate-800">{scheduleCount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Status</p>
                          <p className="text-sm font-medium text-slate-700">
                            {approvalStatus === 'APPROVED' ? 'Ready for Daily Schedule' : 
                             approvalStatus === 'PENDING_APPROVAL' ? 'Awaiting Approval' :
                             approvalStatus === 'REJECTED' ? 'Needs Revision' : 'In Progress'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {!isDisabled && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-indigo-600">
                          {approvalStatus === 'APPROVED' ? '✓ Approved - Can create daily schedule' :
                           approvalStatus === 'PENDING_APPROVAL' ? '⏳ Waiting for approval' :
                           approvalStatus === 'REJECTED' ? '✗ Needs correction' : '📝 Draft - Complete and submit'}
                        </span>
                        <FiArrowRight className="w-4 h-4 text-indigo-600" />
                      </div>
                    )}
                    
                    {isDisabled && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-400">Complete Form 4 first</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Legend */}
        <div className="mt-8 p-4 bg-white rounded-2xl border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Status Legend</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded"></div>
              <span className="text-slate-600">Approved - Ready for daily scheduling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
              <span className="text-slate-600">Pending Approval - Waiting for review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-rose-100 border border-rose-300 rounded"></div>
              <span className="text-slate-600">Rejected - Needs correction</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-100 border border-slate-300 rounded"></div>
              <span className="text-slate-600">Draft - In progress, not submitted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Form5Dashboard;