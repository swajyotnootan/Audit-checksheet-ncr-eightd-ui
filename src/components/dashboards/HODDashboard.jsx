// src/components/dashboards/HODDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, CheckCircle, Clock, User, Calendar, 
  AlertCircle, FileText, Users, Eye, Zap, TrendingUp,
  UserCheck, UserX, RefreshCw, BarChart3
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Status Badge Component
const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch(status?.toUpperCase()) {
      case 'COMPLETED':
      case 'CLOSED':
        return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', label: 'Completed', icon: '✅' };
      case 'IN_PROGRESS':
        return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', label: 'In Progress', icon: '🔄' };
      case 'APPROVAL_PENDING':
      case 'Approval Pending':
        return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Awaiting Approval', icon: '⏳' };
      case 'D0_APPROVED':
      case 'D0 Approved':
        return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'D0 Approved', icon: '✅' };
      case 'REJECTED':
        return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', label: 'Rejected', icon: '❌' };
      case 'DRAFT':
        return { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', label: 'Draft', icon: '📝' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', label: status || 'Pending', icon: '📄' };
    }
  };
  const config = getStatusConfig(status);
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border} flex items-center gap-1`}>
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
};

// Action Card Component (Matches InitiatorDashboard)
const ActionCard = ({ title, description, icon: Icon, colorTheme, onClick }) => {
  const themes = {
    purple: {
      gradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-gradient-to-br from-purple-100 to-pink-100',
      iconColor: 'text-purple-600',
      buttonGradient: 'from-purple-100 to-pink-100',
      buttonHover: 'hover:from-purple-400 hover:to-pink-400',
      borderHover: 'hover:border-purple-300',
      titleHover: 'group-hover:text-purple-900'
    },
    blue: {
      gradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100',
      iconColor: 'text-blue-600',
      buttonGradient: 'from-blue-100 to-indigo-100',
      buttonHover: 'hover:from-blue-400 hover:to-indigo-400',
      borderHover: 'hover:border-blue-300',
      titleHover: 'group-hover:text-blue-900'
    }
  };

  const theme = themes[colorTheme] || themes.purple;

  return (
    <div
      onClick={onClick}
      className={`relative p-8 overflow-hidden transition-all duration-500 ease-out bg-white border border-gray-100 shadow-lg cursor-pointer rounded-3xl hover:shadow-2xl ${theme.borderHover} hover:-translate-y-2 group h-full flex flex-col`}
    >
      <div className={`absolute inset-0 transition-all duration-500 pointer-events-none bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-40 rounded-3xl`}></div>
     
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]`}>
        <div className="w-full h-full bg-white rounded-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-center w-20 h-20 mb-6 transition-all duration-500 shadow-sm rounded-2xl group-hover:scale-110 group-hover:rotate-3 mx-auto bg-gradient-to-br from-gray-50 to-gray-100">
           <div className={`w-16 h-16 flex items-center justify-center rounded-xl ${theme.iconBg}`}>
             <Icon className={`w-8 h-8 ${theme.iconColor}`} />
           </div>
        </div>

        <div className="text-center mb-8 flex-grow">
          <h3 className={`text-2xl font-bold text-gray-900 mb-3 transition-colors ${theme.titleHover}`}>
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        </div>

        <div className={`flex items-center justify-center w-full gap-2 px-4 py-4 font-medium transition-all duration-300 bg-gradient-to-r ${theme.buttonGradient} ${theme.buttonHover} text-slate-700 rounded-xl group-hover:shadow-md mt-auto`}>
          <span className="text-lg">Go to Dashboard</span>
          <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
};

