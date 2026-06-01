// SafetyAuditForm.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/context/AuthContext';
import { auditScheduleApi } from '../services/auditScheduleApi';
import { userAPI } from '../components/services/api';
import { useToast } from '../components/ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, Save, Send, Camera, Upload, X, 
  CheckCircle, AlertCircle, Clock, FileText, 
  MapPin, Users, Calendar, Edit, Eye, Sparkles,
  ChevronLeft, ChevronRight, Info, RefreshCw,
  Hash, Tag, User, ClipboardList, PenTool,
  ChevronUp, ChevronDown, Flag, ThumbsUp, ThumbsDown,
  Shield, AlertTriangle, DoorOpen, Hand, Wrench, 
  Package, Zap, Truck, HardHat, Building
} from 'lucide-react';

// Document number generator
const generateDocumentNumber = (sheetKey) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AUD-${sheetKey.toUpperCase()}-${year}${month}-${random}`;
};

export default function SafetyAuditForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [responseId, setResponseId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentCheckSheet, setCurrentCheckSheet] = useState(null);
  const [safetyCheckSheetIds, setSafetyCheckSheetIds] = useState([]);
  const [auditorSignatureImage, setAuditorSignatureImage] = useState(null);
  const [loadingSignature, setLoadingSignature] = useState(false);
  const [signatureFetched, setSignatureFetched] = useState(false);
  const [auditorSignatureUserId, setAuditorSignatureUserId] = useState(null);
  
  const progressContainerRef = useRef(null);
  const activeButtonRef = useRef(null);
  const auditLoaded = useRef(false);
  const isManualSubmitRef = useRef(false);

  const sheetKey = 'safety';

  const [formData, setFormData] = useState({
    documentNumber: '',
    location: '',
    department: '',
    area: '',
    shift: 'Morning',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    auditorName: user?.name || '',
    auditorId: user?.id,
    hodEmail: '',
    auditeeName: '',
    auditeeSignature: '',
    status: 'IN_PROGRESS',
    observations: {},
    remarks: {},
    compliance: {},
    score: null,
    auditorSignature: '',
    createdAt: new Date().toISOString()
  });

  // Fetch all Safety check sheet IDs dynamically
  const fetchSafetyCheckSheetIds = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/templates/type/DAILY_SAFETY', {
        withCredentials: true
      });
      
      const safetySheets = response.data || [];
      const ids = safetySheets.map(sheet => sheet.id);
      console.log('✅ Safety Check Sheet IDs:', ids);
      setSafetyCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching Safety check sheets:', error);
      return [];
    }
  };

  // Fetch questions from backend dynamically
  const fetchQuestionsFromBackend = async () => {
    setLoadingQuestions(true);
    try {
      const safetyIds = await fetchSafetyCheckSheetIds();
      
      if (safetyIds.length === 0) {
        throw new Error('No Safety check sheets found in database. Please initialize templates first.');
      }
      
      const checkSheetId = safetyIds[0];
      console.log('✅ Using Safety check sheet ID:', checkSheetId);
      
      const response = await axios.get(`http://localhost:8080/api/templates/${checkSheetId}`, {
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
      
      console.log('Raw Safety questions from DB:', parsedQuestions);
      
      // Format questions for display - using documentsVerified for what to look for
      const formattedQuestions = parsedQuestions.map((q, idx) => ({
        slNo: q.sNo || q.slNo || (idx + 1),
        checkpoint: q.displayLabel,
        method: q.method || 'Visual',
        frequency: q.frequency || 'Daily',
        whatToLookFor: q.documentsVerified || q.whatToLookFor || '',
        fieldKey: q.fieldKey,
        fieldType: q.fieldType
      }));
      
      console.log('Formatted Safety questions:', formattedQuestions);
      setQuestions(formattedQuestions);
      
      // Initialize responses
      const initialObservations = {};
      const initialRemarks = {};
      const initialCompliance = {};
      formattedQuestions.forEach(q => {
        initialObservations[q.slNo] = '';
        initialRemarks[q.slNo] = '';
        initialCompliance[q.slNo] = '';
      });
      
      setFormData(prev => ({
        ...prev,
        observations: { ...prev.observations, ...initialObservations },
        remarks: { ...prev.remarks, ...initialRemarks },
        compliance: { ...prev.compliance, ...initialCompliance }
      }));
      
    } catch (error) {
      console.error('Error fetching Safety questions from backend:', error);
      addToast('Failed to load audit questions from database: ' + (error.message || 'Unknown error'), 'error');
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestionsFromBackend();
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
      setAuditorSignatureUserId(user.id);
      setFormData(prev => ({
        ...prev,
        auditorName: user.name || '',
        auditorSignature: user.name || ''
      }));
    }
  }, [user, editId]);

  // Fetch signature
  useEffect(() => {
    const fetchAuditorSignature = async () => {
      if (!auditorSignatureUserId || signatureFetched) return;
      setLoadingSignature(true);
      try {
        const signatureData = await userAPI.getUserSignature(auditorSignatureUserId);
        if (signatureData) {
          setAuditorSignatureImage(signatureData);
          setFormData(prev => ({ ...prev, auditorSignature: prev.auditorName || user?.name || '' }));
        }
        setSignatureFetched(true);
      } catch (error) {
        console.error('Error fetching signature:', error);
      } finally {
        setLoadingSignature(false);
      }
    };
    fetchAuditorSignature();
  }, [auditorSignatureUserId, signatureFetched, user?.name]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAuditResponse(parseInt(editId));
      const audit = response.data;
      
      if (audit) {
        setResponseId(audit.id);
        if (audit.checkSheet) {
          setCurrentCheckSheet(audit.checkSheet);
        }
        
        let answers = {};
        try {
          answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : (audit.answers || {});
        } catch (e) {
          answers = {};
        }
        
        setFormData({
          documentNumber: answers.documentNumber || '',
          location: answers.location || '',
          department: answers.department || '',
          area: answers.area || '',
          shift: audit.shift || 'Morning',
          date: audit.auditDate ? audit.auditDate.split('T')[0] : new Date().toISOString().split('T')[0],
          time: answers.time || new Date().toLocaleTimeString(),
          auditorName: audit.auditorName || user?.name || '',
          auditorId: audit.auditorId || user?.id,
          hodEmail: answers.hodEmail || '',
          auditeeName: answers.auditeeName || '',
          auditeeSignature: answers.auditeeSignature || '',
          status: audit.status || 'IN_PROGRESS',
          observations: answers.observations || {},
          remarks: answers.remarks || {},
          compliance: answers.compliance || {},
          score: answers.score || null,
          auditorSignature: answers.auditorSignature || '',
          createdAt: audit.createdAt || new Date().toISOString()
        });
        
        if (audit.auditorId) {
          setAuditorSignatureUserId(audit.auditorId);
        }
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

  const handleRemarkChange = (questionId, remark) => {
    setFormData(prev => ({
      ...prev,
      remarks: { ...prev.remarks, [questionId]: remark }
    }));
  };

  const handleComplianceChange = (questionId, compliance) => {
    setFormData(prev => ({
      ...prev,
      compliance: { ...prev.compliance, [questionId]: compliance }
    }));
  };

  const calculateScore = () => {
    const totalQuestions = questions.length;
    let compliantCount = 0;
    questions.forEach(q => {
      if (formData.compliance[q.slNo] === 'YES') {
        compliantCount++;
      }
    });
    return totalQuestions > 0 ? Math.round((compliantCount / totalQuestions) * 100) : 0;
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      if (!currentCheckSheet || !currentCheckSheet.id) {
        throw new Error('Check sheet not loaded. Please refresh and try again.');
      }
      
      const score = calculateScore();
      
      const answersObject = {
        documentNumber: formData.documentNumber,
        location: formData.location,
        department: formData.department,
        area: formData.area,
        date: formData.date,
        time: formData.time,
        hodEmail: formData.hodEmail,
        auditeeName: formData.auditeeName,
        auditeeSignature: formData.auditeeSignature,
        auditorSignature: formData.auditorSignature,
        observations: formData.observations,
        remarks: formData.remarks,
        compliance: formData.compliance,
        score: score,
        formName: currentCheckSheet?.name || 'Safety Audit'
      };
      
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.compliance || {}).filter(r => r === 'YES').length;
      const totalScore = compliantCount;
      const maxPossibleScore = totalQuestions;
      const percentageScore = maxPossibleScore > 0 ? (totalScore * 100.0 / maxPossibleScore) : 0;
      
      const payload = {
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: formData.auditorId ? parseInt(formData.auditorId) : null,
        auditeeName: formData.auditeeName,
        auditeeId: null,
        answers: JSON.stringify(answersObject),
        totalScore: totalScore,
        maxPossibleScore: maxPossibleScore,
        percentageScore: percentageScore,
        summary: null,
        recommendations: null,
        status: 'DRAFT'
      };
      
      console.log('Saving draft with payload:', payload);
      
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
        navigate(`/audit/safety?edit=${saved.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      addToast(`Failed to save draft: ${errorMessage}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitAudit = async () => {
    if (!isManualSubmitRef.current) return;
    isManualSubmitRef.current = false;

    const unanswered = questions.filter(q => !formData.compliance[q.slNo]);
    if (unanswered.length > 0) {
      addToast(`Please answer all ${unanswered.length} remaining questions`, 'error');
      setCurrentStep(2);
      setCurrentCheckpointIndex(questions.findIndex(q => !formData.compliance[q.slNo]));
      return;
    }

    if (!formData.auditeeName.trim()) {
      addToast('Please enter Auditee Name', 'error');
      setCurrentStep(1);
      return;
    }

    setSaving(true);
    try {
      if (!currentCheckSheet || !currentCheckSheet.id) {
        throw new Error('Check sheet not loaded. Please refresh and try again.');
      }
      
      const score = calculateScore();
      
      const answersObject = {
        documentNumber: formData.documentNumber,
        location: formData.location,
        department: formData.department,
        area: formData.area,
        date: formData.date,
        time: formData.time,
        hodEmail: formData.hodEmail,
        auditeeName: formData.auditeeName,
        auditeeSignature: formData.auditeeSignature,
        auditorSignature: formData.auditorSignature,
        observations: formData.observations,
        remarks: formData.remarks,
        compliance: formData.compliance,
        score: score,
        formName: currentCheckSheet?.name || 'Safety Audit'
      };
      
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.compliance || {}).filter(r => r === 'YES').length;
      const totalScore = compliantCount;
      const maxPossibleScore = totalQuestions;
      const percentageScore = maxPossibleScore > 0 ? (totalScore * 100.0 / maxPossibleScore) : 0;
      
      const payload = {
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: formData.auditorId ? parseInt(formData.auditorId) : null,
        auditeeName: formData.auditeeName,
        auditeeId: null,
        answers: JSON.stringify(answersObject),
        totalScore: totalScore,
        maxPossibleScore: maxPossibleScore,
        percentageScore: percentageScore,
        summary: null,
        recommendations: null,
        status: 'SUBMITTED'
      };
      
      console.log('Submitting audit with payload:', payload);
      
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
      if (score >= 90) ratingText = 'Excellent - Safety standards well maintained!';
      else if (score >= 75) ratingText = 'Good - Minor improvements needed';
      else if (score >= 60) ratingText = 'Satisfactory - Several improvements needed';
      else ratingText = 'Poor - Immediate corrective action required';
      
      addToast(`Safety Audit submitted successfully! Score: ${score}% - ${ratingText}`, 'success');
      navigate('/auditor/safety');
    } catch (error) {
      console.error('Error submitting audit:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      addToast(`Failed to submit audit: ${errorMessage}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = () => {
    const sampleObservations = [
      "All door sensors tested and working properly. Machine stops immediately when door opens.",
      "Double hand operation buttons functioning correctly. Tested with single hand - machine does not operate.",
      "Double springs in good condition. No visible wear or damage.",
      "Insulating jacket intact with no cracks or damage. Thermally efficient.",
      "All machine guards in place and secure. Interlocks functioning properly.",
      "Emergency switches accessible and functional.",
      "Material movement follows marked pathways. Forklift operations safe.",
      "Stacking height clearly marked on all trolleys.",
      "Tool room organized. All tools stored properly. Safety signage displayed.",
      "Skilled operators deployed at all critical machines. Training records verified."
    ];
    
    const sampleRemarks = [
      "Continue daily checks. Document any failures immediately.",
      "Maintain weekly verification log.",
      "Schedule spring replacement every 6 months.",
      "Inspect jacket monthly for any damage.",
      "Conduct daily guard inspection before shift start.",
      "Test emergency switches weekly.",
      "Conduct monthly safety training.",
      "Reinforce stacking height compliance.",
      "Update tool inventory monthly.",
      "Review skill matrix quarterly."
    ];
    
    const updatedObservations = {};
    const updatedRemarks = {};
    const updatedCompliance = {};
    
    questions.forEach((q, idx) => {
      updatedObservations[q.slNo] = sampleObservations[idx % sampleObservations.length];
      updatedRemarks[q.slNo] = sampleRemarks[idx % sampleRemarks.length];
      updatedCompliance[q.slNo] = 'YES';
    });
    
    setFormData(prev => ({
      ...prev,
      observations: updatedObservations,
      remarks: updatedRemarks,
      compliance: updatedCompliance
    }));
    
    addToast('Demo data filled successfully', 'success');
  };

  const refreshSignature = async () => {
    if (!auditorSignatureUserId) {
      addToast('Auditor signature user not available', 'error');
      return;
    }
    setSignatureFetched(false);
    setAuditorSignatureImage(null);
    setLoadingSignature(true);
    try {
      const signatureData = await userAPI.getUserSignature(auditorSignatureUserId);
      if (signatureData) {
        setAuditorSignatureImage(signatureData);
        addToast('Signature refreshed successfully', 'success');
      } else {
        addToast('No signature found for this auditor', 'warning');
      }
      setSignatureFetched(true);
    } catch (error) {
      console.error('Error refreshing signature:', error);
      addToast('Failed to refresh signature', 'error');
    } finally {
      setLoadingSignature(false);
    }
  };

  const getProgressStats = () => {
    const total = questions.length;
    const completed = Object.keys(formData.compliance).filter(key => formData.compliance[key]).length;
    const compliant = Object.values(formData.compliance).filter(r => r === 'YES').length;
    const nonCompliant = Object.values(formData.compliance).filter(r => r === 'NO').length;
    return { total, completed, compliant, nonCompliant };
  };

  const stats = getProgressStats();
  const allCheckpointsRated = stats.completed === stats.total;
  const currentQ = questions[currentCheckpointIndex];
  const currentScore = calculateScore();

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

  const getComplianceColor = (compliance) => {
    if (compliance === 'YES') return 'border-green-500 bg-green-50';
    if (compliance === 'NO') return 'border-red-500 bg-red-50';
    return 'border-gray-300 bg-white';
  };

  const steps = [
    { number: 1, title: 'General Information', icon: User },
    { number: 2, title: 'Safety Checkpoints', icon: Shield },
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
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading Safety audit questions from database...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <Shield size={64} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">No Questions Found</h2>
          <p className="text-gray-500">No checkpoints available for Safety audit.</p>
          <p className="mt-1 text-sm text-gray-400">Please ensure check sheets are initialized in the database.</p>
          <button
            onClick={() => navigate('/auditor/safety')}
            className="px-4 py-2 mt-4 text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl px-4 py-6 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/auditor/safety')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <button
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200"
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
                disabled={!allCheckpointsRated || saving}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition ${
                  allCheckpointsRated && !saving
                    ? 'bg-red-600 hover:bg-red-700'
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
                      isActive ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md' :
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <div className="ml-3 text-left">
                      <p className={`text-xs font-medium ${isActive ? 'text-red-600' : 'text-gray-500'}`}>Step {step.number}</p>
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
                <Shield size={20} className="text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">General Information</h2>
              </div>
              <p className="text-sm text-gray-500">Daily Workplace Safety Audit Details</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Document No.</label>
                  <input type="text" value={formData.documentNumber} readOnly className="w-full px-3 py-2 bg-gray-100 border rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="Audit location" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Department / Area</label>
                  <input type="text" value={formData.department} onChange={(e) => handleInputChange('department', e.target.value)} placeholder="e.g., Production, Store, Office" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Audit Date</label>
                  <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Shift</label>
                  <select value={formData.shift} onChange={(e) => handleInputChange('shift', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option>Morning</option>
                    <option>Evening</option>
                    <option>Night</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Auditor Name</label>
                  <input type="text" value={formData.auditorName} readOnly className="w-full px-3 py-2 bg-gray-100 border rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Auditee Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.auditeeName}
                    onChange={(e) => handleInputChange('auditeeName', e.target.value)}
                    placeholder="Enter auditee name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Department Head Email</label>
                  <input type="email" value={formData.hodEmail} onChange={(e) => handleInputChange('hodEmail', e.target.value)} placeholder="hod@company.com" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex justify-end p-6 pt-0">
              <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Safety Checkpoints */}
        {currentStep === 2 && currentQ && (
          <div>
            {/* Progress Navigation */}
            <div className="p-4 mb-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Checkpoint {currentCheckpointIndex + 1} of {questions.length}</span>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} /> Compliant: {stats.compliant}</span>
                  <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> Non-Compliant: {stats.nonCompliant}</span>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {questions.map((q, idx) => {
                  const isCompleted = formData.compliance[q.slNo];
                  
                  let buttonColorClass = '';
                  if (currentCheckpointIndex === idx) {
                    buttonColorClass = 'bg-red-600 text-white shadow-md ring-2 ring-red-300';
                  } else if (isCompleted) {
                    buttonColorClass = formData.compliance[q.slNo] === 'YES' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-red-500 text-white';
                  } else {
                    buttonColorClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
                  }
                  
                  return (
                    <button
                      key={q.slNo}
                      ref={currentCheckpointIndex === idx ? activeButtonRef : null}
                      onClick={() => navigateToCheckpoint(idx)}
                      className={`min-w-[36px] w-9 h-9 text-sm font-medium rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${buttonColorClass}`}
                      title={`Checkpoint ${idx + 1}${isCompleted ? ` - ${formData.compliance[q.slNo] === 'YES' ? 'Compliant' : 'Non-Compliant'}` : ' - Pending'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Card */}
            <div className={`bg-white rounded-lg shadow-md border-l-4 ${getComplianceColor(formData.compliance[currentQ.slNo])}`}>
              <div className="p-6">
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 text-white bg-red-600 rounded-full">
                      {currentQ.slNo}
                    </span>
                    {formData.compliance[currentQ.slNo] && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        formData.compliance[currentQ.slNo] === 'YES'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {formData.compliance[currentQ.slNo] === 'YES' ? '✓ Compliant' : '✗ Non-Compliant'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>Method: {currentQ.method}</span>
                    <span>Frequency: {currentQ.frequency}</span>
                  </div>
                </div>

                {/* Safety Audit Point */}
                <h3 className="mb-4 text-lg font-semibold text-gray-800">{currentQ.checkpoint}</h3>

                {/* What to look for */}
                {currentQ.whatToLookFor && (
                  <div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50">
                    <p className="text-sm font-medium text-yellow-800">What to look for:</p>
                    <p className="text-sm text-yellow-700">{currentQ.whatToLookFor}</p>
                  </div>
                )}

                {/* Method and Frequency Info */}
                <div className="grid grid-cols-2 gap-3 p-3 mb-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs text-gray-500">Inspection Method</p>
                    <p className="text-sm font-medium text-gray-700">{currentQ.method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Frequency</p>
                    <p className="text-sm font-medium text-gray-700">{currentQ.frequency}</p>
                  </div>
                </div>

                {/* Observation */}
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Observation
                  </label>
                  <textarea
                    value={formData.observations[currentQ.slNo] || ''}
                    onChange={(e) => handleObservationChange(currentQ.slNo, e.target.value)}
                    rows="2"
                    placeholder="Enter your observations..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Remark */}
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Remark / Action Required
                  </label>
                  <textarea
                    value={formData.remarks[currentQ.slNo] || ''}
                    onChange={(e) => handleRemarkChange(currentQ.slNo, e.target.value)}
                    rows="2"
                    placeholder="Enter remarks or corrective actions..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Compliance Status */}
                <div className="p-4 mb-4 border border-gray-200 rounded-lg bg-gray-50">
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    Compliance Status <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleComplianceChange(currentQ.slNo, 'YES')}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.compliance[currentQ.slNo] === 'YES'
                          ? 'bg-green-100 border-green-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <CheckCircle size={20} className="text-green-600" />
                      <span className="font-medium text-green-700">Compliant (Yes)</span>
                    </button>
                    <button
                      onClick={() => handleComplianceChange(currentQ.slNo, 'NO')}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.compliance[currentQ.slNo] === 'NO'
                          ? 'bg-red-100 border-red-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <AlertCircle size={20} className="text-red-600" />
                      <span className="font-medium text-red-700">Non-Compliant (No)</span>
                    </button>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 mt-4 border-t">
                  <button
                    onClick={prevCheckpoint}
                    disabled={currentCheckpointIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="text-sm text-gray-500">
                    {formData.compliance[currentQ.slNo] ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={14} /> Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle size={14} /> Select Status
                      </span>
                    )}
                  </div>
                  <button
                    onClick={nextCheckpoint}
                    disabled={currentCheckpointIndex === questions.length - 1}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-lg disabled:opacity-50 hover:bg-red-700"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="p-4 mt-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{questions.length}</div>
                    <div className="text-xs text-gray-500">Total Checks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{stats.compliant}</div>
                    <div className="text-xs text-gray-500">Compliant</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{stats.nonCompliant}</div>
                    <div className="text-xs text-gray-500">Non-Compliant</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-600">{questions.length - stats.completed}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{stats.completed}</span> / <span className="text-gray-500">{questions.length}</span> completed
                </div>
              </div>
              <div className="w-full h-2 mt-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 transition-all duration-300 bg-green-500 rounded-full"
                  style={{ width: `${(stats.completed / questions.length) * 100}%` }}
                />
              </div>
              {!allCheckpointsRated && (
                <div className="p-2 mt-3 text-xs text-center rounded-lg text-amber-600 bg-amber-50">
                  ⚠️ Please select compliance status for all {questions.length - stats.completed} remaining checkpoints
                </div>
              )}
            </div>

            {/* Next Step Button */}
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
              <p className="text-sm text-gray-500">Review and submit the safety audit report</p>
            </div>
            <div className="p-6">
              {/* Audit Summary */}
              <div className="p-4 mb-6 rounded-lg bg-gradient-to-r from-red-50 to-orange-50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Safety Audit Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Total Checks</p>
                    <p className="text-xl font-bold text-gray-800">{questions.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Compliant</p>
                    <p className="text-xl font-bold text-green-600">{stats.compliant}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Non-Compliant</p>
                    <p className="text-xl font-bold text-red-600">{stats.nonCompliant}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Safety Score</p>
                    <p className="text-xl font-bold text-red-600">{currentScore}%</p>
                  </div>
                </div>
              </div>

              {/* Non-Compliant Items Summary */}
              {stats.nonCompliant > 0 && (
                <div className="p-3 mb-6 border border-red-200 rounded-lg bg-red-50">
                  <h3 className="mb-2 text-sm font-semibold text-red-800">Non-Compliant Items</h3>
                  <div className="space-y-2">
                    {questions.filter(q => formData.compliance[q.slNo] === 'NO').map(q => (
                      <div key={q.slNo} className="text-sm">
                        <span className="font-medium">{q.slNo}. {q.checkpoint}</span>
                        <p className="mt-1 ml-4 text-xs text-red-600">{formData.remarks[q.slNo] || 'No remark provided'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature Section */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Auditor Signature */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Auditor Signature</label>
                  {loadingSignature ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="w-5 h-5 border-2 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                      <p className="text-sm text-gray-500">Loading signature...</p>
                    </div>
                  ) : auditorSignatureImage ? (
                    <div className="p-3 space-y-2 border rounded-lg bg-gray-50">
                      <img src={auditorSignatureImage} alt="Signature" className="object-contain h-16" />
                      <p className="text-xs text-green-600">✓ Signature fetched for: {formData.auditorName}</p>
                      <button onClick={refreshSignature} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800">
                        <RefreshCw size={12} /> Refresh Signature
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formData.auditorSignature}
                      onChange={(e) => handleInputChange('auditorSignature', e.target.value)}
                      placeholder="Type your full name as signature"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  )}
                </div>

                {/* Auditee Signature */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Auditee Signature</label>
                  <input
                    type="text"
                    value={formData.auditeeSignature}
                    onChange={(e) => handleInputChange('auditeeSignature', e.target.value)}
                    placeholder="Auditee signature"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auditee acknowledges the audit findings</p>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 mt-6 border-t">
                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => {
                    isManualSubmitRef.current = true;
                    submitAudit();
                  }}
                  disabled={(!auditorSignatureImage && !formData.auditorSignature.trim()) || !formData.auditeeName.trim() || saving}
                  className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition ${
                    (auditorSignatureImage || formData.auditorSignature.trim()) && formData.auditeeName.trim() && !saving
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                  {saving ? 'Submitting...' : 'Submit Safety Audit Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}