import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCheckCircle, FiXCircle, FiClock, 
  FiUser, FiCalendar, FiFileText, FiDownload, FiPrinter,
  FiMapPin, FiTool, FiPackage, FiSettings, FiAward,
  FiBookOpen, FiHash, FiThumbsUp, FiThumbsDown
} from 'react-icons/fi';
import { useAuth } from '../../components/context/AuthContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { userAPI } from '../../components/services/api';
import { useToast } from '../../components/ToastContext';
import axios from 'axios';
import BackButton from '../../components/dashboards/leadAuditor/BackButton';

// MANUFACTURING PROCESS CHECK SHEET ID = 1
const MANUFACTURING_CHECK_SHEET_ID = 1;

// ============================================================================
// COLOR PALETTE & ANIMATIONS (Matching Audit Manager Dashboard)
// ============================================================================
const NAVBAR_COLORS = {
    primary: '#00529B',
    secondary: '#3b82f6',
    dark: '#1e3a8a',
    light: '#60a5fa',
    lighter: '#93c5fd',
    bg: '#eff6ff',
    white: '#ffffff',
};

const animationStyles = `
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
.stat-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
`;

export default function ManufacturingProcessView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audit, setAudit] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [auditorName, setAuditorName] = useState('');
  const [auditeeName, setAuditeeName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [auditeeSignature, setAuditeeSignature] = useState('');
  const [auditeeComment, setAuditeeComment] = useState('');
  const [auditorSignedAt, setAuditorSignedAt] = useState(null);
  const [auditeeSignedAt, setAuditeeSignedAt] = useState(null);
  
  const [auditorSignatureUrl, setAuditorSignatureUrl] = useState(null);
  const [auditeeSignatureUrl, setAuditeeSignatureUrl] = useState(null);
  const [loadingSignatures, setLoadingSignatures] = useState(false);

  useEffect(() => {
    if (id) fetchAuditDetails();
    return () => {
      if (auditorSignatureUrl && auditorSignatureUrl.startsWith('blob:')) URL.revokeObjectURL(auditorSignatureUrl);
      if (auditeeSignatureUrl && auditeeSignatureUrl.startsWith('blob:')) URL.revokeObjectURL(auditeeSignatureUrl);
    };
  }, [id]);

 const fetchSignatureAsImageUrl = async (userId, fullName) => {
  try {
    let response;
    if (userId) {
      response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090/api/users/${userId}/signature`, { 
        responseType: 'blob', 
        headers: { 'X-Timezone': userTimezone },  // ✅ ADD THIS
        withCredentials: true 
      });
    } else if (fullName && fullName !== 'Not specified' && fullName !== 'N/A' && fullName !== 'Unknown') {
      const nameParts = fullName.trim().split(' ', 2);
      response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090/api/users/signature', {
        params: { firstName: nameParts[0], lastName: nameParts.length > 1 ? nameParts[1] : '' },
        responseType: 'blob', 
        headers: { 'X-Timezone': userTimezone },  // ✅ ADD THIS
        withCredentials: true
      });
    } else return null;
    
    if (response.data && response.data.size > 0) return URL.createObjectURL(response.data);
    return null;
  } catch (error) { return null; }
};

  const getSignatureFromBase64 = (base64String) => {
    if (base64String && (base64String.startsWith('data:image') || base64String.includes('base64'))) return base64String;
    return null;
  };

  const fetchAuditDetails = async () => {
    try {
      setLoading(true);
      const response = await auditScheduleApi.getAuditResponse(parseInt(id));
      const auditData = response.data;
      setAudit(auditData);
      
      let parsedAnswers = {};
      try {
        if (auditData.answers) parsedAnswers = typeof auditData.answers === 'string' ? JSON.parse(auditData.answers) : auditData.answers;
      } catch (e) { parsedAnswers = {}; }
      setAnswers(parsedAnswers);
      
      setDepartmentName(parsedAnswers.department || auditData.department || '-');
      
      if (parsedAnswers.auditeeSignature) {
        setAuditeeSignature(parsedAnswers.auditeeSignature);
        const sigImage = getSignatureFromBase64(parsedAnswers.auditeeSignature);
        if (sigImage) setAuditeeSignatureUrl(sigImage);
      }
      if (parsedAnswers.auditeeComment) setAuditeeComment(parsedAnswers.auditeeComment);
      if (parsedAnswers.auditeeSignedAt) setAuditeeSignedAt(parsedAnswers.auditeeSignedAt);
      if (parsedAnswers.auditorSignedAt) setAuditorSignedAt(parsedAnswers.auditorSignedAt);
      
      if (auditData.auditorId) {
        try {
          const auditor = await userAPI.getUserById(auditData.auditorId);
          setAuditorName(auditor?.name || `${auditor?.firstName} ${auditor?.lastName}`);
        } catch (e) { setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown'); }
      } else { setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown'); }
      
      const auditee = auditData.auditeeName || parsedAnswers.auditeeName || 'Not specified';
      setAuditeeName(auditee);
      setLoadingSignatures(true);
      
      const auditorSigUrl = await fetchSignatureAsImageUrl(auditData.auditorId, auditorName);
      if (auditorSigUrl) setAuditorSignatureUrl(auditorSigUrl);
      else {
        const auditorSigBase64 = parsedAnswers.auditorSignature;
        if (auditorSigBase64 && auditorSigBase64.startsWith('data:image')) setAuditorSignatureUrl(auditorSigBase64);
      }
      
      const currentUserRole = user?.role?.toLowerCase?.() || '';
      const isAuditorUser = currentUserRole === 'auditor' || auditData.auditorId === user?.id;
      
      if (!isAuditorUser) {
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) setAuditeeSignatureUrl(auditeeSigUrl);
      } else if (isAuditorUser && auditData.status === 'APPROVED') {
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) setAuditeeSignatureUrl(auditeeSigUrl);
      } else { setAuditeeSignatureUrl(null); }
      
      setLoadingSignatures(false);
      
      if (parsedAnswers.questionsData && parsedAnswers.questionsData.length > 0) {
        setQuestions(parsedAnswers.questionsData);
      } else {
        try {
          const checkSheetRes = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/templates/${MANUFACTURING_CHECK_SHEET_ID}`);
          const sheet = checkSheetRes.data;
          if (sheet.questions) {
            let parsedQuestions = [];
            try {
              parsedQuestions = typeof sheet.questions === 'string' ? JSON.parse(sheet.questions) : sheet.questions;
              const formattedQuestions = parsedQuestions.map((q, idx) => ({
                slNo: q.sNo || q.slNo || (idx + 1),
                checkpoint: q.displayLabel || q.checkpoint,
                consideration: q.consideration || q.whatToLookFor || q.documentsVerified || 'No documents specified',
                clause: q.clauseNo || q.category || q.clause || '',
              }));
              setQuestions(formattedQuestions);
            } catch (e) { console.error('Error parsing questions:', e); }
          }
        } catch (error) { console.error('Error fetching check sheet:', error); }
      }
    } catch (error) {
      addToast('Failed to load audit details: ' + (error.message || 'Unknown error'), 'error');
    } finally { setLoading(false); }
  };

  const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ✅ ADD THIS FUNCTION
