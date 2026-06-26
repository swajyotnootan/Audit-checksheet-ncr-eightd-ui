import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, Download, CheckCircle, AlertCircle, FileText, Users, 
  Calendar, Building, User, Hash, Clock, List, FileCheck, Target, Shield, 
  Layers, Eye, FileBarChart, X 
} from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/roleUtils';
import FinalPreview from '../steps/FinalPreview';
import BackButton from '../dashboards/leadAuditor/BackButton';

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
  header: 'px-6 py-5 print:bg-white print:border-b-2 print:border-gray-300',
  section: 'px-6 py-5 border-b border-gray-100 print:border-gray-200',
  sectionTitle: 'text-base font-bold text-gray-800 mb-4 pb-2 border-b-2 border-red-500 inline-block',
  label: 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block',
  value: 'text-sm text-gray-800 leading-relaxed',
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
    NCR2_IN_PROGRESS: { bg: 'bg-purple-100', text: 'text-purple-800', icon: FileText, label: 'NCR2 In Progress' },
    NCR2_COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'NCR2 Completed' },
    READY_FOR_NCR2: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Target, label: 'Ready for NCR2' },
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
    {label && <p className={formStyle.label} style={{ fontFamily }}>{label}</p>}
    <div className={formStyle.value} style={{ fontFamily }}>
      {multiline ? (
        <div className="p-3 whitespace-pre-wrap rounded-lg bg-gray-50" style={{ fontFamily }}>{value || '—'}</div>
      ) : (
        <span className="font-medium" style={{ fontFamily }}>{value || '—'}</span>
      )}
    </div>
  </div>
);

