// src/components/dashboards/LeadAuditorDashboard/StakeholderManagement.jsx
import React, { useState } from 'react';
import { FiUsers, FiUserCheck, FiEye, FiFileText, FiAlertTriangle, FiRefreshCw, FiX } from 'react-icons/fi';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../ToastContext';

// ============================================================================
// COLOR PALETTE (Clean MNC Professional Look)
// ============================================================================
const NAVBAR_COLORS = {
  primary: '#00529B',    // Professional Blue
  secondary: '#3b82f6',  // Lighter Blue
  dark: '#1e3a8a',       // Deep Navy
  light: '#60a5fa',      // Soft Blue
  lighter: '#93c5fd',    // Pale Blue
  bg: '#eff6ff',         // Faint Blue Background
  white: '#ffffff'
};

// ============================================================================
// CLEAN CARD COMPONENT
// ============================================================================
const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 shadow-sm rounded-xl ${className}`}>
    {children}
  </div>
);

// ============================================================================
// BADGE HELPERS (Subtle, professional colors)
// ============================================================================
const getSeverityBadge = (severity) => {
  const badges = { 
    'CRITICAL': 'bg-red-50 text-red-700 border-red-100', 
    'MAJOR': 'bg-orange-50 text-orange-700 border-orange-100', 
    'MINOR': 'bg-yellow-50 text-yellow-700 border-yellow-100' 
  };
  return badges[severity] || 'bg-slate-50 text-slate-700 border-slate-100';
};

const getNCRStatusBadge = (status) => {
  const badges = { 
    'OPEN': 'bg-blue-50 text-blue-700 border-blue-100', 
    'IN_PROGRESS': 'bg-purple-50 text-purple-700 border-purple-100', 
    'APPROVED': 'bg-emerald-50 text-emerald-700 border-emerald-100', 
    'CLOSED': 'bg-slate-50 text-slate-700 border-slate-100', 
    'REJECTED': 'bg-red-50 text-red-700 border-red-100' 
  };
  return badges[status] || 'bg-slate-50 text-slate-700 border-slate-100';
};

const getResponseStatusBadge = (status) => {
  const badges = { 
    'APPROVED': 'bg-emerald-50 text-emerald-700 border-emerald-100', 
    'REJECTED': 'bg-red-50 text-red-700 border-red-100', 
    'SUBMITTED': 'bg-blue-50 text-blue-700 border-blue-100', 
    'DRAFT': 'bg-slate-50 text-slate-700 border-slate-100' 
  };
  return badges[status] || 'bg-slate-50 text-slate-700 border-slate-100';
};

const LoadingSpinner = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-2 rounded-full animate-spin border-slate-200" style={{ borderTopColor: NAVBAR_COLORS.primary }}></div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
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

  const getAuditorResponses = (auditorId) => allResponses.filter(r => r.auditorId === auditorId);
  const getAuditorNCRs = (auditorId) => allNCRs.filter(n => n.auditorId === auditorId);
  const getAuditeeResponses = (auditeeId) => allResponses.filter(r => r.auditeeId === auditeeId);
  const getAuditeeNCRs = (auditeeId) => allNCRs.filter(n => n.auditeeId === auditeeId);

  const getAuditorSummary = (auditorId) => {
    const responses = getAuditorResponses(auditorId);
    const total = responses.length;
    const approved = responses.filter(r => r.status === 'APPROVED').length;
    const rejected = responses.filter(r => r.status === 'REJECTED').length;
    const submitted = responses.filter(r => r.status === 'SUBMITTED').length;
    const avgScore = total > 0 ? responses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / total : 0;
    return { total, approved, rejected, pending: submitted, approvalRate: total > 0 ? (approved * 100 / total) : 0, avgScore: avgScore.toFixed(1) };
  };

  const getAuditeeSummary = (auditeeId) => {
    const responses = getAuditeeResponses(auditeeId);
    const total = responses.length;
    const approved = responses.filter(r => r.status === 'APPROVED').length;
    const rejected = responses.filter(r => r.status === 'REJECTED').length;
    const submitted = responses.filter(r => r.status === 'SUBMITTED').length;
    const avgScore = total > 0 ? responses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / total : 0;
    return { total, approved, rejected, pending: submitted, approvalRate: total > 0 ? (approved * 100 / total) : 0, avgScore: avgScore.toFixed(1) };
  };

  const handleViewAuditorResponses = (auditor) => { setSelectedAuditorData(auditor); setShowAuditorResponsesModal(true); };
  const handleViewAuditorNCRs = (auditor) => { setSelectedAuditorData(auditor); setShowAuditorNCRsModal(true); };
  const handleViewAuditeeResponses = (auditee) => { setSelectedAuditeeData(auditee); setShowAuditeeResponsesModal(true); };
  const handleViewAuditeeNCRs = (auditee) => { setSelectedAuditeeData(auditee); setShowAuditeeNCRsModal(true); };

  // ==================== RENDER AUDITORS TAB ====================
  if (activeTab === 'auditors') {
    const onlyRegularAuditors = allAuditors.filter(auditor => 
      (auditor.role === 'AUDITOR' || auditor.userType === 'AUDITOR' || auditor.role?.toLowerCase() === 'auditor') &&
      !auditor.role?.toLowerCase().includes('lead') && !auditor.userType?.toLowerCase().includes('lead')
    );

    return (
      <>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <Card key={auditor.id} className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-lg shadow-sm" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                    {(auditor.firstName?.[0] || auditor.username?.[0] || 'A').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold truncate text-slate-800">{auditor.firstName} {auditor.lastName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{auditor.role || 'Auditor'} • {auditor.email || 'No email'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 border rounded-lg bg-slate-50 border-slate-100">
                    <p className="text-xl font-bold text-slate-800">{assignedAudits}</p>
                    <p className="mt-1 text-xs text-slate-500">Assigned Audits</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 border-slate-100">
                    <p className="text-xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{auditorResponses}</p>
                    <p className="mt-1 text-xs text-slate-500">Responses</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 p-2 text-center border rounded-lg bg-emerald-50 border-emerald-100">
                    <p className="text-sm font-bold text-emerald-700">{auditorResponsesApproved}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Approved</p>
                  </div>
                  <div className="flex-1 p-2 text-center border rounded-lg bg-amber-50 border-amber-100">
                    <p className="text-sm font-bold text-amber-700">{auditorResponsesSubmitted}</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Pending</p>
                  </div>
                </div>
                
                {auditorNCRs > 0 && (
                  <div className="p-3 mb-4 border border-red-100 rounded-lg bg-red-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-red-700">{auditorNCRs} Total NCRs</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-red-600">Open: {auditorNCRsOpen}</span>
                        <span className="text-emerald-600">Closed: {auditorNCRsClosed}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleViewAuditorResponses(auditor)} className="flex items-center justify-center flex-1 gap-1.5 py-2 text-xs font-medium transition-colors rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                    <FiFileText className="w-3.5 h-3.5" /> Responses
                  </button>
                  <button onClick={() => handleViewAuditorNCRs(auditor)} className="flex items-center justify-center flex-1 gap-1.5 py-2 text-xs font-medium transition-colors rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                    <FiAlertTriangle className="w-3.5 h-3.5" /> NCRs
                  </button>
                </div>
              </Card>
            );
          })}
          
          {onlyRegularAuditors.length === 0 && (
            <div className="py-20 text-center bg-white border shadow-sm border-slate-200 rounded-xl col-span-full">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100">
                <FiUsers className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-700">No Auditors Found</p>
              <p className="mt-1 text-sm text-slate-500">
                {leadAuditorDepartment ? `No auditors found for ${leadAuditorDepartment} department` : 'No auditors are currently registered in the system'}
              </p>
            </div>
          )}
        </div>

        {/* Auditor Responses Modal */}
        {showAuditorResponsesModal && selectedAuditorData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-xl shadow-2xl animate-scaleIn">
              <div className="px-6 py-4 rounded-t-xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Responses by {selectedAuditorData.firstName} {selectedAuditorData.lastName}</h3>
                    <p className="text-sm text-white/80">{getAuditorResponses(selectedAuditorData.id).length} total responses</p>
                  </div>
                  <button onClick={() => { setShowAuditorResponsesModal(false); setSelectedAuditorData(null); }} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 p-4 border-b border-slate-100 md:grid-cols-5 bg-slate-50">
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-slate-800">{getAuditorSummary(selectedAuditorData.id).total}</p>
                  <p className="mt-1 text-xs text-slate-500">Total</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-emerald-600">{getAuditorSummary(selectedAuditorData.id).approved}</p>
                  <p className="mt-1 text-xs text-slate-500">APPROVED</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-red-600">{getAuditorSummary(selectedAuditorData.id).rejected}</p>
                  <p className="mt-1 text-xs text-slate-500">REJECTED</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-amber-600">{getAuditorSummary(selectedAuditorData.id).pending}</p>
                  <p className="mt-1 text-xs text-slate-500">SUBMITTED</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{getAuditorSummary(selectedAuditorData.id).approvalRate.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-slate-500">Approval Rate</p>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-180px)] p-4 bg-slate-50/50">
                {getAuditorResponses(selectedAuditorData.id).length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FiFileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-600">No responses found for this auditor</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {getAuditorResponses(selectedAuditorData.id).map(r => {
                      const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
                      return (
                        <div key={r.id} className="p-4 transition-all duration-200 bg-white border rounded-lg border-slate-200 hover:shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-mono text-xs font-medium text-slate-500">{answers?.documentNumber || `RES-${r.id}`}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-md border font-medium ${getResponseStatusBadge(r.status)}`}>{r.status || 'DRAFT'}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800">{r.department || 'N/A'}</h4>
                          <p className="mt-1 text-xs text-slate-500"><span className="font-medium text-slate-600">Auditee:</span> {answers?.auditeeName || r.auditeeName || 'N/A'}</p>
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500">Score: <span className="font-semibold text-slate-800">{(r.percentageScore || 0).toFixed(1)}%</span></div>
                            <button onClick={() => { onViewResponse(r); setShowAuditorResponsesModal(false); }} className="px-3 py-1.5 text-xs font-medium transition-colors rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5">
                              <FiEye className="w-3 h-3" /> View Report
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auditor NCRs Modal */}
        {showAuditorNCRsModal && selectedAuditorData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-xl shadow-2xl animate-scaleIn">
              <div className="px-6 py-4 rounded-t-xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">NCRs by {selectedAuditorData.firstName} {selectedAuditorData.lastName}</h3>
                    <p className="text-sm text-white/80">{getAuditorNCRs(selectedAuditorData.id).length} total NCRs</p>
                  </div>
                  <button onClick={() => { setShowAuditorNCRsModal(false); setSelectedAuditorData(null); }} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-100px)] p-4 bg-slate-50/50">
                {getAuditorNCRs(selectedAuditorData.id).length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FiAlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-600">No NCRs found for this auditor</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {getAuditorNCRs(selectedAuditorData.id).map(ncr => (
                      <div key={ncr.id} className="p-4 transition-all duration-200 bg-white border rounded-lg border-slate-200 hover:shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded-md border font-medium ${getSeverityBadge(ncr.severity)}`}>{ncr.severity || 'NCR'}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-md border font-medium ${getNCRStatusBadge(ncr.status)}`}>{ncr.status || 'OPEN'}</span>
                        </div>
                        <h4 className="text-sm font-semibold truncate text-slate-800">{ncr.ncrNumber || `NCR-${ncr.id}`}</h4>
                        <div className="flex justify-between pt-3 mt-3 text-xs border-t border-slate-100">
                          <span className="text-slate-500">Dept: {ncr.department || 'N/A'}</span>
                          <button onClick={() => { onViewNCR(ncr); setShowAuditorNCRsModal(false); }} className="font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5">
                            <FiEye className="w-3 h-3" /> View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==================== RENDER AUDITEES TAB ====================
  if (activeTab === 'auditees') {
    const onlyAuditees = allAuditees.filter(auditee => 
      auditee.role === 'AUDITEE' || auditee.userType === 'AUDITEE' || auditee.role?.toLowerCase() === 'auditee'
    );

    return (
      <>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <Card key={auditee.id} className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-lg shadow-sm" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                    {(auditee.firstName?.[0] || auditee.username?.[0] || 'E').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold truncate text-slate-800">{auditee.firstName} {auditee.lastName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{auditee.role || 'Auditee'} • {auditee.email || 'No email'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 border rounded-lg bg-slate-50 border-slate-100">
                    <p className="text-xl font-bold text-slate-800">{assignedAudits}</p>
                    <p className="mt-1 text-xs text-slate-500">Total Audits</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 border-slate-100">
                    <p className="text-xl font-bold text-emerald-600">{auditeeResponses}</p>
                    <p className="mt-1 text-xs text-slate-500">Responses</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 p-2 text-center border rounded-lg bg-emerald-50 border-emerald-100">
                    <p className="text-sm font-bold text-emerald-700">{auditeeResponsesApproved}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Approved</p>
                  </div>
                  <div className="flex-1 p-2 text-center border rounded-lg bg-amber-50 border-amber-100">
                    <p className="text-sm font-bold text-amber-700">{auditeeResponsesSubmitted}</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Pending</p>
                  </div>
                  <div className="flex-1 p-2 text-center border border-red-100 rounded-lg bg-red-50">
                    <p className="text-sm font-bold text-red-700">{auditeeResponsesRejected}</p>
                    <p className="text-[10px] text-red-600 mt-0.5">Rejected</p>
                  </div>
                </div>
                
                {auditeeNCRs > 0 && (
                  <div className="p-3 mb-4 border border-red-100 rounded-lg bg-red-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-red-700">{auditeeNCRs} Total NCRs</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-red-600">Open: {auditeeNCRsOpen}</span>
                        <span className="text-emerald-600">Closed: {auditeeNCRsClosed}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleViewAuditeeResponses(auditee)} className="flex items-center justify-center flex-1 gap-1.5 py-2 text-xs font-medium transition-colors rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                    <FiFileText className="w-3.5 h-3.5" /> Responses
                  </button>
                  <button onClick={() => handleViewAuditeeNCRs(auditee)} className="flex items-center justify-center flex-1 gap-1.5 py-2 text-xs font-medium transition-colors rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                    <FiAlertTriangle className="w-3.5 h-3.5" /> NCRs
                  </button>
                </div>
              </Card>
            );
          })}
          
          {onlyAuditees.length === 0 && (
            <div className="py-20 text-center bg-white border shadow-sm border-slate-200 rounded-xl col-span-full">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100">
                <FiUserCheck className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-700">No Auditees Found</p>
              <p className="mt-1 text-sm text-slate-500">
                {leadAuditorDepartment ? `No auditees found for ${leadAuditorDepartment} department` : 'No auditees are currently registered in the system'}
              </p>
            </div>
          )}
        </div>

        {/* Auditee Responses Modal */}
        {showAuditeeResponsesModal && selectedAuditeeData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-xl shadow-2xl animate-scaleIn">
              <div className="px-6 py-4 rounded-t-xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Responses by {selectedAuditeeData.firstName} {selectedAuditeeData.lastName}</h3>
                    <p className="text-sm text-white/80">{getAuditeeResponses(selectedAuditeeData.id).length} total responses</p>
                  </div>
                  <button onClick={() => { setShowAuditeeResponsesModal(false); setSelectedAuditeeData(null); }} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 p-4 border-b border-slate-100 md:grid-cols-5 bg-slate-50">
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-slate-800">{getAuditeeSummary(selectedAuditeeData.id).total}</p>
                  <p className="mt-1 text-xs text-slate-500">Total</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-emerald-600">{getAuditeeSummary(selectedAuditeeData.id).approved}</p>
                  <p className="mt-1 text-xs text-slate-500">APPROVED</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-red-600">{getAuditeeSummary(selectedAuditeeData.id).rejected}</p>
                  <p className="mt-1 text-xs text-slate-500">REJECTED</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold text-amber-600">{getAuditeeSummary(selectedAuditeeData.id).pending}</p>
                  <p className="mt-1 text-xs text-slate-500">SUBMITTED</p>
                </div>
                <div className="p-3 text-center bg-white border rounded-lg shadow-sm border-slate-200">
                  <p className="text-xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{getAuditeeSummary(selectedAuditeeData.id).approvalRate.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-slate-500">Approval Rate</p>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-180px)] p-4 bg-slate-50/50">
                {getAuditeeResponses(selectedAuditeeData.id).length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FiFileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-600">No responses found for this auditee</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {getAuditeeResponses(selectedAuditeeData.id).map(r => {
                      const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
                      const auditor = allAuditors.find(a => a.id === r.auditorId);
                      const auditorName = auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A';
                      return (
                        <div key={r.id} className="p-4 transition-all duration-200 bg-white border rounded-lg border-slate-200 hover:shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-mono text-xs font-medium text-slate-500">{answers?.documentNumber || `RES-${r.id}`}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-md border font-medium ${getResponseStatusBadge(r.status)}`}>{r.status || 'DRAFT'}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800">{r.department || 'N/A'}</h4>
                          <p className="mt-1 text-xs text-slate-500"><span className="font-medium text-slate-600">Auditor:</span> {auditorName}</p>
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500">Score: <span className="font-semibold text-slate-800">{(r.percentageScore || 0).toFixed(1)}%</span></div>
                            <button onClick={() => { onViewResponse(r); setShowAuditeeResponsesModal(false); }} className="px-3 py-1.5 text-xs font-medium transition-colors rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5">
                              <FiEye className="w-3 h-3" /> View Report
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auditee NCRs Modal */}
        {showAuditeeNCRsModal && selectedAuditeeData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white rounded-xl shadow-2xl animate-scaleIn">
              <div className="px-6 py-4 rounded-t-xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">NCRs Against {selectedAuditeeData.firstName} {selectedAuditeeData.lastName}</h3>
                    <p className="text-sm text-white/80">{getAuditeeNCRs(selectedAuditeeData.id).length} total NCRs</p>
                  </div>
                  <button onClick={() => { setShowAuditeeNCRsModal(false); setSelectedAuditeeData(null); }} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-100px)] p-4 bg-slate-50/50">
                {getAuditeeNCRs(selectedAuditeeData.id).length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FiAlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-600">No NCRs found against this auditee</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {getAuditeeNCRs(selectedAuditeeData.id).map(ncr => {
                      const auditor = allAuditors.find(a => a.id === ncr.auditorId);
                      const auditorName = auditor ? `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username : 'N/A';
                      return (
                        <div key={ncr.id} className="p-4 transition-all duration-200 bg-white border rounded-lg border-slate-200 hover:shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <span className={`px-2 py-0.5 text-xs rounded-md border font-medium ${getSeverityBadge(ncr.severity)}`}>{ncr.severity || 'NCR'}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-md border font-medium ${getNCRStatusBadge(ncr.status)}`}>{ncr.status || 'OPEN'}</span>
                          </div>
                          <h4 className="text-sm font-semibold truncate text-slate-800">{ncr.ncrNumber || `NCR-${ncr.id}`}</h4>
                          <div className="flex justify-between pt-3 mt-3 text-xs border-t border-slate-100">
                            <span className="text-slate-500">Raised by: {auditorName}</span>
                            <button onClick={() => { onViewNCR(ncr); setShowAuditeeNCRsModal(false); }} className="font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5">
                              <FiEye className="w-3 h-3" /> View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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