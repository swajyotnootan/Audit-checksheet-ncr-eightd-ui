import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/context/AuthContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { userAPI } from '../../components/services/api';
import { useToast } from '../../components/ToastContext';
import axios from 'axios';
import BackButton from '../../components/dashboards/leadAuditor/BackButton';
import { 
  ArrowLeft, CheckCircle, AlertCircle, User, Calendar, 
  ClipboardList, Building, FileText, 
  MapPin, Clock, Award, Download, ThumbsUp, ThumbsDown,
  XCircle, Printer, Layers, AlertTriangle, RefreshCw
} from 'lucide-react';

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

const getStatusBadge = (status) => {
  const badges = {
    'DRAFT': 'bg-slate-100 text-slate-700 border-slate-200',
    'IN_PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200',
    'SUBMITTED': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'APPROVED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'REJECTED': 'bg-rose-50 text-rose-700 border-rose-200',
    'CLOSED': 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return badges[status] || 'bg-slate-100 text-slate-700 border-slate-200';
};

// Helper function to safely parse JSON that might contain errors
const safeParseQuestions = (questionsData) => {
  if (!questionsData) return [];
  if (typeof questionsData === 'object' && questionsData !== null) {
    return Array.isArray(questionsData) ? questionsData : [];
  }
  if (typeof questionsData === 'string') {
    let cleanJson = questionsData;
    if (cleanJson.charCodeAt(0) === 0xFEFF) cleanJson = cleanJson.substring(1);
    cleanJson = cleanJson.replace(/\\n/g, '\\\\n');
    cleanJson = cleanJson.replace(/&/g, '&amp;');
    cleanJson = cleanJson.replace(/:\s*"([^"]*?)"/g, function(match, content) {
      const escapedContent = content.replace(/"/g, '\\"');
      return `: "${escapedContent}"`;
    });
    cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
    cleanJson = cleanJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    try { return JSON.parse(cleanJson); } 
    catch (e) { console.error('JSON parse error:', e); return []; }
  }
  return [];
};

// Helper function to format "What to look for" as numbered list
const formatWhatToLookForAsNumberedList = (text) => {
  if (!text || text === 'No documents specified') return '-';
  let items = [];
  if (text.includes('\n')) items = text.split('\n');
  else if (text.includes(',')) items = text.split(',');
  else items = [text];
  const cleanItems = items.map(item => item.replace(/^\d+\.\s*/, '').replace(/[•●○▪▫-]\s*/, '').trim()).filter(item => item.length > 0);
  return cleanItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
};

