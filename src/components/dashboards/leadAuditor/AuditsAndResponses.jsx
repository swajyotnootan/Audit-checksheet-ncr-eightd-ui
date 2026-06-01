// src/components/dashboards/LeadAuditorDashboard/AuditsAndResponses.jsx
import React, { useState } from 'react';
import { 
  FiSearch, FiEye, FiCheck, FiX, FiClock, FiAlertTriangle,
  FiGrid, FiList, FiFileText, FiCheckCircle, FiCalendar,
  FiRefreshCw
} from 'react-icons/fi';
import { Calendar, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const GlassCard = ({ children, className = "" }) => (
  <div className={`backdrop-blur-md bg-white/30 border border-white/30 rounded-2xl shadow-lg ${className}`}>
    {children}
  </div>
);

const ResponseCard = ({ response, allAuditors, onView, onReview, onViewDetail }) => {
  const answers = typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers;
  const auditor = allAuditors?.find(a => a.id === response.auditorId);
  const auditorName = auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A';
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };
  const getStatusColor = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50';
      case 'REJECTED': return 'bg-red-100/80 text-red-700 border-red-200/50';
      case 'SUBMITTED': return 'bg-blue-100/80 text-blue-700 border-blue-200/50';
      default: return 'bg-gray-100/80 text-gray-700 border-gray-200/50';
    }
  };
  return (
    <GlassCard className="p-4 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div><span className="font-mono text-xs font-medium text-gray-500">{answers?.documentNumber || `RES-${response.id}`}</span></div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm ${getStatusColor(response.status)}`}>
          {response.status || 'DRAFT'}
        </span>
      </div>
      <h4 className="font-semibold text-gray-800 truncate">{response.department || 'N/A'}</h4>
      <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Auditee:</span> {answers?.auditeeName || response.auditeeName || 'N/A'}</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="text-xs text-gray-500"><span className="font-medium">Score:</span> <span className={`font-semibold ${getScoreColor(response.percentageScore || 0)}`}>{(response.percentageScore || 0).toFixed(2)}%</span></div>
        <div className="text-xs text-gray-500"><span className="font-medium">Auditor:</span> {auditorName}</div>
      </div>
      <div className="flex gap-2 pt-2 mt-4 border-t border-white/30">
        <button onClick={() => onView(response)} className="flex-1 py-1.5 text-sm text-indigo-600 transition-colors rounded-lg bg-indigo-50/60 hover:bg-indigo-100/60 flex items-center justify-center gap-1">
          <FiEye size={14} /> View Report
        </button>
        {response.status === 'SUBMITTED' && (
          <button onClick={() => onReview(response)} className="flex-1 py-1.5 text-sm text-emerald-600 transition-colors rounded-lg bg-emerald-50/60 hover:bg-emerald-100/60 flex items-center justify-center gap-1">
            <FiCheck size={14} /> Review
          </button>
        )}
      </div>
    </GlassCard>
  );
};

