import React from 'react';
import { FiX, FiCheck, FiAlertCircle, FiUsers, FiCalendar, FiFileText } from 'react-icons/fi';

const ScheduleDetailsModal = ({ 
  selectedSchedule, 
  onClose, 
  onApprove, 
  onReject, 
  approvalComment, 
  setApprovalComment, 
  submitting 
}) => {
  if (!selectedSchedule) return null;

  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FiCalendar className="w-5 h-5 text-purple-600" />
              Audit Schedule Review ({selectedSchedule.year})
            </h2>
            <p className="text-sm text-gray-500 mt-1">Document Rev: {selectedSchedule.documentRevision || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          
          {/* Document Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase">Prepared By</p>
              <p className="text-sm text-gray-800">{selectedSchedule.preparedBy || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase">Revision Date</p>
              <p className="text-sm text-gray-800">{selectedSchedule.revisionDate || 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-blue-600 font-semibold uppercase">Revision Details</p>
              <p className="text-sm text-gray-800">{selectedSchedule.revisionDetails || 'N/A'}</p>
            </div>
          </div>

          {/* Audit Team */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-purple-600" />
              Auditing Team
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Lead Auditor</p>
                <p className="text-sm font-medium text-gray-800">
                  {selectedSchedule.leadAuditorName || (selectedSchedule.leadAuditorId ? `ID: ${selectedSchedule.leadAuditorId}` : 'Not Assigned')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Team Auditors</p>
                <p className="text-sm font-medium text-gray-800">
                  {selectedSchedule.teamAuditorNames?.join(', ') || (selectedSchedule.teamAuditorIds ? `IDs: ${selectedSchedule.teamAuditorIds}` : 'None')}
                </p>
              </div>
            </div>
          </div>

          {/* Schedule Summary Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FiFileText className="w-4 h-4 text-green-600" />
              Scheduled Audits ({selectedSchedule.schedules?.length || 0})
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Month</th>
                    <th className="px-4 py-2">Week</th>
                    <th className="px-4 py-2">Auditor</th>
                    <th className="px-4 py-2">Auditee</th>
                    <th className="px-4 py-2">Elements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedSchedule.schedules?.map((sched, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{sched.department}</td>
                      <td className="px-4 py-2">{monthDisplay[sched.month] || sched.month}</td>
                      <td className="px-4 py-2">{sched.week}</td>
                      <td className="px-4 py-2">{sched.auditorName || 'N/A'}</td>
                      <td className="px-4 py-2">{sched.auditeeName || 'N/A'}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {sched.auditElements?.map((el, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {el}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!selectedSchedule.schedules || selectedSchedule.schedules.length === 0) && (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 text-center text-gray-400">No schedules added</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval Comment Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approval Comments (Optional)</label>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500"
              placeholder="Add any comments for the audit manager..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
            disabled={submitting}
          >
            <FiAlertCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <FiCheck className="w-4 h-4" />
            )}
            Approve Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailsModal;