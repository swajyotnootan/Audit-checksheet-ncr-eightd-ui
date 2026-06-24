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



const NAVBAR_COLORS = {
    primary1: "#005f9b",
    primary: '#00799b',
    secondary: '#3b82f6',
    dark: '#1e3a8a',
    light: '#60a5fa',
    lighter: '#93c5fd',
    bg: '#eff6ff',
    white: '#ffffff',
};

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


const ActionCard = ({ title, description, icon: Icon, colorTheme, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Themes mapped to NAVBAR_COLORS (keeping your 'purple' and 'blue' keys)
  const themes = {
    purple: {
      cardBg: `linear-gradient(135deg, ${NAVBAR_COLORS.bg} 0%, ${NAVBAR_COLORS.white} 100%)`,
      iconOuterBg: `linear-gradient(135deg, ${NAVBAR_COLORS.bg} 0%, ${NAVBAR_COLORS.lighter}40 100%)`, // Subtle light blue bg
      iconBg: `linear-gradient(135deg, ${NAVBAR_COLORS.lighter} 0%, ${NAVBAR_COLORS.light} 100%)`,
      iconColor: NAVBAR_COLORS.white,
      buttonBg: `linear-gradient(135deg, ${NAVBAR_COLORS.bg} 0%, ${NAVBAR_COLORS.lighter} 100%)`, // Subtle button bg
      buttonText: NAVBAR_COLORS.primary, // Colored text when not hovered
      buttonHoverBg: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)`,
      buttonHoverText: NAVBAR_COLORS.white,
      borderColor: NAVBAR_COLORS.lighter,
      borderHoverColor: NAVBAR_COLORS.secondary,
      titleHoverColor: NAVBAR_COLORS.primary1,
      accentGradient: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 50%, ${NAVBAR_COLORS.light} 100%)`,
    },
    blue: {
      cardBg: `linear-gradient(135deg, ${NAVBAR_COLORS.white} 0%, ${NAVBAR_COLORS.bg} 100%)`,
      iconOuterBg: `linear-gradient(135deg, ${NAVBAR_COLORS.bg} 0%, ${NAVBAR_COLORS.lighter}40 100%)`, // Subtle light blue bg
      iconBg: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)`,
      iconColor: NAVBAR_COLORS.white,
      buttonBg: `linear-gradient(135deg, ${NAVBAR_COLORS.lighter} 0%, ${NAVBAR_COLORS.bg} 100%)`, // Subtle button bg
      buttonText: NAVBAR_COLORS.primary, // Colored text when not hovered
      buttonHoverBg: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)`,
      buttonHoverText: NAVBAR_COLORS.white,
      borderColor: NAVBAR_COLORS.lighter,
      borderHoverColor: NAVBAR_COLORS.primary,
      titleHoverColor: NAVBAR_COLORS.primary1,
      accentGradient: `linear-gradient(135deg, ${NAVBAR_COLORS.dark} 0%, ${NAVBAR_COLORS.primary} 50%, ${NAVBAR_COLORS.secondary} 100%)`,
    }
  };

  const theme = themes[colorTheme] || themes.purple;

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col h-full p-8 overflow-hidden transition-all duration-500 ease-out bg-white border shadow-lg cursor-pointer rounded-3xl hover:shadow-2xl hover:-translate-y-2 group"
      style={{
        borderColor: isHovered ? theme.borderHoverColor : theme.borderColor,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover gradient overlay */}
      <div
        className="absolute inset-0 transition-all duration-500 opacity-0 pointer-events-none group-hover:opacity-40 rounded-3xl"
        style={{ background: theme.cardBg }}
      ></div>

      {/* Animated border gradient on hover */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]"
        style={{ background: theme.accentGradient }}
      >
        <div className="w-full h-full bg-white rounded-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Icon / Badge with subtle default background */}
        <div 
          className="flex items-center justify-center w-20 h-20 mx-auto mb-6 transition-all duration-500 shadow-sm rounded-2xl group-hover:scale-110 group-hover:rotate-3"
          style={{ background: theme.iconOuterBg }}
        >
          <div
            className="flex items-center justify-center w-16 h-16 transition-all duration-500 rounded-xl"
            style={{ background: theme.iconBg }}
          >
            <Icon className="w-8 h-8" style={{ color: theme.iconColor }} />
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex-grow mb-8 text-center">
          <h3
            className="mb-3 text-2xl font-bold transition-colors duration-300"
            style={{ color: isHovered ? theme.titleHoverColor : '#111827' }} // #111827 is Tailwind's text-gray-900
          >
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        </div>

        {/* Button with subtle default background and colored text */}
        <div
          className="flex items-center justify-center w-full gap-2 px-4 py-4 mt-auto font-medium transition-all duration-300 rounded-xl group-hover:shadow-md"
          style={{ 
            background: isHovered ? theme.buttonHoverBg : theme.buttonBg,
            color: isHovered ? theme.buttonHoverText : theme.buttonText
          }}
        >
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
      className="flex flex-col p-5 transition-all duration-300 bg-white border shadow-lg cursor-pointer rounded-2xl hover:shadow-2xl border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:-translate-y-1"
    >
      {/* Awaiting Approval Banner */}
      <div className="mb-3 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full text-center shadow inline-block w-fit">
        ⚡ Awaiting HOD Approval
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <StatusBadge status="Approval Pending" />
      </div>

      {/* Title */}
      <div className="mb-1 text-lg font-bold truncate text-slate-800">
        {report?.title || report?.eventNo || '8D Report'}
      </div>

      {/* Owner */}
      <div className="flex items-center gap-1 mb-2 text-xs text-slate-500">
        <User size={12} />
        Owner: {report?.initiatorEmail || 'Unassigned'}
      </div>

      {/* Created Date */}
      <div className="flex items-center gap-1 mb-3 text-xs text-slate-500">
        <Calendar size={12} />
        Created: {report?.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}
      </div>

      {/* Action Button */}
      <div className="pt-3 mt-auto">
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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';

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
            <div className="w-12 h-12 mx-auto border-b-2 border-purple-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Loading HOD Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-blue-50 from-gray-50 via-purple-50/30 to-pink-50/20" >
      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <div className="mb-10 text-center">
          <h1 className="p-2 text-4xl font-bold text-transparent bg-clip-text" 
            style={{ backgroundImage: `linear-gradient(135deg, ${NAVBAR_COLORS.primary1} 0%, ${NAVBAR_COLORS.secondary} 100%)` }}>
            HOD Dashboard
          </h1>
          <p className="text-gray-500">Welcome back, {user?.name || user?.username}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
              {user?.department || 'Quality Assurance'}
            </span>
            <span className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
              Head of Department
            </span>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-3">
          <div className="p-6 bg-white border shadow-lg rounded-2xl border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                <p className="text-3xl font-bold text-black" >{stats.pendingApprovals}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl " style={{background:NAVBAR_COLORS.primary1}}>
                <Clock className="w-6 h-6 text-white" style={{background:NAVBAR_COLORS.primary1}}/>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white border shadow-lg rounded-2xl border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="text-xl font-bold text-gray-800">{user?.department || 'Quality'}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl " style={{background:NAVBAR_COLORS.primary1}}>
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="p-6 bg-white border shadow-lg rounded-2xl border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Role</p>
                <p className="text-xl font-bold text-gray-800">HOD</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{background:NAVBAR_COLORS.primary1}}>
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards - Same as InitiatorDashboard */}
        <div className="grid grid-cols-1 gap-8 mb-12 md:grid-cols-2">
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
              <div className="relative px-4 bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20">
                <span className="text-sm font-medium tracking-wider text-gray-500 uppercase">
                  Fresh 8D Awaiting Approval
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              <div className="relative px-4 bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20">
                <span className="text-sm font-medium tracking-wider text-gray-500 uppercase">
                  NCR 8D Awaiting Approval
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          <div className="py-12 text-center border border-gray-300 border-dashed bg-white/50 rounded-3xl">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{color:NAVBAR_COLORS.primary1}}/>
            <p className="text-lg text-gray-500">No pending approvals</p>
            <p className="mt-1 text-sm text-gray-400">All 8D reports are approved or in progress</p>
            <button
              onClick={fetchPendingApprovals}
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm" style={{color:NAVBAR_COLORS.primary1}}
            >
              <RefreshCw size={14} style={{color:NAVBAR_COLORS.primary1}}/>
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HODDashboard;
