// src/components/forms/ReviewAudit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCheckCircle, FiXCircle, FiSend, 
  FiUser, FiCalendar, FiFileText, FiAlertCircle
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { auditAPI, ncrAPI, userAPI } from '../../components/services/api';
import { useToast } from '../ToastContext';

const ReviewAudit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [comments, setComments] = useState('');
  const [auditorName, setAuditorName] = useState('');
  const [auditeeName, setAuditeeName] = useState('');

  useEffect(() => {
    fetchAuditDetails();
  }, [id]);

  const fetchAuditDetails = async () => {
    try {
      const auditData = await auditAPI.getById(id);
      setAudit(auditData);
      
      if (auditData.auditorId) {
        const auditor = await userAPI.getById(auditData.auditorId);
        setAuditorName(auditor?.name || `${auditor?.firstName} ${auditor?.lastName}`);
      }
      if (auditData.auditeeId) {
        const auditee = await userAPI.getById(auditData.auditeeId);
        setAuditeeName(auditee?.name || `${auditee?.firstName} ${auditee?.lastName}`);
      }
    } catch (error) {
      addToast('Failed to load audit details', 'error');
      navigate(-1);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await auditAPI.approve(id, comments);
      addToast('Audit approved successfully', 'success');
      navigate('/lead-auditor');
    } catch (error) {
      addToast('Failed to approve audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      addToast('Please provide rejection reason', 'error');
      return;
    }
    setLoading(true);
    try {
      await auditAPI.reject(id, comments);
      addToast('Audit rejected', 'success');
      navigate('/lead-auditor');
    } catch (error) {
      addToast('Failed to reject audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!audit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <FiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Review Audit</h1>
          <p className="text-sm text-gray-500">Review and approve/reject audit findings</p>
        </div>
      </div>

      {/* Audit Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Audit Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">Audit Name:</span> <span className="font-medium">{audit.auditName}</span></div>
          <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(audit.scheduledDate).toLocaleDateString()}</span></div>
          <div><span className="text-gray-500">Auditor:</span> <span className="font-medium">{auditorName}</span></div>
          <div><span className="text-gray-500">Auditee:</span> <span className="font-medium">{auditeeName}</span></div>
          <div><span className="text-gray-500">Score:</span> 
            <span className={`font-medium ml-2 ${audit.score >= 80 ? 'text-green-600' : audit.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {audit.score}%
            </span>
          </div>
        </div>
      </div>

      {/* Findings */}
      {audit.findings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Audit Findings</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="whitespace-pre-wrap">{audit.findings.observations || 'No observations recorded'}</p>
          </div>
          
          {audit.findings.nonConformities?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Non-Conformities</h3>
              {audit.findings.nonConformities.map((ncr, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                  <p className="text-sm">{ncr.description}</p>
                  <span className="text-xs text-red-600">{ncr.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Review Comments</h2>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          placeholder="Enter your review comments (required for rejection)..."
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <FiXCircle className="w-4 h-4" />
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <FiCheckCircle className="w-4 h-4" />
          Approve
        </button>
      </div>
    </div>
  );
};

export default ReviewAudit;