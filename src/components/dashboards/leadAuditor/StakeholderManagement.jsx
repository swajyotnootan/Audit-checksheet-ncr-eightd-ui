// src/components/dashboards/LeadAuditorDashboard/StakeholderManagement.jsx
import React, { useState } from 'react';
import { FiUsers, FiUserCheck, FiEye, FiFileText, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../ToastContext';

const GlassCard = ({ children, className = "" }) => (
  <div className={`backdrop-blur-md bg-white/30 border border-white/30 rounded-2xl shadow-lg ${className}`}>
    {children}
  </div>
);

const getSeverityBadge = (severity) => {
  const badges = { 'CRITICAL': 'bg-red-100/80 text-red-700', 'MAJOR': 'bg-orange-100/80 text-orange-700', 'MINOR': 'bg-yellow-100/80 text-yellow-700' };
  return badges[severity] || 'bg-gray-100/80 text-gray-700';
};

const getNCRStatusBadge = (status) => {
  const badges = { 
    'OPEN': 'bg-blue-100/80 text-blue-700', 'IN_PROGRESS': 'bg-purple-100/80 text-purple-700', 
    'APPROVED': 'bg-emerald-100/80 text-emerald-700', 'CLOSED': 'bg-green-100/80 text-green-700', 
    'REJECTED': 'bg-red-100/80 text-red-700' 
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

const LoadingSpinner = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-2 rounded-full animate-spin border-t-indigo-600"></div>
  </div>
);

const StakeholderManagement = ({ 
  activeTab,
  allAuditors, 
  allAuditees, 
  allSchedules, 
  allResponses, 
  allNCRs,
  onViewResponse, 
  onViewNCR, 
  onViewResponseDetail,
  leadAuditorDepartment
}) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [showAuditorResponsesModal, setShowAuditorResponsesModal] = useState(false);
  const [showAuditorNCRsModal, setShowAuditorNCRsModal] = useState(false);
  const [selectedAuditorData, setSelectedAuditorData] = useState(null);
  
  const [showAuditeeResponsesModal, setShowAuditeeResponsesModal] = useState(false);
  const [showAuditeeNCRsModal, setShowAuditeeNCRsModal] = useState(false);
  const [selectedAuditeeData, setSelectedAuditeeData] = useState(null);

  const getViewPath = (response) => {
    const checkSheetName = response.checkSheet?.name?.toLowerCase() || '';
    const answers = typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers;
    const formName = answers?.formName?.toLowerCase() || '';
    if (checkSheetName.includes('5s') || formName.includes('5s') || formName.includes('5s audit')) return `/fives-view/${response.id}`;
    else if (checkSheetName.includes('manufacturing') || formName.includes('manufacturing') || formName.includes('manufacturing process')) return `/manufacturing-view/${response.id}`;
    else return `/iatf-view/${response.id}`;
  };

  // Get responses for a specific auditor from the already filtered allResponses
  const getAuditorResponses = (auditorId) => {
    return allResponses.filter(r => r.auditorId === auditorId);
  };

  // Get NCRs for a specific auditor from the already filtered allNCRs
  const getAuditorNCRs = (auditorId) => {
    return allNCRs.filter(n => n.auditorId === auditorId);
  };

  // Get responses for auditee
  const getAuditeeResponses = (auditeeId) => {
    return allResponses.filter(r => r.auditeeId === auditeeId);
  };

  // Get NCRs for auditee
  const getAuditeeNCRs = (auditeeId) => {
    return allNCRs.filter(n => n.auditeeId === auditeeId);
  };

  // Calculate summary for auditor
  const getAuditorSummary = (auditorId) => {
    const responses = getAuditorResponses(auditorId);
    const total = responses.length;
    const approved = responses.filter(r => r.status === 'APPROVED').length;
    const rejected = responses.filter(r => r.status === 'REJECTED').length;
    const submitted = responses.filter(r => r.status === 'SUBMITTED').length;
    const avgScore = total > 0 
      ? responses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / total 
      : 0;
    
    return {
      total,
      approved,
      rejected,
      pending: submitted,
      approvalRate: total > 0 ? (approved * 100 / total) : 0,
      avgScore: avgScore.toFixed(1)
    };
  };

  // Calculate summary for auditee
  const getAuditeeSummary = (auditeeId) => {
    const responses = getAuditeeResponses(auditeeId);
    const total = responses.length;
    const approved = responses.filter(r => r.status === 'APPROVED').length;
    const rejected = responses.filter(r => r.status === 'REJECTED').length;
    const submitted = responses.filter(r => r.status === 'SUBMITTED').length;
    const avgScore = total > 0 
      ? responses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / total 
      : 0;
    
    return {
      total,
      approved,
      rejected,
      pending: submitted,
      approvalRate: total > 0 ? (approved * 100 / total) : 0,
      avgScore: avgScore.toFixed(1)
    };
  };

  const handleViewAuditorResponses = (auditor) => {
    setSelectedAuditorData(auditor);
    setShowAuditorResponsesModal(true);
  };

  const handleViewAuditorNCRs = (auditor) => {
    setSelectedAuditorData(auditor);
    setShowAuditorNCRsModal(true);
  };

  const handleViewAuditeeResponses = (auditee) => {
    setSelectedAuditeeData(auditee);
    setShowAuditeeResponsesModal(true);
  };

  const handleViewAuditeeNCRs = (auditee) => {
    setSelectedAuditeeData(auditee);
    setShowAuditeeNCRsModal(true);
  };

  // ==================== RENDER ONLY AUDITORS TAB ====================
  if (activeTab === 'auditors') {
    // Filter regular auditors (non-lead) from the department
    const onlyRegularAuditors = allAuditors.filter(auditor => 
      (auditor.role === 'AUDITOR' || 
       auditor.userType === 'AUDITOR' ||
       auditor.role?.toLowerCase() === 'auditor') &&
      !auditor.role?.toLowerCase().includes('lead') &&
      !auditor.userType?.toLowerCase().includes('lead')
    );

    console.log('📊 Regular Auditors:', onlyRegularAuditors.length);
    console.log('📊 All Responses available:', allResponses.length);

    return (
      <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {onlyRegularAuditors.map(auditor => {
            const auditorResponsesList = getAuditorResponses(auditor.id);
            const auditorResponses = auditorResponsesList.length;
            const auditorResponsesApproved = auditorResponsesList.filter(r => r.status === 'APPROVED').length;
            const auditorResponsesSubmitted = auditorResponsesList.filter(r => r.status === 'SUBMITTED').length;
            const auditorNCRsList = getAuditorNCRs(auditor.id);
            const auditorNCRs = auditorNCRsList.length;
            const auditorNCRsOpen = auditorNCRsList.filter(n => n.status === 'OPEN').length;
            const auditorNCRsClosed = auditorNCRsList.filter(n => n.status === 'CLOSED').length;
            const assignedAudits = allSchedules.filter(s => s.auditorId === auditor.id).length;
            
            return (
              <GlassCard key={auditor.id} className="p-5 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center text-xl font-bold text-white w-14 h-14 rounded-xl bg-gradient-to-r from-indigo-500/80 to-purple-600/80">
                    {(auditor.firstName?.[0] || auditor.username?.[0] || 'A').toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{auditor.firstName} {auditor.lastName}</h4>
                    <p className="text-xs text-gray-500">{auditor.role || 'Auditor'}</p>
                    <p className="text-xs text-gray-400">{auditor.email || ''}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 text-center rounded-lg bg-blue-50/60">
                    <p className="text-xl font-bold text-blue-600">{assignedAudits}</p>
                    <p className="text-xs text-gray-500">Assigned Audits</p>
                  </div>
                  <div className="p-2 text-center rounded-lg bg-purple-50/60">
                    <p className="text-xl font-bold text-purple-600">{auditorResponses}</p>
                    <p className="text-xs text-gray-500">Responses</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-3 text-xs">
                  <div className="flex-1 p-1.5 text-center rounded-lg bg-emerald-50/60">
                    <p className="font-semibold text-emerald-600">{auditorResponsesApproved}</p>
                    <p className="text-[10px] text-gray-500">Approved</p>
                  </div>
                  <div className="flex-1 p-1.5 text-center rounded-lg bg-amber-50/60">
                    <p className="font-semibold text-amber-600">{auditorResponsesSubmitted}</p>
                    <p className="text-[10px] text-gray-500">Pending</p>
                  </div>
                </div>
                
                {auditorNCRs > 0 && (
                  <div className="p-2 mb-3 text-center rounded-lg bg-red-50/60">
                    <p className="text-sm font-semibold text-red-600">{auditorNCRs} Total NCRs</p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-red-700">Open: {auditorNCRsOpen}</span>
                      <span className="text-green-700">Closed: {auditorNCRsClosed}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => handleViewAuditorResponses(auditor)} 
                    className="flex items-center justify-center flex-1 gap-1 py-2 text-sm text-indigo-600 transition-colors rounded-lg bg-indigo-50/60 hover:bg-indigo-100/60"
                  >
                    <FiFileText className="w-3 h-3" /> Responses ({auditorResponses})
                  </button>
                  <button 
                    onClick={() => handleViewAuditorNCRs(auditor)} 
                    className="flex items-center justify-center flex-1 gap-1 py-2 text-sm text-red-600 transition-colors rounded-lg bg-red-50/60 hover:bg-red-100/60"
                  >
                    <FiAlertTriangle className="w-3 h-3" /> NCRs ({auditorNCRs})
                  </button>
                </div>
              </GlassCard>
            );
          })}
          
          {onlyRegularAuditors.length === 0 && (
            <div className="py-20 text-center border shadow-lg col-span-full backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-gray-400 to-gray-600">
                <FiUsers className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-medium text-gray-700">No Auditors Found</p>
              <p className="mt-1 text-sm text-gray-400">
                {leadAuditorDepartment 
                  ? `No auditors found for ${leadAuditorDepartment} department` 
                  : 'No auditors are currently registered in the system'}
              </p>
            </div>
          )}
        </div>

        {/* Auditor Responses Modal - Using local data instead of API */}
        {showAuditorResponsesModal && selectedAuditorData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-lg shadow-xl">
              <div className="px-6 py-4 rounded-t-lg bg-purple-950 bg-gradient-to-r">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Responses by {selectedAuditorData.firstName} {selectedAuditorData.lastName}
                    </h3>
                    <p className="text-sm text-white/80">
                      {getAuditorResponses(selectedAuditorData.id).length} total responses
                    </p>
                  </div>
                  <button 
                    onClick={() => { 
                      setShowAuditorResponsesModal(false); 
                      setSelectedAuditorData(null); 
                    }} 
                    className="text-xl text-white hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Summary Stats */}
              {(() => {
                const summary = getAuditorSummary(selectedAuditorData.id);
                return (
                  <div className="grid grid-cols-1 gap-3 p-4 border-b md:grid-cols-5">
                    <div className="p-3 text-center rounded-lg bg-blue-50/60">
                      <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
                      <p className="text-xs">Total</p>
                    </div>
                    <div className="p-3 text-center rounded-lg bg-emerald-50/60">
                      <p className="text-2xl font-bold text-emerald-600">{summary.approved}</p>
                      <p className="text-xs">APPROVED</p>
                    </div>
                    <div className="p-3 text-center rounded-lg bg-red-50/60">
                      <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
                      <p className="text-xs">REJECTED</p>
                    </div>
                    <div className="p-3 text-center rounded-lg bg-amber-50/60">
                      <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
                      <p className="text-xs">SUBMITTED</p>
                    </div>
                    <div className="p-3 text-center rounded-lg bg-purple-50/60">
                      <p className="text-2xl font-bold text-purple-600">{summary.approvalRate.toFixed(1)}%</p>
                      <p className="text-xs">Approval Rate</p>
                    </div>
                  </div>
                );
              })()}
              
              <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
                {(() => {
                  const responses = getAuditorResponses(selectedAuditorData.id);
                  if (responses.length === 0) {
                    return (
                      <div className="py-12 text-center text-gray-400">
                        <FiFileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No responses found for this auditor</p>
                        <p className="mt-1 text-xs">Check if the auditor has submitted any responses</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {responses.map(r => {
                        const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
                        return (
                          <div key={r.id} className="p-3 transition-all duration-300 border rounded-lg hover:shadow-md">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-mono text-xs font-medium text-gray-500">
                                {answers?.documentNumber || `RES-${r.id}`}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${getResponseStatusBadge(r.status)}`}>
                                {r.status || 'DRAFT'}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-800">{r.department || 'N/A'}</h4>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Auditee:</span> {answers?.auditeeName || r.auditeeName || 'N/A'}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-xs text-gray-500">
                                Score: <span className="font-semibold text-indigo-600">{(r.percentageScore || 0).toFixed(1)}%</span>
                              </div>
                              <button 
                                onClick={() => { 
                                  onViewResponse(r); 
                                  setShowAuditorResponsesModal(false); 
                                }} 
                                className="px-3 py-1 text-xs text-indigo-600 transition-colors rounded bg-indigo-50/60 hover:bg-indigo-100/60"
                              >
                                <FiEye className="inline w-3 h-3 mr-1" /> View Report
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Auditor NCRs Modal */}
        {showAuditorNCRsModal && selectedAuditorData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-lg shadow-xl">
              <div className="px-6 py-4 rounded-t-lg bg-gradient-to-r from-red-600/80 to-rose-600/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      NCRs by {selectedAuditorData.firstName} {selectedAuditorData.lastName}
                    </h3>
                    <p className="text-sm text-white/80">
                      {getAuditorNCRs(selectedAuditorData.id).length} total NCRs
                    </p>
                  </div>
                  <button 
                    onClick={() => { 
                      setShowAuditorNCRsModal(false); 
                      setSelectedAuditorData(null); 
                    }} 
                    className="text-xl text-white hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
                {(() => {
                  const ncrs = getAuditorNCRs(selectedAuditorData.id);
                  if (ncrs.length === 0) {
                    return (
                      <div className="py-12 text-center text-gray-400">
                        <FiAlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No NCRs found for this auditor</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {ncrs.map(ncr => (
                        <div key={ncr.id} className="p-3 transition-all duration-300 border rounded-lg hover:shadow-md">
                          <div className="flex items-start justify-between mb-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityBadge(ncr.severity)}`}>
                              {ncr.severity || 'NCR'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getNCRStatusBadge(ncr.status)}`}>
                              {ncr.status || 'OPEN'}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-800 truncate">{ncr.ncrNumber || `NCR-${ncr.id}`}</h4>
                          {/* <p className="mt-1 text-sm text-gray-600 line-clamp-2">{ncr.title || 'No title'}</p> */}
                          <div className="flex justify-between mt-2 text-xs">
                            <span className="text-gray-500">Dept: {ncr.department || 'N/A'}</span>
                            <button 
                              onClick={() => { 
                                onViewNCR(ncr); 
                                setShowAuditorNCRsModal(false); 
                              }} 
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              <FiEye className="inline w-3 h-3 mr-1" /> View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==================== RENDER ONLY AUDITEES TAB ====================
  if (activeTab === 'auditees') {
    const onlyAuditees = allAuditees.filter(auditee => 
      auditee.role === 'AUDITEE' || 
      auditee.userType === 'AUDITEE' ||
      auditee.role?.toLowerCase() === 'auditee'
    );

    return (
      <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {onlyAuditees.map(auditee => {
            const auditeeResponsesList = getAuditeeResponses(auditee.id);
            const auditeeResponses = auditeeResponsesList.length;
            const auditeeResponsesApproved = auditeeResponsesList.filter(r => r.status === 'APPROVED').length;
            const auditeeResponsesRejected = auditeeResponsesList.filter(r => r.status === 'REJECTED').length;
            const auditeeResponsesSubmitted = auditeeResponsesList.filter(r => r.status === 'SUBMITTED').length;
            const auditeeNCRsList = getAuditeeNCRs(auditee.id);
            const auditeeNCRs = auditeeNCRsList.length;
            const auditeeNCRsOpen = auditeeNCRsList.filter(n => n.status === 'OPEN').length;
            const auditeeNCRsClosed = auditeeNCRsList.filter(n => n.status === 'CLOSED').length;
            const assignedAudits = allSchedules.filter(s => s.auditeeId === auditee.id).length;
            
            return (
              <GlassCard key={auditee.id} className="p-5 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center text-xl font-bold text-white w-14 h-14 rounded-xl bg-gradient-to-r from-green-500/80 to-emerald-600/80">
                    {(auditee.firstName?.[0] || auditee.username?.[0] || 'E').toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{auditee.firstName} {auditee.lastName}</h4>
                    <p className="text-xs text-gray-500">{auditee.role || 'Auditee'}</p>
                    <p className="text-xs text-gray-400">{auditee.email || ''}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 text-center rounded-lg bg-blue-50/60">
                    <p className="text-xl font-bold text-blue-600">{assignedAudits}</p>
                    <p className="text-xs text-gray-500">Total Audits</p>
                  </div>
                  <div className="p-2 text-center rounded-lg bg-purple-50/60">
                    <p className="text-xl font-bold text-purple-600">{auditeeResponses}</p>
                    <p className="text-xs text-gray-500">Responses</p>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-3 text-xs">
                  <div className="flex-1 p-1.5 text-center rounded-lg bg-emerald-50/60">
                    <p className="font-semibold text-emerald-600">{auditeeResponsesApproved}</p>
                    <p className="text-[10px] text-gray-500">Approved</p>
                  </div>
                  <div className="flex-1 p-1.5 text-center rounded-lg bg-amber-50/60">
                    <p className="font-semibold text-amber-600">{auditeeResponsesSubmitted}</p>
                    <p className="text-[10px] text-gray-500">Pending</p>
                  </div>
                  <div className="flex-1 p-1.5 text-center rounded-lg bg-red-50/60">
                    <p className="font-semibold text-red-600">{auditeeResponsesRejected}</p>
                    <p className="text-[10px] text-gray-500">Rejected</p>
                  </div>
                </div>
                
                {auditeeNCRs > 0 && (
                  <div className="p-2 mb-3 text-center rounded-lg bg-red-50/60">
                    <p className="text-sm font-semibold text-red-600">{auditeeNCRs} Total NCRs</p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-red-700">Open: {auditeeNCRsOpen}</span>
                      <span className="text-green-700">Closed: {auditeeNCRsClosed}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => handleViewAuditeeResponses(auditee)} 
                    className="flex items-center justify-center flex-1 gap-1 py-2 text-sm text-indigo-600 transition-colors rounded-lg bg-indigo-50/60 hover:bg-indigo-100/60"
                  >
                    <FiFileText className="w-3 h-3" /> Responses ({auditeeResponses})
                  </button>
                  <button 
                    onClick={() => handleViewAuditeeNCRs(auditee)} 
                    className="flex items-center justify-center flex-1 gap-1 py-2 text-sm text-red-600 transition-colors rounded-lg bg-red-50/60 hover:bg-red-100/60"
                  >
                    <FiAlertTriangle className="w-3 h-3" /> NCRs ({auditeeNCRs})
                  </button>
                </div>
              </GlassCard>
            );
          })}
          
          {onlyAuditees.length === 0 && (
            <div className="py-20 text-center border shadow-lg col-span-full backdrop-blur-xl bg-white/80 rounded-2xl border-white/30">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-lg rounded-2xl backdrop-blur-sm bg-gradient-to-br from-gray-400 to-gray-600">
                <FiUserCheck className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-medium text-gray-700">No Auditees Found</p>
              <p className="mt-1 text-sm text-gray-400">
                {leadAuditorDepartment 
                  ? `No auditees found for ${leadAuditorDepartment} department` 
                  : 'No auditees are currently registered in the system'}
              </p>
            </div>
          )}
        </div>

        {/* Auditee Responses Modal */}
          {showAuditeeResponsesModal && selectedAuditeeData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-lg shadow-xl">
                <div className="px-6 py-4 rounded-t-lg bg-gradient-to-r from-green-600/80 to-emerald-600/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Responses by {selectedAuditeeData.firstName} {selectedAuditeeData.lastName}
                      </h3>
                      <p className="text-sm text-white/80">
                        {getAuditeeResponses(selectedAuditeeData.id).length} total responses
                      </p>
                    </div>
                    <button 
                      onClick={() => { 
                        setShowAuditeeResponsesModal(false); 
                        setSelectedAuditeeData(null); 
                      }} 
                      className="text-xl text-white hover:text-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                {(() => {
                  const summary = getAuditeeSummary(selectedAuditeeData.id);
                  return (
                    <div className="grid grid-cols-1 gap-3 p-4 border-b md:grid-cols-5">
                      <div className="p-3 text-center rounded-lg bg-blue-50/60">
                        <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
                        <p className="text-xs">Total</p>
                      </div>
                      <div className="p-3 text-center rounded-lg bg-emerald-50/60">
                        <p className="text-2xl font-bold text-emerald-600">{summary.approved}</p>
                        <p className="text-xs">APPROVED</p>
                      </div>
                      <div className="p-3 text-center rounded-lg bg-red-50/60">
                        <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
                        <p className="text-xs">REJECTED</p>
                      </div>
                      <div className="p-3 text-center rounded-lg bg-amber-50/60">
                        <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
                        <p className="text-xs">SUBMITTED</p>
                      </div>
                      <div className="p-3 text-center rounded-lg bg-purple-50/60">
                        <p className="text-2xl font-bold text-purple-600">{summary.approvalRate.toFixed(1)}%</p>
                        <p className="text-xs">Approval Rate</p>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
                  {(() => {
                    const responses = getAuditeeResponses(selectedAuditeeData.id);
                    if (responses.length === 0) {
                      return (
                        <div className="py-12 text-center text-gray-400">
                          <FiFileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No responses found for this auditee</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {responses.map(r => {
                          const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
                          const auditor = allAuditors.find(a => a.id === r.auditorId);
                          const auditorName = auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A';
                          return (
                            <div key={r.id} className="p-3 transition-all duration-300 border rounded-lg hover:shadow-md">
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-mono text-xs font-medium text-gray-500">
                                  {answers?.documentNumber || `RES-${r.id}`}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getResponseStatusBadge(r.status)}`}>
                                  {r.status || 'DRAFT'}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-800">{r.department || 'N/A'}</h4>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Auditor:</span> {auditorName}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <div className="text-xs text-gray-500">
                                  Score: <span className="font-semibold text-indigo-600">{(r.percentageScore || 0).toFixed(1)}%</span>
                                </div>
                                <button 
                                  onClick={() => { 
                                    onViewResponse(r); 
                                    setShowAuditeeResponsesModal(false); 
                                  }} 
                                  className="px-3 py-1 text-xs text-indigo-600 transition-colors rounded bg-indigo-50/60 hover:bg-indigo-100/60"
                                >
                                  <FiEye className="inline w-3 h-3 mr-1" /> View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Auditee NCRs Modal */}
          {showAuditeeNCRsModal && selectedAuditeeData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-lg shadow-xl">
                <div className="px-6 py-4 rounded-t-lg bg-gradient-to-r from-red-600/80 to-rose-600/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        NCRs Against {selectedAuditeeData.firstName} {selectedAuditeeData.lastName}
                      </h3>
                      <p className="text-sm text-white/80">
                        {getAuditeeNCRs(selectedAuditeeData.id).length} total NCRs
                      </p>
                    </div>
                    <button 
                      onClick={() => { 
                        setShowAuditeeNCRsModal(false); 
                        setSelectedAuditeeData(null); 
                      }} 
                      className="text-xl text-white hover:text-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
                  {(() => {
                    const ncrs = getAuditeeNCRs(selectedAuditeeData.id);
                    if (ncrs.length === 0) {
                      return (
                        <div className="py-12 text-center text-gray-400">
                          <FiAlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No NCRs found against this auditee</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {ncrs.map(ncr => {
                          const auditor = allAuditors.find(a => a.id === ncr.auditorId);
                          const auditorName = auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A';
                          return (
                            <div key={ncr.id} className="p-3 transition-all duration-300 border rounded-lg hover:shadow-md">
                              <div className="flex items-start justify-between mb-2">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityBadge(ncr.severity)}`}>
                                  {ncr.severity || 'NCR'}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getNCRStatusBadge(ncr.status)}`}>
                                  {ncr.status || 'OPEN'}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-800 truncate">{ncr.ncrNumber || `NCR-${ncr.id}`}</h4>
                              {/* <p className="mt-1 text-sm text-gray-600 line-clamp-2">{ncr.title || 'No title'}</p> */}
                              <div className="flex justify-between mt-2 text-xs">
                                <span className="text-gray-500">Raised by: {auditorName}</span>
                                <button 
                                  onClick={() => { 
                                    onViewNCR(ncr); 
                                    setShowAuditeeNCRsModal(false); 
                                  }} 
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  <FiEye className="inline w-3 h-3 mr-1" /> View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
      </>
    );
  }

  return null;
};

export default StakeholderManagement;