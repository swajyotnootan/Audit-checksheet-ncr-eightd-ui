// src/components/dashboards/components/ResponseDetailModal.jsx
import React, { useState, useEffect } from 'react';

const GlassCard = ({ children, className = "" }) => (
  <div className={`backdrop-blur-md bg-white/30 border border-white/30 rounded-2xl shadow-lg ${className}`}>
    {children}
  </div>
);

const ResponseDetailModal = ({ response, onClose }) => {
  const [answers, setAnswers] = useState(null);
  
  useEffect(() => {
    if (response?.answers) {
      const parsed = typeof response.answers === 'string' 
        ? JSON.parse(response.answers) 
        : response.answers;
      setAnswers(parsed);
    }
  }, [response]);

  const getResponseColor = (resp) => {
    switch(resp) {
      case 'COMPLIANT': return 'text-emerald-600 bg-emerald-50/60';
      case 'MINOR_NC': return 'text-amber-600 bg-amber-50/60';
      case 'MAJOR_NC': return 'text-red-600 bg-red-50/60';
      default: return 'text-gray-600 bg-gray-50/60';
    }
  };

  const getResponseLabel = (resp) => {
    switch(resp) {
      case 'COMPLIANT': return '✓ Compliant';
      case 'MINOR_NC': return '! Minor NC';
      case 'MAJOR_NC': return '✗ Major NC';
      default: return resp;
    }
  };

  if (!answers) return null;

  const responsesObj = answers.responses || {};
  const compliantCount = Object.values(responsesObj).filter(v => v === 'COMPLIANT').length;
  const minorCount = Object.values(responsesObj).filter(v => v === 'MINOR_NC').length;
  const majorCount = Object.values(responsesObj).filter(v => v === 'MAJOR_NC').length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
      <GlassCard className="w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-scaleIn">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Response Details</h3>
              <p className="text-sm text-white/80">{answers?.documentNumber}</p>
            </div>
            <button onClick={onClose} className="text-white transition-colors hover:text-gray-200">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/30">
            <div className="p-2 text-center rounded-lg bg-emerald-50/60">
              <p className="text-xl font-bold text-emerald-600">{compliantCount}</p>
              <p className="text-xs text-gray-500">Compliant</p>
            </div>
            <div className="p-2 text-center rounded-lg bg-amber-50/60">
              <p className="text-xl font-bold text-amber-600">{minorCount}</p>
              <p className="text-xs text-gray-500">Minor NC</p>
            </div>
            <div className="p-2 text-center rounded-lg bg-red-50/60">
              <p className="text-xl font-bold text-red-600">{majorCount}</p>
              <p className="text-xs text-gray-500">Major NC</p>
            </div>
            <div className="p-2 text-center rounded-lg bg-blue-50/60">
              <p className="text-xl font-bold text-blue-600">{response.percentageScore || 0}%</p>
              <p className="text-xs text-gray-500">Score</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 border-b border-white/30 md:grid-cols-4">
            <div><p className="text-xs text-gray-500">Department</p><p className="font-medium text-gray-800">{answers?.department || response.department}</p></div>
            <div><p className="text-xs text-gray-500">Process</p><p className="font-medium text-gray-800">{answers?.processName || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Auditee</p><p className="font-medium text-gray-800">{answers?.auditeeName || response.auditeeName}</p></div>
            <div><p className="text-xs text-gray-500">Date</p><p className="font-medium text-gray-800">{answers?.date || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Location</p><p className="font-medium text-gray-800">{answers?.location || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Shift</p><p className="font-medium text-gray-800">{answers?.shift || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><span className={`inline-block px-2 py-0.5 text-xs rounded-full ${response.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : response.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{response.approvalStatus || 'DRAFT'}</span></div>
          </div>

          <div className="p-4">
            <h4 className="mb-3 font-semibold text-gray-800">Question Responses</h4>
            <div className="space-y-3">
              {Object.entries(responsesObj).map(([qId, resp]) => (
                <div key={qId} className={`p-3 rounded-lg ${getResponseColor(resp)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="font-mono text-xs text-gray-500">Q{qId}</span>
                      <p className="text-sm text-gray-700">{answers?.observations?.[qId] || `Question ${qId}`}</p>
                    </div>
                    <span className="px-2 py-1 ml-2 text-xs font-medium rounded bg-white/50">{getResponseLabel(resp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default ResponseDetailModal;