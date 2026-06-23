// src/components/dashboards/LeadAuditorDashboard/AuditsAndResponses.jsx
import React, { useState } from 'react';
import { 
  FiSearch, FiEye, FiCheck, FiX, FiClock, FiAlertTriangle, 
  FiGrid, FiList, FiFileText, FiCheckCircle, FiCalendar 
} from 'react-icons/fi';
import { Calendar, Play, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

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
  white: '#ffffff'
};

// ============================================================================
// CLEAN CARD COMPONENT (Replaces GlassCard)
// ============================================================================
const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 shadow-sm rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

// ============================================================================
// RESPONSE CARD
// ============================================================================
const ResponseCard = ({ response, allAuditors, onView, onReview }) => {
  const answers = typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers;
  const auditor = allAuditors?.find(a => a.id === response.auditorId);
  const auditorName = auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A';

  return (
    <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 !p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-mono text-xs font-medium text-slate-500">
            {answers?.documentNumber || `RES-${response.id}`}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
          response.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
          response.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' : 
          'bg-blue-100 text-blue-700 border-blue-200'
        }`}>
          {response.status || 'DRAFT'}
        </span>
      </div>
      
      <h4 className="font-semibold truncate text-slate-800">{response.department || 'N/A'}</h4>
      <p className="mt-1 text-sm text-slate-600">
        <span className="font-medium">Auditee:</span> {answers?.auditeeName || response.auditeeName || 'N/A'}
      </p>
      
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="text-xs text-slate-500">
          <span className="font-medium">Score:</span> 
          <span className="ml-1 font-semibold" style={{ color: NAVBAR_COLORS.primary }}>
            {(response.percentageScore || 0).toFixed(2)}%
          </span>
        </div>
        <div className="text-xs text-slate-500">
          <span className="font-medium">Auditor:</span> {auditorName}
        </div>
      </div>
      
      <div className="flex gap-2 pt-3 mt-4 border-t border-slate-100">
        <button 
          onClick={() => onView(response)} 
          className="flex-1 py-1.5 text-sm font-medium transition-colors rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1 text-slate-700"
        >
          <FiEye size={14} /> View
        </button>
        {response.status === 'SUBMITTED' && (
          <button 
            onClick={() => onReview(response)} 
            className="flex-1 py-1.5 text-sm text-white font-medium transition-colors rounded-lg shadow-sm flex items-center justify-center gap-1" 
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            <FiCheck size={14} /> Review
          </button>
        )}
      </div>
    </Card>
  );
};

// ============================================================================
// NCR CARD
// ============================================================================
const NCRCard = ({ ncr, onView }) => {
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'MAJOR': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MINOR': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'OPEN': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CLOSED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'NCR2_IN_PROGRESS': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'APPROVED': return <CheckCircle size={12} className="mr-1" />;
      case 'CLOSED': return <CheckCircle size={12} className="mr-1" />;
      case 'IN_PROGRESS': return <Play size={12} className="mr-1" />;
      case 'NCR2_IN_PROGRESS': return <Clock size={12} className="mr-1" />;
      case 'OPEN': return <AlertCircle size={12} className="mr-1" />;
      default: return null;
    }
  };
  
  return (
    <Card className="!p-4 transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1" onClick={() => onView(ncr)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getSeverityColor(ncr.severity)}`}>
            <AlertCircle size={10} />{ncr.severity || 'NCR'}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(ncr.status)}`}>
          {getStatusIcon(ncr.status)}{ncr.status || 'OPEN'}
        </span>
      </div>
      
      <h4 className="font-semibold truncate text-slate-800">{ncr.ncrNumber || `NCR-${ncr.id}`}</h4>
      
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="text-xs text-slate-500"><span className="font-medium">Dept:</span> {ncr.department || 'N/A'}</div>
        <div className="text-xs text-slate-500"><span className="font-medium">Created:</span> {ncr.createdAt ? format(new Date(ncr.createdAt), 'dd-MM-yyyy') : 'N/A'}</div>
      </div>
      
      <div className="flex gap-2 pt-3 mt-4 border-t border-slate-100">
        <button 
          onClick={(e) => { e.stopPropagation(); onView(ncr); }} 
          className="flex-1 py-1.5 text-sm font-medium transition-colors rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1 text-slate-700"
        >
          <FiEye size={14} /> View Details
        </button>
      </div>
    </Card>
  );
};

// ============================================================================
// MAIN AUDITS AND RESPONSES COMPONENT
// ============================================================================
const AuditsAndResponses = ({ 
  activeTab, allSchedules, allNCRs, allResponses, allAuditors, stats,
  searchTerm, setSearchTerm, responseViewMode, setResponseViewMode,
  ncrViewMode, setNcrViewMode, onViewResponse, onReviewResponse, onViewNCR, onViewResponseDetail, leadAuditorDepartment
}) => {
  
  // --- Badge Helpers ---
  const getStatusBadge = (status) => {
    const badges = {
      'SCHEDULED': 'bg-blue-100 text-blue-700 border-blue-200', 
      'IN_PROGRESS': 'bg-amber-100 text-amber-700 border-amber-200',
      'COMPLETED': 'bg-green-100 text-green-700 border-green-200', 
      'APPROVED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'REJECTED': 'bg-red-100 text-red-700 border-red-200', 
      'DRAFT': 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return badges[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getResponseStatusBadge = (status) => {
    const badges = { 
      'APPROVED': 'bg-emerald-100 text-emerald-700 border-emerald-200', 
      'REJECTED': 'bg-red-100 text-red-700 border-red-200', 
      'SUBMITTED': 'bg-blue-100 text-blue-700 border-blue-200', 
      'DRAFT': 'bg-slate-100 text-slate-700 border-slate-200' 
    };
    return badges[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getSeverityBadge = (severity) => {
    const badges = { 
      'CRITICAL': 'bg-red-100 text-red-700 border-red-200', 
      'MAJOR': 'bg-orange-100 text-orange-700 border-orange-200', 
      'MINOR': 'bg-yellow-100 text-yellow-700 border-yellow-200' 
    };
    return badges[severity] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getNCRStatusBadge = (status) => {
    const badges = { 
      'OPEN': 'bg-blue-100 text-blue-700 border-blue-200', 
      'IN_PROGRESS': 'bg-purple-100 text-purple-700 border-purple-200', 
      'APPROVED': 'bg-emerald-100 text-emerald-700 border-emerald-200', 
      'CLOSED': 'bg-green-100 text-green-700 border-green-200', 
      'REJECTED': 'bg-red-100 text-red-700 border-red-200',
      'NCR2_IN_PROGRESS': 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return badges[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // --- Data Helpers ---
  const getAuditorName = (auditorId) => {
    if (!auditorId) return 'N/A';
    const auditor = allAuditors?.find(a => a.id === auditorId);
    if (auditor) {
      return `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username || 'N/A';
    }
    return 'N/A';
  };

  const getCoAuditorNames = (coAuditorIds) => {
    if (!coAuditorIds) return null;
    let auditorIds = [];
    if (Array.isArray(coAuditorIds)) {
      auditorIds = coAuditorIds;
    } else if (typeof coAuditorIds === 'string') {
      try {
        const parsed = JSON.parse(coAuditorIds);
        auditorIds = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        if (coAuditorIds.includes(',')) {
          auditorIds = coAuditorIds.split(',').map(id => {
            const numId = parseInt(id.trim());
            return isNaN(numId) ? id.trim() : numId;
          });
        } else {
          const numId = parseInt(coAuditorIds);
          auditorIds = [isNaN(numId) ? coAuditorIds : numId];
        }
      }
    } else if (typeof coAuditorIds === 'number') {
      auditorIds = [coAuditorIds];
    }
    if (!auditorIds.length) return null;
    const names = auditorIds.map(id => {
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      const auditor = allAuditors?.find(a => a.id === numericId);
      if (auditor) {
        return `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username;
      }
      return null;
    }).filter(Boolean);
    return names.length > 0 ? names : null;
  };

  const getLeadAuditorName = (schedule) => {
    if (schedule.leadAuditorName) return schedule.leadAuditorName;
    if (schedule.createdByName) return schedule.createdByName;
    return null;
  };

  const getFilteredSchedules = () => {
    let schedules = allSchedules;
    if (searchTerm) {
      schedules = schedules.filter(s => 
        s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return schedules.filter(s => {
      if (!s.scheduledDate) return false;
      const scheduledStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'];
      return scheduledStatuses.includes(s.status);
    });
  };

  const filteredResponses = allResponses.filter(r => { 
    if (!searchTerm) return true; 
    const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers; 
    return r.department?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           r.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           answers?.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()); 
  });

  const filteredNCRs = allNCRs.filter(n => {
    if (!searchTerm) return true;
    return n.ncrNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           n.department?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // ========================================================================
  // RENDER: AUDITS TAB
  // ========================================================================
  if (activeTab === 'audits') {
    const scheduledAudits = getFilteredSchedules();
    
    return (
      <>
        <div className="mb-5">
          <div className="relative">
            <FiSearch className="absolute -translate-y-1/2 text-slate-400 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search audits by department or auditee..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full py-3 pl-10 pr-4 transition-all bg-white border shadow-sm border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
        </div>
        
        {scheduledAudits.length === 0 ? (
          <div className="py-20 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100">
              <FiCalendar className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-lg font-medium text-slate-700">No Scheduled Audits</p>
            <p className="mt-1 text-sm text-slate-500">
              {searchTerm 
                ? `No scheduled audits match "${searchTerm}"` 
                : 'No audits have been scheduled with date and time'}
            </p>
          </div>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b bg-slate-50 border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Department</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Auditor(s)</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Auditee</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Date & Time</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduledAudits.map(s => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let isOverdue = false;
                    if (s.scheduledDate && s.status !== 'COMPLETED' && s.status !== 'APPROVED' && s.status !== 'REJECTED') {
                      const scheduledDate = new Date(s.scheduledDate);
                      scheduledDate.setHours(0, 0, 0, 0);
                      isOverdue = scheduledDate < today;
                    }
                    
                    const getStatusIcon = (status) => {
                      switch(status) {
                        case 'SCHEDULED': return <Calendar size={10} className="mr-1" />;
                        case 'IN_PROGRESS': return <Play size={10} className="mr-1" />;
                        case 'COMPLETED': return <CheckCircle size={10} className="mr-1" />;
                        case 'APPROVED': return <CheckCircle size={10} className="mr-1" />;
                        case 'REJECTED': return <XCircle size={10} className="mr-1" />;
                        default: return null;
                      }
                    };
                    
                    const primaryAuditorName = getAuditorName(s.auditorId);
                    const coAuditorNames = getCoAuditorNames(s.coAuditorIds);
                    const leadAuditorName = getLeadAuditorName(s);
                    
                    let auditorDisplay = primaryAuditorName;
                    if (coAuditorNames && coAuditorNames.length > 0) {
                      auditorDisplay += `, ${coAuditorNames.join(', ')}`;
                    }
                    if (leadAuditorName && leadAuditorName !== primaryAuditorName) {
                      auditorDisplay += ` (Lead: ${leadAuditorName})`;
                    }
                    
                    const formatDateTime = () => {
                      if (!s.scheduledDate) return 'Not Scheduled';
                      const date = format(new Date(s.scheduledDate), 'dd MMM yyyy');
                      if (s.startTime && s.endTime) {
                        return `${date} • ${s.startTime} - ${s.endTime}`;
                      }
                      return date;
                    };
                    
                    return (
                      <tr key={s.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-800">{s.department || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <div className="text-sm text-slate-600">{auditorDisplay}</div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{s.auditeeName || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDateTime()}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(s.status)}`}>
                            {getStatusIcon(s.status)}{s.status || 'DRAFT'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-red-500 border border-red-600 shadow-sm">
                              <AlertCircle size={10} />Overdue
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </>
    );
  }

  // ========================================================================
  // RENDER: RESPONSES TAB
  // ========================================================================
  if (activeTab === 'responses') {
    return (
      <>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="relative flex-1">
            <FiSearch className="absolute -translate-y-1/2 text-slate-400 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search responses by document number, department, auditee..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full py-3 pl-10 pr-4 transition-all bg-white border shadow-sm border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          <div className="flex gap-1 p-1 border shadow-sm border-slate-200 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setResponseViewMode('grid')} 
              className={`p-2 rounded-lg transition-all ${responseViewMode === 'grid' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`} 
              style={responseViewMode === 'grid' ? { backgroundColor: NAVBAR_COLORS.primary } : {}}
              title="Grid View"
            >
              <FiGrid size={16} />
            </button>
            <button 
              onClick={() => setResponseViewMode('list')} 
              className={`p-2 rounded-lg transition-all ${responseViewMode === 'list' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`} 
              style={responseViewMode === 'list' ? { backgroundColor: NAVBAR_COLORS.primary } : {}}
              title="List View"
            >
              <FiList size={16} />
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">{allResponses.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50"><FiFileText className="w-5 h-5 text-blue-600" /></div>
            </div>
          </Card>
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">APPROVED</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.responsesApproved}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50"><FiCheckCircle className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </Card>
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">REJECTED</p>
                <p className="text-2xl font-bold text-red-600">{stats.responsesRejected}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50"><FiX className="w-5 h-5 text-red-600" /></div>
            </div>
          </Card>
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">SUBMITTED</p>
                <p className="text-2xl font-bold text-amber-600">{stats.responsesSubmitted}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50"><FiClock className="w-5 h-5 text-amber-600" /></div>
            </div>
          </Card>
        </div>

        {/* Grid View */}
        {responseViewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResponses.length === 0 ? (
              <div className="py-20 text-center bg-white border shadow-sm border-slate-200 rounded-2xl col-span-full">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100">
                  <FiFileText className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-lg font-medium text-slate-700">No responses found</p>
                <p className="mt-1 text-sm text-slate-500">No check sheet responses match your search</p>
              </div>
            ) : (
              filteredResponses.map(r => (
                <ResponseCard 
                  key={r.id} 
                  response={r} 
                  allAuditors={allAuditors} 
                  onView={onViewResponse} 
                  onReview={onReviewResponse} 
                  onViewDetail={onViewResponseDetail} 
                />
              ))
            )}
          </div>
        )}

        {/* List View */}
        {responseViewMode === 'list' && (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b bg-slate-50 border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Document</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Department</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Auditor</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Auditee</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Score</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResponses.length === 0 ? (
                    <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400">No responses found</td></tr>
                  ) : (
                    filteredResponses.map(r => { 
                      const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers; 
                      const auditor = allAuditors.find(a => a.id === r.auditorId); 
                      return (
                        <tr key={r.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">{answers?.documentNumber || `RES-${r.id}`}</td>
                          <td className="px-5 py-3 text-slate-600">{r.department || 'N/A'}</td>
                          <td className="px-5 py-3 text-slate-600">{auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A'}</td>
                          <td className="px-5 py-3 text-slate-600">{answers?.auditeeName || r.auditeeName}</td>
                          <td className="px-5 py-3">
                            <span className={`font-semibold ${(r.percentageScore || 0) >= 80 ? 'text-emerald-600' : (r.percentageScore || 0) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                              {(r.percentageScore || 0).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-lg border font-medium ${getResponseStatusBadge(r.status)}`}>
                              {r.status || 'DRAFT'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-3">
                              <button onClick={() => onViewResponse(r)} className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-800">View</button>
                              {r.status === 'SUBMITTED' && (
                                <button onClick={() => onReviewResponse(r)} className="text-xs font-medium transition-colors text-emerald-600 hover:text-emerald-800">Review</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </>
    );
  }

  // ========================================================================
  // RENDER: NCRS TAB
  // ========================================================================
  if (activeTab === 'ncrs') {
    const criticalCount = allNCRs.filter(n => n.severity === 'CRITICAL').length;
    const majorCount = allNCRs.filter(n => n.severity === 'MAJOR').length;
    const minorCount = allNCRs.filter(n => n.severity === 'MINOR').length;
    const openCount = allNCRs.filter(n => n.status === 'OPEN' || n.status === 'IN_PROGRESS' || n.status === 'NCR2_IN_PROGRESS').length;
    const closedCount = allNCRs.filter(n => n.status === 'CLOSED').length;
    
    return (
      <>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="relative flex-1">
            <FiSearch className="absolute -translate-y-1/2 text-slate-400 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search NCRs by number, title, department..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full py-3 pl-10 pr-4 transition-all bg-white border shadow-sm border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          <div className="flex gap-1 p-1 border shadow-sm border-slate-200 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setNcrViewMode('grid')} 
              className={`p-2 rounded-lg transition-all ${ncrViewMode === 'grid' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`} 
              style={ncrViewMode === 'grid' ? { backgroundColor: NAVBAR_COLORS.primary } : {}}
              title="Grid View"
            >
              <FiGrid size={16} />
            </button>
            <button 
              onClick={() => setNcrViewMode('list')} 
              className={`p-2 rounded-lg transition-all ${ncrViewMode === 'list' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`} 
              style={ncrViewMode === 'list' ? { backgroundColor: NAVBAR_COLORS.primary } : {}}
              title="List View"
            >
              <FiList size={16} />
            </button>
          </div>
        </div>

        {/* NCR Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-5">
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total NCRs</p>
                <p className="text-2xl font-bold text-slate-800">{allNCRs.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-100"><FiAlertTriangle className="w-5 h-5 text-slate-600" /></div>
            </div>
          </Card>
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Critical</p>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50"><AlertCircle className="w-5 h-5 text-red-600" /></div>
            </div>
          </Card>
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Major</p>
                <p className="text-2xl font-bold text-orange-600">{majorCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
            </div>
          </Card>
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Minor</p>
                <p className="text-2xl font-bold text-yellow-600">{minorCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-50"><AlertCircle className="w-5 h-5 text-yellow-600" /></div>
            </div>
          </Card>
          <Card className="!p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Open / In Progress</p>
                <p className="text-2xl font-bold text-purple-600">{openCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50"><FiClock className="w-5 h-5 text-purple-600" /></div>
            </div>
          </Card>
        </div>

        {/* Progress Bar */}
        {allNCRs.length > 0 && (
          <div className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
            <div className="flex justify-between mb-2 text-xs font-medium text-slate-600">
              <span>Closure Progress</span>
              <span>{Math.round((closedCount / allNCRs.length) * 100)}% Closed</span>
            </div>
            <div className="w-full h-2.5 overflow-hidden bg-slate-200 rounded-full">
              <div 
                className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                style={{ width: `${(closedCount / allNCRs.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Grid View */}
        {ncrViewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredNCRs.length === 0 ? (
              <div className="py-20 text-center bg-white border shadow-sm border-slate-200 rounded-2xl col-span-full">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100">
                  <FiAlertTriangle className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-lg font-medium text-slate-700">No NCRs found</p>
                <p className="mt-1 text-sm text-slate-500">
                  {leadAuditorDepartment 
                    ? `No non-conformity reports found for ${leadAuditorDepartment} department` 
                    : 'No non-conformity reports match your search'}
                </p>
              </div>
            ) : (
              filteredNCRs.map(ncr => <NCRCard key={ncr.id} ncr={ncr} onView={onViewNCR} />)
            )}
          </div>
        )}

        {/* List View */}
        {ncrViewMode === 'list' && (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b bg-slate-50 border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">NCR #</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Department</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Created</th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNCRs.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400">No NCRs found</td></tr>
                  ) : (
                    filteredNCRs.map(ncr => (
                      <tr key={ncr.id} className="transition-colors cursor-pointer hover:bg-slate-50" onClick={() => onViewNCR(ncr)}>
                        <td className="px-5 py-3 font-medium text-slate-800">{ncr.ncrNumber || `NCR-${ncr.id}`}</td>
                        <td className="px-5 py-3 text-slate-600">{ncr.department || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-lg border font-medium ${getNCRStatusBadge(ncr.status)}`}>
                            {ncr.status || 'OPEN'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {ncr.createdAt ? format(new Date(ncr.createdAt), 'dd-MM-yyyy') : 'N/A'}
                        </td>
                        <td className="px-5 py-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onViewNCR(ncr); }} 
                            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </>
    );
  }

  return null;
};

export default AuditsAndResponses;