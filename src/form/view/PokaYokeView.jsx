// src/form/view/PokaYokeView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/context/AuthContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { userAPI } from '../../components/services/api';
import { useToast } from '../../components/ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, CheckCircle, AlertCircle, User, Calendar, 
  Wrench, Printer, ThumbsUp, ThumbsDown, FileText, MapPin, Clock
} from 'lucide-react';

const statusClasses = {
  DRAFT: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-emerald-100 text-emerald-800"
};

const getStatusBadge = (status) => {
  const badges = {
    'DRAFT': 'bg-gray-100 text-gray-700',
    'IN_PROGRESS': 'bg-blue-100 text-blue-700',
    'SUBMITTED': 'bg-purple-100 text-purple-700',
    'APPROVED': 'bg-green-100 text-green-700',
    'REJECTED': 'bg-red-100 text-red-700',
    'CLOSED': 'bg-emerald-100 text-emerald-700',
  };
  return badges[status] || 'bg-gray-100 text-gray-700';
};

export default function PokaYokeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [answers, setAnswers] = useState({});
  const [auditorName, setAuditorName] = useState('');
  const [auditeeName, setAuditeeName] = useState('');

  useEffect(() => {
    if (id) {
      fetchAuditDetails();
    }
  }, [id]);

  const fetchAuditDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching Poka-Yoke verification with ID:', id);
      
      // Fetch audit response
      const response = await auditScheduleApi.getAuditResponse(parseInt(id));
      console.log('Audit Data:', response.data);
      
      const auditData = response.data;
      setAudit(auditData);
      
      // Parse answers
      let parsedAnswers = {};
      try {
        if (auditData.answers) {
          parsedAnswers = typeof auditData.answers === 'string' 
            ? JSON.parse(auditData.answers) 
            : auditData.answers;
          console.log('Parsed Answers:', parsedAnswers);
        }
      } catch (e) {
        console.error('Error parsing answers:', e);
      }
      setAnswers(parsedAnswers);
      
      // Get auditor name
      if (auditData.auditorId) {
        try {
          const auditor = await userAPI.getUserById(auditData.auditorId);
          setAuditorName(auditor?.name || `${auditor?.firstName} ${auditor?.lastName}`);
        } catch (e) {
          setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown');
        }
      } else {
        setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown');
      }
      
      setAuditeeName(auditData.auditeeName || parsedAnswers.auditeeName || 'Not specified');
      
    } catch (error) {
      console.error('Error fetching audit details:', error);
      addToast('Failed to load verification details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const verifications = answers.verifications || [];
  const totalDevices = verifications.length;
  const okDevices = verifications.filter(v => v.status === 'OK').length;
  const notOkDevices = totalDevices - okDevices;
  const percentage = totalDevices > 0 ? Math.round((okDevices / totalDevices) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-orange-600"></div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Verification not found</p>
        <button onClick={() => navigate('/auditor/pokayoke')} className="px-4 py-2 mt-4 text-white bg-orange-600 rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/auditor/pokayoke')}
          className="p-2 transition-colors rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Poka-Yoke Verification</h1>
          <p className="text-xs text-gray-500 mt-0.5">View verification details and findings</p>
        </div>
      </div>

      {/* Verification Information */}
      <div className="p-4 mb-4 bg-white border border-gray-200 rounded-xl">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Verification Information</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <FileText className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Document Number</p>
              <p className="text-sm font-medium text-gray-800">{answers.documentNumber || `PY-${audit.id}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Verification Date</p>
              <p className="text-sm font-medium text-gray-800">{answers.date || formatDate(audit.auditDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Verified By</p>
              <p className="text-sm font-medium text-gray-800">{auditorName || answers.auditorName || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Approved By</p>
              <p className="text-sm font-medium text-gray-800">{answers.approvedBy || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <div className="w-4 h-4" />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${getStatusBadge(audit.status)}`}>
                {audit.status || 'DRAFT'}
              </span>
            </div>
          </div>
          {percentage > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <Wrench className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Success Rate</p>
                <p className={`text-sm font-semibold ${getScoreColor(percentage)}`}>{percentage}% ({okDevices}/{totalDevices})</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4">
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-xl font-bold text-gray-800">{totalDevices}</p>
          <p className="text-xs text-gray-500">Total Devices</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-xl font-bold text-green-600">{okDevices}</p>
          <p className="text-xs text-gray-500">OK</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-xl font-bold text-red-600">{notOkDevices}</p>
          <p className="text-xs text-gray-500">Not OK</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-xl font-bold text-blue-600">{percentage}%</p>
          <p className="text-xs text-gray-500">Success Rate</p>
        </div>
      </div>

      {/* Status Message */}
      {notOkDevices > 0 && (
        <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            <span className="text-sm font-semibold text-red-800">
              {notOkDevices} device(s) require attention
            </span>
          </div>
        </div>
      )}
      
      {okDevices === totalDevices && totalDevices > 0 && (
        <div className="p-4 mb-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-sm font-semibold text-green-800">
              ✓ All Poka-Yoke devices are working properly!
            </span>
          </div>
        </div>
      )}

      {/* Devices Table */}
      <div className="p-4 mb-4 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-4 h-4 text-orange-600" />
          <h2 className="text-base font-semibold text-gray-800">Device Verification Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-3 py-2 text-xs font-medium text-center text-gray-500 uppercase">#</th>
                <th className="min-w-[150px] px-3 py-2 text-xs font-medium text-left text-gray-500 uppercase">Machine Name</th>
                <th className="min-w-[100px] px-3 py-2 text-xs font-medium text-left text-gray-500 uppercase">Machine No.</th>
                <th className="min-w-[150px] px-3 py-2 text-xs font-medium text-left text-gray-500 uppercase">Poka-Yoke Name</th>
                <th className="min-w-[100px] px-3 py-2 text-xs font-medium text-left text-gray-500 uppercase">Poka-Yoke No.</th>
                <th className="min-w-[100px] px-3 py-2 text-xs font-medium text-left text-gray-500 uppercase">Location</th>
                <th className="w-24 px-3 py-2 text-xs font-medium text-center text-gray-500 uppercase">Status</th>
                <th className="min-w-[150px] px-3 py-2 text-xs font-medium text-left text-gray-500 uppercase">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {verifications.length > 0 ? verifications.map((v, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-center text-gray-600">{idx + 1}</td>
                  <td className="px-3 py-2 text-sm text-gray-800">{v.machineName || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{v.machineNumber || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-800">{v.pokaYokeName || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{v.pokaYokeNo || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{v.location || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {v.status === 'OK' ? '✓ OK' : '✗ Not OK'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{v.remark || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="px-3 py-4 text-center text-gray-500">
                    No devices found for this verification
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature Section */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Signatures</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="p-3 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500">Verified By Signature</p>
            <p className="mt-1 text-sm font-medium text-gray-800">{answers.auditorSignature || audit.auditorName || 'Not signed'}</p>
            {audit.createdAt && <p className="mt-1 text-xs text-gray-400">Signed on: {formatDateTime(audit.createdAt)}</p>}
          </div>
          <div className="p-3 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500">Approved By Signature</p>
            <p className="mt-1 text-sm font-medium text-gray-800">{answers.approvedBy || 'Not signed'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors text-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
        <button
          onClick={() => addToast('PDF download feature coming soon', 'info')}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors text-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Download PDF
        </button>
      </div>
    </div>
  );
}