// src/components/dashboards/AuditeeDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckCircle, FiClock, FiAlertCircle,
  FiEye, FiRefreshCw, FiCalendar, FiFileText,
  FiTrendingUp, FiSend, FiCheck, FiX, FiUser,
  FiCalendar as FiCalendarIcon, FiInfo, FiGrid, FiList, FiSearch,
  FiThumbsUp, FiThumbsDown, FiBarChart2, FiActivity
} from 'react-icons/fi';

import { Clock, ChevronDown, ChevronUp, UserCheck, TrendingUp, Target, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ncrService } from '../services/ncrService';
import { useToast } from '../ToastContext';
import axios from 'axios';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import ForumThreadView from '../forum/ForumThreadView';
import Drawer from '../Drawer';
import { MessageCircle } from 'lucide-react';

const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

const getViewRoute = (audit) => {
  const auditType = (audit.auditType || '').toLowerCase().trim();
  if (auditType.includes('5s') || auditType.includes('five_s')) return `/audit/5s-view`;
  if (auditType.includes('process') || auditType.includes('manufacturing')) return `/audit/manufacturing-view`;
  if (auditType.includes('iatf') || auditType.includes('system')) return `/audit/iatf-view`;
  if (auditType.includes('product')) return `/audit/product-view`;
  if (auditType.includes('iso')) return `/audit/iso-view`;
  if (auditType.includes('safety') || auditType.includes('safe')) return `/audit/safety-view`;
  if (auditType.includes('poka') || auditType.includes('yoke')) return `/audit/pokayoke-view`;
  return `/audit/5s-view`;
};

const parseResponseAnswers = (response) => {
  if (!response) return [];
  if (response.answers && Array.isArray(response.answers)) return response.answers;
  if (response.answers && typeof response.answers === 'string') {
    try { return JSON.parse(response.answers); } catch(e) { return []; }
  }
  return [];
};

const getNcrFindingEntries = (answers) => {
  if (!Array.isArray(answers)) return [];
  return answers.filter(a => a.ncrFinding === true || a.ncrFinding === 'true');
};

