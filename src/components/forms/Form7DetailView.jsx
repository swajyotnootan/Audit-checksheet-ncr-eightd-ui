import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, AlertCircle, Users, CheckCircle,Info, Loader2, X, Download, Building, Calendar, Hash, User, Edit, Eye, ThumbsUp, ThumbsDown, Clock, FileBarChart } from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath, isAuditor } from '../utils/roleUtils';
import FinalPreview from '../steps/FinalPreview';
import BackButton from '../dashboards/leadAuditor/BackButton';
import { Collapse } from '@mui/material';


// ─────────────────────────────────────────────────────────────
// Modern card-style form styling with Times New Roman
// ─────────────────────────────────────────────────────────────
const fontFamily = "inherit, 'Times New Roman', Times, serif";



const COLORS = {
  primary: '#00529B',
  secondary: '#3b82f6',
  dark: '#1e3a8a',
  light: '#60a5fa',
  lighter: '#93c5fd',
  bg: '#eff6ff',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const formStyle = {
  container: 'max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none',
  header: 'bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 print:bg-white print:border-b-2 print:border-gray-300',
  section: 'px-6 py-5 border-b border-gray-100 print:border-gray-200',
  sectionTitle: 'text-base font-bold text-gray-800 mb-4 pb-2 border-b-2 border-red-500 inline-block',
  table: 'w-full text-sm',
  tableCell: 'px-3 py-2.5 align-top border-b border-gray-100',
  tableHeader: 'px-3 py-2.5 bg-gray-50 font-semibold text-xs uppercase tracking-wider text-gray-600 border-b border-gray-200',
  label: 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block',
  value: 'text-sm text-gray-800 leading-relaxed',
  signatureBox: 'border-2 border-dashed border-gray-300 rounded-lg h-16 mt-1 bg-gray-50 flex items-center justify-center',
  footer: 'px-6 py-4 bg-gray-50 text-xs text-gray-500 border-t border-gray-200 print:bg-white',
};

const StatusBadge = ({ status }) => {
  const config = {
    AWAITING_AUDITEE: { bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock, label: 'Awaiting Auditee Review' },
    OPEN: { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle, label: 'Pending Manager Approval' },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle, label: 'Approved - Ready for Corrective Action' },
    IN_PROGRESS: { bg: 'bg-purple-100', text: 'text-purple-800', icon: FileText, label: 'Corrective Action Submitted' },
    CLOSED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Closed' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: X, label: 'Rejected' },
  };
  const { bg, text, icon: Icon, label } = config[status] || config.OPEN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`} style={{ fontFamily }}>
      <Icon size={12} /> {label}
    </span>
  );
};

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 border border-gray-100 bg-gray-50 rounded-xl" style={{ fontFamily }}>
    <div className="p-2 bg-white rounded-lg shadow-sm">
      <Icon size={16} className="text-red-500" />
    </div>
    <div>
      <p className="text-xs tracking-wider text-gray-500 uppercase" style={{ fontFamily }}>{label}</p>
      <p className="text-sm font-semibold text-gray-800" style={{ fontFamily }}>{value || '—'}</p>
    </div>
  </div>
);

const FormSection = ({ title, children }) => (
  <div className={formStyle.section}>
    <h3 className={formStyle.sectionTitle} style={{ fontFamily }}>{title}</h3>
    <div className="mt-3">{children}</div>
  </div>
);

const DetailRow = ({ label, value, multiline = false }) => (
  <div className="pb-2 mb-3 border-b border-gray-50 last:border-0">
    <p className={formStyle.label} style={{ fontFamily }}>{label}</p>
    <div className={formStyle.value} style={{ fontFamily }}>
      {multiline ? (
        <div className="p-3 whitespace-pre-wrap rounded-lg bg-gray-50" style={{ fontFamily }}>{value || '—'}</div>
      ) : (
        <span className="font-medium" style={{ fontFamily }}>{value || '—'}</span>
      )}
    </div>
  </div>
);

// Add this helper function
const formatLocalDateTime = (utcDateStr) => {
  if (!utcDateStr) return null;
  try {
    const date = new Date(utcDateStr);
    if (isNaN(date.getTime())) return null;
    
    // ✅ This automatically converts UTC to user's local timezone
    // Using 'en-IN' for Indian format, but it will use the browser's timezone
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// SignatureField component with proper pending state
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// SignatureField component with timestamp support
// ─────────────────────────────────────────────────────────────
const SignatureField = ({ label, name, signature, pending = false, timestamp }) => {
  // timestamp is already formatted by formatLocalDateTime - use it directly
  return (
    <div className="text-center">
      <p className="mb-2 text-xs font-semibold tracking-wider text-gray-600 uppercase" style={{ fontFamily }}>
        {label}
      </p>

      {signature && (signature.startsWith('data:image') || signature.startsWith('http')) ? (
        <div className="p-2 border border-gray-200 rounded-lg bg-gray-50">
          <img src={signature} alt={label} className="object-contain h-12 mx-auto" />
        </div>
      ) : pending ? (
        <div className="flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg border-amber-300 bg-amber-50">
          <Clock size={20} className="mb-1 text-amber-500" />
          <p className="text-xs font-medium text-amber-600" style={{ fontFamily }}>Pending Acknowledgement</p>
        </div>
      ) : (
        <div className="h-20 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50" />
      )}

      <p className="mt-2 text-xs font-medium text-gray-500" style={{ fontFamily }}>{name || '—'}</p>

      {timestamp && (
        <p className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-400" style={{ fontFamily }}>
          <Clock size={11} />
          {timestamp}
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ReviewModal Component
// ─────────────────────────────────────────────────────────────
const ReviewModal = ({
  ncr,
  onClose,
  onReview,
  loading,
  title = 'Review NCR',
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
}) => {
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState(null);

  const handleReview = (approved) => {
    if (!approved && !comment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setDecision(approved ? 'approve' : 'reject');
    onReview(approved, comment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 overflow-hidden duration-200 bg-white shadow-2xl rounded-2xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(185, 28, 28, 0.3))' }}>
          <h2 className="text-lg font-bold" style={{ fontFamily, color: 'rgba(220, 38, 38, 0.85)' }}>
            {decision === 'approve' ? 'Approving...' : decision === 'reject' ? 'Rejecting...' : title}
          </h2>
          <button onClick={onClose} className="p-1 transition rounded-lg hover:bg-white/20">
            <X size={20} style={{ color: 'rgba(220, 38, 38, 0.7)' }} />
          </button>
        </div>

        <div className="p-5">
          <div className="p-3 mb-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.1)' }}>
            <p className="text-sm" style={{ fontFamily, color: 'rgba(75, 85, 99, 0.9)' }}>
              <strong style={{ color: 'rgba(220, 38, 38, 0.8)' }}>NCR {ncr?.ncrNumber}</strong>
              <br />
              <strong>Department:</strong> {ncr?.department}
            </p>
          </div>

          <div className="mb-5">
            <label className="block mb-2 text-sm font-medium" style={{ fontFamily, color: 'rgba(75, 85, 99, 0.8)' }}>
              Comments {!decision && <span className="text-xs text-red-500">(required for rejection)</span>}
            </label>
            <textarea
              rows={4}
              className="w-full p-3 transition border rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
              style={{ fontFamily, borderColor: 'rgba(209, 213, 219, 0.5)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter review comments..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleReview(false)}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition font-medium disabled:opacity-50"
              style={{ fontFamily, backgroundColor: 'rgba(220, 38, 38, 0.8)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(185, 28, 28, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.8)'}
            >
              {loading && decision === 'reject' && <Loader2 size={16} className="animate-spin" />}
              <ThumbsDown size={16} /> {rejectLabel}
            </button>
            <button
              onClick={() => handleReview(true)}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition font-medium disabled:opacity-50"
              style={{ fontFamily, backgroundColor: 'rgba(16, 185, 129, 0.8)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.8)'}
            >
              {loading && decision === 'approve' && <Loader2 size={16} className="animate-spin" />}
              <ThumbsUp size={16} /> {approveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function Form7DetailView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAuditManager, isAuditee, isHOD } = useAuth();
  const dashboardPath = getDashboardPath(user);
  const isAuditeeRole = isAuditee || isHOD;

  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [ncr, setNcr] = useState(null);
  const [error, setError] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAuditeeReviewModal, setShowAuditeeReviewModal] = useState(false);
  const [auditorSignature, setAuditorSignature] = useState(null);
  const [auditeeSignature, setAuditeeSignature] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [sendTo8D, setSendTo8D] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [show8DReportModal, setShow8DReportModal] = useState(false);
  const [selected8DEventId, setSelected8DEventId] = useState(null);
  const [loading8DReport, setLoading8DReport] = useState(false);

  // Fetch signature blob → base64 by userId
  const fetchSignature = async (userId) => {
    if (!userId) return null;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://internalaudit.hub.swajyot.co.in:8090
/api/users/${userId}/signature`,
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Error fetching signature:', err);
      return null;
    }
  };

  // Fetch NCR + both signatures
  const fetchNCRDetail = async () => {
    setLoading(true);
    setError(null);

    const result = await ncrService.getNCRById(id);

    if (result.success) {
      const ncrData = result.data;
      setNcr(ncrData);

      if (ncrData.auditorId) {
        const sig = await fetchSignature(ncrData.auditorId);
        if (sig) setAuditorSignature(sig);
      }

      if (ncrData.auditeeId) {
        const sig = await fetchSignature(ncrData.auditeeId);
        if (sig) setAuditeeSignature(sig);
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchNCRDetail();
  }, [id]);

  // PDF download
  const downloadPDF = async () => {
    if (!ncr?.id) { alert('NCR ID not found'); return; }
    setPdfDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://internalaudit.hub.swajyot.co.in:8090
/api/ncr/${ncr.id}/form7-pdf`,
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Form7_NCR_${ncr.ncrNumber || ncr.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download PDF');
      }
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Error downloading PDF');
    } finally {
      setPdfDownloading(false);
    }
  };

  // Manager review
  // Manager review - Updated to handle 8D
// Manager review - Updated to handle 8D
// In Form7DetailView.js

const handleReview = async (approved, comment) => {
    setReviewLoading(true);
    setError(null); // ✅ Clear previous errors
    try {
        let result;
        
        // Check if this is a normal approve OR send to 8D
        if (approved && sendTo8D && ncr?.auditScore < 70) {
            // Send to 8D
            result = await ncrService.sendTo8D(id, comment, user?.id);
            
            // ✅ CHECK RESULT EXPLICITLY
            if (!result || !result.success) {
                throw new Error(result?.error || "Failed to send to 8D");
            }
            
            setShowReviewModal(false);
            await fetchNCRDetail();
            return; // ✅ Exit early
        } 
        
        if (approved) {
            // Normal approve
            result = await ncrService.reviewNCR(id, comment, true);
        } else {
            // Reject
            result = await ncrService.reviewNCR(id, comment, false);
        }

        if (!result || !result.success) {
            throw new Error(result?.error || "Operation failed");
        }

        setShowReviewModal(false);
        await fetchNCRDetail();

    } catch (error) {
        console.error("Review Error:", error);
        // ✅ SET ERROR STATE SO USER SEES IT
        setError(error.message || "An unexpected error occurred");
    } finally {
        setReviewLoading(false);
    }
};

const handleApprove = () => {
  handleReview(true, reviewComment);
};

const handleReject = () => {
  handleReview(false, reviewComment);
};

  // Auditee review
  const handleAuditeeReview = async (approved, comment) => {
    setReviewLoading(true);
    const result = await ncrService.auditeeReviewNCR(id, approved, comment, '');
    if (result.success) {
      setShowAuditeeReviewModal(false);
      await fetchNCRDetail();
    } else {
      setError(result.error);
    }
    setReviewLoading(false);
  };

  // Permission flags
  const canManagerReview = isAuditManager && ncr?.status === 'OPEN';
  const canAuditeeReview = isAuditeeRole && ncr?.status === 'AWAITING_AUDITEE';
  const canSubmitCA = isAuditeeRole && (ncr?.status === 'APPROVED' || ncr?.status === 'READY_FOR_NCR2');
  const canEdit = ncr?.status === 'OPEN';
  const isNcr2Flow = Boolean(
    ncr?.ncr2RootCause ||
    ncr?.ncr2Correction ||
    ncr?.ncr2CorrectiveAction ||
    ['READY_FOR_NCR2', 'NCR2_IN_PROGRESS', 'NCR2_COMPLETED'].includes(ncr?.status)
  );
  const hasForm8Data = Boolean(
    ncr?.rootCause ||
    ncr?.correction ||
    ncr?.correctiveAction ||
    isNcr2Flow
  );
  const is8DRelated = Boolean(
    ncr?.requires8D ||
    ['SENT_TO_8D', 'IN_8D_PROCESS', 'READY_FOR_NCR2', 'NCR2_IN_PROGRESS', 'NCR2_COMPLETED'].includes(ncr?.status)
  );

  const resolve8DEventId = async () => {
    const directCandidates = [
      ncr?.eightDEventId,
      ncr?.eightDEventNo,
      ncr?.eventNo,
      ncr?.ncrNumber ? `8D-${ncr.ncrNumber}` : null,
    ].filter(Boolean);

    for (const candidate of directCandidates) {
      try {
        const response = await fetch(`https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data/${encodeURIComponent(candidate)}`);
        const data = await response.json();
        if (response.ok && data?.success && data?.data) return candidate;
      } catch {
        // Try the next candidate/fallback search.
      }
    }

    const response = await fetch(`https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data?t=${Date.now()}`);
    const data = await response.json();
    const events = Array.isArray(data?.data) ? data.data : [];
    const matchedEvent = events.find((event) => {
      const d0Data = Array.isArray(event?.content?.d0) ? event.content.d0[0] : {};
      return (
        String(d0Data?.sourceNcrId || '') === String(ncr?.id || '') ||
        String(d0Data?.sourceNcrNumber || '') === String(ncr?.ncrNumber || '') ||
        String(event?.eventNo || '') === `8D-${ncr?.ncrNumber || ''}`
      );
    });

    return matchedEvent?.eventNo || null;
  };

  const open8DReport = async () => {
    try {
      setLoading8DReport(true);
      const eventId = await resolve8DEventId();
      if (!eventId) {
        alert(`8D report not found for NCR ${ncr?.ncrNumber || ncr?.id}`);
        return;
      }
      setSelected8DEventId(eventId);
      setShow8DReportModal(true);
    } catch (error) {
      console.error('Error opening 8D report:', error);
      alert('Failed to open 8D report.');
    } finally {
      setLoading8DReport(false);
    }
  };

  // Signature display logic
  const finalAuditorSignature = auditorSignature || ncr?.auditorSignature;
  const auditeeHasReviewed = ncr?.status !== 'AWAITING_AUDITEE';
  const finalAuditeeSignature = auditeeHasReviewed
    ? (auditeeSignature || ncr?.auditeeSignature)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto mb-4 text-red-500 animate-spin" />
          <p className="font-medium text-gray-500" style={{ fontFamily }}>Loading NCR details...</p>
        </div>
      </div>
    );
  }

  if (error || !ncr) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md p-8 text-center bg-white shadow-lg rounded-2xl">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="mb-4 text-gray-600" style={{ fontFamily }}>{error || 'NCR not found'}</p>
          <button
            onClick={() => navigate(dashboardPath)}
            className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium"
            style={{ fontFamily }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 bg-gradient-to-br from-gray-50 to-gray-100 print:bg-white print:p-0">
      

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between max-w-5xl gap-3 mx-auto mb-5 print:hidden">
  <BackButton 
    defaultTab="ncrs" 
    label="Back to NCRs"
  />

  <div className="flex items-center gap-3">
  <StatusBadge status={ncr.status} />
  <button
    onClick={downloadPDF}
    disabled={pdfDownloading}
    className="flex items-center gap-2 px-2 py-2.5 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 shadow-sm hover:shadow-md"
    title="Download PDF"
    style={{ fontFamily, background: COLORS.primary }}
  >
    {pdfDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
    <span>Download PDF</span>
  </button>
</div>
</div>

      {/* Main Form Card */}
      <div className={formStyle.container} id="ncr-form">

        {/* Header */}
       <div 
  className={formStyle.header}
  style={{
    background: COLORS.primary
    // background: `linear-gradient(to bottom right, #60a5fa, ${COLORS.secondary})`,
    // border: `1px solid ${COLORS.secondary}4D`
  }}
>
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-xl font-bold text-white print:text-gray-900" style={{ fontFamily }}>
        Nonconformity Report (NCR)
      </h1>
      <p className="mt-1 text-sm text-gray-300 print:text-gray-500" style={{ fontFamily }}>
        {ncr.companyName || 'Quality Management System'}
      </p>
    </div>
    <div className="text-right">
      <p className="text-sm font-medium text-white/80 print:text-gray-600" style={{ fontFamily }}>
        <span className="opacity-70">Audit Report:</span> {ncr.auditReportNumber || 'INT/20xx/01'}
      </p>
      <p className="text-lg font-bold text-white print:text-gray-800" style={{ fontFamily }}>
        {ncr.ncrNumber || '03'}
      </p>
    </div>
  </div>
</div>

        {/* Info Cards Row */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 print:bg-white">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoCard icon={Building} label="Department" value={ncr.department} />
            <InfoCard icon={User} label="Auditor" value={ncr.auditorName} />
            <InfoCard icon={Users} label="Auditee" value={ncr.auditeeName} />
            <InfoCard icon={Calendar} label="Due Date" value={ncr.dueDate ? new Date(ncr.dueDate).toLocaleDateString() : '—'} />
          </div>
        </div>

        {/* Section 1: Nonconformity Details */}
        <FormSection title="📋 Nonconformity Details">
          <DetailRow label="Process / Area / Department" value={ncr.department} />
          <DetailRow label="Clause Reference" value={ncr.clauseNumber} />
          <DetailRow label="Objective Evidence" value={ncr.objectiveEvidence} multiline />
          <DetailRow label="Statement of Nonconformity" value={ncr.statementOfNonconformity} multiline />
        </FormSection>

        {/* Section 2: Acknowledgement & Signatures */}
       {/* Section 2: Acknowledgement & Signatures */}
<FormSection title="✍️ Acknowledgement">
  <div className="grid gap-8 md:grid-cols-2">
    <SignatureField
  label="Auditor Signature"
  name={ncr.auditorName}
  signature={finalAuditorSignature}
  timestamp={formatLocalDateTime(ncr.createdAt || ncr.auditorSignedAt)}  // ✅ UTC → Local
/>
<SignatureField
  label="Auditee Representative"
  name={ncr.auditeeName}
  signature={finalAuditeeSignature}
  pending={!auditeeHasReviewed}
  timestamp={auditeeHasReviewed ? formatLocalDateTime(ncr.updatedAt || ncr.auditeeSignedAt) : null}  // ✅ UTC → Local
/>
  </div>
</FormSection>

        {/* Manager Comment Section */}
        {ncr.managerReviewComment && (
          <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 print:bg-gray-50">
            <div className="flex gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-blue-700 uppercase" style={{ fontFamily }}>Audit Manager Comment</p>
                <p className="mt-1 text-sm text-blue-900" style={{ fontFamily }}>{ncr.managerReviewComment}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={formStyle.footer}>
          <div className="flex flex-wrap justify-center gap-4 text-xs" style={{ fontFamily }}>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> (O+)Ve: Conformance</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> (O-)Ve: Non Conformance</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> (OI): Opportunity for Improvement</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end max-w-5xl gap-3 mx-auto mt-6 print:hidden">
       {/* Only show View Form 8 button if actual data exists */}
{/* Only show View Form 8 button if actual data exists */}
{(ncr?.rootCause?.trim() || ncr?.correction?.trim() || ncr?.correctiveAction?.trim() || 
  ncr?.ncr2RootCause?.trim() || ncr?.ncr2Correction?.trim() || ncr?.ncr2CorrectiveAction?.trim()) && (
  <button
    onClick={() => navigate(`/form8-view/${ncr.id}${isNcr2Flow ? '?type=ncr2' : ''}`)}
    className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition shadow-sm flex items-center gap-2"
    style={{ fontFamily ,  background: 'linear-gradient(135deg, #0ea5e9 50%, #3b82f6 100%)'}}
  >
    <Eye size={16} /> View NCR2
  </button>
)}

{is8DRelated && (
  <button
    onClick={open8DReport}
    disabled={loading8DReport}
    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    style={{ fontFamily, background: COLORS.primary }}
  >
    {loading8DReport ? <Loader2 size={16} className="animate-spin" /> : <FileBarChart size={16} />}
    View 8D Report
  </button>
)}

{canManagerReview && (
  <button
    onClick={() => setShowReviewModal(true)}
    className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition shadow-sm flex items-center gap-2"
    style={{ fontFamily }}
  >
    <CheckCircle size={16} /> Review & Decide
  </button>
)}

{canAuditeeReview && (
  <button
    onClick={() => setShowAuditeeReviewModal(true)}
    className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition shadow-sm flex items-center gap-2"
    style={{ fontFamily, background: ` linear-gradient(to bottom right, #60a5fa, ${COLORS.secondary})` }}
  >
    <ThumbsUp size={16} /> Accept / Reject
  </button>
)}

{canEdit && (
  <button
    onClick={() => navigate(`/form7?id=${ncr.id}`)}
    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition shadow-sm flex items-center gap-2"
    style={{ fontFamily }}
  >
    <Edit size={16} /> Edit NCR
  </button>
)}

{canSubmitCA && (
  <button
    onClick={() => navigate(`/form8?id=${ncr.id}${ncr?.status === 'READY_FOR_NCR2' ? '&type=ncr2' : ''}`)}
    className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition shadow-sm flex items-center gap-2"
    style={{ fontFamily, background: ` linear-gradient(to bottom right, #60a5fa, ${COLORS.secondary})` }}
  >
    <FileText size={16} /> {ncr?.status === 'READY_FOR_NCR2' ? 'Submit NCR2' : 'Submit Corrective Action'}
  </button>
)}

{isAuditeeRole && ncr.status === 'IN_PROGRESS' && ncr.rejectionReason && (
  <button
    onClick={() => navigate(`/form8?id=${ncr.id}`)}
    className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition shadow-sm flex items-center gap-2"
    style={{ fontFamily }}
  >
    <Edit size={16} /> Revise Corrective Action
  </button>
)}
      </div>

      {/* Review Modal */}
{/* Review Modal */}
{/* ============================================================================
    REVIEW NCR MODAL - MNC Professional Style
    ============================================================================ */}
{showReviewModal && ncr && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
  >
    <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl animate-scaleIn">
      
      {/* Header with gradient */}
      <div className="px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${COLORS.bg}, #dbeafe)` }}>
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
          <FileText size={32} style={{ color: COLORS.primary }} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Review NCR</h2>
        <p className="mt-1 text-sm text-slate-600">
          NCR Number: <span className="font-semibold" style={{ color: COLORS.primary }}>{ncr.ncrNumber || '—'}</span>
        </p>
        <button
          onClick={() => setShowReviewModal(false)}
          className="absolute p-2 transition-all rounded-lg top-4 right-4 text-slate-500 hover:bg-white/50"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        
        {/* Display Audit Score */}
        {ncr.auditScore != null && (
          <div 
            className="p-4 mb-4 border rounded-xl"
            style={{
              backgroundColor: ncr.auditScore >= 70 ? '#f0fdf4' : '#fef2f2',
              borderColor: ncr.auditScore >= 70 ? '#bbf7d0' : '#fecaca'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Audit Score</p>
                <p 
                  className="text-2xl font-bold"
                  style={{ color: ncr.auditScore >= 70 ? COLORS.success : COLORS.danger }}
                >
                  {ncr.auditScore}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">
                  {ncr.auditScore >= 70 
                    ? '✅ Above threshold - Normal NCR flow' 
                    : '⚠️ Below threshold - Requires 8D process'}
                </p>
              </div>
            </div>
            <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ 
                  width: `${ncr.auditScore}%`,
                  backgroundColor: ncr.auditScore >= 70 ? COLORS.success : COLORS.danger
                }}
              />
            </div>
          </div>
        )}

        {/* 8D Option - Only shown when score < 70 */}
        {ncr.auditScore != null && ncr.auditScore < 70 && (
          <div 
            className="flex items-start gap-3 p-3 mb-4 border rounded-xl"
            style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}
          >
            <input
              type="checkbox"
              checked={sendTo8D}
              onChange={(e) => setSendTo8D(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded"
              style={{ accentColor: '#9333ea' }}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">
                Send to 8D Team for investigation
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Audit score ({ncr.auditScore}%) is below threshold (70%). 
                Recommended to send to 8D instead of normal corrective action.
              </p>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Comments {!sendTo8D && <span className="ml-1 text-xs text-rose-500">(required for rejection)</span>}
          </label>
          <textarea
            rows={4}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white shadow-sm resize-none"
            placeholder="Enter review comments..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={reviewLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            style={{ backgroundColor: COLORS.danger }}
          >
            {reviewLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />}
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={reviewLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            style={{
              background: `linear-gradient(to bottom right, #60a5fa, ${COLORS.secondary})`,
              border: `1px solid ${COLORS.secondary}4D`
            }}
          >
            {reviewLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
            {sendTo8D && ncr.auditScore < 70 ? 'Approve & Send to 8D' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* ============================================================================
    AUDITEE REVIEW MODAL
    ============================================================================ */}
{showAuditeeReviewModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
  >
    <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl animate-scaleIn">
      
      {/* Header with gradient */}
      <div className="px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${COLORS.bg}, #dbeafe)` }}>
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
          <Users size={32} style={{ color: COLORS.primary }} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Auditee NCR Review</h2>
        <p className="mt-1 text-sm text-slate-600">
          NCR Number: <span className="font-semibold" style={{ color: COLORS.primary }}>{ncr.ncrNumber || '—'}</span>
        </p>
        <button
          onClick={() => setShowAuditeeReviewModal(false)}
          className="absolute p-2 transition-all rounded-lg top-4 right-4 text-slate-500 hover:bg-white/50"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        
        

        {/* NCR Summary */}
        <div className="mb-5 ">
          <div className="p-3 text-center border rounded-xl bg-slate-50 border-slate-200">
            <p className="mb-1 text-xs text-slate-500">Department</p>
            <span className="text-sm font-semibold truncate text-slate-800">{ncr.department || '—'}</span>
            {/* <p className="text-sm font-semibold truncate text-slate-800">{ncr.department || '—'}</p> */}
          </div>
          
        </div>

        {/* Comments Section */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Comments <span className="ml-1 text-xs text-rose-500">(required)</span>
          </label>
          <textarea
            rows={4}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white shadow-sm resize-none"
            placeholder="Enter your review comments..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() =>  handleAuditeeReview(false, reviewComment)}
            disabled={reviewLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            style={{ backgroundColor: COLORS.danger }}
          >
            {reviewLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />}
            Reject
          </button>
          <button
            onClick={() =>  handleAuditeeReview(true, reviewComment)}
            disabled={reviewLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            style={{
              background: `linear-gradient(to bottom right, #60a5fa, ${COLORS.secondary})`,
              border: `1px solid ${COLORS.secondary}4D`
            }}
          >
            {reviewLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
            Accept
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {show8DReportModal && selected8DEventId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="min-h-screen px-4 py-6">
            <div className="relative max-w-6xl mx-auto">
              <button
                onClick={() => {
                  setShow8DReportModal(false);
                  setSelected8DEventId(null);
                }}
                className="absolute z-10 p-2 text-white transition-colors bg-red-500 rounded-full shadow-lg -top-2 -right-2 hover:bg-red-600"
                title="Close 8D report"
              >
                <X size={24} />
              </button>
              <FinalPreview
                eventId={selected8DEventId}
                isHOD={user?.role === 'AUDIT_MANAGER' || user?.role === 'HOD'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