const NCRCard = ({ ncr, onView }) => {
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-100/80 text-red-700 border-red-200/50';
      case 'MAJOR': return 'bg-orange-100/80 text-orange-700 border-orange-200/50';
      case 'MINOR': return 'bg-yellow-100/80 text-yellow-700 border-yellow-200/50';
      default: return 'bg-gray-100/80 text-gray-700 border-gray-200/50';
    }
  };
  const getStatusColor = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50';
      case 'IN_PROGRESS': return 'bg-purple-100/80 text-purple-700 border-purple-200/50';
      case 'OPEN': return 'bg-blue-100/80 text-blue-700 border-blue-200/50';
      case 'CLOSED': return 'bg-green-100/80 text-green-700 border-green-200/50';
      case 'REJECTED': return 'bg-red-100/80 text-red-700 border-red-200/50';
      case 'NCR2_IN_PROGRESS': return 'bg-amber-100/80 text-amber-700 border-amber-200/50';
      default: return 'bg-gray-100/80 text-gray-700 border-gray-200/50';
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
    <GlassCard className="p-4 transition-all duration-300 cursor-pointer hover:shadow-lg" onClick={() => onView(ncr)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm ${getSeverityColor(ncr.severity)}`}>
            <AlertCircle size={10} />{ncr.severity || 'NCR'}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm ${getStatusColor(ncr.status)}`}>
          {getStatusIcon(ncr.status)}{ncr.status || 'OPEN'}
        </span>
      </div>
      <h4 className="font-semibold text-gray-800 truncate">{ncr.ncrNumber || `NCR-${ncr.id}`}</h4>
      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{ncr.title || 'No title'}</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="text-xs text-gray-500"><span className="font-medium">Dept:</span> {ncr.department || 'N/A'}</div>
        <div className="text-xs text-gray-500"><span className="font-medium">Created:</span> {ncr.createdAt ? format(new Date(ncr.createdAt), 'dd-MM-yyyy') : 'N/A'}</div>
      </div>
      <div className="flex gap-2 pt-2 mt-3 border-t border-white/30">
        <button onClick={(e) => { e.stopPropagation(); onView(ncr); }} className="flex-1 py-1.5 text-sm text-indigo-600 transition-colors rounded-lg bg-indigo-50/60 hover:bg-indigo-100/60 flex items-center justify-center gap-1">
          <FiEye size={14} /> View Details
        </button>
      </div>
    </GlassCard>
  );
};

