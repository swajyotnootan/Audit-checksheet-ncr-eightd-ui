// ManufacturingProcessAuditForm.jsx - COMPLETE FIXED VERSION

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/context/AuthContext';
import { auditScheduleApi } from '../services/auditScheduleApi';
import { userAPI, auditAPI } from '../components/services/api';
import { useToast } from '../components/ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, Save, Send, CheckCircle, AlertCircle, Clock, FileText, 
  ChevronLeft, ChevronRight, Info, RefreshCw, Sparkles,
  User, ClipboardList, PenTool, Flag, ThumbsUp, ThumbsDown,
  Calendar, MapPin, Building, Users, Clock as ClockIcon, Hash, FileCheck,
  AlertTriangle
} from 'lucide-react';

// Define STATUS_OPTIONS locally
const STATUS_OPTIONS = [
  { value: 'COMPLIANT', label: 'Compliant', short: 'C', icon: CheckCircle, color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  { value: 'MINOR', label: 'Minor', short: 'Minor', icon: AlertCircle, color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  { value: 'MAJOR', label: 'Major', short: 'Major', icon: AlertCircle, color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  { value: 'NOT_APPLICABLE', label: 'N/A', short: 'N/A', icon: Flag, color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-700' }
];

// Document number generator
const generateDocumentNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AUD/QMS/MP/${year}${month}/${random}`;
};

// Helper functions for dates
const getWEFDate = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

const getRevisionDate = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

const getIssueDate = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

const getRevisionNumber = () => '00';

// Score calculator
const calculateScore = (responses, questions) => {
  if (!questions || questions.length === 0) return 0;
  const total = questions.length;
  const compliant = Object.values(responses).filter(r => r === 'COMPLIANT').length;
  return total > 0 ? Math.round((compliant / total) * 100) : 0;
};

// MANUFACTURING PROCESS ALWAYS USES CHECK SHEET ID = 1
const MANUFACTURING_CHECK_SHEET_ID = 1;

export default function ManufacturingProcessAuditForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const scheduleId = searchParams.get('scheduleId');
  const urlAuditeeId = searchParams.get('auditeeId');
  const urlAuditeeName = searchParams.get('auditeeName');
  const urlDepartment = searchParams.get('department');
  const urlLocation = searchParams.get('location');
  
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const progressContainerRef = useRef(null);
  const activeButtonRef = useRef(null);
  const auditLoaded = useRef(false);
  const isManualSubmitRef = useRef(false);
  const [responseId, setResponseId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sheetConfig, setSheetConfig] = useState(null);
  const [allQuestionsData, setAllQuestionsData] = useState([]);

  // Signature states
  const [auditorSignatureImage, setAuditorSignatureImage] = useState(null);
  const [auditorSignatureBase64, setAuditorSignatureBase64] = useState(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [signatureError, setSignatureError] = useState(false);

  const sheetKey = 'manufacturing_process';
  const statusOptions = STATUS_OPTIONS;

  const [formData, setFormData] = useState({
    // Document Header Fields
    documentNumber: '',
    auditNumber: '',
    wefDate: '',
    revNo: '',
    revDate: '',
    issueDate: '',
    
    // Audit Information
    department: '',
    partNumber: '',
    machine: '',
    date: '',
    shift: 'Morning',
    time: '',
    location: '',
    
    // Personnel Information
    auditorName: '',
    auditorId: '',
    auditeeName: '',
    auditeeId: '',
    
    // Status & Data
    hodEmail: '',
    status: 'IN_PROGRESS',
    responses: {},
    observations: {},
    documentsVerified: {},
    score: null,
    auditorSignature: '',
    createdAt: ''
  });

  // Fetch auditor signature image from API
  const fetchAuditorSignature = async () => {
    if (!user?.id) {
      setLoadingSignature(false);
      return;
    }
    
    setLoadingSignature(true);
    setSignatureError(false);
    
    try {
      const signatureBase64 = await auditAPI.fetchSignatureById(user.id);
      
      if (signatureBase64) {
        setAuditorSignatureBase64(signatureBase64);
        setAuditorSignatureImage(signatureBase64);
        setFormData(prev => ({ ...prev, auditorSignature: signatureBase64 }));
        console.log('✅ Auditor signature loaded successfully');
      } else {
        console.log('No signature found for user');
        setSignatureError(true);
      }
    } catch (error) {
      console.error('Error fetching signature:', error);
      setSignatureError(true);
    } finally {
      setLoadingSignature(false);
    }
  };

  // Fetch questions using FIXED check sheet ID = 1
  const fetchQuestionsFromBackend = async () => {
    setLoadingQuestions(true);
    try {
      console.log('Fetching check sheet with ID:', MANUFACTURING_CHECK_SHEET_ID);
      
      const response = await axios.get(`http://localhost:8080/api/templates/${MANUFACTURING_CHECK_SHEET_ID}`);
      const checkSheet = response.data;
      console.log('Check sheet data:', checkSheet);
      setSheetConfig(checkSheet);
      
      let parsedQuestions = [];
      if (checkSheet.questions) {
        try {
          parsedQuestions = typeof checkSheet.questions === 'string' 
            ? JSON.parse(checkSheet.questions) 
            : checkSheet.questions;
        } catch (e) {
          console.error('Error parsing questions:', e);
        }
      }
      
      const formattedQuestions = parsedQuestions.map(q => ({
        slNo: q.sNo || q.slNo,
        checkpoint: q.displayLabel || q.checkpoint,
        clause: q.clauseNo || q.category || q.clause || '',
        consideration: q.consideration || q.whatToLookFor || q.documentsVerified || '',
        fieldKey: q.fieldKey,
        fieldType: q.fieldType || 'rating',
        maxRating: q.maxRating || 4,
        category: q.category || '',
        method: q.method || '',
        frequency: q.frequency || ''
      }));
      
      console.log('Formatted questions with all data:', formattedQuestions);
      setQuestions(formattedQuestions);
      setAllQuestionsData(formattedQuestions);
      
      const initialResponses = {};
      const initialObservations = {};
      const initialDocumentsVerified = {};
      
      formattedQuestions.forEach(q => {
        initialResponses[q.slNo] = '';
        initialObservations[q.slNo] = '';
        initialDocumentsVerified[q.slNo] = '';
      });
      
      setFormData(prev => ({
        ...prev,
        responses: { ...prev.responses, ...initialResponses },
        observations: { ...prev.observations, ...initialObservations },
        documentsVerified: { ...prev.documentsVerified, ...initialDocumentsVerified }
      }));
      
    } catch (error) {
      console.error('Error fetching questions from backend:', error);
      addToast('Failed to load audit questions from database', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Fetch schedule details
  const fetchScheduleDetails = async () => {
    if (!scheduleId) return;
    
    try {
      const response = await axios.get(`http://localhost:8080/api/audit-schedule/${scheduleId}`, {
        withCredentials: true
      });
      const schedule = response.data;
      console.log('Schedule details fetched:', {
        department: schedule.department,
        auditeeName: schedule.auditeeName,
        auditeeId: schedule.auditeeId,
        location: schedule.location
      });
      
      if (schedule) {
        setFormData(prev => ({
          ...prev,
          department: schedule.department || prev.department,
          auditeeName: schedule.auditeeName || prev.auditeeName,
          auditeeId: schedule.auditeeId || prev.auditeeId,
          location: schedule.location || prev.location
        }));
      }
    } catch (error) {
      console.error('Error fetching schedule details:', error);
    }
  };

  // Fetch schedule details if we have scheduleId
  useEffect(() => {
    if (scheduleId) {
      // fetchScheduleDetails();
    }
  }, [scheduleId]);

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestionsFromBackend();
    fetchAuditorSignature();
    
    const currentTime = new Date();
    const formattedDate = currentTime.toISOString().split('T')[0];
    const formattedTime = currentTime.toLocaleTimeString();
    
    let decodedAuditeeName = '';
    if (urlAuditeeName && urlAuditeeName !== 'undefined' && urlAuditeeName !== 'null') {
      try {
        decodedAuditeeName = decodeURIComponent(urlAuditeeName);
        console.log('Decoded auditee name from URL:', decodedAuditeeName);
      } catch (e) {
        console.error('Error decoding auditee name:', e);
        decodedAuditeeName = urlAuditeeName;
      }
    }

    let decodedDepartment = '';
    if (urlDepartment && urlDepartment !== 'undefined' && urlDepartment !== 'null') {
      try {
        decodedDepartment = decodeURIComponent(urlDepartment);
        console.log('Decoded department from URL:', decodedDepartment);
      } catch (e) {
        console.error('Error decoding department:', e);
        decodedDepartment = urlDepartment;
      }
    }

    let decodedLocation = '';
    if (urlLocation && urlLocation !== 'undefined' && urlLocation !== 'null') {
      try {
        decodedLocation = decodeURIComponent(urlLocation);
        console.log('Decoded location from URL:', decodedLocation);
      } catch (e) {
        console.error('Error decoding location:', e);
        decodedLocation = urlLocation;
      }
    }

    setFormData(prev => ({
      ...prev,
      documentNumber: generateDocumentNumber(),
      auditNumber: `AUD-${Date.now()}`,
      wefDate: getWEFDate(),
      revNo: getRevisionNumber(),
      revDate: getRevisionDate(),
      issueDate: getIssueDate(),
      date: formattedDate,
      time: formattedTime,
      auditorName: user?.name || '',
      auditorId: user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : '',
      auditorSignature: user?.name || '',
      auditeeName: decodedAuditeeName || prev.auditeeName,
      auditeeId: urlAuditeeId || prev.auditeeId,
      department: decodedDepartment || prev.department,
      location: decodedLocation || prev.location
    }));
  }, []);

  useEffect(() => {
    if (editId && questions.length > 0) {
      loadAuditData();
    }
  }, [editId, questions]);

  useEffect(() => {
    if (user?.id && !editId) {
      setFormData(prev => ({
        ...prev,
        auditorName: user.name || '',
        auditorSignature: user.name || ''
      }));
    }
  }, [user, editId]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAuditResponse(parseInt(editId));
      const audit = response.data;
      
      if (audit) {
        setResponseId(audit.id);
        let answers = {};
        try {
          answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : audit.answers;
        } catch (e) {
          answers = {};
        }
        
        setFormData({
          documentNumber: answers.documentNumber || generateDocumentNumber(),
          auditNumber: answers.auditNumber || `AUD-${Date.now()}`,
          wefDate: answers.wefDate || getWEFDate(),
          revNo: answers.revNo || getRevisionNumber(),
          revDate: answers.revDate || getRevisionDate(),
          issueDate: answers.issueDate || getIssueDate(),
          department: answers.department || audit.department || '',
          partNumber: answers.partNumber || '',
          machine: answers.machine || '',
          date: answers.date || new Date().toISOString().split('T')[0],
          shift: audit.shift || 'Morning',
          time: answers.time || new Date().toLocaleTimeString(),
          location: answers.location || '',
          auditorName: audit.auditorName || user?.name || '',
          auditorId: audit.auditorId || user?.id,
          auditeeName: audit.auditeeName || answers.auditeeName || '',
          auditeeId: audit.auditeeId || answers.auditeeId || '',
          hodEmail: answers.hodEmail || '',
          status: audit.status || 'IN_PROGRESS',
          responses: answers.responses || {},
          observations: answers.observations || {},
          documentsVerified: answers.documentsVerified || {},
          score: answers.score || null,
          auditorSignature: answers.auditorSignature || '',
          createdAt: audit.createdAt || new Date().toISOString()
        });
        
        auditLoaded.current = true;
      }
    } catch (error) {
      console.error('Error loading audit:', error);
      addToast('Failed to load audit data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleObservationChange = (questionId, observation) => {
    setFormData(prev => ({
      ...prev,
      observations: { ...prev.observations, [questionId]: observation }
    }));
  };

  const handleStatusChange = (questionId, status) => {
    setFormData(prev => ({
      ...prev,
      responses: { ...prev.responses, [questionId]: status }
    }));
  };

  const calculateCurrentScore = () => {
    return calculateScore(formData.responses, questions);
  };

  const saveDraft = async () => {
  setSaving(true);
  try {
    // Calculate score properly
    const totalQuestions = questions.length;
    const compliantCount = Object.values(formData.responses).filter(r => r === 'COMPLIANT').length;
    const minorCount = Object.values(formData.responses).filter(r => r === 'MINOR').length;
    const majorCount = Object.values(formData.responses).filter(r => r === 'MAJOR').length;
    
    // Calculate percentage score (assuming COMPLIANT = 100%, MINOR = 50%, MAJOR = 0%)
    let totalScorePercentage = 0;
    if (totalQuestions > 0) {
      const weightedScore = (compliantCount * 100) + (minorCount * 50) + (majorCount * 0);
      totalScorePercentage = weightedScore / totalQuestions;
    }
    
    const answersObject = {
      // ... your existing answers object
      responses: formData.responses,
      observations: formData.observations,
      documentsVerified: formData.documentsVerified,
      score: totalScorePercentage  // Store percentage in answers
    };
    
    // Ensure auditorId is a valid number
    const auditorIdNumber = formData.auditorId && !isNaN(parseInt(formData.auditorId)) 
      ? parseInt(formData.auditorId) 
      : (user?.id ? parseInt(user.id) : null);
    
    const payload = {
      checkSheet: { id: MANUFACTURING_CHECK_SHEET_ID },
      auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
      department: formData.department,
      shift: formData.shift,
      auditDate: formData.date,
      auditorName: formData.auditorName,
      auditorId: auditorIdNumber,  // ✅ FIXED: Valid number or null
      auditeeName: formData.auditeeName,
      auditeeId: formData.auditeeId ? parseInt(formData.auditeeId) : null,
      answers: JSON.stringify(answersObject),
      totalScore: compliantCount,  // Number of compliant answers
      maxPossibleScore: totalQuestions,
      percentageScore: totalScorePercentage,  // ✅ ADD THIS - percentage score
      summary: null,
      recommendations: null,
      status: 'DRAFT'
    };
    
    console.log('Saving payload:', payload); // Debug log
    
    let saved;
    if (responseId) {
      await auditScheduleApi.updateAuditResponse(responseId, payload);
      saved = { id: responseId };
      addToast('Draft updated successfully', 'success');
    } else {
      const response = await auditScheduleApi.saveAuditResponse(payload);
      saved = response.data;
      setResponseId(saved.id);
      addToast('Draft saved successfully', 'success');
      navigate(`/audit/manufacturing-process?edit=${saved.id}`, { replace: true });
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    addToast(`Failed to save draft: ${error.message}`, 'error');
  } finally {
    setSaving(false);
  }
};
 

const submitAudit = async () => {
  if (!isManualSubmitRef.current) return;
  isManualSubmitRef.current = false;

  // Validation checks...
  const unanswered = questions.filter(q => !formData.responses[q.slNo]);
  if (unanswered.length > 0) {
    addToast(`Please answer all ${unanswered.length} remaining questions`, 'error');
    setCurrentStep(2);
    return;
  }

  setSaving(true);
  try {
    // Calculate scores
    const totalQuestions = questions.length;
    const compliantCount = Object.values(formData.responses).filter(r => r === 'COMPLIANT').length;
    const minorCount = Object.values(formData.responses).filter(r => r === 'MINOR').length;
    const majorCount = Object.values(formData.responses).filter(r => r === 'MAJOR').length;
    
    // Calculate percentage score
    let percentageScore = 0;
    if (totalQuestions > 0) {
      const weightedScore = (compliantCount * 100) + (minorCount * 50) + (majorCount * 0);
      percentageScore = weightedScore / totalQuestions;
    }
    
    const answersObject = {
      documentNumber: formData.documentNumber,
      auditNumber: formData.auditNumber,
      wefDate: formData.wefDate,
      revNo: formData.revNo,
      revDate: formData.revDate,
      issueDate: formData.issueDate,
      department: formData.department,
      partNumber: formData.partNumber,
      machine: formData.machine,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      auditorName: formData.auditorName,
      auditorId: formData.auditorId,
      auditeeName: formData.auditeeName,
      auditeeId: formData.auditeeId,
      hodEmail: formData.hodEmail,
      auditorSignature: auditorSignatureImage || formData.auditorSignature,
      formName: sheetConfig?.name || 'Manufacturing Process Audit',
      questionsData: allQuestionsData,
      responses: formData.responses,
      observations: formData.observations,
      documentsVerified: formData.documentsVerified,
      score: percentageScore  // Store in answers
    };
    
    // Ensure auditorId is valid
    const auditorIdNumber = formData.auditorId && !isNaN(parseInt(formData.auditorId)) 
      ? parseInt(formData.auditorId) 
      : (user?.id ? parseInt(user.id) : null);
    
    const payload = {
      checkSheet: { id: MANUFACTURING_CHECK_SHEET_ID },
      auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
      department: formData.department,
      shift: formData.shift,
      auditDate: formData.date,
      auditorName: formData.auditorName,
      auditorId: auditorIdNumber,  // ✅ FIXED
      auditeeName: formData.auditeeName,
      auditeeId: formData.auditeeId ? parseInt(formData.auditeeId) : null,
      answers: JSON.stringify(answersObject),
      totalScore: compliantCount,
      maxPossibleScore: totalQuestions,
      percentageScore: percentageScore,  // ✅ ADD THIS
      summary: null,
      recommendations: null,
      status: 'SUBMITTED'
    };
    
    console.log('Submit payload:', payload); // Debug log
    
    let saved;
    if (responseId) {
      await auditScheduleApi.updateAuditResponse(responseId, payload);
      await auditScheduleApi.submitAuditResponse(responseId);
      saved = { id: responseId };
    } else {
      const response = await auditScheduleApi.saveAuditResponse(payload);
      saved = response.data;
      setResponseId(saved.id);
      await auditScheduleApi.submitAuditResponse(saved.id);
    }
    
    addToast(`Audit submitted successfully! Score: ${percentageScore.toFixed(2)}%`, 'success');
    navigate('/auditor');
  } catch (error) {
    console.error('Error submitting audit:', error);
    addToast(`Failed to submit audit: ${error.message}`, 'error');
  } finally {
    setSaving(false);
  }
};

  const handleAutoFill = () => {
    const sampleObservations = [
      "All documentation properly maintained. Incoming inspection tags present on all raw material bins.",
      "Workers have clear understanding of their responsibilities. Authority to stop production is documented.",
      "Employee competence records maintained. Training matrix updated.",
      "Shift plan displayed and followed. Replacement policy documented.",
      "Preventive maintenance schedule followed. Records maintained.",
      "Control charts displayed and updated. CpK values within acceptable range.",
      "MSA studies conducted annually. Calibration records up to date.",
      "Lighting adequate at all workstations. Housekeeping score 85%.",
      "Control plan available at each workstation. All requirements documented.",
      "Production logs maintained. Quality records filed chronologically."
    ];
    
    questions.forEach((q, idx) => {
      const statuses = ['COMPLIANT', 'COMPLIANT', 'COMPLIANT', 'MINOR', 'COMPLIANT', 'MAJOR', 'COMPLIANT', 'COMPLIANT', 'COMPLIANT', 'COMPLIANT'];
      handleObservationChange(q.slNo, sampleObservations[idx % sampleObservations.length]);
      handleStatusChange(q.slNo, statuses[idx % statuses.length]);
    });
    addToast('Demo data filled successfully', 'success');
  };

  const getProgressStats = () => {
    const total = questions.length;
    const completed = Object.keys(formData.responses).filter(key => formData.responses[key]).length;
    const compliant = Object.values(formData.responses).filter(r => r === 'COMPLIANT').length;
    const minor = Object.values(formData.responses).filter(r => r === 'MINOR').length;
    const major = Object.values(formData.responses).filter(r => r === 'MAJOR').length;
    return { total, completed, compliant, minor, major };
  };

  const stats = getProgressStats();
  const allCheckpointsRated = stats.completed === stats.total;
  const currentQ = questions[currentCheckpointIndex];

  const nextCheckpoint = () => {
    if (currentCheckpointIndex < questions.length - 1) {
      setCurrentCheckpointIndex(currentCheckpointIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevCheckpoint = () => {
    if (currentCheckpointIndex > 0) {
      setCurrentCheckpointIndex(currentCheckpointIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToCheckpoint = (index) => {
    setCurrentCheckpointIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKeyDown = useCallback((e) => {
    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT') {
      return;
    }
    
    if (currentStep === 2) {
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentCheckpointIndex > 0) prevCheckpoint();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentCheckpointIndex < questions.length - 1) nextCheckpoint();
          break;
        default: break;
      }
    }
  }, [currentStep, currentCheckpointIndex, questions.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLIANT': return 'border-green-500 bg-green-50';
      case 'MINOR': return 'border-yellow-500 bg-yellow-50';
      case 'MAJOR': return 'border-red-500 bg-red-50';
      case 'NOT_APPLICABLE': return 'border-gray-500 bg-gray-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getResponseStatus = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.short : '';
  };

  const steps = [
    { number: 1, title: 'General Information', icon: User },
    { number: 2, title: 'Audit Checkpoints', icon: ClipboardList },
    { number: 3, title: 'Signature & Submit', icon: PenTool }
  ];

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setCurrentCheckpointIndex(0);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setCurrentCheckpointIndex(0);
      window.scrollTo(0, 0);
    }
  };

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading audit questions from database...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl px-4 py-6 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/auditor')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <button
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200"
              >
                <Sparkles size={16} /> Demo Auto-Fill
              </button>
            )}
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {currentStep === 3 && (
              <button
                onClick={() => { isManualSubmitRef.current = true; submitAudit(); }}
                disabled={!allCheckpointsRated || saving}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition ${
                  allCheckpointsRated && !saving ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={16} /> Submit Audit
              </button>
            )}
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              let isClickable = false;
              if (step.number < currentStep) isClickable = true;
              else if (step.number === 2 && currentStep === 1) isClickable = true;
              else if (step.number === 3 && currentStep === 2) isClickable = true;
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => isClickable && setCurrentStep(step.number)}
                    disabled={!isClickable}
                    className={`flex items-center group transition-all duration-200 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' :
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <div className="ml-3 text-left">
                      <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>Step {step.number}</p>
                      <p className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{step.title}</p>
                    </div>
                  </button>
                  {step.number < steps.length && (
                    <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Card 1: Document Control */}
            <div className="overflow-hidden bg-white rounded-lg shadow-sm">
              <div className="px-6 py-3 border-b bg-gray-50">
                <h3 className="font-medium text-gray-700">Document Control Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">Doc No.</label>
                    <input 
                      type="text" 
                      value={formData.documentNumber} 
                      readOnly 
                      className="w-full px-2 py-1.5 text-sm bg-gray-100 border rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">W.e.f.</label>
                    <input 
                      type="date" 
                      value={formData.wefDate} 
                      onChange={(e) => handleInputChange('wefDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">Rev No.</label>
                    <input 
                      type="text" 
                      value={formData.revNo} 
                      onChange={(e) => handleInputChange('revNo', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="00"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">Rev Date</label>
                    <input 
                      type="date" 
                      value={formData.revDate} 
                      onChange={(e) => handleInputChange('revDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">Issue Date</label>
                    <input 
                      type="date" 
                      value={formData.issueDate} 
                      onChange={(e) => handleInputChange('issueDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Audit Information */}
            <div className="overflow-hidden bg-white rounded-lg shadow-sm">
              <div className="px-6 py-3 border-b bg-gray-50">
                <h3 className="font-medium text-gray-700">Audit Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4">
                  {/* Department - FIXED: Now shows value from URL/schedule */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <Building size={14} /> Department <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.department} 
                      onChange={(e) => handleInputChange('department', e.target.value)} 
                      placeholder="Enter department name" 
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${scheduleId ? 'bg-gray-50' : ''}`}
                    />
                    {scheduleId && formData.department && (
                      <p className="mt-1 text-xs text-green-600">✓ Department loaded from schedule</p>
                    )}
                  </div>
                  
                  {/* Part Number */}
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Part Number</label>
                    <input 
                      type="text" 
                      value={formData.partNumber} 
                      onChange={(e) => handleInputChange('partNumber', e.target.value)} 
                      placeholder="Enter part number" 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Machine */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <Building size={14} /> Machine
                    </label>
                    <input 
                      type="text" 
                      value={formData.machine} 
                      onChange={(e) => handleInputChange('machine', e.target.value)} 
                      placeholder="Machine name / number" 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Location */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <MapPin size={14} /> Location
                    </label>
                    <input 
                      type="text" 
                      value={formData.location} 
                      onChange={(e) => handleInputChange('location', e.target.value)} 
                      placeholder="Audit location" 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Date */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <Calendar size={14} /> Date
                    </label>
                    <input 
                      type="date" 
                      value={formData.date} 
                      onChange={(e) => handleInputChange('date', e.target.value)} 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Shift */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <ClockIcon size={14} /> Shift
                    </label>
                    <select 
                      value={formData.shift} 
                      onChange={(e) => handleInputChange('shift', e.target.value)} 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                  
                  {/* Time */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <ClockIcon size={14} /> Time
                    </label>
                    <input 
                      type="time" 
                      value={formData.time} 
                      onChange={(e) => handleInputChange('time', e.target.value)} 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Auditor Name */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <User size={14} /> Auditor Name
                    </label>
                    <input 
                      type="text" 
                      value={formData.auditorName} 
                      readOnly 
                      className="w-full px-3 py-2 bg-gray-100 border rounded-lg"
                    />
                  </div>
                  
                  {/* Auditee Name */}
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <User size={14} /> Auditee Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.auditeeName} 
                      onChange={(e) => handleInputChange('auditeeName', e.target.value)} 
                      placeholder="Enter auditee name" 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {scheduleId && formData.auditeeName && (
                      <p className="mt-1 text-xs text-green-600">✓ Auditee name loaded from schedule</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-2">
              <button 
                onClick={nextStep} 
                className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Audit Checkpoints */}
        {currentStep === 2 && currentQ && (
          <div>
            {/* Progress Navigation */}
            <div className="p-4 mb-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Checkpoint {currentCheckpointIndex + 1} of {questions.length}</span>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} /> {stats.compliant}</span>
                  <span className="flex items-center gap-1 text-yellow-600"><Info size={12} /> {stats.minor}</span>
                  <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> {stats.major}</span>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {questions.map((q, idx) => {
                  const isCompleted = formData.responses[q.slNo];
                  const responseStatus = getResponseStatus(formData.responses[q.slNo]);
                  
                  let buttonColorClass = '';
                  if (currentCheckpointIndex === idx) {
                    buttonColorClass = 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300';
                  } else if (isCompleted) {
                    if (formData.responses[q.slNo] === 'COMPLIANT') {
                      buttonColorClass = 'bg-green-500 text-white';
                    } else if (formData.responses[q.slNo] === 'MINOR') {
                      buttonColorClass = 'bg-yellow-500 text-white';
                    } else if (formData.responses[q.slNo] === 'MAJOR') {
                      buttonColorClass = 'bg-red-500 text-white';
                    } else if (formData.responses[q.slNo] === 'NOT_APPLICABLE') {
                      buttonColorClass = 'bg-gray-500 text-white';
                    }
                  } else {
                    buttonColorClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
                  }
                  
                  return (
                    <button
                      key={q.slNo}
                      ref={currentCheckpointIndex === idx ? activeButtonRef : null}
                      onClick={() => navigateToCheckpoint(idx)}
                      className={`min-w-[36px] w-9 h-9 text-sm font-medium rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${buttonColorClass}`}
                      title={`Checkpoint ${idx + 1}${isCompleted ? ` - ${responseStatus}` : ' - Pending'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Card */}
            <div className={`bg-white rounded-lg shadow-md border-l-4 ${getStatusColor(formData.responses[currentQ.slNo])}`}>
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 text-white bg-blue-600 rounded-full">{currentQ.slNo}</span>
                    {currentQ.clause && (
                      <span className="px-2 py-1 text-xs text-purple-800 bg-purple-100 rounded-full">Clause {currentQ.clause}</span>
                    )}
                    {formData.responses[currentQ.slNo] && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        formData.responses[currentQ.slNo] === 'COMPLIANT' ? 'bg-green-100 text-green-800' :
                        formData.responses[currentQ.slNo] === 'MINOR' ? 'bg-yellow-100 text-yellow-800' :
                        formData.responses[currentQ.slNo] === 'MAJOR' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getResponseStatus(formData.responses[currentQ.slNo])}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mb-3 text-lg font-semibold text-gray-800">{currentQ.checkpoint}</h3>

                {currentQ.consideration && (
                  <div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50">
                    <p className="text-sm font-medium text-yellow-800">Documents/Records to Verify:</p>
                    <p className="text-sm text-yellow-700">{currentQ.consideration}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">Observations / Findings</label>
                  <textarea
                    value={formData.observations[currentQ.slNo] || ''}
                    onChange={(e) => handleObservationChange(currentQ.slNo, e.target.value)}
                    rows="3"
                    placeholder="Enter your observations here..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-4 mb-4 border border-gray-200 rounded-lg bg-gray-50">
                  <label className="block mb-3 text-sm font-medium text-gray-700">Status / Rating</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {statusOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = formData.responses[currentQ.slNo] === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleStatusChange(currentQ.slNo, option.value)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isSelected ? `${option.bgColor} border-${option.color}-500 shadow-md` : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Icon size={20} className={isSelected ? `text-${option.color}-600` : 'text-gray-500'} />
                            <span className={`text-xs font-medium ${isSelected ? option.textColor : 'text-gray-600'}`}>{option.short}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>{option.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData.observations[currentQ.slNo] && formData.responses[currentQ.slNo] && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    formData.responses[currentQ.slNo] === 'COMPLIANT' ? 'bg-green-50 border border-green-200' :
                    formData.responses[currentQ.slNo] === 'MINOR' ? 'bg-yellow-50 border border-yellow-200' :
                    formData.responses[currentQ.slNo] === 'MAJOR' ? 'bg-red-50 border border-red-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {formData.responses[currentQ.slNo] === 'COMPLIANT' && <ThumbsUp size={16} className="text-green-600" />}
                      {(formData.responses[currentQ.slNo] === 'MINOR' || formData.responses[currentQ.slNo] === 'MAJOR') && <ThumbsDown size={16} className="text-red-600" />}
                      {formData.responses[currentQ.slNo] === 'NOT_APPLICABLE' && <Flag size={16} className="text-gray-600" />}
                      <span className={`text-sm font-medium ${
                        formData.responses[currentQ.slNo] === 'COMPLIANT' ? 'text-green-800' :
                        formData.responses[currentQ.slNo] === 'MINOR' ? 'text-yellow-800' :
                        formData.responses[currentQ.slNo] === 'MAJOR' ? 'text-red-800' :
                        'text-gray-800'
                      }`}>
                        Status: {statusOptions.find(opt => opt.value === formData.responses[currentQ.slNo])?.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{formData.observations[currentQ.slNo]}</p>
                  </div>
                )}

                <div className="flex justify-between pt-4 mt-4 border-t">
                  <button onClick={prevCheckpoint} disabled={currentCheckpointIndex === 0} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="text-sm text-gray-500">
                    {formData.responses[currentQ.slNo] ? (
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> Completed</span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600"><AlertCircle size={14} /> Select Status</span>
                    )}
                  </div>
                  <button onClick={nextCheckpoint} disabled={currentCheckpointIndex === questions.length - 1} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50 hover:bg-blue-700">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 mt-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="text-center"><div className="text-xl font-bold text-green-600">{stats.compliant}</div><div className="text-xs text-gray-500">Compliant</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-yellow-600">{stats.minor}</div><div className="text-xs text-gray-500">Minor</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-red-600">{stats.major}</div><div className="text-xs text-gray-500">Major</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-gray-600">{stats.total - stats.completed}</div><div className="text-xs text-gray-500">Pending</div></div>
                </div>
                <div className="text-sm"><span className="font-medium">{stats.completed}</span> / <span className="text-gray-500">{stats.total}</span> completed</div>
              </div>
              {!allCheckpointsRated && (
                <div className="p-2 mt-3 text-xs text-center rounded-lg text-amber-600 bg-amber-50">
                  ⚠️ Please select status for all {stats.total - stats.completed} remaining checkpoints
                </div>
              )}
            </div>

            {allCheckpointsRated && (
              <div className="flex justify-end mt-4">
                <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">
                  Next: Signature <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Signature & Submit */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Signature & Submit</h2>
              <p className="text-sm text-gray-500">Review and submit the audit report</p>
            </div>
            <div className="p-6">
              <div className="p-4 mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Audit Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div><p className="text-xs text-gray-500">Total Checkpoints</p><p className="text-xl font-bold text-gray-800">{stats.total}</p></div>
                  <div><p className="text-xs text-gray-500">Compliant</p><p className="text-xl font-bold text-green-600">{stats.compliant}</p></div>
                  <div><p className="text-xs text-gray-500">Non-Conformities</p><p className="text-xl font-bold text-red-600">{stats.minor + stats.major}</p></div>
                  <div><p className="text-xs text-gray-500">Score</p><p className="text-xl font-bold text-blue-600">{calculateCurrentScore()}%</p></div>
                </div>
              </div>

              {/* Department Display */}
              <div className="p-3 mb-6 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Department:</span> {formData.department || 'Not specified'}
                </p>
              </div>

              {/* Auditor Signature Field */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <FileCheck size={14} className="inline mr-1" /> Auditor Signature <span className="text-red-500">*</span>
                </label>
                
                {loadingSignature ? (
                  <div className="flex items-center justify-center p-4 border rounded-lg bg-gray-50">
                    <div className="w-5 h-5 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading signature...</span>
                  </div>
                ) : auditorSignatureImage ? (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <img 
                      src={auditorSignatureImage} 
                      alt="Auditor Signature" 
                      className="object-contain max-h-20"
                    />
                    <p className="mt-2 text-xs text-green-600">✓ Signature loaded from your profile</p>
                  </div>
                ) : signatureError ? (
                  <div className="p-4 border rounded-lg bg-yellow-50">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <AlertTriangle size={16} />
                      <span className="text-sm">No signature found in your profile</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Please upload your signature in your profile settings. 
                      You can still proceed with typed signature below.
                    </p>
                    <input
                      type="text"
                      value={formData.auditorSignature}
                      onChange={(e) => handleInputChange('auditorSignature', e.target.value)}
                      placeholder="Type your full name as signature (fallback)"
                      className="w-full px-3 py-2 mt-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-500">No signature loaded. Please type your signature below.</p>
                    <input
                      type="text"
                      value={formData.auditorSignature}
                      onChange={(e) => handleInputChange('auditorSignature', e.target.value)}
                      placeholder="Type your full name as signature"
                      className="w-full px-3 py-2 mt-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">Your electronic signature will be used for this audit report</p>
              </div>

              {/* Date Field */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <Calendar size={14} className="inline mr-1" /> Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Date of signature</p>
              </div>

              {/* Auditee Name Field */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <User size={14} className="inline mr-1" /> Auditee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.auditeeName}
                  onChange={(e) => handleInputChange('auditeeName', e.target.value)}
                  placeholder="Enter auditee full name"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">The auditee will review and sign separately</p>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => { isManualSubmitRef.current = true; submitAudit(); }}
                  disabled={(!auditorSignatureImage && !formData.auditorSignature.trim()) || !formData.date.trim() || !formData.auditeeName.trim() || saving || !allCheckpointsRated}
                  className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition ${
                    (auditorSignatureImage || formData.auditorSignature.trim()) && formData.date.trim() && formData.auditeeName.trim() && !saving && allCheckpointsRated
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} /> {saving ? 'Submitting...' : 'Submit Audit Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}