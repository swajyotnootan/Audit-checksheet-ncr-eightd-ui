// PokaYokeAuditForm.jsx
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
  Wrench, Settings, Plus, Trash2
} from 'lucide-react';

// Document number generator
const generateDocumentNumber = (sheetKey) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AUD-${sheetKey.toUpperCase()}-${year}${month}-${random}`;
};

export default function PokaYokeAuditForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [loadingCheckSheet, setLoadingCheckSheet] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentVerificationIndex, setCurrentVerificationIndex] = useState(0);
  const [responseId, setResponseId] = useState(null);
  const [currentCheckSheet, setCurrentCheckSheet] = useState(null);
  const [pokaYokeCheckSheetIds, setPokaYokeCheckSheetIds] = useState([]);
  
  const progressContainerRef = useRef(null);
  const activeButtonRef = useRef(null);
  const auditLoaded = useRef(false);
  const isManualSubmitRef = useRef(false);

  // Poka-Yoke verification entries (dynamic list)
  const [verifications, setVerifications] = useState([
    { id: 1, machineName: '', machineNumber: '', pokaYokeName: '', pokaYokeNo: '', location: '', status: 'NOT_OK', remark: '' }
  ]);
  const [nextId, setNextId] = useState(2);

  const [formData, setFormData] = useState({
    documentNumber: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    checkedBy: user?.name || '',
    checkedById: user?.id,
    approvedBy: '',
    approvedById: null,
    status: 'IN_PROGRESS',
    auditorSignature: '',
    createdAt: new Date().toISOString()
  });

  // Fetch all Poka-Yoke check sheet IDs dynamically
  const fetchPokaYokeCheckSheetIds = async () => {
    try {
      const response = await axios.get('https://qsutrarmsclm.hub.swajyot.co.in:8476/api/templates/type/POKA_YOKE', {
        withCredentials: true
      });
      
      const pokaYokeSheets = response.data || [];
      const ids = pokaYokeSheets.map(sheet => sheet.id);
      console.log('✅ Poka-Yoke Check Sheet IDs:', ids);
      setPokaYokeCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching Poka-Yoke check sheets:', error);
      return [];
    }
  };

  // Fetch check sheet dynamically
  const fetchCheckSheet = async () => {
    setLoadingCheckSheet(true);
    try {
      const pokaYokeIds = await fetchPokaYokeCheckSheetIds();
      
      if (pokaYokeIds.length === 0) {
        throw new Error('No Poka-Yoke check sheets found in database');
      }
      
      const checkSheetId = pokaYokeIds[0];
      console.log('✅ Using Poka-Yoke check sheet ID:', checkSheetId);
      
      const response = await axios.get(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/templates/${checkSheetId}`, {
        withCredentials: true
      });
      const checkSheet = response.data;
      setCurrentCheckSheet(checkSheet);
      console.log('✅ Loaded check sheet:', checkSheet.name);
      
    } catch (error) {
      console.error('Error fetching Poka-Yoke check sheet:', error);
      addToast('Failed to load check sheet from database', 'error');
    } finally {
      setLoadingCheckSheet(false);
    }
  };

  useEffect(() => {
    fetchCheckSheet();
  }, []);

  useEffect(() => {
    if (editId) {
      loadAuditData();
    } else {
      const docNumber = generateDocumentNumber('pokayoke');
      setFormData(prev => ({ ...prev, documentNumber: docNumber }));
    }
  }, [editId]);

  useEffect(() => {
    if (user?.id && !editId) {
      setFormData(prev => ({
        ...prev,
        checkedBy: user.name || '',
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
          date: answers.date || new Date().toISOString().split('T')[0],
          time: answers.time || new Date().toLocaleTimeString(),
          checkedBy: audit.auditorName || user?.name || '',
          checkedById: audit.auditorId || user?.id,
          approvedBy: answers.approvedBy || '',
          approvedById: answers.approvedById || null,
          status: audit.status || 'IN_PROGRESS',
          auditorSignature: answers.auditorSignature || '',
          createdAt: audit.createdAt || new Date().toISOString()
        });
        
        if (answers.verifications && answers.verifications.length > 0) {
          setVerifications(answers.verifications);
          const maxId = Math.max(...answers.verifications.map(v => v.id), 0);
          setNextId(maxId + 1);
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

  const handleVerificationChange = (index, field, value) => {
    const updatedVerifications = [...verifications];
    updatedVerifications[index] = { ...updatedVerifications[index], [field]: value };
    setVerifications(updatedVerifications);
  };

  const addVerification = () => {
    setVerifications([
      ...verifications,
      { id: nextId, machineName: '', machineNumber: '', pokaYokeName: '', pokaYokeNo: '', location: '', status: 'NOT_OK', remark: '' }
    ]);
    setNextId(nextId + 1);
  };

  const removeVerification = (index) => {
    if (verifications.length === 1) {
      addToast('At least one verification entry is required', 'warning');
      return;
    }
    const updatedVerifications = verifications.filter((_, i) => i !== index);
    setVerifications(updatedVerifications);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'OK': return 'border-green-500 bg-green-50';
      case 'NOT_OK': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getStatusStats = () => {
    const total = verifications.length;
    const ok = verifications.filter(v => v.status === 'OK').length;
    const notOk = verifications.filter(v => v.status === 'NOT_OK').length;
    return { total, ok, notOk };
  };

  const stats = getStatusStats();

  const saveDraft = async () => {
    setSaving(true);
    try {
      if (!currentCheckSheet || !currentCheckSheet.id) {
        throw new Error('Check sheet not loaded. Please refresh and try again.');
      }
      
      const answersObject = {
        documentNumber: formData.documentNumber,
        date: formData.date,
        time: formData.time,
        approvedBy: formData.approvedBy,
        approvedById: formData.approvedById,
        auditorSignature: formData.auditorSignature,
        verifications: verifications,
        formName: currentCheckSheet?.name || 'Poka-Yoke Verification'
      };
      
      const totalDevices = verifications.length;
      const okDevices = verifications.filter(v => v.status === 'OK').length;
      const totalScore = okDevices;
      const maxPossibleScore = totalDevices;
      const percentageScore = maxPossibleScore > 0 ? (totalScore * 100.0 / maxPossibleScore) : 0;
      
      const payload = {
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: null,
        department: null,
        shift: null,
        auditDate: formData.date,
        auditorName: formData.checkedBy,
        auditorId: formData.checkedById ? parseInt(formData.checkedById) : null,
        auditeeName: null,
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
        navigate(`/audit/pokayoke?edit=${saved.id}`, { replace: true });
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

    const emptyEntries = verifications.filter(v => !v.machineName.trim() || !v.pokaYokeName.trim());
    if (emptyEntries.length > 0) {
      addToast('Please fill Machine Name and Poka-Yoke Name for all entries', 'error');
      return;
    }

    setSaving(true);
    try {
      if (!currentCheckSheet || !currentCheckSheet.id) {
        throw new Error('Check sheet not loaded. Please refresh and try again.');
      }
      
      const answersObject = {
        documentNumber: formData.documentNumber,
        date: formData.date,
        time: formData.time,
        approvedBy: formData.approvedBy,
        approvedById: formData.approvedById,
        auditorSignature: formData.auditorSignature,
        verifications: verifications,
        formName: currentCheckSheet?.name || 'Poka-Yoke Verification'
      };
      
      const totalDevices = verifications.length;
      const okDevices = verifications.filter(v => v.status === 'OK').length;
      const totalScore = okDevices;
      const maxPossibleScore = totalDevices;
      const percentageScore = maxPossibleScore > 0 ? (totalScore * 100.0 / maxPossibleScore) : 0;
      
      const payload = {
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: null,
        department: null,
        shift: null,
        auditDate: formData.date,
        auditorName: formData.checkedBy,
        auditorId: formData.checkedById ? parseInt(formData.checkedById) : null,
        auditeeName: null,
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
      
      addToast(`Poka-Yoke Verification submitted! ${stats.ok}/${stats.total} devices OK`, 'success');
      navigate('/auditor/pokayoke');
    } catch (error) {
      console.error('Error submitting audit:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      addToast(`Failed to submit audit: ${errorMessage}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = () => {
    const sampleMachineNames = [
      "Press Machine #1", "Press Machine #2", "Injection Molding #3", "Assembly Line #1", "CNC Machine #4",
      "Packaging Line #1", "Testing Station #2", "Robot Cell #1", "Conveyor System #1", "Welding Robot #1"
    ];
    const samplePokaYokeNames = [
      "Door Sensor", "Double Hand Operation", "Light Curtain", "Pressure Sensor", "Proximity Sensor",
      "Vision System", "Laser Scanner", "Limit Switch", "Temperature Sensor", "Barcode Scanner"
    ];
    const statuses = ['OK', 'OK', 'OK', 'NOT_OK', 'OK', 'OK', 'NOT_OK', 'OK'];
    
    const updatedVerifications = verifications.map((v, idx) => ({
      ...v,
      machineName: sampleMachineNames[idx % sampleMachineNames.length],
      machineNumber: `M-${String(idx + 1).padStart(3, '0')}`,
      pokaYokeName: samplePokaYokeNames[idx % samplePokaYokeNames.length],
      pokaYokeNo: `PY-${String(idx + 1).padStart(3, '0')}`,
      location: `Zone ${String.fromCharCode(65 + (idx % 5))}`,
      status: statuses[idx % statuses.length],
      remark: statuses[idx % statuses.length] === 'OK' ? 'Working properly' : 'Needs calibration - reported to maintenance'
    }));
    
    setVerifications(updatedVerifications);
    addToast('Demo data filled successfully', 'success');
  };

  const getProgressStats = () => {
    const total = verifications.length;
    const completed = verifications.filter(v => v.machineName && v.pokaYokeName).length;
    const ok = verifications.filter(v => v.status === 'OK').length;
    const notOk = verifications.filter(v => v.status === 'NOT_OK').length;
    return { total, completed, ok, notOk };
  };

  const progressStats = getProgressStats();
  const allVerified = progressStats.completed === progressStats.total;

  const nextVerification = () => {
    if (currentVerificationIndex < verifications.length - 1) {
      setCurrentVerificationIndex(currentVerificationIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevVerification = () => {
    if (currentVerificationIndex > 0) {
      setCurrentVerificationIndex(currentVerificationIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToVerification = (index) => {
    setCurrentVerificationIndex(index);
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
          if (currentVerificationIndex > 0) {
            prevVerification();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentVerificationIndex < verifications.length - 1) {
            nextVerification();
          }
          break;
        default:
          break;
      }
    }
  }, [currentStep, currentVerificationIndex, verifications.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const steps = [
    { number: 1, title: 'General Information', icon: User },
    { number: 2, title: 'Poka-Yoke Verification', icon: Wrench },
    { number: 3, title: 'Signature & Submit', icon: PenTool }
  ];

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setCurrentVerificationIndex(0);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setCurrentVerificationIndex(0);
      window.scrollTo(0, 0);
    }
  };

  if (loadingCheckSheet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading Poka-Yoke Verification form...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  const currentV = verifications[currentVerificationIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl px-4 py-6 mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/auditor/pokayoke')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <button
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-4 py-2 text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200"
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
                disabled={!allVerified || saving}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition ${
                  allVerified && !saving
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={16} />
                Submit Verification
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
                      isActive ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md' :
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle size={20} />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>
                    <div className="ml-3 text-left">
                      <p className={`text-xs font-medium ${isActive ? 'text-orange-600' : 'text-gray-500'}`}>Step {step.number}</p>
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
                <Settings size={20} className="text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-800">General Information</h2>
              </div>
              <p className="text-sm text-gray-500">Poka-Yoke Verification Details</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Document No.</label>
                  <input type="text" value={formData.documentNumber} readOnly className="w-full px-3 py-2 bg-gray-100 border rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Checked By</label>
                  <input type="text" value={formData.checkedBy} readOnly className="w-full px-3 py-2 bg-gray-100 border rounded-lg" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Checked By Signature</label>
                  <input
                    type="text"
                    value={formData.auditorSignature}
                    onChange={(e) => handleInputChange('auditorSignature', e.target.value)}
                    placeholder="Type your full name as signature"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Your typed name will be used as electronic signature</p>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Approved By</label>
                  <input type="text" value={formData.approvedBy} onChange={(e) => handleInputChange('approvedBy', e.target.value)} placeholder="Enter approver name" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end p-6 pt-0">
              <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700">
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Poka-Yoke Verification */}
        {currentStep === 2 && (
          <div>
            {/* Progress Navigation */}
            <div className="p-4 mb-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Device {currentVerificationIndex + 1} of {verifications.length}</span>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} /> OK: {progressStats.ok}</span>
                  <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> Not OK: {progressStats.notOk}</span>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {verifications.map((v, idx) => {
                  const isCompleted = v.machineName && v.pokaYokeName;
                  const isOk = v.status === 'OK';
                  
                  let buttonColorClass = '';
                  if (currentVerificationIndex === idx) {
                    buttonColorClass = 'bg-orange-600 text-white shadow-md ring-2 ring-orange-300';
                  } else if (isCompleted) {
                    buttonColorClass = isOk ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
                  } else {
                    buttonColorClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
                  }
                  
                  return (
                    <button
                      key={v.id}
                      ref={currentVerificationIndex === idx ? activeButtonRef : null}
                      onClick={() => navigateToVerification(idx)}
                      className={`min-w-[36px] w-9 h-9 text-sm font-medium rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${buttonColorClass}`}
                      title={`Device ${idx + 1}${isCompleted ? ` - ${v.status}` : ' - Pending'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-center mt-2">
                <button
                  onClick={addVerification}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <Plus size={12} /> Add Device
                </button>
              </div>
            </div>

            {/* Verification Card */}
            {currentV && (
              <div className={`bg-white rounded-lg shadow-md border-l-4 ${getStatusColor(currentV.status)}`}>
                <div className="p-6">
                  {/* Header with Remove Button */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 text-white bg-orange-600 rounded-full">
                        {currentVerificationIndex + 1}
                      </span>
                      {currentV.status && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          currentV.status === 'OK'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {currentV.status === 'OK' ? '✓ OK' : '✗ Not OK'}
                        </span>
                      )}
                    </div>
                    {verifications.length > 1 && (
                      <button
                        onClick={() => {
                          removeVerification(currentVerificationIndex);
                          if (currentVerificationIndex >= verifications.length - 1) {
                            setCurrentVerificationIndex(Math.max(0, verifications.length - 2));
                          }
                        }}
                        className="p-1 text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {/* Machine Name & Number */}
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Machine Name & Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentV.machineName}
                      onChange={(e) => handleVerificationChange(currentVerificationIndex, 'machineName', e.target.value)}
                      placeholder="Enter machine name & number"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Poka-Yoke Name */}
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Poka-Yoke Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentV.pokaYokeName}
                      onChange={(e) => handleVerificationChange(currentVerificationIndex, 'pokaYokeName', e.target.value)}
                      placeholder="Enter Poka-Yoke device name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Poka-Yoke Number */}
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Poka-Yoke No.
                    </label>
                    <input
                      type="text"
                      value={currentV.pokaYokeNo}
                      onChange={(e) => handleVerificationChange(currentVerificationIndex, 'pokaYokeNo', e.target.value)}
                      placeholder="Enter device number"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Location */}
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      value={currentV.location}
                      onChange={(e) => handleVerificationChange(currentVerificationIndex, 'location', e.target.value)}
                      placeholder="Enter device location"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Verification Status <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleVerificationChange(currentVerificationIndex, 'status', 'OK')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          currentV.status === 'OK'
                            ? 'bg-green-100 border-green-500 shadow-md'
                            : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle size={20} className="text-green-600" />
                          <span className="text-xs font-medium text-green-700">✓ OK</span>
                          <span className="text-[10px] text-gray-500">Working properly</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleVerificationChange(currentVerificationIndex, 'status', 'NOT_OK')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          currentV.status === 'NOT_OK'
                            ? 'bg-red-100 border-red-500 shadow-md'
                            : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <AlertCircle size={20} className="text-red-600" />
                          <span className="text-xs font-medium text-red-700">✗ Not OK</span>
                          <span className="text-[10px] text-gray-500">Needs attention</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Remark
                    </label>
                    <textarea
                      value={currentV.remark}
                      onChange={(e) => handleVerificationChange(currentVerificationIndex, 'remark', e.target.value)}
                      rows="2"
                      placeholder="Enter any remarks or observations..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Arrow Navigation Buttons */}
                  <div className="flex justify-between pt-4 mt-4 border-t">
                    <button
                      onClick={prevVerification}
                      disabled={currentVerificationIndex === 0}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <div className="text-sm text-gray-500">
                      {currentV.machineName && currentV.pokaYokeName && currentV.status ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={14} /> Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle size={14} /> Pending
                        </span>
                      )}
                    </div>
                    <button
                      onClick={nextVerification}
                      disabled={currentVerificationIndex === verifications.length - 1}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-orange-600 rounded-lg disabled:opacity-50 hover:bg-orange-700"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Summary */}
            <div className="p-4 mt-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{verifications.length}</div>
                    <div className="text-xs text-gray-500">Total Devices</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{progressStats.ok}</div>
                    <div className="text-xs text-gray-500">OK</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{progressStats.notOk}</div>
                    <div className="text-xs text-gray-500">Not OK</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-600">{verifications.length - progressStats.completed}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{progressStats.completed}</span> / <span className="text-gray-500">{verifications.length}</span> completed
                </div>
              </div>
              {!allVerified && (
                <div className="p-2 mt-3 text-xs text-center rounded-lg text-amber-600 bg-amber-50">
                  ⚠️ Please fill all required fields for all devices
                </div>
              )}
            </div>

            {/* Next Step Button */}
            {allVerified && (
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
              <p className="text-sm text-gray-500">Review and submit the verification report</p>
            </div>
            <div className="p-6">
              {/* Verification Summary */}
              <div className="p-4 mb-6 rounded-lg bg-gradient-to-r from-orange-50 to-red-50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Verification Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Total Devices</p>
                    <p className="text-xl font-bold text-gray-800">{verifications.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">OK</p>
                    <p className="text-xl font-bold text-green-600">{progressStats.ok}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Not OK</p>
                    <p className="text-xl font-bold text-red-600">{progressStats.notOk}</p>
                  </div>
                </div>
                {progressStats.notOk > 0 && (
                  <div className="p-2 mt-3 text-sm text-center text-red-700 bg-red-100 rounded-lg">
                    ⚠️ {progressStats.notOk} device(s) require attention
                  </div>
                )}
                {progressStats.ok === verifications.length && verifications.length > 0 && (
                  <div className="p-2 mt-3 text-sm text-center text-green-700 bg-green-100 rounded-lg">
                    ✓ All Poka-Yoke devices are working properly!
                  </div>
                )}
              </div>

              {/* Signature Section - Already filled in Step 1 */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">Checked By Signature</label>
                <input
                  type="text"
                  value={formData.auditorSignature}
                  onChange={(e) => handleInputChange('auditorSignature', e.target.value)}
                  placeholder="Type your full name as signature"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                <p className="mt-1 text-xs text-gray-500">Your typed name will be used as electronic signature</p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => {
                    isManualSubmitRef.current = true;
                    submitAudit();
                  }}
                  disabled={!formData.auditorSignature.trim() || saving}
                  className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition ${
                    formData.auditorSignature.trim() && !saving
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                  {saving ? 'Submitting...' : 'Submit Verification Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}