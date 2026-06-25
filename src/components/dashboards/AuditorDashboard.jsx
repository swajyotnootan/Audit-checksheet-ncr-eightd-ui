import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { ncrAPI } from '../services/api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    FileText, Clock, CheckCircle, AlertCircle, Eye, Edit, Search, Calendar, ArrowRight,
    Building, UserCheck, Users, Play, XCircle, RefreshCw, Calendar as CalendarIcon,
    AlertTriangle, Send, MessageSquare, Grid3x3, List, X, ChevronDown, ChevronUp,
    Plus, MessageCircle, TrendingUp, Layers
} from 'lucide-react';
import axios from 'axios';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import YearFilter from '../../components/common/YearFilter';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';
const TIME_OPTIONS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
];

// ============================================================================
// TIME STATUS HELPER (Fixes UTC vs IST issue)
// ============================================================================

const parseTime = (timeStr) => {
    if (!timeStr) return { hours: 9, minutes: 0 };
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return { hours: 9, minutes: 0 };
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
};

const getCorrectTimeStatus = (audit, backendStatus) => {
    if (!audit) return backendStatus;
    
    // Don't override if already completed or has pending requests
    if (audit.allFormsCompleted) return 'COMPLETED';
    if (audit.rescheduleRequested || audit.extensionRequested) return backendStatus;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Handle date range audits
    const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
    if (isDateRange) {
        const fromDate = new Date(audit.fromDate);
        const toDate = new Date(audit.toDate);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);
        
        if (today >= fromDate && today <= toDate) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const startTime = parseTime(audit.startTime);
            const endTime = parseTime(audit.endTime);
            const startMinutes = startTime.hours * 60 + startTime.minutes;
            const endMinutes = endTime.hours * 60 + endTime.minutes;
            
            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                return 'ACTIVE';
            } else if (currentMinutes < startMinutes) {
                return 'UPCOMING';
            } else {
                return 'EXPIRED';
            }
        } else if (today < fromDate) {
            return 'UPCOMING';
        } else {
            return 'EXPIRED';
        }
    }
    
    // Single day audit
    const scheduleDate = audit.scheduledDate ? new Date(audit.scheduledDate) : null;
    if (!scheduleDate) return backendStatus;
    scheduleDate.setHours(0, 0, 0, 0);
    
    // If not today, use backend status
    if (scheduleDate.getTime() !== today.getTime()) return backendStatus;
    
    // Same day - check time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startTime = parseTime(audit.startTime);
    const endTime = parseTime(audit.endTime);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return 'ACTIVE';
    } else if (currentMinutes < startMinutes) {
        return 'UPCOMING';
    } else {
        return 'EXPIRED';
    }
};

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
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
.animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
.card-hover { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.card-hover:hover { transform: translateY(-6px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
.stat-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
`;

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================
const Sidebar = ({ activeView, setActiveView, isOpen, pendingNcrCount, myNcrCount }) => {
    const menuItems = [
        { id: 'my-audits', label: 'My Audits', icon: <FileText className="w-5 h-5" /> },
        { id: 'ncr-pending', label: 'NCR Pending', icon: <AlertTriangle className="w-5 h-5" />, badge: pendingNcrCount },
        { id: 'ncr-list', label: 'My NCRs', icon: <TrendingUp className="w-5 h-5" />, badge: myNcrCount },
    ];

    return (
        <aside className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 shadow-md transition-all duration-500 ease-out overflow-hidden flex flex-col ${isOpen ? 'w-64' : 'w-0 border-r-0'}`}>
            <div className="flex-shrink-0 p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl" style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)` }}>
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className={`${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300`}>
                        <h2 className="text-base font-bold leading-tight text-slate-800">Auditor</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Dashboard Console</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative animate-fadeInUp ${activeView === item.id ? 'text-white font-semibold shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                        style={{
                            animationDelay: `${index * 0.1}s`,
                            ...(activeView === item.id ? { background: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' } : {})
                        }}
                    >
                        <div className={`flex-shrink-0 ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>{item.icon}</div>
                        <span className={`whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 text-sm`}>{item.label}</span>
                        {item.badge > 0 && isOpen && (
                            <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{item.badge}</span>
                        )}
                    </button>
                ))}
            </nav>
            <div className="flex-shrink-0 p-4 border-t border-slate-100">
                <div className="p-4 border rounded-xl" style={{ background: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                    <p className="text-xs font-semibold" style={{ color: NAVBAR_COLORS.dark }}>Need Help?</p>
                    <p className="mt-1 text-xs" style={{ color: NAVBAR_COLORS.secondary }}>Contact support team</p>
                </div>
            </div>
        </aside>
    );
};

// ============================================================================
// STAT CARD (Clean Professional Look)
// ============================================================================
const StatCard = ({ title, value, icon, delay = 0 }) => {
    return (
        <div className="p-6 bg-white border shadow-sm stat-card border-slate-200 rounded-2xl animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                    <div style={{ color: NAVBAR_COLORS.primary }}>{icon}</div>
                </div>
            </div>
            <p className="mb-1 text-3xl font-bold tracking-tight text-slate-800">{value}</p>
            <p className="text-xs font-medium tracking-wide uppercase text-slate-500">{title}</p>
        </div>
    );
};

// ============================================================================
// HELPERS (Preserved exactly)
// ============================================================================
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
    if (auditType.includes('5s') || auditType.includes('five_s')) return `/fives-view`;
    if (auditType.includes('process') || auditType.includes('manufacturing')) return `/manufacturing-view`;
    if (auditType.includes('iatf') || auditType.includes('system')) return `/iatf-view`;
    if (auditType.includes('product')) return `/product-view`;
    if (auditType.includes('iso')) return `/iso-view`;
    if (auditType.includes('safety') || auditType.includes('safe')) return `/safety-view`;
    if (auditType.includes('poka') || auditType.includes('yoke')) return `/pokayoke-view`;
    return `/fives-view`;
};

