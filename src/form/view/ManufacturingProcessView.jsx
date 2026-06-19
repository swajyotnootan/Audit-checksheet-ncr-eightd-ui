// src/form/view/ManufacturingProcessView.jsx
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

export default function ManufacturingProcessView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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
      console.log('=== FETCHING MANUFACTURING AUDIT VIEW ===');
      console.log('Audit ID:', id);
      
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
      
      // Set department name
      setDepartmentName(parsedAnswers.department || auditData.department || '-');
      
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
      
      // Get auditor name
      if (auditData.auditorId) {
        try {
          const auditor = await userAPI.getUserById(auditData.auditorId);
          setAuditorName(auditor?.name || `${auditor?.firstName} ${auditor?.lastName}`);
        } catch (e) {
          setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown');
        }
      } else {
        setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown');
      }
      
      const auditee = auditData.auditeeName || parsedAnswers.auditeeName || 'Not specified';
      setAuditeeName(auditee);
      
      // Fetch signatures
      setLoadingSignatures(true);
      
      // Fetch auditor signature
      const auditorSigUrl = await fetchSignatureAsImageUrl(auditData.auditorId, auditorName);
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
      
      // Get questions from saved questionsData first
      if (parsedAnswers.questionsData && parsedAnswers.questionsData.length > 0) {
        console.log('Using questions from saved audit data');
        setQuestions(parsedAnswers.questionsData);
      } else {
        // Fallback: Fetch questions from check sheet
        try {
          const checkSheetRes = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/templates/${MANUFACTURING_CHECK_SHEET_ID}`);
          const sheet = checkSheetRes.data;
          
          if (sheet.questions) {
            let parsedQuestions = [];
            try {
              parsedQuestions = typeof sheet.questions === 'string' 
                ? JSON.parse(sheet.questions) 
                : sheet.questions;
              
              const formattedQuestions = parsedQuestions.map((q, idx) => ({
                slNo: q.sNo || q.slNo || (idx + 1),
                checkpoint: q.displayLabel || q.checkpoint,
                consideration: q.consideration || q.whatToLookFor || q.documentsVerified || 'No documents specified',
                clause: q.clauseNo || q.category || q.clause || '',
              }));
              
              setQuestions(formattedQuestions);
            } catch (e) {
              console.error('Error parsing questions:', e);
            }
          }
        } catch (error) {
          console.error('Error fetching check sheet:', error);
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
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ===== PDF DOWNLOAD HANDLER =====
  const handleDownloadPDF = async () => {
    if (!audit || !audit.id) {
      addToast('Audit data not available', 'error');
      return;
    }

    setDownloading(true);
    try {
      console.log('=== DOWNLOADING MANUFACTURING PROCESS AUDIT PDF ===');
      console.log('Audit ID:', audit.id);
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090
';
      const responseId = audit.id;
      
      const pdfUrl = `${API_URL}/api/manufacturing-audits/${responseId}/pdf`;
      console.log('Downloading from:', pdfUrl);
      
      const response = await axios({
        method: 'get',
        url: pdfUrl,
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' },
        withCredentials: true
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Manufacturing_Audit_Report_${responseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      addToast('PDF downloaded successfully', 'success');
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      if (error.response) {
        if (error.response.data instanceof Blob) {
          const text = await error.response.data.text();
          addToast(`Server error: ${text.substring(0, 100)}`, 'error');
        } else {
          addToast(`Error ${error.response.status}: ${error.message}`, 'error');
        }
      } else if (error.request) {
        addToast('No response from server. Please check if backend is running.', 'error');
      } else {
        addToast(`Error: ${error.message}`, 'error');
      }
    } finally {
      setDownloading(false);
    }
  };

  

  // ===== APPROVE BY AUDITEE (with signature image support) =====
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
        await fetchAuditDetails(); // Refresh data
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
        await fetchAuditDetails(); // Refresh data
      }
      
    } catch (error) {
      console.error('Error rejecting audit:', error);
      addToast(`Failed to reject: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== DERIVED VALUES =====
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

  // Show approve/reject buttons only for auditee when status is SUBMITTED
  const showAuditeeActions = isAuditee && isSubmitted;
  
  // PDF button shows for everyone
  const canDownloadPDF = true;

  // Get responses and observations from answers
  const responses = answers.responses || {};
  const observations = answers.observations || {};
  
  const totalQuestions = questions.length;
  const compliantCount = Object.values(responses).filter(r => r === 'COMPLIANT').length;
  const minorNCCount = Object.values(responses).filter(r => r === 'MINOR_NC').length;
  const majorNCCount = Object.values(responses).filter(r => r === 'MAJOR_NC').length;

  const getStatusBadge = (status) => {
    const badges = {
      'DRAFT': 'bg-gray-100 text-gray-700',
      'IN_PROGRESS': 'bg-blue-100 text-blue-700',
      'SUBMITTED': 'bg-purple-100 text-purple-700',
      'APPROVED': 'bg-green-100 text-green-700',
      'REJECTED': 'bg-red-100 text-red-700',
      'CLOSED': 'bg-emerald-100 text-emerald-700',
    };
    return badges[status?.toUpperCase()] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    if (status === 'COMPLIANT') return <FiCheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'MINOR_NC') return <FiXCircle className="w-4 h-4 text-amber-600" />;
    if (status === 'MAJOR_NC') return <FiXCircle className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getStatusClass = (status) => {
    if (status === 'COMPLIANT') return 'bg-green-100 text-green-700';
    if (status === 'MINOR_NC') return 'bg-amber-100 text-amber-700';
    if (status === 'MAJOR_NC') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    if (status === 'COMPLIANT') return 'Compliant';
    if (status === 'MINOR_NC') return 'Minor';
    if (status === 'MAJOR_NC') return 'Major';
    return status || 'Not Rated';
  };

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
        <button onClick={() => navigate(-1)} className="px-4 py-2 mt-4 text-white bg-purple-600 rounded-lg hover:bg-purple-700">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 mx-auto max-w-7xl">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between gap-3 mb-4">
  <div className="flex items-center gap-3">
    <BackButton 
      fallbackPath="/lead-auditor" 
      defaultTab="responses" 
      label="Back"
    />
    <div>
      <h1 className="text-xl font-bold text-gray-800">Manufacturing Process Audit</h1>
      <p className="text-xs text-gray-500 mt-0.5">View audit details and findings</p>
    </div>
  </div>
  
  {/* Action Buttons */}
  <div className="flex gap-2">
    {/* PDF Download Button */}
    <button 
      onClick={handleDownloadPDF} 
      disabled={downloading}
      className="px-3 py-1.5 bg-purple-600 border border-purple-600 rounded-lg text-white hover:bg-purple-700 flex items-center gap-1.5 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {downloading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
          Generating...
        </>
      ) : (
        <>
          <FiDownload className="w-3.5 h-3.5" /> Download PDF
        </>
      )}
    </button>
  </div>