// 8D Approval Card Component
const ApprovalCard = ({ report, onReview }) => {
  return (
    <div
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 flex flex-col border border-amber-200 bg-gradient-to-br from-amber-50 to-white cursor-pointer hover:-translate-y-1"
    >
      {/* Awaiting Approval Banner */}
      <div className="mb-3 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full text-center shadow inline-block w-fit">
        ⚡ Awaiting HOD Approval
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <StatusBadge status="Approval Pending" />
      </div>

      {/* Title */}
      <div className="text-lg font-bold text-slate-800 truncate mb-1">
        {report?.title || report?.eventNo || '8D Report'}
      </div>

      {/* Owner */}
      <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
        <User size={12} />
        Owner: {report?.initiatorEmail || 'Unassigned'}
      </div>

      {/* Created Date */}
      <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
        <Calendar size={12} />
        Created: {report?.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}
      </div>

      {/* Action Button */}
      <div className="mt-auto pt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReview();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all duration-300 font-medium"
        >
          <Eye size={16} />
          Review & Approve
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

const isApprovalPendingStatus = (status) => {
  return String(status || '').toLowerCase() === 'approval pending'
    || String(status || '').toLowerCase() === 'approval_pending';
};

const isNcrBasedEvent = (event) => {
  const d0Data = Array.isArray(event?.content?.d0) ? event.content.d0[0] : null;
  return Boolean(
    d0Data?.sourceNcrId ||
    d0Data?.sourceNcrNumber ||
    String(event?.eventNo || '').startsWith('8D-')
  );
};

const HODDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    freshPendingApprovals: 0,
    ncrPendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://qsutrarmsclm.hub.swajyot.co.in:8476';

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/eightd/data?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        // Filter events pending approval
        const pending = response.data.data.filter(event => 
          isApprovalPendingStatus(event.status)
        );
        const freshPending = pending.filter((event) => !isNcrBasedEvent(event));
        const ncrPending = pending.filter((event) => isNcrBasedEvent(event));
        
        setPendingApprovals(pending);
        setStats({
          pendingApprovals: pending.length,
          freshPendingApprovals: freshPending.length,
          ncrPendingApprovals: ncrPending.length
        });
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (event) => {
    navigate('/eightd-dashboard', { 
      state: { 
        selectedEventId: event.eventNo 
      } 
    });
  };

  const handleViewDashboard = (type = 'all') => {
    navigate('/eightd-dashboard', {
      state: type === 'all' ? {} : { type }
    });
  };

  const freshPendingApprovals = pendingApprovals.filter((event) => !isNcrBasedEvent(event));
  const ncrPendingApprovals = pendingApprovals.filter((event) => isNcrBasedEvent(event));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading HOD Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Welcome Section */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            HOD Dashboard
          </h1>
          <p className="text-gray-500">Welcome back, {user?.name || user?.username}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              {user?.department || 'Quality Assurance'}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Head of Department
            </span>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Approvals</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Department</p>
                <p className="text-xl font-bold text-gray-800">{user?.department || 'Quality'}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Role</p>
                <p className="text-xl font-bold text-gray-800">HOD</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards - Same as InitiatorDashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <ActionCard 
            title="Fresh 8D Dashboard"
            description={`Review fresh 8D reports only. ${stats.freshPendingApprovals} item(s) are waiting for HOD action.`}
            icon={BarChart3}
            colorTheme="purple"
            onClick={() => handleViewDashboard('fresh')}
          />

          <ActionCard 
            title="NCR 8D Dashboard"
            description={`Review NCR-based 8D reports only. ${stats.ncrPendingApprovals} item(s) are waiting for HOD action.`}
            icon={UserCheck}
            colorTheme="blue"
            onClick={() => handleViewDashboard('ncr')}
          />
        </div>

        {/* Fresh Pending Approvals Section */}
        {freshPendingApprovals.length > 0 && (
          <>
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20 px-4">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Fresh 8D Awaiting Approval
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {freshPendingApprovals.map((event) => (
                <ApprovalCard
                  key={event.eventNo}
                  report={event}
                  onReview={() => handleReview(event)}
                />
              ))}
            </div>
          </>
        )}

        {/* NCR Pending Approvals Section */}
        {ncrPendingApprovals.length > 0 && (
          <>
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20 px-4">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  NCR 8D Awaiting Approval
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ncrPendingApprovals.map((event) => (
                <ApprovalCard
                  key={event.eventNo}
                  report={event}
                  onReview={() => handleReview(event)}
                />
              ))}
            </div>
          </>
        )}

        {/* No Pending Approvals Message */}
        {pendingApprovals.length === 0 && (
          <div className="text-center py-12 bg-white/50 rounded-3xl border border-dashed border-gray-300">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No pending approvals</p>
            <p className="text-gray-400 text-sm mt-1">All 8D reports are approved or in progress</p>
            <button
              onClick={fetchPendingApprovals}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:text-purple-700"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HODDashboard;