const isAuditExpired = (audit) => {
    if (!audit || audit.status === 'COMPLETED') return false;
    const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
    if (isDateRange) {
        const toDate = new Date(audit.toDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        if (toDate < today) return true;
        if (toDate.toDateString() === today.toDateString() && audit.endTime) {
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
            if (currentTimeMinutes > endTimeMinutes) return true;
        }
        return false;
    }
    if (!audit?.scheduledDate) return false;
    const scheduleDate = new Date(audit.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduleDate.setHours(0, 0, 0, 0);
    if (scheduleDate < today) return true;
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
        if (currentTimeMinutes > endTimeMinutes) return true;
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
    p.append('evidence', item.findings.map((f) => `${f.questionId}: ${f.checkpoint}\nStatus: ${f.severity}\nEvidence: ${f.observation}`).join('\n'));
    p.append('statement', item.findings.map((f) => `${f.severity} identified for ${f.questionId}: ${f.checkpoint}`).join('\n'));
    return p.toString();
};

// ============================================================================
// AUDIT CARD (Clean Professional Look)
// ============================================================================
 const AuditCard = ({
    audit, timeStatus, canStart,
    onRequestReschedule, onRequestExtension,
    onViewForm, onViewReport,
    hasFormData, totalForms, completedForms, pendingForms, formDetails,
    isRescheduleRequested, isExtensionRequested , onOpenForum
}) => {
    const [expanded, setExpanded] = useState(false);
    
    // ✅ FIX: Override timeStatus with correct time
    const displayTimeStatus = getCorrectTimeStatus(audit, timeStatus);
    
    // ✅ Use displayTimeStatus instead of timeStatus
    const isExpired = displayTimeStatus === 'EXPIRED' || isAuditExpired(audit);
    const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
    const isMultiForm = totalForms > 1;
    const allFormsCompleted = completedForms === totalForms && totalForms > 0;
    const hasPendingForms = pendingForms > 0;
    const progressPercent = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

    const hasStartedWork = hasFormData && completedForms > 0;
    const isOverdueNoWork = isExpired && !hasStartedWork;
    const isOverduePartialWork = isExpired && hasStartedWork && hasPendingForms;

    const hasPendingReschedule = isRescheduleRequested === true;
    const hasPendingExtension = isExtensionRequested === true;

    const showRescheduleButton = isOverdueNoWork && !hasPendingReschedule;
    const showExtensionButton = isOverduePartialWork && !hasPendingExtension;

    const getStatusBadge = () => {
        const baseClass = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border";
        if (allFormsCompleted) return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle size={12} /> All Completed</span>;
        if (hasPendingReschedule) return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}><Clock size={12} /> Reschedule Pending</span>;
        if (hasPendingExtension) return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}><Clock size={12} /> Extension Pending</span>;
        if (isOverduePartialWork) return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}><AlertCircle size={12} /> Overdue (In Progress)</span>;
        if (isOverdueNoWork) return <span className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200`}><AlertCircle size={12} /> Overdue (Not Started)</span>;
        if (hasFormData && hasPendingForms) return <span className={`${baseClass} bg-indigo-50 text-indigo-700 border-indigo-200`}><Edit size={12} /> In Progress</span>;
        if (audit.status === 'IN_PROGRESS') return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}><Play size={12} /> In Progress</span>;
        if (displayTimeStatus  === 'UPCOMING') return <span className={`${baseClass} bg-slate-50 text-slate-700 border-slate-200`}><Calendar size={12} /> Upcoming</span>;
        if (displayTimeStatus  === 'ACTIVE' && canStart) return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}><Play size={12} /> Ready to Start</span>;
        return <span className={`${baseClass} bg-slate-50 text-slate-700 border-slate-200`}><Calendar size={12} /> Scheduled</span>;
    };

    const nextPendingForm = formDetails?.find(f => !f.completed);
    const completedForm = formDetails?.find(f => f.completed);

    const getCardBgColor = () => {
        if (allFormsCompleted) return 'bg-white';
        if (hasPendingReschedule || hasPendingExtension) return 'bg-blue-50/50';
        if (isOverduePartialWork) return 'bg-amber-50/50';
        if (isOverdueNoWork) return 'bg-rose-50/50';
        return 'bg-white';
    };

    return (
        <div className={`transition-all duration-300 border shadow-sm rounded-2xl card-hover ${getCardBgColor()} border-slate-200`}>
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                        {getStatusBadge()}
                        {isMultiForm && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {completedForms}/{totalForms} Forms
                            </span>
                        )}
                        {audit.auditNumber && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-50 text-slate-600 border border-slate-200">
                                #{audit.auditNumber}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {audit.originalScheduledDate && (
                            <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-400 rounded-md bg-slate-100 line-through">
                                <CalendarIcon size={9} />
                                <span>Was: {audit.originalScheduledDate}</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border ${audit.originalScheduledDate ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                            <CalendarIcon size={10} />
                            {isDateRange ? `${audit.fromDate} → ${audit.toDate}` : audit.scheduledDate}
                            {audit.originalScheduledDate && <span className="ml-1 font-medium">(Rescheduled)</span>}
                        </div>
                    </div>
                </div>

                <h3 className="mb-2 text-base font-bold text-slate-800">
                    {audit.auditType || 'Audit'} - {audit.department || 'General'}
                </h3>

                <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                        <Clock size={10} className="text-slate-400" />
                        <span>{audit.startTime} - {audit.endTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                        <UserCheck size={10} className="text-slate-400" />
                        <span>{audit.auditeeName || 'TBD'}</span>
                    </div>
                    {audit.coAuditorNames && audit.coAuditorNames.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md">
                            <Users size={10} className="text-indigo-500" />
                            <span className="font-medium text-indigo-700">Co-auditors: {audit.coAuditorNames.join(', ')}</span>
                        </div>
                    )}
                </div>

                {/* Warning Messages */}
                {isOverdueNoWork && !hasPendingReschedule && (
                    <div className="flex items-center gap-2 p-3 mb-4 text-xs border text-rose-700 bg-rose-50 rounded-xl border-rose-200">
                        <AlertCircle size={14} />
                        <span className="flex-1">This audit hasn't started and is overdue! Please reschedule to begin.</span>
                    </div>
                )}
                {isOverduePartialWork && !hasPendingExtension && (
                    <div className="flex items-center gap-2 p-3 mb-4 text-xs border text-amber-700 bg-amber-50 rounded-xl border-amber-200">
                        <AlertCircle size={14} />
                        <span className="flex-1">You've completed {completedForms} of {totalForms} forms. Please request an extension.</span>
                    </div>
                )}
                {(hasPendingExtension || hasPendingReschedule) && (
                    <div className="flex items-center gap-2 p-3 mb-4 text-xs text-blue-700 border border-blue-200 bg-blue-50 rounded-xl">
                        <Clock size={14} className="animate-pulse" />
                        <span className="flex-1">Your {hasPendingExtension ? 'extension' : 'reschedule'} request is awaiting review by the coordinator.</span>
                    </div>
                )}

                {/* Progress Bar */}
                {isMultiForm && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-slate-500">Progress</span>
                            <span className="text-[10px] font-semibold text-blue-600">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                    hasPendingReschedule || hasPendingExtension ? 'bg-blue-500' :
                                    isOverduePartialWork ? 'bg-amber-500' :
                                    isOverdueNoWork ? 'bg-rose-500' :
                                    'bg-emerald-500'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Individual Forms */}
                {isMultiForm && formDetails?.length > 0 && (
                    <div className="mb-4">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium transition-all border rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200"
                        >
                            <span>Forms ({completedForms}/{totalForms})</span>
                            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {expanded && (
                            <div className="mt-2 space-y-2">
                                {formDetails.map((form, idx) => {
                                    const isFormOverdue = isExpired && !form.completed;
                                    const canFill = (displayTimeStatus === 'ACTIVE' || canStart) && !hasPendingReschedule && !hasPendingExtension && !isOverdueNoWork && !isOverduePartialWork;
                                    return (
                                        <div key={idx} className={`flex items-center justify-between p-3 text-xs border rounded-lg ${
                                            hasPendingReschedule || hasPendingExtension ? 'bg-blue-50/50 border-blue-200' :
                                            isFormOverdue && isOverduePartialWork ? 'bg-amber-50/50 border-amber-200' :
                                            isFormOverdue && isOverdueNoWork ? 'bg-rose-50/50 border-rose-200' :
                                            'bg-slate-50/50 border-slate-200'
                                        }`}>
                                            <div className="flex items-center min-w-0 gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                    form.completed ? 'bg-emerald-500' :
                                                    (hasPendingReschedule || hasPendingExtension) ? 'bg-blue-500' :
                                                    (isFormOverdue && isOverduePartialWork) ? 'bg-amber-500' :
                                                    (isFormOverdue && isOverdueNoWork) ? 'bg-rose-500' :
                                                    'bg-slate-400'
                                                }`} />
                                                <span className="font-medium truncate text-slate-700">{form.processName || form.name}</span>
                                            </div>
                                            {form.completed ? (
                                                <button
                                                    onClick={() => onViewReport(form.responseId, audit, form)}
                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-all border border-blue-200"
                                                >
                                                    <Eye size={10} /> View
                                                </button>
                                            ) : (
                                                <div className="flex gap-1">
                                                    {(hasPendingReschedule || hasPendingExtension) ? (
                                                        <button disabled className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-400 bg-slate-100 rounded-md cursor-not-allowed border border-slate-200">
                                                            <Clock size={10} /> Pending
                                                        </button>
                                                    ) : isOverduePartialWork ? (
                                                        <button
                                                            onClick={() => onRequestExtension(audit, form)}
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 transition-all border border-amber-200"
                                                        >
                                                            <Clock size={10} /> Extend
                                                        </button>
                                                    ) : isOverdueNoWork ? (
                                                        <button
                                                            onClick={() => onRequestReschedule(audit)}
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-rose-700 bg-rose-50 rounded-md hover:bg-rose-100 transition-all border border-rose-200"
                                                        >
                                                            <Calendar size={10} /> Reschedule
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => onViewForm(audit, form)}
                                                            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all border ${
                                                                canFill
                                                                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer border-emerald-200'
                                                                    : 'text-slate-400 bg-slate-100 cursor-not-allowed border-slate-200'
                                                            }`}
                                                            disabled={!canFill}
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

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                        onClick={() => onOpenForum(audit, null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1 border border-slate-200"
                        title="Open Discussion Forum"
                    >
                        <MessageCircle size={12} /> Forum
                    </button>

                    {showRescheduleButton && !hasPendingReschedule && !hasPendingExtension && (
                        <button
                            onClick={() => onRequestReschedule(audit)}
                            className="px-4 py-1.5 text-sm font-medium text-white transition-all shadow-sm bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            <Calendar size={14} className="inline mr-1" /> Reschedule
                        </button>
                    )}

                    {showExtensionButton && !hasPendingReschedule && !hasPendingExtension && (
                        <button
                            onClick={() => onRequestExtension(audit)}
                            className="px-4 py-1.5 text-sm font-medium text-white transition-all shadow-sm bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            <Clock size={14} className="inline mr-1" /> Extend
                        </button>
                    )}

                    {(hasPendingReschedule || hasPendingExtension) && (
                        <div className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-200">
                            <Clock size={14} className="animate-pulse" /> Awaiting Review
                        </div>
                    )}

                    {!hasPendingReschedule && !hasPendingExtension && !isExpired && !allFormsCompleted && hasPendingForms && nextPendingForm && (
                        <button
                            onClick={() => onViewForm(audit, nextPendingForm)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-200"
                            disabled={displayTimeStatus !== 'ACTIVE' && !canStart}
                        >
                            Fill Next ({pendingForms})
                        </button>
                    )}

                    {allFormsCompleted && completedForm && (
                        <button
                            onClick={() => onViewReport(completedForm.responseId, audit, completedForm)}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200"
                        >
                            <Eye size={12} className="inline mr-1" /> View Report
                        </button>
                    )}

                    {!hasPendingReschedule && !hasPendingExtension && !isMultiForm && hasFormData && !allFormsCompleted && !isExpired && (
                        <button
                            onClick={() => onViewForm(audit, formDetails?.[0])}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-200"
                        >
                            Continue
                        </button>
                    )}

                    {!hasPendingReschedule && !hasPendingExtension && !hasFormData && !isExpired && (
                        <button
                            onClick={() => { const first = formDetails?.[0]; if (first) onViewForm(audit, first); }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                            disabled={displayTimeStatus !== 'ACTIVE' && !canStart}
                        >
                            Start Audit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// AUDIT LIST ITEM (For List View - Compact & Horizontal)
// ============================================================================
const AuditListItem = ({
    item, handleViewForm, handleViewReport, openAuditForum, 
    setShowRescheduleModal, setSelectedAudit, setSelectedForm, setShowExtensionModal
}) => {
    const audit = item.schedule;
    const displayTimeStatus = getCorrectTimeStatus(audit, item.timeStatus);
    const canStart = item.canStart;
    const isExpired = displayTimeStatus === 'EXPIRED' || isAuditExpired(audit);
    const isDateRange = audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
    const isMultiForm = audit.totalForms > 1;
    const allFormsCompleted = audit.allFormsCompleted;
    const hasStartedWork = audit.hasFormData && audit.completedForms > 0;
    const isOverdueNoWork = isExpired && !hasStartedWork;
    const isOverduePartialWork = isExpired && hasStartedWork && audit.pendingForms > 0;
    const hasPendingReschedule = audit.rescheduleRequested;
    const hasPendingExtension = audit.extensionRequested;
    
    const nextPendingForm = audit.formDetails?.find(f => !f.completed);
    const completedForm = audit.formDetails?.find(f => f.completed);

    const getStatusBadge = () => {
        const baseClass = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border";
        if (allFormsCompleted) return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle size={12} /> Completed</span>;
        if (hasPendingReschedule) return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}><Clock size={12} /> Reschedule Pending</span>;
        if (hasPendingExtension) return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}><Clock size={12} /> Extension Pending</span>;
        if (isOverduePartialWork) return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}><AlertCircle size={12} /> Overdue (In Progress)</span>;
        if (isOverdueNoWork) return <span className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200`}><AlertCircle size={12} /> Overdue</span>;
        if (audit.hasFormData && audit.pendingForms > 0) return <span className={`${baseClass} bg-indigo-50 text-indigo-700 border-indigo-200`}><Edit size={12} /> In Progress</span>;
        if (displayTimeStatus  === 'UPCOMING') return <span className={`${baseClass} bg-slate-50 text-slate-700 border-slate-200`}><Calendar size={12} /> Upcoming</span>;
        if (displayTimeStatus  === 'ACTIVE' && canStart) return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}><Play size={12} /> Ready</span>;
        return <span className={`${baseClass} bg-slate-50 text-slate-700 border-slate-200`}><Calendar size={12} /> Scheduled</span>;
    };

    const getRowBg = () => {
        if (hasPendingReschedule || hasPendingExtension) return 'bg-blue-50/30';
        if (isOverduePartialWork) return 'bg-amber-50/30';
        if (isOverdueNoWork) return 'bg-rose-50/30';
        return 'bg-white';
    };

    return (
        <div className={`p-5 border shadow-sm rounded-2xl card-hover transition-all duration-300 border-slate-200 ${getRowBg()} animate-fadeInUp`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left Side: Info */}
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge()}
                        {isMultiForm && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {audit.completedForms}/{audit.totalForms} Forms
                            </span>
                        )}
                        {audit.auditNumber && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-50 text-slate-600 border border-slate-200">
                                #{audit.auditNumber}
                            </span>
                        )}
                    </div>
                    
                    <h3 className="text-base font-bold truncate text-slate-800">
                        {audit.auditType || 'Audit'} - {audit.department || 'General'}
                    </h3>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                            <CalendarIcon size={10} className="text-slate-400" />
                            <span>{isDateRange ? `${audit.fromDate} → ${audit.toDate}` : audit.scheduledDate}</span>
                            {audit.originalScheduledDate && <span className="ml-1 line-through text-rose-500">Was: {audit.originalScheduledDate}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                            <Clock size={10} className="text-slate-400" />
                            <span>{audit.startTime} - {audit.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                            <UserCheck size={10} className="text-slate-400" />
                            <span>{audit.auditeeName || 'TBD'}</span>
                        </div>
                        {audit.coAuditorNames && audit.coAuditorNames.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md">
                                <Users size={10} className="text-indigo-500" />
                                <span className="font-medium text-indigo-700">Co-auditors: {audit.coAuditorNames.join(', ')}</span>
                            </div>
                        )}
                    </div>

                    {/* Warnings */}
                    {isOverdueNoWork && !hasPendingReschedule && (
                        <div className="flex items-center gap-2 text-xs text-rose-700">
                            <AlertCircle size={12} />
                            <span>Audit hasn't started and is overdue. Please reschedule.</span>
                        </div>
                    )}
                    {isOverduePartialWork && !hasPendingExtension && (
                        <div className="flex items-center gap-2 text-xs text-amber-700">
                            <AlertCircle size={12} />
                            <span>Completed {audit.completedForms}/{audit.totalForms} forms. Please request an extension.</span>
                        </div>
                    )}
                    {(hasPendingReschedule || hasPendingExtension) && (
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                            <Clock size={12} className="animate-pulse" />
                            <span>{hasPendingReschedule ? 'Reschedule' : 'Extension'} request is awaiting review.</span>
                        </div>
                    )}
                </div>

                {/* Right Side: Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => openAuditForum(audit, null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1 border border-slate-200"
                        title="Open Discussion Forum"
                    >
                        <MessageCircle size={12} /> Forum
                    </button>

                    {isOverdueNoWork && !hasPendingReschedule && !hasPendingExtension && (
                        <button
                            onClick={() => { setSelectedAudit(audit); setSelectedForm(null); setShowRescheduleModal(true); }}
                            className="px-4 py-1.5 text-sm font-medium text-white transition-all shadow-sm bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            <Calendar size={14} className="inline mr-1" /> Reschedule
                        </button>
                    )}

                    {isOverduePartialWork && !hasPendingReschedule && !hasPendingExtension && (
                        <button
                            onClick={() => { setSelectedAudit(audit); setSelectedForm(null); setShowExtensionModal(true); }}
                            className="px-4 py-1.5 text-sm font-medium text-white transition-all shadow-sm bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            <Clock size={14} className="inline mr-1" /> Extend
                        </button>
                    )}

                    {(hasPendingReschedule || hasPendingExtension) && (
                        <div className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-200">
                            <Clock size={14} className="animate-pulse" /> Awaiting Review
                        </div>
                    )}

                    {!hasPendingReschedule && !hasPendingExtension && !isExpired && !allFormsCompleted && audit.pendingForms > 0 && nextPendingForm && (
                        <button
                            onClick={() => handleViewForm(audit, nextPendingForm)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-200"
                            disabled={displayTimeStatus !== 'ACTIVE' && !canStart}
                        >
                            Fill Next ({audit.pendingForms})
                        </button>
                    )}

                    {allFormsCompleted && completedForm && (
                        <button
                            onClick={() => handleViewReport(completedForm.responseId, audit, completedForm)}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200"
                        >
                            <Eye size={12} className="inline mr-1" /> View Report
                        </button>
                    )}

                    {!hasPendingReschedule && !hasPendingExtension && !isMultiForm && audit.hasFormData && !allFormsCompleted && !isExpired && (
                        <button
                            onClick={() => handleViewForm(audit, audit.formDetails?.[0])}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-200"
                        >
                            Continue
                        </button>
                    )}

                    {!hasPendingReschedule && !hasPendingExtension && !audit.hasFormData && !isExpired && (
                        <button
                            onClick={() => { const first = audit.formDetails?.[0]; if (first) handleViewForm(audit, first); }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                            disabled={displayTimeStatus !== 'ACTIVE' && !canStart}
                        >
                            Start Audit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// NCR PENDING LIST (Clean Professional Look)
// ============================================================================
const NcrPendingList = ({ pendingNcrAudits, onRaise }) => {
    if (pendingNcrAudits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white border shadow-sm rounded-2xl border-slate-200">
                <div className="flex items-center justify-center w-16 h-16 mb-4 shadow-md rounded-2xl bg-emerald-50">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-lg font-medium text-slate-700">No Pending NCRs</p>
                <p className="mt-1 text-sm text-slate-500">All audits are clear — no nonconformities to raise.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <p className="text-sm font-bold text-slate-800">Audits with NCR Findings</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                    {pendingNcrAudits.length} pending
                </span>
            </div>
            <div className="divide-y divide-slate-100">
                {pendingNcrAudits.map((item) => (
                    <div key={item.responseId} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-bold text-slate-900">{item.auditReportNumber}</p>
                            <p className="mt-0.5 text-xs text-slate-500 truncate">{item.formName} · {item.department}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.findings.slice(0, 3).map((f, i) => (
                                    <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                                        f.severity === 'Major NC' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        {f.severity} · {f.clause}
                                    </span>
                                ))}
                                {item.findings.length > 3 && (
                                    <span className="px-2 py-0.5 text-[10px] text-slate-600 bg-slate-100 rounded-md border border-slate-200">+{item.findings.length - 3} more</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => onRaise(item)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700"
                        >
                            <AlertCircle className="w-4 h-4" /> Raise NCR
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// NCR LIST TAB (Clean Professional Look)
// ============================================================================
const NcrListTab = ({ raisedNCRs, ncrLoading, navigate, onOpenForum, selectedYear }) => {
    if (ncrLoading) {
        return (
            <div className="flex items-center justify-center py-16 bg-white border shadow-sm rounded-2xl border-slate-200">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="ml-2 text-sm text-slate-500">Loading NCRs...</span>
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div>
                    <p className="text-sm font-bold text-slate-800">Your Raised NCRs</p>
                    <p className="text-xs text-slate-500 mt-0.5">All nonconformity reports you have created</p>
                </div>
                {raisedNCRs.length > 0 && (
                    <span className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{raisedNCRs.length} total</span>
                )}
            </div>
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b bg-slate-50 border-slate-100">
                <div className="col-span-4 md:col-span-3">NCR Number</div>
                <div className="col-span-4 md:col-span-3">Due Date</div>
                <div className="col-span-3 md:col-span-4">Status</div>
                <div className="col-span-1 text-right md:col-span-2">Action</div>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                {raisedNCRs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white">
                        <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-slate-100">
                            <AlertCircle className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">No NCRs raised yet</p>
                        <p className="max-w-xs mt-1 text-xs text-slate-500">Start by raising an NCR during your next audit.</p>
                    </div>
                ) : (
                    raisedNCRs.map((ncr) => (
                        <div key={ncr.id} className="grid items-center grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-slate-50">
                            <div className="col-span-4 md:col-span-3">
                                <p className="font-mono text-sm font-medium truncate text-slate-900" title={ncr.ncrNumber || `NCR #${ncr.id}`}>
                                    {ncr.ncrNumber || `NCR #${ncr.id}`}
                                </p>
                            </div>
                            <div className="col-span-4 md:col-span-3">
                                <p className="text-sm text-slate-600">
                                    {ncr.dueDate ? new Date(ncr.dueDate).toLocaleDateString('en-GB') : '—'}
                                </p>
                            </div>
                            <div className="col-span-3 md:col-span-4">
                                <NcrStatusBadge status={ncr.status} />
                            </div>
                            <div className="flex justify-end col-span-1 gap-1 md:col-span-2">
                                <button
                                    onClick={() => onOpenForum(ncr)}
                                    className="p-2 transition-all rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    title="Open Discussion Forum"
                                >
                                    <MessageCircle size={18} />
                                </button>
                                <Link
                                    to={`/ncr-view/${ncr.id}`}
                                    className="p-2 transition-all rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    title="View Details"
                                >
                                    <Eye size={18} />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const NcrStatusBadge = ({ status }) => {
    const config = {
        AWAITING_AUDITEE: { label: 'Awaiting Auditee', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        OPEN:             { label: 'Pending Approval',  className: 'bg-blue-50 text-blue-700 border-blue-200' },
        APPROVED:         { label: 'Approved',           className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        IN_PROGRESS:      { label: 'In Progress',        className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        REJECTED:         { label: 'Rejected',           className: 'bg-rose-50 text-rose-700 border-rose-200' },
        CLOSED:           { label: 'Closed',             className: 'bg-slate-50 text-slate-700 border-slate-200' },
    };
    const { label, className } = config[status] || { label: status, className: 'bg-slate-50 text-slate-700 border-slate-200' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${className}`}>
            {label}
        </span>
    );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function AuditorDashboard() {
    const location = useLocation();
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    
    const [showForumModal, setShowForumModal] = useState(false);
    const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
    const [selectedFormForForum, setSelectedFormForForum] = useState(null);
    const [allUsersList, setAllUsersList] = useState([]);
    
    const [showNCRForumModal, setShowNCRForumModal] = useState(false);
    const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);
    
    const [selectedYear, setSelectedYear] = useState(() => {
        const savedYear = localStorage.getItem('auditorSelectedYear');
        if (savedYear) return parseInt(savedYear);
        return new Date().getFullYear();
    });
    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        const handleToggle = () => setIsSidebarOpen(prev => !prev);
        window.addEventListener('toggle-auditor-sidebar', handleToggle);
        return () => window.removeEventListener('toggle-auditor-sidebar', handleToggle);
    }, []);

    const ncrStats = React.useMemo(() => ({
        total: raisedNCRs.length,
        awaiting: raisedNCRs.filter(n => n.status === 'AWAITING_AUDITEE').length,
        pending: raisedNCRs.filter(n => n.status === 'OPEN').length,
        inProgress: raisedNCRs.filter(n => n.status === 'IN_PROGRESS').length,
        closed: raisedNCRs.filter(n => n.status === 'CLOSED').length,
        rejected: raisedNCRs.filter(n => n.status === 'REJECTED').length,
    }), [raisedNCRs]);

    const handleViewReport = (responseId, audit, form) => {
        if (!responseId) { addToast('Report not found', 'error'); return; }
        const route = getViewRoute(audit, form);
        navigate(`${route}/${responseId}`, { state: { returnTo: '/auditor', tab: 'my-audits' } });
    };

    const getAvailableYears = () => {
        const years = new Set();
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 5; i <= currentYear + 5; i++) years.add(i);
        return Array.from(years).sort((a, b) => b - a);
    };

    const fetchRaisedNCRs = async (year = selectedYear) => {
        if (!user?.id) return;
        try {
            setNcrLoading(true);
            const data = await ncrAPI.getByAuditor(user.id);
            const filteredNCRs = (Array.isArray(data) ? data : []).filter(ncr => {
                const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
                if (ncrDate) return new Date(ncrDate).getFullYear() === year;
                return false;
            });
            setRaisedNCRs(filteredNCRs);
        } catch (error) {
            console.error('Error fetching raised NCRs:', error);
            addToast('Failed to load NCR list', 'error');
            setRaisedNCRs([]);
        } finally { setNcrLoading(false); }
    };

    const fetchAvailableFormsForDepartment = async (department) => {
        if (!department) return [];
        const deptUpper = department.toUpperCase().trim();
        if (deptUpper === 'SQA') {
            try {
                const res = await axios.get(`${API_BASE}/templates/iatf/by-department/SQA`, { withCredentials: true });
                return res.data || [];
            } catch (error) { return []; }
        }
        const isQualityDept = deptUpper.includes('QA') || deptUpper.includes('QC');
        if (!isQualityDept) {
            try {
                const res = await axios.get(`${API_BASE}/templates/iatf/by-department/${encodeURIComponent(department)}`, { withCredentials: true });
                return res.data || [];
            } catch { return []; }
        }
        try {
            const allFormsRes = await axios.get(`${API_BASE}/templates/type/IATF_16949`, { withCredentials: true });
            const allForms = allFormsRes.data || [];
            return allForms.filter(form => form.department === 'QA');
        } catch (error) { return []; }
    };

    const fetchSchedulesWithStatus = async (year = selectedYear) => {
        try {
            setLoading(true); setRefreshing(true);
            const [responsesRes, ncrRes, rescheduleRequestsRes, extensionRequestsRes] = await Promise.all([
                axios.get(`${API_BASE}/templates/responses/all`, { withCredentials: true }),
                axios.get(`${API_BASE}/ncr/all`, { withCredentials: true }),
                axios.get(`${API_BASE}/audit-schedule/reschedule-requests/auditor/${user?.id}`, { withCredentials: true }).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/audit-schedule/extension-requests/auditor/${user?.id}`, { withCredentials: true }).catch(() => ({ data: [] }))
            ]);

            const pendingRescheduleIds = new Set();
            (rescheduleRequestsRes.data || []).forEach(req => { if (req.status === 'PENDING') pendingRescheduleIds.add(req.scheduleId); });
            const pendingExtensionIds = new Set();
            (extensionRequestsRes.data || []).forEach(req => { if (req.status === 'PENDING') pendingExtensionIds.add(req.scheduleId); });

            setRescheduleRequestedMap(Object.fromEntries([...pendingRescheduleIds].map(id => [id, true])));
            setExtensionRequestedMap(Object.fromEntries([...pendingExtensionIds].map(id => [id, true])));

            const allResponses = responsesRes.data || [];
            const existingNcrAuditIds = new Set((ncrRes.data || []).map(n => Number(n.auditId)).filter(Boolean));
            
            const pendingNcrItems = allResponses
                .filter(r => Number(r.auditorId) === Number(user?.id))
                .map(r => {
                    const answers = parseResponseAnswers(r);
                    return {
                        responseId: r.id, auditReportNumber: getAuditReportNumber(answers, r),
                        formName: answers.formName || r.checkSheet?.name || 'Audit Form',
                        department: r.department || answers.department || 'Production',
                        shift: r.shift || answers.shift || 'Day',
                        auditeeId: r.auditeeId || answers.auditeeId, auditeeName: r.auditeeName || answers.auditeeName,
                        findings: getNcrFindingEntries(answers), createdAt: r.createdAt,
                    };
                })
                .filter(item => {
                    const itemYear = item.createdAt ? new Date(item.createdAt).getFullYear() : null;
                    return item.findings.length > 0 && !existingNcrAuditIds.has(Number(item.responseId)) && itemYear === year;
                });
            setPendingNcrAudits(pendingNcrItems);

            const responseMapByScheduleAndSheet = {};
            allResponses.forEach(r => {
                if (r.auditScheduleId) responseMapByScheduleAndSheet[`${r.auditScheduleId}_${r.checkSheet?.id}`] = r;
            });

            const schedulesRes = await axios.get(`${API_BASE}/audit-schedule/auditor/${user?.id}/schedules-with-status`, { withCredentials: true });
            let schedulesData = schedulesRes.data || [];

            if (year) {
                schedulesData = schedulesData.filter(item => {
                    const schedule = item.schedule;
                    if (!schedule) return false;
                    if (schedule.scheduledDate && new Date(schedule.scheduledDate).getFullYear() === year) return true;
                    if (schedule.fromDate && schedule.toDate) {
                        const fromYear = new Date(schedule.fromDate).getFullYear();
                        const toYear = new Date(schedule.toDate).getFullYear();
                        if (fromYear <= year && toYear >= year) return true;
                    }
                    return false;
                });
            }

            const approvedSchedulesData = schedulesData.filter(item => {
                const schedule = item.schedule;
                if (!schedule) return false;
                if (!schedule.scheduledDate) return schedule.approvalStatus === 'APPROVED';
                return schedule.detailedApprovalStatus === 'APPROVED' || schedule.approvalStatus === 'APPROVED';
            });

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
                        return { id: form.id, name: form.name, processName: form.processName, completed: !!existing, responseId: existing?.id };
                    });
                } else if (is5S) {
                    const existing = allResponses.find(r => r.auditScheduleId === scheduleId);
                    formDetails = [{ id: item.schedule?.checkSheet?.id || '5S', name: '5S Audit Checklist', processName: '5S Audit', completed: !!existing, responseId: existing?.id }];
                } else {
                    const existing = allResponses.find(r => r.auditScheduleId === scheduleId);
                    formDetails = [{ id: item.schedule?.checkSheet?.id || 1, name: item.schedule?.auditType || 'Audit Form', processName: item.schedule?.auditType, completed: !!existing, responseId: existing?.id }];
                }

                const totalForms = formDetails.length;
                const completedForms = formDetails.filter(f => f.completed).length;

                return {
                    ...item,
                    schedule: {
                        ...item.schedule,
                        hasFormData: completedForms > 0, totalForms, completedForms,
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

            const partiallyCompletedAudits = enhancedData.filter(s => s.schedule.hasFormData && !s.schedule.allFormsCompleted);
            const overdueNoWork = enhancedData.filter(s => {
    const status = getCorrectTimeStatus(s.schedule, s.timeStatus);
    const isExpired = status === 'EXPIRED' || isAuditExpired(s.schedule);
    const hasStartedWork = s.schedule.hasFormData && s.schedule.completedForms > 0;
    return isExpired && !hasStartedWork;
});

const overduePartialWork = enhancedData.filter(s => {
    const status = getCorrectTimeStatus(s.schedule, s.timeStatus);
    const isExpired = status === 'EXPIRED' || isAuditExpired(s.schedule);
    const hasStartedWork = s.schedule.hasFormData && s.schedule.completedForms > 0;
    const hasPending = s.schedule.pendingForms > 0;
    return isExpired && hasStartedWork && hasPending;
});

            setStats({
    upcoming: enhancedData.filter(s => {
        const status = getCorrectTimeStatus(s.schedule, s.timeStatus);
        return status === 'UPCOMING' && !s.schedule.hasFormData;
    }).length,
    active: enhancedData.filter(s => {
        const status = getCorrectTimeStatus(s.schedule, s.timeStatus);
        return status === 'ACTIVE' && s.canStart && !s.schedule.hasFormData;
    }).length,
    inProgress: enhancedData.filter(s => {
        const status = getCorrectTimeStatus(s.schedule, s.timeStatus);
        return s.schedule.hasFormData && !s.schedule.allFormsCompleted && status !== 'EXPIRED' && !isAuditExpired(s.schedule);
    }).length,
    expired: enhancedData.filter(s => {
        const status = getCorrectTimeStatus(s.schedule, s.timeStatus);
        return status === 'EXPIRED' && !s.schedule.hasFormData;
    }).length,
    partiallyCompleted: partiallyCompletedAudits.length,
    completed: enhancedData.filter(s => s.schedule.allFormsCompleted).length,
    overdueNoWork: overdueNoWork.length,
    overduePartialWork: overduePartialWork.length,
});
        } catch (error) {
            console.error('Error fetching schedules:', error);
            addToast('Failed to load schedules', 'error');
        } finally { setLoading(false); setRefreshing(false); }
    };

    const fetchAllUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
            setAllUsersList(response.data || []);
        } catch (error) { setAllUsersList([]); }
    };

    const openAuditForum = (audit, form = null) => {
        const forumId = audit.id ? `AUDIT-${audit.id}` : 'demo';
        const coAuditorEmails = [];
        if (audit.coAuditorIdList && audit.coAuditorIdList.length > 0) {
            audit.coAuditorIdList.forEach(coId => {
                const coUser = allUsersList.find(u => Number(u.id) === Number(coId));
                if (coUser?.email) coAuditorEmails.push(coUser.email);
            });
        }
        setSelectedAuditForForum({
            id: forumId, auditNumber: audit.auditNumber, auditType: audit.auditType, department: audit.department,
            status: audit.status, auditorId: user?.id, auditorName: user?.name, auditeeId: audit.auditeeId, auditeeName: audit.auditeeName,
            checkSheetId: form?.id, checkSheetName: form?.name, scheduledDate: audit.scheduledDate, fromDate: audit.fromDate, toDate: audit.toDate,
            startTime: audit.startTime, endTime: audit.endTime, coAuditorEmails: coAuditorEmails,
        });
        setSelectedFormForForum(form);
        setShowForumModal(true);
    };

    const openNCRForum = (ncr) => {
        const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
        setSelectedNCRForForum({
            id: ncr.id, ncrNumber: ncr.ncrNumber, department: ncr.department, severity: ncr.severity, status: ncr.status,
            auditorId: ncr.auditorId || user?.id, auditorName: ncr.auditorName || user?.name, auditeeId: ncr.auditeeId, auditeeName: ncr.auditeeName,
            memberEmails: [auditManager?.email].filter(Boolean)
        });
        setShowNCRForumModal(true);
    };

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            setTimeout(() => window.history.replaceState({}, document.title), 100);
        }
    }, [location.state]);

    useEffect(() => {
        if (user?.id) {
            fetchSchedulesWithStatus(selectedYear);
            fetchAllUsers();
            fetchRaisedNCRs(selectedYear);
            const interval = setInterval(() => {
                fetchSchedulesWithStatus(selectedYear);
                fetchRaisedNCRs(selectedYear);
            }, 60000);
            return () => clearInterval(interval);
        }
    }, [user?.id, selectedYear]);

    useEffect(() => { localStorage.setItem('auditorSelectedYear', selectedYear); }, [selectedYear]);
    useEffect(() => { if (activeTab === 'ncr-list') fetchRaisedNCRs(selectedYear); }, [activeTab, selectedYear]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSchedulesWithStatus(selectedYear);
        fetchRaisedNCRs(selectedYear);
        addToast('Dashboard refreshed', 'success');
    };

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 2020;
        const endYear = currentYear + 5;
        const allYears = [];
        for (let i = startYear; i <= endYear; i++) allYears.push(i);
        if (schedules.length > 0) {
            schedules.forEach(item => {
                const schedule = item.schedule;
                if (schedule?.scheduledDate) {
                    const year = new Date(schedule.scheduledDate).getFullYear();
                    if (!allYears.includes(year) && year >= 2020) allYears.push(year);
                }
                if (schedule?.fromDate) {
                    const year = new Date(schedule.fromDate).getFullYear();
                    if (!allYears.includes(year) && year >= 2020) allYears.push(year);
                }
                if (schedule?.toDate) {
                    const year = new Date(schedule.toDate).getFullYear();
                    if (!allYears.includes(year) && year >= 2020) allYears.push(year);
                }
            });
        }
        setAvailableYears(allYears.sort((a, b) => b - a));
    }, [schedules]);

    const handleViewForm = (audit, form) => {
        if (audit.rescheduleRequested) { addToast('This audit has a pending reschedule request.', 'warning'); return; }
        if (audit.extensionRequested) { addToast('This audit has a pending extension request.', 'warning'); return; }
        
        const isExpired = isAuditExpired(audit);
        const hasStartedWork = audit.hasFormData && audit.completedForms > 0;
        if (isExpired && !hasStartedWork && !audit.rescheduleRequested) { addToast('This audit is overdue. Please reschedule.', 'error'); return; }
        if (isExpired && hasStartedWork && !audit.extensionRequested) { addToast('This audit is overdue. Please request an extension.', 'warning'); return; }

        const params = new URLSearchParams();
        params.append('scheduleId', audit.id);
        if (audit.department) params.append('department', audit.department);
        if (form?.processName) params.append('processName', form.processName);
        if (form?.id) params.append('formId', form.id);
        if (audit.auditeeId) params.append('auditeeId', audit.auditeeId);
        if (audit.auditeeName) params.append('auditeeName', audit.auditeeName);
        if (audit.location) params.append('location', audit.location);
        navigate(`${getFormRoute(audit)}?${params.toString()}`);
    };

    const handleRequestReschedule = async (scheduleId, newDate, newStartTime, newEndTime, reason) => {
        try {
            const selectedDate = new Date(newDate);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (selectedDate <= today) { addToast('Cannot reschedule to today or a past date', 'error'); return; }
            const formattedDate = newDate.split('T')[0];
            await axios.post(`${API_BASE}/audit-schedule/schedule/${scheduleId}/request-reschedule?userId=${user?.id}`, { newDate: formattedDate, newStartTime, newEndTime, reason }, { withCredentials: true });
            addToast('Reschedule request submitted!', 'success');
            setRescheduleRequestedMap(prev => ({ ...prev, [scheduleId]: true }));
            await fetchSchedulesWithStatus();
        } catch (error) { addToast(error.response?.data?.message || 'Failed to submit request', 'error'); throw error; }
    };

    const handleRequestExtension = async (scheduleId, newDate, newStartTime, newEndTime, reason, form = null) => {
        try {
            const payload = { newDate, newStartTime, newEndTime, reason };
            if (form) { payload.formId = form.id; payload.formName = form.name; }
            await axios.post(`${API_BASE}/audit-schedule/schedule/${scheduleId}/request-extension?userId=${user?.id}`, payload, { withCredentials: true });
            addToast(`Extension request submitted${form ? ` for ${form.name}` : ''}!`, 'success');
            setExtensionRequestedMap(prev => ({ ...prev, [scheduleId]: true }));
            setSchedules(prevSchedules => prevSchedules.map(item => item.schedule?.id === scheduleId ? { ...item, schedule: { ...item.schedule, extensionRequested: true } } : item));
        } catch (error) { addToast(error.response?.data?.message || 'Failed to submit request', 'error'); throw error; }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
            </div>
        </div>
    );

    const filteredAudits = schedules.filter(item =>
        !searchQuery ||
        item.schedule?.auditType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.schedule?.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen m-0" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
            <style>{animationStyles}</style>
            <Sidebar
                activeView={activeTab}
                setActiveView={setActiveTab}
                isOpen={isSidebarOpen}
                pendingNcrCount={pendingNcrAudits.length}
                myNcrCount={raisedNCRs.length}
            />
            <main className={`transition-all duration-500 ease-out ${isSidebarOpen ? 'ml-64' : 'ml-0'} pt-6`}>
                <div className="px-6 pb-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fadeInUp">
                        <div>
                            <h1 className="mb-1 text-3xl font-bold text-slate-800">Auditor Dashboard</h1>
                            <p className="text-sm text-slate-500">Welcome back, <span className="font-semibold text-slate-700">{user?.name || user?.email}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                            <YearFilter selectedYear={selectedYear} onYearChange={setSelectedYear} availableYears={availableYears} />
                            <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md card-hover">
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    {activeTab === 'my-audits' && (
                        <div className="mb-8 animate-fadeInUp">
                            <h2 className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700">
                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                                    <FileText className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
                                </div>
                                Audit Overview
                            </h2>
                            <div className="grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-7">
                                <StatCard title="Upcoming" value={stats.upcoming} icon={<Calendar size={20} />} delay={0} />
                                <StatCard title="Active" value={stats.active} icon={<Play size={20} />} delay={100} />
                                <StatCard title="In Progress" value={stats.inProgress} icon={<Edit size={20} />} delay={200} />
                                <StatCard title="Overdue (No Work)" value={stats.overdueNoWork} icon={<XCircle size={20} />} delay={300} />
                                <StatCard title="Overdue (Partial)" value={stats.overduePartialWork} icon={<AlertTriangle size={20} />} delay={400} />
                                <StatCard title="Partial" value={stats.partiallyCompleted} icon={<Layers size={20} />} delay={500} />
                                <StatCard title="Completed" value={stats.completed} icon={<CheckCircle size={20} />} delay={600} />
                            </div>
                        </div>
                    )}

                    {(activeTab === 'ncr-pending' || activeTab === 'ncr-list') && (
                        <div className="mb-8 animate-fadeInUp">
                            <h2 className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700">
                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                                    <AlertCircle className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
                                </div>
                                NCR Overview
                            </h2>
                            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
                                <StatCard title="Total NCRs" value={ncrStats.total} icon={<FileText size={20} />} delay={0} />
                                <StatCard title="Awaiting" value={ncrStats.awaiting} icon={<Clock size={20} />} delay={100} />
                                <StatCard title="Pending" value={ncrStats.pending} icon={<AlertCircle size={20} />} delay={200} />
                                <StatCard title="In Progress" value={ncrStats.inProgress} icon={<Edit size={20} />} delay={300} />
                                <StatCard title="Closed" value={ncrStats.closed} icon={<CheckCircle size={20} />} delay={400} />
                                <StatCard title="Rejected" value={ncrStats.rejected} icon={<XCircle size={20} />} delay={500} />
                            </div>
                        </div>
                    )}

                    {/* Search & View Mode (Only for My Audits) */}
                    {activeTab === 'my-audits' && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 animate-fadeInUp">
                            <div className="relative">
                                <Search className="absolute transform -translate-y-1/2 text-slate-400 left-3 top-1/2" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search audits..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-64 py-2.5 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                                />
                            </div>
                            <div className="flex gap-1 p-1 bg-white border shadow-sm border-slate-200 rounded-xl">
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`} title="Grid View">
                                    <Grid3x3 size={16} />
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`} title="List View">
                                    <List size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    {activeTab === 'my-audits' && (
                        filteredAudits.length === 0 ? (
                            <div className="py-20 text-center bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-md rounded-2xl bg-blue-50">
                                    <Calendar className="w-8 h-8 text-blue-600" />
                                </div>
                                <p className="text-lg font-medium text-slate-700">No audits found</p>
                                <p className="mt-1 text-sm text-slate-500">No audits are currently assigned to you</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 animate-fadeInUp">
                                {filteredAudits.map((item, index) => (
                                    <AuditCard
                                        key={item.schedule?.id || index}
                                        audit={item.schedule}
                                        timeStatus={item.timeStatus}   // ← Pass the original timeStatus
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
                                        onOpenForum={openAuditForum}
                                    />
                                ))}
                            </div>
                            ) : (
                            <div className="space-y-4 animate-fadeInUp">
                                {filteredAudits.map((item, index) => (
                                    <AuditListItem
                                        key={item.schedule?.id || index}
                                        item={item}
                                        handleViewForm={handleViewForm}
                                        handleViewReport={handleViewReport}
                                        openAuditForum={openAuditForum}
                                        setShowRescheduleModal={setShowRescheduleModal}
                                        setSelectedAudit={setSelectedAudit}
                                        setSelectedForm={setSelectedForm}
                                        setShowExtensionModal={setShowExtensionModal}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'ncr-pending' && (
                        <NcrPendingList pendingNcrAudits={pendingNcrAudits} onRaise={(item) => navigate(`/form7?${buildPendingNcrQuery(item)}`)} />
                    )}

                    {activeTab === 'ncr-list' && (
                        <NcrListTab raisedNCRs={raisedNCRs} ncrLoading={ncrLoading} navigate={navigate} onOpenForum={openNCRForum} selectedYear={selectedYear} />
                    )}
                </div>
            </main>

            {/* Modals */}
            <RescheduleRequestModal audit={selectedAudit} isOpen={showRescheduleModal} onClose={() => { setShowRescheduleModal(false); setSelectedAudit(null); setSelectedForm(null); }} onSubmit={handleRequestReschedule} />
            <ExtensionRequestModal audit={selectedAudit} form={selectedForm} isOpen={showExtensionModal} onClose={() => { setShowExtensionModal(false); setSelectedAudit(null); setSelectedForm(null); }} onSubmit={handleRequestExtension} />

            {showForumModal && selectedAuditForForum && (
                <AuditCheckSheetNCRForumModal
                    auditId={selectedAuditForForum.id} auditNumber={selectedAuditForForum.auditNumber} auditTitle={selectedAuditForForum.auditType}
                    auditStatus={selectedAuditForForum.status} auditType={selectedAuditForForum.auditType} department={selectedAuditForForum.department}
                    auditorId={selectedAuditForForum.auditorId} auditorName={selectedAuditForForum.auditorName} auditeeId={selectedAuditForForum.auditeeId} auditeeName={selectedAuditForForum.auditeeName}
                    checkSheetId={selectedAuditForForum.checkSheetId} checkSheetName={selectedAuditForForum.checkSheetName} scheduledDate={selectedAuditForForum.scheduledDate}
                    fromDate={selectedAuditForForum.fromDate} toDate={selectedAuditForForum.toDate} startTime={selectedAuditForForum.startTime} endTime={selectedAuditForForum.endTime}
                    memberEmails={selectedAuditForForum.coAuditorEmails || []} isOpen={showForumModal}
                    onClose={() => { setShowForumModal(false); setSelectedAuditForForum(null); setSelectedFormForForum(null); }}
                    currentUser={user} allUsers={allUsersList}
                />
            )}

            {showNCRForumModal && selectedNCRForForum && (
                <AuditCheckSheetNCRForumModal
                    auditId={selectedNCRForForum.id} auditNumber={selectedNCRForForum.ncrNumber} auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
                    auditStatus={selectedNCRForForum.status} auditType="NCR Resolution" department={selectedNCRForForum.department}
                    auditorId={selectedNCRForForum.auditorId} auditorName={selectedNCRForForum.auditorName} auditeeId={selectedNCRForForum.auditeeId} auditeeName={selectedNCRForForum.auditeeName}
                    isOpen={showNCRForumModal} memberEmails={selectedNCRForForum.memberEmails || []}
                    onClose={() => { setShowNCRForumModal(false); setSelectedNCRForForum(null); }}
                    currentUser={user} allUsers={allUsersList}
                />
            )}
        </div>
    );
}

// ============================================================================
// MODALS (Clean Professional Look)
// ============================================================================
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

    const getValidEndTimes = (startTime) => {
        if (!startTime) return TIME_OPTIONS;
        const startMinutes = parseTimeToMinutes(startTime);
        return TIME_OPTIONS.filter(time => parseTimeToMinutes(time) > startMinutes);
    };
    const validEndTimes = getValidEndTimes(newStartTime);

    const doTimeRangesOverlap = (start1, end1, start2, end2) => {
        const start1Min = parseTimeToMinutes(start1); const end1Min = parseTimeToMinutes(end1);
        const start2Min = parseTimeToMinutes(start2); const end2Min = parseTimeToMinutes(end2);
        return start1Min < end2Min && end1Min > start2Min;
    };

    const fetchExistingSchedules = async () => {
        try {
            const auditorId = audit?.auditorId || audit?.leadAuditorId;
            if (!auditorId) return [];
            const response = await axios.get(`${API_BASE}/audit-schedule/auditor/${auditorId}/schedules-with-status`, { withCredentials: true });
            return response.data || [];
        } catch (error) { return []; }
    };

    const checkSchedulingConflict = async (date, startTime, endTime) => {
        if (!date || !startTime || !endTime || !audit?.id) return false;
        setCheckingConflict(true); setTimeConflictError(''); setConflictDetails([]);
        try {
            const formattedDate = new Date(date).toISOString().split('T')[0];
            let schedules = existingSchedules;
            if (schedules.length === 0) { schedules = await fetchExistingSchedules(); setExistingSchedules(schedules); }
            const conflicts = schedules.filter(schedule => {
                if (schedule.schedule?.id === audit.id) return false;
                const scheduleDate = schedule.schedule?.scheduledDate;
                if (scheduleDate !== formattedDate) return false;
                const scheduleStart = schedule.schedule?.startTime; const scheduleEnd = schedule.schedule?.endTime;
                if (!scheduleStart || !scheduleEnd) return false;
                return doTimeRangesOverlap(startTime, endTime, scheduleStart, scheduleEnd);
            });
            if (conflicts.length > 0) {
                setConflictDetails(conflicts);
                const conflict = conflicts[0];
                setTimeConflictError(`Time conflict: You already have an audit scheduled on ${formattedDate} from ${conflict.schedule?.startTime} - ${conflict.schedule?.endTime}.`);
                return true;
            }
            return false;
        } catch (error) { return false; } finally { setCheckingConflict(false); }
    };

    const getDateRestrictions = () => {
        const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const maxDate = new Date(today); maxDate.setDate(today.getDate() + 21);
        return { minDate: tomorrow.toISOString().split('T')[0], maxDate: maxDate.toISOString().split('T')[0] };
    };
    const { minDate, maxDate } = getDateRestrictions();

    const validateDate = (date) => {
        const selectedDate = new Date(date); const today = new Date(); today.setHours(0, 0, 0, 0);
        if (selectedDate <= today) { setDateError('Reschedule date must be a future date'); return false; }
        const maxAllowed = new Date(); maxAllowed.setDate(maxAllowed.getDate() + 21);
        if (selectedDate > maxAllowed) { setDateError('Reschedule date should be within the next 3 weeks'); return false; }
        setDateError(''); return true;
    };

    const handleDateChange = (e) => { setNewDate(e.target.value); if (e.target.value) validateDate(e.target.value); else setDateError(''); setTimeConflictError(''); setConflictDetails([]); };
    const handleStartTimeChange = (e) => { setNewStartTime(e.target.value); if (newEndTime && parseTimeToMinutes(e.target.value) >= parseTimeToMinutes(newEndTime)) setNewEndTime(''); setTimeConflictError(''); setConflictDetails([]); };
    const handleEndTimeChange = (e) => { setNewEndTime(e.target.value); setTimeConflictError(''); setConflictDetails([]); };

    useEffect(() => {
        if (newDate && newStartTime && newEndTime && !dateError) {
            if (parseTimeToMinutes(newStartTime) < parseTimeToMinutes(newEndTime)) {
                const delayDebounce = setTimeout(() => checkSchedulingConflict(newDate, newStartTime, newEndTime), 500);
                return () => clearTimeout(delayDebounce);
            } else { setTimeConflictError('End time must be after start time'); }
        }
    }, [newDate, newStartTime, newEndTime, dateError]);

    useEffect(() => {
        if (audit && isOpen) {
            const defaultDate = new Date(); defaultDate.setDate(defaultDate.getDate() + 1);
            setNewDate(defaultDate.toISOString().split('T')[0]);
            setNewStartTime(audit.startTime || '09:00 AM'); setNewEndTime(audit.endTime || '10:00 AM');
            setReason(''); setDateError(''); setTimeConflictError(''); setConflictDetails([]); setExistingSchedules([]);
        }
    }, [audit, isOpen]);

    const handleSubmit = async () => {
        if (!newDate || !validateDate(newDate) || !newStartTime || !newEndTime || parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime) || !reason.trim()) {
            addToast('Please fill all fields correctly', 'error'); return;
        }
        const hasConflict = await checkSchedulingConflict(newDate, newStartTime, newEndTime);
        if (hasConflict) { addToast(timeConflictError || 'Time slot conflicts', 'error'); return; }
        setSubmitting(true);
        try {
            await onSubmit(audit.id, new Date(newDate).toISOString().split('T')[0], newStartTime, newEndTime, reason);
            onClose();
        } catch (error) { addToast('Failed to submit', 'error'); } finally { setSubmitting(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-scaleIn">
                <h3 className="mb-4 text-lg font-bold text-slate-800">Request Reschedule</h3>
                <p className="mb-4 text-sm text-slate-600">Reschedule <strong>{audit?.auditType}</strong> for <strong>{audit?.department}</strong></p>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-slate-700">New Date *</label>
                        <input type="date" value={newDate} onChange={handleDateChange} className={`w-full p-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${dateError ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`} min={minDate} max={maxDate} />
                        {dateError && <p className="mt-1 text-xs text-rose-600">{dateError}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Start Time *</label>
                            <select value={newStartTime} onChange={handleStartTimeChange} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                                {TIME_OPTIONS.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">End Time *</label>
                            <select value={newEndTime} onChange={handleEndTimeChange} className={`w-full p-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 ${timeConflictError ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`} disabled={!newStartTime}>
                                <option value="">Select</option>
                                {validEndTimes.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    {timeConflictError && <div className="p-3 text-sm border bg-rose-50 rounded-xl border-rose-200 text-rose-700"><AlertCircle size={14} className="inline mr-2" />{timeConflictError}</div>}
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-slate-700">Reason *</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Reason for rescheduling..." />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-700 transition-all rounded-xl border border-slate-200 bg-white hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting || !!dateError || !!timeConflictError || checkingConflict} className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all shadow-md ${submitting || dateError || timeConflictError || checkingConflict ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExtensionRequestModal = ({ audit, form, isOpen, onClose, onSubmit }) => {
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('');
    const [newEndTime, setNewEndTime] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [timeError, setTimeError] = useState('');
    const { addToast } = useToast();

    const getValidEndTimes = (startTime) => {
        if (!startTime) return TIME_OPTIONS;
        const startMinutes = parseTimeToMinutes(startTime);
        return TIME_OPTIONS.filter(time => parseTimeToMinutes(time) > startMinutes);
    };
    const validEndTimes = getValidEndTimes(newStartTime);

    useEffect(() => {
        if (audit && isOpen) {
            const defaultDate = new Date(); defaultDate.setDate(defaultDate.getDate() + 7);
            setNewDate(defaultDate.toISOString().split('T')[0]);
            setNewStartTime(audit.startTime || '09:00 AM'); setNewEndTime(audit.endTime || '10:00 AM');
            setReason(''); setTimeError('');
        }
    }, [audit, isOpen]);

    const handleSubmit = async () => {
        if (!newDate || !newStartTime || !newEndTime || parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime) || !reason.trim()) {
            addToast('Please fill all fields correctly', 'error'); return;
        }
        setSubmitting(true);
        try {
            await onSubmit(audit.id, newDate, newStartTime, newEndTime, reason, form);
            onClose();
        } catch (error) { addToast('Failed to submit', 'error'); } finally { setSubmitting(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-scaleIn">
                <h3 className="mb-4 text-lg font-bold text-slate-800">Request Extension</h3>
                <p className="mb-4 text-sm text-slate-600">Request extension for <strong>{audit?.auditType}</strong> - <strong>{audit?.department}</strong></p>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-slate-700">New Due Date *</label>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Start Time *</label>
                            <select value={newStartTime} onChange={e => { setNewStartTime(e.target.value); if (newEndTime && parseTimeToMinutes(e.target.value) >= parseTimeToMinutes(newEndTime)) setNewEndTime(''); }} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                                {TIME_OPTIONS.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">End Time *</label>
                            <select value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" disabled={!newStartTime}>
                                <option value="">Select</option>
                                {validEndTimes.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-slate-700">Reason *</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Detailed reason..." />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-700 transition-all rounded-xl border border-slate-200 bg-white hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting} className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all shadow-md ${submitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
};