const AuditsAndResponses = ({ 
  activeTab, allSchedules, allNCRs, allResponses, allAuditors, stats,
  searchTerm, setSearchTerm, responseViewMode, setResponseViewMode,
  ncrViewMode, setNcrViewMode, onViewResponse, onReviewResponse, onViewNCR, onViewResponseDetail, leadAuditorDepartment
}) => {
  const getStatusBadge = (status) => {
    const badges = {
      'SCHEDULED': 'bg-blue-100/80 text-blue-700', 'IN_PROGRESS': 'bg-amber-100/80 text-amber-700',
      'COMPLETED': 'bg-green-100/80 text-green-700', 'APPROVED': 'bg-emerald-100/80 text-emerald-700',
      'REJECTED': 'bg-red-100/80 text-red-700', 'DRAFT': 'bg-gray-100/80 text-gray-700'
    };
    return badges[status] || 'bg-gray-100/80 text-gray-700';
  };

  const getResponseStatusBadge = (status) => {
    const badges = { 
      'APPROVED': 'bg-emerald-100/80 text-emerald-700', 'REJECTED': 'bg-red-100/80 text-red-700', 
      'SUBMITTED': 'bg-blue-100/80 text-blue-700', 'DRAFT': 'bg-gray-100/80 text-gray-700' 
    };
    return badges[status] || 'bg-gray-100/80 text-gray-700';
  };

  const getSeverityBadge = (severity) => {
    const badges = { 'CRITICAL': 'bg-red-100/80 text-red-700', 'MAJOR': 'bg-orange-100/80 text-orange-700', 'MINOR': 'bg-yellow-100/80 text-yellow-700' };
    return badges[severity] || 'bg-gray-100/80 text-gray-700';
  };

  const getNCRStatusBadge = (status) => {
    const badges = { 
      'OPEN': 'bg-blue-100/80 text-blue-700', 'IN_PROGRESS': 'bg-purple-100/80 text-purple-700', 
      'APPROVED': 'bg-emerald-100/80 text-emerald-700', 'CLOSED': 'bg-green-100/80 text-green-700', 
      'REJECTED': 'bg-red-100/80 text-red-700',
      'NCR2_IN_PROGRESS': 'bg-amber-100/80 text-amber-700'
    };
    return badges[status] || 'bg-gray-100/80 text-gray-700';
  };

  // Helper function to get auditor name from ID
  const getAuditorName = (auditorId) => {
    if (!auditorId) return 'N/A';
    const auditor = allAuditors?.find(a => a.id === auditorId);
    if (auditor) {
      return `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username || 'N/A';
    }
    return 'N/A';
  };

  // Helper function to get co-auditors names
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

  // Helper function to get lead auditor name
  const getLeadAuditorName = (schedule) => {
    if (schedule.leadAuditorName) return schedule.leadAuditorName;
    if (schedule.createdByName) return schedule.createdByName;
    return null;
  };

  // Filter schedules to only show those with a scheduled date and time
  const getFilteredSchedules = () => {
    let schedules = allSchedules;
    
    // Filter by search term if provided
    if (searchTerm) {
      schedules = schedules.filter(s => 
        s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Only return schedules that have a scheduled date and time
    // Also include COMPLETED, APPROVED, REJECTED statuses as they were scheduled
    return schedules.filter(s => {
      // Must have a scheduled date
      if (!s.scheduledDate) return false;
      
      // Optional: Filter by status - show all statuses that were once scheduled
      // This includes SCHEDULED, IN_PROGRESS, COMPLETED, APPROVED, REJECTED
      // Exclude DRAFT and other non-scheduled statuses
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

  if (activeTab === 'audits') {
    const scheduledAudits = getFilteredSchedules();
    
    return (
      <>
        <div className="mb-5">
          <div className="relative">
            <FiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search audits by department or auditee..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full py-3 pl-10 pr-4 border border-white/30 rounded-xl bg-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
        </div>
        
        {scheduledAudits.length === 0 ? (
          <div className="py-20 text-center border shadow-lg backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-gray-400 to-gray-600">
              <FiCalendar className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-medium text-gray-700">No Scheduled Audits</p>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm 
                ? `No scheduled audits match "${searchTerm}"` 
                : 'No audits have been scheduled with date and time'}
            </p>
          </div>
        ) : (
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/30">
                  <tr>
                    <th className="px-5 py-3 text-xs text-left">Department</th>
                    <th className="px-5 py-3 text-xs text-left">Auditor(s)</th>
                    <th className="px-5 py-3 text-xs text-left">Auditee</th>
                    <th className="px-5 py-3 text-xs text-left">Date & Time</th>
                    <th className="px-5 py-3 text-xs text-left">Status</th>
                    <th className="px-5 py-3 text-xs text-left">Overdue</th>
                  </tr>
                </thead>
                <tbody>
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
                    
                    // Format date and time together
                    const formatDateTime = () => {
                      if (!s.scheduledDate) return 'Not Scheduled';
                      const date = format(new Date(s.scheduledDate), 'dd MMM yyyy');
                      if (s.startTime && s.endTime) {
                        return `${date} • ${s.startTime} - ${s.endTime}`;
                      }
                      return date;
                    };
                    
                    return (
                      <tr key={s.id} className="transition-colors hover:bg-white/20">
                        <td className="px-5 py-3 font-medium text-gray-800">{s.department || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <div className="text-gray-600">{auditorDisplay}</div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{s.auditeeName || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar size={12} className="text-gray-400" />
                            {formatDateTime()}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium backdrop-blur-sm ${getStatusBadge(s.status)}`}>
                            {getStatusIcon(s.status)}{s.status || 'DRAFT'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-white bg-red-500/90 backdrop-blur-sm border border-red-400/50">
                              <AlertCircle size={10} />Overdue
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </>
    );
  }

  if (activeTab === 'responses') {
    return (
      <>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="relative flex-1">
            <FiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search responses by document number, department, auditee..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full py-3 pl-10 pr-4 border border-white/30 rounded-xl bg-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex gap-1 p-1 border backdrop-blur-xl bg-white/50 rounded-xl border-white/30">
            <button onClick={() => setResponseViewMode('grid')} className={`p-2 rounded-lg transition-all ${responseViewMode === 'grid' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View"><FiGrid size={16} /></button>
            <button onClick={() => setResponseViewMode('list')} className={`p-2 rounded-lg transition-all ${responseViewMode === 'list' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><FiList size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex justify-between">
              <div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{allResponses.length}</p></div>
              <div className="p-2 rounded-lg bg-blue-100/60"><FiFileText className="w-5 h-5 text-blue-600" /></div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex justify-between">
              <div><p className="text-sm text-gray-500">APPROVED</p><p className="text-2xl font-bold text-emerald-600">{stats.responsesApproved}</p></div>
              <div className="p-2 rounded-lg bg-emerald-100/60"><FiCheckCircle className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex justify-between">
              <div><p className="text-sm text-gray-500">REJECTED</p><p className="text-2xl font-bold text-red-600">{stats.responsesRejected}</p></div>
              <div className="p-2 rounded-lg bg-red-100/60"><FiX className="w-5 h-5 text-red-600" /></div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex justify-between">
              <div><p className="text-sm text-gray-500">SUBMITTED</p><p className="text-2xl font-bold text-amber-600">{stats.responsesSubmitted}</p></div>
              <div className="p-2 rounded-lg bg-amber-100/60"><FiClock className="w-5 h-5 text-amber-600" /></div>
            </div>
          </GlassCard>
        </div>

        {responseViewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResponses.length === 0 ? (
              <div className="py-20 text-center border shadow-lg col-span-full backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-gray-400 to-gray-600">
                  <FiFileText className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-medium text-gray-700">No responses found</p>
                <p className="mt-1 text-sm text-gray-400">No check sheet responses match your search</p>
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

        {responseViewMode === 'list' && (
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/30">
                  <tr>
                    <th className="px-5 py-3 text-xs text-left">Document</th>
                    <th className="px-5 py-3 text-xs text-left">Department</th>
                    <th className="px-5 py-3 text-xs text-left">Auditor</th>
                    <th className="px-5 py-3 text-xs text-left">Auditee</th>
                    <th className="px-5 py-3 text-xs text-left">Score</th>
                    <th className="px-5 py-3 text-xs text-left">Status</th>
                    <th className="px-5 py-3 text-xs text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResponses.length === 0 ? (
                    <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-400">No responses found</td></tr>
                  ) : (
                    filteredResponses.map(r => { 
                      const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers; 
                      const auditor = allAuditors.find(a => a.id === r.auditorId); 
                      return (
                        <tr key={r.id} className="hover:bg-white/20">
                          <td className="px-5 py-3 font-medium">{answers?.documentNumber || `RES-${r.id}`}</td>
                          <td className="px-5 py-3">{r.department || 'N/A'}</td>
                          <td className="px-5 py-3">{auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A'}</td>
                          <td className="px-5 py-3">{answers?.auditeeName || r.auditeeName}</td>
                          <td className="px-5 py-3"><span className={`font-semibold ${(r.percentageScore || 0) >= 80 ? 'text-emerald-600' : (r.percentageScore || 0) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{(r.percentageScore || 0).toFixed(2)}%</span></td>
                          <td className="px-5 py-3"><span className={`px-2 py-1 text-xs rounded-full ${getResponseStatusBadge(r.status)}`}>{r.status || 'DRAFT'}</span></td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => onViewResponse(r)} className="text-xs text-indigo-600">View</button>
                              {r.status === 'SUBMITTED' && (<button onClick={() => onReviewResponse(r)} className="text-xs text-emerald-600">Review</button>)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </>
    );
  }

  if (activeTab === 'ncrs') {
    // Calculate NCR statistics
    const criticalCount = allNCRs.filter(n => n.severity === 'CRITICAL').length;
    const majorCount = allNCRs.filter(n => n.severity === 'MAJOR').length;
    const minorCount = allNCRs.filter(n => n.severity === 'MINOR').length;
    const openCount = allNCRs.filter(n => n.status === 'OPEN' || n.status === 'IN_PROGRESS' || n.status === 'NCR2_IN_PROGRESS').length;
    const closedCount = allNCRs.filter(n => n.status === 'CLOSED').length;
    
    return (
      <>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="relative flex-1">
            <FiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search NCRs by number, title, department..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full py-3 pl-10 pr-4 border border-white/30 rounded-xl bg-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex gap-1 p-1 border backdrop-blur-xl bg-white/50 rounded-xl border-white/30">
            <button onClick={() => setNcrViewMode('grid')} className={`p-2 rounded-lg transition-all ${ncrViewMode === 'grid' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View"><FiGrid size={16} /></button>
            <button onClick={() => setNcrViewMode('list')} className={`p-2 rounded-lg transition-all ${ncrViewMode === 'list' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><FiList size={16} /></button>
          </div>
        </div>

        {/* NCR Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-5">
          <GlassCard className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total NCRs</p>
                <p className="text-2xl font-bold text-gray-800">{allNCRs.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-100/60"><FiAlertTriangle className="w-5 h-5 text-gray-600" /></div>
            </div>
          </GlassCard>
          <GlassCard className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Critical</p>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-100/60"><AlertCircle className="w-5 h-5 text-red-600" /></div>
            </div>
          </GlassCard>
          <GlassCard className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Major</p>
                <p className="text-2xl font-bold text-orange-600">{majorCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100/60"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
            </div>
          </GlassCard>
          <GlassCard className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Minor</p>
                <p className="text-2xl font-bold text-yellow-600">{minorCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-100/60"><AlertCircle className="w-5 h-5 text-yellow-600" /></div>
            </div>
          </GlassCard>
          <GlassCard className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Open / In Progress</p>
                <p className="text-2xl font-bold text-purple-600">{openCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100/60"><FiClock className="w-5 h-5 text-purple-600" /></div>
            </div>
          </GlassCard>
        </div>

        {/* Progress Bar */}
        {allNCRs.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between mb-1 text-xs text-gray-500">
              <span>Closure Progress</span>
              <span>{Math.round((closedCount / allNCRs.length) * 100)}% Closed</span>
            </div>
            <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
              <div 
                className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                style={{ width: `${(closedCount / allNCRs.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {ncrViewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredNCRs.length === 0 ? (
              <div className="py-20 text-center border shadow-lg col-span-full backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-gray-400 to-gray-600">
                  <FiAlertTriangle className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-medium text-gray-700">No NCRs found</p>
                <p className="mt-1 text-sm text-gray-400">
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

        {ncrViewMode === 'list' && (
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/30">
                  <tr>
                    <th className="px-5 py-3 text-xs text-left">NCR #</th>
                    <th className="px-5 py-3 text-xs text-left">Title</th>
                    <th className="px-5 py-3 text-xs text-left">Department</th>
                    <th className="px-5 py-3 text-xs text-left">Severity</th>
                    <th className="px-5 py-3 text-xs text-left">Status</th>
                    <th className="px-5 py-3 text-xs text-left">Created</th>
                    <th className="px-5 py-3 text-xs text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNCRs.length === 0 ? (
                    <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-400">No NCRs found</td></tr>
                  ) : (
                    filteredNCRs.map(ncr => (
                      <tr key={ncr.id} className="transition-colors cursor-pointer hover:bg-white/20" onClick={() => onViewNCR(ncr)}>
                        <td className="px-5 py-3 font-medium text-gray-800">{ncr.ncrNumber || `NCR-${ncr.id}`}</td>
                        <td className="max-w-xs px-5 py-3 text-gray-600 truncate">{ncr.title || 'N/A'}</td>
                        <td className="px-5 py-3 text-gray-600">{ncr.department || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getSeverityBadge(ncr.severity)}`}>
                            {ncr.severity || 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getNCRStatusBadge(ncr.status)}`}>
                            {ncr.status || 'OPEN'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {ncr.createdAt ? format(new Date(ncr.createdAt), 'dd-MM-yyyy') : 'N/A'}
                        </td>
                        <td className="px-5 py-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onViewNCR(ncr); }} 
                            className="text-sm text-indigo-600 hover:text-indigo-800"
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
          </GlassCard>
        )}
      </>
    );
  }

  return null;
};

export default AuditsAndResponses;