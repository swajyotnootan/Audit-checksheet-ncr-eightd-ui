// components/NCRPendingDashboard/NCRPendingDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CheckCircle, Clock, Eye, Loader2, 
  RefreshCw, X, FileText, Users, Calendar, MessageCircle
} from 'lucide-react';
import { ncrService } from '../services/ncrService';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const getStatusLabel = (status) => {
  const labels = {
    AWAITING_AUDITEE: 'Awaiting Auditee',
    OPEN: 'Pending Approval',
    APPROVED: 'Ready for Action',
    IN_PROGRESS: 'Submitted - Pending Verification',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
    SENT_TO_8D: 'Sent to 8D',
    IN_8D_PROCESS: 'In 8D Process',
    READY_FOR_NCR2: 'Ready for NCR2',
    NCR2_IN_PROGRESS: 'NCR2 Verification',
    NCR2_COMPLETED: 'NCR2 Completed',
  };
  return labels[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB');
};

// ─────────────────────────────────────────────────────────────
// Reusable UI Components
// ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const config = {
    IN_PROGRESS: { label: 'Pending Verification', className: 'bg-purple-50 text-purple-700 border-purple-200' },
    CLOSED: { label: 'Closed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
    READY_FOR_NCR2: { label: 'Ready for NCR2', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    NCR2_IN_PROGRESS: { label: 'NCR2 Pending Verification', className: 'bg-violet-50 text-violet-700 border-violet-200' },
    NCR2_COMPLETED: { label: 'NCR2 Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };
  const { label, className } = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className={`mt-1 text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
      {Icon && (
        <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-').replace('600', '50')}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      )}
    </div>
  </div>
);

const ActionButton = ({ onClick, children, variant = 'primary', icon: Icon, disabled = false, title }) => {
  const baseClasses = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500",
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${baseClasses} ${variants[variant]}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
};

const SectionCard = ({ title, subtitle, action, children }) => (
  <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div>{children}</div>
  </section>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="p-8 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
      {Icon && <Icon className="w-6 h-6 text-gray-400" />}
    </div>
    <h4 className="text-sm font-medium text-gray-900">{title}</h4>
    {description && <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{description}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Verification Row Component (Updated for NCR2)
// ─────────────────────────────────────────────────────────────

const VerificationRow = ({ ncr, onVerify, onView, onOpenForum }) => {
  // Detect if this is NCR2 submission
  const isNCR2 = ncr.status === 'NCR2_IN_PROGRESS' || ncr.ncr2CorrectiveAction;
  
  return (
    <div className="grid grid-cols-12 gap-4 items-center px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <div className="col-span-4 md:col-span-3">
        <div>
          <p className="text-sm font-medium text-gray-900 font-mono truncate" title={ncr.ncrNumber || `NCR #${ncr.id}`}>
            {ncr.ncrNumber || `NCR #${ncr.id}`}
          </p>
          {isNCR2 && (
            <span className="text-xs text-purple-600 font-medium">(NCR2 Mode)</span>
          )}
        </div>
      </div>
      <div className="col-span-3 md:col-span-3">
        <p className="text-sm text-gray-600 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          {formatDate(ncr.updatedAt || ncr.ncr2SubmittedAt)}
        </p>
      </div>
      <div className="col-span-3 md:col-span-4">
        <StatusBadge status={ncr.status} />
      </div>
      <div className="col-span-2 md:col-span-2 flex justify-end gap-4">
        {(ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS') ? (
          <ActionButton onClick={() => onVerify(ncr)} variant="primary" icon={Eye} title="View & Verify Corrective Action">
            <span className="hidden sm:inline">Verify</span>
          </ActionButton>
        ) : (
          <ActionButton onClick={() => onView(ncr)} variant="secondary" icon={Eye} title="Preview Corrective Action">
            <span className="hidden sm:inline">Preview</span>
          </ActionButton>
        )}
        {/* Forum Button */}
        <button
          onClick={() => onOpenForum(ncr)}
          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Open Discussion Forum"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Closed Row Component (Updated for NCR2)
// ─────────────────────────────────────────────────────────────

const ClosedRow = ({ ncr, onView, onOpenForum }) => {
  const isNCR2 = ncr.status === 'NCR2_COMPLETED';
  
  return (
    <div className="grid grid-cols-12 gap-4 items-center px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <div className="col-span-4 md:col-span-3">
        <div>
          <p className="text-sm font-medium text-gray-900 font-mono truncate" title={ncr.ncrNumber || `NCR #${ncr.id}`}>
            {ncr.ncrNumber || `NCR #${ncr.id}`}
          </p>
          {isNCR2 && (
            <span className="text-xs text-purple-600 font-medium">(NCR2)</span>
          )}
        </div>
      </div>
      <div className="col-span-3 md:col-span-3">
        <p className="text-sm text-gray-600 flex items-center gap-1">
          <Users className="w-3 h-3 text-gray-400" />
          {ncr.department || '—'}
        </p>
      </div>
      <div className="col-span-3 md:col-span-4">
        <p className="text-sm text-gray-600 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          {formatDate(ncr.closedAt || ncr.ncr2ClosedAt)}
        </p>
      </div>
      <div className="col-span-2 md:col-span-2 flex justify-end gap-2">
        <ActionButton onClick={() => onView(ncr)} variant="secondary" icon={Eye} title="View Form 8 Details">
          <span className="hidden sm:inline">View</span>
        </ActionButton>
        <button
          onClick={() => onOpenForum(ncr)}
          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Open Discussion Forum"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Verify Modal Component (Updated for NCR2)
// ─────────────────────────────────────────────────────────────

const VerifyModal = ({ ncr, onClose, onVerify, loading }) => {
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState(null);
  const isNCR2 = ncr?.status === 'NCR2_IN_PROGRESS';

  const handleVerify = (accepted) => {
    if (!accepted && !comment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setDecision(accepted ? 'accept' : 'reject');
    onVerify(accepted, comment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {decision === 'accept' ? 'Accepting...' : decision === 'reject' ? 'Rejecting...' : `Verify ${isNCR2 ? 'NCR2' : 'Corrective Action'}`}
            </h2>
            <p className="text-sm text-gray-500">NCR #{ncr?.ncrNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> NCR Summary
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <p><strong>Status:</strong> {getStatusLabel(ncr?.status)}</p>
              <p><strong>Department:</strong> {ncr?.department || '-'}</p>
              <p><strong>Auditee:</strong> {ncr?.auditeeName || '-'}</p>
              <p><strong>Auditor:</strong> {ncr?.auditorName || '-'}</p>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Statement:</strong> {ncr?.statementOfNonconformity?.substring(0, 150)}{ncr?.statementOfNonconformity?.length > 150 ? '...' : ''}
            </p>
          </div>

          <div className={isNCR2 ? "bg-violet-50 border border-violet-100 rounded-lg p-4" : "bg-purple-50 border border-purple-100 rounded-lg p-4"}>
            <h3 className={`font-semibold ${isNCR2 ? 'text-violet-800' : 'text-purple-800'} mb-3 flex items-center gap-2`}>
              <CheckCircle className="w-4 h-4" /> 
              {isNCR2 ? 'NCR2 Corrective Action Details' : 'Corrective Action Details'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Root Cause', value: isNCR2 ? ncr?.ncr2RootCause : ncr?.rootCause },
                { label: 'Correction', value: isNCR2 ? ncr?.ncr2Correction : ncr?.correction },
                { label: 'Corrective Action', value: isNCR2 ? ncr?.ncr2CorrectiveAction : ncr?.correctiveAction },
                { label: 'Horizontal Deployment', value: isNCR2 ? ncr?.ncr2HorizontalDeployment : ncr?.horizontalDeployment },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
                  <p className="text-sm bg-white p-2 rounded mt-1 border border-gray-200">
                    {value || <span className="text-gray-400 italic">Not provided</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {(ncr?.auditeeReviewComment || ncr?.managerReviewComment) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Previous Comments</h3>
              {ncr?.auditeeReviewComment && (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Auditee Review</p>
                  <p className="text-sm bg-white p-2 rounded mt-1 border border-gray-200">{ncr.auditeeReviewComment}</p>
                </div>
              )}
              {ncr?.managerReviewComment && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Manager Review</p>
                  <p className="text-sm bg-white p-2 rounded mt-1 border border-gray-200">{ncr.managerReviewComment}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Comments {!decision && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={decision === 'reject' ? "Reason for rejection (required)" : "Add verification notes (optional)"}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleVerify(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              {loading && decision === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              Reject & Return
            </button>
            <button
              onClick={() => handleVerify(true)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              {loading && decision === 'accept' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Accept & Close
            </button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>💡 Accept:</strong> {isNCR2 ? 'NCR2 will be marked COMPLETED and archived.' : 'NCR will be marked CLOSED and archived.'}<br />
              <strong>💡 Reject:</strong> {isNCR2 ? 'NCR2 returns to Auditee for rework with your comments.' : 'NCR returns to Auditee for rework with your comments.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────

const NCRPendingDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [closedItems, setClosedItems] = useState([]);
  const [error, setError] = useState(null);
  const [selectedNCR, setSelectedNCR] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  
  // Forum Modal State
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);

 // Update the fetchAllUsers function in NCRPendingDashboard.jsx
const fetchAllUsers = async () => {
  try {
    // Change from /users/all to /users to match the working version
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    setAllUsersList(response.data || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    setAllUsersList([]);
  }
};

  // Updated loadData function to include NCR2 submissions
  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [pendingResult, allResult] = await Promise.all([
      ncrService.getPendingVerification(),
      ncrService.getAllNCRs(),
    ]);

    if (!pendingResult.success) {
      setError(pendingResult.error);
      setVerificationQueue([]);
    } else {
      const allNcrs = allResult.success ? allResult.data : pendingResult.data;
      setVerificationQueue(
        allNcrs
          .filter((ncr) => 
            // Include BOTH regular CA and NCR2 submissions
            (
              // Regular CA data
              (ncr.rootCause || ncr.correction || ncr.correctiveAction) ||
              // NCR2 data
              (ncr.ncr2RootCause || ncr.ncr2Correction || ncr.ncr2CorrectiveAction)
            ) &&
            // Exclude closed/rejected/completed
            ncr.status !== 'CLOSED' &&
            ncr.status !== 'REJECTED' &&
            ncr.status !== 'NCR2_COMPLETED' &&
            // Include IN_PROGRESS (regular) and NCR2_IN_PROGRESS
            (ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS')
          )
          .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      );
    }

    if (allResult.success) {
      setClosedItems(
        allResult.data.filter(
          (ncr) => 
            (ncr.status === 'CLOSED' || ncr.status === 'NCR2_COMPLETED') && 
            (
              (ncr.rootCause || ncr.correction || ncr.correctiveAction) ||
              (ncr.ncr2RootCause || ncr.ncr2Correction || ncr.ncr2CorrectiveAction)
            )
        )
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    fetchAllUsers();
  }, []);

  // Updated handleVerify to handle both regular and NCR2 verification
  const handleVerify = async (accepted, comment) => {
    setVerifyLoading(true);
    
    let result;
    if (selectedNCR?.status === 'NCR2_IN_PROGRESS') {
      // Use NCR2 verification endpoint
      result = await ncrService.verifyNCR2(selectedNCR.id, accepted, comment);
    } else {
      // Use regular verification endpoint
      result = await ncrService.verifyAndClose(selectedNCR.id, accepted, comment);
    }
    
    if (!result.success) {
      setError(result.error);
    } else {
      setShowVerifyModal(false);
      setSelectedNCR(null);
      await loadData();
    }
    setVerifyLoading(false);
  };

  const openVerifyModal = (ncr) => {
    setSelectedNCR(ncr);
    setShowVerifyModal(true);
  };

  const openNCRForum = (ncr) => {
    const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
    const auditor = allUsersList.find(u => u.id === ncr.auditorId);
    const auditee = allUsersList.find(u => u.id === ncr.auditeeId);
    
    setSelectedNCRForForum({
      id: ncr.id,
      ncrNumber: ncr.ncrNumber,
      department: ncr.department,
      severity: ncr.severity,
      status: ncr.status,
      auditorId: ncr.auditorId,
      auditorName: ncr.auditorName || auditor?.name,
      auditeeId: ncr.auditeeId,
      auditeeName: ncr.auditeeName || auditee?.name,
      memberEmails: [
        auditor?.email, auditee?.email, user?.email, auditManager?.email
      ].filter(Boolean)
    });
    setShowForumModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-4">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
          <p className="text-gray-700 font-medium">Loading verification queue...</p>
          <p className="text-gray-500 text-sm mt-1">Fetching submitted corrective actions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-16">
      <header className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
                  <button
                onClick={() => navigate('/audit-manager?view=ncr')}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to NCR
              </button>
              <span className="text-gray-300">/</span>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-50">
                  <CheckCircle size={16} className="text-purple-600" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">Corrective Action Verification</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Form 8 • Review & Close NCRs</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              aria-label="Refresh data"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Error</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Pending" value={verificationQueue.length} icon={Clock} colorClass="text-purple-600" />
          <StatCard title="Ready to Close" value={verificationQueue.filter((ncr) => ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS').length} icon={CheckCircle} colorClass="text-blue-600" />
          <StatCard title="NCR2 Pending" value={verificationQueue.filter((ncr) => ncr.status === 'NCR2_IN_PROGRESS').length} icon={Clock} colorClass="text-violet-600" />
          <StatCard title="Closed NCRs" value={closedItems.length} icon={CheckCircle} colorClass="text-emerald-600" />
        </div>

        <SectionCard 
          title="Submitted Corrective Actions" 
          subtitle="Review corrective actions with current status and preview history"
          action={
            verificationQueue.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {verificationQueue.filter((ncr) => ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS').length} pending
              </span>
            )
          }
        >
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <div className="col-span-4 md:col-span-3">NCR Number</div>
            <div className="col-span-3 md:col-span-3">Submitted On</div>
            <div className="col-span-3 md:col-span-4">Status</div>
            <div className="col-span-2 md:col-span-2 text-right">Action</div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {verificationQueue.length === 0 ? (
              <EmptyState 
                icon={Clock}
                title="No corrective action records"
                description="Submitted corrective actions will remain here with their current status."
              />
            ) : (
              verificationQueue.map((ncr) => (
                <VerificationRow 
                  key={ncr.id} 
                  ncr={ncr} 
                  onVerify={openVerifyModal} 
                  onView={(item) => navigate(`/form8-view/${item.id}${item.status === 'NCR2_IN_PROGRESS' ? '?type=ncr2' : ''}`)}
                  onOpenForum={openNCRForum}
                />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard 
          title="Closed NCR History" 
          subtitle="Approved corrective actions that have been closed"
          action={
            closedItems.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {closedItems.length} closed
              </span>
            )
          }
        >
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <div className="col-span-4 md:col-span-3">NCR Number</div>
            <div className="col-span-3 md:col-span-3">Department</div>
            <div className="col-span-3 md:col-span-4">Closed On</div>
            <div className="col-span-2 md:col-span-2 text-right">Action</div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {closedItems.length === 0 ? (
              <EmptyState 
                icon={CheckCircle}
                title="No closed NCRs yet"
                description="Verified NCRs will appear here once closed."
              />
            ) : (
              closedItems.map((ncr) => (
                <ClosedRow 
                  key={ncr.id} 
                  ncr={ncr} 
                  onView={(n) => navigate(`/form8-view/${n.id}${n.status === 'NCR2_COMPLETED' ? '?type=ncr2' : ''}`)}
                  onOpenForum={openNCRForum}
                />
              ))
            )}
          </div>
        </SectionCard>
      </main>

      {/* Verify Modal */}
      {showVerifyModal && selectedNCR && (
        <VerifyModal
          ncr={selectedNCR}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedNCR(null);
          }}
          onVerify={handleVerify}
          loading={verifyLoading}
        />
      )}

      {/* Forum Modal */}
      {showForumModal && selectedNCRForForum && (
        <AuditCheckSheetNCRForumModal
          auditId={selectedNCRForForum.id}
          auditNumber={selectedNCRForForum.ncrNumber}
          auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
          auditStatus={selectedNCRForForum.status}
          auditType="NCR Resolution"
          department={selectedNCRForForum.department}
          auditorId={selectedNCRForForum.auditorId}
          auditorName={selectedNCRForForum.auditorName}
          auditeeId={selectedNCRForForum.auditeeId}
          auditeeName={selectedNCRForForum.auditeeName}
          memberEmails={selectedNCRForForum.memberEmails || []}
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedNCRForForum(null);
          }}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}
    </div>
  );
};

export default NCRPendingDashboard;