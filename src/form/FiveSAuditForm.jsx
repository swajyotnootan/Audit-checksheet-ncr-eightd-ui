// FiveSAuditForm.jsx - WITH SIGNATURE FIX

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/context/AuthContext';
import { auditScheduleApi } from '../services/auditScheduleApi';
import { userAPI, auditAPI } from '../components/services/api';
import { useToast } from '../components/ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, Save, Send, Camera, Upload, X, 
  CheckCircle, AlertCircle, Clock, FileText, 
  MapPin, Users, Calendar, Edit, Eye, Sparkles,
  ChevronLeft, ChevronRight, Info, RefreshCw,
  Hash, Tag, User, ClipboardList, PenTool,
  ChevronUp, ChevronDown, Flag, ThumbsUp, ThumbsDown,
  Building, Star, TrendingUp, AlertTriangle,
  FileCheck
} from 'lucide-react';

const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

// 5S Score options (0-4 scale)
const SCORE_OPTIONS = [
  { value: 0, label: 'No Compliance', short: '0', color: 'red', description: 'Complete non-compliance, no evidence found' },
  { value: 1, label: 'Very Little Compliance', short: '1', color: 'orange', description: 'Minimal compliance, major gaps identified' },
  { value: 2, label: 'Some Compliance', short: '2', color: 'yellow', description: 'Partial compliance, significant gaps' },
  { value: 3, label: 'Significant Compliance', short: '3', color: 'lime', description: 'Good compliance, minor gaps' },
  { value: 4, label: 'Total Compliance', short: '4', color: 'green', description: 'Full compliance, best practice' }
];

