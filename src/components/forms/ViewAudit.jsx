// src/components/forms/ViewAudit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCheckCircle, FiXCircle, FiClock, 
  FiUser, FiCalendar, FiFileText, FiDownload, FiPrinter,
  FiAlertCircle
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { useToast } from '../ToastContext';

const ViewAudit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [auditorName, setAuditorName] = useState('');
  const [auditeeName, setAuditeeName] = useState('');

  const fetchAuditDetails = async () => {
    try {
      setLoading(true);
      
      // ✅ Get all schedules for the current year
      const currentYear = new Date().getFullYear();
      const response = await auditScheduleApi.getByYear(currentYear);
      const allSchedules = response.data || [];
      
      // Find the specific audit by ID
      const foundAudit = allSchedules.find(schedule => schedule.id === parseInt(id));
      
      if (foundAudit) {
        setAudit(foundAudit);
        
        // Get auditor name from the audit data
        if (foundAudit.auditorName) {
          setAuditorName(foundAudit.auditorName);
        } else if (foundAudit.auditorId) {
          setAuditorName(`Auditor ID: ${foundAudit.auditorId}`);
        }
        
        // Get auditee name from the audit data
        if (foundAudit.auditeeName) {
          setAuditeeName(foundAudit.auditeeName);
        } else if (foundAudit.auditeeId) {
          setAuditeeName(`Auditee ID: ${foundAudit.auditeeId}`);
        }
      } else {
        addToast('Audit not found', 'error');
      }
      
    } catch (error) {
      console.error('Error fetching audit details:', error);
      addToast(error.response?.data?.message || 'Failed to load audit details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAuditDetails();
    }
  }, [id]);

  const getStatusBadge = (status) => {
    const badges = {
      'SCHEDULED': 'bg-blue-100 text-blue-700',
      'IN_PROGRESS': 'bg-amber-100 text-amber-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'APPROVED': 'bg-emerald-100 text-emerald-700',
      'REJECTED': 'bg-red-100 text-red-700',
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getApprovalStatusBadge = (status) => {
    const badges = {
      'APPROVED': 'bg-emerald-100 text-emerald-700',
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-700',
      'REJECTED': 'bg-red-100 text-red-700',
      'CHANGE_REQUESTED': 'bg-orange-100 text-orange-700',
      'DRAFT': 'bg-gray-100 text-gray-600',
    };
    return badges[status] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-purple-600 mb-6 hover:text-purple-800"
        >
          <FiArrowLeft className="mr-2" /> Back to Calendar
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Audit Not Found</h2>
          <p className="text-red-600">The requested audit could not be found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {audit.department || 'Audit'} - {audit.auditType || 'Internal Audit'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Audit ID: {audit.id}</p>
        </div>
      </div>

      {/* Audit Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Audit Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FiFileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="font-medium text-gray-800">{audit.department || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FiCalendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Scheduled Date</p>
              <p className="font-medium text-gray-800">
                {audit.scheduledDate ? new Date(audit.scheduledDate).toLocaleDateString() : 'Not scheduled'}
              </p>
              {audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate && (
                <p className="text-xs text-gray-400 mt-1">
                  Range: {audit.fromDate} to {audit.toDate}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FiClock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Time Slot</p>
              <p className="font-medium text-gray-800">{audit.timeSlot || audit.startTime ? `${audit.startTime} - ${audit.endTime}` : 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-5 h-5" />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getStatusBadge(audit.status)}`}>
                {audit.status || 'SCHEDULED'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FiUser className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Auditor</p>
              <p className="font-medium text-gray-800">{auditorName || 'Not assigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FiUser className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Auditee</p>
              <p className="font-medium text-gray-800">{auditeeName || 'Not assigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FiFileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Audit Type</p>
              <p className="font-medium text-gray-800">{audit.auditType || 'General Audit'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-5 h-5" />
            <div>
              <p className="text-xs text-gray-500">Approval Status</p>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getApprovalStatusBadge(audit.approvalStatus || audit.detailedApprovalStatus)}`}>
                {audit.approvalStatus || audit.detailedApprovalStatus || 'DRAFT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Special Event Info */}
      {audit.isSpecialEvent && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              {audit.specialEventType === 'OPENING' && '🔴'}
              {audit.specialEventType === 'CLOSING' && '🔵'}
              {audit.specialEventType === 'LUNCH' && '🍽️'}
            </div>
            <div>
              <p className="font-semibold text-amber-800">
                {audit.specialEventType === 'OPENING' && 'Opening Meeting'}
                {audit.specialEventType === 'CLOSING' && 'Closing Meeting'}
                {audit.specialEventType === 'LUNCH' && 'Lunch Break'}
              </p>
              <p className="text-sm text-amber-600">This is a special event</p>
            </div>
          </div>
        </div>
      )}

      {/* Description / Remarks */}
      {audit.remarks && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Remarks / Additional Info</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{audit.remarks}</p>
          </div>
        </div>
      )}

      {/* Audit Objective & Scope */}
      {(audit.auditObjective || audit.auditScope) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Audit Details</h2>
          <div className="space-y-4">
            {audit.auditObjective && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Audit Objective</p>
                <p className="text-gray-600 whitespace-pre-line">{audit.auditObjective}</p>
              </div>
            )}
            {audit.auditScope && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Audit Scope</p>
                <p className="text-gray-600">{audit.auditScope}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Info */}
      {audit.approvedByName && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Approval Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Approved By</p>
                <p className="font-medium text-gray-800">{audit.approvedByName}</p>
              </div>
            </div>
            {audit.approvedAt && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FiCalendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Approved At</p>
                  <p className="font-medium text-gray-800">{new Date(audit.approvedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <FiPrinter className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={() => addToast('PDF download feature coming soon', 'info')}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <FiDownload className="w-4 h-4" />
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default ViewAudit;