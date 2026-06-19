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

// Score mapping for display
const getScoreInfo = (score) => {
  if (score === 4) return { label: 'Total Compliance', level: 'Excellent', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' };
  if (score === 3) return { label: 'Significant Compliance', level: 'Good', color: 'lime', bgColor: 'bg-lime-100', textColor: 'text-lime-800' };
  if (score === 2) return { label: 'Some Compliance', level: 'Average', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
  if (score === 1) return { label: 'Very Little Compliance', level: 'Poor', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
  if (score === 0) return { label: 'No Compliance', level: 'Very Poor', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' };
  return { label: 'Not Rated', level: 'Not Rated', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
};

const getLevelOfJudgment = (score) => {
  if (score === 4) return 'Total Compliance';
  if (score === 3) return 'Significant Compliance';
  if (score === 2) return 'Some Compliance';
  if (score === 1) return 'Very Little Compliance';
  if (score === 0) return 'No Compliance';
  return 'Not Rated';
};

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
        headerBg: 'bg-teal-50', 
        headerBorder: 'border-teal-200', 
        textColor: 'text-teal-700', 
        barColor: 'bg-teal-500',
        description: 'A place for everything and everything in its place.'
      };
    case '3S - SHINE':
      return { 
        displayName: '3S - SHINE',
        headerBg: 'bg-green-50', 
        headerBorder: 'border-green-200', 
        textColor: 'text-green-700', 
        barColor: 'bg-green-500',
        description: 'Cleaning and looking for ways to keep it clean.'
      };
    case '4S - STANDARDIZE':
      return { 
        displayName: '4S - STANDARDIZE',
        headerBg: 'bg-orange-50', 
        headerBorder: 'border-orange-200', 
        textColor: 'text-orange-700', 
        barColor: 'bg-orange-500',
        description: 'Make standards obvious and maintained.'
      };
    case '5S - SUSTAIN':
      return { 
        displayName: '5S - SUSTAIN',
        headerBg: 'bg-purple-50', 
        headerBorder: 'border-purple-200', 
        textColor: 'text-purple-700', 
        barColor: 'bg-purple-500',
        description: 'Maintain high standards and constantly seek to improve.'
      };
    default:
      return { 
        displayName: sectionName,
        headerBg: 'bg-gray-50', 
        headerBorder: 'border-gray-200', 
        textColor: 'text-gray-700', 
        barColor: 'bg-gray-500',
        description: ''
      };
  }
};

export default function FiveSView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  
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
  
  // Signature image states
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

  // Fetch signature as image URL
  const fetchSignatureAsImageUrl = async (userId, fullName) => {
    try {
      let response;
      if (userId) {
        response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/users/${userId}/signature`, {
          responseType: 'blob',
          withCredentials: true
        });
      } else if (fullName && fullName !== 'Not specified' && fullName !== 'N/A' && fullName !== 'Unknown') {
        const nameParts = fullName.trim().split(' ', 2);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[1] : '';
        response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090
/api/users/signature', {
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
      
      // Fetch auditee signature based on role and status
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

  const handleDownloadPDF = async () => {
    if (!audit || !audit.id) {
      addToast('Audit data not available', 'error');
      return;
    }

    setDownloading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090
';
      const responseId = audit.id;
      
      const endpoint = `${API_URL}/api/fives-audits/${responseId}/pdf`;
      
      const response = await axios({
        method: 'get',
        url: endpoint,
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' },
        withCredentials: true
      });
      
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
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090
';
      
      const response = await axios.put(
        `${API_URL}/api/templates/responses/${audit.id}/approve`,
        {
          signature: signatureToSave,
          comment: auditeeComment || 'No comments provided'
        },
        { withCredentials: true }
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

  const handleReject = async () => {
    console.log('=== REJECT BUTTON CLICKED ===');
    
    if (!auditeeComment.trim()) {
      addToast('Please provide a reason for rejection', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090
';
      
      const response = await axios.put(
        `${API_URL}/api/templates/responses/${audit.id}/reject`,
        { comment: auditeeComment },
        { withCredentials: true }
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

  // Derived values
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
  const canDownloadPDF = true; // Always show PDF button

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-green-600"></div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Audit not found</p>
        <button onClick={() => navigate('/auditor')} className="px-4 py-2 mt-4 text-white bg-green-600 rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 mx-auto max-w-7xl print:p-2" id="audit-report-content">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
  <div className="flex items-center gap-3">
    <BackButton 
      fallbackPath="/lead-auditor" 
      defaultTab="responses" 
      label="Back"
    />
    <div>
      <h1 className="text-xl font-bold text-gray-800">5S Audit Report</h1>
      <p className="text-xs text-gray-500 mt-0.5">Workplace organization audit details and findings</p>
    </div>
  </div>
  {/* Keep the download button and other buttons as they are */}
  <div className="flex gap-2">
    <button 
      onClick={handleDownloadPDF} 
      disabled={downloading}
      className="px-3 py-1.5 bg-green-600 border border-green-600 rounded-lg text-white hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50"
    >
      {downloading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
          Generating...
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" /> Download PDF
        </>
      )}
    </button>
  </div>
</div>

      {/* Approval Status Banner */}
      {isApproved && (
        <div className="p-4 mb-4 text-center text-green-800 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-lg font-semibold">✓ Audit Approved by Auditee</span>
          </div>
          {answers.auditeeComment && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Comment: </span>
              {answers.auditeeComment}
            </div>
          )}
        </div>
      )}

      {isRejected && (
        <div className="p-4 mb-4 text-center text-red-800 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <XCircle className="w-5 h-5" />
            <span className="text-lg font-semibold">✗ Audit Rejected - Corrections Required</span>
          </div>
          {answers.auditeeComment && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Reason: </span>
              {answers.auditeeComment}
            </div>
          )}
        </div>
      )}

      {/* 5S Header Banner */}
      <div className="p-4 mb-4 text-center text-white rounded-xl bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles size={24} />
          <span className="text-xl font-bold">5S AUDIT CHECK SHEET</span>
        </div>
        <p className="text-xs opacity-90">Sort | Set in Order | Shine | Standardize | Sustain</p>
      </div>

      {/* Audit Information - REMOVED Completed By, Auditor, Overall Score, Supervisor */}
      <div className="p-4 mb-4 bg-white border border-gray-200 rounded-xl">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Audit Information</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <FileText className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Document Number</p>
              <p className="text-sm font-medium text-gray-800">{answers.documentNumber || `5S-${audit.id}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <Building className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm font-medium text-gray-800">{answers.department || audit.department || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Auditor (Supervisor)</p>
              <p className="text-sm font-medium text-gray-800">{auditorName || answers.auditorName || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Auditee</p>
              <p className="text-sm font-medium text-gray-800">{auditeeName || answers.auditeeName || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Audit Date</p>
              <p className="text-sm font-medium text-gray-800">{answers.date || formatDate(audit.auditDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <MapPin className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Area / Location</p>
              <p className="text-sm font-medium text-gray-800">{answers.area || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Shift</p>
              <p className="text-sm font-medium text-gray-800">{audit.shift || answers.shift || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <div className="w-4 h-4" />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${getStatusBadge(currentStatus)}`}>
                {currentStatus || 'DRAFT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Scale Legend */}
      <div className="p-3 mb-4 bg-white border border-gray-200 rounded-xl">
        <p className="mb-2 text-sm font-medium text-gray-700">Rating Scale:</p>
        <div className="grid grid-cols-5 gap-2 text-xs text-center">
          <div className="p-1 text-red-800 bg-red-100 rounded">0 = No Compliance</div>
          <div className="p-1 text-orange-800 bg-orange-100 rounded">1 = Very Little Compliance</div>
          <div className="p-1 text-yellow-800 bg-yellow-100 rounded">2 = Some Compliance</div>
          <div className="p-1 rounded bg-lime-100 text-lime-800">3 = Significant Compliance</div>
          <div className="p-1 text-green-800 bg-green-100 rounded">4 = Total Compliance</div>
        </div>
      </div>

      {/* Score Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4">
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-xl font-bold text-gray-800">{totalQuestions}</p>
          <p className="text-xs text-gray-500">Total Questions</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-xl font-bold text-green-600">{ratedCount}</p>
          <p className="text-xs text-gray-500">Rated</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-xl font-bold text-blue-600">{totalScore}</p>
          <p className="text-xs text-gray-500">Total Score</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className={`text-xl font-bold ${getScoreColor(percentage)}`}>{percentage}%</p>
          <p className="text-xs text-gray-500">Percentage</p>
        </div>
      </div>

      {/* 5S Sections Summary */}
      <div className="p-4 mb-4 bg-white border border-gray-200 rounded-xl">
        <h2 className="mb-3 text-base font-semibold text-gray-800">5S Sections Summary</h2>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(sections).map(([sectionName, section]) => {
            const sectionScore = getSectionScore(section.start, section.end);
            const sectionMaxScore = getSectionMaxScore(section.start, section.end);
            const sectionPercentage = Math.round((sectionScore / sectionMaxScore) * 100);
            const styles = getSectionStyles(sectionName);
            return (
              <div key={sectionName} className="p-3 text-center rounded-lg bg-gray-50">
                <div className={`text-xs font-medium ${styles.textColor}`}>{styles.displayName}</div>
                <div className="text-2xl font-bold text-gray-800">{sectionScore}</div>
                <div className="text-[10px] text-gray-500">/ {sectionMaxScore}</div>
                <div className="w-full h-1.5 mt-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${styles.barColor}`} style={{ width: `${sectionPercentage}%` }} />
                </div>
                <div className="mt-1 text-xs text-gray-600">{sectionPercentage}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Findings Table */}
      <div className="p-4 mb-4 overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-green-600" />
          <h2 className="text-base font-semibold text-gray-800">Audit Findings</h2>
        </div>
        
        {Object.entries(sections).map(([sectionName, section]) => {
          const sectionScore = getSectionScore(section.start, section.end);
          const sectionMaxScore = getSectionMaxScore(section.start, section.end);
          const sectionPercentage = Math.round((sectionScore / sectionMaxScore) * 100);
          const styles = getSectionStyles(sectionName);
          
          return (
            <div key={sectionName} className="mb-6 overflow-hidden border rounded-lg">
              <div className={`p-3 ${styles.headerBg} border-b ${styles.headerBorder}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${styles.textColor}`}>{styles.displayName}</span>
                      <div className="relative group">
                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        <div className="absolute left-0 z-10 hidden w-64 p-2 mb-1 text-xs text-white bg-gray-800 rounded-lg group-hover:block bottom-full">
                          {styles.description}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Max marks: {sectionMaxScore} | Score: {sectionScore}/{sectionMaxScore} ({sectionPercentage}%)
                    </p>
                  </div>
                  <div className={`text-right text-xs font-medium ${styles.textColor}`}>
                    Level of Judgment: {sectionPercentage >= 80 ? 'Excellent' : sectionPercentage >= 60 ? 'Good' : sectionPercentage >= 40 ? 'Average' : 'Poor'}
                  </div>
                </div>
              </div>
              
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-12 px-3 py-2 text-xs font-medium text-center text-gray-700">S.No</th>
                    <th className="min-w-[350px] px-3 py-2 text-xs font-medium text-left text-gray-700">Audit Checkpoint</th>
                    <th className="w-20 px-3 py-2 text-xs font-medium text-center text-gray-700">Max marks</th>
                    <th className="w-32 px-3 py-2 text-xs font-medium text-center text-gray-700">Level of Judgment</th>
                    <th className="min-w-[200px] px-3 py-2 text-xs font-medium text-left text-gray-700">Comments / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {section.questions.map((q) => {
                    const score = scores[q.slNo];
                    const comment = comments[q.slNo];
                    const scoreInfo = getScoreInfo(score);
                    const levelOfJudgment = getLevelOfJudgment(score);
                    
                    return (
                      <tr key={q.slNo} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-center text-gray-600">{q.slNo}</td>
                        <td className="px-3 py-2 text-sm text-gray-800">{q.checkpoint}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">4</td>
                        <td className="px-3 py-2 text-center">
                          {score !== undefined && score !== null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center justify-center w-10 h-10 text-sm font-bold rounded-full ${scoreInfo.bgColor} ${scoreInfo.textColor}`}>
                                {score}
                              </span>
                              <span className="text-[10px] text-gray-500">{levelOfJudgment}</span>
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">Not Rated</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{comment || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="2" className="px-3 py-2 text-sm font-medium text-right text-gray-700">Section Total:</td>
                    <td className="px-3 py-2 text-sm font-bold text-center text-gray-800">{sectionMaxScore}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold text-gray-800">{sectionScore}</span>
                      <span className="text-xs text-gray-500">/{sectionMaxScore}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-left text-gray-600">
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
      <div className="p-3 mb-4 text-center text-green-800 bg-green-100 border border-green-300 rounded-lg">
        <div className="flex items-center justify-center gap-2">
          {percentage >= 90 && <Star size={18} className="text-green-600" />}
          {percentage >= 75 && percentage < 90 && <ThumbsUp size={18} className="text-lime-600" />}
          {percentage >= 60 && percentage < 75 && <AlertCircle size={18} className="text-yellow-600" />}
          {percentage < 60 && <AlertCircle size={18} className="text-red-600" />}
          <span className="font-semibold">
            {percentage >= 90 ? 'Excellent - World Class 5S!' : 
             percentage >= 75 ? 'Good - Above Average' : 
             percentage >= 60 ? 'Needs Improvement' : 
             'Poor - Immediate Action Required'}
          </span>
        </div>
      </div>

      {/* Signature Section - Like IATF View */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl print:break-inside-avoid">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Signatures & Comments</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          
          {/* AUDITOR SIGNATURE SECTION */}
          <div className="p-3 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-500">Auditor Signature</p>
            <div className="mt-2">
              {loadingSignatures ? (
                <div className="flex justify-center p-2">
                  <div className="w-5 h-5 border-2 border-green-500 rounded-full animate-spin border-t-transparent"></div>
                </div>
              ) : auditorSignatureUrl ? (
                <img 
                  src={auditorSignatureUrl} 
                  alt="Auditor Signature" 
                  className="object-contain p-2 border rounded max-h-20 bg-gray-50"
                />
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <AlertTriangle size={16} />
                  <span className="text-sm">No signature uploaded</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">Name: {auditorName}</p>
            <p className="text-xs text-gray-500">
              Date: {auditorSignedAt ? formatDateTime(auditorSignedAt) : (answers.date || formatDate(audit.auditDate) || '-')}
            </p>
            {answers.auditorComment && (
              <div className="p-2 mt-2 text-xs text-gray-600 rounded bg-gray-50">
                <span className="font-medium">Comment:</span> {answers.auditorComment}
              </div>
            )}
          </div>
          
          {/* AUDITEE SIGNATURE SECTION */}
          <div className="p-3 border border-gray-200 rounded-lg">
            {showAuditeeActions ? (
              // Auditee Approval Mode
              <>
                <p className="text-xs font-medium text-gray-500">Your Electronic Signature</p>
                
                {loadingSignatures ? (
                  <div className="flex justify-center p-2">
                    <div className="w-5 h-5 border-2 border-green-500 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                ) : auditeeSignatureUrl ? (
                  <div className="mt-2">
                    <img 
                      src={auditeeSignatureUrl} 
                      alt="Auditee Signature" 
                      className="object-contain p-2 border rounded max-h-20 bg-gray-50"
                    />
                    <p className="mt-1 text-xs text-green-600">✓ Signature loaded from your profile</p>
                    <p className="text-xs text-gray-500">Name: {auditeeName}</p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-gray-400">
                      <AlertTriangle size={16} />
                      <span className="text-sm">No signature uploaded in profile</span>
                    </div>
                    <input
                      type="text"
                      value={auditeeSignature}
                      onChange={(e) => setAuditeeSignature(e.target.value)}
                      placeholder="Type your full name as signature (fallback)"
                      className="w-full px-3 py-2 mt-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
                
                <p className="mt-3 text-xs font-medium text-gray-500">Comments / Remarks</p>
                <textarea
                  value={auditeeComment}
                  onChange={(e) => setAuditeeComment(e.target.value)}
                  placeholder="Enter your comments (required for rejection)"
                  rows="3"
                  className="w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleApprove}
                    disabled={submitting || (!auditeeSignatureUrl && !auditeeSignature.trim())}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {submitting ? 'Processing...' : 'Approve & Sign'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </>
            ) : (
              // View Mode
              <>
                <p className="text-xs font-medium text-gray-500">Auditee Signature</p>
                <div className="mt-2">
                  {loadingSignatures ? (
                    <div className="flex justify-center p-2">
                      <div className="w-5 h-5 border-2 border-green-500 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                  ) : (isApproved || isRejected) ? (
                    auditeeSignatureUrl ? (
                      <img 
                        src={auditeeSignatureUrl} 
                        alt="Auditee Signature" 
                        className="object-contain p-2 border rounded max-h-20 bg-gray-50"
                      />
                    ) : auditeeSignature ? (
                      <p className="p-2 text-sm font-medium text-gray-800 border rounded bg-gray-50">
                        {auditeeSignature}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <AlertTriangle size={16} />
                        <span className="text-sm">No signature available</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg bg-amber-50 border-amber-200">
                      <div className="text-center">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                        <p className="text-sm font-medium text-amber-700">Waiting for Approval</p>
                        <p className="text-xs text-amber-600">Signature will appear after auditee approval</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">Name: {auditeeName}</p>
                <p className="text-xs text-gray-500">
                  Date: {auditeeSignedAt ? formatDateTime(auditeeSignedAt) : ((isApproved || isRejected) ? formatDateTime(audit.updatedAt) : '-')}
                </p>
                
                {(answers.auditeeComment || auditeeComment) && (isApproved || isRejected) && (
                  <div className="p-2 mt-2 text-xs text-gray-600 rounded bg-gray-50">
                    <span className="font-medium">Comment:</span> {answers.auditeeComment || auditeeComment}
                  </div>
                )}
                
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <div className="mt-1">
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded">
                        <CheckCircle size={12} /> Approved
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-100 rounded">
                        <XCircle size={12} /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded">
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
      <div className="pb-4 mt-6 text-xs text-center text-gray-500">
        <p>5S Workplace Organization Audit Report | Generated on {formatDate(new Date().toISOString())}</p>
        <p className="mt-1">This is an electronic document and does not require a physical signature</p>
      </div>
    </div>
  );
}