// Document number generator
const generateDocumentNumber = (sheetKey) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AUD-${sheetKey.toUpperCase()}-${year}${month}-${random}`;
};

// 5S Sections with max scores
const FIVE_S_SECTIONS = [
  { name: 'Sort (1S)', slNos: [1, 2, 3, 4, 5, 6, 7, 8], maxScore: 32, color: 'blue' },
  { name: 'Set in Order (2S)', slNos: [9, 10, 11, 12, 13, 14, 15, 16], maxScore: 32, color: 'teal' },
  { name: 'Shine (3S)', slNos: [17, 18, 19, 20, 21, 22, 23, 24, 25], maxScore: 36, color: 'green' },
  { name: 'Standardize (4S)', slNos: [26, 27, 28, 29, 30, 31], maxScore: 24, color: 'orange' },
  { name: 'Sustain (5S)', slNos: [32, 33, 34, 35, 36], maxScore: 20, color: 'purple' }
];

export default function FiveSAuditForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const scheduleId = searchParams.get('scheduleId');
  const urlDepartment = searchParams.get('department');      // ✅ ADD THIS
  const urlAuditeeId = searchParams.get('auditeeId');        // ✅ ADD THIS
  const urlAuditeeName = searchParams.get('auditeeName');    // ✅ ADD THIS
  const urlLocation = searchParams.get('location');          // ✅ ADD THIS (optional)
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [responseId, setResponseId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentCheckSheet, setCurrentCheckSheet] = useState(null);
  const [fiveSCheckSheetIds, setFiveSCheckSheetIds] = useState([]);
  
  // Signature states
  const [auditorSignatureImage, setAuditorSignatureImage] = useState(null);
  const [auditorSignatureBase64, setAuditorSignatureBase64] = useState(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [signatureError, setSignatureError] = useState(false);
  
  const progressContainerRef = useRef(null);
  const activeButtonRef = useRef(null);
  const auditLoaded = useRef(false);
  const isManualSubmitRef = useRef(false);

  const sheetKey = 'five_s';

  const [auditeeInfo, setAuditeeInfo] = useState({
    auditeeId: null,
    auditeeName: null,
    auditeeIds: []
  });
  
  const [formData, setFormData] = useState({
    documentNumber: '',
    department: '',
    supervisor: '',
    area: '',
    shift: 'Morning',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    auditorName: user?.name || '',
    auditorId: user?.id,
    hodEmail: '',
    status: 'IN_PROGRESS',
    scores: {},
    comments: {},
    totalScore: null,
    maxPossibleScore: 144,
    percentage: null,
    auditorSignature: '',
    createdAt: new Date().toISOString()
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

  // Fetch schedule auditee info
  useEffect(() => {
    const fetchScheduleAuditeeInfo = async () => {
  if (scheduleId && !editId) {
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/${scheduleId}`, {
        withCredentials: true
      });
      const schedule = response.data;
      console.log('Schedule auditee info:', {
        auditeeId: schedule.auditeeId,
        auditeeName: schedule.auditeeName,
        auditeeIds: schedule.auditeeIds,
        department: schedule.department,
        location: schedule.location
      });
      
      // ✅ UPDATE auditeeInfo
      setAuditeeInfo({
        auditeeId: schedule.auditeeId || urlAuditeeId || null,
        auditeeName: schedule.auditeeName || urlAuditeeName || null,
        auditeeIds: schedule.auditeeIds || []
      });
      
      // ✅ UPDATE department from schedule (if not already set from URL)
      if (schedule.department) {
        setFormData(prev => ({
          ...prev,
          department: schedule.department  // Schedule value takes priority
        }));
      } else if (urlDepartment) {
        setFormData(prev => ({
          ...prev,
          department: urlDepartment
        }));
      }
      
      // ✅ UPDATE location/area from schedule
      if (schedule.location) {
        setFormData(prev => ({
          ...prev,
          area: schedule.location
        }));
      } else if (urlLocation) {
        setFormData(prev => ({
          ...prev,
          area: urlLocation
        }));
      }
      
    } catch (error) {
      console.error('Error fetching schedule auditee info:', error);
      // ✅ FALLBACK to URL values if API fails
      if (urlDepartment) {
        setFormData(prev => ({ ...prev, department: urlDepartment }));
      }
      if (urlAuditeeName) {
        setAuditeeInfo(prev => ({ ...prev, auditeeName: urlAuditeeName }));
      }
      if (urlLocation) {
        setFormData(prev => ({ ...prev, area: urlLocation }));
      }
    }
  }
};
    // fetchScheduleAuditeeInfo();
    fetchAuditorSignature();
  }, [scheduleId, editId]);

  // Fetch all 5S check sheet IDs
  const fetchFiveSCheckSheetIds = async () => {
    try {
      const response = await axios.get(`${API_BASE}/templates/type/FIVE_S`, {
        withCredentials: true
      });
      const fiveSSheets = response.data || [];
      const ids = fiveSSheets.map(sheet => sheet.id);
      console.log('✅ 5S Check Sheet IDs:', ids);
      setFiveSCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching 5S check sheets:', error);
      return [];
    }
  };

  // Fetch questions from backend
  const fetchQuestionsFromBackend = async () => {
    setLoadingQuestions(true);
    try {
      const fiveSIds = await fetchFiveSCheckSheetIds();
      
      if (fiveSIds.length === 0) {
        throw new Error('No 5S check sheets found in database');
      }
      
      const checkSheetId = fiveSIds[0];
      console.log('✅ Using 5S check sheet ID:', checkSheetId);
      
      const response = await axios.get(`${API_BASE}/templates/${checkSheetId}`, {
        withCredentials: true
      });
      const checkSheet = response.data;
      setCurrentCheckSheet(checkSheet);
      console.log('✅ Loaded check sheet:', checkSheet.name);
      
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
      
      console.log('Raw 5S questions:', parsedQuestions);
      
      const formattedQuestions = parsedQuestions.map((q, idx) => ({
        slNo: q.sNo || q.slNo || (idx + 1),
        checkpoint: q.displayLabel,
        category: q.category || '',
        documentsVerified: q.documentsVerified || q.consideration || q.whatToLookFor || q.method || '',
        fieldKey: q.fieldKey,
        fieldType: q.fieldType,
        maxRating: q.maxRating || 4
      }));
      
      console.log('Formatted 5S questions:', formattedQuestions);
      setQuestions(formattedQuestions);
      
      const initialScores = {};
      const initialComments = {};
      formattedQuestions.forEach(q => {
        initialScores[q.slNo] = null;
        initialComments[q.slNo] = '';
      });
      
      setFormData(prev => ({
        ...prev,
        scores: { ...prev.scores, ...initialScores },
        comments: { ...prev.comments, ...initialComments }
      }));
      
    } catch (error) {
      console.error('Error fetching 5S questions from backend:', error);
      addToast('Failed to load audit questions from database', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
  fetchQuestionsFromBackend();
  fetchAuditorSignature();
  
  const currentTime = new Date();
  const formattedDate = currentTime.toISOString().split('T')[0];
  const formattedTime = currentTime.toLocaleTimeString();
  
  // Decode URL parameters
  let decodedDepartment = '';
  if (urlDepartment && urlDepartment !== 'undefined' && urlDepartment !== 'null') {
    try {
      decodedDepartment = decodeURIComponent(urlDepartment);
    } catch (e) {
      decodedDepartment = urlDepartment;
    }
  }
  
  let decodedAuditeeName = '';
  if (urlAuditeeName && urlAuditeeName !== 'undefined' && urlAuditeeName !== 'null') {
    try {
      decodedAuditeeName = decodeURIComponent(urlAuditeeName);
    } catch (e) {
      decodedAuditeeName = urlAuditeeName;
    }
  }
  
  let decodedLocation = '';
  if (urlLocation && urlLocation !== 'undefined' && urlLocation !== 'null') {
    try {
      decodedLocation = decodeURIComponent(urlLocation);
    } catch (e) {
      decodedLocation = urlLocation;
    }
  }
  
  // ✅ FIX: Set auditorId properly from user object
  const auditorIdValue = user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null;
  
  setFormData(prev => ({
    ...prev,
    documentNumber: generateDocumentNumber(sheetKey),
    date: formattedDate,
    time: formattedTime,
    auditorName: user?.name || '',
    auditorId: auditorIdValue,  // ✅ FIXED: Set auditorId as number
    department: decodedDepartment || prev.department,
    area: decodedLocation || prev.area,
  }));
  
  // Set auditeeInfo from URL
  if (urlAuditeeId || urlAuditeeName) {
    setAuditeeInfo(prev => ({
      ...prev,
      auditeeId: urlAuditeeId ? parseInt(urlAuditeeId) : prev.auditeeId,
      auditeeName: decodedAuditeeName || prev.auditeeName
    }));
  }
}, []);
  useEffect(() => {
    if (editId && questions.length > 0) {
      loadAuditData();
    } else if (!editId && questions.length > 0) {
      const docNumber = generateDocumentNumber(sheetKey);
      setFormData(prev => ({ ...prev, documentNumber: docNumber }));
    }
  }, [editId, questions]);

  useEffect(() => {
    if (user?.id && !editId) {
      setFormData(prev => ({
        ...prev,
        auditorName: user.name || '',
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
        answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : (audit.answers || {});
      } catch (e) {
        answers = {};
      }
      
      // Restore scores and comments
      const savedScores = answers.scores || {};
      const savedComments = answers.comments || {};
      
      // Restore auditee info
      const savedAuditeeName = answers.auditeeName || audit.auditeeName || '';
      const savedDepartment = answers.department || audit.department || '';
      
      setAuditeeInfo(prev => ({
        ...prev,
        auditeeName: savedAuditeeName,
        auditeeId: audit.auditeeId || prev.auditeeId
      }));
      
      setFormData(prev => ({
        ...prev,
        documentNumber: answers.documentNumber || '',
        department: savedDepartment || prev.department,
        supervisor: answers.supervisor || '',
        area: answers.area || '',
        date: answers.date || audit.auditDate || prev.date,
        time: answers.time || prev.time,
        scores: savedScores,
        comments: savedComments,
        totalScore: answers.totalScore || audit.totalScore || 0,
        percentage: answers.percentage || audit.percentageScore || 0,
        status: audit.status || 'IN_PROGRESS'
      }));
      
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

  const handleScoreChange = (questionId, score) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [questionId]: score }
    }));
  };

  const handleCommentChange = (questionId, comment) => {
    setFormData(prev => ({
      ...prev,
      comments: { ...prev.comments, [questionId]: comment }
    }));
  };

  const calculateTotalScore = () => {
    let total = 0;
    questions.forEach(q => {
      total += formData.scores[q.slNo] || 0;
    });
    return total;
  };

  const calculatePercentage = () => {
    const total = calculateTotalScore();
    const maxPossible = questions.length * 4;
    return maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
  };

  const getSectionScore = (section) => {
    let total = 0;
    section.slNos.forEach(slNo => {
      total += formData.scores[slNo] || 0;
    });
    return total;
  };

  const getSectionPercentage = (section) => {
    const score = getSectionScore(section);
    return Math.round((score / section.maxScore) * 100);
  };

  
 const saveDraft = async () => {
  setSaving(true);
  try {
    if (!currentCheckSheet || !currentCheckSheet.id) {
      throw new Error('Check sheet not loaded. Please refresh and try again.');
    }
    
    const totalScore = calculateTotalScore();
    const maxPossibleScore = questions.length * 4;
    // ✅ Calculate percentage properly
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 100) / 100; // Keep 2 decimal places
    
    console.log('📊 Score Calculation:', {
      totalScore,
      maxPossibleScore,
      percentage: roundedPercentage,
      questionsCount: questions.length
    });
    
    const answersObject = {
      documentNumber: formData.documentNumber,
      department: formData.department,
      supervisor: formData.supervisor,
      area: formData.area,
      date: formData.date,
      time: formData.time,
      hodEmail: formData.hodEmail,
      scores: formData.scores,
      comments: formData.comments,
      totalScore: totalScore,
      percentage: roundedPercentage,  // ✅ Store percentage in answers
      auditorSignature: auditorSignatureImage || formData.auditorSignature,
      auditeeName: auditeeInfo.auditeeName,
      completedBy: formData.auditorName,
      formName: '5S Audit Checklist'
    };
    
    // ✅ Ensure auditorId is a valid number
    const auditorIdValue = formData.auditorId 
      ? (typeof formData.auditorId === 'string' ? parseInt(formData.auditorId) : formData.auditorId)
      : (user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null);
    
    const payload = {
      checkSheet: { id: currentCheckSheet.id },
      auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
      department: formData.department,
      shift: formData.shift,
      auditDate: formData.date,
      auditorName: formData.auditorName,
      auditorId: auditorIdValue,  // ✅ FIXED: Valid number
      auditeeId: auditeeInfo.auditeeId ? parseInt(auditeeInfo.auditeeId) : null,
      auditeeName: auditeeInfo.auditeeName,
      auditeeIds: auditeeInfo.auditeeIds,
      auditeeAcknowledged: false,
      answers: JSON.stringify(answersObject),
      totalScore: totalScore,
      maxPossibleScore: maxPossibleScore,
      percentageScore: roundedPercentage,  // ✅ FIXED: Include percentage score
      summary: null,
      recommendations: null,
      status: 'DRAFT'
    };
    
    console.log('💾 Saving payload:', {
      auditorId: payload.auditorId,
      percentageScore: payload.percentageScore,
      totalScore: payload.totalScore,
      maxPossibleScore: payload.maxPossibleScore
    });
    
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
      navigate(`/audit/five_s?edit=${saved.id}&scheduleId=${scheduleId}`, { replace: true });
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

  const unanswered = questions.filter(q => formData.scores[q.slNo] === undefined || formData.scores[q.slNo] === null);
  if (unanswered.length > 0) {
    addToast(`Please rate all ${unanswered.length} remaining questions`, 'error');
    setCurrentStep(2);
    setCurrentCheckpointIndex(questions.findIndex(q => formData.scores[q.slNo] === undefined));
    return;
  }

  if (!auditeeInfo.auditeeName?.trim()) {
    addToast('Please enter auditee name', 'error');
    setCurrentStep(3);
    return;
  }

  if (!auditorSignatureImage && !formData.auditorSignature.trim()) {
    addToast('Please provide auditor signature', 'error');
    setCurrentStep(3);
    return;
  }

  setSaving(true);
  try {
    if (!currentCheckSheet || !currentCheckSheet.id) {
      throw new Error('Check sheet not loaded. Please refresh and try again.');
    }
    
    const totalScore = calculateTotalScore();
    const maxPossibleScore = questions.length * 4;
    // ✅ Calculate percentage properly
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 100) / 100;
    
    console.log('📊 Submit Score Calculation:', {
      totalScore,
      maxPossibleScore,
      percentage: roundedPercentage
    });
    
    const answersObject = {
      documentNumber: formData.documentNumber,
      department: formData.department,
      supervisor: formData.supervisor,
      area: formData.area,
      date: formData.date,
      time: formData.time,
      hodEmail: formData.hodEmail,
      scores: formData.scores,
      comments: formData.comments,
      totalScore: totalScore,
      percentage: roundedPercentage,  // ✅ Store in answers
      auditorSignature: auditorSignatureImage || formData.auditorSignature,
      auditeeName: auditeeInfo.auditeeName,
      completedBy: formData.auditorName,
      formName: '5S Audit Checklist'
    };
    
    // ✅ Ensure auditorId is valid
    const auditorIdValue = formData.auditorId 
      ? (typeof formData.auditorId === 'string' ? parseInt(formData.auditorId) : formData.auditorId)
      : (user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null);
    
    const payload = {
      checkSheet: { id: currentCheckSheet.id },
      auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
      department: formData.department,
      shift: formData.shift,
      auditDate: formData.date,
      auditorName: formData.auditorName,
      auditorId: auditorIdValue,  // ✅ FIXED
      auditeeId: auditeeInfo.auditeeId ? parseInt(auditeeInfo.auditeeId) : null,
      auditeeName: auditeeInfo.auditeeName,
      auditeeIds: auditeeInfo.auditeeIds,
      auditeeAcknowledged: false,
      answers: JSON.stringify(answersObject),
      totalScore: totalScore,
      maxPossibleScore: maxPossibleScore,
      percentageScore: roundedPercentage,  // ✅ FIXED: Include percentage
      summary: null,
      recommendations: null,
      status: 'SUBMITTED'
    };
    
    console.log('✅ Submitting payload:', {
      auditorId: payload.auditorId,
      percentageScore: payload.percentageScore,
      totalScore: payload.totalScore
    });
    
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
    
    let ratingText = '';
    if (roundedPercentage >= 90) ratingText = 'Excellent!';
    else if (roundedPercentage >= 75) ratingText = 'Good';
    else if (roundedPercentage >= 60) ratingText = 'Needs Improvement';
    else ratingText = 'Poor - Immediate Action Required';
    
    addToast(`5S Audit submitted! Score: ${totalScore}/${maxPossibleScore} (${roundedPercentage}%) - ${ratingText}`, 'success');
    navigate('/auditor');
    
  } catch (error) {
    console.error('Error submitting audit:', error);
    addToast(`Failed to submit audit: ${error.message}`, 'error');
  } finally {
    setSaving(false);
  }
};

  const handleAutoFill = () => {
    const sampleComments = [
      "All unnecessary items removed. Work area well organized.",
      "No tripping hazards. Excellent cable management.",
      "Inventory optimized. Only required parts in stock.",
      "No unnecessary documents on walls. Information boards organized.",
      "Tools placed in ergonomic locations. Shadow boards excellent."
    ];
    
    const scores = [4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    
    questions.forEach((q, idx) => {
      handleScoreChange(q.slNo, scores[idx % scores.length]);
      handleCommentChange(q.slNo, sampleComments[idx % sampleComments.length]);
    });
    addToast('Demo data filled successfully', 'success');
  };

  const getProgressStats = () => {
    const total = questions.length;
    const rated = Object.keys(formData.scores).filter(key => formData.scores[key] !== null && formData.scores[key] !== undefined).length;
    const totalScore = calculateTotalScore();
    const maxScore = questions.length * 4;
    const percentage = totalScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    return { total, rated, totalScore, maxScore, percentage };
  };

  const stats = getProgressStats();
  const allQuestionsRated = stats.rated === stats.total;
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

  const getCurrentSection = () => {
    return FIVE_S_SECTIONS.find(s => s.slNos.includes(currentQ?.slNo));
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

  const getScoreColor = (score) => {
    if (score === 4) return 'border-green-500 bg-green-50';
    if (score === 3) return 'border-lime-500 bg-lime-50';
    if (score === 2) return 'border-yellow-500 bg-yellow-50';
    if (score === 1) return 'border-orange-500 bg-orange-50';
    if (score === 0) return 'border-red-500 bg-red-50';
    return 'border-gray-300 bg-white';
  };

  const steps = [
    { number: 1, title: 'General Information', icon: User },
    { number: 2, title: '5S Checkpoints', icon: ClipboardList },
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
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading 5S audit questions from database...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-green-500">
            <Sparkles size={64} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">No Questions Found</h2>
          <p className="text-gray-500">No checkpoints available for 5S audit.</p>
          <button
            onClick={() => navigate('/auditor')}
            className="px-4 py-2 mt-4 text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentSection = getCurrentSection();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl px-4 py-6 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/auditor')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <button
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
              >
                <Sparkles size={16} />
                Demo Auto-Fill
              </button>
            )}
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {currentStep === 3 && (
              <button
                onClick={() => {
                  isManualSubmitRef.current = true;
                  submitAudit();
                }}
                disabled={!allQuestionsRated || saving}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition ${
                  allQuestionsRated && !saving
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={16} />
                Submit Audit
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
                      isActive ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md' :
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <div className="ml-3 text-left">
                      <p className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>Step {step.number}</p>
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
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-green-600" />
                <h2 className="text-lg font-semibold text-gray-800">5S Audit - General Information</h2>
              </div>
              <p className="text-sm text-gray-500">Workplace Organization Audit - Sort, Set, Shine, Standardize, Sustain</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Audit Number</label>
                  <input 
                    type="text" 
                    value={formData.documentNumber} 
                    readOnly 
                    className="w-full px-3 py-2 bg-gray-100 border rounded-lg" 
                  />
                </div>
                
               <div>
  <label className="block mb-1 text-sm font-medium text-gray-700">
    Department <span className="text-red-500">*</span>
  </label>
  <input 
    type="text" 
    value={formData.department || ''} 
    onChange={(e) => handleInputChange('department', e.target.value)}
    placeholder="Department will be auto-filled from schedule"
    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
  />
  {scheduleId && (
    <p className="mt-1 text-xs text-green-600">✓ Department pre-filled from audit schedule</p>
  )}
</div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Auditor (Supervisor)</label>
                  <input 
                    type="text" 
                    value={formData.auditorName} 
                    readOnly 
                    className="w-full px-3 py-2 bg-gray-100 border rounded-lg" 
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Date</label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={(e) => handleInputChange('date', e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Specific Area/Location</label>
                  <input 
                    type="text" 
                    value={formData.area} 
                    onChange={(e) => handleInputChange('area', e.target.value)} 
                    placeholder="e.g., Assembly Line, Warehouse A, Machine Shop" 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Shift</label>
                  <select 
                    value={formData.shift} 
                    onChange={(e) => handleInputChange('shift', e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option>Morning</option>
                    <option>Evening</option>
                    <option>Night</option>
                    <option>General</option>
                  </select>
                </div>
              </div>
              
              {/* Rating Scale Info */}
              <div className="p-3 mt-4 rounded-lg bg-gray-50">
                <p className="mb-2 text-sm font-medium text-gray-700">Rating Scale:</p>
                <div className="grid grid-cols-5 gap-2 text-xs text-center">
                  <div className="p-1 bg-red-100 rounded">0 = No Compliance</div>
                  <div className="p-1 bg-orange-100 rounded">1 = Very Little Compliance</div>
                  <div className="p-1 bg-yellow-100 rounded">2 = Some Compliance</div>
                  <div className="p-1 rounded bg-lime-100">3 = Significant Compliance</div>
                  <div className="p-1 bg-green-100 rounded">4 = Total Compliance</div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Maximum Score: 4 points per question | Total Max: 144 points</p>
              </div>
            </div>
            <div className="flex justify-end p-6 pt-0">
              <button 
                onClick={nextStep} 
                className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 5S Checkpoints */}
        {currentStep === 2 && currentQ && (
          <div>
            {/* Progress Navigation */}
            <div className="p-4 mb-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Checkpoint {currentCheckpointIndex + 1} of {questions.length}</span>
                  {currentSection && (
                    <span className={`px-2 py-1 text-xs rounded-full bg-${currentSection.color}-100 text-${currentSection.color}-700`}>
                      {currentSection.name} (Max: {currentSection.maxScore})
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><Star size={12} /> Score: {stats.totalScore}/{stats.maxScore}</span>
                  <span className="flex items-center gap-1 text-blue-600"><TrendingUp size={12} /> {stats.percentage}%</span>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {questions.map((q, idx) => {
                  const hasScore = formData.scores[q.slNo] !== undefined && formData.scores[q.slNo] !== null;
                  const score = formData.scores[q.slNo];
                  
                  let buttonColorClass = '';
                  if (currentCheckpointIndex === idx) {
                    buttonColorClass = 'bg-green-600 text-white shadow-md ring-2 ring-green-300';
                  } else if (hasScore) {
                    if (score === 4) buttonColorClass = 'bg-green-500 text-white';
                    else if (score === 3) buttonColorClass = 'bg-lime-500 text-white';
                    else if (score === 2) buttonColorClass = 'bg-yellow-500 text-white';
                    else if (score === 1) buttonColorClass = 'bg-orange-500 text-white';
                    else buttonColorClass = 'bg-red-500 text-white';
                  } else {
                    buttonColorClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
                  }
                  
                  return (
                    <button
                      key={q.slNo}
                      ref={currentCheckpointIndex === idx ? activeButtonRef : null}
                      onClick={() => navigateToCheckpoint(idx)}
                      className={`min-w-[36px] w-9 h-9 text-sm font-medium rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${buttonColorClass}`}
                      title={`Question ${idx + 1}${hasScore ? ` - Score: ${score}/4` : ' - Not rated'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Card */}
            <div className={`bg-white rounded-lg shadow-md border-l-4 ${getScoreColor(formData.scores[currentQ.slNo])}`}>
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 text-white bg-green-600 rounded-full">
                      {currentQ.slNo}
                    </span>
                    {currentSection && (
                      <span className={`px-2 py-1 text-xs rounded-full bg-${currentSection.color}-100 text-${currentSection.color}-700`}>
                        {currentSection.name}
                      </span>
                    )}
                    {formData.scores[currentQ.slNo] !== undefined && formData.scores[currentQ.slNo] !== null && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        formData.scores[currentQ.slNo] === 4 ? 'bg-green-100 text-green-800' :
                        formData.scores[currentQ.slNo] === 3 ? 'bg-lime-100 text-lime-800' :
                        formData.scores[currentQ.slNo] === 2 ? 'bg-yellow-100 text-yellow-800' :
                        formData.scores[currentQ.slNo] === 1 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Score: {formData.scores[currentQ.slNo]}/4
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mb-3 text-lg font-semibold text-gray-800">{currentQ.checkpoint}</h3>

                {currentQ.documentsVerified && (
                  <div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50">
                    <p className="text-sm font-medium text-yellow-800">What to look for:</p>
                    <p className="text-sm text-yellow-700">{currentQ.documentsVerified}</p>
                  </div>
                )}

                {/* Score Options (0-4) */}
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Level of Judgment (Score) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {SCORE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleScoreChange(currentQ.slNo, option.value)}
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          formData.scores[currentQ.slNo] === option.value
                            ? `${option.value === 4 ? 'bg-green-100 border-green-500' : 
                               option.value === 3 ? 'bg-lime-100 border-lime-500' :
                               option.value === 2 ? 'bg-yellow-100 border-yellow-500' :
                               option.value === 1 ? 'bg-orange-100 border-orange-500' :
                               'bg-red-100 border-red-500'} shadow-md`
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                        title={option.description}
                      >
                        <div className="text-xl font-bold">{option.short}</div>
                        <div className="text-[10px] text-gray-500">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Comments / Actions to be taken
                  </label>
                  <textarea
                    value={formData.comments[currentQ.slNo] || ''}
                    onChange={(e) => handleCommentChange(currentQ.slNo, e.target.value)}
                    rows="3"
                    placeholder="Enter comments or actions to be taken..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex justify-between pt-4 mt-4 border-t">
                  <button
                    onClick={prevCheckpoint}
                    disabled={currentCheckpointIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="text-sm text-gray-500">
                    {formData.scores[currentQ.slNo] !== undefined && formData.scores[currentQ.slNo] !== null ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={14} /> Rated: {formData.scores[currentQ.slNo]}/4
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle size={14} /> Select Score
                      </span>
                    )}
                  </div>
                  <button
                    onClick={nextCheckpoint}
                    disabled={currentCheckpointIndex === questions.length - 1}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 rounded-lg disabled:opacity-50 hover:bg-green-700"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="p-4 mt-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">Overall 5S Score</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">{stats.totalScore}</span>
                  <span className="text-gray-500"> / {stats.maxScore}</span>
                  <span className="ml-2 text-sm text-gray-500">({stats.percentage}%)</span>
                </div>
              </div>
              
              {/* 5S Sections Progress */}
              <div className="grid grid-cols-5 gap-2 mt-2">
                {FIVE_S_SECTIONS.map((section) => {
                  const sectionScore = getSectionScore(section);
                  const percentage = getSectionPercentage(section);
                  return (
                    <div key={section.name} className="text-center">
                      <div className={`text-xs font-medium text-${section.color}-700`}>{section.name}</div>
                      <div className="text-lg font-bold text-gray-800">{sectionScore}</div>
                      <div className="text-[10px] text-gray-500">/ {section.maxScore}</div>
                      <div className="w-full h-1.5 mt-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-${section.color}-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {!allQuestionsRated && (
                <div className="p-2 mt-3 text-xs text-center rounded-lg text-amber-600 bg-amber-50">
                  ⚠️ Please rate all {stats.total - stats.rated} remaining checkpoints
                </div>
              )}
            </div>

            {allQuestionsRated && (
              <div className="flex justify-end mt-4">
                <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">
                  Next: Signature <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Signature & Submit - UPDATED with Auditee Name */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Signature & Submit</h2>
              <p className="text-sm text-gray-500">Review, sign and submit the 5S audit report</p>
            </div>
            <div className="p-6">
              <div className="p-4 mb-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Audit Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div><p className="text-xs text-gray-500">Total Questions</p><p className="text-xl font-bold text-gray-800">{stats.total}</p></div>
                  <div><p className="text-xs text-gray-500">Total Score</p><p className="text-xl font-bold text-green-600">{stats.totalScore}</p></div>
                  <div><p className="text-xs text-gray-500">Max Possible</p><p className="text-xl font-bold text-gray-800">{stats.maxScore}</p></div>
                  <div><p className="text-xs text-gray-500">Percentage</p><p className="text-xl font-bold text-blue-600">{stats.percentage}%</p></div>
                </div>
              </div>

              

              {/* Auditor Signature Field - With Image Display */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <FileCheck size={14} className="inline mr-1" /> Auditor Signature <span className="text-red-500">*</span>
                </label>
                
                {loadingSignature ? (
                  <div className="flex items-center justify-center p-4 border rounded-lg bg-gray-50">
                    <div className="w-5 h-5 border-2 border-green-500 rounded-full animate-spin border-t-transparent"></div>
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
                      className="w-full px-3 py-2 mt-3 border rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 mt-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

                {/* Auditee Name Field - Added like IATF form */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <User size={14} className="inline mr-1" /> Auditee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={auditeeInfo.auditeeName || ''}
                  onChange={(e) => setAuditeeInfo(prev => ({ ...prev, auditeeName: e.target.value }))}
                  placeholder="Enter auditee name"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              

              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => { isManualSubmitRef.current = true; submitAudit(); }}
                  disabled={(!auditorSignatureImage && !formData.auditorSignature.trim()) || !formData.date.trim() || !auditeeInfo.auditeeName?.trim() || saving || !allQuestionsRated}
                  className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition ${
                    (auditorSignatureImage || formData.auditorSignature.trim()) && formData.date.trim() && auditeeInfo.auditeeName?.trim() && !saving && allQuestionsRated
                      ? 'bg-green-600 hover:bg-green-700'
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