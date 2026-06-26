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

// Define STATUS_OPTIONS locally
const STATUS_OPTIONS = [
  { value: 'COMPLIANT', label: 'Compliant', short: 'C', icon: CheckCircle },
  { value: 'MINOR', label: 'Minor NC', short: 'Minor', icon: AlertCircle },
  { value: 'MAJOR', label: 'Major NC', short: 'Major', icon: AlertCircle },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', short: 'N/A', icon: Flag }
];

// Helper for status colors
const getStatusStyle = (status) => {
  switch(status) {
    case 'COMPLIANT': return { bg: '#ecfdf5', border: '#10b981', text: '#047857' }; // Emerald
    case 'MINOR': return { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' }; // Amber
    case 'MAJOR': return { bg: '#fff1f2', border: '#f43f5e', text: '#be123c' }; // Rose
    case 'NOT_APPLICABLE': return { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b' }; // Slate
    default: return { bg: '#ffffff', border: '#e2e8f0', text: '#64748b' };
  }
};

// Document number generator
const generateDocumentNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AUD/QMS/MP/${year}${month}/${random}`;
};

const getWEFDate = () => new Date().toISOString().split('T')[0];
const getRevisionDate = () => new Date().toISOString().split('T')[0];
const getIssueDate = () => new Date().toISOString().split('T')[0];
const getRevisionNumber = () => '00';

const calculateScore = (responses, questions) => {
  if (!questions || questions.length === 0) return 0;
  const total = questions.length;
  const compliant = Object.values(responses).filter(r => r === 'COMPLIANT').length;
  return total > 0 ? Math.round((compliant / total) * 100) : 0;
};

const MANUFACTURING_CHECK_SHEET_ID = 1;

export default function ManufacturingProcessAuditForm() {
  const { user } = useAuth();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
  const progressContainerRef = useRef(null);
  const activeButtonRef = useRef(null);
  const auditLoaded = useRef(false);
  const isManualSubmitRef = useRef(false);
  const [responseId, setResponseId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sheetConfig, setSheetConfig] = useState(null);
  const [allQuestionsData, setAllQuestionsData] = useState([]);

  const [auditorSignatureImage, setAuditorSignatureImage] = useState(null);
  const [auditorSignatureBase64, setAuditorSignatureBase64] = useState(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [signatureError, setSignatureError] = useState(false);

  const sheetKey = 'manufacturing_process';
  const statusOptions = STATUS_OPTIONS;

  const [formData, setFormData] = useState({
    documentNumber: '', auditNumber: '', wefDate: '', revNo: '', revDate: '', issueDate: '',
    department: '', partNumber: '', machine: '', date: '', shift: 'Morning', time: '', location: '',
    auditorName: '', auditorId: '', auditeeName: '', auditeeId: '',
    hodEmail: '', status: 'IN_PROGRESS', responses: {}, observations: {}, documentsVerified: {},
    score: null, auditorSignature: '', createdAt: ''
  });

  const fetchAuditorSignature = async () => {
    if (!user?.id) { setLoadingSignature(false); return; }
    setLoadingSignature(true); setSignatureError(false);
    try {
      const signatureBase64 = await auditAPI.fetchSignatureById(user.id);
      if (signatureBase64) {
        setAuditorSignatureBase64(signatureBase64); setAuditorSignatureImage(signatureBase64);
        setFormData(prev => ({ ...prev, auditorSignature: signatureBase64 }));
      } else { setSignatureError(true); }
    } catch (error) { console.error('Error fetching signature:', error); setSignatureError(true); } 
    finally { setLoadingSignature(false); }
  };

  const fetchQuestionsFromBackend = async () => {
    setLoadingQuestions(true);
    try {
      const response = await axios.get(`${API_BASE}/templates/${MANUFACTURING_CHECK_SHEET_ID}`, {
  withCredentials: true
});
      const checkSheet = response.data;
      setSheetConfig(checkSheet);
      let parsedQuestions = [];
      if (checkSheet.questions) {
        try { parsedQuestions = typeof checkSheet.questions === 'string' ? JSON.parse(checkSheet.questions) : checkSheet.questions; } 
        catch (e) { console.error('Error parsing questions:', e); }
      }
      const formattedQuestions = parsedQuestions.map(q => ({
        slNo: q.sNo || q.slNo, checkpoint: q.displayLabel || q.checkpoint,
        clause: q.clauseNo || q.category || q.clause || '',
        consideration: q.consideration || q.whatToLookFor || q.documentsVerified || '',
        fieldKey: q.fieldKey, fieldType: q.fieldType || 'rating', maxRating: q.maxRating || 4,
        category: q.category || '', method: q.method || '', frequency: q.frequency || ''
      }));
      setQuestions(formattedQuestions); setAllQuestionsData(formattedQuestions);
      const initialResponses = {}, initialObservations = {}, initialDocumentsVerified = {};
      formattedQuestions.forEach(q => { initialResponses[q.slNo] = ''; initialObservations[q.slNo] = ''; initialDocumentsVerified[q.slNo] = ''; });
      setFormData(prev => ({ ...prev, responses: { ...prev.responses, ...initialResponses }, observations: { ...prev.observations, ...initialObservations }, documentsVerified: { ...prev.documentsVerified, ...initialDocumentsVerified } }));
    } catch (error) { console.error('Error fetching questions:', error); addToast('Failed to load audit questions', 'error'); } 
    finally { setLoadingQuestions(false); }
  };

  useEffect(() => {
    fetchQuestionsFromBackend(); fetchAuditorSignature();
    const currentTime = new Date();
    const formattedDate = currentTime.toISOString().split('T')[0];
    const formattedTime = currentTime.toLocaleTimeString();
    let decodedAuditeeName = '', decodedDepartment = '', decodedLocation = '';
    if (urlAuditeeName && urlAuditeeName !== 'undefined' && urlAuditeeName !== 'null') { try { decodedAuditeeName = decodeURIComponent(urlAuditeeName); } catch (e) { decodedAuditeeName = urlAuditeeName; } }
    if (urlDepartment && urlDepartment !== 'undefined' && urlDepartment !== 'null') { try { decodedDepartment = decodeURIComponent(urlDepartment); } catch (e) { decodedDepartment = urlDepartment; } }
    if (urlLocation && urlLocation !== 'undefined' && urlLocation !== 'null') { try { decodedLocation = decodeURIComponent(urlLocation); } catch (e) { decodedLocation = urlLocation; } }

    setFormData(prev => ({
      ...prev, documentNumber: generateDocumentNumber(), auditNumber: `AUD-${Date.now()}`,
      wefDate: getWEFDate(), revNo: getRevisionNumber(), revDate: getRevisionDate(), issueDate: getIssueDate(),
      date: formattedDate, time: formattedTime, auditorName: user?.name || '',
      auditorId: user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : '',
      auditorSignature: user?.name || '', auditeeName: decodedAuditeeName || prev.auditeeName,
      auditeeId: urlAuditeeId || prev.auditeeId, department: decodedDepartment || prev.department, location: decodedLocation || prev.location
    }));
  }, []);

  useEffect(() => { if (editId && questions.length > 0) loadAuditData(); }, [editId, questions]);
  useEffect(() => { if (user?.id && !editId) setFormData(prev => ({ ...prev, auditorName: user.name || '', auditorSignature: user.name || '' })); }, [user, editId]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAuditResponse(parseInt(editId));
      const audit = response.data;
      if (audit) {
        setResponseId(audit.id);
        let answers = {};
        try { answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : audit.answers; } catch (e) { answers = {}; }
        setFormData({
          documentNumber: answers.documentNumber || generateDocumentNumber(), auditNumber: answers.auditNumber || `AUD-${Date.now()}`,
          wefDate: answers.wefDate || getWEFDate(), revNo: answers.revNo || getRevisionNumber(), revDate: answers.revDate || getRevisionDate(), issueDate: answers.issueDate || getIssueDate(),
          department: answers.department || audit.department || '', partNumber: answers.partNumber || '', machine: answers.machine || '',
          date: answers.date || new Date().toISOString().split('T')[0], shift: audit.shift || 'Morning', time: answers.time || new Date().toLocaleTimeString(), location: answers.location || '',
          auditorName: audit.auditorName || user?.name || '', auditorId: audit.auditorId || user?.id, auditeeName: audit.auditeeName || answers.auditeeName || '', auditeeId: audit.auditeeId || answers.auditeeId || '',
          hodEmail: answers.hodEmail || '', status: audit.status || 'IN_PROGRESS', responses: answers.responses || {}, observations: answers.observations || {}, documentsVerified: answers.documentsVerified || {},
          score: answers.score || null, auditorSignature: answers.auditorSignature || '', createdAt: audit.createdAt || new Date().toISOString()
        });
        auditLoaded.current = true;
      }
    } catch (error) { console.error('Error loading audit:', error); addToast('Failed to load audit data', 'error'); } 
    finally { setLoading(false); }
  };

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleObservationChange = (questionId, observation) => setFormData(prev => ({ ...prev, observations: { ...prev.observations, [questionId]: observation } }));
  const handleStatusChange = (questionId, status) => setFormData(prev => ({ ...prev, responses: { ...prev.responses, [questionId]: status } }));
  const calculateCurrentScore = () => calculateScore(formData.responses, questions);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.responses).filter(r => r === 'COMPLIANT').length;
      const minorCount = Object.values(formData.responses).filter(r => r === 'MINOR').length;
      const majorCount = Object.values(formData.responses).filter(r => r === 'MAJOR').length;
      let totalScorePercentage = 0;
      if (totalQuestions > 0) { const weightedScore = (compliantCount * 100) + (minorCount * 50) + (majorCount * 0); totalScorePercentage = weightedScore / totalQuestions; }
      const answersObject = { ...formData, responses: formData.responses, observations: formData.observations, documentsVerified: formData.documentsVerified, score: totalScorePercentage };
      const auditorIdNumber = formData.auditorId && !isNaN(parseInt(formData.auditorId)) ? parseInt(formData.auditorId) : (user?.id ? parseInt(user.id) : null);
      const payload = {
        checkSheet: { id: MANUFACTURING_CHECK_SHEET_ID }, auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
        department: formData.department, shift: formData.shift, auditDate: formData.date,
        auditorName: formData.auditorName, auditorId: auditorIdNumber, auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId ? parseInt(formData.auditeeId) : null, answers: JSON.stringify(answersObject),
        totalScore: compliantCount, maxPossibleScore: totalQuestions, percentageScore: totalScorePercentage, summary: null, recommendations: null, status: 'DRAFT'
      };
      let saved;
      if (responseId) { await auditScheduleApi.updateAuditResponse(responseId, payload); saved = { id: responseId }; addToast('Draft updated successfully', 'success'); } 
      else { const response = await auditScheduleApi.saveAuditResponse(payload); saved = response.data; setResponseId(saved.id); addToast('Draft saved successfully', 'success'); navigate(`/audit/manufacturing-process?edit=${saved.id}`, { replace: true }); }
    } catch (error) { console.error('Error saving draft:', error); addToast(`Failed to save draft: ${error.message}`, 'error'); } 
    finally { setSaving(false); }
  };

  const submitAudit = async () => {
    if (!isManualSubmitRef.current) return;
    isManualSubmitRef.current = false;
    const unanswered = questions.filter(q => !formData.responses[q.slNo]);
    if (unanswered.length > 0) { addToast(`Please answer all ${unanswered.length} remaining questions`, 'error'); setCurrentStep(2); return; }
    setSaving(true);
    try {
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.responses).filter(r => r === 'COMPLIANT').length;
      const minorCount = Object.values(formData.responses).filter(r => r === 'MINOR').length;
      const majorCount = Object.values(formData.responses).filter(r => r === 'MAJOR').length;
      let percentageScore = 0;
      if (totalQuestions > 0) { const weightedScore = (compliantCount * 100) + (minorCount * 50) + (majorCount * 0); percentageScore = weightedScore / totalQuestions; }
      const answersObject = { ...formData, auditorSignature: auditorSignatureImage || formData.auditorSignature, formName: sheetConfig?.name || 'Manufacturing Process Audit', questionsData: allQuestionsData, score: percentageScore };
      const auditorIdNumber = formData.auditorId && !isNaN(parseInt(formData.auditorId)) ? parseInt(formData.auditorId) : (user?.id ? parseInt(user.id) : null);
      const payload = {
        checkSheet: { id: MANUFACTURING_CHECK_SHEET_ID }, auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
        department: formData.department, shift: formData.shift, auditDate: formData.date,
        auditorName: formData.auditorName, auditorId: auditorIdNumber, auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId ? parseInt(formData.auditeeId) : null, answers: JSON.stringify(answersObject),
        totalScore: compliantCount, maxPossibleScore: totalQuestions, percentageScore: percentageScore, summary: null, recommendations: null, status: 'SUBMITTED'
      };
      let saved;
      if (responseId) { await auditScheduleApi.updateAuditResponse(responseId, payload); await auditScheduleApi.submitAuditResponse(responseId); saved = { id: responseId }; } 
      else { const response = await auditScheduleApi.saveAuditResponse(payload); saved = response.data; setResponseId(saved.id); await auditScheduleApi.submitAuditResponse(saved.id); }
      addToast(`Audit submitted successfully! Score: ${percentageScore.toFixed(2)}%`, 'success');
      navigate('/auditor');
    } catch (error) { console.error('Error submitting audit:', error); addToast(`Failed to submit audit: ${error.message}`, 'error'); } 
    finally { setSaving(false); }
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

  const nextCheckpoint = () => { if (currentCheckpointIndex < questions.length - 1) { setCurrentCheckpointIndex(currentCheckpointIndex + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const prevCheckpoint = () => { if (currentCheckpointIndex > 0) { setCurrentCheckpointIndex(currentCheckpointIndex - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const navigateToCheckpoint = (index) => { setCurrentCheckpointIndex(index); window.scrollTo({ top: 0, behavior: 'smooth' }); };

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

  useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);

  const getResponseStatus = (status) => { const option = statusOptions.find(opt => opt.value === status); return option ? option.short : ''; };

  const steps = [
    { number: 1, title: 'General Information', icon: User },
    { number: 2, title: 'Audit Checkpoints', icon: ClipboardList },
    { number: 3, title: 'Signature & Submit', icon: PenTool }
  ];

  const nextStep = () => { if (currentStep < 3) { setCurrentStep(currentStep + 1); setCurrentCheckpointIndex(0); window.scrollTo(0, 0); } };
  const prevStep = () => { if (currentStep > 1) { setCurrentStep(currentStep - 1); setCurrentCheckpointIndex(0); window.scrollTo(0, 0); } };

  if (loadingQuestions || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
          <p className="text-sm font-medium text-slate-500">{loadingQuestions ? 'Loading audit questions...' : 'Loading audit data...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      <div className="max-w-5xl px-4 py-8 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fadeInUp">
          <button onClick={() => navigate('/auditor')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <button onClick={handleAutoFill} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.secondary }}>
                <Sparkles size={16} /> Demo Auto-Fill
              </button>
            )}
            <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all disabled:opacity-50">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {currentStep === 3 && (
              <button onClick={() => { isManualSubmitRef.current = true; submitAudit(); }} disabled={!allCheckpointsRated || saving} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all rounded-xl ${allCheckpointsRated && !saving ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'}`} style={{ backgroundColor: allCheckpointsRated && !saving ? NAVBAR_COLORS.primary : '#94a3b8' }}>
                <Send size={16} /> Submit Audit
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
                  <button type="button" onClick={() => isClickable && setCurrentStep(step.number)} disabled={!isClickable} className={`flex items-center group transition-all duration-200 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 shadow-sm ${isActive || isCompleted ? 'text-white' : 'bg-slate-100 text-slate-500'}`} style={{ backgroundColor: isActive || isCompleted ? NAVBAR_COLORS.primary : undefined }}>
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <div className="ml-3 text-left">
                      <p className="text-xs font-medium" style={{ color: isActive ? NAVBAR_COLORS.secondary : '#64748b' }}>Step {step.number}</p>
                      <p className={`text-sm font-semibold ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{step.title}</p>
                    </div>
                  </button>
                  {step.number < steps.length && <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${isCompleted ? 'bg-blue-500' : 'bg-slate-200'}`} style={{ backgroundColor: isCompleted ? NAVBAR_COLORS.secondary : undefined }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <div className="bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            {/* NEW HEADER WITH FORM NAME */}
            <div className="p-6 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.lighter }}>
                  <FileText size={20} style={{ color: NAVBAR_COLORS.primary }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{sheetConfig?.name || 'Manufacturing Process Audit'}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Document Control & Audit Information</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
               {/* Document Control Section */}
               <div>
                  <h3 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-700">Document Control Information</h3>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-5">
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-slate-700">Doc No.</label>
                      <input type="text" value={formData.documentNumber} readOnly className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-600" />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-slate-700">W.e.f.</label>
                      <input type="date" value={formData.wefDate} onChange={(e) => handleInputChange('wefDate', e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-slate-700">Rev No.</label>
                      <input type="text" value={formData.revNo} onChange={(e) => handleInputChange('revNo', e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="00" />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-slate-700">Rev Date</label>
                      <input type="date" value={formData.revDate} onChange={(e) => handleInputChange('revDate', e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-slate-700">Issue Date</label>
                      <input type="date" value={formData.issueDate} onChange={(e) => handleInputChange('issueDate', e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
               </div>

               {/* Audit Information Section */}
               <div>
                  <h3 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-700">Audit Information</h3>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4">
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><Building size={14} /> Department <span className="text-rose-500">*</span></label>
                      <input type="text" value={formData.department} onChange={(e) => handleInputChange('department', e.target.value)} placeholder="Enter department name" className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${scheduleId ? 'bg-slate-50' : ''}`} />
                      {scheduleId && formData.department && <p className="mt-1 text-xs font-medium" style={{ color: NAVBAR_COLORS.secondary }}>✓ Loaded from schedule</p>}
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-slate-700">Part Number</label>
                      <input type="text" value={formData.partNumber} onChange={(e) => handleInputChange('partNumber', e.target.value)} placeholder="Enter part number" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><Building size={14} /> Machine</label>
                      <input type="text" value={formData.machine} onChange={(e) => handleInputChange('machine', e.target.value)} placeholder="Machine name / number" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><MapPin size={14} /> Location</label>
                      <input type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="Audit location" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><Calendar size={14} /> Date</label>
                      <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><ClockIcon size={14} /> Shift</label>
                      <select value={formData.shift} onChange={(e) => handleInputChange('shift', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                        <option value="Morning">Morning</option><option value="Evening">Evening</option><option value="Night">Night</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><ClockIcon size={14} /> Time</label>
                      <input type="time" value={formData.time} onChange={(e) => handleInputChange('time', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><User size={14} /> Auditor Name</label>
                      <input type="text" value={formData.auditorName} readOnly className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-slate-700"><User size={14} /> Auditee Name <span className="text-rose-500">*</span></label>
                      <input type="text" value={formData.auditeeName} onChange={(e) => handleInputChange('auditeeName', e.target.value)} placeholder="Enter auditee name" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      {scheduleId && formData.auditeeName && <p className="mt-1 text-xs font-medium" style={{ color: NAVBAR_COLORS.secondary }}>✓ Loaded from schedule</p>}
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex justify-end p-6 pt-0">
              <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                Next Step <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Audit Checkpoints */}
        {currentStep === 2 && currentQ && (
          <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-600">Checkpoint {currentCheckpointIndex + 1} of {questions.length}</span>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle size={12} /> {stats.compliant}</span>
                  <span className="flex items-center gap-1.5 text-amber-600"><Info size={12} /> {stats.minor}</span>
                  <span className="flex items-center gap-1.5 text-rose-600"><AlertCircle size={12} /> {stats.major}</span>
                </div>
              </div>
              <div className="flex gap-2 pb-2 overflow-x-auto">
                {questions.map((q, idx) => {
                  const isCompleted = formData.responses[q.slNo];
                  let buttonStyle = {};
                  let buttonClass = 'min-w-[36px] w-9 h-9 text-sm font-medium rounded-lg transition-all flex items-center justify-center flex-shrink-0 border ';
                  if (currentCheckpointIndex === idx) {
                    buttonStyle = { backgroundColor: NAVBAR_COLORS.primary, borderColor: NAVBAR_COLORS.primary, color: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
                  } else if (isCompleted) {
                    const style = getStatusStyle(formData.responses[q.slNo]);
                    buttonStyle = { backgroundColor: style.bg, borderColor: style.border, color: style.text };
                  } else {
                    buttonStyle = { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' };
                    buttonClass += 'hover:bg-slate-100 ';
                  }
                  return (<button key={q.slNo} ref={currentCheckpointIndex === idx ? activeButtonRef : null} onClick={() => navigateToCheckpoint(idx)} className={buttonClass} style={buttonStyle} title={`Checkpoint ${idx + 1}`}>{idx + 1}</button>);
                })}
              </div>
            </div>

            <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl">
              <div className="p-6 border-l-4" style={{ borderLeftColor: getStatusStyle(formData.responses[currentQ.slNo]).border }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 text-white shadow-md rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.primary }}>{currentQ.slNo}</span>
                    {currentQ.clause && <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>Clause {currentQ.clause}</span>}
                    {formData.responses[currentQ.slNo] && (
                      <span className="px-3 py-1 text-xs font-semibold border rounded-full" style={{ backgroundColor: getStatusStyle(formData.responses[currentQ.slNo]).bg, color: getStatusStyle(formData.responses[currentQ.slNo]).text, borderColor: getStatusStyle(formData.responses[currentQ.slNo]).border }}>
                        {getResponseStatus(formData.responses[currentQ.slNo])}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mb-4 text-lg font-bold text-slate-800">{currentQ.checkpoint}</h3>

                {currentQ.consideration && (
                  <div className="p-4 mb-5 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                    <p className="mb-1 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>Documents/Records to Verify:</p>
                    <p className="text-sm text-slate-600">{currentQ.consideration}</p>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block mb-2 text-sm font-bold text-slate-700">Observations / Findings</label>
                  <textarea value={formData.observations[currentQ.slNo] || ''} onChange={(e) => handleObservationChange(currentQ.slNo, e.target.value)} rows="3" placeholder="Enter your observations here..." className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div className="p-5 mb-6 border rounded-xl bg-slate-50 border-slate-200">
                  <label className="block mb-3 text-sm font-bold text-slate-700">Status / Rating</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {statusOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = formData.responses[currentQ.slNo] === option.value;
                      const style = getStatusStyle(option.value);
                      return (
                        <button key={option.value} onClick={() => handleStatusChange(currentQ.slNo, option.value)} className="relative p-4 transition-all border-2 shadow-sm rounded-xl group hover:shadow-md" style={{ backgroundColor: isSelected ? style.bg : 'white', borderColor: isSelected ? style.border : '#e2e8f0', color: isSelected ? style.text : '#64748b' }}>
                          <div className="flex flex-col items-center gap-1.5">
                            <Icon size={22} style={{ color: isSelected ? style.text : '#94a3b8' }} />
                            <span className="text-sm font-bold">{option.short}</span>
                            <span className="text-[10px] font-medium text-center leading-tight">{option.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-5 mt-5 border-t border-slate-100">
                  <button onClick={prevCheckpoint} disabled={currentCheckpointIndex === 0} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 shadow-sm transition-all">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="text-sm font-medium">
                    {formData.responses[currentQ.slNo] ? (<span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle size={14} /> Completed</span>) : (<span className="flex items-center gap-1.5 text-amber-600"><AlertCircle size={14} /> Select Status</span>)}
                  </div>
                  <button onClick={nextCheckpoint} disabled={currentCheckpointIndex === questions.length - 1} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 mt-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex gap-6">
                  <div className="text-center"><div className="text-xl font-bold text-emerald-600">{stats.compliant}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compliant</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-amber-600">{stats.minor}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Minor NC</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-rose-600">{stats.major}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Major NC</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-slate-600">{stats.total - stats.completed}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending</div></div>
                </div>
                <div className="text-sm font-medium text-slate-600"><span className="font-bold text-slate-800">{stats.completed}</span> / <span className="text-slate-500">{stats.total}</span> completed</div>
              </div>
              {!allCheckpointsRated && (<div className="p-3 mt-4 text-xs font-medium text-center border rounded-xl text-amber-700 bg-amber-50 border-amber-200">⚠️ Please select status for all {stats.total - stats.completed} remaining checkpoints</div>)}
            </div>

            {allCheckpointsRated && (
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
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.lighter }}>
                  <FileCheck size={20} style={{ color: NAVBAR_COLORS.primary }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Signature & Submit</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Review and submit the audit report</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="p-5 mb-6 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                <h3 className="mb-4 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>Audit Summary</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Checkpoints</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compliant</p>
                    <p className="mt-1 text-xl font-bold text-emerald-600">{stats.compliant}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Non-Conformities</p>
                    <p className="mt-1 text-xl font-bold text-rose-600">{stats.minor + stats.major}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Score</p>
                    <p className="mt-1 text-xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{calculateCurrentScore()}%</p>
                  </div>
                </div>
              </div>

              <div className="p-4 mb-6 border rounded-xl bg-slate-50 border-slate-200">
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-800">Department:</span> {formData.department || 'Not specified'}</p>
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
                <p className="mt-1 text-xs text-slate-500">Your electronic signature will be used for this audit report</p>
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-sm font-bold text-slate-700">
                  <Calendar size={14} className="inline mr-1" /> Date <span className="text-rose-500">*</span>
                </label>
                <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <p className="mt-1 text-xs text-slate-500">Date of signature</p>
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-sm font-bold text-slate-700">
                  <User size={14} className="inline mr-1" /> Auditee Name <span className="text-rose-500">*</span>
                </label>
                <input type="text" value={formData.auditeeName} onChange={(e) => handleInputChange('auditeeName', e.target.value)} placeholder="Enter auditee full name" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                <p className="mt-1 text-xs text-slate-500">The auditee will review and sign separately</p>
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
                <button onClick={prevStep} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => { isManualSubmitRef.current = true; submitAudit(); }}
                  disabled={(!auditorSignatureImage && !formData.auditorSignature.trim()) || !formData.date.trim() || !formData.auditeeName.trim() || saving || !allCheckpointsRated}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-md transition-all ${
                    (auditorSignatureImage || formData.auditorSignature.trim()) && formData.date.trim() && formData.auditeeName.trim() && !saving && allCheckpointsRated ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: (auditorSignatureImage || formData.auditorSignature.trim()) && formData.date.trim() && formData.auditeeName.trim() && !saving && allCheckpointsRated ? NAVBAR_COLORS.primary : '#94a3b8' }}
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