// src/components/modals/DeptPlanDetailsModal.jsx
import React from 'react';
import { FiCheckCircle, FiClock, FiX, FiCheck, FiRepeat } from 'react-icons/fi';

const DeptPlanDetailsModal = ({ selectedPlan, onClose, onApprove, onReject, approvalComment, setApprovalComment, submitting }) => {
  if (!selectedPlan) return null;
  
  const departments = selectedPlan.planItems || [];
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };
  
  let totalPlanned = 0;
  let totalCompleted = 0;
  let totalRescheduled = 0;
  
  departments.forEach(dept => {
    dept.months?.forEach(month => {
      if (month?.status === 'PLANNED') totalPlanned++;
      if (month?.status === 'COMPLETED') totalCompleted++;
      if (month?.status === 'RESCHEDULED') totalRescheduled++;
    });
  });
  
  const getStatusBadge = (status) => {
    if (status === 'APPROVED') {
      return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
    }
    if (status === 'PENDING_APPROVAL') {
      return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 flex items-center gap-1"><FiClock className="w-3 h-3" /> Pending</span>;
    }
    if (status === 'REJECTED') {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1"><FiX className="w-3 h-3" /> Rejected</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">Draft</span>;
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">Department Audit Plan {selectedPlan.year}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(selectedPlan.approvalStatus)}
              <span className="text-xs text-gray-400">Prepared by: {selectedPlan.preparedBy || 'N/A'}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        
        <div className="p-6">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600">Planned (P)</p>
              <p className="text-2xl font-bold text-blue-700">{totalPlanned}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600">Completed (C)</p>
              <p className="text-2xl font-bold text-green-700">{totalCompleted}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-xs text-orange-600">Rescheduled (R)</p>
              <p className="text-2xl font-bold text-orange-700">{totalRescheduled}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-600">Completion Rate</p>
              <p className="text-2xl font-bold text-purple-700">
                {totalPlanned > 0 ? ((totalCompleted / totalPlanned) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
          
          {/* Department Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-left">Selected Elements</th>
                  {months.map(month => (
                    <th key={month} className="px-2 py-2 text-center text-xs">{monthDisplay[month]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.map((dept, idx) => {
                  const hasSelected = dept.months?.some(m => m.selectedElements?.length > 0);
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{dept.department}</td>
                      <td className="px-3 py-2">
                        {hasSelected ? (
                          <span className="text-green-600 text-xs">✓ Elements selected</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {dept.months?.map((month, mIdx) => (
                        <td key={mIdx} className="px-2 py-2 text-center">
                          {month.status === 'COMPLETED' && <span className="text-green-600 font-bold">C</span>}
                          {month.status === 'PLANNED' && <span className="text-blue-600 font-bold">P</span>}
                          {month.status === 'RESCHEDULED' && <span className="text-orange-600 font-bold">R</span>}
                          {!month.status && <span className="text-gray-300">—</span>}
                         </td>
                      ))}
                     </tr>
                  );
                })}
              </tbody>
             </table>
          </div>
          
          {/* Approve/Reject Section */}
          {selectedPlan.approvalStatus === 'PENDING_APPROVAL' && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-3">Review Decision</h4>
              <div className="space-y-3">
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={2}
                  placeholder="Add any comments about this plan..."
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
                <div className="flex gap-3">
                  <button onClick={onReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <FiX className="w-4 h-4" /> Reject Plan
                  </button>
                  <button onClick={onApprove} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                    {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <FiCheck className="w-4 h-4" />}
                    Approve Plan
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {selectedPlan.approvalStatus === 'REJECTED' && selectedPlan.rejectionReason && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">Rejection Reason</p>
              <p className="text-sm text-red-600">{selectedPlan.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeptPlanDetailsModal;