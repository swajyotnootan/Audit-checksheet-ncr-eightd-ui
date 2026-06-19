// src/components/dashboards/AuditManagerDashboard.jsx
// CLOCKWISE WORKFLOW VERSION - 4 Cards in Circular Flow

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom'; // Add this at the top
import { useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiCheckCircle, FiAlertCircle, FiClock, 
  FiBarChart2, FiUsers, FiFileText, FiTrendingUp, 
  FiGrid, FiRefreshCw, FiMessageSquare, FiCheck, 
  FiX, FiUserCheck, FiHome, FiArrowRight, FiDownload,
  FiLock, FiActivity, FiFolder, FiClipboard, FiMaximize2,
  FiMinimize2, FiChevronRight, FiArrowRightCircle, FiArrowUpCircle,
  FiArrowDownCircle, FiMessageCircle, FiArrowLeftCircle,FiEye  
} from 'react-icons/fi';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import YearFilter from '../../components/common/YearFilter';


const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090
/api';

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
const StatCard = ({ title, value, icon, onClick, trend, subtitle, color }) => {
  const colorConfig = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100', hover: 'hover:border-blue-200' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100', hover: 'hover:border-green-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100', hover: 'hover:border-amber-200' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100', hover: 'hover:border-rose-200' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', hover: 'hover:border-indigo-200' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100', hover: 'hover:border-purple-200' }
  };
  
  const styles = colorConfig[color] || colorConfig.blue;
  
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-xl border ${styles.border} p-4 transition-all duration-300
        ${onClick ? `cursor-pointer hover:shadow-md ${styles.hover}` : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${styles.bg} ${styles.icon}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
};

