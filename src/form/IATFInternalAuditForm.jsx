import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/context/AuthContext';
import { auditScheduleApi } from '../services/auditScheduleApi';
import { userAPI, auditAPI } from '../components/services/api';
import { useToast } from '../components/ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, Save, Send, CheckCircle, AlertCircle, 
  ChevronLeft, ChevronRight, Info, Sparkles,
  User, ClipboardList, PenTool, Flag, ThumbsUp, ThumbsDown,
  Calendar, MapPin, Building, Clock as ClockIcon, 
  FileCheck, Layers, FileText, Image as ImageIcon, AlertTriangle
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

// STATUS OPTIONS with Ma, Mi, O mapping
const STATUS_OPTIONS = [
  { value: 'COMPLIANT', label: 'Compliant / Observation (O+)', short: 'O+', icon: CheckCircle, column: 'O' },
  { value: 'MINOR_NC', label: 'Minor Non-Conformity (Mi/OI)', short: 'OI', icon: Info, column: 'Mi' },
  { value: 'MAJOR_NC', label: 'Major Non-Conformity (Ma/O-)', short: 'O-', icon: AlertCircle, column: 'Ma' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', short: 'N/A', icon: Flag, column: 'NA' }
];

// Document number generator
const generateDocumentNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AUD-IATF-${year}${month}-${random}`;
};

// Score calculator (percentage of compliant)
const calculateScore = (responses, questions) => {
  if (!questions || questions.length === 0) return 0;
  const total = questions.length;
  const compliant = Object.values(responses).filter(r => r === 'COMPLIANT').length;
  if (total === 0) return 0;
  const score = (compliant / total) * 100;
  return parseFloat(score.toFixed(2));  
};

// Helper for status colors
const getStatusStyle = (status) => {
  switch(status) {
    case 'COMPLIANT': return { bg: '#ecfdf5', border: '#10b981', text: '#047857', icon: '#10b981' }; // Emerald
    case 'MINOR_NC': return { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', icon: '#f59e0b' }; // Amber
    case 'MAJOR_NC': return { bg: '#fff1f2', border: '#f43f5e', text: '#be123c', icon: '#f43f5e' }; // Rose
    default: return { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b', icon: '#94a3b8' }; // Slate
  }
};

export default function IATFInternalAuditForm() {
  const { user } = useAuth();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const departmentParam = searchParams.get('department');
  const scheduleId = searchParams.get('scheduleId');
  const processNameParam = searchParams.get('processName');
  const formIdParam = searchParams.get('formId');
  const urlAuditeeId = searchParams.get('auditeeId');
  const urlAuditeeName = searchParams.get('auditeeName');
  
  const isManualSubmitRef = useRef(false);
  const activeButtonRef = useRef(null);
  const initialized = useRef(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [responseId, setResponseId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentCheckSheet, setCurrentCheckSheet] = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  
  const [auditorSignatureImage, setAuditorSignatureImage] = useState(null);
  const [auditorSignatureBase64, setAuditorSignatureBase64] = useState(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [signatureError, setSignatureError] = useState(false);
  
  const statusOptions = STATUS_OPTIONS;

  const [formData, setFormData] = useState({
    documentNumber: generateDocumentNumber(),
    department: departmentParam || '',
    location: '',
    shift: 'Morning',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    auditorName: user?.name || '',
    auditorId: user?.id,
    auditorSignature: '',
    auditeeName: '',
    auditeeId: '',
    status: 'IN_PROGRESS',
    responses: {},
    observations: {},
    score: null
  });

  const fetchAuditorSignature = async () => {
    if (!user?.id) { setLoadingSignature(false); return; }
    setLoadingSignature(true);
    setSignatureError(false);
    try {
      const signatureBase64 = await auditAPI.fetchSignatureById(user.id);
      if (signatureBase64) {
        setAuditorSignatureBase64(signatureBase64);
        setAuditorSignatureImage(signatureBase64);
        setFormData(prev => ({ ...prev, auditorSignature: signatureBase64 }));
      } else { setSignatureError(true); }
    } catch (error) {
      console.error('Error fetching signature:', error);
      setSignatureError(true);
    } finally { setLoadingSignature(false); }
  };

  const fetchScheduleDetails = async () => {
    if (!scheduleId) return;
    try {
const response = await axios.get(`${API_BASE}/audit-schedule/${scheduleId}`, { 
  headers: { 'X-Timezone': userTimezone },
  withCredentials: true 
});      if (response?.data) {
        const schedule = response.data;
        if (schedule.auditeeName && !editId) {
          setFormData(prev => ({
            ...prev,
            auditeeName: schedule.auditeeName,
            auditeeId: schedule.auditeeId || prev.auditeeId,
            department: schedule.department || prev.department,
            location: schedule.location || prev.location,
            shift: schedule.shift || prev.shift,
            date: schedule.scheduledDate ? schedule.scheduledDate.split('T')[0] : prev.date,
            auditorName: schedule.auditorName || prev.auditorName,
            auditorId: schedule.auditorId || prev.auditorId
          }));
        }
      }
    } catch (error) { console.warn('⚠️ Could not fetch schedule details:', error.message); }
  };

  const fetchSheetsForDepartment = async (department) => {
    if (!department) return [];
    const deptUpper = department.toUpperCase().trim();
    if (deptUpper === 'QA/QC' || deptUpper === 'QC' || deptUpper === 'Q.C') {
      try {
        const allFormsRes = await axios.get(`${API_BASE}/templates/type/IATF_16949`, {   
withCredentials: true });
        const allForms = allFormsRes.data || [];
        return allForms.filter(form => form.department === 'QA');
      } catch (error) { return []; }
    }
    try {
      const response = await axios.get(`${API_BASE}/templates/iatf/by-department/${encodeURIComponent(department)}`, {   headers: { 'X-Timezone': userTimezone },  // ✅ ADD THIS
withCredentials: true });
      return response.data || [];
    } catch (error) { return []; }
  };

  const loadSheetQuestions = async (sheet) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/templates/${sheet.id}`, {   headers: { 'X-Timezone': userTimezone },  // ✅ ADD THIS
withCredentials: true });
      const fullSheet = response.data;
      setCurrentCheckSheet(fullSheet);
      let parsedQuestions = [];
      if (fullSheet.questions) {
        try {
          if (typeof fullSheet.questions === 'object' && fullSheet.questions !== null) parsedQuestions = fullSheet.questions;
          else if (typeof fullSheet.questions === 'string') {
            let cleanJson = fullSheet.questions.trim();
            if (cleanJson.charCodeAt(0) === 0xFEFF) cleanJson = cleanJson.substring(1);
            try { parsedQuestions = JSON.parse(cleanJson); } 
            catch (e) { parsedQuestions = manualExtractQuestions(fullSheet.questions); }
          }
        } catch (e) { parsedQuestions = manualExtractQuestions(fullSheet.questions); }
      }
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) parsedQuestions = getFallbackQuestions();
      
      const formattedQuestions = parsedQuestions.map((q, idx) => ({
        slNo: q?.sNo || q?.slNo || (idx + 1),
        checkpoint: q?.displayLabel || q?.checkpoint || `Question ${idx + 1}`,
        clause: q?.clauseNo || q?.clause || '',
        documentsVerified: q?.documentsVerified || q?.whatToLookFor || q?.consideration || 'Review relevant documentation',
        whatToLookFor: q?.whatToLookFor || q?.documentsVerified || q?.consideration || 'Review relevant documentation'
      }));
      
      setQuestions(formattedQuestions);
      const initialResponses = {};
      const initialObservations = {};
      formattedQuestions.forEach(q => { initialResponses[q.slNo] = ''; initialObservations[q.slNo] = ''; });
      setFormData(prev => ({ ...prev, responses: initialResponses, observations: initialObservations }));
      setShowSheetSelector(false);
      setCurrentCheckpointIndex(0);
      setLoading(false);
    } catch (error) {
      console.error('Error loading questions:', error);
      addToast('Failed to load audit questions.', 'error');
      setQuestions(getFallbackQuestions());
      setLoading(false);
    }
  };

  const manualExtractQuestions = (jsonString) => {
    const questions = [];
    if (!jsonString || typeof jsonString !== 'string') return getFallbackQuestions();
    let cleaned = jsonString.replace(/\n/g, ' ').replace(/\r/g, '');
    const objectPattern = /\{[^{}]*?"sNo"\s*:\s*\d+[^{}]*?\}/g;
    const questionMatches = cleaned.match(objectPattern);
    if (questionMatches && questionMatches.length > 0) {
      for (let qStr of questionMatches) {
        try {
          const sNoMatch = qStr.match(/"sNo"\s*:\s*(\d+)/);
          if (!sNoMatch) continue;
          let clauseNo = '';
          const clauseMatch = qStr.match(/"clauseNo"\s*:\s*"([^"]*?)"/);
          if (clauseMatch) clauseNo = clauseMatch[1];
          let displayLabel = '';
          const labelMatch = qStr.match(/"displayLabel"\s*:\s*"([^"]*?)"/);
          if (labelMatch) displayLabel = labelMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
          let documentsVerified = '';
          const docsMatch = qStr.match(/"documentsVerified"\s*:\s*"([^"]*?)"/);
          if (docsMatch) documentsVerified = docsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          questions.push({ sNo: parseInt(sNoMatch[1]), clauseNo: clauseNo || '', displayLabel: displayLabel || `Question ${sNoMatch[1]}`, documentsVerified: documentsVerified || 'Review relevant documentation', fieldType: 'yes_no' });
        } catch (e) { console.error('Error parsing question part:', e); }
      }
    }
    return questions.length === 0 ? getFallbackQuestions() : questions;
  };

  const getFallbackQuestions = () => {
    return [
      { sNo: 1, clauseNo: "4.1", displayLabel: "Has the organization determined external and internal issues relevant to its purpose?", documentsVerified: "Risk analysis document", fieldType: "yes_no" },
      { sNo: 2, clauseNo: "4.2", displayLabel: "Has the organization determined interested parties and their requirements?", documentsVerified: "Interested parties register", fieldType: "yes_no" },
      { sNo: 3, clauseNo: "5.1", displayLabel: "Is top management demonstrating leadership and commitment?", documentsVerified: "Quality policy and objectives", fieldType: "yes_no" },
      { sNo: 4, clauseNo: "6.1", displayLabel: "Has the organization planned actions to address risks and opportunities?", documentsVerified: "Risk mitigation plan", fieldType: "yes_no" },
      { sNo: 5, clauseNo: "7.1", displayLabel: "Are resources needed for QMS determined and provided?", documentsVerified: "Resource allocation records", fieldType: "yes_no" }
    ];
  };

  useEffect(() => {
    if (questions.length > 0 && currentCheckpointIndex >= questions.length) setCurrentCheckpointIndex(0);
  }, [questions, currentCheckpointIndex]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const initialize = async () => {
      await fetchAuditorSignature();
      let decodedAuditeeName = '';
      if (urlAuditeeName && urlAuditeeName !== 'undefined' && urlAuditeeName !== 'null') {
        try { decodedAuditeeName = decodeURIComponent(urlAuditeeName); setFormData(prev => ({ ...prev, auditeeName: decodedAuditeeName, auditeeId: urlAuditeeId || '' })); } 
        catch (e) { console.error('Error decoding auditee name:', e); }
      }
      let deptToFetch = departmentParam;
      if (!deptToFetch && scheduleId) deptToFetch = formData.department;
      if (deptToFetch) {
        setFormData(prev => ({ ...prev, department: deptToFetch }));
        const forms = await fetchSheetsForDepartment(deptToFetch);
        if (forms.length > 0 && (processNameParam || formIdParam)) {
          let targetSheet = null;
          if (formIdParam) targetSheet = forms.find(f => f.id === parseInt(formIdParam));
          if (!targetSheet && processNameParam) targetSheet = forms.find(f => f.processName === processNameParam || f.name.includes(processNameParam));
          if (!targetSheet && forms.length === 1) targetSheet = forms[0];
          if (targetSheet && !currentCheckSheet) await loadSheetQuestions(targetSheet);
          else if (!targetSheet && forms.length > 0) { setAvailableSheets(forms); setShowSheetSelector(true); setLoading(false); }
        } else if (forms.length === 1 && !currentCheckSheet) await loadSheetQuestions(forms[0]);
        else if (forms.length > 1 && !currentCheckSheet) { setShowSheetSelector(true); setLoading(false); }
      } else { addToast('No department specified', 'error'); setLoading(false); }
    };
    initialize();
  }, []);

  useEffect(() => { if (editId && currentCheckSheet) loadAuditData(); }, [editId, currentCheckSheet]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
const response = await axios.get(`${API_BASE}/templates/responses/${editId}`, {
  headers: { 'X-Timezone': userTimezone },
  withCredentials: true
});      const audit = response.data;
      if (audit) {
        setResponseId(audit.id);
        let answers = {};
        try { answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : (audit.answers || {}); } catch (e) { answers = {}; }
        setFormData(prev => ({
          ...prev,
          documentNumber: answers.documentNumber || prev.documentNumber,
          department: audit.department || prev.department,
          location: answers.location || '',
          shift: audit.shift || 'Morning',
          date: audit.auditDate ? audit.auditDate.split('T')[0] : prev.date,
          time: answers.time || new Date().toLocaleTimeString(),
          auditorName: audit.auditorName || user?.name || '',
          auditorId: audit.auditorId || user?.id,
          auditorSignature: answers.auditorSignature || '',
          auditeeName: audit.auditeeName || answers.auditeeName || '',
          auditeeId: audit.auditeeId || answers.auditeeId || '',
          status: audit.status || 'IN_PROGRESS',
          responses: answers.responses || prev.responses,
          observations: answers.observations || prev.observations,
          score: answers.score || null
        }));
      }
    } catch (error) { console.error('Error loading audit:', error); addToast('Failed to load audit data', 'error'); } 
    finally { setLoading(false); }
  };

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleObservationChange = (questionId, observation) => setFormData(prev => ({ ...prev, observations: { ...prev.observations, [questionId]: observation } }));
  const handleStatusChange = (questionId, status) => setFormData(prev => ({ ...prev, responses: { ...prev.responses, [questionId]: status } }));

  useEffect(() => {
    const keywordStatusMap = {
      MAJOR_NC: ['critical', 'major', 'serious', 'severe', 'not performed', 'not met', 'overdue', 'ineffective', 'no evidence', 'missing completely', 'not implemented', 'failure', 'rejected', 'non-conforming', 'risk', 'danger', 'urgent', 'immediate action', 'breakdown', 'shutdown', 'stop production', 'customer complaint', 'recall'],
      MINOR_NC: ['minor', 'some', 'gaps', 'incomplete', 'partial', 'occasional', 'not consistently', 'not always', 'sometimes', 'few', 'slight', 'needs improvement', 'could be improved', 'deficiency', 'observation', 'suggestion', 'recommendation'],
      COMPLIANT: ['met', 'maintained', 'adequate', 'documented', 'compliant', 'satisfactory', 'properly', 'all requirements', 'followed', 'up to date', 'verified', 'confirmed', 'ok', 'good', 'fine', 'acceptable', 'sufficient', 'complete', 'available']
    };
    questions.forEach((q) => {
      const observation = formData.observations[q.slNo] || '';
      const currentStatus = formData.responses[q.slNo];
      const lowerObservation = observation.toLowerCase();
      if (!observation.trim()) return;
      let detectedStatus = null;
      for (const keyword of keywordStatusMap.MAJOR_NC) { if (lowerObservation.includes(keyword)) { detectedStatus = 'MAJOR_NC'; break; } }
      if (!detectedStatus) { for (const keyword of keywordStatusMap.MINOR_NC) { if (lowerObservation.includes(keyword)) { detectedStatus = 'MINOR_NC'; break; } } }
      if (!detectedStatus) { for (const keyword of keywordStatusMap.COMPLIANT) { if (lowerObservation.includes(keyword)) { detectedStatus = 'COMPLIANT'; break; } } }
      if (detectedStatus && detectedStatus !== currentStatus) handleStatusChange(q.slNo, detectedStatus);
    });
  }, [formData.observations, questions]);

  const calculateCurrentScore = () => calculateScore(formData.responses, questions);
  const getNcrFindings = () => questions.filter(q => ['MINOR_NC', 'MAJOR_NC'].includes(formData.responses[q.slNo]));

  const buildNcrQuery = (savedResponseId) => {
    const ncQuestions = getNcrFindings();
    const params = new URLSearchParams();
    params.append('auditId', savedResponseId || '');
    params.append('department', formData.department || '');
    params.append('shift', formData.shift || 'Day');
    params.append('auditReportNumber', formData.documentNumber || '');
    if (formData.auditeeId) params.append('auditeeId', formData.auditeeId);
    if (formData.auditeeName) params.append('auditeeName', formData.auditeeName);
    params.append('clause', ncQuestions.map(q => q.clause ? `Clause ${q.clause}` : `Question ${q.slNo}`).join('\n'));
    params.append('evidence', ncQuestions.map(q => {
      const status = formData.responses[q.slNo] === 'MAJOR_NC' ? 'Major NC' : 'Minor NC';
      const observation = formData.observations[q.slNo] || 'Observation not entered';
      return `Q${q.slNo}: ${q.checkpoint}\nStatus: ${status}\nEvidence: ${observation}`;
    }).join('\n\n'));
    params.append('statement', ncQuestions.map(q => {
      const status = formData.responses[q.slNo] === 'MAJOR_NC' ? 'Major nonconformity' : 'Minor nonconformity';
      return `${status} identified for Q${q.slNo}: ${q.checkpoint}`;
    }).join('\n'));
    return params.toString();
  };

  const goToNcrForm = (savedResponseId) => {
    if (!savedResponseId) { addToast('First submit the audit to save the audit report number, then create NCR.', 'warning', 5000); return; }
    navigate(`/form7?${buildNcrQuery(savedResponseId)}`);
  };

  const saveAuditData = async (status, isSubmit = false) => {
    if (!currentCheckSheet || !currentCheckSheet.id) { addToast('No form selected', 'error'); return; }
    setSaving(true);
    try {
      const score = calculateCurrentScore();
      const answersObject = {
        documentNumber: formData.documentNumber, location: formData.location, date: formData.date, time: formData.time,
        auditorSignature: formData.auditorSignature, responses: formData.responses, observations: formData.observations,
        score: score, formName: currentCheckSheet.name, processName: currentCheckSheet.processName,
        auditeeName: formData.auditeeName, auditeeId: formData.auditeeId, auditorName: formData.auditorName,
        department: formData.department, shift: formData.shift
      };
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.responses).filter(r => r === 'COMPLIANT').length;
      const minorNCCount = Object.values(formData.responses).filter(r => r === 'MINOR_NC').length;
      const majorNCCount = Object.values(formData.responses).filter(r => r === 'MAJOR_NC').length;
      const totalScore = compliantCount;
      const maxPossibleScore = totalQuestions;
      const percentageScore = maxPossibleScore > 0 ? (totalScore * 100.0 / maxPossibleScore) : 0;
      const ncrFindingCount = minorNCCount + majorNCCount;
      const payload = {
        checkSheet: { id: currentCheckSheet.id }, auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
        department: formData.department, shift: formData.shift, auditDate: formData.date,
        auditorName: formData.auditorName, auditorId: formData.auditorId ? parseInt(formData.auditorId) : null,
        auditeeName: formData.auditeeName, auditeeId: formData.auditeeId ? parseInt(formData.auditeeId) : null,
        answers: JSON.stringify(answersObject), totalScore: totalScore, maxPossibleScore: maxPossibleScore,
        percentageScore: percentageScore, compliantCount: compliantCount, minorNCCount: minorNCCount, majorNCCount: majorNCCount,
        summary: null, recommendations: null, status: status
      };
      let saved;
      if (responseId) {
        await auditScheduleApi.updateAuditResponse(responseId, payload);
        saved = { id: responseId };
        if (!isSubmit) addToast('Draft updated', 'success');
      } else {
        const response = await auditScheduleApi.saveAuditResponse(payload);
        saved = response.data;
        setResponseId(saved.id);
        if (!isSubmit) addToast('Draft saved', 'success');
        navigate(`/audit/iatf_internal?edit=${saved.id}&department=${formData.department}&processName=${currentCheckSheet.processName}`, { replace: true });
      }
      if (isSubmit && saved.id) {
        await auditScheduleApi.submitAuditResponse(saved.id);
        addToast(`Audit submitted! Score: ${percentageScore.toFixed(2)}%`, 'success');
        setSubmissionResult({ savedId: saved.id, score: percentageScore, ncrCount: ncrFindingCount, compliantCount: compliantCount, department: formData.department, documentNumber: formData.documentNumber });
        setShowSuccessModal(true);
      }
    } catch (error) { console.error('Error saving:', error); addToast(`Failed to ${isSubmit ? 'submit' : 'save'} audit`, 'error'); } 
    finally { setSaving(false); }
  };

  const saveDraft = async () => { if (!currentCheckSheet) { addToast('Please select an audit form first', 'warning'); return; } await saveAuditData('DRAFT', false); };

  const submitAudit = async () => {
    if (!isManualSubmitRef.current) return;
    isManualSubmitRef.current = false;
    if (!currentCheckSheet) { addToast('No audit form selected', 'error'); return; }
    const unanswered = questions.filter(q => !formData.responses[q.slNo]);
    if (unanswered.length > 0) { addToast(`Please answer all ${unanswered.length} remaining questions`, 'error'); setCurrentStep(2); setCurrentCheckpointIndex(questions.findIndex(q => !formData.responses[q.slNo])); return; }
    if (!formData.auditeeName.trim()) { addToast('Please enter Auditee Name', 'error'); setCurrentStep(1); return; }
    if (!formData.auditorSignature) { addToast('Please provide auditor signature', 'error'); setCurrentStep(3); return; }
    await saveAuditData('SUBMITTED', true);
  };

  const handleAutoFill = () => {
    const allObservations = [
      { text: "✓ Risk assessment documented and reviewed. All mitigation plans in place and effective.", status: "COMPLIANT" },
      { text: "✓ Interested parties identified and their requirements documented. Regular monitoring in place.", status: "COMPLIANT" },
      { text: "✓ Management actively engaged. Quality policy communicated and understood by all employees.", status: "COMPLIANT" },
      { text: "✓ Documentation complete and up-to-date. All processes follow defined procedures.", status: "COMPLIANT" },
      { text: "✓ Training records maintained. Competency matrix updated. All personnel qualified.", status: "COMPLIANT" },
      { text: "⚠ Quality objectives defined but monitoring not consistently done. Some targets not tracked monthly.", status: "MINOR_NC" },
      { text: "⚠ 5S audit conducted but some areas need improvement. Minor housekeeping issues observed.", status: "MINOR_NC" },
      { text: "⚠ Training need identified but schedule not fully followed. Minor gaps in skill matrix.", status: "MINOR_NC" },
      { text: "⚠ Documentation available but some records not properly filed. Minor procedural deviations.", status: "MINOR_NC" },
      { text: "⚠ Preventive maintenance conducted but some records incomplete. Minor delays in schedule.", status: "MINOR_NC" },
      { text: "🔴 CRITICAL: Risk assessment NOT performed for key processes. No mitigation plan in place.", status: "MAJOR_NC" },
      { text: "🔴 MAJOR: Quality requirements NOT MET. Customer specification not followed for critical parameters.", status: "MAJOR_NC" },
      { text: "🔴 SERIOUS: Calibration overdue for critical measuring equipment. Product quality at risk.", status: "MAJOR_NC" },
      { text: "🔴 CRITICAL: Root cause analysis NOT performed for recurring non-conformities.", status: "MAJOR_NC" },
      { text: "🔴 MAJOR: Management review NOT conducted as per schedule. No evidence of top management commitment.", status: "MAJOR_NC" }
    ];
    const shuffledObservations = [...allObservations];
    for (let i = shuffledObservations.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffledObservations[i], shuffledObservations[j]] = [shuffledObservations[j], shuffledObservations[i]]; }
    questions.forEach((q, idx) => {
      const randomIndex = Math.floor(Math.random() * shuffledObservations.length);
      const observation = shuffledObservations[randomIndex];
      handleObservationChange(q.slNo, observation.text);
      handleStatusChange(q.slNo, observation.status);
    });
    if (!formData.auditeeName.trim()) handleInputChange('auditeeName', 'Demo Auditee User');
    if (!formData.location.trim()) handleInputChange('location', 'Plant A, Main Production Area');
    const stats = getProgressStats();
    addToast(`✅ Demo data filled: ${stats.compliant} Compliant, ${stats.minorNC} Minor NC, ${stats.majorNC} Major NC`, 'success');
  };

  const getProgressStats = () => {
    const total = questions.length;
    const completed = Object.keys(formData.responses).filter(key => formData.responses[key]).length;
    const compliant = Object.values(formData.responses).filter(r => r === 'COMPLIANT').length;
    const minorNC = Object.values(formData.responses).filter(r => r === 'MINOR_NC').length;
    const majorNC = Object.values(formData.responses).filter(r => r === 'MAJOR_NC').length;
    return { total, completed, compliant, minorNC, majorNC };
  };

  const stats = getProgressStats();
  const allCheckpointsRated = stats.completed === stats.total;
  const currentQ = questions[currentCheckpointIndex];
  const ncrFindings = getNcrFindings();

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

  const SubmissionSuccessModal = () => {
    if (!showSuccessModal || !submissionResult) return null;
    const handleGoToDashboard = () => { setShowSuccessModal(false); navigate('/auditor'); };
    const handleRaiseNCR = () => { setShowSuccessModal(false); goToNcrForm(submissionResult.savedId); };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
        <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl animate-scaleIn">
          <div className="px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.primary}, ${NAVBAR_COLORS.dark})` }}>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Audit Submitted!</h2>
            <p className="mt-1 text-sm text-blue-200">Report #{submissionResult.documentNumber}</p>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 text-center border rounded-xl bg-emerald-50 border-emerald-100">
                <p className="text-2xl font-bold text-emerald-600">{submissionResult.compliantCount}</p>
                <p className="text-xs font-medium text-slate-500">Compliant</p>
              </div>
              <div className="p-3 text-center border border-blue-100 rounded-xl bg-blue-50">
                <p className="text-2xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{submissionResult.score.toFixed(1)}%</p>
                <p className="text-xs font-medium text-slate-500">Score</p>
              </div>
              <div className="p-3 text-center border rounded-xl bg-rose-50 border-rose-100">
                <p className="text-2xl font-bold text-rose-600">{submissionResult.ncrCount}</p>
                <p className="text-xs font-medium text-slate-500">NCR Findings</p>
              </div>
            </div>
            {submissionResult.ncrCount > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 border rounded-xl bg-amber-50 border-amber-200">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700"><strong>{submissionResult.ncrCount} non-conformit{submissionResult.ncrCount > 1 ? 'ies' : 'y'} found.</strong> Raise an NCR to initiate corrective action for {submissionResult.department} department.</p>
              </div>
            )}
            {submissionResult.ncrCount === 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 border rounded-xl bg-emerald-50 border-emerald-200">
                <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-700"><strong>All checkpoints compliant.</strong> No non-conformities found. Great audit!</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {submissionResult.ncrCount > 0 && (
                <button onClick={handleRaiseNCR} className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold text-white transition-all shadow-md bg-rose-600 rounded-xl hover:bg-rose-700">
                  <AlertCircle size={18} /> Raise NCR ({submissionResult.ncrCount} finding{submissionResult.ncrCount > 1 ? 's' : ''})
                </button>
              )}
              <button onClick={handleGoToDashboard} className={`flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold rounded-xl transition-all shadow-sm ${submissionResult.ncrCount > 0 ? 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200' : 'text-white hover:shadow-lg'}`} style={submissionResult.ncrCount === 0 ? { backgroundColor: NAVBAR_COLORS.primary } : {}}>
                <ArrowLeft size={18} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isAlreadyCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="max-w-md p-8 mx-auto text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
          <h2 className="text-xl font-bold text-slate-800">Form Already Completed</h2>
          <p className="mt-2 text-sm text-slate-500">The form "{processNameParam}" has already been completed for this audit schedule.</p>
          <button onClick={() => navigate('/auditor')} className="px-5 py-2.5 mt-6 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (loading && !currentCheckSheet) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
          <p className="text-sm font-medium text-slate-500">Loading audit forms...</p>
        </div>
      </div>
    );
  }

  if (showSheetSelector && availableSheets.length > 1 && !currentCheckSheet && !processNameParam) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="max-w-3xl px-4 py-8 mx-auto">
          <button onClick={() => navigate('/auditor')} className="flex items-center gap-2 px-4 py-2.5 mb-6 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
            <div className="p-6 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.lighter }}>
                  <Layers size={28} style={{ color: NAVBAR_COLORS.primary }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Select IATF Audit Form</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Department: <span className="font-semibold text-slate-700">{departmentParam || formData.department}</span></p>
                  <p className="mt-1 text-xs text-slate-400">Multiple audit forms available. Please choose one.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {availableSheets.map(sheet => (
                <button key={sheet.id} onClick={() => loadSheetQuestions(sheet)} className="flex items-center justify-between w-full p-4 text-left transition-all bg-white border shadow-sm border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:shadow-md group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 group-hover:text-blue-700">{sheet.name}</h3>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>{sheet.processName}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{sheet.description || `IATF 16949 audit for ${sheet.processName} process`}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs font-medium text-slate-400"><FileText size={12} className="inline mr-1" />{sheet.questionCount || 0} questions</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="transition-all text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCheckSheet && !loading && !showSheetSelector && (departmentParam || formData.department)) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="max-w-md p-8 mx-auto text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <AlertCircle size={48} className="mx-auto mb-4 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-800">No IATF Forms Found</h2>
          <p className="mt-2 text-sm text-slate-500">Department "{departmentParam || formData.department}" has no associated IATF audit forms.</p>
          <button onClick={() => navigate('/auditor')} className="px-5 py-2.5 mt-6 text-sm font-medium text-white shadow-md rounded-xl hover:shadow-lg transition-all" style={{ backgroundColor: NAVBAR_COLORS.primary }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      <SubmissionSuccessModal />
      <div className="max-w-4xl px-4 py-8 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fadeInUp">
          <button onClick={() => navigate('/auditor')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && questions.length > 0 && (
              <button onClick={handleAutoFill} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.secondary }}>
                <Sparkles size={16} /> Demo Auto-Fill
              </button>
            )}
            <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all disabled:opacity-50">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {currentStep === 3 && (
              <button onClick={() => { isManualSubmitRef.current = true; submitAudit(); }} disabled={!allCheckpointsRated || saving || !currentCheckSheet} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all rounded-xl ${allCheckpointsRated && !saving && currentCheckSheet ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'}`} style={{ backgroundColor: allCheckpointsRated && !saving && currentCheckSheet ? NAVBAR_COLORS.primary : '#94a3b8' }}>
                <Send size={16} /> Submit Audit
              </button>
            )}
          </div>
        </div>

        {currentCheckSheet && (
          <div className="px-4 py-3 mb-6 text-sm font-medium border rounded-xl animate-fadeInUp" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter, color: NAVBAR_COLORS.dark }}>
            <strong>Selected Form:</strong> {currentCheckSheet.name} 
            {currentCheckSheet.processName && ` (Process: ${currentCheckSheet.processName})`}
          </div>
        )}

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
            <div className="p-6 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.lighter }}>
                  <Building size={20} style={{ color: NAVBAR_COLORS.primary }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">General Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Audit details for {formData.department} Department{currentCheckSheet?.processName && ` - ${currentCheckSheet.processName} Process`}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Audit Number</label>
                  <input type="text" value={formData.documentNumber} readOnly className="w-full px-3 py-2.5 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Department</label>
                  <input type="text" value={formData.department} readOnly className="w-full px-3 py-2.5 font-semibold bg-slate-50 border border-slate-200 rounded-xl" style={{ color: NAVBAR_COLORS.primary }} />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Process (IATF Form)</label>
                  <input type="text" value={currentCheckSheet?.processName || 'N/A'} readOnly className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-blue-50 text-blue-700 font-medium" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="Audit location" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Shift</label>
                  <select value={formData.shift} onChange={(e) => handleInputChange('shift', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option>Morning</option><option>Evening</option><option>Night</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Auditor Name</label>
                  <input type="text" value={formData.auditorName} readOnly className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Auditee Name <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.auditeeName} onChange={(e) => handleInputChange('auditeeName', e.target.value)} placeholder="Enter auditee name" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
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
        {currentStep === 2 && questions.length > 0 && currentQ && (
          <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-600">Checkpoint {currentCheckpointIndex + 1} of {questions.length}</span>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle size={12} /> {stats.compliant}</span>
                  <span className="flex items-center gap-1.5 text-amber-600"><Info size={12} /> {stats.minorNC}</span>
                  <span className="flex items-center gap-1.5 text-rose-600"><AlertCircle size={12} /> {stats.majorNC}</span>
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
                {currentQ.documentsVerified && currentQ.documentsVerified !== 'No documents specified' && (
                  <div className="p-4 mb-5 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                    <p className="mb-1 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>What to look for:</p>
                    <p className="text-sm text-slate-600">{currentQ.documentsVerified}</p>
                  </div>
                )}
                
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-bold text-slate-700">Observations / Findings</label>
                  <div className="mb-2 text-xs text-slate-500">
                    💡 <span className="font-medium">Tip:</span> Status auto-detects based on keywords:
                    <span className="ml-2 font-medium text-emerald-600">✓ met/compliant</span>
                    <span className="ml-2 font-medium text-amber-600">⚠ minor/gaps</span>
                    <span className="ml-2 font-medium text-rose-600">🔴 critical/failure</span>
                  </div>
                  <textarea 
                    value={formData.observations[currentQ.slNo] || ''} 
                    onChange={(e) => handleObservationChange(currentQ.slNo, e.target.value)} 
                    rows="3" 
                    placeholder="Enter your observations here... (Status will auto-detect based on keywords)" 
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>

                <div className="p-5 mb-6 border rounded-xl bg-slate-50 border-slate-200">
                  <label className="block mb-3 text-sm font-bold text-slate-700">Status / Rating</label>
                  <div className="grid grid-cols-3 gap-3">
                    {statusOptions.filter(opt => opt.value !== 'NOT_APPLICABLE').map(option => {
                      const Icon = option.icon;
                      const isSelected = formData.responses[currentQ.slNo] === option.value;
                      const style = getStatusStyle(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleStatusChange(currentQ.slNo, option.value)}
                          className="relative p-4 transition-all border-2 shadow-sm rounded-xl group hover:shadow-md"
                          style={{
                            backgroundColor: isSelected ? style.bg : 'white',
                            borderColor: isSelected ? style.border : '#e2e8f0',
                            color: isSelected ? style.text : '#64748b'
                          }}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <Icon size={22} style={{ color: isSelected ? style.icon : '#94a3b8' }} />
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
                    {formData.responses[currentQ.slNo] ? (
                      <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle size={14} /> Completed</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-600"><AlertCircle size={14} /> Select Status</span>
                    )}
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
                  <div className="text-center"><div className="text-xl font-bold text-emerald-600">{stats.compliant}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compliant (O)</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-amber-600">{stats.minorNC}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Minor NC (Mi)</div></div>
                  <div className="text-center"><div className="text-xl font-bold text-rose-600">{stats.majorNC}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Major NC (Ma)</div></div>
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
                  <p className="text-xs text-slate-500 mt-0.5">Review, sign and submit the audit report</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="p-5 mb-6 border rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                <h3 className="mb-4 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>Audit Summary</h3>
                <div className="grid grid-cols-5 gap-3 text-center">
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">O (Compliant)</p>
                    <p className="mt-1 text-xl font-bold text-emerald-600">{stats.compliant}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mi (Minor)</p>
                    <p className="mt-1 text-xl font-bold text-amber-600">{stats.minorNC}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ma (Major)</p>
                    <p className="mt-1 text-xl font-bold text-rose-600">{stats.majorNC}</p>
                  </div>
                  <div className="p-3 bg-white border shadow-sm rounded-xl border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Score</p>
                    <p className="mt-1 text-xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>{calculateCurrentScore()}%</p>
                  </div>
                </div>
              </div>

              {(stats.minorNC + stats.majorNC) > 0 && ncrFindings.length > 0 && (
                <div className="p-5 mb-6 border rounded-xl bg-rose-50 border-rose-200">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-bold text-rose-800">⚠️ NCR Required for audit report {formData.documentNumber}</p>
                    <button type="button" onClick={() => goToNcrForm(responseId)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm">
                      <AlertCircle size={14} /> Raise NCR
                    </button>
                  </div>
                  <div className="space-y-2 overflow-y-auto max-h-48">
                    {ncrFindings.slice(0, 3).map((finding) => (
                      <div key={finding.slNo} className="p-3 text-xs bg-white border rounded-lg border-rose-100">
                        <p className="font-bold text-slate-800">Q{finding.slNo}: {finding.checkpoint.substring(0, 60)}</p>
                        <p className="mt-0.5 text-rose-700 font-medium">{formData.responses[finding.slNo] === 'MAJOR_NC' ? 'Major NC' : 'Minor NC'}{finding.clause ? ` - ${finding.clause}` : ''}</p>
                      </div>
                    ))}
                    {ncrFindings.length > 3 && (<p className="text-xs font-medium text-center text-rose-600">+{ncrFindings.length - 3} more findings</p>)}
                  </div>
                </div>
              )}

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
                  <User size={14} className="inline mr-1" /> Auditee Name
                </label>
                <input type="text" value={formData.auditeeName} readOnly className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600" />
                <p className="mt-1 text-xs text-slate-500">Auditee will review and sign separately</p>
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
                <button onClick={prevStep} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => { isManualSubmitRef.current = true; submitAudit(); }}
                  disabled={(!formData.auditorSignature && !auditorSignatureImage) || !formData.date.trim() || saving || !currentCheckSheet}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-md transition-all ${
                    (formData.auditorSignature || auditorSignatureImage) && formData.date.trim() && !saving && currentCheckSheet ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: (formData.auditorSignature || auditorSignatureImage) && formData.date.trim() && !saving && currentCheckSheet ? NAVBAR_COLORS.primary : '#94a3b8' }}
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