// ========== STAT CARD ==========
const StatCard = ({ title, value, icon, color, delay }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
    if (numValue === 0) { setCount(0); return; }
    let start = 0;
    const duration = 800;
    const step = (numValue / duration) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= numValue) { setCount(numValue); clearInterval(timer); }
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
    teal: 'rgba(20, 184, 166, 0.1)'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden transition-all duration-300 border shadow-lg backdrop-blur-lg bg-white/80 rounded-2xl hover:shadow-xl border-white/20"
      style={{ backgroundColor: colorMap[color] }}
    >
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{count}</p>
          </div>
          <div className="p-3 shadow-sm rounded-xl backdrop-blur-sm bg-white/50">{icon}</div>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-${color}-400 to-${color}-600 opacity-50`} />
    </motion.div>
  );
};

// ========== NCR Status Badge ==========
const NcrStatusBadge = ({ status }) => {
  const config = {
    SENT_TO_8D:       { label: 'In 8D', icon: '8D', className: 'bg-indigo-100/80 text-indigo-700 border-indigo-200/50 backdrop-blur-sm' },
    IN_8D_PROCESS:    { label: 'In 8D', icon: '8D', className: 'bg-indigo-100/80 text-indigo-700 border-indigo-200/50 backdrop-blur-sm' },
    READY_FOR_NCR2:   { label: 'Ready for NCR2', icon: '', className: 'bg-violet-100/80 text-violet-700 border-violet-200/50 backdrop-blur-sm' },
    NCR2_IN_PROGRESS: { label: 'NCR2 Verification', icon: '', className: 'bg-purple-100/80 text-purple-700 border-purple-200/50 backdrop-blur-sm' },
    NCR2_COMPLETED:   { label: 'NCR2 Completed', icon: '', className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 backdrop-blur-sm' },
    AWAITING_AUDITEE: { label: 'Awaiting Review', icon: '', className: 'bg-amber-100/80 text-amber-700 border-amber-200/50 backdrop-blur-sm' },
    OPEN:             { label: 'Open', icon: '', className: 'bg-blue-100/80 text-blue-700 border-blue-200/50 backdrop-blur-sm' },
    APPROVED:         { label: 'Approved', icon: '', className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 backdrop-blur-sm' },
    IN_PROGRESS:      { label: 'In Progress', icon: '', className: 'bg-purple-100/80 text-purple-700 border-purple-200/50 backdrop-blur-sm' },
    REJECTED:         { label: 'Rejected', icon: '', className: 'bg-red-100/80 text-red-700 border-red-200/50 backdrop-blur-sm' },
    CLOSED:           { label: 'Closed', icon: '', className: 'bg-gray-100/80 text-gray-700 border-gray-200/50 backdrop-blur-sm' },
    COMPLETED:        { label: 'Completed', icon: '', className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 backdrop-blur-sm' },
  };
  const { label, icon, className } = config[status] || { label: status, icon: '📌', className: 'bg-gray-100/80 text-gray-700 border-gray-200/50 backdrop-blur-sm' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border backdrop-blur-sm ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
};

// ========== AUDIT CARD (Grid View) ==========
const AuditCard = ({ audit, onViewReport, onApprove, onReject, formDetails, totalForms, completedForms, onOpenForum }) => {
  const [expanded, setExpanded] = useState(false);
  const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
  const isMultiForm = totalForms > 1;

  const allApproved = formDetails?.length > 0 && formDetails?.every(f => f.status === 'APPROVED');
  const allRejected = formDetails?.length > 0 && formDetails?.every(f => f.status === 'REJECTED');
  const hasAnyRejected = formDetails?.some(f => f.status === 'REJECTED');
  const hasAnyApproved = formDetails?.some(f => f.status === 'APPROVED');
  const hasPending = formDetails?.some(f => f.status === 'COMPLETED' || f.status === 'AWAITING_APPROVAL' || f.status === 'SUBMITTED');

  let cardStatus = 'PENDING';
  if (allApproved) cardStatus = 'APPROVED';
  else if (allRejected) cardStatus = 'REJECTED';
  else if (hasAnyRejected) cardStatus = 'PARTIALLY_REJECTED';
  else if (hasAnyApproved && hasPending) cardStatus = 'PARTIALLY_APPROVED';

  const progressPercent = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="transition-all duration-300 border shadow-lg group backdrop-blur-xl bg-white/90 rounded-2xl hover:shadow-xl border-white/30"
    >
      <div className="p-5">
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100/50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onOpenForum(audit, null)}
              className="px-3 py-2 text-sm font-medium text-purple-700 backdrop-blur-sm bg-purple-100/80 rounded-xl hover:bg-purple-200/80 transition-all flex items-center gap-1.5"
            >
              <MessageCircle size={14} />
              Discussion Forum
            </button>
            {cardStatus === 'APPROVED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-emerald-100/80 text-emerald-700 border border-emerald-200/50"><FiCheckCircle size={12} /> All Approved</span>}
            {cardStatus === 'REJECTED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-red-100/80 text-red-700 border border-red-200/50"><FiX size={12} /> All Rejected</span>}
            {cardStatus === 'PARTIALLY_REJECTED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-orange-100/80 text-orange-700 border border-orange-200/50"><FiAlertCircle size={12} /> Partially Rejected</span>}
            {cardStatus === 'PARTIALLY_APPROVED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-blue-100/80 text-blue-700 border border-blue-200/50"><FiCheckCircle size={12} /> Partially Approved</span>}
            {cardStatus === 'PENDING' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-amber-100/80 text-amber-700 border border-amber-200/50"><FiClock size={12} /> Pending Review</span>}
            {isMultiForm && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-blue-100/80 text-blue-700 border border-blue-200/50"><Target size={12} /> {completedForms}/{totalForms}</span>}
          </div>
          <div className="px-2 py-1 text-xs text-gray-500 rounded-lg backdrop-blur-sm bg-white/50">
            <FiCalendar size={12} className="inline mr-1" />
            {isDateRange ? `${audit.fromDate} → ${audit.toDate}` : audit.scheduledDate}
          </div>
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-800 transition-colors group-hover:text-blue-600">
          {audit.auditType || 'Audit'}
        </h3>
        <p className="mb-3 text-sm text-gray-500">{audit.department || 'General Department'}</p>

        <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-2 py-1 rounded-lg">
            <Clock size={12} className="text-gray-400" />
            <span>{audit.startTime} - {audit.endTime}</span>
          </div>
          <div className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-2 py-1 rounded-lg">
            <UserCheck size={12} className="text-gray-400" />
            <span>{audit.auditorName || 'Not Assigned'}</span>
          </div>
        </div>

        {isMultiForm && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">Completion Progress</span>
              <span className="text-xs font-semibold text-blue-600">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2 overflow-hidden rounded-full bg-gray-100/50 backdrop-blur-sm">
              <div className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {isMultiForm && formDetails && formDetails.length > 0 && (
          <div className="mb-4">
            <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-600 transition-all backdrop-blur-sm bg-gray-100/50 rounded-xl hover:bg-gray-100/80">
              <span>Individual Forms ({completedForms}/{totalForms})</span>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expanded && (
              <div className="mt-3 space-y-2 overflow-y-auto max-h-64">
                {formDetails.map((form, idx) => {
                  const isFormApproved = form.status === 'APPROVED';
                  const isFormRejected = form.status === 'REJECTED';
                  const isFormPending = form.status === 'COMPLETED' || form.status === 'AWAITING_APPROVAL' || form.status === 'SUBMITTED';
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 text-sm border backdrop-blur-sm bg-gray-50/50 rounded-xl border-gray-100/50">
                      <div className="flex items-center min-w-0 gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFormApproved ? 'bg-emerald-500' : isFormRejected ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className="text-gray-700 truncate">{form.processName || form.name}</span>
                      </div>
                      <div className="flex items-center flex-shrink-0 gap-1">
                        <button
                          onClick={() => onOpenForum(audit, null)}
                          className="px-3 py-1.5 text-xs font-medium text-purple-700 backdrop-blur-sm bg-purple-100/80 rounded-xl hover:bg-purple-200/80 transition-all flex items-center gap-1"
                          title="Open Discussion Forum"
                        >
                          <MessageCircle size={12} />
                          Forum
                        </button>
                        <button onClick={() => onViewReport(audit, form.responseId)} className="p-1.5 text-blue-600 hover:bg-blue-100/50 rounded-xl transition-all" title="View">
                          <FiEye size={14} />
                        </button>
                        {isFormPending && (
                          <>
                            <button onClick={() => onApprove(audit, form)} className="p-1.5 text-emerald-600 hover:bg-emerald-100/50 rounded-xl transition-all" title="Approve">
                              <FiThumbsUp size={14} />
                            </button>
                            <button onClick={() => onReject(audit, form)} className="p-1.5 text-red-600 hover:bg-red-100/50 rounded-xl transition-all" title="Reject">
                              <FiThumbsDown size={14} />
                            </button>
                          </>
                        )}
                        {isFormApproved && <span className="px-2 py-1 text-xs font-medium text-emerald-700 backdrop-blur-sm bg-emerald-100/80 rounded-xl">Approved</span>}
                        {isFormRejected && <span className="px-2 py-1 text-xs font-medium text-red-700 backdrop-blur-sm bg-red-100/80 rounded-xl">Rejected</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {hasPending && (
          <div className="flex gap-2 pt-3 border-t border-gray-100/50">
            <button onClick={() => {
              const pendingForm = formDetails.find(f => f.status === 'COMPLETED' || f.status === 'AWAITING_APPROVAL' || f.status === 'SUBMITTED');
              if (pendingForm) onViewReport(audit, pendingForm.responseId);
            }} className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 transition-all backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80">
              <FiEye size={14} className="inline mr-1.5" /> View Latest
            </button>
          </div>
        )}

        {(cardStatus === 'APPROVED' || cardStatus === 'REJECTED') && formDetails?.length > 0 && (
          <div className="pt-3 border-t border-gray-100/50">
            <button onClick={() => onViewReport(audit, formDetails[0]?.responseId)} className="w-full px-3 py-2 text-sm font-medium text-blue-700 transition-all backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80">
              <FiEye size={14} className="inline mr-1.5" /> View All Reports
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ========== AUDIT LIST ITEM (List View) ==========
const AuditListItem = ({ audit, onViewReport, onApprove, onReject, formDetails, totalForms, completedForms, onOpenForum }) => {
  const [expanded, setExpanded] = useState(false);
  const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
  const isMultiForm = totalForms > 1;

  const allApproved = formDetails?.length > 0 && formDetails?.every(f => f.status === 'APPROVED');
  const allRejected = formDetails?.length > 0 && formDetails?.every(f => f.status === 'REJECTED');
  const hasAnyRejected = formDetails?.some(f => f.status === 'REJECTED');
  const hasAnyApproved = formDetails?.some(f => f.status === 'APPROVED');
  const hasPending = formDetails?.some(f => f.status === 'COMPLETED' || f.status === 'AWAITING_APPROVAL' || f.status === 'SUBMITTED');

  let cardStatus = 'PENDING';
  if (allApproved) cardStatus = 'APPROVED';
  else if (allRejected) cardStatus = 'REJECTED';
  else if (hasAnyRejected) cardStatus = 'PARTIALLY_REJECTED';
  else if (hasAnyApproved && hasPending) cardStatus = 'PARTIALLY_APPROVED';

  const progressPercent = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="transition-all duration-300 border shadow-lg group backdrop-blur-xl bg-white/90 rounded-2xl hover:shadow-xl border-white/30">
      <div className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-3">
              {cardStatus === 'APPROVED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-emerald-100/80 text-emerald-700 border border-emerald-200/50"><FiCheckCircle size={12} /> All Approved</span>}
              {cardStatus === 'REJECTED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-red-100/80 text-red-700 border border-red-200/50"><FiX size={12} /> All Rejected</span>}
              {cardStatus === 'PARTIALLY_REJECTED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-orange-100/80 text-orange-700 border border-orange-200/50"><FiAlertCircle size={12} /> Partially Rejected</span>}
              {cardStatus === 'PARTIALLY_APPROVED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-blue-100/80 text-blue-700 border border-blue-200/50"><FiCheckCircle size={12} /> Partially Approved</span>}
              {cardStatus === 'PENDING' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-amber-100/80 text-amber-700 border border-amber-200/50"><FiClock size={12} /> Pending Review</span>}
              {isMultiForm && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm bg-blue-100/80 text-blue-700 border border-blue-200/50"><Target size={12} /> {completedForms}/{totalForms}</span>}
            </div>

            <h3 className="mb-1 text-lg font-semibold text-gray-800 transition-colors group-hover:text-blue-600">
              {audit.auditType || 'Audit'} - {audit.department || 'General'}
            </h3>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-2 py-1 rounded-lg"><Clock size={12} /> {audit.startTime} - {audit.endTime}</span>
              <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-2 py-1 rounded-lg"><UserCheck size={12} /> Auditor: {audit.auditorName || 'Not Assigned'}</span>
              <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-2 py-1 rounded-lg"><FiCalendarIcon size={12} /> {isDateRange ? `${audit.fromDate} → ${audit.toDate}` : audit.scheduledDate}</span>
            </div>

            {isMultiForm && (
              <div className="max-w-md mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-600">Progress</span>
                  <span className="text-xs font-semibold text-blue-600">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-2 overflow-hidden rounded-full bg-gray-100/50 backdrop-blur-sm">
                  <div className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )}

            {isMultiForm && formDetails && formDetails.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {expanded ? 'Hide details' : `View all forms (${totalForms})`}
                </button>

                {expanded && (
                  <div className="mt-3 space-y-2">
                    {formDetails.map((form, idx) => {
                      const isFormApproved = form.status === 'APPROVED';
                      const isFormRejected = form.status === 'REJECTED';
                      const isFormPending = form.status === 'COMPLETED' || form.status === 'AWAITING_APPROVAL' || form.status === 'SUBMITTED';
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 text-sm border backdrop-blur-sm bg-gray-50/50 rounded-xl border-gray-100/50">
                          <div className="flex items-center min-w-0 gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFormApproved ? 'bg-emerald-500' : isFormRejected ? 'bg-red-500' : 'bg-amber-500'}`} />
                            <span className="text-gray-700">{form.processName || form.name}</span>
                          </div>
                          <div className="flex items-center flex-shrink-0 gap-1">
                            <button onClick={() => onViewReport(audit, form.responseId)} className="p-1.5 text-blue-600 hover:bg-blue-100/50 rounded-xl transition-all" title="View">
                              <FiEye size={14} />
                            </button>
                            {isFormPending && (
                              <>
                                <button onClick={() => onApprove(audit, form)} className="p-1.5 text-emerald-600 hover:bg-emerald-100/50 rounded-xl transition-all" title="Approve">
                                  <FiThumbsUp size={14} />
                                </button>
                                <button onClick={() => onReject(audit, form)} className="p-1.5 text-red-600 hover:bg-red-100/50 rounded-xl transition-all" title="Reject">
                                  <FiThumbsDown size={14} />
                                </button>
                              </>
                            )}
                            {isFormApproved && <span className="px-2 py-1 text-xs font-medium text-emerald-700 backdrop-blur-sm bg-emerald-100/80 rounded-xl">Approved</span>}
                            {isFormRejected && <span className="px-2 py-1 text-xs font-medium text-red-700 backdrop-blur-sm bg-red-100/80 rounded-xl">Rejected</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => onOpenForum(audit, null)}
                className="px-4 py-2 text-sm font-medium text-purple-700 backdrop-blur-sm bg-purple-100/80 rounded-xl hover:bg-purple-200/80 transition-all flex items-center gap-1.5"
              >
                <MessageCircle size={14} />
                Discussion Forum
              </button>
              {hasPending && (
                <button onClick={() => {
                  const pendingForm = formDetails.find(f => f.status === 'COMPLETED' || f.status === 'AWAITING_APPROVAL' || f.status === 'SUBMITTED');
                  if (pendingForm) onViewReport(audit, pendingForm.responseId);
                }} className="px-4 py-2 text-sm font-medium text-blue-700 transition-all backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80">
                  <FiEye size={14} className="inline mr-1.5" /> View
                </button>
              )}
              {(cardStatus === 'APPROVED' || cardStatus === 'REJECTED') && formDetails?.length > 0 && (
                <button onClick={() => onViewReport(audit, formDetails[0]?.responseId)} className="px-6 py-2 text-sm font-medium text-blue-700 transition-all backdrop-blur-sm bg-blue-100/80 rounded-xl hover:bg-blue-200/80">
                  <FiEye size={14} className="inline mr-1.5" /> View Reports
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ========== NCR PENDING LIST ==========
const NcrPendingList = ({ pendingNcrAudits, onRaise }) => {
  if (pendingNcrAudits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border shadow-lg backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
        <div className="flex items-center justify-center w-16 h-16 mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-emerald-400 to-emerald-600">
          <FiCheckCircle className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg font-medium text-gray-700">No Pending NCRs</p>
        <p className="mt-1 text-sm text-gray-400">All NCRs have been reviewed</p>
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 bg-gradient-to-r from-amber-50/50 to-orange-50/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl backdrop-blur-sm bg-amber-100/80">
            <FiAlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800">NCRs Awaiting Your Review</p>
            <p className="text-xs text-gray-500 mt-0.5">Please review and take action</p>
          </div>
        </div>
        <span className="px-3 py-1 text-sm font-semibold text-amber-700 backdrop-blur-sm bg-amber-100/80 rounded-xl">
          {pendingNcrAudits.length} Pending
        </span>
      </div>
      <div className="divide-y divide-gray-100/50">
        {pendingNcrAudits.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-white/30">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-mono text-base font-semibold text-gray-900">NCR #{item.ncrNumber || item.id}</p>
              </div>
              <p className="mt-1 text-sm text-gray-500">{item.department || 'General'} · Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not set'}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-xl backdrop-blur-sm ${
                  item.severity === 'Major NC' ? 'bg-red-100/80 text-red-700 border border-red-200/50' : 'bg-amber-100/80 text-amber-700 border border-amber-200/50'
                }`}>
                  {item.severity || 'NCR'}
                </span>
                {item.clause && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 backdrop-blur-sm bg-gray-100/80 rounded-xl">
                    Clause {item.clause}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/ncr-view/${item.id}`} className="p-2 text-gray-400 transition-all rounded-xl hover:text-blue-600 hover:bg-blue-100/50" title="View Details">
                <FiEye size={18} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ========== MAIN AUDITEE DASHBOARD ==========
const AuditeeDashboard = () => {
  const location = useLocation();

  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedAuditsForReview, setCompletedAuditsForReview] = useState([]);
  const [assignedNCRs, setAssignedNCRs] = useState([]);
  const [pendingNcrReviews, setPendingNcrReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('my-audits');

  // Audit Forum states
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
  const [selectedFormForForum, setSelectedFormForForum] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);

  // NCR Forum states
  const [showNCRForumModal, setShowNCRForumModal] = useState(false);
  const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);

  // 8D Forum states
  const [show8DForumDrawer, setShow8DForumDrawer] = useState(false);
  const [selected8DNCR, setSelected8DNCR] = useState(null);
  const [eightDTeamMembers, setEightDTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const [stats, setStats] = useState({
    pendingReview: 0,
    approvedAudits: 0,
    rejectedAudits: 0,
    openNCRs: 0,
    overdueNCRs: 0,
    resolvedNCRs: 0,
  });

  // ========== HELPERS ==========
  const is8DRelated = (ncr) => {
    const eightDStatuses = ['SENT_TO_8D', 'IN_8D_PROCESS', 'READY_FOR_NCR2', 'NCR2_IN_PROGRESS', 'NCR2_COMPLETED'];
    return eightDStatuses.includes(ncr?.status) || ncr?.requires8D === true;
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

  const openAuditForum = (audit, form = null) => {
    const forumId = audit.id ? `AUDIT-${audit.id}` : 'demo';
    const participantEmails = [];
    if (user?.email) participantEmails.push(user.email);
    if (audit.auditorName?.includes('@')) {
      participantEmails.push(audit.auditorName);
    } else if (audit.auditorId) {
      const auditor = allUsersList.find(u => u.id === audit.auditorId);
      if (auditor?.email) participantEmails.push(auditor.email);
    }
    setSelectedAuditForForum({
      id: forumId,
      auditNumber: audit.auditNumber,
      auditType: audit.auditType,
      department: audit.department,
      status: audit.status,
      auditorId: audit.auditorId,
      auditorName: audit.auditorName,
      auditeeId: user?.id,
      auditeeName: user?.name,
      scheduledDate: audit.scheduledDate,
      fromDate: audit.fromDate,
      toDate: audit.toDate,
      startTime: audit.startTime,
      endTime: audit.endTime,
      memberEmails: participantEmails
    });
    setShowForumModal(true);
  };

  const openNCRForum = (ncr) => {
    const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
    setSelectedNCRForForum({
      id: ncr.id,
      ncrNumber: ncr.ncrNumber,
      department: ncr.department,
      severity: ncr.severity,
      status: ncr.status,
      auditorId: ncr.auditorId,
      auditorName: ncr.auditorName,
      auditeeId: ncr.auditeeId || user?.id,
      auditeeName: ncr.auditeeName || user?.name,
      memberEmails: [auditManager?.email].filter(Boolean)
    });
    setShowNCRForumModal(true);
  };

  const open8DForum = async (ncr) => {
    setSelected8DNCR(ncr);
    setEightDTeamMembers([]);
    setShow8DForumDrawer(true);
    setLoadingTeamMembers(true);
    try {
      const eightDEventId = `8D-NCR-${ncr.ncrNumber}`;
      const response = await axios.get(
        `https://qsutrarmsclm.hub.swajyot.co.in:8476/api/eightd/data/${eightDEventId}`
      );
      if (response.data?.success && response.data.data) {
        const d0Data = response.data.data.content?.d0?.[0] || {};
        const emails = Array.isArray(d0Data.additionalEmails)
          ? d0Data.additionalEmails
          : [];
        setEightDTeamMembers(emails);
      }
    } catch (err) {
      console.error('Failed to fetch 8D team members:', err);
      setEightDTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  // ========== HANDLERS ==========
      const handleViewReport = (audit, responseId) => {
      if (!responseId) { addToast('No audit report data available', 'error'); return; }
      const viewRoute = getViewRoute(audit);
      
      // Determine which dashboard to return to
      const returnPath = '/auditee';
      const currentTab = 'my-audits'; // Or get current tab from state
      
      navigate(`${viewRoute}/${responseId}?mode=view`, {
        state: {
          returnTo: returnPath,
          tab: currentTab
        }
      });
    };

  const handleApprove = async (audit, form) => {
    try {
      await axios.put(`${API_BASE}/templates/responses/${form.responseId}/approve`, {
        approvedBy: user?.name,
        approvedAt: new Date().toISOString(),
        signature: user?.name
      }, { withCredentials: true });
      addToast(`Form "${form.processName || form.name}" approved successfully`, 'success');
      await fetchAllData();
    } catch (error) {
      console.error('Error approving audit:', error);
      addToast('Failed to approve audit', 'error');
    }
  };

  const handleReject = async (audit, form) => {
    const reason = window.prompt('Please provide rejection reason:');
    if (!reason || !reason.trim()) { addToast('Rejection reason is required', 'error'); return; }
    try {
      await axios.put(`${API_BASE}/templates/responses/${form.responseId}/reject`, {
        rejectedBy: user?.name,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason
      }, { withCredentials: true });
      addToast(`Form "${form.processName || form.name}" rejected`, 'warning');
      await fetchAllData();
    } catch (error) {
      console.error('Error rejecting audit:', error);
      addToast('Failed to reject audit', 'error');
    }
  };

  const handleNcrReview = async (ncr, approved) => {
    const comment = window.prompt(approved ? 'Approval comment (optional)' : 'Rejection reason (required)') || '';
    if (!approved && !comment.trim()) { addToast('Please enter rejection reason', 'error'); return; }
    try {
      const newStatus = approved ? 'APPROVED' : 'REJECTED';
      const response = await axios.put(`${API_BASE}/ncr/${ncr.id}/status`, {
        status: newStatus,
        comment,
        reviewedBy: user?.name,
        reviewedAt: new Date().toISOString()
      }, { withCredentials: true });
      if (response.status === 200 || response.data.success) {
        addToast(approved ? 'NCR approved successfully' : 'NCR rejected', 'success');
        await fetchAllData();
      } else {
        addToast(response.data?.error || 'Failed to update NCR status', 'error');
      }
    } catch (error) {
      console.error('Error reviewing NCR:', error);
      addToast(error.response?.data?.message || 'Failed to review NCR', 'error');
    }
  };

  // ========== DATA FETCHING ==========
  const fetchAuditsWithResponses = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 1, currentYear, currentYear + 1];
      let allSchedules = [];

      for (const year of years) {
        try {
          const response = await axios.get(`${API_BASE}/audit-schedule/year/${year}`, { withCredentials: true });
          const schedules = response.data || [];
          const mySchedules = schedules.filter(s =>
            s.scheduledDate && (s.auditeeId === user?.id || s.auditeeName === user?.name)
          );
          allSchedules.push(...mySchedules);
        } catch (err) { console.log(`No schedules for year ${year}`); }
      }

      const responsesResponse = await axios.get(`${API_BASE}/templates/responses/all`, { withCredentials: true });
      const allResponses = responsesResponse.data || [];
      const myResponses = allResponses.filter(r =>
        r.auditeeId === user?.id || r.auditeeName === user?.name
      );

      const auditMap = new Map();

      for (const response of myResponses) {
        const scheduleId = response.auditScheduleId;
        if (!scheduleId) continue;

        if (!auditMap.has(scheduleId)) {
          const schedule = allSchedules.find(s => s.id === scheduleId);
          if (schedule) {
            auditMap.set(scheduleId, { ...schedule, formDetails: [], totalForms: 0, completedForms: 0 });
          } else {
            try {
              const scheduleRes = await axios.get(`${API_BASE}/audit-schedule/${scheduleId}`, { withCredentials: true });
              auditMap.set(scheduleId, { ...scheduleRes.data, formDetails: [], totalForms: 0, completedForms: 0 });
            } catch (err) {
              auditMap.set(scheduleId, {
                id: scheduleId,
                auditType: response.checkSheet?.auditType || 'Unknown Audit',
                department: response.department || 'Unknown',
                auditorName: response.auditorName,
                scheduledDate: response.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                startTime: '09:00 AM',
                endTime: '05:00 PM',
                formDetails: [], totalForms: 0, completedForms: 0
              });
            }
          }
        }

        const auditData = auditMap.get(scheduleId);
        auditData.formDetails.push({
          id: response.checkSheet?.id,
          name: response.checkSheet?.name || auditData.auditType,
          processName: response.checkSheet?.name || auditData.auditType || 'Audit Form',
          responseId: response.id,
          completed: true,
          status: response.status || 'COMPLETED',
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
        });
        auditData.totalForms = auditData.formDetails.length;
        auditData.completedForms = auditData.formDetails.filter(f => f.completed).length;
      }

      const auditsArray = Array.from(auditMap.values());
      let pendingFormsCount = 0, approvedFormsCount = 0, rejectedFormsCount = 0;
      auditsArray.forEach(audit => {
        audit.formDetails.forEach(form => {
          if (form.status === 'APPROVED') approvedFormsCount++;
          else if (form.status === 'REJECTED') rejectedFormsCount++;
          else if (['COMPLETED', 'AWAITING_APPROVAL', 'SUBMITTED'].includes(form.status)) pendingFormsCount++;
        });
      });

      setCompletedAuditsForReview(auditsArray);
      setStats(prev => ({ ...prev, pendingReview: pendingFormsCount, approvedAudits: approvedFormsCount, rejectedAudits: rejectedFormsCount }));
      return auditsArray;
    } catch (error) {
      console.error('Error fetching audits with responses:', error);
      return [];
    }
  };

  const fetchNCRData = async () => {
    try {
      let myNCRs = [];

      try {
        const response = await axios.get(`${API_BASE}/ncr/all`, { withCredentials: true });
        const allNCRs = response.data || [];
        myNCRs = allNCRs.filter(ncr =>
          String(ncr.assigneeId) === String(user?.id) ||
          String(ncr.auditeeId) === String(user?.id) ||
          ncr.assigneeName === user?.name ||
          ncr.auditeeName === user?.name
        );
        myNCRs = myNCRs.map(ncr => ({
          ...ncr,
          history: ncr.history || (ncr.statusHistory ? ncr.statusHistory :
            (ncr.status !== 'AWAITING_AUDITEE' && ncr.reviewedAt ? [{
              action: ncr.status,
              comment: ncr.rejectionReason,
              performedBy: ncr.reviewedBy,
              timestamp: ncr.reviewedAt
            }] : []))
        }));
      } catch (err) {
        try {
          const response = await axios.get(`${API_BASE}/ncr`, { withCredentials: true });
          myNCRs = (response.data || []).filter(ncr =>
            String(ncr.assigneeId) === String(user?.id) ||
            String(ncr.auditeeId) === String(user?.id)
          );
        } catch (err2) {
          console.error('Failed to fetch NCRs:', err2);
        }
      }

      if (myNCRs.length === 0) {
        try {
          const responsesRes = await axios.get(`${API_BASE}/templates/responses/all`, { withCredentials: true });
          const myResponses = (responsesRes.data || []).filter(r =>
            r.auditeeId === user?.id || r.auditeeName === user?.name
          );
          for (const response of myResponses) {
            const answers = parseResponseAnswers(response);
            const findings = getNcrFindingEntries(answers);
            if (findings.length > 0) {
              myNCRs.push({
                id: response.id,
                ncrNumber: `NCR-${response.id}`,
                status: response.status === 'APPROVED' ? 'APPROVED' : response.status === 'REJECTED' ? 'REJECTED' : 'AWAITING_AUDITEE',
                department: response.department,
                severity: findings[0]?.severity || 'Minor NC',
                clause: findings[0]?.clause,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: response.createdAt,
                updatedAt: response.updatedAt,
                auditeeId: response.auditeeId,
                auditeeName: response.auditeeName,
                description: findings.map(f => f.checkpoint).join(', '),
                history: [{ action: 'CREATED', comment: 'NCR created from audit findings', performedBy: response.auditorName, timestamp: response.createdAt }]
              });
            }
          }
        } catch (err) {
          console.error('Error fetching responses:', err);
        }
      }

      if (myNCRs.length === 0) {
        setAssignedNCRs([]);
        setPendingNcrReviews([]);
        setStats(prev => ({ ...prev, openNCRs: 0, overdueNCRs: 0, resolvedNCRs: 0 }));
        return [];
      }

      const pendingReview = myNCRs.filter(n => n.status === 'AWAITING_AUDITEE');
      const allNCRsSorted = [...myNCRs].sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      );

      const openNCRs = myNCRs.filter(n => ['OPEN', 'APPROVED', 'READY_FOR_NCR2'].includes(n.status));
      const inProgressNCRs = myNCRs.filter(n => ['IN_PROGRESS', 'SENT_TO_8D', 'IN_8D_PROCESS', 'NCR2_IN_PROGRESS'].includes(n.status));
      const closedNCRs = myNCRs.filter(n => ['CLOSED', 'NCR2_COMPLETED'].includes(n.status));
      const today = new Date();
      const overdue = openNCRs.filter(n => n.dueDate && new Date(n.dueDate) < today);

      setAssignedNCRs(allNCRsSorted);
      setPendingNcrReviews(pendingReview);
      setStats(prev => ({
        ...prev,
        openNCRs: openNCRs.length,
        overdueNCRs: overdue.length,
        resolvedNCRs: inProgressNCRs.length + closedNCRs.length,
      }));
      return myNCRs;
    } catch (error) {
      console.error('Error in fetchNCRData:', error);
      addToast('Failed to load NCR data', 'error');
      return [];
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      await Promise.all([fetchAuditsWithResponses(), fetchNCRData()]);
    } catch (error) {
      console.error('Error fetching auditee data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
      fetchAllData();
      fetchAllUsers();
      const interval = setInterval(fetchAllData, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const filteredAudits = completedAuditsForReview.filter(audit =>
    !searchQuery ||
    audit.auditType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    audit.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    audit.auditorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="p-8 text-center shadow-lg backdrop-blur-xl bg-white/50 rounded-2xl">
          <div className="w-12 h-12 mx-auto border-2 border-gray-200 rounded-full animate-spin border-t-blue-600"></div>
          <p className="mt-4 text-sm font-medium text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
              <p className="mt-1 text-sm text-gray-500">Review and approve individual audit forms</p>
            </div>
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition-all border shadow-md backdrop-blur-xl bg-white/50 rounded-xl hover:bg-white/80 disabled:opacity-50 border-white/30"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard title="Pending Forms" value={stats.pendingReview} icon={<FiClock size={20} className="text-amber-600" />} color="amber" delay={0.05} />
          <StatCard title="Approved Forms" value={stats.approvedAudits} icon={<FiCheckCircle size={20} className="text-emerald-600" />} color="green" delay={0.1} />
          <StatCard title="Rejected Forms" value={stats.rejectedAudits} icon={<FiAlertCircle size={20} className="text-red-600" />} color="red" delay={0.15} />
          <StatCard title="Open NCRs" value={stats.openNCRs} icon={<FiAlertCircle size={20} className="text-purple-600" />} color="purple" delay={0.2} />
          <StatCard title="Overdue NCRs" value={stats.overdueNCRs} icon={<FiClock size={20} className="text-red-600" />} color="red" delay={0.25} />
          <StatCard title="Resolved NCRs" value={stats.resolvedNCRs} icon={<FiCheckCircle size={20} className="text-teal-600" />} color="teal" delay={0.3} />
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-1 p-1 border shadow-md backdrop-blur-xl bg-white/50 rounded-2xl border-white/30">
              <button
                onClick={() => setActiveTab('my-audits')}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === 'my-audits'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg backdrop-blur-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <FiFileText className="w-4 h-4" />
                Audit Forms
                <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${activeTab === 'my-audits' ? 'bg-white/20 text-white' : 'bg-white/50 text-gray-600'}`}>
                  {completedAuditsForReview.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('ncr-pending')}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === 'ncr-pending'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg backdrop-blur-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <FiAlertCircle className="w-4 h-4" />
                NCRs Awaiting
                {pendingNcrReviews.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                    {pendingNcrReviews.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('my-ncrs')}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === 'my-ncrs'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg backdrop-blur-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <FiTrendingUp className="w-4 h-4" />
                My NCRs
                <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${activeTab === 'my-ncrs' ? 'bg-white/20 text-white' : 'bg-white/50 text-gray-600'}`}>
                  {assignedNCRs.length}
                </span>
              </button>
            </div>

            {activeTab === 'my-audits' && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <FiSearch className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" size={16} />
                  <input
                    type="text"
                    placeholder="Search audits..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 py-2 pl-10 pr-3 text-sm border backdrop-blur-xl bg-white/50 border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-1 p-1 border backdrop-blur-xl bg-white/50 rounded-xl border-white/30">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View">
                    <FiGrid size={16} />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="List View">
                    <FiList size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'my-audits' && (
              completedAuditsForReview.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 text-center border shadow-lg backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
                  <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-blue-400 to-blue-600">
                    <FiFileText className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">No audit forms available</p>
                  <p className="mt-1 text-sm text-gray-400">When audits are completed, forms will appear here for review</p>
                </motion.div>
              ) : viewMode === 'grid' ? (
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAudits.map((audit) => (
                    <AuditCard
                      key={audit.id}
                      audit={audit}
                      onViewReport={handleViewReport}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      formDetails={audit.formDetails}
                      totalForms={audit.totalForms}
                      completedForms={audit.completedForms}
                      onOpenForum={openAuditForum}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {filteredAudits.map((audit) => (
                    <AuditListItem
                      key={audit.id}
                      audit={audit}
                      onViewReport={handleViewReport}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      formDetails={audit.formDetails}
                      totalForms={audit.totalForms}
                      completedForms={audit.completedForms}
                      onOpenForum={openAuditForum}
                    />
                  ))}
                </motion.div>
              )
            )}

            {activeTab === 'ncr-pending' && (
              <NcrPendingList
                key="ncr-pending"
                pendingNcrAudits={pendingNcrReviews}
                onRaise={handleNcrReview}
              />
            )}

            {activeTab === 'my-ncrs' && (
              <motion.div
                key="my-ncrs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border shadow-lg backdrop-blur-xl bg-white/90 rounded-2xl border-white/30"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                  <div>
                    <p className="text-base font-semibold text-gray-800">All Assigned NCRs</p>
                    <p className="text-xs text-gray-500 mt-0.5">Nonconformity reports assigned to you</p>
                  </div>
                  {assignedNCRs.length > 0 && (
                    <span className="px-3 py-1 text-sm font-semibold text-blue-700 backdrop-blur-sm bg-blue-100/80 rounded-xl">{assignedNCRs.length} Total</span>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase border-b bg-gray-50/50 backdrop-blur-sm border-white/20">
                  <div className="col-span-3 md:col-span-2">NCR Number</div>
                  <div className="col-span-3 md:col-span-2">Due Date</div>
                  <div className="col-span-3 md:col-span-2">Status</div>
                  <div className="col-span-3 md:col-span-6">Action</div>
                </div>

                <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100/50">
                  {assignedNCRs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex items-center justify-center w-16 h-16 mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-purple-400 to-purple-600">
                        <FiAlertCircle className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-lg font-medium text-gray-700">No NCRs assigned</p>
                      <p className="mt-1 text-sm text-gray-400">When NCRs are raised against you, they will appear here</p>
                    </div>
                  ) : (
                    assignedNCRs.map((ncr) => (
                      <div key={ncr.id} className="grid items-center grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-white/30">
                        <div className="col-span-3 md:col-span-2">
                          <p className="font-mono text-sm font-semibold text-gray-900 truncate" title={ncr.ncrNumber || `NCR #${ncr.id}`}>
                            {ncr.ncrNumber || `NCR #${ncr.id}`}
                          </p>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <p className="text-sm text-gray-600">
                            {ncr.dueDate ? new Date(ncr.dueDate).toLocaleDateString('en-GB') : '—'}
                          </p>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <NcrStatusBadge status={ncr.status} />
                        </div>
                        <div className="flex justify-end col-span-3 gap-2 md:col-span-6">
                          {/* NCR Forum button — always visible */}
                          <button
                            onClick={() => openNCRForum(ncr)}
                            className="p-2 text-purple-600 transition-all rounded-xl hover:text-purple-900 hover:bg-purple-100/50"
                            title="Open NCR Discussion Forum"
                          >
                            <MessageCircle size={18} />
                          </button>

                          {/* 8D Forum button — only for 8D-related NCRs */}
                          {is8DRelated(ncr) && (
                            <button
                              onClick={() => open8DForum(ncr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition-all rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                              title="Open 8D Team Discussion"
                            >
                              <MessageCircle size={13} />
                              8D Forum
                            </button>
                          )}

                          {ncr.status === 'READY_FOR_NCR2' && (
                            <Link
                              to={`/form8?id=${ncr.id}&type=ncr2`}
                              className="px-3 py-2 text-xs font-semibold text-white transition-all bg-violet-600 rounded-xl hover:bg-violet-700"
                              title="Fill NCR2 corrective action"
                            >
                              Fill NCR2
                            </Link>
                          )}
                          <Link to={`/ncr-view/${ncr.id}`} className="p-2 text-blue-600 transition-all rounded-xl hover:text-blue-900 hover:bg-blue-100/50" title="View Details">
                            <FiEye size={18} />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Audit Forum Modal */}
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
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedAuditForForum(null);
            setSelectedFormForForum(null);
          }}
          currentUser={user}
          allUsers={allUsersList}
          memberEmails={selectedAuditForForum.memberEmails || []}
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
          memberEmails={selectedNCRForForum.memberEmails || []}
          isOpen={showNCRForumModal}
          onClose={() => {
            setShowNCRForumModal(false);
            setSelectedNCRForForum(null);
          }}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}

      {/* 8D Forum Drawer */}
      <Drawer
        isOpen={show8DForumDrawer}
        onClose={() => {
          setShow8DForumDrawer(false);
          setSelected8DNCR(null);
          setEightDTeamMembers([]);
        }}
        title="8D Team Discussion"
        showHeader={false}
        className="w-full sm:w-[50vw]"
      >
        {selected8DNCR && (
          <div className="h-full">
            {loadingTeamMembers ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Loading team members...</span>
              </div>
            ) : (
              <ForumThreadView
                groupId={`8D-NCR-${selected8DNCR.ncrNumber}`}
                groupName={`8D Discussion – NCR #${selected8DNCR.ncrNumber}`}
                isInDrawer={true}
                setForumDrawerOpen={setShow8DForumDrawer}
                username={user?.email || user?.username}
                currentUser={user}
                allUsers={allUsersList}
                memberEmails={eightDTeamMembers}
                onBack={() => setShow8DForumDrawer(false)}
              />
            )}
            
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AuditeeDashboard;