// ============================================================================
// CLOCKWISE WORKFLOW CARD COMPONENT (with direction arrows)
// ============================================================================
const ClockwiseWorkflowCard = ({ 
  stepNumber, 
  title, 
  description, 
  status, 
  onClick, 
  disabled,
  direction, // 'right', 'down', 'left', 'up'
  color 
}) => {
  const colorConfig = {
    blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-600' },
    emerald: { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-600' },
    indigo: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', iconBg: 'bg-indigo-600' },
    teal: { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', iconBg: 'bg-teal-600' }
  };
  
  const styles = colorConfig[color] || colorConfig.blue;
  
  const getDirectionIcon = () => {
    switch(direction) {
      case 'right': return <FiArrowRightCircle className="w-5 h-5 text-gray-400" />;
      case 'down': return <FiArrowDownCircle className="w-5 h-5 text-gray-400" />;
      case 'left': return <FiChevronRight className="w-5 h-5 text-gray-400 rotate-180" />;
      case 'up': return <FiArrowUpCircle className="w-5 h-5 text-gray-400" />;
      default: return null;
    }
  };
  
  const getStatusBadge = () => {
    if (status === 'APPROVED') {
      return <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Approved</span>;
    }
    if (status === 'PENDING') {
      return <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">⏳ Pending</span>;
    }
    if (status === 'LOCKED') {
      return <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">🔒 Locked</span>;
    }
    if (status === 'READY') {
      return <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">✓ Ready</span>;
    }
    return null;
  };
  
  return (
    <div className="relative">
      <div 
        onClick={disabled ? null : onClick}
        className={`
          relative bg-white rounded-xl border-2 p-4 transition-all duration-300
          ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200' : `cursor-pointer hover:shadow-lg ${styles.border} ${styles.hover}`}
        `}
      >
        {/* Step Number Circle */}
        <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${styles.iconBg}`}>
          {stepNumber}
        </div>
        
        {/* Direction Arrow on the edge */}
        {direction && (
          <div className="absolute p-1 -translate-y-1/2 bg-white rounded-full shadow-md -right-3 top-1/2">
            {getDirectionIcon()}
          </div>
        )}
        
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            {getStatusBadge()}
          </div>
          <p className="mb-3 text-sm text-gray-500">{description}</p>
          {!disabled && (
            <div className="flex items-center gap-1 text-sm font-medium" style={{ color: styles.text.replace('text-', '') }}>
              <span>Click to {status === 'APPROVED' ? 'View' : 'Start'}</span>
              <FiArrowRight className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WORKFLOW STEP COMPONENT WITH ARROWS
// ============================================================================
const WorkflowStepWithArrow = ({ label, status, step, isActive, onClick, showArrow, isLast }) => {
  let statusConfig = {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-500',
    icon: null,
    shadow: ''
  };
  
  if (status === 'APPROVED') {
    statusConfig = {
      bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      border: 'border-green-500',
      text: 'text-green-700',
      icon: <FiCheckCircle className="w-5 h-5 text-white" />,
      shadow: 'shadow-lg shadow-green-200'
    };
  } else if (status === 'PENDING_APPROVAL') {
    statusConfig = {
      bg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      border: 'border-amber-500',
      text: 'text-amber-700',
      icon: <FiClock className="w-5 h-5 text-white" />,
      shadow: 'shadow-lg shadow-amber-200'
    };
  } else if (status === 'REJECTED') {
    statusConfig = {
      bg: 'bg-gradient-to-br from-red-500 to-rose-500',
      border: 'border-red-500',
      text: 'text-red-700',
      icon: <FiAlertCircle className="w-5 h-5 text-white" />,
      shadow: 'shadow-lg shadow-red-200'
    };
  } else if (status === 'READY') {
    statusConfig = {
      bg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
      border: 'border-blue-500',
      text: 'text-blue-700',
      icon: <FiActivity className="w-5 h-5 text-white" />,
      shadow: 'shadow-lg shadow-blue-200'
    };
  }
  
  const isLocked = status === 'LOCKED';
  
  return (
    <div className="flex items-center flex-1">
      <div 
        onClick={isLocked ? null : onClick}
        className={`flex flex-col items-center ${!isLocked && onClick ? 'cursor-pointer' : ''}`}
      >
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
          ${isLocked ? 'bg-gray-100 border-gray-200 text-gray-400' : statusConfig.bg}
          ${!isLocked && !statusConfig.bg ? 'bg-white border-gray-300' : ''}
          ${isActive && !isLocked ? 'ring-4 ring-blue-300 ring-offset-2 scale-105' : ''}
          ${!isLocked && statusConfig.shadow}
        `}>
          {statusConfig.icon || (!isLocked && <span className="text-lg font-bold text-gray-600">{step}</span>)}
          {isLocked && <FiLock className="w-4 h-4" />}
        </div>
        <p className={`text-sm font-medium mt-3 ${isLocked ? 'text-gray-400' : statusConfig.text || 'text-gray-600'}`}>
          {label}
        </p>
        {isActive && !isLocked && (
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 animate-pulse"></div>
        )}
      </div>
      
      {showArrow && !isLast && (
        <div className="flex justify-center flex-1 px-4">
          <div className="relative flex justify-center w-full">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
            <FiArrowRightCircle className="z-10 w-5 h-5 -mt-2 text-gray-400 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ACTION BUTTON COMPONENT (Simplified)
// ============================================================================
const ActionButton = ({ icon, label, description, onClick, disabled, color, isLarge = false }) => {
  const colorConfig = {
    blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    indigo: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    teal: { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' }
  };
  
  const styles = colorConfig[color] || colorConfig.blue;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-xl border transition-all duration-300
        ${disabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50' : `${styles.bg} ${styles.border} hover:shadow-md ${styles.hover}`}
        ${isLarge ? 'py-5' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${disabled ? 'bg-gray-100' : styles.bg}`}>
            {icon}
          </div>
          <div>
            <p className={`font-medium ${disabled ? 'text-gray-400' : styles.text}`}>
              {label}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        {!disabled && <FiArrowRight className="w-5 h-5 text-gray-400" />}
      </div>
    </button>
  );
};

// ============================================================================
// NCR CARD COMPONENT
// ============================================================================
const NcrCard = ({ title, description, icon, color, count, onClick, badgeText, isLarge = false }) => {
  const colorConfig = {
    indigo: { 
      bg: 'bg-gradient-to-br from-indigo-100/40 to-indigo-200/40',  // 40% opacity
      hover: 'hover:from-indigo-100/60 hover:to-indigo-200/60', 
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-100/60'
    },
    rose: { 
      bg: 'bg-gradient-to-br from-rose-100/40 to-rose-200/40',  // 40% opacity
      hover: 'hover:from-rose-100/60 hover:to-rose-200/60', 
      text: 'text-rose-700',
      border: 'border-rose-200',
      iconBg: 'bg-rose-100/60'
    },
    emerald: { 
      bg: 'bg-gradient-to-br from-emerald-100/40 to-emerald-200/40',  // 40% opacity
      hover: 'hover:from-emerald-100/60 hover:to-emerald-200/60', 
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100/60'
    }
  };
  
  const styles = colorConfig[color] || colorConfig.indigo;
  
  return (
    <div 
      onClick={onClick}
      className={`
        ${styles.bg} rounded-xl p-5 cursor-pointer 
        transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg 
        border ${styles.border} ${styles.hover}
        ${isLarge ? 'p-6' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl ${styles.iconBg} ${styles.text}`}>
            {icon}
          </div>
          <div>
            <h3 className={`text-base font-bold ${styles.text}`}>{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{description}</p>
          </div>
        </div>
        <FiChevronRight className={`w-5 h-5 ${styles.text} opacity-60`} />
      </div>
      <div className={`mt-3 ${styles.iconBg} rounded-full px-3 py-1 inline-block`}>
        <span className={`text-xs font-medium ${styles.text}`}>{badgeText || `${count} items`}</span>
      </div>
    </div>
  );
};



// ============================================================================
// REQUEST CARD COMPONENT - View button only on card, actions in modal
// ============================================================================
const RequestCard = ({ request, onView, isLarge = false }) => {
  const getTypeStyles = () => {
    if (request.type === 'RESCHEDULE') {
      return { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Reschedule', icon: '📅' };
    }
    return { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Extension', icon: '⏰' };
  };
  
  const typeStyle = getTypeStyles();
  
  return (
    <div className={`bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300 ${isLarge ? 'p-5' : 'p-4'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
              <span>{typeStyle.icon}</span> {typeStyle.label}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(request.requestedAt).toLocaleDateString()}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {request.status || 'PENDING'}
            </span>
          </div>
          
          <p className="font-medium text-gray-900">{request.auditType} - {request.department}</p>
          <p className="mt-1 text-sm text-gray-500">
            <FiUserCheck className="inline w-3 h-3 mr-1 text-gray-400" />
            {request.auditorName} → {request.auditeeName}
          </p>
          
          {/* Current vs Requested quick preview */}
          <div className="mt-2 text-xs text-gray-500">
            {request.type === 'RESCHEDULE' ? (
              <span>Current: {request.currentDate} → Requested: {request.requestedNewDate}</span>
            ) : (
              <span>Current end: {request.currentDate} → Requested end: {request.requestedNewToDate}</span>
            )}
          </div>
        </div>
        
        {/* Only View button on the card */}
        <button
          onClick={() => onView(request)}
          className="p-2 text-blue-600 transition-colors border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
          title="View Request Details"
        >
          <FiEye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// REQUEST DETAILS MODAL - Shows full details with Approve/Reject buttons
// ============================================================================
const RequestDetailsModal = ({ 
  request, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject,
  departmentTeamMembers,
  loadingTeamMembers
}) => {
  if (!isOpen || !request) return null;
  
  const getTypeStyles = () => {
    if (request.type === 'RESCHEDULE') {
      return { label: 'Reschedule Request', icon: '📅', color: 'orange' };
    }
    return { label: 'Extension Request', icon: '⏰', color: 'purple' };
  };
  
  const typeStyle = getTypeStyles();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl animate-slideUp" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-5 bg-white border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <span className="text-xl">{typeStyle.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{typeStyle.label}</h3>
              <p className="text-sm text-gray-500">Review request details and take action</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
            <div>
              <p className="text-xs text-gray-500">Audit Type</p>
              <p className="font-medium text-gray-900">{request.auditType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="font-medium text-gray-900">{request.department}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Auditor</p>
              <p className="font-medium text-gray-900">{request.auditorName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Auditee</p>
              <p className="font-medium text-gray-900">{request.auditeeName}</p>
            </div>
          </div>
          
          {/* Current vs Requested */}
          <div className="p-4 rounded-lg bg-emerald-50">
            <p className="mb-2 text-sm font-medium text-emerald-800">📋 Requested Changes</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Current Schedule</p>
                <p className="text-sm font-medium text-gray-700">
                  {request.currentDate}
                  {request.currentStartTime && ` • ${request.currentStartTime}`}
                </p>
              </div>
              <div className="relative">
                <div className="absolute left-0 w-4 h-px -translate-y-1/2 bg-gray-300 top-1/2"></div>
                <div className="pl-5">
                  <p className="text-xs font-medium text-emerald-600">Requested</p>
                  <p className="text-sm font-medium text-emerald-700">
                    {request.type === 'RESCHEDULE' 
                      ? `${request.requestedNewDate} • ${request.requestedNewStartTime}`
                      : `Until ${request.requestedNewToDate}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reason */}
          {request.reason && (
            <div className="p-4 rounded-lg bg-amber-50">
              <p className="text-xs font-medium text-amber-700">💬 Reason for Request</p>
              <p className="mt-1 text-sm text-amber-800">{request.reason}</p>
            </div>
          )}
          
          {/* Assigned Team Information */}
          {!loadingTeamMembers && departmentTeamMembers?.leadAuditorName && (
            <div className="p-4 rounded-lg bg-blue-50">
              <p className="text-xs font-medium text-blue-800">👥 Assigned Audit Team for {request.department}</p>
              <p className="mt-2 text-sm text-blue-700">
                ⭐ Lead Auditor: {departmentTeamMembers.leadAuditorName}
              </p>
              {departmentTeamMembers.teamAuditorNames?.length > 0 && (
                <p className="mt-1 text-sm text-blue-700">
                  👥 Team Auditors: {departmentTeamMembers.teamAuditorNames.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Action Buttons - Only here, not on the card */}
        <div className="sticky bottom-0 flex justify-end gap-3 p-5 bg-white border-t border-gray-200 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 transition-colors border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={() => onReject(request)}
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
          >
            <FiX className="w-4 h-4" />
            Reject
          </button>
          <button 
            onClick={() => onApprove(request)}
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700"
          >
            <FiCheck className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};




// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function AuditManagerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState([]);  // ✅ Add this
const [searchQuery, setSearchQuery] = useState('');  // ✅ Add this
  const [activeView, setActiveView] = useState('schedules');
  const currentYear = new Date().getFullYear();
  
  // Data States
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedReassignAuditorId, setSelectedReassignAuditorId] = useState('');
  const [availableAuditors, setAvailableAuditors] = useState([]);
  const [showReassignOptions, setShowReassignOptions] = useState(false);
  const [showAddAnotherAuditor, setShowAddAnotherAuditor] = useState(false);  // New checkbox state
const [additionalAuditorIds, setAdditionalAuditorIds] = useState([]); 
  const [form3Status, setForm3Status] = useState({ status: 'NOT_STARTED' });
  const [form4Status, setForm4Status] = useState({ status: 'NOT_STARTED' });
  const [hasApprovedForm5, setHasApprovedForm5] = useState(false);
  // Forum Modal State
const [showForumModal, setShowForumModal] = useState(false);
const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
const [allUsersList, setAllUsersList] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);


  // Add these with your other state declarations
const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
const [showRequestModal, setShowRequestModal] = useState(false);




  const [selectedYear, setSelectedYear] = useState(() => {
  // Try to get saved year from localStorage
  const savedYear = localStorage.getItem('auditManagerSelectedYear');
  if (savedYear) {
    return parseInt(savedYear);
  }
  // Also check if there's a year in URL
  const urlYear = new URLSearchParams(window.location.search).get('year');
  if (urlYear) {
    return parseInt(urlYear);
  }
  return new Date().getFullYear();
});

// Add this useEffect right after your state declarations
useEffect(() => {
  // Save selected year to localStorage whenever it changes
  localStorage.setItem('auditManagerSelectedYear', selectedYear);
  
  // Also update URL to reflect the year (optional)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('year') !== String(selectedYear)) {
    urlParams.set('year', selectedYear);
    navigate(`?${urlParams.toString()}`, { replace: true });
  }
}, [selectedYear, navigate]);



  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');


  useEffect(() => {
    if (viewParam === 'ncr') {
      setActiveView('ncr');
    } else if (viewParam === 'schedules') {
      setActiveView('schedules');
    } else if (viewParam === 'requests') {
      setActiveView('requests');
    }
  }, [viewParam]);
  
  ///UPDATED
  // Replace the initial stats state with:
const [stats, setStats] = useState({
  totalAudits: 0,
  completedAudits: 0,
  pendingSchedules: 0,
  openNCRs: 0,
  pendingRequests: 0,
  pendingCaVerification: 0
});
  
  

  // UPDATED

const [departmentTeamMembers, setDepartmentTeamMembers] = useState({
  auditors: [],      // Lead + Team Auditors for this department
  auditees: []       // Selected auditees for this department
});
const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  
  

const [conflictWarning, setConflictWarning] = useState(null);
const [checkingAvailability, setCheckingAvailability] = useState(false);
const [dateSchedules, setDateSchedules] = useState([]);



  // ==========================================================================
  // DATA FETCHING
 // ==========================================================================
// DATA FETCHING
// ==========================================================================
const fetchDepartmentTeamMembers = async (departmentName) => {
  if (!departmentName) return;
 
  const departmentDisplayToEnum = {
    "HR": "HR",
    "R&D": "ENGG",
    "Purchase": "PURCHASE",
    "RMS": "STORES_DESPATCH",
    "SQA": "QA",
    "PPC": "PPC",
    "Production": "PRODUCTION",
    "QA/QC": "QA",
    "FGS": "STORES_DESPATCH",
    "Marketing": "MARKETING",
    "IMS (BE)": "MR",
    "Maintenance": "PLANT_MAINTENANCE",
    "Management": "UNIT_HEAD",
    "Plant Maintenance": "PLANT_MAINTENANCE",
    "Tool Maintenance": "TOOL_MAINTENANCE",
    "Stores & Despatch": "STORES_DESPATCH"
  };
 
  const enumValue = departmentDisplayToEnum[departmentName] || departmentName.toUpperCase().replace(/[&\s\/]+/g, '_');
 
  console.log(`🚀 Fetching team members for: ${departmentName} → enum: ${enumValue}`);
 
  setLoadingTeamMembers(true);
  try {
    // ✅ STEP 1: Fetch department-specific auditors (Regular Auditors - no lead)
    console.log(`📡 Fetching regular auditors for department: ${enumValue}`);
    const regularAuditorsRes = await axios.get(
      `${API_BASE}/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumValue)}`,
      { withCredentials: true }
    );
   
    const regularAuditors = regularAuditorsRes.data || [];
    console.log(`✅ Found ${regularAuditors.length} regular auditors for ${departmentName}:`,
      regularAuditors.map(a => `${a.firstName} ${a.lastName} (${a.role})`)
    );
   
    // ✅ STEP 2: Also fetch lead auditor for this department (to display but not include in dropdown)
    let leadAuditorInfo = null;
    try {
      const leadAuditorsRes = await axios.get(
        `${API_BASE}/audit-schedule/lead-auditors/by-department/${encodeURIComponent(enumValue)}`,
        { withCredentials: true }
      );
      const leadAuditors = leadAuditorsRes.data || [];
      leadAuditorInfo = leadAuditors[0] || null; // Usually one lead auditor per department
      console.log(`✅ Lead auditor for ${departmentName}:`, leadAuditorInfo ? `${leadAuditorInfo.firstName} ${leadAuditorInfo.lastName}` : 'None');
    } catch (err) {
      console.warn('Could not fetch lead auditor:', err);
    }
   
    // ✅ STEP 3: Get the approved schedule to check which auditors are assigned to this week
    const scheduleResponse = await axios.get(
      `${API_BASE}/audit-schedule/year/${selectedYear}/department/${encodeURIComponent(enumValue)}`,
      { withCredentials: true }
    );
   
    const schedules = scheduleResponse.data || [];
    const deptSchedule = schedules.find(s => s.approvalStatus === 'APPROVED') || schedules.find(s => s.approvalStatus === 'DRAFT');
   
    let teamAuditorIds = [];
    let teamAuditorNames = [];
   
    if (deptSchedule) {
      // Get the team auditors already assigned to this schedule
      teamAuditorIds = deptSchedule.teamAuditorIds || [];
      if (typeof teamAuditorIds === 'string') {
        try { teamAuditorIds = JSON.parse(teamAuditorIds); } catch(e) { teamAuditorIds = []; }
      }
     
      teamAuditorNames = deptSchedule.teamAuditorNames || [];
      if (typeof teamAuditorNames === 'string') {
        try { teamAuditorNames = JSON.parse(teamAuditorNames); } catch(e) { teamAuditorNames = []; }
      }
    }
   
    // ✅ STEP 4: Set the team members - regular auditors only (NO lead auditors)
    setDepartmentTeamMembers({
      // Only regular auditors (these are the ones who can be reassigned or added as co-auditors)
      auditors: regularAuditors,  
      auditees: [],
      leadAuditorId: leadAuditorInfo?.id || null,
      leadAuditorName: leadAuditorInfo ? `${leadAuditorInfo.firstName} ${leadAuditorInfo.lastName}` : null,
      teamAuditorIds: teamAuditorIds,
      teamAuditorNames: teamAuditorNames,
      auditeeIds: [],
      auditeeNames: []
    });
   
    console.log(`✅ Final auditors list (excluding lead): ${regularAuditors.length} auditors`);
   
  } catch (error) {
    console.error('Error fetching department team members:', error);
   
    // ✅ FALLBACK: If department-specific endpoint fails, try to get all regular auditors
    try {
      console.log('⚠️ Department endpoint failed, fetching all regular auditors as fallback');
      const allUsersResponse = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      const allUsers = allUsersResponse.data || [];
     
      // Filter for regular auditors only (exclude LEAD_AUDITOR)
      const regularAuditorsOnly = allUsers.filter(u => {
        const role = u.role?.toUpperCase() || '';
        return role === 'AUDITOR' || (role.includes('AUDITOR') && !role.includes('LEAD'));
      });
     
      console.log(`✅ Fallback: Found ${regularAuditorsOnly.length} regular auditors`);
     
      setDepartmentTeamMembers({
        auditors: regularAuditorsOnly,
        auditees: [],
        leadAuditorId: null,
        leadAuditorName: null,
        teamAuditorIds: [],
        teamAuditorNames: [],
        auditeeIds: [],
        auditeeNames: []
      });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      setDepartmentTeamMembers({
        auditors: [],
        auditees: [],
        leadAuditorId: null,
        leadAuditorName: null,
        teamAuditorIds: [],
        teamAuditorNames: [],
        auditeeIds: [],
        auditeeNames: []
      });
    }
  } finally {
    setLoadingTeamMembers(false);
  }
};
 

///UPDATED
// Add this function to fetch audit stats from your backend
const fetchAuditStats = async () => {
  try {
    // Fetch all schedules for the selected year
    const response = await axios.get(`${API_BASE}/audit-schedule/year/${selectedYear}`, { 
      withCredentials: true 
    });
    
    const allSchedules = response.data || [];
    
    // Calculate statistics
    const totalAudits = allSchedules.length;
    const completedAudits = allSchedules.filter(s => 
      s.status === 'COMPLETED' || s.status === 'CLOSED'
    ).length;
    const pendingSchedules = allSchedules.filter(s => 
      s.approvalStatus === 'PENDING_APPROVAL' || 
      (s.approvalStatus === 'APPROVED' && s.status === 'SCHEDULED')
    ).length;
    
    setStats(prev => ({
      ...prev,
      totalAudits,
      completedAudits,
      pendingSchedules
    }));
    
  } catch (error) {
    console.error('Error fetching audit stats:', error);
  }
};


// Helper function to convert time string to minutes
const convertToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + parseInt(minutes);
};

// Fetch schedules for a specific date
const fetchSchedulesForDate = async (date) => {
  try {
    const response = await axios.get(
      `${API_BASE}/audit-schedule/by-date/${date}`,
      { withCredentials: true }
    );
    return response.data || [];
  } catch (error) {
    console.error('Error fetching schedules for date:', error);
    return [];
  }
};

// Check for time conflicts when selecting a new auditor
const checkConflictsForAuditor = async (auditorId, isReassign = false) => {
  if (!selectedRequest || !auditorId) return;
  
  const auditDate = selectedRequest.currentDate;
  const startTime = selectedRequest.currentStartTime;
  const endTime = selectedRequest.currentEndTime;
  
  // For extension requests, check all dates in the extension period
  if (selectedRequest.type === 'EXTENSION') {
    const fromDate = selectedRequest.currentFromDate || selectedRequest.currentDate;
    const toDate = selectedRequest.requestedNewToDate;
    
    setCheckingAvailability(true);
    try {
      const conflicts = [];
      
      // Get all dates in the range
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const dateList = [];
      for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        dateList.push(dt.toISOString().split('T')[0]);
      }
      
      // Check each date for conflicts
      for (const date of dateList) {
        const schedules = await fetchSchedulesForDate(date);
        const conflict = schedules.find(schedule => {
          if (schedule.auditorId !== parseInt(auditorId)) return false;
          if (schedule.id === selectedRequest.scheduleId) return false;
          
          // Check time overlap
          const s1Start = convertToMinutes(startTime);
          const s1End = convertToMinutes(endTime);
          const s2Start = convertToMinutes(schedule.startTime);
          const s2End = convertToMinutes(schedule.endTime);
          
          return (s1Start < s2End && s1End > s2Start);
        });
        
        if (conflict) {
          conflicts.push({ date, conflict });
        }
      }
      
      if (conflicts.length > 0) {
        setConflictWarning({
          type: isReassign ? 'reassign' : 'coauditor',
          auditorId,
          auditorName: departmentTeamMembers.auditors.find(a => a.id === auditorId)?.firstName,
          conflicts
        });
      } else {
        setConflictWarning(null);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingAvailability(false);
    }
  } 
  // For reschedule requests, just check the single date
  else {
    setCheckingAvailability(true);
    try {
      const schedules = await fetchSchedulesForDate(auditDate);
      const conflict = schedules.find(schedule => {
        if (schedule.auditorId !== parseInt(auditorId)) return false;
        if (schedule.id === selectedRequest.scheduleId) return false;
        
        const s1Start = convertToMinutes(startTime);
        const s1End = convertToMinutes(endTime);
        const s2Start = convertToMinutes(schedule.startTime);
        const s2End = convertToMinutes(schedule.endTime);
        
        return (s1Start < s2End && s1End > s2Start);
      });
      
      if (conflict) {
        setConflictWarning({
          type: isReassign ? 'reassign' : 'coauditor',
          auditorId,
          auditorName: departmentTeamMembers.auditors.find(a => a.id === auditorId)?.firstName,
          conflicts: [{ date: auditDate, conflict }]
        });
      } else {
        setConflictWarning(null);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingAvailability(false);
    }
  }
};





 
const fetchAvailableAuditors = async () => {
  try {
    const response = await axios.get(`${API_BASE}/audit-schedule/auditors`, { withCredentials: true });
    setAvailableAuditors(response.data || []);
  } catch (error) {
    console.error('Error fetching auditors:', error);
  }
};

const fetchPendingRequests = async () => {
  try {
    const response = await axios.get(`${API_BASE}/audit-schedule/pending-requests`, { withCredentials: true });
    const requests = response.data || [];
    setPendingRequests(requests);
    setStats(prev => ({ ...prev, pendingRequests: requests.length }));
  } catch (error) {
    console.error('Error fetching pending requests:', error);
  }
};

const fetchNcrStats = async () => {
  try {
    const [allResponse] = await Promise.all([
      axios.get(`${API_BASE}/ncr/all`, { withCredentials: true })
    ]);
    const allNcrs = allResponse.data || [];
    const pendingVerification = allNcrs.filter(
      (ncr) => ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS'
    );
    setStats(prev => ({
      ...prev,
      // CHANGE THIS LINE - Include NCR2_COMPLETED as "Open" for the card
      openNCRs: allNcrs.filter(ncr => 
        ncr.status !== 'CLOSED' && ncr.status !== 'NCR2_COMPLETED'
      ).length,
      pendingCaVerification: pendingVerification.length
    }));
  } catch (error) {
    console.error('Error fetching NCR stats:', error);
  }
};

// Add this function after your state declarations (around line 450)
const fetchSchedulesWithStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE}/audit-schedule/auditor/${user?.id}/schedules-with-status`, { 
      withCredentials: true 
    });
    setSchedules(response.data || []);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    setSchedules([]);
  }
};


// ✅ NEW (uses selectedYear)
const fetchForm3Status = async () => {
  try {
    const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}`, {
      withCredentials: true
    });
    const plan = response.data;
    
    // Validate response year matches requested year
    if (plan && plan.planYear && plan.planYear !== selectedYear) {
      setForm3Status({ status: 'NOT_STARTED', year: selectedYear });
      return;
    }
    
    setForm3Status({ status: plan?.approvalStatus || 'NOT_STARTED', year: selectedYear });
  } catch (error) {
    setForm3Status({ status: 'NOT_STARTED', year: selectedYear });
  }
};

// ✅ UPDATED: Use selectedYear instead of currentYear
const fetchForm4Status = async () => {
  try {
    const response = await axios.get(`${API_BASE}/department-plan/${selectedYear}`, { withCredentials: true });
    const plan = response.data;
    setForm4Status({ status: plan?.approvalStatus || 'NOT_STARTED', year: selectedYear });
  } catch (error) {
    setForm4Status({ status: 'NOT_STARTED', year: selectedYear });
  }
};

// ✅ UPDATED: Use selectedYear instead of currentYear
const checkForm5Approved = async () => {
  try {
    const response = await axios.get(`${API_BASE}/audit-schedule/available-months/${selectedYear}`, { withCredentials: true });
    const months = response.data || [];
    const hasApproved = months.some(m => m.approvalStatus === 'APPROVED');
    setHasApprovedForm5(hasApproved);
  } catch (error) {
    setHasApprovedForm5(false);
  }
};

const fetchAllData = async () => {
  setLoading(true);
  await Promise.all([
    fetchForm3Status(),
    fetchForm4Status(),
    checkForm5Approved(),
    fetchPendingRequests(),
    fetchAvailableAuditors(),
    fetchNcrStats(),
    fetchSchedulesWithStatus(),
    fetchAuditStats()  // Add this line
  ]);
  setLoading(false);
};

const fetchAllUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    setAllUsersList(response.data || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    setAllUsersList([]);
  }
};

// Get available years
const getAvailableYears = () => {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  // Show past 3 years and next 3 years (total 7 years)
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.add(i);
  }
  if (form3Status.year) years.add(form3Status.year);
  if (form4Status.year) years.add(form4Status.year);
  return Array.from(years).sort((a, b) => b - a);
};

// Update available years when data changes
useEffect(() => {
  setAvailableYears(getAvailableYears());
}, [form3Status, form4Status]);

// Reload data when year changes
useEffect(() => {
  if (!loading) {
    fetchForm3Status();
    fetchForm4Status();
    checkForm5Approved();
  }
}, [selectedYear]);

useEffect(() => {
  fetchAllData();
  fetchAllUsers();
}, []);


 // In AuditManagerDashboard.jsx - update openAuditForum
// In AuditManagerDashboard.jsx - Update openAuditForum
const openAuditForum = (audit) => {
  // Build member emails from available data
  const memberEmails = [];
  
  // Add current user (manager)
  if (user?.email) memberEmails.push(user.email);
  
  // Add auditor if available
  if (audit.auditorEmail) memberEmails.push(audit.auditorEmail);
  else if (audit.auditorName?.includes('@')) memberEmails.push(audit.auditorName);
  else if (audit.auditorId) {
    const auditor = allUsersList.find(u => u.id === audit.auditorId);
    if (auditor?.email) memberEmails.push(auditor.email);
  }
  
  // Add auditee if available
  if (audit.auditeeEmail) memberEmails.push(audit.auditeeEmail);
  else if (audit.auditeeName?.includes('@')) memberEmails.push(audit.auditeeName);
  else if (audit.auditeeId) {
    const auditee = allUsersList.find(u => u.id === audit.auditeeId);
    if (auditee?.email) memberEmails.push(auditee.email);
  }
  
  // Add HOD if available
  if (audit.hodEmail) memberEmails.push(audit.hodEmail);
  
  // Add memberEmails if passed directly (from test button)
  if (audit.memberEmails) memberEmails.push(...audit.memberEmails);
  

  // Build co-auditor emails
const coAuditorEmails = [];
if (audit.coAuditorIdList && audit.coAuditorIdList.length > 0) {
  audit.coAuditorIdList.forEach(coId => {
    const coUser = allUsersList.find(u => Number(u.id) === Number(coId));
    if (coUser?.email) {
      coAuditorEmails.push(coUser.email);
    }
  });
}


  setSelectedAuditForForum({
    id: audit.id,
    auditNumber: audit.auditNumber,
    auditType: audit.auditType,
    department: audit.department,
    auditorId: audit.auditorId || user?.id,
    auditorName: audit.auditorName || user?.name,
    auditeeId: audit.auditeeId,
    auditeeName: audit.auditeeName,
    hodEmail: audit.hodEmail,
    hodName: audit.hodName,
    status: audit.status,
    memberEmails: [...new Set(memberEmails)] // Remove duplicates
  });
  setShowForumModal(true);
};
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    addToast('Dashboard refreshed', 'success');
  };


 

// Add this function to handle viewing a request
const handleViewRequest = (request) => {
  setSelectedRequestForModal(request);
  fetchDepartmentTeamMembers(request.department);
  setShowRequestModal(true);
};

  // ==========================================================================
  // VIEW HANDLERS
  // ==========================================================================
  const setViewSchedules = () => setActiveView('schedules');
  const setViewNcr = () => setActiveView('ncr');
  const setViewBoth = () => setActiveView('both');
    const setViewRequests = () => setActiveView('requests'); // NEW VIEW HANDLER


  // ==========================================================================
  // APPROVAL HANDLERS
  // ==========================================================================
 const handleApproveReschedule = async () => {
  if (!selectedRequest) return;
  setSubmitting(true);
  try {
    const requestBody = {
      comments: approvalComment,
      // Primary reassign (Checkbox 1)
      reassignToAuditorId: showReassignOptions ? (selectedReassignAuditorId || null) : null,
      // Additional auditors (Checkbox 2)
      additionalAuditorIds: showAddAnotherAuditor ? additionalAuditorIds : [],
      // Flag to indicate if we should keep original auditor
      keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions
    };
    
    await axios.post(`${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/approve-reschedule?userId=${user?.id}`, 
      requestBody, { withCredentials: true });
    
    let successMessage = 'Reschedule request approved';
    if (showReassignOptions && selectedReassignAuditorId) {
      successMessage += ' and auditor reassigned';
    }
    if (showAddAnotherAuditor && additionalAuditorIds.length > 0) {
      successMessage += ` with ${additionalAuditorIds.length} additional auditor(s)`;
    }
    addToast(successMessage, 'success');
    resetAndClose();
  } catch (error) {
    addToast(error.response?.data?.message || 'Failed to approve request', 'error');
  } finally {
    setSubmitting(false);
  }
};

const handleApproveExtension = async () => {
  if (!selectedRequest) return;
  setSubmitting(true);
  try {
    const requestBody = {
      comments: approvalComment,
      // Primary reassign (Checkbox 1)
      reassignToAuditorId: showReassignOptions ? (selectedReassignAuditorId || null) : null,
      // Additional auditors (Checkbox 2)
      additionalAuditorIds: showAddAnotherAuditor ? additionalAuditorIds : [],
      // Flag to indicate if we should keep original auditor
      keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions
    };
    
    await axios.post(`${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/approve-extension?userId=${user?.id}`, 
      requestBody, { withCredentials: true });
    
    let successMessage = 'Extension request approved';
    if (showReassignOptions && selectedReassignAuditorId) {
      successMessage += ' and auditor reassigned';
    }
    if (showAddAnotherAuditor && additionalAuditorIds.length > 0) {
      successMessage += ` with ${additionalAuditorIds.length} additional auditor(s)`;
    }
    addToast(successMessage, 'success');
    resetAndClose();
  } catch (error) {
    addToast(error.response?.data?.message || 'Failed to approve request', 'error');
  } finally {
    setSubmitting(false);
  }
};

// ============================================================================
// UPDATED resetAndClose FUNCTION
// ============================================================================
const resetAndClose = async () => {
  setShowApproveModal(false);
  setShowRejectModal(false);
  setApprovalComment('');
  setRejectionReason('');
  setSelectedReassignAuditorId('');
  setAdditionalAuditorIds([]);      // Reset additional auditors
  setShowReassignOptions(false);
  setShowAddAnotherAuditor(false);   // Reset new checkbox
  setSelectedRequest(null);
  await fetchPendingRequests();
};


  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = selectedRequest.type === 'RESCHEDULE' 
        ? `${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/reject-reschedule`
        : `${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/reject-extension`;
      await axios.post(`${endpoint}?userId=${user?.id}`, { reason: rejectionReason }, { withCredentials: true });
      addToast('Request rejected', 'error');
      resetAndClose();
    } catch (error) {
      addToast('Failed to reject request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  const isForm3Approved = () => form3Status.status === 'APPROVED';
  const isForm4Approved = () => form4Status.status === 'APPROVED';
  const isScheduleDashboardAccessible = () => isForm4Approved();
  const isScheduleCalendarAccessible = () => hasApprovedForm5;

  // Get workflow status for clockwise cards
  const getCardStatus = (cardName) => {
    if (cardName === 'Annual Audit Plan') {
      return form3Status.status === 'APPROVED' ? 'APPROVED' : 
             form3Status.status === 'PENDING_APPROVAL' ? 'PENDING' : 
             form3Status.status === 'NOT_STARTED' ? 'NOT_STARTED' : 'LOCKED';
    }
    if (cardName === 'Department Audit Plan') {
      if (!isForm3Approved()) return 'LOCKED';
      return form4Status.status === 'APPROVED' ? 'APPROVED' : 
             form4Status.status === 'PENDING_APPROVAL' ? 'PENDING' : 'READY';
    }
    if (cardName === 'Schedule Dashboard') {
      if (!isForm4Approved()) return 'LOCKED';
      return hasApprovedForm5 ? 'APPROVED' : 'READY';
    }
    if (cardName === 'Schedule Calendar') {
      if (!hasApprovedForm5) return 'LOCKED';
      return 'READY';
    }
    return 'NOT_STARTED';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto border-gray-200 rounded-full border-3 border-t-blue-600 animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        
        {/* ====================================================================
            HEADER
        ==================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
  <div>
    <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
      <FiHome className="w-4 h-4" />
      <span>Dashboard</span>
      <FiChevronRight className="w-3 h-3" />
      <span className="font-medium text-gray-900">Audit Manager</span>
    </div>
    <h1 className="text-2xl font-bold text-gray-900">Audit Manager</h1>
    <p className="mt-1 text-sm text-gray-500">
      Welcome back, <span className="font-medium text-gray-700">{user?.name || user?.username}</span>
    </p>
  </div>
  
  <div className="flex items-center gap-3">
    {/* ✅ ADD YEAR FILTER HERE */}
    <YearFilter 
      selectedYear={selectedYear}
      onYearChange={(newYear) => {
        setSelectedYear(newYear);
      }}
      availableYears={availableYears}
    />
    
    <button 
      onClick={() => {
        const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
        const topManagement = allUsersList.find(u => u.role === 'TOP_MANAGEMENT');
        openAuditForum({ 
          id: 'demo', 
          auditNumber: 'AUD-DEMO',
          auditType: 'Demo Audit',
          department: 'Quality',
          auditorId: auditManager?.id,
          auditorName: auditManager?.name,
          auditeeId: topManagement?.id,
          auditeeName: topManagement?.name,
          hodEmail: topManagement?.email,
          hodName: topManagement?.name,
          memberEmails: [auditManager?.email, topManagement?.email].filter(Boolean)
        });
      }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-purple-600 rounded-xl hover:bg-purple-700"
    >
      <FiMessageCircle className="w-4 h-4" /> Test Forum
    </button>
    
    <button 
      onClick={handleRefresh}
      disabled={refreshing}
      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-all bg-white border border-gray-200 shadow-sm rounded-xl hover:bg-gray-50"
    >
      <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      Refresh
    </button>
    
    
  </div>
</div>



        {/* ====================================================================
            STATS CARDS
        ==================================================================== */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="Total Audits" value={stats.totalAudits} icon={<FiCalendar className="w-5 h-5" />} color="blue" />
          <StatCard title="Pending Schedules" value={stats.pendingSchedules} icon={<FiClock className="w-5 h-5" />} color="amber" />
          <StatCard title="Open NCRs" value={stats.openNCRs} icon={<FiAlertCircle className="w-5 h-5" />} onClick={() => navigate('/ncr-dashboard')} color="rose" />
          <StatCard title="CA Verification" value={stats.pendingCaVerification} icon={<FiCheckCircle className="w-5 h-5" />} onClick={() => navigate('/ncr-pending')} color="indigo" />
          <StatCard title="Pending Requests" value={stats.pendingRequests} icon={<FiMessageSquare className="w-5 h-5" />} color="purple" />
        </div>

        {/* ====================================================================
            VIEW TOGGLE BUTTONS
        ==================================================================== */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={setViewBoth}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeView === 'both'
                ? 'bg-gray-800 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:shadow-sm'
            }`}
          >
            <FiGrid className="w-5 h-5" />
            Both Sections
          </button>
          <button
            onClick={setViewSchedules}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeView === 'schedules'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:shadow-sm'
            }`}
          >
            <FiFolder className="w-5 h-5" />
            Schedules Only
          </button>
          <button
            onClick={setViewNcr}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeView === 'ncr'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:shadow-sm'
            }`}
          >
            <FiClipboard className="w-5 h-5" />
            NCR Only
          </button>
          <button
    onClick={setViewRequests}
    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
      activeView === 'requests'
        ? 'bg-amber-600 text-white shadow-md'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:shadow-sm'
    }`}
  >
    <FiMessageSquare className="w-5 h-5" />
    Pending Requests
    {pendingRequests.length > 0 && (
      <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
        {pendingRequests.length}
      </span>
    )}
  </button>
        </div>

        {/* ====================================================================
            BOTH SECTIONS VIEW - With Clockwise Workflow Cards
        ==================================================================== */}
        {activeView === 'both' && (
  <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2 animate-fadeIn">
    
    {/* LEFT - SCHEDULES with CLOCKWISE WORKFLOW CARDS */}
    <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div className="px-5 py-4 border-b border-blue-100 bg-blue-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-xl">
            <FiFolder className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Schedules Management</h2>
        </div>
        <p className="mt-1 text-xs text-gray-500">Clockwise workflow: Follow the arrows →</p>
      </div>
      <div className="p-5">
        {/* Clockwise Workflow Grid with Arrows */}
        <div
          className="mx-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 40px 1fr',
            gridTemplateRows: 'auto 40px auto',
            gap: 0,
            maxWidth: 500
          }}
        >
          {/* Row 1 Col 1 - Step 1 */}
          <ClockwiseWorkflowCard
            stepNumber={1}
            title="Annual Audit Plan"
            description="Form 3 - Define yearly audit elements"
            status={getCardStatus('Annual Audit Plan')}
            onClick={() => navigate(`/form3?year=${selectedYear}`)}
            disabled={false}
            color="blue"
          />

          {/* Row 1 Col 2 - Arrow RIGHT from 1 to 2 */}
          <div className="flex items-center justify-center">
            <div className="p-1 bg-white rounded-full shadow-md">
              <FiArrowRightCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Row 1 Col 3 - Step 2 */}
          <ClockwiseWorkflowCard
            stepNumber={2}
            title="Department Audit Plan"
            description="Form 4 - Assign audits to departments"
            status={getCardStatus('Department Audit Plan')}
            onClick={() => isForm3Approved() && navigate(`/form4?year=${selectedYear}`)}
            disabled={!isForm3Approved()}
            color="emerald"
          />

          {/* Row 2 Col 1 - empty */}
          <div />

          {/* Row 2 Col 2 - empty center */}
          <div />

          {/* Row 2 Col 3 - Arrow DOWN from 2 to 3 */}
          <div className="flex items-center justify-center">
            <div className="p-1 bg-white rounded-full shadow-md">
              <FiArrowDownCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Row 3 Col 1 - Step 4 */}
          <ClockwiseWorkflowCard
            stepNumber={4}
            title="Schedule Calendar"
            description="Daily schedules with time slots"
            status={getCardStatus('Schedule Calendar')}
            onClick={() => isScheduleCalendarAccessible() && navigate(`/schedule-calendar?year=${selectedYear}`)}
            disabled={!isScheduleCalendarAccessible()}
            color="teal"
          />

          {/* Row 3 Col 2 - Arrow LEFT from 3 to 4 */}
          <div className="flex items-center justify-center">
            <div className="p-1 bg-white rounded-full shadow-md">
              <FiArrowLeftCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Row 3 Col 3 - Step 3 */}
          <ClockwiseWorkflowCard
            stepNumber={3}
            title="Schedule Dashboard"
            description="Month-wise audit schedule & week plans"
            status={getCardStatus('Schedule Dashboard')}
            onClick={() => isScheduleDashboardAccessible() && navigate(`/form5-dashboard?year=${selectedYear}`)}
            disabled={!isScheduleDashboardAccessible()}
            color="indigo"
          />
        </div>

        {/* Flow Text */}
        <div className="p-3 mt-6 text-center rounded-lg bg-gray-50">
          <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="font-medium">Workflow Flow:</span>
            <span className="text-blue-600">Annual Plan</span>
            <FiArrowRight className="w-3 h-3" />
            <span className="text-emerald-600">Dept Plan</span>
            <FiArrowRight className="w-3 h-3" />
            <span className="text-indigo-600">Schedule Dashboard</span>
            <FiArrowRight className="w-3 h-3" />
            <span className="text-teal-600">Schedule Calendar</span>
            <FiArrowRight className="w-3 h-3" />
            <span className="text-blue-600">Complete → Next Year</span>
          </p>
        </div>
      </div>
    </div>

    {/* RIGHT - NCR */}
    <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div className="px-5 py-4 border-b border-purple-100 bg-purple-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-600 rounded-xl">
            <FiClipboard className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">NCR Management</h2>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-6 space-y-3">
          <NcrCard 
            title="CA Verification" 
            description="Verify corrective actions" 
            icon={<FiCheckCircle className="w-5 h-5 text-white" />} 
            color="indigo" 
            onClick={() => navigate('/ncr-pending')} 
            badgeText={`${stats.pendingCaVerification} Pending`} 
          />
          <NcrCard 
            title="NCR Summary" 
            description="View all Non-Conformance Reports" 
            icon={<FiAlertCircle className="w-5 h-5 text-white" />} 
            color="rose" 
            onClick={() => navigate('/ncr-dashboard')} 
            badgeText={`${stats.openNCRs} Open`} 
          />
          <NcrCard 
            title="NC Summary" 
            description="All NCRs at a glance" 
            icon={<FiBarChart2 className="w-5 h-5 text-white" />} 
            color="emerald" 
            onClick={() => navigate('/form9')} 
            badgeText={`${stats.openNCRs + stats.pendingCaVerification} Active`} 
          />
        </div>
        
        {pendingRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FiMessageSquare className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-gray-700">Pending Requests ({pendingRequests.length})</h3>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-64">
              {pendingRequests.slice(0, 2).map((request, idx) => (
  <RequestCard 
    key={idx} 
    request={request} 
    onView={handleViewRequest}
  />
))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}

        {/* ====================================================================
            SCHEDULES ONLY VIEW - Full Width with Clockwise Workflow
        ==================================================================== */}
    {activeView === 'schedules' && (
  <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl animate-fadeIn">
    <div className="px-6 py-5 border-b border-blue-100 bg-blue-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-xl">
          <FiFolder className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Schedules Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Follow the clockwise workflow to complete setup</p>
        </div>
      </div>
    </div>

    <div className="p-6">
      <div
        className="mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 56px 1fr',
          gridTemplateRows: 'auto 56px auto',
          maxWidth: 640,
          gap: 0
        }}
      >
        {/* Row 1 Col 1 — Step 1 */}
        <ClockwiseWorkflowCard
          stepNumber={1}
          title="Annual Audit Plan"
          description="Form 3 - Define yearly audit elements"
          status={getCardStatus('Annual Audit Plan')}
          onClick={() => navigate(`/form3?year=${selectedYear}`)}
          disabled={false}
          color="blue"
        />

        {/* Row 1 Col 2 — Arrow RIGHT from 1 to 2 */}
        {/* Row 1 Col 2 — Arrow RIGHT from 1 to 2 */}
<div className="flex items-center justify-center">
  <div className="p-1 bg-white rounded-full shadow-md">
    <FiArrowRightCircle className="w-5 h-5 text-gray-400" />
  </div>
</div>

        {/* Row 1 Col 3 — Step 2 */}
        <ClockwiseWorkflowCard
          stepNumber={2}
          title="Department Audit Plan"
          description="Form 4 - Assign audits to departments"
          status={getCardStatus('Department Audit Plan')}
          onClick={() => isForm3Approved() && navigate(`/form4?year=${selectedYear}`)}
          disabled={!isForm3Approved()}
          color="emerald"
        />

        {/* Row 2 Col 1 — empty */}
        <div />

        {/* Row 2 Col 2 — empty center */}
        <div />

        {/* Row 2 Col 3 — Arrow DOWN from 2 to 3 */}
        {/* Row 2 Col 3 — Arrow DOWN from 2 to 3 */}
<div className="flex items-center justify-center">
  <div className="p-1 bg-white rounded-full shadow-md">
    <FiArrowDownCircle className="w-5 h-5 text-gray-400" />
  </div>
</div>

        {/* Row 3 Col 1 — Step 4 */}
        <ClockwiseWorkflowCard
          stepNumber={4}
          title="Schedule Calendar"
          description="Daily schedules with time slots"
          status={getCardStatus('Schedule Calendar')}
          onClick={() => isScheduleCalendarAccessible() && navigate(`/schedule-calendar?year=${selectedYear}`)}
          disabled={!isScheduleCalendarAccessible()}
          color="teal"
        />

        {/* Row 3 Col 2 — Arrow LEFT from 3 to 4 */}
       {/* Row 3 Col 2 — Arrow LEFT from 3 to 4 */}
<div className="flex items-center justify-center">
  <div className="p-1 bg-white rounded-full shadow-md">
    <FiArrowLeftCircle className="w-5 h-5 text-gray-400" />
  </div>
</div>

        {/* Row 3 Col 3 — Step 3 */}
        <ClockwiseWorkflowCard
          stepNumber={3}
          title="Schedule Dashboard"
          description="Month-wise audit schedule & week plans"
          status={getCardStatus('Schedule Dashboard')}
          onClick={() => isScheduleDashboardAccessible() && navigate(`/form5-dashboard?year=${selectedYear}`)}
          disabled={!isScheduleDashboardAccessible()}
          color="indigo"
        />
      </div>

      {/* Bottom workflow label */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 mt-6 text-xs bg-gray-50 rounded-xl">
        <span className="font-medium text-gray-600">Workflow:</span>
        <span className="font-medium text-blue-700">Annual Plan</span>
        <FiArrowRight className="w-3 h-3 text-gray-300" />
        <span className="font-medium text-emerald-700">Dept Plan</span>
        <FiArrowRight className="w-3 h-3 text-gray-300" />
        <span className="font-medium text-indigo-700">Schedule Dashboard</span>
        <FiArrowRight className="w-3 h-3 text-gray-300" />
        <span className="font-medium text-teal-700">Schedule Calendar</span>
        <FiArrowRight className="w-3 h-3 text-gray-300" />
        <span className="text-gray-400">Next Year</span>
      </div>
    </div>
  </div>
)}

        {/* ====================================================================
            NCR ONLY VIEW
        ==================================================================== */}
        {activeView === 'ncr' && (
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl animate-fadeIn">
            <div className="px-6 py-5 border-b border-purple-100 bg-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-xl">
                  <FiClipboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">NCR Management</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Manage Non-Conformance Reports and corrective actions</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-3">
                <NcrCard 
                  title="CA Verification" 
                  description="Verify corrective actions from auditees" 
                  icon={<FiCheckCircle className="w-6 h-6 text-white" />} 
                  color="indigo" 
                  onClick={() => navigate('/ncr-pending')} 
                  badgeText={`${stats.pendingCaVerification} Pending`} 
                  isLarge 
                />
                <NcrCard 
                  title="NCR Summary" 
                  description="View all Non-Conformance Reports" 
                  icon={<FiAlertCircle className="w-6 h-6 text-white" />} 
                  color="rose" 
                  onClick={() => navigate('/ncr-dashboard')} 
                  badgeText={`${stats.openNCRs} Open`} 
                  isLarge 
                />
                <NcrCard 
                  title="NC Summary" 
                  description="All NCRs at a glance" 
                  icon={<FiBarChart2 className="w-6 h-6 text-white" />} 
                  color="emerald" 
                  onClick={() => navigate('/form9')} 
                  badgeText={`${stats.openNCRs + stats.pendingCaVerification} Active`} 
                  isLarge 
                />
              </div>
              
            </div>
          </div>
        )}


        {activeView === 'requests' && (
  <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl animate-fadeIn">
    <div className="px-6 py-5 border-b bg-amber-50 border-amber-100">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-600 rounded-xl">
          <FiMessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pending Auditor Requests</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and manage all reschedule and extension requests from auditors
          </p>
        </div>
      </div>
    </div>
    <div className="p-6">
      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        <div className="p-4 border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <FiMessageSquare className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="p-4 border border-red-100 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Reschedule Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingRequests.filter(r => r.type === 'RESCHEDULE').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <FiCalendar className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="p-4 border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Extension Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingRequests.filter(r => r.type === 'EXTENSION').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <FiClock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {pendingRequests.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiMessageSquare className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-700">All Pending Requests</h3>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                {pendingRequests.length} Total
              </span>
            </div>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <FiRefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
          <div className="space-y-4">
            {pendingRequests.map((request, idx) => (
  <RequestCard 
    key={idx} 
    request={request} 
    onView={handleViewRequest}  // ← Changed to onView
    isLarge 
  />
))}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full">
            <FiMessageSquare className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-500">No pending requests</p>
          <p className="mt-1 text-sm text-gray-400">All auditor requests have been processed</p>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 mx-auto mt-4 text-sm transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <FiRefreshCw className="w-3 h-3" />
            Check again
          </button>
        </div>
      )}
    </div>
  </div>
)}
         {/* ====================================================================
            QUICK REPORTS
        ==================================================================== */}
        <div className="p-4 mt-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <FiDownload className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Quick Reports</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button className="flex items-center justify-between px-3 py-2 text-sm transition-all rounded-lg bg-gray-50 hover:bg-gray-100 group">
              <span>Audit Status Report</span>
              <FiArrowRight className="w-4 h-4 text-gray-400 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="flex items-center justify-between px-3 py-2 text-sm transition-all rounded-lg bg-gray-50 hover:bg-gray-100 group">
              <span>Monthly Compliance Report</span>
              <FiArrowRight className="w-4 h-4 text-gray-400 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      
        {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-xl animate-slideUp" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Approve {selectedRequest.type === 'RESCHEDULE' ? 'Reschedule' : 'Extension'} Request
              </h3>
              <button onClick={() => {
                setShowApproveModal(false);
                setShowReassignOptions(false);
                setShowAddAnotherAuditor(false);
                setSelectedReassignAuditorId('');
                setAdditionalAuditorIds([]);
              }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4">
              {/* Audit Info */}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Audit</p>
                <p className="text-sm font-medium">{selectedRequest.auditType} - {selectedRequest.department}</p>
              </div>
              
              {/* Current Auditor - Show who is currently assigned */}
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="flex items-center gap-1 text-xs text-blue-600"><FiUserCheck className="w-3 h-3" /> Current Auditor</p>
                <p className="text-sm font-medium">{selectedRequest.auditorName}</p>
              </div>
      
              {/* Show the assigned team for this department */}
              {!loadingTeamMembers && departmentTeamMembers.leadAuditorName && (
                <div className="p-3 mt-2 rounded-lg bg-blue-50">
                  <p className="text-xs font-medium text-blue-800">Assigned Audit Team for {selectedRequest?.department}:</p>
                  <p className="mt-1 text-xs text-blue-600">
                    ⭐ Lead: {departmentTeamMembers.leadAuditorName}
                  </p>
                  {departmentTeamMembers.teamAuditorNames?.length > 0 && (
                    <p className="text-xs text-blue-600">
                      👥 Team: {departmentTeamMembers.teamAuditorNames.join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {/* ============================================= */}
              {/* CHECKBOX 1: Reassign to different auditor */}
              {/* ============================================= */}
              <div className="pt-3 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showReassignOptions}
                    onChange={(e) => {
                      setShowReassignOptions(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedReassignAuditorId('');
                      }
                    }}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">🔄 Reassign to different auditor</span>
                </label>
                <p className="mt-1 ml-6 text-xs text-gray-500">Replace the current auditor with a new one</p>
                            
                  {showReassignOptions && (
        <div className="mt-3 ml-6 space-y-3">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Select Primary Auditor <span className="text-red-500">*</span>
            </label>
            
            {loadingTeamMembers ? (
              <div className="w-full p-2 text-center text-gray-400 rounded-lg bg-gray-50">
                <div className="inline-block w-4 h-4 mr-2 border-2 border-gray-300 rounded-full animate-spin border-t-orange-600"></div>
                Loading team members...
              </div>
            ) : departmentTeamMembers.auditors.length === 0 ? (
              <div className="w-full p-2 text-sm rounded-lg text-amber-600 bg-amber-50">
                No team members assigned for {selectedRequest?.department} department
              </div>
            ) : (
              <>
                <select
  value={selectedReassignAuditorId}
  onChange={(e) => setSelectedReassignAuditorId(e.target.value)}
  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
>
  <option value="">-- Select an auditor --</option>
  {departmentTeamMembers.auditors
    .filter(a => {
      // Exclude current auditor
      if (selectedRequest?.auditorId && Number(a.id) === Number(selectedRequest.auditorId)) {
        return false;
      }
      if (selectedRequest?.auditorName) {
        const currentAuditor = availableAuditors.find(
          aud => `${aud.firstName} ${aud.lastName}` === selectedRequest.auditorName
        );
        if (currentAuditor && Number(a.id) === Number(currentAuditor.id)) {
          return false;
        }
      }
      // ✅ Lead auditor is already excluded from auditors array, so no need for extra check
      return true;
    })
    .map(auditor => {
      const isTeamMember = departmentTeamMembers.teamAuditorIds?.includes(auditor.id);
      return (
        <option key={auditor.id} value={auditor.id}>
          {isTeamMember ? '👥 ' : '  '}
          {auditor.firstName} {auditor.lastName}
          {isTeamMember ? ' (Team Auditor)' : ''}
        </option>
      );
    })}
</select>
                
                {/* Show conflict warning for reassign */}
                {checkingAvailability && (
                  <div className="flex items-center gap-2 p-2 text-sm text-blue-600 rounded-lg bg-blue-50">
                    <div className="w-4 h-4 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                    Checking auditor availability...
                  </div>
                )}
                
                {conflictWarning && conflictWarning.type === 'reassign' && (
                  <div className="p-2 text-sm text-red-700 rounded-lg bg-red-50">
                    <div className="flex items-start gap-2">
                      <FiAlertCircle className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">⚠️ Time Conflict Detected!</p>
                        <p>Auditor {conflictWarning.auditorName} is already scheduled at this time:</p>
                        <ul className="mt-1 ml-4 list-disc">
                          {conflictWarning.conflicts.map((c, idx) => (
                            <li key={idx}>
                              {c.date}: {c.conflict.startTime} - {c.conflict.endTime} 
                              ({c.conflict.department || c.conflict.auditType})
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 text-xs">Please select a different auditor.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
              </div>
              
              {/* ============================================= */}
              {/* CHECKBOX 2: Add another auditor (Co-auditor) */}
              {/* ============================================= */}
              <div className="pt-3 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAddAnotherAuditor}
                    onChange={(e) => {
                      setShowAddAnotherAuditor(e.target.checked);
                      if (!e.target.checked) {
                        setAdditionalAuditorIds([]);
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">➕ Add another auditor (Co-auditor)</span>
                </label>
                <p className="mt-1 ml-6 text-xs text-gray-500">Add additional auditor without removing the primary one</p>
                {showAddAnotherAuditor && (
        <div className="mt-3 ml-6 space-y-3">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Select Additional Auditor(s)
            </label>
            {loadingTeamMembers ? (
              <div className="w-full p-2 text-center text-gray-400 rounded-lg bg-gray-50">
                Loading...
              </div>
            ) : (
              <>
                <select
                  value=""
                  onChange={(e) => {
                    const selectedId = parseInt(e.target.value);
                    if (selectedId && !additionalAuditorIds.includes(selectedId)) {
                      setAdditionalAuditorIds([...additionalAuditorIds, selectedId]);
                    }
                    e.target.value = "";
                  }}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Add a co-auditor --</option>
                  {departmentTeamMembers.auditors
                    .filter(a => {
                      // Find current auditor ID
                      let currentAuditorId = null;
                      if (selectedRequest?.auditorId) {
                        currentAuditorId = Number(selectedRequest.auditorId);
                      } else if (selectedRequest?.auditorName) {
                        const currentAuditor = availableAuditors.find(
                          aud => `${aud.firstName} ${aud.lastName}` === selectedRequest.auditorName
                        );
                        currentAuditorId = currentAuditor?.id;
                      }
                      
                      // EXCLUDE CURRENT AUDITOR
                      if (currentAuditorId && Number(a.id) === currentAuditorId) return false;
                      
                      // EXCLUDE if already selected for reassign
                      if (showReassignOptions && Number(a.id) === Number(selectedReassignAuditorId)) return false;
                      
                      // EXCLUDE already selected co-auditors
                      if (additionalAuditorIds.includes(Number(a.id))) return false;
                      
                      // ✅ No need to check for lead auditor - they're not in the array!
                      return true;
                    })
                    .map(auditor => (
                      <option key={auditor.id} value={auditor.id}>
                        {auditor.firstName} {auditor.lastName}
                      </option>
                    ))}
                </select>
                
                {/* Show conflict warning for co-auditor selection */}
                {checkingAvailability && (
                  <div className="flex items-center gap-2 p-2 text-sm text-blue-600 rounded-lg bg-blue-50">
                    <div className="w-4 h-4 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                    Checking auditor availability...
                  </div>
                )}
                
                {conflictWarning && conflictWarning.type === 'coauditor' && (
                  <div className="p-2 text-sm text-orange-700 rounded-lg bg-orange-50">
                    <div className="flex items-start gap-2">
                      <FiAlertCircle className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">⚠️ Potential Time Conflict!</p>
                        <p>Auditor {conflictWarning.auditorName} is already scheduled at this time.</p>
                        <p className="mt-1 text-xs">You can still add them, but they will have overlapping schedules.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Display selected additional auditors */}
          {additionalAuditorIds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Selected Co-auditors:</p>
              {additionalAuditorIds.map(id => {
                const auditor = departmentTeamMembers.auditors.find(a => a.id === id);
                return auditor ? (
                  <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium">{auditor.firstName} {auditor.lastName}</p>
                      {departmentTeamMembers.teamAuditorIds?.includes(id) && (
                        <p className="text-xs text-purple-600">Co-Auditor</p>
                      )}
                    </div>
                    <button
                      onClick={() => setAdditionalAuditorIds(additionalAuditorIds.filter(aid => aid !== id))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
              </div>
              
              {/* Requested Changes */}
              <div className="p-3 rounded-lg bg-emerald-50">
                <p className="text-xs font-medium text-emerald-600">Requested Changes</p>
                {selectedRequest.type === 'RESCHEDULE' ? (
                  <div className="mt-1 text-sm">
                    <p><span className="text-gray-500">New Date:</span> <strong>{selectedRequest.requestedNewDate}</strong></p>
                    <p><span className="text-gray-500">New Time:</span> {selectedRequest.requestedNewStartTime} - {selectedRequest.requestedNewEndTime}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm"><span className="text-gray-500">New End Date:</span> <strong>{selectedRequest.requestedNewToDate}</strong></p>
                )}
              </div>
              
              {/* Comments */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Comments (Optional)</label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Add any comments about this approval..."
                />
              </div>
            </div>
            
            {/* Summary Section */}
            {(showReassignOptions || showAddAnotherAuditor) && (
              <div className="p-3 mt-4 rounded-lg bg-gray-50">
                <p className="mb-2 text-xs font-medium text-gray-700">Approval Summary:</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  {showReassignOptions && selectedReassignAuditorId && (
                    <li>• Current auditor <span className="font-medium text-orange-600">({selectedRequest.auditorName})</span> will be <span className="font-medium text-orange-600">REPLACED</span></li>
                  )}
                  {!showReassignOptions && showAddAnotherAuditor && (
                    <li>• Current auditor <span className="font-medium text-green-600">({selectedRequest.auditorName})</span> will be <span className="font-medium text-green-600">KEPT</span> as primary auditor</li>
                  )}
                  {additionalAuditorIds.length > 0 && (
                    <li>• {additionalAuditorIds.length} co-auditor(s) will be <span className="font-medium text-purple-600">ADDED</span></li>
                  )}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowApproveModal(false);
                  setShowReassignOptions(false);
                  setShowAddAnotherAuditor(false);
                  setSelectedReassignAuditorId('');
                  setAdditionalAuditorIds([]);
                }} 
                className="px-4 py-2 transition-colors border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={selectedRequest.type === 'RESCHEDULE' ? handleApproveReschedule : handleApproveExtension} 
                disabled={submitting || (showReassignOptions && !selectedReassignAuditorId) || (showReassignOptions && conflictWarning?.type === 'reassign')}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCheck className="w-4 h-4" />}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
      
            {showRejectModal && selectedRequest && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-xl animate-slideUp">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Reject {selectedRequest.type === 'RESCHEDULE' ? 'Reschedule' : 'Extension'} Request
                  </h3>
                  <p className="mb-3 text-sm text-gray-600">Please provide a reason for rejection:</p>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="Enter rejection reason..."
                    autoFocus
                  />
                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 transition-colors border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleRejectRequest} disabled={submitting} className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700">
                      {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiX className="w-4 h-4" />}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

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

{/* Request Details Modal - Shows when View button is clicked */}
<RequestDetailsModal
  request={selectedRequestForModal}
  isOpen={showRequestModal}
  onClose={() => {
    setShowRequestModal(false);
    setSelectedRequestForModal(null);
  }}
  onApprove={(req) => {
    // Close the details modal and open the approve modal
    setShowRequestModal(false);
    setSelectedRequest(req);
    setShowApproveModal(true);
  }}
  onReject={(req) => {
    // Close the details modal and open the reject modal
    setShowRequestModal(false);
    setSelectedRequest(req);
    setShowRejectModal(true);
  }}
  departmentTeamMembers={departmentTeamMembers}
  loadingTeamMembers={loadingTeamMembers}
/>
    </div>
    
  );
}
