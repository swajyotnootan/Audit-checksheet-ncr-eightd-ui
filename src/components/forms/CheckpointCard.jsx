// components/CheckpointCard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, ChevronLeft, ChevronRight } from 'lucide-react';

const CheckpointCard = ({ 
  checkpoint, 
  index, 
  total, 
  onPrevious, 
  onNext, 
  onStatusChange, 
  onObservationChange,
  onNavigate
}) => {
  const [localObservation, setLocalObservation] = useState('');

  // Sync localObservation with checkpoint.observation when checkpoint changes
  useEffect(() => {
    setLocalObservation(checkpoint.observation || '');
  }, [checkpoint.observation, index]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'O+': return 'bg-green-100 text-green-700 border-green-300';
      case 'OFI': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'NC': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'O+': return '✓ Conforming';
      case 'OFI': return 'ℹ Opportunity for Improvement';
      case 'NC': return '✗ Non-Conformity';
      default: return 'Not Rated';
    }
  };

  // Auto-save observation on change
  const handleObservationChange = (e) => {
    const newValue = e.target.value;
    setLocalObservation(newValue);
    onObservationChange(index, newValue);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) onPrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index < total - 1) onNext();
        break;
      default:
        break;
    }
  }, [index, total, onPrevious, onNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="overflow-hidden bg-white border rounded-lg shadow-lg">
      {/* Card Header - Checkpoint Name in Bold */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
              SL No. {checkpoint.slNo}
            </span>
            <span className="px-3 py-1 text-sm font-medium text-purple-800 bg-purple-100 rounded-full">
              Clause {checkpoint.clause}
            </span>
            {checkpoint.status && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(checkpoint.status)}`}>
                {getStatusLabel(checkpoint.status)}
              </span>
            )}

       
          </div>
        </div>
        {/* Checkpoint Name - Bold */}
        <div className="mt-3">
          <h3 className="text-lg font-bold text-gray-900">{checkpoint.checkpoint}</h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-5">
        {/* Documents Verified */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Documents/Records to Verify
          </label>
          <div className= "p-1 border border-yellow-200 rounded-lg bg-yellow-50">
            <p className="text-sm">{checkpoint.documentsVerified}</p>
          </div>
        </div>

        {/* Observations - Empty input field */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Observations / Findings <span className="text-xs font-normal text-gray-400">(Optional)</span>
          </label>
          <textarea
            value={localObservation}
            onChange={handleObservationChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your observations here..."
          />
        </div>

        {/* Status Selection - Mandatory */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Status / Rating <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-400">(Required)</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onStatusChange(index, 'O+')}
              className={`p-3 rounded-lg border-2 transition-all ${
                checkpoint.status === 'O+'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-800">O+</div>
                  <div className="text-xs text-gray-500">Conforming</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onStatusChange(index, 'OFI')}
              className={`p-3 rounded-lg border-2 transition-all ${
                checkpoint.status === 'OFI'
                  ? 'border-yellow-500 bg-yellow-50 shadow-md'
                  : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Info size={20} className="text-yellow-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-800">OFI</div>
                  <div className="text-xs text-gray-500">Opportunity for Improvement</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onStatusChange(index, 'NC')}
              className={`p-3 rounded-lg border-2 transition-all ${
                checkpoint.status === 'NC'
                  ? 'border-red-500 bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertCircle size={20} className="text-red-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-800">NC</div>
                  <div className="text-xs text-gray-500">Non-Conformity</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Previous/Next Buttons */}
      <div className="flex justify-between px-6 py-4 border-t bg-gray-50">
        <button
          type="button"
          onClick={onPrevious}
          disabled={index === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        
        <button
          type="button"
          onClick={onNext}
          disabled={index === total - 1}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default CheckpointCard;