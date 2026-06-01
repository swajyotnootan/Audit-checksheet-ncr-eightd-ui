// src/components/modals/PlanDetailsModal.jsx
import React from 'react';
import { FiCheckCircle, FiClock, FiX, FiCheck } from 'react-icons/fi';

const PlanDetailsModal = ({ selectedPlan, onClose, onApprove, onReject, approvalComment, setApprovalComment, submitting }) => {
  if (!selectedPlan) return null;
  
  const auditElements = selectedPlan.planItems || [];
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec","Jan", "Feb", "Mar"];
  
  let totalPlanned = 0;
  let totalCompleted = 0;
  auditElements.forEach(element => {
    element?.months?.forEach(month => {
      if (month?.status === 'PLANNED') totalPlanned++;
      if (month?.status === 'COMPLETED') totalCompleted++;
    });
  });
  
  const getStatusBadge = (status) => {
    if (status === 'APPROVED') {
      return <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
    }
    if (status === 'PENDING_APPROVAL') {
      return <span className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded-full"><FiClock className="w-3 h-3" /> Pending</span>;
    }
    if (status === 'REJECTED') {
      return <span className="flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-100 rounded-full"><FiX className="w-3 h-3" /> Rejected</span>;
    }
    return <span className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded-full">Draft</span>;
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold">Annual Audit Plan {selectedPlan.year}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(selectedPlan.approvalStatus)}
              <span className="text-xs text-gray-400">Prepared by: {selectedPlan.preparedBy || 'N/A'}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <div className="p-3 text-center rounded-lg bg-blue-50">
              <p className="text-xs text-blue-600">Total Planned</p>
              <p className="text-2xl font-bold text-blue-700">{totalPlanned}</p>
            </div>
            <div className="p-3 text-center rounded-lg bg-green-50">
              <p className="text-xs text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">{totalCompleted}</p>
            </div>
            <div className="p-3 text-center rounded-lg bg-purple-50">
              <p className="text-xs text-purple-600">Completion Rate</p>
              <p className="text-2xl font-bold text-purple-700">
                {totalPlanned > 0 ? ((totalCompleted / totalPlanned) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Audit Element</th>
                  {months.map(month => <th key={month} className="px-2 py-2 text-xs text-center">{month}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditElements.map((element, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{element?.auditElement}</td>
                    {element?.months?.map((month, monthIdx) => (
                      <td key={monthIdx} className="px-2 py-2 text-center">
                        {month?.status === 'COMPLETED' && <span className="font-medium text-green-600">C</span>}
                        {month?.status === 'PLANNED' && <span className="font-medium text-blue-600">P</span>}
                        {!month?.status && <span className="text-gray-300">—</span>}
                       </td>
                    ))}
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {selectedPlan.approvalStatus === 'PENDING_APPROVAL' && (
            <div className="pt-4 mt-6 border-t border-gray-200">
              <h4 className="mb-3 font-medium text-gray-700">Review Decision</h4>
              <div className="space-y-3">
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={2}
                  placeholder="Add any comments about this plan..."
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
                <div className="flex gap-3">
                  <button onClick={onReject} className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">
                    <FiX className="w-4 h-4" /> Reject Plan
                  </button>
                  <button onClick={onApprove} disabled={submitting} className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCheck className="w-4 h-4" />}
                    Approve Plan
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {selectedPlan.approvalStatus === 'REJECTED' && selectedPlan.rejectionReason && (
            <div className="p-3 mt-6 border border-red-200 rounded-lg bg-red-50">
              <p className="text-sm font-medium text-red-800">Rejection Reason</p>
              <p className="text-sm text-red-600">{selectedPlan.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanDetailsModal;