import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, AlertCircle, Users, CheckCircle, Loader2, X, Download, Building, Calendar, Hash, User, Edit, Eye, ThumbsUp, ThumbsDown, Clock, FileBarChart } from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath, isAuditor } from '../utils/roleUtils';
import FinalPreview from '../steps/FinalPreview';
import BackButton from '../dashboards/leadAuditor/BackButton';


// ─────────────────────────────────────────────────────────────
// Modern card-style form styling with Times New Roman
// ─────────────────────────────────────────────────────────────
const fontFamily = "inherit, 'Times New Roman', Times, serif";

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
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100" style={{ fontFamily }}>
    <div className="p-2 bg-white rounded-lg shadow-sm">
      <Icon size={16} className="text-red-500" />
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider" style={{ fontFamily }}>{label}</p>
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
  <div className="mb-3 pb-2 border-b border-gray-50 last:border-0">
    <p className={formStyle.label} style={{ fontFamily }}>{label}</p>
    <div className={formStyle.value} style={{ fontFamily }}>
      {multiline ? (
        <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded-lg" style={{ fontFamily }}>{value || '—'}</div>
      ) : (
        <span className="font-medium" style={{ fontFamily }}>{value || '—'}</span>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// SignatureField component with proper pending state
// ─────────────────────────────────────────────────────────────
const SignatureField = ({ label, name, signature, pending = false }) => (
  <div className="text-center">
    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider" style={{ fontFamily }}>{label}</p>
    {signature && (signature.startsWith('data:image') || signature.startsWith('http')) ? (
      <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
        <img src={signature} alt={label} className="h-12 mx-auto object-contain" />
      </div>
    ) : pending ? (
      <div className="border-2 border-dashed border-amber-300 rounded-lg h-20 bg-amber-50 flex flex-col items-center justify-center">
        <Clock size={20} className="text-amber-500 mb-1" />
        <p className="text-xs text-amber-600 font-medium" style={{ fontFamily }}>Pending Acknowledgement</p>
      </div>
    ) : (
      <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 bg-gray-50" />
    )}
    <p className="text-xs text-gray-500 mt-2" style={{ fontFamily }}>{name || '—'}</p>
  </div>
);

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(185, 28, 28, 0.3))' }}>
          <h2 className="text-lg font-bold" style={{ fontFamily, color: 'rgba(220, 38, 38, 0.85)' }}>
            {decision === 'approve' ? 'Approving...' : decision === 'reject' ? 'Rejecting...' : title}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition">
            <X size={20} style={{ color: 'rgba(220, 38, 38, 0.7)' }} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.1)' }}>
            <p className="text-sm" style={{ fontFamily, color: 'rgba(75, 85, 99, 0.9)' }}>
              <strong style={{ color: 'rgba(220, 38, 38, 0.8)' }}>NCR #{ncr?.ncrNumber}</strong>
              <br />
              <strong>Department:</strong> {ncr?.department}
            </p>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2" style={{ fontFamily, color: 'rgba(75, 85, 99, 0.8)' }}>
              Comments {!decision && <span className="text-red-500 text-xs">(required for rejection)</span>}
            </label>
            <textarea
              rows={4}
              className="w-full p-3 border rounded-xl transition focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
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
        `http://localhost:8080/api/users/${userId}/signature`,
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
        `http://localhost:8080/api/ncr/${ncr.id}/form7-pdf`,
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
      ncr?.ncrNumber ? `8D-NCR-${ncr.ncrNumber}` : null,
    ].filter(Boolean);

    for (const candidate of directCandidates) {
      try {
        const response = await fetch(`http://localhost:8080/api/eightd/data/${encodeURIComponent(candidate)}`);
        const data = await response.json();
        if (response.ok && data?.success && data?.data) return candidate;
      } catch {
        // Try the next candidate/fallback search.
      }
    }

    const response = await fetch(`http://localhost:8080/api/eightd/data?t=${Date.now()}`);
    const data = await response.json();
    const events = Array.isArray(data?.data) ? data.data : [];
    const matchedEvent = events.find((event) => {
      const d0Data = Array.isArray(event?.content?.d0) ? event.content.d0[0] : {};
      return (
        String(d0Data?.sourceNcrId || '') === String(ncr?.id || '') ||
        String(d0Data?.sourceNcrNumber || '') === String(ncr?.ncrNumber || '') ||
        String(event?.eventNo || '') === `8D-NCR-${ncr?.ncrNumber || ''}`
      );
    });

    return matchedEvent?.eventNo || null;
  };

  const open8DReport = async () => {
    try {
      setLoading8DReport(true);
      const eventId = await resolve8DEventId();
      if (!eventId) {
        alert(`8D report not found for NCR #${ncr?.ncrNumber || ncr?.id}`);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-500 font-medium" style={{ fontFamily }}>Loading NCR details...</p>
        </div>
      </div>
    );
  }

  if (error || !ncr) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4" style={{ fontFamily }}>{error || 'NCR not found'}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 print:bg-white print:p-0">
      

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
      className="p-2.5 text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition disabled:opacity-50 shadow-sm"
      title="Download PDF"
      style={{ fontFamily }}
    >
      {pdfDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
    </button>
  </div>
</div>


      {/* Main Form Card */}
      <div className={formStyle.container} id="ncr-form">

        {/* Header */}
        <div className={formStyle.header}>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-xl font-bold text-white print:text-gray-900" style={{ fontFamily }}>Nonconformity Report (NCR)</h1>
              <p className="text-sm text-gray-300 print:text-gray-500 mt-1" style={{ fontFamily }}>{ncr.companyName || 'Quality Management System'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/80 print:text-gray-600" style={{ fontFamily }}>
                <span className="opacity-70">Audit Report:</span> {ncr.auditReportNumber || 'INT/20xx/01'}
              </p>
              <p className="text-lg font-bold text-white print:text-gray-800" style={{ fontFamily }}>
                NCR #{ncr.ncrNumber || '03'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 print:bg-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <FormSection title="✍️ Acknowledgement">
          <div className="grid md:grid-cols-2 gap-8">
            <SignatureField
              label="Auditor Signature"
              name={ncr.auditorName}
              signature={finalAuditorSignature}
            />
            <SignatureField
              label="Auditee Representative"
              name={ncr.auditeeName}
              signature={finalAuditeeSignature}
              pending={!auditeeHasReviewed}
            />
          </div>
        </FormSection>

        {/* Manager Comment Section */}
        {ncr.managerReviewComment && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 print:bg-gray-50">
            <div className="flex gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider" style={{ fontFamily }}>Audit Manager Comment</p>
                <p className="text-sm text-blue-900 mt-1" style={{ fontFamily }}>{ncr.managerReviewComment}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={formStyle.footer}>
          <div className="flex flex-wrap justify-center gap-4 text-xs" style={{ fontFamily }}>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> (O+)Ve: Conformance</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> (O-)Ve: Non Conformance</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> (OI): Opportunity for Improvement</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-5xl mx-auto mt-6 flex flex-wrap justify-end gap-3 print:hidden">
       {/* Only show View Form 8 button if actual data exists */}
{/* Only show View Form 8 button if actual data exists */}
{(ncr?.rootCause?.trim() || ncr?.correction?.trim() || ncr?.correctiveAction?.trim() || 
  ncr?.ncr2RootCause?.trim() || ncr?.ncr2Correction?.trim() || ncr?.ncr2CorrectiveAction?.trim()) && (
  <button
    onClick={() => navigate(`/form8-view/${ncr.id}${isNcr2Flow ? '?type=ncr2' : ''}`)}
    className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition shadow-sm flex items-center gap-2"
    style={{ fontFamily }}
  >
    <Eye size={16} /> View Form 8
  </button>
)}

{is8DRelated && (
  <button
    onClick={open8DReport}
    disabled={loading8DReport}
    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    style={{ fontFamily }}
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
    style={{ fontFamily }}
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
    style={{ fontFamily }}
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
{showReviewModal && ncr && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>Review NCR</h3>
        <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>
      
      {/* Display Audit Score */}
      {ncr.auditScore != null && (
        <div className={`p-3 mb-4 rounded-lg ${ncr.auditScore >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500" style={{ fontFamily }}>Audit Score</p>
              <p className={`text-2xl font-bold ${ncr.auditScore >= 70 ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily }}>
                {ncr.auditScore}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500" style={{ fontFamily }}>
                {ncr.auditScore >= 70 
                  ? '✅ Score above threshold - Normal NCR flow' 
                  : '⚠️ Score below threshold - Requires 8D process'}
              </p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${ncr.auditScore >= 70 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${ncr.auditScore}%` }}
            />
          </div>
        </div>
      )}
      
      {/* 8D Option - Only shown when score < 70 */}
      {ncr.auditScore != null && ncr.auditScore < 70 && (
        <div className="mb-4 p-3 border border-purple-200 rounded-lg bg-purple-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendTo8D}
              onChange={(e) => setSendTo8D(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700" style={{ fontFamily }}>
              Send to 8D Team for investigation
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6" style={{ fontFamily }}>
            Audit score ({ncr.auditScore}%) is below threshold (70%). 
            Recommended to send to 8D instead of normal corrective action.
          </p>
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily }}>
          Comments {!sendTo8D && <span className="text-red-500 text-xs">(required for rejection)</span>}
        </label>
        <textarea
          rows={4}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500/50"
          style={{ fontFamily }}
          placeholder="Enter review comments..."
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
        />
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={handleReject}
          disabled={reviewLoading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ fontFamily }}
        >
          {reviewLoading && <Loader2 size={16} className="animate-spin" />}
          <ThumbsDown size={16} /> Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={reviewLoading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ fontFamily }}
        >
          {reviewLoading && <Loader2 size={16} className="animate-spin" />}
          <ThumbsUp size={16} /> {sendTo8D && ncr.auditScore < 70 ? 'Approve & Send to 8D' : 'Approve'}
        </button>
      </div>
    </div>
  </div>
)}

      {showAuditeeReviewModal && (
        <ReviewModal
          ncr={ncr}
          onClose={() => setShowAuditeeReviewModal(false)}
          onReview={handleAuditeeReview}
          loading={reviewLoading}
          title="Auditee NCR Review"
          approveLabel="Accept"
          rejectLabel="Reject"
        />
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
                className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
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