const formatLocalDateTime = (utcDateStr) => {
  if (!utcDateStr) return '—';
  
  try {
    let dateString = utcDateStr.trim();
    let date;
    
    if (dateString.includes('T')) {
      if (!dateString.includes('Z') && !dateString.includes('+')) {
        dateString = dateString + 'Z';
      }
      date = new Date(dateString);
    } else if (dateString.includes(' ')) {
      date = new Date(dateString.replace(' ', 'T') + 'Z');
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return '—';
    
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return '—';
  }
};

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDownloadPDF = async () => {
    if (!audit || !audit.id) { addToast('Audit data not available', 'error'); return; }
    setDownloading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      const response = await axios({
        method: 'get', url: `${API_URL}/api/manufacturing-audits/${audit.id}/pdf`,
        responseType: 'blob', headers: { 'Accept': 'application/pdf' }, 
               'X-Timezone': userTimezone , // ✅ ADD THIS
              withCredentials: true
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Manufacturing_Audit_Report_${audit.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      addToast('PDF downloaded successfully', 'success');
    } catch (error) {
      if (error.response && error.response.data instanceof Blob) {
        const text = await error.response.data.text();
        addToast(`Server error: ${text.substring(0, 100)}`, 'error');
      } else { addToast(`Error: ${error.message}`, 'error'); }
    } finally { setDownloading(false); }
  };

  const handleApprove = async () => {
    let signatureToSave = auditeeSignature;
    if (auditeeSignatureUrl && !auditeeSignatureUrl.startsWith('blob:')) signatureToSave = auditeeSignatureUrl;
    else if (auditeeSignatureUrl && auditeeSignatureUrl.startsWith('blob:')) {
      try {
        const response = await fetch(auditeeSignatureUrl);
        const blob = await response.blob();
        signatureToSave = await new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(blob); });
      } catch (error) { signatureToSave = auditeeSignature; }
    }
    if (!signatureToSave.trim()) { addToast('No signature available.', 'error'); return; }
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      const response = await axios.put(`${API_URL}/api/templates/responses/${audit.id}/approve`, { signature: signatureToSave, comment: auditeeComment || 'No comments provided' }, {       headers: { 'X-Timezone': userTimezone },  // ✅ ADD THIS
withCredentials: true });
      if (response.data) { addToast('✓ Audit approved successfully!', 'success'); await fetchAuditDetails(); }
    } catch (error) { addToast(`Failed to approve: ${error.response?.data?.message || error.message}`, 'error'); } 
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!auditeeComment.trim()) { addToast('Please provide a reason for rejection', 'error'); return; }
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      const response = await axios.put(`${API_URL}/api/templates/responses/${audit.id}/reject`, { comment: auditeeComment }, {      headers: { 'X-Timezone': userTimezone },  // ✅ ADD THIS
 withCredentials: true });
      if (response.data) { addToast('✗ Audit rejected.', 'warning'); await fetchAuditDetails(); }
    } catch (error) { addToast(`Failed to reject: ${error.response?.data?.message || error.message}`, 'error'); } 
    finally { setSubmitting(false); }
  };

  const currentStatus = audit?.status || 'SUBMITTED';
  const statusUpper = currentStatus?.toUpperCase?.() || '';
  const isSubmitted = statusUpper === 'SUBMITTED';
  const isApproved = statusUpper === 'APPROVED';
  const isRejected = statusUpper === 'REJECTED';

  const currentUserRole = user?.role?.toLowerCase?.() || '';
  const isAuditor = currentUserRole === 'auditor' || audit?.auditorId === user?.id;
  const isAuditee = currentUserRole === 'auditee' || audit?.auditeeId === user?.id || (audit?.auditeeName && audit?.auditeeName === user?.name);
  const showAuditeeActions = isAuditee && isSubmitted;

  const responses = answers.responses || {};
  const observations = answers.observations || {};
  const totalQuestions = questions.length;
  const compliantCount = Object.values(responses).filter(r => r === 'COMPLIANT').length;
  const minorNCCount = Object.values(responses).filter(r => r === 'MINOR_NC').length;
  const majorNCCount = Object.values(responses).filter(r => r === 'MAJOR_NC').length;

  const getStatusBadge = (status) => {
    const badges = {
      'DRAFT': 'bg-slate-100 text-slate-700 border-slate-200',
      'IN_PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200',
      'SUBMITTED': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'APPROVED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'REJECTED': 'bg-rose-50 text-rose-700 border-rose-200',
      'CLOSED': 'bg-slate-50 text-slate-700 border-slate-200',
    };
    return badges[status?.toUpperCase()] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (status) => {
    if (status === 'COMPLIANT') return <FiCheckCircle className="w-4 h-4 text-emerald-600" />;
    if (status === 'MINOR_NC') return <FiXCircle className="w-4 h-4 text-amber-600" />;
    if (status === 'MAJOR_NC') return <FiXCircle className="w-4 h-4 text-rose-600" />;
    return null;
  };

  const getStatusClass = (status) => {
    if (status === 'COMPLIANT') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'MINOR_NC') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'MAJOR_NC') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getStatusText = (status) => {
    if (status === 'COMPLIANT') return 'Compliant';
    if (status === 'MINOR_NC') return 'Minor';
    if (status === 'MAJOR_NC') return 'Major';
    return status || 'Not Rated';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
          <p className="text-sm font-medium text-slate-500">Loading audit report...</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <FiXCircle size={48} className="mx-auto mb-4 text-rose-500" />
          <p className="text-lg font-bold text-slate-800">Audit not found</p>
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 mt-4 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      <div className="p-4 mx-auto max-w-7xl print:p-2" id="audit-report-content">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden animate-fadeInUp">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/lead-auditor" defaultTab="responses" label="Back" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Manufacturing Process Audit</h1>
              <p className="text-sm text-slate-500 mt-0.5">View audit details and findings</p>
            </div>
          </div>
          <button 
            onClick={handleDownloadPDF} 
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>
                <FiDownload className="w-4 h-4" /> Download PDF
              </>
            )}
          </button>
        </div>

        {/* Banners */}
        {isApproved && (
          <div className="p-2 mb-6 text-center border rounded-xl bg-emerald-50 border-emerald-200 animate-fadeInUp">
            <div className="flex items-center justify-center gap-2 text-emerald-800">
              <FiCheckCircle className="w-5 h-5" />
              <span className="text-lg font-bold">✓ Audit Approved by Auditee</span>
            </div>
            {answers.auditeeComment && <div className="mt-2 text-sm text-emerald-700"><span className="font-medium">Comment: </span>{answers.auditeeComment}</div>}
          </div>
        )}

        {isRejected && (
          <div className="p-2 mb-6 text-center border rounded-xl bg-rose-50 border-rose-200 animate-fadeInUp">
            <div className="flex items-center justify-center gap-2 text-rose-800">
              <FiXCircle className="w-5 h-5" />
              <span className="text-lg font-bold">✗ Audit Rejected - Corrections Required</span>
            </div>
            {answers.auditeeComment && <div className="mt-2 text-sm text-rose-700"><span className="font-medium">Reason: </span>{answers.auditeeComment}</div>}
          </div>
        )}

        {/* Main Banner */}
        <div className="p-3 mb-6 text-center text-white shadow-md rounded-2xl animate-fadeInUp" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <FiFileText size={24} />
            <span className="text-xl font-bold">MANUFACTURING PROCESS AUDIT CHECK SHEET</span>
          </div>
          <p className="text-sm opacity-90">IATF 16949:2016 | Process Audit Compliance</p>
        </div>

        {/* Document Control Information */}
        <div className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
          <h2 className="flex items-center gap-2 mb-4 text-base font-bold text-slate-800">
            <FiHash size={18} style={{ color: NAVBAR_COLORS.primary }} /> Document Control Information
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[
              { icon: <FiHash className="w-4 h-4 text-slate-400" />, label: 'Doc No.', value: answers.documentNumber || '-' },
              { icon: <FiCalendar className="w-4 h-4 text-slate-400" />, label: 'W.e.f. (Date)', value: answers.wefDate || '-' },
              { icon: <FiHash className="w-4 h-4 text-slate-400" />, label: 'Rev No.', value: answers.revNo || '00' },
              { icon: <FiCalendar className="w-4 h-4 text-slate-400" />, label: 'Rev Date', value: answers.revDate || '-' },
              { icon: <FiCalendar className="w-4 h-4 text-slate-400" />, label: 'Issue Date', value: answers.issueDate || '-' }
            ].map((item, idx) => (
              <div key={idx} className="p-3 border rounded-xl bg-slate-50 border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  {item.icon}
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Information */}
        <div className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
          <h2 className="flex items-center gap-2 mb-4 text-base font-bold text-slate-800">
            <FiSettings size={18} style={{ color: NAVBAR_COLORS.primary }} /> Audit Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { icon: <FiSettings className="w-4 h-4 text-slate-400" />, label: 'Department Name', value: departmentName || answers.department || '-' },
                { icon: <FiPackage className="w-4 h-4 text-slate-400" />, label: 'Part Name & Number', value: answers.partNumber || '-' },
                { icon: <FiTool className="w-4 h-4 text-slate-400" />, label: 'Machine', value: answers.machine || '-' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 border rounded-xl bg-slate-50 border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    {item.icon}
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { icon: <FiUser className="w-4 h-4 text-slate-400" />, label: 'Auditor Name', value: auditorName || answers.auditorName || 'N/A' },
                { icon: <FiUser className="w-4 h-4 text-slate-400" />, label: 'Auditee Name', value: auditeeName || answers.auditeeName || 'N/A' },
                { icon: <FiMapPin className="w-4 h-4 text-slate-400" />, label: 'Location', value: answers.location || '-' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 border rounded-xl bg-slate-50 border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    {item.icon}
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                { icon: <FiSettings className="w-4 h-4 text-slate-400" />, label: 'Shift', value: audit.shift || answers.shift || '-' },
                { icon: <FiCalendar className="w-4 h-4 text-slate-400" />, label: 'Date', value: answers.date || formatDate(audit.auditDate) },
                { icon: <FiClock className="w-4 h-4 text-slate-400" />, label: 'Time', value: answers.time || '-' },
                { icon: null, label: 'Status', value: <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(currentStatus)}`}>{currentStatus || 'DRAFT'}</span> }
              ].map((item, idx) => (
                <div key={idx} className="p-3 border rounded-xl bg-slate-50 border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    {item.icon}
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4 animate-fadeInUp">
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-slate-800">{totalQuestions}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total Checkpoints</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-emerald-600">{compliantCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Compliant</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-amber-600">{minorNCCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Minor NC</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-rose-600">{majorNCCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Major NC</p>
          </div>
        </div>

        {/* Audit Findings Table */}
        <div className="p-6 mb-6 overflow-x-auto bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
          <div className="flex items-center gap-2 mb-4">
            <FiBookOpen className="w-5 h-5" style={{ color: NAVBAR_COLORS.primary }} />
            <h2 className="text-base font-bold text-slate-800">Audit Findings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-slate-50 border-slate-200">
                <tr>
                  <th className="w-12 px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600">S.No.</th>
                  <th className="min-w-[250px] px-4 py-3 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">Check Point</th>
                  <th className="min-w-[280px] px-4 py-3 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">Consideration</th>
                  <th className="min-w-[200px] px-4 py-3 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">Observations</th>
                  <th className="px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600 w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questions.length > 0 ? questions.map((q, idx) => {
                  const questionKey = q.slNo || (idx + 1);
                  const response = responses[questionKey] || responses[String(questionKey)];
                  const observation = observations[questionKey] || observations[String(questionKey)];
                  
                  let consideration = q.consideration || '-';
                  if (typeof consideration === 'string') {
                    consideration = consideration.replace(/\\n/g, '\n').replace(/(\d+)\.\s/g, '\n• ').replace(/\n/g, '<br/>');
                  }
                  
                  return (
                    <tr key={idx} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-center text-slate-600">{questionKey}</td>
                      <td className="px-4 py-3 text-sm align-top text-slate-800">{q.checkpoint}</td>
                      <td className="px-4 py-3 text-xs align-top text-slate-600 bg-slate-50/50">
                        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: consideration }} />
                      </td>
                      <td className="px-4 py-3 text-sm align-top text-slate-600">{observation || '-'}</td>
                      <td className="px-4 py-3 text-center align-top">
                        <div className="flex items-center justify-center gap-1">
                          {getStatusIcon(response)}
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusClass(response)}`}>
                            {getStatusText(response)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <FiBookOpen className="w-8 h-8 text-slate-300" />
                        <p className="font-medium">No questions loaded from the database</p>
                        <p className="text-xs">Please ensure check sheet ID {MANUFACTURING_CHECK_SHEET_ID} exists</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Section */}
        <div className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl print:break-inside-avoid animate-fadeInUp">
          <h2 className="flex items-center gap-2 mb-4 text-base font-bold text-slate-800">
            <FiAward size={18} style={{ color: NAVBAR_COLORS.primary }} /> Signatures & Comments
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            
            {/* AUDITOR SIGNATURE SECTION */}
            <div className="p-5 border rounded-xl bg-slate-50 border-slate-200">
              <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Auditor Signature</p>
              <div className="mt-3">
                {loadingSignatures ? (
                  <div className="flex justify-center p-4">
                    <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                  </div>
                ) : auditorSignatureUrl ? (
                  <img src={auditorSignatureUrl} alt="Auditor Signature" className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24" />
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <FiXCircle size={16} />
                    <span className="text-sm font-medium">No signature uploaded</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">Name: {auditorName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: {auditorSignedAt ? formatLocalDateTime(auditorSignedAt) : (answers.date || formatDate(audit.auditDate) || '-')}</p>
              {answers.auditorComment && (
                <div className="p-3 mt-3 text-xs bg-white border rounded-lg text-slate-600 border-slate-200">
                  <span className="font-bold">Comment:</span> {answers.auditorComment}
                </div>
              )}
            </div>
            
            {/* AUDITEE SIGNATURE SECTION */}
            <div className="p-5 border rounded-xl bg-slate-50 border-slate-200">
              {showAuditeeActions ? (
                <>
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Your Electronic Signature</p>
                  <div className="mt-3">
                    {loadingSignatures ? (
                      <div className="flex justify-center p-4">
                        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                      </div>
                    ) : auditeeSignatureUrl ? (
                      <div>
                        <img src={auditeeSignatureUrl} alt="Auditee Signature" className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24" />
                        <p className="mt-2 text-xs font-medium text-emerald-600">✓ Signature loaded from your profile</p>
                        <p className="mt-1 text-xs text-slate-500">Name: {auditeeName}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                          <FiXCircle size={16} />
                          <span className="text-sm font-medium">No signature uploaded in profile</span>
                        </div>
                        <input
                          type="text"
                          value={auditeeSignature}
                          onChange={(e) => setAuditeeSignature(e.target.value)}
                          placeholder="Type your full name as signature (fallback)"
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                      </div>
                    )}
                  </div>
                  
                  <p className="mt-4 text-xs font-bold tracking-wider uppercase text-slate-500">Comments / Remarks</p>
                  <textarea
                    value={auditeeComment}
                    onChange={(e) => setAuditeeComment(e.target.value)}
                    placeholder="Enter your comments (required for rejection)"
                    rows="3"
                    className="w-full px-4 py-3 mt-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleApprove}
                      disabled={submitting || (!auditeeSignatureUrl && !auditeeSignature.trim())}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all"
                    >
                      <FiThumbsUp className="w-4 h-4" />
                      {submitting ? 'Processing...' : 'Approve & Sign'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 shadow-md transition-all"
                    >
                      <FiThumbsDown className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Auditee Signature</p>
                  <div className="mt-3">
                    {loadingSignatures ? (
                      <div className="flex justify-center p-4">
                        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                      </div>
                    ) : (isApproved || isRejected) ? (
                      auditeeSignatureUrl ? (
                        <img src={auditeeSignatureUrl} alt="Auditee Signature" className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24" />
                      ) : auditeeSignature ? (
                        <p className="p-3 text-sm font-semibold bg-white border rounded-lg shadow-sm text-slate-800 border-slate-200">{auditeeSignature}</p>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <FiXCircle size={16} />
                          <span className="text-sm font-medium">No signature available</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-xl bg-amber-50 border-amber-200">
                        <div className="text-center">
                          <FiClock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                          <p className="text-sm font-bold text-amber-700">Waiting for Approval</p>
                          <p className="text-xs text-amber-600 mt-0.5">Signature will appear after auditee approval</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Name: {auditeeName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Date: {auditeeSignedAt ? formatLocalDateTime(auditeeSignedAt) : ((isApproved || isRejected) ? formatLocalDateTime(audit.updatedAt) : '-')}</p>
                  
                  {(answers.auditeeComment || auditeeComment) && (isApproved || isRejected) && (
                    <div className="p-3 mt-3 text-xs bg-white border rounded-lg text-slate-600 border-slate-200">
                      <span className="font-bold">Comment:</span> {answers.auditeeComment || auditeeComment}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Status</p>
                    <div className="mt-2">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <FiCheckCircle size={12} /> Approved
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                          <FiXCircle size={12} /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                          <FiClock size={12} /> Pending Approval
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-6 mt-8 text-xs text-center text-slate-400">
          <p>Manufacturing Process Audit Report | Generated on {formatDate(new Date().toISOString())}</p>
          <p className="mt-1">This is an electronic document and does not require a physical signature</p>
        </div>
      </div>
    </div>
  );
}