</div>
      {/* Approval Status Banner - APPROVED */}
      {isApproved && (
        <div className="p-4 mb-4 text-center text-green-800 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <FiCheckCircle className="w-5 h-5" />
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

      {/* Approval Status Banner - REJECTED */}
      {isRejected && (
        <div className="p-4 mb-4 text-center text-red-800 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <FiXCircle className="w-5 h-5" />
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

      {/* Manufacturing Process Header Banner */}
      <div className="p-4 mb-4 text-center text-white rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="flex items-center justify-center gap-2 mb-1">
          <FiFileText size={24} />
          <span className="text-xl font-bold">MANUFACTURING PROCESS AUDIT CHECK SHEET</span>
        </div>
        <p className="text-xs opacity-90">IATF 16949:2016 | Process Audit Compliance</p>
      </div>

      {/* Document Control Information */}
      <div className="p-4 mb-4 bg-white border border-gray-200 shadow-sm rounded-xl">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Document Control Information</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <div className="p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-1">
              <FiHash className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">Doc No.</p>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{answers.documentNumber || '-'}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-1">
              <FiCalendar className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">W.e.f. (Date)</p>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{answers.wefDate || '-'}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-1">
              <FiHash className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">Rev No.</p>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{answers.revNo || '00'}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-1">
              <FiCalendar className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">Rev Date</p>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{answers.revDate || '-'}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-1">
              <FiCalendar className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">Issue Date</p>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{answers.issueDate || '-'}</p>
          </div>
        </div>
      </div>

      {/* Audit Information - NEW SEQUENCE */}
      <div className="p-4 mb-4 bg-white border border-gray-200 shadow-sm rounded-xl">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Audit Information</h2>
        <div className="space-y-3">
          {/* Row 1: Department, Part Number, Machine */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiSettings className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Department Name</p>
                <p className="text-sm font-medium text-gray-800">{departmentName || answers.department || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiPackage className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Part Name & Number</p>
                <p className="text-sm font-medium text-gray-800">{answers.partNumber || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiTool className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Machine</p>
                <p className="text-sm font-medium text-gray-800">{answers.machine || '-'}</p>
              </div>
            </div>
          </div>
          
          {/* Row 2: Date, Shift, Time, Location */}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiUser className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Auditor Name</p>
                <p className="text-sm font-medium text-gray-800">{auditorName || answers.auditorName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiUser className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Auditee Name</p>
                <p className="text-sm font-medium text-gray-800">{auditeeName || answers.auditeeName || 'N/A'}</p>
              </div>
            </div>
            

            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiMapPin className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-800">{answers.location || '-'}</p>
              </div>
            </div>
          </div>


          
          
          {/* Row 3: Auditor Name, Auditee Name, Status */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiSettings className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Shift</p>
                <p className="text-sm font-medium text-gray-800">{audit.shift || answers.shift || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiCalendar className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium text-gray-800">{answers.date || formatDate(audit.auditDate)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <FiClock className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-medium text-gray-800">{answers.time || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className="w-6">
                <div className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(currentStatus)}`}>
                  {currentStatus || 'DRAFT'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4">
        <div className="p-3 text-center bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xl font-bold text-gray-800">{totalQuestions}</p>
          <p className="text-xs text-gray-500">Total Checkpoints</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xl font-bold text-green-600">{compliantCount}</p>
          <p className="text-xs text-gray-500">Compliant</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xl font-bold text-amber-600">{minorNCCount}</p>
          <p className="text-xs text-gray-500">Minor</p>
        </div>
        <div className="p-3 text-center bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xl font-bold text-red-600">{majorNCCount}</p>
          <p className="text-xs text-gray-500">Major</p>
        </div>
      </div>

      {/* Audit Findings / Questions Table */}
      <div className="p-4 mb-4 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <FiBookOpen className="w-4 h-4 text-purple-600" />
          <h2 className="text-base font-semibold text-gray-800">Audit Findings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-12 px-3 py-3 text-xs font-semibold text-center text-gray-700 uppercase border-b">S.No.</th>
                <th className="min-w-[250px] px-3 py-3 text-xs font-semibold text-left text-gray-700 border-b uppercase">Check Point</th>
                <th className="min-w-[280px] px-3 py-3 text-xs font-semibold text-left text-gray-700 border-b uppercase">Consideration</th>
                <th className="min-w-[200px] px-3 py-3 text-xs font-semibold text-left text-gray-700 border-b uppercase">Observations</th>
                <th className="px-3 py-3 text-xs font-semibold text-center text-gray-700 uppercase border-b w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questions.length > 0 ? questions.map((q, idx) => {
                const questionKey = q.slNo || (idx + 1);
                const response = responses[questionKey] || responses[String(questionKey)];
                const observation = observations[questionKey] || observations[String(questionKey)];
                
                let consideration = q.consideration || '-';
                if (typeof consideration === 'string') {
                  consideration = consideration
                    .replace(/\\n/g, '\n')
                    .replace(/(\d+)\.\s/g, '\n• ')
                    .replace(/\n/g, '<br/>');
                }
                
                return (
                  <tr key={idx} className="transition-colors hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm font-medium text-center text-gray-600 border-b">
                      {questionKey}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-800 align-top border-b">
                      {q.checkpoint}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 align-top border-b bg-gray-50">
                      <div 
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: consideration }}
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 align-top border-b">
                      {observation || '-'}
                    </td>
                    <td className="px-3 py-3 text-center align-top border-b">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(response)}
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(response)}`}>
                          {getStatusText(response)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="px-3 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FiBookOpen className="w-8 h-8 text-gray-300" />
                      <p>No questions loaded from the database</p>
                      <p className="text-xs">Please ensure check sheet ID {MANUFACTURING_CHECK_SHEET_ID} exists</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature Section - Like FiveSView */}
      <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl print:break-inside-avoid">
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
                  <FiXCircle className="w-4 h-4" />
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
              // Auditee Approval Mode - Can sign, comment, and approve/reject
              <>
                <p className="text-xs font-medium text-gray-500">Your Electronic Signature</p>
                
                {loadingSignatures ? (
                  <div className="flex justify-center p-2">
                    <div className="w-5 h-5 border-2 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
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
                      <FiXCircle className="w-4 h-4" />
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
                    disabled={submitting || (!auditeeSignatureUrl && !auditeeSignature.trim())}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <FiThumbsUp className="w-4 h-4" />
                    {submitting ? 'Processing...' : 'Approve & Sign'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <FiThumbsDown className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </>
            ) : (
              // View Mode - Shows auditee signature when APPROVED or REJECTED
              <>
                <p className="text-xs font-medium text-gray-500">Auditee Signature</p>
                <div className="mt-2">
                  {loadingSignatures ? (
                    <div className="flex justify-center p-2">
                      <div className="w-5 h-5 border-2 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
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
                        <FiXCircle className="w-4 h-4" />
                        <span className="text-sm">No signature available</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg bg-amber-50 border-amber-200">
                      <div className="text-center">
                        <FiClock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
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
                        <FiCheckCircle className="w-3 h-3" /> Approved
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-100 rounded">
                        <FiXCircle className="w-3 h-3" /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded">
                        <FiClock className="w-3 h-3" /> Pending Approval
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pb-4 mt-6 text-xs text-center text-gray-500">
        <p>Manufacturing Process Audit Report | Generated on {formatDate(new Date().toISOString())}</p>
        <p className="mt-1">This is an electronic document and does not require a physical signature</p>
      </div>
    </div>
  );
}