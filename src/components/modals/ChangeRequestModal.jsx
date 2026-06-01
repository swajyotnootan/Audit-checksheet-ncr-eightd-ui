// src/components/modals/ChangeRequestModal.jsx
import React, { useState } from 'react';
import { FiX, FiSend, FiAlertCircle, FiEdit2, FiFileText } from 'react-icons/fi';

const ChangeRequestModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  type, 
  data, 
  submitting = false 
}) => {
  const [reason, setReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case 'annual':
        return `Request Changes - Annual Audit Plan ${data?.year}`;
      case 'department':
        return `Request Changes - Department Audit Plan ${data?.year}`;
      case 'weekSchedule':
        return `Request Changes - Week Schedule (${data?.month} ${data?.year})`;
      case 'dailySchedule':
        return `Request Changes - Daily Schedule (${data?.month} ${data?.year})`;
      default:
        return 'Request Changes';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'annual':
        return 'Annual Audit Plan (Form 3) defines the yearly audit schedule and elements.';
      case 'department':
        return 'Department Audit Plan (Form 4) assigns audits to specific departments.';
      case 'weekSchedule':
        return 'Week Schedule (Form 5) defines week-wise audit assignments for the month.';
      case 'dailySchedule':
        return 'Daily Schedule (Form 5 Detailed) defines day-wise audit schedules with time slots.';
      default:
        return 'Please provide details about the changes you are requesting.';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'annual':
        return <FiFileText className="w-6 h-6 text-blue-500" />;
      case 'department':
        return <FiFileText className="w-6 h-6 text-emerald-500" />;
      case 'weekSchedule':
        return <FiFileText className="w-6 h-6 text-indigo-500" />;
      case 'dailySchedule':
        return <FiFileText className="w-6 h-6 text-teal-500" />;
      default:
        return <FiEdit2 className="w-6 h-6 text-amber-500" />;
    }
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      // You can add toast notification here if needed
      return;
    }
    onConfirm(reason, additionalInfo);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {getTitle()}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Request changes to approved plan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Info Alert */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Change Request Notice</p>
              <p className="text-amber-700 text-xs mt-0.5">
                {getDescription()}
              </p>
            </div>
          </div>

          {/* Current Plan Summary */}
          {data && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">Current Plan Summary:</p>
              <div className="space-y-1 text-xs text-gray-600">
                {type === 'annual' && (
                  <>
                    <p>• Year: <span className="font-medium">{data.year}</span></p>
                    <p>• Status: <span className="text-amber-600 font-medium">Approved</span></p>
                    {data.preparedBy && <p>• Prepared by: {data.preparedBy}</p>}
                  </>
                )}
                {type === 'department' && (
                  <>
                    <p>• Year: <span className="font-medium">{data.year}</span></p>
                    <p>• Status: <span className="text-amber-600 font-medium">Approved</span></p>
                    {data.preparedBy && <p>• Prepared by: {data.preparedBy}</p>}
                  </>
                )}
                {(type === 'weekSchedule' || type === 'dailySchedule') && (
                  <>
                    <p>• Month: <span className="font-medium">{data.month}</span></p>
                    <p>• Year: <span className="font-medium">{data.year}</span></p>
                    <p>• Status: <span className="text-amber-600 font-medium">Approved</span></p>
                    {data.scheduleCount && <p>• Schedules: {data.scheduleCount}</p>}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Change Request Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Change <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              placeholder="Please describe why changes are needed..."
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              Be specific about what needs to be changed and why.
            </p>
          </div>

          {/* Additional Information (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suggested Changes (Optional)
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              placeholder="Describe what changes you would like to see..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Provide specific suggestions for the audit team to implement.
            </p>
          </div>

          {/* Change Request Impact */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-medium text-blue-800 mb-2">What happens next?</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Audit Manager will be notified of your change request</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>They will review and make the requested changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>The plan will be resubmitted for your approval</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>You will be notified when changes are ready for review</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Submitting...
              </>
            ) : (
              <>
                <FiSend className="w-4 h-4" />
                Submit Change Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeRequestModal;