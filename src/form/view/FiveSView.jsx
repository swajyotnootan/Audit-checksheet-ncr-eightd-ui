// src/form/view/FiveSView.jsx
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
  Sparkles, Printer, Star, TrendingUp, ThumbsUp, ThumbsDown,
  FileText, MapPin, Clock, Award, Building, Users, PenTool,
  Download, XCircle, Info, AlertTriangle
} from 'lucide-react';

// ============================================================================
// MNC PROFESSIONAL COLOR PALETTE (Matching Audit Manager Dashboard)
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

const getStatusBadge = (status) => {
  const badges = {
    'DRAFT': 'bg-slate-100 text-slate-700 border border-slate-200',
    'IN_PROGRESS': 'bg-blue-50 text-blue-700 border border-blue-200',
    'SUBMITTED': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    'APPROVED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'REJECTED': 'bg-rose-50 text-rose-700 border border-rose-200',
    'CLOSED': 'bg-slate-50 text-slate-700 border border-slate-200',
  };
  return badges[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
};

// Score mapping for display - PRESERVED EXACTLY, just updated colors
const getScoreInfo = (score) => {
  if (score === 4) return { label: 'Total Compliance', level: 'Excellent', color: 'green', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' };
  if (score === 3) return { label: 'Significant Compliance', level: 'Good', color: 'lime', bgColor: 'bg-lime-50', textColor: 'text-lime-700' };
  if (score === 2) return { label: 'Some Compliance', level: 'Average', color: 'yellow', bgColor: 'bg-amber-50', textColor: 'text-amber-700' };
  if (score === 1) return { label: 'Very Little Compliance', level: 'Poor', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-700' };
  if (score === 0) return { label: 'No Compliance', level: 'Very Poor', color: 'red', bgColor: 'bg-rose-50', textColor: 'text-rose-700' };
  return { label: 'Not Rated', level: 'Not Rated', color: 'gray', bgColor: 'bg-slate-100', textColor: 'text-slate-600' };
};

const getLevelOfJudgment = (score) => {
  if (score === 4) return 'Total Compliance';
  if (score === 3) return 'Significant Compliance';
  if (score === 2) return 'Some Compliance';
  if (score === 1) return 'Very Little Compliance';
  if (score === 0) return 'No Compliance';
  return 'Not Rated';
};

// UPDATED SECTION STYLES TO MATCH MNC PROFESSIONAL THEME
const getSectionStyles = (sectionName) => {
  switch(sectionName) {
    case '1S - SORT':
      return { 
        displayName: '1S - SORT',
        headerBg: 'bg-blue-50', 
        headerBorder: 'border-blue-200', 
        textColor: 'text-blue-700', 
        barColor: 'bg-blue-500',
        description: 'Determine what is needed and remove the rest.'
      };
    case '2S - SET IN ORDER':
      return { 
        displayName: '2S - SET IN ORDER',
        headerBg: 'bg-cyan-50', 
        headerBorder: 'border-cyan-200', 
        textColor: 'text-cyan-700', 
        barColor: 'bg-cyan-500',
        description: 'A place for everything and everything in its place.'
      };
    case '3S - SHINE':
      return { 
        displayName: '3S - SHINE',
        headerBg: 'bg-emerald-50', 
        headerBorder: 'border-emerald-200', 
        textColor: 'text-emerald-700', 
        barColor: 'bg-emerald-500',
        description: 'Cleaning and looking for ways to keep it clean.'
      };
    case '4S - STANDARDIZE':
      return { 
        displayName: '4S - STANDARDIZE',
        headerBg: 'bg-amber-50', 
        headerBorder: 'border-amber-200', 
        textColor: 'text-amber-700', 
        barColor: 'bg-amber-500',
        description: 'Make standards obvious and maintained.'
      };
    case '5S - SUSTAIN':
      return { 
        displayName: '5S - SUSTAIN',
        headerBg: 'bg-indigo-50', 
        headerBorder: 'border-indigo-200', 
        textColor: 'text-indigo-700', 
        barColor: 'bg-indigo-500',
        description: 'Maintain high standards and constantly seek to improve.'
      };
    default:
      return { 
        displayName: sectionName,
        headerBg: 'bg-slate-50', 
        headerBorder: 'border-slate-200', 
        textColor: 'text-slate-700', 
        barColor: 'bg-slate-500',
        description: ''
      };
  }
};

export default function FiveSView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audit, setAudit] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [auditorName, setAuditorName] = useState('');
  const [auditeeName, setAuditeeName] = useState('');
  const [auditeeSignature, setAuditeeSignature] = useState('');
  const [auditeeComment, setAuditeeComment] = useState('');
  const [auditorSignedAt, setAuditorSignedAt] = useState(null);
  const [auditeeSignedAt, setAuditeeSignedAt] = useState(null);
  
  // Signature image states - PRESERVED
  const [auditorSignatureUrl, setAuditorSignatureUrl] = useState(null);
  const [auditeeSignatureUrl, setAuditeeSignatureUrl] = useState(null);
  const [loadingSignatures, setLoadingSignatures] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAuditDetails();
    }
    return () => {
      if (auditorSignatureUrl && auditorSignatureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(auditorSignatureUrl);
      }
      if (auditeeSignatureUrl && auditeeSignatureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(auditeeSignatureUrl);
      }
    };
  }, [id]);

  // Fetch signature as image URL - PRESERVED EXACTLY
  const fetchSignatureAsImageUrl = async (userId, fullName) => {
    try {
      let response;
      if (userId) {
        response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090/api/users/${userId}/signature`, {
          responseType: 'blob',
          withCredentials: true
        });
      } else if (fullName && fullName !== 'Not specified' && fullName !== 'N/A' && fullName !== 'Unknown') {
        const nameParts = fullName.trim().split(' ', 2);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[1] : '';
        response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090/api/users/signature', {
          params: { firstName, lastName },
          responseType: 'blob',
          withCredentials: true
        });
      } else {
        return null;
      }
      
      if (response.data && response.data.size > 0) {
        return URL.createObjectURL(response.data);
      }
      return null;
    } catch (error) {
      console.error('Error fetching signature:', error);
      return null;
    }
  };

  const getSignatureFromBase64 = (base64String) => {
    if (base64String && (base64String.startsWith('data:image') || base64String.includes('base64'))) {
      return base64String;
    }
    return null;
  };

  // PRESERVED EXACTLY - All role-based logic intact
  const fetchAuditDetails = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING 5S AUDIT VIEW ===');
      console.log('Audit ID:', id);

      const response = await auditScheduleApi.getAuditResponse(parseInt(id));
      console.log('Audit Data:', response.data);
      
      const auditData = response.data;
      setAudit(auditData);
      
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
      
      // Set auditee signature and comment
      if (parsedAnswers.auditeeSignature) {
        setAuditeeSignature(parsedAnswers.auditeeSignature);
        const sigImage = getSignatureFromBase64(parsedAnswers.auditeeSignature);
        if (sigImage) {
          setAuditeeSignatureUrl(sigImage);
        }
      }
      if (parsedAnswers.auditeeComment) {
        setAuditeeComment(parsedAnswers.auditeeComment);
      }
      if (parsedAnswers.auditeeSignedAt) {
        setAuditeeSignedAt(parsedAnswers.auditeeSignedAt);
      }
      if (parsedAnswers.auditorSignedAt) {
        setAuditorSignedAt(parsedAnswers.auditorSignedAt);
      }
      
      // Get auditor name (for Auditor/Supervisor field)
      let auditor = '';
      if (auditData.auditorId) {
        try {
          const auditorUser = await userAPI.getUserById(auditData.auditorId);
          auditor = auditorUser?.name || `${auditorUser?.firstName} ${auditorUser?.lastName}`;
          setAuditorName(auditor);
        } catch (e) {
          auditor = auditData.auditorName || parsedAnswers.auditorName || 'Unknown';
          setAuditorName(auditor);
        }
      } else {
        auditor = auditData.auditorName || parsedAnswers.auditorName || 'Unknown';
        setAuditorName(auditor);
      }
      
      const auditee = auditData.auditeeName || parsedAnswers.auditeeName || 'Not specified';
      setAuditeeName(auditee);
      
      // Fetch signatures
      setLoadingSignatures(true);
      
      // Fetch auditor signature
      const auditorSigUrl = await fetchSignatureAsImageUrl(auditData.auditorId, auditor);
      if (auditorSigUrl) {
        setAuditorSignatureUrl(auditorSigUrl);
        console.log('✅ Auditor signature fetched');
      } else {
        const auditorSigBase64 = parsedAnswers.auditorSignature;
        if (auditorSigBase64 && auditorSigBase64.startsWith('data:image')) {
          setAuditorSignatureUrl(auditorSigBase64);
          console.log('✅ Auditor signature from answers');
        }
      }
      
      // Fetch auditee signature based on role and status - PRESERVED EXACTLY
      const currentUserRole = user?.role?.toLowerCase?.() || '';
      const isAuditorUser = currentUserRole === 'auditor' || auditData.auditorId === user?.id;
      
      if (!isAuditorUser) {
        // Auditee side: Always fetch signature
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) {
          setAuditeeSignatureUrl(auditeeSigUrl);
          console.log('✅ Auditee signature fetched for auditee');
        }
      } else if (isAuditorUser && auditData.status === 'APPROVED') {
        // Auditor side: ONLY fetch signature when approved
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) {
          setAuditeeSignatureUrl(auditeeSigUrl);
          console.log('✅ Auditee signature fetched for auditor (approved status)');
        }
      } else {
        console.log('⏳ Auditor viewing - waiting for approval, signature hidden');
        setAuditeeSignatureUrl(null);
      }
      
      setLoadingSignatures(false);
      
      // Get questions from check sheet
      const checkSheet = auditData.checkSheet;
      console.log('Check Sheet:', checkSheet);
      
      if (checkSheet && checkSheet.questions) {
        let parsedQuestions = [];
        try {
          parsedQuestions = typeof checkSheet.questions === 'string' 
            ? JSON.parse(checkSheet.questions) 
            : checkSheet.questions;
          
          const formattedQuestions = parsedQuestions.map((q, idx) => {
            let category = q.category || '';
            if (!category && q.consideration) {
              if (q.consideration.includes('SORT') || q.consideration.includes('1S')) category = '1S - SORT';
              else if (q.consideration.includes('SET') || q.consideration.includes('2S')) category = '2S - SET IN ORDER';
              else if (q.consideration.includes('SHINE') || q.consideration.includes('3S')) category = '3S - SHINE';
              else if (q.consideration.includes('STANDARDIZE') || q.consideration.includes('4S')) category = '4S - STANDARDIZE';
              else if (q.consideration.includes('SUSTAIN') || q.consideration.includes('5S')) category = '5S - SUSTAIN';
            }
            
            return {
              slNo: q.sNo || q.slNo || (idx + 1),
              checkpoint: q.displayLabel,
              category: category,
              maxMarks: q.maxRating || 4,
              fieldKey: q.fieldKey
            };
          });
          
          setQuestions(formattedQuestions);
        } catch (e) {
          console.error('Error parsing questions:', e);
          setQuestions([]);
        }
      }
      
    } catch (error) {
      console.error('Error fetching audit details:', error);
      addToast('Failed to load audit details: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // SIMPLIFIED AND FIXED: formatDate - Proper UTC to IST conversion
const formatDate = (dateString) => {
  if (!dateString) return '—';
  
  try {
    let date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      // Try alternative parsing
      if (typeof dateString === 'string' && dateString.match(/^\d{2}-\d{2}-\d{4}/)) {
        return dateString; // Already formatted
      }
      const cleaned = dateString.replace(' ', 'T');
      date = new Date(cleaned);
      if (isNaN(date.getTime())) {
        return String(dateString);
      }
    }
    
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(dateString);
  }
};

 // FIXED: 5S formatDateTime - Use IST consistently
// FIXED: 5S formatDateTime - Handle all date formats properly
// SIMPLIFIED AND FIXED: 5S formatDateTime - Proper UTC to IST conversion
const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  
  try {
    let date = new Date(dateString);
    
    // If date is invalid, try alternative parsing
    if (isNaN(date.getTime())) {
      // Try to parse as "DD-MM-YYYY HH:mm" format
      if (typeof dateString === 'string' && dateString.match(/^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}/)) {
        return dateString; // Already formatted
      }
      
      // Try replacing space with T for ISO parsing
      const cleaned = dateString.replace(' ', 'T');
      date = new Date(cleaned);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return String(dateString);
      }
    }
    
    // ✅ Convert to IST (Asia/Kolkata)
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
    console.error('Date formatting error:', error, dateString);
    return String(dateString);
  }
};

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  // PRESERVED EXACTLY
 // FIXED: 5S handleDownloadPDF - Remove X-Timezone header, use query param
const handleDownloadPDF = async () => {
  if (!audit || !audit.id) {
    addToast('Audit data not available', 'error');
    return;
  }

  setDownloading(true);
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
    const responseId = audit.id;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const endpoint = `${API_URL}/api/fives-audits/${responseId}/pdf`;
    
    const response = await axios({
      method: 'get',
      url: endpoint,
      params: { timezone: userTimezone },  // ✅ Send as query param
      responseType: 'blob',
      headers: { 
        'Accept': 'application/pdf'
        // ❌ REMOVE: 'X-Timezone': userTimezone
      },
      withCredentials: true
    });
    
    if (!response.data || response.data.size === 0) {
      addToast('PDF generated but file is empty', 'error');
      setDownloading(false);
      return;
    }
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `5S_Audit_Report_${responseId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
    addToast('PDF downloaded successfully', 'success');
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    addToast(`Failed to download PDF: ${error.message}`, 'error');
  } finally {
    setDownloading(false);
  }
};

  // PRESERVED EXACTLY - Blob to base64 conversion logic intact
  const handleApprove = async () => {
    console.log('=== APPROVE BUTTON CLICKED ===');
    
    let signatureToSave = auditeeSignature;
    
    if (auditeeSignatureUrl && !auditeeSignatureUrl.startsWith('blob:')) {
      signatureToSave = auditeeSignatureUrl;
    } else if (auditeeSignatureUrl && auditeeSignatureUrl.startsWith('blob:')) {
      try {
        const response = await fetch(auditeeSignatureUrl);
        const blob = await response.blob();
        signatureToSave = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting signature to base64:', error);
        signatureToSave = auditeeSignature;
      }
    }
    
    if (!signatureToSave.trim()) {
      addToast('No signature available. Please upload signature in your profile or type your name.', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      
      const response = await axios.put(
        `${API_URL}/api/templates/responses/${audit.id}/approve`,
        {
          signature: signatureToSave,
          comment: auditeeComment || 'No comments provided'
        },
        { 
                withCredentials: true }
      );
      
      console.log('Approve response:', response.data);
      
      if (response.data) {
        addToast('✓ Audit approved successfully!', 'success');
        await fetchAuditDetails();
      }
      
    } catch (error) {
      console.error('Error approving audit:', error);
      addToast(`Failed to approve: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // PRESERVED EXACTLY
  const handleReject = async () => {
    console.log('=== REJECT BUTTON CLICKED ===');
    
    if (!auditeeComment.trim()) {
      addToast('Please provide a reason for rejection', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      
      const response = await axios.put(
        `${API_URL}/api/templates/responses/${audit.id}/reject`,
        { comment: auditeeComment },
        { 
                withCredentials: true }
      );
      
      console.log('Reject response:', response.data);
      
      if (response.data) {
        addToast('✗ Audit rejected. The auditor has been notified.', 'warning');
        await fetchAuditDetails();
      }
      
    } catch (error) {
      console.error('Error rejecting audit:', error);
      addToast(`Failed to reject: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const scores = answers.scores || {};
  const comments = answers.comments || {};
  
  const totalScore = Object.values(scores).reduce((a, b) => a + (b || 0), 0);
  const maxScore = 144;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  
  const totalQuestions = questions.length;
  const ratedCount = Object.keys(scores).filter(key => scores[key] !== null && scores[key] !== undefined).length;

  const getSectionScore = (startSlNo, endSlNo) => {
    let total = 0;
    for (let i = startSlNo; i <= endSlNo; i++) {
      total += scores[i] || 0;
    }
    return total;
  };

  const getSectionMaxScore = (startSlNo, endSlNo) => {
    let total = 0;
    for (let i = startSlNo; i <= endSlNo; i++) {
      total += 4;
    }
    return total;
  };

  const groupQuestionsBySection = () => {
    const sections = {
      '1S - SORT': { questions: [], start: 1, end: 8, maxScore: 32 },
      '2S - SET IN ORDER': { questions: [], start: 9, end: 16, maxScore: 32 },
      '3S - SHINE': { questions: [], start: 17, end: 25, maxScore: 36 },
      '4S - STANDARDIZE': { questions: [], start: 26, end: 31, maxScore: 24 },
      '5S - SUSTAIN': { questions: [], start: 32, end: 36, maxScore: 20 }
    };
    
    questions.forEach(q => {
      if (q.slNo <= 8) sections['1S - SORT'].questions.push(q);
      else if (q.slNo <= 16) sections['2S - SET IN ORDER'].questions.push(q);
      else if (q.slNo <= 25) sections['3S - SHINE'].questions.push(q);
      else if (q.slNo <= 31) sections['4S - STANDARDIZE'].questions.push(q);
      else if (q.slNo <= 36) sections['5S - SUSTAIN'].questions.push(q);
    });
    
    return sections;
  };

  const sections = groupQuestionsBySection();

  // Derived values - PRESERVED EXACTLY
  const currentStatus = audit?.status || 'SUBMITTED';
  const statusUpper = currentStatus?.toUpperCase?.() || '';
  const isSubmitted = statusUpper === 'SUBMITTED';
  const isApproved = statusUpper === 'APPROVED';
  const isRejected = statusUpper === 'REJECTED';

  const currentUserRole = user?.role?.toLowerCase?.() || '';
  const isAuditor = currentUserRole === 'auditor' || audit?.auditorId === user?.id;
  const isAuditee = currentUserRole === 'auditee' || 
                    audit?.auditeeId === user?.id || 
                    (audit?.auditeeName && audit?.auditeeName === user?.name);

  const showAuditeeActions = isAuditee && isSubmitted;
  const canDownloadPDF = true;

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
          <button onClick={() => navigate('/auditor')} className="px-5 py-2.5 mt-4 text-sm font-medium text-white shadow-md rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <div className="p-4 mx-auto max-w-7xl print:p-2" id="audit-report-content">
        
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/lead-auditor" defaultTab="responses" label="Back" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">5S Audit Report</h1>
              <p className="text-sm text-slate-500 mt-0.5">Workplace organization audit details and findings</p>
            </div>
          </div>
          <button 
            onClick={handleDownloadPDF} 
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md rounded-xl disabled:opacity-50 transition-all hover:shadow-lg"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download PDF
              </>
            )}
          </button>
        </div>

        {/* Approval Status Banner */}
        {isApproved && (
          <div className="p-2 mb-6 text-center border rounded-xl bg-emerald-50 border-emerald-200">
            <div className="flex items-center justify-center gap-2 text-emerald-800">
              <CheckCircle className="w-5 h-5" />
              <span className="text-lg font-bold">✓ Audit Approved by Auditee</span>
            </div>
            {answers.auditeeComment && (
              <div className="mt-2 text-sm text-emerald-700">
                <span className="font-semibold">Comment: </span>{answers.auditeeComment}
              </div>
            )}
          </div>
        )}

        {isRejected && (
          <div className="p-2 mb-6 text-center border rounded-xl bg-rose-50 border-rose-200">
            <div className="flex items-center justify-center gap-2 text-rose-800">
              <XCircle className="w-5 h-5" />
              <span className="text-lg font-bold">✗ Audit Rejected - Corrections Required</span>
            </div>
            {answers.auditeeComment && (
              <div className="mt-2 text-sm text-rose-700">
                <span className="font-semibold">Reason: </span>{answers.auditeeComment}
              </div>
            )}
          </div>
        )}

        {/* 5S Header Banner */}
        <div className="p-3 mb-6 text-center text-white shadow-md rounded-2xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles size={24} />
            <span className="text-xl font-bold">5S AUDIT CHECK SHEET</span>
          </div>
          <p className="text-sm opacity-90">Sort | Set in Order | Shine | Standardize | Sustain</p>
        </div>

        {/* Audit Information */}
        <div className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <h2 className="flex items-center gap-2 mb-4 text-base font-bold text-slate-800">
            <FileText size={18} style={{ color: NAVBAR_COLORS.primary }} /> Audit Information
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <FileText className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Number</p>
                <p className="text-sm font-semibold text-slate-800">{answers.documentNumber || `5S-${audit.id}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <Building className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</p>
                <p className="text-sm font-semibold text-slate-800">{answers.department || audit.department || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Auditor (Supervisor)</p>
                <p className="text-sm font-semibold text-slate-800">{auditorName || answers.auditorName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Auditee</p>
                <p className="text-sm font-semibold text-slate-800">{auditeeName || answers.auditeeName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audit Date</p>
                <p className="text-sm font-semibold text-slate-800">{answers.date || formatDate(audit.auditDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Area / Location</p>
                <p className="text-sm font-semibold text-slate-800">{answers.area || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift</p>
                <p className="text-sm font-semibold text-slate-800">{audit.shift || answers.shift || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
              <div className="w-4 h-4" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</p>
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(currentStatus)}`}>
                  {currentStatus || 'DRAFT'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Scale Legend */}
        <div className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <p className="mb-3 text-sm font-bold text-slate-700">Rating Scale:</p>
          <div className="grid grid-cols-5 gap-3 text-xs text-center">
            <div className="p-2 font-medium border rounded-lg bg-rose-50 border-rose-200 text-rose-700">0 = No Compliance</div>
            <div className="p-2 font-medium text-orange-700 border border-orange-200 rounded-lg bg-orange-50">1 = Very Little</div>
            <div className="p-2 font-medium border rounded-lg bg-amber-50 border-amber-200 text-amber-700">2 = Some</div>
            <div className="p-2 font-medium border rounded-lg bg-lime-50 border-lime-200 text-lime-700">3 = Significant</div>
            <div className="p-2 font-medium border rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700">4 = Total</div>
          </div>
        </div>

        {/* Score Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
            <p className="text-2xl font-bold text-slate-800">{totalQuestions}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total Questions</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
            <p className="text-2xl font-bold text-emerald-600">{ratedCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Rated</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
            <p className="text-2xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{totalScore}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total Score</p>
          </div>
          <div className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
            <p className={`text-2xl font-bold ${getScoreColor(percentage)}`}>{percentage}%</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Percentage</p>
          </div>
        </div>

        {/* 5S Sections Summary */}
        <div className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <h2 className="mb-4 text-base font-bold text-slate-800">5S Sections Summary</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {Object.entries(sections).map(([sectionName, section]) => {
              const sectionScore = getSectionScore(section.start, section.end);
              const sectionMaxScore = getSectionMaxScore(section.start, section.end);
              const sectionPercentage = Math.round((sectionScore / sectionMaxScore) * 100);
              const styles = getSectionStyles(sectionName);
              return (
                <div key={sectionName} className="p-4 text-center border rounded-xl bg-slate-50 border-slate-100">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${styles.textColor}`}>{styles.displayName}</div>
                  <div className="mt-1 text-2xl font-bold text-slate-800">{sectionScore}</div>
                  <div className="text-[10px] text-slate-400">/ {sectionMaxScore}</div>
                  <div className="w-full h-1.5 mt-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${styles.barColor}`} style={{ width: `${sectionPercentage}%` }} />
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-600">{sectionPercentage}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Findings Table */}
        <div className="p-6 mb-6 overflow-x-auto bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" style={{ color: NAVBAR_COLORS.primary }} />
            <h2 className="text-base font-bold text-slate-800">Audit Findings</h2>
          </div>
          
          {Object.entries(sections).map(([sectionName, section]) => {
            const sectionScore = getSectionScore(section.start, section.end);
            const sectionMaxScore = getSectionMaxScore(section.start, section.end);
            const sectionPercentage = Math.round((sectionScore / sectionMaxScore) * 100);
            const styles = getSectionStyles(sectionName);
            
            return (
              <div key={sectionName} className="mb-6 overflow-hidden border border-slate-200 rounded-xl">
                <div className={`p-4 ${styles.headerBg} border-b ${styles.headerBorder}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${styles.textColor}`}>{styles.displayName}</span>
                        <div className="relative group">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          <div className="absolute left-0 z-10 hidden w-64 p-2 mb-1 text-xs text-white rounded-lg bg-slate-800 group-hover:block bottom-full">
                            {styles.description}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Max marks: {sectionMaxScore} | Score: {sectionScore}/{sectionMaxScore} ({sectionPercentage}%)
                      </p>
                    </div>
                    <div className={`text-right text-xs font-semibold ${styles.textColor}`}>
                      Level of Judgment: {sectionPercentage >= 80 ? 'Excellent' : sectionPercentage >= 60 ? 'Good' : sectionPercentage >= 40 ? 'Average' : 'Poor'}
                    </div>
                  </div>
                </div>
                
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50 border-slate-200">
                    <tr>
                      <th className="w-12 px-3 py-2 text-xs font-bold tracking-wider text-center uppercase text-slate-600">S.No</th>
                      <th className="min-w-[350px] px-3 py-2 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">Audit Checkpoint</th>
                      <th className="w-20 px-3 py-2 text-xs font-bold tracking-wider text-center uppercase text-slate-600">Max</th>
                      <th className="w-32 px-3 py-2 text-xs font-bold tracking-wider text-center uppercase text-slate-600">Score</th>
                      <th className="min-w-[200px] px-3 py-2 text-xs font-bold text-left text-slate-600 uppercase tracking-wider">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {section.questions.map((q) => {
                      const score = scores[q.slNo];
                      const comment = comments[q.slNo];
                      const scoreInfo = getScoreInfo(score);
                      const levelOfJudgment = getLevelOfJudgment(score);
                      
                      return (
                        <tr key={q.slNo} className="transition-colors hover:bg-slate-50">
                          <td className="px-3 py-2 text-sm font-medium text-center text-slate-600">{q.slNo}</td>
                          <td className="px-3 py-2 text-sm text-slate-800">{q.checkpoint}</td>
                          <td className="px-3 py-2 text-sm text-center text-slate-500">4</td>
                          <td className="px-3 py-2 text-center">
                            {score !== undefined && score !== null ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center justify-center w-10 h-10 text-sm font-bold rounded-full border-2 ${scoreInfo.bgColor} ${scoreInfo.textColor} border-current`}>
                                  {score}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500">{levelOfJudgment}</span>
                              </div>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full text-slate-500 bg-slate-100">Not Rated</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-600">{comment || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t bg-slate-50 border-slate-200">
                    <tr>
                      <td colSpan="2" className="px-3 py-2 text-sm font-bold text-right text-slate-700">Section Total:</td>
                      <td className="px-3 py-2 text-sm font-bold text-center text-slate-800">{sectionMaxScore}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-bold text-slate-800">{sectionScore}</span>
                        <span className="text-xs text-slate-500">/{sectionMaxScore}</span>
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-left text-slate-600">
                        {sectionPercentage}% - {sectionPercentage >= 80 ? 'Excellent' : sectionPercentage >= 60 ? 'Good' : sectionPercentage >= 40 ? 'Average' : 'Poor'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>

        {/* Rating Message */}
        <div className={`p-4 mb-6 text-center rounded-xl border ${
          percentage >= 90 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          percentage >= 75 && percentage < 90 ? 'bg-lime-50 border-lime-200 text-lime-800' :
          percentage >= 60 && percentage < 75 ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center justify-center gap-2">
            {percentage >= 90 && <Star size={18} />}
            {percentage >= 75 && percentage < 90 && <ThumbsUp size={18} />}
            {percentage >= 60 && percentage < 75 && <AlertCircle size={18} />}
            {percentage < 60 && <AlertCircle size={18} />}
            <span className="font-bold">
              {percentage >= 90 ? 'Excellent - World Class 5S!' : 
               percentage >= 75 ? 'Good - Above Average' : 
               percentage >= 60 ? 'Needs Improvement' : 
               'Poor - Immediate Action Required'}
            </span>
          </div>
        </div>

        {/* Signature Section - ALL LOGIC PRESERVED EXACTLY */}
        <div className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl print:break-inside-avoid">
          <h2 className="flex items-center gap-2 mb-4 text-base font-bold text-slate-800">
            <PenTool size={18} style={{ color: NAVBAR_COLORS.primary }} /> Signatures & Comments
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
                  <img 
                    src={auditorSignatureUrl} 
                    alt="Auditor Signature" 
                    className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">No signature uploaded</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">Name: {auditorName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: {auditorSignedAt ? formatDateTime(auditorSignedAt) : (answers.date || formatDate(audit.auditDate) || '-')}
              </p>
              {answers.auditorComment && (
                <div className="p-3 mt-3 text-xs bg-white border rounded-lg text-slate-600 border-slate-200">
                  <span className="font-bold">Comment:</span> {answers.auditorComment}
                </div>
              )}
            </div>
            
            {/* AUDITEE SIGNATURE SECTION - ALL CONDITIONAL LOGIC PRESERVED */}
            <div className="p-5 border rounded-xl bg-slate-50 border-slate-200">
              {showAuditeeActions ? (
                // Auditee Approval Mode
                <>
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Your Electronic Signature</p>
                  
                  {loadingSignatures ? (
                    <div className="flex justify-center p-4">
                      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                    </div>
                  ) : auditeeSignatureUrl ? (
                    <div className="mt-3">
                      <img 
                        src={auditeeSignatureUrl} 
                        alt="Auditee Signature" 
                        className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24"
                      />
                      <p className="mt-2 text-xs font-medium" style={{ color: NAVBAR_COLORS.secondary }}>✓ Signature loaded from your profile</p>
                      <p className="mt-1 text-xs text-slate-500">Name: {auditeeName}</p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-medium">No signature uploaded in profile</span>
                      </div>
                      <input
                        type="text"
                        value={auditeeSignature}
                        onChange={(e) => setAuditeeSignature(e.target.value)}
                        placeholder="Type your full name as signature (fallback)"
                        className="w-full px-4 py-2.5 mt-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      />
                    </div>
                  )}
                  
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
                // View Mode
                <>
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Auditee Signature</p>
                  <div className="mt-3">
                    {loadingSignatures ? (
                      <div className="flex justify-center p-4">
                        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                      </div>
                    ) : (isApproved || isRejected) ? (
                      auditeeSignatureUrl ? (
                        <img 
                          src={auditeeSignatureUrl} 
                          alt="Auditee Signature" 
                          className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200 max-h-24"
                        />
                      ) : auditeeSignature ? (
                        <p className="p-3 text-sm font-semibold bg-white border rounded-lg shadow-sm text-slate-800 border-slate-200">
                          {auditeeSignature}
                        </p>
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    Date: {auditeeSignedAt ? formatDateTime(auditeeSignedAt) : ((isApproved || isRejected) ? formatDateTime(audit.updatedAt) : '-')}
                  </p>
                  
                  {(answers.auditeeComment || auditeeComment) && (isApproved || isRejected) && (
                    <div className="p-3 mt-3 text-xs bg-white border rounded-lg text-slate-600 border-slate-200">
                      <span className="font-bold">Comment:</span> {answers.auditeeComment || auditeeComment}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Status</p>
                    <div className="mt-2">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <CheckCircle size={12} /> Approved
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                          <XCircle size={12} /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
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
          <p>5S Workplace Organization Audit Report | Generated on {formatDate(new Date().toISOString())}</p>
          <p className="mt-1">This is an electronic document and does not require a physical signature</p>
        </div>
      </div>
    </div>
  );
}