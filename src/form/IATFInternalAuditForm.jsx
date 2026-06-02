// src/form/IATFInternalAuditForm.jsx - COMPLETE WITH SIGNATURE IMAGE SUPPORT + SUCCESS MODAL

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

const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

// STATUS OPTIONS with Ma, Mi, O mapping
const STATUS_OPTIONS = [
  { 
    value: 'COMPLIANT', 
    label: 'Compliant / Observation (O+)', 
    short: 'O+', 
    icon: CheckCircle, 
    color: 'green', 
    bgColor: 'bg-green-50', 
    textColor: 'text-green-700',
    column: 'O'
  },
  { 
    value: 'MINOR_NC', 
    label: 'Minor Non-Conformity (Mi/OI)', 
    short: 'OI', 
    icon: Info, 
    color: 'yellow', 
    bgColor: 'bg-yellow-50', 
    textColor: 'text-yellow-700',
    column: 'Mi'
  },
  { 
    value: 'MAJOR_NC', 
    label: 'Major Non-Conformity (Ma/O-)', 
    short: 'O-', 
    icon: AlertCircle, 
    color: 'red', 
    bgColor: 'bg-red-50', 
    textColor: 'text-red-700',
    column: 'Ma'
  },
  { 
    value: 'NOT_APPLICABLE', 
    label: 'Not Applicable', 
    short: 'N/A', 
    icon: Flag, 
    color: 'gray', 
    bgColor: 'bg-gray-50', 
    textColor: 'text-gray-700',
    column: 'NA'
  }
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

export default function IATFInternalAuditForm() {
  const { user } = useAuth();
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

  // ✅ SUCCESS MODAL STATE - correctly inside component
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  
  // Signature states
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

  // Check if a specific form is already completed for this schedule
  const checkIfFormCompleted = async (scheduleIdValue, checkSheetId) => {
    if (!scheduleIdValue || !checkSheetId) return false;
    try {
      const response = await axios.get(`${API_BASE}/templates/responses/all`, {
        withCredentials: true
      });
      const allResponses = response.data || [];
      const existingResponse = allResponses.find(r => 
        r.auditScheduleId === parseInt(scheduleIdValue) && 
        r.checkSheet?.id === checkSheetId
      );
      return !!existingResponse;
    } catch (error) {
      console.error('Error checking form completion:', error);
      return false;
    }
  };

  const fetchScheduleDetails = async () => {
    if (!scheduleId) return;
    
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/${scheduleId}`, {
        withCredentials: true
      });
      
      if (response?.data) {
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
    } catch (error) {
      if (error?.response?.status === 405) {
        console.warn('⚠️ Endpoint does not support GET. Skipping schedule pre-fill.');
      } else if (error?.response?.status === 404) {
        console.warn('⚠️ Schedule not found. Using URL params instead.');
      } else {
        console.warn('⚠️ Could not fetch schedule details:', error.message);
      }
    }
  };

  // Fetch available IATF check sheets for the department
  const fetchSheetsForDepartment = async (department) => {
    if (!department) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.get(
        `${API_BASE}/templates/iatf/by-department/${encodeURIComponent(department)}`,
        { withCredentials: true }
      );
      
      const sheets = response.data;
      setAvailableSheets(sheets);
      
      if (!sheets || sheets.length === 0) {
        addToast(`No IATF forms found for ${department} department`, 'warning');
        setLoading(false);
      } 
      else if (processNameParam) {
        const specificSheet = sheets.find(sheet => 
          sheet.processName === processNameParam || sheet.name.includes(processNameParam)
        );
        if (specificSheet) {
          const completed = await checkIfFormCompleted(scheduleId, specificSheet.id);
          if (completed) {
            setIsAlreadyCompleted(true);
            addToast(`This form (${specificSheet.processName}) has already been completed.`, 'warning');
            setLoading(false);
            return;
          }
          await loadSheetQuestions(specificSheet);
        } else {
          addToast(`Form "${processNameParam}" not found for ${department}`, 'error');
          setLoading(false);
        }
        setShowSheetSelector(false);
      } 
      else if (sheets.length === 1) {
        await loadSheetQuestions(sheets[0]);
      } 
      else {
        setShowSheetSelector(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching sheets:', error);
      addToast(`Failed to load forms for ${department}`, 'error');
      setLoading(false);
    }
  };

  const loadSheetQuestions = async (sheet) => {
    setLoading(true);
    
    try {
      const response = await axios.get(`${API_BASE}/templates/${sheet.id}`, {
        withCredentials: true
      });
      
      const fullSheet = response.data;
      setCurrentCheckSheet(fullSheet);
      
      let parsedQuestions = [];
      
      if (fullSheet.questions) {
        try {
          if (typeof fullSheet.questions === 'object' && fullSheet.questions !== null) {
            parsedQuestions = fullSheet.questions;
          } 
          else if (typeof fullSheet.questions === 'string') {
            let cleanJson = fullSheet.questions.trim();
            
            if (cleanJson.charCodeAt(0) === 0xFEFF) {
              cleanJson = cleanJson.substring(1);
            }
            
            try {
              parsedQuestions = JSON.parse(cleanJson);
            } catch (e) {
              cleanJson = cleanJson.replace(/\\n/g, '\\\\n');
              cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
              cleanJson = cleanJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
              
              try {
                parsedQuestions = JSON.parse(cleanJson);
              } catch (e2) {
                parsedQuestions = manualExtractQuestions(fullSheet.questions);
              }
            }
          }
        } catch (e) {
          parsedQuestions = manualExtractQuestions(fullSheet.questions);
        }
      }
      
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        parsedQuestions = getFallbackQuestions();
      }
      
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
      formattedQuestions.forEach(q => {
        initialResponses[q.slNo] = '';
        initialObservations[q.slNo] = '';
      });
      
      setFormData(prev => ({
        ...prev,
        responses: initialResponses,
        observations: initialObservations
      }));
      
      setShowSheetSelector(false);
      setCurrentCheckpointIndex(0);
      
    } catch (error) {
      console.error('Error loading questions:', error);
      addToast('Failed to load audit questions. Please check the form configuration.', 'error');
      const fallbackQuestions = getFallbackQuestions();
      setQuestions(fallbackQuestions);
    } finally {
      setLoading(false);
    }
  };

  const manualExtractQuestions = (jsonString) => {
    const questions = [];
    
    if (!jsonString || typeof jsonString !== 'string') {
      return getFallbackQuestions();
    }
    
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
          if (labelMatch) {
            displayLabel = labelMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
          }
          
          let documentsVerified = '';
          const docsMatch = qStr.match(/"documentsVerified"\s*:\s*"([^"]*?)"/);
          if (docsMatch) {
            documentsVerified = docsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          }
          
          questions.push({
            sNo: parseInt(sNoMatch[1]),
            clauseNo: clauseNo || '',
            displayLabel: displayLabel || `Question ${sNoMatch[1]}`,
            documentsVerified: documentsVerified || 'Review relevant documentation',
            fieldType: 'yes_no'
          });
          
        } catch (e) {
          console.error('Error parsing question part:', e);
        }
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
    if (questions.length > 0 && currentCheckpointIndex >= questions.length) {
      setCurrentCheckpointIndex(0);
    }
  }, [questions, currentCheckpointIndex]);

  // INITIALIZATION - runs only once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    const initialize = async () => {
      await fetchAuditorSignature();
      
      let decodedAuditeeName = '';
      if (urlAuditeeName && urlAuditeeName !== 'undefined' && urlAuditeeName !== 'null') {
        try {
          decodedAuditeeName = decodeURIComponent(urlAuditeeName);
          setFormData(prev => ({ 
            ...prev, 
            auditeeName: decodedAuditeeName,
            auditeeId: urlAuditeeId || ''
          }));
        } catch (e) {
          console.error('Error decoding auditee name:', e);
        }
      }
      
      let deptToFetch = departmentParam;
      if (!deptToFetch && scheduleId) {
        deptToFetch = formData.department;
      }
      
      if (deptToFetch) {
        setFormData(prev => ({ ...prev, department: deptToFetch }));
        await fetchSheetsForDepartment(deptToFetch);
      } else {
        addToast('No department specified', 'error');
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Load existing audit data in edit mode
  useEffect(() => {
    if (editId && currentCheckSheet) {
      loadAuditData();
    }
  }, [editId, currentCheckSheet]);

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

  // Auto-detect status from observation keywords
useEffect(() => {
  // Define keyword mappings
  const keywordStatusMap = {
    // MAJOR NC keywords (Critical issues)
    MAJOR_NC: [
      'critical', 'major', 'serious', 'severe', 'not performed', 'not met', 
      'overdue', 'ineffective', 'no evidence', 'missing completely', 
      'not implemented', 'failure', 'rejected', 'non-conforming',
      'risk', 'danger', 'urgent', 'immediate action', 'breakdown',
      'shutdown', 'stop production', 'customer complaint', 'recall'
    ],
    // MINOR NC keywords (Partial issues)
    MINOR_NC: [
      'minor', 'some', 'gaps', 'incomplete', 'partial', 'occasional',
      'not consistently', 'not always', 'sometimes', 'few', 'slight',
      'needs improvement', 'could be improved', 'deficiency',
      'observation', 'suggestion', 'recommendation'
    ],
    // COMPLIANT keywords (Positive/Okay)
    COMPLIANT: [
      'met', 'maintained', 'adequate', 'documented', 'compliant',
      'satisfactory', 'properly', 'all requirements', 'followed',
      'up to date', 'verified', 'confirmed', 'ok', 'good', 'fine',
      'acceptable', 'sufficient', 'complete', 'available'
    ]
  };

  // Check each question's observation for keywords
  questions.forEach((q) => {
    const observation = formData.observations[q.slNo] || '';
    const currentStatus = formData.responses[q.slNo];
    const lowerObservation = observation.toLowerCase();
    
    // Skip if observation is empty
    if (!observation.trim()) return;
    
    // Determine status based on keywords
    let detectedStatus = null;
    
    // Check for MAJOR NC first (highest priority)
    for (const keyword of keywordStatusMap.MAJOR_NC) {
      if (lowerObservation.includes(keyword)) {
        detectedStatus = 'MAJOR_NC';
        break;
      }
    }
    
    // If not major, check for MINOR NC
    if (!detectedStatus) {
      for (const keyword of keywordStatusMap.MINOR_NC) {
        if (lowerObservation.includes(keyword)) {
          detectedStatus = 'MINOR_NC';
          break;
        }
      }
    }
    
    // If not minor, check for COMPLIANT
    if (!detectedStatus) {
      for (const keyword of keywordStatusMap.COMPLIANT) {
        if (lowerObservation.includes(keyword)) {
          detectedStatus = 'COMPLIANT';
          break;
        }
      }
    }
    
    // Update status if detected and different from current
    if (detectedStatus && detectedStatus !== currentStatus) {
      handleStatusChange(q.slNo, detectedStatus);
    }
  });
}, [formData.observations, questions]); // Runs whenever any observation changes


  const calculateCurrentScore = () => {
    return calculateScore(formData.responses, questions);
  };

  const getNcrFindings = () => (
    questions.filter(q => ['MINOR_NC', 'MAJOR_NC'].includes(formData.responses[q.slNo]))
  );

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
    if (!savedResponseId) {
      addToast('First submit the audit to save the audit report number, then create NCR.', 'warning', 5000);
      return;
    }
    navigate(`/form7?${buildNcrQuery(savedResponseId)}`);
  };

  const saveAuditData = async (status, isSubmit = false) => {
    if (!currentCheckSheet || !currentCheckSheet.id) {
      addToast('No form selected', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const score = calculateCurrentScore();
      
      const answersObject = {
        documentNumber: formData.documentNumber,
        location: formData.location,
        date: formData.date,
        time: formData.time,
        auditorSignature: formData.auditorSignature,
        responses: formData.responses,
        observations: formData.observations,
        score: score,
        formName: currentCheckSheet.name,
        processName: currentCheckSheet.processName,
        auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId,
        auditorName: formData.auditorName,
        department: formData.department,
        shift: formData.shift
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
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: scheduleId ? parseInt(scheduleId) : null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: formData.auditorId ? parseInt(formData.auditorId) : null,
        auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId ? parseInt(formData.auditeeId) : null,
        answers: JSON.stringify(answersObject),
        totalScore: totalScore,
        maxPossibleScore: maxPossibleScore,
        percentageScore: percentageScore,
        compliantCount: compliantCount,
        minorNCCount: minorNCCount,
        majorNCCount: majorNCCount,
        summary: null,
        recommendations: null,
        status: status
      };
      
      let saved;
      if (responseId) {
        await auditScheduleApi.updateAuditResponse(responseId, payload);
        saved = { id: responseId };
        if (!isSubmit) {
          addToast('Draft updated', 'success');
        }
      } else {
        const response = await auditScheduleApi.saveAuditResponse(payload);
        saved = response.data;
        setResponseId(saved.id);
        if (!isSubmit) {
          addToast('Draft saved', 'success');
        }
        navigate(`/audit/iatf_internal?edit=${saved.id}&department=${formData.department}&processName=${currentCheckSheet.processName}`, { replace: true });
      }
      
      // ✅ SUBMIT FLOW: always submit, then show modal
      if (isSubmit && saved.id) {
        await auditScheduleApi.submitAuditResponse(saved.id);
        addToast(`Audit submitted! Score: ${percentageScore.toFixed(2)}%`, 'success');
        
        // ✅ Set modal data and show it
        setSubmissionResult({
          savedId: saved.id,
          score: percentageScore,
          ncrCount: ncrFindingCount,
          compliantCount: compliantCount,
          department: formData.department,
          documentNumber: formData.documentNumber
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error saving:', error);
      addToast(`Failed to ${isSubmit ? 'submit' : 'save'} audit`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!currentCheckSheet) {
      addToast('Please select an audit form first', 'warning');
      return;
    }
    await saveAuditData('DRAFT', false);
  };

  const submitAudit = async () => {
    if (!isManualSubmitRef.current) return;
    isManualSubmitRef.current = false;

    if (!currentCheckSheet) {
      addToast('No audit form selected', 'error');
      return;
    }

    const unanswered = questions.filter(q => !formData.responses[q.slNo]);
    if (unanswered.length > 0) {
      addToast(`Please answer all ${unanswered.length} remaining questions`, 'error');
      setCurrentStep(2);
      setCurrentCheckpointIndex(questions.findIndex(q => !formData.responses[q.slNo]));
      return;
    }

    if (!formData.auditeeName.trim()) {
      addToast('Please enter Auditee Name', 'error');
      setCurrentStep(1);
      return;
    }

    if (!formData.auditorSignature) {
      addToast('Please provide auditor signature', 'error');
      setCurrentStep(3);
      return;
    }

    await saveAuditData('SUBMITTED', true);
  };

  const handleAutoFill = () => {
  // Comprehensive observation templates with varied statuses
  const allObservations = [
    // COMPLIANT (Green) - 40% of data
    { text: "✓ Risk assessment documented and reviewed. All mitigation plans in place and effective.", status: "COMPLIANT" },
    { text: "✓ Interested parties identified and their requirements documented. Regular monitoring in place.", status: "COMPLIANT" },
    { text: "✓ Management actively engaged. Quality policy communicated and understood by all employees.", status: "COMPLIANT" },
    { text: "✓ Documentation complete and up-to-date. All processes follow defined procedures.", status: "COMPLIANT" },
    { text: "✓ Training records maintained. Competency matrix updated. All personnel qualified.", status: "COMPLIANT" },
    { text: "✓ Equipment calibration up to date. All measuring instruments within tolerance.", status: "COMPLIANT" },
    { text: "✓ Supplier performance monitored regularly. All vendors meet quality requirements.", status: "COMPLIANT" },
    { text: "✓ Internal audits conducted as per schedule. All findings closed on time.", status: "COMPLIANT" },
    { text: "✓ Corrective actions implemented effectively. No recurrence observed.", status: "COMPLIANT" },
    { text: "✓ Customer feedback positive. All delivery commitments met.", status: "COMPLIANT" },
    
    // MINOR NC (Yellow) - 35% of data
    { text: "⚠ Quality objectives defined but monitoring not consistently done. Some targets not tracked monthly.", status: "MINOR_NC" },
    { text: "⚠ 5S audit conducted but some areas need improvement. Minor housekeeping issues observed.", status: "MINOR_NC" },
    { text: "⚠ Training need identified but schedule not fully followed. Minor gaps in skill matrix.", status: "MINOR_NC" },
    { text: "⚠ Documentation available but some records not properly filed. Minor procedural deviations.", status: "MINOR_NC" },
    { text: "⚠ Preventive maintenance conducted but some records incomplete. Minor delays in schedule.", status: "MINOR_NC" },
    { text: "⚠ Supplier evaluation done but some ratings not updated. Minor documentation gaps.", status: "MINOR_NC" },
    { text: "⚠ Internal audit findings closed but some root causes not fully addressed.", status: "MINOR_NC" },
    { text: "⚠ Corrective action implemented but effectiveness verification pending.", status: "MINOR_NC" },
    { text: "⚠ Equipment calibration done but some stickers missing or illegible.", status: "MINOR_NC" },
    { text: "⚠ Process control charts maintained but some data points not recorded.", status: "MINOR_NC" },
    
    // MAJOR NC (Red) - 25% of data
    { text: "🔴 CRITICAL: Risk assessment NOT performed for key processes. No mitigation plan in place.", status: "MAJOR_NC" },
    { text: "🔴 MAJOR: Quality requirements NOT MET. Customer specification not followed for critical parameters.", status: "MAJOR_NC" },
    { text: "🔴 SERIOUS: Calibration overdue for critical measuring equipment. Product quality at risk.", status: "MAJOR_NC" },
    { text: "🔴 CRITICAL: Root cause analysis NOT performed for recurring non-conformities.", status: "MAJOR_NC" },
    { text: "🔴 MAJOR: Management review NOT conducted as per schedule. No evidence of top management commitment.", status: "MAJOR_NC" },
    { text: "🔴 SERIOUS: Non-conforming product not properly segregated. Risk of mixing with good product.", status: "MAJOR_NC" },
    { text: "🔴 CRITICAL: Customer complaint handling process ineffective. Recurring issues not resolved.", status: "MAJOR_NC" },
    { text: "🔴 MAJOR: Supplier approval process not followed. Unapproved vendors being used.", status: "MAJOR_NC" },
    { text: "🔴 SERIOUS: No evidence of internal audit program implementation.", status: "MAJOR_NC" },
    { text: "🔴 CRITICAL: Corrective action process not functioning. Repeated failures observed.", status: "MAJOR_NC" }
  ];
  
  // Shuffle the observations for random distribution
  const shuffledObservations = [...allObservations];
  for (let i = shuffledObservations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledObservations[i], shuffledObservations[j]] = [shuffledObservations[j], shuffledObservations[i]];
  }
  
  // Fill each question with a random observation
  questions.forEach((q, idx) => {
    const randomIndex = Math.floor(Math.random() * shuffledObservations.length);
    const observation = shuffledObservations[randomIndex];
    
    handleObservationChange(q.slNo, observation.text);
    handleStatusChange(q.slNo, observation.status);
  });
  
  // Fill form data if empty
  if (!formData.auditeeName.trim()) {
    handleInputChange('auditeeName', 'Demo Auditee User');
  }
  
  if (!formData.location.trim()) {
    handleInputChange('location', 'Plant A, Main Production Area');
  }
  
  // Show summary
  const stats = getProgressStats();
  const totalQuestions = questions.length;
  addToast(
    `✅ Demo data filled: ${stats.compliant} Compliant (${Math.round(stats.compliant/totalQuestions*100)}%), ` +
    `${stats.minorNC} Minor NC, ${stats.majorNC} Major NC`,
    'success'
  );
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
      case 'MINOR_NC': return 'border-yellow-500 bg-yellow-50';
      case 'MAJOR_NC': return 'border-red-500 bg-red-50';
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

  // ✅ SUCCESS MODAL COMPONENT - defined inside component so it has access to state
  const SubmissionSuccessModal = () => {
    if (!showSuccessModal || !submissionResult) return null;

    const handleGoToDashboard = () => {
      setShowSuccessModal(false);
      navigate('/auditor');
    };

    const handleRaiseNCR = () => {
      setShowSuccessModal(false);
      goToNcrForm(submissionResult.savedId);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
          
          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Audit Submitted!</h2>
            <p className="mt-1 text-sm text-purple-200">Report #{submissionResult.documentNumber}</p>
          </div>

          {/* Score Summary */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 text-center rounded-xl bg-green-50">
                <p className="text-2xl font-bold text-green-600">{submissionResult.compliantCount}</p>
                <p className="text-xs text-gray-500">Compliant</p>
              </div>
              <div className="p-3 text-center rounded-xl bg-purple-50">
                <p className="text-2xl font-bold text-purple-600">{submissionResult.score.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
              <div className="p-3 text-center rounded-xl bg-red-50">
                <p className="text-2xl font-bold text-red-500">{submissionResult.ncrCount}</p>
                <p className="text-xs text-gray-500">NCR Findings</p>
              </div>
            </div>

            {/* NCR Warning */}
            {submissionResult.ncrCount > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 border border-amber-200 rounded-xl bg-amber-50">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  <strong>{submissionResult.ncrCount} non-conformit{submissionResult.ncrCount > 1 ? 'ies' : 'y'} found.</strong>{' '}
                  Raise an NCR to initiate corrective action for {submissionResult.department} department.
                </p>
              </div>
            )}

            {submissionResult.ncrCount === 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 border border-green-200 rounded-xl bg-green-50">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  <strong>All checkpoints compliant.</strong> No non-conformities found. Great audit!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {submissionResult.ncrCount > 0 && (
                <button
                  onClick={handleRaiseNCR}
                  className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold text-white transition-all bg-red-600 rounded-xl hover:bg-red-700"
                  style={{ transition: 'all 0.15s ease' }}
                >
                  <AlertCircle size={18} />
                  Raise NCR ({submissionResult.ncrCount} finding{submissionResult.ncrCount > 1 ? 's' : ''})
                </button>
              )}
              <button
                onClick={handleGoToDashboard}
                className={`flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold rounded-xl ${
                  submissionResult.ncrCount > 0
                    ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                    : 'text-white bg-purple-600 hover:bg-purple-700'
                }`}
                style={{ transition: 'all 0.15s ease' }}
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If form is already completed, show message
  if (isAlreadyCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-8 mx-auto text-center bg-white rounded-lg shadow-sm">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold text-gray-800">Form Already Completed</h2>
          <p className="mt-2 text-gray-600">
            The form "{processNameParam}" has already been completed for this audit schedule.
          </p>
          <button 
            onClick={() => navigate('/auditor')} 
            className="px-4 py-2 mt-6 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Loading states
  if (loading && !currentCheckSheet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-600">Loading audit forms...</p>
        </div>
      </div>
    );
  }

  // Sheet selector screen
  if (showSheetSelector && availableSheets.length > 1 && !currentCheckSheet && !processNameParam) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl px-4 py-8 mx-auto">
          <button onClick={() => navigate('/auditor')} className="flex items-center gap-2 px-3 py-2 mb-6 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
            <ArrowLeft size={18} /> Back
          </button>
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <Layers size={28} className="text-purple-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Select IATF Audit Form</h2>
                  <p className="text-sm text-gray-600">Department: <span className="font-semibold">{departmentParam || formData.department}</span></p>
                  <p className="mt-1 text-sm text-gray-500">Multiple audit forms available. Please choose one.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {availableSheets.map(sheet => (
                <button key={sheet.id} onClick={() => loadSheetQuestions(sheet)} className="flex items-center justify-between w-full p-4 text-left border rounded-lg hover:bg-purple-50 hover:border-purple-300 group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 group-hover:text-purple-700">{sheet.name}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">{sheet.processName}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{sheet.description || `IATF 16949 audit for ${sheet.processName} process`}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400"><FileText size={12} className="inline mr-1" />{sheet.questionCount || 0} questions</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 transition-all group-hover:text-purple-600 group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No forms available
  if (!currentCheckSheet && !loading && !showSheetSelector && (departmentParam || formData.department)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-8 mx-auto text-center bg-white rounded-lg shadow-sm">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-gray-800">No IATF Forms Found</h2>
          <p className="mt-2 text-gray-600">Department "{departmentParam || formData.department}" has no associated IATF audit forms.</p>
          <button onClick={() => navigate('/auditor')} className="px-4 py-2 mt-6 text-white bg-purple-600 rounded-lg">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // Main form rendering
  return (
    <div className="min-h-screen mt-8 bg-gray-50">
      {/* ✅ SUCCESS MODAL - rendered at top level of the form */}
      <SubmissionSuccessModal />

      <div className="max-w-4xl px-4 py-6 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/auditor')} className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && questions.length > 0 && (
              <button onClick={handleAutoFill} className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200">
                <Sparkles size={16} /> Demo Auto-Fill
              </button>
            )}
            <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {currentStep === 3 && (
              <button onClick={() => { isManualSubmitRef.current = true; submitAudit(); }} disabled={!allCheckpointsRated || saving || !currentCheckSheet} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition ${allCheckpointsRated && !saving && currentCheckSheet ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                <Send size={16} /> Submit Audit
              </button>
            )}
          </div>
        </div>

        {/* Display selected form info */}
        {currentCheckSheet && (
          <div className="px-4 py-2 mb-4 text-sm text-purple-800 rounded-lg bg-purple-50">
            <strong>Selected Form:</strong> {currentCheckSheet.name} 
            {currentCheckSheet.processName && ` (Process: ${currentCheckSheet.processName})`}
          </div>
        )}

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
                  <button type="button" onClick={() => isClickable && setCurrentStep(step.number)} disabled={!isClickable} className={`flex items-center group transition-all duration-200 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <div className="ml-3 text-left">
                      <p className={`text-xs font-medium ${isActive ? 'text-purple-600' : 'text-gray-500'}`}>Step {step.number}</p>
                      <p className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{step.title}</p>
                    </div>
                  </button>
                  {step.number < steps.length && <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center gap-2"><Building size={20} className="text-purple-600" /><h2 className="text-lg font-semibold text-gray-800">General Information</h2></div>
              <p className="text-sm text-gray-500">Audit details for {formData.department} Department{currentCheckSheet?.processName && ` - ${currentCheckSheet.processName} Process`}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Audit Number</label><input type="text" value={formData.documentNumber} readOnly className="w-full px-3 py-2 font-mono text-sm bg-gray-100 border rounded-lg" /></div>
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Department</label><input type="text" value={formData.department} readOnly className="w-full px-3 py-2 font-semibold text-purple-700 bg-gray-100 border rounded-lg" /></div>
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Process (IATF Form)</label><input type="text" value={currentCheckSheet?.processName || 'N/A'} readOnly className="w-full px-3 py-2 text-blue-700 border rounded-lg bg-blue-50" /></div>
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Location</label><input type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="Audit location" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Date</label><input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Shift</label><select value={formData.shift} onChange={(e) => handleInputChange('shift', e.target.value)} className="w-full px-3 py-2 border rounded-lg"><option>Morning</option><option>Evening</option><option>Night</option></select></div>
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Auditor Name</label><input type="text" value={formData.auditorName} readOnly className="w-full px-3 py-2 bg-gray-100 border rounded-lg" /></div>
                <div><label className="block mb-1 text-sm font-medium text-gray-700">Auditee Name <span className="text-red-500">*</span></label><input type="text" value={formData.auditeeName} onChange={(e) => handleInputChange('auditeeName', e.target.value)} placeholder="Enter auditee name" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" required /></div>
              </div>
            </div>
            <div className="flex justify-end p-6 pt-0"><button onClick={nextStep} className="flex items-center gap-2 px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700">Next <ChevronRight size={18} /></button></div>
          </div>
        )}

        {/* Step 2: Audit Checkpoints */}
        {currentStep === 2 && questions.length > 0 && currentQ && (
          <div>
            <div className="p-4 mb-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Checkpoint {currentCheckpointIndex + 1} of {questions.length}</span>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} /> {stats.compliant}</span>
                  <span className="flex items-center gap-1 text-yellow-600"><Info size={12} /> {stats.minorNC}</span>
                  <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> {stats.majorNC}</span>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {questions.map((q, idx) => {
                  const isCompleted = formData.responses[q.slNo];
                  let buttonColorClass = '';
                  if (currentCheckpointIndex === idx) buttonColorClass = 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300';
                  else if (isCompleted) {
                    if (formData.responses[q.slNo] === 'COMPLIANT') buttonColorClass = 'bg-green-500 text-white';
                    else if (formData.responses[q.slNo] === 'MINOR_NC') buttonColorClass = 'bg-yellow-500 text-white';
                    else if (formData.responses[q.slNo] === 'MAJOR_NC') buttonColorClass = 'bg-red-500 text-white';
                  } else buttonColorClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
                  return (<button key={q.slNo} ref={currentCheckpointIndex === idx ? activeButtonRef : null} onClick={() => navigateToCheckpoint(idx)} className={`min-w-[36px] w-9 h-9 text-sm font-medium rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${buttonColorClass}`} title={`Checkpoint ${idx + 1}`}>{idx + 1}</button>);
                })}
              </div>
            </div>

            <div className={`bg-white rounded-lg shadow-md border-l-4 ${getStatusColor(formData.responses[currentQ.slNo])}`}>
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 text-white bg-purple-600 rounded-full">{currentQ.slNo}</span>
                    {currentQ.clause && <span className="px-2 py-1 text-xs text-purple-800 bg-purple-100 rounded-full">Clause {currentQ.clause}</span>}
                    {formData.responses[currentQ.slNo] && (<span className={`px-2 py-1 text-xs rounded-full ${formData.responses[currentQ.slNo] === 'COMPLIANT' ? 'bg-green-100 text-green-800' : formData.responses[currentQ.slNo] === 'MINOR_NC' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{getResponseStatus(formData.responses[currentQ.slNo])}</span>)}
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-semibold text-gray-800">{currentQ.checkpoint}</h3>
                {currentQ.documentsVerified && currentQ.documentsVerified !== 'No documents specified' && (<div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50"><p className="text-sm font-medium text-yellow-800">What to look for:</p><p className="text-sm text-yellow-700">{currentQ.documentsVerified}</p></div>)}
                 <div className="mb-4">
  <label className="block mb-2 text-sm font-medium text-gray-700">Observations / Findings</label>
  
  {/* ADD THIS HINT TEXT */}
  <div className="mb-2 text-xs text-gray-500">
    💡 <span className="font-medium">Tip:</span> Status auto-detects based on keywords you type:
    <span className="ml-2 text-green-600">✓ met/compliant/good</span>
    <span className="ml-2 text-yellow-600">⚠ minor/some/gaps</span>
    <span className="ml-2 text-red-600">🔴 critical/not met/failure</span>
  </div>
  
  <textarea 
    value={formData.observations[currentQ.slNo] || ''} 
    onChange={(e) => handleObservationChange(currentQ.slNo, e.target.value)} 
    rows="3" 
    placeholder="Enter your observations here... (Status will auto-detect based on keywords)" 
    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" 
  />
</div>
                <div className="p-4 mb-4 border border-gray-200 rounded-lg bg-gray-50">
                  <label className="block mb-3 text-sm font-medium text-gray-700">Status / Rating</label>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
  {statusOptions.filter(opt => opt.value !== 'NOT_APPLICABLE').map(option => {
    const Icon = option.icon;
    const isSelected = formData.responses[currentQ.slNo] === option.value;
    const hints = {
      COMPLIANT: "💡 Type keywords: 'met', 'compliant', 'adequate', 'good', '✓'",
      MINOR_NC: "💡 Type keywords: 'minor', 'some', 'gaps', 'needs improvement', '⚠'",
      MAJOR_NC: "💡 Type keywords: 'critical', 'not met', 'failure', 'risk', '🔴'"
    };
    
    return (
      <button
        key={option.value}
        onClick={() => handleStatusChange(currentQ.slNo, option.value)}
        className={`p-3 rounded-lg border-2 transition-all relative group ${
          isSelected 
            ? `${option.bgColor} border-${option.color}-500 shadow-md` 
            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
        title={hints[option.value]}
      >
        <div className="flex flex-col items-center gap-1">
          <Icon size={20} className={isSelected ? `text-${option.color}-600` : 'text-gray-500'} />
          <span className={`text-xs font-medium ${isSelected ? option.textColor : 'text-gray-600'}`}>
            {option.short}
          </span>
          <span className={`text-[10px] ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
            {option.label}
          </span>
        </div>
        {/* Tooltip on hover */}
        {!isSelected && (
          <div className="absolute z-10 px-2 py-1 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 rounded opacity-0 pointer-events-none bottom-full left-1/2 whitespace-nowrap group-hover:opacity-100">
            {hints[option.value]}
          </div>
        )}
      </button>
    );
  })}
</div>
                </div>
                <div className="flex justify-between pt-4 mt-4 border-t">
                  <button onClick={prevCheckpoint} disabled={currentCheckpointIndex === 0} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"><ChevronLeft size={16} /> Previous</button>
                  <div className="text-sm text-gray-500">{formData.responses[currentQ.slNo] ? (<span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> Completed</span>) : (<span className="flex items-center gap-1 text-yellow-600"><AlertCircle size={14} /> Select Status</span>)}</div>
                  <button onClick={nextCheckpoint} disabled={currentCheckpointIndex === questions.length - 1} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-purple-600 rounded-lg disabled:opacity-50 hover:bg-purple-700">Next <ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
            <div className="p-4 mt-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex gap-4"><div className="text-center"><div className="text-xl font-bold text-green-600">{stats.compliant}</div><div className="text-xs text-gray-500">Compliant (O)</div></div>
                <div className="text-center"><div className="text-xl font-bold text-yellow-600">{stats.minorNC}</div><div className="text-xs text-gray-500">Minor NC (Mi)</div></div>
                <div className="text-center"><div className="text-xl font-bold text-red-600">{stats.majorNC}</div><div className="text-xs text-gray-500">Major NC (Ma)</div></div>
                <div className="text-center"><div className="text-xl font-bold text-gray-600">{stats.total - stats.completed}</div><div className="text-xs text-gray-500">Pending</div></div></div>
                <div className="text-sm"><span className="font-medium">{stats.completed}</span> / <span className="text-gray-500">{stats.total}</span> completed</div>
              </div>
              {!allCheckpointsRated && (<div className="p-2 mt-3 text-xs text-center rounded-lg text-amber-600 bg-amber-50">⚠️ Please select status for all {stats.total - stats.completed} remaining checkpoints</div>)}
            </div>
            {allCheckpointsRated && (<div className="flex justify-end mt-4"><button onClick={nextStep} className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Next: Signature <ChevronRight size={18} /></button></div>)}
          </div>
        )}

        {/* Step 3: Signature & Submit */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center gap-2"><FileCheck size={20} className="text-purple-600" /><h2 className="text-lg font-semibold text-gray-800">Signature & Submit</h2></div>
              <p className="text-sm text-gray-500">Review, sign and submit the audit report</p>
            </div>
            <div className="p-6">
              <div className="p-4 mb-6 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Audit Summary</h3>
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold text-gray-800">{stats.total}</p></div>
                  <div><p className="text-xs text-gray-500">O (Compliant)</p><p className="text-xl font-bold text-green-600">{stats.compliant}</p></div>
                  <div><p className="text-xs text-gray-500">Mi (Minor)</p><p className="text-xl font-bold text-yellow-600">{stats.minorNC}</p></div>
                  <div><p className="text-xs text-gray-500">Ma (Major)</p><p className="text-xl font-bold text-red-600">{stats.majorNC}</p></div>
                  <div><p className="text-xs text-gray-500">Score</p><p className="text-xl font-bold text-purple-600">{calculateCurrentScore()}%</p></div>
                </div>
              </div>

              {/* NCR Findings Display */}
              {(stats.minorNC + stats.majorNC) > 0 && ncrFindings.length > 0 && (
                <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-red-800">⚠️ NCR Required for audit report {formData.documentNumber}</p>
                    <button type="button" onClick={() => goToNcrForm(responseId)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                      <AlertCircle size={14} /> Raise NCR
                    </button>
                  </div>
                  <div className="space-y-2 overflow-y-auto max-h-48">
                    {ncrFindings.slice(0, 3).map((finding) => (
                      <div key={finding.slNo} className="p-2 text-xs bg-white border border-red-100 rounded-lg">
                        <p className="font-semibold text-gray-800">Q{finding.slNo}: {finding.checkpoint.substring(0, 60)}</p>
                        <p className="mt-0.5 text-red-700">{formData.responses[finding.slNo] === 'MAJOR_NC' ? 'Major NC' : 'Minor NC'}{finding.clause ? ` - ${finding.clause}` : ''}</p>
                      </div>
                    ))}
                    {ncrFindings.length > 3 && (
                      <p className="text-xs text-center text-red-600">+{ncrFindings.length - 3} more findings</p>
                    )}
                  </div>
                </div>
              )}

              {/* Auditor Signature Field */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <FileCheck size={14} className="inline mr-1" /> Auditor Signature <span className="text-red-500">*</span>
                </label>
                
                {loadingSignature ? (
                  <div className="flex items-center justify-center p-4 border rounded-lg bg-gray-50">
                    <div className="w-5 h-5 border-2 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading signature...</span>
                  </div>
                ) : auditorSignatureImage ? (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <img src={auditorSignatureImage} alt="Auditor Signature" className="object-contain max-h-20" />
                    <p className="mt-2 text-xs text-green-600">✓ Signature loaded from your profile</p>
                  </div>
                ) : signatureError ? (
                  <div className="p-4 border rounded-lg bg-yellow-50">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <AlertTriangle size={16} />
                      <span className="text-sm">No signature found in your profile</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Please upload your signature in your profile settings. You can still proceed with typed signature below.</p>
                    <input type="text" value={formData.auditorSignature} onChange={(e) => handleInputChange('auditorSignature', e.target.value)} placeholder="Type your full name as signature (fallback)" className="w-full px-3 py-2 mt-3 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-500">No signature loaded. Please type your signature below.</p>
                    <input type="text" value={formData.auditorSignature} onChange={(e) => handleInputChange('auditorSignature', e.target.value)} placeholder="Type your full name as signature" className="w-full px-3 py-2 mt-3 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">Your electronic signature will be used for this audit report</p>
              </div>

              {/* Date Field */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <Calendar size={14} className="inline mr-1" /> Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                <p className="mt-1 text-xs text-gray-500">Date of signature</p>
              </div>

              {/* Auditee Name Display */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <User size={14} className="inline mr-1" /> Auditee Name
                </label>
                <input type="text" value={formData.auditeeName} readOnly className="w-full px-3 py-2 bg-gray-100 border rounded-lg" />
                <p className="mt-1 text-xs text-gray-500">Auditee will review and sign separately</p>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => { isManualSubmitRef.current = true; submitAudit(); }}
                  disabled={(!formData.auditorSignature && !auditorSignatureImage) || !formData.date.trim() || saving || !currentCheckSheet}
                  className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition ${
                    (formData.auditorSignature || auditorSignatureImage) && formData.date.trim() && !saving && currentCheckSheet
                      ? 'bg-purple-600 hover:bg-purple-700'
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