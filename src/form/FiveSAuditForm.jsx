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

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

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
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
.animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
`;

// 5S Score options (0-4 scale)
const SCORE_OPTIONS = [
  { value: 0, label: 'No Compliance', short: '0', description: 'Complete non-compliance, no evidence found' },
  { value: 1, label: 'Very Little Compliance', short: '1', description: 'Minimal compliance, major gaps identified' },
  { value: 2, label: 'Some Compliance', short: '2', description: 'Partial compliance, significant gaps' },
  { value: 3, label: 'Significant Compliance', short: '3', description: 'Good compliance, minor gaps' },
  { value: 4, label: 'Total Compliance', short: '4', description: 'Full compliance, best practice' }
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
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const scheduleId = searchParams.get('scheduleId');
  const urlDepartment = searchParams.get('department');
  const urlAuditeeId = searchParams.get('auditeeId');
  const urlAuditeeName = searchParams.get('auditeeName');
  const urlLocation = searchParams.get('location');
  
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [responseId, setResponseId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentCheckSheet, setCurrentCheckSheet] = useState(null);
  const [fiveSCheckSheetIds, setFiveSCheckSheetIds] = useState([]);
  
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
      } else {
        setSignatureError(true);
      }
    } catch (error) {
      console.error('Error fetching signature:', error);
      setSignatureError(true);
    } finally {
      setLoadingSignature(false);
    }
  };

  useEffect(() => {
    const fetchScheduleAuditeeInfo = async () => {
      if (scheduleId && !editId) {
        try {
          const response = await axios.get(`${API_BASE}/audit-schedule/${scheduleId}`, {  
 withCredentials: true });
          const schedule = response.data;
          setAuditeeInfo({
            auditeeId: schedule.auditeeId || urlAuditeeId || null,
            auditeeName: schedule.auditeeName || urlAuditeeName || null,
            auditeeIds: schedule.auditeeIds || []
          });
          if (schedule.department) {
            setFormData(prev => ({ ...prev, department: schedule.department }));
          } else if (urlDepartment) {
            setFormData(prev => ({ ...prev, department: urlDepartment }));
          }
          if (schedule.location) {
            setFormData(prev => ({ ...prev, area: schedule.location }));
          } else if (urlLocation) {
            setFormData(prev => ({ ...prev, area: urlLocation }));
          }
        } catch (error) {
          console.error('Error fetching schedule auditee info:', error);
          if (urlDepartment) setFormData(prev => ({ ...prev, department: urlDepartment }));
          if (urlAuditeeName) setAuditeeInfo(prev => ({ ...prev, auditeeName: urlAuditeeName }));
          if (urlLocation) setFormData(prev => ({ ...prev, area: urlLocation }));
        }
      }
    };
    fetchScheduleAuditeeInfo();
    fetchAuditorSignature();
  }, [scheduleId, editId]);

  const fetchFiveSCheckSheetIds = async () => {
    try {
      const response = await axios.get(`${API_BASE}/templates/type/FIVE_S`, {   
withCredentials: true });
      const fiveSSheets = response.data || [];
      const ids = fiveSSheets.map(sheet => sheet.id);
      setFiveSCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('Error fetching 5S check sheets:', error);
      return [];
    }
  };

  const fetchQuestionsFromBackend = async () => {
    setLoadingQuestions(true);
    try {
      const fiveSIds = await fetchFiveSCheckSheetIds();
      if (fiveSIds.length === 0) throw new Error('No 5S check sheets found in database');
      const checkSheetId = fiveSIds[0];
      const response = await axios.get(`${API_BASE}/templates/${checkSheetId}`, {   
withCredentials: true });
      const checkSheet = response.data;
      setCurrentCheckSheet(checkSheet);
      
      let parsedQuestions = [];
      if (checkSheet.questions) {
        try {
          parsedQuestions = typeof checkSheet.questions === 'string' ? JSON.parse(checkSheet.questions) : checkSheet.questions;
        } catch (e) {
          console.error('Error parsing questions:', e);
        }
      }
      
      const formattedQuestions = parsedQuestions.map((q, idx) => ({
        slNo: q.sNo || q.slNo || (idx + 1),
        checkpoint: q.displayLabel,
        category: q.category || '',
        documentsVerified: q.documentsVerified || q.consideration || q.whatToLookFor || q.method || '',
        fieldKey: q.fieldKey,
        fieldType: q.fieldType,
        maxRating: q.maxRating || 4
      }));
      
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
    
    let decodedDepartment = '';
    if (urlDepartment && urlDepartment !== 'undefined' && urlDepartment !== 'null') {
      try { decodedDepartment = decodeURIComponent(urlDepartment); } catch (e) { decodedDepartment = urlDepartment; }
    }
    let decodedAuditeeName = '';
    if (urlAuditeeName && urlAuditeeName !== 'undefined' && urlAuditeeName !== 'null') {
      try { decodedAuditeeName = decodeURIComponent(urlAuditeeName); } catch (e) { decodedAuditeeName = urlAuditeeName; }
    }
    let decodedLocation = '';
    if (urlLocation && urlLocation !== 'undefined' && urlLocation !== 'null') {
      try { decodedLocation = decodeURIComponent(urlLocation); } catch (e) { decodedLocation = urlLocation; }
    }
    
    const auditorIdValue = user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null;
    
    setFormData(prev => ({
      ...prev,
      documentNumber: generateDocumentNumber(sheetKey),
      date: formattedDate,
      time: formattedTime,
      auditorName: user?.name || '',
      auditorId: auditorIdValue,
      department: decodedDepartment || prev.department,
      area: decodedLocation || prev.area,
    }));
    
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
      setFormData(prev => ({ ...prev, auditorName: user.name || '' }));
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
        } catch (e) { answers = {}; }
        
        const savedScores = answers.scores || {};
        const savedComments = answers.comments || {};
        const savedAuditeeName = answers.auditeeName || audit.auditeeName || '';
        const savedDepartment = answers.department || audit.department || '';
        
        setAuditeeInfo(prev => ({ ...prev, auditeeName: savedAuditeeName, auditeeId: audit.auditeeId || prev.auditeeId }));
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

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleScoreChange = (questionId, score) => setFormData(prev => ({ ...prev, scores: { ...prev.scores, [questionId]: score } }));
  const handleCommentChange = (questionId, comment) => setFormData(prev => ({ ...prev, comments: { ...prev.comments, [questionId]: comment } }));

  const calculateTotalScore = () => {
    let total = 0;
    questions.forEach(q => { total += formData.scores[q.slNo] || 0; });
    return total;
  };

  const calculatePercentage = () => {
    const total = calculateTotalScore();
    const maxPossible = questions.length * 4;
    return maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
  };

  const getSectionScore = (section) => {
    let total = 0;
    section.slNos.forEach(slNo => { total += formData.scores[slNo] || 0; });
    return total;
  };

  const getSectionPercentage = (section) => {
    const score = getSectionScore(section);
    return Math.round((score / section.maxScore) * 100);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      if (!currentCheckSheet || !currentCheckSheet.id) throw new Error('Check sheet not loaded. Please refresh and try again.');
      const totalScore = calculateTotalScore();
      const maxPossibleScore = questions.length * 4;
      const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      const roundedPercentage = Math.round(percentage * 100) / 100;
      
      const answersObject = {
        documentNumber: formData.documentNumber, department: formData.department, supervisor: formData.supervisor,
        area: formData.area, date: formData.date, time: formData.time, hodEmail: formData.hodEmail,
        scores: formData.scores, comments: formData.comments, totalScore: totalScore, percentage: roundedPercentage,
        auditorSignature: auditorSignatureImage || formData.auditorSignature, auditeeName: auditeeInfo.auditeeName,
        completedBy: formData.auditorName, formName: '5S Audit Checklist'
      };
      
      const auditorIdValue = formData.auditorId ? (typeof formData.auditorId === 'string' ? parseInt(formData.auditorId) : formData.auditorId) : (user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null);
      
      const payload = {
        checkSheet: { id: currentCheckSheet.id }, auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
        department: formData.department, shift: formData.shift, auditDate: formData.date,
        auditorName: formData.auditorName, auditorId: auditorIdValue, auditeeId: auditeeInfo.auditeeId ? parseInt(auditeeInfo.auditeeId) : null,
        auditeeName: auditeeInfo.auditeeName, auditeeIds: auditeeInfo.auditeeIds, auditeeAcknowledged: false,
        answers: JSON.stringify(answersObject), totalScore: totalScore, maxPossibleScore: maxPossibleScore,
        percentageScore: roundedPercentage, summary: null, recommendations: null, status: 'DRAFT'
      };
      
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
      if (!currentCheckSheet || !currentCheckSheet.id) throw new Error('Check sheet not loaded. Please refresh and try again.');
      const totalScore = calculateTotalScore();
      const maxPossibleScore = questions.length * 4;
      const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      const roundedPercentage = Math.round(percentage * 100) / 100;
      
      const answersObject = {
        documentNumber: formData.documentNumber, department: formData.department, supervisor: formData.supervisor,
        area: formData.area, date: formData.date, time: formData.time, hodEmail: formData.hodEmail,
        scores: formData.scores, comments: formData.comments, totalScore: totalScore, percentage: roundedPercentage,
        auditorSignature: auditorSignatureImage || formData.auditorSignature, auditeeName: auditeeInfo.auditeeName,
        completedBy: formData.auditorName, formName: '5S Audit Checklist'
      };
      
      const auditorIdValue = formData.auditorId ? (typeof formData.auditorId === 'string' ? parseInt(formData.auditorId) : formData.auditorId) : (user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null);
      
      const payload = {
        checkSheet: { id: currentCheckSheet.id }, auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
        department: formData.department, shift: formData.shift, auditDate: formData.date,
        auditorName: formData.auditorName, auditorId: auditorIdValue, auditeeId: auditeeInfo.auditeeId ? parseInt(auditeeInfo.auditeeId) : null,
        auditeeName: auditeeInfo.auditeeName, auditeeIds: auditeeInfo.auditeeIds, auditeeAcknowledged: false,
        answers: JSON.stringify(answersObject), totalScore: totalScore, maxPossibleScore: maxPossibleScore,
        percentageScore: roundedPercentage, summary: null, recommendations: null, status: 'SUBMITTED'
      };
      
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

  const getCurrentSection = () => FIVE_S_SECTIONS.find(s => s.slNos.includes(currentQ?.slNo));

  const handleKeyDown = useCallback((e) => {
    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT') return;
    if (currentStep === 2) {
      switch(e.key) {
        case 'ArrowLeft': e.preventDefault(); if (currentCheckpointIndex > 0) prevCheckpoint(); break;
        case 'ArrowRight': e.preventDefault(); if (currentCheckpointIndex < questions.length - 1) nextCheckpoint(); break;
        default: break;
      }
    }
  }, [currentStep, currentCheckpointIndex, questions.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getScoreColor = (score) => {
    if (score === 4) return 'border-emerald-500';
    if (score === 3) return 'border-lime-500';
    if (score === 2) return 'border-amber-500';
    if (score === 1) return 'border-orange-500';
    if (score === 0) return 'border-rose-500';
    return 'border-slate-200';
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
          <p className="text-sm font-medium text-slate-500">Loading 5S audit questions from database...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
          <p className="text-sm font-medium text-slate-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
            <Sparkles size={48} style={{ color: NAVBAR_COLORS.primary }} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-800">No Questions Found</h2>
          <p className="text-sm text-slate-500">No checkpoints available for 5S audit.</p>
          <button
            onClick={() => navigate('/auditor')}
            className="px-5 py-2.5 mt-4 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const currentSection = getCurrentSection();

  return (
    <div className="min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      <div className="max-w-4xl px-4 py-8 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fadeInUp">
          <button
            onClick={() => navigate('/auditor')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <button
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg rounded-xl"
                style={{ backgroundColor: NAVBAR_COLORS.secondary }}
              >
                <Sparkles size={16} />
                Demo Auto-Fill
              </button>
            )}
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all disabled:opacity-50"
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
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all rounded-xl ${
                  allQuestionsRated && !saving ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                }`}
                style={{ backgroundColor: allQuestionsRated && !saving ? NAVBAR_COLORS.primary : '#94a3b8' }}
              >
                <Send size={16} />
                Submit Audit
              </button>
            )}
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-8 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
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
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 shadow-sm ${
                      isActive || isCompleted ? 'text-white' : 'bg-slate-100 text-slate-500'
                    }`} style={{ backgroundColor: isActive || isCompleted ? NAVBAR_COLORS.primary : undefined }}>
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <div className="ml-3 text-left">
                      <p className="text-xs font-medium" style={{ color: isActive ? NAVBAR_COLORS.secondary : '#64748b' }}>Step {step.number}</p>
                      <p className={`text-sm font-semibold ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{step.title}</p>
                    </div>
                  </button>
                  {step.number < steps.length && (
                    <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${isCompleted ? 'bg-blue-500' : 'bg-slate-200'}`} style={{ backgroundColor: isCompleted ? NAVBAR_COLORS.secondary : undefined }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <div className="bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="p-6 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.lighter }}>
                  <Sparkles size={20} style={{ color: NAVBAR_COLORS.primary }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">5S Audit - General Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Workplace Organization Audit - Sort, Set, Shine, Standardize, Sustain</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Audit Number</label>
                  <input type="text" value={formData.documentNumber} readOnly className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Department <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} placeholder="Department will be auto-filled from schedule" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  {scheduleId && <p className="mt-1 text-xs font-medium" style={{ color: NAVBAR_COLORS.secondary }}>✓ Department pre-filled from audit schedule</p>}
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Auditor (Supervisor)</label>
                  <input type="text" value={formData.auditorName} readOnly className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Specific Area/Location</label>
                  <input type="text" value={formData.area} onChange={(e) => handleInputChange('area', e.target.value)} placeholder="e.g., Assembly Line, Warehouse A" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Shift</label>
                  <select value={formData.shift} onChange={(e) => handleInputChange('shift', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option>Morning</option><option>Evening</option><option>Night</option><option>General</option>
                  </select>
                </div>
              </div>
              
              <div className="p-4 mt-6 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                <p className="mb-3 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>Rating Scale:</p>
                <div className="grid grid-cols-5 gap-2 text-xs text-center">
                  <div className="p-2 font-medium bg-white border rounded-lg border-rose-200 text-rose-700">0 = No Compliance</div>
                  <div className="p-2 font-medium text-orange-700 bg-white border border-orange-200 rounded-lg">1 = Very Little</div>
                  <div className="p-2 font-medium bg-white border rounded-lg border-amber-200 text-amber-700">2 = Some</div>
                  <div className="p-2 font-medium bg-white border rounded-lg border-lime-200 text-lime-700">3 = Significant</div>
                  <div className="p-2 font-medium bg-white border rounded-lg border-emerald-200 text-emerald-700">4 = Total</div>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500">Maximum Score: 4 points per question | Total Max: 144 points</p>
              </div>
            </div>
            <div className="flex justify-end p-6 pt-0">
              <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                Next Step <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 5S Checkpoints */}
        {currentStep === 2 && currentQ && (
          <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">Checkpoint {currentCheckpointIndex + 1} of {questions.length}</span>
                  {currentSection && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>
                      {currentSection.name} (Max: {currentSection.maxScore})
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5" style={{ color: NAVBAR_COLORS.primary }}><Star size={12} /> Score: {stats.totalScore}/{stats.maxScore}</span>
                  <span className="flex items-center gap-1.5 text-slate-500"><TrendingUp size={12} /> {stats.percentage}%</span>
                </div>
              </div>
              <div className="flex gap-2 pb-2 overflow-x-auto">
                {questions.map((q, idx) => {
                  const hasScore = formData.scores[q.slNo] !== undefined && formData.scores[q.slNo] !== null;
                  const score = formData.scores[q.slNo];
                  let buttonStyle = {};
                  let buttonClass = 'min-w-[36px] w-9 h-9 text-sm font-medium rounded-lg transition-all flex items-center justify-center flex-shrink-0 border ';
                  
                  if (currentCheckpointIndex === idx) {
                    buttonStyle = { backgroundColor: NAVBAR_COLORS.primary, borderColor: NAVBAR_COLORS.primary, color: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
                  } else if (hasScore) {
                    if (score === 4) buttonStyle = { backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#166534' };
                    else if (score === 3) buttonStyle = { backgroundColor: '#ecfccb', borderColor: '#bef264', color: '#3f6212' };
                    else if (score === 2) buttonStyle = { backgroundColor: '#fef9c3', borderColor: '#fde047', color: '#854d0e' };
                    else if (score === 1) buttonStyle = { backgroundColor: '#ffedd5', borderColor: '#fdba74', color: '#9a3412' };
                    else buttonStyle = { backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' };
                  } else {
                    buttonStyle = { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' };
                    buttonClass += 'hover:bg-slate-100 ';
                  }
                  
                  return (
                    <button key={q.slNo} ref={currentCheckpointIndex === idx ? activeButtonRef : null} onClick={() => navigateToCheckpoint(idx)} className={buttonClass} style={buttonStyle} title={`Question ${idx + 1}${hasScore ? ` - Score: ${score}/4` : ' - Not rated'}`}>
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`bg-white border shadow-sm border-slate-200 rounded-2xl overflow-hidden`}>
              <div className={`p-6 border-l-4 ${getScoreColor(formData.scores[currentQ.slNo])}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 text-white shadow-md rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                      {currentQ.slNo}
                    </span>
                    {currentSection && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>
                        {currentSection.name}
                      </span>
                    )}
                    {formData.scores[currentQ.slNo] !== undefined && formData.scores[currentQ.slNo] !== null && (
                      <span className="px-3 py-1 text-xs font-semibold border rounded-full bg-slate-100 text-slate-700 border-slate-200">
                        Score: {formData.scores[currentQ.slNo]}/4
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mb-4 text-lg font-bold text-slate-800">{currentQ.checkpoint}</h3>

                {currentQ.documentsVerified && (
                  <div className="p-4 mb-5 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                    <p className="mb-1 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>What to look for:</p>
                    <p className="text-sm text-slate-600">{currentQ.documentsVerified}</p>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block mb-3 text-sm font-bold text-slate-700">Level of Judgment (Score) <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-5 gap-3">
                    {SCORE_OPTIONS.map(option => {
                      const isSelected = formData.scores[currentQ.slNo] === option.value;
                      let bg = 'white', border = '#e2e8f0', text = '#64748b';
                      if (isSelected) {
                        if (option.value === 4) { bg = '#dcfce7'; border = '#22c55e'; text = '#166534'; }
                        else if (option.value === 3) { bg = '#ecfccb'; border = '#84cc16'; text = '#3f6212'; }
                        else if (option.value === 2) { bg = '#fef9c3'; border = '#eab308'; text = '#854d0e'; }
                        else if (option.value === 1) { bg = '#ffedd5'; border = '#f97316'; text = '#9a3412'; }
                        else { bg = '#fee2e2'; border = '#ef4444'; text = '#991b1b'; }
                      }
                      return (
                        <button key={option.value} onClick={() => handleScoreChange(currentQ.slNo, option.value)} className="p-3 text-center transition-all border-2 shadow-sm rounded-xl hover:shadow-md" style={{ backgroundColor: bg, borderColor: isSelected ? border : '#e2e8f0', color: isSelected ? text : '#64748b' }} title={option.description}>
                          <div className="text-2xl font-bold">{option.short}</div>
                          <div className="text-[10px] font-medium mt-1">{option.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-sm font-bold text-slate-700">Comments / Actions to be taken</label>
                  <textarea value={formData.comments[currentQ.slNo] || ''} onChange={(e) => handleCommentChange(currentQ.slNo, e.target.value)} rows="3" placeholder="Enter comments or actions to be taken..." className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div className="flex justify-between pt-5 mt-5 border-t border-slate-100">
                  <button onClick={prevCheckpoint} disabled={currentCheckpointIndex === 0} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 shadow-sm transition-all">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="text-sm font-medium">
                    {formData.scores[currentQ.slNo] !== undefined && formData.scores[currentQ.slNo] !== null ? (
                      <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle size={14} /> Rated: {formData.scores[currentQ.slNo]}/4</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-600"><AlertCircle size={14} /> Select Score</span>
                    )}
                  </div>
                  <button onClick={nextCheckpoint} disabled={currentCheckpointIndex === questions.length - 1} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 mt-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star size={16} style={{ color: NAVBAR_COLORS.secondary }} />
                  <span className="text-sm font-bold text-slate-700">Overall 5S Score</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{stats.totalScore}</span>
                  <span className="text-slate-500"> / {stats.maxScore}</span>
                  <span className="ml-2 text-sm font-medium text-slate-500">({stats.percentage}%)</span>
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-3 mt-4">
                {FIVE_S_SECTIONS.map((section) => {
                  const sectionScore = getSectionScore(section);
                  const percentage = getSectionPercentage(section);
                  return (
                    <div key={section.name} className="p-3 text-center border bg-slate-50 rounded-xl border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{section.name}</div>
                      <div className="mt-1 text-lg font-bold text-slate-800">{sectionScore}</div>
                      <div className="text-[10px] text-slate-400">/ {section.maxScore}</div>
                      <div className="w-full h-1.5 mt-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${percentage}%`, backgroundColor: NAVBAR_COLORS.secondary }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {!allQuestionsRated && (
                <div className="p-3 mt-4 text-xs font-medium text-center border rounded-xl text-amber-700 bg-amber-50 border-amber-200">
                  ⚠️ Please rate all {stats.total - stats.rated} remaining checkpoints
                </div>
              )}
            </div>

            {allQuestionsRated && (
              <div className="flex justify-end mt-6">
                <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                  Next: Signature <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Signature & Submit */}
        {currentStep === 3 && (
          <div className="bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="p-6 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <h2 className="text-lg font-bold text-slate-800">Signature & Submit</h2>
              <p className="text-xs text-slate-500 mt-0.5">Review, sign and submit the 5S audit report</p>
            </div>
            <div className="p-6">
              <div className="p-5 mb-6 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                <h3 className="mb-4 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>Audit Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Questions</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Score</p>
                    <p className="mt-1 text-xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{stats.totalScore}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Possible</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{stats.maxScore}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Percentage</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{stats.percentage}%</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-sm font-bold text-slate-700">
                  <FileCheck size={14} className="inline mr-1" /> Auditor Signature <span className="text-rose-500">*</span>
                </label>
                {loadingSignature ? (
                  <div className="flex items-center justify-center p-5 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                    <span className="ml-2 text-sm font-medium text-slate-500">Loading signature...</span>
                  </div>
                ) : auditorSignatureImage ? (
                  <div className="p-5 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                    <img src={auditorSignatureImage} alt="Auditor Signature" className="object-contain max-h-20" />
                    <p className="mt-2 text-xs font-medium" style={{ color: NAVBAR_COLORS.secondary }}>✓ Signature loaded from your profile</p>
                  </div>
                ) : signatureError ? (
                  <div className="p-5 border rounded-xl bg-amber-50 border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">No signature found in your profile</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">Please upload your signature in your profile settings. You can still proceed with typed signature below.</p>
                    <input type="text" value={formData.auditorSignature} onChange={(e) => handleInputChange('auditorSignature', e.target.value)} placeholder="Type your full name as signature (fallback)" className="w-full px-3 py-2.5 mt-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                ) : (
                  <div className="p-5 border rounded-xl bg-slate-50 border-slate-200">
                    <p className="text-sm font-medium text-slate-500">No signature loaded. Please type your signature below.</p>
                    <input type="text" value={formData.auditorSignature} onChange={(e) => handleInputChange('auditorSignature', e.target.value)} placeholder="Type your full name as signature" className="w-full px-3 py-2.5 mt-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-sm font-bold text-slate-700">
                  <Calendar size={14} className="inline mr-1" /> Date <span className="text-rose-500">*</span>
                </label>
                <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-sm font-bold text-slate-700">
                  <User size={14} className="inline mr-1" /> Auditee Name <span className="text-rose-500">*</span>
                </label>
                <input type="text" value={auditeeInfo.auditeeName || ''} onChange={(e) => setAuditeeInfo(prev => ({ ...prev, auditeeName: e.target.value }))} placeholder="Enter auditee name" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
                <button onClick={prevStep} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => { isManualSubmitRef.current = true; submitAudit(); }}
                  disabled={(!auditorSignatureImage && !formData.auditorSignature.trim()) || !formData.date.trim() || !auditeeInfo.auditeeName?.trim() || saving || !allQuestionsRated}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-md transition-all ${
                    (auditorSignatureImage || formData.auditorSignature.trim()) && formData.date.trim() && auditeeInfo.auditeeName?.trim() && !saving && allQuestionsRated ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: (auditorSignatureImage || formData.auditorSignature.trim()) && formData.date.trim() && auditeeInfo.auditeeName?.trim() && !saving && allQuestionsRated ? NAVBAR_COLORS.primary : '#94a3b8' }}
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