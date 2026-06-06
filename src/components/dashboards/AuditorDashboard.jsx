// src/components/dashboards/AuditorDashboard.jsx - COMPLETE UPDATED CODE

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ToastContext';
import { ncrAPI } from '../services/api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  FileText, Clock, CheckCircle, AlertCircle, 
  Eye, Edit, Search, Calendar, ArrowRight, 
  Building, UserCheck, Users, Play, XCircle, RefreshCw,
  Calendar as CalendarIcon, AlertTriangle, Coffee, Sunrise, Sunset,
  Send, MessageSquare, Grid3x3, List, X,
  Sparkles, ThumbsUp, TrendingUp, Star, Award, Layers,
  ChevronDown, ChevronUp, FileCheck, Plus, MessageCircle
} from 'lucide-react';
import axios from 'axios';
// Add this import with your existing imports (around line 20)
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';

const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

const TIME_OPTIONS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
];

// ─────────────────────────────────────────────────────────────
// Stat Card - Glass Morphism
// ─────────────────────────────────────────────────────────────
const StatCard = ({ title, value, color, icon, delay }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number') { setCount(value); return; }
    let start = 0;
    const step = (value / 1000) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  const colorMap = {
    blue: 'rgba(59, 130, 246, 0.1)',
    green: 'rgba(16, 185, 129, 0.1)',
    amber: 'rgba(245, 158, 11, 0.1)',
    red: 'rgba(239, 68, 68, 0.1)',
    purple: 'rgba(139, 92, 246, 0.1)',
    emerald: 'rgba(16, 185, 129, 0.1)',
    orange: 'rgba(249, 115, 22, 0.1)',
    gray: 'rgba(107, 114, 128, 0.1)',
    indigo: 'rgba(99, 102, 241, 0.1)'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden transition-all duration-300 border shadow-lg backdrop-blur-xl bg-white/80 rounded-2xl hover:shadow-xl border-white/30"
      style={{ backgroundColor: colorMap[color] || 'rgba(59, 130, 246, 0.1)' }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="mt-0.5 text-xs font-medium text-gray-500">{title}</div>
          </div>
          <div className="flex items-center justify-center w-8 h-8 shadow-sm rounded-xl backdrop-blur-sm bg-white/50">
            {icon}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1 opacity-50 bg-gradient-to-r" style={{ background: `linear-gradient(to right, ${color}, ${color}80)` }} />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// NCR Status Badge - Glass Morphism
// ─────────────────────────────────────────────────────────────
const NcrStatusBadge = ({ status }) => {
  const config = {
    AWAITING_AUDITEE: { label: 'Awaiting Auditee', icon: '⏳', className: 'bg-amber-100/80 text-amber-700 border-amber-200/50' },
    OPEN:             { label: 'Pending Approval',  icon: '📋', className: 'bg-blue-100/80 text-blue-700 border-blue-200/50' },
    APPROVED:         { label: 'Approved',           icon: '✓', className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50' },
    IN_PROGRESS:      { label: 'In Progress',        icon: '🔄', className: 'bg-purple-100/80 text-purple-700 border-purple-200/50' },
    REJECTED:         { label: 'Rejected',           icon: '✗', className: 'bg-red-100/80 text-red-700 border-red-200/50' },
    CLOSED:           { label: 'Closed',             icon: '✔', className: 'bg-gray-100/80 text-gray-700 border-gray-200/50' },
  };
  const { label, icon, className } = config[status] || { label: status, icon: '📌', className: 'bg-gray-100/80 text-gray-700 border-gray-200/50' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border backdrop-blur-sm ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const getFormRoute = (audit) => {
  const t = (audit.auditType || '').toLowerCase().trim();
  if (t.includes('iatf') || t.includes('system audit') || t.includes('internal audit') || t.includes('16949')) return '/audit/iatf_internal';
  if (t.includes('process') || t.includes('manufacturing')) return '/audit/manufacturing_process';
  if (t.includes('5s') || t.includes('five_s')) return '/audit/five_s';
  if (t.includes('product')) return '/audit/product';
  if (t.includes('iso')) return '/audit/iso';
  if (t.includes('safety') || t.includes('safe')) return '/audit/safety';
  if (t.includes('poka') || t.includes('yoke')) return '/audit/pokayoke';
  return '/audit/iatf_internal';
};

const getViewRoute = (audit) => {
  const auditType = (audit.auditType || '').toLowerCase().trim();
  
  if (auditType.includes('5s') || auditType.includes('five_s')) return `/fives-view`;  // ← REMOVED '/audit/'
  if (auditType.includes('process') || auditType.includes('manufacturing')) return `/manufacturing-view`;  // ← REMOVED '/audit/'
  if (auditType.includes('iatf') || auditType.includes('system')) return `/iatf-view`;  // ← REMOVED '/audit/'
  if (auditType.includes('product')) return `/product-view`;  // ← REMOVED '/audit/'
  if (auditType.includes('iso')) return `/iso-view`;  // ← REMOVED '/audit/'
  if (auditType.includes('safety') || auditType.includes('safe')) return `/safety-view`;  // ← REMOVED '/audit/'
  if (auditType.includes('poka') || auditType.includes('yoke')) return `/pokayoke-view`;  // ← REMOVED '/audit/'
  
  return `/fives-view`;  // ← REMOVED '/audit/'
};

const isAuditExpired = (audit) => {
  if (!audit || audit.status === 'COMPLETED') return false;
  
  // Check if it's a date range audit
  const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
  
  if (isDateRange) {
    // For date range audits, check if the entire range has passed
    const toDate = new Date(audit.toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    
    // If end date is in the past
    if (toDate < today) {
      return true;
    }
    
    // If today is the last day, check if end time has passed
    if (toDate.toDateString() === today.toDateString() && audit.endTime) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Parse end time
      const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return { hours: 23, minutes: 59 };
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const meridian = match[3].toUpperCase();
        
        if (meridian === 'PM' && hours !== 12) hours += 12;
        if (meridian === 'AM' && hours === 12) hours = 0;
        
        return { hours, minutes };
      };
      
      const endTime = parseTime(audit.endTime);
      const currentTimeMinutes = (currentHours * 60) + currentMinutes;
      const endTimeMinutes = (endTime.hours * 60) + endTime.minutes;
      
      // If current time is past end time on the due date
      if (currentTimeMinutes > endTimeMinutes) {
        return true;
      }
    }
    
    return false;
  }
  
  // For single date audits
  if (!audit?.scheduledDate) return false;
  
  const scheduleDate = new Date(audit.scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduleDate.setHours(0, 0, 0, 0);
  
  // If date is in the past
  if (scheduleDate < today) {
    return true;
  }
  
  // If today, check if end time has passed
  if (scheduleDate.getTime() === today.getTime() && audit.endTime) {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const parseTime = (timeStr) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return { hours: 23, minutes: 59 };
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const meridian = match[3].toUpperCase();
      
      if (meridian === 'PM' && hours !== 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      
      return { hours, minutes };
    };
    
    const endTime = parseTime(audit.endTime);
    const currentTimeMinutes = (currentHours * 60) + currentMinutes;
    const endTimeMinutes = (endTime.hours * 60) + endTime.minutes;
    
    if (currentTimeMinutes > endTimeMinutes) {
      return true;
    }
  }
  
  return false;
};

const parseResponseAnswers = (r) => {
  try { return typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {}); }
  catch { return {}; }
};

const getAuditReportNumber = (answers, response) =>
  answers.auditReportNumber || answers.auditNumber || answers.documentNumber || `AUDIT-${response.id}`;

const getNcrFindingEntries = (answers) => {
  const responses = answers.responses || {};
  const observations = answers.observations || {};
  const questionData = answers.questionsData || [];
  const questionMap = new Map(questionData.map((q) => [String(q.slNo), q]));
  return Object.entries(responses)
    .filter(([, v]) => v === 'MINOR_NC' || v === 'MAJOR_NC')
    .map(([qId, v]) => {
      const q = questionMap.get(String(qId));
      return {
        questionId: qId,
        severity: v === 'MAJOR_NC' ? 'Major NC' : 'Minor NC',
        clause: q?.clause ? `Clause ${q.clause}` : `Question ${qId}`,
        checkpoint: q?.checkpoint || `Question ${qId}`,
        observation: observations[qId] || 'Observation not entered',
      };
    });
};

const buildPendingNcrQuery = (item) => {
  const p = new URLSearchParams();
  p.append('auditId', item.responseId);
  p.append('auditReportNumber', item.auditReportNumber);
  p.append('department', item.department || '');
  p.append('shift', item.shift || 'Day');
  if (item.auditeeId) p.append('auditeeId', item.auditeeId);
  if (item.auditeeName) p.append('auditeeName', item.auditeeName);
  p.append('clause', item.findings.map((f) => f.clause).join('\n'));
  p.append('evidence', item.findings.map((f) => `${f.questionId}: ${f.checkpoint}\nStatus: ${f.severity}\nEvidence: ${f.observation}`).join('\n\n'));
  p.append('statement', item.findings.map((f) => `${f.severity} identified for ${f.questionId}: ${f.checkpoint}`).join('\n'));
  return p.toString();
};

// ─────────────────────────────────────────────────────────────
// Audit Card Component - Shows "Awaiting Review" ONLY after request is submitted
// ─────────────────────────────────────────────────────────────
// Complete updated AuditCard component - FIXED for extension button to change after submission

const AuditCard = ({ 
  audit, timeStatus, canStart, 
  onRequestReschedule, onRequestExtension, 
  onViewForm, onViewReport, 
  hasFormData, totalForms, completedForms, pendingForms, formDetails,
  isRescheduleRequested, isExtensionRequested , onOpenForum
}) => {
  const [expanded, setExpanded] = useState(false);
  const isExpired = isAuditExpired(audit); // Change this line - remove timeStatus === 'EXPIRED'
  const isMultiForm = totalForms > 1
  const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
  const allFormsCompleted = completedForms === totalForms && totalForms > 0;
  const hasPendingForms = pendingForms > 0;
  const progressPercent = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

  // Distinguish between overdue scenarios
  const hasStartedWork = hasFormData && completedForms > 0;
  const isOverdueNoWork = isExpired && !hasStartedWork;
  const isOverduePartialWork = isExpired && hasStartedWork && hasPendingForms;
    // CRITICAL: Check if request has been SUBMITTED
    const hasPendingReschedule = isRescheduleRequested === true;
    const hasPendingExtension = isExtensionRequested === true;
  
  // Determine button visibility
  // Show Reschedule button ONLY if: overdue with no work AND no pending reschedule request
  const showRescheduleButton = isOverdueNoWork && !hasPendingReschedule;
  // Show Extension button ONLY if: overdue with partial work AND no pending extension request
  const showExtensionButton = isOverduePartialWork && !hasPendingExtension;
  // Show pending status if any request is pending
  const showPendingStatus = hasPendingReschedule || hasPendingExtension;

 const getStatusBadge = () => {
  if (allFormsCompleted) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-emerald-100/80 text-emerald-700 border border-emerald-200/50"><CheckCircle size={12} /> All Completed</span>;
  
  // Show pending status FIRST (most important)
  if (hasPendingReschedule) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-yellow-100/80 text-yellow-700 border border-yellow-200/50"><Clock size={12} /> Reschedule Request Pending - Awaiting Review</span>;
  if (hasPendingExtension) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-yellow-100/80 text-yellow-700 border border-yellow-200/50"><Clock size={12} /> Extension Request Pending - Awaiting Review</span>;
  
  // Overdue states
  if (isOverduePartialWork) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-orange-100/80 text-orange-700 border border-orange-200/50"><AlertCircle size={12} /> In Progress (Overdue) - Action Needed</span>;
  if (isOverdueNoWork) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-red-100/80 text-red-700 border border-red-200/50"><AlertCircle size={12} /> Overdue - Action Required</span>;
  
  // Normal states
  if (hasFormData && hasPendingForms) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-purple-100/80 text-purple-700 border border-purple-200/50"><Edit size={12} /> In Progress</span>;
  if (audit.status === 'IN_PROGRESS') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-amber-100/80 text-amber-700 border border-amber-200/50"><Play size={12} /> In Progress</span>;
  if (timeStatus === 'UPCOMING') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-blue-100/80 text-blue-700 border border-blue-200/50"><Calendar size={12} /> Upcoming</span>;
  if (timeStatus === 'ACTIVE' && canStart) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-green-100/80 text-green-700 border border-green-200/50"><Play size={12} /> Ready to Start</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-gray-100/80 text-gray-700 border border-gray-200/50"><Calendar size={12} /> Scheduled</span>;
};

  const nextPendingForm = formDetails?.find(f => !f.completed);
  const completedForm = formDetails?.find(f => f.completed);

  const getCardBgColor = () => {
    if (allFormsCompleted) return 'bg-white/90';
    if (hasPendingReschedule || hasPendingExtension) return 'bg-yellow-50/90 border-yellow-200/50';
    if (isOverduePartialWork) return 'bg-orange-50/90 border-orange-200/50';
    if (isOverdueNoWork) return 'bg-red-50/90 border-red-200/50';
    return 'bg-white/90';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      whileHover={{ y: -2 }}
      className={`transition-all duration-300 border shadow-lg group backdrop-blur-xl rounded-2xl hover:shadow-xl border-white/30 ${getCardBgColor()}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            {getStatusBadge()}
            {isMultiForm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-blue-100/80 text-blue-700 border border-blue-200/50">
                {completedForms}/{totalForms}
              </span>
            )}
            {audit.auditNumber && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono backdrop-blur-sm bg-gray-100/80 text-gray-600 border border-gray-200/50">
                #{audit.auditNumber}
              </span>
            )}
          </div>
         <div className="flex flex-col items-end gap-1">
            {audit.originalScheduledDate && (
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 rounded-lg bg-gray-100 line-through">
                <CalendarIcon size={9} />
                <span>Was: {audit.originalScheduledDate}</span>
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg backdrop-blur-sm ${
  audit.originalScheduledDate
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    : isExpired ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-500 bg-white/50'
}`}>
  <CalendarIcon size={10} />
  {isDateRange ? `${audit.fromDate} → ${audit.toDate}` : audit.scheduledDate}
  {audit.originalScheduledDate && (
    <span className="ml-1 font-medium">(Rescheduled)</span>
  )}
  {isExpired && !audit.originalScheduledDate && (
    <span className="ml-1 font-medium text-red-600">(Overdue)</span>
  )}
</div>
          </div>
        </div>
        
        <h3 className="mb-1 text-base font-semibold text-gray-800 transition-colors group-hover:text-blue-600">
          {audit.auditType || 'Audit'} - {audit.department || 'General'}
        </h3>
        
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-2 py-1 rounded-lg">
            <Clock size={10} className="text-gray-400" />
            <span>{audit.startTime} - {audit.endTime}</span>
          </div>
          <div className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-2 py-1 rounded-lg">
            <UserCheck size={10} className="text-gray-400" />
            <span>{audit.auditeeName || 'TBD'}</span>
          </div>
          {audit.coAuditorNames && audit.coAuditorNames.length > 0 && (
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg">
              <Users size={10} className="text-purple-500" />
              <span className="font-medium text-purple-700">
                Co-auditors: {audit.coAuditorNames.join(', ')}
              </span>
            </div>
          )}
        </div>
        
        {/* Warning Messages - Only show if NO request submitted yet */}
        {isOverdueNoWork && !hasPendingReschedule && (
  <div className="flex items-center gap-2 p-2 mb-3 text-xs text-red-700 border backdrop-blur-sm bg-red-50/80 rounded-xl border-red-200/50">
    <AlertCircle size={14} />
    <span className="flex-1">
      {isDateRange 
        ? `This date range audit (${audit.fromDate} to ${audit.toDate}) has expired without any work started. Please reschedule to begin.`
        : "This audit hasn't started and is overdue! Please reschedule to begin."}
    </span>
  </div>
)}

{isOverduePartialWork && !hasPendingExtension && (
  <div className="flex items-center gap-2 p-2 mb-3 text-xs text-orange-700 border backdrop-blur-sm bg-orange-50/80 rounded-xl border-orange-200/50">
    <AlertCircle size={14} />
    <span className="flex-1">
      {isDateRange
        ? `This date range audit expired on ${audit.toDate}. You've completed ${completedForms} of ${totalForms} forms. Please request an extension to complete the remaining forms.`
        : `You've completed ${completedForms} of ${totalForms} forms. Please request an extension to complete the remaining forms.`}
    </span>
  </div>
)}
        
        {/* Pending Request Message */}
        {hasPendingExtension && (
          <div className="flex items-center gap-2 p-2 mb-3 text-xs text-yellow-700 border backdrop-blur-sm bg-yellow-50/80 rounded-xl border-yellow-200/50">
            <Clock size={14} className="animate-pulse" />
            <span className="flex-1">Your extension request has been submitted and is awaiting review by the coordinator. You will be notified once approved.</span>
          </div>
        )}
        
        {hasPendingReschedule && (
          <div className="flex items-center gap-2 p-2 mb-3 text-xs text-yellow-700 border backdrop-blur-sm bg-yellow-50/80 rounded-xl border-yellow-200/50">
            <Clock size={14} className="animate-pulse" />
            <span className="flex-1">Your reschedule request has been submitted and is awaiting review by the coordinator.</span>
          </div>
        )}
        
        {/* Progress Bar */}
        {isMultiForm && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-gray-500">Progress</span>
              <span className="text-[10px] font-semibold text-blue-600">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  hasPendingReschedule || hasPendingExtension ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  isOverduePartialWork ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 
                  isOverdueNoWork ? 'bg-gradient-to-r from-red-400 to-red-600' : 
                  'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Individual Forms */}
        {isMultiForm && formDetails?.length > 0 && (
          <div className="mb-3">
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-gray-600 transition-all backdrop-blur-sm bg-gray-100/50 rounded-xl hover:bg-gray-100/80"
            >
              <span>Forms ({completedForms}/{totalForms})</span>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {formDetails.map((form, idx) => {
                  const isFormOverdue = isExpired && !form.completed;
                  return (
                    <div key={idx} className={`flex items-center justify-between p-2 text-xs border backdrop-blur-sm rounded-xl ${
                      hasPendingReschedule || hasPendingExtension ? 'bg-yellow-50/50 border-yellow-200/50' :
                      isFormOverdue && isOverduePartialWork ? 'bg-orange-50/50 border-orange-200/50' :
                      isFormOverdue && isOverdueNoWork ? 'bg-red-50/50 border-red-200/50' :
                      'bg-gray-50/50 border-gray-100/50'
                    }`}>
                      <div className="flex items-center min-w-0 gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          form.completed ? 'bg-emerald-500' : 
                          (hasPendingReschedule || hasPendingExtension) ? 'bg-yellow-500' :
                          (isFormOverdue && isOverduePartialWork) ? 'bg-orange-500' :
                          (isFormOverdue && isOverdueNoWork) ? 'bg-red-500' : 
                          'bg-amber-500'
                        }`} />
                        <span className="text-gray-700 truncate">{form.processName || form.name}</span>
                        {hasPendingExtension && !form.completed && <span className="text-[10px] text-yellow-600 ml-1">(Extension Pending)</span>}
                        {!hasPendingExtension && !hasPendingReschedule && isFormOverdue && isOverduePartialWork && !form.completed && (
                          <span className="text-[10px] text-orange-600 ml-1">(Extension Needed)</span>
                        )}
                      </div>
                       {form.completed ? (
  <button onClick={() => onViewReport(form.responseId, audit, form)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-700 backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80 transition-all">
    <Eye size={10} /> View
  </button>
) : (
  <div className="flex gap-1">
    {/* CHECK FOR BOTH RESCHEDULE AND EXTENSION PENDING */}
    {(hasPendingReschedule || hasPendingExtension) ? (
      <button 
        disabled
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 backdrop-blur-sm bg-gray-100/80 rounded-xl cursor-not-allowed"
      >
        <Clock size={10} /> {hasPendingReschedule ? 'Reschedule Pending' : 'Extension Pending'}
      </button>
    ) : isOverduePartialWork ? (
      <button 
        onClick={() => onRequestExtension(audit, form)} 
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-orange-700 backdrop-blur-sm bg-orange-100/80 rounded-xl hover:bg-orange-200/80 transition-all"
      >
        <Clock size={10} /> Request Extension
      </button>
    ) : (
      <button 
        onClick={() => onViewForm(audit, form)} 
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-700 backdrop-blur-sm bg-emerald-100/80 rounded-xl hover:bg-emerald-200/80 transition-all"
      >
        <Edit size={10} /> Fill
      </button>
    )}
  </div>
)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100/50">
  
  {/* RESCHEDULE BUTTON - Only show if NO pending request */}
  {showRescheduleButton && !hasPendingReschedule && !hasPendingExtension && (
    <button 
      onClick={() => onRequestReschedule(audit)} 
      className="px-4 py-1.5 text-sm font-medium text-white transition-all shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700"
    >
      <Calendar size={14} className="inline mr-1" /> Reschedule Audit
    </button>
  )}
  
  {/* EXTENSION BUTTON - Only show if NO pending request */}

  {/* ADD FORUM BUTTON - Always visible for all audits */}

  <button 
    onClick={() => onOpenForum(audit, null)}
    className="px-3 py-1.5 text-xs font-medium text-purple-700 backdrop-blur-sm bg-purple-100/80 rounded-xl hover:bg-purple-200/80 transition-all flex items-center gap-1"
    title="Open Discussion Forum"
  >
    <MessageCircle size={12} />
    Forum
  </button>
  {showExtensionButton && !hasPendingReschedule && !hasPendingExtension && (
    <button 
      onClick={() => onRequestExtension(audit)} 
      className="px-4 py-1.5 text-sm font-medium text-white transition-all shadow-sm bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl hover:from-purple-600 hover:to-purple-700"
    >
      <Clock size={14} className="inline mr-1" /> Request Extension
    </button>
  )}
  
  {/* PENDING STATUS - Show this instead of action buttons */}
  {(hasPendingReschedule || hasPendingExtension) && (
    <div className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-yellow-700 backdrop-blur-sm bg-yellow-100/80 rounded-xl">
      <Clock size={14} className="animate-pulse" />
      {hasPendingReschedule ? 'Reschedule Request Pending - Awaiting Review' : 'Extension Request Pending - Awaiting Review'}
    </div>
  )}
  
  {/* FILL NEXT FORM BUTTON - Only show if NO pending requests */}
  {!hasPendingReschedule && !hasPendingExtension && !isExpired && !allFormsCompleted && hasPendingForms && nextPendingForm && (
    <button 
      onClick={() => onViewForm(audit, nextPendingForm)} 
      className="px-3 py-1.5 text-xs font-medium text-blue-700 backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80 transition-all"
      disabled={timeStatus !== 'ACTIVE' && !canStart}
    >
      Fill Next Form ({pendingForms} remaining)
    </button>
  )}
  
  {/* COMPLETED AUDIT BUTTON */}
  {allFormsCompleted && completedForm && (
    <button 
      onClick={() => onViewReport(completedForm.responseId, audit, completedForm)} 
      className="px-3 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur-sm bg-emerald-100/80 rounded-xl hover:bg-emerald-200/80 transition-all"
    >
      <Eye size={12} className="inline mr-1" /> View Complete Report
    </button>
  )}
  
  {/* CONTINUE BUTTON for single form audits */}
  {!hasPendingReschedule && !hasPendingExtension && !isMultiForm && hasFormData && !allFormsCompleted && !isExpired && (
    <button 
      onClick={() => onViewForm(audit, formDetails?.[0])} 
      className="px-3 py-1.5 text-xs font-medium text-blue-700 backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80 transition-all"
    >
      Continue Audit
    </button>
  )}
  
  {/* START BUTTON for new audits */}
  {!hasPendingReschedule && !hasPendingExtension && !hasFormData && !isExpired && (
    <button 
      onClick={() => { const first = formDetails?.[0]; if (first) onViewForm(audit, first); }} 
      className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-sm" 
      disabled={timeStatus !== 'ACTIVE' && !canStart}
    >
      Start Audit
    </button>
  )}
  

</div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// NCR Pending List Component
// ─────────────────────────────────────────────────────────────
const NcrPendingList = ({ pendingNcrAudits, onRaise }) => {
  if (pendingNcrAudits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border shadow-lg backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
        <div className="flex items-center justify-center w-16 h-16 mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-emerald-400 to-emerald-600">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg font-medium text-gray-700">No Pending NCRs</p>
        <p className="mt-1 text-sm text-gray-400">All audits are clear — no nonconformities to raise.</p>
      </div>
    );
  }

  return (
    <motion.div
      key="ncr-pending"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border shadow-lg backdrop-blur-xl bg-white/90 rounded-2xl border-white/30"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/20 bg-gradient-to-r from-red-50/50 to-orange-50/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm font-semibold text-gray-800">Audits with NCR Findings</p>
        </div>
        <span className="px-2 py-0.5 text-xs font-semibold text-red-700 backdrop-blur-sm bg-red-100/80 rounded-xl">
          {pendingNcrAudits.length} pending
        </span>
      </div>
      <div className="divide-y divide-gray-100/50">
        {pendingNcrAudits.map((item) => (
          <div key={item.responseId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-white/30">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-semibold text-gray-900">{item.auditReportNumber}</p>
              <p className="mt-0.5 text-xs text-gray-500 truncate">{item.formName} · {item.department}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {item.findings.slice(0, 3).map((f, i) => (
                  <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-xl backdrop-blur-sm ${
                    f.severity === 'Major NC' ? 'bg-red-100/80 text-red-700 border border-red-200/50' : 'bg-amber-100/80 text-amber-700 border border-amber-200/50'
                  }`}>
                    {f.severity} · {f.clause}
                  </span>
                ))}
                {item.findings.length > 3 && (
                  <span className="px-2 py-0.5 text-[10px] text-gray-600 backdrop-blur-sm bg-gray-100/80 rounded-xl">+{item.findings.length - 3} more</span>
                )}
              </div>
            </div>
            <button 
              onClick={() => onRaise(item)} 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all shadow-sm bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700"
            >
              <AlertCircle className="w-4 h-4" /> Raise NCR
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// NCR List Tab Component
// ─────────────────────────────────────────────────────────────
const NcrListTab = ({ raisedNCRs, ncrLoading, navigate, onOpenForum }) => {  if (ncrLoading) {
    return (
      <div className="flex items-center justify-center py-16 border backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
        <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading NCRs...</span>
      </div>
    );
  }

  return (
    <motion.div
      key="ncr-list-tab"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border shadow-lg backdrop-blur-xl bg-white/90 rounded-2xl border-white/30"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/20 bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
        <div>
          <p className="text-sm font-semibold text-gray-800">Your Raised NCRs</p>
          <p className="text-xs text-gray-500 mt-0.5">All nonconformity reports you have created</p>
        </div>
        <div className="flex items-center gap-2">
          {raisedNCRs.length > 0 && (
            <span className="px-2 py-1 text-xs text-gray-600 rounded-lg backdrop-blur-sm bg-white/50">{raisedNCRs.length} total</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-5 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b bg-gray-50/50 backdrop-blur-sm border-white/20">
        <div className="col-span-4 md:col-span-3">NCR Number</div>
        <div className="col-span-4 md:col-span-3">Due Date</div>
        <div className="col-span-3 md:col-span-4">Status</div>
        <div className="col-span-1 text-right md:col-span-2">Action</div>
      </div>

      <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100/50">
        {raisedNCRs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl backdrop-blur-sm bg-gray-100/80">
              <AlertCircle className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No NCRs raised yet</p>
            <p className="max-w-xs mt-1 text-xs text-gray-400">Start by raising an NCR during your next audit.</p>
            <Link
              to="/form7"
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-white transition-all shadow-sm bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700"
            >
              <Plus size={14} /> Raise First NCR
            </Link>
          </div>
        ) : (
          raisedNCRs.map((ncr) => (
            <div key={ncr.id} className="grid items-center grid-cols-12 gap-4 px-5 py-3 transition-colors hover:bg-white/30">
              <div className="col-span-4 md:col-span-3">
                <p className="font-mono text-sm font-medium text-gray-900 truncate" title={ncr.ncrNumber || `NCR #${ncr.id}`}>
                  {ncr.ncrNumber || `NCR #${ncr.id}`}
                </p>
              </div>
              <div className="col-span-4 md:col-span-3">
                <p className="text-sm text-gray-600">
                  {ncr.dueDate ? new Date(ncr.dueDate).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <div className="col-span-3 md:col-span-4">
                <NcrStatusBadge status={ncr.status} />
              </div>
              <div className="flex justify-end col-span-1 gap-1 md:col-span-2">
  <button
    onClick={() => onOpenForum(ncr)}
    className="p-2 text-blue-600 transition-all rounded-xl hover:text-purple-900 hover:bg-purple-100/50"
    title="Open Discussion Forum"
  >
    <MessageCircle size={18} />
  </button>
  <Link
    to={`/ncr-view/${ncr.id}`}
    className="p-2 text-blue-600 transition-all rounded-xl hover:text-blue-900 hover:bg-blue-100/50"
    title="View Details"
  >
    <Eye size={18} />
  </Link>
</div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────
export default function AuditorDashboard() {
  const location = useLocation(); // Add this import at top

  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('my-audits');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [rescheduleRequestedMap, setRescheduleRequestedMap] = useState({});
  const [extensionRequestedMap, setExtensionRequestedMap] = useState({});
  const [stats, setStats] = useState({ 
    upcoming: 0, active: 0, expired: 0, inProgress: 0, 
    completed: 0, partiallyCompleted: 0, overdueNoWork: 0, overduePartialWork: 0 
  });
  const [pendingNcrAudits, setPendingNcrAudits] = useState([]);
  const [raisedNCRs, setRaisedNCRs] = useState([]);
  const [ncrLoading, setNcrLoading] = useState(false);
  // Forum Modal State
const [showForumModal, setShowForumModal] = useState(false);
const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
const [selectedFormForForum, setSelectedFormForForum] = useState(null);
const [allUsersList, setAllUsersList] = useState([]);
// NCR Forum Modal State  
const [showNCRForumModal, setShowNCRForumModal] = useState(false);
const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);

  // NCR Stats
  const ncrStats = React.useMemo(() => ({
    total: raisedNCRs.length,
    awaiting: raisedNCRs.filter(n => n.status === 'AWAITING_AUDITEE').length,
    pending: raisedNCRs.filter(n => n.status === 'OPEN').length,
    inProgress: raisedNCRs.filter(n => n.status === 'IN_PROGRESS').length,
    closed: raisedNCRs.filter(n => n.status === 'CLOSED').length,
    rejected: raisedNCRs.filter(n => n.status === 'REJECTED').length,
  }), [raisedNCRs]);

const handleViewReport = (responseId, audit, form) => {
  if (!responseId) {
    addToast('Report not found', 'error');
    return;
  }
  
  const route = getViewRoute(audit, form);
  
  // Use window.location for Vercel deployment
  const fullPath = `${route}/${responseId}`;
  
  // Use navigate with replace: true to avoid history issues
  navigate(fullPath, {
    replace: true,
    state: {
      returnTo: '/auditor',
      tab: 'my-audits'
    }
  });
};

  const fetchRaisedNCRs = async () => {
    if (!user?.id) return;
    try {
      setNcrLoading(true);
      const data = await ncrAPI.getByAuditor(user.id);
      setRaisedNCRs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching raised NCRs:', error);
      addToast('Failed to load NCR list', 'error');
      setRaisedNCRs([]);
    } finally {
      setNcrLoading(false);
    }
  };

  const fetchAvailableFormsForDepartment = async (department) => {
    if (!department) return [];
    try {
      const res = await axios.get(`${API_BASE}/templates/iatf/by-department/${encodeURIComponent(department)}`, { withCredentials: true });
      return res.data || [];
    } catch { return []; }
  };

 const fetchSchedulesWithStatus = async () => {
  try {
    setLoading(true); setRefreshing(true);

    const [responsesRes, ncrRes, rescheduleRequestsRes, extensionRequestsRes] = await Promise.all([
      axios.get(`${API_BASE}/templates/responses/all`, { withCredentials: true }),
      axios.get(`${API_BASE}/ncr/all`, { withCredentials: true }),
      axios.get(`${API_BASE}/audit-schedule/reschedule-requests/auditor/${user?.id}`, { withCredentials: true }).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/audit-schedule/extension-requests/auditor/${user?.id}`, { withCredentials: true }).catch(() => ({ data: [] }))
    ]);

    // Track pending requests
    const pendingRescheduleIds = new Set();
    (rescheduleRequestsRes.data || []).forEach(req => {
      if (req.status === 'PENDING') {
        pendingRescheduleIds.add(req.scheduleId);
      }
    });
    
    const pendingExtensionIds = new Set();
    (extensionRequestsRes.data || []).forEach(req => {
      if (req.status === 'PENDING') {
        pendingExtensionIds.add(req.scheduleId);
      }
    });
    
    setRescheduleRequestedMap(Object.fromEntries([...pendingRescheduleIds].map(id => [id, true])));
    setExtensionRequestedMap(Object.fromEntries([...pendingExtensionIds].map(id => [id, true])));

    const allResponses = responsesRes.data || [];
    const existingNcrAuditIds = new Set((ncrRes.data || []).map(n => Number(n.auditId)).filter(Boolean));

    const pendingNcrItems = allResponses
      .filter(r => Number(r.auditorId) === Number(user?.id))
      .map(r => {
        const answers = parseResponseAnswers(r);
        return {
          responseId: r.id,
          auditReportNumber: getAuditReportNumber(answers, r),
          formName: answers.formName || r.checkSheet?.name || 'Audit Form',
          department: r.department || answers.department || 'Production',
          shift: r.shift || answers.shift || 'Day',
          auditeeId: r.auditeeId || answers.auditeeId,
          auditeeName: r.auditeeName || answers.auditeeName,
          findings: getNcrFindingEntries(answers),
        };
      })
      .filter(item => item.findings.length > 0 && !existingNcrAuditIds.has(Number(item.responseId)));

    setPendingNcrAudits(pendingNcrItems);

    const responseMapByScheduleAndSheet = {};
    allResponses.forEach(r => {
      if (r.auditScheduleId) responseMapByScheduleAndSheet[`${r.auditScheduleId}_${r.checkSheet?.id}`] = r;
    });

    const schedulesRes = await axios.get(`${API_BASE}/audit-schedule/auditor/${user?.id}/schedules-with-status`, { withCredentials: true });
    const schedulesData = schedulesRes.data || [];

    // ✅ CRITICAL FIX: Filter schedules that are NOT approved
    // Only show schedules that have been approved by Top Management
    const approvedSchedulesData = schedulesData.filter(item => {
      const schedule = item.schedule;
      if (!schedule) return false;
      
      // For week schedules (Form 5 basic - no scheduledDate)
      if (!schedule.scheduledDate) {
        return schedule.approvalStatus === 'APPROVED';
      }
      
      // For detailed schedules (Form 5 Detailed - has scheduledDate)
      if (schedule.scheduledDate) {
        return schedule.detailedApprovalStatus === 'APPROVED' || 
               schedule.approvalStatus === 'APPROVED';
      }
      
      return false;
    });

    console.log(`📋 Filtered schedules: ${approvedSchedulesData.length} approved out of ${schedulesData.length} total`);

    const enhancedData = await Promise.all(approvedSchedulesData.map(async (item) => {
      const scheduleId = item.schedule?.id;
      const department = item.schedule?.department;
      const auditType = item.schedule?.auditType || '';
      const isIATF = auditType.toLowerCase().includes('iatf') || auditType.toLowerCase().includes('16949');
      const is5S = auditType.toLowerCase().includes('5s') || auditType.toLowerCase().includes('five_s');
      
      let formDetails = [];

      if (isIATF && department) {
        const availableForms = await fetchAvailableFormsForDepartment(department);
        formDetails = availableForms.map(form => {
          const existing = responseMapByScheduleAndSheet[`${scheduleId}_${form.id}`];
          return { 
            id: form.id, 
            name: form.name, 
            processName: form.processName, 
            completed: !!existing, 
            responseId: existing?.id,
          };
        });
      } else if (is5S) {
        const existing = allResponses.find(r => r.auditScheduleId === scheduleId);
        formDetails = [{
          id: item.schedule?.checkSheet?.id || '5S',
          name: '5S Audit Checklist',
          processName: '5S Audit',
          completed: !!existing,
          responseId: existing?.id,
        }];
      } else {
        const existing = allResponses.find(r => r.auditScheduleId === scheduleId);
        formDetails = [{ 
          id: item.schedule?.checkSheet?.id || 1, 
          name: item.schedule?.auditType || 'Audit Form', 
          processName: item.schedule?.auditType, 
          completed: !!existing, 
          responseId: existing?.id,
        }];
      }

      const totalForms = formDetails.length;
      const completedForms = formDetails.filter(f => f.completed).length;

      return {
        ...item,
        schedule: {
          ...item.schedule,
          hasFormData: completedForms > 0,
          totalForms, completedForms,
          pendingForms: totalForms - completedForms,
          allFormsCompleted: totalForms > 0 && totalForms === completedForms,
          formDetails,
          rescheduleRequested: pendingRescheduleIds.has(scheduleId),
          extensionRequested: pendingExtensionIds.has(scheduleId),
          coAuditorNames: item.schedule.coAuditorNames || [],
          originalScheduledDate: item.schedule.originalScheduledDate || null,
        },
      };
    }));

    setSchedules(enhancedData);
    
    // Calculate stats
    const partiallyCompletedAudits = enhancedData.filter(s => s.schedule.hasFormData && !s.schedule.allFormsCompleted);
    const overdueNoWork = enhancedData.filter(s => {
      const isExpired = s.timeStatus === 'EXPIRED' || isAuditExpired(s.schedule);
      const hasStartedWork = s.schedule.hasFormData && s.schedule.completedForms > 0;
      return isExpired && !hasStartedWork;
    });
    const overduePartialWork = enhancedData.filter(s => {
      const isExpired = s.timeStatus === 'EXPIRED' || isAuditExpired(s.schedule);
      const hasStartedWork = s.schedule.hasFormData && s.schedule.completedForms > 0;
      const hasPending = s.schedule.pendingForms > 0;
      return isExpired && hasStartedWork && hasPending;
    });
    
    setStats({
      upcoming: enhancedData.filter(s => s.timeStatus === 'UPCOMING' && !s.schedule.hasFormData).length,
      active: enhancedData.filter(s => s.timeStatus === 'ACTIVE' && s.canStart && !s.schedule.hasFormData).length,
      inProgress: enhancedData.filter(s => s.schedule.hasFormData && !s.schedule.allFormsCompleted && s.timeStatus !== 'EXPIRED' && !isAuditExpired(s.schedule)).length,
      expired: enhancedData.filter(s => s.timeStatus === 'EXPIRED' && !s.schedule.hasFormData).length,
      partiallyCompleted: partiallyCompletedAudits.length,
      completed: enhancedData.filter(s => s.schedule.allFormsCompleted).length,
      overdueNoWork: overdueNoWork.length,
      overduePartialWork: overduePartialWork.length,
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    addToast('Failed to load schedules', 'error');
  } finally {
    setLoading(false); setRefreshing(false);
  }
};


   const fetchAllUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    console.log('✅ Fetched users for forum:', response.data?.length);
    setAllUsersList(response.data || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    // Try fallback endpoint
    try {
      const fallbackResponse = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      setAllUsersList(fallbackResponse.data || []);
    } catch (fallbackError) {
      setAllUsersList([]);
    }
  }
};

// Open forum for audit discussion
const openAuditForum = (audit, form = null) => {
  console.log('Opening forum for audit:', audit);
  const forumId = audit.id ? `AUDIT-${audit.id}` : 'demo';

  // Build co-auditor emails from allUsersList using coAuditorIdList
  const coAuditorEmails = [];
  if (audit.coAuditorIdList && audit.coAuditorIdList.length > 0) {
    audit.coAuditorIdList.forEach(coId => {
      const coUser = allUsersList.find(u => Number(u.id) === Number(coId));
      if (coUser?.email) {
        coAuditorEmails.push(coUser.email);
        console.log('✅ Co-auditor email found:', coUser.email, 'for ID:', coId);
      }
    });
  }

  setSelectedAuditForForum({
    id: forumId,
    auditNumber: audit.auditNumber,
    auditType: audit.auditType,
    department: audit.department,
    status: audit.status,
    auditorId: user?.id,
    auditorName: user?.name,
    auditeeId: audit.auditeeId,
    auditeeName: audit.auditeeName,
    checkSheetId: form?.id,
    checkSheetName: form?.name,
    scheduledDate: audit.scheduledDate,
    fromDate: audit.fromDate,
    toDate: audit.toDate,
    startTime: audit.startTime,
    endTime: audit.endTime,
    coAuditorEmails: coAuditorEmails,  // ← ADD THIS
  });
  setSelectedFormForForum(form);
  setShowForumModal(true);
};

// Open forum for NCR discussion
const openNCRForum = (ncr) => {
  const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
  
  setSelectedNCRForForum({
    id: ncr.id,
    ncrNumber: ncr.ncrNumber,
    department: ncr.department,
    severity: ncr.severity,
    status: ncr.status,
    auditorId: ncr.auditorId || user?.id,
    auditorName: ncr.auditorName || user?.name,
    auditeeId: ncr.auditeeId,
    auditeeName: ncr.auditeeName,
    // ✅ Only add EXTRA participants (Audit Manager), not duplicates
    memberEmails: [
      auditManager?.email    // Audit Manager (additional participant)
    ].filter(Boolean)
  });
  setShowNCRForumModal(true);
};

useEffect(() => {
  // Check for tab in state (from navigation back from views)
  if (location.state?.activeTab) {
    setActiveTab(location.state.activeTab);
    // Clear the state after using
    setTimeout(() => {
      window.history.replaceState({}, document.title);
    }, 100);
  }
}, [location.state]);


  useEffect(() => {
    if (user?.id) {
      fetchSchedulesWithStatus();
      fetchAllUsers(); // Add this line
      fetchRaisedNCRs();
      const interval = setInterval(fetchSchedulesWithStatus, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ncr-list') fetchRaisedNCRs();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSchedulesWithStatus();
    fetchRaisedNCRs();
    addToast('Dashboard refreshed', 'success');
  };

 

  const handleViewForm = (audit, form) => {
  // STEP 4.1: First check for pending reschedule request
  if (audit.rescheduleRequested) {
    addToast('This audit has a pending reschedule request. Please wait for approval before continuing.', 'warning');
    return;
  }
  
  // STEP 4.2: Then check for pending extension request
  if (audit.extensionRequested) {
    addToast('This audit has a pending extension request. Please wait for approval before continuing.', 'warning');
    return;
  }
  
  // STEP 4.3: Original checks for overdue audits
  const isExpired = isAuditExpired(audit);
  const hasStartedWork = audit.hasFormData && audit.completedForms > 0;
  
  if (isExpired && !hasStartedWork && !audit.rescheduleRequested) {
    addToast('This audit is overdue. Please reschedule before continuing.', 'error');
    return;
  }
  
  if (isExpired && hasStartedWork && !audit.extensionRequested) {
    addToast('This audit is overdue. Please request an extension to continue.', 'warning');
    return;
  }
  
  // STEP 4.4: Original navigation code
  const params = new URLSearchParams();
  params.append('scheduleId', audit.id);
  
  if (audit.department) params.append('department', audit.department);
  if (form?.processName) params.append('processName', form.processName);
  if (form?.id) params.append('formId', form.id);
  if (audit.auditeeId) params.append('auditeeId', audit.auditeeId);
  if (audit.auditeeName) params.append('auditeeName', audit.auditeeName);
  if (audit.location) params.append('location', audit.location);
  
  const url = `${getFormRoute(audit)}?${params.toString()}`;
  console.log('Navigating to:', url);
  navigate(url);
};
  
  const handleRequestReschedule = async (scheduleId, newDate, newStartTime, newEndTime, reason) => {
  try {
    // Validate that date is not today
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      addToast('Cannot reschedule to today or a past date', 'error');
      return;
    }
    
    // Ensure date is in YYYY-MM-DD format
    const formattedDate = newDate.split('T')[0]; // Remove time if present
    
    const payload = { 
      newDate: formattedDate,
      newStartTime, 
      newEndTime, 
      reason 
    };
    
    console.log('Sending payload:', payload);
    
    const response = await axios.post(
      `${API_BASE}/audit-schedule/schedule/${scheduleId}/request-reschedule?userId=${user?.id}`, 
      payload, 
      { withCredentials: true }
    );
    
    console.log('Response:', response.data);
    
    addToast('Reschedule request submitted!', 'success');
    setRescheduleRequestedMap(prev => ({ ...prev, [scheduleId]: true }));
    await fetchSchedulesWithStatus();
  } catch (error) {
    console.error('Reschedule request failed:', error);
    console.error('Error response:', error.response?.data);
    
    const errorMsg = error.response?.data?.message || 
                    error.response?.data?.error || 
                    error.message || 
                    'Failed to submit request';
    addToast(errorMsg, 'error'); 
    throw error;
  }
};

const handleRequestExtension = async (scheduleId, newDate, newStartTime, newEndTime, reason, form = null) => {
  try {
    const payload = { 
      newDate, 
      newStartTime, 
      newEndTime, 
      reason 
    };
    if (form) {
      payload.formId = form.id;
      payload.formName = form.name;
    }
    
    await axios.post(`${API_BASE}/audit-schedule/schedule/${scheduleId}/request-extension?userId=${user?.id}`, 
      payload, 
      { withCredentials: true }
    );
    
    addToast(`Extension request submitted${form ? ` for ${form.name}` : ''}!`, 'success');
    
    // IMPORTANT: Immediately update local state
    setExtensionRequestedMap(prev => ({ ...prev, [scheduleId]: true }));
    
    // Also immediately update the schedules state
    setSchedules(prevSchedules => 
      prevSchedules.map(item => 
        item.schedule?.id === scheduleId 
          ? { 
              ...item, 
              schedule: { 
                ...item.schedule, 
                extensionRequested: true 
              } 
            }
          : item
      )
    );
    
    // Refresh from server to ensure consistency (optional, can be removed for faster UI)
    // await fetchSchedulesWithStatus();
  } catch (error) {
    addToast(error.response?.data?.message || 'Failed to submit request', 'error'); 
    throw error;
  }
};


  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="p-8 text-center shadow-lg backdrop-blur-xl bg-white/50 rounded-2xl">
        <div className="w-10 h-10 mx-auto border-2 border-gray-200 rounded-full animate-spin border-t-blue-600"></div>
        <p className="mt-3 text-sm font-medium text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );

  const filteredAudits = schedules.filter(item =>
    !searchQuery ||
    item.schedule?.auditType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.schedule?.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 shadow-lg rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Auditor Dashboard</h1>
                <p className="text-xs text-gray-500">Welcome back, {user?.name || user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleRefresh} 
              disabled={refreshing} 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all border shadow-md backdrop-blur-xl bg-white/50 rounded-xl hover:bg-white/80 disabled:opacity-50 border-white/30"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> 
              Refresh
            </button>
          </div>

          {/* Conditional Stats Cards Based on Active Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'my-audits' && (
              <motion.div
                key="audit-stats"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <h2 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                  <div className="p-1 rounded-lg bg-blue-100/80">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  Audit Overview
                </h2>
                <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
                  <StatCard title="Upcoming" value={stats.upcoming} color="blue" icon={<Calendar size={18} className="text-blue-600" />} delay={0.05} />
                  <StatCard title="Active" value={stats.active} color="green" icon={<Play size={18} className="text-green-600" />} delay={0.1} />
                  <StatCard title="In Progress" value={stats.inProgress} color="amber" icon={<Edit size={18} className="text-amber-600" />} delay={0.15} />
                  <StatCard title="Overdue (No Work)" value={stats.overdueNoWork} color="red" icon={<XCircle size={18} className="text-red-600" />} delay={0.2} />
                  <StatCard title="Overdue (Partial)" value={stats.overduePartialWork} color="orange" icon={<AlertTriangle size={18} className="text-orange-600" />} delay={0.25} />
                  <StatCard title="Partial" value={stats.partiallyCompleted} color="purple" icon={<Layers size={18} className="text-purple-600" />} delay={0.3} />
                  <StatCard title="Completed" value={stats.completed} color="emerald" icon={<CheckCircle size={18} className="text-emerald-600" />} delay={0.35} />
                </div>
              </motion.div>
            )}

            {(activeTab === 'ncr-pending' || activeTab === 'ncr-list') && (
              <motion.div
                key="ncr-stats"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <h2 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                  <div className="p-1 rounded-lg bg-red-100/80">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  NCR Overview
                </h2>
                <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                  <StatCard title="Total NCRs" value={ncrStats.total} color="gray" icon={<FileText size={16} className="text-gray-600" />} delay={0.05} />
                  <StatCard title="Awaiting" value={ncrStats.awaiting} color="orange" icon={<Clock size={16} className="text-orange-600" />} delay={0.1} />
                  <StatCard title="Pending" value={ncrStats.pending} color="amber" icon={<AlertCircle size={16} className="text-amber-600" />} delay={0.15} />
                  <StatCard title="In Progress" value={ncrStats.inProgress} color="purple" icon={<Edit size={16} className="text-purple-600" />} delay={0.2} />
                  <StatCard title="Closed" value={ncrStats.closed} color="emerald" icon={<CheckCircle size={16} className="text-emerald-600" />} delay={0.25} />
                  <StatCard title="Rejected" value={ncrStats.rejected} color="red" icon={<XCircle size={16} className="text-red-600" />} delay={0.3} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 p-1 border shadow-md backdrop-blur-xl bg-white/50 rounded-2xl border-white/30">
                <button
                  onClick={() => setActiveTab('my-audits')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === 'my-audits' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg backdrop-blur-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  My Audits
                  <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === 'my-audits' ? 'bg-white/20 text-white' : 'bg-white/50 text-gray-600'
                  }`}>
                    {filteredAudits.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('ncr-pending')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === 'ncr-pending' 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg backdrop-blur-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  NCR Pending
                  {pendingNcrAudits.length > 0 && (
                    <span className="ml-1.5 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                      {pendingNcrAudits.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('ncr-list')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === 'ncr-list' 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg backdrop-blur-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  My NCRs
                  <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === 'ncr-list' ? 'bg-white/20 text-white' : 'bg-white/50 text-gray-600'
                  }`}>
                    {raisedNCRs.length}
                  </span>
                </button>
              </div>

              {activeTab === 'my-audits' && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search audits..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="w-48 py-1.5 pl-9 pr-3 text-sm border backdrop-blur-xl bg-white/50 border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-1 p-1 border backdrop-blur-xl bg-white/50 rounded-xl border-white/30">
                    <button 
                      onClick={() => setViewMode('grid')} 
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'grid' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="Grid View"
                    >
                      <Grid3x3 size={14} />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')} 
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'list' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="List View"
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'my-audits' && (
                filteredAudits.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 text-center border shadow-lg backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-blue-400 to-blue-600">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-medium text-gray-700">No audits found</p>
                    <p className="mt-1 text-sm text-gray-400">No audits are currently assigned to you</p>
                  </motion.div>
                ) : viewMode === 'grid' ? (
                  <motion.div key="grid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAudits.map((item, index) => (
                     <AuditCard
  key={item.schedule?.id || index}
  audit={item.schedule}
  timeStatus={item.timeStatus}
  canStart={item.canStart}
  hasFormData={item.schedule.hasFormData}
  totalForms={item.schedule.totalForms || 1}
  completedForms={item.schedule.completedForms || 0}
  pendingForms={item.schedule.pendingForms || 0}
  formDetails={item.schedule.formDetails || []}
  isRescheduleRequested={item.schedule.rescheduleRequested}
  isExtensionRequested={item.schedule.extensionRequested}
  onRequestReschedule={(audit) => { setSelectedAudit(audit); setSelectedForm(null); setShowRescheduleModal(true); }}
  onRequestExtension={(audit, form) => { setSelectedAudit(audit); setSelectedForm(form); setShowExtensionModal(true); }}
  onViewForm={handleViewForm}
  onViewReport={handleViewReport}
  onOpenForum={openAuditForum}  // ADD THIS LINE
/>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-3">
                    {filteredAudits.map((item, index) => {
                      const isExpired = item.timeStatus === 'EXPIRED' || isAuditExpired(item.schedule);
                      const hasStartedWork = item.schedule.hasFormData && item.schedule.completedForms > 0;
                      const hasPendingForms = item.schedule.hasFormData && !item.schedule.allFormsCompleted;
                      const isOverdueNoWork = isExpired && !hasStartedWork;
                      const isOverduePartialWork = isExpired && hasStartedWork && hasPendingForms;
                      const rescheduleRequested = item.schedule.rescheduleRequested;
                      const extensionRequested = item.schedule.extensionRequested;
                      
                      return (
                        <div key={item.schedule?.id || index} className={`p-4 border shadow-lg backdrop-blur-xl rounded-2xl border-white/30 ${
                          isOverdueNoWork && !rescheduleRequested ? 'bg-red-50/90 border-red-200/50' :
                          isOverduePartialWork && !extensionRequested ? 'bg-orange-50/90 border-orange-200/50' : 
                          'bg-white/90'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-xl backdrop-blur-sm ${
                                  item.schedule.allFormsCompleted ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50' : 
                                  rescheduleRequested ? 'bg-blue-100/80 text-blue-700 border border-blue-200/50' :
                                  extensionRequested ? 'bg-purple-100/80 text-purple-700 border border-purple-200/50' :
                                  isOverduePartialWork ? 'bg-orange-100/80 text-orange-700 border border-orange-200/50' :
                                  isOverdueNoWork ? 'bg-red-100/80 text-red-700 border border-red-200/50' :
                                  item.schedule.hasFormData ? 'bg-purple-100/80 text-purple-700 border border-purple-200/50' : 
                                  item.timeStatus === 'EXPIRED' ? 'bg-red-100/80 text-red-700 border border-red-200/50' : 
                                  'bg-gray-100/80 text-gray-700 border border-gray-200/50'
                                }`}>
                                  {item.schedule.allFormsCompleted ? '✓ Completed' : 
                                   rescheduleRequested ? '⏳ Reschedule Requested' :
                                   extensionRequested ? '⏳ Extension Requested' :
                                   isOverduePartialWork ? '⚠️ In Progress (Overdue) - Extension Needed' :
                                   isOverdueNoWork ? '⏰ Overdue - Reschedule Required' :
                                   item.schedule.hasFormData ? `${item.schedule.completedForms}/${item.schedule.totalForms} In Progress` : 
                                   item.timeStatus === 'EXPIRED' ? '⏰ Overdue' : '📋 Scheduled'}
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-gray-800">{item.schedule.auditType} - {item.schedule.department}</h3>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock size={10} /> {item.schedule.startTime} - {item.schedule.endTime}</span>
                                <span className="flex items-center gap-1"><UserCheck size={10} /> {item.schedule.auditeeName || 'TBD'}</span>
                              </div>
                              {isOverdueNoWork && !rescheduleRequested && (
                                <p className="flex items-center gap-1 mt-2 text-xs text-red-600">
                                  <AlertCircle size={12} /> This audit hasn't started and is overdue. Please reschedule to begin.
                                </p>
                              )}
                              {isOverduePartialWork && !extensionRequested && (
                                <p className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                                  <AlertCircle size={12} /> You've completed {item.schedule.completedForms} of {item.schedule.totalForms} forms. Please request an extension.
                                </p>
                              )}
                              {(rescheduleRequested || extensionRequested) && (
                                <p className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                                  <Clock size={12} /> {rescheduleRequested ? 'Reschedule' : 'Extension'} request pending approval.
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
          {/* Forum Button */}
          <button 
            onClick={() => openAuditForum(item.schedule, null)}
            className="px-3 py-1.5 text-xs font-medium text-purple-700 backdrop-blur-sm bg-purple-100/80 rounded-xl hover:bg-purple-200/80 transition-all flex items-center gap-1"
            title="Open Discussion Forum"
          >
            <MessageCircle size={12} />
            Forum
          </button>
                              {item.schedule.allFormsCompleted ? (
                                <button onClick={() => handleViewReport(item.schedule.formDetails?.[0]?.responseId, item.schedule, item.schedule.formDetails?.[0])} className="px-3 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur-sm bg-emerald-100/80 rounded-xl hover:bg-emerald-200/80 transition-all">
                                  View Report
                                </button>
                              ) : isOverdueNoWork && !rescheduleRequested ? (
                                <button onClick={() => { setSelectedAudit(item.schedule); setSelectedForm(null); setShowRescheduleModal(true); }} className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm">
                                  <Calendar size={12} className="inline mr-1" /> Reschedule
                                </button>
                              ) : isOverduePartialWork && !extensionRequested ? (
                                <button onClick={() => { setSelectedAudit(item.schedule); setSelectedForm(null); setShowExtensionModal(true); }} className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm">
                                  <Clock size={12} className="inline mr-1" /> Request Extension
                                </button>
                              ) : (rescheduleRequested || extensionRequested) ? (
                                <div className="px-3 py-1.5 text-xs font-medium text-blue-700 backdrop-blur-sm bg-blue-100/80 rounded-xl">
                                  <Clock size={12} className="inline mr-1 animate-pulse" /> Pending Approval
                                </div>
                              ) : item.schedule.hasFormData ? (
                                <button onClick={() => { const next = item.schedule.formDetails?.find(f => !f.completed); if (next) handleViewForm(item.schedule, next); }} className="px-3 py-1.5 text-xs font-medium text-blue-700 backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80 transition-all">Continue ({item.schedule.pendingForms})</button>
                              ) : (
                                <button onClick={() => { const first = item.schedule.formDetails?.[0]; if (first) handleViewForm(item.schedule, first); }} className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-sm" disabled={item.timeStatus !== 'ACTIVE' && !item.canStart}>Start</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )
              )}

              {activeTab === 'ncr-pending' && (
                <NcrPendingList
                  key="ncr-pending"
                  pendingNcrAudits={pendingNcrAudits}
                  onRaise={(item) => navigate(`/form7?${buildPendingNcrQuery(item)}`)}
                />
              )}

              {activeTab === 'ncr-list' && (
  <NcrListTab
    key="ncr-list"
    raisedNCRs={raisedNCRs}
    ncrLoading={ncrLoading}
    navigate={navigate}
    onOpenForum={openNCRForum}
  />
)}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RescheduleRequestModal
        audit={selectedAudit}
        isOpen={showRescheduleModal}
        onClose={() => { setShowRescheduleModal(false); setSelectedAudit(null); setSelectedForm(null); }}
        onSubmit={handleRequestReschedule}
      />
      <ExtensionRequestModal
        audit={selectedAudit}
        form={selectedForm}
        isOpen={showExtensionModal}
        onClose={() => { setShowExtensionModal(false); setSelectedAudit(null); setSelectedForm(null); }}
        onSubmit={handleRequestExtension}
      />

       {/* Forum Modal */}
{showForumModal && selectedAuditForForum && (
  <AuditCheckSheetNCRForumModal
    auditId={selectedAuditForForum.id}
    auditNumber={selectedAuditForForum.auditNumber}
    auditTitle={selectedAuditForForum.auditType}
    auditStatus={selectedAuditForForum.status}
    auditType={selectedAuditForForum.auditType}
    department={selectedAuditForForum.department}
    auditorId={selectedAuditForForum.auditorId}
    auditorName={selectedAuditForForum.auditorName}
    auditeeId={selectedAuditForForum.auditeeId}
    auditeeName={selectedAuditForForum.auditeeName}
    checkSheetId={selectedAuditForForum.checkSheetId}
    checkSheetName={selectedAuditForForum.checkSheetName}
    scheduledDate={selectedAuditForForum.scheduledDate}
    fromDate={selectedAuditForForum.fromDate}
    toDate={selectedAuditForForum.toDate}
    startTime={selectedAuditForForum.startTime}
    endTime={selectedAuditForForum.endTime}
    memberEmails={selectedAuditForForum.coAuditorEmails || []}
    isOpen={showForumModal}
    onClose={() => {
      setShowForumModal(false);
      setSelectedAuditForForum(null);
      setSelectedFormForForum(null);
    }}
    currentUser={user}
    allUsers={allUsersList}
  />
)}

{/* NCR Forum Modal */}
{showNCRForumModal && selectedNCRForForum && (
  <AuditCheckSheetNCRForumModal
    auditId={selectedNCRForForum.id}
    auditNumber={selectedNCRForForum.ncrNumber}
    auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
    auditStatus={selectedNCRForForum.status}
    auditType="NCR Resolution"
    department={selectedNCRForForum.department}
    auditorId={selectedNCRForForum.auditorId}
    auditorName={selectedNCRForForum.auditorName}
    auditeeId={selectedNCRForForum.auditeeId}
    auditeeName={selectedNCRForForum.auditeeName}
    isOpen={showNCRForumModal}
     memberEmails={selectedNCRForForum.memberEmails || []}  // ✅ ADD THIS
    onClose={() => {
      setShowNCRForumModal(false);
      setSelectedNCRForForum(null);
    }}
    currentUser={user}
    allUsers={allUsersList}
  />
)}
    </>
  );
}


// Add this helper function before the RescheduleRequestModal component
const getValidEndTimes = (startTime, endTimeOptions) => {
  if (!startTime) return endTimeOptions;
  const startMinutes = parseTimeToMinutes(startTime);
  return endTimeOptions.filter(time => parseTimeToMinutes(time) > startMinutes);
};

const getValidStartTimes = (endTime, startTimeOptions) => {
  if (!endTime) return startTimeOptions;
  const endMinutes = parseTimeToMinutes(endTime);
  return startTimeOptions.filter(time => parseTimeToMinutes(time) < endMinutes);
};
const RescheduleRequestModal = ({ audit, isOpen, onClose, onSubmit }) => {
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState('');
  const [timeConflictError, setTimeConflictError] = useState('');
  const [conflictDetails, setConflictDetails] = useState([]);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const { addToast } = useToast();

  // Helper: Parse time string to minutes for comparison
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Get valid end times based on selected start time (only show times AFTER start time)
  const getValidEndTimes = (startTime) => {
    if (!startTime) return TIME_OPTIONS;
    const startMinutes = parseTimeToMinutes(startTime);
    return TIME_OPTIONS.filter(time => parseTimeToMinutes(time) > startMinutes);
  };

  // Get filtered end times based on current start time
  const validEndTimes = getValidEndTimes(newStartTime);

  // Helper: Check if two time ranges overlap
  const doTimeRangesOverlap = (start1, end1, start2, end2) => {
    const start1Min = parseTimeToMinutes(start1);
    const end1Min = parseTimeToMinutes(end1);
    const start2Min = parseTimeToMinutes(start2);
    const end2Min = parseTimeToMinutes(end2);
    
    return start1Min < end2Min && end1Min > start2Min;
  };

  // Fetch all existing schedules for the auditor
  const fetchExistingSchedules = async () => {
    try {
      const auditorId = audit?.auditorId || audit?.leadAuditorId;
      if (!auditorId) return [];
      
      const response = await axios.get(
        `${API_BASE}/audit-schedule/auditor/${auditorId}/schedules-with-status`,
        { withCredentials: true }
      );
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
  };

  // Check for scheduling conflicts with overlap detection
  const checkSchedulingConflict = async (date, startTime, endTime) => {
    if (!date || !startTime || !endTime || !audit?.id) return false;
    
    setCheckingConflict(true);
    setTimeConflictError('');
    setConflictDetails([]);
    
    try {
      const formattedDate = new Date(date).toISOString().split('T')[0];
      
      let schedules = existingSchedules;
      if (schedules.length === 0) {
        schedules = await fetchExistingSchedules();
        setExistingSchedules(schedules);
      }
      
      const conflicts = schedules.filter(schedule => {
        if (schedule.schedule?.id === audit.id) return false;
        
        const scheduleDate = schedule.schedule?.scheduledDate;
        if (scheduleDate !== formattedDate) return false;
        
        const scheduleStart = schedule.schedule?.startTime;
        const scheduleEnd = schedule.schedule?.endTime;
        
        if (!scheduleStart || !scheduleEnd) return false;
        
        return doTimeRangesOverlap(startTime, endTime, scheduleStart, scheduleEnd);
      });
      
      if (conflicts.length > 0) {
        setConflictDetails(conflicts);
        
        const conflict = conflicts[0];
        const conflictStart = conflict.schedule?.startTime;
        const conflictEnd = conflict.schedule?.endTime;
        const conflictDept = conflict.schedule?.department;
        
        const errorMsg = `Time conflict: You already have an audit scheduled on ${formattedDate} from ${conflictStart} - ${conflictEnd}. ` +
                        `Your requested time (${startTime} - ${endTime}) overlaps with this audit.` +
                        (conflictDept ? ` (Department: ${conflictDept})` : '');
        
        setTimeConflictError(errorMsg);
        return true;
      }
      
      setTimeConflictError('');
      setConflictDetails([]);
      return false;
    } catch (error) {
      console.error('Error checking schedule conflict:', error);
      addToast('Unable to verify schedule availability. Please proceed with caution.', 'warning');
      return false;
    } finally {
      setCheckingConflict(false);
    }
  };

  const getDateRestrictions = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const minDate = tomorrow;
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 21);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    return {
      minDate: formatDate(minDate),
      maxDate: formatDate(maxDate),
    };
  };

  const { minDate, maxDate } = getDateRestrictions();

  const validateDate = (date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      setDateError('Reschedule date must be a future date (tomorrow or later)');
      return false;
    }
    
    const maxAllowed = new Date();
    maxAllowed.setDate(maxAllowed.getDate() + 21);
    
    if (selectedDate > maxAllowed) {
      setDateError('Reschedule date should be within the next 3 weeks');
      return false;
    }
    
    setDateError('');
    return true;
  };

  const handleDateChange = (e) => {
    const newValue = e.target.value;
    setNewDate(newValue);
    if (newValue) {
      validateDate(newValue);
    } else {
      setDateError('');
    }
    setTimeConflictError('');
    setConflictDetails([]);
  };

  const handleStartTimeChange = (e) => {
    const selectedStart = e.target.value;
    setNewStartTime(selectedStart);
    
    // Auto-reset end time if current end time is now invalid (before or equal to new start time)
    if (newEndTime && parseTimeToMinutes(selectedStart) >= parseTimeToMinutes(newEndTime)) {
      setNewEndTime(''); // Clear end time so user can select a valid one
    }
    
    setTimeConflictError('');
    setConflictDetails([]);
  };

  const handleEndTimeChange = (e) => {
    setNewEndTime(e.target.value);
    setTimeConflictError('');
    setConflictDetails([]);
  };

  // Check for conflicts when time selection changes
  useEffect(() => {
    if (newDate && newStartTime && newEndTime && !dateError && newStartTime && newEndTime) {
      // Only check if end time is after start time
      if (parseTimeToMinutes(newStartTime) < parseTimeToMinutes(newEndTime)) {
        const delayDebounce = setTimeout(() => {
          checkSchedulingConflict(newDate, newStartTime, newEndTime);
        }, 500);
        
        return () => clearTimeout(delayDebounce);
      } else {
        setTimeConflictError('End time must be after start time');
      }
    }
  }, [newDate, newStartTime, newEndTime, dateError]);

  // Refresh schedules when modal opens
  useEffect(() => {
    if (audit && isOpen) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      setNewDate(defaultDate.toISOString().split('T')[0]);
      setNewStartTime(audit.startTime || '09:00 AM');
      setNewEndTime(audit.endTime || '10:00 AM');
      setReason('');
      setDateError('');
      setTimeConflictError('');
      setConflictDetails([]);
      setExistingSchedules([]);
    }
  }, [audit, isOpen]);

  const handleSubmit = async () => {
    if (!newDate) {
      addToast('Please select new date', 'error');
      return;
    }
    
    if (!validateDate(newDate)) {
      addToast(dateError, 'error');
      return;
    }
    
    if (!newStartTime || !newEndTime) {
      addToast('Please select both start and end times', 'error');
      return;
    }
    
    if (parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime)) {
      addToast('End time must be after start time', 'error');
      return;
    }
    
    const hasConflict = await checkSchedulingConflict(newDate, newStartTime, newEndTime);
    if (hasConflict) {
      addToast(timeConflictError || 'Time slot conflicts with another audit schedule', 'error');
      return;
    }
    
    if (!reason.trim()) {
      addToast('Please provide a reason', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const formattedDate = new Date(newDate).toISOString().split('T')[0];
      
      await onSubmit(audit.id, formattedDate, newStartTime, newEndTime, reason);
      addToast('Reschedule request submitted successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Reschedule error details:', error);
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          'Failed to submit reschedule request';
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md p-5 border shadow-2xl backdrop-blur-xl bg-white/95 rounded-2xl border-white/30 max-h-[90vh] overflow-y-auto">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Request Reschedule</h3>
        <p className="mb-2 text-sm text-gray-600">Reschedule <strong>{audit?.auditType}</strong> for <strong>{audit?.department}</strong></p>
        
        <div className="space-y-3">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">New Date *</label>
            <input 
              type="date" 
              value={newDate} 
              onChange={handleDateChange} 
              className={`w-full p-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                dateError ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              min={minDate}
              max={maxDate}
            />
            {dateError && (
              <p className="mt-1 text-xs text-red-600">{dateError}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Start Time *</label>
              <select 
                value={newStartTime} 
                onChange={handleStartTimeChange}
                className="w-full p-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TIME_OPTIONS.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">End Time *</label>
              <select 
                value={newEndTime} 
                onChange={handleEndTimeChange}
                className={`w-full p-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  timeConflictError && newStartTime && newEndTime ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
                disabled={!newStartTime}
              >
                <option value="">Select end time</option>
                {validEndTimes.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
              {newStartTime && validEndTimes.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  No valid end times available. Please select an earlier start time.
                </p>
              )}
              
            </div>
          </div>
          
          {/* Time validation message */}
          {newStartTime && newEndTime && parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime) && (
            <div className="flex items-center gap-2 p-2 text-xs text-red-600 bg-red-50/80 rounded-xl">
              <AlertCircle size={12} />
              <span>End time must be after start time</span>
            </div>
          )}
          
          {/* Time Conflict Error Message */}
          {timeConflictError && (
            <div className="flex items-start gap-2 p-3 text-sm border backdrop-blur-sm bg-red-50/80 rounded-xl border-red-200/50">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-red-700">{timeConflictError}</span>
                {conflictDetails.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    {conflictDetails.map((conflict, idx) => (
                      <div key={idx} className="mt-1">
                        🔴 Conflict: {conflict.schedule?.startTime} - {conflict.schedule?.endTime}
                        {conflict.schedule?.department && ` (${conflict.schedule.department})`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Loading indicator for conflict check */}
          {checkingConflict && newDate && newStartTime && newEndTime && !timeConflictError && (
            <div className="flex items-center gap-2 p-2 text-xs text-blue-600">
              <RefreshCw size={12} className="animate-spin" />
              <span>Checking availability...</span>
            </div>
          )}
          
          {/* Success indicator for available slot */}
          {!checkingConflict && newDate && newStartTime && newEndTime && !timeConflictError && !dateError && 
           parseTimeToMinutes(newStartTime) < parseTimeToMinutes(newEndTime) && (
            <div className="flex items-center gap-2 p-2 text-xs text-green-600">
              <CheckCircle size={12} />
              <span>Time slot available</span>
            </div>
          )}
          
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Reason for Reschedule *</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              rows={2} 
              className="w-full p-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="Please provide reason for rescheduling..." 
            />
          </div>
          
          <div className="p-2 text-xs text-gray-500 rounded-lg bg-gray-50/80">
            <p className="font-semibold">Note:</p>
            <p className="mt-1">Once you submit this request, the audit will be put on hold until the reschedule is approved by the coordinator.</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={onClose} 
            className="px-4 py-1.5 text-sm font-medium text-gray-700 transition-all rounded-xl backdrop-blur-sm bg-gray-100/80 hover:bg-gray-200/80"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting || !!dateError || !!timeConflictError || checkingConflict || !newStartTime || !newEndTime || parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime)} 
            className={`px-4 py-1.5 text-sm font-medium text-white rounded-xl transition-all shadow-sm ${
              submitting || dateError || timeConflictError || checkingConflict || !newStartTime || !newEndTime || parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Reschedule Request'}
          </button>
        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────
// Extension Modal with Time Fields
// ─────────────────────────────────────────────────────────────
const ExtensionRequestModal = ({ audit, form, isOpen, onClose, onSubmit }) => {
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeError, setTimeError] = useState('');
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictDetails, setConflictDetails] = useState([]);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const { addToast } = useToast();

  // Helper: Parse time string to minutes for comparison
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Get valid end times based on selected start time (only show times AFTER start time)
  const getValidEndTimes = (startTime) => {
    if (!startTime) return TIME_OPTIONS;
    const startMinutes = parseTimeToMinutes(startTime);
    return TIME_OPTIONS.filter(time => parseTimeToMinutes(time) > startMinutes);
  };

  // Get filtered end times based on current start time
  const validEndTimes = getValidEndTimes(newStartTime);

  // Helper: Check if two time ranges overlap
  const doTimeRangesOverlap = (start1, end1, start2, end2) => {
    const start1Min = parseTimeToMinutes(start1);
    const end1Min = parseTimeToMinutes(end1);
    const start2Min = parseTimeToMinutes(start2);
    const end2Min = parseTimeToMinutes(end2);
    
    return start1Min < end2Min && end1Min > start2Min;
  };

  // Fetch all existing schedules for the auditor to check conflicts
  const fetchExistingSchedules = async () => {
    try {
      const auditorId = audit?.auditorId || audit?.leadAuditorId;
      if (!auditorId) return [];
      
      const response = await axios.get(
        `${API_BASE}/audit-schedule/auditor/${auditorId}/schedules-with-status`,
        { withCredentials: true }
      );
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
  };

  // Check for scheduling conflicts with overlap detection
  const checkSchedulingConflict = async (date, startTime, endTime) => {
    if (!date || !startTime || !endTime || !audit?.id) return false;
    
    setCheckingConflict(true);
    setTimeError('');
    setConflictDetails([]);
    
    try {
      const formattedDate = new Date(date).toISOString().split('T')[0];
      
      let schedules = existingSchedules;
      if (schedules.length === 0) {
        schedules = await fetchExistingSchedules();
        setExistingSchedules(schedules);
      }
      
      const conflicts = schedules.filter(schedule => {
        // Skip current audit
        if (schedule.schedule?.id === audit.id) return false;
        
        const scheduleDate = schedule.schedule?.scheduledDate;
        if (scheduleDate !== formattedDate) return false;
        
        const scheduleStart = schedule.schedule?.startTime;
        const scheduleEnd = schedule.schedule?.endTime;
        
        if (!scheduleStart || !scheduleEnd) return false;
        
        return doTimeRangesOverlap(startTime, endTime, scheduleStart, scheduleEnd);
      });
      
      if (conflicts.length > 0) {
        setConflictDetails(conflicts);
        
        const conflict = conflicts[0];
        const conflictStart = conflict.schedule?.startTime;
        const conflictEnd = conflict.schedule?.endTime;
        const conflictDept = conflict.schedule?.department;
        
        const errorMsg = `Time conflict: You already have an audit scheduled on ${formattedDate} from ${conflictStart} - ${conflictEnd}. ` +
                        `Your requested time (${startTime} - ${endTime}) overlaps with this audit.` +
                        (conflictDept ? ` (Department: ${conflictDept})` : '');
        
        setTimeError(errorMsg);
        return true;
      }
      
      setTimeError('');
      setConflictDetails([]);
      return false;
    } catch (error) {
      console.error('Error checking schedule conflict:', error);
      addToast('Unable to verify schedule availability. Please proceed with caution.', 'warning');
      return false;
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleStartTimeChange = (e) => {
    const selectedStart = e.target.value;
    setNewStartTime(selectedStart);
    
    // Reset end time if current end time is now invalid (before or equal to new start time)
    if (newEndTime && parseTimeToMinutes(selectedStart) >= parseTimeToMinutes(newEndTime)) {
      setNewEndTime(''); // Clear end time so user can select a valid one
    }
    
    setTimeError('');
    setConflictDetails([]);
  };

  const handleEndTimeChange = (e) => {
    setNewEndTime(e.target.value);
    setTimeError('');
    setConflictDetails([]);
  };

  // Check for conflicts when time selection changes
  useEffect(() => {
    if (newDate && newStartTime && newEndTime && newStartTime && newEndTime) {
      // Only check if end time is after start time
      if (parseTimeToMinutes(newStartTime) < parseTimeToMinutes(newEndTime)) {
        const delayDebounce = setTimeout(() => {
          checkSchedulingConflict(newDate, newStartTime, newEndTime);
        }, 500);
        
        return () => clearTimeout(delayDebounce);
      } else {
        setTimeError('End time must be after start time');
      }
    }
  }, [newDate, newStartTime, newEndTime]);

  useEffect(() => {
    if (audit && isOpen) { 
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setNewDate(defaultDate.toISOString().split('T')[0]); 
      setNewStartTime(audit.startTime || '09:00 AM');
      setNewEndTime(audit.endTime || '10:00 AM');
      setReason('');
      setTimeError('');
      setConflictDetails([]);
      setExistingSchedules([]);
    }
  }, [audit, isOpen]);

  const handleSubmit = async () => {
    if (!newDate) { 
      addToast('Please select new date', 'error'); 
      return; 
    }
    
    // Validate date is not in the past
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      addToast('Extension date cannot be in the past', 'error');
      return;
    }
    
    if (!newStartTime || !newEndTime) {
      addToast('Please select both start and end times', 'error');
      return;
    }
    
    if (parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime)) {
      addToast('End time must be after start time', 'error');
      return;
    }
    
    // Check for scheduling conflicts
    const hasConflict = await checkSchedulingConflict(newDate, newStartTime, newEndTime);
    if (hasConflict) {
      addToast(timeError || 'Time slot conflicts with another audit schedule', 'error');
      return;
    }
    
    if (!reason.trim()) { 
      addToast('Please provide a reason', 'error'); 
      return; 
    }
    
    setSubmitting(true);
    try {
      await onSubmit(audit.id, newDate, newStartTime, newEndTime, reason, form);
      addToast('Extension request submitted successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Extension error:', error);
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          'Failed to submit extension request';
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  
  const completedCount = audit?.completedForms || 0;
  const totalCount = audit?.totalForms || 1;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md p-5 border shadow-2xl backdrop-blur-xl bg-white/95 rounded-2xl border-white/30 max-h-[90vh] overflow-y-auto">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Request Extension</h3>
        <div className="p-3 mb-3 border bg-orange-50/80 rounded-xl border-orange-200/50">
          <p className="text-sm text-gray-700">
            You have completed <strong>{completedCount} of {totalCount} forms</strong> for this audit.
          </p>
          <p className="mt-1 text-xs text-orange-600">
            Request an extension to complete the remaining forms.
          </p>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Request extension for <strong>{audit?.auditType}</strong> - <strong>{audit?.department}</strong>
          {form && <span className="block mt-1 text-xs text-gray-500">Form: {form.name}</span>}
        </p>
        
        <div className="space-y-3">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">New Due Date *</label>
            <input 
              type="date" 
              value={newDate} 
              onChange={e => setNewDate(e.target.value)} 
              className="w-full p-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              min={new Date().toISOString().split('T')[0]} 
            />
            <p className="mt-1 text-xs text-gray-500">Select new completion date</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Start Time</label>
              <select 
                value={newStartTime} 
                onChange={handleStartTimeChange} 
                className="w-full p-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {TIME_OPTIONS.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">All times available</p>
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">End Time</label>
              <select 
                value={newEndTime} 
                onChange={handleEndTimeChange} 
                className="w-full p-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={!newStartTime}
              >
                <option value="">Select end time</option>
                {validEndTimes.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
              {newStartTime && validEndTimes.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  No valid end times available. Please select an earlier start time.
                </p>
              )}
              {newStartTime && validEndTimes.length > 0 && (
                <p className="mt-1 text-xs text-green-600">
                  Showing {validEndTimes.length} time(s) after {newStartTime}
                </p>
              )}
            </div>
          </div>
          
          {/* Time validation message */}
          {newStartTime && newEndTime && parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime) && (
            <div className="flex items-center gap-2 p-2 text-xs text-red-600 bg-red-50/80 rounded-xl">
              <AlertCircle size={12} />
              <span>End time must be after start time</span>
            </div>
          )}
          
          {/* Time Conflict Error Message */}
          {timeError && (
            <div className="flex items-start gap-2 p-3 text-sm border backdrop-blur-sm bg-red-50/80 rounded-xl border-red-200/50">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-red-700">{timeError}</span>
                {conflictDetails.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    {conflictDetails.map((conflict, idx) => (
                      <div key={idx} className="mt-1">
                        🔴 Conflict: {conflict.schedule?.startTime} - {conflict.schedule?.endTime}
                        {conflict.schedule?.department && ` (${conflict.schedule.department})`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Loading indicator for conflict check */}
          {checkingConflict && newDate && newStartTime && newEndTime && !timeError && (
            <div className="flex items-center gap-2 p-2 text-xs text-blue-600">
              <RefreshCw size={12} className="animate-spin" />
              <span>Checking availability...</span>
            </div>
          )}
          
          {/* Success indicator for available slot */}
          {!checkingConflict && newDate && newStartTime && newEndTime && !timeError && 
           parseTimeToMinutes(newStartTime) < parseTimeToMinutes(newEndTime) && (
            <div className="flex items-center gap-2 p-2 text-xs text-green-600">
              <CheckCircle size={12} />
              <span>Time slot available</span>
            </div>
          )}
          
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Reason for Extension *</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              rows={3} 
              className="w-full p-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              placeholder="Please provide detailed reason for extension..." 
            />
          </div>
          
          <div className="p-2 text-xs text-gray-500 rounded-lg bg-gray-50/80">
            <p className="font-semibold">Note:</p>
            <p className="mt-1">Extension requests will be reviewed by the audit coordinator. You will be notified once approved.</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={onClose} 
            className="px-4 py-1.5 text-sm font-medium text-gray-700 transition-all rounded-xl backdrop-blur-sm bg-gray-100/80 hover:bg-gray-200/80"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting || !newStartTime || !newEndTime || !!timeError || checkingConflict || parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime)} 
            className={`px-4 py-1.5 text-sm font-medium text-white rounded-xl transition-all shadow-sm ${
              submitting || !newStartTime || !newEndTime || !!timeError || checkingConflict || parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Extension Request'}
          </button>
        </div>
      </div>
    </div>
  );
};