// src/form/view/IATFInternalView.jsx - COMPLETE FIXED VERSION

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
  XCircle, Printer, Layers, AlertTriangle
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

// Helper function to safely parse JSON that might contain errors
const safeParseQuestions = (questionsData) => {
  if (!questionsData) return [];
  
  // If already an object/array, return it
  if (typeof questionsData === 'object' && questionsData !== null) {
    return Array.isArray(questionsData) ? questionsData : [];
  }
  
  // If it's a string, try to parse it
  if (typeof questionsData === 'string') {
    let cleanJson = questionsData;
    
    // Remove BOM character if present
    if (cleanJson.charCodeAt(0) === 0xFEFF) {
      cleanJson = cleanJson.substring(1);
    }
    
    // Fix common JSON issues
    cleanJson = cleanJson.replace(/\\n/g, '\\\\n');
    cleanJson = cleanJson.replace(/&/g, '&amp;');
    
    // Fix unescaped double quotes inside string values
    cleanJson = cleanJson.replace(/:\s*"([^"]*?)"/g, function(match, content) {
      const escapedContent = content.replace(/"/g, '\\"');
      return `: "${escapedContent}"`;
    });
    
    // Fix trailing commas
    cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing quotes around property names
    cleanJson = cleanJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('JSON parse error:', e);
      console.error('Problem JSON snippet:', cleanJson.substring(0, 500));
      return [];
    }
  }
  
  return [];
};

