import { useState, useEffect, useCallback } from 'react'

import { useNavigate } from 'react-router-dom'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import { useAuth } from '../context/AuthContext'
import { useCalendar } from '../context/CalendarContext'
import { calendarAPI } from '../services/calendarApi'
import YearView from './YearView'
import axios from 'axios'
import {
  RefreshCw,
  AlertCircle,
  Crown,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  Search,
  X,
  CalendarDays,
  List,
  Clock,
  Tag,
  Target,
  CheckCircle,
  Calendar as CalendarIcon  
} from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ========== ADD THIS USER CACHE CODE ==========
let userCache = null;
let userCachePromise = null;

// Function to fetch all users from backend
const fetchAllUsers = async () => {
  if (userCache) return userCache;
  
  if (userCachePromise) return userCachePromise;
  
  userCachePromise = (async () => {
    try {
      const userEmail = localStorage.getItem('userEmail') || '';
      const userId = localStorage.getItem('userId') || '';
      
      console.log('📡 Fetching all users from backend...');
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          'Content-Type': 'application/json',
          'User-Email': userEmail,
          'User-ID': userId
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        // Create maps for quick lookup
        userCache = {
          byId: new Map(),
          byName: new Map(),
          byEmail: new Map()
        };
        
        users.forEach(user => {
          userCache.byId.set(user.id, user);
          
          // Store by full name
          if (user.name) {
            userCache.byName.set(user.name, user.id);
          }
          
          // Store by first + last name
          if (user.firstName && user.lastName) {
            const fullName = `${user.firstName} ${user.lastName}`;
            userCache.byName.set(fullName, user.id);
          }
          
          // Store by email
          if (user.email) {
            userCache.byEmail.set(user.email, user.id);
          }
        });
        
        console.log('✅ User cache loaded successfully!', {
          totalUsers: users.length,
          nameMappings: userCache.byName.size
        });
        
        return userCache;
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    return null;
  })();
  
  return userCachePromise;
};
// ========== END USER CACHE CODE ==========

// Helper function to parse time string
function parseTimeString(timeStr) {
  if (!timeStr) return { hours: 9, minutes: 0 }
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (match) {
    let hours = parseInt(match[1])
    const minutes = parseInt(match[2])
    const period = match[3].toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return { hours, minutes }
  }
  return { hours: 9, minutes: 0 }
}

// Get short display for audit type
function getAuditTypeShort(auditType) {
  if (!auditType) return 'AUD'
  const types = {
    '5S Audit': '5S',
    'IATF 16949': 'IATF',
    'Process Audit': 'PRC',
    'Product Audit': 'PRD',
    'ISO 9001': 'ISO',
    'System Audit (ISO9001)': 'ISO',
    'System Audit (IATF16949)': 'IATF',
    'Opening Meeting': 'OPN',
    'Closing Meeting': 'CLS',
    'Lunch Break': 'LCH'
  }
  return types[auditType] || auditType?.substring(0, 3).toUpperCase() || 'AUD'
}

// Check if event is COMPLETED (from audit form)
function isEventCompleted(event) {
  if (!event) return false
  const status = event.status || 'SCHEDULED'
  return status === 'COMPLETED' || event.isFullyCompleted === true
}

// Check if audit is submitted (waiting for auditee approval)
function isEventSubmitted(event) {
  if (!event) return false
  const status = event.status || 'SCHEDULED'
  return status === 'SUBMITTED' || event.isSubmitted === true
}

// Check if event is overdue
function isEventOverdue(event) {
  if (!event || !event.end) return false
  
  const eventEnd = new Date(event.end)
  const now = new Date()
  const status = event.status || 'SCHEDULED'
  
  // ✅ NEVER overdue for these statuses
  if (isEventCompleted(event)) return false
  if (isEventSubmitted(event)) return false
  if (status === 'PENDING_APPROVAL') return false
  if (status === 'REJECTED') return false
  if (status === 'CHANGE_REQUESTED') return false
  if (status === 'DRAFT') return false
  
  // Overdue if APPROVED or SCHEDULED past due date
  if ((status === 'APPROVED' || status === 'SCHEDULED') && eventEnd < now) {
    return true
  }
  
  return false
}

// Get dot color based on event status
function getDotColor(event) {
  const status = event.status || 'SCHEDULED'
  const isOverdue = isEventOverdue(event)
  const isDateRange = event.isDateRange
  const isCompleted = isEventCompleted(event)
  const isSubmitted = isEventSubmitted(event)
  
  // ✅ COMPLETED (highest priority) - GREEN
  if (isCompleted) return '#059669'  // emerald-500
  
  // ✅ SUBMITTED (waiting for auditee) - BLUE
  if (isSubmitted) return '#3b82f6'  // blue-500
  
  // OVERDUE - RED
  if (isOverdue) return '#ef4444'  // red-500
  
  // Date range - PURPLE
  if (isDateRange) return '#8b5cf6'  // purple-500
  
  // Status based colors
  switch (status) {
    case 'APPROVED': return '#10b981'     // green-500
    case 'PENDING_APPROVAL': return '#f59e0b'  // yellow-500
    case 'REJECTED': return '#f87171'     // red-400
    case 'CHANGE_REQUESTED': return '#f97316'  // orange-500
    case 'SCHEDULED': return '#0ea5e9'    // sky-500 (was blue-500)
    default: return '#6b7280'  // gray-500
  }
}
// Get status display text
function getStatusDisplay(event) {
  const isOverdue = isEventOverdue(event)
  const isCompleted = isEventCompleted(event)
  const isSubmitted = isEventSubmitted(event)
  const status = event.status || 'SCHEDULED'
  
  if (isCompleted) return '✓ Audit Completed'
  if (isSubmitted) return '⏳ Pending Auditee Approval'
  if (isOverdue) return 'OVERDUE'
  
  const statusMap = {
    'SCHEDULED': 'Scheduled',
    'PENDING_APPROVAL': 'Pending Schedule Approval',
    'APPROVED': 'Schedule Approved',
    'REJECTED': 'Rejected',
    'DRAFT': 'Draft',
    'CHANGE_REQUESTED': 'Changes Requested'
  }
  return statusMap[status] || status
}

// Calculate progress for date range audit
function getDateRangeProgress(event) {
  if (!event.isDateRange || !event.fromDate || !event.toDate) return null
  
  const fromDate = new Date(event.fromDate)
  const toDate = new Date(event.toDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const totalDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1
  const elapsedDays = Math.max(0, Math.ceil((today - fromDate) / (1000 * 60 * 60 * 24)))
  
  // Don't show progress if not started
  if (elapsedDays < 0) return { percentage: 0, text: 'Not started yet' }
  
  // Show completed if past end date
  if (today > toDate) return { percentage: 100, text: 'Completed' }
  
  const percentage = Math.min(100, Math.round((elapsedDays / totalDays) * 100))
  const remainingDays = totalDays - elapsedDays
  
  let text = ''
  if (remainingDays === 0) text = 'Last day today'
  else if (remainingDays === 1) text = 'Ends tomorrow'
  else text = `${remainingDays} days remaining`
  
  return { percentage, text }
}

// Event style getter
const eventStyleGetter = (event) => {
  if (!event) return { style: {} }

  const userRelationship = event.userRelationship || 'none'
  const dotColor = getDotColor(event)
  const isOverdue = isEventOverdue(event)
  const isCompleted = isEventCompleted(event)
  
  const borderColorMap = {
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#10b981',
    'bg-emerald-500': '#10b981',
    'bg-yellow-500': '#f59e0b',
    'bg-red-500': '#ef4444',
    'bg-red-400': '#f87171',
    'bg-purple-500': '#8b5cf6',
    'bg-orange-500': '#f97316',
    'bg-gray-500': '#6b7280'
  }
  
  const borderColor = borderColorMap[dotColor] || '#3b82f6'
  const textColor = isCompleted ? '#059669' : (isOverdue ? '#dc2626' : '#374151')

  return {
    style: {
      backgroundColor: 'transparent',
      border: 'none',
      borderLeft: userRelationship === 'owner' ? `3px solid ${borderColor}` : (userRelationship === 'attendee' ? '3px solid #10b981' : 'none'),
      color: textColor,
      fontSize: '11px',
      padding: '2px 4px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer',
      height: '100%',
      overflow: 'hidden',
      textDecoration: isCompleted ? 'none' : (isOverdue ? 'line-through' : 'none')
    }
  }
}

// Custom Date Cell Wrapper - Shows dots on ALL dates in range
const CustomDateCellWrapper = ({ children, value, events }) => {
  if (!value || !events) return <div>{children}</div>
  
  const checkDate = new Date(value)
  checkDate.setHours(0, 0, 0, 0)
  
  // Get ALL events that fall on this date (including date ranges)
  const dayEvents = events.filter(event => {
    if (!event) return false
    
    // For date range events - check if date falls within fromDate and toDate
    if (event.isDateRange && event.fromDate && event.toDate) {
      const fromDate = new Date(event.fromDate)
      const toDate = new Date(event.toDate)
      fromDate.setHours(0, 0, 0, 0)
      toDate.setHours(0, 0, 0, 0)
      
      // Return true for ALL dates in the range
      return checkDate >= fromDate && checkDate <= toDate
    }
    
    // For regular events
    if (event.start) {
      const startDate = new Date(event.start)
      startDate.setHours(0, 0, 0, 0)
      return checkDate.getTime() === startDate.getTime()
    }
    
    return false
  })
  
  if (dayEvents.length === 0) {
    return <div>{children}</div>
  }
  
  // Count different types for dots
  const hasCompleted = dayEvents.some(e => isEventCompleted(e))
  const hasSubmitted = dayEvents.some(e => isEventSubmitted(e))
  const hasOverdue = dayEvents.some(e => isEventOverdue(e))
  const hasScheduled = dayEvents.some(e => e.status === 'SCHEDULED' && !isEventOverdue(e) && !isEventCompleted(e))
  const hasApproved = dayEvents.some(e => e.status === 'APPROVED' && !isEventOverdue(e) && !isEventCompleted(e))
  const hasPending = dayEvents.some(e => e.status === 'PENDING_APPROVAL')
  const hasRejected = dayEvents.some(e => e.status === 'REJECTED')
  const hasDateRange = dayEvents.some(e => e.isDateRange)
  const hasChangeRequested = dayEvents.some(e => e.status === 'CHANGE_REQUESTED')
  const totalCount = dayEvents.length
  
  return (
    <div className="relative h-full">
      {children}
      {/* Show dots at bottom of each date cell */}
      <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5 flex-wrap">
        {hasCompleted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Audit Completed" />}
        {hasSubmitted && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Pending Auditee Approval" />}
        {hasOverdue && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Overdue" />}
        {hasScheduled && <div className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Scheduled" />}
        {hasApproved && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Schedule Approved" />}
        {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" title="Pending Schedule Approval" />}
        {hasRejected && <div className="w-1.5 h-1.5 rounded-full bg-red-400" title="Rejected" />}
        {hasDateRange && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Date Range" />}
        {hasChangeRequested && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Changes Requested" />}
        {totalCount > 3 && (
          <span className="text-[8px] text-gray-400 ml-0.5">+{totalCount - 3}</span>
        )}
      </div>
    </div>
  )
}


const UserAvatar = ({ userId, userName, size = 'sm', showName = false }) => {
  const [imageError, setImageError] = useState(false);
  
  // Don't use blob, just use the URL directly like navbar does
  const photoUrl = userId ? `https://internalaudit.hub.swajyot.co.in:8090
/api/users/${userId}/profile-photo` : null;
  
  const sizeClasses = {
    'xs': 'w-5 h-5 text-[10px]',
    'sm': 'w-6 h-6 text-xs',
    'md': 'w-8 h-8 text-sm',
    'lg': 'w-10 h-10 text-base'
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // If no userId, just show initials
  if (!userId) {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const colorIndex = Math.floor(Math.random() * colors.length);
    const bgColor = colors[colorIndex];
    
    return (
      <div className="flex items-center gap-2">
        <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium`}>
          {getInitials(userName)}
        </div>
        {showName && <span className="text-sm text-gray-700">{userName}</span>}
      </div>
    );
  }

  // Show image using direct URL (same as navbar)
  return (
    <div className="flex items-center gap-2">
      <img
        src={photoUrl}
        alt={userName || 'User'}
        className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200`}
        onError={(e) => {
          // If image fails to load, show initials instead
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `
            <div class="${sizeClasses[size]} bg-purple-500 rounded-full flex items-center justify-center text-white font-medium">
              ${getInitials(userName)}
            </div>
            ${showName ? `<span class="text-sm text-gray-700">${userName}</span>` : ''}
          `;
        }}
      />
      {showName && <span className="text-sm text-gray-700">{userName}</span>}
    </div>
  );
};

///UPDATED
const AuditDetailsPopup = ({ audit, onClose }) => {

   console.log('🎯 AuditDetailsPopup received:', {
    id: audit.id,
    auditNumber: audit.auditNumber,
    originalScheduledDate: audit.originalScheduledDate,
    rescheduleHistory: audit.rescheduleHistory,
    extensionHistory: audit.extensionHistory,
    pendingReschedule: audit.pendingReschedule
  });

  
  const progress = getDateRangeProgress(audit)
  const isCompleted = isEventCompleted(audit)
  const isSubmitted = isEventSubmitted(audit)
  
  // Check if audit has been rescheduled (has original date)
  const hasRescheduleHistory = audit.originalScheduledDate || 
                               (audit.rescheduleHistory && audit.rescheduleHistory.length > 0)
  
  const getStatusBadge = (event) => {
    const isOverdue = isEventOverdue(event)
    const status = event.status || 'SCHEDULED'
    
    if (isCompleted) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (isSubmitted) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (isOverdue) return 'bg-red-50 text-red-700'
    
    const badges = {
      SCHEDULED: 'bg-blue-50 text-blue-700',
      PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700',
      APPROVED: 'bg-green-50 text-green-700',
      REJECTED: 'bg-red-50 text-red-700',
      CHANGE_REQUESTED: 'bg-orange-50 text-orange-700'
    }
    return badges[status] || 'bg-gray-50 text-gray-700'
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (date, timeStr) => {
    if (!date) return 'N/A'
    const formattedDate = formatDate(date)
    if (timeStr) {
      return `${formattedDate} • ${timeStr}`
    }
    return formattedDate
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A'
    return timeStr
  }

  const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate
  const isOverdue = isEventOverdue(audit)
  const dotColor = getDotColor(audit)
  const statusDisplay = getStatusDisplay(audit)

  // Get co-auditors
  const getCoAuditors = () => {
    if (audit.coAuditorNames && Array.isArray(audit.coAuditorNames) && audit.coAuditorNames.length > 0) {
      return audit.coAuditorNames
    }
    return []
  }

  const primaryAuditor = audit.auditorName || 'Not assigned'
  const coAuditors = getCoAuditors()
  const hasCoAuditors = coAuditors.length > 0

  // Get the latest reschedule (if any)
  const rescheduleHistory = audit.rescheduleHistory || []
  const extensionHistory = audit.extensionHistory || []
  const latestReschedule = rescheduleHistory.length > 0 ? rescheduleHistory[rescheduleHistory.length - 1] : null
  const latestExtension = extensionHistory.length > 0 ? extensionHistory[extensionHistory.length - 1] : null

  // Get the current schedule date display
  const getCurrentScheduleDisplay = () => {
    if (isDateRange) {
      return `${formatDate(audit.fromDate)} → ${formatDate(audit.toDate)}`
    }
    return formatDate(audit.start)
  }

  // Get the original schedule date display (for rescheduled audits)
  const getOriginalScheduleDisplay = () => {
    if (audit.originalScheduledDate) {
      return formatDate(audit.originalScheduledDate)
    }
    if (latestReschedule?.oldDate) {
      return formatDate(latestReschedule.oldDate)
    }
    return null
  }

  const originalDate = getOriginalScheduleDisplay()
  const currentDate = getCurrentScheduleDisplay()
  const hasReschedule = !!(originalDate && originalDate !== currentDate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto border border-white/20">
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${dotColor}`} />
            <h3 className="text-lg font-bold text-white">Audit Details</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white transition-colors rounded-lg hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Header with Audit Type and Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {audit.auditType || 'Audit'}
              </h2>
              {audit.auditNumber && (
                <p className="text-xs font-mono text-gray-500 mt-0.5">{audit.auditNumber}</p>
              )}
            </div>
            <div className="flex gap-2">
              {isCompleted && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Completed
                </span>
              )}
              {isSubmitted && !isCompleted && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                  ⏳ Pending Approval
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(audit)}`}>
                {statusDisplay}
              </span>
            </div>
          </div>

          {/* Department */}
          <div className="flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">Department:</span>
            <span className="font-medium text-gray-700">{audit.department || 'N/A'}</span>
          </div>

          {/* Schedule Information - Similar to Grid Card */}
          <div className={`p-3 rounded-lg ${hasReschedule ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
            {/* Original/Previous Date - Like grid card shows "Was: 2026-05-14" */}
            {hasReschedule && (
              <div className="flex items-center gap-2 mb-2 text-xs">
                <CalendarIcon className="w-3 h-3 text-amber-600" />
                <span className="text-gray-500 line-through">Was:</span>
                <span className="text-gray-500 line-through">{originalDate}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-100 rounded">Rescheduled</span>
              </div>
            )}
            
            {/* Current Date */}
            <div className="flex items-center gap-2">
              <CalendarDays className={`w-4 h-4 ${hasReschedule ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${hasReschedule ? 'text-emerald-700' : 'text-gray-700'}`}>
                {isDateRange ? 'Date Range:' : 'Date:'}
              </span>
              <span className={`text-sm ${hasReschedule ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                {isDateRange 
                  ? `${formatDate(audit.fromDate)} → ${formatDate(audit.toDate)}`
                  : formatDate(audit.start)
                }
              </span>
            </div>
            
            {/* Time */}
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Time:</span>
              <span className="text-gray-700">{formatTime(audit.startTime)} - {formatTime(audit.endTime)}</span>
            </div>

            {/* Date Range Progress Bar */}
            {isDateRange && progress && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-purple-600">Progress</span>
                  <span className="text-xs font-medium text-purple-600">{progress.text}</span>
                </div>
                <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500 bg-purple-400 rounded-full"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {isDateRange && (
              <p className="mt-2 text-xs text-purple-500">✅ Auditor can complete any day within this range</p>
            )}
          </div>

          {/* Complete Reschedule History (if multiple reschedules) */}
          {rescheduleHistory.length > 1 && (
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600">Previous Reschedules:</span>
              </div>
              <div className="space-y-1.5">
                {rescheduleHistory.slice(0, -1).map((history, idx) => (
                  <div key={idx} className="text-xs text-gray-500">
                    <span className="line-through">{formatDate(history.oldDate)}</span>
                    <span className="mx-1">→</span>
                    <span>{formatDate(history.newDate)}</span>
                    {history.reason && <span className="block text-gray-400">Reason: {history.reason}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isOverdue && (
            <div className="p-2 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">⚠️ This audit is OVERDUE</span>
              </div>
            </div>
          )}


{console.log('🎨 Rendering Primary Auditor with:', { 
  auditorId: audit.auditorId, 
  primaryAuditor 
})}
          {/* Updated Auditor Section with Profile Images */}
{/* REPLACE with this version showing profile images */}
{hasCoAuditors ? (
  <div className="grid grid-cols-2 gap-3">
    <div className="p-3 rounded-lg bg-blue-50">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-blue-700">Primary Auditor</span>
      </div>
      <UserAvatar userId={audit.auditorId} userName={primaryAuditor} size="md" showName={true} />
    </div>

    <div className="p-3 rounded-lg bg-teal-50">
      <div className="flex items-center gap-2 mb-2">
        <UserCheck className="w-4 h-4 text-teal-500" />
        <span className="text-sm font-semibold text-teal-700">
          Co-Auditors ({coAuditors.length})
        </span>
      </div>
      <div className="space-y-2">
        {coAuditors.map((coAuditor, index) => {
          const coAuditorId = audit.coAuditorIdList?.[index];
          return (
            <UserAvatar 
              key={index} 
              userId={coAuditorId} 
              userName={coAuditor} 
              size="sm" 
              showName={true} 
            />
          );
        })}
      </div>
    </div>
  </div>
) : (
  <div className="p-3 rounded-lg bg-blue-50">
    <div className="flex items-center gap-2 mb-2">
      <Crown className="w-4 h-4 text-blue-500" />
      <span className="text-sm font-semibold text-blue-700">Primary Auditor</span>
    </div>
    <UserAvatar userId={audit.auditorId} userName={primaryAuditor} size="md" showName={true} />
  </div>
)}

{/* REPLACE with this version showing profile image */}
<div className="p-3 rounded-lg bg-gray-50">
  <div className="flex items-center gap-2 mb-2">
    <UserCheck className="w-4 h-4 text-gray-400" />
    <span className="text-sm font-semibold text-gray-600">Auditee</span>
  </div>
  <UserAvatar userId={audit.auditeeId} userName={audit.auditeeName || 'Not assigned'} size="md" showName={true} />
</div>


          {audit.description && (
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="mb-1 text-xs text-gray-500">Objective / Description</p>
              <p className="text-sm text-gray-600">{audit.description}</p>
            </div>
          )}

          {/* Pending Request Status */}
          {(audit.pendingReschedule || audit.pendingExtension) && (
            <div className="p-2 rounded-lg bg-yellow-100/50">
              <div className="flex items-center gap-1 text-xs text-yellow-700">
                <Clock className="w-3 h-3 animate-pulse" />
                <span>
                  {audit.pendingReschedule ? '⏳ Reschedule request pending approval' : '⏳ Extension request pending approval'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end px-4 py-3 border-t border-gray-100 bg-gray-50/80">
          <button onClick={onClose} className="px-4 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Event List Component
const EventListComponent = ({ events, onEventClick }) => {
  const groupedEvents = events.reduce((groups, event) => {
    if (event.isDateRange && event.fromDate && event.toDate) {
      const rangeKey = `range_${event.id}`
      if (!groups[rangeKey]) {
        groups[rangeKey] = { ...event, events: [] }
      }
      groups[rangeKey].events.push(event)
      return groups
    }
    
    const dateKey = moment(event.start).format('YYYY-MM-DD')
    if (!groups[dateKey]) {
      groups[dateKey] = event
    }
    return groups
  }, {})

  const sortedEvents = Object.values(groupedEvents).sort((a, b) => {
    const dateA = a.isDateRange ? new Date(a.fromDate) : new Date(a.start)
    const dateB = b.isDateRange ? new Date(b.fromDate) : new Date(b.start)
    return dateA - dateB
  })

  const getStatusColor = (event) => {
    if (isEventCompleted(event)) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (isEventSubmitted(event)) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (isEventOverdue(event)) return 'text-red-600 bg-red-50 border-red-200'
    const status = event.status || 'SCHEDULED'
    const colorMap = {
      'SCHEDULED': 'text-sky-600 bg-sky-50 border-sky-200',
      'PENDING_APPROVAL': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'APPROVED': 'text-green-600 bg-green-50 border-green-200',
      'REJECTED': 'text-red-600 bg-red-50 border-red-200',
      'CHANGE_REQUESTED': 'text-orange-600 bg-orange-50 border-orange-200'
    }
    return colorMap[status] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  return (
    <div className="h-full p-4 overflow-auto">
      {sortedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <CalendarDays className="w-12 h-12 mb-2" />
          <p>No audits found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event, idx) => {
            const isDateRange = event.isDateRange
            const dotColor = getDotColor(event)
            const isOverdue = isEventOverdue(event)
            const isCompleted = isEventCompleted(event)
            const isSubmitted = isEventSubmitted(event)
            const statusDisplay = getStatusDisplay(event)
            const rangeProgress = isDateRange ? getDateRangeProgress(event) : null
            const isToday = !isDateRange && moment(event.start).isSame(moment(), 'day')
            
            return (
              <div
                key={event.id || idx}
                onClick={() => onEventClick(event)}
                className="overflow-hidden transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-xl hover:shadow-md"
              >
                <div className={`p-4 ${isDateRange ? 'border-l-4 border-l-purple-500' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${dotColor} ${event.status === 'PENDING_APPROVAL' && !isOverdue ? 'animate-pulse' : ''}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold text-base ${isOverdue ? 'text-red-600 line-through' : isCompleted ? 'text-emerald-600' : isSubmitted ? 'text-blue-600' : 'text-gray-800'}`}>
                            {event.auditType || 'Audit'}
                          </span>
                          {isDateRange && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              Date Range
                            </span>
                          )}
                          {isToday && !isDateRange && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Today</span>
                          )}
                          {isCompleted && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Audit Completed
                            </span>
                          )}
                          {isSubmitted && !isCompleted && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                              ⏳ Pending Approval
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(event)}`}>
                          {statusDisplay}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-2 text-sm text-gray-600">
  <div className="flex items-center gap-1">
    <Tag className="h-3.5 w-3.5 text-gray-400" />
    <span>{event.department || 'General'}</span>
  </div>
  <div className="flex items-center gap-1">
    <Clock className="h-3.5 w-3.5 text-gray-400" />
    <span>{event.startTime || '09:00 AM'} - {event.endTime || '10:00 AM'}</span>
  </div>
  
  {/* NEW: Show auditor with profile image */}
  {event.auditorName && (
    <UserAvatar userId={event.auditorId} userName={event.auditorName} size="xs" showName={true} />
  )}
</div>
                      
                      {/* Date Range Display with Progress */}
                      {isDateRange && event.fromDate && event.toDate && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-1 text-sm text-purple-600">
                            <Target className="h-3.5 w-3.5" />
                            <span className="font-medium">
                              {moment(event.fromDate).format('MMM D')} - {moment(event.toDate).format('MMM D, YYYY')}
                            </span>
                          </div>
                          
                          {rangeProgress && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-purple-600">Progress</span>
                                <span className="text-xs font-medium text-purple-600">{rangeProgress.text}</span>
                              </div>
                              <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-500 bg-purple-600 rounded-full"
                                  style={{ width: `${rangeProgress.percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Regular Date Display */}
                      {!isDateRange && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{moment(event.start).format('dddd, MMMM D, YYYY')}</span>
                        </div>
                      )}
                      
                      {isOverdue && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          Overdue - Past schedule date
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CalendarView({ embedded = false }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sendEventCreated, sendEventUpdated, sendEventDeleted } = useCalendar()

  const [events, setEvents] = useState([])
  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAuditPopup, setShowAuditPopup] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [eventFilter, setEventFilter] = useState('all')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showListMode, setShowListMode] = useState(false)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [expandedLegend, setExpandedLegend] = useState(true)
  const [expandedFilter, setExpandedFilter] = useState(true)



  const [leadAuditorDepartment, setLeadAuditorDepartment] = useState(null);
const [userDepartment, setUserDepartment] = useState(null);


  const currentUser = user || calendarAPI.getCurrentUser()
  
  useEffect(() => {
    const role = currentUser?.role?.toUpperCase() || ''
    if (role === 'AUDIT_MANAGER') setUserRole('AUDIT_MANAGER')
    else if (role === 'TOP_MANAGEMENT') setUserRole('TOP_MANAGEMENT')
    else if (role === 'LEAD_AUDITOR') setUserRole('LEAD_AUDITOR')
    else if (role === 'AUDITEE') setUserRole('AUDITEE')
    else setUserRole('AUDITOR')
  }, [currentUser])


  ///UPDATED
 const loadEvents = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);

    // Load user cache first
    await fetchAllUsers();
    const userCacheData = await fetchAllUsers();

    let userRoleForAPI = 'AUDITOR'
    if (userRole === 'AUDIT_MANAGER') userRoleForAPI = 'AUDIT_MANAGER'
    else if (userRole === 'TOP_MANAGEMENT') userRoleForAPI = 'TOP_MANAGEMENT'
    else if (userRole === 'LEAD_AUDITOR') userRoleForAPI = 'LEAD_AUDITOR'
    else if (userRole === 'AUDITEE') userRoleForAPI = 'AUDITEE'

    // Fetch schedules
    let url;
    if (userRoleForAPI === 'AUDITOR') {
      url = `${API_BASE}/audit-schedule/auditor/${currentUser?.id}/schedules-with-status`;
      console.log('📡 Using auditor endpoint (includes history)');
    } else {
      url = `${API_BASE}/audit-schedule/year/${new Date().getFullYear()}`;
      console.log('📡 Using year endpoint');
    }
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Email': currentUser?.email || '',
        'User-ID': currentUser?.id || ''
      }
    })

    // Fetch responses for completion status
    const responsesResponse = await fetch(`${API_BASE}/templates/responses/all`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Email': currentUser?.email || '',
        'User-ID': currentUser?.id || ''
      }
    })
    const allResponses = await responsesResponse.json()

    // Create map of audit completion status by scheduleId
    const auditCompletionMap = new Map()
    allResponses.forEach(response => {
      if (response.auditScheduleId) {
        const isFullyCompleted = response.status === 'APPROVED'
        const isSubmitted = response.status === 'SUBMITTED'
        auditCompletionMap.set(response.auditScheduleId, {
          status: response.status,
          isFullyCompleted,
          isSubmitted,
          completedAt: response.updatedAt
        })
      }
    })

    if (response.ok) {
      let allSchedules = await response.json();
      
      // Handle different response structures
      if (userRoleForAPI === 'AUDITOR') {
        // Check if allSchedules is an array and has the schedule property
        if (Array.isArray(allSchedules) && allSchedules.length > 0 && allSchedules[0].schedule) {
          allSchedules = allSchedules.map(item => item.schedule);
          console.log('📊 Extracted schedules from auditor endpoint:', allSchedules.length);
        } else if (Array.isArray(allSchedules)) {
          console.log('📊 Schedules already in correct format:', allSchedules.length);
        } else {
          console.log('📊 Unexpected data format:', allSchedules);
          allSchedules = [];
        }
      }
      
      // ✅ ADD SAFETY CHECK - Make sure allSchedules is an array
      if (!Array.isArray(allSchedules)) {
        console.error('allSchedules is not an array:', allSchedules);
        allSchedules = [];
      }

      // Filter by department for Lead Auditor
      if (userRoleForAPI === 'LEAD_AUDITOR' && leadAuditorDepartment) {
        const beforeCount = allSchedules.length;
        allSchedules = allSchedules.filter(schedule => {
          const scheduleDept = schedule.department;
          const normalizedScheduleDept = normalizeDepartmentForFilter(scheduleDept);
          const matches = normalizedScheduleDept === leadAuditorDepartment;
          if (!matches && scheduleDept) {
            console.log(`  Filtering out schedule dept "${scheduleDept}" → "${normalizedScheduleDept}" (expected: ${leadAuditorDepartment})`);
          }
          return matches;
        });
        console.log(`📊 Lead Auditor (${leadAuditorDepartment}): Filtered schedules from ${beforeCount} to ${allSchedules.length}`);
      }

      // Now filter schedules as before
      let filteredSchedules = [];
      
      if (userRoleForAPI === 'AUDITOR') {
        filteredSchedules = allSchedules;
        console.log(`📊 Found ${filteredSchedules.length} total audits for user ${currentUser?.id}`);
      } else if (userRoleForAPI === 'AUDITEE') {
        filteredSchedules = allSchedules.filter(s => s && s.auditeeId === currentUser?.id);
      } else {
        filteredSchedules = allSchedules;
      }
  
      const formattedEvents = []
      
      // ✅ ADD SAFETY CHECK - Make sure filteredSchedules is an array
      if (!Array.isArray(filteredSchedules)) {
        console.error('filteredSchedules is not an array:', filteredSchedules);
        filteredSchedules = [];
      }
      
      // Use for...of for async/await support
      for (const audit of filteredSchedules) {
        // ✅ ADD SAFETY CHECK - Skip if audit is undefined
        if (!audit) {
          console.warn('Skipping undefined audit');
          continue;
        }
        
        // ✅ POPULATE MISSING USER IDs FROM CACHE
        if (userCacheData) {
          // Map auditor name to ID if missing
          if (!audit.auditorId && audit.auditorName) {
            const mappedId = userCacheData.byName.get(audit.auditorName);
            if (mappedId) {
              audit.auditorId = mappedId;
              console.log(`✅ Mapped auditor "${audit.auditorName}" to ID: ${mappedId}`);
            } else {
              console.warn(`⚠️ Could not find ID for auditor: "${audit.auditorName}"`);
            }
          }
          
          // Map auditee name to ID if missing
          if (!audit.auditeeId && audit.auditeeName) {
            const mappedId = userCacheData.byName.get(audit.auditeeName);
            if (mappedId) {
              audit.auditeeId = mappedId;
              console.log(`✅ Mapped auditee "${audit.auditeeName}" to ID: ${mappedId}`);
            } else {
              console.warn(`⚠️ Could not find ID for auditee: "${audit.auditeeName}"`);
            }
          }
          
          // Map co-auditor names to IDs
          if (audit.coAuditorNames && Array.isArray(audit.coAuditorNames) && audit.coAuditorNames.length > 0) {
            const coAuditorIds = [];
            for (const coName of audit.coAuditorNames) {
              const coId = userCacheData.byName.get(coName);
              if (coId) {
                coAuditorIds.push(coId);
              }
            }
            if (coAuditorIds.length > 0) {
              audit.coAuditorIdList = coAuditorIds;
              console.log(`✅ Mapped ${coAuditorIds.length} co-auditors to IDs`);
            }
          }
        }
        
        const completionInfo = auditCompletionMap.get(audit.id)
        const isFullyCompleted = completionInfo?.isFullyCompleted || false
        const isSubmitted = completionInfo?.isSubmitted || false
        
        // Determine display status
        let displayStatus
        if (isFullyCompleted) {
          displayStatus = 'COMPLETED'
        } else if (isSubmitted) {
          displayStatus = 'SUBMITTED'
        } else {
          displayStatus = audit.detailedApprovalStatus || audit.approvalStatus || 'SCHEDULED'
        }
        
        const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate

        // Fetch history for this audit
        const history = {
          originalScheduledDate: audit.originalScheduledDate || audit.previousScheduledDate || null,
          originalStartTime: audit.originalStartTime || null,
          rescheduleHistory: audit.rescheduleHistory || [],
          extensionHistory: audit.extensionHistory || [],
          pendingReschedule: audit.pendingReschedule || false,
          pendingExtension: audit.pendingExtension || false
        };
        
        // Determine co-auditor status
        let isCoAuditor = false
        let coAuditorNamesList = []
        let coAuditorIdList = []

        if (audit.coAuditorIds && audit.coAuditorIds !== 'null' && audit.coAuditorIds !== '[]') {
          try {
            let coIds = []
            if (typeof audit.coAuditorIds === 'string') {
              if (audit.coAuditorIds.startsWith('[')) {
                coIds = JSON.parse(audit.coAuditorIds)
              } else {
                coIds = audit.coAuditorIds.split(',').map(id => parseInt(id.trim()))
              }
            } else if (Array.isArray(audit.coAuditorIds)) {
              coIds = audit.coAuditorIds
            }
            
            isCoAuditor = coIds.includes(currentUser?.id)
            coAuditorIdList = coIds
            
            if (audit.coAuditorNames && Array.isArray(audit.coAuditorNames) && audit.coAuditorNames.length > 0) {
              coAuditorNamesList = audit.coAuditorNames
            } else {
              coAuditorNamesList = coIds.map(id => `Co-Auditor ID: ${id}`)
            }
          } catch (e) {
            console.error('Error parsing co-auditor IDs for schedule', audit.id, e)
          }
        }
        
        // Continue with your existing event creation code...
        if (isDateRange) {
          const fromDate = new Date(audit.fromDate)
          const toDate = new Date(audit.toDate)
          const { hours: startHours, minutes: startMinutes } = parseTimeString(audit.startTime || '09:00 AM')
          const { hours: endHours, minutes: endMinutes } = parseTimeString(audit.endTime || '10:00 AM')
          
          const startDateTime = new Date(fromDate)
          startDateTime.setHours(startHours, startMinutes)
          const endDateTime = new Date(toDate)
          endDateTime.setHours(endHours, endMinutes)
          
          formattedEvents.push({
            id: audit.id,
            title: audit.title || `${audit.department || 'Audit'} - ${audit.auditType || 'General'}`,
            start: startDateTime,
            end: endDateTime,
            status: displayStatus,
            auditType: audit.auditType,
            department: audit.department,
            isOwner: audit.auditorId === currentUser?.id,
            isCoAuditor: isCoAuditor,
            isAttendee: audit.auditeeId === currentUser?.id,
            userRelationship: audit.auditorId === currentUser?.id ? 'owner' : (isCoAuditor ? 'co_auditor' : (audit.auditeeId === currentUser?.id ? 'attendee' : 'none')),
            auditorName: audit.auditorName,
            auditorId: audit.auditorId,
            auditeeName: audit.auditeeName,
            auditeeId: audit.auditeeId,
            coAuditorIds: audit.coAuditorIds,
            coAuditorNames: coAuditorNamesList,
            coAuditorIdList: coAuditorIdList,
            description: audit.auditObjective,
            fromDate: audit.fromDate,
            toDate: audit.toDate,
            startTime: audit.startTime,
            endTime: audit.endTime,
            isDateRange: true,
            isOriginal: true,
            isFullyCompleted: isFullyCompleted,
            isSubmitted: isSubmitted,
            auditCompletionStatus: completionInfo?.status,
            originalScheduledDate: history.originalScheduledDate,
            originalStartTime: history.originalStartTime,
            rescheduleHistory: history.rescheduleHistory,
            extensionHistory: history.extensionHistory,
            pendingReschedule: history.pendingReschedule,
            pendingExtension: history.pendingExtension
          })
          
          console.log('📅 Created date range event:', {
            auditId: audit.id,
            auditorId: audit.auditorId,
            auditorName: audit.auditorName,
            auditeeId: audit.auditeeId,
            auditeeName: audit.auditeeName
          });
          
          // Create display events for each day in range
          const currentDate = new Date(fromDate)
          while (currentDate <= toDate) {
            const singleDate = new Date(currentDate)
            const startDateTimeDisplay = new Date(singleDate)
            startDateTimeDisplay.setHours(startHours, startMinutes)
            const endDateTimeDisplay = new Date(singleDate)
            endDateTimeDisplay.setHours(endHours, endMinutes)
            
            formattedEvents.push({
              id: `${audit.id}_${currentDate.toISOString().split('T')[0]}`,
              title: audit.title || `${audit.department || 'Audit'} - ${audit.auditType || 'General'}`,
              start: startDateTimeDisplay,
              end: endDateTimeDisplay,
              status: displayStatus,
              auditType: audit.auditType,
              department: audit.department,
              isOwner: audit.auditorId === currentUser?.id,
              isCoAuditor: isCoAuditor,
              isAttendee: audit.auditeeId === currentUser?.id,
              userRelationship: audit.auditorId === currentUser?.id ? 'owner' : (isCoAuditor ? 'co_auditor' : (audit.auditeeId === currentUser?.id ? 'attendee' : 'none')),
              auditorName: audit.auditorName,
              auditorId: audit.auditorId,
              auditeeName: audit.auditeeName,
              auditeeId: audit.auditeeId,
              coAuditorIds: audit.coAuditorIds,
              coAuditorNames: coAuditorNamesList,
              coAuditorIdList: coAuditorIdList,
              description: audit.auditObjective,
              fromDate: fromDate,
              toDate: toDate,
              startTime: audit.startTime,
              endTime: audit.endTime,
              isDateRange: true,
              isDisplayEvent: true,
              parentId: audit.id,
              originalFromDate: fromDate,
              originalToDate: toDate,
              isFullyCompleted: isFullyCompleted,
              isSubmitted: isSubmitted,
              auditCompletionStatus: completionInfo?.status,
              originalScheduledDate: history.originalScheduledDate,
              originalStartTime: history.originalStartTime,
              rescheduleHistory: history.rescheduleHistory,
              extensionHistory: history.extensionHistory,
              pendingReschedule: history.pendingReschedule,
              pendingExtension: history.pendingExtension
            })
            
            currentDate.setDate(currentDate.getDate() + 1)
          }
        } else if (audit.scheduledDate) {
          const scheduledDate = new Date(audit.scheduledDate)
          const { hours: startHours, minutes: startMinutes } = parseTimeString(audit.startTime || '09:00 AM')
          const { hours: endHours, minutes: endMinutes } = parseTimeString(audit.endTime || '10:00 AM')
          
          const startDateTime = new Date(scheduledDate)
          startDateTime.setHours(startHours, startMinutes)
          const endDateTime = new Date(scheduledDate)
          endDateTime.setHours(endHours, endMinutes)
          
          formattedEvents.push({
            id: audit.id,
            title: audit.title || `${audit.department || 'Audit'} - ${audit.auditType || 'General'}`,
            start: startDateTime,
            end: endDateTime,
            status: displayStatus,
            auditType: audit.auditType,
            department: audit.department,
            isOwner: audit.auditorId === currentUser?.id,
            isCoAuditor: isCoAuditor,
            isAttendee: audit.auditeeId === currentUser?.id,
            userRelationship: audit.auditorId === currentUser?.id ? 'owner' : (isCoAuditor ? 'co_auditor' : (audit.auditeeId === currentUser?.id ? 'attendee' : 'none')),
            auditorName: audit.auditorName,
            auditorId: audit.auditorId,
            auditeeName: audit.auditeeName,
            auditeeId: audit.auditeeId,
            coAuditorIds: audit.coAuditorIds,
            coAuditorNames: coAuditorNamesList,
            coAuditorIdList: coAuditorIdList,
            description: audit.auditObjective,
            fromDate: null,
            toDate: null,
            startTime: audit.startTime,
            endTime: audit.endTime,
            isDateRange: false,
            isFullyCompleted: isFullyCompleted,
            isSubmitted: isSubmitted,
            auditCompletionStatus: completionInfo?.status,
            originalScheduledDate: history.originalScheduledDate,
            originalStartTime: history.originalStartTime,
            rescheduleHistory: history.rescheduleHistory,
            extensionHistory: history.extensionHistory,
            pendingReschedule: history.pendingReschedule,
            pendingExtension: history.pendingExtension
          })
          
          console.log('📅 Created regular event:', {
            auditId: audit.id,
            auditorId: audit.auditorId,
            auditorName: audit.auditorName,
            auditeeId: audit.auditeeId,
            auditeeName: audit.auditeeName
          });
        }
      }
      
      setEvents(formattedEvents)
      console.log('✅ Events loaded:', formattedEvents.filter(e => !e.isDisplayEvent && e.isOriginal !== false).length)
      
    } else {
      setError('Failed to load calendar data')
    }
  } catch (err) {
    console.error('Error loading events:', err);
    setError('Failed to connect to server');
  } finally {
    setIsLoading(false);
  }
}, [currentUser, userRole, leadAuditorDepartment]);
// Normalize department name for comparison (matching your dashboard logic)
const normalizeDepartmentForFilter = (dept) => {
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
    'IMS (BE)': 'MR',
    'IMS(BE)': 'MR',
    'IMS': 'MR',
    'MAINTENANCE': 'PLANT_MAINTENANCE',
    'MANAGEMENT': 'UNIT_HEAD',
    'PLANT MAINTENANCE': 'PLANT_MAINTENANCE',
    'TOOL MAINTENANCE': 'TOOL_MAINTENANCE',
    'TOOL MANAGEMENT': 'TOOL_MAINTENANCE',
    'STORES & DESPATCH': 'STORES_DESPATCH',
    'STORES': 'STORES_DESPATCH',
    'DESPATCH': 'STORES_DESPATCH',
    'UNIT HEAD': 'UNIT_HEAD',
    'MR': 'MR'
  };
  
  return deptMap[deptStr] || deptStr;
};

// Fetch lead auditor's department
const fetchLeadAuditorDepartment = useCallback(async () => {
  if (userRole !== 'LEAD_AUDITOR') return null;
  
  try {
    const response = await axios.get(`${API_BASE}/users/${currentUser?.id}`, { 
      withCredentials: true 
    });
    const userData = response.data;
    
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
    
    // Normalize department
    const normalizedDept = normalizeDepartmentForFilter(department);
    console.log('🎯 Lead Auditor Department:', department, '→ Normalized:', normalizedDept);
    setLeadAuditorDepartment(normalizedDept);
    setUserDepartment(department);
    return normalizedDept;
  } catch (error) {
    console.error('Error fetching lead auditor department:', error);
    // Fallback to user context
    if (currentUser?.department) {
      let dept = currentUser.department;
      if (typeof dept === 'object' && dept.displayName) {
        dept = dept.displayName;
      }
      const normalizedDept = normalizeDepartmentForFilter(dept);
      setLeadAuditorDepartment(normalizedDept);
      setUserDepartment(dept);
      return normalizedDept;
    }
    return null;
  }
}, [currentUser, userRole]);

// Fetch department for Lead Auditor
useEffect(() => {
  if (userRole === 'LEAD_AUDITOR') {
    fetchLeadAuditorDepartment();
  }
}, [userRole, fetchLeadAuditorDepartment]);
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadEvents()
    setIsRefreshing(false)
  }

  ///UPDATED
  const handleEventClick = (event) => {
  console.log('=== CLICKED EVENT DEBUG ===');
  console.log('Event ID:', event.id);
  console.log('Event coAuditorNames:', event.coAuditorNames);
  console.log('Event coAuditorIdList:', event.coAuditorIdList);
  console.log('Event isDisplayEvent:', event.isDisplayEvent);
  console.log('Event parentId:', event.parentId);
  
  if (event.isDisplayEvent && event.parentId) {
    const originalEvent = events.find(e => e.id === event.parentId && e.isOriginal === true)
    if (originalEvent) {
      console.log('Found original event with coAuditorNames:', originalEvent.coAuditorNames);
      setSelectedAudit(originalEvent)
    } else {
      // Try to find by id without isOriginal flag
      const anyEvent = events.find(e => e.id === event.parentId);
      if (anyEvent) {
        console.log('Found any event with coAuditorNames:', anyEvent.coAuditorNames);
        setSelectedAudit(anyEvent);
      } else {
        setSelectedAudit({
          ...event,
          fromDate: event.originalFromDate || event.fromDate,
          toDate: event.originalToDate || event.toDate
        })
      }
    }
  } else {
    setSelectedAudit(event)
  }
  setShowAuditPopup(true)
}


  const filteredEvents = events.filter(event => {
    if (!event) return false
    
    if (showListMode && event.isDisplayEvent === true) return false
    if (showListMode && event.isOriginal !== true && !event.isDisplayEvent) return true
    
    const matchesSearch = !searchQuery ||
      (event.auditType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.department || '').toLowerCase().includes(searchQuery.toLowerCase())

    if (eventFilter === 'owned') return matchesSearch && event.isOwner === true
    if (eventFilter === 'attending') return matchesSearch && event.isAttendee === true
    return matchesSearch
  })

  const handleDateClick = (date) => {
    setDate(date)
    setView('day')
  }

  const handleMonthClick = (date) => {
    setDate(date)
    setView('month')
  }

  const originalEvents = events.filter(e => e.isOriginal === true || (!e.isDisplayEvent && !e.isOriginal))
  
  const completedCount = originalEvents.filter(e => e.status === 'COMPLETED' || e.isFullyCompleted).length
  const submittedCount = originalEvents.filter(e => e.status === 'SUBMITTED' || e.isSubmitted).length
  const pendingCount = originalEvents.filter(e => e.status === 'PENDING_APPROVAL').length
  const overdueCount = originalEvents.filter(e => isEventOverdue(e)).length

  const availableViews = ['month', 'week', 'day', 'agenda', 'year']

  if (embedded) {
    return (
      <div className="w-full h-full bg-gray-50">
        <div className="h-full p-4">
          <Calendar
            localizer={localizer}
            events={events.filter(e => !e.isOriginal)}
            startAccessor="start"
            endAccessor="end"
            view={view}
            date={date}
            onNavigate={setDate}
            onView={setView}
            onSelectEvent={handleEventClick}
            style={{ height: 'calc(100% - 60px)', minHeight: '400px' }}
            eventPropGetter={eventStyleGetter}
            components={{
            event: ({ event }) => {
  if (!event) return null
  
  // For display events (date ranges), find the parent event
  let actualEvent = event;
  if (event.parentId) {
    const parentEvent = events.find(e => e.id === event.parentId);
    if (parentEvent) actualEvent = parentEvent;
  }
  
  const shortType = getAuditTypeShort(actualEvent.auditType)
  const dotColorRgb = getDotColor(actualEvent)  // Now returns RGB string
  const isOverdue = isEventOverdue(actualEvent)
  const isCompleted = isEventCompleted(actualEvent)
  const isSubmitted = isEventSubmitted(actualEvent)
  
  // Determine text color
  let textColor = '#374151';
  if (isOverdue) textColor = '#dc2626';
  else if (isCompleted) textColor = '#065f46';
  else if (isSubmitted) textColor = '#3b82f6';
  
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        width: '100%',
        height: '100%',
        padding: '2px 4px',
        cursor: 'pointer'
      }}
      title={`${actualEvent.auditType} - ${getStatusDisplay(actualEvent)}`}
    >
      {/* Dot with inline style for guaranteed visibility */}
      <div 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: dotColorRgb,
          flexShrink: 0
        }}
      />
      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: textColor,
        textDecoration: isOverdue ? 'line-through' : 'none'
      }}>
        {shortType}
      </span>
      {(isCompleted || isSubmitted) && (
        <span style={{ color: '#10b981', fontSize: '10px', flexShrink: 0 }}>✓</span>
      )}
    </div>
  )
},
              dateCellWrapper: (props) => <CustomDateCellWrapper {...props} events={events.filter(e => !e.isOriginal)} />
            }}
            messages={{
              noEventsInRange: 'No audits scheduled in this range',
              showMore: (total) => `+${total} more`
            }}
          />
        </div>
        
        {showAuditPopup && selectedAudit && (
          <AuditDetailsPopup audit={selectedAudit} onClose={() => setShowAuditPopup(false)} />
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-b-2 border-purple-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading your calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {showSidebar && (
        <div className="flex flex-col overflow-y-auto bg-white border-r border-gray-200 w-80">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Audit Calendar</h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowListMode(!showListMode)} 
                  className={`p-1.5 rounded-lg transition-colors ${showListMode ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}
                  title={showListMode ? 'Calendar View' : 'List View'}
                >
                  {showListMode ? <CalendarDays className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
                <button onClick={handleRefresh} disabled={isRefreshing} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500">{currentUser?.name || currentUser?.email}</p>
            

            {/* Inside the sidebar, after the user name display */}
            {userRole === 'LEAD_AUDITOR' && leadAuditorDepartment && (
              <div className="p-2 mt-2 border border-indigo-100 rounded-lg bg-indigo-50">
                <p className="text-xs font-medium text-indigo-600">Department Filter</p>
                <p className="text-sm font-semibold text-indigo-800">{userDepartment || leadAuditorDepartment}</p>
                <p className="text-xs text-indigo-500 mt-0.5">Showing only audits for this department</p>
              </div>
            )}


            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="p-2 text-center rounded-lg bg-blue-50">
                <p className="text-xs font-medium text-blue-600">Total</p>
                <p className="text-lg font-bold text-blue-700">
                  {originalEvents.filter(e => e.id).length}
                </p>
              </div>
              <div className="p-2 text-center rounded-lg bg-yellow-50">
                <p className="text-xs font-medium text-yellow-600">Schedule Pending</p>
                <p className="text-lg font-bold text-yellow-700">{pendingCount}</p>
              </div>
              <div className="p-2 text-center bg-blue-100 rounded-lg">
                <p className="text-xs font-medium text-blue-600">Submit</p>
                <p className="text-lg font-bold text-blue-700">{submittedCount}</p>
              </div>
              <div className="p-2 text-center rounded-lg bg-emerald-100">
                <p className="text-xs font-medium text-emerald-600">Complete</p>
                <p className="text-lg font-bold text-emerald-700">{completedCount}</p>
              </div>
              <div className="p-2 text-center rounded-lg bg-red-50">
                <p className="text-xs font-medium text-red-600">Overdue</p>
                <p className="text-lg font-bold text-red-700">{overdueCount}</p>
              </div>
            </div>
          </div>

          {/* View Selector */}
          {!showListMode && (
            <div className="p-3 border-b border-gray-200">
              <p className="mb-2 text-xs text-gray-500">View</p>
              <div className="flex flex-wrap gap-1">
                {availableViews.map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-sm capitalize rounded-md transition-colors ${view === v ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {v === 'agenda' ? 'List' : v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="p-3 border-b border-gray-200">
            <button onClick={() => setExpandedFilter(!expandedFilter)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filter</span>
              </div>
              {expandedFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedFilter && (
              <div className="mt-2 space-y-1">
                <button onClick={() => setEventFilter('all')} className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${eventFilter === 'all' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                  All Audits
                </button>
                <button onClick={() => setEventFilter('owned')} className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${eventFilter === 'owned' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                  <Crown className="inline w-3 h-3 mr-1 text-blue-600" /> As Auditor
                </button>
                <button onClick={() => setEventFilter('attending')} className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${eventFilter === 'attending' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                  <UserCheck className="inline w-3 h-3 mr-1 text-green-600" /> As Auditee
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Search audits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pr-3 text-sm border border-gray-200 rounded-lg pl-9 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 border-b border-gray-200">
              <div className="p-2 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="p-3">
            <button onClick={() => setExpandedLegend(!expandedLegend)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {expandedLegend ? <Eye className="w-4 h-4 text-gray-500" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                <span className="text-sm font-medium">Legend</span>
              </div>
              {expandedLegend ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedLegend && (
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Schedule Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>Pending Schedule Approval</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Audit Submitted (Awaiting Approval)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  <span>✓ Audit Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Rejected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Date Range</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Changes Requested</span>
                </div>
                <div className="pt-2 mt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3 h-3 text-blue-600" />
                    <span>You are the Auditor</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <UserCheck className="w-3 h-3 text-green-600" />
                    <span>You are the Auditee</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Audit Fully Completed</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 transition-colors rounded-lg hover:bg-gray-100 lg:hidden">
              {showSidebar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!showListMode && (
              <>
                <button onClick={() => setDate(new Date())} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Today
                </button>
                <button
                  onClick={() => {
                    const d = new Date(date)
                    if (view === 'year') d.setFullYear(d.getFullYear() - 1)
                    else if (view === 'month') d.setMonth(d.getMonth() - 1)
                    else if (view === 'week') d.setDate(d.getDate() - 7)
                    else d.setDate(d.getDate() - 1)
                    setDate(d)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ◀
                </button>
                <span className="text-sm font-medium min-w-[160px] text-center">
                  {view === 'year' && moment(date).format('YYYY')}
                  {view === 'month' && moment(date).format('MMMM YYYY')}
                  {view === 'week' && `Week of ${moment(date).startOf('week').format('MMM DD')}`}
                  {view === 'day' && moment(date).format('dddd, MMMM DD')}
                  {view === 'agenda' && moment(date).format('MMMM YYYY')}
                </span>
                <button
                  onClick={() => {
                    const d = new Date(date)
                    if (view === 'year') d.setFullYear(d.getFullYear() + 1)
                    else if (view === 'month') d.setMonth(d.getMonth() + 1)
                    else if (view === 'week') d.setDate(d.getDate() + 7)
                    else d.setDate(d.getDate() + 1)
                    setDate(d)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ▶
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {showListMode ? (
            <EventListComponent 
              events={filteredEvents} 
              onEventClick={handleEventClick} 
            />
          ) : (
            <div className="h-full p-4">
              {view === 'year' ? (
                <YearView
                  date={date}
                  events={events.filter(e => !e.isOriginal)}
                  onEventClick={handleEventClick}
                  onDateClick={handleDateClick}
                  onMonthClick={handleMonthClick}
                />
              ) : (
                <Calendar
                  localizer={localizer}
                  events={events.filter(e => !e.isOriginal)}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  date={date}
                  onNavigate={setDate}
                  onView={setView}
                  onSelectEvent={handleEventClick}
                  style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}
                  eventPropGetter={eventStyleGetter}
                  components={{
                event: ({ event }) => {
  if (!event) return null
  
  // For display events (date ranges), find the parent event
  let actualEvent = event;
  if (event.parentId) {
    const parentEvent = events.find(e => e.id === event.parentId);
    if (parentEvent) actualEvent = parentEvent;
  }
  
  const shortType = getAuditTypeShort(actualEvent.auditType)
  const dotColorRgb = getDotColor(actualEvent)  // Now returns RGB string
  const isOverdue = isEventOverdue(actualEvent)
  const isCompleted = isEventCompleted(actualEvent)
  const isSubmitted = isEventSubmitted(actualEvent)
  
  // Determine text color
  let textColor = '#374151';
  if (isOverdue) textColor = '#dc2626';
  else if (isCompleted) textColor = '#065f46';
  else if (isSubmitted) textColor = '#3b82f6';
  
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        width: '100%',
        height: '100%',
        padding: '2px 4px',
        cursor: 'pointer'
      }}
      title={`${actualEvent.auditType} - ${getStatusDisplay(actualEvent)}`}
    >
      {/* Dot with inline style for guaranteed visibility */}
      <div 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: dotColorRgb,
          flexShrink: 0
        }}
      />
      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: textColor,
        textDecoration: isOverdue ? 'line-through' : 'none'
      }}>
        {shortType}
      </span>
      {/* {(isCompleted || isSubmitted) && (
        <span style={{ color: '#10b981', fontSize: '10px', flexShrink: 0 }}>✓</span>
      )} */}
    </div>
  )
},
                    dateCellWrapper: (props) => <CustomDateCellWrapper {...props} events={events.filter(e => !e.isOriginal)} />
                  }}
                  messages={{
                    noEventsInRange: 'No audits scheduled in this range',
                    showMore: (total) => `+${total} more`
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audit Details Popup */}
      {showAuditPopup && selectedAudit && (
        <AuditDetailsPopup audit={selectedAudit} onClose={() => setShowAuditPopup(false)} />
      )}
    </div>
  )
}