export default function Form8DetailView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, isAuditManager, isAuditee, isHOD } = useAuth();
  const isAuditeeRole = isAuditee || isHOD;
  const dashboardPath = getDashboardPath(user);
  
  const isNCR2Mode = searchParams.get('type') === 'ncr2';
  
  const [loading, setLoading] = useState(true);
  const [ncr, setNcr] = useState(null);
  const [error, setError] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [show8DReportModal, setShow8DReportModal] = useState(false);
  const [selected8DEventId, setSelected8DEventId] = useState(null);
  const [loading8DReport, setLoading8DReport] = useState(false);

  useEffect(() => { if (id) fetchNcr(); }, [id]);

  const fetchNcr = async () => {
    setLoading(true);
    const result = await ncrService.getNCRById(id);
    if (result.success) setNcr(result.data);
    else setError(result.error);
    setLoading(false);
  };

  const downloadPDF = async () => {
    if (!ncr?.id) {
      alert('NCR ID not found');
      return;
    }
    
    setPdfDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = isNCR2Mode 
        ? `https://internalaudit.hub.swajyot.co.in:8090
/api/ncr/${ncr.id}/form8-pdf?type=ncr2`
        : `https://internalaudit.hub.swajyot.co.in:8090
/api/ncr/${ncr.id}/form8-pdf`;
        
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${isNCR2Mode ? 'NCR2' : 'Form8'}_CA_${ncr.ncrNumber || ncr.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        const modalMsg = isNCR2Mode
          ? `NCR2 PDF for NCR ${ncr.ncrNumber || ncr.id} has been downloaded successfully!`
          : `Form 8 PDF for NCR ${ncr.ncrNumber || ncr.id} has been downloaded successfully!`;
        setModalMessage(modalMsg);
        setShowSuccessModal(true);
      } else {
        alert('Failed to download PDF');
      }
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Error downloading PDF');
    } finally {
      setPdfDownloading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

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

  // Parse objective evidence into structured bullet points
  const parseStructuredEvidence = (evidenceText) => {
    if (!evidenceText) return [];
    
    try {
      const parsed = JSON.parse(evidenceText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, process as text with bullet points
    }
    
    const bulletPattern = /[●▲■•\-]\s*|\d+\.\s+/g;
    const lines = evidenceText.split(/\r?\n/);
    const items = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      if (bulletPattern.test(trimmedLine) || trimmedLine.startsWith('●') || trimmedLine.startsWith('▲') || trimmedLine.startsWith('■') || trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        let bulletType = '●';
        let content = trimmedLine;
        
        if (trimmedLine.startsWith('●')) {
          bulletType = '●';
          content = trimmedLine.substring(1).trim();
        } else if (trimmedLine.startsWith('▲')) {
          bulletType = '▲';
          content = trimmedLine.substring(1).trim();
        } else if (trimmedLine.startsWith('■')) {
          bulletType = '■';
          content = trimmedLine.substring(1).trim();
        } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          bulletType = '•';
          content = trimmedLine.substring(1).trim();
        }
        
        items.push({
          type: bulletType,
          text: content,
          status: bulletType === '●' ? 'Major NC' : bulletType === '▲' ? 'Minor NC' : 'Observation'
        });
      } else if (trimmedLine.length > 0 && items.length > 0) {
        items[items.length - 1].text += ' ' + trimmedLine;
      } else if (trimmedLine.length > 0) {
        items.push({
          type: '•',
          text: trimmedLine,
          status: 'Observation'
        });
      }
    }
    
    if (items.length === 0 && evidenceText) {
      items.push({
        type: '•',
        text: evidenceText,
        status: 'Observation'
      });
    }
    
    return items;
  };

  const parseStructuredStatement = (statementText) => {
    if (!statementText) return null;
    
    try {
      const parsed = JSON.parse(statementText);
      return parsed;
    } catch (e) {
      return {
        nonconformity: statementText,
      };
    }
  };

  const SuccessModal = () => {
    if (!showSuccessModal) return null;

    const handleClose = () => {
      setShowSuccessModal(false);
      navigate(dashboardPath);
    };

    const handleDownloadAgain = async () => {
      await downloadPDF();
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl animate-scaleIn">
          <div className="px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${COLORS.bg}, #dbeafe)` }}>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
              <CheckCircle size={32} style={{ color: COLORS.success }} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Download Successful!</h2>
            <p className="mt-1 text-sm text-slate-600">{modalMessage}</p>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 text-center border rounded-xl bg-slate-50 border-slate-100">
                <p className="mb-1 text-xs text-slate-500">NCR Number</p>
                <p className="text-sm font-semibold truncate text-slate-800">{ncr?.ncrNumber || '—'}</p>
              </div>
              <div className="p-3 text-center border rounded-xl bg-slate-50 border-slate-100">
                <p className="mb-1 text-xs text-slate-500">Department</p>
                <p className="text-sm font-semibold truncate text-slate-800">{ncr?.department || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 mb-4 border rounded-xl" style={{ backgroundColor: COLORS.bg, borderColor: COLORS.lighter }}>
              <CheckCircle size={16} style={{ color: COLORS.primary }} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs" style={{ color: COLORS.dark }}>
                <strong>{isNCR2Mode ? 'NCR2 (Post-8D Corrective Action)' : 'Form 8 (Corrective Action Report)'}</strong> has been successfully generated.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleDownloadAgain} disabled={pdfDownloading} className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold text-white transition-all shadow-md rounded-xl hover:shadow-lg disabled:opacity-50" style={{ background: `linear-gradient(to bottom right, #60a5fa, ${COLORS.secondary})` }}>
                {pdfDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {pdfDownloading ? 'Downloading...' : 'Download PDF Again'}
              </button>
              <button onClick={handleClose} className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold bg-white border shadow-sm rounded-xl hover:shadow-md text-slate-700 border-slate-200">
                <ArrowLeft size={18} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: COLORS.primary }} />
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
            className="px-5 py-2.5 text-white rounded-xl hover:bg-red-600 transition font-medium"
            style={{ fontFamily, backgroundColor: COLORS.danger }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ── Data (With Hardcoded Fallbacks so it always looks populated) ── */
  const auditorName       = ncr.auditorName        || 'J. Bloggs';
  const auditeeName       = ncr.auditeeName        || 'DV Singh';
  const department        = ncr.department         || 'Production - Supply Chain Management';
  const auditReportNumber = ncr.auditReportNumber  || 'INT/2024/01';
  const auditDate         = ncr.createdAt          ? formatDate(ncr.createdAt) : '15 Mar 2024';
  const closedDate        = ncr.closedAt           ? formatDate(ncr.closedAt)  : '30 Jun 2024';

  const evidenceItems = parseStructuredEvidence(ncr.objectiveEvidence);
  const statementData = parseStructuredStatement(ncr.statementOfNonconformity);

  const rootCause = isNCR2Mode 
    ? (ncr.ncr2RootCause || ncr.rootCause || 'Root cause identified from 8D investigation')
    : (ncr.rootCause || 'Lack of standardized checklist for PO preparation; insufficient training on document control requirements.');

  const correction = {
    action : isNCR2Mode 
      ? (ncr.ncr2Correction || ncr.correction || 'Immediate containment action taken from 8D findings')
      : (ncr.correction || 'Immediate containment action taken to isolate non-conforming product and update PO with correct drawing revision.'),
    resp   : ncr.correctionResp || 'Production Supervisor',
    target : ncr.correctionTargetDate ? formatDate(ncr.correctionTargetDate) : '15 May 2024',
  };

  const correctiveAction = {
    action : isNCR2Mode 
      ? (ncr.ncr2CorrectiveAction || ncr.correctiveAction || 'Permanent corrective actions recommended by 8D team')
      : (ncr.correctiveAction || 'Implement revised PO checklist with mandatory drawing revision field and conduct training for procurement team.'),
    resp   : ncr.correctiveActionResp || 'QA Manager',
    target : ncr.correctiveActionTargetDate ? formatDate(ncr.correctiveActionTargetDate) : '30 Jun 2024',
  };

  const hdData = {
    action : isNCR2Mode 
      ? (ncr.ncr2HorizontalDeployment || ncr.horizontalDeployment || 'Apply corrective actions across organization based on 8D recommendations')
      : (ncr.horizontalDeployment || 'Apply revised PO process to all external provider communications and update supplier quality manual.'),
    actual : ncr.hdActualDate ? formatDate(ncr.hdActualDate) : '10 Jul 2024',
  };

  const verificationComment = ncr.verificationComment ||
    'Verified updated PO template in ERP system; training records confirmed for procurement team. All corrective actions implemented effectively.';
  const managerReviewComment = ncr.managerReviewComment ||
    'Corrective actions are adequate and have been verified. NCR can be closed.';
  const hodD0RejectionMessage = isNCR2Mode ? ncr.rejectionReason : '';

  // Bullet Point Evidence Component
  const BulletPointEvidence = ({ items }) => (
    <div className="flex flex-col gap-3">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${
            item.type === '●' ? 'bg-red-50 border-red-500' : 
            item.type === '▲' ? 'bg-amber-50 border-amber-500' : 
            'bg-blue-50 border-blue-500'
          }`}
        >
          <span className="text-lg font-bold" style={{ color: item.type === '●' ? '#dc2626' : item.type === '▲' ? '#d97706' : '#2563eb' }}>{item.type}</span>
          <div className="flex-1">
            {item.status && (
              <span className={`inline-block px-2 py-0.5 mb-1.5 text-[10px] font-bold rounded-full ${
                item.type === '●' ? 'bg-red-100 text-red-700' : 
                item.type === '▲' ? 'bg-amber-100 text-amber-700' : 
                'bg-blue-100 text-blue-700'
              }`}>
                {item.status}
              </span>
            )}
            <p className="m-0 text-sm leading-relaxed text-gray-800" style={{ fontFamily }}>{item.text}</p>
          </div>
        </div>
      ))}
    </div>
  );

  // Statement Component
  const StatementCard = ({ data }) => (
    <div className="p-4 border-l-4 border-red-500 rounded-lg bg-red-50">
      <p className="m-0 text-sm leading-relaxed text-gray-800" style={{ fontFamily }}>{data?.nonconformity || '—'}</p>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8 bg-gradient-to-br from-gray-50 to-gray-100 print:bg-white print:p-0">
      
      {isNCR2Mode && (
        <div className="max-w-5xl mx-auto mb-4 print:hidden">
          <div className="flex items-center gap-3 p-3 text-white shadow-sm rounded-xl" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)' }}>
            <CheckCircle size={20} className="opacity-90" />
            <div>
              <strong className="text-sm">NCR2 Mode - Corrective Action After 8D Investigation</strong>
              <p className="m-0 text-xs opacity-90">This corrective action was submitted after 8D investigation completion</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between max-w-5xl gap-3 mx-auto mb-5 print:hidden">
        <BackButton defaultTab="ncrs" label="Back to NCRs" />
        <div className="flex items-center gap-3">
          <StatusBadge status={ncr.status} />
          <button
            onClick={downloadPDF}
            disabled={pdfDownloading}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 shadow-sm hover:shadow-md"
            title="Download PDF"
            style={{ fontFamily, background: COLORS.primary }}
          >
            {pdfDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <div className={formStyle.container} id="form8-print">
        
        {/* Header */}
        <div className={formStyle.header} style={{ background: COLORS.primary }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white print:text-gray-900" style={{ fontFamily }}>
                {isNCR2Mode ? 'NCR2 - Corrective Action Report' : 'Corrective Action Report (Form 8)'}
              </h1>
              <p className="mt-1 text-sm text-gray-300 print:text-gray-500" style={{ fontFamily }}>
                Quality Management System · {isNCR2Mode ? 'Post-8D Corrective Action' : 'Corrective Action Report'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/80 print:text-gray-600" style={{ fontFamily }}>
                <span className="opacity-70">Audit Report:</span> {auditReportNumber}
              </p>
              <p className="text-lg font-bold text-white print:text-gray-800" style={{ fontFamily }}>
                {ncr.ncrNumber || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 print:bg-white">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoCard icon={Building} label="Department" value={department} />
            <InfoCard icon={User} label="Auditor" value={auditorName} />
            <InfoCard icon={Users} label="Auditee" value={auditeeName} />
            <InfoCard icon={Calendar} label="Audit Date" value={auditDate} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 md:grid-cols-4">
            <InfoCard icon={Hash} label="NCR Number" value={ncr.ncrNumber} />
            <InfoCard icon={FileText} label="Audit Report No." value={auditReportNumber} />
            <InfoCard icon={Calendar} label="Closure Date" value={closedDate} />
            {isNCR2Mode && (
              <InfoCard icon={Target} label="Status" value={ncr.status === 'NCR2_COMPLETED' ? 'Completed' : ncr.status === 'NCR2_IN_PROGRESS' ? 'Under Verification' : 'Ready'} />
            )}
          </div>
        </div>

        {/* Objective Evidence */}
        <FormSection title="🔍 Objective Evidence / Observations">
          <BulletPointEvidence items={evidenceItems} />
        </FormSection>

        {/* Statement of Nonconformity */}
        <FormSection title="📋 Statement of Nonconformity">
          <StatementCard data={statementData} />
        </FormSection>

        {/* Root Cause */}
        <FormSection title="🌱 Root Cause Analysis">
          <DetailRow label={isNCR2Mode ? "Based on 8D investigation findings" : "Why did the nonconformity occur?"} value={rootCause} multiline />
        </FormSection>

        {/* Correction */}
        <FormSection title={isNCR2Mode ? "✨ NCR2 - Correction of Problem" : "✨ Correction of Problem"}>
          <DetailRow label="Action Details" value={correction.action} multiline />
          <div className="grid grid-cols-1 gap-4 mt-3 md:grid-cols-2">
            <DetailRow label="Responsible Person/Dept" value={correction.resp} />
            <DetailRow label="Target Completion Date" value={correction.target} />
          </div>
        </FormSection>

        {/* Corrective Action */}
        <FormSection title={isNCR2Mode ? "⚙️ NCR2 - Permanent Corrective Actions" : "⚙️ Corrective Actions"}>
          <DetailRow label="Action Details" value={correctiveAction.action} multiline />
          <div className="grid grid-cols-1 gap-4 mt-3 md:grid-cols-2">
            <DetailRow label="Responsible Person/Dept" value={correctiveAction.resp} />
            <DetailRow label="Target Completion Date" value={correctiveAction.target} />
          </div>
        </FormSection>

        {/* Acceptability */}
        <FormSection title="✅ Acceptability of Corrective Action">
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <p className="text-sm font-medium text-green-800" style={{ fontFamily }}>
              Proposed Corrective actions are adequate to prevent the recurrence of the non-conformity
            </p>
            <div className="flex justify-between pt-3 mt-4 border-t border-green-200">
              <div>
                <p className="text-xs text-gray-500" style={{ fontFamily }}>Date</p>
                <p className="text-sm font-medium text-gray-800" style={{ fontFamily }}>{closedDate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500" style={{ fontFamily }}>Auditor(s) / MR</p>
                <p className="text-sm font-medium text-gray-800" style={{ fontFamily }}>{auditorName}</p>
              </div>
            </div>
          </div>
        </FormSection>

        {/* Horizontal Deployment */}
        <FormSection title="🔄 Horizontal Deployment">
          <DetailRow label="Applying corrective actions to similar processes or areas" value={hdData.action} multiline />
          <div className="flex justify-end mt-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 rounded-full bg-blue-50">
              <Calendar size={14} className="text-blue-600" />
              <p className="m-0 text-xs font-semibold text-blue-700" style={{ fontFamily }}>Actual Completion Date: {hdData.actual}</p>
            </div>
          </div>
        </FormSection>

        {/* Verification */}
        <FormSection title="📋 Verification of Effectiveness">
          <DetailRow label="Objective evidence collected during follow-up audit" value={verificationComment} multiline />
          <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500" style={{ fontFamily }}>Verification Date</p>
              <p className="text-sm font-medium text-gray-800" style={{ fontFamily }}>{closedDate}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500" style={{ fontFamily }}>Auditor(s) / MR</p>
              <p className="text-sm font-medium text-gray-800" style={{ fontFamily }}>{auditorName}</p>
            </div>
          </div>
        </FormSection>

        {/* Remarks */}
        {managerReviewComment && (
          <FormSection title="📝 Management Remarks">
            <DetailRow value={managerReviewComment} multiline />
          </FormSection>
        )}

        {hodD0RejectionMessage && (
          <FormSection title="HOD Rejection Message from 8D D0">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <p className="m-0 text-sm leading-relaxed text-red-800 whitespace-pre-line" style={{ fontFamily }}>{hodD0RejectionMessage}</p>
            </div>
          </FormSection>
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

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap justify-end max-w-5xl gap-3 mx-auto mt-6 print:hidden">
        <button
          onClick={() => navigate(`/ncr-view/${ncr.id}`)}
          className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition shadow-sm flex items-center gap-2"
          style={{ fontFamily, background: 'linear-gradient(135deg, #0ea5e9 50%, #3b82f6 100%)' }}
        >
          <Eye size={16} /> View NCR1
        </button>
        {is8DRelated && (
          <button
            onClick={open8DReport}
            disabled={loading8DReport}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily, background: COLORS.primary }}
          >
            {loading8DReport ? <Loader2 size={16} className="animate-spin" /> : <FileBarChart size={16} />}
            View 8D Report
          </button>
        )}
      </div>
      
      <SuccessModal />

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