// Helper function to format "What to look for" as numbered list
const formatWhatToLookForAsNumberedList = (text) => {
  if (!text || text === 'No documents specified') return '-';
  
  let items = [];
  
  if (text.includes('\n')) {
    items = text.split('\n');
  } else if (text.includes(',')) {
    items = text.split(',');
  } else {
    items = [text];
  }
  
  const cleanItems = items
    .map(item => item.replace(/^\d+\.\s*/, '').replace(/[•●○▪▫-]\s*/, '').trim())
    .filter(item => item.length > 0);
  
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
  
  // Signature image states
  const [auditorSignatureUrl, setAuditorSignatureUrl] = useState(null);
  const [auditeeSignatureUrl, setAuditeeSignatureUrl] = useState(null);
  const [loadingSignatures, setLoadingSignatures] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAuditDetails();
    }
    return () => {
      // Cleanup object URLs
      if (auditorSignatureUrl && auditorSignatureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(auditorSignatureUrl);
      }
      if (auditeeSignatureUrl && auditeeSignatureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(auditeeSignatureUrl);
      }
    };
  }, [id]);

  // Fetch signature as image URL (blob to object URL)
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

  // Get signature from base64 string
  const getSignatureFromBase64 = (base64String) => {
    if (base64String && (base64String.startsWith('data:image') || base64String.includes('base64'))) {
      return base64String;
    }
    return null;
  };

  const fetchAuditDetails = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING IATF AUDIT VIEW ===');
      console.log('Audit ID:', id);
      console.log('Current User:', user?.email, 'Role:', user?.role);
      
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
      
      // Set auditee signature, comment and signed date
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
      
      // Set auditor comment and signed date
      if (parsedAnswers.auditorComment) {
        setAuditorComment(parsedAnswers.auditorComment);
      }
      if (parsedAnswers.auditorSignedAt) {
        setAuditorSignedAt(parsedAnswers.auditorSignedAt);
      }
      
      // Get department name and process name
      const deptName = parsedAnswers.departmentName || auditData.department || '';
      const procName = parsedAnswers.processName || auditData.checkSheet?.processName || '';
      setDepartmentName(deptName);
      setProcessName(procName);
      
      // Get auditor name
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
      
      // Fetch auditor signature image (always)
      const auditorSigUrl = await fetchSignatureAsImageUrl(auditData.auditorId, auditor);
      if (auditorSigUrl) {
        setAuditorSignatureUrl(auditorSigUrl);
        console.log('✅ Auditor signature fetched');
      } else {
        const auditorSigBase64 = parsedAnswers.auditorSignature;
        if (auditorSigBase64 && auditorSigBase64.startsWith('data:image')) {
          setAuditorSignatureUrl(auditorSigBase64);
          console.log('✅ Auditor signature from answers');
        } else {
          console.log('⚠️ No auditor signature found');
        }
      }
      
      // Determine user role for signature fetching
      const currentUserRole = user?.role?.toLowerCase?.() || '';
      const isAuditorUser = currentUserRole === 'auditor' || auditData.auditorId === user?.id;
      const isAuditeeUser = currentUserRole === 'auditee' || auditData.auditeeId === user?.id;
      
      console.log('User role check:', { currentUserRole, isAuditorUser, isAuditeeUser, auditStatus: auditData.status });
      
      // Fetch auditee signature based on user role and audit status
      if (isAuditeeUser) {
        // Auditee: Always fetch their own signature
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) {
          setAuditeeSignatureUrl(auditeeSigUrl);
          console.log('✅ Auditee signature fetched for auditee');
        } else {
          console.log('⚠️ No auditee signature found in profile');
        }
      } else if (isAuditorUser && auditData.status === 'APPROVED') {
        // Auditor: Only fetch signature when approved
        const auditeeSigUrl = await fetchSignatureAsImageUrl(auditData.auditeeId, auditee);
        if (auditeeSigUrl) {
          setAuditeeSignatureUrl(auditeeSigUrl);
          console.log('✅ Auditee signature fetched for auditor (approved status)');
        }
      } else if (isAuditorUser) {
        console.log('⏳ Auditor viewing - waiting for approval, signature hidden');
        setAuditeeSignatureUrl(null);
      }
      
      setLoadingSignatures(false);
      
      // Fetch questions
      const checkSheetId = auditData.checkSheet?.id;
      
      if (checkSheetId) {
        try {
          console.log(`✅ Fetching check sheet by ID: ${checkSheetId}`);
          const sheetRes = await axios.get(
            `https://internalaudit.hub.swajyot.co.in:8090
/api/templates/${checkSheetId}`,
            { withCredentials: true }
          );
          
          const sheet = sheetRes.data;
          console.log('✅ Found check sheet:', sheet.name);
          
          if (sheet.questions) {
            // ✅ Using safeParseQuestions here
            let parsedQuestions = safeParseQuestions(sheet.questions);
            
            const formattedQuestions = parsedQuestions.map((q, idx) => ({
              slNo: q.sNo || q.slNo || (idx + 1),
              clause: q.clauseNo || q.clause || '',
              checkpoint: q.displayLabel || q.checkpoint,
              whatToLookFor: q.documentsVerified || q.whatToLookFor || q.consideration || 'No documents specified',
              fieldKey: q.fieldKey,
              fieldType: q.fieldType
            }));
            
            setQuestions(formattedQuestions);
          }
        } catch (idError) {
          console.error('Error fetching by ID:', idError);
          await fetchQuestionsByDepartment(deptName, procName);
        }
      } else if (deptName) {
        await fetchQuestionsByDepartment(deptName, procName);
      }
      
    } catch (error) {
      console.error('Error fetching audit details:', error);
      addToast('Failed to load audit details: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to fetch questions by department
  const fetchQuestionsByDepartment = async (department, process) => {
    if (!department) return;
    
    console.log(`✅ Fetching IATF check sheets for department: ${department}`);
    try {
      const checkSheetRes = await axios.get(
        `https://internalaudit.hub.swajyot.co.in:8090
/api/templates/iatf/by-department/${encodeURIComponent(department)}`,
        { withCredentials: true }
      );
      
      const sheets = checkSheetRes.data;
      console.log('✅ Found sheets:', sheets);
      
      if (sheets && sheets.length > 0) {
        let selectedSheet = sheets[0];
        
        if (process) {
          const matchingSheet = sheets.find(s => s.processName === process);
          if (matchingSheet) {
            selectedSheet = matchingSheet;
          }
        }
        
        console.log('✅ Selected sheet:', selectedSheet);
        
        const sheetDetailsRes = await axios.get(
          `https://internalaudit.hub.swajyot.co.in:8090
/api/templates/${selectedSheet.id}`,
          { withCredentials: true }
        );
        
        const sheet = sheetDetailsRes.data;
        
        if (sheet.questions) {
          // ✅ Using safeParseQuestions here
          let parsedQuestions = safeParseQuestions(sheet.questions);
          
          const formattedQuestions = parsedQuestions.map((q, idx) => ({
            slNo: q.sNo || q.slNo || (idx + 1),
            clause: q.clauseNo || q.clause || '',
            checkpoint: q.displayLabel || q.checkpoint,
            whatToLookFor: q.documentsVerified || q.whatToLookFor || q.consideration || 'No documents specified',
            fieldKey: q.fieldKey,
            fieldType: q.fieldType
          }));
          
          setQuestions(formattedQuestions);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching by department:', error);
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

  // ===== PDF DOWNLOAD HANDLER =====
  const handleDownloadPDF = async () => {
    if (!audit || !audit.id) {
      addToast('Audit data not available', 'error');
      return;
    }

    setDownloading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090';
      const responseId = audit.id;
      
      const endpoint = `${API_URL}/api/iatf-audits/${responseId}/pdf`;
      
      console.log('Downloading PDF from:', endpoint);
      
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
      link.setAttribute('download', `IATF_Audit_Report_${responseId}.pdf`);
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

  // ===== APPROVE BY AUDITEE =====
  const handleApprove = async () => {
    console.log('=== APPROVE BUTTON CLICKED ===');
    
    // Use the fetched signature image if available, otherwise use typed signature
    let signatureToSave = auditeeSignature;
    
    // If there's a signature image URL (from profile), convert it to base64 or use as is
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
    
    if (!signatureToSave || !signatureToSave.trim()) {
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
  
  // ===== REJECT BY AUDITEE =====
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

  // Get responses and observations
  const responses = answers.responses || {};
  const observations = answers.observations || {};
  
  const totalQuestions = questions.length;
  let compliantCount = 0;
  let minorNCCount = 0;
  let majorNCCount = 0;
  
  questions.forEach((q, idx) => {
    const questionKey = String(idx + 1);
    const response = responses[questionKey] || responses[idx + 1] || responses[q.fieldKey];
    if (response === 'COMPLIANT') compliantCount++;
    else if (response === 'MINOR_NC') minorNCCount++;
    else if (response === 'MAJOR_NC') majorNCCount++;
  });
  
  const percentage =  answers.score || 0;
console.log('Raw percentage value:', percentage);
console.log('Type:', typeof percentage);
// If for some reason the score is missing, calculate it (fallback only)
const finalPercentage = percentage > 0 ? percentage : (totalQuestions > 0 ? Math.round((compliantCount / totalQuestions) * 100) : 0);

  // ===== DERIVED VALUES =====
  const currentStatus = audit?.status || 'SUBMITTED';
  const statusUpper = currentStatus?.toUpperCase?.() || '';
  const isDraft = statusUpper === 'DRAFT';
  const isSubmitted = statusUpper === 'SUBMITTED';
  const isApproved = statusUpper === 'APPROVED';
  const isRejected = statusUpper === 'REJECTED';

  const currentUserRole = user?.role?.toLowerCase?.() || '';
  const isAuditor = currentUserRole === 'auditor' || audit?.auditorId === user?.id;
  const isAuditee = currentUserRole === 'auditee' || audit?.auditeeId === user?.id;
  
  console.log('Role determination:', { 
    userRole: currentUserRole, 
    auditAuditorId: audit?.auditorId, 
    auditAuditeeId: audit?.auditeeId,
    userId: user?.id,
    isAuditor, 
    isAuditee,
    auditStatus: currentStatus,
    isDraft,
    isSubmitted 
  });

  // Show approve/reject buttons for auditee when status is DRAFT or SUBMITTED (not already approved/rejected)
  const showAuditeeActions = isAuditee && !isApproved && !isRejected;
  
  console.log('showAuditeeActions:', showAuditeeActions);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-purple-600"></div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Audit not found</p>
        <button onClick={() => navigate('/auditor')} className="px-4 py-2 mt-4 text-white bg-purple-600 rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 mx-auto max-w-7xl print:p-2">
      {/* Header with Action Buttons */}
     <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
  <div className="flex items-center gap-3">
    <BackButton 
      fallbackPath="/lead-auditor" 
      defaultTab="responses" 
      label="Back"
    />
    <div>
      <h1 className="text-xl font-bold text-gray-800">
        IATF Internal Audit Report
      </h1>
      <p className="text-xs text-gray-500 mt-0.5">View audit details and findings</p>
    </div>
  </div>
  
  <div className="flex gap-2">
    <button 
      onClick={handleDownloadPDF} 
      disabled={downloading}
      className="px-3 py-1.5 bg-purple-600 border border-purple-600 rounded-lg text-white hover:bg-purple-700 flex items-center gap-1.5 disabled:opacity-50"
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
    
    {isAuditee && isSubmitted && (
      <span className="self-center ml-2 text-xs text-amber-600">
        ⚠️ Please approve or reject this audit
      </span>
    )}
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

      {/* IATF Header Banner */}
      <div className="p-4 mb-4 text-center text-white rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="flex items-center justify-center gap-2 mb-1">
          <FileText size={24} />
          <span className="text-xl font-bold">IATF 16949 INTERNAL AUDIT CHECK SHEET</span>
        </div>
        <p className="text-xs opacity-90">IATF 16949:2016 | Process Audit Compliance</p>
        {(departmentName || processName) && (
          <div className="pt-2 mt-2 border-t border-purple-400/50">
            <div className="flex items-center justify-center gap-3 text-sm">
              {departmentName && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20">
                  <Building size={12} />
                  Dept: {departmentName}
                </span>
              )}
              {processName && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20">
                  <Layers size={12} />
                  Process: {processName}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audit Information */}
      <div className="p-4 mb-4 bg-white border border-gray-200 rounded-xl">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Audit Information</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <FileText className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Document Number</p>
              <p className="text-sm font-medium text-gray-800">{answers.documentNumber || `IATF-${audit.id}`}</p>
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
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Auditor</p>
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
            <MapPin className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-800">{answers.location || '-'}</p>
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
            <Building className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm font-medium text-gray-800">{departmentName || answers.departmentName || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <Layers className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Process</p>
              <p className="text-sm font-medium text-gray-800">{processName || answers.processName || '-'}</p>
            </div>
          </div>
          {percentage > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <Award className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Score</p>
                <p className="text-sm font-semibold text-purple-600">{percentage}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-5">
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl font-bold text-gray-800">{totalQuestions}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl font-bold text-green-600">{compliantCount}</p>
          <p className="text-xs text-gray-500">O (Compliant)</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl font-bold text-yellow-600">{minorNCCount}</p>
          <p className="text-xs text-gray-500">Mi (Minor)</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl font-bold text-red-600">{majorNCCount}</p>
          <p className="text-xs text-gray-500">Ma (Major)</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl font-bold text-purple-600">{percentage}%</p>
          <p className="text-xs text-gray-500">Score</p>
        </div>
      </div>

      {/* Audit Findings Table */}
      <div className="p-4 mb-4 overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-purple-600" />
          <h2 className="text-base font-semibold text-gray-800">Audit Findings</h2>
        </div>
        <div className="overflow-x-auto">

          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-12 px-3 py-2 text-xs font-semibold text-center text-gray-700 border border-gray-300">S.No.</th>
                <th className="w-24 px-3 py-2 text-xs font-semibold text-center text-gray-700 border border-gray-300">Clause</th>
                <th className="min-w-[280px] px-3 py-2 text-xs font-semibold text-left text-gray-700 border border-gray-300">Check Point</th>
                <th className="min-w-[250px] px-3 py-2 text-xs font-semibold text-left text-gray-700 border border-gray-300">What to look for</th>
                <th className="min-w-[200px] px-3 py-2 text-xs font-semibold text-left text-gray-700 border border-gray-300">Observation</th>
                <th className="px-3 py-2 text-xs font-semibold text-center text-gray-700 border border-gray-300 w-14">Ma</th>
                <th className="px-3 py-2 text-xs font-semibold text-center text-gray-700 border border-gray-300 w-14">Mi</th>
                <th className="px-3 py-2 text-xs font-semibold text-center text-gray-700 border border-gray-300 w-14">O</th>
                <th className="w-24 px-3 py-2 text-xs font-semibold text-center text-gray-700 border border-gray-300">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {questions.length > 0 ? questions.map((q, idx) => {
                const questionKey = String(idx + 1);
                let response = responses[questionKey] || responses[idx + 1] || responses[q.fieldKey];
                const observation = observations[questionKey] || observations[idx + 1] || '';
                const formattedWhatToLookFor = formatWhatToLookForAsNumberedList(q.whatToLookFor);
                
                let ma = '', mi = '', o = '', complianceText = '', complianceColor = '';
                let rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                
                if (response === 'MAJOR_NC') {
                  ma = '✓';
                  complianceText = 'No';
                  complianceColor = 'bg-red-100 text-red-700';
                } else if (response === 'MINOR_NC') {
                  mi = '✓';
                  complianceText = 'No';
                  complianceColor = 'bg-yellow-100 text-yellow-700';
                } else if (response === 'COMPLIANT') {
                  o = '✓';
                  complianceText = 'Yes';
                  complianceColor = 'bg-green-100 text-green-700';
                } else {
                  complianceText = response || 'Pending';
                  complianceColor = 'bg-gray-100 text-gray-700';
                }
                
                return (
                  <tr key={idx} className={`${rowBg} hover:bg-gray-100`}>
                    <td className="px-3 py-2 text-sm text-center text-gray-600 border border-gray-200">{q.slNo || idx + 1}</td>
                    <td className="px-3 py-2 text-sm text-center text-gray-600 border border-gray-200">{q.clause || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-800 align-top border border-gray-200">{q.checkpoint}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap align-top border border-gray-200 bg-gray-50">{formattedWhatToLookFor}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 align-top border border-gray-200">{observation || '-'}</td>
                    <td className="px-3 py-2 text-sm font-bold text-center text-red-600 align-top border border-gray-200">{ma}</td>
                    <td className="px-3 py-2 text-sm font-bold text-center text-yellow-600 align-top border border-gray-200">{mi}</td>
                    <td className="px-3 py-2 text-sm font-bold text-center text-green-600 align-top border border-gray-200">{o}</td>
                    <td className="px-3 py-2 text-center align-top border border-gray-200"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${complianceColor}`}>{complianceText}</span></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="9" className="px-3 py-8 text-center text-gray-500">No IATF questions loaded for this audit</td></tr>
              )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Signature Section */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl print:break-inside-avoid">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Signatures & Comments</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          
          {/* AUDITOR SIGNATURE SECTION */}
          <div className="p-3 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-500">Auditor Signature</p>
            <div className="mt-2">
              {loadingSignatures ? (
                <div className="flex justify-center p-2">
                  <div className="w-5 h-5 border-2 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
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
            {auditorComment && (
              <div className="p-2 mt-2 text-xs text-gray-600 rounded bg-gray-50">
                <span className="font-medium">Comment:</span> {auditorComment}
              </div>
            )}
          </div>
          
          {/* AUDITEE SIGNATURE SECTION */}
          <div className="p-3 border border-gray-200 rounded-lg">
            {showAuditeeActions ? (
              // Auditee Approval Mode
              <>
                <p className="text-xs font-medium text-gray-500">Your Electronic Signature</p>
                
                {!auditeeSignatureUrl && !auditeeSignature ? (
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
                      className="w-full px-3 py-2 mt-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ) : (
                  <div className="mt-2">
                    {auditeeSignatureUrl && (
                      <img 
                        src={auditeeSignatureUrl} 
                        alt="Auditee Signature" 
                        className="object-contain p-2 border rounded max-h-20 bg-gray-50"
                      />
                    )}
                    <p className="mt-1 text-xs text-green-600">✓ Signature loaded from your profile</p>
                    <p className="text-xs text-gray-500">Name: {auditeeName}</p>
                  </div>
                )}
                
                <p className="mt-3 text-xs font-medium text-gray-500">Comments / Remarks</p>
                <textarea
                  value={auditeeComment}
                  onChange={(e) => setAuditeeComment(e.target.value)}
                  placeholder="Enter your comments (required for rejection)"
                  rows="3"
                  className="w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
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
                  {(isApproved || isRejected) ? (
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
        <p>IATF 16949 Internal Audit Report | Generated on {formatDate(new Date().toISOString())}</p>
        <p className="mt-1">This is an electronic document and does not require a physical signature</p>
      </div>
    </div>
  );
}