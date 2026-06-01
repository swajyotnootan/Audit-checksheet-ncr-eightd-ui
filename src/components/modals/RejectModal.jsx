// src/components/modals/RejectModal.jsx
import React from 'react';
import { FiX } from 'react-icons/fi';

const RejectModal = ({ isOpen, onClose, onConfirm, year, rejectionReason, setRejectionReason, submitting }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Reject Plan</h3>
        <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting the {year} audit plan:</p>
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={4}
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500"
          placeholder="Enter rejection reason..."
          autoFocus
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;