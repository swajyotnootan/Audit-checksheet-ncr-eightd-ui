// src/components/forms/DocumentControlSection.jsx
import React, { useState } from 'react';
import { FiSave, FiSend, FiCheck, FiX } from 'react-icons/fi';

const DocumentControlSection = ({ 
  documentInfo, setDocumentInfo, planStatus, selectedMonth, monthDisplay,
  canEdit, canSubmit, canApprove, stats, onSaveDocument, onSubmitForApproval,
  onApprove, onReject, saving, submitting, approvalComment, setApprovalComment
}) => {

  const [showApproveComment, setShowApproveComment] = useState(false);

  return (
    <div className="p-4 mt-6 bg-white border border-gray-200 rounded-xl">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Document Control */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-700">Document Control</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Document Title:</span>
              <span className="text-sm font-medium text-gray-800">Internal Quality audit Schedule sheet</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Document No.:</span>
              <span className="text-sm text-gray-800">IQA/F/05</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Revision:</span>
              {canEdit ? (
                <input type="text" value={documentInfo.documentRevision} onChange={(e) => setDocumentInfo({...documentInfo, documentRevision: e.target.value})} className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg" />
              ) : (
                <span className="text-sm text-gray-800">{documentInfo.documentRevision}</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Revision Date:</span>
              {canEdit ? (
                <input type="date" value={documentInfo.revisionDate} onChange={(e) => setDocumentInfo({...documentInfo, revisionDate: e.target.value})} className="px-2 py-1 text-sm border border-gray-200 rounded-lg" />
              ) : (
                <span className="text-sm text-gray-800">{documentInfo.revisionDate}</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Revision Details:</span>
              {canEdit ? (
                <input type="text" value={documentInfo.revisionDetails} onChange={(e) => setDocumentInfo({...documentInfo, revisionDetails: e.target.value})} className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg" />
              ) : (
                <span className="text-sm text-gray-800">{documentInfo.revisionDetails}</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Audit Frequency:</span>
              {canEdit ? (
                <select value={documentInfo.auditFrequency} onChange={(e) => setDocumentInfo({...documentInfo, auditFrequency: e.target.value})} className="px-2 py-1 text-sm border border-gray-200 rounded-lg">
                  <option value="Half yearly">Half yearly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              ) : (
                <span className="text-sm text-gray-800">{documentInfo.auditFrequency}</span>
              )}
            </div>
          </div>
        </div>

        {/* Approval */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-700">Approval</h4>
          <div className="space-y-3">
           <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Prepared By:</span>
              <span className="text-sm font-medium text-gray-800">
                {documentInfo.preparedBy && documentInfo.preparedBy !== 'Audit Manager' 
                  ? documentInfo.preparedBy 
                  : (documentInfo.preparedBy || 'Not assigned')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Approved By:</span>
              {planStatus === 'APPROVED' ? (
                <span className="text-sm font-medium text-green-700">{documentInfo.approvedBy || 'Top Management'}</span>
              ) : (
                <span className="text-sm text-gray-400">Not approved yet</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-500">Date:</span>
              <span className="text-sm text-gray-800">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="pt-3 mt-4 border-t border-gray-200">
        <h4 className="mb-2 text-sm font-semibold text-gray-700">Legend - Audit Elements codes</h4>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-gray-600">A - System Audit (ISO9001)</span>
          <span className="text-gray-600">B - System Audit (IATF16949)</span>
          <span className="text-gray-600">C - 5S Audit</span>
          <span className="text-gray-600">D - Process Audit</span>
          <span className="text-gray-600">E - Product Audit</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3 mt-6">
        {canEdit && (
          <>
            <button onClick={onSaveDocument} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiSave className="w-4 h-4" />}
              Save Draft
            </button>
          </>
        )}
        
        {canSubmit && stats.totalSchedules > 0 && (
          <button onClick={onSubmitForApproval} disabled={submitting} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiSend className="w-4 h-4" />}
            Submit {monthDisplay} for Approval
          </button>
        )}
        
        {canApprove && (
          <div className="flex gap-2">
            {!showApproveComment ? (
              <>
                <button onClick={onReject} className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">
                  <FiX className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => setShowApproveComment(true)} className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">
                  <FiCheck className="w-4 h-4" /> Approve
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Add approval comments..."
                  className="w-64 px-2 py-1 text-sm border border-gray-200 rounded-lg"
                  rows={1}
                />
                <button onClick={onApprove} disabled={submitting} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">
                  Confirm
                </button>
                <button onClick={() => setShowApproveComment(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentControlSection;