import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Download, CheckCircle, AlertCircle, FileText, Users, Calendar, Building, User, Hash, Clock, List, FileCheck, Target, Shield, Layers, Eye, FileBarChart, X } from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath, isAuditor } from '../utils/roleUtils';
import FinalPreview from '../steps/FinalPreview';

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
        ? `http://localhost:8080/api/ncr/${ncr.id}/form8-pdf?type=ncr2`
        : `http://localhost:8080/api/ncr/${ncr.id}/form8-pdf`;
        
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

  // Parse objective evidence into structured bullet points
  const parseStructuredEvidence = (evidenceText) => {
    if (!evidenceText) return [];
    
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(evidenceText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, process as text with bullet points
    }
    
    // Split by ●, ▲, ■, •, -, or numbered patterns
    const bulletPattern = /[●▲■•\-]\s*|\d+\.\s+/g;
    const lines = evidenceText.split(/\r?\n/);
    const items = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Check if line starts with a bullet or number
      if (bulletPattern.test(trimmedLine) || trimmedLine.startsWith('●') || trimmedLine.startsWith('▲') || trimmedLine.startsWith('■') || trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        // Extract bullet type and content
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
        // Append to last item if it's continuation
        items[items.length - 1].text += ' ' + trimmedLine;
      } else if (trimmedLine.length > 0) {
        // Regular text without bullet
        items.push({
          type: '•',
          text: trimmedLine,
          status: 'Observation'
        });
      }
    }
    
    // If no items found, create single item with original text
    if (items.length === 0 && evidenceText) {
      items.push({
        type: '•',
        text: evidenceText,
        status: 'Observation'
      });
    }
    
    return items;
  };

  // Parse statement of nonconformity
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
          <div className="px-6 pt-8 pb-6 text-center" style={{ background: isNCR2Mode ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(124, 58, 237, 0.3))' : 'linear-gradient(135deg, rgba(5, 150, 105, 0.3), rgba(16, 185, 129, 0.3))' }}>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
              <CheckCircle size={32} className={isNCR2Mode ? 'text-purple-500' : 'text-green-500'} style={{ opacity: 0.6 }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: isNCR2Mode ? 'rgba(139, 92, 246, 0.85)' : 'rgba(5, 150, 105, 0.85)' }}>Download Successful!</h2>
            <p className="mt-1 text-sm" style={{ color: isNCR2Mode ? 'rgba(139, 92, 246, 0.7)' : 'rgba(5, 150, 105, 0.7)' }}>{modalMessage}</p>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 text-center rounded-xl" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p className="text-xs" style={{ color: 'rgba(75, 85, 99, 0.7)' }}>NCR Number</p>
                <p className="text-sm font-semibold" style={{ color: 'rgba(5, 150, 105, 0.8)' }}>{ncr?.ncrNumber || '—'}</p>
              </div>
              <div className="p-3 text-center rounded-xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p className="text-xs" style={{ color: 'rgba(75, 85, 99, 0.7)' }}>Department</p>
                <p className="text-sm font-semibold truncate" style={{ color: 'rgba(37, 99, 235, 0.8)' }}>{ncr?.department || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 mb-4 rounded-xl" style={{ backgroundColor: isNCR2Mode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: `1px solid ${isNCR2Mode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
              <CheckCircle size={16} className={isNCR2Mode ? 'text-purple-600' : 'text-green-600'} style={{ opacity: 0.7 }} />
              <p className="text-xs" style={{ color: isNCR2Mode ? 'rgba(139, 92, 246, 0.9)' : 'rgba(5, 150, 105, 0.9)' }}>
                <strong>{isNCR2Mode ? 'NCR2 (Post-8D Corrective Action)' : 'Form 8 (Corrective Action Report)'}</strong> has been successfully generated.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleDownloadAgain} disabled={pdfDownloading} className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold text-white transition-all rounded-xl" style={{ backgroundColor: isNCR2Mode ? 'rgba(139, 92, 246, 0.8)' : 'rgba(37, 99, 235, 0.8)' }}>
                {pdfDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {pdfDownloading ? 'Downloading...' : 'Download PDF Again'}
              </button>
              <button onClick={handleClose} className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold rounded-xl" style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)', color: 'rgba(75, 85, 99, 0.8)', border: '1px solid rgba(107, 114, 128, 0.2)' }}>
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
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          <p style={{ marginTop: 16, fontFamily: " 'inherit', Times, serif", color: '#64748b' }}>Loading NCR details...</p>
        </div>
      </div>
    );
  }

  if (error || !ncr) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '40px', borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
          <p style={{ fontFamily: " 'inherit', 'Times New Roman', Times, serif", color: '#ef4444' }}>Error loading form. Please try again.</p>
        </div>
      </div>
    );
  }

  /* ── Data ── */
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

const fontFamily = "inherit, 'Times New Roman', Times, serif";

  const InfoCard = ({ icon: Icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <div style={{ padding: '8px', background: isNCR2Mode ? '#ede9fe' : '#e0e7ff', borderRadius: 10 }}>
        <Icon size={18} color={isNCR2Mode ? '#8b5cf6' : '#4f46e5'} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#64748b', letterSpacing: '0.3px', textTransform: 'uppercase', fontFamily }}>{label}</p>
        <p style={{ margin: '4px 0 0 0', fontSize: 15, fontWeight: 600, color: '#0f172a', fontFamily }}>{value || '—'}</p>
      </div>
    </div>
  );

  const SectionHeader = ({ title, description, icon: Icon }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {Icon && <Icon size={20} color={isNCR2Mode ? '#8b5cf6' : '#4f46e5'} />}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.3px', fontFamily }}>{title}</h2>
      </div>
      {description && <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontFamily }}>{description}</p>}
    </div>
  );

  // Bullet Point Evidence Component (no table, just bullet points)
  const BulletPointEvidence = ({ items }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, idx) => (
        <div 
          key={idx} 
          style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px',
            padding: '12px 16px',
            background: item.type === '●' ? '#fef2f2' : item.type === '▲' ? '#fffbeb' : '#f8fafc',
            borderRadius: '8px',
            borderLeft: `3px solid ${item.type === '●' ? '#ef4444' : item.type === '▲' ? '#f59e0b' : '#3b82f6'}`
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.type}</span>
          <div style={{ flex: 1 }}>
            {item.status && (
              <span 
                style={{ 
                  display: 'inline-block',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  marginBottom: '6px',
                  background: item.type === '●' ? '#fee2e2' : item.type === '▲' ? '#fef3c7' : '#dbeafe',
                  color: item.type === '●' ? '#dc2626' : item.type === '▲' ? '#d97706' : '#2563eb'
                }}
              >
                {item.status}
              </span>
            )}
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1e293b', lineHeight: '1.5', fontFamily }}>{item.text}</p>
          </div>
        </div>
      ))}
    </div>
  );

  // Statement Component
  const StatementCard = ({ data }) => (
    <div style={{ background: '#fef2f2', padding: '20px', borderRadius: 12, borderLeft: `3px solid ${isNCR2Mode ? '#8b5cf6' : '#ef4444'}` }}>
      <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.6, fontFamily }}>{data?.nonconformity || '—'}</p>
    </div>
  );

  const getStatusColor = () => {
    if (ncr.status === 'NCR2_COMPLETED') return '#16a34a';
    if (ncr.status === 'NCR2_IN_PROGRESS') return '#8b5cf6';
    if (ncr.status === 'READY_FOR_NCR2') return '#7c3aed';
    return '#4f46e5';
  };

  return (
    <>
     

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)', padding: '32px 24px' }}>
        
        {isNCR2Mode && (
          <div className="no-print" style={{ maxWidth: 1000, margin: '0 auto 16px auto' }}>
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
              <CheckCircle size={20} style={{ opacity: 0.9 }} />
              <div>
                <strong style={{ fontSize: 14 }}>NCR2 Mode - Corrective Action After 8D Investigation</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.9 }}>This corrective action was submitted after 8D investigation completion</p>
              </div>
            </div>
          </div>
        )}

        <div className="no-print" style={{ maxWidth: 1000, margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
  onClick={() => {
    if (isAuditManager) {
      navigate('/ncr-dashboard');
    } else if (isAuditeeRole) {
      navigate('/auditee');
    } else {
      navigate('/auditor');
    }
  }}
  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
>
  <ArrowLeft size={16} />
  Back to NCR
</button>
          <button onClick={downloadPDF} disabled={pdfDownloading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, background: isNCR2Mode ? '#8b5cf6' : '#4f46e5', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily, opacity: pdfDownloading ? 0.7 : 1 }}>
            {pdfDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {pdfDownloading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>

        <div id="form8-print" style={{ maxWidth: 1000, margin: '0 auto', background: 'white', borderRadius: 24, boxShadow: '0 20px 35px -10px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
          
          <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '28px 32px', textAlign: 'center', borderBottom: `4px solid ${getStatusColor()}` }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', fontFamily }}>
              {isNCR2Mode ? 'NCR2 - Corrective Action Report' : 'Non-Conformance Report'}
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#94a3b8', fontFamily }}>
              {isNCR2Mode ? 'Quality Management System · Post-8D Corrective Action Report' : 'Quality Management System · Corrective Action Report'}
            </p>
          </div>

          <div style={{ padding: '32px' }}>
            
            {isNCR2Mode && ncr?.status && (
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: ncr.status === 'NCR2_COMPLETED' ? '#dcfce7' : '#ede9fe', color: ncr.status === 'NCR2_COMPLETED' ? '#166534' : '#5b21b6' }}>
                  {ncr.status === 'NCR2_COMPLETED' ? <CheckCircle size={14} /> : <Clock size={14} />}
                  Status: {ncr.status === 'NCR2_COMPLETED' ? 'Completed' : ncr.status === 'NCR2_IN_PROGRESS' ? 'Under Verification' : 'Ready'}
                </span>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <InfoCard icon={Hash} label="NCR Number" value={ncr.ncrNumber || '—'} />
              <InfoCard icon={FileText} label="Audit Report No." value={auditReportNumber} />
              <InfoCard icon={Calendar} label="Audit Date" value={auditDate} />
              <InfoCard icon={Calendar} label="Closure Date" value={closedDate} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              <InfoCard icon={Building} label="Department / Area" value={department} />
              <InfoCard icon={Users} label="Auditee(s)" value={auditeeName} />
              <InfoCard icon={User} label="Auditor(s)" value={auditorName} />
            </div>

            {/* Objective Evidence - Bullet Points */}
            <div style={{ marginBottom: 32, background: '#fefce8', borderRadius: 16, padding: '20px', border: '1px solid #fef08a' }}>
              <SectionHeader title="🔍 Objective Evidence / Observations" icon={List} />
              <BulletPointEvidence items={evidenceItems} />
            </div>

            {/* Statement of Nonconformity */}
            <div style={{ marginBottom: 32, background: '#fef2f2', borderRadius: 16, padding: '20px', border: '1px solid #fecaca' }}>
              <SectionHeader title="📋 Statement of Nonconformity" icon={FileCheck} />
              <StatementCard data={statementData} />
            </div>

            {/* Root Cause */}
            <div style={{ marginBottom: 32, background: isNCR2Mode ? '#f5f3ff' : '#fef2f2', borderRadius: 16, padding: '20px', border: `1px solid ${isNCR2Mode ? '#ddd6fe' : '#fecaca'}` }}>
              <SectionHeader title="🌱 Root Cause Analysis" description={isNCR2Mode ? "Based on 8D investigation findings" : "Why did the nonconformity occur?"} icon={Target} />
              <div style={{ background: 'white', padding: '14px 16px', borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.6, fontFamily }}>{rootCause}</p>
              </div>
            </div>

            {/* Correction */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', background: isNCR2Mode ? '#f5f3ff' : '#f1f5f9', borderBottom: `1px solid ${isNCR2Mode ? '#ddd6fe' : '#e2e8f0'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} color={isNCR2Mode ? '#8b5cf6' : '#4f46e5'} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily }}>{isNCR2Mode ? "✨ NCR2 - Correction of Problem" : "✨ Correction of Problem"}</h3>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: '#475569', fontFamily }}>Action Details</p>
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 12 }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6, fontFamily }}>{correction.action}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily }}>Responsible Person/Dept</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{correction.resp}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily }}>Target Completion Date</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{correction.target}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Corrective Action */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', background: isNCR2Mode ? '#f5f3ff' : '#f1f5f9', borderBottom: `1px solid ${isNCR2Mode ? '#ddd6fe' : '#e2e8f0'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} color={isNCR2Mode ? '#8b5cf6' : '#4f46e5'} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily }}>{isNCR2Mode ? "⚙️ NCR2 - Permanent Corrective Actions" : "⚙️ Corrective Actions"}</h3>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: '#475569', fontFamily }}>Action Details</p>
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 12 }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6, fontFamily }}>{correctiveAction.action}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily }}>Responsible Person/Dept</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{correctiveAction.resp}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily }}>Target Completion Date</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{correctiveAction.target}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acceptability */}
            <div style={{ marginBottom: 24, background: '#f0fdf4', borderRadius: 16, padding: '20px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                <CheckCircle size={22} color='#22c55e' />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#166534', fontFamily }}>Acceptability of Corrective Action</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#1e293b', fontFamily }}>Proposed Corrective actions are adequate to prevent the recurrence of the non-conformity</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #dcfce7', paddingTop: 16, marginTop: 8 }}>
                <div><p style={{ margin: 0, fontSize: 12, color: '#64748b', fontFamily }}>Date</p><p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{closedDate}</p></div>
                <div style={{ textAlign: 'right' }}><p style={{ margin: 0, fontSize: 12, color: '#64748b', fontFamily }}>Auditor(s) / MR</p><p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{auditorName}</p></div>
              </div>
            </div>

            {/* Horizontal Deployment */}
            <div style={{ marginBottom: 24, background: '#f0f9ff', borderRadius: 16, padding: '20px', border: '1px solid #bae6fd' }}>
              <SectionHeader title="🔄 Horizontal Deployment" description="Applying corrective actions to similar processes or areas" icon={Layers} />
              <div style={{ background: '#e0f2fe', padding: '14px 16px', borderRadius: 12, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.6, fontFamily }}>{hdData.action}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#e0f2fe', padding: '8px 16px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={14} color="#0369a1" />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0369a1', fontFamily }}>Actual Completion Date: {hdData.actual}</p>
                </div>
              </div>
            </div>

            {/* Verification */}
            <div style={{ marginBottom: 24, background: isNCR2Mode ? '#f5f3ff' : '#f0fdf4', borderRadius: 16, padding: '20px', border: `1px solid ${isNCR2Mode ? '#ddd6fe' : '#bbf7d0'}` }}>
              <SectionHeader title="📋 Verification of Effectiveness" description="Objective evidence collected during follow-up audit" icon={Target} />
              <div style={{ background: 'white', padding: '14px 16px', borderRadius: 12, marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.6, fontFamily }}>{verificationComment}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${isNCR2Mode ? '#e9d5ff' : '#dcfce7'}`, paddingTop: 16 }}>
                <div><p style={{ margin: 0, fontSize: 12, color: '#64748b', fontFamily }}>Verification Date</p><p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{closedDate}</p></div>
                <div style={{ textAlign: 'right' }}><p style={{ margin: 0, fontSize: 12, color: '#64748b', fontFamily }}>Auditor(s) / MR</p><p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily }}>{auditorName}</p></div>
              </div>
            </div>

            {/* Remarks */}
            {managerReviewComment && (
              <div style={{ marginBottom: 24, background: '#fff7ed', borderRadius: 16, padding: '20px', border: '1px solid #fed7aa' }}>
                <SectionHeader title="📝 Management Remarks" />
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: 12 }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.6, fontFamily }}>{managerReviewComment}</p>
                </div>
              </div>
            )}

            {hodD0RejectionMessage && (
              <div style={{ marginBottom: 24, background: '#fef2f2', borderRadius: 16, padding: '20px', border: '1px solid #fecaca' }}>
                <SectionHeader title="HOD Rejection Message from 8D D0" icon={AlertCircle} />
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: 12 }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#991b1b', lineHeight: 1.6, fontFamily, whiteSpace: 'pre-line' }}>{hodD0RejectionMessage}</p>
                </div>
              </div>
            )}

            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', fontSize: 12, fontWeight: 600, color: '#475569', fontFamily }}>
                <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#22c55e', borderRadius: 2, marginRight: 6 }}></span> (O+)Ve: Conformance</span>
                <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', borderRadius: 2, marginRight: 6 }}></span> (O-)Ve: Non-Conformance</span>
                <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#f59e0b', borderRadius: 2, marginRight: 6 }}></span> (OI): Opportunity for Improvement</span>
              </div>
              <p style={{ margin: '16px 0 0 0', fontSize: 11, color: '#94a3b8', fontFamily }}>This report is generated based on the Quality Management System requirements</p>
            </div>
          </div>
        </div>

        <div className="no-print" style={{ maxWidth: 1000, margin: '24px auto 0 auto', display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/ncr-view/${ncr.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily }}
          >
            <Eye size={16} /> View Form 7
          </button>
          {is8DRelated && (
            <button
              onClick={open8DReport}
              disabled={loading8DReport}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 12, cursor: loading8DReport ? 'not-allowed' : 'pointer', fontFamily, opacity: loading8DReport ? 0.7 : 1 }}
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
    </>
  );
}