export default function IATFInternalView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audit, setAudit] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [auditorName, setAuditorName] = useState('');
  const [auditeeName, setAuditeeName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [processName, setProcessName] = useState('');
  const [auditeeSignature, setAuditeeSignature] = useState('');
  const [auditeeComment, setAuditeeComment] = useState('');
  const [auditorComment, setAuditorComment] = useState('');
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
        response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090/api/users/${userId}/signature`, { responseType: 'blob', withCredentials: true });
      } else if (fullName && fullName !== 'Not specified' && fullName !== 'N/A' && fullName !== 'Unknown') {
        const nameParts = fullName.trim().split(' ', 2);
        response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090/api/users/signature', {
          params: { firstName: nameParts[0], lastName: nameParts.length > 1 ? nameParts[1] : '' },
          responseType: 'blob', withCredentials: true
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
      
      if (parsedAnswers.auditeeSignature) {
        setAuditeeSignature(parsedAnswers.auditeeSignature);
        const sigImage = getSignatureFromBase64(parsedAnswers.auditeeSignature);
        if (sigImage) setAuditeeSignatureUrl(sigImage);
      }
      if (parsedAnswers.auditeeComment) setAuditeeComment(parsedAnswers.auditeeComment);
      if (parsedAnswers.auditeeSignedAt) setAuditeeSignedAt(parsedAnswers.auditeeSignedAt);
      if (parsedAnswers.auditorComment) setAuditorComment(parsedAnswers.auditorComment);
      if (parsedAnswers.auditorSignedAt) setAuditorSignedAt(parsedAnswers.auditorSignedAt);
      
      const deptName = parsedAnswers.departmentName || auditData.department || '';
      const procName = parsedAnswers.processName || auditData.checkSheet?.processName || '';
      setDepartmentName(deptName);
      setProcessName(procName);
      
      let auditor = '';
      if (auditData.auditorId) {
        try {
          const auditorUser = await userAPI.getUserById(auditData.auditorId);
          auditor = auditorUser?.name || `${auditorUser?.firstName} ${auditorUser?.lastName}`;
        } catch (e) { auditor = auditData.auditorName || parsedAnswers.auditorName || 'Unknown'; }
      } else { auditor = auditData.auditorName || parsedAnswers.auditorName || 'Unknown'; }
      setAuditorName(auditor);
      
      const auditee = auditData.auditeeName || parsedAnswers.auditeeName || 'Not specified';
      setAuditeeName(auditee);
      setLoadingSignatures(true);
      
      const auditorSigUrl = await fetchSignatureAsImageUrl(auditData.auditorId, auditor);
      if (auditorSigUrl) setAuditorSignatureUrl(auditorSigUrl);
      else {
        const auditorSigBase64 = parsedAnswers.auditorSignature;
        if (auditorSigBase64 && auditorSigBase64.startsWith('data:image')) setAuditorSignatureUrl(auditorSigBase64);
      }
      
      const currentUserRole = user?.role?.toLowerCase?.() || '';
      const isAuditorUser = currentUserRole === 'auditor' || auditData.auditorId === user?.id;
      const isAuditeeUser = currentUserRole === 'auditee' || auditData.auditeeId === user?.id;
      
      if (isAuditeeUser) {
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) setAuditeeSignatureUrl(auditeeSigUrl);
      } else if (isAuditorUser && auditData.status === 'APPROVED') {
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) setAuditeeSignatureUrl(auditeeSigUrl);
      } else if (isAuditorUser) { setAuditeeSignatureUrl(null); }
      
      setLoadingSignatures(false);
      
      const checkSheetId = auditData.checkSheet?.id;
      if (checkSheetId) {
        try {
          const sheetRes = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/templates/${checkSheetId}`, { withCredentials: true });
          const sheet = sheetRes.data;
          if (sheet.questions) {
            let parsedQuestions = safeParseQuestions(sheet.questions);
            const formattedQuestions = parsedQuestions.map((q, idx) => ({
              slNo: q.sNo || q.slNo || (idx + 1), clause: q.clauseNo || q.clause || '',
              checkpoint: q.displayLabel || q.checkpoint,
              whatToLookFor: q.documentsVerified || q.whatToLookFor || q.consideration || 'No documents specified',
              fieldKey: q.fieldKey, fieldType: q.fieldType
            }));
            setQuestions(formattedQuestions);
          }
        } catch (idError) { await fetchQuestionsByDepartment(deptName, procName); }
      } else if (deptName) { await fetchQuestionsByDepartment(deptName, procName); }
    } catch (error) {
      addToast('Failed to load audit details: ' + (error.message || 'Unknown error'), 'error');
    } finally { setLoading(false); }
  };
  
  const fetchQuestionsByDepartment = async (department, process) => {
    if (!department) return;
    try {
      const checkSheetRes = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/templates/iatf/by-department/${encodeURIComponent(department)}`, { withCredentials: true });
      const sheets = checkSheetRes.data;
      if (sheets && sheets.length > 0) {
        let selectedSheet = sheets[0];
        if (process) {
          const matchingSheet = sheets.find(s => s.processName === process);
          if (matchingSheet) selectedSheet = matchingSheet;
        }
        const sheetDetailsRes = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/templates/${selectedSheet.id}`, { withCredentials: true });
        const sheet = sheetDetailsRes.data;
        if (sheet.questions) {
          let parsedQuestions = safeParseQuestions(sheet.questions);
          const formattedQuestions = parsedQuestions.map((q, idx) => ({
            slNo: q.sNo || q.slNo || (idx + 1), clause: q.clauseNo || q.clause || '',
            checkpoint: q.displayLabel || q.checkpoint,
            whatToLookFor: q.documentsVerified || q.whatToLookFor || q.consideration || 'No documents specified',
            fieldKey: q.fieldKey, fieldType: q.fieldType
          }));
          setQuestions(formattedQuestions);
        }
      }
    } catch (error) { console.error('Error fetching by department:', error); }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      const response = await axios({ method: 'get', url: `${API_URL}/api/iatf-audits/${audit.id}/pdf`, responseType: 'blob', headers: { 'Accept': 'application/pdf' }, withCredentials: true });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `IATF_Audit_Report_${audit.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      addToast('PDF downloaded successfully', 'success');
    } catch (error) { addToast(`Failed to download PDF: ${error.message}`, 'error'); } 
    finally { setDownloading(false); }
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
    if (!signatureToSave || !signatureToSave.trim()) { addToast('No signature available.', 'error'); return; }
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      const response = await axios.put(`${API_URL}/api/templates/responses/${audit.id}/approve`, { signature: signatureToSave, comment: auditeeComment || 'No comments provided' }, { withCredentials: true });
      if (response.data) { addToast('✓ Audit approved successfully!', 'success'); await fetchAuditDetails(); }
    } catch (error) { addToast(`Failed to approve: ${error.response?.data?.message || error.message}`, 'error'); } 
    finally { setSubmitting(false); }
  };
  
  const handleReject = async () => {
    if (!auditeeComment.trim()) { addToast('Please provide a reason for rejection', 'error'); return; }
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      const response = await axios.put(`${API_URL}/api/templates/responses/${audit.id}/reject`, { comment: auditeeComment }, { withCredentials: true });
      if (response.data) { addToast('✗ Audit rejected.', 'warning'); await fetchAuditDetails(); }
    } catch (error) { addToast(`Failed to reject: ${error.response?.data?.message || error.message}`, 'error'); } 
    finally { setSubmitting(false); }
  };

  const responses = answers.responses || {};
  const observations = answers.observations || {};
  const totalQuestions = questions.length;
  let compliantCount = 0, minorNCCount = 0, majorNCCount = 0;
  questions.forEach((q, idx) => {
    const questionKey = String(idx + 1);
    const response = responses[questionKey] || responses[idx + 1] || responses[q.fieldKey];
    if (response === 'COMPLIANT') compliantCount++;
    else if (response === 'MINOR_NC') minorNCCount++;
    else if (response === 'MAJOR_NC') majorNCCount++;
  });
  
  const percentage = answers.score || 0;
  const finalPercentage = percentage > 0 ? percentage : (totalQuestions > 0 ? Math.round((compliantCount / totalQuestions) * 100) : 0);

  const currentStatus = audit?.status || 'SUBMITTED';
  const statusUpper = currentStatus?.toUpperCase?.() || '';
  const isDraft = statusUpper === 'DRAFT';
  const isSubmitted = statusUpper === 'SUBMITTED';
  const isApproved = statusUpper === 'APPROVED';
  const isRejected = statusUpper === 'REJECTED';

  const currentUserRole = user?.role?.toLowerCase?.() || '';
  const isAuditor = currentUserRole === 'auditor' || audit?.auditorId === user?.id;
  const isAuditee = currentUserRole === 'auditee' || audit?.auditeeId === user?.id;
  const showAuditeeActions = isAuditee && !isApproved && !isRejected;

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
          <AlertCircle size={48} className="mx-auto mb-4 text-rose-500" />
          <p className="text-lg font-bold text-slate-800">Audit not found</p>
          <button onClick={() => navigate('/auditor')} className="px-5 py-2.5 mt-4 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>Go Back</button>
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
            <BackButton fallbackPath="/lead-auditor" defaultTab="responses" label="Back"  />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">IATF Internal Audit Report</h1>
              <p className="text-sm text-slate-500 mt-0.5">View audit details and findings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAuditee && isSubmitted && (
              <span className="text-sm font-medium text-amber-600">⚠️ Please approve or reject</span>
            )}
            <button 
              onClick={handleDownloadPDF} 
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: NAVBAR_COLORS.primary }}
            >
              {downloading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</> : <><Download className="w-4 h-4" /> Download PDF</>}
            </button>
          </div>
        </div>

        {/* Banners */}
        {isApproved && (
          <div className="p-2 mb-6 text-center border rounded-xl bg-emerald-50 border-emerald-200 animate-fadeInUp">
            <div className="flex items-center justify-center gap-2 text-emerald-800">
              <CheckCircle className="w-5 h-5" />
              <span className="text-lg font-bold">✓ Audit Approved by Auditee</span>
            </div>
            {answers.auditeeComment && <div className="mt-2 text-sm text-emerald-700"><span className="font-medium">Comment: </span>{answers.auditeeComment}</div>}
          </div>
        )}

        {isRejected && (
          <div className="mb-6 text-center border p-2x rounded-xl bg-rose-50 border-rose-200 animate-fadeInUp">
            <div className="flex items-center justify-center gap-2 text-rose-800">
              <XCircle className="w-5 h-5" />
              <span className="text-lg font-bold">✗ Audit Rejected - Corrections Required</span>
            </div>
            {answers.auditeeComment && <div className="mt-2 text-sm text-rose-700"><span className="font-medium">Reason: </span>{answers.auditeeComment}</div>}
          </div>
        )}

        {/* Main Banner */}
        <div className="p-2 mb-6 text-center text-white shadow-md rounded-2xl animate-fadeInUp" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileText size={24} />
            <span className="text-xl font-bold">IATF 16949 INTERNAL AUDIT CHECK SHEET</span>
          </div>
          <p className="text-sm opacity-90">IATF 16949:2016 | Process Audit Compliance</p>
          {(departmentName || processName) && (
            <div className="pt-2 mt-3 border-t border-white/20">
              <div className="flex items-center justify-center gap-3 text-sm">
                {departmentName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                    <Building size={12} /> Dept: {departmentName}
                  </span>
                )}
                {processName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                    <Layers size={12} /> Process: {processName}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audit Information */}
        <div className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
          <h2 className="flex items-center gap-2 mb-4 text-base font-bold text-slate-800">
            <FileText size={18} style={{ color: NAVBAR_COLORS.primary }} /> Audit Information
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <FileText className="w-4 h-4 text-slate-400" />, label: 'Document Number', value: answers.documentNumber || `IATF-${audit.id}` },
              { icon: <Calendar className="w-4 h-4 text-slate-400" />, label: 'Audit Date', value: answers.date || formatDate(audit.auditDate) },
              { icon: <User className="w-4 h-4 text-slate-400" />, label: 'Auditor', value: auditorName || answers.auditorName || 'N/A' },
              { icon: <User className="w-4 h-4 text-slate-400" />, label: 'Auditee', value: auditeeName || answers.auditeeName || 'N/A' },
              { icon: <MapPin className="w-4 h-4 text-slate-400" />, label: 'Location', value: answers.location || '-' },
              { icon: <Clock className="w-4 h-4 text-slate-400" />, label: 'Shift', value: audit.shift || answers.shift || '-' },
              { icon: <Building className="w-4 h-4 text-slate-400" />, label: 'Department', value: departmentName || answers.departmentName || '-' },
              { icon: <Layers className="w-4 h-4 text-slate-400" />, label: 'Process', value: processName || answers.processName || '-' }
            ].map((item, idx) => (
              <div key={idx} className="p-3 border rounded-xl bg-slate-50 border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  {item.icon}
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{item.value}</p>
              </div>
            ))}
            {finalPercentage > 0 && (
              <div className="p-3 border rounded-xl bg-slate-50 border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Score</p>
                </div>
                <p className="text-sm font-bold" style={{ color: NAVBAR_COLORS.primary }}>{finalPercentage}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Score Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-5 animate-fadeInUp">
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-slate-800">{totalQuestions}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-emerald-600">{compliantCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">O (Compliant)</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-amber-600">{minorNCCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Mi (Minor)</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold text-rose-600">{majorNCCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Ma (Major)</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl stat-card">
            <p className="text-2xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{finalPercentage}%</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Score</p>
          </div>
        </div>

        {/* Audit Findings Table */}
        <div className="p-6 mb-6 overflow-x-auto bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5" style={{ color: NAVBAR_COLORS.primary }} />
            <h2 className="text-base font-bold text-slate-800">Audit Findings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-slate-50 border-slate-200">
                <tr>
                  <th className="w-12 px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600">S.No.</th>
                  <th className="w-24 px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600">Clause</th>
                  <th className="min-w-[280px] px-4 py-3 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">Check Point</th>
                  <th className="min-w-[250px] px-4 py-3 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">What to look for</th>
                  <th className="min-w-[200px] px-4 py-3 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">Observation</th>
                  <th className="px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600 w-14">Ma</th>
                  <th className="px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600 w-14">Mi</th>
                  <th className="px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600 w-14">O</th>
                  <th className="w-24 px-4 py-3 text-xs font-bold tracking-wider text-center uppercase text-slate-600">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questions.length > 0 ? questions.map((q, idx) => {
                  const questionKey = String(idx + 1);
                  let response = responses[questionKey] || responses[idx + 1] || responses[q.fieldKey];
                  const observation = observations[questionKey] || observations[idx + 1] || '';
                  const formattedWhatToLookFor = formatWhatToLookForAsNumberedList(q.whatToLookFor);
                  
                  let ma = '', mi = '', o = '', complianceText = '';
                  let complianceBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
                  
                  if (response === 'MAJOR_NC') {
                    ma = '✓'; complianceText = 'No'; complianceBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                  } else if (response === 'MINOR_NC') {
                    mi = '✓'; complianceText = 'No'; complianceBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                  } else if (response === 'COMPLIANT') {
                    o = '✓'; complianceText = 'Yes'; complianceBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  } else {
                    complianceText = response || 'Pending';
                  }
                  
                  return (
                    <tr key={idx} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-center text-slate-600">{q.slNo || idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">{q.clause || '-'}</td>
                      <td className="px-4 py-3 text-sm align-top text-slate-800">{q.checkpoint}</td>
                      <td className="px-4 py-3 text-xs whitespace-pre-wrap align-top text-slate-600 bg-slate-50/50">{formattedWhatToLookFor}</td>
                      <td className="px-4 py-3 text-sm align-top text-slate-600">{observation || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-center align-top text-rose-600">{ma}</td>
                      <td className="px-4 py-3 text-sm font-bold text-center align-top text-amber-600">{mi}</td>
                      <td className="px-4 py-3 text-sm font-bold text-center align-top text-emerald-600">{o}</td>
                      <td className="px-4 py-3 text-center align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${complianceBadgeClass}`}>
                          {complianceText}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-500">No IATF questions loaded for this audit</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Section */}
        <div className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl print:break-inside-avoid animate-fadeInUp">
          <h2 className="flex items-center gap-2 mb-4 text-base font-bold text-slate-800">
            <Award size={18} style={{ color: NAVBAR_COLORS.primary }} /> Signatures & Comments
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
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">No signature uploaded</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">Name: {auditorName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: {auditorSignedAt ? formatDateTime(auditorSignedAt) : (answers.date || formatDate(audit.auditDate) || '-')}</p>
              {auditorComment && (
                <div className="p-3 mt-3 text-xs bg-white border rounded-lg text-slate-600 border-slate-200">
                  <span className="font-bold">Comment:</span> {auditorComment}
                </div>
              )}
            </div>
            
            {/* AUDITEE SIGNATURE SECTION */}
            <div className="p-5 border rounded-xl bg-slate-50 border-slate-200">
              {showAuditeeActions ? (
                <>
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Your Electronic Signature</p>
                  <div className="mt-3">
                    {!auditeeSignatureUrl && !auditeeSignature ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                          <AlertTriangle size={16} />
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
                    ) : (
                      <div>
                        {auditeeSignatureUrl && (
                          <img src={auditeeSignatureUrl} alt="Auditee Signature" className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24" />
                        )}
                        <p className="mt-2 text-xs font-medium text-emerald-600">✓ Signature loaded from your profile</p>
                        <p className="mt-1 text-xs text-slate-500">Name: {auditeeName}</p>
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
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {submitting ? 'Processing...' : 'Approve & Sign'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 shadow-md transition-all"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Auditee Signature</p>
                  <div className="mt-3">
                    {(isApproved || isRejected) ? (
                      auditeeSignatureUrl ? (
                        <img src={auditeeSignatureUrl} alt="Auditee Signature" className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24" />
                      ) : auditeeSignature ? (
                        <p className="p-3 text-sm font-semibold bg-white border rounded-lg shadow-sm text-slate-800 border-slate-200">{auditeeSignature}</p>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <AlertTriangle size={16} />
                          <span className="text-sm font-medium">No signature available</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-xl bg-amber-50 border-amber-200">
                        <div className="text-center">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                          <p className="text-sm font-bold text-amber-700">Waiting for Approval</p>
                          <p className="text-xs text-amber-600 mt-0.5">Signature will appear after auditee approval</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Name: {auditeeName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Date: {auditeeSignedAt ? formatDateTime(auditeeSignedAt) : ((isApproved || isRejected) ? formatDateTime(audit.updatedAt) : '-')}</p>

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
                          <CheckCircle size={12} /> Approved
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                          <XCircle size={12} /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertCircle size={12} /> Pending Approval
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
          <p>IATF 16949 Internal Audit Report | Generated on {formatDate(new Date().toISOString())}</p>
          <p className="mt-1">This is an electronic document and does not require a physical signature</p>
        </div>
      </div>
    </div>
  );
}