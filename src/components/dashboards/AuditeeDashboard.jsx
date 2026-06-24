import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    FileText, Clock, CheckCircle, AlertCircle, Eye, Search, Calendar,
    UserCheck, RefreshCw, AlertTriangle, Grid3x3, List, ChevronDown, ChevronUp,
    MessageCircle, TrendingUp, ThumbsUp, ThumbsDown, XCircle, Loader2, Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import ForumThreadView from '../forum/ForumThreadView';
import Drawer from '../Drawer';
import YearFilter from '../../components/common/YearFilter';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ============================================================================
// COLOR PALETTE & ANIMATIONS (Matching Auditor Dashboard)
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
const Sidebar = ({ activeView, setActiveView, isOpen, auditCount, pendingNcrCount, myNcrCount }) => {
    const menuItems = [
        { id: 'my-audits', label: 'Audit Forms', icon: <FileText className="w-5 h-5" />, badge: auditCount },
        { id: 'ncr-pending', label: 'NCRs Awaiting', icon: <AlertTriangle className="w-5 h-5" />, badge: pendingNcrCount },
        { id: 'my-ncrs', label: 'My NCRs', icon: <TrendingUp className="w-5 h-5" />, badge: myNcrCount },
    ];

    return (
        <aside className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 shadow-md transition-all duration-500 ease-out overflow-hidden flex flex-col ${isOpen ? 'w-64' : 'w-0 border-r-0'}`}>
            <div className="flex-shrink-0 p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl" style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)` }}>
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className={`${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300`}>
                        <h2 className="text-base font-bold leading-tight text-slate-800">Auditee</h2>
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
// STAT CARD
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
// HELPERS
// ============================================================================
const getViewRoute = (audit) => {
    const auditType = (audit.auditType || '').toLowerCase().trim();
    if (auditType.includes('5s') || auditType.includes('five_s')) return `/fives-view`;
    if (auditType.includes('process') || auditType.includes('manufacturing')) return `/manufacturing-view`;
    if (auditType.includes('iatf') || auditType.includes('system')) return `/iatf-view`;
    return `/fives-view`;
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

const is8DRelated = (ncr) => {
    const eightDStatuses = ['SENT_TO_8D', 'IN_8D_PROCESS', 'READY_FOR_NCR2', 'NCR2_IN_PROGRESS', 'NCR2_COMPLETED'];
    return eightDStatuses.includes(ncr?.status) || ncr?.requires8D === true;
};

// ============================================================================
// NCR STATUS BADGE
// ============================================================================
const NcrStatusBadge = ({ status }) => {
    const config = {
        SENT_TO_8D:       { label: 'In 8D', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        IN_8D_PROCESS:    { label: 'In 8D', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        READY_FOR_NCR2:   { label: 'Ready for NCR2', className: 'bg-violet-50 text-violet-700 border-violet-200' },
        NCR2_IN_PROGRESS: { label: 'NCR2 Verification', className: 'bg-purple-50 text-purple-700 border-purple-200' },
        NCR2_COMPLETED:   { label: 'NCR2 Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        AWAITING_AUDITEE: { label: 'Awaiting Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        OPEN:             { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-200' },
        APPROVED:         { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        IN_PROGRESS:      { label: 'In Progress', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        REJECTED:         { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
        CLOSED:           { label: 'Closed', className: 'bg-slate-50 text-slate-700 border-slate-200' },
        COMPLETED:        { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    };
    const { label, className } = config[status] || { label: status, className: 'bg-slate-50 text-slate-700 border-slate-200' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${className}`}>
            {label}
        </span>
    );
};

// ============================================================================
// AUDIT CARD (Grid View)
// ============================================================================
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

    const getStatusBadge = () => {
        const baseClass = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border";
        if (cardStatus === 'APPROVED') return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle size={12} /> All Approved</span>;
        if (cardStatus === 'REJECTED') return <span className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200`}><XCircle size={12} /> All Rejected</span>;
        if (cardStatus === 'PARTIALLY_REJECTED') return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}><AlertCircle size={12} /> Partially Rejected</span>;
        if (cardStatus === 'PARTIALLY_APPROVED') return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}><CheckCircle size={12} /> Partially Approved</span>;
        return <span className={`${baseClass} bg-orange-100 text-orange-600 border-orange-200`}><Clock size={12} /> Pending Review</span>;
    };

    return (
        <div className={`transition-all duration-300 border shadow-sm rounded-2xl card-hover bg-white border-slate-200`}>
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                        {getStatusBadge()}
                        {isMultiForm && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {completedForms}/{totalForms} Forms
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border text-slate-500 bg-slate-50 border-slate-200">
                        <CalendarIcon size={10} />
                        {isDateRange ? `${audit.fromDate} → ${audit.toDate}` : audit.scheduledDate}
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
                        <span>{audit.auditorName || 'Not Assigned'}</span>
                    </div>
                </div>

                {isMultiForm && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-slate-500">Completion Progress</span>
                            <span className="text-[10px] font-semibold text-blue-600">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full transition-all duration-500 rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                )}

                {isMultiForm && formDetails && formDetails.length > 0 && (
                    <div className="mb-4">
                        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium transition-all border rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200">
                            <span>Individual Forms ({completedForms}/{totalForms})</span>
                            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {expanded && (
                            <div className="mt-2 space-y-2 overflow-y-auto max-h-64">
                                {formDetails.map((form, idx) => {
                                    const isFormApproved = form.status === 'APPROVED';
                                    const isFormRejected = form.status === 'REJECTED';
                                    const isFormPending = form.status === 'COMPLETED' || form.status === 'AWAITING_APPROVAL' || form.status === 'SUBMITTED';
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 text-xs border rounded-lg bg-slate-50/50 border-slate-200">
                                            <div className="flex items-center min-w-0 gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isFormApproved ? 'bg-emerald-500' : isFormRejected ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                <span className="font-medium truncate text-slate-700">{form.processName || form.name}</span>
                                            </div>
                                            <div className="flex items-center flex-shrink-0 gap-1">
                                                <button onClick={() => onOpenForum(audit, null)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50" title="Forum"><MessageCircle size={14} /></button>
                                                <button onClick={() => onViewReport(audit, form.responseId)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="View"><Eye size={14} /></button>
                                                {isFormPending && (
                                                    <>
                                                        <button onClick={() => onApprove(audit, form)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" title="Approve"><ThumbsUp size={14} /></button>
                                                        <button onClick={() => onReject(audit, form)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50" title="Reject"><ThumbsDown size={14} /></button>
                                                    </>
                                                )}
                                                {isFormApproved && <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">Approved</span>}
                                                {isFormRejected && <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 rounded-md border border-rose-200">Rejected</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button onClick={() => onOpenForum(audit, null)} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1 border border-slate-200" title="Open Discussion Forum">
                        <MessageCircle size={12} /> Forum
                    </button>
                    {hasPending && (
                        <button onClick={() => {
                            const pendingForm = formDetails.find(f => f.status === 'COMPLETED' || f.status === 'AWAITING_APPROVAL' || f.status === 'SUBMITTED');
                            if (pendingForm) onViewReport(audit, pendingForm.responseId);
                        }} className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-200">
                            <Eye size={12} className="inline mr-1" /> View Latest
                        </button>
                    )}
                    {(cardStatus === 'APPROVED' || cardStatus === 'REJECTED') && formDetails?.length > 0 && (
                        <button onClick={() => onViewReport(audit, formDetails[0]?.responseId)} className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200">
                            <Eye size={12} className="inline mr-1" /> View Reports
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// AUDIT LIST ITEM (List View)
// ============================================================================
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

    const getStatusBadge = () => {
        const baseClass = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border";
        if (cardStatus === 'APPROVED') return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle size={12} /> All Approved</span>;
        if (cardStatus === 'REJECTED') return <span className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200`}><XCircle size={12} /> All Rejected</span>;
        if (cardStatus === 'PARTIALLY_REJECTED') return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}><AlertCircle size={12} /> Partially Rejected</span>;
        if (cardStatus === 'PARTIALLY_APPROVED') return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}><CheckCircle size={12} /> Partially Approved</span>;
        return <span className={`${baseClass} bg-orange-100 text-orange-600 border-orange-200`}><Clock size={12} /> Pending Review</span>;
    };

    return (
        <div className={`p-5 border shadow-sm rounded-2xl card-hover transition-all duration-300 border-slate-200 bg-white animate-fadeInUp`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge()}
                        {isMultiForm && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {completedForms}/{totalForms} Forms
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
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                            <Clock size={10} className="text-slate-400" />
                            <span>{audit.startTime} - {audit.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                            <UserCheck size={10} className="text-slate-400" />
                            <span>{audit.auditorName || 'Not Assigned'}</span>
                        </div>
                    </div>
                    {isMultiForm && (
                        <div className="max-w-md mt-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium text-slate-500">Progress</span>
                                <span className="text-[10px] font-semibold text-blue-600">{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full transition-all duration-500 rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => onOpenForum(audit, null)} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1 border border-slate-200">
                        <MessageCircle size={12} /> Forum
                    </button>
                    {hasPending && (
                        <button onClick={() => {
                            const pendingForm = formDetails.find(f => f.status === 'COMPLETED' || f.status === 'AWAITING_APPROVAL' || f.status === 'SUBMITTED');
                            if (pendingForm) onViewReport(audit, pendingForm.responseId);
                        }} className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-200">
                            <Eye size={12} className="inline mr-1" /> View
                        </button>
                    )}
                    {(cardStatus === 'APPROVED' || cardStatus === 'REJECTED') && formDetails?.length > 0 && (
                        <button onClick={() => onViewReport(audit, formDetails[0]?.responseId)} className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200">
                            <Eye size={12} className="inline mr-1" /> View Reports
                        </button>
                    )}
                </div>
            </div>
            
            {isMultiForm && formDetails && formDetails.length > 0 && (
                <div className="mt-4">
                    <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700">
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? 'Hide details' : `View all forms (${totalForms})`}
                    </button>
                    {expanded && (
                        <div className="mt-3 space-y-2">
                            {formDetails.map((form, idx) => {
                                const isFormApproved = form.status === 'APPROVED';
                                const isFormRejected = form.status === 'REJECTED';
                                const isFormPending = form.status === 'COMPLETED' || form.status === 'AWAITING_APPROVAL' || form.status === 'SUBMITTED';
                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 text-xs border rounded-lg bg-slate-50/50 border-slate-200">
                                        <div className="flex items-center min-w-0 gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isFormApproved ? 'bg-emerald-500' : isFormRejected ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                            <span className="font-medium truncate text-slate-700">{form.processName || form.name}</span>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 gap-1">
                                            <button onClick={() => onOpenForum(audit, null)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50" title="Forum"><MessageCircle size={14} /></button>
                                            <button onClick={() => onViewReport(audit, form.responseId)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="View"><Eye size={14} /></button>
                                            {isFormPending && (
                                                <>
                                                    <button onClick={() => onApprove(audit, form)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" title="Approve"><ThumbsUp size={14} /></button>
                                                    <button onClick={() => onReject(audit, form)} className="p-1.5 transition-all rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50" title="Reject"><ThumbsDown size={14} /></button>
                                                </>
                                            )}
                                            {isFormApproved && <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">Approved</span>}
                                            {isFormRejected && <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 rounded-md border border-rose-200">Rejected</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// NCR PENDING LIST
// ============================================================================
const NcrPendingList = ({ pendingNcrAudits }) => {
    if (pendingNcrAudits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white border shadow-sm rounded-2xl border-slate-200">
                <div className="flex items-center justify-center w-16 h-16 mb-4 shadow-md rounded-2xl bg-emerald-50">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-lg font-medium text-slate-700">No Pending NCRs</p>
                <p className="mt-1 text-sm text-slate-500">All NCRs have been reviewed</p>
            </div>
        );
    }
    return (
        <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <p className="text-sm font-bold text-slate-800">NCRs Awaiting Your Review</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                    {pendingNcrAudits.length} pending
                </span>
            </div>
            <div className="divide-y divide-slate-100">
                {pendingNcrAudits.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-bold text-slate-900">NCR #{item.ncrNumber || item.id}</p>
                            <p className="mt-0.5 text-xs text-slate-500 truncate">{item.department || 'General'} · Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not set'}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                                    item.severity === 'Major NC' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                    {item.severity || 'NCR'}
                                </span>
                                {item.clause && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-600 bg-slate-100 rounded-md border border-slate-200">
                                        Clause {item.clause}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link to={`/ncr-view/${item.id}`} className="p-2 transition-all rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="View Details">
                                <Eye size={18} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
const AuditeeDashboard = () => {
    const location = useLocation();
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [completedAuditsForReview, setCompletedAuditsForReview] = useState([]);
    const [assignedNCRs, setAssignedNCRs] = useState([]);
    const [pendingNcrReviews, setPendingNcrReviews] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [activeTab, setActiveTab] = useState('my-audits');
    
    const [showForumModal, setShowForumModal] = useState(false);
    const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
    const [selectedFormForForum, setSelectedFormForForum] = useState(null);
    const [allUsersList, setAllUsersList] = useState([]);
    
    const [showNCRForumModal, setShowNCRForumModal] = useState(false);
    const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);
    
    const [show8DForumDrawer, setShow8DForumDrawer] = useState(false);
    const [selected8DNCR, setSelected8DNCR] = useState(null);
    const [eightDTeamMembers, setEightDTeamMembers] = useState([]);
    const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
    
    const [selectedYear, setSelectedYear] = useState(() => {
        const savedYear = localStorage.getItem('auditeeSelectedYear');
        if (savedYear) return parseInt(savedYear);
        return new Date().getFullYear();
    });
    const [availableYears, setAvailableYears] = useState([]);
    
    const [stats, setStats] = useState({
        pendingReview: 0, approvedAudits: 0, rejectedAudits: 0,
        openNCRs: 0, overdueNCRs: 0, resolvedNCRs: 0,
    });

    // Listen for sidebar toggle event from Navbar
    useEffect(() => {
        const handleToggle = () => setIsSidebarOpen(prev => !prev);
        window.addEventListener('toggle-auditee-sidebar', handleToggle);
        return () => window.removeEventListener('toggle-auditee-sidebar', handleToggle);
    }, []);

    // ... (Keep all your existing helper functions, handlers, and data fetching logic exactly as they were) ...
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
            id: forumId, auditNumber: audit.auditNumber, auditType: audit.auditType, department: audit.department,
            status: audit.status, auditorId: audit.auditorId, auditorName: audit.auditorName,
            auditeeId: user?.id, auditeeName: user?.name, scheduledDate: audit.scheduledDate,
            fromDate: audit.fromDate, toDate: audit.toDate, startTime: audit.startTime, endTime: audit.endTime,
            memberEmails: participantEmails
        });
        setShowForumModal(true);
    };

    const openNCRForum = (ncr) => {
        const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
        setSelectedNCRForForum({
            id: ncr.id, ncrNumber: ncr.ncrNumber, department: ncr.department, severity: ncr.severity, status: ncr.status,
            auditorId: ncr.auditorId, auditorName: ncr.auditorName, auditeeId: ncr.auditeeId || user?.id, auditeeName: ncr.auditeeName || user?.name,
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
            const eightDEventId = `8D-${ncr.ncrNumber}`;
            const response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data/${eightDEventId}`);
            if (response.data?.success && response.data.data) {
                const d0Data = response.data.data.content?.d0?.[0] || {};
                const emails = Array.isArray(d0Data.additionalEmails) ? d0Data.additionalEmails : [];
                setEightDTeamMembers(emails);
            }
        } catch (err) {
            console.error('Failed to fetch 8D team members:', err);
            setEightDTeamMembers([]);
        } finally {
            setLoadingTeamMembers(false);
        }
    };

    const handleViewReport = (audit, responseId) => {
        if (!responseId) { addToast('No audit report data available', 'error'); return; }
        const viewRoute = getViewRoute(audit);
        navigate(`${viewRoute}/${responseId}?mode=view`, { state: { returnTo: '/auditee', tab: 'my-audits' } });
    };

    const handleApprove = async (audit, form) => {
        try {
            await axios.put(`${API_BASE}/templates/responses/${form.responseId}/approve`, {
                approvedBy: user?.name, approvedAt: new Date().toISOString(), signature: user?.name
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
                rejectedBy: user?.name, rejectedAt: new Date().toISOString(), rejectionReason: reason
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
                status: newStatus, comment, reviewedBy: user?.name, reviewedAt: new Date().toISOString()
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

    const fetchAuditsWithResponses = async (year = selectedYear) => {
        try {
            let allSchedules = [];
            try {
                const response = await axios.get(`${API_BASE}/audit-schedule/year/${year}`, { withCredentials: true });
                const schedules = response.data || [];
                const mySchedules = schedules.filter(s => s.scheduledDate && (s.auditeeId === user?.id || s.auditeeName === user?.name));
                allSchedules.push(...mySchedules);
            } catch (err) { console.log(`No schedules for year ${year}`); }

            const responsesResponse = await axios.get(`${API_BASE}/templates/responses/all`, { withCredentials: true });
            const allResponses = responsesResponse.data || [];
            const myResponses = allResponses.filter(r => r.auditeeId === user?.id || r.auditeeName === user?.name);
            const myResponsesByYear = myResponses.filter(response => {
                const responseYear = response.createdAt ? new Date(response.createdAt).getFullYear() : null;
                return responseYear === year;
            });

            const auditMap = new Map();
            for (const response of myResponsesByYear) {
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
                                id: scheduleId, auditType: response.checkSheet?.auditType || 'Unknown Audit',
                                department: response.department || 'Unknown', auditorName: response.auditorName,
                                scheduledDate: response.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                                startTime: '09:00 AM', endTime: '05:00 PM', formDetails: [], totalForms: 0, completedForms: 0
                            });
                        }
                    }
                }
                const auditData = auditMap.get(scheduleId);
                auditData.formDetails.push({
                    id: response.checkSheet?.id, name: response.checkSheet?.name || auditData.auditType,
                    processName: response.checkSheet?.name || auditData.auditType || 'Audit Form',
                    responseId: response.id, completed: true, status: response.status || 'COMPLETED',
                    createdAt: response.createdAt, updatedAt: response.updatedAt,
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

    const fetchNCRData = async (year = selectedYear) => {
        try {
            let myNCRs = [];
            try {
                const response = await axios.get(`${API_BASE}/ncr/all`, { withCredentials: true });
                const allNCRs = response.data || [];
                myNCRs = allNCRs.filter(ncr => {
                    const matchesUser = String(ncr.assigneeId) === String(user?.id) || String(ncr.auditeeId) === String(user?.id) || ncr.assigneeName === user?.name || ncr.auditeeName === user?.name;
                    const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
                    let matchesYear = true;
                    if (year && ncrDate) {
                        const ncrYear = new Date(ncrDate).getFullYear();
                        matchesYear = ncrYear === year;
                    }
                    return matchesUser && matchesYear;
                });
                myNCRs = myNCRs.map(ncr => ({
                    ...ncr, history: ncr.history || (ncr.statusHistory ? ncr.statusHistory : (ncr.status !== 'AWAITING_AUDITEE' && ncr.reviewedAt ? [{ action: ncr.status, comment: ncr.rejectionReason, performedBy: ncr.reviewedBy, timestamp: ncr.reviewedAt }] : []))
                }));
            } catch (err) {
                try {
                    const response = await axios.get(`${API_BASE}/ncr`, { withCredentials: true });
                    const allNCRs = response.data || [];
                    myNCRs = allNCRs.filter(ncr => {
                        const matchesUser = String(ncr.assigneeId) === String(user?.id) || String(ncr.auditeeId) === String(user?.id);
                        const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
                        let matchesYear = true;
                        if (year && ncrDate) {
                            const ncrYear = new Date(ncrDate).getFullYear();
                            matchesYear = ncrYear === year;
                        }
                        return matchesUser && matchesYear;
                    });
                } catch (err2) { console.error('Failed to fetch NCRs:', err2); }
            }

            if (myNCRs.length === 0) {
                try {
                    const responsesRes = await axios.get(`${API_BASE}/templates/responses/all`, { withCredentials: true });
                    const myResponses = (responsesRes.data || []).filter(r => r.auditeeId === user?.id || r.auditeeName === user?.name);
                    for (const response of myResponses) {
                        const responseYear = response.createdAt ? new Date(response.createdAt).getFullYear() : null;
                        if (year && responseYear !== year) continue;
                        const answers = parseResponseAnswers(response);
                        const findings = getNcrFindingEntries(answers);
                        if (findings.length > 0) {
                            myNCRs.push({
                                id: response.id, ncrNumber: `NCR-${response.id}`,
                                status: response.status === 'APPROVED' ? 'APPROVED' : response.status === 'REJECTED' ? 'REJECTED' : 'AWAITING_AUDITEE',
                                department: response.department, severity: findings[0]?.severity || 'Minor NC', clause: findings[0]?.clause,
                                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), createdAt: response.createdAt, updatedAt: response.updatedAt,
                                auditeeId: response.auditeeId, auditeeName: response.auditeeName,
                                description: findings.map(f => f.checkpoint).join(', '),
                                history: [{ action: 'CREATED', comment: 'NCR created from audit findings', performedBy: response.auditorName, timestamp: response.createdAt }]
                            });
                        }
                    }
                } catch (err) { console.error('Error fetching responses:', err); }
            }

            if (myNCRs.length === 0) {
                setAssignedNCRs([]); setPendingNcrReviews([]);
                setStats(prev => ({ ...prev, openNCRs: 0, overdueNCRs: 0, resolvedNCRs: 0 }));
                return [];
            }

            const pendingReview = myNCRs.filter(n => n.status === 'AWAITING_AUDITEE');
            const allNCRsSorted = [...myNCRs].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
            const openNCRs = myNCRs.filter(n => ['OPEN', 'APPROVED', 'READY_FOR_NCR2'].includes(n.status));
            const inProgressNCRs = myNCRs.filter(n => ['IN_PROGRESS', 'SENT_TO_8D', 'IN_8D_PROCESS', 'NCR2_IN_PROGRESS'].includes(n.status));
            const closedNCRs = myNCRs.filter(n => ['CLOSED', 'NCR2_COMPLETED'].includes(n.status));
            const today = new Date();
            const overdue = openNCRs.filter(n => n.dueDate && new Date(n.dueDate) < today);

            setAssignedNCRs(allNCRsSorted);
            setPendingNcrReviews(pendingReview);
            setStats(prev => ({ ...prev, openNCRs: openNCRs.length, overdueNCRs: overdue.length, resolvedNCRs: inProgressNCRs.length + closedNCRs.length }));
            return myNCRs;
        } catch (error) {
            console.error('Error in fetchNCRData:', error);
            addToast('Failed to load NCR data', 'error');
            return [];
        }
    };

    const fetchAllData = async (year = selectedYear) => {
        try {
            setLoading(true); setRefreshing(true);
            await Promise.all([fetchAuditsWithResponses(year), fetchNCRData(year)]);
        } catch (error) {
            console.error('Error fetching auditee data:', error);
            addToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false); setRefreshing(false);
        }
    };

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            setTimeout(() => { window.history.replaceState({}, document.title); }, 100);
        }
    }, [location.state]);

    useEffect(() => { localStorage.setItem('auditeeSelectedYear', selectedYear); }, [selectedYear]);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 2020; const endYear = currentYear + 5;
        const years = [];
        for (let i = startYear; i <= endYear; i++) years.push(i);
        setAvailableYears(years.sort((a, b) => b - a));
    }, []);

    useEffect(() => {
        if (user?.id) {
            fetchAllData(selectedYear); fetchAllUsers();
            const interval = setInterval(() => fetchAllData(selectedYear), 60000);
            return () => clearInterval(interval);
        }
    }, [user, selectedYear]);

    const filteredAudits = completedAuditsForReview.filter(audit =>
        !searchQuery || audit.auditType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.auditorName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                    <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen m-0" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
            <style>{animationStyles}</style>
            <Sidebar
                activeView={activeTab}
                setActiveView={setActiveTab}
                isOpen={isSidebarOpen}
                auditCount={completedAuditsForReview.length}
                pendingNcrCount={pendingNcrReviews.length}
                myNcrCount={assignedNCRs.length}
            />
            <main className={`transition-all duration-500 ease-out ${isSidebarOpen ? 'ml-64' : 'ml-0'} pt-6`}>
                <div className="px-6 pb-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fadeInUp">
                        <div>
                            <h1 className="mb-1 text-3xl font-bold text-slate-800">Auditee Dashboard</h1>
                            <p className="text-sm text-slate-500">Welcome back, <span className="font-semibold text-slate-700">{user?.name || user?.email}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                            <YearFilter selectedYear={selectedYear} onYearChange={setSelectedYear} availableYears={availableYears} />
                            <button onClick={() => fetchAllData(selectedYear)} disabled={refreshing} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md card-hover">
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-8 animate-fadeInUp">
                        <h2 className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700">
                            <div className="p-1.5 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                                <FileText className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
                            </div>
                            Dashboard Overview
                        </h2>
                        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
                            <StatCard title="Pending Forms" value={stats.pendingReview} icon={<Clock size={20} />} delay={0} />
                            <StatCard title="Approved Forms" value={stats.approvedAudits} icon={<CheckCircle size={20} />} delay={100} />
                            <StatCard title="Rejected Forms" value={stats.rejectedAudits} icon={<XCircle size={20} />} delay={200} />
                            <StatCard title="Open NCRs" value={stats.openNCRs} icon={<AlertCircle size={20} />} delay={300} />
                            <StatCard title="Overdue NCRs" value={stats.overdueNCRs} icon={<Clock size={20} />} delay={400} />
                            <StatCard title="Resolved NCRs" value={stats.resolvedNCRs} icon={<CheckCircle size={20} />} delay={500} />
                        </div>
                    </div>

                    {/* Search & View Mode */}
                    {activeTab === 'my-audits' && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 animate-fadeInUp">
                            <div className="relative">
                                <Search className="absolute transform -translate-y-1/2 text-slate-400 left-3 top-1/2" size={16} />
                                <input type="text" placeholder="Search audits..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-64 py-2.5 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
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
                        completedAuditsForReview.length === 0 ? (
                            <div className="py-20 text-center bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-md rounded-2xl bg-blue-50">
                                    <FileText className="w-8 h-8 text-blue-600" />
                                </div>
                                <p className="text-lg font-medium text-slate-700">No audit forms available</p>
                                <p className="mt-1 text-sm text-slate-500">When audits are completed, forms will appear here for review</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 animate-fadeInUp">
                                {filteredAudits.map((audit) => (
                                    <AuditCard key={audit.id} audit={audit} onViewReport={handleViewReport} onApprove={handleApprove} onReject={handleReject}
                                        formDetails={audit.formDetails} totalForms={audit.totalForms} completedForms={audit.completedForms} onOpenForum={openAuditForum} />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fadeInUp">
                                {filteredAudits.map((audit) => (
                                    <AuditListItem key={audit.id} audit={audit} onViewReport={handleViewReport} onApprove={handleApprove} onReject={handleReject}
                                        formDetails={audit.formDetails} totalForms={audit.totalForms} completedForms={audit.completedForms} onOpenForum={openAuditForum} />
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'ncr-pending' && (
                        <NcrPendingList pendingNcrAudits={pendingNcrReviews} onRaise={handleNcrReview} />
                    )}

                    {activeTab === 'my-ncrs' && (
                        <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">All Assigned NCRs</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Nonconformity reports assigned to you</p>
                                </div>
                                {assignedNCRs.length > 0 && (
                                    <span className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{assignedNCRs.length} total</span>
                                )}
                            </div>
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b bg-slate-50 border-slate-100">
                                <div className="col-span-3 md:col-span-2">NCR Number</div>
                                <div className="col-span-3 md:col-span-2">Due Date</div>
                                <div className="col-span-3 md:col-span-2">Status</div>
                                <div className="col-span-3 text-right md:col-span-6">Action</div>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                                {assignedNCRs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white">
                                        <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-slate-100">
                                            <AlertCircle className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">No NCRs assigned</p>
                                        <p className="max-w-xs mt-1 text-xs text-slate-500">When NCRs are raised against you, they will appear here</p>
                                    </div>
                                ) : (
                                    assignedNCRs.map((ncr) => (
                                        <div key={ncr.id} className="grid items-center grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-slate-50">
                                            <div className="col-span-3 md:col-span-2">
                                                <p className="font-mono text-sm font-medium truncate text-slate-900" title={ncr.ncrNumber || `NCR #${ncr.id}`}>
                                                    {ncr.ncrNumber || `NCR #${ncr.id}`}
                                                </p>
                                            </div>
                                            <div className="col-span-3 md:col-span-2">
                                                <p className="text-sm text-slate-600">
                                                    {ncr.dueDate ? new Date(ncr.dueDate).toLocaleDateString('en-GB') : '—'}
                                                </p>
                                            </div>
                                            <div className="col-span-3 md:col-span-2">
                                                <NcrStatusBadge status={ncr.status} />
                                            </div>
                                            <div className="flex justify-end col-span-3 gap-1 md:col-span-6">
                                                <button onClick={() => openNCRForum(ncr)} className="p-2 transition-all rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50" title="Open NCR Discussion Forum">
                                                    <MessageCircle size={18} />
                                                </button>
                                                {is8DRelated(ncr) && (
                                                    <button onClick={() => open8DForum(ncr)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-indigo-700 transition-all rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200" title="Open 8D Team Discussion">
                                                        <MessageCircle size={12} /> 8D Forum
                                                    </button>
                                                )}
                                                {ncr.status === 'READY_FOR_NCR2' && (
                                                    <Link to={`/form8?id=${ncr.id}&type=ncr2`} className="px-3 py-1.5 text-[10px] font-semibold text-white transition-all bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm" title="Fill NCR2 corrective action">
                                                        Fill NCR2
                                                    </Link>
                                                )}
                                                <Link to={`/ncr-view/${ncr.id}`} className="p-2 transition-all rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="View Details">
                                                    <Eye size={18} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {showForumModal && selectedAuditForForum && (
                <AuditCheckSheetNCRForumModal
                    auditId={selectedAuditForForum.id} auditNumber={selectedAuditForForum.auditNumber} auditTitle={selectedAuditForForum.auditType}
                    auditStatus={selectedAuditForForum.status} auditType={selectedAuditForForum.auditType} department={selectedAuditForForum.department}
                    auditorId={selectedAuditForForum.auditorId} auditorName={selectedAuditForForum.auditorName} auditeeId={selectedAuditForForum.auditeeId} auditeeName={selectedAuditForForum.auditeeName}
                    checkSheetId={selectedAuditForForum.checkSheetId} checkSheetName={selectedAuditForForum.checkSheetName} scheduledDate={selectedAuditForForum.scheduledDate}
                    fromDate={selectedAuditForForum.fromDate} toDate={selectedAuditForForum.toDate} startTime={selectedAuditForForum.startTime} endTime={selectedAuditForForum.endTime}
                    isOpen={showForumModal} onClose={() => { setShowForumModal(false); setSelectedAuditForForum(null); setSelectedFormForForum(null); }}
                    currentUser={user} allUsers={allUsersList} memberEmails={selectedAuditForForum.memberEmails || []}
                />
            )}
            {showNCRForumModal && selectedNCRForForum && (
                <AuditCheckSheetNCRForumModal
                    auditId={selectedNCRForForum.id} auditNumber={selectedNCRForForum.ncrNumber} auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
                    auditStatus={selectedNCRForForum.status} auditType="NCR Resolution" department={selectedNCRForForum.department}
                    auditorId={selectedNCRForForum.auditorId} auditorName={selectedNCRForForum.auditorName} auditeeId={selectedNCRForForum.auditeeId} auditeeName={selectedNCRForForum.auditeeName}
                    memberEmails={selectedNCRForForum.memberEmails || []} isOpen={showNCRForumModal}
                    onClose={() => { setShowNCRForumModal(false); setSelectedNCRForForum(null); }}
                    currentUser={user} allUsers={allUsersList}
                />
            )}
            <Drawer
                isOpen={show8DForumDrawer}
                onClose={() => { setShow8DForumDrawer(false); setSelected8DNCR(null); setEightDTeamMembers([]); }}
                title="8D Team Discussion" showHeader={false} className="w-full sm:w-[50vw]"
            >
                {selected8DNCR && (
                    <div className="h-full">
                        {loadingTeamMembers ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                                <span className="ml-2 text-sm text-slate-500">Loading team members...</span>
                            </div>
                        ) : (
                            <ForumThreadView
                                groupId={`8D-${selected8DNCR.ncrNumber}`} groupName={`8D-${selected8DNCR.ncrNumber}`} isInDrawer={true}
                                setForumDrawerOpen={setShow8DForumDrawer} username={user?.email || user?.username}
                                currentUser={user} allUsers={allUsersList} memberEmails={eightDTeamMembers} onBack={() => setShow8DForumDrawer(false)}
                            />
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default AuditeeDashboard;